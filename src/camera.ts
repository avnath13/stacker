import { CONFIG } from "./config.ts";
import type { Origin } from "./iso.ts";

// Drives the isometric origin so the active top of the tower stays in the
// upper third of the screen, with eased follow and a decaying screen-shake.
export class Camera {
  // Current and target vertical offset (added to origin.y).
  private offsetY = 0;
  private targetY = 0;
  private shake = 0;
  private viewW = 0;
  private viewH = 0;

  resize(w: number, h: number): void {
    this.viewW = w;
    this.viewH = h;
  }

  reset(): void {
    this.offsetY = 0;
    this.targetY = 0;
    this.shake = 0;
  }

  // Aim the camera at a tower of the given height (top level index).
  follow(topLevel: number): void {
    // As the tower grows, push the origin down so higher blocks stay on screen.
    this.targetY = topLevel * CONFIG.blockHeightPx;
  }

  kick(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  update(dt: number): void {
    this.offsetY += (this.targetY - this.offsetY) * CONFIG.cameraEase;
    if (this.shake > 0) {
      this.shake -= CONFIG.shakeDecay * dt;
      if (this.shake < 0) this.shake = 0;
    }
  }

  // The isometric origin in screen space for this frame.
  origin(): Origin {
    const jitter =
      this.shake > 0 ? (Math.random() * 2 - 1) * this.shake : 0;
    return {
      x: this.viewW * 0.5,
      // Anchor near the lower third, then scroll up via offsetY.
      y: this.viewH * 0.72 + this.offsetY + jitter,
    };
  }
}
