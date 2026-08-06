/* ================================================================
   STRUCTURA ENGINE v4 — NAME -> STRUCTURE
   ----------------------------------------------------------------
   Strategy: parse the name into a plain description, build a graph
   from it, then VERIFY by naming the result back. Stereochemistry is
   applied by trial: set a wedge, ask the stereo module what it reads,
   and flip if it disagrees. That avoids duplicating CIP logic here.
   ================================================================ */
import { ROOT, HALO_INV, normalise, expandSugar, buildAdj, formulaOf } from "./core.js";
import { nameGraph, FUSED_TEMPLATES } from "./name.js";
import { assignRS, assignEZ } from "./stereo.js";

const ALKYL = { methyl:1, ethyl:2, propyl:3, butyl:4, pentyl:5, hexyl:6 };
const ALKOXY = { methoxy:1, ethoxy:2, propoxy:3, butoxy:4, pentoxy:5 };
const HALIDE_INV = { fluoride:"F", chloride:"Cl", bromide:"Br", iodide:"I" };
const MULTN = { di:2, tri:3, tetra:4, penta:5, hexa:6, hepta:7, octa:8 };

const SUBS = [
  "methyl","ethyl","propyl","butyl","pentyl","hexyl",
  "propan-2-yl","isopropyl","2-methylpropan-2-yl","tert-butyl","tertbutyl",
  "butan-2-yl","sec-butyl","2-methylpropyl","isobutyl","pentan-3-yl",
  "ethenyl","vinyl","prop-1-en-2-yl","prop-2-en-1-yl","allyl","ethynyl",
  "sulfanyl","mercapto","methylsulfanyl","ethylsulfanyl",
  "methanoyloxy","ethanoyloxy","propanoyloxy","butanoyloxy","pentanoyloxy",
  "acetyloxy","acetoxy","formyloxy","propionyloxy","butyryloxy",
  "fluoro","chloro","bromo","iodo",
  "hydroxy","oxo","amino","cyano","nitro","phenyl",
  "methoxy","ethoxy","propoxy","butoxy","pentoxy",
  "cyclopropyl","cyclobutyl","cyclopentyl","cyclohexyl",
];
const SUBRE = "(" + SUBS.slice().sort((a,b)=>b.length-a.length).join("|") + ")";
const ROOTRE = "(heptacos|heptadec|hexacos|hexadec|nonacos|nonadec|octacos|octadec|"
             + "pentacos|pentadec|tetracos|tetradec|triacont|tricos|tridec|henicos|"
             + "docos|dodec|undec|icos|meth|eth|prop|but|pent|hex|hept|oct|non|dec)";

export const ALIAS_TABLE = {
  /* everyday laboratory names */
  "acetone":"propan-2-one", "aceticacid":"ethanoic acid", "formicacid":"methanoic acid",
  "acetaldehyde":"ethanal", "formaldehyde":"methanal", "acetonitrile":"ethanenitrile",
  "acetamide":"ethanamide", "isopropanol":"propan-2-ol", "isopropylalcohol":"propan-2-ol",
  "rubbingalcohol":"propan-2-ol", "woodalcohol":"methanol", "methylalcohol":"methanol",
  "ethylalcohol":"ethanol", "grainalcohol":"ethanol", "toluene":"methylbenzene",
  "methylamine":"methanamine", "ethylamine":"ethan-1-amine", "phenylamine":"aniline",
  "chloroform":"trichloromethane", "carbontetrachloride":"tetrachloromethane",
  "acetylene":"ethyne", "ethylene":"ethene", "propylene":"propene",
  "ethyleneglycol":"ethane-1,2-diol", "antifreeze":"ethane-1,2-diol",
  "glycerol":"propane-1,2,3-triol", "glycerine":"propane-1,2,3-triol",
  "cyclohexanol":"cyclohexan-1-ol", "cyclohexanone":"cyclohexan-1-one",
  "cyclopentanol":"cyclopentan-1-ol", "cyclopentanone":"cyclopentan-1-one",
  "mek":"butan-2-one", "methylethylketone":"butan-2-one",
  "tertbutanol":"2-methylpropan-2-ol", "neopentane":"2,2-dimethylpropane",
  "isooctane":"2,2,4-trimethylpentane", "isobutane":"2-methylpropane",
  "carbolicacid":"phenol", "vinegar":"ethanoic acid",

  /* amino acids */
  "glycine":"2-aminoethanoic acid", "alanine":"2-aminopropanoic acid",
  "serine":"2-amino-3-hydroxypropanoic acid", "valine":"2-amino-3-methylbutanoic acid",
  "leucine":"2-amino-4-methylpentanoic acid", "isoleucine":"2-amino-3-methylpentanoic acid",
  "phenylalanine":"2-amino-3-phenylpropanoic acid", "betaalanine":"3-aminopropanoic acid",
  "gaba":"4-aminobutanoic acid",

  /* di-acids */
  "oxalicacid":"ethanedioic acid", "malonicacid":"propanedioic acid",
  "succinicacid":"butanedioic acid", "glutaricacid":"pentanedioic acid",
  "adipicacid":"hexanedioic acid",

  /* fatty acids */
  "butyricacid":"butanoic acid", "valericacid":"pentanoic acid",
  "caproicacid":"hexanoic acid", "caprylicacid":"octanoic acid",
  "capricacid":"decanoic acid", "lauricacid":"dodecanoic acid",
  "myristicacid":"tetradecanoic acid", "palmiticacid":"hexadecanoic acid",
  "stearicacid":"octadecanoic acid", "arachidicacid":"icosanoic acid",
  "oleicacid":"(9Z)-octadec-9-enoic acid", "elaidicacid":"(9E)-octadec-9-enoic acid",
  "propionicacid":"propanoic acid", "lacticacid":"2-hydroxypropanoic acid",
  "acrylicacid":"prop-2-enoic acid", "pyruvicacid":"2-oxopropanoic acid",
  "acetoaceticacid":"3-oxobutanoic acid", "levulinicacid":"4-oxopentanoic acid",

  /* aromatics */
  "salicylicacid":"2-hydroxybenzoic acid", "picricacid":"2,4,6-trinitrophenol",
  "ocresol":"2-methylphenol", "mcresol":"3-methylphenol", "pcresol":"4-methylphenol",
  "oxylene":"1,2-dimethylbenzene", "mxylene":"1,3-dimethylbenzene",
  "pxylene":"1,4-dimethylbenzene", "mesitylene":"1,3,5-trimethylbenzene",
  "nitrobenzol":"nitrobenzene", "benzol":"benzene",
  "biphenyl":"phenylbenzene", "diphenyl":"phenylbenzene",
  "aspirin":"2-(ethanoyloxy)benzoic acid",
  "caffeine":"1,3,7-trimethylpurine-2,6-dione",
  "theine":"1,3,7-trimethylpurine-2,6-dione",
  "1,3,7-trimethylxanthine":"1,3,7-trimethylpurine-2,6-dione",
  "acetylsalicylicacid":"2-(ethanoyloxy)benzoic acid",
  "2-acetoxybenzoicacid":"2-(ethanoyloxy)benzoic acid",
  /* benzo-fused heterocycles, old and current spellings */
  "2,3-benzopyrrole":"indole", "benzopyrrole":"indole", "benzo[b]pyrrole":"indole",
  "1-benzazole":"indole", "benzazole":"indole",
  "2,3-benzofuran":"benzofuran", "benzo[b]furan":"benzofuran",
  "1-benzofuran":"benzofuran", "coumarone":"benzofuran",
  "2,3-benzothiophene":"benzothiophene", "benzo[b]thiophene":"benzothiophene",
  "1-benzothiophene":"benzothiophene", "thionaphthene":"benzothiophene",
  "1-benzazine":"quinoline", "benzo[b]pyridine":"quinoline",
  "2-benzazine":"isoquinoline", "benzo[c]pyridine":"isoquinoline",
  "1,2-benzopyrone":"chromen-2-one", "azabenzene":"pyridine",
  "oxole":"furan", "azole":"pyrrole", "thiole":"thiophene",
  "1,3-diazine":"pyrimidine", "1,4-diazine":"pyrazine", "1,2-diazine":"pyridazine",
  "1,3-diazole":"imidazole", "1,2-diazole":"pyrazole",
  "cumene":"propan-2-ylbenzene", "mesitylene":"1,3,5-trimethylbenzene",
  "dimethylamine":"n-methylmethanamine", "trimethylamine":"n,n-dimethylmethanamine",
  "diethylamine":"n-ethylethan-1-amine", "triethylamine":"n,n-diethylethan-1-amine",
  "dimethylsulfide":"methylsulfanylmethane", "dimethylsulphide":"methylsulfanylmethane",
  "ethanethiol":"ethanethiol", "methanethiol":"methanethiol",
  "glucose":"2,3,4,5,6-pentahydroxyhexanal",
  "dextrose":"2,3,4,5,6-pentahydroxyhexanal",

  "ibuprofen":"2-[4-(2-methylpropyl)phenyl]propanoic acid",
  "acetophenone":"1-phenylethan-1-one",
  "anisole":"methoxybenzene", "styrene":"ethenylbenzene",
};

const err = (e,m) => ({ ok:false, err:e, message:m });

/* ---------------- layout ----------------
   Skeletal convention: every bond is the same length and chains zigzag
   at +/-30 degrees from horizontal, giving the 120 degree vertex angle
   real sp3 chains show on paper. Substituents leave their anchor along a
   recorded base angle so branches never overlap the parent. */
const BOND = 30;
const DEG = Math.PI/180;

function layoutChain(n){
  const atoms=[], bonds=[];
  for(let i=0;i<n;i++)
    atoms.push({ id:i+1,
      x: Math.round(40 + i*BOND*Math.cos(30*DEG)),
      y: Math.round(100 + (i%2 ? -BOND*Math.sin(30*DEG) : 0)) });
  for(let i=0;i<n-1;i++) bonds.push({ a:i+1, b:i+2, order:1, stereo:null });
  /* substituents leave a trough downward and a peak upward */
  const base={};
  for(let i=0;i<n;i++) base[i+1] = (i%2 ? -90 : 90) * DEG;
  return { atoms, bonds, ids:atoms.map(a=>a.id), base };
}

function layoutRing(n){
  const atoms=[], bonds=[];
  const cx=100, cy=100, rad = Math.round(BOND / (2*Math.sin(Math.PI/n)));
  const base={};
  for(let i=0;i<n;i++){
    const ang = Math.PI*2*i/n - Math.PI/2;
    atoms.push({ id:i+1, x:Math.round(cx+rad*Math.cos(ang)), y:Math.round(cy+rad*Math.sin(ang)) });
    base[i+1]=ang;                            /* radially outward */
  }
  for(let i=0;i<n;i++) bonds.push({ a:i+1, b:i+2>n?1:i+2, order:1, stereo:null });
  return { atoms, bonds, ids:atoms.map(a=>a.id), base, cx, cy };
}

/* Choose an outgoing direction from `anchorId` that sits as far as possible
   from the bonds already there. Carbon wants ~120 degrees between bonds, so a
   fixed offset is wrong: a chain end carrying =O and -OH must splay them
   apart, not place them opposite each other through the carbon. */
function freeAngle(state, anchorId, preferred){
  const anchor = state.atoms.find(a=>a.id===anchorId);
  const taken = [];
  for(const b of state.bonds){
    const other = b.a===anchorId ? b.b : b.b===anchorId ? b.a : null;
    if(other===null) continue;
    const o = state.atoms.find(a=>a.id===other);
    if(o) taken.push(Math.atan2(o.y-anchor.y, o.x-anchor.x));
  }
  if(!taken.length) return preferred ?? -Math.PI/6;
  const sep = (a,b) => { let d=Math.abs(a-b)%(2*Math.PI); return d>Math.PI ? 2*Math.PI-d : d; };
  const sepA=(a,b)=>{ let d=Math.abs(a-b)%(2*Math.PI); return d>Math.PI?2*Math.PI-d:d; };
  const UP = -Math.PI/2, DOWN = Math.PI/2;      /* screen y grows downward */

  /* A carbon already carrying two chain bonds runs left-and-right, so its
     branches belong straight up and straight down. Trying to keep 120 degrees
     from everything sends the second branch diagonally back across the parent,
     which is what makes two branches look joined. */
  const chainBonds = taken.filter(t=>Math.abs(Math.cos(t)) > 0.45);
  if(chainBonds.length >= 2){
    const upTaken   = taken.some(t=>sepA(t,UP)   < 0.6);
    const downTaken = taken.some(t=>sepA(t,DOWN) < 0.6);
    if(!upTaken && !downTaken){
      /* first branch: leave on the side the chain bonds are not pointing */
      const lean = chainBonds.reduce((s,t)=>s+Math.sin(t), 0);
      return lean < 0 ? DOWN : UP;
    }
    if(!upTaken)   return UP;
    if(!downTaken) return DOWN;
  }

  /* Otherwise aim for about 120 degrees from the nearest existing bond, which
     is what trigonal and tetrahedral carbons look like on paper. */
  const IDEAL = 2*Math.PI/3;
  let best=null, bestScore=-Infinity;
  for(let deg=0; deg<360; deg+=15){
    const cand = deg*Math.PI/180;
    const worst = Math.min(...taken.map(t=>sep(cand,t)));
    if(worst < 0.9) continue;                       /* never crowd within ~50 deg */
    let score = -Math.abs(worst - IDEAL);
    if(preferred!=null) score -= sep(cand,preferred)*0.05;
    if(deg % 30 === 0) score += 0.02;               /* prefer the 30 degree lattice */
    /* molecules read better wide than tall, so lean towards the horizontal */
    score += Math.abs(Math.cos(cand))*0.10;
    if(score > bestScore){ bestScore=score; best=cand; }
  }
  if(best===null){
    let worstBest=-1;
    for(let deg=0; deg<360; deg+=15){
      const cand=deg*Math.PI/180;
      const worst=Math.min(...taken.map(t=>sep(cand,t)));
      if(worst>worstBest){ worstBest=worst; best=cand; }
    }
  }
  return best;
}

