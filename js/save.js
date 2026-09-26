import { PLAYER_DAMAGE, PLAYER_MAX_HP, PLAYER_REGEN, SLOT_COUNT } from "./constants.js";
import { createItem } from "./items.js";
import { inventory, replaceInventory } from "./loadout.js";
import { JOOMONG_RARITY, RARITY_ORDER } from "./rarity.js";

const STORAGE_KEY = "myrpg-save";
const SAVE_VERSION = 1;
const DEBOUNCE_MS = 2000;
const ITEM_TYPES = new Set(["fang", "mucus", "potion", "dart", "boulder", "head", "stick"]);

let currentPlayer = null;
let saveTimer = null;

function isItemSpec(value) {
  return Boolean(
    value &&
      ITEM_TYPES.has(value.type) &&
      RARITY_ORDER.includes(value.rarity)
  );
}

function serializeItem(item) {
  if (!item || !isItemSpec(item)) {
    return null;
  }
  const spec = { type: item.type, rarity: item.rarity, id: item.id };
  if (Number.isFinite(item.baseDurability)) {
    spec.baseDurability = item.baseDurability;
  }
  if (Number.isFinite(item.durability)) {
    spec.durability = item.durability;
  }
  if (item.rarity === JOOMONG_RARITY) {
    spec.enhanceCount = Math.max(0, Math.floor(item.enhanceCount || 0));
  }
  return spec;
}

function restoreItem(spec) {
  if (!isItemSpec(spec)) {
    return null;
  }
  const extras = { id: spec.id };
  if (Number.isFinite(spec.baseDurability)) {
    extras.baseDurability = spec.baseDurability;
  }
  if (Number.isFinite(spec.durability)) {
    extras.durability = spec.durability;
  }
  if (spec.rarity === JOOMONG_RARITY) {
    extras.enhanceCount = Math.max(0, Math.floor(spec.enhanceCount || 0));
  }
  return createItem(spec.type, spec.rarity, extras);
}

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function inferGrowthCount(value, start, factor) {
  if (!Number.isFinite(value) || !Number.isFinite(start) || start <= 0 || value <= 0) {
    return 0;
  }
  if (value <= start * 1.0001) {
    return 0;
  }
  const n = Math.log(value / start) / Math.log(factor);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.round(n);
}

export function serializeProgress(player) {
  return {
    version: SAVE_VERSION,
    level: player.level,
    exp: player.exp,
    maxExp: player.maxExp,
    hp: player.hp,
    maxHp: player.maxHp,
    hpStat: player.hpStat || 0,
    rangeStat: player.rangeStat || 0,
    knockStat: player.knockStat || 0,
    healStat: player.healStat || 0,
    damage: player.damage,
    damageStat: player.damageStat || 0,
    rangeMult: Number.isFinite(player.rangeMult) ? player.rangeMult : 1,
    knockbackMult: Number.isFinite(player.knockbackMult) ? player.knockbackMult : 1,
    healRate: Number.isFinite(player.healRate) ? player.healRate : 2,
    reloadMult: Number.isFinite(player.reloadMult) ? player.reloadMult : 1,
    reloadStat: player.reloadStat || 0,
    statPoints: player.statPoints || 0,
    loadout: player.loadout.map((slot) => serializeItem(slot.item)),
    inventory: inventory.map(serializeItem).filter(Boolean)
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) {
      return null;
    }
    return data;
  } catch (error) {
    console.log("[save] load failed");
    return null;
  }
}

export function writeSave(player) {
  if (!player) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeProgress(player)));
  } catch (error) {
    console.log("[save] save failed");
  }
}

export function applyProgress(player) {
  const data = loadSave();
  if (!data) {
    return false;
  }

  player.level = Math.max(1, Math.floor(finiteNumber(data.level, player.level)));
  player.maxExp = Math.max(1, Math.floor(finiteNumber(data.maxExp, player.maxExp)));
  player.exp = Math.max(0, finiteNumber(data.exp, player.exp));
  player.maxHp = Math.max(1, Math.floor(finiteNumber(data.maxHp, player.maxHp)));
  player.hp = Math.max(0, Math.min(player.maxHp, finiteNumber(data.hp, player.hp)));
  if (Number.isFinite(data.hpStat)) {
    player.hpStat = Math.max(0, Math.floor(data.hpStat));
  } else {
    player.hpStat = Math.max(0, Math.round((finiteNumber(data.maxHp, PLAYER_MAX_HP) - PLAYER_MAX_HP) / 12));
  }
  if (Number.isFinite(data.damageStat)) {
    player.damageStat = Math.max(0, Math.floor(data.damageStat));
  } else {
    player.damageStat = inferGrowthCount(data.damage, PLAYER_DAMAGE, 1.08);
  }
  player.rangeMult = finiteNumber(data.rangeMult, player.rangeMult || 1);
  if (Number.isFinite(data.rangeStat)) {
    player.rangeStat = Math.max(0, Math.floor(data.rangeStat));
  } else {
    player.rangeStat = inferGrowthCount(player.rangeMult, 1, 1.06);
  }
  player.knockbackMult = finiteNumber(data.knockbackMult, player.knockbackMult || 1);
  if (Number.isFinite(data.knockStat)) {
    player.knockStat = Math.max(0, Math.floor(data.knockStat));
  } else {
    player.knockStat = inferGrowthCount(player.knockbackMult, 1, 1.08);
  }
  player.healRate = finiteNumber(data.healRate, player.healRate || 2);
  if (Number.isFinite(data.healStat)) {
    player.healStat = Math.max(0, Math.floor(data.healStat));
  } else {
    player.healStat = inferGrowthCount(player.healRate, PLAYER_REGEN, 1.08);
  }
  if (Number.isFinite(data.reloadStat)) {
    player.reloadStat = Math.max(0, Math.floor(data.reloadStat));
  } else {
    player.reloadStat = inferGrowthCount(data.reloadMult || 1, 1, 0.9);
  }
  player.statPoints = Math.max(0, Math.floor(finiteNumber(data.statPoints, player.statPoints || 0)));

  const slots = Array.isArray(data.loadout) ? data.loadout : [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    player.loadout[i].item = restoreItem(slots[i]);
    player.loadout[i].cooldown = 0;
  }

  const bag = Array.isArray(data.inventory) ? data.inventory : [];
  replaceInventory(bag.map(restoreItem).filter(Boolean));
  return true;
}

export function scheduleSave(player) {
  if (player) {
    currentPlayer = player;
  }
  if (!currentPlayer || saveTimer) {
    return;
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    writeSave(currentPlayer);
  }, DEBOUNCE_MS);
}

export function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  writeSave(currentPlayer);
}

export function wipeSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.log("[save] wipe failed");
  }
}

export function bindSaveFlush(player) {
  currentPlayer = player;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      flushSave();
    }
  });
  window.addEventListener("pagehide", flushSave);
}
