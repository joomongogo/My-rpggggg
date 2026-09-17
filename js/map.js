const CELL = 160;

let mapWidth = 12000;
let mapHeight = 12000;
let cols = mapWidth / CELL;
let rows = mapHeight / CELL;
let open = new Uint8Array(cols * rows);

export function getCellSize() {
  return CELL;
}

export function getMapWidth() {
  return mapWidth;
}

export function getMapHeight() {
  return mapHeight;
}

export function getCols() {
  return cols;
}

export function getRows() {
  return rows;
}

function indexOf(c, r) {
  return r * cols + c;
}

function inGrid(c, r) {
  return c >= 0 && r >= 0 && c < cols && r < rows;
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
    c: Math.max(0, Math.min(cols - 1, Math.floor(x / CELL))),
    r: Math.max(0, Math.min(rows - 1, Math.floor(y / CELL)))
  };
}

function carveLine(c0, r0, c1, r1, width) {
  let c = c0;
  let r = r0;
  carveDisk(c, r, width);
  let guard = cols * rows;
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

function pruneUnreachable(spawnX, spawnY) {
  const spawn = cellAt(spawnX, spawnY);
  const seen = new Uint8Array(cols * rows);
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

function generateOpenField() {
  open.fill(1);
}

function generateArena() {
  open.fill(0);
  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      carveCell(c, r);
    }
  }
}

function generateWinding(config) {
  open.fill(0);
  const spawnX = config.spawnX;
  const spawnY = config.spawnY;
  const safe = config.safeRadius;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pos = cellCenter(c, r);
      if (Math.hypot(pos.x - spawnX, pos.y - spawnY) <= safe + CELL) {
        carveCell(c, r);
      }
    }
  }

  const width = 2;
  const maxDist = Math.min(spawnX, spawnY, mapWidth - spawnX, mapHeight - spawnY) - CELL * 2;
  const arms = 7;
  const hub = cellAt(spawnX, spawnY);

  for (let i = 0; i < arms; i++) {
    let angle = (i / arms) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    let dist = safe;
    let prev = cellAt(spawnX + Math.cos(angle) * dist, spawnY + Math.sin(angle) * dist);
    carveLine(hub.c, hub.r, prev.c, prev.r, width);

    while (dist < maxDist) {
      dist += CELL * 0.9;
      angle += (Math.random() - 0.5) * 0.32;
      const next = cellAt(spawnX + Math.cos(angle) * dist, spawnY + Math.sin(angle) * dist);
      carveLine(prev.c, prev.r, next.c, next.r, width);
      prev = next;
    }
  }

  const rings = [safe + 200, safe * 2, safe * 3, safe * 4].filter((ring) => ring < maxDist);
  for (const ring of rings) {
    const steps = Math.max(24, Math.floor((Math.PI * 2 * ring) / CELL));
    let prev = null;
    for (let s = 0; s <= steps; s++) {
      const a = (s / steps) * Math.PI * 2;
      const cell = cellAt(spawnX + Math.cos(a) * ring, spawnY + Math.sin(a) * ring);
      if (prev) {
        carveLine(prev.c, prev.r, cell.c, cell.r, width);
      }
      prev = cell;
    }
  }

  pruneUnreachable(spawnX, spawnY);
}

export function generateMap(config) {
  mapWidth = config.width;
  mapHeight = config.height;
  cols = Math.floor(mapWidth / CELL);
  rows = Math.floor(mapHeight / CELL);
  open = new Uint8Array(cols * rows);

  if (config.style === "hub") {
    generateOpenField();
  } else if (config.style === "arena") {
    generateArena();
  } else {
    generateWinding(config);
  }

  console.log("[map] generated", config.id, mapWidth, mapHeight);
}

export function isBlocked(x, y, radius) {
  if (x - radius < 0 || y - radius < 0 || x + radius > mapWidth || y + radius > mapHeight) {
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
  const maxC = Math.min(cols - 1, Math.floor(maxX / CELL));
  const minR = Math.max(0, Math.floor(minY / CELL));
  const maxR = Math.min(rows - 1, Math.floor(maxY / CELL));

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (!isCellOpen(c, r)) {
        fn(c * CELL, r * CELL, CELL, CELL);
      }
    }
  }
}

export function forEachOpenCell(fn) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isCellOpen(c, r)) {
        fn(c * CELL, r * CELL, CELL, CELL);
      }
    }
  }
}
