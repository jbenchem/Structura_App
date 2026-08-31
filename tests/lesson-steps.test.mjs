// Renders EVERY authored step through the component the lesson player
// would use. A step that throws here is a white screen on the device.
import { readFileSync } from 'node:fs';
import { UNITS } from '../src/content/curriculum.js';
import { STAGES } from '../src/content/curriculum.js';
import {
  StructureToggle, CountAtoms, ElementExplorer, AlcoholBuilder, BranchBuilder,
  NumberingChooser, GroupSwapper, PriorityExplorer, StereoFlipper,
  IsomerCollector, RingExplorer, LocantCompare, BracketDecoder,
  ChainTracer, AlphaSorter, CarbonylSlider, SuffixTester, StepThrough, FormSlider,
} from '../src/screens/main/InteractiveSteps.js';
import { IsomerHunt } from '../src/screens/main/IsomerHunt.js';
import { ChainBuilder } from '../src/screens/main/ChainBuilder.js';
import { StaticMol } from '../src/sandbox/render.js';
import { LessonPlayer } from '../src/screens/main/LessonPlayer.js';
import { QuestionView } from '../src/screens/main/QuestionViews.js';
import { TeachStepProbe } from '../src/screens/main/LessonPlayer.js';
import { formatFormulas } from '../src/chem/formula.js';

let fails = 0;

// Calling a component only runs its own body. Child components are just
// objects until something renders them, so a crash inside BondShape or
// AtomLabel stays invisible. This walks the tree and calls every function
// component it finds, which is what makes a white screen reproducible here.
const nanProps = [];
function auditProps(type, props) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (k === 'children') continue;
    if (typeof v === 'number' && !isFinite(v)) nanProps.push(`<${type}> ${k}=${v}`);
    if (typeof v === 'string' && /NaN|Infinity/.test(v)) nanProps.push(`<${type}> ${k}="${v}"`);
  }
}

function deepRender(node, depth = 0) {
  if (node == null || typeof node !== 'object' || depth > 40) return;
  if (Array.isArray(node)) { node.forEach((n) => deepRender(n, depth + 1)); return; }
  const { type, props } = node;
  if (typeof type === 'function') {
    deepRender(type(props || {}), depth + 1);
    return;
  }
  auditProps(type, props);
  if (props && props.children) deepRender(props.children, depth + 1);
}

const run = (label, fn) => {
  nanProps.length = 0;
  try {
    deepRender(fn());
    if (nanProps.length) {
      console.error(`  FAIL ${label}: non-finite SVG attribute(s): ${nanProps.slice(0, 4).join(', ')}`);
      fails++;
      return;
    }
    console.log(`  ok   ${label}`);
  }
  catch (e) { console.error(`  FAIL ${label}: ${e.message}`); fails++; }
};


const authored = STAGES.flatMap((s) => s.units).filter((u) => u.lessons);
const noop = () => {};

for (const u of authored) {
  for (const l of u.lessons) {
    l.steps.forEach((step, i) => {
      const label = `${l.id} step ${i + 1} (${step.type})`;
      run(label, () => {
        if (step.type === 'toggle') return StructureToggle({ step, width: 360, onContinue: noop });
        if (step.type === 'count') return CountAtoms({ step, width: 360, onContinue: noop });
        if (step.type === 'build') return ChainBuilder({ step, width: 360, onContinue: noop });
        if (step.type === 'elements') return ElementExplorer({ step, width: 360, onContinue: noop });
        if (step.type === 'alcohol') return AlcoholBuilder({ step, width: 360, onContinue: noop });
        if (step.type === 'branch') return BranchBuilder({ step, width: 360, onContinue: noop });
        if (step.type === 'numbering') return NumberingChooser({ step, width: 360, onContinue: noop });
        if (step.type === 'swap') return GroupSwapper({ step, width: 360, onContinue: noop });
        if (step.type === 'priority') return PriorityExplorer({ step, width: 360, onContinue: noop });
        if (step.type === 'flip') return StereoFlipper({ step, width: 360, onContinue: noop });
        if (step.type === 'isomers') return IsomerCollector({ step, width: 360, onContinue: noop });
        if (step.type === 'ring') return RingExplorer({ step, width: 360, onContinue: noop });
        if (step.type === 'locants') return LocantCompare({ step, width: 360, onContinue: noop });
        if (step.type === 'brackets') return BracketDecoder({ step, width: 360, onContinue: noop });
        if (step.type === 'trace') return ChainTracer({ step, width: 360, onContinue: noop });
        if (step.type === 'sort') return AlphaSorter({ step, width: 360, onContinue: noop });
        if (step.type === 'slide') return CarbonylSlider({ step, width: 360, onContinue: noop });
        if (step.type === 'suffixtest') return SuffixTester({ step, width: 360, onContinue: noop });
        if (step.type === 'stepthrough') return StepThrough({ step, width: 360, onContinue: noop });
        if (step.type === 'isomerhunt') return IsomerHunt({ step, onContinue: noop });
        if (step.type === 'formslider') return FormSlider({ step, width: 360, onContinue: noop });
        if (step.mol) return StaticMol({ mol: step.mol, width: 300, showCarbons: !!step.showCarbons });
        if (step.target) return StaticMol({ mol: step.target, width: 300, showCarbons: false });
        return null;
      });
    });
  }
}

