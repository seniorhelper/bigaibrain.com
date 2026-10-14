/* Big AI Brain: private guided page renderer.
   This file holds NO content. The pages, pictures and captions live only on the brain server
   and are sent here after a special phrase unlocks them in the chat (see brain/papa.py). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  var API = null, TOKEN = null, MODE = null, FLOW = null, STEPS = {}, history = [], root = null, live = null;

  function post(path, body) {
    try {
      return fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }
  function event(step, choice, text) { return post("/api/papa/event", { token: TOKEN, step: step, choice: choice || "", text: text || "" }); }
  function photoUrl(file, dl) { return API + "/api/papa/photo/" + encodeURIComponent(file) + "?token=" + encodeURIComponent(TOKEN) + (dl ? "&download=1" : ""); }

  function build() {
    root = el("div", "papa-overlay"); root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
    var sheet = el("div", "papa-sheet");
    if (MODE === "test") {
      var tb = el("div", "papa-test", FLOW.test_banner || "TEST MODE: this is exactly what the visitor will see.");
      sheet.appendChild(tb);
    }
    var head = el("div", "papa-head");
    head.appendChild(el("span", "papa-title", FLOW.title || ""));
    var close = el("button", "papa-close", "Close ✕"); close.type = "button";
    close.addEventListener("click", function () { event("close", history[history.length - 1] || ""); hide(); });
    head.appendChild(close);
    sheet.appendChild(head);
    live = el("div", "papa-body"); sheet.appendChild(live);
    root.appendChild(sheet);
    document.body.appendChild(root);
    document.body.classList.add("papa-open");
    document.addEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape" && root) { event("close", history[history.length - 1] || ""); hide(); } }
  function hide() { if (root) { root.remove(); root = null; } document.body.classList.remove("papa-open"); document.removeEventListener("keydown", onKey); }

  function show(id) {
    if (id === "close") { hide(); return; }
    var step = STEPS[id];
    if (!step) { step = STEPS[FLOW.start] || FLOW.steps[0]; id = step.id; }
    history.push(id);
    event("view", id);
    live.innerHTML = "";
    var idx = FLOW.steps.indexOf(step);
    var card = el("article", "papa-card");
    if (idx >= 0 && !step.hide_counter) card.appendChild(el("div", "papa-count", (idx + 1) + " of " + FLOW.steps.length));
    if (step.eyebrow) card.appendChild(el("p", "papa-eyebrow", step.eyebrow));
    if (step.title) card.appendChild(el("h2", "papa-h", step.title));
    (step.paras || []).forEach(function (p) { card.appendChild(el("p", "papa-p", p)); });

    if (step.photos && step.photos.length) {
      var grid = el("div", "papa-grid");
      step.photos.forEach(function (ph) {
        var fig = el("figure", "papa-fig");
        var img = el("img", "papa-img"); img.loading = "lazy"; img.alt = ph.caption || "photo"; img.src = photoUrl(ph.file);
        img.addEventListener("click", function () { lightbox(ph); });
        fig.appendChild(img);
        var cap = el("figcaption", "papa-cap"); cap.appendChild(el("span", null, ph.caption || ""));
        var a = el("a", "papa-dl", "⬇ Download"); a.href = photoUrl(ph.file, true); a.target = "_blank"; a.rel = "noopener";
        a.addEventListener("click", function () { event("download", ph.file); });
        cap.appendChild(a); fig.appendChild(cap); grid.appendChild(fig);
      });
      card.appendChild(grid);
    }
    if (step.verses && step.verses.length) {
      var vl = el("div", "papa-verses");
      step.verses.forEach(function (v) {
        var q = el("blockquote", "papa-verse"); q.appendChild(el("p", null, "“" + v.text + "”")); q.appendChild(el("cite", null, v.ref)); vl.appendChild(q);
      });
      card.appendChild(vl);
    }
    (step.paras_after || []).forEach(function (p) { card.appendChild(el("p", "papa-p", p)); });
    if (step.science && step.science.length) {
      var sb = el("details", "papa-sci"); sb.appendChild(el("summary", null, step.science_title || "Why this way? What the research says"));
      step.science.forEach(function (s) {
        var d = el("div", "papa-sci-item"); d.appendChild(el("p", null, s.claim));
        var src = el("a", "papa-src", s.source); src.href = s.url; src.target = "_blank"; src.rel = "noopener"; d.appendChild(src); sb.appendChild(d);
      });
      card.appendChild(sb);
    }
    if (step.resources && step.resources.length) {
      var rl = el("div", "papa-res"); rl.appendChild(el("h3", null, step.resources_title || "If you want to read more"));
      var ul = el("ul");
      step.resources.forEach(function (r) { var li = el("li"); var a = el("a", null, r.label); a.href = r.url; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a); ul.appendChild(li); });
      rl.appendChild(ul); card.appendChild(rl);
    }
    if (step.note) {
      var ta = el("textarea", "papa-note"); ta.rows = 6; ta.maxLength = 2000; ta.placeholder = step.note.placeholder || "";
      card.appendChild(ta);
      var sendBtn = el("button", "papa-btn primary", step.note.button || "Send"); sendBtn.type = "button";
      sendBtn.addEventListener("click", function () {
        var t = ta.value.trim(); if (!t) { ta.focus(); return; }
        sendBtn.disabled = true; sendBtn.textContent = "Sending…";
        Promise.resolve(event("note", id, t)).then(function () { show(step.note.next || "thanks"); });
      });
      card.appendChild(sendBtn);
    }
    var acts = el("div", "papa-acts");
    (step.options || []).forEach(function (o) {
      var b;
      if (o.href) {
        b = el("a", "papa-btn " + (o.kind || "link"), o.label); b.href = o.href;
        if (!/^tel:/.test(o.href)) { b.target = "_blank"; b.rel = "noopener"; }
        b.addEventListener("click", function () { event("choice", id + ":" + (o.event || o.label)); if (o.next) setTimeout(function () { show(o.next); }, 400); });
      } else {
        b = el("button", "papa-btn " + (o.kind || "primary"), o.label); b.type = "button";
        b.addEventListener("click", function () { event("choice", id + ":" + (o.event || o.label)); show(o.next || "close"); });
      }
      acts.appendChild(b);
    });
    if (history.length > 1 && !step.no_back) {
      var back = el("button", "papa-btn back", "← Back"); back.type = "button";
      back.addEventListener("click", function () { history.pop(); var prev = history.pop(); show(prev || FLOW.start); });
      acts.appendChild(back);
    }
    card.appendChild(acts);
    if (step.footer) card.appendChild(el("p", "papa-foot", step.footer));
    live.appendChild(card);
    live.scrollTop = 0; try { root.scrollTop = 0; } catch (e) {}
    var h = card.querySelector("h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  function lightbox(ph) {
    var lb = el("div", "papa-lb"); var img = el("img"); img.src = photoUrl(ph.file); img.alt = ph.caption || ""; lb.appendChild(img);
    var cap = el("div", "papa-lb-cap"); cap.appendChild(el("span", null, ph.caption || ""));
    var a = el("a", "papa-dl", "⬇ Download"); a.href = photoUrl(ph.file, true); a.target = "_blank"; a.rel = "noopener"; cap.appendChild(a);
    var x = el("button", "papa-close", "Close ✕"); x.type = "button"; cap.appendChild(x); lb.appendChild(cap);
    function off() { lb.remove(); }
    x.addEventListener("click", off); lb.addEventListener("click", function (e) { if (e.target === lb) off(); });
    root.appendChild(lb);
  }

  window.BAB_PAPA = {
    open: function (api, info) {
      if (!api || !info || !info.token) return;
      API = api; TOKEN = info.token; MODE = info.mode || "real"; history = [];
      fetch(API + "/api/papa/flow?token=" + encodeURIComponent(TOKEN)).then(function (r) { return r.json(); }).then(function (f) {
        if (!f || !f.steps) throw new Error("locked");
        FLOW = f; STEPS = {}; f.steps.forEach(function (s) { STEPS[s.id] = s; });
        if (root) hide();
        build(); show(f.start || f.steps[0].id);
      }).catch(function () {});
    },
    close: hide
  };
})();
