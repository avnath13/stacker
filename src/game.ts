import { CONFIG } from "./config.ts";
import {
  type Axis,
  type Block,
  axisForLevel,
  axisMin,
  axisSize,
  slice,
} from "./block.ts";
import { Camera } from "./camera.ts";
import { Particles } from "./particles.ts";
import { drawCuboid, project, type Origin } from "./iso.ts";
import { facesForLevel, hueForLevel } from "./palette.ts";
import { drawBackground, drawRing, type Ring } from "./renderer.ts";
import { bindInput } from "./input.ts";
import {
  getDifficulty,
  getHighScore,
  setDifficulty,
  setHighScore,
} from "./storage.ts";
import {
  type Difficulty,
  type Tuning,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
} from "./difficulty.ts";
import {
  playGameOver,
  playPerfect,
  playPlace,
  unlockAudio,
} from "./audio.ts";

type State = "menu" | "playing" | "gameover";

interface FallingPiece {
  block: Block;
  dropPx: number;
  vy: number;
  vx: number;
  driftPx: number;
  age: number;
}

export interface Hud {
  scoreEl: HTMLElement;
  menuEl: HTMLElement;
  gameoverEl: HTMLElement;
  goScoreEl: HTMLElement;
  goBestEl: HTMLElement;
  // Every difficulty button across the menu/game-over panels (data-diff attr).
  diffButtons: HTMLElement[];
}

export class Game {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;

  private camera = new Camera();
  private particles = new Particles();

  private state: State = "menu";
  private tower: Block[] = [];
  private moving: Block | null = null;
  private axis: Axis = "x";
  private dir = 1;
  private falling: FallingPiece[] = [];
  private rings: Ring[] = [];

  private difficulty: Difficulty = "normal";
  private tuning: Tuning = DIFFICULTIES.normal;
  private speed: number = DIFFICULTIES.normal.baseSpeed;

  // Hold-to-rapid-drop: a tap drops one block on press; only a deliberate hold
  // (longer than CONFIG.holdActivationDelay) starts auto-dropping, then repeats
  // every tuning.holdInterval seconds. `holdActivated` flips once the first
  // auto-drop fires so a normal tap can never trigger a second block.
  private holding = false;
  private holdTimer = 0;
  private holdActivated = false;

  private score = 0;
  private combo = 0;
  private highScore = 0;
  private bgLevel = 0;

  private lastTime = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private hud: Hud,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.highScore = getHighScore();
    this.applyDifficulty(getDifficulty());
    this.bindDifficultyButtons();

    this.resize();
    window.addEventListener("resize", () => this.resize());
    bindInput(this.canvas, {
      onPress: () => this.onPress(),
      onRelease: () => this.onRelease(),
      onNavigate: (dir) => this.navigateDifficulty(dir),
    });

    this.showMenu();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ---- Difficulty ----
  private applyDifficulty(d: Difficulty): void {
    this.difficulty = d;
    this.tuning = DIFFICULTIES[d];
    setDifficulty(d);
    this.refreshDifficultyButtons();
  }

