export function updateLeafbug(monster, dt) {
  monster.dashTimer = (monster.dashTimer || 0) - dt;
  if (monster.dashTimer <= 0) {
    monster.dashTimer = 0.16 + Math.random() * 0.12;
    const angle = Math.random() * Math.PI * 2;
    monster.dashX = Math.cos(angle);
    monster.dashY = Math.sin(angle);
  }

  return {
    dirX: monster.dashX || 0,
    dirY: monster.dashY || 1,
    extraSpeed: 1.2
  };
}
