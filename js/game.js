import * as THREE from '../vendor/three.module.min.js';
import { thumbnail } from './thumbs.js';
import { MODEL } from './world.js';
import { hud } from './hud.js';
import { say, playPop, playWrong, playDing, playCheer, playFanfare, playPet, playChime } from './audio.js';
import { store } from './storage.js';

const NAMES = { cow: 'cow', pig: 'pig', chick: 'chick', dog: 'dog', cat: 'cat', bunny: 'bunny', hog: 'boar', fox: 'fox', deer: 'deer', beaver: 'beaver', koala: 'koala', panda: 'panda', caterpillar: 'caterpillar', bee: 'bee', penguin: 'penguin', crab: 'crab', fish: 'fish', parrot: 'parrot', monkey: 'monkey', elephant: 'elephant', polar: 'polar bear', lion: 'lion', tiger: 'tiger', giraffe: 'giraffe', ghost: 'ghost' };
const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five'];
const COLOURS = [
  { id: 'red', hex: '#e8412c', three: 0xe8412c },
  { id: 'blue', hex: '#2f7de1', three: 0x2f7de1 },
  { id: 'yellow', hex: '#ffd23f', three: 0xffd23f },
  { id: 'green', hex: '#4caf50', three: 0x4caf50 }
];
const PRAISE = ['Yay!', 'Well done!', 'Hooray!', 'You did it!', 'Super!', 'Great job!'];
const FREE_PLAY_BEFORE_FIRST = 6000, BETWEEN_ROUNDS = 2600, AFTER_SESSION = 20000;
const HINT_1 = 7000, HINT_2 = 14000; // ms without a tap before the game helps
export const STARS_PER_FRIEND = 6;
const ALL = ['cow', 'pig', 'chick', 'dog', 'cat', 'bunny', 'hog', 'fox', 'deer', 'beaver', 'koala', 'panda', 'caterpillar', 'bee', 'penguin', 'crab', 'fish', 'parrot', 'monkey', 'elephant', 'polar', 'lion', 'tiger', 'giraffe'];

// Prefix the child's name on roughly every other prompt so it doesn't get monotonous.
const kid = () => store.settings().name || '';
const named = (text, always = false) => { const n = kid(); if (!n || (!always && Math.random() < 0.5)) return text; return `${n}, ${text.charAt(0).toLowerCase() + text.slice(1)}`; };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const UP = (y) => new THREE.Vector3(0, y, 0);

