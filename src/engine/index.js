/* ================================================================
   CATALYST ENGINE v4 — PUBLIC API
   ----------------------------------------------------------------
   import { nameGraph, parseName } from "./engine/index.js";

   nameGraph(graph)  structure -> name
     graph: { atoms:[{id,x,y,el?}], bonds:[{a,b,order,stereo?}] }
            bonds may also be legacy arrays [a,b,order]
            stereo: "wedge" | "dash" | "either" | null
     ok:    { ok:true, name, formula, mass, mol, stereo, steps }
     fail:  { ok:false, err, message }

   parseName(str)    name -> structure
     ok:    { ok:true, mol, formula, mass, name, canonical, stereo, steps, note? }
     fail:  { ok:false, err, message }

   err codes (stable, safe to branch on):
     empty · nocarbon · element · disconnected · valence · malformed
     impossible · ambiguous · unsupported
   ================================================================ */
export { nameGraph } from "./name.js";
export { parseName } from "./parse.js";
export { matchStructure, hintsFor } from "./compare.js";
export { synonymsFor } from "./synonyms.js";
export {
  normalise, expandSugar, buildAdj, findRings, ringSystems,
  validate, formulaOf, implicitH,
  ROOT, MULT, HALO, VALENCE, MASS, Z,
} from "./core.js";
export { perceiveGroups, principalKind, GROUPS, rankNeighbours, compareBranch } from "./groups.js";
export { assignRS, assignEZ, findStereo, cisTransApplicable } from "./stereo.js";
