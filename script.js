const FRUITS = [
  { k: "grape", n: "葡萄", e: "🍇" },
  { k: "banana", n: "香蕉", e: "🍌" },
  { k: "peach", n: "水蜜桃", e: "🍑" },
  { k: "apple", n: "蘋果", e: "🍎" },
  { k: "orange", n: "橘子", e: "🍊" },
  { k: "blueberry", n: "藍莓", e: "🫐" },
  { k: "pineapple", n: "鳳梨", e: "🍍" },
  { k: "mango", n: "芒果", e: "🥭" },
  { k: "strawberry", n: "草莓", e: "🍓" },
  { k: "watermelon", n: "西瓜", e: "🍉" },
  { k: "kiwi", n: "奇異果", e: "🥝" },
  { k: "cherry", n: "櫻桃", e: "🍒" },
  { k: "lemon", n: "檸檬", e: "🍋" },
  { k: "avocado", n: "酪梨", e: "🥑" },
  { k: "coconut", n: "椰子", e: "🥥" },
  { k: "melon", n: "哈密瓜", e: "🍈" }
];

const Core = globalThis.GameCore;
const STORAGE_KEY = "fruit-bingo-state-v1";

const state = {
  size: 3,
  mode: "pvp",
  target: 3,
  p1Name: "玩家1",
  p2Name: "玩家2",
  pvcOrder: "player_first",
  hideCpu: false,
  p1Placement: "manual",
  p2Placement: "manual",
  view: "both",
  phase: "idle",
  setupPlayer: 1,
  selectedFruit: null,
  lastCalledFruit: null,
  setup: { 1: [], 2: [] },
  boards: { 1: [], 2: [] },
  marks: { 1: [], 2: [] },
  called: new Set(),
  series: { 1: 0, 2: 0 },
  step: 0,
  firstToTarget: { 1: null, 2: null },
  bestOfThree: false,
  lastView: "",
  cpuTimer: null
};

const ui = {
  mode: gid("mode"),
  p1Name: gid("p1Name"),
  p2Name: gid("p2Name"),
  pvcOrder: gid("pvcOrder"),
  hideCpu: gid("hideCpuBoard"),
  boardSize: gid("boardSize"),
  target: gid("targetLines"),
  p1Placement: gid("p1Placement"),
  p2Placement: gid("p2Placement"),
  view: gid("boardViewMode"),
  bestOfThree: gid("bestOfThree"),
  start: gid("startBtn"),
  quickStart: gid("quickStartBtn"),
  reset: gid("resetSeriesBtn"),
  clearSettings: gid("clearSettingsBtn"),
  p2NameLabel: gid("p2NameLabel"),
  phase: gid("phaseLabel"),
  line: gid("lineLabel"),
  series: gid("seriesLabel"),
  notice: gid("notice"),
  setupPanel: gid("setupPanel"),
  setupHint: gid("setupHint"),
  palette: gid("fruitPalette"),
  setupBoard: gid("setupBoard"),
  confirm: gid("confirmSetupBtn"),
  play: gid("playPanel"),
  p1Board: gid("p1Board"),
  p2Board: gid("p2Board"),
  p1Card: gid("p1Card"),
  p2Card: gid("p2Card"),
  p1Title: gid("p1Title"),
  p2Title: gid("p2Title"),
  p1Lines: gid("p1Lines"),
  p2Lines: gid("p2Lines"),
  toast: gid("resultToast"),
  share: gid("shareBtn"),
  install: gid("installBtn")
};

let audioContext;
let installPromptEvent = null;

function gid(id) {
  return document.getElementById(id);
}

function safeText(value, fallback) {
  return (value || fallback).trim() || fallback;
}

function init() {
  bindEvents();
  restorePersistentState();
  syncTargetInput();
  updateModeOptions();
  renderPersistentLabels();
  setPhase("等待開始");
  drawPlayBoards();
  bindInstallPrompt();
  registerServiceWorker();
}

