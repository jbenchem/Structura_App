/* ================================================================
   STRUCTURA ENGINE v4 — REGRESSION SUITE
   Run:  node test.mjs
   ================================================================ */
import { parseName, nameGraph, findRings, buildAdj, normalise, expandSugar,
         matchStructure, hintsFor, synonymsFor } from "./index.js";

let pass = 0; const fails = [];
const chk = (label, got, want) => {
  if (got === want) pass++;
  else fails.push(`${label}\n    got:  ${got}\n    want: ${want}`);
};
const rt = (name) => {                      /* full round-trip: name -> structure -> name */
  const p = parseName(name);
  if (!p.ok) { fails.push(`${name}\n    parse failed: ${p.err}: ${p.message}`); return; }
  if (p.canonical !== name) { fails.push(`${name}\n    canonical: ${p.canonical}`); return; }
  const g = nameGraph(p.mol);
  if (!g.ok) { fails.push(`${name}\n    re-name failed: ${g.err}`); return; }
  if (g.name !== name) { fails.push(`${name}\n    redrawn as: ${g.name}`); return; }
  pass++;
};
const rejects = (name, code) => {
  const r = parseName(name);
  if (r.ok) fails.push(`${name}\n    expected ${code}, but was accepted as ${r.canonical}`);
  else chk(`reject ${name}`, r.err, code);
};

/* ---- 1. hydrocarbons ---- */
["methane","ethane","propane","butane","pentane","hexane","heptane","octane","nonane","decane",
 "but-1-ene","but-2-ene","pent-2-ene","hex-3-ene","but-1-yne","pent-2-yne",
 "2-methylbutane","2,3-dimethylbutane","2,2-dimethylbutane","3-methylhexane",
 "3-ethyl-2-methylpentane","2,3,4-trimethylpentane","2,2,4-trimethylpentane",
 "4-ethyl-2-methylhexane","3-ethylhexane","2-methylpropane","2,2-dimethylpropane"].forEach(rt);

/* ---- 2. halogens, nitro, ethers ---- */
["chloroethane","2-chlorobutane","2-bromobutane","1,2-dichloroethane","2-chloropropane",
 "nitroethane","nitromethane","1-nitropropane","2-nitropropane",
 "methoxyethane","ethoxyethane","1-methoxypropane","2-methoxypropane"].forEach(rt);

/* ---- 3. alcohols ---- */
["methanol","ethanol","propan-1-ol","propan-2-ol","butan-1-ol","butan-2-ol",
 "propane-1,3-diol","pentan-3-ol","3-methylhexan-3-ol","2-methylbutan-1-ol"].forEach(rt);

/* ---- 4. carbonyls ---- */
["methanal","ethanal","propanal","butanal","pentanal","3-methylbutanal","butanedial",
 "propan-2-one","butan-2-one","pentan-2-one","pentan-3-one","pentane-2,4-dione",
 "4-methylpentan-2-one"].forEach(rt);

/* ---- 5. acids and derivatives ---- */
["methanoic acid","ethanoic acid","propanoic acid","butanoic acid","butanedioic acid",
 "2-methylpropanoic acid","2-hydroxypropanoic acid","3-hydroxybutanoic acid",
 "methyl methanoate","methyl ethanoate","ethyl ethanoate","methyl propanoate",
 "ethyl propanoate","propyl ethanoate","methyl butanoate",
 "ethanoyl chloride","propanoyl chloride","butanoyl bromide",
 "ethanoic anhydride","propanoic anhydride"].forEach(rt);

/* ---- 6. nitrogen ---- */
["methanamine","ethan-1-amine","propan-1-amine","propan-2-amine","butan-2-amine",
 "ethanamide","propanamide","butanamide",
 "ethanenitrile","propanenitrile","butanenitrile"].forEach(rt);

/* ---- 7. multifunctional ---- */
["4-hydroxybutan-2-one","3-oxobutanoic acid","4-oxopentanoic acid",
 "2-aminoethanoic acid","2-aminopropanoic acid","3-aminopropanoic acid",
 "2-aminobutanoic acid","3-aminopropan-1-ol",
 "2-amino-3-hydroxypropanoic acid","2-chloro-3-hydroxybutanoic acid"].forEach(rt);

/* ---- 8. rings ---- */
["cyclopropane","cyclobutane","cyclopentane","cyclohexane",
 "methylcyclohexane","methylcyclopentane","ethylcyclohexane","chlorocyclohexane",
 "1,2-dimethylcyclohexane","1,3-dimethylcyclohexane",
 "cyclohexan-1-ol","cyclopentan-1-ol","cyclohexan-1-one","cyclohexan-1-amine",
 "2-methylcyclohexan-1-ol"].forEach(rt);

/* ---- 9. aromatics ---- */
["benzene","methylbenzene","ethylbenzene","chlorobenzene","bromobenzene","nitrobenzene",
 "1,2-dimethylbenzene","1,3-dimethylbenzene","1,4-dimethylbenzene",
 "phenol","aniline","benzoic acid","benzaldehyde",
 "2-methylphenol","4-nitrophenol","2-chloroaniline"].forEach(rt);

/* ---- 10. stereochemistry: R/S ---- */
["(2R)-butan-2-ol","(2S)-butan-2-ol","(2R)-2-chlorobutane","(2S)-2-bromobutane",
 "(2S)-2-aminopropanoic acid","(2R)-2-hydroxypropanoic acid",
 "(2R,3S)-3-chlorobutan-2-ol","(3R)-3-methylhexane"].forEach(rt);

/* ---- 11. stereochemistry: E/Z ---- */
["(2E)-but-2-ene","(2Z)-but-2-ene","(2E)-pent-2-ene","(2Z)-pent-2-ene",
 "(3E)-hex-3-ene","(2E)-3-methylpent-2-ene","(2Z)-but-2-enal"].forEach(rt);

/* short stereo forms are accepted and canonicalised */
chk("short R form", parseName("(R)-butan-2-ol").canonical, "(2R)-butan-2-ol");
chk("short S form", parseName("(S)-2-chlorobutane").canonical, "(2S)-2-chlorobutane");

/* R and S really are different molecules */
(() => {
  const R = parseName("(2R)-butan-2-ol"), S = parseName("(2S)-butan-2-ol");
  const bR = R.mol.bonds.find(b => b.stereo), bS = S.mol.bonds.find(b => b.stereo);
  chk("R/S differ in geometry", bR.stereo !== bS.stereo, true);
  chk("R names back", nameGraph(R.mol).name, "(2R)-butan-2-ol");
  chk("S names back", nameGraph(S.mol).name, "(2S)-butan-2-ol");
})();

/* E and Z really are different molecules */
(() => {
  const E = parseName("(2E)-but-2-ene"), Z = parseName("(2Z)-but-2-ene");
  chk("E names back", nameGraph(E.mol).name, "(2E)-but-2-ene");
  chk("Z names back", nameGraph(Z.mol).name, "(2Z)-but-2-ene");
})();

/* a flat drawing of a chiral molecule is reported as chiral but unassigned */
(() => {
  const flat = parseName("butan-2-ol");
  chk("flat butan-2-ol has no descriptor", flat.canonical, "butan-2-ol");
  const g = nameGraph(flat.mol);
  chk("flat butan-2-ol: centre detected", g.stereo.centres.length, 1);
  chk("flat butan-2-ol: config unassigned", g.stereo.centres[0].config, null);
})();

/* ---- 12. aliases ---- */
chk("alias toluene",   parseName("toluene").canonical,   "methylbenzene");
chk("alias acetone",   parseName("acetone").canonical,   "propan-2-one");
chk("alias glycine",   parseName("glycine").canonical,   "2-aminoethanoic acid");
chk("alias alanine",   parseName("alanine").canonical,   "2-aminopropanoic acid");
chk("alias cyclohexanol", parseName("cyclohexanol").canonical, "cyclohexan-1-ol");
chk("alias acetic acid",  parseName("acetic acid").canonical,  "ethanoic acid");

/* ---- 13. error behaviour ---- */
chk("pentanone defaults to C-2", parseName("pentanone").canonical, "pentan-2-one");
chk("propanamine defaults to C-1", parseName("propanamine").canonical, "propan-1-amine");
rejects("butan-1-one", "impossible");
rejects("hexan-7-ol", "impossible");
rejects("methylphenol", "ambiguous");
rejects("(R)-propan-2-ol", "impossible");
rejects("(R)-butane", "impossible");
rejects("(2E)-2-methylbut-2-ene", "impossible");
rejects("but-9-ene", "impossible");
rejects("zzzane", "unsupported");

