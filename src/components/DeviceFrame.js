// ─────────────────────────────────────────────────────────────
// DeviceFrame — a web-only preview shell.
//
// On a phone this is a pass-through: it renders its children and
// nothing else, so native is completely unaffected.
//
// On web it puts the app inside a phone-sized frame with a toolbar
// to switch device, which is how you demo the app on a laptop
// without the layout stretching across a 27-inch monitor.
//
// The important part is `useViewport`. Screens size themselves from
// the viewport, not the browser window — inside the frame those are
// different numbers, and using the window would make the canvas draw
// itself wider than the frame it sits in.
//
// When the browser window is too short, the frame shrinks
// PROPORTIONALLY — a smaller phone, not a squashed one — so the
// aspect ratio a student would actually see is preserved.
//
// This is done by giving the app a smaller layout box, never by a
// CSS transform. Transforms shift the page coordinates the canvas
// hit-tests against, which would put every tap in the wrong place.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { C } from '../theme';
import { DEVICES, TOOLBAR, MARGIN, frameSize } from './deviceSizes';

const ViewportContext = createContext(null);

// Size source for every screen. Inside the frame this is the frame;
// everywhere else it is the window.
export function useViewport() {
  const framed = useContext(ViewportContext);
  const win = useWindowDimensions();
  // Fall back to the window unless the frame supplied real numbers, so a
  // malformed provider value can never collapse every layout to zero.
  return framed && typeof framed.width === 'number' ? framed : win;
}


export function DeviceFrame({ children }) {
  const win = useWindowDimensions();
  // Defaults to the phone the beta is being tested on, so the preview matches
  // what a tester is actually holding.
  const [deviceId, setDeviceId] = useState('a35');

  // Native: render nothing extra at all.
  if (Platform.OS !== 'web') return children;

  const device = DEVICES.find((d) => d.id === deviceId) || DEVICES[0];

  if (!device.width) {
    return (
      <View style={{ flex: 1 }}>
        <Toolbar deviceId={deviceId} onPick={setDeviceId} />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }

  const { width, height, pct } = frameSize(device, win);

  return (
    <View style={df.page}>
      <Toolbar deviceId={deviceId} onPick={setDeviceId} />
      <View style={df.stage}>
        <View style={[df.frame, { width, height }]}>
          <ViewportContext.Provider value={{ width, height, scale: 1, fontScale: 1 }}>
            {children}
          </ViewportContext.Provider>
        </View>
        <Text style={df.caption}>
          {device.label} · {device.width} × {device.height}
          {pct < 100 ? `  ·  shown at ${pct}% (ratio preserved)` : ''}
        </Text>
      </View>
    </View>
  );
}

function Toolbar({ deviceId, onPick }) {
  return (
    <View style={df.toolbar}>
      <Text style={df.brand}>Structura — preview</Text>
      <View style={df.pills}>
        {DEVICES.map((d) => {
          const on = d.id === deviceId;
          return (
            <Pressable key={d.id} onPress={() => onPick(d.id)} style={[df.pill, on && df.pillOn]}>
              <Text style={[df.pillTxt, on && { color: '#fff' }]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const df = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#EEF3F6' },
  toolbar: {
    height: TOOLBAR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  brand: { fontSize: 13, fontWeight: '800', color: C.navy },
  pills: { flexDirection: 'row', gap: 6 },
  pill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  pillOn: { backgroundColor: C.teal, borderColor: C.teal },
  pillTxt: { fontSize: 12, fontWeight: '700', color: C.sub },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: MARGIN },
  frame: {
    backgroundColor: C.bg,
    borderRadius: 28,
    borderWidth: 8,
    borderColor: '#1B2A35',
    overflow: 'hidden',
    shadowColor: '#12293E',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
  },
  caption: { marginTop: 10, fontSize: 11.5, color: C.sub },
});
