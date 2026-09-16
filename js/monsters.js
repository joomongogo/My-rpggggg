import { ACTIVE_RADIUS } from "./constants.js";
import { updateBat } from "./bat.js";
import { updateGolem } from "./golem.js";
import { moveWithSlide } from "./map.js";
import { getMonsterAtkMult, getMonsterHpMult, getRarityIndex } from "./rarity.js";
import { damagePlayer } from "./player.js";
import { onSlimeDefeat } from "./slime.js";
import { tryStartUndead, updateZombie } from "./zombie.js";
import { isWitchCasting, updateWitch } from "./witch.js";

export const TYPE_BASE = {
  slime: { hp: 40, contact: 8, speed: 1.6, size: 22, exp: 12 },
  zombie: { hp: 80, contact: 12, speed: 1.2, size: 26, exp: 20 },
  witch: { hp: 55, contact: 5, speed: 1.3, size: 24, exp: 28 },
  bat: { hp: 22, contact: 6, speed: 2.35, size: 16, exp: 16 },
  golem: { hp: 140, contact: 16, speed: 0.72, size: 34, exp: 36 }
};

let nextId = 1;

export const monsters = [];

export function createMonster(type, x, y, rarity) {
  const base = TYPE_BASE[type];
  const hpMult = getMonsterHpMult(rarity);
  const atkMult = getMonsterAtkMult(rarity);
  const index = getRarityIndex(rarity);

  return {
    id: nextId++,
    type,
    rarity,
    homeZone: 0,
    x,
    y,
    size: base.size * (1 + index * 0.12),
    baseSpeed: base.speed * (1 + index * 0.03),
    speed: base.speed * (1 + index * 0.03),
    hp: base.hp * hpMult,
    maxHp: base.hp * hpMult,
    expReward: Math.round(base.exp * hpMult),
    contactDamage: base.contact * atkMult,
    alive: true,
    finished: false,
    undead: false,
    undeadTimer: 0,
    slowTimer: 0,
    slowAmount: 0,
    castTimer: 1 + Math.random() * 2,
    aoe: null,
    dashTimer: 0.4 + Math.random(),
    dashing: 0,
    dashX: 0,
    dashY: 0
  };
}

export function canBeHit(monster) {
  return monster && monster.alive && !monster.undead && !monster.finished;
}

export function applySlow(monster, amount, duration) {
  monster.slowAmount = Math.max(monster.slowAmount, amount);
  monster.slowTimer = Math.max(monster.slowTimer, duration);
}

export function applyMonsterHit(monster, damage, player, onResolved) {
  if (!canBeHit(monster)) {
    return 0;
  }

  monster.hp -= damage;
  if (monster.hp > 0) {
    return damage;
  }

  monster.hp = 0;

  if (monster.type === "zombie" && tryStartUndead(monster)) {
    return damage;
  }

  resolveDefeat(monster, player, onResolved);
  return damage;
}

function resolveDefeat(monster, player, onResolved) {
  monster.alive = false;
  monster.finished = true;
  monster.aoe = null;

  let result = { exp: monster.expReward, drop: null };
  if (monster.type === "slime") {
    result = onSlimeDefeat(monster);
  } else if (monster.type === "witch") {
    result = { exp: monster.expReward, drop: "potion" };
  } else if (monster.type === "zombie") {
    result = { exp: monster.expReward, drop: "fang" };
  } else if (monster.type === "bat") {
    result = { exp: monster.expReward, drop: "dart" };
  } else if (monster.type === "golem") {
    result = { exp: monster.expReward, drop: "boulder" };
  }

  onResolved(monster, result);
}

export function updateMonsters(player, dt, onResolved) {
  for (const monster of monsters) {
    if (monster.finished && !monster.undead) {
      continue;
    }

    if (monster.slowTimer > 0) {
      monster.slowTimer -= dt;
      if (monster.slowTimer <= 0) {
        monster.slowAmount = 0;
      }
    }

    const zombieResult = monster.type === "zombie" ? updateZombie(monster, dt) : null;
    if (zombieResult) {
      onResolved(monster, zombieResult);
      continue;
    }

    if (player.hp <= 0) {
      continue;
    }

    const distanceToPlayer = Math.hypot(player.x - monster.x, player.y - monster.y);
    if (distanceToPlayer > ACTIVE_RADIUS) {
      if (monster.type === "witch" && monster.aoe) {
        updateWitch(monster, player, dt);
      }
      continue;
    }

    if (monster.type === "witch") {
      updateWitch(monster, player, dt);
    }

    const casting = monster.type === "witch" && isWitchCasting(monster);
    const moving = (monster.alive || monster.undead) && !casting;

    if (moving) {
      const dx = player.x - monster.x;
      const dy = player.y - monster.y;
      const distance = Math.hypot(dx, dy);
      const speed = monster.baseSpeed * (1 - monster.slowAmount) * 60 * dt;
      let dirX = distance > 1 ? dx / distance : 0;
      let dirY = distance > 1 ? dy / distance : 0;
      let speedMul = 1;

      if (monster.type === "bat") {
        const dash = updateBat(monster, player, dt);
        if (dash) {
          dirX = dash.dirX;
          dirY = dash.dirY;
          speedMul = dash.extraSpeed;
        }
      } else if (monster.type === "golem") {
        updateGolem(monster, dt);
      }

      if (distance > 1 || speedMul > 1) {
        const next = moveWithSlide(
          monster.x,
          monster.y,
          dirX * speed * speedMul,
          dirY * speed * speedMul,
          monster.size * 0.85
        );
        monster.x = next.x;
        monster.y = next.y;
      }

      const after = Math.hypot(player.x - monster.x, player.y - monster.y);
      if (after < player.size + monster.size) {
        damagePlayer(player, monster.contactDamage * dt);
      }
    }
  }
}

export function removeFinishedMonsters() {
  for (let i = monsters.length - 1; i >= 0; i--) {
    if (monsters[i].finished && !monsters[i].undead) {
      monsters.splice(i, 1);
    }
  }
}
