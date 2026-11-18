  // =====================================================================
  // Vorlagen für alle Lager: Aufgaben-Vorlagen und Packlisten-Vorlagen (z.B. «HeLa»)
  // Erstellt im Admin aus einem bestehenden Lager, eingefügt im Lager (Aufgaben bzw. Packliste)
  // =====================================================================
  const lagerStart = (c) => { const d = (c || {}).dates || {}; return d.start || d.prep || ""; };

  // ---------- Admin: Vorlagen verwalten ----------
  let adPw = "", vlAdmin = null, vlMsg = "";
  document.addEventListener("submit", (e) => {
    const f = e.target; if (!f.matches) return;
    if (f.matches("[data-ad-login]")) { adPw = ($("#ad-pw") || {}).value || ""; vlAdmin = null; vlMsg = ""; }
    if (f.matches("[data-ad-newpw]")) { const a = ($("#ad-n1") || {}).value, b = ($("#ad-n2") || {}).value; if (a && a === b) setTimeout(() => (adPw = a), 1500); }
  }, true);
  function vlSection() {
    const v = vlAdmin || { tasks: [], pack: [] };
    const lagers = STORE.lagerList();
    const opts = lagers.map((l) => `<option value="${esc(l._id)}">${esc(l.title || l._id)}</option>`).join("");
    const list = (arr, kind) => arr.length ? arr.map((x, i) => `<div class="ad-person"><b>${esc(x.name)}</b><span class="muted">${kind === "tasks" ? `${x.items.length} Aufgaben` : `${x.items.length} Punkte`}${x.from ? " · aus " + esc(x.from) : ""}</span><button class="btn small ghost" data-vl-ren="${kind}|${i}">Umbenennen</button><button class="btn small ghost danger" data-vl-rm="${kind}|${i}">Löschen</button></div>`).join("") : '<span class="muted">Noch keine.</span>';
    return `<section class="card" id="ad-vorlagen"><div class="card-head"><h2>Vorlagen für alle Lager</h2></div><div class="card-body stack" style="gap:12px">
      ${vlMsg ? `<div class="ok-note">${vlMsg}</div>` : ""}
      <p class="hint" style="margin:0">Eine Vorlage übernimmt Aufgaben (ohne Namen, Deadlines relativ zum Lagerbeginn) bzw. die Packliste aus einem bestehenden Lager. Die Lagerleitung fügt sie dann im eigenen Lager ein und kann alles anpassen.</p>
      ${vlAdmin ? `<span class="field-label">Aufgaben-Vorlagen</span>${list(v.tasks, "tasks")}
      <span class="field-label">Packlisten-Vorlagen</span>${list(v.pack, "pack")}
      <div class="stack" style="gap:8px"><span class="field-label">Neue Vorlage</span><div class="form-grid">
        <input id="vl-name" placeholder="Titel, z.B. HeLa" aria-label="Titel der Vorlage">
        <select id="vl-lager" class="input" aria-label="Aus Lager">${opts}</select>
        <select id="vl-kind" class="input" aria-label="Art"><option value="tasks">Aufgaben</option><option value="pack">Packliste</option></select></div>
        <button class="btn small" data-vl-new style="align-self:flex-start">Aus diesem Lager erstellen</button></div>` : '<span class="muted">Wird geladen …</span>'}</div></section>`;
  }
  async function vlLoad() { try { vlAdmin = await STORE.admin(adPw, "getVorlagen"); } catch (e) { vlAdmin = { tasks: [], pack: [] }; vlMsg = esc(errMsg(e)); } vlPaint(); }
  async function vlSave(next, msg) { try { await STORE.admin(adPw, "setVorlagen", { vorlagen: next }); vlAdmin = next; vlMsg = msg; } catch (e) { vlMsg = esc(errMsg(e)); } vlPaint(); }
  function vlPaint() {
    const m = $(".admin-modal"); if (!m || !adPw || !/Angemeldet als Admin/.test(m.textContent)) return;
    const html = vlSection(); const old = $("#ad-vorlagen", m);
    if (old) old.outerHTML = html; else { const ref = [...m.querySelectorAll("section.card")].find((s) => /Wartungshinweis/.test(s.textContent)); if (ref) ref.insertAdjacentHTML("beforebegin", html); else { const foot = $(".lg-foot", m); if (foot) foot.insertAdjacentHTML("beforebegin", html); } }
    if (!vlAdmin) vlLoad();
  }
  const showAdminOrigVl = showAdmin;
  showAdmin = function () {
    adPw = ""; vlAdmin = null; vlMsg = ""; showAdminOrigVl();
    const m = $(".admin-modal"); if (!m) return;
    new MutationObserver(() => { if (!$("#ad-vorlagen", m)) vlPaint(); }).observe(m, { childList: true });
    m.addEventListener("click", async (e) => {
      const rm = e.target.closest("[data-vl-rm]"), ren = e.target.closest("[data-vl-ren]");
      if (rm) { const [k, i] = rm.dataset.vlRm.split("|"); const x = vlAdmin[k][+i]; if (!confirm(`Vorlage «${x.name}» löschen?`)) return; const next = { ...vlAdmin, [k]: vlAdmin[k].filter((_, j) => j !== +i) }; return vlSave(next, `Vorlage «${esc(x.name)}» gelöscht.`); }
      if (ren) { const [k, i] = ren.dataset.vlRen.split("|"); const x = vlAdmin[k][+i]; const n = (prompt("Neuer Titel", x.name) || "").trim(); if (!n) return; const next = { ...vlAdmin, [k]: vlAdmin[k].map((y, j) => (j === +i ? { ...y, name: n } : y)) }; return vlSave(next, "Umbenannt."); }
      if (!e.target.closest("[data-vl-new]")) return;
      const name = $("#vl-name", m).value.trim(), lager = $("#vl-lager", m).value, kind = $("#vl-kind", m).value;
      if (!name) { vlMsg = ""; $("#vl-name", m).focus(); return toast("Bitte einen Titel eingeben."); }
      const b = e.target.closest("[data-vl-new]"); b.disabled = true; b.textContent = "Wird erstellt …";
      try {
        const data = await STORE.readLager(adPw, lager); const c = ((data.config || {}).main) || {}; const start = lagerStart(c);
        const titel = (STORE.lagerList().find((l) => l._id === lager) || {}).title || lager;
        let items;
        if (kind === "tasks") {
          items = Object.values(data.tasks || {}).map((t) => ({ title: t.title, ressort: t.ressort || "", teil: t.teil || "", offset: t.deadline && start ? daysBetween(parse(start), parse(t.deadline)) : null, note: t.note || "", checklist: (t.checklist || []).map((x) => ({ t: x.t, done: false })), ongoing: !!t.ongoing, repeat: t.repeat || "", star: !!t.star })).filter((t) => t.title);
          items.sort((a, b2) => (a.offset ?? 9999) - (b2.offset ?? 9999));
        } else items = (c.packlist || []).map((x) => ({ section: x.section || "Diverses", t: x.t, lalei: !!x.lalei }));
        if (!items.length) { vlMsg = `Im Lager «${esc(titel)}» gibt es noch keine ${kind === "tasks" ? "Aufgaben" : "Packliste"}.`; return vlPaint(); }
        const next = { ...vlAdmin, [kind]: [...vlAdmin[kind], { id: uid(), name, from: titel, at: nowStamp(), items }] };
        await vlSave(next, `Vorlage «${esc(name)}» mit ${items.length} ${kind === "tasks" ? "Aufgaben" : "Punkten"} erstellt.`);
      } catch (err) { vlMsg = esc(errMsg(err)); vlPaint(); }
    });
  };

  // ---------- Im Lager: Vorlagen einfügen ----------
  let vlLager = null;
  const ladeVorlagen = async () => { if (!vlLager) vlLager = await STORE.vorlagen(); return vlLager; };
  const tasksShellOrigVl = views.tasks.shell;
  views.tasks.shell = () => tasksShellOrigVl().replace(/(<button type="button" data-task-paste>[^<]*<\/button>)/, `$1<button type="button" data-task-vorlage>Aus Vorlage einfügen</button>`);
  view.addEventListener("click", async (e) => { if (e.target.closest("[data-task-vorlage]")) aufgabenVorlage(); });
  async function aufgabenVorlage() {
    let v; try { v = await ladeVorlagen(); } catch (e) { return toast(errMsg(e)); }
    const list = v.tasks || []; const start = lagerStart(cfg());
    const o = modal(`<div class="lg-head"><span class="eyebrow">Aufgaben</span><h2>Aus Vorlage einfügen</h2></div>
      ${list.length ? `<label class="field"><span>Vorlage</span><select id="tv-sel" class="input">${list.map((x, i) => `<option value="${i}">${esc(x.name)} (${x.items.length} Aufgaben)</option>`).join("")}</select></label>
      <p class="hint" style="margin:0">${start ? `Die Deadlines werden ab dem Lagerbeginn (${fmtFull(start)}) berechnet.` : "Noch kein Lagerbeginn eingetragen: Die Aufgaben kommen ohne Deadline."} Verantwortlich wird jeweils die Ressortleitung. Aufgaben mit gleichem Titel, die es schon gibt, werden übersprungen.</p>`
      : '<p class="muted">Es gibt noch keine Aufgaben-Vorlagen. Ein Admin erstellt sie unter «Admin › Vorlagen für alle Lager».</p>'}
      <div class="lg-foot"><button class="link" data-tv-no>Abbrechen</button>${list.length ? '<button class="btn primary" data-tv-go>Einfügen</button>' : ""}</div>`);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-tv-no]")) return closeDrawer();
      if (!e.target.closest("[data-tv-go]")) return;
      const tpl = list[+$("#tv-sel", o).value]; const da = new Set(allTasks().map((t) => t.title.trim().toLowerCase()));
      const namen = new Set(ressorts().map((r) => r.name)); const fallback = (ressorts()[0] || {}).name || "";
      const ops = tpl.items.filter((t) => !da.has(t.title.trim().toLowerCase())).map((t, i) => ({ op: "set", coll: "tasks", id: state.db.newId(), data: {
        title: t.title, ressort: namen.has(t.ressort) ? t.ressort : fallback, teil: namen.has(t.ressort) ? t.teil || "" : "", owner: "", support: "", status: "Offen",
        deadline: start && t.offset != null ? addDays(start, t.offset) : "", note: t.note || "", checklist: t.checklist || [], links: [], ongoing: !!t.ongoing, repeat: t.repeat || "", star: !!t.star,
        order: Date.now() + i, createdAt: nowStamp(), updatedAt: nowStamp(), updatedBy: me(), log: [{ at: nowStamp(), by: me(), text: `Aus Vorlage «${tpl.name}»` }] } }));
      if (!ops.length) { closeDrawer(); return toast("Alle Aufgaben dieser Vorlage gibt es schon."); }
      try { for (let i = 0; i < ops.length; i += 150) await state.db.batch(ops.slice(i, i + 150)); closeDrawer(); autoOwnerLast = 0;
        toastAction(`${ops.length} Aufgaben aus «${tpl.name}» eingefügt`, "Rückgängig", () => state.db.batch(ops.map((x) => ({ op: "delete", coll: "tasks", id: x.id }))).then(() => toast("Rückgängig gemacht")).catch(handleWriteError));
      } catch (err) { handleWriteError(err); }
    };
  }
  const packUpdateOrigVl = views.pack.update;
  views.pack.update = function () {
    packUpdateOrigVl(); const box = $("#pack-tpl"); if (!box || !isLaLei() || isReadOnly() || isClosed() || state.asTeam || $("[data-pv-row]", box)) return;
    box.insertAdjacentHTML("beforeend", `<div class="card-body" data-pv-row style="border-top:1px solid var(--line)"><button class="btn small" data-pack-vorlage>Aus Vorlage einfügen (z.B. HeLa)</button></div>`);
  };
  view.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-pack-vorlage]")) return;
    let v; try { v = await ladeVorlagen(); } catch (err) { return toast(errMsg(err)); }
    const list = v.pack || [];
    const o = modal(`<div class="lg-head"><span class="eyebrow">Packliste</span><h2>Aus Vorlage einfügen</h2></div>
      ${list.length ? `<label class="field"><span>Vorlage</span><select id="pv-sel" class="input">${list.map((x, i) => `<option value="${i}">${esc(x.name)} (${x.items.length} Punkte)</option>`).join("")}</select></label><p class="hint" style="margin:0">Die Punkte kommen zur bestehenden Packliste dazu (doppelte werden übersprungen) und lassen sich danach ändern.</p>`
      : '<p class="muted">Es gibt noch keine Packlisten-Vorlagen. Ein Admin erstellt sie unter «Admin › Vorlagen für alle Lager».</p>'}
      <div class="lg-foot"><button class="link" data-pv-no>Abbrechen</button>${list.length ? '<button class="btn primary" data-pv-go>Einfügen</button>' : ""}</div>`);
    o.onclick = async (ev) => {
      if (ev.target === o || ev.target.closest("[data-pv-no]")) return closeDrawer();
      if (!ev.target.closest("[data-pv-go]")) return;
      const tpl = list[+$("#pv-sel", o).value]; const cur = packTemplate(); const da = new Set(cur.map((x) => (x.section + "|" + x.t).toLowerCase()));
      const neu = tpl.items.filter((x) => !da.has((x.section + "|" + x.t).toLowerCase())).map((x) => ({ id: "t" + uid(), section: x.section, t: x.t, ...(x.lalei ? { lalei: true } : {}) }));
      closeDrawer(); if (!neu.length) return toast("Alle Punkte gibt es schon.");
      await writeConfig({ packlist: [...cur, ...neu] }); toast(`${neu.length} Punkte aus «${tpl.name}» eingefügt`);
    };
  });
