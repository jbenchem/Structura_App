// ─────────────────────────────────────────────────────────────
// Content façade. The curriculum (stages/units/lessons) lives in
// curriculum.js; this module re-exports it alongside the shared
// taxonomies so existing imports keep working.
// ─────────────────────────────────────────────────────────────

export { STAGES, UNITS, unitById, totalUnits } from './curriculum';

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
