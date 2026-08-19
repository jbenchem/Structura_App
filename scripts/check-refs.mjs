#!/usr/bin/env node
// Guards the failure mode where a string replacement silently misses and
// leaves valid code referencing something that no longer exists — invisible
// to a syntax check and to bundling, but fatal at render.
//
// Two checks:
//   1. identifiers used in a file that a sibling module exports but this
//      file never imports (catches bare reads like TEMPLATES.find)
//   2. props passed to a local component that the component never declares
//
// Run: node scripts/check-refs.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['src/sandbox'];
let bad = 0;

for (const DIR of DIRS) {
  if (!existsSync(DIR)) continue;
  const files = readdirSync(DIR).filter((f) => f.endsWith('.js'));

  const exports = new Map();
  for (const f of files) {
    const src = readFileSync(join(DIR, f), 'utf8');
    for (const m of src.matchAll(/^\s*export\s+(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm))
      exports.set(m[1], f);
  }

  for (const f of files) {
    const src = readFileSync(join(DIR, f), 'utf8');
    const imported = new Set();
    for (const m of src.matchAll(/import[^;]*?\{([^}]*)\}\s*from/g))
      m[1].split(',').forEach((s) => imported.add(s.trim().split(/\s+as\s+/).pop()));
    const local = new Set();
    for (const m of src.matchAll(/(?:^|[\s,;(])(?:export\s+)?(?:function|const|let|var|class)?\s*([A-Za-z_$][\w$]*)\s*=[^=>]/g))
      local.add(m[1]);
    for (const m of src.matchAll(/(?:^|\s)(?:export\s+)?function\s+([A-Za-z_$][\w$]*)/g)) local.add(m[1]);

    const code = src
      .replace(/^import[\s\S]*?;$/gm, '')
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    const missing = [];
    for (const [name, from] of exports) {
      if (from === f || imported.has(name) || local.has(name)) continue;
      if (new RegExp(`(?<![.\\w$])${name}(?![\\w$])`).test(code)) missing.push(`${name} (exported by ${from})`);
    }
    if (missing.length) {
      bad++;
      console.log(`✗ ${join(DIR, f)}`);
      missing.forEach((m) => console.log(`    missing import: ${m}`));
    }
  }
}

// hook check: every useX() called must be imported or locally defined.
// A missing hook import is invisible to bundling (it compiles to a bare
// global) and only fails at render — "Property 'useRef' doesn't exist".
for (const DIR of DIRS) {
  if (!existsSync(DIR)) continue;
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.js'))) {
    const file = join(DIR, f);
    const src = readFileSync(file, 'utf8');
    const avail = new Set();
    for (const m of src.matchAll(/import[^;]*?\{([^}]*)\}\s*from/g))
      m[1].split(',').forEach((x) => avail.add(x.trim().split(/\s+as\s+/).pop()));
    for (const m of src.matchAll(/(?:function|const|let|var)\s+(use[A-Z][\w$]*)/g)) avail.add(m[1]);
    const body = src.replace(/^import[\s\S]*?;$/gm, '');
    const missingHooks = new Set();
    for (const m of body.matchAll(/(?<![.\w$])(use[A-Z][\w$]*)\s*\(/g))
      if (!avail.has(m[1])) missingHooks.add(m[1]);
    if (missingHooks.size) {
      bad++;
      console.log(`✗ ${file}`);
      missingHooks.forEach((h) => console.log(`    hook used but not imported: ${h}`));
    }
  }
}

// prop check
const COMPONENTS = {
  SandboxCanvas: 'src/sandbox/SandboxCanvas.js',
  StaticMol: 'src/sandbox/render.js',
  TappableName: 'src/sandbox/TappableName.js',
  RingIcon: 'src/sandbox/render.js',
  BondShape: 'src/sandbox/render.js',
  AtomLabel: 'src/sandbox/render.js',
  DrawView: 'src/sandbox/DrawView.js',
  LookupView: 'src/sandbox/LookupView.js',
};
const CALLERS = [
  'src/sandbox/DrawView.js',
  'src/sandbox/LookupView.js',
  'src/sandbox/SandboxCanvas.js',
  'src/sandbox/render.js',
  'src/screens/main/Sandbox.js',
];
const declaredProps = (file, name) => {
  if (!existsSync(file)) return null;
  const m = readFileSync(file, 'utf8').match(new RegExp(`function\\s+${name}\\s*\\(\\s*\\{([\\s\\S]*?)\\}\\s*\\)`));
  return m ? new Set(m[1].split(',').map((s) => s.trim().split(/[:=\s]/)[0]).filter(Boolean)) : null;
};
for (const caller of CALLERS) {
  if (!existsSync(caller)) continue;
  const src = readFileSync(caller, 'utf8');
  for (const [name, file] of Object.entries(COMPONENTS)) {
    const decl = declaredProps(file, name);
    if (!decl) continue;
    for (const m of src.matchAll(new RegExp(`<${name}\\b([\\s\\S]*?)/>`, 'g'))) {
      const unknown = [...m[1].matchAll(/(?:^|\s)([a-zA-Z_$][\w$]*)\s*=/g)]
        .map((x) => x[1])
        .filter((p) => !decl.has(p) && p !== 'key' && p !== 'ref');
      if (unknown.length) {
        bad++;
        console.log(`✗ ${caller}: <${name}> receives undeclared prop(s): ${unknown.join(', ')}`);
      }
    }
  }
}


