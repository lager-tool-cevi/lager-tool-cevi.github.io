  // =====================================================================
  // Adressbuch der Lagerleitung: externe Kontakte (Lagerhaus, Lieferanten …)
  // Nur die Lagerleitung sieht es (der Server schickt es dem Team nicht). Nach dem Lager aufräumen,
  // markierte Kontakte bleiben fürs nächste Lager.
  // =====================================================================
  HELP.adressbuch = "Kontakte rund ums Lager, z.B. Lagerhaus, Bauer, Bäckerei, Carunternehmen. Nur die Lagerleitung sieht sie. Mit «Fürs nächste Lager behalten» werden sie beim nächsten Lager übernommen.";
  state.kontakte = state.kontakte || [];
  const kontakteAlle = () => (state.kontakte || []).slice().sort((a, b) => (a.gruppe || "~").localeCompare(b.gruppe || "~") || (a.name || "").localeCompare(b.name || ""));
  const telLink = (n) => "tel:" + String(n || "").replace(/[^\d+]/g, "");
  views.adressbuch = {
    shell: () => `${pageHead("Adressbuch", "", isLaLei() && !isReadOnly() && !isClosed() ? `<button class="btn primary" data-kt-neu>+ Kontakt</button>` : "")}
      <section class="card"><div class="toolbar"><input type="search" id="kt-q" placeholder="Kontakte durchsuchen" value="${esc(state.ktQ || "")}" aria-label="Suchen"></div><div id="kt-list"></div></section>`,
    update() {
      const q = (state.ktQ || "").trim().toLowerCase(); const kann = isLaLei() && !isReadOnly() && !isClosed();
      const list = kontakteAlle().filter((k) => !q || `${k.name} ${k.funktion} ${k.gruppe} ${k.notiz} ${k.tel} ${k.mail}`.toLowerCase().includes(q));
      let grp = null;
      $("#kt-list").innerHTML = list.length ? list.map((k) => { const kopf = (k.gruppe || "Weitere") !== grp ? `<div class="sec-label kt-grp">${esc(k.gruppe || "Weitere")}</div>` : ""; grp = k.gruppe || "Weitere";
        return `${kopf}<div class="kt-row"><div class="kt-main"><b>${esc(k.name || "")}</b>${k.funktion ? `<span class="muted">${esc(k.funktion)}</span>` : ""}${k.notiz ? `<div class="rich kt-notiz">${rich(k.notiz)}</div>` : ""}</div>
          <div class="kt-acts">${k.tel ? `<a class="btn small" href="${esc(telLink(k.tel))}">${esc(k.tel)}</a>` : ""}${k.mail ? `<a class="btn small ghost" href="mailto:${esc(k.mail)}">E-Mail</a>` : ""}${k.behalten ? '<span class="tag plain" title="Wird beim nächsten Lager übernommen">bleibt</span>' : ""}${kann ? `<button class="link" data-kt-edit="${esc(k._id)}">Bearbeiten</button>` : ""}</div></div>`; }).join("")
        : `<div class="empty">${kontakteAlle().length ? "<b>Nichts gefunden</b>" : kann ? '<button class="btn primary leer-btn" data-kt-neu>+ Ersten Kontakt erfassen</button>' : "<b>Noch keine Kontakte</b>"}</div>`;
    },
  };
  function kontaktFenster(id) {
    const k = id ? (state.kontakte || []).find((x) => x._id === id) : null; const d = k ? { ...k } : { name: "", funktion: "", gruppe: "", tel: "", mail: "", notiz: "", behalten: false };
    const gruppen = [...new Set(["Lagerhaus", "Lebensmittel", "Transport", "Material", "Gemeinde & Behörden", ...(state.kontakte || []).map((x) => x.gruppe).filter(Boolean)])];
    const o = modal(`<div class="lg-head"><span class="eyebrow">Adressbuch</span><h2>${k ? "Kontakt bearbeiten" : "Neuer Kontakt"}</h2></div>
      <label class="field"><span>Name bzw. Firma</span><input data-kt="name" value="${esc(d.name)}" placeholder="z.B. Pfadiheim Wildhaus"></label>
      <div class="form-grid"><label class="field"><span>Funktion / Ansprechperson</span><input data-kt="funktion" value="${esc(d.funktion)}" placeholder="z.B. Hauswartin Frau Muster"></label>
        <label class="field"><span>Gruppe</span><input data-kt="gruppe" value="${esc(d.gruppe)}" list="kt-gruppen" placeholder="z.B. Lagerhaus"><datalist id="kt-gruppen">${gruppen.map((g) => `<option value="${esc(g)}">`).join("")}</datalist></label></div>
      <div class="form-grid"><label class="field"><span>Telefon</span><input type="tel" data-kt="tel" value="${esc(d.tel)}"></label><label class="field"><span>E-Mail</span><input type="email" data-kt="mail" value="${esc(d.mail)}"></label></div>
      <label class="field"><span>Notiz</span><textarea data-kt="notiz" rows="2" placeholder="z.B. Schlüsselübergabe Freitag 17 Uhr">${esc(d.notiz)}</textarea></label>
      <label class="toggle"><input type="checkbox" data-kt-behalten ${d.behalten ? "checked" : ""}> Fürs nächste Lager behalten</label>
      <div class="lg-foot">${k ? '<button class="btn small ghost danger" data-kt-del>Löschen</button>' : "<span></span>"}<span class="btn-group"><button class="btn" data-kt-no>Abbrechen</button><button class="btn primary" data-kt-ok>Speichern</button></span></div>`);
    o.oninput = (e) => { const t = e.target; if (t.dataset.kt) d[t.dataset.kt] = t.value; if (t.matches("[data-kt-behalten]")) d.behalten = t.checked; };
    o.onchange = o.oninput;
    setTimeout(() => { const f = $('[data-kt="name"]', o); if (f && !k) f.focus(); }, 30);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-kt-no]")) return closeDrawer();
      if (e.target.closest("[data-kt-del]")) { if (!confirm(`«${k.name}» löschen?`)) return; closeDrawer(); return trash([{ coll: "kontakte", id }], k.name || "Kontakt"); }
      if (!e.target.closest("[data-kt-ok]")) return; if (!String(d.name).trim()) return toast("Bitte einen Namen eingeben.");
      const data = { name: d.name.trim(), funktion: (d.funktion || "").trim(), gruppe: (d.gruppe || "").trim(), tel: (d.tel || "").trim(), mail: (d.mail || "").trim(), notiz: (d.notiz || "").trim(), behalten: !!d.behalten, updatedAt: nowStamp(), updatedBy: me(), createdAt: k ? k.createdAt || nowStamp() : nowStamp() };
      try { await state.db.batch([{ op: "set", coll: "kontakte", id: id || state.db.newId(), data }]); closeDrawer(); toast("Gespeichert"); } catch (err) { handleWriteError(err); }
    };
  }
  view.addEventListener("click", (e) => { if (e.target.closest("[data-kt-neu]")) return kontaktFenster(null); const b = e.target.closest("[data-kt-edit]"); if (b) kontaktFenster(b.dataset.ktEdit); });
  view.addEventListener("input", (e) => { if (e.target.id === "kt-q") { state.ktQ = e.target.value; views.adressbuch.update(); } });
  Object.assign(KIND, { kontakte: "Kontakt" });
  // Navigation: unter «Allgemein» nach Dokumente, nur Lagerleitung
  (() => { const d = $('#tabs button[data-view="docs"]'); if (d) d.insertAdjacentHTML("afterend", `<button role="tab" data-view="adressbuch" data-roles="lalei"><svg viewBox="0 0 24 24"><path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><circle cx="12" cy="10" r="3"/><path d="M7.5 17c1-2 2.6-3 4.5-3s3.5 1 4.5 3"/></svg>Adressbuch</button>`); })();

  // ---------- Nach dem Lager aufräumen ----------
  const nichtBehalten = () => (state.kontakte || []).filter((k) => !k.behalten);
  async function adressbuchAufraeumen() {
    const weg = nichtBehalten(); if (!weg.length) return toast("Es gibt nichts aufzuräumen.");
    if (!confirm(`${weg.length} Kontakte löschen? Kontakte mit «Fürs nächste Lager behalten» bleiben.`)) return;
    try { await state.db.batch(weg.map((k) => ({ op: "delete", coll: "kontakte", id: k._id }))); await writeConfig({ kontakteAufgeraeumt: nowStamp() }); toast(`${weg.length} Kontakte gelöscht`); } catch (err) { handleWriteError(err); }
  }
  view.addEventListener("click", (e) => { if (e.target.closest("[data-kt-aufraeumen]")) adressbuchAufraeumen(); });
  const ovUpdateOrigKt = views.overview.update;
  views.overview.update = function () { ovUpdateOrigKt(); if (isLaLei() && !isReadOnly() && lagerVorbei(180) && nichtBehalten().length && $("#ov-setup")) $("#ov-setup").insertAdjacentHTML("afterbegin", `<div class="conflict-note ds-hint">🔒 Das Lager ist seit über 6 Monaten vorbei. Bitte das Adressbuch aufräumen (${nichtBehalten().length} Kontakte). <button class="link" data-kt-aufraeumen>Aufräumen</button></div>`); };
  const checkItemsOrigKt = checkItems;
  checkItems = function () { const out = checkItemsOrigKt(); if (lagerVorbei() && (state.kontakte || []).length) out.push([!nichtBehalten().length || !lagerVorbei(180), "Datenschutz: Adressbuch", nichtBehalten().length ? `${nichtBehalten().length} Kontakte, spätestens 6 Monate nach dem Lager aufräumen` : "aufgeräumt", "adressbuch|"]); return out; };
  const adrUpdateOrig = views.adressbuch.update;
  views.adressbuch.update = function () { adrUpdateOrig(); if (isLaLei() && !isReadOnly() && lagerVorbei() && nichtBehalten().length) $("#kt-list").insertAdjacentHTML("afterbegin", `<div class="card-body"><button class="btn small" data-kt-aufraeumen>Nach dem Lager aufräumen (${nichtBehalten().length})</button></div>`); };
