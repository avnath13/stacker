// Lightweight screen-space particle bursts for perfect placements.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class Particles {
  private items: Particle[] = [];

  burst(x: number, y: number, color: string, count = 14): void {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 80 + Math.random() * 160;
      const life = 0.4 + Math.random() * 0.4;
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 40,
        life,
        maxLife: life,
        size: 2 + Math.random() * 3,
        color,
      });
    }
  }

  update(dt: number): void {
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      p.life -= dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.items) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  clear(): void {
    this.items.length = 0;
  }
}
