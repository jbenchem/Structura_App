// ─────────────────────────────────────────────────────────────
// Graph layout — carried over from the prototype App.js verbatim.
//
// All of these take and return a graph; none of them touch React.
// `tidy` + `snapToLattice` + `repairStereo` are the Clean feature:
// tidy re-lays the structure, snapToLattice rounds bond directions
// onto the 45° grid, and repairStereo puts back any configuration
// the move would otherwise have inverted. snapToLattice keeps its
// result only if the molecule still names the same, so tidying can
// never trade a correct drawing for a neat one.
//
// Verified by tests/sandbox-layout.test.mjs.
// ─────────────────────────────────────────────────────────────

import { nameGraph } from '../engine/index.js';
import { BOND, dist, snap30 } from './constants';

export function chainAlong(graph, from, dx, dy, startId){
  const atoms = graph.atoms.map(a=>({...a}));
  const bonds = graph.bonds.map(b=>({...b}));
  const dist0 = Math.hypot(dx,dy);
  const count = Math.max(1, Math.min(20, Math.round(dist0/BOND)));
  let dir = snap30(Math.atan2(dy,dx));
  let nextId = atoms.length ? Math.max(...atoms.map(a=>a.id))+1 : 1;
  let prev = startId;
  let px = from.x, py = from.y;
  const made = [];
  for(let i=0;i<count;i++){
    const t = dir + (i%2 ? -1 : 1)*(Math.PI/6);
    px = Math.round(px + BOND*Math.cos(t));
    py = Math.round(py + BOND*Math.sin(t));
    atoms.push({ id:nextId, x:px, y:py });
    if(prev!=null) bonds.push({ a:prev, b:nextId, order:1, stereo:null });
    prev = nextId; made.push(nextId); nextId++;
  }
  return { atoms, bonds, count, lastId:prev, made };
}


