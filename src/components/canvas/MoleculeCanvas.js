// ─────────────────────────────────────────────────────────────
// Interactive molecule canvas.
//
// Gestures (single PanResponder + manual hit-testing — the most
// reliable touch approach in Expo Go):
//   • tap        → tool action on atom / bond / empty space
//   • drag atom  → Bond tool: pull out a new snapped bond
//                  Select tool: move the atom
//   • drag empty → pan
//   • two finger → pinch zoom + pan
//
// Tools: select | bond | atom | ring | stereo | erase
// plus secondary: charge | addH (from "More tools").
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, PanResponder, StyleSheet } from 'react-native';
import Svg, { G, Circle, Line, Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, R, shadow } from '../../theme';
import { MoleculeShapes } from './MoleculeSvg';
import {
  atomById,
  bondById,
  addAtom,
  addBond,
  removeAtom,
  removeBond,
  updateAtom,
  updateBond,
  bondBetween,
  bondsOf,
  snappedExtension,
  snapAngle,
  stampRing,
  moleculeBBox,
  BOND_LENGTH,
  ELEMENTS_MAIN,
  ELEMENTS_HALO,
} from '../../chem/model';

const TAP_SLOP = 7;
const ATOM_HIT = 22; // screen px
const BOND_HIT = 14;

