"use strict";
/* =====================================================================
   Vue « Carte » : où sont nés, se sont mariés et sont morts les ancêtres.
   Les lieux sont géolocalisés une seule fois (code INSEE via geo.api.gouv.fr,
   sinon OpenStreetMap/Nominatim) puis mémorisés dans data/lieux.json.
   ===================================================================== */

const MAP = {
  map: null, markers: null, lines: null,
  places: {},            // "lieu" -> {lat, lon} | null (introuvable)
  loaded: false,
  geocoding: false, progress: { done: 0, total: 0 },
  mode: store.get("map.mode", "anc"),               // "anc" : ancêtres de la personne sélectionnée, "all" : tout l'arbre
  groups: store.get("map.groups", { birth: true, marr: true, death: true, other: false }),
  migrations: store.get("map.migr", true),
  placing: null,          // lieu en cours de placement manuel
  lastRoot: null,
};

const EV_GROUP = { BIRT: "birth", BAPM: "birth", CHR: "birth", DEAT: "death", BURI: "death", CREM: "death", MARR: "marr" };
const GROUP_LABEL = { birth: "Naissances", marr: "Mariages", death: "Décès", other: "Autres (résidence…)" };
const ERAS = [
  { max: 1800, label: "avant 1800", color: "#a78bfa" },
  { max: 1850, label: "1800 – 1849", color: "#60a5fa" },
  { max: 1900, label: "1850 – 1899", color: "#22d3ee" },
  { max: 1950, label: "1900 – 1949", color: "#34d399" },
  { max: 99999, label: "depuis 1950", color: "#fbbf24" },
];
const NO_DATE = "#94a3b8";
const eraColor = (y) => (y ? ERAS.find((e) => y < e.max).color : NO_DATE);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ------------------------------------------------------------- données */
function ancestorsOf(id) {
  const gen = new Map([[id, 0]]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift();
    const { father, mother } = parentsOf(cur);
    for (const p of [father, mother]) {
      if (p && P(p) && !gen.has(p)) { gen.set(p, gen.get(cur) + 1); queue.push(p); }
    }
  }
  return gen;
}

function allPlaceNames() {
  const s = new Set();
  for (const p of Object.values(state.data.persons)) for (const e of p.events) if (e.place) s.add(e.place.trim());
  for (const f of Object.values(state.data.families)) for (const e of f.events) if (e.place) s.add(e.place.trim());
  return [...s];
}

function shortPlace(place) {
  const parts = place.split(",").map((x) => x.trim()).filter((x) => x && !/^\d+$/.test(x) && !/^(\d{5}|2[AB]\d{3})$/.test(x));
  return parts.slice(0, 2).join(", ") || place;
}

function collectEvents() {
  const set = MAP.mode === "anc" && state.root ? ancestorsOf(state.root) : new Map(Object.keys(state.data.persons).map((id) => [id, null]));
  const out = [];
  for (const id of set.keys()) {
    const p = P(id);
    if (!p) continue;
    for (const e of p.events) {
      const g = EV_GROUP[e.tag] || "other";
      if (!e.place || (!MAP.groups[g] && id !== state.root)) continue;
      out.push({ pids: [id], tag: e.tag, group: g, place: e.place.trim(), year: +yearOf(e.date) || null, date: e.date });
    }
  }
  {
    for (const f of Object.values(state.data.families)) {
      if (!((f.husb && set.has(f.husb)) || (f.wife && set.has(f.wife)))) continue;
      if (!MAP.groups.marr && f.husb !== state.root && f.wife !== state.root) continue;
      for (const e of f.events) {
        if (!e.place) continue;
        out.push({ pids: [f.husb, f.wife].filter((x) => x && P(x)), tag: e.tag, group: "marr", place: e.place.trim(), year: +yearOf(e.date) || null, date: e.date });
      }
    }
  }
  return { set, events: out };
}

function birthPlace(id) {
  const p = P(id);
  const e = p && findEvent(p, ["BIRT", "BAPM", "CHR"]);
  return e && e.place ? e.place.trim() : null;
}

/* ------------------------------------------------------------- géolocalisation */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastNominatim = 0;

async function nominatim(q) {
  const wait = 1100 - (Date.now() - lastNominatim);   // max 1 requête / seconde (règle d'OpenStreetMap)
  if (wait > 0) await sleep(wait);
  lastNominatim = Date.now();
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr&q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error("nominatim " + r.status);
  const j = await r.json();
  return j[0] ? { lat: +j[0].lat, lon: +j[0].lon, src: "osm" } : null;
}