/* valence and connectivity guards */
chk("pentavalent carbon", nameGraph({
  atoms:[{id:1},{id:2},{id:3},{id:4},{id:5},{id:6}],
  bonds:[[1,2,1],[1,3,1],[1,4,1],[1,5,1],[1,6,1]] }).err, "valence");
chk("disconnected", nameGraph({
  atoms:[{id:1},{id:2},{id:3},{id:4}], bonds:[[1,2,1],[3,4,1]] }).err, "disconnected");
chk("empty canvas", nameGraph({atoms:[],bonds:[]}).err, "empty");

/* ---- 14. formulas ---- */
chk("hexane formula",   parseName("hexane").formula,          "C6H14");
chk("benzene formula",  parseName("benzene").formula,         "C6H6");
chk("ethanoic formula", parseName("ethanoic acid").formula,   "C2H4O2");
chk("glycine formula",  parseName("2-aminoethanoic acid").formula, "C2H5NO2");
chk("ester formula",    parseName("methyl ethanoate").formula,"C3H6O2");
chk("nitrile formula",  parseName("propanenitrile").formula,  "C3H5N");
chk("nitro formula",    parseName("nitromethane").formula,    "CH3NO2");
chk("cyclohexane formula", parseName("cyclohexane").formula,  "C6H12");
chk("isooctane formula", parseName("2,2,4-trimethylpentane").formula, "C8H18");

/* ---- 15. ring perception ---- */
(() => {
  const prep = (gr) => {
    const g0 = normalise(gr); const ex = expandSugar(g0);
    const g = { atoms:ex.atoms, bonds:ex.bonds };
    return { g, adj: buildAdj(g).adj };
  };
  const ring = (n) => ({
    atoms: Array.from({length:n},(_,i)=>({id:i+1,x:i*10,y:i*10})),
    bonds: Array.from({length:n},(_,i)=>[i+1, i+2>n?1:i+2, 1]) });
  for (const n of [3,4,5,6,7]) {
    const P = prep(ring(n));
    chk(`ring perception C${n}`, findRings(P.g,P.adj).map(r=>r.length).join(","), String(n));
  }
  /* fused bicyclic: two 6-rings sharing an edge */
  const fused = { atoms: Array.from({length:10},(_,i)=>({id:i+1,x:i*10,y:i*10})),
    bonds: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[5,7],[7,8],[8,9],[9,10],[10,6]].map(([a,b])=>[a,b,1]) };
  const PF = prep(fused);
  chk("fused ring count", findRings(PF.g,PF.adj).length, 2);
  /* acyclic has no rings */
  const PA = prep({ atoms:[{id:1},{id:2},{id:3}], bonds:[[1,2,1],[2,3,1]] });
  chk("acyclic ring count", findRings(PA.g,PA.adj).length, 0);
})();

/* ---- 16. API shape ---- */
(() => {
  const p = parseName("butan-2-ol");
  for (const k of ["ok","mol","formula","mass","name","canonical","steps","stereo"])
    chk(`parseName has ${k}`, k in p, true);
  const g = nameGraph(p.mol);
  for (const k of ["ok","name","formula","mass","mol","steps","stereo"])
    chk(`nameGraph has ${k}`, k in g, true);
  chk("steps are pairs", Array.isArray(g.steps) && Array.isArray(g.steps[0]) && g.steps[0].length===2, true);
  const e = parseName("zzzane");
  for (const k of ["ok","err","message"]) chk(`error has ${k}`, k in e, true);
  chk("message is student-facing", /\.$/.test(e.message), true);
})();

/* ---- 17. legacy array bonds still accepted ---- */
chk("legacy bond arrays", nameGraph({
  atoms:[{id:1},{id:2},{id:3,el:"O"}], bonds:[[1,2,1],[2,3,1]] }).name, "ethanol");


/* ---- 18. exocyclic ring suffixes ---- */
["benzoic acid","benzaldehyde","cyclohexanecarboxylic acid","cyclohexanecarbaldehyde",
 "cyclopentanecarboxylic acid","cyclopentanecarbaldehyde"].forEach(rt);


/* ---- 19. heterocycles ---- */
["pyridine","piperidine","pyrrole","pyrrolidine","furan","oxolane","thiophene","thiolane",
 "oxane","pyrimidine","pyrazine","pyridazine","imidazole","pyrazole","oxazole","thiazole",
 "piperazine","1,4-dioxane",
 "2-methylpyridine","3-methylpyridine","4-methylpyridine","2-chloropyridine"].forEach(rt);
chk("pyridine formula",   parseName("pyridine").formula,   "C5H5N");
chk("furan formula",      parseName("furan").formula,      "C4H4O");
chk("thiophene formula",  parseName("thiophene").formula,  "C4H4S");
chk("pyrimidine formula", parseName("pyrimidine").formula, "C4H4N2");
/* a heterocycle always needs substituent locants, unlike benzene */
chk("hetero needs locants", parseName("methylpyridine").err, "ambiguous");

/* ---- 20. fused, spiro and bridged rings ---- */
["naphthalene","anthracene","phenanthrene",
 "bicyclo[2.2.1]heptane","bicyclo[2.2.2]octane","bicyclo[4.4.0]decane","bicyclo[3.3.0]octane",
 "spiro[4.5]decane","spiro[3.4]octane","spiro[2.2]pentane"].forEach(rt);
chk("naphthalene formula",  parseName("naphthalene").formula,  "C10H8");
chk("anthracene formula",   parseName("anthracene").formula,   "C14H10");
chk("phenanthrene formula", parseName("phenanthrene").formula, "C14H10");
chk("decalin formula",      parseName("bicyclo[4.4.0]decane").formula, "C10H18");
/* anthracene and phenanthrene are isomers told apart by fusion geometry */
chk("anthracene != phenanthrene",
  parseName("anthracene").canonical !== parseName("phenanthrene").canonical, true);
/* bracket totals are checked against the parent */
chk("bad bicyclo total", parseName("bicyclo[2.2.1]octane").err, "impossible");
chk("bad spiro total",   parseName("spiro[4.5]nonane").err,     "impossible");

/* ---- 21. exocyclic groups on rings ---- */
["benzonitrile","cyclohexanecarbonitrile","1-phenylethan-1-one","1-phenylpropan-1-one",
 "methoxybenzene"].forEach(rt);
chk("alias acetophenone", parseName("acetophenone").canonical, "1-phenylethan-1-one");
chk("alias anisole",      parseName("anisole").canonical,      "methoxybenzene");
chk("acetophenone formula", parseName("acetophenone").formula, "C8H8O");
/* a terminal ketone is still impossible without a carbon substituent there */
chk("terminal ketone still rejected", parseName("butan-1-one").err, "impossible");


/* ---- 22. substituted fused, spiro and bridged systems ---- */
["1-methylnaphthalene","2-methylnaphthalene","2-chloronaphthalene","1,4-dimethylnaphthalene",
 "1-nitronaphthalene","2-methylbicyclo[2.2.1]heptane","2-methylspiro[4.5]decane",
 "2,3-dimethylbicyclo[4.4.0]decane","2-methylbicyclo[2.2.2]octane"].forEach(rt);
chk("1-methylnaphthalene formula", parseName("1-methylnaphthalene").formula, "C11H10");
chk("substituted spiro formula",   parseName("2-methylspiro[4.5]decane").formula, "C11H20");
/* positions 1 and 2 on naphthalene are genuinely different */
chk("naphthalene 1 vs 2 differ",
  parseName("1-methylnaphthalene").canonical !== parseName("2-methylnaphthalene").canonical, true);
/* an impossible locant is refused rather than silently relocated */
chk("bad naphthalene locant", parseName("9-methylnaphthalene").err, "impossible");


/* ---- 23. fused heterocycles ---- */
["indole","benzofuran","benzothiophene","quinoline","isoquinoline"].forEach(rt);
chk("indole formula",       parseName("indole").formula,       "C8H7N");
chk("quinoline formula",    parseName("quinoline").formula,    "C9H7N");
chk("benzofuran formula",   parseName("benzofuran").formula,   "C8H6O");
/* quinoline and isoquinoline are isomers told apart by where the N sits */
chk("quinoline != isoquinoline",
  parseName("quinoline").canonical !== parseName("isoquinoline").canonical, true);

