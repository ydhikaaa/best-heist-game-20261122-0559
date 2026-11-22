// Midnight Harbor — HUD, minimap, legend and menu screens.
// One file, one job: everything drawn on top of the world.
import { VIEW_W, VIEW_H, HUD_H, TILE, COLS, ROWS, COLORS, LOOT_NAMES } from './config.js';
import { guardStateLabel, guardStateColor } from './guards.js';
import { hasJade, lootTakenValue, exitOpen } from './loot.js';

export const uiButtons = []; // rebuilt every frame: {id,x,y,w,h}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.hudPanel;
  ctx.strokeStyle = COLORS.hudBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, weight, align) {
  ctx.font = `${weight || 600} ${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = color || COLORS.hudText;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

export function drawButton(ctx, id, x, y, w, h, label, accent) {
  const hover =
    window.__mouseX >= x && window.__mouseX <= x + w && window.__mouseY >= y && window.__mouseY <= y + h;
  ctx.fillStyle = hover ? 'rgba(88, 224, 255, 0.30)' : 'rgba(88, 224, 255, 0.14)';
  ctx.strokeStyle = accent ? '#58e0ff' : COLORS.hudBorder;
  ctx.lineWidth = accent ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 5, 15, '#eaf6ff', 700, 'center');
  uiButtons.push({ id, x, y, w, h });
}

export function drawTopBar(ctx, game) {
  ctx.fillStyle = '#0b1119';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = 'rgba(88, 224, 255, 0.25)';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  const lvl = game.level;
  text(ctx, `LEVEL ${game.levelIndex + 1} — ${lvl.name}`, 14, 22, 16, '#eaf6ff', 800);
  text(ctx, lvl.sub, 14, 42, 12, COLORS.hudDim, 500);
  // Timer
  const t = Math.floor(game.levelTime);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  text(ctx, `TIME ${mm}:${ss}   PAR ${Math.floor(lvl.par / 60)}:${String(lvl.par % 60).padStart(2, '0')}`, 14, 52, 11, COLORS.hudDim, 500);
  // Alarm meter — the big one, center; the number sits inside the bar so it
  // can never collide with the loot/tools block on the right.
  const ax = 440;
  const aw = 300;
  text(ctx, 'ALARM', ax, 20, 12, COLORS.hudDim, 700);
  const alarm = game.alarm;
  const col = alarm < 35 ? COLORS.alarmLow : alarm < 70 ? COLORS.alarmMid : COLORS.alarmHigh;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.roundRect(ax, 26, aw, 18, 4);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.roundRect(ax, 26, Math.max(4, (aw * alarm) / 100), 18, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(ax, 26, aw, 18, 4);
  ctx.stroke();
  text(ctx, `${Math.floor(alarm)}%`, ax + aw - 8, 40, 13, '#ffffff', 800, 'right');
  if (alarm >= 70) text(ctx, '!! SPOTTED !!', ax + aw / 2, 20, 12, COLORS.alarmHigh, 800, 'center');
  // Loot + tools, far right.
  const loot = lootTakenValue(game);
  text(ctx, `LOOT $${loot.toLocaleString()}`, 1266, 24, 16, COLORS.gold, 800, 'right');
  text(ctx, `COIN [Q] ×${game.tools.coin}   SMOKE [F] ×${game.tools.smoke}   EMP [R] ×${game.tools.emp}`, 1266, 44, 12, COLORS.hudDim, 600, 'right');
}

export function drawObjectives(ctx, game) {
  panel(ctx, 8, 64, 198, 168);
  text(ctx, 'OBJECTIVES', 20, 86, 13, '#58e0ff', 800);
  const jade = hasJade(game);
  const side = game.loot.filter((l) => l.kind !== 'jade' && l.taken).length;
  const sideTotal = game.loot.filter((l) => l.kind !== 'jade').length;
  const open = exitOpen(game);
  const rows = [
    { done: jade, label: 'Steal the Jade Manifest' },
    { done: side === sideTotal, label: `Side loot ${side}/${sideTotal}` },
    { done: false, label: open ? 'Reach the exit — OPEN' : 'Reach the exit (locked)' },
  ];
  rows.forEach((r, i) => {
    const y = 112 + i * 24;
    ctx.fillStyle = r.done ? '#58d68d' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.roundRect(20, y - 11, 13, 13, 3);
    ctx.fill();
    if (r.done) {
      ctx.strokeStyle = '#0b1119';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22.5, y - 4.5);
      ctx.lineTo(25, y - 1);
      ctx.lineTo(30, y - 8);
      ctx.stroke();
    }
    text(ctx, r.label, 40, y, 12, r.done ? '#bfe9d2' : COLORS.hudText, r.done ? 600 : 500);
  });
  text(ctx, 'CONTROLS', 20, 188, 11, COLORS.hudDim, 700);
  text(ctx, 'WASD move · Shift sprint', 20, 206, 11, COLORS.hudDim, 500);
  text(ctx, 'C sneak · E grab · Q coin', 20, 220, 11, COLORS.hudDim, 500);
  text(ctx, 'F smoke · R EMP · Esc pause', 20, 234 - 6, 11, COLORS.hudDim, 500);
}

export function drawGuardPanel(ctx, game) {
  const panelH = 52 + game.guards.length * 20 + 26 + game.cameras.length * 18;
  panel(ctx, VIEW_W - 206, 64, 198, panelH);
  text(ctx, 'GUARDS', VIEW_W - 194, 86, 13, '#58e0ff', 800);
  game.guards.forEach((g, i) => {
    const y = 110 + i * 20;
    ctx.fillStyle = guardStateColor(g);
    ctx.beginPath();
    ctx.arc(VIEW_W - 186, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, `Guard ${i + 1}`, VIEW_W - 174, y, 12, COLORS.hudText, 600);
    text(ctx, guardStateLabel(g), VIEW_W - 16, y, 12, guardStateColor(g), 700, 'right');
  });
  const camY = 110 + game.guards.length * 20 + 6;
  text(ctx, 'CAMERAS', VIEW_W - 194, camY, 13, '#58e0ff', 800);
  game.cameras.forEach((c, i) => {
    const y = camY + 20 + i * 18;
    const disabled = game.time < c.disabledUntil;
    const label = disabled ? `DARK ${Math.ceil(c.disabledUntil - game.time)}s` : c.hot ? 'SPOTTED!' : 'SWEEPING';
    const col = disabled ? COLORS.hudDim : c.hot ? '#ff5a4e' : '#9fe8c9';
    text(ctx, `Cam ${i + 1}`, VIEW_W - 174, y, 12, COLORS.hudText, 600);
    text(ctx, label, VIEW_W - 16, y, 12, col, 700, 'right');
  });
}

export function drawLegend(ctx, game) {
  panel(ctx, 8, VIEW_H - 92, 240, 84);
  text(ctx, 'LEGEND', 20, VIEW_H - 70, 11, '#58e0ff', 800);
  const items = [
    ['#39d5bd', 'You — the thief'],
    ['#ffd75e', 'Loot · Jade Manifest'],
    ['rgba(255,196,66,0.9)', 'Vision cone — stay out'],
    ['#58e0ff', 'Exit / getaway boat'],
  ];
  items.forEach(([c, label], i) => {
    const y = VIEW_H - 54 + i * 15;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(24, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, label, 36, y, 11, COLORS.hudText, 500);
  });
}

export function drawMinimap(ctx, game) {
  const mw = 200;
  const mh = 116;
  const mx = VIEW_W - mw - 8;
  const my = VIEW_H - mh - 8;
  panel(ctx, mx, my, mw, mh);
  text(ctx, 'MAP', mx + 8, my + 14, 10, '#58e0ff', 800);
  const ox = mx + 8;
  const oy = my + 20;
  const sx = (mw - 16) / COLS;
  const sy = (mh - 28) / ROWS;
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const t = game.grid[ty][tx];
      if (t === '#') ctx.fillStyle = '#5a6b80';
      else if (t === '=') ctx.fillStyle = '#6b5a35';
      else if (t === '~') ctx.fillStyle = '#1d4d6b';
      else continue;
      ctx.fillRect(ox + tx * sx, oy + ty * sy, sx + 0.5, sy + 0.5);
    }
  }
  const dot = (x, y, r, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(ox + (x / TILE) * sx, oy + (y / TILE) * sy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const l of game.loot) if (!l.taken) dot(l.x, l.y, 3, l.kind === 'jade' ? '#7dffb0' : COLORS.gold);
  for (const g of game.guards) dot(g.x, g.y, 3, g.state === 'alert' ? '#ff5a4e' : '#ffb03a');
  for (const c of game.cameras) dot(c.x, c.y, 2.5, '#7ec8ff');
  const e = game.level.exit;
  dot(e.tx * TILE + 16, e.ty * TILE + 16, 3.5, COLORS.exit);
  dot(game.player.x, game.player.y, 4, COLORS.player);
}

export function drawMessage(ctx, game) {
  if (game.messageTime <= 0) return;
  const alpha = Math.min(1, game.messageTime);
  ctx.save();
  ctx.globalAlpha = alpha;
  text(ctx, game.message, VIEW_W / 2, HUD_H + 26, 16, '#ffe9a8', 700, 'center');
  ctx.restore();
}

export function drawHud(ctx, game) {
  uiButtons.length = 0;
  drawTopBar(ctx, game);
  drawObjectives(ctx, game);
  drawGuardPanel(ctx, game);
  drawLegend(ctx, game);
  drawMinimap(ctx, game);
  drawMessage(ctx, game);
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(5, 9, 14, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function centerText(ctx, str, y, size, color, weight) {
  text(ctx, str, VIEW_W / 2, y, size, color, weight || 700, 'center');
}

export function drawTitle(ctx, game) {
  dimScreen(ctx);
  centerText(ctx, 'MIDNIGHT HARBOR', 190, 64, '#eaf6ff', 900);
  centerText(ctx, '— THE JADE MANIFEST HEIST —', 232, 24, '#ffd75e', 700);
  centerText(ctx, 'Five rooms. Five patrols. One manifest. Get in, stay unseen, get out.', 280, 17, COLORS.hudDim, 500);
  const lines = [
    ['WASD / Arrows', 'move'],
    ['Shift', 'sprint — fast, but loud and easy to spot'],
    ['C', 'sneak — slow, quiet, hard to see'],
    ['E', 'grab loot'],
    ['Q / F / R', 'coin · smoke bomb · EMP (limited)'],
    ['Watch the cones', 'yellow calm, orange suspicious, red alert'],
    ['Alarm 100%', 'the harbor locks down — you are caught'],
  ];
  lines.forEach(([k, v], i) => {
    const y = 330 + i * 28;
    text(ctx, k, VIEW_W / 2 - 190, y, 15, '#58e0ff', 700);
    text(ctx, v, VIEW_W / 2 - 60, y, 15, COLORS.hudText, 500);
  });
  drawButton(ctx, 'start', VIEW_W / 2 - 130, 570, 260, 52, 'START THE HEIST  [Enter]', true);
  centerText(ctx, 'Mouse works for menus. Headphones on — the harbor is listening.', 660, 14, COLORS.hudDim, 500);
}

export function drawBrief(ctx, game) {
  dimScreen(ctx);
  const lvl = game.level;
  centerText(ctx, `LEVEL ${game.levelIndex + 1}`, 200, 20, '#58e0ff', 800);
  centerText(ctx, lvl.name, 260, 52, '#eaf6ff', 900);
  centerText(ctx, lvl.sub, 300, 18, COLORS.hudDim, 500);
  centerText(ctx, lvl.brief, 350, 17, COLORS.hudText, 500);
  centerText(ctx, `Guards: ${game.guards.length}   Cameras: ${game.cameras.length}   Side loot: ${game.loot.length - 1}   Par: ${Math.floor(lvl.par / 60)}:${String(lvl.par % 60).padStart(2, '0')}`, 400, 15, COLORS.hudDim, 600);
  drawButton(ctx, 'begin', VIEW_W / 2 - 130, 470, 260, 52, 'BEGIN  [Enter]', true);
}

export function drawCaught(ctx, game) {
  dimScreen(ctx);
  centerText(ctx, 'CAUGHT!', 240, 72, '#ff5a4e', 900);
  centerText(ctx, game.caughtReason || 'A guard grabbed you — or the alarm hit 100%.', 300, 18, COLORS.hudText, 500);
  centerText(ctx, `Level ${game.levelIndex + 1} — ${game.level.name} · Loot kept: $${lootTakenValue(game).toLocaleString()}`, 340, 15, COLORS.hudDim, 500);
  centerText(ctx, 'The cones told you. Next time, read them first.', 380, 15, COLORS.hudDim, 500);
  drawButton(ctx, 'retry', VIEW_W / 2 - 270, 460, 250, 52, 'TRY AGAIN  [R]', true);
  drawButton(ctx, 'title', VIEW_W / 2 + 20, 460, 250, 52, 'TITLE SCREEN', false);
}

export function drawLevelClear(ctx, game) {
  dimScreen(ctx);
  centerText(ctx, 'CLEAN GETAWAY', 210, 56, '#58d68d', 900);
  centerText(ctx, `Level ${game.levelIndex + 1} — ${game.level.name} cleared`, 268, 20, COLORS.hudText, 600);
  const s = game.levelStats;
  centerText(ctx, `Time ${s.time}  ·  Loot $${s.loot.toLocaleString()}  ·  Peak alarm ${s.peakAlarm}%  ·  Side loot ${s.side}/${s.sideTotal}`, 320, 16, COLORS.hudDim, 500);
  if (game.levelIndex + 1 < 5) {
    drawButton(ctx, 'next', VIEW_W / 2 - 130, 420, 260, 52, 'NEXT LEVEL  [Enter]', true);
  } else {
    drawButton(ctx, 'finish', VIEW_W / 2 - 130, 420, 260, 52, 'SEE THE GETAWAY  [Enter]', true);
  }
}

export function drawVictory(ctx, game) {
  dimScreen(ctx);
  centerText(ctx, 'THE JADE MANIFEST IS YOURS', 210, 44, '#ffd75e', 900);
  centerText(ctx, 'Five rooms, five patrols — and the boat is already moving.', 268, 18, COLORS.hudText, 500);
  centerText(ctx, `Total loot $${game.totalLoot.toLocaleString()}  ·  Total time ${game.totalTime}  ·  Best alarm peak ${game.bestPeak}%`, 320, 16, COLORS.hudDim, 600);
  centerText(ctx, 'Somewhere behind you, Pier 7 is waking up to an empty crate.', 380, 15, COLORS.hudDim, 500);
  drawButton(ctx, 'again', VIEW_W / 2 - 130, 470, 260, 52, 'STEAL IT AGAIN  [Enter]', true);
}

export function drawPaused(ctx) {
  dimScreen(ctx);
  centerText(ctx, 'PAUSED', 360, 56, '#eaf6ff', 900);
  centerText(ctx, 'Press Esc to keep stealing', 420, 16, COLORS.hudDim, 500);
}
