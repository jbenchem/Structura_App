// ─────────────────────────────────────────────────────────────
// Structura app state — single source of truth.
//
//   • user          name, learning goal, starting level
//   • entitlement   ONE place premium is decided (foundation #3)
//   • progress      units, lessons, streak, skills, weekly activity
//   • attempts      rich per-question logs (foundation #1)
//
// Persisted to AsyncStorage. When accounts + sync arrive, the
// attempt log is the sync payload — keep its schema stable.
// ─────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { PAYWALL_ACTIVE } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UNITS, unitById } from '../content/content';

const STORAGE_KEY = '@structura/state:v4'; // v4: units 1 and 2 merged

// ── Pricing + trial ──────────────────────────────────────────
// Placeholder until RevenueCat: display copy only, no billing.
export const PRICE = { monthly: 'A$5.00', period: '/ month' };
export const TRIAL_DAYS = 7;

// ── Beta ─────────────────────────────────────────────────────
// During the beta every feature is open to everyone. The entitlement layer
// stays wired — nothing is deleted — but it answers "yes" while this is true.
//
// A tester hitting a paywall on day 8 of a trial would be a bug, not a
// business model: they were invited to evaluate the whole app, and a lock
// appearing partway through would make their feedback about the lock.
//
// Set to false to restore normal gating.
export const BETA_ALL_ACCESS = true;

// ── Access codes (DEV ONLY) ──────────────────────────────────
// School outreach codes. Client-side validation is a placeholder:
// before launch these MUST move to server-side validation so codes
// can't be extracted from the bundle. Format: grant N days of Plus.
export const ACCESS_CODES = {
  // A beta runs longer than anyone plans, so the window is generous. A tester
  // whose access expires mid-programme concludes the app is broken rather
  // than that their trial ended.
  'STRUCTURA-BETA': { days: 365, label: 'Beta tester access' },
  'SCHOOL-PILOT-2026': { days: 180, label: 'School pilot access' },
  'STRUCTURA-TESTER': { days: 30, label: 'Tester access' },
};

// ── Entitlement ──────────────────────────────────────────────
// plan: 'free' | 'monthly' | 'annual' | 'trial' | 'code' | 'dev'
// premiumUntil: ms timestamp or null (null = no expiry, e.g. subs
// managed by the store / RevenueCat later)
export const PREMIUM_FEATURES = new Set([
  'sandbox',
  'adaptivePractice',
  'customTests',
  'examMode',
  'deepAnalytics',
  'unlimitedSandbox',
  'savedStructures',
  'sync',
  'offline',
  'themes',
]);

export function isPremiumActive(ent) {
  if (BETA_ALL_ACCESS) return true;
  if (!ent || ent.plan === 'free') return false;
  if (ent.premiumUntil == null) return true;
  return ent.premiumUntil > Date.now();
}

// ── Settings ─────────────────────────────────────────────────
// Preferences the student controls. Read through getSettings() rather than
// state.settings directly: a device that installed the app before these
// existed has a saved state with no settings key at all, and every screen
// reading it would need its own fallback.
export const DEFAULT_SETTINGS = {
  // Read-aloud on a teaching page starts on its own rather than waiting for
  // the speaker to be pressed. Off by default — audio starting unasked, on a
  // phone in a classroom, is the kind of surprise that gets an app closed.
  autoRead: false,
  // Which voice reads the lessons. null means "pick the best English voice
  // on this device". Set from the picker in Account, which exists because no
  // platform reports a voice's gender and Android's names carry no clue —
  // on a Samsung the only way to get a female voice is to hear one and
  // choose it.
  voiceId: null,
  // The end-of-lesson fireworks, and the vibration that goes with them.
  celebrations: true,
  celebrationHaptics: true,
};

export function getSettings(state) {
  return { ...DEFAULT_SETTINGS, ...((state && state.settings) || {}) };
}

