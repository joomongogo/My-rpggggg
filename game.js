const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 600;
canvas.height = 400;

let x = 300;
let y = 200;

const keys = {};

document.addEventListener("keydown", e => {
  keys[e.key] = true;
});

document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

function update() {
  if (keys["w"] || keys["ArrowUp"]) y -= 5;
  if (keys["s"] || keys["ArrowDown"]) y += 5;
  if (keys["a"] || keys["ArrowLeft"]) x -= 5;
  if (keys["d"] || keys["ArrowRight"]) x += 5;

  x = Math.max(20, Math.min(580, x));
  y = Math.max(20, Math.min(380, y));
}

function draw() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 600, 400);

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
