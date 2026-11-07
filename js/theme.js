// Selector de colores: cada visitante elige la paleta de la página.
// La elección se guarda solo en su navegador (localStorage) y no afecta a los demás.
// El <script> del <head> de index.html la aplica antes de pintar para evitar un parpadeo.
window.FS = window.FS || {};

FS.theme = (function () {
  const STORAGE_KEY = 'fs-theme'; // misma clave que usa el <script> del <head>

  const $ = (id) => document.getElementById(id);

  // localStorage puede no estar disponible (modo privado, datos bloqueados).
  function save(themeId) {
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch (e) {
      // Sin almacenamiento la paleta solo dura esta visita.
    }
  }

  function isValid(themeId) {
    return FS.config.themes.some((t) => t.id === themeId);
  }

  function apply(themeId) {
    document.documentElement.dataset.theme = themeId;
  }

  // Muestra de una paleta: el elemento con data-theme toma los colores de esa paleta.
  function swatch(themeId) {
    const node = document.createElement('span');
    node.className = 'theme-swatch';
    if (themeId) node.dataset.theme = themeId;
    node.setAttribute('aria-hidden', 'true');
    node.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
    return node;
  }

  function option(theme, selected) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = theme.id;
    input.checked = theme.id === selected;

    const label = document.createElement('label');
    label.className = 'theme-option';
    label.append(input, swatch(theme.id), theme.name);
    return label;
  }

  function setOpen(open) {
    $('theme-panel').hidden = !open;
    $('theme-toggle').setAttribute('aria-expanded', String(open));
    if (open) $('theme-panel').querySelector('input:checked').focus();
  }

  function init() {
    // Si la paleta guardada ya no existe, se vuelve a la de por defecto.
    const current = isValid(document.documentElement.dataset.theme) ? document.documentElement.dataset.theme : FS.config.defaultTheme;
    apply(current);

    // El botón muestra la paleta activa (la muestra hereda los colores de la página).
    $('theme-toggle').prepend(swatch(null));
    $('theme-options').replaceChildren(...FS.config.themes.map((t) => option(t, current)));

    $('theme-options').addEventListener('change', (event) => {
      apply(event.target.value);
      save(event.target.value);
    });

    $('theme-toggle').addEventListener('click', () => setOpen($('theme-panel').hidden));

    // Se cierra con Escape o al hacer clic fuera del selector.
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('theme-panel').hidden) {
        setOpen(false);
        $('theme-toggle').focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (!$('theme-panel').hidden && !event.target.closest('.theme-picker')) setOpen(false);
    });
  }

  return { init };
})();
