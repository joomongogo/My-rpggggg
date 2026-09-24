import { FUSION_COUNT } from "./constants.js";
import { applyEnhanceDurability, createItem, itemLabel, WEAPON_TYPES } from "./items.js";
import { inventory } from "./loadout.js";
import { getHigherRarity, JOOMONG_ENHANCE_GROWTH, JOOMONG_RARITY, joomongEnhanceMult, X_RARITY } from "./rarity.js";

const FUSION_CHANCE = {
  Basic: 0.9,
  Decent: 0.75,
  Nice: 0.6,
  Great: 0.48,
  Super: 0.38,
  Hyper: 0.28,
  Amber: 0.2,
  Eternal: 0.12
};

let busy = false;

function withBusy(fn) {
  if (busy) {
    return { ok: false, reason: "busy" };
  }
  busy = true;
  try {
    return fn();
  } finally {
    busy = false;
  }
}

export function getFusionChance(rarity) {
  return FUSION_CHANCE[rarity] ?? 0;
}

export function canFuse(type, rarity) {
  return Boolean(getHigherRarity(rarity)) && countItems(type, rarity) >= FUSION_COUNT;
}

export function countItems(type, rarity) {
  return inventory.filter((item) => item.type === type && item.rarity === rarity).length;
}

export function countOwned(player, type, rarity) {
  let total = countItems(type, rarity);
  if (!player) {
    return total;
  }
  for (const slot of player.loadout) {
    if (slot.item && slot.item.type === type && slot.item.rarity === rarity) {
      total += 1;
    }
  }
  return total;
}

export function findJoomong(player, type) {
  if (player) {
    for (const slot of player.loadout) {
      if (slot.item && slot.item.type === type && slot.item.rarity === JOOMONG_RARITY) {
        return slot.item;
      }
    }
  }
  return inventory.find((item) => item.type === type && item.rarity === JOOMONG_RARITY) || null;
}

function takeOwned(player, type, rarity, amount) {
  const taken = [];
  for (let i = inventory.length - 1; i >= 0 && taken.length < amount; i--) {
    const item = inventory[i];
    if (item.type === type && item.rarity === rarity) {
      taken.push(inventory.splice(i, 1)[0]);
    }
  }
  if (player) {
    for (const slot of player.loadout) {
      if (taken.length >= amount) {
        break;
      }
      if (slot.item && slot.item.type === type && slot.item.rarity === rarity) {
        taken.push(slot.item);
        slot.item = null;
        slot.cooldown = 0;
      }
    }
  }
  return taken;
}

function takeItems(type, rarity, amount) {
  const taken = [];
  for (let i = inventory.length - 1; i >= 0 && taken.length < amount; i--) {
    const item = inventory[i];
    if (item.type === type && item.rarity === rarity) {
      taken.push(inventory.splice(i, 1)[0]);
    }
  }
  return taken;
}

export function fuseItems(type, rarity) {
  return withBusy(() => {
    const next = getHigherRarity(rarity);
    if (!next) {
      return { ok: false, reason: "max" };
    }

    if (countItems(type, rarity) < FUSION_COUNT) {
      return { ok: false, reason: "not-enough" };
    }

    takeItems(type, rarity, FUSION_COUNT);
    const success = Math.random() < getFusionChance(rarity);

    if (success) {
      inventory.push(createItem(type, next));
      console.log("[fusion] success", type, rarity, "->", next);
      return { ok: true, success: true, next };
    }

    inventory.push(createItem(type, rarity), createItem(type, rarity));
    console.log("[fusion] fail", type, rarity);
    return { ok: true, success: false };
  });
}

export function craftStatus(player, type) {
  const label = itemLabel(type);
  if (!WEAPON_TYPES.includes(type)) {
    return { ok: false, reason: "Unknown item type.", have: 0, need: FUSION_COUNT };
  }
  if (findJoomong(player, type)) {
    return {
      ok: false,
      reason: `Already own a ${JOOMONG_RARITY} ${label}.`,
      have: countOwned(player, type, X_RARITY),
      need: FUSION_COUNT
    };
  }
  const have = countOwned(player, type, X_RARITY);
  if (have < FUSION_COUNT) {
    return {
      ok: false,
      reason: `Need ${FUSION_COUNT} ${X_RARITY} ${label}, have ${have}.`,
      have,
      need: FUSION_COUNT
    };
  }
  return { ok: true, reason: "", have, need: FUSION_COUNT };
}

export function enhanceStatus(player, type) {
  const label = itemLabel(type);
  const item = findJoomong(player, type);
  if (!item) {
    return { ok: false, reason: `No ${JOOMONG_RARITY} ${label} to enhance.`, have: 0, need: 1, item: null };
  }
  const have = countOwned(player, type, X_RARITY);
  if (have < 1) {
    return {
      ok: false,
      reason: `Need 1 ${X_RARITY} ${label}, have 0.`,
      have,
      need: 1,
      item
    };
  }
  return { ok: true, reason: "", have, need: 1, item };
}

export function craftJoomong(player, type) {
  return withBusy(() => {
    const status = craftStatus(player, type);
    if (!status.ok) {
      return status;
    }
    const taken = takeOwned(player, type, X_RARITY, FUSION_COUNT);
    if (taken.length < FUSION_COUNT) {
      inventory.push(...taken);
      return { ok: false, reason: "not-enough" };
    }
    const made = createItem(type, JOOMONG_RARITY, { enhanceCount: 0 });
    inventory.push(made);
    console.log("[joomong] craft", type);
    return { ok: true, item: made };
  });
}

export function enhanceJoomong(player, type) {
  return withBusy(() => {
    const status = enhanceStatus(player, type);
    if (!status.ok) {
      return status;
    }
    const taken = takeOwned(player, type, X_RARITY, 1);
    if (taken.length < 1) {
      return { ok: false, reason: "not-enough" };
    }
    applyEnhanceDurability(status.item);
    console.log("[joomong] enhance", type, status.item.enhanceCount, joomongEnhanceMult(status.item));
    return { ok: true, item: status.item, enhanceCount: status.item.enhanceCount };
  });
}

export function joomongPreview(type, enhanceCount) {
  return createItem(type, JOOMONG_RARITY, { enhanceCount });
}

export { JOOMONG_ENHANCE_GROWTH, JOOMONG_RARITY, X_RARITY, WEAPON_TYPES };
