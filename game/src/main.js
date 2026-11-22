// Midnight Harbor — The Jade Manifest Heist: game state, loop, menus,
// staged screenshots and the self-test. One file, one job: run the game.
import { VIEW_W, VIEW_H, TILE, PLAYER, GUARD, ALARM, TOOLS, makeRng } from './config.js';
import { LEVELS } from './levels.js';
import { HarborAudio } from './audio.js';
import { attachInput, isDown, wasPressed, consumePressed, moveVector, endFrameInput, mouse } from './input.js';
import { isSolidTile, isSolidPx, moveCircle, tileCenter, reachableTiles } from './world.js';
import { createGuard, updateGuards } from './guards.js';
import { createCamera, updateCameras, anyCameraHot } from './cameras.js';
import { createLoot, tryPickup, throwCoin, dropSmoke, fireEmp, updateCoins, updateSmokes, hasJade, lootTakenValue, exitOpen, playerAtExit } from './loot.js';
import { drawWorld } from './render.js';
import { drawHud, drawTitle, drawBrief, drawCaught, drawLevelClear, drawVictory, drawPaused, uiButtons } from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
attachInput(canvas);

const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot');
const SELFTEST = params.get('selftest') === '1';

const game = {
  state: 'title', // title | brief | playing | caught | levelclear | victory | paused | shot
  levelIndex: 0,
  level: null,
  grid: null,
  player: null,
  guards: [],
  cameras: [],
  loot: [],
  tools: { ...TOOLS },
  coins: [],
  smokes: [],
  particles: [],
  alarm: 0,
  peakAlarm: 0,
  time: 0,
  levelTime: 0,
  message: '',
  messageTime: 0,
  pickups: 0,
  caughtReason: '',
  levelStats: null,
  totalLoot: 0,
  totalTime: 0,
  bestPeak: 0,
  audio: new HarborAudio(),
  muted: false,
  pausedFrom: null,
  stepAcc: 0,
  onGuardAlert(g) {
    // first sighting sting is played by the guard module; nothing else here
  },
  onCaught(g) {
    if (game.state !== 'playing') return;
    game.state = 'caught';
    game.caughtReason = g
      ? `Guard ${g.id + 1} grabbed you at close range while the alarm was hot.`
      : 'The alarm hit 100% — the harbor locked down.';
    game.audio.caught();
    game.audio.setAlarmLevel(0);
  },
};

window.__game = game;

function loadLevel(index) {
  const def = LEVELS[index];
  game.levelIndex = index;
  game.level = def;
  game.grid = def.grid.map((row) => row.split(''));
  const p = tileCenter(def.player.tx, def.player.ty);
  game.player = {
    x: p.x,
    y: p.y,
    facing: -Math.PI / 2,
    sneaking: false,
    sprinting: false,
    hidden: false,
    stepTimer: 0,
  };
  game.guards = def.guards.map((d, i) => createGuard(d, i));
  game.cameras = def.cameras.map((d, i) => createCamera(d, i));
  game.loot = createLoot(def);
  game.tools = { ...def.tools };
  game.coins = [];
  game.smokes = [];
  game.particles = [];
  game.alarm = 0;
  game.peakAlarm = 0;
  game.levelTime = 0;
  game.message = '';
  game.messageTime = 0;
  game.pickups = 0;
  game.caughtReason = '';
}

