"use strict";

/* =====================================================================
   Constantes et libellés
   ===================================================================== */
const W = 196, WC = 150, H = 66, HGAP = 18, ROW = H + 56;

const EVENT_LABELS = {
  BIRT: "Naissance", CHR: "Baptême (CHR)", BAPM: "Baptême", DEAT: "Décès", BURI: "Inhumation",
  CREM: "Crémation", OCCU: "Profession", RESI: "Résidence", NATU: "Naturalisation",
  IMMI: "Immigration", EMIG: "Émigration", EDUC: "Études", RELI: "Religion", TITL: "Titre",
  GRAD: "Diplôme", RETI: "Retraite", CENS: "Recensement", CONF: "Confirmation", ADOP: "Adoption",
  WILL: "Testament", PROB: "Succession", EVEN: "Autre évènement", FACT: "Fait", NATI: "Nationalité",
  DSCR: "Description physique",
  ENGA: "Fiançailles", MARB: "Publication des bans", MARC: "Contrat de mariage", MARL: "Licence de mariage",
  MARS: "Accord de mariage", MARR: "Mariage", DIV: "Divorce", DIVF: "Demande de divorce", ANUL: "Annulation",
};
const PERSON_EVENTS = ["BIRT", "BAPM", "CHR", "DEAT", "BURI", "CREM", "OCCU", "RESI", "NATU", "IMMI",
  "EMIG", "EDUC", "GRAD", "RELI", "TITL", "RETI", "CENS", "CONF", "ADOP", "WILL", "PROB", "NATI", "DSCR", "FACT", "EVEN"];
const FAMILY_EVENTS = ["MARR", "ENGA", "MARB", "MARC", "MARL", "MARS", "DIV", "DIVF", "ANUL", "CENS", "EVEN"];
// évènements dont la "valeur" est une information (et pas juste "Y")
const VALUE_LABELS = {
  OCCU: "Profession", TITL: "Titre", EDUC: "Diplôme / école", RELI: "Religion", NATI: "Nationalité",
  DSCR: "Description", EVEN: "Description", FACT: "Description", GRAD: "Diplôme", CENS: "Détail",
  RESI: "Détail",
};

/* =====================================================================
   Dates GEDCOM <-> français
   ===================================================================== */
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTH_ALIASES = [
  ["janvier", "janv", "jan"], ["fevrier", "fevr", "fev", "feb"], ["mars", "mar"], ["avril", "avr", "apr"],
  ["mai", "may"], ["juin", "jun"], ["juillet", "juil", "jul"], ["aout", "aug"],
  ["septembre", "sept", "sep"], ["octobre", "oct"], ["novembre", "nov"], ["decembre", "dec"],
];
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function gedPartToFr(p, numeric) {
  const m = /^(?:(\d{1,2}) )?(?:([A-Z]{3}) )?(\d{3,4})$/.exec((p || "").trim());
  if (!m) return null;
  const mi = m[2] ? MONTHS.indexOf(m[2]) : -1;
  if (m[2] && mi < 0) return null;
  if (numeric) {
    const parts = [];
    if (m[1]) parts.push(m[1].padStart(2, "0"));
    if (mi >= 0) parts.push(String(mi + 1).padStart(2, "0"));
    parts.push(m[3]);
    return parts.join("/");
  }
  return [m[1] ? String(+m[1]) : null, mi >= 0 ? MONTHS_FR[mi] : null, m[3]].filter(Boolean).join(" ");
}

function gedDateToFr(d, numeric = false) {
  if (!d) return "";
  const s = d.trim();
  let m;
  const P = (x) => gedPartToFr(x, numeric);
  if ((m = /^BET (.+) AND (.+)$/.exec(s)) && P(m[1]) && P(m[2])) return `entre ${P(m[1])} et ${P(m[2])}`;
  if ((m = /^FROM (.+) TO (.+)$/.exec(s)) && P(m[1]) && P(m[2])) return `de ${P(m[1])} à ${P(m[2])}`;
  if ((m = /^FROM (.+)$/.exec(s)) && P(m[1])) return `depuis ${P(m[1])}`;
  if ((m = /^TO (.+)$/.exec(s)) && P(m[1])) return `jusqu'à ${P(m[1])}`;
  const pre = { ABT: "vers", BEF: "avant", AFT: "après", EST: "estimé", CAL: "calculé" };
  if ((m = /^(ABT|BEF|AFT|EST|CAL) (.+)$/.exec(s)) && P(m[2])) return `${pre[m[1]]} ${P(m[2])}`;
  return P(s) ?? s;
}

function monthFromWord(w) {
  w = norm(w).replace(/\.$/, "");
  for (let i = 0; i < 12; i++) if (MONTH_ALIASES[i].includes(w)) return i;
  return -1;
}

function frPartToGed(s) {
  s = norm(s);
  let m;
  const pad = (n) => String(n).padStart(2, "0");
  const ok = (d, mo) => (d == null || (d >= 1 && d <= 31)) && mo >= 0 && mo < 12;
  if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{3,4})$/.exec(s))) {
    const d = +m[1], mo = +m[2] - 1;
    return ok(d, mo) ? `${pad(d)} ${MONTHS[mo]} ${m[3]}` : null;
  }
  if ((m = /^(\d{1,2})[\/.\-](\d{3,4})$/.exec(s))) {
    const mo = +m[1] - 1;
    return ok(null, mo) ? `${MONTHS[mo]} ${m[2]}` : null;
  }
  if ((m = /^(\d{3,4})$/.exec(s))) return m[1];
  if ((m = /^(\d{1,2})(?:er)?\s+([a-z.]+)\s+(\d{3,4})$/.exec(s))) {
    const d = +m[1], mo = monthFromWord(m[2]);
    return ok(d, mo) ? `${pad(d)} ${MONTHS[mo]} ${m[3]}` : null;
  }
  if ((m = /^([a-z.]+)\s+(\d{3,4})$/.exec(s))) {
    const mo = monthFromWord(m[1]);
    return ok(null, mo) ? `${MONTHS[mo]} ${m[2]}` : null;
  }
  return null;
}

