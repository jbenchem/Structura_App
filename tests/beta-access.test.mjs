// During the beta, nothing is locked.
//
// A tester was invited to evaluate the whole app. If a paywall appeared on day
// 8 of a seven-day trial, their feedback would be about the paywall — and the
// features behind it (the sandbox, the analytics) are the ones most worth
// hearing about.
import {
  isPremiumActive, BETA_ALL_ACCESS, PREMIUM_FEATURES,
  ACCESS_CODES, STORAGE_KEY, LEGACY_STORAGE_KEYS, loadPersistedState, purgePersistedState,
} from '../src/state/store.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

console.log('=== every entitlement state is premium during the beta ===');
if (BETA_ALL_ACCESS) {
  for (const [label, ent] of [
    ['a brand new install', { plan: 'free', premiumUntil: null }],
    ['an expired trial', { plan: 'trial', premiumUntil: Date.now() - 86400000 }],
    ['an expired code', { plan: 'code', premiumUntil: Date.now() - 1 }],
    ['no entitlement record', null],
    ['undefined', undefined],
  ]) {
    ck(isPremiumActive(ent) === true, `${label} → unlocked`);
  }
  ck(PREMIUM_FEATURES.has('sandbox'), 'the sandbox is still declared premium…');
  ck(isPremiumActive({ plan: 'free' }), '…and still reachable, because the flag is on');
} else {
  console.log('  (beta flag is off — normal gating applies)');
  ck(isPremiumActive({ plan: 'free' }) === false, 'a free plan is not premium');
  ck(isPremiumActive({ plan: 'trial', premiumUntil: Date.now() - 1 }) === false, 'an expired trial is not premium');
  ck(isPremiumActive({ plan: 'code', premiumUntil: Date.now() + 86400000 }) === true, 'a live code is premium');
}

console.log('=== the gating layer is not deleted, only bypassed ===');
ck(PREMIUM_FEATURES.size > 0, `${PREMIUM_FEATURES.size} features remain declared, so the flag can be flipped back`);
ck(typeof BETA_ALL_ACCESS === 'boolean', 'and the switch is a single boolean');


console.log('=== the Catalyst rename loses nobody\u2019s progress ===');
{
  // The storage key changed with the name. These tests are the promise that
  // update day is invisible: old data found, moved, and read exactly once.
  const mkStorage = () => {
    const mem = new Map();
    return {
      mem,
      getItem: async (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: async (k, v) => { mem.set(k, v); return null; },
      removeItem: async (k) => { mem.delete(k); return null; },
    };
  };
  const legacy = LEGACY_STORAGE_KEYS[0];
  const saved = JSON.stringify({
    streak: 7,
    entitlement: { plan: 'code', premiumUntil: Date.now() + 86400000 },
  });

  // A tester updating from the Structura build.
  const upgraded = mkStorage();
  upgraded.mem.set(legacy, saved);
  const raw1 = await loadPersistedState(upgraded);
  ck(raw1 === saved, 'legacy state is found and returned intact');
  ck(upgraded.mem.get(STORAGE_KEY) === saved, 'and re-saved under the Catalyst key');
  ck(!upgraded.mem.has(legacy), 'and the legacy key is REMOVED — a copy left behind is what let "reset" resurrect old data');
  ck(JSON.parse(raw1).entitlement.plan === 'code', 'the redeemed entitlement rides along');

  // A fresh install.
  const fresh = mkStorage();
  ck((await loadPersistedState(fresh)) === null, 'a fresh install hydrates empty, no error');

  // Someone already on the new key: the legacy key must not shadow it.
  const current = mkStorage();
  current.mem.set(STORAGE_KEY, '{"streak":9}');
  current.mem.set(legacy, '{"streak":1}');
  ck((await loadPersistedState(current)) === '{"streak":9}', 'the current key always wins over legacy');

  ck(STORAGE_KEY.startsWith('@catalyst/'), 'the live key carries the new name');

  // The reset-resurrection bug, as a test: both generations of key present,
  // purge, and nothing survives to hydrate from.
  const resetDevice = mkStorage();
  resetDevice.mem.set(STORAGE_KEY, saved);
  resetDevice.mem.set(legacy, saved);
  await purgePersistedState(resetDevice);
  ck(resetDevice.mem.size === 0, 'purge removes every generation of key at once');
  ck((await loadPersistedState(resetDevice)) === null, 'so a reset device hydrates as a brand new install');
}

console.log('=== printed access codes survive the rename ===');
{
  // Codes travel on paper. Both generations must grant, identically.
  for (const stem of ['BETA', 'TESTER']) {
    const neu = ACCESS_CODES[`CATALYST-${stem}`];
    const old = ACCESS_CODES[`STRUCTURA-${stem}`];
    ck(!!neu, `CATALYST-${stem} exists`);
    ck(!!old, `STRUCTURA-${stem} still exists for codes already handed out`);
    ck(neu && old && neu.days === old.days, `and both grant the same ${neu && neu.days} days`);
  }
}

console.log('=== practice topics unlock with the pathway ===');
{
  const { familyIntroUnits, classifyTopics } = await import('../src/state/practiceGating.js');
  const { UNITS } = await import('../src/content/content.js');
  const { practiceTopics } = await import('../src/content/questionFactory.js');
  const POOLS = await import('../src/content/pools.js');

  // The derived map covers reality: every family the Practice screen offers
  // has an intro unit somewhere in the course, and the order is the course's
  // order — alkanes are met before esters, esters before amides.
  const introOf = familyIntroUnits(UNITS);
  const offered = practiceTopics(POOLS).map((t) => t.id);
  const missing = offered.filter((f) => !introOf.has(f));
  ck(missing.length === 0, `every offered topic has an intro unit (missing: ${missing.join(', ') || 'none'})`);
  const idx = (f) => UNITS.findIndex((u) => u.id === introOf.get(f));
  ck(idx('alkane') === 0, 'alkanes are introduced by the very first unit');
  ck(idx('alkane') < idx('ester') && idx('ester') < idx('amide'), 'intro order follows the course order');

  // The rules, on a small fixture: three topics, one completed, one merely
  // unlocked, one locked.
  const ctx = (isPremium) => ({
    introOf: new Map([['a', 'u1'], ['b', 'u2'], ['c', 'u3']]),
    statusOf: (id) => (id === 'u3' ? 'locked' : 'unlocked'),
    completedUnits: ['u1'],
    isPremium,
  });
  const free = classifyTopics(['a', 'b', 'c'], ctx(false));
  ck(free.defaults.join(',') === 'a', 'completed topics start selected, for everyone');
  ck(free.access.c.locked && !free.access.c.selectable, 'a locked topic is greyed and unselectable for free users');
  ck(free.access.b.selectable && !free.access.b.completed, 'unlocked-but-unfinished stays selectable, just not preselected');
  ck(free.emptyMeans.join(',') === 'a,b', 'an empty selection for a free user means the unlocked topics only');

  const plus = classifyTopics(['a', 'b', 'c'], ctx(true));
  ck(plus.access.c.locked && plus.access.c.selectable, 'Plus sees the same grey but may select past it');
  ck(plus.defaults.join(',') === 'a', 'Plus gets the same completed-first default — entitlement changes reach, not recommendations');
  ck(plus.emptyMeans.length === 0, 'an empty selection for Plus means genuinely everything');
}


console.log(fails ? `\n${fails} FAILED\n` : '\naccess is open, and the rename is invisible to testers\n');
process.exit(fails ? 1 : 0);