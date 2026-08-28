/* ================================================================
   CATALYST ENGINE v4 — STRUCTURE -> NAME
   ================================================================ */
import {
  normalise, expandSugar, buildAdj, findRings, ringSystems,
  validate, formulaOf, ROOT, MULT, HALO,
} from "./core.js";
import { perceiveGroups, principalKind, GROUPS } from "./groups.js";
import { findStereo, cisTransApplicable } from "./stereo.js";

/* size | aromatic? | heteroatoms with their locants  ->  retained name */
const HETERO_RINGS = {
  /* three-membered */
  "3|s|N1":"aziridine",  "3|s|O1":"oxirane",     "3|s|S1":"thiirane",
  /* four-membered */
  "4|s|N1":"azetidine",  "4|s|O1":"oxetane",     "4|s|S1":"thietane",
  "4|s|N1,N3":"1,3-diazetidine", "4|s|O1,O3":"1,3-dioxetane",
  /* five and six */
  "6|a|N1":"pyridine",   "6|s|N1":"piperidine",
  "5|a|N1":"pyrrole",    "5|s|N1":"pyrrolidine",
  "5|a|O1":"furan",      "5|s|O1":"oxolane",
  "5|a|S1":"thiophene",  "5|s|S1":"thiolane",
  "6|s|O1":"oxane",      "6|a|N1,N3":"pyrimidine",
  "6|a|N1,N4":"pyrazine","6|a|N1,N2":"pyridazine",
  "5|a|N1,N3":"imidazole","5|a|N1,N2":"pyrazole",
  "6|s|O1,O4":"1,4-dioxane", "6|s|N1,N4":"piperazine",
  "6|s|O1,O3":"1,3-dioxane", "5|s|O1,O3":"1,3-dioxolane",
  "5|s|N1,N3":"imidazolidine", "5|s|O1,N3":"oxazolidine", "5|s|N1,O3":"oxazolidine",
  "5|s|S1,N3":"thiazolidine", "5|s|N1,S3":"thiazolidine",
  "6|s|S1":"thiane",     "6|a|O1":"pyrylium",
  "5|a|O1,N3":"oxazole", "5|a|S1,N3":"thiazole",
  "5|a|N1,O3":"oxazole", "5|a|N1,S3":"thiazole",
};

const cmpList = (A,B) => {
  for(let i=0;i<Math.max(A.length,B.length);i++){
    const x=A[i]??Infinity, y=B[i]??Infinity;
    if(x!==y) return x-y;
  }
  return 0;
};
const locList = s => s.split(",").map(Number);

/* ---------------- substituent naming (recursive) ----------------
   The substituent's own parent chain is the longest chain through its
   attachment atom, numbered so that atom gets the lowest locant. That is what
   turns an isopropyl group into propan-2-yl rather than 1-methylethyl. Double
   and triple bonds inside the substituent are named too. */
const YL_RETAINED = {
  "propan-2-yl":"propan-2-yl",
  "2-methylpropan-2-yl":"2-methylpropan-2-yl",
  "butan-2-yl":"butan-2-yl",
  "2-methylpropyl":"2-methylpropyl",
};
function nameSubstituent(start, from, ctx){
  const { adj, byId, ringAtoms } = ctx;
  const branchAtomsIn = (s, block) => {
    const seen=new Set([s]), st=[s];
    while(st.length){
      const v=st.pop();
      for(const e of adj.get(v)) if(e.to!==block && !seen.has(e.to)){ seen.add(e.to); st.push(e.to); }
    }
    return [...seen];
  };
  if(ringAtoms.has(start)){
    const sys = ctx.ringOf.get(start);
    if(sys && sys.ring && !sys.fused){
      const ring = sys.ring;
      const base = sys.aromatic && sys.size===6 ? "phenyl" : "cyclo"+ROOT[sys.size]+"yl";
      /* anything hanging off the ring has to be named and numbered from the
         attachment atom, so a tolyl group does not come back as plain phenyl */
      const extras=[];
      for(const id of ring){
        for(const e of adj.get(id)){
          if(ring.includes(e.to) || e.to===from) continue;
          const t = byId.get(e.to);
          const nm = t.el!=="C" ? ctx.prefixFor(id, e.to)
                                : nameSubstituent(e.to, id, ctx).name;
          if(!nm) return { name:null, complex:true };
          extras.push({ at:id, name:nm, atoms:branchAtomsIn(e.to, id) });
        }
      }
      if(!extras.length)
        return { name:base, complex:false,
          parts:[{ text:base, kind:"parent", atoms:[...ring], numbered:true,
            label: base==="phenyl"
              ? "a benzene ring joined to the parent"
              : `a ${ring.length}-carbon ring joined to the parent` }] };
      /* number both ways round from the attachment and keep the lower set */
      const n2 = ring.length;
      const startIdx = ring.indexOf(start);
      let best=null;
      for(const dir of [1,-1]){
        const loc = id => ((dir*(ring.indexOf(id)-startIdx))%n2+n2)%n2 + 1;
        const items = extras.map(x=>({ loc:loc(x.at), name:x.name, at:x.at, atoms:x.atoms }));
        const key = items.map(i=>i.loc).sort((a,b)=>a-b);
        if(!best || key.join()<best.key.join()){ best={ key, items }; }
      }
      const byName={};
      best.items.forEach(i=>{ (byName[i.name]=byName[i.name]||[]).push(i.loc); });
      const alphaR = s => s.replace(/^(di|tri|tetra)/,"");
      const pre = Object.keys(byName)
        .sort((a,b)=>alphaR(a)<alphaR(b)?-1:alphaR(a)>alphaR(b)?1:0)
        .map(nm=>{
          const l=byName[nm].sort((a,b)=>a-b);
          return `${l.join(",")}-${MULT[l.length]||""}${nm}`;
        }).join("-");
      /* split the aryl group so its own substituents can be examined */
      const aryParts=[];
      const keys = Object.keys(byName)
        .sort((a,b)=>alphaR(a)<alphaR(b)?-1:alphaR(a)>alphaR(b)?1:0);
      keys.forEach((nm2,i)=>{
        const l=byName[nm2].sort((a,b)=>a-b);
        aryParts.push({ text:`${l.join(",")}-${MULT[l.length]||""}${nm2}`,
          kind:"substituent", locs:l,
          atoms:best.items.filter(x=>x.name===nm2)
            .flatMap(x=>x.atoms && x.atoms.length ? x.atoms : (x.at?[x.at]:[])),
          label:`${l.length>1?"groups":"a group"} on ring position${l.length>1?"s":""} ${l.join(" and ")}, counted from the atom that joins the parent` });
        if(i<keys.length-1) aryParts.push({ text:"-", kind:"punctuation", atoms:[] });
      });
      aryParts.push({ text:base, kind:"parent", atoms:[...ring], numbered:true,
        label: base==="phenyl"
          ? "a benzene ring joined to the parent; its attachment carbon is position 1"
          : `a ${ring.length}-carbon ring joined to the parent` });
      const rejoinAry = aryParts.map(p=>p.text).join("");
      return { name: pre+base, complex:false, needsParens:true,
               parts: rejoinAry===(pre+base) ? aryParts : null };
    }
    if(sys) return { name:"cyclo"+ROOT[sys.size]+"yl", complex:false };
  }
  /* every path through the branch, both directions, that touches `start` */
  const paths=[];
  /* A substituent's own parent chain is ACYCLIC. A ring reached from that
     chain is a separate cyclic substituent hanging off it — cyclohexyl and so
     on — not more chain.

     Without this guard the walk steps into the ring and unrolls it: a chain of
     four carbons ending in a cyclohexane came back as "decyl", six ring
     carbons silently becoming chain, and the name then described a molecule
     with one ring fewer than the structure had.

     Only applies when the walk starts OUTSIDE a ring. A substituent whose
     attachment atom is itself in a ring is handled above, and the fused case
     falls through to here deliberately. */
  const startInRing = ringAtoms.has(start);
  const walk=(v,prev,path)=>{
    let extended=false;
    for(const e of adj.get(v)){
      if(e.to===prev || e.to===from) continue;
      if(byId.get(e.to).el!=="C") continue;
      if(path.includes(e.to)) continue;
      if(!startInRing && ringAtoms.has(e.to)) continue;
      extended=true;
      walk(e.to, v, [...path, e.to]);
    }
    if(!extended) paths.push(path);
  };
  walk(start, from, [start]);
  if(!paths.length) paths.push([start]);

  /* join two arms through the attachment to form the longest chain */
  const chains=[];
  for(const a of paths) for(const b of paths){
    if(a===b){ chains.push(a); continue; }
    if(a[1]!==undefined && b[1]!==undefined && a[1]===b[1]) continue;
    const merged=[...a.slice().reverse(), ...b.slice(1)];
    if(new Set(merged).size===merged.length) chains.push(merged);
  }
  chains.sort((x,y)=>y.length-x.length);
  let chain=chains[0]||[start];
  /* number so the attachment gets the lower locant */
  const idxFwd=chain.indexOf(start), idxRev=chain.length-1-idxFwd;
  if(idxRev<idxFwd) chain=[...chain].reverse();
  const attachLoc=chain.indexOf(start)+1;
  const len=chain.length;
  if(len>20) return { name:null, complex:true };

  const pos=new Map(chain.map((id,i)=>[id,i+1]));
  const eneL=[], yneL=[];
  for(let i=1;i<chain.length;i++){
    const e=adj.get(chain[i-1]).find(x=>x.to===chain[i]);
    if(e && e.order===2) eneL.push(i);
    if(e && e.order===3) yneL.push(i);
  }
  const subs=[];
  for(const id of chain){
    for(const e of adj.get(id)){
      if(e.to===from || pos.has(e.to)) continue;
      const t=byId.get(e.to);
      if(t.el!=="C"){
        const p=ctx.prefixFor(id, e.to);
        if(!p) return { name:null, complex:true };
        subs.push({ loc:pos.get(id), name:p, atoms:[e.to] });
        continue;
      }
      const inner=nameSubstituent(e.to, id, ctx);
      if(!inner.name) return { name:null, complex:true };
      subs.push({ loc:pos.get(id), name: inner.needsParens ? `(${inner.name})` : inner.name,
                  atoms:branchAtomsIn(e.to, id) });
    }
  }
  const groups={};
  subs.forEach(s=>{ (groups[s.name]=groups[s.name]||[]).push(s.loc); });
  const alpha = s => s.replace(/^(di|tri|tetra)/,"");
  const prefix=Object.keys(groups)
    .sort((a,b)=>alpha(a)<alpha(b)?-1:alpha(a)>alpha(b)?1:0)
    .map(nm=>{
      const l=groups[nm].sort((a,b)=>a-b);
      if(len===1) return `${MULT[l.length]||""}${nm}`;   /* only one position exists */
      return `${l.join(",")}-${MULT[l.length]||""}${nm}`;
    }).join("-");

  const root=ROOT[len]+((eneL.length>=2||yneL.length>=2)?"a":"");
  let core;
  if(eneL.length||yneL.length){
    let u="";
    if(eneL.length) u+=`-${eneL.join(",")}-${MULT[eneL.length]||""}en`;
    if(yneL.length) u+=`-${yneL.join(",")}-${MULT[yneL.length]||""}yn`;
    const simpleEne = len<=2 && attachLoc===1 && eneL.length===1 && eneL[0]===1 && !yneL.length;
    const simpleYne = len<=2 && attachLoc===1 && yneL.length===1 && yneL[0]===1 && !eneL.length;
    core = simpleEne ? root+"enyl"
         : simpleYne ? root+"ynyl"
         : root+u+`-${attachLoc}-yl`;
  } else {
    core = attachLoc===1 ? root+"yl" : `${root}an-${attachLoc}-yl`;
  }
  const name = prefix ? prefix+core : core;

  /* Break the substituent's own name into pieces, so a long branch can be
     taken apart in the same way the parent can. Without this a complex
     substituent highlights as one undifferentiated blob. */
  const chainAtoms = [...chain];
  const parts = [];
  Object.keys(groups)
    .sort((a,b)=>alpha(a)<alpha(b)?-1:alpha(a)>alpha(b)?1:0)
    .forEach((nm2,i,arr)=>{
      const l = groups[nm2].sort((a,b)=>a-b);
      const text = len===1
        ? `${MULT[l.length]||""}${nm2}`
        : `${l.join(",")}-${MULT[l.length]||""}${nm2}`;
      const atoms = subs.filter(s=>s.name===nm2).flatMap(s=>s.atoms||[]);
      parts.push({ text, kind:"substituent", atoms, locs:l,
        label:`${l.length>1?(MULT[l.length]||l.length):"a"} ${nm2} group${l.length>1?"s":""} on ${l.length>1?"positions":"position"} ${l.join(" and ")} of this branch` });
      if(i<arr.length-1) parts.push({ text:"-", kind:"punctuation", atoms:[] });
    });
  if(eneL.length||yneL.length){
    parts.push({ text:root, kind:"parent", atoms:chainAtoms, numbered:true,
      label:`the branch's own chain of ${len} carbons, counted from the atom that joins the parent` });
    const tail = core.slice(root.length);
    parts.push({ text:tail, kind:"unsaturation",
      atoms:[...eneL,...yneL].flatMap(l=>[chain[l-1],chain[l]].filter(Boolean)),
      locs:[...eneL,...yneL],
      label:`${eneL.length?`double bonds starting at ${eneL.join(", ")}`:""}${eneL.length&&yneL.length?" and ":""}${yneL.length?`triple bonds starting at ${yneL.join(", ")}`:""}, and "-${attachLoc}-yl" marks the atom that joins the parent` });
  } else {
    parts.push({ text:core, kind:"parent", atoms:chainAtoms, numbered:true,
      label: attachLoc===1
        ? `a chain of ${len} carbon${len===1?"":"s"} joined to the parent at its first atom`
        : `a chain of ${len} carbons joined to the parent at its atom ${attachLoc}` });
  }
  const rejoin = parts.map(p=>p.text).join("");
  return { name, complex:false, needsParens: subs.length>0,
           parts: rejoin===name ? parts : null };
}

