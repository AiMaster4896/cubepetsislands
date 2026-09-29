// Pointy-top hex grid. Kenney hex tiles are 1.0 wide (x) and 1.155 deep (z).
export const TILE_W = 1.0;
export const TILE_TOP = 0.2; // height of a flat grass/water tile surface

export function hexToWorld(q, r) {
  return { x: TILE_W * (q + r / 2), z: 0.866 * TILE_W * r };
}

export function hexDistance(q, r) {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
}

export function hexRing(radius) {
  const out = [];
  for (let q = -radius; q <= radius; q++)
    for (let r = -radius; r <= radius; r++)
      if (hexDistance(q, r) === radius) out.push([q, r]);
  return out;
}

export function hexArea(radius) {
  const out = [];
  for (let q = -radius; q <= radius; q++)
    for (let r = -radius; r <= radius; r++)
      if (hexDistance(q, r) <= radius) out.push([q, r]);
  return out;
}

export function worldToHex(x, z) {
  const r = z / (0.866 * TILE_W);
  const q = x / TILE_W - r / 2;
  return hexRound(q, r);
}
function hexRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  return [rq, rr];
}
export const HEX_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
