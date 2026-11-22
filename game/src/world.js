// Midnight Harbor — the level grid: solidity, sight lines and reachability.
// One file, one job: every question about "can I stand / see here" goes here.
import { TILE, COLS, ROWS } from './config.js';

export function tileAt(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return grid[ty][tx];
}

export function isSolidTile(grid, tx, ty) {
  const t = tileAt(grid, tx, ty);
  return t === '#' || t === '=' || t === '~';
}

export function blocksSightTile(grid, tx, ty) {
  const t = tileAt(grid, tx, ty);
  // A vent duct is low and lidded: it blocks sight like a wall, but the
  // thief can crawl through it. That is what makes it a second route.
  return t === '#' || t === '=' || t === 'V';
}

export function isVentTile(grid, tx, ty) {
  return tileAt(grid, tx, ty) === 'V';
}

export function isSolidPx(grid, x, y) {
  return isSolidTile(grid, Math.floor(x / TILE), Math.floor(y / TILE));
}

// Circle vs solid tiles: slide along walls instead of sticking.
export function moveCircle(grid, ent, dx, dy, radius) {
  const nx = ent.x + dx;
  if (!circleHitsSolid(grid, nx, ent.y, radius)) ent.x = nx;
  const ny = ent.y + dy;
  if (!circleHitsSolid(grid, ent.x, ny, radius)) ent.y = ny;
}

export function circleHitsSolid(grid, x, y, radius) {
  const x0 = Math.floor((x - radius) / TILE);
  const x1 = Math.floor((x + radius) / TILE);
  const y0 = Math.floor((y - radius) / TILE);
  const y1 = Math.floor((y + radius) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolidTile(grid, tx, ty)) continue;
      const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const ddx = x - cx;
      const ddy = y - cy;
      if (ddx * ddx + ddy * ddy < radius * radius) return true;
    }
  }
  return false;
}

// Line of sight between two points, sampled every 6 px; smoke clouds block
// sight too, so a smoke bomb is real cover.
export function hasLineOfSight(grid, x0, y0, x1, y1, smokes) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (blocksSightTile(grid, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
    if (smokes) {
      for (const s of smokes) {
        const dx = x - s.x;
        const dy = y - s.y;
        if (dx * dx + dy * dy < s.r * s.r) return false;
      }
    }
  }
  return true;
}

// Can a viewer at (x0,y0) with facing angle and cone see the target?
export function inVisionCone(x0, y0, facing, range, halfAngle, tx, ty) {
  const dx = tx - x0;
  const dy = ty - y0;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return { seen: false, dist };
  let ang = Math.atan2(dy, dx) - facing;
  while (ang > Math.PI) ang -= Math.PI * 2;
  while (ang < -Math.PI) ang += Math.PI * 2;
  return { seen: Math.abs(ang) <= halfAngle, dist };
}

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Flood fill from the player start over walkable tiles: used by the
// self-test to prove every level's loot and exit can actually be reached.
export function reachableTiles(grid, startTx, startTy) {
  const seen = new Set();
  const key = (x, y) => y * COLS + x;
  const stack = [[startTx, startTy]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
    if (seen.has(key(x, y))) continue;
    if (isSolidTile(grid, x, y)) continue;
    seen.add(key(x, y));
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}
