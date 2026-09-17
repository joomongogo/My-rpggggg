import { recordKill } from "./bestiary.js";
import { bindInput, getMoveVector } from "./input.js";
import { updateCamera } from "./camera.js";
import { drawPortals, drawWorld } from "./world.js";
import { createPlayer, updatePlayer, addExperience, respawnPlayer } from "./player.js";
import { monsters, updateMonsters, removeFinishedMonsters } from "./monsters.js";
import { queueRespawn, spawnSplitSlimes, updateRespawns } from "./spawn.js";
import { drops, spawnDrop, updateDrops } from "./drops.js";
import { tickCombat } from "./combat.js";
import { bindUi, closeRushSelect, showRushBanner, syncUi } from "./ui.js";
import { bindSaveFlush, scheduleSave } from "./save.js";
import { drawMinimap } from "./minimap.js";
import {
  drawDrops,
  drawEffects,
  drawLoadout,
  drawMonsters,
  drawPlayer
} from "./draw.js";
import { canUsePortal, enterArea, getArea, isSafeZone, lockPortals, updatePortalLock } from "./areas.js";
import { PORTAL_RADIUS } from "./constants.js";
import { addItemToPlayer } from "./loadout.js";
import { beginRush, isRushActive, takeRushReward, updateRush } from "./rush.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resize();
window.addEventListener("resize", resize);

const player = createPlayer();
enterArea("hub", player);
bindInput();
bindUi(player, {
  onChooseRush(difficulty) {
    closeRushSelect();
    enterArea("rush", player);
    beginRush(difficulty);
  },
  onResetProgress() {
    scheduleSave(player);
  }
});
bindSaveFlush(player);

function onMonsterResolved(monster, result) {
  if (result.split) {
    spawnSplitSlimes(result.split, monster);
    return;
  }

  addExperience(player, result.exp || 0);
  scheduleSave(player);
  recordKill(monster.type, monster.rarity);
  if (result.drop) {
    spawnDrop(result.drop, monster.rarity, monster.x, monster.y);
  }
  queueRespawn(monster);
}

function concludeRush(success) {
  const reward = takeRushReward(success);
  enterArea("hub", player);
  if (player.hp <= 0) {
    respawnPlayer(player, getArea().spawnX, getArea().spawnY);
  }
  if (success) {
    addExperience(player, reward.exp);
    for (const item of reward.items) {
      addItemToPlayer(player, item);
    }
    showRushBanner(`${reward.label} rush complete. +${reward.exp} EXP`);
  } else {
    showRushBanner("Rush failed. Returned to town.");
  }
  scheduleSave(player);
}

function tryPortals() {
  if (player.hp <= 0 || !canUsePortal()) {
    return;
  }
  const area = getArea();
  for (const portal of area.portals || []) {
    if (Math.hypot(player.x - portal.x, player.y - portal.y) >= PORTAL_RADIUS) {
      continue;
    }
    if (portal.target === "rush") {
      document.getElementById("rush-modal")?.classList.add("visible");
      player.x = area.spawnX;
      player.y = area.spawnY;
      lockPortals(1.4);
      return;
    }
    enterArea(portal.target, player);
    return;
  }
}

function handleDeath() {
  if (player.hp > 0) {
    return;
  }
  if (isRushActive()) {
    concludeRush(false);
    return;
  }
  if (player.respawnTimer > 0) {
    return;
  }
  const area = getArea();
  if (area.id !== "hub") {
    enterArea("hub", player);
  }
  respawnPlayer(player, getArea().spawnX, getArea().spawnY);
  scheduleSave(player);
}

let lastTime = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  updatePortalLock(dt);
  updatePlayer(player, getMoveVector(), dt);
  tryPortals();
  handleDeath();
  updateCamera(player, canvas);
  updateMonsters(player, dt, onMonsterResolved, isSafeZone(player.x, player.y));
  tickCombat(player, monsters, dt, onMonsterResolved);
  updateDrops(player, dt);
  updateRespawns(player, dt);
  if (isRushActive()) {
    const result = updateRush(player, dt);
    if (result === "fail") {
      concludeRush(false);
    } else if (result === "success") {
      concludeRush(true);
    }
  }
  removeFinishedMonsters();
  scheduleSave(player);

  drawWorld(ctx, canvas);
  drawPortals(ctx);
  const time = now / 1000;
  drawDrops(ctx, canvas, drops, time);
  drawMonsters(ctx, canvas, monsters, player, time);
  drawEffects(ctx, canvas);
  drawPlayer(ctx, player);
  drawLoadout(ctx, player, time);
  syncUi(player);
  drawMinimap(player, monsters);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
