/* ================================================================
   STRUCTURA ENGINE v4 — CORE
   ----------------------------------------------------------------
   Rebuilt from scratch. Design goals that differ from v3:
     - a general molecular graph from the start; rings are not a
       special case bolted onto chain logic
     - stereochemistry in the data model from day one
       (wedge/dash bonds -> R/S; double-bond geometry -> E/Z)
     - functional groups perceived by pattern, not hard-coded per element

   GRAPH FORMAT
     atoms: [{ id, x, y, el? }]        el omitted => carbon
     bonds: [{ a, b, order, stereo? }] stereo: "wedge" | "dash" (narrow
                                       end at a, pointing toward/away
                                       from the viewer)
   Legacy array bonds [a,b,order] are accepted and normalised.
   ================================================================ */

/* ---------------- element data ---------------- */
export const Z = { H:1, C:6, N:7, O:8, F:9, P:15, S:16, Cl:17, Br:35, I:53 };
export const VALENCE = { C:4, N:3, O:2, S:2, F:1, Cl:1, Br:1, I:1, H:1 };
export const MASS = { H:1.008, C:12.011, N:14.007, O:15.999, F:18.998,
                      P:30.974, S:32.06, Cl:35.45, Br:79.904, I:126.904 };

/* group shorthand the drawing canvas may emit */
export const GROUP_SUGAR = {
  OH:  { el:"O", h:1 },
  NH2: { el:"N", h:2 },
  NO2: { el:"N", pseudo:"nitro" },
  CHO: { el:"C", pseudo:"formyl" },
  COOH:{ el:"C", pseudo:"carboxy" },
};

export const ROOT = ["","meth","eth","prop","but","pent","hex","hept","oct","non","dec",
                     "undec","dodec","tridec","tetradec","pentadec","hexadec","heptadec",
                     "octadec","nonadec","icos","henicos","docos","tricos","tetracos",
                     "pentacos","hexacos","heptacos","octacos","nonacos","triacont"];
export const MULT = ["","","di","tri","tetra","penta","hexa","hepta"];
export const HALO = { F:"fluoro", Cl:"chloro", Br:"bromo", I:"iodo" };
export const HALO_INV = { fluoro:"F", chloro:"Cl", bromo:"Br", iodo:"I" };

/* ---------------- normalisation ---------------- */
export function normalise(graph){
  const atoms = (graph.atoms||[]).map(a=>({
    id: a.id,
    x: a.x ?? 0,
    y: a.y ?? 0,
    el: (!a.el || a.el==="C") ? "C" : a.el,
  }));
  const bonds = (graph.bonds||[]).map(b=>Array.isArray(b)
    ? { a:b[0], b:b[1], order:b[2]||1, stereo:null }
    : { a:b.a, b:b.b, order:b.order||1, stereo:b.stereo||null });
  return { atoms, bonds };
}

/* Expand group sugar (OH, NH2, NO2) into real atoms so the rest of the
   engine only ever sees elements. Returns { atoms, bonds, sugarOf } where
   sugarOf maps a new atom id back to the sugar label for re-rendering. */
export function expandSugar(g){
  const atoms=[], bonds=[...g.bonds], sugarOf={};
  /* Ids for the atoms this creates must not collide with the existing ones,
     whatever type those are.

     `Math.max(0, ...ids) + 1` works only when every id is a number. The
     drawing canvas uses string ids like "k7", and Math.max then returns NaN —
     so both oxygens of a nitro group received the same id, collapsed into one
     atom carrying three bonds, and the engine rejected a perfectly valid
     structure with a valence error. A nitro group drawn on the canvas could
     never be named.

     Numeric ids keep their previous numbering exactly; anything else falls
     back to counting from 1 and skipping whatever is taken. */
  const taken = new Set(g.atoms.map(a=>a.id));
  const numeric = g.atoms.map(a=>a.id).filter(id=>typeof id==="number");
  let nextId = numeric.length ? Math.max(...numeric) + 1 : 1;
  const freshId = () => {
    while(taken.has(nextId)) nextId++;
    taken.add(nextId);
    return nextId++;
  };
  for(const a of g.atoms){
    const sug = GROUP_SUGAR[a.el];
    if(!sug){ atoms.push({...a}); continue; }
    if(sug.pseudo==="nitro"){
      atoms.push({ id:a.id, x:a.x, y:a.y, el:"N", nitro:true });
      sugarOf[a.id]="NO2";
      const o1=freshId(), o2=freshId();
      atoms.push({ id:o1, x:a.x+10, y:a.y-8, el:"O", implicit:true });
      atoms.push({ id:o2, x:a.x+10, y:a.y+8, el:"O", implicit:true });
      bonds.push({a:a.id,b:o1,order:2,stereo:null});
      bonds.push({a:a.id,b:o2,order:1,stereo:null});
      continue;
    }
    atoms.push({ id:a.id, x:a.x, y:a.y, el:sug.el });
    sugarOf[a.id]=a.el;
  }
  return { atoms, bonds, sugarOf };
}

/* ---------------- adjacency ---------------- */
export function buildAdj(g){
  const adj = new Map();
  for(const a of g.atoms) adj.set(a.id, []);
  for(const b of g.bonds){
    if(!adj.has(b.a) || !adj.has(b.b)) return { error:"A bond refers to an atom that isn't there." };
    adj.get(b.a).push({ to:b.b, order:b.order, bond:b, rev:false });
    adj.get(b.b).push({ to:b.a, order:b.order, bond:b, rev:true });
  }
  return { adj };
}

