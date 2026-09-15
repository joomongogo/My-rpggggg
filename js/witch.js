import {
  WITCH_AOE_RADIUS,
  WITCH_CAST_COOLDOWN,
  WITCH_CAST_RANGE,
  WITCH_SPELL_BASE,
  WITCH_WINDUP
} from "./constants.js";
import { getMonsterAtkMult, getRarityIndex } from "./rarity.js";
import { damagePlayer } from "./player.js";

export function updateWitch(monster, player, dt) {
  if (monster.finished || player.hp <= 0) {
    return;
  }

  const distance = Math.hypot(player.x - monster.x, player.y - monster.y);

  if (!monster.aoe) {
    if (distance > WITCH_CAST_RANGE) {
      return;
    }

    monster.castTimer -= dt;
    if (monster.castTimer <= 0) {
      const index = getRarityIndex(monster.rarity);
      monster.aoe = {
        x: player.x,
        y: player.y,
        radius: WITCH_AOE_RADIUS * (1 + index * 0.08),
        windup: WITCH_WINDUP,
        damage: WITCH_SPELL_BASE * getMonsterAtkMult(monster.rarity)
      };
      monster.castTimer = WITCH_CAST_COOLDOWN;
      console.log("[witch] cast", monster.rarity, monster.aoe.damage.toFixed(1));
    }
    return;
  }

  monster.aoe.windup -= dt;
  if (monster.aoe.windup > 0) {
    return;
  }

  const dist = Math.hypot(player.x - monster.aoe.x, player.y - monster.aoe.y);
  if (dist < monster.aoe.radius + player.size) {
    damagePlayer(player, monster.aoe.damage);
  }
  monster.aoe = null;
}

export function isWitchCasting(monster) {
  return Boolean(monster.aoe);
}
