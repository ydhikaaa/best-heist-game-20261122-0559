// Midnight Harbor — shared tuning constants for the whole heist game.
// One file, one job: every number the other modules agree on lives here.
export const TILE = 32;
export const COLS = 40;
export const ROWS = 23;
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 56;
export const WORLD_Y = HUD_H;
export const WORLD_H = ROWS * TILE; // 736

export const COLORS = {
  floorA: '#252d38',
  floorB: '#20262f',
  walkway: '#2b3542',
  wallTop: '#4a5a6e',
  wallSide: '#2c3846',
  containerA: '#7a5a2e',
  containerB: '#5d6b7a',
  containerC: '#6e3f3a',
  containerD: '#3f5d4a',
  crate: '#8a6d3b',
  water: '#0d2b40',
  waterLine: '#1d4d6b',
  lampGlow: 'rgba(255, 190, 90, 0.20)',
  coneCalm: 'rgba(255, 196, 66, 0.20)',
  coneSuspicious: 'rgba(255, 140, 40, 0.30)',
  coneAlert: 'rgba(255, 60, 50, 0.38)',
  coneCamera: 'rgba(120, 200, 255, 0.20)',
  coneCameraHot: 'rgba(255, 70, 60, 0.34)',
  player: '#39d5bd',
  playerDark: '#1d8a7a',
  guard: '#5b7fb8',
  guardDark: '#33496e',
  jade: '#7dffb0',
  gold: '#ffd75e',
  exit: '#58e0ff',
  smoke: 'rgba(200, 205, 215, 0.55)',
  hudPanel: 'rgba(10, 16, 24, 0.82)',
  hudBorder: 'rgba(120, 170, 220, 0.35)',
  hudText: '#dfe9f5',
  hudDim: '#8fa3b8',
  alarmLow: '#58d68d',
  alarmMid: '#ffb03a',
  alarmHigh: '#ff4d42',
};

export const PLAYER = {
  walk: 118,
  sprint: 178,
  sneak: 66,
  radius: 11,
  noiseWalk: 26,
  noiseSprint: 95,
  noiseSneak: 8,
};

export const GUARD = {
  patrol: 56,
  chase: 128,
  investigate: 88,
  radius: 12,
  visionRange: 205,
  visionHalfAngle: 0.62,
  // suspicion per second while the thief is seen, scaled by closeness
  suspicionBase: 55,
  suspicionClose: 95,
  suspicionDecay: 26,
  // how long a guard keeps chasing after losing sight, then searches
  chaseMemory: 3.5,
  searchTime: 6,
  // a guard must stay this close, while alert, this long before the grab
  grabRange: 24,
  grabTime: 0.55,
};

export const CAMERA = {
  range: 225,
  halfAngle: 0.5,
  sweepSpeed: 0.45,
};

export const ALARM = {
  riseAlert: 14, // per second while any guard is alert
  riseCamera: 20, // per second while a camera sees the thief
  decay: 5,
  caughtAt: 100,
};

export const TOOLS = { coin: 3, smoke: 2, emp: 2 };
// Tools cost loot, not just charges: smoke and EMP are paid for out of the
// take, so grabbing side loot funds the tools that keep you unseen. A coin
// is free — it is the thief's own small change.
export const TOOL_COSTS = { coin: 0, smoke: 100, emp: 250 };
export const TOOL_COST_LABELS = { coin: 'FREE', smoke: '$100', emp: '$250' };
export const SMOKE_RADIUS = 95;
export const SMOKE_TIME = 6;
export const EMP_TIME = 8;
export const COIN_THROW = 130;
export const COIN_NOISE = 210;

// Getaway: grabbing the final manifest wakes the whole harbor.
export const GETAWAY = {
  alarmSurge: 25, // alarm jumps by this much (capped)
  alarmCap: 70, // the surge never pushes the alarm past this
  alarmRise: 6, // per second while running for the boat
};

// Vent crawlspaces: a 'V' tile is a service duct the thief crawls through.
// Walkable, but it blocks sight — guards and cameras cannot see through it,
// and a thief inside one cannot be seen at all. The second route per level.
export const VENT_COLORS = {
  plate: '#1c2733',
  edge: '#39d5bd',
  slat: 'rgba(0, 0, 0, 0.5)',
};

export const LOOT_VALUES = { jade: 5000, gold: 800, cash: 400, art: 1200 };
export const LOOT_NAMES = {
  jade: 'JADE MANIFEST',
  gold: 'Gold bars',
  cash: 'Cash bundle',
  art: 'Smuggled art',
};

// Seeded RNG (mulberry32) so staged screenshots are deterministic.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
