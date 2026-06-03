// Maps every input (pointer, touch, click, Space/Enter) to press/release
// events. A "press" is a fresh button-down (debounced, no OS key-repeat); a
// "release" is the matching button-up. The game uses press to drop and the
// held interval between press and release to auto-rapid-drop.

export interface InputHandlers {
  onPress: () => void;
  onRelease: () => void;
  // Arrow keys: -1 = previous, +1 = next (used to pick difficulty on menus).
  onNavigate: (dir: -1 | 1) => void;
}

export function bindInput(
  target: HTMLElement,
  handlers: InputHandlers,
): () => void {
  let down = false;
  let last = 0;

  const press = (e?: Event) => {
    e?.preventDefault();
    if (down) return; // already holding — ignore extra downs (multi-touch)
    const now = performance.now();
    if (now - last < 50) return; // debounce stray double events
    last = now;
    down = true;
    handlers.onPress();
  };

  const release = () => {
    if (!down) return;
    down = false;
    handlers.onRelease();
  };

  const isDropKey = (code: string) => code === "Space" || code === "Enter";

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft" || e.code === "ArrowUp") {
      e.preventDefault();
      handlers.onNavigate(-1);
      return;
    }
    if (e.code === "ArrowRight" || e.code === "ArrowDown") {
      e.preventDefault();
      handlers.onNavigate(1);
      return;
    }
    if (!isDropKey(e.code)) return;
    if (e.repeat) return; // we drive repeats ourselves via the hold interval
    press(e);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (isDropKey(e.code)) release();
  };

  target.addEventListener("pointerdown", press);
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", release);

  return () => {
    target.removeEventListener("pointerdown", press);
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", release);
  };
}
