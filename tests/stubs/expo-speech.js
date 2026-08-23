// expo-speech stub. Records what would have been spoken so a suite can
// assert on it, rather than pretending the module does nothing — the thing
// worth checking is WHAT gets sent to the engine, not that a call happened.
export const spoken = [];

export const speak = (text, options) => {
  spoken.push({ text, options: options || {} });
};
export const stop = () => {};
export const pause = () => {};
export const resume = () => {};
export const isSpeakingAsync = async () => false;
export const getAvailableVoicesAsync = async () => globalThis.__voices || [];
export const maxSpeechInputLength = 4000;
