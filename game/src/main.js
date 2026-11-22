// Midnight Harbor — The Jade Manifest Heist: game state, loop, menus,
// staged screenshots and the self-test. One file, one job: run the game.
import { VIEW_W, VIEW_H, TILE, PLAYER, GUARD, ALARM, TOOLS, makeRng } from './config.js';
import { LEVELS } from './levels.js';
import { HarborAudio } from './audio.js';
import { attachInput, isDown, wasPressed, consumePressed, moveVector, endFrameInput, mouse } from './input.js';
import { isSolidTile, isSolidPx, moveCircle, tileCenter, reachableTiles } from './world.js';
import { createGuard, updateGuards, guardSeesPlayer } from './guards.js';
import { createCamera, updateCameras, anyCameraHot } from './cameras.js';
import { createLoot, tryPickup, throwCoin, dropSmoke, fireEmp, updateCoins, updateSmokes, hasJade, lootTakenValue, netLootValue, exitOpen, playerAtExit } from './loot.js';
import { updateGetaway } from './getaway.js';
import { ventTiles } from './vents.js';
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
  totalSpent: 0,
  totalTime: 0,
  totalSideTaken: 0,
  totalSideTotal: 0,
  bestPeak: 0,
  toolSpend: 0, // loot spent on smoke / EMP this level
  getaway: false, // the final-level chase after the last manifest
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
  game.toolSpend = 0;
  game.getaway = false;
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
    loot: netLootValue(game), // the take: loot minus tool costs
    spent: game.toolSpend,
    peakAlarm: Math.floor(game.peakAlarm),
    side,
    sideTotal,
  };
  game.totalLoot += lootTakenValue(game);
  game.totalSpent += game.toolSpend;
  game.totalSideTaken += side;
  game.totalSideTotal += sideTotal;
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

  // Alarm: rises while seen, falls while hidden. During the getaway the
  // harbor is fully awake: the alarm climbs on its own and never falls.
  if (game.getaway) {
    updateGetaway(game, dt);
  } else {
    const anyAlert = game.guards.some((g) => g.state === 'alert');
    const camHot = anyCameraHot(game);
    if (anyAlert) game.alarm += ALARM.riseAlert * dt;
    if (camHot) game.alarm += ALARM.riseCamera * dt;
    if (!anyAlert && !camHot) game.alarm -= ALARM.decay * dt;
    game.alarm = Math.max(0, Math.min(100, game.alarm));
    game.peakAlarm = Math.max(game.peakAlarm, game.alarm);
  }
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
      game.totalSpent = 0;
      game.totalTime = 0;
      game.totalSideTaken = 0;
      game.totalSideTotal = 0;
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
  // Cover: the thief mid-crossing at the edge of a guard's cone, the camera
  // sweeping down onto the Jade Manifest, a smoke cloud and a thrown coin in
  // play, the alarm meter amber — thief, cone, camera, loot and alarm in one
  // frame, with the vent duct visible as the second route.
  cover: {
    level: 0, player: { tx: 17, ty: 10, facing: 0.5 }, alarm: 47,
    guards: [
      { id: 0, tx: 23, ty: 10, facing: Math.PI, suspicion: 55, state: 'suspicious' },
      { id: 1, tx: 28, ty: 14, facing: -2.4, suspicion: 40, state: 'suspicious' },
    ],
    lootTaken: ['cash'],
    smoke: { tx: 12, ty: 13 },
    coin: { tx: 20, ty: 12 },
  },
  warehouse: {
    level: 1, player: { tx: 19, ty: 11, facing: -0.4 }, alarm: 58,
    guards: [{ id: 1, tx: 24, ty: 11, facing: Math.PI, suspicion: 82, state: 'alert' }],
    lootTaken: ['gold'],
  },
  freighter: {
    level: 3, player: { tx: 21, ty: 12, facing: -Math.PI / 2 }, alarm: 22,
    guards: [{ id: 1, tx: 21, ty: 11, facing: Math.PI / 2, suspicion: 40, state: 'suspicious' }],
    lootTaken: [],
  },
  // Getaway: the final manifest is taken, the alarm is surging, every guard
  // is converging, and the thief is running the dashed escape line to the boat.
  getaway: {
    level: 4, player: { tx: 32, ty: 7, facing: 0.9 }, alarm: 82, getaway: true,
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
  if (s.smoke) {
    const p = tileCenter(s.smoke.tx, s.smoke.ty);
    game.smokes.push({ x: p.x, y: p.y, r: 95, t: 6 });
  }
  if (s.coin) {
    const p = tileCenter(s.coin.tx, s.coin.ty);
    game.coins.push({ x: p.x, y: p.y, t: 1, landed: true });
  }
  if (s.getaway) {
    // Stage the getaway chase itself: alarm surging, guards converging.
    game.getaway = true;
    for (const g of game.guards) {
      g.state = 'alert';
      g.suspicion = 100;
      g.lastSeen = { x: game.player.x, y: game.player.y };
    }
  }
  game.message = name === 'getaway' ? 'GETAWAY! The harbor is waking — RUN FOR THE BOAT!' : '';
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
    // Tools: coin is free, smoke and EMP are paid for out of the take.
    loadLevel(0);
    game.state = 'playing';
    const coins0 = game.tools.coin;
    throwCoin(game);
    check('coin throw spends a coin', game.tools.coin === coins0 - 1);
    check('smoke denied when broke', dropSmoke(game) === false && game.tools.smoke === 2);
    check('EMP denied when broke', fireEmp(game) === false && game.tools.emp === 2);
    const gold = game.loot.find((l) => l.kind === 'gold');
    game.player.x = gold.x;
    game.player.y = gold.y;
    check('grab side loot to fund tools', tryPickup(game) && netLootValue(game) === 800);
    dropSmoke(game);
    check('smoke bomb creates a cloud', game.smokes.length === 1);
    check('smoke costs $100 of the take', game.toolSpend === 100 && netLootValue(game) === 700);
    fireEmp(game);
    check('EMP disables cameras', game.cameras.every((c) => game.time < c.disabledUntil));
    check('EMP costs $250 of the take', game.toolSpend === 350 && netLootValue(game) === 450);
    // Vents: every vent tile is reachable, and the thief inside one is unseen.
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      const reach = reachableTiles(game.grid, LEVELS[i].player.tx, LEVELS[i].player.ty);
      const vents = ventTiles(game);
      check(`level ${i + 1} has a vent second route`, vents.length > 0, `${vents.length} vent tiles`);
      for (const [tx, ty] of vents) {
        check(`level ${i + 1} vent (${tx},${ty}) reachable`, reach.has(ty * 40 + tx));
      }
      // A thief standing in a vent cannot be seen by a guard next to it.
      const [vx, vy] = vents[0];
      const vp = tileCenter(vx, vy);
      game.player.x = vp.x;
      game.player.y = vp.y;
      const gNear = game.guards[0];
      gNear.x = vp.x + 40;
      gNear.y = vp.y;
      gNear.facing = Math.PI;
      gNear.state = 'patrol';
      check(`level ${i + 1} vent hides the thief`, guardSeesPlayer(gNear, game.player, game.grid, game.smokes) === 0);
      // Second route: wall off the main doors / gaps and the jade must stay
      // reachable — through the vents and nothing else.
      const choke = LEVELS[i].secondRouteChoke;
      if (choke) {
        const choked = game.grid.map((row) => row.slice());
        for (const [tx, ty] of choke) choked[ty][tx] = '#';
        const reach2 = reachableTiles(choked, LEVELS[i].player.tx, LEVELS[i].player.ty);
        check(
          `level ${i + 1} jade reachable with main route walled off`,
          reach2.has(LEVELS[i].jade.ty * 40 + LEVELS[i].jade.tx),
          'second route proven',
        );
      }
    }
    // Getaway: grabbing the final manifest surges the alarm, wakes every
    // guard, and the run to the boat still completes before the alarm peaks.
    loadLevel(4);
    game.state = 'playing';
    const jade5 = game.loot.find((l) => l.kind === 'jade');
    game.player.x = jade5.x;
    game.player.y = jade5.y;
    check('final jade starts the getaway', tryPickup(game) && game.getaway === true);
    check('getaway surges the alarm', game.alarm >= 25, `alarm=${Math.floor(game.alarm)}`);
    check('getaway wakes every guard', game.guards.every((g) => g.state === 'alert'));
    const exit5 = tileCenter(game.level.exit.tx, game.level.exit.ty);
    game.player.x = exit5.x;
    game.player.y = exit5.y;
    updatePlaying(1 / 60);
    check('getaway run reaches the boat', game.state === 'levelclear');
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
