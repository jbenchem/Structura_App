// ─────────────────────────────────────────────────────────────
// Read aloud.
//
// The failure this suite exists to catch is a quiet one. Read-aloud renders
// the same paragraph through a different path — one <Text> per word instead
// of one per run — so a mistake there changes what is ON THE SCREEN, not just
// what is heard, and it changes it only while the voice is running. Nobody
// would find that by using the app.
//
// The second failure is the highlight landing on the wrong word. Display text
// and spoken text diverge wherever a formula appears (CH₃ is said "C H
// three", three words for one), so every offset the engine reports has to be
// mapped back through the token list rather than counted.
// ─────────────────────────────────────────────────────────────

import {
  tokenize,
  tokenAtOffset,
  speakWord,
  numberWord,
  estimateWordMs,
  speechSegmentsFor,
  segmentIndexOf,
  SPOKEN_FIELDS,
} from '../src/content/speech.js';
import { formatFormulas } from '../src/chem/formula.js';
import { GlossaryText } from '../src/components/GlossaryText.js';
import { pickVoice, listEnglishVoices, voiceLabel, VOICE_SAMPLE } from '../src/components/ReadAloud.js';
import { STAGES } from '../src/content/curriculum.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

// Flatten a rendered tree to the characters a reader would actually see.
const flat = (n) =>
  typeof n === 'string' || typeof n === 'number' ? String(n)
  : Array.isArray(n) ? n.map(flat).join('')
  : n && typeof n.type === 'function' ? flat(n.type(n.props || {}))
  : n && n.props ? flat(n.props.children) : '';

const teachSteps = () => {
  const out = [];
  for (const st of STAGES) for (const u of st.units) for (const l of u.lessons || [])
    for (const s of l.steps || []) out.push({ lesson: l.id, step: s });
  return out;
};

const allProse = () => {
  const out = [];
  for (const { step } of teachSteps())
    for (const f of ['title', 'body', 'caption', 'explain', 'prompt'])
      if (typeof step[f] === 'string' && step[f]) out.push(step[f]);
  return out;
};

const prose = allProse();

console.log('=== reading aloud never changes what is on the screen ===');
{
  // The whole point: tokenizing for speech must reassemble, character for
  // character, into the string the reader was already looking at.
  let bad = 0;
  for (const text of prose) {
    const rebuilt = tokenize(text).tokens.map((t) => t.display).join('');
    if (rebuilt !== formatFormulas(text)) {
      if (bad < 3) console.error(`  FAIL: rebuilt differs\n    was: ${formatFormulas(text).slice(0, 90)}\n    now: ${rebuilt.slice(0, 90)}`);
      bad++; fails++;
    }
  }
  ck(bad === 0, `${prose.length} authored strings rebuild exactly`);
}

console.log('=== a marker never reaches the eye or the ear ===');
{
  let leaked = 0;
  for (const text of prose) {
    const { tokens, spokenText } = tokenize(text);
    if (spokenText.includes('[[') || spokenText.includes(']]')) leaked++;
    for (const t of tokens) if (t.display.includes('[[') || t.display.includes(']]')) leaked++;
  }
  ck(leaked === 0, 'no [[marker]] survives into display or speech');
}

console.log('=== every offset maps back to the word being said ===');
{
  let sliceBad = 0;
  let mapBad = 0;
  let words = 0;
  for (const text of prose) {
    const { tokens, spokenText } = tokenize(text);
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      // The recorded range must actually contain what the token says, or the
      // engine's charIndex is being compared against fiction.
      if (spokenText.slice(t.start, t.end) !== t.spoken.slice(0, t.end - t.start)) sliceBad++;
      if (t.kind !== 'word' || !t.spoken) continue;
      words++;
      // The engine reports the start of a word. It must light that word.
      if (tokenAtOffset(tokens, t.start) !== i) mapBad++;
      // And an offset partway through it must light the same word, because
      // some engines report the middle of a token rather than its start.
      const mid = t.start + Math.floor((t.end - t.start) / 2);
      if (tokenAtOffset(tokens, mid) !== i) mapBad++;
    }
  }
  ck(sliceBad === 0, `every token's range holds its own text (${words} words)`);
  ck(mapBad === 0, 'every boundary offset lights the word it belongs to');
  ck(words > 5000, `the curriculum is genuinely covered (${words} spoken words)`);
}

