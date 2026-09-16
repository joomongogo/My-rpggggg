export function updateBat(monster, player, dt) {
  monster.dashTimer = (monster.dashTimer || 0) - dt;
  if (monster.dashing > 0) {
    monster.dashing -= dt;
    if (monster.dashing <= 0) {
      monster.dashing = 0;
    }
  }

  if (monster.dashTimer <= 0) {
    monster.dashTimer = 1.2 + Math.random() * 0.9;
    monster.dashing = 0.16 + Math.random() * 0.06;
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    const len = Math.hypot(dx, dy) || 1;
    const side = Math.random() < 0.5 ? 1 : -1;
    monster.dashX = (-dy / len) * side;
    monster.dashY = (dx / len) * side;
  }

  if (monster.dashing > 0) {
    return {
      dirX: monster.dashX || 0,
      dirY: monster.dashY || 1,
      extraSpeed: 3.1
    };
  }

  return null;
}
