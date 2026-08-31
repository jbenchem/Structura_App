// ─────────────────────────────────────────────────────────────
// Glossary.
//
// Emphasis used to be capitals — "the MAIN GROUP of elements" — which shouts
// at the reader and tells them nothing. A term is marked instead, and tapping
// it gives the definition where the reader already is, so meeting a new word
// costs a tap rather than a trip to the reference sheet.
//
// Definitions are one or two sentences. Anything longer belongs in a lesson,
// and a glossary entry that needs a paragraph is a sign the term was
// introduced without being taught.
// ─────────────────────────────────────────────────────────────

export const GLOSSARY = {
  // ── the periodic table ──
  'main group': {
    term: 'main group',
    short: 'The predictable columns at each side of the periodic table.',
    def: 'The tall columns at either side of the periodic table. These elements form a predictable number of bonds, which is why organic chemistry is built almost entirely from them.',
  },
  valence: {
    term: 'valence',
    short: 'How many bonds an atom forms. Carbon forms four.',
    def: 'The number of bonds an atom forms. Carbon has a valence of four, oxygen two, hydrogen one.',
  },

  // ── structure ──
  'skeletal form': {
    term: 'skeletal form',
    short: 'Lines only. Every end and corner is a carbon.',
    def: 'A drawing showing only the carbon–carbon bonds. Every line end and corner is a carbon, and the hydrogens on carbon are left out.',
    example: 'butane',
  },
  'semi-structural': {
    term: 'semi-structural formula',
    short: 'Written out as groups: CH3CH2CH3.',
    def: 'A written form grouping the atoms on each carbon, with the bonds between groups implied: CH3CH2CH3.',
  },
  'structural formula': {
    term: 'structural formula',
    short: 'Every atom and every bond drawn in full.',
    def: 'A drawing showing every atom and every bond, including the hydrogens.',
  },
  'molecular formula': {
    term: 'molecular formula',
    short: 'Just the atom counts, like C4H10.',
    def: 'Just the atom counts — C4H10. It says nothing about how the atoms are joined, so several compounds can share one.',
  },
  'parent chain': {
    term: 'parent chain',
    short: 'The longest carbon chain. It gives the name its root.',
    def: 'The longest continuous chain of carbons, which gives the name its root. When a functional group is present, the parent must contain it.',
  },
  substituent: {
    term: 'substituent',
    short: 'Anything hanging off the parent chain.',
    def: 'Anything hanging off the parent chain — a branch, a halogen, a group. Cited as a prefix with a number saying where it sits.',
  },
  locant: {
    term: 'locant',
    short: 'The number saying which carbon a group sits on.',
    def: 'The number saying which carbon something is attached to. Chains are numbered to make locants as low as possible.',
  },
  isomer: {
    term: 'isomers',
    short: 'Same formula, different structure, different compound.',
    def: 'Compounds with the same molecular formula but different structures. Same atoms, joined up differently, so different compounds.',
  },

  // ── naming ──
  root: {
    term: 'root',
    short: 'The part of the name giving the carbon count.',
    def: 'The part of the name giving the number of carbons in the parent chain: meth, eth, prop, but, pent…',
  },
  suffix: {
    term: 'suffix',
    short: 'The ending that says what kind of molecule it is.',
    def: 'The ending of a name, saying what kind of molecule it is: -ane, -ene, -ol, -one, -oic acid.',
  },
  prefix: {
    term: 'prefix',
    short: 'A part written in front of the parent name.',
    def: 'A part written in front of the parent name, for substituents and for any group that lost the suffix to something more senior.',
  },
  'principal group': {
    term: 'principal group',
    short: 'The most senior group. It takes the suffix.',
    def: 'The most senior group present. It takes the suffix, and the chain is numbered to give it the lowest locant.',
  },
  seniority: {
    term: 'seniority',
    short: 'The ranking that decides which group takes the suffix.',
    def: 'The ranking that decides which group takes the suffix when several are present. Acids outrank esters, which outrank aldehydes, and so on down.',
  },

  // ── families ──
  hydrocarbon: {
    term: 'hydrocarbon',
    short: 'Carbon and hydrogen only.',
    def: 'A compound of carbon and hydrogen only. An alcohol is not one, because it contains oxygen.',
  },
  saturated: {
    term: 'saturated',
    short: 'Single bonds only. No room for more hydrogen.',
    def: 'Containing single bonds only. There is no room for more hydrogen, which is what the word means.',
  },
  unsaturated: {
    term: 'unsaturated',
    short: 'Has a double or triple bond.',
    def: 'Containing at least one double or triple bond, so carrying fewer hydrogens than it could.',
  },
  alkane: { term: 'alkane', short: 'Single bonds only. Ends in -ane.', def: 'A hydrocarbon with single bonds only. General formula CnH2n+2, and the suffix is -ane.', example: 'butane' },
  alkene: { term: 'alkene', short: 'Has a carbon-carbon double bond. Ends in -ene.', def: 'A hydrocarbon containing a carbon–carbon double bond. Suffix -ene, with a locant for where it starts.', example: 'but-2-ene' },
  amine: { term: 'amine', short: 'Nitrogen with an N–H, on a carbon chain. Ends in -amine.', def: 'An NH₂ (or substituted N) bonded to a carbon chain. Suffix -amine with a locant; nitrogen\u2019s answer to the alcohol.', example: 'propan-1-amine' },
  amide: { term: 'amide', short: 'A C=O bonded straight to nitrogen. Ends in -amide.', def: 'The C(=O)\u2013N link: a carbonyl carbon bonded directly to nitrogen. Suffix -amide; between amino acids this same link is the peptide bond.', example: 'ethanamide' },
  atom: { term: 'atom', short: 'The smallest unit of an element.', def: 'The smallest particle of an element that still is that element. Every structure in this course is a handful of atoms and the bonds between them.', example: null },
  molecule: { term: 'molecule', short: 'Atoms bonded together as one unit.', def: 'Two or more atoms held together by covalent bonds, moving as a single unit. Every compound this course names is a molecule.', example: 'CH4' },
  element: { term: 'element', short: 'One kind of atom.', def: 'A substance made of only one kind of atom \u2014 carbon, hydrogen, oxygen. The periodic table is the catalogue of them.', example: null },
  bond: { term: 'bond', short: 'A shared pair of electrons holding two atoms together.', def: 'A covalent bond is a shared pair of electrons holding two atoms together. Drawn as a line; double and triple bonds share two and three pairs.', example: null },
  haloalkane: { term: 'haloalkane', short: 'An alkane with a halogen attached.', def: 'An alkane in which one or more hydrogens have been replaced by a halogen — fluoro-, chloro-, bromo- or iodo-. Named with the halogen as a prefix.', example: '2-chlorobutane' },
  aldehyde: { term: 'aldehyde', short: 'A C=O at the end of the chain. Ends in -al.', def: 'A carbonyl group on a terminal carbon, so it always sits at position 1. Suffix -al, no locant needed.', example: 'propanal' },
  ketone: { term: 'ketone', short: 'A C=O inside the chain. Ends in -one.', def: 'A carbonyl group on a non-terminal carbon, flanked by carbons on both sides. Suffix -one, with a locant.', example: 'propan-2-one' },
  'carboxylic acid': { term: 'carboxylic acid', short: 'The COOH group. Ends in -oic acid.', def: 'A carbon carrying both a C=O and an OH, always terminal. Suffix -oic acid; the most senior group met at VCE.', example: 'ethanoic acid' },
  'dispersion forces': { term: 'dispersion forces', short: 'The weak attraction every molecule has.', def: 'Temporary, flickering attractions between all molecules, growing with size and contact area. The only intermolecular force alkanes have, which is why they boil low.', example: null },
  alkyne: { term: 'alkyne', short: 'Has a carbon-carbon triple bond. Ends in -yne.', def: 'A hydrocarbon containing a carbon–carbon triple bond. Suffix -yne.', example: 'but-1-yne' },
  'functional group': {
    term: 'functional group',
    short: 'The atoms that give a molecule its chemistry.',
    def: 'An atom or group of atoms that gives a molecule its characteristic chemistry — a hydroxyl, a carbonyl, a halogen.',
  },
  hydroxyl: { term: 'hydroxyl', short: 'An -OH group. Makes it an alcohol.', def: 'An –OH group: an oxygen joined to a carbon and to a hydrogen. It makes the molecule an alcohol.', example: 'propan-1-ol' },
  carbonyl: { term: 'carbonyl', short: 'A carbon double-bonded to oxygen, C=O.', def: 'A carbon double-bonded to an oxygen, C=O. The group at the heart of aldehydes, ketones, acids and esters.', example: 'propan-2-one' },
  carboxyl: { term: 'carboxyl', short: 'A carbonyl and hydroxyl on one carbon, -COOH.', def: 'A carbonyl and a hydroxyl on the same carbon, –COOH. It makes the molecule a carboxylic acid.', example: 'ethanoic acid' },
  halogen: { term: 'halogen', short: 'Fluorine, chlorine, bromine or iodine. Always a prefix.', def: 'Fluorine, chlorine, bromine or iodine. Each forms one bond and is always cited as a prefix.', example: '2-chlorobutane' },
  amine: { term: 'amine', short: 'A nitrogen on the chain, -NH2.', def: 'A nitrogen attached to a carbon chain, –NH2. Nitrogen forms three bonds, so it carries two hydrogens.', example: 'butan-1-amine' },
  ester: { term: 'ester', short: 'A carbonyl bridging by oxygen to another chain.', def: 'A carbonyl whose second oxygen bridges to another carbon chain. Named as two words.', example: 'methyl ethanoate' },
  ether: { term: 'ether', short: 'An oxygen bridging two carbon chains.', def: 'An oxygen bridging two carbon chains, with no hydrogen of its own. Always cited as an alkoxy prefix.', example: 'methoxyethane' },

  // ── stereochemistry ──
  cis: { term: 'cis', short: 'Like groups on the same side of a double bond.', def: 'The two like groups are on the same side of a double bond.', example: 'cis-but-2-ene' },
  trans: { term: 'trans', short: 'Like groups on opposite sides of a double bond.', def: 'The two like groups are on opposite sides of a double bond.', example: 'trans-but-2-ene' },
  chiral: {
    term: 'chiral centre',
    short: 'A carbon with four different groups.',
    def: 'A carbon carrying four different groups. Such a molecule exists as two mirror images that cannot be superimposed.',
    example: '(2R)-butan-2-ol',
  },
  'restricted rotation': {
    term: 'restricted rotation',
    short: 'A double bond cannot twist, so groups stay put.',
    def: 'A double bond cannot rotate, so groups on either side stay where they are. That is what makes cis and trans different compounds.',
  },
};

