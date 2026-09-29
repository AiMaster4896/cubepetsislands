import * as THREE from '../vendor/three.module.min.js';
import { buildWorld, makeSky, MODEL } from './world.js';
import { buildHub } from './hub.js';
import { makeGame } from './game.js';
import { makeEffects } from './effects.js';
import { hud, bindHud } from './hud.js';
import { unlockAudio, playPop, say, loadClips, playPet } from './audio.js';

const isShown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const ownerOf = (o) => { while (o && !o.userData.kind) o = o.parent; return o; };
import { store } from './storage.js';
import { thumbnail, thumbnailObject } from './thumbs.js';
import { buildAvatar } from './girl.js';
import { buildHomeMap, makeHomeLife } from './home.js';

const MAPS = { farm: 'maps/sunny-farm.json', pumpkin: 'maps/pumpkin-patch.json', forest: 'maps/forest-camp.json', beach: 'maps/beach-island.json' };

// ---------- renderer / camera ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const LOOK_AT = new THREE.Vector3(0, 0.25, 0.2);
const LOOK_AT_PORTRAIT = new THREE.Vector3(0, 0.25, -0.55);
const FRAME = { island: { portrait: 8.6, landscape: 7.6 }, hub: { portrait: 4.4, landscape: 7.4 } };
let frameKind = 'hub';

function fitCamera() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const fov = Math.min(vFov, hFov);
  const width = FRAME[frameKind][camera.aspect < 1 ? 'portrait' : 'landscape'];
  const dist = (width / 2) / Math.tan(fov / 2);
  const pitch = THREE.MathUtils.degToRad(camera.aspect < 1 ? 52 : 42);
  const look = camera.aspect < 1 ? LOOK_AT_PORTRAIT : LOOK_AT;
  camera.position.set(0, look.y + Math.sin(pitch) * dist, look.z + Math.cos(pitch) * dist);
  camera.lookAt(look);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  if (hub) hub.relayout(camera.aspect);
}
window.addEventListener('resize', fitCamera);

// ---------- state ----------
let hub = null;
let current = null;        // { scene, world, sky, game, effects } or null when on hub
const islands = {};        // cached built islands
let scene = null, animatedExtra = [];

const fill = document.getElementById('fill');
const startBtn = document.getElementById('start');
const overlay = document.getElementById('overlay');
const fade = document.getElementById('fade');

// Surface fatal errors on the loading screen so they can be reported.
function showFatal(msg) {
  const t = document.getElementById('title');
  if (t) { t.textContent = 'Oops'; t.style.fontSize = '22px'; }
  const bar = document.getElementById('bar');
  if (bar) { bar.outerHTML = `<div style="color:#fff;font-size:15px;max-width:80vw;text-align:center;word-break:break-word">${String(msg)}</div>`; }
}
window.addEventListener('error', (e) => showFatal(e.message || e.error));
window.addEventListener('unhandledrejection', (e) => showFatal((e.reason && (e.reason.message || e.reason)) || 'Unknown error'));

async function boot() {
  fitCamera();
  loadClips();
  hub = await buildHub((p) => { fill.style.width = Math.round(p * 100) + '%'; });
  fitCamera();
  scene = hub.scene;
  renderStartScreen();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------- start screen: player profiles ----------
let creating = false, pickedAvatar = 'girl';
function renderStartScreen() {
  const list = document.getElementById('profiles');
  const profiles = store.profiles();
  list.innerHTML = '';
  if (profiles.length === 0) creating = true;
  for (const p of profiles) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'profile' + (p.id === store.currentId() && !creating ? ' on' : '');
    const img = document.createElement('img'); img.src = thumbnailObject(buildAvatar(p.avatar), { yaw: 0.3 }); img.alt = '';
    const name = document.createElement('span'); name.textContent = p.name || 'Player';
    const stars = document.createElement('small'); stars.textContent = '★ ' + p.stars;
    b.append(img, name, stars);
    b.addEventListener('pointerdown', (e) => { e.stopPropagation(); creating = false; store.select(p.id); playPop(); renderStartScreen(); });
    list.appendChild(b);
  }
  const add = document.createElement('button');
  add.type = 'button'; add.className = 'profile new' + (creating ? ' on' : ''); add.textContent = '+';
  add.title = 'New player';
  add.addEventListener('pointerdown', (e) => { e.stopPropagation(); creating = true; playPop(); renderStartScreen(); });
  list.appendChild(add);
  list.hidden = false;
  const np = document.getElementById('new-player');
  np.hidden = !creating;
  if (creating) {
    document.getElementById('name').value = '';
    document.querySelectorAll('.avatar').forEach((b) => {
      if (!b.querySelector('img').src) b.querySelector('img').src = thumbnailObject(buildAvatar(b.dataset.avatar), { yaw: 0.3 });
      b.classList.toggle('on', b.dataset.avatar === pickedAvatar);
      b.onpointerdown = (e) => { e.stopPropagation(); pickedAvatar = b.dataset.avatar; document.querySelectorAll('.avatar').forEach((x) => x.classList.toggle('on', x === b)); playPop(); };
    });
  }
  startBtn.hidden = false;
}

