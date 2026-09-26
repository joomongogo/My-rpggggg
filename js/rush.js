import { createItem } from "./items.js";
import { WORLD_RARITIES } from "./rarity.js";
import { findSpawnPoint, spawnMonster } from "./spawn.js";
import { monsters } from "./monsters.js";

export const RUSH_DURATION = 60;

const RUSH_TYPES = ["slime", "bat", "zombie", "leafbug", "witch", "golem", "dracula"];
const REWARD_TYPES = ["mucus", "dart", "fang", "stick", "head", "potion", "boulder"];

function swarmForIndex(index) {
  if (index <= 1) {
    return { maxAlive: 22, burst: 1, swarmCap: 140 };
  }
  if (index <= 3) {
    return { maxAlive: 18, burst: 1, swarmCap: 110 };
  }
  if (index <= 5) {
    return { maxAlive: 14, burst: 1, swarmCap: 90 };
  }
  return { maxAlive: 10, burst: 1, swarmCap: 70 };
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
    swarmCap: swarm.swarmCap,
    burst: swarm.burst,
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

function countRushAlive() {
  let total = 0;
  for (const monster of monsters) {
    if (monster.ephemeral && monster.alive && !monster.finished) {
      total += 1;
    }
  }
  return total;
}

function rushProgress() {
  return 1 - Math.max(0, rush.timeLeft) / RUSH_DURATION;
}

function rushSpawnPace() {
  const t = Math.min(1, Math.max(0, rushProgress()));
  const cfg = getRushDifficulty();
  const ramp = t ** 1.2;
  const late = Math.max(0, (t - 0.62) / 0.38) ** 2.2;
  return {
    interval: Math.max(0.04, 1 - ramp * 0.7 - late * 0.5),
    perTick: 1 + Math.floor(ramp * 2.2) + Math.floor(late * 10),
    maxAlive: Math.round(cfg.maxAlive + ramp * cfg.maxAlive + late * cfg.swarmCap)
  };
}

function fillRushMobs(player, count) {
  const cfg = getRushDifficulty();
  const room = Math.max(0, rushSpawnPace().maxAlive - countRushAlive());
  const want = Math.min(Math.max(0, Math.floor(count)), room);
  let spawned = 0;
  for (let i = 0; i < want; i++) {
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
  const pace = rushSpawnPace();
  rush.spawnAcc = pace.interval;
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

  const pace = rushSpawnPace();
  if (rush.spawnAcc <= 0) {
    const spawned = fillRushMobs(player, pace.perTick);
    rush.spawnAcc = spawned > 0 ? pace.interval : Math.min(0.45, pace.interval);
  }

  if (rush.timeLeft <= 0) {
    rush.timeLeft = 0;
    return "success";
  }

  return null;
}
