// Funciones auxiliares sin dependencias del DOM de la app.
window.FS = window.FS || {};

FS.utils = (function () {
  const moneyFormatter = new Intl.NumberFormat(FS.config.locale, {
    style: 'currency',
    currency: FS.config.currency,
    minimumFractionDigits: 2
  });

  // Formatea un número como monto en soles (ej. "S/ 400.00").
  function formatMoney(value) {
    return moneyFormatter.format(Number(value) || 0);
  }

  // Redondea a 2 decimales para evitar errores de coma flotante en sumas.
  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  // Fecha de hoy en formato YYYY-MM-DD según la hora local.
  function todayIso() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  // Extrae el año de una fecha YYYY-MM-DD.
  function yearOf(isoDate) {
    return Number(String(isoDate).slice(0, 4));
  }

  // Muestra una fecha YYYY-MM-DD como DD/MM/YYYY.
  function formatDate(isoDate) {
    const [year, month, day] = String(isoDate).split('-');
    return `${day}/${month}/${year}`;
  }

  // Genera un id único simple para registros nuevos.
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // Normaliza texto para búsquedas (minúsculas y sin tildes).
  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  // Busca un miembro por id; devuelve un objeto genérico si no existe.
  function getMember(memberId) {
    return FS.config.members.find((m) => m.id === memberId) || { id: memberId, name: 'Desconocido', avatar: '' };
  }

  // Iniciales para el avatar de respaldo.
  function initials(name) {
    return String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('');
  }

  return { formatMoney, round2, todayIso, yearOf, formatDate, newId, normalize, getMember, initials };
})();