export function makeRing(graph, tpl, anchorId, bondSel, spiro, at){
  const atoms = graph.atoms.map(a=>({...a}));
  const bonds = graph.bonds.map(b=>({...b}));
  const n = tpl.n;
  const R = BOND/(2*Math.sin(Math.PI/n));
  let nextId = atoms.length ? Math.max(...atoms.map(a=>a.id))+1 : 1;

  const clearance = (cx,cy,skip) => {
    let worst = Infinity;
    for(const p of atoms){
      if(skip && skip.includes(p.id)) continue;
      worst = Math.min(worst, Math.hypot(p.x-cx, p.y-cy));
    }
    return worst;
  };
  const closeRing = ids => {
    for(let i=0;i<ids.length;i++){
      const p=ids[i], q=ids[(i+1)%ids.length];
      if(bonds.some(b=>(b.a===p&&b.b===q)||(b.a===q&&b.b===p))) continue;
      bonds.push({ a:p, b:q, order: tpl.aromatic ? (i%2===0?2:1) : 1, stereo:null });
    }
  };

  /* Fusing an aromatic ring onto another breaks the alternation, because the
     shared bond already carries a double bond. Re-solve the whole fused ring
     system so every atom in it ends up with exactly one double bond. */
  const rekekulize = seedIds => {
    /* a bond lies in a ring when its endpoints stay connected without it */
    const connected = (from, to, skip) => {
      const seen=new Set([from]), st=[from];
      while(st.length){
        const v=st.pop();
        if(v===to) return true;
        for(const b of bonds){
          if(b===skip) continue;
          const w = b.a===v ? b.b : b.b===v ? b.a : null;
          if(w===null || seen.has(w)) continue;
          seen.add(w); st.push(w);
        }
      }
      return false;
    };
    const ringBonds = bonds.filter(b=>connected(b.a, b.b, b));
    /* the ring system reachable from the new ring, through ring bonds only */
    const set = new Set(seedIds);
    let grew = true;
    while(grew){
      grew = false;
      for(const b of ringBonds){
        if(set.has(b.a) && !set.has(b.b)){ set.add(b.b); grew=true; }
        else if(set.has(b.b) && !set.has(b.a)){ set.add(b.a); grew=true; }
      }
    }
    const inner = ringBonds.filter(b=>set.has(b.a) && set.has(b.b));
    const before = inner.map(b=>b.order);
    inner.forEach(b=>{ b.order=1; });
    const deg = {}; set.forEach(id=>{ deg[id]=0; });
    /* also count double bonds this system already has to the outside */
    for(const b of bonds){
      if(inner.includes(b) || b.order!==2) continue;
      if(set.has(b.a)) deg[b.a]=1;
      if(set.has(b.b)) deg[b.b]=1;
    }
    const solve = k => {
      if(k===inner.length) return [...set].every(id=>deg[id]===1);
      const b = inner[k];
      if(!deg[b.a] && !deg[b.b]){
        deg[b.a]=1; deg[b.b]=1; b.order=2;
        if(solve(k+1)) return true;
        deg[b.a]=0; deg[b.b]=0; b.order=1;
      }
      return solve(k+1);
    };
    if(!solve(0)) inner.forEach((b,i)=>{ b.order=before[i]; });   /* leave as found */
  };

  /* ---- fuse along an existing bond ---- */
  if(bondSel){
    const A = atoms.find(a=>a.id===bondSel.a), B = atoms.find(a=>a.id===bondSel.b);
    if(A && B){
      const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
      const ang=Math.atan2(B.y-A.y, B.x-A.x);
      const L=Math.hypot(B.x-A.x, B.y-A.y) || BOND;
      const Rn=L/(2*Math.sin(Math.PI/n));
      const h=Math.sqrt(Math.max(Rn*Rn-(L/2)*(L/2),1));
      const opt=[{x:mx+Math.cos(ang+Math.PI/2)*h, y:my+Math.sin(ang+Math.PI/2)*h},
                 {x:mx+Math.cos(ang-Math.PI/2)*h, y:my+Math.sin(ang-Math.PI/2)*h}];
      const c = clearance(opt[0].x,opt[0].y,[A.id,B.id]) >= clearance(opt[1].x,opt[1].y,[A.id,B.id])
        ? opt[0] : opt[1];
      const start = Math.atan2(A.y-c.y, A.x-c.x);
      const dir = ((Math.atan2(B.y-c.y,B.x-c.x)-start+2*Math.PI)%(2*Math.PI)) < Math.PI ? -1 : 1;
      const ids=[A.id];
      for(let k=1;k<n;k++){
        const t=start+dir*k*(2*Math.PI/n);
        const x=Math.round(c.x+Rn*Math.cos(t)), y=Math.round(c.y+Rn*Math.sin(t));
        const near=atoms.find(p=>Math.hypot(p.x-x,p.y-y)<L*0.4);
        if(near){ ids.push(near.id); continue; }
        atoms.push({ id:nextId, x, y }); ids.push(nextId); nextId++;
      }
      closeRing(ids);
      if(tpl.aromatic) rekekulize(ids);
      return { atoms, bonds, newId:ids[Math.min(2,ids.length-1)] };
    }
  }

  const anchor = anchorId!=null ? atoms.find(a=>a.id===anchorId) : null;

  /* ---- share the anchor atom: spiro ---- */
  if(anchor && spiro){
    const nb = bonds.filter(b=>b.a===anchor.id||b.b===anchor.id)
      .map(b=>atoms.find(x=>x.id===(b.a===anchor.id?b.b:b.a))).filter(Boolean);
    let out=-Math.PI/2;
    if(nb.length){
      let sx=0, sy=0; nb.forEach(p=>{ sx+=p.x-anchor.x; sy+=p.y-anchor.y; });
      out=Math.atan2(-sy,-sx);
    }
    const cx=anchor.x+R*Math.cos(out), cy=anchor.y+R*Math.sin(out);
    const start=Math.atan2(anchor.y-cy, anchor.x-cx);
    const ids=[anchor.id];
    for(let k=1;k<n;k++){
      const t=start+k*(2*Math.PI/n);
      atoms.push({ id:nextId, x:Math.round(cx+R*Math.cos(t)), y:Math.round(cy+R*Math.sin(t)) });
      ids.push(nextId); nextId++;
    }
    closeRing(ids);
    return { atoms, bonds, newId:ids[1] };
  }

  /* ---- hang the ring off the anchor by a new bond ---- */
  if(anchor){
    let out=-Math.PI/2, best=-1;
    for(let k=0;k<24;k++){
      const t=k*Math.PI/12;
      const cx=anchor.x+(BOND+R)*Math.cos(t), cy=anchor.y+(BOND+R)*Math.sin(t);
      const cl=clearance(cx,cy,[anchor.id]);
      if(cl>best){ best=cl; out=t; }
    }
    const jx=anchor.x+BOND*Math.cos(out), jy=anchor.y+BOND*Math.sin(out);
    const cx=anchor.x+(BOND+R)*Math.cos(out), cy=anchor.y+(BOND+R)*Math.sin(out);
    const start=Math.atan2(jy-cy, jx-cx);
    const ids=[];
    for(let k=0;k<n;k++){
      const t=start+k*(2*Math.PI/n);
      atoms.push({ id:nextId, x:Math.round(cx+R*Math.cos(t)), y:Math.round(cy+R*Math.sin(t)) });
      ids.push(nextId); nextId++;
    }
    closeRing(ids);
    bonds.push({ a:anchor.id, b:ids[0], order:1, stereo:null });
    return { atoms, bonds, newId:ids[0] };
  }

  /* ---- standalone, where the click landed ---- */
  const cx = at ? at.x : 170, cy = at ? at.y : 160;
  const ids=[];
  for(let i=0;i<n;i++){
    const t=Math.PI*2*i/n - Math.PI/2;
    atoms.push({ id:nextId, x:Math.round(cx+R*Math.cos(t)), y:Math.round(cy+R*Math.sin(t)) });
    ids.push(nextId); nextId++;
  }
  closeRing(ids);
  return { atoms, bonds, newId:ids[0] };
}

