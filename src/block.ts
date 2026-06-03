import { CONFIG } from "./config.ts";

export type Axis = "x" | "z";

// A block's footprint lives in logical tile space:
//   x..x+w on the X axis, z..z+d on the Z axis, at integer `level`.
export interface Block {
  x: number;
  z: number;
  w: number;
  d: number;
  level: number;
}

// Result of dropping a moving block onto the one below.
export interface SliceResult {
  // The trimmed block that stays on the tower.
  placed: Block;
  // The sliced-off overhang (null on a perfect drop). Same shape as a Block
  // plus the side it fell off, so the renderer can animate it.
  overhang: Overhang | null;
  // True when the drop was aligned within CONFIG.perfectEpsilon.
  perfect: boolean;
  // Signed misalignment along the active axis (moving.min - prev.min).
  delta: number;
}

export interface Overhang extends Block {
  axis: Axis;
}

// Min coordinate of a block along an axis.
export function axisMin(b: Block, axis: Axis): number {
  return axis === "x" ? b.x : b.z;
}

// Size of a block along an axis.
export function axisSize(b: Block, axis: Axis): number {
  return axis === "x" ? b.w : b.d;
}

// The axis a block at `level` slides along. Alternates each level.
export function axisForLevel(level: number): Axis {
  return level % 2 === 0 ? "x" : "z";
}

// Drop `moving` onto `prev`, slicing along `axis`. Returns null on a complete
// miss (no overlap). `epsilon` is the alignment tolerance counted as perfect.
// This is the pure heart of the game.
export function slice(
  prev: Block,
  moving: Block,
  axis: Axis,
  epsilon: number = CONFIG.perfectEpsilon,
): SliceResult | null {
  const pMin = axisMin(prev, axis);
  const pSize = axisSize(prev, axis);
  const pMax = pMin + pSize;

  const mMin = axisMin(moving, axis);
  const mSize = axisSize(moving, axis);
  const mMax = mMin + mSize;

  const overlapMin = Math.max(pMin, mMin);
  const overlapMax = Math.min(pMax, mMax);
  const overlapSize = overlapMax - overlapMin;

  // Complete miss — nothing of the new block rests on the tower.
  if (overlapSize <= CONFIG.minBlockSize) return null;

  const delta = mMin - pMin;
  const perfect = Math.abs(delta) <= epsilon;

  // On a perfect drop, snap to the block below so tiny errors don't accumulate.
  const placedMin = perfect ? pMin : overlapMin;
  const placedSize = perfect ? pSize : overlapSize;

  const placed: Block = { ...moving };
  setAxis(placed, axis, placedMin, placedSize);

  let overhang: Overhang | null = null;
  if (!perfect) {
    // The overhang is whichever side of the moving block hangs past the overlap.
    const hangMin = mMin < placedMin ? mMin : placedMin + placedSize;
    const hangSize = mSize - placedSize;
    if (hangSize > 0.001) {
      const piece: Block = { ...moving };
      setAxis(piece, axis, hangMin, hangSize);
      overhang = { ...piece, axis };
    }
  }

  return { placed, overhang, perfect, delta };
}

function setAxis(b: Block, axis: Axis, min: number, size: number): void {
  if (axis === "x") {
    b.x = min;
    b.w = size;
  } else {
    b.z = min;
    b.d = size;
  }
}
