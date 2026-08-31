// Glossary terms and the content rules that replaced shouting.
//
// Emphasis used to be capitals — "the MAIN GROUP of elements" — which raises
// the volume without adding meaning. A term is marked instead, and tapping it
// gives the definition where the reader already is.
import { readFileSync } from 'node:fs';
import { GLOSSARY, lookupTerm, TERM_PATTERN, PROMINENT_TIMES, shortDef } from '../src/content/glossary.js';
import { GlossaryText, stripTerms } from '../src/components/GlossaryText.js';
import { formatFormulas } from '../src/chem/formula.js';
import { STAGES } from '../src/content/curriculum.js';
import * as POOLS from '../src/content/pools.js';
import { spaceOutAnswers, answerTextOf } from '../src/content/questionFactory.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const allProse = () => {
  const out = [];
  for (const st of STAGES) for (const u of st.units) for (const l of u.lessons || []) for (const s of l.steps || []) {
    if (s.title) out.push(s.title);
    if (s.body) out.push(s.body);
    if (s.prompt) out.push(s.prompt);
    if (s.explain) out.push(s.explain);
    if (s.caption) out.push(s.caption);
  }
  return out;
};

console.log('=== every marked term resolves ===');
{
  let marks = 0, unresolved = 0;
  for (const text of allProse()) {
    const re = new RegExp(TERM_PATTERN.source, 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
      marks++;
      // group 1 is the quiet tilde; group 2 is the term key
      const key = m[2];
      if (!lookupTerm(key)) { console.error(`  FAIL: no entry for "${key}"`); unresolved++; fails++; }
    }
  }
  ck(unresolved === 0, `${marks} marked terms, all with definitions`);
  ck(marks > 40, `the feature is actually used (${marks} marks)`);
}

console.log('=== definitions are short enough to read in place ===');
for (const [key, g] of Object.entries(GLOSSARY)) {
  ck(g.def.length <= 240, `${key}: ${g.def.length} chars`);
  ck(!!g.term, `${key}: has a display term`);
}

console.log('=== no shouting left in the content ===');
{
  // Formulas and roman numerals are legitimate; four or more letters in a row
  // is emphasis.
  const OK = /^(CH|OH|NH|COOH|CHO|NO|IUPAC|VCE|UNI|DNA)/;
  let shouty = 0;
  for (const text of allProse()) {
    for (const w of text.match(/\b[A-Z]{4,}\b/g) || []) {
      if (OK.test(w)) continue;
      console.error(`  FAIL: "${w}" is still shouting`);
      shouty++; fails++;
    }
  }
  ck(shouty === 0, 'emphasis is carried by marked terms, not capitals');
}

console.log('=== skeleton is called skeletal form ===');
{
  let bad = 0;
  for (const text of allProse())
    if (/\bskeleton\b/i.test(text)) { console.error(`  FAIL: "skeleton" in: ${text.slice(0, 50)}`); bad++; fails++; }
  ck(bad === 0, 'the term is skeletal form throughout');
}

console.log('=== every multiple choice offers four ===');
{
  let t = 0, bad = 0;
  for (const st of STAGES) for (const u of st.units) for (const l of u.lessons || []) for (const s of l.steps || [])
    if (s.type === 'mc' && s.options) { t++; if (s.options.length !== 4) bad++; }
  ck(bad === 0, `${t} teaching questions, all with four options`);

  let p = 0, pbad = 0;
  for (const pool of Object.values(POOLS)) {
    if (!Array.isArray(pool)) continue;
    // build-a-name offers tiles rather than choices, so it is exempt
    for (const q of pool) if (q.options && q.type !== 'buildName') { p++; if (q.options.length !== 4) pbad++; }
  }
  ck(pbad === 0, `${p} pool questions, all with four options`);
}

console.log('=== the answer never repeats twice running ===');
{
  const q = (a) => ({ type: 'write', answer: a, id: a + Math.random() });
  const seq = spaceOutAnswers(['a', 'a', 'b', 'a', 'b', 'c'].map(q)).map(answerTextOf);
  let adjacent = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) adjacent++;
  ck(adjacent === 0, `reordered to ${seq.join(',')} with no repeats`);

  // and it must not drop anything to achieve that
  ck(spaceOutAnswers(['a', 'a', 'b'].map(q)).length === 3, 'no question is lost in the reorder');
  // where every answer is the same it gives up rather than looping
  ck(spaceOutAnswers(['a', 'a', 'a'].map(q)).length === 3, 'an unavoidable run is returned intact');
}

