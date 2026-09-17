import { ZOMBIE_UNDEAD_TIME } from "./constants.js";

export function tryStartUndead(monster) {
  if (monster.undead || monster.finished) {
    return false;
  }

  monster.hp = 0;
  monster.alive = false;
  monster.undead = true;
  monster.undeadTimer = ZOMBIE_UNDEAD_TIME;
  monster.speed *= 0.55;
  console.log("[zombie] undead 5s");
  return true;
}

export function updateZombie(monster, dt) {
  if (!monster.undead) {
    return null;
  }

  monster.undeadTimer -= dt;
  if (monster.undeadTimer > 0) {
    return null;
  }

  monster.undead = false;
  monster.finished = true;
  console.log("[zombie] true death");
  return {
    exp: monster.expReward,
    drop: "head"
  };
}
