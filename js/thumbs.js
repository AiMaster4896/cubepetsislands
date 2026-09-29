import * as THREE from '../vendor/three.module.min.js';
import { instance } from './assets.js';

// Renders a model into a small transparent PNG data URL for the HUD/sticker book.
let renderer, scene, camera;
const cache = new Map();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(192, 192);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.6));
  const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(2, 4, 3); scene.add(d);
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
}

export function thumbnailObject(obj, opts = {}) { if (!renderer) init(); return render(obj, opts); }

export function thumbnail(modelPath, opts = {}) {
  const key = modelPath + JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);
  if (!renderer) init();
  const url = render(instance(modelPath), opts);
  cache.set(key, url);
  return url;
}

function render(obj, opts) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  obj.position.sub(center);
  const holder = new THREE.Group();
  holder.add(obj);
  holder.rotation.y = opts.yaw ?? 0.5;
  if (opts.tint) obj.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(opts.tint); } });
  scene.add(holder);
  const r = Math.max(size.x, size.y, size.z);
  camera.position.set(0, r * 0.9, r * 2.6);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(holder);
  return url;
}
