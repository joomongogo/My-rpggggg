import { TILE_SIZE } from "./constants.js";
import { getArea, getOrigin } from "./areas.js";
import { camera, worldToScreen } from "./camera.js";
import { forEachWallInView, getMapHeight, getMapWidth } from "./map.js";

export function drawWorld(ctx, canvas) {
  const area = getArea();
  ctx.fillStyle = area.ground || "#172417";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = Math.floor(camera.x / TILE_SIZE) * TILE_SIZE;
  const startY = Math.floor(camera.y / TILE_SIZE) * TILE_SIZE;
  const endX = camera.x + canvas.width;
  const endY = camera.y + canvas.height;

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;

  for (let x = startX; x < endX; x += TILE_SIZE) {
    for (let y = startY; y < endY; y += TILE_SIZE) {
      const screen = worldToScreen(x, y);
      ctx.strokeRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);
    }
  }

  ctx.fillStyle = area.wall || "#243024";
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  forEachWallInView(camera.x - 20, camera.y - 20, endX + 20, endY + 20, (x, y, w, h) => {
    const screen = worldToScreen(x, y);
    ctx.fillRect(screen.x, screen.y, w, h);
    ctx.strokeRect(screen.x, screen.y, w, h);
  });

  const origin = getOrigin();
  const hub = worldToScreen(origin.x, origin.y);
  ctx.beginPath();
  ctx.arc(hub.x, hub.y, area.id === "hub" ? 120 : 70, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(80, 120, 70, 0.28)";
  ctx.fill();
  ctx.strokeStyle = "rgba(210, 230, 180, 0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();

  if (area.id === "hub") {
    const houses = [
      [1520, 1680, 180, 140],
      [2300, 1640, 160, 150],
      [1480, 2140, 170, 130],
      [2360, 2180, 190, 140],
      [1860, 1520, 120, 100]
    ];
    for (const [x, y, w, h] of houses) {
      const screen = worldToScreen(x, y);
      ctx.fillStyle = "#3d3428";
      ctx.fillRect(screen.x, screen.y, w, h);
      ctx.fillStyle = "#6b4a32";
      ctx.beginPath();
      ctx.moveTo(screen.x - 8, screen.y);
      ctx.lineTo(screen.x + w / 2, screen.y - 36);
      ctx.lineTo(screen.x + w + 8, screen.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.strokeRect(worldToScreen(0, 0).x, worldToScreen(0, 0).y, getMapWidth(), getMapHeight());
}

export function drawPortals(ctx) {
  const area = getArea();
  for (const portal of area.portals || []) {
    const screen = worldToScreen(portal.x, portal.y);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 36, 0, Math.PI * 2);
    ctx.fillStyle = portal.color || "#fff";
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = portal.color || "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.strokeText(portal.label, screen.x, screen.y - 48);
    ctx.fillStyle = "#fff";
    ctx.fillText(portal.label, screen.x, screen.y - 48);
    ctx.textAlign = "left";
  }
}