// Geneanet met un code à 5 chiffres aussi pour l'étranger (ex. « Setif, 19001, , Sétif, Algérie ») :
// ce n'est un code INSEE que si le lieu est en France.
function isFrench(place) {
  const parts = place.split(",").map((x) => x.trim()).filter(Boolean);
  const last = norm(parts[parts.length - 1] || "");
  return last === "france" || !/[a-z]/.test(last) || parts.length <= 2;
}

async function geocodeOne(place) {
  const parts = place.split(",").map((x) => x.trim()).filter(Boolean);
  const insee = isFrench(place) ? parts.find((x) => /^(\d{5}|2[AB]\d{3})$/.test(x)) : null;
  if (insee) {
    try {
      const r = await fetch(`https://geo.api.gouv.fr/communes/${insee}?fields=nom,centre`);
      if (r.ok) {
        const j = await r.json();
        // on vérifie que le code correspond bien à la commune écrite
        if (j.centre && norm(j.nom).replace(/[^a-z]/g, "") === norm(parts[0]).replace(/[^a-z]/g, "")) {
          return { lat: j.centre.coordinates[1], lon: j.centre.coordinates[0], src: "insee" };
        }
      }
    } catch { /* on tente OpenStreetMap */ }
  }
  const words = parts.filter((x) => !/^\d+$/.test(x) && !/^(\d{5}|2[AB]\d{3})$/.test(x));
  const tries = [...new Set([words.join(", "), words.length > 2 ? `${words[0]}, ${words[words.length - 1]}` : null,
    words.length > 1 ? words.slice(1).join(", ") : null].filter(Boolean))];
  for (const q of tries) {
    const res = await nominatim(q);
    if (res) return res;
  }
  return null;
}

async function geocodeMissing() {
  if (MAP.geocoding) return;
  const missing = allPlaceNames().filter((p) => !(p in MAP.places));
  if (!missing.length) return;
  MAP.geocoding = true;
  MAP.progress = { done: 0, total: missing.length };
  renderControls();
  let batch = {};
  const flush = async () => {
    if (!Object.keys(batch).length) return;
    Object.assign(MAP.places, batch);  // affichés tout de suite, même si l'enregistrement échoue
    try {
      const res = await fetch("/api/places", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates: batch }) });
      if (res.ok) MAP.places = { ...MAP.places, ...(await res.json()) };
      else if (res.status === 404) MAP.serverOld = true;
    } catch { /* serveur arrêté */ }
    batch = {};
    drawMap(false);
  };
  let offline = 0;
  for (const place of missing) {
    try {
      batch[place] = await geocodeOne(place);
      offline = 0;
    } catch {
      // pas d'internet ou service indisponible : on n'enregistre rien, on réessaiera plus tard
      if (++offline >= 3) break;
    }
    MAP.progress.done++;
    renderControls();
    if (Object.keys(batch).length >= 5) await flush();
  }
  await flush();
  MAP.geocoding = false;
  if (offline >= 3) toast("Impossible de joindre le service de cartographie (connexion internet ?).", true);
  renderControls();
}

async function savePlace(place, value) {
  MAP.places[place] = value;
  const res = await fetch("/api/places", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates: { [place]: value } }) });
  if (res.ok) MAP.places = { ...MAP.places, ...(await res.json()) };
}

/* ------------------------------------------------------------- dessin */
function ensureMap() {
  if (MAP.map) return;
  const isDark = () => document.documentElement.dataset.theme === "dark";
  MAP.map = L.map("map", { zoomControl: false, worldCopyJump: true, preferCanvas: false }).setView([46.6, 2.4], 5);
  L.control.zoom({ position: "topright" }).addTo(MAP.map);
  // fond OpenStreetMap (gratuit, sans clé) ; en mode sombre on l'assombrit en CSS
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(MAP.map);
  $("map").classList.toggle("dark-tiles", isDark());
  window.addEventListener("themechange", () => $("map").classList.toggle("dark-tiles", isDark()));
  MAP.lines = L.layerGroup().addTo(MAP.map);
  MAP.markers = L.layerGroup().addTo(MAP.map);
  MAP.map.on("click", async (e) => {
    if (!MAP.placing) return;
    const place = MAP.placing;
    MAP.placing = null;
    $("map").classList.remove("placing");
    await savePlace(place, { lat: +e.latlng.lat.toFixed(5), lon: +e.latlng.lng.toFixed(5), manual: true });
    toast(`« ${shortPlace(place)} » placé`);
    drawMap(false);
  });
  // liens dans les bulles
  $("map").addEventListener("click", (e) => {
    const a = e.target.closest("[data-pid]");
    if (a) { e.preventDefault(); selectPerson(a.dataset.pid); return; }
    const m = e.target.closest("[data-move]");
    if (m) { e.preventDefault(); startPlacing(m.dataset.move); MAP.map.closePopup(); }
  });
}

