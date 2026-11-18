  // =====================================================================
  // Runde 5, Teil 2: Aufgaben
  // Datum in Worten, mehrere Aufgaben auf einmal, Duplikate erkennen und zusammenführen, Erwähnung → Aufgabe,
  // Notiz beim Erledigen, «Später erinnern», erledigte einklappen, nach Person gruppieren, «Meine» sortieren
  // und eigene Reihenfolge, Checkliste in der Liste, Checklisten-Punkte für mich, Vorschau, Ressort-Farbpunkt,
  // Link zur Aufgabe, langes Drücken, Ctrl+K erstellen, Ctrl+Z
  // =====================================================================
  const kannTasks = () => isLaLei() && !isReadOnly() && !isClosed() && !state.asTeam;
  const RESS_FARBEN = ["#3b5fa8", "#2f7a4f", "#b0592b", "#7a4e9c", "#1c7a8a", "#9c3f5c", "#8a7a1c", "#5a6b8a", "#c0392b", "#16806b"];
  function ressDot(name) { const i = ressorts().findIndex((r) => r.name === name); return i < 0 ? "" : `<i class="rdot" style="--rd:${RESS_FARBEN[i % RESS_FARBEN.length]}" aria-hidden="true"></i>`; }

  // ---------- Datum in Worten ----------
  const WTAGE = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
  const MONATE = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
  function wortDatum(s) {
    const t = today(); const add = (n) => iso(new Date(t.getTime() + n * DAY)); const d = cfg().dates || {}; const lager = d.start || d.prep;
    const regeln = [
      [/\s(?:bis\s+)?(?:am\s+)?übermorgen(?=[\s.,;])/i, () => add(2)],
      [/\s(?:bis\s+)?(?:am\s+)?morgen(?=[\s.,;])/i, () => add(1)],
      [/\s(?:bis\s+)?heute(?=[\s.,;])/i, () => add(0)],
      [/\s(?:bis\s+)?(?:in\s+)?(\d{1,2})\s+(tag|tagen|woche|wochen|monat|monaten)(?=[\s.,;])/i, (m) => { const n = +m[1]; const u = m[2].toLowerCase(); if (u.startsWith("tag")) return add(n); if (u.startsWith("woche")) return add(n * 7); const x = new Date(t); x.setMonth(x.getMonth() + n); return iso(x); }],
      [/\s(?:bis\s+)?(\d{1,2})\s+(tage|wochen)\s+vor\s+(?:dem\s+)?lager(?:beginn)?(?=[\s.,;])/i, (m) => (lager ? addDays(lager, -(+m[1]) * (m[2].toLowerCase().startsWith("woche") ? 7 : 1)) : "")],
      [/\s(?:bis\s+)?vor\s+(?:dem\s+)?lager(?=[\s.,;])/i, () => (d.prep ? addDays(d.prep, -1) : lager ? addDays(lager, -1) : "")],
      [/\s(?:bis\s+)?ende\s+(?:dieser\s+|der\s+)?woche(?=[\s.,;])/i, () => add((5 - t.getDay() + 7) % 7 || 7)],
      [/\s(?:bis\s+)?nächste\s+woche(?=[\s.,;])/i, () => add(((5 - t.getDay() + 7) % 7 || 7) + 7)],
      [/\s(?:bis\s+)?ende\s+(?:des\s+)?monats?(?=[\s.,;])/i, () => iso(new Date(t.getFullYear(), t.getMonth() + 1, 0))],
      [new RegExp(`\\s(?:bis\\s+)?(anfang|mitte|ende)\\s+(${MONATE.join("|")})(?=[\\s.,;])`, "i"), (m) => { const mo = MONATE.indexOf(m[2].toLowerCase()); let y = t.getFullYear(); const tag = m[1].toLowerCase() === "anfang" ? 1 : m[1].toLowerCase() === "mitte" ? 15 : 0; let x = tag ? new Date(y, mo, tag) : new Date(y, mo + 1, 0); if (x < t) x = tag ? new Date(y + 1, mo, tag) : new Date(y + 1, mo + 1, 0); return iso(x); }],
      [new RegExp(`\\s(?:bis\\s+)?(?:am\\s+)?(?:nächsten\\s+|kommenden\\s+)?(${WTAGE.join("|")})(?=[\\s.,;])`, "i"), (m) => { const wd = WTAGE.indexOf(m[1].toLowerCase()); return add((wd - t.getDay() + 7) % 7 || 7); }],
    ];
    for (const [re, fn] of regeln) { const m = s.match(re); if (m) { const v = fn(m); if (v) return { date: v, rest: s.replace(m[0], " ") }; } }
    return null;
  }
  const parseQuickOrig5 = parseQuick;
  parseQuick = function (s) {
    const q = parseQuickOrig5(s); if (q.deadline) return q;
    const w = wortDatum(" " + q.title + " "); if (w) { q.deadline = w.date; q.title = w.rest.replace(/\s+/g, " ").trim(); }
    return q;
  };

  // ---------- Duplikate erkennen ----------
  const wortListe = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((w) => w.length > 2);
  function aehnlich(a, b) { const x = new Set(wortListe(a)), y = new Set(wortListe(b)); if (!x.size || !y.size) return 0; let n = 0; for (const w of x) if (y.has(w)) n++; return n / Math.min(x.size, y.size) * (Math.min(x.size, y.size) / Math.max(x.size, y.size)) ** 0.25; }
  const duplikatVon = (titel, ohne) => allTasks().filter((t) => t._id !== ohne && t.status !== "Erledigt").map((t) => [t, aehnlich(titel, t.title)]).filter(([, s]) => s >= 0.75).sort((a, b) => b[1] - a[1]).map(([t]) => t)[0];
  function duplikatFrage(t, weiter) {
    const o = modal(`<div class="lg-head"><span class="eyebrow">Gibt es schon?</span><h2>Ähnliche Aufgabe gefunden</h2></div>
      <button class="st-row dup-row" data-dup-open="${esc(t._id)}"><span class="st-t">${esc(t.title)}<small>${ressDot(t.ressort)}${esc(t.ressort)}${t.owner ? " · " + esc(t.owner) : ""}${t.deadline ? " · " + fmt(t.deadline) : ""}</small></span><span class="st-go">›</span></button>
      <div class="lg-foot"><button class="link" data-dup-no>Abbrechen</button><span class="btn-group"><button class="btn" data-dup-open="${esc(t._id)}">Diese öffnen</button><button class="btn primary" data-dup-yes>Trotzdem erfassen</button></span></div>`);
    o.onclick = (e) => { if (e.target === o || e.target.closest("[data-dup-no]")) return closeDrawer(); const op = e.target.closest("[data-dup-open]"); if (op) { closeDrawer(); return openTask(op.dataset.dupOpen); } if (e.target.closest("[data-dup-yes]")) { closeDrawer(); weiter(); } };
  }
  // Schnellerfassung: Duplikat prüfen, mehrere Zeilen auf einmal
  const quickAddOrig5 = quickAdd;
  quickAdd = async function () {
    const inp = $("#qt"); if (!inp) return quickAddOrig5(); const q = parseQuick(inp.value); if (!q.title) return inp.focus();
    const d = duplikatVon(q.title); if (d) return duplikatFrage(d, () => quickAddOrig5());
    return quickAddOrig5();
  };
  document.addEventListener("paste", (e) => {
    const inp = e.target; if (!inp || inp.id !== "qt") return;
    const txt = (e.clipboardData || window.clipboardData).getData("text") || ""; const zeilen = txt.split(/\r?\n/).map((z) => z.replace(/^[\s\-–•*\d.)]+/, "").trim()).filter(Boolean);
    if (zeilen.length < 2) return; e.preventDefault(); mehrereErfassen(zeilen);
  });
  function mehrereErfassen(zeilen) {
    const fr = state.filter.ressort.split("|")[0]; const items = zeilen.map((z) => parseQuick(z));
    const o = modal(`<div class="lg-head"><span class="eyebrow">Mehrere Aufgaben</span><h2>${items.length} Aufgaben erfassen</h2></div>
      <div class="multi-list">${items.map((q, i) => { const d = duplikatVon(q.title); return `<label class="multi-row"><input type="checkbox" data-mi="${i}" ${d ? "" : "checked"}><span>${esc(q.title)}${q.owner ? ` <span class="muted">· ${esc(q.owner)}</span>` : ""}${q.deadline ? ` <span class="muted">· ${fmt(q.deadline)}</span>` : ""}${d ? ` <span class="tag plain">gibt es schon</span>` : ""}</span></label>`; }).join("")}</div>
      <label class="field"><span>Ressort (wenn in der Zeile keines steht)</span><select id="mi-ress" class="input">${ressorts().map((r) => `<option ${r.name === fr ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label>
      <div class="lg-foot"><button class="link" data-mi-no>Abbrechen</button><button class="btn primary" data-mi-go>Erfassen</button></div>`);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-mi-no]")) return closeDrawer(); if (!e.target.closest("[data-mi-go]")) return;
      const r = $("#mi-ress", o).value; const now = nowStamp(); const gew = [...o.querySelectorAll("[data-mi]:checked")].map((c) => items[+c.dataset.mi]);
      const ops = gew.map((q, i) => ({ op: "set", coll: "tasks", id: state.db.newId(), data: { title: q.title, ressort: q.ressort || r, teil: q.teil || "", owner: q.owner || "", support: "", deadline: q.deadline || "", status: "Offen", note: "", checklist: [], links: [], order: Date.now() + i, createdAt: now, updatedAt: now, updatedBy: me(), log: [{ at: now, by: me(), text: "Aufgabe erfasst (mehrere auf einmal)" }] } }));
      if (!ops.length) return closeDrawer();
      try { await state.db.batch(ops); closeDrawer(); const inp = $("#qt"); if (inp) { inp.value = ""; quickPreview(); } toastAction(`${ops.length} Aufgaben erfasst`, "Rückgängig", () => state.db.batch(ops.map((x) => ({ op: "delete", coll: "tasks", id: x.id })))); } catch (err) { handleWriteError(err); }
    };
  }
  // Neue Aufgabe im Fenster: Duplikat prüfen; bestehende Aufgabe: Duplikat zusammenführen
  const renderDrawerOrig5 = renderDrawer;
  renderDrawer = function () {
    renderDrawerOrig5(); const o = $(".overlay"); if (!o || !openTaskId) return;
    if (openTaskId === "_new") {
      const sv = $("#d-save", o); if (sv) sv.addEventListener("click", (e) => { if (sv.dataset.dupOk) return; const d = duplikatVon($("#d-title", o).value); if (!d) return; e.stopImmediatePropagation(); e.preventDefault(); duplikatFrageImFenster(d, sv); }, true);
      return;
    }
    const t = state.tasks.get(openTaskId); if (!t) return; const d = duplikatVon(t.title, t._id);
    const kopf = $(".drawer-head > div", o);
    if (kopf && !$(".link-copy", o)) kopf.insertAdjacentHTML("beforeend", `<div class="d-kleinlinks">${d && kannTasks() ? `<button class="link dup-merge" data-merge="${esc(d._id)}">Ähnlich: «${esc(d.title.slice(0, 40))}» · zusammenführen</button>` : ""}<button class="link link-copy" data-copy-link="${esc(t._id)}" title="Link zu dieser Aufgabe kopieren">Link kopieren</button>${kannTasks() ? `<button class="link" data-snooze="${esc(t._id)}">${t.snooze && t.snooze > iso(today()) ? "Erinnert ab " + fmt(t.snooze) : "Später erinnern"}</button>` : ""}</div>`);
  };
  function duplikatFrageImFenster(d, sv) {
    const box = $(".overlay .drawer-body"); const alt = $("#dup-warn"); if (alt) alt.remove();
    box.insertAdjacentHTML("afterbegin", `<div class="conflict-note" id="dup-warn">Eine ähnliche Aufgabe gibt es schon: <button class="link" data-open="${esc(d._id)}">«${esc(d.title)}»</button>. Nochmals «Erfassen» legt sie trotzdem an.</div>`);
    sv.dataset.dupOk = "1"; box.scrollTop = 0; $("#dup-warn [data-open]").onclick = () => openTask(d._id);
  }
  async function zusammenfuehren(behalten, weg) {
    const a = state.tasks.get(behalten), b = state.tasks.get(weg); if (!a || !b) return;
    const ck = [...(a.checklist || [])]; for (const c of b.checklist || []) if (!ck.some((x) => x.t === c.t)) ck.push(c);
    const links = [...(a.links || [])]; for (const l of b.links || []) if (!links.some((x) => x.url === l.url)) links.push(l);
    const note = [a.note, b.note && b.note !== a.note ? `Aus «${b.title}»: ${b.note}` : ""].filter(Boolean).join("\n\n");
    const deadline = [a.deadline, b.deadline].filter(Boolean).sort()[0] || "";
    await writeTask(a._id, { checklist: ck, links, note, deadline, owner: a.owner || b.owner || "", star: !!(a.star || b.star) }, `Zusammengeführt mit «${b.title}»`);
    await trash([{ coll: "tasks", id: b._id }], b.title);
  }
  document.addEventListener("click", async (e) => {
    const m = e.target.closest && e.target.closest("[data-merge]"); if (m) { const other = m.dataset.merge; const t = state.tasks.get(openTaskId); if (!t || !confirm(`«${state.tasks.get(other).title}» in diese Aufgabe übernehmen? Checkliste, Links und Bemerkung werden zusammengelegt, die andere kommt in den Papierkorb.`)) return; await zusammenfuehren(t._id, other); renderDrawer(); return; }
    const cl = e.target.closest && e.target.closest("[data-copy-link]"); if (cl) { linkKopieren(cl.dataset.copyLink); return; }
    const sz = e.target.closest && e.target.closest("[data-snooze]"); if (sz) { spaeterErinnern(sz.dataset.snooze); return; }
  });

  // ---------- Link zur Aufgabe ----------
  function linkKopieren(id) { const u = location.origin + location.pathname + "#aufgabe=" + id; copyText(u); toast("Link kopiert"); }
  function linkOeffnen() { const m = location.hash.match(/^#aufgabe=([\w-]+)/); if (m && state.lagerId && state.tasks.has(m[1])) { openTask(m[1]); try { history.replaceState(history.state, "", "#" + (state.view || "")); } catch {} } }
  window.addEventListener("hashchange", linkOeffnen);
  const openLagerOrigLink = openLager;
  openLager = async function (id) { const h = location.hash; const r = await openLagerOrigLink(id); if (/^#aufgabe=/.test(h)) { try { history.replaceState(history.state, "", h); } catch {} setTimeout(linkOeffnen, 1200); } return r; };

  // ---------- Später erinnern ----------
  function spaeterErinnern(id) {
    const t = state.tasks.get(id); if (!t) return; const t0 = iso(today());
    const wahl = [["Morgen", addDays(t0, 1)], ["In 3 Tagen", addDays(t0, 3)], ["Nächste Woche", addDays(t0, 7)], ["In 2 Wochen", addDays(t0, 14)]];
    const o = modal(`<div class="lg-head"><span class="eyebrow">Später erinnern</span><h2>${esc(t.title)}</h2></div><p class="muted" style="margin:0">Bis dahin erscheint die Aufgabe nicht in der Glocke und nicht auf dem Start.</p>
      <div class="snooze-wahl">${wahl.map(([l, v]) => `<button class="btn" data-sz="${v}">${l}<small>${fmt(v)}</small></button>`).join("")}</div><input type="date" id="sz-datum" class="input" aria-label="Eigenes Datum">
      <div class="lg-foot">${t.snooze ? '<button class="link" data-sz="">Nicht mehr verschieben</button>' : "<span></span>"}<span class="btn-group"><button class="btn" data-sz-no>Abbrechen</button><button class="btn primary" data-sz-eigen>Datum übernehmen</button></span></div>`);
    o.onclick = (e) => { if (e.target === o || e.target.closest("[data-sz-no]")) return closeDrawer(); const b = e.target.closest("[data-sz]"); const eig = e.target.closest("[data-sz-eigen]"); const v = b ? b.dataset.sz : eig ? $("#sz-datum", o).value : null; if (v === null || (eig && !v)) return;
      closeDrawer(); writeTask(id, { snooze: v, _still: true }, v ? `Erinnert ab ${fmtFull(v)}` : "Erinnerung wieder normal").then(() => toast(v ? `Bis ${fmt(v)} ausgeblendet` : "Wieder normal")); };
  }

  // ---------- Notiz beim Erledigen ----------
  function toast2(msg, knoepfe) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const el = document.createElement("div"); el.className = "toast toast2"; el.innerHTML = `<span>${esc(msg)}</span>${knoepfe.map(([l], i) => `<button class="link" data-t2="${i}">${esc(l)}</button>`).join("")}`;
    el.onclick = (e) => { const b = e.target.closest("[data-t2]"); if (!b) return; el.remove(); knoepfe[+b.dataset.t2][1](); };
    document.body.appendChild(el); setTimeout(() => el.remove(), 7000);
  }
  const writeTaskOrig5 = writeTask;
  writeTask = async function (id, patch, logText) {
    const vorher = state.tasks.get(id); const warErl = vorher && vorher.status === "Erledigt"; const prev = vorher ? JSON.parse(JSON.stringify(vorher)) : null;
    await writeTaskOrig5(id, patch, logText);
    if (prev && patch && patch.status === "Erledigt" && !warErl && !patch._still) setTimeout(() => toast2(`Erledigt · ${prev.title.slice(0, 32)}`, [["Notiz dazu", () => erledigtNotiz(id)], ["Rückgängig", () => { delete prev._id; state.db.batch([{ op: "set", coll: "tasks", id, data: prev }]).then(() => toast("Rückgängig gemacht")); }]]), 90);
  };
  function erledigtNotiz(id) {
    const t = state.tasks.get(id); if (!t) return;
    const o = modal(`<div class="lg-head"><span class="eyebrow">Notiz zum Erledigen</span><h2>${esc(t.title)}</h2></div><textarea id="en-text" rows="3" data-mention placeholder="z.B. Offerte Car Meier, 1200.–"></textarea><div class="lg-foot"><button class="link" data-en-no>Abbrechen</button><button class="btn primary" data-en-ok>Speichern</button></div>`);
    setTimeout(() => $("#en-text", o).focus(), 30);
    o.onclick = (e) => { if (e.target === o || e.target.closest("[data-en-no]")) return closeDrawer(); if (!e.target.closest("[data-en-ok]")) return; const v = $("#en-text", o).value.trim(); closeDrawer(); if (v) writeTask(id, { _still: true }, "✓ " + v).then(() => toast("Notiz gespeichert")); };
  }

  // ---------- Erwähnung → Aufgabe: Name und Datum übernehmen ----------
  view.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ment-task]"); if (!b) return; e.stopPropagation(); e.stopImmediatePropagation();
    const h = mentHits[+b.dataset.mentTask]; if (!h) return; const q = parseQuick(h.text.replace(/@(alle|lalei)\b/gi, ""));
    openTask("_new", { title: q.title.slice(0, 140) || h.text.slice(0, 140), owner: q.owner || me(), deadline: q.deadline || "", ...(q.ressort ? { ressort: q.ressort, teil: q.teil } : {}), note: `Aus «${h.title}» (${fmtFull(h.date)}):\n${h.text}`, ...(h.entry ? { source: { entry: h.entry, label: `${h.title} (${fmtFull(h.date)})` } } : {}) });
  }, true);

  // ---------- Aufgabenliste: erledigte einklappen, Checkliste aufklappen, Ansicht «Personen» ----------
  state.offeneGrp = state.offeneGrp || new Set();
  function erledigteEinklappen(box) {
    if (!box) return;
    box.querySelectorAll("tr.grp").forEach((g, gi) => {
      const rows = []; let n = g.nextElementSibling; while (n && !n.classList.contains("grp")) { if (n.classList.contains("task") && n.classList.contains("done")) rows.push(n); n = n.nextElementSibling; }
      if (!rows.length) return; const key = (g.textContent || "").slice(0, 40) + gi; const offen = state.offeneGrp.has(key);
      rows.forEach((r) => (r.hidden = !offen));
      const letzte = rows[rows.length - 1]; letzte.insertAdjacentHTML("afterend", `<tr class="erl-toggle"><td colspan="4"><button class="link" data-erl-grp="${esc(key)}">${offen ? "Erledigte ausblenden" : `✓ ${rows.length} erledigt`}</button></td></tr>`);
    });
  }
  view.addEventListener("click", (e) => { const b = e.target.closest("[data-erl-grp]"); if (!b) return; const k = b.dataset.erlGrp; state.offeneGrp.has(k) ? state.offeneGrp.delete(k) : state.offeneGrp.add(k); views[state.view] && views[state.view].update(); });
  function checklistenKnoepfe(box) {
    if (!box) return;
    box.querySelectorAll("tr.task").forEach((tr) => {
      const id = ((tr.querySelector(".t-title[data-open]") || {}).dataset || {}).open; const t = id && state.tasks.get(id); if (!t || !(t.checklist || []).length) return;
      const span = [...tr.querySelectorAll(".t-meta > span")].find((s) => /^☑ \d+\/\d+$/.test(s.textContent.trim())); if (!span) return;
      span.innerHTML = `<button class="link ck-toggle" data-ck-open="${esc(id)}" aria-expanded="${state.ckOffen === id}">${span.textContent.trim()} ▾</button>`;
      if (state.ckOffen === id) tr.querySelector(".c-main").insertAdjacentHTML("beforeend", `<div class="ck-inline">${t.checklist.map((c, i) => `<label class="check-item ${c.done ? "done" : ""}"><input type="checkbox" data-ck-inl="${esc(id)}|${i}" ${c.done ? "checked" : ""} ${kannTasks() ? "" : "disabled"}><span class="rich">${rich(c.t)}</span></label>`).join("")}</div>`);
    });
  }
  view.addEventListener("click", (e) => { const b = e.target.closest("[data-ck-open]"); if (!b) return; e.stopPropagation(); state.ckOffen = state.ckOffen === b.dataset.ckOpen ? null : b.dataset.ckOpen; views[state.view] && views[state.view].update(); }, true);
  view.addEventListener("change", (e) => { const c = e.target.closest("[data-ck-inl]"); if (!c) return; const [id, i] = c.dataset.ckInl.split("|"); const t = state.tasks.get(id); if (!t) return; const arr = t.checklist.map((x) => ({ ...x })); arr[+i].done = c.checked; writeTask(id, { checklist: arr, _still: true }); });
  function personenAnsicht(list) {
    const gruppen = new Map(); for (const t of list) { const k = t.owner || ""; if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(t); }
    const keys = [...gruppen.keys()].sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1) || a.localeCompare(b));
    return keys.map((k) => `<div class="pers-grp"><div class="pers-head">${k ? av(k) + `<b>${esc(k)}</b>` : "<b>Nicht zugeteilt</b>"}<span class="muted">${gruppen.get(k).length}</span></div>${taskTable(gruppen.get(k), { flat: true })}</div>`).join("") || `<div class="empty"><b>Keine Aufgaben</b></div>`;
  }
  const tasksShellOrig5 = views.tasks.shell;
  views.tasks.shell = () => tasksShellOrig5().replace('<button type="button" data-tview="kanban"', `<button type="button" data-tview="person" aria-pressed="${state.taskView === "person"}">Personen</button><button type="button" data-tview="kanban"`);
  const tasksUpdateOrig5 = views.tasks.update;
  views.tasks.update = function () {
    tasksUpdateOrig5(); const box = $("#task-list"); if (!box) return;
    if (state.taskView === "person") box.innerHTML = personenAnsicht(gefilterteAufgaben());
    erledigteEinklappen(box); checklistenKnoepfe(box);
  };

  // ---------- Meine Aufgaben: sortieren, eigene Reihenfolge, Checklisten-Punkte für mich ----------
  const SORT = { deadline: "Deadline", ressort: "Ressort", wichtig: "Wichtig zuerst", eigen: "Eigene Reihenfolge" };
  state.mineSort = store.get("lalei-mine-sort") || "deadline";
  const meineOrdnung = () => ((state.todos || {}).myOrder || []);
  const mineUpdateOrig5 = views.mine.update;
  views.mine.update = function () {
    mineUpdateOrig5(); const n = me(); const box = $("#mine-list"); if (!box) return;
    const bar = box.previousElementSibling; if (bar && !$("#mine-sort", bar)) bar.insertAdjacentHTML("beforeend", `<select id="mine-sort" class="input" aria-label="Sortieren">${Object.entries(SORT).map(([k, l]) => `<option value="${k}" ${k === state.mineSort ? "selected" : ""}>${l}</option>`).join("")}</select>`);
    let list = allTasks().filter((t) => (t.owner === n || t.support === n) && (!state.filter.open || t.status !== "Erledigt"));
    if (state.mineSort !== "deadline" && list.length) {
      if (state.mineSort === "ressort") { const o = (x) => ressorts().findIndex((r) => r.name === x.ressort); list.sort((a, b) => o(a) - o(b) || (a.deadline || "9").localeCompare(b.deadline || "9")); }
      if (state.mineSort === "wichtig") list.sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || (isLate(b) ? 1 : 0) - (isLate(a) ? 1 : 0) || (a.deadline || "9").localeCompare(b.deadline || "9"));
      if (state.mineSort === "eigen") { const ord = meineOrdnung(); const pos = (t) => { const i = ord.indexOf(t._id); return i < 0 ? 1e6 : i; }; list.sort((a, b) => pos(a) - pos(b) || (a.deadline || "9").localeCompare(b.deadline || "9")); }
      box.innerHTML = taskTable(list, { flat: true, roleFor: n });
      if (state.mineSort === "eigen" && kannTasks()) box.querySelectorAll("tr.task").forEach((tr) => { tr.draggable = true; tr.classList.add("ziehbar"); });
    }
    checklistenKnoepfe(box);
    // Checklisten-Punkte, die mir zugeteilt sind (@Name im Punkt)
    const punkte = []; for (const t of state.tasks.values()) (t.checklist || []).forEach((c, i) => { if (!c.done && mentions(c.t, n) && t.owner !== n) punkte.push({ t, c, i }); });
    const alt = $("#mine-ck"); if (alt) alt.remove();
    if (punkte.length) box.insertAdjacentHTML("beforebegin", `<div id="mine-ck" class="mine-ck"><div class="sec-label">Checklisten-Punkte für dich</div>${punkte.map(({ t, c, i }) => { const q = parseQuick(c.t); return `<label class="check-item"><input type="checkbox" data-ck-inl="${esc(t._id)}|${i}" ${kannTasks() ? "" : "disabled"}><span><span class="rich">${rich(c.t)}</span> <button class="link" data-open="${esc(t._id)}" style="font-size:12px">${esc(t.title.slice(0, 40))}</button>${q.deadline ? ` <span class="muted" style="font-size:12px">· ${relDay(q.deadline)}</span>` : ""}</span></label>`; }).join("")}</div>`);
  };
  view.addEventListener("change", (e) => { if (e.target.id !== "mine-sort") return; state.mineSort = e.target.value; store.set("lalei-mine-sort", state.mineSort); views.mine.update(); });
  let zieheId = null;
  view.addEventListener("dragstart", (e) => { const tr = e.target.closest && e.target.closest("#mine-list tr.ziehbar"); if (!tr) return; zieheId = ((tr.querySelector(".t-title[data-open]") || {}).dataset || {}).open; tr.classList.add("dragging"); });
  view.addEventListener("dragover", (e) => { const tr = zieheId && e.target.closest && e.target.closest("#mine-list tr.ziehbar"); if (!tr) return; e.preventDefault(); document.querySelectorAll("#mine-list tr.drop-vor").forEach((x) => x.classList.remove("drop-vor")); tr.classList.add("drop-vor"); });
  view.addEventListener("drop", (e) => {
    const tr = zieheId && e.target.closest && e.target.closest("#mine-list tr.ziehbar"); if (!tr) return; e.preventDefault();
    const ziel = ((tr.querySelector(".t-title[data-open]") || {}).dataset || {}).open; const ids = [...document.querySelectorAll("#mine-list tr.ziehbar .t-title[data-open]")].map((b) => b.dataset.open).filter((x) => x !== zieheId);
    ids.splice(ids.indexOf(ziel), 0, zieheId); zieheId = null;
    state.todos = { ...(state.todos || {}), myOrder: ids }; views.mine.update();
    state.db.doc("todos/" + myId()).set({ ...(state.todos || {}), items: todoItems(), myOrder: ids, updatedAt: nowStamp() }).catch(handleWriteError);
  });
  view.addEventListener("dragend", () => { zieheId = null; document.querySelectorAll(".drop-vor, tr.dragging").forEach((x) => x.classList.remove("drop-vor", "dragging")); });

  // ---------- Vorschau beim Darüberfahren (PC) ----------
  let vsTimer = null; const vs = document.createElement("div"); vs.className = "task-vorschau"; vs.hidden = true; document.body.appendChild(vs);
  document.addEventListener("mouseover", (e) => {
    if (!matchMedia("(hover: hover)").matches) return; const b = e.target.closest && e.target.closest("#view .t-title[data-open], #view .kb-card[data-open], #view .st-row[data-open]");
    clearTimeout(vsTimer); if (!b) { vs.hidden = true; return; }
    vsTimer = setTimeout(() => {
      const t = state.tasks.get(b.dataset.open); if (!t || (!t.note && !(t.checklist || []).length)) return;
      const ck = t.checklist || []; vs.innerHTML = `${t.note ? `<div class="rich">${rich(t.note.slice(0, 400))}${t.note.length > 400 ? " …" : ""}</div>` : ""}${ck.length ? `<div class="vs-ck">${ck.slice(0, 6).map((c) => `<div class="${c.done ? "done" : ""}">${c.done ? "☑" : "☐"} ${esc(c.t)}</div>`).join("")}${ck.length > 6 ? `<div class="muted">… ${ck.length - 6} weitere</div>` : ""}</div>` : ""}`;
      const r = b.getBoundingClientRect(); vs.hidden = false; vs.style.left = Math.min(r.left, window.innerWidth - 380) + "px"; vs.style.top = (r.bottom + 6 + vs.offsetHeight < window.innerHeight ? r.bottom + 6 : r.top - vs.offsetHeight - 6) + "px";
    }, 550);
  });
  document.addEventListener("scroll", () => { vs.hidden = true; }, true);

  // ---------- Langes Drücken (Handy): Schnellmenü ----------
  let lp = null, lpAus = 0;
  document.addEventListener("touchstart", (e) => {
    const el = e.target.closest && e.target.closest("#view tr.task, #view .kb-card, #view .st-row[data-open]"); if (!el || e.touches.length !== 1) return;
    const id = el.dataset.open || ((el.querySelector("[data-open]") || {}).dataset || {}).open; if (!id || !state.tasks.has(id)) return;
    const x = e.touches[0].clientX, y = e.touches[0].clientY;
    lp = { id, x, y, t: setTimeout(() => { lp = null; lpAus = Date.now(); if (navigator.vibrate) navigator.vibrate(15); schnellMenue(id); }, 550) };
  }, { passive: true });
  document.addEventListener("touchmove", (e) => { if (lp && (Math.abs(e.touches[0].clientX - lp.x) > 10 || Math.abs(e.touches[0].clientY - lp.y) > 10)) { clearTimeout(lp.t); lp = null; } }, { passive: true });
  document.addEventListener("touchend", () => { if (lp) { clearTimeout(lp.t); lp = null; } });
  document.addEventListener("click", (e) => { if (Date.now() - lpAus < 600) { e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener("contextmenu", (e) => { if (Date.now() - lpAus < 800) e.preventDefault(); });
  function schnellMenue(id) {
    const t = state.tasks.get(id); if (!t) return; const kann = kannTasks(); const erl = t.status === "Erledigt";
    const o = modal(`<div class="lg-head"><span class="eyebrow">${esc(t.ressort)}</span><h2>${esc(t.title)}</h2></div><div class="sm-liste">
      ${kann ? `<button data-sm="done">${erl ? "Wieder öffnen" : "Erledigt"}</button>${t.owner !== me() ? '<button data-sm="mir">Mir zuteilen</button>' : ""}${t.deadline ? '<button data-sm="w">Deadline +1 Woche</button>' : ""}<button data-sm="snooze">Später erinnern</button>` : ""}
      <button data-sm="open">Öffnen</button><button data-sm="link">Link kopieren</button>${kann ? '<button data-sm="del" class="danger">Löschen</button>' : ""}</div>`, "schnellmenue");
    o.onclick = async (e) => {
      if (e.target === o) return closeDrawer(); const b = e.target.closest("[data-sm]"); if (!b) return; const a = b.dataset.sm; closeDrawer();
      if (a === "done") return setStatus(id, erl ? "Offen" : "Erledigt"); if (a === "mir") return writeTask(id, { owner: me() }, `${me()} übernimmt`);
      if (a === "w") return writeTask(id, { deadline: addDays(t.deadline, 7) }, `Deadline: ${fmtFull(addDays(t.deadline, 7))}`); if (a === "snooze") return spaeterErinnern(id);
      if (a === "open") return openTask(id); if (a === "link") return linkKopieren(id);
      if (a === "del") { if (confirm(`«${t.title}» löschen?`)) trash([{ coll: "tasks", id }], t.title); }
    };
  }

  // ---------- Ctrl+K: Aufgabe direkt erstellen ----------
  let cmdkQ = null;
  const befehleOrig5 = befehle;
  befehle = function (q) {
    const out = befehleOrig5(q); const s = String(q || "").trim();
    if (s.length >= 3 && kannTasks()) { const p = parseQuick(s); out.unshift({ g: "Erstellen", l: `Neue Aufgabe: ${p.title}`, s: [p.owner, p.deadline ? fmt(p.deadline) : "", p.ressort].filter(Boolean).join(" · "), attr: `data-cmd="task" data-cmdq="1"` }); }
    return out;
  };
  const merkeCmdk = (row) => { cmdkQ = row && row.dataset.cmdq ? ($(".cmdk-q") || {}).value || null : null; };
  document.addEventListener("click", (e) => { const r = e.target.closest && e.target.closest(".cmdk-row"); if (r) merkeCmdk(r); }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && $(".cmdk")) merkeCmdk($(".cmdk-row.on")); }, true);
  const openTaskOrig5 = openTask;
  openTask = function (id, prefill) { if (id === "_new" && !prefill && cmdkQ) { const p = parseQuick(cmdkQ); cmdkQ = null; prefill = { title: p.title, owner: p.owner, deadline: p.deadline, ...(p.ressort ? { ressort: p.ressort, teil: p.teil } : {}) }; } cmdkQ = null; return openTaskOrig5(id, prefill); };

  // ---------- Ctrl+Z: letzte Änderung rückgängig ----------
  let letztesUndo = null;
  const toastActionOrig5 = toastAction;
  toastAction = function (msg, btn, fn) { if (/Rückgängig/.test(btn)) letztesUndo = { fn, at: Date.now() }; return toastActionOrig5(msg, btn, () => { letztesUndo = null; fn(); }); };
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
    const a = document.activeElement; if (a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)) return;
    if (!letztesUndo || Date.now() - letztesUndo.at > 5 * 60 * 1000) return toast("Nichts zum Rückgängigmachen");
    e.preventDefault(); const u = letztesUndo; letztesUndo = null; document.querySelectorAll(".toast").forEach((t) => t.remove()); u.fn();
  });
