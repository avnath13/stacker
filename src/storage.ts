// Persists the best score and chosen difficulty in localStorage (with safe
// in-memory fallbacks).

import { type Difficulty, isDifficulty } from "./difficulty.ts";

const KEY = "stacker.highscore";
const DIFF_KEY = "stacker.difficulty";
let fallback = 0;
let diffFallback: Difficulty = "normal";

export function getHighScore(): number {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return fallback;
  }
}

export function setHighScore(score: number): void {
  try {
    localStorage.setItem(KEY, String(score));
  } catch {
    fallback = score;
  }
}

export function getDifficulty(): Difficulty {
  try {
    const raw = localStorage.getItem(DIFF_KEY);
    if (isDifficulty(raw)) return raw;
  } catch {
    return diffFallback;
  }
  return diffFallback;
}

export function setDifficulty(d: Difficulty): void {
  diffFallback = d;
  try {
    localStorage.setItem(DIFF_KEY, d);
  } catch {
    /* keep in-memory fallback */
  }
}
