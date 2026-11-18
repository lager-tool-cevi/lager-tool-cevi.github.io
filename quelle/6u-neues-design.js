  // =====================================================================
  // Neues Design «Blau mit Bausteinen» (nur mit <html class="nd4">).
  // Hängt sich an die bestehenden Funktionen an: alle Knöpfe rufen die gleichen Abläufe auf wie bisher.
  // PC: blaue Leiste oben mit Reitern (Start, Planung, Lager, Allgemein) und den Seiten darunter.
  // Start: Streifen mit Countdown, Bausteine, Kacheln. Aufgaben: Filterliste links, Karten in Spalten.
  // =====================================================================
  NEUES.unshift({ id: "2026-11-design", titel: "Neu: frisches Aussehen", punkte: [
    "Oben eine blaue Leiste mit den Bereichen Start, Planung, Lager und Allgemein, darunter die Seiten.",
    "Start: Countdown, «Für dich», nächster Höck und alle Seiten als Kacheln.",
    "Aufgaben als Karten nach Dringlichkeit. Der Knopf «Offen» wählt, was angezeigt wird, und wie (Karten, Liste, Personen, Kanban).",
    "Konto, Einstellungen, Hilfe und Abmelden findest du oben rechts unter deinem Kürzel.",
  ] });
  const nd4an = () => document.documentElement.classList.contains("nd4");
  const ND4 = { aktiv: "", mehr: {}, malen: 0 };
  const nd4Txt = (b) => [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  const nd4Svg = {
    such: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    glocke: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    tel: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    lager: '<svg viewBox="0 0 24 24"><path d="M3 20h18M5 20V10l7-6 7 6v10"/><path d="M10 20v-5h4v5"/></svg>',
    raus: '<svg viewBox="0 0 24 24"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
    fb: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>',
    team: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    app: '<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 7v7M9 11l3 3 3-3"/></svg>',
    ds: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  };

  // ---------- Reiter aus der bisherigen Seitenleiste ableiten ----------
  function nd4Gruppen() {
    const nav = $("#tabs"); if (!nav) return { start: null, gruppen: [], extra: [] };
    const home = isLaLei() ? "start" : "home";
    let start = null; const gruppen = []; const extra = []; let g = null; let nachSep = false;
    for (const el of nav.children) {
      if (el.classList.contains("fav-label") || el.classList.contains("fav-btn") || el.classList.contains("back")) continue;
      if (el.classList.contains("nav-label")) { g = el.hidden ? null : { name: el.textContent.trim(), items: [] }; if (g) gruppen.push(g); continue; }
      if (el.classList.contains("nav-sep")) { nachSep = true; g = null; continue; }
      if (el.tagName !== "BUTTON" || !el.dataset.view || el.hidden) continue;
      if (el.dataset.view === home) { start = el; continue; }
      if (nachSep) { extra.push(el); continue; }
      if (g) g.items.push(el);
    }
    return { start, gruppen: gruppen.filter((x) => x.items.length), extra };
  }
  function nd4Favs() {
    const nav = $("#tabs"); if (!nav) return [];
    return [...nav.querySelectorAll(".fav-btn[data-view]")].map((f) => nav.querySelector(`button[data-view="${f.dataset.view}"]:not(.fav-btn)`)).filter((b) => b && !b.hidden);
  }
  function nd4Kopf() {
    let k = $("#nd4-kopf"); if (k) return k;
    const c = $(".content"); if (!c) return null;
    c.insertAdjacentHTML("afterbegin", `<div id="nd4-kopf"><header class="nd4-top"><button class="nd4-marke" type="button" data-nd4-start aria-label="Zur Startseite"></button><nav class="nd4-reiter" aria-label="Bereiche"></nav>
      <div class="nd4-werk"><button type="button" data-nd4="such" aria-label="Suchen (Strg+K)" title="Suchen (Strg+K)">${nd4Svg.such}</button><button type="button" data-nd4="glocke" aria-label="Mitteilungen" title="Mitteilungen">${nd4Svg.glocke}<span class="nd4-zahl" hidden></span></button><button type="button" class="nd4-sos" data-nd4="sos">${nd4Svg.tel}Notfall</button><button type="button" class="nd4-ich" data-nd4="ich" aria-label="Konto und Einstellungen" aria-haspopup="menu"></button></div></header>
      <nav class="nd4-unter" aria-label="Seiten"></nav></div>`);
    return $("#nd4-kopf");
  }
  function nd4Malen() {
    if (!nd4an() || !state.lagerId) return; const k = nd4Kopf(); if (!k) return;
    const { start, gruppen } = nd4Gruppen();
    const lg = lagerLogo(); const L = lagerDoc();
    $(".nd4-marke", k).innerHTML = lg ? `<span class="nd4-chip">${logoImg(lg)}</span>` : `<span class="nd4-mark">${esc($("#brand-mark") ? $("#brand-mark").textContent : "LL")}</span><b>${esc(L.title || "Lager-Tool")}</b>`;
    // aktive Gruppe: die mit der gewählten Seite
    const sel = $('#tabs button[data-view][aria-selected="true"]:not(.fav-btn)');
    let aktiv = ND4.aktiv;
    if (sel && start && sel === start) aktiv = "start";
    else if (sel) { const g = gruppen.find((x) => x.items.includes(sel)); if (g) aktiv = g.name; else aktiv = ""; }
    if (!aktiv) aktiv = state.view === (isLaLei() ? "start" : "home") ? "start" : ND4.aktiv || "start";
    ND4.aktiv = aktiv;
    if (sel && aktiv !== "start") { try { localStorage.setItem("nd4-letzte-" + aktiv, sel.dataset.view); } catch {} }
    const zaehlt = (g) => g.items.some((b) => { const c = b.querySelector(".count"); return c && !c.hidden && c.textContent.trim(); });
    $(".nd4-reiter", k).innerHTML = (start ? [`<button type="button" data-nd4-g="start" ${aktiv === "start" ? 'aria-current="page"' : ""}>Start</button>`] : []).concat(gruppen.map((g) => `<button type="button" data-nd4-g="${esc(g.name)}" ${aktiv === g.name ? 'aria-current="page"' : ""}>${esc(g.name)}${aktiv !== g.name && zaehlt(g) ? '<i class="nd4-n" aria-hidden="true"></i>' : ""}</button>`)).join("");
    // Seiten der aktiven Gruppe (beim Start: die Favoriten)
    const u = $(".nd4-unter", k);
    const knopf = (b) => { const c = b.querySelector(".count"); const an = (localStorage.getItem(isLaLei() ? "lalei-favoriten-lalei" : "lalei-favoriten-team") || "").includes(`"${b.dataset.view}"`);
      return `<button type="button" data-nd4-v="${esc(b.dataset.view)}" ${b.getAttribute("aria-selected") === "true" ? 'aria-current="page"' : ""}>${esc(nd4Txt(b))}${c && !c.hidden && c.textContent.trim() ? `<span class="count">${esc(c.textContent)}</span>` : ""}<span class="fav-stern ${an ? "an" : ""}" data-fav="${esc(b.dataset.view)}" title="${an ? "Nicht mehr als Favorit" : "Als Favorit auf den Start"}" aria-hidden="true">${an ? "★" : "☆"}</span></button>`; };
    if (aktiv === "start") { const f = nd4Favs(); u.hidden = !f.length; u.innerHTML = f.length ? `<span class="nd4-fav">Favoriten</span>${f.map(knopf).join("")}` : ""; }
    else { const g = gruppen.find((x) => x.name === aktiv); u.hidden = !g; u.innerHTML = g ? g.items.map(knopf).join("") : ""; }
    // Glocke, eigener Name, Sync
    const n = typeof bellItems === "function" ? bellItems().filter((x) => x.unread).length : 0; const z = $(".nd4-zahl", k); z.hidden = !n; z.textContent = n > 9 ? "9+" : n;
    const ich = $(".nd4-ich", k); ich.textContent = initials(me() || "?"); ich.title = (me() || "") + " · " + (isLaLei() ? "Lagerleitung" : "Team");
    const sy = ($("#sync-state") || {}).textContent || ""; ich.classList.toggle("wartet", /wartet|offline|nicht/i.test(sy));
    $(".nd4-sos", k).hidden = !$("#sos") || $("#sos").hidden;
  }
  function nd4Bald() { if (ND4.malen) return; ND4.malen = requestAnimationFrame(() => { ND4.malen = 0; nd4Malen(); }); }
  const renderSideOrigN4 = renderSide;
  renderSide = function () { renderSideOrigN4(); nd4Malen(); };
  const renderOrigN4 = render;
  render = function () { renderOrigN4(); nd4Malen(); };
  if ($("#tabs")) new MutationObserver(nd4Bald).observe($("#tabs"), { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "hidden"] });

  // ---------- Menü unter dem eigenen Namen ----------
  function nd4MenueZu() { const m = $(".nd4-menue"); if (m) m.remove(); }
  function nd4Menue(btn) {
    if ($(".nd4-menue")) return nd4MenueZu();
    const { extra } = nd4Gruppen(); const installiert = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const svgOf = (b) => (b.querySelector("svg") ? b.querySelector("svg").outerHTML : "");
    const m = document.createElement("div"); m.className = "nd4-menue"; m.setAttribute("role", "menu");
    m.innerHTML = `<div class="nd4-wer">${av(me() || "?")}<div><b>${esc(me() || "–")}</b><span>${isReadOnly() ? "Nur lesen" : isLaLei() ? "Lagerleitung" : "Team"} · ${esc(lagerDoc().title || "")}</span></div></div>
      <button type="button" role="menuitem" data-nd4m="lager">${nd4Svg.lager}Alle Lager</button>
      ${extra.map((b) => { const c = b.querySelector(".count"); return `<button type="button" role="menuitem" data-nd4m-v="${esc(b.dataset.view)}">${svgOf(b)}${esc(nd4Txt(b))}${c && !c.hidden && c.textContent.trim() ? `<span class="count">${esc(c.textContent)}</span>` : ""}</button>`; }).join("")}
      <button type="button" role="menuitem" data-nd4m="fb">${nd4Svg.fb}Feedback zum Tool</button>
      ${isLaLei() && !state.asTeam ? `<button type="button" role="menuitem" data-nd4m="team">${nd4Svg.team}Als Team ansehen</button>` : ""}
      ${state.asTeam ? `<button type="button" role="menuitem" data-nd4m="lalei">${nd4Svg.team}Zurück zur Lagerleitung</button>` : ""}
      ${installiert ? "" : `<button type="button" role="menuitem" data-nd4m="app">${nd4Svg.app}Als App installieren</button>`}
      <button type="button" role="menuitem" data-nd4m="ds">${nd4Svg.ds}Datenschutz</button>
      <hr><div class="nd4-sync">${esc(($("#sync-state") || {}).textContent || "")}${STORE.version ? " · Version " + esc(STORE.version) : ""}</div>
      <button type="button" role="menuitem" class="nd4-raus" data-nd4m="logout">${nd4Svg.raus}Abmelden</button>`;
    document.body.appendChild(m);
    const r = btn.getBoundingClientRect(); m.style.top = Math.round(r.bottom + 8) + "px"; m.style.right = Math.max(8, Math.round(window.innerWidth - r.right)) + "px";
    m.onclick = (e) => {
      const v = e.target.closest("[data-nd4m-v]"); if (v) { nd4MenueZu(); return setView(v.dataset.nd4mV); }
      const a = e.target.closest("[data-nd4m]"); if (!a) return; const k = a.dataset.nd4m; nd4MenueZu();
      if (k === "lager") return $("[data-home]") && $("[data-home]").click();
      if (k === "fb") return toolFeedbackOpen();
      if (k === "team") return setAsTeam(true);
      if (k === "lalei") return setAsTeam(false);
      if (k === "app") return appInstallieren();
      if (k === "ds") return showDatenschutz();
      if (k === "logout") return $("#logout") && $("#logout").click();
    };
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest) return;
    if ($(".nd4-menue") && !e.target.closest(".nd4-menue, [data-nd4='ich']")) nd4MenueZu();
    const kopf = e.target.closest("#nd4-kopf"); if (!kopf || e.target.closest("[data-fav]")) return;
    if (e.target.closest("[data-nd4-start]")) return setView(isLaLei() ? "start" : "home");
    const g = e.target.closest("[data-nd4-g]");
    if (g) {
      const name = g.dataset.nd4G; const { start, gruppen } = nd4Gruppen();
      if (name === "start") return start && start.click();
      const gr = gruppen.find((x) => x.name === name); if (!gr) return;
      let ziel = null; try { ziel = localStorage.getItem("nd4-letzte-" + name); } catch {}
      const b = gr.items.find((x) => x.dataset.view === ziel) || gr.items[0]; ND4.aktiv = name; return b.click();
    }
    const v = e.target.closest("[data-nd4-v]"); if (v) { const b = $(`#tabs button[data-view="${v.dataset.nd4V}"]:not(.fav-btn)`); return b ? b.click() : setView(v.dataset.nd4V); }
    const w = e.target.closest("[data-nd4]"); if (!w) return;
    if (w.dataset.nd4 === "such") return cmdk();
    if (w.dataset.nd4 === "glocke") return bellOpen();
    if (w.dataset.nd4 === "sos") return showSos();
    if (w.dataset.nd4 === "ich") return nd4Menue(w);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") nd4MenueZu(); });
  window.addEventListener("resize", nd4MenueZu);

  // ---------- Start: fehlender Höck als Baustein, Kacheln mit Symbol ----------
  const startUpdN4 = views.start.update;
  views.start.update = function () {
    startUpdN4(); if (!nd4an()) return; const b = $("#start-body"); if (!b || $(".heute-hero", b)) return;
    if (!$('[data-karte="hoeck"]', b)) {
      const kann = isLaLei() && !isReadOnly() && !isClosed() && !state.asTeam; const nach = $('[data-karte="fuerdich"]', b);
      const html = `<section class="card st-card nd4-leer" data-karte="hoeck"><div class="card-head"><h2>Nächster Höck</h2></div><div class="card-body"><b>Noch nicht geplant</b>${kann ? '<button class="link" data-new-hoeck>Höck planen</button>' : ""}</div></section>`;
      if (nach) nach.insertAdjacentHTML("afterend", html); else b.insertAdjacentHTML("beforeend", html);
      const p = (() => { try { return JSON.parse(store.get("lalei-start-karten") || "{}"); } catch { return {}; } })();
      const neu = $('[data-karte="hoeck"]', b); if ((p.aus || []).includes("hoeck")) neu.hidden = true; const i = (p.ordnung || []).indexOf("hoeck"); if (i >= 0) neu.style.order = String(10 + i);
    }
    b.querySelectorAll(".st-links button[data-goto]").forEach((x) => { if ($(".nd4-ico", x)) return; const nb = $(`#tabs button[data-view="${x.dataset.goto}"]:not(.fav-btn)`); const s = nb && nb.querySelector("svg"); x.insertAdjacentHTML("afterbegin", `<span class="nd4-ico">${s ? s.outerHTML : ""}</span>`); });
  };

  // ---------- Aufgaben: Karten in Spalten nach Dringlichkeit ----------
  try { if (nd4an()) state.taskView = localStorage.getItem("nd4-tview") || "spalten"; } catch {}
  document.addEventListener("click", (e) => { const t = e.target.closest && e.target.closest("[data-tview]"); if (t && nd4an()) { try { localStorage.setItem("nd4-tview", t.dataset.tview); } catch {} } }, true);
  const tasksShellN4 = views.tasks.shell;
  views.tasks.shell = () => { const h = tasksShellN4(); return nd4an() ? h.replace('<button type="button" data-tview="liste"', `<button type="button" data-tview="spalten" aria-pressed="${state.taskView === "spalten"}">Karten</button><button type="button" data-tview="liste"`) : h; };
  function nd4Karte(t) {
    const late = isLate(t), done = t.status === "Erledigt";
    return `<div class="nd4-karte ${late ? "late" : ""} ${done ? "done" : ""} ${state.sel && state.sel.has(t._id) ? "sel" : ""}" data-nd4-karte="${esc(t._id)}">
      <div class="nd4-k1"><button class="qdone ${done ? "on" : ""}" data-qdone="${esc(t._id)}" aria-label="${done ? "Wieder öffnen" : "Als erledigt abhaken"}" title="${done ? "Wieder öffnen" : "Abhaken"}">${done ? "✓" : ""}</button><button class="nd4-kt" data-open="${esc(t._id)}">${t.star ? '<span class="star on" aria-label="wichtig">★</span> ' : ""}${isNew(t) ? '<span class="new-dot" title="Neu oder geändert seit deinem letzten Besuch"></span>' : ""}${esc(t.title)}</button></div>
      <div class="nd4-k2">${t.owner ? av(t.owner) : '<span class="nd4-niemand" title="Niemand verantwortlich">?</span>'}<span>${ressDot(t.ressort)}${esc(t.ressort)}${t.teil ? " › " + esc(t.teil) : ""}</span>${t.deadline ? `<span class="dt ${late ? "late" : ""}">${fmt(t.deadline).replace(/^\w+, /, "")}</span>` : ""}</div></div>`;
  }
  function nd4Spalten(list) {
    const t0 = iso(today()), lim = addDays(t0, 14);
    const nach = (a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || (a.deadline || "9999").localeCompare(b.deadline || "9999");
    const S = [
      ["late", "Überfällig", (t) => isLate(t)],
      ["bald", "Nächste 2 Wochen", (t) => t.status !== "Erledigt" && !isLate(t) && t.deadline && t.deadline <= lim],
      ["spaeter", "Später", (t) => t.status !== "Erledigt" && !isLate(t) && !(t.deadline && t.deadline <= lim)],
      ["ok", "Erledigt", (t) => t.status === "Erledigt"],
    ].map(([k, l, f]) => [k, l, list.filter(f).sort(nach)]).filter(([k, , l]) => k !== "ok" || l.length);
    if (!list.length) return `<div class="empty"><b>Keine Aufgaben</b>Für diese Auswahl gibt es keine Aufgaben.</div>`;
    const MAX = 30;
    return `<div class="nd4-brett" style="--sp:${S.length}">${S.map(([k, l, items]) => { const alle = ND4.mehr[k]; const zeig = alle ? items : items.slice(0, MAX);
      return `<div class="nd4-sp ${k}"><h3>${l} <i>${items.length}</i></h3>${zeig.map(nd4Karte).join("") || '<div class="nd4-nichts">Nichts</div>'}${items.length > zeig.length ? `<button class="nd4-weitere" data-nd4-mehr="${k}">${items.length - zeig.length} weitere</button>` : ""}</div>`; }).join("")}</div>`;
  }
  // Ein Knopf statt Filterliste und Ansicht-Knöpfen: «Offen · 206 ▾» öffnet Auswahl, Darstellung und gespeicherte Ansichten
  function nd4Filter() {
    const tools = $("#view .task-tools"); if (!tools || state.view !== "tasks") return;
    let a = $("#nd4-filter");
    if (!a) {
      a = document.createElement("div"); a.id = "nd4-filter"; a.className = "nd4-filter";
      a.innerHTML = `<button type="button" class="nd4-fknopf" aria-expanded="false" aria-haspopup="true"></button><div class="nd4-panel"><div class="nd4-rl">Anzeigen</div><div class="nd4-tabs"></div><div class="nd4-rl">Darstellung</div><div class="nd4-dar seg"></div><div class="nd4-ans"></div></div>`;
      tools.prepend(a);
    }
    const tabs = $("#tabs-tasks"); if (tabs && tabs.parentElement !== $(".nd4-tabs", a)) $(".nd4-tabs", a).append(tabs);
    const seg = $(".view-seg", tools); if (seg && !a.contains(seg)) { $(".nd4-dar", a).innerHTML = ""; $(".nd4-dar", a).append(...seg.children); seg.remove(); }
    // gespeicherte Ansichten direkt als Knöpfe (ohne zweites Aufklappen)
    const ans = [...tools.querySelectorAll(":scope > details.more")].find((d) => /Ansichten/.test((d.querySelector("summary") || {}).textContent || ""));
    if (ans) { const box = $(".nd4-ans", a); box.innerHTML = '<div class="nd4-rl">Ansichten</div>'; box.append(...ans.querySelectorAll("button")); ans.remove(); }
    const s = tabs && tabs.querySelector('[aria-selected="true"]'); const k = $(".nd4-fknopf", a);
    if (s) { const n = s.querySelector(".n"); k.textContent = nd4Txt(s) + (n ? " · " + n.textContent : ""); }
  }
  document.addEventListener("click", (e) => { const a = $("#nd4-filter.offen"); if (a && e.target.closest && !e.target.closest("#nd4-filter")) a.classList.remove("offen"); });
  const tasksUpdN4 = views.tasks.update;
  views.tasks.update = function () {
    tasksUpdN4(); if (!nd4an()) return;
    const box = $("#task-list"); if (box && state.taskView === "spalten" && !state.selMode) box.innerHTML = nd4Spalten(gefilterteAufgaben());
    nd4Filter();
  };
  document.addEventListener("click", (e) => {
    if (!nd4an() || !e.target.closest) return;
    const m = e.target.closest("[data-nd4-mehr]"); if (m) { ND4.mehr[m.dataset.nd4Mehr] = true; return views.tasks.update(); }
    const r = e.target.closest("[data-nd4-ress]");
    if (r) { const n = r.dataset.nd4Ress; state.filter.ressort = (state.filter.ressort || "").split("|")[0] === n ? "" : n; const s = $("#f-ress"); if (s) s.value = state.filter.ressort; $("#nd4-filter") && $("#nd4-filter").classList.remove("offen"); return views.tasks.update(); }
    const k = e.target.closest(".nd4-fknopf"); if (k) { const a = k.parentElement; a.classList.toggle("offen"); k.setAttribute("aria-expanded", String(a.classList.contains("offen"))); return; }
    if (e.target.closest("#nd4-filter [data-ptab], #nd4-filter [data-tview], #nd4-filter [data-view-save], #nd4-filter [data-view-load], #nd4-filter [data-view-manage]")) { const a = $("#nd4-filter"); if (a) a.classList.remove("offen"); }
    // ganze Karte anklickbar (ausser Abhaken)
    const c = e.target.closest("[data-nd4-karte]"); if (c && !e.target.closest("button")) { const t = $(".nd4-kt", c); if (t) t.click(); }
  });
