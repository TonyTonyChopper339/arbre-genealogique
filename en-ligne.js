/* Version en ligne (GitHub Pages) : consultation seule.
   Remplace les appels au serveur Python par les fichiers data.json et lieux.json. */
(function () {
  window.ARBRE_EN_LIGNE = true;
  document.documentElement.classList.add("en-ligne");
  const realFetch = window.fetch.bind(window);
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json" } });
  let places = null;
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input.url;
    const path = new URL(url, location.href).pathname;
    const i = path.indexOf("/api/");
    if (i === -1) return realFetch(input, init);
    const route = path.slice(i + 5);
    const method = ((init && init.method) || "GET").toUpperCase();
    if (route === "data") return realFetch("data.json", { cache: "no-cache" });
    if (route === "ping") return json({ version: "en-ligne" });
    if (route === "bye") return json({});
    if (route === "places") {
      if (!places) places = await (await realFetch("lieux.json", { cache: "no-cache" })).json();
      if (method === "POST") {   // positions trouvées dans le navigateur : gardées en mémoire seulement
        try { Object.assign(places, JSON.parse(init.body).updates || {}); } catch (e) { /* ignore */ }
        for (const k of Object.keys(places)) if (places[k] === "delete") delete places[k];
      }
      return json(places);
    }
    return json({ error: "Version en ligne : consultation seulement." }, 403);
  };
  navigator.sendBeacon = () => true;
})();
