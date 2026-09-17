import { getAllBestiaryEntries, getTotalKills, resetBestiary, TYPE_LABEL } from "./bestiary.js";
import { ACTIVE_RADIUS, FUSION_COUNT } from "./constants.js";
import { describeWeapon } from "./combat.js";
import { bindDrag } from "./drag.js";
import { paintItemIcon } from "./draw.js";
import { canFuse, fuseItems, getFusionChance } from "./fusion.js";
import { createItem } from "./items.js";
import { inventory } from "./loadout.js";
import { monsters } from "./monsters.js";
import { getHigherRarity, getRarityClass } from "./rarity.js";
import { isTouchUiVisible } from "./touch.js";
import { scheduleSave, wipeSave, writeSave } from "./save.js";
import { enterArea, getArea } from "./areas.js";
import { resetPlayer } from "./player.js";
import { getRushDifficulties, getRushTimeLeft, isRushActive, stopRush } from "./rush.js";

let inventoryOpen = false;
let fuseOpen = false;
let dexOpen = false;
let lastInventoryKey = "";
let lastFuseKey = "";
let lastDexKills = -1;
let boundPlayer = null;
let uiHooks = {};
let tooltipHold = 0;
let resultTimer = 0;

function setBar(fillId, textId, ratio, text) {
  const fill = document.getElementById(fillId);
  const label = document.getElementById(textId);
  if (fill) {
    fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  }
  if (label) {
    label.textContent = text;
  }
}

function groupInventory() {
  const groups = [];
  for (const item of inventory) {
    const existing = groups.find((group) => group.type === item.type && group.rarity === item.rarity);
    if (existing) {
      existing.count += 1;
    } else {
      groups.push({
        type: item.type,
        rarity: item.rarity,
        label: item.label,
        count: 1
      });
    }
  }
  return groups;
}

function tooltipEl() {
  return document.getElementById("item-tooltip");
}

function hideTooltip() {
  const tip = tooltipEl();
  if (tip) {
    tip.classList.remove("visible");
  }
}

function placeTooltip(event) {
  const tip = tooltipEl();
  if (!tip) {
    return;
  }
  const x = Math.min(window.innerWidth - 220, (event.clientX || 24) + 14);
  const y = Math.min(window.innerHeight - 160, (event.clientY || 24) + 14);
  tip.style.left = `${Math.max(8, x)}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}

function showTooltip(item, event) {
  const tip = tooltipEl();
  if (!tip || !boundPlayer || !item) {
    return;
  }
  tip.innerHTML = describeWeapon(item, boundPlayer).map((line) => `<div>${line}</div>`).join("");
  tip.classList.add("visible");
  placeTooltip(event);
}

function bindItemTooltip(el, getItem) {
  el.addEventListener("mouseenter", (event) => {
    const item = getItem();
    if (item) {
      showTooltip(item, event);
    }
  });
  el.addEventListener("mousemove", (event) => {
    if (tooltipEl()?.classList.contains("visible")) {
      placeTooltip(event);
    }
  });
  el.addEventListener("mouseleave", hideTooltip);
  el.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") {
      return;
    }
    window.clearTimeout(tooltipHold);
    tooltipHold = window.setTimeout(() => {
      const item = getItem();
      if (item) {
        showTooltip(item, event);
      }
    }, 450);
  });
  el.addEventListener("pointerup", () => {
    window.clearTimeout(tooltipHold);
    hideTooltip();
  });
  el.addEventListener("pointercancel", () => {
    window.clearTimeout(tooltipHold);
    hideTooltip();
  });
}

function applyProgressReset(player) {
  stopRush();
  closeRushSelect();
  wipeSave();
  resetBestiary();
  resetPlayer(player);
  enterArea("hub", player);
  writeSave(player);
  lastInventoryKey = "";
  lastFuseKey = "";
  lastDexKills = -1;
  if (inventoryOpen) {
    renderInventory(player);
  }
  if (fuseOpen) {
    renderFuse(player);
  }
  if (dexOpen) {
    renderBestiary();
  }
  showRushBanner("Progress reset.");
}

export function closeRushSelect() {
  document.getElementById("rush-modal")?.classList.remove("visible");
}

export function showRushBanner(text) {
  const el = document.getElementById("rush-result");
  if (!el) {
    return;
  }
  el.textContent = text;
  el.classList.add("visible");
  window.clearTimeout(resultTimer);
  resultTimer = window.setTimeout(() => {
    el.classList.remove("visible");
  }, 2800);
}

function renderRushChoices(player) {
  const host = document.getElementById("rush-choices");
  if (!host) {
    return;
  }
  host.innerHTML = "";
  for (const diff of getRushDifficulties()) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${diff.label} · x${diff.hpMult} · ${diff.maxAlive} mobs`;
    button.addEventListener("click", () => {
      uiHooks.onChooseRush?.(diff.id, player);
    });
    host.appendChild(button);
  }
}

