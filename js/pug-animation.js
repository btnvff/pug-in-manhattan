// Pure presentation sampling: no gameplay writes, randomness, timers or frame-count dependence.
// Existing smoothed motion/attention and catch timers are the only simulation inputs.
function pugPoseClamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
function pugPoseSmooth(t) { const u = pugPoseClamp(t); return u * u * (3 - 2 * u); }
function pugPosePulse(t, start, duration) {
  return t > start && t < start + duration ? Math.sin((t - start) / duration * Math.PI) ** 2 : 0;
}
function pugPoseBlink(t, start) {
  const u = t - start;
  if (u < 0 || u > 0.20) return 0;
  if (u < 0.065) return pugPoseSmooth(u / 0.065);
  return 1 - pugPoseSmooth((u - 0.085) / 0.115);
}
function samplePugPose(signal, pose = {}) {
  const time = signal.time ?? 0;
  const mode = signal.state ?? "menu";
  const running = mode === "play" || mode === "pause";
  const move = running ? pugPoseClamp(signal.runBlend ?? 0) : 0;
  const gait = signal.gait ?? 0;
  const edgeBlend = pugPoseClamp(signal.edgeBlend ?? 1);
  const reactionTime = running ? Math.max(0, signal.react ?? 0) : 0;
  const reactionPhase = pugPoseClamp(1 - reactionTime / Math.max(0.001, signal.reactionDuration ?? 0.5));
  const reactionPulse = reactionTime > 0 ? Math.sin(reactionPhase * Math.PI) ** 2 : 0;
  const bad = (signal.reaction ?? 1) < 0 ? reactionPulse : 0;
  const good = mode !== "lose" && (signal.reaction ?? 1) > 0 ? reactionPulse : 0;
  const chewing = running && (signal.chewTime ?? 0) > 0 && !(reactionTime > 0 && signal.reaction < 0);
  const chewPhase = chewing ? pugPoseClamp(1 - signal.chewTime / Math.max(0.001, signal.chewDuration ?? 0.78)) : 0;
  const savor = chewing ? Math.sin(chewPhase * Math.PI) ** 2 : 0;
  const win = mode === "win" ? 1 : 0;
  const sad = mode === "lose" ? 1 : 0;
  const joy = Math.max(good * 0.8, savor, win * 0.6);
  const turn = pugPoseClamp(signal.headTurn ?? 0, -1, 1);
  const look = pugPoseClamp(signal.lookUp ?? 0);
  const breath = Math.sin(time * 2.25);
  const idle = (1 - move) * (1 - Math.max(good, bad, savor));
  const scanTime = time % 13.7;
  const scan = (pugPosePulse(scanTime, 1.8, 2.5) - pugPosePulse(scanTime, 8.0, 2.8)) * idle * (signal.hasTarget ? 0 : 1);
  const earFlick = pugPosePulse(time % 11.3, 6.2, 0.65) * Math.sin((time % 11.3 - 6.2) * 13) * idle;
  pose.move = move;
  pose.joy = joy; pose.bad = bad; pose.sad = sad;
  pose.breath = breath;
  pose.bodyY = (1 - Math.cos(gait * 2)) * 0.65 * move + good * 1.7 + win * (1 - Math.cos(time * 5)) * 1.5;
  pose.bodyRoll = (-(signal.lean ?? 0) * 0.7 + Math.sin(gait) * 0.012 * move) * edgeBlend;
  pose.stretch = 1 - Math.cos(gait * 2) * 0.012 * move - bad * 0.018 + good * 0.008;
  pose.headY = breath * 0.42 * idle + Math.sin(gait * 2 - 0.5) * 0.48 * move + savor * 0.5 - bad * 0.6;
  pose.headYaw = turn * 0.16 + scan * 0.055;
  pose.headPitch = -look * 0.075 + (chewing ? Math.sin(chewPhase * Math.PI * 4) * 0.022 * savor : 0) + bad * 0.065 + sad * 0.035;
  pose.headRoll = (-turn * 0.045 + scan * 0.034 + Math.sin(time * 1.1) * 0.008 * idle
    + Math.sin(gait - 0.45) * 0.015 * move + bad * Math.sin(reactionPhase * Math.PI * 3) * 0.035 + sad * 0.045) * edgeBlend;
  const blinkTime = time % 12.9;
  pose.blink = Math.max(pugPoseBlink(blinkTime, 2.85), pugPoseBlink(blinkTime, 7.45), pugPoseBlink(blinkTime, 7.78));
  pose.eyeOpen = Math.max(0.035, (1 - pose.blink) * (0.97 + look * 0.025 - joy * 0.18 - bad * 0.08 - sad * 0.05));
  pose.eyeX = pugPoseClamp((signal.gazeX ?? 0) * 1.1 + scan * 0.65, -1.4, 1.4);
  pose.eyeY = pugPoseClamp(-(signal.gazeY ?? 0) * 1.05, -1.2, 1.2);
  pose.browLift = look * 0.6 + joy * 0.5 + sad * 0.4;
  pose.browTilt = sad * 0.07 + bad * 0.06 - joy * 0.025;
  pose.earPitch = Math.sin(time * 2.25 - 0.35) * 0.012 * idle + Math.sin(gait - 0.8) * 0.045 * move + earFlick * 0.06;
  pose.earFold = joy * 0.05 - bad * 0.055 - sad * 0.025;
  pose.tail = (signal.tailSwing ?? 0) * 0.35 + Math.sin(time * 3.2) * 0.025
    + joy * Math.sin(time * 17) * 0.09 + move * Math.sin(gait - 0.6) * 0.055;
  pose.cloth = (signal.lean ?? 0) * 0.6 + Math.sin(gait - 1) * move * 0.025;
  pose.chew = savor * (0.45 + Math.sin(chewPhase * Math.PI * 3.5) ** 2 * 1.45);
  pose.jawSide = chewing ? Math.sin(chewPhase * Math.PI * 4) * savor * 0.45 : 0;
  pose.smile = joy * 0.06 - bad * 0.06 - sad * 0.04;
  pose.tongue = chewing ? pugPosePulse(chewPhase, 0.72, 0.25) : bad * 0.35;
  pose.leftStep = Math.sin(gait) * move;
  pose.rightStep = -pose.leftStep;
  // The wisps occupy less than one second of a 17.4-second idle cycle.
  // Their pose is derived from the frozen game clock, so pause/re-render cannot emit extras.
  const exhale = time % 17.4 - 5.2;
  pose.exhale = exhale;
  pose.breathOpacity = (mode === "menu" || running) && reactionTime === 0 && !chewing && move < 0.12 && !signal.hasTarget
    ? pugPosePulse(exhale, 0, 0.9) * 0.085 * idle : 0;
  return pose;
}

