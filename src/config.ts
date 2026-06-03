// Tunable constants for the whole game. Logical units are "tiles".

export const CONFIG = {
  // Footprint of the base block, in logical tile units (square).
  baseSize: 9,

  // Block height in screen pixels (before camera scaling). Drawn vertically.
  blockHeightPx: 36,

  // Isometric tile half-dimensions in screen pixels. A logical 1x1 tile
  // projects to a 2*TILE_W wide, 2*TILE_H tall diamond.
  tileW: 18,
  tileH: 9,

  // Default "perfect" tolerance — used when slice() is called without an
  // explicit epsilon (e.g. in tests). Live play passes the per-difficulty value.
  perfectEpsilon: 0.32,

  // How many tiles to regrow per reward (never exceeds baseSize).
  regrowAmount: 0.7,

  // Camera easing factor (0..1, higher = snappier follow).
  cameraEase: 0.12,
  // Screen-shake decay per second.
  shakeDecay: 7,

  // Falling sliced-piece physics.
  sliceGravity: 1400, // px/s^2
  sliceFadeTime: 1.1, // seconds to fully fade

  // Minimum footprint width before the run is effectively over on a near-miss.
  minBlockSize: 0.12,
} as const;
