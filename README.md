# Мопс на Манхэттене

Полноценная браузерная 3D-аркада в портретной композиции: двигайте мопса по улице, ловите еду, избегайте опасных предметов и набирайте очки. Манхэттен, персонажи, предметы, текстуры и звук создаются программно. Для игры не нужны CDN, npm или сборка.

## Play

[Играть на GitHub Pages](https://btnvff.github.io/pug-in-manhattan/)

Публикуется ветка `main`. Для игры нужен современный браузер с WebGL 2.

Текущий номер игры определяется подписью `#build-version` в [index.html](index.html) и виден снизу игрового поля. Подтверждённая рабочая версия, её commit и проверки записаны в [PROJECT.md](PROJECT.md#current-version-and-known-good-state); отдельного источника версии здесь нет.

## Controls

Перетаскивайте мопса пальцем, мышью или пером в нижней части игрового поля. На клавиатуре используйте **← / →** или **A / D**; фокус не должен оставаться на кнопке. **Escape** или «Пауза» приостанавливают забег, «Продолжить» возобновляет его. Скрытие вкладки и потеря фокуса ставят забег на паузу. Кнопка динамика включает и выключает звук.

## Features

Three.js-сцена Манхэттена с перспективой, мостом, транспортом и прохожими; анимированный 3D-мопс; девять типов предметов; бонусы, коты и птицы-помощники; городские события и синтезированный WebAudio. Рекорд и настройки сохраняются локально. Симуляция, очки, баланс и игровой RNG отделены от рендера; одинаковые входы, seed и шаги времени дают одинаковый результат.

**PUG WORLD RATIO 1.0.0** фиксирует композицию 600 × 1125, перспективу и относительные размеры. Изменение окна вписывает композицию целиком без растяжения; логические координаты игры остаются 390 × 844. Существующий предел DPR 1,5 ограничивает размер drawing buffer, не меняя камеру и размеры объектов.

## Running locally

Из корня репозитория:

```sh
python3 -m http.server 8000
```

Откройте `http://localhost:8000/`. Все пути относительные и работают также в подкаталоге GitHub Pages.

Необязательный `node scripts/build-preview.js` экспортирует только необходимые статические файлы и лицензию Three.js в **пустой** `dist/`. Это копирование для размещения, а не обязательный build pipeline. Команда не перезаписывает непустую директорию.

## Project structure

```text
.gitignore
assets/icons/
  apple-touch-icon.png
  icon-192.png
  icon-512.png
js/
  app/        bootstrap.js, input.js, ui.js
  game/       balance.js, events.js, game.js, powers.js,
              run-state.js, street-events.js
  character/  pug-3d.js, pug-animation.js, pug-motion.js
  world/      models-3d.js, ratio-scene.js, world-ratio.js
  render/     canvas-primitives.js, feedback-overlay.js,
              ratio-diagnostics.js, renderer-3d.js
  systems/    audio.js
  vendor/     three-r185.js, three-LICENSE.txt
scripts/
  build-preview.js
tests/
  browser/    audio-browser.test.js, browser.test.js,
              character-browser.test.js, render-lifecycle.test.js,
              runtime-browser.test.js, live-verify.js
  character/  character.test.js
  game/       gameplay.test.js, street-events.test.js
  render/     ratio-runtime.test.js
  world/      world-ratio.test.js
  helpers/    browser.js
  fixtures/   ratio-1.0.0.json
  repository.test.js
  run.js
  visual-compare.js
index.html
style.css
manifest.webmanifest
README.md
PROJECT.md
PUG-WORLD-RATIO.md
CHARACTER_REVIEW.md
```

## Architecture

Классические `defer`-скрипты в [index.html](index.html) сначала определяют системы; последний `js/app/bootstrap.js` связывает ввод, интерфейс, аудио и WebGL, владеет RAF и обработчиками lifecycle. `js/game/` обновляет состояние; `js/character/pug-motion.js` вычисляет игровые сигналы движения и взгляда. Рендерер только читает их и строит представление через мир, 3D-модели и чистую анимацию позы.

Прозрачный Canvas поверх WebGL нужен для aura, подсказок опасности, текста, feedback и диагностики. Другие Canvas создают procedural-текстуры. Они являются частью 3D-продукта. Контракты зависимостей, координат и владения ресурсами описаны в [PROJECT.md](PROJECT.md).

## Normal development

Обычная задача: прочитать актуальную версию и относящиеся к запросу файлы → сделать одну правку → проверить затронутое поведение → сохранить проверенный результат. PATCH увеличивается для законченной видимой правки или исправления поведения, но не для аудита и документации; полный исторический regression не нужен для каждого небольшого изменения. Выбор проверок описан в [PROJECT.md](PROJECT.md#normal-development-loop).

Перед изменением камеры/мира прочитать [PUG-WORLD-RATIO.md](PUG-WORLD-RATIO.md), перед изменением мопса — [CHARACTER_REVIEW.md](CHARACTER_REVIEW.md). Это контракты текущей FULL-3D игры, а не указание возвращать старую самостоятельную 2D-версию.

## Testing

Node.js 22+; шесть наборов логики, геометрии, проекции, событий, структуры и HTTP-ресурсов:

```sh
node tests/run.js
```

Пять браузерных наборов используют **внешнюю** установку Playwright и Chromium, не добавляя зависимостей игре:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/driver/package \
CHROMIUM_PATH=/path/to/chromium \
xvfb-run -a node tests/run.js --all
```

`--browser` запускает только браузерные наборы. `xvfb-run` нужен лишь в Linux-средах, где WebGL требует виртуального дисплея. HTTP-проверки используют префикс `/pug-in-manhattan/`. `OFFLINE_BROWSER=1` явно переключает браузерный harness на локальное содержимое в настоящем DOM/WebGL и **не проверяет браузерную HTTP-навигацию**. Ошибки окружения не выдаются за успешные тесты.

Точное сравнение состояния и RNG с доступным Git-коммитом, по три десятиминутных прогона:

```sh
node tests/game/gameplay.test.js --compare <git-ref> --seconds 600
```

Визуальное сравнение двух ревизий в одном Chromium, на одной ОС и одном backend, 25 пар снимков:

```sh
node tests/visual-compare.js <git-ref>
```

Для этой команды также нужны Playwright/Chromium и при необходимости `xvfb-run`. Она фиксирует CPU-raster для CSS и SwiftShader для WebGL, создаёт временный worktree, требует побайтового совпадения PNG и не перезаписывает эталоны. Из сравнения исключена только надпись номера ревизии. Различия между разными GPU/ОС не являются автоматически регрессией. `SCREENSHOT_DIR=/path/to/output` сохраняет снимки вне исходников.

После deployment проверяются **байты всех production-ресурсов относительно текущего checkout**, console/network и реальные взаимодействия:

```sh
TEST_BASE_URL=https://btnvff.github.io/pug-in-manhattan/ \
node tests/browser/live-verify.js
```

Тот же `TEST_BASE_URL` поддерживается `node tests/run.js --browser` для полного браузерного набора на опубликованной версии. Внешние browser tools требуются в обоих случаях; offline-режим для production запрещён.

## WebGL

Игра требует WebGL 2. Если Three.js, WebGL, создание сцены, рендер или resize завершаются ошибкой, приложение прекращает забег, отменяет RAF, освобождает созданную сцену и показывает «3D-графика недоступна» с кнопкой перезагрузки. Потеря WebGL context ведёт в тот же управляемый error state без автоматических повторов. Перезагрузка начинает новый сеанс, сохраняя рекорд и настройки.

Повторные Start/Restart/Menu используют одну сцену. Полный teardown снимает подписки, освобождает GPU-ресурсы и закрывает AudioContext. При возврате видимости забег остаётся на паузе; время скрытой вкладки не превращается в игровые шаги.

## Known limitations

Реальные iPhone/Android, Safari, громкость динамиков и производительность мобильного GPU требуют проверки на физических устройствах. Автоматизация Chromium с SwiftShader не заменяет её. Manifest и иконки присутствуют, но service worker и гарантированная офлайн-загрузка не реализованы. Three.js распространяется со своей [MIT-лицензией](js/vendor/three-LICENSE.txt).
