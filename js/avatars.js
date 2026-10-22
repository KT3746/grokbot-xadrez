/* Avatares originais (SVG) dos adversarios do computador e dos jogadores */
(function () {
  function face(skin) { return '<circle cx="32" cy="36" r="15" fill="' + skin + '"/><circle cx="26.5" cy="36" r="1.9" fill="#1b1410"/><circle cx="37.5" cy="36" r="1.9" fill="#1b1410"/><circle cx="23" cy="41" r="2.6" fill="#ff8f8f" opacity=".35"/><circle cx="41" cy="41" r="2.6" fill="#ff8f8f" opacity=".35"/>'; }
  var smile = '<path d="M27 42q5 4 10 0" stroke="#1b1410" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  var A = {
    iniciante: { name: 'Iniciante Ivo', bg: ['#7be08f', '#2f9e55'], body: '#3b7dd8',
      art: function () { return face('#f6c9a0') + smile + '<path d="M17 31c1-9 8-14 15-14s14 5 15 13H17z" fill="#e8483a"/><path d="M40 29h14c0 3-3 4-6 4h-8z" fill="#c23426"/><circle cx="32" cy="18" r="2" fill="#fff"/>'; } },
    facil: { name: 'Fácil Flora', bg: ['#7fe7e0', '#1f9c9a'], body: '#e86aa6',
      art: function () { return '<path d="M14 40c-1-15 7-24 18-24s19 9 18 24c-2 6-3 10-3 12H17c0-2-1-6-3-12z" fill="#8a4a24"/>' + face('#f1c19b') + smile + '<path d="M18 33c3-9 9-13 14-13s12 4 14 13c-6-2-10-6-12-9-3 4-9 8-16 9z" fill="#8a4a24"/><g transform="translate(44 22)"><circle r="3" fill="#ffd34d"/><circle cx="0" cy="-5" r="3" fill="#ff7eb3"/><circle cx="5" cy="0" r="3" fill="#ff7eb3"/><circle cx="0" cy="5" r="3" fill="#ff7eb3"/><circle cx="-5" cy="0" r="3" fill="#ff7eb3"/><circle r="2.4" fill="#ffd34d"/></g>'; } },
    medio: { name: 'Médio Mário', bg: ['#86b6ff', '#2f5fc4'], body: '#2c3e66',
      art: function () { return face('#e9b48a') + '<path d="M18 31c0-9 6-14 14-14s14 5 14 14c-3-4-8-6-14-6s-11 2-14 6z" fill="#2b1d16"/><path d="M24 43c3-2 5-2 8-1 3-1 5-1 8 1-2 2-5 2-8 1-3 1-6 1-8-1z" fill="#2b1d16"/><path d="M28 47q4 2 8 0" stroke="#1b1410" stroke-width="1.6" fill="none" stroke-linecap="round"/>'; } },
    dificil: { name: 'Difícil Diana', bg: ['#c59bff', '#6a33c9'], body: '#1f2a44',
      art: function () { return '<circle cx="32" cy="15" r="7" fill="#1d1414"/>' + face('#c98e66') + smile + '<path d="M17 34c0-10 7-15 15-15s15 5 15 15c-4-5-9-7-15-7s-11 2-15 7z" fill="#1d1414"/><g fill="none" stroke="#f2f2f2" stroke-width="1.8"><circle cx="26.5" cy="36" r="4.4"/><circle cx="37.5" cy="36" r="4.4"/><path d="M31 36h2"/></g>'; } },
    mestre: { name: 'Mestre Magno', bg: ['#ffd56b', '#c47a12'], body: '#5b1f2a',
      art: function () { return face('#efc7a4') + '<path d="M17 38c0 11 7 19 15 19s15-8 15-19c-3 4-7 6-15 6s-12-2-15-6z" fill="#f1f1f1"/><path d="M26 44q6-3 12 0" stroke="#d9d9d9" stroke-width="2" fill="none"/><path d="M18 31c1-8 7-12 14-12s13 4 14 12c-3-3-8-4-14-4s-11 1-14 4z" fill="#e9e9e9"/><path d="M21 22l4-9 4 6 3-8 3 8 4-6 4 9z" fill="#ffd34d" stroke="#a86a12" stroke-width="1"/><path d="M24 33h6M34 33h6" stroke="#bdbdbd" stroke-width="2" stroke-linecap="round"/>'; } },
  };
  function pawn(fill, stroke) { return '<g transform="translate(14 12) scale(.36)" fill="' + fill + '" stroke="' + stroke + '" stroke-width="4"><circle cx="50" cy="29" r="12.5"/><path d="M38 44h24l-3 6H41z"/><path d="M42 50h16c1 11 6 21 14 29H28c8-8 13-18 14-29z"/><path d="M22 79h56a5 5 0 0 1 5 5v5H17v-5a5 5 0 0 1 5-5z"/></g>'; }
  var uid = 0;
  function wrap(bg, inner, body) {
    var id = 'av' + (++uid);
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="' + id + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + bg[0] + '"/><stop offset="1" stop-color="' + bg[1] + '"/></radialGradient><clipPath id="c' + id + '"><circle cx="32" cy="32" r="30"/></clipPath></defs>' +
      '<circle cx="32" cy="32" r="30" fill="url(#' + id + ')"/><g clip-path="url(#c' + id + ')">' + (body ? '<path d="M10 66c2-12 11-17 22-17s20 5 22 17z" fill="' + body + '"/>' : '') + inner + '</g></svg>';
  }
  function svg(key) {
    if (A[key]) return wrap(A[key].bg, A[key].art(), A[key].body);
    if (key === 'w') return wrap(['#fff6e0', '#c9b48e'], pawn('#fbf5e8', '#2a1d14'));
    if (key === 'b') return wrap(['#6a5a52', '#1d1614'], pawn('#2c2320', '#d8c4a8'));
    if (key === 'puzzle') return wrap(['#9fdcff', '#2f6fb0'], '<path d="M20 20h10a4 4 0 1 1 8 0h6v10a4 4 0 1 0 0 8v8H20z" fill="#fff" opacity=".92"/>');
    return wrap(['#ffe08a', '#d9962a'], pawn('#fffaf0', '#3a2716'));
  }
  window.XAvatars = { svg: svg, name: function (k) { return A[k] ? A[k].name : ''; }, list: A };
})();
