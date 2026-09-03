// ─────────────────────────────────────────────────────────────
// Worked solutions and diagnosis — the engine explaining itself.
//
// Two jobs, both pure, both built ONLY from what the engine computes:
//
//   workedSolution(mol)  the derivation the namer already produces, plus
//                        the rejected numbering direction, so "lowest
//                        locants" stops being an assertion and becomes a
//                        comparison the student can check.
//
//   diagnose(expected, given)  what is different about the student's answer,
//                        named specifically. Both names are PARSED and
//                        compared as structures, never as strings — so the
//                        diagnosis is chemistry ("you named a 5-carbon
//                        chain; the longest is 6"), not spelling.
//
// Everything here refuses rather than guesses: if the student's answer does
// not parse, or the difference is not one we can name confidently, the
// result is null and the app says nothing rather than something wrong.
// ─────────────────────────────────────────────────────────────

import { parseName, nameGraph } from '../engine/index.js';

// ── Worked solution ──────────────────────────────────────────

// Reversing a chain of length L sends locant n to L+1-n. That is the only
// other way to number a simple chain, so it is exactly the comparison the
// "lowest locants" rule is making.
export function alternativeLocants(locs, chainLength) {
  if (!Array.isArray(locs) || !locs.length || !chainLength) return null;
  return locs.map((n) => chainLength + 1 - n).sort((a, b) => a - b);
}

const lower = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] === undefined ? Infinity : a[i];
    const y = b[i] === undefined ? Infinity : b[i];
    if (x !== y) return x < y;
  }
  return false;
};

export function workedSolution(mol, opts = {}) {
  const r = nameGraph(mol, opts);
  if (!r || !r.ok) return null;
  const steps = (r.steps || []).map(([heading, body]) => ({ heading, body }));

  // Enrich the numbering step with the direction that lost, when there is
  // a genuine contest to describe.
  const parent = (r.parts || []).find((p) => p.kind === 'parent');
  const chainLength = parent && parent.atoms ? parent.atoms.length : 0;
  const chosen = [];
  for (const p of r.parts || []) {
    if (Array.isArray(p.locs)) chosen.push(...p.locs);
  }
  const suffixLoc = (r.name.match(/-(\d+)-[a-z]+$/) || [])[1];
  if (suffixLoc) chosen.push(Number(suffixLoc));
  const sortedChosen = [...new Set(chosen)].sort((a, b) => a - b);
  const alt = alternativeLocants(sortedChosen, chainLength);

  const numberingIdx = steps.findIndex((s) => s.heading === 'Numbering');
  if (numberingIdx >= 0 && alt && sortedChosen.length && lower(sortedChosen, alt)) {
    steps[numberingIdx] = {
      ...steps[numberingIdx],
      alternative: `Numbering from the other end would give ${alt.join(', ')} — higher at the first point of difference, so this direction wins.`,
    };
  }

  return { name: r.name, steps, parts: r.parts || [] };
}

// ── Diagnosis ────────────────────────────────────────────────

const familyOfName = (n) => {
  if (/oic acid$/.test(n)) return 'carboxylic acid';
  if (/oate$/.test(n)) return 'ester';
  if (/amide$/.test(n)) return 'amide';
  if (/amine$/.test(n)) return 'amine';
  if (/nitrile$/.test(n)) return 'nitrile';
  if (/al$/.test(n)) return 'aldehyde';
  if (/one$/.test(n)) return 'ketone';
  if (/ol$/.test(n)) return 'alcohol';
  if (/yne$/.test(n)) return 'alkyne';
  if (/ene$/.test(n)) return 'alkene';
  if (/ane$/.test(n)) return 'alkane';
  return null;
};

const ROOT_N = { meth: 1, eth: 2, prop: 3, but: 4, pent: 5, hex: 6, hept: 7, oct: 8, non: 9, dec: 10 };
// The parent root is the LAST root in the name — substituent names carry
// roots too ("methyl" in 2-methylhexane), and the parent is what follows.
export function parentCarbons(name) {
  const hits = [...String(name).matchAll(/(meth|hept|pent|prop|eth|but|hex|oct|non|dec)/g)];
  return hits.length ? ROOT_N[hits[hits.length - 1][1]] : null;
}

const locantsOf = (name) => (String(name).match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
const substituentsOf = (name) =>
  (String(name).match(/(methyl|ethyl|propyl|butyl|chloro|bromo|fluoro|iodo|hydroxy|amino|nitro)/g) || []).sort();

// What is different about the student's answer? Returns null when we cannot
// say something specific and true.
export function diagnose(expected, given) {
  const e = String(expected || '').toLowerCase().trim();
  const g = String(given || '').toLowerCase().trim();
  if (!e || !g || e === g) return null;

  const gp = parseName(g);
  const isRealName = !!(gp && gp.ok);

  // Chain length: the most consequential difference, and the easiest to
  // state plainly.
  const ec = parentCarbons(e);
  const gc = parentCarbons(g);
  if (ec && gc && ec !== gc) {
    return {
      kind: 'parent-chain',
      message: `You named a ${gc}-carbon parent chain. The longest chain here has ${ec} carbons, so the root is ${e.match(/(meth|eth|prop|but|pent|hex|hept|oct|non|dec)/g).slice(-1)[0]}-.`,
    };
  }

  // Family: the suffix is the principal group, and a different suffix is a
  // different compound entirely.
  const ef = familyOfName(e);
  const gf = familyOfName(g);
  if (ef && gf && ef !== gf) {
    return {
      kind: 'family',
      message: `You named ${gf === 'alkane' ? 'an alkane' : `a${/^[aeiou]/.test(gf) ? 'n' : ''} ${gf}`}. This structure is ${/^[aeiou]/.test(ef) ? 'an' : 'a'} ${ef}, which changes the ending of the name.`,
    };
  }

  // Substituents: same skeleton, wrong branches.
  const es = substituentsOf(e);
  const gs = substituentsOf(g);
  if (es.join(',') !== gs.join(',')) {
    return {
      kind: 'substituent',
      message: gs.length
        ? `The branches do not match: you named ${gs.join(' and ')}, but this structure has ${es.join(' and ') || 'none'}.`
        : `You named no branches, but this structure has ${es.join(' and ')}.`,
    };
  }

  // Locants: same pieces, wrong positions — the classic numbering slip.
  const el = locantsOf(e);
  const gl = locantsOf(g);
  if (el.join(',') !== gl.join(',')) {
    // The rule to quote depends on what is being numbered: a principal
    // group outranks the lowest-locant rule, so the advice must match.
    const hasGroup = ef && ef !== 'alkane' && ef !== 'alkene' && ef !== 'alkyne';
    const rule = hasGroup
      ? `The ${ef} takes the lowest locant it can, and numbering follows from there.`
      : 'Number from the end that reaches the first point of difference soonest.';
    return {
      kind: 'locant',
      message: `The pieces are right, the positions are not: you numbered to ${gl.join(', ') || 'no locants'}, the lowest set is ${el.join(', ')}. ${rule}`,
    };
  }

  // Something differs that we cannot name confidently. Say nothing rather
  // than inventing a reason.
  return isRealName ? { kind: 'other-name', message: null } : null;
}