function bindEvents() {
  ui.start.onclick = startGame;
  ui.quickStart.onclick = startGame;
  ui.confirm.onclick = confirmSetup;
  ui.reset.onclick = resetSeries;
  ui.clearSettings.onclick = clearSettings;
  ui.mode.onchange = handleModeChange;
  ui.boardSize.onchange = () => {
    syncTargetInput();
    persistState();
  };
  ui.p1Name.onchange = persistSettingsFromControls;
  ui.p2Name.onchange = persistSettingsFromControls;
  ui.pvcOrder.onchange = persistSettingsFromControls;
  ui.hideCpu.onchange = persistSettingsFromControls;
  ui.p1Placement.onchange = persistSettingsFromControls;
  ui.p2Placement.onchange = persistSettingsFromControls;
  ui.view.onchange = persistSettingsFromControls;
  ui.bestOfThree.onchange = persistSettingsFromControls;
  ui.share.onclick = shareGame;
  ui.install.onclick = installGame;
  ui.target.onchange = () => {
    syncTargetInput();
    persistState();
  };
  window.addEventListener("resize", handleResize);
}

function handleModeChange() {
  if (ui.mode.value === "pvc") ui.p2Placement.value = "random";
  updateModeOptions();
  renderPersistentLabels();
  persistState();
}

function updateModeOptions() {
  const isPvp = ui.mode.value === "pvp";
  const p2PlacementWrap = gid("p2PlacementWrap");
  const pvcOrderWrap = gid("pvcOrderWrap");
  const hideCpuWrap = gid("hideCpuWrap");

  document.body.classList.toggle("mode-pvc", !isPvp);
  if (p2PlacementWrap) p2PlacementWrap.classList.toggle("hidden", !isPvp);
  if (pvcOrderWrap) pvcOrderWrap.classList.toggle("hidden", isPvp);
  if (hideCpuWrap) hideCpuWrap.classList.toggle("slot-hidden", isPvp);

  ui.p2Placement.disabled = !isPvp;
  ui.pvcOrder.disabled = isPvp;
  ui.hideCpu.disabled = isPvp;
}

function startGame() {
  clearCpuTimer();
  syncStateFromControls();
  resetRoundState();
  updateBoardTitles();
  note("");
  setupEmptyBoards();
  seedRandomBoardsIfNeeded();

  if (state.p1Placement === "random" && state.p2Placement === "random") {
    state.boards[1] = state.setup[1].slice();
    state.boards[2] = state.setup[2].slice();
    beginPlayPhase();
    return;
  }

  state.phase = "setup";
  ui.setupPanel.classList.remove("hidden");
  advanceSetupPlayer();
  persistState();
}

function syncStateFromControls() {
  state.size = +ui.boardSize.value;
  state.mode = ui.mode.value;
  state.target = Core.clampTarget(state.size, +ui.target.value || 3);
  ui.target.value = state.target;
  state.p1Placement = ui.p1Placement.value;
  state.p2Placement = state.mode === "pvc" ? "random" : ui.p2Placement.value;
  state.pvcOrder = ui.pvcOrder.value;
  state.hideCpu = ui.hideCpu.checked;
  state.view = ui.view.value;
  state.bestOfThree = ui.bestOfThree.checked;
  state.p1Name = safeText(ui.p1Name.value, "玩家1");
  state.p2Name = safeText(ui.p2Name.value, state.mode === "pvc" ? "電腦" : "玩家2");
  ui.target.max = Core.maxPossibleLines(state.size);
  persistSettingsToControls();
}

function persistSettingsFromControls() {
  syncStateFromControls();
  renderPersistentLabels();
  persistState();
}

function persistSettingsToControls() {
  ui.mode.value = state.mode;
  ui.boardSize.value = String(state.size);
  ui.target.value = state.target;
  ui.p1Placement.value = state.p1Placement;
  ui.p2Placement.value = state.mode === "pvc" ? "random" : state.p2Placement;
  ui.pvcOrder.value = state.pvcOrder;
  ui.hideCpu.checked = state.hideCpu;
  ui.view.value = state.view;
  ui.bestOfThree.checked = state.bestOfThree;
  ui.p1Name.value = state.p1Name;
  ui.p2Name.value = state.p2Name;
}

