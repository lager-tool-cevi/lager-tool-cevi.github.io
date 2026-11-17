  // =====================================================================
  // Ausbau 3: Aufgaben-Extras, Ressorts, Entscheide, Lager-Check, Verlauf, Einstellungen, Wetter, Tagesseiten
  // =====================================================================
  TEAM_VIEWS.push("count", "search"); TEAM_RO.search = "tsearch";
  Object.assign(HELP, {
    board: "Mitteilungen an das ganze Team. «Wichtig» hebt eine Mitteilung hervor, «Oben anheften» hält sie zuoberst. Mit «Erscheint ab» planst du sie für später, mit «Verschwindet nach» räumt sie sich selbst weg. «Für WhatsApp kopieren» ergibt einen Text für euren Gruppenchat.",
    count: "Alle Teilnehmenden antippen, die da sind. Wer fehlt, steht oben. Alle Leitenden sehen die gleiche Liste. «Zurücksetzen» leert sie für das nächste Durchzählen.",
    shop: "Gemeinsame Einkaufsliste der Lagerleitung. Abhaken, wenn gekauft. «Als Text kopieren» für den Chat.",
    rooms: "Zimmer und Zelte, Fahrten (Autos und ÖV) und Programmgruppen. Oben siehst du jeweils, wer noch nicht eingeteilt ist.",
    trooms: "Wer schläft wo, wer fährt mit wem, wer ist in welcher Gruppe. Deine Einteilung ist hervorgehoben.",
    tsearch: "Sucht in Mitteilungen, Infos, Schichtplan, Zimmern und Fahrten.",
  });
  HELP.ress = "Alles zu einem Ressort: Verantwortliche, Aufgaben, Dokumente, Notizen, zugewiesenes Feedback und Tipps vom letzten Lager. Oben wechselst du das Ressort.";
  TABS.overview = [["start", "Überblick"], ["org", "Organigramm"], ["ms", "Meilensteine"], ["due", "Fällig"], ["check", "Lager-Check"], ["log", "Verlauf"]];
  TABS.tasks.splice(1, 0, ["star", "Wichtig"]);
  TABS.mine = [["tasks", "Meine Aufgaben"], ["todo", "Private To-dos"], ["ment", "Erwähnungen"]];
  TABS.attendance.push(["stufen", "Stufen"]);
  TABS.settings = [["lager", "Lager"], ["leitung", "Team"], ["ress", "Ressorts"], ["ms", "Meilensteine"], ["tage", "Tage"], ["notfall", "Notfall"], ["vorlagen", "Vorlagen"], ["zugang", "Zugang & Export"]];

  // ---------- Seitenleiste: Tab-Titel, Abläufe beim Öffnen ----------
  const renderSideOrig = renderSide;
  renderSide = function () { renderSideOrig(); $("#asteam-back").hidden = !state.asTeam; const n = inboxCount(); document.title = (n ? `(${n}) ` : "") + "Lager-Tool"; $("#qnote").hidden = !isLaLei(); };
  const openLagerOrig = openLager;
  openLager = function (id) { state.snapDone = false; state.snapPrev = null; state.asTeam = false; document.body.classList.remove("as-team"); state.weather = null; return openLagerOrig(id); };

  // ---------- Aufgaben: Stichworte, Stern, Schnellerfassung, Einfügen, Wiederholen ----------
  const tagsOf = (t) => [...new Set(`${t.title || ""} ${t.note || ""}`.match(/#[\p{L}\p{N}_-]+/gu) || [])];
  function parseQuick(s) {
    let rest = " " + s + " "; let owner = "", deadline = "", ressort = "", teil = "";
    for (const p of people().slice().sort((a, b) => b.length - a.length)) { const re = new RegExp(`\\s@${escRe(p)}(?=[\\s.,;])`, "iu"); if (re.test(rest)) { owner = p; rest = rest.replace(re, " "); break; } }
    const m = rest.match(/\s(?:bis\s+)?(\d{1,2})\.(\d{1,2})\.(\d{2,4})?(?=\s)/i);
    if (m) { const d = +m[1], mo = +m[2]; let y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : today().getFullYear(); if (!m[3] && new Date(y, mo - 1, d) < today()) y++; if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) { deadline = iso(new Date(y, mo - 1, d)); rest = rest.replace(m[0], " "); } }
    rest = rest.replace(/\s#([\p{L}\p{N}+_-]+)/gu, (all, w) => { if (ressort) return all; const r = ressorts().find((x) => x.name.toLowerCase() === w.toLowerCase()); if (r) { ressort = r.name; return " "; } for (const r2 of ressorts()) { const s2 = subsOf(r2).find((x) => x.name.toLowerCase() === w.toLowerCase()); if (s2) { ressort = r2.name; teil = s2.name; return " "; } } return all; });
    return { title: rest.replace(/\s+/g, " ").trim(), owner, deadline, ressort, teil };
  }
  function quickPreview() {
    const el = $("#qt-preview"); const inp = $("#qt"); if (!el || !inp) return; const v = inp.value.trim();
    if (!v) { el.innerHTML = ""; return; } const q = parseQuick(v); const fr = state.filter.ressort.split("|")[0];
    el.innerHTML = `<span class="qchip">${esc(q.title || "…")}</span>${q.owner ? `<span class="qchip">👤 ${esc(q.owner)}</span>` : ""}${q.deadline ? `<span class="qchip">📅 ${fmtFull(q.deadline)}</span>` : ""}<span class="qchip ${q.ressort || fr ? "" : "warn"}">${q.ressort ? esc(q.ressort + (q.teil ? " › " + q.teil : "")) : fr ? esc(fr) : "Ressort fehlt: #Ressort anhängen"}</span>`;
  }
  async function quickAdd() {
    const inp = $("#qt"); const q = parseQuick(inp.value); if (!q.title) return inp.focus();
    const ressort = q.ressort || state.filter.ressort.split("|")[0];
    if (!ressort) { openTask("_new", { title: q.title, owner: q.owner, deadline: q.deadline }); return; }
    inp.value = ""; quickPreview(); const now = nowStamp();
    try { await state.db.collection("tasks").add({ title: q.title, ressort, teil: q.teil || "", owner: q.owner, support: "", deadline: q.deadline, status: "Offen", note: "", checklist: [], links: [], order: Date.now(), createdAt: now, updatedAt: now, updatedBy: me(), log: [{ at: now, by: me(), text: "Aufgabe erfasst (Schnellerfassung)" }] }); toast("Aufgabe erfasst"); } catch (e) { handleWriteError(e); }
  }
  const parseDate = (s) => { s = String(s || "").trim(); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`; m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/); if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return iso(new Date(y, +m[2] - 1, +m[1])); } return ""; };
  function openTaskPaste() {
    const o = modal(`<div class="lg-head"><span class="eyebrow">Aufgaben</span><h2>Aus Excel einfügen</h2></div><p class="muted" style="margin:0">Eine Aufgabe pro Zeile: <b>Aufgabe, Ressort, Deadline, Verantwortlich</b>. In Excel die Spalten markieren, kopieren (Strg+C) und hier einfügen.</p>
      <textarea id="tp-text" class="agenda-text" placeholder="Lagerhaus reservieren&#9;Infrastruktur&#9;15.01.2027&#9;Pax"></textarea><span class="hint">Ressorts müssen gleich heissen wie im Tool. Deadline als 15.01.2027. Eine Kopfzeile wird übersprungen.</span>
      <div class="lg-foot"><button class="link" data-tp-close>Abbrechen</button><button class="btn primary" data-tp-go>Hinzufügen</button></div>`, "wide-modal");
    setTimeout(() => $("#tp-text", o).focus(), 30);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-tp-close]")) return closeDrawer(); if (!e.target.closest("[data-tp-go]")) return;
      const rows = $("#tp-text", o).value.split(/\r?\n/).map((l) => l.split(/\t|;/).map((x) => x.trim())).filter((r) => r[0] && !/^aufgabe$/i.test(r[0]));
      let skipped = 0; const now = nowStamp(); const ops = [];
      rows.slice(0, 300).forEach((r, i) => { const rs = ressorts().find((x) => x.name.toLowerCase() === String(r[1] || "").toLowerCase()); if (!rs) { skipped++; return; }
        ops.push({ op: "set", coll: "tasks", id: state.db.newId() + i, data: { title: r[0], ressort: rs.name, teil: "", deadline: parseDate(r[2]), owner: people().find((p) => p.toLowerCase() === String(r[3] || "").toLowerCase()) || "", support: "", status: "Offen", note: "", checklist: [], links: [], order: Date.now() + i, createdAt: now, updatedAt: now, updatedBy: me(), log: [{ at: now, by: me(), text: "Aufgabe erfasst (aus Excel)" }] } }); });
      if (!ops.length) return toast(skipped ? "Kein Ressort erkannt. Bitte die Ressortnamen prüfen." : "Keine Aufgaben gefunden.");
      try { await state.db.batch(ops); closeDrawer(); toast(`${ops.length} Aufgaben hinzugefügt${skipped ? `, ${skipped} ohne bekanntes Ressort übersprungen` : ""}`); } catch (err) { handleWriteError(err); }
    };
  }
  // wiederkehrende Aufgabe: nach dem Abhaken kommt die nächste
  const REPEAT = { "": "nie", w1: "jede Woche", w2: "alle 2 Wochen", m1: "jeden Monat" };
  function nextRepeatDate(d, rep) { if (!d) d = iso(today()); if (rep === "w1") return addDays(d, 7); if (rep === "w2") return addDays(d, 14); const x = parse(d); x.setMonth(x.getMonth() + 1); return iso(x); }
  function repeatTask(t) {
    const now = nowStamp(); const nd = nextRepeatDate(t.deadline, t.repeat);
    return state.db.collection("tasks").add({ title: t.title, ressort: t.ressort, teil: t.teil || "", owner: t.owner || "", support: t.support || "", deadline: nd, status: "Offen", note: t.note || "", checklist: (t.checklist || []).map((c) => ({ t: c.t, done: false })), links: t.links || [], repeat: t.repeat, star: !!t.star, ongoing: !!t.ongoing, order: Date.now(), createdAt: now, updatedAt: now, updatedBy: me(), log: [{ at: now, by: me(), text: `Wiederholung (${REPEAT[t.repeat]}) nach Erledigen vom ${fmtFull(t.deadline)}` }] }).then(() => toast(`Nächste Wiederholung am ${fmtFull(nd)} erstellt`)).catch(handleWriteError);
  }
  // Datei bei einer Aufgabe hochladen: wird als Link eingetragen
  document.addEventListener("change", async (e) => {
    const t = e.target; if (!t.matches || !t.matches("[data-task-file]")) return; const f = t.files[0]; t.value = ""; if (!f) return;
    try { toast("Wird hochgeladen …"); const r = await uploadAny(f, 2000); const box = $('.overlay [data-link-add="task"]'); if (!box) return; const [ti, ur] = box.querySelectorAll("input"); ti.value = r.name; ur.value = r.url; $('.overlay [data-link-go="task"]').click(); toast("Datei angehängt"); }
    catch (err) { toast(errMsg(err)); }
  });

  // ---------- Ressorts mit Reitern ----------
  views.ress = {
    shell: () => { const rs = ressorts(); if (!rs.some((x) => x.id === state.ressId)) state.ressId = (rs[0] || {}).id; const r = rs.find((x) => x.id === state.ressId) || {};
      return `${pageHead("Ressorts", "Alles zu einem Ressort auf einer Seite", `<div class="btn-group"><button class="btn primary" data-ress-new>+ Aufgabe</button>${menu([[`data-ress="${esc(r.name || "")}" data-teil=""`, "In «Aufgaben» filtern"], [`data-ress-links="${esc(r.id || "")}"`, "Dokumente bearbeiten"]])}</div>`)}
      <div class="subtabs page-tabs" role="tablist">${rs.map((x) => { const st = statsFor(allTasks().filter((t) => t.ressort === x.name)); return `<button role="tab" data-ress-tab="${esc(x.id)}" aria-selected="${x.id === state.ressId}">${esc(x.name)}${st.late ? `<span class="n late">${st.late}</span>` : ""}</button>`; }).join("")}</div>
      <div id="rp-kpi" class="kpis"></div>
      <div class="grid-2"><section class="card"><div class="card-head"><h2>Verantwortliche</h2><button class="link" data-goto="settings" data-go-tab="settings|ress">Ändern</button></div><div class="card-body" id="rp-team"></div></section>
        <section class="card"><div class="card-head"><h2>Notizen</h2><span class="saved"></span></div><div class="card-body"><textarea id="rp-notes" rows="5" data-mention placeholder="Kontakte, Abmachungen, Ideen fürs Ressort …">${esc(r.notes || "")}</textarea></div></section></div>
      <section class="card"><div class="card-head"><h2>Aufgaben</h2><label class="check"><input type="checkbox" id="m-open" ${state.filter.open ? "checked" : ""}> Erledigte ausblenden</label></div><div id="rp-tasks"></div></section>
      <div class="grid-2"><section class="card"><div class="card-head"><h2>Dokumente</h2></div><div class="card-body" id="rp-links"></div></section><section class="card"><div class="card-head"><h2>Ideen &amp; Feedback</h2><span class="muted">aus dem Eingang zugewiesen</span></div><div id="rp-fb"></div></section></div>
      <div id="rp-tips"></div>`; },
    update() {
      const r = ressorts().find((x) => x.id === state.ressId); if (!r) { $("#rp-tasks").innerHTML = `<div class="empty">Noch keine Ressorts.</div>`; return; }
      const all = allTasks().filter((t) => t.ressort === r.name); const s = statsFor(all); const t0 = iso(today()); const nx = all.find((t) => t.status !== "Erledigt" && t.deadline >= t0);
      $("#rp-kpi").innerHTML = `<div class="card kpi"><span class="eyebrow">Erledigt</span><span class="v">${s.done} <small>von ${s.total}</small></span><div class="bar ok"><i style="width:${pct(s.done, s.total)}%"></i></div></div><div class="card kpi ${s.late ? "alert" : ""}"><span class="eyebrow">Überfällig</span><span class="v">${s.late}</span></div><div class="card kpi"><span class="eyebrow">Nächste Deadline</span><span class="v" style="font-size:20px">${nx ? fmt(nx.deadline) : "–"}</span><span class="s">${nx ? esc(nx.title) : ""}</span></div>`;
      $("#rp-team").innerHTML = `<div class="org-roles"><div class="org-role"><span>Leitung</span>${person(r.lead, "offen")}</div><div class="org-role"><span>Stv</span>${person(r.stv, "offen")}</div></div>${r.note ? `<p class="muted" style="margin:10px 0 0;font-size:13px">${esc(r.note)}</p>` : ""}${subsOf(r).map((sb) => `<div class="org-sub" data-ress="${esc(r.name)}" data-teil="${esc(sb.name)}" style="margin-top:10px"><b>↳ ${esc(sb.name)}</b><div class="org-roles"><div class="org-role"><span>Leitung</span>${person(sb.lead, "offen")}</div><div class="org-role"><span>Stv</span>${person(sb.stv, "offen")}</div></div></div>`).join("")}`;
      $("#rp-links").innerHTML = linksView(r.links) || '<span class="muted" style="font-size:13px">Noch keine Dokumente.</span>';
      const fb = state.feedback.filter((f) => f.ressort === r.id);
      $("#rp-fb").innerHTML = fb.length ? fb.map((f) => `<div class="mrow"><div class="entry-top"><span class="tag plain type-idea">${esc(f.kind || "Idee")}</span><span class="muted" style="font-size:12.5px">${esc(f.anon ? "anonym" : f.name)}</span><span class="tag plain fb-${esc(FB_STATUS[f.status] || "neu")}">${esc(f.status || "Neu")}</span></div><div class="rich">${rich(f.text)}</div></div>`).join("") : '<div class="empty" style="padding:16px">Nichts zugewiesen. Im Eingang kannst du Feedback einem Ressort zuweisen.</div>';
      const tip = (cfg().prevTips || {})[r.name]; const ev = state.evals.get(r.id) || {};
      $("#rp-tips").innerHTML = tip || ev.tips ? `<section class="card"><div class="card-head"><h2>Tipps</h2></div><div class="card-body stack" style="gap:10px">${tip ? `<div class="tips-prev"><b style="font-weight:600">Vom letzten Lager</b><div class="rich">${rich(tip)}</div></div>` : ""}${ev.tips ? `<div class="tips-prev"><b style="font-weight:600">Aus der Auswertung</b><div class="rich">${rich(ev.tips)}</div></div>` : ""}</div></section>` : "";
      $("#rp-tasks").innerHTML = taskTable(all.filter((t) => !state.filter.open || t.status !== "Erledigt"));
    },
  };

  // ---------- Protokoll: Entscheide-Sammlung ----------
  const journalUpdateOrig = views.journal.update;
  views.journal.update = function () {
    if (state.jTab !== "decisions") journalUpdateOrig(); else { state.jTab = "all"; journalUpdateOrig(); state.jTab = "decisions"; }
    const decs = []; for (const e of state.journal) { const ty = typeOf(e); if (ty === "meeting") (e.items || []).forEach((it) => { if ((it.decision || "").trim()) decs.push({ date: e.date, src: `${e.title || "Höck"}`, title: it.title, text: it.decision, id: e._id }); }); else if (ty === "note" && (e.text || "").trim()) decs.push({ date: e.date, src: "Notiz", title: e.title, text: e.text, id: e._id }); else if (ty === "contact" && (e.decision || "").trim()) decs.push({ date: e.date, src: `Kontakt ${e.contactName || ""}`, title: e.topic, text: e.decision, id: e._id }); }
    const tabs = $("#j-tabs"); if (tabs && !tabs.querySelector('[data-jtab="decisions"]')) tabs.insertAdjacentHTML("beforeend", `<button role="tab" data-jtab="decisions" aria-selected="${state.jTab === "decisions"}">Entscheide<span class="n">${decs.length}</span></button>`);
    if (state.jTab !== "decisions") return;
    tabs.querySelectorAll("[data-jtab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.jtab === "decisions")));
    const q = (state.decQ || "").toLowerCase(); const list = decs.filter((d) => !q || `${d.title} ${d.text} ${d.src}`.toLowerCase().includes(q)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const body = $("#j-body"); const keep = document.activeElement && document.activeElement.id === "dec-q";
    body.innerHTML = `<div class="toolbar"><input type="search" id="dec-q" placeholder="Entscheide durchsuchen" value="${esc(state.decQ || "")}"></div>${list.length ? list.map((d) => `<div class="mrow" data-open-entry="${esc(d.id)}" role="button" tabindex="0"><div class="entry-top"><b style="font-weight:600">${esc(d.title || "")}</b><span class="muted" style="font-size:12px;margin-left:auto">${esc(d.src)} · ${fmtFull(d.date)}</span></div><div class="rich">${rich(d.text)}</div></div>`).join("") : `<div class="empty">Keine Entscheide${q ? " gefunden" : ". Entscheide aus Höck-Protokollen, Notizen und Kontakten erscheinen hier automatisch"}.</div>`}`;
    if (keep) { const i = $("#dec-q"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  };

  // ---------- Übersicht: Erste Schritte, Lager-Check, Verlauf ----------
  function setupSteps() {
    const c = cfg(); const rs = ressorts(); const assigned = rs.filter((r) => r.lead).length;
    return [
      ["Lagerdaten eintragen", !!(c.dates || {}).start, "settings|lager"],
      ["Lagerleitung erfassen (mind. 2)", peopleBy("LaLei").length >= 2, "settings|leitung"],
      [`Ressorts verteilen (${assigned} von ${rs.length})`, rs.length > 0 && assigned === rs.length, "settings|ress"],
      ["Meilensteine prüfen", milestones().length > 0, "settings|ms"],
      ["Lagertage festlegen", days().length > 0, "settings|tage"],
      ["Team einladen (Link und QR-Code)", !!c.teamInvited, "settings|zugang"],
    ];
  }
  function setupCard() {
    if (cfg().setupDone) return ""; const st = setupSteps(); const n = st.filter((x) => x[1]).length; if (n === st.length) return "";
    return `<section class="card setup"><div class="card-head"><h2>Erste Schritte</h2><span class="muted">${n} von ${st.length} erledigt</span><button class="link" data-setup-hide>Ausblenden</button></div><div class="card-body setup-steps">${st.map(([l, ok, go], i) => `<button class="setup-step ${ok ? "ok" : ""}" data-go-tab="${go}"><span class="num">${ok ? "✓" : i + 1}</span>${esc(l)}</button>`).join("")}</div></section>`;
  }
  function checkItems() {
    const ds = days(); const dps = dayparts(); const t0 = iso(today()); const out = [];
    const openAtt = (key) => ds.some((d) => dps.some((_, i) => (attDoc(key)[d.id + "|" + i] || "O") === "O"));
    const pOpen = state.peopleDocs.filter((p) => openAtt("p_" + p._id)).length, kOpen = state.kids.filter((k) => openAtt("k_" + k._id)).length;
    const as = assigned(); const roomless = state.kids.filter((k) => !as.has("k:" + k._id)).length + state.peopleDocs.filter((p) => !as.has("p:" + p._id)).length;
    const tripless = (dir) => { const tk = new Set(); for (const t of tripsOf(dir)) { (t.members || []).forEach((m) => tk.add(memberKey(m))); if (t.driver) tk.add("p:" + t.driver); } return state.kids.filter((k) => !tk.has("k:" + k._id)).length + state.peopleDocs.filter((p) => !tk.has("p:" + p._id)).length; };
    const plan = planDoc(); let empty = 0; for (const d of ds) for (const s of plan.services) if (!((plan.cells || {})[d.id + "|" + s.id] || []).length) empty++;
    const sec = securityPeople(); const late = allTasks().filter(isLate).length;
    out.push([ds.length > 0, "Lagertage festgelegt", ds.length ? `${ds.length} Tage` : "noch keine", "settings|tage"]);
    out.push([!pOpen, "Anwesenheit der Leitenden", pOpen ? `${pOpen} mit offenen Feldern` : "alle eingetragen", "attendance|lead"]);
    out.push([!kOpen, "Anwesenheit der Teilnehmenden", state.kids.length ? (kOpen ? `${kOpen} mit offenen Feldern` : "alle eingetragen") : "noch keine Teilnehmenden", "attendance|kids"]);
    out.push([!roomless && state.rooms.length > 0, "Zimmer und Zelte", state.rooms.length ? (roomless ? `${roomless} noch nicht eingeteilt` : "alle eingeteilt") : "noch keine", "rooms|zimmer"]);
    out.push([!tripless("Hin") && state.trips.length > 0, "Fahrten hin", state.trips.length ? (tripless("Hin") ? `${tripless("Hin")} ohne Fahrt` : "alle eingeteilt") : "noch keine", "rooms|fahrten"]);
    out.push([!tripless("Rück") && tripsOf("Rück").length > 0, "Fahrten zurück", tripsOf("Rück").length ? (tripless("Rück") ? `${tripless("Rück")} ohne Fahrt` : "alle eingeteilt") : "noch keine", "rooms|fahrten"]);
    out.push([ds.length > 0 && !empty, "Dienste im Schichtplan", ds.length ? (empty ? `${empty} Dienste noch leer` : "alle besetzt") : "keine Tage", "plan"]);
    out.push([sec.length > 0 && sec.every((s) => s.tel), "Sicherheitsverantwortliche mit Telefon", sec.length ? `${sec.filter((s) => s.tel).length} von ${sec.length} mit Nummer` : "noch niemand", "settings|notfall"]);
    out.push([!!cfg().adresse, "Lageradresse erfasst", cfg().adresse || "fehlt", "settings|lager"]);
    out.push([packTemplate().length > 0, "Packliste fürs Team", packTemplate().length ? `${packTemplate().length} Punkte` : "noch keine", "settings|vorlagen"]);
    out.push([!late, "Keine überfälligen Aufgaben", late ? `${late} überfällig` : "alles im Zeitplan", "tasks|late"]);
    out.push([!!cfg().mappeAt, "Lagermappe heruntergeladen", cfg().mappeAt ? `zuletzt ${stampFmt(cfg().mappeAt)}` : "noch nie", "mappe"]);
    return out;
  }
  const COLL_LABEL = { tasks: "Aufgabe", journal: "Protokoll", hoecks: "Höck", people: "Leitende", kids: "Teilnehmende", att: "Anwesenheit", plan: "Schichtplan", info: "Infos", eval: "Auswertung", rooms: "Zimmer/Zelt", config: "Lagerdaten", daypage: "Tagesseite", board: "Pinnwand", trips: "Fahrt", groups: "Gruppe", shop: "Einkaufsliste", trash: "Papierkorb" };
  const OP_LABEL = { set: "gespeichert", update: "geändert", delete: "gelöscht" };
  const ovShellOrig = views.overview.shell, ovUpdateOrig = views.overview.update;
  views.overview.shell = () => ovShellOrig()
    .replace(/<div class="btn-group"><button class="btn" data-export="overview">Als Excel<\/button><button class="btn" id="toggle-today">([^<]*)<\/button><\/div>/, (m, l) => menu([['data-export="overview"', "Als Excel"], ['id="toggle-today"', l]]))
    .replace('<div id="ov-today"></div>', '<div id="ov-setup"></div><div id="ov-today"></div>')
    + `<section class="card" ${pane("overview", "check")}><div class="card-head"><h2>Sind wir bereit fürs Lager?</h2><span class="muted" id="ov-check-n"></span></div><div id="ov-check"></div></section>
      <section class="card" ${pane("overview", "log")}><div class="card-head"><h2>Verlauf</h2><span class="muted">Wer hat wann was geändert (letzte 250 Änderungen)</span></div><div id="ov-log"></div></section>`;
  views.overview.update = function () {
    ovUpdateOrig(); $("#ov-setup").innerHTML = setupCard();
    const items = checkItems(); const ok = items.filter((x) => x[0]).length;
    $("#ov-check-n").textContent = `${ok} von ${items.length} erledigt`;
    $("#ov-check").innerHTML = `<div class="check-list-big">${items.map(([good, l, s, go]) => `<button class="chk-row ${good ? "ok" : "bad"}" ${go === "mappe" ? "data-mappe" : `data-go-tab="${go}"`}><span class="chk-ico">${good ? "✓" : "!"}</span><b>${esc(l)}</b><span class="muted">${esc(s)}</span><span class="chk-go">${good ? "" : "→"}</span></button>`).join("")}</div>`;
    const log = ((STORE.peek("log", "main") || {}).items || []);
    let lastDay = ""; $("#ov-log").innerHTML = log.length ? `<div class="log-list">${log.slice(0, 250).map((x) => { const d = (x.at || "").slice(0, 10); const head = d !== lastDay ? `<div class="sec-label">${fmt(d)}</div>` : ""; lastDay = d; return `${head}<div class="log-row"><span class="muted">${(stampFmt(x.at).split(", ")[1]) || ""}</span><b>${esc(x.by || "?")}</b><span>${COLL_LABEL[x.coll] || x.coll}${x.label ? ` «${esc(x.label)}»` : ""} ${OP_LABEL[x.op] || ""}</span></div>`; }).join("")}</div>` : '<div class="empty">Noch keine Änderungen aufgezeichnet.</div>';
  };

  // ---------- Einstellungen: Lagerort, Vorlagen, Zugang ----------
  const setUpdateOrig = views.settings.update;
  views.settings.update = function () {
    setUpdateOrig(); fillTabs("settings"); const c = cfg();
    $("#set-lager").insertAdjacentHTML("beforeend", `<div class="form-grid" style="margin-top:16px"><label class="field"><span>Lageradresse (erscheint beim Notfall-Knopf)</span><input data-cfg="adresse" value="${esc(c.adresse || "")}" placeholder="z.B. Pfadiheim Wildhaus, Dorfstrasse 1, 9658 Wildhaus"></label>
      <div class="field"><span>Lagerort für das Wetter</span><div style="display:flex;gap:6px"><input id="ort-q" class="input" value="${esc((c.ort || {}).name || "")}" placeholder="Ort, z.B. Wildhaus"><button class="btn small" data-ort-find>Suchen</button></div><div id="ort-res" class="hint">${c.ort ? `Gespeichert: ${esc(c.ort.name)} (${c.ort.lat.toFixed(2)}, ${c.ort.lon.toFixed(2)})` : "Für Wetter, Sonnenuntergang und Dämmerung auf den Tagesseiten."}</div></div></div>`);
    $("#set-tpl").innerHTML = `<div class="tpl-grid"><div class="field"><span>Packliste fürs Team</span><span class="muted" style="font-size:13.5px">Die Packliste hat jetzt eine eigene Seite.</span><button class="btn small" data-goto="pack" style="align-self:flex-start">Zur Packliste</button></div>
      <div class="stack" style="gap:18px"><div class="field"><span>Standard-Traktanden (kommen in jede neue Traktandenliste)</span><div class="list-edit">${(c.agendaDefaults || []).map((x, i) => `<div class="r"><input data-ad="${i}" value="${esc(x)}" aria-label="Traktandum"><button class="btn small ghost" data-ad-rm="${i}" aria-label="Entfernen">✕</button></div>`).join("")}<form class="r" data-ad-add><input placeholder="z.B. Rückblick letzte Woche"><button class="btn small">+</button></form></div></div>
      <div class="field"><span>Standard-Blöcke der Tagesseiten (zusätzlich zu To-dos, Zu besprechen, Wichtig, Ideen)</span><div class="list-edit">${(c.dayBlocks || []).map((x, i) => `<div class="r"><input data-db="${i}" value="${esc(x)}" aria-label="Block"><button class="btn small ghost" data-db-rm="${i}" aria-label="Entfernen">✕</button></div>`).join("")}<form class="r" data-db-add><input placeholder="z.B. Material, Wetter-Plan B"><button class="btn small">+</button></form></div><span class="hint">Gilt für Tagesseiten, die noch nicht bearbeitet wurden.</span></div></div></div>`;
    const link = appLink();
    $("#set-access").innerHTML = `<div class="access-grid"><div class="stack" style="gap:12px"><label class="field"><span>Link zum Tool</span><div style="display:flex;gap:6px"><input id="team-link" class="input" value="${esc(link)}" placeholder="${STORE.isGas ? "" : "In der Vorschau: hier den Google-Link einfügen"}"><button class="btn small" data-link-copy>Kopieren</button></div></label>
        <p class="hint" style="margin:0">Leitende öffnen den Link, wählen das Lager, dann «Team» und ihren Namen. Kein Passwort nötig.<br><b>Wie eine App:</b> iPhone: Teilen › «Zum Home-Bildschirm». Android: Menü ⋮ › «Zum Startbildschirm hinzufügen».</p>
        <div class="btn-group"><button class="btn primary" data-guide-docx>Kurzanleitung mit QR-Code (Word)</button><button class="btn" data-asteam-on>Als Team ansehen</button></div></div>
        <div class="qr-box" id="qr-box">${link ? '<span class="muted">QR-Code wird erstellt …</span>' : '<span class="muted">Zuerst den Link eintragen.</span>'}</div></div>`;
    if (link) qrDataUrl(link, 220).then((u) => { const b = $("#qr-box"); if (b) b.innerHTML = `<img src="${u}" alt="QR-Code zum Tool" width="220" height="220"><span class="muted" style="font-size:12px">Zum Zeigen am Höck oder Ausdrucken</span>`; if (!cfg().teamInvited) writeConfig({ teamInvited: true }); }).catch(() => { const b = $("#qr-box"); if (b) b.innerHTML = '<span class="muted">QR-Code konnte nicht geladen werden (Internet?).</span>'; });
  };
  const savePackTpl = (arr) => writeConfig({ packlist: arr });
  async function guideDocx() {
    const link = appLink(); const L = lagerDoc(); let qr = null; try { if (link) qr = await qrDataUrl(link, 400); } catch {}
    let b = W.p(W.r("So benutzt du das Lager-Tool"), { style: "Title" }) + W.p(W.r(L.title || "", { color: MUTE, sz: 26 }), { after: 200 });
    if (qr) b += W.p(W.img("rIdQr", 220, 220), { jc: "center", after: 120 }) + W.p(W.r(link, { color: MUTE, sz: 17 }), { jc: "center", after: 240 }); else if (link) b += W.p(W.r(link, { b: 1 }));
    const steps = [["1. Öffnen", "QR-Code scannen oder den Link öffnen. Tipp: als App auf den Startbildschirm legen (iPhone: Teilen › Zum Home-Bildschirm, Android: ⋮ › Zum Startbildschirm)."], ["2. Anmelden", "Lager wählen, dann «Team» und deinen Namen antippen. Kein Passwort nötig."], ["3. Mein Bereich", "Mitteilungen der Lagerleitung, deine Dienste, dein Zimmer, deine Fahrt, private To-dos, Packliste und Feedback an die Lagerleitung."], ["4. Anwesenheit", "Unter «Meine Anwesenheit» eintragen, wann du im Lager bist."], ["5. Im Lager", "Schichtplan, Einteilung und Abzählliste. Der rote Knopf «Notfall» zeigt die Sicherheitsverantwortlichen und die Lageradresse."]];
    for (const [h, t] of steps) b += W.p(W.r(h), { style: "Heading2" }) + W.p(W.r(t));
    saveFile(`Kurzanleitung Lager-Tool ${fileSafe(L.title)}.docx`, docx(b, `${L.abteilung || "Cevi"} · ${L.title || ""}`, "Kurzanleitung", qr ? { images: [{ rid: "rIdQr", bytes: dataBytes(qr) }] } : {}));
  }
  async function findOrt() {
    const q = $("#ort-q").value.trim(); if (!q) return; const res = $("#ort-res"); res.textContent = "Suche …";
    try { const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=de`).then((x) => x.json()); const list = r.results || [];
      res.innerHTML = list.length ? list.map((x, i) => `<button class="link" data-ort-pick="${i}">${esc(x.name)}${x.admin1 ? ", " + esc(x.admin1) : ""}${x.country_code ? " (" + esc(x.country_code) + ")" : ""}</button>`).join(" · ") : "Nichts gefunden."; state.ortRes = list; }
    catch { res.textContent = "Ortssuche nicht möglich (keine Verbindung zum Wetterdienst)."; }
  }

  // ---------- Wetter, Sonne ----------
  // Sonnenauf-/untergang und bürgerliche Dämmerung (NOAA-Näherung)
  function sunTimes(dateIso, lat, lon) {
    const d = parse(dateIso); const rad = Math.PI / 180; const N = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5);
    const calc = (zenith, rising) => {
      const lngHour = lon / 15; const t = N + ((rising ? 6 : 18) - lngHour) / 24; const M = 0.9856 * t - 3.289;
      let L = M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634; L = (L + 360) % 360;
      let RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad; RA = (RA + 360) % 360; RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90; RA /= 15;
      const sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
      const cosH = (Math.cos(zenith * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad)); if (cosH > 1 || cosH < -1) return null;
      let H = rising ? 360 - Math.acos(cosH) / rad : Math.acos(cosH) / rad; H /= 15;
      const T = H + RA - 0.06571 * t - 6.622; const UT = (T - lngHour + 48) % 24;
      const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0) + UT * 3600e3);
      return utc.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
    };
    return { rise: calc(90.833, true), set: calc(90.833, false), dusk: calc(96, false) };
  }
  const WCODE = { 0: ["☀️", "sonnig"], 1: ["🌤", "meist sonnig"], 2: ["⛅", "teils bewölkt"], 3: ["☁️", "bewölkt"], 45: ["🌫", "Nebel"], 48: ["🌫", "Nebel"], 51: ["🌦", "Niesel"], 53: ["🌦", "Niesel"], 55: ["🌦", "Niesel"], 61: ["🌧", "Regen"], 63: ["🌧", "Regen"], 65: ["🌧", "starker Regen"], 71: ["🌨", "Schnee"], 73: ["🌨", "Schnee"], 75: ["🌨", "starker Schnee"], 80: ["🌦", "Schauer"], 81: ["🌧", "Schauer"], 82: ["⛈", "heftige Schauer"], 95: ["⛈", "Gewitter"], 96: ["⛈", "Gewitter mit Hagel"], 99: ["⛈", "Gewitter mit Hagel"] };
  function loadWeather() {
    const o = cfg().ort; if (!o || state.weather) return state.weather ? Promise.resolve(state.weather) : Promise.resolve(null);
    state.weather = {}; const p = (o2) => fetch(`https://api.open-meteo.com/v1/forecast?latitude=${o2.lat}&longitude=${o2.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windgusts_10m_max&timezone=Europe%2FZurich&forecast_days=16`).then((r) => r.json());
    return p(o).then((r) => { const d = r.daily || {}; (d.time || []).forEach((t, i) => { state.weather[t] = { code: d.weathercode[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], rain: d.precipitation_sum[i], prob: d.precipitation_probability_max[i], gust: d.windgusts_10m_max[i] }; }); refresh(); return state.weather; }).catch(() => { state.weather = { _err: true }; return null; });
  }
  function weatherWarn(w) { const out = []; if (!w) return out; if ([95, 96, 99].includes(w.code)) out.push("Gewitter"); if (w.gust >= 60) out.push(`Sturmböen bis ${Math.round(w.gust)} km/h`); if (w.max >= 30) out.push(`Hitze bis ${Math.round(w.max)} °C`); if (w.rain >= 20) out.push(`viel Regen (${Math.round(w.rain)} mm)`); return out; }
  function weatherHtml(dateIso) {
    const o = cfg().ort; if (!o) return `<span class="muted" style="font-size:13px">Lagerort unter «Lager einrichten › Lager» eintragen, dann erscheint hier das Wetter.</span>`;
    loadWeather(); const w = (state.weather || {})[dateIso]; const sun = dateIso ? sunTimes(dateIso, o.lat, o.lon) : null; const ww = weatherWarn(w);
    const wx = w ? `<div class="wx"><span class="wx-ico">${(WCODE[w.code] || ["🌡"])[0]}</span><div><b>${Math.round(w.min)}° / ${Math.round(w.max)}°</b> ${(WCODE[w.code] || ["", ""])[1]}<div class="muted" style="font-size:12.5px">Regen ${w.prob ?? "–"} % · ${Math.round(w.rain || 0)} mm · Böen ${Math.round(w.gust || 0)} km/h</div></div></div>` : `<span class="muted" style="font-size:13px">${(state.weather || {})._err ? "Wetter nicht verfügbar (keine Verbindung zum Wetterdienst)." : "Vorhersage gibt es erst etwa 2 Wochen vorher."}</span>`;
    return `${ww.length ? `<div class="wx-warn">⚠ ${esc(ww.join(" · "))}</div>` : ""}${wx}${sun && sun.set ? `<div class="muted" style="font-size:12.5px;margin-top:6px">🌅 ${sun.rise} · 🌇 ${sun.set} · Dämmerung bis ${sun.dusk || "–"}</div>` : ""}<div class="muted" style="font-size:11.5px">${esc(o.name)}</div>`;
  }

  // ---------- Tagesseite: Tageschef, Wetter, To-dos mitnehmen ----------
  const dayShellOrig = views.day.shell, dayUpdateOrig = views.day.update;
  views.day.shell = () => dayShellOrig().replace('<div class="day-top">', '<div id="day-chief"></div><div class="day-top">').replace('<section class="card"><div class="card-head"><h2>Automatisch</h2>', '<section class="card"><div class="card-head"><h2>Wetter</h2></div><div class="card-body" id="day-wx"></div></section><section class="card"><div class="card-head"><h2>Automatisch</h2>');
  views.day.update = function () {
    dayUpdateOrig(); const ds = days(); const i = ds.findIndex((x) => x.id === state.dayId); const d = ds[i]; if (!d) return;
    const chiefSvc = planDoc().services.find((s) => /tageschef/i.test(s.name)); const chief = chiefSvc ? (planDoc().cells || {})[d.id + "|" + chiefSvc.id] || [] : [];
    $("#day-chief").innerHTML = chiefSvc ? `<div class="chief"><span class="eyebrow">${esc(chiefSvc.name)}</span><b>${chief.length ? chief.map((n) => esc(n)).join(", ") : "noch niemand eingeteilt"}</b></div>` : "";
    $("#day-wx").innerHTML = weatherHtml(d.date);
    const todo = (dayPage(d.id).blocks || []).find((b) => b.type === "todo"); const open = todo ? (todo.items || []).filter((x) => !x.done) : [];
    const head = $('.day-block.b-todo .card-head'); if (head && open.length && ds[i + 1] && !head.querySelector("[data-carry]")) head.insertAdjacentHTML("beforeend", `<button class="btn small" data-carry>${open.length} offen → ${esc(ds[i + 1].label)}</button>`);
  };
  async function carryTodos() {
    const ds = days(); const i = ds.findIndex((x) => x.id === state.dayId); const next = ds[i + 1]; if (!next) return;
    const cur = JSON.parse(JSON.stringify(dayPage(state.dayId).blocks)); const t = cur.find((b) => b.type === "todo"); const open = (t.items || []).filter((x) => !x.done); if (!open.length) return;
    const nb = JSON.parse(JSON.stringify(dayPage(next.id).blocks)); const nt = nb.find((b) => b.type === "todo"); nt.items = [...(nt.items || []), ...open.map((x) => ({ ...x, id: uid(), from: ds[i].label }))];
    t.items = t.items.filter((x) => x.done);
    await saveDay(state.dayId, { blocks: cur }); await saveDay(next.id, { blocks: nb }); toast(`${open.length} To-dos auf ${next.label} verschoben`);
  }
  const daysUpdateOrig = views.days.update;
  views.days.update = function () { daysUpdateOrig(); if (!cfg().ort) return; loadWeather(); document.querySelectorAll(".day-card[data-day-open]").forEach((c) => { const d = days().find((x) => x.id === c.dataset.dayOpen); const w = d && (state.weather || {})[d.date]; if (w) c.querySelector(".day-meta").insertAdjacentHTML("beforeend", `<span class="wx-mini">${(WCODE[w.code] || ["🌡"])[0]} ${Math.round(w.max)}°${weatherWarn(w).length ? ' <span class="tag late" style="font-size:10.5px">⚠</span>' : ""}</span>`); }); };

  // ---------- Anwesenheit: Stufen, Frist ----------
  const attShellOrig = views.attendance.shell, attUpdateOrig = views.attendance.update;
  views.attendance.shell = () => attShellOrig().replace(/<div class="btn-group"><button class="btn" data-paste="leaders">Leitende einfügen<\/button><button class="btn" data-paste="kids">Teilnehmende einfügen<\/button><button class="btn primary" data-att-xlsx>Als Excel exportieren<\/button><\/div>/, `<div class="btn-group"><label class="frist">Frist fürs Team <input type="date" class="input" data-cfg="attDeadline" value="${esc(cfg().attDeadline || "")}"></label>${menu([['data-paste="kids"', "Teilnehmende aus Excel einfügen"], ["data-att-xlsx", "Als Excel exportieren"]])}</div>`);
  views.attendance.update = function () {
    attUpdateOrig(); const ds = days(); const dps = dayparts(); if (!ds.length) return;
    const stufen = [...new Set(state.kids.map((k) => k.stufe || "Ohne Stufe"))].sort();
    const cnt = (s, d, i) => state.kids.filter((k) => (k.stufe || "Ohne Stufe") === s && (attDoc("k_" + k._id)[d.id + "|" + i] || "O") === "A").length;
    $("#att-body").insertAdjacentHTML("beforeend", `<section class="card" ${pane("attendance", "stufen")}><div class="card-head"><h2>Teilnehmende pro Stufe</h2><span class="muted">anwesend pro Tag (Tageszeit mit den meisten)</span></div>${stufen.length ? `<div class="table-wrap"><table><thead><tr><th>Stufe</th><th class="r">Total</th>${ds.map((d) => `<th class="r">${esc(d.label)}</th>`).join("")}</tr></thead><tbody>${stufen.map((s) => `<tr><td>${stufeTag(s)}</td><td class="r">${state.kids.filter((k) => (k.stufe || "Ohne Stufe") === s).length}</td>${ds.map((d) => `<td class="r">${Math.max(...dps.map((_, i) => cnt(s, d, i)))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : '<div class="empty">Noch keine Teilnehmenden.</div>'}</section>`);
  };

  // ---------- Auswertung als Excel ----------
  function evalXlsx() {
    const blocks = [{ id: "general", name: "Allgemein" }, ...ressorts().map((r) => ({ id: r.id, name: r.name }))];
    const rows = [[{ v: `Lagerauswertung ${lagerDoc().title || ""}`, s: XS.title }], [], ["Bereich", "Was lief gut?", "Was verbessern?", "Tipps fürs nächste Lager", "Zuletzt"].map((v) => ({ v, s: XS.head })),
      ...blocks.map((b) => { const ev = state.evals.get(b.id) || {}; return [{ v: b.name, s: XS.bold }, { v: noAt(ev.good || ""), s: XS.text }, { v: noAt(ev.improve || ""), s: XS.text }, { v: noAt(ev.tips || ""), s: XS.text }, { v: ev.updatedBy ? `${ev.updatedBy}, ${stampFmt(ev.updatedAt)}` : "", s: XS.text }]; })];
    saveFile(`Lagerauswertung ${fileSafe(lagerDoc().title)}.xlsx`, xlsx([{ name: "Auswertung", cols: [18, 50, 50, 50, 22], rows, freeze: { col: 0, row: 3 } }]));
  }

  // ---------- Deadlines mitverschieben, wenn ein Meilenstein verschoben wird ----------
  view.addEventListener("change", (e) => {
    const t = e.target; const m = (t.dataset.cfg || "").match(/^milestones\.([^.]+)\.date$/); if (!m || !t.value) return;
    const ms = milestones(); const cur = ms.find((x) => x.id === m[1]); if (!cur || !cur.date || cur.date === t.value) return;
    const prev = ms.filter((x) => x.date < cur.date && x.id !== cur.id).pop(); const diff = daysBetween(parse(cur.date), parse(t.value));
    const list = allTasks().filter((x) => x.status !== "Erledigt" && x.deadline && x.deadline <= cur.date && (!prev || x.deadline > prev.date));
    if (!list.length) return;
    setTimeout(() => {
      const o = modal(`<div class="lg-head"><span class="eyebrow">Meilenstein verschoben</span><h2>Aufgaben mitverschieben?</h2></div><p style="margin:0">«${esc(cur.name)}» liegt jetzt ${Math.abs(diff)} Tage ${diff > 0 ? "später" : "früher"}. Sollen die <b>${list.length} offenen Aufgaben</b> davor auch um ${Math.abs(diff)} Tage verschoben werden?</p><div class="lg-foot"><button class="link" data-sh-no>Nein, so lassen</button><button class="btn primary" data-sh-yes>Ja, mitverschieben</button></div>`);
      o.onclick = async (ev) => { if (ev.target === o || ev.target.closest("[data-sh-no]")) return closeDrawer(); if (!ev.target.closest("[data-sh-yes]")) return; closeDrawer();
        try { await state.db.batch(list.map((x) => ({ op: "update", coll: "tasks", id: x._id, data: { deadline: addDays(x.deadline, diff), updatedAt: nowStamp(), updatedBy: me(), log: [...(x.log || []), { at: nowStamp(), by: me(), text: `Deadline mit Meilenstein verschoben: ${fmtFull(addDays(x.deadline, diff))}` }] } }))); toast(`${list.length} Aufgaben verschoben`); } catch (err) { handleWriteError(err); } };
    }, 50);
  }, true);

  // ---------- Klicks und Eingaben ----------
  view.addEventListener("click", (e) => {
    const gt = e.target.closest("[data-go-tab]"); if (gt) { const [v, k] = gt.dataset.goTab.split("|"); if (k) { state.tabs[v] = k; store.set("lalei-tabs", JSON.stringify(state.tabs)); } if (v === "tasks" && k) state.filter = { ...state.filter, ressort: "", person: "", status: "", q: "" }; return setView(v); }
    if (e.target.closest("[data-setup-hide]")) return writeConfig({ setupDone: true });
    const rt = e.target.closest("[data-ress-tab]"); if (rt) { state.ressId = rt.dataset.ressTab; return render(); }
    if (e.target.closest("[data-task-paste]")) return openTaskPaste();
    const st = e.target.closest("[data-star]"); if (st) { const t = state.tasks.get(st.dataset.star); if (t) writeTask(t._id, { star: !t.star }); return; }
    const tg = e.target.closest("[data-tag]"); if (tg) { state.filter.tag = tg.dataset.tag; state.tabs.tasks = "all"; return setView("tasks"); }
    if (e.target.closest("[data-carry]")) return carryTodos();
    if (e.target.closest("[data-eval-xlsx]")) return evalXlsx();
    if (e.target.closest("[data-ort-find]")) return findOrt();
    const op = e.target.closest("[data-ort-pick]"); if (op) { const x = (state.ortRes || [])[+op.dataset.ortPick]; if (x) { state.weather = null; writeConfig({ ort: { name: `${x.name}${x.admin1 ? ", " + x.admin1 : ""}`, lat: x.latitude, lon: x.longitude } }).then(() => views.settings.update()); } return; }
    if (e.target.closest("[data-pt-example]")) { savePackTpl(PACK_EXAMPLE.flatMap(([s, list]) => list.map((t) => ({ id: "t" + uid(), section: s, t })))); return; }
    const ptr = e.target.closest("[data-pt-rm]"); if (ptr) { savePackTpl(packTemplate().filter((_, i) => i !== +ptr.dataset.ptRm)); return; }
    const adr = e.target.closest("[data-ad-rm]"); if (adr) { writeConfig({ agendaDefaults: (cfg().agendaDefaults || []).filter((_, i) => i !== +adr.dataset.adRm) }); return; }
    const dbr = e.target.closest("[data-db-rm]"); if (dbr) { writeConfig({ dayBlocks: (cfg().dayBlocks || []).filter((_, i) => i !== +dbr.dataset.dbRm) }); return; }
    if (e.target.closest("[data-link-copy]")) { const v = $("#team-link").value.trim(); if (v) copyText(v); return; }
    if (e.target.closest("[data-guide-docx]")) return guideDocx();
    if (e.target.closest("[data-asteam-on]")) return setAsTeam(true);
  });
  view.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.matches("[data-quick-task]")) { e.preventDefault(); quickAdd(); return; }
    if (f.matches("[data-pt-add]")) { e.preventDefault(); const [t, s] = f.querySelectorAll("input"); const v = t.value.trim(); if (!v) return t.focus(); const sec = s.value.trim() || "Diverses"; t.value = ""; savePackTpl([...packTemplate(), { id: "t" + uid(), section: sec, t: v }]).then(() => { const n = $("[data-pt-add] input"); if (n) n.focus(); }); return; }
    if (f.matches("[data-ad-add]")) { e.preventDefault(); const i = f.querySelector("input"); const v = i.value.trim(); if (!v) return; writeConfig({ agendaDefaults: [...(cfg().agendaDefaults || []), v] }); return; }
    if (f.matches("[data-db-add]")) { e.preventDefault(); const i = f.querySelector("input"); const v = i.value.trim(); if (!v) return; writeConfig({ dayBlocks: [...(cfg().dayBlocks || []), v] }); return; }
  });
  view.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "qt") quickPreview();
    if (t.id === "dec-q") { state.decQ = t.value; views.journal.update(); }
  });
  view.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "f-tag") { state.filter.tag = t.value; views.tasks.update(); return; }
    if (t.id === "rp-notes") { writeConfig({ ressorts: { [state.ressId]: { notes: t.value } } }); return; }
    if (t.dataset.pt) { const [i, k] = t.dataset.pt.split("|"); const arr = packTemplate().map((x) => ({ ...x })); arr[+i][k] = t.type === "checkbox" ? t.checked : t.value.trim(); savePackTpl(arr); return; }
    if (t.dataset.ad !== undefined) { const arr = (cfg().agendaDefaults || []).slice(); arr[+t.dataset.ad] = t.value.trim(); writeConfig({ agendaDefaults: arr.filter(Boolean) }); return; }
    if (t.dataset.db !== undefined) { const arr = (cfg().dayBlocks || []).slice(); arr[+t.dataset.db] = t.value.trim(); writeConfig({ dayBlocks: arr.filter(Boolean) }); return; }
    if (t.id === "team-link") { writeConfig({ teamLink: t.value.trim() }).then(() => views.settings.update()); return; }
  });
  document.getElementById("qnote").addEventListener("click", showQuickNote);
  document.getElementById("asteam-back").addEventListener("click", () => setAsTeam(false));

  // ---------- Hilfe: neue Bereiche ----------
  const helpUpdateOrig = views.help.update;
  views.help.update = function () {
    helpUpdateOrig(); if (!isLaLei()) return;
    const card = (t, body) => `<section class="card"><div class="card-head"><h2>${t}</h2></div><div class="card-body rich">${body}</div></section>`;
    $("#help-body").insertAdjacentHTML("beforeend", [
      card("Pinnwand &amp; Eingang", "Unter <b>Pinnwand</b> Mitteilungen ans Team schreiben: wichtig markieren, oben anheften, für später planen oder automatisch verschwinden lassen. «Für WhatsApp kopieren» ergibt den Text für den Gruppenchat. Fragen dazu, Feedback (auch anonym), Anwesenheits- und Diensttausch-Anfragen landen im <b>Eingang</b>."),
      card("Einteilung &amp; Abzählen", "Unter <b>Einteilung</b> gibt es Zimmer &amp; Zelte, <b>Fahrten</b> (Autos und ÖV, hin und zurück) und <b>Gruppen</b> (auch automatisch gemischt). <b>Abzählen</b> ist eine gemeinsame Liste für alle Leitenden. Zu allem gibt es Ausdrucke (Aushang, Türschilder, Listen)."),
      card("Ressorts &amp; Lager-Check", "<b>Ressorts</b> zeigt pro Ressort Aufgaben, Dokumente, Notizen und zugewiesenes Feedback. Unter <b>Übersicht › Lager-Check</b> prüft das Tool, ob alles bereit ist, und <b>Verlauf</b> zeigt, wer was geändert hat."),
      card("Schneller arbeiten", "Bei <b>Aufgaben</b> eine Zeile tippen wie «Offerte @Pax bis 15.3. #Logistik». Mit ★ markierst du Wichtiges, mit #Stichwort findest du Aufgaben quer über Ressorts. Der runde <b>+</b>-Knopf unten rechts nimmt jederzeit eine Notiz oder ein Traktandum auf."),
      card("Sicherung &amp; Zugang", "Jede Woche wird automatisch gesichert. Zurückspielen, Passwörter und «Alle abmelden» findest du im Zahnrad auf der Startseite. Unter <b>Lager einrichten › Zugang &amp; Export</b> gibt es Link, QR-Code und eine Kurzanleitung fürs Team, und «Als Team ansehen» zeigt, was das Team sieht."),
    ].join(""));
  };

  document.getElementById("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (!b) return; document.body.classList.remove("nav-open"); if (b.dataset.act === "disp") showDisplay(); else setAsTeam(true); });
