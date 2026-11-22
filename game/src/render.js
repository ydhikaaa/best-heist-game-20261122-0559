// Midnight Harbor — canvas rendering of the world: floor, containers, water,
// lamps, vision cones and every entity. One file, one job: what you see.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, WORLD_Y, COLORS, GUARD, CAMERA, SMOKE_TIME, VENT_COLORS } from './config.js';
import { tileCenter, isVentTile } from './world.js';
import { coneColorForGuard, guardSeesPlayer } from './guards.js';
import { cameraConeColor, anyCameraHot } from './cameras.js';
import { exitOpen, hasJade } from './loot.js';
import { playerInVent } from './vents.js';

// Deterministic per-tile variation so the yard never looks like flat tiles.
function tileHash(tx, ty) {
  let h = (tx * 374761393 + ty * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) >>> 0;
  return h;
}

const CONTAINER_COLORS = ['#7a5a2e', '#5d6b7a', '#6e3f3a', '#3f5d4a', '#715a7a'];
const CONTAINER_LABELS = ['JADE', 'KAV-7', 'PIER 7', 'MV TIDE', 'HOLD 3', 'CUSTOMS', 'EXPORT', 'N-42'];

function drawFloor(ctx, game) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const t = game.grid[ty][tx];
      const x = tx * TILE;
      const y = WORLD_Y + ty * TILE;
      const h = tileHash(tx, ty);
      if (t === '~') {
        ctx.fillStyle = COLORS.water;
        ctx.fillRect(x, y, TILE, TILE);
        // animated wave lines
        ctx.strokeStyle = COLORS.waterLine;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const off = Math.sin(game.time * 1.4 + ty * 1.3 + tx * 0.6) * 3;
        ctx.moveTo(x + 3, y + 12 + off);
        ctx.lineTo(x + TILE - 3, y + 12 - off);
        ctx.moveTo(x + 5, y + 24 - off);
        ctx.lineTo(x + TILE - 5, y + 24 + off);
        ctx.stroke();
        continue;
      }
      if (t === '#') continue; // containers drawn in the wall pass
      if (t === '=') continue; // crates drawn in the wall pass
      ctx.fillStyle = (h % 2 === 0) ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (t === ':') {
        ctx.fillStyle = COLORS.walkway;
        ctx.fillRect(x, y + TILE / 2 - 2, TILE, 4);
        ctx.fillStyle = 'rgba(255, 210, 90, 0.5)';
        ctx.fillRect(x, y + TILE / 2 - 1, TILE, 2);
      } else if (h % 7 === 0) {
        // oil stains and wear marks
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(x + 10 + (h % 12), y + 14 + (h % 8), 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // faint grid seams
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE, TILE);
    }
  }
}

function drawContainers(ctx, game) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const t = game.grid[ty][tx];
      if (t !== '#' && t !== '=') continue;
      const x = tx * TILE;
      const y = WORLD_Y + ty * TILE;
      const h = tileHash(tx, ty);
      if (t === '=') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + TILE - 2, y + TILE - 2);
        ctx.moveTo(x + TILE - 2, y + 2);
        ctx.lineTo(x + 2, y + TILE - 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(x + 2, y + 2, TILE - 4, 3);
        continue;
      }
      const base = CONTAINER_COLORS[h % CONTAINER_COLORS.length];
      ctx.fillStyle = base;
      ctx.fillRect(x, y, TILE, TILE);
      // corrugation
      ctx.strokeStyle = 'rgba(0,0,0,0.30)';
      ctx.lineWidth = 1;
      for (let i = 4; i < TILE; i += 8) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + TILE);
        ctx.stroke();
      }
      // sunlit top edge, shaded bottom edge
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(x, y, TILE, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, y + TILE - 3, TILE, 3);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE, TILE);
      // stencil label on some containers
      if (h % 5 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '700 7px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(CONTAINER_LABELS[h % CONTAINER_LABELS.length], x + TILE / 2, y + TILE / 2 + 2);
      }
    }
  }
}

