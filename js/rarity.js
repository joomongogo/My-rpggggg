import { FANG_HEAL } from "./constants.js";

export const JOOMONG_RARITY = "jo0MOnG";
export const X_RARITY = "X_";
export const JOOMONG_ENHANCE_GROWTH = 1.02;

export const RARITY_ORDER = [
  "Basic",
  "Decent",
  "Nice",
  "Great",
  "Super",
  "Hyper",
  "Amber",
  "Eternal",
  "X_",
  JOOMONG_RARITY
];

export const WORLD_RARITIES = RARITY_ORDER.filter((rarity) => rarity !== JOOMONG_RARITY);

const RARITY_DATA = {
  Basic: { minDist: 0, maxDist: 650, color: "#9aa0a6" },
  Decent: { minDist: 650, maxDist: 1300, color: "#3d7dff" },
  Nice: { minDist: 1300, maxDist: 1950, color: "#ff9f2e" },
  Great: { minDist: 1950, maxDist: 2600, color: "#3fc85a" },
  Super: { minDist: 2600, maxDist: 3250, color: "#67dcff" },
  Hyper: { minDist: 3250, maxDist: 3900, color: "#fdf6d8" },
  Amber: { minDist: 3900, maxDist: 4550, color: "#ff4a3d" },
  Eternal: { minDist: 4550, maxDist: 5200, color: "#ffd400" },
  X_: { minDist: 5200, maxDist: Infinity, color: "#ff4d6d" },
  jo0MOnG: { minDist: Infinity, maxDist: Infinity, color: "#3EE6C1" }
};

export const MONSTER_STAT_GROWTH = 7;
export const WEAPON_DAMAGE_GROWTH = 3;
export const MONSTER_ATK_GROWTH = 1.4;
export const FANG_HEAL_GROWTH = 1.4;
export const PLAYER_DAMAGE_STAT_GROWTH = 1.08;
export const TTK_STAT_OFFSET = 1.71;

export function getRarityIndex(rarity) {
  const index = RARITY_ORDER.indexOf(rarity);
  return index < 0 ? 0 : index;
}

export function weaponRarityLevel(rarity) {
  const cap = getRarityIndex(X_RARITY);
  if (rarity === JOOMONG_RARITY) {
    return cap;
  }
  return Math.min(cap, Math.max(0, getRarityIndex(rarity)));
}

export function rarityGrowth(level, growth) {
  return growth ** Math.max(0, level);
}

export function scaleByRarity(base, rarity, growth) {
  return base * rarityGrowth(weaponRarityLevel(rarity), growth);
}

export function getMonsterStatMult(rarity) {
  return rarityGrowth(weaponRarityLevel(rarity), MONSTER_STAT_GROWTH);
}

export function getMonsterHpMult(rarity) {
  return getMonsterStatMult(rarity);
}

export function getMonsterAtkMult(rarity) {
  return rarityGrowth(weaponRarityLevel(rarity), MONSTER_ATK_GROWTH);
}

export function getWeaponDamageMult(rarity) {
  return rarityGrowth(weaponRarityLevel(rarity), WEAPON_DAMAGE_GROWTH);
}

export function weaponDamageByRarity(baseDamage, rarity) {
  return baseDamage * getWeaponDamageMult(rarity);
}

export function joomongEnhanceMult(item) {
  if (!item || item.rarity !== JOOMONG_RARITY) {
    return 1;
  }
  const count = Math.max(0, Math.floor(item.enhanceCount || 0));
  return JOOMONG_ENHANCE_GROWTH ** count;
}

export function fangHealByRarity(rarity) {
  return scaleByRarity(FANG_HEAL, rarity, FANG_HEAL_GROWTH);
}

export function getWeaponMult(rarity) {
  return getWeaponDamageMult(rarity);
}

export function getRarityMult(rarity) {
  return getWeaponDamageMult(rarity);
}

export function recommendedDamagePoints(rarity) {
  return Math.round(
    getRarityIndex(rarity) * Math.log(TTK_STAT_OFFSET) / Math.log(PLAYER_DAMAGE_STAT_GROWTH)
  );
}

export function getRarityData(rarity) {
  return RARITY_DATA[rarity] || RARITY_DATA.Basic;
}

export function getRarityColor(rarity, time = 0) {
  if (rarity === "X_") {
    const hue = ((time * 120) % 360 + 360) % 360;
    return `hsl(${hue}, 90%, 58%)`;
  }
  return getRarityData(rarity).color;
}

export function getRarityClass(rarity) {
  if (rarity === JOOMONG_RARITY) {
    return "rarity-jo0mong";
  }
  if (rarity === "X_") {
    return "rarity-x";
  }
  if (rarity === "Eternal") {
    return "rarity-eternal";
  }
  return `rarity-${String(rarity).toLowerCase()}`;
}

export function createRarityPaint(ctx, cx, cy, radius, rarity, time = 0) {
  if (rarity === "Eternal") {
    const gradient = ctx.createLinearGradient(
      cx - radius,
      cy - radius,
      cx + radius,
      cy + radius
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#ffd400");
    return gradient;
  }

  if (rarity === "X_") {
    const hue = ((time * 120) % 360 + 360) % 360;
    const gradient = ctx.createLinearGradient(
      cx - radius,
      cy,
      cx + radius,
      cy
    );
    gradient.addColorStop(0, `hsl(${hue}, 95%, 58%)`);
    gradient.addColorStop(0.33, `hsl(${(hue + 80) % 360}, 95%, 58%)`);
    gradient.addColorStop(0.66, `hsl(${(hue + 160) % 360}, 95%, 58%)`);
    gradient.addColorStop(1, `hsl(${(hue + 240) % 360}, 95%, 58%)`);
    return gradient;
  }

  if (rarity === JOOMONG_RARITY) {
    return getRarityColor(rarity, time);
  }

  return getRarityColor(rarity, time);
}

export function getLowerRarity(rarity) {
  const index = getRarityIndex(rarity);
  if (index <= 0) {
    return null;
  }
  return RARITY_ORDER[index - 1];
}

export function getHigherRarity(rarity) {
  const index = getRarityIndex(rarity);
  if (index < 0 || index >= RARITY_ORDER.length - 1) {
    return null;
  }
  const next = RARITY_ORDER[index + 1];
  if (next === JOOMONG_RARITY) {
    return null;
  }
  return next;
}

export function rarityFromDistance(distance, safeRadius = 0, zoneBand = 650) {
  if (distance < safeRadius) {
    return "Basic";
  }
  const index = Math.min(
    WORLD_RARITIES.length - 1,
    Math.max(0, Math.floor((distance - safeRadius) / zoneBand))
  );
  return WORLD_RARITIES[index];
}

export function rollZoneRarity(distance, safeRadius = 0, zoneBand = 650) {
  const base = rarityFromDistance(distance, safeRadius, zoneBand);
  const index = WORLD_RARITIES.indexOf(base);
  const roll = Math.random();

  if (roll < 0.2 && index > 0) {
    return WORLD_RARITIES[index - 1];
  }
  if (roll > 0.9 && index >= 0 && index < WORLD_RARITIES.length - 1) {
    return WORLD_RARITIES[index + 1];
  }
  return base;
}