/* ---- 24. drawing geometry ---- */
(() => {
  /* every atom's bonds should splay apart; nothing collinear or overlapping */
  const worstAngle = mol => {
    let worst = 180;
    for(const a of mol.atoms){
      const angs = [];
      for(const b of mol.bonds){
        const o = b.a===a.id ? b.b : b.b===a.id ? b.a : null;
        if(o===null) continue;
        const p = mol.atoms.find(z=>z.id===o);
        angs.push(Math.atan2(p.y-a.y, p.x-a.x)*180/Math.PI);
      }
      for(let i=0;i<angs.length;i++) for(let j=i+1;j<angs.length;j++){
        let d = Math.abs(angs[i]-angs[j]) % 360;
        if(d>180) d = 360-d;
        worst = Math.min(worst, d);
      }
    }
    return worst;
  };
  for(const nm of ["butanoic acid","ethanoic acid","glycine","propan-2-one",
                   "ethyl ethanoate","pentane-2,4-dione","2-amino-3-hydroxypropanoic acid"]){
    const p = parseName(nm);
    if(!p.ok){ fails.push(`${nm}: parse failed`); continue; }
    const w = worstAngle(p.mol);
    if(w < 100) fails.push(`${nm}\n    bond angles collapse to ${w.toFixed(0)} degrees (want >= 100)`);
    else pass++;
  }
  /* bonds should all be about the same length */
  for(const nm of ["hexane","butanoic acid","cyclohexane","naphthalene"]){
    const p = parseName(nm);
    if(!p.ok) continue;
    const at = id => p.mol.atoms.find(z=>z.id===id);
    const lens = p.mol.bonds.map(b => {
      const A=at(b.a), B=at(b.b);
      return Math.hypot(B.x-A.x, B.y-A.y);
    });
    const spread = Math.max(...lens) - Math.min(...lens);
    if(spread > 12) fails.push(`${nm}\n    bond lengths vary by ${spread.toFixed(0)}px`);
    else pass++;
  }
  /* no two atoms should sit on top of each other */
  for(const nm of ["spiro[4.5]decane","2-methylspiro[4.5]decane","bicyclo[2.2.1]heptane","indole"]){
    const p = parseName(nm);
    if(!p.ok) continue;
    let clash = 0;
    for(let i=0;i<p.mol.atoms.length;i++)
      for(let j=i+1;j<p.mol.atoms.length;j++){
        const A=p.mol.atoms[i], B=p.mol.atoms[j];
        if(Math.hypot(B.x-A.x, B.y-A.y) < 14) clash++;
      }
    if(clash) fails.push(`${nm}\n    ${clash} pair(s) of atoms drawn on top of each other`);
    else pass++;
  }
})();


/* ---- 25. cis / trans, and spelling help ---- */
chk("cis-but-2-ene",      parseName("cis-but-2-ene").canonical,     "(2Z)-but-2-ene");
chk("trans-but-2-ene",    parseName("trans-but-2-ene").canonical,   "(2E)-but-2-ene");
chk("cis-pent-2-ene",     parseName("cis-pent-2-ene").canonical,    "(2Z)-pent-2-ene");
chk("trans-pent-2-ene",   parseName("trans-pent-2-ene").canonical,  "(2E)-pent-2-ene");
chk("cis-hex-3-ene",      parseName("cis-hex-3-ene").canonical,     "(3Z)-hex-3-ene");
chk("trans-but-2-enal",   parseName("trans-but-2-enal").canonical,  "(2E)-but-2-enal");
chk("cis explains itself", /cis- corresponds to Z/.test(parseName("cis-but-2-ene").note), true);
/* cis/trans is meaningless when a carbon carries two identical groups */
chk("cis-but-1-ene refused",         parseName("cis-but-1-ene").err, "impossible");
chk("cis-2-methylbut-2-ene refused", parseName("cis-2-methylbut-2-ene").err, "impossible");
/* short (E)/(Z) forms too */
chk("(Z) short form", parseName("(Z)-but-2-ene").canonical, "(2Z)-but-2-ene");
chk("(E) short form", parseName("(E)-but-2-ene").canonical, "(2E)-but-2-ene");

/* a mistyped name gets a suggestion rather than a dead end */
for(const [typo, want] of [["steric acid","stearic acid"], ["olic acid","oleic acid"],
                           ["naptalene","naphthalene"], ["pyradine","pyridine"],
                           ["glycene","glycine"], ["indol","indole"]]){
  const r = parseName(typo);
  if(r.ok) { fails.push(`${typo} should not parse`); continue; }
  chk(`suggest ${typo}`, r.message.includes(want), true);
}
/* the correct spellings still work */
chk("stearic acid", parseName("stearic acid").canonical, "octadecanoic acid");
chk("oleic acid",   parseName("oleic acid").canonical,   "(9Z)-octadec-9-enoic acid");


/* ---- 26. long chains, branched and unsaturated substituents ---- */
["henicosane","tricosane","triacontane",
 "propan-2-ylbenzene","(2-methylpropan-2-yl)benzene","butan-2-ylbenzene",
 "ethenylbenzene","prop-2-en-1-ylbenzene","ethynylbenzene",
 "propan-2-yl ethanoate","2-methylpropyl ethanoate","butan-2-yl propanoate"].forEach(rt);
chk("alias tert-butylbenzene", parseName("tert-butylbenzene").canonical, "(2-methylpropan-2-yl)benzene");
chk("alias isopropylbenzene",  parseName("isopropylbenzene").canonical,  "propan-2-ylbenzene");
chk("alias styrene",           parseName("styrene").canonical,           "ethenylbenzene");
chk("alias allylbenzene",      parseName("allylbenzene").canonical,      "prop-2-en-1-ylbenzene");
chk("alias cumene",            parseName("cumene").canonical,            "propan-2-ylbenzene");
chk("henicosane formula",      parseName("henicosane").formula,          "C21H44");
chk("triacontane formula",     parseName("triacontane").formula,         "C30H62");

/* ---- 27. stereocentres on rings ---- */
["(1R,2S)-2-methylcyclohexan-1-ol","(1S,2S)-2-methylcyclohexan-1-ol"].forEach(rt);
chk("ring stereo keeps both centres",
  /1[RS].*2[RS]/.test(parseName("(1R,2S)-2-methylcyclohexan-1-ol").canonical), true);

/* ---- 28. N-substitution ---- */
["N-methylmethanamine","N,N-dimethylmethanamine","N-ethylethan-1-amine",
 "N-methylethanamide","N-methylpropanamide"].forEach(rt);
chk("alias dimethylamine",  parseName("dimethylamine").canonical,  "N-methylmethanamine");
chk("alias diethylamine",   parseName("diethylamine").canonical,   "N-ethylethan-1-amine");
chk("alias trimethylamine", parseName("trimethylamine").canonical, "N,N-dimethylmethanamine");
chk("secondary amine formula", parseName("dimethylamine").formula, "C2H7N");

/* ---- 29. sulfur ---- */
["methanethiol","ethanethiol","propan-1-thiol","methylsulfanylmethane",
 "methylsulfanylethane"].forEach(rt);
chk("thiol formula",   parseName("ethanethiol").formula,          "C2H6S");
chk("sulfide formula", parseName("methylsulfanylmethane").formula,"C2H6S");

/* ---- 30. suffix groups on polycyclics, and ring-ring bonds ---- */
["naphthalen-1-ol","naphthalen-2-ol","naphthalen-2-amine",
 "bicyclo[4.4.0]decan-2-ol","phenylbenzene"].forEach(rt);
chk("alias biphenyl", parseName("biphenyl").canonical, "phenylbenzene");
chk("biphenyl formula", parseName("biphenyl").formula, "C12H10");
chk("naphthalenol elides the e", parseName("naphthalen-1-ol").canonical, "naphthalen-1-ol");
chk("alias glucose", parseName("glucose").canonical, "2,3,4,5,6-pentahydroxyhexanal");

/* substituted fused heterocycles are refused with an explanation, not silently wrong */
chk("substituted indole now names", parseName("5-methylindole").canonical, "5-methylindole");
chk("substituted quinoline",     parseName("2-methylquinoline").canonical, "2-methylquinoline");