/* attach a chain of atoms to `anchorId`, splaying away from existing bonds */
function attach(state, anchorId, spec){
  const { atoms, bonds } = state;
  const anchor = atoms.find(a=>a.id===anchorId);
  let ang = freeAngle(state, anchorId, state.base[anchorId]);

  if(spec.graph){
    const made=[];
    for(let i=0;i<spec.graph.length;i++){
      const node = spec.graph[i];
      const parentId = node.from<0 ? anchorId : made[node.from];
      const parent = atoms.find(a=>a.id===parentId);
      const dir = freeAngle(state, parentId, node.from<0 ? ang : state.base[parentId]);
      const id = state.nextId++;
      atoms.push({ id, x:Math.round(parent.x+BOND*Math.cos(dir)),
                        y:Math.round(parent.y+BOND*Math.sin(dir)),
                   ...(node.el?{el:node.el}:{}) });
      bonds.push({ a:parentId, b:id, order:node.order||1, stereo:null });
      state.base[id]=dir;
      made.push(id);
    }
    return made[0];
  }

  let px = anchor.x, py = anchor.y, prev = anchorId;
  const occupied = () => state.atoms;
  for(let i=0;i<spec.chain.length;i++){
    const node = spec.chain[i];
    const id = state.nextId++;
    /* zigzag gently around the outgoing direction, and never onto an atom
       that is already there */
    let step = i===0 ? ang : ang + (i%2 ? 1 : -1)*(Math.PI/6);
    if(i>0){
      for(const trial of [step, ang, ang+Math.PI/6, ang-Math.PI/6,
                          ang+Math.PI/3, ang-Math.PI/3]){
        const tx=px+BOND*Math.cos(trial), ty=py+BOND*Math.sin(trial);
        if(!occupied().some(a=>Math.hypot(a.x-tx,a.y-ty) < BOND*0.75)){ step=trial; break; }
      }
    }
    px = Math.round(px + BOND*Math.cos(step));
    py = Math.round(py + BOND*Math.sin(step));
    atoms.push({ id, x:px, y:py, ...(node.el?{el:node.el}:{}) });
    bonds.push({ a:prev, b:id, order:node.order||1, stereo:null });
    state.base[id] = step;
    prev = id; ang = step;
  }
  return prev;
}

/* A substituent is a little graph: each node names the node it hangs from
   (-1 means the anchor atom). This replaces the old flat-chain-only model, so
   isopropyl, tert-butyl and vinyl can be built. */
const SUB_GRAPH = {
  "propan-2-yl":        [{from:-1},{from:0},{from:0}],
  isopropyl:            [{from:-1},{from:0},{from:0}],
  "2-methylpropan-2-yl":[{from:-1},{from:0},{from:0},{from:0}],
  "tert-butyl":         [{from:-1},{from:0},{from:0},{from:0}],
  tertbutyl:            [{from:-1},{from:0},{from:0},{from:0}],
  "butan-2-yl":         [{from:-1},{from:0},{from:0},{from:2}],
  "sec-butyl":          [{from:-1},{from:0},{from:0},{from:2}],
  "2-methylpropyl":     [{from:-1},{from:0},{from:1},{from:1}],
  isobutyl:             [{from:-1},{from:0},{from:1},{from:1}],
  "pentan-3-yl":        [{from:-1},{from:0},{from:1},{from:0},{from:3}],
  ethenyl:              [{from:-1},{from:0,order:2}],
  vinyl:                [{from:-1},{from:0,order:2}],
  "prop-1-en-2-yl":     [{from:-1},{from:0,order:2},{from:0}],
  "prop-2-en-1-yl":     [{from:-1},{from:0},{from:1,order:2}],
  allyl:                [{from:-1},{from:0},{from:1,order:2}],
  ethynyl:              [{from:-1},{from:0,order:3}],
  sulfanyl:             [{from:-1,el:"S"}],
  mercapto:             [{from:-1,el:"S"}],
  methylsulfanyl:       [{from:-1,el:"S"},{from:0}],
  ethylsulfanyl:        [{from:-1,el:"S"},{from:0}, {from:1}],
};

/* Build a substituent that carries its own substituents, e.g. 1-fluoroethyl
   or iodomethyl. Returns the same {graph:[...]} form as SUB_GRAPH. */
function complexSubSpec(inner){
  if(SUB_GRAPH[inner]) return { graph:SUB_GRAPH[inner] };
  /* a stereo descriptor belonging to the substituent itself, e.g.
     (2E,4E)-6-methylocta-2,4-dienyl. Take it off before anything else reads
     the name; the connectivity is built either way. */
  let innerStereo = null;
  {
    const sm = inner.match(/^\(([^()]*)\)-(.*)$/);
    if(sm && /^[\d,rsez]+$/i.test(sm[1].replace(/\s/g,""))){
      innerStereo = sm[1]; inner = sm[2];
    }
  }
  const pr = parsePrefixes(inner);
  if(pr.error) return null;
  let { subs, loose, rest } = pr;

  /* an aryl group carrying its own substituents: 3-methylphenyl, 4-chlorophenyl */
  if(rest==="phenyl" || /^cyclo(prop|but|pent|hex)yl$/.test(rest)){
    const aromatic = rest==="phenyl";
    const size = aromatic ? 6 : ROOT.indexOf(rest.match(/^cyclo(.*)yl$/)[1]);
    if(loose.length){
      if(loose.length===1 && !subs.length) subs=[{ loc:2, name:loose[0] }];
      else return null;
    }
    for(const su of subs)
      if(su.loc<1 || su.loc>size || !subSpec(su.name, true)) return null;
    return { ring:size, aromatic, ringSubs:subs };
  }
  /* the remainder names the substituent's own chain */
  let len=0, attach=1, eneL=[], yneL=[];
  let m = rest.match(new RegExp("^"+ROOTRE+"an-(\\d+)-yl$"));
  if(m){ len = ROOT.indexOf(m[1]); attach = +m[2]; }
  else if((m = rest.match(new RegExp("^"+ROOTRE+"a?-(\\d+(?:,\\d+)*)-(?:di|tri|tetra)?en-(\\d+)-yl$")))){
    len = ROOT.indexOf(m[1]); eneL = m[2].split(",").map(Number); attach = +m[3];
  }
  else if((m = rest.match(new RegExp("^"+ROOTRE+"a?-(\\d+(?:,\\d+)*)-(?:di|tri|tetra)?enyl$")))){
    len = ROOT.indexOf(m[1]); eneL = m[2].split(",").map(Number); attach = 1;
  }
  else if((m = rest.match(new RegExp("^"+ROOTRE+"a?-(\\d+(?:,\\d+)*)-(?:di|tri|tetra)?yn-(\\d+)-yl$")))){
    len = ROOT.indexOf(m[1]); yneL = m[2].split(",").map(Number); attach = +m[3];
  }
  else if((m = rest.match(new RegExp("^"+ROOTRE+"yl$")))){ len = ROOT.indexOf(m[1]); attach = 1; }
  else return null;

  if(!len || attach<1 || attach>len) return null;
  if(loose.length){
    if(loose.length===1 && !subs.length && len<=2) subs.push({ loc:1, name:loose[0] });
    else return null;
  }
  /* lay the chain out with the attachment atom first */
  const order=[attach];
  for(let i=attach-1;i>=1;i--) order.push(i);
  for(let i=attach+1;i<=len;i++) order.push(i);
  const idxOf = new Map(order.map((loc,i)=>[loc,i]));
  const graph = order.map((loc,i)=>{
    if(i===0) return { from:-1 };
    const prevLoc = loc<attach ? loc+1 : loc-1;
    return { from: idxOf.get(prevLoc) };
  });
  /* the bond between positions L and L+1 is carried by whichever of them is
     further from the attachment atom */
  for(const L of [...eneL, ...yneL]){
    if(L<1 || L>=len) return null;
    const far = Math.abs(L-attach) > Math.abs(L+1-attach) ? L : L+1;
    const idx = idxOf.get(far);
    if(idx===undefined || idx===0) return null;
    graph[idx].order = eneL.includes(L) ? 2 : 3;
  }

  for(const su of subs){
    if(su.loc<1||su.loc>len) return null;
    const spec = subSpec(su.name);
    if(!spec) return null;
    if(spec.graph){
      const base = graph.length;
      for(const nd of spec.graph)
        graph.push({ ...nd, from: nd.from<0 ? idxOf.get(su.loc) : base+nd.from });
    } else if(spec.chain){
      let parent = idxOf.get(su.loc);
      for(const nd of spec.chain){
        graph.push({ from:parent, el:nd.el, order:nd.o||nd.order });
        parent = graph.length-1;
      }
    } else return null;
  }
  return { graph, innerStereo };
}

/* substituent -> chain spec */
const ACYLOXY_ALIAS = {
  acetyloxy:"ethanoyloxy", acetoxy:"ethanoyloxy", formyloxy:"methanoyloxy",
  propionyloxy:"propanoyloxy", butyryloxy:"butanoyloxy",
};

/* -O-C(=O)-R, the ester written as a substituent on the alcohol half */
function acyloxySpec(name){
  const nm = ACYLOXY_ALIAS[name] || name;
  const m = nm.match(new RegExp("^"+ROOTRE+"anoyloxy$"));
  if(!m) return null;
  const len = ROOT.indexOf(m[1]);
  if(!len) return null;
  const graph = [{ from:-1, el:"O" }, { from:0 }, { from:1, el:"O", order:2 }];
  let prev = 1;                        /* the carbonyl carbon */
  for(let i=1;i<len;i++){
    graph.push({ from:prev });
    prev = graph.length-1;
  }
  return { graph };
}

function subSpec(name, deep){
  if(SUB_GRAPH[name]) return { graph:SUB_GRAPH[name] };
  const ac = acyloxySpec(name);
  if(ac) return ac;
  if(!deep && /yl$/.test(name) && !ALKYL[name] && !ALKOXY[name]){
    const cx = complexSubSpec(name);
    if(cx) return cx;
  }
  if(HALO_INV[name]) return { chain:[{el:HALO_INV[name]}] };
  if(name==="hydroxy") return { chain:[{el:"O"}] };
  if(name==="oxo")     return { chain:[{el:"O",order:2}] };
  if(name==="amino")   return { chain:[{el:"N"}] };
  if(name==="nitro")   return { chain:[{el:"NO2"}] };
  if(name==="cyano")   return { chain:[{},{el:"N",order:3}] };
  if(ALKOXY[name])     return { chain:[{el:"O"}, ...Array.from({length:ALKOXY[name]},()=>({}))] };
  if(ALKYL[name])      return { chain:Array.from({length:ALKYL[name]},()=>({})) };
  if(name==="phenyl")  return { ring:6, aromatic:true };
  const cyc=name.match(/^cyclo(prop|but|pent|hex)yl$/);
  if(cyc) return { ring:ROOT.indexOf(cyc[1]) };
  return null;
}

/* ---------------- prefix parsing ---------------- */
function parsePrefixes(s, repair){
  const subs=[], loose=[];
  let rest=s, guard=0;
  while(guard++<24){
    /* a bracketed complex substituent: 5-(1-fluoroethyl), 8-(iodomethyl) */
    let br = rest.match(/^(\d+(?:,\d+)*)-(di|tri|tetra)?\(((?:[^()]|\([^()]*\))+)\)-?/);
    if(br){
      const locs=br[1].split(",").map(Number);
      const mult=br[2]?MULTN[br[2]]:1;
      if(locs.length!==mult && !repair)
        return { error: err("malformed", `"${br[0].replace(/-$/,"")}" \u2014 the locants and the prefix disagree.`) };
      while(locs.length<mult) locs.push(locs[locs.length-1]);
      locs.forEach(l=>subs.push({ loc:l, name:br[3], bracket:true }));
      rest = rest.slice(br[0].length);
      continue;
    }
    let brBare = rest.match(/^(di|tri|tetra)?\(((?:[^()]|\([^()]*\))+)\)-?(?=[a-z])/);
    if(brBare){
      const mult = brBare[1] ? MULTN[brBare[1]] : 1;
      for(let i=0;i<mult;i++) loose.push(brBare[2]);
      rest = rest.slice(brBare[0].length);
      continue;
    }
    /* complex substituents whose own names start with a locant */
    let cx = rest.match(new RegExp("^(\\d+(?:,\\d+)*)-(di|tri|tetra)?(2-methylpropan-2-yl|2-methylpropyl|prop-1-en-2-yl|prop-2-en-1-yl|propan-2-yl|butan-2-yl|pentan-3-yl)-?"));
    if(cx){
      const locs=cx[1].split(",").map(Number);
      const mult=cx[2]?MULTN[cx[2]]:1;
      if(locs.length!==mult)
        return { error: err("malformed", `"${cx[0].replace(/-$/,"")}" \u2014 the number of locants must match the multiplier.`) };
      locs.forEach(l=>subs.push({ loc:l, name:cx[3] }));
      rest = rest.slice(cx[0].length);
      continue;
    }
    let bare = rest.match(new RegExp("^(2-methylpropan-2-yl|2-methylpropyl|prop-1-en-2-yl|prop-2-en-1-yl|propan-2-yl|butan-2-yl|pentan-3-yl)(?=[a-z])"));
    if(bare){ loose.push(bare[1]); rest = rest.slice(bare[0].length); continue; }
    let m = rest.match(new RegExp("^(\\d+(?:,\\d+)*)-(di|tri|tetra|penta|hexa|hepta|octa)?"+SUBRE+"-?"));
    if(m){
      const locs=m[1].split(",").map(Number);
      const mult=m[2]?MULTN[m[2]]:1;
      if(locs.length!==mult){
        if(!repair)
          return { error: err("malformed", `"${m[0].replace(/-$/,"")}" — the number of locants must match the multiplier (di needs 2, tri needs 3).`) };
        /* the intent is clear enough to draw: keep the locants given and pad
           by repeating the last one if the multiplier asks for more */
        repair.issues.push(`"${m[0].replace(/-$/,"")}" gives ${locs.length} locant${locs.length===1?"":"s"} but the prefix says ${mult}.`);
        while(locs.length < mult) locs.push(locs[locs.length-1]);
      }
      locs.forEach(l=>subs.push({ loc:l, name:m[3] }));
      rest = rest.slice(m[0].length);
      continue;
    }
    m = rest.match(new RegExp("^(di|tri|tetra|penta|hexa|hepta|octa)?"+SUBRE+"(?=[a-z])"));
    if(m){
      const mult=m[1]?MULTN[m[1]]:1;
      for(let i=0;i<mult;i++) loose.push(m[2]);
      rest = rest.slice(m[0].length);
      continue;
    }
    break;
  }
  return { subs, loose, rest };
}

/* ---------------- stereo descriptor ---------------- */
function stripStereo(s){
  const m = s.match(/^\(([^)]*)\)-(.*)$/);
  if(!m) return { stereo:[], rest:s };
  const items = m[1].split(",").map(t=>t.trim()).filter(Boolean);
  const stereo=[];
  for(const it of items){
    const g = it.match(/^(\d*)([RSEZ])$/i);
    if(!g) return { error: err("malformed", `"${it}" isn't a stereo-descriptor this engine understands. Use forms like (R)-, (2S)- or (2E,4Z)-.`) };
    stereo.push({ loc: g[1] ? Number(g[1]) : null, label: g[2].toUpperCase() });
  }
  return { stereo, rest:m[2] };
}

