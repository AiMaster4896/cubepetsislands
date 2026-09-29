// localStorage-backed progress with player profiles. Everything is optional; failures are silent.
// Data lives on this device only (no accounts, no network).
const KEY = 'cube-pets-islands.v2';
const OLD_KEY = 'cube-pets-islands.v1';
const PROFILE_DEFAULTS = {
  name: '', avatar: 'girl',
  unlocked: {},            // islandId -> number of unlocked extra pets
  met: [],                 // pet ids she has tapped at least once (sticker book / home)
  stars: 0,                // one star per completed round
  garden: [],              // flowers planted at home: { q, r, dx, dz, c }
  level: {},               // islandId -> 2..4 choices
  settings: { voiceName: '', sound: true, voice: true, modes: { find: true, colour: true, count: true, size: true }, roundsPerSession: 6 }
};

let root = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    // Migrate a single-player save from the first version.
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const o = JSON.parse(old);
      const p = deepMerge(structuredClone(PROFILE_DEFAULTS), { ...o, name: (o.settings && o.settings.name) || '', avatar: (o.settings && o.settings.avatar) || 'girl' });
      return { current: 'p1', profiles: { p1: p } };
    }
  } catch (e) { /* ignore */ }
  return { current: null, profiles: {} };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(root)); } catch (e) { /* ignore */ } }
function deepMerge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) a[k] = deepMerge(a[k] || {}, b[k]); else a[k] = b[k]; } return a; }
function state() {
  if (!root.current || !root.profiles[root.current]) {
    // No profile selected yet: work on a scratch profile so nothing crashes before the start screen.
    if (!root._scratch) root._scratch = structuredClone(PROFILE_DEFAULTS);
    return root._scratch;
  }
  return root.profiles[root.current];
}

export const store = {
  // ---- profiles ----
  profiles() { return Object.entries(root.profiles).map(([id, p]) => ({ id, name: p.name, avatar: p.avatar, stars: p.stars || 0 })); },
  currentId() { return root.current; },
  select(id) { if (root.profiles[id]) { root.current = id; save(); } },
  create(name, avatar) {
    const id = 'p' + Date.now().toString(36);
    root.profiles[id] = deepMerge(structuredClone(PROFILE_DEFAULTS), { name, avatar });
    root.current = id; save();
    return id;
  },
  remove(id) { delete root.profiles[id]; if (root.current === id) root.current = Object.keys(root.profiles)[0] || null; save(); },

  // ---- current player ----
  get() { return state(); },
  unlockedCount(island) { return state().unlocked[island] || 0; },
  unlockedTotal() { return Object.values(state().unlocked).reduce((a, b) => a + b, 0); },
  unlock(island) { const s = state(); s.unlocked[island] = (s.unlocked[island] || 0) + 1; save(); return s.unlocked[island]; },
  stars() { return state().stars || 0; },
  addStar() { const s = state(); s.stars = (s.stars || 0) + 1; save(); return s.stars; },
  garden() { return state().garden || []; },
  plant(f) { const s = state(); s.garden = (s.garden || []).concat([f]).slice(-40); save(); },
  meet(id) { const s = state(); if (!s.met.includes(id)) { s.met.push(id); save(); return true; } return false; },
  level(island) { return state().level[island] || 2; },
  setLevel(island, n) { state().level[island] = Math.max(2, Math.min(4, n)); save(); },
  // settings() also exposes name/avatar so older call sites keep working.
  settings() { const s = state(); return { ...s.settings, name: s.name, avatar: s.avatar }; },
  setSettings(patch) {
    const s = state();
    const { name, avatar, ...rest } = patch;
    if (name !== undefined) s.name = name;
    if (avatar !== undefined) s.avatar = avatar;
    s.settings = deepMerge(s.settings, rest);
    save();
  },
  reset() { const s = state(); const keep = { name: s.name, avatar: s.avatar, settings: s.settings }; Object.assign(s, structuredClone(PROFILE_DEFAULTS), keep); save(); }
};
