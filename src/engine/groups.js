/* ================================================================
   STRUCTURA ENGINE v4 — GROUP PERCEPTION + CIP
   ================================================================ */
import { Z, HALO } from "./core.js";

/* ---------------- seniority ladder ----------------
   Higher rank = more senior. The principal characteristic group takes
   the suffix; everything below it is cited as a prefix. */
export const GROUPS = {
  acid:    { rank:100, suffix:"oic acid",  prefix:"carboxy",  terminal:true },
  anhyd:   { rank:95,  suffix:"anhydride", prefix:null,       terminal:true },
  ester:   { rank:90,  suffix:"oate",      prefix:"oxycarbonyl", terminal:true },
  acylhal: { rank:85,  suffix:"oyl",       prefix:"halocarbonyl", terminal:true },
  amide:   { rank:80,  suffix:"amide",     prefix:"carbamoyl",terminal:true },
  nitrile: { rank:75,  suffix:"nitrile",   prefix:"cyano",    terminal:true },
  aldehyde:{ rank:70,  suffix:"al",        prefix:"oxo",      terminal:true },
  ketone:  { rank:60,  suffix:"one",       prefix:"oxo",      terminal:false },
  alcohol: { rank:50,  suffix:"ol",        prefix:"hydroxy",  terminal:false },
  thiol:   { rank:45,  suffix:"thiol",     prefix:"sulfanyl", terminal:false },
  amine:   { rank:40,  suffix:"amine",     prefix:"amino",    terminal:false },
};
/* prefix-only groups (never take a suffix) */
export const PREFIX_ONLY = new Set(["halo","nitro","ether"]);

/* ---------------- perception ----------------
   Walks every carbon and classifies the heteroatoms hanging off it.
   Returns a list of group records:
     { kind, at, atoms:[ids consumed], extra }
   `at` is the carbon that carries the group (its locant anchor). */
