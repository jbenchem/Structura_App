// Learn tab — the terrain.
//
// The curriculum drawn as a metro route: naming units on the teal main
// line, reaction units in a coral side lane, a checkpoint station per unit,
// a double-ring interchange when a stage is complete. All geometry comes
// from learnTerrain.js (pure, tested); this file only renders rows.
//
// Performance model: distant locked stages collapse into single bands, so
// only the neighbourhood of the current position mounts full stations —
// typically two stages, roughly a dozen small SVGs. Paths are static per
// row; nothing morphs while scrolling. The one continuous animation is the
// halo on "you are here".
//
// Stage celebrations live here now: the first time a stage is seen complete,
// the layered fireworks play over the route and the stage is marked, so the
// moment fires exactly once — on the transition, not on every revisit.

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { C, T, R } from '../../theme';
import { Screen, Header, Pill } from '../../components/ui';
import { Overlay } from '../../components/Overlay';
import { Fireworks } from '../../components/Fireworks';
import { useApp, unitStatus } from '../../state/store';
import { STAGES } from '../../content/content';
import { SHOW_REACTIONS } from '../../config';
import { buildTerrain, uncelebratedStages, TERRAIN, isReactionUnit } from './learnTerrain';
import { CatalystMascot } from '../../components/mascot';
import { formatFormulas } from '../../chem/formula';

const CORAL = '#E8705F';
const CORAL_SOFT = '#FDEEEA';
// Locked terrain stays ON the map: a tinted rail and slate stations, never
// ghost-grey on ghost-grey. The pathway ahead should read as pathway.
const RAIL_AHEAD = '#B7DCDC';
const LOCKED_INK = '#8A9AA6';

export function Learn({ openLesson }) {
  const { state, dispatch } = useApp();
  const { height: winH } = useWindowDimensions();
  const scrollRef = useRef(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [lockedSheet, setLockedSheet] = useState(null); // { unit, nextTitle }
  const [celebrating, setCelebrating] = useState(null); // stage id

  const statusOf = (id) => unitStatus(state, id);
  const currentUnitId = state.progress.current.unitId;

  const terrain = useMemo(
    () => buildTerrain(STAGES, statusOf, { currentUnitId, expandedIds }),
    [state.progress, expandedIds] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // The first genuine look at a completed stage gets the fireworks. One
  // stage per visit is plenty — if two completed since last look, the next
  // visit celebrates the other.
  useEffect(() => {
    const due = uncelebratedStages(STAGES, statusOf, state.celebratedStages);
    if (due.length && !celebrating) {
      setCelebrating(due[0]);
      dispatch({ type: 'markStageCelebrated', stageId: due[0] });
    }
  }, [state.progress.completedUnits]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPressUnit = (unit, status) => {
    if (status === 'locked') {
      // The explanation sheet, not a rejection: name the door and the key.
      const stage = STAGES.find((s) => s.units.some((u) => u.id === unit.id));
      const currentStage = STAGES.find((s) => s.units.some((u) => u.id === currentUnitId));
      setLockedSheet({
        unit,
        stageTitle: stage ? stage.title : '',
        keyTitle: currentStage ? currentStage.title : 'the earlier units',
      });
      return;
    }
    openLesson(unit.id);
  };

  const locate = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, terrain.currentOffset - winH * 0.38),
      animated: true,
    });
  };

  const celebrated = celebrating ? STAGES.find((s) => s.id === celebrating) : null;

  return (
    <Screen>
      <Header title="Learn" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 10 }}>
        <Text style={[T.sub, { fontWeight: '600', flex: 1 }]}>Your learning pathway</Text>
        {!SHOW_REACTIONS ? <Pill label="Naming-only study build" /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
          {terrain.sections.map((section) =>
            section.collapsed ? (
              <CollapsedStage
                key={section.stage.id}
                section={section}
                onExpand={() => setExpandedIds((prev) => new Set([...prev, section.stage.id]))}
              />
            ) : (
              <StageBlock
                key={section.stage.id}
                section={section}
                currentUnitId={currentUnitId}
                currentLesson={state.progress.current.lesson || 1}
                onPressUnit={onPressUnit}
              />
            )
          )}
          <Text style={[T.tiny, { color: C.faint, textAlign: 'center', marginTop: 8 }]}>
            The pathway opens one stage at a time.
          </Text>
        </ScrollView>

        {/* The locator: back to "you are here" from anywhere. */}
        <Pressable onPress={locate} style={ls.locator} accessibilityRole="button" accessibilityLabel="Scroll to your current unit">
          <Ionicons name="locate" size={22} color="#FFFFFF" />
        </Pressable>

        {/* Stage celebration: fireworks over the terrain, once per stage. */}
        {celebrated ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Fireworks kind="normal" onDone={() => setCelebrating(null)} />
            <View style={ls.celebrateBanner}>
              {/* The one place Cat celebrates: a real, first-time stage completion. */}
              <CatalystMascot state="celebrate" size={96} style={{ alignSelf: 'center', marginBottom: 6 }} />
              <Text style={[T.h3, { color: C.teal }]}>{celebrated.title} complete</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Locked-unit sheet: an explanation with a door, never a shake. */}
      <Overlay visible={!!lockedSheet}>
        {lockedSheet ? (
          <View style={ls.sheet}>
            <Text style={T.h3}>Next on the pathway</Text>
            <Text style={[T.sub, { marginTop: 6 }]}>
              Finish {lockedSheet.keyTitle} to open {formatFormulas(lockedSheet.unit.title)}. Every lock is about
              order, never payment.
            </Text>
            <Pressable style={ls.sheetPrimary} onPress={() => { setLockedSheet(null); locate(); }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Go to {lockedSheet.keyTitle}</Text>
            </Pressable>
            <Pressable style={{ paddingVertical: 10, alignItems: 'center' }} onPress={() => setLockedSheet(null)}>
              <Text style={{ color: C.sub, fontWeight: '700' }}>Not now</Text>
            </Pressable>
          </View>
        ) : null}
      </Overlay>
    </Screen>
  );
}

