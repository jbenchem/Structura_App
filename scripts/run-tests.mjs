#!/usr/bin/env node
// Test runner.
//
// Suites import app source directly. Node's ESM/CJS resolution of
// extensionless relative imports varies by version, so each suite is
// bundled with esbuild first (esbuild resolves them the same way Metro
// does) and then run. Keeps the source free of test-only concessions.

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '.test-build');

// Every module the app imports that has no place in a headless run. Kept in
// one place: suites were carrying partial copies, so adding an import to a
// component broke whichever suite happened to lack that stub.
const STUBS = {
  react: './tests/stubs/react.js',
  'react-native': './tests/stubs/react-native.js',
  'react-native-svg': './tests/stubs/react-native-svg.js',
  '@expo/vector-icons': './tests/stubs/vector-icons.js',
  'expo-haptics': './tests/stubs/expo-haptics.js',
  '@react-native-async-storage/async-storage': './tests/stubs/async-storage.js',
  'react-native-safe-area-context': './tests/stubs/safe-area.js',
  'expo-speech': './tests/stubs/expo-speech.js',
};

const SUITES = [
  { name: 'engine (vendored, 699 tests)', entry: 'src/engine/test.mjs' },
  { name: 'curriculum', entry: 'tests/curriculum.test.mjs' },
  { name: 'bridge', entry: 'tests/bridge.test.mjs' },
  { name: 'sandbox', entry: 'tests/sandbox.test.mjs' },
  { name: 'sandbox layout (ported)', entry: 'tests/sandbox-layout.test.mjs' },
  { name: 'authoring guide samples', entry: 'tests/authoring-doc.test.mjs' },
  { name: 'question pools (every generated answer)', entry: 'tests/question-pools.test.mjs' },
  { name: 'prerequisites (nothing untaught)', entry: 'tests/prerequisites.test.mjs' },
  { name: 'sampling (short runs stay representative)', entry: 'tests/sampling.test.mjs' },
  { name: 'lesson results + categories', entry: 'tests/lesson-results.test.mjs' },
  {
    name: 'attempt log (what went wrong)',
    entry: 'tests/attempt-log.test.mjs',
    alias: STUBS,
  },
  {
    name: 'focused practice (recommendation leads somewhere)',
    entry: 'tests/focused-practice.test.mjs',
    alias: STUBS,
  },
  {
    name: 'recommendation + trend + timing',
    entry: 'tests/recommendation.test.mjs',
    alias: STUBS,
  },
  { name: 'subcategories (skill x family)', entry: 'tests/subcategories.test.mjs' },
  { name: 'distractors', entry: 'tests/distractors.test.mjs' },
  { name: 'interactive builders', entry: 'tests/interactive-builders.test.mjs' },
  {
    name: 'interactives (numbering, swap, priority, flip)',
    entry: 'tests/interactives.test.mjs',
    alias: STUBS,
  },
  { name: 'valid structures', entry: 'tests/valid-structures.test.mjs' },
  { name: 'engine: rings in substituents', entry: 'tests/engine-rings.test.mjs' },
  { name: 'engine: group shorthand ids', entry: 'tests/engine-sugar.test.mjs' },
  { name: 'verified naming (refuse over guess)', entry: 'tests/verified-name.test.mjs' },
  { name: 'chain layout (120 degree)', entry: 'tests/prettify.test.mjs' },
  { name: 'progression + checkpoints', entry: 'tests/progression.test.mjs' },
  { name: 'section transition', entry: 'tests/transition.test.mjs' },
  { name: 'structure geometry (nothing deformed)', entry: 'tests/geometry.test.mjs' },
  {
    name: 'canvas hydrogens',
    entry: 'tests/canvas-hydrogens.test.mjs',
    alias: STUBS,
  },
  {
    name: 'canvas controls',
    entry: 'tests/canvas-controls.test.mjs',
    alias: STUBS,
  },
  {
    name: 'layout invariants',
    entry: 'tests/layout-invariants.test.mjs',
    alias: STUBS,
  },
  {
    name: 'lesson row layout',
    entry: 'tests/lesson-row.test.mjs',
    alias: STUBS,
  },
  {
    name: 'review mistakes (read-only)',
    entry: 'tests/review.test.mjs',
    alias: STUBS,
  },
  {
    name: 'results screen fits',
    entry: 'tests/results-fit.test.mjs',
    alias: STUBS,
  },
  {
    name: 'methane (visible, never drawn)',
    entry: 'tests/methane.test.mjs',
    alias: STUBS,
  },
  {
    name: 'atom labels',
    entry: 'tests/atom-labels.test.mjs',
    alias: STUBS,
  },
  { name: 'formula subscripts', entry: 'tests/formula.test.mjs' },
  { name: 'questions fit the screen', entry: 'tests/question-fit.test.mjs' },
  { name: 'nomenclature reference', entry: 'tests/reference.test.mjs' },
  { name: 'periodic table', entry: 'tests/periodic.test.mjs' },
  { name: 'display hydrogens (cis/trans)', entry: 'tests/display-hydrogens.test.mjs' },
  { name: 'content formulas', entry: 'tests/content-formula.test.mjs' },
  { name: 'no Modal (device frame integrity)', entry: 'tests/no-modal.test.mjs' },
  {
    name: 'lesson steps (every step actually renders)',
    entry: 'tests/lesson-steps.test.mjs',
    alias: STUBS,
  },
  {
    name: 'screens mount (every top-level screen)',
    entry: 'tests/screens.test.mjs',
    alias: STUBS,
  },
  {
    name: 'beta access (nothing locked)',
    entry: 'tests/beta-access.test.mjs',
    alias: STUBS,
  },
  {
    name: 'render smoke (components actually run)',
    entry: 'tests/render-smoke.test.mjs',
    alias: STUBS,
  },
  {
    name: 'error boundary + build config',
    entry: 'tests/error-boundary.test.mjs',
    alias: STUBS,
  },
  { name: 'isomer enumeration', entry: 'tests/isomers.test.mjs' },
  {
    name: 'glossary terms + four options + answer spacing',
    entry: 'tests/glossary.test.mjs',
    alias: STUBS,
  },
  {
    name: 'hero decision (Home has an opinion, safely)',
    entry: 'tests/hero-decision.test.mjs',
    alias: STUBS,
  },
  {
    name: 'learn terrain (the metro holds in both worlds)',
    entry: 'tests/learn-terrain.test.mjs',
    alias: STUBS,
  },
  {
    name: 'reactions (real, balanced, and what they claim to be)',
    entry: 'tests/reactions.test.mjs',
    alias: STUBS,
  },
  {
    name: 'branch geometry (the structure never folds in on itself)',
    entry: 'tests/branch-geometry.test.mjs',
    alias: STUBS,
  },
  {
    name: 'read aloud (every word maps to a sound)',
    entry: 'tests/read-aloud.test.mjs',
    alias: STUBS,
  },
  {
    name: 'celebration (fireworks stay on screen)',
    entry: 'tests/celebration.test.mjs',
    alias: STUBS,
  },
  {
    name: 'tour (every step points at something real)',
    entry: 'tests/tour.test.mjs',
    alias: STUBS,
  },
];

