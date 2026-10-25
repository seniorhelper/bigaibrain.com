/* Big AI Brain mission: "A clean home that grows" (Oct 24 2026). No libraries.
   A VISION, not a built place. Four phases, each one bigger with new zero-carbon features.
   The whole scene is made of dots: each phase is drawn off-screen, sampled into dots, and the dots
   fly to their new spots when the home grows. Swipe the scene, tap the glowing rings, or use the buttons.
   Mount: <div data-clean-home></div> plus the .ch-* markup in mission/index.html.
   prefers-reduced-motion: no morphing, the dots jump straight to each phase. */
(function () {
  "use strict";
  var root = document.querySelector("[data-clean-home]");
  if (!root) return;
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var VW = 1000, VH = 600, GROUND = 430;
  var C = { sun: "#ffd54a", compute: "#a78bfa", leaf: "#4ade80", water: "#38bdf8", heat: "#fb923c", wind: "#e2e8f0", soil: "#6ee7b7", home: "#fda4af", panel: "#60a5fa" };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var ease = function (s) { return s * s * (3 - 2 * s); };

  /* ---------------- the four phases ---------------- */
  var PHASES = [
    { name: "Seedling", tag: "Where we are today", cam: { x: 500, y: 390, z: 2.6 },
      blurb: "Today the brain lives on one small rented server and studies for about 5 minutes a night, then rests. It has about 1.2 million connections. A big chatbot has billions. Small and efficient is where clean starts.",
      feats: ["One small server, resting most of the day", "About 5 minutes of study a night", "Next step: a host that runs on clean power every hour"] },
    { name: "Grove", tag: "Its own small home", cam: { x: 500, y: 384, z: 1.75 },
      blurb: "When the brain needs its own building, it only gets one if the clean power comes first. Solar panels shade a garden, a battery covers the night, and the warm air from the computers heats a greenhouse.",
      feats: ["Solar panels over a vegetable garden (shade + power)", "Battery for night-time study", "Living roof and rain catchers", "Computer heat warms a greenhouse"] },
    { name: "Village", tag: "Sharing with neighbors", cam: { x: 520, y: 372, z: 1.22 },
      blurb: "Bigger brain, bigger give-back. Slow, bird-friendly wind turbines join the sun. Pipes in the ground keep the computers cool without using drinking water, and leftover heat warms homes and a school.",
      feats: ["Bird-friendly wind turbines", "Ground-loop cooling: no drinking water used", "Heat shared with homes and a school", "Neighbors co-own the solar", "Repair shop: old computer parts get a second life"] },
    { name: "Watershed", tag: "A whole region, better off", cam: { x: 500, y: 392, z: 0.9 },
      blurb: "The big dream: a home that leaves its whole valley better than it found it. A water battery stores power for days, wetlands and wildlife come back, a public sign shows the real numbers every hour, and part of what it earns helps feed people.",
      feats: ["Water battery: pumps water uphill on sunny days, makes power at night", "Wetland and a wildlife path brought back", "A public sign with the real numbers, every hour", "Gives power back to the town on hot days", "Part of every dollar earned helps feed people"] }
  ];
  // glowing rings you can tap: world position, the phase it appears in, and what it says
  var SPOTS = [
    { p: 0, x: 500, y: 402, t: "The tiny server", d: "This is the brain today: one small rented machine. It does most of its learning in a few minutes each night, which is a very small amount of electricity." },
    { p: 0, x: 500, y: 368, t: "Clean power, every hour", d: "The goal is power that is clean every single hour, not just on paper at the end of the year. That's harder, and it's the honest way to do it." },
    { p: 1, x: 330, y: 372, t: "Solar over the garden", d: "Panels on tall frames make power and give the vegetables some shade on hot days. Same land, two jobs." },
    { p: 1, x: 640, y: 392, t: "Free heat for plants", d: "Computers make warm air. Instead of blowing it away, it goes into a greenhouse so food can grow all winter." },
    { p: 1, x: 425, y: 418, t: "The night battery", d: "Sunshine saved in a battery, so the brain can study at night without burning anything." },
    { p: 2, x: 170, y: 230, t: "Bird-friendly wind", d: "Turbines that spin slowly and are placed away from bird paths, with radar that can pause them when flocks fly by." },
    { p: 2, x: 520, y: 490, t: "Cooling with the ground", d: "About 100 feet down, the ground stays cool all year. Water in sealed pipes carries the heat down there, so no drinking water gets used up." },
    { p: 2, x: 820, y: 404, t: "Warm homes, shared", d: "Leftover heat travels through pipes to nearby homes and a school, so they need less gas in winter." },
    { p: 2, x: 700, y: 418, t: "The repair shop", d: "Old computer parts get fixed and reused first, and recycled last. Building new chips takes a lot of energy, so keeping them running longer counts." },
    { p: 3, x: 100, y: 330, t: "The water battery", d: "On sunny, windy days, extra power pumps water up the hill. At night it flows back down through a turbine and makes power again. It can store energy for days." },
    { p: 3, x: 300, y: 520, t: "Wetland and wildlife", d: "The stream gets its wetland back, and a strip of wild land lets deer, birds and bees move through safely." },
    { p: 3, x: 372, y: 279, t: "The honest sign", d: "A big public sign shows the real power, water and heat numbers every hour. If a number is bad, it shows that too. No made-up numbers, ever." },
    { p: 3, x: 640, y: 300, t: "Helping feed people", d: "Part of what the brain's home earns goes to food programs. Growing something smart should help with real problems like hunger." }
  ];
  // things that move along paths in each phase (power, heat, water)
  var FLOWS = [
    { p: 1, c: C.heat, pts: [[560, 400], [600, 396], [632, 402]] },
    { p: 1, c: C.sun, pts: [[330, 350], [380, 380], [430, 412]] },
    { p: 2, c: C.water, pts: [[470, 440], [470, 500], [570, 500], [570, 440]] },
    { p: 2, c: C.heat, pts: [[600, 445], [700, 452], [800, 452], [900, 446]] },
    { p: 2, c: C.sun, pts: [[170, 250], [170, 430], [420, 430]] },
    { p: 3, c: C.water, pts: [[110, 312], [140, 380], [190, 440], [260, 470]] },
    { p: 3, c: C.sun, pts: [[430, 430], [640, 300], [860, 380]] }
  ];

  /* ---------------- drawing each phase into a stencil ---------------- */
  function poly(c, pts, fill, stroke, lw) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
  function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function line(c, x1, y1, x2, y2, col, lw) { c.strokeStyle = col; c.lineWidth = lw || 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function tree(c, x, y, s) { rect(c, x - 2 * s, y - 14 * s, 4 * s, 14 * s, C.soil); c.fillStyle = C.leaf; c.beginPath(); c.arc(x, y - 22 * s, 11 * s, 0, 6.283); c.fill(); }
  function house(c, x, y, w, col) { rect(c, x, y - w * 0.7, w, w * 0.7, col); poly(c, [[x - 3, y - w * 0.7], [x + w / 2, y - w * 1.15], [x + w + 3, y - w * 0.7]], col); rect(c, x + w * 0.4, y - w * 0.3, w * 0.2, w * 0.3, "#0b1a2a"); }
  function tower(c, x, top) { line(c, x, GROUND, x, top, C.wind, 3); c.fillStyle = C.wind; c.beginPath(); c.arc(x, top, 4, 0, 6.283); c.fill(); }
  function panels(c, x, y, w, rows) { for (var r = 0; r < rows; r++) { poly(c, [[x, y + r * 10], [x + w, y + r * 10 - 6], [x + w, y + r * 10 - 1], [x, y + r * 10 + 5]], C.panel); } }

  function drawPhase(c, k) {
    // ground everyone shares
    c.fillStyle = C.soil; for (var x = 0; x < VW; x += 3) c.fillRect(x, GROUND, 2, 2);
    if (k >= 3) { // hills, ponds, river, wildlife
      poly(c, [[0, GROUND], [0, 320], [70, 290], [170, 300], [260, 360], [330, GROUND]], null, C.soil, 2);
      poly(c, [[60, 300], [150, 300], [140, 312], [70, 312]], C.water);
      poly(c, [[220, 455], [330, 455], [320, 470], [230, 470]], C.water);
      line(c, 110, 312, 260, 462, C.water, 2);
      c.strokeStyle = C.water; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 540); c.bezierCurveTo(200, 500, 380, 560, 560, 530); c.bezierCurveTo(740, 500, 860, 560, 1000, 535); c.stroke();
      for (var w = 0; w < 18; w++) { var wx = 160 + w * 22; line(c, wx, 520 + (w % 3) * 6, wx + 2, 505 + (w % 3) * 6, C.leaf, 2); }
      [[380, 425], [410, 428]].forEach(function (d) { rect(c, d[0], d[1] - 12, 18, 8, "#d6b88a"); line(c, d[0] + 2, d[1] - 4, d[0] + 2, d[1], "#d6b88a", 2); line(c, d[0] + 15, d[1] - 4, d[0] + 15, d[1], "#d6b88a", 2); line(c, d[0] + 18, d[1] - 12, d[0] + 22, d[1] - 20, "#d6b88a", 2); });
      rect(c, 340, 262, 64, 34, C.compute); line(c, 372, 296, 372, GROUND, C.wind, 2); // public sign
      for (var b = 0; b < 5; b++) { var bx = 600 + b * 16; rect(c, bx, 300 - (b % 2) * 6, 3, 3, C.home); } // food heart dots
      c.fillStyle = C.home; c.beginPath(); c.arc(634, 300, 9, Math.PI, 0); c.arc(652, 300, 9, Math.PI, 0); c.lineTo(643, 318); c.closePath(); c.fill();
      for (var t3 = 0; t3 < 6; t3++) tree(c, 40 + t3 * 50, GROUND, 0.9);
      for (var h3 = 0; h3 < 4; h3++) house(c, 960 + h3 * 34 - 120, 600 - 40, 22, C.home);
    }
    if (k >= 2) { // turbines, homes, school, ground loops, heat pipes, repair shop
      tower(c, 170, 230); tower(c, 860, 250); tower(c, 940, 270);
      for (var h = 0; h < 4; h++) house(c, 760 + h * 46, GROUND, 30, C.home);
      rect(c, 690, 396, 30, 34, C.compute); poly(c, [[686, 396], [705, 384], [724, 396]], C.compute); // repair shop
      c.setLineDash([6, 6]); c.strokeStyle = C.water; c.lineWidth = 2;
      for (var g = 0; g < 4; g++) { c.beginPath(); c.moveTo(470 + g * 34, GROUND + 6); c.lineTo(470 + g * 34, 500); c.stroke(); }
      c.strokeStyle = C.heat; c.beginPath(); c.moveTo(600, 446); c.lineTo(950, 446); c.stroke(); c.setLineDash([]);
      for (var t2 = 0; t2 < 3; t2++) tree(c, 250 + t2 * 26, GROUND, 0.8);
    }
    if (k >= 1) { // building with a living roof, solar garden, greenhouse, battery
      rect(c, 420, 350, 140, 80, C.compute);
      for (var lr = 0; lr < 140; lr += 6) rect(c, 420 + lr, 344 + (lr % 12 === 0 ? 0 : 2), 4, 6, C.leaf);
      for (var wi = 0; wi < 4; wi++) rect(c, 434 + wi * 32, 370, 16, 10, "#0b1a2a");
      for (var col = 0; col < 3; col++) { line(c, 290 + col * 40, GROUND, 290 + col * 40, 360, C.wind, 2); panels(c, 276 + col * 40, 354, 30, 1); }
      for (var row = 0; row < 4; row++) rect(c, 280 + row * 30, GROUND - 6, 18, 6, C.leaf);
      poly(c, [[600, GROUND], [600, 392], [640, 366], [680, 392], [680, GROUND]], null, C.leaf, 2);
      rect(c, 410, 404, 26, 26, C.sun);
      rect(c, 566, 412, 16, 18, C.water); // rain tank
    }
    // phase 1: the tiny hut that started it all (always there)
    rect(c, 482, 396, 36, 34, C.compute); poly(c, [[476, 396], [500, 376], [524, 396]], C.panel);
    for (var bl = 0; bl < 3; bl++) rect(c, 488 + bl * 9, 408, 5, 3, C.sun); // server lights
    tree(c, 548, GROUND, 1); tree(c, 452, GROUND, 0.7);
  }

  /* ---------------- sampling stencils into dots ---------------- */
  var S_W = 500, S_H = 300; // stencil resolution (half of the view)
  function camXf(c, cam, w, h) { var s = (w / VW) * cam.z; c.setTransform(s, 0, 0, s, w / 2 - cam.x * s, h * 0.62 - cam.y * s); }
  function sample(k, n) {
    var cv = document.createElement("canvas"); cv.width = S_W; cv.height = S_H;
    var c = cv.getContext("2d", { willReadFrequently: true });
    camXf(c, PHASES[k].cam, S_W, S_H); drawPhase(c, k);
    var d = c.getImageData(0, 0, S_W, S_H).data, px = [];
    for (var i = 0; i < S_W * S_H; i++) if (d[i * 4 + 3] > 90) px.push(i);
    var out = new Float32Array(n * 2), colr = new Uint8Array(n * 3), order = [];
    for (var j = 0; j < n; j++) { var p = px[(Math.random() * px.length) | 0] || 0; order.push([p, ((p % S_W) + Math.random()) / S_W, (((p / S_W) | 0) + Math.random()) / S_H]); }
    order.sort(function (a, b) { return a[1] - b[1]; }); // left to right, so dots travel short paths between phases
    order.forEach(function (o, i) { out[i * 2] = o[1]; out[i * 2 + 1] = o[2]; colr[i * 3] = d[o[0] * 4]; colr[i * 3 + 1] = d[o[0] * 4 + 1]; colr[i * 3 + 2] = d[o[0] * 4 + 2]; });
    return { pos: out, col: colr };
  }

  /* ---------------- live scene ---------------- */
  var cv = root.querySelector("canvas"), ctx = cv.getContext("2d"), W = 0, H = 0, dpr = 1;
  var n = 0, SH = [], P, V, from = 0, to = 0, m = 1, cur = 0, started = false, raf = 0, vis = false;
  var ptr = { x: -999, y: -999, on: false, vx: 0, vy: 0, downX: 0, down: false };
  var btns = [].slice.call(document.querySelectorAll(".ch-step")), info = document.querySelector(".ch-info");
  var spotCard = document.querySelector(".ch-spot"), growBtn = document.querySelector(".ch-grow");
  var shown = [];

  function budget() { var w = innerWidth, k = w < 600 ? 0.5 : w < 1000 ? 0.75 : 1; var c = navigator.hardwareConcurrency || 4; if (c <= 2) k *= 0.6; return Math.round(3200 * k); }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (RM && started) draw(0, 0);
  }
  function cam() { var A = PHASES[from].cam, B = PHASES[to].cam, e = ease(m); return { x: A.x + (B.x - A.x) * e, y: A.y + (B.y - A.y) * e, z: A.z + (B.z - A.z) * e }; }
  function toScreen(x, y, c) { var s = (W / VW) * c.z; return [W / 2 + (x - c.x) * s, H * 0.62 + (y - c.y) * s]; }

  function go(k, quiet) {
    k = clamp(k, 0, PHASES.length - 1); if (k === to && m >= 1) { render(k); return; }
    from = RM ? k : (m >= 1 ? to : to); to = k; m = RM ? 1 : 0; cur = k; render(k);
    if (!quiet && root.scrollIntoView && root.getBoundingClientRect().top < -40) root.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "center" });
    if (RM) draw(0, 0);
  }
  function render(k) {
    btns.forEach(function (b, i) { b.classList.toggle("on", i === k); b.setAttribute("aria-pressed", i === k ? "true" : "false"); });
    var ph = PHASES[k], newOnes = ph.feats;
    if (info) {
      info.innerHTML = "<p class=\"ch-tag\">Phase " + (k + 1) + " of 4 · " + ph.tag + "</p><h3>" + ph.name + "</h3><p>" + ph.blurb + "</p><ul>" +
        newOnes.map(function (f) { return "<li><span>NEW</span>" + f + "</li>"; }).join("") + "</ul>";
    }
    if (growBtn) growBtn.textContent = k < PHASES.length - 1 ? "🌱 Grow it to phase " + (k + 2) : "↺ Start again from the seedling";
    if (spotCard) { spotCard.hidden = true; }
  }
  btns.forEach(function (b, i) { b.addEventListener("click", function () { go(i, true); }); });
  if (growBtn) growBtn.addEventListener("click", function () { go(cur < PHASES.length - 1 ? cur + 1 : 0, true); });
  root.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { go(cur + 1, true); e.preventDefault(); } if (e.key === "ArrowLeft") { go(cur - 1, true); e.preventDefault(); } });

  // swipe left / right to grow or shrink; moving over the dots stirs them
  cv.addEventListener("pointerdown", function (e) { ptr.down = true; ptr.downX = e.clientX; });
  cv.addEventListener("pointermove", function (e) {
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    ptr.vx = x - ptr.x; ptr.vy = y - ptr.y; ptr.x = x; ptr.y = y; ptr.on = true;
    cv.style.cursor = hit(x, y) ? "pointer" : "grab";
  });
  cv.addEventListener("pointerleave", function () { ptr.on = false; ptr.down = false; });
  cv.addEventListener("pointerup", function (e) {
    var dx = e.clientX - ptr.downX; ptr.down = false;
    if (Math.abs(dx) > 60) { go(cur + (dx < 0 ? 1 : -1), true); return; }
    var r = cv.getBoundingClientRect(), s = hit(e.clientX - r.left, e.clientY - r.top);
    if (s && spotCard) { spotCard.hidden = false; spotCard.innerHTML = "<b>" + s.t + "</b><span>" + s.d + "</span>"; }
  });
  function hit(x, y) {
    var c = cam(), best = null, bd = 26 * 26;
    SPOTS.forEach(function (s) { if (s.p > to) return; var q = toScreen(s.x, s.y, c), d = (q[0] - x) * (q[0] - x) + (q[1] - y) * (q[1] - y); if (d < bd) { bd = d; best = s; } });
    return best;
  }

  function start() {
    if (started) return; started = true;
    n = budget(); SH = PHASES.map(function (_, k) { return sample(k, n); });
    P = new Float32Array(n * 2); V = new Float32Array(n * 2);
    resize();
    for (var i = 0; i < n; i++) { P[i * 2] = Math.random() * W; P[i * 2 + 1] = Math.random() * H; }
    if (RM) { m = 1; draw(0, 0); return; }
    sync();
  }
  function lerpPath(pts, t) {
    var L = [], tot = 0; for (var i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
    var d = t * tot; for (i = 0; i < L.length; i++) { if (d <= L[i]) { var f = d / L[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; } d -= L[i]; }
    return pts[pts.length - 1];
  }
  var last = 0;
  function draw(t, dt) {
    if (!W) return;
    if (m < 1) m = Math.min(1, m + dt * 0.75);
    var A = SH[from], B = SH[to], e = ease(m), burst = Math.sin(e * Math.PI) * 0.06, k = RM ? 1 : 1 - Math.exp(-dt * 7);
    ctx.clearRect(0, 0, W, H);
    // sky glow and a sun that brightens as the home grows
    var sunX = W * 0.86, sunY = H * 0.16, sr = Math.min(W, H) * (0.07 + to * 0.012);
    var g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sr * 4); g.addColorStop(0, "rgba(255,213,74,.5)"); g.addColorStop(1, "rgba(255,213,74,0)");
    ctx.fillStyle = g; ctx.fillRect(sunX - sr * 4, sunY - sr * 4, sr * 8, sr * 8);
    ctx.fillStyle = "rgba(255,225,120,.95)"; ctx.beginPath(); ctx.arc(sunX, sunY, sr * 0.5, 0, 6.283); ctx.fill();
    // the dots
    ctx.globalCompositeOperation = "lighter";
    var z = W < 600 ? 1.6 : 2;
    for (var i = 0, j = 0; i < n; i++, j += 2) {
      var ax = A.pos[j], ay = A.pos[j + 1], bx = B.pos[j], by = B.pos[j + 1], a = i * 2.399;
      var tx = (ax + (bx - ax) * e + Math.cos(a) * burst) * W, ty = (ay + (by - ay) * e + Math.sin(a) * burst) * H;
      tx += Math.sin(t * 1.1 + a) * 0.8; ty += Math.cos(t * 1.3 + a) * 0.8;
      if (ptr.on) { var dx = P[j] - ptr.x, dy = P[j + 1] - ptr.y, dd = dx * dx + dy * dy; if (dd < 4200) { var f = 1 - dd / 4200; V[j] += (dx * 0.05 + ptr.vx * 0.12) * f; V[j + 1] += (dy * 0.05 + ptr.vy * 0.12) * f; } }
      V[j] = (V[j] + (tx - P[j]) * k) * 0.82; V[j + 1] = (V[j + 1] + (ty - P[j + 1]) * k) * 0.82;
      P[j] += V[j]; P[j + 1] += V[j + 1];
      var ci = i * 3, ca = from === to ? B.col : (e < 0.5 ? A.col : B.col), sp = Math.min(1, Math.hypot(V[j], V[j + 1]) * 0.15);
      ctx.fillStyle = "rgba(" + ca[ci] + "," + ca[ci + 1] + "," + ca[ci + 2] + "," + (0.55 + sp * 0.4) + ")";
      ctx.fillRect(P[j] - z / 2, P[j + 1] - z / 2, z + sp * 2, z + sp * 2);
    }
    ptr.vx *= 0.8; ptr.vy *= 0.8;
    var c = cam();
    // spinning blades (phase 3+)
    if (to >= 2 && e > 0.6) {
      ctx.strokeStyle = "rgba(226,232,240," + (0.5 + (e - 0.6)) + ")"; ctx.lineWidth = 2;
      [[170, 230], [860, 250], [940, 270]].forEach(function (h, hi) {
        var q = toScreen(h[0], h[1], c), L = 34 * (W / VW) * c.z, rot = t * (0.9 + hi * 0.15);
        for (var b = 0; b < 3; b++) { var an = rot + b * 2.094; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + Math.cos(an) * L, q[1] + Math.sin(an) * L); ctx.stroke(); }
      });
    }
    // power, heat and water on the move
    FLOWS.forEach(function (fl, fi) {
      if (fl.p > to || (fl.p === to && e < 0.7)) return;
      for (var d2 = 0; d2 < 4; d2++) {
        var pt = lerpPath(fl.pts, ((t * 0.25 + d2 / 4 + fi * 0.13) % 1)), q = toScreen(pt[0], pt[1], c);
        var gg = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 6); gg.addColorStop(0, fl.c); gg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gg; ctx.fillRect(q[0] - 6, q[1] - 6, 12, 12);
      }
    });
    ctx.globalCompositeOperation = "source-over";
    // tap-me rings
    if (e > 0.85) SPOTS.forEach(function (s, si) {
      if (s.p > to) return;
      var q = toScreen(s.x, s.y, c), pulse = (t * 0.9 + si * 0.21) % 1;
      ctx.strokeStyle = "rgba(255,255,255," + (0.9 - pulse * 0.8) + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(q[0], q[1], 6 + pulse * 12, 0, 6.283); ctx.stroke();
      ctx.fillStyle = s.p === to ? "#ffd54a" : "#ffffff"; ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 6.283); ctx.fill();
    });
  }
  function frame(ts) { var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts; draw(ts / 1000, dt); raf = requestAnimationFrame(frame); }
  function sync() { var on = vis && !document.hidden && started && !RM; if (on && !raf) { last = 0; raf = requestAnimationFrame(frame); } else if (!on && raf) { cancelAnimationFrame(raf); raf = 0; } }
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", sync);
  render(0);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; if (vis) start(); sync(); }, { rootMargin: "200px 0px" }).observe(root);
  } else { vis = true; start(); }
})();
