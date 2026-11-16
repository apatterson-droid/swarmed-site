// Hero illustration of how a run flows: records leave the client's systems, the role-agents write
// findings, the verifier passes or rejects each one, verified findings land in the report.
// It is a drawing of docs/ARCHITECTURE.md, not data: nothing here is fetched, counted or measured.
(() => {
  const box = document.getElementById("swarm-viz");
  const canvas = box && box.querySelector("canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  const PAPER = "246,243,236", MUTED = "201,206,214", AMBER = "255,176,32", TEAL = "47,208,192", RED = "255,122,126";
  // Positions are fractions of the box, so the HTML labels in index.html line up at any size.
  const SOURCES = [[0.30, 0.11], [0.29, 0.24], [0.28, 0.37], [0.27, 0.50], [0.28, 0.63], [0.29, 0.76], [0.30, 0.89]];
  const HUB = [0.5, 0.5];
  const GATE = 0.72;
  const REPORT = { x: 0.84, y: 0.3, w: 0.13, h: 0.4 };
  const SLOTS = 5;

  let W = 0, H = 0, M = 0, time = 0, pulse = 0, nextRecord = 0, nextFinding = 0.8, reportClear = 0;
  let records = [], findings = [], lines = [], motes = [];
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ease = (u) => u * u * (3 - 2 * u);
  const dot = (x, y, r, rgb, alpha) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},${alpha})`;
    ctx.fill();
  };

  for (let i = 0; i < 64; i++) {
    motes.push({ radius: 0.2 + random() * 0.42, angle: random() * Math.PI * 2, amber: random() < 0.14, size: 0.6 + random() * 0.9 });
  }

  function agent(index, at) {
    const angle = at * 0.55 + (index * Math.PI) / 3;
    return [HUB[0] * W + Math.cos(angle) * M * 0.125, HUB[1] * H + Math.sin(angle) * M * 0.125];
  }

  function slot(index) {
    return [(REPORT.x + 0.025) * W, (REPORT.y + 0.07 + index * 0.066) * H];
  }

  function step(dt) {
    time += dt;
    pulse = Math.max(0, pulse - dt * 2.2);
    for (const mote of motes) mote.angle += (dt * 0.05) / mote.radius;

    if (time >= nextRecord) {
      nextRecord = time + 0.16 + random() * 0.2;
      records.push({ source: Math.floor(random() * SOURCES.length), bend: (random() - 0.5) * 0.36, u: 0, speed: 0.5 + random() * 0.25 });
    }
    for (const record of records) record.u += dt * record.speed;
    records = records.filter((record) => {
      if (record.u < 1) return true;
      pulse = Math.min(1, pulse + 0.35);
      return false;
    });

    const waiting = findings.filter((finding) => finding.state !== "reject").length + lines.length;
    if (time >= nextFinding && !reportClear && waiting < SLOTS) {
      nextFinding = time + 1 + random() * 0.6;
      const from = agent(Math.floor(random() * 6), time);
      findings.push({ state: "fly", u: 0, from, gateY: 0.32 + random() * 0.36, pass: random() > 0.3, x: from[0], y: from[1], trail: [] });
    }
    for (const finding of findings) {
      finding.trail.push([finding.x, finding.y]);
      if (finding.trail.length > 12) finding.trail.shift();
      const gateX = GATE * W, gateY = finding.gateY * H;
      if (finding.state === "fly") {
        finding.u += dt / 1.1;
        const u = ease(Math.min(finding.u, 1));
        finding.x = finding.from[0] + (gateX - finding.from[0]) * u;
        finding.y = finding.from[1] + (gateY - finding.from[1]) * u - Math.sin(u * Math.PI) * M * 0.05;
        if (finding.u >= 1) { finding.state = "check"; finding.u = 0; }
      } else if (finding.state === "check") {
        finding.u += dt / 0.7;
        if (finding.u >= 1) {
          finding.state = finding.pass ? "pass" : "reject";
          finding.u = 0;
          if (finding.pass) { finding.slot = lines.length + findings.filter((other) => other.state === "pass" && other !== finding).length; }
        }
      } else if (finding.state === "pass") {
        finding.u += dt / 0.8;
        const u = ease(Math.min(finding.u, 1)), to = slot(finding.slot);
        finding.x = gateX + (to[0] - gateX) * u;
        finding.y = gateY + (to[1] - gateY) * u;
        if (finding.u >= 1) { finding.done = true; lines.push({ born: time }); }
      } else {
        finding.u += dt / 1.3;
        finding.y = gateY + ease(Math.min(finding.u, 1)) * H * 0.1;
        if (finding.u >= 1) finding.done = true;
      }
    }
    findings = findings.filter((finding) => !finding.done);

    // A full page clears and the report starts again.
    if (lines.length >= SLOTS && !reportClear) reportClear = time + 2.2;
    if (reportClear && time >= reportClear) { lines = []; reportClear = 0; nextFinding = time + 0.5; }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const hubX = HUB[0] * W, hubY = HUB[1] * H;

    for (const mote of motes) {
      const x = hubX + Math.cos(mote.angle) * mote.radius * W * 0.62;
      const y = hubY + Math.sin(mote.angle) * mote.radius * H * 0.72;
      if (x < 2 || x > W - 2 || y < 2 || y > H - 2) continue;
      dot(x, y, mote.size, mote.amber ? AMBER : MUTED, mote.amber ? 0.5 : 0.22);
    }

    // Systems, and the paths records take from them.
    SOURCES.forEach(([sx, sy]) => {
      const x = sx * W, y = sy * H;
      ctx.beginPath();
      ctx.arc(x, y, M * 0.024, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${MUTED},.55)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      dot(x, y, M * 0.008, PAPER, 0.9);
    });
    for (const record of records) {
      const [sx, sy] = SOURCES[record.source];
      const x0 = sx * W, y0 = sy * H;
      const cx = (x0 + hubX) / 2, cy = (y0 + hubY) / 2 + record.bend * H;
      for (let k = 0; k < 7; k++) {
        const u = record.u - k * 0.028;
        if (u <= 0.06) break;
        const v = 1 - u;
        const fade = (1 - k / 7) * Math.min(1, (1 - u) * 5);
        dot(v * v * x0 + 2 * v * u * cx + u * u * hubX, v * v * y0 + 2 * v * u * cy + u * u * hubY, k ? 1.3 : 1.9, PAPER, 0.62 * fade);
      }
    }

    // The role-agents: the mark, turning.
    const glow = ctx.createRadialGradient(hubX, hubY, 0, hubX, hubY, M * 0.2);
    glow.addColorStop(0, `rgba(${AMBER},${0.2 + pulse * 0.14})`);
    glow.addColorStop(1, `rgba(${AMBER},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(hubX - M * 0.2, hubY - M * 0.2, M * 0.4, M * 0.4);
    for (let i = 0; i < 6; i++) {
      for (let k = 9; k >= 0; k--) {
        const [x, y] = agent(i, time - k * 0.07);
        dot(x, y, M * 0.03 * (1 - k * 0.07), PAPER, k ? 0.1 * (1 - k / 10) : 1);
      }
    }
    dot(hubX, hubY, M * (0.043 + pulse * 0.006), AMBER, 1);

    // The verifier: a line every finding has to cross.
    ctx.beginPath();
    ctx.setLineDash([4, 6]);
    ctx.moveTo(GATE * W, H * 0.19);
    ctx.lineTo(GATE * W, H * 0.81);
    ctx.strokeStyle = `rgba(${TEAL},.75)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // The report page and the verified lines in it.
    const fade = reportClear ? Math.max(0, Math.min(1, (reportClear - time) / 0.6)) : 1;
    ctx.beginPath();
    ctx.roundRect(REPORT.x * W, REPORT.y * H, REPORT.w * W, REPORT.h * H, 6);
    ctx.strokeStyle = `rgba(${MUTED},.7)`;
    ctx.stroke();
    lines.forEach((line, index) => {
      const [x, y] = slot(index);
      const grow = Math.min(1, (time - line.born) / 0.4);
      dot(x, y, 2.6, TEAL, fade);
      ctx.beginPath();
      ctx.moveTo(x + 7, y);
      ctx.lineTo(x + 7 + (REPORT.w * W - 0.05 * W - 7) * grow * (index % 2 ? 0.7 : 1), y);
      ctx.strokeStyle = `rgba(${MUTED},${0.6 * fade})`;
      ctx.lineCap = "round";
      ctx.stroke();
    });

    for (const finding of findings) {
      const rgb = finding.state === "pass" ? TEAL : finding.state === "reject" ? RED : AMBER;
      const alpha = finding.state === "reject" ? 1 - finding.u : 1;
      finding.trail.forEach(([x, y], index) => dot(x, y, 1.6, rgb, 0.03 * index * alpha));
      if (finding.state === "check") {
        ctx.beginPath();
        ctx.arc(finding.x, finding.y, 4 + finding.u * 9, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${TEAL},${0.8 * (1 - finding.u)})`;
        ctx.stroke();
      }
      dot(finding.x, finding.y, 3.4, rgb, alpha);
    }
  }

  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    W = box.clientWidth;
    H = box.clientHeight;
    M = Math.min(W, H);
    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  let frame = 0, last = 0, visible = true;
  function tick(now) {
    frame = 0;
    // The first frame after a pause only sets the clock; a frame stamp can also sit before the last one.
    if (last) step(Math.max(0, Math.min((now - last) / 1000, 0.05)));
    last = now;
    draw();
    run();
  }
  function run() {
    if (frame) return;
    if (reduce.matches || document.hidden || !visible) { last = 0; return; }
    frame = requestAnimationFrame(tick);
  }

  // Start from a settled mid-run state and paint it once, so the picture is complete with
  // reduced motion, in a background tab, or if no animation frame ever runs.
  W = box.clientWidth; H = box.clientHeight; M = Math.min(W, H);
  for (let i = 0; i < 520; i++) step(0.016);
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(box); else addEventListener("resize", resize);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; run(); }).observe(box);
  }
  document.addEventListener("visibilitychange", run);
  reduce.addEventListener("change", run);
  run();
})();
