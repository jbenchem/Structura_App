// ─────────────────────────────────────────────────────────────
// Dev tools.
//
// The test that decides whether a tool belongs here: does reaching this state
// by hand take more than about thirty seconds, and is it a state that has to
// be looked at repeatedly?
//
// Checking the end-of-lesson celebration meant answering a whole lesson.
// Checking the GOLD celebration meant answering a whole lesson without a
// single mistake — several attempts, on a good day. Checking what a page
// sounds like meant navigating to it and pressing the speaker. All three are
// now one tap, which is the difference between a thing that gets tested every
// build and a thing that gets tested once.
//
// Everything here is behind SHOW_DEV_TOOLS, which is false in a release
// build. A tester who can complete every unit with a button is no longer
// testing what was built.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T, shadow } from '../../theme';
import { Screen, Card, Pill } from '../../components/ui';
import { Overlay } from '../../components/Overlay';
import { useViewport } from '../../components/DeviceFrame';
import { useApp, getSettings } from '../../state/store';
import { UNITS, STAGES } from '../../content/curriculum';
import { CATEGORY } from '../../content/questionFactory';
import { LessonResults } from './LessonResults';
import { speechTextFor, speechSegmentsFor, NEVER_SPOKEN } from '../../content/speech';
import { speakSample, resolveVoice, loadVoiceList } from '../../components/ReadAloud';
import { BUILD, BUILD_LABEL } from '../../config';

// Every step in the curriculum, flattened, so a step type can be found
// without knowing which unit hides it.
function allSteps() {
  const out = [];
  for (const st of STAGES)
    for (const u of st.units)
      for (const l of u.lessons || [])
        (l.steps || []).forEach((step, i) =>
          out.push({ unit: u, lesson: l, step, index: i })
        );
  return out;
}