export function connectedComponents(g, adj){
  const seen=new Set(), comps=[];
  for(const a of g.atoms){
    if(seen.has(a.id)) continue;
    const comp=[], stack=[a.id]; seen.add(a.id);
    while(stack.length){
      const v=stack.pop(); comp.push(v);
      for(const e of adj.get(v)) if(!seen.has(e.to)){ seen.add(e.to); stack.push(e.to); }
    }
    comps.push(comp);
  }
  return comps;
}

/* ---------------- ring perception (SSSR) ----------------
   Ring count = |E| - |V| + components. For each ring bond we find the
   smallest cycle through it, then greedily keep rings that contribute a
   new edge until the count is met. Good enough for teaching molecules and
   far simpler than a full Horton/Figueras implementation. */
export function findRings(g, adj){
  const V=g.atoms.length, E=g.bonds.length;
  const comps=connectedComponents(g,adj);
  const target = E - V + comps.length;
  if(target<=0) return [];

  const shortestCycleThrough = (u,v) => {
    /* BFS from u to v without using the direct u-v edge */
    const prev=new Map([[u,null]]), q=[u];
    let found=false;
    while(q.length&&!found){
      const cur=q.shift();
      for(const e of adj.get(cur)){
        if(cur===u && e.to===v) continue;      /* skip the closing edge */
        if(prev.has(e.to)) continue;
        prev.set(e.to,cur);
        if(e.to===v){ found=true; break; }
        q.push(e.to);
      }
    }
    if(!prev.has(v)) return null;
    const path=[]; let c=v;
    while(c!==null){ path.push(c); c=prev.get(c); }
    return path;                                /* v ... u  (a full cycle with the u-v edge) */
  };

  const cand=[];
  for(const b of g.bonds){
    const cyc=shortestCycleThrough(b.a,b.b);
    if(cyc) cand.push(cyc);
  }
  cand.sort((p,q)=>p.length-q.length);

  const rings=[], usedEdge=new Set();
  const ekey=(x,y)=>x<y?`${x}|${y}`:`${y}|${x}`;
  const ringKey = r => [...r].sort((a,b)=>a-b).join(",");
  const seenRing=new Set();
  for(const c of cand){
    if(rings.length>=target) break;
    const k=ringKey(c);
    if(seenRing.has(k)) continue;
    let novel=false;
    for(let i=0;i<c.length;i++){
      const kk=ekey(c[i], c[(i+1)%c.length]);
      if(!usedEdge.has(kk)){ novel=true; break; }
    }
    if(!novel) continue;
    seenRing.add(k);
    rings.push(c);
    for(let i=0;i<c.length;i++) usedEdge.add(ekey(c[i], c[(i+1)%c.length]));
  }
  return rings;
}

/* Ring systems = groups of rings sharing at least one atom (fused/spiro/bridged) */
export function ringSystems(rings){
  const sys=[];
  for(const r of rings){
    const set=new Set(r);
    const hits=sys.filter(s=>r.some(a=>s.atoms.has(a)));
    if(hits.length===0){ sys.push({ rings:[r], atoms:set }); continue; }
    const merged={ rings:[r], atoms:new Set(set) };
    for(const h of hits){
      merged.rings.push(...h.rings);
      for(const a of h.atoms) merged.atoms.add(a);
      sys.splice(sys.indexOf(h),1);
    }
    sys.push(merged);
  }
  return sys;
}

/* ---------------- valence validation ---------------- */
export function validate(g, adj){
  if(g.atoms.length===0)
    return { err:"empty", message:"The canvas is empty. Draw a structure, then generate its name." };

  for(const a of g.atoms){
    if(!(a.el in VALENCE))
      return { err:"element", message:`"${a.el}" isn't an element this engine can name. It handles C, H, N, O, S, F, Cl, Br and I.` };
  }

  const comps = connectedComponents(g, adj);
  if(comps.length>1)
    return { err:"disconnected", message:"Some atoms aren't joined to the rest. Connect everything into one structure, then try again." };

  for(const a of g.atoms){
    const used = adj.get(a.id).reduce((s,e)=>s+e.order,0);
    const max = a.nitro ? 4 : VALENCE[a.el];
    if(used>max){
      const name = a.el==="C" ? "A carbon" : `An atom of ${a.el}`;
      return { err:"valence", message:`${name} in this structure has ${used} bonds, but it can only form ${max}. Adjust the bonding and try again.` };
    }
  }
  return null;
}

/* implicit hydrogen count */
export function implicitH(a, adj){
  if(a.implicit) return 0;
  const used = adj.get(a.id).reduce((s,e)=>s+e.order,0);
  const max = a.nitro ? 4 : VALENCE[a.el];
  if(a.nitro) return 0;
  return Math.max(0, max-used);
}

/* ---------------- molecular formula (Hill order) ---------------- */
export function formulaOf(g, adj){
  const count={};
  let nH=0;
  for(const a of g.atoms){
    count[a.el]=(count[a.el]||0)+1;
    nH += implicitH(a, adj);
  }
  count.H=(count.H||0)+nH;
  let f="", m=0;
  const order=["C","H",...Object.keys(count).filter(e=>e!=="C"&&e!=="H").sort()];
  for(const e of order){
    const n=count[e]||0;
    if(!n) continue;
    f += e + (n>1?n:"");
    m += (MASS[e]||0)*n;
  }
  return { formula:f, mass:m.toFixed(2) };
}
