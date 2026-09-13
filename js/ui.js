import { inventory, tapSlot } from "./loadout.js";
import { getRarityColor } from "./rarity.js";
import { isTouchUiVisible } from "./touch.js";

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

export function bindUi(player) {
  const buttons = document.querySelectorAll(".slot-button");
  buttons.forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const index = Number(button.dataset.slot);
      tapSlot(player, index);
      syncUi(player);
    });
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
      ? "이동: 스와이프 / 슬롯 버튼으로 장착 교체"
      : "이동: WASD / 방향키 · 슬롯 클릭으로 교체";
  }

  const bag = document.getElementById("hud-bag");
  if (bag) {
    bag.textContent = `가방 ${inventory.length}`;
  }

  const buttons = document.querySelectorAll(".slot-button");
  buttons.forEach((button, index) => {
    const slot = player.loadout[index];
    const name = button.querySelector(".slot-name");
    const meta = button.querySelector(".slot-meta");
    const cool = button.querySelector(".slot-cool");
    button.classList.toggle("empty", !slot.item);

    if (!slot.item) {
      name.textContent = "빈 칸";
      meta.textContent = "";
      if (cool) {
        cool.style.width = "0%";
      }
      button.style.borderColor = "rgba(255,255,255,0.35)";
      return;
    }

    name.textContent = slot.item.label;
    meta.textContent = slot.item.rarity;
    button.style.borderColor = getRarityColor(slot.item.rarity);
    const ratio = slot.item.reload <= 0 ? 1 : 1 - slot.cooldown / slot.item.reload;
    if (cool) {
      cool.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    }
  });

  const overlay = document.getElementById("game-over");
  if (overlay) {
    overlay.classList.toggle("visible", player.hp <= 0);
  }
}
