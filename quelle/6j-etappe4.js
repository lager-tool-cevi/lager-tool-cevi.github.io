  // =====================================================================
  // Etappe 4: Navigation (Zurück, Verlauf, zuletzt angesehen, Befehle Ctrl+K, Tastenkürzel), Meine Woche,
  // Dokumente, Wissen früherer Lager, Übungslager, Bedienung (Ziehen, Wischen, Schnelldaten, Personensuche,
  // direkt umbenennen, Aktionen beim Darüberfahren, ungespeicherte Änderungen), Aussehen (Farbe, Titelbild, kompakt)
  // =====================================================================
  NEUES.unshift({ id: "2026-11-etappe4", titel: "Neu: schneller und übersichtlicher", punkte: [
    "<b>Meine Woche</b> zeigt deine Aufgaben, Höcks und Dienste dieser Woche. <b>Dokumente</b> sammelt alle Links und Dateien an einem Ort.",
    "<b>Ctrl+K</b> öffnet die Befehlssuche: Seiten, Aktionen, Aufgaben und zuletzt Angesehenes. <b>?</b> zeigt alle Tastenkürzel.",
    "Der Zurück-Knopf des Browsers funktioniert jetzt, dazu «← Zurück» oben auf der Seite.",
    "Deadlines in Worten («in 3 Tagen»), schnelle Daten wie «Morgen» oder «+1 Woche», Personensuche in langen Listen.",
    "Jedes Lager kann eine eigene <b>Farbe</b> und ein <b>Titelbild</b> haben. Unter Einstellungen gibt es die <b>kompakte Ansicht</b>.",
    "Am Handy: Fenster als Blatt von unten, Aufgaben wischen (→ erledigt, ← öffnen) und zum Aktualisieren nach unten ziehen.",
  ] });

  // ---------- kleine Helfer ----------
  function relDay(isoStr) {
    const d = daysBetween(today(), parse(isoStr)); if (isNaN(d)) return "";
    if (d === 0) return "heute"; if (d === 1) return "morgen"; if (d === -1) return "gestern"; if (d === 2) return "übermorgen";
    if (d > 0) return d < 14 ? `in ${d} Tagen` : d < 60 ? `in ${Math.round(d / 7)} Wochen` : `in ${Math.round(d / 30)} Monaten`;
    return -d < 14 ? `vor ${-d} Tagen` : `vor ${Math.round(-d / 7)} Wochen`;
  }
  function fileType(l) {
    const u = String((l && (l.url || "")) || "").toLowerCase(), t = String((l && (l.title || l.name)) || "").toLowerCase(); const s = t + " " + u;
    if (l && l.image || /\.(png|jpe?g|gif|webp|heic)(\?|$|\s)/.test(s)) return "bild";
    if (/\.pdf(\?|$|\s)/.test(s)) return "pdf"; if (/\.docx?(\?|$|\s)|\/:w:\/|document\/d\//.test(s)) return "word";
    if (/\.xlsx?(\?|$|\s)|\.csv|\/:x:\/|spreadsheets\/d\//.test(s)) return "excel"; if (/\.pptx?(\?|$|\s)|\/:p:\/|presentation\/d\//.test(s)) return "ppt";
    if (/sharepoint\.com|onedrive|1drv\.ms/.test(u)) return "sharepoint"; if (/drive\.google|docs\.google/.test(u)) return "drive";
    return "link";
  }
  const FT = { bild: ["Bild", "🖼"], pdf: ["PDF", "PDF"], word: ["Word", "W"], excel: ["Excel", "X"], ppt: ["PowerPoint", "P"], sharepoint: ["SharePoint", "SP"], drive: ["Google Drive", "G"], link: ["Link", ""] };
  function linkIco(l) { const t = fileType(l); return t === "link" ? LINK_ICO : `<span class="ftype ft-${t}" title="${FT[t][0]}" aria-hidden="true">${FT[t][1]}</span>`; }
  function skeletonHtml() { return `<div class="skel" aria-busy="true" aria-label="Wird geladen"><div class="sk sk-h"></div><div class="sk sk-s"></div><div class="sk-grid"><div class="sk sk-c"></div><div class="sk sk-c"></div><div class="sk sk-c"></div></div><div class="sk sk-b"></div><div class="sk sk-b"></div></div>`; }
  // Wissen aus dem Vorlager (beim Erstellen eines neuen Lagers aus einer Vorlage)
  function wissenAus(src, sc, titel) {
    const out = [];
    for (const e of Object.values(src.journal || {})) {
      const ty = e.type || "note";
      if (ty === "meeting") for (const it of e.items || []) if ((it.decision || "").trim()) out.push({ art: "Entscheid", titel: it.title || e.title || "", text: String(it.decision).slice(0, 300), datum: e.date || "" });
      if (ty === "note" && (e.title || e.text)) out.push({ art: "Notiz", titel: e.title || "", text: String(e.text || "").slice(0, 300), datum: e.date || "" });
    }
    for (const [k, v] of Object.entries(sc.prevTips || {})) if (String(v || "").trim()) out.push({ art: "Tipp", titel: k, text: String(v).slice(0, 400), datum: "" });
    out.sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
    return { lager: [{ titel, eintraege: out.slice(0, 100) }, ...(((sc.prevWissen || {}).lager) || [])].slice(0, 3) };
  }

  // ---------- Navigation: Verlauf, Zurück, zuletzt angesehen ----------
  let popping = false, navDepth = 0;
  const setViewOrig4 = setView;
  setView = function (v) {
    const before = state.view; const neu = !popping && v !== before; if (neu) navDepth++;
    setViewOrig4(v);
    if (neu) { if (state.view === before) navDepth--; else try { history.pushState({ lv: state.view }, "", "#" + state.view); } catch {} }
  };
  window.addEventListener("popstate", (e) => {
    if ($(".cmdk")) { $(".cmdk").remove(); return; }
    if ($(".overlay") || $(".hoeck-mode")) { if ($(".hoeck-mode")) $("[data-hm-close]") && $("[data-hm-close]").click(); else closeDrawer(); try { history.pushState({ lv: state.view }, "", "#" + state.view); } catch {} return; }
    const v = e.state && e.state.lv; if (!v || !state.lagerId) return;
    popping = true; navDepth = Math.max(0, navDepth - 1); try { setView(v); } finally { popping = false; }
  });
  const lastKey = () => `lalei-zuletzt-${state.lagerId}-${myId()}`;
  const zuletzt = () => { try { return JSON.parse(store.get(lastKey()) || "[]"); } catch { return []; } };
  function merke(k, id, titel) { if (!isLaLei() || !id || id === "_new") return; const l = zuletzt().filter((x) => !(x.k === k && x.id === id)); l.unshift({ k, id, titel: String(titel || "").slice(0, 80), at: Date.now() }); store.set(lastKey(), JSON.stringify(l.slice(0, 10))); }
  const zuletztOk = () => zuletzt().filter((x) => (x.k === "t" ? state.tasks.has(x.id) : x.k === "h" ? state.hoecks.some((h) => h._id === x.id) : state.journal.some((j) => j._id === x.id)));
  const zuletztAttr = (x) => (x.k === "t" ? `data-open="${esc(x.id)}"` : x.k === "h" ? `data-open-hoeck="${esc(x.id)}"` : `data-open-entry="${esc(x.id)}"`);
  const openTaskOrig4 = openTask;
  openTask = function (id, prefill) { openTaskOrig4(id, prefill); const t = state.tasks.get(id); if (t) merke("t", id, t.title); };
  const openEntryOrig4 = openEntry;
  openEntry = function (type, id, prefill) { openEntryOrig4(type, id, prefill); if (id && ed && ed.id === id) merke(ed.type === "hoeck" ? "h" : "e", id, ed.draft.title || ed.draft.topic || ED_LABEL(ed.type)); };

  const renderOrig4 = render;
  render = function () {
    renderOrig4(); const v = $("#view"); if (!v) return;
    v.classList.remove("view-enter"); void v.offsetWidth; v.classList.add("view-enter");
    const ph = $(".page-head", v); if (ph && navDepth > 0 && !$("[data-nav-back]", v)) ph.insertAdjacentHTML("beforebegin", `<button class="link back-link" data-nav-back>← Zurück</button>`);
    if (state.lagerId && lagerDoc().uebung && !$(".uebung-bar", v)) v.insertAdjacentHTML("afterbegin", `<div class="uebung-bar">🧪 <b>Übungslager</b> · Hier darfst du alles ausprobieren. Änderungen betreffen kein echtes Lager.</div>`);
  };
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("[data-nav-back]")) history.back(); });
  const openLagerOrig4 = openLager;
  openLager = async function (id) { const r = await openLagerOrig4(id); navDepth = 0; try { history.replaceState({ lv: state.view }, "", "#" + (state.view || "")); } catch {} lagerFarbe(); return r; };

  // ---------- Befehlssuche (Ctrl+K) ----------
  function befehle(q) {
    q = q.trim().toLowerCase(); const out = []; const hit = (s) => !q || String(s).toLowerCase().includes(q);
    const kann = isLaLei() && !isReadOnly() && !isClosed() && !state.asTeam;
    if (!q && isLaLei()) for (const x of zuletztOk().slice(0, 5)) out.push({ g: "Zuletzt angesehen", l: x.titel, attr: zuletztAttr(x) });
    if (kann) for (const [l, act] of [["Neue Aufgabe", "task"], ["Höck planen", "hoeck"], ["Protokoll erfassen", "meeting"], ["Notiz erfassen", "note"], ["Mitteilung an das Team", "board"]]) if (hit(l)) out.push({ g: "Aktionen", l, attr: `data-cmd="${act}"` });
    for (const b of document.querySelectorAll("#tabs button[data-view]")) if (!b.hidden && hit(b.textContent)) out.push({ g: "Seiten", l: b.textContent.trim(), attr: `data-cmd-view="${b.dataset.view}"` });
    for (const [l, act] of [["Drucken", "print"], ["Feedback zum Tool", "fb"], ["Tastenkürzel", "keys"], ["Notfall", "sos"]]) if (hit(l)) out.push({ g: "Weiteres", l, attr: `data-cmd="${act}"` });
    if (q.length >= 2 && isLaLei()) {
      for (const t of allTasks()) if (t.title.toLowerCase().includes(q)) { out.push({ g: "Aufgaben", l: t.title, s: `${t.ressort}${t.deadline ? " · " + fmt(t.deadline) : ""}`, attr: `data-open="${esc(t._id)}"` }); if (out.filter((x) => x.g === "Aufgaben").length >= 8) break; }
      for (const e of state.journal) if (`${e.title || ""} ${e.topic || ""}`.toLowerCase().includes(q)) { out.push({ g: "Protokoll", l: e.title || e.topic, s: fmtFull(entryDate(e)), attr: `data-open-entry="${esc(e._id)}"` }); if (out.filter((x) => x.g === "Protokoll").length >= 6) break; }
    }
    if (q.length >= 2) for (const p of people()) if (p.toLowerCase().includes(q)) out.push({ g: "Personen", l: p, s: "Aufgaben dieser Person", attr: `data-cmd-person="${esc(p)}"` });
    return out.slice(0, 40);
  }
  function cmdk() {
    if (!state.lagerId || $(".cmdk")) return;
    const box = document.createElement("div"); box.className = "cmdk"; box.innerHTML = `<div class="cmdk-in" role="dialog" aria-modal="true" aria-label="Befehle"><input class="cmdk-q" placeholder="Seite, Aktion oder Aufgabe suchen …" aria-label="Suchen" autocomplete="off"><div class="cmdk-list" role="listbox"></div><div class="cmdk-foot"><span>↑↓ wählen · Enter öffnen · Esc schliessen</span></div></div>`;
    document.body.appendChild(box); const inp = $(".cmdk-q", box), list = $(".cmdk-list", box); let idx = 0, items = [];
    const draw = () => { items = befehle(inp.value); idx = Math.min(idx, Math.max(0, items.length - 1)); let g = "";
      list.innerHTML = items.length ? items.map((x, i) => { const h = x.g !== g ? `<div class="cmdk-g">${esc(x.g)}</div>` : ""; g = x.g; return `${h}<button type="button" class="cmdk-row ${i === idx ? "on" : ""}" role="option" aria-selected="${i === idx}" data-i="${i}" ${x.attr}><span>${esc(x.l)}</span>${x.s ? `<span class="muted">${esc(x.s)}</span>` : ""}</button>`; }).join("") : '<div class="cmdk-empty">Nichts gefunden.</div>';
      const on = $(".cmdk-row.on", list); if (on) on.scrollIntoView({ block: "nearest" }); };
    const zu = () => box.remove();
    const los = (row) => {
      if (!row) return; zu(); const d = row.dataset;
      if (d.cmdView) return setView(d.cmdView);
      if (d.open) return openTask(d.open); if (d.openEntry) return openEntry(null, d.openEntry); if (d.openHoeck) return openEntry("hoeck", d.openHoeck);
      if (d.cmdPerson) { state.filter = { ...state.filter, person: d.cmdPerson, q: "", ressort: "", status: "", tag: "" }; state.tabs.tasks = "open"; return setView("tasks"); }
      const c = d.cmd; if (c === "task") return openTask("_new"); if (["hoeck", "meeting", "note"].includes(c)) return openEntry(c); if (c === "board") return openBoardEditor();
      if (c === "print") return setTimeout(() => window.print(), 100); if (c === "fb") return toolFeedbackOpen(); if (c === "keys") return tastenHilfe(); if (c === "sos") return showSos();
    };
    inp.oninput = () => { idx = 0; draw(); };
    box.onkeydown = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); return zu(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length); draw(); }
      if (e.key === "Enter") { e.preventDefault(); los($(`.cmdk-row[data-i="${idx}"]`, list)); }
    };
    box.onclick = (e) => { if (e.target === box) return zu(); los(e.target.closest(".cmdk-row")); };
    draw(); inp.focus();
  }
  function tastenHilfe() {
    const k = (a, b) => `<div class="key-row"><span>${a.split(" ").map((x) => `<kbd>${esc(x)}</kbd>`).join(" ")}</span><span>${b}</span></div>`;
    const o = modal(`<div class="lg-head"><span class="eyebrow">Tastenkürzel</span><h2>Schneller arbeiten</h2></div><div class="keys">
      ${k("Ctrl K", "Befehlssuche: Seiten, Aktionen, Aufgaben")}${k("/", "Befehlssuche")}${isLaLei() ? k("N", "Neue Aufgabe") : ""}${k("G U", "Übersicht bzw. Mein Bereich")}${isLaLei() ? k("G A", "Aufgaben") + k("G M", "Meine Aufgaben") + k("G P", "Protokoll") + k("G Z", "Zeitplan") + k("G T", "Tagesseiten") : ""}${k("G W", "Meine Woche")}${k("G D", "Dokumente")}${k("G I", "Infos")}
      ${k("Ctrl S", "Protokoll speichern, Fenster bleibt offen")}${k("Ctrl Enter", "Speichern und schliessen")}${k("Esc", "Fenster schliessen")}${k("?", "Diese Übersicht")}</div><div class="lg-foot"><span></span><button class="btn" data-k-close>Schliessen</button></div>`);
    o.onclick = (e) => { if (e.target === o || e.target.closest("[data-k-close]")) closeDrawer(); };
  }
  const tippt = (el) => el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable);
  let gPending = 0;
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && state.lagerId) { e.preventDefault(); e.stopImmediatePropagation(); return cmdk(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { const o = $(".overlay"); if (!o) return; const b = $("#e-save, #d-save, .lg-foot .btn.primary", o); if (b && !b.disabled) { e.preventDefault(); b.click(); } return; }
    if (e.ctrlKey || e.metaKey || e.altKey || tippt(document.activeElement) || $(".overlay") || $(".cmdk") || $(".hoeck-mode") || !state.lagerId) return;
    const key = e.key.toLowerCase();
    if (gPending && Date.now() - gPending < 1200) { gPending = 0; const ziel = { u: isLaLei() ? "overview" : "home", a: "tasks", m: "mine", p: "journal", z: "timeline", t: "days", w: "woche", d: "docs", i: "infos" }[key]; if (ziel && viewAllowed(ziel)) { e.preventDefault(); setView(ziel); } return; }
    if (key === "g") { gPending = Date.now(); return; }
    if (e.key === "/") { e.preventDefault(); return cmdk(); }
    if (e.key === "?") { e.preventDefault(); return tastenHilfe(); }
    if (key === "n" && isLaLei() && !isReadOnly() && !isClosed() && !state.asTeam) { e.preventDefault(); return openTask("_new"); }
  }, true);

  // ---------- Ungespeicherte Änderungen: vor dem Schliessen fragen ----------
  const ungespeichert = () => (openTaskId && drawerDirty) || (ed && ed.touched && typeof hatAenderungen === "function" && hatAenderungen() && !$(".hoeck-mode"));
  const fragen = () => !ungespeichert() || confirm("Ungespeicherte Änderungen verwerfen?");
  document.addEventListener("click", (e) => {
    const t = e.target; if (!t.closest) return;
    const schliessen = t.closest("#d-close, #d-cancel, #e-close, #e-cancel") || (t.classList && t.classList.contains("overlay") && !t.classList.contains("center"));
    if (schliessen && !fragen()) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $(".overlay") && !$(".cmdk") && !mbox.box && !fragen()) { e.stopImmediatePropagation(); } }, true);
  window.addEventListener("beforeunload", (e) => { if (ungespeichert()) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- Meine Woche ----------
  state.wocheOff = 0;
  views.woche = {
    shell: () => `${pageHead("Meine Woche", "Was diese Woche für dich ansteht")}<div class="woche-nav"><button class="btn small" data-wo="-1" aria-label="Vorherige Woche">‹</button><b id="wo-label"></b><button class="btn small" data-wo="1" aria-label="Nächste Woche">›</button><button class="link" data-wo="0">Diese Woche</button></div><div id="woche-body" class="woche"></div>`,
    update() {
      const n = me(); const mo = new Date(monday(today()).getTime() + state.wocheOff * 7 * DAY); const t0 = iso(today());
      const tage = Array.from({ length: 7 }, (_, i) => iso(new Date(mo.getTime() + i * DAY)));
      $("#wo-label").textContent = `${fmtFull(tage[0]).slice(0, 6)} – ${fmtFull(tage[6])}`;
      const plan = planDoc(); const lt = days();
      const html = tage.map((d) => {
        const items = [];
        const ld = lt.find((x) => x.date === d); if (ld) { items.push(`<div class="wo-it camp">⛺ ${esc(ld.label)}</div>`); for (const s of plan.services) if (((plan.cells || {})[ld.id + "|" + s.id] || []).includes(n)) items.push(`<div class="wo-it svc">🧹 Dienst: <b>${esc(s.name)}</b></div>`); }
        for (const h of state.hoecks) if (h.date === d && (isLaLei() || (h.kind || "LaLei") === "Team")) items.push(`<button class="wo-it hoeck" ${isLaLei() ? `data-open-hoeck="${esc(h._id)}"` : ""}>👥 ${esc(h.title || HK[h.kind || "LaLei"].label)}${h.time ? " · " + esc(h.time) : ""}${h.place ? " · " + esc(h.place) : ""}</button>`);
        if (isLaLei()) {
          for (const m of milestones()) if (m.date === d) items.push(`<div class="wo-it ms">◆ Meilenstein: <b>${esc(m.name)}</b></div>`);
          for (const t of allTasks()) if (t.deadline === d && t.status !== "Erledigt" && (t.owner === n || t.support === n)) items.push(`<button class="wo-it task ${isLate(t) ? "late" : ""}" data-open="${esc(t._id)}">☑ ${esc(t.title)} <span class="muted">${esc(t.ressort)}</span></button>`);
        }
        for (const b of state.board || []) if (b.from === d && boardFor(b)) items.push(`<div class="wo-it">📌 ${esc(b.title || "")}</div>`);
        return `<section class="wo-day ${d === t0 ? "today" : ""} ${d < t0 ? "past" : ""}"><div class="wo-h"><b>${WD[parse(d).getDay()]}</b><span>${parse(d).getDate()}. ${MONTHS[parse(d).getMonth()]}</span>${d === t0 ? '<span class="tag next">heute</span>' : ""}</div><div class="wo-list">${items.join("") || '<span class="muted wo-free">nichts</span>'}</div></section>`;
      }).join("");
      const ueber = isLaLei() && state.wocheOff === 0 ? allTasks().filter((t) => isLate(t) && (t.owner === n || t.support === n)) : [];
      $("#woche-body").innerHTML = (ueber.length ? `<div class="conflict-note">Noch offen aus früheren Wochen: ${ueber.slice(0, 6).map((t) => `<button class="link" data-open="${esc(t._id)}">${esc(t.title)}</button>`).join(", ")}${ueber.length > 6 ? ` und ${ueber.length - 6} weitere` : ""}</div>` : "") + html;
    },
  };
  view.addEventListener("click", (e) => { const b = e.target.closest("[data-wo]"); if (!b) return; state.wocheOff = b.dataset.wo === "0" ? 0 : state.wocheOff + +b.dataset.wo; views.woche.update(); });

  // ---------- Dokumente (alle Links und Dateien) und Wissen früherer Lager ----------
  TABS.docs = [["alle", "Alle Dokumente"], ["wissen", "Wissen früherer Lager"]];
  state.docQ = ""; state.docT = "";
  function alleDokumente() {
    const out = []; const add = (l, wo, attr = "") => { if (l && l.url) out.push({ l, title: l.title || l.name || l.url, wo, attr, typ: fileType(l) }); };
    for (const s of (state.info || {}).sections || []) if (isLaLei() || !s.lalei) { (s.links || []).forEach((l) => add(l, "Infos › " + (s.title || ""), 'data-goto="infos"')); (s.images || []).forEach((f) => add({ title: f.name, url: f.url, image: true }, "Infos › " + (s.title || ""), 'data-goto="infos"')); }
    for (const r of ressorts()) (r.links || []).forEach((l) => add(l, "Ressort " + r.name, isLaLei() ? `data-ress-page="${esc(r.id)}"` : ""));
    for (const b of (state.board || []).filter((x) => boardActive(x) && boardFor(x))) (b.files || []).forEach((f) => add({ title: f.name, url: f.url, image: f.image }, "Pinnwand › " + (b.title || "")));
    if (isLaLei()) {
      for (const t of state.tasks.values()) (t.links || []).forEach((l) => add(l, "Aufgabe › " + t.title, `data-open="${esc(t._id)}"`));
      for (const e of state.journal) { (e.links || []).forEach((l) => add(l, (e.title || "Notiz"), `data-open-entry="${esc(e._id)}"`)); (e.items || []).forEach((it) => (it.links || []).forEach((l) => add(l, `${e.title || "Protokoll"} › ${it.title || ""}`, `data-open-entry="${esc(e._id)}"`))); }
    }
    return out;
  }
  views.docs = {
    shell: () => `${pageHead("Dokumente", "Alle Links und Dateien aus Infos, Ressorts, Aufgaben, Protokollen und der Pinnwand")}${isLaLei() ? tabBar("docs") : ""}
      <section class="card" ${isLaLei() ? pane("docs", "alle") : ""}><div class="toolbar"><input type="search" id="doc-q" placeholder="Dokumente durchsuchen" value="${esc(state.docQ)}" aria-label="Suchen"><div class="seg doc-types" role="group" aria-label="Art">${[["", "Alle"], ["pdf", "PDF"], ["word", "Word"], ["excel", "Excel"], ["bild", "Bilder"], ["sharepoint", "SharePoint"], ["link", "Links"]].map(([k, l]) => `<button type="button" data-doc-t="${k}" aria-pressed="${state.docT === k}">${l}</button>`).join("")}</div></div><div id="doc-list"></div></section>
      ${isLaLei() ? `<section class="card" ${pane("docs", "wissen")}><div class="card-head"><h2>Wissen früherer Lager</h2><span class="muted">Entscheide, Notizen und Tipps, übernommen beim Erstellen dieses Lagers</span></div><div class="toolbar"><input type="search" id="wis-q" placeholder="z.B. Lagerhaus, Budget, Car" aria-label="Wissen durchsuchen"></div><div id="wis-list"></div></section>` : ""}`,
    update() {
      if (isLaLei()) fillTabs("docs");
      const q = state.docQ.trim().toLowerCase(); const all = alleDokumente();
      const list = all.filter((d) => (!state.docT || d.typ === state.docT || (state.docT === "link" && ["link", "drive"].includes(d.typ))) && (!q || `${d.title} ${d.wo}`.toLowerCase().includes(q)));
      $("#doc-list").innerHTML = list.length ? `<div class="doc-rows">${list.map((d) => `<div class="doc-row">${linkIco(d.l)}<a ${linkAttrs(d.l)} title="${esc(d.l.url)}">${esc(d.title)}</a>${d.attr ? `<button class="link doc-wo" ${d.attr}>${esc(d.wo)}</button>` : `<span class="muted doc-wo">${esc(d.wo)}</span>`}</div>`).join("")}</div>`
        : `<div class="empty"><b>${all.length ? "Nichts gefunden" : "Noch keine Dokumente"}</b>${all.length ? "Andere Suche oder Art wählen." : "Links und Dateien, die ihr bei Infos, Ressorts, Aufgaben, Protokollen oder auf der Pinnwand anhängt, erscheinen hier gesammelt."}</div>`;
      if (!isLaLei()) return;
      const w = ((cfg().prevWissen || {}).lager) || []; const tips = cfg().prevTips || {}; const wq = (($("#wis-q") || {}).value || "").trim().toLowerCase();
      const blocks = w.map((L) => { const e = (L.eintraege || []).filter((x) => !wq || `${x.titel} ${x.text}`.toLowerCase().includes(wq)); return e.length ? `<div class="sec-label">${esc(L.titel || "Früheres Lager")}</div>${e.map((x) => `<div class="mrow wis-row"><div class="entry-top"><span class="tag plain">${esc(x.art)}</span><b>${esc(x.titel)}</b>${x.datum ? `<span class="muted" style="font-size:12px;margin-left:auto">${fmtFull(x.datum)}</span>` : ""}</div><div class="rich">${rich(x.text)}</div></div>`).join("")}` : ""; }).join("");
      const tipBlock = !w.length && Object.keys(tips).length ? `<div class="sec-label">Tipps aus ${esc(cfg().prevTipsFrom || "dem letzten Lager")}</div>${Object.entries(tips).filter(([k, v]) => !wq || `${k} ${v}`.toLowerCase().includes(wq)).map(([k, v]) => `<div class="mrow wis-row"><div class="entry-top"><span class="tag plain">Tipp</span><b>${esc(k)}</b></div><div class="rich">${rich(v)}</div></div>`).join("")}` : "";
      $("#wis-list").innerHTML = blocks || tipBlock || `<div class="empty"><b>Noch kein Wissen</b>Wenn ein Admin ein neues Lager mit einem früheren Lager als Vorlage erstellt, kommen dessen Entscheide, Notizen und Tipps aus der Auswertung hierher. So muss niemand das Rad neu erfinden.</div>`;
    },
  };
  view.addEventListener("input", (e) => { if (e.target.id === "doc-q") { state.docQ = e.target.value; views.docs.update(); } if (e.target.id === "wis-q") views.docs.update(); });
  view.addEventListener("click", (e) => { const b = e.target.closest("[data-doc-t]"); if (!b) return; state.docT = b.dataset.docT; render(); });
  TEAM_VIEWS.push("woche", "docs");
  HELP.woche = "Deine Woche auf einen Blick: Aufgaben mit Deadline, Höcks, Meilensteine und im Lager deine Dienste. Mit ‹ › blätterst du.";
  HELP.docs = "Alle Links und Dateien, die irgendwo im Tool angehängt sind. Klick auf den Ort führt zur Stelle, wo das Dokument hängt.";
  // Navigation ergänzen
  (() => {
    const svgW = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7 14h3M7 17h6"/></svg>';
    const svgD = '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
    const mine = $('#tabs button[data-view="mine"]'); if (mine) mine.insertAdjacentHTML("afterend", `<button role="tab" data-view="woche" data-roles="lalei">${svgW}Meine Woche</button>`);
    const home = $('#tabs button[data-view="home"]'); if (home) home.insertAdjacentHTML("afterend", `<button role="tab" data-view="woche" data-roles="team">${svgW}Meine Woche</button>`);
    const inf = $('#tabs button[data-view="infos"]'); if (inf) inf.insertAdjacentHTML("afterend", `<button role="tab" data-view="docs">${svgD}Dokumente</button>`);
    const nav = $("#tabs"); if (nav) nav.insertAdjacentHTML("beforeend", `<button class="side-mini-btn" data-side-mini type="button" title="Seitenleiste ein- oder ausklappen" aria-label="Seitenleiste einklappen"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg><span>Einklappen</span></button>`);
  })();

  // ---------- Seitenleiste einklappen, kompakte Ansicht, Lagerfarbe, Titelbild ----------
  const applyLook = () => { document.body.classList.toggle("side-mini", store.get("lalei-side-mini") === "1"); document.body.classList.toggle("compact", store.get("lalei-kompakt") === "1"); };
  applyLook();
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("[data-side-mini]")) { store.set("lalei-side-mini", store.get("lalei-side-mini") === "1" ? "" : "1"); applyLook(); } });
  const FARBEN = ["#1c5d6b", "#303090", "#b4232f", "#2f7a4f", "#b0592b", "#7a4e9c", "#1c7a8a", "#8a6a1c"];
  function lagerFarbe() {
    const r = document.documentElement.style; const f = state.lagerId ? cfg().farbe : "";
    if (!f) { ["--accent", "--accent-soft", "--lager-farbe"].forEach((k) => r.removeProperty(k)); return; }
    const dunkel = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    r.setProperty("--lager-farbe", f); r.setProperty("--accent", dunkel ? `color-mix(in srgb, ${f} 55%, #ffffff)` : f); r.setProperty("--accent-soft", dunkel ? `color-mix(in srgb, ${f} 30%, #10181c)` : `color-mix(in srgb, ${f} 12%, #ffffff)`);
  }
  const renderSideOrig4 = renderSide;
  renderSide = function () { renderSideOrig4(); lagerFarbe(); };
  const showStartOrig4 = showStart;
  showStart = function (...a) { const r = showStartOrig4(...a); lagerFarbe(); return r; };
  const titelBild = () => { const b = cfg().titelbild; const u = b && imgSrc(b.url); return u ? `<div class="title-img" style="background-image:url('${esc(u)}')" role="img" aria-label="Titelbild"></div>` : ""; };
  const setUpdateOrig4 = views.settings.update;
  views.settings.update = function () {
    setUpdateOrig4(); const box = $("#set-lager"); if (!box || $(".look-field", box)) return; const c = cfg(); const ro = isReadOnly() || isClosed();
    box.insertAdjacentHTML("beforeend", `<div class="form-grid look-field" style="margin-top:16px"><div class="field"><span>Farbe dieses Lagers</span><div class="swatches">${FARBEN.map((f) => `<button type="button" class="swatch" style="--sw:${f}" data-farbe="${f}" aria-pressed="${(c.farbe || "") === f}" aria-label="Farbe ${f}" ${ro ? "disabled" : ""}></button>`).join("")}<button type="button" class="link" data-farbe="" ${ro ? "disabled" : ""}>Standard</button></div></div>
      <div class="field"><span>Titelbild (oben auf der Übersicht und im Bereich des Teams)</span><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label class="btn small" style="cursor:pointer">Bild hinzufügen<input type="file" accept="image/*" data-titelbild hidden ${ro ? "disabled" : ""}></label>${c.titelbild ? `<span class="muted" style="font-size:13px">${esc(c.titelbild.name || "Titelbild")}</span><button class="btn small ghost danger" data-titelbild-rm ${ro ? "disabled" : ""}>Entfernen</button>` : ""}</div></div></div>`);
  };
  view.addEventListener("click", (e) => {
    const f = e.target.closest("[data-farbe]"); if (f) return writeConfig({ farbe: f.dataset.farbe }).then(lagerFarbe);
    if (e.target.closest("[data-titelbild-rm]")) return writeConfig({ titelbild: null });
  });
  view.addEventListener("change", async (e) => { if (!e.target.matches("[data-titelbild]") || !e.target.files[0]) return; const fl = e.target.files[0]; e.target.value = ""; try { toast("Bild wird hochgeladen …"); const r = await uploadAny(fl, 1800); await writeConfig({ titelbild: r }); } catch (err) { toast(errMsg(err)); } });
  for (const v of ["overview", "home"]) { const up = views[v].update; views[v].update = function () { up(); const ph = $("#view .page-head"); const tb = titelBild(); const old = $("#view .title-img"); if (old) old.remove(); if (ph && tb) ph.insertAdjacentHTML("beforebegin", tb); }; }
  const prefsUpdateOrig4 = views.prefs.update;
  views.prefs.update = function () {
    prefsUpdateOrig4(); const card = $("#prefs-body .card .card-body"); if (!card || $("[data-kompakt]", card)) return;
    card.insertAdjacentHTML("beforeend", `<div class="field"><span>Ansicht</span><div class="seg" role="radiogroup"><button type="button" data-kompakt="" aria-pressed="${store.get("lalei-kompakt") !== "1"}">Normal</button><button type="button" data-kompakt="1" aria-pressed="${store.get("lalei-kompakt") === "1"}">Kompakt</button></div></div>`);
  };
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-kompakt]"); if (!b) return; store.set("lalei-kompakt", b.dataset.kompakt); applyLook(); views.prefs.update(); $("#prefs-body").querySelectorAll("[data-kompakt]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); });

  // ---------- Übersicht: zuletzt angesehen ----------
  const ovUpdateOrig4 = views.overview.update;
  views.overview.update = function () {
    ovUpdateOrig4(); const z = zuletztOk().slice(0, 6); const box = $("#ov-new"); if (!box || !z.length) return;
    box.insertAdjacentHTML("afterend", `<section class="card recent-card" id="ov-recent"><div class="card-head"><h2>Zuletzt angesehen</h2></div><div class="card-body recent">${z.map((x) => `<button class="pchip-s" ${zuletztAttr(x)}>${x.k === "t" ? "☑" : x.k === "h" ? "👥" : "📝"} ${esc(x.titel)}</button>`).join("")}</div></section>`);
    $$("#ov-recent").length > 1 && $$("#ov-recent")[1].remove();
  };
  const $$ = (s) => [...document.querySelectorAll(s)];

  // ---------- Aufgabenliste: Aktionen beim Darüberfahren, direkt umbenennen, Neues aufleuchten, Wischen ----------
  let gesehenAm = new Map();
  const tasksUpdateOrig4 = views.tasks.update;
  views.tasks.update = function () {
    tasksUpdateOrig4(); const kann = isLaLei() && !isReadOnly() && !isClosed() && !state.asTeam;
    document.querySelectorAll("#task-list tr.task").forEach((tr) => {
      const id = ((tr.querySelector(".t-title[data-open]") || {}).dataset || {}).open; if (!id) return; const t = state.tasks.get(id); if (!t) return;
      const prev = gesehenAm.get(id); if (prev && prev !== t.updatedAt && t.updatedBy !== me()) tr.classList.add("flash");
      if (kann && !tr.querySelector(".row-acts")) tr.querySelector(".c-main .t-row > div").insertAdjacentHTML("beforeend", `<span class="row-acts"><button class="link" data-ren="${esc(id)}" title="Titel ändern">✎ umbenennen</button>${t.deadline && t.status !== "Erledigt" ? `<button class="link" data-plus7="${esc(id)}" title="Deadline eine Woche später">+1 Woche</button>` : ""}</span>`);
    });
    gesehenAm = new Map([...state.tasks.values()].map((t) => [t._id, t.updatedAt]));
  };
  view.addEventListener("click", (e) => {
    const p7 = e.target.closest("[data-plus7]"); if (p7) { const t = state.tasks.get(p7.dataset.plus7); if (t && t.deadline) writeTask(t._id, { deadline: addDays(t.deadline, 7) }, `Deadline: ${fmtFull(addDays(t.deadline, 7))}`); return; }
    const rn = e.target.closest("[data-ren]"); if (!rn) return; const t = state.tasks.get(rn.dataset.ren); const btn = rn.closest("tr").querySelector(".t-title"); if (!t || !btn) return;
    const inp = document.createElement("input"); inp.className = "inline-ren"; inp.value = t.title; inp.setAttribute("aria-label", "Neuer Titel"); btn.replaceWith(inp); inp.focus(); inp.select();
    let fertig = false; const ende = (speichern) => { if (fertig) return; fertig = true; const v = inp.value.trim(); if (speichern && v && v !== t.title) writeTask(t._id, { title: v }, `Umbenannt: «${v}»`); else views.tasks.update(); };
    inp.onkeydown = (ev) => { if (ev.key === "Enter") { ev.preventDefault(); ende(true); } if (ev.key === "Escape") { ev.stopPropagation(); ende(false); } };
    inp.onblur = () => ende(true);
  });
  let tStart = null;
  view.addEventListener("touchstart", (e) => { const tr = e.target.closest && e.target.closest("#task-list tr.task"); tStart = tr && e.touches.length === 1 ? { tr, x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  view.addEventListener("touchmove", (e) => { if (!tStart) return; const dx = e.touches[0].clientX - tStart.x, dy = e.touches[0].clientY - tStart.y; if (Math.abs(dy) > 30) { tStart.tr.style.transform = ""; tStart = null; return; } tStart.tr.style.transform = `translateX(${Math.max(-90, Math.min(90, dx))}px)`; tStart.tr.classList.toggle("swipe-done", dx > 60); tStart.tr.classList.toggle("swipe-open", dx < -60); }, { passive: true });
  view.addEventListener("touchend", (e) => {
    if (!tStart) return; const { tr, x } = tStart; tStart = null; const dx = (e.changedTouches[0] || {}).clientX - x; tr.style.transform = ""; tr.classList.remove("swipe-done", "swipe-open");
    const id = ((tr.querySelector(".t-title[data-open]") || {}).dataset || {}).open; if (!id) return;
    if (dx > 80) { const b = tr.querySelector("[data-qdone]"); if (b) b.click(); } else if (dx < -80) openTask(id);
  });

  // ---------- Zum Aktualisieren nach unten ziehen (Handy) ----------
  let pull = null; const pullEl = document.createElement("div"); pullEl.className = "pull-ind"; pullEl.textContent = "↓ Loslassen zum Aktualisieren"; document.body.appendChild(pullEl);
  document.addEventListener("touchstart", (e) => { pull = window.scrollY <= 0 && state.lagerId && !$(".overlay") && e.touches.length === 1 && !(e.target.closest && e.target.closest("#task-list tr.task, .kanban, .gantt, .table-wrap")) ? { y: e.touches[0].clientY, d: 0 } : null; }, { passive: true });
  document.addEventListener("touchmove", (e) => { if (!pull) return; pull.d = e.touches[0].clientY - pull.y; pullEl.classList.toggle("show", pull.d > 40); pullEl.classList.toggle("ready", pull.d > 90); }, { passive: true });
  document.addEventListener("touchend", async () => { if (!pull) return; const go = pull.d > 90; pull = null; pullEl.classList.remove("ready"); if (!go) return pullEl.classList.remove("show"); pullEl.textContent = "Wird aktualisiert …"; try { if (STORE.syncNow) await STORE.syncNow(); refresh(true); } catch {} setTimeout(() => { pullEl.classList.remove("show"); pullEl.textContent = "↓ Loslassen zum Aktualisieren"; }, 500); });

  // ---------- Fenster: schnelle Daten, Personensuche ----------
  function fensterHilfen(o) {
    if (!o) return;
    o.querySelectorAll('.drawer input[type="date"], .modal input[type="date"]').forEach((inp) => {
      if (inp.nextElementSibling && inp.nextElementSibling.classList.contains("qd")) return; const st = (cfg().dates || {}).start;
      const ziele = [["Heute", iso(today())], ["Morgen", addDays(iso(today()), 1)], ["+1 Woche", addDays(inp.value || iso(today()), 7)], ["Ende Monat", (() => { const d = today(); return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); })()], ...(st ? [["Lagerbeginn", st]] : [])];
      inp.insertAdjacentHTML("afterend", `<div class="qd" role="group" aria-label="Schnell wählen">${ziele.map(([l, v]) => `<button type="button" data-qd="${v}">${l}</button>`).join("")}${inp.value ? `<span class="muted qd-rel">${relDay(inp.value)}</span>` : ""}</div>`);
    });
    o.querySelectorAll(".drawer select, .modal select").forEach((s) => {
      if (s.options.length < 12 || s.dataset.ps || s.closest(".bulk-bar")) return; s.dataset.ps = "1";
      const f = document.createElement("input"); f.type = "search"; f.className = "ps-filter"; f.placeholder = "Person suchen …"; f.setAttribute("aria-label", "Liste durchsuchen"); s.before(f);
      f.oninput = () => { const q = f.value.trim().toLowerCase(); let first = null; for (const op of s.options) { const show = !q || !op.value || op.text.toLowerCase().includes(q); op.hidden = !show; if (show && q && op.value && !first) first = op; } for (const g of s.querySelectorAll("optgroup")) g.hidden = ![...g.children].some((x) => !x.hidden); if (first) { s.value = first.value; s.dispatchEvent(new Event("change", { bubbles: true })); s.dispatchEvent(new Event("input", { bubbles: true })); } };
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-qd]"); if (!b) return; const inp = b.parentElement.previousElementSibling; if (!inp || inp.type !== "date") return;
    inp.value = b.dataset.qd; inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
    const r = b.parentElement.querySelector(".qd-rel"); if (r) r.textContent = relDay(inp.value); else b.parentElement.insertAdjacentHTML("beforeend", `<span class="muted qd-rel">${relDay(inp.value)}</span>`);
  });
  const renderDrawerOrig4 = renderDrawer;
  renderDrawer = function () { renderDrawerOrig4(); if (openTaskId) fensterHilfen($(".overlay")); };
  const renderEntryOrig4 = renderEntryDrawer;
  renderEntryDrawer = function () { renderEntryOrig4(); if (ed) fensterHilfen($(".overlay")); };

  // ---------- Schichtplan: Personen auf Dienste ziehen ----------
  const planUpdateOrig4 = views.plan.update;
  views.plan.update = function () {
    planUpdateOrig4(); if (!isLaLei() || isReadOnly() || isClosed() || state.asTeam || !days().length) return;
    const tbl = $("#plan-body .plan-table"); if (!tbl || $(".drag-people")) return;
    tbl.closest(".card").insertAdjacentHTML("beforebegin", `<div class="drag-people card"><span class="muted">Person auf einen Dienst ziehen:</span>${people().map((p) => `<span class="pchip-s" draggable="true" data-drag-person="${esc(p)}">${av(p)}${esc(p)}</span>`).join("")}</div>`);
  };
  let dragP = null;
  view.addEventListener("dragstart", (e) => { const c = e.target.closest && e.target.closest("[data-drag-person]"); if (c) { dragP = c.dataset.dragPerson; e.dataTransfer.effectAllowed = "copy"; } });
  view.addEventListener("dragover", (e) => { const td = dragP && e.target.closest && e.target.closest("td.pc[data-plan]"); if (td) { e.preventDefault(); document.querySelectorAll("td.pc.drop").forEach((x) => x !== td && x.classList.remove("drop")); td.classList.add("drop"); } });
  view.addEventListener("drop", (e) => {
    const td = dragP && e.target.closest && e.target.closest("td.pc[data-plan]"); document.querySelectorAll("td.pc.drop").forEach((x) => x.classList.remove("drop")); if (!td) return; e.preventDefault();
    const [sid, did] = td.dataset.plan.split("|"); const key = did + "|" + sid; const cur = (planDoc().cells || {})[key] || []; const n = dragP; dragP = null;
    if (cur.includes(n)) return toast(`${n} ist dort schon eingeteilt.`); savePlan({ cells: { [key]: [...cur, n] } }).then(() => toast(`${n} eingeteilt`));
  });
  view.addEventListener("dragend", () => { dragP = null; });

  // ---------- Zeitplan am Handy als Liste ----------
  const tlUpdateOrig4 = views.timeline.update;
  views.timeline.update = function () {
    tlUpdateOrig4(); const g = $("#gantt"); if (!g || window.innerWidth >= 700) return;
    const t0 = iso(monday(today())); const ms = milestones(); const hk = state.hoecks; const tasks = allTasks().filter((t) => t.deadline && t.status !== "Erledigt");
    const all = [...ms.map((m) => m.date), ...hk.map((h) => h.date), ...tasks.map((t) => t.deadline)].filter((d) => d && d >= t0).sort(); if (!all.length) { g.innerHTML = '<div class="empty">Keine kommenden Termine.</div>'; return; }
    const wochen = []; for (let w = parse(t0); iso(w) <= all[all.length - 1] && wochen.length < 40; w = new Date(w.getTime() + 7 * DAY)) wochen.push(iso(w));
    g.innerHTML = `<div class="tl-list">${wochen.map((wi) => { const we = addDays(wi, 6); const inW = (d) => d >= wi && d <= we;
      const m = ms.filter((x) => inW(x.date)), h = hk.filter((x) => inW(x.date)), t = tasks.filter((x) => inW(x.deadline)); if (!m.length && !h.length && !t.length) return "";
      return `<section class="tl-week ${inPause(wi, we) ? "pause" : ""}"><div class="tl-wh"><b>${fmtFull(wi).slice(0, 6)} – ${fmtFull(we).slice(0, 6)}</b>${wi === t0 ? '<span class="tag next">diese Woche</span>' : `<span class="muted">${relDay(wi)}</span>`}</div>
        ${m.map((x) => `<div class="tl-it ms">◆ <b>${esc(x.name)}</b> <span class="muted">${fmt(x.date)}</span></div>`).join("")}${h.map((x) => `<button class="tl-it hoeck" data-open-hoeck="${esc(x._id)}">👥 ${esc(x.title || HK[x.kind || "LaLei"].label)} <span class="muted">${fmt(x.date)}</span></button>`).join("")}
        ${t.length ? `<details class="tl-tasks"><summary>${t.length} ${t.length === 1 ? "Aufgabe" : "Aufgaben"} fällig${t.some(isLate) ? " · ⚠" : ""}</summary>${t.map((x) => `<button class="tl-it task" data-open="${esc(x._id)}">☑ ${esc(x.title)} <span class="muted">${esc(x.ressort)}</span></button>`).join("")}</details>` : ""}</section>`; }).join("")}</div>`;
  };
  let tlBreit = window.innerWidth >= 700;
  window.addEventListener("resize", () => { const b = window.innerWidth >= 700; if (b !== tlBreit) { tlBreit = b; if (state.view === "timeline") views.timeline.update(); } });

  // ---------- Übungslager (Admin) ----------
  const UEB_ID = "uebung";
  const SKIP = ["kids", "trash", "log", "versions", "presence", "media", "todos", "feedback", "attreq", "swap", "react", "lager", "toolFb", "count"];
  function uebPaint() {
    const m = $(".admin-modal"); if (!m || !adPw || !/Angemeldet als Admin/.test(m.textContent) || $("#ad-uebung", m)) return;
    const lagers = STORE.lagerList().filter((l) => l._id !== UEB_ID && !l.uebung); const da = STORE.lagerList().find((l) => l._id === UEB_ID);
    const html = `<section class="card" id="ad-uebung"><div class="card-head"><h2>Übungslager</h2>${da ? '<span class="tag ok">vorhanden</span>' : ""}</div><div class="card-body stack" style="gap:10px">
      <p class="hint" style="margin:0">Eine Kopie eines echten Lagers zum Ausprobieren und Üben, ohne Teilnehmende und ohne private Daten. ${da ? "Neu kopieren ersetzt das bisherige Übungslager." : ""}</p>
      <div class="form-grid"><label class="field"><span>Kopie von</span><select id="ub-src" class="input">${lagers.map((l) => `<option value="${esc(l._id)}">${esc(l.title || l._id)}</option>`).join("")}</select></label><label class="field"><span>Lagerpasswort fürs Übungslager</span><input type="password" id="ub-pw" minlength="6" autocomplete="new-password" placeholder="mind. 6 Zeichen"></label></div>
      <button class="btn small" data-ub-go style="align-self:flex-start">${da ? "Übungslager neu kopieren" : "Übungslager erstellen"}</button><div id="ub-msg" class="hint wichtig"></div></div></section>`;
    const ref = $("#ad-toolfb", m) || $("#ad-vorlagen", m) || [...m.querySelectorAll("section.card")].find((s) => /Wartungshinweis/.test(s.textContent)); if (ref) ref.insertAdjacentHTML("beforebegin", html);
  }
  const showAdminOrig4 = showAdmin;
  showAdmin = function () {
    showAdminOrig4(); const m = $(".admin-modal"); if (!m) return;
    new MutationObserver(() => uebPaint()).observe(m, { childList: true });
    m.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-ub-go]"); if (!b) return; const src = $("#ub-src", m).value, pw = $("#ub-pw", m).value, msg = $("#ub-msg", m);
      if (!src) return; if (pw.length < 6) { $("#ub-pw", m).focus(); return toast("Das Lagerpasswort braucht mindestens 6 Zeichen."); }
      if (STORE.lagerList().some((l) => l._id === UEB_ID) && !confirm("Das bisherige Übungslager wird gelöscht und neu kopiert. Weiter?")) return;
      b.disabled = true; msg.textContent = "Wird kopiert …";
      try {
        const L = STORE.lagerList().find((l) => l._id === src) || {}; const data = await STORE.readLager(adPw, src);
        if (STORE.lagerList().some((l) => l._id === UEB_ID)) await STORE.admin(adPw, "deleteLager", { lager: UEB_ID });
        const ops = [{ op: "set", coll: "lager", id: UEB_ID, data: { title: "Übungslager", abteilung: L.abteilung || "", prep: L.prep || "", start: L.start || "", end: L.end || "", uebung: true, kopieVon: L.title || src, createdAt: nowStamp(), ...(L.logo ? { logo: L.logo } : {}) } }];
        for (const [c, docs] of Object.entries(data || {})) { if (SKIP.includes(c) || !docs || typeof docs !== "object") continue; for (const [id, d] of Object.entries(docs)) { if (c === "att" && !String(id).startsWith("p_")) continue; ops.push({ op: "set", coll: `${UEB_ID}:${c}`, id, data: d }); } }
        for (let i = 0; i < ops.length; i += 300) await STORE.writeRaw(adPw, ops.slice(i, i + 300));
        await STORE.admin(adPw, "setLagerPw", { lager: UEB_ID, pw });
        msg.innerHTML = `Fertig: ${ops.length - 1} Einträge aus «${esc(L.title || src)}» kopiert. Alle melden sich im Übungslager mit diesem Lagerpasswort an.`; b.disabled = false;
      } catch (err) { msg.textContent = errMsg(err); b.disabled = false; }
    });
  };
