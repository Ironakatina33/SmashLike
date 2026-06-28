import { fighters } from './characters.js';
import { renderAllPreviews, renderArena3D, setArenaFighters, setupArena3D, setupFighterPreview, updateFighterPreview } from './scene3d.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const mainMenu = document.querySelector('#main-menu');
const selectMenu = document.querySelector('#select-menu');
const gameShell = document.querySelector('#game-shell');
const hud = document.querySelector('#hud');
const arena3d = document.querySelector('#arena-3d');
const openSelectButton = document.querySelector('#open-select');
const startButton = document.querySelector('#start-game');
const backButton = document.querySelector('#back-menu');
const backMainButton = document.querySelector('#back-main');
const toggleMusicButton = document.querySelector('#toggle-music');
const modelGuideButton = document.querySelector('#show-model-guide');
const modelGuide = document.querySelector('#model-guide');
const fighterCards = [document.querySelector('#fighter-one'), document.querySelector('#fighter-two')];
const fighterPreviews = [document.querySelector('#preview-one'), document.querySelector('#preview-two')];
const versusNames = [document.querySelector('#versus-one'), document.querySelector('#versus-two')];

const keys = new Set();
const pressed = new Set();
const selections = [0, 1];
const players = [];
let running = false;
let lastTime = 0;
let winnerText = '';
let winnerTimer = 0;
let arenaReady = false;
let audioContext = null;
let musicGain = null;
let musicTimer = null;
let musicEnabled = false;

const stage = {
  width: 1280,
  height: 720,
  gravity: 0.92,
  floor: { x: 250, y: 540, w: 780, h: 36 },
  platforms: [
    { x: 420, y: 390, w: 180, h: 18 },
    { x: 680, y: 390, w: 180, h: 18 },
    { x: 552, y: 285, w: 176, h: 18 }
  ],
  blast: { left: -260, right: 1540, top: -260, bottom: 930 }
};

