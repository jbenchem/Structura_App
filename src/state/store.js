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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UNITS, unitById } from '../content/content';

const STORAGE_KEY = '@structura/state:v4'; // v4: units 1 and 2 merged

// ── Pricing + trial ──────────────────────────────────────────
// Placeholder until RevenueCat: display copy only, no billing.
export const PRICE = { monthly: 'A$5.00', period: '/ month' };
export const TRIAL_DAYS = 7;

// ── Access codes (DEV ONLY) ──────────────────────────────────
// School outreach codes. Client-side validation is a placeholder:
// before launch these MUST move to server-side validation so codes
// can't be extracted from the bundle. Format: grant N days of Plus.
export const ACCESS_CODES = {
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
  if (!ent || ent.plan === 'free') return false;
  if (ent.premiumUntil == null) return true;
  return ent.premiumUntil > Date.now();
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
    savedMolecules: [],
  };
}

// ── Attempt schema (foundation #1) ───────────────────────────
// logAttempt({
//   unitId, questionId, qType,        // 'structure-to-name' | 'name-to-structure'
//   topics: [], difficulty: 1-5,
//   correct: bool, ms: int,
//   errorClass: null | one of ERROR_CLASSES,
//   demo: bool                        // true for placeholder-generated attempts
// })
function makeAttempt(a) {
  return {
    ts: Date.now(),
    unitId: a.unitId || null,
    questionId: a.questionId || null,
    qType: a.qType || null,
    topics: a.topics || [],
    difficulty: a.difficulty || null,
    correct: !!a.correct,
    ms: a.ms || null,
    errorClass: a.correct ? null : a.errorClass || 'other',
    demo: !!a.demo,
  };
}

// ── Reducer ──────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.payload, hydrated: true };

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

    case 'setDevFlag':
      return { ...state, dev: { ...state.dev, [action.flag]: action.value } };

    case 'logAttempt':
      return { ...state, attempts: [...state.attempts, makeAttempt(action.attempt)] };

    case 'resetAll':
      return { ...initialState(), hydrated: true };

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
  const gated = PREMIUM_FEATURES.has(feature);
  return { isPremium, gated, allowed: !gated || isPremium };
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

export function skillTotals(state) {
  const skills = state.progress.skills;
  const mastered = skills.reduce((s, k) => s + k.mastered, 0);
  const total = skills.reduce((s, k) => s + k.total, 0);
  return { mastered, total, pct: total ? mastered / total : 0 };
}