  private bindDifficultyButtons(): void {
    for (const btn of this.hud.diffButtons) {
      // Stop the press from reaching the canvas (which would start the game).
      btn.addEventListener("pointerdown", (e) => e.stopPropagation());
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const d = btn.dataset.diff;
        if (d === "easy" || d === "normal" || d === "hard") {
          this.applyDifficulty(d);
        }
      });
    }
  }

  private refreshDifficultyButtons(): void {
    for (const btn of this.hud.diffButtons) {
      btn.classList.toggle("active", btn.dataset.diff === this.difficulty);
    }
  }

  // Arrow-key difficulty selection — only on the menu / game-over screens, so
  // arrows never interfere with an in-progress run.
  private navigateDifficulty(dir: -1 | 1): void {
    if (this.state === "playing") return;
    const i = DIFFICULTY_ORDER.indexOf(this.difficulty);
    const next = Math.min(DIFFICULTY_ORDER.length - 1, Math.max(0, i + dir));
    if (next !== i) this.applyDifficulty(DIFFICULTY_ORDER[next]);
  }

  // ---- Canvas sizing (DPR-aware) ----
  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.camera.resize(this.w, this.h);
  }

  // ---- Input ----
  private onPress(): void {
    unlockAudio();
    if (this.state === "playing") {
      // Drop now, then arm the hold timer. Auto-drop only starts after a
      // deliberate hold, so a quick tap drops exactly one block.
      this.drop();
      this.holding = true;
      this.holdTimer = 0;
      this.holdActivated = false;
    } else {
      // From menu/game-over a press just (re)starts; this same gesture must not
      // immediately auto-drop, so we leave `holding` false until the next press.
      this.start();
    }
  }

  private onRelease(): void {
    this.holding = false;
  }

  // ---- State transitions ----
  private showMenu(): void {
    this.state = "menu";
    // Seed a quiet idle tower so the menu isn't empty.
    this.resetTower();
    this.hud.menuEl.classList.remove("hidden");
    this.hud.gameoverEl.classList.add("hidden");
    this.hud.scoreEl.classList.remove("show");
  }

  private resetTower(): void {
    const s = CONFIG.baseSize;
    const base: Block = { x: -s / 2, z: -s / 2, w: s, d: s, level: 0 };
    this.tower = [base];
    this.falling = [];
    this.rings = [];
    this.particles.clear();
    this.camera.reset();
    this.camera.follow(0);
    this.bgLevel = 0;
  }

  private start(): void {
    this.resetTower();
    this.state = "playing";
    this.score = 0;
    this.combo = 0;
    this.speed = this.tuning.baseSpeed;
    this.holding = false;
    this.holdTimer = 0;
    this.holdActivated = false;
    this.spawnMoving();
    this.hud.menuEl.classList.add("hidden");
    this.hud.gameoverEl.classList.add("hidden");
    this.hud.scoreEl.classList.add("show");
    this.updateScoreHud();
  }

  private gameOver(): void {
    this.state = "gameover";
    this.moving = null;
    playGameOver();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      setHighScore(this.highScore);
    }
    this.hud.goScoreEl.textContent = String(this.score);
    this.hud.goBestEl.textContent = `Best ${this.highScore}`;
    this.hud.gameoverEl.classList.remove("hidden");
    this.hud.scoreEl.classList.remove("show");
  }

  // ---- Core gameplay ----
  private spawnMoving(): void {
    const top = this.tower[this.tower.length - 1];
    const level = top.level + 1;
    this.axis = axisForLevel(level);
    // New block inherits the top footprint, starts at one slide extreme.
    const block: Block = { ...top, level };
    const start = axisMin(top, this.axis) - this.tuning.slideRange;
    this.setMovingAxis(block, start);
    this.moving = block;
    this.dir = 1;
    this.camera.follow(level);
  }

  private setMovingAxis(b: Block, min: number): void {
    if (this.axis === "x") b.x = min;
    else b.z = min;
  }

  private drop(): void {
    const moving = this.moving;
    if (!moving) return;
    const prev = this.tower[this.tower.length - 1];
    const result = slice(prev, moving, this.axis, this.tuning.perfectEpsilon);

    if (!result) {
      // Complete miss: the whole block tumbles away and the run ends.
      this.spawnFalling(moving, moving.x < prev.x ? -1 : 1, true);
      this.gameOver();
      return;
    }

    if (result.overhang) {
      const side = result.delta < 0 ? -1 : 1;
      this.spawnFalling(result.overhang, side, false);
    }

    let placed = result.placed;

    if (result.perfect) {
      this.combo++;
      playPerfect(this.combo);
      this.spawnRing(placed);
      const faceColor = facesForLevel(placed.level).top;
      const center = this.blockTopScreen(placed);
      this.particles.burst(center.x, center.y, faceColor, 16);
      this.camera.kick(6);
      // Reward a streak by regrowing the block a little (forgiveness).
      if (this.combo > 0 && this.combo % this.tuning.perfectsToRegrow === 0) {
        placed = this.regrow(placed);
      }
    } else {
      this.combo = 0;
      playPlace();
    }

    this.tower.push(placed);
    this.score++;
    this.updateScoreHud();
    this.speed = Math.min(
      this.tuning.maxSpeed,
      this.tuning.baseSpeed + this.score * this.tuning.speedPerLevel,
    );
    this.spawnMoving();
  }

  // One tick of hold-to-rapid-drop. The freshly-spawned block sits at the slide
  // extreme, so we nudge it to a small random drift off the block below first —
  // this yields a fast, survivable, gradually-shrinking cascade rather than an
  // instant miss.
  private autoDrop(): void {
    const moving = this.moving;
    if (!moving || this.state !== "playing") return;
    const prev = this.tower[this.tower.length - 1];
    const drift = (Math.random() * 2 - 1) * this.tuning.holdDrift;
    this.setMovingAxis(moving, axisMin(prev, this.axis) + drift);
    this.drop();
  }

  // Grow `placed` symmetrically along the active axis, capped by base size and
  // kept within the block below so it stays supported.
  private regrow(placed: Block): Block {
    const size = axisSize(placed, this.axis);
    const target = Math.min(CONFIG.baseSize, size + CONFIG.regrowAmount);
    const grow = target - size;
    if (grow <= 0) return placed;
    const min = axisMin(placed, this.axis) - grow / 2;
    const b: Block = { ...placed };
    if (this.axis === "x") {
      b.x = min;
      b.w = target;
    } else {
      b.z = min;
      b.d = target;
    }
    return b;
  }

  private spawnFalling(block: Block, side: number, whole: boolean): void {
    this.falling.push({
      block: { ...block },
      dropPx: 0,
      vy: whole ? 40 : 10,
      vx: side * 70, // drift off toward the side it was sliced from
      driftPx: 0,
      age: 0,
    });
  }

  private spawnRing(block: Block): void {
    const p = this.blockTopScreen(block);
    this.rings.push({ x: p.x, y: p.y, age: 0, life: 0.5 });
  }

  // Screen position of a block's top-front-center, for effects.
  private blockTopScreen(block: Block): { x: number; y: number } {
    const origin = this.camera.origin();
    const cx = block.x + block.w / 2;
    const cz = block.z + block.d / 2;
    return project(origin, cx, cz, block.level + 1);
  }

  // ---- Loop ----
  private frame(t: number): void {
    const dt = Math.min(0.05, (t - this.lastTime) / 1000);
    this.lastTime = t;
    this.update(dt);
    this.render();
    requestAnimationFrame((nt) => this.frame(nt));
  }

  private update(dt: number): void {
    this.camera.update(dt);
    this.particles.update(dt);

    // Active block: either auto-rapid-drop while held, or slide normally.
    if (this.state === "playing" && this.moving) {
      if (this.holding) {
        // Hold-to-rapid-drop: freeze the slide and auto-drop on a cadence. The
        // first auto-drop waits the longer activation delay so a normal tap
        // (which releases well before then) never fires a second block.
        this.holdTimer += dt;
        const threshold = this.holdActivated
          ? this.tuning.holdInterval
          : CONFIG.holdActivationDelay;
        if (this.holdTimer >= threshold) {
          this.holdTimer = 0;
          this.holdActivated = true;
          this.autoDrop();
        }
      } else {
        const top = this.tower[this.tower.length - 1];
        const center = axisMin(top, this.axis);
        const lo = center - this.tuning.slideRange;
        const hi = center + this.tuning.slideRange;
        let pos = axisMin(this.moving, this.axis) + this.dir * this.speed * dt;
        if (pos > hi) {
          pos = hi;
          this.dir = -1;
        } else if (pos < lo) {
          pos = lo;
          this.dir = 1;
        }
        this.setMovingAxis(this.moving, pos);
      }
    }

    // Falling sliced pieces.
    for (const f of this.falling) {
      f.vy += CONFIG.sliceGravity * dt;
      f.dropPx += f.vy * dt;
      f.driftPx += f.vx * dt;
      f.age += dt;
    }
    this.falling = this.falling.filter(
      (f) => f.age < CONFIG.sliceFadeTime && f.dropPx < this.h * 1.5,
    );

    // Rings.
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < r.life);

    // Ease background hue toward the current top level.
    const topLevel = this.tower[this.tower.length - 1]?.level ?? 0;
    this.bgLevel += (topLevel - this.bgLevel) * 0.08;
  }

  private render(): void {
    const ctx = this.ctx;
    drawBackground(ctx, this.w, this.h, this.bgLevel);

    const origin = this.camera.origin();

    // Tower (bottom to top — painter's order is naturally back-to-front).
    for (const b of this.tower) {
      drawCuboid(ctx, origin, b, facesForLevel(b.level));
    }

    // Active moving block.
    if (this.moving) {
      drawCuboid(ctx, origin, this.moving, facesForLevel(this.moving.level));
    }

    // Falling pieces.
    for (const f of this.falling) {
      const alpha = Math.max(0, 1 - f.age / CONFIG.sliceFadeTime);
      const o: Origin = { x: origin.x + f.driftPx, y: origin.y };
      drawCuboid(ctx, o, f.block, facesForLevel(f.block.level), f.dropPx, alpha);
    }

    // Perfect rings on top.
    for (const r of this.rings) drawRing(ctx, r);
    this.particles.draw(ctx);
  }

  private updateScoreHud(): void {
    this.hud.scoreEl.textContent = String(this.score);
    // Tint the score text with the current hue for a cohesive look.
    const hue = hueForLevel(this.tower[this.tower.length - 1]?.level ?? 0);
    this.hud.scoreEl.style.color = `hsl(${hue}, 60%, 88%)`;
  }
}