function animatePugModel(hero, signal) {
  const parts = hero.userData;
  const pose = samplePugPose(signal, parts.pose);
  parts.body.position.y = pose.bodyY;
  parts.body.rotation.z = pose.bodyRoll;
  const width = 1 / Math.sqrt(pose.stretch);
  parts.body.scale.set(width, pose.stretch, width);
  parts.torso.scale.set(33 * (1 + pose.breath * 0.006), 35 * (1 + pose.breath * 0.008), 26 * (1 + pose.breath * 0.01));
  parts.head.position.y = 92 + pose.headY;
  parts.head.position.z = 6 - pose.bad * 1.5;
  parts.head.rotation.set(pose.headPitch, pose.headYaw, pose.headRoll);
  parts.tail.rotation.z = pose.tail;
  parts.cloth.rotation.z = pose.cloth;
  const sinRoll = Math.sin(pose.bodyRoll), cosRoll = Math.cos(pose.bodyRoll);
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;
    const step = i ? pose.rightStep : pose.leftStep;
    const lift = Math.max(0, step) ** 2 * 4.2;
    const paw = parts.paws[i];
    paw.position.z = 19 + step * 1.4;
    paw.rotation.x = step * 0.065;
    // Solve the lowest point of the rounded foot after body roll/squash and ankle flex.
    // The supporting paw stays on the floor, rather than following a floating body bob.
    const sinAnkle = Math.sin(paw.rotation.x), cosAnkle = Math.cos(paw.rotation.x);
    const footRadius = Math.hypot(sinRoll * width * 10, cosRoll * pose.stretch * cosAnkle * 6,
      cosRoll * pose.stretch * sinAnkle * 12);
    paw.position.y = (lift - pose.bodyY - sinRoll * width * side * 16.5 + footRadius)
      / (cosRoll * pose.stretch) + 21 * cosAnkle + 5 * sinAnkle;
    const hind = parts.hindPaws[i];
    const hindLift = Math.max(0, -step) ** 2 * 1.6;
    const hindRadius = Math.hypot(sinRoll * width * 10, cosRoll * pose.stretch * 5.3);
    hind.position.y = (hindLift - pose.bodyY - sinRoll * width * side * 27 + hindRadius) / (cosRoll * pose.stretch);
    hind.position.z = 8 - step * 0.6;
    parts.contacts[i].position.x = cosRoll * width * side * 16.5
      - sinRoll * pose.stretch * (paw.position.y - 21 * cosAnkle - 5 * sinAnkle);
    parts.contacts[i].scale.x = 23 - lift;
    parts.contacts[i].material.opacity = 0.24 * (1 - pugPoseSmooth(lift / 4.2));
    const eye = parts.eyes[i];
    // Close the complete eye opening, including its dark rim, not only the iris.
    eye.scale.y = pose.eyeOpen * eye.userData.openHeight;
    eye.visible = pose.blink < 0.97;
    eye.userData.gaze.position.x = pose.eyeX;
    eye.userData.gaze.position.y = -0.25 + pose.eyeY;
    parts.lids[i].visible = pose.blink > 0.87;
    parts.brows[i].position.y = 17.6 + pose.browLift;
    parts.brows[i].rotation.z = side * pose.browTilt;
    parts.ears[i].rotation.set(pose.earPitch, side * pose.earFold * 0.6, side * pose.earFold);
    parts.smiles[i].rotation.z = side * pose.smile;
  }
  parts.muzzle.scale.set(20.5 * (1 + pose.chew * 0.012), 9.2 * (1 - pose.chew * 0.012), 6.4);
  parts.muzzle.position.y = -6 + pose.joy * 0.5;
  parts.jaw.position.set(pose.jawSide, -13.5 - pose.chew, 28.5);
  parts.mouth.scale.y = 2.4 * (0.28 + pose.chew * 0.28);
  parts.tongue.visible = pose.tongue > 0.04;
  parts.tongue.scale.y = 2.4 * pose.tongue;
  parts.tongue.position.y = -13.5 - pose.chew * 0.5;
  parts.shadow.scale.x = 89 + pose.bodyY * 0.65;
  parts.shadow.material.opacity = 0.24 - pose.bodyY * 0.012;
  for (let i = 0; i < 2; i++) {
    const puff = parts.breath[i];
    const age = Math.max(0, Math.min(1, (pose.exhale - i * 0.13) / 0.9));
    puff.visible = pose.breathOpacity > 0.002 && age > 0 && age < 1;
    puff.material.opacity = pose.breathOpacity * (i ? 0.6 : 1);
    puff.position.set(3 + age * 7 + i * 3, -13 + age * 5 + i * 1.5, 41 + i);
    puff.scale.set(7 + age * 9, 5 + age * 7, 1);
  }
  return pose;
}
