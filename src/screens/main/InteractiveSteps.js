// ─────────────────────────────────────────────────────────────
// Interactive teaching steps.
//
//   StructureToggle — the same molecule shown two ways, switched by
//     the learner. This is how "the hydrogens are still there, they
//     are just not drawn" gets understood instead of asserted.
//
//   CountAtoms — the learner taps each carbon in a skeletal drawing
//     and it lights up. Counting corners and ends by hand is the
//     skill; being told "every corner is a carbon" is not the same
//     thing as having done it.
//
// Both refuse to advance until the learner has actually interacted,
// so an interactive step cannot be skipped like a paragraph.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { formatFormulas } from '../../chem/formula';
import { GlossaryText } from '../../components/GlossaryText';
import { nameGraph, parseName } from '../../engine/index.js';
import { StaticMol } from '../../sandbox/render';
import { PeriodicTable, ElementDetail } from '../../components/PeriodicTable';
import { prettify } from '../../chem/prettify';
import { BOND } from '../../sandbox/constants';

const ROOT_WORDS = ['meth','eth','prop','but','pent','hex','hept','oct','non','dec'];
import { bySymbol } from '../../content/periodicTable';
import { tap, good } from '../../sandbox/haptics';

// ── Full ↔ skeletal ──────────────────────────────────────────
export function StructureToggle({ step, width, onContinue }) {
  const [full, setFull] = useState(true);
  const [seenBoth, setSeenBoth] = useState(false);

  const show = (v) => {
    if (v === full) return;
    tap();
    setFull(v);
    setSeenBoth(true);
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
      <View style={iv.card}>
        <Text style={T.h2}>{step.title}</Text>
        {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

        <View style={iv.switchRow}>
          <Pressable
            onPress={() => show(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: full }}
            accessibilityLabel="show every atom"
            style={[iv.seg, full && iv.segOn]}
          >
            <Text style={[iv.segTxt, full && iv.segTxtOn]}>Every atom</Text>
          </Pressable>
          <Pressable
            onPress={() => show(false)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: !full }}
            accessibilityLabel="show the skeleton"
            style={[iv.seg, !full && iv.segOn]}
          >
            <Text style={[iv.segTxt, !full && iv.segTxtOn]}>Skeletal</Text>
          </Pressable>
        </View>

        <View style={iv.stage}>
          <StaticMol
            mol={step.mol}
            width={Math.min(width - 90, 300)}
            showCarbons={full}
          />
        </View>

        <View style={iv.captionBox}>
          <Ionicons
            name={full ? 'eye-outline' : 'eye-off-outline'}
            size={16}
            color={C.teal}
          />
          <Text style={iv.caption}>{formatFormulas(full ? step.captionFull : step.captionSkeletal)}</Text>
        </View>
      </View>
      </ScrollView>

      <Pressable
        onPress={onContinue}
        disabled={!seenBoth}
        style={[iv.continue, !seenBoth && { opacity: 0.55 }]}
      >
        <Text style={iv.continueTxt}>
          {seenBoth ? 'Continue' : 'Try both views'}
        </Text>
      </Pressable>
    </View>
  );
}

// ── Tap every carbon ─────────────────────────────────────────
export function CountAtoms({ step, width, onContinue }) {
  const [found, setFound] = useState(() => new Set());

  const carbons = useMemo(
    () => step.mol.atoms.filter((a) => !a.el || a.el === 'C').map((a) => a.id),
    [step.mol]
  );
  const total = carbons.length;
  const done = found.size >= total;

  const result = useMemo(() => nameGraph(step.mol), [step.mol]);

  const pick = (id) => {
    if (!carbons.includes(id) || found.has(id)) return;
    const next = new Set(found);
    next.add(id);
    if (next.size >= total) good();
    else tap();
    setFound(next);
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={iv.card}>
        <Text style={T.h2}>{step.title}</Text>
        {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

        <View style={iv.stage}>
          <StaticMol
            mol={step.mol}
            width={Math.min(width - 90, 300)}
            showCarbons={false}
            highlight={found}
            onPickAtom={pick}
          />
        </View>

        <View style={iv.counterRow}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[iv.pip, i < found.size && iv.pipOn]} />
          ))}
        </View>
        <Text style={iv.countTxt}>
          {found.size} of {total} carbons found
        </Text>

        {done ? (
          <View style={iv.doneBox}>
            <Ionicons name="checkmark-circle" size={18} color={C.greenText} />
            <Text style={iv.doneTxt}>
              {total} carbons — so this is{' '}
              <Text style={{ fontWeight: '800' }}>
                {result.ok ? result.name : step.answer}
              </Text>
              .{step.doneNote ? ` ${formatFormulas(step.doneNote)}` : ''}
            </Text>
          </View>
        ) : (
          <Text style={iv.hint}>
            Tap each line end and each corner. Those are the carbons.
          </Text>
        )}
      </View>

      <Pressable
        onPress={onContinue}
        disabled={!done}
        style={[iv.continue, !done && { opacity: 0.55 }]}
      >
        <Text style={iv.continueTxt}>{done ? 'Continue' : 'Find them all to continue'}</Text>
      </Pressable>
    </View>
  );
}

// ── Explore the main group ───────────────────────────────────
// The learner taps elements and reads off how many bonds each forms. The
// point is the pattern down the columns, so the counter tracks how many
// different GROUPS have been visited rather than how many elements.
export function ElementExplorer({ step, width, onContinue }) {
  const [picked, setPicked] = useState(() => bySymbol(step.start || 'C'));
  const [groupsSeen, setGroupsSeen] = useState(() => new Set([bySymbol(step.start || 'C').group]));
  const need = step.need || 3;
  const done = groupsSeen.size >= need;

  const choose = (el) => {
    setPicked(el);
    setGroupsSeen((g) => {
      const next = new Set(g);
      next.add(el.group);
      if (next.size >= need && g.size < need) good();
      return next;
    });
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <PeriodicTable
              selected={picked ? picked.sym : null}
              onSelect={choose}
              cell={Math.min(38, Math.floor((width - 90) / 8) - 3)}
            />
          </View>

          <ElementDetail el={picked} />

          <View style={iv.progressRow}>
            {Array.from({ length: need }).map((_, i) => (
              <View key={i} style={[iv.pip, i < groupsSeen.size && iv.pipOn]} />
            ))}
            <Text style={iv.progressTxt}>
              {groupsSeen.size} of {need} columns explored
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pressable
        onPress={onContinue}
        disabled={!done}
        style={[iv.continue, !done && { opacity: 0.55 }]}
      >
        <Text style={iv.continueTxt}>
          {done ? 'Continue' : `Tap elements in ${need - groupsSeen.size} more column${need - groupsSeen.size === 1 ? '' : 's'}`}
        </Text>
      </Pressable>
    </View>
  );
}

// ── Shared: a chain that does not move ───────────────────────
// The parent chain is built at fixed coordinates and never re-laid-out, so it
// stays put while a group moves along it. Running each state through the
// engine's layout (as the first version did) re-derived the whole molecule
// every tap and the chain jumped about, which made it impossible to watch the
// one thing that was actually changing.
function fixedChain(n) {
  const atoms = [];
  const bonds = [];
  for (let i = 0; i < n; i++) {
    atoms.push({ id: i + 1, x: i * BOND * 0.87, y: (i % 2) * BOND * 0.5 });
    if (i) bonds.push({ a: i, b: i + 1, order: 1, stereo: null });
  }
  return { atoms, bonds };
}

// Hang something off a chain carbon in the widest free direction, which keeps
// every angle at 120° and never folds a group back over a bond.
function hangFrom(g, at, nextId) {
  const a = g.atoms[at - 1];
  const taken = g.bonds
    .filter((b) => b.a === a.id || b.b === a.id)
    .map((b) => g.atoms.find((x) => x.id === (b.a === a.id ? b.b : b.a)))
    .filter(Boolean)
    .map((nb) => Math.atan2(nb.y - a.y, nb.x - a.x));
  let best = Math.PI / 2;
  let bestGap = -1;
  for (let deg = 0; deg < 360; deg += 5) {
    const r = (deg * Math.PI) / 180;
    const gap = Math.min(
      ...taken.map((t) => {
        let d = Math.abs(r - t) % (2 * Math.PI);
        return d > Math.PI ? 2 * Math.PI - d : d;
      })
    );
    if (gap > bestGap) {
      bestGap = gap;
      best = r;
    }
  }
  return { x: a.x + BOND * Math.cos(best), y: a.y + BOND * Math.sin(best), dir: best };
}