// ── Seed state ───────────────────────────────────────────────
// Fresh start at Stage 1, Unit 1, Lesson 1 — real curriculum now.
function seedProgress() {
  return {
    completedUnits: [],
    current: { unitId: UNITS[0].id, lesson: 1 },
    // Mon..Sun — questions answered per day (drives the chart)
    weekActivity: [0, 0, 0, 0, 0, 0, 0],
    // Mon..Sun — streak ticks; index of "today" comes from the OS
    daysDone: [false, false, false, false, false, false, false],
    skills: [
      { id: 'nomenclature', label: 'Nomenclature', mastered: 0, total: 16 },
      { id: 'drawing', label: 'Structure drawing', mastered: 0, total: 16 },
      { id: 'functional', label: 'Functional groups', mastered: 0, total: 16 },
      { id: 'stereo', label: 'Stereochemistry', mastered: 0, total: 16 },
    ],
  };
}

function initialState() {
  return {
    hydrated: false,
    onboarded: false,
    user: { name: '', goal: null, level: null },
    trialUsed: false,
    dev: { unlockAll: false },
    entitlement: { plan: 'free', premiumUntil: null, source: null },
    progress: seedProgress(),
    attempts: [],
    rollups: {},
    seen: {},
    savedMolecules: [],
    perfectLessons: [],
    lessonResults: {},
    settings: { ...DEFAULT_SETTINGS },
    // The first-run tour. False on a fresh install and after a profile
    // reset, so "reset profile — back to setup" really does reproduce what a
    // new student sees, tour included.
    tourDone: false,
  };
}

// ── Attempt schema (foundation #1) ───────────────────────────
// logAttempt({
//   unitId, questionId, qType,        // 'structure-to-name' | 'name-to-structure'
//   category, family, subcategory,    // the skill x family tags, as the
//                                     // results screen uses them
//   topics: [], difficulty: 1-5,
//   correct: bool, ms: int,
//   errorClass: null | one of ERROR_CLASSES,
//   demo: bool                        // true for placeholder-generated attempts
// })
//
// category/family/subcategory and errorClass were both dropped before being
// written, so the log could say a question was failed but never what kind of
// question it was or why it went wrong. They are the difference between
// analytics that describe and analytics that diagnose, and they cannot be
// reconstructed after the fact — which is why the schema carries them now
// rather than later.
// How long a raw attempt is kept before being rolled up. Beyond this the
// per-question detail stops earning its storage: what matters at that range
// is the totals, and those survive the rollup exactly.
export const RAW_WINDOW_DAYS = 30;
const RAW_CAP = 1500;

function makeAttempt(a) {
  return {
    ts: Date.now(),
    unitId: a.unitId || null,
    questionId: a.questionId || null,
    qType: a.qType || null,
    category: a.category || null,
    family: a.family || null,
    subcategory: a.subcategory || null,
    topics: a.topics || [],
    difficulty: a.difficulty || null,
    correct: !!a.correct,
    ms: a.ms || null,
    errorClass: a.correct ? null : a.errorClass || 'other',
    // Repeat exposure. These two fields are the only ones on this record that
    // cannot be reconstructed afterwards — without them a right answer on a
    // question seen twenty minutes ago is indistinguishable from one seen for
    // the first time, and learning cannot be separated from familiarity.
    seenBefore: a.seenBefore || 0,
    lastSeenMs: a.lastSeenMs == null ? null : a.lastSeenMs,
    demo: !!a.demo,
  };
}

// Attempts older than the raw window are folded into per-subcategory totals.
// Nothing is lost that any selector reads: accuracy, error mix and timing all
// survive as sums, and only the individual rows go.
function rollUp(attempts, rollups, now = Date.now()) {
  const cutoff = now - RAW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const keep = [];
  const next = { ...rollups };
  for (const a of attempts) {
    if (a.ts >= cutoff && keep.length < RAW_CAP) { keep.push(a); continue; }
    const key = a.subcategory || 'unknown';
    const cur = next[key] || { key, category: a.category || null, right: 0, asked: 0, msRight: 0, nRight: 0, msWrong: 0, nWrong: 0, errors: {} };
    cur.asked += 1;
    if (a.correct) {
      cur.right += 1;
      if (a.ms) { cur.msRight += a.ms; cur.nRight += 1; }
    } else {
      if (a.ms) { cur.msWrong += a.ms; cur.nWrong += 1; }
      if (a.errorClass) cur.errors[a.errorClass] = (cur.errors[a.errorClass] || 0) + 1;
    }
    next[key] = cur;
  }
  return { attempts: keep, rollups: next };
}

