import { Game, type Hud } from "./game.ts";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#game canvas not found");

const hud: Hud = {
  scoreEl: byId("score"),
  menuEl: byId("menu"),
  gameoverEl: byId("gameover"),
  goScoreEl: byId("go-score"),
  goBestEl: byId("go-best"),
  diffButtons: Array.from(
    document.querySelectorAll<HTMLElement>(".diff-btn"),
  ),
};

new Game(canvas, hud);

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} element not found`);
  return el;
}
