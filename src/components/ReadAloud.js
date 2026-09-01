// ─────────────────────────────────────────────────────────────
// Narration.
//
// A speaker button on every teaching page reads it aloud. Uses expo-speech
// (already a dependency, ~14.0.8 on SDK 54): the voice is synthesised on the
// device from the lesson text, so nothing is recorded and new content is
// readable the moment it is authored.
//
// The page is spoken as ONE utterance, built by speechTextFor(step). An
// earlier version chained an utterance per field and tracked which word was
// being said so it could be coloured; that is gone. What is left is start,
// stop, and a voice to say it in.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// iPhones ship with the ring/silent switch down more often than not, and by
// default the speech synthesiser obeys it — the narrator "doesn't work" by
// working exactly as Apple intended. Opting this app's audio session into
// playing in silent mode is the fix; done once, before the first utterance,
// and harmless everywhere else.
let audioSessionReady = false;
async function ensureAudible() {
  if (audioSessionReady || Platform.OS !== 'ios') return;
  audioSessionReady = true;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });
  } catch (e) {
    // No expo-av on this build: the narrator still works with the switch up.
  }
}
import { C } from '../theme';
import { spokenFor } from '../content/speech';
import { tap } from '../sandbox/haptics';

export const SPEECH_RATE = 0.92;   // a shade under default: nomenclature is dense
export const SPEECH_PITCH = 1.02;

// ── Voice ────────────────────────────────────────────────────
// A female voice was asked for. The honest position, after reading what the
// platforms actually return:
//
//   NO PLATFORM REPORTS GENDER. expo-speech's Voice is { identifier, name,
//   quality, language } on iOS, Android and web alike — there is no gender
//   field to read, on any of them.
//
// So gender has to be inferred from the name, and that only works where the
// name is a name. It is on iOS ("Karen", "Samantha") and usually on web
// ("Google UK English Female"). It is not on Android, where Google's engine
// returns opaque identifiers like "en-au-x-aua-local" that carry no signal
// at all — and Android is the Galaxy A35 the beta runs on.
//
// Hence two mechanisms rather than one: this heuristic picks the best
// automatic guess, and Account offers a picker so a voice can simply be
// chosen and heard. On Android the picker is the one that will actually do
// the job, which is why it exists rather than being a nicety.
const FEMALE_NAMES = /(samantha|karen|moira|tessa|fiona|serena|catherine|allison|ava|susan|zira|aria|nicky|joanna|salli|kendra|amy|emma|female|woman)/i;

