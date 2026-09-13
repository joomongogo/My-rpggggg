import { EFFECT_LIFETIME } from "./constants.js";
import { healPlayer } from "./player.js";
import { applyMonsterHit, applySlow, canBeHit } from "./monsters.js";

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
  const dealt = applyMonsterHit(target, item.damage, player, onResolved);
  if (dealt > 0) {
    healPlayer(player, dealt * item.lifesteal);
    addEffect({
      type: "fang",
      x: target.x,
      y: target.y,
      radius: 16
    });
  }
}

function fireMucus(item, player, target, onResolved) {
  const dealt = applyMonsterHit(target, item.damage, player, onResolved);
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

function firePotion(item, player, targets, onResolved) {
  const center = closest(player, targets);
  if (!center) {
    return;
  }

  addEffect({
    type: "potion",
    x: center.x,
    y: center.y,
    radius: item.aoeRadius
  });

  for (const target of targets) {
    const dist = Math.hypot(center.x - target.x, center.y - target.y);
    if (dist < item.aoeRadius + target.size) {
      applyMonsterHit(target, item.damage, player, onResolved);
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
    const targets = enemiesInRange(player, monsterList, item.range);
    if (targets.length === 0) {
      continue;
    }

    if (item.type === "potion") {
      firePotion(item, player, targets, onResolved);
    } else {
      const target = closest(player, targets);
      if (item.type === "fang") {
        fireFang(item, player, target, onResolved, monsterList);
      } else {
        fireMucus(item, player, target, onResolved);
      }
    }

    slot.cooldown = item.reload;
  }

  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].life -= dt;
    if (effects[i].life <= 0) {
      effects.splice(i, 1);
    }
  }
}
