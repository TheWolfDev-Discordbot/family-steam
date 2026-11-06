// Utilidades para trabajar con enlaces de la tienda de Steam.
// No se usa la API de Steam (bloquea peticiones desde el navegador por CORS):
// el id y el nombre se obtienen del propio enlace y la portada del CDN público.
window.FS = window.FS || {};

FS.steam = (function () {
  // Coincide con enlaces como https://store.steampowered.com/app/1145360/Hades/
  const APP_URL_PATTERN = /store\.steampowered\.com\/app\/(\d+)(?:\/([^/?#]+))?/i;

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

  // Portada horizontal (460x215) del juego.
  function coverUrl(appId) {
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
  }

  // Enlace canónico a la página del juego.
  function storeUrl(appId) {
    return `https://store.steampowered.com/app/${appId}/`;
  }

  return { parseStoreUrl, coverUrl, storeUrl };
})();
