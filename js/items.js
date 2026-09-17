import { ITEM_RANGE, ITEM_RELOAD } from "./constants.js";
import { getRarityIndex, getWeaponMult } from "./rarity.js";

const BASE = {
  fang: {
    type: "fang",
    label: "Fang",
    color: "#f3d6d0",
    damage: 18,
    lifesteal: 0.08
  },
  mucus: {
    type: "mucus",
    label: "Mucus",
    color: "#9be38a",
    damage: 10,
    slow: 0.25,
    slowDuration: 1.5
  },
  potion: {
    type: "potion",
    label: "Potion",
    color: "#b388ff",
    damage: 16,
    aoeRadius: 70
  },
  dart: {
    type: "dart",
    label: "Dart",
    color: "#d4c36a",
    damage: 7
  },
  boulder: {
    type: "boulder",
    label: "Boulder",
    color: "#c4b8a4",
    damage: 38
  },
  head: {
    type: "head",
    label: "Head",
    color: "#d9b08c",
    damage: 14,
    knockback: 22
  },
  stick: {
    type: "stick",
    label: "Stick",
    color: "#8d6e3c",
    damage: 6
  }
};

export function createItem(type, rarity) {
  const base = BASE[type];
  const mult = getWeaponMult(rarity);
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
    item.lifesteal = Math.min(0.12, base.lifesteal * (1 + index * 0.08));
  }

  if (type === "mucus") {
    item.slow = Math.min(0.7, base.slow * (1 + index * 0.08));
    item.slowDuration = base.slowDuration + index * 0.12;
  }

  if (type === "potion") {
    item.aoeRadius = base.aoeRadius * (1 + index * 0.08);
  }

  if (type === "head") {
    item.knockback = base.knockback + index * 3;
  }

  if (type === "stick") {
    item.damage = 6;
  }

  return item;
}

export function dropTypeForMonster(monsterType) {
  if (monsterType === "slime") {
    return "mucus";
  }
  if (monsterType === "zombie") {
    return "head";
  }
  if (monsterType === "bat") {
    return "dart";
  }
  if (monsterType === "golem") {
    return "boulder";
  }
  if (monsterType === "dracula") {
    return "fang";
  }
  if (monsterType === "leafbug") {
    return "stick";
  }
  return "potion";
}
