// Prüft Code.gs im Browser mit nachgebauten Google-Diensten. Aufruf: await gasTest()
window.gasTest = async function () {
  // kleines synchrones SHA-256 (für Utilities.computeDigest)
  function sha256(str) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const b = Array.from(new TextEncoder().encode(str)); const l = b.length * 8; b.push(0x80); while (b.length % 64 !== 56) b.push(0);
    for (let i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let i = 0; i < b.length; i += 64) {
      const w = []; for (let t = 0; t < 16; t++) w[t] = (b[i + 4 * t] << 24) | (b[i + 4 * t + 1] << 16) | (b[i + 4 * t + 2] << 8) | b[i + 4 * t + 3];
      for (let t = 16; t < 64; t++) { const s0 = r(w[t - 15], 7) ^ r(w[t - 15], 18) ^ (w[t - 15] >>> 3), s1 = r(w[t - 2], 17) ^ r(w[t - 2], 19) ^ (w[t - 2] >>> 10); w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0; }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) { const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[t] + w[t]) | 0, S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0; }
      H = H.map((x, k) => (x + [a, bb, c, d, e, f, g, h][k]) | 0);
    }
    const out = []; H.forEach((x) => { for (let k = 3; k >= 0; k--) { const v = (x >>> (k * 8)) & 255; out.push(v > 127 ? v - 256 : v); } }); return out;
  }
  const props = {}; const cache = {}; const mails = [];
  const seed = JSON.parse(await (await fetch("/quelle/seed-vorschau.json")).text());
  // Tabelle wie in der alten Version: Lagerpasswort im Klartext, ein Admin mit Salz-Hash
  const rows = [["Sammlung", "ID", "Daten", "Geändert"]];
  for (const c of Object.keys(seed)) if (c !== "_secrets") for (const id of Object.keys(seed[c])) rows.push([c, id, JSON.stringify(seed[c][id]), new Date()]);
  const sheet = {
    getLastRow: () => rows.length,
    getRange(r, c, nr = 1, nc = 1) { return { getValues: () => rows.slice(r - 1, r - 1 + nr).map((x) => x.slice(c - 1, c - 1 + nc)), setValues: (v) => v.forEach((row, i) => { rows[r - 1 + i] = rows[r - 1 + i] || []; row.forEach((x, j) => (rows[r - 1 + i][c - 1 + j] = x)); }), setValue: (x) => { rows[r - 1][c - 1] = x; }, setFontWeight() { return this; }, setNumberFormat() { return this; } }; },
    deleteRow: (i) => rows.splice(i - 1, 1), setFrozenRows() {},
  };
  const ss = { getId: () => "SHEET", getSheetByName: () => sheet, insertSheet: () => sheet };
  const G = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => ({ ...props }) }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { openById: () => ss, getActiveSpreadsheet: () => ss },
    MailApp: { sendEmail: (to, subj, body) => mails.push({ to, subj, body }) },
    Utilities: { DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 }, computeDigest: (_a, s) => sha256(s), getUuid: () => crypto.randomUUID(), sleep() {}, formatDate: (d) => d.toISOString().slice(0, 10) },
    Logger: { log() {} }, ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ onWeekDay: () => ({ atHour: () => ({ create() {} }) }) }) }), WeekDay: {} },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => ({}) }) },
  };
  const code = await (await fetch("/google-version/Code.gs")).text();
  const names = Object.keys(G);
  const lib = new Function(...names, code + "\nreturn { api, einrichten, hash_, migrieren_ };")(...names.map((n) => G[n]));
  const res = []; const check = (name, cond) => res.push((cond ? "✓ " : "✗ ") + name);
  const fail = (fn) => { try { fn(); return ""; } catch (e) { return e.message; } };
  // 1. Zustand der alten Version: Salz, Admin-Hash, Lagerpasswort im Klartext
  props.SALZ = "salz123"; props.SHEET_ID = "SHEET"; props.ADMIN_HASH = lib.hash_("LaLei-Cevi"); props.LAGERPW_pfila27 = "PfiLa2027"; props.REV = "5";
  props["PW_pfila27|p4"] = lib.hash_("knigge123");
  lib.migrieren_();
  check("Lagerpasswort nach Umstellung verschlüsselt", props.LAGERPW_pfila27 !== "PfiLa2027" && /^[0-9a-f]{64}$/.test(props.LAGERPW_pfila27));
  check("Admin in Admin-Liste übernommen", JSON.parse(props.ADMINS).length === 1 && !props.ADMIN_HASH);
  // 2. Anmeldungen
  const lalei = lib.api(null, "login", { lager: "pfila27", role: "lalei", person: "p4", pw: "knigge123" });
  check("Lagerleitung mit eigenem Passwort", !!lalei.token && lalei.role === "lalei");
  check("falsches Passwort abgelehnt", fail(() => lib.api(null, "login", { lager: "pfila27", role: "lalei", person: "p4", pw: "x" })) === "FALSCHES_PASSWORT");
  const erst = lib.api(null, "login", { lager: "pfila27", role: "lalei", person: "p1", lagerPw: "PfiLa2027", newPw: "liska123" });
  check("Erstanmeldung mit (umgestelltem) Lagerpasswort", !!erst.token);
  check("Passwort ändern", !fail(() => lib.api(erst.token, "changePw", { oldPw: "liska123", newPw: "liska456" })) && !!lib.api(null, "login", { lager: "pfila27", role: "lalei", person: "p1", pw: "liska456" }).token);
  const kurz = lib.api(null, "login", { lager: "pfila27", role: "team", person: "p2", remember: false });
  check("«Nicht angemeldet bleiben» = 12 Stunden", JSON.parse(props["TOK_" + kurz.token]).ttl === 0.5);
  const sync = lib.api(lalei.token, "sync", { rev: -1 });
  check("Daten laden (sync)", sync.data && Object.keys(sync.data.tasks || {}).length > 50);
  // 3. Nur lesen
  const people = JSON.parse(rows.find((r) => r[0] === "pfila27:people" && r[1] === "p2")[2]); people.funktion = "Lesen"; rows.find((r) => r[0] === "pfila27:people" && r[1] === "p2")[2] = JSON.stringify(people);
  const les = lib.api(null, "login", { lager: "pfila27", role: "lalei", person: "p2", lagerPw: "PfiLa2027", newPw: "paxpax1" });
  check("Nur-lesen-Anmeldung", les.role === "lesen");
  check("Nur lesen darf nichts ändern", fail(() => lib.api(les.token, "write", { ops: [{ op: "update", coll: "pfila27:tasks", id: Object.keys(sync.data.tasks)[0], data: { status: "Erledigt" } }] })) === "NUR_LESEN");
  check("Nur lesen sieht alles", Object.keys(lib.api(les.token, "sync", { rev: -1 }).data.tasks).length === Object.keys(sync.data.tasks).length);
  // 4. Admin
  check("Admin mit altem Passwort", !!lib.api(null, "admin", { adminPw: "LaLei-Cevi", action: "overview" }).ich);
  lib.api(null, "admin", { adminPw: "LaLei-Cevi", action: "addAdmin", name: "Knigge", newPw: "knigge-admin" });
  const ov = lib.api(null, "admin", { adminPw: "knigge-admin", action: "overview" });
  check("Zweiter Admin mit eigenem Passwort", ov.ich === "Knigge" && ov.admins.length === 2);
  check("Lagerpasswort wird nicht angezeigt", ov.lagers[0].hasLagerPw === true && !("lagerPw" in ov.lagers[0]));
  lib.api(null, "admin", { adminPw: "knigge-admin", action: "setWartung", text: "Update", on: true });
  check("Wartungshinweis", lib.api(null, "lagers", {}).wartung.text === "Update");
  lib.api(null, "report", { msg: "Testfehler", wo: "tasks" });
  check("Fehlerbericht", lib.api(null, "admin", { adminPw: "knigge-admin", action: "overview" }).fehler[0].msg === "Testfehler");
  check("Nutzung erfasst", Object.keys(lib.api(null, "admin", { adminPw: "knigge-admin", action: "overview" }).nutzung).length >= 1);
  lib.api(null, "forgotAdmin", { name: "Knigge" });
  check("Passwort vergessen: Mail an lagerleitung@", mails.length === 1 && mails[0].to === "lagerleitung@cevi-staefa-hombi.ch");
  check("altes Passwort danach ungültig", fail(() => lib.api(null, "admin", { adminPw: "knigge-admin", action: "overview" })) === "FALSCHES_ADMIN_PASSWORT");
  // 5. Ganz neues Projekt: Start-Passwörter aus dem Code
  for (const k of Object.keys(props)) delete props[k];
  props.SHEET_ID = "SHEET"; lib.einrichten();
  check("Neu: Admin-Start-Passwort", !!lib.api(null, "admin", { adminPw: "LaLei-Cevi", action: "overview" }).ich);
  check("Neu: Lager-Start-Passwort", !!lib.api(null, "login", { lager: "pfila27", role: "lalei", person: "p3", lagerPw: "PfiLa2027", newPw: "fargo123" }).token);
  return res;
};