/** Texte saisi en français -> date GEDCOM. "" -> "", illisible -> null */
function frDateToGed(input) {
  const s = norm(input).replace(/\s+/g, " ");
  if (!s) return "";
  let m;
  if ((m = /^(?:entre|bet) (.+) (?:et|and) (.+)$/.exec(s))) {
    const a = frPartToGed(m[1]), b = frPartToGed(m[2]);
    return a && b ? `BET ${a} AND ${b}` : null;
  }
  if ((m = /^(?:de|from) (.+) (?:a|au|to) (.+)$/.exec(s))) {
    const a = frPartToGed(m[1]), b = frPartToGed(m[2]);
    return a && b ? `FROM ${a} TO ${b}` : null;
  }
  if ((m = /^(?:depuis|from) (.+)$/.exec(s))) { const a = frPartToGed(m[1]); return a ? `FROM ${a}` : null; }
  if ((m = /^(?:jusqu'a|jusqu’a|to) (.+)$/.exec(s))) { const a = frPartToGed(m[1]); return a ? `TO ${a}` : null; }
  const prefixes = [
    [/^(?:vers|env\.?|environ|ca\.?|circa|~|abt) ?(.+)$/, "ABT"],
    [/^(?:avant|av\.?|bef) (.+)$/, "BEF"],
    [/^(?:apres|ap\.?|aft) (.+)$/, "AFT"],
    [/^(?:estime|est) (.+)$/, "EST"],
    [/^(?:calcule|cal) (.+)$/, "CAL"],
  ];
  for (const [re, tag] of prefixes) {
    if ((m = re.exec(s))) { const a = frPartToGed(m[1]); return a ? `${tag} ${a}` : null; }
  }
  return frPartToGed(s);
}

const yearOf = (d) => { const m = /(\d{3,4})(?!.*\d{3,4})/.exec(d || ""); return m ? m[1] : ""; };

/* =====================================================================
   État
   ===================================================================== */
const state = {
  data: { persons: {}, families: {}, meta: {} },
  root: null,
  genUp: 99,
  genDown: 2,
  view: { x: 0, y: 0, k: 1 },
  editing: false,
  layout: null,
};

const store = {
  get(k, d) { try { const v = localStorage.getItem("arbre." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("arbre." + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

const P = (id) => state.data.persons[id];
const F = (id) => state.data.families[id];

function givenDisplay(p) { return (p.given || "").replace(/\s*,\s*/g, " ").trim(); }
function initials(p) {
  const g = givenDisplay(p), s = (p.surname || "").trim();
  return ((g[0] || "") + (s[0] || "")).toUpperCase() || "?";
}
function fullName(p) {
  if (!p) return "?";
  const n = `${givenDisplay(p)} ${p.surname || ""}`.trim();
  return n || "(sans nom)";
}
function findEvent(p, tags) {
  for (const t of tags) { const e = p.events.find((e) => e.tag === t); if (e) return e; }
  return null;
}
function lifespan(p) {
  const b = findEvent(p, ["BIRT", "BAPM", "CHR"]);
  const d = findEvent(p, ["DEAT", "BURI", "CREM"]);
  const by = b ? yearOf(b.date) : "", dy = d ? yearOf(d.date) : "";
  if (d) return `${by || "?"} – ${dy || "†"}`;
  return by;
}
function parentsOf(id) {
  const p = P(id);
  if (!p || !p.famc.length) return { fam: null, father: null, mother: null };
  const f = F(p.famc[0]);
  return { fam: f ? f.id : null, father: f && f.husb, mother: f && f.wife };
}
function unionsOf(id) {
  const p = P(id);
  if (!p) return [];
  return p.fams.map((fid) => F(fid)).filter(Boolean).map((f) => ({
    fam: f, spouse: f.husb === id ? f.wife : f.husb,
  }));
}
function childrenOf(id) {
  return unionsOf(id).flatMap((u) => u.fam.children);
}
function siblingsOf(id) {
  const p = P(id);
  const s = new Set();
  for (const fid of p.famc) { const f = F(fid); if (f) f.children.forEach((c) => c !== id && s.add(c)); }
  return [...s];
}

function defaultRoot() {
  const ids = Object.keys(state.data.persons);
  if (!ids.length) return null;
  const memo = {};
  const count = (id, seen = new Set()) => {
    if (memo[id] != null) return memo[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const { father, mother } = parentsOf(id);
    let n = 0;
    for (const x of [father, mother]) if (x && P(x)) n += 1 + count(x, seen);
    return (memo[id] = n);
  };
  const num = (id) => +(id.match(/\d+/) || [0])[0];
  ids.sort((a, b) => count(b) - count(a) || num(a) - num(b));
  return ids[0];
}

/* =====================================================================
   Utilitaires DOM
   ===================================================================== */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}
const $ = (id) => document.getElementById(id);

let toastTimer;
function toast(msg, error = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast" + (error ? " error" : "");
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), error ? 5000 : 2200);
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch { /* vide */ }
  if (!res.ok) {
    toast(json.error || `Erreur ${res.status}`, true);
    throw new Error(json.error || res.status);
  }
  if (json.data) setData(json.data);
  return json;
}

function setData(data) {
  state.data = data;
  if (!P(state.root)) state.root = defaultRoot();
  $("count").textContent = `${Object.keys(data.persons).length} personnes`;
  $("undo").disabled = !data.meta.canUndo;
  $("redo").disabled = !data.meta.canRedo;
}

/* =====================================================================
   Calcul de la mise en page de l'arbre
   ===================================================================== */
function computeLayout(rootId) {
  const cards = [], paths = [];
  const CG = 40;          // écart entre les deux parents d'un couple (place pour le point d'union)
  const SG = 60;          // écart entre la personne centrale et ses conjoints
  const sumW = (arr, gap = HGAP) => arr.reduce((s, k) => s + k.w, 0) + gap * Math.max(0, arr.length - 1);

  // couple : trait horizontal entre les deux cartes + point d'union au milieu
  function coupleLink(left, right, y, cls) {
    const a = left.x + (left.w || W), b = right.x, cy = y + H / 2, mx = (a + b) / 2;
    paths.push({ d: `M${a},${cy} H${b}`, cls: `couple ${cls || ""}` });
    paths.push({ dot: [mx, cy], cls });
    return mx;
  }
  // descente vers des enfants depuis (x, y)
  function drawDown(fromX, fromY, kids, cls) {
    const mid = kids[0].y - (ROW - H) / 2;
    const xs = kids.map((k) => k.x + (k.w || W) / 2);
    let d = `M${fromX},${fromY} V${mid}`;
    if (xs.length > 1 || xs[0] !== fromX) d += ` M${Math.min(fromX, ...xs)},${mid} H${Math.max(fromX, ...xs)}`;
    for (const x of xs) d += ` M${x},${mid} V${kids[0].y}`;
    paths.push({ d, cls });
  }

  // ---- ascendants (au-dessus)
  // à partir des arrière-grands-parents, cartes plus étroites pour gagner de la place
  const widthFor = (gen) => (gen >= 3 ? WC : W);
  function ancTree(id, gen, seen) {
    const t = { id, gen, kids: [], w: widthFor(gen) };
    if (gen < state.genUp && !seen.has(id)) {
      seen.add(id);
      const { father, mother } = parentsOf(id);
      if (father && P(father)) t.kids.push(ancTree(father, gen + 1, seen));
      else if (gen === 0) t.kids.push({ ghost: "father", gen: 1, kids: [], w: W });
      if (mother && P(mother)) t.kids.push(ancTree(mother, gen + 1, seen));
      else if (gen === 0) t.kids.push({ ghost: "mother", gen: 1, kids: [], w: W });
    }
    contour(t);
    return t;
  }
  // Disposition compacte (type Reingold-Tilford) : chaque sous-arbre garde, génération par
  // génération, son bord gauche et droit (par rapport à son centre) ; on rapproche père et mère
  // au maximum sans qu'aucune carte ne se chevauche.
  function contour(t) {
    t.cl = [-t.w / 2]; t.cr = [t.w / 2]; t.offs = [];
    for (const k of t.kids) if (!k.cl) contour(k);  // cartes "fantômes"
    if (t.kids.length === 1) t.offs = [0];
    if (t.kids.length === 2) {
      const [f, m] = t.kids;
      let sep = 0;
      for (let d = 0; d < Math.min(f.cl.length, m.cl.length); d++) {
        sep = Math.max(sep, f.cr[d] - m.cl[d] + (d === 0 ? CG : HGAP));
      }
      t.offs = [-sep / 2, sep / 2];
    }
    t.kids.forEach((k, i) => {
      k.cl.forEach((v, d) => {
        t.cl[d + 1] = Math.min(t.cl[d + 1] ?? Infinity, v + t.offs[i]);
        t.cr[d + 1] = Math.max(t.cr[d + 1] ?? -Infinity, k.cr[d] + t.offs[i]);
      });
    });
  }
  function placeAnc(t, cx) {
    const y = -t.gen * ROW;
    t.x = cx - t.w / 2;
    t.kids.forEach((k, i) => placeAnc(k, cx + t.offs[i]));
    t.y = y;
    if (t.ghost) cards.push({ ghost: t.ghost, of: rootId, x: t.x, y, w: t.w });
    else if (t.gen > 0) cards.push({ id: t.id, x: t.x, y, w: t.w });
    let drop = null;
    if (t.kids.length === 2) {
      const py = t.kids[0].y;
      const cls = t.kids.some((k) => k.ghost) ? "ghostlink" : "";
      drop = { x: coupleLink(t.kids[0], t.kids[1], py, cls), y: py + H / 2, cls };
    } else if (t.kids.length === 1) {
      const k = t.kids[0];
      drop = { x: k.x + k.w / 2, y: k.y + H, cls: "" };
    }
    if (drop && t.gen === 0) t.drop = drop;  // la personne centrale : tracé plus bas, avec ses frères et sœurs
    else if (drop) paths.push({ d: `M${drop.x},${drop.y} V${y}`, cls: drop.cls });
  }
  const anc = ancTree(rootId, 0, new Set());
  placeAnc(anc, W / 2);
  const root = { id: rootId, x: anc.x, y: 0, root: true };
  cards.push(root);

  // ---- conjoints (même ligne, alternés droite / gauche), chaque union a sa couleur
  const unions = unionsOf(rootId);
  const unionFrom = [];
  unions.forEach((u, i) => {
    const cls = `u${i % 4}`;
    if (!(u.spouse && P(u.spouse))) { unionFrom.push({ x: root.x + W / 2, y: H, cls }); return; }
    const side = i % 2 === 0 ? 1 : -1, rank = Math.floor(i / 2) + 1;
    const x = root.x + side * rank * (W + SG);
    cards.push({ id: u.spouse, x, y: 0, spouseOf: rootId });
    // le trait part de la carte voisine (la personne centrale ou le conjoint précédent du même côté)
    const prevX = root.x + side * (rank - 1) * (W + SG);
    paths.push({ d: `M${root.x + W / 2},${H / 2} H${x + W / 2}`, cls: `couple ${cls}` });
    const mx = side > 0 ? (prevX + W + x) / 2 : (x + W + prevX) / 2;
    paths.push({ dot: [mx, H / 2], cls });
    unionFrom.push({ x: mx, y: H / 2, cls });
  });

  // ---- frères et sœurs (même ligne, au-delà des conjoints : aînés à gauche, cadets à droite)
  const pf = parentsOf(rootId).fam;
  const sibOrder = pf && F(pf) ? F(pf).children.filter((c) => P(c)) : [rootId];
  const ri = sibOrder.indexOf(rootId);
  const nRight = Math.ceil(unions.length / 2), nLeft = Math.floor(unions.length / 2);
  const rowKids = [root];
  const SIBGAP = HGAP + 30;
  sibOrder.slice(0, Math.max(0, ri)).reverse().forEach((id, k) => {
    const x = root.x - nLeft * (W + SG) - (k + 1) * (W + HGAP) - (SIBGAP - HGAP);
    const c = { id, x, y: 0, sibling: true };
    cards.push(c); rowKids.push(c);
  });
  sibOrder.slice(ri + 1).forEach((id, k) => {
    const x = root.x + nRight * (W + SG) + (k + 1) * (W + HGAP) + (SIBGAP - HGAP);
    const c = { id, x, y: 0, sibling: true };
    cards.push(c); rowKids.push(c);
  });
  if (anc.drop) drawDown(anc.drop.x, anc.drop.y, rowKids, anc.drop.cls);

  // ---- descendants (en dessous)
  // largeur du sous-arbre (sw) distincte de la largeur de la carte (w), sinon les traits
  // vers les enfants visent le milieu du sous-arbre au lieu du milieu de la carte
  const sumSW = (arr) => arr.reduce((s, k) => s + k.sw, 0) + HGAP * Math.max(0, arr.length - 1);
  function descTree(id, gen, seen) {
    const t = { id, gen, kids: [] };
    if (gen < state.genDown && !seen.has(id)) {
      seen.add(id);
      for (const c of childrenOf(id)) if (P(c)) t.kids.push(descTree(c, gen + 1, seen));
    }
    t.sw = Math.max(W, sumSW(t.kids));
    return t;
  }
  function placeDesc(t, left) {
    t.x = left + (t.sw - W) / 2;
    t.y = t.gen * ROW;
    cards.push({ id: t.id, x: t.x, y: t.y });
    if (t.kids.length) {
      let l = left + (t.sw - sumSW(t.kids)) / 2;
      for (const k of t.kids) { placeDesc(k, l); l += k.sw + HGAP; }
      drawDown(t.x + W / 2, t.y + H, t.kids);
    }
  }
  if (state.genDown > 0) {
    const seen = new Set([rootId]);
    const groups = unions.map((u, i) => {
      const kids = u.fam.children.filter((c) => P(c)).map((c) => descTree(c, 1, seen));
      const from = unionFrom[i];
      return { kids, w: sumSW(kids), center: from.x, from };
    }).filter((g) => g.kids.length);
    groups.sort((a, b) => a.center - b.center);
    let minLeft = -Infinity;
    for (const g of groups) {
      g.left = Math.max(g.center - g.w / 2, minLeft);
      minLeft = g.left + g.w + HGAP * 3;
    }
    for (const g of groups) {
      let l = g.left;
      for (const k of g.kids) { placeDesc(k, l); l += k.sw + HGAP; }
      drawDown(g.from.x, g.from.y, g.kids, g.from.cls);
    }
  }
  return { cards, paths, root };
}

/* =====================================================================
   Rendu de l'arbre + navigation (déplacement / zoom)
   ===================================================================== */
const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function renderTree(recenter) {
  if (!state.root) { $("cards").replaceChildren(); return; }
  // positions avant le changement, pour faire glisser les cartes au lieu de tout faire "sauter"
  const prev = new Map();
  for (const c of (state.layout ? state.layout.cards : [])) if (c.id && !prev.has(c.id)) prev.set(c.id, c);
  const prevView = { ...state.view };
  const L = computeLayout(state.root);
  state.layout = L;
  // la personne cliquée reste d'abord exactement où elle était à l'écran
  const anchor = prev.get(state.root);
  if (anchor) {
    state.view.x += (anchor.x - L.root.x) * state.view.k;
    state.view.y += (anchor.y - L.root.y) * state.view.k;
    applyView(false);
  }
  const cardsEl = $("cards");
  cardsEl.replaceChildren(...L.cards.map((c) => {
    if (c.ghost) {
      return h("div", {
        class: "card ghost", style: `left:${c.x}px;top:${c.y}px`, "data-ghost": c.ghost,
        title: c.ghost === "father" ? "Ajouter le père" : "Ajouter la mère",
        onclick: () => openRelationModal(c.ghost, state.root, parentsOf(state.root).fam),
      }, c.ghost === "father" ? "+ Ajouter le père" : "+ Ajouter la mère");
    }
    const p = P(c.id);
    const { father, mother } = parentsOf(c.id);
    const hiddenParents = !c.root && !c.sibling && c.y >= 0 && (father || mother);
    return h("div", {
      class: `card ${p.sex}${c.root ? " root" : ""}${c.w && c.w < W ? " compact" : ""}`,
      style: `left:${c.x}px;top:${c.y}px${c.w && c.w !== W ? `;width:${c.w}px` : ""}`, "data-id": c.id, title: fullName(p),
      onclick: () => selectPerson(c.id),
    },
    h("div", { class: "av", "aria-hidden": "true" }, initials(p)),
    h("div", { class: "body" },
      h("div", { class: "n1" }, givenDisplay(p) || "?"),
      h("div", { class: "n2" }, (p.surname || "").toUpperCase()),
      h("div", { class: "yrs" }, lifespan(p) || " ")),
    hiddenParents ? h("span", { class: "more", title: "A des parents (cliquer pour voir)" }, "▲") : null);
  }));
  const svg = $("links");
  const NS = "http://www.w3.org/2000/svg";
  // les traits d'abord, les points d'union par-dessus
  const sorted = [...L.paths.filter((p) => !p.dot), ...L.paths.filter((p) => p.dot)];
  svg.replaceChildren(...sorted.map((p) => {
    let el;
    if (p.dot) {
      el = document.createElementNS(NS, "circle");
      el.setAttribute("cx", p.dot[0]); el.setAttribute("cy", p.dot[1]); el.setAttribute("r", 5);
    } else {
      el = document.createElementNS(NS, "path");
      el.setAttribute("d", p.d);
    }
    if (p.cls && p.cls.trim()) el.setAttribute("class", p.cls.trim());
    return el;
  }));
  animateCards(L, prev, prevView);
  if (recenter) requestAnimationFrame(() => centerView(true));
}

function animateCards(L, prev, prevView) {
  const svg = $("links");
  if (!prev.size || reduceMotion()) { svg.style.opacity = 1; return; }
  const k = state.view.k;
  const els = [...$("cards").children];
  const seen = new Set();
  els.forEach((el, i) => {
    const c = L.cards[i];
    const o = c && c.id && !seen.has(c.id) ? prev.get(c.id) : null;
    if (c && c.id) seen.add(c.id);
    el.style.transition = "none";
    if (o) {
      const dx = (o.x * prevView.k + prevView.x - (c.x * k + state.view.x)) / k;
      const dy = (o.y * prevView.k + prevView.y - (c.y * k + state.view.y)) / k;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    } else {
      el.style.opacity = "0";
    }
  });
  svg.style.transition = "none";
  svg.style.opacity = "0";
  void $("cards").offsetWidth;  // applique l'état de départ
  requestAnimationFrame(() => {
    for (const el of els) {
      el.style.transition = "transform .45s cubic-bezier(.2,.8,.2,1), opacity .35s ease .1s";
      el.style.transform = "";
      el.style.opacity = "";
    }
    svg.style.transition = "opacity .3s ease .3s";
    svg.style.opacity = "1";
    // une fois fini, on rend la main aux effets de survol
    setTimeout(() => els.forEach((el) => { el.style.transition = ""; }), 650);
  });
}

function applyView(animate) {
  const w = $("world");
  w.style.transition = animate && !reduceMotion() ? "transform .45s cubic-bezier(.2,.8,.2,1)" : "none";
  const { x, y, k } = state.view;
  w.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
}

function centerView(animate, fitAll = false) {
  const L = state.layout;
  if (!L) return;
  const c = $("canvas").getBoundingClientRect();
  const xs = L.cards.map((c) => c.x), ys = L.cards.map((c) => c.y);
  const minX = Math.min(...xs), maxX = Math.max(...L.cards.map((c) => c.x + (c.w || W)));
  const minY = Math.min(...ys), maxY = Math.max(...ys) + H;
  const pad = 40;
  const fit = Math.min((c.width - pad * 2) / (maxX - minX), (c.height - pad * 2) / (maxY - minY));
  const k = Math.max(fitAll ? 0.15 : 0.85, Math.min(1, fit));
  let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  // si tout ne tient pas, on garde la personne centrale visible
  if ((maxX - minX) * k > c.width - pad) cx = L.root.x + W / 2;
  // trop haut : la personne centrale aux 2/3 de l'écran, les ancêtres au-dessus
  if ((maxY - minY) * k > c.height - pad) cy = Math.min(L.root.y + H / 2 - (c.height * 0.2) / k, maxY - (c.height / 2 - 110) / k);
  state.view = { k, x: c.width / 2 - cx * k, y: c.height / 2 - cy * k };
  applyView(animate);
}

function zoomAt(factor, px, py) {
  const v = state.view;
  const k = Math.max(0.15, Math.min(2.2, v.k * factor));
  const f = k / v.k;
  state.view = { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
  applyView(false);
}

function setupCanvas() {
  const canvas = $("canvas");
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { sx: e.clientX, sy: e.clientY, x: state.view.x, y: state.view.y, moved: false, id: e.pointerId };
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) { drag.moved = true; canvas.classList.add("dragging"); }
    state.view.x = drag.x + dx;
    state.view.y = drag.y + dy;
    applyView(false);
  });
  window.addEventListener("pointerup", () => {
    if (drag && drag.moved) {
      // empêcher le "click" qui suit un déplacement
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
    }
    drag = null;
    canvas.classList.remove("dragging");
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  const mid = () => { const r = canvas.getBoundingClientRect(); return [r.width / 2, r.height / 2]; };
  $("zoomIn").onclick = () => zoomAt(1.2, ...mid());
  $("zoomOut").onclick = () => zoomAt(1 / 1.2, ...mid());
  $("recenter").onclick = () => centerView(true, true);
  window.addEventListener("resize", () => centerView(false));
}

/* =====================================================================
   Sélection / navigation
   ===================================================================== */
function selectPerson(id, { recenter = true } = {}) {
  if (!P(id)) return;
  state.root = id;
  state.editing = false;
  store.set("root", id);
  history.replaceState(null, "", "#" + id.replace(/@/g, ""));
  renderTree(recenter);
  renderPanel();
  if (window.mapRefresh) window.mapRefresh(true);
}

function refresh() {
  renderTree(false);
  renderPanel();
  if (window.mapRefresh) window.mapRefresh(false);
}

/* =====================================================================
   Panneau de détail
   ===================================================================== */
function personChip(id, { onRemove, removeTitle } = {}) {
  const p = P(id);
  if (!p) return null;
  return h("span", { class: "chip" },
    h("span", { class: `sexdot ${p.sex}` }),
    h("button", { class: "go", onclick: () => selectPerson(id) }, fullName(p)),
    lifespan(p) ? h("span", { class: "y" }, lifespan(p)) : null,
    onRemove ? h("button", { class: "x", title: removeTitle || "Retirer ce lien", "aria-label": removeTitle || "Retirer ce lien", onclick: onRemove }, "×") : null);
}

function linkify(text) {
  const parts = String(text).split(/(https?:\/\/\S+)/g);
  return parts.map((s) => /^https?:\/\//.test(s)
    ? h("a", { href: s, target: "_blank", rel: "noopener" }, s.length > 70 ? s.slice(0, 67) + "…" : s)
    : s);
}

function eventView(e) {
  const lbl = EVENT_LABELS[e.tag] || e.tag;
  const val = e.value && e.value !== "Y" ? e.value : "";
  const meta = [gedDateToFr(e.date), e.place].filter(Boolean).join(" · ");
  return h("div", { class: "ev" },
    h("div", null, h("span", { class: "lbl" }, lbl), val ? ` : ${val}` : ""),
    meta ? h("div", { class: "meta" }, meta) : null,
    e.sources.map((s) => h("div", { class: "src" }, "Source : ", linkify(s))),
    e.notes.map((s) => h("div", { class: "src" }, "Note : ", linkify(s))));
}

function renderPanel() {
  const panel = $("panel");
  const id = state.root;
  const p = P(id);
  if (!p) { panel.replaceChildren(h("p", { class: "empty-note" }, "Aucune personne. Ajoute-en une avec « + Personne ».")); return; }
  if (state.editing) {
    panel.replaceChildren(
      h("h1", null, "Modifier"),
      h("p", { class: "sub" }, fullName(p)),
      personForm(p, {
        submitLabel: "Enregistrer",
        onCancel: () => { state.editing = false; renderPanel(); },
        onSubmit: async (data) => {
          await api("PUT", `/api/person/${enc(id)}`, data);
          state.editing = false;
          toast("Enregistré");
          refresh();
        },
      }));
    panel.scrollTop = 0;
    return;
  }

  const par = parentsOf(id);
  const out = [
    h("div", { class: `hero ${p.sex}` },
      h("div", { class: "av big", "aria-hidden": "true" }, initials(p)),
      h("div", null,
        h("h1", null, fullName(p)),
        h("p", { class: "sub" }, [lifespan(p), id.replace(/@/g, "")].filter(Boolean).join(" · ")))),
    h("div", { class: "actions" },
      h("button", { class: "btn", onclick: () => { state.editing = true; renderPanel(); } }, "Modifier"),
      h("button", { class: "btn danger", onclick: () => deletePerson(id) }, "Supprimer")),
  ];

  out.push(h("h3", null, "Évènements"));
  out.push(p.events.length ? h("div", { class: "timeline" }, p.events.map(eventView)) : h("p", { class: "empty-note" }, "Aucun évènement."));

  if (p.notes.length) out.push(h("h3", null, "Notes"), h("div", { class: "notes" }, p.notes.map((n) => h("p", null, linkify(n)))));
  if (p.sources.length) out.push(h("h3", null, "Sources"), h("div", { class: "notes" }, p.sources.map((n) => h("p", null, linkify(n)))));

  // Parents
  out.push(h("h3", null, "Parents"));
  const parentRow = [];
  for (const [role, pid] of [["father", par.father], ["mother", par.mother]]) {
    if (pid && P(pid)) {
      parentRow.push(personChip(pid, {
        removeTitle: "Retirer ce parent",
        onRemove: () => unlink(par.fam, pid, `Retirer ${fullName(P(pid))} des parents de ${fullName(p)} ?`),
      }));
    } else {
      parentRow.push(h("button", { class: "btn small", onclick: () => openRelationModal(role, id, par.fam) },
        role === "father" ? "+ Père" : "+ Mère"));
    }
  }
  out.push(h("div", { class: "chips" }, parentRow));

  const sibs = siblingsOf(id);
  if (sibs.length) {
    out.push(h("h3", null, "Frères et sœurs"));
    out.push(h("div", { class: "chips" }, sibs.map((s) => personChip(s))));
  }

  // Unions
  out.push(h("h3", null, "Unions et enfants",
    h("button", { class: "btn link", onclick: () => openRelationModal("spouse", id, null) }, "+ Conjoint")));
  const unions = unionsOf(id);
  if (!unions.length) {
    out.push(h("p", { class: "empty-note" }, "Aucune union enregistrée."));
    out.push(h("button", { class: "btn small", onclick: () => openRelationModal("child", id, null) }, "+ Enfant"));
  }
  for (const u of unions) {
    const f = u.fam;
    const evs = f.events.map((e) => {
      const v = [gedDateToFr(e.date), e.place].filter(Boolean).join(", ");
      return `${EVENT_LABELS[e.tag] || e.tag}${v ? " : " + v : ""}`;
    });
    out.push(h("div", { class: "union" },
      h("div", { class: "union-head" },
        u.spouse && P(u.spouse)
          ? personChip(u.spouse, {
            removeTitle: "Retirer ce conjoint",
            onRemove: () => unlink(f.id, u.spouse, `Retirer ${fullName(P(u.spouse))} de cette union ?`),
          })
          : h("span", { class: "empty-note" }, "Conjoint inconnu ",
            h("button", { class: "btn link", onclick: () => openRelationModal("spouse", id, f.id) }, "+ ajouter")),
        h("button", { class: "btn small", onclick: () => openFamilyModal(f.id) }, "Mariage…")),
      evs.length ? h("div", { class: "meta" }, evs.join(" · ")) : null,
      h("div", { class: "chips", style: "margin-top:8px" },
        f.children.filter((c) => P(c)).map((c) => personChip(c, {
          removeTitle: "Retirer cet enfant",
          onRemove: () => unlink(f.id, c, `Retirer ${fullName(P(c))} des enfants de cette union ?`),
        })),
        h("button", { class: "btn small", onclick: () => openRelationModal("child", id, f.id) }, "+ Enfant"))));
  }

  out.push(h("p", { class: "empty-note", style: "margin-top:28px" }, `Fichier : ${state.data.meta.file || ""}`));
  panel.replaceChildren(...out.flat());
}

const enc = (id) => encodeURIComponent(id);

async function unlink(fam, person, question) {
  if (!(await confirmModal(question))) return;
  await api("POST", "/api/unlink", { fam, person });
  toast("Lien retiré");
  refresh();
}

async function deletePerson(id) {
  const p = P(id);
  if (!(await confirmModal(`Supprimer définitivement ${fullName(p)} de l'arbre ? (Annulable avec Ctrl+Z)`, "Supprimer"))) return;
  const { father, mother } = parentsOf(id);
  const next = [father, mother, ...unionsOf(id).map((u) => u.spouse), ...childrenOf(id)].find((x) => x && x !== id);
  await api("DELETE", `/api/person/${enc(id)}`);
  toast("Personne supprimée");
  selectPerson(P(next) ? next : defaultRoot());
}

/* =====================================================================
   Formulaires
   ===================================================================== */
function field(label, input, hint) {
  return h("label", { class: "field" }, h("span", null, label), input, hint || null);
}

function listEditor(values, placeholder) {
  // liste de zones de texte (notes)
  const wrap = h("div", { class: "form", style: "gap:6px" });
  const items = [];
  const add = (v) => {
    const ta = h("textarea", { rows: 2, placeholder }, );
    ta.value = v || "";
    const row = h("div", { class: "row", style: "align-items:flex-start" }, ta,
      h("button", { type: "button", class: "icon-btn", style: "flex:0 0 32px", title: "Supprimer", "aria-label": "Supprimer",
        onclick: () => { row.remove(); items.splice(items.indexOf(ta), 1); } }, "×"));
    items.push(ta);
    wrap.insertBefore(row, addBtn);
  };
  const addBtn = h("button", { type: "button", class: "btn link", style: "align-self:flex-start", onclick: () => add("") }, "+ Ajouter une note");
  wrap.append(addBtn);
  values.forEach(add);
  return { el: wrap, get: () => items.map((t) => t.value).filter((v) => v.trim()) };
}

function sourcesEditor(values) {
  const ta = h("textarea", { rows: 2, placeholder: "Une source par ligne (cote d'archive, lien…)" });
  ta.value = values.join("\n");
  return { el: ta, get: () => ta.value.split("\n").map((s) => s.trim()).filter(Boolean) };
}

function dateInput(orig) {
  const shown = gedDateToFr(orig, true);
  const input = h("input", { type: "text", placeholder: "ex. 14/11/1968, vers 1850, avant 1936", autocomplete: "off" });
  input.value = shown;
  const hint = h("span", { class: "hint" });
  const wrap = h("label", { class: "field" }, h("span", null, "Date"), input, hint);
  const compute = () => {
    if (input.value.trim() === shown.trim()) return orig || "";
    return frDateToGed(input.value);
  };
  const update = () => {
    const g = compute();
    wrap.classList.toggle("invalid", g === null);
    hint.className = g === null ? "err" : "hint";
    hint.textContent = g === null ? "Format non reconnu (ex. 14/11/1968, 11/1968, 1968, vers 1850, entre 1850 et 1860)"
      : g ? `→ ${gedDateToFr(g)}` : "";
  };
  input.addEventListener("input", update);
  update();
  return { el: wrap, get: compute };
}

function eventEditor(ev, allowed, onRemove) {
  const sel = h("select", { "aria-label": "Type d'évènement" },
    allowed.map((t) => h("option", { value: t, selected: t === ev.tag }, EVENT_LABELS[t] || t)));
  if (!allowed.includes(ev.tag)) sel.prepend(h("option", { value: ev.tag, selected: true }, ev.tag));
  const date = dateInput(ev.date);
  const place = h("input", { type: "text", placeholder: "Commune, département, pays…" });
  place.value = ev.place || "";
  const val = h("input", { type: "text" });
  val.value = ev.value && ev.value !== "Y" ? ev.value : "";
  const valField = field("Détail", val);
  const syncVal = () => {
    const lbl = VALUE_LABELS[sel.value];
    valField.style.display = lbl || val.value ? "" : "none";
    valField.querySelector("span").textContent = lbl || "Détail";
  };
  sel.addEventListener("change", syncVal);
  syncVal();
  const sources = sourcesEditor(ev.sources || []);
  const notes = listEditor(ev.notes || [], "Note");
  const el = h("div", { class: "evform" },
    h("div", { class: "top" }, sel, h("span", { class: "spacer" }),
      h("button", { type: "button", class: "btn link danger", onclick: () => { el.remove(); onRemove(); } }, "Supprimer")),
    valField,
    h("div", { class: "row" }, date.el, field("Lieu", place)),
    field("Sources", sources.el),
    h("div", { class: "field" }, h("span", null, "Notes"), notes.el));
  return {
    el,
    get() {
      const d = date.get();
      return {
        ok: d !== null,
        tpl: !!ev._tpl,
        ev: { tag: sel.value, value: val.value.trim(), date: d || "", place: place.value.trim(),
          sources: sources.get(), notes: notes.get(), extra: ev.extra || [] },
      };
    },
  };
}

function eventsEditor(events, allowed, addLabel) {
  const wrap = h("div", { class: "form", style: "gap:8px" });
  const eds = [];
  const add = (ev) => {
    const ed = eventEditor(ev, allowed, () => eds.splice(eds.indexOf(ed), 1));
    eds.push(ed);
    wrap.insertBefore(ed.el, addRow);
  };
  const typeSel = h("select", { "aria-label": "Type d'évènement à ajouter" },
    allowed.map((t) => h("option", { value: t }, EVENT_LABELS[t] || t)));
  const addRow = h("div", { class: "row", style: "align-items:center" }, typeSel,
    h("button", { type: "button", class: "btn", style: "flex:0 0 auto",
      onclick: () => add({ tag: typeSel.value, value: "", date: "", place: "", sources: [], notes: [], extra: [] }) }, addLabel));
  wrap.append(addRow);
  events.forEach(add);
  return {
    el: wrap,
    get() {
      const res = eds.map((e) => e.get());
      if (res.some((r) => !r.ok)) return null;
      // les lignes "modèles" vides (naissance/décès proposés) sont ignorées
      return res.filter((r) => !(r.tpl && !r.ev.value && !r.ev.date && !r.ev.place && !r.ev.sources.length && !r.ev.notes.length))
        .map((r) => r.ev);
    },
  };
}

function personForm(p, { onSubmit, onCancel, submitLabel }) {
  const given = h("input", { type: "text", name: "given", autocomplete: "off" });
  given.value = p.given || "";
  const surname = h("input", { type: "text", name: "surname", autocomplete: "off" });
  surname.value = p.surname || "";
  const sexName = "sex" + Math.random().toString(36).slice(2);
  const sex = h("div", { class: "segmented", role: "radiogroup", "aria-label": "Sexe" },
    [["M", "Homme"], ["F", "Femme"], ["U", "Inconnu"]].map(([v, l]) =>
      h("label", null, h("input", { type: "radio", name: sexName, value: v, checked: (p.sex || "U") === v }), l)));
  let events = p.events.map((e) => ({ ...e }));
  const evEd = eventsEditor(events, PERSON_EVENTS, "+ Évènement");
  const notes = listEditor(p.notes || [], "Note");
  const sources = sourcesEditor(p.sources || []);
  const form = h("form", { class: "form" },
    h("div", { class: "row" },
      field("Prénom(s)", given, h("span", { class: "hint" }, "Séparés par des virgules, comme Geneanet")),
      field("Nom", surname)),
    h("div", { class: "field" }, h("span", null, "Sexe"), sex),
    h("h4", null, "Évènements"),
    evEd.el,
    h("h4", null, "Notes"),
    notes.el,
    h("h4", null, "Sources"),
    sources.el,
    h("div", { class: "form-actions" },
      onCancel ? h("button", { type: "button", class: "btn", onclick: onCancel }, "Annuler") : null,
      h("button", { type: "submit", class: "btn primary" }, submitLabel || "Enregistrer")));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const evs = evEd.get();
    if (evs === null) { toast("Une date n'est pas reconnue, corrige-la avant d'enregistrer.", true); return; }
    if (!given.value.trim() && !surname.value.trim()) { toast("Indique au moins un prénom ou un nom.", true); given.focus(); return; }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await onSubmit({
        given: given.value.trim(), surname: surname.value.trim(), suffix: p.suffix || "",
        sex: form.querySelector(`input[name=${sexName}]:checked`).value,
        events: evs, notes: notes.get(), sources: sources.get(),
        name_extra: p.name_extra || [], extra: p.extra || [],
      });
    } catch { btn.disabled = false; }
  });
  setTimeout(() => given.focus(), 0);
  return form;
}

function blankPerson(defaults = {}) {
  return {
    given: "", surname: "", sex: "U", notes: [], sources: [], name_extra: [], extra: [],
    events: [
      { tag: "BIRT", value: "", date: "", place: "", sources: [], notes: [], extra: [], _tpl: true },
      { tag: "DEAT", value: "", date: "", place: "", sources: [], notes: [], extra: [], _tpl: true },
    ],
    ...defaults,
  };
}

/* =====================================================================
   Modales
   ===================================================================== */
let modalOnClose = null;
function openModal(title, body, onClose) {
  $("modalTitle").textContent = title;
  $("modalBody").replaceChildren(body);
  $("modal").hidden = false;
  modalOnClose = onClose || null;
}
function closeModal() {
  $("modal").hidden = true;
  $("modalBody").replaceChildren();
  const cb = modalOnClose;
  modalOnClose = null;
  if (cb) cb();
}

function confirmModal(text, okLabel = "Confirmer") {
  return new Promise((resolve) => {
    let answered = false;
    const done = (v) => { answered = true; closeModal(); resolve(v); };
    const ok = h("button", { class: "btn primary", onclick: () => done(true) }, okLabel);
    openModal("Confirmation", h("div", null,
      h("p", null, text),
      h("div", { class: "form-actions" },
        h("button", { class: "btn", onclick: () => done(false) }, "Annuler"), ok)),
    () => { if (!answered) resolve(false); });
    setTimeout(() => ok.focus(), 0);
  });
}

const ROLE_TITLES = { father: "le père", mother: "la mère", spouse: "un conjoint", child: "un enfant" };

function openRelationModal(role, ofId, fam) {
  const of = P(ofId);
  const linkType = role === "father" || role === "mother" ? "parent" : role;
  // valeurs par défaut intelligentes
  const d = {};
  if (role === "father") { d.sex = "M"; d.surname = of.surname; }
  if (role === "mother") d.sex = "F";
  if (role === "spouse") d.sex = of.sex === "M" ? "F" : of.sex === "F" ? "M" : "U";
  if (role === "child") {
    const f = fam ? F(fam) : null;
    const father = f ? (f.husb && P(f.husb)) : (of.sex === "M" ? of : null);
    d.surname = father ? father.surname : (of.sex === "M" ? of.surname : "");
  }

  const tabs = h("div", { class: "tabs" });
  const content = h("div");
  const showNew = () => {
    content.replaceChildren(personForm(blankPerson(d), {
      submitLabel: "Ajouter",
      onCancel: closeModal,
      onSubmit: async (person) => {
        await api("POST", "/api/person", { person, link: { type: linkType, of: ofId, fam } });
        closeModal();
        toast(`${fullName(person)} ajouté(e)`);
        refresh();
      },
    }));
  };
  const showExisting = () => {
    const q = h("input", { type: "search", placeholder: "Nom ou prénom…", autocomplete: "off", "aria-label": "Rechercher" });
    const list = h("ul", { class: "pick-list" });
    const upd = () => {
      const res = searchPersons(q.value, 50).filter((x) => x !== ofId);
      list.replaceChildren(...(res.length ? res.map((id) => h("li", {
        onclick: async () => {
          await api("POST", "/api/link", { type: linkType, of: ofId, target: id, fam });
          closeModal();
          toast("Lien ajouté");
          refresh();
        },
      }, fullName(P(id)), h("small", null, lifespan(P(id))))) : [h("li", { class: "empty-note" }, "Aucun résultat")]));
    };
    q.addEventListener("input", upd);
    upd();
    content.replaceChildren(h("div", { class: "form" }, field("Chercher dans l'arbre", q), list));
    setTimeout(() => q.focus(), 0);
  };
  const b1 = h("button", { class: "on", onclick: () => { b1.className = "on"; b2.className = ""; showNew(); } }, "Nouvelle personne");
  const b2 = h("button", { onclick: () => { b2.className = "on"; b1.className = ""; showExisting(); } }, "Personne déjà dans l'arbre");
  tabs.append(b1, b2);
  showNew();
  openModal(`Ajouter ${ROLE_TITLES[role]} — ${fullName(of)}`, h("div", null, tabs, content));
}

function openFamilyModal(fid) {
  const f = F(fid);
  const names = [f.husb, f.wife].filter((x) => x && P(x)).map((x) => fullName(P(x))).join(" & ");
  const events = f.events.length ? f.events.map((e) => ({ ...e }))
    : [{ tag: "MARR", value: "", date: "", place: "", sources: [], notes: [], extra: [], _tpl: true }];
  const evEd = eventsEditor(events, FAMILY_EVENTS, "+ Évènement");
  const notes = listEditor(f.notes, "Note");
  const sources = sourcesEditor(f.sources);
  const form = h("form", { class: "form" },
    evEd.el, h("h4", null, "Notes"), notes.el, h("h4", null, "Sources"), sources.el,
    h("div", { class: "form-actions" },
      h("button", { type: "button", class: "btn", onclick: closeModal }, "Annuler"),
      h("button", { type: "submit", class: "btn primary" }, "Enregistrer")));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const evs = evEd.get();
    if (evs === null) { toast("Une date n'est pas reconnue.", true); return; }
    await api("PUT", `/api/family/${enc(fid)}`, { events: evs, notes: notes.get(), sources: sources.get(), extra: f.extra });
    closeModal();
    toast("Union enregistrée");
    refresh();
  });
  openModal(`Union — ${names || "?"}`, form);
}

function openNewPersonModal() {
  openModal("Nouvelle personne (non reliée)", personForm(blankPerson(), {
    submitLabel: "Ajouter",
    onCancel: closeModal,
    onSubmit: async (person) => {
      const res = await api("POST", "/api/person", { person });
      closeModal();
      selectPerson(res.id);
    },
  }));
}

/* =====================================================================
   Recherche
   ===================================================================== */
function searchPersons(q, max = 30) {
  const toks = norm(q).split(/\s+/).filter(Boolean);
  const all = Object.values(state.data.persons);
  const hits = all.filter((p) => {
    const hay = norm(`${p.given} ${p.surname}`);
    return toks.every((t) => hay.includes(t));
  });
  hits.sort((a, b) => norm(a.surname).localeCompare(norm(b.surname)) || norm(a.given).localeCompare(norm(b.given)));
  return hits.slice(0, max).map((p) => p.id);
}

function setupSearch() {
  const input = $("search"), list = $("results");
  let active = 0, res = [];
  const render = () => {
    if (!input.value.trim()) { list.hidden = true; return; }
    res = searchPersons(input.value);
    active = Math.min(active, Math.max(0, res.length - 1));
    list.replaceChildren(...(res.length
      ? res.map((id, i) => h("li", { class: i === active ? "active" : "", onmousedown: (e) => { e.preventDefault(); pick(id); } },
        h("span", null, fullName(P(id))), h("small", null, lifespan(P(id)))))
      : [h("li", { class: "empty" }, "Aucun résultat")]));
    list.hidden = false;
  };
  const pick = (id) => { input.value = ""; list.hidden = true; input.blur(); selectPerson(id); };
  input.addEventListener("input", () => { active = 0; render(); });
  input.addEventListener("focus", render);
  input.addEventListener("blur", () => setTimeout(() => (list.hidden = true), 100));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { active = Math.min(active + 1, res.length - 1); render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { active = Math.max(active - 1, 0); render(); e.preventDefault(); }
    else if (e.key === "Enter" && res[active]) pick(res[active]);
    else if (e.key === "Escape") { input.value = ""; list.hidden = true; input.blur(); }
  });
}

