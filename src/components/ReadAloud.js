// ─────────────────────────────────────────────────────────────
// Read-aloud.
//
// Uses expo-speech (already a dependency, ~14.0.8 on SDK 54).
//
// Two things are being kept in step: what the engine is saying, and which
// word is blue.
//
// expo-speech 14 reports a word boundary on iOS, on web, and on Android —
// the Android side wires TextToSpeech's onRangeStart, which exists from
// Android 8 and is implemented by the Google engine. So the highlight is
// word-exact on most current hardware.
//
// It is NOT universal, though: onRangeStart is optional for a TTS engine to
// implement, an older device or a third-party engine may never call it, and
// nothing announces in advance which case a phone is. So the estimator runs
// everywhere and boundary events CORRECT it whenever they arrive. Where they
// arrive the highlight is exact; where they do not it still tracks closely
// enough to follow, and there is one code path rather than a device matrix.
//
// Speech is synthesised on the device from the lesson text. No audio files
// are recorded, and new content is readable the moment it is authored.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { C, R } from '../theme';
import { tokenize, tokenAtOffset, estimateWordMs } from '../content/speech';
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
// English voices only. A student who wants Structura read in Finnish is not
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
// be audible as a delay if it happened on every press.
let voicePromise = null;
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
  const { spokenText } = tokenize(VOICE_SAMPLE);
  const options = { rate: SPEECH_RATE, pitch: SPEECH_PITCH, language: 'en-AU' };
  if (voice && voice.identifier) options.voice = voice.identifier;
  if (voice && voice.language) options.language = voice.language;
  try {
    Speech.speak(spokenText, options);
  } catch (e) {}
}

// Called when the picker changes: the cached enumeration is still good, but
// any voice resolved from it is not.
export function resetVoiceChoice() {
  voicePromise = null;
}

