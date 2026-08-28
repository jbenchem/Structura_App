// During the beta, nothing is locked.
//
// A tester was invited to evaluate the whole app. If a paywall appeared on day
// 8 of a seven-day trial, their feedback would be about the paywall — and the
// features behind it (the sandbox, the analytics) are the ones most worth
// hearing about.
import {
  isPremiumActive, BETA_ALL_ACCESS, PREMIUM_FEATURES,
  ACCESS_CODES, STORAGE_KEY, LEGACY_STORAGE_KEYS, loadPersistedState,
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

console.log(fails ? `\n${fails} FAILED\n` : '\naccess is open, and the rename is invisible to testers\n');
process.exit(fails ? 1 : 0);