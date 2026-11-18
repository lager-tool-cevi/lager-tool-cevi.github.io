// Datenanbindung. Bei Google (google.script.run vorhanden) läuft alles über api() in Code.gs,
// sonst (Vorschau) über einen nachgebauten Server im Browser mit denselben Regeln:
// Anmeldung als Team (nur Name) oder Lagerleitung (Name + Passwort), Admin mit Admin-Passwort.
window.LaleiStore = (() => {
  const SHORT = ["tasks", "config", "journal", "hoecks", "people", "kids", "att", "plan", "info", "eval", "assets", "trash", "rooms", "todos", "feedback", "attreq", "daypage", "presence", "media", "board", "swap", "trips", "groups", "count", "shop", "log", "versions", "react"];
  const TEAM_READ = ["config", "people", "kids", "plan", "rooms", "info", "att", "attreq", "todos", "feedback", "hoecks", "board", "swap", "trips", "groups", "count", "media", "react"];
  const NO_LOG = ["presence", "count", "todos", "feedback", "attreq", "swap", "log", "media", "versions", "react"];
  const TOKEN_DAYS = 60;
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const isGas = typeof google !== "undefined" && google.script && google.script.run;
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
  };
  const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const merge = (t, p) => { const o = isObj(t) ? t : {}; for (const k of Object.keys(p)) o[k] = isObj(p[k]) && isObj(o[k]) ? merge(o[k], p[k]) : p[k]; return o; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const errText = (e) => String((e && e.message) || e || "");
  const rnd = (n = 24) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => "abcdefghijkmnopqrstuvwxyz23456789"[b % 33]).join("");

  // ---------- Regeln (gleich wie in Code.gs) ----------
  // Sicherheitsverantwortliche: Leitung/Stv von Ressort Sicherheit und Teilbereich Sanität
  function securityIds(cfg, people) {
    const r = (cfg && cfg.ressorts && cfg.ressorts.si) || {}; const names = [r.lead, r.stv];
    for (const s of Object.values(r.subs || {})) names.push(s.lead, s.stv);
    return Object.entries(people || {}).filter(([, p]) => names.includes((p.ceviname || "").trim() || (p.vorname || "").trim())).map(([id]) => id);
  }
  // Was eine angemeldete Person aus einem Lager zu sehen bekommt
  function filterFor(sess, colls) {
    const out = {};
    for (const c of SHORT) {
      const src = colls[c] || {}; out[c] = {};
      if (c === "todos") { if (src[sess.person]) out.todos[sess.person] = src[sess.person]; continue; }
      // anonymes Feedback: die Lagerleitung sieht keinen Namen
      if (c === "feedback" && sess.role !== "team") { for (const [id, d] of Object.entries(src)) out.feedback[id] = d.anon ? { ...d, person: "", name: "Anonym" } : d; continue; }
      if (sess.role === "lalei" || sess.role === "lesen" || sess.role === "admin") { out[c] = src; continue; }
      if (!TEAM_READ.includes(c)) continue;
      if (c === "board") { const t = today(); for (const [id, b] of Object.entries(src)) if ((!b.from || b.from <= t) && (!b.until || b.until >= t) && (!b.to || !b.to.length || b.to.includes(sess.person))) out.board[id] = b; continue; }
      if (c === "info") { for (const [id, d] of Object.entries(src)) out.info[id] = { ...d, sections: (d.sections || []).filter((s) => !s.lalei) }; continue; }
      if (c === "swap") { for (const [id, d] of Object.entries(src)) if (d.person === sess.person) out.swap[id] = d; continue; }
      if (c === "count") { for (const [id, d] of Object.entries(src)) out.count[id] = { checked: d.checked || {}, resetAt: d.resetAt || "" }; continue; }
      if (c === "media") { for (const [id, d] of Object.entries(src)) if (d.team) out.media[id] = d; continue; }
      if (c === "att") { const k = "p_" + sess.person; if (src[k]) out.att[k] = src[k]; continue; }
      if (c === "hoecks") { for (const [id, h] of Object.entries(src)) if ((h.kind || "LaLei") === "Team") out.hoecks[id] = { kind: "Team", date: h.date || "", time: h.time || "", title: h.title || "", place: h.place || "" }; continue; }
      if (c === "attreq" || c === "feedback") { for (const [id, d] of Object.entries(src)) if (d.person === sess.person) out[c][id] = d; continue; }
      if (c === "people") { const sec = securityIds((colls.config || {}).main, src); for (const [id, p] of Object.entries(src)) out.people[id] = { ceviname: p.ceviname || "", vorname: p.vorname || "", nachname: p.nachname || "", stufe: p.stufe || "", funktion: p.funktion || "", order: p.order || 0, ...(sec.includes(id) ? { telefon: p.telefon || "" } : {}) }; continue; }
      if (c === "kids") { for (const [id, k] of Object.entries(src)) out.kids[id] = { vorname: k.vorname || "", nachname: k.nachname || "", stufe: k.stufe || "" }; continue; }
      if (c === "config") { const m = src.main ? clone(src.main) : null; if (m) { delete m.mail; delete m.prevTips; delete m.prevWissen; out.config.main = m; } continue; }
      out[c] = src;
    }
    return out;
  }
  // Prüft eine Schreib-Operation; wirft einen Fehler, wenn sie nicht erlaubt ist
  function checkWrite(sess, o, current) {
    if (sess.role === "admin") return;
    const [lager, coll] = String(o.coll).split(":");
    if (o.coll === "lager") { if (sess.role === "lalei" && o.op === "update" && o.id === sess.lager) return; throw new Error("KEINE_BERECHTIGUNG"); }
    if (lager !== sess.lager || !SHORT.includes(coll)) throw new Error("KEINE_BERECHTIGUNG");
    if (coll === "todos") { if (o.id === sess.person) return; throw new Error("KEINE_BERECHTIGUNG"); }
    if (sess.role === "lalei") return;
    if (sess.role === "lesen") throw new Error("NUR_LESEN");
    // Team
    if (["feedback", "attreq", "swap"].includes(coll) && o.op === "set" && !current && o.data && o.data.person === sess.person) return;
    if (coll === "react" && String(o.id).split("~")[1] === sess.person && (o.op === "delete" || (o.op === "set" && o.data && o.data.person === sess.person))) return;
    if (coll === "count" && o.id === "main" && o.op !== "delete" && Object.keys(o.data || {}).every((k) => ["checked", "at", "by", "resetAt", "resetBy"].includes(k))) return;
    if (coll === "att" && o.id === "p_" + sess.person && (o.op === "set" || o.op === "update")) {
      const have = (current && current.slots) || {}; const want = (o.data && o.data.slots) || {};
      if (Object.keys(o.data || {}).some((k) => k !== "slots")) throw new Error("KEINE_BERECHTIGUNG");
      for (const [k, v] of Object.entries(want)) { if (!["A", "F", "O"].includes(v)) throw new Error("KEINE_BERECHTIGUNG"); if (have[k] && have[k] !== "O" && have[k] !== v) throw new Error("ANFRAGE_NOETIG"); }
      return;
    }
    throw new Error("KEINE_BERECHTIGUNG");
  }

  // ---------- Vorschau-Server ----------
  function previewBackend() {
    const KEY = "lalei-vorschau-db", SKEY = "lalei-vorschau-geheim";
    let db = null, sec = null;
    try { db = JSON.parse(ls.get(KEY) || "null"); } catch {}
    try { sec = JSON.parse(ls.get(SKEY) || "null"); } catch {}
    const seed = window.PREVIEW_SEED || {};
    const s0 = seed._secrets || {};
    if (!db || !db.rows) { db = { rev: 1, rows: {} }; for (const c of Object.keys(seed)) if (c !== "_secrets") for (const id of Object.keys(seed[c])) db.rows[c + "|" + id] = seed[c][id]; }
    for (const [id, l] of Object.entries(seed.lager || {})) { const row = db.rows["lager|" + id]; if (row && !row.logo && l.logo) row.logo = l.logo; }
    if (!sec) sec = { admin: s0.adminHash || null, lagerPw: {}, personPw: {}, tokens: {} };
    if (!sec.admins) { sec.admins = sec.admin ? [{ id: "a1", name: "Admin", h: sec.admin }] : []; delete sec.admin; }
    if (!sec.global) sec.global = { wartung: null, fehler: [], nutzung: {} };
    if (!sec.global.toolfb) sec.global.toolfb = []; if (!sec.global.notify) sec.global.notify = []; if (!sec.global.vorlagen) sec.global.vorlagen = { tasks: [], pack: [] };
    for (const [k, v] of Object.entries(s0.lagerPw || {})) if (!(k in sec.lagerPw)) sec.lagerPw[k] = v;
    const save = () => { ls.set(KEY, JSON.stringify(db)); ls.set(SKEY, JSON.stringify(sec)); };
    const hash = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("lalei|" + s))), (b) => b.toString(16).padStart(2, "0")).join("");
    const adminOk = async (pw) => { const h = await hash(pw || ""); return sec.admins.find((a) => a.h === h) || null; };
    const lagerColls = (lager) => { const out = {}; for (const c of SHORT) out[c] = {}; for (const key of Object.keys(db.rows)) { const [coll, id] = key.split("|"); if (coll.startsWith(lager + ":")) { const s = coll.slice(lager.length + 1); if (out[s]) out[s][id] = db.rows[key]; } } return out; };
    const lagerList = () => Object.entries(db.rows).filter(([k]) => k.startsWith("lager|")).reduce((o, [k, v]) => ((o[k.slice(6)] = v), o), {});
    const roster = (lager) => Object.entries(lagerColls(lager).people).map(([id, p]) => ({ id, name: (p.ceviname || "").trim() || (p.vorname || "").trim() || "?", funktion: p.funktion || "", hasPw: !!sec.personPw[lager + "|" + id] }));
    // Anmeldungen laufen nach TOKEN_DAYS Tagen ab
    const session = (tok) => { const s = sec.tokens[tok]; if (!s) throw new Error("NICHT_ANGEMELDET"); if (Date.now() - (s.created || 0) > (s.ttl || TOKEN_DAYS) * 86400000) { delete sec.tokens[tok]; save(); throw new Error("NICHT_ANGEMELDET"); } return s; };
    const BKEY = "lalei-vorschau-sicherungen";
    const backups = () => { try { return JSON.parse(ls.get(BKEY) || "[]"); } catch { return []; } };
    const backupNow = () => { const rows = {}; for (const [k, v] of Object.entries(db.rows)) if (!k.includes(":media|")) rows[k] = v; const list = [{ id: "b" + Date.now(), at: new Date().toISOString(), rows }, ...backups()].slice(0, 5); try { ls.set(BKEY, JSON.stringify(list)); } catch { ls.set(BKEY, JSON.stringify(list.slice(0, 1))); } };
    const nameOf = (lager, person) => { const p = db.rows[lager + ":people|" + person]; return p ? (p.ceviname || "").trim() || (p.vorname || "").trim() || "?" : ""; };
    // Änderungsverlauf: kurze Einträge pro Schreibvorgang, nur die letzten 250
    function addLog(sess, ops) {
      const items = [];
      for (const o of ops) {
        const [lager, coll] = String(o.coll).split(":"); if (!coll || NO_LOG.includes(coll)) continue;
        const d = o.data || db.rows[o.coll + "|" + o.id] || {};
        items.push({ at: new Date().toISOString(), by: nameOf(lager, sess.person) || (sess.role === "admin" ? "Admin" : ""), coll, op: o.op, id: o.id, label: String(d.title || d.name || d.topic || d.label || [d.vorname, d.nachname].filter(Boolean).join(" ") || "").slice(0, 80) });
      }
      if (!items.length) return;
      const lager = String(ops[0].coll).split(":")[0]; const key = lager + ":log|main";
      const cur = (db.rows[key] && db.rows[key].items) || []; db.rows[key] = { items: [...items.reverse(), ...cur].slice(0, 250) };
    }
    const ok = (v) => new Promise((res) => setTimeout(() => res(v), 60));
    return async (op, payload = {}, tok) => {
      await new Promise((r) => setTimeout(r, 40));
      if (op === "lagers") return { lagers: lagerList(), wartung: sec.global.wartung };
      if (op === "report") { sec.global.fehler = [{ at: new Date().toISOString(), msg: String(payload.msg || "").slice(0, 500), wo: payload.wo || "", version: payload.version || "", geraet: payload.geraet || "" }, ...sec.global.fehler].slice(0, 100); save(); return {}; }
      if (op === "roster") return { people: roster(payload.lager) };
      if (op === "login") {
        const { lager, role, person, pw, lagerPw, newPw, remember } = payload;
        const p = lagerColls(lager).people[person]; if (!p) throw new Error("PERSON_FEHLT");
        let rolle = "team";
        if (role === "lalei") {
          if (p.funktion !== "LaLei" && p.funktion !== "Lesen") throw new Error("KEINE_LAGERLEITUNG");
          rolle = p.funktion === "Lesen" ? "lesen" : "lalei";
          const key = lager + "|" + person;
          if (sec.personPw[key]) { if (sec.personPw[key] !== (await hash(pw || ""))) throw new Error("FALSCHES_PASSWORT"); }
          else { if ((lagerPw || "") !== (sec.lagerPw[lager] || "")) throw new Error("FALSCHES_LAGERPASSWORT"); if (!newPw || newPw.length < 6) throw new Error("PASSWORT_ZU_KURZ"); sec.personPw[key] = await hash(newPw); }
        } else if (role !== "team") throw new Error("UNGUELTIGE_ROLLE");
        const token = rnd(); sec.tokens[token] = { lager, role: rolle, person, created: Date.now(), ttl: remember === false ? 0.5 : TOKEN_DAYS }; save(); return ok({ token, role: rolle });
      }
      if (op === "logout") { delete sec.tokens[tok]; save(); return {}; }
      if (op === "pwResetStart") { const per = ((lagerColls(payload.lager).people || {})[payload.person]); if (!per || !["LaLei", "Lesen"].includes(per.funktion)) throw new Error("PERSON_FEHLT"); if (!String(per.email || "").includes("@")) throw new Error("KEINE_EMAIL"); const code = String(100000 + Math.floor(Math.random() * 900000)); sec.pwReset = sec.pwReset || {}; sec.pwReset[payload.lager + "|" + payload.person] = { code, exp: Date.now() + 1800000 }; save(); return { an: per.email.replace(/^(.).*(@.*)$/, "$1…$2"), previewCode: code }; }
      if (op === "pwResetDone") { const k = payload.lager + "|" + payload.person; const r = (sec.pwReset || {})[k]; if (!r || Date.now() > r.exp) throw new Error("CODE_UNGUELTIG"); if (String(payload.code || "").trim() !== r.code) throw new Error("CODE_FALSCH"); if ((payload.newPw || "").length < 6) throw new Error("PASSWORT_ZU_KURZ"); sec.personPw[k] = await hash(payload.newPw); delete sec.pwReset[k]; save(); return {}; }
      if (op === "forgotAdmin") { const nm = String(payload.name || "").trim().toLowerCase(); const a = sec.admins.find((x) => x.name.toLowerCase() === nm) || (sec.admins.length === 1 ? sec.admins[0] : null); if (!a) throw new Error("ADMIN_UNBEKANNT"); const npw = "Cevi-" + rnd(6); a.h = await hash(npw); save(); return { previewPw: npw, name: a.name }; }
      if (op === "admin") {
        const ich = await adminOk(payload.adminPw); if (!ich) throw new Error("FALSCHES_ADMIN_PASSWORT");
        const a = payload.action;
        if (a === "overview") { const groesse = {}; for (const [k, v] of Object.entries(db.rows)) { const lid = k.split(/[:|]/)[0]; groesse[lid] = (groesse[lid] || 0) + JSON.stringify(v).length; }
          return { ich: ich.name, admins: sec.admins.map((x) => ({ id: x.id, name: x.name })), wartung: sec.global.wartung, nutzung: sec.global.nutzung, fehler: sec.global.fehler, zeilen: Object.keys(db.rows).length, lagers: Object.entries(lagerList()).map(([id, l]) => ({ id, title: l.title, hasLagerPw: !!sec.lagerPw[id], groesse: groesse[id] || 0, people: roster(id).filter((x) => x.funktion === "LaLei" || x.funktion === "Lesen") })) }; }
        if (a === "addAdmin") { const nm = String(payload.name || "").trim(); if (!nm) throw new Error("NAME_FEHLT"); if ((payload.newPw || "").length < 6) throw new Error("PASSWORT_ZU_KURZ"); if (sec.admins.some((x) => x.name.toLowerCase() === nm.toLowerCase())) throw new Error("NAME_VERGEBEN"); sec.admins.push({ id: "a" + rnd(5), name: nm, h: await hash(payload.newPw) }); save(); return {}; }
        if (a === "removeAdmin") { if (sec.admins.length < 2) throw new Error("LETZTER_ADMIN"); sec.admins = sec.admins.filter((x) => x.id !== payload.id); save(); return {}; }
        if (a === "setWartung") { sec.global.wartung = { text: String(payload.text || "").slice(0, 300), on: !!payload.on }; db.rev++; save(); return {}; }
        if (a === "clearFehler") { sec.global.fehler = []; save(); return {}; }
        if (a === "toolFeedback") return { items: sec.global.toolfb, notify: sec.global.notify };
        if (a === "toolFeedbackRead") { sec.global.toolfb.forEach((x) => { if (!payload.id || x.id === payload.id) x.read = true; }); if (payload.remove) sec.global.toolfb = sec.global.toolfb.filter((x) => x.id !== payload.remove); db.rev++; save(); return {}; }
        if (a === "setNotify") { sec.global.notify = (payload.personen || []).map((x) => ({ lager: x.lager, person: x.person })); db.rev++; save(); return {}; }
        if (a === "getVorlagen") return clone(sec.global.vorlagen);
        if (a === "setVorlagen") { sec.global.vorlagen = { tasks: (payload.vorlagen.tasks || []).slice(0, 30), pack: (payload.vorlagen.pack || []).slice(0, 30) }; save(); return {}; }
        if (a === "setLagerPw") { if ((payload.pw || "").length < 6) throw new Error("PASSWORT_ZU_KURZ"); sec.lagerPw[payload.lager] = payload.pw; save(); return {}; }
        if (a === "resetPerson") { delete sec.personPw[payload.lager + "|" + payload.person]; for (const [t, s] of Object.entries(sec.tokens)) if (s.lager === payload.lager && s.person === payload.person) delete sec.tokens[t]; save(); return {}; }
        if (a === "logoutAll") { sec.tokens = {}; save(); return {}; }
        if (a === "setAdminPw") { if ((payload.newPw || "").length < 6) throw new Error("PASSWORT_ZU_KURZ"); ich.h = await hash(payload.newPw); save(); return {}; }
        if (a === "token") { const token = rnd(); sec.tokens[token] = { lager: "*", role: "admin", person: "", created: Date.now() }; save(); return { token }; }
        if (a === "backupNow") { backupNow(); return {}; }
        if (a === "backups") return { backups: backups().map((b) => ({ id: b.id, at: b.at, name: "Sicherung vom " + new Date(b.at).toLocaleString("de-CH") })) };
        if (a === "restore") {
          const b = backups().find((x) => x.id === payload.backup); if (!b) throw new Error("SICHERUNG_FEHLT");
          const pre = payload.lager + ":"; const nur = (payload.colls || []).length ? payload.colls : null;
          const inArea = (k) => k.startsWith(pre) && (!nur || nur.includes(k.slice(pre.length).split("|")[0]));
          const count = (rows) => { const c = {}; for (const k of Object.keys(rows)) if (k.startsWith(pre)) { const s = k.slice(pre.length).split("|")[0]; c[s] = (c[s] || 0) + 1; } return c; };
          if (payload.dryRun) return { now: count(db.rows), then: count(b.rows) };
          for (const k of Object.keys(db.rows)) if (inArea(k) && !k.includes(":media|")) delete db.rows[k];
          for (const [k, v] of Object.entries(b.rows)) if (inArea(k)) db.rows[k] = v;
          if (!nur && b.rows["lager|" + payload.lager]) db.rows["lager|" + payload.lager] = b.rows["lager|" + payload.lager];
          db.rev++; save(); return {};
        }
        if (a === "deleteLager") { for (const k of Object.keys(db.rows)) if (k.startsWith(payload.lager + ":")) delete db.rows[k]; delete db.rows["lager|" + payload.lager]; delete sec.lagerPw[payload.lager]; db.rev++; save(); return {}; }
        throw new Error("UNBEKANNTE_AKTION");
      }
      const sess = session(tok);
      if (op === "vorlagen") { if (sess.role !== "lalei" && sess.role !== "lesen") throw new Error("KEINE_BERECHTIGUNG"); return clone(sec.global.vorlagen); }
      if (op === "toolFeedback") { const txt = String(payload.text || "").trim(); if (!txt) throw new Error("TEXT_FEHLT"); sec.global.toolfb = [{ id: rnd(8), at: new Date().toISOString(), lager: sess.lager, name: payload.anon ? "Anonym" : nameOf(sess.lager, sess.person), role: sess.role, art: payload.art || "Idee", text: txt.slice(0, 2000), read: false }, ...sec.global.toolfb].slice(0, 200); db.rev++; save(); return {}; }
      if (op === "changePw") { if (sess.role !== "lalei" && sess.role !== "lesen") throw new Error("KEINE_BERECHTIGUNG"); const key = sess.lager + "|" + sess.person; if (sec.personPw[key] !== (await hash(payload.oldPw || ""))) throw new Error("FALSCHES_PASSWORT"); if ((payload.newPw || "").length < 6) throw new Error("PASSWORT_ZU_KURZ"); sec.personPw[key] = await hash(payload.newPw); save(); return {}; }
      if (op === "sync" && sess.role !== "admin") { const k = sess.lager + "|" + sess.person; const prevN = sec.global.nutzung[k]; if (!prevN || Date.now() - new Date(prevN.at).getTime() > 600000) { sec.global.nutzung[k] = { lager: sess.lager, name: nameOf(sess.lager, sess.person), role: sess.role, at: new Date().toISOString() }; save(); } }
      if (op === "sync") {
        const lager = sess.role === "admin" ? payload.lager : sess.lager;
        if (payload.rev === db.rev && !payload.full) return { rev: db.rev };
        const data = { lager: lagerList() };
        if (lager) Object.assign(data, filterFor({ ...sess, lager }, lagerColls(lager)));
        if (sec.global.notify.some((x) => x.lager === sess.lager && x.person === sess.person)) { const nfb = sec.global.toolfb.filter((x) => !x.read).length; if (nfb) data.toolFb = nfb; }
        return { rev: db.rev, data };
      }
      if (op === "write") {
        const prev = db.rev;
        for (const o of payload.ops) checkWrite(sess, o, db.rows[o.coll + "|" + o.id]);
        for (const o of payload.ops) {
          const key = o.coll + "|" + o.id;
          if (o.op === "delete") delete db.rows[key];
          else if (o.op === "set") db.rows[key] = clone(o.data);
          else if (o.op === "update") { if (!db.rows[key]) throw new Error("EINTRAG_FEHLT"); db.rows[key] = merge(db.rows[key], clone(o.data)); }
        }
        if (sess.role !== "admin") addLog(sess, payload.ops);
        // Vorschau: wöchentliche Sicherung beim ersten Schreiben der Woche
        try { if (!backups().length || Date.now() - new Date(backups()[0].at).getTime() > 7 * 86400000) backupNow(); } catch {}
        db.rev++; save(); return { rev: db.rev, prevRev: prev };
      }
      if (op === "upload") {
        if (sess.role !== "lalei") throw new Error("KEINE_BERECHTIGUNG");
        // Vorschau: Bild bleibt im Browser; die Seite verweist mit «media:<id>» darauf
        const id = "m" + rnd(10); db.rows[sess.lager + ":media|" + id] = { name: payload.name, url: payload.data, team: true, createdAt: new Date().toISOString() }; db.rev++;
        try { save(); } catch { delete db.rows[sess.lager + ":media|" + id]; throw new Error("SPEICHER_VOLL"); }
        return { id, url: "media:" + id };
      }
      throw new Error("UNBEKANNTE_AKTION");
    };
  }

  // ---------- gemeinsamer Teil ----------
  // Website auf GitHub: Daten über die Google-Schnittstelle (LAGER_CONFIG.api); sonst Vorschau im Browser
  const CONF = window.LAGER_CONFIG || {};
  const isApi = !!CONF.api;
  const netzFehler = (msg) => Object.assign(new Error(msg || "NETZ"), { netz: true });
  async function entpacken(b64) {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  }
  async function apiCall(op, payload, tok) {
    let res;
    try { res = await fetch(CONF.api, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ token: tok || null, op, payload: payload || {} }), redirect: "follow" }); }
    catch { throw netzFehler(); }
    if (!res.ok) throw netzFehler("NETZ " + res.status);
    let j; try { j = await res.json(); if (j.z) j = JSON.parse(await entpacken(j.z)); } catch { throw new Error("SERVER_ANTWORT_UNGUELTIG"); }
    if (!j.ok) throw new Error(j.e || "FEHLER");
    return j.r;
  }
  const raw = isApi ? apiCall
    : isGas ? (op, payload, tok) => new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej).api(tok || null, op, payload || null))
    : previewBackend();
  const echt = isApi || isGas;
  const POLL_MS = isApi ? 8000 : isGas ? 12000 : 4000;
  let lagerId = null, sess = null, rev = -1, pending = 0, timer = null, queue = Promise.resolve(), lastSyncMs = 0;
  const empty = () => Object.fromEntries(["lager", ...SHORT].map((c) => [c, new Map()]));
  let data = empty();
  const listeners = new Set();
  const full = (c) => (c === "lager" ? "lager" : lagerId + ":" + c);
  const syncState = (t) => { const el = document.getElementById("sync-state"); if (el) el.textContent = t; };
  const stamp = () => { const d = new Date(); syncState(outbox.length ? `Ohne Netz · ${outbox.length} ${outbox.length === 1 ? "Änderung wartet" : "Änderungen warten"}` : `Aktuell · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`); };
  const sessKey = (id) => "lalei-sitzung-" + id;
  // «angemeldet bleiben»: im Browser speichern, sonst nur bis das Fenster zu ist
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} } };
  const call = (op, payload) => raw(op, payload, sess && sess.token);
  let onLoggedOut = () => {};

  const docSnap = (coll, id) => { const v = data[coll] && data[coll].get(id); return { id, exists: !!v, data: () => v, metadata: { fromCache: false, hasPendingWrites: pending > 0 } }; };
  const collSnap = (coll) => { const docs = [...data[coll].keys()].sort().map((id) => docSnap(coll, id)); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} }; };
  function emit(colls) { for (const l of listeners) if (colls.has(l.coll)) { try { l.cb(l.id ? docSnap(l.coll, l.id) : collSnap(l.coll)); } catch (e) { console.error(e); } } }
  // letzter Stand pro Lager im Browser, damit man ohne Netz lesen und weiterarbeiten kann
  let offline = false, toolFb = 0;
  const cacheKey = () => "lalei-cache-" + lagerId + "-" + (sess ? sess.person : "");
  function saveCache(res) { if (!lagerId || !sess) return; try { const d = { ...res.data, media: {} }; ls.set(cacheKey(), JSON.stringify({ at: new Date().toISOString(), data: d })); } catch {} }
  function applyServer(res) {
    if (!res) return;
    if (res.data) {
      if (!res.cached) { saveCache(res); offline = false; }
      data.lager = new Map(Object.entries(res.data.lager || {})); toolFb = res.data.toolFb || 0;
      for (const c of SHORT) data[c] = new Map(Object.entries(res.data[c] || {}));
      rev = res.rev; emit(new Set(["lager", ...SHORT]));
    } else rev = res.rev;
  }
  function lost(e) { if (/NICHT_ANGEMELDET/.test(errText(e)) && lagerId) { ls.set(sessKey(lagerId), null); ss.set(sessKey(lagerId), null); sess = null; onLoggedOut(lagerId); return true; } return false; }

  // ---------- Warteschlange: Änderungen ohne Netz werden später nachgeschickt ----------
  let outbox = [], flushing = false, onRejected = () => {};
  const qKey = () => "lager-warteschlange-" + lagerId + "-" + (sess ? sess.person : "");
  function loadOutbox() { try { outbox = JSON.parse(ls.get(qKey()) || "[]") || []; } catch { outbox = []; } }
  function saveOutbox() { ls.set(qKey(), outbox.length ? JSON.stringify(outbox) : null); }
  async function flushOutbox() {
    if (!outbox.length || flushing || !sess) return;
    flushing = true;
    try {
      while (outbox.length) {
        try { await call("write", { ops: outbox[0] }); }
        catch (e) { if (e.netz) throw e; lost(e); onRejected(e); } // vom Server abgelehnt: verwerfen und melden
        outbox.shift(); saveOutbox();
      }
      offline = false; flushing = false; await sync(true); return;
    } catch { syncState(`Ohne Netz · ${outbox.length} ${outbox.length === 1 ? "Änderung wartet" : "Änderungen warten"}`); }
    flushing = false;
  }
  window.addEventListener("online", () => { flushOutbox(); sync(false); });

  async function sync(force) {
    if (pending > 0) return;
    if (outbox.length) { await flushOutbox(); if (outbox.length) return; }
    const forLager = lagerId; const t0 = performance.now();
    try {
      if (!sess) { const r = await raw("lagers", {}); if (r.wartung !== undefined) wartung = r.wartung; if (!lagerId) { data.lager = new Map(Object.entries(r.lagers || {})); emit(new Set(["lager"])); } stamp(); return; }
      const res = await call("sync", { rev: force ? -1 : rev, lager: lagerId }); lastSyncMs = Math.round(performance.now() - t0);
      if (pending === 0 && forLager === lagerId && !outbox.length) { if (offline && !res.data) { offline = false; return sync(true); } applyServer(res); } offline = false; stamp();
    } catch (e) { if (!lost(e)) { offline = offline || !!e.netz; syncState(e.netz ? "Ohne Netz · versuche erneut …" : "Verbindungsproblem · versuche erneut …"); } }
  }
  function startPolling() {
    clearInterval(timer);
    timer = setInterval(() => { if (document.visibilityState === "visible") sync(false); }, POLL_MS);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(false); });
  }
  const MSG = { KEINE_BERECHTIGUNG: "Dafür fehlt dir die Berechtigung.", NUR_LESEN: "Du hast nur Lesezugriff.", ANFRAGE_NOETIG: "Bereits eingetragene Anwesenheit kann nur die Lagerleitung ändern. Stelle eine Anfrage.", EINTRAG_ZU_GROSS: "Der Eintrag ist zu lang. Bitte kürzen oder aufteilen." };
  function send(ops, localApply) {
    const changed = localApply ? localApply() : new Set();
    if (changed.size) emit(changed);
    // ohne Netz oder mit wartenden Änderungen: hinten anstellen, wird nachgeschickt
    if (outbox.length) { outbox.push(ops); saveOutbox(); stamp(); return Promise.resolve(); }
    pending++; syncState("Speichert …");
    const p = queue.then(() => call("write", { ops }));
    queue = p.catch(() => {});
    return p.then((res) => {
      pending--;
      if (res && res.prevRev === rev) { rev = res.rev; if (pending === 0) stamp(); }
      else if (pending === 0) sync(true);
    }, (e) => {
      pending--;
      if (e.netz && echt) { outbox.push(ops); saveOutbox(); offline = true; stamp(); return; }
      lost(e);
      if (pending === 0) sync(true);
      const key = Object.keys(MSG).find((k) => errText(e).includes(k));
      throw Object.assign(new Error(key ? MSG[key] : "Speichern fehlgeschlagen. Bitte Internetverbindung prüfen."), { code: key === "ANFRAGE_NOETIG" ? "request" : "unavailable" });
    });
  }
  function write(ops) {
    for (const o of ops) if (o.op === "update" && !data[o.coll].has(o.id)) return Promise.reject(new Error("Eintrag nicht gefunden"));
    return send(ops.map((o) => ({ ...o, coll: full(o.coll) })), () => {
      const changed = new Set();
      for (const o of ops) {
        const m = data[o.coll];
        if (o.op === "delete") m.delete(o.id);
        else if (o.op === "set") m.set(o.id, clone(o.data));
        else if (o.op === "update") m.set(o.id, merge(clone(m.get(o.id)), clone(o.data)));
        changed.add(o.coll);
      }
      return changed;
    });
  }
  const newId = () => "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const db = {
    doc(path) {
      const [coll, id] = path.split("/");
      return {
        id, path,
        get: async () => docSnap(coll, id),
        onSnapshot(cb) { const l = { coll, id, cb }; listeners.add(l); if (rev >= 0) setTimeout(() => cb(docSnap(coll, id))); return () => listeners.delete(l); },
        set: (d) => write([{ op: "set", coll, id, data: d }]),
        update: (d) => write([{ op: "update", coll, id, data: d }]),
        delete: () => write([{ op: "delete", coll, id }]),
      };
    },
    collection(coll) {
      return {
        path: coll,
        onSnapshot(cb) { const l = { coll, cb }; listeners.add(l); if (rev >= 0) setTimeout(() => cb(collSnap(coll))); return () => listeners.delete(l); },
        doc: (id) => db.doc(coll + "/" + (id || newId())),
        async add(d) { const id = newId(); await write([{ op: "set", coll, id, data: d }]); return db.doc(coll + "/" + id); },
      };
    },
    batch: (ops) => write(ops),
    newId,
  };

  // ---------- Anmeldung ----------
  const savedSession = (id) => { try { return JSON.parse(ls.get(sessKey(id)) || ss.get(sessKey(id)) || "null"); } catch { return null; } };
  async function setLager(id) {
    lagerId = id; rev = -1;
    for (const c of SHORT) data[c] = new Map();
    sess = id ? savedSession(id) : null;
    if (!id) { outbox = []; await sync(true); return true; }
    if (!sess) return false;
    loadOutbox();
    try {
      if (outbox.length) await flushOutbox();
      const res = await call("sync", { rev: -1, lager: id }); if (lagerId === id && !outbox.length) applyServer(res); stamp(); return true;
    } catch (e) {
      if (/NICHT_ANGEMELDET/.test(errText(e))) { ls.set(sessKey(id), null); ss.set(sessKey(id), null); sess = null; return false; }
      let c = null; try { c = JSON.parse(ls.get(cacheKey()) || "null"); } catch {}
      if (c && c.data) { offline = true; rev = 0; applyServer({ rev: 0, data: c.data, cached: true }); syncState("Ohne Netz · Stand " + new Date(c.at).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" })); return true; }
      throw e;
    }
  }
  async function login(lager, role, person, name, extra = {}) {
    const res = await raw("login", { lager, role, person, ...extra });
    const s = { token: res.token, role: res.role || role, person, name, lager };
    if (extra.remember === false) { ss.set(sessKey(lager), JSON.stringify(s)); ls.set(sessKey(lager), null); } else { ls.set(sessKey(lager), JSON.stringify(s)); ss.set(sessKey(lager), null); }
    sess = s; return s;
  }
  async function logout() { if (sess) { try { await call("logout", {}); } catch {} ls.set(sessKey(sess.lager), null); ss.set(sessKey(sess.lager), null); } sess = null; }
  const roster = (lager) => raw("roster", { lager }).then((r) => r.people);
  const admin = (adminPw, action, extra = {}) => raw("admin", { adminPw, action, ...extra });
  const forgotAdmin = (name) => raw("forgotAdmin", { name });
  const pwResetStart = (lager, person) => raw("pwResetStart", { lager, person });
  const pwResetDone = (lager, person, code, newPw) => raw("pwResetDone", { lager, person, code, newPw });
  const changePw = (oldPw, newPw) => call("changePw", { oldPw, newPw });
  const vorlagen = () => call("vorlagen", {});
  const toolFeedback = (d) => call("toolFeedback", d);
  // Admin-Zugang für Vorlagen und neue Lager
  async function adminCall(adminPw, fn) { const { token } = await admin(adminPw, "token"); return fn((op, p) => raw(op, p, token)); }
  async function readLager(adminPw, id) { return adminCall(adminPw, (c) => c("sync", { rev: -1, lager: id, full: true }).then((r) => r.data)); }
  async function writeRaw(adminPw, ops) { await adminCall(adminPw, (c) => c("write", { ops })); await sync(true); }
  const upload = (name, dataUrl) => { if (offline) return Promise.reject(new Error("Ohne Netz können keine Dateien hochgeladen werden.")); return call("upload", { name, mime: (dataUrl.match(/^data:([^;]+)/) || [])[1] || "", data: dataUrl }); };
  // Fehler an den Admin melden (höchstens 5 pro Sitzung, nur in der echten Version)
  let gemeldet = 0;
  function report(msg, wo) { if (!echt || gemeldet >= 5) return; gemeldet++; raw("report", { msg: String(msg).slice(0, 500), wo: wo || "", version: CONF.version || "", geraet: navigator.userAgent.slice(0, 120) }).catch(() => {}); }

  let appUrl = "", wartung = null;
  function ready() {
    const bar = document.getElementById("preview-bar");
    if (!echt) {
      bar.hidden = false;
      document.getElementById("preview-reset").onclick = () => { ls.set("lalei-vorschau-db", null); ls.set("lalei-vorschau-geheim", null); location.reload(); };
    } else if (CONF.test) {
      bar.hidden = false; bar.classList.add("test-bar");
      bar.innerHTML = "<span><b>Testversion</b> · Hier kommen Neuerungen zuerst hin. Es sind die echten Daten: Änderungen gelten für alle.</span>";
    }
    return raw("lagers", {}).then((r) => {
      data.lager = new Map(Object.entries(r.lagers || {})); wartung = r.wartung || null;
      appUrl = r.url || (isApi ? location.origin + location.pathname.replace(/test\/?(index\.html)?$/, "").replace(/index\.html$/, "") : "");
      rev = 0; stamp(); startPolling(); return db;
    });
  }
  const peek = (coll, id) => { const v = data[coll] && data[coll].get(id); return v ? clone(v) : null; };
  return {
    syncNow: () => sync(true), pwResetStart, pwResetDone, ready, setLager, login, logout, roster, admin, forgotAdmin, changePw, vorlagen, toolFeedback, toolFb: () => toolFb, readLager, writeRaw, upload, peek, report,
    isGas: echt, isApi, isTest: !!CONF.test, version: CONF.version || "", isOffline: () => offline, appUrl: () => appUrl, wartung: () => wartung, lastSyncMs: () => lastSyncMs, wartend: () => outbox.length,
    onRejected: (fn) => (onRejected = fn),
    session: () => sess, lager: () => lagerId, onLoggedOut: (fn) => (onLoggedOut = fn),
    lagerList: () => [...data.lager.entries()].map(([id, v]) => ({ ...v, _id: id })),
  };
})();