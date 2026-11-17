/**
 * Lager-Tool · Server-Teil für Google Apps Script
 *
 * Die Seite selbst liegt auf GitHub. Dieses Skript speichert nur die Daten (in der Google-Tabelle)
 * und beantwortet die Anfragen der Seite (Schnittstelle «doPost»).
 *
 * Einrichten (einmal): Funktion «einrichten» ▶ ausführen, Berechtigungen erlauben,
 * dann Bereitstellen → Web-App (Ausführen als: Ich · Zugriff: Jeder).
 * Nach jeder Änderung an dieser Datei: Bereitstellen → Bereitstellungen verwalten → ✏️ → Neue Version.
 */

// Start-Passwörter, nur verschlüsselt (SHA-256). Sie gelten nur beim allerersten «einrichten»;
// danach werden alle Passwörter im Tool über das Zahnrad geändert.
const START_ADMIN = 'c7ca9186bd7a70334f49703c209a23c5142ffd430ca28b56385bc21de0cc4085';
const START_LAGER = { pfila27: '170a0835f8d8ee4d1923788791285b5fce2320898d04d028ceeeba3eafcb60ba' };
// Hierhin geht ein neues Admin-Passwort, wenn jemand «Passwort vergessen?» wählt
const ADMIN_MAIL = 'lagerleitung@cevi-staefa-hombi.ch';
// Adresse der Website auf GitHub (für Links in Mails und für die Umleitung)
const WEBSITE = 'https://jajakingge.github.io/lager-tool/';

const DATEN_BLATT = '_daten';
const MAX_ZELLE = 49000; // Google Sheets erlaubt höchstens 50'000 Zeichen pro Zelle
const TOKEN_TAGE = 60;
const SHORT = ['tasks', 'config', 'journal', 'hoecks', 'people', 'kids', 'att', 'plan', 'info', 'eval', 'assets', 'trash', 'rooms', 'todos', 'feedback', 'attreq', 'daypage', 'presence', 'media', 'board', 'swap', 'trips', 'groups', 'count', 'shop', 'log'];
const TEAM_READ = ['config', 'people', 'kids', 'plan', 'rooms', 'info', 'att', 'attreq', 'todos', 'feedback', 'hoecks', 'board', 'swap', 'trips', 'groups', 'count', 'media'];
const NO_LOG = ['presence', 'count', 'todos', 'feedback', 'attreq', 'swap', 'log', 'media'];

// ---------------------------------------------------------------------------
// Web-App
// ---------------------------------------------------------------------------

/** Wer den alten Google-Link öffnet, landet auf der Website */
function doGet() {
  const ziel = WEBSITE || '';
  return HtmlService.createHtmlOutput(ziel
    ? '<meta charset="utf-8"><p style="font:16px system-ui;margin:40px">Das Lager-Tool ist umgezogen: <a href="' + ziel + '" target="_top">' + ziel + '</a></p><script>window.top.location.href=' + JSON.stringify(ziel) + ';</script>'
    : '<meta charset="utf-8"><p style="font:16px system-ui;margin:40px">Das ist die Daten-Schnittstelle des Lager-Tools. Bitte die Website öffnen.</p>').setTitle('Lager-Tool');
}

/** Schnittstelle für die Website: {token, op, payload} → {ok, r} oder {ok:false, e} */
function doPost(e) {
  let antwort;
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    antwort = { ok: true, r: api(d.token || null, d.op, d.payload || {}) };
  } catch (err) { antwort = { ok: false, e: String((err && err.message) || err) }; }
  let json = JSON.stringify(antwort);
  // grosse Antworten gepackt schicken (die Seite entpackt sie), spart auf dem Handy viel Zeit
  if (json.length > 20000) json = JSON.stringify({ z: Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(json, 'application/json')).getBytes()) });
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/** Einziger Einstiegspunkt (Website über doPost) */
function api(token, op, payload) {
  payload = payload || {};
  migrieren_();
  if (op === 'lagers') return { lagers: lagerListe_(), url: WEBSITE, wartung: global_('wartung') };
  if (op === 'roster') return { people: roster_(payload.lager) };
  if (op === 'login') return login_(payload);
  if (op === 'logout') { if (token) props_().deleteProperty('TOK_' + token); return {}; }
  if (op === 'forgotAdmin') return vergessen_(payload);
  if (op === 'admin') return admin_(payload);
  if (op === 'report') return fehlerMelden_(payload);
  const sess = sitzung_(token);
  if (op === 'sync') {
    const lager = sess.role === 'admin' ? payload.lager : sess.lager;
    nutzung_(token, sess);
    const rev = aktuelleRev_();
    if (payload.rev === rev && !payload.full) return { rev: rev };
    const data = { lager: lagerListe_() };
    if (lager) { const f = filterFuer_(Object.assign({}, sess, { lager: lager }), lagerDaten_(lager)); Object.keys(f).forEach(function (k) { data[k] = f[k]; }); }
    return { rev: rev, data: data };
  }
  if (op === 'write') return schreiben_(sess, payload.ops);
  if (op === 'upload') return hochladen_(sess, payload);
  if (op === 'changePw') return passwortAendern_(sess, payload);
  throw new Error('UNBEKANNTE_AKTION');
}
// ---------------------------------------------------------------------------
// Einrichtung und Zeitsteuerung
// ---------------------------------------------------------------------------

