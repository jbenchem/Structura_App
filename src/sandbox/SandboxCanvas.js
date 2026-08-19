// ─────────────────────────────────────────────────────────────
// The drawing canvas — gesture set carried over from the
// prototype verbatim (CHECKLIST.md sections 1-8).
//
// Two rules that previously caused real bugs and must survive any
// future edit:
//
//   1. The PanResponder is created ONCE. Every value a handler
//      reads comes through a ref refreshed on each render
//      (gRef, selRef, modeRef, ...). Reading state directly from
//      render scope inside a handler permanently captures the
//      first render — this is what made undo wipe the canvas.
//   2. Hit-testing happens in JS behind a transparent touch layer,
//      never with SVG onPress, which is unreliable on web.
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Line, Polygon, Circle, Rect, Text as SvgText, TSpan, G, Path } from 'react-native-svg';
import { C, BOND, HIT_ATOM, HIT_BOND, BOND_TYPES, LIMIT, TEMPLATES, implicitH, labelWidth, dist, snap30, elColour, safeTransform } from './constants';
import { STRUCT_FONT } from './fonts';
import { pointToSegment, nextPosition, bondLoad, chainAlong } from './layout';
import { AtomLabel, BondShape, bondSideHint } from './render';
import { tap, bump } from './haptics';

