"use strict";
/* =====================================================================
   Langues de l'interface : français, anglais, tchèque, hongrois.
   - t("clé", ...args) : texte de l'interface dans la langue choisie
   - tr(texte) : traduction d'un texte de l'arbre (notes, sources, professions…),
     prise dans data/traductions.json ; à défaut, le texte d'origine (français).
   ===================================================================== */
const LANGS = { fr: "FR", en: "EN", cs: "CS", hu: "HU" };
const LANG_NAMES = { fr: "Français", en: "English", cs: "Čeština", hu: "Magyar" };
const LANG = (() => {
  try { const l = JSON.parse(localStorage.getItem("arbre.lang")); if (LANGS[l]) return l; } catch (e) { /* ignore */ }
  return "fr";
})();
document.documentElement.lang = LANG;

const pl = (n, one, many) => (n > 1 ? many : one);
const csPl = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

const STR = {
  fr: {
    title: "Arbre généalogique", brand: "Arbre", persons: (n) => `${n} personnes`,
    view: "Vue", viewTree: "Arbre", viewMap: "Carte", language: "Langue",
    search: "Rechercher une personne…",
    ancestors: "Ascendants", ancestorsTitle: "Générations d'ascendants",
    descendants: "Descendants", descendantsTitle: "Générations de descendants", all: "Toutes",
    siblings: "Frères et sœurs", siblingsTitle: "Afficher les frères et sœurs dans l'arbre",
    theme: "Changer de thème", themeAuto: "Thème : automatique (comme Windows)", themeLight: "Thème : clair",
    themeDark: "Thème : sombre", clickToChange: "cliquer pour changer",
    undo: "Annuler (Ctrl+Z)", redo: "Rétablir (Ctrl+Y)", newPerson: "+ Personne",
    export: "Exporter GEDCOM", exportTitle: "Télécharger le GEDCOM à jour (réimportable dans Geneanet)",
    menu: "Options", mapFilters: "Filtres", legend: "Légende", sheetToggle: "Agrandir ou réduire la fiche",
    zoomIn: "Zoom avant", zoomOut: "Zoom arrière", fitAll: "Tout voir", close: "Fermer",
    noName: "(sans nom)", error: (n) => `Erreur ${n}`,
    addFather: "Ajouter le père", addMother: "Ajouter la mère", hasParents: "A des parents (cliquer pour voir)",
    removeLink: "Retirer ce lien", sourceP: "Source : ", noteP: "Note : ",
    noPersons: "Aucune personne. Ajoute-en une avec « + Personne ».",
    edit: "Modifier", delete: "Supprimer", saved: "Enregistré",
    events: "Évènements", noEvents: "Aucun évènement.", notes: "Notes", sources: "Sources", parents: "Parents",
    removeParent: "Retirer ce parent", confirmRemoveParent: (a, b) => `Retirer ${a} des parents de ${b} ?`,
    plusFather: "+ Père", plusMother: "+ Mère",
    unions: "Unions et enfants", plusSpouse: "+ Conjoint", noUnion: "Aucune union enregistrée.", plusChild: "+ Enfant",
    removeSpouse: "Retirer ce conjoint", confirmRemoveSpouse: (a) => `Retirer ${a} de cette union ?`,
    unknownSpouse: "Conjoint inconnu ", plusAdd: "+ ajouter", marriageBtn: "Mariage…",
    removeChild: "Retirer cet enfant", confirmRemoveChild: (a) => `Retirer ${a} des enfants de cette union ?`,
    file: "Fichier : ", linkRemoved: "Lien retiré",
    confirmDelete: (a) => `Supprimer définitivement ${a} de l'arbre ? (Annulable avec Ctrl+Z)`,
    personDeleted: "Personne supprimée", addNote: "+ Ajouter une note",
    sourcesPh: "Une source par ligne (cote d'archive, lien…)",
    datePh: "ex. 14/11/1968, vers 1850, avant 1936", dateLabel: "Date",
    dateBad: "Format non reconnu (ex. 14/11/1968, 11/1968, 1968, vers 1850, entre 1850 et 1860)",
    eventType: "Type d'évènement", eventTypeAdd: "Type d'évènement à ajouter",
    placePh: "Commune, département, pays…", detail: "Détail", place: "Lieu", note: "Note", plusEvent: "+ Évènement",
    given: "Prénom(s)", givenHint: "Séparés par des virgules, comme Geneanet", surname: "Nom", sex: "Sexe",
    male: "Homme", female: "Femme", unknownSex: "Inconnu", cancel: "Annuler", save: "Enregistrer",
    dateInvalidSave: "Une date n'est pas reconnue, corrige-la avant d'enregistrer.",
    nameRequired: "Indique au moins un prénom ou un nom.", confirm: "Confirmer", confirmation: "Confirmation",
    roleTitle: (role, name) => `Ajouter ${{ father: "le père", mother: "la mère", spouse: "un conjoint", child: "un enfant" }[role]} — ${name}`,
    add: "Ajouter", added: (n) => `${n} ajouté(e)`, searchPh: "Nom ou prénom…", searchAria: "Rechercher",
    noResult: "Aucun résultat", linkAdded: "Lien ajouté", searchInTree: "Chercher dans l'arbre",
    tabNew: "Nouvelle personne", tabExisting: "Personne déjà dans l'arbre", dateInvalid: "Une date n'est pas reconnue.",
    unionSaved: "Union enregistrée", unionTitle: (n) => `Union — ${n}`, newUnlinked: "Nouvelle personne (non reliée)",
    undone: "Modification annulée", redone: "Modification rétablie",
    newVersion: "Nouvelle version de l'appli : elle s'appliquera après l'enregistrement.",
    appStopped: ["L'appli est arrêtée. Relance-la avec ", " : cette page se reconnectera toute seule."],
    // carte
    gBirth: "Naissances", gMarr: "Mariages", gDeath: "Décès", gOther: "Autres (résidence…)",
    before1800: "avant 1800", since1950: "depuis 1950", epoch: "Époque", unknownDate: "date inconnue",
    parentChild: "parent → enfant", who: "Qui ?", what: "Quoi ?", ancestorsOf: (n) => `Ancêtres de ${n}`,
    wholeTree: "Tout l'arbre", paths: "Trajets parent → enfant",
    highlighted: (name, n) => `${name} : ${n} lieu${pl(n, "", "x")} en évidence`,
    noPlace: (name) => `${name} : aucun lieu renseigné`,
    stats: (p, e) => `${p} lieux · ${e} évènements sur la carte`, noPos: (n) => `${n} sans position`,
    serverOld: "Relance l'appli (lancer.bat) pour enregistrer les positions dans data/lieux.json.",
    locating: (d, n) => `Localisation des lieux… ${d}/${n}`,
    notFound: (n) => `${n} lieu${pl(n, "", "x")} introuvable${pl(n, "", "s")}`,
    placeBtn: "Placer", retry: "Réessayer",
    geoFail: "Impossible de joindre le service de cartographie (connexion internet ?).",
    placed: (p) => `« ${p} » placé`, clickToPlace: (p) => `Clique sur la carte à l'endroit de « ${p} » (Échap pour annuler)`,
    placingCancelled: "Placement annulé", movePlace: "Mal placé ? Déplacer ce lieu",
    others: (n) => `+ ${n} autre${pl(n, "", "s")}`, self: (f) => (f ? "elle-même" : "lui-même"),
    bornIn: (f, p) => `né${f ? "e" : ""} à ${p}`, parentOf: (f, n) => `${f ? "mère" : "père"} de ${n}`,
  },

  en: {
    title: "Family tree", brand: "Tree", persons: (n) => `${n} people`,
    view: "View", viewTree: "Tree", viewMap: "Map", language: "Language",
    search: "Search for a person…",
    ancestors: "Ancestors", ancestorsTitle: "Generations of ancestors",
    descendants: "Descendants", descendantsTitle: "Generations of descendants", all: "All",
    siblings: "Siblings", siblingsTitle: "Show siblings in the tree",
    theme: "Change theme", themeAuto: "Theme: automatic (system)", themeLight: "Theme: light",
    themeDark: "Theme: dark", clickToChange: "click to change",
    undo: "Undo (Ctrl+Z)", redo: "Redo (Ctrl+Y)", newPerson: "+ Person",
    export: "Export GEDCOM", exportTitle: "Download the up-to-date GEDCOM (can be re-imported into Geneanet)",
    menu: "Options", mapFilters: "Filters", legend: "Legend", sheetToggle: "Expand or collapse the details",
    zoomIn: "Zoom in", zoomOut: "Zoom out", fitAll: "Show all", close: "Close",
    noName: "(no name)", error: (n) => `Error ${n}`,
    addFather: "Add father", addMother: "Add mother", hasParents: "Has parents (click to show)",
    removeLink: "Remove this link", sourceP: "Source: ", noteP: "Note: ",
    noPersons: "No one yet. Add someone with “+ Person”.",
    edit: "Edit", delete: "Delete", saved: "Saved",
    events: "Events", noEvents: "No events.", notes: "Notes", sources: "Sources", parents: "Parents",
    removeParent: "Remove this parent", confirmRemoveParent: (a, b) => `Remove ${a} from ${b}'s parents?`,
    plusFather: "+ Father", plusMother: "+ Mother",
    unions: "Partners and children", plusSpouse: "+ Spouse", noUnion: "No recorded partnership.", plusChild: "+ Child",
    removeSpouse: "Remove this spouse", confirmRemoveSpouse: (a) => `Remove ${a} from this partnership?`,
    unknownSpouse: "Unknown spouse ", plusAdd: "+ add", marriageBtn: "Marriage…",
    removeChild: "Remove this child", confirmRemoveChild: (a) => `Remove ${a} from this partnership's children?`,
    file: "File: ", linkRemoved: "Link removed",
    confirmDelete: (a) => `Permanently delete ${a} from the tree? (Ctrl+Z to undo)`,
    personDeleted: "Person deleted", addNote: "+ Add a note",
    sourcesPh: "One source per line (archive reference, link…)",
    datePh: "e.g. 14/11/1968, about 1850, before 1936", dateLabel: "Date",
    dateBad: "Format not recognised (e.g. 14/11/1968, 11/1968, 1968, about 1850, between 1850 and 1860)",
    eventType: "Event type", eventTypeAdd: "Event type to add",
    placePh: "Town, county, country…", detail: "Detail", place: "Place", note: "Note", plusEvent: "+ Event",
    given: "Given name(s)", givenHint: "Comma-separated, as in Geneanet", surname: "Surname", sex: "Sex",
    male: "Male", female: "Female", unknownSex: "Unknown", cancel: "Cancel", save: "Save",
    dateInvalidSave: "A date wasn't recognised — fix it before saving.",
    nameRequired: "Enter at least a given name or a surname.", confirm: "Confirm", confirmation: "Confirmation",
    roleTitle: (role, name) => `Add ${{ father: "father", mother: "mother", spouse: "a spouse", child: "a child" }[role]} — ${name}`,
    add: "Add", added: (n) => `${n} added`, searchPh: "Name or given name…", searchAria: "Search",
    noResult: "No results", linkAdded: "Link added", searchInTree: "Search the tree",
    tabNew: "New person", tabExisting: "Person already in the tree", dateInvalid: "A date wasn't recognised.",
    unionSaved: "Partnership saved", unionTitle: (n) => `Partnership — ${n}`, newUnlinked: "New person (not linked)",
    undone: "Change undone", redone: "Change redone",
    newVersion: "New app version: it will apply after saving.",
    appStopped: ["The app has stopped. Restart it with ", " — this page will reconnect by itself."],
    gBirth: "Births", gMarr: "Marriages", gDeath: "Deaths", gOther: "Other (residence…)",
    before1800: "before 1800", since1950: "since 1950", epoch: "Period", unknownDate: "unknown date",
    parentChild: "parent → child", who: "Who?", what: "What?", ancestorsOf: (n) => `Ancestors of ${n}`,
    wholeTree: "The whole tree", paths: "Parent → child paths",
    highlighted: (name, n) => `${name}: ${n} place${pl(n, "", "s")} highlighted`,
    noPlace: (name) => `${name}: no place recorded`,
    stats: (p, e) => `${p} places · ${e} events on the map`, noPos: (n) => `${n} without a location`,
    serverOld: "Restart the app (lancer.bat) to save positions in data/lieux.json.",
    locating: (d, n) => `Locating places… ${d}/${n}`,
    notFound: (n) => `${n} place${pl(n, "", "s")} not found`,
    placeBtn: "Place", retry: "Retry",
    geoFail: "Can't reach the mapping service (internet connection?).",
    placed: (p) => `“${p}” placed`, clickToPlace: (p) => `Click the map where “${p}” is (Esc to cancel)`,
    placingCancelled: "Placement cancelled", movePlace: "Wrong spot? Move this place",
    others: (n) => `+ ${n} more`, self: (f) => (f ? "herself" : "himself"),
    bornIn: (f, p) => `born in ${p}`, parentOf: (f, n) => `${f ? "mother" : "father"} of ${n}`,
  },

  cs: {
    title: "Rodokmen", brand: "Rodokmen", persons: (n) => `${n} ${csPl(n, "osoba", "osoby", "osob")}`,
    view: "Zobrazení", viewTree: "Strom", viewMap: "Mapa", language: "Jazyk",
    search: "Hledat osobu…",
    ancestors: "Předci", ancestorsTitle: "Počet generací předků",
    descendants: "Potomci", descendantsTitle: "Počet generací potomků", all: "Vše",
    siblings: "Sourozenci", siblingsTitle: "Zobrazit sourozence ve stromu",
    theme: "Změnit motiv", themeAuto: "Motiv: automatický (podle systému)", themeLight: "Motiv: světlý",
    themeDark: "Motiv: tmavý", clickToChange: "kliknutím změníte",
    undo: "Zpět (Ctrl+Z)", redo: "Znovu (Ctrl+Y)", newPerson: "+ Osoba",
    export: "Exportovat GEDCOM", exportTitle: "Stáhnout aktuální GEDCOM (lze znovu importovat do Geneanetu)",
    menu: "Možnosti", mapFilters: "Filtry", legend: "Legenda", sheetToggle: "Rozbalit nebo sbalit kartu",
    zoomIn: "Přiblížit", zoomOut: "Oddálit", fitAll: "Zobrazit vše", close: "Zavřít",
    noName: "(bez jména)", error: (n) => `Chyba ${n}`,
    addFather: "Přidat otce", addMother: "Přidat matku", hasParents: "Má rodiče (kliknutím zobrazíte)",
    removeLink: "Odebrat toto propojení", sourceP: "Zdroj: ", noteP: "Poznámka: ",
    noPersons: "Zatím nikdo. Přidejte osobu tlačítkem „+ Osoba“.",
    edit: "Upravit", delete: "Smazat", saved: "Uloženo",
    events: "Události", noEvents: "Žádné události.", notes: "Poznámky", sources: "Zdroje", parents: "Rodiče",
    removeParent: "Odebrat tohoto rodiče", confirmRemoveParent: (a, b) => `Odebrat ${a} z rodičů osoby ${b}?`,
    plusFather: "+ Otec", plusMother: "+ Matka",
    unions: "Svazky a děti", plusSpouse: "+ Partner", noUnion: "Žádný zaznamenaný svazek.", plusChild: "+ Dítě",
    removeSpouse: "Odebrat tohoto partnera", confirmRemoveSpouse: (a) => `Odebrat ${a} z tohoto svazku?`,
    unknownSpouse: "Neznámý partner ", plusAdd: "+ přidat", marriageBtn: "Sňatek…",
    removeChild: "Odebrat toto dítě", confirmRemoveChild: (a) => `Odebrat ${a} z dětí tohoto svazku?`,
    file: "Soubor: ", linkRemoved: "Propojení odebráno",
    confirmDelete: (a) => `Trvale smazat ${a} z rodokmenu? (Lze vrátit pomocí Ctrl+Z)`,
    personDeleted: "Osoba smazána", addNote: "+ Přidat poznámku",
    sourcesPh: "Jeden zdroj na řádek (signatura, odkaz…)",
    datePh: "např. 14/11/1968, kolem 1850, před 1936", dateLabel: "Datum",
    dateBad: "Neznámý formát (např. 14/11/1968, 11/1968, 1968, kolem 1850, mezi 1850 a 1860)",
    eventType: "Typ události", eventTypeAdd: "Typ události k přidání",
    placePh: "Obec, okres, země…", detail: "Podrobnosti", place: "Místo", note: "Poznámka", plusEvent: "+ Událost",
    given: "Jméno (jména)", givenHint: "Oddělená čárkami, jako v Geneanetu", surname: "Příjmení", sex: "Pohlaví",
    male: "Muž", female: "Žena", unknownSex: "Neznámé", cancel: "Zrušit", save: "Uložit",
    dateInvalidSave: "Jedno datum nebylo rozpoznáno, před uložením ho opravte.",
    nameRequired: "Zadejte alespoň jméno nebo příjmení.", confirm: "Potvrdit", confirmation: "Potvrzení",
    roleTitle: (role, name) => `Přidat ${{ father: "otce", mother: "matku", spouse: "partnera", child: "dítě" }[role]} — ${name}`,
    add: "Přidat", added: (n) => `${n}: přidáno`, searchPh: "Jméno nebo příjmení…", searchAria: "Hledat",
    noResult: "Žádné výsledky", linkAdded: "Propojení přidáno", searchInTree: "Hledat v rodokmenu",
    tabNew: "Nová osoba", tabExisting: "Osoba už v rodokmenu", dateInvalid: "Jedno datum nebylo rozpoznáno.",
    unionSaved: "Svazek uložen", unionTitle: (n) => `Svazek — ${n}`, newUnlinked: "Nová osoba (nepropojená)",
    undone: "Změna vrácena", redone: "Změna obnovena",
    newVersion: "Nová verze aplikace: použije se po uložení.",
    appStopped: ["Aplikace neběží. Spusťte ji znovu pomocí ", " – stránka se sama znovu připojí."],
    gBirth: "Narození", gMarr: "Sňatky", gDeath: "Úmrtí", gOther: "Ostatní (bydliště…)",
    before1800: "před 1800", since1950: "od 1950", epoch: "Období", unknownDate: "neznámé datum",
    parentChild: "rodič → dítě", who: "Kdo?", what: "Co?", ancestorsOf: (n) => `Předci: ${n}`,
    wholeTree: "Celý rodokmen", paths: "Cesty rodič → dítě",
    highlighted: (name, n) => `${name}: zvýrazněná místa: ${n}`,
    noPlace: (name) => `${name}: žádné místo`,
    stats: (p, e) => `míst: ${p} · událostí na mapě: ${e}`, noPos: (n) => `bez polohy: ${n}`,
    serverOld: "Restartujte aplikaci (lancer.bat), aby se polohy uložily do data/lieux.json.",
    locating: (d, n) => `Vyhledávání míst… ${d}/${n}`,
    notFound: (n) => `nenalezená místa: ${n}`,
    placeBtn: "Umístit", retry: "Zkusit znovu",
    geoFail: "Nelze se připojit k mapové službě (připojení k internetu?).",
    placed: (p) => `„${p}“ umístěno`, clickToPlace: (p) => `Klikněte na mapu v místě „${p}“ (Esc pro zrušení)`,
    placingCancelled: "Umísťování zrušeno", movePlace: "Špatně umístěno? Přesunout místo",
    others: (n) => `+ ${n} ${csPl(n, "další", "další", "dalších")}`, self: (f) => (f ? "ona sama" : "on sám"),
    bornIn: (f, p) => `${f ? "narozena" : "narozen"}: ${p}`, parentOf: (f, n) => `${f ? "matka" : "otec"} – ${n}`,
  },

  hu: {
    title: "Családfa", brand: "Családfa", persons: (n) => `${n} személy`,
    view: "Nézet", viewTree: "Fa", viewMap: "Térkép", language: "Nyelv",
    search: "Személy keresése…",
    ancestors: "Felmenők", ancestorsTitle: "Felmenő generációk",
    descendants: "Leszármazottak", descendantsTitle: "Leszármazott generációk", all: "Mind",
    siblings: "Testvérek", siblingsTitle: "Testvérek megjelenítése a fában",
    theme: "Téma váltása", themeAuto: "Téma: automatikus (rendszer szerint)", themeLight: "Téma: világos",
    themeDark: "Téma: sötét", clickToChange: "kattints a váltáshoz",
    undo: "Visszavonás (Ctrl+Z)", redo: "Újra (Ctrl+Y)", newPerson: "+ Személy",
    export: "GEDCOM exportálása", exportTitle: "A friss GEDCOM letöltése (újra importálható a Geneanetbe)",
    menu: "Beállítások", mapFilters: "Szűrők", legend: "Jelmagyarázat", sheetToggle: "Adatlap kinyitása vagy becsukása",
    zoomIn: "Nagyítás", zoomOut: "Kicsinyítés", fitAll: "Teljes nézet", close: "Bezárás",
    noName: "(névtelen)", error: (n) => `Hiba ${n}`,
    addFather: "Apa hozzáadása", addMother: "Anya hozzáadása", hasParents: "Vannak szülei (kattints a megjelenítéshez)",
    removeLink: "Kapcsolat eltávolítása", sourceP: "Forrás: ", noteP: "Megjegyzés: ",
    noPersons: "Még nincs senki. Adj hozzá valakit a „+ Személy” gombbal.",
    edit: "Szerkesztés", delete: "Törlés", saved: "Mentve",
    events: "Események", noEvents: "Nincs esemény.", notes: "Megjegyzések", sources: "Források", parents: "Szülők",
    removeParent: "Szülő eltávolítása", confirmRemoveParent: (a, b) => `Eltávolítod ${a} személyt ${b} szülei közül?`,
    plusFather: "+ Apa", plusMother: "+ Anya",
    unions: "Kapcsolatok és gyermekek", plusSpouse: "+ Házastárs", noUnion: "Nincs rögzített kapcsolat.", plusChild: "+ Gyermek",
    removeSpouse: "Házastárs eltávolítása", confirmRemoveSpouse: (a) => `Eltávolítod ${a} személyt ebből a kapcsolatból?`,
    unknownSpouse: "Ismeretlen házastárs ", plusAdd: "+ hozzáadás", marriageBtn: "Házasság…",
    removeChild: "Gyermek eltávolítása", confirmRemoveChild: (a) => `Eltávolítod ${a} személyt a kapcsolat gyermekei közül?`,
    file: "Fájl: ", linkRemoved: "Kapcsolat eltávolítva",
    confirmDelete: (a) => `Véglegesen törlöd ${a} személyt a fából? (Ctrl+Z-vel visszavonható)`,
    personDeleted: "Személy törölve", addNote: "+ Megjegyzés hozzáadása",
    sourcesPh: "Soronként egy forrás (levéltári jelzet, link…)",
    datePh: "pl. 14/11/1968, 1850 körül, 1936 előtt", dateLabel: "Dátum",
    dateBad: "Ismeretlen formátum (pl. 14/11/1968, 11/1968, 1968, 1850 körül, 1850 és 1860 között)",
    eventType: "Esemény típusa", eventTypeAdd: "Hozzáadandó esemény típusa",
    placePh: "Település, megye, ország…", detail: "Részletek", place: "Hely", note: "Megjegyzés", plusEvent: "+ Esemény",
    given: "Utónév(ek)", givenHint: "Vesszővel elválasztva, mint a Geneanetben", surname: "Vezetéknév", sex: "Nem",
    male: "Férfi", female: "Nő", unknownSex: "Ismeretlen", cancel: "Mégse", save: "Mentés",
    dateInvalidSave: "Egy dátum nem ismerhető fel, javítsd mentés előtt.",
    nameRequired: "Adj meg legalább egy utó- vagy vezetéknevet.", confirm: "Megerősítés", confirmation: "Megerősítés",
    roleTitle: (role, name) => `${{ father: "Apa", mother: "Anya", spouse: "Házastárs", child: "Gyermek" }[role]} hozzáadása — ${name}`,
    add: "Hozzáadás", added: (n) => `${n} hozzáadva`, searchPh: "Név vagy utónév…", searchAria: "Keresés",
    noResult: "Nincs találat", linkAdded: "Kapcsolat hozzáadva", searchInTree: "Keresés a fában",
    tabNew: "Új személy", tabExisting: "Már a fában lévő személy", dateInvalid: "Egy dátum nem ismerhető fel.",
    unionSaved: "Kapcsolat mentve", unionTitle: (n) => `Kapcsolat — ${n}`, newUnlinked: "Új személy (kapcsolat nélkül)",
    undone: "Módosítás visszavonva", redone: "Módosítás visszaállítva",
    newVersion: "Új alkalmazásverzió: mentés után lép életbe.",
    appStopped: ["Az alkalmazás leállt. Indítsd újra ezzel: ", " – az oldal magától újracsatlakozik."],
    gBirth: "Születések", gMarr: "Házasságok", gDeath: "Halálozások", gOther: "Egyéb (lakóhely…)",
    before1800: "1800 előtt", since1950: "1950 óta", epoch: "Korszak", unknownDate: "ismeretlen dátum",
    parentChild: "szülő → gyermek", who: "Kik?", what: "Mi?", ancestorsOf: (n) => `${n} felmenői`,
    wholeTree: "Az egész fa", paths: "Útvonalak szülő → gyermek",
    highlighted: (name, n) => `${name}: ${n} kiemelt hely`,
    noPlace: (name) => `${name}: nincs megadott hely`,
    stats: (p, e) => `${p} hely · ${e} esemény a térképen`, noPos: (n) => `${n} hely nélkül`,
    serverOld: "Indítsd újra az alkalmazást (lancer.bat), hogy a helyek a data/lieux.json fájlba mentődjenek.",
    locating: (d, n) => `Helyek keresése… ${d}/${n}`,
    notFound: (n) => `${n} hely nem található`,
    placeBtn: "Elhelyezés", retry: "Újra",
    geoFail: "A térképszolgáltatás nem érhető el (internetkapcsolat?).",
    placed: (p) => `„${p}” elhelyezve`, clickToPlace: (p) => `Kattints a térképen oda, ahol „${p}” van (Esc: mégse)`,
    placingCancelled: "Elhelyezés megszakítva", movePlace: "Rossz helyen van? Hely áthelyezése",
    others: (n) => `+ ${n} további`, self: () => "saját maga",
    bornIn: (f, p) => `született: ${p}`, parentOf: (f, n) => `${n} ${f ? "anyja" : "apja"}`,
  },
};

