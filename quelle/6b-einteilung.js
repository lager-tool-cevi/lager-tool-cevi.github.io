  // =====================================================================
  // Ausbau 2: Einteilung (Zimmer, Fahrten, Gruppen), Abzählen, Einkaufsliste, Schichtplan-Hilfen, Ausdrucke
  // =====================================================================
  const inMembers = (list, key) => (list || []).some((m) => memberKey(m) === key);
  const personKey = (p) => "p:" + p._id;

  // Auswahlfenster für Personen (wie bei den Zimmern); taken = schon anderswo eingeteilt
  function openPicker({ eyebrow, title, current, taken, kids = true, leaders = true, onSave }) {
    const sel = new Set(current); const free = (k) => !taken.has(k) || sel.has(k);
    const btn = (key, label) => `<button type="button" data-pk="${esc(key)}" aria-pressed="${sel.has(key)}">${label}</button>`;
    const stufen = [...new Set(state.kids.map((k) => k.stufe || "Ohne Stufe"))].sort();
    const kidsBlock = kids ? stufen.map((s) => { const ks = state.kids.filter((k) => (k.stufe || "Ohne Stufe") === s && free("k:" + k._id)); return ks.length ? `<div class="field"><span>${stufeTag(s)} Teilnehmende</span><div class="present">${ks.map((k) => btn("k:" + k._id, esc(kidName(k)))).join("")}</div></div>` : ""; }).join("") : "";
    const lead = leaders ? peopleSorted().filter((p) => free(personKey(p))) : [];
    const o = modal(`<div class="lg-head"><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2></div><p class="muted" style="margin:0">Antippen zum Ein- und Austeilen. Wer schon anderswo eingeteilt ist, fehlt hier.</p>
      ${kidsBlock}${lead.length ? `<div class="field"><span>Leitende</span><div class="present">${lead.map((p) => btn(personKey(p), av(displayName(p)) + esc(displayName(p)))).join("")}</div></div>` : ""}${!kidsBlock && !lead.length ? '<div class="empty">Alle sind schon eingeteilt.</div>' : ""}
      <div class="lg-foot"><button class="link" data-pk-close>Abbrechen</button><button class="btn primary" data-pk-save>Übernehmen</button></div>`, "wide-modal");
    o.onclick = (e) => {
      if (e.target === o || e.target.closest("[data-pk-close]")) return closeDrawer();
      const b = e.target.closest("[data-pk]"); if (b) { const k = b.dataset.pk; sel.has(k) ? sel.delete(k) : sel.add(k); b.setAttribute("aria-pressed", String(sel.has(k))); return; }
      if (e.target.closest("[data-pk-save]")) { onSave([...sel].map((k) => ({ t: k[0], id: k.slice(2) }))); closeDrawer(); }
    };
  }
  const chip = (m, rmAttr) => { const i = memberInfo(m); if (!i) return ""; const k = m.t === "k" ? byId(state.kids, m.id) : null;
    return `<span class="pchip-s ${i.type === "TN" ? "kid" : ""}" ${k ? `style="--sc:${stufeColor(k.stufe)}"` : ""}>${i.type === "TN" ? "" : av(i.name)}${esc(i.name)}${k && k.stufe ? `<span class="muted" style="font-weight:400">· ${esc(k.stufe)}</span>` : ""}${rmAttr ? `<button class="x" ${rmAttr} aria-label="${esc(i.name)} entfernen">✕</button>` : ""}</span>`; };

  // ---------- Fahrten ----------
  const tripsOf = (dir) => state.trips.filter((t) => (t.dir || "Hin") === dir).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const driverName = (t) => { const p = byId(state.peopleDocs, t.driver); return p ? displayName(p) : ""; };
  const sbbUrl = (t) => `https://www.sbb.ch/de/kaufen/pages/fahrplan/fahrplan.xhtml?von=${encodeURIComponent(t.from || "")}&nach=${encodeURIComponent(t.to || "")}${t.date ? `&datum=${fmtFull(t.date)}` : ""}${t.time ? `&zeit=${encodeURIComponent(t.time)}` : ""}&an=false&suche=true`;
  function tripLineText(t) { return [`${t.kind === "ÖV" ? "ÖV" : "Auto"} ${t.dir === "Rück" ? "Rückfahrt" : "Hinfahrt"}: ${t.name || ""}`, t.kind !== "ÖV" && driverName(t) ? `Fahrer:in ${driverName(t)}` : "", t.date ? fmt(t.date) : "", t.time ? t.time + " Uhr" : "", t.meet ? `Treffpunkt ${t.meet}` : "", t.kind === "ÖV" && (t.from || t.to) ? `${t.from || "?"} → ${t.to || "?"}` : ""].filter(Boolean).join(" · "); }
  const tripLine = (t) => `${esc(tripLineText(t))}${t.kind === "ÖV" && t.from && t.to ? ` <a href="${esc(sbbUrl(t))}" target="_blank" rel="noopener">Fahrplan</a>` : ""}`;
  function tripsHtml(ro) {
    const dir = state.tripDir || "Hin"; const list = tripsOf(dir);
    const taken = new Set(); for (const t of list) { (t.members || []).forEach((m) => taken.add(memberKey(m))); if (t.driver) taken.add("p:" + t.driver); }
    const kidsOpen = state.kids.filter((k) => !taken.has("k:" + k._id)), peopleOpen = peopleSorted().filter((p) => !taken.has(personKey(p)));
    const seg = `<div class="seg" style="width:auto;grid-template-columns:auto auto" role="group"><button type="button" data-trip-dir="Hin" aria-pressed="${dir === "Hin"}">Hinfahrt</button><button type="button" data-trip-dir="Rück" aria-pressed="${dir === "Rück"}">Rückfahrt</button></div>`;
    const card = (t) => { const mem = t.members || []; const cap = Number(t.seats) || 0; const over = cap && mem.length > cap; const auto = t.kind !== "ÖV";
      const f = (k, ph, type = "text", w = "") => ro ? "" : `<input class="input" ${type === "number" ? 'type="number" min="0"' : type === "date" ? 'type="date"' : type === "time" ? 'type="time"' : ""} style="height:30px;${w}" data-trip="${esc(t._id)}|${k}" value="${esc(t[k] || "")}" placeholder="${ph}" aria-label="${ph}">`;
      return `<section class="card room ${!ro || !inMembers(mem, "p:" + myId()) && t.driver !== myId() ? "" : "mine"}"><div class="card-head" style="gap:8px"><div style="display:flex;gap:8px;align-items:center;flex:1;min-width:0"><span class="tag plain ${auto ? "type-meeting" : "type-contact"}">${auto ? "Auto" : "ÖV"}</span>${ro ? `<b>${esc(t.name || "")}</b>` : `<input class="room-name" data-trip="${esc(t._id)}|name" value="${esc(t.name || "")}" aria-label="Name">`}</div>
        <span class="${over ? "late-n" : "muted"}" style="font-size:13px;white-space:nowrap">${auto && cap ? `${mem.length} / ${cap} Plätze` : `${mem.length} ${mem.length === 1 ? "Person" : "Personen"}`}</span>${ro ? "" : `<button class="btn small ghost" data-trip-rm="${esc(t._id)}" aria-label="Löschen">✕</button>`}</div>
        <div class="card-body stack" style="gap:10px">
          ${ro ? `<div class="muted" style="font-size:13px">${tripLine(t)}</div>` : `<div class="trip-fields">${auto ? `<label><span>Fahrer:in</span><select class="input" style="height:30px" data-trip="${esc(t._id)}|driver"><option value="">–</option>${peopleSorted().map((p) => `<option value="${esc(p._id)}" ${p._id === t.driver ? "selected" : ""}>${esc(displayName(p))}</option>`).join("")}</select></label><label><span>Freie Plätze</span>${f("seats", "z.B. 4", "number")}</label>` : `<label><span>Von</span>${f("from", "z.B. Stäfa")}</label><label><span>Nach</span>${f("to", "z.B. Wildhaus")}</label>`}
            <label><span>Datum</span>${f("date", "Datum", "date")}</label><label><span>Abfahrt</span>${f("time", "Zeit", "time")}</label><label class="wide"><span>Treffpunkt</span>${f("meet", "z.B. Bahnhof Stäfa, Gleis 1")}</label></div>
            ${!auto && t.from && t.to ? `<a class="btn small" style="align-self:flex-start" href="${esc(sbbUrl(t))}" target="_blank" rel="noopener">Verbindung im SBB-Fahrplan</a>` : ""}`}
          ${auto && t.driver ? `<div class="muted" style="font-size:13px">Fahrer:in: <b>${esc(driverName(t))}</b></div>` : ""}
          <div class="chipset">${mem.map((m) => chip(m, ro ? "" : `data-trip-out="${esc(t._id)}|${esc(memberKey(m))}"`)).join("") || '<span class="muted" style="font-size:13px">Noch niemand.</span>'}</div>
          ${ro ? "" : `<button class="btn small" style="align-self:flex-start" data-trip-pick="${esc(t._id)}">+ Personen einteilen</button>`}</div></section>`; };
    return `<div class="toolbar-row">${seg}${ro ? "" : `<span class="btn-group"><button class="btn" data-trip-add="Auto">+ Auto</button><button class="btn" data-trip-add="ÖV">+ ÖV-Gruppe</button>${menu([["data-print=\"trips\"", "Fahrtenliste drucken (Word)"]])}</span>`}</div>
      ${ro ? "" : `<section class="card"><div class="card-head"><h2>Noch keine ${dir === "Hin" ? "Hinfahrt" : "Rückfahrt"}</h2><span class="muted">${kidsOpen.length} Teilnehmende · ${peopleOpen.length} Leitende</span></div><div class="card-body"><div class="chipset">${kidsOpen.map((k) => chip({ t: "k", id: k._id })).join("")}${peopleOpen.map((p) => chip({ t: "p", id: p._id })).join("") || ""}${!kidsOpen.length && !peopleOpen.length ? '<span class="muted">Alle haben eine Fahrt.</span>' : ""}</div></div></section>`}
      ${list.length ? `<div class="room-grid">${list.map(card).join("")}</div>` : `<section class="card"><div class="empty">${ro ? "Noch keine Fahrten geplant." : "Noch keine Fahrten. Lege Autos oder ÖV-Gruppen an und teile die Personen ein."}</div></section>`}`;
  }

  // ---------- Programmgruppen ----------
  const groupsSorted = () => state.groups.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.name || "").localeCompare(b.name || ""));
  const groupOfKid = (id) => state.groups.find((g) => inMembers(g.members, "k:" + id));
  function groupsHtml(ro) {
    const gs = groupsSorted(); const kidsOpen = state.kids.filter((k) => !groupOfKid(k._id));
    const card = (g) => { const mem = g.members || []; const mine = (g.leaders || []).includes(myId());
      return `<section class="card room ${ro && mine ? "mine" : ""}"><div class="card-head"><div style="display:flex;gap:8px;align-items:center;flex:1;min-width:0">${ro ? `<b>${esc(g.name || "")}</b>` : `<input class="room-name" data-group="${esc(g._id)}|name" value="${esc(g.name || "")}" aria-label="Gruppenname">`}</div><span class="muted" style="font-size:13px">${mem.length} TN</span>${ro ? "" : `<button class="btn small ghost" data-group-rm="${esc(g._id)}" aria-label="Löschen">✕</button>`}</div>
        <div class="card-body stack" style="gap:10px"><div class="field"><span>Leitung</span><div class="chipset">${(g.leaders || []).map((id) => chip({ t: "p", id }, ro ? "" : `data-group-lout="${esc(g._id)}|${esc(id)}"`)).join("") || '<span class="muted" style="font-size:13px">–</span>'}</div></div>
          <div class="chipset">${mem.map((m) => chip(m, ro ? "" : `data-group-out="${esc(g._id)}|${esc(memberKey(m))}"`)).join("") || '<span class="muted" style="font-size:13px">Noch keine Teilnehmenden.</span>'}</div>
          ${ro ? "" : `<div class="btn-group"><button class="btn small" data-group-pick="${esc(g._id)}">+ Teilnehmende</button><button class="btn small" data-group-lead="${esc(g._id)}">+ Leitung</button></div>`}</div></section>`; };
    return `${ro ? "" : `<div class="toolbar-row"><span class="muted">Gruppen für Geländespiele, Workshops oder Ämtli</span><span class="btn-group"><button class="btn" data-group-add>+ Gruppe</button><button class="btn primary" data-group-auto>Gemischt einteilen</button>${menu([["data-print=\"groups\"", "Gruppenlisten drucken (Word)"]])}</span></div>
      <section class="card"><div class="card-head"><h2>Ohne Gruppe</h2><span class="muted">${kidsOpen.length} Teilnehmende</span></div><div class="card-body"><div class="chipset">${kidsOpen.map((k) => chip({ t: "k", id: k._id })).join("") || '<span class="muted">Alle sind in einer Gruppe.</span>'}</div></div></section>`}
      ${gs.length ? `<div class="room-grid">${gs.map(card).join("")}</div>` : `<section class="card"><div class="empty">Noch keine Gruppen.${ro ? "" : " Mit «Gemischt einteilen» verteilt das Tool die Teilnehmenden fair nach Stufe."}</div></section>`}`;
  }
  function autoGroups() {
    const o = modal(`<div class="lg-head"><span class="eyebrow">Programmgruppen</span><h2>Gemischt einteilen</h2></div><label class="field"><span>Wie viele Gruppen?</span><input type="number" id="ag-n" min="2" max="20" value="${Math.max(2, state.groups.length || 4)}"></label>
      <p class="hint" style="margin:0">Alle ${state.kids.length} Teilnehmenden werden neu verteilt, gemischt nach Stufe und gleich gross. Die Leitenden der Gruppen bleiben. Danach kannst du von Hand anpassen.</p>
      <div class="lg-foot"><button class="link" data-ag-close>Abbrechen</button><button class="btn primary" data-ag-go>Einteilen</button></div>`);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-ag-close]")) return closeDrawer();
      if (!e.target.closest("[data-ag-go]")) return;
      const n = Math.max(2, Math.min(20, Number($("#ag-n", o).value) || 4)); const gs = groupsSorted(); const ops = [];
      const ids = []; for (let i = 0; i < n; i++) { if (gs[i]) ids.push(gs[i]._id); else { const id = state.db.newId() + i; ids.push(id); ops.push({ op: "set", coll: "groups", id, data: { name: `Gruppe ${i + 1}`, leaders: [], members: [], order: Date.now() + i } }); } }
      const kids = state.kids.slice().sort((a, b) => (a.stufe || "").localeCompare(b.stufe || "") || Math.random() - 0.5);
      const mem = ids.map(() => []); kids.forEach((k, i) => mem[i % n].push({ t: "k", id: k._id }));
      ids.forEach((id, i) => { const ex = ops.find((x) => x.id === id); if (ex) ex.data.members = mem[i]; else ops.push({ op: "update", coll: "groups", id, data: { members: mem[i] } }); });
      for (const g of gs.slice(n)) ops.push({ op: "update", coll: "groups", id: g._id, data: { members: [] } });
      try { await state.db.batch(ops); closeDrawer(); toast(`${kids.length} Teilnehmende auf ${n} Gruppen verteilt`); } catch (err) { handleWriteError(err); }
    };
  }

  // ---------- Einteilung: Zimmer & Zelte | Fahrten | Gruppen ----------
  TABS.rooms = [["zimmer", "Zimmer & Zelte"], ["fahrten", "Fahrten"], ["gruppen", "Gruppen"]];
  const roomsUpdateOrig = views.rooms.update; const troomsUpdateOrig = views.trooms.update;
  views.rooms = {
    shell: () => `${pageHead("Einteilung", "Wer schläft wo, wer fährt mit wem, wer ist in welcher Gruppe?")}${tabBar("rooms")}
      <div class="stack" ${pane("rooms", "zimmer")}><div class="toolbar-row"><span class="muted">Teilnehmende und Leitende in Zimmer und Zelte einteilen</span><span class="btn-group"><button class="btn" data-room-add="Zimmer">+ Zimmer</button><button class="btn" data-room-add="Zelt">+ Zelt</button>${menu([["data-rooms-xlsx", "Als Excel"], ['data-print="rooms"', "Aushang zum Ausdrucken (Word)"], ['data-print="doors"', "Türschilder (Word)"]])}</span></div><div id="rooms-body" class="stack"></div></div>
      <div class="stack" ${pane("rooms", "fahrten")} id="trips-body"></div><div class="stack" ${pane("rooms", "gruppen")} id="groups-body"></div>`,
    update() { fillTabs("rooms", { fahrten: state.trips.length, gruppen: state.groups.length }); roomsUpdateOrig(); $("#trips-body").innerHTML = tripsHtml(false); $("#groups-body").innerHTML = groupsHtml(false); },
  };
  views.trooms = {
    shell: () => `${pageHead("Einteilung", "Wer schläft wo, wer fährt mit wem, wer ist in welcher Gruppe?")}${tabBar("rooms")}<div ${pane("rooms", "zimmer")} id="trooms-body"></div><div class="stack" ${pane("rooms", "fahrten")} id="trips-body"></div><div class="stack" ${pane("rooms", "gruppen")} id="groups-body"></div>`,
    update() { fillTabs("rooms"); troomsUpdateOrig(); $("#trips-body").innerHTML = tripsHtml(true); $("#groups-body").innerHTML = groupsHtml(true); },
  };

  // ---------- Abzählliste (alle Leitenden) ----------
  const countDoc = () => STORE.peek("count", "main") || { checked: {} };
  views.count = {
    shell: () => `${pageHead("Abzählen", "Alle durchzählen, z.B. nach dem Ausflug. Alle Leitenden sehen die gleiche Liste.", `<div class="btn-group"><button class="btn" data-count-reset>Zurücksetzen</button>${menu([['data-print="count"', "Liste zum Ausdrucken (Word)"]])}</div>`)}
      <section class="card"><div class="card-head"><div class="count-big" id="count-big"></div><select class="input" id="count-filter" aria-label="Auswahl" style="max-width:240px"></select></div><div id="count-meta"></div><div id="count-list" class="count-list"></div></section>`,
    update() {
      const c = countDoc(); const ch = c.checked || {}; const f = state.countFilter || "";
      const stufen = [...new Set(state.kids.map((k) => k.stufe || ""))].filter(Boolean).sort();
      $("#count-filter").innerHTML = `<option value="">Alle Teilnehmenden</option>${stufen.map((s) => `<option value="s:${esc(s)}" ${f === "s:" + s ? "selected" : ""}>Stufe ${esc(s)}</option>`).join("")}${groupsSorted().map((g) => `<option value="g:${esc(g._id)}" ${f === "g:" + g._id ? "selected" : ""}>${esc(g.name)}</option>`).join("")}`;
      let kids = state.kids.slice();
      if (f.startsWith("s:")) kids = kids.filter((k) => (k.stufe || "") === f.slice(2));
      if (f.startsWith("g:")) { const g = byId(state.groups, f.slice(2)); kids = kids.filter((k) => g && inMembers(g.members, "k:" + k._id)); }
      kids.sort((a, b) => (ch[a._id] ? 1 : 0) - (ch[b._id] ? 1 : 0) || (a.stufe || "").localeCompare(b.stufe || "") || kidName(a).localeCompare(kidName(b)));
      const n = kids.filter((k) => ch[k._id]).length;
      $("#count-big").innerHTML = `<b>${n}</b> von ${kids.length} da${n === kids.length && kids.length ? ' <span class="tag ok">alle da</span>' : kids.length - n ? ` <span class="tag late">${kids.length - n} fehlen</span>` : ""}`;
      $("#count-meta").innerHTML = isLaLei() && c.at ? `<div class="card-body muted" style="font-size:12.5px;padding-block:6px">Zuletzt gezählt ${stampFmt(c.at)}${c.by ? " von " + esc(c.by) : ""}${c.resetAt ? ` · zurückgesetzt ${stampFmt(c.resetAt)}` : ""}</div>` : "";
      $("#count-list").innerHTML = kids.length ? kids.map((k) => { const g = groupOfKid(k._id); return `<button class="count-row ${ch[k._id] ? "on" : ""}" data-count="${esc(k._id)}" style="--sc:${stufeColor(k.stufe)}"><span class="cbox">${ch[k._id] ? "✓" : ""}</span><span class="cname">${esc(kidName(k))}</span>${stufeTag(k.stufe)}${g ? `<span class="muted" style="font-size:12px">${esc(g.name)}</span>` : ""}</button>`; }).join("") : `<div class="empty">Noch keine Teilnehmenden erfasst.</div>`;
    },
  };
  async function countToggle(id) {
    const c = countDoc(); const v = !(c.checked || {})[id];
    const data = { checked: { [id]: v }, at: nowStamp(), by: me() };
    try { if (STORE.peek("count", "main")) await state.db.doc("count/main").update(data); else await state.db.doc("count/main").set({ checked: { [id]: v }, at: data.at, by: data.by }); } catch (e) { handleWriteError(e); }
  }
  function countReset() {
    const o = modal(`<div class="lg-head"><span class="eyebrow">Abzählen</span><h2>Liste wirklich leeren?</h2></div><p style="margin:0">Alle Häkchen werden für alle Leitenden entfernt. Danach kann neu gezählt werden.</p><div class="lg-foot"><button class="link" data-cr-no>Abbrechen</button><button class="btn red" data-cr-yes>Ja, zurücksetzen</button></div>`);
    o.onclick = async (e) => { if (e.target === o || e.target.closest("[data-cr-no]")) return closeDrawer(); if (!e.target.closest("[data-cr-yes]")) return; try { await state.db.doc("count/main").set({ checked: {}, resetAt: nowStamp(), resetBy: me() }); closeDrawer(); toast("Zurückgesetzt"); } catch (err) { handleWriteError(err); } };
  }

  // ---------- Einkaufsliste (Lagerleitung) ----------
  const shopItems = () => ((STORE.peek("shop", "main") || {}).items || []);
  const saveShop = (items) => state.db.doc("shop/main").set({ items, updatedAt: nowStamp() }).catch(handleWriteError);
  views.shop = {
    shell: () => `${pageHead("Einkaufsliste", "Gemeinsam einkaufen: was noch fehlt", `<div class="btn-group"><button class="btn" data-shop-copy>Als Text kopieren</button>${menu([["data-shop-clean", "Erledigte löschen"]])}</div>`)}
      <section class="card"><form class="card-body todo-add shop-add" data-shop-add><input type="text" placeholder="z.B. Grillkohle" aria-label="Was"><input type="text" placeholder="Menge" aria-label="Menge"><button class="btn small primary">+</button></form><div id="shop-list"></div></section>`,
    update() {
      const box = $("#shop-list"); const items = shopItems(); const open = items.filter((x) => !x.done), done = items.filter((x) => x.done);
      const row = (x) => `<label class="check-item shop-row ${x.done ? "done" : ""}"><input type="checkbox" data-shop="${esc(x.id)}" ${x.done ? "checked" : ""}><span><b style="font-weight:500">${esc(x.t)}</b>${x.qty ? ` <span class="muted">· ${esc(x.qty)}</span>` : ""}</span><span class="muted" style="font-size:11.5px;margin-left:auto">${esc(x.by || "")}</span><button type="button" class="x" data-shop-rm="${esc(x.id)}" aria-label="Löschen">✕</button></label>`;
      box.innerHTML = `<div class="card-body stack" style="gap:2px">${open.map(row).join("") || '<span class="muted">Nichts mehr zu kaufen.</span>'}${done.length ? `<div class="sec-label" style="padding:12px 0 4px">Gekauft (${done.length})</div>${done.map(row).join("")}` : ""}</div>`;
    },
  };

  // ---------- Schichtplan: Beschreibung, faire Verteilung, Vorschlag, Aushang ----------
  const isNight = (s) => /nacht/i.test(s.name || "");
  function dutyCounts() {
    const plan = planDoc(); const ds = days(); const cnt = {}; const nights = {};
    for (const p of people()) cnt[p] = 0;
    ds.forEach((d, di) => { for (const s of plan.services) for (const n of (plan.cells || {})[d.id + "|" + s.id] || []) { cnt[n] = (cnt[n] || 0) + 1; if (isNight(s)) (nights[n] = nights[n] || []).push(di); } });
    return { cnt, nights };
  }
  const absentOn = (name, dayId) => { const p = state.peopleDocs.find((x) => displayName(x) === name); if (!p) return false; const s = attDoc("p_" + p._id); return dayparts().every((_, i) => s[dayId + "|" + i] === "F"); };
  function fairHtml() {
    const { cnt, nights } = dutyCounts(); const names = Object.keys(cnt).filter((n) => !state.peopleDocs.length || people().includes(n));
    if (!names.length) return "";
    const vals = names.map((n) => cnt[n]); const avg = vals.reduce((a, b) => a + b, 0) / names.length;
    const warn = (n) => { const w = []; if (cnt[n] >= avg + 2) w.push("deutlich mehr als andere"); const ns = (nights[n] || []).sort((a, b) => a - b); if (ns.some((x, i) => i && x === ns[i - 1] + 1)) w.push("zwei Nachtwachen hintereinander"); return w; };
    const rows = names.sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b));
    const max = Math.max(1, ...vals);
    return `<section class="card"><div class="card-head"><h2>Verteilung der Dienste</h2><span class="muted">Durchschnitt ${avg.toFixed(1)} pro Person</span></div><div class="card-body fair-grid">${rows.map((n) => { const w = warn(n); return `<div class="fair-row ${w.length ? "warn" : ""}"><span class="who">${av(n)}<span class="n">${esc(n)}</span></span><div class="bar ${w.length ? "" : "ok"}"><i style="width:${pct(cnt[n], max)}%"></i></div><b>${cnt[n]}</b>${w.length ? `<span class="tag late plain" style="font-size:11px">${esc(w.join(", "))}</span>` : ""}</div>`; }).join("")}</div></section>`;
  }
  function autoFillPlan() {
    const plan = planDoc(); const ds = days(); const { cnt } = dutyCounts(); const cells = {}; let filled = 0;
    const prevNight = {};
    ds.forEach((d, di) => {
      const busy = new Set(); for (const s of plan.services) ((plan.cells || {})[d.id + "|" + s.id] || []).forEach((n) => busy.add(n));
      for (const s of plan.services) {
        const k = d.id + "|" + s.id; const cur = (plan.cells || {})[k] || []; const need = Math.max(1, Number(s.count) || 1) - cur.length; if (need <= 0) { if (isNight(s)) cur.forEach((n) => (prevNight[n] = di)); continue; }
        const cand = people().filter((n) => !busy.has(n) && !absentOn(n, d.id) && !(isNight(s) && prevNight[n] === di - 1)).sort((a, b) => (cnt[a] || 0) - (cnt[b] || 0) || Math.random() - 0.5);
        const pick = cand.slice(0, need); if (!pick.length) continue;
        pick.forEach((n) => { busy.add(n); cnt[n] = (cnt[n] || 0) + 1; if (isNight(s)) prevNight[n] = di; });
        cells[k] = [...cur, ...pick]; filled += pick.length;
      }
    });
    if (!filled) return toast("Alle Dienste sind schon besetzt (oder niemand ist verfügbar).");
    const o = modal(`<div class="lg-head"><span class="eyebrow">Schichtplan</span><h2>Leere Dienste füllen</h2></div><p style="margin:0">Das Tool schlägt <b>${filled}</b> Einteilungen vor: wer am wenigsten Dienste hat und laut Anwesenheit da ist, nie zwei Dienste am gleichen Tag und keine Nachtwache zwei Nächte hintereinander. Bestehende Einteilungen bleiben.</p><div class="lg-foot"><button class="link" data-af-no>Abbrechen</button><button class="btn primary" data-af-yes>Eintragen</button></div>`);
    o.onclick = async (e) => { if (e.target === o || e.target.closest("[data-af-no]")) return closeDrawer(); if (!e.target.closest("[data-af-yes]")) return; closeDrawer(); await savePlan({ cells }); toast(`${filled} Dienste eingeteilt`); };
  }
  const planShellOrig = views.plan.shell, planUpdateOrig = views.plan.update;
  views.plan.shell = () => planShellOrig().replace('<button class="btn primary" data-export="plan">Als Excel</button>', `<div class="btn-group"><button class="btn primary" data-plan-auto>Leere Dienste füllen</button>${menu([['data-export="plan"', "Als Excel"], ['data-print="plan"', "Aushang zum Ausdrucken (Word)"]])}</div>`).replace('<div id="plan-body"></div>', '<div id="plan-body" class="stack"></div><div id="plan-fair"></div>');
  views.plan.update = function () {
    planUpdateOrig();
    const svcs = planDoc().services;
    document.querySelectorAll("#plan-body [data-svc]").forEach((inp) => { const i = +inp.dataset.svc; const d = document.createElement("input"); d.dataset.svcDesc = i; d.value = (svcs[i] || {}).desc || ""; d.placeholder = "Was ist zu tun? (sieht das Team)"; d.setAttribute("aria-label", "Beschreibung"); d.className = "svc-desc-in"; inp.after(d); });
    const tbl = $("#plan-body .plan-table"); if (tbl) tbl.querySelectorAll("tbody tr").forEach((tr, i) => { const s = svcs[i]; if (s && s.desc) tr.cells[0].insertAdjacentHTML("beforeend", `<div class="muted svc-desc">${esc(s.desc)}</div>`); });
    $("#plan-fair").innerHTML = fairHtml();
  };

  // ---------- Ausdrucke ----------
  function printDoc(kind) {
    const L = lagerDoc(); const H = `${L.abteilung || "Cevi"} · ${L.title || ""}`; let b = "", name = "", opts = {};
    if (kind === "plan") {
      const ds = days(); const plan = planDoc(); if (!ds.length) return toast("Noch keine Lagertage.");
      const w0 = 2200, w = Math.floor((14570 - w0) / ds.length);
      b = W.p(W.r("Schichtplan"), { style: "Title" }) + W.tbl([w0, ...ds.map(() => w)], [[W.head("Dienst"), ...ds.map((d) => W.head(d.label + (d.date ? "\n" + fmtFull(d.date).slice(0, 6) : "")))], ...plan.services.map((s) => [W.cell(s.name + (s.desc ? "\n" + s.desc : ""), { b: 1 }), ...ds.map((d) => W.cell(((plan.cells || {})[d.id + "|" + s.id] || []).join("\n") || "–", { sz: 22 }))])], { head: 1 });
      name = "Schichtplan Aushang"; opts.landscape = true;
    } else if (kind === "rooms" || kind === "doors") {
      const rs = roomsSorted(); if (!rs.length) return toast("Noch keine Zimmer oder Zelte.");
      const names = (r) => (r.members || []).map(memberInfo).filter(Boolean).map((i) => i.name);
      if (kind === "rooms") { b = W.p(W.r("Zimmer & Zelte"), { style: "Title" }) + W.tbl([2800, 6838], [[W.head("Zimmer / Zelt"), W.head("Wer")], ...rs.map((r) => [W.cell(r.name || "", { b: 1, sz: 24 }), W.cell(names(r).join(", ") || "–", { sz: 22 })])], { head: 1 }); name = "Zimmer Aushang"; }
      else { b = rs.map((r, i) => (i ? PB : "") + W.p(W.r(r.kind || "Zimmer", { color: MUTE, sz: 32 }), { before: 600 }) + W.p(W.r(r.name || "", { b: 1, color: ACC, sz: 110 }), { after: 400 }) + names(r).map((n) => W.p(W.r(n, { sz: 44 }), { after: 80 })).join("")).join(""); name = "Türschilder"; }
    } else if (kind === "trips") {
      const all = [...tripsOf("Hin"), ...tripsOf("Rück")]; if (!all.length) return toast("Noch keine Fahrten.");
      b = W.p(W.r("Fahrten"), { style: "Title" }); for (const t of all) { b += W.p(W.r(`${t.kind === "ÖV" ? "ÖV" : "Auto"} · ${t.name || ""}`), { style: "Heading1" }) + W.p(W.r(tripLineText(t), { color: MUTE })); b += W.text((t.members || []).map(memberInfo).filter(Boolean).map((i) => "- " + i.name).join("\n") || "- niemand"); }
      name = "Fahrtenliste";
    } else if (kind === "groups") {
      const gs = groupsSorted(); if (!gs.length) return toast("Noch keine Gruppen.");
      b = gs.map((g, i) => (i ? PB : "") + W.p(W.r(g.name || ""), { style: "Title" }) + W.p(W.r("Leitung: " + ((g.leaders || []).map((id) => (memberInfo({ t: "p", id }) || {}).name).filter(Boolean).join(", ") || "–"), { b: 1 })) + W.tbl([5000, 4638], [[W.head("Name"), W.head("Stufe")], ...(g.members || []).map((m) => byId(state.kids, m.id)).filter(Boolean).sort((a, c) => kidName(a).localeCompare(kidName(c))).map((k) => [W.cell(kidName(k)), W.cell(k.stufe || "")])], { head: 1 })).join("");
      name = "Gruppenlisten";
    } else if (kind === "count") {
      const kids = state.kids.slice().sort((a, c) => (a.stufe || "").localeCompare(c.stufe || "") || kidName(a).localeCompare(kidName(c)));
      b = W.p(W.r("Abzählliste"), { style: "Title" }) + W.tbl([3400, 1600, 1800, 950, 950, 950, 990], [[W.head("Name"), W.head("Stufe"), W.head("Gruppe"), W.head(""), W.head(""), W.head(""), W.head("")], ...kids.map((k) => [W.cell(kidName(k)), W.cell(k.stufe || ""), W.cell((groupOfKid(k._id) || {}).name || ""), W.cell("☐"), W.cell("☐"), W.cell("☐"), W.cell("☐")])], { head: 1 });
      name = "Abzählliste";
    } else if (kind === "org") {
      const rs = ressorts(); const w = Math.floor(14570 / Math.max(1, rs.length));
      const cellOf = (r) => W.p(W.r(r.name, { b: 1, color: ACC, sz: 26 }), { after: 60 }) + W.p(W.r("Leitung: " + (r.lead || "offen"))) + W.p(W.r("Stv: " + (r.stv || "offen"), { color: MUTE })) + subsOf(r).map((s) => W.p(W.r("↳ " + s.name, { b: 1 }), { before: 120 }) + W.p(W.r((s.lead || "offen") + (s.stv ? " / " + s.stv : ""), { sz: 19 }))).join("");
      b = W.p(W.r("Organigramm " + (L.title || "")), { style: "Title" }) + W.tbl(rs.map(() => w), [rs.map(cellOf)]);
      name = "Organigramm Poster"; opts.landscape = true;
    }
    saveFile(`${name} ${fileSafe(L.title)}.docx`, docx(b, H, name, opts));
  }

  // ---------- Klicks und Eingaben ----------
  view.addEventListener("click", (e) => {
    const pr = e.target.closest("[data-print]"); if (pr) return printDoc(pr.dataset.print);
    const td = e.target.closest("[data-trip-dir]"); if (td) { state.tripDir = td.dataset.tripDir; $("#trips-body").innerHTML = tripsHtml(!isLaLei()); return; }
    const ta = e.target.closest("[data-trip-add]"); if (ta) { const kind = ta.dataset.tripAdd; const dir = state.tripDir || "Hin"; const d = cfg().dates || {}; const n = tripsOf(dir).filter((t) => (t.kind || "Auto") === kind).length + 1;
      state.db.collection("trips").add({ dir, kind, name: kind === "ÖV" ? `ÖV-Gruppe ${n}` : `Auto ${n}`, driver: "", seats: kind === "ÖV" ? "" : "4", date: dir === "Hin" ? d.prep || d.start || "" : d.end || "", time: "", from: "", to: "", meet: "", members: [], order: Date.now() }).catch(handleWriteError); return; }
    const trm = e.target.closest("[data-trip-rm]"); if (trm) { if (trm.dataset.sure) state.db.doc("trips/" + trm.dataset.tripRm).delete().catch(handleWriteError); else { trm.dataset.sure = "1"; trm.textContent = "Löschen?"; trm.classList.add("danger"); } return; }
    const tout = e.target.closest("[data-trip-out]"); if (tout) { const [id, key] = tout.dataset.tripOut.split("|"); const t = byId(state.trips, id); if (t) state.db.doc("trips/" + id).update({ members: (t.members || []).filter((m) => memberKey(m) !== key) }).catch(handleWriteError); return; }
    const tp = e.target.closest("[data-trip-pick]"); if (tp) { const t = byId(state.trips, tp.dataset.tripPick); if (!t) return; const taken = new Set(); for (const x of tripsOf(t.dir || "Hin")) if (x._id !== t._id) { (x.members || []).forEach((m) => taken.add(memberKey(m))); if (x.driver) taken.add("p:" + x.driver); } if (t.driver) taken.add("p:" + t.driver);
      openPicker({ eyebrow: t.kind === "ÖV" ? "ÖV-Gruppe" : "Auto", title: t.name || "Fahrt", current: (t.members || []).map(memberKey), taken, onSave: (mem) => state.db.doc("trips/" + t._id).update({ members: mem }).catch(handleWriteError) }); return; }
    if (e.target.closest("[data-group-add]")) { state.db.collection("groups").add({ name: `Gruppe ${state.groups.length + 1}`, leaders: [], members: [], order: Date.now() }).catch(handleWriteError); return; }
    if (e.target.closest("[data-group-auto]")) return autoGroups();
    const grm = e.target.closest("[data-group-rm]"); if (grm) { if (grm.dataset.sure) state.db.doc("groups/" + grm.dataset.groupRm).delete().catch(handleWriteError); else { grm.dataset.sure = "1"; grm.textContent = "Löschen?"; grm.classList.add("danger"); } return; }
    const go = e.target.closest("[data-group-out]"); if (go) { const [id, key] = go.dataset.groupOut.split("|"); const g = byId(state.groups, id); if (g) state.db.doc("groups/" + id).update({ members: (g.members || []).filter((m) => memberKey(m) !== key) }).catch(handleWriteError); return; }
    const glo = e.target.closest("[data-group-lout]"); if (glo) { const [id, pid] = glo.dataset.groupLout.split("|"); const g = byId(state.groups, id); if (g) state.db.doc("groups/" + id).update({ leaders: (g.leaders || []).filter((x) => x !== pid) }).catch(handleWriteError); return; }
    const gp = e.target.closest("[data-group-pick]"); if (gp) { const g = byId(state.groups, gp.dataset.groupPick); if (!g) return; const taken = new Set(); for (const x of state.groups) if (x._id !== g._id) (x.members || []).forEach((m) => taken.add(memberKey(m)));
      openPicker({ eyebrow: "Gruppe", title: g.name, current: (g.members || []).map(memberKey), taken, leaders: false, onSave: (mem) => state.db.doc("groups/" + g._id).update({ members: mem }).catch(handleWriteError) }); return; }
    const gl = e.target.closest("[data-group-lead]"); if (gl) { const g = byId(state.groups, gl.dataset.groupLead); if (!g) return;
      openPicker({ eyebrow: "Gruppe", title: "Leitung " + g.name, current: (g.leaders || []).map((id) => "p:" + id), taken: new Set(), kids: false, onSave: (mem) => state.db.doc("groups/" + g._id).update({ leaders: mem.map((m) => m.id) }).catch(handleWriteError) }); return; }
    const cn = e.target.closest("[data-count]"); if (cn) return countToggle(cn.dataset.count);
    if (e.target.closest("[data-count-reset]")) return countReset();
    const sh = e.target.closest("[data-shop]"); if (sh && sh.tagName === "INPUT") { saveShop(shopItems().map((x) => (x.id === sh.dataset.shop ? { ...x, done: sh.checked } : x))); return; }
    const shr = e.target.closest("[data-shop-rm]"); if (shr) { e.preventDefault(); saveShop(shopItems().filter((x) => x.id !== shr.dataset.shopRm)); return; }
    if (e.target.closest("[data-shop-clean]")) { saveShop(shopItems().filter((x) => !x.done)); return; }
    if (e.target.closest("[data-shop-copy]")) { const it = shopItems().filter((x) => !x.done); copyText(`🛒 Einkaufsliste ${lagerDoc().title || ""}\n` + it.map((x) => `• ${x.t}${x.qty ? " (" + x.qty + ")" : ""}`).join("\n")); return; }
    if (e.target.closest("[data-plan-auto]")) return autoFillPlan();
  });
  view.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.matches("[data-shop-add]")) { e.preventDefault(); const [t, q] = f.querySelectorAll("input"); const v = t.value.trim(); if (!v) return t.focus(); const qty = q.value.trim(); t.value = ""; q.value = ""; saveShop([...shopItems(), { id: uid(), t: v, qty, done: false, by: me() }]); t.focus(); }
  });
  view.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.trip) { const [id, k] = t.dataset.trip.split("|"); state.db.doc("trips/" + id).update({ [k]: t.value.trim() }).catch(handleWriteError); return; }
    if (t.dataset.group) { const [id, k] = t.dataset.group.split("|"); state.db.doc("groups/" + id).update({ [k]: t.value.trim() }).catch(handleWriteError); return; }
    if (t.id === "count-filter") { state.countFilter = t.value; views.count.update(); return; }
    if (t.dataset.svcDesc !== undefined) { const arr = planDoc().services.map((s) => ({ ...s })); arr[+t.dataset.svcDesc].desc = t.value.trim(); savePlan({ services: arr }); return; }
  });
