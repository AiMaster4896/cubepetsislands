import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();

export async function preload(paths, onProgress) {
  let done = 0;
  await Promise.all(paths.map(async (p) => {
    await load(p);
    done++;
    onProgress && onProgress(done / paths.length);
  }));
}

// On hosts that can't serve .glb, models are published as JSON wrappers {"glb": "<base64>"}
// and decoded here in memory, so no data: URLs or extra fetches are needed.
function loadModel(path, onLoad, onError) {
  if (!path.endsWith('.json')) return loader.load(path, onLoad, undefined, onError);
  fetch(path).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + path); return r.json(); }).then((j) => {
    const bin = atob(j.glb);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const dir = path.slice(0, path.lastIndexOf('/') + 1);
    loader.parse(buf.buffer, dir, onLoad, onError);
  }).catch(onError);
}

export function load(path) {
  if (!cache.has(path)) {
    cache.set(path, new Promise((res, rej) => {
      loadModel(path, (gltf) => {
        const root = gltf.scene;
        root.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            if (o.material && o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
          }
        });
        res(root);
      }, rej);
    }));
  }
  return cache.get(path);
}

// Returns a fresh clone of an already-loaded model.
export function instance(path) {
  const p = cache.get(path);
  if (!p || !p._resolved) throw new Error('Model not preloaded: ' + path);
  return p._resolved.clone(true);
}

// Resolve promises into ._resolved so instance() can be synchronous.
export async function settle() {
  for (const [, p] of cache) p._resolved = await p;
}
