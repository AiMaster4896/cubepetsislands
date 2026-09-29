import * as THREE from '../vendor/three.module.min.js';
import { makeWave, makeSign } from './girl.js';
import { say, playPop, playDing, playCheer, playFanfare, playPet } from './audio.js';
import { makeRainbow } from './effects.js';
import { store } from './storage.js';
import { instance } from './assets.js';
import { MODEL } from './world.js';
import { hud } from './hud.js';
import { hexToWorld } from './hex.js';

const NAMES = { cow: 'cow', pig: 'pig', chick: 'chick', dog: 'dog', cat: 'cat', bunny: 'bunny', hog: 'boar', fox: 'fox', deer: 'deer', beaver: 'beaver', koala: 'koala', panda: 'panda', caterpillar: 'caterpillar', bee: 'bee', penguin: 'penguin', crab: 'crab', fish: 'fish', parrot: 'parrot', monkey: 'monkey', elephant: 'elephant', polar: 'polar bear', lion: 'lion', tiger: 'tiger', giraffe: 'giraffe', ghost: 'ghost' };
// Animals live in a ring around the house; spots go clockwise from near to far.
const PET_SPOTS = [[2, 0], [-2, 2], [0, -2], [2, -2], [-2, 0], [1, 2], [3, -1], [-3, 1], [-1, 3], [-1, -2], [3, -3], [2, 1], [-2, -1], [0, 3], [0, -3], [3, 0], [-3, 0], [1, -3], [4, -2], [-4, 2], [2, -4], [-2, 4], [-3, 2], [2, -3]];

export function homeName(childName) { return childName ? `${childName}'s Home` : 'My Home'; }