function fmtTime(sec) {
  const t = Math.floor(sec);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function completeLevel() {
  const side = game.loot.filter((l) => l.kind !== 'jade' && l.taken).length;
  const sideTotal = game.loot.filter((l) => l.kind !== 'jade').length;
  game.levelStats = {
    time: fmtTime(game.levelTime),
    loot: lootTakenValue(game),
    peakAlarm: Math.floor(game.peakAlarm),
    side,
    sideTotal,
  };
  game.totalLoot += lootTakenValue(game);
  game.totalTime += game.levelTime;
  game.bestPeak = Math.max(game.bestPeak, Math.floor(game.peakAlarm));
  try {
    const best = JSON.parse(localStorage.getItem('midnight-harbor-best') || '{}');
    if (!best.totalLoot || game.totalLoot > best.totalLoot) {
      best.totalLoot = game.totalLoot;
      localStorage.setItem('midnight-harbor-best', JSON.stringify(best));
    }
  } catch (err) {
    /* storage is a bonus, never a breaker */
  }
  game.audio.levelClear();
  game.audio.setAlarmLevel(0);
  game.state = 'levelclear';
}

function updatePlaying(dt) {
  const p = game.player;
  game.time += dt;
  game.levelTime += dt;

  // Movement: sneak / walk / sprint.
  const mv = moveVector();
  p.sneaking = isDown('KeyC');
  p.sprinting = (isDown('ShiftLeft') || isDown('ShiftRight')) && !p.sneaking && (mv.x !== 0 || mv.y !== 0);
  const speed = p.sneaking ? PLAYER.sneak : p.sprinting ? PLAYER.sprint : PLAYER.walk;
  if (mv.x !== 0 || mv.y !== 0) {
    p.facing = Math.atan2(mv.y, mv.x);
    moveCircle(game.grid, p, mv.x * speed * dt, mv.y * speed * dt, PLAYER.radius);
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      game.audio.footstep(p.sprinting);
      p.stepTimer = p.sprinting ? 0.26 : p.sneaking ? 0.55 : 0.38;
    }
  }

  // Tools.
  if (consumePressed('KeyQ')) throwCoin(game);
  if (consumePressed('KeyF')) dropSmoke(game);
  if (consumePressed('KeyR')) fireEmp(game);
  if (consumePressed('KeyE')) tryPickup(game);
  if (consumePressed('KeyM')) {
    game.muted = !game.muted;
    if (game.audio.master) game.audio.master.gain.value = game.muted ? 0 : 0.5;
  }
  if (consumePressed('Escape')) {
    game.pausedFrom = 'playing';
    game.state = 'paused';
    return;
  }

  updateCoins(game, dt);
  updateSmokes(game, dt);
  updateGuards(game, dt);
  updateCameras(game, dt);

  // Alarm: rises while seen, falls while hidden.
  const anyAlert = game.guards.some((g) => g.state === 'alert');
  const camHot = anyCameraHot(game);
  if (anyAlert) game.alarm += ALARM.riseAlert * dt;
  if (camHot) game.alarm += ALARM.riseCamera * dt;
  if (!anyAlert && !camHot) game.alarm -= ALARM.decay * dt;
  game.alarm = Math.max(0, Math.min(100, game.alarm));
  game.peakAlarm = Math.max(game.peakAlarm, game.alarm);
  game.audio.setAlarmLevel(game.alarm);
  if (game.alarm >= ALARM.caughtAt) {
    game.onCaught(null);
    return;
  }

  // Particles.
  for (const pt of game.particles) pt.t += dt;
  game.particles = game.particles.filter((pt) => pt.t < 0.8);

  if (game.messageTime > 0) game.messageTime -= dt;

  // Exit: only open with the Jade Manifest in hand.
  if (exitOpen(game) && playerAtExit(game)) completeLevel();
}

function clickedButton(id) {
  if (!mouse.clicked) return false;
  return uiButtons.some((b) => b.id === id && mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h);
}

function updateMenus() {
  if (game.state === 'title') {
    if (consumePressed('Enter') || consumePressed('Space') || clickedButton('start')) {
      game.audio.ensure();
      game.audio.startAmbient();
      loadLevel(0);
      game.state = 'brief';
    }
  } else if (game.state === 'brief') {
    if (consumePressed('Enter') || consumePressed('Space') || clickedButton('begin')) {
      game.state = 'playing';
    }
  } else if (game.state === 'caught') {
    if (consumePressed('KeyR') || clickedButton('retry')) {
      loadLevel(game.levelIndex);
      game.state = 'brief';
    } else if (clickedButton('title')) {
      game.state = 'title';
    }
  } else if (game.state === 'levelclear') {
    if (consumePressed('Enter') || clickedButton('next') || clickedButton('finish')) {
      if (game.levelIndex + 1 < LEVELS.length) {
        loadLevel(game.levelIndex + 1);
        game.state = 'brief';
      } else {
        game.state = 'victory';
        game.audio.victory();
      }
    }
  } else if (game.state === 'victory') {
    if (consumePressed('Enter') || clickedButton('again')) {
      game.totalLoot = 0;
      game.totalTime = 0;
      game.bestPeak = 0;
      loadLevel(0);
      game.state = 'brief';
    }
  } else if (game.state === 'paused') {
    if (consumePressed('Escape') || consumePressed('Enter')) game.state = game.pausedFrom || 'playing';
  }
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#0b1119';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (game.state === 'title') {
    // Title shows the yard behind the menu so the first paint is already a game.
    if (!game.level) loadLevel(0);
    drawWorld(ctx, game);
    drawHud(ctx, game);
    drawTitle(ctx, game);
    return;
  }
  drawWorld(ctx, game);
  drawHud(ctx, game);
  if (game.state === 'brief') drawBrief(ctx, game);
  else if (game.state === 'caught') drawCaught(ctx, game);
  else if (game.state === 'levelclear') drawLevelClear(ctx, game);
  else if (game.state === 'victory') drawVictory(ctx, game);
  else if (game.state === 'paused') drawPaused(ctx);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  window.__mouseX = mouse.x;
  window.__mouseY = mouse.y;
  if (game.state === 'playing') updatePlaying(dt);
  else if (game.state !== 'shot') updateMenus();
  render();
  endFrameInput();
  requestAnimationFrame(loop);
}

