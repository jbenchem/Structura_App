// ─────────────────────────────────────────────────────────────
// Sound effects: correct, incorrect, and the results-page fanfare.
//
// Three rules, because this app is used on phones in classrooms:
//   1. They respect the phone's silent switch. Narration deliberately opts
//      OUT of silent mode (a student pressed play and wants to hear it);
//      an effect nobody asked for must not. Each play sets the audio mode
//      it needs, and the last setter wins, so the two coexist.
//   2. They have their own toggle in Account, on by default, off in one tap.
//   3. Nothing here can crash a lesson: every call degrades to silence.
//
// Sounds are loaded once, lazily, and replayed from the start each time.
// expo-audio (SDK 55+); expo-av was removed from the SDK.
// ─────────────────────────────────────────────────────────────

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const FILES = {
  correct: require('../../assets/sounds/correct.mp3'),
  incorrect: require('../../assets/sounds/incorrect.mp3'),
  fanfare: require('../../assets/sounds/fanfare.mp3'),
};

// Volume per sound: the verdict cues sit under speech; the fanfare is the
// one moment allowed to be a little louder.
const VOLUME = { correct: 0.55, incorrect: 0.25, fanfare: 0.7 };

const loaded = {};
let audioModeForEffects = false;

async function ensureEffectsMode() {
  if (audioModeForEffects) return;
  try {
    // iOS refuses playsInSilentMode:false combined with duckOthers, so the
    // iOS interruption mode is mixWithOthers; Android may duck.
    await setAudioModeAsync({
      playsInSilentMode: false,
      allowsRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
      interruptionModeAndroid: 'duckOthers',
    });
    audioModeForEffects = true;
  } catch (e) {
    /* silence is fine */
  }
}

// Narration flips the mode to play in silent; when it does, effects must
// re-assert theirs before the next play. ReadAloud calls this.
export function effectsModeInvalidated() {
  audioModeForEffects = false;
}

function load(name) {
  if (loaded[name]) return loaded[name];
  try {
    const player = createAudioPlayer(FILES[name]);
    player.volume = VOLUME[name];
    loaded[name] = player;
    return player;
  } catch (e) {
    return null;
  }
}

// Fire and forget. `enabled` is the settings flag, passed by the caller so
// this module never reads app state itself.
export async function playSound(name, enabled = true) {
  if (!enabled || !FILES[name]) return false;
  try {
    await ensureEffectsMode();
    const player = load(name);
    if (!player) return false;
    await player.seekTo(0);
    player.play();
    return true;
  } catch (e) {
    return false;
  }
}

export async function unloadSounds() {
  for (const k of Object.keys(loaded)) {
    try {
      loaded[k].remove();
    } catch (e) {
      /* nothing to do */
    }
    delete loaded[k];
  }
}

export const SOUND_NAMES = Object.keys(FILES);
