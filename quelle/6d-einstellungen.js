  // =====================================================================
  // Ausbau 4: Packliste der Lagerleitung, Einstellungen (Anzeige, Team-Ansicht)
  // =====================================================================
  TEAM_VIEWS.push("prefs");
  Object.assign(HELP, {
    pack: "Hier erstellst du die Packliste fürs Team. Jede Person bekommt eine eigene Kopie, kann abhaken, Punkte entfernen und eigene ergänzen. Punkte mit «nur LaLei» sieht nur die Lagerleitung, z.B. Lagerapotheke oder Notfallblätter. Unter «Meine Packliste» hakst du deine eigene ab.",
    prefs: "Darstellung auf diesem Gerät (hell oder dunkel, Schriftgrösse). Die Lagerleitung kann hier ausserdem das Tool so ansehen, wie es das Team sieht.",
  });

  // ---------- Packliste (Lagerleitung) ----------
  TABS.pack = [["tpl", "Vorlage fürs Team"], ["mine", "Meine Packliste"]];
  function packTplHtml() {
    const tpl = packTemplate(); const secs = sectionsOf(tpl);
    const rows = secs.map((s) => `<div class="pack-sec"><h3>${esc(s)}</h3><div class="list-edit">${tpl.map((x, i) => [x, i]).filter(([x]) => (x.section || "Diverses") === s).map(([x, i]) => `<div class="r pt-row"><input data-pt="${i}|t" value="${esc(x.t)}" aria-label="Punkt"><input data-pt="${i}|section" value="${esc(x.section || "")}" aria-label="Abschnitt" list="pt-secs" class="pt-sec"><label class="toggle pt-only" title="Nur die Lagerleitung sieht diesen Punkt"><input type="checkbox" data-pt="${i}|lalei" ${x.lalei ? "checked" : ""}> nur LaLei</label><button class="btn small ghost" data-pt-rm="${i}" aria-label="Entfernen">✕</button></div>`).join("")}</div></div>`).join("");
    return `<div class="card-body stack" style="gap:16px">${tpl.length ? rows : '<div class="empty" style="padding:8px 0">Noch keine Packliste. Lege Punkte an oder starte mit dem Beispiel.</div>'}
      <datalist id="pt-secs">${secs.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
      <form class="todo-add" data-pt-add><input placeholder="Neuer Punkt, z.B. Stirnlampe" aria-label="Punkt"><input placeholder="Abschnitt" list="pt-secs" aria-label="Abschnitt" value="${esc(secs.slice(-1)[0] || "Diverses")}"><button class="btn small primary">+ Hinzufügen</button></form>
      ${!tpl.length ? '<button class="btn" data-pt-example style="align-self:flex-start">Beispiel-Packliste einfügen</button>' : ""}
      <p class="hint" style="margin:0">Was du hier später ergänzt, erscheint bei allen. Was jemand bei sich entfernt oder abhakt, sieht nur diese Person.</p></div>`;
  }
  views.pack = {
    shell: () => `${pageHead("Packliste", "Für das Team und für dich selbst")}${tabBar("pack")}
      <section class="card" ${pane("pack", "tpl")}><div class="card-head"><h2>Vorlage fürs Team</h2><span class="muted">${packTemplate().length} Punkte</span></div><div id="pack-tpl"></div></section>
      <section class="card" ${pane("pack", "mine")}><div class="card-head"><h2>Meine Packliste</h2><span class="muted">Nur du siehst deine Häkchen</span></div><div id="pack-box"></div></section>`,
    update() {
      fillTabs("pack"); const box = $("#pack-tpl"); const fa = document.activeElement;
      if (!(box.contains(fa) && fa.tagName === "INPUT" && fa.type !== "checkbox" && fa.value)) { box.innerHTML = packTplHtml(); if (box.contains(fa) && fa.closest && fa.closest("[data-pt-add]")) { const n = $("[data-pt-add] input", box); if (n) n.focus(); } }
      renderPack();
    },
  };

  // ---------- Einstellungen (Gerät, Team-Ansicht) ----------
  views.prefs = {
    shell: () => `${pageHead("Einstellungen", "Für dieses Gerät und für dich")}<div class="grid-2" id="prefs-body"></div>`,
    update() {
      const th = store.get("lalei-theme") || "", z = store.get("lalei-zoom") || "1";
      const seg = (key, opts, cur) => `<div class="seg" role="radiogroup">${opts.map(([v, l]) => `<button type="button" data-disp="${key}|${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join("")}</div>`;
      $("#prefs-body").innerHTML = `<section class="card"><div class="card-head"><h2>Anzeige</h2><span class="muted">gilt nur auf diesem Gerät</span></div><div class="card-body stack" style="gap:16px">
          <div class="field"><span>Farben</span>${seg("theme", [["", "Automatisch"], ["light", "Hell"], ["dark", "Dunkel"]], th)}</div>
          <div class="field"><span>Schriftgrösse</span>${seg("zoom", [["0.9", "Klein"], ["1", "Normal"], ["1.15", "Gross"], ["1.3", "Sehr gross"]], z)}</div></div></section>
        <section class="card"><div class="card-head"><h2>Anmeldung</h2></div><div class="card-body stack" style="gap:12px">
          <div>Angemeldet als <b>${esc(me())}</b> · ${state.asTeam ? "Lagerleitung (gerade in der Team-Ansicht)" : isLaLei() ? "Lagerleitung" : "Team"}</div>
          ${state.asTeam ? `<div class="asteam-banner"><span>Du siehst das Tool gerade so wie das Team.</span><button class="btn primary" data-asteam-off>Zurück zur Lagerleitung</button></div>`
            : isLaLei() ? `<div class="field"><span>Als Team ansehen</span><span class="muted" style="font-size:13.5px">Zeigt das Tool genau so, wie es ein Leitender aus dem Team sieht. Ändern kannst du dabei nichts. Zurück geht es jederzeit über den gelben Knopf.</span><button class="btn" data-asteam-on style="align-self:flex-start">Als Team ansehen</button></div>` : ""}
          <button class="btn" data-logout-here style="align-self:flex-start">Abmelden</button></div></section>`;
    },
  };
  view.addEventListener("click", (e) => {
    const b = e.target.closest("[data-disp]");
    if (b && state.view === "prefs") { const [k, v] = b.dataset.disp.split("|"); store.set(k === "theme" ? "lalei-theme" : "lalei-zoom", v); applyDisplay(); views.prefs.update(); return; }
    if (e.target.closest("[data-logout-here]")) { $("#logout").click(); }
  });