console.log('=== a marker can never reach the screen literally ===');
{
  // Markers appear in nine different fields, only one of which hosts a
  // definition bubble. Everything else funnels through formatFormulas, so the
  // strip happens there once rather than at thirty call sites that would
  // drift apart. Seeing "[[parent chain]]" on screen is the one outcome that
  // must never happen.
  const flat = (n) =>
    typeof n === 'string' ? n
    : Array.isArray(n) ? n.map(flat).join('')
    : n && n.props ? flat(n.props.children) : '';
  for (const [label, input, expected] of [
    ['a plain marker', 'a [[parent chain]] here', 'a parent chain here'],
    ['an aliased marker', 'in [[skeletal form|skeletal notation]]', 'in skeletal notation'],
    ['a quiet marker', 'again [[~carbonyl]] quietly', 'again carbonyl quietly'],
    ['no markers', 'nothing marked', 'nothing marked'],
  ]) {
    ck(flat(formatFormulas(input)) === expected, `${label} renders as "${flat(formatFormulas(input))}"`);
  }
  ck(stripTerms('a [[locant]] here') === 'a locant here', 'stripTerms agrees');
}

console.log('=== bubble definitions stay short enough to read in place ===');
{
  let long = 0;
  for (const [key, g] of Object.entries(GLOSSARY)) {
    const words = shortDef(g).split(/\s+/).length;
    if (!g.short) { console.error(`  FAIL: ${key} has no short form`); fails++; }
    else if (words > 11) { console.error(`  FAIL: ${key} is ${words} words`); long++; fails++; }
  }
  ck(long === 0, 'every bubble definition is around ten words or fewer');
}

console.log('=== markers never leak into structural fields ===');
{
  // A marker in `type` or `id` is not a cosmetic problem: the app switches on
  // those values, so the step silently stops rendering. This has happened
  // twice while transforming content in bulk.
  let leaked = 0;
  for (const st of STAGES) for (const u of st.units) for (const l of u.lessons || []) for (const step of l.steps || []) {
    for (const f of ['type', 'id', 'chip']) {
      if (typeof step[f] === 'string' && step[f].includes('[[')) {
        console.error(`  FAIL: ${l.id} has a marker in "${f}": ${step[f]}`);
        leaked++; fails++;
      }
    }
    if (Array.isArray(step.teaches) && step.teaches.some((t) => String(t).includes('[[')))
      { console.error(`  FAIL: ${l.id} has a marker in a step teaches`); leaked++; fails++; }
  }
  // teaches and topics are keys the app and the prerequisite checker match
  // on. A marker there is invisible until an ordering check mysteriously
  // fails, which is exactly how this was found.
  for (const st of STAGES) for (const u of st.units) {
    for (const arr of [u.topics]) if (Array.isArray(arr) && arr.some((t) => String(t).includes('[[')))
      { console.error(`  FAIL: unit ${u.n} has a marker in topics`); leaked++; fails++; }
    for (const l of u.lessons || []) {
      if (String(l.id).includes('[[') || String(u.id).includes('[['))
        { console.error('  FAIL: marker in a unit or lesson id'); leaked++; fails++; }
      if (Array.isArray(l.teaches) && l.teaches.some((t) => String(t).includes('[[')))
        { console.error(`  FAIL: ${l.id} has a marker in teaches`); leaked++; fails++; }
    }
  }
  ck(leaked === 0, 'markers appear only in prose, never in fields the app switches on');
}

