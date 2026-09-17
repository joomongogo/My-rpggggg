import { getArea } from "./areas.js";
import { getMapHeight, getMapWidth } from "./map.js";
import { forEachOpenCell } from "./map.js";

const SIZE = 180;
const MONSTER_COLORS = {
  slime: "#78d282",
  zombie: "#8aa05a",
  witch: "#b388ff",
  bat: "#d4c36a",
  golem: "#c4b8a4",
  dracula: "#9b1c2e",
  leafbug: "#b6e05a"
};

let wallLayer = null;

export function buildMinimap() {
  const mapWidth = getMapWidth();
  const mapHeight = getMapHeight();
  wallLayer = document.createElement("canvas");
  wallLayer.width = SIZE;
  wallLayer.height = SIZE;
  const ctx = wallLayer.getContext("2d");
  ctx.fillStyle = "#101810";
  ctx.fillRect(0, 0, SIZE, SIZE);
  const sx = SIZE / mapWidth;
  const sy = SIZE / mapHeight;
  ctx.fillStyle = "#2c3d2c";
  forEachOpenCell((x, y, w, h) => {
    ctx.fillRect(x * sx, y * sy, Math.max(1, w * sx), Math.max(1, h * sy));
  });
}

export function drawMinimap(player, monsterList) {
  const canvas = document.getElementById("minimap");
  if (!canvas) {
    return;
  }
  if (canvas.width !== SIZE) {
    canvas.width = SIZE;
    canvas.height = SIZE;
  }
  if (!wallLayer) {
    buildMinimap();
  }

  const mapWidth = getMapWidth();
  const mapHeight = getMapHeight();
  const ctx = canvas.getContext("2d");
  ctx.drawImage(wallLayer, 0, 0);
  const sx = SIZE / mapWidth;
  const sy = SIZE / mapHeight;

  for (const monster of monsterList) {
    if (monster.finished && !monster.undead) {
      continue;
    }
    const dist = Math.hypot(player.x - monster.x, player.y - monster.y);
    if (dist > 2200) {
      continue;
    }
    ctx.fillStyle = MONSTER_COLORS[monster.type] || "#fff";
    ctx.beginPath();
    ctx.arc(monster.x * sx, monster.y * sy, monster.type === "golem" ? 3.2 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#4da6ff";
  ctx.beginPath();
  ctx.arc(player.x * sx, player.y * sy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8ecff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const area = getArea();
  for (const portal of area.portals || []) {
    ctx.fillStyle = portal.color || "#fff";
    ctx.beginPath();
    ctx.arc(portal.x * sx, portal.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