// ── The hook ─────────────────────────────────────────────────
// segments: [{ field, text }] straight out of speechSegmentsFor(step).
//
// Returns the position as { segment, token } so the renderer can colour one
// word in one paragraph, and nothing anywhere else.
export function useReadAloud(segments, { auto = false, voiceId = null } = {}) {
  const prepared = useMemo(
    () => (segments || []).map((s) => ({ ...s, ...tokenize(s.text) })),
    [segments]
  );

  // One object rather than three useState calls: the three always change
  // together, and separate setters would paint the highlight in three frames.
  const [pos, setPos] = useState({ speaking: false, segment: -1, token: -1 });

  const timer = useRef(null);
  const live = useRef(false);          // this run is still the current one
  const cursor = useRef({ segment: -1, token: -1 });
  const runId = useRef(0);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const stop = useCallback(() => {
    live.current = false;
    runId.current += 1;
    clearTimer();
    try {
      Speech.stop();
    } catch (e) {}
    cursor.current = { segment: -1, token: -1 };
    setPos({ speaking: false, segment: -1, token: -1 });
  }, []);

  // Walk the highlight forward on estimated timing. A boundary event moves
  // the cursor and reschedules from there, so this never fights the engine —
  // it only fills in where the engine says nothing.
  const scheduleFrom = useCallback(
    (segIdx, tokIdx, myRun) => {
      clearTimer();
      const seg = prepared[segIdx];
      if (!seg) return;
      const token = seg.tokens[tokIdx];
      if (!token) return;
      const delay = estimateWordMs(token.spoken, SPEECH_RATE);
      timer.current = setTimeout(() => {
        if (!live.current || runId.current !== myRun) return;
        let next = tokIdx + 1;
        while (next < seg.tokens.length && seg.tokens[next].kind !== 'word') next += 1;
        // Past the last word: hold the final word lit and wait for the
        // engine's own onDone rather than guessing that it has finished.
        if (next >= seg.tokens.length) return;
        cursor.current = { segment: segIdx, token: next };
        setPos({ speaking: true, segment: segIdx, token: next });
        scheduleFrom(segIdx, next, myRun);
      }, delay);
    },
    [prepared]
  );

  const speakSegment = useCallback(
    (segIdx, voice, myRun) => {
      const seg = prepared[segIdx];
      if (!seg || !live.current || runId.current !== myRun) {
        if (live.current && runId.current === myRun) stop();
        return;
      }
      if (!seg.spokenText.trim()) {
        speakSegment(segIdx + 1, voice, myRun);
        return;
      }

      const first = seg.tokens.findIndex((t) => t.kind === 'word');
      cursor.current = { segment: segIdx, token: first };
      setPos({ speaking: true, segment: segIdx, token: first });
      scheduleFrom(segIdx, first, myRun);

      const options = {
        rate: SPEECH_RATE,
        pitch: SPEECH_PITCH,
        language: 'en-AU',
        onBoundary: (e) => {
          if (!live.current || runId.current !== myRun) return;
          const at = e && (e.charIndex != null ? e.charIndex : e.charindex);
          if (at == null) return;
          const idx = tokenAtOffset(seg.tokens, at);
          if (idx < 0) return;
          cursor.current = { segment: segIdx, token: idx };
          setPos({ speaking: true, segment: segIdx, token: idx });
          scheduleFrom(segIdx, idx, myRun);
        },
        onDone: () => {
          if (!live.current || runId.current !== myRun) return;
          clearTimer();
          speakSegment(segIdx + 1, voice, myRun);
        },
        // A stopped or failed utterance must clear the highlight. A blue word
        // frozen mid-paragraph with silence behind it reads as a crash.
        onStopped: () => {
          if (runId.current === myRun) stop();
        },
        onError: () => {
          if (runId.current === myRun) stop();
        },
      };
      if (voice && voice.identifier) options.voice = voice.identifier;
      if (voice && voice.language) options.language = voice.language;

      try {
        Speech.speak(seg.spokenText, options);
      } catch (e) {
        stop();
      }
    },
    [prepared, scheduleFrom, stop]
  );

  const start = useCallback(() => {
    if (!prepared.length) return;
    runId.current += 1;
    const myRun = runId.current;
    live.current = true;
    setPos({ speaking: true, segment: 0, token: -1 });
    (async () => {
      const voice = await resolveVoice(voiceId);
      if (!live.current || runId.current !== myRun) return;
      try {
        Speech.stop();
      } catch (e) {}
      speakSegment(0, voice, myRun);
    })();
  }, [prepared, speakSegment, voiceId]);

  const toggle = useCallback(() => {
    tap();
    if (live.current) stop();
    else start();
  }, [start, stop]);

  // Auto-read when the setting is on. Runs on the step the student has landed
  // on, and is cancelled the moment they leave it.
  useEffect(() => {
    if (!auto || !prepared.length) return undefined;
    const t = setTimeout(start, 420);   // let the screen settle first
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, prepared]);

  // Leaving the step, closing the lesson, unmounting for any reason: the
  // voice stops. Speech outlives the component that started it otherwise, and
  // a paragraph read aloud over the next screen is the bug students report.
  useEffect(() => {
    return () => {
      live.current = false;
      clearTimer();
      try {
        Speech.stop();
      } catch (e) {}
    };
  }, []);

  return {
    prepared,
    speaking: pos.speaking,
    segment: pos.segment,
    token: pos.token,
    // Which token is lit in a given segment, or -1 for "none in this one".
    tokenIn: (i) => (pos.speaking && pos.segment === i ? pos.token : -1),
    start,
    stop,
    toggle,
  };
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

// Shown once, the first time a student meets the button, so the feature is
// discovered rather than stumbled upon.
export function ReadAloudHint({ onDismiss }) {
  return (
    <Pressable style={rd.hint} onPress={onDismiss}>
      <Ionicons name="volume-high" size={15} color={C.teal} />
      <Text style={rd.hintTxt}>Tap to have this page read to you.</Text>
      <Ionicons name="close" size={14} color={C.faint} />
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
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.tealSoft,
    borderWidth: 1,
    borderColor: C.tealBorder,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 10,
  },
  hintTxt: { flex: 1, fontSize: 12, color: C.teal, fontWeight: '600' },
});
