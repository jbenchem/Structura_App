// ─────────────────────────────────────────────────────────────
// Speech model for narration.
//
// Turns an authored string into what the voice should SAY, which is not what
// the screen shows: "CH₃" is displayed subscripted and read "C H three".
// A synthesiser handed the displayed text reads subscript digits
// unpredictably — some engines say the number, some say nothing at all — so
// the conversion is explicit rather than left to the engine.
//
// The point of the module is that adding content never means touching audio.
// Nothing is recorded; speechTextFor(step) derives the narration from the
// step's own fields, so a lesson written next month is readable the moment it
// is authored.
//
// Nothing here imports React or React Native: data in, data out, so every
// string in the curriculum can be checked without rendering anything.
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
// tokens[i] = { kind: 'word' | 'space', display, spoken }
//
// The display strings are kept so a test can prove the conversion reassembles
// into exactly the text on the screen — that nothing has been dropped or
// invented on the way to the voice.
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

  // Build the spoken string.
  let spokenText = '';
  for (const t of tokens) {
    if (t.kind === 'space') {
      // A paragraph break earns a sentence pause, but only if the sentence
      // did not already end in one — "..." is read aloud as a stutter.
      const gap = /\n\s*\n/.test(t.display) && !ENDS_SENTENCE.test(spokenText) ? '. ' : ' ';
      t.spoken = spokenText ? gap : '';
      spokenText += t.spoken;
      continue;
    }
    t.spoken = speakWord(t.display);
    spokenText += t.spoken;
  }

  return { tokens, spokenText: spokenText.replace(/\s+$/, '') };
}

// The only thing the narrator needs: one string to say.
export function spokenFor(authored) {
  return tokenize(authored).spokenText;
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
];

// Fields that must NEVER be narrated, listed so the exclusion is a decision
// on the page rather than an accident of which names happen to be above.
//
// `explain` is the worst of them: on an activity page it holds the answer,
// and a student pressing the speaker before answering would be read the
// solution. `answer` is the same fault by a plainer name, and `hint` is help
// the student chooses to reveal — narrating it unasked takes the choice away.
export const NEVER_SPOKEN = ['explain', 'answer', 'hint', 'name'];

const at = (obj, path) =>
  path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

// A step → the strings to read, in the order they appear on screen.
//
// An activity page keeps its text one level down, on `q`, so the source is
// unwrapped first. Teaching pages, the twenty-odd interactive step types and
// quiz questions then all read through one path — a new step type is narrated
// the moment it is authored, provided it uses the field names everything else
// uses.
export function speechSegmentsFor(step) {
  if (!step || typeof step !== 'object') return [];
  const source = step.type === 'question' && step.q ? step.q : step;
  const out = [];
  for (const field of SPOKEN_FIELDS) {
    const v = at(source, field);
    if (typeof v === 'string' && v.trim()) out.push({ field, text: v });
  }
  // Multiple choice: the options are the question. Reading the stem and then
  // stopping leaves a student who is listening rather than reading with
  // nothing to choose between.
  if (Array.isArray(source.options)) {
    source.options.forEach((opt, i) => {
      if (typeof opt !== 'string' || !opt.trim()) return;
      out.push({ field: `options.${i}`, text: `${LETTER[i] || i + 1}. ${opt}` });
    });
  }
  return out;
}

const LETTER = ['A', 'B', 'C', 'D', 'E', 'F'];

// Everything on a teaching page as one thing to say.
//
// One utterance rather than one per field: the engine's own sentence pacing
// carries the joins, and chaining several utterances meant several rounds of
// start-up latency and several chances for one to be dropped. A full stop is
// added between fields that do not already end in one, so a heading does not
// run into the paragraph beneath it.
export function speechTextFor(step) {
  const parts = [];
  for (const seg of speechSegmentsFor(step)) {
    const said = spokenFor(seg.text);
    if (!said) continue;
    parts.push(/[.!?:]["')\]]?$/.test(said) ? said : `${said}.`);
  }
  return parts.join(' ');
}
