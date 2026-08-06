// ─────────────────────────────────────────────────────────────
// Structura design tokens — single source of truth for the UI.
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

export const R = { sm: 10, md: 14, lg: 18, xl: 24 };

export const shadow = {
  shadowColor: '#12293E',
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

export const T = {
  h1: { fontSize: 26, fontWeight: '800', color: C.navy, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '800', color: C.navy, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '700', color: C.navy },
  body: { fontSize: 14, color: C.navy, lineHeight: 20 },
  sub: { fontSize: 13, color: C.sub, lineHeight: 18 },
  tiny: { fontSize: 11, color: C.sub },
};
