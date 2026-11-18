  // =====================================================================
  // Runde 5, Teil 5 und 6: Einkaufsliste (Abteilungen, zusammenfassen, wer, zuteilen, Vorschläge),
  // Anwesenheit schneller, Tagesseite wischen, Anfahrt (versteckt), Gesten am Handy, untere Leiste wählen,
  // Ohne-Netz-Anzeige, Vibrieren, App-Symbol (Zahl, Schnellbefehle), QR im Mehr, Lieblingsseiten am PC,
  // einziges Lager direkt öffnen, automatisch abmelden auf fremden Geräten, Passwort anzeigen,
  // Passwort per E-Mail-Code, neues Lager mit Vorlage
  // =====================================================================
  Object.assign(ERR, { KEINE_EMAIL: "Bei dir ist keine E-Mail-Adresse eingetragen. Bitte den Admin fragen.", CODE_UNGUELTIG: "Der Code ist abgelaufen. Bitte einen neuen anfordern.", CODE_FALSCH: "Der Code stimmt nicht." });

  // ---------- Einkaufsliste ----------
  const ABTEILUNGEN = [
    ["Obst & Gemüse", /apfel|äpfel|banane|birne|orange|zitrone|beere|trauben|kiwi|melone|salat|gurke|tomate|rüebli|karotte|zwiebel|knoblauch|kartoffel|härdöpfel|peperoni|zucchetti|zucchini|lauch|kohl|broccoli|spinat|pilz|kräuter|petersilie|basilikum|obst|gemüse|früchte/i],
    ["Brot & Backwaren", /brot|zopf|gipfeli|brötli|toast|knäcke|tortilla|wraps/i],
    ["Milch & Käse", /milch|joghurt|jogurt|rahm|butter|käse|quark|mozzarella|ei(er)?\b|eier|mascarpone/i],
    ["Fleisch & Fisch", /fleisch|wurst|würst|cervelat|schinken|speck|poulet|hack|steak|fisch|thon|lachs|salami/i],
    ["Vorrat", /teigwaren|pasta|spaghetti|reis|mehl|zucker|salz|pfeffer|öl|essig|gewürz|bouillon|konserve|dose|sauce|ketchup|senf|mayo|müesli|cornflakes|honig|konfi|nutella|schoggi|schokolade|chips|guetzli|kekse|nüsse|tee|kaffee|kakao|ovo/i],
    ["Getränke", /wasser|sirup|saft|cola|eistee|bier|wein|getränk|mineral/i],
    ["Haushalt", /abwasch|spülmittel|schwamm|lappen|papier|wc|abfallsack|kehricht|alufolie|frischhaltefolie|seife|batterie|kerze|zündhölzli|streichholz|grillkohle|anzünder|servietten|teller|becher|besteck/i],
  ];
  const abteilungVon = (t) => (ABTEILUNGEN.find(([, re]) => re.test(t)) || ["Diverses"])[0];
  const shopNorm = (t) => String(t || "").trim().toLowerCase().replace(/\s+/g, " ");
  function mengeSumme(list) {
    const zahlen = list.map((x) => { const m = String(x.qty || "").trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/); return m ? [parseFloat(m[1].replace(",", ".")), m[2].trim().toLowerCase()] : null; });
    if (zahlen.every(Boolean) && new Set(zahlen.map((z) => z[1])).size === 1) { const s = zahlen.reduce((a, z) => a + z[0], 0); return `${Math.round(s * 100) / 100}${zahlen[0][1] ? " " + zahlen[0][1] : "×"}`; }
    if (list.every((x) => !x.qty)) return list.length > 1 ? `${list.length}×` : "";
    return list.map((x) => x.qty || "1").join(" + ");
  }
  views.shop.update = function () {
    const box = $("#shop-list"); if (!box) return; const items = shopItems(); const n = me();
    const add = $("[data-shop-add] input"); if (add && !add.getAttribute("list")) { add.setAttribute("list", "shop-vorschlag"); add.insertAdjacentHTML("afterend", '<datalist id="shop-vorschlag"></datalist>'); }
    const dl = $("#shop-vorschlag"); if (dl) { const alle = [...new Set([...items.map((x) => x.t), ...((cfg().shopVerlauf) || [])].map((x) => String(x).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)); dl.innerHTML = alle.slice(0, 300).map((x) => `<option value="${esc(x)}">`).join(""); }
    const nurMeine = state.shopMeine; const offen = items.filter((x) => !x.done && (!nurMeine || x.wer === n)), done = items.filter((x) => x.done);
    const gruppen = new Map(); for (const x of offen) { const k = shopNorm(x.t); if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(x); }
    const proAbt = new Map(); for (const [k, l] of gruppen) { const a = abteilungVon(l[0].t); if (!proAbt.has(a)) proAbt.set(a, []); proAbt.get(a).push([k, l]); }
    const reihe = [...ABTEILUNGEN.map(([a]) => a), "Diverses"];
    const zeile = (k, l) => { const ids = l.map((x) => x.id).join(","); const wer = [...new Set(l.map((x) => x.wer).filter(Boolean))]; const offenDetail = state.shopOffen === k;
      return `<div class="shop-g"><label class="check-item shop-row"><input type="checkbox" data-shop-grp="${esc(ids)}"><span><b style="font-weight:500">${esc(l[0].t)}</b>${mengeSumme(l) ? ` <span class="muted">· ${esc(mengeSumme(l))}</span>` : ""}${wer.length ? ` <span class="tag plain shop-wer">🛒 ${esc(wer.join(", "))}</span>` : ""}</span><button type="button" class="link shop-mehr" data-shop-detail="${esc(k)}" aria-expanded="${offenDetail}">${l.length > 1 ? `${l.length} Einträge` : esc(l[0].by || "Details")}</button></label>
        ${offenDetail ? `<div class="shop-detail">${l.map((x) => `<div class="shop-d"><span>${esc(x.by || "?")}${x.qty ? ": " + esc(x.qty) : ""}</span><select data-shop-wer="${esc(x.id)}" aria-label="Wer kauft ein"><option value="">Wer kauft ein?</option>${people().map((p) => `<option ${p === x.wer ? "selected" : ""}>${esc(p)}</option>`).join("")}</select><button type="button" class="x" data-shop-rm="${esc(x.id)}" aria-label="Löschen">✕</button></div>`).join("")}</div>` : ""}</div>`; };
    box.innerHTML = `<div class="card-body stack" style="gap:2px">
      <div class="shop-filter"><button class="link" data-shop-meine>${nurMeine ? "Alle anzeigen" : "Nur was ich einkaufe"}</button></div>
      ${offen.length ? reihe.filter((a) => proAbt.has(a)).map((a) => `<div class="sec-label shop-abt">${esc(a)}</div>${proAbt.get(a).map(([k, l]) => zeile(k, l)).join("")}`).join("") : `<span class="muted">${nurMeine ? "Dir ist nichts zugeteilt." : "Nichts mehr zu kaufen."}</span>`}
      ${done.length ? `<div class="sec-label" style="padding:12px 0 4px">Gekauft (${done.length})</div>${done.map((x) => `<label class="check-item shop-row done"><input type="checkbox" data-shop="${esc(x.id)}" checked><span><b style="font-weight:500">${esc(x.t)}</b>${x.qty ? ` <span class="muted">· ${esc(x.qty)}</span>` : ""}</span><button type="button" class="x" data-shop-rm="${esc(x.id)}" aria-label="Löschen">✕</button></label>`).join("")}` : ""}</div>`;
  };
  view.addEventListener("change", (e) => {
    const g = e.target.closest("[data-shop-grp]"); if (g) { const ids = g.dataset.shopGrp.split(","); saveShop(shopItems().map((x) => (ids.includes(x.id) ? { ...x, done: true, doneBy: me(), doneAt: nowStamp() } : x))); return; }
    const w = e.target.closest("[data-shop-wer]"); if (w) { saveShop(shopItems().map((x) => (x.id === w.dataset.shopWer ? { ...x, wer: w.value } : x))); }
  });
  view.addEventListener("click", (e) => {
    const d = e.target.closest("[data-shop-detail]"); if (d) { e.preventDefault(); state.shopOffen = state.shopOffen === d.dataset.shopDetail ? null : d.dataset.shopDetail; return views.shop.update(); }
    if (e.target.closest("[data-shop-meine]")) { state.shopMeine = !state.shopMeine; return views.shop.update(); }
  });
  // Vorschläge: was schon einmal auf der Liste war, bleibt in Erinnerung
  view.addEventListener("submit", (e) => { if (!e.target.matches("[data-shop-add]")) return; const v = ($("input", e.target) || {}).value || ""; const t = v.trim(); if (!t) return; const alt = cfg().shopVerlauf || []; if (!alt.some((x) => shopNorm(x) === shopNorm(t))) writeConfig({ shopVerlauf: [...alt, t].slice(-300) }); }, true);

  // ---------- Anwesenheit: ganzen Tag mit einem Tipp ----------
  view.addEventListener("click", (e) => {
    const td = e.target.closest(".my-att td.nm"); if (!td) return; const tr = td.parentElement; const btns = [...tr.querySelectorAll("[data-myatt]")]; if (!btns.length) return;
    const saved = attDoc("p_" + myId()); const frei = btns.filter((b) => !saved[b.dataset.myatt] || saved[b.dataset.myatt] === "O"); if (!frei.length) return toast("Dieser Tag ist schon eingetragen. Änderungen gehen per Anfrage.");
    const alleDa = frei.every((b) => (state.myAttDraft[b.dataset.myatt] || "O") === "A"); const v = alleDa ? "F" : "A";
    for (const b of frei) state.myAttDraft[b.dataset.myatt] = v; views.myatt.update();
  });

  // ---------- Tagesseite wischen ----------
  let tagWisch = null;
  view.addEventListener("touchstart", (e) => { tagWisch = state.view === "day" && e.touches.length === 1 && !(e.target.closest && e.target.closest("input, textarea, .table-wrap")) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  view.addEventListener("touchend", (e) => {
    if (!tagWisch) return; const dx = e.changedTouches[0].clientX - tagWisch.x, dy = e.changedTouches[0].clientY - tagWisch.y; tagWisch = null; if (Math.abs(dx) < 80 || Math.abs(dy) > 50) return;
    const ds = days(); const i = ds.findIndex((d) => d.id === state.dayId); const n = ds[i + (dx < 0 ? 1 : -1)]; if (!n) return; state.dayId = n.id; render();
  });

  // ---------- Anfahrt: Lageradresse im Notfall-Fenster antippbar ----------
  const showSosOrigS = showSos;
  showSos = function () { showSosOrigS(); const a = $(".overlay .sos-addr b"); const adr = cfg().adresse; if (!a || !adr) return; const ort = cfg().ort; const q = ort ? `${ort.lat},${ort.lon}` : adr;
    a.outerHTML = `<a class="sos-route" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}" target="_blank" rel="noopener"><b>${esc(adr)}</b><span class="muted">Route ›</span></a>`; };

  // ---------- Gesten am Handy: Reiter wischen, Blatt nach unten schliessen, vom Rand zurück ----------
  let g0 = null;
  document.addEventListener("touchstart", (e) => {
    if (!istHandy() || e.touches.length !== 1) { g0 = null; return; } const t = e.touches[0]; const z = e.target.closest ? e.target : null;
    const sheet = z && z.closest(".overlay .drawer-head, .overlay.center .modal .lg-head, .overlay .drawer::before");
    g0 = { x: t.clientX, y: t.clientY, rand: t.clientX < 22 && !$(".overlay") && !$(".viewer"), sheet: sheet ? z.closest(".drawer, .modal") : null, tabs: !$(".overlay") && !!$("#view .page-tabs") && !(z && z.closest("input, textarea, select, .table-wrap, .kanban, .gantt, tr.task, .att-wrap, .page-tabs, .viewer, .wx-tage, .kal-grid")) && state.view !== "day" };
  }, { passive: true });
  document.addEventListener("touchmove", (e) => { if (!g0 || !g0.sheet) return; const dy = e.touches[0].clientY - g0.y; if (dy > 0) g0.sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!g0) return; const t = e.changedTouches[0]; const dx = t.clientX - g0.x, dy = t.clientY - g0.y; const g = g0; g0 = null;
    if (g.sheet) { if (dy > 110) { g.sheet.style.transform = ""; if (!(typeof fragen === "function") || fragen()) closeDrawer(); } else g.sheet.style.transform = ""; return; }
    if (g.rand && dx > 80 && Math.abs(dy) < 60) { const b = $("#ab-back"); if (b && !b.hidden) b.click(); else history.back(); return; }
    if (g.tabs && Math.abs(dx) > 90 && Math.abs(dy) < 45) { const tabs = [...document.querySelectorAll("#view .page-tabs [data-ptab]")]; const i = tabs.findIndex((x) => x.getAttribute("aria-selected") === "true"); const n = tabs[i + (dx < 0 ? 1 : -1)]; if (n) { n.click(); n.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); } }
  });

  // ---------- Kurzes Vibrieren beim Abhaken (Android) ----------
  document.addEventListener("click", (e) => { if (navigator.vibrate && e.target.closest && e.target.closest("[data-qdone], .check-item input, [data-shop-grp], [data-count]")) navigator.vibrate(10); });

  // ---------- Untere Leiste selbst zusammenstellen ----------
  function navLabel(k) { const b = $(`#tabs button[data-view="${k}"]`); return b ? [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim() : k; }
  const bnavKey = () => "lalei-bnav-" + (isLaLei() ? "lalei" : "team");
  function bnavKeys(std) { try { const l = JSON.parse(store.get(bnavKey()) || "null"); if (Array.isArray(l) && l.length === 4 && l.every((k) => viewAllowed(k))) return l; } catch {} return std; }
  function bnavWaehlen() {
    const navs = [...document.querySelectorAll("#tabs button[data-view]")].filter((b) => !b.hidden && viewAllowed(b.dataset.view)); let wahl = bnavKeys(isLaLei() ? ["start", "tasks", "journal", "days"] : ["home", "myatt", "plan", "infos"]);
    const o = modal("", ""); const draw = () => { o.querySelector(".modal").innerHTML = `<div class="lg-head"><span class="eyebrow">Untere Leiste</span><h2>Deine 4 Seiten</h2></div><p class="muted" style="margin:0">${wahl.length} von 4 gewählt</p><div class="bn-wahl">${navs.map((b) => { const k = b.dataset.view; const i = wahl.indexOf(k); return `<button type="button" class="mehr-k ${i >= 0 ? "on" : ""}" data-bnw="${k}">${b.querySelector("svg") ? b.querySelector("svg").outerHTML : ""}<span>${esc(navLabel(k))}</span>${i >= 0 ? `<i>${i + 1}</i>` : ""}</button>`; }).join("")}</div><div class="lg-foot"><button class="link" data-bnw-std>Standard</button><button class="btn primary" data-bnw-ok ${wahl.length === 4 ? "" : "disabled"}>Speichern</button></div>`; };
    o.onclick = (e) => {
      if (e.target === o) return closeDrawer(); const b = e.target.closest("[data-bnw]"); if (b) { const k = b.dataset.bnw; wahl = wahl.includes(k) ? wahl.filter((x) => x !== k) : wahl.length < 4 ? [...wahl, k] : wahl; return draw(); }
      if (e.target.closest("[data-bnw-std]")) { store.set(bnavKey(), ""); closeDrawer(); renderBnav(); return toast("Standard wiederhergestellt"); }
      if (e.target.closest("[data-bnw-ok]")) { store.set(bnavKey(), JSON.stringify(wahl)); closeDrawer(); renderBnav(); toast("Untere Leiste gespeichert"); }
    };
    draw();
  }
  const prefsUpdateOrigS = views.prefs.update;
  views.prefs.update = function () {
    prefsUpdateOrigS(); const card = $("#prefs-body .card .card-body"); if (!card || $("[data-bnav-waehlen]", card)) return;
    card.insertAdjacentHTML("beforeend", `<div class="field"><span>Untere Leiste (Handy)</span><button class="btn" data-bnav-waehlen style="align-self:flex-start">Seiten wählen</button></div>`);
  };
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("[data-bnav-waehlen]")) bnavWaehlen(); });

  // ---------- Ohne Netz: Anzeige oben ----------
  function netzPaint() {
    const ab = $("#appbar"); if (!ab) return; const off = STORE.isOffline && STORE.isOffline(); const w = STORE.wartend ? STORE.wartend() : 0;
    let el = $("#ab-netz"); if (!off && !w) { if (el) el.remove(); return; }
    if (!el) { $(".ab-title", ab).insertAdjacentHTML("afterend", '<span class="ab-netz" id="ab-netz"></span>'); el = $("#ab-netz"); }
    el.textContent = off ? (w ? `Ohne Netz · ${w} wartet` : "Ohne Netz") : `${w} wird gesendet`;
  }
  setInterval(netzPaint, 3000); window.addEventListener("online", netzPaint); window.addEventListener("offline", netzPaint);

  // ---------- App-Symbol: Zahl der Glocke, Schnellbefehle ----------
  const appbarPaintOrigS = appbarPaint;
  appbarPaint = function () { appbarPaintOrigS(); netzPaint(); try { const n = state.lagerId ? bellItems().filter((x) => x.unread).length : 0; if (navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } catch {} };
  function schnellbefehl() {
    const h = location.hash; if (!state.lagerId) return;
    if (h === "#neu-aufgabe" && isLaLei()) { setTimeout(() => openTask("_new"), 300); } else if (h === "#notfall") setTimeout(showSos, 300); else if (h === "#woche") setView("woche"); else return;
    try { history.replaceState(history.state, "", "#" + (state.view || "")); } catch {}
  }
  const openLagerOrigS = openLager;
  openLager = async function (id) { const h = location.hash; const r = await openLagerOrigS(id); if (/^#(neu-aufgabe|notfall|woche)$/.test(h)) { try { history.replaceState(history.state, "", h); } catch {} setTimeout(schnellbefehl, 600); } return r; };

  // ---------- QR-Code des Tools im Mehr-Blatt ----------
  const mehrBlattOrigS = mehrBlatt;
  mehrBlatt = function () { mehrBlattOrigS(); const grids = document.querySelectorAll(".mehr-blatt .mehr-grid"); const g = grids[grids.length - 1]; if (g) g.insertAdjacentHTML("beforeend", `<button type="button" class="mehr-k" data-mehr-qr data-such="qr code link teilen"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/></svg><span>QR-Code</span></button>`); };
  document.addEventListener("click", async (e) => {
    if (!(e.target.closest && e.target.closest("[data-mehr-qr]"))) return; e.stopPropagation(); const link = appLink() || location.origin + location.pathname;
    const o = modal(`<div class="lg-head"><span class="eyebrow">Lager-Tool</span><h2>Zum Scannen</h2></div><div class="qr-gross"><span class="muted">QR-Code wird erstellt …</span></div><div class="muted" style="text-align:center;font-size:13px;word-break:break-all">${esc(link)}</div><div class="lg-foot"><button class="btn" data-qr-copy>Link kopieren</button><button class="btn primary" data-qr-zu>Fertig</button></div>`);
    o.onclick = (ev) => { if (ev.target === o || ev.target.closest("[data-qr-zu]")) return closeDrawer(); if (ev.target.closest("[data-qr-copy]")) { copyText(link); toast("Link kopiert"); } };
    try { const u = await qrDataUrl(link, 280); const b = $(".qr-gross", o); if (b) b.innerHTML = `<img src="${u}" alt="QR-Code zum Lager-Tool" width="280" height="280">`; } catch { const b = $(".qr-gross", o); if (b) b.innerHTML = '<span class="muted">QR-Code konnte nicht erstellt werden (Internet?).</span>'; }
  }, true);

  // ---------- Lieblingsseiten am PC oben in der Seitenleiste ----------
  const favKey = () => "lalei-favoriten-" + (isLaLei() ? "lalei" : "team");
  const favs = () => { try { return JSON.parse(store.get(favKey()) || "[]"); } catch { return []; } };
  function favPaint() {
    const nav = $("#tabs"); if (!nav) return; nav.querySelectorAll(".fav-btn, .fav-label").forEach((x) => x.remove());
    nav.querySelectorAll("button[data-view]:not(.fav-btn)").forEach((b) => { if (!$(".fav-stern", b)) b.insertAdjacentHTML("beforeend", `<span class="fav-stern" data-fav="${b.dataset.view}" title="Oben anheften" aria-hidden="true">☆</span>`); const s = $(".fav-stern", b); const an = favs().includes(b.dataset.view); s.textContent = an ? "★" : "☆"; s.classList.toggle("an", an); });
    const f = favs().filter((k) => { const b = nav.querySelector(`button[data-view="${k}"]`); return b && !b.hidden; }); if (!f.length) return;
    const back = $(".back", nav); let html = `<div class="nav-label fav-label">Favoriten</div>`;
    for (const k of f) { const b = nav.querySelector(`button[data-view="${k}"]:not(.fav-btn)`); const c = b.cloneNode(true); c.classList.add("fav-btn"); c.querySelectorAll(".fav-stern, .count").forEach((x) => x.remove()); html += c.outerHTML; }
    (back || nav.firstChild).insertAdjacentHTML(back ? "afterend" : "beforebegin", html);
    nav.querySelectorAll(".fav-btn").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === state.view)));
  }
  document.addEventListener("click", (e) => { const s = e.target.closest && e.target.closest("[data-fav]"); if (!s) return; e.stopPropagation(); e.preventDefault(); const k = s.dataset.fav; const l = favs(); store.set(favKey(), JSON.stringify(l.includes(k) ? l.filter((x) => x !== k) : [...l, k])); favPaint(); }, true);
  const renderSideOrigS = renderSide;
  renderSide = function () { renderSideOrigS(); favPaint(); };

  // ---------- Einziges aktives Lager direkt öffnen ----------
  const renderStartOrigS = renderStart;
  renderStart = function () {
    renderStartOrigS(); if (state.lagerId || sessionStorage.getItem("lalei-auto-offen")) return;
    const t0 = iso(today()); const aktiv = STORE.lagerList().filter((l) => !l.uebung && !(l.end && l.end < addDays(t0, -35)));
    if (aktiv.length === 1 && !$(".overlay")) { try { sessionStorage.setItem("lalei-auto-offen", "1"); } catch {} const b = $(`[data-open-lager="${CSS.escape(aktiv[0]._id)}"]`); if (b) setTimeout(() => b.click(), 150); }
  };

  // ---------- Fremde Geräte: nach 30 Minuten ohne Benutzung abmelden ----------
  let zuletztAktiv = Date.now();
  ["click", "keydown", "touchstart", "scroll"].forEach((ev) => document.addEventListener(ev, () => { zuletztAktiv = Date.now(); }, { passive: true, capture: true }));
  setInterval(() => {
    if (!state.lagerId) return; let fremd = false; try { fremd = !localStorage.getItem("lalei-sitzung-" + state.lagerId) && !!sessionStorage.getItem("lalei-sitzung-" + state.lagerId); } catch {}
    if (fremd && Date.now() - zuletztAktiv > 30 * 60 * 1000) { zuletztAktiv = Date.now(); const b = $("#logout"); if (b) { b.click(); toast("Aus Sicherheitsgründen abgemeldet (30 Minuten nicht benutzt)."); } }
  }, 60000);

  // ---------- Passwort anzeigen ----------
  function augen(root) { (root || document).querySelectorAll('input[type="password"]:not([data-auge])').forEach((i) => { i.dataset.auge = "1"; const w = document.createElement("span"); w.className = "pw-wrap"; i.before(w); w.append(i); w.insertAdjacentHTML("beforeend", '<button type="button" class="pw-auge" aria-label="Passwort anzeigen" title="Passwort anzeigen">👁</button>'); }); }
  new MutationObserver(() => { if (document.querySelector('input[type="password"]:not([data-auge])')) augen(); }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest(".pw-auge"); if (!b) return; e.preventDefault(); const i = b.parentElement.querySelector("input"); const zeig = i.type === "password"; i.type = zeig ? "text" : "password"; b.classList.toggle("an", zeig); b.setAttribute("aria-label", zeig ? "Passwort verbergen" : "Passwort anzeigen"); });

  // ---------- Passwort per E-Mail-Code zurücksetzen ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-pw-reset]"); if (!b) return; e.preventDefault(); const [lager, person, name] = b.dataset.pwReset.split("|");
    const st = { schritt: 1, an: "", err: "", busy: false };
    const o = modal("", "login-modal");
    const draw = () => { o.querySelector(".modal").innerHTML = `<div class="lg-head"><span class="eyebrow">Passwort vergessen</span><h2>${esc(name || "")}</h2></div>
      ${st.schritt === 1 ? `<p style="margin:0">Wir schicken dir einen Code an die E-Mail-Adresse, die bei dir im Lager eingetragen ist.</p><div class="lg-foot"><button class="link" data-pr-zu>Abbrechen</button><button class="btn primary" data-pr-send ${st.busy ? "disabled" : ""}>${st.busy ? "Wird gesendet …" : "Code schicken"}</button></div>`
        : `<p style="margin:0">Code an <b>${esc(st.an)}</b> geschickt. Er gilt 30 Minuten.</p><form class="stack" style="gap:12px" data-pr-form><label class="field"><span>Code aus der E-Mail</span><input id="pr-code" inputmode="numeric" autocomplete="one-time-code" required></label><label class="field"><span>Neues Passwort (mind. 6 Zeichen)</span><input type="password" id="pr-n1" autocomplete="new-password" minlength="6" required></label><button class="btn primary" ${st.busy ? "disabled" : ""}>${st.busy ? "Wird geprüft …" : "Passwort festlegen"}</button></form>${st.vorschau ? `<p class="hint wichtig" style="margin:0">Vorschau: Der Code lautet ${esc(st.vorschau)}</p>` : ""}`}
      ${st.err ? `<p class="login-err" role="alert">${esc(st.err)}</p>` : ""}`; };
    o.onclick = async (ev) => {
      if (ev.target === o || ev.target.closest("[data-pr-zu]")) { closeDrawer(); return showLogin(lager); }
      if (!ev.target.closest("[data-pr-send]")) return; st.busy = true; st.err = ""; draw();
      try { const r = await STORE.pwResetStart(lager, person); st.an = r.an || "deine Adresse"; st.vorschau = r.previewCode || ""; st.schritt = 2; } catch (err) { st.err = errMsg(err); } st.busy = false; draw();
    };
    o.onsubmit = async (ev) => { ev.preventDefault(); st.busy = true; st.err = ""; const code = $("#pr-code", o).value, pw = $("#pr-n1", o).value; draw();
      try { await STORE.pwResetDone(lager, person, code, pw); closeDrawer(); toast("Neues Passwort gespeichert. Melde dich jetzt damit an."); showLogin(lager); } catch (err) { st.err = errMsg(err); st.busy = false; draw(); } };
    draw();
  }, true);

  // ---------- Neues Lager: Vorlage (z.B. HeLa) mit Aufgaben und Packliste gleich übernehmen ----------
  document.addEventListener("click", async (e) => {
    const s = e.target.closest && e.target.closest("#nl-vorlage-laden"); if (!s) return; const pw = ($("#nl-admin") || {}).value; if (!pw) return toast("Zuerst unten das Admin-Passwort eingeben.");
    try { const v = await STORE.admin(pw, "getVorlagen"); const namen = [...new Set([...(v.tasks || []), ...(v.pack || [])].map((x) => x.name))]; const sel = $("#nl-vorlage"); sel.innerHTML = `<option value="">Keine</option>${namen.map((n) => `<option>${esc(n)}</option>`).join("")}`; sel.hidden = false; s.hidden = true; state.nlVorlagen = v; } catch (err) { toast(errMsg(err)); }
  });
  const renderStartOrigV = renderStart;
  renderStart = function () { renderStartOrigV(); const f = $("#nl-tpl"); if (f && !$("#nl-vorlage")) f.closest(".field, label").insertAdjacentHTML("afterend", `<label class="field"><span>Vorlage für Aufgaben und Packliste</span><button type="button" class="btn small" id="nl-vorlage-laden" style="align-self:flex-start">Vorlagen laden</button><select id="nl-vorlage" class="input" hidden></select></label>`); };
  const createLagerOrigV = createLager;
  createLager = async function () {
    const name = ($("#nl-vorlage") || {}).value || ""; const v = state.nlVorlagen; const pw = ($("#nl-admin") || {}).value; const titel = ($("#nl-title") || {}).value.trim(); const start = ($("#nl-start") || {}).value || ($("#nl-prep") || {}).value;
    const vorher = new Set(STORE.lagerList().map((l) => l._id)); await createLagerOrigV();
    if (!name || !v || !pw) return; const neu = STORE.lagerList().find((l) => !vorher.has(l._id) && l.title === titel); if (!neu) return;
    const tv = (v.tasks || []).find((x) => x.name === name), pv = (v.pack || []).find((x) => x.name === name); const now = nowStamp(); const ops = [];
    if (tv) tv.items.forEach((t, i) => ops.push({ op: "set", coll: `${neu._id}:tasks`, id: "v" + uid() + i, data: { title: t.title, ressort: t.ressort, teil: t.teil || "", owner: "", support: "", status: "Offen", deadline: start && t.offset != null ? addDays(start, t.offset) : "", note: t.note || "", checklist: t.checklist || [], links: [], ongoing: !!t.ongoing, repeat: t.repeat || "", star: !!t.star, order: Date.now() + i, createdAt: now, updatedAt: now, log: [{ at: now, by: "Vorlage", text: `Aus Vorlage «${name}»` }] } }));
    if (pv) ops.push({ op: "update", coll: `${neu._id}:config`, id: "main", data: { packlist: pv.items.map((x) => ({ id: "t" + uid(), section: x.section, t: x.t, ...(x.lalei ? { lalei: true } : {}) })) } });
    try { for (let i = 0; i < ops.length; i += 300) await STORE.writeRaw(pw, ops.slice(i, i + 300)); if (ops.length) toast(`Vorlage «${name}» übernommen`); } catch (err) { toast(errMsg(err)); }
  };
