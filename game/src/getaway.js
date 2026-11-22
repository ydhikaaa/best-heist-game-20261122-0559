// Midnight Harbor — the getaway: the payoff after the final manifest.
// One file, one job: what happens when the last Jade Manifest is grabbed.
//
// Grabbing the manifest on the final level wakes the whole harbor: the alarm
// surges, every guard converges on the thief, and the alarm keeps climbing
// until the thief reaches the boat. It is a chase, not a stroll — the thief
// is faster than any guard, and the exit is already open, so a clean run
// makes it with seconds to spare. The victory screen then scores the whole
// heist: loot, tools spent, time, peak alarm, and a rank title.
import { GETAWAY } from './config.js';

// Trigger the getaway. Called from loot.js the moment the final jade is taken.
export function startGetaway(game) {
  if (game.getaway) return;
  game.getaway = true;
  game.alarm = Math.min(GETAWAY.alarmCap, game.alarm + GETAWAY.alarmSurge);
  game.peakAlarm = Math.max(game.peakAlarm, game.alarm);
  for (const g of game.guards) {
    g.state = 'alert';
    g.suspicion = 100;
    g.chaseTime = 3;
    g.lastSeen = { x: game.player.x, y: game.player.y };
    g.lastSeenTime = game.time;
  }
  game.message = 'GETAWAY! The harbor is waking — RUN FOR THE BOAT!';
  game.messageTime = 4;
  game.audio.alarmSurge();
}

// While the getaway runs, the alarm climbs on its own and the guards never
// give up the hunt: their memory of the thief keeps refreshing.
export function updateGetaway(game, dt) {
  if (!game.getaway) return;
  game.alarm = Math.min(100, game.alarm + GETAWAY.alarmRise * dt);
  game.peakAlarm = Math.max(game.peakAlarm, game.alarm);
  for (const g of game.guards) {
    g.lastSeen = { x: game.player.x, y: game.player.y };
    g.lastSeenTime = game.time;
    if (g.state === 'alert' && g.chaseTime < 1.5) g.chaseTime = 1.5;
    if (g.state !== 'alert' && g.suspicion >= 30) {
      g.state = 'alert';
      g.chaseTime = 3;
    }
  }
}

// Rank title for the final score screen, from how hot the heist ran.
export function getawayRank(peakAlarm, sideTaken, sideTotal) {
  if (peakAlarm < 25 && sideTaken === sideTotal) return 'GHOST — NEVER SEEN, TOOK EVERYTHING';
  if (peakAlarm < 25) return 'GHOST — NEVER SEEN';
  if (peakAlarm < 50) return 'SHADOW — A RUMOR ON THE DOCKS';
  if (peakAlarm < 75) return 'CLEAN — IN AND OUT BEFORE THE SIRENS';
  return 'LOUD — THE WHOLE HARBOR KNOWS YOUR NAME';
}
