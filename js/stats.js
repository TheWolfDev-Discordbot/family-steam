// Cálculos de totales y cumplimiento de cuota. Funciones puras (sin DOM).
window.FS = window.FS || {};

FS.stats = (function () {
  const { round2, yearOf } = FS.utils;

  // Compras de un año concreto.
  function purchasesOfYear(purchases, year) {
    return purchases.filter((p) => yearOf(p.date) === year);
  }

  // Años del rango configurado, más el año actual y cualquier año con compras,
  // de más reciente a más antiguo.
  function availableYears(purchases, currentYear) {
    const { from, to } = FS.config.yearRange;
    const years = new Set(purchases.map((p) => yearOf(p.date)));
    for (let year = from; year <= to; year++) years.add(year);
    years.add(currentYear);
    return [...years].sort((a, b) => b - a);
  }

  // Estado de cada miembro en un año:
  //  - total invertido, cantidad de juegos
  //  - excedente (lo que pasa de la cuota) o faltante (lo que le falta)
  //  - status: "met" (cumplió), "pending" (año en curso, aún le falta),
  //    "upcoming" (año futuro, aún le falta), "missed" (año cerrado sin cumplir)
  function memberSummaries(purchases, year, currentYear) {
    const quota = FS.config.minYearlyQuota;
    const yearPurchases = purchasesOfYear(purchases, year);

    return FS.config.members.map((member) => {
      const own = yearPurchases.filter((p) => p.memberId === member.id);
      const total = round2(own.reduce((sum, p) => sum + Number(p.amount), 0));
      const met = total >= quota;
      let status = 'met';
      if (!met) {
        if (year < currentYear) status = 'missed';
        else if (year > currentYear) status = 'upcoming';
        else status = 'pending';
      }

      return {
        member,
        total,
        games: own.length,
        surplus: met ? round2(total - quota) : 0,
        missing: met ? 0 : round2(quota - total),
        status
      };
    });
  }

  // Totales de la familia en un año.
  function familyTotals(purchases, year) {
    const yearPurchases = purchasesOfYear(purchases, year);
    return {
      total: round2(yearPurchases.reduce((sum, p) => sum + Number(p.amount), 0)),
      games: yearPurchases.length
    };
  }

  return { purchasesOfYear, availableYears, memberSummaries, familyTotals };
})();
