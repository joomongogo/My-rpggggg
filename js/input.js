import { bindTouchControls, getJoystickVector } from "./touch.js";

const keys = {};

export function bindInput() {
  document.addEventListener("keydown", (event) => {
    keys[event.key.toLowerCase()] = true;

    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
    }
  });

  document.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
  });

  window.addEventListener("blur", () => {
    for (const key of Object.keys(keys)) {
      keys[key] = false;
    }
  });

  bindTouchControls();
}

export function getMoveVector() {
  let x = 0;
  let y = 0;

  if (keys.w || keys.arrowup) {
    y -= 1;
  }
  if (keys.s || keys.arrowdown) {
    y += 1;
  }
  if (keys.a || keys.arrowleft) {
    x -= 1;
  }
  if (keys.d || keys.arrowright) {
    x += 1;
  }

  const stick = getJoystickVector();
  x += stick.x;
  y += stick.y;

  const length = Math.hypot(x, y);
  if (length > 1) {
    return { x: x / length, y: y / length };
  }
  return { x, y };
}
