import { ITEM_RANGE, ITEM_RELOAD } from "./constants.js";
import { JOOMONG_RARITY, weaponDamageByRarity, weaponRarityLevel } from "./rarity.js";

const BASE = {
  fang: {
    type: "fang",
    label: "Fang",
    color: "#f3d6d0",
    damage: 18
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

export const WEAPON_TYPES = Object.keys(BASE);

let nextItemId = 1;

function newItemId() {
  nextItemId += 1;
  return `it-${Date.now().toString(36)}-${nextItemId}`;
}

export function itemLabel(type) {
  return BASE[type]?.label || type;
}

export function createItem(type, rarity, extras = {}) {
  const base = BASE[type];
  if (!base) {
    return null;
  }

  const level = weaponRarityLevel(rarity);
  const enhanceCount = rarity === JOOMONG_RARITY
    ? Math.max(0, Math.floor(Number(extras.enhanceCount) || 0))
    : 0;

  const item = {
    id: extras.id || newItemId(),
    type,
    rarity,
    label: base.label,
    color: base.color,
    enhanceCount,
    baseDamage: base.damage,
    range: ITEM_RANGE[type] * (1 + level * 0.03),
    reload: ITEM_RELOAD[type],
    damage: weaponDamageByRarity(base.damage, rarity)
  };

  if (type === "mucus") {
    item.slow = Math.min(0.7, base.slow * (1 + level * 0.08));
    item.slowDuration = base.slowDuration + level * 0.12;
  }

  if (type === "potion") {
    item.aoeRadius = base.aoeRadius * (1 + level * 0.08);
  }

  if (type === "head") {
    item.knockback = base.knockback + level * 3;
  }

  if (type === "stick") {
    item.stickBonus = weaponDamageByRarity(2 + level * 2, rarity);
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