/* ================================================================
   FUSED RING TEMPLATES
   ----------------------------------------------------------------
   A fused bicyclic is named by walking its perimeter and matching the
   sequence of elements against a template. The template carries the locants
   too, so one table drives naming, numbering and substituent citation.
   Adding a ring system means adding a row, not writing code.
   ================================================================ */
export const FUSED_TEMPLATES = [
  { name:"purine",         sizes:[5,6], fusion:["4","5"], dblMin:2,
    perimeter:["1","2","3","4","9","8","7","5","6"],
    els:      ["N","C","N","C","N","C","N","C","C"] },
  { name:"indole", fusion:["3a","7a"], dblMin:4,         sizes:[5,6],
    perimeter:["1","2","3","3a","4","5","6","7","7a"],
    els:      ["N","C","C","C","C","C","C","C","C"] },
  { name:"benzofuran", fusion:["3a","7a"], dblMin:4,     sizes:[5,6],
    perimeter:["1","2","3","3a","4","5","6","7","7a"],
    els:      ["O","C","C","C","C","C","C","C","C"] },
  { name:"benzothiophene", fusion:["3a","7a"], dblMin:4, sizes:[5,6],
    perimeter:["1","2","3","3a","4","5","6","7","7a"],
    els:      ["S","C","C","C","C","C","C","C","C"] },
  { name:"quinoline", fusion:["4a","8a"], dblMin:5,      sizes:[6,6],
    perimeter:["1","2","3","4","4a","5","6","7","8","8a"],
    els:      ["N","C","C","C","C","C","C","C","C","C"] },
  { name:"isoquinoline", fusion:["4a","8a"], dblMin:5,   sizes:[6,6],
    perimeter:["1","2","3","4","4a","5","6","7","8","8a"],
    els:      ["C","N","C","C","C","C","C","C","C","C"] },
  { name:"naphthalene", fusion:["4a","8a"], dblMin:5,    sizes:[6,6],
    perimeter:["1","2","3","4","4a","5","6","7","8","8a"],
    els:      ["C","C","C","C","C","C","C","C","C","C"] },
];

/* Walk the outside of a fused two-ring system, in order. */
function perimeterOf(sys, adj, shared){
  const inSys = id => sys.atoms.has(id);
  const deg = id => adj.get(id).filter(e=>inSys(e.to)).length;
  const start = [...sys.atoms].find(id=>deg(id)===2);
  if(start===undefined) return null;
  const path=[start], seen=new Set([start]);
  for(;;){
    const v = path[path.length-1];
    const next = adj.get(v).map(e=>e.to)
      .filter(t => inSys(t) && !seen.has(t))
      .filter(t => !(shared.includes(v) && shared.includes(t)))
      .sort((a,b)=>deg(a)-deg(b))[0];
    if(next===undefined) break;
    path.push(next); seen.add(next);
  }
  return path.length===sys.atoms.size ? path : null;
}

/* Try every rotation and direction; return the template that fits together
   with the atom-to-locant map it implies. */
function matchFusedTemplate(perim, byId, sizes, sharedIds, ringDbl){
  const els = perim.map(id => byId.get(id).el || "C");
  const key = sizes.slice().sort().join();
  const out = [];
  for(const tpl of FUSED_TEMPLATES){
    if(tpl.perimeter.length !== perim.length) continue;
    if(tpl.sizes.slice().sort().join() !== key) continue;
    /* a minimum, not an exact count: a dione or an N-substituent removes ring
       double bonds without changing the skeleton, but a saturated decalin must
       never be mistaken for naphthalene */
    if(tpl.dblMin !== undefined && ringDbl !== undefined && ringDbl < tpl.dblMin) continue;
    for(const dir of [1,-1]){
      const seq = dir===1 ? perim : [...perim].reverse();
      const sEl = dir===1 ? els   : [...els].reverse();
      for(let off=0; off<seq.length; off++){
        let ok=true;
        for(let i=0;i<seq.length;i++)
          if(sEl[(off+i)%seq.length] !== tpl.els[i]){ ok=false; break; }
        if(!ok) continue;
        const labels=new Map();
        for(let i=0;i<seq.length;i++) labels.set(seq[(off+i)%seq.length], tpl.perimeter[i]);
        /* the ring-junction atoms have to land on the template's fusion
           positions: quinoline and isoquinoline share an element pattern and
           differ only in where the nitrogen sits relative to the junction */
        if(tpl.fusion && sharedIds){
          const got = sharedIds.map(id=>labels.get(id)).sort().join();
          if(got !== tpl.fusion.slice().sort().join()) continue;
        }
        out.push({ tpl, labels });
      }
    }
  }
  return out;
}

function branchOf(adj, start, block){
  const seen=new Set([start]), st=[start];
  while(st.length){
    const v=st.pop();
    for(const e of adj.get(v)) if(e.to!==block && !seen.has(e.to)){ seen.add(e.to); st.push(e.to); }
  }
  return [...seen];
}

/* Name a fused system once its template is known. The locants come from the
   template, so substituents and suffix groups are cited exactly as they are
   on any other parent. */
function nameFusedFromTemplate(hit, sys, g, adj, byId, ctx, groups){
  const { tpl, labels } = hit;
  const inSys = id => sys.atoms.has(id);
  const SUFFIXABLE = { alcohol:"ol", amine:"amine", thiol:"thiol",
                       ketone:"one", aldehyde:"al" };

  const suffixGroups = (groups||[]).filter(gr => SUFFIXABLE[gr.kind] && inSys(gr.at));
  /* A carbonyl on a ring is a ring ketone, whatever its neighbours are. The
     usual aldehyde test counts carbon neighbours, which calls caffeine's
     carbonyls aldehydes because each sits between two nitrogens. */
  const normKind = k => (k==="aldehyde" ? "ketone" : k);
  if(new Set(suffixGroups.map(gr=>normKind(gr.kind))).size > 1) return null;
  const sufKind = suffixGroups.length ? normKind(suffixGroups[0].kind) : null;
  const sufAtoms = new Set(suffixGroups.flatMap(gr=>gr.atoms||[]));

  const subs=[];
  for(const id of sys.atoms){
    for(const e of adj.get(id)){
      if(inSys(e.to) || sufAtoms.has(e.to)) continue;
      const t = byId.get(e.to);
      const nm = t.el!=="C" ? ctx.prefixFor(id, e.to)
                            : (ctx.nameSub(e.to, id) || {}).name;
      if(!nm) return null;
      const loc = labels.get(id);
      if(loc===undefined) return null;
      subs.push({ loc, name:nm, atoms:branchOf(adj, e.to, id) });
    }
  }

  const cmpLoc = (a,b) => {
    const na=parseInt(a,10), nb=parseInt(b,10);
    return na!==nb ? na-nb : String(a).localeCompare(String(b));
  };
  const byName={};
  subs.forEach(s=>{ (byName[s.name]=byName[s.name]||[]).push(s.loc); });
  const alpha = s => s.replace(/[()]/g,"").replace(/^(di|tri|tetra)/,"");
  const prefixParts = Object.keys(byName)
    .sort((a,b)=>alpha(a)<alpha(b)?-1:alpha(a)>alpha(b)?1:0)
    .map(nm=>{
      const l=byName[nm].slice().sort(cmpLoc);
      return { text:`${l.join(",")}-${MULT[l.length]||""}${nm}`, locs:l, name:nm,
        atoms:subs.filter(s=>s.name===nm).flatMap(s=>s.atoms) };
    });
  const prefixStr = prefixParts.map(p=>p.text).join("-");

  let core = tpl.name, sufText = null;
  if(sufKind){
    const locs = suffixGroups.map(gr=>labels.get(gr.at)).sort(cmpLoc);
    if(locs.some(x=>x===undefined)) return null;
    const suf = SUFFIXABLE[sufKind], mult = MULT[locs.length] || "";
    const stem = /^[aeiou]/.test(mult+suf) ? tpl.name.replace(/e$/,"") : tpl.name;
    sufText = `-${locs.join(",")}-${mult}${suf}`;
    core = stem + sufText;
  }

  const name = prefixStr + core;
  const ringAtoms=[...sys.atoms];
  const parts=[];
  prefixParts.forEach((p,i)=>{
    parts.push({ text:p.text, kind:"substituent", atoms:p.atoms, locs:p.locs,
      label:`${p.locs.length>1?(MULT[p.locs.length]||p.locs.length):"a"} ${p.name} group${p.locs.length>1?"s":""} at ring position${p.locs.length>1?"s":""} ${p.locs.join(", ")}` });
    if(i<prefixParts.length-1) parts.push({ text:"-", kind:"punctuation", atoms:[] });
  });
  const stemText = sufText ? core.slice(0, core.length - sufText.length) : tpl.name;
  parts.push({ text:stemText, kind:"parent", atoms:ringAtoms, numbered:true,
    label:`the ${tpl.name} ring system \u2014 ${tpl.sizes[0]}- and ${tpl.sizes[1]}-membered rings sharing a bond, numbered around the outside` });
  if(sufText){
    const locs = suffixGroups.map(gr=>labels.get(gr.at)).sort(cmpLoc);
    parts.push({ text:sufText, kind:"suffix", locs,
      atoms:[...sufAtoms, ...suffixGroups.map(gr=>gr.at)],
      label:`${locs.length>1?(MULT[locs.length]||locs.length):"a"} ${sufKind} group${locs.length>1?"s":""} at ring position${locs.length>1?"s":""} ${locs.join(" and ")}` });
  }

  const citedLocs = [
    ...subs.map(s=>s.loc),
    ...suffixGroups.map(gr=>labels.get(gr.at)),
  ].filter(Boolean).map(x=>parseInt(x,10)).sort((a,b)=>a-b);

  const { formula, mass } = formulaOf(g, adj);
  const rejoin = parts.map(p=>p.text).join("");
  return { ok:true, name, formula, mass, __locs:citedLocs, __full:true,
    parts: rejoin===name ? parts : undefined,
    locants: Object.fromEntries([...labels].map(([id,l])=>[id,l])),
    mol:{ atoms:g.atoms.map(a=>({...a})), bonds:g.bonds.map(b=>({...b})) },
    stereo:{ centres:[], doubles:[] },
    steps:[["Ring system", `A ${tpl.name} skeleton, numbered around its perimeter.`],
           ["Assembly", `Result: ${name}`]] };
}

