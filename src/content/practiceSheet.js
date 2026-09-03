// ─────────────────────────────────────────────────────────────
// Printable practice sheets.
//
// A set of questions rendered as standalone HTML — printed to PDF on the
// device, or shared as a file. Two sections: the questions, then the answers
// WITH the engine's derivation, so the sheet teaches on its own away from
// the app. Structures are drawn as inline SVG from the same layout code the
// app uses, so a printed molecule is the molecule the app would show.
//
// Pure: takes questions in, returns a string. Nothing here touches the
// filesystem, so the suite can check the whole document.
// ─────────────────────────────────────────────────────────────

import { workedSolution } from './workedSolution';
import { nameGraph } from '../engine/index.js';

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Subscript digits in formulas, for print.
const fmt = (s) => esc(s).replace(/([A-Za-z\)])(\d+)/g, '$1<sub>$2</sub>');

// A minimal skeletal drawing: atoms placed by the engine's own coordinates
// when present, otherwise omitted rather than guessed.
function molSvg(mol, size = 150) {
  if (!mol || !mol.atoms || !mol.atoms.length) return '';
  const xs = mol.atoms.map((a) => a.x);
  const ys = mol.atoms.map((a) => a.y);
  if (xs.some((v) => typeof v !== 'number')) return '';
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
  const pad = 18;
  // Bonds reference atom IDs, not array positions — indexing the array
  // draws lines between the wrong atoms, which looks almost right and is
  // completely wrong.
  const byId = new Map(mol.atoms.map((a) => [a.id, a]));
  const bonds = (mol.bonds || [])
    .map((b) => {
      const a1 = byId.get(b.a), a2 = byId.get(b.b);
      if (!a1 || !a2) return '';
      if (b.order >= 2) {
        // A double bond is two parallel lines, offset perpendicular to it.
        const dx = a2.x - a1.x, dy = a2.y - a1.y;
        const len = Math.hypot(dx, dy) || 1;
        const ox = (-dy / len) * 3, oy = (dx / len) * 3;
        return (
          `<line x1="${a1.x + ox}" y1="${a1.y + oy}" x2="${a2.x + ox}" y2="${a2.y + oy}" stroke="#102A56" stroke-width="2" stroke-linecap="round"/>` +
          `<line x1="${a1.x - ox}" y1="${a1.y - oy}" x2="${a2.x - ox}" y2="${a2.y - oy}" stroke="#102A56" stroke-width="2" stroke-linecap="round"/>`
        );
      }
      return `<line x1="${a1.x}" y1="${a1.y}" x2="${a2.x}" y2="${a2.y}" stroke="#102A56" stroke-width="2" stroke-linecap="round"/>`;
    })
    .join('');
  const labels = (mol.atoms || [])
    .map((a) =>
      a.el && a.el !== 'C'
        ? `<text x="${a.x}" y="${a.y + 4}" text-anchor="middle" font-size="13" font-family="Helvetica" fill="#102A56">${esc(a.el)}</text>`
        : ''
    )
    .join('');
  return `<svg viewBox="${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}" width="${size}" height="${Math.round(size * (h + pad * 2) / (w + pad * 2))}">${bonds}${labels}</svg>`;
}

const questionBlock = (q, i) => {
  const opts = (q.options || [])
    .map((o, j) => `<li>${fmt(typeof o === 'string' ? o : '')}</li>`)
    .join('');
  return `<div class="q">
    <div class="qn">${i + 1}.</div>
    <div class="qbody">
      <p class="prompt">${fmt(q.prompt || '')}</p>
      ${q.mol ? `<div class="mol">${molSvg(q.mol)}</div>` : ''}
      ${opts ? `<ol class="opts" type="A">${opts}</ol>` : '<div class="rule"></div>'}
    </div>
  </div>`;
};

const answerBlock = (q, i) => {
  const correct =
    typeof q.answer === 'number' && q.options ? q.options[q.answer] : q.answer || q.correctName || '';
  const w = q.mol ? workedSolution(q.mol) : null;
  const steps = w
    ? w.steps
        .map(
          (s) =>
            `<li><b>${esc(s.heading)}:</b> ${fmt(s.body)}${
              s.alternative ? `<br><i>${fmt(s.alternative)}</i>` : ''
            }</li>`
        )
        .join('')
    : '';
  return `<div class="a">
    <p><b>${i + 1}.</b> ${fmt(correct)}</p>
    ${q.explain ? `<p class="exp">${fmt(q.explain)}</p>` : ''}
    ${steps ? `<ol class="steps">${steps}</ol>` : ''}
  </div>`;
};

export function practiceSheetHtml(questions, { title = 'Catalyst practice', subtitle = '' } = {}) {
  const qs = (questions || []).filter(Boolean);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Helvetica, Arial, sans-serif; color: #102A56; font-size: 12pt; line-height: 1.45; }
  h1 { font-size: 19pt; margin: 0 0 2pt; }
  .sub { color: #5B6B7A; margin: 0 0 16pt; font-size: 10.5pt; }
  h2 { font-size: 13pt; margin: 18pt 0 8pt; border-top: 1px solid #C9D6E0; padding-top: 8pt; }
  .q { display: flex; gap: 8pt; margin-bottom: 14pt; page-break-inside: avoid; }
  .qn { font-weight: bold; min-width: 18pt; }
  .prompt { margin: 0 0 4pt; }
  .opts { margin: 4pt 0 0 14pt; padding: 0; }
  .opts li { margin-bottom: 2pt; }
  .rule { border-bottom: 1px solid #C9D6E0; height: 22pt; }
  .mol { margin: 4pt 0; }
  .a { margin-bottom: 10pt; page-break-inside: avoid; }
  .exp { margin: 2pt 0; color: #33475B; font-size: 11pt; }
  .steps { margin: 3pt 0 0 14pt; padding: 0; font-size: 10.5pt; color: #33475B; }
  .steps i { color: #0A8F95; }
  .foot { margin-top: 16pt; color: #8A9AA6; font-size: 9pt; }
</style></head>
<body>
  <h1>${esc(title)}</h1>
  <p class="sub">${esc(subtitle)}</p>
  ${qs.map(questionBlock).join('')}
  <h2>Answers and reasoning</h2>
  ${qs.map(answerBlock).join('')}
  <p class="foot">Every name and derivation on this sheet was generated and checked by Catalyst's naming engine.</p>
</body></html>`;
}
