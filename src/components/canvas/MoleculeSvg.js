// ─────────────────────────────────────────────────────────────
// Pure molecule renderer (model coordinates, no interaction).
// Used inside the editor's transformed <G> and, at small scale,
// for the feedback-card thumbnail.
//
// Skeletal conventions: carbons are unlabeled vertices unless
// isolated / charged / showH; heteroatoms show element + Hn.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { G, Line, Circle, Polygon, Path, Rect, Text as SvgText, TSpan } from 'react-native-svg';
import { C } from '../../theme';
import { hydrogenCount, bondsOf, atomById } from '../../chem/model';

const LABEL_TRIM = 12; // shorten bonds that meet a labeled atom

function hasLabel(mol, atom) {
  if (atom.el !== 'C') return true;
  if (atom.charge) return true;
  if (atom.showH) return true;
  return false;
}

function isSeedDot(mol, atom) {
  return atom.el === 'C' && bondsOf(mol, atom.id).length === 0 && !atom.charge && !atom.showH;
}

function labelParts(mol, atom) {
  const h = hydrogenCount(mol, atom);
  return {
    el: atom.el,
    h,
    charge: atom.charge,
  };
}

// ── Bond drawing helpers ─────────────────────────────────────
function trimmedEnds(mol, bond) {
  const a = atomById(mol, bond.a);
  const b = atomById(mol, bond.b);
  let { x: x1, y: y1 } = a;
  let { x: x2, y: y2 } = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  if (hasLabel(mol, a)) {
    x1 += ux * LABEL_TRIM;
    y1 += uy * LABEL_TRIM;
  }
  if (hasLabel(mol, b)) {
    x2 -= ux * LABEL_TRIM;
    y2 -= uy * LABEL_TRIM;
  }
  return { x1, y1, x2, y2, ux, uy, px: -uy, py: ux };
}

function MultiLine({ e, order, color, width }) {
  const gap = 3.1;
  const offsets = order === 1 ? [0] : order === 2 ? [-gap, gap] : [-gap * 1.45, 0, gap * 1.45];
  return (
    <>
      {offsets.map((o, i) => (
        <Line
          key={i}
          x1={e.x1 + e.px * o}
          y1={e.y1 + e.py * o}
          x2={e.x2 + e.px * o}
          y2={e.y2 + e.py * o}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
        />
      ))}
    </>
  );
}

function Wedge({ e, color }) {
  const wNarrow = 1.1;
  const wWide = 5.2;
  const pts = [
    `${e.x1 + e.px * wNarrow},${e.y1 + e.py * wNarrow}`,
    `${e.x1 - e.px * wNarrow},${e.y1 - e.py * wNarrow}`,
    `${e.x2 - e.px * wWide},${e.y2 - e.py * wWide}`,
    `${e.x2 + e.px * wWide},${e.y2 + e.py * wWide}`,
  ].join(' ');
  return <Polygon points={pts} fill={color} />;
}

function Hash({ e, color }) {
  const n = 6;
  const strokes = [];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 0.5);
    const cx = e.x1 + (e.x2 - e.x1) * t;
    const cy = e.y1 + (e.y2 - e.y1) * t;
    const w = 1.4 + 4.2 * t;
    strokes.push(
      <Line
        key={i}
        x1={cx + e.px * w}
        y1={cy + e.py * w}
        x2={cx - e.px * w}
        y2={cy - e.py * w}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    );
  }
  return <>{strokes}</>;
}

function Wavy({ e, color }) {
  const len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
  const waves = Math.max(3, Math.round(len / 11));
  const amp = 3.6;
  let d = `M ${e.x1} ${e.y1}`;
  for (let i = 0; i < waves; i++) {
    const t1 = (i + 0.5) / waves;
    const t2 = (i + 1) / waves;
    const side = i % 2 === 0 ? 1 : -1;
    const cx = e.x1 + (e.x2 - e.x1) * t1 + e.px * amp * side;
    const cy = e.y1 + (e.y2 - e.y1) * t1 + e.py * amp * side;
    const x = e.x1 + (e.x2 - e.x1) * t2;
    const y = e.y1 + (e.y2 - e.y1) * t2;
    d += ` Q ${cx} ${cy} ${x} ${y}`;
  }
  return <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />;
}

