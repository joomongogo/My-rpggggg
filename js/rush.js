import { createItem } from "./items.js";
import { WORLD_RARITIES } from "./rarity.js";
import { findSpawnPoint, spawnMonster } from "./spawn.js";
import { monsters } from "./monsters.js";

export const RUSH_DURATION = 60;

const RUSH_TYPES = ["slime", "bat", "zombie", "leafbug", "witch", "golem", "dracula"];
const REWARD_TYPES = ["mucus", "dart", "fang", "stick", "head", "potion", "boulder"];

function swarmForIndex(index) {
  if (index <= 1) {
    return { maxAlive: 22, burst: 8, perTick: 1, interval: 1 };
  }
  if (index <= 3) {
    return { maxAlive: 18, burst: 7, perTick: 1, interval: 1 };
  }
  if (index <= 5) {
    return { maxAlive: 14, burst: 6, perTick: 1, interval: 1 };
  }
  return { maxAlive: 10, burst: 5, perTick: 1, interval: 1 };
}

function makeDifficulty(rarity, index) {
  const swarm = swarmForIndex(index);
  return {
    id: rarity,
    label: rarity,
    rarity,
    hpMult: 1,
    atkMult: 1,
    maxAlive: swarm.maxAlive,
    interval: swarm.interval,
    burst: swarm.burst,
    perTick: swarm.perTick,
    types: RUSH_TYPES,
    rarities: [rarity],
    exp: Math.round(80 * 1.65 ** index),
    rewards: [
      { type: REWARD_TYPES[index % REWARD_TYPES.length], rarity },
      { type: REWARD_TYPES[(index + 3) % REWARD_TYPES.length], rarity }
    ]
  };
}

const DIFFICULTY = Object.fromEntries(
  WORLD_RARITIES.map((rarity, index) => [rarity, makeDifficulty(rarity, index)])
);

const rush = {
  active: false,
  difficulty: "Basic",
  scale: 1,
  timeLeft: RUSH_DURATION,
  spawnAcc: 0
};

export function parseRushScale(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function rushScale() {
  if (rush.difficulty !== "X_") {
    return 1;
  }
  return parseRushScale(rush.scale);
}

function scaledRushConfig() {
  const cfg = DIFFICULTY[rush.difficulty] || DIFFICULTY.Basic;
  const n = rushScale();
  return {
    ...cfg,
    scale: n,
    hpMult: n * n,
    rewardMult: n,
    label: n > 1 ? `${cfg.label} x${n}` : cfg.label
  };
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function rushPoint(player) {
  return findSpawnPoint(player, {
    minDist: 0,
    maxDist: Infinity,
    minPlayerDist: 120,
    maxPlayerDist: 480,
    avoidSafe: false,
    avoidPortals: true,
    gap: 20
  });
}

function spawnRushMob(player, cfg) {
  const point = rushPoint(player);
  if (!point) {
    return null;
  }
  return spawnMonster(pick(cfg.types), point.x, point.y, cfg.rarity, 0, {
    ephemeral: true,
    hpMult: cfg.hpMult,
    atkMult: cfg.atkMult
  });
}

function fillRushMobs(player, count) {
  const cfg = getRushDifficulty();
  let spawned = 0;
  for (let i = 0; i < count; i++) {
    if (spawnRushMob(player, cfg)) {
      spawned += 1;
    }
  }
  return spawned;
}

export function getRushDifficulties() {
  return WORLD_RARITIES.map((rarity) => DIFFICULTY[rarity]);
}

export function isRushActive() {
  return rush.active;
}

export function getRushTimeLeft() {
  return rush.timeLeft;
}

export function getRushDifficulty() {
  return scaledRushConfig();
}

export function getRushScale() {
  return rushScale();
}

export function beginRush(player, difficulty, scale = 1) {
  const base = DIFFICULTY[difficulty] || DIFFICULTY.Basic;
  rush.active = true;
  rush.difficulty = base.id;
  rush.scale = base.id === "X_" ? parseRushScale(scale) : 1;
  rush.timeLeft = RUSH_DURATION;
  const cfg = scaledRushConfig();
  rush.spawnAcc = cfg.interval;
  fillRushMobs(player, cfg.burst);
}

export function stopRush() {
  rush.active = false;
  rush.timeLeft = RUSH_DURATION;
  rush.spawnAcc = 0;
  rush.scale = 1;
}

export function takeRushReward(success) {
  const cfg = getRushDifficulty();
  stopRush();
  if (!success) {
    return { success: false, exp: 0, items: [], label: cfg.label };
  }
  const n = Math.max(1, Math.floor(cfg.rewardMult || 1));
  const items = [];
  for (let i = 0; i < n; i++) {
    for (const spec of cfg.rewards) {
      items.push(createItem(spec.type, spec.rarity));
    }
  }
  return {
    success: true,
    exp: cfg.exp,
    items,
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
  if (rush.spawnAcc <= 0) {
    const spawned = fillRushMobs(player, cfg.perTick);
    rush.spawnAcc = spawned > 0 ? cfg.interval : 0.45;
  }

  if (rush.timeLeft <= 0) {
    rush.timeLeft = 0;
    return "success";
  }

  return null;
}
