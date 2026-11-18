  // =====================================================================
  // Übungslager mit erfundenen Daten, nur für eine Person sichtbar.
  // Im Admin-Bereich «Übungslager»: Inhalt «Erfundene Beispieldaten» (Personen, Aufgaben, Höcks, Protokolle,
  // Teilnehmende, Zimmer, Einkaufsliste, Adressbuch – alles fiktiv). Aufbau (Ressorts, Meilensteine, Daten,
  // Aufgabentitel) kommt aus einem echten Lager, aber ohne Namen, Notizen und Verläufe.
  // Sichtbar ist es in der Lagerliste nur auf Geräten, auf denen die gewählte Person angemeldet ist.
  // =====================================================================
  const UEB4_ID = "uebung";
  function uebGeraeteNamen() {
    const namen = new Set();
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k || !k.startsWith("lalei-sitzung-")) continue; const s = JSON.parse(localStorage.getItem(k) || "null"); if (s && s.name) namen.add(String(s.name)); } } catch {}
    return namen;
  }
  // Lagerliste: «nur für …» erscheint nur auf Geräten dieser Person
  const renderStartOrigUeb = renderStart;
  renderStart = function () {
    renderStartOrigUeb(); const s = $("#start-in"); if (!s || $("#start").hidden) return;
    const namen = uebGeraeteNamen();
    for (const l of STORE.lagerList()) { if (!l.nurFuer || namen.has(l.nurFuer)) continue; s.querySelectorAll(`[data-open-lager="${CSS.escape(l._id)}"]`).forEach((c) => c.remove()); }
  };

  // ---------- Admin: Auswahl «Erfundene Beispieldaten» ----------
  const uebPaintOrigV = uebPaint;
  uebPaint = function () {
    uebPaintOrigV(); const box = $("#ad-uebung"); if (!box || $("#ub-art", box)) return;
    const namen = [...uebGeraeteNamen()]; const knopf = $("[data-ub-go]", box);
    knopf.insertAdjacentHTML("beforebegin", `<div class="form-grid"><label class="field"><span>Inhalt</span><select id="ub-art" class="input"><option value="fiktiv">Erfundene Beispieldaten (empfohlen)</option><option value="kopie">Kopie des gewählten Lagers</option></select></label>
      <label class="field"><span>Nur sichtbar für (dein Ceviname)</span><input id="ub-ich" class="input" autocomplete="off" value="${esc(namen[0] || "")}" placeholder="z.B. Knigge"></label></div>`);
    const src = $("#ub-src", box); if (src && src.closest(".field")) src.closest(".field").querySelector("span").textContent = "Aufbau von";
  };
  document.addEventListener("click", async (e) => {
    const b = e.target.closest && e.target.closest("#ad-uebung [data-ub-go]"); if (!b) return;
    const box = $("#ad-uebung"); if (!box || ($("#ub-art", box) || {}).value !== "fiktiv") return; // Kopie: bisheriger Ablauf
    e.stopImmediatePropagation(); e.preventDefault();
    const pw = $("#ub-pw", box).value, ich = $("#ub-ich", box).value.trim(), src = ($("#ub-src", box) || {}).value || "", msg = $("#ub-msg", box);
    if (!ich) { $("#ub-ich", box).focus(); return toast("Bitte deinen Cevinamen eintragen. Nur du siehst dann das Übungslager."); }
    if (pw.length < 6) { $("#ub-pw", box).focus(); return toast("Das Lagerpasswort braucht mindestens 6 Zeichen."); }
    if (STORE.lagerList().some((l) => l._id === UEB4_ID) && !confirm("Das bisherige Übungslager wird gelöscht und neu erstellt. Weiter?")) return;
    b.disabled = true; msg.textContent = "Wird erstellt …";
    try {
      const L = STORE.lagerList().find((l) => l._id === src) || {}; const data = src ? (await STORE.readLager(adPw, src)) || {} : {};
      const ops = uebFiktiveDaten(L, data, ich);
      if (STORE.lagerList().some((l) => l._id === UEB4_ID)) await STORE.admin(adPw, "deleteLager", { lager: UEB4_ID });
      for (let i = 0; i < ops.length; i += 300) await STORE.writeRaw(adPw, ops.slice(i, i + 300));
      await STORE.admin(adPw, "setLagerPw", { lager: UEB4_ID, pw });
      msg.innerHTML = `Fertig: Übungslager mit erfundenen Daten (${ops.length - 1} Einträge). Sichtbar nur auf Geräten, auf denen <b>${esc(ich)}</b> angemeldet ist. Anmelden als ${esc(ich)} mit dem eben gesetzten Lagerpasswort.`;
    } catch (err) { msg.textContent = errMsg(err); }
    b.disabled = false;
  }, true);

  // ---------- Erfundene Daten ----------
  function uebFiktiveDaten(L, data, ich) {
    let s = 7; const z = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; const pick = (a) => a[Math.floor(z() * a.length)];
    const t0 = iso(today()); const jetzt = nowStamp(); const P = (coll, id, d) => ({ op: "set", coll: `${UEB4_ID}:${coll}`, id, data: d });
    const lalei = [ich, "Fuchs", "Biber", "Luchs"], team = ["Specht", "Eule", "Dachs", "Wiesel", "Igel", "Amsel", "Falke", "Marder"];
    const vornamen = ["Lea", "Noah", "Mia", "Elias", "Lina", "Jonas", "Emma", "Luca", "Nora", "Levin", "Sara", "Tim"];
    const ops = [];
    const c0 = ((data.config || {}).main) || {}; const dates = { ...(c0.dates || {}) };
    if (!dates.prep && !dates.start) { dates.prep = addDays(t0, 60); dates.start = addDays(t0, 61); dates.end = addDays(t0, 64); }
    ops.push({ op: "set", coll: "lager", id: UEB4_ID, data: { title: "Übungslager", abteilung: L.abteilung || "", prep: L.prep || dates.prep || "", start: L.start || dates.start || "", end: L.end || dates.end || "", uebung: true, fiktiv: true, nurFuer: ich, createdAt: jetzt, ...(L.logo ? { logo: L.logo } : {}) } });
    // Personen
    const pid = {}; [...lalei, ...team].forEach((n, i) => { const id = "f" + (i + 1); pid[n] = id; ops.push(P("people", id, { ceviname: n, vorname: n === ich ? "" : vornamen[i % vornamen.length], nachname: n === ich ? "" : "Beispiel", stufe: "", funktion: i < lalei.length ? "LaLei" : "", email: "", order: i + 1 })); });
    const alle = [...lalei, ...team];
    // Lager einrichten: Aufbau übernehmen, Personen erfinden, Notizen weg
    const ress = JSON.parse(JSON.stringify(c0.ressorts || {}));
    for (const r of Object.values(ress)) { r.lead = pick(alle); r.stv = z() < 0.6 ? pick(alle) : ""; r.notizen = []; r.notes = ""; r.links = []; for (const sub of Object.values(r.subs || {})) { sub.lead = z() < 0.7 ? pick(team) : ""; sub.stv = ""; sub.notes = ""; } }
    const days = Array.isArray(c0.days) && c0.days.length ? c0.days : [];
    // nur reine Aufbau-Angaben übernehmen (keine Namen, Telefonnummern, Mail-Einstellungen)
    const aufbau = {}; for (const k of ["milestones", "dayparts", "pausen", "farbe", "ort"]) if (c0[k] !== undefined) aufbau[k] = JSON.parse(JSON.stringify(c0[k]));
    ops.push(P("config", "main", { ...aufbau, ressorts: ress, dates, days, mail: { enabled: false }, checkEigene: [], shopVerlauf: [],
      notfall: [{ fn: "Hauptleitung", name: ich, tel: "079 000 00 01 (fiktiv)" }, { fn: "Sanität", name: team[1], tel: "079 000 00 02 (fiktiv)" }] }));
    // Aufgaben: Titel und Termine aus dem Aufbau, Verantwortliche und Stand erfunden
    const src = Object.entries(data.tasks || {});
    const titel = src.length ? src : ["Lagerhaus reservieren", "Budget erstellen", "Anmeldung verschicken", "Menüplan erstellen", "Programm planen", "Material kontrollieren", "Car bestellen", "Sanitätsapotheke prüfen", "Elternbrief schreiben", "Einkaufsliste Küche", "Nachtwachen einteilen", "Lagerabschluss planen"].map((t, i) => ["fa" + i, { title: t, deadline: addDays(t0, i * 7 - 14), ressort: "Hauptleitung", order: i }]);
    for (const [id, t] of titel) {
      const vorbei = t.deadline && t.deadline < t0; const r = z();
      const status = vorbei ? (r < 0.6 ? "Erledigt" : r < 0.85 ? "Läuft" : "Offen") : (r < 0.1 ? "Erledigt" : r < 0.25 ? "Läuft" : "Offen");
      const ck = Array.isArray(t.checklist) ? t.checklist.map((c) => ({ ...c, done: status === "Erledigt" || z() < 0.3 })) : undefined;
      ops.push(P("tasks", id, { title: t.title || "Aufgabe", deadline: t.deadline || "", ressort: t.ressort || "", teil: t.teil || "", order: t.order || 0, ongoing: !!t.ongoing, ...(t.repeat ? { repeat: t.repeat } : {}), ...(ck ? { checklist: ck } : {}), status, owner: z() < 0.85 ? pick(alle) : "", support: z() < 0.2 ? pick(team) : "", note: "", star: z() < 0.06, updatedAt: jetzt, updatedBy: pick(lalei) }));
    }
    // Höcks
    const h1 = addDays(t0, -14), h2 = addDays(t0, 10), h3 = addDays(t0, 24);
    ops.push(P("hoecks", "fh1", { date: h1, kind: "LaLei", title: "1. LaLei-Höck", place: "Cevi-Raum", time: "19:30", note: "Ressorts verteilen, Daten festlegen", createdAt: jetzt }));
    ops.push(P("hoecks", "fh2", { date: h2, kind: "LaLei", title: "2. LaLei-Höck", place: "bei Fuchs", time: "19:30", note: "Budget, Lagerhaus, Programmidee", createdAt: jetzt }));
    ops.push(P("hoecks", "fh3", { date: h3, kind: "Team", title: "Team-Höck", place: "Cevi-Raum", time: "19:00", note: "Programmblöcke verteilen", createdAt: jetzt }));
    // Protokolle, Notizen, Kontakte, Traktanden
    const meta = (by, d) => ({ createdAt: jetzt, updatedAt: jetzt, updatedBy: by, date: d });
    ops.push(P("journal", "fj1", { ...meta(lalei[1], h1), type: "meeting", kind: "LaLei", title: "1. LaLei-Höck", present: lalei.slice(), guests: "", author: lalei[1], next: h2,
      items: [{ id: "i1", title: "Ressortverteilung", notes: `@${lalei[1]} übernimmt Programm\n@${lalei[2]} übernimmt Admin`, decision: "Ressorts verteilt", links: [] }, { id: "i2", title: "Lagerhaus", notes: "Zwei Häuser angefragt, Antwort ausstehend", decision: "", links: [] }, { id: "i3", title: "Sitzungsrhythmus", notes: "", decision: "Alle zwei Wochen am Dienstag", links: [] }] }));
    ops.push(P("journal", "fj2", { ...meta(lalei[2], addDays(t0, -3)), type: "meeting", kind: "Team", title: "Team-Höck", present: [lalei[0], lalei[2], team[0], team[1], team[2]], guests: "", author: lalei[2], next: h3,
      items: [{ id: "i1", title: "Lagerthema", notes: "Drei Ideen gesammelt: Piraten, Zeitreise, Zirkus", decision: "Zeitreise", links: [] }, { id: "i2", title: "Material", notes: `@${team[1]} macht eine Liste`, decision: "", links: [] }] }));
    ops.push(P("journal", "fj3", { ...meta(lalei[3], addDays(t0, -8)), type: "note", title: "Lagerhaus gebucht", text: "Pfadiheim Musterwil ist für das Lager reserviert. Schlüssel gibt es am Anreisetag.", links: [], author: lalei[3] }));
    ops.push(P("journal", "fj4", { ...meta(lalei[0], addDays(t0, -5)), type: "contact", by: lalei[0], channel: "Telefon", contactName: "Sandra Beispiel", role: "Mutter von Mia", status: "Erledigt", topic: "Später anreisen", text: "Mia kommt einen Tag später wegen eines Familienfests.", decision: "Anreise am zweiten Tag mit den Eltern" }));
    ops.push(P("journal", "fj5", { ...meta(lalei[3], addDays(t0, -2)), type: "contact", by: lalei[3], channel: "E-Mail", contactName: "Hauswart Muster", role: "Lagerhaus / Hausbesitzer:in", status: "Nachfassen", topic: "Schlüsselübergabe", text: "Uhrzeit für die Schlüsselübergabe noch offen.", decision: "" }));
    ops.push(P("journal", "fj6", { ...meta(team[0], t0), type: "idea", title: "Elternabend vor dem Lager?", text: "Kurzer Infoabend für Eltern der neuen Kinder.", by: team[0], forDate: h2, status: "Offen" }));
    // Pinnwand
    ops.push(P("board", "fb1", { title: "Anmeldeschluss in zwei Wochen", text: "Bitte in euren Gruppen nochmals erinnern.", important: true, pinned: true, from: "", until: "", files: [], by: lalei[1], createdAt: jetzt, updatedAt: jetzt, updatedBy: lalei[1] }));
    ops.push(P("board", "fb2", { title: "Neue Werkzeugkiste", text: "Steht im Materialraum, Inhalt ist angeschrieben.", important: false, pinned: false, from: "", until: "", files: [], by: team[1], createdAt: jetzt, updatedAt: jetzt, updatedBy: team[1] }));
    // Infos (ohne Blaulicht-Nummern)
    ops.push(P("info", "main", { sections: [
      { id: "s1", title: "Notfall", emergency: true, text: "Lagerleitung: 079 000 00 01 (fiktiv)\nNächstes Spital: Spital Musterwil (fiktiv)\nTreffpunkt: Platz vor dem Haus", links: [] },
      { id: "s2", title: "Lagerhaus", emergency: false, text: "Pfadiheim Musterwil (fiktiv)\nSchlüssel: Hauswart Muster\nHausordnung hängt im Eingang", links: [] },
      { id: "s3", title: "Wichtige Links", emergency: false, text: "", links: [{ title: "eCamp", url: "https://ecamp3.ch" }] }] }));
    // Teilnehmende und Zimmer
    const tnV = ["Mia", "Ben", "Lina", "Finn", "Elin", "Leo", "Ronja", "Nils", "Ella", "Mats", "Zoe", "Jan", "Alva", "Theo", "Ida", "Paul"], tnN = ["Beispiel", "Muster", "Probst", "Test", "Fiktiv", "Erfunden"];
    tnV.forEach((v, i) => ops.push(P("kids", "fk" + (i + 1), { vorname: v, nachname: tnN[i % tnN.length], stufe: i < 8 ? "Jungschar 1" : "Jungschar 2", createdAt: jetzt })));
    ops.push(P("rooms", "fr1", { name: "Zimmer Bergsicht", kind: "Zimmer", capacity: "8", note: "", members: [1, 3, 5, 7, 9, 11, 13, 15].map((n) => ({ t: "k", id: "fk" + n })), order: 1 }));
    ops.push(P("rooms", "fr2", { name: "Zimmer Seeblick", kind: "Zimmer", capacity: "8", note: "", members: [2, 4, 6, 8, 10, 12].map((n) => ({ t: "k", id: "fk" + n })), order: 2 }));
    ops.push(P("rooms", "fr3", { name: "Leitungszimmer", kind: "Zimmer", capacity: "6", note: "", members: team.slice(0, 4).map((n) => ({ t: "p", id: pid[n] })), order: 3 }));
    // Schichtplan
    const plan0 = ((data.plan || {}).main) || {}; const services = plan0.services && plan0.services.length ? plan0.services : [{ id: "s1", name: "Tageschef", min: 2 }, { id: "s2", name: "Küchenhilfe" }, { id: "s3", name: "Nachtwache" }];
    const cells = {}; for (const d of days) for (const sv of services) cells[d.id + "|" + sv.id] = [pick(team), ...(sv.min > 1 ? [pick(lalei)] : [])];
    ops.push(P("plan", "main", { services, cells }));
    // Einkaufsliste und Adressbuch
    ops.push(P("shop", "main", { items: [["Milch", "6 l"], ["Äpfel", "3 kg"], ["Teigwaren", "4 kg"], ["Abwaschmittel", "2"], ["Zündhölzer", "1 Pack"]].map(([t, q], i) => ({ id: "fs" + i, t, qty: q, done: i === 4, by: pick(lalei) })), updatedAt: jetzt }));
    [["Pfadiheim Musterwil", "Hauswart Muster", "Lagerhaus", "079 000 00 11"], ["Bäckerei Beispiel", "Brot-Lieferung", "Lieferant", "044 000 00 22"], ["Carunternehmen Muster", "Hin- und Rückfahrt", "Transport", "044 000 00 33"]].forEach(([name, funktion, gruppe, tel], i) =>
      ops.push(P("kontakte", "fc" + (i + 1), { name, funktion, gruppe, tel: tel + " (fiktiv)", mail: "", notiz: "", behalten: false, createdAt: jetzt, updatedAt: jetzt, updatedBy: lalei[0] })));
    // undefined-Felder entfernen
    return ops.map((o) => (o.data ? { ...o, data: JSON.parse(JSON.stringify(o.data)) } : o));
  }