function einrichten() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Bitte das Skript aus der Google-Tabelle öffnen: Erweiterungen → Apps Script.');
  const p = props_();
  p.setProperty('SHEET_ID', ss.getId());
  if (!p.getProperty('SALZ')) p.setProperty('SALZ', Utilities.getUuid());
  if (!p.getProperty('ADMINS') && !p.getProperty('ADMIN_HASH')) p.setProperty('ADMINS', JSON.stringify([{ id: 'a1', name: 'Admin', h: 'start:' + START_ADMIN }]));
  Object.keys(START_LAGER).forEach(function (id) { if (!p.getProperty('LAGERPW_' + id)) p.setProperty('LAGERPW_' + id, 'start:' + START_LAGER[id]); });
  migrieren_();
  const sh = datenBlatt_();
  if (sh.getLastRow() <= 1) {
    if (typeof SEED === 'undefined') throw new Error('Die Datei «Seed.gs» fehlt. Bitte zuerst einfügen.');
    const rows = []; const jetzt = new Date();
    Object.keys(SEED).forEach(function (c) { Object.keys(SEED[c]).forEach(function (id) { rows.push([c, id, JSON.stringify(SEED[c][id]), jetzt]); }); });
    if (rows.length) sh.getRange(2, 1, rows.length, 4).setValues(rows);
    erhoeheRev_();
  } else {
    // Daten aus der alten Version (nur ein Lager, ohne Lager-Kennung) ins neue Format übernehmen
    const w = zeilen_(sh); let geaendert = 0;
    w.forEach(function (r, i) { const c = String(r[0]); if (c && c !== 'lager' && c.indexOf(':') < 0 && SHORT.indexOf(c) >= 0) { sh.getRange(i + 2, 1).setValue('pfila27:' + c); geaendert++; } });
    const hatLager = w.some(function (r) { return String(r[0]) === 'lager'; });
    if (!hatLager && typeof SEED !== 'undefined' && SEED.lager) {
      const neu = []; const jetzt = new Date();
      Object.keys(SEED.lager).forEach(function (id) { neu.push(['lager', id, JSON.stringify(SEED.lager[id]), jetzt]); });
      // fehlende Sammlungen (z.B. Leitende) aus den Startdaten ergänzen
      const vorhanden = {}; zeilen_(sh).forEach(function (r) { vorhanden[String(r[0]).replace(/^pfila27:/, '')] = true; });
      Object.keys(SEED).forEach(function (c) { const kurz = c.replace(/^pfila27:/, ''); if (c === 'lager' || vorhanden[kurz]) return; Object.keys(SEED[c]).forEach(function (id) { neu.push([c, id, JSON.stringify(SEED[c][id]), jetzt]); }); });
      if (neu.length) sh.getRange(sh.getLastRow() + 1, 1, neu.length, 4).setValues(neu);
      geaendert += neu.length;
    }
    if (geaendert) { erhoeheRev_(); Logger.log('Alte Daten übernommen: ' + geaendert + ' Zeilen angepasst.'); }
  }
  ScriptApp.getProjectTriggers().forEach(function (t) { if (['wochenAufgaben', 'tabellenAktualisieren'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('wochenAufgaben').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(18).create();
  ordner_('Lager-Tool Sicherungen'); ordner_('Lager-Tool Dateien');
  Logger.log('Fertig eingerichtet: ' + (sh.getLastRow() - 1) + ' Einträge. Jetzt «Bereitstellen → Neue Bereitstellung → Web-App».');
}

/** Läuft jeden Sonntag um 18 Uhr: Sicherung und Erinnerungs-Mails */
function wochenAufgaben() {
  try { sichern_(); } catch (e) { Logger.log('Sicherung: ' + e); }
  try { erinnerungen_(); } catch (e) { Logger.log('Erinnerungen: ' + e); }
}

// ---------------------------------------------------------------------------
// Speicher
// ---------------------------------------------------------------------------

function props_() { return PropertiesService.getScriptProperties(); }
function tabelle_() { const id = props_().getProperty('SHEET_ID'); return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet(); }
function datenBlatt_(ss) {
  ss = ss || tabelle_();
  let sh = ss.getSheetByName(DATEN_BLATT);
  if (!sh) {
    sh = ss.insertSheet(DATEN_BLATT);
    sh.getRange(1, 1, 1, 4).setValues([['Sammlung', 'ID', 'Daten (bitte nicht von Hand ändern)', 'Geändert']]).setFontWeight('bold');
    sh.getRange('A:C').setNumberFormat('@'); sh.setFrozenRows(1);
  }
  return sh;
}
function aktuelleRev_() { return Number(props_().getProperty('REV') || 0); }
function erhoeheRev_() { const rev = aktuelleRev_() + 1; props_().setProperty('REV', String(rev)); return rev; }
function zeilen_(sh) { const n = sh.getLastRow(); return n < 2 ? [] : sh.getRange(2, 1, n - 1, 3).getValues(); }
function parse_(s) { try { return JSON.parse(s); } catch (e) { return null; } }
function lagerListe_() { const out = {}; zeilen_(datenBlatt_()).forEach(function (r) { if (r[0] === 'lager' && r[1]) { const v = parse_(r[2]); if (v) out[String(r[1])] = v; } }); return out; }
function lagerDaten_(lager) {
  const out = {}; SHORT.forEach(function (c) { out[c] = {}; }); const pre = lager + ':';
  zeilen_(datenBlatt_()).forEach(function (r) { const c = String(r[0]); if (c.indexOf(pre) !== 0) return; const s = c.slice(pre.length); if (!out[s]) return; const v = parse_(r[2]); if (v) out[s][String(r[1])] = v; });
  return out;
}
function istObjekt_(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function zusammenfuehren_(ziel, patch) { const out = istObjekt_(ziel) ? ziel : {}; Object.keys(patch).forEach(function (k) { out[k] = istObjekt_(patch[k]) && istObjekt_(out[k]) ? zusammenfuehren_(out[k], patch[k]) : patch[k]; }); return out; }
function heute_() { return Utilities.formatDate(new Date(), 'Europe/Zurich', 'yyyy-MM-dd'); }

// ---------------------------------------------------------------------------
// Anmeldung
// ---------------------------------------------------------------------------

function hash_(pw) {
  const salz = props_().getProperty('SALZ') || '';
  return sha_(salz + '|lalei|' + String(pw || ''));
}
function sha_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
// gespeichertes Passwort prüfen: «start:…» = Start-Passwort aus dem Code, sonst mit Salz verschlüsselt
function passt_(gespeichert, pw) {
  if (!gespeichert) return false;
  if (String(gespeichert).indexOf('start:') === 0) return gespeichert.slice(6) === sha_('lalei-start|' + String(pw || ''));
  return gespeichert === hash_(pw);
}
// Alte Speicherformen umstellen: Lagerpasswörter im Klartext → verschlüsselt, ein Admin → Admin-Liste
function migrieren_() {
  const p = props_(); if (p.getProperty('MIGRIERT') === '3') return;
  if (!p.getProperty('SALZ')) p.setProperty('SALZ', Utilities.getUuid());
  const all = p.getProperties();
  Object.keys(all).forEach(function (k) { if (k.indexOf('LAGERPW_') === 0 && all[k] && all[k].indexOf('start:') !== 0 && !/^[0-9a-f]{64}$/.test(all[k])) p.setProperty(k, hash_(all[k])); });
  if (!p.getProperty('ADMINS') && p.getProperty('ADMIN_HASH')) { p.setProperty('ADMINS', JSON.stringify([{ id: 'a1', name: 'Admin', h: p.getProperty('ADMIN_HASH') }])); p.deleteProperty('ADMIN_HASH'); }
  p.setProperty('MIGRIERT', '3');
}
function bremse_(key) {
  const c = CacheService.getScriptCache(); const n = Number(c.get('FAIL_' + key) || 0);
  if (n >= 8) throw new Error('ZU_VIELE_VERSUCHE');
  return function () { c.put('FAIL_' + key, String(n + 1), 600); Utilities.sleep(700); };
}
function anzeigeName_(p) { return String(p.ceviname || '').trim() || String(p.vorname || '').trim() || '?'; }
// «LaLei» = Lagerleitung, «Lesen» = Lagerleitung nur lesen (z.B. Coach), sonst Team
function istLeitung_(p) { return p.funktion === 'LaLei' || p.funktion === 'Lesen'; }
function roster_(lager) {
  const people = lagerDaten_(lager).people; const p = props_();
  return Object.keys(people).map(function (id) { return { id: id, name: anzeigeName_(people[id]), funktion: people[id].funktion || '', hasPw: !!p.getProperty('PW_' + lager + '|' + id) }; });
}
function login_(d) {
  const lager = String(d.lager || ''), person = String(d.person || '');
  const pers = lagerDaten_(lager).people[person]; if (!pers) throw new Error('PERSON_FEHLT');
  const p = props_(); let rolle = 'team';
  if (d.role === 'lalei') {
    if (!istLeitung_(pers)) throw new Error('KEINE_LAGERLEITUNG');
    const fail = bremse_(lager + '|' + person); const key = 'PW_' + lager + '|' + person; const gespeichert = p.getProperty(key);
    if (gespeichert) { if (!passt_(gespeichert, d.pw)) { fail(); throw new Error('FALSCHES_PASSWORT'); } }
    else {
      if (!passt_(p.getProperty('LAGERPW_' + lager), d.lagerPw)) { fail(); throw new Error('FALSCHES_LAGERPASSWORT'); }
      if (!d.newPw || String(d.newPw).length < 6) throw new Error('PASSWORT_ZU_KURZ');
      p.setProperty(key, hash_(d.newPw));
    }
    rolle = pers.funktion === 'Lesen' ? 'lesen' : 'lalei';
  } else if (d.role !== 'team') throw new Error('UNGUELTIGE_ROLLE');
  aufraeumen_();
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  // ohne «angemeldet bleiben» gilt die Anmeldung nur 12 Stunden
  const ttl = d.remember === false ? 0.5 : TOKEN_TAGE;
  p.setProperty('TOK_' + token, JSON.stringify({ lager: lager, role: rolle, person: person, created: Date.now(), ttl: ttl }));
  return { token: token, role: rolle };
}
function abgelaufen_(s) { return !s || Date.now() - (s.created || 0) > (s.ttl || TOKEN_TAGE) * 864e5; }
function sitzung_(token) {
  if (!token) throw new Error('NICHT_ANGEMELDET');
  const raw = props_().getProperty('TOK_' + token); if (!raw) throw new Error('NICHT_ANGEMELDET');
  const s = JSON.parse(raw);
  if (abgelaufen_(s)) { props_().deleteProperty('TOK_' + token); throw new Error('NICHT_ANGEMELDET'); }
  return s;
}
function aufraeumen_() {
  const all = props_().getProperties();
  Object.keys(all).forEach(function (k) { if (k.indexOf('TOK_') === 0 && abgelaufen_(parse_(all[k]))) props_().deleteProperty(k); });
}
function abmelden_(fn) { const all = props_().getProperties(); Object.keys(all).forEach(function (k) { if (k.indexOf('TOK_') === 0) { const s = parse_(all[k]); if (!s || fn(s)) props_().deleteProperty(k); } }); }
function passwortAendern_(sess, d) {
  if (sess.role !== 'lalei' && sess.role !== 'lesen') throw new Error('KEINE_BERECHTIGUNG');
  const key = 'PW_' + sess.lager + '|' + sess.person; const fail = bremse_(sess.lager + '|' + sess.person);
  if (!passt_(props_().getProperty(key), d.oldPw)) { fail(); throw new Error('FALSCHES_PASSWORT'); }
  if (!d.newPw || String(d.newPw).length < 6) throw new Error('PASSWORT_ZU_KURZ');
  props_().setProperty(key, hash_(d.newPw));
  return {};
}
function admins_() { return parse_(props_().getProperty('ADMINS')) || []; }
function vergessen_(d) {
  const c = CacheService.getScriptCache(); if (c.get('VERGESSEN')) throw new Error('ZU_VIELE_VERSUCHE'); c.put('VERGESSEN', '1', 600);
  const list = admins_(); const name = String((d && d.name) || '').trim().toLowerCase();
  const a = list.find(function (x) { return x.name.toLowerCase() === name; }) || (list.length === 1 ? list[0] : null);
  if (!a) throw new Error('ADMIN_UNBEKANNT');
  const neu = 'Cevi-' + Utilities.getUuid().slice(0, 8);
  MailApp.sendEmail(ADMIN_MAIL, 'Lager-Tool: neues Admin-Passwort für ' + a.name, 'Hallo\n\nIm Lager-Tool wurde für den Admin «' + a.name + '» «Passwort vergessen?» gewählt. Das neue Passwort lautet:\n\n' + neu + '\n\nDas alte Passwort gilt nicht mehr. Ändern kannst du es im Tool über das Zahnrad auf der Startseite.\n\n' + WEBSITE);
  a.h = hash_(neu); props_().setProperty('ADMINS', JSON.stringify(list));
  return {};
}

// ---------------------------------------------------------------------------
// Gemeinsame Einstellungen (Wartungshinweis, Fehlerberichte, Nutzung)
// ---------------------------------------------------------------------------

function global_(id) { const r = zeilen_(datenBlatt_()).find(function (x) { return x[0] === '_global' && String(x[1]) === id; }); return r ? parse_(r[2]) : null; }
function globalSetzen_(id, wert) {
  const sh = datenBlatt_(); const w = zeilen_(sh); const i = w.findIndex(function (x) { return x[0] === '_global' && String(x[1]) === id; });
  let json = JSON.stringify(wert); if (json.length > MAX_ZELLE) throw new Error('EINTRAG_ZU_GROSS');
  if (i >= 0) sh.getRange(i + 2, 3, 1, 2).setValues([[json, new Date()]]); else sh.getRange(sh.getLastRow() + 1, 1, 1, 4).setValues([['_global', id, json, new Date()]]);
}
function fehlerMelden_(d) {
  const c = CacheService.getScriptCache(); const n = Number(c.get('FEHLER') || 0); if (n > 30) return {}; c.put('FEHLER', String(n + 1), 3600);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { const alt = (global_('fehler') || {}).items || []; globalSetzen_('fehler', { items: [{ at: new Date().toISOString(), msg: String(d.msg || '').slice(0, 500), wo: String(d.wo || '').slice(0, 120), version: String(d.version || '').slice(0, 30), geraet: String(d.geraet || '').slice(0, 120) }].concat(alt).slice(0, 100) }); } finally { lock.releaseLock(); }
  return {};
}
// höchstens alle 10 Minuten pro Anmeldung festhalten, wer wann aktiv war
function nutzung_(token, sess) {
  if (sess.role === 'admin') return; const c = CacheService.getScriptCache(); if (c.get('N_' + token)) return; c.put('N_' + token, '1', 600);
  try {
    const lock = LockService.getScriptLock(); lock.waitLock(5000);
    try { const n = global_('nutzung') || {}; const pers = lagerDaten_(sess.lager).people[sess.person]; n[sess.lager + '|' + sess.person] = { lager: sess.lager, name: pers ? anzeigeName_(pers) : '?', role: sess.role, at: new Date().toISOString() }; globalSetzen_('nutzung', n); } finally { lock.releaseLock(); }
  } catch (e) { /* nicht wichtig */ }
}

// ---------------------------------------------------------------------------
// Admin (Zahnrad)
// ---------------------------------------------------------------------------

function admin_(d) {
  const fail = bremse_('admin'); const list = admins_();
  const ich = list.find(function (a) { return passt_(a.h, d.adminPw); });
  if (!ich) { fail(); throw new Error('FALSCHES_ADMIN_PASSWORT'); }
  const p = props_(); const a = d.action; const speichern = function () { p.setProperty('ADMINS', JSON.stringify(list)); };
  if (a === 'overview') {
    const l = lagerListe_(); const sh = datenBlatt_(); const w = zeilen_(sh);
    const groesse = {}; w.forEach(function (r) { const lid = String(r[0]).split(':')[0]; groesse[lid] = (groesse[lid] || 0) + String(r[2]).length; });
    return { ich: ich.name, admins: list.map(function (x) { return { id: x.id, name: x.name }; }), wartung: global_('wartung'), nutzung: global_('nutzung') || {}, fehler: (global_('fehler') || {}).items || [], zeilen: w.length,
      lagers: Object.keys(l).map(function (id) { return { id: id, title: l[id].title, hasLagerPw: !!p.getProperty('LAGERPW_' + id), groesse: groesse[id] || 0, people: roster_(id).filter(function (x) { return x.funktion === 'LaLei' || x.funktion === 'Lesen'; }) }; }) };
  }
  if (a === 'setLagerPw') { if (String(d.pw || '').length < 6) throw new Error('PASSWORT_ZU_KURZ'); p.setProperty('LAGERPW_' + d.lager, hash_(d.pw)); return {}; }
  if (a === 'resetPerson') { p.deleteProperty('PW_' + d.lager + '|' + d.person); abmelden_(function (s) { return s.lager === d.lager && s.person === d.person; }); return {}; }
  if (a === 'logoutAll') { abmelden_(function () { return true; }); return {}; }
  if (a === 'setAdminPw') { if (String(d.newPw || '').length < 6) throw new Error('PASSWORT_ZU_KURZ'); ich.h = hash_(d.newPw); speichern(); return {}; }
  if (a === 'addAdmin') { const name = String(d.name || '').trim(); if (!name) throw new Error('NAME_FEHLT'); if (String(d.newPw || '').length < 6) throw new Error('PASSWORT_ZU_KURZ'); if (list.some(function (x) { return x.name.toLowerCase() === name.toLowerCase(); })) throw new Error('NAME_VERGEBEN'); list.push({ id: 'a' + Utilities.getUuid().slice(0, 6), name: name, h: hash_(d.newPw) }); speichern(); return {}; }
  if (a === 'removeAdmin') { if (list.length < 2) throw new Error('LETZTER_ADMIN'); const i = list.findIndex(function (x) { return x.id === d.id; }); if (i >= 0) list.splice(i, 1); speichern(); return {}; }
  if (a === 'setWartung') { globalSetzen_('wartung', { text: String(d.text || '').slice(0, 300), on: !!d.on }); erhoeheRev_(); return {}; }
  if (a === 'clearFehler') { globalSetzen_('fehler', { items: [] }); return {}; }
  if (a === 'token') { const t = Utilities.getUuid().replace(/-/g, ''); p.setProperty('TOK_' + t, JSON.stringify({ lager: '*', role: 'admin', person: '', created: Date.now(), ttl: 1 })); return { token: t }; }
  if (a === 'deleteLager') {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try { const sh = datenBlatt_(); const w = zeilen_(sh); for (let i = w.length - 1; i >= 0; i--) { const c = String(w[i][0]); if (c.indexOf(d.lager + ':') === 0 || (c === 'lager' && String(w[i][1]) === d.lager)) sh.deleteRow(i + 2); } p.deleteProperty('LAGERPW_' + d.lager); erhoeheRev_(); } finally { lock.releaseLock(); }
    return {};
  }
  if (a === 'backupNow') { sichern_(); return {}; }
  if (a === 'backups') { const out = []; const it = ordner_('Lager-Tool Sicherungen').getFiles(); while (it.hasNext()) { const f = it.next(); out.push({ id: f.getId(), at: f.getDateCreated().toISOString(), name: f.getName() }); } out.sort(function (x, y) { return y.at.localeCompare(x.at); }); return { backups: out.slice(0, 20) }; }
  if (a === 'restore') return zurueckspielen_(d);
  throw new Error('UNBEKANNTE_AKTION');
}function ordner_(name) { const it = DriveApp.getFoldersByName(name); return it.hasNext() ? it.next() : DriveApp.createFolder(name); }
function sichern_() {
  const ordner = ordner_('Lager-Tool Sicherungen');
  DriveApp.getFileById(tabelle_().getId()).makeCopy('Sicherung ' + Utilities.formatDate(new Date(), 'Europe/Zurich', 'yyyy-MM-dd HH:mm'), ordner);
  const files = []; const it = ordner.getFiles(); while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); }).slice(12).forEach(function (f) { f.setTrashed(true); });
}
function zurueckspielen_(d) {
  const kopie = datenBlatt_(SpreadsheetApp.openById(d.backup)); const pre = d.lager + ':';
  const gehoert = function (r) { const c = String(r[0]); return c.indexOf(pre) === 0 || (c === 'lager' && String(r[1]) === d.lager); };
  const alt = zeilen_(kopie).filter(gehoert);
  const zaehle = function (rows) { const c = {}; rows.forEach(function (r) { const k = String(r[0]) === 'lager' ? 'lager' : String(r[0]).slice(pre.length); c[k] = (c[k] || 0) + 1; }); return c; };
  if (d.dryRun) return { now: zaehle(zeilen_(datenBlatt_()).filter(gehoert)), then: zaehle(alt) };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = datenBlatt_(); const w = zeilen_(sh);
    for (let i = w.length - 1; i >= 0; i--) if (gehoert(w[i])) sh.deleteRow(i + 2);
    const jetzt = new Date(); if (alt.length) sh.getRange(sh.getLastRow() + 1, 1, alt.length, 4).setValues(alt.map(function (r) { return [r[0], r[1], r[2], jetzt]; }));
    erhoeheRev_();
  } finally { lock.releaseLock(); }
  return {};
}

