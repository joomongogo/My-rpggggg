import { DROP_LIFETIME, DROP_MERGE_RANGE, PICKUP_RANGE } from "./constants.js";
import { createItem } from "./items.js";
import { addItemToPlayer } from "./loadout.js";
import { scheduleSave } from "./save.js";

export const drops = [];

export function spawnDrop(type, rarity, x, y, count = 1) {
  const amount = Math.max(1, Math.floor(Number(count) || 1));
  for (const drop of drops) {
    if (drop.type !== type || drop.rarity !== rarity) {
      continue;
    }
    if (Math.hypot(drop.x - x, drop.y - y) > DROP_MERGE_RANGE) {
      continue;
    }
    drop.count += amount;
    drop.life = DROP_LIFETIME;
    return drop;
  }

  const drop = {
    type,
    rarity,
    x,
    y,
    life: DROP_LIFETIME,
    count: amount,
    item: createItem(type, rarity)
  };
  drops.push(drop);
  return drop;
}

export function updateDrops(player, dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i];
    drop.life -= dt;

    const near = Math.hypot(player.x - drop.x, player.y - drop.y) < PICKUP_RANGE + player.size;
    if (near && player.hp > 0) {
      const copies = Math.max(1, Math.floor(drop.count || 1));
      addItemToPlayer(player, drop.item, true);
      for (let n = 1; n < copies; n++) {
        addItemToPlayer(player, createItem(drop.type, drop.rarity), true);
      }
      scheduleSave(player);
      drops.splice(i, 1);
      continue;
    }

    if (drop.life <= 0) {
      drops.splice(i, 1);
    }
  }
}