let esbuild;
try {
  esbuild = (await import('esbuild')).default ?? (await import('esbuild'));
} catch {
  console.error(
    'esbuild is required to run the suites.\n' +
      'Install dev dependencies first:  npm install\n'
  );
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Static reference check first — it catches problems bundling cannot see.
{
  const r = spawnSync(process.execPath, [join(root, 'scripts/check-refs.mjs')], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('\nReference check failed — fix before running the suites.\n');
    process.exit(1);
  }
}

let failed = 0;
/* Every test file must be registered.

   Two suites were written, packaged and shipped without ever running, because
   the edit that was meant to add them to this list silently did not match. A
   test that does not run is worse than no test: it reads as coverage. */
{
  const onDisk = readdirSync('tests').filter((f) => f.endsWith('.test.mjs'));
  const registered = new Set(SUITES.map((x) => x.entry.replace('tests/', '')));
  const orphans = onDisk.filter((f) => !registered.has(f));
  if (orphans.length) {
    console.error(`\n✗ ${orphans.length} test file(s) exist but are not registered:`);
    orphans.forEach((f) => console.error(`   tests/${f}`));
    console.error('');
    process.exit(1);
  }
}

for (const suite of SUITES) {
  const entry = join(root, suite.entry);
  if (!existsSync(entry)) {
    console.error(`\n✗ ${suite.name}: missing ${suite.entry}`);
    failed++;
    continue;
  }
  const outfile = join(outDir, suite.entry.replace(/[\/.]/g, '_') + '.mjs');

  try {
    await esbuild.build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      logLevel: 'error',
      loader: { '.js': 'jsx' },
      jsx: 'transform',
      ...(suite.alias ? { alias: suite.alias } : {}),
    });
  } catch (e) {
    console.error(`\n✗ ${suite.name}: build failed`);
    failed++;
    continue;
  }

  console.log(`\n── ${suite.name} ${'─'.repeat(Math.max(0, 46 - suite.name.length))}`);
  const run = spawnSync(process.execPath, [outfile], { stdio: 'inherit' });
  if (run.status !== 0) failed++;
}

rmSync(outDir, { recursive: true, force: true });

console.log(
  failed ? `\n${failed} suite(s) FAILED\n` : `\nAll ${SUITES.length} suites passed\n`
);
process.exit(failed ? 1 : 0);