startBtn.addEventListener('pointerdown', () => {
  unlockAudio();
  if (creating) {
    const name = document.getElementById('name').value.trim();
    store.create(name, pickedAvatar);
    document.getElementById('name').blur();
  }
  if (!store.currentId()) return;
  const { name, avatar } = store.settings();
  hub.setHome(name, avatar);
  // Islands are per player: forget any built for the previous one.
  for (const k in islands) delete islands[k];
  overlay.classList.add('hide');
  hud.showButtons(false, true);
  say('welcome', name ? `Hi ${name}! Pick an island!` : 'Pick an island!');
});
document.getElementById('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') startBtn.dispatchEvent(new Event('pointerdown')); });
document.getElementById('name').addEventListener('pointerdown', (e) => e.stopPropagation());

// Exit: back to the start screen (choose another player or stop).
document.getElementById('exit').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  playPop();
  hud.showButtons(false, false);
  document.getElementById('exit').hidden = true;
  creating = false;
  renderStartScreen();
  overlay.classList.remove('hide');
});
// Home activities.
document.getElementById('feed').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (!current || !current.home) return;
  const on = !current.game.isFeeding();
  current.game.setFeeding(on);
  if (on) { current.game.setPlanting(false); document.getElementById('seed').classList.remove('on'); }
  document.getElementById('feed').classList.toggle('on', on);
  playPop();
});
document.getElementById('seed').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (!current || !current.home) return;
  const on = !current.game.isPlanting();
  current.game.setPlanting(on);
  if (on) { current.game.setFeeding(false); document.getElementById('feed').classList.remove('on'); }
  document.getElementById('seed').classList.toggle('on', on);
  playPop();
});
document.getElementById('party').addEventListener('pointerdown', (e) => { e.stopPropagation(); if (current && current.home) current.game.party(); });
document.getElementById('night').addEventListener('pointerdown', (e) => { e.stopPropagation(); if (current && current.home) { const on = current.game.toggleNight(); document.getElementById('night').classList.toggle('on', on); playPop(); } });
document.getElementById('callall').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (current && current.home) current.game.callAll();
});

async function goToIsland(id) {
  fade.classList.add('on');
  await sleep(380);
  // The home farm is rebuilt whenever her collection has changed.
  if (id === 'home' && islands.home && islands.home.key !== homeKey()) delete islands.home;
  if (!islands[id]) {
    const map = id === 'home' ? buildHomeMap(store.settings().name, store.get().met, store.settings().avatar) : await (await fetch(MAPS[id])).json();
    const s = new THREE.Scene();
    const sky = makeSky(s, map);
    const extra = (map.unlocks || []).slice(0, store.unlockedCount(id));
    const world = await buildWorld(map, null, { extraPets: [] });
    // Re-add previously unlocked pets in free slots.
    for (const pid of extra) { const slot = world.claimSlot(); if (slot) world.addPet({ ...slot, id: pid }); }
    s.add(world.island);
    const effects = makeEffects(s);
    const game = id === 'home' ? makeHomeLife(world, { effects, sky }) : makeGame(world, { effects });
    islands[id] = { scene: s, world, sky, game, effects, home: id === 'home', key: homeKey() };
  }
  current = islands[id];
  scene = current.scene;
  frameKind = 'island'; fitCamera();
  hud.showButtons(true, false, current.home);
  if (current.home) { current.game.start(store.settings().name); hud.goal(store.stars() % 6, 6, null); }
  else { current.game.start(); const n = store.settings().name; hud.cheer(current.world.map.name, null, 2200); say('island-' + id, n ? `Welcome to ${current.world.map.name}, ${n}!` : current.world.map.name + '!'); }
  fade.classList.remove('on');
}
const homeKey = () => store.settings().name + '|' + store.settings().avatar + '|' + store.get().met.join(',');

async function goHome() {
  if (!current) return;
  fade.classList.add('on');
  await sleep(380);
  current.game.stop();
  current.world.clearDynamic();
  current = null;
  scene = hub.scene;
  frameKind = 'hub'; fitCamera();
  hud.showButtons(false, true);
  hud.goal(0, 0, null);
  fade.classList.remove('on');
}

bindHud({
  onHome: goHome,
  onRepeat: () => current && !current.home && current.game.repeat(),
  onReset: () => { for (const k in islands) delete islands[k]; if (current) goHome(); hub.setHome(store.settings().name, store.settings().avatar); },
  onSettings: () => hub.setHome(store.settings().name, store.settings().avatar),
  onDelete: () => { store.remove(store.currentId()); for (const k in islands) delete islands[k]; if (current) { current.game.stop(); current = null; scene = hub.scene; frameKind = 'hub'; fitCamera(); } hud.showButtons(false, false); renderStartScreen(); overlay.classList.remove('hide'); }
});

