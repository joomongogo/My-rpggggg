import { DROP_LIFETIME, PICKUP_RANGE } from "./constants.js";
import { createItem } from "./items.js";
import { addItemToPlayer } from "./loadout.js";

export const drops = [];

export function spawnDrop(type, rarity, x, y) {
  drops.push({
    type,
    rarity,
    x,
    y,
    life: DROP_LIFETIME,
    item: createItem(type, rarity)
  });
  console.log("[drops] spawned", type, rarity);
}

export function updateDrops(player, dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i];
    drop.life -= dt;

    const near = Math.hypot(player.x - drop.x, player.y - drop.y) < PICKUP_RANGE + player.size;
    if (near && player.hp > 0) {
      addItemToPlayer(player, drop.item);
      drops.splice(i, 1);
      continue;
    }

    if (drop.life <= 0) {
      drops.splice(i, 1);
    }
  }
}