const controlMaps = [
  {
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['KeyW'],
    down: ['KeyS'],
    attack: ['KeyF'],
    special: ['KeyG'],
    shield: ['KeyH']
  },
  {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    jump: ['ArrowUp'],
    down: ['ArrowDown'],
    attack: ['Numpad1', 'Digit1'],
    special: ['Numpad2', 'Digit2'],
    shield: ['Numpad3', 'Digit3']
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function anyHeld(actions) {
  return actions.some((code) => keys.has(code));
}

function anyPressed(actions) {
  return actions.some((code) => pressed.has(code));
}

function colorWithAlpha(hex, alpha) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

class Player {
  constructor(index, fighter, x, facing) {
    this.index = index;
    this.fighter = fighter;
    this.x = x;
    this.y = 320;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.damage = 0;
    this.stocks = 3;
    this.grounded = false;
    this.jumpsLeft = 2;
    this.state = 'idle';
    this.attackTimer = 0;
    this.attackFrame = 0;
    this.currentMove = null;
    this.currentMoveKey = null;
    this.hasHit = false;
    this.hitstun = 0;
    this.invincible = 90;
    this.shield = 100;
    this.shielding = false;
    this.respawnTimer = 0;
    this.flash = 0;
  }

  get size() {
    return this.fighter.stats.size;
  }

  get hurtbox() {
    return {
      x: this.x - this.size / 2,
      y: this.y - this.size,
      w: this.size,
      h: this.size
    };
  }

  get input() {
    return controlMaps[this.index];
  }

  respawn() {
    this.x = this.index === 0 ? 440 : 840;
    this.y = 190;
    this.vx = 0;
    this.vy = 0;
    this.damage = 0;
    this.jumpsLeft = 2;
    this.hitstun = 0;
    this.invincible = 140;
    this.respawnTimer = 70;
    this.state = 'respawn';
    this.attackTimer = 0;
    this.currentMove = null;
    this.currentMoveKey = null;
    this.hasHit = false;
  }

  update(opponents) {
    if (this.stocks <= 0) return;

    if (this.respawnTimer > 0) {
      this.respawnTimer -= 1;
      this.invincible = Math.max(this.invincible, 2);
      this.y = 190 + Math.sin(this.respawnTimer * 0.08) * 8;
      if (this.respawnTimer === 0) this.state = 'idle';
      return;
    }

    if (this.invincible > 0) this.invincible -= 1;
    if (this.flash > 0) this.flash -= 1;

    this.updateFacing(opponents);
    this.updateShield();

    if (this.hitstun > 0) {
      this.hitstun -= 1;
      this.applyPhysics();
      this.checkBlastZone();
      return;
    }

    if (this.attackTimer > 0) {
      this.updateAttack(opponents);
    } else {
      this.handleMovement();
      this.tryAttack('neutral');
      this.tryAttack('special');
    }

    this.applyPhysics();
    this.checkBlastZone();
  }

  updateFacing(opponents) {
    const target = opponents.find((opponent) => opponent.stocks > 0);
    if (!target || this.attackTimer > 0) return;
    if (Math.abs(target.x - this.x) > 8) this.facing = target.x > this.x ? 1 : -1;
  }

  updateShield() {
    this.shielding = anyHeld(this.input.shield) && this.grounded && this.attackTimer <= 0 && this.hitstun <= 0;
    if (this.shielding) {
      this.shield = Math.max(0, this.shield - 0.48);
      this.vx *= 0.72;
      if (this.shield <= 0) {
        this.shielding = false;
        this.hitstun = 80;
        this.vy = -9;
      }
    } else {
      this.shield = Math.min(100, this.shield + 0.28);
    }
  }

  handleMovement() {
    const left = anyHeld(this.input.left);
    const right = anyHeld(this.input.right);
    const down = anyHeld(this.input.down);
    const stats = this.fighter.stats;
    const maxSpeed = this.grounded ? stats.speed : stats.airSpeed;
    const acceleration = this.grounded ? stats.acceleration : stats.acceleration * 0.52;

    if (left && !this.shielding) {
      this.vx = Math.max(this.vx - acceleration, -maxSpeed);
      this.facing = -1;
    } else if (right && !this.shielding) {
      this.vx = Math.min(this.vx + acceleration, maxSpeed);
      this.facing = 1;
    } else {
      this.vx *= this.grounded ? 0.78 : 0.96;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }

    if (anyPressed(this.input.jump) && !this.shielding) {
      if (this.grounded) {
        this.vy = -stats.jump;
        this.grounded = false;
        this.jumpsLeft = 1;
      } else if (this.jumpsLeft > 0) {
        this.vy = -stats.jump * 0.86;
        this.jumpsLeft -= 1;
      }
    }

    if (down && !this.grounded) this.vy += 0.45;
  }

  tryAttack(type) {
    const isPressed = type === 'neutral' ? anyPressed(this.input.attack) : anyPressed(this.input.special);
    if (!isPressed || this.shielding) return;
    const moveKey = type === 'neutral' ? this.getAttackVariant() : 'special';
    this.currentMove = this.fighter.moves[moveKey];
    this.currentMoveKey = moveKey;
    this.attackTimer = this.currentMove.startup + this.currentMove.active + this.currentMove.recovery;
    this.attackFrame = 0;
    this.hasHit = false;
    this.state = moveKey;
    if (type === 'special') this.vx += this.facing * 2.4;
  }

  getAttackVariant() {
    if (anyHeld(this.input.jump)) return 'up';
    if (anyHeld(this.input.down)) return 'down';
    return 'neutral';
  }

  updateAttack(opponents) {
    this.attackFrame += 1;
    this.attackTimer -= 1;
    this.vx *= this.grounded ? 0.84 : 0.98;

    const move = this.currentMove;
    const activeStart = move.startup;
    const activeEnd = move.startup + move.active;

    if (!this.hasHit && this.attackFrame >= activeStart && this.attackFrame <= activeEnd) {
      const hitbox = this.getHitbox(move);
      for (const opponent of opponents) {
        if (opponent.stocks <= 0 || opponent.invincible > 0 || opponent.respawnTimer > 0) continue;
        if (rectsOverlap(hitbox, opponent.hurtbox)) {
          opponent.receiveHit(this, move);
          this.hasHit = true;
          break;
        }
      }
    }

    if (this.attackTimer <= 0) {
      this.currentMove = null;
      this.currentMoveKey = null;
      this.state = 'idle';
    }
  }

  getHitbox(move) {
    const width = move.range;
    const x = this.facing > 0 ? this.x + this.size * 0.18 : this.x - width - this.size * 0.18;
    return {
      x,
      y: this.y - this.size * 0.72 + move.offsetY,
      w: width,
      h: move.height
    };
  }

  receiveHit(attacker, move) {
    const blocked = this.shielding && this.shield > 5;
    const shieldMultiplier = blocked ? 0.28 : 1;
    const percent = this.damage;
    const knockback = (move.baseKnockback + percent * move.growth) / this.fighter.stats.weight;
    const direction = attacker.x < this.x ? 1 : -1;
    const shieldPush = blocked ? 0.42 : 1;

    this.damage += move.damage * shieldMultiplier;
    this.vx = Math.cos(move.angle) * knockback * direction * shieldPush;
    this.vy = Math.sin(move.angle) * knockback - knockback * 0.42 * shieldPush;
    this.hitstun = blocked ? 9 : Math.floor(15 + knockback * 1.75);
    this.invincible = blocked ? 0 : 8;
    this.flash = 18;

    if (blocked) {
      this.shield = Math.max(0, this.shield - move.damage * 2.8);
      attacker.vx *= -0.22;
    }
  }

  applyPhysics() {
    if (this.respawnTimer > 0) return;

    const previousY = this.y;
    this.vy = Math.min(this.vy + this.fighter.stats.gravity * stage.gravity, this.fighter.stats.fallSpeed);
    this.x += this.vx;
    this.y += this.vy;
    this.grounded = false;

    const allPlatforms = [stage.floor, ...stage.platforms];
    for (const platform of allPlatforms) {
      const falling = this.vy >= 0;
      const wasAbove = previousY <= platform.y + 6;
      const withinX = this.x + this.size * 0.38 > platform.x && this.x - this.size * 0.38 < platform.x + platform.w;
      const crossing = this.y >= platform.y && this.y <= platform.y + platform.h + 20;
      const downHeld = anyHeld(this.input.down) && platform !== stage.floor;

      if (falling && wasAbove && withinX && crossing && !downHeld) {
        this.y = platform.y;
        this.vy = 0;
        this.grounded = true;
        this.jumpsLeft = 2;
        break;
      }
    }

    if (this.grounded) this.vx *= 0.96;
  }

  checkBlastZone() {
    if (this.x < stage.blast.left || this.x > stage.blast.right || this.y < stage.blast.top || this.y > stage.blast.bottom) {
      this.stocks -= 1;
      if (this.stocks > 0) {
        this.respawn();
      } else {
        this.state = 'out';
        this.respawnTimer = 0;
      }
    }
  }

  draw() {
    if (this.stocks <= 0 || this.respawnTimer > 0 && Math.floor(this.respawnTimer / 8) % 2 === 0) return;

    const hurtbox = this.hurtbox;
    const color = this.flash > 0 ? '#ffffff' : this.fighter.color;
    const alpha = this.invincible > 0 ? 0.64 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = this.fighter.color;
    ctx.shadowBlur = this.flash > 0 ? 32 : 16;
    ctx.fillStyle = color;
    roundRect(hurtbox.x, hurtbox.y, hurtbox.w, hurtbox.h, 14);
    ctx.fill();

    ctx.fillStyle = this.fighter.accent;
    const eyeX = this.x + this.facing * this.size * 0.15;
    roundRect(eyeX - 7, this.y - this.size * 0.68, 14, 8, 4);
    ctx.fill();

    if (this.shielding) {
      ctx.strokeStyle = colorWithAlpha('#9de7ff', 0.72);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(this.x, this.y - this.size * 0.5, this.size * 0.78, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.currentMove) {
      const move = this.currentMove;
      const activeStart = move.startup;
      const activeEnd = move.startup + move.active;
      if (this.attackFrame >= activeStart && this.attackFrame <= activeEnd) {
        const hitbox = this.getHitbox(move);
        ctx.fillStyle = colorWithAlpha(this.fighter.accent, 0.34);
        roundRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h, 16);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function renderSelectionCards() {
  fighterCards.forEach((card, playerIndex) => {
    const fighter = fighters[selections[playerIndex]];
    card.style.setProperty('--fighter-color', fighter.color);
    card.style.setProperty('--fighter-accent', fighter.accent);
    card.innerHTML = `
      <p class="fighter-role">${fighter.role}</p>
      <p class="fighter-name">${fighter.name}</p>
      <p class="fighter-tagline">${fighter.tagline}</p>
      <div class="stat-grid">
        ${statLine('Vitesse', fighter.stats.speed / 7)}
        ${statLine('Saut', fighter.stats.jump / 19)}
        ${statLine('Poids', fighter.stats.weight / 1.35)}
        ${statLine('Puissance', fighter.moves.special.damage / 18)}
      </div>
      <p class="model-path">${fighter.modelUrl}</p>
    `;
    versusNames[playerIndex].textContent = fighter.name;
    updateFighterPreview(fighterPreviews[playerIndex], fighter);
  });
}

function statLine(label, value) {
  return `<div class="stat"><span>${label}</span><span style="width:${Math.round(clamp(value, 0.12, 1) * 100)}%"></span></div>`;
}

function showScreen(screen) {
  mainMenu.classList.toggle('hidden', screen !== mainMenu);
  selectMenu.classList.toggle('hidden', screen !== selectMenu);
  gameShell.classList.toggle('hidden', screen !== gameShell);
}

function startGame() {
  players.length = 0;
  players.push(new Player(0, fighters[selections[0]], 430, 1));
  players.push(new Player(1, fighters[selections[1]], 850, -1));
  winnerText = '';
  winnerTimer = 0;
  showScreen(gameShell);
  if (!arenaReady) {
    setupArena3D(arena3d);
    arenaReady = true;
  }
  setArenaFighters(players);
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function stopGame() {
  running = false;
  showScreen(selectMenu);
}

function loop(time) {
  if (!running) return;
  const delta = Math.min(32, time - lastTime);
  lastTime = time;
  const steps = delta > 20 ? 2 : 1;

  for (let i = 0; i < steps; i += 1) update();
  renderArena3D(players);
  draw();
  pressed.clear();
  requestAnimationFrame(loop);
}

function update() {
  for (const player of players) {
    const opponents = players.filter((candidate) => candidate !== player);
    player.update(opponents);
  }

  const alive = players.filter((player) => player.stocks > 0);
  if (alive.length === 1 && !winnerText) {
    winnerText = `${alive[0].fighter.name} gagne !`;
    winnerTimer = 180;
  }

  if (winnerTimer > 0) {
    winnerTimer -= 1;
    if (winnerTimer === 0) stopGame();
  }

  updateHud();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawStage();
  drawBlastWarning();
  players.forEach((player) => player.draw());
  drawWinner();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, 'rgba(17, 25, 54, 0.52)');
  gradient.addColorStop(0.55, 'rgba(8, 16, 35, 0.36)');
  gradient.addColorStop(1, 'rgba(22, 9, 31, 0.46)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 48; i += 1) {
    const x = (i * 137) % canvas.width;
    const y = (i * 83) % canvas.height;
    ctx.fillStyle = `rgba(255,255,255,${0.08 + (i % 5) * 0.015})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(104, 166, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 240, canvas.height);
    ctx.stroke();
  }
}

function drawStage() {
  ctx.save();
  drawPlatform(stage.floor, '#1d2d58', '#62d9ff');
  for (const platform of stage.platforms) drawPlatform(platform, '#222a52', '#b984ff');
  ctx.restore();
}

function drawPlatform(platform, fill, glow) {
  ctx.shadowColor = glow;
  ctx.shadowBlur = 24;
  ctx.fillStyle = fill;
  roundRect(platform.x, platform.y, platform.w, platform.h, 14);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = colorWithAlpha(glow, 0.35);
  roundRect(platform.x + 12, platform.y + 5, platform.w - 24, 5, 5);
  ctx.fill();
}

function drawBlastWarning() {
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.setLineDash([14, 18]);
  ctx.lineWidth = 3;
  ctx.strokeRect(95, 54, 1090, 596);
  ctx.setLineDash([]);
}

function drawWinner() {
  if (!winnerText) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 76px Inter, sans-serif';
  ctx.fillText(winnerText, canvas.width / 2, canvas.height / 2);
  ctx.font = '600 22px Inter, sans-serif';
  ctx.fillStyle = '#bcd0ef';
  ctx.fillText('Retour automatique au menu...', canvas.width / 2, canvas.height / 2 + 48);
  ctx.restore();
}

function updateHud() {
  hud.innerHTML = players.map((player) => {
    const action = player.currentMove ? player.currentMove.name : player.shielding ? 'Bouclier' : '';
    return `
      <article class="hud-card" style="--fighter-color:${player.fighter.color}">
        <div>
          <p class="hud-name">J${player.index + 1} · ${player.fighter.name}</p>
          <p class="hud-stock">Stocks: ${Math.max(0, player.stocks)} · Bouclier: ${Math.round(player.shield)}%</p>
          <p class="hud-action">${action}</p>
        </div>
        <div class="hud-percent">${Math.round(player.damage)}%</div>
      </article>
    `;
  }).join('');
}

function resizeCanvas() {
  canvas.width = stage.width;
  canvas.height = stage.height;
}

document.querySelectorAll('.select-button').forEach((button) => {
  button.addEventListener('click', () => {
    const player = Number(button.dataset.player);
    const dir = Number(button.dataset.dir);
    selections[player] = (selections[player] + dir + fighters.length) % fighters.length;
    renderSelectionCards();
  });
});

window.addEventListener('keydown', (event) => {
  if (!keys.has(event.code)) pressed.add(event.code);
  keys.add(event.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

function playTone(time, frequency, duration, type, gainValue) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(gain).connect(musicGain);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.04);
}

function scheduleEpicLoop() {
  if (!musicEnabled || !audioContext) return;
  const start = audioContext.currentTime + 0.05;
  const bass = [55, 55, 65.41, 73.42, 82.41, 73.42, 65.41, 49];
  const lead = [220, 246.94, 261.63, 329.63, 293.66, 261.63, 246.94, 329.63];
  bass.forEach((frequency, index) => playTone(start + index * 0.32, frequency, 0.28, 'sawtooth', 0.08));
  lead.forEach((frequency, index) => playTone(start + 1.28 + index * 0.16, frequency, 0.14, 'triangle', 0.035));
  musicTimer = window.setTimeout(scheduleEpicLoop, 2560);
}

function toggleMusic() {
  if (!audioContext) {
    audioContext = new AudioContext();
    musicGain = audioContext.createGain();
    musicGain.gain.value = 0.42;
    musicGain.connect(audioContext.destination);
  }
  musicEnabled = !musicEnabled;
  toggleMusicButton.textContent = `Musique épique: ${musicEnabled ? 'on' : 'off'}`;
  if (musicEnabled) {
    audioContext.resume();
    scheduleEpicLoop();
  } else if (musicTimer) {
    window.clearTimeout(musicTimer);
    musicTimer = null;
  }
}

function menuAnimationLoop() {
  renderAllPreviews();
  if (running) renderArena3D(players);
  requestAnimationFrame(menuAnimationLoop);
}

openSelectButton.addEventListener('click', () => showScreen(selectMenu));
backMainButton.addEventListener('click', () => showScreen(mainMenu));
modelGuideButton.addEventListener('click', () => modelGuide.classList.toggle('hidden'));
toggleMusicButton.addEventListener('click', toggleMusic);
startButton.addEventListener('click', startGame);
backButton.addEventListener('click', stopGame);
window.addEventListener('resize', resizeCanvas);

resizeCanvas();
fighterPreviews.forEach((preview, index) => setupFighterPreview(preview, fighters[selections[index]]));
renderSelectionCards();
showScreen(mainMenu);
requestAnimationFrame(menuAnimationLoop);