// ── Reducer ──────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        ...action.payload,
        // A saved state written before a setting existed has no key for it.
        // Spreading the payload wholesale would then replace the defaults
        // with a partial object, and the missing setting would read as
        // undefined rather than as its default.
        settings: { ...DEFAULT_SETTINGS, ...((action.payload && action.payload.settings) || {}) },
        hydrated: true,
      };

    case 'setSetting':
      return {
        ...state,
        settings: { ...getSettings(state), [action.key]: action.value },
      };

    case 'completeTour':
      return { ...state, tourDone: true };

    // Replayed from Account. Nothing else is touched: a student who wants the
    // tour again has not asked to lose their progress.
    case 'restartTour':
      return { ...state, tourDone: false };

    case 'setUser':
      return { ...state, user: { ...state.user, ...action.payload } };

    case 'completeOnboarding': {
      // Every new user gets a week of Plus on the house. Only granted
      // if they have no entitlement yet, so redeemed codes survive.
      const fresh =
        state.entitlement.plan === 'free'
          ? {
              plan: 'trial',
              premiumUntil: Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
              source: 'welcome-trial',
            }
          : state.entitlement;
      return { ...state, onboarded: true, entitlement: fresh, trialUsed: true };
    }

    case 'grantPremium':
      return {
        ...state,
        entitlement: {
          plan: action.plan,
          premiumUntil: action.premiumUntil ?? null,
          source: action.source ?? null,
        },
      };

    case 'clearPremium':
      return {
        ...state,
        entitlement: { plan: 'free', premiumUntil: null, source: null },
      };

    case 'completeLesson': {
      const { current, completedUnits } = state.progress;
      const unit = unitById(current.unitId);
      if (!unit) return state;
      if (current.lesson < unit.lessons) {
        return {
          ...state,
          progress: {
            ...state.progress,
            current: { unitId: unit.id, lesson: current.lesson + 1 },
          },
        };
      }
      // Unit finished → mark complete, advance to the next unit.
      const done = completedUnits.includes(unit.id)
        ? completedUnits
        : [...completedUnits, unit.id];
      const idx = UNITS.findIndex((u) => u.id === unit.id);
      const next = UNITS[idx + 1] || null;
      return {
        ...state,
        progress: {
          ...state.progress,
          completedUnits: done,
          current: next
            ? { unitId: next.id, lesson: 1 }
            : { unitId: unit.id, lesson: unit.lessons },
        },
      };
    }

    case 'saveMolecule': {
      const item = {
        id: `m${Date.now()}`,
        name: action.name || 'unnamed',
        graph: action.graph,
        ts: Date.now(),
      };
      // newest first, and de-duplicated by name so re-saving replaces
      const rest = state.savedMolecules.filter((m) => m.name !== item.name);
      return { ...state, savedMolecules: [item, ...rest].slice(0, 60) };
    }

    case 'deleteMolecule':
      return {
        ...state,
        savedMolecules: state.savedMolecules.filter((m) => m.id !== action.id),
      };

    // Passing a unit's checkpoint completes the whole unit — the point of a
    // checkpoint is that it can be taken instead of the lessons, not only
    // after them.
    case 'completeUnit': {
      const done = state.progress.completedUnits.includes(action.unitId)
        ? state.progress.completedUnits
        : [...state.progress.completedUnits, action.unitId];
      const idx = UNITS.findIndex((u) => u.id === action.unitId);
      const next = UNITS[idx + 1] || null;
      // Never move the learner backwards: if they tested out of an early unit
      // while further ahead, leave their position alone.
      const currentIdx = UNITS.findIndex((u) => u.id === state.progress.current.unitId);
      const advance = next && idx >= currentIdx;
      return {
        ...state,
        progress: {
          ...state.progress,
          completedUnits: done,
          current: advance ? { unitId: next.id, lesson: 1 } : state.progress.current,
        },
      };
    }

    // Progress only — keeps entitlement, saved molecules and the attempt log.
    case 'resetProgress':
      return { ...state, progress: seedProgress() };

    // A lesson answered without a single mistake. Kept per lesson id so the
    // mark survives replaying it — a later imperfect run does not remove it.
    // The best run of each lesson, so the ring on the unit page shows what a
    // learner achieved rather than how a distracted replay went.
    case 'lessonResult': {
      const prev = (state.lessonResults || {})[action.lessonId];
      const pct = action.asked ? action.right / action.asked : 0;
      if (prev && prev.pct >= pct) return state;
      return {
        ...state,
        lessonResults: {
          ...(state.lessonResults || {}),
          [action.lessonId]: {
            pct,
            right: action.right,
            asked: action.asked,
            ms: action.ms || null,
            at: Date.now(),
          },
        },
      };
    }

    case 'lessonPerfect': {
      const have = state.perfectLessons || [];
      if (have.includes(action.lessonId)) return state;
      return { ...state, perfectLessons: [...have, action.lessonId] };
    }

    case 'setDevFlag':
      return { ...state, dev: { ...state.dev, [action.flag]: action.value } };

    case 'logAttempt':
    {
      const qid = action.attempt.questionId || null;
      const prior = qid ? state.seen[qid] : null;
      const attempt = makeAttempt({
        ...action.attempt,
        seenBefore: prior ? prior.n : 0,
        lastSeenMs: prior ? Date.now() - prior.lastTs : null,
      });
      const seen = qid
        ? { ...state.seen, [qid]: { n: (prior ? prior.n : 0) + 1, lastTs: attempt.ts } }
        : state.seen;
      const rolled = rollUp([...state.attempts, attempt], state.rollups);
      return { ...state, attempts: rolled.attempts, rollups: rolled.rollups, seen };
    }

    case 'resetAll':
      return { ...initialState(), hydrated: true };

    // Fill the attempt log with a plausible term so the analytics can be seen
    // without playing twenty lessons. Marked `demo: true` on every row, so a
    // real analysis can exclude it and it can be cleared in one action.
    case 'seedDemoData': {
      const DAY = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const plan = [
        ['write-name:alkane', 'write-name', 0.82, 0.06, 9000, 'other'],
        ['write-name:alkene', 'write-name', 0.64, 0.22, 12000, 'locant'],
        ['draw-molecule:alkane', 'draw-molecule', 0.58, 0.10, 22000, 'chain-selection'],
        ['draw-molecule:alkene', 'draw-molecule', 0.36, 0.26, 26000, 'chain-selection'],
        ['numbering:general', 'numbering', 0.47, 0.02, 11000, 'locant'],
        ['name-structure:alcohol', 'name-structure', 0.74, 0.16, 10000, 'suffix-seniority'],
      ];
      const attempts = [];
      for (let w = 7; w >= 0; w--) {
        const learned = (7 - w) / 7;
        for (const [sub, cat, base, gain, ms, err] of plan) {
          const p = base + gain * learned;
          for (let i = 0; i < 8; i++) {
            const correct = Math.random() < p;
            attempts.push({
              ts: now - (w * 7 + Math.random() * 7) * DAY,
              unitId: null,
              questionId: `demo-${sub}-${w}-${i}`,
              qType: cat === 'draw-molecule' ? 'name-to-structure' : 'structure-to-name',
              category: cat,
              family: sub.split(':')[1],
              subcategory: sub,
              topics: [],
              difficulty: 3,
              correct,
              ms: Math.round(ms * (correct ? 1 : 1.6) * (0.7 + Math.random() * 0.6)),
              errorClass: correct ? null : err,
              seenBefore: 0,
              lastSeenMs: null,
              demo: true,
            });
          }
        }
      }
      attempts.sort((a, b) => a.ts - b.ts);
      return { ...state, attempts, rollups: {}, seen: {} };
    }

    case 'clearAttempts':
      return { ...state, attempts: [], rollups: {}, seen: {} };

    default:
      return state;
  }
}