function t(key, ...args) {
  const v = (STR[LANG] && STR[LANG][key]) ?? STR.fr[key];
  if (v === undefined) return key;
  return typeof v === "function" ? v(...args) : v;
}

/* ------------------------------------------------------------- évènements */
const EVENT_LABELS_I18N = {
  fr: {
    BIRT: "Naissance", CHR: "Baptême (CHR)", BAPM: "Baptême", DEAT: "Décès", BURI: "Inhumation",
    CREM: "Crémation", OCCU: "Profession", RESI: "Résidence", NATU: "Naturalisation",
    IMMI: "Immigration", EMIG: "Émigration", EDUC: "Études", RELI: "Religion", TITL: "Titre",
    GRAD: "Diplôme", RETI: "Retraite", CENS: "Recensement", CONF: "Confirmation", ADOP: "Adoption",
    WILL: "Testament", PROB: "Succession", EVEN: "Autre évènement", FACT: "Fait", NATI: "Nationalité",
    DSCR: "Description physique",
    ENGA: "Fiançailles", MARB: "Publication des bans", MARC: "Contrat de mariage", MARL: "Licence de mariage",
    MARS: "Accord de mariage", MARR: "Mariage", DIV: "Divorce", DIVF: "Demande de divorce", ANUL: "Annulation",
  },
  en: {
    BIRT: "Birth", CHR: "Christening (CHR)", BAPM: "Baptism", DEAT: "Death", BURI: "Burial",
    CREM: "Cremation", OCCU: "Occupation", RESI: "Residence", NATU: "Naturalisation",
    IMMI: "Immigration", EMIG: "Emigration", EDUC: "Education", RELI: "Religion", TITL: "Title",
    GRAD: "Graduation", RETI: "Retirement", CENS: "Census", CONF: "Confirmation", ADOP: "Adoption",
    WILL: "Will", PROB: "Probate", EVEN: "Other event", FACT: "Fact", NATI: "Nationality",
    DSCR: "Physical description",
    ENGA: "Engagement", MARB: "Marriage banns", MARC: "Marriage contract", MARL: "Marriage licence",
    MARS: "Marriage settlement", MARR: "Marriage", DIV: "Divorce", DIVF: "Divorce filing", ANUL: "Annulment",
  },
  cs: {
    BIRT: "Narození", CHR: "Křest (CHR)", BAPM: "Křest", DEAT: "Úmrtí", BURI: "Pohřeb",
    CREM: "Kremace", OCCU: "Povolání", RESI: "Bydliště", NATU: "Naturalizace",
    IMMI: "Přistěhování", EMIG: "Vystěhování", EDUC: "Vzdělání", RELI: "Náboženství", TITL: "Titul",
    GRAD: "Absolvování", RETI: "Odchod do důchodu", CENS: "Sčítání lidu", CONF: "Biřmování", ADOP: "Adopce",
    WILL: "Závěť", PROB: "Pozůstalostní řízení", EVEN: "Jiná událost", FACT: "Skutečnost", NATI: "Národnost",
    DSCR: "Popis osoby",
    ENGA: "Zasnoubení", MARB: "Ohlášky", MARC: "Svatební smlouva", MARL: "Povolení k sňatku",
    MARS: "Předmanželská dohoda", MARR: "Sňatek", DIV: "Rozvod", DIVF: "Žádost o rozvod", ANUL: "Zrušení sňatku",
  },
  hu: {
    BIRT: "Születés", CHR: "Keresztelő (CHR)", BAPM: "Keresztelő", DEAT: "Halál", BURI: "Temetés",
    CREM: "Hamvasztás", OCCU: "Foglalkozás", RESI: "Lakóhely", NATU: "Honosítás",
    IMMI: "Bevándorlás", EMIG: "Kivándorlás", EDUC: "Tanulmányok", RELI: "Vallás", TITL: "Cím",
    GRAD: "Diploma", RETI: "Nyugdíjba vonulás", CENS: "Népszámlálás", CONF: "Bérmálás", ADOP: "Örökbefogadás",
    WILL: "Végrendelet", PROB: "Hagyatéki eljárás", EVEN: "Egyéb esemény", FACT: "Tény", NATI: "Nemzetiség",
    DSCR: "Személyleírás",
    ENGA: "Eljegyzés", MARB: "Kihirdetés", MARC: "Házassági szerződés", MARL: "Házassági engedély",
    MARS: "Házassági megállapodás", MARR: "Házasság", DIV: "Válás", DIVF: "Válókereset", ANUL: "Érvénytelenítés",
  },
};
const VALUE_LABELS_I18N = {
  fr: { OCCU: "Profession", TITL: "Titre", EDUC: "Diplôme / école", RELI: "Religion", NATI: "Nationalité",
    DSCR: "Description", EVEN: "Description", FACT: "Description", GRAD: "Diplôme", CENS: "Détail", RESI: "Détail" },
  en: { OCCU: "Occupation", TITL: "Title", EDUC: "Degree / school", RELI: "Religion", NATI: "Nationality",
    DSCR: "Description", EVEN: "Description", FACT: "Description", GRAD: "Degree", CENS: "Detail", RESI: "Detail" },
  cs: { OCCU: "Povolání", TITL: "Titul", EDUC: "Vzdělání / škola", RELI: "Náboženství", NATI: "Národnost",
    DSCR: "Popis", EVEN: "Popis", FACT: "Popis", GRAD: "Diplom", CENS: "Podrobnosti", RESI: "Podrobnosti" },
  hu: { OCCU: "Foglalkozás", TITL: "Cím", EDUC: "Végzettség / iskola", RELI: "Vallás", NATI: "Nemzetiség",
    DSCR: "Leírás", EVEN: "Leírás", FACT: "Leírás", GRAD: "Diploma", CENS: "Részletek", RESI: "Részletek" },
};