function makeIcon(type, rarity, size = 48) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  paintItemIcon(canvas, createItem(type, rarity));
  return canvas;
}

function renderInventory() {
  const list = document.getElementById("inventory-list");
  if (!list) {
    return;
  }

  const groups = groupInventory();
  list.innerHTML = "";

  if (groups.length === 0) {
    const empty = document.createElement("div");
    empty.className = "inventory-empty";
    empty.textContent = "Bag is empty";
    list.appendChild(empty);
    return;
  }

  for (const group of groups) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `inventory-item ${getRarityClass(group.rarity)}`;
    tile.dataset.itemType = group.type;
    tile.dataset.itemRarity = group.rarity;
    tile.title = `${group.label} ${group.rarity}`;
    tile.appendChild(makeIcon(group.type, group.rarity));
    bindItemTooltip(tile, () => createItem(group.type, group.rarity));
    if (group.count > 1) {
      const count = document.createElement("span");
      count.className = "item-count";
      count.textContent = `x${group.count}`;
      tile.appendChild(count);
    }
    list.appendChild(tile);
  }
}

function renderFuse(player) {
  const list = document.getElementById("fuse-list");
  if (!list) {
    return;
  }

  list.innerHTML = "";
  const groups = groupInventory().filter((group) => canFuse(group.type, group.rarity));

  if (groups.length === 0) {
    const empty = document.createElement("div");
    empty.className = "inventory-empty";
    empty.textContent = `Need ${FUSION_COUNT} of the same weapon.`;
    list.appendChild(empty);
    return;
  }

  for (const group of groups) {
    const next = getHigherRarity(group.rarity);
    const row = document.createElement("div");
    row.className = "fuse-row";

    const from = document.createElement("div");
    from.className = `fuse-preview ${getRarityClass(group.rarity)}`;
    from.appendChild(makeIcon(group.type, group.rarity, 44));
    const fromCount = document.createElement("span");
    fromCount.className = "item-count";
    fromCount.textContent = `x${group.count}`;
    from.appendChild(fromCount);
    bindItemTooltip(from, () => createItem(group.type, group.rarity));
    row.appendChild(from);

    const arrow = document.createElement("div");
    arrow.className = "fuse-arrow";
    arrow.textContent = ">";
    row.appendChild(arrow);

    const to = document.createElement("div");
    to.className = `fuse-preview ${getRarityClass(next)}`;
    to.appendChild(makeIcon(group.type, next, 44));
    bindItemTooltip(to, () => createItem(group.type, next));
    row.appendChild(to);

    const fuse = document.createElement("button");
    fuse.type = "button";
    fuse.className = "fuse-button";
    fuse.textContent = `${Math.round(getFusionChance(group.rarity) * 100)}%`;
    fuse.addEventListener("click", (event) => {
      event.stopPropagation();
      fuseItems(group.type, group.rarity);
      scheduleSave(player);
      renderFuse(player);
      if (inventoryOpen) {
        renderInventory();
      }
    });
    row.appendChild(fuse);
    list.appendChild(row);
  }
}

function renderBestiary() {
  const list = document.getElementById("bestiary-list");
  if (!list) {
    return;
  }
  list.innerHTML = "";
  for (const entry of getAllBestiaryEntries()) {
    const card = document.createElement("div");
    card.className = `bestiary-card ${entry.unlocked ? getRarityClass(entry.rarity) : "locked"}`;
    if (!entry.unlocked) {
      card.innerHTML = `<div class="bestiary-name">???</div><div class="bestiary-meta">${entry.rarity}</div>`;
    } else {
      card.innerHTML =
        `<div class="bestiary-name">${entry.name}</div>` +
        `<div class="bestiary-meta">Kills ${entry.kills} · HP ${entry.hp} · Touch ${entry.contact}/s</div>` +
        `<div class="bestiary-blurb">${entry.blurb}</div>`;
    }
    list.appendChild(card);
  }
}

