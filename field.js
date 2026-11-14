// Brand motif: a scattered dot field that resolves into a grid. Decorative only.
(() => {
  const canvas = document.getElementById("field");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  // No animation for reduced motion, or when the page loads in a background tab.
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden;
  let dots = [];
  let started = 0;

  function layout() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const gap = 34;
    const startX = Math.max(width * 0.52, width - 520);
    dots = [];
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = gap; y < height - gap / 2; y += gap) {
      for (let x = startX; x < width - gap / 2; x += gap) {
        dots.push({ x, y, fromX: random() * width, fromY: random() * height, amber: random() < 0.06 });
      }
    }
  }

  function paint(eased) {
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    for (const dot of dots) {
      const x = dot.fromX + (dot.x - dot.fromX) * eased;
      const y = dot.fromY + (dot.y - dot.fromY) * eased;
      context.beginPath();
      context.arc(x, y, dot.amber ? 3 : 2, 0, Math.PI * 2);
      context.fillStyle = dot.amber ? "#ffb020" : "rgba(201, 206, 214, 0.45)";
      context.fill();
    }
  }

  function animate(now) {
    if (!started) started = now;
    const progress = Math.min((now - started) / 2200, 1);
    paint(1 - Math.pow(1 - progress, 3));
    if (progress < 1) requestAnimationFrame(animate);
  }

  layout();
  // Paint the resolved grid first, so the page is complete even if no frame ever runs.
  paint(1);
  if (!still) requestAnimationFrame(animate);
  addEventListener("resize", () => { layout(); paint(1); });
})();