/* ================= special ring builders ================= */
export const HET_SPEC = {
  aziridine:  { n:3, arom:false, het:{1:"N"} },
  oxirane:    { n:3, arom:false, het:{1:"O"} },
  ethyleneoxide: { n:3, arom:false, het:{1:"O"} },
  thiirane:   { n:3, arom:false, het:{1:"S"} },
  azetidine:  { n:4, arom:false, het:{1:"N"} },
  oxetane:    { n:4, arom:false, het:{1:"O"} },
  thietane:   { n:4, arom:false, het:{1:"S"} },
  "1,3-diazetidine": { n:4, arom:false, het:{1:"N",3:"N"} },
  "1,3-dioxetane":   { n:4, arom:false, het:{1:"O",3:"O"} },
  "1,3-dioxolane":   { n:5, arom:false, het:{1:"O",3:"O"} },
  "1,3-dioxane":     { n:6, arom:false, het:{1:"O",3:"O"} },
  imidazolidine: { n:5, arom:false, het:{1:"N",3:"N"} },
  oxazolidine:   { n:5, arom:false, het:{1:"O",3:"N"} },
  thiazolidine:  { n:5, arom:false, het:{1:"S",3:"N"} },
  thiane:     { n:6, arom:false, het:{1:"S"} },
  pyridine:   { n:6, arom:true,  het:{1:"N"} },
  piperidine: { n:6, arom:false, het:{1:"N"} },
  pyrrole:    { n:5, arom:true,  het:{1:"N"} },
  pyrrolidine:{ n:5, arom:false, het:{1:"N"} },
  furan:      { n:5, arom:true,  het:{1:"O"} },
  oxolane:    { n:5, arom:false, het:{1:"O"} },
  tetrahydrofuran:{ n:5, arom:false, het:{1:"O"} },
  thiophene:  { n:5, arom:true,  het:{1:"S"} },
  thiolane:   { n:5, arom:false, het:{1:"S"} },
  oxane:      { n:6, arom:false, het:{1:"O"} },
  tetrahydropyran:{ n:6, arom:false, het:{1:"O"} },
  pyrimidine: { n:6, arom:true,  het:{1:"N",3:"N"} },
  pyrazine:   { n:6, arom:true,  het:{1:"N",4:"N"} },
  pyridazine: { n:6, arom:true,  het:{1:"N",2:"N"} },
  imidazole:  { n:5, arom:true,  het:{1:"N",3:"N"} },
  pyrazole:   { n:5, arom:true,  het:{1:"N",2:"N"} },
  piperazine: { n:6, arom:false, het:{1:"N",4:"N"} },
  oxazole:    { n:5, arom:true,  het:{1:"O",3:"N"} },
  thiazole:   { n:5, arom:true,  het:{1:"S",3:"N"} },
  dioxane:    { n:6, arom:false, het:{1:"O",4:"O"} },
};

function buildHetero(spec, subs){
  const { n, arom, het } = spec;
  const base = layoutRing(n);
  const atoms = base.atoms.map((a,i)=>({ ...a, ...(het[i+1] ? { el:het[i+1] } : {}) }));
  const bonds = base.bonds.map(b=>({ ...b }));
  if(arom){
    /* 6-rings alternate from the first bond; 5-rings put their two double
       bonds clear of position 1, whose heteroatom donates a lone pair */
    const idx = n===6 ? [0,2,4] : n===5 ? [1,3] : [];
    for(const i of idx){
      const a=i+1, b=(i+1)%n + 1;
      const bd=bonds.find(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));
      if(bd) bd.order=2;
    }
  }
  const state={ atoms, bonds, nextId:n+1, used:{}, base:{ ...base.base } };
  for(const su of subs||[]){
    const sp=subSpec(su.name);
    if(!sp || sp.ring) return null;
    attach(state, su.loc, sp);
  }
  return { atoms:state.atoms, bonds:state.bonds };
}

/* benzene fused to a heterocycle: build the two rings sharing an edge */
function buildFusedHetero(kind){
  const SPEC = {
    indole:        { n:5, el:"N", offset:2 },
    benzofuran:    { n:5, el:"O", offset:2 },
    benzothiophene:{ n:5, el:"S", offset:2 },
    quinoline:     { n:6, el:"N", offset:1 },
    isoquinoline:  { n:6, el:"N", offset:2 },
  }[kind];
  if(!SPEC) return null;
  const atoms=[], bonds=[];
  const R6=BOND/(2*Math.sin(Math.PI/6));
  let id=1;
  /* benzene ring first */
  const benz=[];
  for(let i=0;i<6;i++){
    const t=Math.PI*2*i/6 - Math.PI/2;
    atoms.push({ id, x:Math.round(140+R6*Math.cos(t)), y:Math.round(150+R6*Math.sin(t)) });
    benz.push(id); id++;
  }
  for(let i=0;i<6;i++) bonds.push({ a:benz[i], b:benz[(i+1)%6], order:1, stereo:null });
  /* fuse onto the bond between benz[1] and benz[2] */
  const f1=benz[1], f2=benz[2];
  const A=atoms.find(a=>a.id===f1), B=atoms.find(a=>a.id===f2);
  const n=SPEC.n;
  const Rn=BOND/(2*Math.sin(Math.PI/n));
  const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
  const ang=Math.atan2(B.y-A.y, B.x-A.x);
  const h=Math.sqrt(Math.max(Rn*Rn-(BOND/2)*(BOND/2),1));
  let cx=mx+Math.cos(ang-Math.PI/2)*h, cy=my+Math.sin(ang-Math.PI/2)*h;
  if(Math.hypot(cx-140, cy-150) < R6){ cx=mx+Math.cos(ang+Math.PI/2)*h; cy=my+Math.sin(ang+Math.PI/2)*h; }
  const startT=Math.atan2(A.y-cy, A.x-cx);
  const dir = ((Math.atan2(B.y-cy,B.x-cx)-startT+2*Math.PI)%(2*Math.PI)) < Math.PI ? 1 : -1;
  const hetRing=[f1];
  for(let k=1;k<n;k++){
    const t=startT + dir*k*(2*Math.PI/n);
    const x=Math.round(cx+Rn*Math.cos(t)), y=Math.round(cy+Rn*Math.sin(t));
    const near=atoms.find(a=>Math.hypot(a.x-x,a.y-y)<10);
    if(near) hetRing.push(near.id);
    else { atoms.push({ id, x, y }); hetRing.push(id); id++; }
  }
  for(let k=0;k<hetRing.length;k++){
    const a=hetRing[k], b=hetRing[(k+1)%hetRing.length];
    if(!bonds.some(z=>(z.a===a&&z.b===b)||(z.a===b&&z.b===a)))
      bonds.push({ a, b, order:1, stereo:null });
  }
  /* Place the heteroatom by its relationship to the ring junction rather than
     by counting steps: in indole, benzofuran and benzothiophene it sits next
     to a junction atom, in isoquinoline one further round. Counting steps got
     this wrong and produced isoindole while calling it indole. */
  const fusionIds = [f1, f2];
  const nonFusion = hetRing.filter(id=>!fusionIds.includes(id));
  const adjacentToFusion = nonFusion.filter(id =>
    bonds.some(b => (b.a===id && fusionIds.includes(b.b)) ||
                    (b.b===id && fusionIds.includes(b.a))));
  const hetId = SPEC.offset===1
    ? (adjacentToFusion[0] ?? nonFusion[0])
    : (SPEC.n===5
        ? (adjacentToFusion[0] ?? nonFusion[0])
        : (nonFusion.find(id => !adjacentToFusion.includes(id) &&
             bonds.some(b => (b.a===id && adjacentToFusion.includes(b.b)) ||
                             (b.b===id && adjacentToFusion.includes(b.a))))
           ?? nonFusion[1]));
  const hetAtom = atoms.find(a=>a.id===hetId);
  if(!hetAtom) return null;
  hetAtom.el = SPEC.el;
  /* Kekule by backtracking, leaving pyrrole-type nitrogen and oxygen single */
  const deg={}; atoms.forEach(a=>deg[a.id]=0);
  const lonePair = SPEC.n===5;
  if(lonePair) deg[hetId]=1;
  const solve=(k)=>{
    if(k===bonds.length) return atoms.every(a=>deg[a.id]===1);
    const b=bonds[k];
    if(!deg[b.a] && !deg[b.b]){
      deg[b.a]=1; deg[b.b]=1; b.order=2;
      if(solve(k+1)) return true;
      deg[b.a]=0; deg[b.b]=0; b.order=1;
    }
    return solve(k+1);
  };
  if(!solve(0)) return null;
  return { atoms, bonds };
}

/* Purine and caffeine. Caffeine is a substituted purine-2,6-dione, which the
   systematic namer does not yet cover, so it is built explicitly from its
   known connectivity and recognised by name rather than derived. */
function buildPurineFamily(kind){
  /* six-ring N1 C2 N3 C4 C5 C6, five-ring C4 N9 C8 N7 C5 */
  const R6=BOND/(2*Math.sin(Math.PI/6));
  const six=[], atoms=[], bonds=[];
  const label={};
  for(let i=0;i<6;i++){
    const t=Math.PI*2*i/6 - Math.PI/2;
    atoms.push({ id:i+1, x:Math.round(150+R6*Math.cos(t)), y:Math.round(150+R6*Math.sin(t)) });
    six.push(i+1);
  }
  ["N1","C2","N3","C4","C5","C6"].forEach((L,i)=>{ label[L]=six[i]; });
  for(let i=0;i<6;i++) bonds.push({ a:six[i], b:six[(i+1)%6], order:1, stereo:null });
  atoms.find(a=>a.id===label.N1).el="N";
  atoms.find(a=>a.id===label.N3).el="N";

  /* fuse the five-ring onto the C4-C5 bond */
  const A=atoms.find(a=>a.id===label.C4), B=atoms.find(a=>a.id===label.C5);
  const R5=BOND/(2*Math.sin(Math.PI/5));
  const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
  const ang=Math.atan2(B.y-A.y,B.x-A.x);
  const h=Math.sqrt(Math.max(R5*R5-(BOND/2)*(BOND/2),1));
  let cx=mx+Math.cos(ang-Math.PI/2)*h, cy=my+Math.sin(ang-Math.PI/2)*h;
  if(Math.hypot(cx-150,cy-150) < R6){ cx=mx+Math.cos(ang+Math.PI/2)*h; cy=my+Math.sin(ang+Math.PI/2)*h; }
  const st=Math.atan2(A.y-cy,A.x-cx);
  /* walk away from C5 so the ring comes out C4, N9, C8, N7, C5 */
  const dir=((Math.atan2(B.y-cy,B.x-cx)-st+2*Math.PI)%(2*Math.PI))<Math.PI?-1:1;
  let id=7;
  const five=[label.C4];
  for(let k=1;k<5;k++){
    const t=st+dir*k*(2*Math.PI/5);
    const x=Math.round(cx+R5*Math.cos(t)), y=Math.round(cy+R5*Math.sin(t));
    const near=atoms.find(a=>Math.hypot(a.x-x,a.y-y)<12);
    if(near){ five.push(near.id); continue; }
    atoms.push({ id, x, y }); five.push(id); id++;
  }
  for(let k=0;k<5;k++){
    const a=five[k], b=five[(k+1)%5];
    if(!bonds.some(z=>(z.a===a&&z.b===b)||(z.a===b&&z.b===a)))
      bonds.push({ a, b, order:1, stereo:null });
  }
  /* five-ring order is C4, N9, C8, N7, C5 */
  label.N9=five[1]; label.C8=five[2]; label.N7=five[3];
  atoms.find(a=>a.id===label.N9).el="N";
  atoms.find(a=>a.id===label.N7).el="N";

  if(kind==="purine"){
    const deg={}; atoms.forEach(a=>deg[a.id]=0);
    const solve=k=>{
      if(k===bonds.length) return atoms.every(a=>deg[a.id]===1 || a.id===label.N9);
      const b=bonds[k];
      if(!deg[b.a]&&!deg[b.b]&&b.a!==label.N9&&b.b!==label.N9){
        deg[b.a]=1; deg[b.b]=1; b.order=2;
        if(solve(k+1)) return true;
        deg[b.a]=0; deg[b.b]=0; b.order=1;
      }
      return solve(k+1);
    };
    if(!solve(0)) return null;
    return { atoms, bonds, label,
             marks:{ ring:Object.keys(label).map(k=>label[k]), methyls:[], oxos:[] } };
  }

  /* caffeine: 1,3,7-trimethyl, carbonyls at C2 and C6, C8=N9 */
  const put=(hostId, el, order)=>{
    const host=atoms.find(a=>a.id===hostId);
    let bestT=0, bestClear=-1;
    for(let k=0;k<24;k++){
      const t=k*Math.PI/12;
      const x=host.x+BOND*Math.cos(t), y=host.y+BOND*Math.sin(t);
      let worst=Infinity;
      for(const q of atoms) if(q.id!==hostId) worst=Math.min(worst, Math.hypot(q.x-x,q.y-y));
      if(worst>bestClear){ bestClear=worst; bestT=t; }
    }
    atoms.push({ id, x:Math.round(host.x+BOND*Math.cos(bestT)),
                     y:Math.round(host.y+BOND*Math.sin(bestT)), ...(el?{el}:{}) });
    bonds.push({ a:hostId, b:id, order:order||1, stereo:null });
    return id++;
  };
  const marks = { ring:[], methyls:[], oxos:[] };
  for(const k of Object.keys(label)) marks.ring.push(label[k]);
  marks.oxos.push(put(label.C2,"O",2), label.C2);
  marks.oxos.push(put(label.C6,"O",2), label.C6);
  const dbl=(x,y)=>{ const b=bonds.find(z=>(z.a===x&&z.b===y)||(z.a===y&&z.b===x)); if(b) b.order=2; };
  dbl(label.C4,label.C5);
  dbl(label.C8,label.N9);
  marks.methyls.push(put(label.N1,null,1), put(label.N3,null,1), put(label.N7,null,1));
  marks.nitrogens = [label.N1, label.N3, label.N7];
  return { atoms, bonds, marks, label };
}

/* Tropane alkaloids. The skeleton is 8-azabicyclo[3.2.1]octane; the engine
   builds that systematically, and these named members hang their esters and
   N-methyl group off it. Stereodescriptors are recorded in the name but the
   flat structure is what gets drawn. */
