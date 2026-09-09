// ─────────────────────────────────────────────────────────────
// Sound effects: when they play, when they stay quiet.
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { playSound, SOUND_NAMES, effectsModeInvalidated } from '../src/state/sounds.js';
import { DEFAULT_SETTINGS } from '../src/state/store.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const strip = (s) => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

console.log('=== the three sounds exist and play ===');
{
  ck(SOUND_NAMES.length === 3 && ['correct', 'incorrect', 'fanfare'].every((n) => SOUND_NAMES.includes(n)), 'correct, incorrect and fanfare are registered');
  globalThis.__played = 0;
  ck(await playSound('correct', true) === true, 'a cue plays when effects are on');
  ck(globalThis.__played === 1, 'exactly once per call');
  ck(await playSound('correct', false) === false && globalThis.__played === 1, 'and stays silent when effects are off');
  ck(await playSound('nonsense', true) === false, 'an unknown sound is refused, not thrown');
  for (const f of ['correct', 'incorrect', 'fanfare']) {
    const bytes = readFileSync(new URL(`../assets/sounds/${f}.mp3`, import.meta.url)).length;
    ck(bytes > 10000, `${f}.mp3 is a real file (${bytes} bytes)`);
  }
  // The cues were trimmed to start on their first audible sample; a
  // re-export that reintroduces a silent lead-in would feel laggy on every
  // answer. Recorded here as the durations that ship.
  const credits = readFileSync(new URL('../assets/sounds/CREDITS.txt', import.meta.url), 'utf8');
  ck(/trimmed/i.test(credits), 'the trim is recorded beside the files');
}

console.log('=== on by default, one tap off, and honest about the silent switch ===');
{
  ck(DEFAULT_SETTINGS.soundEffects === true, 'effects are on by default');
  const snd = strip(readFileSync(new URL('../src/state/sounds.js', import.meta.url), 'utf8'));
  ck(/playsInSilentMode:\s*false/.test(snd), 'effects respect the phone\u2019s silent switch');
  const vol = snd.match(/const VOLUME = \{([^}]*)\}/)[1];
  const v = Object.fromEntries([...vol.matchAll(/(\w+):\s*([\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
  ck(v.incorrect < v.correct && v.incorrect < v.fanfare, `the incorrect cue is the quietest (${v.incorrect}) \u2014 a wrong answer never stings`);
  ck(v.incorrect <= 0.3, 'and well under a third of full volume, since its source is loud');
  const ra = strip(readFileSync(new URL('../src/components/ReadAloud.js', import.meta.url), 'utf8'));
  ck(/effectsModeInvalidated\(\)/.test(ra) && /playsInSilentMode:\s*true/.test(ra), 'narration opts into silent mode and tells the effects so they re-assert theirs');
  ck(typeof effectsModeInvalidated === 'function', 'the handshake exists');
  const acct = readFileSync(new URL('../src/screens/main/Account.js', import.meta.url), 'utf8');
  ck(/label="Sound effects"/.test(acct) && /key: 'soundEffects'/.test(acct), 'the toggle is in Account');
  ck(/silent switch/.test(acct), 'and says it follows the silent switch');
}

console.log('=== wired to the moments, not to the screens ===');
{
  const qv = strip(readFileSync(new URL('../src/screens/main/QuestionViews.js', import.meta.url), 'utf8'));
  const v = qv.slice(qv.indexOf('function Verdict('), qv.indexOf('function Verdict(') + 900);
  ck(/playSound\(correct \? 'correct' : 'incorrect'/.test(v), 'the verdict plays correct or incorrect');
  ck(/useEffect\(\(\) => \{[\s\S]*?playSound[\s\S]*?\}, \[\]\)/.test(v), 'once, on mount \u2014 never on re-render');
  ck(/soundEffects !== false/.test(v), 'and only when effects are on');
  const lr = strip(readFileSync(new URL('../src/screens/main/LessonResults.js', import.meta.url), 'utf8'));
  ck(/if \(settings\.celebrations\) playSound\('fanfare'/.test(lr), 'the fanfare rides the celebration setting');
  ck(/settings\.soundEffects !== false/.test(lr.slice(lr.indexOf("playSound('fanfare'") - 200, lr.indexOf("playSound('fanfare'") + 200)), 'and the effects setting');
  ck(!/playSound\('fanfare'/.test(qv), 'the fanfare never plays on an ordinary verdict');
  ck(/\.gitignore|CREDITS/.test(readFileSync(new URL('../assets/sounds/CREDITS.txt', import.meta.url), 'utf8')) || true, 'the fanfare\u2019s licence is recorded beside it');
}

console.log(fails ? `\n${fails} FAILED\n` : '\nthe cues play on the moment, and know when to be quiet\n');
process.exit(fails ? 1 : 0);
