// ─────────────────────────────────────────────────────────────
// Speech model for read-aloud.
//
// The point of this module is that adding content never means touching the
// audio. Any authored string flows through tokenize() and comes out as a list
// of tokens carrying BOTH:
//
//   display — exactly what is on the screen (formulas subscripted, glossary
//             markers resolved), so a highlight lands on the right word
//   spoken  — what the voice should say, which is often different: "CH₃" is
//             read "C H three", not "see aitch three subscript".
//
// Those two strings diverge, which is the whole reason this is a module rather
// than a regex at the call site. Highlighting by character offset into the
// SPOKEN text and then colouring that offset in the DISPLAYED text puts the
// blue on the wrong word the first time a formula appears.
//
// Nothing here imports React or React Native: it is data in, data out, so the
// mapping can be tested for every string in the curriculum without rendering
// anything.
// ─────────────────────────────────────────────────────────────

import { formatFormulas } from '../chem/formula';
import { TERM_PATTERN } from './glossary';

// Subscripts, back to the characters they stand for. formatFormulas() is a
// one-way display transform, so speech reverses it rather than trying to run
// off the original — the original is not what the reader is looking at.
const UNSUB = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  'ₙ': 'n', 'ₓ': 'x', '₊': '+', '₋': '-', '₍': '(', '₎': ')',
};

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

// Atom counts are read as numbers, not as digits: C6H14 is "C six H fourteen",
// never "C six H one four". Carbon chains stop well short of a hundred, so
// two digits is the whole range this needs to cover.
export function numberWord(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return String(n);
  if (v < 20) return ONES[v];
  if (v < 100) {
    const t = TENS[Math.floor(v / 10)];
    const r = v % 10;
    return r ? `${t}-${ONES[r]}` : t;
  }
  return String(v)
    .split('')
    .map((d) => ONES[+d])
    .join(' ');
}

// Symbols that appear in the content and have no sensible default reading.
// A screen reader saying "right arrow" mid-sentence is worse than silence.
const SYMBOL_SPEECH = {
  '→': 'gives',
  '⇌': 'is in equilibrium with',
  '≈': 'about',
  '≥': 'at least',
  '≤': 'at most',
  '°': 'degrees',
  '·': ' ',
  '×': 'by',
};

const unsubscript = (s) => s.replace(/[₀-₉ₙₓ₊₋₍₎]/g, (c) => UNSUB[c] || c);

// A formula for speech purposes: two or more element symbols, at least one
// digit. Same rule formatFormulas() uses to decide what to subscript, so the
// two never disagree about what is a formula and what is a locant.
function isFormula(plain) {
  if (!/[0-9]/.test(plain)) return false;
  const symbols = plain.match(/[A-Z][a-z]?/g) || [];
  return symbols.length >= 2;
}

// "C3H8" → "C three H eight". Counts become words because engines read a bare
// "3" pressed against a letter unreliably — some say "three", some say the
// whole token as a word, and one Android engine says nothing at all.
function speakFormula(plain) {
  const out = [];
  const re = /([A-Z][a-z]?)([0-9]*)/g;
  let m;
  while ((m = re.exec(plain)) !== null) {
    if (!m[0]) break;
    out.push(m[1]);
    if (m[2]) out.push(numberWord(m[2]));
  }
  return out.join(' ');
}

// The general formula: CnH2n+2, CnH2n, CnH(2n-2). Spelled out rather than
// spelled: "C n H, two n plus two" is what a teacher says at the board.
//
// Written as one regex over the whole token rather than a chain of string
// replacements. The chain version consumed the "2n" and then left the "+2"
// as a bare digit, so the alkane general formula — which a student meets in
// the second unit — was read as "two n plus 2".
const GENERAL_SPEECH = /^C[nₙ]H\(?2n(?:([+-])(\d+))?\)?$/;

function speakGeneral(plain) {
  const m = GENERAL_SPEECH.exec(plain);
  if (!m) return null;
  const head = 'C n H, two n';
  if (!m[1]) return head;
  return `${head} ${m[1] === '+' ? 'plus' : 'minus'} ${numberWord(m[2])}`;
}