/* ---- 31. answer checking ---- */
(() => {
  const mol = n => parseName(n).mol;
  const cases = [
    ["butan-2-ol",      "butan-2-ol",       "correct"],
    ["butan-1-ol",      "butan-2-ol",       "wrong-position"],
    ["propan-2-ol",     "butan-2-ol",       "wrong-skeleton"],
    ["methoxyethane",   "propan-1-ol",      "wrong-group"],
    ["propanal",        "propan-2-one",     "wrong-group"],
    ["butan-2-ol",      "(2R)-butan-2-ol",  "correct-but-unspecified"],
    ["(2S)-butan-2-ol", "(2R)-butan-2-ol",  "wrong-stereo"],
    ["but-2-ene",       "butane",           "wrong-formula"],
  ];
  for(const [drawn, target, klass] of cases)
    chk(`match ${drawn} vs ${target}`, matchStructure(mol(drawn), target).klass, klass);
  chk("match reports success", matchStructure(mol("hexane"), "hexane").match, true);
  chk("empty canvas", matchStructure({atoms:[],bonds:[]}, "butane").klass, "empty");
  chk("bad target name", matchStructure(mol("butane"), "zzzane").klass, "invalid");
  /* the same molecule drawn at a different angle still matches */
  (() => {
    const m = mol("2-methylbutane");
    const rotated = { atoms:m.atoms.map(a=>({ ...a, x:a.y*-1, y:a.x })), bonds:m.bonds };
    chk("rotation does not affect matching",
      matchStructure(rotated, "2-methylbutane").match, true);
  })();
  /* hints escalate and end with the answer */
  const h = hintsFor("(2R)-butan-2-ol");
  chk("hints produced", h.length >= 4, true);
  chk("last hint gives the answer", h[h.length-1].includes("(2R)-butan-2-ol"), true);
  chk("first hint is a nudge", /carbon/.test(h[0]), true);
})();


/* ---- 32. names without a locant take the first valid position ---- */
chk("butanol -> butan-1-ol",     parseName("butanol").canonical,     "butan-1-ol");
chk("pentanol -> pentan-1-ol",   parseName("pentanol").canonical,    "pentan-1-ol");
chk("decanol -> decan-1-ol",     parseName("decanol").canonical,     "decan-1-ol");
chk("hexanamine -> C-1",         parseName("hexanamine").canonical,  "hexan-1-amine");
chk("pentanone -> C-2",          parseName("pentanone").canonical,   "pentan-2-one");
chk("a default position is explained",
  /No position was given/.test(parseName("butanol").note || ""), true);

/* older styles that put the locant in front */
chk("2-butanol",  parseName("2-butanol").canonical,  "butan-2-ol");
chk("2-decanol",  parseName("2-decanol").canonical,  "decan-2-ol");
chk("2-octanol",  parseName("2-octanol").canonical,  "octan-2-ol");
chk("2-decanone", parseName("2-decanone").canonical, "decan-2-one");
chk("2-pentanone",parseName("2-pentanone").canonical,"pentan-2-one");


/* ---- 33. faulty names are still drawn, and flagged ---- */
(() => {
  for(const [bad, meant] of [["2-dimethylbutane","2,2-dimethylbutane"],
                             ["2,3-trimethylbutane","2,2,3-trimethylbutane"]]){
    const r = parseName(bad);
    chk(`${bad} is flagged`, r.err, "name-issue");
    chk(`${bad} still draws`, !!r.mol, true);
    chk(`${bad} reports the intent`, r.intended, meant);
    chk(`${bad} explains once`, (r.message.match(/gives \d locant/g)||[]).length, 1);
  }
  /* a name that is simply unrecognisable still fails outright */
  chk("gibberish still fails", parseName("zzzane").err, "unsupported");
})();

/* ---- 34. structures are laid out wider than tall ---- */
for(const nm of ["butyl ethanoate","ethyl ethanoate","butanoic acid","hexane",
                 "2-methylbutane","octan-2-ol"]){
  const p = parseName(nm);
  if(!p.ok){ fails.push(`${nm}: parse failed`); continue; }
  const xs = p.mol.atoms.map(a=>a.x), ys = p.mol.atoms.map(a=>a.y);
  const w = Math.max(...xs)-Math.min(...xs), h = Math.max(...ys)-Math.min(...ys);
  if(w < h) fails.push(`${nm}\n    drawn ${w}x${h} — taller than wide`);
  else pass++;
}


/* ---- 35. bracketed complex substituents ---- */
["2-(chloromethyl)butane","5-(1-fluoroethyl)decane","3-(iodomethyl)decane",
 "4-(2-chloroethyl)heptane"].forEach(rt);
chk("bracketed formula", parseName("5-(1-fluoroethyl)decane").formula, "C12H25F");
chk("one-carbon substituents drop their locant",
  parseName("3-(iodomethyl)decane").canonical, "3-(iodomethyl)decane");
/* square brackets stay reserved for ring notation */
chk("bicyclo brackets survive", parseName("bicyclo[2.2.1]heptane").ok, true);


/* ---- 36. purine and caffeine ---- */
chk("purine formula",   parseName("purine").formula,   "C5H4N4");
chk("caffeine formula", parseName("caffeine").formula, "C8H10N4O2");
chk("caffeine name",    parseName("caffeine").canonical, "1,3,7-trimethylpurine-2,6-dione");
chk("systematic caffeine", parseName("1,3,7-trimethylpurine-2,6-dione").ok, true);

/* ---- 37. branches never cross the parent chain ---- */
(() => {
  const crossings = mol => {
    const at = id => mol.atoms.find(a=>a.id===id);
    const segs = mol.bonds.map(b=>({ p:at(b.a), q:at(b.b), a:b.a, b:b.b }));
    const side = (o,a,b) => Math.sign((b.x-a.x)*(o.y-a.y)-(b.y-a.y)*(o.x-a.x));
    let n=0;
    for(let i=0;i<segs.length;i++) for(let j=i+1;j<segs.length;j++){
      const s=segs[i], t=segs[j];
      if(s.a===t.a||s.a===t.b||s.b===t.a||s.b===t.b) continue;
      if(side(s.p,t.p,t.q)!==side(s.q,t.p,t.q) && side(t.p,s.p,s.q)!==side(t.q,s.p,s.q)) n++;
    }
    return n;
  };
  for(const nm of ["5,7-diethyl-3,4,7-trimethyldecane","5,5-diethyldecane",
                   "3-ethyl-3-methylpentane","2,2,4-trimethylpentane",
                   "2,2,4,4,6,8,8-heptamethylnonane","3-ethyl-2-methylpentane",
                   "2,3,4-trimethylpentane","butyl ethanoate"]){
    const p = parseName(nm);
    if(!p.ok){ fails.push(`${nm}: parse failed`); continue; }
    const c = crossings(p.mol);
    if(c) fails.push(`${nm}\n    ${c} pair(s) of bonds cross`);
    else pass++;
  }
})();


/* ---- 38. heteroatom replacement in rings ---- */
["8-azabicyclo[3.2.1]octane","2-azabicyclo[2.2.1]heptane",
 "7-oxabicyclo[2.2.1]heptane"].forEach(nm=>{
  const r = parseName(nm);
  if(!r.ok){ fails.push(`${nm}: ${r.err}`); return; }
  chk(`${nm} canonical`, r.canonical, nm);
});
chk("tropane core formula",  parseName("8-azabicyclo[3.2.1]octane").formula, "C7H13N");
chk("aza position checked",  parseName("99-azabicyclo[3.2.1]octane").err, "impossible");

/* ---- 39. tropane alkaloids ---- */
chk("tropane formula", parseName("tropane").formula, "C8H15N");
chk("cocaine formula", parseName("cocaine").formula, "C17H21NO4");
chk("cocaine by systematic name",
  parseName("methyl (1R,2R,3S,5S)-3-(benzoyloxy)-8-methyl-8-azabicyclo[3.2.1]octane-2-carboxylate").formula,
  "C17H21NO4");
chk("bracket numbers optional",
  parseName("methyl (1R,2R,3S,5S)-3-(benzoyloxy)-8-methyl-8-azabicyclooctane-2-carboxylate").formula,
  "C17H21NO4");
chk("cocaine places real wedges",
  parseName("cocaine").mol.bonds.filter(b=>b.stereo).length, 2);
chk("cocaine explains its stereochemistry",
  /C-2 and C-3/.test(parseName("cocaine").note || ""), true);


/* ---- 40. branches on a four-bond carbon go straight up and down ---- */
(() => {
  for(const nm of ["5,5-diethyldecane","3-ethyl-3-methylpentane",
                   "5,7-diethyl-3,4,7-trimethyldecane","2,2-dimethylbutane"]){
    const p = parseName(nm);
    if(!p.ok){ fails.push(`${nm}: parse failed`); continue; }
    /* find a carbon carrying four bonds and check two of them are vertical */
    const load = {};
    p.mol.bonds.forEach(b=>{ load[b.a]=(load[b.a]||0)+1; load[b.b]=(load[b.b]||0)+1; });
    const quad = p.mol.atoms.filter(a=>load[a.id]===4);
    if(!quad.length){ fails.push(`${nm}: no four-bond carbon found`); continue; }
    let ok = true;
    for(const c of quad){
      const angs = p.mol.bonds
        .filter(b=>b.a===c.id||b.b===c.id)
        .map(b=>{
          const o = p.mol.atoms.find(a=>a.id===(b.a===c.id?b.b:b.a));
          return Math.atan2(o.y-c.y, o.x-c.x)*180/Math.PI;
        });
      const vertical = angs.filter(d=>Math.abs(Math.abs(d)-90) < 12).length;
      if(vertical < 2) ok = false;
    }
    if(ok) pass++;
    else fails.push(`${nm}\n    a four-bond carbon does not put two branches vertically`);
  }
})();


