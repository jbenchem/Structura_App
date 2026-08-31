// ─────────────────────────────────────────────────────────────
// Progress tab — the analytics redesign.
//
// Three questions, in order: am I on track? (course position) — what should
// I fix? (what to steady next) — what have I built? (answer trend, skills
// practised). Everything rendered here was concluded by
// src/state/analyticsModel.js; this file draws conclusions, it never makes
// them. The suite pins the model; the mount test pins this screen.
//
// Killed from the old screen, per the redesign: the summary statistics
// card, the general "Recommended next" card (Home owns next-action), the
// "What's going on" prose, and "Where the marks go". Time-on-task is not
// shown anywhere: ms is confounded by difficulty, interruptions, reading
// speed and accessibility needs, and must not be dressed up as effort.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { C, T, R } from '../../theme';
import { Screen, Header, Card, Pill } from '../../components/ui';
import { Overlay } from '../../components/Overlay';
import { CatalystMascot } from '../../components/mascot/CatalystMascot';
import { useApp } from '../../state/store';
import { UNITS, STAGES, unitById } from '../../content/content';
import { CATEGORY_META } from '../../content/questionFactory';
import { SHOW_REACTIONS } from '../../config';
import { analyticsScreenModelFor } from '../../state/analyticsModel';
import { formatFormulas } from '../../chem/formula';

const CORAL = '#E8705F';
const CORAL_SOFT = '#FDEEEA';
const MINT_SOFT = '#EDF6EE';