export function SandboxCanvas({ graph, setGraph, setGraphLive, endDrag, selected, setSelected,
                 selBond, setSelBond, ringTool, onPlaceRing, chainTool, onDrawChain,
                 mode, element, bondType, showCarbons, width, height,
                 view, setView, highlight, onPickAtom, locants }) {
  const gRef = useRef(graph);       gRef.current = graph;
  const selRef = useRef(selected);  selRef.current = selected;
  const modeRef = useRef(mode);     modeRef.current = mode;
  const elRef = useRef(element);    elRef.current = element;
  const btRef = useRef(bondType);   btRef.current = bondType;
  const rtRef = useRef(ringTool);   rtRef.current = ringTool;
  const ctRef = useRef(chainTool);  ctRef.current = chainTool;
  const dcRef = useRef(onDrawChain); dcRef.current = onDrawChain;
  const [preview, setPreview] = useState(null);
  const prRef = useRef(onPlaceRing); prRef.current = onPlaceRing;
  const drag = useRef({});
  const vRef = useRef(view); vRef.current = view;
  /* screen <-> molecule coordinates */
  const toMol = (x,y) => ({ x:(x-vRef.current.tx)/vRef.current.k,
                            y:(y-vRef.current.ty)/vRef.current.k });

  /* Pick whichever is genuinely nearer, so a tap in the middle of a bond
     reaches the bond rather than being swallowed by an endpoint. */
  /* A labelled atom (N, O, or any carbon while "show all" is on) is drawn
     wider than a bare vertex, so its touch radius has to match what is on
     screen. Otherwise a tap on the visible letter lands outside the target. */
  const hitR = (a) => {
    const labelled = (a.el && a.el!=="C") || showCarbons;
    if(!labelled) return HIT_ATOM;
    const nH = showCarbons ? Math.max(0,(LIMIT[a.el||"C"] ?? 4) -
      (gRef.current.bonds.reduce((s,b)=>s+((b.a===a.id||b.b===a.id)?(b.order||1):0),0))) : 0;
    return Math.max(HIT_ATOM, labelWidth(a.el||"C", nH, 15)/2 + 5);
  };

  const pick = (x,y, selId) => {
    const g = gRef.current;
    /* the selected atom always wins a tap on itself, so it can be deselected */
    if(selId!=null){
      const s = g.atoms.find(a=>a.id===selId);
      if(s && dist(x,y,s.x,s.y) <= hitR(s)) return { atom:s };
    }
    const at = id => g.atoms.find(a=>a.id===id);
    let bestA=null, dA=Infinity, margin=0;
    for(const a of g.atoms){
      const d=dist(x,y,a.x,a.y) - hitR(a);      /* how far outside its target */
      if(d<dA){ dA=d; bestA=a; margin=hitR(a); }
    }
    dA += margin;                                /* back to a plain distance */
    let bestB=null, dB=Infinity;
    for(const b of g.bonds){
      const A=at(b.a), B=at(b.b);
      if(!A||!B) continue;
      const d=pointToSegment(x,y,A.x,A.y,B.x,B.y);
      if(d<dB){ dB=d; bestB=b; }
    }
    /* An atom sits at the end of its own bonds, so the distance to a bond is
       near zero right beside it. Comparing the two distances therefore always
       favours the bond; the atom radius has to win outright instead. The bond
       length leaves a clear band in the middle where only the bond is in range. */
    if(bestA && dA<=hitR(bestA)) return { atom:bestA };
    if(bestB && dB<=HIT_BOND)    return { bond:bestB };
    return {};
  };
  const atomAt = (x,y) => pick(x,y).atom;


  const handleTap = (sx,sy,long) => {
    const g = gRef.current;
    const { x, y } = toMol(sx,sy);
    const hit = pick(x, y, selRef.current);
    const hitA = hit.atom, hitB = hit.bond;
    tap();

    /* A ring template is armed: this click places it. */
    if(rtRef.current && prRef.current){
      const tpl = TEMPLATES.find(t=>t.id===rtRef.current);
      if(tpl){
        prRef.current(tpl, hitA ? { atomId:hitA.id, spiro:long }
          : hitB ? { bond:{ a:hitB.a, b:hitB.b } }
          : { at:{ x, y } });
        return;
      }
    }

    /* Touching a bond means the drawing is not being extended, so disarm.
       A tap far from a selected atom does the same. With nothing selected,
       a tap in blank space is simply a new atom, wherever it lands. */
    if(hitB && selRef.current != null) setSelected(null);
    if(!hitA && !hitB && selRef.current != null){
      const from = g.atoms.find(a=>a.id===selRef.current);
      if(from && dist(x,y,from.x,from.y) > BOND*2.2){
        setSelected(null);
        return;                               /* deliberate tap away: just disarm */
      }
    }

    if(modeRef.current === "erase"){
      if(hitA){
        setGraph({ atoms:g.atoms.filter(a=>a.id!==hitA.id),
                   bonds:g.bonds.filter(b=>b.a!==hitA.id && b.b!==hitA.id) });
        setSelected(null);
      } else if(hitB){
        setGraph({ atoms:g.atoms, bonds:g.bonds.filter(b=>b!==hitB) });
      }
      return;
    }

    if(hitB){
      /* apply the selected bond type; tapping it again returns it to single */
      const want = BOND_TYPES.find(t=>t.id===btRef.current) || BOND_TYPES[0];
      const same = (hitB.order||1)===want.order && (hitB.stereo||null)===want.stereo;
      const nx = same ? BOND_TYPES[0] : want;
      setGraph({ atoms:g.atoms,
        bonds:g.bonds.map(b => b===hitB ? { ...b, order:nx.order, stereo:nx.stereo } : b) });
      return;
    }

    if(hitA){
      const el = elRef.current;
      const bt = BOND_TYPES.find(t=>t.id===btRef.current) || BOND_TYPES[0];

      /* long press changes what an atom is, so a stray tap can never do it */
      if(long){
        bump();
        setGraph({ atoms:g.atoms.map(x=>x.id===hitA.id
            ? { ...x, ...(el==="C" ? {el:undefined} : {el}) } : x),
          bonds:g.bonds });
        return;
      }

      /* tapping the armed atom disarms it */
      if(selRef.current === hitA.id){ setSelected(null); return; }

      /* An atom is armed and a different existing atom was tapped: join them.
         This takes priority over adding, so two atoms can always be connected
         whatever element is showing in the picker. It is also how a ring is
         closed. */
      if(selRef.current != null){
        const existing = g.bonds.find(b =>
          (b.a===selRef.current && b.b===hitA.id) ||
          (b.b===selRef.current && b.a===hitA.id));
        if(existing){
          /* already joined: apply the chosen bond type to it instead */
          const same = (existing.order||1)===bt.order && (existing.stereo||null)===bt.stereo;
          const nx = same ? BOND_TYPES[0] : bt;
          setGraph({ atoms:g.atoms,
            bonds:g.bonds.map(b => b===existing
              ? { ...b, order:nx.order, stereo:nx.stereo } : b) });
        } else {
          setGraph({ atoms:g.atoms,
            bonds:[...g.bonds, { a:selRef.current, b:hitA.id,
                                 order:bt.order, stereo:bt.stereo }] });
        }
        setSelected(hitA.id);
        return;
      }

      /* Nothing armed and a heteroatom is chosen: hang one off this atom. */
      if(el !== "C"){
        const nid = g.atoms.length ? Math.max(...g.atoms.map(x=>x.id))+1 : 1;
        const pos = nextPosition(g, hitA);
        setGraph({ atoms:[...g.atoms, { id:nid, x:pos.x, y:pos.y, el }],
          bonds:[...g.bonds, { a:hitA.id, b:nid, order:bt.order, stereo:bt.stereo }] });
        setSelected(hitA.id);
        return;
      }

      setSelected(hitA.id);
      return;
    }

    /* empty space, close enough to be a deliberate extension */
    const id = g.atoms.length ? Math.max(...g.atoms.map(a=>a.id))+1 : 1;
    const el = elRef.current;
    const atom = { id, x:Math.round(x), y:Math.round(y), ...(el!=="C" ? { el } : {}) };
    if(selRef.current != null){
      const from = g.atoms.find(a=>a.id===selRef.current);
      if(from){
        const ang = snap30(Math.atan2(y-from.y, x-from.x));
        atom.x = Math.round(from.x + BOND*Math.cos(ang));
        atom.y = Math.round(from.y + BOND*Math.sin(ang));
      }
      const bt = BOND_TYPES.find(t=>t.id===btRef.current) || BOND_TYPES[0];
      setGraph({ atoms:[...g.atoms, atom],
        bonds:[...g.bonds, { a:selRef.current, b:id, order:bt.order, stereo:bt.stereo }] });
    } else {
      setGraph({ atoms:[...g.atoms, atom], bonds:g.bonds });
    }
    /* Carbon stays armed, because a chain is built by tapping onward from the
       atom just placed. A heteroatom does not: O, N, Cl and the rest are almost
       always terminal, so leaving one armed invites an unwanted extra bond —
       and if the next tap lands on an existing atom it closes a ring that was
       never intended. */
    setSelected(el === "C" ? id : null);
  };

  /* PanResponder is built once, so it would otherwise hold the very first
     handleTap and setGraph forever. Those close over the initial empty graph,
     which is why every undo step used to jump back to a blank canvas. Route
     the calls through refs that are refreshed on every render. */
  const tapRef = useRef(null);   tapRef.current = handleTap;
  const sgRef  = useRef(null);   sgRef.current  = setGraph;
  const slRef  = useRef(null);   slRef.current  = setGraphLive || setGraph;
  const edRef  = useRef(null);   edRef.current  = endDrag;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx)>6 || Math.abs(gs.dy)>6,
    onPanResponderGrant: (e) => {
      const t = e.nativeEvent.touches || [];
      const { locationX:sx, locationY:sy } = e.nativeEvent;
      const m = toMol(sx,sy);
      const a = gRef.current.atoms.find(at => dist(m.x,m.y,at.x,at.y) < hitR(at));
      /* Where the canvas sits on the page. Touch midpoints arrive in page
         coordinates while the view transform works in canvas coordinates, so
         without this the zoom centres somewhere above where the fingers are. */
      const originX = (e.nativeEvent.pageX ?? sx) - sx;
      const originY = (e.nativeEvent.pageY ?? sy) - sy;
      drag.current = { sx, sy, mx:m.x, my:m.y, moved:false, t0:Date.now(),
                       id: a ? a.id : null, handled:false, originX, originY,
                       pinch: t.length>=2 ? touchDist(t) : null,
                       view0: { ...vRef.current } };
      /* fire the long press while the finger is still down: measuring on
         release is unreliable, because a mouse jitters and the gesture then
         counts as a drag */
      /* the chain tool owns the drag: no atom is moved while it is armed */
      if(ctRef.current){
        drag.current.chain = { from: a ? { x:a.x, y:a.y } : { x:m.x, y:m.y },
                               startId: a ? a.id : null };
        drag.current.id = null;
        return;
      }
      if(a){
        const d0 = drag.current;
        d0.timer = setTimeout(()=>{
          if(drag.current !== d0 || d0.moved || d0.handled) return;
          d0.handled = true;
          bump();
          tapRef.current(sx, sy, true);
        }, 500);
      }
    },
    onPanResponderMove: (e, gs) => {
      const d = drag.current;
      if(!d) return;
      d.gs = { dx:gs.dx, dy:gs.dy };
      const t = e.nativeEvent.touches || [];
      /* two fingers: pinch to zoom about the midpoint */
      if(t.length>=2){
        d.moved = true;
        const now = touchDist(t);
        const cx = (t[0].pageX + t[1].pageX)/2 - (d.originX||0);
        const cy = (t[0].pageY + t[1].pageY)/2 - (d.originY||0);
        if(d.pinch==null){
          d.pinch = now;
          d.view0 = { ...vRef.current };
          /* The model point under the fingers when the gesture began. Keeping
             THIS point under the midpoint is what makes two fingers both zoom
             and pan: previously the anchor was recomputed from the current
             midpoint each frame, so at constant scale the translation always
             cancelled out and dragging two fingers moved nothing. */
          d.anchor = {
            x: (cx - d.view0.tx) / d.view0.k,
            y: (cy - d.view0.ty) / d.view0.k,
          };
        }
        const ratio = now / (d.pinch||1);
        const k = Math.max(0.4, Math.min(3, d.view0.k*ratio));
        setView({ k, tx: cx - d.anchor.x*k, ty: cy - d.anchor.y*k });
        return;
      }
      if(Math.abs(gs.dx)>6 || Math.abs(gs.dy)>6){
        d.moved = true;
        if(d.timer){ clearTimeout(d.timer); d.timer=null; }
      }
      if(d.chain){
        const k = vRef.current.k;
        const r = chainAlong(gRef.current, d.chain.from, gs.dx/k, gs.dy/k, d.chain.startId);
        setPreview({ atoms:r.made.map(id=>r.atoms.find(a=>a.id===id)),
                     bonds:r.bonds.slice(gRef.current.bonds.length),
                     count:r.count });
        return;
      }
      /* dragging an atom moves it; dragging empty space pans the view */
      if(d.id == null){
        if(!d.moved) return;
        setView({ k:d.view0.k, tx:d.view0.tx+gs.dx, ty:d.view0.ty+gs.dy });
        return;
      }
      if(modeRef.current==="erase") return;
      const k = vRef.current.k;
      const g = gRef.current;
      slRef.current({
        atoms: g.atoms.map(a => a.id===d.id
          ? { ...a, x:Math.round(d.mx+gs.dx/k), y:Math.round(d.my+gs.dy/k) } : a),
        bonds: g.bonds,
      });
    },
    onPanResponderRelease: () => {
      const d = drag.current;
      drag.current = {};
      if(d && d.timer) clearTimeout(d.timer);
      setPreview(null);
      if(d && d.chain){
        if(edRef.current) edRef.current();
        if(d.moved && dcRef.current) dcRef.current(d.chain, d.gs || { dx:0, dy:0 });
        return;
      }
      if(edRef.current) edRef.current();
      if(!d || d.moved || d.handled) return;
      tapRef.current(d.sx, d.sy, false);
    },
  })).current;

  const at = id => graph.atoms.find(a=>a.id===id);
  const isC = a => !a.el || a.el==="C";
  const load = bondLoad(graph.bonds);
  const hLoad = {};
  graph.atoms.forEach(a=>{ hLoad[a.id] = implicitH(a, load); });

  return (
    <View style={{ width, height }} {...pan.panHandlers}>
      <Svg width={width} height={height}>
       <G transform={safeTransform(view)}>
        {preview && preview.bonds.map((b,i)=>{
          const at = id => preview.atoms.find(a=>a.id===id) || graph.atoms.find(a=>a.id===id);
          const A=at(b.a), B=at(b.b);
          if(!A||!B) return null;
          return <Line key={"p"+i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            stroke={C.blue} strokeWidth={2.2} strokeLinecap="round" opacity={0.55}/>;
        })}
        {graph.bonds.map((b,i) => {
          const A=at(b.a), B=at(b.b);
          if(!A||!B) return null;
          const hot = highlight && highlight.has(b.a) && highlight.has(b.b);
          return <BondShape key={i} b={b} A={A} B={B} hydrogens={hLoad} hot={hot}
            sideHint={b.order===2 ? bondSideHint(b, graph.atoms, graph.bonds) : 1}
            showCarbons={showCarbons} atById={at}/>;
        })}
        {locants && graph.atoms.map(a => {
          const loc = locants[a.id];
          if(loc===undefined) return null;
          return <SvgText key={"n"+a.id} x={a.x-14} y={a.y-12} fontSize={11}
            fontWeight="700" fontFamily={STRUCT_FONT} fill={C.blue}
            textAnchor="middle">{String(loc)}</SvgText>;
        })}
        {graph.atoms.map(a => {
          const over = (load[a.id]||0) > (LIMIT[a.el||"C"] ?? 4);
          const sel = selected === a.id;
          const hot = highlight && highlight.has(a.id);
          const label = !isC(a) || showCarbons || over;
          return (
            <G key={a.id}>
              {hot && !sel && <Circle cx={a.x} cy={a.y} r={16} fill={C.surf2} stroke={C.blue} strokeWidth={2}/>}
              {sel && <Circle cx={a.x} cy={a.y} r={18} fill={C.surf2} stroke={C.blue} strokeWidth={2.4}/>}
              {over && !sel && <Circle cx={a.x} cy={a.y} r={16} fill="#FFE9E9" stroke={C.red} strokeWidth={1.8}/>}
              {label
                ? <AtomLabel x={a.x} y={a.y} el={a.el||"C"}
                    /* A heteroatom carries its hydrogens as soon as it is
                       placed: drop an oxygen on a chain and it reads OH, a
                       nitrogen NH2. They are not stored on the graph — the
                       naming engine rejects explicit hydrogens — they are
                       counted from the four-bond rule and drawn, which is the
                       same convention the structure renderer uses.
                       Carbon still hides its hydrogens unless every atom is
                       being shown, and an over-bonded atom shows none because
                       there are none left to have. */
                    nH={over ? 0
                        : (showCarbons || (a.el && a.el !== "C" && a.el !== "H"))
                          ? hLoad[a.id] : 0}
                    size={15} bg={sel||over||hot?"transparent":C.surf}
                    fill={over?C.red:hot?C.blue:elColour(a.el)}/>
                : (!sel && <Circle cx={a.x} cy={a.y} r={3} fill={C.navy} opacity={0.28}/>)}
            </G>
          );
        })}
       </G>
      </Svg>
    </View>
  );
}


const touchDist = t => Math.hypot(t[0].pageX-t[1].pageX, t[0].pageY-t[1].pageY);

/* ================= draw screen ================= */
