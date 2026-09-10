// ─────────────────────────────────────────────────────────────
// Review your mistakes · the daily challenge · notifications.
// The rules that matter here are the restraining ones: what is NOT shown,
// what is NOT asked, and what is never said.
// ─────────────────────────────────────────────────────────────

import { missedGroups, reviewSummary, isDue, reviewDueAt, CLASS_LABEL } from '../src/state/reviewModel.js';
import { planNotification, nextFireTime, FORBIDDEN, DEFAULT_NOTIFY } from '../src/state/notificationPlan.js';
import { moleculeOfTheDay, metFamilies, dailyStatus, dayNumber, DAILY_POOL } from '../src/content/dailyMolecule.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const DAY = 86400000;
const NOW = Date.parse('2026-09-01T18:00:00');
const miss = (n, over) => Array.from({ length: n }, (_, i) => ({ correct: false, ts: NOW - i * 1000, ...over }));

console.log('=== review groups what was missed, and lets it retire ===');
{
  const state = {
    attempts: [
      ...miss(4, { category: 'numbering', family: 'alkene', errorClass: 'wrong-locant' }),
      ...miss(2, { category: 'write-name', family: 'alkane', errorClass: 'chain-selection' }),
      ...miss(1, { category: 'write-name', family: 'ester', errorClass: 'wrong-order' }),
    ],
  };
  const g = missedGroups(state, {}, NOW);
  ck(g.length === 2, `two groups worth practising, not three (${g.length}) — one miss is not a pattern`);
  ck(g[0].errorClass === 'wrong-locant' && g[0].misses === 4, 'the most-missed fault leads');
  ck(g[0].label === CLASS_LABEL['wrong-locant'], 'and it carries a student-facing label');
  ck(g[0].family === 'alkene', 'grouped by the chemistry it happened on');

  // Retirement: three right answers on that family since the last miss.
  const mended = {
    attempts: [
      ...state.attempts,
      ...Array.from({ length: 3 }, (_, i) => ({ correct: true, family: 'alkene', ts: NOW + (i + 1) * 1000 })),
    ],
  };
  ck(!missedGroups(mended, {}, NOW + 5000).some((x) => x.errorClass === 'wrong-locant'), 'a fault that has been answered right three times since retires itself');

  // Windows and demo rows.
  const old = { attempts: miss(4, { family: 'alkane', errorClass: 'wrong-locant', ts: NOW - 60 * DAY }) };
  ck(missedGroups(old, {}, NOW).length === 0, 'mistakes from two months ago are not this week’s business');
  const demo = { attempts: miss(6, { family: 'alkane', errorClass: 'wrong-locant', demo: true }) };
  ck(missedGroups(demo, {}, NOW).length === 0, 'demonstration data never fills the review board');

  // Naming-only builds do not review chemistry they have hidden.
  const rx = { attempts: miss(4, { category: 'pathway', family: 'ester', errorClass: 'dead-end' }) };
  ck(missedGroups(rx, { showReactions: false }, NOW).length === 0, 'a naming-only build reviews no reaction faults');
  ck(missedGroups(rx, { showReactions: true }, NOW).length === 1, 'and reviews them when reactions are on');

  const sum = reviewSummary({ attempts: [] }, {}, NOW);
  ck(sum.clear === true && sum.groups.length === 0, 'nothing to review is a state of its own, not an empty list');
}

console.log('=== spacing: practised now, not offered again immediately ===');
{
  const fresh = { misses: 5, lastTs: NOW };
  ck(!isDue(fresh, NOW), 'a fault missed moments ago is not due yet');
  ck(isDue({ misses: 5, lastTs: NOW - 2 * DAY }, NOW), 'and is due a day or two later');
  ck(reviewDueAt({ misses: 5, lastTs: NOW }) < reviewDueAt({ misses: 2, lastTs: NOW }), 'the worse the fault, the sooner it comes back');
}

