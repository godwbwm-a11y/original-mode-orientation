import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { loadSave } from "./storage.js";
import { OrientationScene, gameConfig } from "./game.js";

let save = loadSave();
const controls = new Controls(document);
const ui = new UI(controls);
const scene = new OrientationScene({
  ui,
  controls,
  getSave: () => save,
  setSave: (next) => { save = next; }
});

const game = new Phaser.Game(gameConfig(scene));

const refreshGameSize = () => {
  document.documentElement.style.setProperty("--viewport-height", `${window.visualViewport?.height || window.innerHeight}px`);
  game.scale.refresh();
};

window.addEventListener("resize", refreshGameSize, { passive: true });
window.addEventListener("orientationchange", () => setTimeout(refreshGameSize, 120), { passive: true });
window.visualViewport?.addEventListener("resize", refreshGameSize, { passive: true });
document.addEventListener("touchmove", (event) => {
  if (event.target.closest?.("#mobile-controls, #game-root")) event.preventDefault();
}, { passive: false });

refreshGameSize();

window.addEventListener("error", () => {
  const loading = document.querySelector("#loading-card");
  if (!loading?.classList.contains("is-hidden")) loading.querySelector("p").textContent = "게임을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.";
});
