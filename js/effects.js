import * as THREE from '../vendor/three.module.min.js';

const geo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
const COLORS = [0xffd93d, 0xff6b6b, 0x6bcb77, 0x4d96ff, 0xff8fd8, 0xffffff];
const mats = COLORS.map((c) => new THREE.MeshBasicMaterial({ color: c }));

let heartTex = null, zzzTex = null;
function zzzTexture() {
  if (zzzTex) return zzzTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.strokeStyle = '#3a5a8c'; x.lineWidth = 4; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.strokeText('z', 32, 34); x.fillText('z', 32, 34);
  zzzTex = new THREE.CanvasTexture(c); zzzTex.colorSpace = THREE.SRGBColorSpace;
  return zzzTex;
}
// A rainbow: five thin coloured arcs.
export function makeRainbow() {
  const g = new THREE.Group();
  const cols = [0xff4f4f, 0xffa640, 0xffe74a, 0x5ad35a, 0x4d96ff, 0x9b6bff];
  cols.forEach((c, i) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(3.2 - i * 0.16, 0.07, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 }));
    g.add(t);
  });
  g.position.set(0, 0.3, -3.5);
  g.visible = false;
  return g;
}
function heartTexture() {
  if (heartTex) return heartTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = '#ff4f8b';
  x.beginPath(); x.moveTo(32, 58); x.bezierCurveTo(4, 36, 4, 12, 20, 10); x.bezierCurveTo(28, 9, 32, 16, 32, 20); x.bezierCurveTo(32, 16, 36, 9, 44, 10); x.bezierCurveTo(60, 12, 60, 36, 32, 58); x.fill();
  heartTex = new THREE.CanvasTexture(c); heartTex.colorSpace = THREE.SRGBColorSpace;
  return heartTex;
}

export function makeEffects(scene) {
  const parts = [];
  function emit(pos, n, power) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mats[i % mats.length]);
      m.position.copy(pos);
      const a = Math.random() * Math.PI * 2, sp = (0.6 + Math.random()) * power;
      m.userData.v = new THREE.Vector3(Math.cos(a) * sp, (2 + Math.random() * 2.5) * power, Math.sin(a) * sp);
      m.userData.life = 1 + Math.random() * 0.4;
      m.userData.spin = (Math.random() - 0.5) * 12;
      scene.add(m); parts.push(m);
    }
  }
  return {
    burst(pos) { emit(pos, 14, 1); },
    confetti(pos) { emit(pos, 60, 1.6); },
    hearts(pos, n = 5) {
      for (let i = 0; i < n; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTexture(), transparent: true, depthTest: false }));
        s.scale.setScalar(0.22 + Math.random() * 0.1);
        s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.2, (Math.random() - 0.5) * 0.4));
        s.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.9 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3);
        s.userData.life = 1.4 + Math.random() * 0.4; s.userData.spin = 0; s.userData.heart = true; s.userData.drift = true;
        scene.add(s); parts.push(s);
      }
    },
    raindrops(center, n = 40) {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.03), new THREE.MeshBasicMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.8 }));
        m.position.copy(center).add(new THREE.Vector3((Math.random() - 0.5) * 7, 3.5 + Math.random() * 2, (Math.random() - 0.5) * 7));
        m.userData.v = new THREE.Vector3(0, -4.5, 0); m.userData.life = 1.6; m.userData.spin = 0; m.userData.drop = true;
        scene.add(m); parts.push(m);
      }
    },
    zzz(pos) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzzTexture(), transparent: true, depthTest: false }));
      s.scale.set(0.3, 0.3, 1); s.position.copy(pos);
      s.userData.v = new THREE.Vector3(0.15, 0.45, 0); s.userData.life = 2; s.userData.spin = 0; s.userData.heart = true; s.userData.drift = true;
      scene.add(s); parts.push(s);
    },
    rain(center) { for (let i = 0; i < 80; i++) { const p = center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 2, (Math.random() - 0.5) * 6)); const m = new THREE.Mesh(geo, mats[i % mats.length]); m.position.copy(p); m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.5, -0.5, (Math.random() - 0.5) * 0.5); m.userData.life = 2.5 + Math.random(); m.userData.spin = (Math.random() - 0.5) * 8; m.userData.drift = true; scene.add(m); parts.push(m); } },
    update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const s = parts[i];
        if (!s.userData.heart && !s.userData.drop) { s.userData.v.y -= (s.userData.drift ? 0.8 : 7) * dt; if (s.userData.drift) s.userData.v.y = Math.max(s.userData.v.y, -1.2); }
        s.position.addScaledVector(s.userData.v, dt);
        s.rotation.x += dt * s.userData.spin; s.rotation.z += dt * s.userData.spin * 0.7;
        s.userData.life -= dt * (s.userData.drift ? 0.6 : 1.2);
        if (s.userData.heart) { s.material.opacity = Math.min(1, s.userData.life); s.position.x += Math.sin(s.userData.life * 8) * 0.004; }
        else if (s.userData.drop) { if (s.position.y < 0.25) s.userData.life = 0; }
        else s.scale.setScalar(Math.max(Math.min(s.userData.life, 1), 0.001));
        if (s.userData.life <= 0) { scene.remove(s); parts.splice(i, 1); }
      }
    }
  };
}