function startPlacing(place) {
  MAP.placing = place;
  $("map").classList.add("placing");
  toast(`Clique sur la carte à l'endroit de « ${shortPlace(place)} » (Échap pour annuler)`);
}

function drawMap(fit) {
  if (!MAP.map) return;
  const { set, events } = collectEvents();
  MAP.markers.clearLayers();
  MAP.lines.clearLayers();

  // regroupement par lieu
  const byPlace = new Map();
  for (const ev of events) {
    if (!MAP.places[ev.place]) continue;
    if (!byPlace.has(ev.place)) byPlace.set(ev.place, []);
    byPlace.get(ev.place).push(ev);
  }

  // la personne sélectionnée : ses lieux sont mis en évidence, le reste est estompé
  const root = state.root;
  const mine = (evs) => evs.filter((e) => e.pids.includes(root));
  const rootPlaces = [...byPlace].filter(([, evs]) => mine(evs).length).map(([pl]) => pl);
  const focus = rootPlaces.length > 0;

  // migrations : lieu de naissance du parent -> lieu de naissance de l'enfant
  if (MAP.migrations) {
    for (const id of set.keys()) {
      const cb = birthPlace(id);
      if (!cb || !MAP.places[cb]) continue;
      const { father, mother } = parentsOf(id);
      for (const par of [father, mother]) {
        if (!par || !set.has(par)) continue;
        const pb = birthPlace(par);
        if (!pb || pb === cb || !MAP.places[pb]) continue;
        const a = MAP.places[pb], b = MAP.places[cb];
        const hot = id === root || par === root;
        L.polyline([[a.lat, a.lon], [b.lat, b.lon]], {
          color: P(par).sex === "F" ? "#f28db4" : "#6fa8ff",
          weight: hot ? 2.8 : 1.6, opacity: hot ? 0.95 : focus ? 0.22 : 0.55, dashArray: hot ? null : "4 5",
        }).bindTooltip(`${esc(fullName(P(par)))}${relationLabel(root, par) ? ` <span class="tt-rel">(${esc(relationLabel(root, par))})</span>` : ""}, né${P(par).sex === "F" ? "e" : ""} à ${esc(shortPlace(pb))}<br>→ ${P(par).sex === "F" ? "mère" : "père"} de ${esc(fullName(P(id)))}${id !== root && relationLabel(root, id) ? ` <span class="tt-rel">(${esc(relationLabel(root, id))})</span>` : ""}, né${P(id).sex === "F" ? "e" : ""} à ${esc(shortPlace(cb))}`, { sticky: true })
          .addTo(MAP.lines);
      }
    }
  }

  const pts = [], rootPts = [];
  const entries = [...byPlace].sort(([a], [b]) => rootPlaces.includes(a) - rootPlaces.includes(b));  // en évidence au-dessus
  for (const [place, evs] of entries) {
    const c = MAP.places[place];
    const years = evs.map((e) => e.year).filter(Boolean).sort((a, b) => a - b);
    const year = years.length ? years[Math.floor(years.length / 2)] : null;
    const n = evs.length;
    evs.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    const rows = evs.map((e) => `<li class="${e.pids.includes(root) ? "mp-me" : ""}"><span class="mp-tag">${esc(EVENT_LABELS[e.tag] || e.tag)}</span>
        <span class="mp-year">${esc(gedDateToFr(e.date) || "")}</span>
        ${e.pids.map((pid) => {
          const rel = pid === root ? (P(pid).sex === "F" ? "elle-même" : "lui-même") : relationLabel(root, pid);
          return `<a href="#" data-pid="${esc(pid)}">${esc(fullName(P(pid)))}</a>${rel ? ` <span class="mp-rel">${esc(rel)}</span>` : ""}`;
        }).join(" &amp; ")}</li>`).join("");
    const popup = `<div class="mp"><div class="mp-title">${esc(shortPlace(place))}</div>
      <div class="mp-sub">${esc(place)}</div><ul>${rows}</ul>
      <a href="#" class="mp-move" data-move="${esc(place)}">Mal placé ? Déplacer ce lieu</a></div>`;
    const my = mine(evs);
    const r = 6 + 3.2 * Math.sqrt(n - 1);
    if (my.length) {
      // halo pulsant + étiquette permanente
      L.circleMarker([c.lat, c.lon], { radius: r + 9, color: "#5ccfae", weight: 2, fillColor: "#5ccfae", fillOpacity: 0.15,
        className: "hl-halo", interactive: false }).addTo(MAP.markers);
    }
    const m = L.circleMarker([c.lat, c.lon], {
      radius: my.length ? r + 2 : r, color: my.length ? "#ffffff" : "#0b0f15", weight: my.length ? 2.5 : 1.5,
      fillColor: eraColor(year), fillOpacity: focus && !my.length ? 0.35 : 0.92, opacity: focus && !my.length ? 0.5 : 1,
    }).bindPopup(popup, { maxWidth: 320 });
    if (my.length) {
      const lbl = my.map((e) => `${EVENT_LABELS[e.tag] || e.tag}${e.year ? " " + e.year : ""}`).join(" · ");
      m.bindTooltip(`<b>${esc(shortPlace(place))}</b><br>${esc(lbl)}`, { permanent: true, direction: "top", offset: [0, -r - 6], className: "hl-label" });
      rootPts.push([c.lat, c.lon]);
    } else {
      const who = [...new Set(evs.flatMap((e) => e.pids))].slice(0, 4).map((pid) => {
        const rel = relationLabel(root, pid);
        return `${esc(fullName(P(pid)))}${rel ? ` <span class="tt-rel">· ${esc(rel)}</span>` : ""}`;
      });
      const more = new Set(evs.flatMap((e) => e.pids)).size - who.length;
      m.bindTooltip(`<b>${esc(shortPlace(place))}</b><br>${who.join("<br>")}${more > 0 ? `<br><span class="tt-rel">+ ${more} autre${more > 1 ? "s" : ""}</span>` : ""}`,
        { direction: "top", offset: [0, -6] });
    }
    m.addTo(MAP.markers);
    pts.push([c.lat, c.lon]);
  }
  MAP.rootPts = rootPts;
  if (fit === "root" && rootPts.length) {
    if (rootPts.length === 1) MAP.map.flyTo(rootPts[0], Math.max(MAP.map.getZoom(), 7), { duration: 0.8 });
    else MAP.map.flyToBounds(rootPts, { padding: [90, 90], maxZoom: 8, duration: 0.8 });
  } else if (fit && pts.length) MAP.map.fitBounds(pts, { padding: [60, 60], maxZoom: 9 });
  MAP.stats = { persons: set.size, events: events.length, shown: [...byPlace.values()].reduce((s, v) => s + v.length, 0), places: byPlace.size };
  renderControls();
  renderLegend();
}