function BondShape({ mol, bond, color, width = 2.4 }) {
  const e = trimmedEnds(mol, bond);
  if (bond.stereo === 'wedge' && bond.order === 1) return <Wedge e={e} color={color} />;
  if (bond.stereo === 'hash' && bond.order === 1) return <Hash e={e} color={color} />;
  if (bond.stereo === 'wavy' && bond.order === 1) return <Wavy e={e} color={color} />;
  return <MultiLine e={e} order={bond.order} color={color} width={width} />;
}

// ── Atom label ───────────────────────────────────────────────
function AtomLabel({ mol, atom }) {
  const { el, h, charge } = labelParts(mol, atom);
  const showEl = el !== 'C' || charge !== 0 || atom.showH;
  if (!showEl) return null;

  const hTxt = h > 0 ? 'H' : '';
  const hSub = h > 1 ? String(h) : '';
  const chargeTxt = charge > 0 ? (charge > 1 ? `${charge}+` : '+') : charge < 0 ? (charge < -1 ? `${-charge}-` : '-') : '';
  const approxChars = el.length + hTxt.length + hSub.length * 0.7 + chargeTxt.length * 0.7;
  const w = approxChars * 9 + 8;

  return (
    <G>
      <Rect x={atom.x - w / 2} y={atom.y - 11} width={w} height={22} rx={5} fill={C.bg} />
      <SvgText
        x={atom.x}
        y={atom.y + 5.5}
        fontSize={16}
        fontWeight="700"
        fill={C.navy}
        textAnchor="middle"
      >
        {el}
        {hTxt ? <TSpan fontSize={16}>{hTxt}</TSpan> : null}
        {hSub ? (
          <TSpan fontSize={10} dy={4}>
            {hSub}
          </TSpan>
        ) : null}
        {chargeTxt ? (
          <TSpan fontSize={10} dy={hSub ? -10 : -6}>
            {chargeTxt}
          </TSpan>
        ) : null}
      </SvgText>
    </G>
  );
}

// ── Main renderer ────────────────────────────────────────────
export function MoleculeShapes({
  mol,
  highlightAtoms,
  highlightBonds,
  selectedAtom,
  selectedBond,
  dimmed,
}) {
  const hlA = highlightAtoms || new Set();
  const hlB = highlightBonds || new Set();
  const strokeColor = dimmed ? C.faint : C.navy;

  return (
    <G opacity={dimmed ? 0.55 : 1}>
      {/* highlight underlays */}
      {mol.bonds
        .filter((b) => hlB.has(b.id))
        .map((b) => (
          <BondShape key={`hl${b.id}`} mol={mol} bond={{ ...b, stereo: null }} color={C.warn} width={7} />
        ))}
      {mol.atoms
        .filter((a) => hlA.has(a.id))
        .map((a) => (
          <Circle key={`hl${a.id}`} cx={a.x} cy={a.y} r={13} fill={C.warn} opacity={0.35} />
        ))}
      {selectedBond ? (
        <BondShape
          mol={mol}
          bond={{ ...selectedBond, stereo: null }}
          color={C.tealBorder}
          width={8}
        />
      ) : null}
      {selectedAtom ? (
        <Circle cx={selectedAtom.x} cy={selectedAtom.y} r={14} fill={C.tealSoft} stroke={C.teal} strokeWidth={1.5} />
      ) : null}

      {/* bonds */}
      {mol.bonds.map((b) => (
        <BondShape key={b.id} mol={mol} bond={b} color={strokeColor} />
      ))}

      {/* atoms */}
      {mol.atoms.map((a) =>
        isSeedDot(mol, a) ? (
          <G key={a.id}>
            <Circle cx={a.x} cy={a.y} r={9} fill="none" stroke={C.teal} strokeWidth={1.8} />
            <Circle cx={a.x} cy={a.y} r={3.4} fill={C.navy} />
          </G>
        ) : (
          <AtomLabel key={a.id} mol={mol} atom={a} />
        )
      )}
    </G>
  );
}
