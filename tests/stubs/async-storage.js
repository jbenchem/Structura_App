// AsyncStorage stub: enough for the store module to import cleanly, plus a
// backdoor (_mem) so tests can seed legacy keys and inspect what got saved —
// which is how the rename-migration test works.
const mem = new Map();
export default {
  getItem: async (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: async (k, v) => { mem.set(k, v); },
  removeItem: async (k) => { mem.delete(k); },
  _mem: mem,
};
