import { CONFIG } from "./config.ts";
import type { Block } from "./block.ts";
import type { Faces } from "./palette.ts";

export interface Origin {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

// Project a logical point (tile coords tx, tz) at vertical level `v`
// (may be fractional) into screen space relative to `origin`.
export function project(origin: Origin, tx: number, tz: number, v: number): Point {
  return {
    x: origin.x + (tx - tz) * CONFIG.tileW,
    y: origin.y + (tx + tz) * CONFIG.tileH - v * CONFIG.blockHeightPx,
  };
}

// Draw a faux-3D cuboid for `block`. `extraDropPx` shifts it straight down on
// screen (used for falling sliced pieces). `alpha` fades it out.
export function drawCuboid(
  ctx: CanvasRenderingContext2D,
  origin: Origin,
  block: Block,
  faces: Faces,
  extraDropPx = 0,
  alpha = 1,
): void {
  const x0 = block.x;
  const x1 = block.x + block.w;
  const z0 = block.z;
  const z1 = block.z + block.d;
  const topV = block.level + 1;

  // Four top-face corners.
  const A = project(origin, x0, z0, topV); // back
  const B = project(origin, x1, z0, topV); // right
  const C = project(origin, x1, z1, topV); // front (lowest on screen)
  const D = project(origin, x0, z1, topV); // left

  // Apply the on-screen vertical shift (for falling pieces) to every corner.
  for (const p of [A, B, C, D]) p.y += extraDropPx;

  const h = CONFIG.blockHeightPx;
  const Bb: Point = { x: B.x, y: B.y + h };
  const Cb: Point = { x: C.x, y: C.y + h };
  const Db: Point = { x: D.x, y: D.y + h };

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineJoin = "round";

  // Right side face: top edge B-C dropping straight down by one block height.
  fillFace(ctx, [B, C, Cb, Bb], faces.right);
  // Left side face: top edge D-C dropping down.
  fillFace(ctx, [D, C, Cb, Db], faces.left);
  // Top face last so it sits on top.
  fillFace(ctx, [A, B, C, D], faces.top);

  ctx.restore();
}

function fillFace(ctx: CanvasRenderingContext2D, pts: Point[], color: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
