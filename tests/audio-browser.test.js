// Real WebAudio graphs and offline PCM, with no microphone/audio files or npm build.
const assert = require("node:assert/strict");
const path = require("node:path");
const { openBrowser, captureViews } = require("./browser-helpers");
(async () => {
  const session = await openBrowser({ isMobile: true, hasTouch: true });
  try {
    const { context, url } = session;
    await captureViews(context);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    assert.equal(await page.evaluate(() => audioSystem.context), null, "no autoplay before a gesture");
    await page.getByRole("button", { name: "Старт", exact: true }).tap();
    await page.waitForFunction(() => audioSystem.context?.state === "running", null, { polling: 50 });
    const bed = await page.evaluate(() => {
      audioFrame(); const sources = [...audioSystem.bed].map((v) => v.source);
      for (let i = 0; i < 120; i++) audioFrame();
      return { count: audioSystem.bed.size, same: [...audioSystem.bed].every((v, i) => v.source === sources[i]) };
    });
    assert.deepEqual(bed, { count: 2, same: true }, "one continuous bed, never one loop per frame");
    await page.getByRole("button", { name: "Пауза", exact: true }).tap();
    assert.equal(await page.evaluate(() => audioSystem.bed.size), 0);
    await page.evaluate(() => audioSystem.context.suspend());
    await page.getByRole("button", { name: "Продолжить", exact: true }).tap();
    await page.waitForFunction(() => audioSystem.context.state === "running", null, { polling: 50 });
    assert.equal(await page.evaluate(() => { audioFrame(); return audioSystem.bed.size; }), 2, "gesture resumes a suspended context and ambience");
    await page.getByRole("button", { name: "Выключить звук", exact: true }).tap();
    assert.equal(await page.evaluate(() => { audioFrame(); return audioSystem.voices.size; }), 0, "mute stops scheduled FX and looping layers");
    await page.getByRole("button", { name: "Включить звук", exact: true }).tap();
    assert.equal(await page.evaluate(() => { audioFrame(); return audioSystem.bed.size; }), 2);
    // Browsers can suspend audio independently of the game. A new drag must recover it.
    await page.evaluate(() => audioSystem.context.suspend());
    const bounds = await page.locator("#scene").boundingBox();
    await page.locator("#scene").tap({ position: { x: bounds.width * .5, y: bounds.height * .9 } });
    await page.waitForFunction(() => audioSystem.context.state === "running", null, { polling: 50 });
    const schedule = await page.evaluate(() => {
      stopAudioVoices(); audioSystem.next = Infinity;
      const counts = [];
      for (let event = 0; event < 6; event++) {
        stopAudioVoices(); audioSystem.streetBeat = event;
        audioSystem.nextStreet = audioSystem.context.currentTime + 0.01;
        audioFrame();
        counts.push(audioSystem.voices.size);
        const before = audioSystem.voices.size;
        audioFrame();
        if (audioSystem.voices.size !== before) throw new Error("duplicate street event");
      }
      audioSystem.nextStreet = -100;
      const before = audioSystem.voices.size; audioFrame();
      return { counts, backlog: audioSystem.voices.size - before };
    });
    assert.ok(schedule.counts.every((n) => n >= 4 && n <= 6), "traffic, horn, bird and bell are bounded");
    assert.equal(schedule.backlog, 0, "do not replay a street backlog");
    const levels = await page.evaluate(async () => {
      stopAudioVoices();
      const original = { ...audioSystem }, originalSound = prefs.sound;
      const result = {};
      try {
        for (const kind of ["ambience", "traffic", "eat", "dumpling", "chicken", "donut", "veg", "combo", "power", "button", "cat", "muted"]) {
          const c = new OfflineAudioContext(1, 48000 * 4, 48000);
          Object.assign(audioSystem, { context: c, voices: new Set(), bed: new Set(), unlocked: true, lastEffect: {} });
          for (const [bus, volume] of [["fx", 1.2], ["music", 0.55], ["ambience", 0.72], ["street", 0.8]]) {
            const gain = c.createGain(); gain.gain.value = volume; gain.connect(c.destination); audioSystem[bus] = gain;
          }
          prefs.sound = kind !== "muted";
          if (kind === "ambience") startCityBed();
          else if (kind === "traffic") ambientWash(0, 3, 0.08, 790, 0.3);
          else sound(kind === "muted" ? "eat" : kind);
          const buffer = await c.startRendering(), data = buffer.getChannelData(0);
          let peak = 0, maxRms = 0, minBedRms = Infinity;
          for (let start = 0; start < data.length; start += 2400) {
            let square = 0;
            for (let i = start; i < Math.min(start + 2400, data.length); i++) {
              if (!Number.isFinite(data[i])) throw new Error("invalid audio sample");
              peak = Math.max(peak, Math.abs(data[i])); square += data[i] ** 2;
            }
            const rms = Math.sqrt(square / 2400); maxRms = Math.max(maxRms, rms);
            if (start >= 48000) minBedRms = Math.min(minBedRms, rms);
          }
          result[kind] = { peak, maxRms, minBedRms };
        }
      } finally { Object.assign(audioSystem, original); prefs.sound = originalSound; }
      return result;
    });
    console.log("PCM levels:", JSON.stringify(levels));
    assert.equal(levels.muted.peak, 0);
    for (const [kind, level] of Object.entries(levels)) if (kind !== "muted") {
      assert.ok(level.maxRms > 0.001, kind + " produces audible nonzero PCM");
      assert.ok(level.peak < 0.9, kind + " has clipping headroom");
    }
    assert.ok(levels.ambience.minBedRms > levels.ambience.maxRms * 0.4, "continuous bed has no loop-length silence");
    assert.ok(levels.eat.maxRms > levels.ambience.maxRms * 2, "gameplay reads above background");
    assert.ok(levels.eat.maxRms > levels.traffic.maxRms * 1.5);
    await page.evaluate(() => { state = "play"; audioScene("play"); audioFrame();
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange")); });
    assert.equal(await page.evaluate(() => audioSystem.voices.size), 0, "hidden page releases loops and one-shots");
    assert.deepEqual(errors, []);
    console.log("PASS: gesture unlock, suspended-context resume/drag, mute, hidden cleanup, continuous two-layer ambience, six sparse events, deduplication, 9 gameplay SFX, PCM headroom and foreground/background hierarchy.");
  } finally { await session.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