// ---------------------------------------------------------------------------
// Rechte (gleich wie in der Vorschau)
// ---------------------------------------------------------------------------

function sicherheitsIds_(cfg, people) {
  const r = (cfg && cfg.ressorts && cfg.ressorts.si) || {}; const names = [r.lead, r.stv];
  Object.keys(r.subs || {}).forEach(function (k) { names.push(r.subs[k].lead, r.subs[k].stv); });
  return Object.keys(people || {}).filter(function (id) { return names.indexOf(anzeigeName_(people[id])) >= 0; });
}
function filterFuer_(sess, colls) {
  const out = {}; const t = heute_();
  SHORT.forEach(function (c) {
    const src = colls[c] || {}; out[c] = {};
    if (c === 'todos') { if (src[sess.person]) out.todos[sess.person] = src[sess.person]; return; }
    if (c === 'feedback' && sess.role !== 'team') { Object.keys(src).forEach(function (id) { const d = src[id]; out.feedback[id] = d.anon ? Object.assign({}, d, { person: '', name: 'Anonym' }) : d; }); return; }
    if (sess.role === 'lalei' || sess.role === 'lesen' || sess.role === 'admin') { out[c] = src; return; }
    if (TEAM_READ.indexOf(c) < 0) return;
    Object.keys(src).forEach(function (id) {
      const d = src[id];
      if (c === 'att') { if (id === 'p_' + sess.person) out.att[id] = d; }
      else if (c === 'attreq' || c === 'feedback' || c === 'swap') { if (d.person === sess.person) out[c][id] = d; }
      else if (c === 'hoecks') { if ((d.kind || 'LaLei') === 'Team') out.hoecks[id] = { kind: 'Team', date: d.date || '', time: d.time || '', title: d.title || '', place: d.place || '' }; }
      else if (c === 'board') { if ((!d.from || d.from <= t) && (!d.until || d.until >= t)) out.board[id] = d; }
      else if (c === 'count') out.count[id] = { checked: d.checked || {}, resetAt: d.resetAt || '' };
      else if (c === 'kids') out.kids[id] = { vorname: d.vorname || '', nachname: d.nachname || '', stufe: d.stufe || '' };
      else if (c === 'config') { if (id === 'main') { const m = JSON.parse(JSON.stringify(d)); delete m.mail; delete m.prevTips; out.config.main = m; } }
      else if (c !== 'people') out[c][id] = d;
    });
    if (c === 'people') { const sec = sicherheitsIds_((colls.config || {}).main, src); Object.keys(src).forEach(function (id) { const p = src[id]; out.people[id] = { ceviname: p.ceviname || '', vorname: p.vorname || '', nachname: p.nachname || '', stufe: p.stufe || '', funktion: p.funktion || '', order: p.order || 0 }; if (sec.indexOf(id) >= 0) out.people[id].telefon = p.telefon || ''; }); }
  });
  return out;
}
function pruefeSchreiben_(sess, o, aktuell) {
  if (sess.role === 'admin') return;
  const teile = String(o.coll).split(':'); const lager = teile[0], coll = teile[1];
  if (o.coll === 'lager') { if (sess.role === 'lalei' && o.op === 'update' && o.id === sess.lager) return; throw new Error('KEINE_BERECHTIGUNG'); }
  if (lager !== sess.lager || SHORT.indexOf(coll) < 0) throw new Error('KEINE_BERECHTIGUNG');
  if (coll === 'todos') { if (o.id === sess.person) return; throw new Error('KEINE_BERECHTIGUNG'); }
  if (sess.role === 'lalei') return;
  if (sess.role === 'lesen') throw new Error('NUR_LESEN');
  const data = o.data || {};
  if (['feedback', 'attreq', 'swap'].indexOf(coll) >= 0 && o.op === 'set' && !aktuell && data.person === sess.person) return;
  if (coll === 'count' && o.id === 'main' && o.op !== 'delete' && Object.keys(data).every(function (k) { return ['checked', 'at', 'by', 'resetAt', 'resetBy'].indexOf(k) >= 0; })) return;
  if (coll === 'att' && o.id === 'p_' + sess.person && (o.op === 'set' || o.op === 'update')) {
    if (Object.keys(data).some(function (k) { return k !== 'slots'; })) throw new Error('KEINE_BERECHTIGUNG');
    const have = (aktuell && aktuell.slots) || {}; const want = data.slots || {};
    Object.keys(want).forEach(function (k) { const v = want[k]; if (['A', 'F', 'O'].indexOf(v) < 0) throw new Error('KEINE_BERECHTIGUNG'); if (have[k] && have[k] !== 'O' && have[k] !== v) throw new Error('ANFRAGE_NOETIG'); });
    return;
  }
  throw new Error('KEINE_BERECHTIGUNG');
}