console.log('=== a boundary offset never lands on whitespace ===');
{
  const { tokens } = tokenize('The [[parent chain]] is longest.\n\nNumber it from the end.');
  let onSpace = 0;
  for (let i = 0; i < 60; i++) {
    const idx = tokenAtOffset(tokens, i);
    if (idx >= 0 && tokens[idx].kind !== 'word') onSpace++;
  }
  ck(onSpace === 0, 'the highlight only ever sits on a word');
}

console.log('=== formulas are spoken, locants are not ===');
{
  // formatFormulas has already subscripted these by the time speech sees
  // them, so speech works from the subscripted form, not the source.
  ck(speakWord('CH₃') === 'C H three', `CH₃ → "${speakWord('CH₃')}"`);
  ck(speakWord('C₃H₈') === 'C three H eight', `C₃H₈ → "${speakWord('C₃H₈')}"`);
  // The case that made digit-by-digit unacceptable: "H one four" is not what
  // a teacher says at the board.
  ck(speakWord('C₆H₁₄') === 'C six H fourteen', `C₆H₁₄ → "${speakWord('C₆H₁₄')}"`);
  ck(speakWord('H₂O') === 'H two O', `H₂O → "${speakWord('H₂O')}"`);
  // C2 means carbon number two. Expanding it would say "two carbons", which
  // is a different claim and a wrong one.
  ck(speakWord('C2') === 'C2', `C2 stays "${speakWord('C2')}"`);
  ck(speakWord('but-2-ene') === 'but-2-ene', 'a name is left alone');
  // The alkane general formula, met in unit 2. Read as digits it came out as
  // "two n plus 2", with the bracket left hanging on the end.
  ck(speakWord('CₙH₍₂ₙ₊₂₎') === 'C n H, two n plus two', `CnH(2n+2) → "${speakWord('CₙH₍₂ₙ₊₂₎')}"`);
  ck(speakWord('CₙH₂ₙ₊₂') === 'C n H, two n plus two', `CnH2n+2 → "${speakWord('CₙH₂ₙ₊₂')}"`);
  ck(speakWord('CₙH₂ₙ') === 'C n H, two n', `CnH2n → "${speakWord('CₙH₂ₙ')}"`);
  ck(speakWord('CₙH₂ₙ₋₂') === 'C n H, two n minus two', `CnH2n-2 → "${speakWord('CₙH₂ₙ₋₂')}"`);
  ck(!/[0-9]/.test(speakWord('CₙH₍₂ₙ₊₂₎')), 'no bare digit is left for the engine to guess at');
  // A compound word, not a pause.
  ck(speakWord('carbon–carbon') === 'carbon carbon', `carbon–carbon → "${speakWord('carbon–carbon')}"`);
  ck(/gives/.test(speakWord('→')), 'an arrow is read, not spelled');
  ck(numberWord(14) === 'fourteen' && numberWord(20) === 'twenty' && numberWord(1) === 'one',
    'counts read as numbers');
}

console.log('=== anything with letters in it has something to say ===');
{
  let silent = 0;
  for (const text of prose)
    for (const t of tokenize(text).tokens)
      if (t.kind === 'word' && /[A-Za-z0-9]/.test(t.display) && !t.spoken.trim()) {
        if (silent < 3) console.error(`  FAIL: "${t.display}" is silent`);
        silent++; fails++;
      }
  ck(silent === 0, 'no word is skipped by the voice');
}

console.log('=== a paragraph break becomes a pause, not a stutter ===');
{
  const { spokenText } = tokenize('First point.\n\nSecond point.');
  ck(!/\.\s*\./.test(spokenText), `no doubled full stop: "${spokenText}"`);
  const joined = tokenize('First point\n\nSecond point').spokenText;
  ck(/point\.\s*Second/.test(joined), `a break with no punctuation gains one: "${joined}"`);
}

