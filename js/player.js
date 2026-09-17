import {
  PLAYER_DAMAGE,
  PLAYER_MAX_EXP,
  PLAYER_MAX_HP,
  PLAYER_REGEN,
  PLAYER_REGEN_DELAY,
  PLAYER_RESPAWN_HP,
  PLAYER_RESPAWN_TIME,
  PLAYER_SIZE,
  PLAYER_SPEED
} from "./constants.js";
import { createLoadout, giveStarterLoadout, replaceInventory } from "./loadout.js";
import { moveWithSlide } from "./map.js";
import { applyProgress } from "./save.js";

export function createPlayer() {
  const player = {
    x: 2000,
    y: 2000,
    size: PLAYER_SIZE,
    speed: PLAYER_SPEED,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    exp: 0,
    maxExp: PLAYER_MAX_EXP,
    level: 1,
    damage: PLAYER_DAMAGE,
    loadout: createLoadout(),
    hurtTimer: 0,
    respawnTimer: 0,
    knockX: 0,
    knockY: 0
  };

  if (!applyProgress(player)) {
    giveStarterLoadout(player);
  } else if (player.hp <= 0) {
    player.hp = player.maxHp;
    player.respawnTimer = 0;
  }
  return player;
}

export function resetPlayer(player) {
  player.level = 1;
  player.exp = 0;
  player.maxExp = PLAYER_MAX_EXP;
  player.maxHp = PLAYER_MAX_HP;
  player.hp = PLAYER_MAX_HP;
  player.damage = PLAYER_DAMAGE;
  player.hurtTimer = 0;
  player.respawnTimer = 0;
  player.knockX = 0;
  player.knockY = 0;
  for (const slot of player.loadout) {
    slot.item = null;
    slot.cooldown = 0;
  }
  replaceInventory([]);
  giveStarterLoadout(player);
}

export function applyPlayerKnockback(player, fromX, fromY, force) {
  const dx = player.x - fromX;
  const dy = player.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  player.knockX += (dx / len) * force;
  player.knockY += (dy / len) * force;
}

export function updatePlayer(player, move, dt) {
  if (player.hp <= 0) {
    if (player.respawnTimer > 0) {
      player.respawnTimer = Math.max(0, player.respawnTimer - dt);
    }
    return;
  }

  player.hurtTimer = Math.max(0, player.hurtTimer - dt);
  if (player.hurtTimer <= 0) {
    healPlayer(player, PLAYER_REGEN * dt);
  }

  const frameSpeed = player.speed * 60 * dt;
  const next = moveWithSlide(
    player.x,
    player.y,
    move.x * frameSpeed + player.knockX,
    move.y * frameSpeed + player.knockY,
    player.size
  );
  player.x = next.x;
  player.y = next.y;
  player.knockX *= Math.max(0, 1 - dt * 8);
  player.knockY *= Math.max(0, 1 - dt * 8);
  if (Math.hypot(player.knockX, player.knockY) < 0.4) {
    player.knockX = 0;
    player.knockY = 0;
  }
}

export function addExperience(player, amount) {
  if (amount <= 0 || player.hp <= 0) {
    return;
  }

  player.exp += amount;

  while (player.exp >= player.maxExp) {
    player.exp -= player.maxExp;
    player.level++;
    player.maxExp = Math.floor(player.maxExp * 1.25);
    player.maxHp += 10;
    player.hp = player.maxHp;

    const growth = 0.05 + Math.random() * 0.05;
    player.damage *= 1 + growth;
    console.log("[player] level", player.level, "damage", player.damage.toFixed(1));
  }
}

export function healPlayer(player, amount) {
  if (player.hp <= 0) {
    return;
  }
  player.hp = Math.min(player.maxHp, player.hp + amount);
}

export function damagePlayer(player, amount) {
  if (player.hp <= 0 || amount <= 0) {
    return;
  }
  player.hp = Math.max(0, player.hp - amount);
  player.hurtTimer = PLAYER_REGEN_DELAY;
  if (player.hp <= 0) {
    player.respawnTimer = PLAYER_RESPAWN_TIME;
    console.log("[player] down");
  }
}

export function respawnPlayer(player, x, y) {
  player.hp = Math.max(1, Math.floor(player.maxHp * PLAYER_RESPAWN_HP));
  player.hurtTimer = PLAYER_REGEN_DELAY;
  player.respawnTimer = 0;
  player.knockX = 0;
  player.knockY = 0;
  if (Number.isFinite(x) && Number.isFinite(y)) {
    player.x = x;
    player.y = y;
  }
  console.log("[player] respawn");
}

export function maybeRespawn() {}
