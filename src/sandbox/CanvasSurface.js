// ─────────────────────────────────────────────────────────────
// CanvasSurface — the canvas plus its chrome, shared by the
// sandbox and by question screens so both look and behave alike.
//
// Owns: the graph, undo history, view transform, tool state, the
// overlay buttons (Deselect / Hide name, zoom + / − / fit) and the
// bottom dock. It does NOT own naming or checking — the parent
// decides what to do with the graph, which is what lets the same
// surface serve "name it live" and "check my answer".
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C as T_, R } from '../theme';
import { BOND_TYPES, TEMPLATES, clampCanvasSize, fitView } from './constants';
import { chainAlong, makeRing, nextPosition, tidy } from './layout';
import { SandboxCanvas } from './SandboxCanvas';
import { CanvasDock } from './CanvasDock';
import { tap, bump } from './haptics';

// Height the floating dock and its open tray take from the visible canvas.
const DOCK_RESERVE = 150;

export const CanvasSurface = forwardRef(function CanvasSurface(
  {
    graph,
    setGraph: setGraphExternal,
    width,
    dockTabs,
    moreItems = [],
    showNameControls = true,
    nameHidden,
    onToggleName,
    highlight,
    onPickAtom,
    locants,
    banner, // {kind:'error'|'ok', title, message, onDismiss} | null
    emptyHint,
  },
  ref
) {
  const [selected, setSelected] = useState(null);
  const [selBond, setSelBond] = useState(null);
  const [mode, setMode] = useState('draw');
  const [element, setElement] = useState('C');
  const [bondType, setBondType] = useState('single');
  const [ringTool, setRingTool] = useState(null);
  const [chainTool, setChainTool] = useState(false);
  const [showCarbons, setShowCarbons] = useState(false);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [view, setViewRaw] = useState({ k: 1, tx: 0, ty: 0 });
  // The canvas fills whatever space it is given, so its size is measured
  // rather than passed in. The dock floats over the bottom of it.
  const [size, setSize] = useState(null);
  const insets = useSafeAreaInsets();

  // A view or a coordinate that is not a finite number produces an SVG
  // transform the parser rejects, which unmounts the canvas. Both are
  // filtered here so a bad value can never reach the renderer.
  const setView = useCallback((next) => {
    setViewRaw((prev) => {
      const v = typeof next === 'function' ? next(prev) : next;
      const ok = v && ['k', 'tx', 'ty'].every((key) => typeof v[key] === 'number' && isFinite(v[key]));
      return ok && v.k > 0 ? v : prev;
    });
  }, []);

  const sane = (g) => {
    if (!g || !g.atoms) return { atoms: [], bonds: [] };
    const bad = g.atoms.some((a) => !isFinite(a.x) || !isFinite(a.y));
    if (!bad) return g;
    return {
      ...g,
      atoms: g.atoms.map((a) => ({
        ...a,
        x: isFinite(a.x) ? a.x : 0,
        y: isFinite(a.y) ? a.y : 0,
      })),
    };
  };

  const dragging = useRef(false);
  const setGraph = useCallback(
    (g, opts) => {
      const record = !(opts && opts.record === false);
      if (record) setHistory((h) => [...h.slice(-40), graph]);
      setFuture([]); // a new edit invalidates anything that was undone
      setGraphExternal(sane(g));
    },
    [graph, setGraphExternal]
  );
  const setGraphLive = useCallback(
    (g) => {
      if (!dragging.current) {
        dragging.current = true;
        setHistory((h) => [...h.slice(-40), graph]);
      }
      setGraphExternal(sane(g));
    },
    [graph, setGraphExternal]
  );
  const endDrag = useCallback(() => {
    dragging.current = false;
  }, []);

  // Measured size of the drawing surface. Everything that positions the view
  // — fit, zoom, centring — must use these, not the width prop, or the
  // molecule is framed against the wrong box.
  const canvasW = size ? size.w : width || 320;
  const canvasH = size ? size.h : 320;

  const fitTo = (g) => {
    if (!g.atoms.length) {
      setView({ k: 1, tx: 0, ty: 0 });
      return;
    }
    const xs = g.atoms.map((a) => a.x);
    const ys = g.atoms.map((a) => a.y);
    setView(
      fitView(
        { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
        canvasW,
        canvasH,
        { bottomInset: DOCK_RESERVE }
      )
    );
  };

  const zoomBy = (f) => {
    tap();
    setView((v) => {
      const k = Math.max(0.35, Math.min(3, v.k * f));
      const cx = canvasW / 2;
      const cy = 56 + Math.max(120, canvasH - 56 - DOCK_RESERVE) / 2;
      return { k, tx: cx - (cx - v.tx) * (k / v.k), ty: cy - (cy - v.ty) * (k / v.k) };
    });
  };

  const deselect = () => {
    setSelected(null);
    setSelBond(null);
    setRingTool(null);
    setChainTool(false);
  };

  const undo = () => {
    if (!history.length) return;
    tap();
    setFuture((f) => [graph, ...f].slice(0, 40));
    setGraphExternal(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
  };

  const redo = () => {
    if (!future.length) return;
    tap();
    setHistory((h) => [...h.slice(-40), graph]);
    setGraphExternal(future[0]);
    setFuture((f) => f.slice(1));
    setSelected(null);
  };

  const clean = () => {
    if (graph.atoms.length < 2) return;
    bump();
    // Prefer the engine's layout: `tidy` snaps to a square lattice and draws a
    // chain with 90° corners. prettify falls back to tidy for anything the
    // engine cannot name, so a half-finished drawing still gets tidied.
    let t;
    try {
      t = prettify(graph);
      if (t === graph) t = tidy(graph);
    } catch (e) {
      t = tidy(graph);
    }
    setGraph(t);
    // Tidying can make a structure wider than the view, so frame it as well:
    // a clean molecule half off the screen is not much use.
    fitTo(t);
  };


  const dropChain = (chain, gs) => {
    const k = view.k || 1;
    const r = chainAlong(graph, chain.from, gs.dx / k, gs.dy / k, chain.startId);
    if (!r.count) return;
    bump();
    setGraph({ atoms: r.atoms, bonds: r.bonds });
    setSelected(r.lastId);
  };

  const dropRing = (tpl, opts) => {
    const o = opts || {};
    bump();
    const r = makeRing(graph, tpl, o.atomId ?? null, o.bond ?? null, !!o.spiro, o.at);
    setGraph({ atoms: r.atoms, bonds: r.bonds });
    // Deselect after placing a ring. Leaving the tapped atom selected made
    // the next tap bond back to it, quietly closing a ring the user never
    // meant to draw — the most common way to end up with the wrong molecule.
    setSelected(null);
    setSelBond(null);
  };

  useImperativeHandle(ref, () => ({
    reset: () => {
      setGraphExternal({ atoms: [], bonds: [] });
      setHistory([]);
      setSelected(null);
      setSelBond(null);
      setView({ k: 1, tx: 0, ty: 0 });
    },
    fit: () => fitTo(graph),
    clean: () => clean(),
    resetView: () => setView({ k: 1, tx: 0, ty: 0 }),
    deselect,
  }));

  return (
    <View style={{ flex: 1 }}>
      {banner ? (
        <View style={[cs.banner, banner.kind === 'ok' ? cs.bannerOk : cs.bannerErr]}>
          <Ionicons
            name={banner.kind === 'ok' ? 'checkmark-circle' : 'warning'}
            size={18}
            color={banner.kind === 'ok' ? T_.greenText : T_.danger}
          />
          <View style={{ flex: 1 }}>
            <Text style={[cs.bannerTitle, banner.kind === 'ok' && { color: T_.greenText }]}>
              {banner.title}
            </Text>
            {banner.message ? <Text style={cs.bannerMsg}>{banner.message}</Text> : null}
          </View>
          {banner.onDismiss ? (
            <Pressable onPress={banner.onDismiss} hitSlop={8}>
              <Ionicons name="close" size={17} color={T_.sub} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View
        style={cs.canvasWrap}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setSize((prev) => clampCanvasSize({ w, h }, prev));
        }}
      >
        {size ? (
        <SandboxCanvas
          graph={graph}
          setGraph={setGraph}
          setGraphLive={setGraphLive}
          endDrag={endDrag}
          selected={selected}
          setSelected={setSelected}
          selBond={selBond}
          setSelBond={setSelBond}
          ringTool={ringTool}
          onPlaceRing={dropRing}
          chainTool={chainTool}
          onDrawChain={dropChain}
          mode={mode}
          element={element}
          bondType={bondType}
          showCarbons={showCarbons}
          width={canvasW}
          height={canvasH}
          view={view}
          setView={setView}
          highlight={highlight}
          onPickAtom={onPickAtom}
          locants={locants}
        />
        ) : null}

        <View style={cs.overlayL} pointerEvents="box-none">
          <Pressable
            onPress={() => {
              tap();
              deselect();
            }}
            style={[
              cs.pill,
              (selected != null || selBond || ringTool || chainTool) && cs.pillOn,
            ]}
          >
            <Text
              style={[
                cs.pillTxt,
                (selected != null || selBond || ringTool || chainTool) && { color: '#fff' },
              ]}
            >
              Deselect
            </Text>
          </Pressable>
          {showNameControls ? (
            <Pressable onPress={onToggleName} style={cs.pill}>
              <Text style={cs.pillTxt}>{nameHidden ? 'Show name' : 'Hide name'}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={cs.overlayR} pointerEvents="box-none">
          <Pressable onPress={() => zoomBy(1.25)} style={cs.sq}>
            <Ionicons name="add" size={20} color={T_.teal} />
          </Pressable>
          <Pressable onPress={() => zoomBy(1 / 1.25)} style={cs.sq}>
            <Ionicons name="remove" size={20} color={T_.teal} />
          </Pressable>
          <Pressable
            onPress={undo}
            disabled={!history.length}
            style={[cs.sq, !history.length && { opacity: 0.35 }]}
            accessibilityLabel="undo"
          >
            <Ionicons name="arrow-undo-outline" size={18} color={T_.teal} />
          </Pressable>
          <Pressable
            onPress={redo}
            disabled={!future.length}
            style={[cs.sq, !future.length && { opacity: 0.35 }]}
            accessibilityLabel="redo"
          >
            <Ionicons name="arrow-redo-outline" size={18} color={T_.teal} />
          </Pressable>
          <Pressable
            onPress={clean}
            disabled={graph.atoms.length < 2}
            style={[cs.sq, graph.atoms.length < 2 && { opacity: 0.4 }]}
            accessibilityLabel="clean up the structure"
          >
            <MaterialCommunityIcons name="broom" size={18} color={T_.teal} />
          </Pressable>
        </View>

        {!graph.atoms.length && emptyHint ? (
          <View pointerEvents="none" style={cs.empty}>
            <Text style={cs.emptyT}>{emptyHint.title}</Text>
            <Text style={cs.emptyB}>{emptyHint.body}</Text>
          </View>
        ) : null}

        {/* the dock floats over the bottom of the canvas */}
        {/* The dock sits above the device's own navigation bar rather than
            behind it — on Android the gesture bar was covering the tool tray. */}
        <View
          style={[cs.dockFloat, { paddingBottom: Math.max(insets.bottom, 6) }]}
          pointerEvents="box-none"
        >
          <CanvasDock
            tabs={dockTabs}
            bondType={bondType}
            setBondType={setBondType}
            element={element}
            setElement={setElement}
            showCarbons={showCarbons}
            setShowCarbons={setShowCarbons}
            ringTool={ringTool}
            setRingTool={setRingTool}
            chainTool={chainTool}
            setChainTool={setChainTool}
                eraseOn={mode === 'erase'}
            onToggleErase={() => setMode((m) => (m === 'erase' ? 'draw' : 'erase'))}
            onClean={clean}
            canClean={graph.atoms.length > 1}
            onUndo={undo}
            canUndo={history.length > 0}
            onClear={() => {
              setGraph({ atoms: [], bonds: [] });
              setSelected(null);
            }}
            moreItems={[
              ...moreItems,
              {
                id: 'resetview',
                label: 'Reset view',
                icon: 'scan-outline',
                onPress: () => setView({ k: 1, tx: 0, ty: 0 }),
              },
              { id: 'deselect', label: 'Deselect', icon: 'close-circle-outline', onPress: deselect },
              ...(showNameControls
                ? [
                    {
                      id: 'hidename',
                      label: nameHidden ? 'Show name' : 'Hide name',
                      icon: 'eye-off-outline',
                      onPress: onToggleName,
                    },
                  ]
                : []),
            ]}
            onDeselect={() => setSelected(null)}
          />
        </View>
      </View>
    </View>
  );
});

const cs = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: R.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  bannerErr: { backgroundColor: '#FDECEC', borderColor: '#F5C8C8' },
  bannerOk: { backgroundColor: T_.greenSoft, borderColor: '#CDE9B9' },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: T_.danger },
  bannerMsg: { fontSize: 13, color: T_.navy, marginTop: 2, lineHeight: 18 },
  // Borderless: the drawing surface runs past the screen edges so it reads as
  // an open canvas rather than a box to draw inside. The negative margins undo
  // the Screen's horizontal padding.
  canvasWrap: {
    flex: 1,
    marginHorizontal: -20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dockFloat: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayL: { position: 'absolute', top: 10, left: 26, gap: 8, alignItems: 'flex-start' },
  overlayR: { position: 'absolute', top: 10, right: 26, gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T_.border,
    backgroundColor: T_.card,
  },
  pillOn: { backgroundColor: T_.teal, borderColor: T_.teal },
  pillTxt: { fontSize: 12, fontWeight: '700', color: T_.teal },
  sq: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T_.border,
    backgroundColor: T_.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 30 },
  emptyT: { fontSize: 15, fontWeight: '800', color: T_.navy },
  emptyB: { fontSize: 12.5, color: T_.sub, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
