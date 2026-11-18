  // =====================================================================
  // Runde 5, Teil 4: Start anpassen, «Dein Ressort», Wetter, «Heute» im Lager, eigene Lager-Check-Punkte,
  // Glocke (Arten stumm, einzeln weg), Verlauf nach Person, Suche verzeiht Tippfehler, Infos sortieren,
  // Dokumente (neu, Stichworte, Vorschau), Bilder gross, leere Seiten mit Knopf, Monatskalender
  // =====================================================================
  const kannLL = () => isLaLei() && !isReadOnly() && !isClosed() && !state.asTeam;

  // ---------- Wetter auf dem Start (im Lager und 7 Tage davor), Warnung extra ----------
  function wetterNaehe() { const r = campRange(); if (!r.from || !cfg().ort) return false; const t0 = iso(today()); return t0 >= addDays(r.from, -7) && t0 <= (r.to || r.from); }
  function wetterKarte() {
    if (!wetterNaehe()) return ""; loadWeather(); const w = state.weather || {}; const t0 = iso(today()); const r = campRange();
    const tage = []; for (let i = 0; i < 5; i++) { const d = addDays(t0, i); if (r.to && d > r.to) break; tage.push(d); }
    const warn = tage.map((d) => [d, weatherWarn(w[d])]).filter(([, x]) => x.length);
    return `${warn.length ? `<div class="wx-alarm" data-karte="wetterwarnung"><b>⚠ Wetterwarnung</b>${warn.map(([d, x]) => `<div>${d === t0 ? "Heute" : fmt(d)}: ${esc(x.join(" · "))}</div>`).join("")}</div>` : ""}
      <section class="card st-card" data-karte="wetter"><div class="card-head"><h2>Wetter</h2><span class="muted">${esc(cfg().ort.name || "")}</span></div><div class="wx-tage">${tage.map((d) => { const x = w[d]; return `<div class="wx-tag ${weatherWarn(x).length ? "warn" : ""}"><span>${d === t0 ? "Heute" : WD[parse(d).getDay()]}</span><b>${x ? (WCODE[x.code] || ["🌡"])[0] : "–"}</b><span>${x ? `${Math.round(x.min)}° / ${Math.round(x.max)}°` : ""}</span><small>${x ? `${x.prob ?? 0} %` : ""}</small></div>`; }).join("")}</div></section>`;
  }

  // ---------- «Dein Ressort» ----------
  function deinRessortKarte() {
    const n = me(); const rs = ressorts().filter((r) => r.lead === n || r.stv === n || subsOf(r).some((s) => s.lead === n || s.stv === n)); if (!rs.length) return "";
    return `<section class="card st-card" data-karte="ressort"><div class="card-head"><h2>${rs.length > 1 ? "Deine Ressorts" : "Dein Ressort"}</h2></div><div class="st-list">${rs.map((r) => { const l = allTasks().filter((t) => t.ressort === r.name && t.status !== "Erledigt"); const late = l.filter(isLate).length;
      return `<button class="st-row" data-ress-page="${esc(r.id)}">${ressDot(r.name)}<span class="st-t">${esc(r.name)}<small>${l.length} offen${late ? ` · <span class="late-n">${late} überfällig</span>` : ""}</small></span><span class="st-go">›</span></button>`; }).join("")}</div></section>`;
  }

  // ---------- Start: Karten anpassen ----------
  const KARTEN = { wetter: "Wetter", ressort: "Dein Ressort", heute: "Heute im Lager", fuerdich: "Für dich", hoeck: "Nächster Höck", neu: "Neu für dich", zuletzt: "Zuletzt angesehen", links: "Schnelllinks", akt: "Schnelle Aktionen" };
  const startPref = () => { try { return JSON.parse(store.get("lalei-start-karten") || "{}"); } catch { return {}; } };
  function karteSchluessel(sec) {
    if (sec.dataset.karte) return sec.dataset.karte; if (sec.classList.contains("st-akt")) return "akt"; if (sec.classList.contains("st-links")) return "links";
    const h = ($("h2", sec) || {}).textContent || ""; if (/Heute im Lager/.test(h)) return "heute"; if (/Für dich/.test(h)) return "fuerdich"; if (/Nächster Höck/.test(h)) return "hoeck"; if (/Neu für dich/.test(h)) return "neu"; if (/Zuletzt/.test(h)) return "zuletzt"; return "";
  }
  const startUpdateOrigR = views.start.update;
  views.start.update = function () {
    if (heuteModus()) return heuteRender();
    startUpdateOrigR(); const b = $("#start-body"); if (!b) return;
    const hero = $(".st-hero", b), akt = $(".st-akt", b);
    (akt || hero).insertAdjacentHTML("afterend", wetterKarte() + deinRessortKarte());
    const p = startPref(); const aus = new Set(p.aus || []); const ord = p.ordnung || [];
    [...b.children].forEach((sec) => { const k = karteSchluessel(sec); if (!k) return; sec.dataset.karte = k; sec.hidden = aus.has(k) && k !== "wetterwarnung"; const i = ord.indexOf(k); if (i >= 0) sec.style.order = String(10 + i); });
    b.insertAdjacentHTML("beforeend", `<div class="st-anpassen"><button class="link" data-start-anpassen>Start anpassen</button></div>`);
  };
  function startAnpassen() {
    const p = startPref(); let ord = (p.ordnung || []).filter((k) => KARTEN[k]); for (const k of Object.keys(KARTEN)) if (!ord.includes(k)) ord.push(k); const aus = new Set(p.aus || []);
    const o = modal("", ""); const draw = () => { o.querySelector(".modal").innerHTML = `<div class="lg-head"><span class="eyebrow">Start</span><h2>Start anpassen</h2></div><div class="sa-liste">${ord.map((k, i) => `<div class="sa-row"><label class="toggle"><input type="checkbox" data-sa="${k}" ${aus.has(k) ? "" : "checked"}> ${KARTEN[k]}</label><span class="ag-move"><button type="button" data-sa-up="${i}" ${i ? "" : "disabled"} aria-label="Nach oben">↑</button><button type="button" data-sa-down="${i}" ${i < ord.length - 1 ? "" : "disabled"} aria-label="Nach unten">↓</button></span></div>`).join("")}</div><div class="lg-foot"><button class="link" data-sa-reset>Zurücksetzen</button><button class="btn primary" data-sa-ok>Fertig</button></div>`; };
    const sichern = () => { store.set("lalei-start-karten", JSON.stringify({ ordnung: ord, aus: [...aus] })); };
    o.onclick = (e) => {
      if (e.target === o || e.target.closest("[data-sa-ok]")) { sichern(); closeDrawer(); return views.start.update(); }
      if (e.target.closest("[data-sa-reset]")) { store.set("lalei-start-karten", ""); closeDrawer(); return views.start.update(); }
      const c = e.target.closest("[data-sa]"); if (c) { c.checked ? aus.delete(c.dataset.sa) : aus.add(c.dataset.sa); return; }
      const u = e.target.closest("[data-sa-up]"); if (u) { const i = +u.dataset.saUp; [ord[i - 1], ord[i]] = [ord[i], ord[i - 1]]; return draw(); }
      const d = e.target.closest("[data-sa-down]"); if (d) { const i = +d.dataset.saDown; [ord[i + 1], ord[i]] = [ord[i], ord[i + 1]]; return draw(); }
    };
    draw();
  }
  view.addEventListener("click", (e) => { if (e.target.closest("[data-start-anpassen]")) startAnpassen(); });

  // ---------- «Heute» im Lager (Handy, während des Lagers) ----------
  const heuteModus = () => istHandy() && isCampNow() && isLaLei() && days().some((d) => d.date === iso(today()));
  function heuteRender() {
    const b = $("#start-body"); if (!b) return; const n = me(); const t0 = iso(today()); const d = days().find((x) => x.date === t0); const r = campRange();
    const nr = daysBetween(parse(r.from), today()) + 1, total = daysBetween(parse(r.from), parse(r.to)) + 1;
    const plan = planDoc(); const dienste = plan.services.filter((s) => ((plan.cells || {})[d.id + "|" + s.id] || []).includes(n)).map((s) => s.name);
    const p = dayPage(d.id); const todo = ((p.blocks || []).find((x) => x.type === "todo") || { items: [] }); const wichtig = ((p.blocks || []).find((x) => x.type === "important") || { items: [] });
    const h = heuteDa(d.id); const fokus = allTasks().filter((t) => t.status !== "Erledigt" && (t.owner === n || t.support === n) && t.deadline && t.deadline <= t0);
    b.innerHTML = `<section class="st-hero heute-hero"><div class="st-zeit"><b>Tag ${nr} von ${total}</b><span>${esc(d.label)} · ${fmt(t0)}</span></div><div class="st-stand"><button data-st-day="${esc(d.id)}"><b>${todo.items.filter((x) => !x.done).length}</b><span>To-dos heute</span></button><button data-goto="attendance"><b>${h.da.length}</b><span>da</span></button><button class="sos-k" data-heute-sos><b>☎</b><span>Notfall</span></button></div></section>
      ${wetterKarte()}
      <section class="card st-card"><div class="card-head"><h2>Dein Dienst</h2><button class="link" data-goto="plan">Schichtplan</button></div><div class="card-body">${dienste.length ? `<b>${esc(dienste.join(", "))}</b>` : '<span class="muted">Heute kein Dienst.</span>'}</div></section>
      ${wichtig.items.length ? `<section class="card st-card"><div class="card-head"><h2>Wichtig heute</h2></div><div class="card-body stack" style="gap:6px">${wichtig.items.map((x) => `<div class="rich">${rich(x.t)}</div>`).join("")}</div></section>` : ""}
      <section class="card st-card"><div class="card-head"><h2>To-dos heute</h2><button class="link" data-st-day="${esc(d.id)}">Tagesseite</button></div><div class="card-body stack" style="gap:4px">${todo.items.length ? todo.items.map((x) => `<label class="check-item ${x.done ? "done" : ""}"><input type="checkbox" data-bi-done="todo|${esc(x.id)}" ${x.done ? "checked" : ""}><span class="rich">${rich(x.t)}</span></label>`).join("") : '<span class="muted">Keine To-dos.</span>'}</div></section>
      ${fokus.length ? `<section class="card st-card"><div class="card-head"><h2>Deine fälligen Aufgaben</h2></div><div class="st-list">${fokus.slice(0, 5).map((t) => `<button class="st-row" data-open="${esc(t._id)}"><span class="st-t">${esc(t.title)}<small>${esc(t.ressort)}</small></span><span class="st-go">›</span></button>`).join("")}</div></section>` : ""}
      <section class="st-links">${[["count", "Abzählen"], ["rooms", "Einteilung"], ["days", "Alle Tage"], ["overview", "Übersicht"]].map(([v, l]) => `<button data-goto="${v}">${l}<span aria-hidden="true">›</span></button>`).join("")}</section>`;
    state.dayId = d.id;
  }
  view.addEventListener("click", (e) => { if (e.target.closest("[data-heute-sos]")) showSos(); });

  // ---------- Lager-Check: eigene Punkte ----------
  const eigene = () => (Array.isArray(cfg().checkEigene) ? cfg().checkEigene : []);
  const checkItemsOrigR = checkItems;
  checkItems = function () { return [...checkItemsOrigR(), ...eigene().map((x) => [!!x.done, x.t, x.done ? "erledigt" : "offen", "eigen|" + x.id])]; };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest('[data-go-tab^="eigen|"]'); if (!b) return; e.stopPropagation(); e.stopImmediatePropagation(); if (!kannLL()) return;
    const id = b.dataset.goTab.split("|")[1]; writeConfig({ checkEigene: eigene().map((x) => (x.id === id ? { ...x, done: !x.done, by: me(), at: nowStamp() } : x)) });
  }, true);
  const ovUpdateOrigR = views.overview.update;
  views.overview.update = function () {
    ovUpdateOrigR(); const head = $("#ov-check") && $("#ov-check").closest(".card") && $(".card-head", $("#ov-check").closest(".card"));
    if (head && kannLL() && !$("[data-eigen-add]", head)) head.insertAdjacentHTML("beforeend", '<button class="btn small" data-eigen-add>+ Eigener Punkt</button>');
    // Verlauf: nach Person filtern
    const log = $("#ov-log"); if (log && !$("#log-wer", log.parentElement)) { const namen = [...new Set([...log.querySelectorAll(".log-row b")].map((x) => x.textContent))].sort(); if (namen.length > 1) log.insertAdjacentHTML("beforebegin", `<div class="toolbar"><select id="log-wer" class="input" aria-label="Person"><option value="">Alle Personen</option>${namen.map((n) => `<option ${n === state.logWer ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>`); }
    logFiltern();
  };
  function logFiltern() { const log = $("#ov-log"); if (!log) return; const w = state.logWer || ""; log.querySelectorAll(".log-row").forEach((r) => (r.hidden = !!w && ($("b", r) || {}).textContent !== w)); log.querySelectorAll(".sec-label").forEach((s) => { let n = s.nextElementSibling, sicht = false; while (n && !n.classList.contains("sec-label")) { if (!n.hidden) sicht = true; n = n.nextElementSibling; } s.hidden = !sicht; }); }
  view.addEventListener("change", (e) => { if (e.target.id === "log-wer") { state.logWer = e.target.value; logFiltern(); } });
  view.addEventListener("click", (e) => {
    if (!e.target.closest("[data-eigen-add]")) return;
    const o = modal(`<div class="lg-head"><span class="eyebrow">Lager-Check</span><h2>Eigene Punkte</h2></div><div class="sa-liste">${eigene().map((x) => `<div class="sa-row"><span>${esc(x.t)}</span><button class="btn small ghost danger" data-eigen-rm="${esc(x.id)}">Entfernen</button></div>`).join("")}</div><input id="eigen-t" class="input" placeholder="z.B. Lagerhaus-Schlüssel abgeholt"><div class="lg-foot"><button class="link" data-eigen-zu>Fertig</button><button class="btn primary" data-eigen-ok>Hinzufügen</button></div>`);
    setTimeout(() => $("#eigen-t", o).focus(), 30);
    o.onclick = async (ev) => { if (ev.target === o || ev.target.closest("[data-eigen-zu]")) return closeDrawer(); const rm = ev.target.closest("[data-eigen-rm]"); if (rm) { await writeConfig({ checkEigene: eigene().filter((x) => x.id !== rm.dataset.eigenRm) }); closeDrawer(); return; }
      if (ev.target.closest("[data-eigen-ok]")) { const v = $("#eigen-t", o).value.trim(); if (!v) return; await writeConfig({ checkEigene: [...eigene(), { id: uid(), t: v, done: false }] }); closeDrawer(); toast("Punkt hinzugefügt"); } };
  });

  // ---------- Glocke: Arten stumm schalten, Meldungen einzeln wegwischen ----------
  const ARTEN = { mitteilung: "Neue Mitteilungen", zugeteilt: "Mir zugeteilte oder geänderte Aufgaben", erwaehnung: "Erwähnungen", deadline: "Bald fällige Aufgaben", eingang: "Eingang", antwort: "Antworten auf mein Feedback", toolfb: "Feedback zum Tool" };
  const artVon = (k) => (k.startsWith("tf") ? "toolfb" : k.startsWith("tm") || k.startsWith("m") || k.startsWith("h") ? "erwaehnung" : k.startsWith("t") ? "zugeteilt" : k.startsWith("b") ? "mitteilung" : k.startsWith("d") ? "deadline" : k.startsWith("i") ? "eingang" : k.startsWith("f") ? "antwort" : "");
  const glockeAus = () => new Set((state.todos || {}).glockeAus || []);
  const wegKey = () => `lalei-glocke-weg-${state.lagerId}-${myId()}`;
  const wegSet = () => { try { return new Set(JSON.parse(store.get(wegKey()) || "[]")); } catch { return new Set(); } };
  const bellItemsOrigR = bellItems;
  bellItems = function () { const aus = glockeAus(), weg = wegSet(); return bellItemsOrigR().filter((x) => !aus.has(artVon(x.key)) && !weg.has(x.key)); };
  const bellOpenOrigR = bellOpen;
  bellOpen = function () {
    bellOpenOrigR(); const o = $(".overlay"); if (!o) return; const items = bellItems(); const rows = [...o.querySelectorAll(".bell-row")];
    // Reihenfolge nach dem Öffnen kann sich ändern: Schlüssel über den Text zuordnen
    const nurText = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d.textContent.trim(); };
    rows.forEach((r) => { const t = ($(".bell-t", r) || {}).textContent.trim(); const it = items.find((x) => nurText(x.text) === t); if (!it) return; r.insertAdjacentHTML("afterend", `<button class="bell-weg" data-bell-weg="${esc(it.key)}" aria-label="Meldung entfernen" title="Entfernen">✕</button>`); r.nextElementSibling.style.order = r.style.order; });
    o.querySelectorAll(".bell-row").forEach((r) => { const w = r.nextElementSibling; if (w && w.matches(".bell-weg")) { const wrap = document.createElement("div"); wrap.className = "bell-zeile"; r.before(wrap); wrap.append(r, w); } });
    const foot = $(".lg-foot", o); if (foot) foot.firstElementChild.outerHTML = '<button class="link" data-bell-arten>Was soll erscheinen?</button>';
  };
  document.addEventListener("click", (e) => {
    const w = e.target.closest && e.target.closest("[data-bell-weg]"); if (w) { e.stopPropagation(); const s = wegSet(); s.add(w.dataset.bellWeg); store.set(wegKey(), JSON.stringify([...s].slice(-300))); w.closest(".bell-zeile").remove(); bellPaint(); appbarPaint(); return; }
    if (e.target.closest && e.target.closest("[data-bell-arten]")) { e.stopPropagation(); glockeArten(); }
  }, true);
  function glockeArten() {
    const aus = glockeAus(); const arten = Object.entries(ARTEN).filter(([k]) => isLaLei() || ["mitteilung", "antwort"].includes(k));
    const o = modal(`<div class="lg-head"><span class="eyebrow">Glocke</span><h2>Was soll erscheinen?</h2></div><div class="sa-liste">${arten.map(([k, l]) => `<label class="toggle sa-row"><input type="checkbox" data-ga="${k}" ${aus.has(k) ? "" : "checked"}> ${l}</label>`).join("")}</div><div class="lg-foot"><span></span><button class="btn primary" data-ga-ok>Fertig</button></div>`);
    o.onclick = (e) => { if (!(e.target === o || e.target.closest("[data-ga-ok]"))) return; const neu = [...o.querySelectorAll("[data-ga]")].filter((c) => !c.checked).map((c) => c.dataset.ga);
      state.todos = { ...(state.todos || {}), glockeAus: neu }; state.db.doc("todos/" + myId()).set({ ...(state.todos || {}), items: todoItems(), glockeAus: neu, updatedAt: nowStamp() }).catch(handleWriteError); closeDrawer(); bellPaint(); appbarPaint(); };
  }

  // ---------- Suche verzeiht Tippfehler ----------
  function abstand(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const m = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) m[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; }
  function unscharf(text, q) { const ws = String(text).toLowerCase().split(/[^\p{L}\p{N}]+/u); return String(q).toLowerCase().split(/\s+/).filter((x) => x.length >= 4).every((w) => ws.some((x) => x.length >= 3 && (x.includes(w) || abstand(x.slice(0, w.length + 1), w) <= (w.length > 6 ? 2 : 1)))); }
  const befehleOrigR = befehle;
  befehle = function (q) {
    const out = befehleOrigR(q); const s = String(q || "").trim(); if (s.length < 4 || !isLaLei() || out.some((x) => x.g === "Aufgaben")) return out;
    const fu = allTasks().filter((t) => unscharf(t.title, s)).slice(0, 6).map((t) => ({ g: "Ähnlich geschrieben", l: t.title, s: t.ressort, attr: `data-open="${esc(t._id)}"` }));
    return [...out.filter((x) => x.g === "Erstellen"), ...fu, ...out.filter((x) => x.g !== "Erstellen")];
  };
  const tasksUpdateOrigR = views.tasks.update;
  views.tasks.update = function () {
    tasksUpdateOrigR(); const q = (state.filter.q || "").trim(); const box = $("#task-list"); if (!box || q.length < 4 || box.querySelector("tr.task, .kb-card")) return;
    const v = allTasks().find((t) => unscharf(t.title, q)); if (!v) return;
    const wort = String(v.title).split(/\s+/).find((x) => q.toLowerCase().split(/\s+/).some((w) => w.length >= 4 && abstand(x.toLowerCase().slice(0, w.length + 1), w) <= 2)) || v.title;
    box.insertAdjacentHTML("afterbegin", `<div class="card-body meintest">Meintest du <button class="link" data-meintest="${esc(wort.replace(/[.,;:]$/, ""))}">«${esc(wort.replace(/[.,;:]$/, ""))}»</button>?</div>`);
  };
  view.addEventListener("click", (e) => { const m = e.target.closest("[data-meintest]"); if (!m) return; state.filter.q = m.dataset.meintest; const f = $("#f-q"); if (f) f.value = state.filter.q; views.tasks.update(); });

  // ---------- Infos-Abschnitte per Ziehen sortieren (PC) ----------
  let infoZiehe = null;
  const infosUpdateOrigR = views.infos.update;
  views.infos.update = function () { infosUpdateOrigR(); if (!kannLL()) return; document.querySelectorAll("#info-body .info-sec").forEach((s, i) => { s.draggable = true; s.dataset.infoI = i; s.classList.add("ziehbar"); }); };
  view.addEventListener("dragstart", (e) => { const s = e.target.closest && e.target.closest("#info-body .info-sec"); if (s) infoZiehe = +s.dataset.infoI; });
  view.addEventListener("dragover", (e) => { const s = infoZiehe !== null && e.target.closest && e.target.closest("#info-body .info-sec"); if (s) { e.preventDefault(); document.querySelectorAll(".info-sec.drop-vor").forEach((x) => x.classList.remove("drop-vor")); s.classList.add("drop-vor"); } });
  view.addEventListener("drop", (e) => { const s = infoZiehe !== null && e.target.closest && e.target.closest("#info-body .info-sec"); if (!s) return; e.preventDefault(); const von = infoZiehe, nach = +s.dataset.infoI; infoZiehe = null; if (von === nach) return; const secs = ((state.info || {}).sections || []).slice(); const [x] = secs.splice(von, 1); secs.splice(nach, 0, x); saveInfo(secs).then(() => toast("Reihenfolge gespeichert")); });
  view.addEventListener("dragend", () => { infoZiehe = null; document.querySelectorAll(".info-sec.drop-vor").forEach((x) => x.classList.remove("drop-vor")); });

  // ---------- Dokumente: neu markieren, Stichworte ----------
  const docSeenKey = () => `lalei-docs-gesehen-${state.lagerId}-${myId()}`;
  const docsUpdateOrigR = views.docs.update;
  views.docs.update = function () {
    docsUpdateOrigR(); const list = $("#doc-list"); if (!list) return; const all = alleDokumente();
    let seen = null; try { seen = JSON.parse(store.get(docSeenKey()) || "null"); } catch {}
    if (Array.isArray(seen)) { const s = new Set(seen); list.querySelectorAll(".doc-row").forEach((r) => { const a = $("a", r); if (a && !s.has(a.getAttribute("title") || a.href)) a.insertAdjacentHTML("afterend", '<span class="tag next doc-neu">neu</span>'); }); }
    clearTimeout(state.docSeenT); state.docSeenT = setTimeout(() => store.set(docSeenKey(), JSON.stringify(all.map((d) => d.l.url).slice(-800))), 3000);
    // Stichworte: Ort (Infos, Ressort, Aufgabe …) und #Wörter im Titel
    const tags = new Map(); for (const d of all) { const ort = d.wo.split(" › ")[0].replace(/^Ressort .*/, (m) => m); tags.set(ort, (tags.get(ort) || 0) + 1); for (const h of String(d.title).match(/#[\p{L}\p{N}_-]+/gu) || []) tags.set(h, (tags.get(h) || 0) + 1); }
    const bar = $(".doc-types"); if (bar && !$(".doc-tags")) bar.insertAdjacentHTML("afterend", `<div class="doc-tags">${[...tags.entries()].filter(([, n]) => n > 0).map(([t]) => `<button type="button" class="tagchip ${state.docTag === t ? "on" : ""}" data-doc-tag="${esc(t)}">${esc(t)}</button>`).join("")}</div>`);
    if (state.docTag) list.querySelectorAll(".doc-row").forEach((r) => { const txt = r.textContent; r.hidden = !txt.includes(state.docTag); });
  };
  view.addEventListener("click", (e) => { const t = e.target.closest("[data-doc-tag]"); if (!t) return; state.docTag = state.docTag === t.dataset.docTag ? "" : t.dataset.docTag; render(); });

  // ---------- Bilder gross ansehen, Dokumente im Tool ansehen ----------
  function viewer(eintraege, start) {
    let i = start; const box = document.createElement("div"); box.className = "viewer"; document.body.appendChild(box);
    const draw = () => { const x = eintraege[i]; const bild = x.typ === "bild";
      box.innerHTML = `<div class="vw-top"><span>${esc(x.title || "")}</span><span class="vw-acts"><a class="btn small" href="${esc(x.href)}" target="_blank" rel="noopener" ${x.download ? `download="${esc(x.title || "Datei")}"` : ""}>Öffnen</a><button class="btn small" data-vw-zu aria-label="Schliessen">✕</button></span></div>
        <div class="vw-main">${bild ? `<img src="${esc(x.href)}" alt="${esc(x.title || "Bild")}">` : `<iframe src="${esc(x.href)}" title="${esc(x.title || "Dokument")}"></iframe>`}</div>
        ${eintraege.length > 1 ? `<button class="vw-nav vw-prev" data-vw="-1" aria-label="Vorheriges" ${i ? "" : "disabled"}>‹</button><button class="vw-nav vw-next" data-vw="1" aria-label="Nächstes" ${i < eintraege.length - 1 ? "" : "disabled"}>›</button><div class="vw-n">${i + 1} / ${eintraege.length}</div>` : ""}`; };
    const zu = () => { box.remove(); document.removeEventListener("keydown", tasten, true); };
    const tasten = (e) => { if (e.key === "Escape") { e.stopPropagation(); zu(); } if (e.key === "ArrowRight" && i < eintraege.length - 1) { i++; draw(); } if (e.key === "ArrowLeft" && i > 0) { i--; draw(); } };
    document.addEventListener("keydown", tasten, true);
    box.onclick = (e) => { if (e.target.closest("[data-vw-zu]") || e.target === box || e.target.classList.contains("vw-main")) return zu(); const n = e.target.closest("[data-vw]"); if (n) { i = Math.max(0, Math.min(eintraege.length - 1, i + +n.dataset.vw)); draw(); } };
    let sx = null; box.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 60) { const ni = i + (dx < 0 ? 1 : -1); if (ni >= 0 && ni < eintraege.length) { i = ni; draw(); } } });
    draw();
  }
  const ansehbar = (a) => { const href = a.getAttribute("href") || ""; if (!href || href === "#") return ""; const typ = fileType({ url: href, title: a.getAttribute("download") || a.getAttribute("title") || a.textContent, image: a.classList.contains("file-img") }); if (typ === "bild") return "bild"; if (typ === "pdf" && (href.startsWith("data:") || href.startsWith("blob:") || /\.pdf(\?|$)/i.test(href))) return "pdf"; return ""; };
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("#view a[href], .overlay .drawer a[href], .modal a[href]"); if (!a || e.ctrlKey || e.metaKey || a.closest(".viewer")) return; const typ = ansehbar(a); if (!typ) return;
    e.preventDefault(); const gruppe = a.closest(".file-list, .links, .doc-rows, .card-body, .drawer-body") || document.body;
    const alle = [...gruppe.querySelectorAll("a[href]")].map((x) => ({ el: x, typ: ansehbar(x) })).filter((x) => x.typ === typ);
    viewer(alle.map((x) => ({ typ: x.typ, href: x.el.getAttribute("href"), title: x.el.getAttribute("download") || x.el.getAttribute("title") || x.el.textContent.trim(), download: x.el.hasAttribute("download") })), Math.max(0, alle.findIndex((x) => x.el === a)));
  }, true);

  // ---------- Leere Seiten: ein Knopf statt Text ----------
  const LEER = { board: ["data-board-new", "+ Erste Mitteilung schreiben"], infos: ["data-info-add", "+ Ersten Abschnitt erstellen"], tasks: ["data-leer-task", "+ Erste Aufgabe erfassen"], journal: ['data-new-entry="meeting"', "+ Erstes Protokoll erfassen"] };
  const renderOrigR = render;
  render = function () { renderOrigR(); leerKnoepfe(); };
  const refreshOrigR = refresh;
  refresh = function (f) { refreshOrigR(f); leerKnoepfe(); };
  function leerKnoepfe() {
    const k = LEER[state.view]; if (!k || !kannLL()) return;
    document.querySelectorAll("#view .empty").forEach((el) => { if (el.dataset.leer || el.closest(".kb-col, .meintest")) return; const b = $("b", el); if (!b || !/^Noch (keine|kein)/.test(b.textContent)) return; el.dataset.leer = "1"; el.innerHTML = `<button class="btn primary leer-btn" ${k[0]}>${k[1]}</button>`; });
  }
  view.addEventListener("click", (e) => { if (e.target.closest("[data-leer-task]")) openTask("_new"); });

  // ---------- Monatskalender ----------
  HELP.kalender = "Alle Deadlines, Höcks, Meilensteine und Lagertage in einer Monatsansicht. Tag antippen für die Einzelheiten.";
  state.kalMonat = state.kalMonat || iso(new Date(today().getFullYear(), today().getMonth(), 1));
  function kalEintraege(d) {
    const out = []; const n = me();
    for (const m of milestones()) if (m.date === d) out.push({ k: "ms", t: m.name });
    for (const h of state.hoecks) if (h.date === d) out.push({ k: "hoeck", t: h.title || HK[h.kind || "LaLei"].label, attr: `data-open-hoeck="${esc(h._id)}"` });
    for (const x of days()) if (x.date === d) out.push({ k: "lager", t: x.label });
    for (const t of allTasks()) if (t.deadline === d && t.status !== "Erledigt") out.push({ k: t.owner === n || t.support === n ? "mein" : "task", t: t.title, attr: `data-open="${esc(t._id)}"`, late: isLate(t) });
    return out;
  }
  views.kalender = {
    shell: () => `${pageHead("Kalender", "")}<div class="kal-nav"><button class="btn small" data-kal="-1" aria-label="Vorheriger Monat">‹</button><b id="kal-titel"></b><button class="btn small" data-kal="1" aria-label="Nächster Monat">›</button><button class="link" data-kal="0">Heute</button></div><section class="card"><div id="kal-grid" class="kal-grid"></div></section><section class="card" id="kal-tag"></section>`,
    update() {
      const m0 = parse(state.kalMonat); const y = m0.getFullYear(), mo = m0.getMonth(); $("#kal-titel").textContent = `${MONTHS[mo]} ${y}`;
      const erster = new Date(y, mo, 1); const start = new Date(erster.getTime() - ((erster.getDay() + 6) % 7) * DAY); const t0 = iso(today());
      let html = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => `<div class="kal-wd">${w}</div>`).join("");
      for (let i = 0; i < 42; i++) { const dt = new Date(start.getTime() + i * DAY); const d = iso(dt); const e = kalEintraege(d); const anders = dt.getMonth() !== mo;
        if (i >= 35 && anders && dt.getDate() < 8) break;
        const punkte = ["ms", "hoeck", "lager", "mein", "task"].filter((k) => e.some((x) => x.k === k)).map((k) => `<i class="kp kp-${k}"></i>`).join("");
        html += `<button class="kal-d ${anders ? "anders" : ""} ${d === t0 ? "heute" : ""} ${d === state.kalTag ? "sel" : ""} ${inPause(d, d) ? "pause" : ""}" data-kal-tag="${d}"><span>${dt.getDate()}</span><span class="kal-p">${punkte}</span>${e.length && window.innerWidth > 760 ? `<span class="kal-t">${esc(e[0].t.slice(0, 18))}${e.length > 1 ? ` +${e.length - 1}` : ""}</span>` : ""}</button>`; }
      $("#kal-grid").innerHTML = html;
      const tag = state.kalTag || t0; const e = kalEintraege(tag);
      $("#kal-tag").innerHTML = `<div class="card-head"><h2>${fmt(tag)} ${parse(tag).getFullYear()}</h2></div><div class="st-list">${e.length ? e.map((x) => `<${x.attr ? "button" : "div"} class="st-row" ${x.attr || ""}><i class="kp kp-${x.k}"></i><span class="st-t">${esc(x.t)}<small>${{ ms: "Meilenstein", hoeck: "Höck", lager: "Lagertag", mein: "Deine Aufgabe", task: "Aufgabe" }[x.k]}${x.late ? " · überfällig" : ""}</small></span>${x.attr ? '<span class="st-go">›</span>' : ""}</${x.attr ? "button" : "div"}>`).join("") : '<div class="card-body muted">Nichts an diesem Tag.</div>'}</div>`;
    },
  };
  view.addEventListener("click", (e) => {
    const n = e.target.closest("[data-kal]"); if (n) { const v = +n.dataset.kal; const m = parse(state.kalMonat); state.kalMonat = v ? iso(new Date(m.getFullYear(), m.getMonth() + v, 1)) : iso(new Date(today().getFullYear(), today().getMonth(), 1)); if (!v) state.kalTag = iso(today()); return views.kalender.update(); }
    const t = e.target.closest("[data-kal-tag]"); if (t) { state.kalTag = t.dataset.kalTag; views.kalender.update(); }
  });
  (() => { const z = $('#tabs button[data-view="timeline"]'); if (z) z.insertAdjacentHTML("afterend", `<button role="tab" data-view="kalender" data-roles="lalei"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="8" cy="14.5" r="1"/><circle cx="12" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/></svg>Kalender</button>`); })();
