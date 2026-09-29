import * as THREE from '../vendor/three.module.min.js';
import { playPet } from './audio.js';

const hitMat = new THREE.MeshBasicMaterial({ visible: false });

export function makePet(id, model, scale, opts = {}) {
  const group = new THREE.Group();
  model.scale.setScalar(scale);
  group.add(model);

  // Oversized invisible hit sphere so small fingers always land.
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), hitMat);
  hit.position.y = 0.32;
  hit.userData = { kind: 'pet', id };
  group.add(hit);

  const legs = ['leg-front-left', 'leg-front-right', 'leg-back-left', 'leg-back-right']
    .map((n) => model.getObjectByName(n)).filter(Boolean);
  const head = model.getObjectByName('Group');
  const baseRot = head ? head.rotation.y : 0;

  let jump = 0, jumpT = 0, wob = 0, wobT = 0;
  // Roaming: follow a path of waypoints across walkable tiles, pause, repeat.
  const HOP = ['bunny', 'chick', 'fox', 'caterpillar', 'bee', 'parrot', 'crab', 'fish'].includes(id);
  const nav = opts.nav;
  let route = [], onArrive = null, walkWait = 2 + Math.random() * 5, facing = 0, faceTarget = 0, stride = 0;
  const SPEED = opts.speed || (HOP ? 0.65 : 0.5);
  let vis = 1, visTarget = 1;
  const phase = Math.random() * 10;
  let lookT = 0, lookTarget = 0, look = 0;

  const pet = {
    id, group, hit, hidden: false, frozen: false, walking: false, asleep: false,
    sleep(on) { pet.asleep = on; pet.frozen = on; if (on) pet.stopWalking(); },
    setHome() {},
    // Walk to a world position (nearest walkable tile), then call cb.
    goTo(target, cb) {
      if (!nav) return false;
      const r = nav.routeTo(group.position, target);
      if (!r) return false;
      route = r; onArrive = cb || null; pet.walking = true;
      return true;
    },
    stopWalking() { route = []; onArrive = null; pet.walking = false; faceTarget = 0; },
    poke(silent) {
      jumpT = 0; jump = 1;
      if (!silent) playPet(id);
    },
    wobble() { wobT = 0; wob = 1; },
    hide() { visTarget = 0; pet.hidden = true; },
    show() { visTarget = 1; pet.hidden = false; group.visible = true; },
    update(t, dt) {
      // Pop in/out.
      if (Math.abs(vis - visTarget) > 0.001) {
        vis += (visTarget - vis) * Math.min(1, dt * 8);
        if (Math.abs(vis - visTarget) < 0.01) vis = visTarget;
      }
      group.visible = vis > 0.02;
      const breathe = 1 + Math.sin(t * (pet.asleep ? 1.2 : 2) + phase) * (pet.asleep ? 0.04 : 0.02);
      let sx = breathe, sy = (pet.asleep ? 0.82 : 1) / breathe, sz = breathe;
      let py = opts.float ? 0.15 + Math.sin(t * 1.6 + phase) * 0.08 : 0;
      let ry = 0;

      lookT -= dt;
      if (lookT <= 0) { lookT = 2 + Math.random() * 4; lookTarget = (Math.random() - 0.5) * 1.2; }
      look += (lookTarget - look) * dt * 3;
      if (head) head.rotation.y = baseRot + look;

      // Roam.
      if (jump === 0 && wob === 0 && !pet.hidden && !pet.frozen) {
        if (!route.length) {
          walkWait -= dt;
          if (walkWait <= 0 && nav) {
            const r = nav.routeFrom(group.position, opts.maxSteps || 4);
            if (r) { route = r; pet.walking = true; } else walkWait = 2;
          }
        }
        if (route.length) {
          const g = route[0];
          const dx = g.x - group.position.x, dz = g.z - group.position.z;
          const d = Math.hypot(dx, dz);
          faceTarget = Math.atan2(dx, dz);
          if (d < 0.04) {
            route.shift();
            if (!route.length) { pet.walking = false; walkWait = 3 + Math.random() * 6; faceTarget = 0; const cb = onArrive; onArrive = null; if (cb) cb(); }
          } else {
            const step = Math.min(d, SPEED * dt);
            group.position.x += dx / d * step; group.position.z += dz / d * step;
            group.position.y += (g.y - group.position.y) * Math.min(1, dt * 8);
            stride += dt * (HOP ? 9 : 7);
            if (HOP) py += Math.abs(Math.sin(stride)) * 0.08;
            else py += Math.abs(Math.sin(stride * 0.5)) * 0.02;
            legs.forEach((l, i) => { l.rotation.x = Math.sin(stride + (i % 2 ? Math.PI : 0)) * 0.55; });
          }
        }
      } else if (route.length && (pet.frozen || pet.hidden)) { route = []; pet.walking = false; walkWait = 2; faceTarget = 0; }
      // Ease heading toward target angle (shortest way round).
      let diff = faceTarget - facing; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      facing += diff * Math.min(1, dt * 6);
      if (!route.length && jump === 0 && Math.abs(diff) < 0.02) legs.forEach((l) => { l.rotation.x += (0 - l.rotation.x) * Math.min(1, dt * 8); });

      if (jump > 0) {
        jumpT += dt * 2.6;
        const p = Math.min(jumpT, 1);
        const h = Math.sin(p * Math.PI);
        py += h * 0.45;
        ry = Math.sin(p * Math.PI) * 0.6;
        const sq = 1 + h * 0.18;
        sx = 1 / sq; sy = sq; sz = 1 / sq;
        legs.forEach((l, i) => { l.rotation.x = Math.sin(p * Math.PI * 2 + i) * 0.6 * h; });
        if (p >= 1) { jump = 0; legs.forEach((l) => (l.rotation.x = 0)); }
      }
      if (wob > 0) {
        wobT += dt * 3;
        const p = Math.min(wobT, 1);
        ry = Math.sin(p * Math.PI * 4) * 0.35 * (1 - p);
        if (p >= 1) wob = 0;
      }
      const pop = vis < 1 ? vis * (1 + (1 - vis) * 0.4) : 1;
      model.scale.set(scale * sx * pop, scale * sy * pop, scale * sz * pop);
      model.position.y = py;
      model.rotation.y = facing + ry;
    }
  };
  hit.userData.pet = pet;
  return pet;
}
