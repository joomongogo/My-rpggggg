import { SLOT_COUNT } from "./constants.js";
import { createItem } from "./items.js";

export const inventory = [];

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

export function addItemToPlayer(player, item) {
  const empty = player.loadout.find((slot) => !slot.item);
  if (empty) {
    empty.item = item;
    empty.cooldown = 0;
    console.log("[loadout] equipped", item.type, item.rarity);
    return "equipped";
  }

  inventory.push(item);
  console.log("[loadout] stored", item.type, item.rarity);
  return "stored";
}

export function giveStarterLoadout(player) {
  player.loadout[0].item = createItem("fang", "Basic");
  player.loadout[0].cooldown = 0;
}

export function tapSlot(player, index) {
  const slot = player.loadout[index];
  if (!slot) {
    return;
  }

  if (inventory.length > 0) {
    const incoming = inventory.shift();
    const outgoing = slot.item;
    slot.item = incoming;
    slot.cooldown = 0;
    if (outgoing) {
      inventory.unshift(outgoing);
    }
    console.log("[loadout] swapped slot", index);
    return;
  }

  if (slot.item) {
    inventory.push(slot.item);
    slot.item = null;
    slot.cooldown = 0;
    console.log("[loadout] unequipped slot", index);
  }
}
