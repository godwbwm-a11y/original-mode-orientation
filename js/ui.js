const $ = (selector) => document.querySelector(selector);

export class UI {
  constructor(controls) {
    this.controls = controls;
    this.hud = $("#hud");
    this.mobileControls = $("#mobile-controls");
    this.story = $("#story-card");
    this.choice = $("#choice-card");
    this.input = $("#input-card");
    this.avatar = $("#avatar-card");
    this.menu = $("#menu-card");
    this.toastNode = $("#toast");
    this.toastTimer = 0;
  }

  hideLoading() { $("#loading-card").classList.add("is-hidden"); }

  setHud(title, objective = "") {
    $("#hud-title").textContent = title;
    $("#hud-objective").textContent = objective;
    this.hud.classList.remove("is-hidden");
  }

  setPlayMode(enabled, interactLabel = "살펴보기") {
    this.controls.setEnabled(enabled);
    this.controls.setInteractLabel(interactLabel);
    this.mobileControls.classList.toggle("is-hidden", !enabled);
  }

  hidePanels() {
    for (const panel of [this.story, this.choice, this.input, this.avatar, this.menu]) panel.classList.add("is-hidden");
  }

  storyCard({ kicker = "", title, html, actions = [{ label: "계속", value: "next", primary: true }] }) {
    this.setPlayMode(false);
    this.hidePanels();
    $("#story-kicker").textContent = kicker;
    $("#story-title").textContent = title;
    $("#story-body").innerHTML = html;
    const wrap = $("#story-actions");
    wrap.replaceChildren();
    this.story.classList.remove("is-hidden");
    return new Promise((resolve) => {
      for (const action of actions) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action.primary ? "primary-button" : "secondary-button";
        button.textContent = action.label;
        button.addEventListener("click", () => { this.story.classList.add("is-hidden"); resolve(action.value); }, { once: true });
        wrap.append(button);
      }
      wrap.querySelector("button")?.focus({ preventScroll: true });
    });
  }

  choiceCard({ kicker = "", title, help = "", options }) {
    this.setPlayMode(false);
    this.hidePanels();
    $("#choice-kicker").textContent = kicker;
    $("#choice-title").textContent = title;
    $("#choice-help").textContent = help;
    const list = $("#choice-list");
    list.replaceChildren();
    this.choice.classList.remove("is-hidden");
    return new Promise((resolve) => {
      for (const option of options) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "choice-button";
        button.textContent = option.label;
        button.addEventListener("click", () => { this.choice.classList.add("is-hidden"); resolve(option.value ?? option.label); }, { once: true });
        list.append(button);
      }
      list.querySelector("button")?.focus({ preventScroll: true });
    });
  }

  inputCard({ kicker = "", title, help = "", label = "내 생각", placeholder = "짧게 적어도 괜찮아요.", value = "", optional = true, button = "저장하고 계속" }) {
    this.setPlayMode(false);
    this.hidePanels();
    $("#input-kicker").textContent = kicker;
    $("#input-title").textContent = title;
    $("#input-help").textContent = help;
    $("#input-label").textContent = label;
    const textarea = $("#reflection-input");
    textarea.placeholder = placeholder;
    textarea.value = value;
    const wrap = $("#input-actions");
    wrap.replaceChildren();
    const save = document.createElement("button");
    save.type = "button"; save.className = "primary-button"; save.textContent = button;
    const skip = document.createElement("button");
    skip.type = "button"; skip.className = "secondary-button"; skip.textContent = "아직 모르겠어요";
    this.input.classList.remove("is-hidden");
    return new Promise((resolve) => {
      save.addEventListener("click", () => {
        const answer = textarea.value.trim();
        if (!answer && !optional) { textarea.focus(); return; }
        this.input.classList.add("is-hidden"); resolve(answer);
      }, { once: true });
      wrap.append(save);
      if (optional) {
        skip.addEventListener("click", () => { this.input.classList.add("is-hidden"); resolve("아직 모르겠어요"); }, { once: true });
        wrap.prepend(skip);
      }
      setTimeout(() => textarea.focus({ preventScroll: true }), 80);
    });
  }

  avatarCard(current) {
    this.setPlayMode(false);
    this.hidePanels();
    const state = { ...current };
    const groups = {
      skin: ["#f0c7a5", "#d39b72", "#9a6248", "#70402f"],
      hair: ["#1d1513", "#5a3427", "#c48643", "#38526d"],
      shirt: ["#4bb3fd", "#60d394", "#ff7b8b", "#9b7bff", "#f6bd60"]
    };
    const refresh = () => {
      $(".avatar-face").style.background = state.skin;
      $(".avatar-hair").style.background = state.hair;
      $(".avatar-shirt").style.background = state.shirt;
    };
    for (const [key, colors] of Object.entries(groups)) {
      const list = $(`#${key}-options`);
      list.replaceChildren();
      for (const color of colors) {
        const button = document.createElement("button");
        button.type = "button"; button.className = "swatch" + (state[key] === color ? " is-selected" : "");
        const keyLabel = { skin: "피부", hair: "머리", shirt: "상의" }[key];
        button.style.setProperty("--swatch", color); button.setAttribute("aria-label", `${keyLabel} 색상 선택`);
        button.addEventListener("click", () => {
          state[key] = color;
          [...list.children].forEach((item) => item.classList.remove("is-selected"));
          button.classList.add("is-selected"); refresh();
        });
        list.append(button);
      }
    }
    refresh();
    this.avatar.classList.remove("is-hidden");
    return new Promise((resolve) => {
      $("#avatar-confirm").onclick = () => { this.avatar.classList.add("is-hidden"); resolve(state); };
    });
  }

  toast(message, duration = 2200) {
    clearTimeout(this.toastTimer);
    this.toastNode.textContent = message;
    this.toastNode.classList.remove("is-hidden");
    this.toastTimer = setTimeout(() => this.toastNode.classList.add("is-hidden"), duration);
  }

  showMenu(onResume, onRestart) {
    const wasPlaying = !this.mobileControls.classList.contains("is-hidden");
    this.setPlayMode(false);
    this.menu.classList.remove("is-hidden");
    $("#resume-button").onclick = () => { this.menu.classList.add("is-hidden"); if (wasPlaying) this.setPlayMode(true); onResume?.(); };
    $("#restart-button").onclick = () => onRestart?.();
  }
}