/* ---- 41. stereochemistry on ring systems ---- */
["(2R)-bicyclo[2.2.1]heptan-2-ol","(2S)-bicyclo[2.2.1]heptan-2-ol",
 "(1R,2S)-2-methylcyclohexan-1-ol","(1S,2S)-2-methylcyclohexan-1-ol"].forEach(rt);
/* R and S on a bridged ring really are different structures */
(() => {
  const R = parseName("(2R)-bicyclo[2.2.1]heptan-2-ol");
  const S = parseName("(2S)-bicyclo[2.2.1]heptan-2-ol");
  const bR = R.mol.bonds.find(b=>b.stereo), bS = S.mol.bonds.find(b=>b.stereo);
  chk("bridged R/S differ", bR.stereo !== bS.stereo, true);
  chk("bridged R names back", nameGraph(R.mol).name, "(2R)-bicyclo[2.2.1]heptan-2-ol");
  chk("bridged S names back", nameGraph(S.mol).name, "(2S)-bicyclo[2.2.1]heptan-2-ol");
})();
/* an aromatic carbon is not a stereocentre, and a missing position is refused */
chk("aromatic centre refused", parseName("(2S)-naphthalen-2-ol").err, "impossible");
chk("absent position refused", parseName("(9R)-bicyclo[2.2.1]heptan-2-ol").err, "impossible");
/* a flat bridged drawing reports its centres without inventing a configuration */
(() => {
  const flat = parseName("bicyclo[2.2.1]heptan-2-ol");
  const g = nameGraph(flat.mol);
  chk("bridged centres detected", g.stereo.centres.length > 0, true);
  chk("bridged config left unset", g.stereo.centres.every(c=>c.config===null), true);
})();


/* ---- 42. aryl substituents carrying their own groups ---- */
["(3-methylphenyl)benzene","1-(4-chlorophenyl)ethanol",
 "2,2-dimethyl-3-(3-propan-2-ylphenyl)cyclopropan-1-ol",
 "2,2-dimethyl-3-phenylcyclopropan-1-ol"].forEach(rt);
chk("substituted aryl formula",
  parseName("2,2-dimethyl-3-(3-propan-2-ylphenyl)cyclopropan-1-ol").formula, "C14H20O");
/* the retained spellings are accepted and canonicalised */
chk("isopropylphenyl accepted",
  parseName("2,2-dimethyl-3-(3-isopropylphenyl)cyclopropanol").canonical,
  "2,2-dimethyl-3-(3-propan-2-ylphenyl)cyclopropan-1-ol");
/* a plain phenyl stays plain */
chk("bare phenyl unchanged", parseName("phenylbenzene").canonical, "phenylbenzene");
/* and the drawing holds up */
(() => {
  const p = parseName("2,2-dimethyl-3-(3-propan-2-ylphenyl)cyclopropan-1-ol");
  let minD = 999;
  for(let i=0;i<p.mol.atoms.length;i++) for(let j=i+1;j<p.mol.atoms.length;j++)
    minD = Math.min(minD, Math.hypot(p.mol.atoms[i].x-p.mol.atoms[j].x,
                                     p.mol.atoms[i].y-p.mol.atoms[j].y));
  if(minD < 16) fails.push(`substituted aryl drawing\n    atoms only ${minD.toFixed(0)}px apart`);
  else pass++;
})();


/* ---- 43. names are segmented for highlighting ---- */
for(const nm of ["2,2-dimethylbutan-1-ol","3-methylhex-2-ene","2-chlorobutane",
                 "cyclohexan-1-ol","benzene","ethyl ethanoate","2-aminopropanoic acid"]){
  const p = parseName(nm);
  if(!p.ok){ fails.push(nm+': parse failed'); continue; }
  const g = nameGraph(p.mol);
  if(!g.parts || !g.parts.length){ fails.push(nm+': no parts returned'); continue; }
  /* the pieces must reassemble into exactly the name shown */
  if(g.parts.map(x=>x.text).join('') !== g.name){
    fails.push(nm+'\n    parts rejoin as "'+g.parts.map(x=>x.text).join('')+'"');
    continue;
  }
  /* every referenced atom must exist */
  const ids = new Set(p.mol.atoms.map(a=>a.id));
  const bad = g.parts.flatMap(x=>x.atoms||[]).filter(id=>!ids.has(id));
  if(bad.length){ fails.push(nm+': parts point at missing atoms '+bad.join(',')); continue; }
  pass++;
}
/* a substituent part points only at that substituent */
(() => {
  const g = nameGraph(parseName('2-chlorobutane').mol);
  const cl = g.parts.find(x=>x.text.includes('chloro'));
  chk('chloro part isolates the chlorine', cl.atoms.length, 1);
  const par = g.parts.find(x=>x.kind==='parent');
  chk('parent part covers the chain', par.atoms.length, 4);
})();


/* ---- 44. every part of a name explains itself ---- */
for(const nm of ["(2Z)-but-2-ene","(2R)-butan-2-ol","2,2-dimethylbutan-1-ol",
                 "3-methylhex-2-ene","2,3,4-trimethylpentane","2-chlorobutane",
                 "cyclohexan-1-ol","ethanoic acid"]){
  const p = parseName(nm);
  if(!p.ok){ fails.push(nm+": parse failed"); continue; }
  const g = nameGraph(p.mol);
  const speakable = (g.parts||[]).filter(x=>x.kind!=="punctuation");
  const mute = speakable.filter(x=>!x.label || x.label.length < 8);
  if(mute.length){
    fails.push(`${nm}\n    ${mute.length} part(s) have no usable explanation`);
    continue;
  }
  /* a locant map must cover the parent skeleton */
  if(!g.locants || !Object.keys(g.locants).length){
    fails.push(`${nm}: no locant map returned`); continue;
  }
  pass++;
}
/* stereo descriptors say what R, S, E and Z actually mean */
chk("Z is explained", /zusammen/.test(
  (nameGraph(parseName("(2Z)-but-2-ene").mol).parts.find(x=>x.kind==="stereo")||{}).label||""), true);
chk("E is explained", /entgegen/.test(
  (nameGraph(parseName("(2E)-but-2-ene").mol).parts.find(x=>x.kind==="stereo")||{}).label||""), true);
chk("R is explained", /rectus/.test(
  (nameGraph(parseName("(2R)-butan-2-ol").mol).parts.find(x=>x.kind==="stereo")||{}).label||""), true);
chk("S is explained", /sinister/.test(
  (nameGraph(parseName("(2S)-butan-2-ol").mol).parts.find(x=>x.kind==="stereo")||{}).label||""), true);
/* locants line up with the numbering the name used */
(() => {
  const g = nameGraph(parseName("2-chlorobutane").mol);
  const cl = g.parts.find(x=>x.text.includes("chloro"));
  const clAtom = cl.atoms[0];
  const host = g.mol.bonds.find(b=>b.a===clAtom||b.b===clAtom);
  const carbon = host.a===clAtom ? host.b : host.a;
  chk("chlorine sits on carbon 2", g.locants[carbon], 2);
})();


/* ---- 45. unsaturated bridged ring systems ---- */
(() => {
  const unsat = (skeleton) => {
    const b = parseName(skeleton);
    const m = { atoms:b.mol.atoms.map(a=>({...a})), bonds:b.mol.bonds.map(x=>({...x})) };
    const deg = {};
    m.bonds.forEach(x=>{ deg[x.a]=(deg[x.a]||0)+1; deg[x.b]=(deg[x.b]||0)+1; });
    const c = m.bonds.find(x=>deg[x.a]===2 && deg[x.b]===2);
    if(c) c.order = 2;
    return nameGraph(m);
  };
  const nb = unsat("bicyclo[2.2.1]heptane");
  chk("norbornene named", nb.ok, true);
  chk("norbornene name", nb.name, "bicyclo[2.2.1]hept-2-ene");
  const oc = unsat("bicyclo[4.4.0]decane");
  chk("octalin named", oc.ok, true);
  chk("octalin name", oc.name, "bicyclo[4.4.0]dec-2-ene");
  /* the saturated forms are untouched */
  chk("saturated still fine", parseName("bicyclo[2.2.1]heptane").canonical,
    "bicyclo[2.2.1]heptane");
  /* the retained aromatics still win over the systematic form */
  chk("naphthalene still retained", parseName("naphthalene").canonical, "naphthalene");
  chk("anthracene still retained", parseName("anthracene").canonical, "anthracene");
})();