console.log('=== a term stops shouting once you have met it ===');
{
  // Walk in teaching order and record, per term, how it appeared each time.
  const seen = new Map();
  const firstAppearance = new Map();
  for (const st of STAGES) for (const u of st.units) for (const l of u.lessons || []) for (const step of l.steps || [])
    for (const f of ['title', 'body', 'caption', 'explain', 'prompt']) {
      if (!step[f]) continue;
      for (const m of String(step[f]).matchAll(/\[\[(~?)([^\]|]+)/g)) {
        const k = m[2].trim();
        if (!seen.has(k)) { seen.set(k, []); firstAppearance.set(k, { unit: u.n, quiet: !!m[1] }); }
        seen.get(k).push(!m[1]);
      }
    }

  let loudTooOften = 0, quietTooSoon = 0;
  for (const [term, appearances] of seen) {
    const loud = appearances.filter(Boolean).length;
    if (loud > PROMINENT_TIMES) {
      console.error(`  FAIL: "${term}" is prominent ${loud} times`);
      loudTooOften++; fails++;
    }
    // the first appearances must be the prominent ones, not later ones
    const prefix = appearances.slice(0, Math.min(PROMINENT_TIMES, appearances.length));
    if (prefix.some((x) => !x)) {
      console.error(`  FAIL: "${term}" is quiet before it has been introduced`);
      quietTooSoon++; fails++;
    }
  }
  ck(loudTooOften === 0, `no term stays prominent beyond ${PROMINENT_TIMES} appearances`);
  ck(quietTooSoon === 0, 'every term is prominent where it is first met');

  const totals = [...seen.values()].reduce(
    (a, xs) => ({ loud: a.loud + xs.filter(Boolean).length, quiet: a.quiet + xs.filter((x) => !x).length }),
    { loud: 0, quiet: 0 }
  );
  ck(totals.quiet > totals.loud,
     `${totals.loud} prominent introductions against ${totals.quiet} quiet repeats`);
}

console.log('=== the renderer survives what content can throw at it ===');
{
  const noop = () => {};
  const deep = (node, d = 0) => {
    if (node == null || typeof node !== 'object' || d > 40) return;
    if (Array.isArray(node)) return node.forEach((n) => deep(n, d + 1));
    const { type, props } = node;
    if (typeof type === 'function') return deep(type(props || {}), d + 1);
    if (props && props.children != null) deep(props.children, d + 1);
  };
  const cases = [
    ['plain text', 'no terms here'],
    ['a marked term', 'the [[main group]] elements'],
    ['an aliased term', 'drawn in [[skeletal form|skeletal notation]]'],
    // An unknown term must render as text rather than crash: content can
    // always outrun the glossary, and a missing definition should degrade to
    // a plain word.
    ['an unknown term', 'a [[nonsense term]] here'],
    ['an empty string', ''],
    ['a quiet term', 'again in [[~skeletal form]] here'],
    ['a quiet aliased term', 'and [[~carbonyl|the carbonyl]] once more'],
  ];
  for (const [label, text] of cases) {
    try { deep(GlossaryText({ children: text, style: {} })); ck(true, label); }
    catch (e) { ck(false, `${label} — ${e.message}`); }
  }
}

console.log('=== smart text: elements and affixes, detected not authored ===');
{
  const { detectSmartTokens, tokenFor, anchorFor, elementInk } = await import('../src/components/referenceLink.js');
  const { LADDER } = await import('../src/content/reference.js');

  const parts = detectSmartTokens('The carbon holds an oxygen; the -ol becomes -oic acid.');
  const smart = parts.filter((p) => p.smart);
  ck(smart.length === 4, `four tokens in the sentence (got ${smart.length})`);
  ck(smart[0].smart.kind === 'element' && smart[0].smart.sym === 'C', 'carbon resolves to C');
  ck(smart[1].smart.sym === 'O', 'oxygen resolves to O');
  ck(smart[2].smart.kind === 'ladder' && smart[3].smart.kind === 'ladder', 'the affixes resolve to ladder rows');
  ck(smart[3].shown === '-oic acid', 'the longest affix wins over its prefix');
  ck(parts.map((p) => p.plain !== undefined ? p.plain : p.shown).join('') === 'The carbon holds an oxygen; the -ol becomes -oic acid.', 'nothing is lost or reordered');

  // Derived, not authored: every ladder row's suffix is a token, and every
  // element in the table is a token, without a list anyone maintains.
  ck(LADDER.every((g) => !g.suffix || tokenFor(g.suffix)), 'every ladder suffix detects');
  ck(tokenFor('bromine') && tokenFor('bromine').sym === 'Br', 'the halogens are in');
  ck(elementInk('O', 16) !== elementInk('N', 15) && elementInk('Br', 17) !== elementInk('C', 14), 'oxygen, nitrogen, halogens and carbon carry distinct inks');

  // Word boundaries: "carbonyl" is not "carbon", "alcohol" is not "-ol".
  ck(detectSmartTokens('the carbonyl of an alcohol').filter((p) => p.smart).length === 0, 'no matches inside longer words');

  // Anchors go somewhere real.
  const a = anchorFor(tokenFor('oxygen'));
  ck(a.tab === 'elements' && a.element === 'O', 'an element anchors the periodic table on itself');
  const b = anchorFor(tokenFor('-ol'));
  ck(b.tab === 'ladder' && LADDER.some((g) => g.rank === b.rank), 'an affix anchors the ladder on its row');

  // Marked glossary terms are never re-tokenised: GlossaryText splits on
  // markers first and only runs detection on plain runs. Source assertion.
  const src = readFileSync(new URL('../src/components/GlossaryText.js', import.meta.url), 'utf8');
  ck(/detectSmartTokens\(p\.plain\)/.test(src), 'detection runs on plain runs only, never inside a [[term]]');
}


console.log(fails ? `\n${fails} FAILURES` : '\nterms are explained, not shouted');
process.exit(fails ? 1 : 0);
