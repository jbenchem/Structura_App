// Device presets and frame maths for the web preview.
//
// Pure — no React, no react-native — so the aspect-ratio guarantee can be
// tested headlessly. DeviceFrame.js is the component that uses this.

export const TOOLBAR = 46;
export const MARGIN = 18;

export const DEVICES = [
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