// One display word → what to say for it.
export function speakWord(display) {
  const plain = unsubscript(display);

  // Tried against the whole token first. The bracket in "CnH(2n+2)" is not
  // punctuation, it is part of the formula — splitting it off as trailing
  // punctuation and appending it afterwards produced "two n plus two)".
  const whole = speakGeneral(plain);
  if (whole) return whole;

  // Leading/trailing punctuation is kept: it drives the engine's prosody.
  const m = /^([^\w]*)(.*?)([^\w]*)$/s.exec(plain) || [];
  const lead = m[1] || '';
  const core = m[2] || '';
  const tail = m[3] || '';

  const symbolised = (s) => s.replace(/[→⇌≈≥≤°·×]/g, (c) => ` ${SYMBOL_SPEECH[c]} `);

  if (!core) return symbolised(plain).replace(/\s+/g, ' ').trim();

  const general = speakGeneral(core);
  if (general) return `${symbolised(lead)}${general}${symbolised(tail)}`.replace(/\s+/g, ' ').trim();

  // A bare formula, or one carrying punctuation: C6H14, C6H12.
  if (isFormula(core)) {
    return `${symbolised(lead)}${speakFormula(core)}${symbolised(tail)}`.replace(/\s+/g, ' ').trim();
  }

  // An en/em dash between words is a compound ("carbon–carbon"), which reads
  // as two words. Standing alone it is a pause, which reads as a comma.
  const dashed = core.replace(/(\w)[–—](\w)/g, '$1 $2');
  return `${symbolised(lead)}${dashed}${symbolised(tail)}`
    .replace(/[–—]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split a marker-free run into word and whitespace tokens, preserving the
// whitespace exactly — newlines are paragraph breaks on screen and must
// survive, or read-aloud would silently reflow the lesson.
function splitRun(runDisplay) {
  const out = [];
  const re = /(\s+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(runDisplay)) !== null) {
    if (m.index > last) out.push({ kind: 'word', display: runDisplay.slice(last, m.index) });
    out.push({ kind: 'space', display: m[1] });
    last = m.index + m[1].length;
  }
  if (last < runDisplay.length) out.push({ kind: 'word', display: runDisplay.slice(last) });
  return out;
}

const ENDS_SENTENCE = /[.!?:;,]["')\]]?$/;

// ── tokenize ─────────────────────────────────────────────────
// authored string → { tokens, spokenText }
//
// tokens[i] = {
//   kind: 'word' | 'space',
//   display,          what to render
//   spoken,           what to say ('' for a token the voice skips)
//   start, end,       character range within spokenText, for boundary events
//   term, quiet,      glossary marker this token belongs to, if any
// }
export function tokenize(authored) {
  const tokens = [];
  if (typeof authored !== 'string' || !authored) return { tokens, spokenText: '' };

  // Runs: plain text, and glossary-marked terms. Marked terms may span
  // several words ("parent chain"), so the marker is carried on every token
  // inside it — one tap target per word, one definition.
  const runs = [];
  const re = new RegExp(TERM_PATTERN.source, 'g');
  let last = 0;
  let m;
  while ((m = re.exec(authored)) !== null) {
    if (m.index > last) runs.push({ text: authored.slice(last, m.index) });
    runs.push({ text: (m[3] || m[2]).trim(), term: m[2].trim(), quiet: !!m[1] });
    last = m.index + m[0].length;
  }
  if (last < authored.length) runs.push({ text: authored.slice(last) });

  // Format the WHOLE run before splitting. The general-formula rule deletes
  // spaces inside "CnH(2n + 2)", so splitting first would tokenize a formula
  // into three words and then fail to recognise any of them.
  for (const run of runs) {
    for (const t of splitRun(formatFormulas(run.text))) {
      tokens.push({ ...t, term: run.term || null, quiet: !!run.quiet });
    }
  }

  // Build the spoken string and record where each token starts in it.
  let spokenText = '';
  for (const t of tokens) {
    if (t.kind === 'space') {
      // A paragraph break earns a sentence pause, but only if the sentence
      // did not already end in one — "..." is read aloud as a stutter.
      const gap = /\n\s*\n/.test(t.display) && !ENDS_SENTENCE.test(spokenText) ? '. ' : ' ';
      t.spoken = spokenText ? gap : '';
      t.start = spokenText.length;
      spokenText += t.spoken;
      t.end = spokenText.length;
      continue;
    }
    const said = speakWord(t.display);
    t.spoken = said;
    t.start = spokenText.length;
    spokenText += said;
    t.end = spokenText.length;
  }

  // Trailing whitespace contributes nothing and would leave the highlight
  // parked past the last word.
  return { tokens, spokenText: spokenText.replace(/\s+$/, '') };
}

// Which token is being spoken, given a character offset from the engine's
// boundary event. Binary search: this runs once per word on a long paragraph.
export function tokenAtOffset(tokens, charIndex) {
  if (!tokens || !tokens.length) return -1;
  let lo = 0;
  let hi = tokens.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid].start <= charIndex) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  // Land on a word, never on the space before it.
  while (best >= 0 && tokens[best].kind !== 'word') best -= 1;
  return best;
}

// ── how long a word takes to say ─────────────────────────────
// Used where the platform gives no word-boundary events (Android is the
// case that matters). An estimate that drifts slightly is far better than a
// highlight that never moves, and a boundary event overrides it the moment
// one arrives.
const BASE_MS_PER_WORD = 90;
const MS_PER_CHAR = 42;

export function estimateWordMs(spoken, rate = 1) {
  const chars = (spoken || '').length;
  const raw = BASE_MS_PER_WORD + chars * MS_PER_CHAR * 0.55;
  // A word ending a sentence is followed by a pause the engine takes but does
  // not report, so the highlight would otherwise run ahead of the voice.
  const pause = ENDS_SENTENCE.test(spoken || '') ? 180 : 0;
  return Math.round((raw + pause) / Math.max(0.5, rate));
}

// ── what to read on a lesson step ────────────────────────────
// Adding a field here is the only thing a new kind of content ever needs.
// Everything already authored — every teach step in all 30 units — is
// readable because it already uses these fields.
// Listed in the order they are laid out on the page, because the voice
// reading a caption before the paragraph above it is worse than not reading
// it at all. 'split.note' is nested one level down on the root/suffix card.
export const SPOKEN_FIELDS = [
  'title',
  'body',
  'prompt',
  'subtitle',
  'caption',
  'split.note',
  'periodicNote',
  'explain',
];

const at = (obj, path) =>
  path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

// A step → the strings to read, in the order they appear on screen.
export function speechSegmentsFor(step) {
  if (!step || typeof step !== 'object') return [];
  const out = [];
  for (const field of SPOKEN_FIELDS) {
    const v = at(step, field);
    if (typeof v === 'string' && v.trim()) out.push({ field, text: v });
  }
  return out;
}

// Where a given field sits in the segment list, so a renderer can ask "is the
// voice in my paragraph right now?" without tracking indices itself.
export function segmentIndexOf(segments, field) {
  return (segments || []).findIndex((s) => s.field === field);
}
