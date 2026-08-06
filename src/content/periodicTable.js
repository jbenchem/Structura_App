// ─────────────────────────────────────────────────────────────
// Main-group periodic table.
//
// Organic chemistry is built almost entirely from the main group — the tall
// columns at either side of the table — because those elements form a
// predictable number of covalent bonds. That number is what every structure
// in this course depends on, and it is set by the column.
//
// `bonds` is the number of covalent bonds the element normally forms when
// neutral. Charged species change it (an ammonium nitrogen makes four), which
// is why the app says "normally" everywhere it shows these numbers.
// ─────────────────────────────────────────────────────────────

// Bonds normally formed, by group. This is the pattern worth learning: it
// counts down 4, 3, 2, 1 across the p-block as the outer shell fills up.
export const BONDS_BY_GROUP = {
  1: 1,
  2: 2,
  13: 3,
  14: 4,
  15: 3,
  16: 2,
  17: 1,
  18: 0,
};

export const GROUP_LABELS = {
  1: 'Group 1',
  2: 'Group 2',
  13: 'Group 13',
  14: 'Group 14',
  15: 'Group 15',
  16: 'Group 16',
  17: 'Group 17',
  18: 'Group 18',
};

// The columns the course actually uses, and why.
export const GROUP_NOTES = {
  14: 'Four bonds. Carbon lives here — the whole reason chains, rings and branches are possible.',
  15: 'Three bonds. Nitrogen lives here: amines, amides and nitriles.',
  16: 'Two bonds. Oxygen lives here: alcohols, aldehydes, ketones, acids and esters.',
  17: 'One bond. The halogens: they replace a hydrogen and are always cited as a prefix.',
  18: 'No bonds. Full outer shell, so the noble gases take no part in organic structures.',
  1: 'One bond. Hydrogen is the one that matters here — it fills every spare bond in an organic molecule.',
  2: 'Two bonds, but rarely covalent. Group 2 metals form ions rather than the structures in this course.',
  13: 'Three bonds. Boron appears in some reagents, but not in the molecules you will be naming.',
};

// element: symbol, name, atomic number, group, period
// organic: true where it appears in the structures this course names
// role: what it does in an organic molecule
// functional: the groups it turns up in, for the reference sheet
const E = (sym, name, z, group, period, extra = {}) => ({
  sym,
  name,
  z,
  group,
  period,
  bonds: BONDS_BY_GROUP[group],
  organic: false,
  role: null,
  functional: [],
  ...extra,
});

export const ELEMENTS = [
  E('H', 'Hydrogen', 1, 1, 1, {
    organic: true,
    role: 'Fills every bond a carbon does not spend on another atom.',
    functional: ['Every organic molecule', 'C–H, O–H, N–H'],
  }),
  E('He', 'Helium', 2, 18, 1),

  E('Li', 'Lithium', 3, 1, 2),
  E('Be', 'Beryllium', 4, 2, 2),
  E('B', 'Boron', 5, 13, 2),
  E('C', 'Carbon', 6, 14, 2, {
    organic: true,
    role: 'Four bonds, so it can chain onward and still carry other atoms. Every molecule in this course is built on a carbon skeleton.',
    functional: ['Alkanes', 'Alkenes', 'Alkynes', 'Every parent chain'],
  }),
  E('N', 'Nitrogen', 7, 15, 2, {
    organic: true,
    role: 'Three bonds. Carries a lone pair, which is why nitrogen compounds are basic.',
    functional: ['Amines (–NH2)', 'Amides (–CONH2)', 'Nitriles (–C≡N)', 'Nitro (–NO2)'],
  }),
  E('O', 'Oxygen', 8, 16, 2, {
    organic: true,
    role: 'Two bonds — either two singles, or one double to carbon. That double bond is the carbonyl, and most of the seniority ladder is built from it.',
    functional: [
      'Alcohols (–OH)',
      'Ethers (–O–)',
      'Aldehydes (–CHO)',
      'Ketones (C=O)',
      'Carboxylic acids (–COOH)',
      'Esters (–COO–)',
    ],
  }),
  E('F', 'Fluorine', 9, 17, 2, {
    organic: true,
    role: 'One bond, replacing a hydrogen.',
    functional: ['Haloalkanes (fluoro–)'],
  }),
  E('Ne', 'Neon', 10, 18, 2),

  E('Na', 'Sodium', 11, 1, 3),
  E('Mg', 'Magnesium', 12, 2, 3),
  E('Al', 'Aluminium', 13, 13, 3),
  E('Si', 'Silicon', 14, 14, 3),
  E('P', 'Phosphorus', 15, 15, 3, {
    role: 'Three or five bonds. Central to biology, but outside the naming in this course.',
  }),
  E('S', 'Sulfur', 16, 16, 3, {
    organic: true,
    role: 'Two bonds, like oxygen directly above it.',
    functional: ['Thiols (–SH)', 'Sulfides (–S–)'],
  }),
  E('Cl', 'Chlorine', 17, 17, 3, {
    organic: true,
    role: 'One bond, replacing a hydrogen.',
    functional: ['Haloalkanes (chloro–)'],
  }),
  E('Ar', 'Argon', 18, 18, 3),

  E('K', 'Potassium', 19, 1, 4),
  E('Ca', 'Calcium', 20, 2, 4),
  E('Ga', 'Gallium', 31, 13, 4),
  E('Ge', 'Germanium', 32, 14, 4),
  E('As', 'Arsenic', 33, 15, 4),
  E('Se', 'Selenium', 34, 16, 4),
  E('Br', 'Bromine', 35, 17, 4, {
    organic: true,
    role: 'One bond, replacing a hydrogen.',
    functional: ['Haloalkanes (bromo–)'],
  }),
  E('Kr', 'Krypton', 36, 18, 4),

  E('Rb', 'Rubidium', 37, 1, 5),
  E('Sr', 'Strontium', 38, 2, 5),
  E('In', 'Indium', 49, 13, 5),
  E('Sn', 'Tin', 50, 14, 5),
  E('Sb', 'Antimony', 51, 15, 5),
  E('Te', 'Tellurium', 52, 16, 5),
  E('I', 'Iodine', 53, 17, 5, {
    organic: true,
    role: 'One bond, replacing a hydrogen.',
    functional: ['Haloalkanes (iodo–)'],
  }),
  E('Xe', 'Xenon', 54, 18, 5),
];

export const GROUPS = [1, 2, 13, 14, 15, 16, 17, 18];
export const PERIODS = [1, 2, 3, 4, 5];

export const elementAt = (group, period) =>
  ELEMENTS.find((e) => e.group === group && e.period === period) || null;

export const bySymbol = (sym) => ELEMENTS.find((e) => e.sym === sym) || null;
