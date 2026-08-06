// The one constant that needs React Native at import time. Kept
// apart from constants.js so the pure graph logic (layout.js) can
// be imported and tested in plain Node.
//
// Structure labels use a humanist sans-serif: the web can name
// Aptos directly and fall back gracefully; native platforms need a
// single installed family name, so the nearest equivalent is used.

import { Platform } from 'react-native';

export const STRUCT_FONT = Platform.select({
  web:
    "Aptos, 'Aptos Display', 'Segoe UI Variable Text', 'Segoe UI', Inter, " +
    "'Helvetica Neue', Arial, system-ui, sans-serif",
  ios: 'Helvetica Neue',
  android: 'sans-serif',
  default: 'sans-serif',
});