/* ------------------------------------------------------------- dates (affichage) */
const DATE_LOCALE = { fr: null, en: "en-GB", cs: "cs", hu: "hu" };
function datePartI18n(day, mi, year) {
  const loc = DATE_LOCALE[LANG];
  if (mi < 0) return String(+year);
  const d = new Date(0);
  d.setUTCFullYear(+year, mi, day ? +day : 1);
  const opts = day ? { day: "numeric", month: LANG === "en" ? "short" : "long", year: "numeric", timeZone: "UTC" }
    : { month: "long", year: "numeric", timeZone: "UTC" };
  try { return new Intl.DateTimeFormat(loc, opts).format(d); } catch (e) { return `${day ? day + " " : ""}${mi + 1}/${year}`; }
}
const DATE_WORDS = {
  en: { BET: (a, b) => `between ${a} and ${b}`, FROMTO: (a, b) => `from ${a} to ${b}`, FROM: (a) => `from ${a}`,
    TO: (a) => `until ${a}`, ABT: (a) => `about ${a}`, BEF: (a) => `before ${a}`, AFT: (a) => `after ${a}`,
    EST: (a) => `estimated ${a}`, CAL: (a) => `calculated ${a}` },
  cs: { BET: (a, b) => `mezi ${a} a ${b}`, FROMTO: (a, b) => `od ${a} do ${b}`, FROM: (a) => `od ${a}`,
    TO: (a) => `do ${a}`, ABT: (a) => `kolem ${a}`, BEF: (a) => `před ${a}`, AFT: (a) => `po ${a}`,
    EST: (a) => `odhadem ${a}`, CAL: (a) => `vypočteno ${a}` },
  hu: { BET: (a, b) => `${a} és ${b} között`, FROMTO: (a, b) => `${a} – ${b}`, FROM: (a) => `${a} óta`,
    TO: (a) => `${a}-ig`, ABT: (a) => `${a} körül`, BEF: (a) => `${a} előtt`, AFT: (a) => `${a} után`,
    EST: (a) => `becslés szerint ${a}`, CAL: (a) => `számítva ${a}` },
};

