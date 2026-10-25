/* Big AI Brain: front end */
(function () {
  "use strict";
  var API_CANDIDATES = [];
  if (location.protocol.indexOf("http") === 0) API_CANDIDATES.push(location.origin);
  API_CANDIDATES.push("https://api.bigaibrain.com");
  var API = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- storage (safe) ---------- */
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function hex(n) {
    var a = new Uint8Array(n), s = "";
    try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < n; j++) s += ("0" + a[j].toString(16)).slice(-2);
    return s;
  }
  var FEEDER = store("bab_feeder");
  if (!FEEDER || !/^[a-f0-9]{32}$/.test(FEEDER)) { FEEDER = hex(16); store("bab_feeder", FEEDER); }
  var SID = hex(12);
  var SOUND = store("bab_sound") !== "off";

  /* ---------- sound (made in the browser, no files) ---------- */
  var actx = null;
  function tone(freq, dur, type, vol, slide) {
    if (!SOUND) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  var sfx = {
    boop: function () { tone(420, 0.12, "sine", 0.09, 880); },
    chomp: function () { [0, 130, 260].forEach(function (d) { setTimeout(function () { tone(160, 0.09, "square", 0.05, 90); }, d); }); },
    giggle: function () { [0, 90, 180, 270].forEach(function (d, i) { setTimeout(function () { tone(700 + i * 90, 0.07, "triangle", 0.06); }, d); }); },
    blip: function () { tone(660, 0.05, "sine", 0.04); },
    burp: function () { tone(110, 0.35, "sawtooth", 0.05, 60); }
  };

  /* ---------- the brain character ---------- */
  var brain = $("#brain"), bubble = $("#bubble");
  var moodTimer = null, bubbleTimer = null;
  function setMood(m, ms) {
    ["laugh", "confused", "sad", "think"].forEach(function (c) { brain.classList.remove(c); });
    if (m && m !== "happy") brain.classList.add(m);
    clearTimeout(moodTimer);
    moodTimer = setTimeout(function () { setMood(null); }, ms || 2600);
  }
  window.BAB_SAY = function (t, ms) { say(t, ms); };
  function say(text, ms) {
    bubble.textContent = text;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.textContent = "Feed me facts! 🍽️"; }, ms || 4500);
  }
  function mouth(open) { brain.classList.toggle("open", !!open); }
  function talk(ms) {
    var end = Date.now() + (ms || 1200);
    (function flap() {
      mouth(!brain.classList.contains("open"));
      if (Date.now() < end) setTimeout(flap, 120 + Math.random() * 60); else mouth(false);
    })();
  }
  function chomp() {
    var n = 0;
    (function bite() { mouth(n % 2 === 0); n++; if (n < 6) setTimeout(bite, 140); else { mouth(false); sfx.burp(); } })();
    sfx.chomp();
  }
  (function blink() {
    setTimeout(function () {
      brain.classList.add("blink");
      setTimeout(function () { brain.classList.remove("blink"); blink(); }, 130);
    }, 2500 + Math.random() * 3500);
  })();
  var pupils = $$(".pupil, .shine", brain);
  function look(x, y) {
    var r = brain.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height * 0.43;
    var dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
    var k = Math.min(1, d / 300), mx = dx / d * 10 * k, my = dy / d * 9 * k;
    pupils.forEach(function (p) { p.style.transform = "translate(" + mx + "px," + my + "px)"; });
  }
  var lastLook = 0;
  window.addEventListener("pointermove", function (e) { lastLook = Date.now(); look(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener("pointerdown", function (e) { lastLook = Date.now(); look(e.clientX, e.clientY); }, { passive: true });
  (function wander() {
    setTimeout(function () {
      if (Date.now() - lastLook > 2500) {
        var r = brain.getBoundingClientRect();
        look(r.left + r.width * (0.2 + Math.random() * 0.6), r.top + r.height * (0.1 + Math.random() * 0.8));
      }
      wander();
    }, 1800 + Math.random() * 2200);
  })();
  var taps = 0, tapTimer = null;
  var TAP_LINES = ["AHHH! 😮 Feed me!", "Hehe, that tickles!", "Boop! 🧠", "Is that a fact in your pocket?", "I ate spinach today! 🥬 Feel these muscles.", "Chlorella, turmeric, ginger... and facts. Yum.", "Watch my sprouts. They grew overnight! 🌱", "Given, not taken. That is my whole deal.", "Teach me one true thing and I grow 8 neurons!",
    "My teeth are 100% buck.", "I looooove to learn!", "Careful, I'm wrinkly!", "Got any jokes?",
    "Bzzt! Sorry, that was my new brain booting up. 🤖", "Half cartoon, half circuit, all heart.", "Every dot glowing inside me is a real neuron.", "I'm evolving! Slowly. Like, snail-slowly. 🐌",
    "Swipe me and watch my neurons dance!", "I don't borrow anyone else's AI. I'm growing my own brain.", "Feed me and my new brain shows through a little more.", "My future home runs on sun, wind and the ground. Zero smoke!",
    "Did you see that glitch? That's the smart part trying to get out.", "I want to help make the world better for everybody. Even the otters. 🦦"];
  $("#brainBtn").addEventListener("click", function () {
    mouth(true); sfx.boop();
    setTimeout(function () { mouth(false); }, 600);
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function () { taps = 0; }, 1500);
    if (taps >= 4) { taps = 0; say("Okay okay! Here's a joke! 😂"); setMood("laugh"); send("Tell me a joke", true); return; }
    say(TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)], 2500);
    setMood(Math.random() < 0.5 ? "laugh" : "think", 1200);
  });

  /* ---------- API ---------- */
  function timeoutFetch(url, opts, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error("timeout")); }, ms || 8000);
      fetch(url, opts).then(function (r) { clearTimeout(t); res(r); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function findApi(i) {
    i = i || 0;
    if (i >= API_CANDIDATES.length) return Promise.resolve(null);
    return timeoutFetch(API_CANDIDATES[i] + "/api/health", {}, 3500).then(function (r) {
      if (!r.ok) throw new Error("bad");
      return r.json().then(function (j) { if (!j.ok) throw new Error("bad"); return API_CANDIDATES[i]; });
    }).catch(function () { return findApi(i + 1); });
  }
  function post(path, body) {
    return timeoutFetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, 15000)
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  }
  function get(path) { return timeoutFetch(API + path, {}, 10000).then(function (r) { return r.json(); }); }

  /* ---------- chat ---------- */
  var log = $("#log");
  var LOBE = { jokes: "Joke lobe", math: "Math lobe", lessons: "Fact lobe", memory: "Memory lobe", smalltalk: "Chit-chat lobe",
    growing: "Growing brain 🌱", safety: "Safety lobe", backup: "Backup mini-brain", underhood: "Under the hood 🔧" };
  function scroll() { log.scrollTop = log.scrollHeight; }
  function addMe(text) {
    var d = document.createElement("div"); d.className = "msg me"; d.textContent = text; log.appendChild(d); scroll();
  }
  function addBot(r) {
    var d = document.createElement("div"); d.className = "msg bot";
    var tag = document.createElement("span"); tag.className = "tag " + (r.lobe || ""); tag.textContent = LOBE[r.lobe] || "Brain";
    var body = document.createElement("div"); body.textContent = r.reply;
    d.appendChild(tag);
    if (r.title && r.lobe === "underhood") { var tt = document.createElement("span"); tt.className = "ttl"; tt.textContent = "🔧 " + r.title; d.appendChild(tt); body.textContent = r.reply.replace(r.title + "\n\n", ""); }
    d.appendChild(body);
    if (r.visual && window.BAB_VISUAL) { var vz = window.BAB_VISUAL(r.visual); if (vz) d.appendChild(vz); }
    if (r.code) {
      var pre = document.createElement("pre"); pre.textContent = r.code; d.appendChild(pre);
      var cb = document.createElement("button"); cb.type = "button"; cb.className = "copybtn"; cb.textContent = "Copy code";
      cb.style.cssText = "font:700 13px system-ui;border:2px solid #2b2340;border-radius:8px;padding:6px 10px;background:#fff;cursor:pointer";
      cb.addEventListener("click", function () { try { navigator.clipboard.writeText(r.code); cb.textContent = "Copied!"; } catch (e) { cb.textContent = "Select and copy"; } });
      d.appendChild(cb);
    }
    if (r.hint) { var h = document.createElement("span"); h.className = "hint"; h.textContent = r.hint; d.appendChild(h); }
    var acts = document.createElement("div"); acts.className = "acts";
    if (r.ref && API) {
      ["👍", "👎"].forEach(function (lab, i) {
        var b = document.createElement("button"); b.type = "button"; b.textContent = lab;
        b.setAttribute("aria-label", i ? "Bad answer" : "Good answer");
        b.addEventListener("click", function () {
          $$("button", acts).forEach(function (x) { if (x.textContent === "👍" || x.textContent === "👎") x.classList.remove("chosen"); });
          b.classList.add("chosen"); sfx.blip();
          post("/api/rate", { ref: r.ref, score: i ? -1 : 1, lobe: r.lobe, feeder: FEEDER }).catch(function () {});
        });
        acts.appendChild(b);
      });
    }
    if (r.feed) {
      var f = document.createElement("button"); f.type = "button"; f.textContent = "🍽️ Teach me this";
      f.addEventListener("click", function () { prefillFeed(r.feed); });
      acts.appendChild(f);
    }
    if (acts.children.length) d.appendChild(acts);
    log.appendChild(d); scroll();
  }
  function typing(on) {
    var t = $(".typing", log);
    if (on && !t) { t = document.createElement("div"); t.className = "typing"; t.textContent = "🧠 thinking..."; log.appendChild(t); scroll(); }
    if (!on && t) t.remove();
  }
  var busy = false;
  function respond(r) {
    typing(false); addBot(r);
    var words = (r.reply || "").split(/\s+/).length;
    talk(Math.min(2600, 300 + words * 70));
    setMood(r.mood || "happy", 2800);
    if (r.mood === "laugh") sfx.giggle(); else sfx.blip();
    var first = (r.reply || "").split("\n")[0];
    if (first.length < 90) say(first, 3500);
  }
  function send(text, quiet) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true;
    if (!quiet) { addMe(text); } else { addMe(text); }
    typing(true); setMood("think", 3000);
    var p = API ? post("/api/chat", { sid: SID, message: text, hour: new Date().getHours() }) : Promise.reject(new Error("offline"));
    p.then(function (r) {
      if (!r || typeof r.reply !== "string") throw new Error("bad");
      setTimeout(function () { respond(r); }, 250);
    }).catch(function () {
      setTimeout(function () { respond(Offline.handle(text)); }, 300);
    }).then(function () { setTimeout(function () { busy = false; }, 320); });
  }
  $("#askForm").addEventListener("submit", function (e) {
    e.preventDefault(); var i = $("#ask"); send(i.value); i.value = ""; i.focus();
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-say]");
    if (!b) return;
    send(b.getAttribute("data-say"));
    if (!b.closest("#chips")) document.getElementById("chat").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#soundBtn").addEventListener("click", function () {
    SOUND = !SOUND; store("bab_sound", SOUND ? "on" : "off");
    this.textContent = SOUND ? "🔊" : "🔇"; this.setAttribute("aria-pressed", SOUND ? "true" : "false");
    if (SOUND) sfx.boop();
  });
  if (!SOUND) { $("#soundBtn").textContent = "🔇"; $("#soundBtn").setAttribute("aria-pressed", "false"); }

  /* ---------- feeding ---------- */
  var KINDS = {
    fact: { p: "What's it about? (optional)", pp: "Example: octopus hearts", a: "The fact", ap: "Example: An octopus has three hearts and blue blood.", need: false, max: 400, help: "A fact is one true thing about the world, in your own words." },
    joke: { p: "The joke setup", pp: "Example: Why did the cookie go to the doctor?", a: "The punchline", ap: "Example: It was feeling crummy.", need: true, max: 400, help: "Clean jokes only. Kids are listening." },
    qa: { p: "The question", pp: "Example: What is a rock?", a: "The right answer", ap: "Example: A rock is a hard, solid chunk of minerals.", need: true, max: 400, help: "A question people might ask, with the right answer." },
    drop: { p: "Topic (one subject)", pp: "Example: How to fix a running toilet", a: "Your knowledge drop (up to 4,000 characters)", ap: "Teach the brain a whole topic you know well, in your own words. Step by step is great.", need: true, max: 4000, help: "A Knowledge Drop is a bigger meal: one topic, your own words, up to 4,000 characters (about 650 words). Limited to 10 a day. Always read by a human first." }
  };
  var kind = "fact";
  function setKind(k) {
    kind = k;
    $$(".tab").forEach(function (t) { var on = t.getAttribute("data-kind") === k; t.classList.toggle("on", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    $("#fPromptLabel").textContent = KINDS[k].p; $("#fPrompt").placeholder = KINDS[k].pp;
    $("#fAnswerLabel").textContent = KINDS[k].a; $("#fAnswer").placeholder = KINDS[k].ap;
    $("#fAnswer").maxLength = KINDS[k].max; $("#fAnswer").rows = k === "drop" ? 8 : 4;
    var th = $("#tabHelp"); if (th) th.textContent = KINDS[k].help;
    updateCount();
  }
  $$(".tab").forEach(function (t) { t.addEventListener("click", function () { setKind(t.getAttribute("data-kind")); }); });
  function prefillFeed(f) {
    setKind(f.kind || "qa");
    $("#fPrompt").value = f.prompt || ""; $("#fAnswer").value = f.answer || "";
    updateCount();
    document.getElementById("feed").scrollIntoView({ behavior: "smooth" });
    setTimeout(function () { (f.answer ? $("#fNick") : $("#fAnswer")).focus({ preventScroll: true }); }, 600);
  }
  function updateCount() { $("#fCount").textContent = $("#fAnswer").value.length + " / " + KINDS[kind].max; }
  $("#fAnswer").addEventListener("input", updateCount);
  var nick = store("bab_nick"); if (nick) $("#fNick").value = nick;
  function feedMsg(text, ok) { var m = $("#feedMsg"); m.textContent = text; m.className = "feed-msg " + (ok ? "ok" : "bad"); }
  function eatAnimation(emoji) {
    var mini = $(".mini-brain"), fl = $("#flying");
    fl.textContent = emoji || "🍕"; fl.classList.remove("go"); void fl.offsetWidth; fl.classList.add("go");
    setTimeout(function () { mini.classList.add("chomp"); setTimeout(function () { mini.classList.remove("chomp"); }, 900); }, 600);
    chomp(); say("NOM NOM NOM! 😋", 3000); setMood("laugh", 2000);
  }
  $("#feedForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var prompt = $("#fPrompt").value.trim(), answer = $("#fAnswer").value.trim(), nk = $("#fNick").value.trim();
    if (KINDS[kind].need && prompt.length < 3) return feedMsg("Fill in " + KINDS[kind].p.toLowerCase() + " first.", false);
    if (answer.length < (kind === "fact" ? 10 : 1)) return feedMsg(kind === "fact" ? "Give me a full fact (at least a short sentence)." : "Fill in " + KINDS[kind].a.toLowerCase() + ".", false);
    if (!/^[A-Za-z0-9 _\-]{2,20}$/.test(nk)) return feedMsg("Pick a nickname: 2 to 20 letters or numbers. No real names needed!", false);
    var src = (document.querySelector("input[name=source]:checked") || {}).value;
    if (!src) return feedMsg("Tell the brain how you know this: you made it, you know it firsthand, or it's public knowledge.", false);
    if (kind === "drop" && answer.length < 50) return feedMsg("A knowledge drop should be at least a few sentences (50+ characters).", false);
    if (!$("#fAgree").checked) return feedMsg("Please check the box to confirm you're 13+, it isn't copied, and you agree to the rules.", false);
    store("bab_nick", nk);
    if (!API) return feedMsg("My stomach opens very soon! The brain checkers are still setting up. Try again later. 🛠️", false);
    var btn = $("#feedBtn"); btn.disabled = true; btn.textContent = "Chewing...";
    post("/api/feed", { feeder: FEEDER, nickname: nk, kind: kind, prompt: prompt, answer: answer, agree: true, source: src })
      .then(function (r) {
        feedMsg(r.message || "Hmm, something went wrong.", !!r.ok);
        if (r.ok) {
          eatAnimation({ fact: "🧠", joke: "😂", qa: "❓", drop: "📚" }[kind]);
          synapseFlash(r.status === "approved");
          $("#fPrompt").value = ""; $("#fAnswer").value = ""; updateCount();
          loadStats();
        } else { setMood("sad", 2000); say("Blech! 🤢", 2500); }
      })
      .catch(function () { feedMsg("I couldn't reach my stomach. Check your connection and try again.", false); })
      .then(function () { btn.disabled = false; btn.textContent = "Feed me! 🍽️"; });
  });

  /* ---------- stats, path, journey, leaders ---------- */
  var STAGES = [["🦠", "Single Cell"], ["🫧", "Amoeba"], ["🐟", "Fish"], ["🔥", "Caveman"], ["🧸", "Toddler"], ["🎒", "Kid"], ["🛹", "Teen"], ["🎓", "Graduate"]];
  function fmt(n) { return (n || 0).toLocaleString("en-US"); }
  function renderPath(cur) {
    var ol = $("#path"); ol.innerHTML = "";
    STAGES.forEach(function (s, i) {
      var li = document.createElement("li");
      li.className = i < cur ? "done" : (i === cur ? "now" : "locked");
      var e = document.createElement("span"); e.className = "e"; e.textContent = i > cur + 1 ? "❔" : s[0];
      var b = document.createElement("b"); b.textContent = i > cur + 1 ? "???" : s[1];
      var sm = document.createElement("small"); sm.textContent = "Stage " + (i + 1);
      li.appendChild(e); li.appendChild(b); li.appendChild(sm); ol.appendChild(li);
    });
  }
  var lastNeurons = null, lastSyn = null, lastMeals = null;
  function bumpTo(id, val, prev) {
    var e = $(id); if (!e) return;
    if (prev !== null && val !== prev) {
      var start = prev, end = val, t0 = Date.now();
      (function step() {
        var p = Math.min(1, (Date.now() - t0) / 900);
        e.textContent = fmt(Math.round(start + (end - start) * p));
        if (p < 1) requestAnimationFrame(step);
      })();
      e.classList.add("bump"); setTimeout(function () { e.classList.remove("bump"); }, 900);
    } else e.textContent = fmt(val);
  }
  function synapseFlash(big) {
    brain.classList.add("spark"); sfx.blip();
    setTimeout(function () { brain.classList.remove("spark"); }, big ? 2400 : 1500);
    if (lastMeals !== null && big) { bumpTo("#gMeals", lastMeals + 1, lastMeals); lastMeals += 1; }
  }
  function setStageArt(idx) {
    for (var i = 0; i < 8; i++) brain.classList.remove("stage-" + i);
    brain.classList.add("stage-" + idx);
  }
  function renderTicker(recent) {
    var t = $("#ticker"); if (!t || !recent || !recent.length) return;
    var parts = recent.map(function (x) {
      var k = { fact: "🧠 fact", joke: "😂 joke", qa: "❓ Q&A", drop: "📚 drop" }[x.kind] || x.kind;
      return k + " from " + (x.nickname || "a friend") + (x.peek ? ": “" + x.peek + (x.peek.length >= 70 ? "…" : "") + "”" : "");
    });
    var line = "🍽️ Recently eaten: " + parts.join("  ·  ") + "  ·  ";
    t.innerHTML = ""; var a = document.createElement("span"); a.textContent = line + line; t.appendChild(a);
  }
  function renderStage(st) {
    $("#stageEmoji").textContent = st.emoji; $("#stageName").textContent = st.name;
    $("#stageDay").textContent = "· Day " + st.days;
    if (st.next) {
      $("#stageBar").style.width = Math.max(2, st.next.pct) + "%";
      $("#stageNext").textContent = "Next: " + st.next.emoji + " " + st.next.name + " · report card " + Math.round(st.next.brain_pct) + "% there, meals " + Math.round(st.next.fed_pct) + "% there";
    } else { $("#stageBar").style.width = "100%"; $("#stageNext").textContent = "Top stage reached! Time for a bigger brain."; }
    renderPath(st.index);
    setStageArt(st.index);
  }
  function loadStats() {
    if (!API) return;
    get("/api/stats").then(function (s) {
      renderStage(s.stage);
      try { window.dispatchEvent(new CustomEvent("bab:stats", { detail: s })); } catch (e) {}
      $("#sJokes").textContent = fmt(s.jokes_known); $("#sFacts").textContent = fmt(s.facts_known);
      $("#sFed").textContent = fmt(s.stage.fed); $("#sChats").textContent = fmt(s.chats);
      var sl = $("#sLibrary"); if (sl) sl.textContent = fmt(s.library || 0);
      if (lastNeurons !== null && s.neurons > lastNeurons) { brain.classList.add("stretch"); setTimeout(function () { brain.classList.remove("stretch"); }, 1600); }
      $("#sScore").textContent = s.stage.bpc == null ? "–" : s.stage.bpc.toFixed(2);
      if (lastNeurons !== null && s.neurons > lastNeurons) synapseFlash(true);
      bumpTo("#gNeurons", s.neurons, lastNeurons); lastNeurons = s.neurons;
      bumpTo("#gSynapses", s.params, lastSyn); lastSyn = s.params;
      bumpTo("#gMeals", s.stage.fed, lastMeals); lastMeals = s.stage.fed;
      renderTicker(s.recent);
    }).catch(function () {});
    get("/api/journey").then(function (j) {
      if (!j.journey || !j.journey.length) return;
      var ol = $("#journeyList"); ol.innerHTML = "";
      j.journey.forEach(function (x) {
        var li = document.createElement("li"), t = document.createElement("time"), b = document.createElement("b"), sp = document.createElement("span");
        t.textContent = new Date(x.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        b.textContent = x.title; sp.textContent = x.body || "";
        li.appendChild(t); li.appendChild(b); li.appendChild(sp); ol.appendChild(li);
      });
    }).catch(function () {});
    get("/api/leaderboard").then(function (l) {
      if (!l.leaders || !l.leaders.length) return;
      var ol = $("#leaders"); ol.innerHTML = "";
      l.leaders.forEach(function (x) {
        var li = document.createElement("li"), sp = document.createElement("span");
        li.textContent = x.nickname; sp.textContent = fmt(x.approved) + " meals"; li.appendChild(sp); ol.appendChild(li);
      });
    }).catch(function () {});
  }

  /* ---------- backup mini-brain (only if the server can't be reached) ---------- */
  var Offline = (function () {
    var D = window.BAB_OFFLINE || { jokes: [], knock: [], facts: [] }, st = null;
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function R(reply, mood, extra) { var o = { reply: reply, lobe: "backup", mood: mood || "happy" }; for (var k in (extra || {})) o[k] = extra[k]; return o; }
    function joke() { var j = pick(D.jokes); return R(j.setup + "\n\n" + j.punch + " 😂", "laugh"); }
    function fact() { return R("🧠 " + pick(D.facts), "think"); }
    function quizQ() { var a = Math.floor(Math.random() * 11), b = Math.floor(Math.random() * 11); st = { mode: "quiz", a: a + b, q: a + " + " + b, n: (st && st.n || 0) + 1 }; return st.q; }
    function calc(t) {
      var s = t.toLowerCase().replace(/,/g, "").replace(/^(what'?s|what is|whats|how much is|calculate|solve)\s+/, "")
        .replace(/\?|=/g, " ").replace(/\bplus\b/g, "+").replace(/\bminus\b/g, "-").replace(/\btimes\b|\bmultiplied by\b|×/g, "*")
        .replace(/\bdivided by\b|÷/g, "/").replace(/(\d)\s*x\s*(\d)/g, "$1*$2").trim();
      if (!/^[\d\s+\-*/().]+$/.test(s) || !/\d\s*[+\-*/]\s*[\d(]/.test(s)) return null;
      var toks = s.match(/\d+(\.\d+)?|[+\-*/()]/g), pos = 0;
      function peek() { return toks[pos]; } function next() { return toks[pos++]; }
      function factor() { var t = next(); if (t === "(") { var v = expr(); next(); return v; } if (t === "-") return -factor(); var n = parseFloat(t); if (isNaN(n)) throw 0; return n; }
      function term() { var v = factor(); while (peek() === "*" || peek() === "/") { var o = next(), r = factor(); if (o === "/" && r === 0) throw "zero"; v = o === "*" ? v * r : v / r; } return v; }
      function expr() { var v = term(); while (peek() === "+" || peek() === "-") { var o = next(), r = term(); v = o === "+" ? v + r : v - r; } return v; }
      try { var v = expr(); if (pos !== toks.length) return null; return "🧮 " + s.replace(/\*/g, "×").replace(/\//g, "÷") + " = " + (Math.round(v * 1e6) / 1e6); }
      catch (e) { return e === "zero" ? "Whoa, you can't divide by zero! 🤯" : null; }
    }
    function handle(t) {
      var low = t.toLowerCase().trim();
      if (/kill(ing)? my ?self|suicid|want to die|end my life|hurt(ing)? my ?self/.test(low))
        return R("I'm really glad you told me. I'm just a little computer brain, so please talk to a grown-up or someone you trust right now. If you're in the US, you can call or text 988 any time to talk with a real person who can help. 💛", "sad");
      if (st && st.mode === "quiz") {
        if (/\b(stop|quit|done|end)\b/.test(low)) { st = null; return R("Quiz over! Great brain workout! 💪"); }
        var n = parseFloat(low.replace(/[^\d.\-]/g, ""));
        if (!isNaN(n)) { var right = n === st.a, prev = st.q, ans = st.a; return R((right ? "✅ Correct!" : "❌ Not quite. " + prev + " = " + ans + ".") + "\n\nNext: What is " + quizQ() + "?", right ? "laugh" : "think"); }
      }
      if (st && st.mode === "k1") { if (/who'?s there|whos there/.test(low)) { st.mode = "k2"; return R(st.k.name + ".", "laugh"); } st = null; return R("You're supposed to say \"Who's there?\" 😆"); }
      if (st && st.mode === "k2") { var k = st.k; st = null; return R(k.punch + " 😂", "laugh"); }
      if (st && st.mode === "u1") { st = { mode: "u2", name: t.replace(/[.!?]+$/, "") }; return R(st.name + " who? 🤔", "think"); }
      if (st && st.mode === "u2") { st = null; return R("HAHAHA! 😂 Good one! When my big brain is online, you can feed me that joke.", "laugh"); }
      if (/^\s*knock[ ,.\-]*knock/.test(low) && !/joke/.test(low)) { st = { mode: "u1" }; return R("Who's there? 👀", "think"); }
      var m = calc(t); if (m) return R(m, "think");
      if (/quiz|test me|math game/.test(low)) { st = null; return R("🧮 Quiz time! Say \"stop\" anytime.\n\nWhat is " + quizQ() + "?", "think"); }
      if (/joke|funny|laugh/.test(low)) { if (/knock/.test(low)) { st = { mode: "k1", k: pick(D.knock) }; return R("Knock knock! 🚪", "laugh", { hint: "Say: Who's there?" }); } return joke(); }
      if (/\brock/.test(low)) return R("A rock? 🪨 I... don't know what that is yet! Somebody has to teach me.", "confused");
      if (/teach|fact|learn|lesson|something cool|planet/.test(low)) return fact();
      if (/how do you (grow|work|think|learn)|widening|neurons?|under the hood|report card|learn to code|teach me (to )?code/.test(low)) {
        var vid = /grow|widening|neurons?/.test(low) ? "widening" : /report/.test(low) ? "reportcard" : /code/.test(low) ? "code" : "nextchar";
        var txt = { widening: "When I earn a new stage I grow new neurons without forgetting anything: each new neuron starts as a copy of an old one, and they split the old one's output in half. Same answers today, more room to learn tomorrow. It's called function-preserving widening.",
          reportcard: "Every night I take the same test on jokes and facts I'm never allowed to study. The score is bits per character. Lower is smarter, and I can't cheat by memorizing.",
          code: "Coding is writing precise instructions. Here's a loop: it repeats one line three times. Try it at python.org's online shell!",
          nextchar: "My growing brain does one job: look at the last 32 characters and guess the next one. Letter by letter, an answer comes out. Big AI systems use the same idea with a much bigger pot." }[vid];
        var ex = { visual: vid }; if (vid === "code") ex.code = "name = \"friend\"\nfor i in range(3):\n    print(f\"Hello {name}! ({i + 1}/3)\")";
        return R("🔧 " + txt, "think", ex);
      }
      if (/what'?s (happening|good|new|going on)|what up|wassup|how'?s it going|how are (you|ya)/.test(low)) return R("Not much! Just sitting here being wrinkly and hungry for facts. What's up with you? Want a joke?");
      if (/mission|purpose|why do you exist/.test(low)) return R("My mission: bring humanity's knowledge together, given, not taken. Everyone's a genius at something. Feed me yours.");
      if (/^(hi|hello|hey|yo|sup|howdy|hola)\b/.test(low)) return R("Hi hi hi! I'm Big AI Brain and I looooove to learn. Want a joke, a fact, or a math quiz?");
      if (/^(yes|yeah|yep|sure|ok|okay)\b/.test(low)) return joke();
      if (/who are you|your name|what are you/.test(low)) return R("I'm Big AI Brain! A baby AI built from scratch and raised by the whole internet.");
      var syl = ["blo", "rp", "mib", "zu", "gla", "ff", "oo", "nek", "pli", "ta", "wub"], b = "";
      for (var i = 0; i < 6; i++) b += pick(syl) + (Math.random() < 0.35 ? " " : "");
      return R("That one's not in my brain yet! My growing brain says: “" + b.trim() + "?”", "confused");
    }
    return { handle: handle };
  })();

  /* ---------- contact link (assembled in the browser) ---------- */
  $$("a.eml").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      try { location.href = "mai" + "lto:" + atob(a.getAttribute("data-a")) + String.fromCharCode(64) + atob(a.getAttribute("data-b")); } catch (x) {}
    });
  });
  var yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- boot ---------- */
  renderPath(0); setStageArt(0);
  setTimeout(function () {
    addBot({ reply: "Hi! I'm Big AI Brain. 🧠 I'm brand new, I know some jokes, I can do math, and I looooove to learn. Want to hear a joke, or want me to teach you something?", lobe: "smalltalk", mood: "happy" });
    talk(1400);
  }, 400);
  findApi().then(function (a) {
    API = a;
    if (!API) { $("#offlineNote").hidden = false; }
    else { loadStats(); setInterval(loadStats, 30000); }
    var pre = null;
    try { pre = new URLSearchParams(location.search).get("ask") || sessionStorage.getItem("bab_say"); sessionStorage.removeItem("bab_say"); } catch (e) {}
    if (pre) { setTimeout(function () { document.getElementById("chat").scrollIntoView({ block: "center" }); send(pre.slice(0, 300)); }, 900); }
  });
})();