function drawVents(ctx, game) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      if (!isVentTile(game.grid, tx, ty)) continue;
      const x = tx * TILE;
      const y = WORLD_Y + ty * TILE;
      ctx.fillStyle = VENT_COLORS.plate;
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      // grate slats
      ctx.strokeStyle = VENT_COLORS.slat;
      ctx.lineWidth = 3;
      for (let i = 7; i < TILE; i += 7) {
        ctx.beginPath();
        ctx.moveTo(x + 3, y + i);
        ctx.lineTo(x + TILE - 3, y + i);
        ctx.stroke();
      }
      // teal rim so the second route is findable at a glance
      ctx.strokeStyle = VENT_COLORS.edge;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
      ctx.globalAlpha = 1;
    }
  }
}

// Night shroud: the world outside the lamp pools falls into shadow, so safe
// cover, danger and loot read at a glance. Drawn on an offscreen canvas and
// stamped over the floor: holes are punched at every lamp, the thief, the
// loot and the exit, so the things that matter stay lit.
let shroudCanvas = null;
function drawNightShroud(ctx, game) {
  if (!shroudCanvas) {
    shroudCanvas = document.createElement('canvas');
    shroudCanvas.width = VIEW_W;
    shroudCanvas.height = VIEW_H;
  }
  const lc = shroudCanvas.getContext('2d');
  lc.clearRect(0, 0, VIEW_W, VIEW_H);
  lc.fillStyle = 'rgba(3, 7, 13, 0.42)';
  lc.fillRect(0, WORLD_Y, VIEW_W, ROWS * TILE);
  lc.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => {
    const g = lc.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, `rgba(0, 0, 0, ${a})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    lc.fillStyle = g;
    lc.beginPath();
    lc.arc(x, y, r, 0, Math.PI * 2);
    lc.fill();
  };
  for (const [tx, ty] of game.level.lamps) {
    const p = tileCenter(tx, ty);
    hole(p.x, WORLD_Y + p.y - TILE / 2, 132, 0.96);
  }
  if (game.player) hole(game.player.x, game.player.y, 116, 0.92);
  for (const l of game.loot) {
    if (!l.taken) hole(l.x, l.y, 74, 0.88);
  }
  const e = tileCenter(game.level.exit.tx, game.level.exit.ty);
  hole(e.x, WORLD_Y + e.y - TILE / 2, 96, 0.92);
  lc.globalCompositeOperation = 'source-over';
  ctx.drawImage(shroudCanvas, 0, 0);
}

function drawLampPools(ctx, game) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [tx, ty] of game.level.lamps) {
    const p = tileCenter(tx, ty);
    const y = WORLD_Y + p.y - TILE / 2;
    const grad = ctx.createRadialGradient(p.x, y, 6, p.x, y, 86);
    grad.addColorStop(0, 'rgba(255, 196, 100, 0.30)');
    grad.addColorStop(1, 'rgba(255, 196, 100, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, y, 86, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Lamp posts themselves.
  for (const [tx, ty] of game.level.lamps) {
    const p = tileCenter(tx, ty);
    const y = WORLD_Y + p.y - TILE / 2;
    ctx.fillStyle = '#1c2530';
    ctx.fillRect(p.x - 2, y - 2, 4, 4);
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.arc(p.x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCone(ctx, x, y, facing, range, halfAngle, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fill();
  // Hard edge so the cone's reach reads at a glance, even in shadow.
  ctx.strokeStyle = 'rgba(255,255,255,0.38)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(facing - halfAngle) * range, y + Math.sin(facing - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(facing + halfAngle) * range, y + Math.sin(facing + halfAngle) * range);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.stroke();
}

function drawCones(ctx, game) {
  for (const g of game.guards) {
    drawCone(ctx, g.x, g.y, g.facing, GUARD.visionRange, GUARD.visionHalfAngle, coneColorForGuard(g));
  }
  for (const cam of game.cameras) {
    const disabled = game.time < cam.disabledUntil;
    if (disabled) continue;
    drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, cameraConeColor(cam, game));
  }
}

function drawLoot(ctx, game) {
  for (const l of game.loot) {
    if (l.taken) continue;
    const pulse = 0.5 + 0.5 * Math.sin(game.time * 3 + l.pulse);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, 34);
    const col = l.kind === 'jade' ? '125, 255, 176' : '255, 215, 94';
    grad.addColorStop(0, `rgba(${col}, ${0.35 + pulse * 0.2})`);
    grad.addColorStop(1, `rgba(${col}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Glint: a four-point sparkle that flashes above the loot so the target
    // is obvious at a glance, even shrunk to a contact sheet.
    const tw = Math.sin(game.time * 3.2 + l.pulse * 2.4);
    if (tw > 0.45) {
      const s = 5 + tw * 5;
      const gx = l.x + 10;
      const gy = l.y - 14;
      ctx.save();
      ctx.globalAlpha = tw;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(gx - s, gy);
      ctx.lineTo(gx + s, gy);
      ctx.moveTo(gx, gy - s);
      ctx.lineTo(gx, gy + s);
      ctx.stroke();
      ctx.restore();
    }
    if (l.kind === 'jade') {
      ctx.fillStyle = '#2c6b4a';
      ctx.strokeStyle = '#7dffb0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(l.x - 13, l.y - 11, 26, 22, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7dffb0';
      ctx.font = '800 8px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JADE', l.x, l.y - 1);
      ctx.fillText('★', l.x, l.y + 9);
    } else if (l.kind === 'gold') {
      ctx.fillStyle = '#c9a227';
      ctx.strokeStyle = '#ffd75e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(l.x - 11, l.y - 7, 22, 14, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(l.x - 7, l.y - 3, 14, 2);
    } else if (l.kind === 'cash') {
      ctx.fillStyle = '#1f7a4d';
      ctx.strokeStyle = '#58d68d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(l.x - 11, l.y - 6, 22, 12, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#bfe9d2';
      ctx.font = '800 9px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', l.x, l.y + 3);
    } else {
      ctx.fillStyle = '#5a3d7a';
      ctx.strokeStyle = '#c9a2ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(l.x - 10, l.y - 12, 20, 24, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8d5ff';
      ctx.beginPath();
      ctx.arc(l.x, l.y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(l.x - 5, l.y + 4, 10, 2);
    }
  }
}

