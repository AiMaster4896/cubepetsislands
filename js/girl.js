import * as THREE from '../vendor/three.module.min.js';

// A little girl built from boxes in the same chunky style as the Cube Pets.
// Node names match what pets.js looks for: leg-front-left/right (walk cycle), Group (head look-around).
const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 });
const box = (w, h, d, m) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.castShadow = true; me.receiveShadow = true; return me; };

export function buildAvatar(kind, opts = {}) { return kind === 'boy' ? buildBoy(opts) : buildGirl(opts); }

export function buildGirl(opts = {}) {
  const skin = mat(opts.skin || 0xf7d1b0), hair = mat(opts.hair || 0x4a2c17), dress = mat(opts.dress || 0xf06292), shoe = mat(0xe53935), dark = mat(0x222222), cheek = mat(0xff9db0), white = mat(0xffffff);
  const g = new THREE.Group();
  g.name = 'girl';

  // Legs (pivot at hip so they swing).
  for (const [name, x] of [['leg-front-left', 0.16], ['leg-front-right', -0.16]]) {
    const pivot = new THREE.Group(); pivot.name = name; pivot.position.set(x, 0.55, 0);
    const leg = box(0.2, 0.5, 0.2, skin); leg.position.y = -0.25; pivot.add(leg);
    const s = box(0.22, 0.12, 0.26, shoe); s.position.set(0, -0.5, 0.03); pivot.add(s);
    g.add(pivot);
  }
  // Dress: bodice + flared skirt.
  const skirt = box(0.78, 0.36, 0.58, dress); skirt.position.y = 0.66; g.add(skirt);
  const body = box(0.6, 0.62, 0.44, dress); body.position.y = 1.1; g.add(body);
  const collar = box(0.3, 0.08, 0.46, white); collar.position.y = 1.38; g.add(collar);
  // Arms (pivot at shoulder).
  for (const [name, x] of [['arm-left', 0.4], ['arm-right', -0.4]]) {
    const pivot = new THREE.Group(); pivot.name = name; pivot.position.set(x, 1.35, 0);
    const sleeve = box(0.18, 0.2, 0.2, dress); sleeve.position.y = -0.1; pivot.add(sleeve);
    const arm = box(0.16, 0.36, 0.16, skin); arm.position.y = -0.38; pivot.add(arm);
    g.add(pivot);
  }
  // Head group (named 'Group' so the look-around animation applies).
  const head = new THREE.Group(); head.name = 'Group'; head.position.y = 1.45;
  const face = box(0.72, 0.68, 0.7, skin); face.position.y = 0.34; head.add(face);
  const cap = box(0.78, 0.3, 0.76, hair); cap.position.set(0, 0.62, -0.02); head.add(cap);
  const back = box(0.78, 0.5, 0.2, hair); back.position.set(0, 0.25, -0.3); head.add(back);
  const fringe = box(0.78, 0.14, 0.12, hair); fringe.position.set(0, 0.6, 0.33); head.add(fringe);
  const tail = box(0.18, 0.5, 0.18, hair); tail.position.set(0, 0.2, -0.46); tail.rotation.x = 0.25; head.add(tail);
  const bow = box(0.26, 0.14, 0.1, mat(0xffd23f)); bow.position.set(0, 0.5, -0.4); head.add(bow);
  for (const x of [0.16, -0.16]) { const e = box(0.09, 0.12, 0.04, dark); e.position.set(x, 0.38, 0.36); head.add(e); const c = box(0.12, 0.07, 0.03, cheek); c.position.set(x * 1.6, 0.22, 0.36); head.add(c); }
  const smile = box(0.2, 0.05, 0.03, dark); smile.position.set(0, 0.16, 0.36); head.add(smile);
  g.add(head);
  return g;
}