/* ================================================================
   VON BAEYER NAMING
   ----------------------------------------------------------------
   A saturated polycyclic system is named from its largest ring plus the
   bonds that cut across it. Each extra bond is a bridge, cited by the
   number of atoms in it and, beyond the first, by the pair of positions
   it joins. This covers decalin, perhydroanthracene and their relatives
   without any of them being written down individually.
   ================================================================ */
function largestCycle(sys, adj){
  const inSys = id => sys.atoms.has(id);
  let best = null;
  /* the longest cycle through each bond, found by longest-path search on a
     system small enough for it to be cheap */
  for(const start of sys.atoms){
    const stack = [[start, [start], new Set([start])]];
    while(stack.length){
      const [v, path, seen] = stack.pop();
      for(const e of adj.get(v)){
        if(!inSys(e.to)) continue;
        if(e.to===start && path.length>=3){
          if(!best || path.length>best.length) best = [...path];
          continue;
        }
        if(seen.has(e.to)) continue;
        if(path.length > 24) continue;
        const s2 = new Set(seen); s2.add(e.to);
        stack.push([e.to, [...path, e.to], s2]);
      }
    }
    if(best && best.length===sys.atoms.size) break;
  }
  return best;
}

/* Name a saturated polycyclic system in von Baeyer form. Returns null when
   the shape is not one this scheme handles. */
function nameVonBaeyer(sys, g, adj, byId, subsByAtom){
  const total = sys.atoms.size;
  if(!ROOT[total]) return null;
  const ring = largestCycle(sys, adj);
  if(!ring || ring.length !== total) return null;      /* catacondensed only */

  const inRing = new Map(ring.map((id,i)=>[id,i]));
  const ringBond = (a,b) => {
    const ia = inRing.get(a), ib = inRing.get(b);
    if(ia===undefined || ib===undefined) return false;
    const d = Math.abs(ia-ib);
    return d===1 || d===ring.length-1;
  };
  /* every bond inside the system that is not part of the big ring is a chord */
  const chords = g.bonds.filter(b =>
    sys.atoms.has(b.a) && sys.atoms.has(b.b) && !ringBond(b.a, b.b));
  if(!chords.length || chords.length>3) return null;

  const nRings = chords.length + 1;
  const PREFIX = { 2:"bicyclo", 3:"tricyclo", 4:"tetracyclo" };
  if(!PREFIX[nRings]) return null;

  /* Try every way of numbering the big ring; keep the one whose bracket
     descriptors come out lowest, which is what the rules ask for. */
  let best = null;
  for(const dir of [1,-1]){
    const seq = dir===1 ? ring : [...ring].reverse();
    for(let off=0; off<seq.length; off++){
      const order = Array.from({length:seq.length},(_,i)=>seq[(off+i)%seq.length]);
      const loc = new Map(order.map((id,i)=>[id,i+1]));
      /* the main bridgeheads must be positions 1 and 1+a */
      const main = chords.find(c => loc.get(c.a)===1 || loc.get(c.b)===1);
      if(!main) continue;
      const other = loc.get(main.a)===1 ? loc.get(main.b) : loc.get(main.a);
      /* a bridge is counted by the atoms between the bridgeheads, not
         including them: bicyclo[4.4.0]decane has 4+4+0+2 = 10 */
      const a = other - 2;
      const b = total - other;
      if(a < b) continue;                       /* the larger segment comes first */
      const SUP = { "0":"\u2070","1":"\u00b9","2":"\u00b2","3":"\u00b3","4":"\u2074",
                    "5":"\u2075","6":"\u2076","7":"\u2077","8":"\u2078","9":"\u2079" };
      const sup = n2 => String(n2).split("").map(d=>SUP[d]).join("");
      const secondary = chords.filter(c=>c!==main)
        .map(c => {
          const p = [loc.get(c.a), loc.get(c.b)].sort((x,y)=>x-y);
          return { text:`0${sup(p[0])}\u02cc${sup(p[1])}`, key:p };
        })
        .sort((x,y)=>x.key[0]-y.key[0] || x.key[1]-y.key[1]);
      const bracket = [a, b, 0, ...secondary.map(s=>s.text)];
      const cmpKey = [a, b, ...secondary.flatMap(s=>s.key)];
      if(!best || cmpList(cmpKey, best.cmpKey) < 0)
        best = { bracket, cmpKey, loc, order, secondary };
    }
  }
  if(!best) return null;

  const name = `${PREFIX[nRings]}[${best.bracket.join(".")}]${ROOT[total]}ane`;
  return { name, labels:new Map([...best.loc].map(([id,l])=>[id,String(l)])),
    why:`A ring of ${total} atoms with ${chords.length} bond${chords.length===1?"":"s"} cutting across it. The numbers count the atoms in each bridge between the bridgeheads.` };
}

/* ================================================================
   POLYCYCLIC RING SYSTEMS
   Two rings sharing 2 atoms are fused, 1 atom is spiro, 3+ is bridged.
   Retained names cover the common aromatics; everything else gets the
   systematic bicyclo[x.y.z] / spiro[x.y] treatment.
   ================================================================ */
