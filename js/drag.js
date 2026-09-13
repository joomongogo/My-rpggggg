import { equipFromInventory, equipToSlot, swapSlots, tapSlot, unequipSlot } from "./loadout.js";

const DRAG_THRESHOLD = 8;

let drag = null;
let ghost = null;

function ensureGhost() {
  if (ghost) {
    return ghost;
  }
  ghost = document.createElement("div");
  ghost.id = "drag-ghost";
  document.body.appendChild(ghost);
  return ghost;
}

function hideGhost() {
  if (ghost) {
    ghost.style.display = "none";
  }
}

function showGhost(text, x, y) {
  const el = ensureGhost();
  el.textContent = text;
  el.style.display = "block";
  el.style.left = `${x + 12}px`;
  el.style.top = `${y + 12}px`;
}

function payloadFromElement(el) {
  if (!el) {
    return null;
  }
  if (el.dataset.slot !== undefined && el.dataset.slot !== "") {
    return { kind: "slot", index: Number(el.dataset.slot) };
  }
  if (el.dataset.itemType) {
    return { kind: "bag", type: el.dataset.itemType, rarity: el.dataset.itemRarity };
  }
  return null;
}

function dropTargetFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) {
    return null;
  }
  const slot = el.closest?.(".slot-button");
  if (slot) {
    return { kind: "slot", index: Number(slot.dataset.slot) };
  }
  if (el.closest?.("#inventory-panel")) {
    return { kind: "bag" };
  }
  return null;
}

function applyDrop(player, source, target) {
  if (!source || !target) {
    return;
  }

  if (source.kind === "slot" && target.kind === "slot") {
    swapSlots(player, source.index, target.index);
    return;
  }

  if (source.kind === "bag" && target.kind === "slot") {
    equipToSlot(player, target.index, source.type, source.rarity);
    return;
  }

  if (source.kind === "slot" && target.kind === "bag") {
    unequipSlot(player, source.index);
  }
}

export function bindDrag(player, onChange) {
  document.addEventListener("pointerdown", (event) => {
    const sourceEl = event.target.closest?.(".slot-button, .inventory-item");
    if (!sourceEl || event.target.closest?.(".fuse-button")) {
      return;
    }

    const source = payloadFromElement(sourceEl);
    if (!source) {
      return;
    }
    const emptySlot = source.kind === "slot" && !player.loadout[source.index]?.item;

    drag = {
      source,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      pointerId: event.pointerId,
      label: sourceEl.textContent.trim(),
      emptySlot
    };
  });

  document.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const dist = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (drag.emptySlot) {
      return;
    }
    if (dist > DRAG_THRESHOLD) {
      drag.moved = true;
      showGhost(drag.label, event.clientX, event.clientY);
    }
    if (drag.moved) {
      showGhost(drag.label, event.clientX, event.clientY);
    }
  });

  document.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    const current = drag;
    drag = null;
    hideGhost();

    if (!current.moved) {
      if (current.source.kind === "slot") {
        tapSlot(player, current.source.index);
      } else if (current.source.kind === "bag") {
        equipFromInventory(player, current.source.type, current.source.rarity);
      }
      onChange?.();
      return;
    }

    const target = dropTargetFromPoint(event.clientX, event.clientY);
    applyDrop(player, current.source, target);
    onChange?.();
  });
}

export function wasDragging() {
  return Boolean(drag?.moved);
}
