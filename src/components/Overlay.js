// ─────────────────────────────────────────────────────────────
// Overlay + LoadingScreen.
//
// These replace React Native's <Modal>. A Modal renders into a
// separate host view — on web that is outside the app's DOM tree
// entirely, so it escapes the device frame and takes over the whole
// browser window. An absolutely-positioned view stays inside the
// tree, which keeps the phone preview honest and lets us animate
// the transition ourselves.
//
// Animations are deliberately short. They exist to show that a tap
// registered and where the new screen came from, not to be noticed.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Circle } from 'react-native-svg';
import { C, R, T } from '../theme';
import { formatFormulas } from '../chem/formula';

// react-native-web does not support the native driver for every property,
// so it is enabled only where it genuinely runs natively.
const NATIVE = Platform.OS !== 'web';

const AnimatedSvg = Animated.createAnimatedComponent
  ? Animated.createAnimatedComponent(View)
  : View;

// ── Slide-up overlay ─────────────────────────────────────────
export function Overlay({ visible, children, style }) {
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 170,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: NATIVE,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: C.bg, zIndex: 20 },
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ── Centred sheet (redeem, saved molecules) ──────────────────
export function SheetOverlay({ visible, onClose, children, anchor = 'center' }) {
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: NATIVE,
      }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, anim]);

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 40, justifyContent: anchor === 'bottom' ? 'flex-end' : 'center' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, ov.scrim, { opacity: anim }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={{
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [anchor === 'bottom' ? 40 : 16, 0],
              }),
            },
          ],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// ── Loading screen ───────────────────────────────────────────
// Shown for a beat when a lesson opens: the tap gets an immediate
// acknowledgement and the lesson arrives having been introduced,
// rather than snapping into view mid-sentence.
export function LoadingScreen({ title, subtitle }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: NATIVE,
      })
    );
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      ])
    );
    loop.start();
    breathe.start();
    return () => {
      loop.stop();
      breathe.stop();
    };
  }, [spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });

  return (
    <View style={ov.loading}>
      <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
        <Svg width={72} height={72}>
          <Polygon
            points={hexPoints(36, 36, 28)}
            fill="none"
            stroke={C.teal}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Circle cx={36} cy={8} r={4.5} fill={C.green} />
          <Circle cx={36} cy={36} r={4} fill={C.navy} />
        </Svg>
      </Animated.View>
      {title ? <Text style={[T.h3, { marginTop: 22 }]}>{title}</Text> : null}
      {subtitle ? <Text style={[T.sub, { marginTop: 4 }]}>{subtitle}</Text> : null}
    </View>
  );
}

function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

// ── Section wipe ─────────────────────────────────────────────
// A full-screen panel wipes across, and the content behind it changes at the
// moment it is completely covered — so the switch from teaching to quiz is
// never seen happening. Sequence: cover from the right, hold with the label,
// then wipe off to the left revealing the new screen.
//
// `onCover` fires exactly once, at full coverage; the parent uses it to commit
// the step change. Touches are blocked while the panel is on screen so a tap
// cannot land on content that is about to be replaced.
// `startCovered` begins the panel already over the screen, playing only the
// hold and the off-wipe. It exists for the results reveal: the wipe starts on
// the last quiz screen, and at full coverage the player swaps to the results
// screen underneath — a different branch of the tree, so the panel REMOUNTS.
// Without this flag the remounted panel would start off-screen right and
// wipe in a second time, and the seam the wipe exists to hide would be shown
// twice instead of never.
// The wipe's label comes from a lesson title, and lesson titles carry
// [[glossary]] markers. A panel is the last place that can host a definition
// bubble, so the markers are stripped rather than rendered.
const stripMarks = (t) => (typeof t === 'string' ? formatFormulas(t) : t);

export function SectionWipe({ label, sub, icon = 'school-outline', onCover, onDone, width = 400, bleed = 60, startCovered = false }) {
  const anim = useRef(new Animated.Value(startCovered ? 1 : 0)).current;
  const covered = useRef(!!startCovered);

  useEffect(() => {
    let cancelled = false;
    const fire = () => {
      if (!covered.current && !cancelled) {
        covered.current = true;
        onCover && onCover();
      }
    };

    Animated.sequence([
      ...(startCovered
        ? []
        : [
            Animated.timing(anim, {
              toValue: 1,
              duration: 340,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: NATIVE,
            }),
          ]),
      Animated.delay(620),
      Animated.timing(anim, {
        toValue: 2,
        duration: 340,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: NATIVE,
      }),
    ]).start(({ finished }) => {
      // Safety net: if the animation is interrupted, still commit the change
      // and clear the panel rather than stranding the learner behind it.
      fire();
      if (!cancelled && onDone) onDone();
    });

    // Commit at full coverage rather than waiting for the whole sequence.
    const t = startCovered ? null : setTimeout(fire, 340);
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
      fire();
    };
  }, [anim, onCover, onDone, startCovered]);

  // 0 → fully off to the right, 1 → covering, 2 → fully off to the left
  const translateX = anim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [width + bleed, 0, -(width + bleed)],
  });
  const labelOpacity = anim.interpolate({
    inputRange: [0, 0.75, 1, 1.4, 2],
    outputRange: [0, 0.4, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        ov.wipe,
        { top: -bleed, bottom: -bleed, left: -bleed, right: -bleed, transform: [{ translateX }] },
      ]}
    >
      <Animated.View style={{ alignItems: 'center', gap: 10, opacity: labelOpacity }}>
        <Ionicons name={icon} size={34} color="#fff" />
        <Text style={ov.wipeLabel}>{stripMarks(label)}</Text>
        {sub ? <Text style={ov.wipeSub}>{stripMarks(sub)}</Text> : null}
      </Animated.View>
    </Animated.View>
  );
}

// ── Fade a child in once it is ready ─────────────────────────
export function FadeIn({ children, duration = 220, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE,
    }).start();
  }, [anim, duration]);
  return (
    <Animated.View style={[{ flex: 1, opacity: anim }, style]}>{children}</Animated.View>
  );
}

const ov = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(18,41,62,0.42)' },
  wipe: {
    position: 'absolute',
    backgroundColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    paddingHorizontal: 30,
  },
  wipeLabel: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  wipeSub: { color: 'rgba(255,255,255,0.88)', fontSize: 14.5, fontWeight: '600' },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    paddingHorizontal: 30,
  },
});
