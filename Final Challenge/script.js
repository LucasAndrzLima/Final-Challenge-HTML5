const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const panel = document.getElementById("screenPanel");
const panelText = document.getElementById("panelText");
const playButton = document.getElementById("playButton");
const aboutButton = document.getElementById("aboutButton");

const W = canvas.width;
const H = canvas.height;

const keys = new Set();
const pointer = { active: false, x: W / 2, y: H / 2 };

const assets = {
  ship: loadImage("assets/ship.svg"),
  crystal: loadImage("assets/crystal.svg"),
  drone: loadImage("assets/drone.svg")
};

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  scale(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  length() {
    return Math.hypot(this.x, this.y);
  }

  normalize() {
    const size = this.length();
    if (size > 0) {
      this.x /= size;
      this.y /= size;
    }
    return this;
  }

  clone() {
    return new Vector2(this.x, this.y);
  }

  static fromAngle(angle, speed) {
    return new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }
}

class Player {
  constructor() {
    this.position = new Vector2(W / 2, H / 2);
    this.velocity = new Vector2();
    this.radius = 22;
    this.angle = 0;
    this.invincible = 0;
  }

  update(dt) {
    const input = new Vector2();

    if (keys.has("arrowup") || keys.has("w")) input.y -= 1;
    if (keys.has("arrowdown") || keys.has("s")) input.y += 1;
    if (keys.has("arrowleft") || keys.has("a")) input.x -= 1;
    if (keys.has("arrowright") || keys.has("d")) input.x += 1;

    if (pointer.active) {
      const target = new Vector2(pointer.x - this.position.x, pointer.y - this.position.y);
      if (target.length() > 8) input.add(target.normalize());
    }

    if (input.length() > 0) {
      input.normalize().scale(1700 * dt);
      this.velocity.add(input);
    }

    const speed = this.velocity.length();
    const maxSpeed = 620;
    if (speed > maxSpeed) this.velocity.normalize().scale(maxSpeed);

    this.position.add(this.velocity.clone().scale(dt));
    this.velocity.scale(0.9);

    this.position.x = clamp(this.position.x, this.radius, W - this.radius);
    this.position.y = clamp(this.position.y, this.radius + 28, H - this.radius);

    if (this.velocity.length() > 1) {
      this.angle = Math.atan2(this.velocity.y, this.velocity.x);
    }

    this.invincible = Math.max(0, this.invincible - dt);
  }

  draw() {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = this.invincible > 0 && Math.floor(this.invincible * 12) % 2 === 0 ? 0.45 : 1;
    ctx.drawImage(assets.ship, -28, -28, 56, 56);
    ctx.restore();
  }
}

class Crystal {
  constructor(x, y) {
    this.position = new Vector2(x, y);
    this.radius = 16;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.phase += dt * 4;
  }

