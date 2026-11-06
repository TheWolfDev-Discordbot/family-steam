// Lógica de la interfaz: render de secciones y manejo de formularios.
(function () {
  const { formatMoney, round2, todayIso, yearOf, formatDate, newId, normalize, getMember, initials } = FS.utils;
  const currentYear = new Date().getFullYear();

  // Estado en memoria (copia de lo guardado) y estado de la interfaz.
  let data = { purchases: [], planned: [] };
  const ui = {
    year: currentYear,
    filterMember: 'all',
    search: '',
    editingId: null, // id de la compra que se está editando
    titleAuto: true, // el nombre del juego se rellenó solo desde el enlace
    plannedTitleAuto: true,
    confirmedDuplicateKey: null, // aviso de duplicado ya confirmado (compra)
    confirmedPlannedKey: null, // aviso de duplicado ya confirmado (planeado)
    confirmDeleteId: null // registro con confirmación de borrado abierta
  };

  // Atajo para obtener elementos por id.
  const $ = (id) => document.getElementById(id);

  // Crea un elemento con atributos e hijos (texto o nodos) sin usar innerHTML.
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false) return;
      if (key === 'className') node.className = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    });
    [].concat(children).forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  // Muestra u oculta un mensaje en un párrafo.
  function setMessage(node, text) {
    node.textContent = text || '';
    node.hidden = !text;
  }

  // Avatar del miembro con iniciales como respaldo si la imagen no existe.
  function avatar(member) {
    const fallback = el('span', { className: 'avatar avatar-fallback', 'aria-hidden': 'true' }, initials(member.name));
    if (!member.avatar) return fallback;
    const img = el('img', { className: 'avatar', src: member.avatar, alt: '' });
    img.addEventListener('error', () => img.replaceWith(fallback));
    return img;
  }

  // Portada del juego con un recuadro de texto si no carga.
  function cover(appId, title) {
    const fallback = el('div', { className: 'cover cover-fallback' }, title);
    if (!appId) return fallback;
    const img = el('img', { className: 'cover', src: FS.steam.coverUrl(appId), alt: `Portada de ${title}`, loading: 'lazy' });
    img.addEventListener('error', () => img.replaceWith(fallback));
    return img;
  }

  // Llena un <select> con los miembros (opcionalmente con "Todos").
  function fillMemberSelect(select, includeAll) {
    select.replaceChildren();
    if (includeAll) select.append(el('option', { value: 'all' }, 'Todos'));
    else select.append(el('option', { value: '' }, 'Elige un miembro'));
    FS.config.members.forEach((m) => select.append(el('option', { value: m.id }, m.name)));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  function render() {
    renderYearSelect();
    renderSummary();
    renderPlanned();
    renderPurchases();
    renderHistory();
  }

  function renderYearSelect() {
    const select = $('year-select');
    const years = FS.stats.availableYears(data.purchases, currentYear);
    if (!years.includes(ui.year)) ui.year = currentYear;
    select.replaceChildren(...years.map((y) => el('option', { value: y, selected: y === ui.year }, y)));
  }

  function renderSummary() {
    $('summary-year').textContent = ui.year;
    $('min-quota').textContent = formatMoney(FS.config.minYearlyQuota);

    const totals = FS.stats.familyTotals(data.purchases, ui.year);
    $('family-totals').replaceChildren(
      el('div', { className: 'stat' }, [el('span', { className: 'stat-label' }, 'Invertido por la familia'), el('strong', {}, formatMoney(totals.total))]),
      el('div', { className: 'stat' }, [el('span', { className: 'stat-label' }, 'Juegos comprados'), el('strong', {}, totals.games)])
    );

    const summaries = FS.stats.memberSummaries(data.purchases, ui.year, currentYear);
    $('member-cards').replaceChildren(...summaries.map(memberCard));
  }

  // Tarjeta de un miembro con su progreso hacia la cuota.
  function memberCard(s) {
    const statusText = {
      met: s.surplus > 0 ? `Cumplió · Excedente ${formatMoney(s.surplus)}` : 'Cumplió la cuota',
      pending: `Le faltan ${formatMoney(s.missing)}`,
      missed: `No cumplió · Faltaron ${formatMoney(s.missing)}`
    }[s.status];

    return el('article', { className: `member-card status-${s.status}` }, [
      el('div', { className: 'member-head' }, [
        avatar(s.member),
        el('div', {}, [
          el('h3', {}, s.member.name),
          el('span', { className: 'muted' }, `${s.games} ${s.games === 1 ? 'juego' : 'juegos'}`)
        ])
      ]),
      el('p', { className: 'member-total' }, formatMoney(s.total)),
      el('div', {
        className: 'progress',
        role: 'progressbar',
        'aria-valuemin': 0,
        'aria-valuemax': FS.config.minYearlyQuota,
        'aria-valuenow': s.total,
        'aria-label': `Progreso de ${s.member.name} hacia la cuota`
      }, el('span', { style: `width: ${Math.round(s.progress * 100)}%` })),
      el('p', { className: 'status-text' }, statusText)
    ]);
  }

  function renderPlanned() {
    const list = $('planned-list');
    if (data.planned.length === 0) {
      list.replaceChildren(el('li', { className: 'empty' }, 'No hay juegos planeados. Agrega uno con su enlace de Steam.'));
      return;
    }
    const items = [...data.planned].sort((a, b) => a.title.localeCompare(b.title));
    list.replaceChildren(...items.map(plannedItem));
  }

  function plannedItem(item) {
    const member = getMember(item.memberId);
    const confirming = ui.confirmDeleteId === item.id;
    const actions = confirming
      ? [
          el('span', { className: 'muted' }, '¿Quitar?'),
          el('button', { type: 'button', className: 'danger small', onclick: () => removePlanned(item.id) }, 'Sí, quitar'),
          el('button', { type: 'button', className: 'secondary small', onclick: () => setConfirmDelete(null) }, 'No')
        ]
      : [
          el('button', { type: 'button', className: 'small', onclick: () => startPurchaseFromPlanned(item) }, 'Registrar compra'),
          el('button', { type: 'button', className: 'secondary small', onclick: () => setConfirmDelete(item.id) }, 'Quitar')
        ];

    return el('li', { className: 'planned-item' }, [
      cover(item.appId, item.title),
      el('div', { className: 'planned-info' }, [
        el('a', { href: FS.steam.storeUrl(item.appId), target: '_blank', rel: 'noopener' }, item.title),
        el('span', { className: 'muted' }, `Lo comprará ${member.name}`)
      ]),
      el('div', { className: 'row-actions' }, actions)
    ]);
  }

  function renderPurchases() {
    $('purchases-year').textContent = ui.year;
    const query = normalize(ui.search);
    const items = FS.stats.purchasesOfYear(data.purchases, ui.year)
      .filter((p) => ui.filterMember === 'all' || p.memberId === ui.filterMember)
      .filter((p) => !query || normalize(p.title).includes(query))
      .sort((a, b) => b.date.localeCompare(a.date));

    const container = $('purchase-list');
    if (items.length === 0) {
      const filtered = ui.filterMember !== 'all' || query;
      container.replaceChildren(el('p', { className: 'empty' }, filtered
        ? 'Ninguna compra coincide con los filtros.'
        : `Todavía no hay compras en ${ui.year}. Registra la primera con el formulario de arriba.`));
      return;
    }
    container.replaceChildren(...items.map(purchaseCard));
  }

  function purchaseCard(p) {
    const member = getMember(p.memberId);
    const confirming = ui.confirmDeleteId === p.id;
    const actions = confirming
      ? [
          el('span', { className: 'muted' }, '¿Eliminar?'),
          el('button', { type: 'button', className: 'danger small', onclick: () => removePurchase(p.id) }, 'Sí, eliminar'),
          el('button', { type: 'button', className: 'secondary small', onclick: () => setConfirmDelete(null) }, 'No')
        ]
      : [
          el('button', { type: 'button', className: 'secondary small', onclick: () => startEdit(p) }, 'Editar'),
          el('button', { type: 'button', className: 'secondary small', onclick: () => setConfirmDelete(p.id) }, 'Eliminar')
        ];

    return el('article', { className: 'game-card' }, [
      cover(p.appId, p.title),
      el('div', { className: 'game-body' }, [
        el('a', { className: 'game-title', href: FS.steam.storeUrl(p.appId), target: '_blank', rel: 'noopener' }, p.title),
        el('div', { className: 'game-meta' }, [
          el('span', {}, member.name),
          el('strong', {}, formatMoney(p.amount))
        ]),
        el('span', { className: 'muted' }, formatDate(p.date)),
        el('div', { className: 'row-actions' }, actions)
      ])
    ]);
  }

  // Tabla de historial: una fila por año, una columna por miembro.
  function renderHistory() {
    const years = FS.stats.availableYears(data.purchases, currentYear);
    const head = el('thead', {}, el('tr', {}, [
      el('th', { scope: 'col' }, 'Año'),
      ...FS.config.members.map((m) => el('th', { scope: 'col' }, m.name)),
      el('th', { scope: 'col' }, 'Familia')
    ]));

    const rows = years.map((year) => {
      const summaries = FS.stats.memberSummaries(data.purchases, year, currentYear);
      const totals = FS.stats.familyTotals(data.purchases, year);
      const label = { met: 'Cumplió', pending: 'En curso', missed: 'No cumplió' };
      return el('tr', {}, [
        el('th', { scope: 'row' }, year),
        ...summaries.map((s) => el('td', { className: `status-${s.status}` }, [
          el('span', { className: 'cell-amount' }, formatMoney(s.total)),
          el('span', { className: 'cell-status' }, label[s.status])
        ])),
        el('td', {}, el('span', { className: 'cell-amount' }, formatMoney(totals.total)))
      ]);
    });

    $('history-table').replaceChildren(head, el('tbody', {}, rows));
  }

  // ---------------------------------------------------------------------------
  // Formulario de compra
  // ---------------------------------------------------------------------------

  // Al pegar el enlace: rellena el nombre y muestra la portada.
  function onPurchaseUrlInput() {
    const parsed = FS.steam.parseStoreUrl($('purchase-url').value);
    const preview = $('purchase-preview');
    ui.confirmedDuplicateKey = null;
    $('purchase-submit').textContent = ui.editingId ? 'Guardar cambios' : 'Guardar compra';
    setMessage($('purchase-warning'), '');

    if (!parsed) {
      preview.hidden = true;
      return;
    }
    if (ui.titleAuto && parsed.titleGuess) $('purchase-title').value = parsed.titleGuess;
    preview.replaceChildren(cover(parsed.appId, $('purchase-title').value || 'Juego'));
    preview.hidden = false;

    // Avisa en cuanto se pega el enlace, sin esperar a guardar.
    const warning = purchaseDuplicateWarning(parsed.appId);
    if (warning) setMessage($('purchase-warning'), warning);
  }

  // Texto de aviso si el juego ya fue comprado o está planeado por otra persona.
  function purchaseDuplicateWarning(appId) {
    const bought = data.purchases.find((p) => p.appId === appId && p.id !== ui.editingId);
    if (bought) {
      return `Este juego ya lo compró ${getMember(bought.memberId).name} el ${formatDate(bought.date)}.`;
    }
    const memberId = $('purchase-member').value;
    const planned = data.planned.find((p) => p.appId === appId && p.memberId !== memberId);
    if (planned) {
      return `${getMember(planned.memberId).name} tiene este juego en sus planeados.`;
    }
    return '';
  }

  async function onPurchaseSubmit(event) {
    event.preventDefault();
    const errorNode = $('purchase-error');
    const warningNode = $('purchase-warning');
    setMessage(errorNode, '');

    const parsed = FS.steam.parseStoreUrl($('purchase-url').value);
    const title = $('purchase-title').value.trim();
    const memberId = $('purchase-member').value;
    const amount = round2($('purchase-amount').value);
    const date = $('purchase-date').value;

    // Validaciones básicas con mensajes que indican cómo corregir.
    if (!parsed) return setMessage(errorNode, 'Pega el enlace de la tienda de Steam del juego (store.steampowered.com/app/...).');
    if (!title) return setMessage(errorNode, 'Escribe el nombre del juego.');
    if (!memberId) return setMessage(errorNode, 'Elige quién compró el juego.');
    if (!(amount > 0)) return setMessage(errorNode, 'Ingresa un monto mayor a 0.');
    if (!date) return setMessage(errorNode, 'Elige la fecha de compra.');

    // Duplicado: el primer envío avisa; el segundo (mismo juego) confirma.
    const warning = purchaseDuplicateWarning(parsed.appId);
    const duplicateKey = `${parsed.appId}:${memberId}`;
    if (warning && ui.confirmedDuplicateKey !== duplicateKey) {
      ui.confirmedDuplicateKey = duplicateKey;
      setMessage(warningNode, `${warning} Pulsa "Guardar de todas formas" si quieres registrarlo igual.`);
      $('purchase-submit').textContent = 'Guardar de todas formas';
      return;
    }

    const record = { id: ui.editingId || newId(), appId: parsed.appId, title, memberId, amount, date };

    try {
      if (ui.editingId) {
        await FS.storage.updatePurchase(record);
      } else {
        // Si el juego estaba en planeados, ya no hace falta mantenerlo ahí.
        const plannedMatches = data.planned.filter((p) => p.appId === record.appId);
        await FS.storage.addPurchase(record);
        for (const item of plannedMatches) await FS.storage.deletePlanned(item.id);
      }
    } catch (e) {
      return setMessage(errorNode, errorText(e));
    }

    ui.year = yearOf(record.date);
    resetPurchaseForm();
    render();
  }

  function resetPurchaseForm() {
    $('purchase-form').reset();
    $('purchase-id').value = '';
    $('purchase-date').value = todayIso();
    $('purchase-preview').hidden = true;
    $('purchase-form-title').textContent = 'Registrar compra';
    $('purchase-submit').textContent = 'Guardar compra';
    $('purchase-cancel').hidden = true;
    setMessage($('purchase-warning'), '');
    setMessage($('purchase-error'), '');
    ui.editingId = null;
    ui.titleAuto = true;
    ui.confirmedDuplicateKey = null;
  }

  // Carga una compra existente en el formulario para editarla.
  function startEdit(p) {
    resetPurchaseForm();
    ui.editingId = p.id;
    ui.titleAuto = false;
    $('purchase-id').value = p.id;
    $('purchase-url').value = FS.steam.storeUrl(p.appId);
    $('purchase-title').value = p.title;
    $('purchase-member').value = p.memberId;
    $('purchase-amount').value = p.amount;
    $('purchase-date').value = p.date;
    $('purchase-form-title').textContent = `Editar compra: ${p.title}`;
    $('purchase-submit').textContent = 'Guardar cambios';
    $('purchase-cancel').hidden = false;
    onPurchaseUrlInput();
    focusPurchaseForm();
  }

  // Pasa un juego planeado al formulario de compra.
  function startPurchaseFromPlanned(item) {
    resetPurchaseForm();
    ui.titleAuto = false;
    $('purchase-url').value = FS.steam.storeUrl(item.appId);
    $('purchase-title').value = item.title;
    $('purchase-member').value = item.memberId;
    onPurchaseUrlInput();
    focusPurchaseForm();
    $('purchase-amount').focus();
  }

  function focusPurchaseForm() {
    $('purchase-form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function removePurchase(id) {
    try {
      await FS.storage.deletePurchase(id);
    } catch (e) {
      return showStatus(errorText(e), 'error');
    }
    ui.confirmDeleteId = null;
    if (ui.editingId === id) resetPurchaseForm();
    render();
  }

  function setConfirmDelete(id) {
    ui.confirmDeleteId = id;
    renderPlanned();
    renderPurchases();
  }

  // ---------------------------------------------------------------------------
  // Juegos planeados
  // ---------------------------------------------------------------------------

  function onPlannedUrlInput() {
    const parsed = FS.steam.parseStoreUrl($('planned-url').value);
    ui.confirmedPlannedKey = null;
    setMessage($('planned-warning'), '');
    if (parsed && ui.plannedTitleAuto && parsed.titleGuess) $('planned-title').value = parsed.titleGuess;
  }

  async function onPlannedSubmit(event) {
    event.preventDefault();
    const errorNode = $('planned-error');
    setMessage(errorNode, '');

    const parsed = FS.steam.parseStoreUrl($('planned-url').value);
    const title = $('planned-title').value.trim();
    const memberId = $('planned-member').value;

    if (!parsed) return setMessage(errorNode, 'Pega el enlace de la tienda de Steam del juego.');
    if (!title) return setMessage(errorNode, 'Escribe el nombre del juego.');
    if (!memberId) return setMessage(errorNode, 'Elige quién lo va a comprar.');

    // Aviso si ya se compró o alguien más ya lo tiene planeado.
    const bought = data.purchases.find((p) => p.appId === parsed.appId);
    const planned = data.planned.find((p) => p.appId === parsed.appId);
    let warning = '';
    if (bought) warning = `Este juego ya lo compró ${getMember(bought.memberId).name} el ${formatDate(bought.date)}.`;
    else if (planned) warning = `${getMember(planned.memberId).name} ya lo tiene en sus planeados.`;

    const key = `${parsed.appId}:${memberId}`;
    if (warning && ui.confirmedPlannedKey !== key) {
      ui.confirmedPlannedKey = key;
      return setMessage($('planned-warning'), `${warning} Pulsa "Agregar" otra vez si quieres anotarlo igual.`);
    }

    try {
      await FS.storage.addPlanned({ id: newId(), appId: parsed.appId, title, memberId, createdAt: todayIso() });
    } catch (e) {
      return setMessage(errorNode, errorText(e));
    }

    $('planned-form').reset();
    setMessage($('planned-warning'), '');
    ui.plannedTitleAuto = true;
    ui.confirmedPlannedKey = null;
    renderPlanned();
  }

  async function removePlanned(id) {
    try {
      await FS.storage.deletePlanned(id);
    } catch (e) {
      return showStatus(errorText(e), 'error');
    }
    ui.confirmDeleteId = null;
    renderPlanned();
  }

  // ---------------------------------------------------------------------------
  // Exportar / importar
  // ---------------------------------------------------------------------------

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = el('a', { href: URL.createObjectURL(blob), download: `family-steam-${todayIso()}.json` });
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const message = $('backup-message');
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.purchases)) throw new Error('formato');
      } catch (e) {
        setMessage(message, 'El archivo no es un respaldo válido de Family Steam.');
        event.target.value = '';
        return;
      }

      // Los registros sin id (por ejemplo, una lista armada a mano) reciben uno nuevo.
      const withIds = (list) => (Array.isArray(list) ? list : []).map((r) => ({ ...r, id: r.id || newId() }));
      try {
        const count = await FS.storage.importData({ purchases: withIds(parsed.purchases), planned: withIds(parsed.planned) });
        setMessage(message, `Datos importados: ${count.purchases} compras y ${count.planned} planeados.`);
      } catch (e) {
        setMessage(message, `No se pudo importar: ${errorText(e)} Revisa que cada compra tenga enlace, miembro, monto y fecha válidos.`);
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------------
  // Inicio
  // ---------------------------------------------------------------------------

  function bindEvents() {
    $('year-select').addEventListener('change', (e) => {
      ui.year = Number(e.target.value);
      ui.confirmDeleteId = null;
      render();
    });

    $('purchase-form').addEventListener('submit', onPurchaseSubmit);
    $('purchase-url').addEventListener('input', onPurchaseUrlInput);
    $('purchase-title').addEventListener('input', () => { ui.titleAuto = false; });
    $('purchase-member').addEventListener('change', () => {
      // El aviso de "planeado por otra persona" depende de quién compra.
      ui.confirmedDuplicateKey = null;
      $('purchase-submit').textContent = ui.editingId ? 'Guardar cambios' : 'Guardar compra';
      const parsed = FS.steam.parseStoreUrl($('purchase-url').value);
      setMessage($('purchase-warning'), parsed ? purchaseDuplicateWarning(parsed.appId) : '');
    });
    $('purchase-cancel').addEventListener('click', resetPurchaseForm);

    $('planned-form').addEventListener('submit', onPlannedSubmit);
    $('planned-url').addEventListener('input', onPlannedUrlInput);
    $('planned-title').addEventListener('input', () => { ui.plannedTitleAuto = false; });
    $('planned-member').addEventListener('change', () => { ui.confirmedPlannedKey = null; });

    $('filter-member').addEventListener('change', (e) => { ui.filterMember = e.target.value; renderPurchases(); });
    $('filter-search').addEventListener('input', (e) => { ui.search = e.target.value; renderPurchases(); });

    $('export-btn').addEventListener('click', exportJson);
    $('import-input').addEventListener('change', importJson);
  }

  // Mensaje de estado general (conexión, errores al borrar).
  function showStatus(text, kind) {
    const node = $('status');
    node.className = `status ${kind || ''}`;
    setMessage(node, text);
  }

  // Traduce los errores de Firebase a mensajes comprensibles.
  function errorText(e) {
    const code = e && e.code ? String(e.code) : '';
    if (code.includes('permission-denied')) return 'Firebase rechazó la operación: revisa que los datos sean válidos y que las reglas de Firestore estén publicadas.';
    if (code.includes('unavailable') || code.includes('network')) return 'No hay conexión con la base de datos. Revisa tu internet e inténtalo de nuevo.';
    if (code.includes('admin-restricted-operation') || code.includes('operation-not-allowed') || code.includes('configuration-not-found')) return 'El inicio de sesión anónimo no está activado en Firebase (Authentication → Método de acceso → Anónimo).';
    return (e && e.message) || 'Ocurrió un error inesperado.';
  }

  function init() {
    fillMemberSelect($('purchase-member'), false);
    fillMemberSelect($('planned-member'), false);
    fillMemberSelect($('filter-member'), true);
    resetPurchaseForm();
    bindEvents();
    render();

    // Si en 10 s no llegan datos, se avisa (sin recargar ni volver a suscribirse).
    showStatus('Conectando con la base de datos…');
    const slowTimer = setTimeout(() => showStatus('La conexión está tardando más de lo normal. Revisa tu internet.', 'error'), 10000);

    FS.storage.subscribe(
      (newData) => {
        clearTimeout(slowTimer);
        showStatus('');
        data = newData;
        render();
      },
      (error) => {
        clearTimeout(slowTimer);
        showStatus(`No se pudieron cargar los datos. ${errorText(error)}`, 'error');
      }
    );
  }

  init();
})();