/* ------------------------------------------------------------- liens de parenté */
const ORD = {
  fr: (n) => `${n}e`, cs: (n) => `${n}.`, hu: (n) => `${n}.`,
  en: (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); },
};
const REL = {
  fr(r) {
    const F_ = r.f, g = (m, f) => (F_ ? f : m);
    const side = r.side ? (r.side === "P" ? " paternel" : " maternel") + (F_ ? "le" : "") : "";
    const o = ORD.fr;
    switch (r.k) {
      case "parent": return g("père", "mère");
      case "gp": return g("grand-père", "grand-mère") + side;
      case "ggp": return g("arrière-grand-père", "arrière-grand-mère") + side;
      case "gggp": return g("arrière-arrière-grand-père", "arrière-arrière-grand-mère") + side;
      case "anc": return `ancêtre${side} (${o(r.n)} génération)`;
      case "child": return g("fils", "fille");
      case "gc": return g("petit-fils", "petite-fille");
      case "ggc": return g("arrière-petit-fils", "arrière-petite-fille");
      case "desc": return `descendant${F_ ? "e" : ""} (${o(r.n)} génération)`;
      case "sib": return (r.half ? "demi-" : "") + g("frère", "sœur");
      case "nephew": return g("neveu", "nièce");
      case "gnephew": return g("petit-neveu", "petite-nièce");
      case "uncle": return g("oncle", "tante") + side;
      case "guncle": return g("grand-oncle", "grand-tante") + side;
      case "gguncle": return g("arrière-grand-oncle", "arrière-grand-tante") + side;
      case "sibAnc": return `${g("frère", "sœur")} d'un ancêtre${side} (${o(r.n)} génération)`;
      case "cousin":
        if (r.n === 1) return g("cousin germain", "cousine germaine") + side;
        if (r.n === 2) return g("cousin issu de germain", "cousine issue de germain") + side;
        return `${g("cousin", "cousine")} au ${o(r.n)} degré${side}`;
      case "cousinChild": return g("petit-cousin", "petite-cousine") + side;
      case "distant": return `${g("parent", "parente")} éloigné${F_ ? "e" : ""}${side}`;
      case "spouse": return g("époux", "épouse");
      case "parentInLaw": case "stepParent": return g("beau-père", "belle-mère");
      case "sibInLaw": return g("beau-frère", "belle-sœur");
      case "stepchild": return g("beau-fils", "belle-fille");
      case "childInLaw": return g("gendre", "belle-fille");
      case "ofSpouse": return `${REL.fr(r.inner)} du conjoint`;
      case "spouseOf": {
        const rl = REL.fr(r.inner);
        return `${g("conjoint", "conjointe")} de ${r.inner.f && !/^[aeiouéèh]/i.test(rl) ? "sa" : "son"} ${rl}`;
      }
    }
    return "";
  },
  en(r) {
    const g = (m, f) => (r.f ? f : m);
    const side = r.side ? (r.side === "P" ? "paternal " : "maternal ") : "";
    const o = ORD.en;
    switch (r.k) {
      case "parent": return g("father", "mother");
      case "gp": return side + g("grandfather", "grandmother");
      case "ggp": return side + g("great-grandfather", "great-grandmother");
      case "gggp": return side + g("great-great-grandfather", "great-great-grandmother");
      case "anc": return `${side}ancestor (${o(r.n)} generation)`;
      case "child": return g("son", "daughter");
      case "gc": return g("grandson", "granddaughter");
      case "ggc": return g("great-grandson", "great-granddaughter");
      case "desc": return `descendant (${o(r.n)} generation)`;
      case "sib": return (r.half ? "half-" : "") + g("brother", "sister");
      case "nephew": return g("nephew", "niece");
      case "gnephew": return g("great-nephew", "great-niece");
      case "uncle": return side + g("uncle", "aunt");
      case "guncle": return side + g("great-uncle", "great-aunt");
      case "gguncle": return side + g("great-great-uncle", "great-great-aunt");
      case "sibAnc": return `${g("brother", "sister")} of a ${side}ancestor (${o(r.n)} generation)`;
      case "cousin": return `${side}${r.n === 1 ? "first" : r.n === 2 ? "second" : o(r.n)} cousin`;
      case "cousinChild": return `${side}first cousin once removed`;
      case "distant": return `distant ${side}relative`;
      case "spouse": return g("husband", "wife");
      case "parentInLaw": return g("father-in-law", "mother-in-law");
      case "stepParent": return g("stepfather", "stepmother");
      case "sibInLaw": return g("brother-in-law", "sister-in-law");
      case "stepchild": return g("stepson", "stepdaughter");
      case "childInLaw": return g("son-in-law", "daughter-in-law");
      case "ofSpouse": return `${r.spouseF ? "wife's" : "husband's"} ${REL.en(r.inner)}`;
      case "spouseOf": return `${g("husband", "wife")} of ${REL.en(r.inner)}`;
    }
    return "";
  },
  cs(r) {
    const g = (m, f) => (r.f ? f : m);
    const side = r.side ? (r.side === "P" ? " z otcovy strany" : " z matčiny strany") : "";
    const o = ORD.cs;
    switch (r.k) {
      case "parent": return g("otec", "matka");
      case "gp": return g("dědeček", "babička") + side;
      case "ggp": return g("pradědeček", "prababička") + side;
      case "gggp": return g("prapradědeček", "praprababička") + side;
      case "anc": return `${g("předek", "předkyně")}${side} (${o(r.n)} generace)`;
      case "child": return g("syn", "dcera");
      case "gc": return g("vnuk", "vnučka");
      case "ggc": return g("pravnuk", "pravnučka");
      case "desc": return `${g("potomek", "potomkyně")} (${o(r.n)} generace)`;
      case "sib": return (r.half ? "nevlastní " : "") + g("bratr", "sestra");
      case "nephew": return g("synovec", "neteř");
      case "gnephew": return g("prasynovec", "praneteř");
      case "uncle": return g("strýc", "teta") + side;
      case "guncle": return g("prastrýc", "prateta") + side;
      case "gguncle": return g("praprastrýc", "prapráteta") + side;
      case "sibAnc": return `${g("bratr", "sestra")} předka${side} (${o(r.n)} generace)`;
      case "cousin":
        if (r.n === 1) return g("bratranec", "sestřenice") + side;
        return `${g("bratranec", "sestřenice")} ${o(r.n)} stupně${side}`;
      case "cousinChild": return `${g("syn", "dcera")} bratrance/sestřenice${side}`;
      case "distant": return `${g("vzdálený příbuzný", "vzdálená příbuzná")}${side}`;
      case "spouse": return g("manžel", "manželka");
      case "parentInLaw": return g("tchán", "tchyně");
      case "stepParent": return g("otčím", "macecha");
      case "sibInLaw": return g("švagr", "švagrová");
      case "stepchild": return g("nevlastní syn", "nevlastní dcera");
      case "childInLaw": return g("zeť", "snacha");
      case "ofSpouse": return `${REL.cs(r.inner)} ${r.spouseF ? "manželky" : "manžela"}`;
      case "spouseOf": return `${g("manžel", "manželka")} (${REL.cs(r.inner)})`;
    }
    return "";
  },
  hu(r) {
    const g = (m, f) => (r.f ? f : m);
    const side = r.side ? (r.side === "P" ? "apai " : "anyai ") : "";
    const o = ORD.hu;
    switch (r.k) {
      case "parent": return g("apa", "anya");
      case "gp": return side + g("nagyapa", "nagyanya");
      case "ggp": return side + g("dédapa", "dédanya");
      case "gggp": return side + g("ükapa", "ükanya");
      case "anc": return `${side}felmenő (${o(r.n)} generáció)`;
      case "child": return g("fia", "lánya");
      case "gc": return "unoka";
      case "ggc": return "dédunoka";
      case "desc": return `leszármazott (${o(r.n)} generáció)`;
      case "sib": return r.half ? g("féltestvér (fiú)", "féltestvér (lány)") : g("fivér", "nővér");
      case "nephew": return g("unokaöcs", "unokahúg");
      case "gnephew": return "testvér unokája";
      case "uncle": return side + g("nagybácsi", "nagynéni");
      case "guncle": return side + g("nagyszülő fivére", "nagyszülő nővére");
      case "gguncle": return side + g("dédszülő fivére", "dédszülő nővére");
      case "sibAnc": return `${side}felmenő ${g("fivére", "nővére")} (${o(r.n)} generáció)`;
      case "cousin":
        if (r.n === 1) return `${side}unokatestvér`;
        if (r.n === 2) return `${side}másod-unokatestvér`;
        return `${side}${o(r.n)} fokú unokatestvér`;
      case "cousinChild": return `${side}unokatestvér gyermeke`;
      case "distant": return `${side}távoli rokon`;
      case "spouse": return g("férj", "feleség");
      case "parentInLaw": return g("após", "anyós");
      case "stepParent": return g("mostohaapa", "mostohaanya");
      case "sibInLaw": return g("sógor", "sógornő");
      case "stepchild": return g("mostohafiú", "mostohalány");
      case "childInLaw": return g("vő", "meny");
      case "ofSpouse": return `${REL.hu(r.inner)} (házastárs ágán)`;
      case "spouseOf": return `${REL.hu(r.inner)} ${g("férje", "felesége")}`;
    }
    return "";
  },
};

