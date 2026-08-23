// ─────────────────────────────────────────────────────────────
// Fireworks.
//
// Plays once when a lesson finishes. Coloured for a completed lesson, gold
// for a perfect one — the same rule the accuracy ring already follows, so
// gold means one thing in this app and only one thing.
//
// Built from plain <Animated.View> dots rather than SVG or a particle
// library. Structura runs in Expo Go with no Reanimated and no Skia, and
// translate/opacity/scale are the properties the native driver can take off
// the JS thread — which matters here, because the results screen is doing its
// own layout work at the same moment.
//
// The geometry is separated from the rendering: makeBursts() is pure, so the
// thing that decides where the particles go can be tested without a screen.
//
// Vibration is scheduled from the SAME burst list that drives the animation,
// so a thump lands with a burst rather than near one.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { C } from '../theme';
import { GOLD } from './AccuracyRing';
import { burstTap, celebrate } from '../sandbox/haptics';

const NATIVE = Platform.OS !== 'web';

// A perfect lesson is rare and worth the extra second. An ordinary completion
// is going to happen a hundred times, so it stays brief enough not to be in
// the way of the Continue button.
export const CELEBRATION = {
  normal: { bursts: 5, particles: 12, spread: 1, ms: 1500 },
  perfect: { bursts: 8, particles: 16, spread: 1.18, ms: 2200 },
};

const COLOURS = [C.teal, C.blue, C.green, C.warn, '#B564D4', '#EE5A8A'];
const GOLDS = [GOLD, '#E8C061', '#F3D98B', '#FFF0CB', '#A8791A'];

// Deterministic, so a test can assert where the particles end up and a
// failure is reproducible rather than "it looked wrong once".
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ── Geometry ─────────────────────────────────────────────────
// Pure: seed in, burst list out. Bursts sit in the upper two thirds of the
// screen, clear of the Continue button, and never within a margin of an edge
// where half the particles would be clipped.
export function makeBursts({ perfect = false, width = 380, height = 700, seed = 7 } = {}) {
  const cfg = perfect ? CELEBRATION.perfect : CELEBRATION.normal;
  const rand = rng(seed);
  const margin = Math.min(64, width * 0.18);
  const out = [];

  for (let b = 0; b < cfg.bursts; b++) {
    const x = margin + rand() * Math.max(1, width - margin * 2);
    const y = height * 0.12 + rand() * height * 0.46;
    // Radius is capped by the room actually available on the tightest side.
    // Without this a burst near an edge throws half its particles off the
    // screen, which reads as a rendering fault rather than as a firework.
    const room = Math.min(x, width - x, y, height * 0.72 - y);
    const radius = Math.max(36, Math.min(width * 0.3 * cfg.spread, room));
    const palette = perfect ? GOLDS : COLOURS;
    const colour = palette[Math.floor(rand() * palette.length)];
    const particles = [];
    for (let p = 0; p < cfg.particles; p++) {
      // Even spokes with jitter: perfectly even reads as a machine, fully
      // random clumps and leaves gaps.
      const angle = (p / cfg.particles) * Math.PI * 2 + rand() * 0.35;
      const dist = radius * (0.62 + rand() * 0.38);
      particles.push({
        angle,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: 4 + Math.round(rand() * 3),
        // How far it falls after the burst stops expanding.
        fall: 18 + rand() * 34,
        colour: palette[Math.floor(rand() * palette.length)],
      });
    }
    out.push({
      x,
      y,
      radius,
      colour,
      // Bursts overlap rather than queue: a strictly sequential run reads as
      // a loading animation.
      delay: Math.round(b * (cfg.ms / (cfg.bursts + 1)) + rand() * 90),
      particles,
    });
  }
  return out;
}

// When each thump should fire — one per burst, at the moment it opens.
export function hapticSchedule(bursts) {
  return (bursts || []).map((b) => b.delay);
}

// ── Rendering ────────────────────────────────────────────────
function Burst({ burst, duration }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration,
      delay: burst.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE,
    });
    anim.start();
    return () => anim.stop();
  }, [t, burst.delay, duration]);

  return (
    <View pointerEvents="none" style={[fw.burst, { left: burst.x, top: burst.y }]}>
      {burst.particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            fw.dot,
            {
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.colour,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              opacity: t.interpolate({
                inputRange: [0, 0.08, 0.55, 1],
                outputRange: [0, 1, 0.9, 0],
              }),
              transform: [
                {
                  translateX: t.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, p.dx],
                  }),
                },
                {
                  // Three stops rather than two, so the particle slows and
                  // then drops. Two stops give a straight line, which reads
                  // as a starburst graphic instead of something thrown.
                  translateY: t.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0, p.dy * 0.86, p.dy + p.fall],
                  }),
                },
                {
                  scale: t.interpolate({
                    inputRange: [0, 0.2, 1],
                    outputRange: [0.5, 1, 0.35],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function Fireworks({
  perfect = false,
  width = 380,
  height = 700,
  haptics = true,
  seed = 7,
  onDone,
}) {
  const cfg = perfect ? CELEBRATION.perfect : CELEBRATION.normal;
  const bursts = useMemo(
    () => makeBursts({ perfect, width, height, seed }),
    [perfect, width, height, seed]
  );

  useEffect(() => {
    const timers = [];
    if (haptics) {
      // The opening thump is heavier on a perfect lesson: the phone should
      // agree with the screen about what just happened.
      celebrate(perfect);
      for (const at of hapticSchedule(bursts)) {
        if (at <= 0) continue;
        timers.push(setTimeout(burstTap, at));
      }
    }
    if (onDone) timers.push(setTimeout(onDone, cfg.ms + 900));
    return () => timers.forEach(clearTimeout);
  }, [bursts, haptics, perfect, onDone, cfg.ms]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, fw.layer]}>
      {bursts.map((b, i) => (
        <Burst key={i} burst={b} duration={perfect ? 1150 : 950} />
      ))}
    </View>
  );
}

const fw = StyleSheet.create({
  // Above the results content, below the glossary bubble, and never in the
  // way of a tap — the Continue button stays pressable throughout.
  layer: { zIndex: 30 },
  burst: { position: 'absolute', width: 0, height: 0 },
  dot: { position: 'absolute' },
});