console.log('=== the page reads in the order it is laid out ===');
{
  const step = {
    type: 'teach',
    title: 'Naming the chain',
    body: 'Find the longest chain.',
    caption: 'Count the carbons.',
    split: { root: 'but', suffix: 'ane', note: 'Root plus suffix.' },
    periodicNote: 'Carbon sits in group 14.',
  };
  const segs = speechSegmentsFor(step);
  ck(segs.map((s) => s.field).join(',') === 'title,body,caption,split.note,periodicNote',
    `read in screen order: ${segs.map((s) => s.field).join(' → ')}`);
  ck(segmentIndexOf(segs, 'caption') === 2, 'a field can find its own segment');
  ck(segmentIndexOf(segs, 'nothing') === -1, 'a field that is not there reports -1');
  ck(speechSegmentsFor(null).length === 0, 'a missing step reads nothing rather than throwing');
  ck(speechSegmentsFor({ type: 'teach' }).length === 0, 'an empty step reads nothing');
}

console.log('=== every teaching page in the curriculum can be read ===');
{
  const teach = teachSteps().filter(({ step }) => step.type === 'teach');
  let mute = 0;
  for (const { lesson, step } of teach) {
    const segs = speechSegmentsFor(step);
    if (!segs.length) { console.error(`  FAIL: ${lesson} has a teaching page with nothing to read`); mute++; fails++; continue; }
    if (segs[0].field !== 'title') { console.error(`  FAIL: ${lesson} does not open with its title`); mute++; fails++; }
  }
  ck(mute === 0, `${teach.length} teaching pages, all readable with no audio authored`);
  ck(teach.length > 150, `the feature covers the real curriculum (${teach.length} pages)`);
}

console.log('=== every field the app renders is a field the voice reads ===');
{
  // A field added to a teaching page and not added here is content a student
  // can see but not hear, and nothing else would report it.
  const rendered = ['title', 'body', 'caption', 'split.note', 'periodicNote'];
  const missing = rendered.filter((f) => !SPOKEN_FIELDS.includes(f));
  ck(missing.length === 0, `nothing rendered is left unspoken${missing.length ? `: ${missing}` : ''}`);
}

console.log('=== the highlight changes colour, never the words ===');
{
  const cases = [
    'A [[parent chain]] of six carbons.',
    'The formula is C₆H₁₄ here.',
    'Plain text with no marks at all.',
    'In [[skeletal form|skeletal notation]] every corner is a carbon.',
    'A [[~locant]] tells you where.',
  ];
  let drift = 0;
  for (const text of cases) {
    const silent = flat(GlossaryText({ children: text }));
    const idle = flat(GlossaryText({ children: text, highlight: -1 }));
    const speaking = flat(GlossaryText({ children: text, highlight: 2 }));
    if (silent !== idle || idle !== speaking) {
      console.error(`  FAIL: text changed when read\n    silent: ${silent}\n    idle:   ${idle}\n    lit:    ${speaking}`);
      drift++; fails++;
    }
  }
  ck(drift === 0, 'the paragraph reads identically silent, idle and mid-sentence');
}

console.log('=== the renderer survives a highlight past the end ===');
{
  const run = (label, props) => {
    try { flat(GlossaryText(props)); ck(true, label); }
    catch (e) { ck(false, `${label} — ${e.message}`); }
  };
  run('an index past the last word', { children: 'Two words', highlight: 99 });
  run('an empty string', { children: '', highlight: 0 });
  run('a highlight on a term', { children: 'The [[locant]] here', highlight: 1 });
  run('no children at all', { children: undefined, highlight: 0 });
}

console.log('=== timing estimates behave ===');
{
  ck(estimateWordMs('a') > 0, 'a single letter takes some time');
  ck(estimateWordMs('nomenclature') > estimateWordMs('the'), 'a longer word takes longer');
  ck(estimateWordMs('end.') > estimateWordMs('end'), 'a full stop earns a pause');
  ck(estimateWordMs('word', 2) < estimateWordMs('word', 1), 'a faster rate takes less time');
  ck(estimateWordMs('') > 0, 'an empty string still advances rather than stalling');
}

