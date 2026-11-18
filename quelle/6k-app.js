  // =====================================================================
  // Handy wie eine App: schmale Kopfleiste (Zurück, Seitentitel, Suche, Glocke, Notfall),
  // Tab-Leiste unten, «Mehr» als Blatt mit allen Seiten als Kacheln
  // =====================================================================
  const istHandy = () => window.matchMedia("(max-width: 760px)").matches;
  const ICO = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    sos: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  };
  (() => {
    const app = $("#app"); if (!app || $("#appbar")) return;
    app.insertAdjacentHTML("afterbegin", `<header class="appbar" id="appbar">
      <button class="ab-btn ab-back" id="ab-back" type="button" aria-label="Zurück" hidden>${ICO.back}<span id="ab-back-l">Zurück</span></button>
      <div class="ab-title"><b id="ab-title">Lager-Tool</b><span id="ab-sub"></span></div>
      <button class="ab-btn" id="ab-search" type="button" aria-label="Suchen">${ICO.search}</button>
      <button class="ab-btn" id="ab-bell" type="button" aria-label="Mitteilungen">${ICO.bell}<span class="count" id="ab-bell-n" hidden></span></button>
      <button class="ab-btn ab-sos" id="ab-sos" type="button" aria-label="Notfall">${ICO.sos}</button></header>`);
    const m = document.querySelector('meta[name="theme-color"]'); if (!m) document.head.insertAdjacentHTML("beforeend", '<meta name="theme-color" content="#ffffff">');
  })();
  function appbarPaint() {
    const t = $("#ab-title"); if (!t || !state.lagerId) return;
    const h1 = $("#view .page-head h1"); const titel = h1 ? [...h1.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim() : "";
    const nav = $(`#tabs button[data-view="${state.view}"]`);
    t.textContent = titel || (nav ? nav.textContent.trim() : "") || lagerDoc().title || "Lager-Tool";
    const sub = $("#ab-sub"); const r = isCampNow() ? (() => { const c = campRange(); return `Tag ${daysBetween(parse(c.from), today()) + 1} von ${daysBetween(parse(c.from), parse(c.to)) + 1}`; })() : "";
    const lt = lagerDoc().title || ""; sub.textContent = [t.textContent === lt ? (isLaLei() ? "Übersicht" : "") : lt, r].filter(Boolean).join(" · ");
    // Leiste unten: kein Pfeil. Tagesseite: zu den Tagen. Alles andere: zur Startseite.
    const wurzel = [...document.querySelectorAll("#bnav [data-view]")].map((b) => b.dataset.view);
    const home = isLaLei() ? "start" : "home";
    const ziel = state.view === "day" ? "days" : "mehr";
    const zurueck = !wurzel.includes(state.view) && state.view !== home; const bb = $("#ab-back"); bb.hidden = !zurueck; bb.dataset.ziel = ziel;
    const nl = (z) => { const b = $(`#tabs button[data-view="${z}"]`); return b ? [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim() : ""; };
    $("#ab-back-l").textContent = ziel === "mehr" ? "Mehr" : nl(ziel) || "Zurück"; bb.setAttribute("aria-label", "Zurück zu " + $("#ab-back-l").textContent);
    const n = bellItems().filter((x) => x.unread).length; const c = $("#ab-bell-n"); c.hidden = !n; c.textContent = n > 9 ? "9+" : n;
    document.body.classList.toggle("app-zurueck", zurueck);
    const more = $("#bnav [data-more]"); if (more) more.setAttribute("aria-selected", String(!wurzel.includes(state.view)));
    document.querySelectorAll("#bnav [data-view]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === (state.view === "day" ? "days" : state.view))));
  }
  const renderSideOrig5 = renderSide;
  renderSide = function () { renderSideOrig5(); appbarPaint(); };
  const renderOrig5 = render;
  render = function () { renderOrig5(); appbarPaint(); };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(".appbar .ab-btn"); if (!b) return;
    if (b.id === "ab-back") { const z = b.dataset.ziel; return z === "mehr" ? mehrBlatt() : setView(z || (isLaLei() ? "start" : "home")); }
    if (b.id === "ab-search") return cmdk();
    if (b.id === "ab-bell") return bellOpen();
    if (b.id === "ab-sos") return showSos();
  });

  // ---------- «Mehr»: alle Seiten als Kacheln, Konto, Notfall ----------
  function mehrBlatt() {
    const txt = (b) => [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    const navs = [...document.querySelectorAll("#tabs button[data-view]")].filter((b) => !b.hidden);
    const kacheln = navs.filter((b) => !["help", "prefs", "trash"].includes(b.dataset.view));
    const extra = navs.filter((b) => ["prefs", "help", "trash"].includes(b.dataset.view));
    const svgOf = (b) => (b.querySelector("svg") ? b.querySelector("svg").outerHTML : "");
    const SV = {
      fb: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>',
      lager: '<svg viewBox="0 0 24 24"><path d="M3 20h18M5 20V10l7-6 7 6v10"/><path d="M10 20v-5h4v5"/></svg>',
      logout: '<svg viewBox="0 0 24 24"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
      team: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
      app: '<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 7v7M9 11l3 3 3-3"/></svg>',
      ds: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
      set: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
    };
    const installiert = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const o = modal(`<div class="mehr-kopf">${av(me() || "?")}<div><b>${esc(me() || "–")}</b><span class="muted">${isReadOnly() ? "Nur lesen" : isLaLei() ? "Lagerleitung" : "Team"} · ${esc(lagerDoc().title || "")}</span></div><button class="btn small ghost" data-mehr-zu aria-label="Schliessen">✕</button></div>
      <div class="mehr-konto">
        <button type="button" data-mehr="lager">${SV.lager}<span>Alle Lager</span></button>
        <button type="button" data-mehr-view="prefs">${svgOf($('#tabs button[data-view="prefs"]')) || SV.set}<span>Einstellungen</span></button>
        <button type="button" data-mehr="fb">${SV.fb}<span>Feedback</span></button>
        <button type="button" data-mehr="logout">${SV.logout}<span>Abmelden</span></button>
      </div>
      <input type="search" class="mehr-q" placeholder="Seite suchen, z.B. Packliste" aria-label="Seite suchen" autocomplete="off">
      <div class="mehr-label">Seiten</div>
      <div class="mehr-grid">${kacheln.map((b) => { const cnt = b.querySelector(".count:not([hidden])");
        return `<button type="button" class="mehr-k ${b.dataset.view === state.view ? "on" : ""}" data-mehr-view="${esc(b.dataset.view)}" data-such="${esc(txt(b).toLowerCase())}">${svgOf(b)}<span>${esc(txt(b))}</span>${cnt ? `<i>${esc(cnt.textContent)}</i>` : ""}</button>`; }).join("")}</div>
      <div class="mehr-label">Allgemein</div>
      <div class="mehr-grid">
        ${extra.map((b) => { const cnt = b.querySelector(".count:not([hidden])"); return `<button type="button" class="mehr-k ${b.dataset.view === state.view ? "on" : ""}" data-mehr-view="${esc(b.dataset.view)}" data-such="${esc(txt(b).toLowerCase())}">${svgOf(b)}<span>${esc(txt(b))}</span>${cnt ? `<i>${esc(cnt.textContent)}</i>` : ""}</button>`; }).join("")}
        ${isLaLei() && !state.asTeam ? `<button type="button" class="mehr-k" data-mehr="team" data-such="als team ansehen">${SV.team}<span>Als Team ansehen</span></button>` : ""}
        ${state.asTeam ? `<button type="button" class="mehr-k" data-mehr="lalei" data-such="zurück zur lagerleitung">${SV.team}<span>Zurück zur Lagerleitung</span></button>` : ""}
        ${installiert ? "" : `<button type="button" class="mehr-k" data-mehr="app" data-such="als app installieren startbildschirm">${SV.app}<span>Als App installieren</span></button>`}
        <button type="button" class="mehr-k" data-mehr="ds" data-such="datenschutz">${SV.ds}<span>Datenschutz</span></button>
      </div>
      <div class="mehr-leer muted" hidden>Nichts gefunden.</div>
      <div class="mehr-sync muted">${esc(($("#sync-state") || {}).textContent || "")}${STORE.version ? " · Version " + esc(STORE.version) : ""}</div>`, "mehr-blatt");
    const q = $(".mehr-q", o);
    q.oninput = () => { const s = q.value.trim().toLowerCase(); let n = 0; o.querySelectorAll("[data-such]").forEach((b) => { const ok = !s || b.dataset.such.includes(s); b.hidden = !ok; if (ok) n++; }); $(".mehr-leer", o).hidden = n > 0; };
    q.onkeydown = (e) => { if (e.key === "Enter") { const b = o.querySelector("[data-such]:not([hidden])"); if (b) b.click(); } };
    o.onclick = (e) => {
      if (e.target === o || e.target.closest("[data-mehr-zu]")) return closeDrawer();
      const v = e.target.closest("[data-mehr-view]"); if (v) { closeDrawer(); return setView(v.dataset.mehrView); }
      const a = e.target.closest("[data-mehr]"); if (!a) return; const k = a.dataset.mehr;
      if (k === "logout" && !confirm("Wirklich abmelden?")) return;
      closeDrawer();
      if (k === "sos") return showSos(); if (k === "fb") return toolFeedbackOpen(); if (k === "team") return setAsTeam(true); if (k === "lalei") return setAsTeam(false); if (k === "app") return appInstallieren(); if (k === "ds") return showDatenschutz();
      if (k === "lager") return $("[data-home]") && $("[data-home]").click(); if (k === "logout") return $("#logout") && $("#logout").click();
    };
  }
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("[data-app-inst]")) appInstallieren(); });
  // ---------- Als App installieren ----------
  function appInstallieren() {
    if (typeof installEvent !== "undefined" && installEvent) { installEvent.prompt(); installEvent.userChoice.catch(() => {}).finally(() => { installEvent = null; }); return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent); const safari = ios && !/crios|fxios|edgios/i.test(navigator.userAgent);
    const o = modal(`<div class="lg-head"><span class="eyebrow">Als App installieren</span><h2>Das Lager-Tool auf den Startbildschirm</h2></div>
      ${ios ? `<ol class="app-steps"><li>${safari ? "" : "Öffne diese Seite in <b>Safari</b> (bei Chrome auf dem iPhone geht es auch über Teilen). "}Tippe unten auf <b>Teilen</b> <span class="share-ico" aria-hidden="true">⬆︎</span></li><li>Scrolle und wähle <b>«Zum Home-Bildschirm»</b></li><li>Tippe auf <b>«Hinzufügen»</b></li></ol>`
        : `<ol class="app-steps"><li>Tippe oben rechts auf das Menü <b>⋮</b></li><li>Wähle <b>«App installieren»</b> oder <b>«Zum Startbildschirm hinzufügen»</b></li><li>Bestätige mit <b>«Installieren»</b></li></ol>`}
      <p class="muted" style="margin:0">Danach öffnet sich das Tool wie eine App: ohne Adressleiste, mit eigenem Symbol und angemeldet.</p>
      <div class="lg-foot"><span></span><button class="btn primary" data-app-ok>Alles klar</button></div>`);
    o.onclick = (e) => { if (e.target === o || e.target.closest("[data-app-ok]")) closeDrawer(); };
  }
  $("#bnav").addEventListener("click", (e) => { const b = e.target.closest("[data-more]"); if (!b || !istHandy()) return; e.stopImmediatePropagation(); document.body.classList.remove("nav-open"); mehrBlatt(); }, true);

  // ---------- Tab-Leiste: Mehr zeigt, ob dort etwas wartet ----------
  const renderBnavOrig5 = renderBnav;
  renderBnav = function () {
    renderBnavOrig5(); const more = $("#bnav [data-more]"); if (!more) return;
    const unten = [...$("#bnav").querySelectorAll("[data-view]")].map((b) => b.dataset.view);
    const anderswo = [...document.querySelectorAll("#tabs button[data-view] .count:not([hidden])")].some((c) => !unten.includes(c.closest("button").dataset.view));
    more.classList.toggle("dot", anderswo);
    more.setAttribute("aria-selected", String(!unten.includes(state.view)));
  };
  window.addEventListener("resize", () => { if (state.lagerId) appbarPaint(); });
