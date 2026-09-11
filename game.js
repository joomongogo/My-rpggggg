const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* =========================
   기본 설정
========================= */

const MONSTER_RESPAWN_TIME = 10000;

let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  speed: 5,

  hp: 100,
  maxHp: 100,

  exp: 0,
  maxExp: 100,
  level: 1
};

let monster = {
  x: 200,
  y: 150,
  size: 25,
  speed: 1.5,

  hp: 100,
  maxHp: 100,

  alive: true
};

const keys = {};

let attack = {
  active: false,
  timer: 0,
  duration: 10,
  range: 60,
  damage: 20,

  // 한 번의 공격으로 같은 몬스터를
  // 여러 번 때리는 것을 방지한다.
  hit: false
};

let monsterRespawnTimer = null;
let monsterRespawnSeconds = 0;

/* =========================
   키보드 입력
========================= */

document.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (
    e.code === "Space" ||
    e.key.startsWith("Arrow")
  ) {
    e.preventDefault();
  }

  if (e.code === "Space" && !attack.active) {
    attack.active = true;
    attack.timer = attack.duration;
    attack.hit = false;
  }
});

document.addEventListener("keyup", e => {
  const key = e.key.toLowerCase();
  keys[key] = false;
});

/* =========================
   게임 업데이트
========================= */

function update() {
  updatePlayer();
  updateMonster();
  updateAttack();
}

function updatePlayer() {
  if (player.hp <= 0) {
    return;
  }

  if (keys["w"] || keys["arrowup"]) {
    player.y -= player.speed;
  }

  if (keys["s"] || keys["arrowdown"]) {
    player.y += player.speed;
  }

  if (keys["a"] || keys["arrowleft"]) {
    player.x -= player.speed;
  }

  if (keys["d"] || keys["arrowright"]) {
    player.x += player.speed;
  }

  player.x = Math.max(
    player.size,
    Math.min(
      canvas.width - player.size,
      player.x
    )
  );

  player.y = Math.max(
    player.size,
    Math.min(
      canvas.height - player.size,
      player.y
    )
  );
}

function updateMonster() {
  if (!monster.alive || player.hp <= 0) {
    return;
  }

  const dx = player.x - monster.x;
  const dy = player.y - monster.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 1) {
    monster.x +=
      (dx / distance) * monster.speed;

    monster.y +=
      (dy / distance) * monster.speed;
  }

  const collisionDistance =
    player.size + monster.size;

  if (distance < collisionDistance) {
    player.hp -= 0.2;

    if (player.hp < 0) {
      player.hp = 0;
    }
  }
}

function updateAttack() {
  if (!attack.active) {
    return;
  }

  attack.timer--;

  if (
    monster.alive &&
    !attack.hit &&
    player.hp > 0
  ) {
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    const distance = Math.hypot(dx, dy);

    const hitDistance =
      attack.range + monster.size;

    if (distance < hitDistance) {
      monster.hp -= attack.damage;
      attack.hit = true;

      if (monster.hp <= 0) {
        defeatMonster();
      }
    }
  }

  if (attack.timer <= 0) {
    attack.active = false;
    attack.hit = false;
  }
}

/* =========================
   몬스터 처치 및 리젠
========================= */

function defeatMonster() {
  monster.hp = 0;
  monster.alive = false;

  addExperience(25);
  startMonsterRespawn();
}

function startMonsterRespawn() {
  if (monsterRespawnTimer !== null) {
    clearInterval(monsterRespawnTimer);
  }

  monsterRespawnSeconds =
    MONSTER_RESPAWN_TIME / 1000;

  monsterRespawnTimer = setInterval(() => {
    monsterRespawnSeconds--;

    if (monsterRespawnSeconds <= 0) {
      clearInterval(monsterRespawnTimer);
      monsterRespawnTimer = null;

      respawnMonster();
    }
  }, 1000);
}

function respawnMonster() {
  const position = getRandomSpawnPosition();

  monster.x = position.x;
  monster.y = position.y;

  monster.hp = monster.maxHp;
  monster.alive = true;
}

function getRandomSpawnPosition() {
  let x;
  let y;
  let distanceFromPlayer;

  do {
    x =
      monster.size +
      Math.random() *
        (canvas.width - monster.size * 2);

    y =
      monster.size +
      Math.random() *
        (canvas.height - monster.size * 2);

    distanceFromPlayer = Math.hypot(
      player.x - x,
      player.y - y
    );
  } while (distanceFromPlayer < 250);

  return { x, y };
}

/* =========================
   경험치 및 레벨
========================= */

function addExperience(amount) {
  player.exp += amount;

  while (player.exp >= player.maxExp) {
    player.exp -= player.maxExp;
    player.level++;

    player.maxExp =
      Math.floor(player.maxExp * 1.25);

    player.maxHp += 10;
    player.hp = player.maxHp;
  }
}

/* =========================
   화면 그리기
========================= */