function renderLegend() {
  $("mapLegend").replaceChildren(...[
    h("div", { class: "lg-title" }, "Époque"),
    ...ERAS.map((e) => h("div", { class: "lg-row" }, h("span", { class: "lg-dot", style: `background:${e.color}` }), e.label)),
    h("div", { class: "lg-row" }, h("span", { class: "lg-dot", style: `background:${NO_DATE}` }), "date inconnue"),
    MAP.migrations ? h("div", { class: "lg-row" }, h("span", { class: "lg-line" }), "parent → enfant") : null,
  ].filter(Boolean));
}

function renderControls() {
  const el = $("mapCtl");
  if (!el) return;
  const rootP = P(state.root);
  const unknown = allPlaceNames().filter((p) => MAP.places[p] === null);
  const st = MAP.stats || { persons: 0, events: 0, shown: 0, places: 0 };
  const radio = (val, label) => h("label", { class: "ctl-opt" },
    h("input", { type: "radio", name: "mapmode", value: val, checked: MAP.mode === val,
      onchange: () => { MAP.mode = val; store.set("map.mode", val); drawMap(true); } }), label);
  el.replaceChildren(...[
    h("div", { class: "ctl-title" }, "Qui ?"),
    radio("anc", `Ancêtres de ${rootP ? fullName(rootP) : "…"}`),
    radio("all", "Tout l'arbre"),
    h("div", { class: "ctl-title" }, "Quoi ?"),
    ...Object.keys(GROUP_LABEL).map((g) => h("label", { class: "ctl-opt" },
      h("input", { type: "checkbox", checked: MAP.groups[g],
        onchange: (e) => { MAP.groups[g] = e.target.checked; store.set("map.groups", MAP.groups); drawMap(false); } }),
      GROUP_LABEL[g])),
    h("label", { class: "ctl-opt" },
      h("input", { type: "checkbox", checked: MAP.migrations,
        onchange: (e) => { MAP.migrations = e.target.checked; store.set("map.migr", MAP.migrations); drawMap(false); } }),
      "Trajets parent → enfant"),
    rootP ? h("div", { class: "ctl-me" },
      h("span", { class: "ctl-me-dot" }),
      (MAP.rootPts || []).length
        ? `${fullName(rootP)} : ${MAP.rootPts.length} lieu${MAP.rootPts.length > 1 ? "x" : ""} en évidence`
        : `${fullName(rootP)} : aucun lieu renseigné`) : null,
    h("div", { class: "ctl-stats" },
      `${st.places} lieux · ${st.shown} évènements sur la carte`,
      st.events > st.shown ? h("div", { class: "ctl-muted" }, `${st.events - st.shown} sans position`) : null,
      MAP.serverOld ? h("div", { class: "ctl-muted" }, "Relance l'appli (lancer.bat) pour enregistrer les positions dans data/lieux.json.") : null),
    MAP.geocoding ? h("div", { class: "ctl-progress" },
      h("div", null, `Localisation des lieux… ${MAP.progress.done}/${MAP.progress.total}`),
      h("div", { class: "bar" }, h("span", { style: `width:${(100 * MAP.progress.done / Math.max(1, MAP.progress.total)).toFixed(0)}%` }))) : null,
    unknown.length ? h("details", { class: "ctl-unknown" },
      h("summary", null, `${unknown.length} lieu${unknown.length > 1 ? "x" : ""} introuvable${unknown.length > 1 ? "s" : ""}`),
      h("ul", null, unknown.map((pl) => h("li", null,
        h("span", { title: pl }, shortPlace(pl)),
        h("button", { class: "btn link", onclick: () => startPlacing(pl) }, "Placer")))),
      h("button", { class: "btn small", style: "margin-top:6px", disabled: MAP.geocoding,
        onclick: async () => {
          unknown.forEach((p) => delete MAP.places[p]);
                const upd = Object.fromEntries(unknown.map((p) => [p, "delete"]));
          const res = await fetch("/api/places", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates: upd }) });
          if (res.ok) MAP.places = { ...MAP.places, ...(await res.json()) };
          geocodeMissing();
        } }, "Réessayer")) : null,
  ].filter(Boolean));
}