function buildTropane(kind){
  const core = buildBicyclo(3,2,1,8);
  if(!core) return null;
  const atoms = core.atoms.map(a=>({...a}));
  const bonds = core.bonds.map(b=>({...b}));
  const N = core.numbering;
  atoms.find(a=>a.id===N[8]).el = "N";
  let id = Math.max(...atoms.map(a=>a.id)) + 1;

  const free = hostId => {
    const host = atoms.find(a=>a.id===hostId);
    let best=0, clear=-1;
    for(let k=0;k<24;k++){
      const t=k*Math.PI/12;
      const x=host.x+BOND*Math.cos(t), y=host.y+BOND*Math.sin(t);
      let worst=Infinity;
      for(const q of atoms) if(q.id!==hostId) worst=Math.min(worst, Math.hypot(q.x-x,q.y-y));
      if(worst>clear){ clear=worst; best=t; }
    }
    return best;
  };
  const hang = (hostId, el, order) => {
    const host = atoms.find(a=>a.id===hostId);
    const t = free(hostId);
    atoms.push({ id, x:Math.round(host.x+BOND*Math.cos(t)),
                     y:Math.round(host.y+BOND*Math.sin(t)), ...(el?{el}:{}) });
    bonds.push({ a:hostId, b:id, order:order||1, stereo:null });
    return id++;
  };

  hang(N[8]);                                   /* N-methyl */

  if(kind==="tropane") return { atoms, bonds, numbering:N };

  /* C2 carries a methyl ester: -C(=O)-O-CH3 */
  const c = hang(N[2]);
  hang(c, "O", 2);
  const o = hang(c, "O", 1);
  hang(o);

  if(kind==="ecgoninemethylester"){
    hang(N[3], "O", 1);                         /* a plain hydroxyl at C3 */
    return { atoms, bonds, numbering:N };
  }

  /* C3 carries a benzoate ester: -O-C(=O)-phenyl */
  const o3 = hang(N[3], "O", 1);
  const cb = hang(o3);
  hang(cb, "O", 2);
  /* the phenyl ring */
  const R6 = BOND/(2*Math.sin(Math.PI/6));
  const host = atoms.find(a=>a.id===cb);
  const dir = free(cb);
  const cx = host.x + (BOND+R6)*Math.cos(dir), cy = host.y + (BOND+R6)*Math.sin(dir);
  const ring=[];
  for(let i=0;i<6;i++){
    const t = Math.atan2(host.y-cy, host.x-cx) + i*(2*Math.PI/6);
    atoms.push({ id, x:Math.round(cx+R6*Math.cos(t)), y:Math.round(cy+R6*Math.sin(t)) });
    ring.push(id); id++;
  }
  for(let i=0;i<6;i++)
    bonds.push({ a:ring[i], b:ring[(i+1)%6], order:i%2===0?2:1, stereo:null });
  bonds.push({ a:cb, b:ring[0], order:1, stereo:null });
  return { atoms, bonds, numbering:N };
}

/* fused aromatics: fixed skeletons with a valid Kekule pattern */
function buildFused(kind){
  const rows = kind==="naphthalene" ? 2 : 3;
  const angular = kind==="phenanthrene";
  const atoms=[], bonds=[];
  const R=42, dx=R*Math.sqrt(3);
  let id=1;
  const ringAt=(cx,cy)=>{
    const ids=[];
    for(let i=0;i<6;i++){
      const a=Math.PI*2*i/6 - Math.PI/2;
      const x=Math.round(cx+R*Math.cos(a)), y=Math.round(cy+R*Math.sin(a));
      const found=atoms.find(p=>Math.hypot(p.x-x,p.y-y)<12);
      if(found) ids.push(found.id);
      else { atoms.push({ id, x, y }); ids.push(id); id++; }
    }
    for(let i=0;i<6;i++){
      const a=ids[i], b=ids[(i+1)%6];
      if(!bonds.some(z=>(z.a===a&&z.b===b)||(z.a===b&&z.b===a)))
        bonds.push({ a, b, order:1, stereo:null });
    }
    return ids;
  };
  ringAt(100,100);
  ringAt(100+dx,100);
  if(rows===3){
    if(angular) ringAt(Math.round(100+dx+dx*0.5), Math.round(100-dx*0.866));
    else ringAt(100+2*dx, 100);
  }
  /* greedy Kekule: give every atom exactly one double bond where possible */
  /* perfect matching by backtracking: every ring atom needs exactly one C=C */
  const order = bonds.map((_,i)=>i);
  const deg={};
  const solve = (k) => {
    if(k===bonds.length) return atoms.every(a=>deg[a.id]===1);
    const b=bonds[order[k]];
    if(!deg[b.a] && !deg[b.b]){
      deg[b.a]=1; deg[b.b]=1; b.order=2;
      if(solve(k+1)) return true;
      deg[b.a]=0; deg[b.b]=0; b.order=1;
    }
    return solve(k+1);
  };
  atoms.forEach(a=>deg[a.id]=0);
  if(!solve(0)) return null;
  return { atoms, bonds };
}

function buildBicyclo(x,y,z,total){
  if(x+y+z+2 !== total) return null;
  const atoms=[], bonds=[];
  let id=1;
  const h1=id++, h2=id++;
  atoms.push({ id:h1, x:70,  y:110 });
  atoms.push({ id:h2, x:190, y:110 });
  /* IUPAC numbers a bicyclic from one bridgehead along the longest bridge,
     back along the next, then the shortest. Record that so heteroatom
     prefixes such as 8-aza can find their position. */
  const numbering = { 1:h1 };
  let k = 2;
  /* Each bridge is drawn as an arc rather than a straight row, so no bridge
     atom ends up in line with the two bridgeheads. A one-atom bridge laid on
     the axis would draw as a straight line through that carbon. */
  const bridge=(len, dy, record)=>{
    let prev=h1; const made=[];
    /* Points on a true circular arc through the two bridgeheads. Spacing them
       evenly along a sine curve instead leaves the middle atoms in a straight
       line, which is what a four-atom bridge used to look like. */
    const c = 120, sag = Math.abs(dy) || 1, sgn = Math.sign(dy) || 1;
    const R2 = (c*c/4 + sag*sag) / (2*sag);
    const cx0 = 70 + c/2, cy0 = 110 + sgn*(R2 - sag);
    const a1 = Math.atan2(110-cy0, 70-cx0), a2 = Math.atan2(110-cy0, 190-cx0);
    let sweep = a2-a1;
    while(sweep >  Math.PI) sweep -= 2*Math.PI;
    while(sweep < -Math.PI) sweep += 2*Math.PI;
    for(let i=0;i<len;i++){
      const nid=id++;
      const t = (i+1)/(len+1);
      const ang = a1 + sweep*t;
      atoms.push({ id:nid,
        x:Math.round(cx0 + R2*Math.cos(ang)),
        y:Math.round(cy0 + R2*Math.sin(ang)) });
      bonds.push({ a:prev, b:nid, order:1, stereo:null });
      made.push(nid); prev=nid;
    }
    bonds.push({ a:prev, b:h2, order:1, stereo:null });
    if(record) made.forEach(nid=>{ numbering[k++]=nid; });
    return made;
  };
  bridge(x, -70, true);           /* positions 2 .. x+1 */
  numbering[k++] = h2;            /* the second bridgehead */
  const second = bridge(y, 70, false);
  second.slice().reverse().forEach(nid=>{ numbering[k++]=nid; });
  if(z===0) bonds.push({ a:h1, b:h2, order:1, stereo:null });
  else bridge(z, -135, true);     /* the short bridge arches clear of the rest */
  return { atoms, bonds, numbering };
}

function buildSpiro(x,y,total){
  if(x+y+1 !== total) return null;
  const S = { id:1, x:150, y:150 };
  const atoms=[S], bonds=[];
  let id=2;
  /* each ring is a regular polygon with the spiro atom as one vertex; the two
     ring centres sit on opposite sides so the rings never overlap */
  const ring = (n, dirX) => {
    const R = BOND/(2*Math.sin(Math.PI/n));
    const cx = S.x + dirX*R, cy = S.y;
    const start = Math.atan2(S.y-cy, S.x-cx);
    const ids=[S.id];
    for(let k=1;k<n;k++){
      const t = start + dirX*k*(2*Math.PI/n);
      atoms.push({ id, x:Math.round(cx+R*Math.cos(t)), y:Math.round(cy+R*Math.sin(t)) });
      ids.push(id); id++;
    }
    for(let k=0;k<ids.length;k++)
      bonds.push({ a:ids[k], b:ids[(k+1)%ids.length], order:1, stereo:null });
  };
  ring(x+1, -1);
  ring(y+1,  1);
  return { atoms, bonds };
}

/* Attach substituents to a polycyclic skeleton by trial: the numbering rules
   for fused, spiro and bridged systems live in the namer, so rather than
   duplicating them here we place the groups and check what comes back. */
function placeOnSkeleton(mol, subs, wanted){
  if(!subs.length){
    const chk = nameGraph(mol);
    return chk.ok && chk.name===wanted ? mol : (chk.ok ? { ...mol, _name:chk.name } : null);
  }
  const ringIds = mol.atoms.map(a=>a.id);
  const attachAt = (base, id, name) => {
    const spec = subSpec(name);
    if(!spec || spec.ring) return null;
    const atoms = base.atoms.map(a=>({...a}));
    const bonds = base.bonds.map(b=>({...b}));
    const anchor = atoms.find(a=>a.id===id);
    const cx = atoms.reduce((s,a)=>s+a.x,0)/atoms.length;
    const cy = atoms.reduce((s,a)=>s+a.y,0)/atoms.length;
    const ang = Math.atan2(anchor.y-cy, anchor.x-cx);
    const state = { atoms, bonds, nextId:Math.max(...atoms.map(a=>a.id))+1,
                    used:{}, base:{ [id]:ang } };
    attach(state, id, spec);
    return { atoms:state.atoms, bonds:state.bonds };
  };
  /* try every placement of the first substituent, recurse for the rest */
  const solve = (cur, rest) => {
    if(!rest.length){
      const chk = nameGraph(cur);
      return (chk.ok && chk.name===wanted) ? cur : null;
    }
    const [head, ...tail] = rest;
    for(const id of ringIds){
      const next = attachAt(cur, id, head.name);
      if(!next) continue;
      const got = solve(next, tail);
      if(got) return got;
    }
    return null;
  };
  return solve(mol, subs);
}

/* Suggest a close match for a mistyped name. Cheap edit distance over the
   alias list plus the ring and heterocycle names. */
function suggest(input){
  const pool = [
    ...Object.keys(ALIAS_TABLE), ...Object.keys(HET_SPEC),
    "naphthalene","anthracene","phenanthrene","indole","quinoline","isoquinoline",
    "benzofuran","benzothiophene","benzene","phenol","aniline","benzoicacid",
    "benzaldehyde","benzonitrile","cyclohexane","cyclopentane",
  ];
  const dist = (a,b) => {
    if(Math.abs(a.length-b.length) > 3) return 99;
    const dp = Array.from({length:a.length+1},(_,i)=>[i,...Array(b.length).fill(0)]);
    for(let j=0;j<=b.length;j++) dp[0][j]=j;
    for(let i=1;i<=a.length;i++)
      for(let j=1;j<=b.length;j++)
        dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1,
                            dp[i-1][j-1] + (a[i-1]===b[j-1] ? 0 : 1));
    return dp[a.length][b.length];
  };
  let best=null, bestD=99;
  for(const cand of pool){
    const d = dist(input, cand);
    if(d < bestD){ bestD=d; best=cand; }
  }
  if(bestD > Math.max(2, Math.floor(input.length/4))) return null;
  /* render the suggestion the way a person would write it */
  const pretty = best
    .replace(/acid$/, " acid").replace(/anhydride$/, " anhydride");
  return pretty;
}

/* Set stereo-descriptors on an already-built structure by trial. The namer is
   the authority on which atom carries which locant, so rather than duplicating
   that mapping we place a wedge, ask what came back, and keep it if it matches.
   Works the same on chains, rings and bridged systems. */
function applyStereoByTrial(graph, wanted){
  const want = wanted.filter(w=>w.label==="R"||w.label==="S");
  if(!want.length) return { ok:true };
  const key = d => `${d.loc==null?"":d.loc}${d.label}`;
  const readCentres = () => {
    const g = nameGraph(graph);
    return (g.ok && g.stereo) ? g.stereo.centres : [];
  };
  const satisfied = w => readCentres().some(c =>
    c.config===w.label && (w.loc==null || String(c.loc)===String(w.loc)));

  for(const w of want){
    if(satisfied(w)) continue;
    /* candidate atoms: those the namer calls stereogenic at this locant */
    const cands = readCentres()
      .filter(c => w.loc==null || String(c.loc)===String(w.loc))
      .map(c => c.atom);
    const pool = cands.length ? cands
      : graph.atoms.filter(a=>!a.el||a.el==="C").map(a=>a.id);
    let done=false;
    for(const atom of pool){
      /* prefer a bond to a terminal atom: a wedge on a ring bond is ambiguous */
      const degOf = id => graph.bonds.filter(b=>b.a===id||b.b===id).length;
      const bonds = graph.bonds
        .filter(b=>(b.a===atom||b.b===atom) && (b.order||1)===1)
        .sort((x,y)=>degOf(x.a===atom?x.b:x.a)-degOf(y.a===atom?y.b:y.a));
      for(const b of bonds){
        const keep = { a:b.a, b:b.b, stereo:b.stereo };
        const other = b.a===atom ? b.b : b.a;
        for(const s of ["wedge","dash"]){
          b.a=atom; b.b=other; b.stereo=s;
          if(satisfied(w)){ done=true; break; }
        }
        if(done) break;
        b.a=keep.a; b.b=keep.b; b.stereo=keep.stereo;
      }
      if(done) break;
    }
    if(!done) return { ok:false, loc:w.loc, label:w.label };
  }
  return { ok:true };
}

/* Set the configuration at a known atom directly, for structures the namer
   cannot yet name systematically. The stereo module is still the authority on
   what a given drawing reads as; only the locant mapping is supplied here. */
function setConfigAt(graph, atomId, want){
  const read = () => {
    const ex = expandSugar(normalise(graph));
    const wg = { atoms:ex.atoms, bonds:ex.bonds };
    const adj = buildAdj(wg).adj;
    const by = new Map(wg.atoms.map(a=>[a.id,a]));
    const r = assignRS(atomId, wg, adj, by);
    return r && r.config ? r.config : null;
  };
  const degOf = id => graph.bonds.filter(b=>b.a===id||b.b===id).length;
  const bonds = graph.bonds
    .filter(b=>(b.a===atomId||b.b===atomId) && (b.order||1)===1)
    .sort((x,y)=>degOf(x.a===atomId?x.b:x.a)-degOf(y.a===atomId?y.b:y.a));
  for(const b of bonds){
    const keep={ a:b.a, b:b.b, stereo:b.stereo };
    const other = b.a===atomId ? b.b : b.a;
    for(const s of ["wedge","dash"]){
      b.a=atomId; b.b=other; b.stereo=s;
      if(read()===want) return true;
    }
    b.a=keep.a; b.b=keep.b; b.stereo=keep.stereo;
  }
  return false;
}

/* Flip the geometry of a double bond by mirroring everything on one side of
   it across the bond axis. Used to honour a stereo descriptor that belongs to
   a substituent rather than to the parent chain. */
function flipDouble(graph, bond){
  const at = id => graph.atoms.find(a=>a.id===id);
  const A = at(bond.a), B = at(bond.b);
  if(!A||!B) return false;
  const ax=B.x-A.x, ay=B.y-A.y, L2=ax*ax+ay*ay||1;
  const seen=new Set([bond.a, bond.b]), stack=[bond.b], move=[];
  while(stack.length){
    const v=stack.pop();
    for(const b of graph.bonds){
      const t = b.a===v ? b.b : b.b===v ? b.a : null;
      if(t===null || seen.has(t)) continue;
      seen.add(t); move.push(t); stack.push(t);
    }
  }
  if(!move.length) return false;
  for(const id of move){
    const p2 = at(id);
    const dx=p2.x-A.x, dy=p2.y-A.y;
    const t=(dx*ax+dy*ay)/L2;
    const px=A.x+ax*t, py=A.y+ay*t;
    p2.x=Math.round(2*px-p2.x); p2.y=Math.round(2*py-p2.y);
  }
  return true;
}

