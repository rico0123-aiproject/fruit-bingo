const assert = require("assert");
const fs = require("fs");
const Core = require("./game-core.js");

const F = key => ({ k: key });

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createMatch({ size, target, board1, board2 }) {
  return {
    size,
    target,
    boards: { 1: board1, 2: board2 },
    marks: {
      1: Array(size * size).fill(false),
      2: Array(size * size).fill(false)
    },
    called: new Set(),
    firstToTarget: { 1: null, 2: null },
    step: 0,
    finished: false,
    winner: null
  };
}

function availableKeys(match) {
  return Core.availableFruitKeys(match.boards);
}

function lineCounts(match) {
  return {
    1: Core.countLines(match.marks[1], match.size),
    2: Core.countLines(match.marks[2], match.size)
  };
}

function applyCall(match, key) {
  if (match.finished) throw new Error("match already finished");
  if (match.called.has(key)) throw new Error(`duplicate call: ${key}`);
  if (!availableKeys(match).has(key)) throw new Error(`invalid call: ${key}`);

  match.called.add(key);
  match.step += 1;

  [1, 2].forEach(player => {
    match.boards[player].forEach((fruit, index) => {
      if (fruit && fruit.k === key) match.marks[player][index] = true;
    });
  });

  const counts = lineCounts(match);
  if (counts[1] >= match.target && match.firstToTarget[1] === null) match.firstToTarget[1] = match.step;
  if (counts[2] >= match.target && match.firstToTarget[2] === null) match.firstToTarget[2] = match.step;

  const winner = Core.winner(match.target, match.firstToTarget, counts);
  if (winner !== 0) {
    match.finished = true;
    match.winner = winner;
    return { finished: true, winner, counts };
  }

  if (match.called.size === availableKeys(match).size) {
    match.finished = true;
    match.winner = 0;
    return { finished: true, winner: 0, counts };
  }

  return { finished: false, winner: null, counts };
}

test("3x3 target is clamped to 8", () => {
  assert.strictEqual(Core.clampTarget(3, 99), 8);
});

test("4x4 target is clamped to 10", () => {
  assert.strictEqual(Core.clampTarget(4, 99), 10);
});

test("row and both diagonals are counted correctly", () => {
  const marks = [
    true, true, true,
    false, true, false,
    true, false, true
  ];
  assert.strictEqual(Core.countLines(marks, 3), 3);
});

test("availableFruitKeys uses the union of both boards", () => {
  const keys = Core.availableFruitKeys({
    1: [F("apple"), F("banana"), F("cherry")],
    2: [F("banana"), F("durian"), null]
  });
  assert.deepStrictEqual([...keys].sort(), ["apple", "banana", "cherry", "durian"]);
});

test("winner prefers the player who reached target first", () => {
  assert.strictEqual(Core.winner(3, { 1: 4, 2: 5 }, { 1: 3, 2: 3 }), 1);
});

test("winner returns draw on simultaneous equal finish", () => {
  assert.strictEqual(Core.winner(3, { 1: 4, 2: 4 }, { 1: 3, 2: 3 }), 0);
});

test("winner uses line count as secondary tiebreaker", () => {
  assert.strictEqual(Core.winner(3, { 1: 4, 2: 4 }, { 1: 4, 2: 3 }), 1);
});

test("full interaction flow yields player 1 win when they reach target first", () => {
  const match = createMatch({
    size: 3,
    target: 1,
    board1: [
      F("apple"), F("banana"), F("cherry"),
      F("durian"), F("elderberry"), F("fig"),
      F("grape"), F("honeydew"), F("kiwi")
    ],
    board2: [
      F("apple"), F("banana"), F("lime"),
      F("mango"), F("nectarine"), F("orange"),
      F("papaya"), F("quince"), F("raspberry")
    ]
  });

  applyCall(match, "apple");
  applyCall(match, "banana");
  const result = applyCall(match, "cherry");

  assert.strictEqual(result.finished, true);
  assert.strictEqual(result.winner, 1);
  assert.strictEqual(match.firstToTarget[1], 3);
  assert.strictEqual(match.firstToTarget[2], null);
});

test("full interaction flow ends in draw when all available fruits are exhausted", () => {
  const match = createMatch({
    size: 3,
    target: 3,
    board1: [
      F("apple"), F("banana"), F("cherry"),
      F("durian"), F("elderberry"), F("fig"),
      F("grape"), F("honeydew"), F("kiwi")
    ],
    board2: [
      F("apple"), F("banana"), F("cherry"),
      F("durian"), F("elderberry"), F("fig"),
      F("grape"), F("honeydew"), F("kiwi")
    ]
  });

  ["apple", "banana", "durian", "fig", "honeydew", "kiwi", "grape", "elderberry", "cherry"].forEach(key => {
    if (!match.finished) applyCall(match, key);
  });

  assert.strictEqual(match.finished, true);
  assert.strictEqual(match.winner, 0);
});

test("front-end includes the shared game core script", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /<script src="game-core\.js"><\/script>/);
});

test("front-end persists settings with localStorage", () => {
  const script = fs.readFileSync("script.js", "utf8");
  assert.match(script, /localStorage/);
  assert.match(script, /fruit-bingo-state-v1/);
});

test("front-end includes a clear settings action", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const script = fs.readFileSync("script.js", "utf8");
  assert.match(html, /id="clearSettingsBtn"/);
  assert.match(script, /function clearSettings\(\)/);
  assert.match(script, /removeItem\(STORAGE_KEY\)/);
});

test("front-end includes share and install controls", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /id="shareBtn"/);
  assert.match(html, /id="installBtn"/);
});

test("front-end includes visible app version", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const script = fs.readFileSync("script.js", "utf8");
  assert.match(html, /id="appVersion"/);
  assert.match(script, /const APP_VERSION = "v1\.2\.0"/);
  assert.match(script, /renderAppVersion\(\)/);
});

test("front-end registers service worker and share flow", () => {
  const script = fs.readFileSync("script.js", "utf8");
  assert.match(script, /registerServiceWorker\(\)/);
  assert.match(script, /navigator\.share/);
  assert.match(script, /beforeinstallprompt/);
});

test("pwa manifest and service worker files exist", () => {
  const manifest = fs.readFileSync("manifest.webmanifest", "utf8");
  const sw = fs.readFileSync("sw.js", "utf8");
  assert.match(manifest, /"display": "standalone"/);
  assert.match(manifest, /icon-192\.svg/);
  assert.match(sw, /CACHE_NAME/);
  assert.match(sw, /addAll\(APP_SHELL\)/);
});

console.log("All game-core tests passed.");
