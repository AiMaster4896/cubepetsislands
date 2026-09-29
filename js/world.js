import * as THREE from '../vendor/three.module.min.js';
import { hexToWorld, hexArea, hexDistance, worldToHex, HEX_DIRS } from './hex.js';
import { instance, preload, settle } from './assets.js';
import { makePet } from './pets.js';
import { buildAvatar } from './girl.js';

const MODEL_EXT = window.MODEL_EXT || '.glb'; // artifact host serves .json, GitHub serves .glb
export const MODEL = (m) => `assets/models/${m}${MODEL_EXT}`;
export const PET_SCALE = 0.4;

// Surface height of each tile type; anything not listed can't hold pets/props.
const FLAT_TOP = { 'hex/grass': 0.2, 'hex/sand': 0.2, 'hex/stone': 0.2, 'hex/dirt': 0.1, 'hex/water': 0.1, 'hex/river-straight': 0.1 };

export function modelPathsFor(map) {
  const paths = new Set();
  paths.add(MODEL(map.fill.inner)); paths.add(MODEL(map.fill.outer));
  map.tiles.forEach((t) => paths.add(MODEL(t.m)));
  (map.props || []).forEach((p) => paths.add(MODEL(p.m)));
  (map.pets || []).forEach((p) => { if (!p.build) paths.add(MODEL(p.m || 'pets/animal-' + p.id)); });
  (map.unlocks || []).forEach((id) => paths.add(MODEL('pets/animal-' + id)));
  if (map.countItem) paths.add(MODEL(map.countItem.m));
  if (map.sizeItem) paths.add(MODEL(map.sizeItem.m));
  return [...paths];
}