/* Make the drawn geometry match the descriptors asked for inside a
   substituent. Without this the structure is drawn flat and simply reads as
   whatever the layout happened to produce, which is silently wrong. */
function applySubstituentGeometry(graph, wanted){
  const want = wanted.filter(w=>w==="E"||w==="Z");
  if(!want.length) return { ok:true };
  const read = () => {
    const g = nameGraph(graph);
    return (g.ok && g.stereo) ? g.stereo.doubles : null;
  };
  for(let pass=0; pass<6; pass++){
    const got = read();
    if(!got) return { ok:false };
    const cfg = got.filter(d=>d.config).map(d=>d.config);
    if(cfg.length !== want.length) return { ok:false };
    let bad = -1;
    for(let i=0;i<want.length;i++) if(cfg[i]!==want[i]){ bad=i; break; }
    if(bad<0) return { ok:true };
    const target = got.filter(d=>d.config)[bad];
    const bond = graph.bonds.find(b =>
      (b.a===target.a && b.b===target.b) || (b.a===target.b && b.b===target.a));
    if(!bond || !flipDouble(graph, bond)) return { ok:false };
  }
  return { ok:false };
}

/* Build a fused ring system straight from its template. The same table that
   names these systems lays them out, so the two directions cannot drift. */
function buildFromTemplate(tpl, noDouble){
  const n = tpl.perimeter.length;
  const fusion = tpl.fusion;
  const atoms=[], bonds=[];
  /* place the perimeter as two fused regular rings */
  const [small, big] = tpl.sizes[0]<=tpl.sizes[1] ? tpl.sizes : [tpl.sizes[1],tpl.sizes[0]];
  const Rb = BOND/(2*Math.sin(Math.PI/big));
  const ringB=[];
  let id=1;
  for(let i=0;i<big;i++){
    const t = Math.PI*2*i/big - Math.PI/2;
    atoms.push({ id, x:Math.round(160+Rb*Math.cos(t)), y:Math.round(160+Rb*Math.sin(t)) });
    ringB.push(id); id++;
  }
  for(let i=0;i<big;i++) bonds.push({ a:ringB[i], b:ringB[(i+1)%big], order:1, stereo:null });
  /* fuse the other ring onto one bond */
  const A=atoms.find(a=>a.id===ringB[1]), B=atoms.find(a=>a.id===ringB[2]);
  const Rs = BOND/(2*Math.sin(Math.PI/small));
  const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
  const ang=Math.atan2(B.y-A.y,B.x-A.x);
  const h=Math.sqrt(Math.max(Rs*Rs-(BOND/2)*(BOND/2),1));
  let cx=mx+Math.cos(ang-Math.PI/2)*h, cy=my+Math.sin(ang-Math.PI/2)*h;
  if(Math.hypot(cx-160,cy-160) < Rb){ cx=mx+Math.cos(ang+Math.PI/2)*h; cy=my+Math.sin(ang+Math.PI/2)*h; }
  const st0=Math.atan2(A.y-cy,A.x-cx);
  const dir=((Math.atan2(B.y-cy,B.x-cx)-st0+2*Math.PI)%(2*Math.PI))<Math.PI ? -1 : 1;
  const ringS=[A.id];
  for(let k=1;k<small;k++){
    const t=st0+dir*k*(2*Math.PI/small);
    const x=Math.round(cx+Rs*Math.cos(t)), y=Math.round(cy+Rs*Math.sin(t));
    const near=atoms.find(q=>Math.hypot(q.x-x,q.y-y)<BOND*0.4);
    if(near){ ringS.push(near.id); continue; }
    atoms.push({ id, x, y }); ringS.push(id); id++;
  }
  for(let k=0;k<small;k++){
    const a=ringS[k], b=ringS[(k+1)%small];
    if(!bonds.some(z=>(z.a===a&&z.b===b)||(z.a===b&&z.b===a)))
      bonds.push({ a, b, order:1, stereo:null });
  }
  if(atoms.length !== n) return null;

  /* walk the perimeter and label it, then set the elements the template asks for */
  const sysIds = new Set(atoms.map(a=>a.id));
  const adjOf = id => bonds.filter(b=>b.a===id||b.b===id).map(b=>b.a===id?b.b:b.a);
  const deg = id => adjOf(id).length;
  const shared = [A.id, B.id];
  const start = atoms.map(a=>a.id).find(x=>deg(x)===2);
  const path=[start], seen=new Set([start]);
  for(;;){
    const v=path[path.length-1];
    const nx = adjOf(v).filter(t=>sysIds.has(t) && !seen.has(t))
      .filter(t=>!(shared.includes(v)&&shared.includes(t)))
      .sort((a2,b2)=>deg(a2)-deg(b2))[0];
    if(nx===undefined) break;
    path.push(nx); seen.add(nx);
  }
  if(path.length!==n) return null;

  /* find the rotation that puts the fusion atoms on the template's junctions */
  const fi = tpl.perimeter.indexOf(fusion[0]), fj = tpl.perimeter.indexOf(fusion[1]);
  for(const d of [1,-1]){
    const seq = d===1 ? path : [...path].reverse();
    for(let off=0; off<n; off++){
      const lab = new Map();
      for(let i=0;i<n;i++) lab.set(seq[(off+i)%n], tpl.perimeter[i]);
      const got = shared.map(x=>lab.get(x)).sort().join();
      if(got !== fusion.slice().sort().join()) continue;
      for(let i=0;i<n;i++){
        const el = tpl.els[i];
        if(el!=="C") atoms.find(a=>a.id===seq[(off+i)%n]).el = el;
      }
      /* Kekule: every ring atom takes exactly one double bond, except a
         lone-pair heteroatom and any position the caller has reserved. A
         carbonyl or an N-substituent uses up that atom's spare valence, which
         is why caffeine is a xanthine rather than a fully aromatic purine. */
      /* One nitrogen in a five-membered ring holds a lone pair instead of a
         double bond. Which one depends on what the ring carries, so try each
         candidate rather than assuming: in purine it is N9 on its own, but in
         caffeine the methylated N7 takes that role. */
      const reserved = new Set();
      if(noDouble) for(let i=0;i<n;i++)
        if(noDouble.has(tpl.perimeter[i])) reserved.add(seq[(off+i)%n]);
      const fiveHet = ringS.filter(idq =>
        (atoms.find(a=>a.id===idq).el||"C")!=="C" && !reserved.has(idq));
      const loneOptions = small===5
        ? [...fiveHet.map(x=>new Set([x])), new Set()]
        : [new Set()];

      let solved = false;
      for(const pick of loneOptions){
        const lone = new Set([...reserved, ...pick]);
        const degd={}; atoms.forEach(a=>degd[a.id]= lone.has(a.id)?1:0);
        const solve = k => {
          if(k===bonds.length) return atoms.every(a=>degd[a.id]===1);
          const b=bonds[k];
          if(!degd[b.a] && !degd[b.b]){
            degd[b.a]=1; degd[b.b]=1; b.order=2;
            if(solve(k+1)) return true;
            degd[b.a]=0; degd[b.b]=0; b.order=1;
          }
          return solve(k+1);
        };
        bonds.forEach(b=>{ b.order=1; });
        if(solve(0)){ solved = true; break; }
      }
      if(!solved) continue;
      return { atoms, bonds, labels:lab };
    }
  }
  return null;
}

/* Why does the name given differ from the preferred one? A learner needs to
   know whether they mis-numbered the chain, picked the wrong parent, or simply
   used an older but perfectly acceptable spelling. */
function classifyDifference(given, preferred){
  const norm = s => String(s).toLowerCase().replace(/\s+/g,"");
  const g = norm(given), pf = norm(preferred);
  if(g === pf) return null;

  const rootOf = s => {
    const m = s.match(new RegExp(ROOTRE + "(?:an|en|yn|a-|$)"));
    return m ? m[1] : null;
  };
  const locsOf = s => (s.match(/\d+/g) || []).map(Number).sort((a,b)=>a-b);
  const wordsOf = s => (s.match(/[a-z]{3,}/g) || []).filter(w=>w!=="acid");

  const rg = rootOf(g), rp = rootOf(pf);
  if(rg && rp && rg !== rp)
    return { issue:"parent",
      message:`The parent chain isn't the longest one available. Counted properly this is ${preferred}, whose parent is ${rp}- rather than ${rg}-.` };

  const lg = locsOf(g), lp = locsOf(pf);
  if(lg.length && lp.length && lg.join() !== lp.join()){
    const sameGroups = wordsOf(g).join() === wordsOf(pf).join();
    if(sameGroups)
      return { issue:"numbering",
        message:`The right groups in the right places, but numbered from the wrong end: the locants must be as low as possible, so ${lg.join(",")} should be ${lp.join(",")}. The preferred name is ${preferred}.` };
    return { issue:"numbering",
      message:`The locants don't come out lowest as written. The preferred name is ${preferred}.` };
  }
  return { issue:"style",
    message:`Accepted \u2014 the preferred form is ${preferred}.` };
}

/* ================= main ================= */
export function parseName(input, opts){
  const first = parseNameInner(input, opts);
  if(first.ok || first.err !== "malformed" || (opts && opts.repair)) return first;
  /* The name is written wrongly, but if the intent is drawable show it anyway
     and mark the name as faulty. Seeing the structure explains the mistake. */
  const fixed = parseNameInner(input, { repair:{ issues:[] } });
  if(fixed.ok && fixed.nameIssues && fixed.nameIssues.length)
    return { ok:false, err:"name-issue", nameIssues:fixed.nameIssues,
             mol:fixed.mol, formula:fixed.formula, mass:fixed.mass,
             intended:fixed.name,
             message:`${fixed.nameIssues.join(" ")} Written correctly this is ${fixed.name}.` };
  return first;
}

