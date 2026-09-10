// ─────────────────────────────────────────────────────────────
// PARKED. Reminders are not wired into the app: the device layer, the
// Account toggle and the expo-notifications dependency were removed
// (Expo Go on Android could not load the module, and the feature was
// deferred). This planner is kept because its rules — one honest message
// a day, never a threat — are the part worth not re-deriving, and its
// tests still run. Re-adding is: expo-notifications, a thin scheduler
// that calls planNotification(), and a toggle.
//
// What to say, and when — as pure data.
//
// The app's rule about pressure applies here more than anywhere: a
// notification is the one message that arrives uninvited, so it must never
// claim a streak is dying, never invent a deadline, and never nag. What it
// may do is state a true, useful fact: today's molecule exists, or
// something specific is due for review.
//
// This module decides the message. Scheduling it on the device is a thin
// layer elsewhere, so every rule here is testable without a phone.
// ─────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_NOTIFY = {
  enabled: false,       // opt-in, always
  hour: 17,             // late afternoon, after school
  minute: 0,
};

// The one message worth sending today, or null for silence. Priority order,
// first match wins — never more than one a day.
export function planNotification({ state, review, daily, now = Date.now() }) {
  if (!state || !state.settings || !state.settings.notify || !state.settings.notify.enabled) return null;

  const lastSent = (state.notifyLog && state.notifyLog.lastTs) || 0;
  if (now - lastSent < 20 * 60 * 60 * 1000) return null; // at most one a day

  // Someone mid-lesson today does not need reminding to study today.
  if (now - (state.lastActiveAt || 0) < 6 * 60 * 60 * 1000) return null;

  // 1 · Something specific is due, and we can name it.
  if (review && review.due && review.due.length) {
    const g = review.due[0];
    return {
      id: 'review-due',
      title: 'Ready when you are',
      body: `${g.label}${g.family ? ` on ${g.family}s` : ''} — a short set would steady it.`,
    };
  }

  // 2 · Today's molecule, named honestly as an invitation.
  if (daily && daily.name && !daily.answered) {
    return {
      id: 'daily-molecule',
      title: 'Molecule of the day',
      body: daily.family
        ? `Today's is ${daily.family === 'alkane' ? 'an alkane' : `a ${daily.family}`}. Can you name it?`
        : 'Can you name it?',
    };
  }

  // 3 · A long absence, stated as a fact with no guilt attached.
  const away = now - (state.lastActiveAt || now);
  if (away > 7 * DAY) {
    return {
      id: 'welcome-back',
      title: 'Your pathway is where you left it',
      body: 'Everything you finished is still secured. A few questions is a fine way back in.',
    };
  }

  return null;
}

// The next occurrence of the chosen local time — never a moment in the past,
// which would fire immediately and feel like a bug.
export function nextFireTime({ hour, minute }, now = Date.now()) {
  const d = new Date(now);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute, 0, 0);
  if (target.getTime() <= now) target.setDate(target.getDate() + 1);
  return target.getTime();
}

// Nothing this module produces may manufacture urgency. The suite asserts
// it against every message the planner can emit.
export const FORBIDDEN = [
  /streak.*(risk|danger|lose|losing|about to)/i,
  /don't lose/i,
  /last chance/i,
  /hurry/i,
  /expires?/i,
  /falling behind/i,
  /\d+ (hours?|minutes?) left/i,
];