export async function buildWorld(map, onProgress, opts = {}) {
  await preload(modelPathsFor(map), onProgress);
  await settle();

  const island = new THREE.Group();
  const tappables = [];
  const tileMeshes = [];
  const animated = [];
  const tiles = new Map();      // "q,r" -> { name, top, mesh, free }
  const dynamic = [];           // objects spawned by game modes

  const override = new Map(map.tiles.map((t) => [`${t.q},${t.r}`, t]));
  for (const [q, r] of hexArea(map.fill.radius)) {
    const o = override.get(`${q},${r}`);
    const name = o ? o.m : (hexDistance(q, r) === map.fill.radius ? map.fill.outer : map.fill.inner);
    const mesh = instance(MODEL(name));
    const { x, z } = hexToWorld(q, r);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = ((o && o.rot) || 0) * Math.PI / 3;
    mesh.userData = { kind: 'tile', name, q, r };
    island.add(mesh);
    tileMeshes.push(mesh);
    const top = FLAT_TOP[name];
    const inner = hexDistance(q, r) < map.fill.radius;
    const usable = inner && top !== undefined && !name.includes('water') && !name.includes('river') && !(o && o.block);
    tiles.set(`${q},${r}`, { name, top: top ?? 0.2, mesh, walkable: usable, slots: usable ? [true, true] : [false, false] });

    if (name === 'hex/building-mill') {
      const blades = mesh.getObjectByName('rotate-x');
      if (blades) {
        mesh.userData.spin = 1;
        animated.push({ update: (t, dt) => { blades.rotation.x += dt * mesh.userData.spin; mesh.userData.spin += (1 - mesh.userData.spin) * dt; } });
        tappables.push(mesh);
      }
    }
  }

  const tileTop = (q, r) => (tiles.get(`${q},${r}`) || { top: 0.2 }).top;
  // Each usable tile has two slots (left / right). Small offsets take one slot; centred objects take both.
  const SLOT = [{ dx: -0.24, dz: 0.06 }, { dx: 0.26, dz: 0.14 }];
  const occupy = (q, r, dx) => {
    const t = tiles.get(`${q},${r}`); if (!t) return;
    if (dx === undefined || Math.abs(dx) < 0.1) t.slots = [false, false]; else t.slots[dx < 0 ? 0 : 1] = false;
  };

  // ---- walking graph (flat land tiles; buildings, hills, forests and water are obstacles) ----
  const walkable = (q, r) => { const t = tiles.get(`${q},${r}`); return !!(t && t.walkable); };
  const walkableTiles = [...tiles.entries()].filter(([, t]) => t.walkable).map(([k]) => k.split(',').map(Number));
  function findPath(from, to) {
    const key = (q, r) => `${q},${r}`;
    if (!walkable(...to)) return null;
    const prev = new Map([[key(...from), null]]);
    const queue = [from];
    while (queue.length) {
      const [q, r] = queue.shift();
      if (q === to[0] && r === to[1]) break;
      for (const [dq, dr] of HEX_DIRS) {
        const nq = q + dq, nr = r + dr, k = key(nq, nr);
        if (prev.has(k) || !walkable(nq, nr)) continue;
        prev.set(k, [q, r]); queue.push([nq, nr]);
      }
    }
    if (!prev.has(key(...to))) return null;
    const path = [];
    for (let cur = to; cur; cur = prev.get(key(...cur))) path.push(cur);
    return path.reverse();
  }
  const nav = {
    walkable, worldToHex, hexToWorld, tileTop, findPath,
    randomWalkable: () => walkableTiles[Math.floor(Math.random() * walkableTiles.length)],
    // World-space waypoints (tile centres with a little jitter) from a world position to a random tile up to maxSteps away.
    routeFrom(pos, maxSteps = 4) {
      const from = worldToHex(pos.x, pos.z);
      if (!walkable(...from)) return null;
      for (let tries = 0; tries < 8; tries++) {
        const to = nav.randomWalkable();
        if (hexDistance(to[0] - from[0], to[1] - from[1]) > maxSteps || (to[0] === from[0] && to[1] === from[1])) continue;
        const path = findPath(from, to);
        if (!path || path.length < 2) continue;
        return path.slice(1).map(([q, r]) => { const p = hexToWorld(q, r); return { x: p.x + (Math.random() - 0.5) * 0.3, y: tileTop(q, r), z: p.z + (Math.random() - 0.5) * 0.3 }; });
      }
      return null;
    },
    routeTo(pos, target) {
      const from = worldToHex(pos.x, pos.z), to = worldToHex(target.x, target.z);
      const path = findPath(from, to);
      if (!path) return null;
      const pts = path.slice(1).map(([q, r]) => { const p = hexToWorld(q, r); return { x: p.x, y: tileTop(q, r), z: p.z }; });
      return pts;
    }
  };


  function place(mesh, p, kind) {
    const { x, z } = hexToWorld(p.q, p.r);
    mesh.position.set(x + (p.dx || 0), tileTop(p.q, p.r) + (p.dy || 0), z + (p.dz || 0));
    mesh.scale.setScalar(p.s || 1);
    mesh.rotation.y = p.angle !== undefined ? p.angle * Math.PI / 180 : (p.rot || 0) * Math.PI / 3;
    mesh.userData = { ...mesh.userData, kind, name: p.m, q: p.q, r: p.r };
    island.add(mesh);
    if (p.float) {
      const baseY = mesh.position.y, ph = Math.random() * 6;
      animated.push({ update: (t) => { mesh.position.y = baseY + Math.sin(t * 1.5 + ph) * 0.06; mesh.rotation.z = Math.sin(t * 1.2 + ph) * 0.06; } });
    }
    return mesh;
  }

  for (const p of map.props || []) {
    const mesh = place(instance(MODEL(p.m)), p, 'prop');
    occupy(p.q, p.r, p.dx);
    if (p.glow) { mesh.userData.glow = true; tappables.push(mesh); }
  }

  for (const l of map.lights || []) {
    const light = new THREE.PointLight(l.color, l.intensity, l.distance, 1.5);
    const { x, z } = hexToWorld(l.q, l.r);
    light.position.set(x + (l.dx || 0), tileTop(l.q, l.r) + (l.dy || 0), z + (l.dz || 0));
    island.add(light);
    const base = l.intensity;
    animated.push({ update: (t) => { light.intensity = base * (0.85 + Math.sin(t * 9 + x) * 0.08 + Math.sin(t * 23 + z) * 0.07); } });
  }

  const pets = [];
  function addPet(p) {
    const model = p.build ? buildAvatar(p.build, p.look) : instance(MODEL(p.m || 'pets/animal-' + p.id));
    const pet = makePet(p.id, model, p.s ? p.s * PET_SCALE : PET_SCALE, { float: p.float, nav, speed: p.speed, maxSteps: p.maxSteps });
    place(pet.group, { ...p, s: 1 }, 'petGroup');
    pet.setHome(pet.group.position);
    occupy(p.q, p.r, p.dx);
    pets.push(pet);
    tappables.push(pet.hit);
    animated.push(pet);
    return pet;
  }
  for (const p of map.pets || []) addPet(p);
  if (opts.extraPets) for (const p of opts.extraPets) addPet(p);

  animated.push({ update: (t) => { island.position.y = Math.sin(t * 0.8) * 0.04; } });

  // ---- helpers for game modes ----
  // Free slots as { q, r, dx, dz }, shuffled.
  function freeSlots() {
    const out = [];
    for (const [k, t] of tiles) t.slots.forEach((f, i) => { if (f) { const [q, r] = k.split(',').map(Number); out.push({ q, r, ...SLOT[i] }); } });
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  // Pick a free slot for a new permanent pet and occupy it.
  function claimSlot() { const s = freeSlots()[0]; if (s) occupy(s.q, s.r, s.dx); return s; }
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  function spawn(modelName, p, opts2 = {}) {
    // Wrap the model so a generous invisible hit sphere (world radius ~0.42) surrounds it.
    const g = new THREE.Group();
    const model = instance(MODEL(modelName));
    if (opts2.tint) model.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(opts2.tint); o.material.map = null; } });
    g.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const sc = p.s || 1;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.42 / sc, 10, 8), hitMat);
    hit.position.set(0, Math.min(box.max.y * 0.5, 0.35 / sc), 0);
    g.add(hit);
    place(g, { ...p, m: modelName }, opts2.kind || 'dyn');
    Object.assign(g.userData, opts2.data || {});
    dynamic.push(g);
    if (opts2.tappable !== false) tappables.push(g);
    return g;
  }
  function spawnObject(obj, p, opts2 = {}) {
    place(obj, { ...p, m: 'custom' }, opts2.kind || 'dyn');
    Object.assign(obj.userData, opts2.data || {});
    dynamic.push(obj);
    if (opts2.tappable !== false) tappables.push(obj);
    return obj;
  }
  function clearDynamic() {
    for (const m of dynamic) { island.remove(m); const i = tappables.indexOf(m); if (i >= 0) tappables.splice(i, 1); }
    dynamic.length = 0;
  }

  return { map, island, tappables, tileMeshes, animated, pets, tiles, tileTop, nav, freeSlots, claimSlot, spawn, spawnObject, clearDynamic, addPet };
}

