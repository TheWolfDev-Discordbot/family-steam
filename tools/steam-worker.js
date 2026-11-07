// Cloudflare Worker: intermediario entre la página y la API de Steam.
// Steam no permite consultar su API directamente desde el navegador (CORS),
// así que este Worker la consulta y devuelve solo lo que la página necesita.
//
// Uso: GET https://<worker>.workers.dev/?appId=1145360
// Respuesta: { appId, name, headerImage, price, currency }
//
// Despliegue: Cloudflare → Workers & Pages → (este Worker) → Edit code → pegar este archivo → Deploy.

// Orígenes que pueden usar el Worker desde el navegador.
const ALLOWED_ORIGINS = [
  'https://thewolfdev-discordbot.github.io',
  'http://localhost:5173'
];

// Tiempo que Cloudflare guarda en caché la respuesta de Steam (1 día).
const CACHE_SECONDS = 86400;

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin'
    };

    // Respuesta a la verificación previa (preflight) del navegador.
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, corsHeaders);

    // Solo se aceptan ids numéricos de Steam.
    const appId = new URL(request.url).searchParams.get('appId') || '';
    if (!/^\d{1,10}$/.test(appId)) return json({ error: 'invalid_app_id' }, 400, corsHeaders);

    const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=pe&l=spanish`;
    let body;
    try {
      const response = await fetch(steamUrl, { cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true } });
      if (!response.ok) return json({ error: 'steam_unavailable' }, 502, corsHeaders);
      body = await response.json();
    } catch (e) {
      return json({ error: 'steam_unavailable' }, 502, corsHeaders);
    }

    const entry = body && body[appId];
    if (!entry || !entry.success || !entry.data) return json({ error: 'not_found' }, 404, corsHeaders);

    const data = entry.data;
    const price = data.price_overview || null;
    return json(
      {
        appId,
        name: data.name || '',
        headerImage: data.header_image || '',
        price: price ? price.final / 100 : null,
        currency: price ? price.currency : null
      },
      200,
      { ...corsHeaders, 'Cache-Control': `public, max-age=${CACHE_SECONDS}` }
    );
  }
};

// Respuesta JSON con los encabezados indicados.
function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}