function isFemale(v) {
  if (!v) return false;
  // A few engines encode it in the identifier even though the schema has no
  // field for it: "en-us-x-sfg#female_1" is a real Android voice id.
  if (typeof v.identifier === 'string' && /female|#f\d|_f_/i.test(v.identifier)) return true;
  return FEMALE_NAMES.test(String(v.name || ''));
}

const langIs = (v, re) => re.test(String(v.language || v.identifier || ''));

const PREFERENCE = [
  (v) => langIs(v, /^en[-_]?AU/i) && isFemale(v),
  (v) => langIs(v, /^en[-_]?NZ/i) && isFemale(v),
  (v) => langIs(v, /^en[-_]?GB/i) && isFemale(v),
  (v) => langIs(v, /^en[-_]?US/i) && isFemale(v),
  (v) => langIs(v, /^en/i) && isFemale(v),
  (v) => langIs(v, /^en[-_]?AU/i),
  (v) => langIs(v, /^en[-_]?GB/i),
  (v) => langIs(v, /^en/i),
];

export function pickVoice(voices) {
  const list = Array.isArray(voices) ? voices.filter(Boolean) : [];
  if (!list.length) return null;
  for (const test of PREFERENCE) {
    const hit = list.find(test);
    if (hit) return hit;
  }
  return null;
}

// ── The picker ───────────────────────────────────────────────
// English voices only. A student who wants Catalyst read in Finnish is not
// a case worth the scrolling, and the lesson text is English regardless.
const ENGLISH_LABEL = {
  AU: 'Australian English',
  NZ: 'New Zealand English',
  GB: 'British English',
  IE: 'Irish English',
  US: 'American English',
  CA: 'Canadian English',
  IN: 'Indian English',
  ZA: 'South African English',
};

const regionOf = (v) => {
  const m = /^en[-_]([A-Za-z]{2})/.exec(String((v && v.language) || (v && v.identifier) || ''));
  return m ? m[1].toUpperCase() : '';
};

// Google's Android voices are named "en-au-x-aua-local", which is not a thing
// to show a sixteen-year-old. Where the name is opaque it is replaced with a
// number within its own accent, so the picker reads "Australian English 1, 2,
// 3" and can be worked through by ear — which is the only way to find a
// female voice on Android anyway.
const OPAQUE = /^[a-z]{2}[-_][a-z]{2}([-_]|$)/;

export function voiceLabel(v, n) {
  const accent = ENGLISH_LABEL[regionOf(v)] || 'English';
  const name = String((v && v.name) || '').trim();
  if (!name || OPAQUE.test(name)) return `${accent} ${n}`;
  return `${name} — ${accent}`;
}

// English voices, Australian first, each carrying the label to show.
export function listEnglishVoices(voices) {
  const list = (Array.isArray(voices) ? voices : []).filter(
    (v) => v && langIs(v, /^en/i) && v.identifier
  );
  const seen = new Set();
  const unique = list.filter((v) => (seen.has(v.identifier) ? false : seen.add(v.identifier)));

  const rank = (v) => {
    const r = regionOf(v);
    return r === 'AU' ? 0 : r === 'NZ' ? 1 : r === 'GB' ? 2 : r === 'US' ? 3 : 4;
  };
  unique.sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name)));

  const counts = {};
  return unique.map((v) => {
    const r = regionOf(v) || 'XX';
    counts[r] = (counts[r] || 0) + 1;
    return { ...v, label: voiceLabel(v, counts[r]), likelyFemale: isFemale(v) };
  });
}

// Resolved once per launch. Enumerating voices is slow enough on Android to
// be a noticeable pause, and the FIRST press of the speaker was paying for
// all of it — the student pressed, nothing happened, and then it spoke.
// warmUpVoices() gets that out of the way while the app is starting, so by
// the time anybody opens a lesson the list is already in hand.
let voicePromise = null;
export function warmUpVoices() {
  allVoices();
}

function allVoices() {
  if (voicePromise) return voicePromise;
  voicePromise = (async () => {
    try {
      if (typeof Speech.getAvailableVoicesAsync !== 'function') return [];
      return (await Speech.getAvailableVoicesAsync()) || [];
    } catch (e) {
      return [];
    }
  })();
  return voicePromise;
}

// A chosen voice is looked up in the real list rather than reconstructed from
// its id, so the language it is spoken with is the language it belongs to.
// Passing an identifier with a mismatched language makes Android pick a third
// thing that is neither.
export async function resolveVoice(voiceId) {
  const voices = await allVoices();
  if (voiceId) {
    const found = voices.find((v) => v && v.identifier === voiceId);
    if (found) return found;
  }
  return pickVoice(voices);
}

// The settings screen reads the list to build the picker.
export async function loadVoiceList() {
  return listEnglishVoices(await allVoices());
}

// A line worth judging a voice on: it has a formula, a locant and a name in
// it, which is where an English voice reading chemistry goes wrong.
export const VOICE_SAMPLE = 'Pentane is C5H12, and 2-methylbutane is one of its isomers.';

