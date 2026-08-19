// During the beta, nothing is locked.
//
// A tester was invited to evaluate the whole app. If a paywall appeared on day
// 8 of a seven-day trial, their feedback would be about the paywall — and the
// features behind it (the sandbox, the analytics) are the ones most worth
// hearing about.
import { isPremiumActive, BETA_ALL_ACCESS, PREMIUM_FEATURES } from '../src/state/store.js';

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

console.log(fails ? `\n${fails} FAILURES` : '\nno tester meets a paywall');
process.exit(fails ? 1 : 0);
