  // =====================================================================
  // Ein Höck-Protokoll als eigene Seite (aus der Protokoll-Liste geöffnet)
  // =====================================================================
  views.prot = {
    shell: () => {
      const e = state.journal.find((x) => x._id === state.protId);
      if (!e) return `${pageHead("Protokoll", "")}<section class="card"><div class="empty"><b>Protokoll nicht gefunden</b>Vielleicht wurde es gelöscht. <button class="link" data-goto="journal">Zur Protokoll-Liste</button></div></section>`;
      const kann = isLaLei() && !isReadOnly() && !isClosed() && !state.asTeam;
      return `<button class="link back-link prot-back" data-goto="journal">← Alle Protokolle</button>${pageHead(esc(e.title || HK[e.kind || "LaLei"].label), `${HK[e.kind || "LaLei"].label} · ${fmt(e.date)} ${e.date ? parse(e.date).getFullYear() : ""}`,
        `<div class="btn-group">${kann ? `<button class="btn primary" data-open-entry="${esc(e._id)}">Bearbeiten</button>` : ""}<button class="btn" data-docx="${esc(e._id)}">Als Word</button></div>`)}<section class="card prot-card" id="prot-body"></section>`;
    },
    update() {
      const e = state.journal.find((x) => x._id === state.protId); const b = $("#prot-body"); if (!e || !b) return;
      b.innerHTML = entryCard(e, { full: true });
    },
  };
  view.addEventListener("click", (ev) => {
    if (ev.target.closest("button, a, input, select, textarea")) return;
    const k = ev.target.closest("[data-prot]"); if (!k) return; state.protId = k.dataset.prot; setView("prot");
  });
  view.addEventListener("keydown", (ev) => { const k = ev.target.closest && ev.target.closest("[data-prot]"); if (k && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); state.protId = k.dataset.prot; setView("prot"); } });
  // gemerkt, damit die Seite nach dem Neuladen wieder da ist
  const setViewOrigProt = setView;
  setView = function (v) { if (v === "prot") store.set("lalei-prot", state.protId || ""); return setViewOrigProt(v); };
  if (!state.protId) state.protId = store.get("lalei-prot") || null;