/* ---- 46. ring systems explain themselves ---- */
for(const nm of ["spiro[4.5]decane","2-methylspiro[4.5]decane","bicyclo[2.2.1]heptane",
                 "2-methylbicyclo[2.2.1]heptane","naphthalene","1-methylnaphthalene"]){
  const p = parseName(nm);
  if(!p.ok){ fails.push(nm+': parse failed'); continue; }
  const g = nameGraph(p.mol);
  if(!g.parts || !g.parts.length){ fails.push(nm+': no parts'); continue; }
  if(g.parts.map(x=>x.text).join('') !== g.name){
    fails.push(nm+'\n    parts rejoin as "'+g.parts.map(x=>x.text).join('')+'"'); continue;
  }
  const mute = g.parts.filter(x=>x.kind!=='punctuation' && (!x.label || x.label.length<8));
  if(mute.length){ fails.push(nm+': '+mute.length+' part(s) unexplained'); continue; }
  pass++;
}
chk('spiro brackets explained', /sharing a single atom/.test(
  nameGraph(parseName('spiro[4.5]decane').mol).parts[0].label), true);
chk('bicyclo brackets explained', /bridgehead/.test(
  nameGraph(parseName('bicyclo[2.2.1]heptane').mol).parts[0].label), true);
chk('ring systems carry locants',
  Object.keys(nameGraph(parseName('2-methylspiro[4.5]decane').mol).locants||{}).length > 0, true);


/* ---- 47. heteroatoms in bridged ring systems, and benzo names ---- */
for(const nm of ['8-azabicyclo[3.2.1]octane','2-azabicyclo[2.2.1]heptane',
                 '7-oxabicyclo[2.2.1]heptane']){
  const p=parseName(nm);
  if(!p.ok){ fails.push(nm+': '+p.err); continue; }
  const g=nameGraph(p.mol);          /* the DRAWN structure must name back */
  if(!g.ok || g.name!==nm){ fails.push(nm+' redrawn as '+(g.name||g.err)); continue; }
  pass++;
}
chk('aza prefix explained', /aza is nitrogen/.test(
  (nameGraph(parseName('8-azabicyclo[3.2.1]octane').mol).parts||[])
    .map(x=>x.label||'').join(' ')), true);
for(const [alias,want] of [['2,3-benzopyrrole','indole'],['benzopyrrole','indole'],
                           ['2,3-benzofuran','benzofuran'],['benzo[b]thiophene','benzothiophene'],
                           ['1-benzazine','quinoline'],['2-benzazine','isoquinoline'],
                           ['1,3-diazine','pyrimidine'],['1,2-diazole','pyrazole'],
                           ['azabenzene','pyridine']])
  chk('alias '+alias, parseName(alias).canonical, want);


/* ---- 48. three- and four-membered heterocycles ---- */
["aziridine","oxirane","thiirane","azetidine","oxetane","thietane","thiane",
 "1,3-dioxolane","1,3-dioxane","1,3-diazetidine","1,3-dioxetane",
 "imidazolidine","oxazolidine","thiazolidine"].forEach(rt);
chk("thietane formula",  parseName("thietane").formula,  "C3H6S");
chk("oxetane formula",   parseName("oxetane").formula,   "C3H6O");
chk("aziridine formula", parseName("aziridine").formula, "C2H5N");
chk("alias ethylene oxide", parseName("ethylene oxide").canonical, "oxirane");
chk("substituted small ring", parseName("2-methylthietane").canonical, "2-methylthietane");
/* a drawn four-ring with sulfur must name itself */
(() => {
  const ring = (n, el) => ({
    atoms: Array.from({length:n},(_,i)=>{
      const a = Math.PI*2*i/n - Math.PI/2;
      return { id:i+1, x:Math.round(100+40*Math.cos(a)), y:Math.round(100+40*Math.sin(a)),
               ...(i===0 ? { el } : {}) };
    }),
    bonds: Array.from({length:n},(_,i)=>({ a:i+1, b:i+2>n?1:i+2, order:1 })),
  });
  chk("drawn 4-ring with S", nameGraph(ring(4,"S")).name, "thietane");
  chk("drawn 3-ring with O", nameGraph(ring(3,"O")).name, "oxirane");
  chk("drawn 4-ring with N", nameGraph(ring(4,"N")).name, "azetidine");
})();
/* dioxolane must not be mistaken for an oxo prefix */
chk("dioxolane not read as oxo", parseName("1,3-dioxolane").formula, "C3H6O2");


/* ---- 49. a demoted nitrile keeps its carbon out of the parent chain ---- */
["4-cyanobutanoic acid","3-cyanopropanoic acid","3-cyanopentanoic acid",
 "2-amino-4-cyanobutanoic acid"].forEach(rt);
chk("cyano carbon excluded", parseName("4-cyanobutanoic acid").formula, "C5H7NO2");
/* when the nitrile IS the principal group its carbon stays in the chain */
["butanenitrile","propanenitrile","2-hydroxypropanenitrile","pentanedinitrile"].forEach(rt);
chk("nitrile suffix counts its carbon", parseName("butanenitrile").formula, "C4H7N");

/* ---- 50. unsaturated bridged systems parse as well as name ---- */
["bicyclo[2.2.1]hept-2-ene","bicyclo[2.2.2]oct-2-ene","bicyclo[4.4.0]dec-2-ene"].forEach(rt);
chk("norbornene formula", parseName("bicyclo[2.2.1]hept-2-ene").formula, "C7H10");
chk("bad ene locant refused", parseName("bicyclo[2.2.1]hept-9-ene").err, "impossible");

/* ---- 51. aspirin ---- */
chk("aspirin formula", parseName("aspirin").formula, "C9H8O4");
chk("aspirin name", parseName("aspirin").canonical, "2-(ethanoyloxy)benzoic acid");
chk("alias acetylsalicylic acid",
  parseName("acetylsalicylic acid").canonical, "2-(ethanoyloxy)benzoic acid");


/* ---- 52. a demoted ester is cited, never dropped ---- */
(() => {
  /* the whole ester used to vanish, leaving a name for a smaller molecule */
  for(const [nm, want] of [["aspirin","2-(ethanoyloxy)benzoic acid"],
                           ["2-acetyloxybenzoic acid","2-(ethanoyloxy)benzoic acid"],
                           ["2-acetoxybenzoic acid","2-(ethanoyloxy)benzoic acid"],
                           ["3-ethanoyloxypropanoic acid","3-(ethanoyloxy)propanoic acid"]]){
    const p = parseName(nm);
    if(!p.ok){ fails.push(nm+": "+p.err); continue; }
    chk(`${nm} names in full`, nameGraph(p.mol).name, want);
  }
  /* the name must describe the whole molecule, not a fragment of it */
  const a = parseName("aspirin");
  chk("aspirin keeps every atom", nameGraph(a.mol).formula, "C9H8O4");
  /* an ester that IS the principal group is unaffected */
  chk("ester suffix unaffected", parseName("ethyl ethanoate").canonical, "ethyl ethanoate");
  chk("acyloxy round-trips",
    parseName(parseName("aspirin").canonical).formula, "C9H8O4");
})();


/* ---- 53. indicated hydrogen, polyene substituents, substituent stereo ---- */
chk("1H-pyrrole",          parseName("1H-pyrrole").canonical,        "pyrrole");
chk("1H-indole",           parseName("1H-indole").canonical,         "indole");
chk("indicated H mid-name", parseName("2-methyl-1H-pyrrole").canonical, "2-methylpyrrole");
chk("indicated H explained", /marks which ring atom/.test(
  parseName("1H-pyrrole").note || ""), true);

/* a substituent may carry several double bonds of its own */
chk("dienyl substituent builds",
  parseName("2-(6-methylocta-2,4-dienyl)-1H-pyrrole").formula, "C13H19N");
chk("nested brackets parse",
  parseName("2-((2E,4E)-6-methylocta-2,4-dienyl)-1H-pyrrole").formula, "C13H19N");

/* the geometry asked for inside a substituent must actually be drawn: this
   used to be stripped and ignored, so every isomer came out the same */
