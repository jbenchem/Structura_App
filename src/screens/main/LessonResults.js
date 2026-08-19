// ─────────────────────────────────────────────────────────────
// Lesson results.
//
// Shown once a lesson finishes: how it went, broken down by the kind of
// question. The breakdown is the point — "8 of 10" says little, whereas
// "3/3 naming, 1/2 drawing" says what to practise next.
//
// Everything here comes from what actually happened in the lesson; nothing is
// estimated or filled in.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { AccuracyRing, LessonBadge, GOLD } from '../../components/AccuracyRing';
import { CATEGORY_META, subcategoryMeta } from '../../content/questionFactory';
import { useViewport } from '../../components/DeviceFrame';

// The results have to fit the screen: scrolling to find out how you did is a
// poor reward for finishing. Everything is sized from the height available,
// and the breakdown keeps only as many rows as will fit — the rest are summed
// into a final row so nothing is silently dropped.
function resultsSizing(vp, rows) {
  const h = vp.height || 800;
  const tight = h < 700;
  const veryTight = h < 600;
  return {
    badge: veryTight ? 76 : tight ? 92 : 112,
    heading: veryTight ? 22 : tight ? 26 : 29,
    ring: veryTight ? 92 : tight ? 104 : 118,
    gap: veryTight ? 8 : 14,
    rowH: veryTight ? 34 : tight ? 38 : 44,
    showSub: !veryTight,
    maxRows: Math.max(3, Math.floor((h - (veryTight ? 430 : tight ? 470 : 520)) / (tight ? 38 : 44))),
  };
}

const fmtTime = (ms) => {
  if (!ms || ms < 0) return '—';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};