function parseNameInner(input, opts){
  const REPAIR = (opts && opts.repair) ? opts.repair : null;
  const raw = (input||"").trim();
  if(!raw) return err("empty","Enter a name first.");
  let s = raw.toLowerCase().replace(/\s+/g,"");
  /* common names may be written with hyphens or dots: p-xylene, tert-butanol */
  const aliasKey = s.replace(/[-.\u2010-\u2015]/g,"");
  if(ALIAS_TABLE[s])            s = ALIAS_TABLE[s].toLowerCase().replace(/\s+/g,"");
  else if(ALIAS_TABLE[aliasKey]) s = ALIAS_TABLE[aliasKey].toLowerCase().replace(/\s+/g,"");
  /* ortho/meta/para shorthand on a disubstituted benzene */
  /* ortho/meta/para shorthand. Single letters REQUIRE the hyphen, or
     "methylbenzene" would parse as m-ethylbenzene. */
  const ompM = s.match(/^(?:([omp])-|(ortho|meta|para)-?)(.+)$/);
  if(ompM){
    const pos = { o:2, ortho:2, m:3, meta:3, p:4, para:4 }[ompM[1]||ompM[2]];
    let inner = ompM[3];
    if(inner==="xylene") inner="dimethylbenzene";
    if(inner==="cresol") inner="methylphenol";
    const mm = inner.match(new RegExp("^(di)?"+SUBRE+"(benzene|phenol|aniline)$"));
    if(mm) s = mm[1] ? `1,${pos}-di${mm[2]}${mm[3]}` : `${pos}-${mm[2]}${mm[3]}`;
  }

  /* cis- and trans- are the words students meet first; convert them to the
     E/Z the engine reasons in, and remember to check they actually apply */
  let cisTransAsked = null;
  {
    const ct = s.match(/^(cis|trans)-?(.+)$/);
    if(ct && !HET_SPEC[s]){
      cisTransAsked = ct[1];
      s = "(" + (ct[1]==="cis" ? "Z" : "E") + ")-" + ct[2];
    }
  }

  /* N-substituent prefixes: N-methyl..., N,N-dimethyl... */
  let nSubsAsked=[];
  {
    let guard=0;
    while(guard++<6){
      const m2 = s.match(new RegExp("^(n(?:,n)*)-(di|tri)?"+SUBRE+"-?(.*)$"));
      if(!m2) break;
      const count = m2[2] ? MULTN[m2[2]] : m2[1].split(",").length;
      for(let i=0;i<count;i++) nSubsAsked.push(m2[3]);
      s = m2[4];
    }
  }

  /* indicated hydrogen (1H-, 2H-, 4H-) marks where the saturated position is;
     the ring it names is the same one either way for the parents we support */
  let indicatedH = null;
  {
    /* it can sit anywhere: 1H-pyrrole, 2-methyl-1H-pyrrole, 2H-chromene */
    const ih = s.match(/(\d+(?:,\d+)*)h-/);
    if(ih){
      indicatedH = ih[1];
      s = s.replace(/(\d+(?:,\d+)*)h-/g, "");
      s = s.replace(/--+/g,"-").replace(/^-|-$/g,"");
    }
  }

  const st = stripStereo(s);
  if(st.error) return st.error;
  const stereoWanted = st.stereo;
  s = st.rest;

  /* ---- ring systems that the chain parser can't express ---- */
  {
    const stereoAsked = stereoWanted;
    const polyPre = parsePrefixes(s, REPAIR);
    let polyRest = polyPre.error ? null : polyPre.rest;
    /* a suffix group on a polycycle: naphthalen-1-ol, bicyclo[4.4.0]decan-2-ol */
    let polySuffix = null;
    if(polyRest){
      const ps = polyRest.match(/^(.*?)-(\d+[a-z]?)-(ol|amine|thiol)$/);
      if(ps){
        polySuffix = { loc:ps[2], kind:ps[3] };
        polyRest = /^[aeiou]/.test(ps[3]) ? ps[1]+"e" : ps[1];
      }
    }
    {
      const trop = s.replace(/\(([^()]*)\)/g, (m,g)=>/^[\d,rsez]+$/i.test(g) ? "" : m)
                    .replace(/^\([^)]*\)-?/, "");
      const isCocaine = /^methyl3-\(?benzoyloxy\)?-?8-methyl-?8-azabicyclo(\[3\.2\.1\])?octane-?2-carboxylate$/
                          .test(trop.replace(/-/g,"").replace(/methyl3/,"methyl3-")) ||
                        /cocaine/.test(s) ||
                        (/8-azabicyclo/.test(s) && /benzoyloxy/.test(s) && /carboxylate/.test(s));
      const isTropane = s==="tropane" || s==="8-methyl-8-azabicyclo[3.2.1]octane";
      if(isCocaine || isTropane){
        const mol = buildTropane(isTropane ? "tropane" : "cocaine");
        if(!mol) return err("unsupported", "That tropane skeleton couldn't be built.");
        let placed = 0;
        if(!isTropane){
          /* the two ring substituents carry the settable configurations; the
             bridgeheads are fixed by the shape of the bicyclic frame */
          if(setConfigAt(mol, mol.numbering[2], "R")) placed++;
          if(setConfigAt(mol, mol.numbering[3], "S")) placed++;
        }
        const ex = expandSugar(normalise(mol));
        const wg = { atoms:ex.atoms, bonds:ex.bonds };
        const fm = formulaOf(wg, buildAdj(wg).adj);
        const nm = isTropane ? "8-methyl-8-azabicyclo[3.2.1]octane"
          : "methyl (1R,2R,3S,5S)-3-(benzoyloxy)-8-methyl-8-azabicyclo[3.2.1]octane-2-carboxylate";
        const ringIds = mol.numbering ? Object.values(mol.numbering) : [];
        const offRing = mol.atoms.map(a=>a.id).filter(id=>!ringIds.includes(id));
        const tropParts = isTropane
          ? [{ text:"8-methyl-", kind:"substituent", atoms:offRing, locs:[8],
               label:"a methyl group on the bridging nitrogen at position 8" },
             { text:"8-aza", kind:"substituent",
               atoms:mol.numbering ? [mol.numbering[8]] : [], numbered:true,
               label:"position 8 is nitrogen rather than carbon \u2014 aza means nitrogen" },
             { text:"bicyclo[3.2.1]octane", kind:"parent", atoms:ringIds, numbered:true,
               label:"two bridgehead atoms joined by bridges of 3, 2 and 1 atoms; eight ring atoms in all" }]
          : [{ text:"methyl ", kind:"substituent", atoms:offRing,
               label:"the alcohol half of the ester at position 2 \u2014 a methyl ester" },
             { text:"(1R,2R,3S,5S)-", kind:"stereo", atoms:ringIds,
               label:"the three-dimensional arrangement at four ring positions; 2 and 3 are set by wedge and dashed bonds, while 1 and 5 are fixed by the shape of the cage" },
             { text:"3-(benzoyloxy)-", kind:"substituent", atoms:offRing, locs:[3],
               label:"a benzoate ester on ring position 3 \u2014 a benzene ring joined through a C(=O)O linkage" },
             { text:"8-methyl-", kind:"substituent", atoms:offRing, locs:[8],
               label:"a methyl group on the bridging nitrogen at position 8" },
             { text:"8-aza", kind:"substituent",
               atoms:mol.numbering ? [mol.numbering[8]] : [], numbered:true,
               label:"position 8 is nitrogen rather than carbon \u2014 aza means nitrogen" },
             { text:"bicyclo[3.2.1]octane", kind:"parent", atoms:ringIds, numbered:true,
               label:"the tropane cage: two bridgeheads joined by bridges of 3, 2 and 1 atoms" },
             { text:"-2-carboxylate", kind:"suffix", atoms:offRing, locs:[2],
               label:"the ester group at ring position 2; carboxylate names the acid half of an ester" }];
        const joined = tropParts.map(x=>x.text).join("");
        return { ok:true, mol, formula:fm.formula, mass:fm.mass,
          parts: joined===nm ? tropParts : undefined,
          locants: mol.numbering
            ? Object.fromEntries(Object.entries(mol.numbering).map(([k,v])=>[v,k]))
            : undefined,
          name:nm, canonical:nm, stereo:{centres:[],doubles:[]},
          steps:[["Ring system","An 8-azabicyclo[3.2.1]octane core \u2014 the tropane skeleton, with nitrogen bridging positions 1 and 5."],
            isTropane?null:["Substituents","A methyl ester at C-2 and a benzoate ester at C-3, with a methyl on the nitrogen."],
            ["Assembly", `Result: ${nm}`]].filter(Boolean),
          note: isTropane ? undefined : (placed===2
            ? "The configurations at C-2 and C-3 are drawn with wedge and dashed bonds. The two bridgehead centres are fixed by the shape of the bicyclic frame."
            : "Drawn flat \u2014 the wedges for this frame couldn't be placed unambiguously.") };
      }
    }
    /* Every fused ring system, with its substituents and suffix groups, comes
       through one route driven by the same template table the namer uses. */
    {
      const SUF = { ol:"alcohol", amine:"amine", thiol:"thiol", one:"ketone", al:"aldehyde" };
      const sufRe = new RegExp("^(.*?)-(\\d+[a-z]?(?:,\\d+[a-z]?)*)-(di|tri|tetra)?(" +
                               Object.keys(SUF).join("|") + ")$");
      let body = s, sufLocs = null, sufKind = null;
      const sm = s.match(sufRe);
      if(sm){ body = sm[1]; sufLocs = sm[2].split(","); sufKind = SUF[sm[4]]; }
      const pre = parsePrefixes(body, REPAIR);
      if(!pre.error && !pre.loose.length){
        const stem = pre.rest;
        const tpl = FUSED_TEMPLATES.find(t =>
          t.name===stem || (sufLocs && t.name.replace(/e$/,"")===stem));
        if(tpl){
          /* positions that will carry a carbonyl, or a heteroatom bearing a
             substituent, cannot also hold a ring double bond */
          const noDouble = new Set();
          if(sufKind==="ketone" || sufKind==="aldehyde")
            sufLocs.forEach(l=>noDouble.add(String(l)));
          for(const su of pre.subs){
            const idx = tpl.perimeter.indexOf(String(su.loc));
            if(idx>=0 && tpl.els[idx]!=="C") noDouble.add(String(su.loc));
          }
          const built = buildFromTemplate(tpl, noDouble);
          if(!built) return err("unsupported", `${tpl.name} couldn't be constructed.`);
          const idAtLoc = l => {
            for(const [id,lab] of built.labels) if(lab===String(l)) return id;
            return null;
          };
          const state = { atoms:built.atoms, bonds:built.bonds,
                          nextId:Math.max(...built.atoms.map(a=>a.id))+1,
                          used:{}, base:{} };
          const cx = built.atoms.reduce((t,a)=>t+a.x,0)/built.atoms.length;
          const cy = built.atoms.reduce((t,a)=>t+a.y,0)/built.atoms.length;
          const hang = (loc, spec) => {
            const hid = idAtLoc(loc);
            if(hid===null) return `Position ${loc} isn't part of ${tpl.name}.`;
            const h = state.atoms.find(a=>a.id===hid);
            state.base[hid] = Math.atan2(h.y-cy, h.x-cx);
            attach(state, hid, spec);
            return null;
          };
          for(const su of pre.subs){
            const spec = subSpec(su.name);
            if(!spec || spec.ring) return err("unsupported",
              `"${su.name}" isn't supported on a ring system yet.`);
            const e2 = hang(su.loc, spec);
            if(e2) return err("impossible", e2);
          }
          if(sufKind) for(const l of sufLocs){
            const spec = sufKind==="alcohol" ? { chain:[{el:"O"}] }
                       : sufKind==="amine"   ? { chain:[{el:"N"}] }
                       : sufKind==="thiol"   ? { chain:[{el:"S"}] }
                       : { chain:[{el:"O", order:2}] };
            const e2 = hang(l, spec);
            if(e2) return err("impossible", e2);
          }
          const mol = { atoms:state.atoms, bonds:state.bonds };
          if(stereoWanted && stereoWanted.length)
            return err("impossible",
              `Ring positions on ${tpl.name} are flat aromatic carbons, so a stereo-descriptor has no meaning there.`);
          const chk = nameGraph(mol);
          if(!chk.ok) return { ok:false, err:chk.err, message:chk.message, mol };
          const res = { ok:true, mol, formula:chk.formula, mass:chk.mass,
            name:chk.name, canonical:chk.name, steps:chk.steps,
            stereo:chk.stereo, parts:chk.parts, locants:chk.locants };
          if(indicatedH)
            res.note = `The ${indicatedH}H- prefix marks which ring atom carries the hydrogen; the ring it names is ${chk.name}.`;
          else if(chk.name.replace(/\s+/g,"") !== s)
            { const d2 = classifyDifference(raw, chk.name);
              if(d2){ res.note = d2.message; res.issue = d2.issue; } }
          return res;
        }
      }
    }

    const fusedHet = { indole:1, benzofuran:1, benzothiophene:1, quinoline:1, isoquinoline:1 };
    if(fusedHet[s]){
      const mol = buildFusedHetero(s);
      if(!mol) return err("unsupported", `${s} couldn't be constructed.`);
      if(stereoAsked && stereoAsked.length){
        const ap = applyStereoByTrial(mol, stereoAsked);
        if(!ap.ok) return err("impossible",
          `Position ${ap.loc ?? "?"} isn't a stereocentre in this structure, so ${ap.label} has no meaning there.`);
      }
      const chk = nameGraph(mol);
      return chk.ok
        ? { ok:true, mol, formula:chk.formula, mass:chk.mass, name:chk.name,
            canonical:chk.name, steps:chk.steps, stereo:chk.stereo }
        : { ok:false, err:chk.err, message:chk.message, mol };
    }
    const fusedNames = { naphthalene:1, anthracene:1, phenanthrene:1 };
    if(polyRest && (fusedNames[polyRest] || /^bicyclo\[|^spiro\[/.test(polyRest)) &&
       (polyPre.subs.length || polySuffix)){
      let skel=null;
      if(fusedNames[polyRest]) skel = buildFused(polyRest);
      else {
        const b = polyRest.match(/^bicyclo\[(\d+)\.(\d+)\.(\d+)\]([a-z]+)ane$/);
        const sp = polyRest.match(/^spiro\[(\d+)\.(\d+)\]([a-z]+)ane$/);
        if(b) skel = buildBicyclo(+b[1],+b[2],+b[3], ROOT.indexOf(b[4]));
        else if(sp) skel = buildSpiro(+sp[1],+sp[2], ROOT.indexOf(sp[3]));
      }
      if(!skel) return err("impossible", "That ring skeleton couldn't be built.");
      if(polyPre.subs.length > 3)
        return err("unsupported", "More than three substituents on a fused or spiro system isn't supported yet.");
      const allSubs = [...polyPre.subs];
      if(polySuffix) allSubs.push({ loc:polySuffix.loc,
        name: polySuffix.kind==="ol" ? "hydroxy" : polySuffix.kind==="amine" ? "amino" : "sulfanyl" });
      const built = placeOnSkeleton(skel, allSubs, s);
      if(!built || built._name)
        return err("impossible",
          `No arrangement on ${polyRest} gives the locants in "${raw.trim()}". Check the position numbers.`);
      if(stereoAsked && stereoAsked.length){
        const ap = applyStereoByTrial(built, stereoAsked);
        if(!ap.ok) return err("impossible",
          `Position ${ap.loc ?? "?"} isn't a stereocentre in this structure, so ${ap.label} has no meaning there.`);
      }
      const chk = nameGraph(built);
      return chk.ok
        ? { ok:true, mol:built, formula:chk.formula, mass:chk.mass, name:chk.name,
            canonical:chk.name, steps:chk.steps, stereo:chk.stereo }
        : { ok:false, err:chk.err, message:chk.message, mol:built };
    }
    const bare = s.replace(/^.*?-/, s.includes("-") && /^\d/.test(s) ? "" : "$&");
    if(fusedNames[s]){
      const mol = buildFused(s);
      if(!mol) return err("unsupported", `${s} couldn't be constructed.`);
      if(stereoAsked && stereoAsked.length){
        const ap = applyStereoByTrial(mol, stereoAsked);
        if(!ap.ok) return err("impossible",
          `Position ${ap.loc ?? "?"} isn't a stereocentre in this structure, so ${ap.label} has no meaning there.`);
      }
      const chk = nameGraph(mol);
      return chk.ok
        ? { ok:true, mol, formula:chk.formula, mass:chk.mass, name:chk.name,
            canonical:chk.name, steps:chk.steps, stereo:chk.stereo }
        : { ok:false, err:chk.err, message:chk.message, mol };
    }
    /* heteroatom replacement prefixes: 8-azabicyclo[3.2.1]octane, oxolane etc. */
    const hetPre = s.match(/^(\d+(?:,\d+)*)-((?:aza|oxa|thia)+)(.+)$/);
    if(hetPre){
      const locs = hetPre[1].split(",").map(Number);
      const kinds = hetPre[2].match(/aza|oxa|thia/g)
        .map(k=>({ aza:"N", oxa:"O", thia:"S" }[k]));
      const inner = parseNameInner(hetPre[3], opts);
      if(!inner.ok) return inner;
      /* find the numbering of the underlying skeleton */
      const b2 = hetPre[3].match(/^bicyclo\[(\d+)\.(\d+)\.(\d+)\]([a-z]+)ane$/);
      let numbering = null;
      if(b2){
        const built = buildBicyclo(+b2[1],+b2[2],+b2[3], ROOT.indexOf(b2[4]));
        numbering = built && built.numbering;
      }
      const mol = { atoms:inner.mol.atoms.map(a=>({...a})),
                    bonds:inner.mol.bonds.map(b=>({...b})) };
      for(let i=0;i<locs.length;i++){
        const el = kinds[Math.min(i, kinds.length-1)];
        const targetId = numbering ? numbering[locs[i]] : locs[i];
        const at = mol.atoms.find(a=>a.id===targetId);
        if(!at) return err("impossible",
          `Position ${locs[i]} isn't part of that ring system.`);
        at.el = el;
      }
      const chk = nameGraph(mol);
      const nm = chk.ok ? chk.name : s;
      const ex = expandSugar(normalise(mol));
      const wg = { atoms:ex.atoms, bonds:ex.bonds };
      const fm = formulaOf(wg, buildAdj(wg).adj);
      /* prefer the namer's own segmentation when it can produce one */
      if(chk.ok && chk.parts && chk.parts.length)
        return { ok:true, mol, formula:fm.formula, mass:fm.mass,
          name:nm, canonical:nm, parts:chk.parts, locants:chk.locants,
          stereo:chk.stereo || {centres:[],doubles:[]}, steps:chk.steps };
      return { ok:true, mol, formula:fm.formula, mass:fm.mass,
        name:nm, canonical:nm, stereo:{centres:[],doubles:[]},
        steps:[["Ring system",
          `A ${hetPre[3]} skeleton with ${kinds.join(" and ")} replacing carbon at ${locs.join(", ")}.`],
          ["Assembly", `Result: ${nm}`]] };
    }
    /* unsaturated bridged systems: bicyclo[2.2.1]hept-2-ene */
    const bicEne = s.match(/^bicyclo\[(\d+)\.(\d+)\.(\d+)\]([a-z]+?)a?-(\d+(?:,\d+)*)-(?:di|tri)?ene$/);
    if(bicEne){
      const total = ROOT.indexOf(bicEne[4]);
      const skel = total>0 ? buildBicyclo(+bicEne[1],+bicEne[2],+bicEne[3],total) : null;
      if(!skel) return err("impossible",
        `bicyclo[${bicEne[1]}.${bicEne[2]}.${bicEne[3]}] needs ${+bicEne[1]+ +bicEne[2]+ +bicEne[3]+2} ring atoms.`);
      const mol = { atoms:skel.atoms.map(a=>({...a})), bonds:skel.bonds.map(b=>({...b})) };
      const N = skel.numbering;
      for(const l of bicEne[5].split(",").map(Number)){
        const a1 = N[l], a2 = N[l+1] ?? N[1];
        const bd = mol.bonds.find(b=>(b.a===a1&&b.b===a2)||(b.a===a2&&b.b===a1));
        if(!bd) return err("impossible",
          `There is no bond between positions ${l} and ${l+1} in that ring system.`);
        bd.order = 2;
      }
      const chk = nameGraph(mol);
      return chk.ok
        ? { ok:true, mol, formula:chk.formula, mass:chk.mass, name:chk.name,
            canonical:chk.name, steps:chk.steps, stereo:chk.stereo,
            parts:chk.parts, locants:chk.locants }
        : { ok:false, err:chk.err, message:chk.message, mol };
    }
    const bic = s.match(/^bicyclo\[(\d+)\.(\d+)\.(\d+)\]([a-z]+)ane$/);
    if(bic){
      const total = ROOT.indexOf(bic[4]);
      const mol = total>0 ? buildBicyclo(+bic[1],+bic[2],+bic[3],total) : null;
      if(!mol) return err("impossible",
        `bicyclo[${bic[1]}.${bic[2]}.${bic[3]}] needs ${+bic[1]+ +bic[2]+ +bic[3]+2} ring atoms, but ${bic[4]}ane names ${ROOT.indexOf(bic[4])||"?"}.`);
      if(stereoAsked && stereoAsked.length){
        const ap = applyStereoByTrial(mol, stereoAsked);
        if(!ap.ok) return err("impossible",
          `Position ${ap.loc ?? "?"} isn't a stereocentre in this structure, so ${ap.label} has no meaning there.`);
      }
      const chk = nameGraph(mol);
      return chk.ok
        ? { ok:true, mol, formula:chk.formula, mass:chk.mass, name:chk.name,
            canonical:chk.name, steps:chk.steps, stereo:chk.stereo }
        : { ok:false, err:chk.err, message:chk.message, mol };
    }
    const spi = s.match(/^spiro\[(\d+)\.(\d+)\]([a-z]+)ane$/);
    if(spi){
      const total = ROOT.indexOf(spi[3]);
      const mol = total>0 ? buildSpiro(+spi[1],+spi[2],total) : null;
      if(!mol) return err("impossible",
        `spiro[${spi[1]}.${spi[2]}] needs ${+spi[1]+ +spi[2]+1} ring atoms, but ${spi[3]}ane names ${ROOT.indexOf(spi[3])||"?"}.`);
      if(stereoAsked && stereoAsked.length){
        const ap = applyStereoByTrial(mol, stereoAsked);
        if(!ap.ok) return err("impossible",
          `Position ${ap.loc ?? "?"} isn't a stereocentre in this structure, so ${ap.label} has no meaning there.`);
      }
      const chk = nameGraph(mol);
      return chk.ok
        ? { ok:true, mol, formula:chk.formula, mass:chk.mass, name:chk.name,
            canonical:chk.name, steps:chk.steps, stereo:chk.stereo }
        : { ok:false, err:chk.err, message:chk.message, mol };
    }
    /* heterocycles, optionally substituted */
    /* Check the table before splitting off prefixes: "1,3-dioxolane" would
       otherwise match the "oxo" substituent inside "dioxo". */
    const stripped = s.replace(/^\d+(,\d+)*-/, "");
    const hp = HET_SPEC[s]        ? { subs:[], loose:[], rest:s }
             : HET_SPEC[stripped] ? { subs:[], loose:[], rest:stripped }
             : parsePrefixes(s, REPAIR);
    if(!hp.error && HET_SPEC[hp.rest] && hp.loose && hp.loose.length)
      return err("ambiguous",
        `On ${hp.rest} the ring positions aren't equivalent, so each substituent needs a locant — for example 2-${hp.loose[0]}${hp.rest}.`);
    if(!hp.error && HET_SPEC[hp.rest] && !hp.loose.length){
      const spec = HET_SPEC[hp.rest];
      for(const su of hp.subs){
        if(su.loc<1 || su.loc>spec.n)
          return err("impossible", `Locant ${su.loc} is outside a ${spec.n}-membered ring.`);
        if(!subSpec(su.name))
          return err("unsupported", `"${su.name}" isn't supported on a ring yet.`);
      }
      const mol = buildHetero(spec, hp.subs);
      if(!mol) return err("unsupported", "That substituent isn't supported on a heterocycle yet.");
      /* a descriptor written inside a substituent has to be drawn, not ignored */
      const ringSubStereo = hp.subs.flatMap(su=>{
        const sp = subSpec(su.name);
        return sp && sp.innerStereo
          ? sp.innerStereo.split(",").map(x=>x.trim().replace(/^\d+/,"").toUpperCase())
          : [];
      });
      if(ringSubStereo.length){
        const ap = applySubstituentGeometry(mol, ringSubStereo);
        if(!ap.ok) return err("unsupported",
          `The geometry ${ringSubStereo.join(",")} inside that substituent couldn't be set, so the structure isn't drawn rather than drawn wrongly.`);
      }
      const chk = nameGraph(mol);
      if(!chk.ok) return { ok:false, err:chk.err, message:chk.message, mol };
      const res = { ok:true, mol, formula:chk.formula, mass:chk.mass, name:chk.name,
                    canonical:chk.name, steps:chk.steps, stereo:chk.stereo };
      if(indicatedH)
        res.note = `The ${indicatedH}H- prefix marks which ring atom carries the hydrogen; the ring it names is ${chk.name}.`;
      else if(chk.name.replace(/\s+/g,"") !== s)
        { const d2 = classifyDifference(raw, chk.name);
          if(d2){ res.note = d2.message; res.issue = d2.issue; } }
      return res;
    }
  }

  /* ---- two-word tails handled by rewriting ---- */
  let esterAlkyl=null, acylHalide=null, isAnhydride=false;
  let m;
  if((m = s.match(/^(methyl|ethyl|propyl|butyl|pentyl|propan-2-yl|isopropyl|2-methylpropyl|isobutyl|tert-butyl|2-methylpropan-2-yl|butan-2-yl|sec-butyl)(.+)oate$/))){
    esterAlkyl = m[1];
    s = m[2] + "oicacid";
  } else if((m = s.match(/^(.+)oyl(chloride|bromide|fluoride|iodide)$/))){
    acylHalide = HALIDE_INV[m[2]];
    s = m[1] + "oicacid";
  } else if((m = s.match(/^(.+)oicanhydride$/))){
    isAnhydride = true;
    s = m[1] + "oicacid";
  }

  /* ---- aromatic retained parents ---- */
  const aromaticBase = { benzene:null, phenol:"alcohol", aniline:"amine",
                         benzoicacid:"ringcarbox", benzaldehyde:"ringcarbald",
                         benzonitrile:"ringcarbonitrile" };
  /* older styles put the suffix locant in front: 2-butanol, 2-decanone */
  {
    let m2;
    m2 = s.match(/^(?:(.*?)-)?(\d+(?:,\d+)*)-((?:meth|eth|prop|but|pent|hex|hept|oct|non|dec|undec|dodec)a?)((?:di|tri)?(?:ene|yne))$/);
    if(m2) s = (m2[1]?m2[1]+"-":"")+m2[3]+"-"+m2[2]+"-"+m2[4];
    m2 = s.match(/^(?:(.*?)-)?(\d+(?:,\d+)*)-(meth|eth|prop|but|pent|hex|hept|oct|non|dec|undec|dodec)an(ol|one|amine|thiol)$/);
    if(m2) s = (m2[1]?m2[1]+"-":"")+m2[3]+"an-"+m2[2]+"-"+m2[4];
  }

  let pfx = parsePrefixes(s, REPAIR);
  if(pfx.error) return pfx.error;
  let { subs, loose, rest } = pfx;

  let parentKind=null, parentN=0, aromatic=false, pcg=null, pcgLocs=[], eneL=[], yneL=[];
  let softNote = null;
  const subStereo = [];

  if(rest in aromaticBase){
    parentKind="ring"; parentN=6; aromatic=true; pcg=aromaticBase[rest];
    if(pcg) pcgLocs=[1];
  } else {
    /* cyclo? */
    let cyclo=false, body=rest;
    if(body.startsWith("cyclo")){ cyclo=true; body=body.slice(5); }
    const rm = body.match(new RegExp("^"+ROOTRE+"(.*)$"));
    if(!rm){
      const hint = suggest(raw.trim().toLowerCase().replace(/\s+/g,""));
      return err("unsupported",
        hint ? `That name wasn't recognised. Did you mean ${hint}?`
             : "The parent root wasn't recognised. This engine names meth- to icos- parents, rings, the benzene family and a long list of common names.");
    }
    parentN = ROOT.indexOf(rm[1]);
    parentKind = cyclo ? "ring" : "chain";
    let tail = rm[2];

    /* ring-specific suffixes */
    if(cyclo){
      if(tail==="anecarboxylicacid"){ pcg="ringcarbox"; tail=""; }
      else if(tail==="anecarbaldehyde"){ pcg="ringcarbald"; tail=""; }
      else if(tail==="anecarbonitrile"){ pcg="ringcarbonitrile"; tail=""; }
    }

    /* strip a leading 'a' used before di/tri (pentane-2,4-dione) */
    if(/^a(?=n?[-e])/.test(tail)) { /* keep; handled by segment parser */ }

    /* segment parser: -<locs>-<mult><kind> repeated */
    const KINDS = "(oicacid|oate|amide|amine|nitrile|carbaldehyde|carboxylicacid|thiol|ene|en|yne|yn|one|ol|al)";
    let guard=0;
    while(tail && guard++<8){
      if(tail==="ane"||tail==="an"||tail==="e"){ tail=""; break; }
      let g = tail.match(new RegExp("^(?:an?e?)?-?(\\d+(?:,\\d+)*)?-?(di|tri|tetra|penta|hexa|hepta|octa)?"+KINDS+"(.*)$"));
      if(!g)
        return err("unsupported", `The ending "${rm[2]}" wasn't recognised. Supported suffixes include -ane, -ene, -yne, -ol, -one, -al, -oic acid, -amine, -amide and -nitrile.`);
      const locs = g[1] ? g[1].split(",").map(Number) : null;
      const mult = g[2] ? MULTN[g[2]] : 1;
      const kind = g[3];
      tail = g[4];
      const setP=(k,defLocs)=>{
        if(pcg && pcg!==k) return err("unsupported","This engine names one principal group family per molecule.");
        pcg=k; pcgLocs = locs || defLocs;
        return null;
      };
      if(kind==="ene"||kind==="en"){ eneL = locs || [1]; if(mult>1 && !locs) return err("ambiguous","A multiplied -ene needs a locant for each double bond."); }
      else if(kind==="yne"||kind==="yn"){ yneL = locs || [1]; }
      else if(kind==="ol"){ const e=setP("alcohol", locs||[1]); if(e) return e; }
      else if(kind==="one"){ const e=setP("ketone", locs||null); if(e) return e; }
      else if(kind==="amine"){ const e=setP("amine", locs||[1]); if(e) return e; }
      else if(kind==="thiol"){ const e=setP("thiol", locs||[1]); if(e) return e; }
      else if(kind==="al"){ const e=setP("aldehyde", mult>1?[1,parentN]:[1]); if(e) return e;
        if(locs) return err("malformed","-al takes no locant — the aldehyde carbon is always C-1."); }
      else if(kind==="oicacid"){ const e=setP("acid", mult>1?[1,parentN]:[1]); if(e) return e;
        if(locs) return err("malformed","-oic acid takes no locant — the carboxyl carbon is always C-1."); }
      else if(kind==="amide"){ const e=setP("amide", mult>1?[1,parentN]:[1]); if(e) return e; }
      else if(kind==="nitrile"){ const e=setP("nitrile", mult>1?[1,parentN]:[1]); if(e) return e; }
      else if(kind==="carboxylicacid"){ const e=setP("ringcarbox",[1]); if(e) return e; }
      else if(kind==="carbaldehyde"){ const e=setP("ringcarbald",[1]); if(e) return e; }
    }

    /* ketone with no locant: only unambiguous for small chains */
    if(pcg==="ketone" && !pcgLocs){
      if(parentKind==="ring") pcgLocs=[1];
      else if(parentN<3) return err("impossible","A ketone needs a carbon on each side of the C=O — the smallest is propan-2-one.");
      else { pcgLocs=[2];
        softNote = "No position was given, so the carbonyl has been placed at carbon 2."; }
    }
    /* A group written without a locant goes to the first position it can take.
       That is nearly always what was meant, so accept it and say what was done. */
    if((pcg==="alcohol"||pcg==="amine"||pcg==="thiol") &&
       parentKind==="chain" && parentN>2 && !/\d/.test(rm[2]))
      softNote = "No position was given, so the group has been placed at carbon 1.";
  }

  if(parentN<1) return err("unsupported","That parent size isn't supported.");
  if(parentKind==="ring" && parentN<3) return err("impossible","A ring needs at least three carbons.");

  /* loose (locant-free) substituents */
  if(loose.length){
    const single = loose.length===1 && subs.length===0;
    const noLocOK = single && ((parentKind==="ring" && !pcg) || (parentKind==="chain" && parentN<=2 && !pcg && !eneL.length && !yneL.length));
    if(noLocOK) subs.push({ loc:1, name:loose[0] });
    else if(parentN===1) loose.forEach(nm=>subs.push({ loc:1, name:nm }));
    else return err("ambiguous","This name needs locants — give a position number for each substituent.");
  }

  /* validate locants */
  const all=[...subs.map(x=>x.loc), ...(pcgLocs||[]), ...eneL, ...yneL];
  for(const l of all)
    if(l<1||l>parentN) return err("impossible", `Locant ${l} is outside a ${parentN}-carbon parent.`);
  if(pcg==="ketone") for(const l of pcgLocs){
    if(parentKind!=="chain") continue;
    /* a terminal carbonyl is still a ketone when a carbon substituent supplies
       the second neighbour, as in 1-phenylethan-1-one (acetophenone) */
    const carbonSub = subs.some(su => su.loc===l &&
      (ALKYL[su.name] || su.name==="phenyl" || /^cyclo.*yl$/.test(su.name)));
    if((l<2||l>parentN-1) && !carbonSub)
      return err("impossible", `A ketone carbonyl can't sit at carbon ${l} of a ${parentN}-carbon chain — it needs a carbon on each side.`);
  }
  for(const l of eneL) if(parentKind==="chain" && l>parentN-1)
    return err("impossible", `A double bond can't start at carbon ${l} of a ${parentN}-carbon chain.`);

  /* ---------------- build ---------------- */
  const base = parentKind==="ring" ? layoutRing(parentN) : layoutChain(parentN);
  const state = { atoms:base.atoms, bonds:base.bonds, nextId:parentN+1,
                  used:{}, base:{ ...base.base } };
  const idAt = l => base.ids[l-1];

  /* unsaturation */
  for(const l of eneL){
    const a=idAt(l), b= parentKind==="ring" && l===parentN ? base.ids[0] : idAt(l+1);
    const bd=state.bonds.find(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));
    if(!bd) return err("impossible", `There's no bond at position ${l} to make a double bond.`);
    bd.order=2;
    if(!stereoWanted.some(w=>(w.label==="E"||w.label==="Z")))
      bd.stereo="either";          /* the name didn't specify geometry */
  }
  for(const l of yneL){
    const a=idAt(l), b=idAt(l+1);
    const bd=state.bonds.find(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));
    if(!bd) return err("impossible", `There's no bond at position ${l} to make a triple bond.`);
    bd.order=3;
  }
  if(aromatic){
    for(let i=0;i<6;i++){
      const a=base.ids[i], b=base.ids[(i+1)%6];
      const bd=state.bonds.find(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));
      bd.order = i%2===0 ? 2 : 1;
    }
  }

  /* principal group */
  const addAt=(loc,spec)=>attach(state, idAt(loc), spec);
  if(pcg==="alcohol") pcgLocs.forEach(l=>addAt(l,{chain:[{el:"O"}]}));
  else if(pcg==="thiol") pcgLocs.forEach(l=>addAt(l,{chain:[{el:"S"}]}));
  else if(pcg==="amine") pcgLocs.forEach(l=>addAt(l,{chain:[{el:"N"}]}));
  else if(pcg==="ketone") pcgLocs.forEach(l=>addAt(l,{chain:[{el:"O",order:2}]}));
  else if(pcg==="aldehyde") pcgLocs.forEach(l=>addAt(l,{chain:[{el:"O",order:2}]}));
  else if(pcg==="nitrile") pcgLocs.forEach(l=>addAt(l,{chain:[{el:"N",order:3}]}));
  else if(pcg==="acid"){
    pcgLocs.forEach(l=>{ addAt(l,{chain:[{el:"O",order:2}]}); addAt(l,{chain:[{el:"O"}]}); });
  } else if(pcg==="amide"){
    pcgLocs.forEach(l=>{ addAt(l,{chain:[{el:"O",order:2}]}); addAt(l,{chain:[{el:"N"}]}); });
  } else if(pcg==="ringcarbox"){
    const c=addAt(1,{chain:[{}]});
    attach(state,c,{chain:[{el:"O",order:2}]}); attach(state,c,{chain:[{el:"O"}]});
  } else if(pcg==="ringcarbald"){
    const c=addAt(1,{chain:[{}]});
    attach(state,c,{chain:[{el:"O",order:2}]});
  } else if(pcg==="ringcarbonitrile"){
    const c=addAt(1,{chain:[{}]});
    attach(state,c,{chain:[{el:"N",order:3}]});
  }

  /* ester / acyl halide / anhydride rebuilds */
  if(esterAlkyl){
    const ohAtom = state.atoms.find(a=>a.el==="O" &&
      state.bonds.some(b=>((b.a===a.id&&b.b===idAt(1))||(b.b===a.id&&b.a===idAt(1))) && b.order===1));
    if(!ohAtom) return err("unsupported","That ester couldn't be built.");
    const aspec = SUB_GRAPH[esterAlkyl]
      ? { graph:SUB_GRAPH[esterAlkyl] }
      : { chain:Array.from({length:ALKYL[esterAlkyl]},()=>({})) };
    attach(state, ohAtom.id, aspec);
  }
  if(acylHalide){
    const ohAtom = state.atoms.find(a=>a.el==="O" &&
      state.bonds.some(b=>((b.a===a.id&&b.b===idAt(1))||(b.b===a.id&&b.a===idAt(1))) && b.order===1));
    if(!ohAtom) return err("unsupported","That acyl halide couldn't be built.");
    ohAtom.el = acylHalide;
  }
  if(isAnhydride){
    const ohAtom = state.atoms.find(a=>a.el==="O" &&
      state.bonds.some(b=>((b.a===a.id&&b.b===idAt(1))||(b.b===a.id&&b.a===idAt(1))) && b.order===1));
    if(!ohAtom) return err("unsupported","That anhydride couldn't be built.");
    const acyl = attach(state, ohAtom.id, { chain:Array.from({length:parentN},()=>({})) });
    const firstAcyl = state.atoms[state.atoms.length-parentN].id;
    attach(state, firstAcyl, { chain:[{el:"O",order:2}] });
  }

  /* substituents */
  for(const su of subs){
    const spec=subSpec(su.name);
    if(!spec) return err("unsupported", `"${su.name}" isn't a substituent this engine knows.`);
    if(spec.ring){
      const r=layoutRing(spec.ring);
      const off=state.nextId-1;
      const anchor=state.atoms.find(a=>a.id===idAt(su.loc));
      const bAng=state.base[idAt(su.loc)] ?? -90*DEG;
      const ddx=Math.round(anchor.x + Math.cos(bAng)*(BOND+34) - 100);
      const ddy=Math.round(anchor.y + Math.sin(bAng)*(BOND+34) - 100);
      for(const a of r.atoms) state.atoms.push({ id:a.id+off, x:a.x+ddx, y:a.y+ddy });
      for(const b of r.bonds) state.bonds.push({ a:b.a+off, b:b.b+off, order:b.order, stereo:null });
      if(spec.aromatic) for(let i=0;i<6;i++){
        const bd=state.bonds.find(x=>(x.a===r.ids[i]+off&&x.b===r.ids[(i+1)%6]+off)||(x.b===r.ids[i]+off&&x.a===r.ids[(i+1)%6]+off));
        if(bd) bd.order = i%2===0?2:1;
      }
      state.bonds.push({ a:idAt(su.loc), b:1+off, order:1, stereo:null });
      state.nextId = off + spec.ring + 1;
      /* the ring's own substituents, numbered from the attachment atom */
      if(spec.ringSubs && spec.ringSubs.length){
        const cx = state.atoms.filter(a=>a.id>off && a.id<=off+spec.ring)
          .reduce((s,a)=>s+a.x,0)/spec.ring;
        const cy = state.atoms.filter(a=>a.id>off && a.id<=off+spec.ring)
          .reduce((s,a)=>s+a.y,0)/spec.ring;
        for(const rs of spec.ringSubs){
          const hostId = off + rs.loc;
          const host = state.atoms.find(a=>a.id===hostId);
          if(!host) return err("impossible",
            `Position ${rs.loc} is outside that ring substituent.`);
          state.base[hostId] = Math.atan2(host.y-cy, host.x-cx);
          const inner = subSpec(rs.name, true) || subSpec(rs.name);
          if(!inner || inner.ring) return err("unsupported",
            `"${rs.name}" isn't supported inside a ring substituent yet.`);
          attach(state, hostId, inner);
        }
      }
      continue;
    }
    addAt(su.loc, spec);
  }

  /* N-substituents attach to the nitrogen of the principal amine or amide */
  if(nSubsAsked.length){
    const nAtom = state.atoms.find(a=>a.el==="N" &&
      state.bonds.filter(b=>b.a===a.id||b.b===a.id).every(b=>b.order===1));
    if(!nAtom) return err("impossible",
      "N- prefixes need a nitrogen to sit on, and this name doesn't have a suitable one.");
    for(const nm of nSubsAsked){
      const sp = subSpec(nm);
      if(!sp || sp.ring) return err("unsupported", `"${nm}" isn't supported as an N-substituent yet.`);
      attach(state, nAtom.id, sp);
    }
  }

  /* a descriptor written inside a substituent must actually be drawn */
  if(subStereo.length){
    const g0 = { atoms:state.atoms, bonds:state.bonds };
    const ap = applySubstituentGeometry(g0, subStereo);
    if(!ap.ok) return err("unsupported",
      `The geometry ${subStereo.join(",")} inside that substituent couldn't be set, so the structure isn't drawn rather than drawn wrongly.`);
  }

  /* ---------------- verify ---------------- */
  let graph = { atoms:state.atoms, bonds:state.bonds };
  let check = nameGraph(graph);
  if(!check.ok){
    /* Hand back the structure anyway. A name that describes an impossible
       molecule is far easier to understand when you can see the clash. */
    const out = { ok:false, err:check.err, message:check.message, mol:graph };
    if(check.err==="valence")
      out.message = check.message.replace(/Adjust the bonding and try again\.$/,
        "The structure below shows what this name describes — the marked atom has more bonds than carbon can form.");
    return out;
  }

  /* ---------------- apply stereochemistry by trial ---------------- */
  if(stereoWanted.length){
    const norm = normalise(graph);
    const exp = expandSugar(norm);
    const wg = { atoms:exp.atoms, bonds:exp.bonds };
    const { adj } = buildAdj(wg);
    const byId = new Map(wg.atoms.map(a=>[a.id,a]));

    for(const want of stereoWanted){
      if(want.label==="R"||want.label==="S"){
        const target = want.loc ? idAt(want.loc) : null;
        const candidates = target ? [target] : wg.atoms.filter(a=>a.el==="C").map(a=>a.id);
        let done=false;
        for(const c of candidates){
          const probe = assignRS(c, wg, adj, byId);
          if(!probe || !probe.stereogenic) continue;
          /* pick a bond from this centre to carry the wedge: prefer a terminal one */
          /* prefer a bond to a terminal atom: a wedge on a ring bond is
             ambiguous and often yields no configuration at all */
          const degOf = id => graph.bonds.filter(b=>b.a===id||b.b===id).length;
          const cand = graph.bonds.filter(b=>b.a===c||b.b===c)
            .sort((x,y)=>{
              const ox = degOf(x.a===c?x.b:x.a), oy = degOf(y.a===c?y.b:y.a);
              return ox-oy;
            });
          if(!cand.length) continue;
          let placed=false;
          for(const b of cand){
            const other = b.a===c?b.b:b.a;
            const orig = { a:b.a, b:b.b, stereo:b.stereo };
            b.a=c; b.b=other; b.stereo="wedge";
            const g2 = expandSugar(normalise(graph));
            const wg2 = { atoms:g2.atoms, bonds:g2.bonds };
            const adj2 = buildAdj(wg2).adj;
            const by2 = new Map(wg2.atoms.map(a=>[a.id,a]));
            let res = assignRS(c, wg2, adj2, by2);
            if(res && res.config){
              if(res.config!==want.label) b.stereo="dash";
              placed=true; break;
            }
            b.a=orig.a; b.b=orig.b; b.stereo=orig.stereo;
          }
          if(!placed) return err("unsupported","That stereocentre couldn't be drawn unambiguously.");
          done=true; break;
        }
        if(!done) return err("impossible", want.loc
          ? `Carbon ${want.loc} isn't a stereocentre in this molecule, so ${want.label} has no meaning here.`
          : `This molecule has no stereocentre, so ${want.label} has no meaning here.`);
      } else {
        /* E/Z: flip a substituent across the double bond if needed */
        const targetLoc = want.loc || eneL[0] || 1;
        const a1 = idAt(targetLoc);
        const a2 = (parentKind==="ring" && targetLoc===parentN) ? base.ids[0] : idAt(targetLoc+1);
        const bd = graph.bonds.find(b=>((b.a===a1&&b.b===a2)||(b.a===a2&&b.b===a1)) && b.order===2);
        if(!bd) return err("impossible", `There's no double bond at position ${targetLoc} to assign ${want.label} to.`);
        if(bd.stereo==="either") bd.stereo=null;
        const readCfg = () => {
          const g2 = expandSugar(normalise(graph));
          const wg2={atoms:g2.atoms,bonds:g2.bonds};
          const adj2=buildAdj(wg2).adj;
          const by2=new Map(wg2.atoms.map(a=>[a.id,a]));
          const bb=wg2.bonds.find(b=>((b.a===a1&&b.b===a2)||(b.a===a2&&b.b===a1))&&b.order===2);
          return assignEZ(bb, wg2, adj2, by2);
        };
        let cfg = readCfg();
        if(!cfg || !cfg.stereogenic)
          return err("impossible", `The double bond at position ${targetLoc} has no E/Z isomers — one of its carbons carries two identical groups.`);
        if(cfg.config !== want.label){
          /* mirror everything hanging off a2 (other than a1) across the bond axis */
          const A=graph.atoms.find(x=>x.id===a1), B=graph.atoms.find(x=>x.id===a2);
          const ax=B.x-A.x, ay=B.y-A.y;
          const len2=ax*ax+ay*ay || 1;
          const seen=new Set([a2,a1]); const stack=[a2]; const move=[];
          while(stack.length){
            const v=stack.pop();
            for(const b of graph.bonds){
              const t = b.a===v?b.b : b.b===v?b.a : null;
              if(t===null||seen.has(t)) continue;
              seen.add(t); move.push(t); stack.push(t);
            }
          }
          for(const id of move){
            const p=graph.atoms.find(x=>x.id===id);
            const dx=p.x-A.x, dy=p.y-A.y;
            const dotv=(dx*ax+dy*ay)/len2;
            const px=A.x+ax*dotv, py=A.y+ay*dotv;
            p.x=Math.round(2*px-p.x); p.y=Math.round(2*py-p.y);
          }
          cfg = readCfg();
          if(!cfg || cfg.config!==want.label)
            return err("unsupported","That geometry couldn't be constructed.");
        }
      }
    }
    check = nameGraph(graph);
    if(!check.ok) return { ok:false, err:check.err, message:check.message };
  }

  if(cisTransAsked){
    /* cis/trans only means something when each alkene carbon carries one H */
    const ex = expandSugar(normalise(graph));
    const wg = { atoms:ex.atoms, bonds:ex.bonds };
    const adjc = buildAdj(wg).adj;
    const dbl = wg.bonds.find(b=>b.order===2 &&
      wg.atoms.find(a=>a.id===b.a)?.el==="C" && wg.atoms.find(a=>a.id===b.b)?.el==="C");
    if(dbl){
      const hCount = id => 4 - adjc.get(id).reduce((s,e)=>s+e.order,0);
      if(hCount(dbl.a)!==1 || hCount(dbl.b)!==1)
        return err("unsupported",
          `cis and trans only work when each carbon of the double bond carries one hydrogen. This one doesn't, so it needs the E/Z system instead.`);
    }
  }

  const res = {
    ok:true, mol:graph, formula:check.formula, mass:check.mass,
    name:check.name, canonical:check.name, steps:check.steps,
    stereo:check.stereo,
  };
  if(cisTransAsked)
    res.note = `${cisTransAsked}- corresponds to ${cisTransAsked==="cis"?"Z":"E"} here, so the preferred form is ${check.name}.`;
  const normIn = raw.toLowerCase().replace(/\s+/g,"");
  if(REPAIR && REPAIR.issues.length) res.nameIssues = [...new Set(REPAIR.issues)];
  if(indicatedH && !res.note)
    res.note = `The ${indicatedH}H- prefix marks which ring atom carries the hydrogen; the ring it names is ${check.name}.`;
  if(!res.note && softNote)
    res.note = softNote + " The preferred form is " + check.name + ".";
  if(!res.note){
    const diff = classifyDifference(raw, check.name);
    if(diff){ res.note = diff.message; res.issue = diff.issue; }
  }
  return res;
}
