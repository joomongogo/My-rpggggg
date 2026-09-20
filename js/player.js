import {
  DAMAGE_STAT_BONUS,
  PLAYER_DAMAGE,
  PLAYER_MAX_EXP,
  PLAYER_MAX_HP,
  PLAYER_REGEN,
  PLAYER_REGEN_DELAY,
  PLAYER_RESPAWN_HP,
  PLAYER_RESPAWN_TIME,
  PLAYER_SIZE,
  PLAYER_SPEED,
  RELOAD_STAT_GROWTH
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
    damageStat: 0,
    rangeMult: 1,
    knockbackMult: 1,
    healRate: PLAYER_REGEN,
    reloadMult: 1,
    reloadStat: 0,
    loadout: createLoadout(),
    hurtTimer: 0,
    respawnTimer: 0,
    knockX: 0,
    knockY: 0,
    statPoints: 0
  };

  if (!applyProgress(player)) {
    giveStarterLoadout(player);
  } else if (player.hp <= 0) {
    player.hp = player.maxHp;
    player.respawnTimer = 0;
  }
  syncDerivedStats(player);
  return player;
}

export function resetPlayer(player) {
  player.level = 1;
  player.exp = 0;
  player.maxExp = PLAYER_MAX_EXP;
  player.maxHp = PLAYER_MAX_HP;
  player.hp = PLAYER_MAX_HP;
  player.damageStat = 0;
  player.reloadStat = 0;
  player.rangeMult = 1;
  player.knockbackMult = 1;
  player.healRate = PLAYER_REGEN;
  player.hurtTimer = 0;
  player.respawnTimer = 0;
  player.knockX = 0;
  player.knockY = 0;
  player.statPoints = 0;
  for (const slot of player.loadout) {
    slot.item = null;
    slot.cooldown = 0;
  }
  replaceInventory([]);
  giveStarterLoadout(player);
  syncDerivedStats(player);
}

export function syncDerivedStats(player) {
  if (!player) {
    return;
  }
  player.damageStat = Math.max(0, Math.floor(player.damageStat || 0));
  player.reloadStat = Math.max(0, Math.floor(player.reloadStat || 0));
  player.damage = PLAYER_DAMAGE * (1 + player.damageStat * DAMAGE_STAT_BONUS);
  player.reloadMult = RELOAD_STAT_GROWTH ** player.reloadStat;
}

export function damageStatMultiplier(player) {
  return 1 + Math.max(0, player.damageStat || 0) * DAMAGE_STAT_BONUS;
}

export function reloadStatMultiplier(player) {
  return RELOAD_STAT_GROWTH ** Math.max(0, player.reloadStat || 0);
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
    healPlayer(player, (player.healRate || PLAYER_REGEN) * dt);
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
    player.statPoints = (player.statPoints || 0) + 1;
    console.log("[player] level", player.level, "points", player.statPoints);
  }
}

export const STAT_CHOICES = [
  { id: "hp", label: "Health", detail: "+12 max HP" },
  { id: "damage", label: "Damage", detail: "+4% weapon damage" },
  { id: "range", label: "Range", detail: "+6% attack range" },
  { id: "knockback", label: "Knockback", detail: "+8% knockback" },
  { id: "heal", label: "Heal speed", detail: "+8% regen" },
  { id: "reload", label: "Reload", detail: "-3% reload time" }
];

export function applyStatChoice(player, stat) {
  if (!player || (player.statPoints || 0) <= 0) {
    return false;
  }

  if (stat === "hp") {
    player.maxHp += 12;
    player.hp = Math.min(player.maxHp, player.hp + 12);
  } else if (stat === "damage") {
    player.damageStat = (player.damageStat || 0) + 1;
  } else if (stat === "range") {
    player.rangeMult = (player.rangeMult || 1) * 1.06;
  } else if (stat === "knockback") {
    player.knockbackMult = (player.knockbackMult || 1) * 1.08;
  } else if (stat === "heal") {
    player.healRate = (player.healRate || PLAYER_REGEN) * 1.08;
  } else if (stat === "reload") {
    player.reloadStat = (player.reloadStat || 0) + 1;
  } else {
    return false;
  }

  player.statPoints -= 1;
  syncDerivedStats(player);
  console.log("[player] chose", stat, "points", player.statPoints);
  return true;
}

export function spentStatPoints(player) {
  return Math.max(0, player.level - 1 - (player.statPoints || 0));
}

export function refundStats(player) {
  const total = Math.max(0, player.level - 1);
  const ratio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
  player.maxHp = PLAYER_MAX_HP;
  player.hp = Math.max(1, Math.min(PLAYER_MAX_HP, Math.round(PLAYER_MAX_HP * ratio)));
  player.damageStat = 0;
  player.reloadStat = 0;
  player.rangeMult = 1;
  player.knockbackMult = 1;
  player.healRate = PLAYER_REGEN;
  player.statPoints = total;
  syncDerivedStats(player);
  console.log("[player] refund stats", total);
  return total;
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
