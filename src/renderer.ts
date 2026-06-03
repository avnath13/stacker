import { backgroundColors } from "./palette.ts";

// Background: a vertical gradient that shifts hue subtly with tower height.
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: number,
): void {
  const [top, bottom] = backgroundColors(level);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// Expanding ring drawn at a screen point — the perfect-placement flash.
export interface Ring {
  x: number;
  y: number;
  age: number;
  life: number;
}

export function drawRing(ctx: CanvasRenderingContext2D, r: Ring): void {
  const t = r.age / r.life;
  const radius = 8 + t * 60;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(r.x, r.y, radius, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