// ── Provider ─────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const saveTimer = useRef(null);

  // Load once on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        dispatch({ type: 'hydrate', payload: raw ? JSON.parse(raw) : {} });
      } catch (e) {
        dispatch({ type: 'hydrate', payload: {} });
      }
    })();
  }, []);

  // Save (lightly debounced) on every change after hydration.
  useEffect(() => {
    if (!state.hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { hydrated, ...toSave } = state;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)).catch(() => {});
    }, 400);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [state]);

  const value = useMemo(() => {
    const isPremium = isPremiumActive(state.entitlement);
    return {
      state,
      dispatch,
      isPremium,

      // Redeem an access code. Returns { ok, label, days } or { ok:false, error }.
      redeemCode(codeRaw) {
        const code = String(codeRaw || '').trim().toUpperCase();
        const found = ACCESS_CODES[code];
        if (!found) return { ok: false, error: 'That code was not recognised.' };
        const premiumUntil = Date.now() + found.days * 24 * 60 * 60 * 1000;
        dispatch({
          type: 'grantPremium',
          plan: 'code',
          premiumUntil,
          source: code,
        });
        return { ok: true, label: found.label, days: found.days };
      },

      // Placeholder purchase — RevenueCat replaces this later.
      startTrial(plan) {
        const premiumUntil = Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
        dispatch({ type: 'grantPremium', plan: plan || 'trial', premiumUntil, source: 'trial' });
      },

      // Days left on a time-limited entitlement (null = no expiry).
      daysRemaining() {
        const until = state.entitlement.premiumUntil;
        if (!until) return null;
        return Math.max(0, Math.ceil((until - Date.now()) / (24 * 60 * 60 * 1000)));
      },
    };
  }, [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

// Feature-level entitlement check (foundation #3).
// const { allowed, isPremium } = useEntitlement('examMode');
export function useEntitlement(feature) {
  const { isPremium } = useApp();
  // In a beta the paywall is off entirely: testers were invited, not sold to,
  // and evaluating a locked app evaluates the wrong thing.
  const gated = PAYWALL_ACTIVE && PREMIUM_FEATURES.has(feature);
  return { isPremium: isPremium || !PAYWALL_ACTIVE, gated, allowed: !gated };
}

// ── Derived helpers ──────────────────────────────────────────
export function unitStatus(state, unitId) {
  const { completedUnits, current } = state.progress;
  if (completedUnits.includes(unitId)) return 'complete';
  if (current.unitId === unitId) return 'current';
  // Developer override: every authored unit is reachable.
  if (state.dev && state.dev.unlockAll) return 'available';
  return 'locked';
}

// A locked unit can still be tested out of: opening its checkpoint is allowed
// even when its lessons are not.
export function canTestOut(state, unitId) {
  return unitStatus(state, unitId) !== 'complete';
}

// ── Reading the attempt log ──────────────────────────────────
// The log is the durable record: each attempt says what was asked (category
// and family), whether it was right, and when it was not, what kind of
// mistake it was. These selectors are the only things that interpret it, so
// the shape stays in one place.

// Accuracy per subcategory, with a floor. Below a handful of attempts the
// number is noise, and presenting it as a weakness would mislead — so it is
// flagged rather than hidden, and callers decide.
export function subcategoryStats(state, { minAttempts = 4 } = {}) {
  const out = new Map();
  // Rolled-up history first, so a long-standing total is not lost when the
  // raw rows age out.
  for (const r of Object.values(state.rollups || {})) {
    out.set(r.key, { key: r.key, category: r.category, right: r.right, asked: r.asked });
  }
  for (const a of state.attempts || []) {
    if (!a.subcategory) continue;
    const cur = out.get(a.subcategory) || {
      key: a.subcategory, category: a.category, right: 0, asked: 0,
    };
    cur.asked += 1;
    if (a.correct) cur.right += 1;
    cur.category = cur.category || a.category;
    out.set(a.subcategory, cur);
  }
  return [...out.values()]
    .map((v) => ({ ...v, pct: v.asked ? v.right / v.asked : 0, enough: v.asked >= minAttempts }))
    .sort((x, y) => x.pct - y.pct);
}

// What kinds of mistake are being made. This is the question the error
// classes exist to answer, and it is the difference between analytics that
// describe and analytics that diagnose.
export function errorProfile(state) {
  const counts = {};
  let total = 0;
  for (const r of Object.values(state.rollups || {})) {
    for (const [k, n] of Object.entries(r.errors || {})) {
      counts[k] = (counts[k] || 0) + n;
      total += n;
    }
  }
  for (const a of state.attempts || []) {
    if (a.correct || !a.errorClass) continue;
    counts[a.errorClass] = (counts[a.errorClass] || 0) + 1;
    total += 1;
  }
  return Object.entries(counts)
    .map(([klass, n]) => ({ klass, n, share: total ? n / total : 0 }))
    .sort((x, y) => y.n - x.n);
}

// The weakest subcategory that has enough attempts to mean anything, or null.
// Deliberately conservative: no evidence is reported as no finding rather
// than as a guess.
export function weakestSkill(state, opts) {
  const stats = subcategoryStats(state, opts).filter((s) => s.enough && s.pct < 0.8);
  return stats.length ? stats[0] : null;
}

// Is the weakness a SKILL or a FAMILY? Drawing weak across every family means
// the canvas; alkenes weak across every skill means the chemistry.
//
// The earlier version always named a winner, which was overconfident: when the
// two spreads are close the honest answer is that both are true, and saying
// "it is the skill" would send a student to the wrong remedy half the time.
export function weaknessShape(state, opts) {
  const stats = subcategoryStats(state, opts).filter((s) => s.enough);
  if (stats.length < 3) return null;
  const group = (pick) => {
    const m = new Map();
    for (const st of stats) {
      const k = pick(st);
      const cur = m.get(k) || { right: 0, asked: 0 };
      cur.right += st.right;
      cur.asked += st.asked;
      m.set(k, cur);
    }
    return [...m.entries()]
      .map(([k, v]) => ({ k, pct: v.asked ? v.right / v.asked : 0, asked: v.asked }))
      .sort((a, b) => a.pct - b.pct);
  };
  const bySkill = group((st) => st.category);
  const byFamily = group((st) => st.key.split(':')[1] || 'general');
  const spread = (list) => (list.length ? list[list.length - 1].pct - list[0].pct : 0);
  const skillSpread = spread(bySkill);
  const familySpread = spread(byFamily);
  const gap = Math.abs(skillSpread - familySpread);
  const both = gap < 0.08 && skillSpread > 0.15 && familySpread > 0.15;
  const skillWins = skillSpread >= familySpread;
  return {
    kind: both ? 'both' : skillWins ? 'skill' : 'family',
    worst: skillWins ? bySkill[0] : byFamily[0],
    worstSkill: bySkill[0],
    worstFamily: byFamily[0],
    skillSpread,
    familySpread,
  };
}

// ── Time ─────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;

// Accuracy per week. `ts` has always been recorded and never read, so a
// student who improved was never told so.
export function recentTrend(state, { weeks = 8, now = Date.now() } = {}) {
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const hi = now - w * 7 * DAY_MS;
    const lo = hi - 7 * DAY_MS;
    const rows = (state.attempts || []).filter((a) => a.ts >= lo && a.ts < hi);
    out.push({
      weeksAgo: w,
      asked: rows.length,
      right: rows.filter((a) => a.correct).length,
      pct: rows.length ? rows.filter((a) => a.correct).length / rows.length : null,
    });
  }
  return out;
}

// Recent accuracy against lifetime, per subcategory.
//
// This is the one that stops the app giving bad advice. A weakness that is
// already improving does not need to be worked on, and recommending it wastes
// the student's time on something they have fixed.
export function recencyDelta(state, { days = 14, now = Date.now(), minRecent = 3 } = {}) {
  const cutoff = now - days * DAY_MS;
  const overall = new Map(subcategoryStats(state, { minAttempts: 1 }).map((s) => [s.key, s]));
  const recent = new Map();
  for (const a of state.attempts || []) {
    if (!a.subcategory || a.ts < cutoff) continue;
    const cur = recent.get(a.subcategory) || { right: 0, asked: 0 };
    cur.asked += 1;
    if (a.correct) cur.right += 1;
    recent.set(a.subcategory, cur);
  }
  return [...overall.values()].map((s) => {
    const r = recent.get(s.key);
    const recentPct = r && r.asked >= minRecent ? r.right / r.asked : null;
    const delta = recentPct == null ? null : recentPct - s.pct;
    return {
      ...s,
      recentAsked: r ? r.asked : 0,
      recentPct,
      delta,
      direction: delta == null ? 'unknown' : delta > 0.06 ? 'improving' : delta < -0.06 ? 'slipping' : 'steady',
    };
  });
}

// Median time taken, right against wrong. `ms` has always been recorded and
// never read. "Slow even when correct" is a different finding from "wrong" —
// it points at fluency rather than understanding.
export function timingProfile(state) {
  const bySub = new Map();
  for (const a of state.attempts || []) {
    if (!a.subcategory || !a.ms) continue;
    const cur = bySub.get(a.subcategory) || { key: a.subcategory, right: [], wrong: [] };
    (a.correct ? cur.right : cur.wrong).push(a.ms);
    bySub.set(a.subcategory, cur);
  }
  const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const rows = [...bySub.values()].map((v) => ({
    key: v.key,
    msRight: median(v.right),
    msWrong: median(v.wrong),
    n: v.right.length + v.wrong.length,
  }));
  // Each subcategory is compared against the median of the OTHERS, not against
  // a pool that includes itself. With only two or three subcategories a
  // median-of-all is dragged up by the slow one, and the slow one then fails
  // to look slow — which is precisely the case worth catching.
  return rows.map((r) => {
    const others = rows.filter((o) => o.key !== r.key).map((o) => o.msRight).filter(Boolean);
    const baseline = median(others);
    return {
      ...r,
      baselineMs: baseline,
      effortful: !!(r.msRight && baseline && r.msRight > baseline * 1.6 && r.n >= 4),
    };
  });
}

// ── The recommendation ───────────────────────────────────────
// What to do next, or nothing.
//
// Three rules, in order:
//   1. Never recommend something with too little evidence.
//   2. Never recommend something already improving — that is work the student
//      has done, and sending them back to it is the commonest way an adaptive
//      system wastes someone's time.
//   3. Prefer the weakest of what remains.
export function recommendNext(state, { minAttempts = 5, ceiling = 0.75 } = {}) {
  const rows = recencyDelta(state).filter((r) => r.asked >= minAttempts && r.pct < ceiling);
  if (!rows.length) return null;
  const stalled = rows.filter((r) => r.direction !== 'improving');
  const pool = stalled.length ? stalled : rows;
  const pick = [...pool].sort((a, b) => a.pct - b.pct)[0];
  const shape = weaknessShape(state);
  const timing = timingProfile(state).find((t) => t.key === pick.key);
  return {
    key: pick.key,
    category: pick.category,
    pct: pick.pct,
    recentPct: pick.recentPct,
    direction: pick.direction,
    asked: pick.asked,
    right: pick.right,
    // a small, finishable amount of work rather than an open-ended "practise"
    suggested: pick.asked < 12 ? 6 : 10,
    shape: shape ? shape.kind : null,
    effortful: !!(timing && timing.effortful),
    onlyOption: stalled.length === 0,
  };
}

export function skillTotals(state) {
  const skills = state.progress.skills;
  const mastered = skills.reduce((s, k) => s + k.mastered, 0);
  const total = skills.reduce((s, k) => s + k.total, 0);
  return { mastered, total, pct: total ? mastered / total : 0 };
}
