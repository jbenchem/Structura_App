// ─────────────────────────────────────────────────────────────
// Spotlight tour.
//
// Greys out the screen except for one measured rectangle, and puts a card
// next to it explaining what that rectangle is for.
//
// The hole is a single SVG path with an even-odd fill: outer rectangle, inner
// rounded rectangle, one element. The obvious alternative — four grey panels
// arranged around the gap — leaves square corners that do not match anything
// else in the app, and four separately-animated views that drift apart by a
// pixel on a slow frame.
//
// Measurement is done in WINDOW coordinates for both the target and the
// overlay's own container, and then subtracted. On web the app runs inside a
// phone-sized frame, so page coordinates and app coordinates are different
// numbers; measuring both the same way is what stops the hole appearing an
// inch away from the thing it is supposed to be around.
//
// Targets register themselves. A screen says "this card is home.continue" and
// knows nothing else about the tour; the tour names targets and knows nothing
// about the screens. Neither has to be edited when the other changes.
// ─────────────────────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T, shadow } from '../theme';
import { tap } from '../sandbox/haptics';

const NATIVE = Platform.OS !== 'web';
const TourContext = createContext(null);

// The shared test-time context is a plain object, and so is a real one, so
// the check is for the method rather than for the shape.
const isTour = (ctx) => !!ctx && typeof ctx.register === 'function';

// ── Registration ─────────────────────────────────────────────
// Returns a ref to hang on the element the tour should point at. Safe to call
// with no provider above it: the ref still works, nothing else happens.
export function useTourTarget(id) {
  const ctx = useContext(TourContext);
  const ref = useRef(null);
  const register = isTour(ctx) ? ctx.register : null;
  useEffect(() => {
    if (!register || !id) return undefined;
    register(id, ref);
    return () => register(id, null);
  }, [register, id]);
  return ref;
}

