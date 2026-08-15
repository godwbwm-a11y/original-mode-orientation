export class Controls {
  constructor(root = document) {
    this.state = { left: false, right: false, jump: false };
    this.jumpPressed = false;
    this.interactPressed = false;
    this.enabled = false;
    this.buttons = [...root.querySelectorAll("[data-control]")];
    this.interactButton = root.querySelector("#interact-button");
    this.pointers = new Map();
    this.keys = new Set();
    this.bindButtons();
    this.bindKeyboard();
    window.addEventListener("blur", () => this.reset());
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.reset(); });
  }

  bindButtons() {
    for (const button of this.buttons) {
      const control = button.dataset.control;
      const down = (event) => {
        event.preventDefault();
        if (!this.enabled && control !== "interact") return;
        button.setPointerCapture?.(event.pointerId);
        this.pointers.set(event.pointerId, control);
        button.classList.add("is-active");
        if (control === "interact") this.interactPressed = true;
        else {
          if (control === "jump" && !this.state.jump) this.jumpPressed = true;
          this.state[control] = true;
        }
      };
      const up = (event) => {
        event.preventDefault();
        this.pointers.delete(event.pointerId);
        button.classList.remove("is-active");
        if (control !== "interact") {
          const stillHeld = [...this.pointers.values()].includes(control);
          this.state[control] = stillHeld;
        }
      };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointercancel", up);
      button.addEventListener("lostpointercapture", up);
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    }
  }

  bindKeyboard() {
    const mapping = {
      ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
      ArrowUp: "jump", Space: "jump", KeyW: "jump"
    };
    window.addEventListener("keydown", (event) => {
      if (["TEXTAREA", "INPUT"].includes(document.activeElement?.tagName)) return;
      if (event.code === "KeyE" || event.code === "Enter") {
        if (!event.repeat) this.interactPressed = true;
        event.preventDefault();
        return;
      }
      const control = mapping[event.code];
      if (!control) return;
      event.preventDefault();
      if (control === "jump" && !this.keys.has(event.code)) this.jumpPressed = true;
      this.keys.add(event.code);
      this.state[control] = true;
    });
    window.addEventListener("keyup", (event) => {
      const control = mapping[event.code];
      if (!control) return;
      this.keys.delete(event.code);
      this.state[control] = [...this.keys].some((code) => mapping[code] === control);
    });
  }

  consumeJump() { const value = this.jumpPressed; this.jumpPressed = false; return value; }
  consumeInteract() { const value = this.interactPressed; this.interactPressed = false; return value; }
  setEnabled(value) { this.enabled = value; if (!value) this.reset(); }
  setInteractLabel(label) { this.interactButton.textContent = label; }
  reset() {
    this.state.left = false; this.state.right = false; this.state.jump = false;
    this.jumpPressed = false; this.interactPressed = false; this.pointers.clear(); this.keys.clear();
    for (const button of this.buttons) button.classList.remove("is-active");
  }
}
