// ─────────────────────────────────────────────────────────────
// Formula typography.
//
// Turns CH3 into CH₃ and C3H8 into C₃H₈ for display.
//
// The hard part is what NOT to convert. In this app "C2" almost
// always means carbon number 2 — a locant — and writing it as C₂
// would say "two carbons", which is a different claim and wrong.
// So a token is only treated as a formula when it contains at
// least two element symbols: CH3, CH4, C3H8 yes; C2, C10 no.
//
// Names are left alone entirely (but-2-ene, 2-methylbutane), as is
// ordinary prose ("Question 4 of 10").
//
// Unicode subscripts are used rather than nested <Text> with a
// reduced font size: React Native has no baseline-shift, so nested
// text would sit on the line and read as small digits rather than
// subscripts. Unicode also survives copy-paste and works inside SVG.
// ─────────────────────────────────────────────────────────────

const DIGITS = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const EXTRA = { n: 'ₙ', x: 'ₓ', '+': '₊', '-': '₋', '(': '₍', ')': '₎' };

const toSub = (s) => s.replace(/[0-9]/g, (d) => DIGITS[d]);
const toSubAll = (s) => s.replace(/[0-9nx+\-()]/g, (c) => DIGITS[c] || EXTRA[c] || c);

// Two or more element symbols run together, e.g. CH3, C3H8, C8H18, H2O.
// (?![a-z]) stops it matching the start of an ordinary word.
const FORMULA = /\b((?:[A-Z][a-z]?[0-9]*){2,})\b(?![a-z])/g;

// The general formula, written CnH(2n+2) or CnH2n+2.
const GENERAL = /\bC([n])H\(?(2n\s*\+\s*2)\)?/g;

// Glossary markers reach here from captions, hints and question prompts —
// anywhere too short to host a definition bubble. Rendering "[[parent chain]]"
// literally is the one outcome that must never happen, so the markers are
// removed at the single point every one of those fields passes through.
const TERM_MARK = /\[\[~?([^\]|]+)(?:\|([^\]]+))?\]\]/g;
export function stripTermMarkers(text) {
  if (typeof text !== 'string' || !text.includes('[[')) return text;
  return text.replace(TERM_MARK, (_, key, shown) => shown || key);
}

export function formatFormulas(input) {
  input = stripTermMarkers(input);
  if (input == null) return input;
  let text = String(input);

  text = text.replace(GENERAL, (_, n, tail) => `C${EXTRA.n}H${toSubAll(tail.replace(/\s+/g, ''))}`);

  text = text.replace(FORMULA, (token) => {
    // A token with no digits needs no work, and one element symbol plus
    // digits is a locant (C2), not a formula.
    if (!/[0-9]/.test(token)) return token;
    const symbols = token.match(/[A-Z][a-z]?/g) || [];
    if (symbols.length < 2) return token;
    return toSub(token);
  });

  return text;
}

// Convenience for engine output, which is always a real formula
// (C9H8O4) and never a locant.
export function formatEngineFormula(f) {
  return f == null ? f : toSub(String(f));
}
