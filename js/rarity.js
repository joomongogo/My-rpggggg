export const RARITY_ORDER = [
  "Basic",
  "Decent",
  "Nice",
  "Great",
  "Super",
  "Hyper",
  "Amber",
  "Eternal",
  "X_"
];

const RARITY_DATA = {
  Basic: { minDist: 0, maxDist: 650, color: "#9aa0a6" },
  Decent: { minDist: 650, maxDist: 1300, color: "#3d7dff" },
  Nice: { minDist: 1300, maxDist: 1950, color: "#ff9f2e" },
  Great: { minDist: 1950, maxDist: 2600, color: "#3fc85a" },
  Super: { minDist: 2600, maxDist: 3250, color: "#67dcff" },
  Hyper: { minDist: 3250, maxDist: 3900, color: "#fdf6d8" },
  Amber: { minDist: 3900, maxDist: 4550, color: "#ff4a3d" },
  Eternal: { minDist: 4550, maxDist: 5200, color: "#ffd400" },
  X_: { minDist: 5200, maxDist: Infinity, color: "#ff4d6d" }
};

export function getRarityIndex(rarity) {
  const index = RARITY_ORDER.indexOf(rarity);
  return index < 0 ? 0 : index;
}

export function getRarityData(rarity) {
  return RARITY_DATA[rarity] || RARITY_DATA.Basic;
}

export function getWeaponMult(rarity) {
  return 1 + getRarityIndex(rarity) * 0.35;
}

export function getMonsterHpMult(rarity) {
  return 2.4 ** getRarityIndex(rarity);
}

export function getMonsterAtkMult(rarity) {
  return 1.9 ** getRarityIndex(rarity);
}

export function getRarityMult(rarity) {
  return getWeaponMult(rarity);
}

export function getRarityColor(rarity, time = 0) {
  if (rarity === "X_") {
    const hue = ((time * 120) % 360 + 360) % 360;
    return `hsl(${hue}, 90%, 58%)`;
  }
  return getRarityData(rarity).color;
}

export function getRarityClass(rarity) {
  if (rarity === "X_") {
    return "rarity-x";
  }
  if (rarity === "Eternal") {
    return "rarity-eternal";
  }
  return `rarity-${rarity.toLowerCase()}`;
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
  return RARITY_ORDER[index + 1];
}

export function rarityFromDistance(distance, safeRadius = 0, zoneBand = 650) {
  if (distance < safeRadius) {
    return "Basic";
  }
  const index = Math.min(
    RARITY_ORDER.length - 1,
    Math.max(0, Math.floor((distance - safeRadius) / zoneBand))
  );
  return RARITY_ORDER[index];
}

export function rollZoneRarity(distance, safeRadius = 0, zoneBand = 650) {
  const base = rarityFromDistance(distance, safeRadius, zoneBand);
  const index = getRarityIndex(base);
  const roll = Math.random();

  if (roll < 0.2 && index > 0) {
    return RARITY_ORDER[index - 1];
  }
  if (roll > 0.9 && index > 0 && index < RARITY_ORDER.length - 1) {
    return RARITY_ORDER[index + 1];
  }
  return base;
}
