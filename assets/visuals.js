/* Big AI Brain visual aids: small animated SVG diagrams for the "under the hood" lessons.
   window.BAB_VISUAL(id) -> an element you can drop anywhere. No libraries. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svg(w, h, cls) {
    var s = el("svg", { viewBox: "0 0 " + w + " " + h, class: "viz " + (cls || ""), role: "img" });
    s.style.width = "100%"; s.style.height = "auto"; s.style.display = "block";
    return s;
  }
  function text(s, x, y, str, size, anchor, cls) {
    var t = el("text", { x: x, y: y, "font-size": size || 12, "text-anchor": anchor || "middle", class: cls || "", fill: "#2b2340",
      "font-family": "system-ui, sans-serif", "font-weight": "700" }, s);
    t.textContent = str; return t;
  }
  var INK = "#2b2340", PINK = "#ff8fb1", PINKD = "#c9356b", TEAL = "#16b3a3", YEL = "#ffc93c", PUR = "#7b5cff";

  /* ---- 1. widening: a neuron splits into two, outputs halved ---- */
  function widening() {
    var s = svg(360, 200, "viz-widening");
    text(s, 180, 18, "Function-preserving widening", 14);
    // inputs
    var ins = [40, 80, 120, 160].map(function (y) { return el("circle", { cx: 40, cy: y + 20, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, s); });
    text(s, 40, 190, "inputs", 11);
    // original neuron
    var mid = el("circle", { cx: 180, cy: 100, r: 16, fill: PINK, stroke: PINKD, "stroke-width": 3, class: "nrn" }, s);
    // copy (appears)
    var copy = el("circle", { cx: 180, cy: 150, r: 16, fill: PINK, stroke: PINKD, "stroke-width": 3, class: "nrn copy", opacity: 0 }, s);
    // output
    el("circle", { cx: 320, cy: 100, r: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, s);
    text(s, 320, 135, "answer", 11);
    ins.forEach(function (c) { el("line", { x1: 49, y1: c.getAttribute("cy"), x2: 164, y2: 100, stroke: INK, "stroke-width": 2, opacity: .6 }, s); });
    var inCopy = ins.map(function (c) { return el("line", { x1: 49, y1: c.getAttribute("cy"), x2: 164, y2: 150, stroke: INK, "stroke-width": 2, opacity: 0, class: "cp" }, s); });
    var outA = el("line", { x1: 196, y1: 100, x2: 308, y2: 100, stroke: PUR, "stroke-width": 8, "stroke-linecap": "round" }, s);
    var outB = el("line", { x1: 196, y1: 150, x2: 308, y2: 104, stroke: PUR, "stroke-width": 4, "stroke-linecap": "round", opacity: 0, class: "cp" }, s);
    var lab = text(s, 252, 88, "strength 1.0", 11); lab.setAttribute("fill", PUR);
    var lab2 = text(s, 252, 170, "", 11); lab2.setAttribute("fill", PUR);
    var cap = text(s, 180, 195, "", 11, "middle"); cap.setAttribute("font-weight", "600");
    var step = 0;
    function tick() {
      step = (step + 1) % 4;
      if (step === 1) { cap.textContent = "1. Copy a neuron (same inputs)"; copy.setAttribute("opacity", 1); inCopy.forEach(function (l) { l.setAttribute("opacity", .6); }); }
      if (step === 2) { cap.textContent = "2. Split its output: 0.5 + 0.5 = same answer"; outA.setAttribute("stroke-width", 4); outB.setAttribute("opacity", 1); lab.textContent = "strength 0.5"; lab2.textContent = "strength 0.5"; }
      if (step === 3) { cap.textContent = "3. Study tonight: the twins learn different jobs"; copy.setAttribute("fill", "#7be7a3"); }
      if (step === 0) { cap.textContent = ""; copy.setAttribute("opacity", 0); copy.setAttribute("fill", PINK); inCopy.forEach(function (l) { l.setAttribute("opacity", 0); }); outA.setAttribute("stroke-width", 8); outB.setAttribute("opacity", 0); lab.textContent = "strength 1.0"; lab2.textContent = ""; }
    }
    tick(); s._timer = setInterval(tick, 1800);
    return s;
  }

  /* ---- 2. next character prediction ---- */
  function nextchar() {
    var s = svg(360, 170, "viz-nextchar");
    text(s, 180, 18, "Guess the next letter, forever", 14);
    var phrase = "Why did the chicken cross the road?";
    var boxes = [];
    var shown = text(s, 14, 60, "", 16, "start"); shown.setAttribute("font-family", "ui-monospace, Menlo, monospace");
    var cursor = el("rect", { x: 14, y: 46, width: 11, height: 18, fill: PINK, opacity: .9 }, s);
    var cands = ["e", "a", "o", " ", "n"];
    var bars = cands.map(function (c, i) {
      var g = el("g", {}, s);
      el("rect", { x: 40 + i * 62, y: 100, width: 40, height: 40, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
      var r = el("rect", { x: 40 + i * 62, y: 140, width: 40, height: 0, rx: 8, fill: TEAL, opacity: .85 }, g);
      text(g, 60 + i * 62, 126, c === " " ? "␣" : c, 16);
      return r;
    });
    text(s, 180, 162, "taller bar = more likely. It picks one, adds it, repeats.", 11).setAttribute("font-weight", "600");
    var i = 8;
    function tick() {
      i++; if (i > phrase.length) i = 8;
      var sofar = phrase.slice(0, i);
      shown.textContent = sofar;
      cursor.setAttribute("x", 14 + sofar.length * 9.6);
      var next = phrase[i] || "?";
      bars.forEach(function (b, k) {
        var h = 6 + Math.random() * 14;
        if (cands[k] === next) h = 34;
        b.setAttribute("height", h); b.setAttribute("y", 140 - h);
        b.setAttribute("fill", cands[k] === next ? PINKD : TEAL);
      });
      if (cands.indexOf(next) < 0) { cands[4] = next; s.querySelectorAll("text")[s.querySelectorAll("text").length - 2].textContent = next === " " ? "␣" : next; }
    }
    tick(); s._timer = setInterval(tick, 700);
    return s;
  }

  /* ---- 3. report card: score going down over nights ---- */
  function reportcard() {
    var s = svg(360, 190, "viz-report");
    text(s, 180, 18, "Report card: lower is smarter", 14);
    el("line", { x1: 40, y1: 150, x2: 340, y2: 150, stroke: INK, "stroke-width": 2 }, s);
    el("line", { x1: 40, y1: 40, x2: 40, y2: 150, stroke: INK, "stroke-width": 2 }, s);
    text(s, 24, 46, "6.6", 10); text(s, 24, 152, "0", 10); text(s, 190, 172, "nights of study", 11);
    text(s, 70, 46, "random guessing", 10, "start").setAttribute("fill", "#777");
    var pts = [6.6, 3.1, 2.9, 2.75, 2.6, 2.52, 2.4, 2.33, 2.2, 2.1, 2.05, 1.95];
    var path = el("path", { d: "", fill: "none", stroke: PINKD, "stroke-width": 4, "stroke-linecap": "round" }, s);
    var dot = el("circle", { cx: 40, cy: 40, r: 6, fill: YEL, stroke: INK, "stroke-width": 2 }, s);
    var lab = text(s, 300, 60, "", 12);
    var n = 1;
    function tick() {
      n++; if (n > pts.length) n = 2;
      var d = "";
      for (var i = 0; i < n; i++) {
        var x = 40 + i * 27, y = 150 - (pts[i] / 6.6) * 110;
        d += (i ? " L" : "M") + x + " " + y;
        if (i === n - 1) { dot.setAttribute("cx", x); dot.setAttribute("cy", y); lab.textContent = pts[i].toFixed(2) + " bpc"; }
      }
      path.setAttribute("d", d);
    }
    tick(); s._timer = setInterval(tick, 800);
    return s;
  }

  /* ---- 4. a neuron: weighted sum + squash ---- */
  function neuron() {
    var s = svg(360, 180, "viz-neuron");
    text(s, 180, 18, "One neuron = a tiny adding machine", 14);
    var ins = [{ v: 0.8, w: 0.9 }, { v: 0.2, w: -0.5 }, { v: 1.0, w: 0.3 }];
    var vals = [], ws = [];
    ins.forEach(function (o, i) {
      var y = 55 + i * 40;
      el("circle", { cx: 40, cy: y, r: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, s);
      vals.push(text(s, 40, y + 4, o.v.toFixed(1), 11));
      el("line", { x1: 55, y1: y, x2: 170, y2: 95, stroke: PUR, "stroke-width": Math.abs(o.w) * 8 + 1, opacity: .7 }, s);
      ws.push(text(s, 110, y - 6 + (95 - y) / 2, "× " + o.w.toFixed(1), 11)); ws[i].setAttribute("fill", PUR);
    });
    el("circle", { cx: 190, cy: 95, r: 24, fill: PINK, stroke: PINKD, "stroke-width": 3 }, s);
    text(s, 190, 99, "Σ", 20);
    el("line", { x1: 215, y1: 95, x2: 290, y2: 95, stroke: INK, "stroke-width": 3 }, s);
    el("rect", { x: 290, y: 75, width: 56, height: 40, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, s);
    var out = text(s, 318, 100, "", 13);
    text(s, 180, 165, "inputs × weights, added up, squashed to between -1 and 1. Learning = nudging the weights.", 10).setAttribute("font-weight", "600");
    function tick() {
      var sum = 0;
      ins.forEach(function (o, i) { o.v = Math.round(Math.random() * 10) / 10; vals[i].textContent = o.v.toFixed(1); sum += o.v * o.w; });
      out.textContent = Math.tanh(sum).toFixed(2);
    }
    tick(); s._timer = setInterval(tick, 1500);
    return s;
  }

  /* ---- 5. safety filter funnel ---- */
  function filter() {
    var s = svg(360, 200, "viz-filter");
    text(s, 180, 18, "Five checks, cheapest first", 14);
    var labels = ["size", "personal info", "bad words", "junk", "watchlist"];
    labels.forEach(function (l, i) {
      el("rect", { x: 20 + i * 66, y: 60, width: 58, height: 34, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, s);
      text(s, 49 + i * 66, 81, l, 10);
      if (i < 4) el("path", { d: "M" + (80 + i * 66) + " 77 l6 0", stroke: INK, "stroke-width": 2 }, s);
    });
    el("rect", { x: 120, y: 130, width: 120, height: 34, rx: 8, fill: "#e7ffe9", stroke: INK, "stroke-width": 2 }, s);
    text(s, 180, 151, "human checker 👀", 11);
    el("rect", { x: 250, y: 130, width: 90, height: 34, rx: 8, fill: PINK, stroke: INK, "stroke-width": 2 }, s);
    text(s, 295, 151, "brain 🧠", 11);
    var samples = [["Octopuses have 3 hearts", 5], ["call 303-555-0100", 1], ["sh1t happens", 2], ["asdfghjkl qwerty", 3], ["A gun is not a toy", 5]];
    var dot = el("circle", { cx: 10, cy: 77, r: 8, fill: TEAL, stroke: INK, "stroke-width": 2 }, s);
    var cap = text(s, 180, 190, "", 11); cap.setAttribute("font-weight", "600");
    var k = 0, pos = 0;
    function tick() {
      var smp = samples[k];
      pos++;
      if (pos > smp[1]) {
        if (smp[1] === 5) { dot.setAttribute("cx", 180); dot.setAttribute("cy", 147); cap.textContent = "\"" + smp[0] + "\" → waits for a human"; }
        else { dot.setAttribute("cy", 115); dot.setAttribute("fill", "#ff6b6b"); cap.textContent = "\"" + smp[0] + "\" → bounced at check " + smp[1]; }
        pos = -1; k = (k + 1) % samples.length;
        return;
      }
      if (pos === 0) { dot.setAttribute("fill", TEAL); dot.setAttribute("cy", 77); dot.setAttribute("cx", 10); cap.textContent = "\"" + smp[0] + "\""; return; }
      dot.setAttribute("cx", 49 + (pos - 1) * 66); dot.setAttribute("cy", 77);
    }
    tick(); s._timer = setInterval(tick, 650);
    return s;
  }

  /* ---- 6. code: a loop running ---- */
  function code() {
    var s = svg(360, 150, "viz-code");
    text(s, 180, 18, "A loop, running", 14);
    var lines = ["for i in range(3):", "    print(f\"Hello! ({i + 1}/3)\")"];
    lines.forEach(function (l, i) { var t = text(s, 20, 48 + i * 20, l, 13, "start"); t.setAttribute("font-family", "ui-monospace, Menlo, monospace"); });
    var hl = el("rect", { x: 12, y: 36, width: 220, height: 20, rx: 4, fill: YEL, opacity: .35 }, s);
    var outs = [0, 1, 2].map(function (i) { var t = text(s, 250, 48 + i * 20, "", 12, "start"); t.setAttribute("font-family", "ui-monospace, Menlo, monospace"); t.setAttribute("fill", TEAL); return t; });
    text(s, 180, 140, "the computer repeats the indented line 3 times, counting i = 0, 1, 2", 10).setAttribute("font-weight", "600");
    var st = 0;
    function tick() {
      st = (st + 1) % 7;
      if (st === 0) { outs.forEach(function (o) { o.textContent = ""; }); hl.setAttribute("y", 36); return; }
      var i = Math.floor((st - 1) / 2);
      if (st % 2 === 1) hl.setAttribute("y", 36); else { hl.setAttribute("y", 56); outs[i].textContent = "Hello! (" + (i + 1) + "/3)"; }
    }
    tick(); s._timer = setInterval(tick, 600);
    return s;
  }

  var MAP = { widening: widening, nextchar: nextchar, reportcard: reportcard, neuron: neuron, filter: filter, code: code };
  window.BAB_VISUAL = function (id) {
    var fn = MAP[id];
    if (!fn) return null;
    var wrap = document.createElement("div");
    wrap.className = "viz-wrap";
    var node = fn();
    wrap.appendChild(node);
    // stop timers when removed from the page
    var obs = new MutationObserver(function () { if (!document.body.contains(wrap)) { clearInterval(node._timer); obs.disconnect(); } });
    obs.observe(document.body, { childList: true, subtree: true });
    return wrap;
  };
})();