export function makeSky(scene, map) {
  const group = new THREE.Group();
  scene.background = new THREE.Color(map.sky);
  const hemi = new THREE.HemisphereLight(map.ambient.sky, map.ambient.ground, map.ambient.intensity);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(map.sun.color, map.sun.intensity);
  sun.position.set(...map.sun.position);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = 8;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 30 });
  sun.shadow.bias = -0.0005;
  group.add(sun);

  const rnd = mulberry(map.night ? 11 : 7);
  const updates = [];

  const nightGroup = new THREE.Group();
  group.add(nightGroup);
  {
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
    moon.position.set(-5, 5.5, -6);
    nightGroup.add(moon);
    // Stars.
    const starGeo = new THREE.BufferGeometry();
    const pos = [];
    for (let i = 0; i < 160; i++) { const a = rnd() * Math.PI * 2, e = rnd() * 0.9 + 0.1, R = 30; pos.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R); }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    nightGroup.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, sizeAttenuation: true })));
    // Fireflies.
    const ffGeo = new THREE.BufferGeometry();
    const ff = [], base = [];
    for (let i = 0; i < 40; i++) { const x = (rnd() - 0.5) * 6, y = 0.5 + rnd() * 1.5, z = (rnd() - 0.5) * 6; ff.push(x, y, z); base.push(x, y, z, rnd() * 6); }
    ffGeo.setAttribute('position', new THREE.Float32BufferAttribute(ff, 3));
    const ffPts = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xd8ff6a, size: 0.09, transparent: true, opacity: 0.9 }));
    nightGroup.add(ffPts);
    updates.push((t) => {
      const a = ffGeo.attributes.position.array;
      for (let i = 0; i < 40; i++) { const b = i * 4; a[i * 3] = base[b] + Math.sin(t * 0.7 + base[b + 3]) * 0.4; a[i * 3 + 1] = base[b + 1] + Math.sin(t * 1.3 + base[b + 3]) * 0.2; a[i * 3 + 2] = base[b + 2] + Math.cos(t * 0.5 + base[b + 3]) * 0.4; }
      ffGeo.attributes.position.needsUpdate = true;
      ffPts.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;
    });
  }
  nightGroup.visible = !!map.night;
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
  sunDisc.position.set(6, 6, -7);
  sunDisc.visible = !map.night;
  group.add(sunDisc);

  const cloudMat = new THREE.MeshStandardMaterial({ color: map.night ? 0x7d6fb3 : 0xffffff, roughness: 1 });
  const clouds = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.35 + rnd() * 0.35, 12, 10), cloudMat);
      m.position.set((k - n / 2) * 0.45, rnd() * 0.2, (rnd() - 0.5) * 0.3);
      c.add(m);
    }
    const a = (i / 7) * Math.PI * 2;
    c.position.set(Math.cos(a) * (4.5 + rnd() * 3), -2.6 + rnd() * 1.6, Math.sin(a) * (4.5 + rnd() * 3));
    c.userData.speed = 0.05 + rnd() * 0.05;
    clouds.add(c);
  }
  group.add(clouds);
  updates.push((t, dt) => { clouds.children.forEach((c) => { c.position.x += dt * c.userData.speed; if (c.position.x > 9) c.position.x = -9; }); });

  // Day/night blend (used by the home island).
  const dayBg = new THREE.Color(map.sky), nightBg = new THREE.Color('#2a1b4e');
  const daySun = map.sun.intensity, dayHemi = map.ambient.intensity;
  let nightAmt = map.night ? 1 : 0, nightTarget = nightAmt;
  updates.push((t, dt) => {
    if (Math.abs(nightAmt - nightTarget) < 0.001) return;
    nightAmt += (nightTarget - nightAmt) * Math.min(1, dt * 1.2);
    scene.background.copy(dayBg).lerp(nightBg, nightAmt);
    sun.intensity = daySun * (1 - nightAmt * 0.75); sun.color.set(map.sun.color).lerp(new THREE.Color('#9fb4ff'), nightAmt);
    hemi.intensity = dayHemi * (1 - nightAmt * 0.45);
    nightGroup.visible = nightAmt > 0.3; sunDisc.visible = nightAmt < 0.7;
    cloudMat.color.set(0xffffff).lerp(new THREE.Color(0x7d6fb3), nightAmt);
  });

  scene.add(group);
  return { group, clouds: clouds.children, setNight(on) { nightTarget = on ? 1 : 0; }, isNight: () => nightTarget > 0.5, update: (t, dt) => updates.forEach((u) => u(t, dt)) };
}

function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