// ---- Staged screenshots: ?shot=cover|warehouse|freighter|getaway ----
// Each shot places the thief mid-heist with cones, a camera, the loot and
// the alarm meter all in one frame, then freezes the frame.
const SHOTS = {
  cover: {
    level: 0, player: { tx: 16, ty: 10, facing: 0.6 }, alarm: 34,
    guards: [{ id: 0, tx: 24, ty: 10, facing: Math.PI, suspicion: 55, state: 'suspicious' }],
    lootTaken: ['cash'],
  },
  warehouse: {
    level: 1, player: { tx: 19, ty: 11, facing: -0.4 }, alarm: 58,
    guards: [{ id: 1, tx: 24, ty: 11, facing: Math.PI, suspicion: 82, state: 'alert' }],
    lootTaken: ['gold'],
  },
  freighter: {
    level: 3, player: { tx: 21, ty: 12, facing: -Math.PI / 2 }, alarm: 22,
    guards: [{ id: 1, tx: 21, ty: 8, facing: Math.PI / 2, suspicion: 40, state: 'suspicious' }],
    lootTaken: [],
  },
  getaway: {
    level: 4, player: { tx: 30, ty: 5, facing: 0.9 }, alarm: 71,
    guards: [{ id: 3, tx: 33, ty: 13, facing: -Math.PI / 2, suspicion: 88, state: 'alert' }],
    lootTaken: ['jade', 'gold', 'art'],
  },
};

function applyShot(name) {
  const s = SHOTS[name] || SHOTS.cover;
  loadLevel(s.level);
  const p = tileCenter(s.player.tx, s.player.ty);
  game.player.x = p.x;
  game.player.y = p.y;
  game.player.facing = s.player.facing;
  game.alarm = s.alarm;
  game.peakAlarm = s.alarm;
  game.levelTime = 87 + s.level * 23;
  for (const ov of s.guards || []) {
    const g = game.guards[ov.id];
    if (!g) continue;
    const gp = tileCenter(ov.tx, ov.ty);
    g.x = gp.x;
    g.y = gp.y;
    g.facing = ov.facing;
    g.suspicion = ov.suspicion;
    g.state = ov.state;
    g.lastSeen = { x: game.player.x, y: game.player.y };
  }
  for (const kind of s.lootTaken || []) {
    const item = game.loot.find((l) => l.kind === kind && !l.taken);
    if (item) item.taken = true;
  }
  game.message = name === 'getaway' ? 'JADE MANIFEST SECURED — run for the boat!' : '';
  game.messageTime = name === 'getaway' ? 99 : 0;
  game.state = 'shot';
}

