import {
  MIN_RESPAWN_DISTANCE,
  MIN_SPAWN_GAP,
  MONSTERS_PER_ZONE,
  PORTAL_RADIUS,
  RESPAWN_TIME,
  SPAWN_ATTEMPTS,
  SPAWN_BODY_RADIUS
} from "./constants.js";
import { getArea, getOrigin, isSafeZone } from "./areas.js";
import { forEachOpenCell, getMapHeight, getMapWidth, isWalkable } from "./map.js";
import { createMonster, monsters } from "./monsters.js";
import { rollZoneRarity } from "./rarity.js";

const respawns = [];

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

const walkCells = [];

function distanceFromOrigin(x, y) {
  const origin = getOrigin();
  return Math.hypot(x - origin.x, y - origin.y);
}

export function rebuildSpawnCache() {
  walkCells.length = 0;
  forEachOpenCell((x, y, w, h) => {
    const cx = x + w / 2;
    const cy = y + h / 2;
    if (!isWalkable(cx, cy, SPAWN_BODY_RADIUS)) {
      return;
    }
    walkCells.push({
      x: cx,
      y: cy,
      dist: distanceFromOrigin(cx, cy)
    });
  });
}

function livingMonsters() {
  return monsters.filter((monster) => !monster.finished || monster.undead);
}

function tooCloseToMonsters(x, y, gap) {
  for (const monster of livingMonsters()) {
    if (Math.hypot(monster.x - x, monster.y - y) < gap) {
      return true;
    }
  }
  return false;
}

function tooCloseToPortal(x, y) {
  const area = getArea();
  for (const portal of area.portals || []) {
    if (Math.hypot(portal.x - x, portal.y - y) < PORTAL_RADIUS + SPAWN_BODY_RADIUS) {
      return true;
    }
  }
  return false;
}

function isValidSpawn(x, y, player, opts) {
  if (!isWalkable(x, y, SPAWN_BODY_RADIUS)) {
    return false;
  }
  if (opts.avoidSafe !== false && isSafeZone(x, y)) {
    return false;
  }
  if (opts.avoidPortals !== false && tooCloseToPortal(x, y)) {
    return false;
  }

  const originDist = distanceFromOrigin(x, y);
  if (originDist < opts.minDist || originDist > opts.maxDist) {
    return false;
  }

  if (player) {
    const playerDist = Math.hypot(player.x - x, player.y - y);
    if (playerDist < opts.minPlayerDist || playerDist > opts.maxPlayerDist) {
      return false;
    }
  }

  const gap = opts.gap ?? MIN_SPAWN_GAP;
  if (gap > 0 && tooCloseToMonsters(x, y, gap)) {
    return false;
  }

  return true;
}

function pickFromCache(player, opts, attempts) {
  if (!walkCells.length) {
    rebuildSpawnCache();
  }
  if (!walkCells.length) {
    return null;
  }

  for (let i = 0; i < attempts; i++) {
    const cell = walkCells[(Math.random() * walkCells.length) | 0];
    if (isValidSpawn(cell.x, cell.y, player, opts)) {
      return { x: cell.x, y: cell.y };
    }
  }

  const found = [];
  const start = (Math.random() * walkCells.length) | 0;
  for (let i = 0; i < walkCells.length; i++) {
    const cell = walkCells[(start + i) % walkCells.length];
    if (!isValidSpawn(cell.x, cell.y, player, opts)) {
      continue;
    }
    found.push(cell);
    if (found.length >= 24) {
      break;
    }
  }
  if (!found.length) {
    return null;
  }
  const chosen = found[(Math.random() * found.length) | 0];
  return { x: chosen.x, y: chosen.y };
}

function normalizeSpawnOptions(player, options, maxDistance) {
  if (typeof options === "number") {
    const preferred = options;
    return {
      minDist: Math.max(0, preferred - 160),
      maxDist: Number.isFinite(maxDistance) ? maxDistance : preferred + 160,
      minPlayerDist: MIN_RESPAWN_DISTANCE,
      maxPlayerDist: Infinity,
      avoidSafe: true,
      avoidPortals: true,
      gap: MIN_SPAWN_GAP
    };
  }
  return {
    minDist: 0,
    maxDist: Infinity,
    minPlayerDist: MIN_RESPAWN_DISTANCE,
    maxPlayerDist: Infinity,
    avoidSafe: true,
    avoidPortals: true,
    gap: MIN_SPAWN_GAP,
    ...options
  };
}

export function findSpawnPoint(player, options = {}, maxDistance = Infinity) {
  const opts = normalizeSpawnOptions(player, options, maxDistance);
  const point = pickFromCache(player, opts, SPAWN_ATTEMPTS);
  if (point) {
    return point;
  }

  const relaxed = { ...opts, gap: Math.max(24, (opts.gap ?? MIN_SPAWN_GAP) * 0.5) };
  const retry = pickFromCache(player, relaxed, 24);
  if (retry) {
    return retry;
  }

  return pickFromCache(player, { ...opts, gap: 0 }, 16);
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
  const point = findSpawnPoint(player, {
    minDist,
    maxDist: Math.max(minDist + 1, maxDist),
    minPlayerDist: MIN_RESPAWN_DISTANCE,
    avoidSafe: true,
    avoidPortals: true
  });
  if (!point) {
    return null;
  }
  const rarity = rollZoneRarity(distanceFromOrigin(point.x, point.y), getArea().safeRadius, getArea().zoneBand);
  return spawnMonster(type, point.x, point.y, rarity, zoneIndex);
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
    let x = spec.x;
    let y = spec.y;
    if (!isWalkable(x, y, SPAWN_BODY_RADIUS) || tooCloseToPortal(x, y)) {
      const nearby = findSpawnPoint(null, {
        minDist: 0,
        maxDist: Infinity,
        minPlayerDist: 0,
        maxPlayerDist: Infinity,
        avoidSafe: false,
        avoidPortals: true,
        gap: MIN_SPAWN_GAP * 0.6
      });
      if (nearby) {
        x = nearby.x;
        y = nearby.y;
      }
    }
    created.push(spawnMonster("slime", x, y, spec.rarity, homeZone, { ephemeral }));
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