// Waves one arm for ~1.2 s. Returns an animated entry.
export function makeWave(model) {
  const arm = model.getObjectByName('arm-left');
  let t = -1;
  return {
    start() { t = 0; },
    update(_, dt) {
      if (!arm) return;
      if (t < 0) { arm.rotation.z += (0 - arm.rotation.z) * Math.min(1, dt * 8); arm.rotation.x += (0 - arm.rotation.x) * Math.min(1, dt * 8); return; }
      t += dt;
      arm.rotation.z = 2.6 + Math.sin(t * 14) * 0.5;
      if (t > 1.2) t = -1;
    }
  };
}

export function buildBoy(opts = {}) {
  const skin = mat(opts.skin || 0xf7d1b0), hair = mat(opts.hair || 0x3b2314), shirt = mat(opts.shirt || 0x42a5f5), shorts = mat(0x5d4037), shoe = mat(0x1e88e5), dark = mat(0x222222), cheek = mat(0xff9db0);
  const g = new THREE.Group();
  g.name = 'boy';
  for (const [name, x] of [['leg-front-left', 0.16], ['leg-front-right', -0.16]]) {
    const pivot = new THREE.Group(); pivot.name = name; pivot.position.set(x, 0.55, 0);
    const short = box(0.24, 0.22, 0.24, shorts); short.position.y = -0.11; pivot.add(short);
    const leg = box(0.2, 0.3, 0.2, skin); leg.position.y = -0.36; pivot.add(leg);
    const s = box(0.22, 0.12, 0.26, shoe); s.position.set(0, -0.5, 0.03); pivot.add(s);
    g.add(pivot);
  }
  const body = box(0.62, 0.7, 0.44, shirt); body.position.y = 1.0; g.add(body);
  const stripe = box(0.64, 0.12, 0.46, mat(0xffffff)); stripe.position.y = 1.05; g.add(stripe);
  for (const [name, x] of [['arm-left', 0.4], ['arm-right', -0.4]]) {
    const pivot = new THREE.Group(); pivot.name = name; pivot.position.set(x, 1.3, 0);
    const sleeve = box(0.18, 0.2, 0.2, shirt); sleeve.position.y = -0.1; pivot.add(sleeve);
    const arm = box(0.16, 0.36, 0.16, skin); arm.position.y = -0.38; pivot.add(arm);
    g.add(pivot);
  }
  const head = new THREE.Group(); head.name = 'Group'; head.position.y = 1.4;
  const face = box(0.72, 0.68, 0.7, skin); face.position.y = 0.34; head.add(face);
  const cap = box(0.78, 0.26, 0.76, hair); cap.position.set(0, 0.62, -0.02); head.add(cap);
  const tuft = box(0.2, 0.16, 0.2, hair); tuft.position.set(0.15, 0.78, 0.1); head.add(tuft);
  for (const x of [0.16, -0.16]) { const e = box(0.09, 0.12, 0.04, dark); e.position.set(x, 0.38, 0.36); head.add(e); const c = box(0.12, 0.07, 0.03, cheek); c.position.set(x * 1.6, 0.22, 0.36); head.add(c); }
  const smile = box(0.2, 0.05, 0.03, dark); smile.position.set(0, 0.16, 0.36); head.add(smile);
  g.add(head);
  return g;
}

// A floating text sign (canvas sprite), e.g. "Ashley's Home".
export function makeSign(text, opts = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = opts.bg || '#ffffff'; roundRect(x, 8, 8, 496, 144, 40); x.fill();
  x.lineWidth = 10; x.strokeStyle = opts.border || '#ff7a45'; roundRect(x, 8, 8, 496, 144, 40); x.stroke();
  x.fillStyle = opts.color || '#3a5a8c'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = 64;
  do { x.font = `bold ${size}px "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif`; size -= 4; } while (x.measureText(text).width > 440 && size > 20);
  x.fillText(text, 256, 84);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(2.2, 0.69, 1);
  sp.renderOrder = 5;
  return sp;
}
function roundRect(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
