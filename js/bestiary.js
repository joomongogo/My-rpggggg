import { TYPE_BASE } from "./monsters.js";
import { getMonsterAtkMult, getMonsterHpMult, RARITY_ORDER } from "./rarity.js";

const STORAGE_KEY = "myrpg-bestiary";

export const TYPE_LABEL = {
  slime: "Slime",
  zombie: "Zombie",
  witch: "Witch",
  bat: "Bat",
  golem: "Golem",
  dracula: "Dracula",
  leafbug: "Leafbug"
};

export const TYPE_BLURB = {
  slime: "On death, 60% chance to split into two lower-rarity slimes.",
  zombie: "Swings with extra reach, then stays undead for 5 seconds.",
  witch: "Casts a delayed ground spell under the player.",
  bat: "Fast and frail. Dashes sideways through corridors.",
  golem: "Slow, thick, and fills a hallway. Drops a heavy slam.",
  dracula: "Lunges in for a bite. Drops a fang.",
  leafbug: "Tiny and very fast. Drops a stacking stick."
};

export const MONSTER_TYPES = ["slime", "zombie", "witch", "bat", "golem", "dracula", "leafbug"];

let kills = loadKills();

function loadKills() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveKills() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kills));
  } catch (error) {
    console.log("[bestiary] save failed");
  }
}

export function killKey(type, rarity) {
  return `${type}:${rarity}`;
}

export function recordKill(type, rarity) {
  const key = killKey(type, rarity);
  kills[key] = (kills[key] || 0) + 1;
  saveKills();
  console.log("[bestiary] kill", key, kills[key]);
}

export function resetBestiary() {
  kills = {};
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.log("[bestiary] reset failed");
  }
}

export function getKillCount(type, rarity) {
  return kills[killKey(type, rarity)] || 0;
}

export function getTotalKills() {
  return Object.values(kills).reduce((sum, n) => sum + n, 0);
}

export function getBestiaryEntry(type, rarity) {
  const base = TYPE_BASE[type];
  const hpMult = getMonsterHpMult(rarity);
  const atkMult = getMonsterAtkMult(rarity);
  const count = getKillCount(type, rarity);
  return {
    type,
    rarity,
    name: `${rarity} ${TYPE_LABEL[type]}`,
    kills: count,
    unlocked: count > 0,
    hp: Math.round(base.hp * hpMult),
    contact: Math.round(base.contact * atkMult),
    blurb: TYPE_BLURB[type]
  };
}

export function getAllBestiaryEntries() {
  const rows = [];
  for (const type of MONSTER_TYPES) {
    for (const rarity of RARITY_ORDER) {
      rows.push(getBestiaryEntry(type, rarity));
    }
  }
  return rows;
}
