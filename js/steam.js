// Utilidades para trabajar con enlaces y datos de la tienda de Steam.
// La API de Steam bloquea peticiones desde el navegador (CORS), así que los datos
// del juego (nombre exacto, portada, precio) se piden a un Worker de Cloudflare
// propio (tools/steam-worker.js). Si no responde, se usa lo que trae el enlace.
window.FS = window.FS || {};

FS.steam = (function () {
  // Coincide con enlaces como https://store.steampowered.com/app/1145360/Hades/
  const APP_URL_PATTERN = /store\.steampowered\.com\/app\/(\d+)(?:\/([^/?#]+))?/i;
  const LOOKUP_TIMEOUT_MS = 8000;

  // Devuelve { appId, titleGuess } o null si el enlace no es de un juego de Steam.
  function parseStoreUrl(url) {
    const match = APP_URL_PATTERN.exec(String(url || '').trim());
    if (!match) return null;
    return {
      appId: match[1],
      titleGuess: match[2] ? slugToTitle(match[2]) : ''
    };
  }

  // Convierte el slug del enlace ("Hollow_Knight") en un nombre legible.
  function slugToTitle(slug) {
    try {
      slug = decodeURIComponent(slug);
    } catch (e) {
      // Si el slug no es decodificable se usa tal cual.
    }
    return slug.replace(/_/g, ' ').trim();
  }

  // Portada por la ruta antigua del CDN. Solo funciona con juegos publicados
  // antes de que Steam añadiera un código único a la ruta; sirve de respaldo.
  function legacyCoverUrl(appId) {
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
  }

  // Enlace canónico a la página del juego.
  function storeUrl(appId) {
    return `https://store.steampowered.com/app/${appId}/`;
  }

  // Consulta el Worker. Devuelve { name, headerImage, price } o null si no hay
  // Worker configurado, no responde a tiempo o el juego no existe.
  async function fetchAppInfo(appId) {
    if (!FS.config.steamWorkerUrl) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    try {
      const response = await fetch(`${FS.config.steamWorkerUrl}?appId=${encodeURIComponent(appId)}`, { signal: controller.signal });
      if (!response.ok) return null;
      const info = await response.json();
      return { name: info.name || '', headerImage: info.headerImage || '', price: typeof info.price === 'number' ? info.price : null };
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return { parseStoreUrl, legacyCoverUrl, storeUrl, fetchAppInfo };
})();
