// Device presets and frame maths for the web preview.
//
// Pure — no React, no react-native — so the aspect-ratio guarantee can be
// tested headlessly. DeviceFrame.js is the component that uses this.

export const TOOLBAR = 46;
export const MARGIN = 18;

// Sizes are LOGICAL pixels (dp), not the panel's physical resolution — those
// are what layout responds to. A Galaxy A35 is a 1080 x 2340 panel, but the
// app never sees 1080 wide: at the stock density that is 393 x 851 dp.
//
// Android complicates this, and Samsung especially: the display-size setting
// changes the density, so one phone reports several logical widths. The A35
// presets below bracket that range, and the tight one is the one worth
// testing — a learner who has made text larger is the learner whose layout
// breaks first.
export const DEVICES = [
  { id: 'a35', label: 'Galaxy A35', width: 393, height: 851, note: '1080×2340 at stock density' },
  { id: 'a35-zoom', label: 'A35 (large text)', width: 360, height: 780, note: 'display size increased' },
  { id: 'iphone', label: 'iPhone', width: 393, height: 852 },
  { id: 'small', label: 'Small', width: 375, height: 667 },
  { id: 'android', label: 'Android', width: 412, height: 915 },
  { id: 'tablet', label: 'Tablet', width: 744, height: 1000 },
  { id: 'full', label: 'Full width', width: null, height: null },
];

// Shrinks both dimensions by the same factor so the frame is a smaller
// phone rather than a squashed one; never enlarges past the real size.
export function frameSize(device, win) {
  const availH = win.height - TOOLBAR - MARGIN * 2;
  const availW = win.width - MARGIN * 2;
  const fit = Math.max(0.2, Math.min(1, availW / device.width, availH / device.height));
  return {
    width: Math.round(device.width * fit),
    height: Math.round(device.height * fit),
    pct: Math.round(fit * 100),
  };
}
