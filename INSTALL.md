# Installing this build

## Nothing to install

`expo-speech ~14.0.8` is already in your `package.json`, so read-aloud has
everything it needs. No new dependencies, no native modules, no development
build — this still runs in Expo Go.

```bash
npm test          # 50 suites, including three new ones
npm run tunnel
```

## What changed

**Read-aloud.** A speaker button on every teaching page, colouring each word
blue as it is spoken. `src/content/speech.js` derives everything from the
authored text, so new content needs no audio work.

**Celebrations.** Fireworks and vibration on the results screen; coloured for a
completed lesson, gold for a perfect one.

**First-run tour.** Seven spotlight cards over Home, shown once after
onboarding and replayable from Account.

Three new settings live in Account: *Read pages aloud automatically* (off by
default), *Fireworks when a lesson ends* (on), *Vibrate with the fireworks*
(on).

## Worth checking on a real phone

The tests cover the geometry, the text mapping and the wiring. Three things
only a device can answer:

1. **Which voice you actually get.** No platform reports gender — expo-speech
   returns `{ identifier, name, quality, language }` and nothing more — so on
   Android the automatic choice is a guess. Open Account → Reading and sound,
   work down the list with the play buttons, and pick one. If none of the
   Australian voices is female on the A35, installing Google Text-to-Speech
   and its en-AU voice data usually adds them.
2. **Whether the highlight tracks word-for-word on Android.** It should:
   expo-speech 14 wires `onRangeStart`, which Google's engine implements from
   Android 8. If it visibly drifts, that engine is not reporting and the
   estimator is carrying it — tune `BASE_MS_PER_WORD` and `MS_PER_CHAR` in
   `src/content/speech.js`, and `SPEECH_RATE` in `src/components/ReadAloud.js`.
3. **Whether the fireworks drop frames** on the oldest phone in the beta pool.
   `CELEBRATION` in `src/components/Fireworks.js` is one object — reducing
   `particles` is the first dial to turn.

## Files added

```
src/content/speech.js            tokenizer: display text vs spoken text
src/content/tour.js              tour steps (content, not code)
src/components/ReadAloud.js      voice selection, boundary sync, the button
src/components/Fireworks.js      burst geometry + particle rendering
src/components/Spotlight.js      tour overlay, even-odd hole, target registry
tests/read-aloud.test.mjs
tests/celebration.test.mjs
tests/tour.test.mjs
tests/stubs/expo-speech.js
```

## Files changed

```
App.js                           TourProvider, tour render, tab targets
src/state/store.js               settings slice, tourDone, getSettings()
src/components/GlossaryText.js   optional word-level rendering
src/screens/main/LessonPlayer.js speaker button + highlighting on teach steps
src/screens/main/LessonResults.js fireworks
src/screens/main/Home.js         tour targets
src/screens/main/Account.js      three real settings + replay the tour
src/sandbox/haptics.js           celebrate() / burstTap()
scripts/bootstrap.sh             installs expo-speech
scripts/run-tests.mjs            three suites registered, expo-speech stub
tests/stubs/react-native.js      Animated.parallel/stagger/delay, Vibration
tests/stubs/expo-haptics.js      ImpactFeedbackStyle.Heavy
tests/lesson-steps.test.mjs      caption assertion fixed for word-level nodes
```