function renderPersistentLabels() {
  updateBoardTitles();
  updateDynamicLabels();
  updateSeriesLabel();
}

function updateDynamicLabels() {
  if (ui.p2NameLabel) {
    ui.p2NameLabel.textContent = state.mode === "pvc" ? "電腦名稱" : "玩家2/電腦名稱";
  }
}

function resetRoundState() {
  state.called.clear();
  state.step = 0;
  state.firstToTarget = { 1: null, 2: null };
  state.setupPlayer = 1;
  state.selectedFruit = null;
  state.lastCalledFruit = null;
  state.lastView = "";
  state.phase = "idle";
  ui.play.classList.add("hidden");
  ui.setupPanel.classList.add("hidden");
  ui.toast.classList.add("hidden");
}

function updateBoardTitles() {
  ui.p1Title.textContent = `${state.p1Name}賓果盤`;
  ui.p2Title.textContent = `${state.p2Name}賓果盤`;
}

function setupEmptyBoards() {
  state.setup[1] = Array(state.size * state.size).fill(null);
  state.setup[2] = Array(state.size * state.size).fill(null);
}

function seedRandomBoardsIfNeeded() {
  if (state.p1Placement === "random") state.setup[1] = randomBoard();
  if (state.p2Placement === "random") state.setup[2] = randomBoard();
}

function advanceSetupPlayer() {
  if (state.setupPlayer === 1 && state.p1Placement === "random") state.setupPlayer = 2;
  if (state.setupPlayer === 2 && state.p2Placement === "random") {
    finishSetup();
    return;
  }
  renderSetup();
  setPhase(`排盤階段：${currentSetupName()}請先選水果再點格子`);
}

function currentSetupName() {
  return state.setupPlayer === 1 ? state.p1Name : state.p2Name;
}

function renderSetup() {
  ui.setupHint.textContent = `${currentSetupName()}排盤中（點已放水果可收回）`;
  drawPalette();
  drawBoard(ui.setupBoard, state.setup[state.setupPlayer], null, true, placeFruit);
}

function drawPalette() {
  const used = new Set(state.setup[state.setupPlayer].filter(Boolean).map(fruit => fruit.k));
  ui.palette.innerHTML = "";

  FRUITS.forEach(fruit => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "caller-cell" +
      (state.selectedFruit && state.selectedFruit.k === fruit.k ? " selected" : "") +
      (used.has(fruit.k) ? " called" : "");
    button.innerHTML = `<div class="fruit">${fruit.e}</div><div class="name">${fruit.n}</div>`;
    button.onclick = () => selectPaletteFruit(fruit, used);
    ui.palette.appendChild(button);
  });
}

function selectPaletteFruit(fruit, used) {
  if (used.has(fruit.k)) {
    note(`${fruit.n}已放入，若要改請先點盤面把它收回`);
    beep("warn");
    return;
  }
  state.selectedFruit = fruit;
  drawPalette();
  note(`已選 ${fruit.n}，請點空格放入`);
}

function placeFruit(index) {
  const board = state.setup[state.setupPlayer];

  if (board[index]) {
    const removed = board[index];
    board[index] = null;
    if (state.selectedFruit && state.selectedFruit.k === removed.k) state.selectedFruit = null;
    refreshSetupBoard(board);
    note(`已收回 ${removed.n}`);
    beep("ok");
    persistState();
    return;
  }

  if (!state.selectedFruit) {
    note("請先從上方選一種水果");
    beep("warn");
    return;
  }

  board[index] = state.selectedFruit;
  state.selectedFruit = null;
  refreshSetupBoard(board);
  note("已放入水果");
  beep("ok");
  persistState();
}

