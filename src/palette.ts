// Minimal/clean color system: a smooth HSL hue drift up the tower, with three
// shaded faces per cuboid for a faux-3D read.

export interface Faces {
  top: string;
  left: string;
  right: string;
}

// Base hue rotates slowly with height for a calm gradient. Saturation/lightness
// kept gentle for the clean aesthetic.
const HUE_START = 205; // cool blue
const HUE_STEP = 7; // degrees per level
const SAT = 42;
const TOP_L = 72;
const LEFT_L = 60;
const RIGHT_L = 48;

export function hueForLevel(level: number): number {
  return (HUE_START + level * HUE_STEP) % 360;
}

export function facesForLevel(level: number): Faces {
  const h = hueForLevel(level);
  return {
    top: `hsl(${h}, ${SAT}%, ${TOP_L}%)`,
    left: `hsl(${h}, ${SAT}%, ${LEFT_L}%)`,
    right: `hsl(${h}, ${SAT}%, ${RIGHT_L}%)`,
  };
}

// Background is a darker, desaturated cousin of the current top block's hue,
// shifting subtly as the player climbs.
export function backgroundColors(level: number): [string, string] {
  const h = hueForLevel(level);
  return [`hsl(${h}, 22%, 12%)`, `hsl(${(h + 30) % 360}, 26%, 6%)`];
}