/* =====================================================================
   Démarrage
   ===================================================================== */
async function undoRedo(which) {
  try { await api("POST", `/api/${which}`); } catch { return; }
  toast(which === "undo" ? "Modification annulée" : "Modification rétablie");
  refresh();
}

async function init() {
  setupCanvas();
  setupSearch();
  state.genUp = +store.get("genUp", 99);
  state.genDown = +store.get("genDown", 2);
  $("genUp").value = String(state.genUp);
  $("genDown").value = String(state.genDown);
  // valeur mémorisée qui n'existe plus dans la liste -> "Toutes"
  if ($("genUp").value !== String(state.genUp)) { state.genUp = 99; $("genUp").value = "99"; }
  if ($("genDown").value !== String(state.genDown)) { state.genDown = 2; $("genDown").value = "2"; }
  $("genUp").onchange = (e) => { state.genUp = +e.target.value; store.set("genUp", state.genUp); renderTree(true); };
  $("genDown").onchange = (e) => { state.genDown = +e.target.value; store.set("genDown", state.genDown); renderTree(true); };
  setupTheme();
  $("undo").onclick = () => undoRedo("undo");
  $("redo").onclick = () => undoRedo("redo");
  $("newPerson").onclick = openNewPersonModal;
  $("modalClose").onclick = closeModal;
  $("modal").addEventListener("mousedown", (e) => { if (e.target === $("modal")) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("modal").hidden) { closeModal(); return; }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (typing || !$("modal").hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undoRedo("undo"); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); undoRedo("redo"); }
  });
  window.addEventListener("hashchange", () => {
    const id = "@" + location.hash.slice(1) + "@";
    if (P(id) && id !== state.root) selectPerson(id);
  });

  const res = await fetch("/api/data");
  setData(await res.json());
  const fromHash = location.hash.length > 1 ? "@" + decodeURIComponent(location.hash.slice(1)) + "@" : null;
  const start = [fromHash, store.get("root", null)].find((x) => x && P(x)) || defaultRoot();
  selectPerson(start);
}