  draw() {
    const size = 34 + Math.sin(this.phase) * 3;
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.phase * 0.15);
    ctx.drawImage(assets.crystal, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

class Drone {
  constructor(level) {
    this.position = new Vector2(rand(60, W - 60), rand(90, H - 60));
    const speed = rand(85, 125) + level * 16;
    this.velocity = Vector2.fromAngle(rand(0, Math.PI * 2), speed);
    this.radius = 21;
    this.spin = rand(-3, 3);
    this.angle = 0;
  }

  update(dt) {
    this.position.add(this.velocity.clone().scale(dt));
    this.angle += this.spin * dt;

    if (this.position.x < this.radius || this.position.x > W - this.radius) {
      this.velocity.x *= -1;
      this.position.x = clamp(this.position.x, this.radius, W - this.radius);
    }

    if (this.position.y < 62 || this.position.y > H - this.radius) {
      this.velocity.y *= -1;
      this.position.y = clamp(this.position.y, 62, H - this.radius);
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.angle);
    ctx.drawImage(assets.drone, -25, -25, 50, 50);
    ctx.restore();
  }
}

class Particle {
  constructor(x, y, color) {
    this.position = new Vector2(x, y);
    this.velocity = Vector2.fromAngle(rand(0, Math.PI * 2), rand(60, 190));
    this.life = rand(0.35, 0.8);
    this.maxLife = this.life;
    this.color = color;
  }

  update(dt) {
    this.position.add(this.velocity.clone().scale(dt));
    this.velocity.scale(0.96);
    this.life -= dt;
  }

  draw() {
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class Game {
  constructor() {
    this.state = "menu";
    this.player = new Player();
    this.crystals = [];
    this.drones = [];
    this.particles = [];
    this.stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 24 + 8
    }));
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.timeLeft = 40;
    this.lastTime = 0;
    this.sound = new SoundBoard();
    this.showMenu();
  }

  start() {
    this.state = "playing";
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.player = new Player();
    this.loadLevel();
    hidePanel();
    this.sound.resume();
  }

  loadLevel() {
    this.timeLeft = Math.max(22, 42 - this.level * 3);
    this.crystals = [];
    this.drones = [];
    this.particles = [];

    for (let i = 0; i < 4 + this.level; i++) {
      this.crystals.push(new Crystal(rand(60, W - 60), rand(92, H - 60)));
    }

    for (let i = 0; i < 2 + this.level; i++) {
      this.drones.push(new Drone(this.level));
    }
  }

  update(dt) {
    this.updateStars(dt);

    if (this.state !== "playing") return;

    this.timeLeft -= dt;
    this.player.update(dt);
    this.crystals.forEach(crystal => crystal.update(dt));
    this.drones.forEach(drone => drone.update(dt));
    this.particles.forEach(particle => particle.update(dt));
    this.particles = this.particles.filter(particle => particle.life > 0);

    this.collectCrystals();
    this.checkDroneHits();

    if (this.timeLeft <= 0) {
      this.lives -= 1;
      this.sound.error();
      this.player.invincible = 1.4;
      if (this.lives <= 0) {
        this.finish(false, "O tempo acabou e a carga ficou perdida na orbita.");
      } else {
        this.loadLevel();
      }
    }
  }

  collectCrystals() {
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const crystal = this.crystals[i];
      if (distance(this.player.position, crystal.position) < this.player.radius + crystal.radius) {
        this.crystals.splice(i, 1);
        this.score += 100 + this.level * 20;
        this.sound.collect();
        this.burst(crystal.position.x, crystal.position.y, "#7dd3fc", 18);
      }
    }

    if (this.crystals.length === 0) {
      this.score += Math.ceil(this.timeLeft) * 10;
      this.sound.level();
      if (this.level >= 5) {
        this.finish(true, "Entrega concluida. A rota inteira foi estabilizada.");
      } else {
        this.level += 1;
        this.loadLevel();
      }
    }
  }

  checkDroneHits() {
    if (this.player.invincible > 0) return;

    for (const drone of this.drones) {
      if (distance(this.player.position, drone.position) < this.player.radius + drone.radius) {
        this.lives -= 1;
        this.player.invincible = 1.6;
        this.sound.hit();
        this.burst(this.player.position.x, this.player.position.y, "#ef6f6c", 28);
        this.player.position = new Vector2(W / 2, H / 2);
        this.player.velocity = new Vector2();

        if (this.lives <= 0) {
          this.finish(false, "Os drones interceptaram sua nave.");
        }
        return;
      }
    }
  }

  burst(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  finish(won, message) {
    this.state = won ? "victory" : "gameover";
    showPanel(
      won ? "Vitoria" : "Fim de jogo",
      `${message}<br><br>Pontuacao final: ${this.score}.`,
      "Jogar de novo",
      "Menu"
    );
  }

  showMenu() {
    this.state = "menu";
    showPanel(
      "Orbital Courier",
      "Colete os cristais de energia antes do tempo acabar. Use WASD ou setas para mover, P para pausar e toque/clique para guiar a nave.",
      "Jogar",
      "Sobre"
    );
  }

  showAbout() {
    this.state = "about";
    showPanel(
      "Sobre",
      "Projeto do Final Challenge de HTML5 Canvas & Games.<br><br>Participantes: Lucas Andrzejewski de Lima e Gustavo Iichiro Nagata.<br><br>O jogo usa canvas, classes, vetores, transformacoes, sprites SVG autorais, particulas, progressao de fases, score, vidas e sons via Web Audio.",
      "Jogar",
      "Menu"
    );
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      showPanel("Pausado", "A rota esta em espera.", "Continuar", "Menu");
    } else if (this.state === "paused") {
      this.state = "playing";
      hidePanel();
    }
  }

