// Midnight Harbor — the five heist levels: Container Yard, Warehouse,
// Customs Office, Freighter Deck and The Hold. One file, one job: where
// everything is, built from rectangles so no row can drift out of shape.
//
// Map legend: '#' wall / stacked container (blocks movement and sight),
// '=' low crate (blocks movement and sight), '.' open floor, ':' marked
// walkway floor, '~' water (blocks movement, not sight).
import { COLS, ROWS } from './config.js';

function newGrid() {
  const g = [];
  for (let y = 0; y < ROWS; y++) g.push(new Array(COLS).fill('.'));
  for (let x = 0; x < COLS; x++) {
    g[0][x] = '#';
    g[ROWS - 1][x] = '#';
  }
  for (let y = 0; y < ROWS; y++) {
    g[y][0] = '#';
    g[y][COLS - 1] = '#';
  }
  return g;
}

function rect(g, x, y, w, h, ch) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (xx > 0 && xx < COLS - 1 && yy > 0 && yy < ROWS - 1) g[yy][xx] = ch;
    }
  }
}

function finish(def) {
  def.grid = def._g.map((row) => row.join(''));
  delete def._g;
  return def;
}

function base(name, sub, brief, par) {
  return { name, sub, brief, par, _g: newGrid() };
}

export const LEVELS = [
  finish((() => {
    const L = base(
      'CONTAINER YARD',
      'Level 1 — Pier 7, 02:14 AM',
      'Slip past the yard patrol, lift the Jade Manifest from its crate, and reach the east gate.',
      150,
    );
    const g = L._g;
    rect(g, 1, 21, 38, 1, '~'); // harbor water along the south edge
    rect(g, 5, 3, 6, 2, '#');
    rect(g, 13, 3, 5, 2, '#');
    rect(g, 22, 3, 6, 2, '#');
    rect(g, 30, 3, 5, 2, '#');
    rect(g, 5, 7, 4, 3, '#');
    rect(g, 12, 7, 6, 2, '#');
    rect(g, 21, 7, 4, 3, '#');
    rect(g, 29, 7, 6, 2, '#');
    rect(g, 5, 12, 6, 2, '#');
    rect(g, 14, 12, 4, 3, '#');
    rect(g, 22, 12, 6, 2, '#');
    rect(g, 31, 12, 4, 2, '#');
    rect(g, 8, 16, 5, 2, '#');
    rect(g, 18, 16, 6, 2, '#');
    rect(g, 28, 16, 5, 2, '#');
    rect(g, 10, 6, 2, 1, '=');
    rect(g, 26, 10, 2, 1, '=');
    rect(g, 16, 18, 2, 1, '=');
    rect(g, 33, 15, 2, 1, '=');
    rect(g, 2, 10, 36, 1, ':'); // painted lane
    L.player = { tx: 3, ty: 19 };
    L.exit = { tx: 37, ty: 8 };
    L.jade = { tx: 20, ty: 4 };
    L.sideLoot = [
      { tx: 6, ty: 17, kind: 'cash' },
      { tx: 36, ty: 8, kind: 'gold' },
      { tx: 15, ty: 19, kind: 'cash' },
    ];
    L.guards = [
      { tx: 8, ty: 5, waypoints: [[8, 5], [32, 5]] },
      { tx: 12, ty: 11, waypoints: [[12, 11], [30, 11], [30, 15], [12, 15]] },
    ];
    L.cameras = [
      { tx: 20, ty: 1, base: Math.PI / 2, sweep: 0.7 },
      { tx: 38, ty: 11, base: Math.PI, sweep: 0.6 },
    ];
    L.lamps = [[4, 4], [20, 6], [34, 6], [10, 14], [26, 14], [36, 18], [4, 18], [20, 19]];
    L.tools = { coin: 3, smoke: 2, emp: 2 };
    return L;
  })()),

  finish((() => {
    const L = base(
      'WAREHOUSE',
      'Level 2 — Shed 4, 02:31 AM',
      'The manifest is shelved deep in Shed 4. Thread the aisles between the shelf rows.',
      180,
    );
    const g = L._g;
    rect(g, 4, 5, 10, 1, '#');
    rect(g, 16, 5, 10, 1, '#');
    rect(g, 28, 5, 8, 1, '#');
    rect(g, 4, 9, 8, 1, '#');
    rect(g, 14, 9, 10, 1, '#');
    rect(g, 26, 9, 10, 1, '#');
    rect(g, 4, 13, 10, 1, '#');
    rect(g, 16, 13, 10, 1, '#');
    rect(g, 28, 13, 8, 1, '#');
    rect(g, 4, 17, 8, 1, '#');
    rect(g, 14, 17, 10, 1, '#');
    rect(g, 26, 17, 10, 1, '#');
    rect(g, 20, 8, 1, 1, '=');
    rect(g, 20, 12, 1, 1, '=');
    rect(g, 20, 16, 1, 1, '=');
    rect(g, 33, 19, 2, 1, '=');
    rect(g, 6, 19, 2, 1, '=');
    L.player = { tx: 2, ty: 20 };
    L.exit = { tx: 37, ty: 18 };
    L.jade = { tx: 32, ty: 3 };
    L.sideLoot = [
      { tx: 19, ty: 11, kind: 'gold' },
      { tx: 6, ty: 15, kind: 'cash' },
      { tx: 33, ty: 7, kind: 'art' },
    ];
    L.guards = [
      { tx: 4, ty: 7, waypoints: [[4, 7], [35, 7]] },
      { tx: 35, ty: 11, waypoints: [[35, 11], [4, 11]] },
      { tx: 4, ty: 15, waypoints: [[4, 15], [35, 15]] },
    ];
    L.cameras = [
      { tx: 20, ty: 1, base: Math.PI / 2, sweep: 0.6 },
      { tx: 1, ty: 11, base: 0, sweep: 0.5 },
    ];
    L.lamps = [[8, 3], [20, 3], [32, 3], [8, 19], [20, 19], [32, 19], [8, 11], [32, 11]];
    L.tools = { coin: 3, smoke: 2, emp: 2 };
    return L;
  })()),

  finish((() => {
    const L = base(
      'CUSTOMS OFFICE',
      'Level 3 — Customs House, 02:58 AM',
      'Three office wings, three patrols. The manifest sits in the far wing — cross quietly.',
      210,
    );
    const g = L._g;
    rect(g, 13, 1, 1, 21, '#');
    rect(g, 13, 7, 1, 1, '.');
    rect(g, 13, 15, 1, 1, '.');
    rect(g, 26, 1, 1, 21, '#');
    rect(g, 26, 5, 1, 1, '.');
    rect(g, 26, 17, 1, 1, '.');
    rect(g, 4, 4, 4, 1, '=');
    rect(g, 8, 10, 3, 1, '=');
    rect(g, 4, 16, 4, 1, '=');
    rect(g, 16, 4, 4, 1, '=');
    rect(g, 21, 10, 3, 1, '=');
    rect(g, 16, 18, 4, 1, '=');
    rect(g, 29, 4, 4, 1, '=');
    rect(g, 33, 10, 3, 1, '=');
    rect(g, 29, 18, 4, 1, '=');
    L.player = { tx: 2, ty: 20 };
    L.exit = { tx: 2, ty: 8 };
    L.jade = { tx: 32, ty: 3 };
    L.sideLoot = [
      { tx: 6, ty: 7, kind: 'cash' },
      { tx: 20, ty: 7, kind: 'gold' },
      { tx: 33, ty: 15, kind: 'art' },
    ];
    L.guards = [
      { tx: 6, ty: 7, waypoints: [[6, 7], [11, 7], [11, 12], [6, 12]] },
      { tx: 16, ty: 7, waypoints: [[16, 7], [24, 7], [24, 12], [16, 12]] },
      { tx: 29, ty: 7, waypoints: [[29, 7], [36, 7], [36, 12], [29, 12]] },
    ];
    L.cameras = [
      { tx: 20, ty: 1, base: Math.PI / 2, sweep: 0.6 },
      { tx: 38, ty: 11, base: Math.PI, sweep: 0.6 },
    ];
    L.lamps = [[6, 3], [20, 3], [33, 3], [6, 19], [20, 19], [33, 19]];
    L.tools = { coin: 3, smoke: 3, emp: 2 };
    return L;
  })()),

  finish((() => {
    const L = base(
      'FREIGHTER DECK',
      'Level 4 — MV Night Tide, 03:20 AM',
      'Aboard the freighter. Sea on the port side, patrols on every lane, the bridge ahead.',
      210,
    );
    const g = L._g;
    rect(g, 1, 1, 2, 21, '~'); // open sea along the port side
    rect(g, 8, 3, 6, 2, '#');
    rect(g, 18, 3, 5, 2, '#');
    rect(g, 27, 3, 6, 2, '#');
    rect(g, 8, 8, 5, 2, '#');
    rect(g, 17, 8, 6, 2, '#');
    rect(g, 26, 8, 5, 2, '#');
    rect(g, 8, 13, 6, 2, '#');
    rect(g, 18, 13, 5, 2, '#');
    rect(g, 27, 13, 6, 2, '#');
    rect(g, 12, 17, 6, 2, '#');
    rect(g, 22, 17, 6, 2, '#');
    rect(g, 16, 2, 4, 1, '#'); // bridge wings
    rect(g, 24, 2, 4, 1, '#');
    rect(g, 6, 10, 1, 1, '=');
    rect(g, 33, 18, 1, 1, '=');
    rect(g, 30, 5, 2, 1, '=');
    L.player = { tx: 4, ty: 20 };
    L.exit = { tx: 36, ty: 18 };
    L.jade = { tx: 21, ty: 2 };
    L.sideLoot = [
      { tx: 6, ty: 11, kind: 'cash' },
      { tx: 33, ty: 19, kind: 'gold' },
      { tx: 31, ty: 7, kind: 'art' },
    ];
    L.guards = [
      { tx: 6, ty: 6, waypoints: [[6, 6], [34, 6]] },
      { tx: 34, ty: 11, waypoints: [[34, 11], [6, 11]] },
      { tx: 6, ty: 15, waypoints: [[6, 15], [34, 15]] },
      { tx: 10, ty: 19, waypoints: [[10, 19], [34, 19]] },
    ];
    L.cameras = [
      { tx: 20, ty: 1, base: Math.PI / 2, sweep: 0.7 },
      { tx: 38, ty: 6, base: Math.PI, sweep: 0.6 },
    ];
    L.lamps = [[6, 4], [20, 6], [34, 4], [10, 19], [30, 19], [6, 15]];
    L.tools = { coin: 3, smoke: 3, emp: 3 };
    return L;
  })()),

  finish((() => {
    const L = base(
      'THE HOLD',
      'Level 5 — The Hold, 03:47 AM',
      'The last manifest copy is in the hold. Grab it, reach the boat hatch — and vanish.',
      240,
    );
    const g = L._g;
    rect(g, 14, 8, 12, 2, '#');
    rect(g, 14, 13, 12, 2, '#');
    rect(g, 5, 8, 4, 3, '#');
    rect(g, 31, 8, 4, 3, '#');
    rect(g, 5, 14, 4, 3, '#');
    rect(g, 31, 14, 4, 3, '#');
    rect(g, 33, 2, 1, 10, '#'); // engine-room wall
    rect(g, 33, 7, 1, 1, '.'); // its door
    rect(g, 6, 11, 1, 1, '=');
    rect(g, 33, 18, 2, 1, '=');
    rect(g, 20, 19, 2, 1, '=');
    L.player = { tx: 3, ty: 20 };
    L.exit = { tx: 36, ty: 8 };
    L.jade = { tx: 20, ty: 10 };
    L.sideLoot = [
      { tx: 8, ty: 12, kind: 'gold' },
      { tx: 35, ty: 19, kind: 'art' },
      { tx: 22, ty: 19, kind: 'cash' },
    ];
    L.guards = [
      { tx: 8, ty: 5, waypoints: [[8, 5], [32, 5]] },
      { tx: 32, ty: 18, waypoints: [[32, 18], [8, 18]] },
      { tx: 6, ty: 12, waypoints: [[6, 12], [12, 12]] },
      { tx: 28, ty: 12, waypoints: [[28, 12], [36, 12]] },
    ];
    L.cameras = [
      { tx: 20, ty: 1, base: Math.PI / 2, sweep: 0.7 },
      { tx: 1, ty: 11, base: 0, sweep: 0.5 },
      { tx: 38, ty: 11, base: Math.PI, sweep: 0.5 },
    ];
    L.lamps = [[10, 4], [20, 4], [30, 4], [10, 19], [20, 19], [30, 19]];
    L.tools = { coin: 4, smoke: 3, emp: 3 };
    return L;
  })()),
];
