/* Pecas 2D desenhadas para o XADREZAO (desenho original em SVG) */
(function () {
  var base = '<path d="M22 79h56a5 5 0 0 1 5 5v5H17v-5a5 5 0 0 1 5-5z"/>';
  var shapes = {
    1: '<circle cx="50" cy="29" r="12.5"/><path d="M38 44h24l-3 6H41z"/><path d="M42 50h16c1 11 6 21 14 29H28c8-8 13-18 14-29z"/>',
    4: '<path d="M27 17h10v8h7.5v-8h11v8H63v-8h10v19a4 4 0 0 1-4 4H31a4 4 0 0 1-4-4z"/><path d="M34 40h32l-2 31 8 8H28l8-8z"/><path class="ln" d="M36 52h28M35 64h30" fill="none"/>',
    2: '<path d="M31 79c0-13 6-21 16-27-6 1-12 4-18 7-6 1-11-3-10-9 1-5 5-8 9-12 6-9 12-16 20-21l2-9 7 7c15 3 24 18 24 36 0 11-2 20-4 28z"/><circle class="eye" cx="44" cy="31" r="3.2"/><path class="ln" d="M57 22c8 6 12 18 11 32" fill="none"/>',
    3: '<circle cx="50" cy="11" r="5.5"/><path d="M50 17c-11 8-18 19-18 29 0 8 7 12 18 12s18-4 18-12c0-10-7-21-18-29z"/><path class="ln" d="M55 28L46 42" fill="none"/><path d="M36 58h28l-2 7H38z"/><path d="M40 65h20c2 6 6 11 12 14H28c6-3 10-8 12-14z"/>',
    5: '<path d="M21 30l12 31h34l12-31-14 15-4-22-8 19-3-25-3 25-8-19-4 22z"/><circle cx="21" cy="29" r="4.5"/><circle cx="37" cy="22" r="4.5"/><circle cx="50" cy="14" r="5"/><circle cx="63" cy="22" r="4.5"/><circle cx="79" cy="29" r="4.5"/><path d="M33 61h34l-2 8H35z"/><path d="M36 69h28c2 4 6 8 11 10H25c5-2 9-6 11-10z"/>',
    6: '<path d="M46.5 5h7v6h6v7h-6v8h-7v-8h-6v-7h6z"/><path d="M26 41c0-9 10-12 19-8l5 4 5-4c9-4 19-1 19 8 0 10-8 18-10 24H36c-2-6-10-14-10-24z"/><path d="M42 33c0-6 3-8 8-8s8 2 8 8"/><path d="M35 65h30l-2 7H37z"/><path d="M38 72h24c2 3 6 6 11 7H27c5-1 9-4 11-7z"/>'
  };
  function svg(piece) {
    var t = piece & 7, black = piece & 8;
    var cls = black ? 'pc-b' : 'pc-w';
    return '<svg viewBox="0 0 100 100" class="pcs ' + cls + '" aria-hidden="true"><g>' + shapes[t] + base + '</g></svg>';
  }
  var NAMES = { 1: 'Peão', 2: 'Cavalo', 3: 'Bispo', 4: 'Torre', 5: 'Dama', 6: 'Rei' };
  // SVG solto (cores embutidas), para virar textura no 3D
  function image(piece, fill, stroke, line, sw) {
    var t = piece & 7;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112" width="256" height="256"><style>g{fill:' + fill + ';stroke:' + stroke + ';stroke-width:' + (sw || 4) + ';stroke-linejoin:round}.ln{stroke:' + line + ';fill:none;stroke-width:3}.eye{fill:' + stroke + ';stroke:none}</style><g>' + shapes[t] + base + '</g></svg>';
  }
  window.XPieces = { svg: svg, names: NAMES, image: image };
})();