function closeSidePanels() {
  inventoryOpen = false;
  fuseOpen = false;
  dexOpen = false;
  document.getElementById("inventory-panel")?.classList.remove("visible");
  document.getElementById("fuse-panel")?.classList.remove("visible");
  document.getElementById("bestiary-panel")?.classList.remove("visible");
  document.getElementById("bag-button")?.classList.remove("open");
  document.getElementById("fuse-button")?.classList.remove("open");
  document.getElementById("dex-button")?.classList.remove("open");
}

function setInventoryOpen(open, player) {
  closeSidePanels();
  inventoryOpen = open;
  const panel = document.getElementById("inventory-panel");
  const button = document.getElementById("bag-button");
  if (panel) {
    panel.classList.toggle("visible", inventoryOpen);
  }
  if (button) {
    button.classList.toggle("open", inventoryOpen);
  }
  if (inventoryOpen) {
    renderInventory(player);
  }
}

function setFuseOpen(open, player) {
  closeSidePanels();
  fuseOpen = open;
  const panel = document.getElementById("fuse-panel");
  const button = document.getElementById("fuse-button");
  if (panel) {
    panel.classList.toggle("visible", fuseOpen);
  }
  if (button) {
    button.classList.toggle("open", fuseOpen);
  }
  if (fuseOpen) {
    renderFuse(player);
  }
}

function setDexOpen(open) {
  closeSidePanels();
  dexOpen = open;
  const panel = document.getElementById("bestiary-panel");
  const button = document.getElementById("dex-button");
  if (panel) {
    panel.classList.toggle("visible", dexOpen);
  }
  if (button) {
    button.classList.toggle("open", dexOpen);
  }
  if (dexOpen) {
    renderBestiary();
    lastDexKills = getTotalKills();
  }
}

