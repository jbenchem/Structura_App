// Progress tab — mastery ring, skill breakdown, weekly activity
// chart and recommended next step (mockup screen 4). The deep
// "diagnosis" analytics card is the second live entitlement gate.

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { Screen, Header, Card, Ring, ProgressBar, IconBadge, Pill } from '../../components/ui';
import {
  useApp, useEntitlement, skillTotals,
  subcategoryStats, errorProfile, weaknessShape,
  recentTrend, recencyDelta, timingProfile, recommendNext,
} from '../../state/store';
import { subcategoryMeta, CATEGORY_META } from '../../content/questionFactory';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SKILL_ICONS = {
  nomenclature: 'shapes-outline',
  drawing: 'create-outline',
  functional: 'flask-outline',
  stereo: 'cube-outline',
};

export function Progress({ goPractice, practiceFocus }) {
  const { state } = useApp();
  const analytics = useEntitlement('deepAnalytics');
  const { mastered, total, pct } = skillTotals(state);
  // Read from the attempt log, which is the durable record. Everything here
  // reports nothing rather than guessing when the evidence is thin.
  const rec = recommendNext(state);
  const shape = weaknessShape(state);
  const faults = errorProfile(state).slice(0, 3);
  const trend = recentTrend(state).filter((t) => t.pct != null);
  const deltas = new Map(recencyDelta(state).map((d) => [d.key, d]));
  const timing = new Map(timingProfile(state).map((t) => [t.key, t]));
  const skills = subcategoryStats(state).filter((x) => x.enough).slice(0, 6);
  const answered = (state.attempts || []).length;
  const trendDelta =
    trend.length >= 2 ? Math.round((trend[trend.length - 1].pct - trend[0].pct) * 100) : null;
  const ERROR_LABEL = {
    'chain-selection': 'Choosing the parent chain',
    locant: 'Numbering and locants',
    'suffix-seniority': 'Which group takes the suffix',
    'substituent-order': 'Ordering the prefixes',
    valence: 'Bonds per atom',
    formula: 'Counting atoms',
    'stereo-descriptor': 'Stereochemistry descriptors',
    other: 'Something else',
  };
  const labelFor = (key) => {
    const [cat, fam] = key.split(':');
    return subcategoryMeta(cat, fam).label;
  };
  const week = state.progress.weekActivity;
  const thisWeek = week.reduce((a, b) => a + b, 0);

  return (
    <Screen>
      <Header title="Progress" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={[T.h1, { marginTop: 6, marginBottom: 14 }]}>Your progress</Text>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Ring pct={pct}>
            <Text style={[T.h2, { fontSize: 22 }]}>{Math.round(pct * 100)}%</Text>
          </Ring>
          <View style={{ flex: 1 }}>
            <Text style={T.h2}>
              {mastered} of {total}
            </Text>
            <Text style={[T.body, { fontWeight: '700', marginTop: 2 }]}>skills mastered</Text>
            <Text style={[T.sub, { marginTop: 6 }]}>
              Keep going — you're building strong foundations.
            </Text>
          </View>
        </Card>

        {/* A new student sees empty cards and concludes the screen is broken.
            The selectors correctly refuse to guess from thin evidence, so the
            screen has to say that rather than show nothing. */}
        {!rec && trend.length < 2 && !faults.length && !skills.length ? (
          <Card style={{ gap: 10, alignItems: 'center', paddingVertical: 26 }}>
            <Ionicons name="bar-chart-outline" size={30} color={C.faint} />
            <Text style={[T.h3, { textAlign: 'center' }]}>Nothing to show yet</Text>
            <Text style={[T.sub, { textAlign: 'center' }]}>
              {answered === 0
                ? 'Answer some questions and this page will show what you are good at, what is slipping, and what to work on next.'
                : `${answered} question${answered === 1 ? '' : 's'} so far. A few more and there will be enough to tell you something useful.`}
            </Text>
            <Pressable style={pr.recBtn} onPress={() => goPractice && goPractice()}>
              <Text style={pr.recBtnTxt}>Start practising</Text>
            </Pressable>
          </Card>
        ) : null}

        {trend.length >= 2 ? (
          <>
            <Text style={pr.sectionTitle}>Last {trend.length} weeks</Text>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={[T.h2, { flex: 1 }]}>
                  {Math.round(trend[trend.length - 1].pct * 100)}%
                </Text>
                {trendDelta != null ? (
                  <Pill
                    label={`${trendDelta >= 0 ? '▲' : '▼'} ${Math.abs(trendDelta)} pts`}
                    kind={trendDelta >= 0 ? 'recommended' : 'plus'}
                  />
                ) : null}
              </View>
              <View style={pr.sparkRow}>
                {trend.map((t, i) => (
                  <View key={i} style={pr.sparkCol}>
                    <View style={[pr.sparkBar, { height: Math.max(4, t.pct * 56) }]} />
                  </View>
                ))}
              </View>
              <Text style={T.tiny}>
                {trend.reduce((a, t) => a + t.asked, 0)} questions answered
              </Text>
            </Card>
          </>
        ) : null}

        {rec && analytics.allowed ? (
          <>
            <Text style={pr.sectionTitle}>Recommended next</Text>
            <Card style={pr.recCard}>
              <Text style={pr.recKicker}>RECOMMENDED NEXT</Text>
              <Text style={[T.h2, { marginTop: 4 }]}>{labelFor(rec.key)}</Text>
              <Text style={[T.sub, { marginTop: 6 }]}>
                {`You're at ${Math.round(rec.pct * 100)}% overall`}
                {rec.recentPct != null && rec.direction === 'improving'
                  ? `, but ${Math.round(rec.recentPct * 100)}% in the last two weeks — it's moving.`
                  : rec.recentPct != null
                  ? `, and ${Math.round(rec.recentPct * 100)}% recently — it hasn't shifted yet.`
                  : '.'}
                {` ${rec.suggested} more should settle it.`}
              </Text>
              <Pressable
                style={pr.recBtn}
                onPress={() =>
                  practiceFocus
                    ? practiceFocus(rec.key, rec.suggested, labelFor(rec.key))
                    : goPractice && goPractice()
                }
              >
                <Text style={pr.recBtnTxt}>Practise {rec.suggested} questions</Text>
              </Pressable>
            </Card>
          </>
        ) : null}

        {(shape || rec) && analytics.allowed ? (
          <>
            <Text style={pr.sectionTitle}>What's going on</Text>
            <Card style={{ gap: 12 }}>
              {shape ? (
                <View style={pr.dxRow}>
                  <Ionicons name="git-compare-outline" size={18} color={C.teal} />
                  <View style={{ flex: 1 }}>
                    <Text style={[T.body, { fontWeight: '800' }]}>
                      {shape.kind === 'skill'
                        ? 'Skill, not chemistry'
                        : shape.kind === 'family'
                        ? 'Chemistry, not skill'
                        : 'Both skill and chemistry'}
                    </Text>
                    <Text style={T.sub}>
                      {shape.kind === 'skill'
                        ? `${(CATEGORY_META[shape.worstSkill.k] || { label: shape.worstSkill.k }).label} is weaker than everything else you've tried, whichever family it's on.`
                        : shape.kind === 'family'
                        ? `${shape.worstFamily.k}s are weaker than the other families, whichever way they're asked.`
                        : `${(CATEGORY_META[shape.worstSkill.k] || { label: shape.worstSkill.k }).label} and ${shape.worstFamily.k}s are both behind — they're close enough that it's worth working on each.`}
                    </Text>
                  </View>
                </View>
              ) : null}
              {rec && rec.effortful ? (
                <View style={pr.dxRow}>
                  <Ionicons name="hourglass-outline" size={18} color={C.teal} />
                  <View style={{ flex: 1 }}>
                    <Text style={[T.body, { fontWeight: '800' }]}>Effortful even when right</Text>
                    <Text style={T.sub}>
                      {(() => {
                        const t = timing.get(rec.key);
                        return t && t.msRight && t.baselineMs
                          ? `This takes you ${Math.round(t.msRight / 1000)}s when correct, against ${Math.round(t.baselineMs / 1000)}s elsewhere.`
                          : 'Correct, but slower than your other work.';
                      })()}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {faults.length ? (
          <>
            <Text style={pr.sectionTitle}>Where the marks go</Text>
            <Card style={{ gap: 12 }}>
              {faults.map((f) => (
                <View key={f.klass} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={[T.body, { flex: 1 }]}>{ERROR_LABEL[f.klass] || f.klass}</Text>
                  <Text style={[T.body, { fontWeight: '800' }]}>{Math.round(f.share * 100)}%</Text>
                </View>
              ))}
              <Text style={T.tiny}>
                Share of the questions you have got wrong, by the kind of mistake.
              </Text>
            </Card>
          </>
        ) : null}

        {skills.length ? (
          <>
            <Text style={pr.sectionTitle}>By skill</Text>
            <Card style={{ gap: 12 }}>
              {skills.map((sk) => (
                <View key={sk.key} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={[T.body, { flex: 1 }]} numberOfLines={1}>{labelFor(sk.key)}</Text>
                    <Text style={[T.body, { fontWeight: '800' }]}>
                      {sk.right}/{sk.asked}
                    </Text>
                    {(() => {
                      const d = deltas.get(sk.key);
                      if (!d || d.direction === 'unknown' || d.direction === 'steady') {
                        return <Text style={pr.arrowFlat}>–</Text>;
                      }
                      return (
                        <Text style={d.direction === 'improving' ? pr.arrowUp : pr.arrowDown}>
                          {d.direction === 'improving' ? '▲' : '▼'}
                        </Text>
                      );
                    })()}
                  </View>
                  <View style={pr.bar}>
                    <View style={[pr.barFill, { width: `${Math.max(3, sk.pct * 100)}%` }]} />
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <Text style={pr.sectionTitle}>Skill breakdown</Text>
        <Card style={{ gap: 14 }}>
          {state.progress.skills.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconBadge name={SKILL_ICONS[s.id] || 'ellipse-outline'} size={32} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[T.body, { fontWeight: '600' }]}>{s.label}</Text>
                  <Text style={T.sub}>
                    {s.mastered} / {s.total}
                  </Text>
                </View>
                <ProgressBar pct={s.mastered / s.total} color={C.green} height={6} style={{ marginTop: 6 }} />
              </View>
            </View>
          ))}
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={pr.sectionTitle}>Weekly activity</Text>
          <Text style={[T.tiny, { marginBottom: 10 }]}>This week: {thisWeek}</Text>
        </View>
        <Card>
          <WeekChart data={week} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={[T.tiny, { width: 30, textAlign: 'center' }]}>
                {d}
              </Text>
            ))}
          </View>
        </Card>

        <Card
          tint="green"
          style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          onPress={() => goPractice('mixed')}
        >
          <IconBadge name="flash-outline" bg="#DDF0CC" color={C.greenText} />
          <View style={{ flex: 1 }}>
            <Text style={T.tiny}>Recommended next step</Text>
            <Text style={[T.h3, { marginTop: 2 }]}>Strengthen branched alkenes</Text>
            <Text style={[T.tiny, { marginTop: 2 }]}>10 questions - about 15 min</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.greenText} />
        </Card>

        {/* Entitlement-gated deep analytics (Plus) */}
        <Card
          style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          onPress={
            analytics.allowed
              ? undefined
              : () =>
                  Alert.alert(
                    'Catalyst Plus feature',
                    'Mastery diagnosis breaks results down by question type and error pattern. Redeem an access code in the Account tab to unlock Plus.'
                  )
          }
        >
          <IconBadge name="stats-chart-outline" />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={T.h3}>Mastery diagnosis</Text>
              {!analytics.allowed ? <Pill label="Plus" kind="plus" /> : null}
            </View>
            <Text style={[T.tiny, { marginTop: 2 }]}>
              {analytics.allowed
                ? 'By question type and error pattern — populates as the engine logs attempts.'
                : 'Break down mastery by question type and error pattern.'}
            </Text>
          </View>
          {!analytics.allowed ? <Ionicons name="lock-closed" size={16} color={C.faint} /> : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

// Simple SVG line chart of the week's answered-question counts.
function WeekChart({ data }) {
  const W = 300;
  const H = 110;
  const pad = 14;
  const max = Math.max(...data, 1);
  const step = (W - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => [pad + i * step, H - pad - (v / max) * (H - pad * 2)]);
  const ptsStr = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={C.border} strokeWidth={1} />
      <Polyline points={ptsStr} fill="none" stroke={C.teal} strokeWidth={2.5} strokeLinejoin="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill={C.teal} />
      ))}
    </Svg>
  );
}

const pr = StyleSheet.create({
  bar: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 60, marginVertical: 10 },
  sparkCol: { flex: 1, justifyContent: 'flex-end' },
  sparkBar: { borderRadius: 3, backgroundColor: C.teal, opacity: 0.85 },
  recCard: { backgroundColor: C.tealSoft, borderColor: C.tealBorder, gap: 2 },
  recKicker: { fontSize: 11, fontWeight: '800', color: C.teal, letterSpacing: 0.7 },
  recBtn: {
    backgroundColor: C.teal, borderRadius: R.md, minHeight: 48,
    alignItems: 'center', justifyContent: 'center', marginTop: 14,
  },
  recBtnTxt: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  dxRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  arrowUp: { fontSize: 12, color: C.greenText, width: 14, textAlign: 'right' },
  arrowDown: { fontSize: 12, color: C.danger, width: 14, textAlign: 'right' },
  arrowFlat: { fontSize: 12, color: C.faint, width: 14, textAlign: 'right' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.teal },
  sectionTitle: { ...T.h3, marginTop: 20, marginBottom: 10 },
});