/* =====================================================================
   Lien de parenté entre deux personnes (« grand-père maternel », « cousine germaine »…)
   ===================================================================== */
function ancestorDistances(id) {
  const dist = new Map([[id, 0]]);
  const q = [id];
  while (q.length) {
    const cur = q.shift();
    const p = P(cur);
    if (!p) continue;
    for (const fid of p.famc) {
      const f = F(fid);
      if (!f) continue;
      for (const par of [f.husb, f.wife]) {
        if (par && P(par) && !dist.has(par)) { dist.set(par, dist.get(cur) + 1); q.push(par); }
      }
    }
  }
  return dist;
}

function bloodRelation(a, b) {
  // plus proche ancêtre commun : on minimise la somme des distances
  const da = ancestorDistances(a), db = ancestorDistances(b);
  let best = null;
  for (const [anc, x] of da) {
    if (!db.has(anc)) continue;
    const y = db.get(anc);
    if (!best || x + y < best.up + best.down) best = { anc, up: x, down: y };
  }
  return best;
}

function relationLabel(rootId, otherId) {
  if (!rootId || !otherId) return "";
  if (rootId === otherId) return "";
  const o = P(otherId);
  if (!o) return "";
  const F_ = o.sex === "F";
  const g = (m, f) => (F_ ? f : m);
  const r = bloodRelation(rootId, otherId);
  if (r) {
    const { up, down } = r;
    // côté paternel / maternel (vu depuis la personne de référence)
    let side = "";
    if (up >= 2 || (up >= 1 && down >= 1 && up >= 2)) {
      const { father, mother } = parentsOf(rootId);
      const viaF = father && ancestorDistances(father).has(r.anc);
      const viaM = mother && ancestorDistances(mother).has(r.anc);
      if (viaF && !viaM) side = " paternel";
      else if (viaM && !viaF) side = " maternel";
      if (side && F_) side += "le";
    }
    if (down === 0) {  // ancêtre
      if (up === 1) return g("père", "mère");
      if (up === 2) return g("grand-père", "grand-mère") + side;
      if (up === 3) return g("arrière-grand-père", "arrière-grand-mère") + side;
      if (up === 4) return g("arrière-arrière-grand-père", "arrière-arrière-grand-mère") + side;
      return `ancêtre${side} (${up}e génération)`;
    }
    if (up === 0) {  // descendant
      if (down === 1) return g("fils", "fille");
      if (down === 2) return g("petit-fils", "petite-fille");
      if (down === 3) return g("arrière-petit-fils", "arrière-petite-fille");
      return `descendant${F_ ? "e" : ""} (${down}e génération)`;
    }
    if (up === 1 && down === 1) {
      // demi-frère/sœur si un seul parent en commun
      const pa = parentsOf(rootId), pb = parentsOf(otherId);
      const common = [pa.father, pa.mother].filter((x) => x && (x === pb.father || x === pb.mother)).length;
      return (common === 1 ? "demi-" : "") + g("frère", "sœur");
    }
    if (up === 1 && down === 2) return g("neveu", "nièce");
    if (up === 1 && down === 3) return g("petit-neveu", "petite-nièce");
    if (down === 1 && up === 2) return g("oncle", "tante") + side;
    if (down === 1 && up === 3) return g("grand-oncle", "grand-tante") + side;
    if (down === 1 && up === 4) return g("arrière-grand-oncle", "arrière-grand-tante") + side;
    if (down === 1) return `${g("frère", "sœur")} d'un ancêtre${side} (${up}e génération)`;
    if (up === down) {
      const n = up - 1;
      if (n === 1) return g("cousin germain", "cousine germaine") + side;
      if (n === 2) return g("cousin issu de germain", "cousine issue de germain") + side;
      return `${g("cousin", "cousine")} au ${n}e degré${side}`;
    }
    if (down === up + 1 && up >= 2) return g("petit-cousin", "petite-cousine") + side;
    return `${g("parent", "parente")} éloigné${F_ ? "e" : ""}${side}`;
  }
  // par alliance
  const spouses = unionsOf(rootId).map((u) => u.spouse).filter(Boolean);
  if (spouses.includes(otherId)) return g("époux", "épouse");
  for (const s of spouses) {
    const rs = bloodRelation(s, otherId);
    if (!rs) continue;
    if (rs.up === 1 && rs.down === 0) return g("beau-père", "belle-mère");
    if (rs.up === 1 && rs.down === 1) return g("beau-frère", "belle-sœur");
    if (rs.up === 0 && rs.down === 1) return g("beau-fils", "belle-fille");
    const rl = relationLabel(s, otherId);
    if (rl) return `${rl} du conjoint`;
  }
  // conjoint d'un parent de sang
  for (const u of unionsOf(otherId)) {
    if (!u.spouse) continue;
    const rr = bloodRelation(rootId, u.spouse);
    if (!rr) continue;
    if (rr.up === 0 && rr.down === 1) return g("gendre", "belle-fille");
    if (rr.up === 1 && rr.down === 1) return g("beau-frère", "belle-sœur");
    if (rr.up === 1 && rr.down === 0) return g("beau-père", "belle-mère");
    const rl = relationLabel(rootId, u.spouse);
    if (rl) return `${g("conjoint", "conjointe")} de ${P(u.spouse).sex === "F" && !/^[aeiouéèh]/i.test(rl) ? "sa" : "son"} ${rl}`;
  }
  return "";
}

