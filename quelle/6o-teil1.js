  // =====================================================================
  // Runde 5, Teil 1: Ressort-Notizen als Liste, Karten zuklappen, Logo → Start, Plus-Knopf mit Zielen
  // =====================================================================
  const homeView = () => (isLaLei() && !state.asTeam ? "start" : "home");

  // ---------- Logo bzw. Lagername führt zum Start ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(".side .brand, .side-logo, #ab-title, .ab-title"); if (!b || e.target.closest("#bell")) return;
    if (!state.lagerId) return; setView(homeView());
  });

  // ---------- Ressort-Notizen: Eingabefeld + Liste ----------
  const ressNotizen = (r) => { const l = Array.isArray(r.notizen) ? r.notizen : []; return l.length || !r.notes ? l : [{ id: "alt", t: r.notes, by: "", at: "" }]; };
  function notizenHtml(r) {
    const l = ressNotizen(r).slice().sort((a, b) => (b.at || "").localeCompare(a.at || "")); const kann = isLaLei() && !isReadOnly() && !isClosed() && !state.asTeam;
    return `${kann ? `<form class="rn-add" data-rn-add><textarea id="rn-text" rows="2" data-mention placeholder="Neue Notiz …"></textarea><button class="btn small primary">Speichern</button></form>` : ""}
      <div class="rn-list">${l.map((n) => `<div class="rn-item" data-rn="${esc(n.id)}"><div class="rich">${rich(n.t)}</div><div class="rn-meta"><span class="muted">${esc(n.by || "")}${n.at ? (n.by ? " · " : "") + esc(stampFmt(n.at)) : ""}</span>${kann ? `<span class="rn-acts"><button class="link" data-rn-edit="${esc(n.id)}">Bearbeiten</button><button class="link danger" data-rn-rm="${esc(n.id)}">Löschen</button></span>` : ""}</div></div>`).join("") || '<span class="muted" style="font-size:13.5px">Noch keine Notizen.</span>'}</div>`;
  }
  async function ressNotizenSave(rid, list) { await writeConfig({ ressorts: { [rid]: { notizen: list, notes: "" } } }); }
  function ressNotizHinzu(rid, text) { const r = (cfg().ressorts || {})[rid]; if (!r) return; const list = [...ressNotizen(r), { id: uid(), t: text, by: me(), at: nowStamp() }]; return ressNotizenSave(rid, list); }
  const ressUpdateOrigN = views.ress.update;
  views.ress.update = function () {
    // Anker: beim ersten Zeichnen das alte Notizfeld, danach die eigene Notizliste (sonst würde nie mehr neu gezeichnet)
    ressUpdateOrigN(); const ta = $("#rp-notes") || $("#view .rn-list"); const r = ressorts().find((x) => x.id === state.ressId); if (!ta || !r) return;
    const body = ta.closest(".card-body"); if (!body) return; const fa = document.activeElement;
    if (body.contains(fa) && fa.id === "rn-text" && fa.value) return; // nicht stören beim Tippen
    body.innerHTML = notizenHtml(r);
  };
  view.addEventListener("submit", async (e) => {
    const f = e.target; if (!f.matches("[data-rn-add]")) return; e.preventDefault();
    const t = $("#rn-text", f); const v = t.value.trim(); if (!v) return t.focus(); t.value = "";
    // sofort zeigen (lokal ist es schon gespeichert), der Server bekommt es im Hintergrund
    const p = ressNotizHinzu(state.ressId, v); views.ress.update(); toast("Notiz gespeichert");
    const neu = $("#rn-text"); if (neu) neu.focus(); await p;
  });
  view.addEventListener("keydown", (e) => { if (e.target.id === "rn-text" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.target.form.requestSubmit(); } });
  view.addEventListener("click", async (e) => {
    const r = (cfg().ressorts || {})[state.ressId]; if (!r) return;
    const rm = e.target.closest("[data-rn-rm]"); if (rm) { if (!confirm("Diese Notiz löschen?")) return; const alt = ressNotizen(r); const p = ressNotizenSave(state.ressId, alt.filter((n) => n.id !== rm.dataset.rnRm)); views.ress.update(); toastAction("Notiz gelöscht", "Rückgängig", () => ressNotizenSave(state.ressId, alt).then(() => views.ress.update())); await p; return; }
    const ed2 = e.target.closest("[data-rn-edit]"); if (ed2) {
      const item = ed2.closest(".rn-item"); const n = ressNotizen(r).find((x) => x.id === ed2.dataset.rnEdit); if (!n) return;
      item.innerHTML = `<textarea class="rn-edit" rows="3" data-mention>${esc(n.t)}</textarea><div class="rn-meta"><span></span><span class="rn-acts"><button class="link" data-rn-cancel>Abbrechen</button><button class="btn small primary" data-rn-save="${esc(n.id)}">Speichern</button></span></div>`;
      $("textarea", item).focus(); return;
    }
    if (e.target.closest("[data-rn-cancel]")) return views.ress.update();
    const sv = e.target.closest("[data-rn-save]"); if (sv) { const v = $("textarea", sv.closest(".rn-item")).value.trim(); if (!v) return; const p = ressNotizenSave(state.ressId, ressNotizen(r).map((n) => (n.id === sv.dataset.rnSave ? { ...n, t: v, id: n.id === "alt" ? uid() : n.id } : n))); document.activeElement && document.activeElement.blur(); views.ress.update(); toast("Gespeichert"); await p; }
  });

  // ---------- Karten zuklappen (Ressortseite): nur der Titel bleibt ----------
  const ZU_KEY = "lalei-zu";
  const zuSet = () => { try { return new Set(JSON.parse(store.get(ZU_KEY) || "[]")); } catch { return new Set(); } };
  function klappbar(root) {
    const zu = zuSet();
    root.querySelectorAll("section.card > .card-head").forEach((h) => {
      const t = ($("h2", h) || {}).textContent; if (!t) return; const key = state.view + "|" + t.trim(); const card = h.parentElement;
      card.classList.add("klappbar"); card.classList.toggle("zu", zu.has(key)); h.dataset.zu = key;
      if (!$(".zu-pfeil", h)) h.insertAdjacentHTML("beforeend", '<span class="zu-pfeil" aria-hidden="true">⌄</span>');
      h.setAttribute("role", "button"); h.setAttribute("aria-expanded", String(!zu.has(key)));
    });
  }
  view.addEventListener("click", (e) => {
    const h = e.target.closest(".klappbar > .card-head"); if (!h || e.target.closest("button:not(.zu-pfeil), a, input, select, label, textarea")) return;
    const s = zuSet(); const k = h.dataset.zu; s.has(k) ? s.delete(k) : s.add(k); store.set(ZU_KEY, JSON.stringify([...s]));
    const card = h.parentElement; card.classList.toggle("zu", s.has(k)); h.setAttribute("aria-expanded", String(!s.has(k)));
  });
  const renderOrigZu = render;
  render = function () { renderOrigZu(); if (state.view === "ress") klappbar($("#view")); };
  const ressUpdateOrigZu = views.ress.update;
  views.ress.update = function () { ressUpdateOrigZu(); klappbar($("#view")); };

  // ---------- Plus-Knopf: Notiz für Ressort, Tag oder mich ----------
  showQuickNote = function () {
    const rs = ressorts(); const ds = days(); const t0 = iso(today()); const heute = ds.find((d) => d.date === t0) || ds.find((d) => d.date >= t0) || ds[0];
    const meinR = rs.find((r) => r.lead === me() || r.stv === me()) || rs.find((r) => r.id === state.ressId) || rs[0];
    let kind = state.view === "ress" ? "ress" : state.view === "day" ? "day" : "idea";
    const o = modal(`<div class="lg-head"><span class="eyebrow">Schnell-Notiz</span><h2>Kurz festhalten</h2></div>
      <div class="seg qn-ziele" role="radiogroup" aria-label="Wohin">${[["idea", "Traktandum"], ["note", "Protokoll"], ["ress", "Ressort"], ["day", "Tag"], ["me", "Für mich"]].map(([k, l]) => `<button type="button" data-qn-kind="${k}" aria-pressed="${k === kind}">${l}</button>`).join("")}</div>
      <select id="qn-ress" class="input" aria-label="Ressort" ${kind === "ress" ? "" : "hidden"}>${rs.map((r) => `<option value="${esc(r.id)}" ${r === meinR || r.id === state.ressId ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>
      <div class="qn-day" ${kind === "day" ? "" : "hidden"}><select id="qn-day" class="input" aria-label="Tag">${ds.map((d) => `<option value="${esc(d.id)}" ${(state.view === "day" ? d.id === state.dayId : d === heute) ? "selected" : ""}>${esc(d.label)}${d.date ? " · " + fmtFull(d.date) : ""}</option>`).join("")}</select>
        <select id="qn-block" class="input" aria-label="Bereich">${[["important", "Wichtig"], ["todo", "To-do"], ["discuss", "Zu besprechen"], ["ideas", "Idee"]].map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
      <textarea id="qn-text" rows="4" data-mention placeholder="Was willst du festhalten?"></textarea>
      <div class="lg-foot"><button class="link" data-qn-close>Abbrechen</button><button class="btn primary" data-qn-save>Speichern</button></div>`);
    setTimeout(() => $("#qn-text", o).focus(), 30);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-qn-close]")) return closeDrawer();
      const k = e.target.closest("[data-qn-kind]"); if (k) { kind = k.dataset.qnKind; o.querySelectorAll("[data-qn-kind]").forEach((x) => x.setAttribute("aria-pressed", String(x === k))); $("#qn-ress", o).hidden = kind !== "ress"; $(".qn-day", o).hidden = kind !== "day"; return; }
      if (!e.target.closest("[data-qn-save]")) return;
      const txt = $("#qn-text", o).value.trim(); if (!txt) return $("#qn-text", o).focus();
      const [first, ...rest] = txt.split("\n"); const now = nowStamp();
      try {
        if (kind === "ress") { await ressNotizHinzu($("#qn-ress", o).value, txt); closeDrawer(); return toast("Notiz beim Ressort gespeichert"); }
        if (kind === "day") { if (!ds.length) return toast("Es sind noch keine Lagertage festgelegt."); await addBlockItem($("#qn-day", o).value, $("#qn-block", o).value, txt); closeDrawer(); return toast("Auf der Tagesseite notiert"); }
        if (kind === "me") { await state.db.doc("todos/" + myId()).set({ ...(state.todos || {}), items: [...todoItems(), { id: uid(), t: txt, done: false, at: now }], updatedAt: now }); closeDrawer(); return toast("In deinen To-dos gespeichert"); }
        const data = kind === "idea" ? { type: "idea", title: first.slice(0, 120), text: rest.join("\n").trim(), by: me(), forDate: "", status: "Offen", date: iso(today()) } : { type: "note", date: iso(today()), title: first.slice(0, 120), text: rest.join("\n").trim() || first, author: me(), links: [] };
        await state.db.collection("journal").add({ ...data, createdAt: now, updatedAt: now, updatedBy: me() }); closeDrawer(); toast(kind === "idea" ? "Als Traktandum gespeichert" : "Notiz gespeichert");
      } catch (err) { handleWriteError(err); }
    };
  };
