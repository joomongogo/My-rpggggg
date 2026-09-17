import { PLAYER_DAMAGE } from "./constants.js";
import { effects } from "./combat.js";
import { drops } from "./drops.js";
import { generateMap } from "./map.js";
import { buildMinimap } from "./minimap.js";
import { monsters } from "./monsters.js";
import { clearSpawns, populateWorld } from "./spawn.js";

export const AREA_DEFS = {
  hub: {
    id: "hub",
    label: "Town",
    style: "hub",
    width: 4000,
    height: 4000,
    spawnX: 2000,
    spawnY: 2000,
    safeRadius: 2000,
    zoneBand: 1100,
    ground: "#24301c",
    wall: "#3a4a30",
    typesForZone() {
      return [];
    },
    portals: [
      { id: "medieval", label: "Medieval", target: "medieval", x: 2000, y: 1180, color: "#c4b08a" },
      { id: "jungle", label: "Jungle", target: "jungle", x: 2860, y: 2000, color: "#4caf6a" },
      { id: "rush", label: "Monster Rush", target: "rush", x: 2000, y: 2820, color: "#e05a4a" }
    ]
  },
  medieval: {
    id: "medieval",
    label: "Medieval",
    style: "winding",
    width: 16000,
    height: 16000,
    spawnX: 8000,
    spawnY: 8000,
    safeRadius: 1200,
    zoneBand: 1100,
    ground: "#2a261c",
    wall: "#4a4333",
    typesForZone(zoneIndex) {
      if (zoneIndex <= 0) {
        return ["zombie"];
      }
      if (zoneIndex === 1) {
        return ["zombie", "bat"];
      }
      if (zoneIndex === 2) {
        return ["zombie", "bat", "witch"];
      }
      return ["zombie", "bat", "witch", "dracula"];
    },
    portals: [{ id: "home", label: "Town", target: "hub", x: 8000, y: 8000, color: "#d8ecff" }]
  },
  jungle: {
    id: "jungle",
    label: "Jungle",
    style: "winding",
    width: 16000,
    height: 16000,
    spawnX: 8000,
    spawnY: 8000,
    safeRadius: 1200,
    zoneBand: 1100,
    ground: "#16301a",
    wall: "#1e4a28",
    typesForZone(zoneIndex) {
      if (zoneIndex <= 0) {
        return ["slime"];
      }
      if (zoneIndex === 1) {
        return ["slime", "leafbug"];
      }
      if (zoneIndex === 2) {
        return ["slime", "leafbug", "golem"];
      }
      return ["slime", "leafbug", "golem"];
    },
    portals: [{ id: "home", label: "Town", target: "hub", x: 8000, y: 8000, color: "#d8ecff" }]
  },
  rush: {
    id: "rush",
    label: "Monster Rush",
    style: "arena",
    width: 3840,
    height: 3840,
    spawnX: 1920,
    spawnY: 1920,
    safeRadius: 280,
    zoneBand: 1100,
    ground: "#301818",
    wall: "#5a2a2a",
    typesForZone() {
      return [];
    },
    portals: []
  }
};

let current = AREA_DEFS.hub;
let portalLock = 0;

export function getArea() {
  return current;
}

export function getOrigin() {
  return { x: current.spawnX, y: current.spawnY };
}

export function isSafeZone(x, y) {
  if (current.id === "hub") {
    return true;
  }
  if (current.id === "rush") {
    return false;
  }
  return Math.hypot(x - current.spawnX, y - current.spawnY) < current.safeRadius;
}

export function lockPortals(seconds = 1.4) {
  portalLock = seconds;
}

export function updatePortalLock(dt) {
  portalLock = Math.max(0, portalLock - dt);
}

export function canUsePortal() {
  return portalLock <= 0;
}

export function scaledDamage(player, amount) {
  return amount * (player.damage / PLAYER_DAMAGE);
}

export function enterArea(id, player) {
  const def = AREA_DEFS[id];
  if (!def) {
    return;
  }
  current = def;
  generateMap(def);
  monsters.length = 0;
  drops.length = 0;
  effects.length = 0;
  clearSpawns();
  player.x = def.spawnX;
  player.y = def.spawnY;
  player.knockX = 0;
  player.knockY = 0;
  portalLock = 1.4;
  if (def.id !== "hub" && def.id !== "rush") {
    populateWorld(player);
  }
  buildMinimap();
  console.log("[area]", def.id);
}