/* ------------------------------------------------------------- bascule Arbre / Carte */
async function showView(view) {
  const isMap = view === "map";
  $("canvas").hidden = isMap;
  $("mapView").hidden = !isMap;
  $("viewTree").classList.toggle("on", !isMap);
  $("viewMap").classList.toggle("on", isMap);
  document.body.classList.toggle("in-map", isMap);
  store.set("view", view);
  if (isMap) {
    ensureMap();
    if (!MAP.loaded) {
      try { localStorage.removeItem("arbre.places"); } catch { /* ancienne copie navigateur */ }
      try { const r = await fetch("/api/places"); if (r.ok) MAP.places = await r.json(); else MAP.serverOld = true; } catch { MAP.places = {}; }
      // positions trouvées avec un faux code INSEE (lieux à l'étranger) : à refaire
      const bad = Object.keys(MAP.places).filter((p) => MAP.places[p] && !MAP.places[p].src && !MAP.places[p].manual &&
        !isFrench(p) && /,\s*(\d{5}|2[AB]\d{3})\s*,/.test(p));
      if (bad.length) {
        bad.forEach((p) => delete MAP.places[p]);
            fetch("/api/places", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: Object.fromEntries(bad.map((p) => [p, "delete"])) }) }).catch(() => {});
      }
      MAP.loaded = true;
    }
    setTimeout(() => MAP.map.invalidateSize(), 0);
    MAP.lastRoot = state.root;
    drawMap(true);
    geocodeMissing();
  } else {
    centerView(false);
  }
}

window.mapRefresh = (rootChanged) => {
  if ($("mapView").hidden || !MAP.map) return;
  const changed = rootChanged && MAP.lastRoot !== state.root;
  MAP.lastRoot = state.root;
  drawMap(changed ? "root" : false);
  geocodeMissing();  // nouveaux lieux saisis
};

$("viewTree").onclick = () => showView("tree");
$("viewMap").onclick = () => showView("map");
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && MAP.placing) { MAP.placing = null; $("map").classList.remove("placing"); toast("Placement annulé"); }
});
// rouvrir la dernière vue utilisée (une fois les données chargées)
(function waitData() {
  if (!state.root) return setTimeout(waitData, 50);
  if (store.get("view", "tree") === "map") showView("map");
})();
