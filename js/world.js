import { MAP_HEIGHT, MAP_WIDTH, SPAWN_X, SPAWN_Y, TILE_SIZE } from "./constants.js";
import { camera, worldToScreen } from "./camera.js";

const DECORATIONS = [
  { x: 5920, y: 5920, w: 160, h: 36 },
  { x: 5800, y: 6100, w: 80, h: 180 },
  { x: 6180, y: 5860, w: 220, h: 32 },
  { x: 3500, y: 4000, w: 200, h: 40 },
  { x: 8200, y: 3100, w: 50, h: 220 },
  { x: 2400, y: 8600, w: 180, h: 44 },
  { x: 9100, y: 8800, w: 160, h: 40 }
];

export function drawWorld(ctx, canvas) {
  ctx.fillStyle = "#172417";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = Math.floor(camera.x / TILE_SIZE) * TILE_SIZE;
  const startY = Math.floor(camera.y / TILE_SIZE) * TILE_SIZE;
  const endX = camera.x + canvas.width;
  const endY = camera.y + canvas.height;

  ctx.strokeStyle = "#203520";
  ctx.lineWidth = 1;

  for (let x = startX; x < endX; x += TILE_SIZE) {
    for (let y = startY; y < endY; y += TILE_SIZE) {
      const screen = worldToScreen(x, y);
      ctx.strokeRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);
    }
  }

  const hub = worldToScreen(SPAWN_X, SPAWN_Y);
  ctx.beginPath();
  ctx.arc(hub.x, hub.y, 90, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(80, 120, 70, 0.35)";
  ctx.fill();
  ctx.strokeStyle = "rgba(210, 230, 180, 0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#555";
  for (const deco of DECORATIONS) {
    const screen = worldToScreen(deco.x, deco.y);
    ctx.fillRect(screen.x, screen.y, deco.w, deco.h);
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.strokeRect(
    worldToScreen(0, 0).x,
    worldToScreen(0, 0).y,
    MAP_WIDTH,
    MAP_HEIGHT
  );
}
