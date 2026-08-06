// ─────────────────────────────────────────────────────────────
// Sandbox constants — carried over from the prototype verbatim.
//
// BOND, HIT_ATOM and HIT_BOND are LOAD-BEARING. An atom's touch
// radius must stay well under half the bond length or the middle
// of every bond falls inside an endpoint's hit zone and bonds
// become untappable; it must also match the drawn label width or
// heteroatoms become unhittable. Both failure modes have happened.
// Do not "tidy" these numbers.
// ─────────────────────────────────────────────────────────────

import { C as THEME } from '../theme';

// The prototype had its own palette; these map its roles onto the
// app's tokens so the sandbox matches the rest of Structura.
export const C = {
  blue: THEME.teal,        // primary / armed-tool colour
  bg: THEME.bg,
  surf: THEME.card,
  surf2: THEME.tealSoft,
  navy: THEME.navy,
  sub: THEME.sub,
  border: THEME.border,
  green: THEME.greenText,
  amber: THEME.warn,
  red: THEME.danger,
  violet: THEME.blue,
};



export const BOND = 64;
export const HIT_ATOM = 17;
export const HIT_BOND = 24;
export const ELEMENTS = ["C","O","N","Cl","Br","F","I","S"];
export const BOND_TYPES = [
  { id:"single", order:1, stereo:null,     label:"\u2014",  hint:"single" },
  { id:"double", order:2, stereo:null,     label:"\u003d",  hint:"double" },
  { id:"triple", order:3, stereo:null,     label:"\u2261",  hint:"triple" },
  { id:"wedge",  order:1, stereo:"wedge",  label:"\u25b2",  hint:"wedge" },
  { id:"dash",   order:1, stereo:"dash",   label:"\u2337",  hint:"dash" },
];
// Explicit hydrogen needs an entry of its own. Without one the `?? 4` fallback
// below gave it carbon's valence, so an H with a single bond was drawn as
// "HH3" — three implicit hydrogens hanging off a hydrogen.
export const LIMIT = { C:4, N:3, O:2, F:1, Cl:1, Br:1, I:1, S:2, H:1 };
/* how many hydrogens an atom is carrying, given the bonds drawn on it */
export const implicitH = (atom, load) =>
  Math.max(0, (LIMIT[atom.el||"C"] ?? 4) - (load[atom.id]||0));

/* One label per atom: element, then H, then the count as a subscript, all
   centred on the atom so CH3 reads as a unit instead of scattered pieces. */
export const labelWidth = (el, nH, size) =>
  (el.length + (nH>0?1:0)) * size*0.60 + (nH>1 ? size*0.38 : 0) + size*0.30;


export const TEMPLATES = [
  { id:"benzene", label:"benzene", n:6, aromatic:true },
  { id:"c6",      label:"6-ring",  n:6 },
  { id:"c5",      label:"5-ring",  n:5 },
  { id:"c4",      label:"4-ring",  n:4 },
  { id:"c3",      label:"3-ring",  n:3 },
];

/* A small polygon drawn to match the ring it places, so the buttons read as
   shapes rather than words. Benzene carries the inner circle. */

export const elColour = el =>
  el==="O" ? C.red : el==="N" ? C.blue :
  el==="S" ? C.amber : (el && el!=="C") ? C.violet : C.navy;

/* Stamp a ring onto the drawing. Three ways to place it:
     standalone  nothing selected
     attach      an atom is selected: the ring hangs off it by a new bond
     fuse        a bond is selected: the ring shares that bond, giving fused
                 systems like naphthalene and decalin
     spiro       long press: the ring shares the selected atom itself
   The direction is always chosen to grow away from what is already drawn. */

export const dist = (x1,y1,x2,y2) => Math.hypot(x2-x1, y2-y1);

export const snap30 = a => Math.round(a / (Math.PI/6)) * (Math.PI/6);

/* pick a tidy outgoing angle from `from`, avoiding existing atoms */

// Suggestion pool for the sandbox's "Practice" shortcut. The app's own
// Practice tab owns real sessions; this just proposes something to draw.
export const PRACTICE = [
  'propan-2-ol', 'butan-2-ol', '2-methylbutane', 'propan-2-one', 'butanal',
  'ethanoic acid', 'ethyl ethanoate', 'propanenitrile', 'methoxyethane',
  'cyclohexane', 'benzene', 'phenol', 'methylcyclohexane', '2-chlorobutane',
  '(2R)-butan-2-ol', '(2Z)-but-2-ene', '2-aminopropanoic acid', 'pentane-2,4-dione',
];

// A non-finite number in an SVG transform throws a parse error that
// unmounts the whole canvas, so the view is sanitised at the point of
// use as well as at the point of write.
export function safeTransform(view) {
  const n = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const k = n(view && view.k, 1) || 1;
  return `translate(${n(view && view.tx, 0)},${n(view && view.ty, 0)}) scale(${k})`;
}

// The canvas measures its own container. If a parent's height depends on its
// content — a scroll view, say — that measurement can feed back and grow
// without limit. These bounds make that impossible: an implausible height is
// rejected rather than rendered, and a change smaller than a pixel is ignored
// so layout cannot oscillate.
export const CANVAS_MIN_H = 160;
export const CANVAS_MAX_H = 1200;

export function clampCanvasSize(next, prev) {
  if (!next || !isFinite(next.w) || !isFinite(next.h) || next.w <= 0 || next.h <= 0) return prev;
  const h = Math.max(CANVAS_MIN_H, Math.min(CANVAS_MAX_H, next.h));
  const w = Math.max(1, next.w);
  if (prev && Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1) return prev;
  return { w, h };
}

// Framing a molecule in the visible part of the canvas.
//
// The whole canvas is not visible: the dock floats over its foot and the
// overlay buttons sit across the top. Centring against the full height leaves
// the structure drifting upwards under the controls, which is what "clean does
// not centre properly" looked like.
//
// Pure so the centring can be checked without a device.
export function fitView(bbox, canvasW, canvasH, opts = {}) {
  const pad = opts.pad ?? 46;
  const topInset = opts.topInset ?? 56;
  const bottomInset = opts.bottomInset ?? 96;
  // Low enough that a long chain can actually fit across a phone: a
  // 20-carbon chain is about 1200 units wide against roughly 270 of usable
  // width. Clamping higher left the ends off screen after Clean.
  const minK = opts.minK ?? 0.2;
  const maxK = opts.maxK ?? 2.4;

  const w = Math.max(bbox.maxX - bbox.minX, 1);
  const h = Math.max(bbox.maxY - bbox.minY, 1);
  const viewH = Math.max(120, canvasH - topInset - bottomInset);

  const k = Math.max(minK, Math.min(maxK, Math.min((canvasW - pad * 2) / w, (viewH - pad * 2) / h)));

  return {
    k,
    tx: canvasW / 2 - k * ((bbox.minX + bbox.maxX) / 2),
    ty: topInset + viewH / 2 - k * ((bbox.minY + bbox.maxY) / 2),
  };
}