function namePolycycle(sys, g, adj, byId, allRings, ctx, groups){
  const rings = sys.rings;
  /* Saturated systems of three or more rings go to the von Baeyer namer,
     which works from the shape rather than from a list of known skeletons. */
  {
    const dbl0 = g.bonds.filter(b =>
      b.order===2 && sys.atoms.has(b.a) && sys.atoms.has(b.b)).length;
    const het0 = [...sys.atoms].filter(id=>byId.get(id).el!=="C");
    const subbed = [...sys.atoms].some(id =>
      adj.get(id).some(e=>!sys.atoms.has(e.to)));
    if(rings.length>=3 && dbl0===0 && !het0.length && !subbed){
      const vb = nameVonBaeyer(sys, g, adj, byId);
      if(vb){
        const { formula, mass } = formulaOf(g, adj);
        return { ok:true, name:vb.name, formula, mass, __full:true,
          locants:Object.fromEntries([...vb.labels]),
          parts:[{ text:vb.name, kind:"parent", atoms:[...sys.atoms], numbered:true,
                   label:vb.why }],
          mol:{ atoms:g.atoms.map(a=>({...a})), bonds:g.bonds.map(b=>({...b})) },
          stereo:{ centres:[], doubles:[] },
          steps:[["Ring system", vb.why], ["Assembly", `Result: ${vb.name}`]] };
      }
    }
  }

  if(rings.length > 3)
    return { ok:false, err:"unsupported",
      message:"Ring systems with more than three rings aren't named by this engine yet." };

  const atoms = [...sys.atoms];
  const hetero = atoms.filter(id=>byId.get(id).el!=="C");
  const total = atoms.length;
  const inSys = id => sys.atoms.has(id);

  const dblCount = g.bonds.filter(b =>
    b.order===2 && inSys(b.a) && inSys(b.b)).length;

  const shares = [];
  for(let i=0;i<rings.length;i++)
    for(let j=i+1;j<rings.length;j++){
      const s = rings[i].filter(a=>rings[j].includes(a));
      if(s.length) shares.push({ i, j, n:s.length, atoms:s });
    }
  const maxShare = Math.max(...shares.map(s=>s.n));

  /* ---- fused two-ring systems go through the template table ---- */
  if(rings.length===2 && maxShare===2){
    const perim = perimeterOf(sys, adj, shares[0].atoms);
    const ringDbl = g.bonds.filter(b =>
      b.order===2 && sys.atoms.has(b.a) && sys.atoms.has(b.b)).length;
    const hits = perim
      ? matchFusedTemplate(perim, byId, rings.map(r=>r.length), shares[0].atoms, ringDbl)
      : [];
    /* a symmetric skeleton has several valid numberings; keep the one that
       gives the substituents and suffix groups the lowest locants */
    let best = null;
    for(const hit of hits){
      const fused = nameFusedFromTemplate(hit, sys, g, adj, byId, ctx, groups);
      if(!fused) continue;
      if(!best || cmpList(fused.__locs, best.__locs) < 0) best = fused;
    }
    if(best){ delete best.__locs; return best; }
  }

  let hetOK = false;
  if(hetero.length){
    /* saturated bridged systems take the aza-/oxa-/thia- replacement prefixes */
    if(rings.length===2 && dblCount===0) hetOK = true;
    else return { ok:false, err:"unsupported",
      message:"That fused ring system containing nitrogen, oxygen or sulfur isn't named yet." };
  }


  function hasSubsEarly(){
    for(const id of atoms)
      for(const e of adj.get(id)) if(!inSys(e.to)) return true;
    return false;
  }

  /* ---- collect substituents hanging off the system ---- */
  const subsOn = new Map();          /* ringAtomId -> [prefix names] */
  let subFail = null;
  /* a principal group on the ring system takes the suffix instead */
  let pgroup = null;
  const SUFFIXABLE = { alcohol:"ol", amine:"amine", thiol:"thiol" };
  for(const gr of (groups||[])){
    if(SUFFIXABLE[gr.kind] && sys.atoms.has(gr.at)){
      if(pgroup){ pgroup = "multi"; break; }
      pgroup = { kind:gr.kind, at:gr.at, atoms:gr.atoms };
    }
  }
  if(pgroup==="multi") pgroup=null;

  for(const id of atoms){
    for(const e of adj.get(id)){
      if(inSys(e.to)) continue;
      if(pgroup && pgroup.atoms.includes(e.to)) continue;   /* that is the suffix */
      const t = byId.get(e.to);
      let nm = null;
      if(t.el !== "C"){
        nm = ctx.prefixFor(id, e.to);
      } else {
        const sn = ctx.nameSub(e.to, id);
        nm = sn.name;
      }
      if(!nm){ subFail = true; continue; }
      if(!subsOn.has(id)) subsOn.set(id, []);
      subsOn.get(id).push(nm);
    }
  }
  if(subFail)
    return { ok:false, err:"unsupported",
      message:"A substituent on that ring system is too complex to name yet." };
  const hasSubs = subsOn.size > 0 || !!pgroup;

  /* ---- assemble a name from an ordering of labels ---- */
  const buildName = (labels, base) => {
    const items = [];
    for(const [id, names] of subsOn)
      for(const nm of names) items.push({ loc:labels.get(id), name:nm });
    if(items.some(i=>i.loc===undefined)) return null;
    if(pgroup){
      const sloc = labels.get(pgroup.at);
      if(sloc===undefined) return null;
      const suf = SUFFIXABLE[pgroup.kind];
      /* elide the final e before a vowel: naphthalen-1-ol, not naphthalene-1-ol */
      const stem = /^[aeiou]/.test(suf) ? base.replace(/e$/,"") : base;
      base = stem + "-" + sloc + "-" + suf;
      items.unshift({ loc:sloc, name:"\u0000suffix" });   /* sorts first, never printed */
    }
    const byName = {};
    items.filter(i=>i.name!=="\u0000suffix")
      .forEach(i=>{ (byName[i.name]=byName[i.name]||[]).push(i.loc); });
    const alpha = s => s.replace(/^(di|tri|tetra|penta)/,"");
    const prefix = Object.keys(byName)
      .sort((a,b)=>alpha(a)<alpha(b)?-1:alpha(a)>alpha(b)?1:0)
      .map(nm=>{
        const ls = byName[nm].slice().sort(cmpLabel);
        return `${ls.join(",")}-${MULT[ls.length]||""}${nm}`;
      }).join("-");
    const joiner = prefix && /^[0-9]/.test(base) ? "-" : "";
    return { name: prefix ? prefix+joiner+base : base,
             locs: items.map(i=>i.loc).sort(cmpLabel) };
  };
  /* locants may be "4a" style, so compare numerically then alphabetically */
  function cmpLabel(a,b){
    const na=parseInt(a,10), nb=parseInt(b,10);
    if(na!==nb) return na-nb;
    return String(a).localeCompare(String(b));
  }
  const pickBest = (candidates, base) => {
    let best=null;
    for(const labels of candidates){
      const built = buildName(labels, base);
      if(!built) continue;
      built.labels = labels;
      if(!best) { best=built; continue; }
      for(let i=0;i<Math.max(built.locs.length,best.locs.length);i++){
        const c = cmpLabel(built.locs[i] ?? "999", best.locs[i] ?? "999");
        if(c<0){ best=built; break; }
        if(c>0) break;
      }
    }
    return best;
  };

  /* ================= SPIRO ================= */
  if(rings.length===2 && maxShare===1){
    const S = shares[0].atoms[0];
    const loops = rings.map(r=>r.filter(a=>a!==S));
    const [small, large] = loops[0].length<=loops[1].length ? loops : [loops[1],loops[0]];
    const a=small.length, b=large.length;
    if(dblCount) return { ok:false, err:"unsupported",
      message:"Unsaturated spiro systems aren't named yet." };
    const base = `spiro[${a}.${b}]${ROOT[total]}ane`;
    if(!hasSubs) return ok(base,
      `Two rings share a single atom \u2014 a spiro system. Excluding that atom the rings carry ${a} and ${b} atoms, so ${a}+${b}+1 = ${total}.`);
    /* order each loop starting from a neighbour of the spiro atom */
    const orderLoop = (loop, dir) => {
      const ends = loop.filter(id=>adj.get(id).some(e=>e.to===S));
      const startId = dir===0 ? ends[0] : ends[1];
      const out=[startId]; const seen=new Set([startId, S]);
      while(out.length<loop.length){
        const cur=out[out.length-1];
        const nx=adj.get(cur).map(e=>e.to).find(t=>loop.includes(t)&&!seen.has(t));
        if(nx===undefined) break;
        out.push(nx); seen.add(nx);
      }
      return out;
    };
    const cands=[];
    for(const d1 of [0,1]) for(const d2 of [0,1]){
      const o1=orderLoop(small,d1), o2=orderLoop(large,d2);
      if(o1.length!==a || o2.length!==b) continue;
      const labels=new Map();
      o1.forEach((id,i)=>labels.set(id, String(i+1)));
      labels.set(S, String(a+1));
      o2.forEach((id,i)=>labels.set(id, String(a+2+i)));
      cands.push(labels);
    }
    const best = pickBest(cands, base);
    if(!best) return { ok:false, err:"unsupported", message:"That spiro system couldn't be numbered." };
    return ok(best.name, `Spiro numbering starts beside the shared atom in the smaller ring, passes through it, then continues round the larger ring.`, best.labels);
  }

  /* ================= FUSED / BRIDGED ================= */
  if(rings.length===2){
    const share = shares[0];
    const bridgeheads = share.atoms.filter(id =>
      adj.get(id).filter(e=>inSys(e.to)).length >= 3);
    if(bridgeheads.length!==2)
      return { ok:false, err:"unsupported",
        message:"That ring system's bridgeheads couldn't be identified." };
    const [h1,h2] = bridgeheads;

    /* every independent path between the bridgeheads is a bridge */
    const paths=[];
    const walk=(v,prev,path,seen)=>{
      for(const e of adj.get(v)){
        if(!inSys(e.to) || e.to===prev) continue;
        if(e.to===h2){ paths.push(path.slice(1)); continue; }
        if(seen.has(e.to)) continue;
        seen.add(e.to); walk(e.to, v, [...path, e.to], seen); seen.delete(e.to);
      }
    };
    walk(h1, null, [h1], new Set([h1]));
    const uniq=[]; const seenKey=new Set();
    for(const p of paths){
      const k=[...p].sort((x,y)=>x-y).join(",");
      if(seenKey.has(k)) continue;
      seenKey.add(k); uniq.push(p);
    }
    let bridges = uniq.slice().sort((a,b)=>b.length-a.length);
    if(bridges.length===2) bridges.push([]);
    if(bridges.length!==3)
      return { ok:false, err:"unsupported",
        message:"That bridged system is more complex than this engine names." };
    const lens = bridges.map(b=>b.length);
    if(lens[0]+lens[1]+lens[2]+2 !== total)
      return { ok:false, err:"unsupported",
        message:"That ring system couldn't be decomposed into bridges." };

    /* aromatic retained names */
    if(dblCount===5 && total===10 && lens[0]===4 && lens[1]===4 && lens[2]===0){
      const base="naphthalene";
      if(!hasSubs) return ok(base, "Two benzene rings sharing one bond \u2014 naphthalene.");
      /* peripheral numbering: 1,2,3,4,4a,5,6,7,8,8a */
      const LAB=["1","2","3","4","4a","5","6","7","8","8a"];
      const cands=[];
      for(const flip of [0,1]) for(const sw of [0,1]){
        const A = sw ? bridges[1] : bridges[0];
        const B = sw ? bridges[0] : bridges[1];
        const a1 = flip ? [...A].reverse() : A;
        const b1 = flip ? [...B].reverse() : B;
        const seq=[...a1, h2, ...b1, h1];
        if(seq.length!==10) continue;
        const labels=new Map();
        seq.forEach((id,i)=>labels.set(id, LAB[i]));
        cands.push(labels);
      }
      const best=pickBest(cands, base);
      if(!best) return { ok:false, err:"unsupported", message:"That naphthalene couldn't be numbered." };
      return ok(best.name, "Naphthalene is numbered round its perimeter, with the ring-junction carbons labelled 4a and 8a.", best.labels);
    }
    /* Double bonds inside the ring system are named from the same numbering as
       everything else: bicyclo[2.2.1]hept-2-ene, and so on. */
    const ringDoubles = g.bonds.filter(b =>
      b.order===2 && inSys(b.a) && inSys(b.b));
    const eneOf = labels => {
      const locs = [];
      for(const b of ringDoubles){
        const la = parseInt(labels.get(b.a),10), lb = parseInt(labels.get(b.b),10);
        if(!la || !lb) return null;
        /* an -ene locant is the lower of the pair, and they must be adjacent
           in the numbering (or close the ring back to 1) */
        const lo = Math.min(la,lb), hi = Math.max(la,lb);
        if(hi-lo !== 1 && !(lo===1 && hi===total)) return null;
        locs.push(hi-lo===1 ? lo : hi);
      }
      return locs.sort((x,y)=>x-y);
    };
    const stem = ROOT[total];
    if(ringDoubles.length){
      const cands = [];
      for(const startAtH1 of [true,false]) for(const flip of [0,1]){
        const S1 = startAtH1 ? h1 : h2, S2 = startAtH1 ? h2 : h1;
        const dir = seq => startAtH1 ? seq : [...seq].reverse();
        const bs = flip && lens[0]===lens[1] ? [bridges[1],bridges[0],bridges[2]] : bridges;
        const labels = new Map();
        let k = 1;
        labels.set(S1, String(k++));
        for(const id of dir(bs[0])) labels.set(id, String(k++));
        labels.set(S2, String(k++));
        for(const id of dir(bs[1]).slice().reverse()) labels.set(id, String(k++));
        for(const id of dir(bs[2])) labels.set(id, String(k++));
        if(labels.size===total) cands.push(labels);
      }
      let bestE = null;
      for(const labels of cands){
        const locs = eneOf(labels);
        if(!locs) continue;
        if(!bestE || cmpList(locs, bestE.locs) < 0) bestE = { locs, labels };
      }
      if(!bestE) return { ok:false, err:"unsupported",
        message:"That ring system's double bonds couldn't be numbered." };
      const multi = ringDoubles.length>1 ? (MULT[ringDoubles.length]||"") : "";
      const eneBase = `bicyclo[${lens.join(".")}]${stem}${multi?"a":""}-${bestE.locs.join(",")}-${multi}ene`;
      if(!hasSubs) return ok(eneBase,
        `Two bridgeheads joined by bridges of ${lens.join(", ")} atoms, with ${ringDoubles.length>1?"double bonds":"a double bond"} at ${bestE.locs.join(" and ")}.`,
        bestE.labels);
      const bestS = pickBest([bestE.labels], eneBase);
      if(!bestS) return { ok:false, err:"unsupported", message:"That ring system couldn't be numbered." };
      return ok(bestS.name,
        "Numbering starts at a bridgehead, runs along the longest bridge, and the double bonds take the lowest locants available from it.",
        bestS.labels);
    }

    /* heteroatom replacement prefixes, numbered from the same scheme */
    const hetPrefix = labels => {
      if(!hetero.length) return "";
      const EL={ N:"aza", O:"oxa", S:"thia" };
      const items = hetero.map(id=>({ el:byId.get(id).el, loc:parseInt(labels.get(id),10) }))
        .filter(h=>!isNaN(h.loc))
        .sort((a,b)=>a.loc-b.loc);
      if(items.length!==hetero.length) return null;
      const byEl={};
      items.forEach(h=>{ (byEl[h.el]=byEl[h.el]||[]).push(h.loc); });
      return Object.keys(byEl).sort((a,b)=>(EL[a]<EL[b]?-1:1)).map(el=>{
        const l=byEl[el].sort((x,y)=>x-y);
        return `${l.join(",")}-${MULT[l.length]||""}${EL[el]}`;
      }).join("-");
    };

    const baseLabels = (() => {
      const labels=new Map();
      let k=1;
      labels.set(h1, String(k++));
      for(const id of bridges[0]) labels.set(id, String(k++));
      labels.set(h2, String(k++));
      for(const id of bridges[1].slice().reverse()) labels.set(id, String(k++));
      for(const id of bridges[2]) labels.set(id, String(k++));
      return labels;
    })();

    if(hetero.length){
      /* choose the numbering that gives the heteroatoms the lowest locants */
      const cands=[];
      for(const startAtH1 of [true,false]) for(const flip of [0,1]){
        const S1 = startAtH1 ? h1 : h2, S2 = startAtH1 ? h2 : h1;
        const dir = seq => startAtH1 ? seq : [...seq].reverse();
        const bs = flip && lens[0]===lens[1] ? [bridges[1],bridges[0],bridges[2]] : bridges;
        const labels=new Map();
        let k=1;
        labels.set(S1, String(k++));
        for(const id of dir(bs[0])) labels.set(id, String(k++));
        labels.set(S2, String(k++));
        for(const id of dir(bs[1]).slice().reverse()) labels.set(id, String(k++));
        for(const id of dir(bs[2])) labels.set(id, String(k++));
        if(labels.size===total) cands.push(labels);
      }
      let bestH=null;
      for(const labels of cands){
        const locs = hetero.map(id=>parseInt(labels.get(id),10)).sort((a,b)=>a-b);
        if(locs.some(isNaN)) continue;
        if(!bestH || cmpList(locs, bestH.locs)<0) bestH={ locs, labels };
      }
      if(!bestH) return { ok:false, err:"unsupported",
        message:"That heterocyclic ring system couldn't be numbered." };
      const pre = hetPrefix(bestH.labels);
      if(pre===null) return { ok:false, err:"unsupported",
        message:"That heterocyclic ring system couldn't be numbered." };
      const hetBase = `${pre}bicyclo[${lens.join(".")}]${ROOT[total]}ane`;
      if(!hasSubs) return ok(hetBase,
        `Two bridgeheads joined by bridges of ${lens.join(", ")} atoms, with ${hetero.map(id=>byId.get(id).el).join(" and ")} replacing carbon.`,
        bestH.labels);
      const withSubs = pickBest([bestH.labels], hetBase);
      if(!withSubs) return { ok:false, err:"unsupported",
        message:"That heterocyclic ring system couldn't be numbered." };
      return ok(withSubs.name,
        "The heteroatoms take the lowest locants the bicyclic numbering allows, and the substituents follow.",
        withSubs.labels);
    }

    const base=`bicyclo[${lens.join(".")}]${ROOT[total]}ane`;
    if(!hasSubs) return ok(base,
      `Two bridgehead atoms joined by bridges of ${lens[0]}, ${lens[1]} and ${lens[2]} atoms; ${lens[0]}+${lens[1]}+${lens[2]}+2 = ${total}.`);
    /* number from a bridgehead along the longest bridge, back along the next,
       then the shortest */
    const cands=[];
    for(const startAtH1 of [true,false]){
      for(const flip of [0,1]){
        const S1 = startAtH1 ? h1 : h2, S2 = startAtH1 ? h2 : h1;
        const dir = seq => startAtH1 ? seq : [...seq].reverse();
        const bs = flip && lens[0]===lens[1] ? [bridges[1],bridges[0],bridges[2]] : bridges;
        const labels=new Map();
        let k=1;
        labels.set(S1, String(k++));
        for(const id of dir(bs[0])) labels.set(id, String(k++));
        labels.set(S2, String(k++));
        for(const id of dir(bs[1]).slice().reverse()) labels.set(id, String(k++));
        for(const id of dir(bs[2])) labels.set(id, String(k++));
        if(labels.size===total) cands.push(labels);
      }
    }
    const best=pickBest(cands, base);
    if(!best) return { ok:false, err:"unsupported", message:"That bicyclic system couldn't be numbered." };
    return ok(best.name, `Numbering starts at a bridgehead, runs along the longest bridge, back along the next, then the shortest.`, best.labels);
  }

  /* ================= three rings ================= */
  if(rings.length===3 && maxShare===2 && total===14 && dblCount===7 && !hasSubs){
    const touch = rings.map((_,k)=>shares.filter(s=>s.i===k||s.j===k).length);
    const mid = touch.indexOf(2);
    if(mid < 0) return { ok:false, err:"unsupported",
      message:"That three-ring system isn't one this engine names yet." };
    const midRing = rings[mid];
    const edgeIndex = pair => {
      for(let i=0;i<midRing.length;i++){
        const a=midRing[i], b=midRing[(i+1)%midRing.length];
        if(pair.includes(a) && pair.includes(b)) return i;
      }
      return -1;
    };
    const idxs = shares.filter(s=>s.i===mid||s.j===mid).map(s=>edgeIndex(s.atoms));
    const gap = Math.abs(idxs[0]-idxs[1]);
    const linear = Math.min(gap, midRing.length-gap) === 3;
    return ok(linear ? "anthracene" : "phenanthrene",
      linear ? "Three benzene rings fused in a straight line \u2014 anthracene."
             : "Three benzene rings fused at an angle \u2014 phenanthrene.");
  }
  return { ok:false, err:"unsupported",
    message:"That ring system isn't one this engine names yet." };

  function ok(name, why, labels){
    return { ok:true, name, labels, steps:[
      ["Ring system", why],
      ["Assembly", `Result: ${name}`]] };
  }
}