export function MoleculeCanvas({
  mol,
  onCommit,
  tool,
  bondOrder,
  stereoType,
  ringSpec,
  highlightAtoms,
  highlightBonds,
}) {
  const [size, setSize] = useState(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [preview, setPreview] = useState(null); // {from, to, mergeId}
  const [moveOverride, setMoveOverride] = useState(null); // {atomId, x, y}
  const [popover, setPopover] = useState(null); // {atomId, halogens}
  const [selection, setSelection] = useState(null); // {atomId} | {bondId}

  const wrapRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ mode: null });
  const sizeRef = useRef(null);
  const live = useRef({});
  live.current = {
    mol,
    view,
    tool,
    bondOrder,
    stereoType,
    ringSpec,
    size,
    onCommit,
    preview,
    moveOverride,
  };

  // ── Coordinate transforms ─────────────────────────────────
  const toModel = (sx, sy, v) => ({ x: (sx - v.tx) / v.scale, y: (sy - v.ty) / v.scale });
  const toScreen = (mx, my, v) => ({ x: mx * v.scale + v.tx, y: my * v.scale + v.ty });

  const measure = useCallback(() => {
    if (wrapRef.current && wrapRef.current.measureInWindow) {
      wrapRef.current.measureInWindow((x, y) => {
        offsetRef.current = { x, y };
      });
    }
  }, []);

  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (!sizeRef.current) {
      setView({ scale: 1, tx: width / 2, ty: height * 0.42 });
    }
    sizeRef.current = { w: width, h: height };
    setSize({ w: width, h: height });
    setTimeout(measure, 0);
  };

  useEffect(() => {
    const t = setTimeout(measure, 300);
    return () => clearTimeout(t);
  }, [measure]);

  // ── Hit testing (screen space) ────────────────────────────
  const hitTest = (sx, sy) => {
    const { mol: m, view: v } = live.current;
    let bestAtom = null;
    let bestD = ATOM_HIT;
    for (const a of m.atoms) {
      const p = toScreen(a.x, a.y, v);
      const d = Math.hypot(p.x - sx, p.y - sy);
      if (d < bestD) {
        bestD = d;
        bestAtom = a;
      }
    }
    if (bestAtom) return { type: 'atom', id: bestAtom.id };

    let bestBond = null;
    let bestBD = BOND_HIT;
    for (const b of m.bonds) {
      const a1 = atomById(m, b.a);
      const a2 = atomById(m, b.b);
      const p1 = toScreen(a1.x, a1.y, v);
      const p2 = toScreen(a2.x, a2.y, v);
      const d = pointSegDist(sx, sy, p1, p2);
      if (d < bestBD) {
        bestBD = d;
        bestBond = b;
      }
    }
    if (bestBond) return { type: 'bond', id: bestBond.id };
    return { type: 'empty' };
  };

  // ── Tap actions ───────────────────────────────────────────
  const commit = (next) => live.current.onCommit(next);

  const sproutFromAtom = (atom) => {
    const m = live.current.mol;
    const nbs = bondsOf(m, atom.id)
      .map((b) => atomById(m, b.a === atom.id ? b.b : b.a))
      .filter(Boolean);
    const taken = nbs.map((n) => Math.atan2(n.y - atom.y, n.x - atom.x));
    let best = null;
    for (let k = 0; k < 12; k++) {
      const ang = -Math.PI / 6 + (k * Math.PI) / 6;
      const minDiff = taken.length
        ? Math.min(...taken.map((t) => angDiff(ang, t)))
        : Math.PI;
      const pref = Math.min(angDiff(ang, -Math.PI / 6), angDiff(ang, Math.PI / 6));
      const score = minDiff * 10 - pref;
      if (!best || score > best.score) best = { ang, score };
    }
    const x = atom.x + BOND_LENGTH * Math.cos(best.ang);
    const y = atom.y + BOND_LENGTH * Math.sin(best.ang);
    let res = addAtom(m, { el: 'C', x, y });
    res = addBond(res.mol, atom.id, res.atom.id, live.current.bondOrder);
    commit(res.mol);
  };

  const handleTap = (hit, pt) => {
    const { mol: m, tool: t, bondOrder: ord, stereoType: st, ringSpec: rs } = live.current;
    setSelection(null);

    if (hit.type === 'atom') {
      const atom = atomById(m, hit.id);
      if (!atom) return;
      if (t === 'select' || t === 'atom') {
        setSelection({ atomId: atom.id });
        setPopover({ atomId: atom.id, halogens: false });
      } else if (t === 'bond') {
        sproutFromAtom(atom);
      } else if (t === 'ring') {
        commit(stampRing(m, rs.size, { x: atom.x, y: atom.y }, atom, rs.benzene));
      } else if (t === 'erase') {
        commit(removeAtom(m, atom.id));
      } else if (t === 'charge') {
        const next = atom.charge === 0 ? 1 : atom.charge === 1 ? -1 : 0;
        commit(updateAtom(m, atom.id, { charge: next }));
      } else if (t === 'addH') {
        commit(updateAtom(m, atom.id, { showH: !atom.showH }));
      }
      return;
    }

    if (hit.type === 'bond') {
      const bond = bondById(m, hit.id);
      if (!bond) return;
      if (t === 'bond') {
        commit(updateBond(m, bond.id, { order: ord, stereo: ord > 1 ? null : bond.stereo }));
      } else if (t === 'stereo') {
        if (bond.order > 1) return;
        if (bond.stereo === st) {
          if (st === 'wavy') commit(updateBond(m, bond.id, { stereo: null }));
          else commit(updateBond(m, bond.id, { a: bond.b, b: bond.a })); // flip direction
        } else {
          commit(updateBond(m, bond.id, { stereo: st }));
        }
      } else if (t === 'erase') {
        commit(removeBond(m, bond.id));
      } else if (t === 'select') {
        setSelection({ bondId: bond.id });
      }
      return;
    }

    // Empty space
    if (t === 'bond' || t === 'atom') {
      const res = addAtom(m, { el: 'C', x: pt.x, y: pt.y });
      commit(res.mol);
    } else if (t === 'ring') {
      commit(stampRing(m, rs.size, pt, null, rs.benzene));
    }
  };

  // ── Gestures ──────────────────────────────────────────────
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt) => {
          setPopover(null);
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            startPinch(touches);
            return;
          }
          const sx = touches[0].pageX - offsetRef.current.x;
          const sy = touches[0].pageY - offsetRef.current.y;
          dragRef.current = { mode: 'pending', sx, sy, hit: hitTest(sx, sy) };
        },

        onPanResponderMove: (evt) => {
          const touches = evt.nativeEvent.touches;
          const d = dragRef.current;
          if (touches.length >= 2) {
            if (d.mode !== 'pinch') startPinch(touches);
            else movePinch(touches);
            return;
          }
          if (d.mode === 'pinch' || !touches.length) return;

          const sx = touches[0].pageX - offsetRef.current.x;
          const sy = touches[0].pageY - offsetRef.current.y;
          const dist = Math.hypot(sx - d.sx, sy - d.sy);

          if (d.mode === 'pending' && dist > TAP_SLOP) {
            const t = live.current.tool;
            if (d.hit.type === 'atom' && t === 'bond') {
              d.mode = 'bondDrag';
              d.fromId = d.hit.id;
            } else if (d.hit.type === 'atom' && t === 'select') {
              d.mode = 'atomMove';
              d.atomId = d.hit.id;
            } else {
              d.mode = 'pan';
              d.v0 = { ...live.current.view };
            }
          }

          if (d.mode === 'bondDrag') {
            const { mol: m, view: v } = live.current;
            const from = atomById(m, d.fromId);
            if (!from) return;
            const mp = toModel(sx, sy, v);
            let to = snappedExtension(from, mp.x, mp.y);
            let mergeId = null;
            for (const a of m.atoms) {
              if (a.id === d.fromId) continue;
              const p = toScreen(a.x, a.y, v);
              if (Math.hypot(p.x - sx, p.y - sy) < 26) {
                to = { x: a.x, y: a.y };
                mergeId = a.id;
                break;
              }
            }
            setPreview({ from: { x: from.x, y: from.y }, to, mergeId, fromId: d.fromId });
          } else if (d.mode === 'atomMove') {
            const { view: v } = live.current;
            const mp = toModel(sx, sy, v);
            setMoveOverride({ atomId: d.atomId, x: mp.x, y: mp.y });
          } else if (d.mode === 'pan') {
            setView({
              scale: d.v0.scale,
              tx: d.v0.tx + (sx - d.sx),
              ty: d.v0.ty + (sy - d.sy),
            });
          }
        },

        onPanResponderRelease: () => finishGesture(),
        onPanResponderTerminate: () => finishGesture(),
      }),
    [] // handlers read live.current
  );

  const startPinch = (touches) => {
    const v = live.current.view;
    const p1 = { x: touches[0].pageX - offsetRef.current.x, y: touches[0].pageY - offsetRef.current.y };
    const p2 = { x: touches[1].pageX - offsetRef.current.x, y: touches[1].pageY - offsetRef.current.y };
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    dragRef.current = {
      mode: 'pinch',
      d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1,
      s0: v.scale,
      anchor: toModel(mid.x, mid.y, v),
    };
    setPreview(null);
    setMoveOverride(null);
  };

  const movePinch = (touches) => {
    const d = dragRef.current;
    const p1 = { x: touches[0].pageX - offsetRef.current.x, y: touches[0].pageY - offsetRef.current.y };
    const p2 = { x: touches[1].pageX - offsetRef.current.x, y: touches[1].pageY - offsetRef.current.y };
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
    const scale = clamp((d.s0 * dist) / d.d0, 0.4, 2.6);
    setView({ scale, tx: mid.x - d.anchor.x * scale, ty: mid.y - d.anchor.y * scale });
  };

  const finishGesture = () => {
    const d = dragRef.current;
    const { mol: m, preview: pv, moveOverride: mo } = live.current;

    if (d.mode === 'pending' && d.hit) {
      const v = live.current.view;
      handleTap(d.hit, toModel(d.sx, d.sy, v));
    } else if (d.mode === 'bondDrag' && pv) {
      if (pv.mergeId) {
        const existing = bondBetween(m, pv.fromId, pv.mergeId);
        if (existing) {
          commit(updateBond(m, existing.id, { order: live.current.bondOrder }));
        } else {
          const res = addBond(m, pv.fromId, pv.mergeId, live.current.bondOrder);
          commit(res.mol);
        }
      } else {
        let res = addAtom(m, { el: 'C', x: pv.to.x, y: pv.to.y });
        res = addBond(res.mol, pv.fromId, res.atom.id, live.current.bondOrder);
        commit(res.mol);
      }
    } else if (d.mode === 'atomMove' && mo) {
      commit(updateAtom(m, mo.atomId, { x: mo.x, y: mo.y }));
    }

    dragRef.current = { mode: null };
    setPreview(null);
    setMoveOverride(null);
  };

  // ── Zoom controls ─────────────────────────────────────────
  const zoomIn = () => {
    if (!size) return;
    setView((v) => {
      const scale = clamp(v.scale * 1.3, 0.4, 2.6);
      const cx = size.w / 2;
      const cy = size.h / 2;
      const anchor = toModel(cx, cy, v);
      return { scale, tx: cx - anchor.x * scale, ty: cy - anchor.y * scale };
    });
  };

  const fitContent = () => {
    if (!size) return;
    const bb = moleculeBBox(mol);
    const pad = 70;
    const bw = Math.max(bb.maxX - bb.minX, 1) + pad * 2;
    const bh = Math.max(bb.maxY - bb.minY, 1) + pad * 2;
    const scale = clamp(Math.min(size.w / bw, size.h / bh, 1.6), 0.4, 2.6);
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;
    setView({ scale, tx: size.w / 2 - cx * scale, ty: size.h / 2 - cy * scale });
  };

  // ── Popover actions ───────────────────────────────────────
  const popAtom = popover ? atomById(mol, popover.atomId) : null;
  const popPos = popAtom && size ? clampPopover(toScreen(popAtom.x, popAtom.y, view), size) : null;

  const popSetElement = (el) => {
    commit(updateAtom(mol, popover.atomId, { el }));
    setPopover(null);
  };
  const popCharge = (delta) => {
    const a = atomById(mol, popover.atomId);
    commit(updateAtom(mol, popover.atomId, { charge: clamp(a.charge + delta, -2, 2) }));
  };
  const popDelete = () => {
    commit(removeAtom(mol, popover.atomId));
    setPopover(null);
    setSelection(null);
  };
  const popAddH = () => {
    const a = atomById(mol, popover.atomId);
    commit(updateAtom(mol, popover.atomId, { showH: !a.showH }));
    setPopover(null);
  };

  // ── Render prep ───────────────────────────────────────────
  const displayMol = useMemo(() => {
    if (!moveOverride) return mol;
    return {
      ...mol,
      atoms: mol.atoms.map((a) =>
        a.id === moveOverride.atomId ? { ...a, x: moveOverride.x, y: moveOverride.y } : a
      ),
    };
  }, [mol, moveOverride]);

  const grid = useMemo(() => {
    if (!size) return null;
    const gap = 22;
    const dots = [];
    for (let x = gap / 2; x < size.w; x += gap) {
      for (let y = gap / 2; y < size.h; y += gap) {
        dots.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill="#D5E2E9" />);
      }
    }
    return <G>{dots}</G>;
  }, [size]);

  const showHint = mol.atoms.length === 1 && mol.bonds.length === 0;
  const seedScreen =
    showHint && size ? toScreen(mol.atoms[0].x, mol.atoms[0].y, view) : null;

  const selAtom = selection && selection.atomId ? atomById(displayMol, selection.atomId) : null;
  const selBond = selection && selection.bondId ? bondById(displayMol, selection.bondId) : null;

  return (
    <View ref={wrapRef} style={cs.wrap} onLayout={onLayout} {...pan.panHandlers}>
      <Svg width="100%" height="100%" pointerEvents="none">
        {grid}
        <G transform={`translate(${view.tx}, ${view.ty}) scale(${view.scale})`}>
          <MoleculeShapes
            mol={displayMol}
            highlightAtoms={highlightAtoms}
            highlightBonds={highlightBonds}
            selectedAtom={selAtom}
            selectedBond={selBond}
          />
          {preview ? (
            <G>
              <Line
                x1={preview.from.x}
                y1={preview.from.y}
                x2={preview.to.x}
                y2={preview.to.y}
                stroke={C.teal}
                strokeWidth={2.5}
                strokeDasharray="5 4"
                strokeLinecap="round"
              />
              <Circle
                cx={preview.to.x}
                cy={preview.to.y}
                r={preview.mergeId ? 11 : 6}
                fill={preview.mergeId ? 'none' : C.teal}
                stroke={C.teal}
                strokeWidth={2}
                opacity={0.85}
              />
            </G>
          ) : null}
        </G>
        {seedScreen ? (
          <Path
            d={`M ${seedScreen.x + 16} ${seedScreen.y - 12} Q ${seedScreen.x + 46} ${seedScreen.y - 44} ${seedScreen.x + 78} ${seedScreen.y - 34}`}
            stroke={C.blue}
            strokeWidth={2}
            strokeDasharray="4 4"
            fill="none"
            opacity={0.7}
          />
        ) : null}
      </Svg>

      {showHint && seedScreen ? (
        <Text
          style={[
            cs.hint,
            { left: clamp(seedScreen.x - 70, 8, (size?.w || 200) - 150), top: seedScreen.y + 18 },
          ]}
        >
          Drag to extend{'\n'}a carbon chain
        </Text>
      ) : null}

      {/* Zoom controls */}
      <View style={cs.zoomCol} pointerEvents="box-none">
        <Pressable style={cs.zoomBtn} onPress={zoomIn}>
          <MaterialCommunityIcons name="magnify-plus-outline" size={19} color={C.navy} />
        </Pressable>
        <Pressable style={cs.zoomBtn} onPress={fitContent}>
          <MaterialCommunityIcons name="crosshairs" size={19} color={C.navy} />
        </Pressable>
      </View>

      {/* Atom popover */}
      {popAtom && popPos ? (
        <View style={[cs.popover, { left: popPos.x, top: popPos.y }]}>
          <View style={cs.popRow}>
            {(popover.halogens ? ELEMENTS_HALO : ELEMENTS_MAIN).map((el) => (
              <Pressable
                key={el}
                onPress={() => popSetElement(el)}
                style={[cs.popEl, popAtom.el === el && { backgroundColor: C.teal }]}
              >
                <Text style={[cs.popElText, popAtom.el === el && { color: '#FFF' }]}>{el}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setPopover((p) => ({ ...p, halogens: !p.halogens }))}
              style={cs.popEl}
            >
              <Text style={cs.popElText}>{popover.halogens ? '<' : 'X'}</Text>
            </Pressable>
          </View>
          <View style={cs.popRow}>
            <Pressable onPress={() => popCharge(1)} style={cs.popEl}>
              <Text style={cs.popElText}>+</Text>
            </Pressable>
            <Pressable onPress={() => popCharge(-1)} style={cs.popEl}>
              <Text style={cs.popElText}>-</Text>
            </Pressable>
          </View>
          <View style={[cs.popRow, { borderBottomWidth: 0 }]}>
            <Pressable onPress={popDelete} style={cs.popAction}>
              <Ionicons name="trash-outline" size={15} color={C.danger} />
              <Text style={[cs.popActionText, { color: C.danger }]}>Delete</Text>
            </Pressable>
            <Pressable onPress={popAddH} style={cs.popAction}>
              <Ionicons name="add-circle-outline" size={15} color={C.navy} />
              <Text style={cs.popActionText}>{popAtom.showH ? 'Hide H' : 'Add H'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function angDiff(a, b) {
  let d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
}

function pointSegDist(px, py, p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - p1.x) * dx + (py - p1.y) * dy) / len2;
  t = clamp(t, 0, 1);
  const x = p1.x + t * dx;
  const y = p1.y + t * dy;
  return Math.hypot(px - x, py - y);
}

function clampPopover(p, size) {
  const W = 216;
  const H = 128;
  return {
    x: clamp(p.x - W / 2, 6, size.w - W - 6),
    y: clamp(p.y + 20, 6, size.h - H - 6),
  };
}

const cs = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#FCFDFE',
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: 'hidden',
  },
  hint: {
    position: 'absolute',
    color: C.sub,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    width: 150,
  },
  zoomCol: { position: 'absolute', top: 10, right: 10, gap: 8 },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  popover: {
    position: 'absolute',
    width: 216,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...shadow,
    elevation: 6,
  },
  popRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  popEl: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popElText: { fontWeight: '800', fontSize: 14, color: C.navy },
  popAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6, flex: 1 },
  popActionText: { fontSize: 13, fontWeight: '600', color: C.navy },
});
