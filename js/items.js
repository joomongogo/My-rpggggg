import { ITEM_RANGE, ITEM_RELOAD } from "./constants.js";
import { getRarityIndex, getRarityMult } from "./rarity.js";

const BASE = {
  fang: {
    type: "fang",
    label: "이빨",
    color: "#f3d6d0",
    damage: 18,
    lifesteal: 0.08
  },
  mucus: {
    type: "mucus",
    label: "점액",
    color: "#9be38a",
    damage: 10,
    slow: 0.25,
    slowDuration: 1.5
  },
  potion: {
    type: "potion",
    label: "물약",
    color: "#b388ff",
    damage: 16,
    aoeRadius: 70
  }
};

export function createItem(type, rarity) {
  const base = BASE[type];
  const mult = getRarityMult(rarity);
  const index = getRarityIndex(rarity);
  const reloadCut = Math.max(0.65, 1 - index * 0.04);

  const item = {
    type,
    rarity,
    label: base.label,
    color: base.color,
    range: ITEM_RANGE[type] * (1 + index * 0.03),
    reload: ITEM_RELOAD[type] * reloadCut,
    damage: base.damage * mult
  };

  if (type === "fang") {
    item.lifesteal = Math.min(0.25, base.lifesteal * (1 + index * 0.12));
  }

  if (type === "mucus") {
    item.slow = Math.min(0.7, base.slow * (1 + index * 0.08));
    item.slowDuration = base.slowDuration + index * 0.12;
  }

  if (type === "potion") {
    item.aoeRadius = base.aoeRadius * (1 + index * 0.08);
  }

  return item;
}

export function dropTypeForMonster(monsterType) {
  if (monsterType === "slime") {
    return "mucus";
  }
  if (monsterType === "zombie") {
    return "fang";
  }
  return "potion";
}