export function perceiveGroups(g, adj, ringAtoms){
  const byId = new Map(g.atoms.map(a=>[a.id,a]));
  const isC = id => byId.get(id).el==="C";
  const groups = [];
  const consumed = new Set();      /* heteroatoms explained by some group */

  const nbrs = id => adj.get(id);
  const heteroNbrs = id => nbrs(id).filter(e=>!isC(e.to));

  /* --- pass 1: carbon-centred groups --- */
  for(const a of g.atoms){
    if(a.el!=="C") continue;
    const het = heteroNbrs(a.id);
    const carbonylO = het.filter(e=>byId.get(e.to).el==="O" && e.order===2);
    const hydroxylO = het.filter(e=>byId.get(e.to).el==="O" && e.order===1 &&
                                    nbrs(e.to).length===1);
    const bridgeO   = het.filter(e=>byId.get(e.to).el==="O" && e.order===1 &&
                                    nbrs(e.to).length===2);
    const amineN    = het.filter(e=>byId.get(e.to).el==="N" && e.order===1 &&
                                    !byId.get(e.to).nitro &&
                                    nbrs(e.to).filter(x=>isC(x.to)).length>=1 &&
                                    nbrs(e.to).every(x=>x.order===1) &&
                                    !(ringAtoms && ringAtoms.has(e.to)));
    const thiolS    = het.filter(e=>byId.get(e.to).el==="S" && e.order===1 &&
                                    nbrs(e.to).length===1);
    const sulfideS  = het.filter(e=>byId.get(e.to).el==="S" && e.order===1 &&
                                    nbrs(e.to).length===2 &&
                                    !(ringAtoms && ringAtoms.has(e.to)));
    const nitrileN  = het.filter(e=>byId.get(e.to).el==="N" && e.order===3);
    const nitroN    = het.filter(e=>byId.get(e.to).nitro);
    const halos     = het.filter(e=>HALO[byId.get(e.to).el]);

    /* nitrile */
    for(const e of nitrileN){
      groups.push({ kind:"nitrile", at:a.id, atoms:[e.to] });
      consumed.add(e.to);
    }
    /* nitro */
    for(const e of nitroN){
      groups.push({ kind:"nitro", at:a.id, atoms:[e.to] });
      consumed.add(e.to);
    }
    /* halogens */
    for(const e of halos){
      if(carbonylO.length===1) continue;   /* may be an acyl halide, handled below */
      groups.push({ kind:"halo", at:a.id, atoms:[e.to], extra:{ el:byId.get(e.to).el } });
      consumed.add(e.to);
    }

    if(carbonylO.length===1){
      const co = carbonylO[0].to;
      /* carboxylic acid: C(=O)OH */
      if(hydroxylO.length===1){
        groups.push({ kind:"acid", at:a.id, atoms:[co, hydroxylO[0].to] });
        consumed.add(co); consumed.add(hydroxylO[0].to);
        continue;
      }
      /* amide: C(=O)N, possibly N-substituted */
      if(amineN.length===1){
        const nId = amineN[0].to;
        const nSubs = nbrs(nId).filter(x=>isC(x.to) && x.to!==a.id).map(x=>x.to);
        groups.push({ kind:"amide", at:a.id, atoms:[co, nId],
                      extra:{ n:nId, nSubs } });
        consumed.add(co); consumed.add(nId);
        continue;
      }
      /* acyl halide: C(=O)X */
      if(halos.length===1){
        groups.push({ kind:"acylhal", at:a.id, atoms:[co, halos[0].to],
                      extra:{ el:byId.get(halos[0].to).el } });
        consumed.add(co); consumed.add(halos[0].to);
        continue;
      }
      /* ester / anhydride: C(=O)-O-? */
      if(bridgeO.length===1){
        const ox = bridgeO[0].to;
        const other = nbrs(ox).map(e=>e.to).find(t=>t!==a.id);
        const otherCarbonyl = other!==undefined && isC(other) &&
          nbrs(other).some(e=>byId.get(e.to).el==="O" && e.order===2);
        if(otherCarbonyl){
          if(a.id < other){    /* record once, from the lower id */
            groups.push({ kind:"anhyd", at:a.id, atoms:[co, ox], extra:{ other } });
            consumed.add(co); consumed.add(ox);
          } else { consumed.add(co); }
          continue;
        }
        groups.push({ kind:"ester", at:a.id, atoms:[co, ox], extra:{ alkylSide:other } });
        consumed.add(co); consumed.add(ox);
        continue;
      }
      /* plain carbonyl: aldehyde if the carbon has <=1 carbon neighbour */
      const cNbr = nbrs(a.id).filter(e=>isC(e.to)).length;
      groups.push({ kind: cNbr<=1 ? "aldehyde" : "ketone", at:a.id, atoms:[co] });
      consumed.add(co);
      continue;
    }

    /* alcohol */
    for(const e of hydroxylO){
      if(consumed.has(e.to)) continue;
      groups.push({ kind:"alcohol", at:a.id, atoms:[e.to] });
      consumed.add(e.to);
    }
    /* amine (primary, secondary or tertiary) */
    for(const e of amineN){
      if(consumed.has(e.to)) continue;
      const nSubs = nbrs(e.to).filter(x=>isC(x.to) && x.to!==a.id).map(x=>x.to);
      groups.push({ kind:"amine", at:a.id, atoms:[e.to], extra:{ n:e.to, nSubs } });
      consumed.add(e.to);
    }
    /* thiol */
    for(const e of thiolS){
      if(consumed.has(e.to)) continue;
      groups.push({ kind:"thiol", at:a.id, atoms:[e.to] });
      consumed.add(e.to);
    }
    /* sulfide: the smaller side becomes an alkylsulfanyl prefix */
    for(const e of sulfideS){
      if(consumed.has(e.to)) continue;
      const sides = nbrs(e.to).map(x=>x.to);
      groups.push({ kind:"sulfide", at:e.to, atoms:[e.to], extra:{ sides } });
      consumed.add(e.to);
    }
  }

  /* --- pass 2: ethers (bridging O not explained above) --- */
  for(const a of g.atoms){
    if(a.el!=="O" || consumed.has(a.id)) continue;
    if(ringAtoms && ringAtoms.has(a.id)) continue;   /* ring oxygen is skeleton */
    const n = adj.get(a.id);
    if(n.length===2 && n.every(e=>byId.get(e.to).el==="C")){
      groups.push({ kind:"ether", at:a.id, atoms:[a.id], extra:{ sides:[n[0].to, n[1].to] } });
      consumed.add(a.id);
    }
  }

  /* a heteroatom inside a ring is part of the skeleton, not a substituent */
  if(ringAtoms) for(const id of ringAtoms) consumed.add(id);

  const orphan = g.atoms.find(a=>a.el!=="C" && !consumed.has(a.id) && !a.implicit);
  return { groups, orphan };
}

