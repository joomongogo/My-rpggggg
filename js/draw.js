import { worldToScreen, isOnScreen } from "./camera.js";
import { effects } from "./combat.js";
import { getSlotWorldPos } from "./loadout.js";
import { createRarityPaint, getRarityColor } from "./rarity.js";

function drawEyes(ctx, x, y, size, dirX, dirY, count = 2) {
  const dist = Math.hypot(dirX, dirY) || 1;
  const ox = (dirX / dist) * size * 0.18;
  const oy = (dirY / dist) * size * 0.18;

  const drawEye = (ex, ey, scale) => {
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(ex, ey, size * 0.16 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#111";
    ctx.arc(ex + ox * 0.35, ey + oy * 0.35, size * 0.07 * scale, 0, Math.PI * 2);
    ctx.fill();
  };

  if (count === 1) {
    drawEye(x + ox, y + oy - size * 0.08, 1.15);
    return;
  }

  drawEye(x - size * 0.22 + ox, y - size * 0.1 + oy, 1);
  drawEye(x + size * 0.22 + ox, y - size * 0.1 + oy, 1);
}

export function drawItemShape(ctx, x, y, size, item, time, ready = true) {
  ctx.save();
  ctx.fillStyle = ready
    ? createRarityPaint(ctx, x, y, size, item.rarity, time)
    : "#555";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
  ctx.lineWidth = 1.5;

  if (item.type === "fang") {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.85, y + size * 0.75);
    ctx.lineTo(x - size * 0.85, y + size * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (item.type === "potion") {
    ctx.fillRect(x - size * 0.8, y - size * 0.8, size * 1.6, size * 1.6);
    ctx.strokeRect(x - size * 0.8, y - size * 0.8, size * 1.6, size * 1.6);
  } else if (item.type === "dart") {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.7, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.7, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (item.type === "boulder") {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.86, y - size * 0.45);
    ctx.lineTo(x + size * 0.86, y + size * 0.45);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.86, y + size * 0.45);
    ctx.lineTo(x - size * 0.86, y - size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function paintItemIcon(canvas, item, time = 0) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !item) {
    return;
  }
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  drawItemShape(ctx, w / 2, h / 2, Math.min(w, h) * 0.32, item, time, true);
}

function drawSlime(ctx, screen, monster, time, player) {
  const wobble = 1 + Math.sin(time * 6 + monster.id) * 0.08;
  ctx.beginPath();
  ctx.ellipse(screen.x, screen.y, monster.size, monster.size * wobble, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(120, 210, 130, 0.88)";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(
    screen.x - monster.size * 0.2,
    screen.y - monster.size * 0.35,
    monster.size * 0.28,
    monster.size * 0.14,
    -0.4,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fill();
  drawEyes(ctx, screen.x, screen.y, monster.size, player.x - monster.x, player.y - monster.y);
}

function drawZombie(ctx, screen, monster, player) {
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, monster.size, 0.15, Math.PI * 1.75);
  ctx.lineTo(screen.x + monster.size * 0.35, screen.y + monster.size * 0.15);
  ctx.closePath();
  ctx.fillStyle = monster.undead ? "#6d8a4a" : "#5a6b3f";
  ctx.fill();

  ctx.strokeStyle = "#2d3318";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screen.x - monster.size * 0.35, screen.y + monster.size * 0.05);
  ctx.lineTo(screen.x + monster.size * 0.05, screen.y + monster.size * 0.18);
  ctx.moveTo(screen.x + monster.size * 0.1, screen.y + monster.size * 0.22);
  ctx.lineTo(screen.x + monster.size * 0.32, screen.y + monster.size * 0.08);
  ctx.stroke();

  drawEyes(ctx, screen.x, screen.y, monster.size, player.x - monster.x, player.y - monster.y, 1);

  if (monster.undead) {
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, monster.size + 6 + Math.sin(performance.now() / 120) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180, 255, 140, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawBat(ctx, screen, monster, player) {
  const flap = 0.35 + Math.sin(performance.now() / 90 + monster.id) * 0.18;
  ctx.fillStyle = monster.dashing > 0 ? "#d4c36a" : "#4a3a28";
  ctx.beginPath();
  ctx.ellipse(screen.x - monster.size * 0.95, screen.y, monster.size * 1.05, monster.size * flap, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(screen.x + monster.size * 0.95, screen.y, monster.size * 1.05, monster.size * flap, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, monster.size * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = "#2b2118";
  ctx.fill();
  drawEyes(ctx, screen.x, screen.y, monster.size * 0.85, player.x - monster.x, player.y - monster.y);
}

function drawGolem(ctx, screen, monster, player) {
  const s = monster.size;
  ctx.fillStyle = "#8a8680";
  ctx.fillRect(screen.x - s * 0.85, screen.y - s * 0.75, s * 1.7, s * 1.55);
  ctx.strokeStyle = "#4d4a45";
  ctx.lineWidth = 3;
  ctx.strokeRect(screen.x - s * 0.85, screen.y - s * 0.75, s * 1.7, s * 1.55);
  ctx.fillStyle = "#9b958c";
  ctx.fillRect(screen.x - s * 0.45, screen.y - s * 1.05, s * 0.9, s * 0.45);
  drawEyes(ctx, screen.x, screen.y - s * 0.1, s * 0.85, player.x - monster.x, player.y - monster.y);
}

function drawWitch(ctx, screen, monster, player) {
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, monster.size, 0, Math.PI * 2);
  ctx.fillStyle = "#7b4fc4";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(screen.x - monster.size * 0.7, screen.y - monster.size * 0.35);
  ctx.lineTo(screen.x + monster.size * 0.75, screen.y - monster.size * 0.15);
  ctx.lineTo(screen.x + monster.size * 0.1, screen.y - monster.size * 1.25);
  ctx.closePath();
  ctx.fillStyle = "#2b1638";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(screen.x, screen.y, monster.size + 7, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(210, 170, 255, 0.7)";
  ctx.lineWidth = monster.aoe ? 3 : 1.5;
  ctx.stroke();
  drawEyes(ctx, screen.x, screen.y, monster.size, player.x - monster.x, player.y - monster.y);
}

function drawMonsterHp(ctx, screen, monster) {
  const width = Math.max(36, monster.size * 1.6);
  const x = screen.x - width / 2;
  const y = screen.y - monster.size - 14;
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, width, 5);
  ctx.fillStyle = "#4caf50";
  ctx.fillRect(x, y, width * Math.max(0, monster.hp / monster.maxHp), 5);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(x, y, width, 5);
}

function drawRarityLabel(ctx, screen, monster, time) {
  const y = screen.y + monster.size + 14;
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
  ctx.strokeText(monster.rarity, screen.x, y);
  ctx.fillStyle = getRarityColor(monster.rarity, time);
  ctx.fillText(monster.rarity, screen.x, y);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export function drawMonsters(ctx, canvas, monsterList, player, time) {
  for (const monster of monsterList) {
    if (monster.finished && !monster.undead) {
      continue;
    }
    if (!isOnScreen(monster.x, monster.y, 80, canvas)) {
      continue;
    }

    const screen = worldToScreen(monster.x, monster.y);
    if (monster.type === "slime") {
      drawSlime(ctx, screen, monster, time, player);
    } else if (monster.type === "zombie") {
      drawZombie(ctx, screen, monster, player);
    } else if (monster.type === "bat") {
      drawBat(ctx, screen, monster, player);
    } else if (monster.type === "golem") {
      drawGolem(ctx, screen, monster, player);
    } else {
      drawWitch(ctx, screen, monster, player);
    }

    if (monster.alive || monster.undead) {
      drawMonsterHp(ctx, screen, monster);
      drawRarityLabel(ctx, screen, monster, time);
    }

    if (monster.aoe) {
      const aoe = worldToScreen(monster.aoe.x, monster.aoe.y);
      const progress = 1 - monster.aoe.windup / 0.9;
      ctx.beginPath();
      ctx.arc(aoe.x, aoe.y, monster.aoe.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(190, 120, 255, ${0.4 + progress * 0.5})`;
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

export function drawPlayer(ctx, player) {
  const screen = worldToScreen(player.x, player.y);
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, player.size, 0, Math.PI * 2);
  ctx.fillStyle = player.hp > 0 ? "#4da6ff" : "#777";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#d8ecff";
  ctx.stroke();

  if (player.hp > 0) {
    drawEyes(ctx, screen.x, screen.y, player.size, 1, 0);
  }
}

export function drawLoadout(ctx, player, time) {
  player.loadout.forEach((slot, index) => {
    if (!slot.item) {
      return;
    }
    const pos = getSlotWorldPos(player, index);
    const screen = worldToScreen(pos.x, pos.y);
    const ready = slot.cooldown <= 0;
    drawItemShape(ctx, screen.x, screen.y, 8, slot.item, time, ready);

    if (!ready) {
      const ratio = 1 - slot.cooldown / slot.item.reload;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.arc(screen.x, screen.y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
    }
  });
}

export function drawDrops(ctx, canvas, dropList, time) {
  for (const drop of dropList) {
    if (!isOnScreen(drop.x, drop.y, 20, canvas)) {
      continue;
    }
    const screen = worldToScreen(drop.x, drop.y);
    drawItemShape(ctx, screen.x, screen.y, 9, drop.item, time);
  }
}

export function drawEffects(ctx, canvas) {
  for (const effect of effects) {
    if (!isOnScreen(effect.x, effect.y, effect.radius + 10, canvas)) {
      continue;
    }
    const screen = worldToScreen(effect.x, effect.y);
    const alpha = Math.max(0, effect.life / 0.22);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, effect.radius, 0, Math.PI * 2);
    if (effect.type === "potion") {
      ctx.fillStyle = "rgba(180, 130, 255, 0.28)";
      ctx.fill();
      ctx.strokeStyle = "#e0c8ff";
    } else if (effect.type === "mucus") {
      ctx.fillStyle = "rgba(150, 230, 130, 0.4)";
      ctx.fill();
      ctx.strokeStyle = "#c8ffb0";
    } else if (effect.type === "boulder") {
      ctx.fillStyle = "rgba(180, 160, 130, 0.35)";
      ctx.fill();
      ctx.strokeStyle = "#e8dcc8";
    } else if (effect.type === "dart") {
      ctx.strokeStyle = "#f0e08a";
    } else {
      ctx.strokeStyle = "#ffe8e0";
    }
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}
