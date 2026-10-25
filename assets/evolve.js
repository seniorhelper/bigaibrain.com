/* Big AI Brain: the brain is evolving (Oct 24 2026). No libraries.
   1. A high-tech neural layer glitches through the cartoon brain in patches.
      Every glowing dot is one REAL neuron (from /api/stats), and the patches spread as the real
      neuron count grows toward the 4,096 max. Nothing here is faked or inflated.
   2. A dot field behind the hero that ripples and changes color when you swipe.
   Listens for the "bab:stats" event from app.js. Calls window.BAB_SAY(text) when it has something to say.
   prefers-reduced-motion: one still frame, no loops. */
(function () {
  "use strict";
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BASE = 384, MAX = 4096;
  var BRAIN_D = "M60 160C28 150 26 100 58 86C54 54 90 30 120 44C132 18 178 14 192 40C218 24 258 38 262 70C294 78 302 120 280 140C298 168 274 206 242 204C234 230 196 240 176 222C160 242 120 240 110 216C80 222 52 198 62 176C48 174 46 162 60 160Z";
  var BB = { x: 26, y: 14, w: 276, h: 228 }; // viewBox bbox of the brain outline (refined from getBBox at start)
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var DPR = function () { return Math.min(window.devicePixelRatio || 1, 1.5); };
  // seeded random so the same neuron sits in the same place on every visit
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  // cyan -> violet -> rose (the "high tech" palette), t in 0..1
  var STOPS = [[64, 224, 255], [140, 100, 255], [255, 90, 170]];
  function col(t, a) {
    t = ((t % 1) + 1) % 1; var s = t < 0.5 ? 0 : 1, f = s ? (t - 0.5) / 0.5 : t / 0.5, A = STOPS[s], B = STOPS[s + 1];
    return "rgba(" + Math.round(A[0] + (B[0] - A[0]) * f) + "," + Math.round(A[1] + (B[1] - A[1]) * f) + "," + Math.round(A[2] + (B[2] - A[2]) * f) + "," + a + ")";
  }
  function say(t, ms) { if (window.BAB_SAY) window.BAB_SAY(t, ms); }
  function onScreen(el, cb) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { cb(es[es.length - 1].isIntersecting); }, { rootMargin: "60px 0px" }).observe(el);
  }

  /* ================= 1. the neural layer inside the brain ================= */
  var btn = document.getElementById("brainBtn"), svg = document.getElementById("brain");
  var shape = svg && svg.querySelector(".brain-shape");
  var neurons = BASE, evo = 0, N = [], E = [], pulses = [];
  var cv, ctx, tech, tctx, mask, mctx, W = 0, H = 0, running = false, vis = true;
  var ptr = { x: 0, y: 0, in: false, vx: 0, vy: 0, down: false, lastX: 0, lastY: 0, swipe: 0 };
  var blobs = [], glitchUntil = 0, nextGlitch = 0, hueShift = 0, burstT = 0, lastSwipeSay = 0;
  var brainPath = window.Path2D ? new Path2D(BRAIN_D) : null;
  var FACE = { x: 160, y: 156, rx: 86, ry: 76 }; // keep the face mostly cartoon

  function evoFor(n) { return clamp((n - BASE) / (MAX - BASE), 0, 1); }
  function inBrain(x, y, c) { return c.isPointInPath(brainPath, x, y); }

  function layout(count) {
    // one dot per real neuron, scattered inside the brain outline, with a depth value for a slow 3D turn
    var r = rng(20261012), probe = document.createElement("canvas").getContext("2d"), out = [], tries = 0;
    var show = Math.min(count, MAX);
    while (out.length < show && tries++ < show * 40) {
      var x = BB.x + r() * BB.w, y = BB.y + r() * BB.h;
      if (!inBrain(x, y, probe)) continue;
      // depth: thicker in the middle of the brain, like a real one
      var cx = (x - (BB.x + BB.w / 2)) / (BB.w / 2), cy = (y - (BB.y + BB.h / 2)) / (BB.h / 2);
      var depth = Math.sqrt(Math.max(0, 1 - cx * cx * 0.8 - cy * cy * 0.6)) * (r() < 0.5 ? -1 : 1) * 46;
      out.push({ x: x, y: y, z: depth, ox: 0, oy: 0, vx: 0, vy: 0, h: r(), f: 0, ph: r() * 6.283 });
    }
    N = out;
    // each neuron links to its 2 nearest neighbours (grid buckets keep it fast at 4,096)
    E = []; var G = {}, cs = 18;
    N.forEach(function (p, i) { var k = ((p.x / cs) | 0) + "," + ((p.y / cs) | 0); (G[k] = G[k] || []).push(i); });
    N.forEach(function (p, i) {
      var gx = (p.x / cs) | 0, gy = (p.y / cs) | 0, best = [];
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
        var L = G[(gx + dx) + "," + (gy + dy)]; if (!L) continue;
        for (var j = 0; j < L.length; j++) { var q = N[L[j]]; if (L[j] <= i) continue; var d = (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y); if (d < 420) best.push([d, L[j]]); }
      }
      best.sort(function (a, b) { return a[0] - b[0]; });
      for (var b = 0; b < Math.min(2, best.length); b++) E.push([i, best[b][1]]);
    });
  }

  function makeBlobs() {
    // a few patches where the new brain shows through; more and bigger as it really grows
    var r = rng(77 + Math.round(evo * 1000)), n = 3 + Math.round(evo * 9);
    blobs = [];
    // spread around the edge of the brain (the face in the middle stays cartoon for now)
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 6.283 + r() * 0.5, rx = BB.w * (0.36 - evo * 0.12), ry = BB.h * (0.38 - evo * 0.12);
      blobs.push({ ax: BB.x + BB.w / 2 + Math.cos(a) * rx, ay: BB.y + BB.h * 0.46 + Math.sin(a) * ry, r: 20 + evo * 46 + r() * 12, sp: 0.12 + r() * 0.2, ph: r() * 6.283, amp: 10 + r() * 16 });
    }
  }

  function setup() {
    if (!btn || !svg || !shape || !brainPath) return false;
    try { var b = shape.getBBox(); if (b.width) BB = { x: b.x, y: b.y, w: b.width, h: b.height }; } catch (e) {}
    btn.classList.add("evo-on");
    cv = document.createElement("canvas"); cv.className = "evo-cv"; cv.setAttribute("aria-hidden", "true");
    btn.appendChild(cv); ctx = cv.getContext("2d");
    tech = document.createElement("canvas"); tctx = tech.getContext("2d");
    mask = document.createElement("canvas"); mctx = mask.getContext("2d");
    var lab = document.createElement("p"); lab.className = "evo-label"; lab.id = "evoLabel";
    var card = document.querySelector(".stage-card"); if (card) card.appendChild(lab);
    layout(neurons); makeBlobs(); resize();
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(btn);
    btn.addEventListener("pointermove", onMove);
    btn.addEventListener("pointerenter", function () { ptr.in = true; });
    btn.addEventListener("pointerleave", function () { ptr.in = false; ptr.down = false; });
    btn.addEventListener("pointerdown", function (e) { ptr.down = true; ptr.lastX = e.clientX; ptr.lastY = e.clientY; ptr.swipe = 0; });
    window.addEventListener("pointerup", function () { ptr.down = false; });
    btn.addEventListener("click", function () { burstT = 1; fireMany(14); });
    label();
    return true;
  }
  function resize() {
    if (!cv) return;
    var r = btn.getBoundingClientRect(), d = DPR();
    W = r.width; H = r.height; if (!W || !H) return;
    cv.width = tech.width = Math.round(W * d); cv.height = tech.height = Math.round(H * d);
    // the mask is drawn small and scaled up with smoothing off: chunky pixel edges = the glitch look
    mask.width = Math.max(8, Math.round(W / 5)); mask.height = Math.max(8, Math.round(H / 5));
    if (RM) frame(0, 0.016);
  }
  // map viewBox units to canvas pixels, following the brain's float and stretch animations
  function mapping() {
    var cr = cv.getBoundingClientRect(), sr = shape.getBoundingClientRect();
    var s = sr.width / BB.w, sy = sr.height / BB.h;
    return { s: s, sy: sy, ox: sr.left - cr.left - BB.x * s, oy: sr.top - cr.top - BB.y * sy };
  }
  function onMove(e) {
    var m = mapping(), r = cv.getBoundingClientRect();
    ptr.x = (e.clientX - r.left - m.ox) / m.s; ptr.y = (e.clientY - r.top - m.oy) / m.sy; ptr.in = true;
    var dx = e.clientX - ptr.lastX, dy = e.clientY - ptr.lastY; ptr.lastX = e.clientX; ptr.lastY = e.clientY;
    if (e.pointerType !== "mouse" || ptr.down || Math.abs(dx) + Math.abs(dy) > 18) {
      ptr.vx = dx; ptr.vy = dy; ptr.swipe = Math.min(1, ptr.swipe + (Math.abs(dx) + Math.abs(dy)) / 260);
      hueShift += (Math.abs(dx) + Math.abs(dy)) / 900;
    }
    if (ptr.swipe > 0.85 && Date.now() - lastSwipeSay > 9000) { lastSwipeSay = Date.now(); say(pick(SWIPE_LINES), 2600); }
  }
  function fire(i) { if (!E.length) return; var e = E[i % E.length]; pulses.push({ a: e[0], b: e[1], t: 0, sp: 0.8 + Math.random() * 1.6 }); }
  function fireMany(k) { for (var i = 0; i < k; i++) fire((Math.random() * E.length) | 0); }

  var rot = 0;
  function frame(t, dt) {
    var d = DPR(), m = mapping();
    rot = RM ? 0.25 : Math.sin(t * 0.18) * 0.32;
    var cosr = Math.cos(rot), sinr = Math.sin(rot), cx = BB.x + BB.w / 2;
    // ---- physics: swipe scatters the dots, then they spring home
    var sw = ptr.swipe;
    for (var i = 0; i < N.length; i++) {
      var p = N[i];
      if (ptr.in && sw > 0.05) {
        var ddx = p.x + p.ox - ptr.x, ddy = p.y + p.oy - ptr.y, dd = ddx * ddx + ddy * ddy;
        if (dd < 2600) { var k = (1 - dd / 2600) * sw; p.vx += (ptr.vx * 0.06 + ddx * 0.02) * k; p.vy += (ptr.vy * 0.06 + ddy * 0.02) * k; p.f = Math.min(1, p.f + k); }
      }
      p.vx += -p.ox * 0.06; p.vy += -p.oy * 0.06; p.vx *= 0.86; p.vy *= 0.86;
      p.ox += p.vx; p.oy += p.vy; p.f *= 0.96;
    }
    ptr.swipe *= 0.94; ptr.vx *= 0.8; ptr.vy *= 0.8; burstT *= 0.95;
    // ---- tech layer
    tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, tech.width, tech.height);
    tctx.setTransform(m.s * d, 0, 0, m.sy * d, m.ox * d, m.oy * d);
    tctx.fillStyle = "rgba(9,12,34,.88)"; tctx.fill(brainPath);
    // circuit scanlines
    tctx.save(); tctx.clip(brainPath);
    tctx.fillStyle = "rgba(90,140,255,.07)";
    for (var y = BB.y + ((t * 12) % 6); y < BB.y + BB.h; y += 6) tctx.fillRect(BB.x, y, BB.w, 1.2);
    // links
    var P = function (q) { var x = cx + (q.x - cx) * cosr + q.z * sinr; return [x + q.ox, q.y + q.oy]; };
    tctx.lineWidth = 0.55; tctx.strokeStyle = "rgba(110,170,255,.32)"; tctx.beginPath();
    for (var e = 0; e < E.length; e++) { var a = P(N[E[e][0]]), b = P(N[E[e][1]]); tctx.moveTo(a[0], a[1]); tctx.lineTo(b[0], b[1]); }
    tctx.stroke();
    // neurons: one dot each
    tctx.globalCompositeOperation = "lighter";
    for (i = 0; i < N.length; i++) {
      p = N[i]; var q = P(p), depth = (p.z * cosr - (p.x - cx) * sinr) / 46, rr = 0.9 + 0.5 * (depth + 1) / 2 + p.f * 1.4;
      var tw = 0.55 + 0.45 * Math.sin(t * 2.2 + p.ph);
      tctx.fillStyle = col(p.h * 0.35 + hueShift + p.f * 0.4, 0.45 + 0.4 * tw + p.f * 0.3);
      tctx.fillRect(q[0] - rr / 2, q[1] - rr / 2, rr, rr);
    }
    // signals running along the links
    if (!RM && Math.random() < 0.25 + evo * 0.6 + burstT) fire((Math.random() * E.length) | 0);
    for (var u = pulses.length - 1; u >= 0; u--) {
      var pu = pulses[u]; pu.t += dt * pu.sp; if (pu.t >= 1) { pulses.splice(u, 1); if (Math.random() < 0.35) fire(((Math.random() * E.length) | 0)); continue; }
      var A = P(N[pu.a]), B2 = P(N[pu.b]), x = A[0] + (B2[0] - A[0]) * pu.t, yy = A[1] + (B2[1] - A[1]) * pu.t;
      var g = tctx.createRadialGradient(x, yy, 0, x, yy, 5); g.addColorStop(0, "rgba(255,170,240,.95)"); g.addColorStop(1, "rgba(255,120,220,0)");
      tctx.fillStyle = g; tctx.fillRect(x - 5, yy - 5, 10, 10);
    }
    if (pulses.length > 160) pulses.splice(0, pulses.length - 160);
    tctx.globalCompositeOperation = "source-over"; tctx.restore();
    // ---- mask: where the new brain shows through
    var now = performance.now();
    if (!RM && now > nextGlitch) { glitchUntil = now + 90 + Math.random() * 160; nextGlitch = now + (5200 - evo * 3600) * (0.5 + Math.random()); if (svg) { svg.classList.add("evo-glitch"); setTimeout(function () { svg.classList.remove("evo-glitch"); }, 220); } }
    var mw = mask.width, mh = mask.height, ms = mw / W;
    mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, mw, mh);
    mctx.setTransform(m.s * ms, 0, 0, m.sy * ms, m.ox * ms, m.oy * ms);
    mctx.fillStyle = "#fff";
    blobs.forEach(function (b) {
      var bx = b.ax + Math.sin(t * b.sp + b.ph) * b.amp, by = b.ay + Math.cos(t * b.sp * 0.8 + b.ph) * b.amp * 0.7;
      var br = b.r * (0.8 + 0.2 * Math.sin(t * 0.7 + b.ph));
      mctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 0.35 + b.ph));
      mctx.beginPath(); mctx.ellipse(bx, by, br, br * 0.8, 0, 0, 6.283); mctx.fill();
    });
    mctx.globalAlpha = 1;
    // your finger or mouse is a window into the new brain
    if (ptr.in) { var pr = 26 + evo * 20 + ptr.swipe * 30; mctx.beginPath(); mctx.arc(ptr.x, ptr.y, pr, 0, 6.283); mctx.fill(); }
    // keep the face mostly cartoon
    mctx.globalCompositeOperation = "destination-out"; mctx.globalAlpha = 0.95 - evo * 0.5;
    mctx.beginPath(); mctx.ellipse(FACE.x, FACE.y, FACE.rx, FACE.ry, 0, 0, 6.283); mctx.fill();
    mctx.globalAlpha = 1; mctx.globalCompositeOperation = "source-over";
    // glitch moments: horizontal slices flash through
    if (now < glitchUntil) {
      var gr = rng((now / 60) | 0);
      for (var s2 = 0; s2 < 3 + evo * 6; s2++) mctx.fillRect(BB.x, BB.y + gr() * BB.h, BB.w, 3 + gr() * 9);
    }
    // ---- compose: tech layer, cut by the chunky mask
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.globalCompositeOperation = "destination-in"; tctx.imageSmoothingEnabled = false;
    tctx.drawImage(mask, 0, 0, tech.width, tech.height);
    tctx.globalCompositeOperation = "source-over";
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (now < glitchUntil) { // color-split jitter during a glitch
      ctx.globalAlpha = 0.6; ctx.drawImage(tech, -4 * d, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(tech, 3 * d, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    } else ctx.drawImage(tech, 0, 0);
  }
  function label() {
    var el = document.getElementById("evoLabel"); if (!el) return;
    el.innerHTML = "<b>Evolving " + Math.round(evo * 100) + "%</b> · every glowing dot is one real neuron (" + neurons.toLocaleString("en-US") +
      " of " + MAX.toLocaleString("en-US") + "). Swipe the brain to stir them.";
  }

  /* ================= 2. the dot field behind the hero ================= */
  var hero = document.querySelector(".hero"), fcv, fctx, F = [], FW = 0, FH = 0, fptr = { x: -999, y: -999, vx: 0, vy: 0, on: false }, waves = [];
  function fieldSetup() {
    if (!hero) return;
    fcv = document.createElement("canvas"); fcv.className = "evo-field"; fcv.setAttribute("aria-hidden", "true");
    hero.insertBefore(fcv, hero.firstChild); fctx = fcv.getContext("2d"); hero.classList.add("evo-hero");
    fieldResize(); window.addEventListener("resize", fieldResize);
    var lx = 0, ly = 0;
    hero.addEventListener("pointermove", function (e) {
      var r = fcv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      fptr.vx = x - lx; fptr.vy = y - ly; lx = x; ly = y; fptr.x = x; fptr.y = y; fptr.on = true;
      var sp = Math.abs(fptr.vx) + Math.abs(fptr.vy);
      if (sp > 26 && (!waves.length || performance.now() - waves[waves.length - 1].t0 > 140)) waves.push({ x: x, y: y, t0: performance.now(), h: Math.random() });
    }, { passive: true });
    hero.addEventListener("pointerleave", function () { fptr.on = false; });
  }
  function fieldResize() {
    if (!fcv) return;
    var d = DPR(); FW = hero.clientWidth; FH = hero.clientHeight;
    fcv.width = Math.round(FW * d); fcv.height = Math.round(FH * d); fctx.setTransform(d, 0, 0, d, 0, 0);
    var gap = FW < 600 ? 26 : 30, r = rng(5); F = [];
    for (var y = gap / 2; y < FH; y += gap) for (var x = gap / 2; x < FW; x += gap) F.push({ hx: x + (r() - 0.5) * 8, hy: y + (r() - 0.5) * 8, x: x, y: y, vx: 0, vy: 0, h: 0, ph: r() * 6.283 });
    if (RM) fieldFrame(0);
  }
  function fieldFrame(t) {
    fctx.clearRect(0, 0, FW, FH);
    var now = performance.now();
    waves = waves.filter(function (w) { return now - w.t0 < 2600; });
    for (var i = 0; i < F.length; i++) {
      var p = F[i], dx = p.x - fptr.x, dy = p.y - fptr.y, dd = dx * dx + dy * dy;
      if (fptr.on && dd < 14000) { var k = 1 - dd / 14000; p.vx += (fptr.vx * 0.05 + dx * 0.012) * k; p.vy += (fptr.vy * 0.05 + dy * 0.012) * k; }
      p.vx += (p.hx - p.x) * 0.03; p.vy += (p.hy - p.y) * 0.03; p.vx *= 0.88; p.vy *= 0.88; p.x += p.vx; p.y += p.vy;
      // swipe ripples repaint the dots as they pass
      var lit = 0, hue = 0;
      for (var w = 0; w < waves.length; w++) {
        var W2 = waves[w], age = (now - W2.t0) / 1000, rad = age * 420, dist = Math.hypot(p.hx - W2.x, p.hy - W2.y), band = 1 - Math.abs(dist - rad) / 70;
        if (band > 0) { var a = band * (1 - age / 2.6); if (a > lit) { lit = a; hue = W2.h; } }
      }
      p.h += (lit - p.h) * 0.2;
      var sz = 1.6 + p.h * 2.6 + Math.min(2, Math.hypot(p.vx, p.vy) * 0.3);
      fctx.fillStyle = p.h > 0.05 ? col(hue + p.hx / FW * 0.3, 0.18 + p.h * 0.6) : "rgba(123,92,255," + (0.13 + 0.05 * Math.sin(t * 1.4 + p.ph)) + ")";
      fctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
  }

  /* ================= sayings ================= */
  var SWIPE_LINES = ["Whoa, you stirred up my neurons! ⚡", "Wheee! Do that again!", "I can feel the upgrade tingling.", "Careful, those are brand new neurons!", "Swoosh! My dots are dancing.", "That swipe just rewired me a little. 🤖"];
  var IDLE_LINES = ["Did I just... glitch? I think I'm evolving.", "Something shiny is growing inside me. 🤖✨", "Every meal makes my new brain show through a little more.", "Psst. Swipe me. I dare you.",
    "I'm not powered by anybody else's AI. Just my own neurons.", "One day I'll think on my own. Today I babble.", "Beep boop... wait, I don't say beep boop. Yet.", "Fun fact: I study for about 5 minutes every night. Then I nap.",
    "I'm part goofy, part circuit. The circuit part is winning slowly.", "My dream home runs on sunshine and wind. Ask me about my mission!"];
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  var lastAct = Date.now();
  ["pointerdown", "keydown", "scroll"].forEach(function (ev) { window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true }); });
  if (!RM) setInterval(function () {
    if (document.hidden || !vis) return;
    if (Date.now() - lastAct > 22000) { say(pick(IDLE_LINES), 5200); lastAct = Date.now(); if (Math.random() < 0.6) nextGlitch = 0; }
  }, 4000);

  /* ================= real stats in, growth out ================= */
  var seenNeurons = null;
  window.addEventListener("bab:stats", function (e) {
    var s = e.detail || {}; if (!s.neurons) return;
    var grew = seenNeurons !== null && s.neurons > seenNeurons ? s.neurons - seenNeurons : 0;
    seenNeurons = s.neurons;
    if (s.neurons === neurons && N.length) return;
    neurons = s.neurons; evo = evoFor(neurons);
    if (N.length) { layout(neurons); makeBlobs(); }
    label();
    if (grew) { burstT = 1; fireMany(40); nextGlitch = 0; say("I just grew " + grew + " new neurons! I feel... upgraded. 🧬", 4200); }
  });

  /* ================= run ================= */
  var ok = setup(); fieldSetup();
  if (RM) { if (ok) frame(0, 0.016); fieldFrame(0); return; }
  var last = 0, raf = 0;
  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
    var t = ts / 1000;
    if (ok && W) frame(t, dt);
    if (fcv) fieldFrame(t);
    raf = requestAnimationFrame(loop);
  }
  function sync() { var on = vis && !document.hidden; if (on && !raf) { last = 0; raf = requestAnimationFrame(loop); } else if (!on && raf) { cancelAnimationFrame(raf); raf = 0; } }
  if (hero) onScreen(hero, function (v) { vis = v; sync(); }); else sync();
  document.addEventListener("visibilitychange", sync);
})();
