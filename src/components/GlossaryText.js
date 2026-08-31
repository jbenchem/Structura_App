// ─────────────────────────────────────────────────────────────
// GlossaryText.
//
// Renders a string containing [[term]] markers. Marked terms are blue, bold
// and underlined; tapping one opens a small bubble directly beneath the word,
// floating above everything else.
//
// The bubble is deliberately tiny — around ten words. A reader mid-sentence
// wants reminding what a word means, not teaching the topic; anything longer
// covers the sentence they were trying to read.
//
// Terms marked with a leading ~ are quiet: still tappable, but no longer
// coloured, because after the first couple of encounters the highlight is
// noise. See quietRepeats() in content/glossary.js.
// ─────────────────────────────────────────────────────────────

import React, { useRef, useState, useContext } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C } from '../theme';
import { TERM_PATTERN, lookupTerm, shortDef } from '../content/glossary';
import { formatFormulas } from '../chem/formula';
import { tap } from '../sandbox/haptics';
import { ReferenceLinkContext, detectSmartTokens, anchorFor } from './referenceLink';

const BUBBLE_W = 210;

// Split a string into plain runs and marked terms.
function segment(text) {
  const out = [];
  let last = 0;
  const re = new RegExp(TERM_PATTERN.source, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ plain: text.slice(last, m.index) });
    out.push({ quiet: !!m[1], key: m[2].trim(), shown: (m[3] || m[2]).trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ plain: text.slice(last) });
  return out;
}

// Remove the markers, for anywhere a bubble cannot be shown.
export function stripTerms(text) {
  if (typeof text !== 'string' || !text.includes('[[')) return text;
  return text.replace(new RegExp(TERM_PATTERN.source, 'g'), (_, tilde, key, shown) => shown || key);
}

export function GlossaryText({ children, style, numberOfLines }) {
  const [open, setOpen] = useState(null);
  const wrapRef = useRef(null);
  const boxRef = useRef({ x: 0, y: 0, width: 0 });

  const text = typeof children === 'string' ? children : '';

  // Nothing marked: render as ordinary text, so this component can be used
  // everywhere without cost and no caller has to decide.
  if (!text.includes('[[')) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {formatFormulas(text)}
      </Text>
    );
  }

  const parts = segment(text);
  const refLink = useContext(ReferenceLinkContext);
  // A glossary term looks itself up; a smart token carries its own
  // explanation.
  const entry = open ? (open.smart ? open.smart : lookupTerm(open.key)) : null;

  const press = (e, key, smart = null) => {
    tap();
    if (open && open.key === key) {
      setOpen(null);
      return;
    }
    const { pageX, pageY } = e.nativeEvent;
    // Measure NOW, not at mount: the paragraph's window position moves every
    // time the page scrolls, and a box cached at layout time anchored the
    // bubble to where the word USED to be. The tap's pageX/pageY are always
    // current, so the box must be too.
    const place = (bx, by, bw) => {
      const rawX = pageX - bx - BUBBLE_W / 2;
      const x = Math.max(0, Math.min(rawX, Math.max(0, bw - BUBBLE_W)));
      setOpen({ key, smart, x, y: pageY - by + 12, tipX: pageX - bx });
    };
    const node = wrapRef.current;
    if (node && node.measureInWindow) {
      node.measureInWindow((bx, by, bw) => place(bx, by, bw));
    } else {
      const box = boxRef.current;
      place(box.x, box.y, box.width);
    }
  };

  return (
    <View
      ref={wrapRef}
      onLayout={() => {
        if (wrapRef.current && wrapRef.current.measureInWindow) {
          wrapRef.current.measureInWindow((x, y, width) => {
            boxRef.current = { x, y, width };
          });
        }
      }}
    >
      <Text style={style} numberOfLines={numberOfLines}>
        {parts.map((p, i) =>
          p.plain !== undefined ? (
            <Text key={i}>
              {detectSmartTokens(p.plain).map((t, j) =>
                t.plain !== undefined ? (
                  <Text key={j}>{formatFormulas(t.plain)}</Text>
                ) : (
                  <Text
                    key={j}
                    style={[gt.smart, { color: t.smart.colour }, open && open.key === `smart:${i}:${j}` && gt.termOpen]}
                    onPress={(e) => press(e, `smart:${i}:${j}`, t.smart)}
                    suppressHighlighting
                  >
                    {formatFormulas(t.shown)}
                  </Text>
                )
              )}
            </Text>
          ) : (
            <Text
              key={i}
              style={[p.quiet ? gt.termQuiet : gt.term, open && open.key === p.key && gt.termOpen]}
              onPress={(e) => press(e, p.key)}
              suppressHighlighting
            >
              {formatFormulas(p.shown)}
            </Text>
          )
        )}
      </Text>

      {entry ? (
        <>
          {/* Tapping anywhere dismisses it, which is what a reader expects and
              saves hunting for a close button in a bubble this small. */}
          <Pressable style={gt.catcher} onPress={() => setOpen(null)} />
          <View style={[gt.bubble, { left: open.x, top: open.y }]}>
            <View
              style={[gt.tip, { left: Math.max(10, Math.min(open.tipX - open.x - 6, BUBBLE_W - 22)) }]}
            />
            <Text style={gt.bubbleTerm}>{formatFormulas(entry.term || entry.label)}</Text>
            <Text style={gt.bubbleDef}>{formatFormulas(entry.term ? shortDef(entry) : entry.short)}</Text>
            {open.smart && refLink ? (
              <Pressable
                onPress={() => {
                  setOpen(null);
                  refLink.openReference(anchorFor(open.smart));
                }}
                style={gt.bubbleAction}
                accessibilityRole="button"
              >
                <Text style={gt.bubbleActionTxt}>
                  {open.smart.kind === 'element' ? 'Open in the periodic table' : 'Open in the naming priority list'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

const gt = StyleSheet.create({
  // Smart tokens: coloured like their reference cell, a fine dotted line,
  // never bold — present without shouting, so a paragraph about carbon and
  // oxygen does not turn into confetti.
  smart: { textDecorationLine: 'underline', textDecorationStyle: 'dotted', fontWeight: '600' },
  bubbleAction: {
    marginTop: 8, paddingVertical: 7, borderRadius: 8,
    backgroundColor: C.tealSoft, alignItems: 'center',
  },
  bubbleActionTxt: { color: C.teal, fontWeight: '800', fontSize: 12 },
  // Blue and bold the first couple of times a term appears, because meeting
  // it is the event worth marking.
  term: { color: C.blue, fontWeight: '800', textDecorationLine: 'underline' },
  // After that the word is familiar and the colour is noise; the underline
  // stays so it still reads as tappable.
  termQuiet: {
    color: C.navy,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: C.faint,
  },
  termOpen: { backgroundColor: '#E3EEFB' },
  catcher: { position: 'absolute', left: -500, right: -500, top: -500, bottom: -500 },
  bubble: {
    position: 'absolute',
    width: BUBBLE_W,
    backgroundColor: C.navy,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    // Above every sibling, including molecule stages and the canvas.
    zIndex: 999,
    elevation: 24,
    shadowColor: '#0B2436',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  tip: {
    position: 'absolute',
    top: -5,
    width: 12,
    height: 12,
    backgroundColor: C.navy,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  bubbleTerm: { color: '#9FC7F5', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  bubbleDef: { color: '#FFFFFF', fontSize: 13, lineHeight: 18, marginTop: 2 },
});