export function speakSample(voice) {
  try {
    Speech.stop();
  } catch (e) {}
  // Spoken through the same pipeline the lessons use, so the sample is a fair
  // test rather than a nicely-chosen sentence that hides the problem.
  const spokenText = spokenFor(VOICE_SAMPLE);
  const options = { rate: SPEECH_RATE, pitch: SPEECH_PITCH, language: 'en-AU' };
  if (voice && voice.identifier) options.voice = voice.identifier;
  if (voice && voice.language) options.language = voice.language;
  // A stale or Android-shaped voice id fails silently on iOS; retrying once
  // with the platform default turns "nothing happened" into speech.
  options.onError = () => {
    try {
      const { voice: _drop, onError: _one, ...rest } = options;
      Speech.speak(spokenText, rest);
    } catch (e) {}
  };
  try {
    ensureAudible();
    Speech.speak(spokenText, options);
  } catch (e) {}
}

// Called when the picker changes: the cached enumeration is still good, but
// any voice resolved from it is not.
export function resetVoiceChoice() {
  voicePromise = null;
}

// ── The hook ─────────────────────────────────────────────────
// One string in, a speaker button's worth of state out.
export function useReadAloud(text, { auto = false, voiceId = null } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const live = useRef(false);
  const runId = useRef(0);

  const stop = useCallback(() => {
    live.current = false;
    runId.current += 1;
    try {
      Speech.stop();
    } catch (e) {}
    setSpeaking(false);
  }, []);

  const start = useCallback(() => {
    if (!text || !text.trim()) return;
    runId.current += 1;
    const myRun = runId.current;
    live.current = true;
    setSpeaking(true);
    (async () => {
      const voice = await resolveVoice(voiceId);
      // Resolving the voice takes a moment on Android, and the student may
      // have pressed stop in it.
      if (!live.current || runId.current !== myRun) return;
      const done = () => {
        if (runId.current === myRun) stop();
      };
      const options = {
        rate: SPEECH_RATE,
        pitch: SPEECH_PITCH,
        language: 'en-AU',
        onDone: done,
        // A stopped or failed utterance has to clear the button too, or it
        // sits showing a stop square over silence.
        onStopped: done,
        onError: done,
      };
      if (voice && voice.identifier) options.voice = voice.identifier;
      if (voice && voice.language) options.language = voice.language;
      options.onError = () => {
        try {
          const { voice: _drop, onError: _one, ...rest } = options;
          Speech.speak(text, rest);
        } catch (e2) {}
      };
      try {
        ensureAudible();
        Speech.stop();
        Speech.speak(text, options);
      } catch (e) {
        stop();
      }
    })();
  }, [text, voiceId, stop]);

  const toggle = useCallback(() => {
    tap();
    if (live.current) stop();
    else start();
  }, [start, stop]);

  // Auto-read when the setting is on, on the page the student has landed on.
  // No settling delay: it was 420ms of silence on every page, which read as
  // the feature being slow rather than as the screen being given a moment.
  useEffect(() => {
    if (!auto || !text) return undefined;
    start();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, text]);

  // Leaving the page, closing the lesson, unmounting for any reason: the
  // voice stops. Speech outlives the component that started it otherwise, and
  // a paragraph read aloud over the next screen is the bug students report.
  useEffect(() => {
    return () => {
      live.current = false;
      try {
        Speech.stop();
      } catch (e) {}
    };
  }, []);

  return { speaking, start, stop, toggle };
}

// ── The button ───────────────────────────────────────────────
export function SpeakerButton({ speaking, onPress, style, size = 34 }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={speaking ? 'stop reading aloud' : 'read this page aloud'}
      style={({ pressed }) => [
        rd.btn,
        { width: size, height: size },
        speaking && rd.btnOn,
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      <Ionicons
        name={speaking ? 'stop' : 'volume-high'}
        size={Math.round(size * 0.48)}
        color={speaking ? '#FFF' : C.teal}
      />
    </Pressable>
  );
}

const rd = StyleSheet.create({
  btn: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOn: { backgroundColor: C.teal, borderColor: C.teal },
});
