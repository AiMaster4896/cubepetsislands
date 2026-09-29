// Synthesized sound effects + spoken prompts.
// Recorded voice: drop MP3s into assets/audio/<key>.mp3 (see say()) and they
// take priority over speech synthesis.
let ctx = null;
let settings = { sound: true, voice: true, voiceName: '' };
export function configureAudio(s) { settings = { ...settings, ...s }; voice = null; }

export function unlockAudio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  // Warm up speech synthesis on iOS (needs a user gesture).
  if ('speechSynthesis' in window) { try { window.speechSynthesis.getVoices(); } catch (e) { /* ignore */ } }
}

function tone({ f0, f1, dur, type = 'sine', vol = 0.25, delay = 0 }) {
  if (!ctx || !settings.sound) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
const seq = (...steps) => steps.forEach((s) => tone(s));

const SOUNDS = {
  cow:     () => tone({ f0: 180, f1: 120, dur: 0.7, type: 'sawtooth', vol: 0.15 }),
  pig:     () => seq({ f0: 300, f1: 220, dur: 0.12, type: 'square', vol: 0.12 }, { f0: 320, f1: 200, dur: 0.14, type: 'square', vol: 0.12, delay: 0.15 }),
  hog:     () => tone({ f0: 220, f1: 140, dur: 0.25, type: 'square', vol: 0.12 }),
  chick:   () => seq({ f0: 1400, f1: 1900, dur: 0.08, vol: 0.15 }, { f0: 1500, f1: 2000, dur: 0.08, vol: 0.15, delay: 0.12 }),
  dog:     () => seq({ f0: 420, f1: 260, dur: 0.15, type: 'sawtooth', vol: 0.15 }, { f0: 440, f1: 250, dur: 0.15, type: 'sawtooth', vol: 0.15, delay: 0.2 }),
  cat:     () => tone({ f0: 600, f1: 900, dur: 0.5, type: 'triangle', vol: 0.15 }),
  bunny:   () => seq({ f0: 900, f1: 1300, dur: 0.1, vol: 0.12 }, { f0: 900, f1: 1300, dur: 0.1, vol: 0.12, delay: 0.13 }),
  fox:     () => seq({ f0: 700, f1: 1100, dur: 0.1, type: 'triangle', vol: 0.13 }, { f0: 700, f1: 1100, dur: 0.1, type: 'triangle', vol: 0.13, delay: 0.12 }, { f0: 700, f1: 1100, dur: 0.1, type: 'triangle', vol: 0.13, delay: 0.24 }),
  deer:    () => tone({ f0: 500, f1: 350, dur: 0.35, type: 'triangle', vol: 0.12 }),
  beaver:  () => seq({ f0: 250, f1: 250, dur: 0.06, type: 'square', vol: 0.1 }, { f0: 250, f1: 250, dur: 0.06, type: 'square', vol: 0.1, delay: 0.1 }, { f0: 250, f1: 250, dur: 0.06, type: 'square', vol: 0.1, delay: 0.2 }),
  koala:   () => tone({ f0: 160, f1: 90, dur: 0.5, type: 'sawtooth', vol: 0.1 }),
  panda:   () => tone({ f0: 260, f1: 200, dur: 0.4, type: 'triangle', vol: 0.13 }),
  caterpillar: () => seq({ f0: 1200, f1: 1600, dur: 0.06, vol: 0.1 }, { f0: 1300, f1: 1700, dur: 0.06, vol: 0.1, delay: 0.08 }),
  bee:     () => tone({ f0: 220, f1: 240, dur: 0.6, type: 'sawtooth', vol: 0.08 }),
  penguin: () => seq({ f0: 800, f1: 600, dur: 0.12, type: 'square', vol: 0.1 }, { f0: 800, f1: 600, dur: 0.12, type: 'square', vol: 0.1, delay: 0.16 }),
  crab:    () => seq({ f0: 2000, f1: 1500, dur: 0.04, type: 'square', vol: 0.08 }, { f0: 2000, f1: 1500, dur: 0.04, type: 'square', vol: 0.08, delay: 0.07 }),
  fish:    () => seq({ f0: 500, f1: 900, dur: 0.1, vol: 0.1 }, { f0: 600, f1: 1000, dur: 0.1, vol: 0.1, delay: 0.14 }),
  parrot:  () => seq({ f0: 1000, f1: 1500, dur: 0.15, type: 'sawtooth', vol: 0.08 }, { f0: 1500, f1: 900, dur: 0.15, type: 'sawtooth', vol: 0.08, delay: 0.18 }),
  monkey:  () => seq({ f0: 600, f1: 900, dur: 0.1, type: 'square', vol: 0.1 }, { f0: 600, f1: 900, dur: 0.1, type: 'square', vol: 0.1, delay: 0.14 }, { f0: 600, f1: 900, dur: 0.1, type: 'square', vol: 0.1, delay: 0.28 }),
  elephant:() => tone({ f0: 300, f1: 500, dur: 0.8, type: 'sawtooth', vol: 0.12 }),
  polar:   () => tone({ f0: 150, f1: 100, dur: 0.6, type: 'sawtooth', vol: 0.12 }),
  lion:    () => tone({ f0: 200, f1: 110, dur: 0.9, type: 'sawtooth', vol: 0.15 }),
  tiger:   () => tone({ f0: 180, f1: 100, dur: 0.7, type: 'sawtooth', vol: 0.14 }),
  giraffe: () => tone({ f0: 400, f1: 300, dur: 0.3, type: 'triangle', vol: 0.1 }),
  ghost:   () => seq({ f0: 300, f1: 600, dur: 0.5, type: 'sine', vol: 0.12 }, { f0: 600, f1: 250, dur: 0.5, type: 'sine', vol: 0.12, delay: 0.5 }),
  default: () => tone({ f0: 500, f1: 800, dur: 0.2, type: 'triangle', vol: 0.15 })
};

// What each animal "says" — spoken by the voice so it's recognisable, on top of a little tone.
const CALLS = { cow: 'Moo!', pig: 'Oink oink!', hog: 'Grunt grunt!', chick: 'Cheep cheep!', dog: 'Woof woof!', cat: 'Meow!', bunny: 'Hop hop!', fox: 'Yip yip!', deer: 'Hello deer!', beaver: 'Chomp chomp!', koala: 'Yawn!', panda: 'Munch munch!', caterpillar: 'Wiggle wiggle!', bee: 'Buzz buzz!', penguin: 'Squawk!', crab: 'Click click!', fish: 'Blub blub!', parrot: 'Hello! Squawk!', monkey: 'Ooh ooh, ah ah!', elephant: 'Toot toot!', polar: 'Roar!', lion: 'Roar!', tiger: 'Grrr!', giraffe: 'Hum hum!', ghost: 'Boo!', kid: 'Hi!' };
export function playPet(id) {
  (SOUNDS[id] || SOUNDS.default)();
  // Animal calls are spoken higher and quicker so they sound small and cute.
  if (CALLS[id]) say('call-' + id, CALLS[id], { queue: true, pitch: 1.9, rate: 1.05 });
}
export function playPop() { tone({ f0: 500, f1: 1100, dur: 0.12, type: 'triangle', vol: 0.12 }); }
export function playWrong() { tone({ f0: 300, f1: 200, dur: 0.25, type: 'triangle', vol: 0.1 }); }
export function playDing(n = 0) { tone({ f0: 660 * Math.pow(1.122, n), f1: 660 * Math.pow(1.122, n), dur: 0.25, type: 'sine', vol: 0.15 }); }
export function playCheer() {
  [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, f1: f, dur: 0.25, type: 'triangle', vol: 0.12, delay: i * 0.12 }));
}
export function playFanfare() {
  [523, 523, 523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, f1: f, dur: 0.3, type: 'square', vol: 0.08, delay: i * 0.15 }));
}

