  // =====================================================================
  // Etappe 2a: Aufgaben – Verantwortlich automatisch, «Nächster Höck», Rückgängig, frühere Fassungen,
  // Mehrfachauswahl, Kanban, gespeicherte Ansichten, «Ich übernehme», Abhängigkeiten, Zeitplan ziehen
  // =====================================================================
  STATUSES.splice(STATUSES.indexOf("Erledigt"), 0, "Nächster Höck");
  Object.assign(ERR, { TEXT_FEHLT: "Bitte einen Text eingeben." });
  const cloneDoc = (x) => (x ? JSON.parse(JSON.stringify(x)) : null);
  const docOhneId = (x) => { const c = cloneDoc(x); if (c) delete c._id; return c; };

  // ---------- Verantwortlich automatisch: Leitung von Teilbereich bzw. Ressort ----------
  function leadOf(ressortName, teil) {
    const r = ressortByName(ressortName); if (!r) return "";
    if (teil) { const s = subsOf(r).find((x) => x.name === teil); if (s && s.lead) return s.lead; }
    return r.lead || "";
  }
  // Aufgaben ohne von Hand gesetzte Verantwortliche bekommen die aktuelle Leitung
  function autoOwnerOps(match) {
    const ops = [];
    for (const t of state.tasks.values()) {
      if (t.ownerManual || t.status === "Erledigt" || !match(t)) continue;
      const lead = leadOf(t.ressort, t.teil); if (lead && t.owner !== lead && (!t.owner || t.owner === match.alt)) ops.push({ op: "update", coll: "tasks", id: t._id, data: { owner: lead } });
    }
    return ops;
  }
  // Leitung geändert: bisherige automatische Zuteilungen nachziehen
  view.addEventListener("change", (e) => {
    const m = (e.target.dataset.cfg || "").match(/^ressorts\.([^.]+)(?:\.subs\.([^.]+))?\.lead$/); if (!m || !isLaLei()) return;
    const r = (cfg().ressorts || {})[m[1]]; if (!r) return; const alt = m[2] ? ((r.subs || {})[m[2]] || {}).lead || "" : r.lead || "";
    const subName = m[2] ? ((r.subs || {})[m[2]] || {}).name : null;
    setTimeout(() => {
      const match = (t) => t.ressort === r.name && (subName ? t.teil === subName : !t.teil || !leadOfSub(r, t.teil));
      match.alt = alt; const ops = autoOwnerOps(match);
      if (ops.length) state.db.batch(ops).then(() => toast(`${ops.length} Aufgaben gehen jetzt an ${e.target.value || "niemand"}`)).catch(handleWriteError);
    }, 900);
  }, true);
  const leadOfSub = (r, teil) => { const s = subsOf(r).find((x) => x.name === teil); return s && s.lead; };
  // Aufgaben ohne Verantwortliche (schnell erfasst, eingefügt, aus Vorlage …) an die Leitung geben
  let autoOwnerLast = 0;
  function autoOwnerErstmals() {
    if (!isLaLei() || isReadOnly() || isClosed() || state.asTeam || !state.loaded.tasks || !state.config || Date.now() - autoOwnerLast < 20000) return;
    autoOwnerLast = Date.now();
    const match = () => true; match.alt = ""; const ops = autoOwnerOps(match).filter((x) => !(state.tasks.get(x.id) || {}).owner);
    if (ops.length) state.db.batch(ops).catch(() => {});
  }

  // ---------- Rückgängig ----------
  // docs: [{coll, id, prev}] – prev = Stand vorher (null = gab es nicht)
  function undoable(label, docs) {
    if (!docs.length) return;
    toastAction(label, "Rückgängig", () => state.db.batch(docs.map((d) => (d.prev ? { op: "set", coll: d.coll, id: d.id, data: d.prev } : { op: "delete", coll: d.coll, id: d.id }))).then(() => toast("Rückgängig gemacht")).catch(handleWriteError));
  }

  // ---------- Frühere Fassungen ----------
  state.versions = state.versions || [];
  const versionsOf = (coll, id) => (state.versions || []).filter((v) => v.coll === coll && v.docId === id).sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  // vorherigen Stand als Fassung sichern (höchstens 10 pro Eintrag)
  function versionOps(coll, id, prev) {
    if (!prev || !isLaLei()) return [];
    const data = docOhneId(prev); const json = JSON.stringify(data); if (json.length > 45000) return [];
    const vid = `${coll}~${id}~${Date.now().toString(36)}`;
    const ops = [{ op: "set", coll: "versions", id: vid, data: { coll, docId: id, savedAt: nowStamp(), at: prev.updatedAt || prev.createdAt || "", by: prev.updatedBy || prev.author || "", data } }];
    for (const v of versionsOf(coll, id).slice(9)) ops.push({ op: "delete", coll: "versions", id: v._id });
    return ops;
  }
  function showVersions(coll, id, titel) {
    const list = versionsOf(coll, id);
    const kurz = (d) => esc(String(d.title || d.topic || "")).slice(0, 80) + (coll === "tasks" ? ` · ${esc(d.status || "")}${d.owner ? " · " + esc(d.owner) : ""}${d.deadline ? " · " + fmtFull(d.deadline) : ""}` : ` · ${(d.items || []).length} Traktanden`);
    const o = modal(`<div class="lg-head"><span class="eyebrow">Frühere Fassungen</span><h2>${esc(titel || "")}</h2></div>
      ${list.length ? `<div class="stack" style="gap:8px">${list.map((v) => `<div class="ver-row"><div><b>${esc(stampFmt(v.at || v.savedAt))}</b>${v.by ? ` <span class="muted">von ${esc(v.by)}</span>` : ""}<div class="muted" style="font-size:12.5px">${kurz(v.data || {})}</div></div><button class="btn small" data-ver="${esc(v._id)}">Wiederherstellen</button></div>`).join("")}</div>` : '<div class="empty">Noch keine früheren Fassungen. Sie entstehen ab jetzt bei jedem Speichern (die letzten 10).</div>'}
      <div class="lg-foot"><span></span><button class="btn" data-ver-close>Schliessen</button></div>`, "wide-modal");
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-ver-close]")) return closeDrawer();
      const b = e.target.closest("[data-ver]"); if (!b) return; const v = list.find((x) => x._id === b.dataset.ver); if (!v) return;
      const cur = (coll === "tasks" ? state.tasks.get(id) : (coll === "hoecks" ? state.hoecks : state.journal).find((x) => x._id === id));
      const data = { ...cloneDoc(v.data), updatedAt: nowStamp(), updatedBy: me() };
      try { await state.db.batch([...versionOps(coll, id, cur), { op: "set", coll, id, data }]); closeDrawer(); toast("Frühere Fassung wiederhergestellt"); undoable("Fassung wiederhergestellt", [{ coll, id, prev: docOhneId(cur) }]); } catch (err) { handleWriteError(err); }
    };
  }

  // ---------- writeTask: Rückgängig, Fassungen, «Nächster Höck», von Hand gesetzt ----------
  let ownerAutoSave = false; // Aufgabenfenster speichert mit automatisch gesetzter Leitung
  const writeTaskOrig = writeTask;
  writeTask = async function (id, patch, logText) {
    const prev = cloneDoc(state.tasks.get(id)); if (!prev) return;
    patch = { ...patch }; const still = patch._still; delete patch._still;
    if (patch.owner !== undefined && patch.owner !== (prev.owner || "")) patch.ownerManual = !ownerAutoSave;
    ownerAutoSave = false;
    const vOps = patch.title !== undefined || patch.note !== undefined ? versionOps("tasks", id, prev) : [];
    const geaendert = ["status", "owner", "deadline", "ressort", "teil", "title", "note", "star", "support"].filter((k) => patch[k] !== undefined && patch[k] !== (prev[k] ?? (k === "star" ? false : "")));
    await writeTaskOrig(id, patch, logText);
    if (!state.tasks.get(id)) return;
    if (vOps.length && geaendert.some((k) => k === "title" || k === "note")) state.db.batch(vOps).catch(() => {});
    if (patch.status === "Nächster Höck" && prev.status !== "Nächster Höck") alsTraktandum(id);
    if (still || !geaendert.length) return;
    const was = geaendert.length > 1 ? "Gespeichert" : geaendert[0] === "status" ? `Status «${patch.status}»` : geaendert[0] === "owner" ? `Verantwortlich: ${patch.owner || "niemand"}` : geaendert[0] === "deadline" ? `Deadline ${fmtFull(patch.deadline)}` : "Gespeichert";
    setTimeout(() => undoable(`${was} · ${prev.title.slice(0, 40)}`, [{ coll: "tasks", id, prev: docOhneId(prev) }]), 60);
  };
  // Aufgabe mit Status «Nächster Höck» wird ein Traktandum
  async function alsTraktandum(id) {
    const t = state.tasks.get(id); if (!t || state.journal.some((e) => e.taskId === id && e.status !== "Besprochen")) return;
    try { await state.db.collection("journal").add({ type: "idea", title: t.title, text: `Aufgabe (${t.ressort}${t.teil ? " › " + t.teil : ""}${t.owner ? ", " + t.owner : ""})${t.note ? "\n" + t.note : ""}`, by: me(), forDate: "", status: "Offen", date: iso(today()), taskId: id, createdAt: nowStamp(), updatedAt: nowStamp(), updatedBy: me() }); toast("Als Traktandum für den nächsten Höck eingetragen"); } catch (e) { handleWriteError(e); }
  }

  // ---------- Verantwortlich direkt in der Liste, «Ich übernehme», Abhängigkeiten ----------
  function ownerCell(t) {
    if (!isLaLei() || isReadOnly() || isClosed() || state.asTeam) return person(t.owner);
    return `<div class="owner-pick">${t.owner ? av(t.owner) : '<span class="av av-empty" aria-hidden="true">?</span>'}<select class="owner" data-owner="${esc(t._id)}" aria-label="Verantwortlich für ${esc(t.title)}">${personOptions(t.owner, "Nicht zugeteilt")}</select></div>${!t.owner && me() && t.status !== "Erledigt" ? `<button class="link take" data-take="${esc(t._id)}">Ich übernehme</button>` : ""}`;
  }
  function depInfo(t) {
    const offen = (t.dependsOn || []).map((id) => state.tasks.get(id)).filter((x) => x && x.status !== "Erledigt");
    return offen.length ? `<span class="tag plain dep" title="${esc(offen.map((x) => x.title).join("\n"))}">⛓ wartet auf ${offen.length === 1 ? "«" + esc(offen[0].title.slice(0, 30)) + "»" : offen.length + " Aufgaben"}</span>` : "";
  }
  view.addEventListener("change", (e) => {
    const s = e.target.closest("[data-owner]"); if (!s) return; const t = state.tasks.get(s.dataset.owner); if (!t) return;
    writeTask(t._id, { owner: s.value }, `Verantwortlich: ${s.value || "nicht zugeteilt"}`);
  });
  view.addEventListener("click", (e) => { const b = e.target.closest("[data-take]"); if (!b) return; writeTask(b.dataset.take, { owner: me() }, `${me()} übernimmt`); });

  // ---------- Aufgabenfenster: Verantwortlich automatisch, Abhängigkeiten, Fassungen, Seitenansicht ----------
  const renderDrawerOrig = renderDrawer;
  renderDrawer = function () {
    renderDrawerOrig(); const o = $(".overlay"); if (!o || !openTaskId) return;
    const isNew = openTaskId === "_new"; const own = $("#d-owner", o); const ress = $("#d-ress", o), teil = $("#d-teil", o);
    if (own && isNew && !own.value) { const l = leadOf(ress.value, teil.value); if (l) { own.value = l; own.dataset.auto = "1"; } }
    if (own && !isNew) { const t0 = state.tasks.get(openTaskId) || {}; own.dataset.auto = !t0.ownerManual && t0.owner && t0.owner === leadOf(t0.ressort, t0.teil) ? "1" : ""; }
    const sv = $("#d-save", o); if (sv && own) sv.addEventListener("click", () => { ownerAutoSave = own.dataset.auto === "1"; }, true);
    if (own) {
      own.addEventListener("change", () => { own.dataset.auto = "0"; });
      const nach = () => { if (own.dataset.auto === "1" || !own.value) { const l = leadOf(ress.value, teil.value); own.value = l; own.dataset.auto = l ? "1" : ""; } };
      ress && ress.addEventListener("change", () => setTimeout(nach, 0)); teil && teil.addEventListener("change", nach);
      own.closest(".field").insertAdjacentHTML("beforeend", `<span class="hint">Leer gelassen geht die Aufgabe an die Leitung des Ressorts bzw. Teilbereichs.</span>`);
    }
    if (!isNew) {
      const t = state.tasks.get(openTaskId); const deps = (t.dependsOn || []).map((id) => state.tasks.get(id)).filter(Boolean);
      const andere = allTasks().filter((x) => x._id !== t._id && !(t.dependsOn || []).includes(x._id));
      const ck = $("#d-ck-wrap", o).closest(".field");
      ck.insertAdjacentHTML("beforebegin", `<div class="field"><span>Wartet auf</span><div class="dep-list">${deps.map((x) => `<span class="pchip-s ${x.status === "Erledigt" ? "kid" : ""}">${x.status === "Erledigt" ? "✓ " : ""}<button class="link" data-open="${esc(x._id)}">${esc(x.title)}</button><button type="button" class="x" data-dep-rm="${esc(x._id)}" aria-label="Entfernen">✕</button></span>`).join("") || '<span class="muted" style="font-size:13px">Nichts. Diese Aufgabe kann sofort angegangen werden.</span>'}</div>
        <div class="log-add"><input list="dep-opts" id="d-dep" placeholder="Aufgabe suchen, auf die diese wartet" aria-label="Abhängigkeit"><datalist id="dep-opts">${andere.slice(0, 400).map((x) => `<option value="${esc(x.title)} · ${esc(x.ressort)}">`).join("")}</datalist><button type="button" class="btn small" data-dep-add>+</button></div></div>`);
      const dup = $("#d-dup", o); if (dup && isLaLei()) dup.insertAdjacentHTML("afterend", `<button class="btn small ghost" data-versions-task title="Frühere Fassungen dieser Aufgabe">Fassungen</button>`);
      if (!t.owner && me() && !isReadOnly()) own.closest(".field").insertAdjacentHTML("beforeend", `<button type="button" class="link take-d" data-take-d>Ich übernehme</button>`);
      const ocOrig = o.onclick;
      o.onclick = (e) => {
        const tt = openTaskId && openTaskId !== "_new" ? state.tasks.get(openTaskId) : null; if (!tt) return ocOrig && ocOrig(e);
        const op = e.target.closest(".dep-list [data-open]"); if (op) return openTask(op.dataset.open);
        if (e.target.closest("[data-take-d]")) { own.value = me(); own.dataset.auto = "0"; drawerDirty = true; return; }
        const rm = e.target.closest("[data-dep-rm]"); if (rm) { writeTask(tt._id, { dependsOn: (tt.dependsOn || []).filter((x) => x !== rm.dataset.depRm), _still: true }).then(() => { if (!drawerDirty) renderDrawer(); }); return; }
        if (e.target.closest("[data-dep-add]")) { const v = $("#d-dep", o).value; const hit = allTasks().find((x) => `${x.title} · ${x.ressort}` === v || x.title === v); if (!hit) return toast("Aufgabe nicht gefunden. Bitte aus der Liste wählen."); writeTask(tt._id, { dependsOn: [...(tt.dependsOn || []), hit._id], _still: true }).then(() => { if (!drawerDirty) renderDrawer(); else toast("Abhängigkeit gespeichert"); }); return; }
        if (e.target.closest("[data-versions-task]")) return showVersions("tasks", tt._id, tt.title);
        return ocOrig && ocOrig(e);
      };
    }
    document.body.classList.toggle("task-side", window.innerWidth >= 1280);
  };
  const closeDrawerOrig = closeDrawer;
  closeDrawer = function () { closeDrawerOrig(); document.body.classList.remove("task-side"); };
  const openEntryOrig = openEntry;
  openEntry = function (...a) { document.body.classList.remove("task-side"); return openEntryOrig(...a); };

  // ---------- Aufgaben-Seite: Liste oder Kanban, Auswahl, gespeicherte Ansichten ----------
  state.taskView = store.get("lager-aufgaben-ansicht") || "liste"; state.sel = new Set(); state.selMode = false;
  const myViews = () => ((state.todos || {}).views || []);
  const saveMyViews = (views2) => state.db.doc("todos/" + myId()).set({ ...(state.todos || {}), items: todoItems(), views: views2, updatedAt: nowStamp() }).catch(handleWriteError);
  const tasksShellOrig = views.tasks.shell, tasksUpdateOrig = views.tasks.update;
  views.tasks.shell = () => tasksShellOrig().replace('<div class="toolbar" style="padding-block:8px"><span class="info" id="f-info"></span>', `<div class="toolbar task-tools" style="padding-block:8px"><span class="info" id="f-info"></span>
    <div class="seg view-seg" role="group" aria-label="Ansicht"><button type="button" data-tview="liste" aria-pressed="${state.taskView === "liste"}">Liste</button><button type="button" data-tview="kanban" aria-pressed="${state.taskView === "kanban"}">Kanban</button></div>
    <button class="btn small ${state.selMode ? "primary" : ""}" data-selmode>${state.selMode ? "Auswahl beenden" : "Auswählen"}</button>
    ${menu([...myViews().map((v) => [`data-view-load="${esc(v.id)}"`, "★ " + esc(v.name)]), ["data-view-save", "Aktuelle Ansicht speichern …"], myViews().length ? ["data-view-manage", "Ansichten verwalten …"] : null], "Ansichten")}`);
  views.tasks.update = function () {
    tasksUpdateOrig(); autoOwnerErstmals(); const box = $("#task-list"); if (!box) return;
    if (state.taskView === "kanban") box.innerHTML = kanbanHtml(gefilterteAufgaben());
    else if (state.selMode) box.querySelectorAll("tr.task").forEach((tr) => { const id = (tr.querySelector("[data-open]") || {}).dataset?.open; if (!id) return; tr.classList.toggle("selected", state.sel.has(id)); const td = tr.querySelector(".c-date"); td.insertAdjacentHTML("afterbegin", `<input type="checkbox" class="sel-cb" data-sel="${esc(id)}" ${state.sel.has(id) ? "checked" : ""} aria-label="Auswählen">`); });
    bulkBar();
  };
  // gleiche Filter wie die Liste (Quick-Reiter, Ressort, Person, Status, Stichwort, Suche)
  function gefilterteAufgaben() {
    const f = state.filter; const q = (f.q || "").trim().toLowerCase(); const t0 = iso(today()), lim = iso(new Date(today().getTime() + 21 * DAY));
    const QF = { open: (t) => t.status !== "Erledigt", star: (t) => t.star && t.status !== "Erledigt", late: isLate, soon: (t) => t.status !== "Erledigt" && t.deadline >= t0 && t.deadline <= lim, none: (t) => !t.owner && t.status !== "Erledigt", new: isNew, done: (t) => t.status === "Erledigt", all: () => true };
    const quick = curTab("tasks");
    return allTasks().filter((t) => {
      if (f.ressort) { const [r, s] = f.ressort.split("|"); if (t.ressort !== r || (s && t.teil !== s)) return false; }
      if (f.person === "_none" && t.owner) return false; if (f.person && f.person !== "_none" && t.owner !== f.person && t.support !== f.person) return false;
      if (f.status && !f.status.startsWith("_") && t.status !== f.status) return false; if (f.tag && !tagsOf(t).includes(f.tag)) return false;
      if (q && !`${t.title} ${t.note} ${t.ressort} ${t.teil} ${t.owner} ${t.support} ${(t.checklist || []).map((c) => c.t).join(" ")}`.toLowerCase().includes(q)) return false;
      return quick === "open" && state.taskView === "kanban" ? true : (QF[quick] || QF.all)(t);
    });
  }
  function kanbanHtml(list) {
    const cols = STATUSES.filter((s) => s !== "Erledigt" || curTab("tasks") !== "open");
    return `<div class="kanban">${cols.map((s) => { const items = list.filter((t) => (t.status || "Offen") === s); return `<div class="kb-col" data-kb-col="${esc(s)}"><div class="kb-head"><span class="kb-dot" data-s="${esc(s)}"></span><b>${esc(s)}</b><span class="muted">${items.length}</span></div><div class="kb-list">${items.slice(0, 120).map((t) => `<div class="kb-card ${isLate(t) ? "late" : ""}" draggable="true" data-kb="${esc(t._id)}" data-open="${esc(t._id)}" tabindex="0"><div class="kb-title">${t.star ? '<span class="star on">★</span>' : ""}${esc(t.title)}</div><div class="kb-meta"><span>${esc(t.ressort)}${t.teil ? " › " + esc(t.teil) : ""}</span>${t.deadline ? `<span class="${isLate(t) ? "late-n" : ""}">${fmt(t.deadline)}</span>` : ""}${t.owner ? av(t.owner) : ""}</div>${depInfo(t)}</div>`).join("") || '<div class="kb-empty">leer</div>'}${items.length > 120 ? `<div class="kb-empty">… und ${items.length - 120} weitere</div>` : ""}</div></div>`; }).join("")}</div>`;
  }
  // Leiste für ausgewählte Aufgaben
  function bulkBar() {
    let bar = $("#bulk-bar"); const n = state.sel.size;
    if (!state.selMode || state.view !== "tasks") { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement("div"); bar.id = "bulk-bar"; bar.className = "bulk-bar"; document.body.appendChild(bar); }
    bar.innerHTML = `<b>${n} ausgewählt</b><button class="link" data-bulk="all">alle sichtbaren</button>${n ? `<span class="bulk-sep"></span>
      <select data-bulk-status aria-label="Status setzen"><option value="">Status …</option>${STATUSES.map((s) => `<option>${s}</option>`).join("")}</select>
      <select data-bulk-owner aria-label="Verantwortlich"><option value="">Verantwortlich …</option>${personOptions("", "Niemand").replace('<option value="">Niemand</option>', '<option value="_none">Niemand</option>')}</select>
      <select data-bulk-shift aria-label="Deadline verschieben"><option value="">Deadline …</option><option value="7">+1 Woche</option><option value="14">+2 Wochen</option><option value="30">+1 Monat</option><option value="-7">−1 Woche</option></select>
      <select data-bulk-ress aria-label="Ressort"><option value="">Ressort …</option>${ressorts().map((r) => `<option>${esc(r.name)}</option>`).join("")}</select>
      <button class="btn small ghost danger" data-bulk="del">Löschen</button>` : ""}<button class="btn small" data-bulk="off">Fertig</button>`;
  }
  async function bulkApply(patchFn, label) {
    const ids = [...state.sel]; const prev = ids.map((id) => ({ coll: "tasks", id, prev: docOhneId(state.tasks.get(id)) })).filter((x) => x.prev);
    const ops = prev.map((x) => { const t = state.tasks.get(x.id); const p = patchFn(t); return { op: "update", coll: "tasks", id: x.id, data: { ...p, updatedAt: nowStamp(), updatedBy: me(), log: [...(t.log || []), { at: nowStamp(), by: me(), text: label }] } }; });
    try { await state.db.batch(ops); undoable(`${ops.length} Aufgaben: ${label}`, prev); state.sel.clear(); views.tasks.update(); } catch (e) { handleWriteError(e); }
  }
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t.closest || !t.closest("#bulk-bar") || !t.value) return; const v = t.value; t.value = "";
    if (t.matches("[data-bulk-status]")) return bulkApply(() => ({ status: v }), `Status: ${v}`);
    if (t.matches("[data-bulk-owner]")) return bulkApply(() => ({ owner: v === "_none" ? "" : v, ownerManual: true }), `Verantwortlich: ${v === "_none" ? "niemand" : v}`);
    if (t.matches("[data-bulk-shift]")) return bulkApply((x) => ({ deadline: x.deadline ? addDays(x.deadline, +v) : x.deadline }), `Deadline ${+v > 0 ? "+" : ""}${v} Tage`);
    if (t.matches("[data-bulk-ress]")) return bulkApply(() => ({ ressort: v, teil: "" }), `Ressort: ${v}`);
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest && e.target.closest("#bulk-bar [data-bulk]"); if (!b) return; const a = b.dataset.bulk;
    if (a === "off") { state.selMode = false; state.sel.clear(); return render(); }
    if (a === "all") { gefilterteAufgaben().forEach((t) => state.sel.add(t._id)); return views.tasks.update(); }
    if (a === "del") { const ids = [...state.sel]; state.sel.clear(); for (const id of ids) await trash([{ coll: "tasks", id }], (state.tasks.get(id) || {}).title || "Aufgabe"); toast(`${ids.length} Aufgaben im Papierkorb`); views.tasks.update(); }
  });
  view.addEventListener("click", (e) => {
    const cb = e.target.closest("[data-sel]"); if (cb) { e.stopPropagation(); cb.checked ? state.sel.add(cb.dataset.sel) : state.sel.delete(cb.dataset.sel); cb.closest("tr").classList.toggle("selected", cb.checked); bulkBar(); return; }
    if (e.target.closest("[data-selmode]")) { state.selMode = !state.selMode; state.sel.clear(); state.taskView = "liste"; return render(); }
    const tv = e.target.closest("[data-tview]"); if (tv) { state.taskView = tv.dataset.tview; store.set("lager-aufgaben-ansicht", state.taskView); state.selMode = false; return render(); }
    const vl = e.target.closest("[data-view-load]"); if (vl) { const v = myViews().find((x) => x.id === vl.dataset.viewLoad); if (v) { state.filter = { ...state.filter, ...v.f }; state.tabs.tasks = v.tab; state.taskView = v.tv || "liste"; render(); toast(`Ansicht «${v.name}»`); } return; }
    if (e.target.closest("[data-view-save]")) return ansichtSpeichern();
    if (e.target.closest("[data-view-manage]")) return ansichtenVerwalten();
  }, true);
  function ansichtSpeichern() {
    const o = modal(`<div class="lg-head"><span class="eyebrow">Gespeicherte Ansicht</span><h2>Aktuelle Ansicht speichern</h2></div><p class="muted" style="margin:0">Gespeichert werden Reiter, Filter und Suche. Nur du siehst deine Ansichten.</p><input id="av-name" placeholder="Name, z.B. Logistik offen"><div class="lg-foot"><button class="link" data-av-no>Abbrechen</button><button class="btn primary" data-av-ok>Speichern</button></div>`);
    setTimeout(() => $("#av-name", o).focus(), 30);
    o.onclick = (e) => { if (e.target === o || e.target.closest("[data-av-no]")) return closeDrawer(); if (!e.target.closest("[data-av-ok]")) return; const name = $("#av-name", o).value.trim(); if (!name) return; const f = state.filter;
      saveMyViews([...myViews(), { id: uid(), name, f: { q: f.q, ressort: f.ressort, person: f.person, status: f.status, tag: f.tag || "" }, tab: curTab("tasks"), tv: state.taskView }]).then(() => { closeDrawer(); toast(`Ansicht «${name}» gespeichert`); render(); }); };
  }
  function ansichtenVerwalten() {
    const o = modal("", ""); const draw = () => { o.querySelector(".modal").innerHTML = `<div class="lg-head"><span class="eyebrow">Gespeicherte Ansichten</span><h2>Verwalten</h2></div>${myViews().map((v) => `<div class="ver-row"><b>${esc(v.name)}</b><button class="btn small ghost danger" data-av-rm="${esc(v.id)}">Löschen</button></div>`).join("") || '<span class="muted">Keine.</span>'}<div class="lg-foot"><span></span><button class="btn" data-av-close>Fertig</button></div>`; };
    o.onclick = (e) => { if (e.target === o || e.target.closest("[data-av-close]")) { closeDrawer(); return render(); } const r = e.target.closest("[data-av-rm]"); if (r) saveMyViews(myViews().filter((x) => x.id !== r.dataset.avRm)).then(draw); };
    draw();
  }
  // Kanban: Karten ziehen
  let kbDrag = null;
  view.addEventListener("dragstart", (e) => { const c = e.target.closest && e.target.closest("[data-kb]"); if (c) { kbDrag = c.dataset.kb; e.dataTransfer.effectAllowed = "move"; c.classList.add("dragging"); } });
  view.addEventListener("dragend", (e) => { const c = e.target.closest && e.target.closest("[data-kb]"); if (c) c.classList.remove("dragging"); document.querySelectorAll(".kb-col.over").forEach((x) => x.classList.remove("over")); });
  view.addEventListener("dragover", (e) => { const col = e.target.closest && e.target.closest("[data-kb-col]"); if (col && kbDrag) { e.preventDefault(); document.querySelectorAll(".kb-col.over").forEach((x) => x !== col && x.classList.remove("over")); col.classList.add("over"); } });
  view.addEventListener("drop", (e) => { const col = e.target.closest && e.target.closest("[data-kb-col]"); if (!col || !kbDrag) return; e.preventDefault(); const id = kbDrag; kbDrag = null; setStatus(id, col.dataset.kbCol); });

  // ---------- Zeitplan: Aufgaben und Meilensteine auf eine andere Woche ziehen ----------
  let tlDrag = null;
  view.addEventListener("dragstart", (e) => { const m = e.target.closest && e.target.closest("[data-drag-task],[data-drag-ms]"); if (!m) return; const td = m.closest("td[data-wi]"); tlDrag = { task: m.dataset.dragTask, ms: m.dataset.dragMs, wi: td && td.dataset.wi }; e.dataTransfer.effectAllowed = "move"; });
  view.addEventListener("dragover", (e) => { const td = e.target.closest && e.target.closest("#gantt td[data-wi]"); if (td && tlDrag) { e.preventDefault(); document.querySelectorAll("#gantt td.drop").forEach((x) => x.classList.remove("drop")); td.classList.add("drop"); } });
  view.addEventListener("drop", (e) => {
    const td = e.target.closest && e.target.closest("#gantt td[data-wi]"); if (!td || !tlDrag || !tlDrag.wi) return; e.preventDefault();
    const diff = daysBetween(parse(tlDrag.wi), parse(td.dataset.wi)); const d = tlDrag; tlDrag = null; document.querySelectorAll("#gantt td.drop").forEach((x) => x.classList.remove("drop")); if (!diff) return;
    if (d.task) { const t = state.tasks.get(d.task); if (t && t.deadline) writeTask(t._id, { deadline: addDays(t.deadline, diff) }, `Deadline im Zeitplan verschoben: ${fmtFull(addDays(t.deadline, diff))}`); }
    if (d.ms) { const m = (cfg().milestones || {})[d.ms]; if (m) writeConfig({ milestones: { [d.ms]: { date: addDays(m.date, diff) } } }).then(() => toast(`Meilenstein «${m.name}» verschoben auf ${fmtFull(addDays(m.date, diff))}`)); }
  });

  // ---------- Übersicht: ruhige Ressorts (nur für die Hauptleitung) ----------
  const ovUpdateOrig2 = views.overview.update;
  views.overview.update = function () {
    ovUpdateOrig2(); autoOwnerErstmals();
    const hl = (cfg().ressorts || {}).hl; if (!hl || !hl.lead || hl.lead !== me()) return;
    const grenze = Date.now() - 21 * DAY; const ruhig = [];
    for (const r of ressorts()) { if (r.id === "hl") continue; const list = allTasks().filter((t) => t.ressort === r.name); const offen = list.filter((t) => t.status !== "Erledigt"); if (!offen.length) continue;
      const zuletzt = Math.max(0, ...list.map((t) => ts(t.updatedAt || t.createdAt))); if (zuletzt < grenze) ruhig.push({ r, offen: offen.length, zuletzt }); }
    if (ruhig.length) $("#ov-setup").insertAdjacentHTML("beforeend", `<section class="card quiet-card"><div class="card-head"><h2>Ruhige Ressorts</h2><span class="muted">nur für dich als Hauptleitung · seit 3 Wochen nichts mehr geändert</span></div><div class="card-body stack" style="gap:6px">${ruhig.map((x) => `<div class="hint-row plain"><b>${esc(x.r.name)}</b> · ${x.offen} offene Aufgaben · zuletzt ${x.zuletzt ? fmtFull(iso(new Date(x.zuletzt))) : "nie"} ${x.r.lead ? "· " + esc(x.r.lead) : ""} <button class="link" data-ress-page="${esc(x.r.id)}">ansehen</button></div>`).join("")}</div></section>`);
  };