// A frame that covers every state the controls can reach, so the chain is
// drawn at one scale in one place and never re-centres. Sized on the LONGEST
// chain available and on enough vertical room for a substituent above or
// below, since both are possible depending on which carbon it hangs from.
function lockedFrame(maxCarbons, branchDepth = 1) {
  const span = (maxCarbons - 1) * BOND * 0.87;
  return {
    minX: -BOND * 0.5,
    maxX: span + BOND * 0.5,
    minY: -BOND * branchDepth - BOND * 0.2,
    maxY: BOND * 0.5 + BOND * branchDepth + BOND * 0.2,
  };
}

// The number between the two arrows.
function Stepper({ label, value, caption, onLess, onMore, lessLabel, moreLabel, canLess, canMore }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={iv.ctrlLabel}>{label}</Text>
      <View style={iv.stepRow}>
        <Pressable
          onPress={onLess}
          disabled={!canLess}
          style={[iv.round, !canLess && iv.roundOff]}
          accessibilityLabel={lessLabel}
        >
          <Ionicons name={lessLabel.includes('left') ? 'chevron-back' : 'remove'} size={22} color={canLess ? C.teal : C.faint} />
        </Pressable>

        <View style={iv.readout}>
          <Text style={iv.readoutValue}>{value}</Text>
          {caption ? <Text style={iv.readoutCaption}>{caption}</Text> : null}
        </View>

        <Pressable
          onPress={onMore}
          disabled={!canMore}
          style={[iv.round, !canMore && iv.roundOff]}
          accessibilityLabel={moreLabel}
        >
          <Ionicons name={moreLabel.includes('right') ? 'chevron-forward' : 'add'} size={22} color={canMore ? C.teal : C.faint} />
        </Pressable>
      </View>
    </View>
  );
}

const locantIn = (name) => {
  const m = (name || '').match(/-(\d+)-ol/);
  return m ? Number(m[1]) : null;
};

// ── Move the hydroxyl ────────────────────────────────────────
export function AlcoholBuilder({ step, width, onContinue }) {
  const min = step.min || 3;
  const max = step.max || 8;
  const [n, setN] = useState(step.start || 6);
  const [at, setAt] = useState(step.startAt || 1);
  const [moved, setMoved] = useState(false);

  // The hydroxyl keeps its PHYSICAL position on the drawing — carbon 5 from
  // the left stays the 5th from the left — while the NAME may count from the
  // other end. Watching those two disagree is the whole point of the step.
  const pos = Math.min(at, n);

  const mol = useMemo(() => {
    const g = fixedChain(n);
    const p = hangFrom(g, pos, n + 1);
    g.atoms.push({ id: n + 1, el: 'O', x: p.x, y: p.y });
    g.bonds.push({ a: pos, b: n + 1, order: 1, stereo: null });
    return g;
  }, [n, pos]);

  const result = useMemo(() => nameGraph(mol), [mol]);
  const name = result.ok ? result.name : '';
  const locant = locantIn(name);
  const countedFromFar = locant != null && locant !== pos;

  const change = (fn) => {
    tap();
    fn();
    setMoved(true);
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            <StaticMol
              mol={mol}
              width={Math.min(width - 90, 300)}
              showCarbons={false}
              frame={lockedFrame(max, 1)}
            />
          </View>

          <Text style={iv.bigName}>{formatFormulas(name)}</Text>

          <Stepper
            label="CHAIN LENGTH"
            value={n}
            caption={n === 1 ? 'carbon' : 'carbons'}
            onLess={() => change(() => setN(Math.max(min, n - 1)))}
            onMore={() => change(() => setN(Math.min(max, n + 1)))}
            lessLabel="one fewer carbon"
            moreLabel="one more carbon"
            canLess={n > min}
            canMore={n < max}
          />

          <Stepper
            label="WHERE THE -OH SITS"
            value={pos}
            caption={`carbon ${pos} from the left`}
            onLess={() => change(() => setAt(Math.max(1, pos - 1)))}
            onMore={() => change(() => setAt(Math.min(n, pos + 1)))}
            lessLabel="move the hydroxyl left"
            moreLabel="move the hydroxyl right"
            canLess={pos > 1}
            canMore={pos < n}
          />

          <View style={[iv.noteBox, countedFromFar && iv.noteBoxAlert]}>
            <Ionicons
              name={countedFromFar ? 'swap-horizontal' : 'information-circle-outline'}
              size={16}
              color={countedFromFar ? '#8A6A12' : C.teal}
            />
            <Text style={iv.noteTxt}>
              {!/\d/.test(name)
                ? 'No number is needed here — every position on this chain gives the same molecule.'
                : countedFromFar
                ? `You put it on carbon ${pos} counting from the left. Counting from the RIGHT it is carbon ${locant} — and the name always takes the lower number, so it is ${name}.`
                : `Counting from the left gives ${locant}, which is already the lower number, so the name uses it.`}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pressable
        onPress={onContinue}
        disabled={!moved}
        style={[iv.continue, !moved && { opacity: 0.55 }]}
      >
        <Text style={iv.continueTxt}>{moved ? 'Continue' : 'Try moving the group'}</Text>
      </Pressable>
    </View>
  );
}

// ── Build a branched alkane ──────────────────────────────────
// Three controls, and the lesson lives in how they interact: make the branch
// long enough and it BECOMES the parent chain, because the parent is whichever
// path through the carbons is longest. The name says so before the learner has
// to be told.
export function BranchBuilder({ step, width, onContinue }) {
  const minP = step.minParent || 4;
  const maxP = step.maxParent || 8;
  const [n, setN] = useState(step.startParent || 6);
  const [at, setAt] = useState(step.startAt || 3);
  const [size, setSize] = useState(step.startBranch || 1);
  const [moved, setMoved] = useState(false);

  const pos = Math.min(Math.max(2, at), n - 1);

  const mol = useMemo(() => {
    const g = fixedChain(n);
    let id = n;
    let anchor = pos;
    for (let k = 0; k < size; k++) {
      const p = hangFrom(g, anchor === pos ? pos : anchor, id + 1);
      id += 1;
      // subsequent branch carbons continue away from the chain
      const prev = g.atoms.find((a) => a.id === (k === 0 ? pos : id - 1));
      const x = k === 0 ? p.x : prev.x + BOND * 0.87 * (k % 2 ? -1 : 1) * 0.6;
      const y = k === 0 ? p.y : prev.y + BOND * 0.8;
      g.atoms.push({ id, x: k === 0 ? p.x : x, y: k === 0 ? p.y : y });
      g.bonds.push({ a: k === 0 ? pos : id - 1, b: id, order: 1, stereo: null });
      anchor = id;
    }
    return g;
  }, [n, pos, size]);

  const result = useMemo(() => nameGraph(mol), [mol]);
  const name = result.ok ? result.name : '';

  // Did the branch take over as the parent chain?
  const drawnRoot = ROOT_WORDS[n - 1];
  const parentTaken = !!name && !name.endsWith(`${drawnRoot}ane`);
  const BRANCH_WORD = ['', 'methyl', 'ethyl', 'propyl', 'butyl'];

  const change = (fn) => {
    tap();
    fn();
    setMoved(true);
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            <StaticMol
              mol={mol}
              width={Math.min(width - 90, 300)}
              showCarbons={false}
              frame={lockedFrame(maxP, 3)}
            />
          </View>

          <Text style={iv.bigName}>{formatFormulas(name)}</Text>

          <Stepper
            label="CHAIN YOU DREW"
            value={n}
            caption="carbons across"
            onLess={() => change(() => setN(Math.max(minP, n - 1)))}
            onMore={() => change(() => setN(Math.min(maxP, n + 1)))}
            lessLabel="shorten the chain"
            moreLabel="lengthen the chain"
            canLess={n > minP}
            canMore={n < maxP}
          />

          <Stepper
            label="WHERE THE BRANCH SITS"
            value={pos}
            caption={`carbon ${pos} from the left`}
            onLess={() => change(() => setAt(Math.max(2, pos - 1)))}
            onMore={() => change(() => setAt(Math.min(n - 1, pos + 1)))}
            lessLabel="move the branch left"
            moreLabel="move the branch right"
            canLess={pos > 2}
            canMore={pos < n - 1}
          />

          <Stepper
            label="BRANCH LENGTH"
            value={size}
            caption={BRANCH_WORD[size] || `${size} carbons`}
            onLess={() => change(() => setSize(Math.max(1, size - 1)))}
            onMore={() => change(() => setSize(Math.min(3, size + 1)))}
            lessLabel="shorten the branch"
            moreLabel="lengthen the branch"
            canLess={size > 1}
            canMore={size < 3}
          />

          <View style={[iv.noteBox, parentTaken && iv.noteBoxAlert]}>
            <Ionicons
              name={parentTaken ? 'git-branch-outline' : 'information-circle-outline'}
              size={16}
              color={parentTaken ? '#8A6A12' : C.teal}
            />
            <Text style={iv.noteTxt}>
              {parentTaken
                ? `Look at the name: the parent is no longer the ${n} carbons you drew across. Trace from the end of the branch and a LONGER path exists, so that becomes the parent chain and what is left over becomes the substituent.`
                : `The longest path is the ${n} carbons drawn across, so that is the parent — and the ${BRANCH_WORD[size] || 'branch'} hangs off carbon ${pos}.`}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pressable
        onPress={onContinue}
        disabled={!moved}
        style={[iv.continue, !moved && { opacity: 0.55 }]}
      >
        <Text style={iv.continueTxt}>{moved ? 'Continue' : 'Try changing the branch'}</Text>
      </Pressable>
    </View>
  );
}

