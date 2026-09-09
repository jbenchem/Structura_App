// ─────────────────────────────────────────────────────────────
// Catalyst design tokens — single source of truth for the UI.
// Palette matches the approved mockups (teal primary, navy text,
// lime-green success accents, airy near-white background).
// ─────────────────────────────────────────────────────────────

export const C = {
  teal: '#0F7480',       // primary actions, active tab, brand
  tealDark: '#0A5560',   // pressed states
  tealSoft: '#E7F2F3',   // selected card fill
  tealBorder: '#BFDDE0', // selected card border

  navy: '#12293E',       // headings + primary text
  sub: '#5B7083',        // secondary text
  faint: '#8CA0B3',      // tertiary text, disabled

  green: '#7BC24C',      // progress ring, mastery bars, success
  greenSoft: '#EAF6DF',  // "Complete" / "Recommended" pill fill
  greenText: '#4E9A2E',  // pill text

  blue: '#2D7FF9',       // "In progress" accents
  blueSoft: '#E8F1FD',   // in-progress pill / highlight fill

  bg: '#F7FAFB',         // app background
  card: '#FFFFFF',
  border: '#E3ECF1',
  track: '#EDF2F5',      // empty progress track
  danger: '#D64545',
  warn: '#EE8A2E',       // review highlights + warning icon
  warnSoft: '#FDF3E7',   // feedback card tint
};

export const R = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

// The semantic colour legend. Each hue means ONE thing across the app; a
// new feature reaching for a colour checks here first, and the suite holds
// canvas near/miss apart from flawless gold.
//   teal          action, the current thing
//   green         complete, correct
//   coral         the reactions thread (never failure)
//   gold          a flawless run — accuracy ring, fireworks, the golden box
//   warn (red)    a wrong answer
//   near / miss   canvas feedback on a drawn structure (amber, warm orange)
export const SEMANTIC = {
  near: '#E0A020',
  nearSoft: '#FFF2D0',
  miss: '#E8703A',
  missSoft: '#FDE8DC',
};

// Named surfaces — the decisions a screen should not re-make. Every card,
// row, chip and sheet in the app spreads one of these, then adds only what
// is genuinely its own. Border width is 1.5 everywhere: the app's outline
// weight, matching the mascot and the option pills.
export const S = {
  card: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: R.lg, padding: 16 },
  cardSoft: { backgroundColor: C.tealSoft, borderWidth: 1.5, borderColor: C.tealBorder, borderRadius: R.lg, padding: 16 },
  row: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: R.md, padding: 14 },
  pill: { borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chip: { borderWidth: 1.5, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.bg },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, padding: 20, paddingBottom: 28 },
};

export const shadow = {
  shadowColor: '#12293E',
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

export const T = {
  h1: { fontSize: 28, fontWeight: '800', color: C.navy, letterSpacing: -0.3 },
  h2: { fontSize: 21, fontWeight: '800', color: C.navy, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700', color: C.navy },
  body: { fontSize: 15, color: C.navy, lineHeight: 22 },
  sub: { fontSize: 14, color: C.sub, lineHeight: 19 },
  tiny: { fontSize: 12, color: C.sub },
};