// Render the real LessonPlayer at every step index. This is what catches a
// variable used in one scope but declared in another — the component renders
// fine for a teach step and throws the moment an interactive step appears.
// Authored text must actually reach the rendered tree. A step whose caption
// or diagram flag is silently dropped by the renderer looks fine in every
// other check — it just quietly stops teaching what it was written to teach.
console.log('\n=== authored text reaches the screen ===');

function collectText(node, out = [], depth = 0) {
  if (node == null || depth > 40) return out;
  if (typeof node === 'string') { out.push(node); return out; }
  if (Array.isArray(node)) { node.forEach((n) => collectText(n, out, depth + 1)); return out; }
  if (typeof node !== 'object') return out;
  const { type, props } = node;
  if (typeof type === 'function') { collectText(type(props || {}), out, depth + 1); return out; }
  if (props && props.children != null) collectText(props.children, out, depth + 1);
  return out;
}

function findFlag(node, flag, depth = 0) {
  if (node == null || typeof node !== 'object' || depth > 40) return false;
  if (Array.isArray(node)) return node.some((n) => findFlag(n, flag, depth + 1));
  const { type, props } = node;
  if (props && props[flag] === true) return true;
  if (typeof type === 'function') return findFlag(type(props || {}), flag, depth + 1);
  return props && props.children != null ? findFlag(props.children, flag, depth + 1) : false;
}

for (const u of authored) {
  for (const l of u.lessons) {
    (l.steps || []).forEach((step, i) => {
      if (step.type !== 'teach') return;
      const tree = TeachStepProbe(step);
      // No [[glossary]] marker may reach the screen. They are meant to be
      // resolved — blue and tappable in body text, stripped to plain words
      // everywhere too small for a bubble. A field rendered without either
      // shows the brackets to the student, which is what titles, captions and
      // stage blurbs were doing across the app.
      run(`${l.id} step ${i + 1}: no raw [[marker]] on screen`, () => {
        const text = collectText(tree).join('');
        const m = /\[\[[^\]]*\]\]/.exec(text);
        if (m) throw new Error(`"${m[0]}" rendered literally`);
        return null;
      });

      if (step.caption) {
        run(`${l.id} step ${i + 1}: caption is rendered`, () => {
          // Joined with nothing rather than with a space: adjacent <Text>
          // nodes render contiguously, so that is what a reader sees. Lets
          // the WHOLE caption be asserted rather than its first eighteen
          // characters, which is the stronger check.
          const text = collectText(tree).join('');
          const want = formatFormulas(step.caption);
          if (!text.includes(want)) throw new Error(`caption missing: "${want.slice(0, 30)}…"`);
          return null;
        });
      }
      if (step.showCarbons) {
        run(`${l.id} step ${i + 1}: diagram shows every atom`, () => {
          if (!findFlag(tree, 'showCarbons')) throw new Error('showCarbons never reached StaticMol');
          return null;
        });
      }
    });
  }
}

console.log('\n=== lesson player at every step ===');
for (const u of authored) {
  for (const l of u.lessons) {
    l.steps.forEach((step, i) => {
      run(`${l.id} player at step ${i + 1} (${step.type})`, () => {
        globalThis.__stepIndex = i;
        return LessonPlayer({ unit: u, lesson: l, onFinish: noop, onExit: noop });
      });
    });
  }
}

