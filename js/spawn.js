import {
  MAP_HEIGHT,
  MAP_WIDTH,
  MIN_RESPAWN_DISTANCE,
  MONSTER_COUNT,
  RESPAWN_TIME,
  SPAWN_ATTEMPTS,
  SPAWN_X,
  SPAWN_Y
} from "./constants.js";
import { createMonster, monsters } from "./monsters.js";
import { rollZoneRarity } from "./rarity.js";

const TYPES = ["slime", "zombie", "witch"];
const respawns = [];

function distanceFromSpawn(x, y) {
  return Math.hypot(x - SPAWN_X, y - SPAWN_Y);
}

function randomMapPoint() {
  return {
    x: 80 + Math.random() * (MAP_WIDTH - 160),
    y: 80 + Math.random() * (MAP_HEIGHT - 160)
  };
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

const ZONE_RINGS = [
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

export function populateWorld(player) {
  monsters.length = 0;
  respawns.length = 0;

  let spawned = 0;
  for (const [minDist, maxDist] of ZONE_RINGS) {
    const perRing = Math.max(3, Math.floor(MONSTER_COUNT / ZONE_RINGS.length));
    for (let i = 0; i < perRing; i++) {
      const distance = minDist + Math.random() * (maxDist - minDist);
      const point = findSpawnPoint(player, distance);
      const rarity = rollZoneRarity(distanceFromSpawn(point.x, point.y));
      const type = TYPES[spawned % TYPES.length];
      spawnMonster(type, point.x, point.y, rarity);
      spawned++;
    }
  }

  console.log("[spawn] populated", monsters.length);
}

export function queueRespawn(source) {
  respawns.push({
    type: source.type,
    distance: distanceFromSpawn(source.x, source.y),
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
    const point = findSpawnPoint(player, job.distance);
    const rarity = rollZoneRarity(distanceFromSpawn(point.x, point.y));
    spawnMonster(job.type, point.x, point.y, rarity);
    console.log("[spawn] respawn", job.type, rarity);
  }
}