(() => {
  const drawn = nm => {
    const r = parseName(nm);
    if(!r.ok) return "refused";
    return nameGraph(r.mol).stereo.doubles.map(d=>d.config||"-").join(",");
  };
  const base = "6-methylocta-2,4-dienyl)-1H-pyrrole";
  chk("substituent (2E,4E)", drawn("2-((2E,4E)-"+base), "E,E");
  chk("substituent (2Z,4Z)", drawn("2-((2Z,4Z)-"+base), "Z,Z");
  chk("substituent (2Z,4E)", drawn("2-((2Z,4E)-"+base), "Z,E");
  chk("substituent (2E,4Z)", drawn("2-((2E,4Z)-"+base), "E,Z");
  /* the four isomers must be genuinely different structures */
  const set = new Set(["E,E","Z,Z","Z,E","E,Z"].map((_,i)=>
    drawn("2-((2"+["E","Z","Z","E"][i]+",4"+["E","Z","E","Z"][i]+")-"+base)));
  chk("four distinct isomers", set.size, 4);
})();


/* ---- 54. the specially-built molecules explain themselves too ---- */
for(const nm of ["tropane","cocaine"]){
  const r = parseName(nm);
  if(!r.ok){ fails.push(nm+": "+r.err); continue; }
  if(!r.parts || !r.parts.length){ fails.push(nm+": no tappable parts"); continue; }
  /* the pieces must reassemble into exactly the name shown */
  if(r.parts.map(x=>x.text).join("") !== r.canonical){
    fails.push(`${nm}\n    parts rejoin as "${r.parts.map(x=>x.text).join("")}"`);
    continue;
  }
  /* every piece must say something useful, and point at real atoms */
  const ids = new Set(r.mol.atoms.map(a=>a.id));
  const mute = r.parts.filter(x=>!x.label || x.label.length < 12);
  const ghost = r.parts.flatMap(x=>x.atoms||[]).filter(id=>!ids.has(id));
  if(mute.length){ fails.push(nm+": "+mute.length+" part(s) unexplained"); continue; }
  if(ghost.length){ fails.push(nm+": parts point at missing atoms"); continue; }
  pass++;
}
/* caffeine is derived, not hand-built: the purine template supplies the
   skeleton, the numbering, the substituent locants and the dione suffix */
chk("caffeine name",    parseName("caffeine").canonical, "1,3,7-trimethylpurine-2,6-dione");
chk("caffeine formula", parseName("caffeine").formula,   "C8H10N4O2");
chk("caffeine numbers its ring",
  Object.keys(parseName("caffeine").locants || {}).length, 9);
chk("caffeine splits into three pieces", parseName("caffeine").parts.length, 3);
chk("caffeine dione explained", /ketone groups at ring positions 2 and 6/.test(
  parseName("caffeine").parts.find(x=>x.text.includes("dione")).label), true);
/* the same template table names systems that used to be refused outright */
chk("5-methylindole",    parseName("5-methylindole").canonical,    "5-methylindole");
chk("3-methylindole",    parseName("3-methylindole").canonical,    "3-methylindole");
chk("2-methylquinoline", parseName("2-methylquinoline").canonical, "2-methylquinoline");
/* and a saturated decalin is still never mistaken for naphthalene */
chk("decalin not naphthalene", parseName("bicyclo[4.4.0]decane").canonical,
  "bicyclo[4.4.0]decane");
/* aspirin is now assembled by the ordinary acyloxy route, not a builder */
chk("aspirin has no special case", parseName("aspirin").canonical,
  "2-(ethanoyloxy)benzoic acid");


/* ---- 55. complex substituents can be taken apart piece by piece ---- */
(() => {
  const seg = nm => {
    const p = parseName(nm);
    if(!p.ok) return null;
    return nameGraph(p.mol).parts || null;
  };
  for(const nm of ["5-(1-fluoroethyl)decane","3-(iodomethyl)decane",
                   "2,2-dimethyl-3-(3-propan-2-ylphenyl)cyclopropan-1-ol",
                   "4-(2-chloroethyl)heptane"]){
    const parts = seg(nm);
    if(!parts){ fails.push(nm+": no parts"); continue; }
    const g = nameGraph(parseName(nm).mol);
    if(parts.map(x=>x.text).join("") !== g.name){
      fails.push(`${nm}\n    parts rejoin as "${parts.map(x=>x.text).join("")}"`);
      continue;
    }
    /* the substituent must break into more than one piece */
    const inner = parts.filter(x=>x.kind!=="punctuation");
    if(inner.length < 4){ fails.push(nm+": only "+inner.length+" pieces, expected finer detail"); continue; }
    /* and every piece that claims atoms must claim real ones */
    const ids = new Set(parseName(nm).mol.atoms.map(a=>a.id));
    if(parts.flatMap(x=>x.atoms||[]).some(id=>!ids.has(id))){
      fails.push(nm+": a piece points at a missing atom"); continue;
    }
    /* no piece other than punctuation may be empty */
    if(inner.some(x=>!x.atoms || !x.atoms.length)){
      fails.push(nm+": a piece highlights nothing"); continue;
    }
    pass++;
  }
  /* the branch pieces must be smaller than the whole branch */
  const p = nameGraph(parseName("5-(1-fluoroethyl)decane").mol).parts;
  const fluoro = p.find(x=>x.text==="1-fluoro");
  const ethyl  = p.find(x=>x.text==="ethyl");
  chk("fluoro highlights just the fluorine", fluoro.atoms.length, 1);
  chk("ethyl highlights just the branch",    ethyl.atoms.length,  2);
})();


/* ---- 56. E/Z and cis/trans as two wordings of the same geometry ---- */
(() => {
  const both = nm => {
    const p = parseName(nm);
    if(!p.ok) return null;
    return { ez: nameGraph(p.mol).name,
             ct: nameGraph(p.mol, { stereoStyle:"cistrans" }).name,
             mol: p.mol };
  };
  const z = both("(2Z)-but-2-ene");
  chk("Z stays Z by default",      z.ez, "(2Z)-but-2-ene");
  chk("Z becomes cis on request",  z.ct, "cis-but-2-ene");
  const e = both("(2E)-but-2-ene");
  chk("E stays E by default",      e.ez, "(2E)-but-2-ene");
  chk("E becomes trans on request",e.ct, "trans-but-2-ene");
  chk("longer chain too", both("(2E)-pent-2-ene").ct, "trans-pent-2-ene");
  /* the wording changes, the molecule does not */
  chk("same structure either way",
    nameGraph(z.mol).formula, nameGraph(z.mol, { stereoStyle:"cistrans" }).formula);
  /* cis/trans is declined where it has no meaning */
  const m = both("2-methylbut-2-ene");
  chk("no descriptor to convert", m.ct, m.ez);
})();

/* every stereo descriptor explains what it means, in both wordings */
(() => {
  const label = (nm, style) => {
    const p = parseName(nm);
    const g = nameGraph(p.mol, style ? { stereoStyle:style } : undefined);
    const s = (g.parts||[]).find(x=>x.kind==="stereo");
    return s ? s.label : "";
  };
  chk("R explained",     /rectus/.test(label("(2R)-butan-2-ol")), true);
  chk("R gives the rule",/lowest away/.test(label("(2R)-butan-2-ol")), true);
  chk("S explained",     /sinister/.test(label("(2S)-butan-2-ol")), true);
  chk("Z explained",     /zusammen/.test(label("(2Z)-but-2-ene")), true);
  chk("E explained",     /entgegen/.test(label("(2E)-but-2-ene")), true);
  /* a ring bearing two centres gives each its own tappable piece */
  (() => {
    const g = nameGraph(parseName("(1R,2S)-2-methylcyclohexan-1-ol").mol);
    const st = (g.parts||[]).filter(x=>x.kind==="stereo");
    chk("each ring centre is its own piece", st.length, 2);
    chk("first centre labelled 1R", st[0].text, "1R");
    chk("second centre labelled 2S", st[1].text, "2S");
    chk("first explains carbon 1", /carbon 1 is R/.test(st[0].label), true);
    chk("second explains carbon 2", /carbon 2 is S/.test(st[1].label), true);
    /* and each highlights only its own centre and neighbours */
    chk("centres highlight separately",
      st[0].atoms.join() !== st[1].atoms.join(), true);
  })();
  /* the cis wording explains why it is allowed here */
  chk("cis explains the one-hydrogen rule",
    /one hydrogen/.test(label("(2Z)-but-2-ene","cistrans")), true);
  chk("cis names its E\/Z equivalent",
    /2Z/.test(label("(2Z)-but-2-ene","cistrans")), true);
  /* and E/Z notes when cis\/trans would also be available */
  chk("E\/Z mentions the alternative",
    /may also be written cis/.test(label("(2Z)-but-2-ene")), true);
})();


