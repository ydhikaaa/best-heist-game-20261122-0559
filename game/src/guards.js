// Midnight Harbor — guard AI: patrol, suspicion, alert, chase, search.
// One file, one job: everything a guard does, including its vision cone.
import { TILE, GUARD, COLORS } from './config.js';
import {
  moveCircle,
  hasLineOfSight,
  inVisionCone,
  tileCenter,
  angleTo,
  angleDiff,
} from './world.js';

export function createGuard(def, index) {
  const start = tileCenter(def.tx, def.ty);
  const waypoints = def.waypoints.map(([tx, ty]) => tileCenter(tx, ty));
  return {
    id: index,
    x: start.x,
    y: start.y,
    facing: 0,
    state: 'patrol', // patrol | suspicious | alert | search | investigate
    suspicion: 0,
    wpIndex: 0,
    waypoints,
    lastSeen: null,
    lastSeenTime: 0,
    chaseTime: 0,
    searchTime: 0,
    investigateTarget: null,
    grabTime: 0,
    patrolPause: 0,
    stepPhase: Math.random() * Math.PI * 2,
  };
}

export function guardStateLabel(g) {
  if (g.state === 'alert') return 'ALERT';
  if (g.state === 'search') return 'SEARCHING';
  if (g.state === 'investigate') return 'CHECKING';
  if (g.state === 'suspicious') return 'SUSPICIOUS';
  return 'PATROL';
}

export function guardStateColor(g) {
  if (g.state === 'alert') return '#ff5a4e';
  if (g.state === 'search' || g.state === 'investigate') return '#ffb03a';
  if (g.state === 'suspicious') return '#ffd75e';
  return '#9fe8c9';
}

// Does this guard currently see the thief? Returns 0..1 visibility strength.
export function guardSeesPlayer(g, player, grid, smokes) {
  if (player.hidden) return 0;
  const view = inVisionCone(g.x, g.y, g.facing, GUARD.visionRange, GUARD.visionHalfAngle, player.x, player.y);
  if (!view.seen) return 0;
  if (!hasLineOfSight(grid, g.x, g.y, player.x, player.y, smokes)) return 0;
  // Closer and sprinting = easier to spot; sneaking far away = barely.
  const closeness = 1 - view.dist / GUARD.visionRange;
  let strength = 0.45 + closeness * 0.55;
  if (player.sprinting) strength *= 1.4;
  if (player.sneaking) strength *= 0.5;
  return Math.min(1.35, strength);
}

function stepToward(g, grid, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const vx = (dx / dist) * speed * dt;
  const vy = (dy / dist) * speed * dt;
  g.facing = angleTo(g.x, g.y, tx, ty);
  moveCircle(grid, g, vx, vy, GUARD.radius);
  return dist < speed * dt + 2;
}

export function updateGuard(g, dt, game) {
  const { grid, player, smokes, time } = game;
  const vis = guardSeesPlayer(g, player, grid, smokes);

  // Suspicion rises while seen, falls while hidden — the fair-caught rule:
  // a guard must build suspicion before it chases, and it loses you.
  if (vis > 0) {
    const rate = vis < 0.5 ? GUARD.suspicionBase : GUARD.suspicionClose;
    g.suspicion += rate * vis * dt;
    g.lastSeen = { x: player.x, y: player.y };
    g.lastSeenTime = time;
  } else {
    g.suspicion -= GUARD.suspicionDecay * dt;
  }
  g.suspicion = Math.max(0, Math.min(100, g.suspicion));

  const wasAlert = g.state === 'alert';
  if (g.suspicion >= 75) {
    if (g.state !== 'alert') game.onGuardAlert(g);
    g.state = 'alert';
    g.chaseTime = GUARD.chaseMemory;
  } else if (g.suspicion >= 30 && g.state === 'patrol') {
    g.state = 'suspicious';
  } else if (g.suspicion < 15 && (g.state === 'suspicious' || g.state === 'search')) {
    g.state = 'patrol';
  }

  switch (g.state) {
    case 'patrol': {
      if (g.patrolPause > 0) {
        g.patrolPause -= dt;
        break;
      }
      const wp = g.waypoints[g.wpIndex];
      if (stepToward(g, grid, wp.x, wp.y, GUARD.patrol, dt)) {
        g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
        g.patrolPause = 0.6; // glance around at each waypoint
      }
      break;
    }
    case 'suspicious': {
      // Turn toward the last glimpse, creep closer, but do not chase yet.
      if (g.lastSeen) {
        const target = g.lastSeen;
        const d = Math.hypot(target.x - g.x, target.y - g.y);
        if (d > 90) stepToward(g, grid, target.x, target.y, GUARD.patrol * 1.2, dt);
        else g.facing += angleDiff(angleTo(g.x, g.y, target.x, target.y), g.facing) * Math.min(1, dt * 6);
      }
      break;
    }
    case 'alert': {
      if (vis > 0) {
        g.chaseTime = GUARD.chaseMemory;
        stepToward(g, grid, player.x, player.y, GUARD.chase, dt);
      } else {
        g.chaseTime -= dt;
        if (g.lastSeen) stepToward(g, grid, g.lastSeen.x, g.lastSeen.y, GUARD.chase, dt);
        if (g.chaseTime <= 0) {
          g.state = 'search';
          g.searchTime = GUARD.searchTime;
        }
      }
      // The grab: an alert guard must hold contact briefly — a fair catch.
      const d = Math.hypot(player.x - g.x, player.y - g.y);
      if (d < GUARD.grabRange) {
        g.grabTime += dt;
        if (g.grabTime >= GUARD.grabTime) game.onCaught(g);
      } else {
        g.grabTime = 0;
      }
      break;
    }
    case 'search': {
      g.searchTime -= dt;
      if (g.lastSeen) {
        // Wander around the last known spot.
        const wx = g.lastSeen.x + Math.sin(time * 0.7 + g.id * 2) * 46;
        const wy = g.lastSeen.y + Math.cos(time * 0.5 + g.id) * 46;
        stepToward(g, grid, wx, wy, GUARD.patrol, dt);
      }
      if (g.searchTime <= 0) {
        g.state = 'patrol';
        g.suspicion = 10;
      }
      break;
    }
    case 'investigate': {
      if (g.investigateTarget) {
        if (stepToward(g, grid, g.investigateTarget.x, g.investigateTarget.y, GUARD.investigate, dt)) {
          g.investigateTarget = null;
          g.state = 'patrol';
          g.patrolPause = 1.2;
        }
      } else {
        g.state = 'patrol';
      }
      break;
    }
    default:
      break;
  }
  if (!wasAlert && g.state === 'alert') game.audio.spotted();
}

export function updateGuards(game, dt) {
  for (const g of game.guards) updateGuard(g, dt, game);
  // Keep guards from stacking on each other.
  for (let i = 0; i < game.guards.length; i++) {
    for (let j = i + 1; j < game.guards.length; j++) {
      const a = game.guards[i];
      const b = game.guards[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = GUARD.radius * 2 + 2;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

export function coneColorForGuard(g) {
  if (g.state === 'alert') return COLORS.coneAlert;
  if (g.state === 'suspicious' || g.state === 'search' || g.state === 'investigate') return COLORS.coneSuspicious;
  return COLORS.coneCalm;
}
