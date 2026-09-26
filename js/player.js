import {
  DAMAGE_STAT_BONUS,
  HEAL_STAT_BONUS,
  HP_STAT_BONUS,
  KNOCK_STAT_BONUS,
  PLAYER_DAMAGE,
  PLAYER_MAX_EXP,
  PLAYER_MAX_HP,
  PLAYER_REGEN,
  PLAYER_REGEN_DELAY,
  PLAYER_RESPAWN_HP,
  PLAYER_RESPAWN_TIME,
  PLAYER_SIZE,
  PLAYER_SPEED,
  RANGE_STAT_BONUS,
  RELOAD_STAT_BASE,
  STAT_LEVEL_BONUS,
  STAT_LEVEL_STEP
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
    hpStat: 0,
    rangeStat: 0,
    knockStat: 0,
    healStat: 0,
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
  player.hpStat = 0;
  player.rangeStat = 0;
  player.knockStat = 0;
  player.healStat = 0;
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

export function statUpgradeBonus(player) {
  return Math.max(0, Math.floor((player?.level || 1) / STAT_LEVEL_STEP)) * STAT_LEVEL_BONUS;
}

function countOf(player, key) {
  return Math.max(0, Math.floor(player?.[key] || 0));
}

export function damagePerPoint(player) {
  return DAMAGE_STAT_BONUS + statUpgradeBonus(player);
}

export function reloadPerPoint(player) {
  return Math.min(0.99, RELOAD_STAT_BASE + statUpgradeBonus(player));
}

export function rangePerPoint(player) {
  return RANGE_STAT_BONUS + statUpgradeBonus(player);
}

export function knockPerPoint(player) {
  return KNOCK_STAT_BONUS + statUpgradeBonus(player);
}

export function healPerPoint(player) {
  return HEAL_STAT_BONUS + statUpgradeBonus(player);
}

export function hpPerPoint(player) {
  return HP_STAT_BONUS * (1 + statUpgradeBonus(player));
}

export function syncDerivedStats(player) {
  if (!player) {
    return;
  }
  player.damageStat = countOf(player, "damageStat");
  player.reloadStat = countOf(player, "reloadStat");
  player.hpStat = countOf(player, "hpStat");
  player.rangeStat = countOf(player, "rangeStat");
  player.knockStat = countOf(player, "knockStat");
  player.healStat = countOf(player, "healStat");

  player.damage = PLAYER_DAMAGE * damageStatMultiplier(player);
  player.reloadMult = reloadStatMultiplier(player);
  player.rangeMult = (1 + rangePerPoint(player)) ** player.rangeStat;
  player.knockbackMult = (1 + knockPerPoint(player)) ** player.knockStat;
  player.healRate = PLAYER_REGEN * (1 + healPerPoint(player)) ** player.healStat;

  const newMax = PLAYER_MAX_HP + player.hpStat * hpPerPoint(player);
  player.maxHp = newMax;
  player.hp = Math.max(0, Math.min(newMax, player.hp));
}

export function damageStatMultiplier(player) {
  return 1 + countOf(player, "damageStat") * damagePerPoint(player);
}

export function reloadStatMultiplier(player) {
  return (1 - reloadPerPoint(player)) ** countOf(player, "reloadStat");
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
    syncDerivedStats(player);
    console.log("[player] level", player.level, "points", player.statPoints);
  }
}

function formatPct(value) {
  const pct = value * 100;
  if (Math.abs(pct - Math.round(pct)) < 0.05) {
    return `${Math.round(pct)}`;
  }
  return pct.toFixed(1);
}

export function getStatChoices(player) {
  return [
    { id: "hp", label: "Health", detail: `+${hpPerPoint(player).toFixed(1)} max HP` },
    { id: "damage", label: "Damage", detail: `+${formatPct(damagePerPoint(player))}% weapon damage` },
    { id: "range", label: "Range", detail: `+${formatPct(rangePerPoint(player))}% attack range` },
    { id: "knockback", label: "Knockback", detail: `+${formatPct(knockPerPoint(player))}% knockback` },
    { id: "heal", label: "Heal speed", detail: `+${formatPct(healPerPoint(player))}% regen` },
    { id: "reload", label: "Reload", detail: `-${formatPct(reloadPerPoint(player))}% reload time` }
  ];
}

export const STAT_CHOICES = getStatChoices({ level: 1 });

export function applyStatChoice(player, stat) {
  if (!player || (player.statPoints || 0) <= 0) {
    return false;
  }

  if (stat === "hp") {
    player.hpStat = (player.hpStat || 0) + 1;
  } else if (stat === "damage") {
    player.damageStat = (player.damageStat || 0) + 1;
  } else if (stat === "range") {
    player.rangeStat = (player.rangeStat || 0) + 1;
  } else if (stat === "knockback") {
    player.knockStat = (player.knockStat || 0) + 1;
  } else if (stat === "heal") {
    player.healStat = (player.healStat || 0) + 1;
  } else if (stat === "reload") {
    player.reloadStat = (player.reloadStat || 0) + 1;
  } else {
    return false;
  }

  const oldMax = player.maxHp;
  player.statPoints -= 1;
  syncDerivedStats(player);
  if (stat === "hp") {
    player.hp = Math.min(player.maxHp, player.hp + (player.maxHp - oldMax));
  }
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
  player.hpStat = 0;
  player.rangeStat = 0;
  player.knockStat = 0;
  player.healStat = 0;
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