/* ================= geometry ================= */

export function pointToSegment(px,py,x1,y1,x2,y2){
  const dx=x2-x1, dy=y2-y1;
  const L2 = dx*dx+dy*dy || 1;
  let t = ((px-x1)*dx + (py-y1)*dy) / L2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1+dx*t, y1+dy*t);
}

export function nextPosition(g, from){
  const nbrs = g.bonds
    .filter(b => b.a===from.id || b.b===from.id)
    .map(b => g.atoms.find(a => a.id === (b.a===from.id ? b.b : b.a)))
    .filter(Boolean);
  let ang = -Math.PI/6;
  if(nbrs.length === 1){
    const inAng = Math.atan2(nbrs[0].y-from.y, nbrs[0].x-from.x);
    const optA = inAng + 2*Math.PI/3, optB = inAng - 2*Math.PI/3;
    ang = Math.cos(optA) > Math.cos(optB) ? optA : optB;
  } else if(nbrs.length > 1){
    let sx=0, sy=0;
    nbrs.forEach(n => { sx += n.x-from.x; sy += n.y-from.y; });
    ang = Math.atan2(-sy, -sx);
  }
  ang = snap30(ang);
  for(let k=0;k<12;k++){
    const x = Math.round(from.x + BOND*Math.cos(ang));
    const y = Math.round(from.y + BOND*Math.sin(ang));
    if(!g.atoms.some(a => dist(x,y,a.x,a.y) < BOND*0.6)) return { x, y };
    ang += Math.PI/6;
  }
  return { x: Math.round(from.x + BOND*Math.cos(ang)),
           y: Math.round(from.y + BOND*Math.sin(ang)) };
}


export const bondLoad = bonds => {
  const load={};
  bonds.forEach(raw=>{
    const a=Array.isArray(raw)?raw[0]:raw.a, b=Array.isArray(raw)?raw[1]:raw.b;
    const o=Array.isArray(raw)?raw[2]:(raw.order||1);
    load[a]=(load[a]||0)+o; load[b]=(load[b]||0)+o;
  });
  return load;
};

