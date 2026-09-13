import { bindInput, getMoveVector } from "./input.js";
import { updateCamera } from "./camera.js";
import { drawWorld } from "./world.js";
import { createPlayer, updatePlayer, addExperience, maybeRespawn } from "./player.js";
import { monsters, updateMonsters, removeFinishedMonsters } from "./monsters.js";
import { populateWorld, queueRespawn, spawnSplitSlimes, updateRespawns } from "./spawn.js";
import { drops, spawnDrop, updateDrops } from "./drops.js";
import { tickCombat } from "./combat.js";
import { bindUi, syncUi } from "./ui.js";
import {
  drawDrops,
  drawEffects,
  drawLoadout,
  drawMonsters,
  drawPlayer
} from "./draw.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resize();
window.addEventListener("resize", resize);

const player = createPlayer();
populateWorld(player);
bindInput();
bindUi(player);

function onMonsterResolved(monster, result) {
  if (result.split) {
    spawnSplitSlimes(result.split);
    return;
  }

  addExperience(player, result.exp || 0);
  if (result.drop) {
    spawnDrop(result.drop, monster.rarity, monster.x, monster.y);
  }
  queueRespawn(monster);
}

let lastTime = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  updatePlayer(player, getMoveVector(), dt);
  maybeRespawn(player);
  updateCamera(player, canvas);
  updateMonsters(player, dt, onMonsterResolved);
  tickCombat(player, monsters, dt, onMonsterResolved);
  updateDrops(player, dt);
  updateRespawns(player, dt);
  removeFinishedMonsters();

  drawWorld(ctx, canvas);
  const time = now / 1000;
  drawDrops(ctx, canvas, drops, time);
  drawMonsters(ctx, canvas, monsters, player, time);
  drawEffects(ctx, canvas);
  drawPlayer(ctx, player);
  drawLoadout(ctx, player, time);
  syncUi(player);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