// ---------------------------------------------------------------------------
// Schreiben, Verlauf, Dateien
// ---------------------------------------------------------------------------

function schreiben_(sess, ops) {
  if (!Array.isArray(ops) || !ops.length) throw new Error('KEINE_AENDERUNG');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = datenBlatt_(); const werte = zeilen_(sh); const index = {};
    werte.forEach(function (r, i) { index[r[0] + '|' + r[1]] = i; });
    ops.forEach(function (o) {
      if (!/^[A-Za-z0-9_-]{1,40}(:[a-z]{2,10})?$/.test(String(o.coll))) throw new Error('UNGUELTIGE_SAMMLUNG');
      if (!/^[A-Za-z0-9_|-]{1,80}$/.test(String(o.id))) throw new Error('UNGUELTIGE_ID');
      const i = index[o.coll + '|' + o.id];
      pruefeSchreiben_(sess, o, i !== undefined && i >= 0 ? parse_(werte[i][2]) : null);
    });
    const loeschen = [], neu = [], jetzt = new Date(); const vorherDaten = {};
    ops.forEach(function (o) {
      const key = o.coll + '|' + o.id; const i = index[key];
      if (i !== undefined && i >= 0) vorherDaten[key] = parse_(werte[i][2]);
      if (o.op === 'delete') { if (i !== undefined && i >= 0) loeschen.push(i); return; }
      let doc;
      if (o.op === 'set') doc = o.data;
      else if (o.op === 'update') { if (i === undefined) throw new Error('EINTRAG_FEHLT'); doc = zusammenfuehren_(i >= 0 ? parse_(werte[i][2]) : neu[-i - 1][4], o.data || {}); }
      else throw new Error('UNGUELTIGE_AKTION');
      const json = JSON.stringify(doc); if (json.length > MAX_ZELLE) throw new Error('EINTRAG_ZU_GROSS');
      if (i !== undefined && i >= 0) { werte[i][2] = json; sh.getRange(i + 2, 3, 1, 2).setValues([[json, jetzt]]); }
      else if (i !== undefined) { neu[-i - 1][2] = json; neu[-i - 1][4] = doc; }
      else { neu.push([o.coll, String(o.id), json, jetzt, doc]); index[key] = -neu.length; }
    });
    if (neu.length) sh.getRange(sh.getLastRow() + 1, 1, neu.length, 4).setValues(neu.map(function (r) { return r.slice(0, 4); }));
    loeschen.sort(function (a, b) { return b - a; }).forEach(function (i) { sh.deleteRow(i + 2); });
    if (sess.role !== 'admin') verlauf_(sess, ops, vorherDaten);
    const vorher = aktuelleRev_(); const rev = erhoeheRev_();
    return { rev: rev, prevRev: vorher };
  } finally { lock.releaseLock(); }
}
function verlauf_(sess, ops, vorher) {
  const people = lagerDaten_(sess.lager).people; const wer = people[sess.person] ? anzeigeName_(people[sess.person]) : '';
  const items = [];
  ops.forEach(function (o) {
    const coll = String(o.coll).split(':')[1]; if (!coll || NO_LOG.indexOf(coll) >= 0) return;
    const d = o.data || vorher[o.coll + '|' + o.id] || {};
    items.push({ at: new Date().toISOString(), by: wer, coll: coll, op: o.op, id: o.id, label: String(d.title || d.name || d.topic || d.label || [d.vorname, d.nachname].filter(Boolean).join(' ') || '').slice(0, 80) });
  });
  if (!items.length) return;
  const sh = datenBlatt_(); const w = zeilen_(sh); const coll = sess.lager + ':log';
  const i = w.findIndex(function (r) { return r[0] === coll && String(r[1]) === 'main'; });
  const alt = i >= 0 ? ((parse_(w[i][2]) || {}).items || []) : [];
  let liste = items.reverse().concat(alt).slice(0, 250); let json = JSON.stringify({ items: liste });
  while (json.length > MAX_ZELLE && liste.length > 20) { liste = liste.slice(0, Math.floor(liste.length * 0.8)); json = JSON.stringify({ items: liste }); }
  if (i >= 0) sh.getRange(i + 2, 3, 1, 2).setValues([[json, new Date()]]); else sh.getRange(sh.getLastRow() + 1, 1, 1, 4).setValues([[coll, 'main', json, new Date()]]);
}
function hochladen_(sess, d) {
  if (sess.role !== 'lalei') throw new Error('KEINE_BERECHTIGUNG');
  const m = String(d.data || '').match(/^data:([^;]+);base64,(.*)$/); if (!m) throw new Error('UNGUELTIGE_DATEI');
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], String(d.name || 'datei').slice(0, 120));
  const f = ordner_('Lager-Tool Dateien').createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const bild = /^image\//.test(m[1]);
  return { id: f.getId(), url: bild ? 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w2000' : 'https://drive.google.com/file/d/' + f.getId() + '/view' };
}