/* principal characteristic group = highest ranked present */
export function principalKind(groups){
  let best=null;
  for(const gr of groups){
    const def=GROUPS[gr.kind];
    if(!def) continue;
    if(!best || def.rank > GROUPS[best].rank) best=gr.kind;
  }
  return best;
}

/* ================================================================
   CIP PRIORITY
   ----------------------------------------------------------------
   Hierarchical-digraph comparison. Multiple bonds create duplicate
   (phantom) atoms with no substituents of their own. Branches are
   compared sphere by sphere; within a sphere the atomic numbers are
   taken in the order established by the ranking of their parents.
   This is the standard teaching-level implementation and resolves
   every case in an introductory curriculum.
   ================================================================ */

const H_NODE = { z:1, leaf:true };

function childrenOf(node, g, adj, byId){
  if(node.dup || node.phantom) return [];
  const out=[];
  for(const e of adj.get(node.id)){
    if(e.to===node.from && !node.usedBack){ node.usedBack=true; continue; }
    const t=byId.get(e.to);
    out.push({ id:e.to, from:node.id, z:Z[t.el], dup:false });
    for(let k=1;k<e.order;k++) out.push({ id:e.to, from:node.id, z:Z[t.el], dup:true });
  }
  /* duplicate atoms for the bond back to the parent, if multiple */
  if(node.backOrder>1)
    for(let k=1;k<node.backOrder;k++)
      out.push({ id:node.from, from:node.id, z:node.backZ, dup:true });
  /* implicit hydrogens */
  const self=byId.get(node.id);
  const used=adj.get(node.id).reduce((s,e)=>s+e.order,0);
  const max=self.nitro?4:(self.el==="C"?4:{N:3,O:2,S:2,F:1,Cl:1,Br:1,I:1}[self.el]||0);
  for(let k=0;k<Math.max(0,max-used);k++) out.push({ z:1, phantom:true });
  out.sort((p,q)=>q.z-p.z);
  return out;
}

/* Compare two branches rooted at `start`, entered from `from`.
   Returns >0 if A outranks B, <0 if B outranks A, 0 if tied. */
export function compareBranch(A, B, g, adj, byId, maxDepth=12){
  const mk = (start, from) => {
    const e = adj.get(from).find(x=>x.to===start);
    return [{ id:start, from, z:Z[byId.get(start).el],
              backOrder:e?e.order:1, backZ:Z[byId.get(from).el] }];
  };
  let la = mk(A.start, A.from), lb = mk(B.start, B.from);
  for(let d=0; d<maxDepth; d++){
    const za = la.map(n=>n.z), zb = lb.map(n=>n.z);
    for(let i=0;i<Math.max(za.length,zb.length);i++){
      const x=za[i]??0, y=zb[i]??0;
      if(x!==y) return x-y;
    }
    if(la.length===0 && lb.length===0) return 0;
    const na=[], nb=[];
    for(const n of la) na.push(...childrenOf(n, g, adj, byId));
    for(const n of lb) nb.push(...childrenOf(n, g, adj, byId));
    la=na; lb=nb;
  }
  return 0;
}

/* Rank the neighbours of `centre` by CIP priority, highest first.
   Implicit hydrogens are represented as { implicitH:true }. */
export function rankNeighbours(centre, g, adj, byId){
  const list = adj.get(centre).map(e=>({ id:e.to, order:e.order, bond:e.bond }));
  const self = byId.get(centre);
  const used = adj.get(centre).reduce((s,e)=>s+e.order,0);
  const max  = self.el==="C" ? 4 : ({N:3,O:2,S:2}[self.el]||0);
  const nH   = Math.max(0, max-used);
  for(let i=0;i<nH;i++) list.push({ implicitH:true, order:1 });

  const cmp=(p,q)=>{
    if(p.implicitH && q.implicitH) return 0;
    if(p.implicitH) return -1;
    if(q.implicitH) return 1;
    const za=Z[byId.get(p.id).el], zb=Z[byId.get(q.id).el];
    if(za!==zb) return za-zb;
    return compareBranch({start:p.id,from:centre},{start:q.id,from:centre}, g, adj, byId);
  };
  const sorted=[...list].sort((p,q)=>cmp(q,p));
  /* detect ties (needed to decide whether a centre is really stereogenic) */
  let tied=false;
  for(let i=1;i<sorted.length;i++) if(cmp(sorted[i-1],sorted[i])===0) tied=true;
  return { ranked:sorted, tied };
}
