// Midnight Harbor — vent crawlspaces: the second route through every room.
// One file, one job: everything about the 'V' duct tiles.
//
// A vent is a service duct cut through a container row, a shelf row or a
// dividing wall. The thief crawls through it; guards and cameras cannot see
// through it, and a thief standing inside one cannot be seen at all. Every
// level has at least one vent, so there is always a second way past a patrol
// besides the open lane — and the self-test proves the jade stays reachable
// when the main doors are walled off.
import { TILE } from './config.js';
import { isVentTile } from './world.js';

// Is the thief standing inside a vent duct right now?
export function playerInVent(game) {
  const p = game.player;
  if (!p) return false;
  return isVentTile(game.grid, Math.floor(p.x / TILE), Math.floor(p.y / TILE));
}

// All vent tiles of the current level, as tile coordinates — used by the
// self-test to prove each one is reachable from the player's start.
export function ventTiles(game) {
  const out = [];
  for (let ty = 0; ty < game.grid.length; ty++) {
    for (let tx = 0; tx < game.grid[ty].length; tx++) {
      if (game.grid[ty][tx] === 'V') out.push([tx, ty]);
    }
  }
  return out;
}
