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
  hp: 100
};

const keys = {};

document.addEventListener("keydown", e => {
  keys[e.key] = true;
});

document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

function update() {
  // 플레이어 이동
  if (keys["w"] || keys["ArrowUp"])
    player.y -= player.speed;

  if (keys["s"] || keys["ArrowDown"])
    player.y += player.speed;

  if (keys["a"] || keys["ArrowLeft"])
    player.x -= player.speed;

  if (keys["d"] || keys["ArrowRight"])
    player.x += player.speed;

  // 맵 밖으로 나가지 않기
  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

  // 몬스터가 플레이어를 따라옴
  const dx = player.x - monster.x;
  const dy = player.y - monster.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 1) {
    monster.x += dx / distance * monster.speed;
    monster.y += dy / distance * monster.speed;
  }

  // 몬스터와 충돌
  if (distance < player.size + monster.size) {
    player.hp -= 0.2;

    if (player.hp < 0)
      player.hp = 0;
  }
}

function drawMap() {
  // 배경
  ctx.fillStyle = "#172417";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 바닥 타일
  const tileSize = 50;

  for (let x = 0; x < canvas.width; x += tileSize) {
    for (let y = 0; y < canvas.height; y += tileSize) {
      ctx.strokeStyle = "#203520";
      ctx.strokeRect(x, y, tileSize, tileSize);
    }
  }

  // 장애물
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

  // 몬스터 체력바
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

function drawUI() {
  // 플레이어 체력바
  ctx.fillStyle = "#222";
  ctx.fillRect(20, 20, 200, 20);

  ctx.fillStyle = "#e63946";
  ctx.fillRect(20, 20, 200 * (player.hp / 100), 20);

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
}

function draw() {
  drawMap();
  drawMonster();
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
