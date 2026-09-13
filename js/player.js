import {
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_DAMAGE,
  PLAYER_MAX_EXP,
  PLAYER_MAX_HP,
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
    loadout: createLoadout()
  };

  giveStarterLoadout(player);
  return player;
}

export function updatePlayer(player, move, dt) {
  if (player.hp <= 0) {
    return;
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
  if (player.hp <= 0) {
    return;
  }
  player.hp = Math.max(0, player.hp - amount);
}