// Look a term up, tolerating case and plurals — content should be able to
// write the word naturally rather than matching a key exactly.
// The bubble shows this, not the full definition. Ten words is about what a
// reader can absorb without losing the sentence they were in the middle of;
// the longer text is there for the reference sheet.
export function shortDef(entry) {
  if (!entry) return '';
  return entry.short || entry.def;
}

export function lookupTerm(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  if (GLOSSARY[key]) return GLOSSARY[key];
  const singular = key.replace(/s$/, '');
  if (GLOSSARY[singular]) return GLOSSARY[singular];
  const found = Object.values(GLOSSARY).find(
    (g) => g.term.toLowerCase() === key || g.term.toLowerCase() === singular
  );
  return found || null;
}

// Content marks a term as [[main group]] or [[skeletal form|skeletal notation]].
// The second form lets the sentence read naturally while still pointing at
// the right entry.
//
// A leading ~ means QUIET. The first couple of times a term appears it is
// blue and bold, because meeting it is the event. After that the word is
// familiar and the highlight is just noise — so it keeps only a faint
// underline, still tappable for anyone who has forgotten. Prominence is
// decided in curriculum order by quietRepeats() below, not by the author.
export const TERM_PATTERN = /\[\[(~?)([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// How many times a term stays prominent before it settles down.
export const PROMINENT_TIMES = 2;

// Walk the curriculum in teaching order and quieten every occurrence of a
// term after the first few. File order is not teaching order — later units
// were appended near the top of the source — so this has to read the real
// structure rather than the text.
export function quietRepeats(stages) {
  const seen = new Map();
  const FIELDS = ['title', 'body', 'caption', 'explain', 'prompt'];

  const pass = (text) => {
    if (typeof text !== 'string' || !text.includes('[[')) return text;
    const re = new RegExp(TERM_PATTERN.source, 'g');
    return text.replace(re, (whole, tilde, key, shown) => {
      if (tilde) return whole;                       // already quiet
      const k = key.trim().toLowerCase();
      const n = (seen.get(k) || 0) + 1;
      seen.set(k, n);
      if (n <= PROMINENT_TIMES) return whole;
      return shown ? `[[~${key}|${shown}]]` : `[[~${key}]]`;
    });
  };

  for (const stage of stages || []) {
    for (const unit of stage.units || []) {
      for (const lesson of unit.lessons || []) {
        for (const step of lesson.steps || []) {
          for (const f of FIELDS) if (step[f]) step[f] = pass(step[f]);
        }
      }
    }
  }
  return stages;
}

export function hasTerms(text) {
  return typeof text === 'string' && /\[\[/.test(text);
}
