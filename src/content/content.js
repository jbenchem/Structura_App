// ─────────────────────────────────────────────────────────────
// Content façade. The curriculum (stages/units/lessons) lives in
// curriculum.js; this module re-exports it alongside the shared
// taxonomies so existing imports keep working.
// ─────────────────────────────────────────────────────────────

import { STAGES as FULL_STAGES, UNITS as FULL_UNITS } from './curriculum';
import { SHOW_REACTIONS } from '../config';

// The app-facing curriculum. With the reactions flag off (study builds), the
// r-units simply do not exist as far as any screen or progress logic is
// concerned: not on Learn, not in "continue", not in the unit count. The
// tests import curriculum.js directly and always see everything — content is
// tested whether or not it is shipped.
// The naming-only transform, unconditional — exported so the suite can test
// the study build without flipping the flag, because a mirrored copy of this
// logic in a test would only drift. This IS the code the flag runs.
export const stripReactions = (stages) =>
  stages
    .map((s) => ({
      ...s,
      units: s.units.filter((u) => !u.id.startsWith('r')),
      // Naming-only builds get naming-only copy: a stage must not
      // advertise "the first reactions" while the flag hides them.
      blurb: s.blurbNamingOnly || s.blurb,
    }))
    // Defensive: a stage emptied by the gate disappears entirely, and the
    // survivors renumber contiguously. No stage is all-reactions today, but
    // the layout must not look broken the day one is.
    .filter((s) => s.units.length > 0)
    .map((s, i) => ({ ...s, n: i + 1 }));

const gateStages = (stages) => (SHOW_REACTIONS ? stages : stripReactions(stages));

export const STAGES = gateStages(FULL_STAGES);
export const UNITS = SHOW_REACTIONS ? FULL_UNITS : FULL_UNITS.filter((u) => !u.id.startsWith('r'));
export const unitById = (id) => UNITS.find((u) => u.id === id) || null;
export const totalUnits = UNITS.length;

export const LEVELS = [
  { id: 'VCE', label: 'VCE' },
  { id: 'UNI', label: 'University' },
];

export const TOPICS = [
  { id: 'alkanes', label: 'Alkanes' },
  { id: 'alkenes', label: 'Alkenes' },
  { id: 'functional-groups', label: 'Functional groups' },
  { id: 'stereochemistry', label: 'Stereochemistry' },
];

export const PRACTICE_MODES = [
  { id: 'name', label: 'Name structures' },
  { id: 'draw', label: 'Draw structures' },
  { id: 'mixed', label: 'Mixed practice' },
];

// 'concept' covers multiple-choice comprehension checks inside lessons.
export const QUESTION_TYPES = ['structure-to-name', 'name-to-structure', 'concept'];

export const ERROR_CLASSES = [
  'chain-selection',
  'locant',
  'suffix-seniority',
  'substituent-order',
  'valence',
  'formula',
  'stereo-descriptor',
  'other',
];
