import { FUSION_COUNT } from "./constants.js";
import { createItem } from "./items.js";
import { inventory } from "./loadout.js";
import { getHigherRarity } from "./rarity.js";

const FUSION_CHANCE = {
  Basic: 0.9,
  Decent: 0.75,
  Nice: 0.6,
  Great: 0.48,
  Super: 0.38,
  Hyper: 0.28,
  Amber: 0.2,
  Eternal: 0.12
};

export function getFusionChance(rarity) {
  return FUSION_CHANCE[rarity] ?? 0;
}

export function canFuse(type, rarity) {
  return Boolean(getHigherRarity(rarity)) && countItems(type, rarity) >= FUSION_COUNT;
}

export function countItems(type, rarity) {
  return inventory.filter((item) => item.type === type && item.rarity === rarity).length;
}

function takeItems(type, rarity, amount) {
  const taken = [];
  for (let i = inventory.length - 1; i >= 0 && taken.length < amount; i--) {
    const item = inventory[i];
    if (item.type === type && item.rarity === rarity) {
      taken.push(inventory.splice(i, 1)[0]);
    }
  }
  return taken;
}

export function fuseItems(type, rarity) {
  const next = getHigherRarity(rarity);
  if (!next) {
    return { ok: false, reason: "max" };
  }

  if (countItems(type, rarity) < FUSION_COUNT) {
    return { ok: false, reason: "not-enough" };
  }

  takeItems(type, rarity, FUSION_COUNT);
  const success = Math.random() < getFusionChance(rarity);

  if (success) {
    inventory.push(createItem(type, next));
    console.log("[fusion] success", type, rarity, "->", next);
    return { ok: true, success: true, next };
  }

  inventory.push(createItem(type, rarity), createItem(type, rarity));
  console.log("[fusion] fail", type, rarity);
  return { ok: true, success: false };
}
