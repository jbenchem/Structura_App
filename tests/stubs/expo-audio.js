export const setAudioModeAsync = async () => {};
export const createAudioPlayer = () => ({
  volume: 1,
  seekTo: async () => {},
  play: () => { globalThis.__played = (globalThis.__played || 0) + 1; },
  pause: () => {},
  remove: () => {},
});
