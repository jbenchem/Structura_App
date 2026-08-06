/* ================================================================
   STRUCTURA ENGINE v4 — STEREOCHEMISTRY
   ----------------------------------------------------------------
   R/S from 2D coordinates plus wedge/dash bonds.
   E/Z from 2D geometry about a double bond.

   Screen coordinates grow downward, so y is negated when building
   vectors. A wedge points toward the viewer (+z), a dash away (-z);
   both are read from their narrow end, which must sit on the
   stereocentre.

   Handedness test: with vectors v1,v2,v3 to CIP priorities 1,2,3,
   (v1 x v2) . v3 < 0  =>  R      (verified against a known reference)
                    > 0  =>  S
   ================================================================ */
import { rankNeighbours, compareBranch } from "./groups.js";
import { Z } from "./core.js";

const sub = (p,q) => [p[0]-q[0], p[1]-q[1], p[2]-q[2]];
const cross = (p,q) => [p[1]*q[2]-p[2]*q[1], p[2]*q[0]-p[0]*q[2], p[0]*q[1]-p[1]*q[0]];
const dot = (p,q) => p[0]*q[0]+p[1]*q[1]+p[2]*q[2];
const norm = p => { const m=Math.hypot(...p)||1; return [p[0]/m,p[1]/m,p[2]/m]; };

/* z-offset contributed by a stereo bond, seen from `centre` */
function zOf(centre, e){
  const b=e.bond;
  if(!b.stereo) return 0;
  if(b.a!==centre) return 0;          /* stereo bonds are read from their narrow end */
  return b.stereo==="wedge" ? 1 : b.stereo==="dash" ? -1 : 0;
}

/* ---------------- R/S ---------------- */
export function assignRS(centre, g, adj, byId){
  const self=byId.get(centre);
  if(self.el!=="C" && self.el!=="N") return null;

  const explicit = adj.get(centre);
  if(explicit.some(e=>e.order>1)) return null;       /* must be sp3 */
  const used = explicit.length;                      /* all orders are 1 here */
  const maxB = self.el==="C" ? 4 : 3;
  if(used>maxB) return null;
  if(used<3) return null;                            /* at most one implicit H */
  if(self.el==="C" && used===3){ /* one implicit H completes the tetrahedron */ }

  const { ranked, tied } = rankNeighbours(centre, g, adj, byId);
  if(tied) return { stereogenic:false };
  if(ranked.length!==4) return { stereogenic:false };

  /* build 3D vectors */
  const C=[self.x, -self.y, 0];
  const vecs=new Map();
  let anyStereo=false;
  for(const e of explicit){
    const t=byId.get(e.to);
    const z=zOf(centre,e);
    if(z!==0) anyStereo=true;
    vecs.set(e.to, norm(sub([t.x, -t.y, z*28], C)));
  }
  if(!anyStereo) return { stereogenic:true, config:null,
    reason:"no-wedge" };                              /* chiral, but drawn flat */

  /* implicit H sits opposite the sum of the explicit bonds */
  let implicitVec=null;
  if(explicit.length===3){
    const s=[...vecs.values()].reduce((a,v)=>[a[0]+v[0],a[1]+v[1],a[2]+v[2]],[0,0,0]);
    implicitVec=norm([-s[0],-s[1],-s[2]]);
  }

  const v = idx => {
    const n=ranked[idx];
    return n.implicitH ? implicitVec : vecs.get(n.id);
  };
  const v1=v(0), v2=v(1), v3=v(2);
  if(!v1||!v2||!v3) return { stereogenic:true, config:null, reason:"geometry" };

  const t = dot(cross(v1,v2), v3);
  if(Math.abs(t)<1e-6) return { stereogenic:true, config:null, reason:"degenerate" };
  return { stereogenic:true, config: t<0 ? "R" : "S" };
}

/* ---------------- E/Z ---------------- */
export function assignEZ(bond, g, adj, byId, ringBondKeys){
  if(bond.order!==2) return null;
  if(bond.stereo==="either") return null;   /* geometry deliberately unspecified */
  if(ringBondKeys){
    const k = bond.a<bond.b ? `${bond.a}|${bond.b}` : `${bond.b}|${bond.a}`;
    if(ringBondKeys.has(k)) return null;   /* in a ring: no independent geometry */
  }
  const c1=bond.a, c2=bond.b;
  const a1=byId.get(c1), a2=byId.get(c2);
  if(a1.el!=="C"||a2.el!=="C") return null;
  /* a double bond inside a small ring has no independent geometry */

  const subsOf = (c,other) => adj.get(c).filter(e=>e.to!==other);
  const s1=subsOf(c1,c2), s2=subsOf(c2,c1);
  if(s1.length===0||s2.length===0) return { stereogenic:false };
  if(s1.some(e=>e.order>1)||s2.some(e=>e.order>1)) return { stereogenic:false };

  const pick = (subs, centre) => {
    if(subs.length===1) return { win:subs[0].to, tied:false };
    if(subs.length!==2) return { tied:true };
    const c=compareBranch({start:subs[0].to,from:centre},{start:subs[1].to,from:centre},g,adj,byId);
    if(c===0) return { tied:true };
    return { win: c>0 ? subs[0].to : subs[1].to, tied:false };
  };
  const p1=pick(s1,c1), p2=pick(s2,c2);
  if(p1.tied||p2.tied) return { stereogenic:false };

  /* which side of the double-bond axis does each winner sit on? */
  const P1=[a1.x,-a1.y], P2=[a2.x,-a2.y];
  const axis=[P2[0]-P1[0], P2[1]-P1[1]];
  const sideOf=(id,base)=>{
    const t=byId.get(id);
    const v=[t.x-base[0], -t.y-base[1]];
    return Math.sign(axis[0]*v[1]-axis[1]*v[0]);
  };
  const s_1=sideOf(p1.win,P1), s_2=sideOf(p2.win,P2);
  if(s_1===0||s_2===0) return { stereogenic:true, config:null, reason:"collinear" };
  return { stereogenic:true, config: s_1===s_2 ? "Z" : "E" };
}

/* Would cis/trans terminology also apply? (each carbon carries an H) */
export function cisTransApplicable(bond, g, adj, byId){
  const has1H = c => {
    const used=adj.get(c).reduce((s,e)=>s+e.order,0);
    return 4-used===1;
  };
  return has1H(bond.a) && has1H(bond.b);
}

/* ---------------- whole-molecule scan ---------------- */
export function findStereo(g, adj, byId, ringBondKeys){
  const centres=[], doubles=[];
  for(const a of g.atoms){
    if(a.el!=="C") continue;
    const r=assignRS(a.id, g, adj, byId);
    if(r && r.stereogenic) centres.push({ atom:a.id, ...r });
  }
  for(const b of g.bonds){
    const r=assignEZ(b, g, adj, byId, ringBondKeys);
    if(r && r.stereogenic) doubles.push({ bond:b, ...r });
  }
  return { centres, doubles };
}