// ── Which end do you number from? ────────────────────────────
// The most-failed skill in the course, and one a static card cannot teach:
// both candidate names are shown, the learner commits to an end, and the
// loser stays on screen struck through so the comparison is visible rather
// than asserted.
export function NumberingChooser({ step, width, onContinue }) {
  const n = step.chain || 5;
  const at = step.at || 2;
  const [picked, setPicked] = useState(null);

  const mol = useMemo(() => {
    const g = fixedChain(n);
    const p = hangFrom(g, at);
    g.atoms.push({ id: n + 1, x: p.x, y: p.y });
    g.bonds.push({ a: at, b: n + 1, order: 1, stereo: null });
    return g;
  }, [n, at]);

  const right = useMemo(() => nameGraph(mol), [mol]);
  const fromLeft = at;
  const fromRight = n + 1 - at;
  const lower = Math.min(fromLeft, fromRight);
  const higher = Math.max(fromLeft, fromRight);
  const correctEnd = fromLeft <= fromRight ? 'left' : 'right';
  // The wrong candidate differs only in its locant, so it is built from the
  // correct name rather than invented.
  const wrongName = right.ok ? right.name.replace(/^\d+/, String(higher)) : '';
  const symmetric = fromLeft === fromRight;

  const choose = (end) => {
    tap();
    if (end === correctEnd || symmetric) good();
    setPicked(end);
  };

  const Card = ({ end, label, locant }) => {
    const isRight = end === correctEnd || symmetric;
    const shown = picked !== null;
    return (
      <Pressable
        onPress={() => choose(end)}
        disabled={shown}
        style={[
          iv.numCard,
          shown && isRight && iv.numCardRight,
          shown && !isRight && iv.numCardWrong,
        ]}
      >
        <Text style={iv.numLabel}>{label}</Text>
        <Text
          style={[
            iv.numName,
            shown && !isRight && iv.numNameStruck,
            shown && isRight && { color: C.greenText },
          ]}
        >
          {formatFormulas(
            shown ? (isRight ? right.name : wrongName) : `…-${locant}-…`
          )}
        </Text>
        <Text style={iv.numLocant}>locant {locant}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            <StaticMol mol={mol} width={Math.min(width - 90, 300)} showCarbons={false} frame={lockedFrame(n, 1)} />
          </View>

          <Text style={iv.ctrlLabel}>NUMBER FROM WHICH END?</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Card end="left" label="From the left" locant={fromLeft} />
            <Card end="right" label="From the right" locant={fromRight} />
          </View>

          {picked !== null ? (
            <View style={[iv.noteBox, iv.noteBoxAlert]}>
              <Ionicons name="information-circle-outline" size={16} color="#8A6A12" />
              <Text style={iv.noteTxt}>
                {symmetric
                  ? `Both ends give ${lower}, so the molecule is symmetrical about that point and either direction is correct.`
                  : `The lower locant wins, so this is ${right.name} — not the ${higher} version. It makes no difference which way the molecule happens to be drawn.`}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={picked === null} style={[iv.continue, picked === null && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{picked === null ? 'Choose an end' : 'Continue'}</Text>
      </Pressable>
    </View>
  );
}

// ── Swap the group, watch the suffix ─────────────────────────
// One chain, one position, several groups. The chain never changes, so the
// only thing that can account for the name changing is the group.
export function GroupSwapper({ step, width, onContinue }) {
  const forms = step.forms || [];
  const [i, setI] = useState(0);
  const [seen, setSeen] = useState(() => new Set([0]));

  const mols = useMemo(() => forms.map((f) => {
    const p = parseName(f.name);
    return p.ok ? p.mol : null;
  }), [forms]);

  const mol = mols[i];
  const result = useMemo(() => (mol ? nameGraph(mol) : null), [mol]);
  const need = Math.min(forms.length, step.need || forms.length);

  const pick = (k) => {
    tap();
    setI(k);
    setSeen((s) => {
      const next = new Set(s);
      next.add(k);
      if (next.size >= need && s.size < need) good();
      return next;
    });
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            {mol ? <StaticMol mol={mol} width={Math.min(width - 90, 300)} showCarbons={false} /> : null}
          </View>

          <Text style={iv.bigName}>{result && result.ok ? formatFormulas(result.name) : ''}</Text>
          <Text style={iv.formula}>{result && result.ok ? formatFormulas(result.formula) : ' '}</Text>

          <Text style={iv.ctrlLabel}>SWAP THE GROUP</Text>
          <View style={iv.chipWrap}>
            {forms.map((f, k) => (
              <Pressable key={k} onPress={() => pick(k)} style={[iv.groupChip, i === k && iv.groupChipOn]}>
                <Text style={[iv.groupChipTxt, i === k && { color: '#fff' }]}>{formatFormulas(f.label)}</Text>
              </Pressable>
            ))}
          </View>

          {forms[i] && forms[i].note ? (
            <View style={iv.noteBox}>
              <Ionicons name="information-circle-outline" size={16} color={C.teal} />
              <Text style={iv.noteTxt}>{formatFormulas(forms[i].note)}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={seen.size < need} style={[iv.continue, seen.size < need && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>
          {seen.size >= need ? 'Continue' : `Try ${need - seen.size} more`}
        </Text>
      </Pressable>
    </View>
  );
}

// ── Add a group, watch who wins ──────────────────────────────
// The priority ladder demonstrated rather than asserted: switch a group on and
// the name rearranges, with whatever loses moving into a prefix.
export function PriorityExplorer({ step, width, onContinue }) {
  const opts = step.groups || [];
  const [on, setOn] = useState(() => new Set(step.start || []));
  const [changed, setChanged] = useState(false);

  const key = [...on].sort().join(',');
  const mol = useMemo(() => {
    const combo = opts.filter((_, k) => on.has(k));
    const name = step.nameFor
      ? step.nameFor[[...on].sort((a, b) => a - b).join(',')] || step.base
      : step.base;
    const p = parseName(name);
    return p.ok ? p.mol : null;
  }, [key, opts, step]);

  const result = useMemo(() => (mol ? nameGraph(mol) : null), [mol]);

  const toggle = (k) => {
    tap();
    setOn((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
    setChanged(true);
  };

  // which group took the suffix, read from the name itself
  const winner = result && result.ok ? (step.suffixOf ? step.suffixOf(result.name) : null) : null;

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            {mol ? <StaticMol mol={mol} width={Math.min(width - 90, 300)} showCarbons={false} /> : null}
          </View>

          <Text style={iv.bigName}>{result && result.ok ? formatFormulas(result.name) : '—'}</Text>

          <Text style={iv.ctrlLabel}>SWITCH GROUPS ON AND OFF</Text>
          <View style={iv.chipWrap}>
            {opts.map((g, k) => (
              <Pressable key={k} onPress={() => toggle(k)} style={[iv.groupChip, on.has(k) && iv.groupChipOn]}>
                <Ionicons
                  name={on.has(k) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={on.has(k) ? '#fff' : C.sub}
                />
                <Text style={[iv.groupChipTxt, on.has(k) && { color: '#fff' }]}>{formatFormulas(g)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={iv.noteBox}>
            <Ionicons name="trending-up-outline" size={16} color={C.teal} />
            <Text style={iv.noteTxt}>
              {step.noteFor && step.noteFor[[...on].sort((a, b) => a - b).join(',')]
                ? step.noteFor[[...on].sort((a, b) => a - b).join(',')]
                : 'Switch a group on and watch which one takes the suffix. Everything else moves into a prefix.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={!changed} style={[iv.continue, !changed && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{changed ? 'Continue' : 'Try adding a group'}</Text>
      </Pressable>
    </View>
  );
}

// ── Flip it and see ──────────────────────────────────────────
// Two real molecules from the engine, switched between. Its most useful
// setting is the one where flipping changes NOTHING — that is exactly what a
// molecule with no stereochemistry does, and it is hard to show any other way.
export function StereoFlipper({ step, width, onContinue }) {
  const forms = step.forms || [];
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const mols = useMemo(() => forms.map((f) => {
    const p = parseName(f);
    return p.ok ? p.mol : null;
  }), [forms]);

  const mol = mols[i];
  const result = useMemo(() => (mol ? nameGraph(mol) : null), [mol]);
  const nameA = mols[0] ? nameGraph(mols[0]).name : '';
  const nameB = mols[1] ? nameGraph(mols[1]).name : '';
  const noChange = nameA === nameB;

  const flip = () => {
    tap();
    setI((k) => (k + 1) % forms.length);
    setFlipped(true);
    if (!flipped) good();
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            {mol ? (
              <StaticMol
                mol={mol}
                width={Math.min(width - 90, 300)}
                showCarbons={false}
                showStereoH={!!step.showStereoH}
              />
            ) : null}
          </View>

          <Text style={iv.bigName}>{result && result.ok ? formatFormulas(result.name) : '—'}</Text>

          <Pressable onPress={flip} style={iv.flipBtn}>
            <Ionicons name="swap-horizontal" size={18} color={C.teal} />
            <Text style={iv.flipTxt}>{step.flipLabel || 'Flip the groups'}</Text>
          </Pressable>

          {flipped ? (
            <View style={[iv.noteBox, noChange && iv.noteBoxAlert]}>
              <Ionicons
                name={noChange ? 'alert-circle-outline' : 'information-circle-outline'}
                size={16}
                color={noChange ? '#8A6A12' : C.teal}
              />
              <Text style={iv.noteTxt}>
                {noChange
                  ? step.noteSame || 'The name did not change. Flipping produced the same molecule, so there is only one compound here and no descriptor applies.'
                  : step.noteDiffer || 'The name changed, so these are two different compounds — and no amount of turning will make one into the other.'}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={!flipped} style={[iv.continue, !flipped && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{flipped ? 'Continue' : 'Try flipping it'}</Text>
      </Pressable>
    </View>
  );
}

// ── Collect the isomers ──────────────────────────────────────
// The unit's thesis made operable: the NAME is the test for sameness. The
// learner taps drawings, and two that name identically are flagged as the
// same compound however differently they were drawn.
export function IsomerCollector({ step, width, onContinue }) {
  const drawings = step.drawings || [];
  const mols = useMemo(
    () => drawings.map((d) => {
      const p = parseName(d.name);
      return p.ok ? p.mol : null;
    }),
    [drawings]
  );
  const [found, setFound] = useState([]);     // distinct names, in order found
  const [last, setLast] = useState(null);     // { name, dup, of }
  const [tried, setTried] = useState(() => new Set());

  const target = step.target || new Set(drawings.map((d) => d.name)).size;
  const done = found.length >= target;

  const tapDrawing = (k) => {
    const mol = mols[k];
    if (!mol) return;
    tap();
    const r = nameGraph(mol);
    if (!r.ok) return;
    setTried((t) => new Set(t).add(k));
    if (found.includes(r.name)) {
      setLast({ name: r.name, dup: true });
    } else {
      const next = [...found, r.name];
      setFound(next);
      setLast({ name: r.name, dup: false });
      if (next.length >= target) good();
    }
  };

  const cardW = Math.min(140, (width - 120) / 2);

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.isoGrid}>
            {mols.map((m, k) => (
              <Pressable key={k} onPress={() => tapDrawing(k)} style={[iv.isoCard, tried.has(k) && iv.isoCardTried]}>
                {m ? <StaticMol mol={m} width={cardW} showCarbons={false} /> : null}
              </Pressable>
            ))}
          </View>

          {last ? (
            <View style={[iv.noteBox, last.dup && iv.noteBoxAlert]}>
              <Ionicons
                name={last.dup ? 'copy-outline' : 'add-circle-outline'}
                size={16}
                color={last.dup ? '#8A6A12' : C.teal}
              />
              <Text style={iv.noteTxt}>
                {last.dup
                  ? `That is ${last.name} again — the same compound, drawn differently. Two structures are the same molecule when they produce the same name.`
                  : `${last.name} — a new one.`}
              </Text>
            </View>
          ) : null}

          <Text style={iv.ctrlLabel}>FOUND SO FAR</Text>
          <View style={iv.chipWrap}>
            {found.map((n) => (
              <View key={n} style={[iv.groupChip, iv.groupChipOn]}>
                <Text style={[iv.groupChipTxt, { color: '#fff' }]}>{formatFormulas(n)}</Text>
              </View>
            ))}
            {Array.from({ length: Math.max(0, target - found.length) }).map((_, i) => (
              <View key={`b${i}`} style={[iv.groupChip, { borderStyle: 'dashed' }]}>
                <Text style={[iv.groupChipTxt, { color: C.faint }]}>?</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={!done} style={[iv.continue, !done && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>
          {done ? 'Continue' : `Find ${target - found.length} more`}
        </Text>
      </Pressable>
    </View>
  );
}

// ── Build a ring ─────────────────────────────────────────────
// Change the size, then move a second substituent round it. The engine
// renumbers as you go — put a methyl at position 5 and watch the name come
// back as 1,3, which is the ring-numbering rule doing its work in public.
export function RingExplorer({ step, width, onContinue }) {
  const minN = step.min || 3;
  const maxN = step.max || 8;
  const [n, setN] = useState(step.start || 6);
  const [subs, setSubs] = useState(step.startSubs != null ? step.startSubs : 1);
  const [at, setAt] = useState(step.startAt || 2);
  const [moved, setMoved] = useState(false);

  const ROOTS = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec'];
  const pos = Math.min(Math.max(2, at), n);

  const wanted = useMemo(() => {
    const root = `cyclo${ROOTS[n]}ane`;
    if (subs === 0) return root;
    if (subs === 1) return `methyl${root}`;
    return `1,${pos}-dimethyl${root}`;
  }, [n, subs, pos]);

  const mol = useMemo(() => {
    const p = parseName(wanted);
    return p.ok ? p.mol : null;
  }, [wanted]);

  const result = useMemo(() => (mol ? nameGraph(mol) : null), [mol]);
  const renumbered = result && result.ok && result.name !== wanted;

  const change = (fn) => { tap(); fn(); setMoved(true); };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            {mol ? <StaticMol mol={mol} width={Math.min(width - 90, 280)} showCarbons={false} /> : null}
          </View>

          <Text style={iv.bigName}>{result && result.ok ? formatFormulas(result.name) : '—'}</Text>

          <Stepper
            label="RING SIZE"
            value={n}
            caption="carbons in the ring"
            onLess={() => change(() => setN(Math.max(minN, n - 1)))}
            onMore={() => change(() => setN(Math.min(maxN, n + 1)))}
            lessLabel="smaller ring" moreLabel="larger ring"
            canLess={n > minN} canMore={n < maxN}
          />

          <Stepper
            label="HOW MANY METHYLS"
            value={subs}
            caption={subs === 1 ? 'methyl group' : 'methyl groups'}
            onLess={() => change(() => setSubs(Math.max(0, subs - 1)))}
            onMore={() => change(() => setSubs(Math.min(2, subs + 1)))}
            lessLabel="fewer groups" moreLabel="more groups"
            canLess={subs > 0} canMore={subs < 2}
          />

          {subs === 2 ? (
            <Stepper
              label="WHERE THE SECOND ONE SITS"
              value={pos}
              caption={`carbon ${pos} going round`}
              onLess={() => change(() => setAt(Math.max(2, pos - 1)))}
              onMore={() => change(() => setAt(Math.min(n, pos + 1)))}
              lessLabel="move it back" moreLabel="move it round"
              canLess={pos > 2} canMore={pos < n}
            />
          ) : null}

          <View style={[iv.noteBox, renumbered && iv.noteBoxAlert]}>
            <Ionicons name={renumbered ? 'sync-outline' : 'information-circle-outline'} size={16} color={renumbered ? '#8A6A12' : C.teal} />
            <Text style={iv.noteTxt}>
              {renumbered
                ? `You placed it at ${pos}, but the name came back as ${result.name}. Counting the other way round the ring gives a lower set, and the lower set always wins.`
                : subs === 0
                ? 'A plain ring: cyclo- plus the root for the number of carbons.'
                : subs === 1
                ? 'One group needs no locant — every carbon of the ring is equivalent until a second group arrives.'
                : 'Two groups, so the positions matter. Carbon 1 is a substituted carbon, and you count whichever way gives the lower set.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={!moved} style={[iv.continue, !moved && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{moved ? 'Continue' : 'Try changing the ring'}</Text>
      </Pressable>
    </View>
  );
}

// ── Compare two locant sets ──────────────────────────────────
// Locant sets are compared TERM BY TERM, not by total — a rule people get
// wrong precisely because summing feels natural. Here both sets are laid out
// and the deciding term is marked.
export function LocantCompare({ step, width, onContinue }) {
  const a = step.setA || [];
  const b = step.setB || [];
  const [picked, setPicked] = useState(null);

  // first term where the two differ
  let decidingAt = -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 99) !== (b[i] ?? 99)) { decidingAt = i; break; }
  }
  const aWins = decidingAt === -1 ? true : (a[decidingAt] ?? 99) < (b[decidingAt] ?? 99);
  const sumA = a.reduce((x, y) => x + y, 0);
  const sumB = b.reduce((x, y) => x + y, 0);
  const sumMisleads = (sumA < sumB) !== aWins;

  const mol = useMemo(() => {
    const p = parseName(step.name);
    return p.ok ? p.mol : null;
  }, [step.name]);

  const choose = (which) => {
    tap();
    if ((which === 'a') === aWins) good();
    setPicked(which);
  };

  const SetCard = ({ set, which, label }) => {
    const isWinner = (which === 'a') === aWins;
    const shown = picked !== null;
    return (
      <Pressable onPress={() => choose(which)} disabled={shown}
        style={[iv.numCard, shown && isWinner && iv.numCardRight, shown && !isWinner && iv.numCardWrong]}>
        <Text style={iv.numLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
          {set.map((v, i) => (
            <Text key={i} style={[iv.locTerm, shown && i === decidingAt && iv.locTermKey]}>{v}</Text>
          ))}
        </View>
        <Text style={iv.numLocant}>total {set.reduce((x, y) => x + y, 0)}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            {mol ? <StaticMol mol={mol} width={Math.min(width - 90, 300)} showCarbons={false} /> : null}
          </View>

          <Text style={iv.ctrlLabel}>WHICH SET WINS?</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <SetCard set={a} which="a" label="Numbered one way" />
            <SetCard set={b} which="b" label="Numbered the other" />
          </View>

          {picked !== null ? (
            <View style={[iv.noteBox, sumMisleads && iv.noteBoxAlert]}>
              <Ionicons name={sumMisleads ? 'alert-circle-outline' : 'information-circle-outline'} size={16} color={sumMisleads ? '#8A6A12' : C.teal} />
              <Text style={iv.noteTxt}>
                {decidingAt === -1
                  ? 'The two sets are identical, so either direction gives the same name.'
                  : sumMisleads
                  ? `Compare term by term: the first ${decidingAt} agree, and term ${decidingAt + 1} decides. Note the totals point the OTHER way — ${sumA} against ${sumB} — which is why summing them is not the rule.`
                  : `The first ${decidingAt} terms agree, and term ${decidingAt + 1} decides it. The correct name is ${step.name}.`}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={picked === null} style={[iv.continue, picked === null && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{picked === null ? 'Choose a set' : 'Continue'}</Text>
      </Pressable>
    </View>
  );
}

// ── Decode the brackets ──────────────────────────────────────
// The bracket numbers are not decoration: they count the bridges, and they
// must add up to the root. Changing them changes the molecule, and the
// carbon count follows arithmetically.
export function BracketDecoder({ step, width, onContinue }) {
  const [bridges, setBridges] = useState(step.start || [2, 2, 1]);
  const [moved, setMoved] = useState(false);
  const ROOTS = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec', 'undec', 'dodec'];

  const total = bridges[0] + bridges[1] + bridges[2] + 2;
  const wanted = `bicyclo[${bridges.join('.')}]${ROOTS[total] || ''}ane`;
  const mol = useMemo(() => {
    const p = parseName(wanted);
    return p.ok ? p.mol : null;
  }, [wanted]);
  const result = useMemo(() => (mol ? nameGraph(mol) : null), [mol]);

  const set = (i, d) => {
    tap();
    setBridges((b) => {
      const next = [...b];
      next[i] = Math.max(0, Math.min(4, next[i] + d));
      // the convention lists bridges in descending order
      return [next[0], Math.min(next[0], next[1]), Math.min(next[1], next[2])];
    });
    setMoved(true);
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            {mol ? <StaticMol mol={mol} width={Math.min(width - 90, 260)} showCarbons={false} /> : null}
          </View>

          <Text style={iv.bigName}>{result && result.ok ? formatFormulas(result.name) : wanted}</Text>

          <Text style={iv.ctrlLabel}>THE THREE BRIDGES</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'center' }}>
            {bridges.map((v, i) => (
              <View key={i} style={iv.bridgeCol}>
                <Pressable onPress={() => set(i, 1)} style={iv.bridgeBtn}>
                  <Ionicons name="chevron-up" size={18} color={C.teal} />
                </Pressable>
                <Text style={iv.bridgeVal}>{v}</Text>
                <Pressable onPress={() => set(i, -1)} style={iv.bridgeBtn}>
                  <Ionicons name="chevron-down" size={18} color={C.teal} />
                </Pressable>
              </View>
            ))}
          </View>

          <View style={iv.noteBox}>
            <Ionicons name="calculator-outline" size={16} color={C.teal} />
            <Text style={iv.noteTxt}>
              {`${bridges[0]} + ${bridges[1]} + ${bridges[2]} bridge carbons, plus the 2 bridgeheads they join, is ${total} — which is what ${ROOTS[total] || '?'}ane says. The numbers and the root always agree, so each checks the other.`}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={!moved} style={[iv.continue, !moved && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{moved ? 'Continue' : 'Try changing a bridge'}</Text>
      </Pressable>
    </View>
  );
}

// ── Trace the parent chain ───────────────────────────────────
// Unit 2's whole skill, and one no static card teaches: the learner taps
// their way along a path and is told how long it is, and whether a longer one
// exists. Being wrong is informative — a short path is answered with a number,
// not a verdict.
export function ChainTracer({ step, width, onContinue }) {
  const spec = step.molecule || { chain: 6, branches: [{ at: 3, size: 2 }] };
  const [path, setPath] = useState([]);
  const [done, setDone] = useState(false);

  const mol = useMemo(() => {
    const g = fixedChain(spec.chain);
    let id = spec.chain;
    for (const b of spec.branches || []) {
      let prev = b.at;
      for (let k = 0; k < b.size; k++) {
        const anchor = k === 0 ? b.at : id;
        const pt = hangFrom(g, anchor);
        id += 1;
        g.atoms.push({ id, x: pt.x, y: pt.y + (k ? BOND * 0.8 * k : 0) });
        g.bonds.push({ a: prev, b: id, order: 1, stereo: null });
        prev = id;
      }
    }
    return g;
  }, [spec]);

  const longest = useMemo(() => {
    // longest simple path through the carbon skeleton
    const adj = new Map(mol.atoms.map((a) => [a.id, []]));
    for (const b of mol.bonds) { adj.get(b.a).push(b.b); adj.get(b.b).push(b.a); }
    let best = 0;
    const walk = (v, seen) => {
      best = Math.max(best, seen.size);
      for (const n of adj.get(v) || []) if (!seen.has(n)) walk(n, new Set([...seen, n]));
    };
    for (const a of mol.atoms) walk(a.id, new Set([a.id]));
    return best;
  }, [mol]);

  const adj = useMemo(() => {
    const m = new Map(mol.atoms.map((a) => [a.id, []]));
    for (const b of mol.bonds) { m.get(b.a).push(b.b); m.get(b.b).push(b.a); }
    return m;
  }, [mol]);

  const pick = (id) => {
    tap();
    setPath((cur) => {
      if (cur.length === 0) return [id];
      if (cur.includes(id)) return cur.slice(0, cur.indexOf(id) + 1);   // step back
      const last = cur[cur.length - 1];
      if (!(adj.get(last) || []).includes(id)) return cur;              // must be adjacent
      const next = [...cur, id];
      if (next.length === longest) { good(); setDone(true); }
      return next;
    });
  };

  const found = path.length;
  const highlight = useMemo(() => new Set(path), [path]);

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            <StaticMol
              mol={mol}
              width={Math.min(width - 90, 300)}
              showCarbons={false}
              highlight={highlight}
              onPickAtom={pick}
            />
          </View>

          <View style={iv.traceRow}>
            <View style={iv.traceBox}>
              <Text style={iv.traceVal}>{found}</Text>
              <Text style={iv.traceCap}>carbons traced</Text>
            </View>
            <Pressable onPress={() => { tap(); setPath([]); }} style={iv.traceReset}>
              <Ionicons name="refresh" size={16} color={C.teal} />
              <Text style={iv.traceResetTxt}>Start again</Text>
            </Pressable>
          </View>

          <View style={[iv.noteBox, found === longest && found > 0 && iv.noteBoxGood]}>
            <Ionicons
              name={found === longest && found > 0 ? 'checkmark-circle-outline' : 'information-circle-outline'}
              size={16}
              color={found === longest && found > 0 ? C.greenText : C.teal}
            />
            <Text style={iv.noteTxt}>
              {found === 0
                ? 'Tap a carbon to start, then tap along a connected path. Any route through the molecule counts, including ones that turn a corner into a branch.'
                : found === longest
                ? `${found} carbons — that is the longest path there is, so this is the parent chain.`
                : `${found} carbons so far. A longer path exists — try starting somewhere else, or turning where you went straight.`}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={!done} style={[iv.continue, !done && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{done ? 'Continue' : 'Find the longest path'}</Text>
      </Pressable>
    </View>
  );
}

// ── Put the prefixes in order ────────────────────────────────
// The trap this exists for: di- is not alphabetised. "dimethyl" files under m.
export function AlphaSorter({ step, width, onContinue }) {
  const items = step.items || [];
  const correct = step.order || [];
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const [checked, setChecked] = useState(false);

  const move = (from, dir) => {
    const to = from + dir;
    if (to < 0 || to >= order.length) return;
    tap();
    setOrder((o) => {
      const next = [...o];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setChecked(false);
  };

  const isRight = order.every((v, i) => items[v].sortKey === correct[i]);
  const check = () => { tap(); if (isRight) good(); setChecked(true); };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={{ marginTop: 16, gap: 8 }}>
            {order.map((idx, pos) => (
              <View key={idx} style={[iv.sortRow, checked && isRight && iv.sortRowRight]}>
                <Text style={iv.sortPos}>{pos + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={iv.sortName}>{formatFormulas(items[idx].label)}</Text>
                  {checked ? <Text style={iv.sortKey}>files under "{items[idx].sortKey}"</Text> : null}
                </View>
                <Pressable onPress={() => move(pos, -1)} disabled={pos === 0} style={[iv.sortBtn, pos === 0 && { opacity: 0.3 }]}>
                  <Ionicons name="chevron-up" size={18} color={C.teal} />
                </Pressable>
                <Pressable onPress={() => move(pos, 1)} disabled={pos === order.length - 1} style={[iv.sortBtn, pos === order.length - 1 && { opacity: 0.3 }]}>
                  <Ionicons name="chevron-down" size={18} color={C.teal} />
                </Pressable>
              </View>
            ))}
          </View>

          {!checked ? (
            <Pressable onPress={check} style={iv.flipBtn}>
              <Ionicons name="checkmark" size={18} color={C.teal} />
              <Text style={iv.flipTxt}>Check the order</Text>
            </Pressable>
          ) : (
            <View style={[iv.noteBox, !isRight && iv.noteBoxAlert]}>
              <Ionicons name={isRight ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={16} color={isRight ? C.greenText : '#8A6A12'} />
              <Text style={iv.noteTxt}>{isRight ? step.noteRight || 'Correct.' : step.noteWrong || 'Not yet — check which letter each one actually files under.'}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={!(checked && isRight)} style={[iv.continue, !(checked && isRight) && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{checked && isRight ? 'Continue' : 'Put them in order'}</Text>
      </Pressable>
    </View>
  );
}

// ── Slide the carbonyl ───────────────────────────────────────
// One group, one chain: at the end it is an aldehyde, one step inward it is a
// ketone. The family changes because the POSITION changed, and nothing else.
export function CarbonylSlider({ step, width, onContinue }) {
  const forms = step.forms || [];
  const [i, setI] = useState(0);
  const [moved, setMoved] = useState(false);

  const mols = useMemo(() => forms.map((f) => {
    const p = parseName(f.name);
    return p.ok ? p.mol : null;
  }), [forms]);
  const result = useMemo(() => (mols[i] ? nameGraph(mols[i]) : null), [mols, i]);

  const go = (d) => {
    const next = i + d;
    if (next < 0 || next >= forms.length) return;
    tap();
    setI(next);
    if (!moved) good();
    setMoved(true);
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            {mols[i] ? <StaticMol mol={mols[i]} width={Math.min(width - 90, 300)} showCarbons={false} /> : null}
          </View>

          <Text style={iv.bigName}>{result && result.ok ? formatFormulas(result.name) : '—'}</Text>
          <Text style={[iv.familyTag, forms[i] && forms[i].family === 'aldehyde' ? iv.familyAl : iv.familyOne]}>
            {forms[i] ? forms[i].family.toUpperCase() : ''}
          </Text>

          <View style={iv.stepRow}>
            <Pressable onPress={() => go(-1)} disabled={i === 0} style={[iv.round, i === 0 && iv.roundOff]}>
              <Ionicons name="chevron-back" size={22} color={i === 0 ? C.faint : C.teal} />
            </Pressable>
            <View style={iv.readout}>
              <Text style={iv.readoutValue}>{forms[i] ? forms[i].at : ''}</Text>
              <Text style={iv.readoutCaption}>carbonyl on carbon {forms[i] ? forms[i].at : ''}</Text>
            </View>
            <Pressable onPress={() => go(1)} disabled={i === forms.length - 1} style={[iv.round, i === forms.length - 1 && iv.roundOff]}>
              <Ionicons name="chevron-forward" size={22} color={i === forms.length - 1 ? C.faint : C.teal} />
            </Pressable>
          </View>

          <View style={iv.noteBox}>
            <Ionicons name="information-circle-outline" size={16} color={C.teal} />
            <Text style={iv.noteTxt}>{forms[i] ? forms[i].note : ''}</Text>
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={!moved} style={[iv.continue, !moved && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{moved ? 'Continue' : 'Try moving it'}</Text>
      </Pressable>
    </View>
  );
}

// ── Can this group take the suffix? ──────────────────────────
// Some groups are not merely low on the ladder — they are not on it. Tapping
// through makes that a property you can check rather than a list to memorise.
export function SuffixTester({ step, width, onContinue }) {
  const groups = step.groups || [];
  const [tried, setTried] = useState(() => new Set());
  const [last, setLast] = useState(null);
  const need = Math.min(groups.length, step.need || groups.length);

  const test = (k) => {
    tap();
    setTried((t) => {
      const next = new Set(t).add(k);
      if (next.size >= need && t.size < need) good();
      return next;
    });
    setLast(k);
  };

  const g = last != null ? groups[last] : null;
  const mol = useMemo(() => {
    if (!g) return null;
    const p = parseName(g.example);
    return p.ok ? p.mol : null;
  }, [g]);

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <Text style={iv.ctrlLabel}>TAP A GROUP</Text>
          <View style={iv.chipWrap}>
            {groups.map((x, k) => (
              <Pressable key={k} onPress={() => test(k)} style={[iv.groupChip, last === k && iv.groupChipOn]}>
                <Text style={[iv.groupChipTxt, last === k && { color: '#fff' }]}>{formatFormulas(x.label)}</Text>
              </Pressable>
            ))}
          </View>

          {g ? (
            <>
              <View style={iv.stage}>
                {mol ? <StaticMol mol={mol} width={Math.min(width - 110, 260)} showCarbons={false} /> : null}
              </View>
              <Text style={iv.bigName}>{formatFormulas(g.example)}</Text>
              <View style={[iv.verdict, g.canSuffix ? iv.verdictYes : iv.verdictNo]}>
                <Ionicons name={g.canSuffix ? 'checkmark-circle' : 'close-circle'} size={20} color={g.canSuffix ? C.greenText : C.danger} />
                <Text style={[iv.verdictTxt, { color: g.canSuffix ? C.greenText : C.danger }]}>
                  {g.canSuffix ? 'Can take the suffix' : 'Prefix only — never a suffix'}
                </Text>
              </View>
              <View style={iv.noteBox}>
                <Ionicons name="information-circle-outline" size={16} color={C.teal} />
                <Text style={iv.noteTxt}>{formatFormulas(g.note)}</Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={tried.size < need} style={[iv.continue, tried.size < need && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{tried.size >= need ? 'Continue' : `Test ${need - tried.size} more`}</Text>
      </Pressable>
    </View>
  );
}

// ── Work the four steps ──────────────────────────────────────
// The routine performed rather than read. Each stage is a choice that can be
// got wrong, and the wrong answer says why.
export function StepThrough({ step, width, onContinue }) {
  const stages = step.stages || [];
  const [at, setAt] = useState(0);
  const [wrong, setWrong] = useState(null);

  const mol = useMemo(() => {
    const p = parseName(step.name);
    return p.ok ? p.mol : null;
  }, [step.name]);

  const stage = stages[at];
  const finished = at >= stages.length;

  const choose = (k) => {
    tap();
    if (k === stage.answer) {
      good();
      setWrong(null);
      setAt(at + 1);
    } else {
      setWrong(k);
    }
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={iv.stage}>
            {mol ? <StaticMol mol={mol} width={Math.min(width - 90, 300)} showCarbons={false} /> : null}
          </View>

          <View style={iv.pipRow}>
            {stages.map((_, i) => (
              <View key={i} style={[iv.stagePip, i < at && iv.stagePipDone, i === at && iv.stagePipNow]}>
                <Text style={[iv.stagePipTxt, i <= at && { color: '#fff' }]}>{i + 1}</Text>
              </View>
            ))}
          </View>

          {finished ? (
            <>
              <Text style={iv.bigName}>{formatFormulas(step.name)}</Text>
              <View style={[iv.noteBox, iv.noteBoxGood]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={C.greenText} />
                <Text style={iv.noteTxt}>{step.noteDone || 'All four steps, in order — and the name falls out of them.'}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={iv.stageQ}>{formatFormulas(stage.q)}</Text>
              <View style={{ gap: 8, marginTop: 10 }}>
                {stage.options.map((o, k) => (
                  <Pressable key={k} onPress={() => choose(k)} style={[iv.stageOpt, wrong === k && iv.stageOptWrong]}>
                    <Text style={iv.stageOptTxt}>{formatFormulas(o)}</Text>
                  </Pressable>
                ))}
              </View>
              {wrong !== null ? (
                <View style={[iv.noteBox, iv.noteBoxAlert]}>
                  <Ionicons name="alert-circle-outline" size={16} color="#8A6A12" />
                  <Text style={iv.noteTxt}>{formatFormulas(stage.why ? stage.why[wrong] || stage.hint : stage.hint)}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={!finished} style={[iv.continue, !finished && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{finished ? 'Continue' : `Step ${at + 1} of ${stages.length}`}</Text>
      </Pressable>
    </View>
  );
}

// ── Slide between the two ways of drawing it ─────────────────
// The same molecule drawn twice, stacked exactly on top of each other, with a
// draggable divider revealing one through the other. Left of the line is
// skeletal, right is semi-structural, and the atoms line up because it is one
// set of coordinates rendered two ways.
//
// The earlier version stepped through carbon by carbon with arrows, which
// answered a different question — it showed the conversion happening rather
// than the two notations side by side.
export function FormSlider({ step, width, onContinue }) {
  const name = step.name || 'pentane';
  const mol = useMemo(() => {
    const p = parseName(name);
    return p.ok ? p.mol : null;
  }, [name]);

  const stageW = Math.min(width - 76, 300);
  const stageH = 170;

  // Both layers must be drawn at exactly the same scale and offset, or the
  // atoms sit in different places either side of the divider and the reveal
  // reads as two different molecules. StaticMol re-frames from its own
  // bounds unless it is given one, so both are given the same one here.
  //
  // The bounds are padded because written-out labels extend past the atom
  // coordinates they sit on — an unpadded frame clips "CH3" at the ends.
  const frame = useMemo(() => {
    if (!mol || !mol.atoms.length) return null;
    const xs = mol.atoms.map((a) => a.x);
    const ys = mol.atoms.map((a) => a.y);
    const padX = 34;
    const padY = 20;
    return {
      minX: Math.min(...xs) - padX,
      maxX: Math.max(...xs) + padX,
      minY: Math.min(...ys) - padY,
      maxY: Math.max(...ys) + padY,
      height: stageH,
    };
  }, [mol, stageH]);
  const [split, setSplit] = useState(0.5);      // 0 = all skeletal, 1 = all written out
  const [moved, setMoved] = useState(false);
  const splitRef = useRef(0.5);
  splitRef.current = split;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        setSplit(Math.max(0, Math.min(1, x / stageW)));
        setMoved(true);
        tap();
      },
      onPanResponderMove: (e, g) => {
        const x = e.nativeEvent.locationX != null ? e.nativeEvent.locationX : g.moveX;
        setSplit(Math.max(0, Math.min(1, x / stageW)));
      },
      onPanResponderRelease: () => {
        if (splitRef.current > 0.92 || splitRef.current < 0.08) good();
      },
    })
  ).current;

  const cut = Math.round(stageW * split);

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <GlossaryText style={iv.body}>{step.body}</GlossaryText> : null}

          <View style={[iv.revealStage, { width: stageW, height: stageH }]} {...pan.panHandlers}>
            {/* underneath: written out in full */}
            <View style={[iv.revealLayer, { width: stageW }]} pointerEvents="none">
              {mol ? <StaticMol mol={mol} width={stageW} showCarbons frame={frame} /> : null}
            </View>

            {/* On top: skeletal, clipped to the left of the divider. The SVG
                itself is transparent, so without an opaque background here the
                written-out layer showed through and the labels never
                disappeared however far the divider was dragged. */}
            <View
              style={[iv.revealLayer, iv.revealTop, { width: cut, overflow: 'hidden' }]}
              pointerEvents="none"
            >
              <View style={{ width: stageW }}>
                {mol ? <StaticMol mol={mol} width={stageW} showCarbons={false} frame={frame} /> : null}
              </View>
            </View>

            <View style={[iv.revealLine, { left: cut - 1 }]} pointerEvents="none" />
            <View style={[iv.revealKnob, { left: cut - 15, top: stageH / 2 - 15 }]} pointerEvents="none">
              <Ionicons name="code-outline" size={16} color="#fff" />
            </View>
          </View>

          <View style={[iv.revealLabels, { width: stageW }]}>
            <Text style={[iv.revealLabel, split > 0.15 && iv.revealLabelOn]}>skeletal form</Text>
            <Text style={[iv.revealLabel, split < 0.85 && iv.revealLabelOn]}>semi-structural</Text>
          </View>

          <View style={iv.noteBox}>
            <Ionicons name="information-circle-outline" size={16} color={C.teal} />
            <Text style={iv.noteTxt}>
              {formatFormulas(
                split > 0.92
                  ? 'All skeletal. Every line end and corner is a carbon, and the hydrogens are left out.'
                  : split < 0.08
                  ? 'All written out. Each carbon shown with the hydrogens it carries.'
                  : 'Drag the line across. The atoms do not move — only how they are written.'
              )}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={onContinue} disabled={!moved} style={[iv.continue, !moved && { opacity: 0.55 }]}>
        <Text style={iv.continueTxt}>{moved ? 'Continue' : 'Drag the divider'}</Text>
      </Pressable>
    </View>
  );
}

const iv = StyleSheet.create({
  revealStage: {
    alignSelf: 'center',
    marginTop: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    overflow: 'hidden',
  },
  revealLayer: { position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' },
  revealTop: { backgroundColor: C.card },
  revealLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: C.teal },
  revealKnob: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B2436',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  revealLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    marginTop: 8,
  },
  revealLabel: { fontSize: 11, fontWeight: '700', color: C.faint },
  revealLabelOn: { color: C.teal },
  traceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 },
  traceBox: {
    alignItems: 'center', backgroundColor: C.tealSoft, borderWidth: 1.5, borderColor: C.tealBorder,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 8,
  },
  traceVal: { fontSize: 28, fontWeight: '800', color: C.teal, lineHeight: 32 },
  traceCap: { fontSize: 11.5, fontWeight: '600', color: C.sub },
  traceReset: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  traceResetTxt: { fontSize: 13, fontWeight: '700', color: C.teal },
  noteBoxGood: { backgroundColor: C.greenSoft, borderWidth: 1, borderColor: C.green },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
    borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  sortRowRight: { borderColor: C.green, backgroundColor: C.greenSoft },
  sortPos: { fontSize: 15, fontWeight: '800', color: C.faint, width: 18 },
  sortName: { fontSize: 15, fontWeight: '700', color: C.navy },
  sortKey: { fontSize: 11.5, color: C.sub, marginTop: 1 },
  sortBtn: {
    width: 36, height: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.tealBorder, backgroundColor: C.tealSoft, borderRadius: 8,
  },
  familyTag: {
    alignSelf: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 0.8,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, overflow: 'hidden', marginTop: 4,
  },
  familyAl: { backgroundColor: '#E3EEFB', color: '#2C5FA8' },
  familyOne: { backgroundColor: '#F6E9FB', color: '#7A3FA8' },
  verdict: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: R.md, paddingVertical: 12, marginTop: 10,
  },
  verdictYes: { backgroundColor: C.greenSoft, borderWidth: 1, borderColor: C.green },
  verdictNo: { backgroundColor: '#FBE9E9', borderWidth: 1, borderColor: '#E7B7B7' },
  verdictTxt: { fontSize: 14.5, fontWeight: '800' },
  pipRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 14 },
  stagePip: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
  },
  stagePipDone: { backgroundColor: C.green, borderColor: C.green },
  stagePipNow: { backgroundColor: C.teal, borderColor: C.teal },
  stagePipTxt: { fontSize: 13, fontWeight: '800', color: C.sub },
  stageQ: { fontSize: 16.5, fontWeight: '800', color: C.navy, marginTop: 16, lineHeight: 23 },
  stageOpt: {
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
    borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 13,
  },
  stageOptWrong: { borderColor: '#E7B7B7', backgroundColor: '#FBE9E9' },
  stageOptTxt: { fontSize: 14.5, color: C.navy, fontWeight: '600' },
  isoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' },
  isoCard: {
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
    borderRadius: R.md, padding: 6, alignItems: 'center', justifyContent: 'center',
  },
  isoCardTried: { borderColor: C.tealBorder, backgroundColor: C.tealSoft },
  locTerm: {
    fontSize: 19, fontWeight: '800', color: C.navy,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1,
  },
  locTermKey: { backgroundColor: '#FDF6E3', color: '#8A6A12' },
  bridgeCol: { alignItems: 'center', gap: 2 },
  bridgeBtn: {
    width: 44, height: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.tealBorder, backgroundColor: C.tealSoft, borderRadius: 8,
  },
  bridgeVal: { fontSize: 24, fontWeight: '800', color: C.teal, minWidth: 30, textAlign: 'center' },
  numCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: R.md,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  numCardRight: { borderColor: C.green, backgroundColor: C.greenSoft },
  numCardWrong: { opacity: 0.5 },
  numLabel: { fontSize: 11.5, fontWeight: '700', color: C.sub },
  numName: { fontSize: 15, fontWeight: '800', color: C.navy, textAlign: 'center' },
  numNameStruck: { textDecorationLine: 'line-through', color: C.sub },
  numLocant: { fontSize: 11, color: C.faint },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupChipOn: { backgroundColor: C.teal, borderColor: C.teal },
  groupChipTxt: { fontSize: 13, fontWeight: '700', color: C.navy },
  flipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    backgroundColor: C.tealSoft,
    borderRadius: R.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 14,
  },
  flipTxt: { fontSize: 15, fontWeight: '800', color: C.teal },
  ctrlLabel: { fontSize: 10.5, fontWeight: '800', color: C.sub, letterSpacing: 0.6 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 6 },
  readout: {
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.tealSoft,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  readoutValue: { fontSize: 30, fontWeight: '800', color: C.teal, letterSpacing: -0.5, lineHeight: 34 },
  readoutCaption: { fontSize: 11.5, fontWeight: '600', color: C.sub, marginTop: -1 },
  noteBoxAlert: { backgroundColor: '#FDF6E3', borderWidth: 1, borderColor: '#EBD9A8' },
  bigName: { fontSize: 27, fontWeight: '800', color: C.teal, textAlign: 'center', marginTop: 16 },
  noteBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: 10,
    padding: 11,
    marginTop: 12,
  },
  noteTxt: { flex: 1, fontSize: 12.5, color: C.navy, lineHeight: 18 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  progressTxt: { fontSize: 12, fontWeight: '700', color: C.sub, marginLeft: 6 },
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },
  body: { fontSize: 14.5, color: C.navy, lineHeight: 22, marginTop: 10 },
  switchRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
  },
  // 44 is the minimum comfortable touch target; at the old 9pt padding these
  // came out around 35 and were awkward to hit.
  seg: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOn: { backgroundColor: C.teal },
  segTxt: { fontSize: 13, fontWeight: '700', color: C.sub },
  segTxtOn: { color: '#fff' },
  stage: { flex: 1, minHeight: 130, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  captionBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  caption: { flex: 1, fontSize: 13, color: C.navy, lineHeight: 19 },
  counterRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 6 },
  pip: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  pipOn: { backgroundColor: C.teal, borderColor: C.teal },
  countTxt: { fontSize: 13, fontWeight: '700', color: C.navy, textAlign: 'center', marginTop: 8 },
  hint: { fontSize: 12.5, color: C.sub, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  doneBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: C.greenSoft,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  doneTxt: { flex: 1, fontSize: 13.5, color: C.navy, lineHeight: 19 },
  continue: {
    backgroundColor: C.teal,
    borderRadius: R.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  continueTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
