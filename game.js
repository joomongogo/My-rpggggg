const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  speed: 5,
  hp: 100
};

let monster = {
  x: 200,
  y: 150,
  size: 25,
  speed: 1.5,
  hp: 100,
  alive: true
};

const keys = {};

let attack = {
  active: false,
  timer: 0,
  range: 60,
  damage: 20
};

document.addEventListener("keydown", e => {
  keys[e.key] = true;

  if (e.code === "Space" && !attack.active) {
    attack.active = true;
    attack.timer = 10;
  }
});

document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

function update() {
  if (keys["w"] || keys["ArrowUp"])
    player.y -= player.speed;

  if (keys["s"] || keys["ArrowDown"])
    player.y += player.speed;

  if (keys["a"] || keys["ArrowLeft"])
    player.x -= player.speed;

  if (keys["d"] || keys["ArrowRight"])
    player.x += player.speed;

  player.x = Math.max(
    player.size,
    Math.min(canvas.width - player.size, player.x)
  );

  player.y = Math.max(
    player.size,
    Math.min(canvas.height - player.size, player.y)
  );

  if (monster.alive) {
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 1) {
      monster.x += dx / distance * monster.speed;
      monster.y += dy / distance * monster.speed;
    }

    if (distance < player.size + monster.size) {
      player.hp -= 0.2;

      if (player.hp < 0)
        player.hp = 0;
    }
  }

  if (attack.active) {
    attack.timer--;

    if (monster.alive) {
      const dx = player.x - monster.x;
      const dy = player.y - monster.y;
      const distance = Math.hypot(dx, dy);

      if (distance < attack.range + monster.size) {
        monster.hp -= attack.damage;

        if (monster.hp <= 0) {
          monster.hp = 0;
          monster.alive = false;
        }
      }
    }

    if (attack.timer <= 0)
      attack.active = false;
  }
}

function drawMap() {
  ctx.fillStyle = "#172417";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tileSize = 50;

  for (let x = 0; x < canvas.width; x += tileSize) {
    for (let y = 0; y < canvas.height; y += tileSize) {
      ctx.strokeStyle = "#203520";
      ctx.strokeRect(x, y, tileSize, tileSize);
    }
  }

  ctx.fillStyle = "#555";

  ctx.fillRect(100, 100, 150, 40);
  ctx.fillRect(500, 300, 200, 40);
  ctx.fillRect(800, 150, 50, 200);
}

function drawPlayer() {
  ctx.fillStyle = "#4da6ff";

  ctx.beginPath();
  ctx.arc(
    player.x,
    player.y,
    player.size,
    0,
    Math.PI * 2
  );

  ctx.fill();
}

function drawMonster() {
  if (!monster.alive)
    return;

  ctx.fillStyle = "#e63946";

  ctx.beginPath();
  ctx.arc(
    monster.x,
    monster.y,
    monster.size,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillStyle = "#222";
  ctx.fillRect(
    monster.x - 25,
    monster.y - 40,
    50,
    6
  );

  ctx.fillStyle = "#4caf50";
  ctx.fillRect(
    monster.x - 25,
    monster.y - 40,
    50 * (monster.hp / 100),
    6
  );
}

function drawAttack() {
  if (!attack.active)
    return;

  ctx.strokeStyle = "white";
  ctx.lineWidth = 6;

  ctx.beginPath();
  ctx.arc(
    player.x,
    player.y,
    attack.range,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  ctx.lineWidth = 1;
}

function drawUI() {
  ctx.fillStyle = "#222";
  ctx.fillRect(20, 20, 200, 20);

  ctx.fillStyle = "#e63946";
  ctx.fillRect(
    20,
    20,
    200 * (player.hp / 100),
    20
  );

  ctx.strokeStyle = "white";
  ctx.strokeRect(20, 20, 200, 20);

  ctx.fillStyle = "white";
  ctx.font = "16px Arial";

  ctx.fillText(
    "HP: " + Math.floor(player.hp),
    25,
    36
  );

  ctx.fillText(
    "WASD / 방향키로 이동",
    20,
    65
  );

  ctx.fillText(
    "Space: 공격",
    20,
    85
  );

  if (!monster.alive) {
    ctx.font = "30px Arial";
    ctx.fillText(
      "MONSTER DEFEATED!",
      canvas.width / 2 - 150,
      100
    );
  }
}

function draw() {
  drawMap();
  drawMonster();
  drawAttack();
  drawPlayer();
  drawUI();
}

function loop() {
  update();
  draw();

  requestAnimationFrame(loop);
}

loop();

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
