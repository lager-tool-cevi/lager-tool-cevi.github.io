  // =====================================================================
  // Ausbau 1: Hilfen, Anzeige, «Als Team ansehen», Pinnwand, Mein Bereich, Packliste
  // =====================================================================

  // ---------- kleine Hilfen ----------
  // Menü «Mehr ▾» für selten gebrauchte Knöpfe; items: [[attribute, beschriftung] …]
  function menu(items, label = "Mehr") {
    const list = items.filter(Boolean); if (!list.length) return "";
    return `<details class="more"><summary class="btn">${label} <span aria-hidden="true">▾</span></summary><div class="more-pop">${list.map(([attr, l]) => `<button type="button" ${attr}>${l}</button>`).join("")}</div></details>`;
  }
  document.addEventListener("click", (e) => { document.querySelectorAll("details.more[open]").forEach((d) => { if (!d.contains(e.target) || e.target.closest(".more-pop button")) d.open = false; }); });
  const STUFE_COLORS = ["#2f7a4f", "#3b5fa8", "#b0592b", "#7a4e9c", "#1c7a8a", "#9c3f5c", "#8a7a1c", "#5a6b8a"];
  function stufeColor(s) {
    if (!s) return "var(--muted)";
    const list = [...new Set([...state.kids.map((k) => k.stufe || ""), ...state.peopleDocs.map((p) => p.stufe || "")].filter(Boolean))].sort();
    return STUFE_COLORS[Math.max(0, list.indexOf(s)) % STUFE_COLORS.length];
  }
  const stufeTag = (s) => (s ? `<span class="stufe" style="--sc:${stufeColor(s)}">${esc(s)}</span>` : "");
  const kidName = (k) => `${k.vorname || ""} ${k.nachname || ""}`.trim() || "?";
  const byId = (list, id) => list.find((x) => x._id === id);
  // Link oder hochgeladene Datei (Vorschau: «media:<id>»)
  function linkAttrs(l) { const u = String(l.url || ""); if (u.startsWith("media:")) return `href="${esc(imgSrc(u))}" download="${esc(l.title || l.name || "Datei")}"`; return `href="${esc(safeUrl(u))}" target="_blank" rel="noopener"`; }
  const fileList = (files) => (files || []).length ? `<div class="file-list">${files.map((f) => f.image ? `<a class="file-img" ${linkAttrs({ url: f.url, title: f.name })}><img src="${esc(imgSrc(f.url))}" alt="${esc(f.name || "Bild")}" loading="lazy"></a>` : `<a class="file-doc" ${linkAttrs({ url: f.url, title: f.name })}>📄 ${esc(f.name || "Datei")}</a>`).join("")}</div>` : "";
  // Bild verkleinern oder Datei unverändert hochladen
  async function uploadAny(file, maxPx = 1600) {
    if (!file) return null;
    if (/^image\//.test(file.type) && !/svg/.test(file.type)) {
      const url = URL.createObjectURL(file);
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const sc = Math.min(1, maxPx / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      const r = await STORE.upload(file.name || "bild.jpg", c.toDataURL("image/jpeg", 0.8)); return { url: r.url, name: file.name || "Bild", image: true };
    }
    const max = STORE.isGas ? 20e6 : 1.5e6;
    if (file.size > max) throw new Error(STORE.isGas ? "Die Datei ist grösser als 20 MB." : "In der Vorschau gehen nur Dateien bis 1.5 MB.");
    const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
    const r = await STORE.upload(file.name, data); return { url: r.url, name: file.name, image: false };
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast("Kopiert. Jetzt im Chat einfügen."); }
    catch { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); toast("Kopiert. Jetzt im Chat einfügen."); } catch { toast("Kopieren ging nicht."); } t.remove(); }
  }
  const appLink = () => cfg().teamLink || STORE.appUrl() || "";
  // Bild im Word (PNG-Bytes über opts.images an docx() geben)
  W.img = (rid, wPx, hPx, id = 10) => { const cx = Math.round(wPx * 9525), cy = Math.round(hPx * 9525); return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Bild${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${rid}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`; };
  const dataBytes = (dataUrl) => Uint8Array.from(atob(String(dataUrl).split(",")[1] || ""), (c) => c.charCodeAt(0));
  const PB = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  // QR-Code (Bibliothek wird erst bei Bedarf geladen)
  let qrLib = null;
  function loadQr() { if (window.QRCode) return Promise.resolve(); if (qrLib) return qrLib; qrLib = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"; s.onload = res; s.onerror = () => { qrLib = null; rej(new Error("QR")); }; document.head.appendChild(s); }); return qrLib; }
  async function qrDataUrl(text, size = 300) { await loadQr(); const box = document.createElement("div"); new window.QRCode(box, { text, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.M }); const c = box.querySelector("canvas"); return c.toDataURL("image/png"); }

  // ---------- Anzeige: hell/dunkel, Schriftgrösse ----------
  function applyDisplay() {
    const th = store.get("lalei-theme") || ""; if (th) document.documentElement.dataset.theme = th; else delete document.documentElement.dataset.theme;
    const z = Number(store.get("lalei-zoom") || 1); document.body.style.zoom = z === 1 ? "" : String(z);
  }
  applyDisplay();
  function showDisplay() {
    const th = store.get("lalei-theme") || "", z = store.get("lalei-zoom") || "1";
    const seg = (key, opts, cur) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-disp="${key}|${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join("")}</div>`;
    const o = modal(`<div class="lg-head"><span class="eyebrow">Anzeige</span><h2>Darstellung</h2></div>
      <div class="field"><span>Farben</span>${seg("theme", [["", "Automatisch"], ["light", "Hell"], ["dark", "Dunkel"]], th)}</div>
      <div class="field"><span>Schriftgrösse</span>${seg("zoom", [["0.9", "Klein"], ["1", "Normal"], ["1.15", "Gross"], ["1.3", "Sehr gross"]], z)}</div>
      <p class="hint" style="margin:0">Gilt nur auf diesem Gerät.</p><div class="lg-foot"><span></span><button class="btn" data-disp-close>Fertig</button></div>`);
    o.onclick = (e) => {
      if (e.target === o || e.target.closest("[data-disp-close]")) return closeDrawer();
      const b = e.target.closest("[data-disp]"); if (!b) return; const [k, v] = b.dataset.disp.split("|");
      store.set(k === "theme" ? "lalei-theme" : "lalei-zoom", v); applyDisplay();
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    };
  }

  // ---------- «Als Team ansehen» ----------
  function setAsTeam(on) {
    state.asTeam = on; closeDrawer(); mounted = null; document.body.classList.toggle("as-team", on);
    renderSide(); setView(on ? "home" : "overview");
    toast(on ? "So sieht das Team das Lager. Hier kann nichts geändert werden." : "Zurück in der Ansicht der Lagerleitung");
  }

  // ---------- Schnell-Notiz (Lagerleitung) ----------
  function showQuickNote() {
    const o = modal(`<div class="lg-head"><span class="eyebrow">Schnell-Notiz</span><h2>Kurz festhalten</h2></div>
      <div class="field"><span>Wohin?</span><div class="seg qn-kind" role="radiogroup"><button type="button" data-qn-kind="idea" aria-pressed="true">● Traktandum für den nächsten Höck</button><button type="button" data-qn-kind="note" aria-pressed="false">○ Notiz im Protokoll</button></div></div>
      <textarea id="qn-text" rows="4" data-mention placeholder="Erste Zeile wird der Titel. @Name markiert jemanden."></textarea>
      <div class="lg-foot"><button class="link" data-qn-close>Abbrechen</button><button class="btn primary" data-qn-save>Speichern</button></div>`);
    let kind = "idea"; setTimeout(() => $("#qn-text", o).focus(), 30);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-qn-close]")) return closeDrawer();
      const k = e.target.closest("[data-qn-kind]"); if (k) { kind = k.dataset.qnKind; o.querySelectorAll("[data-qn-kind]").forEach((x) => { x.setAttribute("aria-pressed", String(x === k)); x.textContent = (x === k ? "● " : "○ ") + x.textContent.slice(2); }); return; }
      if (!e.target.closest("[data-qn-save]")) return;
      const txt = $("#qn-text", o).value.trim(); if (!txt) return $("#qn-text", o).focus();
      const [first, ...rest] = txt.split("\n"); const now = nowStamp();
      const data = kind === "idea" ? { type: "idea", title: first.slice(0, 120), text: rest.join("\n").trim(), by: me(), forDate: "", status: "Offen", date: iso(today()) } : { type: "note", date: iso(today()), title: first.slice(0, 120), text: rest.join("\n").trim() || first, author: me(), links: [] };
      try { await state.db.collection("journal").add({ ...data, createdAt: now, updatedAt: now, updatedBy: me() }); closeDrawer(); toast(kind === "idea" ? "Als Traktandum gespeichert" : "Notiz gespeichert"); } catch (err) { handleWriteError(err); }
    };
  }

  // ---------- Pinnwand ----------
  const boardActive = (b) => { const t = iso(today()); return (!b.from || b.from <= t) && (!b.until || b.until >= t); };
  const boardSorted = (list = state.board) => list.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.important ? 1 : 0) - (a.important ? 1 : 0) || ts(b.from || b.createdAt) - ts(a.from || a.createdAt));
  const boardText = (b) => `${b.important ? "❗ " : ""}*${b.title || "Mitteilung"}*\n\n${noAt(b.text || "")}${appLink() ? `\n\n👉 ${appLink()}` : ""}`;
  function boardCard(b) {
    const t = iso(today()); const lalei = isLaLei();
    const tags = [b.pinned ? '<span class="tag plain">📌 angeheftet</span>' : "", b.important ? '<span class="tag late">wichtig</span>' : "", lalei && b.from && b.from > t ? `<span class="tag next">erscheint am ${fmtFull(b.from)}</span>` : "", lalei && b.until && b.until < t ? '<span class="tag plain">abgelaufen</span>' : "", lalei && b.until && b.until >= t ? `<span class="muted" style="font-size:12px">bis ${fmtFull(b.until)}</span>` : "", state.prevSeen && ts(b.createdAt) > state.prevSeen && b.by !== me() ? '<span class="tag next">neu</span>' : "", lalei && (b.to || []).length ? `<span class="tag plain" title="Nur diese Personen sehen die Mitteilung">an ${esc((b.to || []).map((id) => { const p = state.peopleDocs.find((x) => x._id === id); return p ? displayName(p) : "?"; }).join(", "))}</span>` : ""].join("");
    const qs = state.feedback.filter((f) => f.boardId === b._id && (lalei || f.person === myId()));
    return `<article class="card board-item ${b.important ? "important" : ""}"><div class="card-body stack" style="gap:8px">
      <div class="entry-top"><h3>${esc(b.title || "Mitteilung")}</h3>${tags}</div>
      ${b.text ? `<div class="rich">${rich(b.text)}</div>` : ""}${fileList(b.files)}
      ${reactBar(b)}
      <div class="board-foot"><span class="muted">${esc(b.by || "")} · ${fmtFull((b.from || b.createdAt || "").slice(0, 10))}</span>
        ${lalei ? `<span class="btn-group"><button class="btn small" data-board-copy="${esc(b._id)}">Für WhatsApp kopieren</button><button class="btn small" data-board-edit="${esc(b._id)}">Bearbeiten</button></span>` : `<button class="btn small" data-board-ask="${esc(b._id)}">Frage dazu stellen</button>`}</div>
      ${qs.length ? `<div class="board-qs">${qs.map((q) => `<div class="board-q"><b>${esc(lalei ? q.name : "Deine Frage")}:</b> ${esc(q.text)}${q.reply ? `<div class="reply"><b>Antwort:</b> ${rich(q.reply)}</div>` : lalei ? ' <button class="link" data-goto="inbox">im Eingang beantworten</button>' : ' <span class="muted">(noch keine Antwort)</span>'}</div>`).join("")}</div>` : ""}
    </div></article>`;
  }
  views.board = {
    shell: () => `${pageHead("Pinnwand", "Mitteilungen der Lagerleitung an das ganze Team", `<button class="btn primary" data-board-new>+ Mitteilung</button>`)}<div id="board-body" class="stack"></div>`,
    update() {
      const act = boardSorted(state.board.filter(boardActive)), plan = boardSorted(state.board.filter((b) => b.from && b.from > iso(today()))), old = boardSorted(state.board.filter((b) => b.until && b.until < iso(today())));
      $("#board-body").innerHTML = (act.map(boardCard).join("") || `<section class="card"><div class="empty"><b>Noch keine Mitteilungen</b>Mit «+ Mitteilung» erreichst du das ganze Team. Wichtiges hervorheben, oben anheften oder für später planen.</div></section>`)
        + (plan.length ? `<div class="sec-label">Geplant (${plan.length})</div>${plan.map(boardCard).join("")}` : "")
        + (old.length ? `<details class="card fold"><summary>Abgelaufen (${old.length})</summary><div class="stack" style="padding:12px">${old.map(boardCard).join("")}</div></details>` : "");
    },
  };
  function openBoardEditor(id) {
    const src = id ? byId(state.board, id) : null;
    const d = src ? JSON.parse(JSON.stringify(src)) : { title: "", text: "", important: false, pinned: false, from: "", until: "", files: [], to: [] };
    d.to = d.to || [];
    let sure = false;
    const o = modal("", "wide-modal");
    const draw = () => {
      o.querySelector(".modal").innerHTML = `<div class="lg-head"><span class="eyebrow">Pinnwand</span><h2>${src ? "Mitteilung bearbeiten" : "Neue Mitteilung"}</h2></div>
        <label class="field"><span>Titel</span><input data-bf="title" value="${esc(d.title)}" placeholder="z.B. Anwesenheit bis 1. März eintragen"></label>
        <label class="field"><span>Text</span><textarea data-bf="text" rows="6" data-mention>${esc(d.text)}</textarea></label>
        <div class="field"><span>An</span><div class="seg" role="radiogroup" aria-label="Empfänger"><button type="button" data-bf-all="1" aria-pressed="${!d.to.length && !d._sel}">Ganzes Team</button><button type="button" data-bf-all="0" aria-pressed="${!!d.to.length || !!d._sel}">Ausgewählte Personen</button></div>
          ${d.to.length || d._sel ? `<div class="present">${peopleSorted().map((p) => `<button type="button" data-bf-to="${esc(p._id)}" aria-pressed="${d.to.includes(p._id)}">${av(displayName(p))}${esc(displayName(p))}</button>`).join("")}</div><span class="hint">Nur diese Personen sehen die Mitteilung (dazu immer die Lagerleitung).</span>` : ""}</div>
        <div class="form-grid"><label class="toggle"><input type="checkbox" data-bf-c="important" ${d.important ? "checked" : ""}> Wichtig (wird hervorgehoben)</label><label class="toggle"><input type="checkbox" data-bf-c="pinned" ${d.pinned ? "checked" : ""}> Oben anheften</label></div>
        <div class="form-grid"><label class="field"><span>Erscheint ab (leer = sofort)</span><input type="date" data-bf="from" value="${esc(d.from)}"></label><label class="field"><span>Verschwindet nach (leer = nie)</span><input type="date" data-bf="until" value="${esc(d.until)}"></label></div>
        <div class="field"><span>Bilder und Dateien</span>${(d.files || []).map((f, i) => `<div class="link-row">${f.image ? "🖼" : "📄"} <span>${esc(f.name)}</span><button type="button" class="x" data-bf-rm="${i}" aria-label="Entfernen">✕</button></div>`).join("")}<label class="btn small" style="align-self:flex-start;cursor:pointer">Bild oder PDF hinzufügen<input type="file" accept="image/*,application/pdf" data-bf-file hidden></label></div>
        <div class="lg-foot">${src ? `<button class="btn small ${sure ? "red" : "ghost danger"}" data-bf-del>${sure ? "Wirklich löschen?" : "Löschen"}</button>` : "<span></span>"}<span class="btn-group"><button class="btn" data-bf-close>Abbrechen</button><button class="btn primary" data-bf-save>Speichern</button></span></div>`;
    };
    o.oninput = (e) => { const t = e.target; if (t.dataset.bf) d[t.dataset.bf] = t.value; if (t.dataset.bfC) d[t.dataset.bfC] = t.checked; };
    o.onchange = async (e) => {
      o.oninput(e);
      if (e.target.matches("[data-bf-file]")) { const f = e.target.files[0]; e.target.value = ""; try { toast("Wird hochgeladen …"); const r = await uploadAny(f); d.files = [...(d.files || []), r]; draw(); } catch (err) { toast(errMsg(err)); } }
    };
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-bf-close]")) return closeDrawer();
      const rm = e.target.closest("[data-bf-rm]"); if (rm) { d.files.splice(+rm.dataset.bfRm, 1); return draw(); }
      const al = e.target.closest("[data-bf-all]"); if (al) { if (al.dataset.bfAll === "1") { d.to = []; d._sel = false; } else d._sel = true; return draw(); }
      const bt = e.target.closest("[data-bf-to]"); if (bt) { const pid = bt.dataset.bfTo; d.to = d.to.includes(pid) ? d.to.filter((x) => x !== pid) : [...d.to, pid]; return draw(); }
      if (e.target.closest("[data-bf-del]")) { if (!sure) { sure = true; return draw(); } try { await state.db.doc("board/" + id).delete(); closeDrawer(); toast("Mitteilung gelöscht"); } catch (err) { handleWriteError(err); } return; }
      if (!e.target.closest("[data-bf-save]")) return;
      if (!d.title.trim()) return toast("Bitte einen Titel eingeben.");
      if (d._sel && !d.to.length) return toast("Bitte mindestens eine Person wählen oder «Ganzes Team».");
      const data = { ...d, title: d.title.trim(), by: src ? src.by : me(), createdAt: src ? src.createdAt : nowStamp(), updatedAt: nowStamp(), updatedBy: me() }; delete data._id; delete data._sel;
      try { await state.db.doc("board/" + (id || state.db.newId())).set(data); closeDrawer(); toast("Gespeichert"); } catch (err) { handleWriteError(err); }
    };
    draw();
  }
  function askBoard(id) {
    const b = byId(state.board, id); if (!b) return;
    const o = modal(`<div class="lg-head"><span class="eyebrow">Frage zur Mitteilung</span><h2>${esc(b.title)}</h2></div><textarea id="bq-text" rows="4" placeholder="Deine Frage an die Lagerleitung"></textarea><div class="lg-foot"><button class="link" data-bq-close>Abbrechen</button><button class="btn primary" data-bq-send>Senden</button></div>`);
    setTimeout(() => $("#bq-text", o).focus(), 30);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-bq-close]")) return closeDrawer();
      if (!e.target.closest("[data-bq-send]")) return; const txt = $("#bq-text", o).value.trim(); if (!txt) return;
      try { await state.db.doc("feedback/" + state.db.newId()).set({ person: myId(), name: me(), kind: "Rückfrage", boardId: id, boardTitle: b.title, text: txt, status: "Neu", createdAt: nowStamp() }); closeDrawer(); toast("Frage verschickt"); } catch (err) { handleWriteError(err); }
    };
  }

  // ---------- Packliste ----------
  const PACK_EXAMPLE = [["Schlafen", ["Schlafsack", "Mätteli", "Kissen", "Pyjama"]], ["Kleider", ["Regenjacke", "Feste Schuhe", "Ersatzkleider", "Warmer Pulli", "Badehose / Badkleid"]], ["Hygiene", ["Zahnbürste und Zahnpasta", "Duschmittel", "Sonnencreme", "Badetuch"]], ["Leiterzeug", ["Cevi-Hemd und Krawatte", "Taschenlampe mit Ersatzbatterien", "Sackmesser", "Leiterausweis / J+S-Unterlagen", "Programm-Unterlagen"]], ["Diverses", ["Trinkflasche", "Handy-Ladekabel", "Persönliche Medikamente"]]];
  const packTemplate = () => cfg().packlist || [];
  function myPack() { const p = (state.todos || {}).pack || {}; const items = [...packTemplate().filter((x) => !(p.removed || {})[x.id] && (!x.lalei || isLaLei())), ...(p.own || [])]; return { items, done: p.done || {} }; }
  function savePack(change) {
    const cur = (state.todos || {}).pack || {}; const pack = { done: { ...(cur.done || {}) }, removed: { ...(cur.removed || {}) }, own: [...(cur.own || [])] }; change(pack);
    return state.db.doc("todos/" + myId()).set({ ...(state.todos || {}), items: todoItems(), pack, updatedAt: nowStamp() }).catch(handleWriteError);
  }
  const sectionsOf = (items) => [...new Set(items.map((x) => x.section || "Diverses"))];
  function renderPack() {
    const box = $("#pack-box"); if (!box) return;
    const fa = document.activeElement; if (box.contains(fa) && fa.tagName === "INPUT" && fa.type === "text" && fa.value) return;
    const { items, done } = myPack(); const n = items.filter((x) => done[x.id]).length;
    if (!items.length) { box.innerHTML = `<div class="empty">${isLaLei() ? "Noch keine Packliste. Unter «Packliste» erstellst du die Packliste fürs Team." : "Die Lagerleitung hat noch keine Packliste erstellt. Du kannst aber eigene Punkte hinzufügen."}</div>${packAddForm([])}`; return; }
    box.innerHTML = `<div class="card-body stack" style="gap:14px"><div class="pcell" style="max-width:420px"><div class="bar ok"><i style="width:${pct(n, items.length)}%"></i></div><span style="width:auto">${n} von ${items.length} eingepackt</span></div>
      <div class="pack-grid">${sectionsOf(items).map((s) => `<div class="pack-sec"><h3>${esc(s)}</h3>${items.filter((x) => (x.section || "Diverses") === s).map((x) => `<label class="check-item ${done[x.id] ? "done" : ""}"><input type="checkbox" data-pack="${esc(x.id)}" ${done[x.id] ? "checked" : ""}><span>${esc(x.t)}</span><button type="button" class="x" data-pack-rm="${esc(x.id)}" aria-label="Von meiner Liste entfernen">✕</button></label>`).join("")}</div>`).join("")}</div>
      ${packAddForm(sectionsOf(items))}<div class="btn-group"><button class="btn small" data-pack-reset>Alle Häkchen entfernen</button>${Object.keys(((state.todos || {}).pack || {}).removed || {}).length ? '<button class="btn small" data-pack-restore>Entfernte Punkte zurückholen</button>' : ""}</div></div>`;
  }
  const packAddForm = (secs) => `<form class="todo-add" data-pack-add><input type="text" placeholder="Eigenen Punkt hinzufügen" aria-label="Eigener Punkt"><input list="pack-secs" placeholder="Abschnitt" aria-label="Abschnitt" value="${esc(secs[secs.length - 1] || "Diverses")}"><datalist id="pack-secs">${secs.map((s) => `<option value="${esc(s)}">`).join("")}</datalist><button class="btn small">+</button></form>`;

  // ---------- Erinnerungen & Änderungen seit dem letzten Besuch (Team) ----------
  function mySnapshot() {
    const name = me(); const svc = {}; for (const [k, v] of Object.entries(planDoc().cells || {})) if (v.includes(name)) svc[k] = 1;
    const inP = (list) => (list || []).some((m) => m.t === "p" && m.id === myId());
    return { svc, cells: planDoc().cells || {}, room: (state.rooms.find((r) => inP(r.members)) || {})._id || "", trips: state.trips.filter((t) => inP(t.members) || t.driver === myId()).map((t) => t._id).sort().join(","), grp: (state.groups.find((g) => (g.leaders || []).includes(myId())) || {})._id || "" };
  }
  function takeSnapshot() {
    if (state.snapDone || !state.loaded.tasks || role() !== "team" || state.asTeam) return;
    const key = `lalei-snap-${state.lagerId}-${myId()}`; try { state.snapPrev = JSON.parse(store.get(key) || "null"); } catch { state.snapPrev = null; }
    store.set(key, JSON.stringify(mySnapshot())); state.snapDone = true;
  }
  const svcLabel = (k) => { const [did, sid] = k.split("|"); const d = days().find((x) => x.id === did); const s = planDoc().services.find((x) => x.id === sid); return `${s ? s.name : "Dienst"} am ${d ? d.label : "?"}`; };
  function teamHints() {
    const out = []; const prev = state.snapPrev; const now = mySnapshot();
    const ds = days(); const dps = dayparts(); const sv = attDoc("p_" + myId());
    if (ds.length) { const open = ds.reduce((a, d) => a + dps.filter((_, i) => (sv[d.id + "|" + i] || "O") === "O").length, 0); const dl = cfg().attDeadline;
      if (open) out.push({ cls: dl && dl < iso(today()) ? "late" : "next", html: `Du hast noch <b>${open}</b> offene Felder bei der Anwesenheit${dl ? `. Bitte bis <b>${fmtFull(dl)}</b> eintragen` : ""}.`, go: "myatt" }); }
    for (const b of state.board) if (state.prevSeen && ts(b.createdAt) > state.prevSeen && b.by !== me()) out.push({ cls: b.important ? "late" : "next", html: `Neue Mitteilung: <b>${esc(b.title)}</b>`, tab: "start" });
    for (const f of state.feedback) if (f.person === myId() && f.reply && state.prevSeen && ts(f.repliedAt) > state.prevSeen) out.push({ cls: "ok", html: `Die Lagerleitung hat auf «${esc(String(f.text).slice(0, 40))}» geantwortet.`, tab: "fb" });
    for (const s of state.swap) if (s.person === myId() && s.status !== "Offen" && state.prevSeen && ts(s.decidedAt) > state.prevSeen) out.push({ cls: s.status === "Angenommen" ? "ok" : "late", html: `Dein Diensttausch (${esc(s.serviceName)}, ${esc(s.dayLabel)}) wurde <b>${s.status === "Angenommen" ? "angenommen" : "abgelehnt"}</b>.` });
    if (prev) {
      for (const k of Object.keys(now.svc)) if (!prev.svc[k]) out.push({ cls: "next", html: `Neu eingeteilt: <b>${esc(svcLabel(k))}</b>`, go: "plan" });
      for (const k of Object.keys(prev.svc)) if (!now.svc[k]) out.push({ cls: "plain", html: `Nicht mehr eingeteilt: ${esc(svcLabel(k))}`, go: "plan" });
      if (prev.room !== now.room && now.room) out.push({ cls: "next", html: `Neues Zimmer / Zelt: <b>${esc((byId(state.rooms, now.room) || {}).name || "")}</b>`, go: "rooms" });
      if (prev.trips !== now.trips && now.trips) out.push({ cls: "next", html: "Deine Fahrt wurde geändert.", go: "rooms" });
      if (prev.grp !== now.grp && now.grp) out.push({ cls: "next", html: `Du leitest neu die Gruppe <b>${esc((byId(state.groups, now.grp) || {}).name || "")}</b>`, go: "rooms" });
    }
    return out;
  }
  // geänderte Felder im Schichtplan seit dem letzten Besuch
  const cellChanged = (k) => { const p = state.snapPrev; if (!p) return false; return JSON.stringify((p.cells || {})[k] || []) !== JSON.stringify((planDoc().cells || {})[k] || []); };

  // ---------- Mein Bereich (Team) ----------
  TABS.home = [["start", "Übersicht"], ["todo", "To-dos"], ["pack", "Packliste"], ["fb", "Ideen & Feedback"]];
  function myAssignments() {
    const name = me(); const plan = planDoc(); const inP = (list) => (list || []).some((m) => m.t === "p" && m.id === myId());
    const svc = []; for (const d of days()) for (const s of plan.services) if (((plan.cells || {})[d.id + "|" + s.id] || []).includes(name)) svc.push({ d, s });
    const room = state.rooms.find((r) => inP(r.members));
    const trips = state.trips.filter((t) => inP(t.members) || t.driver === myId());
    const grp = state.groups.find((g) => (g.leaders || []).includes(myId()));
    const rs = []; for (const r of ressorts()) { if (r.lead === name) rs.push(`${r.name} (Leitung)`); if (r.stv === name) rs.push(`${r.name} (Stv)`); for (const s of subsOf(r)) { if (s.lead === name) rs.push(`${s.name} (Leitung)`); if (s.stv === name) rs.push(`${s.name} (Stv)`); } }
    return { svc, room, trips, grp, rs };
  }
  views.home = {
    shell: () => `${pageHead(`Hallo ${esc(me())}`, `Dein Bereich im Lager «${esc(lagerDoc().title || "")}»`, `<button class="btn" data-team-mappe>Meine Lagermappe (Word)</button>`)}${tabBar("home")}
      <div class="stack" ${pane("home", "start")}><div id="home-hints"></div><div id="home-board" class="stack"></div><section class="card"><div class="card-head"><h2>Meine Einteilung</h2></div><div class="card-body" id="home-mine"></div></section></div>
      <section class="card" ${pane("home", "todo")}><div class="card-head"><h2>Meine To-dos</h2><span class="muted">Nur du siehst diese Liste</span></div><div id="todo-box"></div></section>
      <section class="card" ${pane("home", "pack")}><div class="card-head"><h2>Meine Packliste</h2><span class="muted">Vorlage der Lagerleitung, du kannst sie anpassen</span></div><div id="pack-box"></div></section>
      <section class="card" ${pane("home", "fb")}><div class="card-head"><h2>Ideen, Wünsche &amp; Feedback</h2><span class="muted">geht an die Lagerleitung</span></div>
        <form class="card-body stack" style="gap:10px" data-fb-form><div class="seg fb-kind" role="group" aria-label="Art">${FB_KINDS.map((k, i) => `<button type="button" data-fb-kind="${k}" aria-pressed="${i === 0}">${k}</button>`).join("")}</div>
        <textarea id="fb-text" rows="3" placeholder="Was möchtest du der Lagerleitung sagen?" aria-label="Text"></textarea><label class="toggle"><input type="checkbox" data-fb-anon> Anonym senden (die Lagerleitung sieht deinen Namen nicht)</label><div><button class="btn primary">Senden</button></div></form><div id="fb-mine"></div></section>`,
    update() {
      takeSnapshot(); fillTabs("home", { todo: todoItems().filter((x) => !x.done).length });
      renderTodos(); renderPack();
      const hints = teamHints();
      $("#home-hints").innerHTML = hints.length ? `<section class="card hints"><div class="card-head"><h2>Hinweise</h2></div><div class="card-body stack" style="gap:6px">${hints.map((h) => `<div class="hint-row ${h.cls}">${h.html}${h.go ? ` <button class="link" data-goto="${h.go}">ansehen</button>` : h.tab ? ` <button class="link" data-ptab="home|${h.tab}">ansehen</button>` : ""}</div>`).join("")}</div></section>` : "";
      const bl = boardSorted(state.board.filter((b) => boardActive(b) && boardFor(b)));
      $("#home-board").innerHTML = bl.length ? `<div class="sec-label">Mitteilungen der Lagerleitung</div>${bl.map(boardCard).join("")}` : "";
      const a = myAssignments();
      $("#home-mine").innerHTML = `<div class="mine-grid">
        <div class="field"><span>Dienste</span>${a.svc.map(({ d, s }) => `<div class="svc-row ${cellChanged(d.id + "|" + s.id) ? "chg" : ""}"><b>${esc(d.label)}</b> ${esc(s.name)}${s.desc ? `<div class="muted" style="font-size:12.5px">${esc(s.desc)}</div>` : ""}</div>`).join("") || '<span class="muted" style="font-size:13px">Noch keine Dienste.</span>'}</div>
        <div class="field"><span>Zimmer / Zelt</span>${a.room ? esc(a.room.name) : '<span class="muted" style="font-size:13px">Noch nicht eingeteilt.</span>'}</div>
        <div class="field"><span>Fahrt</span>${a.trips.map((t) => `<div>${tripLine(t)}</div>`).join("") || '<span class="muted" style="font-size:13px">Noch keine Fahrt.</span>'}</div>
        <div class="field"><span>Gruppe</span>${a.grp ? esc(a.grp.name) : '<span class="muted" style="font-size:13px">Keine Gruppe.</span>'}</div>
        <div class="field"><span>Ressorts</span>${a.rs.length ? esc(a.rs.join(", ")) : '<span class="muted" style="font-size:13px">Kein Ressort.</span>'}</div></div>`;
      const mine = state.feedback.filter((f) => f.person === myId() && f.kind !== "Rückfrage").sort((x, y) => ts(y.createdAt) - ts(x.createdAt));
      $("#fb-mine").innerHTML = mine.length ? `<div class="card-head" style="border-top:1px solid var(--line)"><h2 style="font-size:14px">Deine Einträge</h2></div>${mine.map((f) => `<div class="mrow"><div class="entry-top"><span class="tag plain type-idea">${esc(f.kind)}</span><span class="tag plain fb-${esc(FB_STATUS[f.status] || "neu")}">${esc(f.status || "Neu")}</span>${f.anon ? '<span class="tag plain">anonym</span>' : ""}<span class="muted" style="font-size:12px;margin-left:auto">${stampFmt(f.createdAt)}</span></div><div class="rich">${rich(f.text)}</div>${f.reply ? `<div class="reply"><b>Antwort der Lagerleitung:</b> ${rich(f.reply)}</div>` : ""}</div>`).join("")}` : "";
      maybeTour();
    },
  };

  // ---------- Willkommens-Tour (Team, einmal) ----------
  function maybeTour() {
    if (role() !== "team" || state.asTeam || $(".overlay")) return;
    const key = `lalei-tour-${state.lagerId}-${myId()}`; if (store.get(key)) return; store.set(key, "1");
    const steps = [["Mein Bereich", "Hier siehst du Hinweise, Mitteilungen der Lagerleitung, deine Dienste, dein Zimmer und deine Fahrt. Dazu deine privaten To-dos, deine Packliste und ein Formular für Ideen und Feedback."], ["Meine Anwesenheit", "Trag ein, wann du im Lager bist. Leere Felder speicherst du direkt, Änderungen gehen als Anfrage an die Lagerleitung."], ["Einteilung, Schichtplan, Abzählen", "Wer schläft wo, wer fährt mit wem, wer hat welchen Dienst. Beim eigenen Dienst kannst du einen Tausch anfragen. «Abzählen» hilft im Lager beim Durchzählen."], ["Notfall", "Der rote Knopf «Notfall» zeigt die Sicherheitsverantwortlichen des Lagers und die Lageradresse. Er ist immer sichtbar."]];
    let i = 0; const o = modal("", "tour-modal");
    const draw = () => { o.querySelector(".modal").innerHTML = `<div class="lg-head"><span class="eyebrow">Willkommen · ${i + 1} von ${steps.length}</span><h2>${steps[i][0]}</h2></div><p style="margin:0">${steps[i][1]}</p><div class="tour-dots">${steps.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("")}</div><div class="lg-foot"><button class="link" data-tour-end>Überspringen</button><button class="btn primary" data-tour-next>${i < steps.length - 1 ? "Weiter" : "Los geht's"}</button></div>`; };
    o.onclick = (e) => { if (e.target.closest("[data-tour-end]") || (e.target.closest("[data-tour-next]") && i === steps.length - 1)) return closeDrawer(); if (e.target.closest("[data-tour-next]")) { i++; draw(); } };
    draw();
  }

  // ---------- Team: Schichtplan mit Beschreibungen, Änderungen und Tausch ----------
  views.tplan = {
    shell: () => `${pageHead("Schichtplan", "Wer hat wann welchen Dienst? Tippe auf deinen Dienst, um einen Tausch anzufragen.")}<div id="tplan-body"></div>`,
    update() {
      takeSnapshot(); const ds = days(); const plan = planDoc(); const name = me();
      if (!ds.length) { $("#tplan-body").innerHTML = `<section class="card"><div class="empty">Noch kein Schichtplan.</div></section>`; return; }
      const mySw = state.swap.filter((s) => s.person === myId()).sort((a, b) => ts(b.createdAt) - ts(a.createdAt)).slice(0, 6);
      $("#tplan-body").innerHTML = `<section class="card"><div class="table-wrap"><table class="plan-table"><thead><tr><th>Dienst</th>${ds.map((d) => `<th>${esc(d.label)}${d.date ? `<div class="muted" style="font-weight:400;text-transform:none;letter-spacing:0">${fmtFull(d.date)}</div>` : ""}</th>`).join("")}</tr></thead><tbody>
        ${plan.services.map((s) => `<tr><td><b style="font-weight:600">${esc(s.name)}</b>${s.desc ? `<div class="muted svc-desc">${esc(s.desc)}</div>` : ""}</td>${ds.map((d) => { const k = d.id + "|" + s.id; const names = (plan.cells || {})[k] || []; return `<td class="${cellChanged(k) ? "chg" : ""}"><div class="chipset">${names.map((n) => n === name ? `<button class="pchip-s mine" data-swap="${esc(k)}" title="Tausch anfragen">${av(n)}${esc(n)} ⇄</button>` : `<span class="pchip-s">${av(n)}${esc(n)}</span>`).join("") || '<span class="muted">–</span>'}</div></td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
        ${state.snapPrev ? '<div class="card-body hint">Gelb markiert: seit deinem letzten Besuch geändert.</div>' : ""}</section>
        ${mySw.length ? `<section class="card"><div class="card-head"><h2>Deine Tauschanfragen</h2></div>${mySw.map((s) => `<div class="mrow"><div class="entry-top"><span class="tag plain ${s.status === "Angenommen" ? "ok" : s.status === "Abgelehnt" ? "late" : "next"}">${esc(s.status || "Offen")}</span><b>${esc(s.serviceName)}, ${esc(s.dayLabel)}</b>${s.withName ? `<span class="muted">mit ${esc(s.withName)}</span>` : ""}</div>${s.reply ? `<div class="reply">${esc(s.reply)}</div>` : ""}</div>`).join("")}</section>` : ""}`;
    },
  };
  function askSwap(k) {
    const [did, sid] = k.split("|"); const d = days().find((x) => x.id === did) || {}; const s = planDoc().services.find((x) => x.id === sid) || {};
    const others = people().filter((p) => p !== me());
    const o = modal(`<div class="lg-head"><span class="eyebrow">Dienst tauschen</span><h2>${esc(s.name)}, ${esc(d.label)}</h2></div>
      <label class="field"><span>Mit wem?</span><select id="sw-with" class="input"><option value="">Egal, die Lagerleitung soll jemanden finden</option>${others.map((p) => `<option>${esc(p)}</option>`).join("")}</select></label>
      <label class="field"><span>Bemerkung</span><input id="sw-note" placeholder="z.B. Pax übernimmt, ich mache dafür seine Nachtwache am Montag"></label>
      <p class="hint" style="margin:0">Sprich dich vorher mit der Person ab. Die Lagerleitung bestätigt den Tausch.</p>
      <div class="lg-foot"><button class="link" data-sw-close>Abbrechen</button><button class="btn primary" data-sw-send>Anfrage senden</button></div>`);
    o.onclick = async (e) => {
      if (e.target === o || e.target.closest("[data-sw-close]")) return closeDrawer();
      if (!e.target.closest("[data-sw-send]")) return;
      try { await state.db.doc("swap/" + state.db.newId()).set({ person: myId(), name: me(), key: k, dayId: did, serviceId: sid, dayLabel: d.label || "", serviceName: s.name || "", withName: $("#sw-with", o).value, note: $("#sw-note", o).value.trim(), status: "Offen", createdAt: nowStamp() }); closeDrawer(); toast("Tauschanfrage verschickt"); } catch (err) { handleWriteError(err); }
    };
  }
  async function decideSwap(id, ok) {
    const s = byId(state.swap, id); if (!s) return;
    const ops = [{ op: "update", coll: "swap", id, data: { status: ok ? "Angenommen" : "Abgelehnt", decidedBy: me(), decidedAt: nowStamp() } }];
    if (ok) {
      const cur = ((planDoc().cells || {})[s.key] || []).slice(); let next = cur.filter((n) => n !== s.name);
      if (s.withName && !next.includes(s.withName)) next.push(s.withName);
      ops.unshift(state.plan ? { op: "update", coll: "plan", id: "main", data: { cells: { [s.key]: next } } } : { op: "set", coll: "plan", id: "main", data: { services: planDoc().services, cells: { [s.key]: next } } });
    }
    try { await state.db.batch(ops); toast(ok ? (s.withName ? "Getauscht und im Schichtplan eingetragen" : "Angenommen. Bitte jemanden für den Dienst einteilen.") : "Abgelehnt"); } catch (e) { handleWriteError(e); }
  }

  // ---------- Eingang (neu: Diensttausch, Rückfragen, anonym, zuweisen) ----------
  const openSwaps = () => state.swap.filter((s) => (s.status || "Offen") === "Offen");
  function swapCard() {
    const list = openSwaps(); if (!list.length) return "";
    return `<section class="card req-card"><div class="card-head"><h2>Diensttausch</h2><span class="tag next">${list.length} offen</span></div>${list.map((s) => `<div class="mrow"><div class="entry-top">${person(s.name)}<span class="muted" style="font-size:12px;margin-left:auto">${stampFmt(s.createdAt)}</span></div><div style="font-size:13.5px"><b>${esc(s.serviceName)}, ${esc(s.dayLabel)}</b> ${s.withName ? `→ tauschen mit <b>${esc(s.withName)}</b>` : "→ jemand anderes soll übernehmen"}</div>${s.note ? `<div class="muted" style="font-size:13px">«${esc(s.note)}»</div>` : ""}<div class="btn-group"><button class="btn small primary" data-swap-ok="${esc(s._id)}">Annehmen</button><button class="btn small" data-swap-no="${esc(s._id)}">Ablehnen</button></div></div>`).join("")}</section>`;
  }
  views.inbox = {
    shell: () => `${pageHead("Eingang", "Ideen, Feedback, Rückfragen und Anfragen aus dem Team")}<div id="req-box" class="stack"></div>
      <section class="card"><div class="subtabs" style="padding:8px 12px 0" role="tablist">${[["new", "Neu"], ["open", "Noch nicht erledigt"], ["all", "Alle"]].map(([k, l]) => `<button role="tab" data-in-tab="${k}" aria-selected="${state.inTab === k}">${l}</button>`).join("")}</div><div id="fb-list"></div></section>`,
    update() {
      $("#req-box").innerHTML = attReqCard() + swapCard();
      const all = state.feedback.slice().sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
      const list = all.filter((f) => state.inTab === "all" || (state.inTab === "new" ? (f.status || "Neu") === "Neu" : f.status !== "Erledigt"));
      const box = $("#fb-list"); if (box.contains(document.activeElement) && document.activeElement.tagName === "TEXTAREA") return;
      const assign = (f) => `<select class="input" data-fb-ress="${esc(f._id)}" aria-label="Zuweisen"><option value="">Nicht zugewiesen</option><option value="general" ${f.ressort === "general" ? "selected" : ""}>Allgemein</option>${ressorts().map((r) => `<option value="${esc(r.id)}" ${f.ressort === r.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>`;
      box.innerHTML = list.length ? list.map((f) => `<div class="mrow fb-item"><div class="entry-top"><span class="tag plain type-idea">${esc(f.kind || "Idee")}</span>${f.anon ? '<span class="tag plain">anonym</span>' : person(f.name)}${f.boardTitle ? `<span class="muted" style="font-size:12.5px">zu «${esc(f.boardTitle)}»</span>` : ""}<span class="muted" style="font-size:12px;margin-left:auto">${stampFmt(f.createdAt)}</span></div>
        <div class="rich">${rich(f.text)}</div>
        <div class="fb-tools"><select class="input" data-fb-status="${esc(f._id)}" aria-label="Status">${Object.keys(FB_STATUS).map((s) => `<option ${s === (f.status || "Neu") ? "selected" : ""}>${s}</option>`).join("")}</select>
          <textarea class="input" rows="1" data-fb-reply="${esc(f._id)}" placeholder="Antwort ans Team (optional)" aria-label="Antwort">${esc(f.reply || "")}</textarea>
          ${menu([f.kind !== "Rückfrage" && !f.ideaId ? [`data-fb-idea="${esc(f._id)}"`, "Als Traktandum übernehmen"] : null])}</div>
        <div class="fb-assign"><span class="muted" style="font-size:12.5px">Zuweisen:</span>${assign(f)}${f.ideaId ? '<span class="tag plain">als Traktandum übernommen</span>' : ""}</div></div>`).join("") : `<div class="empty">${state.inTab === "new" ? "Nichts Neues." : "Noch keine Einträge."} Das Team schickt Ideen, Feedback und Rückfragen über «Mein Bereich».</div>`;
    },
  };

  // ---------- Team-Suche ----------
  views.tsearch = {
    shell: () => `${pageHead("Suche", "")}<section class="card"><div id="ts-body"></div></section>`,
    update() {
      const q = state.q.trim().toLowerCase(); const hit = (s) => String(s || "").toLowerCase().includes(q); const res = [];
      for (const b of state.board.filter(boardActive)) if (hit(b.title) || hit(b.text)) res.push(["Mitteilung", b.title, String(b.text || "").slice(0, 120), "home"]);
      for (const s of (state.info || {}).sections || []) if (hit(s.title) || hit(s.text) || (s.links || []).some((l) => hit(l.title))) res.push(["Infos", s.title, String(s.text || "").slice(0, 120), "infos"]);
      for (const s of planDoc().services) if (hit(s.name) || hit(s.desc)) res.push(["Dienst", s.name, s.desc || "", "plan"]);
      for (const [k, v] of Object.entries(planDoc().cells || {})) if (v.some(hit)) res.push(["Schichtplan", svcLabel(k), v.join(", "), "plan"]);
      for (const r of state.rooms) if (hit(r.name) || (r.members || []).map(memberInfo).filter(Boolean).some((i) => hit(i.name))) res.push(["Zimmer / Zelt", r.name, (r.members || []).map(memberInfo).filter(Boolean).map((i) => i.name).join(", "), "rooms"]);
      for (const t of state.trips) if (hit(t.name) || hit(t.meet) || (t.members || []).map(memberInfo).filter(Boolean).some((i) => hit(i.name))) res.push(["Fahrt", t.name, tripLineText(t), "rooms"]);
      for (const g of state.groups) if (hit(g.name)) res.push(["Gruppe", g.name, "", "rooms"]);
      $("#ts-body").innerHTML = q.length < 2 ? `<div class="empty">Mindestens zwei Buchstaben eingeben.</div>` : res.length ? res.slice(0, 40).map(([tag, t, s, go]) => `<div class="mrow" data-goto="${go}" role="button" tabindex="0"><div class="entry-top"><span class="tag plain">${tag}</span><b>${esc(t)}</b></div>${s ? `<div class="muted" style="font-size:13px">${esc(s)}</div>` : ""}</div>`).join("") : `<div class="empty">Nichts gefunden für «${esc(state.q)}».</div>`;
    },
  };

  // ---------- Team-Lagermappe ----------
  function teamMappe() {
    const L = lagerDoc(); const c = cfg(); const a = myAssignments(); const plan = planDoc();
    let b = W.p(W.r("Meine Lagermappe"), { style: "Title" }) + W.p(W.r(`${L.title || ""} · ${me()}`, { color: MUTE, sz: 24 }), { after: 200 });
    b += W.p(W.r(`Stand ${stampFmt(nowStamp())}. Aktuell ist immer das Tool.`, { i: 1, color: MUTE }));
    b += W.p(W.r("Notfall"), { style: "Heading1" });
    if (c.adresse) b += W.p(W.r("Lageradresse: ", { b: 1 }) + W.r(c.adresse));
    const sec = securityPeople(); b += sec.length ? W.tbl([2400, 7238], [[W.head("Telefon"), W.head("Sicherheitsverantwortliche")], ...sec.map((s) => [W.cell(s.tel || "–", { b: 1, sz: 24 }), W.cell(`${s.name} · ${s.role}`)])], { head: 1 }) : W.p(W.r("Noch keine Sicherheitsverantwortlichen erfasst.", { i: 1 }));
    b += W.p(W.r("Meine Einteilung"), { style: "Heading1" });
    b += W.tbl([2600, 7038], [["Dienste", a.svc.map(({ d, s }) => `${d.label}: ${s.name}${s.desc ? " – " + s.desc : ""}`).join("\n") || "–"], ["Zimmer / Zelt", a.room ? a.room.name : "–"], ["Fahrt", a.trips.map(tripLineText).join("\n") || "–"], ["Gruppe", a.grp ? a.grp.name : "–"]].map(([k, v]) => [W.cell(k, { b: 1 }), W.cell(v)]), { labelCol: 1 });
    if (days().length) { b += W.p(W.r("Schichtplan"), { style: "Heading1" }); b += W.tbl([2400, 7238], [[W.head("Tag"), W.head("Dienste")], ...days().map((x) => [W.cell(x.label + (x.date ? "\n" + fmtFull(x.date) : ""), { b: 1 }), W.cell(plan.services.map((s) => `${s.name}: ${((plan.cells || {})[x.id + "|" + s.id] || []).join(", ") || "–"}`).join("\n"))])], { head: 1 }); }
    if (state.rooms.length) { b += W.p(W.r("Zimmer & Zelte"), { style: "Heading1" }); b += W.tbl([2600, 7038], [[W.head("Zimmer / Zelt"), W.head("Wer")], ...roomsSorted().map((r) => [W.cell(r.name || "", { b: 1 }), W.cell((r.members || []).map(memberInfo).filter(Boolean).map((i) => i.name).join(", ") || "–")])], { head: 1 }); }
    const secs = (state.info || {}).sections || []; if (secs.length) { b += PB + W.p(W.r("Infos"), { style: "Heading1" }); for (const s of secs) { b += W.p(W.r(s.title), { style: "Heading2" }) + W.text(s.text || ""); for (const l of s.links || []) if (!String(l.url).startsWith("media:")) b += W.p(W.r(`${l.title}: ${l.url}`, { color: MUTE, sz: 18 })); } }
    const { items, done } = myPack(); if (items.length) { b += PB + W.p(W.r("Meine Packliste"), { style: "Heading1" }); for (const s of sectionsOf(items)) { b += W.p(W.r(s), { style: "Heading2" }); for (const x of items.filter((y) => (y.section || "Diverses") === s)) b += W.p(W.r((done[x.id] ? "☑\t" : "☐\t") + x.t), { ind: 360, hang: 220, after: 30 }); } }
    saveFile(`Meine Lagermappe ${fileSafe(L.title)} ${fileSafe(me())}.docx`, docx(b, `${L.abteilung || "Cevi"} · ${L.title || ""}`, `Lagermappe ${me()}`));
  }

  // ---------- Klicks und Eingaben ----------
  view.addEventListener("click", (e) => {
    if (e.target.closest("[data-asteam-off]")) return setAsTeam(false);
    if (e.target.closest("[data-board-new]")) return openBoardEditor(null);
    const be = e.target.closest("[data-board-edit]"); if (be) return openBoardEditor(be.dataset.boardEdit);
    const bc = e.target.closest("[data-board-copy]"); if (bc) { const b = byId(state.board, bc.dataset.boardCopy); if (b) copyText(boardText(b)); return; }
    const ba = e.target.closest("[data-board-ask]"); if (ba) return askBoard(ba.dataset.boardAsk);
    const sw = e.target.closest("[data-swap]"); if (sw) return askSwap(sw.dataset.swap);
    const so = e.target.closest("[data-swap-ok]"); if (so) return decideSwap(so.dataset.swapOk, true);
    const sn = e.target.closest("[data-swap-no]"); if (sn) return decideSwap(sn.dataset.swapNo, false);
    if (e.target.closest("[data-team-mappe]")) return teamMappe();
    const pk = e.target.closest("[data-pack]"); if (pk && pk.tagName === "INPUT") { savePack((p) => { if (pk.checked) p.done[pk.dataset.pack] = true; else delete p.done[pk.dataset.pack]; }); return; }
    const pr = e.target.closest("[data-pack-rm]"); if (pr) { e.preventDefault(); const id = pr.dataset.packRm; savePack((p) => { if (packTemplate().some((x) => x.id === id)) p.removed[id] = true; p.own = p.own.filter((x) => x.id !== id); delete p.done[id]; }); return; }
    if (e.target.closest("[data-pack-reset]")) { savePack((p) => { p.done = {}; }); return; }
    if (e.target.closest("[data-pack-restore]")) { savePack((p) => { p.removed = {}; }); return; }
  });
  view.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.matches("[data-pack-add]")) { e.preventDefault(); const [t, s] = f.querySelectorAll("input"); const v = t.value.trim(); if (!v) return t.focus(); const sec = s.value.trim() || "Diverses"; t.value = ""; savePack((p) => { p.own.push({ id: "o" + uid(), section: sec, t: v }); }); }
  });
  view.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.fbRess !== undefined) { state.db.doc("feedback/" + t.dataset.fbRess).update({ ressort: t.value }).then(() => toast("Zugewiesen")).catch(handleWriteError); }
  });
