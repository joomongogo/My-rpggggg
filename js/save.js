import { SLOT_COUNT } from "./constants.js";
import { createItem } from "./items.js";
import { inventory, replaceInventory } from "./loadout.js";
import { RARITY_ORDER } from "./rarity.js";

const STORAGE_KEY = "myrpg-save";
const SAVE_VERSION = 1;
const DEBOUNCE_MS = 2000;
const ITEM_TYPES = new Set(["fang", "mucus", "potion", "dart", "boulder"]);

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
  return { type: item.type, rarity: item.rarity };
}

function restoreItem(spec) {
  if (!isItemSpec(spec)) {
    return null;
  }
  return createItem(spec.type, spec.rarity);
}

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function serializeProgress(player) {
  return {
    version: SAVE_VERSION,
    level: player.level,
    exp: player.exp,
    maxExp: player.maxExp,
    hp: player.hp,
    maxHp: player.maxHp,
    damage: player.damage,
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
  player.damage = Math.max(1, finiteNumber(data.damage, player.damage));

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

export function bindSaveFlush(player) {
  currentPlayer = player;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      flushSave();
    }
  });
  window.addEventListener("pagehide", flushSave);
}
