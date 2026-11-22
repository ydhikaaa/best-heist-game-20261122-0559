// Midnight Harbor — loot, tools and the getaway exit.
// One file, one job: what the thief steals, what the thief throws, and
// how the thief leaves.
import { TILE, TOOLS, SMOKE_RADIUS, SMOKE_TIME, EMP_TIME, COIN_THROW, COIN_NOISE, LOOT_VALUES } from './config.js';
import { tileCenter, angleTo } from './world.js';
import { disableAllCameras } from './cameras.js';

export function createLoot(def) {
  const items = [];
  const jade = tileCenter(def.jade.tx, def.jade.ty);
  items.push({ kind: 'jade', x: jade.x, y: jade.y, taken: false, value: LOOT_VALUES.jade, pulse: 0 });
  for (const s of def.sideLoot) {
    const p = tileCenter(s.tx, s.ty);
    items.push({ kind: s.kind, x: p.x, y: p.y, taken: false, value: LOOT_VALUES[s.kind], pulse: Math.random() * 6 });
  }
  return items;
}

export function lootTakenValue(game) {
  return game.loot.filter((l) => l.taken).reduce((sum, l) => sum + l.value, 0);
}

export function hasJade(game) {
  return game.loot.some((l) => l.kind === 'jade' && l.taken);
}

// Pick up anything within reach when the player presses E.
export function tryPickup(game) {
  const p = game.player;
  for (const l of game.loot) {
    if (l.taken) continue;
    const d = Math.hypot(l.x - p.x, l.y - p.y);
    if (d < TILE * 1.1) {
      l.taken = true;
      game.pickups += 1;
      game.particles.push({ x: l.x, y: l.y, t: 0, kind: 'spark' });
      if (l.kind === 'jade') {
        game.audio.jadePickup();
        game.message = 'JADE MANIFEST SECURED — get to the exit!';
        game.messageTime = 3;
      } else {
        game.audio.pickup();
        game.message = `+ $${l.value.toLocaleString()} side loot`;
        game.messageTime = 2;
      }
      return true;
    }
  }
  return false;
}

// Throw a coin: it lands ahead, clinks, and every guard in earshot goes to
// look at it instead of at you.
export function throwCoin(game) {
  const p = game.player;
  if (game.tools.coin <= 0) {
    game.message = 'No coins left';
    game.messageTime = 1.5;
    return false;
  }
  game.tools.coin -= 1;
  const dir = p.facing;
  const cx = p.x + Math.cos(dir) * COIN_THROW;
  const cy = p.y + Math.sin(dir) * COIN_THROW;
  game.coins.push({ x: cx, y: cy, t: 0, landed: false });
  game.audio.coin();
  game.message = 'Coin thrown — guards will check the noise';
  game.messageTime = 2;
  return true;
}

export function updateCoins(game, dt) {
  for (const c of game.coins) {
    if (!c.landed) {
      c.t += dt * 3;
      if (c.t >= 1) {
        c.landed = true;
        game.audio.coinLand();
        // Distract: guards in earshot walk to the coin.
        for (const g of game.guards) {
          const d = Math.hypot(g.x - c.x, g.y - c.y);
          if (d < COIN_NOISE && g.state !== 'alert') {
            g.state = 'investigate';
            g.investigateTarget = { x: c.x, y: c.y };
            g.suspicion = Math.max(0, g.suspicion - 20);
          }
        }
      }
    }
  }
  game.coins = game.coins.filter((c) => c.t < 6);
}

// Drop a smoke bomb at the thief's feet: a cloud that blocks every cone.
export function dropSmoke(game) {
  if (game.tools.smoke <= 0) {
    game.message = 'No smoke bombs left';
    game.messageTime = 1.5;
    return false;
  }
  game.tools.smoke -= 1;
  game.smokes.push({ x: game.player.x, y: game.player.y, r: SMOKE_RADIUS, t: SMOKE_TIME });
  game.audio.smoke();
  game.message = 'Smoke out — cones cannot see through it';
  game.messageTime = 2;
  return true;
}

export function updateSmokes(game, dt) {
  for (const s of game.smokes) s.t -= dt;
  game.smokes = game.smokes.filter((s) => s.t > 0);
}

// Fire the EMP: every camera goes dark for a while.
export function fireEmp(game) {
  if (game.tools.emp <= 0) {
    game.message = 'No EMP charges left';
    game.messageTime = 1.5;
    return false;
  }
  game.tools.emp -= 1;
  disableAllCameras(game, EMP_TIME);
  game.audio.emp();
  game.message = `EMP fired — cameras dark for ${EMP_TIME}s`;
  game.messageTime = 2;
  return true;
}

// The exit only opens once the Jade Manifest is in hand.
export function exitOpen(game) {
  return hasJade(game);
}

export function playerAtExit(game) {
  const e = tileCenter(game.level.exit.tx, game.level.exit.ty);
  return Math.hypot(game.player.x - e.x, game.player.y - e.y) < TILE;
}
