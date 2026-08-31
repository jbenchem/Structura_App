// ─────────────────────────────────────────────────────────────
// Smart text: elements and naming affixes, live in every paragraph.
//
// Two token families are detected automatically in plain prose — no
// [[markers]] to author, no list to keep in sync:
//
//   elements   "carbon", "oxygen", "bromine" … — derived from the periodic
//              table's own ELEMENTS list, coloured the way the reference
//              sheet colours that element, tapping opens the periodic table
//              on it.
//   affixes    "-ol", "-oic acid", "hydroxy-" … — derived from the naming
//              ladder (LADDER), tapping opens the priority list on that row.
//
// Detection runs only on text OUTSIDE glossary markers, so a [[carboxylic
// acid]] stays a glossary term and its inner words are not re-tokenised.
//
// The tap needs somewhere to go. Screens that own a ReferenceSheet provide
// ReferenceLinkContext; elsewhere the bubble still explains the token and
// simply omits the "open" action — a tap is never a dead end.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { ELEMENTS } from '../content/periodicTable';
import { LADDER } from '../content/reference';
import { C } from '../theme';

export const ReferenceLinkContext = React.createContext(null);

// The reference sheet's own colouring, mirrored: oxygen red, nitrogen blue,
// halogens purple, everything else navy — so a word and its table cell agree.
export function elementInk(sym, group) {
  if (sym === 'O' || sym === 'S') return '#D64545';
  if (sym === 'N' || sym === 'P') return '#2D6FD8';
  if (group === 17) return '#7A3FBF';
  return C.navy;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');

const ELEMENT_TOKENS = new Map(
  ELEMENTS.map((e) => [
    e.name.toLowerCase(),
    { kind: 'element', sym: e.sym, label: `${e.name} (${e.sym})`, short: e.role || `Element ${e.z}, group ${e.group}.`, colour: elementInk(e.sym, e.group) },
  ])
);

const LADDER_TOKENS = new Map();
for (const g of LADDER) {
  const entry = { kind: 'ladder', rank: g.rank, label: g.group, short: `Rank ${g.rank} on the naming ladder: suffix ${g.suffix}, prefix ${g.prefix}.`, colour: C.teal };
  if (g.suffix) LADDER_TOKENS.set(g.suffix.toLowerCase(), entry);
  if (g.prefix) LADDER_TOKENS.set(g.prefix.toLowerCase(), entry);
}

// Longest tokens first so "-oic acid" wins over "-oic" and "carboxy-" is
// never half-matched.
const ALL = [...ELEMENT_TOKENS.keys(), ...LADDER_TOKENS.keys()].sort((a, b) => b.length - a.length);
const PATTERN = new RegExp(`(?<![\\w-])(${ALL.map(esc).join('|')})(?![\\w-])`, 'gi');

export function tokenFor(raw) {
  const k = raw.toLowerCase();
  return ELEMENT_TOKENS.get(k) || LADDER_TOKENS.get(k) || null;
}

// Split plain prose into plain runs and smart tokens.
export function detectSmartTokens(text) {
  const out = [];
  let last = 0;
  const re = new RegExp(PATTERN.source, 'gi');
  let m;
  while ((m = re.exec(text)) !== null) {
    const token = tokenFor(m[1]);
    if (!token) continue;
    if (m.index > last) out.push({ plain: text.slice(last, m.index) });
    out.push({ smart: token, shown: m[1] });
    last = m.index + m[1].length;
  }
  if (last < text.length) out.push({ plain: text.slice(last) });
  return out;
}

// Where a tap goes.
export const anchorFor = (token) =>
  token.kind === 'element' ? { tab: 'elements', element: token.sym } : { tab: 'ladder', rank: token.rank };