export function DevTools({ onClose, openLesson }) {
  const { state, dispatch, isPremium } = useApp();
  const vp = useViewport();
  const settings = getSettings(state);

  const [preview, setPreview] = useState(null);   // 'normal' | 'perfect'
  const [probe, setProbe] = useState(null);
  const [voiceInfo, setVoiceInfo] = useState(null);

  const steps = useMemo(allSteps, []);
  const stepTypes = useMemo(() => {
    const counts = {};
    for (const s of steps) counts[s.step.type] = (counts[s.step.type] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [steps]);

  const authored = UNITS.filter((u) => u.lessonList && u.lessonList.length);
  const attempts = (state.attempts || []).length;

  // ── Celebration preview ───────────────────────────────────
  // The reason this file exists. A perfect lesson is otherwise several
  // minutes of flawless answering away, every time you want to look at it.
  const previewProps = (perfect) => ({
    unit: { title: 'Preview', topics: ['alkanes'], lessonList: [{ id: 'p' }] },
    lesson: { id: 'p', title: 'Celebration preview' },
    score: perfect ? { right: 5, asked: 5 } : { right: 4, asked: 5 },
    byCategory: {
      [CATEGORY.NAME_STRUCTURE]: { right: perfect ? 3 : 2, asked: 3, subs: {} },
      [CATEGORY.DRAW_MOLECULE]: { right: 2, asked: 2, subs: {} },
    },
    elapsedMs: 74000,
    unitProgress: { done: 1, total: 3 },
    onContinue: () => setPreview(null),
    onReview: () => setPreview(null),
    onClose: () => setPreview(null),
  });

  // ── Narration probe ───────────────────────────────────────
  // What a page SAYS, as text, without listening to it. Reading the string is
  // how a mispronounced formula gets found in seconds rather than by
  // listening to two hundred pages.
  const probeType = (type) => {
    const found = steps.find((s) => s.step.type === type);
    if (!found) return;
    setProbe({
      type,
      where: `${found.unit.id} · ${found.lesson.id} · step ${found.index + 1}`,
      segments: speechSegmentsFor(found.step),
      text: speechTextFor(found.step),
    });
  };

  const checkVoice = async () => {
    try {
      const [chosen, list] = await Promise.all([resolveVoice(settings.voiceId), loadVoiceList()]);
      setVoiceInfo({
        chosen: chosen ? `${chosen.name} (${chosen.language})` : 'none — device default',
        count: list.length,
        female: list.filter((v) => v.likelyFemale).length,
      });
    } catch (e) {
      setVoiceInfo({ chosen: `failed: ${e.message}`, count: 0, female: 0 });
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={dv.top}>
        <Pressable onPress={onClose} hitSlop={10} style={{ width: 36 }}>
          <Ionicons name="close" size={24} color={C.navy} />
        </Pressable>
        <Text style={[T.h2, { flex: 1 }]}>Dev tools</Text>
        <Pill label={BUILD} kind="progress" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ── Celebration ── */}
        <Text style={dv.section}>Celebration</Text>
        <Card style={{ gap: 10 }}>
          <Text style={T.tiny}>
            Opens the results screen directly, with the arrival wipe skipped. The only way to
            look at the gold version without a flawless lesson.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Tool label="Completed" icon="sparkles-outline" onPress={() => setPreview('normal')} />
            <Tool label="Perfect (gold)" icon="trophy-outline" onPress={() => setPreview('perfect')} />
          </View>
          <Text style={T.tiny}>
            Fireworks are {settings.celebrations ? 'on' : 'OFF in settings — the preview will be empty'}
            {settings.celebrations && !settings.celebrationHaptics ? ', vibration off' : ''}.
          </Text>
        </Card>

        {/* ── Narration ── */}
        <Text style={dv.section}>Narration</Text>
        <Card style={{ gap: 10 }}>
          <Text style={T.tiny}>
            What a step type says, as text. Faster than listening, and it is the only way to
            check the ones that never get read aloud by accident.
          </Text>
          <View style={dv.chips}>
            {stepTypes.map(([type, n]) => (
              <Pressable key={type} onPress={() => probeType(type)} style={dv.chip}>
                <Text style={dv.chipTxt}>
                  {type} · {n}
                </Text>
              </Pressable>
            ))}
          </View>

          {probe ? (
            <View style={dv.readout}>
              <Text style={dv.readoutHead}>{probe.where}</Text>
              {probe.segments.length ? (
                probe.segments.map((seg, i) => (
                  <Text key={i} style={dv.readoutLine}>
                    <Text style={{ color: C.teal, fontWeight: '700' }}>{seg.field}</Text>
                    {'  '}
                    {seg.text}
                  </Text>
                ))
              ) : (
                <Text style={dv.readoutLine}>nothing to read on this step type</Text>
              )}
              <Text style={[dv.readoutHead, { marginTop: 8 }]}>spoken as</Text>
              <Text style={dv.readoutLine}>{probe.text || '(silent)'}</Text>
              <Pressable
                style={dv.play}
                onPress={() => speakSample({ identifier: settings.voiceId, language: 'en-AU' })}
              >
                <Ionicons name="play" size={13} color={C.teal} />
                <Text style={dv.playTxt}>hear the sample line</Text>
              </Pressable>
            </View>
          ) : null}

          <Tool label="Which voice am I getting?" icon="mic-outline" onPress={checkVoice} wide />
          {voiceInfo ? (
            <View style={dv.readout}>
              <Text style={dv.readoutLine}>resolved: {voiceInfo.chosen}</Text>
              <Text style={dv.readoutLine}>
                {voiceInfo.count} English voices, {voiceInfo.female} detectably female
              </Text>
              {voiceInfo.female === 0 && voiceInfo.count > 0 ? (
                <Text style={[dv.readoutLine, { color: C.warn }]}>
                  none detectable — expected on Android, pick one by ear in Account
                </Text>
              ) : null}
            </View>
          ) : null}
        </Card>

        {/* ── Jump ── */}
        <Text style={dv.section}>Jump to a unit</Text>
        <Card style={{ gap: 8 }}>
          <Text style={T.tiny}>
            Opens a unit's first unfinished lesson, ignoring progression locks.
          </Text>
          <View style={dv.chips}>
            {authored.map((u) => (
              <Pressable
                key={u.id}
                onPress={() => {
                  dispatch({ type: 'setDevFlag', flag: 'unlockAll', value: true });
                  onClose();
                  openLesson && openLesson(u.id);
                }}
                style={dv.chip}
              >
                <Text style={dv.chipTxt}>{u.n}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* ── State ── */}
        <Text style={dv.section}>State</Text>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="lock-open-outline" size={18} color={C.teal} />
            <View style={{ flex: 1 }}>
              <Text style={[T.body, { fontWeight: '600' }]}>Unlock all lessons</Text>
              <Text style={T.tiny}>Every unit reachable, progression locks ignored</Text>
            </View>
            <Switch
              value={!!(state.dev && state.dev.unlockAll)}
              onValueChange={(v) => dispatch({ type: 'setDevFlag', flag: 'unlockAll', value: v })}
              trackColor={{ true: C.teal, false: C.track }}
              thumbColor="#FFF"
            />
          </View>
          <Row
            icon="construct-outline"
            label={isPremium ? 'Switch to Free' : 'Switch to Plus'}
            onPress={() =>
              isPremium
                ? dispatch({ type: 'clearPremium' })
                : dispatch({
                    type: 'grantPremium',
                    plan: 'dev',
                    premiumUntil: null,
                    source: 'dev-toggle',
                  })
            }
          />
          <Row
            icon="play-skip-forward-outline"
            label="Complete current unit"
            onPress={() => dispatch({ type: 'completeUnit', unitId: state.progress.current.unitId })}
          />
          <Row
            icon="flag-outline"
            label="Complete every authored unit"
            onPress={() =>
              authored.forEach((u) => dispatch({ type: 'completeUnit', unitId: u.id }))
            }
          />
          <Row
            icon="bar-chart-outline"
            label="Seed 8 weeks of demo attempts"
            onPress={() => dispatch({ type: 'seedDemoData' })}
          />
          <Row
            icon="help-circle-outline"
            label="Replay the first-run tour"
            onPress={() => {
              dispatch({ type: 'restartTour' });
              Alert.alert('Tour armed', 'Go to Home and it will start from the beginning.');
            }}
          />
        </Card>

        {/* ── Diagnostics ── */}
        <Text style={dv.section}>Diagnostics</Text>
        <Card style={{ gap: 4 }}>
          <Stat k="build" v={BUILD_LABEL || BUILD} />
          <Stat k="viewport" v={`${Math.round(vp.width)} × ${Math.round(vp.height)}`} />
          <Stat k="units authored" v={`${authored.length} of ${UNITS.length}`} />
          <Stat k="lessons" v={String(steps.length ? new Set(steps.map((s) => s.lesson.id)).size : 0)} />
          <Stat k="steps" v={String(steps.length)} />
          <Stat k="step types" v={String(stepTypes.length)} />
          <Stat k="attempts logged" v={String(attempts)} />
          <Stat k="saved molecules" v={String((state.savedMolecules || []).length)} />
          <Stat k="perfect lessons" v={String((state.perfectLessons || []).length)} />
          <Stat k="auto-read" v={settings.autoRead ? 'on' : 'off'} />
          <Stat k="voice" v={settings.voiceId || 'automatic'} />
          <Stat k="never narrated" v={NEVER_SPOKEN.join(', ')} />
        </Card>

        {/* ── Danger ── */}
        <Text style={dv.section}>Destructive</Text>
        <Card style={{ gap: 12 }}>
          <Row
            icon="refresh-outline"
            label="Restart from unit 1"
            onPress={() => dispatch({ type: 'resetProgress' })}
            danger
          />
          <Row
            icon="person-add-outline"
            label="Reset profile — back to setup"
            onPress={() =>
              Alert.alert(
                'Reset profile?',
                'Clears everything and returns to the setup screens, as a brand new install would.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', style: 'destructive', onPress: () => dispatch({ type: 'resetAll' }) },
                ]
              )
            }
            danger
          />
          <Row
            icon="close-circle-outline"
            label="Clear the attempt log"
            onPress={() => dispatch({ type: 'clearAttempts' })}
            danger
          />
        </Card>
      </ScrollView>

      {/* The results screen, live, over the top. Rendered through Overlay
          rather than Modal for the same reason as everything else: a Modal
          escapes the device frame on web. */}
      <Overlay visible={!!preview}>
        <View style={{ flex: 1, backgroundColor: C.bg, padding: 16 }}>
          {preview ? <LessonResults {...previewProps(preview === 'perfect')} /> : null}
        </View>
      </Overlay>
    </Screen>
  );
}

function Tool({ label, icon, onPress, wide }) {
  return (
    <Pressable onPress={onPress} style={[dv.tool, wide && { flex: 0, alignSelf: 'stretch' }]}>
      <Ionicons name={icon} size={16} color={C.teal} />
      <Text style={dv.toolTxt}>{label}</Text>
    </Pressable>
  );
}

function Row({ icon, label, onPress, danger }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={18} color={danger ? C.danger : C.teal} />
      <Text style={[T.body, { flex: 1, fontWeight: '600' }, danger && { color: C.danger }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={C.faint} />
    </Pressable>
  );
}

function Stat({ k, v }) {
  return (
    <View style={dv.stat}>
      <Text style={dv.statK}>{k}</Text>
      <Text style={dv.statV} numberOfLines={1}>
        {v}
      </Text>
    </View>
  );
}

const dv = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 12 },
  section: {
    fontSize: 11,
    fontWeight: '800',
    color: C.teal,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  tool: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    backgroundColor: C.tealSoft,
    borderRadius: R.sm,
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  toolTxt: { color: C.teal, fontWeight: '700', fontSize: 13.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: C.bg,
  },
  chipTxt: { fontSize: 12, fontWeight: '700', color: C.navy },
  readout: {
    backgroundColor: C.navy,
    borderRadius: R.sm,
    padding: 10,
    gap: 3,
  },
  readoutHead: { color: '#9FC7F5', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  readoutLine: { color: '#FFFFFF', fontSize: 12, lineHeight: 17 },
  play: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  playTxt: { color: '#9FC7F5', fontSize: 11.5, fontWeight: '700' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  statK: { flex: 1, fontSize: 12.5, color: C.sub },
  statV: { fontSize: 12.5, fontWeight: '700', color: C.navy, maxWidth: '58%' },
});