// Every question in every pool must render through its view.
console.log('\n=== question views ===');
const seen = new Set();
for (const u of authored) {
  for (const l of u.lessons) {
    if (!l.pool) continue;
    for (const q of l.pool) {
      const key = `${l.id}:${q.type}`;
      if (seen.has(key)) continue;  // one of each type per lesson is enough
      seen.add(key);
      run(`${l.id} ${q.type} (${q.id})`, () =>
        QuestionView({ q, onDone: noop, last: false, width: 360 })
      );
    }
  }
}

// Pools must be attached and sized
console.log('\n=== pool wiring ===');
for (const u of authored) {
  for (const l of u.lessons) {
    if (!l.pool) continue;
    run(`${l.id} pool >= 30, ask 5-20`, () => {
      // fixed set: everyone sees all of it, so ask must equal the pool
      const fixed = l.pool.length <= 8;
      if (!fixed && l.pool.length < 30) throw new Error(`only ${l.pool.length}`);
      if (fixed && l.ask !== l.pool.length)
        throw new Error(`fixed set of ${l.pool.length} but asks ${l.ask}`);
      // How many are asked is a per-unit judgement — a short unit does not
      // need ten questions a lesson to prove the point — so the rule is a
      // sane range rather than a fixed count, with checkpoints asking more
      // than the lessons they can be taken instead of.
      const [lo, hi] = l.checkpoint ? [10, 20] : [5, 10];
      if (!fixed && (l.ask < lo || l.ask > hi))
        throw new Error(`ask=${l.ask}, expected ${lo}-${hi} for ${l.checkpoint ? 'a checkpoint' : 'a lesson'}`);
      return null;
    });
  }
}

console.log('=== sampling is genuinely random, and visibly so in dev ===');
{
  const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
  // Three draws from a real 30+ checkpoint pool. With 30-choose-15 draws in
  // shuffled order, three identical sequences do not happen by chance in
  // the lifetime of the universe — so if they match, the sampler is seeded
  // or broken, and this fails.
  const { sample } = await import('../src/content/questionFactory.js');
  const cpLesson = UNITS.flatMap((u) => u.lessonList || []).find(
    (l) => l.checkpoint && (l.pool || []).length >= 30
  );
  const draw = () => sample(cpLesson.pool, cpLesson.ask).map((q) => q.id).join('|');
  const a = draw(), b = draw(), c = draw();
  ck(!(a === b && b === c), 'three draws from a 30+ pool never repeat identically');

  // Each draw honours the ask. Answer spacing is tested on a fixture where
  // spacing is provably possible — the real spacer's contract is "gives up
  // quietly when the draw is unspaceable" (many BALANCE cards share H₂O),
  // and asserting zero on a random draw was a coin-flip test.
  const { answerTextOf, spaceOutAnswers } = await import('../src/content/questionFactory.js');
  const one = sample(cpLesson.pool, cpLesson.ask);
  ck(one.length === cpLesson.ask, `a draw is exactly ask (${cpLesson.ask}) questions`);
  const fx = ['A', 'A', 'B', 'B', 'C', 'C'].map((ans, i) => ({ id: `f${i}`, type: 'write', answer: ans }));
  const spaced = spaceOutAnswers(fx);
  let consec = 0;
  for (let i = 1; i < spaced.length; i++) {
    if (answerTextOf(spaced[i - 1]) === answerTextOf(spaced[i])) consec++;
  }
  ck(consec === 0 && spaced.length === fx.length, 'a spaceable set is spaced perfectly, losing no questions');

  // The dev badge: present, gated, and never in a student build. Source
  // assertion, same pattern the terrain suite uses.
  const src = readFileSync(new URL('../src/screens/main/LessonPlayer.js', import.meta.url), 'utf8');
  ck(/\(SHOW_DEV_TOOLS \|\| \(settings && settings\.showQuestionInfo\)\) && step && step\.type === 'question'/.test(src), 'the question badge exists, gated on the dev flag or the testing toggle');
  const store = readFileSync(new URL('../src/state/store.js', import.meta.url), 'utf8');
  ck(/showQuestionInfo: false/.test(store), 'and the toggle is off by default — students never see ids unless a tester switches it on');
  ck(/step\.q\.id/.test(src) && /pool /.test(src), 'and it shows the drawn id and the pool size, so randomisation is inspectable');
}


console.log(fails ? `\n${fails} STEP(S) CRASH` : '\nevery authored step renders');
process.exit(fails ? 1 : 0);