// ── Rendering ────────────────────────────────────────────────

function StageBlock({ section, currentUnitId, currentLesson, onPressUnit }) {
  const { stage } = section;
  return (
    <View>
      <View style={ls.stageHeader}>
        <View style={[ls.stageBadge, section.stageComplete && { backgroundColor: C.teal }]}>
          {section.stageComplete ? (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          ) : (
            <Text style={ls.stageBadgeText}>{stage.n}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={T.h3}>{stage.title}</Text>
          <Text style={[T.tiny, { color: C.sub }]}>{stage.blurb.replace(/\[\[|\]\]/g, '')}</Text>
        </View>
      </View>
      {section.rows.map((row) => (
        <StationRow
          key={row.unit.id}
          row={row}
          isCurrent={row.unit.id === currentUnitId}
          currentLesson={currentLesson}
          onPress={onPressUnit}
        />
      ))}
      {section.lockCaption ? (
        <Text style={[T.tiny, { color: C.faint, textAlign: 'center', marginTop: 2, marginBottom: 10 }]}>
          The pathway opens one stage at a time.
        </Text>
      ) : null}
    </View>
  );
}

function StationRow({ row, isCurrent, currentLesson, onPress }) {
  const { rowH, railX, nodeR, laneDX, svgW } = TERRAIN;
  const midY = rowH / 2;
  const done = row.status === 'complete';
  const locked = row.status === 'locked';
  const reaction = row.shape === 'diamond';
  const accent = reaction ? CORAL : C.teal;

  // Compact grammar, per the reference board: the rail never greys out —
  // behind you it is full teal, ahead of you a teal tint — and reaction
  // stations sit OFF the rail in a coral side lane, reached by a short
  // curved connector. The rail itself runs straight past them.
  const railAbove = done || isCurrent ? C.teal : RAIL_AHEAD;
  const railBelow = done ? C.teal : RAIL_AHEAD;
  const stationX = reaction ? railX + laneDX : railX;
  const stroke = locked ? LOCKED_INK : accent;
  const gapTop = reaction ? 0 : midY - nodeR - 3;
  const gapBot = reaction ? 0 : midY + nodeR + 3;

  return (
    <Pressable
      onPress={() => onPress(row.unit, row.status)}
      style={{ height: rowH, flexDirection: 'row', alignItems: 'center' }}
      accessibilityRole="button"
      accessibilityLabel={`${row.unit.title}, ${isCurrent ? 'current unit' : row.status}`}
    >
      <Svg width={svgW} height={rowH}>
        {/* The rail. Reaction rows keep it unbroken — the station is beside
            it, not on it. */}
        {reaction ? (
          <Path d={`M ${railX} 0 L ${railX} ${rowH}`} stroke={railBelow} strokeWidth={5} strokeLinecap="round" fill="none" />
        ) : (
          <>
            <Path d={`M ${railX} 0 L ${railX} ${gapTop}`} stroke={railAbove} strokeWidth={5} strokeLinecap="round" fill="none" />
            {!row.last ? (
              <Path d={`M ${railX} ${gapBot} L ${railX} ${rowH}`} stroke={railBelow} strokeWidth={5} strokeLinecap="round" fill="none" />
            ) : (
              <>
                <Path d={`M ${railX} ${gapBot} L ${railX} ${rowH - 18}`} stroke={railBelow} strokeWidth={5} strokeLinecap="round" fill="none" />
                <Circle cx={railX} cy={rowH - 9} r={6} stroke={railBelow} strokeWidth={3} fill="#FFFFFF" />
              </>
            )}
          </>
        )}

        {/* Coral connector out to the side lane. */}
        {reaction ? (
          <Path
            d={`M ${railX} ${midY - 16} Q ${railX + 4} ${midY} ${stationX - nodeR - 2} ${midY}`}
            stroke={locked ? LOCKED_INK : CORAL}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
            opacity={locked ? 0.55 : 1}
          />
        ) : null}

        {/* the halo on "you are here" */}
        {isCurrent ? (
          <>
            <Circle cx={stationX} cy={midY} r={nodeR + 8} stroke={accent} strokeWidth={2} fill="none" opacity={0.25} />
            <Circle cx={stationX} cy={midY} r={nodeR + 4.5} stroke={accent} strokeWidth={2} fill="none" opacity={0.55} />
          </>
        ) : null}

        {/* the station: circle for naming, diamond for reactions */}
        {reaction ? (
          <Rect
            x={stationX - nodeR} y={midY - nodeR} width={nodeR * 2} height={nodeR * 2}
            rx={3} transform={`rotate(45 ${stationX} ${midY})`}
            fill={done ? CORAL : locked ? '#FFFFFF' : CORAL_SOFT} stroke={stroke} strokeWidth={2.5}
          />
        ) : (
          <Circle cx={stationX} cy={midY} r={nodeR} fill={done ? C.teal : '#FFFFFF'} stroke={stroke} strokeWidth={2.5} />
        )}
        {row.interchange ? <Circle cx={stationX} cy={midY} r={nodeR + 4.5} stroke={stroke} strokeWidth={2} fill="none" /> : null}
      </Svg>

      {/* status glyph over the station */}
      <View pointerEvents="none" style={[ls.glyph, { left: stationX - 8, top: midY - 8 }]}>
        {done ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : locked ? (
          <Ionicons name="lock-closed" size={11} color={LOCKED_INK} />
        ) : null}
      </View>

      {/* The mascot keeps the student company at "you are here". */}
      {isCurrent ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: -6, top: midY - 36 }}>
          <CatalystMascot state="idle" size={36} />
        </View>
      ) : null}

      {/* One-line plaque, status inside it: green "Complete", a teal
          "Continue · 2 of 4" chip, a lessons count, or a lock. Locked rows
          keep readable slate text — dimmed is not erased. */}
      <View
        style={[
          ls.plaque,
          isCurrent && ls.plaqueCurrent,
          reaction && !locked && { borderColor: '#F2C4BB' },
          locked && ls.plaqueLocked,
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[T.h3, { fontSize: 14.5 }, locked && { color: LOCKED_INK }]}
            numberOfLines={1}
          >
            {formatFormulas(row.unit.title)}
          </Text>
          {isCurrent ? <Text style={ls.hereTxt}>You are here</Text> : null}
        </View>
        {done ? (
          <Text style={ls.completeTxt}>Complete</Text>
        ) : isCurrent ? (
          <View style={ls.continueChip}>
            <Text style={ls.continueChipTxt}>
              Continue · {Math.min(currentLesson, row.unit.lessons)} of {row.unit.lessons}
            </Text>
          </View>
        ) : locked ? (
          <Ionicons name="lock-closed" size={14} color={LOCKED_INK} />
        ) : (
          <Text style={[T.tiny, { color: C.sub, fontWeight: '600' }]}>{row.unit.lessons} lessons</Text>
        )}
      </View>
    </Pressable>
  );
}