/* ================= layout tidier =================
   Re-lays the whole structure on a clean 30-degree lattice: rings become
   regular polygons, chains zigzag, and every bond ends up the same length. */

export function tidy(graph){
  const { atoms, bonds } = graph;
  if(atoms.length<2) return graph;
  const L = BOND;
  const D45 = Math.PI/4;
  const nb = id => bonds.filter(b=>b.a===id||b.b===id).map(b => b.a===id ? b.b : b.a);

  /* ---------- find rings so they can be drawn as regular polygons ---------- */
  const rings = [];
  const seenRing = new Set();
  for(const b of bonds){
    const prev = new Map([[b.a,null]]);
    const q=[b.a]; let hit=false;
    while(q.length && !hit){
      const v=q.shift();
      for(const w of nb(v)){
        if(v===b.a && w===b.b) continue;
        if(prev.has(w)) continue;
        prev.set(w,v);
        if(w===b.b){ hit=true; break; }
        q.push(w);
      }
    }
    if(!prev.has(b.b)) continue;
    const cyc=[]; let c=b.b;
    while(c!==null){ cyc.push(c); c=prev.get(c); }
    if(cyc.length<3 || cyc.length>8) continue;
    const key=[...cyc].sort((x,y)=>x-y).join(",");
    if(seenRing.has(key)) continue;
    seenRing.add(key); rings.push(cyc);
  }
  rings.sort((x,y)=>x.length-y.length);
  const ringAtoms = new Set(rings.flat());

  /* ---------- the parent chain: longest path avoiding rings ---------- */
  const chainAtoms = atoms.map(a=>a.id).filter(id=>!ringAtoms.has(id));
  let parent = [];
  if(chainAtoms.length){
    const inChain = new Set(chainAtoms);
    const far = (from) => {
      const dist=new Map([[from,0]]), prev=new Map([[from,null]]), q=[from];
      while(q.length){
        const v=q.shift();
        for(const w of nb(v)){
          if(!inChain.has(w) || dist.has(w)) continue;
          dist.set(w, dist.get(v)+1); prev.set(w,v); q.push(w);
        }
      }
      let best=from;
      for(const [id,d] of dist) if(d>dist.get(best)) best=id;
      const path=[]; let c=best;
      while(c!==null && c!==undefined){ path.push(c); c=prev.get(c); }
      return { end:best, path };
    };
    const a1 = far(chainAtoms[0]).end;
    parent = far(a1).path;
  }

  /* An atom in more than one ring means a fused, bridged or spiro system.
     Those already have good geometry and re-laying them as separate polygons
     would stack rings on top of each other, so keep them exactly as drawn and
     tidy only what hangs off them. */
  const ringCount = {};
  for(const r of rings) for(const id of r) ringCount[id]=(ringCount[id]||0)+1;
  const polycyclic = Object.values(ringCount).some(c=>c>1);

  const pos = new Map();
  /* A bridged or fused cage cannot be re-laid as separate regular polygons:
     the overlapping cycles a ring finder returns would end up stacked on each
     other. Its geometry is already sound, so keep it and let Clean recentre. */
  if(polycyclic)
    return snapToLattice(repairStereo(graph, { atoms:atoms.map(a=>({...a})),
                                               bonds:bonds.map(b=>({...b})) }));


  /* Rings anchor the drawing when there are any; otherwise the parent chain
     runs horizontally, zigzagging at 45 degrees. */
  const dx = L*Math.cos(D45), dy = L*Math.sin(D45);
  /* Lay the parent chain first whenever there is one worth laying. Placing
     rings first and then threading the chain between them is what made a long
     chain with several rings on it snake across the drawing. */
  if(!polycyclic && (!rings.length || parent.length>=3)){
    parent.forEach((id,i)=>{
      pos.set(id, { x: i*dx, y: (i%2 ? -dy : 0) });
    });
  }

  /* ---------- rings as regular polygons ---------- */
  /* Place a ring as a regular polygon. Candidate positions are scored on the
     clearance of EVERY vertex, not just the centre: a hexagon can sit well
     clear by its centre and still have its corners inside another ring, which
     is how rings used to end up drawn one inside the other. */
  let ringSide = 0;
  const ringVerts = (cx, cy, R, n, rot) =>
    Array.from({length:n},(_,i)=>({
      x: cx + R*Math.cos(rot + i*(2*Math.PI/n)),
      y: cy + R*Math.sin(rot + i*(2*Math.PI/n)),
    }));
  const vertScore = (verts, exempt) => {
    let worst = Infinity;
    for(const v of verts)
      for(const [id,p] of pos){
        if(exempt && exempt.includes(id)) continue;
        worst = Math.min(worst, Math.hypot(p.x-v.x, p.y-v.y));
      }
    return worst;
  };

  const placeRing = ring => {
    const n = ring.length;
    const R = L/(2*Math.sin(Math.PI/n));
    const placed = ring.filter(id=>pos.has(id));

    /* two atoms already down: the ring is fused along that bond */
    if(placed.length>=2){
      const p0=pos.get(placed[0]), p1=pos.get(placed[1]);
      const mx=(p0.x+p1.x)/2, my=(p0.y+p1.y)/2;
      const ang=Math.atan2(p1.y-p0.y, p1.x-p0.x);
      const h=Math.sqrt(Math.max(R*R-(L/2)*(L/2),1));
      let best=null;
      for(const s of [1,-1]){
        const cx=mx+Math.cos(ang+s*Math.PI/2)*h, cy=my+Math.sin(ang+s*Math.PI/2)*h;
        const rot=Math.atan2(p0.y-cy,p0.x-cx)-ring.indexOf(placed[0])*(2*Math.PI/n);
        const sc=vertScore(ringVerts(cx,cy,R,n,rot), placed);
        if(!best || sc>best.sc) best={ cx, cy, rot, sc };
      }
      ring.forEach((id,i)=>{
        if(pos.has(id)) return;
        const t=best.rot+i*(2*Math.PI/n);
        pos.set(id,{ x:best.cx+R*Math.cos(t), y:best.cy+R*Math.sin(t) });
      });
      return;
    }

    /* one atom down: spiro, so the ring turns about that atom */
    if(placed.length===1){
      const p0=pos.get(placed[0]);
      let best=null;
      for(let k=0;k<8;k++){
        const t=k*D45;
        const cx=p0.x+R*Math.cos(t), cy=p0.y+R*Math.sin(t);
        const rot=Math.atan2(p0.y-cy,p0.x-cx)-ring.indexOf(placed[0])*(2*Math.PI/n);
        const sc=vertScore(ringVerts(cx,cy,R,n,rot), [placed[0]]);
        if(!best || sc>best.sc) best={ cx, cy, rot, sc };
      }
      ring.forEach((id,i)=>{
        if(pos.has(id)) return;
        const t=best.rot+i*(2*Math.PI/n);
        pos.set(id,{ x:best.cx+R*Math.cos(t), y:best.cy+R*Math.sin(t) });
      });
      return;
    }

    /* nothing of this ring is down. If one of its atoms is bonded to something
       already placed, grow outward from there; otherwise start at the origin. */
    let anchorIn=null, anchorOut=null;
    for(const id of ring){
      const link = nb(id).find(w=>pos.has(w));
      if(link!==undefined){ anchorIn=id; anchorOut=link; break; }
    }
    if(anchorIn===null){
      if(!pos.size){
        const rot=-Math.PI/2;
        ring.forEach((id,i)=>pos.set(id,{ x:R*Math.cos(rot+i*(2*Math.PI/n)),
                                          y:R*Math.sin(rot+i*(2*Math.PI/n)) }));
        return;
      }
      /* disconnected: park it clear of everything already drawn */
      const xs=[...pos.values()].map(p=>p.x);
      const cx=Math.max(...xs)+L*2+R, cy=0, rot=-Math.PI/2;
      ring.forEach((id,i)=>pos.set(id,{ x:cx+R*Math.cos(rot+i*(2*Math.PI/n)),
                                        y:cy+R*Math.sin(rot+i*(2*Math.PI/n)) }));
      return;
    }
    const p=pos.get(anchorOut);
    let best=null;
    /* directions already used at the atom the ring will hang from: the ring
       must not head straight back along one of them, or the chain and the ring
       bond come out as one straight line through a two-bond carbon */
    const usedAt = nb(anchorOut).filter(w=>pos.has(w)).map(w=>{
      const q = pos.get(w);
      return Math.atan2(q.y-p.y, q.x-p.x);
    });
    const sepA = (x,y) => { let d=Math.abs(x-y)%(2*Math.PI); return d>Math.PI?2*Math.PI-d:d; };
    const flatAt = t => usedAt.some(u => sepA(t,u) > Math.PI-0.35);

    /* Try the 45 degree lattice first, then finer angles, and only as a last
       resort a direction that lies straight back along an existing bond. Each
       group is exhausted before the next is considered, so a straight-through
       vertex can never simply outscore a proper one. */
    const groups = [
      { dirs:Array.from({length:8},(_,k)=>k*D45),        lattice:true,  allowFlat:false },
      { dirs:Array.from({length:24},(_,k)=>k*Math.PI/12),lattice:false, allowFlat:false },
      { dirs:Array.from({length:8},(_,k)=>k*D45),        lattice:true,  allowFlat:true  },
    ];
    for(const grp of groups){
      for(const t of grp.dirs){
        if(!grp.allowFlat && flatAt(t)) continue;
        const ax=p.x+L*Math.cos(t), ay=p.y+L*Math.sin(t);    /* where anchorIn goes */
        const cx=p.x+(L+R)*Math.cos(t), cy=p.y+(L+R)*Math.sin(t);
        const rot=Math.atan2(ay-cy, ax-cx)-ring.indexOf(anchorIn)*(2*Math.PI/n);
        let sc=vertScore(ringVerts(cx,cy,R,n,rot), [anchorOut]);
        /* prefer straight up or down off a chain, and alternate sides so a run
           of rings fans out instead of piling up */
        sc += Math.abs(Math.sin(t))*L*0.35;
        if(Math.sign(Math.sin(t)) === (ringSide%2 ? -1 : 1)) sc += L*0.25;
        if(!best || sc>best.sc) best={ cx, cy, rot, sc, ax, ay };
      }
      if(best) break;
    }
    ringSide++;
    pos.set(anchorIn,{ x:best.ax, y:best.ay });
    ring.forEach((id,i)=>{
      if(pos.has(id)) return;
      const t=best.rot+i*(2*Math.PI/n);
      pos.set(id,{ x:best.cx+R*Math.cos(t), y:best.cy+R*Math.sin(t) });
    });
  };

  for(let pass=0; pass<3; pass++)
      for(const r of rings)
        if(r.some(id=>!pos.has(id))) placeRing(r);

  /* ---------- everything else: branch outward at 45 degree steps ---------- */
  const free = (from, avoidDirs) => {
    const base = pos.get(from);
    const taken = nb(from).filter(w=>pos.has(w)).map(w=>{
      const p=pos.get(w);
      return Math.atan2(p.y-base.y, p.x-base.x);
    }).concat(avoidDirs||[]);
    const sep=(x,y)=>{ let d=Math.abs(x-y)%(2*Math.PI); return d>Math.PI?2*Math.PI-d:d; };
    /* 45 degrees first, then progressively finer, and score on how far the
       new atom lands from everything already down rather than only rejecting
       outright collisions */
    /* Clean resets bond angles to the standard lattice. Aim for a bend of
       about 135 degrees, the lattice angle closest to a real carbon: simply
       maximising the separation would choose 180 and draw two consecutive
       bonds as one straight line, which never happens in a real structure. */
    const IDEAL = 3*Math.PI/4;
    const STRAIGHT = Math.PI - 0.35;          /* anything this flat is rejected */
    for(const pass of [
      { step:D45,          minClear:L*0.75, minSep:0.7, noFlat:true  },
      { step:D45,          minClear:L*0.55, minSep:0.6, noFlat:true  },
      { step:D45,          minClear:L*0.55, minSep:0.6, noFlat:false },
      { step:Math.PI/12,   minClear:L*0.70, minSep:0.7, noFlat:true  },
      { step:Math.PI/24,   minClear:L*0.55, minSep:0.6, noFlat:false },
    ]){
      let best=null, bestScore=-Infinity;
      const n = Math.round(2*Math.PI/pass.step);
      for(let k=0;k<n;k++){
        const cand = k*pass.step;
        const x=base.x+L*Math.cos(cand), y=base.y+L*Math.sin(cand);
        let clear = Infinity;
        for(const p of pos.values()) clear = Math.min(clear, Math.hypot(p.x-x, p.y-y));
        if(clear < pass.minClear) continue;
        const worst = taken.length ? Math.min(...taken.map(t=>sep(cand,t))) : Math.PI;
        if(worst < pass.minSep) continue;
        /* never leave two bonds at this atom lying in a straight line */
        if(pass.noFlat && taken.some(t=>sep(cand,t) > STRAIGHT)) continue;
        const score = -Math.abs(worst - IDEAL)/Math.PI + clear/(L*4);
        if(score > bestScore){ bestScore=score; best=cand; }
      }
      if(best!==null) return best;
    }
    return null;
  };
  const q=[...pos.keys()], seen=new Set(q);
  while(q.length){
    const v=q.shift();
    for(const w of nb(v)){
      if(pos.has(w)){ if(!seen.has(w)){ seen.add(w); q.push(w); } continue; }
      const ang = free(v);
      const base = pos.get(v);
      const t = ang===null ? -Math.PI/4 : ang;
      pos.set(w, { x:base.x+L*Math.cos(t), y:base.y+L*Math.sin(t) });
      seen.add(w); q.push(w);
    }
  }
  for(const a of atoms) if(!pos.has(a.id)) pos.set(a.id, { x:a.x, y:a.y });

  /* ---------- centre ---------- */
  const xs=[...pos.values()].map(p=>p.x), ys=[...pos.values()].map(p=>p.y);
  const ox=150-(Math.min(...xs)+Math.max(...xs))/2;
  const oy=150-(Math.min(...ys)+Math.max(...ys))/2;
  let out = {
    atoms: atoms.map(a=>{
      const p=pos.get(a.id);
      return p ? { ...a, x:Math.round(p.x+ox), y:Math.round(p.y+oy) } : a;
    }),
    bonds: bonds.map(b=>({ ...b })),
  };

  /* Re-laying the atoms can invert a stereocentre or flip a double bond,
     because both are read from geometry. Repair anything that moved, then put
     the bond angles back on the lattice. */
  out = repairStereo(graph, out);
  out = snapToLattice(out);
  return out;
}