function drawExit(ctx, game) {
  const e = tileCenter(game.level.exit.tx, game.level.exit.ty);
  const y = WORLD_Y + e.y - TILE / 2;
  const open = exitOpen(game);
  // Escape line: once the manifest is in hand, a dashed cyan thread shows
  // the way from the thief to the boat — the getaway route, at a glance.
  if (open && game.player) {
    ctx.save();
    ctx.strokeStyle = 'rgba(88, 224, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(game.player.x, game.player.y);
    ctx.lineTo(e.x, y);
    ctx.stroke();
    ctx.restore();
  }
  const pulse = open ? 0.6 + 0.4 * Math.sin(game.time * 4) : 0.25;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(e.x, y, 4, e.x, y, 44);
  grad.addColorStop(0, `rgba(88, 224, 255, ${0.4 * pulse + 0.15})`);
  grad.addColorStop(1, 'rgba(88, 224, 255, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(e.x, y, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = open ? '#0e4a5e' : '#233240';
  ctx.strokeStyle = open ? '#58e0ff' : '#5a6b80';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(e.x - 14, y - 14, 28, 28, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = open ? '#58e0ff' : '#8fa3b8';
  ctx.font = '800 9px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCK', e.x, y + 3);
  if (open) {
    ctx.fillStyle = '#58e0ff';
    ctx.beginPath();
    ctx.moveTo(e.x - 5, y - 22);
    ctx.lineTo(e.x + 5, y - 22);
    ctx.lineTo(e.x, y - 16);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCoins(ctx, game) {
  for (const c of game.coins) {
    ctx.fillStyle = '#ffd75e';
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!c.landed) {
      ctx.strokeStyle = 'rgba(255, 215, 94, 0.5)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5 + c.t * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawSmokes(ctx, game) {
  for (const s of game.smokes) {
    const alpha = Math.min(0.55, (s.t / SMOKE_TIME) * 0.55 + 0.2);
    ctx.fillStyle = `rgba(205, 210, 220, ${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(235, 240, 248, ${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(s.x - 22, s.y + 10, s.r * 0.55, 0, Math.PI * 2);
    ctx.arc(s.x + 24, s.y - 12, s.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  if (p.hidden) return;
  // Spotted ring: while any guard or camera sees the thief, a pulsing red
  // ring says so — the caught moment must never feel unfair or invisible.
  const seenByGuard = game.guards.some((g) => guardSeesPlayer(g, p, game.grid, game.smokes) > 0);
  const seenByCamera = anyCameraHot(game);
  if (seenByGuard || seenByCamera) {
    const pulse = 0.5 + 0.5 * Math.sin(game.time * 8);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 70, 60, ${0.45 + pulse * 0.4})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 21 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // In a vent the thief is a dim outline under the grate, not a bright dot.
  if (playerInVent(game)) {
    ctx.save();
    ctx.globalAlpha = 0.55;
  }
  // soft shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(p.x + 2, p.y + 4, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // sneak ring
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(57, 213, 189, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // hooded thief: dark cloak, teal rim, facing wedge
  ctx.fillStyle = '#12242b';
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.facing) * 12, p.y + Math.sin(p.facing) * 12);
  ctx.lineTo(p.x + Math.cos(p.facing + 2.5) * 7, p.y + Math.sin(p.facing + 2.5) * 7);
  ctx.lineTo(p.x + Math.cos(p.facing - 2.5) * 7, p.y + Math.sin(p.facing - 2.5) * 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.facing) * 3, p.y + Math.sin(p.facing) * 3, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (p.sprinting) {
    ctx.strokeStyle = 'rgba(57, 213, 189, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(p.facing) * 12, p.y - Math.sin(p.facing) * 12);
    ctx.lineTo(p.x - Math.cos(p.facing) * 24, p.y - Math.sin(p.facing) * 24);
    ctx.stroke();
  }
  if (playerInVent(game)) ctx.restore(); // close the dimmed-in-vent save
}

function drawGuards(ctx, game) {
  for (const g of game.guards) {
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(g.x + 2, g.y + 4, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // body: navy uniform, cap brim toward facing
    ctx.fillStyle = COLORS.guardDark;
    ctx.strokeStyle = COLORS.guard;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#dfe9f5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.facing) * 8, g.y + Math.sin(g.facing) * 8);
    ctx.lineTo(g.x + Math.cos(g.facing) * 14, g.y + Math.sin(g.facing) * 14);
    ctx.stroke();
    // suspicion arc above the guard
    if (g.suspicion > 5) {
      const frac = g.suspicion / 100;
      ctx.strokeStyle = g.suspicion >= 75 ? '#ff5a4e' : '#ffd75e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 17, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }
    // state mark
    if (g.state === 'alert') {
      ctx.fillStyle = '#ff5a4e';
      ctx.font = '900 16px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 20);
    } else if (g.state === 'suspicious' || g.state === 'search' || g.state === 'investigate') {
      ctx.fillStyle = '#ffd75e';
      ctx.font = '900 15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 20);
    }
  }
}

function drawCameras(ctx, game) {
  for (const cam of game.cameras) {
    const disabled = game.time < cam.disabledUntil;
    ctx.fillStyle = disabled ? '#3a4756' : '#22303f';
    ctx.strokeStyle = disabled ? '#5a6b80' : cam.hot ? '#ff5a4e' : '#7ec8ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = disabled ? '#5a6b80' : cam.hot ? '#ff5a4e' : '#7ec8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.lineTo(cam.x + Math.cos(cam.angle) * 12, cam.y + Math.sin(cam.angle) * 12);
    ctx.stroke();
    if (cam.hot) {
      ctx.fillStyle = '#ff5a4e';
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    const a = Math.max(0, 1 - p.t / 0.8);
    ctx.fillStyle = `rgba(255, 215, 94, ${a})`;
    ctx.beginPath();
    ctx.arc(p.x + Math.sin(p.t * 20) * 6, p.y - p.t * 30, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawWorld(ctx, game) {
  ctx.fillStyle = '#141a22';
  ctx.fillRect(0, WORLD_Y, VIEW_W, ROWS * TILE);
  drawFloor(ctx, game);
  drawContainers(ctx, game);
  drawVents(ctx, game);
  drawNightShroud(ctx, game);
  drawLampPools(ctx, game);
  drawCones(ctx, game);
  drawLoot(ctx, game);
  drawExit(ctx, game);
  drawCoins(ctx, game);
  drawGuards(ctx, game);
  drawCameras(ctx, game);
  drawPlayer(ctx, game);
  drawSmokes(ctx, game);
  drawParticles(ctx, game);
  // vignette: night closes in at the edges
  const vg = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, WORLD_Y, VIEW_W, ROWS * TILE);
}
