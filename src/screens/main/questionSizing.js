// ─────────────────────────────────────────────────────────────
// Question sizing.
//
// A question should fit the screen. Scrolling to find the answer
// options is bad on its own, and worse in a timed context where a
// student can miss that an option exists.
//
// So the layout is scaled to the viewport rather than fixed: on a
// short phone the prompt, the diagram and the option rows all
// shrink together. Pure and exported so tests can assert that the
// estimated height fits real device sizes.
//
// Heights below are the measured cost of each block at that scale,
// used both for styling and for the fit estimate.
// ─────────────────────────────────────────────────────────────

// Chrome that is always present around the question body:
// lesson top bar + progress, the Check answer button, and padding.
// Chrome that is always present around the question body. Raised when every
// multiple choice went from three options to four: the fourth row has to come
// from somewhere, and taking it from the assumed chrome is what stops the
// options being pushed below the fold.
const CHROME = 150;

export function questionSizing(viewport) {
  const h = (viewport && viewport.height) || 800;
  const w = (viewport && viewport.width) || 390;

  // Three bands rather than a continuous scale: continuous scaling
  // makes type sizes drift to odd values between devices.
  const band = h < 640 ? 'tight' : h < 780 ? 'mid' : 'roomy';

  const S = {
    tight: {
      chipSize: 10,
      chipPadV: 4,
      promptSize: 17,
      promptLine: 23,
      subtitleSize: 12.5,
      gap: 7,
      molHeight: 78,
      optionPadV: 7,
      optionMin: 44,
      optionGap: 6,
      letter: 24,
      cardMin: 118,
      cardMol: 96,
      keyMin: 44,
      keySize: 17,
      readoutSize: 22,
      inputMin: 46,
      inputSize: 15,
      verdictPad: 8,
      verdictSize: 12.5,
      ctaMin: 48,
      ctaSize: 16,
      nameCardH: 70,
    },
    mid: {
      chipSize: 10.5,
      chipPadV: 5,
      promptSize: 19,
      promptLine: 25,
      subtitleSize: 13.5,
      gap: 9,
      molHeight: 98,
      optionPadV: 9,
      optionMin: 46,
      optionGap: 7,
      letter: 26,
      cardMin: 138,
      cardMol: 112,
      keyMin: 46,
      keySize: 19,
      readoutSize: 25,
      inputMin: 50,
      inputSize: 16,
      verdictPad: 10,
      verdictSize: 13,
      ctaMin: 50,
      ctaSize: 16.5,
      nameCardH: 84,
    },
    roomy: {
      chipSize: 11,
      chipPadV: 6,
      promptSize: 21,
      promptLine: 28,
      subtitleSize: 14,
      gap: 12,
      molHeight: 126,
      optionPadV: 11,
      optionMin: 50,
      optionGap: 8,
      letter: 28,
      cardMin: 160,
      cardMol: 128,
      keyMin: 48,
      keySize: 20,
      readoutSize: 28,
      inputMin: 52,
      inputSize: 17,
      verdictPad: 11,
      verdictSize: 13.5,
      ctaMin: 54,
      ctaSize: 17,
      nameCardH: 96,
    },
  }[band];

  return {
    band,
    ...S,
    // molecule drawings are also bounded by width
    molWidth: Math.min(w - 80, 300),
    cardWidth: Math.min((w - 60) / 2, 170),
    available: h - CHROME,
  };
}

// Rough height of a question body. Used to keep the design tight, NOT to
// decide whether content is reachable — questions scroll when they need to, so
// an inaccurate estimate costs a small scroll rather than a hidden option.
// (An earlier version used this to switch scrolling on and off, and the
// estimate was optimistic: real option rows are taller than modelled, so the
// last option ended up behind the Check answer button.)
export function estimateHeight(kind, sizing, optionCount = 4) {
  const s = sizing;
  const head = s.chipSize + s.chipPadV * 2 + 8 + s.promptLine * 2 + s.gap;

  const body = {
    mcName: s.molHeight + (s.optionMin + s.optionGap) * optionCount,
    mcStructure: (s.cardMin + s.optionGap) * Math.ceil(optionCount / 2),
    write: s.molHeight + 20 + s.inputMin + 44,
    number: s.molHeight * 0.7 + s.readoutSize + 40 + (s.keyMin + 8) * 4,
    correctName: s.molHeight + 20 + s.inputMin + 44,
    buildName: s.molHeight + 54 + 30 + (s.optionMin + s.optionGap) * 2,
    compareNames: s.nameCardH * 2 + 26 + s.molHeight * 0.6 + s.optionMin + 8,
    countTap: s.molHeight + 40,
    draw: 260,
  }[kind] || s.molHeight;

  return head + body;
}
