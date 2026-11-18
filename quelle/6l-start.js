  // =====================================================================
  // Startseite der Lagerleitung: das Wichtigste für mich auf einen Blick.
  // Dazu: Tastatur am Handy (Leisten ausblenden, Fenster über der Tastatur)
  // =====================================================================
  HELP.start = "Deine Startseite: was für dich ansteht, der nächste Höck, Neues und schnelle Aktionen. Der Pfeil oben führt von überall hierher zurück.";
  views.start = {
    shell: () => `${pageHead(`Hallo ${esc(me() || "")}`, esc(lagerDoc().title || ""))}<div id="start-body" class="start-home"></div>`,
    update() {
      const n = me(); const t0 = iso(today()); const kann = !isReadOnly() && !isClosed() && !state.asTeam;
      const camp = isCampNow(); const r = campRange(); const d = cfg().dates || {}; const ziel = d.prep || d.start;
      const bis = ziel && ziel > t0 ? daysBetween(today(), parse(ziel)) : null;
      const zeit = camp ? `<b>Tag ${daysBetween(parse(r.from), today()) + 1} von ${daysBetween(parse(r.from), parse(r.to)) + 1}</b><span>im Lager</span>` : bis != null ? `<b>${bis} ${bis === 1 ? "Tag" : "Tage"}</b><span>bis zur Leitervorbereitung</span>` : `<b>${esc(lagerDoc().title || "")}</b><span>${r.to && r.to < t0 ? "Lager vorbei" : ""}</span>`;
      const meine = allTasks().filter((t) => t.status !== "Erledigt" && (t.owner === n || t.support === n));
      const ueber = meine.filter(isLate); const woche = meine.filter((t) => !isLate(t) && t.deadline && t.deadline <= addDays(t0, 7));
      const fokus = [...ueber, ...woche].slice(0, 6);
      const hk = state.hoecks.filter((h) => h.date >= t0).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))[0];
      const neu = bellItems().filter((x) => x.unread && !x.due).slice(0, 4);
      const alle = allTasks(); const erl = alle.filter((t) => t.status === "Erledigt").length; const spaet = alle.filter(isLate).length;
      const plan = planDoc(); const heute = days().find((x) => x.date === t0);
      const dienste = heute ? plan.services.filter((s) => ((plan.cells || {})[heute.id + "|" + s.id] || []).includes(n)).map((s) => s.name) : [];
      const zl = typeof zuletztOk === "function" ? zuletztOk().slice(0, 5) : [];
      const zeile = (t) => `<button class="st-row ${isLate(t) ? "late" : ""}" data-open="${esc(t._id)}"><span class="st-dot" data-s="${esc(t.status)}"></span><span class="st-t">${esc(t.title)}<small>${esc(t.ressort)}${t.deadline ? " · " + (isLate(t) ? "überfällig, " : "") + relDay(t.deadline) : ""}</small></span><span class="st-go" aria-hidden="true">›</span></button>`;
      $("#start-body").innerHTML = `
        <section class="st-hero">${titelBild()}<div class="st-zeit">${zeit}</div>
          <div class="st-stand"><button data-goto="overview"><b>${pct(erl, alle.length)}%</b><span>erledigt</span></button><button data-go-tab="tasks|late" class="${spaet ? "warn" : ""}"><b>${spaet}</b><span>überfällig</span></button><button data-go-tab="mine|tasks"><b>${meine.length}</b><span>meine offen</span></button></div></section>
        ${kann ? `<div class="st-akt"><button data-st="task"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Aufgabe</button><button data-st="note"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>Notiz</button><button data-st="meeting"><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/></svg>Protokoll</button><button data-st="board"><svg viewBox="0 0 24 24"><path d="M4 4h16v12H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>Mitteilung</button></div>` : ""}
        ${camp && heute ? `<section class="card st-card"><div class="card-head"><h2>Heute im Lager</h2><button class="link" data-st-day="${esc(heute.id)}">Tagesseite</button></div><div class="card-body">${dienste.length ? `Dein Dienst: <b>${esc(dienste.join(", "))}</b>` : '<span class="muted">Heute hast du keinen Dienst.</span>'}</div></section>` : ""}
        <section class="card st-card"><div class="card-head"><h2>Für dich</h2><button class="link" data-goto="mine">Alle meine Aufgaben</button></div>
          ${fokus.length ? `<div class="st-list">${fokus.map(zeile).join("")}</div>` : `<div class="card-body muted">Nichts überfällig und diese Woche nichts fällig. 👍</div>`}</section>
        ${hk ? `<section class="card st-card"><div class="card-head"><h2>Nächster Höck</h2><span class="muted">${relDay(hk.date)}</span></div><div class="card-body st-hk"><b>${esc(hk.title || HK[hk.kind || "LaLei"].label)}</b><span>${fmt(hk.date)}${hk.time ? ", " + esc(hk.time) : ""}${hk.place ? " · " + esc(hk.place) : ""}</span>
          <div class="st-hk-b"><button class="btn small" data-open-hoeck="${esc(hk._id)}">Ansehen</button>${isLaLei() && kann ? `<button class="btn small" data-agenda>Traktandenliste</button>` : ""}</div></div></section>` : ""}
        ${neu.length ? `<section class="card st-card"><div class="card-head"><h2>Neu für dich</h2><button class="link" data-st-bell>Alle</button></div><div class="st-list">${neu.map((x) => `<button class="st-row" ${x.attr}><span class="st-ico">${x.ico}</span><span class="st-t">${x.text}</span><span class="st-go" aria-hidden="true">›</span></button>`).join("")}</div></section>` : ""}
        ${zl.length ? `<section class="card st-card"><div class="card-head"><h2>Zuletzt angesehen</h2></div><div class="card-body recent">${zl.map((x) => `<button class="pchip-s" ${zuletztAttr(x)}>${x.k === "t" ? "☑" : x.k === "h" ? "👥" : "📝"} ${esc(x.titel)}</button>`).join("")}</div></section>` : ""}
        <section class="st-links">${[["overview", "Übersicht"], ["woche", "Meine Woche"], ["timeline", "Zeitplan"], ["board", "Pinnwand"], ["infos", "Infos & Links"], ["docs", "Dokumente"]].map(([v, l]) => `<button data-goto="${v}">${l}<span aria-hidden="true">›</span></button>`).join("")}</section>`;
    },
  };
  view.addEventListener("click", (e) => {
    const a = e.target.closest("[data-st]"); if (a) { const k = a.dataset.st; if (k === "task") return openTask("_new"); if (k === "board") return openBoardEditor(); return openEntry(k); }
    if (e.target.closest("[data-st-bell]")) return bellOpen();
    const dd = e.target.closest("[data-st-day]"); if (dd) { state.dayId = dd.dataset.stDay; return setView("day"); }
  });
  // Navigation: «Start» zuoberst bei der Lagerleitung
  (() => { const ov = $('#tabs button[data-view="overview"]'); if (ov) ov.insertAdjacentHTML("beforebegin", `<button role="tab" data-view="start" data-roles="lalei"><svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>Start</button>`); })();
  // Am Handy startet die Lagerleitung auf der Startseite
  const openLagerOrig6 = openLager;
  openLager = async function (id) { const r = await openLagerOrig6(id); if (state.lagerId === id && istHandy() && isLaLei() && state.view === "overview") setView("start"); return r; };

  // ---------- Tastatur am Handy ----------
  const tippFeld = (el) => el && (el.tagName === "TEXTAREA" || el.isContentEditable || (el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "file", "range", "color"].includes(el.type)) || el.tagName === "SELECT");
  document.addEventListener("focusin", (e) => { if (istHandy() && tippFeld(e.target)) document.body.classList.add("tippt"); });
  document.addEventListener("focusout", () => setTimeout(() => { if (!tippFeld(document.activeElement)) document.body.classList.remove("tippt"); }, 120));
  if (window.visualViewport) {
    const vv = window.visualViewport;
    // iPhone: Die Tastatur verkleinert nur den sichtbaren Bereich und schiebt die Seite hoch.
    // Fenster werden deshalb genau auf den sichtbaren Bereich gelegt (oben = sichtbarer oberer Rand).
    let warOffen = false;
    const passe = () => {
      const offen = istHandy() && window.innerHeight - vv.height > 120; const r = document.documentElement.style;
      r.setProperty("--vvh", Math.round(vv.height) + "px"); r.setProperty("--vvt", Math.round(vv.offsetTop) + "px"); r.setProperty("--kb", Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) + "px");
      document.body.classList.toggle("kb-offen", offen);
      if (offen && !warOffen) { const a = document.activeElement; if (a && tippFeld(a) && a.closest(".overlay, .hoeck-mode, .cmdk")) setTimeout(() => a.scrollIntoView({ block: "nearest" }), 80); }
      warOffen = offen;
    };
    vv.addEventListener("resize", passe); vv.addEventListener("scroll", passe); passe();  }
