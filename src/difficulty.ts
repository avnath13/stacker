// Difficulty presets. Only the gameplay-feel numbers live here; rendering and
// physics constants stay in config.ts.

export type Difficulty = "easy" | "normal" | "hard";

export interface Tuning {
  baseSpeed: number; // slide speed at the start of a run (tiles/sec)
  speedPerLevel: number; // slide speed gained per placed block
  maxSpeed: number; // cap on slide speed
  slideRange: number; // half-range the block travels from center (tiles)
  perfectEpsilon: number; // alignment tolerance counted as "perfect" (tiles)
  perfectsToRegrow: number; // perfects in a row before the block regrows
  holdInterval: number; // seconds between auto-drops while the button is held
  holdDrift: number; // max random offset (tiles) per auto-drop while held
}

export const DIFFICULTIES: Record<Difficulty, Tuning> = {
  easy: {
    baseSpeed: 5,
    speedPerLevel: 0.1,
    maxSpeed: 15,
    slideRange: 8,
    perfectEpsilon: 0.5,
    perfectsToRegrow: 4,
    holdInterval: 0.22,
    holdDrift: 1.4,
  },
  normal: {
    baseSpeed: 6.5,
    speedPerLevel: 0.16,
    maxSpeed: 22,
    slideRange: 11,
    perfectEpsilon: 0.32,
    perfectsToRegrow: 6,
    holdInterval: 0.18,
    holdDrift: 2.0,
  },
  hard: {
    baseSpeed: 8.5,
    speedPerLevel: 0.22,
    maxSpeed: 28,
    slideRange: 13,
    perfectEpsilon: 0.2,
    perfectsToRegrow: 8,
    holdInterval: 0.15,
    holdDrift: 2.6,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "normal", "hard"];

export function isDifficulty(v: unknown): v is Difficulty {
  return v === "easy" || v === "normal" || v === "hard";
}
