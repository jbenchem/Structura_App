// ─────────────────────────────────────────────────────────────
// Sandbox structure rendering — carried over verbatim.
//
// One label per atom (element + H + count as a subscript), bonds
// trimmed to the label edge, double bonds drawn as the ordinary
// line plus a second line beside it (inside the ring for ring
// bonds, on the roomier side for chains).
//
// SVG onPress is unreliable on web, so StaticMol hit-tests in JS
// behind a transparent touch layer — same rule as the canvas.
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import { View, Pressable, PanResponder } from 'react-native';
import Svg, { Line, Polygon, Circle, Rect, Text as SvgText, TSpan, G, Path } from 'react-native-svg';
import { C, BOND, LIMIT, implicitH, labelWidth, dist, elColour } from './constants';
import { STRUCT_FONT } from './fonts';
import { pointToSegment, bondLoad } from './layout';
import { tap } from './haptics';
import { withDisplayHydrogens } from '../chem/displayHydrogens';

export function AtomLabel({ x, y, el, nH, fill, size, bg }){
  const w = labelWidth(el, nH, size);
  /* Positioned from the left rather than with textAnchor="middle".

     Middle-anchoring measures the whole run INCLUDING the subscript, so on a
     label like CH2 the atom's vertex ended up between the H and the 2 and the
     label read as sitting off to one side. Starting at x - w/2 uses the app's
     own labelWidth — the same measure the background rect and the bond
     shortening already use — so all three agree by construction. */
  const glyphPad = size*0.15;
  return (
    <G>
      <Rect x={x-w/2} y={y-size*0.66} width={w} height={size*1.32}
        rx={size*0.28} fill={bg} />
      <SvgText x={x-w/2+glyphPad} y={y+size*0.36} fontSize={size} fontWeight="700"
        fontFamily={STRUCT_FONT} fill={fill} textAnchor="start">
        {el}{nH>0 ? "H" : ""}
        {nH>1 ? <TSpan dy={size*0.26} fontSize={size*0.68}>{String(nH)}</TSpan> : null}
      </SvgText>
    </G>
  );
}

export function RingIcon({ n, aromatic, colour, size=26 }){
  const R = size/2 - 2;
  const c = size/2;
  const pts = Array.from({length:n},(_,i)=>{
    const t = -Math.PI/2 + i*(2*Math.PI/n);
    return `${(c+R*Math.cos(t)).toFixed(1)},${(c+R*Math.sin(t)).toFixed(1)}`;
  }).join(" ");
  return (
    <Svg width={size} height={size}>
      <Polygon points={pts} fill="none" stroke={colour} strokeWidth={1.9}
        strokeLinejoin="round"/>
      {aromatic && <Circle cx={c} cy={c} r={R*0.52} fill="none"
        stroke={colour} strokeWidth={1.6}/>}
    </Svg>
  );
}

/* The chain tool: drag to lay down a zigzag of carbons. */

