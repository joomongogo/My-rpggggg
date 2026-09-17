import { getMapHeight, getMapWidth } from "./map.js";

export const camera = {
  x: 0,
  y: 0
};

export function updateCamera(player, canvas) {
  const mapWidth = getMapWidth();
  const mapHeight = getMapHeight();
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;

  camera.x = Math.max(0, Math.min(Math.max(0, mapWidth - canvas.width), camera.x));
  camera.y = Math.max(0, Math.min(Math.max(0, mapHeight - canvas.height), camera.y));
}

export function worldToScreen(x, y) {
  return {
    x: x - camera.x,
    y: y - camera.y
  };
}

export function isOnScreen(x, y, padding, canvas) {
  const screen = worldToScreen(x, y);
  return (
    screen.x > -padding &&
    screen.y > -padding &&
    screen.x < canvas.width + padding &&
    screen.y < canvas.height + padding
  );
}
