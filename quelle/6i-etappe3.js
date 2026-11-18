  // =====================================================================
  // Etappe 3: Glocke (Mitteilungen, Erwähnungen, Deadlines), Feedback zum Tool, Pinnwand an Auswahl
  // und Reaktionen, Pausen, eigene Notfall-Liste, «Wer ist heute da», «Tag 3 von 7», Mindestbesetzung,
  // Tour für die Lagerleitung
  // =====================================================================
  NEUES.unshift({ id: "2026-11-etappe3", titel: "Neu: Glocke, Pinnwand und Lager", punkte: [
    "Die <b>Glocke</b> 🔔 oben zeigt, was neu ist: Mitteilungen, Erwähnungen, dir zugeteilte Aufgaben und bald fällige Deadlines.",
    "<b>Feedback zum Tool</b> geht direkt an die Verantwortlichen des Tools (Einstellungen oder unten links).",
    "Mitteilungen auf der Pinnwand gehen ans ganze Team oder an <b>ausgewählte Personen</b>. Alle können mit einem Emoji <b>reagieren</b>.",
    "Infos-Abschnitte können <b>nur für die Lagerleitung</b> sichtbar sein.",
    "<b>Mehrere Pausen</b> im Zeitplan, eine eigene <b>Notfall-Liste</b>, <b>Mindestbesetzung</b> pro Dienst und im Lager «Wer ist heute da» und «Tag 3 von 7».",
  ] });
  Object.assign(ERR, { TEXT_FEHLT: "Bitte einen Text eingeben." });

  // ---------- Pinnwand: an wen? ----------
  function boardFor(b) { return isLaLei() || !(b.to || []).length || b.to.includes(myId()); }

  // ---------- Reaktionen ----------
  const EMOJIS = ["👍", "❤️", "😂", "🎉", "👀"];
  state.react = state.react || [];
  function reactBar(b) {
    const list = (state.react || []).filter((r) => r.board === b._id); const mine = list.find((r) => r.person === myId());
    const darf = !isReadOnly() && !state.asTeam && !isClosed() && myId();
    const counts = EMOJIS.map((e) => [e, list.filter((r) => r.emoji === e)]).filter(([, l]) => l.length || darf);
    if (!counts.length) return "";
    return `<div class="reacts" role="group" aria-label="Reaktionen">${counts.map(([e, l]) => `<button type="button" class="react ${mine && mine.emoji === e ? "on" : ""} ${l.length ? "" : "empty"}" ${darf ? `data-react="${esc(b._id)}|${e}"` : "disabled"} title="${esc(l.map((r) => r.name).join(", ") || "Reagieren")}" aria-pressed="${!!(mine && mine.emoji === e)}">${e}${l.length ? `<span>${l.length}</span>` : ""}</button>`).join("")}</div>`;
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest && e.target.closest("[data-react]"); if (!b) return;
    const [board, emoji] = b.dataset.react.split("|"); const id = `${board}~${myId()}`; const mine = (state.react || []).find((r) => r._id === id);
    try { if (mine && mine.emoji === emoji) await state.db.batch([{ op: "delete", coll: "react", id }]); else await state.db.batch([{ op: "set", coll: "react", id, data: { board, person: myId(), name: me(), emoji, at: nowStamp() } }]); }
    catch (err) { toast(STORE.isGas && /BERECHTIGUNG|KEINE/.test(String(err && err.message)) ? "Reaktionen gehen erst, wenn die neue Code.gs eingesetzt ist." : errMsg(err)); }
  });

  // ---------- Glocke ----------
  const bellKey = () => `lalei-glocke-${state.lagerId}-${myId()}`;
  const bellSeen = () => { try { return JSON.parse(store.get(bellKey()) || "null") || { at: Date.now() - 7 * DAY, keys: {} }; } catch { return { at: 0, keys: {} }; } };
  function bellItems() {
    const n = me(); if (!n || !state.lagerId) return [];
    const seen = bellSeen(); const since = seen.at; const out = [];
    const neu = (x) => ts(x.updatedAt || x.createdAt) > since && (x.updatedBy || x.by || x.author || "") !== n;
    for (const b of state.board || []) if (boardActive(b) && boardFor(b) && ts(b.createdAt) > since && b.by !== n) out.push({ key: "b" + b._id, at: b.createdAt, ico: "📌", text: `Neue Mitteilung: <b>${esc(b.title || "")}</b>`, attr: `data-bell-go="${isLaLei() ? "board" : "home"}"` });
    if (isLaLei()) {
      const t0 = iso(today()), lim = addDays(t0, 3);
      for (const t of state.tasks.values()) {
        if (t.status === "Erledigt") continue;
        if (t.owner === n && neu(t)) { const last = (t.log || []).slice(-1)[0] || {}; out.push({ key: "t" + t._id + t.updatedAt, at: t.updatedAt, ico: "☑", text: /Verantwortlich|übernimmt|erfasst/.test(last.text || "") ? `${esc(t.updatedBy)} hat dir <b>${esc(t.title)}</b> zugeteilt` : `${esc(t.updatedBy)} hat deine Aufgabe <b>${esc(t.title)}</b> geändert`, attr: `data-open="${esc(t._id)}"` }); }
        else if (neu(t) && [t.note, ...(t.log || []).filter((l) => ts(l.at) > since).map((l) => l.text)].some((x) => String(x || "").split("\n").some(mentionsMe))) out.push({ key: "tm" + t._id + t.updatedAt, at: t.updatedAt, ico: "@", text: `${esc(t.updatedBy)} hat dich bei <b>${esc(t.title)}</b> erwähnt`, attr: `data-open="${esc(t._id)}"` });
        if ((t.owner === n || t.support === n) && t.deadline && !t.ongoing && t.deadline <= lim) out.push({ key: "d" + t._id + t.deadline, at: t.deadline, ico: t.deadline < t0 ? "⚠️" : "⏰", text: `${t.deadline < t0 ? "Überfällig" : t.deadline === t0 ? "Heute fällig" : "Fällig am " + fmt(t.deadline)}: <b>${esc(t.title)}</b>`, attr: `data-open="${esc(t._id)}"`, due: true });
      }
      for (const e of state.journal) if (neu(e) && entryText(e).split("\n").some(mentionsMe)) out.push({ key: "m" + e._id + e.updatedAt, at: e.updatedAt || e.createdAt, ico: "@", text: `${esc(e.updatedBy || e.author || e.by || "Jemand")} hat dich erwähnt: <b>${esc(e.title || e.topic || "")}</b>`, attr: `data-open-entry="${esc(e._id)}"` });
      for (const h of state.hoecks) if (neu(h) && String(h.note || "").split("\n").some(mentionsMe)) out.push({ key: "h" + h._id + h.updatedAt, at: h.updatedAt, ico: "@", text: `Erwähnt beim Höck <b>${esc(h.title || "")}</b>`, attr: `data-open-hoeck="${esc(h._id)}"` });
      const ib = inboxCount(); if (ib) out.push({ key: "i" + ib + "-" + iso(today()), at: nowStamp(), ico: "📥", text: `${ib} ${ib === 1 ? "neuer Eintrag" : "neue Einträge"} im Eingang`, attr: 'data-bell-go="inbox"', sticky: true });
    } else {
      for (const f of state.feedback || []) if (f.person === myId() && f.reply && ts(f.repliedAt) > since) out.push({ key: "f" + f._id + f.repliedAt, at: f.repliedAt, ico: "💬", text: `Die Lagerleitung hat auf «${esc(String(f.text || "").slice(0, 40))}» geantwortet`, attr: 'data-bell-tab="home|fb"' });
    }
    const tf = STORE.toolFb ? STORE.toolFb() : 0; if (tf) out.push({ key: "tf" + tf, at: nowStamp(), ico: "🛠", text: `${tf} ${tf === 1 ? "neue Rückmeldung" : "neue Rückmeldungen"} zum Tool (im Admin)`, attr: "data-bell-admin", sticky: true });
    return out.map((x) => ({ ...x, unread: x.due || x.sticky ? !seen.keys[x.key] : true })).sort((a, b) => (b.unread ? 1 : 0) - (a.unread ? 1 : 0) || String(b.at).localeCompare(String(a.at)));
  }
  function bellPaint() {
    let b = $("#bell"); const brand = $(".side .brand");
    if (!b && brand) { brand.insertAdjacentHTML("beforeend", `<button class="bell" id="bell" type="button" aria-label="Mitteilungen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg><span class="count" id="bell-count" hidden></span></button>`); b = $("#bell"); }
    if (!b) return; const n = bellItems().filter((x) => x.unread).length; const c = $("#bell-count"); c.hidden = !n; c.textContent = n > 9 ? "9+" : n;
    b.setAttribute("aria-label", n ? `${n} neue Mitteilungen` : "Mitteilungen");
  }
  function bellOpen() {
    const items = bellItems();
    const o = modal(`<div class="lg-head"><span class="eyebrow">Glocke</span><h2>Was ist neu für dich</h2></div>
      ${items.length ? `<div class="bell-list">${items.map((x) => `<button type="button" class="bell-row ${x.unread ? "unread" : ""}" ${x.attr}><span class="bell-ico" aria-hidden="true">${x.ico}</span><span class="bell-t">${x.text}</span>${x.due ? "" : `<span class="muted bell-at">${/^\d{4}-\d\d-\d\dT/.test(String(x.at)) ? esc(stampFmt(x.at)) : ""}</span>`}</button>`).join("")}</div>`
        : '<div class="empty"><b>Alles gesehen</b>Neue Mitteilungen, Erwähnungen und bald fällige Aufgaben erscheinen hier.</div>'}
      <p class="hint" style="margin:0">Die Glocke zeigt Neues, solange das Tool offen ist. Nachrichten aufs Handy gibt es nicht.</p>
      <div class="lg-foot"><span></span><button class="btn" data-bell-close>Schliessen</button></div>`, "bell-modal");
    store.set(bellKey(), JSON.stringify({ at: Date.now(), keys: Object.fromEntries(items.map((x) => [x.key, 1])) })); bellPaint();
    o.onclick = (e) => {
      if (e.target === o || e.target.closest("[data-bell-close]")) return closeDrawer();
      const r = e.target.closest(".bell-row"); if (!r) return; closeDrawer();
      if (r.dataset.bellGo) return setView(r.dataset.bellGo);
      if (r.dataset.bellTab) { const [v, k] = r.dataset.bellTab.split("|"); state.tabs[v] = k; return setView(v); }
      if (r.hasAttribute("data-bell-admin")) return showAdmin();
      if (r.dataset.open) return openTask(r.dataset.open);
      if (r.dataset.openEntry) return openEntry(null, r.dataset.openEntry);
      if (r.dataset.openHoeck) return openEntry("hoeck", r.dataset.openHoeck);
    };
  }
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#bell")) bellOpen(); });

  // ---------- Seitenleiste: Glocke, «Tag 3 von 7», Feedback zum Tool ----------
  const renderSideOrig3 = renderSide;
  renderSide = function () {
    renderSideOrig3(); bellPaint();
    if (isCampNow()) { const r = campRange(); const total = daysBetween(parse(r.from), parse(r.to)) + 1; const nr = daysBetween(parse(r.from), today()) + 1;
      const cd = $("#countdown"); if (cd) cd.innerHTML = `<b>Tag ${nr} von ${total}</b><span>${nr === total ? "Letzter Lagertag" : `noch ${total - nr} ${total - nr === 1 ? "Tag" : "Tage"}`}</span>`; }
    const sf = $(".side-foot"); if (sf && !$("#tool-fb", sf)) $("#logout", sf).insertAdjacentHTML("beforebegin", `<button class="side-link" id="tool-fb" type="button">Feedback zum Tool</button>`);
  };

  // ---------- Feedback zum Tool ----------
  function toolFeedbackOpen() {
    const o = modal(`<div class="lg-head"><span class="eyebrow">Feedback zum Tool</span><h2>Was können wir besser machen?</h2></div>
      <p class="muted" style="margin:0">Geht an die Verantwortlichen des Lager-Tools, nicht an die Lagerleitung deines Lagers.</p>
      <div class="seg" role="radiogroup" aria-label="Art">${["Idee", "Fehler", "Lob", "Frage"].map((k, i) => `<button type="button" data-tf-art="${k}" aria-pressed="${i === 0}">${k}</button>`).join("")}</div>
      <textarea id="tf-text" rows="5" placeholder="Was ist dir aufgefallen? Wo im Tool?"></textarea>
      <label class="toggle"><input type="checkbox" id="tf-anon"> Ohne meinen Namen senden</label>
      <div class="lg-foot"><button class="link" data-tf-no>Abbrechen</button><button class="btn primary" data-tf-go>Senden</button></div>`);
    let art = "Idee"; setTimeout(() => $("#tf-text", o).focus(), 30);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-tf-no]")) return closeDrawer();
      const a = e.target.closest("[data-tf-art]"); if (a) { art = a.dataset.tfArt; o.querySelectorAll("[data-tf-art]").forEach((x) => x.setAttribute("aria-pressed", String(x === a))); return; }
      if (!e.target.closest("[data-tf-go]")) return; const text = $("#tf-text", o).value.trim(); if (!text) return $("#tf-text", o).focus();
      const b = e.target.closest("[data-tf-go]"); b.disabled = true;
      try { await STORE.toolFeedback({ text: `${text}${state.view ? `\n(Seite: ${state.view})` : ""}`, art, anon: $("#tf-anon", o).checked }); closeDrawer(); toast("Danke! Dein Feedback ist angekommen."); }
      catch (err) { b.disabled = false; toast(/UNBEKANNT|unbekannt|op/i.test(String(err && err.message)) ? "Das geht erst, wenn die neue Code.gs eingesetzt ist." : errMsg(err)); }
    };
  }
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#tool-fb, [data-tool-fb]")) toolFeedbackOpen(); });

  // Admin: Feedback zum Tool lesen, Benachrichtigung einstellen
  let tfAdmin = null, tfOverview = null;
  async function tfLoad() { try { tfAdmin = await STORE.admin(adPw, "toolFeedback"); tfOverview = await STORE.admin(adPw, "overview"); } catch { tfAdmin = { items: [], notify: [] }; } tfPaint(); }
  function tfPaint() {
    const m = $(".admin-modal"); if (!m || !adPw || !/Angemeldet als Admin/.test(m.textContent)) return;
    const v = tfAdmin; const items = v ? v.items || [] : []; const notify = v ? v.notify || [] : [];
    const pers = tfOverview ? tfOverview.lagers.flatMap((l) => l.people.filter((p) => p.funktion !== "Lesen").map((p) => ({ lager: l.id, lt: l.title, person: p.id, name: p.name }))) : [];
    const html = `<section class="card" id="ad-toolfb"><div class="card-head"><h2>Feedback zum Tool</h2>${items.some((x) => !x.read) ? '<button class="btn small" data-tf-readall>Alle als gelesen</button>' : ""}</div><div class="card-body stack" style="gap:10px">
      ${!v ? '<span class="muted">Wird geladen …</span>' : items.length ? items.slice(0, 60).map((x) => `<div class="mrow tf-row ${x.read ? "" : "unread"}"><div class="entry-top"><span class="tag plain">${esc(x.art || "Idee")}</span><b>${esc(x.name || "?")}</b><span class="muted" style="font-size:12px">${esc(x.role === "team" ? "Team" : "Lagerleitung")} · ${esc(((tfOverview && tfOverview.lagers.find((l) => l.id === x.lager)) || {}).title || x.lager || "")} · ${esc(stampFmt(x.at))}</span><span style="margin-left:auto;display:flex;gap:6px">${x.read ? "" : `<button class="btn small" data-tf-read="${esc(x.id)}">Gelesen</button>`}<button class="btn small ghost danger" data-tf-rm="${esc(x.id)}">Löschen</button></span></div><div class="rich">${rich(x.text)}</div></div>`).join("") : '<span class="muted">Noch kein Feedback.</span>'}
      ${v ? `<div class="field"><span>Wer sieht neues Feedback in der Glocke? (im eigenen Lager)</span><div class="present">${pers.map((p) => `<button type="button" data-tf-who="${esc(p.lager)}|${esc(p.person)}" aria-pressed="${notify.some((n) => n.lager === p.lager && n.person === p.person)}">${av(p.name)}${esc(p.name)} <span class="muted" style="font-size:11.5px">${esc(p.lt)}</span></button>`).join("") || '<span class="muted">Keine Lagerleitung erfasst.</span>'}</div></div>` : ""}</div></section>`;
    const old = $("#ad-toolfb", m); if (old) old.outerHTML = html; else { const ref = $("#ad-vorlagen", m) || [...m.querySelectorAll("section.card")].find((s) => /Wartungshinweis/.test(s.textContent)); if (ref) ref.insertAdjacentHTML("beforebegin", html); }
    if (!v) tfLoad();
  }
  const showAdminOrig3 = showAdmin;
  showAdmin = function () {
    tfAdmin = null; tfOverview = null; showAdminOrig3(); const m = $(".admin-modal"); if (!m) return;
    new MutationObserver(() => { if (!$("#ad-toolfb", m)) tfPaint(); }).observe(m, { childList: true });
    m.addEventListener("click", async (e) => {
      const tun = async (fn) => { try { await fn(); } catch (err) { toast(errMsg(err)); } tfAdmin = null; tfPaint(); };
      const r = e.target.closest("[data-tf-read]"); if (r) return tun(() => STORE.admin(adPw, "toolFeedbackRead", { id: r.dataset.tfRead }));
      const rm = e.target.closest("[data-tf-rm]"); if (rm) { if (!confirm("Dieses Feedback löschen?")) return; return tun(() => STORE.admin(adPw, "toolFeedbackRead", { id: rm.dataset.tfRm, remove: rm.dataset.tfRm })); }
      if (e.target.closest("[data-tf-readall]")) return tun(() => STORE.admin(adPw, "toolFeedbackRead", {}));
      const w = e.target.closest("[data-tf-who]"); if (w) { const [lager, person] = w.dataset.tfWho.split("|"); const cur = (tfAdmin.notify || []).map((x) => ({ lager: x.lager, person: x.person })); const on = cur.some((x) => x.lager === lager && x.person === person);
        const next = on ? cur.filter((x) => !(x.lager === lager && x.person === person)) : [...cur, { lager, person }]; return tun(() => STORE.admin(adPw, "setNotify", { personen: next })); }
    });
  };

  // ---------- Pausen (mehrere, selbst benannt) ----------
  function pausen() { const c = cfg(); if (Array.isArray(c.pausen)) return c.pausen; const d = c.dates || {}; return d.pauseFrom && d.pauseTo ? [{ id: "p1", label: "Pause", from: d.pauseFrom, to: d.pauseTo }] : []; }
  function inPause(wi, we) { return pausen().some((p) => p.from && p.to && p.from <= we && p.to >= wi); }
  const savePausen = (arr) => writeConfig({ pausen: arr, dates: { pauseFrom: "", pauseTo: "" } });

  // ---------- Notfall-Liste (eigene Funktionen) ----------
  const securityPeopleOrig = securityPeople;
  securityPeople = function () {
    const list = cfg().notfall; if (!Array.isArray(list) || !list.length) return securityPeopleOrig();
    return list.filter((x) => x.name || x.tel).map((x) => { const p = state.peopleDocs.find((y) => displayName(y) === x.name); return { name: x.name || "", role: x.fn || "", id: p ? p._id : "", tel: x.tel || (p ? p.telefon || "" : "") }; });
  };
  const saveNotfall = (arr) => writeConfig({ notfall: arr });

  const setUpdateOrig3 = views.settings.update;
  views.settings.update = function () {
    setUpdateOrig3(); const ro = isReadOnly() || isClosed();
    const dg = $("#set-lager .dates-grid"); document.querySelectorAll("#set-lager .pz-field").forEach((x) => x.remove());
    if (dg) dg.insertAdjacentHTML("afterend", `<div class="field pz-field" style="margin-top:14px"><span>Pausen (z.B. Sommerferien, erscheinen im Zeitplan)</span><div class="list-edit pz-list">${pausen().map((p, i) => `<div class="r pz-row"><input data-pz="${i}|label" value="${esc(p.label || "")}" placeholder="Bezeichnung" aria-label="Bezeichnung"><input type="date" data-pz="${i}|from" value="${esc(p.from || "")}" aria-label="Pause von"><input type="date" data-pz="${i}|to" value="${esc(p.to || "")}" aria-label="Pause bis"><button class="btn small ghost" data-pz-rm="${i}" aria-label="Pause entfernen">✕</button></div>`).join("")}<button class="btn small" data-pz-add style="justify-self:start" ${ro ? "disabled" : ""}>+ Pause</button></div></div>`);
    const sos = $("#set-sos"); if (!sos) return; const list = Array.isArray(cfg().notfall) ? cfg().notfall : [];
    sos.innerHTML = `<p class="hint" style="margin:0 0 10px">Diese Liste erscheint beim roten Notfall-Knopf, auch für das Team. Ihr bestimmt selbst, welche Funktionen und Personen drauf sind. ${list.length ? "" : "Solange die Liste leer ist, stehen dort Leitung und Stellvertretung von «Sicherheit» aus der Ressortverteilung."}</p>
      <div class="list-edit nf-list">${list.map((x, i) => `<div class="r nf-row"><input data-nf="${i}|fn" value="${esc(x.fn || "")}" placeholder="Funktion, z.B. Sanität" aria-label="Funktion"><select data-nf="${i}|name" aria-label="Verantwortlich">${personOptions(x.name, "Person wählen")}</select><input type="tel" data-nf="${i}|tel" value="${esc(x.tel || "")}" placeholder="Telefon" aria-label="Telefon"><button class="btn small ghost" data-nf-rm="${i}" aria-label="Zeile entfernen">✕</button></div>`).join("")}</div>
      <div class="btn-group" style="margin-top:10px"><button class="btn small" data-nf-add ${ro ? "disabled" : ""}>+ Zeile</button><button class="btn small" data-nf-ress ${ro ? "disabled" : ""}>Aus Ressortverteilung übernehmen</button></div>`;
  };
  view.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.pz) { const [i, k] = t.dataset.pz.split("|"); const arr = pausen().map((x) => ({ ...x })); arr[+i][k] = t.value.trim(); return savePausen(arr); }
    if (t.dataset.nf) { const [i, k] = t.dataset.nf.split("|"); const arr = (cfg().notfall || []).map((x) => ({ ...x })); arr[+i][k] = t.value.trim();
      if (k === "name" && !arr[+i].tel) { const p = state.peopleDocs.find((y) => displayName(y) === t.value); if (p && p.telefon) arr[+i].tel = p.telefon; } return saveNotfall(arr); }
    if (t.dataset.svcMin !== undefined) { const arr = planDoc().services.map((s) => ({ ...s })); const v = Math.max(0, Math.min(20, parseInt(t.value, 10) || 0)); if (v) arr[+t.dataset.svcMin].min = v; else delete arr[+t.dataset.svcMin].min; return savePlan({ services: arr }); }
  });
  view.addEventListener("click", (e) => {
    if (e.target.closest("[data-pz-add]")) return savePausen([...pausen(), { id: "p" + uid(), label: "", from: "", to: "" }]);
    const pr = e.target.closest("[data-pz-rm]"); if (pr) return savePausen(pausen().filter((_, i) => i !== +pr.dataset.pzRm));
    if (e.target.closest("[data-nf-add]")) return saveNotfall([...(cfg().notfall || []), { fn: "", name: "", tel: "" }]);
    const nr = e.target.closest("[data-nf-rm]"); if (nr) return saveNotfall((cfg().notfall || []).filter((_, i) => i !== +nr.dataset.nfRm));
    if (e.target.closest("[data-nf-ress]")) {
      const add = securityPeopleOrig().map((s) => ({ fn: s.role, name: s.name, tel: s.tel || "" })); const cur = cfg().notfall || [];
      const neu = add.filter((a) => !cur.some((c) => c.name === a.name && c.fn === a.fn));
      if (!neu.length) return toast(add.length ? "Alle aus der Ressortverteilung stehen schon drauf." : "Bei «Sicherheit» ist in der Ressortverteilung noch niemand eingeteilt.");
      saveNotfall([...cur, ...neu]).then(() => toast(`${neu.length} übernommen`));
    }
  });

  // ---------- Schichtplan: Mindestbesetzung ----------
  const planUpdateOrig3 = views.plan.update;
  views.plan.update = function () {
    planUpdateOrig3(); const svcs = planDoc().services;
    document.querySelectorAll("#plan-body [data-svc]").forEach((inp) => { const i = +inp.dataset.svc; const row = inp.closest(".r"); if (!row || $("[data-svc-min]", row)) return; row.classList.add("svc-row-edit");
      const x = row.querySelector("[data-svc-rm]"); x.insertAdjacentHTML("beforebegin", `<label class="min-in" title="Mindestbesetzung"><span>mind.</span><input type="number" min="0" max="20" inputmode="numeric" data-svc-min="${i}" value="${(svcs[i] || {}).min || ""}" aria-label="Mindestbesetzung ${esc((svcs[i] || {}).name || "")}"></label>`); });
    const kurz = []; for (const d of days()) for (const s of svcs) { const n = ((planDoc().cells || {})[d.id + "|" + s.id] || []).length; if ((s.min || 0) > n) kurz.push(`${s.name} am ${d.label}`); }
    if (kurz.length) $("#plan-body").insertAdjacentHTML("afterbegin", `<div class="conflict-note">${kurz.length} ${kurz.length === 1 ? "Dienst ist" : "Dienste sind"} noch zu knapp besetzt: ${esc(kurz.slice(0, 6).join(", "))}${kurz.length > 6 ? " …" : ""}</div>`);
  };

  // ---------- Lager-Modus: wer ist heute da ----------
  function heuteDa(dayId) {
    const dps = dayparts(); const da = [], teil = [], weg = [], offen = [];
    for (const p of peopleSorted()) { const s = attDoc("p_" + p._id); const v = dps.map((_, i) => s[dayId + "|" + i] || "O"); const n = displayName(p);
      if (v.every((x) => x === "A")) da.push(n); else if (v.some((x) => x === "A")) teil.push(`${n} (${dps.filter((_, i) => v[i] === "A").join(", ")})`); else if (v.every((x) => x === "F")) weg.push(n); else offen.push(n); }
    return { da, teil, weg, offen };
  }
  const ovUpdateOrig3 = views.overview.update;
  views.overview.update = function () {
    ovUpdateOrig3(); const card = $("#ov-today .today"); const ds = days(); if (!card || !ds.length) return;
    const sel = ds.find((d) => d.id === state.todayDay) || ds.find((d) => d.date === iso(today())) || ds[0]; const h = heuteDa(sel.id);
    const chips = (l, cls = "") => l.map((n) => `<span class="pchip-s ${cls}">${esc(n)}</span>`).join("");
    card.insertAdjacentHTML("beforeend", `<div class="card-body heute-da"><span class="eyebrow">Wer ist heute da</span>
      <div class="chipset">${chips(h.da) || '<span class="muted" style="font-size:13px">Niemand ganz da.</span>'}</div>
      ${h.teil.length ? `<span class="muted" style="font-size:12.5px">Teilweise:</span><div class="chipset">${chips(h.teil)}</div>` : ""}
      ${h.weg.length ? `<span class="muted" style="font-size:12.5px">Nicht da: ${esc(h.weg.join(", "))}</span>` : ""}${h.offen.length ? `<span class="muted" style="font-size:12.5px">Noch offen: ${esc(h.offen.join(", "))}</span>` : ""}</div>`);
  };

  // ---------- Tour für die Lagerleitung (einmal) ----------
  function laleiTour(force) {
    if (!isLaLei() || state.asTeam || (!force && $(".overlay"))) return;
    const key = `lalei-tour-lalei-${state.lagerId}-${myId()}`; if (!force && store.get(key)) return; store.set(key, "1");
    const steps = [["Übersicht", "Stand der Planung, nächster Meilenstein, was fällig ist und der Lager-Check «Sind wir bereit?»."], ["Aufgaben", "Alle Aufgaben aller Ressorts als Liste oder Kanban. Verantwortlich ist automatisch die Ressortleitung. Mit «Auswählen» änderst du mehrere auf einmal, «Ansichten» merkt sich deine Filter."], ["Protokoll", "Höcks planen, Traktanden sammeln und protokollieren. Im Höck-Modus geht ihr ein Traktandum nach dem anderen durch. Mit @Name, @alle oder @Ressort erwähnst du jemanden."], ["Pinnwand und Eingang", "Mitteilungen ans ganze Team oder an ausgewählte Personen. Fragen, Ideen und Anfragen aus dem Team landen im Eingang."], ["Lager einrichten", "Daten, Pausen, Team, Ressortverteilung, Meilensteine, Tage, Notfall-Liste und Zugang fürs Team."], ["Glocke und Notfall", "Die Glocke oben zeigt Neues für dich und bald fällige Aufgaben. Der rote Knopf «Notfall» zeigt die Notfall-Liste und die Lageradresse."]];
    let i = 0; const o = modal("", "tour-modal");
    const draw = () => { o.querySelector(".modal").innerHTML = `<div class="lg-head"><span class="eyebrow">Kurze Tour · ${i + 1} von ${steps.length}</span><h2>${steps[i][0]}</h2></div><p style="margin:0">${steps[i][1]}</p><div class="tour-dots">${steps.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("")}</div><div class="lg-foot"><button class="link" data-tour-end>Überspringen</button><span class="btn-group">${i ? '<button class="btn" data-tour-back>Zurück</button>' : ""}<button class="btn primary" data-tour-next>${i < steps.length - 1 ? "Weiter" : "Los geht's"}</button></span></div>`; };
    o.onclick = (e) => { if (e.target.closest("[data-tour-end]") || (e.target.closest("[data-tour-next]") && i === steps.length - 1)) return closeDrawer(); if (e.target.closest("[data-tour-next]")) { i++; draw(); } if (e.target.closest("[data-tour-back]")) { i--; draw(); } };
    draw();
  }
  const ovUpdateTour = views.overview.update;
  views.overview.update = function () { ovUpdateTour(); setTimeout(() => laleiTour(false), 1500); };
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("[data-lalei-tour]")) laleiTour(true); });
  const prefsUpdateOrig3 = views.prefs.update;
  views.prefs.update = function () {
    prefsUpdateOrig3(); const b = $("#prefs-body"); if (!b || $("#prefs-extra3", b)) return;
    b.insertAdjacentHTML("beforeend", `<section class="card" id="prefs-extra3"><div class="card-head"><h2>Hilfe und Feedback</h2></div><div class="card-body stack" style="gap:10px">${isLaLei() ? '<button class="btn" data-lalei-tour style="align-self:flex-start">Tour nochmals ansehen</button>' : ""}<button class="btn" data-tool-fb style="align-self:flex-start">Feedback zum Tool senden</button></div></section>`);
  };
