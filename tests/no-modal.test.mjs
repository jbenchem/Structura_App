// Guard: React Native <Modal> renders outside the app tree, which on web
// escapes the device frame. Nothing in the app may use it.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? (f === 'engine' ? [] : walk(p)) : p.endsWith('.js') ? [p] : [];
});
const offenders = [];
for (const f of ['App.js', ...walk('src')]) {
  const src = readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  if (/import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*['"]react-native['"]/.test(src)) offenders.push(f);
  if (/<Modal[\s>]/.test(src)) offenders.push(f + ' (uses <Modal>)');
}
if (offenders.length) {
  console.error('Modal used — this breaks the web device frame:\n  ' + offenders.join('\n  '));
  process.exit(1);
}
console.log('no React Native Modal in the app tree');
