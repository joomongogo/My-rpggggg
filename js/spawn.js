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

export const ZONE_RINGS = [
  [280, 820],
  [1000, 1700],
  [1900, 2700],
  [2900, 3800],
  [4000, 5000],
  [5200, 6300],
  [6500, 7700],
  [7900, 9200],
  [9400, 10500]
];

function distanceFromSpawn(x, y) {
  return Math.hypot(x - SPAWN_X, y - SPAWN_Y);
}

function randomMapPoint() {
  return {
    x: 80 + Math.random() * (MAP_WIDTH - 160),
    y: 80 + Math.random() * (MAP_HEIGHT - 160)
  };
}

export function zoneIndexFromDistance(distance) {
  for (let i = 0; i < ZONE_RINGS.length; i++) {
    const [minDist, maxDist] = ZONE_RINGS[i];
    if (distance >= minDist && distance < maxDist) {
      return i;
    }
  }
  return ZONE_RINGS.length - 1;
}

function zoneCount(zoneIndex) {
  return monsters.filter((monster) => {
    if (monster.finished && !monster.undead) {
      return false;
    }
    return zoneIndexFromDistance(distanceFromSpawn(monster.x, monster.y)) === zoneIndex;
  }).length;
}

function pendingCount(zoneIndex) {
  return respawns.filter((job) => job.zoneIndex === zoneIndex).length;
}

export function findSpawnPoint(player, preferredDistance) {
  let fallback = randomMapPoint();

  for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
    let point;
    if (preferredDistance) {
      const angle = Math.random() * Math.PI * 2;
      const jitter = preferredDistance + (Math.random() - 0.5) * 240;
      point = {
        x: SPAWN_X + Math.cos(angle) * jitter,
        y: SPAWN_Y + Math.sin(angle) * jitter
      };
      point.x = Math.max(80, Math.min(MAP_WIDTH - 80, point.x));
      point.y = Math.max(80, Math.min(MAP_HEIGHT - 80, point.y));
    } else {
      point = randomMapPoint();
    }

    const awayFromPlayer = !player || Math.hypot(player.x - point.x, player.y - point.y) >= MIN_RESPAWN_DISTANCE;
    if (awayFromPlayer) {
      return point;
    }
    fallback = point;
  }

  return fallback;
}

export function spawnMonster(type, x, y, rarity) {
  const monster = createMonster(type, x, y, rarity);
  monsters.push(monster);
  return monster;
}

function spawnInZone(player, zoneIndex, type) {
  const [minDist, maxDist] = ZONE_RINGS[zoneIndex];
  const distance = minDist + Math.random() * (maxDist - minDist);
  const point = findSpawnPoint(player, distance);
  const rarity = rollZoneRarity(distanceFromSpawn(point.x, point.y));
  return spawnMonster(type || TYPES[Math.floor(Math.random() * TYPES.length)], point.x, point.y, rarity);
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
  const zoneIndex = zoneIndexFromDistance(distanceFromSpawn(source.x, source.y));
  if (zoneCount(zoneIndex) + pendingCount(zoneIndex) >= MONSTERS_PER_ZONE) {
    return;
  }
  respawns.push({
    type: source.type,
    zoneIndex,
    timer: RESPAWN_TIME
  });
}

export function spawnSplitSlimes(specs) {
  const created = [];
  for (const spec of specs) {
    created.push(spawnMonster("slime", spec.x, spec.y, spec.rarity));
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