// ---- Self-test: ?selftest=1 runs the gates headlessly and reports. ----
function runSelfTest() {
  const results = [];
  const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail || '' });
  try {
    LEVELS.forEach((def, i) => {
      const grid = def.grid.map((r) => r.split(''));
      const badRows = def.grid.filter((r) => r.length !== 40).length;
      check(`level ${i + 1} rows are 40 wide`, badRows === 0, `${def.grid.length} rows`);
      const reach = reachableTiles(grid, def.player.tx, def.player.ty);
      const key = (tx, ty) => ty * 40 + tx;
      check(`level ${i + 1} jade reachable`, reach.has(key(def.jade.tx, def.jade.ty)));
      check(`level ${i + 1} exit reachable`, reach.has(key(def.exit.tx, def.exit.ty)));
      for (const s of def.sideLoot) {
        check(`level ${i + 1} side loot ${s.kind} reachable`, reach.has(key(s.tx, s.ty)));
      }
      for (const g of def.guards) {
        for (const [tx, ty] of g.waypoints) {
          check(`level ${i + 1} guard waypoint (${tx},${ty}) walkable`, !isSolidTile(grid, tx, ty));
        }
        // Every patrol leg must be a straight clear run, or a guard stalls.
        const wps = g.waypoints;
        for (let w = 0; w < wps.length; w++) {
          const a = tileCenter(wps[w][0], wps[w][1]);
          const b = tileCenter(wps[(w + 1) % wps.length][0], wps[(w + 1) % wps.length][1]);
          const dist = Math.hypot(b.x - a.x, b.y - a.y);
          const steps = Math.max(1, Math.ceil(dist / 8));
          let clear = true;
          for (let s = 1; s < steps; s++) {
            const x = a.x + ((b.x - a.x) * s) / steps;
            const y = a.y + ((b.y - a.y) * s) / steps;
            if (isSolidPx(grid, x, y)) { clear = false; break; }
          }
          check(`level ${i + 1} patrol leg ${w} clear`, clear);
        }
      }
      for (const c of def.cameras) {
        check(`level ${i + 1} camera (${c.tx},${c.ty}) walkable`, !isSolidTile(grid, c.tx, c.ty));
      }
    });
    // Play a level: grab the jade, reach the exit, win.
    loadLevel(0);
    game.state = 'playing';
    const jade = game.loot.find((l) => l.kind === 'jade');
    game.player.x = jade.x;
    game.player.y = jade.y;
    check('pickup grabs the jade', tryPickup(game) && hasJade(game));
    check('exit opens with jade', exitOpen(game));
    const e = tileCenter(game.level.exit.tx, game.level.exit.ty);
    game.player.x = e.x;
    game.player.y = e.y;
    updatePlaying(1 / 60);
    check('reaching exit completes level 1', game.state === 'levelclear');
    // Lose path: stand in a guard's cone in open floor until caught.
    loadLevel(0);
    game.state = 'playing';
    const g0 = game.guards[0];
    // Pin the guard in the open walkway lane (tile 20,10), facing east,
    // and keep the thief 40 px ahead of it with clear line of sight.
    const pin = tileCenter(20, 10);
    g0.x = pin.x;
    g0.y = pin.y;
    g0.facing = 0;
    g0.waypoints = [pin, pin];
    g0.wpIndex = 0;
    game.player.sprinting = false;
    game.player.sneaking = false;
    let caught = false;
    for (let i = 0; i < 60 * 20 && !caught; i++) {
      g0.x = pin.x;
      g0.y = pin.y;
      g0.facing = 0;
      game.player.x = g0.x + 40;
      game.player.y = g0.y;
      updatePlaying(1 / 60);
      if (game.state === 'caught') caught = true;
    }
    check('standing in a cone gets you caught', caught, `alarm=${Math.floor(game.alarm)} state=${game.state}`);
    // Tools.
    loadLevel(0);
    game.state = 'playing';
    const coins0 = game.tools.coin;
    throwCoin(game);
    check('coin throw spends a coin', game.tools.coin === coins0 - 1);
    dropSmoke(game);
    check('smoke bomb creates a cloud', game.smokes.length === 1);
    fireEmp(game);
    check('EMP disables cameras', game.cameras.every((c) => game.time < c.disabledUntil));
    // All five levels load.
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      check(`level ${i + 1} loads (${LEVELS[i].name})`, game.guards.length > 0 && game.cameras.length > 0);
    }
    // Staged shots render.
    for (const name of Object.keys(SHOTS)) {
      applyShot(name);
      render();
      check(`shot ${name} renders`, true);
    }
  } catch (err) {
    check('self-test threw', false, String(err && err.message || err));
  }
  const failed = results.filter((r) => !r.ok);
  window.__selftest = { pass: failed.length === 0, results };
  document.title = failed.length === 0 ? 'SELFTEST PASS' : `SELFTEST FAIL (${failed.length})`;
  const pre = document.createElement('pre');
  pre.id = 'selftest';
  pre.textContent = JSON.stringify(window.__selftest, null, 2);
  document.body.appendChild(pre);
  // eslint-disable-next-line no-console
  console.log('[selftest]', document.title);
  for (const r of results) console.log('[selftest]', r.ok ? 'PASS' : 'FAIL', r.name, r.detail);
}

if (SELFTEST) {
  loadLevel(0);
  runSelfTest();
} else if (SHOT) {
  applyShot(SHOT);
  // Render one frozen frame immediately; the loop keeps repainting it.
  render();
  requestAnimationFrame(loop);
} else {
  loadLevel(0);
  requestAnimationFrame(loop);
}
