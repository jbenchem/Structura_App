// ─────────────────────────────────────────────────────────────
// Skeletal → semi-structural (condensed) formulas.
//
// CH₃CH₂CH₂OH, CH₃COCH₃, CH₃COOCH₂CH₃ — the notation a VCE student meets in
// text and must read as fluently as a drawing. Derived from the molecule
// graph the engine built, never from the name, so a condensed formula can
// never disagree with the structure on screen.
//
// The backbone is the longest path over HEAVY atoms, not carbons only: that
// is what makes ethers, esters and amides come out right (the chain runs
// through the O or N). Ties prefer the path carrying more carbons, so
// propan-2-ol reads CH₃CH(OH)CH₃ rather than being led down its own -OH.
//
// Rings are refused outright — condensed notation cannot express a ring
// without conventions this course has not taught — and refusal simply
// leaves the skeletal drawing in place. Refuse over guess.
// ─────────────────────────────────────────────────────────────

const VALENCE = { C: 4, N: 3, O: 2, S: 2, F: 1, Cl: 1, Br: 1, I: 1, H: 1 };
const SUBS = '₀₁₂₃₄₅₆₇₈₉';

// Digits that follow a letter or a closing bracket are counts, so they drop.
export const toSubscripts = (s) =>
  s.replace(/([A-Za-z)\]])(\d+)/g, (_, head, digits) =>
    head + digits.replace(/\d/g, (d) => SUBS[+d])
  );

const elOf = (a) => a.el || 'C';

function graph(mol) {
  const atoms = new Map((mol.atoms || []).map((a) => [a.id, a]));
  const adj = new Map([...atoms.keys()].map((id) => [id, []]));
  for (const b of mol.bonds || []) {
    if (!adj.has(b.a) || !adj.has(b.b)) continue;
    adj.get(b.a).push({ to: b.b, order: b.order || 1 });
    adj.get(b.b).push({ to: b.a, order: b.order || 1 });
  }
  return { atoms, adj };
}

const hCount = (g, id) => {
  const el = elOf(g.atoms.get(id));
  const v = VALENCE[el];
  if (v == null) return 0;
  const used = g.adj.get(id).reduce((n, e) => n + e.order, 0);
  return Math.max(0, v - used);
};

// A cycle anywhere means a ring: refuse.
function hasRing(g) {
  const seen = new Set();
  for (const start of g.atoms.keys()) {
    if (seen.has(start)) continue;
    let nodes = 0;
    let edges = 0;
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const id = stack.pop();
      nodes++;
      for (const e of g.adj.get(id)) {
        edges++;
        if (!seen.has(e.to)) {
          seen.add(e.to);
          stack.push(e.to);
        }
      }
    }
    if (edges / 2 >= nodes) return true;
  }
  return false;
}

// A doubly-bonded oxygen is a carbonyl, and a carbonyl is always written on
// its carbon (CHO, CO, COOH) — never walked into as if it were the next link
// in the chain. Excluding it here is what makes ethanal CH3CHO rather than
// CH3CH=O, and ethanoic acid CH3COOH rather than CH3C(OH)=O.
const isCarbonylO = (g, id) =>
  elOf(g.atoms.get(id)) === 'O' && g.adj.get(id).some((e) => e.order === 2);

// Longest path over heavy atoms; ties prefer more carbons, then lower ids.
function backbone(g) {
  let best = null;
  const score = (path) => [path.length, path.filter((id) => elOf(g.atoms.get(id)) === 'C').length];
  const better = (p) => {
    if (!best) return true;
    const [la, ca] = score(p);
    const [lb, cb] = score(best);
    if (la !== lb) return la > lb;
    if (ca !== cb) return ca > cb;
    return p[0] < best[0];
  };
  const walk = (id, seen, path) => {
    if (better(path)) best = [...path];
    for (const e of g.adj.get(id)) {
      if (seen.has(e.to)) continue;
      if (isCarbonylO(g, e.to)) continue;
      seen.add(e.to);
      path.push(e.to);
      walk(e.to, seen, path);
      path.pop();
      seen.delete(e.to);
    }
  };
  for (const id of g.atoms.keys()) {
    if (isCarbonylO(g, id)) continue;
    walk(id, new Set([id]), [id]);
  }
  return best || [];
}

// Nitro: one N carrying two oxygens and nothing else heavy.
const isNitro = (g, id) => {
  if (elOf(g.atoms.get(id)) !== 'N') return false;
  const os = g.adj.get(id).filter((e) => elOf(g.atoms.get(e.to)) === 'O');
  return os.length === 2 && g.adj.get(id).length === 3;
};