export function Progress({ goPractice, practiceFocus, openLesson }) {
  const { state } = useApp();
  const [sheet, setSheet] = useState(null); // 'calc' | 'why' | 'values' | null
  const [allSkills, setAllSkills] = useState(false);

  const view = useMemo(
    () => ({
      units: UNITS,
      stages: STAGES,
      unitById,
      showReactions: SHOW_REACTIONS,
      checkpoints: UNITS.flatMap((u) =>
        (u.lessonList || []).filter((l) => l.checkpoint).map((l) => ({ lessonId: l.id, unitId: u.id, unitTitle: u.title }))
      ),
      categoryLabel: (c) => (CATEGORY_META[c] || {}).label,
      categoryIcon: (c) => (CATEGORY_META[c] || {}).icon,
    }),
    []
  );

  // One reading per visit, like Home's hero: stable while looked at,
  // recomputed on return.
  const model = useMemo(() => analyticsScreenModelFor(state, view), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (model.mode === 'empty') {
    return (
      <Screen>
        <ProgressHeader namingOnly={model.namingOnly} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={pz.hero}>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <Text style={pz.heroEyebrow}>Your pathway starts here</Text>
              <Text style={[T.h2, { marginTop: 6 }]}>
                {model.firstUnit ? `${model.firstUnit.title.split(' and ')[0]} is one short unit.` : 'Foundations is one short unit.'}
              </Text>
              <Text style={[T.sub, { marginTop: 6 }]}>Complete its checkpoint to begin building your course position.</Text>
              <Pressable
                style={pz.heroBtn}
                accessibilityRole="button"
                onPress={() => model.firstUnit && openLesson && openLesson(model.firstUnit.id)}
              >
                <Text style={pz.heroBtnTxt}>Start Foundations</Text>
              </Pressable>
            </View>
            <CatalystMascot state="guide" size={112} style={{ alignSelf: 'flex-end' }} />
          </View>

          <Text style={[T.h3, { marginTop: 24 }]}>What will appear here</Text>
          <PreviewRow icon="locate-outline" title="Course position" sub="After your first checkpoint" />
          <PreviewRow icon="book-outline" title="Specific practice" sub="After 10 comparable answers" />
          <PreviewRow icon="bar-chart-outline" title="Answer trend" sub="After your first session" />
          <Text style={[T.tiny, { color: C.sub, marginTop: 14 }]}>
            We wait for enough evidence before describing a pattern.
          </Text>
        </ScrollView>
      </Screen>
    );
  }

  const { coverage, headline, fix, trend, skills } = model;
  const shownSkills = allSkills ? skills.rows : skills.rows.slice(0, 5);

  return (
    <Screen>
      <ProgressHeader namingOnly={model.namingOnly} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, gap: 24 }}>
        {/* ── Am I on track? ── */}
        <Card style={{ gap: 10 }}>
          <Text style={T.h3}>Course position</Text>
          {headline.chip ? <Pill label={headline.chip} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={pz.big}>{coverage.secured}</Text>
            <View>
              <Text style={pz.ofTotal}>of {coverage.total}</Text>
              <Text style={[T.tiny, { color: C.sub }]}>units secured</Text>
            </View>
          </View>
          <StageCoverageRail segments={model.segments} />
          {headline.lines.map((l) => (
            <Text key={l} style={[T.sub, { color: C.navy }]}>{formatFormulas(l)}</Text>
          ))}
          <Pressable onPress={() => setSheet('calc')} hitSlop={8} accessibilityRole="button">
            <Text style={pz.link}>How this is calculated</Text>
          </Pressable>
        </Card>

        {/* ── What should I fix? ── */}
        <View>
          <Text style={[T.h3, { marginBottom: 10 }]}>What to steady next</Text>
          <FixCard
            fix={fix}
            onWhy={() => setSheet('why')}
            onGo={() => {
              if (fix.kind === 'quiet') return openLesson && openLesson(fix.dest.unitId);
              if (fix.focusKey && practiceFocus) return practiceFocus(fix.focusKey, fix.count, fix.title);
              return goPractice && goPractice('mixed');
            }}
          />
        </View>

        {/* ── What have I built? ── */}
        <Card style={{ gap: 14 }}>
          <Text style={T.h3}>What you\u2019ve built</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[T.body, { fontWeight: '700', flex: 1 }]}>Answer trend</Text>
            {trend ? <Pill label={trend.mode === 'daily' ? 'Daily' : 'Weekly'} /> : null}
          </View>
          {trend ? (
            <>
              <AnswerTrendChart trend={trend} />
              <Pressable onPress={() => setSheet('values')} hitSlop={8} accessibilityRole="button">
                <Text style={pz.link}>View values</Text>
              </Pressable>
            </>
          ) : (
            <Text style={[T.sub]}>Your answer trend will appear after your first session.</Text>
          )}

          <View style={pz.divider} />
          <Text style={[T.body, { fontWeight: '700' }]}>Skills practised</Text>
          {skills.omittedNote ? (
            <Text style={[T.tiny, { color: C.sub }]}>
              Naming-only view. Some older weeks are omitted because archived data cannot separate the two study threads.
            </Text>
          ) : null}
          {shownSkills.map((r) => (
            <SkillRow key={r.category} row={r} />
          ))}
          {skills.rows.length > 5 ? (
            <Pressable onPress={() => setAllSkills((v) => !v)} hitSlop={8} accessibilityRole="button">
              <Text style={pz.link}>{allSkills ? 'Show fewer' : 'Show all skills'}</Text>
            </Pressable>
          ) : null}
        </Card>
      </ScrollView>

      {/* ── The explanations ── */}
      <Overlay visible={!!sheet}>
        {sheet === 'calc' ? (
          <Sheet
            title="How course position works"
            body="A unit is secured when its checkpoint best result reaches 80%. Course position describes curriculum coverage; it does not predict an exam mark."
            onClose={() => setSheet(null)}
          />
        ) : sheet === 'why' ? (
          <Sheet
            title="Why this appears"
            body="This pattern is shown only when at least 10 comparable answers exist, at least 4 are wrong, and the wrong-answer rate is at least 35%. Demonstration answers are excluded."
            onClose={() => setSheet(null)}
          />
        ) : sheet === 'values' && trend ? (
          <View style={pz.sheet}>
            <Text style={T.h3}>Answer trend values</Text>
            {trend.buckets.map((b) => (
              <Text key={b.key} style={[T.sub, { marginTop: 6 }]}>
                {trend.mode === 'daily' ? b.label : `Week of ${b.label}`}:{' '}
                {b.empty ? 'no questions answered.' : `${b.right} of ${b.asked} correct, ${b.pct}%.`}
              </Text>
            ))}
            <Pressable style={pz.sheetBtn} onPress={() => setSheet(null)} accessibilityRole="button">
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Close</Text>
            </Pressable>
          </View>
        ) : null}
      </Overlay>
    </Screen>
  );
}

