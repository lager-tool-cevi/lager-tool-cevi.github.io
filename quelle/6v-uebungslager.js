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
    const stufen = ["Jungschar", "Fröschli", "Ten-Sing", "Jungschar"];
    const pid = {}; [...lalei, ...team].forEach((n, i) => { const id = "f" + (i + 1); pid[n] = id; ops.push(P("people", id, { ceviname: n, vorname: n === ich ? "" : vornamen[i % vornamen.length], nachname: n === ich ? "" : "Beispiel", stufe: n === ich ? "" : stufen[i % stufen.length], funktion: i < lalei.length ? "LaLei" : "", email: n === ich ? "" : n.toLowerCase() + "@beispiel.invalid", order: i + 1 })); });
    const alle = [...lalei, ...team];
    // Lager einrichten: Aufbau übernehmen, Personen, Notizen und Dokumente erfinden
    const ress = JSON.parse(JSON.stringify(c0.ressorts || {}));
    const rNotiz = ["Offerten bis Ende Monat einholen", "Mit dem Lagerhaus wegen Küche telefoniert", "Liste im geteilten Ordner aktualisiert", "Am nächsten Höck kurz informieren", "Material vom letzten Jahr ist im Keller"];
    for (const r of Object.values(ress)) {
      r.lead = pick(alle); r.stv = z() < 0.7 ? pick(alle) : ""; r.notes = "";
      r.notizen = [0, 1].map((k) => ({ id: "rn" + Math.floor(z() * 1e6), t: pick(rNotiz), by: pick(lalei), at: addDays(t0, -(k * 5 + 2)) + "T18:00:00.000Z" }));
      r.links = [{ title: `Ordner ${r.name || "Ressort"} (Beispiel)`, url: "https://example.com/ordner" }];
      for (const sub of Object.values(r.subs || {})) { sub.lead = pick(team); sub.stv = z() < 0.5 ? pick(team) : ""; sub.notes = ""; }
    }
    let days = Array.isArray(c0.days) && c0.days.length ? JSON.parse(JSON.stringify(c0.days)) : [];
    if (!days.length) days = defaultDays(dates.prep, dates.start, dates.end);
    // nur reine Aufbau-Angaben übernehmen (keine Namen, Telefonnummern, Mail-Einstellungen)
    const aufbau = {}; for (const k of ["milestones", "dayparts", "pausen", "farbe", "ort"]) if (c0[k] !== undefined) aufbau[k] = JSON.parse(JSON.stringify(c0[k]));
    const parts = Array.isArray(aufbau.dayparts) && aufbau.dayparts.length ? aufbau.dayparts : ["Morgen", "Nachmittag", "Abend"];
    ops.push(P("config", "main", { ...aufbau, ressorts: ress, dates, days, mail: { enabled: false }, shopVerlauf: ["Milch", "Brot", "Äpfel", "Teigwaren", "Reis", "Tee"],
      checkEigene: [{ id: "ce1", t: "Lagerhaus-Schlüssel abholen", done: false }, { id: "ce2", t: "Elternbrief verschickt", done: true, by: lalei[1], at: jetzt }],
      packlist: PACK_EXAMPLE.flatMap(([sec, list]) => list.map((t, i) => ({ id: "pk" + sec.slice(0, 3) + i, section: sec, t }))),
      attDeadline: addDays(dates.prep || dates.start || t0, -21),
      notfall: [{ fn: "Hauptleitung", name: ich, tel: "079 000 00 01 (fiktiv)" }, { fn: "Sanität", name: team[1], tel: "079 000 00 02 (fiktiv)" }, { fn: "Küche", name: team[3], tel: "079 000 00 03 (fiktiv)" }] }));
    // Aufgaben: Titel und Termine aus dem Aufbau, Verantwortliche und Stand erfunden
    const src = Object.entries(data.tasks || {});
    const titel = src.length ? src : ["Lagerhaus reservieren", "Budget erstellen", "Anmeldung verschicken", "Menüplan erstellen", "Programm planen", "Material kontrollieren", "Car bestellen", "Sanitätsapotheke prüfen", "Elternbrief schreiben", "Einkaufsliste Küche", "Nachtwachen einteilen", "Lagerabschluss planen"].map((t, i) => ["fa" + i, { title: t, deadline: addDays(t0, i * 7 - 14), ressort: "Hauptleitung", order: i }]);
    const tNotiz = ["Offerte angefragt, Antwort ausstehend.", "Erster Entwurf liegt im Ordner.", `@${lalei[1]} schaut nochmals drüber.`, "Mit dem Vorjahr vergleichen.", "Braucht noch eine Rückmeldung vom Lagerhaus."];
    const tLog = ["Status: Offen → Läuft", "Verantwortlich geändert", "Deadline verschoben", "Notiz ergänzt"];
    const uebMeine = {};
    const tCheck = [["Angebote vergleichen", "Entscheid am Höck", "Bestätigung ablegen"], ["Entwurf schreiben", "Gegenlesen lassen", "Verschicken"], ["Liste erstellen", "Bestellen"]];
    for (const [id, t] of titel) {
      const vorbei = t.deadline && t.deadline < t0; const r = z();
      const status = vorbei ? (r < 0.45 ? "Erledigt" : r < 0.7 ? "Läuft" : "Offen") : (r < 0.1 ? "Erledigt" : r < 0.3 ? "Läuft" : r < 0.36 ? "Wartet" : "Offen");
      const ck = Array.isArray(t.checklist) && t.checklist.length ? t.checklist.map((c) => ({ ...c, done: status === "Erledigt" || z() < 0.3 })) : z() < 0.2 ? pick(tCheck).map((x) => ({ t: x, done: status === "Erledigt" || z() < 0.35 })) : undefined;
      let owner = z() < 0.85 ? pick(alle) : ""; const wer = pick(lalei);
      // damit «Für dich» etwas zeigt: ein paar überfällige und bald fällige Aufgaben gehören dir
      if (status !== "Erledigt" && t.deadline && ((vorbei && (uebMeine.alt = (uebMeine.alt || 0) + 1) <= 3) || (!vorbei && t.deadline <= addDays(t0, 7) && (uebMeine.bald = (uebMeine.bald || 0) + 1) <= 3))) owner = ich;
      const log = z() < 0.35 ? [{ at: addDays(t0, -Math.floor(z() * 20) - 1) + "T19:00:00.000Z", by: wer, text: pick(tLog) }] : [];
      ops.push(P("tasks", id, { title: t.title || "Aufgabe", deadline: t.deadline || "", ressort: t.ressort || "", teil: t.teil || "", order: t.order || 0, ongoing: !!t.ongoing, ...(t.repeat ? { repeat: t.repeat } : {}), ...(ck ? { checklist: ck } : {}), status, owner, support: z() < 0.2 ? pick(team) : "", note: z() < 0.3 ? pick(tNotiz) : "", log, star: z() < 0.06, updatedAt: jetzt, updatedBy: wer }));
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
    // Weitere Infos
    ops.push(P("info", "main", { sections: [
      { id: "s1", title: "Notfall", emergency: true, text: "Lagerleitung: 079 000 00 01 (fiktiv)\nNächstes Spital: Spital Musterwil (fiktiv)\nTreffpunkt: Platz vor dem Haus", links: [] },
      { id: "s2", title: "Lagerhaus", emergency: false, text: "Pfadiheim Musterwil (fiktiv)\nSchlüssel: Hauswart Muster\nHausordnung hängt im Eingang", links: [] },
      { id: "s3", title: "Anreise und Rückreise", emergency: false, text: "Treffpunkt: Bahnhof Musterwil (fiktiv)\nGepäck wird mit dem Auto gebracht.", links: [] },
      { id: "s4", title: "Budget", emergency: false, lalei: true, text: "Lagerbeitrag pro Kind: 180 Franken (fiktiv)\nQuittungen sammelt Biber.", links: [] },
      { id: "s5", title: "Wichtige Links", emergency: false, text: "", links: [{ title: "eCamp", url: "https://ecamp3.ch" }, { title: "Ordner Übungslager (Beispiel)", url: "https://example.com/ordner" }] }] }));
    // Anwesenheit: Leitende und Teilnehmende mit gemischtem Stand
    const slots = (anteilAb, anteilOffen) => { const s = {}; for (const d of days) parts.forEach((_, i) => { const r = z(); s[d.id + "|" + i] = r < anteilAb ? "F" : r < anteilAb + anteilOffen ? "O" : "A"; }); return s; };
    alle.forEach((n) => ops.push(P("att", "p_" + pid[n], { slots: slots(0.08, n === ich ? 0 : 0.12) })));
    tnV.forEach((_, i) => ops.push(P("att", "k_fk" + (i + 1), { slots: slots(0.05, 0.08) })));
    // Tagesseiten
    const dpTexte = { todo: ["Znüni-Brot holen", "Material für den Nachmittag bereitstellen", "Abwaschplan aufhängen"], discuss: ["Regenprogramm?", "Wer macht den Abendabschluss?"], important: ["Zecken-Kontrolle am Abend", "Treffpunkt nach dem Spiel: Lagerhaus"], ideas: ["Singen am Lagerfeuer", "Postenlauf im Wald"] };
    days.forEach((d, di) => {
      const blocks = [["todo", "To-dos"], ["discuss", "Zu besprechen"], ["important", "Wichtig"], ["ideas", "Ideen"]].map(([type, title]) => ({ id: type, type, title, items: (dpTexte[type] || []).filter(() => z() < 0.75).map((t, k) => ({ id: "it" + di + type + k, t, done: type === "todo" && z() < 0.4 })) }));
      ops.push(P("daypage", d.id, { blocks, images: [], updatedAt: jetzt, updatedBy: pick(lalei) }));
    });
    // Gruppen, Fahrten, Abzählen
    const gNamen = ["Gruppe Adler", "Gruppe Wölfe", "Gruppe Füchse"];
    gNamen.forEach((name, g) => ops.push(P("groups", "fg" + (g + 1), { name, leaders: [pid[team[g * 2]], pid[team[g * 2 + 1]]], members: tnV.map((_, i) => i).filter((i) => i % 3 === g).map((i) => ({ t: "k", id: "fk" + (i + 1) })), order: g + 1 })));
    ops.push(P("trips", "ft1", { dir: "Hin", kind: "ÖV", name: "ÖV-Gruppe 1", driver: "", seats: "", date: dates.start || "", time: "09:00", from: "Bahnhof Musterwil", to: "Pfadiheim Musterwil", meet: "Gleis 3", members: [...tnV.slice(0, 10).map((_, i) => ({ t: "k", id: "fk" + (i + 1) })), { t: "p", id: pid[team[0]] }, { t: "p", id: pid[team[1]] }], order: 1 }));
    ops.push(P("trips", "ft2", { dir: "Hin", kind: "Auto", name: "Auto 1", driver: lalei[1], seats: "4", date: dates.prep || dates.start || "", time: "08:00", from: "Cevi-Raum", to: "Pfadiheim Musterwil", meet: "", members: [{ t: "p", id: pid[lalei[1]] }, { t: "p", id: pid[lalei[2]] }], order: 2 }));
    ops.push(P("trips", "ft3", { dir: "Rück", kind: "ÖV", name: "ÖV-Gruppe 1", driver: "", seats: "", date: dates.end || "", time: "15:00", from: "Pfadiheim Musterwil", to: "Bahnhof Musterwil", meet: "Vor dem Haus", members: tnV.slice(0, 10).map((_, i) => ({ t: "k", id: "fk" + (i + 1) })), order: 3 }));
    const gezaehlt = {}; tnV.forEach((_, i) => { if (z() < 0.6) gezaehlt["fk" + (i + 1)] = true; }); ops.push(P("count", "main", { checked: gezaehlt, at: jetzt, by: team[0] }));
    // Auswertung (zum Ausprobieren schon angefangen)
    ops.push(P("eval", "general", { good: "Stimmung im Team war super.\nLagerhaus hat gepasst.", improve: "Material früher kontrollieren.", tips: "Anmeldung zwei Wochen früher verschicken.", updatedAt: jetzt, updatedBy: lalei[0] }));
    Object.keys(ress).slice(0, 2).forEach((rid) => ops.push(P("eval", rid, { good: "Gute Absprachen im Ressort.", improve: "Mehr Zeit für die Vorbereitung einplanen.", tips: "Checkliste vom Vorjahr verwenden.", updatedAt: jetzt, updatedBy: pick(lalei) })));
    // Ideen, Wünsche, Fragen aus dem Team (Eingang)
    [["Idee", team[2], "Wie wäre ein Geländespiel mit Karten und Kompass?", "Neu"], ["Wunsch", team[4], "Können wir mehr vegetarische Menüs einplanen?", "Gelesen"], ["Frage", team[5], "Wann ist die Materialkontrolle?", "Erledigt"]].forEach(([kind, n, text, status], i) =>
      ops.push(P("feedback", "ff" + (i + 1), { person: pid[n], name: n, kind, text, status, anon: false, createdAt: addDays(t0, -i - 1) + "T20:00:00.000Z", ...(status === "Erledigt" ? { reply: "Am Samstag vor dem Lager um 10 Uhr.", repliedBy: lalei[1], repliedAt: jetzt } : {}) })));
    if (days.length) {
      const d1 = days[Math.min(1, days.length - 1)];
      ops.push(P("attreq", "fq1", { person: pid[team[6]], name: team[6], slots: { [d1.id + "|0"]: "F" }, note: "Habe am Morgen noch eine Prüfung.", status: "Offen", createdAt: jetzt }));
      const sv = services[1] || services[0];
      ops.push(P("swap", "fw1", { person: pid[team[7]], name: team[7], key: d1.id + "|" + sv.id, dayId: d1.id, serviceId: sv.id, dayLabel: d1.label || "", serviceName: sv.name || "", withName: team[0], note: "Tausch mit Specht wäre ideal.", status: "Offen", createdAt: jetzt }));
    }
    // Deine To-dos und Reaktionen auf der Pinnwand
    ops.push(P("todos", pid[ich], { items: [{ id: "td1", t: "Lagerhaus-Rechnung prüfen", done: false, at: jetzt }, { id: "td2", t: "Elternabend vorbereiten", done: false, at: jetzt }, { id: "td3", t: "Höck-Einladung verschicken", done: true, at: jetzt }], mentDone: [], updatedAt: jetzt }));
    [[lalei[1], "👍"], [team[0], "👍"], [team[3], "🙌"]].forEach(([n, emoji]) => ops.push(P("react", "fb1~" + pid[n], { board: "fb1", person: pid[n], name: n, emoji, at: jetzt })));
    // undefined-Felder entfernen
    return ops.map((o) => (o.data ? { ...o, data: JSON.parse(JSON.stringify(o.data)) } : o));
  }