function refreshSetupBoard(board) {
  drawPalette();
  drawBoard(ui.setupBoard, board, null, true, placeFruit);
}

function confirmSetup() {
  const board = state.setup[state.setupPlayer];
  if (board.some(cell => !cell)) {
    note("盤面尚未填滿");
    beep("warn");
    return;
  }
  if (hasDuplicateFruit(board)) {
    note("有重複水果，請更換");
    beep("warn");
    return;
  }
  if (state.setupPlayer === 1) {
    state.setupPlayer = 2;
    advanceSetupPlayer();
    persistState();
    return;
  }
  finishSetup();
}

function finishSetup() {
  state.boards[1] = state.setup[1].slice();
  state.boards[2] = state.setup[2].slice();
  ui.setupPanel.classList.add("hidden");
  beginPlayPhase();
}

function isPlayerTurn() {
  if (state.mode !== "pvc") return true;
  return state.pvcOrder === "player_first" ? state.step % 2 === 0 : state.step % 2 === 1;
}

function beginPlayPhase() {
  state.phase = "call";
  state.marks[1] = Array(state.size * state.size).fill(false);
  state.marks[2] = Array(state.size * state.size).fill(false);
  ui.play.classList.remove("hidden");
  setPhase("叫水果階段：點一種水果，雙方同步圈選");
  note(state.mode === "pvc"
    ? (state.pvcOrder === "cpu_first" ? "單人模式：電腦先手" : "單人模式：玩家先手")
    : "雙人模式進行中");
  drawPlayBoards();
  updateLineLabel();
  applyView(true);
  beep("start");
  persistState();
  if (state.mode === "pvc" && !isPlayerTurn()) scheduleCpuCall();
}

function scheduleCpuCall() {
  clearCpuTimer();
  if (state.phase !== "call") return;
  state.cpuTimer = setTimeout(() => {
    const open = availableFruits();
    if (!open.length) {
      finishRound(0);
      return;
    }
    const pick = open[Math.floor(Math.random() * open.length)];
    callFruit(pick.k, "cpu");
  }, 700);
}

function callFruit(key, source) {
  if (state.phase !== "call") return;
  if (state.mode === "pvc" && source !== "cpu" && !isPlayerTurn()) {
    note("現在是電腦叫水果中");
    beep("warn");
    return;
  }
  if (state.called.has(key)) {
    note("這個水果已經點過了");
    beep("warn");
    return;
  }
  if (!availableFruitKeys().has(key)) {
    note("這個水果不在本局可叫牌範圍內");
    beep("warn");
    return;
  }

  state.called.add(key);
  state.lastCalledFruit = key;
  state.step += 1;
  markBoards(key);

  const p1Lines = countLines(1);
  const p2Lines = countLines(2);
  if (p1Lines >= state.target && state.firstToTarget[1] === null) state.firstToTarget[1] = state.step;
  if (p2Lines >= state.target && state.firstToTarget[2] === null) state.firstToTarget[2] = state.step;

  drawPlayBoards();
  updateLineLabel();
  applyView(false);

  const picked = FRUITS.find(fruit => fruit.k === key);
  if (picked) note(`已選水果：${picked.e} ${picked.n}`);
  beep("mark");
  persistState();

  const winnerId = Core.winner(state.target, state.firstToTarget, { 1: p1Lines, 2: p2Lines });
  if (winnerId !== 0) {
    finishRound(winnerId);
    return;
  }

  if (state.called.size === availableFruitKeys().size) {
    finishRound(0);
    return;
  }

  if (state.mode === "pvc" && !isPlayerTurn()) scheduleCpuCall();
}

function markBoards(key) {
  [1, 2].forEach(player => {
    state.boards[player].forEach((fruit, index) => {
      if (fruit.k === key) state.marks[player][index] = true;
    });
  });
}