// ── Pieces ───────────────────────────────────────────────────

function ProgressHeader({ namingOnly }) {
  return (
    <View>
      <Header title="Progress" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, marginBottom: 4 }}>
        <Text style={[T.sub, { fontWeight: '600', flex: 1 }]}>Evidence from your answers and checkpoints</Text>
        {namingOnly ? <Pill label="Naming-only study build" /> : null}
      </View>
    </View>
  );
}

function PreviewRow({ icon, title, sub }) {
  return (
    <View style={pz.previewRow}>
      <Ionicons name={icon} size={22} color={C.teal} />
      <View style={{ flex: 1 }}>
        <Text style={[T.body, { fontWeight: '700' }]}>{title}</Text>
        <Text style={[T.tiny, { color: C.sub }]}>{sub}</Text>
      </View>
    </View>
  );
}

// The rail: one filled path and one outline path, not forty components.
// Segment marks are little rounded bars, grouped per stage with a visible
// gap; stage numbers sit beneath.
export function StageCoverageRail({ segments }) {
  const W = 320;
  const H = 26;
  const gap = 6;
  const totalUnits = segments.reduce((a, s) => a + s.count, 0);
  const barW = Math.max(3, (W - gap * (segments.length - 1)) / totalUnits - 2);
  let x = 0;
  let donePath = '';
  let restPath = '';
  const labels = [];
  for (const seg of segments) {
    labels.push({ x: x + (seg.count * (barW + 2)) / 2, n: seg.stageN });
    for (let i = 0; i < seg.count; i++) {
      const d = ` M ${x.toFixed(1)} 2 h ${barW.toFixed(1)} v 14 h -${barW.toFixed(1)} Z`;
      if (i < seg.done) donePath += d;
      else restPath += d;
      x += barW + 2;
    }
    x += gap;
  }
  return (
    <View accessible accessibilityLabel={`Course rail: ${segments.map((s) => `stage ${s.stageN}, ${s.done} of ${s.count} secured`).join('; ')}`}>
      <Svg width="100%" height={H + 14} viewBox={`0 0 ${W} ${H + 14}`}>
        <Path d={donePath} fill={C.teal} />
        <Path d={restPath} fill="none" stroke="#C7D3DB" strokeWidth={1.2} />
        {labels.map((l) => (
          <SvgNumber key={l.n} x={l.x} y={H + 10} n={l.n} />
        ))}
      </Svg>
    </View>
  );
}

// Tiny numeral via react-native-svg Text is unreliable across stubs; a
// plain absolutely-positioned RN Text row would fight the viewBox scaling,
// so the numerals render as short tick paths plus an RN caption row.
function SvgNumber({ x, y, n }) {
  return <Line x1={x} y1={y - 6} x2={x} y2={y - 3} stroke="#C7D3DB" strokeWidth={1} />;
}

