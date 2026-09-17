export function updateDracula(monster, player, dt) {
  monster.dashTimer = (monster.dashTimer || 0) - dt;
  if (monster.dashing > 0) {
    monster.dashing -= dt;
    if (monster.dashing <= 0) {
      monster.dashing = 0;
    }
  }

  if (monster.dashTimer <= 0) {
    monster.dashTimer = 1.5 + Math.random() * 0.8;
    monster.dashing = 0.2 + Math.random() * 0.06;
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    const len = Math.hypot(dx, dy) || 1;
    monster.dashX = dx / len;
    monster.dashY = dy / len;
  }

  if (monster.dashing > 0) {
    return {
      dirX: monster.dashX || 0,
      dirY: monster.dashY || 1,
      extraSpeed: 2.35
    };
  }

  return null;
}