function drawPlayBoards() {
  drawBoard(ui.p1Board, state.boards[1], state.marks[1], false);
  drawBoard(ui.p2Board, state.boards[2], state.marks[2], false);
  drawLines(1, ui.p1Lines);
  drawLines(2, ui.p2Lines);
}

function drawBoard(element, board, marks, editable, clickHandler) {
  element.style.gridTemplateColumns = `repeat(${state.size}, minmax(62px,1fr))`;
  element.innerHTML = "";

  board.forEach((fruit, index) => {
    const isRecent = !!(fruit && state.phase === "call" && state.lastCalledFruit === fruit.k);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell" +
      (marks && marks[index] ? " mark" : "") +
      (!fruit ? " empty" : "") +
      (isRecent ? " recent" : "");
    cell.innerHTML = fruit
      ? `<div class="fruit">${fruit.e}</div><div class="name">${fruit.n}</div>`
      : "<div class='name'>空格</div>";
    cell.onclick = editable
      ? () => clickHandler(index)
      : () => {
          if (!fruit) return;
          callFruit(fruit.k, "player");
        };
    element.appendChild(cell);
  });
}

function drawLines(player, layer) {
  layer.innerHTML = "";
  const boardEl = player === 1 ? ui.p1Board : ui.p2Board;
  const shellRect = boardEl.parentElement.getBoundingClientRect();

  completedLines(player).forEach(segment => {
    const line = document.createElement("div");
    line.className = "line-seg";
    const start = getFruitCenter(boardEl, shellRect, segment[0]);
    const end = getFruitCenter(boardEl, shellRect, segment[1]);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    line.style.left = `${start.x}px`;
    line.style.top = `${start.y - 4}px`;
    line.style.width = `${Math.hypot(dx, dy)}px`;
    line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    layer.appendChild(line);
  });
}

function getFruitCenter(boardEl, shellRect, pos) {
  const idx = pos.r * state.size + pos.c;
  const cell = boardEl.children[idx];
  const fruitEl = cell ? cell.querySelector(".fruit") : null;
  const target = fruitEl || cell;
  const rect = target.getBoundingClientRect();
  return {
    x: rect.left - shellRect.left + rect.width / 2,
    y: rect.top - shellRect.top + rect.height / 2
  };
}

function completedLines(player) {
  return Core.completedLines(state.marks[player], state.size);
}

function countLines(player) {
  return Core.countLines(state.marks[player], state.size);
}

function finishRound(winnerId) {
  clearCpuTimer();
  state.phase = "result";
  ui.p1Card.classList.remove("hidden", "invisible-slot");
  ui.p2Card.classList.remove("hidden", "invisible-slot");
  drawPlayBoards();

  let title = "平手";
  let detail = "本局未分高下";
  let loser = "";

  if (winnerId !== 0) {
    const winnerName = winnerId === 1 ? state.p1Name : state.p2Name;
    const loserName = winnerId === 1 ? state.p2Name : state.p1Name;
    title = `${winnerName} 勝利`;
    detail = `${winnerName} 先連成 ${state.target} 條線`;
    loser = `${loserName} 😢`;

    if (state.bestOfThree) {
      state.series[winnerId] += 1;
      updateSeriesLabel();
      if (state.series[winnerId] >= 2) {
        title = "系列賽結束";
        detail = `${winnerName} 以2勝奪冠`;
        launchFireworks();
        state.series = { 1: 0, 2: 0 };
        updateSeriesLabel();
      }
    }
    beep("win");
  } else {
    beep("draw");
  }

  showToast(`${title} ${winnerId === 0 ? "😐" : "😄"}｜${detail}${loser ? `｜${loser}` : ""}`);
  setPhase("本局結束");
  persistState();
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.remove("hidden");
}

function updateLineLabel() {
  ui.line.textContent = `${state.p1Name}線數: ${countLines(1)} | ${state.p2Name}線數: ${countLines(2)}`;
}

function updateSeriesLabel() {
  ui.series.textContent = `系列賽：${state.p1Name} ${state.series[1]} 勝 - ${state.p2Name} ${state.series[2]} 勝`;
}