function syncBossBar(player) {
  const bar = document.getElementById("boss-bar");
  if (!bar) {
    return;
  }

  let boss = null;
  let best = Infinity;
  for (const monster of monsters) {
    if (monster.finished && !monster.undead) {
      continue;
    }
    if (monster.rarity !== "Eternal" && monster.rarity !== "X_") {
      continue;
    }
    const dist = Math.hypot(player.x - monster.x, player.y - monster.y);
    if (dist > ACTIVE_RADIUS) {
      continue;
    }
    if (dist < best) {
      best = dist;
      boss = monster;
    }
  }

  if (!boss) {
    bar.classList.remove("visible");
    return;
  }

  bar.classList.add("visible");
  bar.classList.toggle("rarity-eternal", boss.rarity === "Eternal");
  bar.classList.toggle("rarity-x", boss.rarity === "X_");
  const name = document.getElementById("boss-name");
  const fill = document.getElementById("boss-fill");
  const text = document.getElementById("boss-text");
  if (name) {
    name.textContent = `${boss.rarity} ${TYPE_LABEL[boss.type] || boss.type}`;
  }
  const ratio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
  if (fill) {
    fill.style.width = `${ratio * 100}%`;
  }
  if (text) {
    text.textContent = `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;
  }
}

export function bindUi(player, hooks = {}) {
  boundPlayer = player;
  uiHooks = hooks;

  bindDrag(player, () => {
    scheduleSave(player);
    if (inventoryOpen) {
      renderInventory(player);
    }
    if (fuseOpen) {
      renderFuse(player);
    }
    syncUi(player);
  });

  const bagButton = document.getElementById("bag-button");
  if (bagButton) {
    bagButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setInventoryOpen(!inventoryOpen, player);
    });
  }

  const fuseButton = document.getElementById("fuse-button");
  if (fuseButton) {
    fuseButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setFuseOpen(!fuseOpen, player);
    });
  }

  const dexButton = document.getElementById("dex-button");
  if (dexButton) {
    dexButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDexOpen(!dexOpen);
    });
  }

  const resetButton = document.getElementById("reset-button");
  const confirmModal = document.getElementById("confirm-modal");
  if (resetButton && confirmModal) {
    resetButton.addEventListener("click", (event) => {
      event.preventDefault();
      confirmModal.classList.add("visible");
    });
  }
  document.getElementById("confirm-yes")?.addEventListener("click", () => {
    confirmModal?.classList.remove("visible");
    applyProgressReset(player);
    uiHooks.onResetProgress?.(player);
  });
  document.getElementById("confirm-no")?.addEventListener("click", () => {
    confirmModal?.classList.remove("visible");
  });

  renderRushChoices(player);
  document.getElementById("rush-cancel")?.addEventListener("click", closeRushSelect);

  document.querySelectorAll(".slot-button").forEach((button, index) => {
    bindItemTooltip(button, () => player.loadout[index]?.item);
  });

  document.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }
    if (event.target && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "e") {
      event.preventDefault();
      setInventoryOpen(!inventoryOpen, player);
    }
    if (key === "f") {
      event.preventDefault();
      setFuseOpen(!fuseOpen, player);
    }
    if (key === "b") {
      event.preventDefault();
      setDexOpen(!dexOpen);
    }
    if (key === "escape") {
      closeRushSelect();
      confirmModal?.classList.remove("visible");
      hideTooltip();
    }
  });
}

export function syncUi(player) {
  const level = document.getElementById("hud-level");
  if (level) {
    level.textContent = `LEVEL ${player.level}`;
  }

  const areaLabel = document.getElementById("hud-area");
  if (areaLabel) {
    areaLabel.textContent = getArea().label;
  }

  setBar(
    "hp-fill",
    "hp-text",
    player.hp / player.maxHp,
    `HP ${Math.floor(player.hp)} / ${player.maxHp}`
  );
  setBar(
    "exp-fill",
    "exp-text",
    player.exp / player.maxExp,
    `EXP ${Math.floor(player.exp)} / ${player.maxExp}`
  );

  const hint = document.getElementById("hud-hint");
  if (hint) {
    hint.textContent = isTouchUiVisible()
      ? "Move: stick / Bag / Fuse / Dex"
      : "Move: WASD / Bag: E / Fuse: F / Dex: B";
  }

  const bag = document.getElementById("hud-bag");
  if (bag) {
    bag.textContent = `Bag ${inventory.length}`;
  }

  const bagButton = document.getElementById("bag-button");
  if (bagButton) {
    bagButton.textContent = `Bag ${inventory.length}`;
  }

  const signature = inventory.map((item) => `${item.type}-${item.rarity}`).join("|") +
    player.loadout.map((slot) => slot.item ? `${slot.item.type}-${slot.item.rarity}` : "").join("|");
  if (inventoryOpen && signature !== lastInventoryKey) {
    renderInventory(player);
  }
  if (fuseOpen && signature !== lastFuseKey) {
    renderFuse(player);
  }
  lastInventoryKey = signature;
  lastFuseKey = signature;

  const buttons = document.querySelectorAll(".slot-button");
  buttons.forEach((button, index) => {
    const slot = player.loadout[index];
    const name = button.querySelector(".slot-name");
    const meta = button.querySelector(".slot-meta");
    const cool = button.querySelector(".slot-cool");
    button.className = button.className
      .split(" ")
      .filter((cls) => cls && !cls.startsWith("rarity-"))
      .join(" ");
    button.classList.toggle("empty", !slot.item);

    if (!slot.item) {
      name.textContent = "Empty";
      meta.textContent = "";
      if (cool) {
        cool.style.width = "0%";
      }
      button.style.borderColor = "rgba(255,255,255,0.35)";
      return;
    }

    button.classList.add(getRarityClass(slot.item.rarity));
    name.textContent = slot.item.label;
    meta.textContent = slot.item.rarity;
    button.style.borderColor = "";
    const ratio = slot.item.reload <= 0 ? 1 : 1 - slot.cooldown / slot.item.reload;
    if (cool) {
      cool.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    }
  });

  if (dexOpen) {
    const total = getTotalKills();
    if (total !== lastDexKills) {
      renderBestiary();
      lastDexKills = total;
    }
  }

  syncBossBar(player);

  const overlay = document.getElementById("game-over");
  const hintEl = document.querySelector(".game-over-hint");
  if (overlay) {
    overlay.classList.toggle("visible", player.hp <= 0);
  }
  if (hintEl && player.hp <= 0) {
    hintEl.textContent = `Returning to town in ${Math.ceil(player.respawnTimer)}`;
  }

  const rushTimer = document.getElementById("rush-timer");
  if (rushTimer) {
    const active = isRushActive();
    rushTimer.classList.toggle("visible", active);
    if (active) {
      rushTimer.textContent = `RUSH ${Math.ceil(getRushTimeLeft())}s`;
    }
  }
}
