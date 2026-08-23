/* Maddix Bot — floating AI pet widget (ChatGPT-Pets style) */
(function () {
  "use strict";

  var AI_ENDPOINT = "https://shiktak.com/ai/chat";
  var CONTACT_ENDPOINT = "https://shiktak.com/ai/contact";
  var STORAGE_KEY = "maddybot-history";
  var MAX_TURNS = 10;

  function t(en, fa) {
    return (document.documentElement.lang === "fa") ? fa : en;
  }

  var WELCOME_EN = "Hi! I'm Maddix Bot 🤖 maddix's little assistant. Ask me anything about his skills, projects or how to reach him!";
  var WELCOME_FA = "سلام! من مدی باتم 🤖 دستیار کوچیک maddix. درباره مهارت‌ها، پروژه‌ها یا راه‌های ارتباطی هر سوالی داری بپرس!";

  var SUGGESTIONS = [
    { en: "Who is maddix?", fa: "maddix کیه؟" },
    { en: "What are his skills?", fa: "چه مهارت‌هایی داره؟" },
    { en: "Show me his projects", fa: "پروژه‌هاش رو نشونم بده" },
    { en: "How can I contact him?", fa: "چطور باهاش تماس بگیرم؟" }
  ];

  /* ---------- state ---------- */
  var messages = [];
  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved) && saved.length && saved[saved.length - 1].role === "assistant") messages = saved.slice(-MAX_TURNS * 2);
  } catch (e) { messages = []; }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_TURNS * 2))); } catch (e) {}
  }

  /* ---------- build DOM ---------- */
  var root = document.createElement("div");
  root.className = "mzpet-root";
  root.innerHTML =
    '<div class="mzpet-teaser" id="mzpetTeaser" role="status"></div>' +
    '<button class="mzpet-btn" id="mzpetBtn" aria-label="Open AI assistant">' +
      '<svg class="mzpet-svg" viewBox="0 0 120 120" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="mzBody" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#1fe0b5"/><stop offset="1" stop-color="#1ba5ff"/>' +
          '</linearGradient>' +
          '<radialGradient id="mzGlow" cx="0.35" cy="0.25" r="0.8">' +
            '<stop offset="0" stop-color="rgba(255,255,255,.55)"/><stop offset="0.5" stop-color="rgba(255,255,255,0)"/>' +
          '</radialGradient>' +
        '</defs>' +
        '<ellipse class="mzpet-shadow" cx="60" cy="108" rx="30" ry="6"/>' +
        '<path class="mzpet-body" d="M60 14 C88 14 104 38 104 64 C104 90 86 102 60 102 C34 102 16 90 16 64 C16 38 32 14 60 14 Z"/>' +
        '<path fill="url(#mzGlow)" d="M60 14 C88 14 104 38 104 64 C104 90 86 102 60 102 C34 102 16 90 16 64 C16 38 32 14 60 14 Z"/>' +
        '<g class="mzpet-face">' +
          '<g class="mzpet-eye mzpet-eye-l"><ellipse cx="44" cy="58" rx="7.5" ry="9"/><circle class="mzpet-glint" cx="46.5" cy="54.5" r="2.4"/></g>' +
          '<g class="mzpet-eye mzpet-eye-r"><ellipse cx="76" cy="58" rx="7.5" ry="9"/><circle class="mzpet-glint" cx="78.5" cy="54.5" r="2.4"/></g>' +
          '<path class="mzpet-mouth" d="M50 76 Q60 85 70 76"/>' +
          '<circle class="mzpet-cheek mzpet-cheek-l" cx="33" cy="72" r="4.5"/>' +
          '<circle class="mzpet-cheek mzpet-cheek-r" cx="87" cy="72" r="4.5"/>' +
        '</g>' +
      '</svg>' +
      '<span class="mzpet-status-dot" aria-hidden="true"></span>' +
    '</button>';

  var panel = document.createElement("div");
  panel.className = "mzpet-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Maddix Bot AI assistant");
  panel.hidden = true;
  panel.innerHTML =
    '<div class="mzpet-head">' +
      '<div class="mzpet-head-avatar"><svg viewBox="0 0 120 120" aria-hidden="true">' +
        '<use href="#mzpetFaceRef"/>' +
      '</svg></div>' +
      '<div class="mzpet-head-info"><strong>Maddix Bot</strong><span class="mzpet-head-sub"><i class="mzpet-online"></i><span id="mzpetHeadSub">online</span></span></div>' +
      '<button class="mzpet-close" id="mzpetClose" aria-label="Close">&times;</button>' +
    '</div>' +
    '<div class="mzpet-tabs">' +
      '<button type="button" class="mzpet-tab active" id="mzTabAi">🤖 <span>' + (t("AI Chat", "چت هوشمند")) + '</span></button>' +
      '<button type="button" class="mzpet-tab" id="mzTabContact">✉️ <span>' + (t("Message maddix", "پیام به maddix")) + '</span></button>' +
    '</div>' +
    '<div class="mzpet-view" id="mzViewChat">' +
      '<div class="mzpet-msgs" id="mzpetMsgs"></div>' +
      '<div class="mzpet-chips" id="mzpetChips"></div>' +
      '<form class="mzpet-form" id="mzpetForm">' +
        '<input class="mzpet-input" id="mzpetInput" type="text" autocomplete="off" maxlength="500" />' +
        '<button class="mzpet-send" type="submit" aria-label="Send"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>' +
      '</form>' +
    '</div>' +
    '<div class="mzpet-view" id="mzViewContact" hidden>' +
      '<form class="mzpet-contact" id="mzContactForm">' +
        '<p class="mzpet-contact-hint">' + t("Write your message — it goes straight to maddix's Telegram. He'll get back to you!", "پیامت را بنویس — مستقیم به تلگرام maddix میرسد. در اسرع وقت جواب میدهد!") + '</p>' +
        '<input class="mzpet-field" id="mzCName" type="text" maxlength="80" placeholder="' + t("Your name (optional)", "اسم شما (اختیاری)") + '" />' +
        '<input class="mzpet-field" id="mzCReply" type="text" maxlength="120" placeholder="' + t("Email / Telegram for reply (optional)", "ایمیل / تلگرام برای پاسخ (اختیاری)") + '" />' +
        '<textarea class="mzpet-field mzpet-area" id="mzCMsg" rows="4" required placeholder="' + t("Your message...", "پیام شما...") + '"></textarea>' +
        '<button class="mzpet-send-wide" type="submit" id="mzCSend">📨 ' + t("Send to maddix", "ارسال به maddix") + '</button>' +
        '<p class="mzpet-contact-ok" id="mzCOk" hidden></p>' +
      '</form>' +
    '</div>';

  /* shared defs so head avatar reuses body art */
  var defs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  defs.setAttribute("width", "0"); defs.setAttribute("height", "0");
  defs.style.position = "absolute";
  defs.innerHTML =
    '<defs><g id="mzpetFaceRef">' +
      '<linearGradient id="mzBody2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1fe0b5"/><stop offset="1" stop-color="#1ba5ff"/></linearGradient>' +
      '<path fill="url(#mzBody2)" d="M60 14 C88 14 104 38 104 64 C104 90 86 102 60 102 C34 102 16 90 16 64 C16 38 32 14 60 14 Z"/>' +
      '<ellipse cx="44" cy="58" rx="7.5" ry="9" fill="#06251f"/><ellipse cx="76" cy="58" rx="7.5" ry="9" fill="#06251f"/>' +
      '<circle cx="46.5" cy="54.5" r="2.4" fill="#fff"/><circle cx="78.5" cy="54.5" r="2.4" fill="#fff"/>' +
      '<path d="M50 76 Q60 85 70 76" stroke="#06251f" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '</g></defs>';
  document.body.appendChild(defs);

  document.body.appendChild(root);
  document.body.appendChild(panel);

  var btn = root.querySelector("#mzpetBtn");
  var teaser = root.querySelector("#mzpetTeaser");
  var closeBtn = panel.querySelector("#mzpetClose");
  var msgsEl = panel.querySelector("#mzpetMsgs");
  var chipsEl = panel.querySelector("#mzpetChips");
  var form = panel.querySelector("#mzpetForm");
  var input = panel.querySelector("#mzpetInput");
  var headSub = panel.querySelector("#mzpetHeadSub");

  /* ---------- rendering ---------- */
  function bubble(role, text) {
    var el = document.createElement("div");
    el.className = "mzpet-msg mzpet-msg-" + role;
    el.textContent = text;
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return el;
  }

  function typing() {
    var el = document.createElement("div");
    el.className = "mzpet-msg mzpet-msg-assistant mzpet-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return el;
  }

  function renderChips() {
    chipsEl.innerHTML = "";
    SUGGESTIONS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mzpet-chip";
      b.textContent = t(s.en, s.fa);
      b.addEventListener("click", function () { send(b.textContent); });
      chipsEl.appendChild(b);
    });
  }

  function restore() {
    if (!messages.length) {
      bubble("assistant", t(WELCOME_EN, WELCOME_FA));
    } else {
      messages.forEach(function (m) { bubble(m.role === "user" ? "user" : "assistant", m.content); });
    }
  }

  /* ---------- chat logic ---------- */
  var busy = false;

  function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true;
    input.value = "";
    bubble("user", text);
    messages.push({ role: "user", content: text });
    var tip = typing();

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 45000);

    fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: document.documentElement.lang === "fa" ? "fa" : "en", messages: messages.slice(-MAX_TURNS * 2) }),
      signal: ctrl.signal
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var reply = (data && (data.reply || data.content)) || "";
        if (!reply) throw new Error("empty");
        messages.push({ role: "assistant", content: reply });
        persist();
        tip.remove();
        bubble("assistant", reply);
      })
      .catch(function () {
        tip.remove();
        bubble("assistant", t(
          "Hmm, my brain isn't reachable right now 🛠️ Please try again in a bit.",
          "هوم، مغزم الان در دسترس نیست 🛠️ کمی بعد دوباره امتحان کن."
        ));
      })
      .then(function () { busy = false; input.focus(); });
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });

  /* ---------- contact (message to maddix) ---------- */
  var tabAi = panel.querySelector("#mzTabAi");
  var tabContact = panel.querySelector("#mzTabContact");
  var viewChat = panel.querySelector("#mzViewChat");
  var viewContact = panel.querySelector("#mzViewContact");
  var contactForm = panel.querySelector("#mzContactForm");
  var contactOk = panel.querySelector("#mzCOk");
  var cSendBtn = panel.querySelector("#mzCSend");

  function switchTab(toContact) {
    localize();
    tabAi.classList.toggle("active", !toContact);
    tabContact.classList.toggle("active", !!toContact);
    viewChat.hidden = !!toContact;
    viewContact.hidden = !toContact;
    if (!toContact) setTimeout(function () { input.focus(); }, 100);
  }
  tabAi.addEventListener("click", function () { switchTab(false); });
  tabContact.addEventListener("click", function () {
    contactOk.hidden = true;
    switchTab(true);
    startReplyPolling();
  });

  /* ---------- two-way thread with maddix (telegram bridge) ---------- */
  var SID_KEY = "maddybot-sid";
  var LAST_TS_KEY = "maddybot-lastts";
  var sid = "";
  var lastTs = parseInt(localStorage.getItem(LAST_TS_KEY) || "0", 10) || 0;
  try {
    sid = localStorage.getItem(SID_KEY);
    if (!sid || !/^[a-z0-9]{6,16}$/.test(sid)) {
      sid = Math.random().toString(36).slice(2, 12);
      localStorage.setItem(SID_KEY, sid);
    }
  } catch (e) { sid = "s" + Date.now().toString(36); }

  var threadEl = document.createElement("div");
  threadEl.className = "mzpet-thread";
  threadEl.setAttribute("aria-live", "polite");
  var contactView = panel.querySelector("#mzViewContact");
  contactView.insertBefore(threadEl, contactForm);

  function addThreadBubble(from, text) {
    var b = document.createElement("div");
    b.className = "mzpet-tbubble " + from;
    b.textContent = text;
    threadEl.appendChild(b);
    threadEl.scrollTop = threadEl.scrollHeight;
    while (threadEl.children.length > 30) threadEl.removeChild(threadEl.firstChild);
  }

  var pollTimer = null;
  function pollReplies() {
    fetch(CONTACT_ENDPOINT.replace(/\/contact$/, "/contact/" + sid + "/replies?since=" + lastTs))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.ok || !d.replies || !d.replies.length) return;
        d.replies.forEach(function (m) {
          if (m.ts <= lastTs) return;
          lastTs = m.ts;
          addThreadBubble("maddix", m.text);
        });
        localStorage.setItem(LAST_TS_KEY, String(lastTs));
        persistThread();
      })
      .catch(function () {});
  }
  function startReplyPolling() {
    pollReplies();
    if (!pollTimer) pollTimer = setInterval(pollReplies, 8000);
  }

  /* restore past thread on load */
  (function restoreThread() {
    var saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("maddybot-thread") || "[]");
      if (!Array.isArray(saved)) saved = [];
    } catch (e) {}
    saved.slice(-20).forEach(function (m) { addThreadBubble(m.from, m.text); });
  })();

  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = panel.querySelector("#mzCMsg").value.trim();
    if (!msg || cSendBtn.disabled) return;
    cSendBtn.disabled = true;
    var label = cSendBtn.textContent;
    cSendBtn.textContent = "⏳ " + t("Sending...", "در حال ارسال...");

    fetch(CONTACT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: panel.querySelector("#mzCName").value.trim().substring(0, 80),
        reply: panel.querySelector("#mzCReply").value.trim().substring(0, 120),
        message: msg.substring(0, 1500),
        page: location.href,
        lang: document.documentElement.lang === "fa" ? "fa" : "en",
        sid: sid
      })
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error("failed");
        contactForm.reset();
        addThreadBubble("visitor", msg);
        persistThread();
        contactOk.textContent = t("✅ Sent! maddix gets it instantly — his reply appears right here.", "✅ ارسال شد! همان لحظه به maddix میرسد — پاسخش همینجا نمایش داده میشود.");
        contactOk.className = "mzpet-contact-ok ok";
        startReplyPolling();
      })
      .catch(function () {
        contactOk.textContent = t("❌ Couldn't send. Try again or email mohammad@iodeck.ir", "❌ ارسال نشد. دوباره امتحان کن یا به mohammad@iodeck.ir ایمیل بزن");
        contactOk.className = "mzpet-contact-ok err";
      })
      .then(function () {
        contactOk.hidden = false;
        cSendBtn.disabled = false;
        cSendBtn.textContent = label;
      });
  });

  function persistThread() {
    var arr = Array.prototype.map.call(threadEl.children, function (b) {
      return { from: b.classList.contains("maddix") ? "maddix" : "visitor", text: b.textContent };
    });
    try { localStorage.setItem("maddybot-thread", JSON.stringify(arr)); } catch (e) {}
  }

  /* ---------- open/close ---------- */
  function open() {
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add("open"); });
    btn.classList.add("active");
    hideTeaser();
    msgsEl.scrollTop = msgsEl.scrollHeight;
    setTimeout(function () { input.focus(); }, 250);
  }

  function close() {
    panel.classList.remove("open");
    btn.classList.remove("active");
    setTimeout(function () { panel.hidden = true; }, 260);
  }

  btn.addEventListener("click", function () {
    if (panel.hidden) open(); else close();
  });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) close();
  });

  /* ---------- teaser bubble ---------- */
  function showTeaser() {
    teaser.textContent = t("Hi! Ask me anything 👋", "سلام! هر سؤالی داری بپرس 👋");
    teaser.classList.add("show");
    btn.classList.add("wiggle");
    setTimeout(function () { btn.classList.remove("wiggle"); }, 1200);
  }
  function hideTeaser() { teaser.classList.remove("show"); }

  var teasedOnce = false;
  setTimeout(function () {
    if (panel.hidden && !teasedOnce) { teasedOnce = true; showTeaser(); }
  }, 6000);

  /* ---------- eye tracking + blinking ---------- */
  var face = root.querySelector(".mzpet-face");
  document.addEventListener("mousemove", function (e) {
    if (!face) return;
    var r = btn.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 220));
    var dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 220));
    face.style.transform = "translate(" + dx * 4 + "px," + dy * 3 + "px)";
  });

  setInterval(function () {
    if (!root.isConnected) return;
    root.classList.add("blink");
    setTimeout(function () { root.classList.remove("blink"); }, 160);
  }, 3800 + Math.floor(Math.random() * 2200));

  /* localize static labels on open */
  var headSubEl = panel.querySelector("#mzpetHeadSub");
  var cNameEl = panel.querySelector("#mzCName");
  var cReplyEl = panel.querySelector("#mzCReply");
  var cMsgEl = panel.querySelector("#mzCMsg");
  var cHintEl = panel.querySelector(".mzpet-contact-hint");
  function localize() {
    headSub.textContent = t("online", "آنلاین");
    input.placeholder = t("Ask me anything...", "هر سؤالی داری بپرس...");
    tabAi.innerHTML = '🤖 <span>' + t("AI Chat", "چت هوشمند") + '</span>';
    tabContact.innerHTML = '✉️ <span>' + t("Message maddix", "پیام به maddix") + '</span>';
    cHintEl.textContent = t("Write your message — it goes straight to maddix's Telegram. He'll get back to you!", "پیامت را بنویس — مستقیم به تلگرام maddix میرسد. در اسرع وقت جواب میدهد!");
    cNameEl.placeholder = t("Your name (optional)", "اسم شما (اختیاری)");
    cReplyEl.placeholder = t("Email / Telegram for reply (optional)", "ایمیل / تلگرام برای پاسخ (اختیاری)");
    cMsgEl.placeholder = t("Your message...", "پیام شما...");
    cSendBtn.innerHTML = '📨 ' + t("Send to maddix", "ارسال به maddix");
  }
  var origOpen = open;
  open = function () {
    localize();
    if (!messages.length) msgsEl.innerHTML = "";
    if (!msgsEl.children.length) restore();
    renderChips();
    origOpen();
  };

  /* clear history button via double-click header sub */
  panel.querySelector(".mzpet-head-info").addEventListener("dblclick", function () {
    messages = [];
    persist();
    msgsEl.innerHTML = "";
    bubble("assistant", t(WELCOME_EN, WELCOME_FA));
  });

  /* ---------- konami easter egg: pet party! ---------- */
  var KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  var kIdx = 0;
  document.addEventListener("keydown", function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kIdx = (k === KONAMI[kIdx]) ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kIdx !== KONAMI.length) return;
    kIdx = 0;
    root.classList.add("party");
    showTeaser();
    teaser.textContent = t("🎉 Party mode!! You found the secret!", "🎉 حالت پارتی!! راز رو پیدا کردی!");
    var colors = ["#1fe0b5", "#1ba5ff", "#ffc857", "#ff6bd6", "#8cff6b"];
    for (var i = 0; i < 26; i++) {
      (function (i) {
        setTimeout(function () {
          var p = document.createElement("span");
          p.className = "mzpet-confetti";
          p.style.left = (btn.getBoundingClientRect().left + btn.offsetWidth / 2) + "px";
          p.style.top = (btn.getBoundingClientRect().top + 10) + "px";
          p.style.background = colors[i % colors.length];
          p.style.setProperty("--dx", (Math.random() * 220 - 110) + "px");
          p.style.setProperty("--dy", -(60 + Math.random() * 160) + "px");
          document.body.appendChild(p);
          setTimeout(function () { p.remove(); }, 1300);
        }, i * 55);
      })(i);
    }
    setTimeout(function () { root.classList.remove("party"); }, 6000);
  });
})();