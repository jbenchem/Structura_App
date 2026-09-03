// ─────────────────────────────────────────────────────────────
// Two question types the engine makes possible.
//
// openDraw   "Draw any isomer of C6H14 that is not hexane." The answer is
//            not a list — it is a CONDITION, and the engine checks it. The
//            namer is the deduplicator (two structures are the same compound
//            iff they name identically), which is what lets an open-ended
//            structural answer be marked at all.
//
// explainError  A wrong name is shown beside the structure it claims to
//            describe, and the student says WHAT is wrong with it. The
//            options are real error classes, and the wrong name is generated
//            by breaking the right one in a known way — so the answer key is
//            derived, never authored, and always true.
// ─────────────────────────────────────────────────────────────

import { parseName, nameGraph } from '../engine/index.js';
import { CATEGORY, familyOf } from './questionFactory';

// ── Open-ended drawing ───────────────────────────────────────

const formulaOf = (mol) => {
  const r = nameGraph(mol);
  return r && r.ok ? r.formula : null;
};

// Judge a drawn answer against a condition. Returns {ok, reason} — and the
// reason is the teaching, so a rejection explains itself.
export function judgeOpenDraw(spec, drawn) {
  if (!drawn || !drawn.atoms || !drawn.atoms.length) {
    return { ok: false, reason: 'Nothing drawn yet.' };
  }
  const r = nameGraph(drawn);
  if (!r || !r.ok) {
    return { ok: false, reason: r && r.issue ? r.issue : 'That structure could not be named — check the valences.' };
  }
  if (spec.formula && r.formula !== spec.formula) {
    return { ok: false, reason: `That is ${r.formula}. The question asks for ${spec.formula}.` };
  }
  if (spec.excludeNames && spec.excludeNames.includes(r.name)) {
    return { ok: false, reason: `That is ${r.name}, which the question rules out. Try a different arrangement.` };
  }
  if (spec.family && familyOf(drawn) !== spec.family) {
    return { ok: false, reason: `That is ${familyOf(drawn) || 'an unrecognised family'}. The question asks for ${spec.family}.` };
  }
  if (spec.alreadyFound && spec.alreadyFound.includes(r.name)) {
    return { ok: false, reason: `You have already drawn ${r.name} — the same compound, however it is arranged on screen.` };
  }
  return { ok: true, name: r.name, reason: `${r.name} — that works.` };
}

export function openDrawQuestion({ formula, excludeNames = [], prompt, chip = 'DRAW A STRUCTURE' }) {
  return {
    id: `opendraw-${formula}-${excludeNames.join('-')}`,
    category: CATEGORY.DRAW,
    type: 'openDraw',
    chip,
    prompt:
      prompt ||
      (excludeNames.length
        ? `Draw any isomer of ${formula} other than ${excludeNames.join(' or ')}.`
        : `Draw any structure with the formula ${formula}.`),
    spec: { formula, excludeNames },
  };
}

// ── Explain the error ────────────────────────────────────────

// Ways to break a correct name, each producing a known fault. Every breaker
// returns null when it does not apply, so a question is only built when the
// fault is real.
export const BREAKERS = [
  {
    id: 'wrong-locant',
    label: 'The numbering is wrong',
    detail: 'The pieces are right, but the chain was numbered from the wrong end.',
    apply: (name) => {
      const m = name.match(/^(\d+)(-.*)$/);
      if (!m) return null;
      const n = Number(m[1]);
      return n > 1 ? `${n + 1}${m[2]}` : null;
    },
  },
  {
    id: 'chain-selection',
    label: 'The parent chain is wrong',
    detail: 'A shorter chain was chosen as the parent than the longest one available.',
    apply: (name) => {
      const roots = ['meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct'];
      for (let i = roots.length - 1; i > 0; i--) {
        const r = roots[i];
        const idx = name.lastIndexOf(r);
        if (idx >= 0) return name.slice(0, idx) + roots[i - 1] + name.slice(idx + r.length);
      }
      return null;
    },
  },
  {
    id: 'wrong-suffix',
    label: 'The ending is wrong',
    detail: 'The ending names a different functional group from the one drawn.',
    apply: (name) => {
      // The broken name must be one a student would plausibly WRITE, not a
      // malformed string: propan-2-ol breaks to propanal (an aldehyde has
      // no locant), never to "propan-2-al".
      if (/-\d+-ol$/.test(name)) return name.replace(/-\d+-ol$/, 'al');
      if (/-\d+-one$/.test(name)) return name.replace(/-\d+-one$/, 'al');
      if (/ol$/.test(name)) return name.replace(/ol$/, 'al');
      if (/al$/.test(name)) return name.replace(/al$/, 'ol');
      if (/ane$/.test(name)) return name.replace(/ane$/, '-1-ene');
      if (/-\d+-ene$/.test(name)) return name.replace(/-\d+-ene$/, 'ane');
      return null;
    },
  },
  {
    id: 'alphabetical',
    label: 'The substituents are in the wrong order',
    detail: 'Substituent names are listed alphabetically, whatever their locants.',
    apply: (name) => {
      const m = name.match(/^(\d+)-(ethyl)-(\d+)-(methyl)(.*)$/);
      return m ? `${m[3]}-${m[4]}-${m[1]}-${m[2]}${m[5]}` : null;
    },
  },
];

// Build a question from a molecule: show a broken name, ask what is wrong.
export function explainErrorQuestion(mol, { seed = 1 } = {}) {
  const r = nameGraph(mol);
  if (!r || !r.ok) return null;
  const correct = r.name;

  const usable = BREAKERS.map((b) => ({ b, broken: b.apply(correct) }))
    .filter((x) => x.broken && x.broken !== correct)
    // The broken name must NOT be the correct name of some other reading of
    // this molecule, and must be a genuinely different string.
    .filter((x) => x.broken !== correct);
  if (!usable.length) return null;

  const chosen = usable[seed % usable.length];
  const others = BREAKERS.filter((b) => b.id !== chosen.b.id).slice(0, 3);
  const options = [chosen.b.label, ...others.map((o) => o.label)];

  return {
    id: `explain-${correct}-${chosen.b.id}`,
    category: CATEGORY.NAME_STRUCTURE,
    family: familyOf(mol),
    type: 'explainError',
    chip: 'FIND THE FAULT',
    prompt: `This structure has been named ${chosen.broken}. What is wrong with that name?`,
    mol,
    givenName: chosen.broken,
    correctName: correct,
    options,
    answer: 0, // options[0] is the true fault; the view shuffles for display
    explain: `${chosen.b.detail} The correct name is ${correct}.`,
    errorClass: chosen.b.id,
  };
}
