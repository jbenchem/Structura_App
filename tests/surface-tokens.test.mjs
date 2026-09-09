// ─────────────────────────────────────────────────────────────
// Surface unification — the guard.
//
// Every rounded surface in the app uses a named radius, the shared Card
// carries the app's 1.5 outline weight, and the named surfaces in the theme
// are the only place those decisions live. A screen that invents a new
// radius fails the build, which is how "designed by one person on
// different days" stops happening.
// ─────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { R, S, C, SEMANTIC } from '../src/theme.js';
import { GOLD } from '../src/components/AccuracyRing.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const walk = (dir, out = []) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
};
const files = [...walk('src/screens'), ...walk('src/sandbox'), ...walk('src/components')];
const strip = (s) => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

console.log('=== the radius scale is closed ===');
{
  ck(R.xs === 6 && R.sm === 10 && R.md === 14 && R.lg === 18 && R.xl === 24 && R.pill === 999, 'six named radii, in order');
  let offenders = [];
  for (const f of files) {
    const src = strip(readFileSync(f, 'utf8'));
    // Literal radii of 6 or more are surfaces and must be tokens; ≤5 are
    // hairlines (bar ends, dividers) and may stay literal.
    for (const m of src.matchAll(/border(?:Top(?:Left|Right))?Radius:\s*(\d+)/g)) {
      if (Number(m[1]) >= 6) offenders.push(`${f}: ${m[1]}`);
    }
  }
  ck(offenders.length === 0, `no screen invents a surface radius (${offenders.slice(0, 3).join('; ') || 'none'})`);
}

console.log('=== the outline weight is one weight ===');
{
  ck(S.card.borderWidth === 1.5 && S.row.borderWidth === 1.5 && S.chip.borderWidth === 1.5, 'named surfaces share the 1.5 outline');
  const ui = strip(readFileSync('src/components/ui.js', 'utf8'));
  ck(/card:\s*\{\s*\.\.\.S\.card/.test(ui), 'the shared Card spreads the named surface rather than restating it');
  ck(!/borderWidth:\s*1,/.test(ui.slice(ui.indexOf('card:'), ui.indexOf('card:') + 200)), 'and no longer carries the lighter 1px border that made it look different from every screen');
}

console.log('=== every rounded surface carries the one outline weight ===');
{
  // A style block that has a tokenised radius AND a border is a surface; a
  // surface with a 1px or 1.2px border is the old drift, and fails.
  let light = [];
  for (const f of files) {
    const src = strip(readFileSync(f, 'utf8'));
    for (const m of src.matchAll(/\{[^{}]*\}/g)) {
      const block = m[0];
      if (/borderRadius:\s*R\./.test(block) && /borderWidth:\s*1(\.2)?[,\s}]/.test(block)) light.push(f);
    }
  }
  ck(light.length === 0, `no rounded surface has a lighter-than-1.5 outline (${[...new Set(light)].slice(0, 3).join('; ') || 'none'})`);
}

console.log('=== one icon family ===');
{
  let mixed = [];
  for (const f of files) {
    if (/MaterialCommunityIcons|MaterialIcons|FontAwesome|Feather/.test(readFileSync(f, 'utf8'))) mixed.push(f);
  }
  ck(mixed.length === 0, `every screen draws from Ionicons alone (${mixed.slice(0, 3).join('; ') || 'none'})`);
}

console.log('=== named surfaces are the vocabulary ===');
{
  for (const k of ['card', 'cardSoft', 'row', 'pill', 'chip', 'sheet']) ck(!!S[k], `S.${k} exists`);
  ck(S.card.borderRadius === R.lg && S.row.borderRadius === R.md && S.pill.borderRadius === R.pill, 'cards are lg, rows md, pills pill');
  ck(S.cardSoft.backgroundColor === C.tealSoft, 'the soft card is the teal surface, one place');
}

console.log('=== gold means one thing ===');
{
  const canvasInks = [SEMANTIC.near, SEMANTIC.nearSoft, SEMANTIC.miss, SEMANTIC.missSoft];
  ck(!canvasInks.map((c) => c.toLowerCase()).includes(GOLD.toLowerCase()), 'canvas feedback never uses the flawless gold');
  // Hue distance in the most naive sense: the puzzle amber must not be a
  // near-copy of gold either. Compare the red/green ratio.
  const rg = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) / (((n >> 8) & 255) || 1); };
  ck(Math.abs(rg(SEMANTIC.near) - rg(GOLD)) > 0.05 || SEMANTIC.near !== GOLD, 'and its amber is a distinct colour, not a re-spelling');
  const render = strip(readFileSync('src/sandbox/render.js', 'utf8'));
  ck(/near:\s*SEMANTIC\.near\b/.test(render) && /miss:\s*SEMANTIC\.miss\b/.test(render), 'the canvas takes its near/miss from the legend, not from a literal');
  ck(!/#C9911F/i.test(render), 'and no literal gold hides in the renderer');
  const theme = readFileSync('src/theme.js', 'utf8');
  ck(/gold\s+a flawless run/.test(theme) && /near \/ miss\s+canvas feedback/.test(theme), 'the legend is written down in the theme, where the next colour will be looked up');
}

console.log('=== every decorative animation asks the one reduced-motion hook ===');
{
  const hook = readFileSync('src/components/useReducedMotion.js', 'utf8');
  ck(/export function useReducedMotion/.test(hook) && /reduceMotionChanged/.test(hook), 'the shared hook exists and subscribes to changes');
  for (const [f, needle] of [
    ['src/screens/main/QuestionViews.js', 'MiniBurst'],
    ['src/screens/main/QuestionViews.js', 'StreakPill'],
    ['src/screens/main/QuestionViews.js', 'function Verdict'],
    ['src/components/Fireworks.js', 'export function Fireworks'],
    ['src/components/mascot/CatalystMascot.js', 'export function CatalystMascot'],
  ]) {
    const src = strip(readFileSync(f, 'utf8'));
    const at = src.indexOf(needle);
    const body = src.slice(at, at + 1400);
    ck(/useReducedMotion\(\)/.test(body), `${needle} asks the hook`);
  }
  // No component defines its own copy any more.
  const own = files.filter((f) => f !== 'src/components/useReducedMotion.js' && /function useReducedMotion\s*\(/.test(readFileSync(f, 'utf8')));
  ck(own.length === 0, `no second implementation exists (${own.join('; ') || 'none'})`);
  // Fireworks draws nothing under reduced motion but still completes.
  const fw = strip(readFileSync('src/components/Fireworks.js', 'utf8'));
  ck(/if \(reduced\) return null;/.test(fw), 'fireworks draw nothing when motion is reduced');
  ck(fw.indexOf('if (reduced) return null;') > fw.indexOf('setTimeout(onDone'), 'but the completion timer is still scheduled first, so nothing waiting on them is stranded');
}


console.log(fails ? `\n${fails} FAILED\n` : '\none radius scale, one outline weight, one vocabulary\n');
process.exit(fails ? 1 : 0);
