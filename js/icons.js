// Íconos pixel dibujados a mano: cada "#" es un pixel encendido.
// Se convierten a SVG nítido (shape-rendering="crispEdges") y toman el color del texto.
window.FS = window.FS || {};

FS.icons = (function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const MAPS = {
    controller: [
      '..##########..',
      '.############.',
      '###.######.###',
      '##...####.#.##',
      '###.######.###',
      '##############',
      '####......####',
      '.###......###.'
    ],
    trophy: [
      '########',
      '#.####.#',
      '#.####.#',
      '.######.',
      '..####..',
      '...##...',
      '..####..',
      '.######.'
    ],
    hourglass: [
      '########',
      '.#....#.',
      '..#..#..',
      '...##...',
      '...##...',
      '..#..#..',
      '.#.##.#.',
      '########'
    ],
    warning: [
      '....#....',
      '...###...',
      '...#.#...',
      '..##.##..',
      '..##.##..',
      '.#######.',
      '.###.###.',
      '#########'
    ]
  };

  // Crea el SVG de un ícono. scale = tamaño en px de cada pixel del ícono.
  function create(name, scale = 2) {
    const rows = MAPS[name];
    const width = rows[0].length;
    const height = rows.length;

    // Un rectángulo por cada tramo seguido de pixeles de una fila.
    let d = '';
    rows.forEach((row, y) => {
      for (const match of row.matchAll(/#+/g)) {
        d += `M${match.index} ${y}h${match[0].length}v1h-${match[0].length}z`;
      }
    });

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width * scale);
    svg.setAttribute('height', height * scale);
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
    return svg;
  }

  // Reemplaza los <span data-icon="nombre" data-scale="n"> del HTML por su ícono.
  function fillSlots(root = document) {
    root.querySelectorAll('[data-icon]').forEach((slot) => {
      slot.replaceWith(create(slot.dataset.icon, Number(slot.dataset.scale) || 2));
    });
  }

  return { create, fillSlots };
})();