/* Put every non-ring bond back on the 45 degree lattice. Repairing a cis
   double bond mirrors atoms across the bond axis, which lands them off the
   grid; this walks the structure and rounds each bond direction back onto it.
   The result is kept only if the molecule still reads the same, so tidying can
   never trade a correct drawing for a neat one. */

export function snapToLattice(graph){
  const before = nameGraph(graph);
  if(!before.ok) return graph;
  const D = Math.PI/4;
  const nb = id => graph.bonds.filter(b=>b.a===id||b.b===id)
    .map(b => b.a===id ? b.b : b.a);

  /* ring bonds keep their polygon angles */
  const ringAtoms = new Set();
  for(const b of graph.bonds){
    const prev=new Map([[b.a,null]]); const q=[b.a]; let hit=false;
    while(q.length && !hit){
      const v=q.shift();
      for(const x of graph.bonds){
        if(x===b) continue;
        const w = x.a===v ? x.b : x.b===v ? x.a : null;
        if(w===null || prev.has(w)) continue;
        prev.set(w,v);
        if(w===b.b){ hit=true; break; }
        q.push(w);
      }
    }
    if(hit){ ringAtoms.add(b.a); ringAtoms.add(b.b); }
  }

  const out = { atoms:graph.atoms.map(a=>({...a})), bonds:graph.bonds.map(b=>({...b})) };
  const at = id => out.atoms.find(a=>a.id===id);
  const done = new Set();
  const root = out.atoms[0];
  if(!root) return graph;
  done.add(root.id);
  const queue = [root.id];
  while(queue.length){
    const v = queue.shift();
    const A = at(v);
    for(const w of nb(v)){
      if(done.has(w)) continue;
      done.add(w); queue.push(w);
      if(ringAtoms.has(v) && ringAtoms.has(w)) continue;   /* leave rings alone */
      const B = at(w);
      const ang = Math.atan2(B.y-A.y, B.x-A.x);
      const snapped = Math.round(ang/D)*D;
      const dx = BOND*Math.cos(snapped) - (B.x-A.x);
      const dy = BOND*Math.sin(snapped) - (B.y-A.y);
      if(!dx && !dy) continue;
      /* move the whole branch so its internal shape is preserved */
      const seen=new Set([v, w]), st=[w];
      while(st.length){
        const u=st.pop();
        for(const t of nb(u)) if(!seen.has(t)){ seen.add(t); st.push(t); }
      }
      seen.delete(v);
      for(const id of seen){ const p=at(id); p.x=Math.round(p.x+dx); p.y=Math.round(p.y+dy); }
    }
  }
  const after = nameGraph(out);
  return (after.ok && after.name===before.name) ? out : graph;
}