console.log('=== the daily challenge asks only what has been taught ===');
{
  const view = { units: [{ id: 'u1', lessonList: [{ pool: [{ family: 'alkane' }, { family: 'alkene' }] }] }] };
  const none = metFamilies({ progress: { completedUnits: [] } }, view);
  ck(none.has('alkane') && none.size === 1, 'a brand-new learner is only ever asked alkanes');
  const some = metFamilies({ progress: { completedUnits: ['u1'] } }, view);
  ck(some.has('alkene'), 'a completed unit adds the families it taught');

  const picked = moleculeOfTheDay(NOW, DAILY_POOL, none);
  ck(picked && picked.family === 'alkane', `a beginner's molecule is an alkane (got ${picked && picked.family})`);
  ck(!!picked.work && picked.work.name === picked.name, 'and it still arrives with its derivation');

  // Determinism holds under gating.
  ck(moleculeOfTheDay(NOW, DAILY_POOL, none).name === moleculeOfTheDay(NOW + 3600000, DAILY_POOL, none).name, 'the day’s molecule is stable');
  ck(moleculeOfTheDay(NOW, DAILY_POOL, new Set(['nothing-like-this'])) === null, 'an impossible restriction yields nothing rather than an unfair question');

  // One attempt a day.
  const day = dayNumber(NOW);
  ck(dailyStatus({}, NOW).answered === false, 'an untouched day is unanswered');
  ck(dailyStatus({ dailyChallenge: { day, correct: true } }, NOW).correct === true, 'today’s result is remembered');
  ck(dailyStatus({ dailyChallenge: { day: day - 1, correct: true } }, NOW).answered === false, 'yesterday’s result does not close today');
}

console.log('=== notifications: opt-in, one a day, never a threat ===');
{
  const base = {
    settings: { notify: { enabled: true, hour: 17, minute: 0 } },
    lastActiveAt: NOW - 3 * DAY,
    notifyLog: { lastTs: 0 },
  };
  ck(DEFAULT_NOTIFY.enabled === false, 'notifications are off until asked for');
  ck(planNotification({ state: { ...base, settings: { notify: { enabled: false } } }, now: NOW }) === null, 'switched off means silence');
  ck(planNotification({ state: { ...base, lastActiveAt: NOW - 1000 }, now: NOW }) === null, 'someone who studied an hour ago is not reminded to study');
  ck(planNotification({ state: { ...base, notifyLog: { lastTs: NOW - 3600000 } }, now: NOW }) === null, 'at most one message a day');

  const due = planNotification({ state: base, review: { due: [{ label: 'Numbering and locants', family: 'alkene' }] }, now: NOW });
  ck(due && due.id === 'review-due', 'something specific due outranks everything');
  ck(/numbering/i.test(due.body) && /alkene/i.test(due.body), 'and the message names it');

  const daily = planNotification({ state: base, review: { due: [] }, daily: { name: 'hexane', family: 'alkane', answered: false }, now: NOW });
  ck(daily && daily.id === 'daily-molecule', 'otherwise the daily molecule invites');
  // An answered daily with nothing else to say is silence — three days away
  // is not long enough to earn a welcome-back.
  ck(planNotification({ state: base, review: { due: [] }, daily: { name: 'hexane', answered: true }, now: NOW }) === null, 'an answered daily does not nag again');
  const backAfterAges = planNotification({ state: { ...base, lastActiveAt: NOW - 10 * DAY }, review: { due: [] }, daily: { name: 'hexane', answered: true }, now: NOW });
  ck(backAfterAges && backAfterAges.id === 'welcome-back', 'a fortnight away earns one gentle note');
  ck(/still secured/.test(backAfterAges.body), 'which reassures rather than scolds');

  // The rule that matters: nothing may manufacture urgency.
  const all = [due, daily, backAfterAges].filter(Boolean);
  for (const m of all) {
    for (const bad of FORBIDDEN) {
      ck(!bad.test(`${m.title} ${m.body}`), `"${m.id}" says nothing matching ${bad}`);
    }
  }
  ck(all.every((m) => !/!{1,}/.test(m.title)), 'no exclamation marks shouting from the lock screen');

  const t = nextFireTime({ hour: 17, minute: 0 }, NOW);
  ck(t > NOW, 'the next fire time is always in the future');
  ck(new Date(t).getHours() === 17, 'and at the hour chosen, in local time');
}



console.log(fails ? `\n${fails} FAILED\n` : '\nreview is honest, the challenge is fair, and the lock screen never threatens\n');
process.exit(fails ? 1 : 0);
