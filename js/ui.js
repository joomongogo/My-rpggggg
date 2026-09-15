import { getAllBestiaryEntries, getTotalKills, TYPE_LABEL } from "./bestiary.js";
import { ACTIVE_RADIUS } from "./constants.js";
import { bindDrag } from "./drag.js";
import { canFuse, fuseItems, getFusionChance } from "./fusion.js";
import { inventory } from "./loadout.js";
import { monsters } from "./monsters.js";
import { getRarityClass } from "./rarity.js";
import { isTouchUiVisible } from "./touch.js";
import { scheduleSave } from "./save.js";

let inventoryOpen = false;
let dexOpen = false;
let lastInventoryKey = "";
let lastDexKills = -1;

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

function renderInventory(player) {
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
    const tile = document.createElement("div");
    tile.className = `inventory-tile ${getRarityClass(group.rarity)}`;

    const title = document.createElement("button");
    title.type = "button";
    title.className = "inventory-item";
    title.dataset.itemType = group.type;
    title.dataset.itemRarity = group.rarity;
    title.textContent = `${group.label} ${group.rarity} x${group.count}`;
    tile.appendChild(title);

    if (canFuse(group.type, group.rarity)) {
      const fuse = document.createElement("button");
      fuse.type = "button";
      fuse.className = "fuse-button";
      fuse.textContent = `Fuse ${Math.round(getFusionChance(group.rarity) * 100)}%`;
      fuse.addEventListener("click", (event) => {
        event.stopPropagation();
        fuseItems(group.type, group.rarity);
        scheduleSave(player);
        renderInventory(player);
      });
      tile.appendChild(fuse);
    }

    list.appendChild(tile);
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

function setInventoryOpen(open, player) {
  if (open) {
    dexOpen = false;
    document.getElementById("bestiary-panel")?.classList.remove("visible");
    document.getElementById("dex-button")?.classList.remove("open");
  }
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

function setDexOpen(open) {
  if (open) {
    inventoryOpen = false;
    document.getElementById("inventory-panel")?.classList.remove("visible");
    document.getElementById("bag-button")?.classList.remove("open");
  }
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

export function bindUi(player) {
  bindDrag(player, () => {
    scheduleSave(player);
    if (inventoryOpen) {
      renderInventory(player);
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

  const dexButton = document.getElementById("dex-button");
  if (dexButton) {
    dexButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDexOpen(!dexOpen);
    });
  }

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
    if (key === "b") {
      event.preventDefault();
      setDexOpen(!dexOpen);
    }
  });
}

export function syncUi(player) {
  const level = document.getElementById("hud-level");
  if (level) {
    level.textContent = `LEVEL ${player.level}`;
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
      ? "Move: stick / Bag / Dex"
      : "Move: WASD / Bag: E / Dex: B";
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
  lastInventoryKey = signature;

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
    hintEl.textContent = `Respawning in ${Math.ceil(player.respawnTimer)}`;
  }
}
