export const Audio = {
  setAudioModeAsync: async () => {},
  Sound: {
    createAsync: async () => ({
      sound: {
        setPositionAsync: async () => {},
        playAsync: async () => { globalThis.__played = (globalThis.__played || 0) + 1; },
        unloadAsync: async () => {},
      },
    }),
  },
};
