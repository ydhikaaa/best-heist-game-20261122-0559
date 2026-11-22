// Midnight Harbor — rotating security cameras and the EMP that kills them.
// One file, one job: sweep, spot, and shut down.
import { CAMERA, COLORS } from './config.js';
import { hasLineOfSight, inVisionCone, tileCenter, angleDiff } from './world.js';
import { playerInVent } from './vents.js';

export function createCamera(def, index) {
  const p = tileCenter(def.tx, def.ty);
  return {
    id: index,
    x: p.x,
    y: p.y,
    base: def.base,
    sweep: def.sweep,
    angle: def.base,
    phase: index * 1.7,
    disabledUntil: 0,
    hot: false, // currently seeing the thief
    hotTime: 0,
  };
}

export function updateCamera(cam, dt, game) {
  if (game.time < cam.disabledUntil) return; // EMP: frozen, lens dark
  cam.angle = cam.base + Math.sin(game.time * CAMERA.sweepSpeed + cam.phase) * cam.sweep;
  const player = game.player;
  let seen = false;
  // A thief crawling inside a vent duct cannot be seen, period.
  if (!player.hidden && !playerInVent(game)) {
    const view = inVisionCone(cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, player.x, player.y);
    if (view.seen && hasLineOfSight(game.grid, cam.x, cam.y, player.x, player.y, game.smokes)) {
      seen = true;
    }
  }
  if (seen && !cam.hot) game.audio.spotted();
  cam.hot = seen;
  if (seen) cam.hotTime = game.time;
}

export function updateCameras(game, dt) {
  for (const cam of game.cameras) updateCamera(cam, dt, game);
}

export function anyCameraHot(game) {
  return game.cameras.some((c) => c.hot);
}

export function cameraConeColor(cam, game) {
  if (game.time < cam.disabledUntil) return 'rgba(90, 110, 130, 0.10)';
  if (cam.hot) return COLORS.coneCameraHot;
  return COLORS.coneCamera;
}

export function disableAllCameras(game, seconds) {
  for (const cam of game.cameras) {
    cam.disabledUntil = game.time + seconds;
    cam.hot = false;
  }
}