export function LessonResults({
  unit,
  lesson,
  score,
  byCategory,
  elapsedMs,
  unitProgress,
  onContinue,
  onReview,
  onClose,
}) {
  const vp = useViewport();
  const entries = Object.entries(byCategory);
  const z = resultsSizing(vp, entries.length);
  const pct = score.asked ? (score.right / score.asked) * 100 : 0;
  const perfect = score.asked > 0 && score.right === score.asked;
  const missed = score.asked - score.right;

  // The category that went worst, and only if something actually went wrong.
  // The weakest SUBcategory, so the prompt is specific: "Drawing alkenes"
  // tells a learner what to practise, "Drawing structures" does not.
  const subs = [];
  for (const [cat, v] of Object.entries(byCategory)) {
    for (const [key, sv] of Object.entries(v.subs || {})) {
      if (sv.asked > 0 && sv.right < sv.asked) {
        const [, family] = key.split(':');
        subs.push({ ...subcategoryMeta(cat, family), ...sv });
      }
    }
    if (!v.subs && v.asked > 0 && v.right < v.asked) {
      subs.push({ ...(CATEGORY_META[cat] || { label: cat }), ...v });
    }
  }
  const weakest = subs.sort((a, b) => a.right / a.asked - b.right / b.asked)[0];

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={lr.top}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="close">
          <Ionicons name="close" size={24} color={C.navy} />
        </Pressable>
        <Text style={lr.topTitle}>Lesson results</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginTop: 6 }}>
          <LessonBadge topic={(unit.topics && unit.topics[0]) || 'alkanes'} size={z.badge} />
          <Text style={[lr.heading, { fontSize: z.heading, marginTop: z.gap }]}>
            {perfect ? 'Perfect lesson' : 'Lesson complete'}
          </Text>
          <Text style={lr.lessonName}>{lesson.title}</Text>
          {z.showSub ? <Text style={lr.sub}>Here's how you went.</Text> : null}
        </View>

        <View style={lr.statCard}>
          <AccuracyRing pct={pct} size={z.ring} stroke={10} />
          <View style={lr.divider} />
          <View style={lr.stat}>
            <Text style={lr.statValue}>
              {score.right} / {score.asked}
            </Text>
            <Text style={lr.statLabel}>Correct</Text>
          </View>
          <View style={lr.divider} />
          <View style={lr.stat}>
            <Text style={lr.statValue}>{fmtTime(elapsedMs)}</Text>
            <Text style={lr.statLabel}>Time</Text>
          </View>
        </View>

        {entries.length ? (
          <>
            <Text style={lr.sectionTitle}>Question breakdown</Text>
            <View style={lr.card}>
              {(() => {
                const sorted = [...entries].sort((a, b) => b[1].asked - a[1].asked);
                const head = sorted.slice(0, z.maxRows);
                const tail = sorted.slice(z.maxRows);
                const rows = tail.length
                  ? [
                      ...head,
                      [
                        '__other',
                        {
                          right: tail.reduce((a, [, v]) => a + v.right, 0),
                          asked: tail.reduce((a, [, v]) => a + v.asked, 0),
                          label: `${tail.length} more`,
                        },
                      ],
                    ]
                  : head;
                return rows;
              })().map(([key, v], i, arr) => {
                const meta =
                  key === '__other'
                    ? { label: v.label, icon: 'ellipsis-horizontal' }
                    : CATEGORY_META[key] || { label: key, icon: 'help-outline' };
                const ratio = v.asked ? v.right / v.asked : 0;
                return (
                  <View
                    key={key}
                    style={[lr.row, { minHeight: z.rowH }, i < arr.length - 1 && lr.rowDivider]}
                  >
                    <View style={lr.rowIcon}>
                      <Ionicons name={meta.icon} size={18} color={C.teal} />
                    </View>
                    <Text style={lr.rowLabel} numberOfLines={1}>
                      {meta.label}
                    </Text>
                    <Text style={lr.rowScore}>
                      {v.right} / {v.asked}
                    </Text>
                    <View style={lr.bar}>
                      <View
                        style={[
                          lr.barFill,
                          { width: `${Math.max(4, ratio * 100)}%`, backgroundColor: ratio === 1 ? C.teal : C.teal },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {weakest ? (
          <Pressable style={lr.reviewCard} onPress={onReview} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={lr.reviewKicker}>REVIEW NEXT</Text>
              <Text style={lr.reviewTitle}>{weakest.label}</Text>
              <Text style={lr.reviewSub}>
                {missed === 1
                  ? 'Review the question that caused difficulty.'
                  : `Review the ${missed} questions that caused difficulty.`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.navy} />
          </Pressable>
        ) : null}

        {unitProgress ? (
          <View style={{ marginTop: 18 }}>
            <Text style={lr.progressLabel}>
              {unit.title} · {unitProgress.done} of {unitProgress.total} lessons complete
            </Text>
            <View style={lr.progressTrack}>
              <View
                style={[
                  lr.progressFill,
                  { width: `${Math.round((unitProgress.done / unitProgress.total) * 100)}%` },
                ]}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Pressable style={lr.cta} onPress={onContinue}>
        <Text style={lr.ctaTxt}>Continue</Text>
      </Pressable>
      {missed > 0 ? (
        <Pressable style={lr.ctaGhost} onPress={onReview}>
          <Text style={lr.ctaGhostTxt}>
            Review {missed} {missed === 1 ? 'mistake' : 'mistakes'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const lr = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.navy },
  heading: { fontSize: 30, fontWeight: '800', color: C.navy, marginTop: 14, letterSpacing: -0.6 },
  lessonName: { fontSize: 17, fontWeight: '700', color: C.navy, marginTop: 2 },
  sub: { fontSize: 14.5, color: C.sub, marginTop: 6 },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginTop: 14,
  },
  divider: { width: 1, height: 54, backgroundColor: C.border },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: C.navy },
  statLabel: { fontSize: 12.5, color: C.sub, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.navy, marginTop: 16, marginBottom: 6 },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.tealBorder,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 14, color: C.navy },
  rowScore: { fontSize: 14, fontWeight: '700', color: C.navy, width: 46, textAlign: 'right' },
  bar: { width: 78, height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginTop: 18,
  },
  reviewKicker: { fontSize: 11, fontWeight: '800', color: C.teal, letterSpacing: 0.7 },
  reviewTitle: { fontSize: 17, fontWeight: '800', color: C.navy, marginTop: 4 },
  reviewSub: { fontSize: 13, color: C.sub, marginTop: 4 },
  progressLabel: { fontSize: 13, color: C.navy, marginBottom: 8 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: C.border, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: C.teal },
  cta: {
    backgroundColor: C.teal,
    borderRadius: R.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  ctaTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ctaGhost: {
    borderWidth: 1.5,
    borderColor: C.teal,
    borderRadius: R.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  ctaGhostTxt: { color: C.teal, fontSize: 16, fontWeight: '700' },
});
