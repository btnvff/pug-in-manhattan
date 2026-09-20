/** Original procedural score and Foley. Audio is created only by a user gesture. */
const audioSystem = {
  context: null,
  master: null,
  music: null,
  fx: null,
  noise: null,
  voices: new Set(),
  mode: "menu",
  next: 0,
  beat: 0,
  unlocked: false,
  lastEffect: Object.create(null),
};
function unlockAudio() {
  if (!prefs.sound) return;
  try {
    if (!audioSystem.context) {
      const Constructor = window.AudioContext || window.webkitAudioContext;
      if (!Constructor) return;
      const context = new Constructor();
      audioSystem.context = context;
      const master = context.createGain(),
        music = context.createGain(),
        fx = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.006;
      compressor.release.value = 0.16;
      music.gain.value = 0.55;
      fx.gain.value = 1.2;
      master.gain.value = 0.85;
      music.connect(compressor);
      fx.connect(compressor);
      compressor.connect(master);
      master.connect(context.destination);
      Object.assign(audioSystem, { master, music, fx });
      const noise = context.createBuffer(
          1,
          Math.floor(context.sampleRate * 2),
          context.sampleRate,
        ),
        data = noise.getChannelData(0);
      let seed = 17;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 16807) % 2147483647;
        const edge = Math.min(1, i / 256, (data.length - 1 - i) / 256);
        data[i] = (seed / 1073741824 - 1) * edge;
      }
      audioSystem.noise = noise;
    }
    audioSystem.unlocked = true;
    const result = audioSystem.context.resume();
    if (result?.catch) result.catch(() => {});
    audioSystem.next = audioSystem.context.currentTime + 0.06;
    syncAudioPreference();
  } catch {
    /* Unsupported audio must never stop the game. */
  }
}
function syncAudioPreference() {
  const { context, master } = audioSystem;
  if (!context) return;
  try {
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(
      prefs.sound ? 0.85 : 0,
      context.currentTime,
      0.012,
    );
    if (!prefs.sound) stopAudioVoices();
  } catch {}
}
function stopAudioVoices() {
  const now = audioSystem.context?.currentTime;
  if (now === undefined) return;
  for (const voice of audioSystem.voices) {
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, 0.008);
      voice.source.stop(now + 0.035);
    } catch {}
  }
  audioSystem.voices.clear();
}
function audioScene(mode) {
  if (mode === audioSystem.mode) return;
  stopAudioVoices();
  audioSystem.mode = mode;
  audioSystem.beat = 0;
  if (audioSystem.context)
    audioSystem.next = audioSystem.context.currentTime + 0.07;
}
function trackVoice(source, gain, nodes) {
  const voice = { source, gain };
  audioSystem.voices.add(voice);
  source.onended = () => {
    audioSystem.voices.delete(voice);
    for (const node of nodes) {
      try {
        node.disconnect();
      } catch {}
    }
  };
}
function tone(
  frequency,
  when,
  duration,
  volume = 0.1,
  wave = "sine",
  bus = "fx",
  pan = 0,
  endFrequency = frequency,
) {
  const a = audioSystem,
    c = a.context;
  if (!c || a.voices.size >= 48) return;
  const o = c.createOscillator(),
    g = c.createGain(),
    filter = c.createBiquadFilter();
  o.type = wave;
  o.frequency.setValueAtTime(Math.max(30, frequency), when);
  o.frequency.exponentialRampToValueAtTime(
    Math.max(30, endFrequency),
    when + duration * 0.75,
  );
  filter.type = "lowpass";
  filter.frequency.value = wave === "sine" ? 9000 : 2200;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, volume),
    when + Math.min(0.02, duration * 0.25),
  );
  g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  o.connect(filter);
  filter.connect(g);
  const nodes = [o, g, filter];
  if (c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-0.6, Math.min(0.6, pan));
    g.connect(p);
    p.connect(a[bus]);
    nodes.push(p);
  } else g.connect(a[bus]);
  trackVoice(o, g, nodes);
  o.start(when);
  o.stop(when + duration + 0.02);
}
function brush(when, duration, volume = 0.03, frequency = 2400, bus = "fx") {
  const a = audioSystem,
    c = a.context;
  if (!c || a.voices.size >= 48) return;
  const o = c.createBufferSource(),
    f = c.createBiquadFilter(),
    g = c.createGain();
  o.buffer = a.noise;
  o.loop = true;
  f.type = "bandpass";
  f.frequency.value = frequency;
  f.Q.value = 0.8;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(
    volume,
    when + Math.min(0.025, duration * 0.3),
  );
  g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  o.connect(f);
  f.connect(g);
  g.connect(a[bus]);
  trackVoice(o, g, [o, f, g]);
  o.start(when);
  o.stop(when + duration + 0.01);
}
function bell(f, when, duration = 0.35, volume = 0.1, bus = "fx", pan = 0) {
  tone(f, when, duration, volume, "sine", bus, pan);
  tone(f * 2.005, when, 0.12, volume * 0.2, "sine", bus, pan);
}
function sound(kind, pan = 0) {
  const a = audioSystem;
  if (!prefs.sound || !a.unlocked || !a.context || document.hidden) return;
  try {
    const t = a.context.currentTime + 0.005;
    if (t - (a.lastEffect[kind] ?? -99) < (kind === "cat" ? 0.45 : 0.055))
      return;
    a.lastEffect[kind] = t;
    if (kind === "feast") {
      [523, 659, 784, 1046].forEach((f, i) =>
        tone(f, t + i * 0.08, 0.25, 0.033, "sine", "fx", pan),
      );
      return;
    }
    if (kind === "warning") {
      tone(430, t, 0.12, 0.035, "sine", "fx", pan, 270);
      tone(320, t + 0.14, 0.12, 0.027, "sine", "fx", pan);
      return;
    }
    if (["critical", "recover", "combo", "near"].includes(kind)) {
      const notes = {
        critical: [330, 247],
        recover: [440, 660],
        combo: [523, 659, 784],
        near: [740, 988],
      }[kind];
      notes.forEach((f, i) =>
        tone(
          f,
          t + i * 0.1,
          0.18,
          kind === "critical" ? 0.045 : 0.027,
          "sine",
          "fx",
          pan,
        ),
      );
      return;
    }
    if (kind === "button" || kind === "pause") {
      tone(
        kind === "pause" ? 330 : 530,
        t,
        0.07,
        0.075,
        "sine",
        "fx",
        0,
        kind === "pause" ? 260 : 720,
      );
      brush(t, 0.027, 0.022, 1900);
      return;
    }
    if (kind === "power" || kind === "shield") {
      [440, 660, 880].forEach((f, i) =>
        tone(f, t + i * 0.06, 0.22, 0.04, "sine"),
      );
      return;
    }
    if (kind === "debuff") {
      tone(330, t, 0.3, 0.06, "sine", "fx", pan, 180);
      return;
    }
    if (kind === "start") {
      [392, 523.25, 659.25].forEach((f, i) =>
        bell(f, t + i * 0.095, 0.24, 0.085),
      );
      return;
    }
    if (["eat", "dumpling", "chicken", "donut"].includes(kind)) {
      if (typeof jackpotActive !== "undefined" && jackpotActive)
        tone(1046, t + 0.15, 0.13, 0.015, "sine", "fx", pan);
      const root = {
        eat: 659.25,
        dumpling: 783.99,
        chicken: 880,
        donut: 987.77,
      }[kind];
      // Soft tonal bite: no noise burst or brittle bell harmonics on collection.
      tone(root * 0.75, t, 0.24, 0.065, "sine", "fx", pan, root * 0.9);
      tone(root * 1.125, t + 0.08, 0.27, 0.038, "sine", "fx", pan);
      tone(210, t + 0.025, 0.16, 0.03, "sine", "fx", pan, 145);
      return;
    }
    if (kind === "veg") {
      tone(170, t, 0.25, 0.13, "triangle", "fx", pan, 72);
      tone(235, t + 0.04, 0.18, 0.035, "sine", "fx", pan, 100);
      brush(t, 0.09, 0.032, 500);
      return;
    }
    if (kind === "land") {
      tone(145, t, 0.09, 0.075, "sine", "fx", pan, 75);
      brush(t, 0.055, 0.045, 700);
      return;
    }
    if (kind === "cat") {
      tone(440, t, 0.12, 0.065, "triangle", "fx", pan, 680);
      tone(680, t + 0.1, 0.27, 0.065, "triangle", "fx", pan, 350);
      return;
    }
    if (kind === "win") {
      [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5].forEach((f, i) =>
        bell(f, t + i * 0.15, 0.45, 0.12),
      );
      [261.63, 329.63, 392, 493.88].forEach((f) =>
        tone(f, t + 0.92, 0.85, 0.04, "triangle"),
      );
      brush(t + 0.91, 0.35, 0.055, 4200);
      return;
    }
    if (kind === "lose") {
      [392, 329.63, 261.63].forEach((f, i) =>
        tone(f, t + i * 0.18, 0.4, 0.085, "triangle"),
      );
      tone(130.81, t + 0.4, 0.5, 0.07, "sine");
    }
  } catch {
    /* Audio failure is non-fatal. */
  }
}
function audioFrame() {
  const a = audioSystem,
    c = a.context;
  if (
    !prefs.sound ||
    !c ||
    !a.unlocked ||
    state !== "play" ||
    document.hidden ||
    c.state !== "running"
  )
    return;
  try {
    const now = c.currentTime;
    if (a.next < now - 0.2) a.next = now + 0.025; // Never replay a backlog after throttling.
    let budget = 0;
    while (a.next < now + 0.12 && budget++ < 2) {
      const t = a.next,
        event = a.beat;
      ambientWash(
        t,
        5.5,
        0.085,
        240 + (event % 3) * 90,
        event % 2 ? 0.35 : -0.35,
      );
      if (event % 3 === 1) ambientWash(t + 0.5, 4.5, 0.055, 650, -0.3);
      // Sparse soft major-sixth phrases sit below the city bed; no percussion.
      const phrases = [
        [392, 493.88, 587.33],
        [329.63, 440, 523.25],
        [349.23, 440, 523.25],
        [293.66, 392, 493.88],
      ];
      const phrase = phrases[event % 4];
      phrase.forEach((f, i) =>
        tone(f, t + i * 0.72, 0.9, 0.012, "sine", "music", -0.15),
      );
      tone(phrase[0] / 2, t, 2.1, 0.006, "sine", "music", 0.1);
      // A rare, quiet distant bird.
      if (event % 7 === 3) {
        tone(1650, t + 1, 0.14, 0.005, "sine", "music", 0.5, 2050);
        tone(1900, t + 1.22, 0.12, 0.004, "sine", "music", 0.45, 1500);
      }
      a.next += 3.2 + (event % 3) * 0.45;
      a.beat++;
    }
  } catch {}
}
function ambientWash(when, duration, volume, frequency, pan) {
  const a = audioSystem,
    c = a.context;
  if (!c || a.voices.size >= 48) return;
  const source = c.createBufferSource(),
    filter = c.createBiquadFilter(),
    gain = c.createGain();
  source.buffer = a.noise;
  source.loop = true;
  source.playbackRate.value = 0.55;
  filter.type = "lowpass";
  filter.frequency.value = frequency;
  filter.Q.value = 0.3;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(volume, when + duration * 0.35);
  gain.gain.linearRampToValueAtTime(volume * 0.7, when + duration * 0.65);
  gain.gain.linearRampToValueAtTime(0, when + duration);
  source.connect(filter);
  filter.connect(gain);
  const nodes = [source, filter, gain];
  if (c.createStereoPanner) {
    const stereo = c.createStereoPanner();
    stereo.pan.setValueAtTime(-pan, when);
    stereo.pan.linearRampToValueAtTime(pan, when + duration);
    gain.connect(stereo);
    stereo.connect(a.music);
    nodes.push(stereo);
  } else gain.connect(a.music);
  trackVoice(source, gain, nodes);
  source.start(when);
  source.stop(when + duration + 0.02);
}
