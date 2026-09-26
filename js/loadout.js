import { SLOT_COUNT } from "./constants.js";
import { createItem } from "./items.js";

export const inventory = [];

export function replaceInventory(items) {
  inventory.length = 0;
  if (Array.isArray(items) && items.length > 0) {
    inventory.push(...items);
  }
}

export function createLoadout() {
  return Array.from({ length: SLOT_COUNT }, () => ({
    item: null,
    cooldown: 0
  }));
}

export function getSlotWorldPos(player, index) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / SLOT_COUNT;
  const radius = player.size * 0.72;
  return {
    x: player.x + Math.cos(angle) * radius,
    y: player.y + Math.sin(angle) * radius
  };
}

export function addItemToPlayer(player, item, quiet = false) {
  const empty = player.loadout.find((slot) => !slot.item);
  if (empty) {
    empty.item = item;
    empty.cooldown = 0;
    if (!quiet) {
      console.log("[loadout] equipped", item.type, item.rarity);
    }
    return "equipped";
  }

  inventory.push(item);
  if (!quiet) {
    console.log("[loadout] stored", item.type, item.rarity);
  }
  return "stored";
}

export function giveStarterLoadout(player) {
  player.loadout[0].item = createItem("fang", "Basic");
  player.loadout[0].cooldown = 0;
}

export function takeInventoryItem(type, rarity) {
  const index = inventory.findIndex((item) => item.type === type && item.rarity === rarity);
  if (index < 0) {
    return null;
  }
  return inventory.splice(index, 1)[0];
}

export function swapSlots(player, a, b) {
  if (a === b || !player.loadout[a] || !player.loadout[b]) {
    return;
  }
  const left = player.loadout[a];
  const right = player.loadout[b];
  const item = left.item;
  const cooldown = left.cooldown;
  left.item = right.item;
  left.cooldown = right.cooldown;
  right.item = item;
  right.cooldown = cooldown;
}

export function unequipSlot(player, slotIndex) {
  const slot = player.loadout[slotIndex];
  if (!slot || !slot.item) {
    return false;
  }
  inventory.push(slot.item);
  slot.item = null;
  slot.cooldown = 0;
  console.log("[loadout] unequipped slot", slotIndex);
  return true;
}

export function equipToSlot(player, slotIndex, type, rarity) {
  const slot = player.loadout[slotIndex];
  const incoming = takeInventoryItem(type, rarity);
  if (!slot || !incoming) {
    return false;
  }

  if (slot.item) {
    inventory.push(slot.item);
  }
  slot.item = incoming;
  slot.cooldown = 0;
  console.log("[loadout] equipped to slot", slotIndex, type, rarity);
  return true;
}

export function equipFromInventory(player, type, rarity) {
  const emptyIndex = player.loadout.findIndex((slot) => !slot.item);
  if (emptyIndex >= 0) {
    return equipToSlot(player, emptyIndex, type, rarity);
  }
  return false;
}

export function countEquippedOfType(player, type) {
  return player.loadout.filter((slot) => slot.item && slot.item.type === type).length;
}

export function tapSlot(player, index) {
  const slot = player.loadout[index];
  if (!slot) {
    return;
  }

  if (slot.item) {
    unequipSlot(player, index);
    return;
  }

  if (inventory.length > 0) {
    const incoming = inventory.shift();
    slot.item = incoming;
    slot.cooldown = 0;
  }
}
