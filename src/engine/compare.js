/* ================================================================
   CATALYST ENGINE v4 — STRUCTURE MATCHING
   ----------------------------------------------------------------
   Answer checking for drawing exercises. Two structures are the same
   molecule exactly when the engine gives them the same name, so the
   namer doubles as a canonical form and no graph-isomorphism code is
   needed. When they differ, the comparison says *how*, which is the
   part a learner can act on.
   ================================================================ */
import { nameGraph } from "./name.js";
import { parseName } from "./parse.js";
import { normalise, expandSugar, buildAdj, findRings, VALENCE } from "./core.js";
import { perceiveGroups } from "./groups.js";

/* how many carbons, and which heteroatoms, does this structure hold? */
function census(graph){
  const g = normalise(graph);
  const ex = expandSugar(g);
  const wg = { atoms:ex.atoms, bonds:ex.bonds };
  const built = buildAdj(wg);
  const count = {};
  for(const a of wg.atoms) count[a.el] = (count[a.el]||0) + 1;
  const orders = { 2:0, 3:0 };
  for(const b of wg.bonds) if(b.order>1) orders[b.order]=(orders[b.order]||0)+1;
  const stereoBonds = wg.bonds.filter(b=>b.stereo==="wedge"||b.stereo==="dash").length;
  let kinds=[];
  try {
    const rings = findRings(wg, built.adj);
    const per = perceiveGroups(wg, built.adj, new Set(rings.flat()));
    kinds = per.groups.map(x=>x.kind).sort();
  } catch(e){ kinds=[]; }
  return { count, orders, stereoBonds, kinds, nAtoms:wg.atoms.length, adj:built.adj, wg };
}

const strip = n => n.replace(/^\([^)]*\)-/, "");     /* drop a stereo descriptor */

/**
 * matchStructure(drawn, target)
 *   drawn  — a graph from the canvas
 *   target — an IUPAC name (string) or another graph
 *
 * returns { match, klass, message, drawnName?, targetName? }
 *   klass: correct | correct-but-unspecified | empty | invalid |
 *          wrong-formula | wrong-skeleton | wrong-position |
 *          wrong-group | wrong-stereo | wrong-unsaturation
 */
export function matchStructure(drawn, target){
  /* resolve the target */
  let targetGraph, targetName;
  if(typeof target === "string"){
    const t = parseName(target);
    if(!t.ok) return { match:false, klass:"invalid",
      message:`The target name "${target}" couldn't be built: ${t.message}` };
    targetGraph = t.mol; targetName = t.name;
  } else {
    const t = nameGraph(target);
    if(!t.ok) return { match:false, klass:"invalid",
      message:"The target structure isn't valid." };
    targetGraph = target; targetName = t.name;
  }

  if(!drawn || !drawn.atoms || drawn.atoms.length===0)
    return { match:false, klass:"empty", targetName,
      message:"Nothing has been drawn yet." };

  const d = nameGraph(drawn);
  if(!d.ok)
    return { match:false, klass:"invalid", targetName,
      message:d.message };

  /* the decisive test */
  if(d.name === targetName)
    return { match:true, klass:"correct", drawnName:d.name, targetName,
      message:"Correct." };

  /* same molecule apart from stereochemistry? */
  if(strip(d.name) === strip(targetName)){
    const targetHasStereo = /^\(/.test(targetName);
    const drawnHasStereo  = /^\(/.test(d.name);
    if(targetHasStereo && !drawnHasStereo)
      return { match:false, klass:"correct-but-unspecified", drawnName:d.name, targetName,
        message:"The connectivity is right, but the three-dimensional arrangement isn't shown yet. Use a wedge or dashed bond to set it." };
    return { match:false, klass:"wrong-stereo", drawnName:d.name, targetName,
      message:"The right atoms are joined in the right order, but the three-dimensional arrangement is the mirror image of the one asked for." };
  }

  const dc = census(drawn), tc = census(targetGraph);
  const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);

  /* different molecular formula: something is missing or extra */
  if(d.formula !== nameGraph(targetGraph).formula){
    const dC = dc.count.C||0, tC = tc.count.C||0;
    if(dC !== tC)
      return { match:false, klass:"wrong-skeleton", drawnName:d.name, targetName,
        message:`This has ${dC} carbon${dC===1?"":"s"}; the target has ${tC}.` };
    return { match:false, klass:"wrong-formula", drawnName:d.name, targetName,
      message:`The molecular formula is ${d.formula}, but the target is ${nameGraph(targetGraph).formula}. Check for a missing or extra atom.` };
  }

  /* same formula: an isomer. Say which kind. */
  if(!same(dc.orders, tc.orders))
    return { match:false, klass:"wrong-unsaturation", drawnName:d.name, targetName,
      message:"The formula matches, but the double and triple bonds aren't in the same places." };

  const heteroSame = ["O","N","S","F","Cl","Br","I"]
    .every(e => (dc.count[e]||0) === (tc.count[e]||0));
  if(!heteroSame)
    return { match:false, klass:"wrong-group", drawnName:d.name, targetName,
      message:"The carbon skeleton matches, but a functional group differs." };

  /* same atoms, but a different functional family (an ether where an alcohol
     was asked for, say) is a group error, not a positional one */
  if(JSON.stringify(dc.kinds) !== JSON.stringify(tc.kinds))
    return { match:false, klass:"wrong-group", drawnName:d.name, targetName,
      message:"The formula matches, but the atoms are arranged into a different functional group." };

  return { match:false, klass:"wrong-position", drawnName:d.name, targetName,
    message:"Every atom is present and correct, but at least one group sits on the wrong carbon." };
}

/**
 * A short, escalating hint sequence for a drawing exercise. Give hint 0
 * on the first wrong attempt, hint 1 on the second, and so on.
 */
export function hintsFor(targetName){
  const t = parseName(targetName);
  if(!t.ok) return [];
  const g = nameGraph(t.mol);
  const c = census(t.mol);
  const out = [];
  out.push(`The molecule has ${c.count.C||0} carbon${(c.count.C||0)===1?"":"s"} and the formula ${g.formula}.`);
  if(g.steps && g.steps.length){
    const pg = g.steps.find(s=>s[0]==="Principal group");
    if(pg) out.push(pg[1]);
    const pc = g.steps.find(s=>s[0]==="Parent chain" || s[0]==="Ring parent");
    if(pc) out.push(pc[1]);
    const nm = g.steps.find(s=>s[0]==="Numbering");
    if(nm) out.push(nm[1]);
  }
  if(/^\(/.test(g.name))
    out.push("The name carries a stereo-descriptor, so a wedge or dashed bond is needed.");
  out.push(`The answer is ${g.name}.`);
  return out;
}
