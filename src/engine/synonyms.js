/* ================================================================
   STRUCTURA ENGINE v4 — SYNONYMS
   ----------------------------------------------------------------
   The other names a molecule answers to: trivial names, older styles,
   retained spellings, and the cis/trans wording where it applies.

   Every candidate is checked by parsing it and comparing the result with
   the molecule asked about. A name is only offered if it really does
   describe the same structure, so the list can never mislead.
   ================================================================ */
import { parseName, ALIAS_TABLE, HET_SPEC } from "./parse.js";
import { nameGraph } from "./name.js";

/* Two names describe the same molecule when the engine gives them the same
   canonical name. */
const canonOf = name => {
  const r = parseName(name);
  return r.ok ? r.canonical : null;
};

/* Tidy an alias back into the spacing a person would write. */
const pretty = key => key
  .replace(/acid$/, " acid")
  .replace(/anhydride$/, " anhydride")
  .replace(/chloride$/, " chloride")
  .replace(/bromide$/, " bromide")
  .replace(/oxide$/, " oxide")
  .replace(/^(\d[a-z]?(?:,\d[a-z]?)*)-/, "$1-");

/* Rule-generated alternatives that are not in any table. */
function generated(canonical){
  const out = [];

  /* the older style that puts the suffix locant in front: butan-2-ol -> 2-butanol */
  const m = canonical.match(/^(.*?)([a-z]+)an-(\d+)-(ol|one|amine|thiol)$/);
  if(m) out.push(`${m[1]}${m[3]}-${m[2]}an${m[4]}`);

  /* a group at position 1 is often written without the locant */
  const one = canonical.match(/^(.*?)([a-z]+)an-1-(ol|amine|thiol)$/);
  if(one) out.push(`${one[1]}${one[2]}an${one[3]}`);

  /* cis and trans, where each alkene carbon carries one hydrogen */
  const ez = canonical.match(/^\((\d+)([EZ])\)-(.*)$/);
  if(ez) out.push(`${ez[2]==="Z"?"cis":"trans"}-${ez[3]}`);

  /* the bare (E)/(Z) form without a locant */
  if(ez) out.push(`(${ez[2]})-${ez[3]}`);

  return out;
}

/**
 * synonymsFor(name)
 *   Returns the other accepted names for the molecule that `name` describes,
 *   each verified to parse back to the same structure.
 *
 *   → { canonical, synonyms:[{ name, kind }] }
 *     kind: "trivial" (a common or retained name) | "alternative" (another
 *     accepted way of writing the systematic name)
 */
export function synonymsFor(name){
  const canonical = canonOf(name);
  if(!canonical) return { canonical:null, synonyms:[] };

  const seen = new Set([
    canonical.toLowerCase().replace(/\s+/g,""),
    String(name).toLowerCase().replace(/\s+/g,""),
  ]);
  const out = [];
  const consider = (candidate, kind) => {
    const key = candidate.toLowerCase().replace(/\s+/g,"");
    if(seen.has(key)) return;
    seen.add(key);
    if(canonOf(candidate) === canonical) out.push({ name:candidate, kind });
  };

  /* every table entry that resolves to this molecule */
  for(const key of Object.keys(ALIAS_TABLE)) consider(pretty(key), "trivial");
  for(const key of Object.keys(HET_SPEC))    consider(pretty(key), "trivial");

  /* and the rule-generated ways of writing it */
  for(const g of generated(canonical)) consider(g, "alternative");

  out.sort((a,b) =>
    a.kind===b.kind ? a.name.length - b.name.length : (a.kind==="trivial" ? -1 : 1));
  return { canonical, synonyms:out };
}