/* ---------------- main ---------------- */
export function nameGraph(graph, opts){
  let g = normalise(graph);
  const ex = expandSugar(g);
  g = { atoms:ex.atoms, bonds:ex.bonds };
  const built = buildAdj(g);
  if(built.error) return { ok:false, err:"malformed", message:built.error };
  const adj = built.adj;
  const byId = new Map(g.atoms.map(a=>[a.id,a]));

  const bad = validate(g, adj);
  /* Return the structure even when it's impossible, so the UI can show
     the learner exactly what they described and why it can't exist. */
  if(bad) return { ok:false, ...bad,
    mol:{ atoms:graph.atoms.map(a=>({...a})),
          bonds:graph.bonds.map(b=>Array.isArray(b)?[...b]:{...b}) } };

  const carbons = g.atoms.filter(a=>a.el==="C");
  if(carbons.length===0)
    return { ok:false, err:"nocarbon", message:"An organic name needs at least one carbon." };

  /* ---- rings first: heteroatoms in a ring are skeleton, not substituents ---- */
  const rings = findRings(g, adj);
  const ringAtomSet = new Set(rings.flat());

  const { groups, orphan } = perceiveGroups(g, adj, ringAtomSet);
  if(orphan)
    return { ok:false, err:"unsupported",
      message:`This engine can't yet interpret the ${orphan.el} atom in that arrangement.` };

  const systems = ringSystems(rings);
  const ringAtoms = ringAtomSet;
  const ringOf = new Map();
  for(const s of systems){
    const single = s.rings.length===1;
    const r = s.rings[0];
    const countDbl = ring => {
      let d=0;
      for(let i=0;i<ring.length;i++){
        const e=adj.get(ring[i]).find(x=>x.to===ring[(i+1)%ring.length]);
        if(e && e.order===2) d++;
      }
      return d;
    };
    const heteroIn = ring => ring.filter(id=>byId.get(id).el!=="C");
    let aromatic=false;
    if(single){
      const d=countDbl(r), het=heteroIn(r);
      if(r.length===6 && d===3) aromatic=true;               /* benzene, pyridine */
      else if(r.length===5 && d===2 && het.length>=1) aromatic=true; /* pyrrole, furan, thiophene */
    }
    const info={ size:single?r.length:s.atoms.size, aromatic, ring:r, system:s,
                 fused:!single, hetero:single?heteroIn(r):[] };
    for(const id of s.atoms) ringOf.set(id, info);
  }
  /* ---- prefix + substituent helpers (also used by the polycycle namer) ---- */
  const prefixFor = (carbon, hetero) => {
    const gr = groups.find(x=>x.at===carbon && x.atoms.includes(hetero));
    if(!gr) return null;
    if(gr.kind==="halo") return HALO[gr.extra.el];
    if(gr.kind==="nitro") return "nitro";
    if(gr.kind==="alcohol") return "hydroxy";
    if(gr.kind==="amine") return "amino";
    if(gr.kind==="ketone"||gr.kind==="aldehyde") return "oxo";
    if(gr.kind==="nitrile") return "cyano";
    return null;
  };
  const ctx={ adj, byId, ringAtoms, ringOf, prefixFor };

  /* ---- multi-ring systems: fused / spiro / bridged ---- */
  const multi = systems.find(s=>s.rings.length>1);
  if(multi){
    const poly = namePolycycle(multi, g, adj, byId, rings,
      { prefixFor, nameSub:(start,from)=>nameSubstituent(start, from, ctx) }, groups);
    if(!poly.ok) return poly;
    /* a template match already carries its own segmentation and numbering */
    if(poly.__full){ const out = { ...poly }; delete out.__full; delete out.__locs; return out; }
    const { formula, mass } = formulaOf(g, adj);

    /* Stereochemistry on a ring system reads exactly as it does on a chain:
       the wedge sits on the bond leaving the ring, and the numbering the
       polycyclic namer chose supplies the locants. */
    const ringBondKeys2=new Set();
    for(const r of rings) for(let i=0;i<r.length;i++){
      const a=r[i], b=r[(i+1)%r.length];
      ringBondKeys2.add(a<b?`${a}|${b}`:`${b}|${a}`);
    }
    const st = findStereo(g, adj, byId, ringBondKeys2);
    const labels = poly.labels || null;
    const desc2=[];
    for(const c of st.centres){
      if(!c.config) continue;
      const loc = labels ? labels.get(c.atom) : null;
      desc2.push({ loc, label:c.config });
    }
    desc2.sort((a,b)=>(parseInt(a.loc,10)||99)-(parseInt(b.loc,10)||99));
    const pfx2 = desc2.length
      ? "(" + desc2.map(x=>(x.loc!=null?x.loc:"")+x.label).join(",") + ")-" : "";

    /* break the polycyclic name into pieces so it can be explored like any
       other: the bracket notation, the ring size, and each substituent */
    const polyParts = (() => {
      const out=[];
      if(pfx2) out.push({ text:pfx2, kind:"stereo",
        atoms:st.centres.map(c=>c.atom).filter(Boolean),
        label:"the three-dimensional arrangement at each stereocentre" });
      const m = poly.name.match(/^(.*?)((?:bicyclo|spiro)\[[\d.]+\]|naphthalen|anthracen|phenanthren|indol|quinolin|isoquinolin|purin)(.*)$/);
      /* split a leading aza-/oxa-/thia- prefix off so it explains itself */
      const hetSplit = m && m[1] && m[1].match(/^(.*?)((?:\d+(?:,\d+)*-)?(?:di|tri)?(?:aza|oxa|thia)[a-z-]*)$/);
      const sysAtoms = [...multi.atoms];
      if(!m){
        out.push({ text:poly.name, kind:"parent", atoms:sysAtoms,
          label:"the fused ring system that forms the parent" });
        return out;
      }
      if(m[1]){
        if(hetSplit){
          if(hetSplit[1]) out.push({ text:hetSplit[1], kind:"substituent",
            atoms:g.atoms.map(a=>a.id).filter(id=>!multi.atoms.has(id)),
            label:"the groups attached to the ring system, at the positions shown" });
          const hetIds = [...multi.atoms].filter(id=>byId.get(id).el!=="C");
          out.push({ text:hetSplit[2], kind:"substituent", atoms:hetIds, numbered:true,
            label:`a ring atom replaced by ${hetIds.map(id=>byId.get(id).el).join(" and ")} \u2014 aza is nitrogen, oxa is oxygen, thia is sulfur` });
        } else {
          out.push({ text:m[1], kind:"substituent",
            atoms:g.atoms.map(a=>a.id).filter(id=>!multi.atoms.has(id)),
            label:"the groups attached to the ring system, at the positions shown" });
        }
      }
      const bracket = m[2].match(/\[([\d.]+)\]/);
      out.push({ text:m[2], kind:"parent", atoms:sysAtoms, numbered:true,
        label: bracket
          ? (m[2].startsWith("spiro")
              ? `two rings sharing a single atom; the numbers ${bracket[1].split(".").join(" and ")} count the atoms in each ring apart from the shared one`
              : `two bridgehead atoms joined by bridges of ${bracket[1].split(".").join(", ")} atoms`)
          : `the fused ring system that forms the parent` });
      /* a bracket name splits usefully; a retained name is one word */
      if(m[3]){
        if(bracket) out.push({ text:m[3], kind:"parent", atoms:sysAtoms,
          label:`"${m[3]}" counts every atom in the ring system \u2014 ${sysAtoms.length} in all` });
        else { out[out.length-1].text += m[3]; }
      }
      return out;
    })();
    const rejoin = polyParts.map(p=>p.text).join("");
    const polyNamed = rejoin===(pfx2+poly.name) ? polyParts
      : [{ text:pfx2+poly.name, kind:"whole", atoms:g.atoms.map(a=>a.id),
           label:"the whole ring system" }];

    return { ok:true, name:pfx2+poly.name, formula, mass, parts:polyNamed,
      locants: labels ? Object.fromEntries([...labels].map(([id,l])=>[id,l])) : undefined,
      mol:{ atoms:graph.atoms.map(a=>({...a})),
            bonds:graph.bonds.map(b=>Array.isArray(b)?[...b]:{...b}) },
      stereo:{ centres:st.centres.map(c=>({ loc:labels?labels.get(c.atom):null, ...c })),
               doubles:st.doubles.map(x=>({ a:x.bond.a, b:x.bond.b, config:x.config })) },
      steps:poly.steps };
  }

  /* ---- principal group ---- */
  const pcg = principalKind(groups);
  const anchors = new Set(groups.filter(x=>x.kind===pcg).map(x=>x.at));

  /* A -COOH or -CHO carbon hanging off a ring is named with the
     -carboxylic acid / -carbaldehyde suffix (benzoic acid, benzaldehyde). */
  let exoRing = null;
  if((pcg==="acid"||pcg==="aldehyde"||pcg==="nitrile") && ringAtoms.size){
    for(const a of anchors){
      if(ringAtoms.has(a)) continue;
      const cN = adj.get(a).filter(e=>byId.get(e.to).el==="C");
      if(cN.length===1 && ringAtoms.has(cN[0].to)){
        exoRing = { carbon:a, ring:cN[0].to,
          kind: pcg==="acid"?"carbox" : pcg==="aldehyde"?"carbald" : "carbonitrile" };
        break;
      }
    }
  }

  /* ---- pieces consumed by a two-part name (ester alkyl half, anhydride twin) ---- */
  const excluded=new Set();
  let esterAlkyl=null, anhydTwin=null, acylHalide=null;
  const reach=(start,block)=>{ const seen=new Set([start]), st=[start];
    while(st.length){ const v=st.pop();
      for(const e of adj.get(v)) if(e.to!==block && !seen.has(e.to)){ seen.add(e.to); st.push(e.to); } }
    return seen; };
  if(pcg==="ester"){
    const gr=groups.find(x=>x.kind==="ester");
    const oxy=gr.atoms[1];
    const sn=nameSubstituent(gr.extra.alkylSide, oxy, ctx);
    if(!sn.name) return { ok:false, err:"unsupported", message:"That ester's alkyl group is too complex to name yet." };
    esterAlkyl=sn.name;
    for(const id of reach(gr.extra.alkylSide, oxy)) excluded.add(id);
  }
  /* A nitrile expressed as the "cyano" prefix keeps its carbon out of the
     parent chain: 4-cyanobutanoic acid, not 5-cyanopentanoic acid. When the
     nitrile is itself the principal group its carbon stays in the chain. */
  if(pcg!=="nitrile")
    for(const gr of groups)
      if(gr.kind==="nitrile") excluded.add(gr.at);

  if(pcg==="anhyd"){
    const gr=groups.find(x=>x.kind==="anhyd");
    const oxy=gr.atoms[1];
    for(const id of reach(gr.extra.other, oxy)) excluded.add(id);
    anhydTwin=gr.extra.other;
  }
  if(pcg==="acylhal"){
    const gr=groups.find(x=>x.kind==="acylhal");
    acylHalide=gr.extra.el;
  }

  /* ================= PARENT SELECTION ================= */
  let parent=null;   /* { type:"chain"|"ring", atoms:[...], ring? } */

  const pcgOnRing = pcg && [...anchors].some(a=>ringAtoms.has(a));
  const pcgOffRing = pcg && [...anchors].some(a=>!ringAtoms.has(a));

  if(exoRing){
    const info = ringOf.get(exoRing.ring);
    parent = { type:"ring", atoms:info.ring, info };
  } else if(ringAtoms.size && (!pcg || pcgOnRing || !pcgOffRing)){
    const sys = ringOf.get([...ringAtoms][0]);
    /* choose the ring system carrying the principal group, if any */
    let chosen=sys;
    if(pcg) for(const a of anchors){ if(ringOf.has(a)) { chosen=ringOf.get(a); break; } }
    parent={ type:"ring", atoms:chosen.ring, info:chosen };
  } else {
    /* longest carbon chain, preferring one that carries the principal group */
    const leaves=carbons.filter(a=>adj.get(a.id).filter(e=>byId.get(e.to).el==="C").length<=1)
                        .map(a=>a.id);
    const pool=leaves.length?leaves:carbons.map(a=>a.id);
    const paths=[];
    const dfs=(v,prev,path,seen)=>{
      let extended=false;
      for(const e of adj.get(v)){
        if(byId.get(e.to).el!=="C"||seen.has(e.to)||ringAtoms.has(e.to)||excluded.has(e.to)) continue;
        extended=true; seen.add(e.to); dfs(e.to,v,[...path,e.to],seen); seen.delete(e.to);
      }
      if(!extended) paths.push(path);
    };
    for(const s of pool){
      if(ringAtoms.has(s)||excluded.has(s)) continue;
      dfs(s,null,[s],new Set([s]));
    }
    if(paths.length===0) paths.push([carbons[0].id]);
    /* How many substituents hang off a candidate chain. IUPAC breaks a tie
       between equally long chains in favour of the one carrying MORE
       substituents cited as prefixes.

       Without this the engine could give one compound two names depending on
       how its graph happened to be presented: the molecule below was named
       either 3-ethyl-2-methylpentane (two substituents, correct) or
       3-propan-2-ylpentane (one substituent), and both round-tripped, so the
       namer stopped being a canonical form. */
    const nSubs=p=>{
      const inChain=new Set(p);
      let n=0;
      for(const id of p)
        for(const e of adj.get(id))
          if(!inChain.has(e.to) && byId.get(e.to).el==="C" && !excluded.has(e.to)) n++;
      return n;
    };
    const score=p=>{
      const hasPCG = !pcg || p.some(id=>anchors.has(id));
      const nMult = p.reduce((s,id,i)=>{
        if(i===0) return s;
        const e=adj.get(p[i-1]).find(x=>x.to===id);
        return s + (e && e.order>1 ? 1 : 0);
      },0);
      return [hasPCG?1:0, nMult, p.length, nSubs(p)];
    };
    paths.sort((a,b)=>{
      const A=score(a), B=score(b);
      for(let i=0;i<A.length;i++) if(A[i]!==B[i]) return B[i]-A[i];
      return 0;
    });
    parent={ type:"chain", atoms:paths[0] };
  }

  /* ================= NUMBERING ================= */
  const N = parent.atoms.length;
  const orientations=[];
  if(parent.type==="chain"){
    orientations.push(parent.atoms, [...parent.atoms].reverse());
  } else {
    const r=parent.atoms;
    for(let s=0;s<N;s++){
      orientations.push(r.slice(s).concat(r.slice(0,s)));
      orientations.push([...r.slice(0,s+1).reverse(), ...r.slice(s+1).reverse()]);
    }
  }

  /* every atom reachable from `start` without going back through `block` */
  const branchAtoms = (start, block) => {
    const seen=new Set([start]), st=[start];
    while(st.length){
      const v=st.pop();
      for(const e of adj.get(v)) if(e.to!==block && !seen.has(e.to)){ seen.add(e.to); st.push(e.to); }
    }
    return [...seen];
  };

  const describe = order => {
    const pos=new Map(order.map((id,i)=>[id,i+1]));
    const suffixLocs=[], prefixes=[], eneL=[], yneL=[];
    let fail=null;
    for(let i=0;i<order.length-1;i++){
      const e=adj.get(order[i]).find(x=>x.to===order[i+1]);
      if(e && e.order===2) eneL.push(i+1);
      if(e && e.order===3) yneL.push(i+1);
    }
    if(parent.type==="ring"){
      const e=adj.get(order[N-1]).find(x=>x.to===order[0]);
      if(e && e.order===2 && !parent.info.aromatic) eneL.push(N);
    }
    for(const gr of groups){
      const p=pos.get(gr.at);
      if(gr.kind==="sulfide"){
        const [s1,s2]=gr.extra.sides;
        const onParent = pos.has(s1)?s1 : pos.has(s2)?s2 : null;
        if(onParent===null){ continue; }
        const other = onParent===s1?s2:s1;
        const sn=nameSubstituent(other, gr.at, ctx);
        if(!sn.name){ fail="complex"; continue; }
        prefixes.push({ loc:pos.get(onParent), name:sn.name.replace(/yl$/,"")+"ylsulfanyl" });
        continue;
      }
      if(exoRing && gr.kind===pcg && gr.at===exoRing.carbon){
        suffixLocs.push(pos.get(exoRing.ring)); continue;
      }
      if(gr.kind===pcg && p!==undefined){ suffixLocs.push(p); continue; }
      if(gr.kind==="ether"){
        const [s1,s2]=gr.extra.sides;
        const onParent = pos.has(s1)?s1:pos.has(s2)?s2:null;
        const other = onParent===s1?s2:s1;
        if(onParent===null){ fail="ether"; continue; }
        const sn=nameSubstituent(other, gr.at, ctx);
        if(!sn.name){ fail="complex"; continue; }
        prefixes.push({ loc:pos.get(onParent), name:sn.name.replace(/yl$/,"")+"oxy",
                        atoms:branchAtoms(other, gr.at) });
        continue;
      }
      if(p===undefined){ continue; }   /* group sits on a substituent: handled below */
      const def=GROUPS[gr.kind];
      const pf = def ? def.prefix : (gr.kind==="halo"?HALO[gr.extra.el]:gr.kind==="nitro"?"nitro":null);
      if(!pf){ fail="prefix"; continue; }
      prefixes.push({ loc:p, name: gr.kind==="halo" ? HALO[gr.extra.el] : pf,
                      atoms:[...(gr.atoms||[])] });
    }
    /* A demoted ester is cited from whichever side touches the parent:
         parent-O-C(=O)R   ->  <acyl>oyloxy   (as in aspirin)
         parent-C(=O)-O-R  ->  <alkyl>oxycarbonyl
       Without this the whole ester silently disappears from the name. */
    if(pcg!=="ester")
      for(const gr of groups){
        if(gr.kind!=="ester") continue;
        const carbonyl = gr.at, oxy = gr.atoms[1], alkyl = gr.extra.alkylSide;
        if(pos.has(alkyl)){
          /* the parent carries the oxygen: name the acyl half */
          const chain = branchAtoms(carbonyl, oxy).filter(x=>byId.get(x).el==="C");
          const len = chain.length;
          if(!ROOT[len]){ fail="prefix"; continue; }
          prefixes.push({ loc:pos.get(alkyl), name:`(${ROOT[len]}anoyloxy)`,
                          atoms:[carbonyl, oxy, ...branchAtoms(carbonyl, oxy)] });
        } else if(pos.has(carbonyl)){
          const sn = nameSubstituent(alkyl, oxy, ctx);
          if(!sn.name){ fail="complex"; continue; }
          prefixes.push({ loc:pos.get(carbonyl), name:sn.name+"oxycarbonyl",
                          atoms:[oxy, ...branchAtoms(alkyl, oxy)] });
        } else {
          const host = adj.get(oxy).map(e=>e.to).find(x=>pos.has(x));
          if(host===undefined){ fail="prefix"; continue; }
          const chain = branchAtoms(carbonyl, oxy).filter(x=>byId.get(x).el==="C");
          if(!ROOT[chain.length]){ fail="prefix"; continue; }
          prefixes.push({ loc:pos.get(host), name:`(${ROOT[chain.length]}anoyloxy)`,
                          atoms:[carbonyl, oxy, ...branchAtoms(carbonyl, oxy)] });
        }
      }

    /* A demoted nitrile is cited as "cyano" on the chain carbon that carries
       it, not as a cyanomethyl branch. */
    if(pcg!=="nitrile")
      for(const gr of groups){
        if(gr.kind!=="nitrile") continue;
        const host = adj.get(gr.at).map(e=>e.to).find(x=>pos.has(x));
        if(host===undefined){ fail="prefix"; continue; }
        prefixes.push({ loc:pos.get(host), name:"cyano", atoms:[gr.at, ...(gr.atoms||[])] });
      }

    /* carbon substituents */
    for(const id of order){
      for(const e of adj.get(id)){
        if(pos.has(e.to)) continue;
        const t=byId.get(e.to);
        if(t.el!=="C") continue;
        /* the nitrile carbon is already covered by the cyano prefix */
        if(pcg!=="nitrile" && groups.some(gr=>gr.kind==="nitrile" && gr.at===e.to)) continue;
        if(exoRing && e.to===exoRing.carbon) continue;      /* part of the suffix */
        if(groups.some(gr=>gr.atoms.includes(e.to))) continue;
        const sn=nameSubstituent(e.to, id, ctx);
        if(!sn.name){ fail="complex"; continue; }
        prefixes.push({ loc:pos.get(id), name: sn.needsParens ? `(${sn.name})` : sn.name,
                        atoms:branchAtoms(e.to, id), subParts:sn.parts,
                        bracketed:sn.needsParens });
      }
    }
    return { pos, suffixLocs:suffixLocs.sort((a,b)=>a-b), prefixes, eneL, yneL, fail };
  };

  const hetIds = parent.type==="ring" && parent.info.hetero ? parent.info.hetero : [];
  let best=null;
  for(const o of orientations){
    if(hetIds.length && byId.get(o[0]).el==="C") continue;   /* heteroatom owns C-1 */
    const d=describe(o);
    if(d.fail) { if(!best) best={ order:o, d }; continue; }
    const hetLocs = hetIds.map(id=>d.pos.get(id)).sort((a,b)=>a-b);
    const aromaticRing = parent.type==="ring" && parent.info.aromatic;
    const unsat = aromaticRing ? [] : [...d.eneL,...d.yneL].sort((a,b)=>a-b);
    const key=[ hetLocs, d.suffixLocs, unsat,
                d.prefixes.map(p=>p.loc).sort((a,b)=>a-b) ];
    if(!best || best.d.fail){ best={ order:o, d, key }; continue; }
    for(let i=0;i<4;i++){
      const c=cmpList(key[i], best.key[i]);
      if(c<0){ best={ order:o, d, key }; break; }
      if(c>0) break;
    }
  }
  const { order, d } = best;
  if(d.fail==="complex")
    return { ok:false, err:"unsupported", message:"One of the substituents is too complex for this engine to name yet." };
  if(d.fail)
    return { ok:false, err:"unsupported", message:"This arrangement of groups isn't supported yet." };

  /* ================= STEREO ================= */
  const ringBondKeys=new Set();
  for(const r of rings) for(let i=0;i<r.length;i++){
    const a=r[i], b=r[(i+1)%r.length];
    ringBondKeys.add(a<b?`${a}|${b}`:`${b}|${a}`);
  }
  const stereo = findStereo(g, adj, byId, ringBondKeys);
  const desc=[];
  for(const c of stereo.centres){
    const p=d.pos.get(c.atom);
    if(c.config) desc.push({ loc:p??null, label:c.config, kind:"rs",
      atoms:[c.atom, ...adj.get(c.atom).map(e=>e.to)] });
  }
  for(const dd of stereo.doubles){
    const p=Math.min(d.pos.get(dd.bond.a)??99, d.pos.get(dd.bond.b)??99);
    if(dd.config) desc.push({ loc:p===99?null:p, label:dd.config, kind:"ez",
      cisTrans: cisTransApplicable(dd.bond, g, adj, byId),
      atoms:[dd.bond.a, dd.bond.b,
             ...adj.get(dd.bond.a).map(e=>e.to), ...adj.get(dd.bond.b).map(e=>e.to)] });
  }
  desc.sort((a,b)=>(a.loc??99)-(b.loc??99));
  /* Two ways of writing the same geometry. E/Z is the general system and
     always applies; cis/trans is the older wording and only means anything
     when each carbon of the double bond carries one hydrogen. */
  const style = (opts && opts.stereoStyle) || "ez";
  const cisTransUsable = desc.length>0 && desc.every(x=>x.kind!=="ez" || x.cisTrans);
  const useCisTrans = style==="cistrans" && cisTransUsable &&
                      desc.some(x=>x.kind==="ez");
  const wordFor = x => {
    if(x.kind!=="ez" || !useCisTrans) return (x.loc!=null?x.loc:"")+x.label;
    return (x.label==="Z" ? "cis" : "trans");
  };
  const stereoPrefix = desc.length
    ? (useCisTrans && desc.length===1 && desc[0].kind==="ez"
        ? wordFor(desc[0]) + "-"
        : "(" + desc.map(wordFor).join(",") + ")-")
    : "";

  /* ================= ASSEMBLY ================= */
  const groupsByName={};
  d.prefixes.forEach(p=>{ (groupsByName[p.name]=groupsByName[p.name]||[]).push(p.loc); });
  const nEne_=d.eneL.length, nYne_=d.yneL.length;
  const soloNoLoc =
    (parent.type==="ring" && !hetIds.length && d.prefixes.length===1 && d.suffixLocs.length===0) ||
    (parent.type==="chain" && N<=2 && d.prefixes.length===1 &&
     d.suffixLocs.length===0 && !nEne_ && !nYne_);
  const alphaKey = n => n.replace(/[()]/g,"").replace(/^(di|tri|tetra)/,"").replace(/[0-9,\-]/g,"");
  const prefixParts = Object.keys(groupsByName)
    .sort((a,b)=>alphaKey(a)<alphaKey(b)?-1:alphaKey(a)>alphaKey(b)?1:0)
    .flatMap(nm=>{
      const l=groupsByName[nm].sort((a,b)=>a-b);
      const text = (N===1 || soloNoLoc)
        ? `${MULT[l.length]||""}${nm}`
        : `${l.join(",")}-${MULT[l.length]||""}${nm}`;
      const insts = d.prefixes.filter(p=>p.name===nm);
      const atoms = insts.flatMap(p=>p.atoms||[]);
      /* One occurrence of a substituent that has internal structure gets taken
         apart, so a long branch can be examined piece by piece rather than
         highlighting all at once. */
      if(insts.length===1 && insts[0].subParts && insts[0].subParts.length>1){
        const open = (N===1 || soloNoLoc) ? "" : `${l[0]}-`;
        const br = insts[0].bracketed;
        const out = [];
        const head = open + (br ? "(" : "");
        out.push({ text:head, kind:"punctuation", atoms:[], __group:true });
        insts[0].subParts.forEach(sp=>out.push({ ...sp }));
        if(br) out.push({ text:")", kind:"punctuation", atoms:[] });
        return out;
      }

      const WORD=["","one","two","three","four","five","six"];
      const same = l.length>1 && l.every(x=>x===l[0]);
      const where = same ? `carbon ${l[0]}`
        : l.length>1 ? `carbons ${l.slice(0,-1).join(", ")} and ${l[l.length-1]}`
        : `carbon ${l[0]}`;
      return [{ text, kind:"substituent", atoms, locs:l, __group:true,
        label: l.length>1
          ? `${WORD[l.length]||l.length} ${nm} groups on ${where}${same?", both on the same one":""}`
          : `a ${nm} group on ${where} of the parent` }];
    });
  /* separators are explicit segments now, so the pieces join with nothing
     between them and the text still reassembles exactly */
  const prefixSeq = [];
  prefixParts.forEach((p,i)=>{
    if(p.__group && i>0) prefixSeq.push({ text:"-", kind:"punctuation", atoms:[] });
    prefixSeq.push(p);
  });
  const prefixStr = prefixSeq.map(p=>p.text).join("");

  const nEne=d.eneL.length, nYne=d.yneL.length;
  const ringPre = parent.type==="ring" ? "cyclo" : "";
  const aromatic = parent.type==="ring" && parent.info.aromatic;
  let stem = (ROOT[N]||"") + ((nEne>=2||nYne>=2)?"a":"");
  let unsat="";
  if(nEne) unsat += `-${d.eneL.join(",")}-${MULT[nEne]||""}en`;
  if(nYne) unsat += `-${d.yneL.join(",")}-${MULT[nYne]||""}yn`;

  const def = pcg ? GROUPS[pcg] : null;
  const sl = d.suffixLocs;
  const multS = MULT[sl.length]||"";
  let core;

  let heteroName=null;
  if(parent.type==="ring" && hetIds.length){
    const posOf = id => d.pos.get(id);
    const sig = hetIds.map(id=>({ el:byId.get(id).el, loc:posOf(id) }))
      .sort((a,b)=>a.loc-b.loc)
      .map(h=>`${h.el}${h.loc}`).join(",");
    const key = `${N}|${aromatic?"a":"s"}|${sig}`;
    heteroName = HETERO_RINGS[key];
    if(!heteroName)
      return { ok:false, err:"unsupported",
        message:`That ring contains ${hetIds.map(i=>byId.get(i).el).join(" and ")} in an arrangement this engine doesn't name yet.` };
    if(pcg)
      return { ok:false, err:"unsupported",
        message:`Functional groups on ${heteroName} aren't supported yet — substituents like methyl and halogens are.` };
  }

  if(heteroName){
    core = heteroName;
  } else if(aromatic){
    const retained = { alcohol:"phenol", amine:"aniline" };
    if(exoRing) core = exoRing.kind==="carbox" ? "benzoic acid"
      : exoRing.kind==="carbald" ? "benzaldehyde" : "benzonitrile";
    else if(pcg && retained[pcg]) core = retained[pcg];
    else if(!pcg) core = "benzene";
    else return { ok:false, err:"unsupported", message:"That group on a benzene ring isn't supported yet." };
  } else if(exoRing){
    core = ringPre + ROOT[N] + (exoRing.kind==="carbox" ? "anecarboxylic acid"
      : exoRing.kind==="carbald" ? "anecarbaldehyde" : "anecarbonitrile");
  } else if(!pcg){
    core = ringPre + stem + (nEne||nYne ? (unsat+"e") : "ane");
  } else {
    const needsLoc = !def.terminal;
    const locPart = needsLoc ? `-${sl.join(",")}-` : "";
    const base = ringPre + stem + (nEne||nYne ? unsat : "an");
    if(pcg==="acid")       core = base + (nEne||nYne?"":"") + (sl.length>1?"edioic acid":"oic acid");
    else if(pcg==="aldehyde") core = base + (sl.length>1?"edial":"al");
    else if(pcg==="amide") core = base + (sl.length>1?"ediamide":"amide");
    else if(pcg==="nitrile") core = base + (sl.length>1?"edinitrile":"enitrile");
    else if(pcg==="thiol"){
      core = base + (sl.length>1?"e":"") + `-${sl.join(",")}-` + multS + "thiol";
      if(sl.length===1 && N<=2) core = stem+"anethiol";
    }
    else if(pcg==="ketone"||pcg==="alcohol"||pcg==="amine"){
      const suf=def.suffix;
      const glue = (sl.length>1 || /^[aeiou]/.test(multS+suf)===false) ? "" : "";
      core = base + (sl.length>1 ? "e" : "") + locPart + multS + suf;
      if(sl.length===1 && N<=2 && pcg==="alcohol" && !nEne && !nYne) core = stem+"anol";
      if(sl.length===1 && N===1 && pcg==="amine") core = stem+"anamine";
    }
    else if(pcg==="ester")   core = base + "oate";
    else if(pcg==="acylhal") core = base + "oyl";
    else if(pcg==="anhyd")   core = base + "oic anhydride";
    else return { ok:false, err:"unsupported", message:`The ${pcg} group isn't fully supported yet.` };
  }

  /* split the core into the parent stem and whatever suffix follows it, so each
     can be highlighted on its own */
  const parentAtoms = [...order];
  const suffixAtoms = pcg
    ? groups.filter(g2=>g2.kind===pcg).flatMap(g2=>[g2.at, ...(g2.atoms||[])])
    : [];
  const unsatAtoms = [...d.eneL, ...d.yneL]
    .flatMap(l=>[order[l-1], order[l]].filter(x=>x!==undefined));

  const coreParts = (() => {
    const stemGuess = (parent.type==="ring" ? (aromatic ? "" : "cyclo") : "") + (ROOT[N]||"");
    const cut = stemGuess && core.startsWith(stemGuess) ? stemGuess.length
              : (aromatic ? core.length : 0);
    const head = core.slice(0, cut) || core;
    const tail = core.slice(cut);
    const out = [{ text:head, kind:"parent", atoms:parentAtoms, numbered:true,
      label: parent.type==="ring"
        ? `the ${aromatic?"aromatic ":""}ring of ${N} carbons that forms the parent, numbered 1 to ${N}`
        : `the parent chain of ${N} carbons, numbered 1 to ${N} in the direction that gives the lowest locants` }];
    if(tail){
      const isPlain = !pcg && !unsatAtoms.length;
      out.push({ text:tail,
        kind: isPlain ? "parent" : (pcg ? "suffix" : "unsaturation"),
        atoms: isPlain ? parentAtoms : (pcg ? [...suffixAtoms, ...unsatAtoms] : unsatAtoms),
        label: isPlain ? "the -ane ending, which marks a parent with no multiple bonds"
             : pcg ? `the ${pcg} group at carbon ${sl.join(" and ")} \u2014 the most senior group present, so it takes the suffix and the lowest locant`
                   : `the ${d.eneL.length?"double":"triple"} bond${(d.eneL.length+d.yneL.length)>1?"s":""} starting at carbon ${[...d.eneL,...d.yneL].sort((a,b)=>a-b).join(" and ")}`,
        locs: pcg ? sl : [...d.eneL,...d.yneL] });
    }
    return out;
  })();

  const HALIDE={F:"fluoride",Cl:"chloride",Br:"bromide",I:"iodide"};

  /* N-substituents on the principal amine or amide are cited with N- locants */
  let nPrefix="";
  if(pcg==="amine" || pcg==="amide"){
    const gr = groups.find(x=>x.kind===pcg && x.extra && x.extra.nSubs && x.extra.nSubs.length);
    if(gr){
      const names=[];
      for(const sid of gr.extra.nSubs){
        const sn=nameSubstituent(sid, gr.extra.n, ctx);
        if(!sn.name) return { ok:false, err:"unsupported",
          message:"An N-substituent on that group is too complex to name yet." };
        names.push(sn.name);
      }
      const tally={};
      names.forEach(x=>{ tally[x]=(tally[x]||0)+1; });
      nPrefix = Object.keys(tally).sort().map(x=>
        Array(tally[x]).fill("N").join(",")+"-"+(MULT[tally[x]]||"")+x).join("-");
    }
  }

  /* the locant every parent atom carries, so the UI can number the skeleton */
  const locants = {};
  order.forEach((id,i)=>{ locants[id]=i+1; });

  const parts = [];
  const explainOne = x => {
      if(x.kind==="ez"){
        const where = x.loc!=null ? `the double bond starting at carbon ${x.loc}` : "the double bond";
        if(useCisTrans)
          return x.label==="Z"
            ? `${where} is cis: the two carbon chains continue on the same side of it, and each of its carbons carries one hydrogen, which is what lets cis and trans be used at all. In the E/Z system this is (${x.loc!=null?x.loc:""}Z)`
            : `${where} is trans: the two carbon chains continue on opposite sides of it. In the E/Z system this is (${x.loc!=null?x.loc:""}E)`;
        return x.label==="Z"
          ? `${where} is Z, from zusammen, together: rank the two groups on each carbon by CIP priority, and the two winners lie on the same side${x.cisTrans?". Because each carbon here carries one hydrogen, this may also be written cis":""}`
          : `${where} is E, from entgegen, opposite: the higher-priority group on each carbon lies on the other side${x.cisTrans?". Because each carbon here carries one hydrogen, this may also be written trans":""}`;
      }
      return x.label==="R"
        ? `carbon ${x.loc} is R, from rectus, right: rank its four groups by CIP priority, point the lowest away from you, and 1\u21922\u21923 runs clockwise`
        : `carbon ${x.loc} is S, from sinister, left: with the lowest priority pointing away, 1\u21922\u21923 runs anticlockwise`;
  };

  if(stereoPrefix){
    /* Split the descriptor into one piece per centre, so (1R,2S) can be taken
       apart and each centre highlighted and explained on its own. */
    const single = useCisTrans && desc.length===1 && desc[0].kind==="ez";
    if(single){
      parts.push({ text:stereoPrefix, kind:"stereo", atoms:desc[0].atoms||[],
        label:explainOne(desc[0]) });
    } else {
      parts.push({ text:"(", kind:"punctuation", atoms:[] });
      desc.forEach((x,i)=>{
        parts.push({ text:wordFor(x), kind:"stereo", atoms:x.atoms||[],
          locs:x.loc!=null?[x.loc]:undefined, label:explainOne(x) });
        if(i<desc.length-1) parts.push({ text:",", kind:"punctuation", atoms:[] });
      });
      parts.push({ text:")-", kind:"punctuation", atoms:[] });
    }
  }
  if(nPrefix) parts.push({ text:nPrefix, kind:"substituent",
    atoms:groups.filter(g2=>g2.extra&&g2.extra.nSubs).flatMap(g2=>g2.extra.nSubs),
    label:"the groups carried on the nitrogen" });
  if(prefixStr) prefixSeq.forEach(p=>parts.push(p));
  parts.push(...coreParts);

  let name = stereoPrefix + nPrefix + (prefixStr ? prefixStr + core : core);
  if(pcg==="ester" && esterAlkyl){
    const alk = esterAlkyl.replace(/an-1-yl$/,"yl");
    name = alk + " " + name;
    parts.unshift({ text:alk+" ", kind:"substituent", atoms:[...excluded],
      label:"the alkyl group contributed by the alcohol half of the ester" });
  }
  if(pcg==="acylhal" && acylHalide){
    name = name + " " + HALIDE[acylHalide];
    parts.push({ text:" "+HALIDE[acylHalide], kind:"suffix",
      atoms:groups.filter(g2=>g2.kind==="acylhal").flatMap(g2=>g2.atoms||[]),
      label:"the halogen of the acyl halide" });
  }
  const { formula, mass } = formulaOf(g, adj);

  /* ---- derivation steps for the UI ---- */
  const steps=[];
  if(pcg) steps.push(["Principal group",
    `The ${pcg} group is the most senior present, so it takes the suffix and the lowest locant.`]);
  steps.push([parent.type==="ring"?"Ring parent":"Parent chain",
    parent.type==="ring"
      ? `${aromatic?"An aromatic six-membered ring":`A ${N}-carbon ring`} forms the parent.`
      : `The longest chain${pcg?" containing the principal group":""} has ${N} carbons \u2192 ${ROOT[N]}-.`]);
  if(sl.length||d.eneL.length||d.yneL.length||d.prefixes.length)
    steps.push(["Numbering",
      `Chosen for the lowest locants: ${[
        ...sl.map(l=>`${l} (${pcg})`),
        ...d.eneL.map(l=>`${l} (double bond)`),
        ...d.yneL.map(l=>`${l} (triple bond)`),
        ...d.prefixes.map(p=>`${p.loc} (${p.name})`)].join(", ")}.`]);
  if(desc.length) steps.push(["Stereochemistry",
    `${desc.map(x=>`${x.loc!=null?"C-"+x.loc+": ":""}${x.label}`).join("; ")}.`]);
  steps.push(["Assembly", `Result: ${name}`]);

  /* the segments must reassemble into exactly the name we returned */
  const joined = parts.map(p=>p.text).join("");
  const nameParts = joined===name ? parts
    : [{ text:name, kind:"whole", atoms:graph.atoms.map(a=>a.id), label:"the whole molecule" }];

  return { ok:true, name, formula, mass, parts:nameParts, locants,
    mol:{ atoms:graph.atoms.map(a=>({...a})), bonds:graph.bonds.map(b=>Array.isArray(b)?[...b]:{...b}) },
    stereo:{ centres:stereo.centres.map(c=>({ loc:d.pos.get(c.atom)??null, ...c })),
             doubles:stereo.doubles.map(x=>({ a:x.bond.a, b:x.bond.b, config:x.config })) },
    steps };
}
