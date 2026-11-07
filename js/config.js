// Configuración general de la aplicación: miembros y reglas de la familia.
// Se expone en window.FS (Family Steam) para que los demás scripts la usen.
window.FS = window.FS || {};

FS.config = {
  // Cuota mínima anual por miembro, en soles peruanos.
  minYearlyQuota: 400,

  // Años que siempre aparecen en el selector (además de cualquier año con compras).
  yearRange: { from: 2025, to: 2027 },

  // Moneda y formato regional para mostrar montos.
  currency: 'PEN',
  locale: 'es-PE',

  // URL del Worker de Cloudflare que consulta la API de Steam (ver tools/steam-worker.js).
  // Vacía = no se consulta: la portada se intenta por la ruta antigua o se pega a mano.
  steamWorkerUrl: 'https://hidden-recipe-967ffamily-steam-steam.wolf-mygamess.workers.dev/',

  // Paletas de colores que cada visitante puede elegir (los colores están en css/styles.css,
  // en los bloques [data-theme="..."]). La elección se guarda solo en su navegador.
  themes: [
    { id: 'morada', name: 'Morada' },
    { id: 'nocturna', name: 'Nocturna' },
    { id: 'dorada', name: 'Dorada' },
    { id: 'turquesa', name: 'Turquesa' },
    { id: 'cobalto', name: 'Cobalto' },
    { id: 'lavanda', name: 'Lavanda (clara)' }
  ],
  defaultTheme: 'morada',

  // Miembros del grupo familiar (nombres tal como aparecen en Steam).
  // "avatar" apunta a assets/avatars/; si no existe, se muestran iniciales.
  members: [
    { id: 'thewolf', name: 'THE WOLF', avatar: 'assets/avatars/thewolf.png' },
    { id: 'phanlu', name: 'Phan Lu', avatar: 'assets/avatars/phanlu.png' },
    { id: 'poetahalley', name: 'El poeta Halley', avatar: 'assets/avatars/poetahalley.png' },
    { id: 'zabatiel', name: 'Zabatiel', avatar: 'assets/avatars/zabatiel.png' },
    { id: 'yeonat', name: 'yeonat', avatar: 'assets/avatars/yeonat.png' },
    { id: 'piratadesopa', name: 'Piratadesopa', avatar: 'assets/avatars/piratadesopa.png' }
  ]
};
