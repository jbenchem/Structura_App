// ─────────────────────────────────────────────────────────────
// Engine bridge.
//
// The v4 engine (src/engine/) is treated as a library and left
// unmodified. This module is the ONLY place that translates
// between it and the app:
//
//   • graph conversion both ways (the stereo vocabularies differ)
//   • stereo-blind checking for pre-Stage-9 content
//   • engine verdict classes → our attempt-log ERROR_CLASSES
//
// Why stereo-blind matters: the engine reads E/Z from drawn
// coordinates, so a student drawing but-2-ene as an ordinary
// zigzag produces (2E)-but-2-ene and would be marked wrong for
// stereochemistry not taught until unit 31. Questions opt in to
// stereo with { stereo: true }.
// ─────────────────────────────────────────────────────────────

import { nameGraph, parseName, matchStructure, hintsFor, synonymsFor } from '../engine/index.js';
import { newId } from './model';

// Our editor: stereo is 'wedge' | 'hash' | 'wavy'
// The engine:  stereo is 'wedge' | 'dash' | 'either'
const TO_ENGINE_STEREO = { wedge: 'wedge', hash: 'dash', wavy: 'either' };
const FROM_ENGINE_STEREO = { wedge: 'wedge', dash: 'hash', either: 'wavy' };

// Accepts either shape: the editor's model (stereo 'hash'/'wavy') or a
// graph already in engine form (stereo 'dash'/'either'). Unknown stereo
// values are passed through rather than dropped — silently losing a
// wedge would turn a right answer into a wrong one.
export function toEngineGraph(mol) {
  return {
    atoms: mol.atoms.map((a) => ({ id: a.id, x: a.x, y: a.y, el: a.el })),
    bonds: mol.bonds.map((b) => ({
      a: b.a,
      b: b.b,
      order: b.order,
      stereo: b.stereo ? TO_ENGINE_STEREO[b.stereo] || b.stereo : null,
    })),
  };
}

// Engine graph → our editor model (ids become strings; the
// editor needs charge/showH fields and ids on bonds).
export function fromEngineGraph(g) {
  if (!g) return { atoms: [], bonds: [] };
  const idMap = new Map();
  const atoms = g.atoms.map((a) => {
    const id = newId();
    idMap.set(a.id, id);
    return { id, el: a.el || 'C', x: a.x, y: a.y, charge: 0, showH: false };
  });
  const bonds = g.bonds.map((b) => ({
    id: newId(),
    a: idMap.get(b.a),
    b: idMap.get(b.b),
    order: b.order || 1,
    stereo: b.stereo ? FROM_ENGINE_STEREO[b.stereo] || null : null,
  }));
  return { atoms, bonds, idMap };
}

// Map engine atom ids → our ids for a named result, so tapping a
// name part can highlight the right atoms on our canvas.
export function mapAtomIds(engineIds, idMap) {
  if (!idMap || !engineIds) return [];
  return engineIds.map((i) => idMap.get(i)).filter(Boolean);
}

// ── Naming ───────────────────────────────────────────────────
export function nameOf(mol, opts) {
  return nameGraph(toEngineGraph(mol), opts);
}

export { parseName, hintsFor, synonymsFor };

// ── Stereo-blind comparison ──────────────────────────────────
// Strips (2E)-, (R)-, cis-, trans- style descriptors so two
// names compare on constitution alone.
export function stripStereo(name) {
  if (!name) return '';
  return String(name)
    .replace(/\((?:\d+[EZRSaz]|[EZRS](?:[,\s]|$)|[0-9EZRS,\s]+)\)-?/g, '')
    .replace(/\b(?:cis|trans|rac)-/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Engine verdict class → our attempt-log error class.
const KLASS_TO_ERROR = {
  'wrong-position': 'locant',
  'wrong-group': 'suffix-seniority',
  'wrong-skeleton': 'chain-selection',
  'wrong-formula': 'formula',
  'wrong-stereo': 'stereo-descriptor',
  invalid: 'valence',
  empty: 'other',
};

// Engine failure code → our error class (for un-nameable drawings).
const ERR_TO_ERROR = {
  valence: 'valence',
  disconnected: 'other',
  nocarbon: 'other',
  empty: 'other',
  element: 'other',
  malformed: 'other',
  impossible: 'other',
  ambiguous: 'other',
  unsupported: 'other',
};

const TITLES = {
  'wrong-position': 'Check the position',
  'wrong-group': 'Check the functional group',
  'wrong-skeleton': 'Check the connectivity',
  'wrong-formula': 'Check your atom count',
  'wrong-stereo': 'Check the 3D arrangement',
  invalid: 'That structure is not valid',
  empty: 'Nothing to check yet',
};

// ── The app's single checking entry point ────────────────────
// checkDrawing(mol, targetName, { stereo }) →
//   { correct, issue: { errorClass, title, message, explanation,
//                       atomIds, bondIds, fix } | null }
// The issue shape matches what DrawQuestion/LessonPlayer already
// render, so the UI did not need to change.
export function checkDrawing(mol, targetName, { stereo = false } = {}) {
  if (!mol.atoms.length || (mol.atoms.length <= 1 && !mol.bonds.length)) {
    return issue('other', TITLES.empty, 'Draw your structure first, then check it.');
  }

  const named = nameOf(mol);

  // Un-nameable: the engine's message is student-facing copy.
  if (!named.ok) {
    return issue(
      ERR_TO_ERROR[named.err] || 'other',
      named.err === 'valence' ? 'Too many bonds' : 'That structure cannot be named',
      named.message,
      'Every atom must satisfy its valence and the whole structure must be connected before it can be named.'
    );
  }

  // Stereo-blind equality: the namer is the canonical form, so
  // identical names (descriptors stripped) means identical molecule.
  const drawnName = stereo ? named.name : stripStereo(named.name);
  const targetCanon = canonicalName(targetName);
  const wanted = stereo ? targetCanon : stripStereo(targetCanon);
  if (drawnName && wanted && drawnName === wanted) {
    return { correct: true, issue: null, name: named.name };
  }

  // Differ → let the engine classify it.
  const verdict = matchStructure(toEngineGraph(mol), targetName);
  let klass = verdict.klass;
  // Guard: never report a stereo fault when stereo is not assessed.
  if (!stereo && klass === 'wrong-stereo') {
    klass = 'wrong-skeleton';
  }

  return issue(
    KLASS_TO_ERROR[klass] || 'other',
    TITLES[klass] || 'Not quite',
    verdict.message,
    `Your drawing names as ${stripStereo(named.name)}. Compare that with ${stripStereo(targetCanon)} — the difference is what to fix.`,
    { drawnName: named.name }
  );
}

// Canonical spelling of a target name (handles trivial names and
// alternative spellings in authored content).
export function canonicalName(name) {
  const p = parseName(name);
  if (p && p.ok) return p.canonical || p.name || name;
  return name;
}

function issue(errorClass, title, message, explanation, extra = {}) {
  return {
    correct: false,
    issue: {
      errorClass,
      title,
      message,
      explanation: explanation || '',
      atomIds: [],
      bondIds: [],
      fix: null,
      ...extra,
    },
  };
}
