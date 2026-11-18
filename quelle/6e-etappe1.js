  // =====================================================================
  // Etappe 1: Admin (mehrere Admins, Wartung, Nutzung, Fehler, Tempo), Passwort ändern,
  // Nur-Lesen-Rolle, Datenschutz, Teilnehmenden-Daten löschen, «Was ist neu», App-Installation
  // =====================================================================
  Object.assign(ERR, {
    ADMIN_UNBEKANNT: "Diesen Admin-Namen gibt es nicht.", NAME_VERGEBEN: "Diesen Namen gibt es schon.", NAME_FEHLT: "Bitte einen Namen eingeben.",
    LETZTER_ADMIN: "Der letzte Admin kann nicht entfernt werden.", NUR_LESEN: "Du hast nur Lesezugriff.", SERVER_ANTWORT_UNGUELTIG: "Der Server hat nicht richtig geantwortet. Bitte später nochmals versuchen.",
  });
  const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
  const ROLLE = { lalei: "Lagerleitung", lesen: "Nur lesen", team: "Team" };
  const BEREICHE = [["tasks", "Aufgaben"], ["protokoll", "Protokoll und Höcks"], ["people", "Leitende"], ["kids", "Teilnehmende"], ["att", "Anwesenheit"], ["plan", "Schichtplan"], ["einteilung", "Einteilung (Zimmer, Fahrten, Gruppen)"], ["info", "Infos & Links"], ["config", "Lagerdaten und Ressorts"], ["board", "Pinnwand"], ["eval", "Auswertung"], ["daypage", "Tagesseiten"]];
  const BEREICH_COLLS = { protokoll: ["journal", "hoecks"], einteilung: ["rooms", "trips", "groups"] };

  // ---------- Admin ----------
  showAdmin = function () {
    const st = { pw: "", data: null, err: "", msg: "", forgot: false, busy: false, backups: [], restore: null, sureOut: false, sureRm: null };
    const o = modal("", "admin-modal");
    const load = async () => { st.busy = true; draw(); try { st.data = await STORE.admin(st.pw, "overview"); st.err = ""; try { st.backups = (await STORE.admin(st.pw, "backups")).backups || []; } catch { st.backups = []; } } catch (e) { st.err = errMsg(e); st.data = null; } st.busy = false; draw(); };
    const sec = (title, inner, right = "") => `<section class="card"><div class="card-head"><h2>${title}</h2>${right}</div><div class="card-body stack" style="gap:10px">${inner}</div></section>`;
    const draw = () => {
      let body;
      if (st.forgot) {
        body = `<p style="margin:0">Ein <b>neues Passwort</b> für deinen Admin-Zugang wird an <b>lagerleitung@cevi-staefa-hombi.ch</b> geschickt. Das bisherige gilt danach nicht mehr.</p>
          <label class="field"><span>Dein Admin-Name</span><input id="ad-fname" autocomplete="off" placeholder="z.B. Knigge"></label>
          <div class="btn-group"><button class="btn primary" data-ad-forgot-go ${st.busy ? "disabled" : ""}>Neues Passwort senden</button><button class="btn" data-ad-forgot-no>Abbrechen</button></div>`;
      } else if (!st.data) {
        body = `<form class="stack" style="gap:12px" data-ad-login><label class="field"><span>Admin-Passwort</span><input type="password" id="ad-pw" autocomplete="current-password" required></label><button class="btn primary" ${st.busy ? "disabled" : ""}>${st.busy ? "Wird geprüft …" : "Öffnen"}</button></form>
          <button type="button" class="link" data-ad-forgot style="align-self:flex-start">Passwort vergessen?</button>`;
      } else {
        const d = st.data; const lagerTitel = (id) => (d.lagers.find((l) => l.id === id) || {}).title || id;
        const nutz = Object.values(d.nutzung || {}).sort((a, b) => (b.at || "").localeCompare(a.at || ""));
        const total = d.lagers.reduce((a, l) => a + (l.groesse || 0), 0);
        body = [
          `<p class="muted" style="margin:0">Angemeldet als Admin <b>${esc(d.ich)}</b>. Passwörter sind verschlüsselt gespeichert und können nicht angezeigt, nur neu gesetzt werden.</p>`,
          ...d.lagers.map((l) => sec(esc(l.title), `<form class="ad-row" data-ad-lpw="${esc(l.id)}"><label class="field" style="flex:1"><span>Lagerpasswort ${l.hasLagerPw ? '<span class="tag ok">gesetzt</span>' : '<span class="tag late">fehlt</span>'}</span><input type="password" autocomplete="new-password" minlength="6" placeholder="Neues Lagerpasswort"></label><button class="btn small">Setzen</button></form>
            <div class="field"><span>Lagerleitung und Nur-Lesen</span>${l.people.length ? l.people.map((p) => `<div class="ad-person">${av(p.name)}<b>${esc(p.name)}</b><span class="muted">${p.funktion === "Lesen" ? "nur lesen · " : ""}${p.hasPw ? "eigenes Passwort gesetzt" : "noch nie angemeldet"}</span>${p.hasPw ? `<button class="btn small" data-ad-reset="${esc(l.id)}|${esc(p.id)}">Passwort zurücksetzen</button>` : ""}</div>`).join("") : '<span class="muted">Noch niemand.</span>'}</div>`, `<span class="muted" style="font-size:12.5px">${kb(l.groesse)}</span>`)),
          sec("Admins", `${d.admins.map((a) => `<div class="ad-person">${av(a.name)}<b>${esc(a.name)}</b><span class="muted">${a.name === d.ich ? "du" : ""}</span>${a.name !== d.ich && d.admins.length > 1 ? `<button class="btn small ghost danger" data-ad-rm="${esc(a.id)}">${st.sureRm === a.id ? "Wirklich entfernen?" : "Entfernen"}</button>` : ""}</div>`).join("")}
            <form class="stack" style="gap:8px" data-ad-add><span class="field-label">Admin hinzufügen</span><div class="form-grid"><input placeholder="Name" aria-label="Name" required><input type="password" placeholder="Passwort (mind. 6 Zeichen)" aria-label="Passwort" minlength="6" autocomplete="new-password" required></div><button class="btn small" style="align-self:flex-start">Hinzufügen</button></form>
            <form class="stack" style="gap:8px" data-ad-newpw><span class="field-label">Mein Admin-Passwort ändern</span><div class="form-grid"><input type="password" id="ad-n1" placeholder="Neues Passwort" autocomplete="new-password" minlength="6" required><input type="password" id="ad-n2" placeholder="Nochmals" autocomplete="new-password" minlength="6" required></div><button class="btn small" style="align-self:flex-start">Ändern</button></form>`),
          sec("Wartungshinweis", `<p class="hint" style="margin:0">Erscheint oben bei allen, z.B. «Heute ab 20 Uhr kurz nicht erreichbar».</p><textarea id="ad-wtext" rows="2" placeholder="Text des Hinweises">${esc((d.wartung || {}).text || "")}</textarea><label class="toggle"><input type="checkbox" id="ad-won" ${(d.wartung || {}).on ? "checked" : ""}> Hinweis anzeigen</label><button class="btn small" data-ad-wsave style="align-self:flex-start">Speichern</button>`),
          sec("Nutzung", nutz.length ? `<div class="log-list" style="padding:0">${nutz.slice(0, 60).map((x) => `<div class="log-row"><span class="muted">${esc(stampFmt(x.at))}</span><b>${esc(x.name)}</b><span>${esc(ROLLE[x.role] || x.role)} · ${esc(lagerTitel(x.lager))}</span></div>`).join("")}</div><p class="hint" style="margin:0">Hilft, nach dem Lager Zugänge aufzuräumen: Wer lange nicht mehr da war, braucht vielleicht keinen Zugang mehr.</p>` : '<span class="muted">Noch keine Daten.</span>'),
          sec("Fehlerberichte", (d.fehler || []).length ? `${d.fehler.slice(0, 20).map((f) => `<div class="mrow" style="padding:8px 0"><div class="entry-top"><span class="muted" style="font-size:12px">${esc(stampFmt(f.at))} · ${esc(f.wo || "")} · Version ${esc(f.version || "?")}</span></div><code class="err-code">${esc(f.msg)}</code></div>`).join("")}<p class="hint" style="margin:0">Schick diese Meldungen an Claude, dann lässt sich der Fehler beheben.</p>` : '<span class="muted">Keine Fehler gemeldet. 👍</span>', (d.fehler || []).length ? '<button class="btn small" data-ad-fclear>Leeren</button>' : ""),
          sec("Tempo", `<div>Letzte Aktualisierung: <b>${STORE.lastSyncMs() ? STORE.lastSyncMs() + " ms" : "–"}</b></div><div>Gespeichert: <b>${d.zeilen}</b> Einträge, zusammen <b>${kb(total)}</b></div>${total > 3 * 1048576 ? '<div class="conflict-note">Die Daten werden gross. Alte Lager löschen oder Teilnehmenden-Daten vergangener Lager entfernen macht das Tool wieder schneller.</div>' : '<span class="hint">Alles im grünen Bereich.</span>'}`),
          sec("Sicherheit", `<p class="hint" style="margin:0">Anmeldungen laufen nach 60 Tagen ab (ohne «angemeldet bleiben» nach 12 Stunden). Beim Zurücksetzen eines Passworts wird die Person überall abgemeldet.</p><button class="btn small ${st.sureOut ? "red" : ""}" data-ad-logoutall style="align-self:flex-start">${st.sureOut ? "Wirklich alle abmelden?" : "Alle abmelden"}</button>`),
          sec("Sicherungen", `<p class="hint" style="margin:0">${STORE.isGas ? "Jeden Sonntag wird automatisch eine Kopie in eurem Google Drive gespeichert (Ordner «Lager-Tool Sicherungen»)." : "Vorschau: einmal pro Woche wird automatisch im Browser gesichert (höchstens 5)."}</p>
            <label class="field"><span>Lager</span><select id="ad-rest-lager" class="input">${d.lagers.map((l) => `<option value="${esc(l.id)}">${esc(l.title)}</option>`).join("")}</select></label>
            <div class="field"><span>Nur diese Bereiche zurückspielen (nichts angekreuzt = ganzes Lager)</span><div class="area-picks">${BEREICHE.map(([k, l]) => `<label class="toggle"><input type="checkbox" data-ad-area="${k}" ${(st.areas || []).includes(k) ? "checked" : ""}> ${l}</label>`).join("")}</div></div>
            ${st.backups.length ? st.backups.map((b) => `<div class="ad-person"><b>${esc(b.name)}</b><span class="muted"></span><button class="btn small" data-ad-restore="${esc(b.id)}">${st.restore && st.restore.id === b.id ? "Wirklich zurückspielen?" : "Zurückspielen …"}</button></div>`).join("") : '<span class="muted">Noch keine Sicherung.</span>'}
            ${st.restore ? `<div class="conflict-note"><b>Vorschau:</b> ${esc(st.restore.text)}<br>Nochmals «Wirklich zurückspielen?» klicken, um den Stand der Sicherung zu übernehmen.</div>` : ""}`, '<button class="btn small" data-ad-backup>Jetzt sichern</button>'),
        ].join("");
      }
      o.querySelector(".modal").innerHTML = `<div class="lg-head"><span class="eyebrow">Lager-Tool</span><h2>Admin</h2></div>${st.msg ? `<div class="ok-note">${st.msg}</div>` : ""}${body}${st.err ? `<p class="login-err" role="alert">${esc(st.err)}</p>` : ""}<div class="lg-foot"><span></span><button type="button" class="link" data-ad-close>Schliessen</button></div>`;
      const f = o.querySelector("#ad-pw, #ad-fname"); if (f) f.focus();
    };
    const tun = async (fn, msg) => { st.err = ""; st.msg = ""; try { await fn(); if (msg) st.msg = msg; await load(); } catch (err) { st.err = errMsg(err); draw(); } };
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-ad-close]")) return closeDrawer();
      if (e.target.closest("[data-ad-forgot]")) { st.forgot = true; st.err = ""; st.msg = ""; return draw(); }
      if (e.target.closest("[data-ad-forgot-no]")) { st.forgot = false; return draw(); }
      if (e.target.closest("[data-ad-forgot-go]")) {
        const name = ($("#ad-fname", o) || {}).value || ""; st.busy = true; draw();
        try { const r = await STORE.forgotAdmin(name); st.forgot = false; st.msg = r && r.previewPw ? `Vorschau: Hier wird keine Mail verschickt. Das neue Passwort für «${esc(r.name)}» lautet <b>${esc(r.previewPw)}</b>.` : "Das neue Passwort wurde an lagerleitung@cevi-staefa-hombi.ch geschickt."; }
        catch (err) { st.err = errMsg(err); }
        st.busy = false; return draw();
      }
      const rs = e.target.closest("[data-ad-reset]"); if (rs) { const [lager, person] = rs.dataset.adReset.split("|"); return tun(() => STORE.admin(st.pw, "resetPerson", { lager, person }), "Zurückgesetzt. Die Person meldet sich jetzt wieder mit dem Lagerpasswort an."); }
      const rm = e.target.closest("[data-ad-rm]"); if (rm) { if (st.sureRm !== rm.dataset.adRm) { st.sureRm = rm.dataset.adRm; return draw(); } st.sureRm = null; return tun(() => STORE.admin(st.pw, "removeAdmin", { id: rm.dataset.adRm }), "Admin entfernt."); }
      if (e.target.closest("[data-ad-wsave]")) return tun(() => STORE.admin(st.pw, "setWartung", { text: $("#ad-wtext", o).value, on: $("#ad-won", o).checked }), "Wartungshinweis gespeichert.");
      if (e.target.closest("[data-ad-fclear]")) return tun(() => STORE.admin(st.pw, "clearFehler"), "Fehlerberichte geleert.");
      if (e.target.closest("[data-ad-logoutall]")) { if (!st.sureOut) { st.sureOut = true; return draw(); } st.sureOut = false; return tun(() => STORE.admin(st.pw, "logoutAll"), "Alle wurden abgemeldet, auch du in diesem Browser."); }
      if (e.target.closest("[data-ad-backup]")) return tun(() => STORE.admin(st.pw, "backupNow"), "Sicherung erstellt.");
      const ar = e.target.closest("[data-ad-area]"); if (ar) { st.areas = [...o.querySelectorAll("[data-ad-area]:checked")].map((x) => x.dataset.adArea); st.restore = null; return; }
      const rsb = e.target.closest("[data-ad-restore]"); if (rsb) { const lager = $("#ad-rest-lager", o).value; const bid = rsb.dataset.adRestore; const colls = (st.areas || []).flatMap((k) => BEREICH_COLLS[k] || [k]); const sig = colls.join(",");
        try { if (!st.restore || st.restore.id !== bid || st.restore.lager !== lager || st.restore.sig !== sig) { const r = await STORE.admin(st.pw, "restore", { backup: bid, lager, dryRun: true }); const keys = [...new Set([...Object.keys(r.now || {}), ...Object.keys(r.then || {})])].filter((k) => k !== "log" && k !== "presence" && (!colls.length || colls.includes(k))); st.restore = { id: bid, lager, sig, text: (colls.length ? "Nur ausgewählte Bereiche. " : "Ganzes Lager. ") + (keys.map((k) => `${COLL_LABEL[k] || k}: jetzt ${(r.now || {})[k] || 0}, Sicherung ${(r.then || {})[k] || 0}`).join(" · ") || "keine Daten") }; return draw(); }
          await STORE.admin(st.pw, "restore", { backup: bid, lager, ...(colls.length ? { colls } : {}) }); st.restore = null; st.msg = colls.length ? "Die ausgewählten Bereiche haben jetzt den Stand der Sicherung." : "Zurückgespielt. Das Lager hat jetzt den Stand der Sicherung."; } catch (err) { st.err = errMsg(err); } return draw(); }
    };
    o.onsubmit = async (e) => {
      e.preventDefault(); const f = e.target; st.msg = ""; st.err = "";
      if (f.matches("[data-ad-login]")) { st.pw = $("#ad-pw", o).value; return load(); }
      if (f.matches("[data-ad-lpw]")) { const pw = f.querySelector("input").value; return tun(() => STORE.admin(st.pw, "setLagerPw", { lager: f.dataset.adLpw, pw }), "Lagerpasswort gesetzt."); }
      if (f.matches("[data-ad-add]")) { const [n, pw] = f.querySelectorAll("input"); return tun(() => STORE.admin(st.pw, "addAdmin", { name: n.value, newPw: pw.value }), `«${esc(n.value)}» ist jetzt Admin.`); }
      if (f.matches("[data-ad-newpw]")) { const n1 = $("#ad-n1", o).value, n2 = $("#ad-n2", o).value; if (n1 !== n2) { st.err = "Die beiden Passwörter sind nicht gleich."; return draw(); } return tun(async () => { await STORE.admin(st.pw, "setAdminPw", { newPw: n1 }); st.pw = n1; }, "Dein Admin-Passwort wurde geändert."); }
    };
    draw();
  };

  // ---------- Datenschutz ----------
  function showDatenschutz() {
    const o = modal(`<div class="lg-head"><span class="eyebrow">Lager-Tool</span><h2>Datenschutz</h2></div><div class="rich datenschutz">
      <p><b>Wer?</b> Das Lager-Tool gehört dem Cevi Stäfa-Hombi und wird von der Lagerleitung betreut. Kontakt: <a href="mailto:lagerleitung@cevi-staefa-hombi.ch">lagerleitung@cevi-staefa-hombi.ch</a>.</p>
      <p><b>Wozu?</b> Nur für die Planung und Durchführung unserer Lager.</p>
      <p><b>Welche Daten?</b> Von Leitenden: Ceviname, Vor- und Nachname, Stufe, Rolle, Anwesenheit, Einteilungen, Aufgaben und Protokolle, freiwillig Telefon und E-Mail. Von Teilnehmenden: Vorname, Nachname (meist nur der Anfangsbuchstabe), Stufe, Anwesenheit und Einteilung (Zimmer, Gruppe, Fahrt). <b>Keine Gesundheitsdaten.</b></p>
      <p><b>Wer sieht was?</b> Die Lagerleitung sieht alles. Das Team sieht seinen eigenen Bereich, Organigramm, Schichtplan, Einteilung und Infos, von Teilnehmenden nur die Namen. Private To-dos und Packlisten sieht nur die Person selbst.</p>
      <p><b>Wo gespeichert?</b> In einer Google-Tabelle und im Google Drive der Lagerleitung (Server von Google, auch in den USA). Die Website liegt auf GitHub und enthält keine Personendaten. Für das Wetter wird nur der Lagerort an open-meteo.com geschickt, für die Schrift wird Google Fonts geladen.</p>
      <p><b>Im Browser</b> speichert das Tool deine Anmeldung, deine Einstellungen und einen Zwischenstand für die Arbeit ohne Netz. Es gibt keine Werbung, kein Tracking und keine Cookies zu Werbezwecken.</p>
      <p><b>Wie lange?</b> Daten von Teilnehmenden werden spätestens 6 Monate nach dem Lager gelöscht. Ganze Lager kann der Admin löschen. Automatische Sicherungen werden nach 12 Wochen gelöscht. Anmeldungen laufen nach 60 Tagen ab.</p>
      <p><b>Deine Rechte:</b> Du kannst jederzeit Auskunft verlangen, falsche Angaben berichtigen oder deine Daten löschen lassen. Erinnerungs-Mails kannst du abbestellen. Melde dich dafür bei der Lagerleitung.</p>
      <p class="muted" style="font-size:12.5px">Stand November 2026</p></div>
      <div class="lg-foot"><span></span><button class="btn" data-ds-close>Schliessen</button></div>`, "wide-modal");
    o.onclick = (e) => { if (e.target === o || e.target.closest("[data-ds-close]")) closeDrawer(); };
  }
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("[data-datenschutz]")) { e.preventDefault(); showDatenschutz(); } });
  const renderStartOrig1 = renderStart;
  renderStart = function () { renderStartOrig1(); const s = $("#start-in"); if (s && !s.querySelector(".start-foot")) s.insertAdjacentHTML("beforeend", `<div class="start-foot"><button class="link" data-datenschutz>Datenschutz</button>${STORE.version ? `<span class="muted">Version ${esc(STORE.version)}</span>` : ""}</div>`); wartungsHinweis(); };

  // ---------- Wartungshinweis ----------
  function wartungsHinweis() {
    const w = STORE.wartung(); let el = document.getElementById("wartung-bar");
    if (w && w.on && w.text) { if (!el) { el = document.createElement("div"); el.id = "wartung-bar"; el.className = "wartung-bar"; el.setAttribute("role", "status"); document.body.insertBefore(el, document.body.firstChild); } el.textContent = "ℹ️ " + w.text; }
    else if (el) el.remove();
  }

  // ---------- Seitenleiste: Rolle, Hinweis ----------
  const renderSideOrig1 = renderSide;
  renderSide = function () { renderSideOrig1(); if (isReadOnly() && !state.asTeam) $("#me-role").textContent = "Nur lesen"; wartungsHinweis(); };

  // ---------- Einstellungen: eigenes Passwort, App installieren, Datenschutz ----------
  let installEvent = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvent = e; if (state.view === "prefs") views.prefs.update(); });
  const prefsUpdateOrig = views.prefs.update;
  views.prefs.update = function () {
    prefsUpdateOrig(); const box = $("#prefs-body"); const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const installiert = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    box.insertAdjacentHTML("beforeend", `${isLaLei() && !state.asTeam ? `<section class="card"><div class="card-head"><h2>Mein Passwort ändern</h2></div><form class="card-body stack" style="gap:10px" data-pw-change><input type="password" placeholder="Aktuelles Passwort" autocomplete="current-password" required><input type="password" placeholder="Neues Passwort (mind. 6 Zeichen)" autocomplete="new-password" minlength="6" required><input type="password" placeholder="Neues Passwort nochmals" autocomplete="new-password" minlength="6" required><button class="btn primary" style="align-self:flex-start">Passwort ändern</button></form></section>` : ""}
      ${true ? `<section class="card"><div class="card-head"><h2>Als App installieren</h2></div><div class="card-body stack" style="gap:10px">${installiert ? '<span>✓ Das Lager-Tool läuft bereits als App.</span>' : installEvent ? '<span>Lege das Lager-Tool als App auf den Startbildschirm. Es öffnet sich dann ohne Browserleiste und startet auch ohne Netz.</span><button class="btn primary" data-install style="align-self:flex-start">Als App installieren</button>' : (ios ? "<span>iPhone und iPad: in Safari unten auf <b>Teilen</b> tippen, dann <b>«Zum Home-Bildschirm»</b>.</span>" : "<span>Im Browser-Menü <b>⋮</b> → <b>«App installieren»</b> bzw. <b>«Zum Startbildschirm hinzufügen»</b>.</span>") + '<button class="btn" data-app-inst style="align-self:flex-start">Schritt für Schritt zeigen</button>'}</div></section>` : ""}
      <section class="card"><div class="card-head"><h2>Datenschutz</h2></div><div class="card-body stack" style="gap:10px"><span class="muted" style="font-size:13.5px">Welche Daten das Tool speichert, wer sie sieht und wie lange.</span><button class="btn" data-datenschutz style="align-self:flex-start">Datenschutzhinweis lesen</button>${STORE.version ? `<span class="muted" style="font-size:12px">Version ${esc(STORE.version)}</span>` : ""}</div></section>`);
  };
  view.addEventListener("submit", async (e) => {
    const f = e.target; if (!f.matches("[data-pw-change]")) return; e.preventDefault();
    const [a, b, c] = f.querySelectorAll("input"); if (b.value !== c.value) return toast("Die beiden neuen Passwörter sind nicht gleich.");
    try { await STORE.changePw(a.value, b.value); f.reset(); toast("Passwort geändert"); } catch (err) { toast(errMsg(err)); }
  });
  view.addEventListener("click", async (e) => { if (e.target.closest("[data-install]") && installEvent) { installEvent.prompt(); try { await installEvent.userChoice; } catch {} installEvent = null; views.prefs.update(); } });

  // ---------- Teilnehmenden-Daten löschen (nach dem Lager) ----------
  const lagerVorbei = (tage = 0) => { const e = (cfg().dates || {}).end; return !!e && addDays(e, tage) < iso(today()); };
  function kidsLoeschen() {
    const n = state.kids.length; if (!n) return toast("Es sind keine Teilnehmenden-Daten gespeichert.");
    const o = modal(`<div class="lg-head"><span class="eyebrow">Datenschutz</span><h2>Teilnehmenden-Daten löschen?</h2></div>
      <p style="margin:0">Gelöscht werden <b>${n} Teilnehmende</b> mit ihrer Anwesenheit und ihrer Einteilung in Zimmer, Gruppen, Fahrten und der Abzählliste. Leitende, Aufgaben, Protokolle und alles andere bleiben.</p>
      <p class="conflict-note" style="margin:0">Das kann nicht rückgängig gemacht werden. Lade vorher die Sicherung (Excel) herunter, falls ihr die Liste noch braucht.</p>
      <div class="lg-foot"><button class="link" data-kd-no>Abbrechen</button><button class="btn red" data-kd-yes>Endgültig löschen</button></div>`);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-kd-no]")) return closeDrawer(); if (!e.target.closest("[data-kd-yes]")) return;
      const ops = [];
      for (const k of state.kids) { ops.push({ op: "delete", coll: "kids", id: k._id }); if (state.att.has("k_" + k._id)) ops.push({ op: "delete", coll: "att", id: "k_" + k._id }); }
      const ohneKids = (list) => (list || []).filter((m) => m.t !== "k");
      for (const r of state.rooms) if ((r.members || []).some((m) => m.t === "k")) ops.push({ op: "update", coll: "rooms", id: r._id, data: { members: ohneKids(r.members) } });
      for (const g of state.groups) if ((g.members || []).some((m) => m.t === "k")) ops.push({ op: "update", coll: "groups", id: g._id, data: { members: ohneKids(g.members) } });
      for (const t of state.trips) if ((t.members || []).some((m) => m.t === "k")) ops.push({ op: "update", coll: "trips", id: t._id, data: { members: ohneKids(t.members) } });
      if (STORE.peek("count", "main")) ops.push({ op: "set", coll: "count", id: "main", data: { checked: {}, resetAt: nowStamp(), resetBy: me() } });
      ops.push({ op: "update", coll: "config", id: "main", data: { kidsDeletedAt: nowStamp(), kidsDeletedBy: me() } });
      try { await state.db.batch(ops); closeDrawer(); toast(`${n} Teilnehmende gelöscht`); } catch (err) { handleWriteError(err); }
    };
  }
  const setUpdateOrig1 = views.settings.update;
  views.settings.update = function () {
    setUpdateOrig1(); const c = cfg();
    $("#set-close").insertAdjacentHTML("beforeend", `<div class="kids-del"><h3>Teilnehmenden-Daten löschen</h3><p class="hint" style="margin:0 0 8px">Nach dem Lager braucht es die Namen der Teilnehmenden nicht mehr. Spätestens 6 Monate nach dem Lager bitte löschen (Datenschutz).${c.kidsDeletedAt ? ` Zuletzt gelöscht am ${esc(fmtFull(c.kidsDeletedAt.slice(0, 10)))}.` : ""}</p><button class="btn ${lagerVorbei(180) && state.kids.length ? "red" : ""}" data-kids-del ${state.kids.length ? "" : "disabled"}>Teilnehmenden-Daten löschen (${state.kids.length})</button></div>`);
  };
  view.addEventListener("click", (e) => { if (e.target.closest("[data-kids-del]")) kidsLoeschen(); });
  const checkItemsOrig = checkItems;
  checkItems = function () {
    const out = checkItemsOrig();
    if (lagerVorbei()) out.push([!state.kids.length || !lagerVorbei(180), "Datenschutz: Teilnehmenden-Daten", state.kids.length ? (lagerVorbei(180) ? `${state.kids.length} Teilnehmende seit über 6 Monaten gespeichert, bitte löschen` : `${state.kids.length} gespeichert, spätestens 6 Monate nach dem Lager löschen`) : "gelöscht", "settings|lager"]);
    return out;
  };
  const ovUpdateOrig1 = views.overview.update;
  views.overview.update = function () {
    ovUpdateOrig1();
    if (isLaLei() && lagerVorbei(180) && state.kids.length) $("#ov-setup").insertAdjacentHTML("afterbegin", `<div class="conflict-note ds-hint">🔒 Das Lager ist seit über 6 Monaten vorbei. Bitte die Daten der Teilnehmenden löschen. <button class="link" data-go-tab="settings|lager">Zum Löschen</button></div>`);
  };

  // ---------- «Was ist neu» ----------
  const NEUES = [
    { id: "2026-11-github", titel: "Neu im Lager-Tool", punkte: [
      "Das Lager-Tool läuft jetzt auf einer eigenen Website und lässt sich <b>als App</b> auf den Startbildschirm legen (Einstellungen).",
      "<b>Auch ohne Netz:</b> Was du ohne Internet änderst, wird gespeichert und automatisch nachgeschickt.",
      "Beim Anmelden kannst du wählen, ob du <b>angemeldet bleiben</b> willst. Auf fremden Geräten das Häkchen weglassen.",
      "Die Lagerleitung kann ihr <b>Passwort selbst ändern</b> (Einstellungen).",
      "Neu gibt es die Rolle <b>«Nur lesen»</b>, z.B. für Coach oder Abteilungsleitung.",
      "Ein <b>Datenschutzhinweis</b> erklärt, was gespeichert wird (Einstellungen und Startseite).",
    ] },
  ];
  function wasIstNeu() {
    if (!STORE.isGas || $(".overlay")) return; const gesehen = store.get("lager-neu-gesehen") || "";
    const n = NEUES.find((x) => x.id > gesehen); if (!n) return; store.set("lager-neu-gesehen", NEUES[0].id);
    if (!gesehen && role() === "team" && store.get(`lalei-tour-${state.lagerId}-${myId()}`) === null) return; // neues Team-Mitglied bekommt die Tour
    const o = modal(`<div class="lg-head"><span class="eyebrow">Was ist neu</span><h2>${esc(n.titel)}</h2></div><ul class="neu-list">${n.punkte.map((p) => `<li>${p}</li>`).join("")}</ul><div class="lg-foot"><span></span><button class="btn primary" data-neu-ok>Alles klar</button></div>`);
    o.onclick = (e) => { if (e.target === o || e.target.closest("[data-neu-ok]")) closeDrawer(); };
  }
  const openLagerOrig1 = openLager;
  openLager = async function (id) { const r = await openLagerOrig1(id); if (state.lagerId === id) setTimeout(wasIstNeu, 600); return r; };

  // ---------- Fehler melden, abgelehnte Änderungen von unterwegs ----------
  window.addEventListener("error", (e) => STORE.report((e.message || "Fehler") + (e.lineno ? " (Zeile " + e.lineno + ")" : ""), state.view));
  window.addEventListener("unhandledrejection", (e) => { const m = String((e.reason && (e.reason.stack || e.reason.message)) || e.reason || ""); if (!/NETZ|NICHT_ANGEMELDET/.test(m)) STORE.report("Promise: " + m, state.view); });
  STORE.onRejected((e) => toast("Eine Änderung von unterwegs wurde nicht gespeichert: " + errMsg(e)));

  // ---------- App (Service Worker) ----------
  if (STORE.isApi && !STORE.isTest && "serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
