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
    this.adoration = $("#adoration-card");
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
    for (const panel of [this.story, this.choice, this.input, this.avatar, this.menu, this.adoration]) panel.classList.add("is-hidden");
  }

  resetStoryStyle() {
    this.story.classList.remove("cinema-chat", "bright-chat", "prayer-panel", "day-panel", "mini-game-panel", "flash-game-panel");
  }

  storyCard({ kicker = "", title, html, actions = [{ label: "계속", value: "next", primary: true }], panelClass = "" }) {
    this.setPlayMode(false);
    this.hidePanels();
    this.resetStoryStyle();
    if (panelClass) this.story.classList.add(panelClass);
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

  chatCard({ kicker = "새로운 대화", title = "카를로", messages, button = "카를로의 하루로", bright = false }) {
    this.setPlayMode(false);
    this.hidePanels();
    this.resetStoryStyle();
    this.story.classList.add("cinema-chat");
    if (bright) this.story.classList.add("bright-chat");
    $("#story-kicker").textContent = kicker;
    $("#story-title").textContent = title;
    const body = $("#story-body");
    body.innerHTML = '<div class="chat-status"><span class="online-dot"></span> 지금 함께 걷는 중</div><div class="chat-thread" aria-live="polite"></div>';
    const thread = body.querySelector(".chat-thread");
    const wrap = $("#story-actions");
    wrap.replaceChildren();
    this.story.classList.remove("is-hidden");
    return new Promise((resolve) => {
      let index = 0;
      const showNext = () => {
        if (index >= messages.length) {
          const next = document.createElement("button");
          next.type = "button";
          next.className = "primary-button chat-next";
          next.textContent = button;
          next.addEventListener("click", () => { this.story.classList.add("is-hidden"); this.resetStoryStyle(); resolve("next"); }, { once: true });
          wrap.append(next);
          next.focus({ preventScroll: true });
          return;
        }
        const message = messages[index++];
        const typing = document.createElement("div");
        typing.className = `chat-bubble ${message.from === "me" ? "from-me" : "from-carlo"} is-typing`;
        typing.textContent = "•••";
        thread.append(typing);
        thread.scrollTop = thread.scrollHeight;
        setTimeout(() => {
          typing.classList.remove("is-typing");
          typing.innerHTML = `<small>${message.from === "me" ? "나" : "카를로"}</small>${message.text}`;
          thread.scrollTop = thread.scrollHeight;
          setTimeout(showNext, Math.min(1300, 500 + message.text.length * 18));
        }, message.from === "me" ? 320 : 620);
      };
      showNext();
    });
  }

  footballMiniGame() {
    this.setPlayMode(false);
    this.hidePanels();
    this.resetStoryStyle();
    this.story.classList.add("mini-game-panel");
    $("#story-kicker").textContent = "축구공 미니게임";
    $("#story-title").textContent = "카를로의 슛을 막아라!";
    const body = $("#story-body");
    body.innerHTML = `<p class="game-instruction">먼저 골키퍼가 되어 카를로의 공을 세 번 막아 보세요.</p><div class="football-field"><div class="football-goal"><span></span><span></span><span></span></div><div class="football-carlo">카를로<br>⚽</div><div class="football-player">🙌<br>나</div></div><p class="game-result" aria-live="polite">카를로: “어디로 찰지 잘 봐!”</p><div class="direction-buttons"><button type="button" data-dir="왼쪽">◀ 왼쪽</button><button type="button" data-dir="가운데">● 가운데</button><button type="button" data-dir="오른쪽">오른쪽 ▶</button></div>`;
    const wrap = $("#story-actions");
    wrap.replaceChildren();
    const exit = document.createElement("button");
    exit.type = "button"; exit.className = "secondary-button"; exit.textContent = "여기까지 하고 나가기";
    wrap.append(exit);
    this.story.classList.remove("is-hidden");
    return new Promise((resolve) => {
      let phase = "defend"; let round = 0; let saves = 0; let goals = 0; let locked = false;
      const instruction = body.querySelector(".game-instruction");
      const result = body.querySelector(".game-result");
      const player = body.querySelector(".football-player");
      const carlo = body.querySelector(".football-carlo");
      const dirs = ["왼쪽", "가운데", "오른쪽"];
      const finish = () => {
        body.querySelector(".direction-buttons").classList.add("is-hidden");
        instruction.textContent = `선방 ${saves}번 · 골 ${goals}번! 결과보다 함께 웃고 뛴 시간이 더 소중해요.`;
        result.textContent = "카를로: “재밌다! 한 판 더 할래?”";
        wrap.replaceChildren();
        const replay = document.createElement("button"); replay.type = "button"; replay.className = "secondary-button"; replay.textContent = "한 판 더";
        const done = document.createElement("button"); done.type = "button"; done.className = "primary-button"; done.textContent = "하루 탐색 계속하기";
        replay.onclick = () => { this.story.classList.add("is-hidden"); this.resetStoryStyle(); resolve({ replay: true }); };
        done.onclick = () => { this.story.classList.add("is-hidden"); this.resetStoryStyle(); resolve({ replay: false }); };
        wrap.append(replay, done);
      };
      const choose = (direction) => {
        if (locked) return;
        locked = true;
        const other = dirs[Math.floor(Math.random() * dirs.length)];
        if (phase === "defend") {
          player.dataset.move = direction;
          const saved = direction === other; if (saved) saves += 1;
          result.textContent = saved ? `막았다! 카를로가 ${other}으로 찼어요. (${round + 1}/3)` : `골! 카를로가 ${other}으로 찼어요. (${round + 1}/3)`;
        } else {
          carlo.dataset.move = other;
          const scored = direction !== other; if (scored) goals += 1;
          result.textContent = scored ? `골! 나는 ${direction}, 카를로는 ${other}! (${round + 1}/3)` : `카를로가 막았다! 둘 다 ${direction}! (${round + 1}/3)`;
        }
        round += 1;
        setTimeout(() => {
          player.removeAttribute("data-move"); carlo.removeAttribute("data-move"); locked = false;
          if (round < 3) return;
          if (phase === "defend") {
            phase = "attack"; round = 0;
            $("#story-title").textContent = "이번에는 내가 슛!";
            instruction.textContent = "이제 공수를 바꿔요. 찰 방향을 골라 카를로의 수비를 피해 보세요.";
            result.textContent = "카를로: “이번엔 내가 막는다! 살살 차 줘!”";
          } else finish();
        }, 620);
      };
      body.querySelectorAll("[data-dir]").forEach((button) => button.addEventListener("click", () => choose(button.dataset.dir)));
      exit.onclick = () => { this.story.classList.add("is-hidden"); this.resetStoryStyle(); resolve({ replay: false, exited: true }); };
    });
  }

  async soccerMiniGame() {
    let again = true;
    while (again) {
      const result = await this.footballMiniGame();
      again = Boolean(result.replay);
    }
  }

  bingoMiniGame() {
    this.setPlayMode(false); this.hidePanels(); this.resetStoryStyle(); this.story.classList.add("mini-game-panel");
    $("#story-kicker").textContent = "컴퓨터 미니게임"; $("#story-title").textContent = "카를로와 함께 빙고!";
    const body = $("#story-body");
    const tiles = ["💻 코딩", "🌐 인터넷", "🎮 게임", "📷 사진", "🎵 음악", "🧱 레고", "⚽ 축구", "🙏 기도", "🤝 도움"];
    body.innerHTML = `<p class="game-instruction">한 칸을 고르면 카를로도 한 칸을 골라요. 둘이 힘을 합쳐 한 줄을 완성하세요!</p><div class="bingo-grid">${tiles.map((tile, i) => `<button type="button" data-cell="${i}">${tile}</button>`).join("")}</div><p class="game-result" aria-live="polite">나부터 한 칸을 골라요.</p>`;
    const wrap = $("#story-actions"); wrap.replaceChildren();
    const exit = document.createElement("button"); exit.type = "button"; exit.className = "secondary-button"; exit.textContent = "빙고를 마치고 나가기"; wrap.append(exit);
    this.story.classList.remove("is-hidden");
    return new Promise((resolve) => {
      const marked = new Set(); const result = body.querySelector(".game-result");
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      const hasBingo = () => lines.some((line) => line.every((cell) => marked.has(cell)));
      const mark = (index, who) => {
        marked.add(index);
        const button = body.querySelector(`[data-cell="${index}"]`); button.classList.add(who); button.disabled = true;
      };
      const complete = () => {
        result.textContent = "빙고! 카를로: “컴퓨터도 함께 좋은 일을 할 때 더 재미있어!”";
        wrap.replaceChildren();
        const done = document.createElement("button"); done.type = "button"; done.className = "primary-button"; done.textContent = "하루 탐색 계속하기";
        done.onclick = () => { this.story.classList.add("is-hidden"); this.resetStoryStyle(); resolve(true); }; wrap.append(done);
      };
      body.querySelectorAll("[data-cell]").forEach((button) => button.addEventListener("click", () => {
        const index = Number(button.dataset.cell); mark(index, "picked-me");
        if (hasBingo()) { complete(); return; }
        const preferred = [4,0,8,2,6,1,3,5,7].find((cell) => !marked.has(cell));
        if (preferred !== undefined) mark(preferred, "picked-carlo");
        if (hasBingo()) complete(); else result.textContent = "카를로도 파란 칸을 골랐어요. 다음 칸을 골라요!";
      }));
      exit.onclick = () => { this.story.classList.add("is-hidden"); this.resetStoryStyle(); resolve(false); };
    });
  }

  prayerQuizGame() {
    this.setPlayMode(false); this.hidePanels(); this.resetStoryStyle(); this.story.classList.add("mini-game-panel");
    $("#story-kicker").textContent = "묵주 미니게임"; $("#story-title").textContent = "기도문 빈칸 채우기";
    const body = $("#story-body"); const wrap = $("#story-actions"); wrap.replaceChildren();
    const questions = [
      { prayer: "주님의 기도", text: "아버지의 이름이 ___ 빛나시며", answer: "거룩히", options: ["거룩히", "환하게", "높이"], hint: "‘거’로 시작하고, 하느님께 드리는 공경을 뜻해요." },
      { prayer: "주님의 기도", text: "아버지의 ___가 오시며", answer: "나라", options: ["나라", "목소리", "천사"], hint: "예수님께서 선포하신 하느님의 ○○예요." },
      { prayer: "주님의 기도", text: "오늘 저희에게 일용할 ___을 주시고", answer: "양식", options: ["양식", "선물", "시간"], hint: "매일 살아가는 데 필요한 먹을거리와 은총을 뜻해요." },
      { prayer: "성모송", text: "은총이 가득하신 ___님, 기뻐하소서!", answer: "마리아", options: ["마리아", "엘리사벳", "안나"], hint: "예수님의 어머니 이름이에요." },
      { prayer: "성모송", text: "태중의 아들 ___님 또한 복되시나이다", answer: "예수", options: ["예수", "요셉", "요한"], hint: "우리를 구원하신 하느님의 아드님이에요." },
      { prayer: "성모송", text: "저희 죄인을 위하여 ___주소서", answer: "빌어", options: ["빌어", "말해", "웃어"], hint: "성모님께 전구를 청하는 말이에요." }
    ];
    let index = 0;
    this.story.classList.remove("is-hidden");
    return new Promise((resolve) => {
      const render = () => {
        if (index >= questions.length) {
          body.innerHTML = `<p class="prayer-complete">기도문 두 개를 모두 완성했어요!</p><p>카를로: “틀려도 다시 읽고 배우면 돼. 기도는 시험이 아니라 예수님과 이야기하는 시간이야.”</p><div class="prayer-review"><strong>주님의 기도</strong><p>하늘에 계신 우리 아버지, 아버지의 이름이 거룩히 빛나시며 아버지의 나라가 오시며 아버지의 뜻이 하늘에서와 같이 땅에서도 이루어지소서. 오늘 저희에게 일용할 양식을 주시고 저희에게 잘못한 일을 저희가 용서하오니 저희 죄를 용서하시고 저희를 유혹에 빠지지 않게 하시고 악에서 구하소서. 아멘.</p><strong>성모송</strong><p>은총이 가득하신 마리아님, 기뻐하소서! 주님께서 함께 계시니 여인 중에 복되시며 태중의 아들 예수님 또한 복되시나이다. 천주의 성모 마리아님, 이제와 저희 죽을 때에 저희 죄인을 위하여 빌어주소서. 아멘.</p></div>`;
          wrap.replaceChildren(); const done = document.createElement("button"); done.type = "button"; done.className = "primary-button"; done.textContent = "하루 탐색 계속하기";
          done.onclick = () => { this.story.classList.add("is-hidden"); this.resetStoryStyle(); resolve(true); }; wrap.append(done); return;
        }
        const q = questions[index];
        body.innerHTML = `<p class="quiz-count">${q.prayer} · ${index + 1}/${questions.length}</p><p class="prayer-blank">${q.text}</p><div class="quiz-options">${q.options.map((option) => `<button type="button">${option}</button>`).join("")}</div><p class="quiz-hint" aria-live="polite">알맞은 말을 골라 보세요.</p>`;
        body.querySelectorAll(".quiz-options button").forEach((button) => button.addEventListener("click", () => {
          if (button.textContent === q.answer) {
            button.classList.add("is-correct"); body.querySelector(".quiz-hint").textContent = `정답! 카를로: “좋아, ${q.answer}!”`;
            body.querySelectorAll(".quiz-options button").forEach((item) => item.disabled = true);
            setTimeout(() => { index += 1; render(); }, 650);
          } else {
            button.classList.add("is-wrong"); body.querySelector(".quiz-hint").textContent = `카를로의 힌트: ${q.hint}`;
          }
        }));
      };
      render();
    });
  }

  choresMiniGame() {
    this.setPlayMode(false); this.hidePanels(); this.resetStoryStyle(); this.story.classList.add("flash-game-panel");
    $("#story-kicker").textContent = "사랑의 용돈 미니게임"; $("#story-title").textContent = "부모님을 도와 용돈을 모아라!";
    const body = $("#story-body"); const wrap = $("#story-actions"); wrap.replaceChildren();
    const chores = [
      ["🧦", "양말 짝 맞추기", "카를로: “양말 한 짝은 또 어디로 여행 간 거지?”"],
      ["🍽️", "설거지 산 정복", "카를로: “접시가 미끄럽다! 비누 거품 공격!”"],
      ["🧹", "먼지 괴물 잡기", "카를로: “소파 밑 먼지 왕국을 발견했다!”"],
      ["♻️", "분리배출 척척", "카를로: “페트병아, 모자를 벗어라!”"]
    ];
    body.innerHTML = `<p>할 일을 눌러 부모님을 도와드려요. 네 가지를 마치면 사랑의 용돈이 모여요.</p><div class="coin-meter">사랑의 용돈 <strong>0</strong>/4 🪙</div><div class="chore-grid">${chores.map(([icon,label],i)=>`<button type="button" data-chore="${i}"><span>${icon}</span>${label}</button>`).join("")}</div><p class="game-result" aria-live="polite">카를로: “좋아, 일을 시작해 볼까?”</p>`;
    const exit = document.createElement("button"); exit.type = "button"; exit.className = "secondary-button"; exit.textContent = "여기까지 하고 나가기"; wrap.append(exit);
    this.story.classList.remove("is-hidden");
    return new Promise((resolve) => {
      let doneCount = 0; const result = body.querySelector(".game-result");
      body.querySelectorAll("[data-chore]").forEach((button) => button.addEventListener("click", () => {
        if (button.disabled) return; button.disabled = true; button.classList.add("is-done"); doneCount += 1;
        const chore = chores[Number(button.dataset.chore)]; result.textContent = `${chore[2]} 용돈 한 닢 획득!`;
        body.querySelector(".coin-meter strong").textContent = doneCount;
        if (doneCount < chores.length) return;
        setTimeout(() => {
          body.innerHTML = `<div class="donation-scene"><span>🪙🪙🪙🪙</span><span>➡️</span><span>🛏️ 🥖 🧃</span></div><p>카를로는 모은 용돈으로 노숙자가 덮을 이불을 사고 빵과 음료수를 나누었어요.</p><p class="big-line">작은 도움도 사랑이 되면 아주 따뜻해져요.</p>`;
          wrap.replaceChildren(); const next = document.createElement("button"); next.type = "button"; next.className = "primary-button"; next.textContent = "하루 탐색 계속하기";
          next.onclick = () => { this.story.classList.add("is-hidden"); this.resetStoryStyle(); resolve(true); }; wrap.append(next);
        }, 600);
      }));
      exit.onclick = () => { this.story.classList.add("is-hidden"); this.resetStoryStyle(); resolve(false); };
    });
  }

  dayReflectionGame() {
    this.setPlayMode(false); this.hidePanels(); this.resetStoryStyle(); this.story.classList.add("flash-game-panel");
    $("#story-kicker").textContent = "플래시 게임처럼 돌아보는"; $("#story-title").textContent = "나의 하루";
    const body = $("#story-body"); const wrap = $("#story-actions"); wrap.replaceChildren();
    const moments = [
      { icon: "🌅", title: "아침", prompt: "하루를 어떻게 시작하고 싶나요?", options: ["기지개 켜기", "짧게 기도하기", "아침밥 먹기", "조금 더 자기"] },
      { icon: "🏫", title: "학교", prompt: "학교에서 마음이 가는 것은?", options: ["친구와 웃기", "공부에 집중하기", "혼자 쉬기", "힘든 친구 살피기"] },
      { icon: "🎒", title: "방과 후", prompt: "시간 가는 줄 모르고 하는 것은?", options: ["게임", "운동", "컴퓨터", "음악·그림"] },
      { icon: "🌙", title: "저녁", prompt: "오늘 하루를 어떻게 마치고 싶나요?", options: ["가족 돕기", "성경 읽기", "성당 가기", "기도하고 쉬기"] }
    ];
    let index = 0; const answers = [];
    this.story.classList.remove("is-hidden");
    return new Promise((resolve) => {
      const render = () => {
        if (index >= moments.length) {
          body.innerHTML = `<div class="day-summary">${moments.map((moment,i)=>`<div><span>${moment.icon}</span><strong>${moment.title}</strong><small>${answers[i]}</small></div>`).join("")}</div><p>카를로: “하루는 작은 선택들로 만들어져. 완벽하지 않아도 괜찮아. 예수님과 다시 시작하면 돼!”</p>`;
          wrap.replaceChildren(); const done = document.createElement("button"); done.type = "button"; done.className = "primary-button"; done.textContent = "나의 하루 저장하기";
          done.onclick = () => { this.story.classList.add("is-hidden"); this.resetStoryStyle(); resolve(answers); }; wrap.append(done); return;
        }
        const moment = moments[index];
        body.innerHTML = `<div class="flash-window"><div class="flash-progress"><span style="width:${(index / moments.length) * 100}%"></span></div><div class="moment-icon">${moment.icon}</div><h3>${moment.title}</h3><p>${moment.prompt}</p><div class="moment-options">${moment.options.map((option)=>`<button type="button">${option}</button>`).join("")}</div><small>정답은 없어요. 지금 마음에 가까운 것을 골라요.</small></div>`;
        body.querySelectorAll(".moment-options button").forEach((button) => button.addEventListener("click", () => { answers.push(button.textContent); index += 1; render(); }));
      };
      render();
    });
  }

  adorationTimer(seconds, guide) {
    this.setPlayMode(false); this.hidePanels();
    $("#adoration-guide").textContent = guide;
    const secondsNode = $("#adoration-seconds"); const bar = $("#adoration-progress-bar");
    secondsNode.textContent = seconds; bar.style.width = "0%"; this.adoration.classList.remove("is-hidden");
    return new Promise((resolve) => {
      const started = performance.now();
      const tick = () => {
        const elapsed = (performance.now() - started) / 1000;
        const remaining = Math.max(0, seconds - elapsed);
        secondsNode.textContent = String(Math.ceil(remaining)); bar.style.width = `${Math.min(100, elapsed / seconds * 100)}%`;
        if (remaining <= 0) { secondsNode.textContent = "고요"; bar.style.width = "100%"; setTimeout(() => { this.adoration.classList.add("is-hidden"); resolve(); }, 650); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
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