console.log('=== the voice asked for is the voice preferred ===');
{
  const V = (name, language) => ({ identifier: name, name, language, quality: 'Default' });
  // An iOS device: voices have human names, so gender can be inferred.
  const ios = [
    V('Aaron', 'en-US'),
    V('Daniel', 'en-GB'),
    V('Karen', 'en-AU'),
    V('Samantha', 'en-US'),
  ];
  ck(pickVoice(ios).name === 'Karen', `Australian female wins: ${pickVoice(ios).name}`);
  ck(pickVoice([V('Daniel', 'en-GB'), V('Samantha', 'en-US')]).name === 'Samantha',
    'without one, a female voice in another English');
  ck(pickVoice([V('Daniel', 'en-GB'), V('Lee', 'en-AU')]).name === 'Lee',
    'without any female voice, Australian English still wins');
  ck(pickVoice([V('Amelie', 'fr-FR')]) === null, 'no English voice at all returns nothing');
  ck(pickVoice([]) === null && pickVoice(null) === null, 'an empty or missing list is survivable');
  // Some Android voices do encode it in the identifier, even though the
  // schema has no field for it.
  ck(pickVoice([V('en-us-x-sfg#male_1', 'en-US'), V('en-us-x-tpf#female_1', 'en-US')]).name
    === 'en-us-x-tpf#female_1', 'an identifier that says "female" is believed');
}

console.log('=== gender cannot be inferred on Android, and the app admits it ===');
{
  // The real shape expo-speech returns: { identifier, name, quality,
  // language } and nothing else, on every platform. Google's Android voices
  // are named like this and carry no gender signal at all — which is why
  // there is a picker in Account rather than only a heuristic.
  const android = ['aua', 'aub', 'auc', 'aud'].map((k) => ({
    identifier: `en-au-x-${k}-local`,
    name: `en-au-x-${k}-local`,
    quality: 'Default',
    language: 'en-AU',
  }));
  const listed = listEnglishVoices(android);
  ck(listed.length === 4, 'every Android voice is offered');
  ck(listed.every((v) => !v.likelyFemale),
    'and none is claimed to be female, because nothing in the data says so');
  ck(listed.every((v) => !/x-au[a-d]-local/.test(v.label)),
    `an opaque id is never shown raw: "${listed[0].label}"`);
  ck(listed.map((v) => v.label).join(', ') === 'Australian English 1, Australian English 2, Australian English 3, Australian English 4',
    'they are numbered so they can be worked through by ear');
}

console.log('=== the picker is a list somebody can read ===');
{
  const V = (name, language) => ({ identifier: `${name}-${language}`, name, language, quality: 'Default' });
  const mixed = [V('Samantha', 'en-US'), V('Karen', 'en-AU'), V('Amelie', 'fr-FR'), V('Daniel', 'en-GB')];
  const listed = listEnglishVoices(mixed);
  ck(listed.length === 3, 'non-English voices are left out');
  ck(listed[0].name === 'Karen', 'Australian English is offered first');
  ck(listed[0].label === 'Karen — Australian English', `named voices keep their name: "${listed[0].label}"`);
  ck(voiceLabel({ name: 'Moira', language: 'en-IE' }, 1) === 'Moira — Irish English', 'accents are named in full');
  ck(voiceLabel({ name: 'en-in-x-ene-local', language: 'en-IN' }, 2) === 'Indian English 2', 'opaque ids are numbered');
  ck(voiceLabel({ name: '', language: 'en-ZZ' }, 1) === 'English 1', 'an unknown region still produces a label');

  // Duplicates are real: Android lists local and network copies of the same
  // voice under one identifier more often than it should.
  const dupes = listEnglishVoices([V('Karen', 'en-AU'), V('Karen', 'en-AU')]);
  ck(dupes.length === 1, 'the same voice is not offered twice');
  ck(listEnglishVoices(null).length === 0 && listEnglishVoices(undefined).length === 0,
    'no voices reported is survivable');
  ck(listEnglishVoices([{ name: 'no id', language: 'en-AU' }]).length === 0,
    'a voice with no identifier cannot be selected, so it is not offered');
}

console.log('=== the sample is a fair test of a voice ===');
{
  // Chosen to expose what actually goes wrong: a formula, a locant and a
  // name. A sample of plain prose would sound fine in any voice.
  ck(/C5H12/.test(VOICE_SAMPLE), 'the sample contains a formula');
  ck(/2-methylbutane/.test(VOICE_SAMPLE), 'and a locant in a name');
  const { spokenText } = tokenize(VOICE_SAMPLE);
  ck(/C five H twelve/.test(spokenText), `spoken through the lesson pipeline: "${spokenText}"`);
}

console.log(fails ? `\n${fails} FAILED\n` : '\nread aloud speaks the content it is given\n');
process.exit(fails ? 1 : 0);
