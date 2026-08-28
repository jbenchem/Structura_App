// ─────────────────────────────────────────────────────────────
// Build configuration.
//
// One switch, read everywhere, so a beta build cannot be half-configured —
// which is what happens when the paywall, the dev tools and the feedback
// affordance are each decided in a different file.
//
// Set BUILD to 'beta' before handing the app to testers, and to 'release'
// before publishing.
// ─────────────────────────────────────────────────────────────

export const BUILD = 'beta';   // 'dev' | 'beta' | 'release'

export const IS_DEV = BUILD === 'dev';
export const IS_BETA = BUILD === 'beta';
export const IS_RELEASE = BUILD === 'release';

// Beta testers were invited, not sold to. Locking the sandbox and the
// analytics behind a paywall they cannot pay would mean testing a different
// app from the one being evaluated.
export const PAYWALL_ACTIVE = IS_RELEASE;

// "Complete every authored unit" is a debugging tool. A student seeing it will
// press it, and then the thing being tested is no longer the thing that was
// built.
export const SHOW_DEV_TOOLS = IS_DEV;

// ── The reactions thread ─────────────────────────────────────
// Decision 4 in docs/reactions-plan.md: if the research study measures
// nomenclature outcomes, shipping reactions mid-collection changes the
// intervention and confounds the data. This flag is the deliberate choice
// made cheap: study builds set it false and participants see the naming
// course exactly as designed; everything is still authored, tested and one
// constant away.
//
// Dev tools always see the full curriculum regardless — a tester needs to
// test what exists, not what is shipped.
export const SHOW_REACTIONS = !IS_RELEASE;

// Testers need a way to say what went wrong at the moment it went wrong,
// while they still remember what they tapped.
export const SHOW_FEEDBACK = IS_DEV || IS_BETA;

// Where feedback goes. Replace with the address testers should reach.
export const FEEDBACK_EMAIL = 'feedback@structura.app';

export const BUILD_LABEL =
  BUILD === 'release' ? 'Catalyst' : `Catalyst — ${BUILD} build`;
