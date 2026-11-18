  // =====================================================================
  // Runde 5, Teil 3: Umfragen auf der Pinnwand, Höck «wie der letzte», Traktandum auf den nächsten Höck,
  // Traktandenliste per Ziehen, im Höck-Modus: Anwesende abhaken und Ressort-Runde
  // =====================================================================

  // ---------- Umfragen auf der Pinnwand (Stimmen liegen bei den Reaktionen, eine Stimme pro Person) ----------
  const stimmenVon = (b) => (state.react || []).filter((r) => r.board === b._id + "#umfrage");
  function umfrageHtml(b) {
    const opt = b.umfrage || []; if (opt.length < 2) return "";
    const st = stimmenVon(b); const meine = (st.find((r) => r.person === myId()) || {}).wahl || [];
    const zahl = (i) => st.filter((r) => (r.wahl || []).includes(i)).length; const total = st.length;
    const darf = !isReadOnly() && !state.asTeam && !isClosed() && myId();
    return `<div class="umfrage" role="group" aria-label="Umfrage">${opt.map((o, i) => { const n = zahl(i); const p = total ? Math.round((n / total) * 100) : 0; const an = meine.includes(i);
      return `<button type="button" class="uf-opt ${an ? "on" : ""}" ${darf ? `data-uf-vote="${esc(b._id)}|${i}"` : "disabled"} aria-pressed="${an}" title="${esc(st.filter((r) => (r.wahl || []).includes(i)).map((r) => r.name).join(", "))}"><span class="uf-bar" style="width:${p}%"></span><span class="uf-t">${an ? "✓ " : ""}${esc(o)}</span><span class="uf-n">${n}</span></button>`; }).join("")}<span class="muted uf-tot">${total} ${total === 1 ? "Stimme" : "Stimmen"}${b.umfrageMehr ? " · mehrere möglich" : ""}</span></div>`;
  }
  document.addEventListener("click", async (e) => {
    const v = e.target.closest && e.target.closest("[data-uf-vote]"); if (!v) return;
    const [bid, i] = v.dataset.ufVote.split("|"); const b = (state.board || []).find((x) => x._id === bid); if (!b) return;
    const id = `${bid}v~${myId()}`; const alt = (stimmenVon(b).find((r) => r.person === myId()) || {}).wahl || []; const n = +i;
    let wahl = b.umfrageMehr ? (alt.includes(n) ? alt.filter((x) => x !== n) : [...alt, n]) : alt.includes(n) ? [] : [n];
    try { await state.db.batch([wahl.length ? { op: "set", coll: "react", id, data: { board: bid + "#umfrage", person: myId(), name: me(), wahl, at: nowStamp() } } : { op: "delete", coll: "react", id }]); }
    catch (err) { toast(STORE.isGas && /BERECHTIGUNG|KEINE/.test(String(err && err.message)) ? "Abstimmen geht erst, wenn die neue Code.gs eingesetzt ist." : errMsg(err)); }
  });

  // ---------- Neuer Höck bzw. neues Protokoll «wie der letzte» ----------
  const openEntryOrigQ = openEntry;
  openEntry = function (type, id, prefill) {
    if (!id && !prefill) {
      if (type === "hoeck") { const l = state.hoecks.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0]; if (l) prefill = { kind: l.kind || "LaLei", time: l.time || "19:30", place: l.place || "" }; }
      if (type === "meeting") { const l = sortEntries(state.journal.filter((e) => typeOf(e) === "meeting"))[0]; if (l) prefill = { kind: l.kind || "LaLei", present: (l.present || []).filter((p) => people().includes(p)) }; }
    }
    return openEntryOrigQ(type, id, prefill);
  };

  // ---------- Traktandum auf den nächsten Höck schieben ----------
  async function aufNaechstenHoeck(i) {
    if (!ed || ed.type !== "meeting") return; const it = ed.draft.items[i]; if (!it) return;
    const now = nowStamp();
    try {
      await state.db.collection("journal").add({ type: "idea", title: it.title || "Traktandum", text: it.notes || "", by: me(), forDate: "", status: "Offen", date: iso(today()), createdAt: now, updatedAt: now, updatedBy: me() });
      ed.draft.items.splice(i, 1); if (!ed.draft.items.length) ed.draft.items.push({ id: uid(), title: "", notes: "", decision: "", links: [] }); ed.touched = true;
      toast("Kommt auf die Liste für den nächsten Höck"); return true;
    } catch (err) { handleWriteError(err); }
  }
  const renderEntryOrigQ = renderEntryDrawer;
  renderEntryDrawer = function () {
    renderEntryOrigQ(); const o = $(".overlay"); if (!ed || ed.type !== "meeting" || !o || isReadOnly()) return;
    o.querySelectorAll(".titem-head").forEach((h) => { const inp = h.querySelector("input[data-i]"); if (!inp || h.querySelector("[data-naechster]")) return; h.insertAdjacentHTML("beforeend", `<button type="button" class="btn small ghost" data-naechster="${inp.dataset.i}" title="Nicht besprochen: auf den nächsten Höck schieben" aria-label="Auf den nächsten Höck schieben">→ später</button>`); });
  };
  document.addEventListener("click", async (e) => { const b = e.target.closest && e.target.closest("[data-naechster]"); if (!b) return; e.stopPropagation(); if (await aufNaechstenHoeck(+b.dataset.naechster)) renderEntryDrawer(); }, true);

  // ---------- Traktandenliste: per Ziehen sortieren (PC) ----------
  let agZiehe = null;
  document.addEventListener("dragstart", (e) => { const it = e.target.closest && e.target.closest(".ag-item"); if (!it) return; agZiehe = [...it.parentElement.children].indexOf(it); it.classList.add("dragging"); });
  document.addEventListener("dragover", (e) => { const it = agZiehe !== null && e.target.closest && e.target.closest(".ag-item"); if (!it) return; e.preventDefault(); document.querySelectorAll(".ag-item.drop-vor").forEach((x) => x.classList.remove("drop-vor")); it.classList.add("drop-vor"); });
  document.addEventListener("drop", (e) => {
    const it = agZiehe !== null && e.target.closest && e.target.closest(".ag-item"); if (!it) return; e.preventDefault();
    let von = agZiehe; const nach = [...it.parentElement.children].indexOf(it); agZiehe = null; if (von === nach) return;
    while (von !== nach) { const b = document.querySelector(`.overlay [data-ag-${von < nach ? "down" : "up"}="${von}"]`); if (!b) break; b.click(); von += von < nach ? 1 : -1; }
  });
  document.addEventListener("dragend", () => { agZiehe = null; document.querySelectorAll(".ag-item.dragging, .ag-item.drop-vor").forEach((x) => x.classList.remove("dragging", "drop-vor")); });
  new MutationObserver(() => { document.querySelectorAll(".overlay .ag-item:not([draggable])").forEach((x) => (x.draggable = true)); }).observe(document.body, { childList: true, subtree: true });

  // ---------- Höck-Modus: Anwesende abhaken und Ressort-Runde ----------
  let hmPanel = null;
  function hmErgaenzen(box) {
    if (!ed || ed.type !== "meeting") return;
    const top = $(".hm-top", box); if (top && !$("[data-hm-anw]", top)) $("[data-hm-close]", top).insertAdjacentHTML("beforebegin", `<button class="btn small" data-hm-anw>Anwesend ${(ed.draft.present || []).length}</button>`);
    const nav = $(".hm-nav", box); if (nav && !$("[data-hm-runde]", nav)) nav.insertAdjacentHTML("afterbegin", `<button type="button" data-hm-runde class="${hmPanel === "runde" ? "on" : ""}">Ressort-Runde</button>`);
    const main = $(".hm-main", box); if (main && !$("[data-hm-weg]", main) && !hmPanel) { const ti = $(".hm-title", main); if (ti) ti.insertAdjacentHTML("afterend", `<button class="link hm-weg" data-hm-weg>Nicht besprochen: auf den nächsten Höck schieben</button>`); }
    if (hmPanel && main && !main.dataset.panel) { main.dataset.panel = hmPanel; main.innerHTML = hmPanel === "anw" ? anwHtml() : rundeHtml(); }
  }
  function anwHtml() {
    const pool = (ed.draft.kind || "LaLei") === "Team" ? people() : [...new Set([...peopleBy("LaLei"), ...people()])];
    return `<span class="eyebrow">Wer ist am Höck?</span><div class="present hm-present">${pool.map((p) => `<button type="button" data-hm-pres="${esc(p)}" aria-pressed="${(ed.draft.present || []).includes(p)}">${av(p)}${esc(p)}</button>`).join("")}</div><button class="btn primary" data-hm-panel-zu style="align-self:flex-start">Weiter zu den Traktanden</button>`;
  }
  function rundeHtml() {
    const t0 = iso(today()), lim = addDays(t0, 14); const kann = isLaLei() && !isReadOnly() && !isClosed();
    const blocks = ressorts().map((r) => { const l = allTasks().filter((t) => t.ressort === r.name && t.status !== "Erledigt" && t.deadline && t.deadline <= lim); return [r, l]; }).filter(([, l]) => l.length);
    return `<span class="eyebrow">Ressort-Runde · überfällig und in den nächsten 2 Wochen fällig</span>${blocks.length ? blocks.map(([r, l]) => `<div class="runde-r"><h3>${ressDot(r.name)}${esc(r.name)}${r.lead ? ` <span class="muted">· ${esc(r.lead)}</span>` : ""}</h3>${l.map((t) => `<div class="runde-t ${isLate(t) ? "late" : ""}"><div class="runde-tt"><b>${esc(t.title)}</b><small>${t.owner ? esc(t.owner) + " · " : ""}${isLate(t) ? "überfällig, " : ""}${relDay(t.deadline)} · ${esc(t.status)}</small></div>${kann ? `<div class="runde-a"><button class="btn small" data-rd="${esc(t._id)}|done">✓ Erledigt</button><button class="btn small" data-rd="${esc(t._id)}|run">Läuft</button><button class="btn small" data-rd="${esc(t._id)}|w">+1 Woche</button><select data-rd-owner="${esc(t._id)}" aria-label="Verantwortlich">${personOptions(t.owner, "Niemand")}</select></div>` : ""}</div>`).join("")}</div>`).join("") : '<div class="empty"><b>Alles im grünen Bereich</b></div>'}
      <button class="btn primary" data-hm-panel-zu style="align-self:flex-start">Zurück zu den Traktanden</button>`;
  }
  const hmNeu = () => { const box = $(".hoeck-mode"); if (!box) return; const m = $(".hm-main", box); if (m) { delete m.dataset.panel; } hmErgaenzen(box); };
  new MutationObserver(() => { const box = $(".hoeck-mode"); if (box) hmErgaenzen(box); else hmPanel = null; }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", async (e) => {
    if (!e.target.closest || !e.target.closest(".hoeck-mode")) return; const box = $(".hoeck-mode");
    if (e.target.closest("[data-hm-go], [data-hm-prev], [data-hm-next], [data-hm-add]")) { hmPanel = null; return; }
    if (e.target.closest("[data-hm-anw]")) { e.stopPropagation(); hmPanel = hmPanel === "anw" ? null : "anw"; const m = $(".hm-main", box); if (hmPanel) { delete m.dataset.panel; hmErgaenzen(box); } else hmDraw && hmDraw(); return; }
    if (e.target.closest("[data-hm-runde]")) { e.stopPropagation(); hmPanel = hmPanel === "runde" ? null : "runde"; if (hmPanel) { hmNeu(); box.querySelectorAll(".hm-nav button").forEach((x) => x.classList.toggle("on", x.matches("[data-hm-runde]"))); } else hmDraw && hmDraw(); return; }
    if (e.target.closest("[data-hm-panel-zu]")) { e.stopPropagation(); hmPanel = null; hmDraw && hmDraw(); return; }
    const pr = e.target.closest("[data-hm-pres]"); if (pr) { e.stopPropagation(); const n = pr.dataset.hmPres; const s = new Set(ed.draft.present || []); s.has(n) ? s.delete(n) : s.add(n); ed.draft.present = people().filter((x) => s.has(x)); ed.touched = true; pr.setAttribute("aria-pressed", String(s.has(n))); const b = $("[data-hm-anw]", box); if (b) b.textContent = `Anwesend ${ed.draft.present.length}`; return; }
    if (e.target.closest("[data-hm-weg]")) { e.stopPropagation(); const cur = [...box.querySelectorAll(".hm-nav [data-hm-go]")].findIndex((x) => x.classList.contains("on")); if (cur >= 0 && await aufNaechstenHoeck(cur)) hmDraw && hmDraw(); return; }
    const rd = e.target.closest("[data-rd]"); if (rd) { e.stopPropagation(); const [id, a] = rd.dataset.rd.split("|"); const t = state.tasks.get(id); if (!t) return;
      if (a === "done") await setStatus(id, "Erledigt"); if (a === "run") await setStatus(id, "Läuft"); if (a === "w") await writeTask(id, { deadline: addDays(t.deadline, 7) }, `Deadline: ${fmtFull(addDays(t.deadline, 7))} (Ressort-Runde)`);
      hmNeu(); return; }
  }, true);
  document.addEventListener("change", async (e) => { const s = e.target.closest && e.target.closest("[data-rd-owner]"); if (!s) return; await writeTask(s.dataset.rdOwner, { owner: s.value }, `Verantwortlich: ${s.value || "niemand"} (Ressort-Runde)`); hmNeu(); });
