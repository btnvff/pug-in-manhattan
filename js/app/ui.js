"use strict";
// DOM chrome, screen-space canvas, and persisted user preferences. No simulation.
const $ = (id) => document.getElementById(id),
  cv = $("scene"),
  overlay = $("overlay");
const ctx = cv.getContext("2d"); // Transparent effects/input surface over WebGL.

let prefs = { sound: true, best: 0 };
function readPreference(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
const loadedPreference = readPreference("manhattan-pug-progressive");
if (loadedPreference && typeof loadedPreference === "object") {
  prefs.sound = loadedPreference.sound !== false;
  prefs.best = Number.isSafeInteger(loadedPreference.best)
    ? Math.max(0, loadedPreference.best)
    : 0;
} else {
  const old = readPreference("manhattan-pug-v2");
  if (old && typeof old === "object") prefs.sound = old.sound !== false;
}
const save = () => {
  try {
    localStorage.setItem("manhattan-pug-progressive", JSON.stringify(prefs));
  } catch {}
};

function soundUI() {
  $("sound").innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9h4l5-4v14l-5-4H4z"/>' +
    (prefs.sound
      ? '<path d="M17 8q5 4 0 8m-1-5q2 1 0 2"/>'
      : '<path d="m17 9 5 6m0-6-5 6"/>') +
    "</svg>";
  $("sound").setAttribute(
    "aria-label",
    prefs.sound ? "Выключить звук" : "Включить звук",
  );
}

function hud() {
  $("sausages").textContent = sausages;
  $("points").textContent = points;
  $("hint").textContent =
    happy <= BALANCE.happiness.critical
      ? "ЛОВИ ЕДУ — МОПСУ НУЖНО ВОССТАНОВИТЬСЯ"
      : "← ТЯНИ ЗДЕСЬ, ЧТОБЫ ДВИГАТЬ МОПСА →";
  updateCondition();
}

function ui() {
  audioScene(graphicsUnavailable ? "pause" : state);
  const playing = !graphicsUnavailable && (state === "play" || state === "pause");
  $("hud").style.display = playing ? "flex" : "none";
  $("powers").style.display = playing ? "flex" : "none";
  $("condition").style.display = $("rhythm").style.display = playing
    ? "block"
    : "none";
  $("hint").style.display = !graphicsUnavailable && state === "play" ? "block" : "none";
  overlay.className = state === "win" || state === "lose" ? "result" : "";
  overlay.innerHTML = "";
  if (graphicsUnavailable) {
    overlay.className = "graphics-error";
    overlay.innerHTML = '<div class="panel" role="alert"><h2>3D-графика недоступна</h2><p>Для игры нужен WebGL 2. Включите аппаратное ускорение или откройте игру в другом браузере.</p><button class="cta" id="reload">Перезагрузить</button><p>Перезагрузка начнёт новый сеанс.</p></div>';
    $("reload").onclick = () => location.reload();
    return;
  }
  if (state === "menu") {
    overlay.innerHTML =
      '<header class="sky-heading"><h1 class="title"><span class="eyebrow">АРКАДА С ХАРАКТЕРОМ</span>Мопс <small style="font-size:.55em;font-weight:normal">на</small><span>Манхэттене</span></h1><p class="tagline">Большой город. Маленький мопс.<br>Огромный аппетит.</p></header><div class="menu-card"><button class="cta" id="start">Старт</button><p class="instruction">Тяни мопса пальцем. Лови вкусное. Избегай опасного. Побей рекорд.</p><p class="record">Лучший результат: ' +
      prefs.best +
      " очков</p></div>";
    $("start").onclick = start;
  } else if (state === "pause") {
    overlay.innerHTML =
      '<div class="panel"><div class="badge">Сосиски подождут</div><h2>Маленький привал</h2><p>Мопс переводит дух.<br>Город никуда не убежит.</p><button class="cta" id="resume">Продолжить</button><button class="secondary" id="restart">Заново</button><button class="secondary" id="menu">Главное меню</button></div>';
    $("resume").onclick = () => {
      unlockAudio();
      state = "play";
      ui();
      sound("button");
    };
    $("restart").onclick = start;
    $("menu").onclick = menu;
  } else if (state === "win" || state === "lose") {
    let win = state === "win";
    overlay.innerHTML =
      '<div class="panel"><div class="badge">' +
      (win ? "Манхэттен у твоих лап" : "Завтра будет вкуснее") +
      "</div><h2>" +
      (win ? "Король сосисок!" : "Мопс выбился из сил") +
      "</h2><p>" +
      "Лучшая серия: " +
      bestStreak +
      " · Уклонений: " +
      nearMisses +
      "<br>Время: " +
      Math.floor(elapsed / 60) +
      ":" +
      String(Math.floor(elapsed % 60)).padStart(2, "0") +
      '</p><div class="resultstats"><div><b>' +
      points +
      "</b>очки</div><div><b>" +
      sausages +
      '</b>сосиски</div></div><button class="cta" id="restart">' +
      (win ? "Ещё раз" : "Попробовать снова") +
      '</button><button class="secondary" id="menu">Главное меню</button></div>';
    $("restart").onclick = start;
    $("menu").onclick = menu;
  }
}

function bindUI(listen) {
  listen($("sound"), "click", () => {
    prefs.sound = !prefs.sound;
    unlockAudio();
    syncAudioPreference();
    save();
    soundUI();
    sound("button");
  });
  listen($("pause"), "click", pause);
}
