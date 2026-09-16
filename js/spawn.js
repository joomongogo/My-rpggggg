import {
  MAP_HEIGHT,
  MAP_WIDTH,
  MIN_RESPAWN_DISTANCE,
  MONSTERS_PER_ZONE,
  RESPAWN_TIME,
  SAFE_SPAWN_RADIUS,
  SPAWN_ATTEMPTS,
  SPAWN_X,
  SPAWN_Y
} from "./constants.js";
import { createMonster, monsters } from "./monsters.js";
import { isWalkable } from "./map.js";
import { rollZoneRarity } from "./rarity.js";

const TYPES = ["slime", "zombie", "witch", "bat", "golem"];
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

function typesForZone(zoneIndex) {
  if (zoneIndex <= 0) {
    return ["slime"];
  }
  if (zoneIndex === 1) {
    return ["slime", "zombie"];
  }
  if (zoneIndex === 2) {
    return ["slime", "zombie", "bat"];
  }
  return TYPES;
}

function pickTypeForZone(zoneIndex, slotIndex) {
  const types = typesForZone(zoneIndex);
  return types[slotIndex % types.length];
}

function randomTypeForZone(zoneIndex) {
  const types = typesForZone(zoneIndex);
  return types[Math.floor(Math.random() * types.length)];
}

function zoneCapacity(zoneIndex) {
  if (zoneIndex <= 0) {
    return 4;
  }
  if (zoneIndex === 1) {
    return 6;
  }
  return MONSTERS_PER_ZONE;
}

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

export function findSpawnPoint(player, preferredDistance, maxDistance = Infinity) {
  for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
    const angle = Math.random() * Math.PI * 2;
    const jitter = Math.min(
      maxDistance,
      Math.max(SAFE_SPAWN_RADIUS, preferredDistance + (Math.random() - 0.5) * 80)
    );
    const point = {
      x: SPAWN_X + Math.cos(angle) * jitter,
      y: SPAWN_Y + Math.sin(angle) * jitter
    };

    if (!inMap(point.x, point.y) || !isWalkable(point.x, point.y, 24)) {
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
  const spawnMin = Math.max(minDist, SAFE_SPAWN_RADIUS);
  const spawnMax = Math.max(spawnMin + 1, maxDist);
  for (let n = 0; n < 6; n++) {
    const distance = spawnMin + Math.random() * (spawnMax - spawnMin);
    const point = findSpawnPoint(player, distance, spawnMax - 1);
    if (!point) {
      continue;
    }
    const rarity = rollZoneRarity(distanceFromSpawn(point.x, point.y));
    return spawnMonster(
      type || randomTypeForZone(zoneIndex),
      point.x,
      point.y,
      rarity,
      zoneIndex
    );
  }
  return null;
}

export function populateWorld(player) {
  monsters.length = 0;
  respawns.length = 0;

  ZONE_RINGS.forEach((ring, zoneIndex) => {
    const count = zoneCapacity(zoneIndex);
    for (let i = 0; i < count; i++) {
      spawnInZone(player, zoneIndex, pickTypeForZone(zoneIndex, i));
    }
  });

  console.log("[spawn] populated", monsters.length);
}

export function queueRespawn(source) {
  const zoneIndex = source.homeZone ?? zoneIndexFromDistance(distanceFromSpawn(source.x, source.y));
  if (zoneCount(zoneIndex) + pendingCount(zoneIndex) >= zoneCapacity(zoneIndex)) {
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
    if (zoneCount(job.zoneIndex) >= zoneCapacity(job.zoneIndex)) {
      continue;
    }
    spawnInZone(player, job.zoneIndex, job.type);
    console.log("[spawn] respawn zone", job.zoneIndex, job.type);
  }

  ZONE_RINGS.forEach((ring, zoneIndex) => {
    const missing = zoneCapacity(zoneIndex) - zoneCount(zoneIndex) - pendingCount(zoneIndex);
    for (let i = 0; i < missing; i++) {
      respawns.push({
        type: randomTypeForZone(zoneIndex),
        zoneIndex,
        timer: RESPAWN_TIME
      });
    }
  });
}