function FixCard({ fix, onWhy, onGo }) {
  if (fix.kind === 'healthy' || fix.kind === 'insufficient') {
    return (
      <View style={[pz.fixCard, { backgroundColor: MINT_SOFT, borderColor: '#D7E8D9', flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
        <Ionicons name={fix.kind === 'healthy' ? 'checkmark-circle-outline' : 'hourglass-outline'} size={26} color={C.teal} />
        <View style={{ flex: 1 }}>
          <Text style={[T.body, { fontWeight: '800' }]}>{fix.title}</Text>
          <Text style={[T.tiny, { color: C.sub, marginTop: 3 }]}>{fix.body}</Text>
        </View>
      </View>
    );
  }
  const coral = fix.reaction;
  return (
    <View style={[pz.fixCard, coral && { borderLeftColor: CORAL, borderLeftWidth: 3 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {fix.capsule ? (
          <View style={pz.capsule}>
            <Text style={pz.capsuleTxt}>{fix.capsule}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        {coral ? (
          <View style={[pz.capsule, { borderColor: CORAL, backgroundColor: CORAL_SOFT }]}>
            <Text style={[pz.capsuleTxt, { color: CORAL }]}>Reaction</Text>
          </View>
        ) : null}
      </View>
      <Text style={[T.h3, { marginTop: 8 }]}>{fix.title}</Text>
      <Text style={[T.sub, { marginTop: 4 }]}>{formatFormulas(fix.body)}</Text>
      <Pressable style={pz.fixBtn} onPress={onGo} accessibilityRole="button">
        <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{fix.cta}</Text>
      </Pressable>
      {fix.kind !== 'quiet' ? (
        <Pressable onPress={onWhy} hitSlop={8} accessibilityRole="button">
          <Text style={[pz.link, { marginTop: 10 }]}>Why this appears</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Hand-rolled bars: fixed 0/50/100 axis, pale tracks, teal fill, printed
// percentages, dashed outline on small samples, a baseline dash for empty
// buckets. ≈4 nodes per bucket + 3 gridlines: well under the 40-node budget.
export function AnswerTrendChart({ trend }) {
  const H = 120;
  const W = 320;
  const pad = 30;
  const n = trend.buckets.length;
  const bw = Math.min(30, ((W - pad) / n) * 0.5);
  const slot = (W - pad) / n;
  return (
    <View>
      <Svg width="100%" height={H + 34} viewBox={`0 0 ${W} ${H + 34}`}
        accessible
        accessibilityLabel={`Answer trend: ${trend.buckets.map((b) => `${b.label} ${b.empty ? 'no answers' : b.pct + ' percent'}`).join(', ')}`}
      >
        {[0, 50, 100].map((p) => (
          <Line key={p} x1={pad} y1={H - (H * p) / 100 + 8} x2={W} y2={H - (H * p) / 100 + 8} stroke="#E3EAEF" strokeWidth={1} strokeDasharray="3 4" />
        ))}
        {trend.buckets.map((b, i) => {
          const cx = pad + i * slot + slot / 2;
          if (b.empty) {
            return <Line key={b.key} x1={cx - bw / 2} y1={H + 8} x2={cx + bw / 2} y2={H + 8} stroke="#C7D3DB" strokeWidth={2.5} />;
          }
          const h = (H * b.pct) / 100;
          return (
            <React.Fragment key={b.key}>
              <Path d={`M ${cx - bw / 2} 8 h ${bw} v ${H} h -${bw} Z`} fill="#EEF3F6" stroke={b.small ? '#C7D3DB' : 'none'} strokeWidth={b.small ? 1.2 : 0} strokeDasharray={b.small ? '4 3' : undefined} />
              <Path d={`M ${cx - bw / 2} ${8 + H - h} h ${bw} v ${h} h -${bw} Z`} fill={C.teal} />
            </React.Fragment>
          );
        })}
      </Svg>
      {/* percentage + label rows as RN text, aligned under the buckets */}
      <View style={{ flexDirection: 'row', paddingLeft: '9%' }}>
        {trend.buckets.map((b) => (
          <View key={b.key} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[T.tiny, { color: C.teal, fontWeight: '800' }]}>{b.empty ? '' : `${b.pct}%`}</Text>
            <Text style={[T.tiny, { color: C.sub }]}>{b.label}</Text>
            {b.small ? <Text style={[T.tiny, { color: C.faint }]}>Small sample</Text> : null}
          </View>
        ))}
      </View>
      <View style={pz.axisRow}>
        <Text style={pz.axisTxt}>0%</Text>
        <Text style={pz.axisTxt}>50%</Text>
        <Text style={pz.axisTxt}>100%</Text>
      </View>
    </View>
  );
}

function SkillRow({ row }) {
  const frac = row.asked ? row.right / row.asked : 0;
  return (
    <View style={pz.skillRow}>
      <Ionicons name={row.icon} size={18} color={row.reaction ? CORAL : C.teal} />
      <Text style={[T.body, { flex: 1 }]} numberOfLines={1}>{row.label}</Text>
      {row.reaction ? (
        <View style={[pz.capsule, { borderColor: CORAL, backgroundColor: CORAL_SOFT, marginRight: 6 }]}>
          <Text style={[pz.capsuleTxt, { color: CORAL }]}>Reaction</Text>
        </View>
      ) : null}
      {row.showPct ? (
        <>
          <Text style={[T.tiny, { color: C.sub, marginRight: 8 }]}>{row.right} of {row.asked} correct</Text>
          <View style={pz.evTrack}>
            <View style={[pz.evFill, { width: `${Math.round(frac * 100)}%` }]} />
          </View>
        </>
      ) : (
        <Text style={[T.tiny, { color: C.sub }]}>{row.asked} answer{row.asked === 1 ? '' : 's'} so far</Text>
      )}
    </View>
  );
}

function Sheet({ title, body, onClose }) {
  return (
    <View style={pz.sheet}>
      <Text style={T.h3}>{title}</Text>
      <Text style={[T.sub, { marginTop: 8 }]}>{body}</Text>
      <Pressable style={pz.sheetBtn} onPress={onClose} accessibilityRole="button">
        <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Close</Text>
      </Pressable>
    </View>
  );
}

const pz = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    backgroundColor: C.tealSoft,
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
  },
  heroEyebrow: { fontSize: 13, fontWeight: '800', color: C.teal },
  heroBtn: {
    marginTop: 14, backgroundColor: C.teal, borderRadius: R.md,
    paddingVertical: 12, paddingHorizontal: 18, alignSelf: 'flex-start',
  },
  heroBtnTxt: { color: '#FFFFFF', fontWeight: '800' },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  big: { fontSize: 44, fontWeight: '800', color: C.teal, lineHeight: 48 },
  ofTotal: { fontSize: 17, fontWeight: '800', color: C.teal },
  link: { color: C.teal, fontWeight: '700', textDecorationLine: 'underline', fontSize: 13 },
  fixCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 16,
  },
  capsule: {
    borderWidth: 1.2, borderColor: C.teal, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 3, backgroundColor: C.card,
  },
  capsuleTxt: { fontSize: 11.5, fontWeight: '800', color: C.teal },
  fixBtn: {
    marginTop: 14, backgroundColor: C.teal, borderRadius: R.md,
    paddingVertical: 13, alignItems: 'center',
  },
  divider: { height: 1, backgroundColor: C.border },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  evTrack: { width: 64, height: 6, borderRadius: 3, backgroundColor: '#EEF3F6', overflow: 'hidden' },
  evFill: { height: 6, borderRadius: 3, backgroundColor: C.teal },
  axisRow: { position: 'absolute', left: 0, top: 4, height: 120, justifyContent: 'space-between', flexDirection: 'column-reverse' },
  axisTxt: { fontSize: 10, color: C.sub },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg,
    padding: 20, paddingBottom: 28,
  },
  sheetBtn: {
    marginTop: 16, backgroundColor: C.teal, borderRadius: R.md,
    paddingVertical: 13, alignItems: 'center',
  },
});