export function repairStereo(before, after){
  const b0 = nameGraph(before), a0 = nameGraph(after);
  if(!b0.ok || !a0.ok || !b0.stereo || !a0.stereo) return after;

  /* --- double bonds: mirror one side back across the bond axis --- */
  for(const d0 of b0.stereo.doubles){
    if(!d0.config) continue;
    const now = nameGraph(after).stereo.doubles
      .find(x => (x.a===d0.a && x.b===d0.b) || (x.a===d0.b && x.b===d0.a));
    if(!now || !now.config || now.config===d0.config) continue;
    const A=after.atoms.find(p=>p.id===d0.a), B=after.atoms.find(p=>p.id===d0.b);
    if(!A||!B) continue;
    const ax=B.x-A.x, ay=B.y-A.y, L2=ax*ax+ay*ay||1;
    const seen=new Set([d0.a,d0.b]), stack=[d0.b], move=[];
    while(stack.length){
      const v=stack.pop();
      for(const bd of after.bonds){
        const t = bd.a===v?bd.b : bd.b===v?bd.a : null;
        if(t===null||seen.has(t)) continue;
        seen.add(t); move.push(t); stack.push(t);
      }
    }
    for(const id of move){
      const p=after.atoms.find(z=>z.id===id);
      const dx=p.x-A.x, dy=p.y-A.y;
      const t=(dx*ax+dy*ay)/L2;
      const px=A.x+ax*t, py=A.y+ay*t;
      p.x=Math.round(2*px-p.x); p.y=Math.round(2*py-p.y);
    }
  }

  /* --- stereocentres: swapping wedge for dash inverts the configuration --- */
  for(const c0 of b0.stereo.centres){
    if(!c0.config) continue;
    const nowAll = nameGraph(after).stereo.centres;
    const now = nowAll.find(x=>x.atom===c0.atom);
    if(!now || !now.config || now.config===c0.config) continue;
    const bd = after.bonds.find(b=>(b.a===c0.atom||b.b===c0.atom) && b.stereo);
    if(!bd) continue;
    bd.stereo = bd.stereo==="wedge" ? "dash" : "wedge";
  }
  return after;
}

/* ================= shared bond/atom drawing ================= */
