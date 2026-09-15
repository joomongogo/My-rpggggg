import {
  MAP_HEIGHT,
  MAP_WIDTH,
  MIN_RESPAWN_DISTANCE,
  MONSTERS_PER_ZONE,
  RESPAWN_TIME,
  SPAWN_ATTEMPTS,
  SPAWN_X,
  SPAWN_Y
} from "./constants.js";
import { createMonster, monsters } from "./monsters.js";
import { rollZoneRarity } from "./rarity.js";

const TYPES = ["slime", "zombie", "witch"];
const respawns = [];
const MARGIN = 80;

export const ZONE_RINGS = [
  [0, 650],
  [650, 1300],
  [1300, 1950],
  [1950, 2600],
  [2600, 3250],
  [3250, 3900],
  [3900, 4550],
  [4550, 5200],
  [5200, 5800]
];

function inMap(x, y) {
  return x >= MARGIN && x <= MAP_WIDTH - MARGIN && y >= MARGIN && y <= MAP_HEIGHT - MARGIN;
}

function distanceFromSpawn(x, y) {
  return Math.hypot(x - SPAWN_X, y - SPAWN_Y);
}

export function zoneIndexFromDistance(distance) {
  for (let i = 0; i < ZONE_RINGS.length; i++) {
    const [minDist, maxDist] = ZONE_RINGS[i];
    if (distance >= minDist && distance < maxDist) {
      return i;
    }
  }
  if (distance < ZONE_RINGS[0][0]) {
    return 0;
  }
  return ZONE_RINGS.length - 1;
}

function zoneCount(zoneIndex) {
  return monsters.filter((monster) => {
    if (monster.finished && !monster.undead) {
      return false;
    }
    return monster.homeZone === zoneIndex;
  }).length;
}

function pendingCount(zoneIndex) {
  return respawns.filter((job) => job.zoneIndex === zoneIndex).length;
}

export function findSpawnPoint(player, preferredDistance) {
  for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
    const angle = Math.random() * Math.PI * 2;
    const jitter = preferredDistance + (Math.random() - 0.5) * 80;
    const point = {
      x: SPAWN_X + Math.cos(angle) * jitter,
      y: SPAWN_Y + Math.sin(angle) * jitter
    };

    if (!inMap(point.x, point.y)) {
      continue;
    }

    const awayFromPlayer = !player || Math.hypot(player.x - point.x, player.y - point.y) >= MIN_RESPAWN_DISTANCE;
    if (awayFromPlayer) {
      return point;
    }
  }

  return null;
}

export function spawnMonster(type, x, y, rarity, homeZone) {
  const monster = createMonster(type, x, y, rarity);
  monster.homeZone = homeZone ?? zoneIndexFromDistance(distanceFromSpawn(x, y));
  monsters.push(monster);
  return monster;
}

function spawnInZone(player, zoneIndex, type) {
  const [minDist, maxDist] = ZONE_RINGS[zoneIndex];
  const distance = minDist + Math.random() * Math.max(1, maxDist - minDist);
  const point = findSpawnPoint(player, distance);
  if (!point) {
    return null;
  }
  const rarity = rollZoneRarity(distanceFromSpawn(point.x, point.y));
  return spawnMonster(
    type || TYPES[Math.floor(Math.random() * TYPES.length)],
    point.x,
    point.y,
    rarity,
    zoneIndex
  );
}

export function populateWorld(player) {
  monsters.length = 0;
  respawns.length = 0;

  ZONE_RINGS.forEach((ring, zoneIndex) => {
    for (let i = 0; i < MONSTERS_PER_ZONE; i++) {
      spawnInZone(player, zoneIndex, TYPES[i % TYPES.length]);
    }
  });

  console.log("[spawn] populated", monsters.length);
}

export function queueRespawn(source) {
  const zoneIndex = source.homeZone ?? zoneIndexFromDistance(distanceFromSpawn(source.x, source.y));
  if (zoneCount(zoneIndex) + pendingCount(zoneIndex) >= MONSTERS_PER_ZONE) {
    return;
  }
  respawns.push({
    type: source.type,
    zoneIndex,
    timer: RESPAWN_TIME
  });
}

export function spawnSplitSlimes(specs, parent) {
  const created = [];
  const homeZone = parent?.homeZone ?? 0;
  for (const spec of specs) {
    created.push(spawnMonster("slime", spec.x, spec.y, spec.rarity, homeZone));
  }
  return created;
}

export function updateRespawns(player, dt) {
  for (let i = respawns.length - 1; i >= 0; i--) {
    respawns[i].timer -= dt;
    if (respawns[i].timer > 0) {
      continue;
    }

    const job = respawns.splice(i, 1)[0];
    if (zoneCount(job.zoneIndex) >= MONSTERS_PER_ZONE) {
      continue;
    }
    spawnInZone(player, job.zoneIndex, job.type);
    console.log("[spawn] respawn zone", job.zoneIndex, job.type);
  }

  ZONE_RINGS.forEach((ring, zoneIndex) => {
    const missing = MONSTERS_PER_ZONE - zoneCount(zoneIndex) - pendingCount(zoneIndex);
    for (let i = 0; i < missing; i++) {
      respawns.push({
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
        zoneIndex,
        timer: RESPAWN_TIME
      });
    }
  });
}
