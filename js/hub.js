import * as THREE from '../vendor/three.module.min.js';
import { buildWorld, makeSky } from './world.js';
import { makeSign } from './girl.js';
import { homeName } from './home.js';

// Small preview islands for the picker screen. Each is a radius-1 map with its mascot.
const MINI = {
  farm: { id: 'farm', fill: { radius: 1, inner: 'hex/grass', outer: 'hex/grass' }, tiles: [{ q: 1, r: -1, m: 'hex/building-farm', rot: 3 }, { q: -1, r: 0, m: 'hex/building-mill' }, { q: 0, r: 1, m: 'hex/grass-forest' }], props: [], pets: [{ q: 0, r: 0, id: 'cow' }] },
  pumpkin: { id: 'pumpkin', fill: { radius: 1, inner: 'hex/dirt', outer: 'hex/dirt' }, tiles: [{ q: 0, r: -1, m: 'hex/stone-hill' }, { q: 1, r: 0, m: 'hex/stone' }], props: [{ q: -1, r: 1, m: 'graveyard/pumpkin-carved', s: 1.1, dx: 0.1 }, { q: 1, r: -1, m: 'graveyard/pine', s: 0.4 }, { q: -1, r: 0, m: 'graveyard/lightpost-single', s: 0.7 }], pets: [{ q: 0, r: 0, id: 'ghost', m: 'graveyard/character-ghost', s: 1.0, dy: 0.3, float: true }] },
  forest: { id: 'forest', fill: { radius: 1, inner: 'hex/grass', outer: 'hex/grass-forest' }, tiles: [{ q: 1, r: 0, m: 'hex/grass' }, { q: 0, r: 1, m: 'hex/grass-hill' }], props: [{ q: 1, r: 0, m: 'forest/tent', s: 0.55, rot: 3 }], pets: [{ q: 0, r: 0, id: 'deer' }] },
  home: { id: 'home', fill: { radius: 1, inner: 'hex/grass', outer: 'hex/grass' }, tiles: [{ q: 0, r: 0, m: 'hex/building-house', rot: 3 }, { q: -1, r: 1, m: 'hex/grass-forest' }], props: [{ q: 1, r: -1, m: 'graveyard/fence', s: 0.8, dx: 0.1, dz: 0.4 }, { q: 1, r: 0, m: 'forest/flag', s: 0.6, dx: 0.2, dz: 0.2 }], pets: [{ q: 0, r: 1, id: 'kid', build: 'girl', dx: -0.1 }] },
  beach: { id: 'beach', fill: { radius: 1, inner: 'hex/sand', outer: 'hex/water' }, tiles: [{ q: 1, r: -1, m: 'hex/building-dock', rot: 2 }, { q: -1, r: 1, m: 'hex/sand-rocks' }], props: [{ q: 0, r: 1, m: 'hex/unit-ship', s: 1.3, dy: 0.05, float: true }, { q: -1, r: 0, m: 'forest/plant', s: 0.7 }], pets: [{ q: 0, r: 0, id: 'penguin' }] }
};
const BASE_SCALE = 0.62;
const NAMES = { farm: 'Sunny Farm', pumpkin: 'Pumpkin Patch', forest: 'Forest Camp', beach: 'Beach Island' };
const SIGN_COLOUR = { farm: '#43a047', pumpkin: '#7e57c2', forest: '#8d6e63', beach: '#039be5' };
const HUB_SKY = { sky: '#8fd3ff', sun: { color: '#fff4d6', intensity: 2.4, position: [4, 8, 5] }, ambient: { sky: '#bfe6ff', ground: '#6f9a3a', intensity: 1.2 } };

export async function buildHub(onProgress) {
  const scene = new THREE.Scene();
  const sky = makeSky(scene, HUB_SKY);
  const animated = [sky];
  const tappables = [];
  const ids = Object.keys(MINI);
  const worlds = {};
  let done = 0;
  for (const id of ids) {
    const w = await buildWorld(MINI[id], (p) => onProgress && onProgress((done + p) / ids.length));
    done++;
    worlds[id] = w;
    w.island.userData.hub = id;
    if (NAMES[id]) { const sg = makeSign(NAMES[id], { border: SIGN_COLOUR[id] }); sg.scale.set(2.4, 0.76, 1); sg.position.set(0, 1.8, 0); w.island.add(sg); }
    scene.add(w.island);
    animated.push(...w.animated);
    tappables.push(w.island);
  }
  layout(worlds, window.innerWidth / window.innerHeight);
  let hover = null, sign = null;
  return {
    // Personalise the home island: sign with the child's name, chosen avatar.
    setHome(childName, avatar) {
      const w = worlds.home;
      if (sign) w.island.remove(sign);
      sign = makeSign(homeName(childName), { border: '#e91e63' });
      sign.scale.set(2.6, 0.82, 1); sign.position.set(0, 1.55, 0);
      w.island.add(sign);
      const old = w.pets.find((p) => p.id === 'kid');
      if (old && old.group.children[0].name !== avatar) {
        w.island.remove(old.group);
        w.pets.splice(w.pets.indexOf(old), 1); w.tappables.splice(w.tappables.indexOf(old.hit), 1); w.animated.splice(w.animated.indexOf(old), 1);
        const i = animated.indexOf(old); if (i >= 0) animated.splice(i, 1);
        const np = w.addPet({ q: 0, r: 1, id: 'kid', build: avatar, dx: -0.1 });
        animated.push(np);
      }
    },
    scene, animated, tappables, worlds,
    relayout(aspect) { layout(worlds, aspect); },
    setHover(id) { hover = id; },
    update(t, dt) {
      animated.forEach((a) => a.update(t, dt));
      for (const id in worlds) {
        const g = worlds[id].island;
        const base = g.userData.baseScale || BASE_SCALE;
        const target = (id === hover ? base * 1.15 : base);
        const s = g.scale.x + (target - g.scale.x) * Math.min(1, dt * 10);
        g.scale.setScalar(s);
      }
    }
  };
}

function layout(worlds, aspect) {
  const portrait = aspect < 1;
  // 2x2 grid; islands are scaled down and spaced so they never overlap.
  const s = BASE_SCALE;
  // Landscape: 3 on top, 2 below. Portrait: 2 / 2 / 1.
  // Home sits bottom-left on its own; the four adventure islands form a 2x2 block on the right.
  // Four adventure islands along the top, home alone at the bottom.
  const pos = portrait
    ? (() => { const gx = 1.7, gz = 1.9; return { farm: [-gx / 2, -gz * 1.15], pumpkin: [gx / 2, -gz * 1.15], forest: [-gx / 2, -0.15], beach: [gx / 2, -0.15], home: [0, gz * 1.25] }; })()
    : (() => { const gx = 2.05; return { farm: [-1.5 * gx, -1.05], pumpkin: [-0.5 * gx, -1.05], forest: [0.5 * gx, -1.05], beach: [1.5 * gx, -1.05], home: [0, 2.15] }; })();
  const SCALE = { home: BASE_SCALE * 1.2 };
  for (const id in worlds) {
    const g = worlds[id].island;
    g.scale.setScalar(SCALE[id] || s);
    g.userData.baseScale = SCALE[id] || s;
    g.position.set(pos[id][0], 0, pos[id][1]);
    g.userData.baseY = 0;
    g.rotation.y = 0;
  }
}