export function TourProvider({ children }) {
  const targets = useRef({});
  const register = useCallback((id, ref) => {
    if (ref) targets.current[id] = ref;
    else delete targets.current[id];
  }, []);
  const value = useMemo(() => ({ register, targets }), [register]);
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

// ── Geometry ─────────────────────────────────────────────────
// Pure, so the hole can be checked without a renderer: outer rectangle plus a
// rounded inner subpath, filled even-odd.
export function spotlightPath(width, height, hole) {
  const outer = `M0 0 H${round(width)} V${round(height)} H0 Z`;
  if (!hole) return outer;
  const r = Math.max(0, Math.min(hole.r == null ? 14 : hole.r, hole.w / 2, hole.h / 2));
  const x = round(hole.x);
  const y = round(hole.y);
  const w = round(hole.w);
  const h = round(hole.h);
  const inner =
    `M${round(x + r)} ${y}` +
    ` H${round(x + w - r)} A${round(r)} ${round(r)} 0 0 1 ${round(x + w)} ${round(y + r)}` +
    ` V${round(y + h - r)} A${round(r)} ${round(r)} 0 0 1 ${round(x + w - r)} ${round(y + h)}` +
    ` H${round(x + r)} A${round(r)} ${round(r)} 0 0 1 ${x} ${round(y + h - r)}` +
    ` V${round(y + r)} A${round(r)} ${round(r)} 0 0 1 ${round(x + r)} ${y} Z`;
  return `${outer} ${inner}`;
}

const round = (n) => Math.round((Number(n) || 0) * 10) / 10;

// Keep the hole on screen and give it a little air, so a card sitting flush
// against the edge is not spotlit flush against the edge.
export function padHole(rect, pad, bounds) {
  if (!rect) return null;
  const p = pad == null ? 8 : pad;
  const x = Math.max(0, rect.x - p);
  const y = Math.max(0, rect.y - p);
  const w = Math.min(bounds.width - x, rect.w + p * 2);
  const h = Math.min(bounds.height - y, rect.h + p * 2);
  return { x, y, w: Math.max(0, w), h: Math.max(0, h), r: rect.r };
}

// Above or below the hole, whichever has room. A card that overlaps the thing
// it is describing is worse than one on the wrong side.
export function cardPlacement(hole, bounds, cardH = 190) {
  if (!hole) return { top: Math.max(24, bounds.height / 2 - cardH / 2), arrow: null };
  const below = hole.y + hole.h + 14;
  const above = hole.y - cardH - 14;
  if (below + cardH <= bounds.height - 20) return { top: below, arrow: 'up' };
  if (above >= 20) return { top: above, arrow: 'down' };
  // Neither side fits: centre it and drop the arrow rather than draw one
  // pointing at nothing.
  return { top: Math.max(20, bounds.height / 2 - cardH / 2), arrow: null };
}

// ── The overlay ──────────────────────────────────────────────
export function SpotlightTour({ steps, visible, onFinish, onSkip }) {
  const ctx = useContext(TourContext);
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const rootRef = useRef(null);
  const fade = useRef(new Animated.Value(0)).current;

  const step = steps && steps[index];
  const last = !!steps && index >= steps.length - 1;

  // Measure the current target. measureInWindow is asynchronous and the
  // target may not be laid out on the first frame after a step change, so a
  // miss retries once rather than leaving the tour with no hole.
  useEffect(() => {
    if (!visible || !step) return undefined;
    let cancelled = false;
    let attempt = 0;

    const measure = () => {
      if (cancelled) return;
      if (!step.target || !isTour(ctx)) {
        setHole(null);
        return;
      }
      const ref = ctx.targets.current[step.target];
      const node = ref && ref.current;
      const root = rootRef.current;
      if (!node || !node.measureInWindow || !root || !root.measureInWindow) {
        if (attempt++ < 6) setTimeout(measure, 90);
        else setHole(null);
        return;
      }
      root.measureInWindow((rx, ry) => {
        if (cancelled) return;
        node.measureInWindow((x, y, w, h) => {
          if (cancelled) return;
          if (!w || !h) {
            if (attempt++ < 6) setTimeout(measure, 90);
            else setHole(null);
            return;
          }
          setHole({ x: x - rx, y: y - ry, w, h, r: step.radius == null ? 16 : step.radius });
        });
      });
    };

    measure();
    return () => {
      cancelled = true;
    };
  }, [visible, step, ctx]);

  useEffect(() => {
    if (!visible) return undefined;
    fade.setValue(0);
    const a = Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE,
    });
    a.start();
    return () => a.stop();
  }, [visible, index, fade]);

  if (!visible || !step) return null;

  const padded = hole ? padHole(hole, step.pad, bounds.width ? bounds : { width: 9999, height: 9999 }) : null;
  const place = cardPlacement(padded, bounds.height ? bounds : { width: 380, height: 720 });

  const advance = () => {
    tap();
    if (last) onFinish && onFinish();
    else setIndex(index + 1);
  };

  return (
    <View
      ref={rootRef}
      style={[StyleSheet.absoluteFill, sp.layer]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBounds({ width, height });
      }}
      collapsable={false}
    >
      {/* The scrim. Tapping anywhere advances — including inside the hole,
          because a student following a tour should not have to hunt for the
          one pixel that continues it. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={advance} accessibilityLabel="next tip">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          {bounds.width ? (
            <Svg width={bounds.width} height={bounds.height}>
              <Path
                d={spotlightPath(bounds.width, bounds.height, padded)}
                fill="rgba(10,28,42,0.74)"
                fillRule="evenodd"
              />
            </Svg>
          ) : null}
        </Animated.View>
      </Pressable>

      {/* The ring around the hole. Drawn as a bordered view rather than as
          part of the path so it can be tinted independently of the scrim. */}
      {padded ? (
        <Animated.View
          pointerEvents="none"
          style={[
            sp.ring,
            {
              left: padded.x,
              top: padded.y,
              width: padded.w,
              height: padded.h,
              borderRadius: (padded.r == null ? 16 : padded.r) + 2,
              opacity: fade,
            },
          ]}
        />
      ) : null}

      <Animated.View
        style={[
          sp.card,
          { top: place.top, opacity: fade },
          !padded && sp.cardCentred,
        ]}
      >
        <View style={sp.cardTop}>
          <Text style={sp.count}>
            {index + 1} of {steps.length}
          </Text>
          {!last ? (
            <Pressable onPress={onSkip} hitSlop={10}>
              <Text style={sp.skip}>Skip</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={sp.title}>{step.title}</Text>
        <Text style={sp.body}>{step.body}</Text>
        <Pressable style={sp.next} onPress={advance}>
          <Text style={sp.nextTxt}>{step.next || (last ? 'Done' : 'Next')}</Text>
          <Ionicons name={last ? 'checkmark' : 'arrow-forward'} size={17} color="#FFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const sp = StyleSheet.create({
  // Above the tab bar and the screens, below nothing — the tour is the only
  // thing on screen while it is running.
  layer: { zIndex: 90 },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  card: {
    position: 'absolute',
    left: 18,
    right: 18,
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: 18,
    ...shadow,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
  cardCentred: {},
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 11, fontWeight: '800', color: C.teal, letterSpacing: 0.7 },
  skip: { fontSize: 13, fontWeight: '700', color: C.sub },
  title: { ...T.h2, marginTop: 8 },
  body: { ...T.body, color: C.sub, marginTop: 6 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.teal,
    borderRadius: R.md,
    minHeight: 46,
    marginTop: 14,
  },
  nextTxt: { color: '#FFF', fontSize: 15.5, fontWeight: '700' },
});
