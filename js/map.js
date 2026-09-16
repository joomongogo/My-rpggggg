import { MAP_HEIGHT, MAP_WIDTH, SAFE_SPAWN_RADIUS, SPAWN_X, SPAWN_Y } from "./constants.js";

export const CELL = 160;
export const COLS = MAP_WIDTH / CELL;
export const ROWS = MAP_HEIGHT / CELL;

const open = new Uint8Array(COLS * ROWS);

function indexOf(c, r) {
  return r * COLS + c;
}

function inGrid(c, r) {
  return c >= 0 && r >= 0 && c < COLS && r < ROWS;
}

function setOpen(c, r, value) {
  if (inGrid(c, r)) {
    open[indexOf(c, r)] = value ? 1 : 0;
  }
}

export function isCellOpen(c, r) {
  return inGrid(c, r) && open[indexOf(c, r)] === 1;
}

function carveCell(c, r) {
  setOpen(c, r, true);
}

function carveDisk(c, r, radius) {
  const r2 = radius * radius + 1;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dc * dc + dr * dr <= r2) {
        carveCell(c + dc, r + dr);
      }
    }
  }
}

function cellAt(x, y) {
  return {
    c: Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))),
    r: Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL)))
  };
}

function carveLine(c0, r0, c1, r1, width) {
  let c = c0;
  let r = r0;
  carveDisk(c, r, width);
  let guard = COLS * ROWS;
  while ((c !== c1 || r !== r1) && guard-- > 0) {
    const dc = c1 - c;
    const dr = r1 - r;
    if (Math.abs(dc) >= Math.abs(dr)) {
      c += Math.sign(dc);
    } else {
      r += Math.sign(dr);
    }
    carveDisk(c, r, width);
  }
}

function cellCenter(c, r) {
  return { x: (c + 0.5) * CELL, y: (r + 0.5) * CELL };
}

function pruneUnreachable() {
  const spawn = cellAt(SPAWN_X, SPAWN_Y);
  const seen = new Uint8Array(COLS * ROWS);
  const queue = [];
  if (isCellOpen(spawn.c, spawn.r)) {
    seen[indexOf(spawn.c, spawn.r)] = 1;
    queue.push(spawn.c, spawn.r);
  }

  const dirs = [1, 0, -1, 0, 1];
  let head = 0;
  while (head < queue.length) {
    const c = queue[head++];
    const r = queue[head++];
    for (let i = 0; i < 4; i++) {
      const nc = c + dirs[i];
      const nr = r + dirs[i + 1];
      if (!inGrid(nc, nr)) {
        continue;
      }
      const idx = indexOf(nc, nr);
      if (seen[idx] || !open[idx]) {
        continue;
      }
      seen[idx] = 1;
      queue.push(nc, nr);
    }
  }

  for (let i = 0; i < open.length; i++) {
    if (open[i] && !seen[i]) {
      open[i] = 0;
    }
  }
}

export function generateMap() {
  open.fill(0);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const pos = cellCenter(c, r);
      if (Math.hypot(pos.x - SPAWN_X, pos.y - SPAWN_Y) <= SAFE_SPAWN_RADIUS + CELL) {
        carveCell(c, r);
      }
    }
  }

  const width = 2;
  const maxDist = 5800;
  const arms = 7;
  const hub = cellAt(SPAWN_X, SPAWN_Y);

  for (let i = 0; i < arms; i++) {
    let angle = (i / arms) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    let dist = SAFE_SPAWN_RADIUS;
    let prev = cellAt(SPAWN_X + Math.cos(angle) * dist, SPAWN_Y + Math.sin(angle) * dist);
    carveLine(hub.c, hub.r, prev.c, prev.r, width);

    while (dist < maxDist) {
      dist += CELL * 0.9;
      angle += (Math.random() - 0.5) * 0.32;
      const next = cellAt(
        SPAWN_X + Math.cos(angle) * dist,
        SPAWN_Y + Math.sin(angle) * dist
      );
      carveLine(prev.c, prev.r, next.c, next.r, width);
      prev = next;
    }
  }

  for (const ring of [1300, 2600, 3900, 5200]) {
    const steps = Math.max(24, Math.floor((Math.PI * 2 * ring) / CELL));
    let prev = null;
    for (let s = 0; s <= steps; s++) {
      const a = (s / steps) * Math.PI * 2;
      const cell = cellAt(SPAWN_X + Math.cos(a) * ring, SPAWN_Y + Math.sin(a) * ring);
      if (prev) {
        carveLine(prev.c, prev.r, cell.c, cell.r, width);
      }
      prev = cell;
    }
  }

  pruneUnreachable();
  console.log("[map] generated");
}

export function isBlocked(x, y, radius) {
  if (x - radius < 0 || y - radius < 0 || x + radius > MAP_WIDTH || y + radius > MAP_HEIGHT) {
    return true;
  }

  const minC = Math.floor((x - radius) / CELL);
  const maxC = Math.floor((x + radius) / CELL);
  const minR = Math.floor((y - radius) / CELL);
  const maxR = Math.floor((y + radius) / CELL);

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (!isCellOpen(c, r)) {
        return true;
      }
    }
  }
  return false;
}

export function isWalkable(x, y, radius) {
  return !isBlocked(x, y, radius);
}

export function moveWithSlide(x, y, dx, dy, radius) {
  const nextX = x + dx;
  const nextY = y + dy;
  if (!isBlocked(nextX, nextY, radius)) {
    return { x: nextX, y: nextY };
  }
  if (!isBlocked(nextX, y, radius)) {
    return { x: nextX, y };
  }
  if (!isBlocked(x, nextY, radius)) {
    return { x, y: nextY };
  }
  return { x, y };
}

export function forEachWallInView(minX, minY, maxX, maxY, fn) {
  const minC = Math.max(0, Math.floor(minX / CELL));
  const maxC = Math.min(COLS - 1, Math.floor(maxX / CELL));
  const minR = Math.max(0, Math.floor(minY / CELL));
  const maxR = Math.min(ROWS - 1, Math.floor(maxY / CELL));

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (!isCellOpen(c, r)) {
        fn(c * CELL, r * CELL, CELL, CELL);
      }
    }
  }
}

export function forEachOpenCell(fn) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (isCellOpen(c, r)) {
        fn(c * CELL, r * CELL, CELL, CELL);
      }
    }
  }
}