export function makeGame(world, ctx) {
  const { effects } = ctx;
  const islandId = world.map.id;
  let mode = null, timer = null, roundsDone = 0, streak = 0, misses = 0, lastMode = null, active = true;
  let sinceTap = 0, hintsGiven = 0, awaiting = false;
  const animated = [];

  const worldPos = (o) => o.getWorldPosition(new THREE.Vector3());
  const bump = (mesh, amount = 0.35) => { mesh.userData._bump = 1; mesh.userData._bumpAmt = amount; };
  animated.push({ update: (t, dt) => {
    for (const m of world.tappables) if (m.userData._bump > 0) {
      const p = m.userData._bump; const s = m.userData._base || (m.userData._base = m.scale.x);
      m.scale.setScalar(s * (1 + Math.sin(p * Math.PI) * (m.userData._bumpAmt || 0.35)));
      m.userData._bump = Math.max(0, p - dt * 2.5);
      if (m.userData._bump === 0) m.scale.setScalar(s);
    }
    // Idle hints while a round is waiting for a tap.
    if (mode && awaiting) {
      sinceTap += dt * 1000;
      if (hintsGiven === 0 && sinceTap > HINT_1) { hintsGiven = 1; mode.hint(1); }
      else if (hintsGiven === 1 && sinceTap > HINT_2) { hintsGiven = 2; mode.hint(2); }
    }
  } });

  function schedule(fn, ms) { clearTimeout(timer); timer = setTimeout(() => { if (active) fn(); }, ms); }
  const freezePets = (f) => world.pets.forEach((p) => { p.frozen = f; });
  const touched = () => { sinceTap = 0; };

  function enabledModes() {
    const m = store.settings().modes;
    return ['find', 'colour', 'count', 'size'].filter((k) => m[k]);
  }

  function nextRound() {
    const modes = enabledModes();
    if (!modes.length) return;
    let choice;
    if (modes.includes('find') && lastMode !== 'find') choice = 'find';
    else { const others = modes.filter((m) => m !== 'find'); choice = others.length ? pick(others.filter((m) => m !== lastMode).length ? others.filter((m) => m !== lastMode) : others) : 'find'; }
    if (choice !== 'find' && world.freeSlots().length < 2) choice = 'find';
    lastMode = choice;
    mode = MODES[choice]();
    freezePets(true);
    sinceTap = 0; hintsGiven = 0; awaiting = false;
    playChime();
    // Let the chime land, then set the scene and ask.
    schedule(() => { mode.start(); awaiting = true; }, 450);
  }

  function level() { return store.level(islandId); }

  // Who comes next: this island's list first, then any animal she hasn't met yet.
  function nextFriend() {
    const unlocks = world.map.unlocks || [];
    const n = store.unlockedCount(islandId);
    if (n < unlocks.length) return unlocks[n];
    const met = store.get().met;
    return ALL.find((id) => !met.includes(id) && !world.pets.some((p) => p.id === id)) || null;
  }
  function showGoal() {
    const id = nextFriend();
    hud.goal(store.stars() % STARS_PER_FRIEND, STARS_PER_FRIEND, id ? thumbnail(MODEL('pets/animal-' + id)) : null);
  }

  function endMode() {
    const m = mode; mode = null; awaiting = false;
    if (m) m.cleanup();
    freezePets(false);
    hud.hidePrompt();
  }

  function correct(obj, extraImg) {
    awaiting = false;
    effects.confetti(worldPos(obj).add(UP(0.4)));
    playCheer();
    const p = pick(PRAISE);
    hud.cheer(p, extraImg);
    say('praise', kid() ? `${p.replace(/!$/, '')}, ${kid()}!` : p, { queue: true });
    const stars = store.addStar();
    hud.stars(stars);
    showGoal();
    const unlocking = stars % STARS_PER_FRIEND === 0;
    streak++; misses = 0;
    if (streak >= 3) { store.setLevel(islandId, level() + 1); streak = 0; }
    roundsDone++;
    const m = mode; mode = null;
    schedule(() => {
      m.cleanup(); freezePets(false); hud.hidePrompt();
      if (unlocking) newFriend();
      else if (roundsDone >= store.settings().roundsPerSession) finishSession();
      else schedule(nextRound, BETWEEN_ROUNDS);
    }, 1500);
  }

  function newFriend() {
    playFanfare();
    effects.rain(new THREE.Vector3(0, 0, 0));
    const id = nextFriend();
    const slot = world.claimSlot();
    if (id && slot) {
      store.unlock(islandId);
      const pet = world.addPet({ ...slot, id });
      pet.hide(); pet.show();
      store.meet(id);
      hud.cheer('New friend!', thumbnail(MODEL('pets/animal-' + id)), 3500);
      const n = kid();
      say('newfriend-' + id, `${n ? n + ', a' : 'A'} new friend! The ${NAMES[id]} is now staying at ${n ? n + "'s" : 'your'} home. You can go there to find it.`, { queue: true }).then(() => playPet(id));
      schedule(() => { pet.poke(true); effects.burst(worldPos(pet.group).add(UP(0.3))); }, 1600);
    } else {
      hud.cheer('Amazing!');
      say('amazing', named('Amazing! You found everyone!', true), { queue: true });
    }
    showGoal();
    roundsDone = 0;
    schedule(nextRound, AFTER_SESSION);
  }
  function wrong(text) {
    playWrong();
    misses++; streak = 0;
    if (misses >= 2) { store.setLevel(islandId, level() - 1); misses = 0; }
    schedule(() => { if (mode) { say('wrong', text); hud.prompt(mode.promptData()); } }, 700);
  }

  function finishSession() {
    roundsDone = 0;
    playCheer();
    effects.confetti(new THREE.Vector3(0, 0.5, 0));
    hud.cheer('Great playing!');
    say('great', named('Great playing! Keep going for the next friend.', true), { queue: true });
    schedule(nextRound, BETWEEN_ROUNDS * 3);
  }

  // ---------------- modes ----------------
  // Each mode: start(), ask() (speak the prompt), tap(owner) -> consumed?, hint(level), cleanup(), promptData().
  const MODES = {
    find() {
      const pets = world.pets.filter((p) => !p.hidden);
      const target = pick(pets);
      const name = NAMES[target.id] || target.id;
      const img = thumbnail(MODEL(target.id === 'ghost' ? 'graveyard/character-ghost' : 'pets/animal-' + target.id));
      const promptData = () => ({ img, text: cap(name) });
      const ask = () => say('find-' + target.id, named(`Where is the ${name}?`)).then(() => { if (mode && mode.target === target) playPet(target.id); });
      return {
        target, promptData, ask,
        start() {
          hud.prompt(promptData());
          ask();
        },
        tap(o) {
          if (o.userData.kind !== 'pet') return false;
          const pet = o.userData.pet;
          if (pet.hidden) return false;
          touched();
          if (pet === target) { pet.poke(); correct(pet.group); }
          else { pet.wobble(); playPet(pet.id); wrong(`That's the ${NAMES[pet.id] || pet.id}. Where is the ${name}?`); }
          return true;
        },
        hint(lvl) {
          hud.prompt(promptData());
          if (lvl === 1) { say('find-' + target.id, `Where is the ${name}?`).then(() => playPet(target.id)); target.poke(true); }
          else { say('hint-' + target.id, `Here is the ${name}! Tap the ${name}.`); target.poke(true); effects.burst(worldPos(target.group).add(UP(0.5))); }
        },
        cleanup() {}
      };
    },

    colour() {
      const n = Math.min(level(), 4);
      const cols = shuffle(COLOURS).slice(0, n);
      const target = pick(cols);
      const slots = world.freeSlots().slice(0, n);
      let targetObj = null;
      const promptData = () => ({ color: target.hex, text: cap(target.id) + ' balloon' });
      const ask = () => say('colour-' + target.id, named(`Tap the ${target.id} balloon.`));
      return {
        promptData, ask,
        start() {
          cols.forEach((c, i) => {
            const s = slots[i]; if (!s) return;
            const b = makeBalloon(c.three);
            world.spawnObject(b, { ...s, dy: 0.05 }, { data: { colour: c.id, balloon: true } });
            if (c === target) targetObj = b;
            const ph = Math.random() * 6, base = b.position.y;
            animated.push({ update: (t) => { if (b.parent) { b.position.y = base + Math.sin(t * 1.8 + ph) * 0.05; b.rotation.z = Math.sin(t * 1.1 + ph) * 0.08; } } });
          });
          hud.prompt(promptData());
          ask();
        },
        tap(o) {
          if (!o.userData.balloon) return false;
          touched();
          if (o.userData.colour === target.id) { effects.burst(worldPos(o).add(UP(0.5))); playPop(); o.visible = false; correct(o); }
          else { bump(o); wrong(`That one is ${o.userData.colour}. Tap the ${target.id} balloon.`); }
          return true;
        },
        hint(lvl) {
          hud.prompt(promptData());
          if (!targetObj) return;
          if (lvl === 1) { ask(); bump(targetObj, 0.25); }
          else { say('hint-colour', `Here is the ${target.id} balloon! Tap it.`); bump(targetObj, 0.5); effects.burst(worldPos(targetObj).add(UP(0.9))); }
        },
        cleanup() { world.clearDynamic(); }
      };
    },

    count() {
      const item = world.map.countItem;
      const n = Math.min(level() + 1, 5);
      const slots = world.freeSlots().slice(0, n);
      const word = item.word;
      const plural = word.endsWith('s') ? word : word + 's';
      const img = thumbnail(MODEL(item.m));
      const items = [];
      let counted = 0;
      const promptData = () => ({ img, dots: n, lit: counted, text: `${n} ${n === 1 ? word : plural}` });
      const ask = () => say('count-' + n, named(`Let's count! Tap ${NUMBERS[n]} ${plural}.`));
      return {
        promptData, ask,
        start() {
          slots.forEach((s) => items.push(world.spawn(item.m, { ...s, s: item.s, rot: Math.floor(Math.random() * 6) }, { data: { countable: true } })));
          hud.prompt(promptData());
          ask();
        },
        tap(o) {
          if (!o.userData.countable || o.userData.counted) return false;
          touched();
          o.userData.counted = true;
          counted++;
          bump(o);
          playDing(counted);
          effects.burst(worldPos(o).add(UP(0.3)));
          hud.dots(counted);
          say('num-' + counted, NUMBERS[counted]);
          if (counted >= n) {
            awaiting = false;
            schedule(() => {
              // Bounce them all in order, then celebrate.
              items.forEach((it, i) => setTimeout(() => bump(it, 0.3), i * 160));
              say('count-done-' + n, `${NUMBERS[n]} ${n === 1 ? word : plural}!`, { queue: true });
              correct(o);
            }, 600);
          }
          return true;
        },
        hint(lvl) {
          const next = items.find((it) => !it.userData.counted);
          hud.prompt(promptData());
          if (!next) return;
          if (lvl === 1) { say('count-hint', counted ? `Keep counting! Tap another ${word}.` : `Tap a ${word} to count it.`); bump(next, 0.25); }
          else { say('count-hint2', `Here is a ${word}! Tap it.`); bump(next, 0.5); effects.burst(worldPos(next).add(UP(0.4))); }
        },
        cleanup() { world.clearDynamic(); }
      };
    },

    size() {
      const item = world.map.sizeItem;
      const slots = world.freeSlots().slice(0, 2);
      const big = Math.random() < 0.5;
      const img = thumbnail(MODEL(item.m));
      const want = big ? 'big' : 'small';
      let targetObj = null;
      const promptData = () => ({ img, text: cap(want) + ' ' + item.word, imgScale: big ? 1.15 : 0.55 });
      const ask = () => say('size-' + want + '-' + item.word, named(`Tap the ${want} ${item.word}.`));
      return {
        promptData, ask,
        start() {
          if (slots.length < 2) { correct(world.island); return; }
          const a = world.spawn(item.m, { ...slots[0], s: item.big }, { data: { size: 'big' } });
          const b = world.spawn(item.m, { ...slots[1], s: item.small }, { data: { size: 'small' } });
          targetObj = big ? a : b;
          hud.prompt(promptData());
          ask();
        },
        tap(o) {
          if (!o.userData.size) return false;
          touched();
          if (o.userData.size === want) { bump(o); correct(o); }
          else { bump(o); wrong(`That's the ${o.userData.size} ${item.word}. Tap the ${want} ${item.word}.`); }
          return true;
        },
        hint(lvl) {
          hud.prompt(promptData());
          if (!targetObj) return;
          if (lvl === 1) { ask(); bump(targetObj, 0.25); }
          else { say('hint-size', `Here is the ${want} ${item.word}! Tap it.`); bump(targetObj, 0.5); effects.burst(worldPos(targetObj).add(UP(0.5))); }
        },
        cleanup() { world.clearDynamic(); }
      };
    }
  };

  return {
    animated,
    start() { active = true; roundsDone = 0; showGoal(); schedule(nextRound, FREE_PLAY_BEFORE_FIRST); },
    stop() { active = false; clearTimeout(timer); endMode(); },
    repeat() { if (mode) { touched(); hud.prompt(mode.promptData()); mode.ask(); } },
    // owners: objects under the finger, nearest first. Returns true when the round consumed the tap.
    tap(owners) {
      if (!mode) return false;
      const list = Array.isArray(owners) ? owners : [owners];
      for (const o of list) if (mode.tap(o)) return true;
      return false;
    },
    hint(lvl) { if (mode) mode.hint(lvl); },
    forceMode(name) { clearTimeout(timer); endMode(); lastMode = name; mode = MODES[name](); freezePets(true); sinceTap = 0; hintsGiven = 0; mode.start(); awaiting = true; }
  };
}

function makeBalloon(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), mat);
  body.scale.y = 1.15; body.position.y = 0.72; body.castShadow = true;
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 8), mat);
  knot.position.y = 0.48; knot.rotation.x = Math.PI;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.46, 6), new THREE.MeshBasicMaterial({ color: 0x555555 }));
  string.position.y = 0.23;
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.66;
  g.add(body, knot, string, hit);
  return g;
}
