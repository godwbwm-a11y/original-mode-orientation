import { STAGES, DISCOVERIES, INTEREST_OPTIONS, GOOD_NPCS, DOORS } from "../data/orientation.js";
import { writeSave } from "./storage.js";

const W = 1600;
const H = 900;
const C = {
  ink: 0xf7f3df, gold: 0xffd166, blue: 0x4bb3fd, green: 0x60d394,
  night: 0x090b17, city: 0x202536, gray: 0x777b87, white: 0xffffff,
  church: 0x191a2d, purple: 0x65558f, danger: 0xff6070
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class OrientationScene extends Phaser.Scene {
  constructor({ ui, controls, getSave, setSave }) {
    super("orientation");
    this.ui = ui;
    this.controls = controls;
    this.getSave = getSave;
    this.setSave = setSave;
    this.mode = "loading";
    this.busy = false;
    this.near = null;
    this.player = null;
    this.platforms = null;
    this.cursors = null;
    this.lastGroundedAt = 0;
  }

  create() {
    this.physics.world.setFPS(60);
    this.cameras.main.setRoundPixels(true);
    this.makeSharedTextures();
    this.ui.hideLoading();
    this.bindMenu();
    this.titleStage();
  }

  bindMenu() {
    document.querySelector("#menu-button").addEventListener("click", () => {
      if (["title", "avatar", "ending"].includes(this.mode)) return;
      const wasPaused = this.physics.world.isPaused;
      this.physics.pause();
      this.ui.showMenu(
        () => { if (!wasPaused && this.isPlayMode()) this.physics.resume(); },
        () => {
          if (window.confirm("저장된 오리엔테이션 진행을 지우고 처음부터 시작할까요?")) {
            localStorage.removeItem("original-mode-orientation-v1");
            window.location.reload();
          }
        }
      );
    });
    window.addEventListener("keydown", (event) => {
      if (event.code === "Escape") document.querySelector("#menu-button").click();
    });
  }

  checkpoint(stage, extra = {}) {
    const current = this.getSave();
    const next = writeSave({
      ...current,
      ...extra,
      checkpoint: stage,
      startedAt: current.startedAt || new Date().toISOString()
    });
    this.setSave(next);
  }

  async goto(stage) {
    if (!STAGES.includes(stage)) return;
    this.busy = true;
    this.controls.reset();
    this.physics.resume();
    this.clearWorld();
    const method = `${stage}Stage`;
    if (typeof this[method] === "function") await this[method]();
  }

  clearWorld() {
    this.mode = "loading";
    this.near = null;
    this.player = null;
    this.physics.world.colliders.destroy();
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);
    this.children.removeAll(true);
    this.ui.hidePanels();
    this.ui.hud.classList.add("is-hidden");
    this.ui.setPlayMode(false);
  }

  makeSharedTextures() {
    if (this.textures.exists("pixel")) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff).fillRect(0, 0, 16, 16).generateTexture("pixel", 16, 16);
    g.clear().fillStyle(0xffffff).fillRoundedRect(0, 0, 72, 96, 12).generateTexture("npc", 72, 96);
    g.clear().fillStyle(0xffffff).fillRoundedRect(0, 0, 180, 34, 8).generateTexture("platform", 180, 34);
    g.clear().fillStyle(0xffffff).fillRect(0, 0, 76, 76).generateTexture("block", 76, 76);
    g.destroy();
  }

  makePlayerTexture() {
    if (this.textures.exists("player-custom")) this.textures.remove("player-custom");
    const { skin, hair, shirt } = this.getSave().avatar;
    const hex = (value) => Phaser.Display.Color.HexStringToColor(value).color;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x0c1020).fillRect(19, 78, 16, 24).fillRect(45, 78, 16, 24);
    g.fillStyle(0x273654).fillRect(16, 61, 48, 25);
    g.fillStyle(hex(shirt)).fillRoundedRect(12, 35, 56, 40, 10);
    g.fillStyle(hex(skin)).fillRoundedRect(20, 9, 40, 37, 12);
    g.fillStyle(hex(hair)).fillRoundedRect(17, 3, 46, 20, 10).fillRect(17, 13, 8, 20);
    g.fillStyle(0x171421).fillRect(30, 25, 4, 4).fillRect(47, 25, 4, 4);
    g.generateTexture("player-custom", 80, 104);
    g.destroy();
  }

  makePersonTexture(key, shirt = 0x5b6170, skin = 0xd39b72, hair = 0x2a1b15) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x222a42).fillRect(16, 65, 18, 31).fillRect(42, 65, 18, 31);
    g.fillStyle(shirt).fillRoundedRect(10, 35, 58, 42, 10);
    g.fillStyle(skin).fillRoundedRect(20, 8, 40, 39, 12);
    g.fillStyle(hair).fillRoundedRect(17, 3, 46, 20, 10);
    g.fillStyle(0x171421).fillRect(30, 25, 4, 4).fillRect(47, 25, 4, 4);
    g.generateTexture(key, 80, 104); g.destroy();
  }

  makePlayer(x, y) {
    this.makePlayerTexture();
    this.player = this.physics.add.sprite(x, y, "player-custom");
    this.player.setDepth(20).setCollideWorldBounds(true);
    this.player.body.setSize(52, 94).setOffset(14, 10);
    this.player.setMaxVelocity(560, 1100).setDragX(1800);
    return this.player;
  }

  addGround(width, y = 790, color = 0x31384c) {
    this.platforms = this.physics.add.staticGroup();
    const ground = this.add.rectangle(width / 2, y + 55, width, 110, color).setDepth(3);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);
    this.add.rectangle(width / 2, y + 3, width, 6, 0x6d7283).setDepth(4);
    return ground;
  }

  addPlatform(x, y, width = 260, color = 0x626a7c) {
    const platform = this.add.rectangle(x, y, width, 28, color).setDepth(8);
    this.physics.add.existing(platform, true);
    this.platforms.add(platform);
    return platform;
  }

  addLabel(x, y, text, options = {}) {
    return this.add.text(x, y, text, {
      fontFamily: '"Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
      fontSize: options.size || "28px", color: options.color || "#f7f3df",
      fontStyle: options.bold === false ? "normal" : "bold",
      align: options.align || "center", stroke: options.stroke || "#090b17", strokeThickness: options.strokeWidth ?? 6,
      wordWrap: options.wrap ? { width: options.wrap, useAdvancedWrap: true } : undefined
    }).setOrigin(options.originX ?? 0.5, options.originY ?? 0.5).setDepth(options.depth || 15);
  }

  addCityBackdrop(width, colorful = false) {
    const sky = colorful ? 0x2c456d : 0x202536;
    this.cameras.main.setBackgroundColor(sky);
    this.add.rectangle(width / 2, 390, width, 780, sky).setDepth(0);
    for (let x = 0; x < width; x += 260) {
      const h = 240 + ((x / 260) % 3) * 70;
      const color = colorful ? [0x42627c, 0x5a597b, 0x3f6a65][(x / 260) % 3] : [0x343846, 0x3d414e, 0x2d3240][(x / 260) % 3];
      this.add.rectangle(x + 130, 790 - h / 2, 220, h, color).setDepth(1);
      for (let wy = 580; wy < 730; wy += 58) for (let wx = x + 65; wx < x + 210; wx += 62) {
        this.add.rectangle(wx, wy, 20, 28, colorful ? 0xffd166 : 0x686b74).setAlpha(colorful ? .55 : .28).setDepth(2);
      }
    }
    this.add.circle(width - 260, 160, 58, colorful ? 0xffe7a3 : 0xaeb1b9, colorful ? .8 : .25).setDepth(1);
  }

  addStars(width = W, height = H, count = 70) {
    for (let i = 0; i < count; i++) {
      const x = (i * 211 + 87) % width;
      const y = (i * 97 + 43) % Math.max(180, height - 160);
      this.add.rectangle(x, y, i % 7 === 0 ? 5 : 3, i % 7 === 0 ? 5 : 3, 0xfff2b4, .45 + (i % 4) * .14).setDepth(1);
    }
  }

  isPlayMode() {
    return ["copyCity", "carloDay", "copyFactory", "notificationRun", "goodPoints", "lookUp", "sevenDoors"].includes(this.mode);
  }

  setPlay(stage, title, objective, label = "살펴보기") {
    this.mode = stage;
    this.busy = false;
    this.ui.setHud(title, objective);
    this.ui.setPlayMode(true, label);
  }

  async titleStage() {
    this.mode = "title";
    this.cameras.main.setBackgroundColor(C.night);
    this.addStars(W, H, 90);
    for (let x = 0; x < W; x += 90) {
      const alpha = .08 + ((x / 90) % 4) * .025;
      this.add.rectangle(x + 45, 790, 74, 160 + ((x / 90) % 3) * 70, 0x556074, alpha).setOrigin(.5, 1);
    }
    this.addLabel(W / 2, 238, "복사 모드 감지", { size: "28px", color: "#9aa0b2" });
    await wait(700);
    this.children.list.find((child) => child.text === "복사 모드 감지")?.setVisible(false);
    this.addLabel(W / 2, 338, "ORIGINAL MODE", { size: "82px", color: "#ffd166", strokeWidth: 10 });
    this.addLabel(W / 2, 424, "하느님께서 만드신 나를 찾아가는 7일", { size: "28px", color: "#f7f3df" });
    const save = this.getSave();
    const actions = [{ label: save.completed ? "엔딩 다시 보기" : "게임 시작", value: save.completed ? "ending" : "new", primary: true }];
    if (save.checkpoint !== "title" && !save.completed) actions.unshift({ label: "이어서 하기", value: "continue", primary: true });
    if (actions.length > 1) actions[1].primary = false;
    const answer = await this.ui.storyCard({
      kicker: "성 카를로 아쿠티스와 함께하는 7일 묵상",
      title: "0. 오리엔테이션",
      html: "<p>걷고, 뛰고, 만나고, 잠깐 멈추며 <strong>세상에 하나뿐인 나</strong>를 발견해 보세요.</p>",
      actions
    });
    if (answer === "continue") this.goto(save.checkpoint);
    else if (answer === "ending") this.goto("ending");
    else this.goto("avatar");
  }

  async avatarStage() {
    this.mode = "avatar";
    this.checkpoint("avatar");
    this.cameras.main.setBackgroundColor(0x17213b);
    this.addStars(W, H, 50);
    const avatar = await this.ui.avatarCard(this.getSave().avatar);
    this.checkpoint("copyCity", { avatar });
    await this.goto("copyCity");
  }

  async copyCityStage() {
    this.checkpoint("copyCity");
    const width = 4200;
    this.physics.world.setBounds(0, 0, width, H);
    this.cameras.main.setBounds(0, 0, width, H);
    this.addCityBackdrop(width, false);
    this.addGround(width);
    this.makePersonTexture("city-npc", 0x666b76, 0xb58b72, 0x3a3b43);
    this.makePersonTexture("carlo", 0x3b75c4, 0xd39b72, 0x3b271e);
    const lines = [
      "걔 팔로워 엄청 많더라.", "나는 사진 찍으면 왜 이렇게 나오지?", "내 영상은 보는 사람이 별로 없어.",
      "쟤는 공부도 잘하네.", "난 잘하는 게 없는 것 같아.", "나도 쟤처럼 되고 싶다."
    ];
    this.interactives = [];
    lines.forEach((line, index) => {
      const x = 650 + index * 470;
      const npc = this.physics.add.sprite(x, 720, "city-npc").setDepth(10).setImmovable(true);
      npc.body.setAllowGravity(false);
      this.addLabel(x, 610, String([327, 1204, 29, "7만", 804, 96][index]), { size: "21px", color: "#b7bac4" });
      this.interactives.push({ type: "npc", x, line, npc });
    });
    const ball = this.add.circle(3450, 740, 25, 0xf4f1df).setStrokeStyle(8, 0x293048).setDepth(9);
    this.add.line(3450, 740, -20, 0, 20, 0, 0x293048, 1).setDepth(10);
    const carlo = this.physics.add.sprite(3800, 714, "carlo").setDepth(10).setImmovable(true);
    carlo.body.setAllowGravity(false);
    this.addLabel(3800, 594, "카를로", { size: "22px", color: "#ffd166" });
    this.interactives.push({ type: "carlo", x: 3800, npc: carlo });
    this.makePlayer(170, 690);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, .12, .12, -280, 60);
    this.setPlay("copyCity", "복사본 도시", "오른쪽으로 걸으며 사람들의 이야기를 들어보세요.", "대화");
    this.ui.toast("◀ ▶ 이동 · 점프 · 대화 버튼을 함께 사용할 수 있어요.", 3500);
  }

  async handleCityInteract(target) {
    if (this.busy || !target) return;
    this.busy = true;
    if (target.type === "npc") {
      await this.ui.storyCard({ kicker: "도시에서 들린 말", title: "“비교하다 보니…”", html: `<p>${target.line}</p><p>이 도시는 모두가 자꾸 다른 사람을 바라보고 있어요.</p>` });
      this.setPlay("copyCity", "복사본 도시", "오른쪽 끝에서 청바지를 입은 소년을 만나보세요.", "대화");
      this.busy = false;
      return;
    }
    await this.goto("meetCarlo");
  }

  async meetCarloStage() {
    this.checkpoint("meetCarlo");
    this.cameras.main.setBackgroundColor(0x314c6a);
    this.addCityBackdrop(W, true);
    this.makePersonTexture("carlo", 0x3b75c4, 0xd39b72, 0x3b271e);
    this.makePlayerTexture();
    this.add.image(575, 620, "player-custom").setScale(2.1).setDepth(10);
    this.add.image(1025, 620, "carlo").setScale(2.1).setDepth(10);
    await this.ui.storyCard({
      kicker: "청바지를 입은 성인",
      title: "카를로를 만났어요",
      html: `<p><span class="speaker">나</span> “너 누구야?”</p><p><span class="speaker">카를로</span> “카를로.”</p><p><span class="speaker">나</span> “성인 아니야? …성인이 축구해?”</p><p><span class="speaker">카를로</span> “응! 나도 축구, 컴퓨터, 게임을 좋아했어.”</p>`
    });
    await this.ui.storyCard({
      kicker: "카를로의 이야기",
      title: "함께 걸어볼래?",
      html: `<p>“나는 네가 나처럼 보였으면 하는 게 아니야.”</p><p class="big-line">“하느님께서 만드신 너 자신이 되었으면 좋겠어.”</p>`,
      actions: [{ label: "카를로의 하루 찾아보기", value: "next", primary: true }]
    });
    this.goto("carloDay");
  }

  async carloDayStage() {
    this.checkpoint("carloDay");
    const width = 3800;
    this.physics.world.setBounds(0, 0, width, H);
    this.cameras.main.setBounds(0, 0, width, H);
    this.addCityBackdrop(width, true);
    this.addGround(width, 800, 0x3e5360);
    [[1040, 620, 330], [2060, 590, 330], [3200, 650, 320]].forEach((p) => this.addPlatform(...p, 0x718078));
    this.makePlayer(130, 700);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, .14, .14, -250, 50);
    this.discoverySprites = [];
    const found = new Set(this.getSave().discoveries || []);
    for (const item of DISCOVERIES) {
      if (found.has(item.id)) continue;
      const glow = this.add.circle(item.x, item.y, 52, 0xffd166, .22).setDepth(10);
      this.tweens.add({ targets: glow, alpha: .06, scale: 1.25, yoyo: true, repeat: -1, duration: 850 });
      const symbol = this.addLabel(item.x, item.y, item.symbol, { size: "54px", strokeWidth: 0, depth: 12 });
      this.physics.add.existing(symbol);
      symbol.body.setAllowGravity(false).setCircle(30);
      symbol.item = item; symbol.glow = glow;
      this.discoverySprites.push(symbol);
      this.physics.add.overlap(this.player, symbol, () => this.collectDiscovery(symbol));
    }
    this.updateDiscoveryHud();
    this.setPlay("carloDay", "카를로의 하루", "빛나는 물건 6개를 찾아보세요.");
    if (found.size >= DISCOVERIES.length) this.finishCarloDay();
  }

  collectDiscovery(symbol) {
    if (!symbol.active || this.busy) return;
    const save = this.getSave();
    const discoveries = [...new Set([...(save.discoveries || []), symbol.item.id])];
    this.checkpoint("carloDay", { discoveries });
    symbol.glow?.destroy(); symbol.destroy();
    this.ui.toast(`${symbol.item.label} 발견 — ${symbol.item.note}`, 2600);
    this.updateDiscoveryHud();
    if (discoveries.length >= DISCOVERIES.length) setTimeout(() => this.finishCarloDay(), 900);
  }

  updateDiscoveryHud() {
    const count = this.getSave().discoveries?.length || 0;
    this.ui.setHud("카를로의 하루", `발견 ${count}/6 · 평범한 하루 안에 무엇이 있었을까요?`);
  }

  async finishCarloDay() {
    if (this.busy) return;
    this.busy = true;
    await this.ui.storyCard({
      kicker: "여섯 가지 발견",
      title: "카를로도 우리와 비슷했어요",
      html: `<p>학교에 가고, 친구들과 놀고, 컴퓨터와 게임도 좋아했어요.</p><p class="big-line">성인은 평범한 삶에서 하느님을 선택한 사람이에요.</p>`
    });
    this.goto("copyFactory");
  }

  async copyFactoryStage() {
    this.checkpoint("copyFactory");
    const width = 4500;
    this.physics.world.setBounds(0, 0, width, H);
    this.cameras.main.setBounds(0, 0, width, H);
    this.cameras.main.setBackgroundColor(0x161a28);
    this.add.rectangle(width / 2, 400, width, 800, 0x161a28).setDepth(0);
    for (let x = 150; x < width; x += 330) {
      this.add.rectangle(x, 420, 170, 330, 0x303646).setDepth(1);
      this.add.circle(x, 390, 56, 0x6c7181, .3).setDepth(2);
      this.add.rectangle(x, 570, 110, 80, 0x777c89, .28).setDepth(2);
    }
    this.addGround(width, 800, 0x2d3342);
    [[760, 690, 260], [1210, 590, 260], [1710, 690, 250], [2380, 610, 280], [3000, 670, 280], [3560, 570, 280]].forEach((p) => this.addPlatform(...p, 0x6d7483));
    const hazards = [];
    [940, 1920, 2740, 3770].forEach((x) => {
      const spike = this.add.triangle(x, 755, 0, 60, 42, 0, 84, 60, 0xff6070).setDepth(7);
      this.physics.add.existing(spike, true);
      hazards.push(spike);
    });
    for (let x = 400; x < width; x += 760) this.addLabel(x, 520, ["인기", "유행", "좋아요", "따라 하기", "비교"][Math.floor(x / 760) % 5], { size: "34px", color: "#9499aa" });
    this.factoryGates = [1150, 2450, 3500];
    this.factoryGateDone = new Set();
    this.makePlayer(140, 700);
    this.physics.add.collider(this.player, this.platforms);
    hazards.forEach((hazard) => {
      this.physics.add.overlap(this.player, hazard, () => this.bumpPlayer());
    });
    this.cameras.main.startFollow(this.player, true, .13, .13, -260, 40);
    this.setPlay("copyFactory", "복사본 공장", "장애물을 넘고, 내가 좋아하는 것을 골라 색을 되찾아 보세요.");
  }

  bumpPlayer() {
    if (!this.player || this.player.getData("bumped")) return;
    this.player.setData("bumped", true).setTint(0xff8b96).setVelocity(-260, -420);
    this.ui.toast("괜찮아요. 천천히 다시 가면 돼요.", 1200);
    setTimeout(() => this.player?.clearTint().setData("bumped", false), 700);
  }

  async chooseFactory(index) {
    if (this.busy) return;
    this.busy = true;
    this.physics.pause();
    const selected = await this.ui.choiceCard({
      kicker: `나를 알아가는 질문 ${index + 1}/3`,
      title: index === 0 ? "나는 무엇을 좋아하지?" : index === 1 ? "시간 가는 줄 모르고 하는 것은?" : "이번 주에 해보고 싶은 것은?",
      help: "정답은 없어요. 지금 마음에 닿는 것을 하나 골라 보세요.",
      options: INTEREST_OPTIONS
    });
    const interests = [...new Set([...(this.getSave().interests || []), selected])];
    this.checkpoint("copyFactory", { interests });
    this.factoryGateDone.add(index);
    this.player.clearTint().setTint([0x77c8ff, 0x8be6af, 0xffd166][index]);
    this.physics.resume();
    this.setPlay("copyFactory", "복사본 공장", `나만의 색 ${index + 1}/3 · 계속 오른쪽으로 가세요.`);
    this.busy = false;
  }

  async finishFactory() {
    if (this.busy) return;
    this.busy = true;
    await this.ui.storyCard({
      kicker: "공장 밖으로",
      title: "나는 복사본이 아니에요",
      html: `<p>다른 사람의 좋은 모습을 닮아갈 수는 있어요. 하지만 나를 지우지는 않아도 돼요.</p><p class="big-line">하느님께서는 우리 모두를 원본으로 만드셨어요.</p>`
    });
    this.goto("originalNote");
  }

  async originalNoteStage() {
    this.checkpoint("originalNote");
    this.cameras.main.setBackgroundColor(0x24344f);
    this.addStars(W, H, 50);
    this.add.rectangle(W / 2, H / 2 + 30, 720, 580, 0xf2e4c4).setStrokeStyle(18, 0x865d3a).setDepth(2);
    this.add.line(W / 2, H / 2 + 30, 0, -280, 0, 280, 0xc29a6b, 1).setDepth(3);
    this.addLabel(W / 2, 205, "나의 원본 노트", { size: "48px", color: "#352314" });
    const interests = this.getSave().interests || [];
    this.addLabel(W / 2, 315, interests.length ? `내가 고른 것: ${interests.join(" · ")}` : "내가 좋아하는 것을 천천히 찾아가요.", { size: "26px", color: "#5a3c26", wrap: 620 });
    const note = await this.ui.inputCard({
      kicker: "나의 원본 노트",
      title: "나에게 있는 좋은 점은 무엇일까?",
      help: "작은 것도 좋아요. 잘 들어주기, 끝까지 해보기, 웃게 해주기… 아직 모르겠어도 괜찮아요.",
      label: "내가 발견한 좋은 점",
      placeholder: "예: 친구 이야기를 잘 들어줘요.",
      value: this.getSave().note || ""
    });
    this.checkpoint("notificationRun", { note });
    await this.ui.storyCard({
      kicker: "저장했어요",
      title: "이 노트는 점수표가 아니에요",
      html: "<p>남과 비교하지 않고, 하느님께서 내게 주신 것을 발견하는 작은 기록이에요.</p>",
      actions: [{ label: "다음 길로 달려가기", value: "next", primary: true }]
    });
    this.goto("notificationRun");
  }

  async notificationRunStage() {
    this.checkpoint("notificationRun");
    const width = 3500;
    this.physics.world.setBounds(0, 0, width, H);
    this.cameras.main.setBounds(0, 0, width, H);
    this.cameras.main.setBackgroundColor(0x19213b);
    this.add.rectangle(width / 2, H / 2, width, H, 0x19213b);
    for (let x = 0; x < width; x += 420) {
      this.add.circle(x + 180, 190 + (x % 800) / 8, 70, 0x324267, .35);
      this.addLabel(x + 180, 190 + (x % 800) / 8, ["알림", "새 소식", "메시지", "영상"][Math.floor(x / 420) % 4], { size: "22px", color: "#8d99b7" });
    }
    this.addGround(width, 800, 0x293653);
    [[960, 650, 260], [1620, 590, 280], [2300, 670, 260]].forEach((p) => this.addPlatform(...p, 0x54637f));
    this.makePlayer(150, 700);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, .16, .16, -300, 40);
    this.noticeBlocks = this.physics.add.staticGroup();
    const symbols = ["🔔", "♥", "💬", "▶", "📱"];
    [650, 1120, 1430, 1880, 2200, 2640, 2920].forEach((x, index) => {
      const y = index % 3 === 1 ? 520 : 720;
      const block = this.addLabel(x, y, symbols[index % symbols.length], { size: "56px", strokeWidth: 0, depth: 10 });
      this.physics.add.existing(block, true);
      block.body.setSize(70, 70);
      this.noticeBlocks.add(block);
    });
    this.physics.add.overlap(this.player, this.noticeBlocks, (_, block) => {
      if (!block.active) return;
      block.destroy();
      this.player.setVelocityX(-220).setTint(0xffa0aa);
      setTimeout(() => this.player?.clearTint(), 400);
      this.ui.toast("알림에 부딪혔어요. 그래도 다시 선택할 수 있어요.", 1300);
    });
    this.setPlay("notificationRun", "알림 달리기", "밀려오는 알림을 지나 오른쪽 끝까지 가보세요.", "생각하기");
  }

  async finishNotificationRun() {
    if (this.busy) return;
    this.busy = true;
    this.player?.setVelocity(0, 0);
    this.physics.pause();
    await this.ui.storyCard({
      kicker: "잠깐 멈춤",
      title: "스마트폰이 나쁜 걸까?",
      html: `<p><span class="speaker">카를로</span> “스마트폰은 도구야. 중요한 것은 누가 주인인가 하는 거야.”</p><p class="big-line">누가 도구를 사용하고 있을까?</p>`
    });
    const answer = await this.ui.choiceCard({
      kicker: "생각해 보기",
      title: "요즘 나는 어떤 것 같아?",
      help: "어떤 답을 골라도 혼나지 않아요. 솔직하게 생각해 보세요.",
      options: [
        { label: "내가 스마트폰을 잘 사용하고 있어요", value: "내가 잘 사용하고 있어요" },
        { label: "가끔 스마트폰에 끌려가요", value: "가끔 끌려가요" },
        { label: "잘 모르겠어요", value: "잘 모르겠어요" }
      ]
    });
    this.checkpoint("quietChurch", { phoneThought: answer });
    await this.ui.storyCard({
      kicker: "카를로의 제안",
      title: "잠깐 쉬어볼래?",
      html: "<p>“도구를 버릴 필요는 없어. 다만 잠깐 내려놓고, 정말 중요한 분을 바라볼 수 있어.”</p>",
      actions: [{ label: "조용한 성당으로", value: "next", primary: true }]
    });
    this.goto("quietChurch");
  }

  async quietChurchStage() {
    this.checkpoint("quietChurch");
    this.mode = "quietChurch";
    this.cameras.main.setBackgroundColor(C.church);
    this.add.rectangle(W / 2, H / 2, W, H, C.church);
    for (let x = 120; x < W; x += 160) this.add.rectangle(x, 660, 100, 220, 0x2e2944).setDepth(2);
    this.add.rectangle(W / 2, 400, 360, 500, 0x282442).setStrokeStyle(12, 0x5b4c68).setDepth(3);
    this.add.rectangle(W / 2, 520, 140, 120, 0x765b3a).setStrokeStyle(8, 0xd9b86a).setDepth(5);
    this.add.circle(W / 2, 475, 23, 0xfff1b0, .75).setDepth(6);
    [660, 940].forEach((x) => {
      this.add.rectangle(x, 570, 15, 95, 0xe8ddc0).setDepth(5);
      const flame = this.add.ellipse(x, 500, 22, 38, 0xffd166, .8).setDepth(6);
      this.tweens.add({ targets: flame, scaleY: .75, alpha: .5, yoyo: true, repeat: -1, duration: 500 + (x % 80) });
    });
    await this.ui.storyCard({
      kicker: "조용한 성당",
      title: "여기서는 아무것도 하지 않아도 돼",
      html: `<p><span class="speaker">카를로</span> “10초 동안 그냥 조용히 있어볼래?”</p><p>버튼을 눌러도 실패가 아니에요. 다시 고요해지면 돼요.</p>`,
      actions: [{ label: "조용히 있기", value: "next", primary: true }]
    });
    await this.runSilence();
    await this.ui.storyCard({
      kicker: "고요 속에서",
      title: "예수님께서 기다리고 계세요",
      html: `<p>성체 안에서 예수님께서 우리를 기다리고 계세요.</p><p><span class="speaker">카를로</span> “나는 여기가 참 좋았어.”</p><p class="big-line">“성체성사는 천국으로 가는 나의 고속도로야.”</p>`
    });
    this.goto("goodPoints");
  }

  runSilence() {
    this.ui.setPlayMode(false);
    this.ui.setHud("조용한 성당", "10초 동안 잠깐 고요히 있어보세요.");
    document.querySelector("#menu-button").classList.add("is-hidden");
    return new Promise((resolve) => {
      let start = performance.now();
      let finished = false;
      const label = this.addLabel(W / 2, 735, "10", { size: "54px", color: "#ffe7a3" });
      const guide = this.addLabel(W / 2, 800, "아무것도 하지 않아도 괜찮아요.", { size: "23px", color: "#b9bed3" });
      const reset = (event) => {
        if (finished || event.target?.closest?.("#menu-button")) return;
        start = performance.now();
        guide.setText("괜찮아요. 다시 조용히 있어봐요.");
      };
      window.addEventListener("pointerdown", reset, true);
      window.addEventListener("keydown", reset, true);
      const tick = () => {
        if (finished) return;
        const remaining = Math.max(0, 10 - (performance.now() - start) / 1000);
        label.setText(remaining > 0 ? String(Math.ceil(remaining)) : "고요");
        if (remaining <= 0) {
          finished = true;
          window.removeEventListener("pointerdown", reset, true);
          window.removeEventListener("keydown", reset, true);
          document.querySelector("#menu-button").classList.remove("is-hidden");
          this.time.delayedCall(700, () => resolve());
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async goodPointsStage() {
    this.checkpoint("goodPoints");
    const width = 3000;
    this.physics.world.setBounds(0, 0, width, H);
    this.cameras.main.setBounds(0, 0, width, H);
    this.addCityBackdrop(width, true);
    this.addGround(width, 800, 0x3f5b57);
    this.goodTargets = [];
    for (const data of GOOD_NPCS) {
      const key = `good-${data.id}`;
      this.makePersonTexture(key, data.color);
      const npc = this.physics.add.sprite(data.x, 716, key).setDepth(10).setImmovable(true);
      npc.body.setAllowGravity(false);
      this.addLabel(data.x, 600, data.name, { size: "23px", color: "#fff0b5" });
      this.goodTargets.push({ ...data, npc });
    }
    this.makePlayer(170, 700);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, .14, .14, -240, 50);
    const count = Object.keys(this.getSave().goodPoints || {}).length;
    this.setPlay("goodPoints", "좋은 점 찾기", `세 친구와 이야기해 보세요. ${count}/3`, "대화");
    if (count >= 3) setTimeout(() => this.finishGoodPoints(), 500);
  }

  async talkGoodPoint(target) {
    if (this.busy || !target) return;
    if (this.getSave().goodPoints?.[target.id]) { this.ui.toast(`이미 발견했어요: ${this.getSave().goodPoints[target.id]}`); return; }
    this.busy = true;
    await this.ui.storyCard({ kicker: target.name, title: "이야기를 들어보니…", html: `<p>“${target.line}”</p>` });
    const answer = await this.ui.choiceCard({
      kicker: "좋은 점 찾기",
      title: "이 친구에게 어떤 좋은 점이 보이나요?",
      help: "한 가지 정답만 있는 질문이 아니에요.",
      options: target.options.map((label) => ({ label, value: label }))
    });
    const goodPoints = { ...(this.getSave().goodPoints || {}), [target.id]: answer };
    this.checkpoint("goodPoints", { goodPoints });
    target.npc.setTint(0xffe28a);
    this.ui.toast(`${target.name}: ${answer}`);
    if (Object.keys(goodPoints).length >= 3) {
      await this.finishGoodPoints();
      return;
    }
    this.setPlay("goodPoints", "좋은 점 찾기", `세 친구와 이야기해 보세요. ${Object.keys(goodPoints).length}/3`, "대화");
    this.busy = false;
  }

  async finishGoodPoints() {
    if (this.mode !== "goodPoints" || (this.busy && Object.keys(this.getSave().goodPoints || {}).length < 3)) return;
    this.busy = true;
    await this.ui.storyCard({
      kicker: "오늘의 현실 미션",
      title: "친구 한 명의 좋은 점을 말해 주세요",
      html: `<p>게임 안에서만 끝내지 말고, 오늘 실제 친구나 가족 한 명에게 좋은 점을 말해 주세요.</p><p class="big-line">좋은 점을 발견해 말해 주는 것도 사랑이에요.</p>`
    });
    this.goto("lookUp");
  }

  async lookUpStage() {
    this.checkpoint("lookUp");
    const worldH = 2850;
    this.physics.world.setBounds(0, 0, W, worldH);
    this.cameras.main.setBounds(0, 0, W, worldH);
    this.cameras.main.setBackgroundColor(0x0c132b);
    this.add.rectangle(W / 2, worldH / 2, W, worldH, 0x0c132b);
    this.addStars(W, worldH, 190);
    const worries = ["비교", "걱정", "성적", "외모", "관계"];
    worries.forEach((word, i) => this.addLabel(220 + i * 290, 2720, word, { size: "35px", color: "#77809d" }));
    this.platforms = this.physics.add.staticGroup();
    const platforms = [
      [800, 2740, 1500], [300, 2560, 470], [900, 2390, 470], [1300, 2220, 420],
      [760, 2050, 440], [260, 1880, 430], [780, 1710, 430], [1280, 1540, 430],
      [780, 1370, 430], [290, 1200, 430], [820, 1030, 430], [1310, 860, 430],
      [850, 690, 470], [350, 520, 470], [820, 350, 700]
    ];
    platforms.forEach((p, i) => this.addPlatform(p[0], p[1], p[2], i === 0 ? 0x313a56 : 0x526583));
    this.makePlayer(280, 2630);
    this.player.setMaxVelocity(600, 1200);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, .12, .15, 0, 80);
    this.addLabel(800, 2420, "계속 아래만 보고 있네.", { size: "30px", color: "#aeb7cf", wrap: 500 });
    this.addLabel(800, 2140, "위를 바라봐!", { size: "45px", color: "#ffd166" });
    const star = this.add.star(820, 245, 5, 28, 68, 0xffd166).setDepth(10);
    this.physics.add.existing(star, true);
    this.tweens.add({ targets: star, scale: 1.18, alpha: .68, yoyo: true, repeat: -1, duration: 850 });
    this.physics.add.overlap(this.player, star, () => this.finishLookUp());
    this.resetPlayer = () => { this.player?.setPosition(280, 2630).setVelocity(0, 0); };
    this.setPlay("lookUp", "위를 바라봐", "플랫폼을 밟고 별빛이 있는 곳까지 올라가세요.");
  }

  async finishLookUp() {
    if (this.busy) return;
    this.busy = true;
    this.physics.pause();
    await this.ui.storyCard({
      kicker: "별빛 아래에서",
      title: "모든 것을 혼자 해결하지 않아도 돼",
      html: `<p><span class="speaker">카를로</span> “걱정이 없어져야 위를 보는 건 아니야.”</p><p>걱정을 안고도 예수님께 이야기할 수 있어요. 맡겨 드릴 수 있어요.</p><p class="big-line">‘내’가 아니라 하느님을!</p>`
    });
    this.goto("sevenDoors");
  }

  async sevenDoorsStage() {
    this.checkpoint("sevenDoors");
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor(0x121a38);
    this.add.rectangle(W / 2, H / 2, W, H, 0x121a38);
    this.addStars(W, H, 100);
    this.addGround(W, 800, 0x283152);
    this.doors = [];
    DOORS.forEach(([day, title], index) => {
      const x = 190 + index * 205;
      const color = index === 0 ? 0xffd166 : 0x505a78;
      const door = this.add.rectangle(x, 630, 130, 230, color, index === 0 ? .95 : .65).setStrokeStyle(8, index === 0 ? 0xffefb0 : 0x747d99).setDepth(7);
      this.add.rectangle(x, 620, 80, 170, index === 0 ? 0x2f4b70 : 0x252b43).setDepth(8);
      this.add.circle(x + 26, 630, 7, index === 0 ? 0xffd166 : 0x777d90).setDepth(9);
      this.addLabel(x, 470, day, { size: "20px", color: index === 0 ? "#ffe7a3" : "#a8aec0" });
      this.addLabel(x, 515, title, { size: "16px", color: index === 0 ? "#ffffff" : "#969caf", wrap: 180 });
      if (index > 0) this.addLabel(x, 625, "잠김", { size: "17px", color: "#aeb2c0" });
      this.doors.push({ index, x, door });
    });
    this.makePlayer(75, 700);
    this.player.setScale(.8);
    this.player.body.setSize(52, 94).setOffset(14, 10);
    this.physics.add.collider(this.player, this.platforms);
    await this.ui.storyCard({
      kicker: "앞으로 이어질 7일",
      title: "7개의 문이 기다리고 있어요",
      html: `<p><strong>첫째 날</strong> 조종실 · <strong>둘째 날</strong> 천국으로 가는 길 · <strong>셋째 날</strong> 원본</p><p><strong>넷째 날</strong> 위를 바라봐 · <strong>다섯째 날</strong> 재능 작업실 · <strong>여섯째 날</strong> 사랑의 다리 · <strong>일곱째 날</strong> 나의 인생 계획</p><p>오늘은 첫째 날의 문만 열려 있어요.</p>`,
      actions: [{ label: "문 앞에 서기", value: "next", primary: true }]
    });
    this.setPlay("sevenDoors", "7개의 문", "앞으로 7일 동안 하나씩 열릴 거예요. 첫째 날의 문을 살펴보세요.", "문 열기");
  }

  async openFirstDoor() {
    if (this.busy) return;
    this.busy = true;
    await this.ui.storyCard({
      kicker: "앞으로 걸어갈 길",
      title: "7개의 문이 기다리고 있어요",
      html: `<p>매일 짧은 게임, 카를로의 이야기, 질문 하나, 현실 미션, 기도로 이어져요.</p><p><strong>첫째 날의 질문:</strong> 내 삶의 중심은 무엇일까?</p><p>오늘은 그 길을 시작하기 전, 첫 마음을 남겨볼 거예요.</p>`
    });
    this.goto("firstQuestion");
  }

  async firstQuestionStage() {
    this.checkpoint("firstQuestion");
    this.cameras.main.setBackgroundColor(0x203658);
    this.addStars(W, H, 100);
    this.add.circle(W / 2, 390, 220, 0xffd166, .08);
    this.addLabel(W / 2, 390, "?", { size: "240px", color: "#ffd166", strokeWidth: 0 });
    const answer = await this.ui.inputCard({
      kicker: "첫 질문",
      title: "너는 어떤 사람이 되고 싶어?",
      help: "좋은 친구, 행복한 사람, 아직 모르겠어요… 무엇이든 괜찮아요. 이 답은 이 기기에만 저장되고, 일곱째 날 다시 만나게 돼요.",
      label: "지금의 내 대답",
      placeholder: "예: 다른 사람을 잘 도와주는 사람",
      value: this.getSave().firstAnswer || ""
    });
    this.checkpoint("prayer", { firstAnswer: answer });
    this.ui.toast("첫 마음을 안전하게 저장했어요.");
    await wait(500);
    this.goto("prayer");
  }

  async prayerStage() {
    this.checkpoint("prayer");
    this.mode = "prayer";
    this.cameras.main.setBackgroundColor(0x11152a);
    this.addStars(W, H, 80);
    this.add.rectangle(W / 2, 650, 900, 10, 0x4f5870).setDepth(2);
    this.add.rectangle(W / 2, 500, 120, 160, 0x6d5238).setStrokeStyle(8, 0xd8b46c).setDepth(3);
    this.add.circle(W / 2, 410, 26, 0xffedaa, .8).setDepth(4);
    await this.ui.storyCard({
      kicker: "시작 기도",
      title: "예수님께 그냥 이야기해도 괜찮아요",
      html: `<p>잠깐 숨을 고르고, 마음으로 함께 기도해 보세요.</p>`,
      actions: [{ label: "기도 시작", value: "next", primary: true }]
    });
    await this.ui.storyCard({
      kicker: "천천히 읽어 보세요",
      title: "예수님, 저와 함께 걸어 주세요",
      html: `<p>예수님,<br>카를로와 함께 걷는 이 길에서<br>하느님께서 만드신 저를 발견하게 해 주세요.</p><p>다른 사람과 비교하기보다<br>제 안의 좋은 것을 알아보고,<br>친구의 좋은 점도 볼 수 있게 해 주세요.</p><p>걱정과 기쁨을 숨기지 않고<br>예수님께 이야기하게 해 주세요.</p><p class="big-line">아멘.</p>`,
      actions: [{ label: "아멘", value: "next", primary: true }]
    });
    this.goto("ending");
  }

  async endingStage() {
    this.mode = "ending";
    const current = this.getSave();
    this.checkpoint("ending", { completed: true });
    this.cameras.main.setBackgroundColor(0x10182f);
    this.addStars(W, H, 130);
    this.add.rectangle(W / 2, 760, W, 280, 0x1d3047).setDepth(2);
    this.add.rectangle(1260, 600, 240, 310, 0x4a4051).setDepth(3);
    this.add.triangle(1260, 380, 0, 180, 240, 180, 120, 0, 0x5c4a58).setDepth(4);
    this.add.rectangle(1260, 490, 22, 100, 0xffd166, .82).setDepth(5);
    this.add.rectangle(1220, 530, 56, 90, 0xffdf87, .5).setDepth(5);
    this.makePersonTexture("carlo", 0x3b75c4, 0xd39b72, 0x3b271e);
    this.makePlayerTexture();
    this.add.image(650, 700, "player-custom").setDepth(8);
    this.add.image(770, 700, "carlo").setDepth(8);
    const first = current.firstAnswer || "아직 모르겠어요";
    await this.ui.storyCard({
      kicker: "0. 오리엔테이션 완료",
      title: "이제 길이 시작돼요",
      html: `<p><span class="speaker">카를로</span> “나를 따라 하는 여행이 아니야. 나와 함께 걸으며 예수님을 따라가는 여행이야.”</p><p>오늘 남긴 첫 마음:</p><p class="big-line">“${this.escapeHtml(first)}”</p>`
    });
    await this.ui.storyCard({
      kicker: "ORIGINAL MODE",
      title: "하느님께서는 당신도 단 한 명 만드셨어요",
      html: `<p class="big-line">카를로처럼 보이려고 하지 마세요.</p><p class="big-line">카를로와 함께 걸어보세요.</p><p class="big-line">그리고 예수님을 따라가세요.</p>`,
      actions: [
        { label: "처음 화면으로", value: "title", primary: true },
        { label: "나의 기록 보기", value: "record", primary: false }
      ]
    }).then(async (action) => {
      if (action === "record") {
        const save = this.getSave();
        await this.ui.storyCard({
          kicker: "나의 원본 노트",
          title: "오늘 발견한 것",
          html: `<p><strong>내가 좋아하는 것</strong><br>${(save.interests || []).join(" · ") || "천천히 찾아가는 중"}</p><p><strong>나의 좋은 점</strong><br>${this.escapeHtml(save.note || "아직 모르겠어요")}</p><p><strong>처음 남긴 마음</strong><br>${this.escapeHtml(save.firstAnswer || "아직 모르겠어요")}</p>`
        });
      }
      this.goto("title");
    });
  }

  escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  update(time) {
    if (!this.player || !this.isPlayMode() || this.physics.world.isPaused) return;
    const body = this.player.body;
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) this.lastGroundedAt = time;
    const left = this.controls.state.left;
    const right = this.controls.state.right;
    let speed = this.mode === "notificationRun" ? 330 : 430;
    if (this.mode === "notificationRun") this.player.setVelocityX(260 + (right ? 160 : 0) - (left ? 260 : 0));
    else if (left !== right) this.player.setVelocityX(left ? -speed : speed);
    else this.player.setVelocityX(0);
    if (this.controls.consumeJump() && (grounded || time - this.lastGroundedAt < 120)) {
      this.player.setVelocityY(this.mode === "lookUp" ? -870 : -690);
      this.lastGroundedAt = -1000;
    }
    if (body.velocity.x !== 0) this.player.setFlipX(body.velocity.x < 0);

    if (this.player.y > this.physics.world.bounds.height - 20 && this.mode === "lookUp") this.resetPlayer?.();
    this.findNearby();
    if (this.controls.consumeInteract()) this.handleInteract();
    this.checkStageTriggers();
  }

  findNearby() {
    this.near = null;
    let label = "살펴보기";
    if (this.mode === "copyCity") {
      this.near = this.interactives?.reduce((best, item) => {
        const distance = Math.abs(this.player.x - item.x);
        return distance < 145 && (!best || distance < best.distance) ? { ...item, distance } : best;
      }, null);
      label = this.near ? "대화" : "살펴보기";
    } else if (this.mode === "goodPoints") {
      this.near = this.goodTargets?.reduce((best, item) => {
        const distance = Math.abs(this.player.x - item.x);
        return distance < 145 && (!best || distance < best.distance) ? { ...item, distance } : best;
      }, null);
      label = this.near ? "대화" : "살펴보기";
    } else if (this.mode === "sevenDoors") {
      this.near = this.doors?.reduce((best, item) => {
        const distance = Math.abs(this.player.x - item.x);
        return distance < 105 && (!best || distance < best.distance) ? { ...item, distance } : best;
      }, null);
      label = this.near?.index === 0 ? "문 열기" : "살펴보기";
    }
    this.controls.setInteractLabel(label);
  }

  handleInteract() {
    if (this.mode === "copyCity") this.handleCityInteract(this.near);
    else if (this.mode === "goodPoints") this.talkGoodPoint(this.near);
    else if (this.mode === "sevenDoors" && this.near) {
      if (this.near.index === 0) this.openFirstDoor();
      else this.ui.toast("이 문은 앞으로 하루씩 열릴 거예요.");
    } else this.ui.toast("조금 더 가까이 가보세요.", 1000);
  }

  checkStageTriggers() {
    if (this.mode === "copyFactory") {
      this.factoryGates.forEach((x, index) => {
        if (this.player.x > x && !this.factoryGateDone.has(index)) this.chooseFactory(index);
      });
      if (this.player.x > 4230 && this.factoryGateDone.size >= 3) this.finishFactory();
    }
    if (this.mode === "notificationRun" && this.player.x > 3180) this.finishNotificationRun();
  }
}

export const gameConfig = (scene) => ({
  type: Phaser.AUTO,
  parent: "game-root",
  width: W,
  height: H,
  backgroundColor: "#090b17",
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  render: { pixelArt: true, antialias: false, powerPreference: "high-performance" },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  physics: { default: "arcade", arcade: { gravity: { y: 1650 }, debug: false } },
  input: { activePointers: 4, touch: { capture: true } },
  fps: { target: 60, min: 30, forceSetTimeOut: false },
  scene
});