function setPhase(text) {
  ui.phase.textContent = text;
}

function note(text) {
  ui.notice.textContent = text;
}

function resetSeries() {
  state.series = { 1: 0, 2: 0 };
  updateSeriesLabel();
  note("系列賽已重置");
  persistState();
}

function clearSettings() {
  clearCpuTimer();
  resetPersistentState();
  persistSettingsToControls();
  syncTargetInput();
  updateModeOptions();
  renderPersistentLabels();
  resetRoundState();
  drawPlayBoards();
  updateLineLabel();
  setPhase("等待開始");
  note("設定已清除，已恢復預設值");
}

async function shareGame() {
  const shareData = {
    title: document.title,
    text: "一起來玩水果賓果",
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      note("已開啟分享面板");
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(window.location.href);
      note("已複製遊戲網址，快傳給朋友吧");
      return;
    }
  } catch (error) {
    if (error && error.name === "AbortError") {
      note("已取消分享");
      return;
    }
  }

  note("這台裝置不支援直接分享，請手動複製網址");
}

function bindInstallPrompt() {
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPromptEvent = event;
    ui.install.classList.remove("hidden");
  });

  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    ui.install.classList.add("hidden");
    note("已安裝到手機主畫面");
  });
}

async function installGame() {
  if (!installPromptEvent) {
    note("目前無法顯示安裝提示，請先用 HTTPS 網址開啟");
    return;
  }

  installPromptEvent.prompt();
  await installPromptEvent.userChoice;
  installPromptEvent = null;
  ui.install.classList.add("hidden");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function hasDuplicateFruit(board) {
  const seen = new Set();
  for (const fruit of board) {
    if (!fruit) continue;
    if (seen.has(fruit.k)) return true;
    seen.add(fruit.k);
  }
  return false;
}

function randomBoard() {
  const pool = FRUITS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, state.size * state.size);
}

function syncTargetInput() {
  const size = +ui.boardSize.value || state.size || 3;
  const max = Core.maxPossibleLines(size);
  ui.target.max = max;
  ui.target.value = Core.clampTarget(size, +ui.target.value || state.target || 3);
}

function availableFruitKeys() {
  return Core.availableFruitKeys(state.boards);
}

function availableFruits() {
  const keys = availableFruitKeys();
  return FRUITS.filter(fruit => keys.has(fruit.k) && !state.called.has(fruit.k));
}

function applyView(isStart) {
  const hideCpu = state.mode === "pvc" && state.hideCpu;
  if (state.view === "both") {
    ui.p1Card.classList.remove("hidden", "invisible-slot", "fade-in");
    ui.p2Card.classList.remove("hidden", "fade-in");
    ui.p2Card.classList.toggle("invisible-slot", hideCpu);
    state.lastView = "both";
    return;
  }

  let showP1 = true;
  if (state.mode === "pvc") {
    showP1 = isPlayerTurn();
  } else {
    showP1 = state.step % 2 === 0;
  }

  const now = showP1 ? "p1" : "p2";
  ui.p1Card.classList.remove("hidden");
  ui.p2Card.classList.remove("hidden");
  ui.p1Card.classList.toggle("invisible-slot", !showP1);
  ui.p2Card.classList.toggle("invisible-slot", showP1 || hideCpu);

  if (isStart || state.lastView !== now) {
    const card = showP1 ? ui.p1Card : ui.p2Card;
    card.classList.remove("fade-in");
    void card.offsetWidth;
    card.classList.add("fade-in");
    note(`輪流顯示：目前顯示${showP1 ? state.p1Name : state.p2Name}盤面`);
  }
  state.lastView = now;
}

function handleResize() {
  if (state.phase === "call" || state.phase === "result") drawPlayBoards();
}

function clearCpuTimer() {
  if (state.cpuTimer) {
    clearTimeout(state.cpuTimer);
    state.cpuTimer = null;
  }
}

