import { createItem } from "./items.js";
import { RARITY_ORDER } from "./rarity.js";
import { findSpawnPoint, spawnMonster } from "./spawn.js";
import { monsters } from "./monsters.js";

export const RUSH_DURATION = 60;

const DIFFICULTY = {
  easy: {
    id: "easy",
    label: "Easy",
    hpMult: 1,
    atkMult: 1,
    maxAlive: 6,
    interval: 1.1,
    burst: 4,
    perTick: 1,
    types: ["slime"],
    rarities: ["Basic"],
    exp: 80,
    rewards: [
      { type: "mucus", rarity: "Basic" },
      { type: "dart", rarity: "Basic" }
    ]
  },
  normal: {
    id: "normal",
    label: "Normal",
    hpMult: 1.35,
    atkMult: 1.35,
    maxAlive: 10,
    interval: 0.65,
    burst: 6,
    perTick: 2,
    types: ["slime", "bat"],
    rarities: ["Basic", "Decent"],
    exp: 180,
    rewards: [
      { type: "fang", rarity: "Decent" },
      { type: "stick", rarity: "Decent" }
    ]
  },
  hard: {
    id: "hard",
    label: "Hard",
    hpMult: 1.8,
    atkMult: 1.8,
    maxAlive: 14,
    interval: 0.32,
    burst: 10,
    perTick: 3,
    types: ["slime", "bat", "zombie", "leafbug", "witch"],
    rarities: ["Basic", "Decent", "Nice"],
    exp: 350,
    rewards: [
      { type: "potion", rarity: "Nice" },
      { type: "boulder", rarity: "Decent" },
      { type: "head", rarity: "Decent" }
    ]
  }
};

const rush = {
  active: false,
  difficulty: "easy",
  timeLeft: RUSH_DURATION,
  spawnAcc: 0
};

function livingRushMobs() {
  return monsters.filter((monster) => monster.ephemeral && (monster.alive || monster.undead) && !monster.finished).length;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function rushPoint(player) {
  return findSpawnPoint(player, {
    minDist: 0,
    maxDist: Infinity,
    minPlayerDist: 140,
    maxPlayerDist: 420,
    avoidSafe: false,
    avoidPortals: true
  });
}

function spawnRushMob(player, cfg) {
  const point = rushPoint(player);
  if (!point) {
    return null;
  }
  const rarity = pick(cfg.rarities.filter((name) => RARITY_ORDER.includes(name)));
  return spawnMonster(pick(cfg.types), point.x, point.y, rarity, 0, {
    ephemeral: true,
    hpMult: cfg.hpMult,
    atkMult: cfg.atkMult
  });
}

function fillRushMobs(player, count) {
  const cfg = getRushDifficulty();
  let spawned = 0;
  for (let i = 0; i < count; i++) {
    if (livingRushMobs() >= cfg.maxAlive) {
      break;
    }
    if (spawnRushMob(player, cfg)) {
      spawned += 1;
    }
  }
  return spawned;
}

export function getRushDifficulties() {
  return Object.values(DIFFICULTY);
}

export function isRushActive() {
  return rush.active;
}

export function getRushTimeLeft() {
  return rush.timeLeft;
}

export function getRushDifficulty() {
  return DIFFICULTY[rush.difficulty] || DIFFICULTY.easy;
}

export function beginRush(player, difficulty) {
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.easy;
  rush.active = true;
  rush.difficulty = cfg.id;
  rush.timeLeft = RUSH_DURATION;
  rush.spawnAcc = cfg.interval;
  fillRushMobs(player, cfg.burst);
}

export function stopRush() {
  rush.active = false;
  rush.timeLeft = RUSH_DURATION;
  rush.spawnAcc = 0;
}

export function takeRushReward(success) {
  const cfg = getRushDifficulty();
  stopRush();
  if (!success) {
    return { success: false, exp: 0, items: [], label: cfg.label };
  }
  return {
    success: true,
    exp: cfg.exp,
    items: cfg.rewards.map((spec) => createItem(spec.type, spec.rarity)),
    label: cfg.label
  };
}

export function updateRush(player, dt) {
  if (!rush.active) {
    return null;
  }

  if (player.hp <= 0) {
    return "fail";
  }

  rush.timeLeft -= dt;
  rush.spawnAcc -= dt;

  const cfg = getRushDifficulty();
  if (rush.spawnAcc <= 0 && livingRushMobs() < cfg.maxAlive) {
    const spawned = fillRushMobs(player, cfg.perTick);
    rush.spawnAcc = spawned > 0 ? cfg.interval : 0.08;
  }

  if (rush.timeLeft <= 0) {
    rush.timeLeft = 0;
    return "success";
  }

  return null;
}