function CollapsedStage({ section, onExpand }) {
  return (
    <Pressable onPress={onExpand} style={ls.band} accessibilityRole="button" accessibilityLabel={`Stage ${section.stage.n}, ${section.stage.title}, ${section.unitCount} units, tap to expand`}>
      <View style={[ls.stageBadge, { backgroundColor: C.bg }]}>
        <Text style={ls.stageBadgeText}>{section.stage.n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[T.h3, { color: C.sub }]}>{section.stage.title}</Text>
        <Text style={[T.tiny, { color: C.faint }]}>{section.unitCount} units · later on the pathway</Text>
      </View>
      <Ionicons name="chevron-down" size={16} color={C.faint} />
    </Pressable>
  );
}

const ls = StyleSheet.create({
  stageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, height: TERRAIN.stageHeaderH, paddingTop: 8 },
  stageBadge: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.card,
  },
  stageBadgeText: { fontWeight: '800', color: C.teal, fontSize: 13 },
  glyph: { position: 'absolute', width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  plaque: {
    flex: 1, marginLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, minHeight: 48,
  },
  plaqueCurrent: { borderColor: C.teal, borderWidth: 2, backgroundColor: '#F1FAFA' },
  plaqueLocked: { backgroundColor: C.bg, borderColor: '#D9E1E7' },
  hereTxt: { fontSize: 10, fontWeight: '800', color: C.teal, marginTop: 1 },
  completeTxt: { fontSize: 12, fontWeight: '800', color: C.green },
  continueChip: { backgroundColor: C.tealSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  continueChipTxt: { fontSize: 11, fontWeight: '800', color: C.teal },
  reactionMark: {
    width: 7, height: 7, backgroundColor: CORAL, borderRadius: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  band: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: TERRAIN.collapsedH,
    paddingHorizontal: 2, opacity: 0.8,
  },
  locator: {
    position: 'absolute', right: 4, bottom: 14, width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  celebrateBanner: {
    position: 'absolute', top: '18%', alignSelf: 'center', backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.tealBorder, borderRadius: R.md, paddingHorizontal: 18, paddingVertical: 10,
  },
  sheet: { padding: 18, gap: 4 },
  sheetPrimary: {
    backgroundColor: C.teal, borderRadius: R.sm, alignItems: 'center', paddingVertical: 12, marginTop: 14,
  },
});
