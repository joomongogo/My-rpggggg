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
  Decent: { mult: 1.6, minDist: 900, maxDist: 1800, color: "#4caf50" },
  Nice: { mult: 2.6, minDist: 1800, maxDist: 2800, color: "#42a5f5" },
  Great: { mult: 4.2, minDist: 2800, maxDist: 3900, color: "#8e24aa" },
  Super: { mult: 7, minDist: 3900, maxDist: 5100, color: "#e53935" },
  Hyper: { mult: 12, minDist: 5100, maxDist: 6400, color: "#ec407a" },
  Amber: { mult: 20, minDist: 6400, maxDist: 7800, color: "#fb8c00" },
  Eternal: { mult: 35, minDist: 7800, maxDist: 9300, color: "#f6c343" },
  X_: { mult: 60, minDist: 9300, maxDist: Infinity, color: "#111111" }
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

export function getRarityColor(rarity) {
  return getRarityData(rarity).color;
}

export function getLowerRarity(rarity) {
  const index = getRarityIndex(rarity);
  if (index <= 0) {
    return null;
  }
  return RARITY_ORDER[index - 1];
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