  draw() {
    drawBackground(this.stars);

    if (this.state === "playing" || this.state === "paused" || this.state === "victory" || this.state === "gameover") {
      this.crystals.forEach(crystal => crystal.draw());
      this.drones.forEach(drone => drone.draw());
      this.player.draw();
      this.particles.forEach(particle => particle.draw());
      this.drawHud();
    }
  }

  drawHud() {
    ctx.fillStyle = "rgba(8, 12, 19, 0.72)";
    ctx.fillRect(0, 0, W, 52);
    ctx.fillStyle = "#f5f7fb";
    ctx.font = "700 18px Arial";
    ctx.fillText(`Fase ${this.level}/5`, 22, 32);
    ctx.fillText(`Score ${this.score}`, 150, 32);
    ctx.fillText(`Vidas ${this.lives}`, 300, 32);

    const barW = 220;
    const ratio = clamp(this.timeLeft / Math.max(22, 42 - this.level * 3), 0, 1);
    ctx.fillStyle = "#394150";
    ctx.fillRect(W - barW - 24, 18, barW, 14);
    ctx.fillStyle = ratio > 0.35 ? "#58c6a4" : "#ef6f6c";
    ctx.fillRect(W - barW - 24, 18, barW * ratio, 14);
    ctx.strokeStyle = "#dce4ef";
    ctx.strokeRect(W - barW - 24, 18, barW, 14);
    ctx.fillStyle = "#f5f7fb";
    ctx.fillText(`${Math.ceil(Math.max(0, this.timeLeft))}s`, W - 70, 44);
  }

  updateStars(dt) {
    for (const star of this.stars) {
      star.x -= star.speed * dt;
      if (star.x < 0) {
        star.x = W;
        star.y = Math.random() * H;
      }
    }
  }

  loop(time = 0) {
    const dt = Math.min((time - this.lastTime) / 1000 || 0, 0.033);
    this.lastTime = time;
    this.update(dt);
    this.draw();
    requestAnimationFrame(nextTime => this.loop(nextTime));
  }
}

class SoundBoard {
  constructor() {
    this.context = null;
  }

  resume() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.context.state === "suspended") this.context.resume();
  }

  tone(freq, duration, type = "sine", volume = 0.08) {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  collect() {
    this.tone(720, 0.12, "triangle", 0.07);
  }

  level() {
    this.tone(520, 0.12, "square", 0.05);
    setTimeout(() => this.tone(780, 0.16, "square", 0.05), 90);
  }

  hit() {
    this.tone(130, 0.22, "sawtooth", 0.09);
  }

  error() {
    this.tone(90, 0.28, "sawtooth", 0.08);
  }
}

function drawBackground(stars) {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(0.5, "#142033");
  gradient.addColorStop(1, "#1d1b2a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#dce4ef";
  for (const star of stars) {
    ctx.globalAlpha = 0.35 + star.r * 0.18;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(125, 211, 252, 0.12)";
  ctx.lineWidth = 1;
  for (let y = 90; y < H; y += 70) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y - 38);
    ctx.stroke();
  }
}

function showPanel(title, text, primary, secondary) {
  panel.classList.remove("hidden");
  panel.querySelector("h1").textContent = title;
  panelText.innerHTML = text;
  playButton.textContent = primary;
  aboutButton.textContent = secondary;
}

function hidePanel() {
  panel.classList.add("hidden");
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H
  };
}

const game = new Game();
game.loop();

playButton.addEventListener("click", () => {
  if (game.state === "paused") {
    game.togglePause();
  } else {
    game.start();
  }
});

aboutButton.addEventListener("click", () => {
  if (game.state === "about" || game.state === "paused" || game.state === "gameover" || game.state === "victory") {
    game.showMenu();
  } else {
    game.showAbout();
  }
});

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (key === "p") game.togglePause();
  if (key === "enter" && game.state !== "playing") game.start();
});

window.addEventListener("keyup", event => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", event => {
  pointer.active = true;
  Object.assign(pointer, pointerPosition(event));
});

canvas.addEventListener("pointermove", event => {
  if (pointer.active) Object.assign(pointer, pointerPosition(event));
});

canvas.addEventListener("pointerup", () => {
  pointer.active = false;
});

canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
});