// ---- speech ----
const clips = new Map();
let voice = null;
// English voices available on this device, for the settings dropdown.
export function listVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'))
    .sort((x, y) => (y.localService - x.localService) || x.name.localeCompare(y.name));
}
export function setVoiceName(name) { settings.voiceName = name || ''; voice = null; }
function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = window.speechSynthesis.getVoices();
  if (settings.voiceName) { const chosen = vs.find((v) => v.name === settings.voiceName); if (chosen) return chosen; }
  // Score voices: English, known female names first, anything labelled male last.
  const FEMALE = ['samantha', 'karen', 'moira', 'tessa', 'fiona', 'zira', 'susan', 'hazel', 'catherine', 'ava', 'allison', 'nicky', 'serena', 'kate', 'female', 'woman', 'google uk english female', 'google us english', 'aria', 'jenny', 'libby', 'sonia', 'natasha', 'emma', 'joanna', 'salli', 'kimberly'];
  const score = (v) => {
    const n = v.name.toLowerCase(), en = (v.lang || '').toLowerCase().startsWith('en');
    let s = en ? 10 : 0;
    if (/male\b/.test(n) && !/female/.test(n)) s -= 5;
    if (/daniel|david|mark|george|james|arthur|fred|alex\b|rishi|oliver|ryan|guy|christopher|eric|matthew|thomas/.test(n)) s -= 4;
    if (FEMALE.some((f) => n.includes(f))) s += 5;
    if (v.localService) s += 1;
    if (/siri|enhanced|premium|natural/.test(n)) s += 1;
    return s;
  };
  return vs.slice().sort((x, y) => score(y) - score(x))[0] || null;
}

// key: stable id for a recorded clip (e.g. "find-cow"); text: what to say.
// Resolves when the line has finished (or at once if voice is off / unavailable).
// opts.queue = true appends after the current line instead of cutting it off.
export function say(key, text, opts = {}) {
  if (!settings.voice || !text) return Promise.resolve();
  if (clips.has(key)) {
    const a = clips.get(key); a.currentTime = 0;
    return new Promise((res) => { a.onended = res; a.play().catch(res); });
  }
  if (!('speechSynthesis' in window)) return new Promise((res) => setTimeout(res, 400 + text.length * 45));
  return new Promise((res) => {
    try {
      if (!opts.queue) window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (!voice) voice = pickVoice();
      if (voice) { try { u.voice = voice; } catch (e) { /* ignore */ } }
      u.rate = opts.rate ?? 0.88; u.pitch = opts.pitch ?? 1.15; u.volume = 1;
      let done = false; const finish = () => { if (!done) { done = true; res(); } };
      u.onend = finish; u.onerror = finish;
      setTimeout(finish, 1500 + text.length * 90); // safety net if events never fire
      window.speechSynthesis.speak(u);
    } catch (e) { res(); }
  });
}
export function playChime() {
  tone({ f0: 880, f1: 880, dur: 0.14, type: 'sine', vol: 0.12 });
  tone({ f0: 1320, f1: 1320, dur: 0.22, type: 'sine', vol: 0.12, delay: 0.14 });
}
if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };

// Probe for recorded clips listed in assets/audio/clips.json (optional).
export async function loadClips() {
  try {
    const r = await fetch('assets/audio/clips.json');
    if (!r.ok) return;
    const list = await r.json();
    for (const key of list) { const a = new Audio(`assets/audio/${key}.mp3`); a.preload = 'auto'; clips.set(key, a); }
  } catch (e) { /* no clips */ }
}