function beep(type) {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  if (!audioContext) audioContext = new AudioCtor();
  if (audioContext.state === "suspended") audioContext.resume();

  const melody = {
    start: [660, 880],
    mark: [740],
    ok: [820],
    warn: [240],
    win: [900, 1200, 1500],
    draw: [500, 500]
  }[type] || [700];

  let time = audioContext.currentTime;
  melody.forEach(freq => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type === "warn" ? "square" : "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.08, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(time);
    osc.stop(time + 0.13);
    time += 0.1;
  });
}

function persistState() {
  if (!window.localStorage) return;
  const payload = {
    settings: {
      size: state.size,
      mode: state.mode,
      target: state.target,
      p1Name: state.p1Name,
      p2Name: state.p2Name,
      pvcOrder: state.pvcOrder,
      hideCpu: state.hideCpu,
      p1Placement: state.p1Placement,
      p2Placement: state.p2Placement,
      view: state.view,
      bestOfThree: state.bestOfThree
    },
    series: state.series
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function restorePersistentState() {
  if (!window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const settings = parsed.settings || {};
    state.size = settings.size || state.size;
    state.mode = settings.mode || state.mode;
    state.target = Core.clampTarget(state.size, settings.target || state.target);
    state.p1Name = settings.p1Name || state.p1Name;
    state.p2Name = settings.p2Name || state.p2Name;
    state.pvcOrder = settings.pvcOrder || state.pvcOrder;
    state.hideCpu = !!settings.hideCpu;
    state.p1Placement = settings.p1Placement || state.p1Placement;
    state.p2Placement = settings.p2Placement || state.p2Placement;
    state.view = settings.view || state.view;
    state.bestOfThree = !!settings.bestOfThree;
    if (parsed.series) {
      state.series = {
        1: Number(parsed.series[1] || 0),
        2: Number(parsed.series[2] || 0)
      };
    }
    if (state.mode === "pvc" && state.p2Name === "玩家2") state.p2Name = "電腦";
    persistSettingsToControls();
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function resetPersistentState() {
  state.size = 3;
  state.mode = "pvp";
  state.target = 3;
  state.p1Name = "玩家1";
  state.p2Name = "玩家2";
  state.pvcOrder = "player_first";
  state.hideCpu = false;
  state.p1Placement = "manual";
  state.p2Placement = "manual";
  state.view = "both";
  state.bestOfThree = false;
  state.series = { 1: 0, 2: 0 };
  if (window.localStorage) window.localStorage.removeItem(STORAGE_KEY);
}

init();

function launchFireworks() {
  const old = document.querySelector(".fireworks");
  if (old) old.remove();
  const canvas = document.createElement("canvas");
  canvas.className = "fireworks";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const parts = [];

  for (let burst = 0; burst < 8; burst++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height * 0.55;
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40;
      const speed = 2 + Math.random() * 3;
      parts.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 50 + Math.random() * 20,
        color: `hsl(${Math.random() * 360},90%,60%)`
      });
    }
  }

  const startTs = performance.now();
  let lastBurst = 0;

  function spawnBurst() {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height * 0.55;
    for (let i = 0; i < 32; i++) {
      const angle = (Math.PI * 2 * i) / 32;
      const speed = 2 + Math.random() * 3.4;
      parts.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 58 + Math.random() * 18,
        color: `hsl(${Math.random() * 360},90%,60%)`
      });
    }
  }

  function tick() {
    const now = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (now - lastBurst > 380) {
      spawnBurst();
      lastBurst = now;
    }
    parts.forEach(part => {
      if (part.life <= 0) return;
      part.life -= 1;
      part.x += part.vx;
      part.y += part.vy;
      part.vy += 0.03;
      part.vx *= 0.99;
      ctx.globalAlpha = Math.max(0, part.life / 70);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, 2.3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (now - startTs < 10000) requestAnimationFrame(tick);
    else canvas.remove();
  }

  requestAnimationFrame(tick);
}