export function BondShape({ b, A, B, showCarbons, atById, scale=1, hydrogens, hot, sideHint }){
  const isC = a => !a.el || a.el==="C";
  const dx=B.x-A.x, dy=B.y-A.y, L=Math.hypot(dx,dy)||1;
  const ux=dx/L, uy=dy/L, px=-uy, py=ux;
  /* How far to stop short of a labelled atom.
     Trimming by the label's half-WIDTH regardless of direction pulled a
     near-vertical bond back by the full width of "CH2", leaving a gap that
     made the label look displaced from the corner it belongs to. The bond is
     instead stopped where it meets the label's box, so the gap is even on
     every side and the label sits centred on the vertex. */
  const trim = id => {
    const at = atById(id);
    if(!at) return 0;
    if(isC(at) && !showCarbons) return 0;
    const nH = showCarbons ? (hydrogens ? hydrogens[id]||0 : 0) : 0;
    const size = 14 * scale;
    const halfW = labelWidth(at.el||"C", nH, size) / 2;
    const halfH = size * 0.72;
    const EPS = 1e-6;
    const tx = Math.abs(ux) < EPS ? Infinity : halfW / Math.abs(ux);
    const ty = Math.abs(uy) < EPS ? Infinity : halfH / Math.abs(uy);
    return Math.min(tx, ty) + 2;
  };
  const a0={ x:A.x+ux*trim(b.a), y:A.y+uy*trim(b.a) };
  const b0={ x:B.x-ux*trim(b.b), y:B.y-uy*trim(b.b) };
  const stroke = hot ? C.blue : C.navy;
  if(b.stereo==="wedge")
    return <Polygon fill={stroke}
      points={`${a0.x},${a0.y} ${b0.x+px*6*scale},${b0.y+py*6*scale} ${b0.x-px*6*scale},${b0.y-py*6*scale}`}/>;
  if(b.stereo==="dash")
    return <G>{Array.from({length:6},(_,k)=>{
      const t=(k+1)/7, cx=a0.x+(b0.x-a0.x)*t, cy=a0.y+(b0.y-a0.y)*t, w=(1.5+4.5*t)*scale;
      return <Line key={k} stroke={stroke} strokeWidth={2}
        x1={cx+px*w} y1={cy+py*w} x2={cx-px*w} y2={cy-py*w}/>;
    })}</G>;
  /* Draw a double bond as the ordinary bond line plus a second line beside it,
     the way it is drawn by hand, rather than two lines straddling the axis.
     The extra line goes on whichever side is emptier. */
  let offs = [0];
  if(b.order===3) offs = [-5,0,5];
  else if(b.order===2){
    let side = 1;
    if(sideHint) side = sideHint;
    offs = [0, side*5.5];
  }
  return <G>{offs.map((o,k)=>(
    <Line key={k} stroke={stroke} strokeWidth={hot?3.4:2.2} strokeLinecap="round"
      x1={a0.x+px*o*scale} y1={a0.y+py*o*scale}
      x2={b0.x+px*o*scale} y2={b0.y+py*o*scale}/>
  ))}</G>;
}

/* Which side of a bond should the second line of a double bond go?

   In a ring it goes INSIDE, towards the ring centre — that is the drawing
   convention, and it is what makes a benzene read as a benzene. Elsewhere it
   goes wherever there is more room. The two rules point opposite ways, because
   a ring's neighbouring atoms lie towards its centre, so the "avoid the
   neighbours" heuristic would push the line out of the ring. */

export function bondSideHint(bond, atoms, bonds){
  const at = id => atoms.find(a=>a.id===id);
  const A = at(bond.a), B = at(bond.b);
  if(!A||!B) return 1;
  const dx=B.x-A.x, dy=B.y-A.y, L=Math.hypot(dx,dy)||1;
  const px=-dy/L, py=dx/L;

  /* is this bond part of a ring? look for another route between its ends */
  const prev = new Map([[bond.a, null]]);
  const q=[bond.a];
  let found=false;
  while(q.length && !found){
    const v=q.shift();
    for(const b of bonds){
      if(b===bond) continue;
      const w = b.a===v ? b.b : b.b===v ? b.a : null;
      if(w===null || prev.has(w)) continue;
      prev.set(w, v);
      if(w===bond.b){ found=true; break; }
      q.push(w);
    }
  }
  if(found){
    /* walk the ring back and aim at its centre */
    const ring=[]; let c=bond.b;
    while(c!==null && c!==undefined){ ring.push(c); c=prev.get(c); }
    if(ring.length>=3 && ring.length<=8){
      let cx=0, cy=0, n=0;
      for(const id of ring){ const p=at(id); if(p){ cx+=p.x; cy+=p.y; n++; } }
      cx/=n; cy/=n;
      const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
      return ((cx-mx)*px + (cy-my)*py) > 0 ? 1 : -1;
    }
  }

  /* not in a ring: keep clear of whatever else is attached */
  let score=0;
  for(const nb of bonds){
    const other = nb.a===bond.a ? nb.b : nb.b===bond.a ? nb.a
                : nb.a===bond.b ? nb.b : nb.b===bond.b ? nb.a : null;
    if(other===null || other===bond.a || other===bond.b) continue;
    const P = at(other);
    if(!P) continue;
    const base = (nb.a===bond.a||nb.b===bond.a) ? A : B;
    score += Math.sign((P.x-base.x)*px + (P.y-base.y)*py);
  }
  return score > 0 ? -1 : 1;
}

