// Progress tab — mastery ring, skill breakdown, weekly activity
// chart and recommended next step (mockup screen 4). The deep
// "diagnosis" analytics card is the second live entitlement gate.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { C, T } from '../../theme';
import { Screen, Header, Card, Ring, ProgressBar, IconBadge, Pill } from '../../components/ui';
import { useApp, useEntitlement, skillTotals } from '../../state/store';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SKILL_ICONS = {
  nomenclature: 'shapes-outline',
  drawing: 'create-outline',
  functional: 'flask-outline',
  stereo: 'cube-outline',
};

export function Progress({ goPractice }) {
  const { state } = useApp();
  const analytics = useEntitlement('deepAnalytics');
  const { mastered, total, pct } = skillTotals(state);
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
                    'Structura Plus feature',
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
  sectionTitle: { ...T.h3, marginTop: 20, marginBottom: 10 },
});