/* ------------------------------------------------------------- textes de l'arbre */
let TRANSLATIONS = {};
async function loadTranslations() {
  try {
    const r = await fetch("/api/translations", { cache: "no-store" });
    if (r.ok) TRANSLATIONS = await r.json();
  } catch (e) { /* pas de traductions : texte d'origine */ }
}
function tr(text) {
  if (LANG === "fr" || !text) return text;
  const d = TRANSLATIONS[LANG];
  return (d && d[text]) || text;
}

/* ------------------------------------------------------------- textes de la page HTML */
function applyStaticI18n() {
  document.title = t("title");
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-title]")) el.title = t(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll("[data-i18n-aria]")) el.setAttribute("aria-label", t(el.dataset.i18nAria));
  for (const el of document.querySelectorAll("[data-i18n-ph]")) el.placeholder = t(el.dataset.i18nPh);
  const sel = document.getElementById("langSel");
  if (sel) {
    sel.replaceChildren(...Object.keys(LANGS).map((l) => {
      const o = document.createElement("option");
      o.value = l; o.textContent = LANGS[l]; o.title = LANG_NAMES[l]; o.selected = l === LANG;
      return o;
    }));
    sel.title = t("language");
    sel.setAttribute("aria-label", t("language"));
    sel.onchange = () => {
      try { localStorage.setItem("arbre.lang", JSON.stringify(sel.value)); } catch (e) { /* ignore */ }
      location.reload();
    };
  }
}
