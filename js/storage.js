const KEY = "original-mode-orientation-v1";

const defaults = {
  version: 1,
  checkpoint: "title",
  completed: false,
  startedAt: null,
  updatedAt: null,
  avatar: { skin: "#d39b72", hair: "#2a1b15", shirt: "#4bb3fd" },
  discoveries: [],
  interests: [],
  note: "",
  phoneThought: "",
  goodPoints: {},
  firstAnswer: ""
};

export function loadSave() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!stored || stored.version !== defaults.version) return structuredClone(defaults);
    return { ...structuredClone(defaults), ...stored, avatar: { ...defaults.avatar, ...(stored.avatar || {}) } };
  } catch {
    return structuredClone(defaults);
  }
}

export function writeSave(next) {
  const value = { ...next, updatedAt: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* 플레이는 저장 없이 계속된다. */ }
  return value;
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
  return structuredClone(defaults);
}

export function hasProgress(save) {
  return save.checkpoint !== "title" || save.completed;
}

export { KEY as SAVE_KEY };
