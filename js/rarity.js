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
  Basic: { mult: 1, minDist: 0, maxDist: 900, color: "#9aa0a6" },
  Decent: { mult: 1.6, minDist: 900, maxDist: 1800, color: "#3d7dff" },
  Nice: { mult: 2.6, minDist: 1800, maxDist: 2800, color: "#ff9f2e" },
  Great: { mult: 4.2, minDist: 2800, maxDist: 3900, color: "#3fc85a" },
  Super: { mult: 7, minDist: 3900, maxDist: 5100, color: "#67dcff" },
  Hyper: { mult: 12, minDist: 5100, maxDist: 6400, color: "#fdf6d8" },
  Amber: { mult: 20, minDist: 6400, maxDist: 7800, color: "#ff4a3d" },
  Eternal: { mult: 35, minDist: 7800, maxDist: 9300, color: "#ffd400" },
  X_: { mult: 60, minDist: 9300, maxDist: Infinity, color: "#ff4d6d" }
};

export function getRarityIndex(rarity) {
  const index = RARITY_ORDER.indexOf(rarity);
  return index < 0 ? 0 : index;
}

export function getRarityData(rarity) {
  return RARITY_DATA[rarity] || RARITY_DATA.Basic;
}

export function getRarityMult(rarity) {
  return getRarityData(rarity).mult;
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

export function rarityFromDistance(distance) {
  for (const name of RARITY_ORDER) {
    const data = RARITY_DATA[name];
    if (distance >= data.minDist && distance < data.maxDist) {
      return name;
    }
  }
  return "X_";
}

export function rollZoneRarity(distance) {
  const base = rarityFromDistance(distance);
  const index = getRarityIndex(base);
  const roll = Math.random();

  if (roll < 0.2 && index > 0) {
    return RARITY_ORDER[index - 1];
  }
  if (roll > 0.9 && index < RARITY_ORDER.length - 1) {
    return RARITY_ORDER[index + 1];
  }
  return base;
}
