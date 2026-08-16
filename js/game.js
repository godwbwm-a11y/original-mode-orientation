import { STAGES, CITY_NPCS, DISCOVERIES, GOOD_NPCS, DOORS } from "../data/orientation.js";
import { writeSave } from "./storage.js";

const W = 900;
const H = 1600;
const FLOOR_Y = H - 230;
const LEGACY_FLOOR_Y = 790;
const Y_SHIFT = FLOOR_Y - LEGACY_FLOOR_Y;
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
    this.carloCompanion = null;
    this.platforms = null;
    this.cursors = null;
    this.lastGroundedAt = 0;
    this.jumpCount = 0;
    this.doubleJumpHintShown = false;
    this.lookUpLight = 0;
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
    this.jumpCount = 0;
    this.physics.world.colliders.destroy();
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.stopFollow();
    this.cameras.main.resetFX();
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

  makeFemaleTexture(key, shirt = 0xa7649f, skin = 0xd39b72, hair = 0x37241f) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(hair).fillRoundedRect(13, 3, 54, 66, 18);
    g.fillStyle(0x222a42).fillRect(20, 78, 15, 25).fillRect(45, 78, 15, 25);
    g.fillStyle(shirt).fillTriangle(40, 38, 8, 84, 72, 84).fillRoundedRect(15, 32, 50, 35, 10);
    g.fillStyle(skin).fillRoundedRect(20, 8, 40, 39, 12);
    g.fillStyle(hair).fillRoundedRect(17, 3, 46, 20, 10).fillRect(14, 15, 9, 48).fillRect(57, 15, 9, 48);
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

  worldY(landscapeY) {
    return landscapeY + Y_SHIFT;
  }

  addGround(width, y = FLOOR_Y, color = 0x31384c) {
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
    this.add.rectangle(width / 2, H / 2, width, H, sky).setDepth(0);
    for (let x = 0; x < width; x += 260) {
      const h = 240 + ((x / 260) % 3) * 70;
      const color = colorful ? [0x42627c, 0x5a597b, 0x3f6a65][(x / 260) % 3] : [0x343846, 0x3d414e, 0x2d3240][(x / 260) % 3];
      this.add.rectangle(x + 130, FLOOR_Y - h / 2, 220, h, color).setDepth(1);
      for (let wy = FLOOR_Y - 210; wy < FLOOR_Y - 55; wy += 58) for (let wx = x + 65; wx < x + 210; wx += 62) {
        this.add.rectangle(wx, wy, 20, 28, colorful ? 0xffd166 : 0x686b74).setAlpha(colorful ? .55 : .28).setDepth(2);
      }
    }
    this.add.circle(Math.max(120, width - 260), 260, 58, colorful ? 0xffe7a3 : 0xaeb1b9, colorful ? .8 : .25).setDepth(1);
  }

  addCarloDayBackdrop(width) {
    this.cameras.main.setBackgroundColor(0x82bde0);
    this.add.rectangle(width / 2, H / 2, width, H, 0x82bde0).setDepth(0);
    this.add.circle(3300, 250, 105, 0xffedaa, .8).setDepth(1);
    const zones = [
      { x: 0, w: 820, color: 0x79b67b, label: "학교 운동장" },
      { x: 820, w: 860, color: 0xd7b77c, label: "학교 앞 거리" },
      { x: 1680, w: 780, color: 0x92bfc3, label: "마을 거리" },
      { x: 2460, w: 700, color: 0xd8c789, label: "광장" },
      { x: 3160, w: width - 3160, color: 0xb8c3dc, label: "성당" }
    ];
    zones.forEach((zone, index) => {
      this.add.rectangle(zone.x + zone.w / 2, FLOOR_Y - 250, zone.w, 500, zone.color, .62).setDepth(1);
      this.addLabel(zone.x + 90, 250, zone.label, { size: "27px", color: "#24324a", originX: 0, strokeWidth: 0, depth: 3 });
      if (index === 0) {
        this.add.rectangle(zone.x + 380, FLOOR_Y - 105, 350, 10, 0xffffff, .7).setDepth(3);
        this.add.rectangle(zone.x + 620, FLOOR_Y - 165, 14, 145, 0xffffff).setDepth(3);
        this.add.rectangle(zone.x + 720, FLOOR_Y - 165, 14, 145, 0xffffff).setDepth(3);
        this.add.rectangle(zone.x + 670, FLOOR_Y - 225, 114, 10, 0xffffff).setDepth(3);
      } else if (index < 3) {
        for (let bx = zone.x + 110; bx < zone.x + zone.w; bx += 260) {
          this.add.rectangle(bx, FLOOR_Y - 220, 190, 330, index === 1 ? 0xcf7f68 : 0x668ba0).setDepth(2);
          this.add.rectangle(bx, FLOOR_Y - 265, 45, 64, 0xffe6a6, .8).setDepth(3);
        }
      } else if (index === 3) {
        this.add.circle(zone.x + 350, FLOOR_Y - 145, 115, 0x74a7c3).setDepth(2);
        this.add.rectangle(zone.x + 350, FLOOR_Y - 105, 260, 30, 0xf2e4c4).setDepth(3);
      } else {
        const cx = zone.x + zone.w * .58;
        this.add.rectangle(cx, FLOOR_Y - 260, 430, 500, 0xe9dfcc).setDepth(2);
        this.add.triangle(cx, FLOOR_Y - 585, 0, 210, 430, 210, 215, 0, 0xb66d5c).setDepth(3);
        this.add.rectangle(cx, FLOOR_Y - 350, 26, 105, 0xd29e42).setDepth(4);
        this.add.rectangle(cx - 40, FLOOR_Y - 310, 106, 170, 0x7d5c4c).setDepth(4);
      }
    });
    for (let x = 160; x < width; x += 410) {
      const cloud = this.add.ellipse(x, 390 + (x % 3) * 55, 190, 60, 0xffffff, .55).setDepth(1);
      this.tweens.add({ targets: cloud, x: x + 80, yoyo: true, repeat: -1, duration: 5000 + x });
    }
  }

  addStars(width = W, height = H, count = 70) {
    for (let i = 0; i < count; i++) {
      const x = (i * 211 + 87) % width;
      const y = (i * 97 + 43) % Math.max(180, height - 160);
      this.add.rectangle(x, y, i % 7 === 0 ? 5 : 3, i % 7 === 0 ? 5 : 3, 0xfff2b4, .45 + (i % 4) * .14).setDepth(1);
    }
  }

  isPlayMode() {
    return ["copyCity", "carloDay", "copyFactory", "goodPoints", "lookUp", "sevenDoors"].includes(this.mode);
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
      this.add.rectangle(x + 45, H - 150, 74, 160 + ((x / 90) % 3) * 70, 0x556074, alpha).setOrigin(.5, 1);
    }
    this.addLabel(W / 2, 400, "복사 모드 감지", { size: "28px", color: "#9aa0b2" });
    await wait(700);
    this.children.list.find((child) => child.text === "복사 모드 감지")?.setVisible(false);
    this.addLabel(W / 2, 550, "ORIGINAL MODE", { size: "68px", color: "#ffd166", strokeWidth: 10 });
    this.addLabel(W / 2, 645, "하느님께서 만드신 나를 찾아가는 7일", { size: "25px", color: "#f7f3df", wrap: 760 });
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
    this.makeFemaleTexture("city-npc-female", 0x8d6a98, 0xc79372, 0x3a2a28);
    this.makePersonTexture("carlo", 0x3b75c4, 0xd39b72, 0x3b271e);
    this.interactives = [];
    CITY_NPCS.forEach((data, index) => {
      const x = 650 + index * 470;
      const npc = this.physics.add.sprite(x, FLOOR_Y - 70, data.female ? "city-npc-female" : "city-npc").setDepth(10).setImmovable(true);
      npc.body.setAllowGravity(false);
      this.addLabel(x, FLOOR_Y - 195, data.name, { size: "24px", color: "#f0e4bc" });
      this.interactives.push({ type: "npc", x, ...data, npc });
    });
    this.add.circle(3450, FLOOR_Y - 50, 25, 0xf4f1df).setStrokeStyle(8, 0x293048).setDepth(9);
    this.add.line(3450, FLOOR_Y - 50, -20, 0, 20, 0, 0x293048, 1).setDepth(10);
    const carlo = this.physics.add.sprite(3800, FLOOR_Y - 76, "carlo").setDepth(10).setImmovable(true);
    carlo.body.setAllowGravity(false);
    this.addLabel(3800, FLOOR_Y - 196, "카를로", { size: "22px", color: "#ffd166" });
    this.interactives.push({ type: "carlo", x: 3800, npc: carlo });
    this.makePlayer(170, FLOOR_Y - 100);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, .12, .12, -100, 0);
    this.setPlay("copyCity", "복사본 도시", "오른쪽으로 걸으며 사람들의 이야기를 들어보세요.", "대화");
    this.ui.toast("공중에서 점프를 한 번 더 누르면 더 높이 뛰어요!", 4200);
  }

  async handleCityInteract(target) {
    if (this.busy || !target) return;
    this.busy = true;
    if (target.type === "npc") {
      await this.ui.storyCard({
        kicker: "복사본 도시의 친구",
        title: target.name,
        html: `<p><span class="speaker">${target.name}</span> “${target.line}”</p><p class="thought-line"><strong>나는 생각했다.</strong><br>‘${target.thought}’</p>`
      });
      this.setPlay("copyCity", "복사본 도시", "오른쪽 끝에서 청바지를 입은 소년을 만나보세요.", "대화");
      this.busy = false;
      return;
    }
    await this.goto("meetCarlo");
  }

  async meetCarloStage() {
    this.checkpoint("meetCarlo");
    this.mode = "meetCarlo";
    this.cameras.main.setBackgroundColor(0x8fd6f2);
    this.add.rectangle(W / 2, H / 2, W, H, 0x8fd6f2).setDepth(0);
    this.add.circle(720, 240, 95, 0xffed9e, .95).setDepth(1);
    [120, 430, 760].forEach((x, i) => {
      const cloud = this.add.ellipse(x, 350 + i * 55, 230, 75, 0xffffff, .8).setDepth(1);
      this.tweens.add({ targets: cloud, x: x + 80, yoyo: true, repeat: -1, duration: 3500 + i * 600 });
    });
    this.add.rectangle(W / 2, FLOOR_Y - 120, W, 370, 0x72b879).setDepth(2);
    this.add.rectangle(W / 2, FLOOR_Y + 45, W, 90, 0x4f7d56).setDepth(3);
    this.add.rectangle(450, FLOOR_Y - 50, 630, 8, 0xffffff, .75).setDepth(4);
    this.add.rectangle(680, FLOOR_Y - 150, 12, 160, 0xffffff).setDepth(4);
    this.add.rectangle(800, FLOOR_Y - 150, 12, 160, 0xffffff).setDepth(4);
    this.add.rectangle(740, FLOOR_Y - 225, 132, 10, 0xffffff).setDepth(4);
    this.makePersonTexture("carlo", 0x3b75c4, 0xd39b72, 0x3b271e);
    this.makePlayerTexture();
    const me = this.add.image(240, FLOOR_Y - 95, "player-custom").setScale(2.05).setDepth(10);
    const ball = this.addLabel(W + 70, FLOOR_Y - 45, "⚽", { size: "64px", strokeWidth: 0, depth: 12 });
    const carlo = this.add.image(W + 180, FLOOR_Y - 95, "carlo").setScale(2.05).setDepth(10);
    this.cameras.main.fadeIn(650, 255, 255, 255);
    await wait(500);
    this.tweens.add({ targets: ball, x: 350, angle: -720, duration: 1200, ease: "Sine.easeOut" });
    await wait(900);
    this.tweens.add({ targets: carlo, x: 685, duration: 780, ease: "Back.easeOut" });
    this.tweens.add({ targets: carlo, y: FLOOR_Y - 112, yoyo: true, repeat: 5, duration: 110 });
    await wait(950);
    const hello = this.addLabel(650, FLOOR_Y - 265, "쪼르륵!", { size: "35px", color: "#fff1ad", depth: 20 }).setScale(.5);
    this.tweens.add({ targets: hello, scale: 1.15, yoyo: true, hold: 450, duration: 220 });
    await wait(650);
    await this.ui.chatCard({
      kicker: "축구공과 함께 찾아온 친구",
      title: "카를로 아쿠티스",
      messages: [
        { from: "me", text: "축구공? 너는 누구야?" },
        { from: "carlo", text: "나는 카를로야. 만나서 반가워!" },
        { from: "me", text: "카를로? 이번 주에 우리 성당에 유해가 온다는 그 카를로 아쿠티스 성인?" },
        { from: "carlo", text: "맞아! 그게 바로 나요! 잇츠 미! 안나오면 쳐들어간다 쿵짜자쿵짜!" },
        { from: "me", text: "성인이 축구도 해?" },
        { from: "carlo", text: "그럼! 나도 축구, 게임, 레고 정말 좋아했어! 이따가 나랑 게임할래?" },
        { from: "me", text: "아니... 그래도 성인이 될 수 있어?" },
        { from: "carlo", text: "이지까까지! 성인이 될 수 있어!" },
        { from: "me", text: "근데 천국은 좋아?" },
        { from: "carlo", text: "엄청 좋아! 너도 꼭 천국에 왔으면 좋겠어!" },
        { from: "me", text: "그럼 나도 너처럼 살아야 해?" },
        { from: "carlo", text: "아니. 내 복사본이 될 필요는 없어! 하느님께서 만들어주신대로 너 자신이 되면 돼." },
        { from: "carlo", text: "나의 평범했던 하루를 함께 걸어볼래? 그 안에서 내가 가장 사랑한 분도 소개해줄게." }
      ],
      button: "카를로와 함께 출발!",
      bright: true
    });
    this.tweens.add({ targets: [me, carlo], x: "+=180", duration: 500 });
    await wait(520);
    this.goto("carloDay");
  }

  async carloDayStage() {
    this.checkpoint("carloDay");
    const width = 4000;
    this.physics.world.setBounds(0, 0, width, H);
    this.cameras.main.setBounds(0, 0, width, H);
    this.addCarloDayBackdrop(width);
    this.addGround(width, FLOOR_Y, 0x57785d);
    [[1320, 620, 330], [2600, 590, 330], [3060, 620, 300], [3680, 680, 280]].forEach(([x, y, w]) => this.addPlatform(x, this.worldY(y), w, 0x8b9c80));
    this.makePlayer(130, FLOOR_Y - 100);
    this.makePersonTexture("carlo", 0x3b75c4, 0xd39b72, 0x3b271e);
    this.carloCompanion = this.add.image(55, FLOOR_Y - 82, "carlo").setDepth(18).setScale(.9);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, .14, .14, -100, 0);
    this.discoverySprites = [];
    const validIds = new Set(DISCOVERIES.map((item) => item.id));
    const savedDiscoveries = (this.getSave().discoveries || []).filter((id) => validIds.has(id));
    if (savedDiscoveries.length !== (this.getSave().discoveries || []).length) this.checkpoint("carloDay", { discoveries: savedDiscoveries });
    const found = new Set(savedDiscoveries);
    for (const item of DISCOVERIES) {
      if (found.has(item.id)) continue;
      const itemY = this.worldY(item.y);
      const glow = this.add.circle(item.x, itemY, 52, 0xffd166, .22).setDepth(10);
      this.tweens.add({ targets: glow, alpha: .06, scale: 1.25, yoyo: true, repeat: -1, duration: 850 });
      const symbol = this.addLabel(item.x, itemY, item.symbol, { size: "54px", strokeWidth: 0, depth: 12 });
      this.physics.add.existing(symbol);
      symbol.body.setAllowGravity(false).setCircle(30);
      symbol.item = item; symbol.glow = glow;
      this.discoverySprites.push(symbol);
      this.physics.add.overlap(this.player, symbol, () => this.collectDiscovery(symbol));
    }
    this.updateDiscoveryHud();
    this.setPlay("carloDay", "카를로의 하루", `카를로와 함께 빛나는 물건 ${DISCOVERIES.length}개를 찾아보세요.`);
    if (found.size >= DISCOVERIES.length) this.finishCarloDay();
  }

  async collectDiscovery(symbol) {
    if (!symbol.active || this.busy) return;
    this.busy = true;
    this.physics.pause();
    const save = this.getSave();
    const validIds = new Set(DISCOVERIES.map((item) => item.id));
    const discoveries = [...new Set([...(save.discoveries || []).filter((id) => validIds.has(id)), symbol.item.id])];
    this.checkpoint("carloDay", { discoveries });
    const item = symbol.item;
    symbol.glow?.destroy(); symbol.disableBody?.(true, true); symbol.destroy();
    this.updateDiscoveryHud();
    await this.ui.storyCard({
      kicker: `${item.place} · 발견 ${discoveries.length}/${DISCOVERIES.length}`,
      title: `${item.symbol} ${item.label}을 찾았어요`,
      html: `<p>${item.note}</p><p class="big-line">${item.detail}</p>`,
      actions: [{ label: ({ ball: "카를로와 축구하기", computer: "함께 빙고하기", rosary: "기도문 퀴즈 시작", homeless: "사랑의 용돈 모으기", church: "성당 이야기 듣기" })[item.id], value: "next", primary: true }]
    });
    if (item.id === "ball") await this.ui.soccerMiniGame();
    else if (item.id === "computer") await this.ui.bingoMiniGame();
    else if (item.id === "rosary") await this.ui.prayerQuizGame();
    else if (item.id === "homeless") await this.ui.choresMiniGame();
    else if (item.id === "church") {
      await this.ui.storyCard({
        kicker: "카를로가 가장 사랑한 만남",
        title: "성체성사 안의 예수님",
        html: `<p><span class="speaker">카를로</span> “나는 미사와 성체성사를 정말 좋아했어. 성체 안에서 살아 계신 예수님을 만날 수 있으니까.”</p><p>카를로는 가능한 날에는 자주 미사에 참여하고 성체조배를 하며 예수님 곁에 머물렀어요.</p><p class="big-line">평범한 하루를 예수님과 함께 살았어요.</p>`
      });
    }
    this.physics.resume();
    this.setPlay("carloDay", "카를로의 하루", `발견 ${discoveries.length}/${DISCOVERIES.length} · 카를로와 밝은 길을 계속 걸어보세요.`);
    this.busy = false;
    if (discoveries.length >= DISCOVERIES.length) await this.finishCarloDay();
  }

  updateDiscoveryHud() {
    const validIds = new Set(DISCOVERIES.map((item) => item.id));
    const count = (this.getSave().discoveries || []).filter((id) => validIds.has(id)).length;
    this.ui.setHud("카를로의 하루", `발견 ${count}/${DISCOVERIES.length} · 카를로와 함께 평범한 하루를 걸어요.`);
  }

  async finishCarloDay() {
    if (this.busy) return;
    this.busy = true;
    await this.ui.storyCard({
      kicker: `${DISCOVERIES.length}가지 발견`,
      title: "카를로도 우리와 비슷했어요",
      html: `<p>축구와 컴퓨터를 즐기고, 부모님을 도와 용돈을 모으고, 도움이 필요한 이웃과 나누었어요.</p><p>기도하며 걸은 그 평범한 하루의 중심에는 성체 안의 예수님이 계셨어요.</p><p class="big-line">성인은 특별한 척하는 사람이 아니라, 평범한 삶에서 사랑을 선택한 사람이에요.</p>`
    });
    this.goto("copyFactory");
  }

  async copyFactoryStage() {
    this.checkpoint("copyFactory");
    this.mode = "copyFactory";
    this.cameras.main.setBackgroundColor(0x233b68);
    this.add.rectangle(W / 2, H / 2, W, H, 0x233b68).setDepth(0);
    ["🌅", "🏫", "🎒", "🌙"].forEach((icon, index) => {
      const tile = this.add.rectangle(175 + (index % 2) * 550, 470 + Math.floor(index / 2) * 510, 320, 330, [0xf6bd60, 0x6ec5e9, 0x8fd694, 0x7669b5][index], .9).setDepth(2).setRotation(index % 2 ? .04 : -.04);
      this.addLabel(tile.x, tile.y, icon, { size: "92px", strokeWidth: 0, depth: 3 });
      this.tweens.add({ targets: tile, y: tile.y - 18, yoyo: true, repeat: -1, duration: 1000 + index * 170 });
    });
    const answers = await this.ui.dayReflectionGame();
    const interests = [...new Set(answers)];
    this.checkpoint("originalNote", { interests, dayReflection: answers });
    await this.ui.storyCard({
      kicker: "나의 하루를 돌아보며",
      title: "완벽한 하루가 아니어도 괜찮아요",
      html: `<p>아침부터 저녁까지 내가 무엇을 좋아하고, 누구를 바라보고, 어떻게 쉬는지 살펴보았어요.</p><p><span class="speaker">카를로</span> “작은 선택 하나에도 예수님을 초대할 수 있어!”</p><p class="big-line">하느님께서는 오늘의 나와 함께 걸으세요.</p>`
    });
    this.goto("originalNote");
  }

  async originalNoteStage() {
    this.checkpoint("originalNote");
    this.cameras.main.setBackgroundColor(0x24344f);
    this.addStars(W, H, 50);
    this.add.rectangle(W / 2, H / 2 + 30, 720, 580, 0xf2e4c4).setStrokeStyle(18, 0x865d3a).setDepth(2);
    this.add.line(W / 2, H / 2 + 30, 0, -280, 0, 280, 0xc29a6b, 1).setDepth(3);
    this.addLabel(W / 2, H / 2 - 240, "나의 원본 노트", { size: "48px", color: "#352314" });
    const interests = this.getSave().interests || [];
    this.addLabel(W / 2, H / 2 - 125, interests.length ? `내가 고른 것: ${interests.join(" · ")}` : "내가 좋아하는 것을 천천히 찾아가요.", { size: "26px", color: "#5a3c26", wrap: 620 });
    const note = await this.ui.inputCard({
      kicker: "나의 원본 노트",
      title: "나에게 있는 좋은 점은 무엇일까?",
      help: "작은 것도 좋아요. 잘 들어주기, 끝까지 해보기, 웃게 해주기… 아직 모르겠어도 괜찮아요.",
      label: "내가 발견한 좋은 점",
      placeholder: "예: 친구 이야기를 잘 들어줘요.",
      value: this.getSave().note || ""
    });
    this.checkpoint("quietChurch", { note });
    await this.ui.storyCard({
      kicker: "저장했어요",
      title: "이 노트는 점수표가 아니에요",
      html: "<p>남과 비교하지 않고, 하느님께서 내게 주신 것을 발견하는 작은 기록이에요.</p>",
      actions: [{ label: "조용한 성당으로", value: "next", primary: true }]
    });
    this.goto("quietChurch");
  }

  async quietChurchStage() {
    this.checkpoint("quietChurch");
    this.mode = "quietChurch";
    this.cameras.main.setBackgroundColor(C.church);
    this.add.rectangle(W / 2, H / 2, W, H, C.church);
    await this.ui.storyCard({
      kicker: "조용한 성당",
      title: "카를로가 성체조배를 하자고 했어요",
      html: `<p><span class="speaker">카를로</span> “우리 잠깐 성체조배를 할래?”</p><p><span class="speaker">나</span> “성체조배가 뭐야?”</p><p><span class="speaker">카를로</span> “감실 안에는 성체가 모셔져 있어. 우리는 그 성체 안에 예수님께서 실제로 계심을 믿어.”</p><p>“어려운 일을 하지 않아도 돼. 예수님을 바라보면 돼. 기쁜 일, 속상한 일, 궁금한 일도 마음으로 이야기해도 괜찮아.”</p>`,
      actions: [{ label: "우리 성당 감실 바라보기", value: "next", primary: true }]
    });
    this.ui.setHud("성체조배", "우리 성당 감실을 바라보며 예수님과 10초 동안 함께 있어요.");
    await this.ui.adorationTimer(10, "말을 하지 않아도 괜찮아요. 성체 안에 계신 예수님을 바라보세요.");
    await this.ui.storyCard({
      kicker: "10초 성체조배 완료",
      title: "카를로가 활짝 웃었어요",
      html: `<p><span class="speaker">카를로</span> “정말 잘했어! 가만히 예수님을 바라본 것도 멋진 기도야.”</p><p>“이번에는 30초 동안 함께 있어볼까? 하고 싶은 이야기가 있으면 마음으로 천천히 말해 봐.”</p>`,
      actions: [{ label: "30초 성체조배 시작", value: "next", primary: true }]
    });
    this.ui.setHud("성체조배", "이번에는 예수님과 30초 동안 더 천천히 머물러요.");
    await this.ui.adorationTimer(30, "예수님께 오늘 있었던 일을 말씀드리거나, 조용히 바라보기만 해도 좋아요.");
    await this.ui.storyCard({
      kicker: "30초 성체조배 완료",
      title: "예수님과 함께 머물렀어요",
      html: `<p><span class="speaker">카를로</span> “대단해! 예수님께서는 네가 찾아온 것을 정말 기뻐하실 거야.”</p><p>카를로는 성체조배를 좋아했고, 성체 안에 계신 예수님을 가장 소중한 친구로 만났어요.</p><p class="big-line">“성체성사는 천국으로 가는 나의 고속도로야.”</p>`
    });
    this.goto("goodPoints");
  }

  async goodPointsStage() {
    this.checkpoint("goodPoints");
    const width = 3000;
    this.physics.world.setBounds(0, 0, width, H);
    this.cameras.main.setBounds(0, 0, width, H);
    this.addCityBackdrop(width, true);
    this.addGround(width, FLOOR_Y, 0x3f5b57);
    this.goodTargets = [];
    for (const data of GOOD_NPCS) {
      const key = `good-${data.id}`;
      this.makePersonTexture(key, data.color);
      const npc = this.physics.add.sprite(data.x, FLOOR_Y - 74, key).setDepth(10).setImmovable(true);
      npc.body.setAllowGravity(false);
      this.addLabel(data.x, FLOOR_Y - 190, data.name, { size: "23px", color: "#fff0b5" });
      this.goodTargets.push({ ...data, npc });
    }
    this.makePlayer(170, FLOOR_Y - 100);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, .14, .14, -100, 0);
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
    const worldH = 4500;
    this.physics.world.setBounds(0, 0, W, worldH);
    this.cameras.main.setBounds(0, 0, W, worldH);
    this.cameras.main.setBackgroundColor(0x11172b);
    const skyBands = [
      [3750, 1500, 0x172039], [2700, 900, 0x294569], [1900, 700, 0x4c79a0],
      [1150, 800, 0x83b6d5], [450, 600, 0xc9e5ef], [100, 300, 0xffedc2]
    ];
    skyBands.forEach(([y, height, color]) => this.add.rectangle(W / 2, y, W, height, color).setDepth(0));
    this.addStars(W, worldH, 170);
    for (let x = 70; x < W; x += 145) {
      const height = 240 + (x % 4) * 55;
      this.add.rectangle(x, 4360 - height / 2, 105, height, 0x202536).setDepth(2);
    }
    const worries = ["비교", "걱정", "성적", "외모", "관계"];
    worries.forEach((word, i) => this.addLabel(90 + i * 180, 4280, word, { size: "30px", color: "#77809d" }));
    const cloudData = [[130, 2450, 260], [700, 2200, 310], [240, 1500, 330], [680, 1060, 350], [210, 640, 390], [650, 380, 320]];
    cloudData.forEach(([x, y, width], i) => {
      const cloud = this.add.ellipse(x, y, width, 95, 0xffffff, .35 + i * .08).setDepth(1);
      this.tweens.add({ targets: cloud, x: x + (i % 2 ? -110 : 110), yoyo: true, repeat: -1, duration: 4200 + i * 520, ease: "Sine.easeInOut" });
    });
    for (let i = 0; i < 7; i += 1) {
      const ray = this.add.rectangle(110 + i * 125, 520, 24, 950, 0xfff2b4, .06).setRotation(-.12 + i * .035).setDepth(1);
      this.tweens.add({ targets: ray, alpha: .15, yoyo: true, repeat: -1, duration: 1300 + i * 110 });
    }
    this.platforms = this.physics.add.staticGroup();
    const platforms = [
      [W / 2, 4380, W], [230, 4160, 400], [670, 3940, 400], [230, 3720, 400],
      [670, 3500, 400], [230, 3280, 400], [670, 3060, 400], [230, 2840, 400],
      [670, 2620, 400], [230, 2180, 400], [670, 1960, 400], [230, 1740, 400],
      [670, 1520, 400], [230, 1080, 400], [670, 860, 400], [230, 640, 400],
      [W / 2, 390, 700]
    ];
    platforms.forEach((p, i) => this.addPlatform(p[0], p[1], p[2], i === 0 ? 0x313a56 : (p[1] < 1800 ? 0xd4dcbf : 0x607b92)));
    this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
    [[450, 2400, 92], [450, 1300, -88]].forEach(([x, y, velocity]) => {
      const moving = this.physics.add.image(x, y, "platform").setTint(y < 1800 ? 0xf1e5b6 : 0x8eacc0).setScale(2.15, 1).setImmovable(true).setVelocityX(velocity).setCollideWorldBounds(true).setBounce(1);
      moving.body.setAllowGravity(false);
      this.movingPlatforms.add(moving);
    });
    this.makePlayer(230, 4250);
    this.player.setMaxVelocity(600, 1200);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.movingPlatforms);
    this.cameras.main.startFollow(this.player, true, .12, .15, 0, 80);
    this.addLabel(W / 2, 4120, "복사본 도시의 걱정을 딛고\n시선을 들어 보세요.", { size: "29px", color: "#d8dfef", wrap: 700 });
    this.addLabel(W / 2, 3650, "2단 점프와 움직이는 구름길을 이용해요!", { size: "34px", color: "#ffd166", wrap: 720 });
    this.lookUpLight = 0;
    const positiveWords = [
      [670, 3860, "희망", "다시 시작할 수 있어요"], [230, 3200, "용기", "한 걸음 내딛어요"],
      [670, 2540, "감사", "작은 선물을 발견해요"], [230, 1660, "사랑", "먼저 손을 내밀어요"],
      [670, 780, "평화", "예수님께 맡겨요"]
    ];
    positiveWords.forEach(([x, y, word, scene]) => {
      const glow = this.add.circle(x, y, 64, 0xffe79a, .28).setDepth(12);
      const token = this.addLabel(x, y, word, { size: "31px", color: "#fff4c7", depth: 14 });
      token.word = word; token.scene = scene; token.glow = glow;
      this.physics.add.existing(token, true); token.body.setSize(130, 80);
      this.physics.add.overlap(this.player, token, () => this.collectLookUpLight(token));
      this.tweens.add({ targets: glow, scale: 1.3, alpha: .08, yoyo: true, repeat: -1, duration: 850 });
    });
    const star = this.add.star(W / 2, 270, 5, 32, 78, 0xffd166).setDepth(10);
    this.physics.add.existing(star, true);
    this.tweens.add({ targets: star, scale: 1.18, alpha: .68, yoyo: true, repeat: -1, duration: 850 });
    this.physics.add.overlap(this.player, star, () => {
      if (this.lookUpLight >= 5) this.finishLookUp();
      else this.ui.toast(`빛을 ${5 - this.lookUpLight}개 더 만나고 올라가요.`, 1200);
    });
    this.resetPlayer = () => { this.player?.setPosition(230, 4250).setVelocity(0, 0); this.jumpCount = 0; };
    this.setPlay("lookUp", "위를 바라봐", "위로 오르며 희망의 빛 5개를 만나보세요. 0/5");
  }

  collectLookUpLight(token) {
    if (!token?.active || this.busy) return;
    const { word, scene, x, y } = token;
    token.glow?.destroy(); token.destroy();
    this.lookUpLight += 1;
    for (let i = 0; i < 8; i += 1) {
      const spark = this.add.star(x, y, 5, 5, 14, i % 2 ? 0xffffff : 0xffd166).setDepth(25);
      const angle = (Math.PI * 2 * i) / 8;
      this.tweens.add({ targets: spark, x: x + Math.cos(angle) * 120, y: y + Math.sin(angle) * 120, alpha: 0, duration: 650, onComplete: () => spark.destroy() });
    }
    this.ui.toast(`${word} — ${scene}`, 1700);
    this.ui.setHud("위를 바라봐", `희망의 빛 ${this.lookUpLight}/5 · 올라갈수록 하늘이 밝아져요.`);
  }

  async finishLookUp() {
    if (this.busy) return;
    this.busy = true;
    this.physics.pause();
    await this.ui.storyCard({
      kicker: "빛이 가득한 곳에서",
      title: "도시는 작아지고 하늘은 밝아졌어요",
      html: `<p>희망, 용기, 감사, 사랑, 평화의 빛을 만나며 여기까지 올라왔어요.</p><p><span class="speaker">카를로</span> “걱정이 없어져야 위를 보는 건 아니야. 걱정을 안고도 예수님께 이야기할 수 있어.”</p><p>하느님 나라는 멀리 도망가는 곳이 아니라, 예수님과 함께 사랑을 선택할 때 이미 시작돼요.</p><p class="big-line">‘내’가 아니라 하느님을 바라봐요!</p>`
    });
    this.goto("sevenDoors");
  }

  async sevenDoorsStage() {
    this.checkpoint("sevenDoors");
    const doorWorldWidth = 1700;
    this.physics.world.setBounds(0, 0, doorWorldWidth, H);
    this.cameras.main.setBounds(0, 0, doorWorldWidth, H);
    this.cameras.main.setBackgroundColor(0x121a38);
    this.add.rectangle(doorWorldWidth / 2, H / 2, doorWorldWidth, H, 0x121a38);
    this.addStars(doorWorldWidth, H, 130);
    this.addGround(doorWorldWidth, FLOOR_Y, 0x283152);
    this.doors = [];
    DOORS.forEach(([day, title], index) => {
      const x = 190 + index * 205;
      const color = index === 0 ? 0xffd166 : 0x505a78;
      const doorY = FLOOR_Y - 140;
      const door = this.add.rectangle(x, doorY, 130, 230, color, index === 0 ? .95 : .65).setStrokeStyle(8, index === 0 ? 0xffefb0 : 0x747d99).setDepth(7);
      this.add.rectangle(x, doorY - 10, 80, 170, index === 0 ? 0x2f4b70 : 0x252b43).setDepth(8);
      this.add.circle(x + 26, doorY, 7, index === 0 ? 0xffd166 : 0x777d90).setDepth(9);
      this.addLabel(x, doorY - 190, day, { size: "20px", color: index === 0 ? "#ffe7a3" : "#a8aec0" });
      this.addLabel(x, doorY - 145, title, { size: "16px", color: index === 0 ? "#ffffff" : "#969caf", wrap: 180 });
      if (index > 0) this.addLabel(x, doorY - 5, "잠김", { size: "17px", color: "#aeb2c0" });
      this.doors.push({ index, x, door });
    });
    this.makePlayer(75, FLOOR_Y - 100);
    this.player.setScale(.8);
    this.player.body.setSize(52, 94).setOffset(14, 10);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, .14, .14, -80, 0);
    const dayList = DOORS.map(([day, title, question, description]) => `<div class="day-item"><strong>${day} · ${title}</strong><small>${description}<br>묵상 질문: ${question}</small></div>`).join("");
    await this.ui.storyCard({
      kicker: "앞으로 이어질 7일",
      title: "매일 새로운 묵상의 문이 열려요",
      html: `<p>앞으로 펼쳐질 일곱 가지 묵상 주제예요.</p><div class="day-list">${dayList}</div><p class="big-line">매일 새로운 게임 링크를 드릴게요. 카를로와 함께 재미있게 묵상해요!</p><p>오늘은 첫째 날의 문만 열려 있어요.</p>`,
      actions: [{ label: "일곱 날을 기대하며 문 앞에 서기", value: "next", primary: true }],
      panelClass: "day-panel"
    });
    this.setPlay("sevenDoors", "7개의 문", "앞으로 7일 동안 하나씩 열릴 거예요. 첫째 날의 문을 살펴보세요.", "문 열기");
  }

  async openFirstDoor() {
    if (this.busy) return;
    this.busy = true;
    await this.ui.storyCard({
      kicker: "앞으로 걸어갈 길",
      title: "7개의 문이 기다리고 있어요",
      html: `<p>매일 보내드리는 링크를 누르면 짧은 게임, 카를로의 이야기, 질문 하나, 현실 미션, 기도가 이어져요.</p><p><strong>첫째 날 · 조종실</strong><br>나를 움직이는 것들을 살펴보고 삶의 주인을 찾아요.</p><p><strong>첫째 날의 질문:</strong> 내 삶의 중심은 무엇일까?</p><p>오늘은 그 길을 시작하기 전, 첫 마음을 남겨볼 거예요.</p>`
    });
    this.goto("firstQuestion");
  }

  async firstQuestionStage() {
    this.checkpoint("firstQuestion");
    this.cameras.main.setBackgroundColor(0x203658);
    this.addStars(W, H, 100);
    this.add.circle(W / 2, H / 2, 220, 0xffd166, .08);
    this.addLabel(W / 2, H / 2, "?", { size: "240px", color: "#ffd166", strokeWidth: 0 });
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
    this.add.rectangle(W / 2, H * .72, W, 10, 0x4f5870).setDepth(2);
    this.add.rectangle(W / 2, H * .6, 120, 160, 0x6d5238).setStrokeStyle(8, 0xd8b46c).setDepth(3);
    this.add.circle(W / 2, H * .6 - 90, 26, 0xffedaa, .8).setDepth(4);
    await this.ui.storyCard({
      kicker: "오리엔테이션 마침기도",
      title: "친구들과 천천히 따라 읽어 보세요",
      html: `<p>잠깐 숨을 고르고 기도할 준비를 해요.</p><p>친구들과 함께라면 한 사람이 한 문장씩 천천히 읽고, 다른 친구들은 마음으로 따라 읽어도 좋아요.</p><p>기도문이 길어도 서두르지 마세요. 화면을 아래로 천천히 내리며 끝까지 읽어 보세요.</p>`,
      actions: [{ label: "마침기도 시작", value: "next", primary: true }]
    });
    await this.ui.storyCard({
      kicker: "천천히 아래로 내려 읽어 보세요",
      title: "예수님, 저와 함께 걸어 주세요",
      html: `<div class="prayer-scroll"><p>사랑하는 예수님,<br>오늘 카를로와 함께 걸으며<br>하느님께서 저를 세상에 하나뿐인 원본으로 만드셨다는 것을 배웠습니다.</p><p>다른 사람의 모습과 가진 것을 부러워하고,<br>잘 보이려고 애쓰며,<br>저 자신을 작게 생각했던 마음을 예수님께 맡깁니다.</p><p>남과 비교하기보다<br>하느님께서 제 안에 심어 주신 좋은 점과 재능을 발견하게 해 주세요.<br>아직 찾지 못했더라도 조급해하지 않고<br>예수님의 눈으로 저를 바라보게 해 주세요.</p><p>제가 좋아하는 게임과 스마트폰과 인터넷을<br>나쁘다고 여기거나 두려워하지 않게 해 주세요.<br>도구가 저를 끌고 가지 않도록 멈출 줄 알고,<br>좋은 일을 위해 자유롭게 사용할 수 있게 해 주세요.</p><p>친구의 좋은 점을 먼저 발견하고<br>따뜻한 말로 전할 용기를 주세요.<br>혼자 있거나 속상해하는 친구에게 다가가고,<br>제가 받은 사랑을 작은 행동으로 나누게 해 주세요.</p><p>걱정 때문에 아래만 바라볼 때<br>고개를 들어 예수님을 찾게 해 주세요.<br>모든 것을 혼자 해결하려 하지 않고<br>기쁨과 슬픔과 두려움을 예수님께 솔직히 이야기하게 해 주세요.</p><p>성체 안에서 저를 기다리시는 예수님,<br>제가 성당에서 예수님을 더 자주 만나고,<br>말없이 함께 머무는 기쁨을 알게 해 주세요.<br>말씀을 읽고 기도하며 매일 예수님과 가까워지게 해 주세요.</p><p>성 카를로 아쿠티스와 함께 걷는 앞으로의 일곱 날 동안<br>카를로의 복사본이 아니라<br>하느님께서 만드신 저 자신으로 살아가게 해 주세요.</p><p>카를로와 함께 걷고,<br>예수님을 따라가며,<br>제 삶의 모든 순간이 사랑을 향하게 해 주세요.</p><p>우리 주 그리스도를 통하여 비나이다.</p><p class="amen">아멘.</p></div>`,
      actions: [{ label: "기도를 다 읽었어요 · 아멘", value: "next", primary: true }],
      panelClass: "prayer-panel"
    });
    this.goto("ending");
  }

  async endingStage() {
    this.mode = "ending";
    const current = this.getSave();
    this.checkpoint("ending", { completed: true });
    this.cameras.main.setBackgroundColor(0x10182f);
    this.addStars(W, H, 130);
    this.add.rectangle(W / 2, H - 220, W, 440, 0x1d3047).setDepth(2);
    const churchX = W * .76;
    this.add.rectangle(churchX, H - 470, 240, 310, 0x4a4051).setDepth(3);
    this.add.triangle(churchX, H - 690, 0, 180, 240, 180, 120, 0, 0x5c4a58).setDepth(4);
    this.add.rectangle(churchX, H - 580, 22, 100, 0xffd166, .82).setDepth(5);
    this.add.rectangle(churchX - 40, H - 540, 56, 90, 0xffdf87, .5).setDepth(5);
    this.makePersonTexture("carlo", 0x3b75c4, 0xd39b72, 0x3b271e);
    this.makePlayerTexture();
    this.add.image(W * .34, H - 300, "player-custom").setDepth(8);
    this.add.image(W * .49, H - 300, "carlo").setDepth(8);
    const first = current.firstAnswer || "아직 모르겠어요";
    await this.ui.storyCard({
      kicker: "0. 오리엔테이션 완료",
      title: "이제 길이 시작돼요",
      html: `<p><span class="speaker">카를로</span> “나를 따라 하는 여행이 아니야. 나와 함께 걸으며 예수님을 따라가는 여행이야.”</p><p>오늘 남긴 첫 마음:</p><p class="big-line">“${this.escapeHtml(first)}”</p>`
    });
    const next = await this.ui.storyCard({
      kicker: "ORIGINAL MODE",
      title: "하느님께서는 당신도 단 한 명 만드셨어요",
      html: `<p class="big-line">카를로처럼 보이려고 하지 마세요.</p><p class="big-line">카를로와 함께 걸어보세요.</p><p class="big-line">그리고 예수님을 따라가세요.</p>`,
      actions: [
        { label: "카를로의 마지막 말", value: "quote", primary: true },
        { label: "나의 기록 먼저 보기", value: "record", primary: false }
      ]
    });
    if (next === "record") {
      const save = this.getSave();
      await this.ui.storyCard({
        kicker: "나의 원본 노트",
        title: "오늘 발견한 것",
        html: `<p><strong>내가 좋아하는 것</strong><br>${(save.interests || []).join(" · ") || "천천히 찾아가는 중"}</p><p><strong>나의 좋은 점</strong><br>${this.escapeHtml(save.note || "아직 모르겠어요")}</p><p><strong>처음 남긴 마음</strong><br>${this.escapeHtml(save.firstAnswer || "아직 모르겠어요")}</p>`,
        actions: [{ label: "카를로의 마지막 말", value: "quote", primary: true }]
      });
    }
    const finalAction = await this.ui.storyCard({
      kicker: "성 카를로 아쿠티스의 말",
      title: "“모든 사람은 원본으로 태어나지만 많은 사람은 복사본으로 죽습니다.”",
      html: `<p>다른 사람의 복사본이 아니라, 하느님께서 만드신 나로 살아가요.</p><p class="big-line">카를로와 함께 걷고, 예수님을 따라가요.</p>`,
      actions: [
        { label: "다시 처음부터 시작", value: "restart", primary: true },
        { label: "처음 화면으로", value: "title", primary: false }
      ]
    });
    if (finalAction === "restart") {
      localStorage.removeItem("original-mode-orientation-v1");
      window.location.reload();
    } else this.goto("title");
  }

  escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  update(time) {
    if (!this.player || !this.isPlayMode() || this.physics.world.isPaused) return;
    const body = this.player.body;
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) {
      this.lastGroundedAt = time;
      this.jumpCount = 0;
    }
    const left = this.controls.state.left;
    const right = this.controls.state.right;
    const speed = 430;
    if (left !== right) this.player.setVelocityX(left ? -speed : speed);
    else this.player.setVelocityX(0);
    if (this.controls.consumeJump()) {
      if (grounded || time - this.lastGroundedAt < 120) {
        this.player.setVelocityY(this.mode === "lookUp" ? -780 : -690);
        this.jumpCount = 1;
        this.lastGroundedAt = -1000;
      } else if (this.jumpCount === 1) {
        this.player.setVelocityY(this.mode === "lookUp" ? -930 : -840);
        this.jumpCount = 2;
        this.tweens.add({ targets: this.player, scaleX: this.player.scaleX * 1.14, scaleY: this.player.scaleY * .88, yoyo: true, duration: 90 });
        if (!this.doubleJumpHintShown) {
          this.doubleJumpHintShown = true;
          this.ui.toast("2단 점프! 공중에서 한 번 더 높이 뛰었어요.", 1500);
        }
      }
    }
    if (body.velocity.x !== 0) this.player.setFlipX(body.velocity.x < 0);
    if (this.mode === "carloDay" && this.carloCompanion?.active) {
      const direction = body.velocity.x < -5 ? 1 : -1;
      const targetX = this.player.x + direction * 95;
      const targetY = this.player.y + 18 + Math.sin(time / 150) * 5;
      this.carloCompanion.x = Phaser.Math.Linear(this.carloCompanion.x, targetX, .09);
      this.carloCompanion.y = Phaser.Math.Linear(this.carloCompanion.y, targetY, .12);
      this.carloCompanion.setFlipX(direction > 0);
    }

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
    // 각 장면의 완료 조건은 해당 미니게임 안에서 처리합니다.
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
