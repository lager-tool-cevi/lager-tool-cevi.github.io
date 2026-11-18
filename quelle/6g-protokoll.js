  // =====================================================================
  // Etappe 2b: Protokoll – Erwähnungen (@alle, @LaLei, @Ressort), «Speichern» ohne Schliessen,
  // gemeinsam bearbeiten (Zusammenführen), Rückgängig, frühere Fassungen, Feldhöhe merken,
  // Diktieren, Höck-Modus, Höck als Outlook-Termin (.ics)
  // =====================================================================
  NEUES.unshift({ id: "2026-11-etappe2", titel: "Neu: Aufgaben und Protokoll", punkte: [
    "<b>Verantwortlich</b> ist automatisch die Leitung des Ressorts bzw. Teilbereichs, ausser ihr wählt jemand anderes. Ändern geht direkt in der Liste.",
    "Neuer Status <b>«Nächster Höck»</b>: Die Aufgabe kommt als Traktandum auf die Liste für den nächsten Höck.",
    "Aufgaben als <b>Kanban</b> ansehen, <b>mehrere auswählen</b> und gemeinsam ändern, eigene <b>Ansichten speichern</b>, im Zeitplan <b>ziehen</b>.",
    "Fast alles lässt sich <b>rückgängig</b> machen, frühere <b>Fassungen</b> lassen sich wiederherstellen.",
    "Im Protokoll: <b>«Speichern»</b> (bleibt offen) und «Speichern &amp; schliessen», zu zweit gleichzeitig schreiben und der <b>Höck-Modus</b>.",
    "<b>@alle</b>, <b>@LaLei</b> und <b>@Ressort</b> erwähnen. Unter «Meine Aufgaben › Erwähnungen» steht jede Zeile einzeln, mit «Als Aufgabe».",
    "Einen Höck als <b>Outlook-Termin</b> herunterladen.",
  ] });
  const cl = (v) =>(v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

  // ---------- Gruppen-Erwähnungen ----------
  const tokenOf = (name) => String(name || "").replace(/[^\p{L}\p{N}_.-]/gu, "");
  function mentionGroups() {
    const namen = people().map((p) => p.toLowerCase());
    const out = [{ token: "alle", label: "alle Leitenden", hits: () => true }, { token: "LaLei", label: "Lagerleitung", hits: (n) => peopleBy("LaLei").includes(n) }];
    for (const r of state.config ? ressorts() : []) {
      const tk = tokenOf(r.name); if (!tk || out.some((x) => x.token.toLowerCase() === tk.toLowerCase())) continue;
      out.push({ token: tk, label: "Ressort " + r.name, hits: (n) => !!n && (r.lead === n || r.stv === n || subsOf(r).some((s) => s.lead === n || s.stv === n)) });
    }
    return out.filter((g) => !namen.includes(g.token.toLowerCase()));
  }
  function richGroups(html) {
    if (!state.config || !html.includes("@")) return html; const gs = mentionGroups();
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_/])@(${gs.map((g) => escRe(g.token)).join("|")})(?!${NAME_CH})`, "giu");
    return html.replace(re, (m, pre, tk) => { const g = gs.find((x) => x.token.toLowerCase() === tk.toLowerCase()); return `${pre}<span class="mention group ${g && g.hits(me()) ? "me" : ""}" title="${esc(g ? g.label : "")}">@${esc(g ? g.token : tk)}</span>`; });
  }
  // betrifft mich dieser Text? (@Name, @alle, @LaLei, @Ressort)
  function mentionsMe(text) {
    const n = me(); if (!n || !text || !String(text).includes("@")) return false;
    if (mentions(text, n)) return true;
    return mentionGroups().some((g) => g.hits(n) && mentions(text, g.token));
  }

  // ---------- Meine Aufgaben › Erwähnungen: jede Zeile einzeln ----------
  let mentHits = [];
  const mineUpdateOrig = views.mine.update;
  views.mine.update = function () {
    mineUpdateOrig(); const mm = $("#mine-mentions"); if (!mm) return;
    const hits = [];
    const add = (h, text) => { for (const line of String(text || "").split("\n")) if (line.trim() && mentionsMe(line)) hits.push({ ...h, text: line.trim() }); };
    for (const t of state.tasks.values()) {
      const h = { date: (t.updatedAt || "").slice(0, 10) || t.deadline, tag: "Aufgabe", cls: "", title: t.title, attr: `data-open="${esc(t._id)}"` };
      add(h, t.note); for (const l of t.log || []) add({ ...h, date: (l.at || "").slice(0, 10) || h.date }, l.text); for (const c of t.checklist || []) add(h, c.t);
    }
    for (const e of state.journal) { const ty = typeOf(e); add({ date: entryDate(e), tag: ty === "meeting" ? HK[e.kind || "LaLei"].label : J_TYPES[ty].tag, cls: ty === "meeting" ? HK[e.kind || "LaLei"].cls : "type-" + ty, title: e.title || e.topic || "", attr: `data-open-entry="${esc(e._id)}"`, entry: e._id }, entryText(e)); }
    for (const h of state.hoecks) add({ date: h.date, tag: HK[h.kind || "LaLei"].label, cls: HK[h.kind || "LaLei"].cls, title: h.title || "", attr: `data-open-hoeck="${esc(h._id)}"` }, h.note);
    const seen = new Set(); const fertig = new Set(mentFertig());
    const alle = hits.filter((h) => { const k = mentKey(h); h.key = k; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const nErl = alle.filter((h) => fertig.has(h.key)).length;
    mentHits = state.mentAlle ? alle : alle.filter((h) => !fertig.has(h.key));
    const kann = !isReadOnly();
    fillTabs("mine", { todo: todoItems().filter((x) => !x.done).length, ment: alle.length - nErl });
    mm.innerHTML = (mentHits.length ? mentHits.slice(0, 80).map((h, i) => { const erl = fertig.has(h.key); return `<div class="mrow ment-row ${erl ? "ment-erl" : ""}" ${h.attr} role="button" tabindex="0"><div class="entry-top"><span class="tag plain ${h.cls}">${h.tag}</span><b style="font-weight:600">${esc(h.title)}</b><span class="muted" style="font-size:12px;margin-left:auto">${fmtFull(h.date)}</span></div><div class="ment-line"><div class="rich">${rich(h.text)}</div>${kann ? `<span class="ment-acts">${erl ? "" : `<button class="btn small" data-ment-task="${i}">Als Aufgabe</button>`}<button class="btn small ${erl ? "" : "primary"}" data-ment-done="${i}">${erl ? "Wieder offen" : "Erledigt"}</button></span>` : ""}</div></div>`; }).join("") + (mentHits.length > 80 ? `<div class="card-body muted" style="font-size:13px">… und ${mentHits.length - 80} ältere</div>` : "")
      : `<div class="empty"><b>${nErl ? "Alles erledigt" : "Keine Erwähnungen"}</b>${nErl ? "" : `Hier erscheint jede Zeile, in der jemand @${esc(me())}, @alle, @LaLei oder dein Ressort schreibt.`}</div>`)
      + (nErl ? `<div class="card-body ment-toggle"><button class="link" data-ment-alle>${state.mentAlle ? "Erledigte ausblenden" : `${nErl} erledigte anzeigen`}</button></div>` : "");
  };
  // erledigte Erwähnungen: im privaten Bereich der Person gespeichert (gilt auf allen Geräten)
  function mentKey(h) { const s = h.attr + "|" + h.text; let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36) + s.length.toString(36); }
  const mentFertig = () => ((state.todos || {}).mentDone || []);
  function mentSetze(key, erledigt) {
    const alt = mentFertig(); const neu = erledigt ? [...new Set([...alt, key])].slice(-500) : alt.filter((k) => k !== key);
    state.todos = { ...(state.todos || {}), mentDone: neu }; views.mine.update();
    state.db.doc("todos/" + myId()).set({ ...(state.todos || {}), items: todoItems(), mentDone: neu, updatedAt: nowStamp() }).catch(handleWriteError);
  }
  view.addEventListener("click", (e) => {
    if (e.target.closest("[data-ment-alle]")) { state.mentAlle = !state.mentAlle; return views.mine.update(); }
    const d = e.target.closest("[data-ment-done]"); if (d) { e.stopPropagation(); e.stopImmediatePropagation(); const h = mentHits[+d.dataset.mentDone]; if (!h) return; const war = mentFertig().includes(h.key); mentSetze(h.key, !war); if (!war) toastAction("Als erledigt markiert", "Rückgängig", () => mentSetze(h.key, false)); return; }
    const b = null; if (!b) return; // «Als Aufgabe» übernimmt jetzt 6p (mit Name und Datum)
    const h = mentHits[+b.dataset.mentTask]; if (!h) return;
    openTask("_new", { title: h.text.slice(0, 140), owner: me(), note: `Aus «${h.title}» (${fmtFull(h.date)}):\n${h.text}`, ...(h.entry ? { source: { entry: h.entry, label: `${h.title} (${fmtFull(h.date)})` } } : {}) });
  }, true);

  // ---------- Protokoll-Fenster ----------
  const ENTRY_TYPES = ["hoeck", "meeting", "note", "contact", "idea"];
  const collOf = (type) => (type === "hoeck" ? "hoecks" : "journal");
  const curEntry = () => (ed && ed.id ? (ed.type === "hoeck" ? state.hoecks : state.journal).find((x) => x._id === ed.id) : null);
  const withItemIds = (doc) => { if (doc && Array.isArray(doc.items)) doc.items = doc.items.map((it, i) => ({ ...it, id: it.id || "i" + i })); return doc; };
  const isEntry = () => !!ed && ENTRY_TYPES.includes(ed.type);
  const hatAenderungen = () => isEntry() && ed.orig && !same({ ...ed.draft, _showAll: 0 }, { ...ed.orig, _showAll: 0 });

  // meine Änderungen (draft gegenüber orig) auf den aktuellen Stand (cur) anwenden – Traktandum für Traktandum
  function mergeEntry(draft, orig, cur) {
    const out = withItemIds(cl(cur)); delete out._id;
    for (const k of new Set([...Object.keys(draft), ...Object.keys(orig)])) {
      if (k === "items" || k === "_showAll") continue;
      if (!same(draft[k], orig[k])) { if (draft[k] === undefined) delete out[k]; else out[k] = cl(draft[k]); }
    }
    if (Array.isArray(draft.items)) {
      const ci = out.items || [], oi = (orig.items || []), di = draft.items; const byId = (arr, id) => arr.find((x) => x.id === id);
      const res = [];
      for (const it of ci) { const o = byId(oi, it.id), d = byId(di, it.id); if (o && !d) continue; res.push(d && o && !same(d, o) ? cl(d) : it); }
      for (const d of di) if (!byId(ci, d.id)) { const o = byId(oi, d.id); if (!o || !same(d, o)) res.push(cl(d)); }
      out.items = res;
    }
    return out;
  }

  const renderEntryOrig = renderEntryDrawer;
  renderEntryDrawer = function () {
    if (isEntry()) {
      if (!ed.orig) { if (ed.type === "meeting") ed.draft.items.forEach((it, i) => { if (!it.id) it.id = "i" + i; }); ed.orig = ed.id ? cl(ed.draft) : {}; }
      else if (ed.type === "meeting") ed.draft.items.forEach((it) => { if (!it.id) it.id = uid(); });
    }
    renderEntryOrig();
    const o = $(".overlay"); if (!o || !ed) return;
    applyTaHeights(o); addDictate(o);
    if (!isEntry()) return;
    const save = $("#e-save", o);
    if (save && !isReadOnly()) { save.textContent = "Speichern & schliessen"; save.insertAdjacentHTML("beforebegin", `<button class="btn" id="e-save-stay" title="Speichern, das Fenster bleibt offen (Ctrl+S)">Speichern</button>`); $("#e-save-stay", o).onclick = () => saveEntry(true); }
    const headBtns = $(".drawer-head > span", o);
    if (headBtns) {
      const extra = [];
      if (ed.type === "meeting" && !isReadOnly()) extra.push(`<button class="btn small" data-hmode title="Ein Traktandum nach dem anderen, gross und ohne Ablenkung">Höck-Modus</button>`);
      if (ed.type === "hoeck") extra.push(`<button class="btn small ghost" data-ics title="Termin für den Outlook-Kalender herunterladen">Outlook</button>`);
      if (ed.id && isLaLei()) extra.push(`<button class="btn small ghost" data-ver-e title="Frühere Fassungen dieses Eintrags">Fassungen</button>`);
      headBtns.insertAdjacentHTML("afterbegin", extra.join(""));
    }
    const oc = o.onclick;
    o.onclick = (e) => {
      if (ed && isEntry()) {
        if (e.target.closest("[data-hmode]")) return hoeckModus(0);
        if (e.target.closest("[data-ics]")) return icsDownload({ ...ed.draft, _id: ed.id });
        if (e.target.closest("[data-ver-e]")) { if (hatAenderungen()) return toast("Bitte zuerst speichern, dann die früheren Fassungen ansehen."); return showVersions(collOf(ed.type), ed.id, ed.draft.title || ed.draft.topic || ""); }
      }
      return oc && oc(e);
    };
  };

  const saveEntryOrig = saveEntry;
  saveEntry = async function (keepOpen) {
    if (!isEntry()) return saveEntryOrig();
    keepOpen = keepOpen === true;
    const o = $(".overlay"); const isHoeck = ed.type === "hoeck"; const coll = collOf(ed.type);
    let d = cl(ed.draft);
    if (!isHoeck) d.type = ed.type;
    const need = { hoeck: "date", meeting: "date", note: "title", contact: "contactName", idea: "title" }[ed.type];
    if (!d[need]) { const el = $(`[data-f="${need}"]`); if (el) el.focus(); toast("Bitte die Pflichtangabe ausfüllen."); return; }
    if ((isHoeck || ed.type === "meeting") && !d.title) d.title = HK[d.kind || "LaLei"].label;
    if (ed.type === "idea" && !d.date) d.date = iso(today());
    delete d._showAll;
    const cur = curEntry(); let mergedBy = "";
    // jemand anderes hat inzwischen gespeichert: Änderungen zusammenführen statt überschreiben
    if (ed.id && cur && ts(cur.updatedAt) > ts(ed.base)) { d = mergeEntry(d, ed.orig || {}, cur); delete d._showAll; mergedBy = cur.updatedBy || "jemand"; }
    if (ed.type === "meeting") d.items = (d.items || []).filter((it) => it.title || it.notes || it.decision || (it.links || []).length);
    d.updatedAt = nowStamp(); d.updatedBy = me();
    const btns = o ? o.querySelectorAll("#e-save, #e-save-stay") : []; btns.forEach((b) => (b.disabled = true));
    try {
      const wasNew = !ed.id; const id = ed.id || state.db.newId(); if (wasNew) d.createdAt = nowStamp();
      await state.db.batch([{ op: "set", coll, id, data: d }]);
      if (cur) { const vo = versionOps(coll, id, cur); if (vo.length) state.db.batch(vo).catch(() => {}); }
      if (ed.type === "meeting") for (const it of d.items) if (it.ideaId) { const idea = state.journal.find((x) => x._id === it.ideaId); if (idea && idea.status !== "Besprochen") await state.db.doc("journal/" + it.ideaId).update({ status: "Besprochen", meetingTitle: `${d.title} (${fmtFull(d.date)})` }); }
      store.set(draftKey(ed.type, ed.id), "");
      const prev = cur ? docOhneId(cur) : null;
      const label = wasNew ? "Gespeichert" : mergedBy ? `Gespeichert und mit den Änderungen von ${mergedBy} zusammengeführt` : "Gespeichert";
      setTimeout(() => toastAction(label, "Rückgängig", async () => { try { await state.db.batch([prev ? { op: "set", coll, id, data: prev } : { op: "delete", coll, id }]); if (ed && ed.id === id) closeDrawer(); toast("Rückgängig gemacht"); } catch (err) { handleWriteError(err); } }), 60);
      if (keepOpen && ed) {
        const nd = withItemIds(cl(d)); if (ed.type === "meeting" && !nd.items.length) nd.items.push({ id: uid(), title: "", notes: "", decision: "", links: [] });
        Object.assign(ed, { id, base: d.updatedAt, orig: cl(nd), draft: nd, touched: false, found: null, conflict: null, force: false, confirmDel: false });
        setPresence(coll + "/" + id); renderEntryDrawer();
      } else closeDrawer();
    } catch (err) { btns.forEach((b) => (b.disabled = false)); handleWriteError(err); }
  };
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "s" && isEntry() && !isReadOnly()) { e.preventDefault(); saveEntry(true).then(() => { if ($(".hoeck-mode")) hmDraw && hmDraw(); }); }
  });

  // ---------- Gleichzeitig bearbeiten: Änderungen anderer laufend übernehmen ----------
  function liveMerge() {
    if (!isEntry() || !ed.id || !ed.orig || $(".hoeck-mode")) return;
    const cur = curEntry(); if (!cur || ts(cur.updatedAt) <= ts(ed.base)) return;
    const a = document.activeElement; const o = $(".overlay");
    if (a && o && o.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { ed.mergeLater = true; return; }
    ed.draft = mergeEntry(ed.draft, ed.orig, cur); ed.orig = withItemIds(cl(docOhneId(cur))); ed.base = cur.updatedAt; ed.mergeLater = false; ed.conflict = null; ed.force = false;
    renderEntryDrawer(); toast(`Änderungen von ${cur.updatedBy || "jemand"} übernommen`);
  }
  const refreshOrig = refresh;
  refresh = function (force) { refreshOrig(force); liveMerge(); };
  document.addEventListener("focusout", () => setTimeout(() => { if (ed && ed.mergeLater) liveMerge(); }, 120));
  const presenceOrig = updatePresenceNote;
  updatePresenceNote = function () {
    presenceOrig(); const el = $("#presence-note");
    if (el && !el.hidden && isEntry()) el.innerHTML = el.innerHTML.replace("Sprecht euch ab, sonst überschreibt ihr euch.", "Ihr könnt gleichzeitig schreiben: Beim Speichern werden eure Änderungen zusammengeführt. Am besten bearbeitet ihr verschiedene Traktanden.");
  };

  // ---------- Aufgabenfenster: Feldhöhe und Diktieren auch dort ----------
  const renderDrawerOrig3 = renderDrawer;
  renderDrawer = function () { renderDrawerOrig3(); const o = $(".overlay"); if (o && openTaskId) { applyTaHeights(o); addDictate(o); } };

  // ---------- Feldhöhe merken (aufgezogene Textfelder bleiben gross) ----------
  const TA_KEY = "lalei-feldhoehen";
  const taKey = (t) => t.dataset.k || t.dataset.hmK || t.dataset.f || t.id || "";
  const taHeights = () => { try { return JSON.parse(store.get(TA_KEY) || "{}") || {}; } catch { return {}; } };
  function applyTaHeights(root) { const h = taHeights(); (root || document).querySelectorAll("textarea").forEach((t) => { const k = taKey(t); if (k && h[k]) t.style.height = h[k] + "px"; }); }
  document.addEventListener("pointerup", (e) => {
    const t = e.target; if (!t || t.tagName !== "TEXTAREA") return;
    setTimeout(() => { const k = taKey(t); const v = parseInt(t.style.height, 10); if (!k || !v) return; const h = taHeights(); if (h[k] === v) return; h[k] = v; store.set(TA_KEY, JSON.stringify(h)); document.querySelectorAll("textarea").forEach((x) => { if (x !== t && taKey(x) === k) x.style.height = v + "px"; }); }, 0);
  });

  // ---------- Diktieren ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function addDictate(root) {
    return; // Diktieren auf Wunsch entfernt
    if (!SR || isReadOnly()) return;
    root.querySelectorAll(".drawer textarea, .hoeck-mode textarea").forEach((t) => {
      if (t.nextElementSibling && t.nextElementSibling.matches("[data-dictate]")) return;
      t.parentElement.classList.add("has-dictate");
      t.insertAdjacentHTML("afterend", `<button type="button" class="dictate" data-dictate aria-pressed="false" title="Diktieren: sprechen statt tippen" aria-label="Diktieren">🎤</button>`);
    });
  }
  let rec = null;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-dictate]"); if (!btn) return; e.preventDefault(); e.stopPropagation();
    if (rec) { rec.stop(); return; }
    const t = btn.previousElementSibling; if (!t || t.tagName !== "TEXTAREA") return;
    rec = new SR(); rec.lang = "de-CH"; rec.continuous = true; rec.interimResults = false;
    btn.classList.add("on"); btn.setAttribute("aria-pressed", "true"); t.focus();
    rec.onresult = (ev) => {
      let txt = ""; for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) txt += ev.results[i][0].transcript;
      txt = txt.trim(); if (!txt) return;
      const pos = t.selectionEnd ?? t.value.length; const pre = t.value.slice(0, pos); const ins = (pre && !/\s$/.test(pre) ? " " : "") + txt;
      t.value = pre + ins + t.value.slice(pos); t.setSelectionRange(pre.length + ins.length, pre.length + ins.length);
      t.dispatchEvent(new Event("input", { bubbles: true }));
    };
    rec.onerror = (ev) => { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") toast("Das Mikrofon ist nicht erlaubt. Bitte im Browser freigeben."); else if (ev.error === "no-speech") toast("Nichts gehört. Nochmals versuchen."); };
    rec.onend = () => { btn.classList.remove("on"); btn.setAttribute("aria-pressed", "false"); rec = null; };
    try { rec.start(); toast("Sprich jetzt. Nochmals auf 🎤 tippen zum Beenden."); } catch { rec = null; btn.classList.remove("on"); }
  }, true);

  // ---------- Höck-Modus: ein Traktandum nach dem anderen ----------
  let hmDraw = null;
  function hoeckModus(start) {
    if (!ed || ed.type !== "meeting") return;
    let i = Math.max(0, Math.min(start, ed.draft.items.length - 1)); const t0 = Date.now();
    const box = document.createElement("div"); box.className = "hoeck-mode"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Höck-Modus");
    document.body.appendChild(box);
    const draw = () => {
      if (!ed || ed.type !== "meeting") return zu();
      const items = ed.draft.items; i = Math.max(0, Math.min(i, items.length - 1)); const it = items[i];
      box.innerHTML = `<div class="hm-top"><div><span class="eyebrow">Höck-Modus</span><b>${esc(ed.draft.title || HK[ed.draft.kind || "LaLei"].label)}</b></div><span class="muted hm-clock" id="hm-clock">${Math.floor((Date.now() - t0) / 60000)} Min.</span><button class="btn small" data-hm-close>Zurück zum Protokoll</button></div>
        <nav class="hm-nav" aria-label="Traktanden">${items.map((x, j) => `<button type="button" class="${j === i ? "on" : ""} ${x.notes || x.decision ? "done" : ""}" data-hm-go="${j}">${j + 1}. ${esc((x.title || "Ohne Titel").slice(0, 32))}</button>`).join("")}<button type="button" data-hm-add>+ Traktandum</button></nav>
        <div class="hm-main"><span class="eyebrow">Traktandum ${i + 1} von ${items.length}</span>
          <input class="hm-title" data-hm-k="title" value="${esc(it.title)}" placeholder="Traktandum" aria-label="Traktandum">
          <label class="field"><span>Notizen</span><textarea data-hm-k="notes" data-mention rows="9" placeholder="Was wird besprochen? Mit @Name hältst du fest, wer etwas macht.">${esc(it.notes)}</textarea></label>
          <label class="field"><span>Entscheid</span><textarea data-hm-k="decision" data-mention rows="3" placeholder="optional">${esc(it.decision)}</textarea></label></div>
        <div class="hm-foot"><button class="btn" data-hm-prev ${i === 0 ? "disabled" : ""}>← Vorheriges</button><button class="btn" data-hm-save>Speichern</button><button class="btn primary" data-hm-next>${i < items.length - 1 ? "Nächstes →" : "+ Neues Traktandum"}</button></div>`;
      applyTaHeights(box); addDictate(box);
      const ta = box.querySelector('[data-hm-k="notes"]'); if (ta) ta.focus();
    };
    hmDraw = draw;
    const zu = () => { clearInterval(tick); box.remove(); hmDraw = null; if (ed) renderEntryDrawer(); };
    const neu = () => { ed.draft.items.push({ id: uid(), title: "", notes: "", decision: "", links: [] }); i = ed.draft.items.length - 1; draw(); const ti = box.querySelector(".hm-title"); if (ti) ti.focus(); };
    box.oninput = (e) => { const k = e.target.dataset.hmK; if (!k || !ed) return; ed.draft.items[i][k] = e.target.value; ed.touched = true; autosaveDraft(); if (k === "title") { const nb = box.querySelector(`[data-hm-go="${i}"]`); if (nb) nb.textContent = `${i + 1}. ${(e.target.value || "Ohne Titel").slice(0, 32)}`; } };
    box.onclick = async (e) => {
      if (e.target.closest("[data-hm-close]")) return zu();
      const g = e.target.closest("[data-hm-go]"); if (g) { i = +g.dataset.hmGo; return draw(); }
      if (e.target.closest("[data-hm-add]")) return neu();
      if (e.target.closest("[data-hm-prev]")) { i--; return draw(); }
      if (e.target.closest("[data-hm-next]")) { if (i < ed.draft.items.length - 1) { i++; draw(); } else neu(); return; }
      if (e.target.closest("[data-hm-save]")) { await saveEntry(true); if (document.body.contains(box)) draw(); }
    };
    box.onkeydown = (e) => {
      if (e.key === "Escape" && !mbox.box) { e.stopPropagation(); return zu(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight") { e.preventDefault(); if (i < ed.draft.items.length - 1) { i++; draw(); } }
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowLeft") { e.preventDefault(); if (i > 0) { i--; draw(); } }
    };
    const tick = setInterval(() => { const c = box.querySelector("#hm-clock"); if (c) c.textContent = `${Math.floor((Date.now() - t0) / 60000)} Min.`; }, 20000);
    draw();
  }

  // ---------- Höck als Outlook-Termin (.ics) ----------
  function icsDownload(h) {
    if (!h.date) return toast("Bitte zuerst ein Datum eintragen.");
    const [hh, mm] = String(h.time || "19:30").split(":").map((x) => parseInt(x, 10) || 0);
    const p2 = (n) => String(n).padStart(2, "0");
    const stamp = (dIso, H, M) => `${dIso.replace(/-/g, "")}T${p2(H)}${p2(M)}00`;
    let endDate = h.date, eH = hh + 2; if (eH >= 24) { eH -= 24; endDate = addDays(h.date, 1); }
    const escI = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    const fold = (line) => { const out = []; let s = line; while (s.length > 60) { out.push(s.slice(0, 60)); s = " " + s.slice(60); } out.push(s); return out.join("\r\n"); };
    const title = h.title || HK[h.kind || "LaLei"].label;
    const offen = openIdeas().map((x) => "- " + x.title);
    const url = (STORE.appUrl && STORE.appUrl()) || location.href.split("#")[0];
    const desc = [h.note, offen.length ? "Offene Traktanden:\n" + offen.join("\n") : "", "Lager-Tool: " + url].filter(Boolean).join("\n\n");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cevi Staefa-Hombi//Lager-Tool//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VTIMEZONE", "TZID:Europe/Zurich", "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
      "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE",
      "BEGIN:VEVENT", `UID:${h._id || uid()}-${state.lagerId}@lager-tool`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
      `DTSTART;TZID=Europe/Zurich:${stamp(h.date, hh, mm)}`, `DTEND;TZID=Europe/Zurich:${stamp(endDate, eH, mm)}`,
      `SUMMARY:${escI(title + (lagerDoc().title ? " · " + lagerDoc().title : ""))}`, h.place ? `LOCATION:${escI(h.place)}` : "", `DESCRIPTION:${escI(desc)}`,
      "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Erinnerung", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).map(fold);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" }));
    a.download = `${title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "Hoeck"} ${h.date}.ics`; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast("Kalender-Datei erstellt. Öffnen trägt den Höck in Outlook ein; dort kannst du ihn als Einladung weiterleiten.");
  }
