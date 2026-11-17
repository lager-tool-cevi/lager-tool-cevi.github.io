// Test-Attrappe der Google-Schnittstelle: ersetzt fetch() im Browser, damit die echte Website-Datei
// (docs/index.html) lokal getestet werden kann. window.__netzAus = true simuliert «kein Internet».
(function () {
  const seed = JSON.parse((() => { const x = new XMLHttpRequest(); x.open("GET", "/quelle/seed-vorschau.json", false); x.send(); return x.responseText; })());
  const rows = {}; for (const c of Object.keys(seed)) if (c !== "_secrets") for (const id of Object.keys(seed[c])) rows[c + "|" + id] = seed[c][id];
  let rev = 1; const tokens = {}; window.__apiLog = [];
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const merge = (t, p) => { const o = isObj(t) ? t : {}; for (const k of Object.keys(p)) o[k] = isObj(p[k]) && isObj(o[k]) ? merge(o[k], p[k]) : p[k]; return o; };
  function api(token, op, p) {
    window.__apiLog.push(op);
    if (op === "lagers") { const l = {}; for (const k of Object.keys(rows)) if (k.startsWith("lager|")) l[k.slice(6)] = rows[k]; return { lagers: l, url: "", wartung: null }; }
    if (op === "roster") return { people: Object.entries(rows).filter(([k]) => k.startsWith(p.lager + ":people|")).map(([k, v]) => ({ id: k.split("|")[1], name: v.ceviname || v.vorname, funktion: v.funktion || "", hasPw: false })) };
    if (op === "login") { const t = "t" + Math.random().toString(36).slice(2); tokens[t] = { lager: p.lager, role: p.role === "lalei" ? "lalei" : "team", person: p.person }; return { token: t, role: tokens[t].role }; }
    if (op === "report") return {};
    const s = tokens[token]; if (!s) throw new Error("NICHT_ANGEMELDET");
    if (op === "sync") {
      if (p.rev === rev) return { rev };
      const data = { lager: api(null, "lagers").lagers };
      for (const [k, v] of Object.entries(rows)) { const [coll, id] = k.split("|"); if (coll.startsWith(s.lager + ":")) { const c = coll.slice(s.lager.length + 1); (data[c] = data[c] || {})[id] = v; } }
      return { rev, data };
    }
    if (op === "write") { const prev = rev; for (const o of p.ops) { const k = o.coll + "|" + o.id; if (o.op === "delete") delete rows[k]; else if (o.op === "set") rows[k] = o.data; else rows[k] = merge(rows[k], o.data); } rev++; return { rev, prevRev: prev }; }
    throw new Error("UNBEKANNTE_AKTION");
  }
  window.__rows = rows;
  const echtFetch = window.fetch.bind(window);
  window.fetch = async function (url, opt) {
    if (String(url) !== window.LAGER_CONFIG.api) return echtFetch(url, opt);
    await new Promise((r) => setTimeout(r, 30));
    if (window.__netzAus) throw new TypeError("Failed to fetch");
    const d = JSON.parse(opt.body); let out;
    try { out = { ok: true, r: api(d.token, d.op, d.payload) }; } catch (e) { out = { ok: false, e: e.message }; }
    let json = JSON.stringify(out);
    if (json.length > 20000) { // wie Google: gross = gepackt
      const gz = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
      let bin = ""; new Uint8Array(gz).forEach((b) => (bin += String.fromCharCode(b))); json = JSON.stringify({ z: btoa(bin) }); window.__gepackt = (window.__gepackt || 0) + 1;
    }
    return new Response(json, { status: 200, headers: { "Content-Type": "application/json" } });
  };
})();