// ---------- input ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', (e) => {
  if (!scene) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (!current) {
    const hits = ray.intersectObjects(hub.tappables, true);
    if (!hits.length) return;
    let o = hits[0].object;
    while (o && !o.userData.hub) o = o.parent;
    if (o) { playPop(); const w = hub.worlds[o.userData.hub]; w.pets[0] && w.pets[0].poke(true); goToIsland(o.userData.hub); }
    return;
  }
  const owners = [];
  for (const h of ray.intersectObjects(current.world.tappables, true)) {
    if (!isShown(h.object)) continue;
    const o = ownerOf(h.object);
    if (o && !owners.includes(o)) owners.push(o);
  }
  if (current.home) {
    const ch = ray.intersectObjects(current.sky.clouds, true);
    if (ch.length && !owners.length) { current.game.cloudTap(); return; }
    const th = ray.intersectObjects(current.world.tileMeshes, true);
    let tile = th.length ? th[0].object : null;
    while (tile && tile.userData.kind !== 'tile') tile = tile.parent;
    if (current.game.tap(owners, tile ? tile.userData : null, store.settings().name)) return;
  }
  if (!owners.length) return;
  if (!current.home && current.game.tap(owners)) return;
  const o = owners[0];
  // Free play.
  const pos = o.getWorldPosition(new THREE.Vector3());
  if (o.userData.kind === 'pet') {
    o.userData.pet.poke();
    current.effects.burst(pos.add(new THREE.Vector3(0, 0.3, 0)));
    if (store.meet(o.userData.id)) hud.cheer('', thumbnail(MODEL(o.userData.id === 'ghost' ? 'graveyard/character-ghost' : 'pets/animal-' + o.userData.id)));
  } else if (o.userData.name === 'hex/building-mill') {
    o.userData.spin = 12; playPop();
    current.effects.burst(pos.add(new THREE.Vector3(0, 0.9, 0)));
  } else if (o.userData.glow) {
    o.userData._bump = 1; playPet('ghost'); say('boo', 'Boo!');
    current.effects.burst(pos.add(new THREE.Vector3(0, 0.3, 0)));
  } else if (o.userData.countable || o.userData.balloon || o.userData.size) {
    o.userData._bump = 1; playPop();
  }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
// Hub hover: the island under the pointer grows slightly.
function hubHover(e) {
  if (current || !hub) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(hub.tappables, true);
  let o = hits.length ? hits[0].object : null;
  while (o && !o.userData.hub) o = o.parent;
  hub.setHover(o ? o.userData.hub : null);
  canvas.style.cursor = o ? 'pointer' : 'default';
}
canvas.addEventListener('pointermove', hubHover);
canvas.addEventListener('pointerleave', () => hub && hub.setHover(null));

// ---------- loop ----------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  if (!scene) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (current) {
    current.world.animated.forEach((a) => a.update(t, dt));
    current.game.animated.forEach((a) => a.update(t, dt));
    current.sky.update(t, dt);
    current.effects.update(dt);
  } else hub.update(t, dt);
  renderer.render(scene, camera);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
boot();

// Test hooks (used by the headless test script only).
window.__nav = () => { const w = current.world; const p = w.pets[0]; return { pos: p.group.position.toArray(), hex: w.nav.worldToHex(p.group.position.x, p.group.position.z), walk: w.nav.walkable(...w.nav.worldToHex(p.group.position.x, p.group.position.z)), route: w.nav.routeFrom(p.group.position, 4), rnd: w.nav.randomWalkable() }; };
window.__tilePoint = (q, r) => { const w = current.world; const pos = w.nav.hexToWorld(q, r); const v = new THREE.Vector3(pos.x, 0.2, pos.z).applyMatrix4(w.island.matrixWorld).project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; };
window.__go = () => current.world.pets[0].goTo({ x: 2, z: 2 });
window.__pets = () => current.world.pets.map((p) => [p.id, p.hidden]);
window.__hint = (l) => current && current.game.hint(l);
window.__forceMode = (name) => current && current.game.forceMode(name);
window.__points = (pred) => { const out = []; for (const o of current.world.tappables) { const u = o.userData; if (pred(u)) { const v = o.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0)).project(camera); out.push({ x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, u: { kind: u.kind, id: u.id, colour: u.colour, size: u.size, countable: !!u.countable } }); } } return out; };
window.__setRounds = (n) => { store.setSettings({ roundsPerSession: n }); };
window.__hubPoint = (id) => { const g = hub.worlds[id].island; const v = g.getWorldPosition(new THREE.Vector3()).project(camera); return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight }; };
