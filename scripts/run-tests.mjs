#!/usr/bin/env node
// Test runner.
//
// Suites import app source directly. Node's ESM/CJS resolution of
// extensionless relative imports varies by version, so each suite is
// bundled with esbuild first (esbuild resolves them the same way Metro
// does) and then run. Keeps the source free of test-only concessions.

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
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
  { name: 'retry queue', entry: 'tests/retry-queue.test.mjs' },
  { name: 'progression + checkpoints', entry: 'tests/progression.test.mjs' },
  { name: 'section transition', entry: 'tests/transition.test.mjs' },
  { name: 'structure geometry (nothing deformed)', entry: 'tests/geometry.test.mjs' },
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
    name: 'render smoke (components actually run)',
    entry: 'tests/render-smoke.test.mjs',
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