function draw() {
  drawMap();
  drawMonster();
  drawAttack();
  drawPlayer();
  drawUI();
}

function drawMap() {
  ctx.fillStyle = "#172417";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const tileSize = 50;

  ctx.strokeStyle = "#203520";

  for (
    let x = 0;
    x < canvas.width;
    x += tileSize
  ) {
    for (
      let y = 0;
      y < canvas.height;
      y += tileSize
    ) {
      ctx.strokeRect(
        x,
        y,
        tileSize,
        tileSize
      );
    }
  }

  ctx.fillStyle = "#555";

  ctx.fillRect(100, 100, 150, 40);
  ctx.fillRect(500, 300, 200, 40);
  ctx.fillRect(800, 150, 50, 200);
}

function drawPlayer() {
  ctx.fillStyle =
    player.hp > 0 ? "#4da6ff" : "#777";

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
  if (!monster.alive) {
    return;
  }

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

  // 몬스터 체력바 배경
  ctx.fillStyle = "#222";

  ctx.fillRect(
    monster.x - 25,
    monster.y - 40,
    50,
    6
  );

  // 몬스터 체력바
  const monsterHpRatio =
    monster.hp / monster.maxHp;

  ctx.fillStyle = "#4caf50";

  ctx.fillRect(
    monster.x - 25,
    monster.y - 40,
    50 * monsterHpRatio,
    6
  );

  ctx.strokeStyle = "white";

  ctx.strokeRect(
    monster.x - 25,
    monster.y - 40,
    50,
    6
  );
}

function drawAttack() {
  if (!attack.active) {
    return;
  }

  const attackProgress =
    attack.timer / attack.duration;

  ctx.save();

  ctx.globalAlpha = attackProgress;
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
  ctx.restore();
}

/* =========================
   UI
========================= */

function drawUI() {
  drawStatusPanel();

  if (!monster.alive) {
    drawRespawnMessage();
  }

  if (player.hp <= 0) {
    drawGameOver();
  }
}

function drawStatusPanel() {
  const panelX = 20;
  const panelY = 20;
  const panelWidth = 260;
  const panelHeight = 125;
  const barWidth = 220;
  const barHeight = 18;

  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";

  ctx.fillRect(
    panelX,
    panelY,
    panelWidth,
    panelHeight
  );

  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";

  ctx.strokeRect(
    panelX,
    panelY,
    panelWidth,
    panelHeight
  );

  ctx.fillStyle = "white";
  ctx.font = "bold 17px Arial";

  ctx.fillText(
    `LEVEL ${player.level}`,
    panelX + 15,
    panelY + 25
  );

  // 체력바
  drawBar({
    x: panelX + 15,
    y: panelY + 38,
    width: barWidth,
    height: barHeight,
    ratio: player.hp / player.maxHp,
    color: "#e63946",
    label:
      `HP ${Math.floor(player.hp)}` +
      ` / ${player.maxHp}`
  });

  // 경험치바
  drawBar({
    x: panelX + 15,
    y: panelY + 70,
    width: barWidth,
    height: barHeight,
    ratio: player.exp / player.maxExp,
    color: "#f4c542",
    label:
      `EXP ${player.exp}` +
      ` / ${player.maxExp}`
  });

  ctx.fillStyle = "#dddddd";
  ctx.font = "14px Arial";

  ctx.fillText(
    "이동: WASD / 방향키",
    panelX + 15,
    panelY + 106
  );

  ctx.fillText(
    "공격: Space",
    panelX + 145,
    panelY + 106
  );
}

function drawBar({
  x,
  y,
  width,
  height,
  ratio,
  color,
  label
}) {
  const safeRatio = Math.max(
    0,
    Math.min(1, ratio)
  );

  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = color;

  ctx.fillRect(
    x,
    y,
    width * safeRatio,
    height
  );

  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "white";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(
    label,
    x + width / 2,
    y + height / 2
  );

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawRespawnMessage() {
  ctx.fillStyle = "white";
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "center";

  ctx.fillText(
    "MONSTER DEFEATED!",
    canvas.width / 2,
    70
  );

  ctx.font = "18px Arial";

  ctx.fillText(
    `몬스터 리젠까지 ${monsterRespawnSeconds}초`,
    canvas.width / 2,
    100
  );

  ctx.textAlign = "left";
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.fillStyle = "#e63946";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";

  ctx.fillText(
    "GAME OVER",
    canvas.width / 2,
    canvas.height / 2
  );

  ctx.textAlign = "left";
}

/* =========================
   게임 루프
========================= */

function loop() {
  update();
  draw();

  requestAnimationFrame(loop);
}

loop();

/* =========================
   화면 크기 변경
========================= */

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  player.x = Math.max(
    player.size,
    Math.min(
      canvas.width - player.size,
      player.x
    )
  );

  player.y = Math.max(
    player.size,
    Math.min(
      canvas.height - player.size,
      player.y
    )
  );
});
