// ─────────────────────────────────────────────────────────────
// Narration.
//
// Nothing in this feature can be checked by looking at the app, which is the
// reason for the suite. A mispronounced formula is only ever heard — on one
// page, by one student, wearing headphones. "C six H one four" would never
// be reported as a bug; it would be heard as the app being a bit rubbish.
//
// So the conversion from written to spoken is checked against every string
// in the curriculum: nothing dropped, nothing invented, no markup read out,
// and every formula said the way a teacher says it at the board.
// ─────────────────────────────────────────────────────────────

import {
  tokenize,
  spokenFor,
  speakWord,
  numberWord,
  speechSegmentsFor,
  speechTextFor,
  SPOKEN_FIELDS,
  NEVER_SPOKEN,
} from '../src/content/speech.js';
import { formatFormulas } from '../src/chem/formula.js';
import { pickVoice, listEnglishVoices, voiceLabel, VOICE_SAMPLE } from '../src/components/ReadAloud.js';
import { toStep } from '../src/screens/main/LessonPlayer.js';
import { STAGES } from '../src/content/curriculum.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

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

console.log('=== nothing is dropped on the way to the voice ===');
{
  // The conversion has to reassemble, character for character, into the text
  // the reader is looking at. Anything else means a word was lost or an
  // extra one invented somewhere between the page and the speaker.
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

console.log('=== no markup is read out ===');
{
  let leaked = 0;
  for (const text of prose) {
    const said = spokenFor(text);
    if (said.includes('[[') || said.includes(']]')) leaked++;
  }
  ck(leaked === 0, 'no [[marker]] survives into speech');
}

console.log('=== every word reaches the voice ===');
{
  let words = 0;
  let silent = 0;
  for (const text of prose) {
    const { tokens, spokenText } = tokenize(text);
    for (const t of tokens) {
      if (t.kind !== 'word') continue;
      words++;
      // A word the student can see and never hears. Punctuation-only tokens
      // are allowed to be silent; anything with a letter or digit is not.
      if (!t.spoken.trim() && /[A-Za-z0-9]/.test(t.display)) {
        if (silent < 3) console.error(`  FAIL: "${t.display}" is silent`);
        silent++; fails++;
      } else if (t.spoken.trim() && !spokenText.includes(t.spoken.trim())) {
        console.error(`  FAIL: "${t.spoken}" never made it into the utterance`);
        fails++;
      }
    }
  }
  ck(silent === 0, `no word is skipped by the voice (${words} words)`);
  ck(words > 5000, `the curriculum is genuinely covered (${words} spoken words)`);
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
  ck(speechSegmentsFor(null).length === 0, 'a missing step reads nothing rather than throwing');
  ck(speechSegmentsFor({ type: 'teach' }).length === 0, 'an empty step reads nothing');

  // One utterance, not five. Chaining meant five rounds of engine start-up
  // latency and five chances for one to be dropped.
  const said = speechTextFor(step);
  ck(said.startsWith('Naming the chain.'),
    'the heading is closed off so it does not run into the paragraph');
  ck(said.includes('Find the longest chain.'), 'the paragraph follows');
  // A standalone number is left as digits: engines read those correctly, and
  // only digits pressed against letters inside a formula are unreliable.
  ck(said.includes('group 14'), 'and the last field is in there too');
  ck(said.split('.').filter((x) => x.trim()).length === 5, 'all five fields, one utterance');
  ck(!/\.\s*\./.test(said), `no doubled full stop at a join: "${said.slice(0, 60)}…"`);
  ck(speechTextFor(null) === '', 'a missing step narrates nothing');
  ck(speechTextFor({ type: 'teach' }) === '', 'and so does an empty one');
}

console.log('=== an activity page is read, and its answer is not ===');
{
  // The narration reaches quiz questions and the twenty-odd interactive step
  // types now, not just teaching pages. Which means the fields holding the
  // ANSWER are suddenly one bad list away from being read out to a student
  // who has not answered yet. This is the check that stops that.
  const q = {
    type: 'question',
    q: {
      id: 'teach-mc-3',
      type: 'mcName',
      chip: 'CHECK YOUR UNDERSTANDING',
      prompt: 'Which name fits this structure?',
      options: ['butane', 'propane', 'pentane', 'hexane'],
      answer: 'butane',
      explain: 'The chain is four carbons, so the root is but-.',
      hint: 'Count the corners.',
    },
  };
  const said = speechTextFor(q);
  ck(said.includes('Which name fits this structure?'), 'the question is read');
  ck(/A\. butane/.test(said) && /D\. hexane/.test(said),
    'and so are the options, lettered — a student listening has to have something to choose between');

  ck(!said.includes('The chain is four carbons'), 'the EXPLANATION is not read');
  ck(!said.includes('Count the corners'), 'nor the hint, which is help the student chooses to reveal');
  for (const field of NEVER_SPOKEN) {
    ck(!SPOKEN_FIELDS.includes(field), `"${field}" is not in the readable list`);
  }

  // A drawing question keeps its instruction on a subtitle.
  const draw = {
    type: 'question',
    q: { type: 'draw', prompt: 'Draw butane.', subtitle: 'Build the complete structure on the canvas.', answer: 'butane', explain: 'butane drawn correctly.' },
  };
  const drawn = speechTextFor(draw);
  ck(drawn.includes('Draw butane.') && drawn.includes('Build the complete structure'),
    'a drawing question reads its instruction');
  ck(!drawn.includes('drawn correctly'), 'and not its verdict');
}

console.log('=== every step type in the curriculum has something to say ===');
{
  // The speaker sits in the lesson chrome, so it appears on all 23 step
  // types. One that narrates nothing shows a dead button.
  //
  // Narrated through toStep(), which is what the player renders: a `draw`
  // step as authored has no prompt — "Draw butane." is manufactured there.
  const byType = {};
  for (const { step } of teachSteps()) {
    if (!byType[step.type]) byType[step.type] = step;
  }
  const types = Object.keys(byType).sort();
  const mute = types.filter((t) => !speechTextFor(toStep(byType[t], 0)).trim());
  if (mute.length) mute.forEach((t) => console.error(`  FAIL: "${t}" steps narrate nothing`));
  ck(mute.length === 0, `${types.length} step types, all of them readable`);
  ck(types.length >= 20, `and it really is every type (${types.join(', ')})`);
}

console.log('=== every field the app renders is a field the voice reads ===');
{
  // A field added to a teaching page and not added here is content a student
  // can see but not hear, and nothing else would report it.
  const rendered = ['title', 'body', 'caption', 'split.note', 'periodicNote'];
  const missing = rendered.filter((f) => !SPOKEN_FIELDS.includes(f));
  ck(missing.length === 0, `nothing rendered is left unspoken${missing.length ? `: ${missing}` : ''}`);
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

console.log('=== an activity page is read, and its answer is not ===');
{
  // The narration reaches quiz questions and the twenty-odd interactive step
  // types now, not just teaching pages. Which means the fields holding the
  // ANSWER are suddenly one bad list away from being read out to a student
  // who has not answered yet. This is the check that stops that.
  const q = {
    type: 'question',
    q: {
      id: 'teach-mc-3',
      type: 'mcName',
      chip: 'CHECK YOUR UNDERSTANDING',
      prompt: 'Which name fits this structure?',
      options: ['butane', 'propane', 'pentane', 'hexane'],
      answer: 'butane',
      explain: 'The chain is four carbons, so the root is but-.',
      hint: 'Count the corners.',
    },
  };
  const said = speechTextFor(q);
  ck(said.includes('Which name fits this structure?'), 'the question is read');
  ck(/A\. butane/.test(said) && /D\. hexane/.test(said),
    'and so are the options, lettered — a student listening has to have something to choose between');

  ck(!said.includes('The chain is four carbons'), 'the EXPLANATION is not read');
  ck(!said.includes('Count the corners'), 'nor the hint, which is help the student chooses to reveal');
  for (const field of NEVER_SPOKEN) {
    ck(!SPOKEN_FIELDS.includes(field), `"${field}" is not in the readable list`);
  }

  // A drawing question keeps its instruction on a subtitle.
  const draw = {
    type: 'question',
    q: { type: 'draw', prompt: 'Draw butane.', subtitle: 'Build the complete structure on the canvas.', answer: 'butane', explain: 'butane drawn correctly.' },
  };
  const drawn = speechTextFor(draw);
  ck(drawn.includes('Draw butane.') && drawn.includes('Build the complete structure'),
    'a drawing question reads its instruction');
  ck(!drawn.includes('drawn correctly'), 'and not its verdict');
}

console.log('=== every step type in the curriculum has something to say ===');
{
  // The speaker sits in the lesson chrome, so it appears on all 23 step
  // types. One that narrates nothing shows a dead button.
  //
  // Narrated through toStep(), which is what the player renders: a `draw`
  // step as authored has no prompt — "Draw butane." is manufactured there.
  const byType = {};
  for (const { step } of teachSteps()) {
    if (!byType[step.type]) byType[step.type] = step;
  }
  const types = Object.keys(byType).sort();
  const mute = types.filter((t) => !speechTextFor(toStep(byType[t], 0)).trim());
  if (mute.length) mute.forEach((t) => console.error(`  FAIL: "${t}" steps narrate nothing`));
  ck(mute.length === 0, `${types.length} step types, all of them readable`);
  ck(types.length >= 20, `and it really is every type (${types.join(', ')})`);
}

console.log('=== every field the app renders is a field the voice reads ===');
{
  // A field added to a teaching page and not added here is content a student
  // can see but not hear, and nothing else would report it.
  const rendered = ['title', 'body', 'caption', 'split.note', 'periodicNote'];
  const missing = rendered.filter((f) => !SPOKEN_FIELDS.includes(f));
  ck(missing.length === 0, `nothing rendered is left unspoken${missing.length ? `: ${missing}` : ''}`);
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

console.log(fails ? `\n${fails} FAILED\n` : '\nthe narration says the content it is given\n');
process.exit(fails ? 1 : 0);
