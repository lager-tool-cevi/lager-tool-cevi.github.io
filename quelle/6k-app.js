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
      <button class="ab-btn ab-back" id="ab-back" type="button" aria-label="Zurück" hidden>${ICO.back}</button>
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
    const wurzel = [...document.querySelectorAll("#bnav [data-view]")].map((b) => b.dataset.view);
    const zurueck = typeof navDepth === "number" && navDepth > 0 && !wurzel.includes(state.view); $("#ab-back").hidden = !zurueck;
    const n = bellItems().filter((x) => x.unread).length; const c = $("#ab-bell-n"); c.hidden = !n; c.textContent = n > 9 ? "9+" : n;
    document.body.classList.toggle("app-zurueck", zurueck);
  }
  const renderSideOrig5 = renderSide;
  renderSide = function () { renderSideOrig5(); appbarPaint(); };
  const renderOrig5 = render;
  render = function () { renderOrig5(); appbarPaint(); };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(".appbar .ab-btn"); if (!b) return;
    if (b.id === "ab-back") return history.back();
    if (b.id === "ab-search") return cmdk();
    if (b.id === "ab-bell") return bellOpen();
    if (b.id === "ab-sos") return showSos();
  });

  // ---------- «Mehr»: alle Seiten als Kacheln, Konto, Notfall ----------
  function mehrBlatt() {
    const kacheln = [...document.querySelectorAll("#tabs button[data-view]")].filter((b) => !b.hidden && !["help", "prefs", "trash"].includes(b.dataset.view));
    const extra = [...document.querySelectorAll("#tabs button[data-view]")].filter((b) => !b.hidden && ["prefs", "help", "trash"].includes(b.dataset.view));
    const cd = $("#countdown"); const cdTxt = cd ? cd.innerHTML.replace(/<br\s*\/?>/g, " ").replace(/<\/(b|span|div)>/g, " · ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").replace(/(\s·\s*)+/g, " · ").replace(/^ · | · $/g, "").replace(/\s·\s*$/, "").trim() : "";
    const o = modal(`<div class="mehr-kopf">${av(me() || "?")}<div><b>${esc(me() || "–")}</b><span class="muted">${isReadOnly() ? "Nur lesen" : isLaLei() ? "Lagerleitung" : "Team"} · ${esc(lagerDoc().title || "")}</span></div><button class="btn small ghost" data-mehr-zu aria-label="Schliessen">✕</button></div>
      ${cdTxt ? `<div class="mehr-cd">${esc(cdTxt)}</div>` : ""}
      <div class="mehr-grid">${kacheln.map((b) => { const svg = b.querySelector("svg"); const cnt = b.querySelector(".count:not([hidden])"); const label = [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
        return `<button type="button" class="mehr-k ${b.dataset.view === state.view ? "on" : ""}" data-mehr-view="${esc(b.dataset.view)}">${svg ? svg.outerHTML : ""}<span>${esc(label)}</span>${cnt ? `<i>${esc(cnt.textContent)}</i>` : ""}</button>`; }).join("")}</div>
      <div class="mehr-liste">
        <button type="button" class="mehr-z sos-z" data-mehr="sos">${ICO.sos}<span>Notfall</span></button>
        ${extra.map((b) => `<button type="button" class="mehr-z" data-mehr-view="${esc(b.dataset.view)}">${b.querySelector("svg") ? b.querySelector("svg").outerHTML : ""}<span>${esc([...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim())}</span></button>`).join("")}
        <button type="button" class="mehr-z" data-mehr="fb">${ICO.search.replace('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', '<path d="M4 5h16v11H8l-4 4z"/>')}<span>Feedback zum Tool</span></button>
        ${isLaLei() && !state.asTeam ? `<button type="button" class="mehr-z" data-mehr="team"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg><span>Als Team ansehen</span></button>` : ""}
        ${state.asTeam ? `<button type="button" class="mehr-z" data-mehr="lalei"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg><span>Zurück zur Lagerleitung</span></button>` : ""}
        <button type="button" class="mehr-z" data-mehr="lager"><svg viewBox="0 0 24 24"><path d="M3 20h18M5 20V10l7-6 7 6v10"/></svg><span>Anderes Lager</span></button>
        <button type="button" class="mehr-z" data-mehr="logout"><svg viewBox="0 0 24 24"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg><span>Abmelden</span></button>
      </div><div class="mehr-sync muted">${esc(($("#sync-state") || {}).textContent || "")}</div>`, "mehr-blatt");
    o.onclick = (e) => {
      if (e.target === o || e.target.closest("[data-mehr-zu]")) return closeDrawer();
      const v = e.target.closest("[data-mehr-view]"); if (v) { closeDrawer(); return setView(v.dataset.mehrView); }
      const a = e.target.closest("[data-mehr]"); if (!a) return; const k = a.dataset.mehr; closeDrawer();
      if (k === "sos") return showSos(); if (k === "fb") return toolFeedbackOpen(); if (k === "team") return setAsTeam(true); if (k === "lalei") return setAsTeam(false);
      if (k === "lager") return $("[data-home]") && $("[data-home]").click(); if (k === "logout") return $("#logout") && $("#logout").click();
    };
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