// ---------------------------------------------------------------------------
// Erinnerungs-Mail (Sonntag): eigene Aufgaben, überfällig oder in den nächsten 14 Tagen fällig
// ---------------------------------------------------------------------------

function erinnerungen_() {
  const lager = lagerListe_(); const t0 = heute_(); const bis = Utilities.formatDate(new Date(Date.now() + 14 * 864e5), 'Europe/Zurich', 'yyyy-MM-dd');
  Object.keys(lager).forEach(function (id) {
    if (lager[id].closed) return; const d = lagerDaten_(id); const cfg = (d.config && d.config.main) || {};
    if (!cfg.mail || !cfg.mail.enabled) return;
    Object.keys(d.people).forEach(function (pid) {
      const p = d.people[pid]; if (!p.email) return; const name = anzeigeName_(p);
      const list = Object.keys(d.tasks).map(function (k) { return d.tasks[k]; }).filter(function (t) { return t.status !== 'Erledigt' && !t.ongoing && t.deadline && t.deadline <= bis && (t.owner === name || t.support === name); }).sort(function (a, b) { return a.deadline.localeCompare(b.deadline); });
      if (!list.length) return;
      const zeile = function (t) { return '• ' + t.deadline.split('-').reverse().join('.') + (t.deadline < t0 ? ' (überfällig)' : '') + ': ' + t.title + ' [' + t.ressort + ']'; };
      MailApp.sendEmail(p.email, lager[id].title + ': deine Aufgaben', 'Hallo ' + name + '\n\nDiese Aufgaben sind überfällig oder in den nächsten zwei Wochen fällig:\n\n' + list.map(zeile).join('\n') + '\n\nZum Tool: ' + WEBSITE + '\n\nLiebe Grüsse\nDie Lagerleitung');
    });
  });
}
