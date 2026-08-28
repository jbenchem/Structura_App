// ─────────────────────────────────────────────────────────────
// The first-run tour.
//
// Content, not code: the steps live here so the wording can be edited
// without touching the overlay, and so a test can check that every step
// points at something that actually exists on screen.
//
// Rules this list follows, learned from tutorials that get skipped:
//
//   • It is short. Seven cards is already at the limit of what anyone reads
//     before tapping through.
//   • Every step points at one thing. A spotlight around half the screen
//     teaches nothing.
//   • It explains what a thing is FOR, not what it is called. "Learn" is
//     already written on the tab.
//   • Nothing in it is required. The tour can be dismissed at any point and
//     replayed later from Account.
//
// `target` is a key registered by a screen via useTourTarget(). A step with
// no target is a plain centred card, used to open and close.
// ─────────────────────────────────────────────────────────────

export const TOUR_STEPS = [
  {
    id: 'welcome',
    target: null,
    title: 'A quick tour',
    body: 'Thirty seconds on where everything is. You can skip it now or replay it later from Account.',
    next: 'Show me',
  },
  {
    id: 'continue',
    target: 'home.continue',
    title: 'Your best next step',
    body: 'This card always holds one recommendation, chosen from your own answers — a lesson, a checkpoint, or a short repair set. Tapping it is the shortest route to useful work.',
    placement: 'below',
  },
  {
    id: 'quick',
    target: 'home.quick',
    title: 'Everything else',
    body: 'The recommendation is never the only door: focused practice, the full course, and the sandbox all live here.',
    placement: 'below',
  },
  {
    id: 'sandbox',
    target: 'home.sandbox',
    title: 'The sandbox',
    body: 'Draw any molecule and it is named for you, or type any name and it is drawn. Nothing is marked here — it is for trying things.',
    placement: 'below',
  },
  {
    id: 'learn',
    target: 'tab.learn',
    title: 'The whole pathway',
    body: 'Every unit, in order. Units unlock as you finish the ones before them — the entire course is free, so a lock is only ever about the order.',
    placement: 'above',
  },
  {
    id: 'progress',
    target: 'tab.progress',
    title: 'What to work on',
    body: 'Your accuracy broken down by skill, and the one thing worth practising next. It comes from your answers, so it is empty until you have given some.',
    placement: 'above',
  },
  {
    id: 'done',
    target: null,
    title: 'That is the whole app',
    body: 'Lessons teach a little and then ask. If a word is underlined, tap it for a one-line definition — and the speaker icon on any teaching page will read the page aloud.',
    next: 'Start learning',
  },
];

// Which registered targets the tour relies on. The screens register these;
// if one is renamed, the tour would silently fall back to a centred card
// with no hole in it, which reads as a bug rather than as a tour.
export const TOUR_TARGETS = Array.from(
  new Set(TOUR_STEPS.map((s) => s.target).filter(Boolean))
);
