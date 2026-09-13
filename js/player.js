import {
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_DAMAGE,
  PLAYER_MAX_EXP,
  PLAYER_MAX_HP,
  PLAYER_REGEN,
  PLAYER_REGEN_DELAY,
  PLAYER_RESPAWN_HP,
  PLAYER_RESPAWN_TIME,
  PLAYER_SIZE,
  PLAYER_SPEED,
  SPAWN_X,
  SPAWN_Y
} from "./constants.js";
import { createLoadout, giveStarterLoadout } from "./loadout.js";

export function createPlayer() {
  const player = {
    x: SPAWN_X,
    y: SPAWN_Y,
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
    respawnTimer: 0
  };

  giveStarterLoadout(player);
  return player;
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
  player.x += move.x * frameSpeed;
  player.y += move.y * frameSpeed;

  player.x = Math.max(player.size, Math.min(MAP_WIDTH - player.size, player.x));
  player.y = Math.max(player.size, Math.min(MAP_HEIGHT - player.size, player.y));
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

export function respawnPlayer(player) {
  player.x = SPAWN_X;
  player.y = SPAWN_Y;
  player.hp = Math.max(1, Math.floor(player.maxHp * PLAYER_RESPAWN_HP));
  player.hurtTimer = PLAYER_REGEN_DELAY;
  player.respawnTimer = 0;
  console.log("[player] respawn");
}

export function maybeRespawn(player) {
  if (player.hp <= 0 && player.respawnTimer <= 0) {
    respawnPlayer(player);
  }
}
