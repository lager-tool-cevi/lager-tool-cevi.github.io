  // =====================================================================
  // Ruhiger: Erklärtexte neben Kartentiteln weglassen (kurze Zahlen wie «4 von 6 erledigt» bleiben)
  // =====================================================================
  function beruhigen() {
    const v = $("#view"); if (!v) return; v.dataset.v = state.view || "";
    v.querySelectorAll(".card-head > span.muted, .card-head > .muted:not(button)").forEach((s) => {
      const t = s.textContent.trim(); const kurz = t.length <= 24 || /^\d|\bvon\b \d|^seit |^bis |^zuletzt /i.test(t) && t.length <= 40;
      s.classList.toggle("erklaerung", !kurz);
    });
  }
  const renderOrigRuhig = render;
  render = function () { renderOrigRuhig(); beruhigen(); };
  const refreshOrigRuhig = refresh;
  refresh = function (force) { refreshOrigRuhig(force); beruhigen(); };