/* ---- 57. synonyms, each verified to build the same molecule ---- */
(() => {
  const names = nm => synonymsFor(nm).synonyms.map(s=>s.name);
  const has = (nm, want) => names(nm).some(x=>x.toLowerCase()===want.toLowerCase());
  chk("acetic acid for ethanoic",   has("ethanoic acid","acetic acid"), true);
  chk("picric acid",                has("2,4,6-trinitrophenol","picric acid"), true);
  chk("stearic acid",               has("octadecanoic acid","stearic acid"), true);
  chk("toluene",                    has("methylbenzene","toluene"), true);
  chk("glycine",                    has("2-aminoethanoic acid","glycine"), true);
  chk("caffeine",                   has("1,3,7-trimethylpurine-2,6-dione","caffeine"), true);
  chk("aspirin",                    has("2-(ethanoyloxy)benzoic acid","aspirin"), true);
  chk("ethylene oxide",             has("oxirane","ethylene oxide"), true);
  chk("chloroform",                 has("trichloromethane","chloroform"), true);
  chk("older locant style",         has("butan-2-ol","2-butanol"), true);
  chk("cis wording offered",        has("(2Z)-but-2-ene","cis-but-2-ene"), true);
  /* every synonym offered must really build the same molecule */
  for(const nm of ["ethanoic acid","octadecanoic acid","2,4,6-trinitrophenol","butan-2-ol",
                   "(2Z)-but-2-ene","propan-2-one","indole","oxirane",
                   "1,3,7-trimethylpurine-2,6-dione","2-(ethanoyloxy)benzoic acid"]){
    const canon = parseName(nm).canonical;
    const wrong = synonymsFor(nm).synonyms.filter(s=>parseName(s.name).canonical !== canon);
    if(wrong.length) fails.push(`${nm}: offers ${wrong.map(w=>w.name).join(", ")} which build something else`);
    else pass++;
  }
  /* a molecule with no other name says so rather than inventing one */
  chk("no invented synonyms", synonymsFor("3-ethylhexane").synonyms.length, 0);
  /* the name asked about is never offered back */
  chk("never repeats the query",
    names("acetic acid").some(x=>x==="acetic acid"), false);
})();


/* ---- 58. a mis-numbered name is accepted, and the fault named ---- */
(() => {
  const chkIssue = (given, want, issue) => {
    const r = parseName(given);
    if(!r.ok){ fails.push(`${given}: refused (${r.err}) instead of being accepted`); return; }
    chk(`${given} builds`,        r.canonical, want);
    chk(`${given} flagged`,       r.issue,     issue);
    if(!r.note || r.note.length < 20) fails.push(`${given}: no explanation given`);
    else pass++;
  };
  /* numbered from the wrong end: same groups, wrong locants */
  chkIssue("3-methylbutane",     "2-methylbutane",     "numbering");
  chkIssue("4-methylpentane",    "2-methylpentane",    "numbering");
  chkIssue("3-methylbutan-4-ol", "2-methylbutan-1-ol", "numbering");
  /* the wrong parent chain was chosen */
  chkIssue("1-methylbutane",     "pentane",            "parent");
  chkIssue("2-ethylbutane",      "3-methylpentane",    "parent");
  /* an older or trivial spelling is not an error */
  chkIssue("2-butanol",          "butan-2-ol",         "style");
  chkIssue("acetic acid",        "ethanoic acid",      "style");
  /* a correct name is flagged as nothing at all */
  chk("correct name unflagged",  parseName("2-methylbutane").issue, undefined);
  chk("correct name has no note", parseName("4-methylhexan-1-ol").note, undefined);
  /* the explanation says what to do about it */
  chk("numbering says why", /as low as possible/.test(parseName("3-methylbutane").note), true);
  chk("parent says why",    /longest one available/.test(parseName("2-ethylbutane").note), true);
  /* and the structure is still the right molecule */
  chk("mis-numbered still builds the molecule",
    parseName("3-methylbutane").formula, parseName("2-methylbutane").formula);
})();


/* ---- 59. von Baeyer naming for saturated polycyclics ---- */
(() => {
  const mk = (bonds, dbl=[]) => {
    const ids=[...new Set(bonds.flat())];
    return { atoms:ids.map((id,i)=>({ id, x:40+((i*43)%260), y:40+((i*67)%180) })),
             bonds:bonds.map(([a,b],i)=>({ a, b, order:dbl.includes(i)?2:1 })) };
  };
  /* the anthracene skeleton, fully saturated */
  const linear = [[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[5,7],[7,8],[8,9],[9,10],[10,6],
                  [8,11],[11,12],[12,13],[13,14],[14,9]];
  /* the phenanthrene skeleton, fully saturated */
  const angular = [[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[5,7],[7,8],[8,9],[9,10],[10,6],
                   [9,11],[11,12],[12,13],[13,14],[14,10]];
  const lin = nameGraph(mk(linear)), ang = nameGraph(mk(angular));
  chk("perhydroanthracene named",   lin.ok, true);
  chk("perhydroanthracene formula", lin.formula, "C14H24");
  chk("perhydroanthracene bracket", /^tricyclo\[8\.4\.0\./.test(lin.name), true);
  chk("perhydrophenanthrene named", ang.ok, true);
  /* the two skeletons must not come out with the same name */
  chk("linear and angular differ", lin.name !== ang.name, true);
  /* the bridge counts must add up to the number of atoms */
  (() => {
    const m = lin.name.match(/^tricyclo\[(\d+)\.(\d+)\.(\d+)\./);
    chk("bridges account for every atom",
      Number(m[1])+Number(m[2])+Number(m[3])+2, 14);
  })();
  /* two-ring systems keep their existing names */
  chk("decalin unaffected",
    nameGraph(mk([[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[5,7],[7,8],[8,9],[9,10],[10,6]])).name,
    "bicyclo[4.4.0]decane");
  /* and the aromatic forms of the same skeletons still get retained names */
  const kek = bonds => {
    const g = mk(bonds);
    const deg={}; g.atoms.forEach(a=>deg[a.id]=0);
    const solve = k => {
      if(k===g.bonds.length) return g.atoms.every(a=>deg[a.id]===1);
      const b=g.bonds[k];
      if(!deg[b.a] && !deg[b.b]){
        deg[b.a]=1; deg[b.b]=1; b.order=2;
        if(solve(k+1)) return true;
        deg[b.a]=0; deg[b.b]=0; b.order=1;
      }
      return solve(k+1);
    };
    solve(0); return nameGraph(g).name;
  };
  chk("aromatic linear is anthracene",     kek(linear),  "anthracene");
  chk("aromatic angular is phenanthrene",  kek(angular), "phenanthrene");
})();


/* ---- 60. no chain vertex is ever drawn straight through ---- */
(() => {
  /* A carbon with two bonds drawn in a straight line does not happen in a real
     structure: real bond angles are nowhere near 180 degrees. Three or four
     bonds at one atom may include an opposed pair, which is normal. */
  const straightVertices = mol => {
    const at = id => mol.atoms.find(a=>a.id===id);
    let count = 0;
    for(const a of mol.atoms){
      const nb = [];
      for(const b of mol.bonds){
        const o = b.a===a.id ? b.b : b.b===a.id ? b.a : null;
        if(o!==null) nb.push(o);
      }
      if(nb.length!==2) continue;
      const p = at(nb[0]), q = at(nb[1]);
      let d = Math.abs(Math.atan2(p.y-a.y,p.x-a.x) - Math.atan2(q.y-a.y,q.x-a.x)) % (2*Math.PI);
      if(d > Math.PI) d = 2*Math.PI - d;
      if(d > Math.PI - 0.26) count++;
    }
    return count;
  };
  for(const nm of ["butylcyclobutane","propylcyclohexane","ethylcyclohexane","propylbenzene",
                   "hexane","triacontane","butanoic acid","oleic acid","stearic acid",
                   "bicyclo[2.2.1]heptane","bicyclo[2.2.2]octane","bicyclo[4.4.0]decane",
                   "bicyclo[3.3.0]octane","8-azabicyclo[3.2.1]octane","tropane",
                   "2-methylbicyclo[2.2.1]heptane","spiro[4.5]decane"]){
    const p = parseName(nm);
    if(!p.ok){ fails.push(`${nm}: ${p.err}`); continue; }
    const n2 = straightVertices(p.mol);
    if(n2) fails.push(`${nm}\n    ${n2} carbon(s) drawn with their two bonds in a straight line`);
    else pass++;
  }
  /* a bridge of any length arcs, so its middle atoms are never in line */
  chk("tropane hyphenates its prefix",
    parseName("tropane").canonical, "8-methyl-8-azabicyclo[3.2.1]octane");
})();

/* ---- report ---- */
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { console.log("\n" + fails.join("\n")); process.exit(1); }
