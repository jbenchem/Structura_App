// ─────────────────────────────────────────────────────────────
// Answer sound effects — PLACEHOLDER.
//
// The hook points are wired up and called at the right moments;
// only the audio files and the player are missing, so adding sound
// is a self-contained job:
//
//   1. Drop the files in:
//        assets/sounds/correct.mp3
//        assets/sounds/incorrect.mp3
//   2. npx expo install expo-audio
//   3. Uncomment the block below.
//
// Until then these fall back to haptics, which already distinguish
// the two outcomes on a device. Deliberately not importing an audio
// package that is not installed: Metro resolves imports statically,
// so a speculative import would break the bundle rather than
// degrade quietly.
// ─────────────────────────────────────────────────────────────

import { good, nope } from './sandbox/haptics';

// import { createAudioPlayer } from 'expo-audio';
// const correctPlayer = createAudioPlayer(require('../assets/sounds/correct.mp3'));
// const incorrectPlayer = createAudioPlayer(require('../assets/sounds/incorrect.mp3'));

let enabled = true;

export function setSoundEnabled(v) {
  enabled = !!v;
}

export function playCorrect() {
  good();
  if (!enabled) return;
  // correctPlayer.seekTo(0);
  // correctPlayer.play();
}

export function playIncorrect() {
  nope();
  if (!enabled) return;
  // incorrectPlayer.seekTo(0);
  // incorrectPlayer.play();
}
