import { MAP_HEIGHT, MAP_WIDTH, SPAWN_X, SPAWN_Y, TILE_SIZE } from "./constants.js";
import { camera, worldToScreen } from "./camera.js";
import { forEachWallInView } from "./map.js";

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

  ctx.fillStyle = "#243024";
  ctx.strokeStyle = "#314531";
  ctx.lineWidth = 1;
  forEachWallInView(camera.x - 20, camera.y - 20, endX + 20, endY + 20, (x, y, w, h) => {
    const screen = worldToScreen(x, y);
    ctx.fillRect(screen.x, screen.y, w, h);
    ctx.strokeRect(screen.x, screen.y, w, h);
  });

  const hub = worldToScreen(SPAWN_X, SPAWN_Y);
  ctx.beginPath();
  ctx.arc(hub.x, hub.y, 90, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(80, 120, 70, 0.35)";
  ctx.fill();
  ctx.strokeStyle = "rgba(210, 230, 180, 0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.strokeRect(
    worldToScreen(0, 0).x,
    worldToScreen(0, 0).y,
    MAP_WIDTH,
    MAP_HEIGHT
  );
}
