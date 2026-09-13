import { worldToScreen, isOnScreen } from "./camera.js";
import { effects } from "./combat.js";
import { getSlotWorldPos } from "./loadout.js";
import { getRarityColor } from "./rarity.js";

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

function strokeRarity(ctx, x, y, radius, rarity) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = getRarityColor(rarity);
  ctx.lineWidth = rarity === "X_" ? 5 : 3;
  ctx.stroke();
  if (rarity === "X_") {
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawSlime(ctx, screen, monster, time, player) {
  const wobble = 1 + Math.sin(time * 6 + monster.id) * 0.08;
  ctx.beginPath();
  ctx.ellipse(screen.x, screen.y, monster.size, monster.size * wobble, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(120, 210, 130, 0.88)";
  ctx.fill();
  strokeRarity(ctx, screen.x, screen.y, monster.size, monster.rarity);

  ctx.beginPath();
  ctx.ellipse(screen.x - monster.size * 0.2, screen.y - monster.size * 0.35, monster.size * 0.28, monster.size * 0.14, -0.4, 0, Math.PI * 2);
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
  strokeRarity(ctx, screen.x, screen.y, monster.size, monster.rarity);

  ctx.strokeStyle = "#2d3318";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screen.x - monster.size * 0.35, screen.y + monster.size * 0.05);
  ctx.lineTo(screen.x - monster.size * 0.05, screen.y + monster.size * 0.18);
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

function drawWitch(ctx, screen, monster, player) {
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, monster.size, 0, Math.PI * 2);
  ctx.fillStyle = "#7b4fc4";
  ctx.fill();
  strokeRarity(ctx, screen.x, screen.y, monster.size, monster.rarity);

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
    } else {
      drawWitch(ctx, screen, monster, player);
    }

    if (monster.alive || monster.undead) {
      drawMonsterHp(ctx, screen, monster);
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

export function drawLoadout(ctx, player) {
  player.loadout.forEach((slot, index) => {
    if (!slot.item) {
      return;
    }
    const pos = getSlotWorldPos(player, index);
    const screen = worldToScreen(pos.x, pos.y);
    const ready = slot.cooldown <= 0;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = ready ? slot.item.color : "#555";
    ctx.fill();
    strokeRarity(ctx, screen.x, screen.y, 8, slot.item.rarity);

    if (!ready) {
      const ratio = 1 - slot.cooldown / slot.item.reload;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.arc(screen.x, screen.y, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
    }
  });
}

export function drawDrops(ctx, canvas, dropList) {
  for (const drop of dropList) {
    if (!isOnScreen(drop.x, drop.y, 20, canvas)) {
      continue;
    }
    const screen = worldToScreen(drop.x, drop.y);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = drop.item.color;
    ctx.fill();
    strokeRarity(ctx, screen.x, screen.y, 9, drop.rarity);
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
    } else {
      ctx.strokeStyle = "#ffe8e0";
    }
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}