// ── React hooks ──────────────────────────────────────────────
// A hook used but not imported is invisible to bundling and to the
// export check above (it resolves against 'react', which exists) —
// it only fails at render: "Property 'useRef' doesn't exist".
const HOOK_FILES = [];
for (const DIR of [...DIRS, 'src/screens/main', 'src/components', 'src/components/canvas']) {
  if (!existsSync(DIR)) continue;
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.js'))) HOOK_FILES.push(join(DIR, f));
}
const APP_HOOKS = /^(useWindowDimensions|useSafeAreaInsets|useColorScheme)$/;
for (const file of HOOK_FILES) {
  const src = readFileSync(file, 'utf8');
  // A hook may come from 'react' or from one of our own modules
  // (useViewport, useEntitlement…), so accept any named import.
  const importedHooks = new Set();
  for (const m of src.matchAll(/import[^;]*?\{([^}]*)\}\s*from/g))
    m[1].split(',').forEach((x) => importedHooks.add(x.trim().split(/\s+as\s+/).pop()));
  const namespaced = /import\s+\*\s+as\s+React/.test(src);
  const body = src.replace(/^import[\s\S]*?;$/gm, '');
  const used = new Set([...body.matchAll(/(?<![.\w$])(use[A-Z][A-Za-z]*)\s*\(/g)].map((x) => x[1]));
  const missing = [...used].filter(
    (h) => !importedHooks.has(h) && !APP_HOOKS.test(h) && !namespaced &&
           !new RegExp(`(?:function|const)\\s+${h}\\b`).test(src)
  );
  if (missing.length) {
    bad++;
    console.log(`✗ ${file}: React hook(s) used but not imported: ${missing.join(', ')}`);
  }
}

/* ── Undeclared state setters ─────────────────────────────────
   A setter left behind when its useState is deleted throws only when the
   handler runs, so it survives every render check and reaches the user as a
   crash on tap. That is exactly how a stale `setSaved` shipped.

   The rule: if every appearance of `setXxx` in a file is a call, nothing ever
   declared it. A real setter also appears in its useState pair, a parameter
   list, or a destructuring. */
{
  // walk every source file, not just one directory
  const allFiles = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'engine') continue;
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.js')) allFiles.push(full);
    }
  };
  walk('src');

  let bad = 0;
  for (const file of allFiles) {
    const src = readFileSync(file, 'utf8');
    // Globals and object methods are not local declarations and never will be.
    const NOT_STATE = new Set(['setTimeout', 'setInterval', 'setItem', 'setImmediate']);
    const names = [...new Set([...src.matchAll(/\b(set[A-Z]\w*)\b/g)].map((m) => m[1]))]
      .filter((n) => !NOT_STATE.has(n))
      // `x.setThing()` is a method call, not a bare identifier
      .filter((n) => !new RegExp(`\\.\\s*${n}\\s*\\(`).test(src));
    for (const name of names) {
      const all = (src.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
      // `function setX(` is a declaration, not a call — counting it as one
      // made every exported setter look undeclared.
      const calls = (src.match(new RegExp(`(?<!function\\s)\\b${name}\\s*\\(`, 'g')) || []).length;
      if (all > 0 && all === calls) {
        console.log(`✗ ${file}: calls ${name}() but never declares it`);
        bad++;
      }
    }
  }
  if (bad) { console.log(`\n${bad} undeclared setter(s)`); process.exit(1); }
}

console.log(bad ? `\n${bad} reference problem(s)` : '✓ all references, props and hooks resolve');
process.exit(bad ? 1 : 0);
