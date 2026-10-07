"use strict";
/* =====================================================================
   Téléphone (écran étroit) :
   - la fiche devient un panneau qui glisse depuis le bas (réduit / moitié / plein écran) ;
   - les réglages (générations, langue, thème…) passent dans un menu ☰ ;
   - sur la carte, les filtres s'ouvrent avec un bouton et la légende se replie.
   Sur ordinateur, rien ne change.
   ===================================================================== */
(function () {
  const mq = window.matchMedia("(max-width: 800px)");
  const layout = document.querySelector(".layout");
  const panel = $("panel"), grip = $("sheetGrip");
  const PEEK = 118;                      // hauteur de la fiche réduite (nom + dates)
  const sheet = { state: "peek", h: PEEK };

  const mobile = () => mq.matches;
  const heights = () => {
    const H = layout.clientHeight;
    return { peek: Math.min(PEEK, H * 0.4), half: Math.round(H * 0.5), full: Math.round(H - 12) };
  };

  // hauteur cachée par la fiche (utilisée pour centrer l'arbre et la carte dans la partie visible)
  window.sheetInset = () => (mobile() ? sheet.h + 22 : 0);

  function setHeight(px, animate) {
    sheet.h = px;
    layout.classList.toggle("sheet-anim", !!animate);
    layout.style.setProperty("--sheet-h", px + "px");
    document.documentElement.style.setProperty("--sheet-h", px + "px");   // pour les messages (toast)
  }

  function setState(st, { recenter = false } = {}) {
    sheet.state = st;
    setHeight(heights()[st], true);
    layout.dataset.sheet = st;
    grip.setAttribute("aria-expanded", st === "peek" ? "false" : "true");
    if (st === "peek") panel.scrollTop = 0;
    if (recenter) setTimeout(recenterVisible, 260);
  }

  // la personne choisie doit rester visible au-dessus de la fiche
  function recenterVisible() {
    if (!mobile()) return;
    if (!$("canvas").hidden) {
      const root = document.querySelector(".card.root");
      if (!root) return;
      const r = root.getBoundingClientRect(), c = $("canvas").getBoundingClientRect();
      const bottom = c.bottom - window.sheetInset();
      if (r.bottom > bottom - 8 || r.top < c.top || r.right < c.left || r.left > c.right) centerView(true);
    } else if (window.mapRefresh && typeof MAP !== "undefined" && MAP.map) {
      MAP.map.invalidateSize();
    }
  }

  /* ---------------- glisser la poignée (ou le haut de la fiche) */
  let drag = null;
  function onDown(e) {
    if (!mobile() || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag = { y: e.clientY, h0: sheet.h, moved: false, id: e.pointerId, t: performance.now() };
  }
  window.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) < 6) return;
    drag.moved = true;
    const H = heights();
    setHeight(Math.max(H.peek, Math.min(H.full, drag.h0 - dy)), false);
  });
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.moved) return;           // simple appui : géré par le "click"
    const H = heights();
    const v = (d.h0 - sheet.h) / Math.max(1, performance.now() - d.t);   // vitesse (px/ms, > 0 vers le bas)
    let st;
    if (v > 0.6) st = sheet.h > H.half ? "half" : "peek";              // lancé vers le bas
    else if (v < -0.6) st = sheet.h < H.half ? "half" : "full";        // lancé vers le haut
    else st = ["peek", "half", "full"].reduce((a, b) => (Math.abs(H[b] - sheet.h) < Math.abs(H[a] - sheet.h) ? b : a));
    setState(st, { recenter: true });
    const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener("click", stop, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
  }
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  grip.addEventListener("pointerdown", onDown);
  // on peut aussi attraper la fiche par son en-tête (photo + nom)
  panel.addEventListener("pointerdown", (e) => { if (e.target.closest(".hero")) onDown(e); });

  const toggle = () => setState(sheet.state === "peek" ? "half" : "peek", { recenter: true });
  grip.addEventListener("click", toggle);
  grip.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  // fiche réduite : toucher le nom l'ouvre
  panel.addEventListener("click", (e) => {
    if (mobile() && sheet.state === "peek" && e.target.closest(".hero")) setState("half", { recenter: true });
  });

  /* ---------------- menu ☰ (réglages) */
  const menuBtn = $("menuBtn"), controls = $("controls");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  menuBtn.addEventListener("click", (e) => { e.stopPropagation(); setMenu(!document.body.classList.contains("menu-open")); });
  document.addEventListener("click", (e) => {
    if (document.body.classList.contains("menu-open") && !controls.contains(e.target) && e.target !== menuBtn) setMenu(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------------- carte : filtres et légende repliables */
  const ctlBtn = $("mapCtlBtn"), ctl = $("mapCtl"), legend = $("mapLegend");
  ctlBtn.addEventListener("click", () => {
    const open = !ctl.classList.contains("open");
    ctl.classList.toggle("open", open);
    ctlBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  legend.addEventListener("click", () => legend.classList.toggle("open"));

  /* ---------------- passage ordinateur <-> téléphone */
  function apply() {
    if (mobile()) {
      setState(sheet.state);
    } else {
      layout.style.removeProperty("--sheet-h");
      document.documentElement.style.removeProperty("--sheet-h");
      delete layout.dataset.sheet;
      setMenu(false);
    }
  }
  mq.addEventListener("change", () => { apply(); if (!$("canvas").hidden) centerView(false); });
  let lastH = layout.clientHeight;
  window.addEventListener("resize", () => {
    if (!mobile() || layout.clientHeight === lastH) return;
    lastH = layout.clientHeight;
    setHeight(heights()[sheet.state], false);
  });
  layout.dataset.sheet = "peek";
  apply();
})();