// A branch hanging off the backbone, rendered outward.
function branch(g, id, from, depth = 0) {
  if (depth > 6) return null;
  if (isNitro(g, id)) return 'NO2';
  const el = elOf(g.atoms.get(id));
  const kids = g.adj.get(id).filter((e) => e.to !== from);
  const dbl = kids.find((e) => e.order === 2 && elOf(g.atoms.get(e.to)) === 'O');
  const h = hCount(g, id);
  let head;
  if (el === 'C' && dbl) head = h ? 'CHO' : 'CO';
  else head = el + (h > 1 ? `H${h}` : h === 1 ? 'H' : '');
  const rest = kids.filter((e) => e !== dbl);
  if (!rest.length) return head;
  const parts = [];
  for (const e of rest.sort((x, y) => x.to - y.to)) {
    const sub = branch(g, e.to, id, depth + 1);
    if (sub == null) return null;
    parts.push(e.order === 2 ? `=${sub}` : e.order === 3 ? `\u2261${sub}` : sub);
  }
  // A single tail continues inline (CH2CH3); several need brackets.
  return parts.length === 1 ? head + parts[0] : head + parts.map((p) => `(${p})`).join('');
}

function renderChain(g, chain) {
  const inChain = new Set(chain);
  const out = [];
  for (let i = 0; i < chain.length; i++) {
    const id = chain[i];
    const prev = chain[i - 1];
    const next = chain[i + 1];
    if (isNitro(g, id)) {
      out.push('NO2');
    } else {
      const el = elOf(g.atoms.get(id));
      const subs = g.adj.get(id).filter((e) => e.to !== prev && e.to !== next);
      const dbl = subs.find((e) => e.order === 2 && elOf(g.atoms.get(e.to)) === 'O');
      const h = hCount(g, id);
      let token;
      if (el === 'C' && dbl) {
        // Terminal carbonyl with a hydrogen is an aldehyde; otherwise the
        // carbonyl is written bare and whatever follows completes it
        // (…COOH for an acid, …COO… for an ester, …CO… for a ketone).
        token = h ? 'CHO' : 'CO';
      } else {
        token = el + (h > 1 ? `H${h}` : h === 1 ? 'H' : '');
      }
      const others = subs.filter((e) => e !== dbl);
      const rendered = [];
      for (const e of others.sort((x, y) => x.to - y.to)) {
        const sub = branch(g, e.to, id, 1);
        if (sub == null) return null;
        rendered.push(sub);
      }
      // A trailing group on the last atom needs no brackets: CH2OH, CH2Cl.
      if (rendered.length === 1 && !next && token !== 'CHO' && token !== 'CO') {
        token += rendered[0];
      } else {
        token += rendered.map((r) => `(${r})`).join('');
      }
      out.push(token);
    }
    if (next != null) {
      const bond = g.adj.get(id).find((e) => e.to === next);
      // A nitrile is written CN, not C≡N; a carbon-carbon triple keeps its
      // symbol, because CHCCH2CH3 would be unreadable.
      const nitrile =
        bond.order === 3 &&
        elOf(g.atoms.get(next)) === 'N' &&
        g.adj.get(next).length === 1;
      if (bond.order === 2) out.push('=');
      if (bond.order === 3 && !nitrile) out.push('\u2261');
    }
  }
  void inChain;
  return out.join('');
}

// Which end reads first: a functional group on a terminal atom belongs at
// the right (CH₃CH₂OH), otherwise the first functional feature takes the
// lowest position (CH₃COCH₂CH₃).
function orient(g, chain) {
  const featureAt = (path) =>
    path.findIndex((id, i) => {
      const el = elOf(g.atoms.get(id));
      if (el !== 'C') return true;
      const subs = g.adj.get(id).filter((e) => e.to !== path[i - 1] && e.to !== path[i + 1]);
      return subs.some((e) => elOf(g.atoms.get(e.to)) !== 'C');
    });
  const rev = [...chain].reverse();
  const terminalFn = (path) => {
    const last = path[path.length - 1];
    if (elOf(g.atoms.get(last)) !== 'C') return true;
    const subs = g.adj.get(last).filter((e) => e.to !== path[path.length - 2]);
    return subs.some((e) => elOf(g.atoms.get(e.to)) !== 'C');
  };
  if (terminalFn(chain) !== terminalFn(rev)) return terminalFn(chain) ? chain : rev;
  const a = featureAt(chain);
  const b = featureAt(rev);
  if (a !== b) return (a === -1 ? Infinity : a) <= (b === -1 ? Infinity : b) ? chain : rev;
  return chain[0] <= rev[0] ? chain : rev;
}

// The public call: a condensed string, or null when this molecule should
// keep its drawing.
export function semiStructural(mol, { subscripts = true } = {}) {
  if (!mol || !(mol.atoms || []).length) return null;
  const g = graph(mol);
  if (g.atoms.size > 24) return null;
  if (hasRing(g)) return null;
  const chain = backbone(g);
  if (chain.length < 1) return null;
  const text = renderChain(g, orient(g, chain));
  if (!text) return null;
  return subscripts ? toSubscripts(text) : text;
}