// The home island is generated from what she has collected, so it grows over time.
// The house sits in the middle; animals roam the meadow around it.
export function buildHomeMap(childName, metIds, avatar = 'girl') {
  const map = {
    id: 'home', name: homeName(childName), mascot: avatar, home: true,
    sky: '#ffe0b2',
    sun: { color: '#fff1d0', intensity: 2.5, position: [4, 8, 5] },
    ambient: { sky: '#ffe9c9', ground: '#7aa544', intensity: 1.2 },
    fill: { radius: 5, inner: 'hex/grass', outer: 'hex/water' },
    tiles: [
      { q: 0, r: 0, m: 'hex/grass', block: true },
      { q: 3, r: -4, m: 'hex/building-farm', rot: 3 },
      { q: -4, r: 4, m: 'hex/building-mill' },
      { q: 4, r: -1, m: 'hex/grass-hill' }, { q: -4, r: 1, m: 'hex/grass-hill' },
      { q: -1, r: -3, m: 'hex/grass-forest' }, { q: 1, r: 3, m: 'hex/grass-forest' }, { q: 4, r: -4, m: 'hex/grass-forest' }, { q: -4, r: 0, m: 'hex/grass-forest' }, { q: 0, r: -4, m: 'hex/grass-forest' },
      { q: 3, r: 1, m: 'hex/sand' }, { q: 2, r: 2, m: 'hex/sand' }, { q: -3, r: 3, m: 'hex/sand' },
      { q: 5, r: -5, m: 'hex/water-rocks' }, { q: 0, r: 5, m: 'hex/water-rocks' }, { q: -5, r: 2, m: 'hex/water-rocks' }, { q: 4, r: 1, m: 'hex/water-rocks' }, { q: -2, r: -3, m: 'hex/water-rocks' }
    ],
    props: [
      // The house: a big standalone building on its own plot in the middle.
      { q: 0, r: 0, m: 'hex/unit-mansion', s: 3.5, angle: 0, dx: 0, dz: -0.15 },
      // Front garden: a straight picket fence with a gate, a path to the gate, flowers at the corners.
      { q: 0, r: 1, m: 'graveyard/fence-gate', s: 0.8, dx: -0.5, dz: 0.5, angle: 0 },
      { q: 0, r: 1, m: 'graveyard/fence', s: 0.8, dx: -1.3, dz: 0.5, angle: 0 },
      { q: 0, r: 1, m: 'graveyard/fence', s: 0.8, dx: 0.3, dz: 0.5, angle: 0 },
      { q: 0, r: 1, m: 'graveyard/fence', s: 0.8, dx: -1.7, dz: 0.1, angle: 90 },
      { q: 0, r: 1, m: 'graveyard/fence', s: 0.8, dx: 0.7, dz: 0.1, angle: 90 },
      { q: 0, r: 2, m: 'hex/path-straight', s: 1.0, dx: -1.0, dz: -0.35, angle: 90 },
      { q: 0, r: 2, m: 'hex/path-straight', s: 1.0, dx: -1.0, dz: 0.55, angle: 90 },
      { q: 0, r: 1, m: 'forest/plant', s: 0.6, dx: -1.15, dz: 0.2 },
      { q: 0, r: 1, m: 'forest/plant', s: 0.6, dx: 0.15, dz: 0.2 },
      { q: 1, r: -1, m: 'forest/tree', s: 0.55, dx: 0.1, dz: -0.35 },
      { q: -1, r: 0, m: 'forest/tree-high', s: 0.5, dx: -0.25, dz: -0.35 },
      { q: 0, r: -1, m: 'forest/flag', s: 0.6, dx: 0.4, dz: -0.2 },
      // Fields and orchard further out.
      { q: 3, r: 1, m: 'graveyard/hay-bale', s: 0.32, dx: -0.28, dz: 0.05 },
      { q: 3, r: 1, m: 'graveyard/hay-bale', s: 0.32, dx: 0.25, dz: 0.2 },
      { q: 2, r: 2, m: 'graveyard/hay-bale-bundled', s: 0.32, dx: -0.25, dz: 0.1 },
      { q: -3, r: 3, m: 'forest/stones', s: 0.5, dx: 0.3, dz: -0.2 },
      { q: -3, r: 3, m: 'forest/plant', s: 0.7, dx: -0.25, dz: 0.25 },
      { q: 3, r: -2, m: 'forest/tree', s: 0.55, dx: 0.3, dz: 0.2 },
      { q: -2, r: 3, m: 'forest/tree', s: 0.55, dx: -0.3, dz: 0.2 },
      { q: 1, r: -4, m: 'forest/plant', s: 0.7, dx: -0.3, dz: 0.2 }
    ],
    pets: [{ q: 0, r: 2, id: 'kid', build: avatar, s: 1.0, dx: -0.55, dz: 0.1, speed: 0.75, maxSteps: 6 }],
    unlocks: []
  };
  const propTiles = new Set(map.props.map((p) => `${p.q},${p.r}`));
  const ov = new Map(map.tiles.map((t) => [`${t.q},${t.r}`, t.m]));
  const flat = (q, r) => ['hex/grass', 'hex/sand', undefined].includes(ov.get(`${q},${r}`)) && !(q === 0 && r === 0);
  const spots = PET_SPOTS.filter(([q, r]) => flat(q, r) && !propTiles.has(`${q},${r}`) && !(q === 0 && r === 1) && !(q === 0 && r === 2));
  const ids = metIds.filter((id) => id !== 'kid' && id !== 'girl');
  ids.forEach((id, i) => {
    const s = spots[i % spots.length];
    if (!s) return;
    const p = { q: s[0], r: s[1], id, dx: i < spots.length ? -0.2 : 0.25 };
    if (id === 'ghost') { p.m = 'graveyard/character-ghost'; p.s = 0.95; p.dy = 0.3; p.float = true; }
    map.pets.push(p);
  });
  map.garden = store.garden();
  return map;
}

// Life on the home island: the child wanders, visits animals, waves when tapped, and walks wherever she's sent.
const FLOWER_COLOURS = [0xff5c8a, 0xffd23f, 0x4d96ff, 0xff8c42, 0xb56bff, 0xffffff];

