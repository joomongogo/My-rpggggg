import { MIN_RESPAWN_DISTANCE, MONSTERS_PER_ZONE, RESPAWN_TIME, SPAWN_ATTEMPTS } from "./constants.js";
import { getArea, getOrigin, isSafeZone } from "./areas.js";
import { getMapHeight, getMapWidth, isWalkable } from "./map.js";
import { createMonster, monsters } from "./monsters.js";
import { rollZoneRarity } from "./rarity.js";

const respawns = [];
const MARGIN = 80;

export function getZoneRings() {
  const area = getArea();
  const safe = area.safeRadius;
  const band = area.zoneBand;
  const rings = [];
  let start = safe;
  const limit = Math.min(getMapWidth(), getMapHeight()) / 2 - 200;
  while (start + 80 < limit) {
    rings.push([start, Math.min(start + band, limit)]);
    start += band;
  }
  return rings.length ? rings : [[safe, safe + band]];
}

function typesForZone(zoneIndex) {
  return getArea().typesForZone(zoneIndex);
}

function pickTypeForZone(zoneIndex, slotIndex) {
  const types = typesForZone(zoneIndex);
  if (!types.length) {
    return null;
  }
  return types[slotIndex % types.length];
}

function randomTypeForZone(zoneIndex) {
  const types = typesForZone(zoneIndex);
  if (!types.length) {
    return null;
  }
  return types[Math.floor(Math.random() * types.length)];
}

function zoneCapacity(zoneIndex) {
  if (zoneIndex <= 0) {
    return 6;
  }
  if (zoneIndex === 1) {
    return 8;
  }
  return MONSTERS_PER_ZONE;
}

function inMap(x, y) {
  return x >= MARGIN && x <= getMapWidth() - MARGIN && y >= MARGIN && y <= getMapHeight() - MARGIN;
}

function distanceFromOrigin(x, y) {
  const origin = getOrigin();
  return Math.hypot(x - origin.x, y - origin.y);
}

export function zoneIndexFromDistance(distance) {
  const rings = getZoneRings();
  for (let i = 0; i < rings.length; i++) {
    const [minDist, maxDist] = rings[i];
    if (distance >= minDist && distance < maxDist) {
      return i;
    }
  }
  if (distance < rings[0][0]) {
    return 0;
  }
  return rings.length - 1;
}

function zoneCount(zoneIndex) {
  return monsters.filter((monster) => {
    if (monster.finished && !monster.undead) {
      return false;
    }
    if (monster.ephemeral) {
      return false;
    }
    return monster.homeZone === zoneIndex;
  }).length;
}

function pendingCount(zoneIndex) {
  return respawns.filter((job) => job.zoneIndex === zoneIndex).length;
}

export function findSpawnPoint(player, preferredDistance, maxDistance = Infinity) {
  const origin = getOrigin();
  const area = getArea();
  for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
    const angle = Math.random() * Math.PI * 2;
    const jitter = Math.min(
      maxDistance,
      Math.max(area.safeRadius, preferredDistance + (Math.random() - 0.5) * 80)
    );
    const point = {
      x: origin.x + Math.cos(angle) * jitter,
      y: origin.y + Math.sin(angle) * jitter
    };

    if (!inMap(point.x, point.y) || !isWalkable(point.x, point.y, 24)) {
      continue;
    }
    if (isSafeZone(point.x, point.y)) {
      continue;
    }

    const awayFromPlayer = !player || Math.hypot(player.x - point.x, player.y - point.y) >= MIN_RESPAWN_DISTANCE;
    const awayFromEntrance = Math.hypot(point.x - origin.x, point.y - origin.y) >= area.safeRadius;
    if (awayFromPlayer && awayFromEntrance) {
      return point;
    }
  }

  return null;
}

export function spawnMonster(type, x, y, rarity, homeZone, extra = {}) {
  const monster = createMonster(type, x, y, rarity);
  monster.homeZone = homeZone ?? zoneIndexFromDistance(distanceFromOrigin(x, y));
  if (extra.ephemeral) {
    monster.ephemeral = true;
  }
  if (extra.hpMult) {
    monster.hp *= extra.hpMult;
    monster.maxHp *= extra.hpMult;
  }
  if (extra.atkMult) {
    monster.contactDamage *= extra.atkMult;
  }
  monsters.push(monster);
  return monster;
}

function spawnInZone(player, zoneIndex, type) {
  if (!type) {
    return null;
  }
  const rings = getZoneRings();
  const [minDist, maxDist] = rings[zoneIndex] || rings[rings.length - 1];
  const spawnMin = minDist;
  const spawnMax = Math.max(spawnMin + 1, maxDist);
  for (let n = 0; n < 6; n++) {
    const distance = spawnMin + Math.random() * (spawnMax - spawnMin);
    const point = findSpawnPoint(player, distance, spawnMax - 1);
    if (!point) {
      continue;
    }
    const rarity = rollZoneRarity(distanceFromOrigin(point.x, point.y), getArea().safeRadius, getArea().zoneBand);
    return spawnMonster(type, point.x, point.y, rarity, zoneIndex);
  }
  return null;
}

export function populateWorld(player) {
  monsters.length = 0;
  respawns.length = 0;
  const types = typesForZone(0);
  if (!types.length) {
    console.log("[spawn] empty area");
    return;
  }

  getZoneRings().forEach((ring, zoneIndex) => {
    const count = zoneCapacity(zoneIndex);
    for (let i = 0; i < count; i++) {
      spawnInZone(player, zoneIndex, pickTypeForZone(zoneIndex, i));
    }
  });

  console.log("[spawn] populated", monsters.length, getArea().id);
}

export function queueRespawn(source) {
  if (!source || source.ephemeral) {
    return;
  }
  const zoneIndex = source.homeZone ?? zoneIndexFromDistance(distanceFromOrigin(source.x, source.y));
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
  const ephemeral = Boolean(parent?.ephemeral);
  for (const spec of specs) {
    created.push(spawnMonster("slime", spec.x, spec.y, spec.rarity, homeZone, { ephemeral }));
  }
  return created;
}

export function clearSpawns() {
  respawns.length = 0;
}

export function updateRespawns(player, dt) {
  if (getArea().id === "hub" || getArea().id === "rush") {
    return;
  }

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
  }

  getZoneRings().forEach((ring, zoneIndex) => {
    const missing = zoneCapacity(zoneIndex) - zoneCount(zoneIndex) - pendingCount(zoneIndex);
    for (let i = 0; i < missing; i++) {
      const type = randomTypeForZone(zoneIndex);
      if (!type) {
        continue;
      }
      respawns.push({
        type,
        zoneIndex,
        timer: RESPAWN_TIME
      });
    }
  });
}
