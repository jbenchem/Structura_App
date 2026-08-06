// Formulas must be subscripted; locants and names must not be touched.
import { formatFormulas, formatEngineFormula } from '../src/chem/formula.js';

let fails = 0;
const ck = (got, want, label) => {
  if (got !== want) { console.error(`  FAIL ${label}\n    got  ${got}\n    want ${want}`); fails++; }
  else console.log(`  ok   ${label}`);
};

console.log('=== formulas get subscripts ===');
ck(formatFormulas('CH3'), 'CH₃', 'CH3');
ck(formatFormulas('CH4'), 'CH₄', 'CH4');
ck(formatFormulas('C3H8'), 'C₃H₈', 'C3H8');
ck(formatFormulas('C8H18'), 'C₈H₁₈', 'C8H18');
ck(formatFormulas('CH3—CH2—CH3'), 'CH₃—CH₂—CH₃', 'display formula');
ck(formatFormulas('so C5H12 is right'), 'so C₅H₁₂ is right', 'formula in a sentence');
ck(formatFormulas('CnH(2n+2)'), 'CₙH₂ₙ₊₂', 'general formula normalises away subscript brackets');
ck(formatFormulas('CnH2n+2'), 'CₙH₂ₙ₊₂', 'general formula, plain');

console.log('=== locants and names are left alone ===');
ck(formatFormulas('a double bond at C2'), 'a double bond at C2', 'locant C2');
ck(formatFormulas('branches at C2, C3'), 'branches at C2, C3', 'several locants');
ck(formatFormulas('2-methylbutane'), '2-methylbutane', 'substituted name');
ck(formatFormulas('but-2-ene'), 'but-2-ene', 'alkene name');
ck(formatFormulas('2,2,4-trimethylpentane'), '2,2,4-trimethylpentane', 'multi-locant name');
ck(formatFormulas('Question 4 of 10'), 'Question 4 of 10', 'ordinary prose');
ck(formatFormulas('(2R)-butan-2-ol'), '(2R)-butan-2-ol', 'stereo descriptor');
ck(formatFormulas('meth (1)   eth (2)'), 'meth (1)   eth (2)', 'root table');
ck(formatFormulas('IUPAC'), 'IUPAC', 'acronym');
ck(formatFormulas('2n + 2 hydrogens'), '2n + 2 hydrogens', 'formula described in words');

console.log('=== engine formulas ===');
ck(formatEngineFormula('C9H8O4'), 'C₉H₈O₄', 'aspirin');
ck(formatEngineFormula('C4H10O'), 'C₄H₁₀O', 'butanol');

console.log(fails ? `\n${fails} FAILURES` : '\nformula typography correct');
process.exit(fails ? 1 : 0);