export function makeHomeLife(world, ctx) {
  const { effects, sky } = ctx;
  // Flowers from earlier visits.
  for (const f of world.map.garden || []) world.spawn('forest/plant', { q: f.q, r: f.r, dx: f.dx, dz: f.dz, s: 1.0 }, { tint: f.c, tappable: false, data: { flower: true } });
  const rainbow = makeRainbow();
  world.island.add(rainbow);
  let raining = 0, planting = false, partyT = 0, zzzT = 0;
  const kid = world.pets.find((p) => p.id === 'kid');
  const animals = () => world.pets.filter((p) => p !== kid);
  const wave = makeWave(kid.group.children[0]);
  let timer = null, active = false;
  const worldPos = (o) => o.getWorldPosition(new THREE.Vector3());

  // Name sign above the house.
  const sign = makeSign(world.map.name);
  const h = hexToWorld(0, 0);
  sign.position.set(h.x, 1.75, h.z);
  world.island.add(sign);
  const marker = makeMarker();
  world.island.add(marker);

  function visitRandom() {
    const list = animals();
    if (!list.length || !active) return schedule(visitRandom, 8000);
    visit(list[Math.floor(Math.random() * list.length)]);
  }
  function visit(pet) {
    if (!kid.goTo(worldPos(pet.group), () => greet(pet))) schedule(visitRandom, 4000);
  }
  function greet(pet) {
    if (!active) return;
    kid.poke(true);
    pet.poke();
    effects.hearts(worldPos(pet.group).add(new THREE.Vector3(0, 0.6, 0)));
    if (Math.random() < 0.5) say('greet-' + pet.id, `Hello ${NAMES[pet.id] || pet.id}!`, { queue: true });
    schedule(visitRandom, 7000 + Math.random() * 7000);
  }
  // Feeding: she walks to the animal, a hay bale appears, the animal munches, hearts.
  let feeding = false;
  function feed(pet) {
    if (!kid.goTo(worldPos(pet.group), () => {
      if (!active) return;
      const p = worldPos(pet.group);
      const hay = instance(MODEL('graveyard/hay-bale'));
      hay.scale.setScalar(0.28); hay.position.set(p.x + 0.25, p.y, p.z + 0.25);
      world.island.add(hay);
      setTimeout(() => world.island.remove(hay), 6000);
      pet.poke(); playDing(3);
      effects.hearts(p.add(new THREE.Vector3(0, 0.6, 0)), 7);
      say('yum-' + pet.id, `Yum yum! The ${NAMES[pet.id] || pet.id} loves it.`, { queue: true });
      schedule(visitRandom, 9000);
    })) schedule(visitRandom, 4000);
  }
  // Everyone come home: all animals run to the garden.
  function callAll() {
    const list = animals();
    if (!list.length) return;
    playCheer();
    say('callall', 'Everybody, come home!');
    const spots = [[1, 1], [-1, 2], [1, 2], [-1, 1], [2, 1], [-2, 3], [0, 3], [2, 0], [-2, 2], [1, -1], [-1, 0], [2, -1], [-2, 1], [0, -2]];
    list.forEach((pet, i) => {
      const s = spots[i % spots.length];
      const t = hexToWorld(s[0], s[1]);
      setTimeout(() => { pet.stopWalking(); pet.goTo({ x: t.x, z: t.z }, () => { pet.poke(); effects.hearts(worldPos(pet.group).add(new THREE.Vector3(0, 0.6, 0)), 3); }); }, i * 250);
    });
    kid.stopWalking();
    kid.goTo({ x: hexToWorld(0, 2).x - 0.5, z: hexToWorld(0, 2).z + 0.2 }, () => { wave.start(); });
    schedule(visitRandom, 20000);
  }
  function schedule(fn, ms) { clearTimeout(timer); timer = setTimeout(() => { if (active) fn(); }, ms); }

  return {
    animated: [wave, { update: (t, dt) => {
      sign.position.y = 1.75 + Math.sin(t * 1.5) * 0.05; marker.update(t);
      if (raining > 0) { raining -= dt; effects.raindrops(new THREE.Vector3(0, 0, 0), 6); if (raining <= 0) { rainbow.visible = true; playCheer(); say('rainbow', 'Look, a rainbow!', { queue: true }); setTimeout(() => { rainbow.visible = false; }, 9000); } }
      if (partyT > 0) { partyT -= dt; if (Math.random() < dt * 4) { const a = animals(); if (a.length) a[Math.floor(Math.random() * a.length)].poke(true); } if (Math.random() < dt * 1.5) effects.confetti(new THREE.Vector3((Math.random() - 0.5) * 4, 1.5, (Math.random() - 0.5) * 4)); }
      if (sky && sky.isNight()) { zzzT -= dt; if (zzzT <= 0) { zzzT = 0.9; const a = animals().filter((p) => p.asleep); if (a.length) effects.zzz(worldPos(a[Math.floor(Math.random() * a.length)].group).add(new THREE.Vector3(0.2, 0.7, 0))); } }
    } }],
    // ---- activities ----
    toggleNight() {
      const on = !sky.isNight();
      sky.setNight(on);
      clearTimeout(timer);
      if (on) {
        say('night', 'Good night, everyone! Sleep tight.');
        animals().forEach((p) => p.sleep(true));
        kid.stopWalking();
      } else {
        say('morning', 'Good morning! Cock-a-doodle-doo!', { pitch: 1.7 });
        animals().forEach((p, i) => { p.sleep(false); setTimeout(() => p.poke(true), 300 + i * 150); });
        schedule(visitRandom, 6000);
      }
      return on;
    },
    isNight: () => sky && sky.isNight(),
    setPlanting(on) { planting = on; if (on) say('plant-hint', 'Tap the grass to plant a flower!'); },
    isPlanting: () => planting,
    party() {
      partyT = 6; playFanfare();
      say('party', 'Party time! Everybody dance!');
      wave.start(); kid.poke(true);
      animals().forEach((p) => p.stopWalking());
      effects.rain(new THREE.Vector3(0, 0, 0));
      clearTimeout(timer); schedule(visitRandom, 12000);
    },
    // Tapping a cloud makes it rain.
    cloudTap() {
      if (raining > 0 || rainbow.visible) return;
      raining = 5; playDing(1);
      say('rain', 'Uh oh, rain! Everybody hop!');
      animals().forEach((p, i) => setTimeout(() => p.poke(true), i * 120));
      kid.poke(true);
    },
    start(childName) {
      active = true;
      const n = animals().length;
      hud.cheer(world.map.name, null, 2500);
      const hi = childName ? `Welcome home, ${childName}!` : 'Welcome home!';
      if (n === 0) say('home-empty', `${hi} Meet animals on the islands and they will come to live here.`);
      else say('home-welcome', `${hi} Your ${n === 1 ? 'friend is' : n + ' friends are'} waiting for you.`);
      schedule(visitRandom, 6000);
    },
    stop() { active = false; feeding = false; clearTimeout(timer); kid.stopWalking(); marker.hide(); },
    setFeeding(on) { feeding = on; if (on) say('feed-hint', 'Tap an animal to feed it!'); },
    isFeeding() { return feeding; },
    callAll,
    // Tap on the home island. owners: tappable objects under the finger; tile: the ground tile under it (or null).
    tap(owners, tile, childName) {
      // Planting: a flower grows where she taps.
      if (planting && tile && world.nav.walkable(tile.q, tile.r) && !(tile.q === 0 && tile.r === 0)) {
        const f = { q: tile.q, r: tile.r, dx: (Math.random() - 0.5) * 0.6, dz: (Math.random() - 0.5) * 0.6, c: FLOWER_COLOURS[Math.floor(Math.random() * FLOWER_COLOURS.length)] };
        const g = world.spawn('forest/plant', { ...f, s: 1.0 }, { tint: f.c, tappable: false, data: { flower: true } });
        g.scale.setScalar(0.05); g.userData.grow = 0;
        const grow = { update: (t, dt) => { if (g.userData.grow < 1) { g.userData.grow = Math.min(1, g.userData.grow + dt * 1.5); const s = 1.0 * (1 - Math.pow(1 - g.userData.grow, 3)); g.scale.setScalar(Math.max(s, 0.05)); } } };
        world.animated.push(grow);
        store.plant(f);
        playPop(); effects.hearts(worldPos(g).add(new THREE.Vector3(0, 0.4, 0)), 2);
        return true;
      }
      const o = owners[0];
      if (o && o.userData.kind === 'pet') {
        const pet = o.userData.pet;
        if (pet === kid) {
          wave.start(); kid.poke(true); playPop();
          const lines = childName ? [`Hi ${childName}!`, 'I love our home!', "Let's visit the animals!", 'Tap where I should go!'] : ['Hi!', 'I love our home!', "Let's visit the animals!", 'Tap where I should go!'];
          say('kid-line', lines[Math.floor(Math.random() * lines.length)]);
          return true;
        }
        pet.poke();
        effects.burst(worldPos(pet.group).add(new THREE.Vector3(0, 0.3, 0)));
        clearTimeout(timer);
        if (feeding) feed(pet); else visit(pet);
        return true;
      }
      // Tap the ground: she walks there.
      if (tile && world.nav.walkable(tile.q, tile.r)) {
        const p = hexToWorld(tile.q, tile.r);
        const target = { x: p.x, z: p.z };
        clearTimeout(timer);
        marker.show(p.x, world.tileTop(tile.q, tile.r), p.z);
        playPop();
        if (kid.goTo(target, () => { marker.hide(); kid.poke(true); schedule(visitRandom, 9000); })) return true;
      }
      return false;
    }
  };
}

// Ring on the ground showing where she's walking to.
function makeMarker() {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 24), new THREE.MeshBasicMaterial({ color: 0xffb400, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3;
  m.show = (x, y, z) => { m.position.set(x, y + 0.02, z); m.visible = true; };
  m.hide = () => { m.visible = false; };
  m.update = (t) => { if (m.visible) { const s = 1 + Math.sin(t * 6) * 0.12; m.scale.set(s, s, s); } };
  return m;
}