/* ================= interactive canvas ================= */

// `showStereoH` draws the hydrogens on the carbons of a C=C so cis and trans
// can be read off the picture. The expansion happens HERE, at the point of
// drawing, and never leaves this function: the engine cannot name a graph
// carrying explicit hydrogens, so an expanded molecule must not escape into
// checking. Callers keep passing the real molecule.
/* `frame` locks the view. Without it the scale and centre are recomputed from
   the molecule's own bounding box every render, so moving a substituent — or
   adding a carbon — re-frames the whole drawing and the chain appears to jump.
   An interactive that asks the learner to watch one thing change needs the
   rest to hold still, so it passes a frame covering every state it can reach
   and the chain then stays put. */
// `labelOnly` names a subset of atom ids to write out when showCarbons is on.
// It exists so a drawing can be converted from skeletal to semi-structural a
// carbon at a time, with both notations visible at once — which is the thing
// that makes the two forms click.
export function StaticMol({ mol: molIn, width, showCarbons, highlight, locants, onPickAtom, showStereoH, frame, labelOnly }) {
  const labelsThisAtom = (id) => !labelOnly || labelOnly.has(id);
  const mol = showStereoH ? withDisplayHydrogens(molIn) : molIn;
  /* atoms carry a generous invisible target so the structure can be tapped */
  const h = frame && frame.height ? frame.height : Math.min(width*0.72, 250);
  const xs=mol.atoms.map(a=>a.x), ys=mol.atoms.map(a=>a.y);
  const minX=frame ? frame.minX : Math.min(...xs);
  const maxX=frame ? frame.maxX : Math.max(...xs);
  const minY=frame ? frame.minY : Math.min(...ys);
  const maxY=frame ? frame.maxY : Math.max(...ys);
  const w=Math.max(maxX-minX,1), hh=Math.max(maxY-minY,1);
  const pad=28;
  const k=Math.min((width-pad*2)/w, (h-pad*2)/hh, 2.4);
  const ox=(width-w*k)/2-minX*k, oy=(h-hh*k)/2-minY*k;
  const at=id=>{
    const a=mol.atoms.find(z=>z.id===id);
    return a ? { ...a, x:a.x*k+ox, y:a.y*k+oy } : null;
  };
  const rawAt=id=>mol.atoms.find(z=>z.id===id);
  const isC=a=>!a.el||a.el==="C";
  const load=bondLoad(mol.bonds);
  const hLoad={};
  mol.atoms.forEach(a=>{ hLoad[a.id]=implicitH(a, load); });
  /* SVG element press handlers are patchy on the web, so the drawing is
     hit-tested in JS behind a single transparent touch layer. */
  const touch = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderRelease: (e) => {
      const cb = pickRef.current;
      if(!cb) return;
      const { locationX:sx, locationY:sy } = e.nativeEvent;
      let bestA=null, dA=Infinity;
      for(const a of mol.atoms){
        const p = at(a.id);
        const r = (a.el && a.el!=="C") || showCarbons
          ? Math.max(18, labelWidth(a.el||"C", 0, 14)/2 + 5) : 18;
        const d = Math.hypot(sx-p.x, sy-p.y) - r;
        if(d<dA){ dA=d; bestA=a; }
      }
      if(bestA && dA<=0){ tap(); cb(bestA.id); return; }
      let bestB=null, dB=Infinity;
      for(const raw of mol.bonds){
        const b = Array.isArray(raw) ? { a:raw[0], b:raw[1] } : raw;
        const A=at(b.a), B=at(b.b);
        if(!A||!B) continue;
        const d = pointToSegment(sx,sy,A.x,A.y,B.x,B.y);
        if(d<dB){ dB=d; bestB=b; }
      }
      if(bestB && dB<=20){ tap(); cb(bestB.a, bestB.b); }
    },
  })).current;
  const pickRef = useRef(null); pickRef.current = onPickAtom;

  return (
    <View style={{ width, height:h }} {...(onPickAtom ? touch.panHandlers : {})}>
    <Svg width={width} height={h}>
      {mol.bonds.map((raw,i)=>{
        const b = Array.isArray(raw) ? { a:raw[0], b:raw[1], order:raw[2], stereo:null } : raw;
        const A=at(b.a), B=at(b.b);
        if(!A||!B) return null;
        const hot = highlight && highlight.has(b.a) && highlight.has(b.b);
        return <BondShape key={i} b={b} A={A} B={B} hydrogens={hLoad} hot={hot}
          sideHint={b.order===2 ? bondSideHint(b, mol.atoms,
            mol.bonds.map(z=>Array.isArray(z)?{a:z[0],b:z[1],order:z[2]}:z)) : 1}
          showCarbons={showCarbons} atById={rawAt} scale={0.9}/>;
      })}
      {locants && mol.atoms.map(a=>{
        const loc = locants[a.id];
        if(loc===undefined) return null;
        const p=at(a.id);
        return <SvgText key={"n"+a.id} x={p.x-13} y={p.y-11} fontSize={10}
          fontWeight="700" fontFamily={STRUCT_FONT} fill={C.blue}
          textAnchor="middle">{String(loc)}</SvgText>;
      })}
      {mol.atoms.map(a=>{
        const over=(load[a.id]||0) > (LIMIT[a.el||"C"] ?? 4);
        const hotA = highlight && highlight.has(a.id);
        /* An atom with no bonds has nothing to draw in skeletal notation, so a
           lone carbon rendered as an empty box — which is how methane came to
           appear as a question with no structure. Always label it. */
        const lone = !mol.bonds.some(b => b.a===a.id || b.b===a.id);
        /* labelOnly converts the drawing a carbon at a time: an atom outside
           the set keeps its skeletal appearance even while showCarbons is on. */
        const writeThis = showCarbons && labelsThisAtom(a.id);
        if(isC(a) && !writeThis && !over && !hotA && !lone) return null;
        const p=at(a.id);
        const nH=hLoad[a.id];
        const hot = highlight && highlight.has(a.id);
        return (
          <G key={a.id}>
            {hot && <Circle cx={p.x} cy={p.y} r={15} fill={C.surf2} stroke={C.blue} strokeWidth={2}/>}
            {over && <Circle cx={p.x} cy={p.y} r={15} fill="#FFE9E9" stroke={C.red} strokeWidth={1.8}/>}
            <AtomLabel x={p.x} y={p.y} el={a.el||"C"}
              /* Skeletal convention hides hydrogens on carbon but shows them on
                 heteroatoms: an alcohol reads OH, an amine NH2. Carbons only
                 show theirs when every atom is being drawn. */
              nH={over ? 0 : (writeThis || lone || (a.el && a.el !== 'C' && a.el !== 'H')) ? nH : 0}
              size={14}
              bg={(over||hot)?"transparent":C.surf}
              fill={over?C.red:hot?C.blue:elColour(a.el)}/>
          </G>
        );
      })}
    </Svg>
    </View>
  );
}

/* The name broken into pieces you can tap. Each piece knows which atoms it
   describes, so touching it lights up that part of the structure. */
