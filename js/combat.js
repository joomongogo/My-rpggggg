import { EFFECT_LIFETIME, HEAD_KNOCKBACK, PLAYER_DAMAGE, PLAYER_REGEN } from "./constants.js";
import { healPlayer } from "./player.js";
import { countEquippedOfType } from "./loadout.js";
import { applyMonsterHit, applySlow, canBeHit } from "./monsters.js";
import { getRarityIndex } from "./rarity.js";
import { moveWithSlide } from "./map.js";

function scaled(player, amount) {
  return amount * (player.damage / PLAYER_DAMAGE);
}

function stickBonusOf(item) {
  if (item.stickBonus != null) {
    return item.stickBonus;
  }
  return 2 + getRarityIndex(item.rarity) * 2;
}

function stickDamage(player, item) {
  const count = Math.max(1, countEquippedOfType(player, "stick"));
  return scaled(player, 6 + count * stickBonusOf(item));
}

function knockbackMonster(monster, fromX, fromY, force) {
  const dx = monster.x - fromX;
  const dy = monster.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  const next = moveWithSlide(monster.x, monster.y, (dx / len) * force, (dy / len) * force, monster.size * 0.85);
  monster.x = next.x;
  monster.y = next.y;
}

export const effects = [];

function addEffect(effect) {
  effects.push({
    ...effect,
    life: EFFECT_LIFETIME
  });
}

function livingTargets(monsterList) {
  return monsterList.filter((monster) => canBeHit(monster) || monster.undead);
}

function distanceTo(player, monster) {
  return Math.hypot(player.x - monster.x, player.y - monster.y);
}

function enemiesInRange(player, monsterList, range) {
  return livingTargets(monsterList).filter((monster) => {
    if (!canBeHit(monster)) {
      return false;
    }
    return distanceTo(player, monster) < range + monster.size;
  });
}

function closest(player, targets) {
  let best = null;
  let bestDist = Infinity;
  for (const target of targets) {
    const dist = distanceTo(player, target);
    if (dist < bestDist) {
      best = target;
      bestDist = dist;
    }
  }
  return best;
}

function fireFang(item, player, target, onResolved, monsterList) {
  const dealt = applyMonsterHit(target, scaled(player, item.damage), player, onResolved);
  if (dealt > 0) {
    healPlayer(player, dealt * item.lifesteal * ((player.healRate || PLAYER_REGEN) / PLAYER_REGEN));
    addEffect({
      type: "fang",
      x: target.x,
      y: target.y,
      radius: 16
    });
  }
}

function fireMucus(item, player, target, onResolved) {
  const dealt = applyMonsterHit(target, scaled(player, item.damage), player, onResolved);
  if (dealt > 0 || canBeHit(target)) {
    applySlow(target, item.slow, item.slowDuration);
    addEffect({
      type: "mucus",
      x: target.x,
      y: target.y,
      radius: 18
    });
  }
}

function fireBolt(item, target, onResolved, player) {
  const amount = item.type === "stick" ? stickDamage(player, item) : scaled(player, item.damage);
  const dealt = applyMonsterHit(target, amount, player, onResolved);
  if (dealt > 0) {
    if (item.type === "head") {
      knockbackMonster(
        target,
        player.x,
        player.y,
        (item.knockback || HEAD_KNOCKBACK) * (player.knockbackMult || 1)
      );
    }
    addEffect({
      type: item.type,
      x: target.x,
      y: target.y,
      radius: item.type === "boulder" ? 22 : 12
    });
  }
}

function firePotion(item, player, targets, onResolved) {
  const center = closest(player, targets);
  if (!center) {
    return;
  }

  addEffect({
    type: "potion",
    x: center.x,
    y: center.y,
    radius: item.aoeRadius * (player.rangeMult || 1)
  });

  const amount = scaled(player, item.damage);
  const aoe = item.aoeRadius * (player.rangeMult || 1);
  for (const target of targets) {
    const dist = Math.hypot(center.x - target.x, center.y - target.y);
    if (dist < aoe + target.size) {
      applyMonsterHit(target, amount, player, onResolved);
    }
  }
}

export function tickCombat(player, monsterList, dt, onResolved) {
  if (player.hp <= 0) {
    return;
  }

  for (const slot of player.loadout) {
    if (!slot.item) {
      continue;
    }

    slot.cooldown = Math.max(0, slot.cooldown - dt);
    if (slot.cooldown > 0) {
      continue;
    }

    const item = slot.item;
    const range = item.range * (player.rangeMult || 1);
    const targets = enemiesInRange(player, monsterList, range);
    if (targets.length === 0) {
      continue;
    }

    if (item.type === "potion") {
      firePotion(item, player, targets, onResolved);
    } else {
      const target = closest(player, targets);
      if (item.type === "fang") {
        fireFang(item, player, target, onResolved, monsterList);
      } else if (item.type === "mucus") {
        fireMucus(item, player, target, onResolved);
      } else {
        fireBolt(item, target, onResolved, player);
      }
    }

    slot.cooldown = item.reload * (player.reloadMult || 1);
  }

  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].life -= dt;
    if (effects[i].life <= 0) {
      effects.splice(i, 1);
    }
  }
}

export function weaponDamage(item, player) {
  if (!item) {
    return 0;
  }
  if (item.type === "stick") {
    return stickDamage(player, item);
  }
  return scaled(player, item.damage);
}

export function describeWeapon(item, player) {
  if (!item) {
    return ["Empty"];
  }

  const lines = [`${item.label} · ${item.rarity}`];
  lines.push(`Damage ${weaponDamage(item, player).toFixed(1)}`);
  lines.push(`Range ${Math.round(item.range * (player.rangeMult || 1))}`);
  lines.push(`Reload ${(item.reload * (player.reloadMult || 1)).toFixed(2)}s`);

  if (item.type === "fang") {
    const heal = (item.lifesteal || 0) * ((player.healRate || PLAYER_REGEN) / PLAYER_REGEN);
    lines.push(`Lifesteal ${Math.round(heal * 100)}%`);
  }
  if (item.type === "mucus") {
    lines.push(`Slow ${Math.round((item.slow || 0) * 100)}% for ${(item.slowDuration || 0).toFixed(1)}s`);
  }
  if (item.type === "potion") {
    lines.push(`AoE ${Math.round(item.aoeRadius * (player.rangeMult || 1))}`);
  }
  if (item.type === "head") {
    lines.push(`Knockback ${Math.round((item.knockback || HEAD_KNOCKBACK) * (player.knockbackMult || 1))}`);
  }
  if (item.type === "stick") {
    const count = Math.max(1, countEquippedOfType(player, "stick"));
    const bonus = stickBonusOf(item);
    lines.push(`Stick bonus +${bonus} each`);
    lines.push(`Sticks equipped x${count}`);
  }

  return lines;
}