/* =====================================================================
   Thème : auto (comme Windows) / clair / sombre
   ===================================================================== */
const THEME_LABEL = { auto: "Thème : automatique (comme Windows)", light: "Thème : clair", dark: "Thème : sombre" };
function applyTheme(mode) {
  const dark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const b = $("themeBtn");
  b.dataset.mode = mode;
  b.title = THEME_LABEL[mode] + " — cliquer pour changer";
  window.dispatchEvent(new Event("themechange"));
}
function setupTheme() {
  let mode = store.get("theme", "auto");
  applyTheme(mode);
  $("themeBtn").onclick = () => {
    mode = { auto: "light", light: "dark", dark: "auto" }[mode] || "auto";
    store.set("theme", mode);
    applyTheme(mode);
    toast(THEME_LABEL[mode]);
  };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (mode === "auto") applyTheme("auto"); });
}

/* =====================================================================
   Lien avec le serveur : battement de cœur, mise à jour automatique
   ===================================================================== */
const life = { version: null, down: false };

async function heartbeat() {
  try {
    const r = await fetch("/api/ping", { cache: "no-store" });
    const j = await r.json();
    if (life.down) { life.down = false; hideBanner(); }
    if (life.version && j.version !== life.version) {
      // l'appli a été mise à jour : on recharge dès que rien n'est en cours de saisie
      if (state.editing || !$("modal").hidden) toast("Nouvelle version de l'appli : elle s'appliquera après l'enregistrement.");
      else { location.reload(); return; }
    } else life.version = j.version;
  } catch {
    if (!life.down) { life.down = true; showBanner(); }
  }
}

function showBanner() {
  let b = $("downBanner");
  if (!b) {
    b = h("div", { id: "downBanner", class: "down-banner", role: "alert" },
      "L'appli est arrêtée. Relance-la avec ", h("b", null, "lancer.bat"), " : cette page se reconnectera toute seule.");
    document.body.append(b);
  }
  b.hidden = false;
}
function hideBanner() { const b = $("downBanner"); if (b) b.hidden = true; }

heartbeat();
setInterval(heartbeat, 5000);
// onglet fermé -> le serveur s'arrête tout seul quelques secondes plus tard (sauf si on recharge la page)
window.addEventListener("pagehide", () => { try { navigator.sendBeacon("/api/bye", "{}"); } catch { /* ignore */ } });

init();
