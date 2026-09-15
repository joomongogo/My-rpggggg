const joystick = {
  active: false,
  pointerId: null,
  originX: 0,
  originY: 0,
  x: 0,
  y: 0,
  maxRadius: 54
};

let touchUiVisible = false;

export function isTouchUiVisible() {
  return touchUiVisible;
}

export function showTouchUi() {
  touchUiVisible = true;
  const root = document.getElementById("touch-ui");
  if (root) {
    root.classList.add("visible");
  }
}

export function getJoystickVector() {
  if (!joystick.active) {
    return { x: 0, y: 0 };
  }

  const dx = joystick.x - joystick.originX;
  const dy = joystick.y - joystick.originY;
  const dist = Math.hypot(dx, dy);

  if (dist < 8) {
    return { x: 0, y: 0 };
  }

  const clamped = Math.min(dist, joystick.maxRadius);
  return {
    x: (dx / dist) * (clamped / joystick.maxRadius),
    y: (dy / dist) * (clamped / joystick.maxRadius)
  };
}

function updateKnob() {
  const knob = document.getElementById("joystick-knob");
  const base = document.getElementById("joystick-base");
  if (!knob || !base) {
    return;
  }

  const dx = joystick.x - joystick.originX;
  const dy = joystick.y - joystick.originY;
  const dist = Math.hypot(dx, dy);
  const limited = Math.min(dist, joystick.maxRadius);
  const nx = dist > 0 ? (dx / dist) * limited : 0;
  const ny = dist > 0 ? (dy / dist) * limited : 0;

  knob.style.transform = `translate(${nx}px, ${ny}px)`;
}

export function bindTouchControls() {
  const pad = document.getElementById("joystick-pad");
  if (!pad) {
    return;
  }

  const prefersTouch = window.matchMedia("(pointer: coarse)").matches;
  if (prefersTouch) {
    showTouchUi();
  }

  pad.addEventListener("pointerdown", (event) => {
    if (event.target.closest?.("#bag-button, #dex-button, #inventory-panel, #bestiary-panel, #slot-bar")) {
      return;
    }
    event.preventDefault();
    showTouchUi();
    joystick.active = true;
    joystick.pointerId = event.pointerId;
    const rect = pad.getBoundingClientRect();
    joystick.originX = rect.left + rect.width / 2;
    joystick.originY = rect.top + rect.height / 2;
    joystick.x = event.clientX;
    joystick.y = event.clientY;
    pad.setPointerCapture(event.pointerId);
    updateKnob();
  });

  pad.addEventListener("pointermove", (event) => {
    if (!joystick.active || event.pointerId !== joystick.pointerId) {
      return;
    }
    event.preventDefault();
    joystick.x = event.clientX;
    joystick.y = event.clientY;
    updateKnob();
  });

  const endJoystick = (event) => {
    if (event.pointerId !== joystick.pointerId) {
      return;
    }
    joystick.active = false;
    joystick.pointerId = null;
    joystick.x = joystick.originX;
    joystick.y = joystick.originY;
    updateKnob();
  };

  pad.addEventListener("pointerup", endJoystick);
  pad.addEventListener("pointercancel", endJoystick);
}
