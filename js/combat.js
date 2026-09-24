import { EFFECT_LIFETIME, HEAD_KNOCKBACK, MIN_RELOAD_TIME } from "./constants.js";
import { canExtraHit, restoreDurability, spendDurability } from "./items.js";
import { damageStatMultiplier, healPlayer, reloadStatMultiplier } from "./player.js";
import { countEquippedOfType } from "./loadout.js";
import { applyMonsterHit, applySlow, canBeHit, monsterHardness } from "./monsters.js";
import {
  fangHealOf,
  formatCompact,
  itemMaxDurability,
  JOOMONG_CRAFT_GROWTH,
  JOOMONG_RARITY,
  joomongAttackMult,
  joomongEnhanceMult,
  joomongReloadMult,
  weaponDamageByRarity,
  weaponRarityLevel
} from "./rarity.js";
import { moveWithSlide } from "./map.js";

function rarityDamage(item) {
  const base = Number.isFinite(item.baseDamage) ? item.baseDamage : item.damage;
  return weaponDamageByRarity(base, item.rarity);
}

function scaled(player, amount) {
  return amount * damageStatMultiplier(player);
}

function attackMult(item) {
  return joomongAttackMult(item);
}

function stickBonusOf(item) {
  const level = weaponRarityLevel(item.rarity);
  const bonus = item.stickBonus != null
    ? item.stickBonus
    : weaponDamageByRarity(2 + level * 2, item.rarity);
  return bonus * attackMult(item);
}

function stickDamage(player, item) {
  const count = Math.max(1, countEquippedOfType(player, "stick"));
  const level = weaponRarityLevel(item.rarity);
  const unscaled = (Number.isFinite(item.baseDamage) ? item.baseDamage : 6) + count * (2 + level * 2);
  return scaled(player, weaponDamageByRarity(unscaled, item.rarity) * attackMult(item));
}

function weaponHitDamage(item, player) {
  if (!item) {
    return 0;
  }
  if (item.type === "stick") {
    return stickDamage(player, item);
  }
  return scaled(player, rarityDamage(item) * attackMult(item));
}

export function itemReloadTime(item, player) {
  if (!item) {
    return MIN_RELOAD_TIME;
  }
  return Math.max(
    MIN_RELOAD_TIME,
    item.reload * joomongReloadMult(item) * reloadStatMultiplier(player)
  );
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

const MAX_CHAIN_HITS = 10000;
const MAX_EXTRA_VFX = 8;

export function applyWeaponHit(item, player, target, onResolved, isExtraHit = false) {
  if (!item || !canBeHit(target)) {
    return { dealt: 0, extra: false, extraHits: 0 };
  }

  const amount = weaponHitDamage(item, player);
  const dealt = applyMonsterHit(target, amount, player, onResolved);
  if (dealt <= 0 || isExtraHit) {
    return { dealt, extra: false, extraHits: 0 };
  }

  const cost = monsterHardness(target);
  let extraHits = 0;
  let remaining = spendDurability(item, cost);
  while (remaining > 0 && canBeHit(target) && extraHits < MAX_CHAIN_HITS) {
    const extra = applyWeaponHit(item, player, target, onResolved, true);
    if (extra.dealt <= 0) {
      break;
    }
    extraHits += 1;
    remaining = spendDurability(item, cost);
  }
  return { dealt, extra: extraHits > 0, extraHits };
}

function addExtraHitEffects(target, extraHits) {
  const count = Math.min(Math.max(0, extraHits), MAX_EXTRA_VFX);
  for (let i = 0; i < count; i++) {
    addEffect({
      type: "extra",
      x: target.x,
      y: target.y,
      radius: 18 + i * 3
    });
  }
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

function fireFang(item, player, target, onResolved) {
  const { dealt, extraHits } = applyWeaponHit(item, player, target, onResolved, false);
  if (dealt > 0) {
    healPlayer(player, fangHealOf(item));
    addEffect({
      type: "fang",
      x: target.x,
      y: target.y,
      radius: 16
    });
    addExtraHitEffects(target, extraHits);
  }
}

function fireMucus(item, player, target, onResolved) {
  const { dealt, extraHits } = applyWeaponHit(item, player, target, onResolved, false);
  if (dealt > 0) {
    applySlow(target, item.slow, item.slowDuration);
    addEffect({
      type: "mucus",
      x: target.x,
      y: target.y,
      radius: 18
    });
    addExtraHitEffects(target, extraHits);
  }
}

function fireBolt(item, target, onResolved, player) {
  const { dealt, extraHits } = applyWeaponHit(item, player, target, onResolved, false);
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
    addExtraHitEffects(target, extraHits);
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

  const aoe = item.aoeRadius * (player.rangeMult || 1);
  for (const target of targets) {
    const dist = Math.hypot(center.x - target.x, center.y - target.y);
    if (dist < aoe + target.size) {
      const { extraHits } = applyWeaponHit(item, player, target, onResolved, false);
      addExtraHitEffects(target, extraHits);
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
    if (slot.item.durability <= 0 && slot.cooldown <= 0) {
      restoreDurability(slot.item);
    }
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
        fireFang(item, player, target, onResolved);
      } else if (item.type === "mucus") {
        fireMucus(item, player, target, onResolved);
      } else {
        fireBolt(item, target, onResolved, player);
      }
    }

    slot.cooldown = itemReloadTime(item, player);
  }

  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].life -= dt;
    if (effects[i].life <= 0) {
      effects.splice(i, 1);
    }
  }
}

export function weaponDamage(item, player) {
  return weaponHitDamage(item, player);
}

export function weaponStickBonus(item) {
  return stickBonusOf(item);
}

export function describeWeapon(item, player) {
  if (!item) {
    return ["Empty"];
  }

  const lines = [`${item.label} · ${item.rarity}`];
  lines.push(`Damage ${weaponDamage(item, player).toFixed(1)}`);
  lines.push(`Range ${Math.round(item.range * (player.rangeMult || 1))}`);
  lines.push(`Reload ${itemReloadTime(item, player).toFixed(4)}s`);
  const maxDura = itemMaxDurability(item);
  const curDura = Math.max(0, Number(item.durability) || 0);
  lines.push(`내구도 ${formatCompact(curDura)} / ${formatCompact(maxDura)}`);
  lines.push(`추가 타격: ${canExtraHit(item) ? "가능" : "불가능"}`);

  if (item.rarity === JOOMONG_RARITY) {
    const count = Math.max(0, Math.floor(item.enhanceCount || 0));
    lines.push(
      `Craft x${JOOMONG_CRAFT_GROWTH} · Enhance ${count} · x${joomongEnhanceMult(item).toFixed(4)}`
    );
    lines.push(`Reload x${joomongReloadMult(item).toFixed(4)} (−0.25% each)`);
    lines.push(`Max dura x${joomongEnhanceMult(item).toFixed(4)} from enhance`);
  }

  if (item.type === "fang") {
    lines.push(`Heal ${fangHealOf(item).toFixed(1)}`);
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
    lines.push(`Stick bonus +${bonus.toFixed(1)} each`);
    lines.push(`Sticks equipped x${count}`);
  }

  return lines;
}
