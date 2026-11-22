// Midnight Harbor — keyboard and mouse input, with per-frame edge detection.
// One file, one job: nothing here knows about the game, only about keys.
export const keysDown = new Set();
const keysPressed = new Set();
export const mouse = { x: 0, y: 0, clicked: false, down: false };

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'KeyC', 'KeyE', 'KeyQ', 'KeyF', 'KeyR',
  'Enter', 'Space', 'Escape', 'KeyM',
]);

export function attachInput(canvas) {
  window.addEventListener('keydown', (ev) => {
    if (GAME_KEYS.has(ev.code)) ev.preventDefault();
    if (!ev.repeat) keysPressed.add(ev.code);
    keysDown.add(ev.code);
  });
  window.addEventListener('keyup', (ev) => {
    keysDown.delete(ev.code);
  });
  window.addEventListener('blur', () => {
    keysDown.clear();
  });
  canvas.addEventListener('mousemove', (ev) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((ev.clientX - r.left) / r.width) * canvas.width;
    mouse.y = ((ev.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (ev) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((ev.clientX - r.left) / r.width) * canvas.width;
    mouse.y = ((ev.clientY - r.top) / r.height) * canvas.height;
    mouse.down = true;
    mouse.clicked = true;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
}

export function isDown(code) {
  return keysDown.has(code);
}

export function wasPressed(code) {
  return keysPressed.has(code);
}

export function consumePressed(code) {
  if (keysPressed.has(code)) {
    keysPressed.delete(code);
    return true;
  }
  return false;
}

// Movement vector from WASD / arrows, normalized.
export function moveVector() {
  let x = 0;
  let y = 0;
  if (isDown('KeyA') || isDown('ArrowLeft')) x -= 1;
  if (isDown('KeyD') || isDown('ArrowRight')) x += 1;
  if (isDown('KeyW') || isDown('ArrowUp')) y -= 1;
  if (isDown('KeyS') || isDown('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

// Call at the end of every frame so edges fire exactly once.
export function endFrameInput() {
  keysPressed.clear();
  mouse.clicked = false;
}
