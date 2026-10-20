/* XADREZAO - estatisticas e conquistas (salvas no aparelho) */
(function () {
  'use strict';
  var KEY = 'xadrezao.stats.v1';
  var LEVELS = [['iniciante', 'Iniciante'], ['facil', 'Fácil'], ['medio', 'Médio'], ['dificil', 'Difícil'], ['mestre', 'Mestre']];
  var ACH = [
    ['primeira', 'Primeira vitória', 'Vença o computador pela primeira vez.', 'trophy'],
    ['v_iniciante', 'Primeiros passos', 'Vença o computador no nível Iniciante.', 'medal'],
    ['v_facil', 'Pegando o jeito', 'Vença o computador no nível Fácil.', 'medal'],
    ['v_medio', 'Jogador de verdade', 'Vença o computador no nível Médio.', 'medal'],
    ['v_dificil', 'Estrategista', 'Vença o computador no nível Difícil.', 'medal'],
    ['v_mestre', 'Vencer o Mestre', 'Vença o computador no nível Mestre.', 'crown'],
    ['seq3', 'Embalado', 'Vença 3 partidas seguidas contra o computador.', 'fire'],
    ['rapido', 'Relâmpago', 'Vença o computador em até 25 lances.', 'bolt'],
    ['mate_cavalo', 'Mate com cavalo', 'Dê xeque-mate com um cavalo.', 'knight'],
    ['mate_peao', 'Mate de peão', 'Dê xeque-mate com um peão.', 'pawn'],
    ['segurou', 'Muralha', 'Empate contra o nível Difícil ou Mestre.', 'shield'],
    ['roque', 'Rei protegido', 'Faça um roque numa partida.', 'castle'],
    ['promo', 'Nova dama', 'Promova um peão até o fim do tabuleiro.', 'crown'],
    ['passagem', 'Captura de passagem', 'Capture um peão "en passant".', 'pawn'],
    ['aluno', 'Bom aluno', 'Termine uma partida no Modo Aprender.', 'cap'],
    ['amigos', 'Entre amigos', 'Termine uma partida de 2 jogadores.', 'people'],
    ['d1', 'Primeiro desafio', 'Resolva um desafio.', 'star'],
    ['d10', '10 desafios', 'Resolva 10 desafios.', 'star'],
    ['dperfeito', 'Perfeccionista', 'Ganhe 3 estrelas em 10 desafios.', 'star'],
    ['dtodos', 'Mestre dos desafios', 'Resolva todos os desafios.', 'crown'],
    ['p10', 'Dedicado', 'Jogue 10 partidas até o fim.', 'clock']
  ];
  var ICON = {
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6"/>',
    medal: '<circle cx="12" cy="14" r="6"/><path d="M8 3l4 5 4-5M12 11v6M10 13l2-2"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    fire: '<path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 1-8z"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    knight: '<path d="M8 21h10c0-5-1-9-3-12l1-4-3 2C9 7 6 10 5 13l2 1 3-2c-1 3-2 6-2 9z"/>',
    pawn: '<circle cx="12" cy="6" r="3"/><path d="M9 10h6l-1 3 2 6H8l2-6z"/><path d="M6 21h12"/>',
    shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
    castle: '<path d="M5 21V8h3v2h2V8h4v2h2V8h3v13zM10 21v-4a2 2 0 0 1 4 0v4"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>',
    people: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-4 3-6 6-6s6 2 6 6M12 20c0-4 2-6 4-6s6 2 6 6"/>',
    star: '<path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  function fresh() { var lv = {}; LEVELS.forEach(function (l) { lv[l[0]] = { w: 0, l: 0, d: 0 }; }); return { levels: lv, streak: 0, best: 0, games: 0, twoP: 0, ach: {} }; }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
  var f = fresh(); for (var k in f) if (!(k in S)) S[k] = f[k];
  LEVELS.forEach(function (l) { if (!S.levels[l[0]]) S.levels[l[0]] = { w: 0, l: 0, d: 0 }; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

  var queue = [], showing = false;
  function unlock(id) {
    if (S.ach[id]) return;
    S.ach[id] = Date.now(); save();
    var a = ACH.filter(function (x) { return x[0] === id; })[0]; if (!a) return;
    queue.push(a); if (!showing) next();
    if (api.onUnlock) api.onUnlock(a);
  }
  function next() {
    var a = queue.shift(), el = document.getElementById('achPop');
    if (!a || !el) { showing = false; return; }
    showing = true;
    el.querySelector('.ai').innerHTML = svg(a[3]);
    el.querySelector('b').textContent = a[1];
    el.querySelector('small').textContent = a[2];
    el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    setTimeout(function () { el.hidden = true; next(); }, 3400);
  }
  function svg(n) { return '<svg viewBox="0 0 24 24">' + (ICON[n] || ICON.star) + '</svg>'; }

  // info: { mode, level, result: 'win'|'loss'|'draw', mateType, plies, learn }
  function onGameEnd(info) {
    S.games++;
    if (info.mode === '2p') { S.twoP++; unlock('amigos'); }
    else if (info.mode === 'ai') {
      var L = S.levels[info.level] || (S.levels[info.level] = { w: 0, l: 0, d: 0 });
      if (info.result === 'win') {
        L.w++; S.streak++; if (S.streak > S.best) S.best = S.streak;
        unlock('primeira'); unlock('v_' + info.level);
        if (S.streak >= 3) unlock('seq3');
        if (info.plies <= 50) unlock('rapido');
        if (info.mateType === 2) unlock('mate_cavalo');
        if (info.mateType === 1) unlock('mate_peao');
      } else if (info.result === 'loss') { L.l++; S.streak = 0; }
      else { L.d++; if (info.level === 'dificil' || info.level === 'mestre') unlock('segurou'); }
      if (info.learn) unlock('aluno');
    }
    if (info.mode === '2p' && info.mateType === 2) unlock('mate_cavalo');
    if (S.games >= 10) unlock('p10');
    save();
  }
  // m: lance do jogador (objeto do motor)
  function onMove(m, E) {
    if (m.flags & E.F_CASTLE) unlock('roque');
    if (m.promo) unlock('promo');
    if (m.flags & E.F_EP) unlock('passagem');
  }
  function onPuzzle(p, stars, m, prog, total) {
    var solved = 0, perfect = 0;
    for (var k in prog) { if (prog[k]) solved++; if (prog[k] >= 3) perfect++; }
    if (solved >= 1) unlock('d1');
    if (solved >= 10) unlock('d10');
    if (perfect >= 10) unlock('dperfeito');
    if (total && solved >= total) unlock('dtodos');
    if (m && (m.piece & 7) === 2) unlock('mate_cavalo');
    if (m && (m.piece & 7) === 1) unlock('mate_peao');
  }

  function render(el, prog, total) {
    var html = '<div class="stbox"><h4>Contra o computador</h4><table><tr><th>Nível</th><th>Vitórias</th><th>Derrotas</th><th>Empates</th></tr>';
    var tw = 0, tl = 0, td = 0;
    LEVELS.forEach(function (l) { var x = S.levels[l[0]]; tw += x.w; tl += x.l; td += x.d; html += '<tr><td>' + l[1] + '</td><td>' + x.w + '</td><td>' + x.l + '</td><td>' + x.d + '</td></tr>'; });
    html += '<tr class="tot"><td>Total</td><td>' + tw + '</td><td>' + tl + '</td><td>' + td + '</td></tr></table>';
    var solved = 0, stars = 0; for (var k in prog) { if (prog[k]) solved++; stars += prog[k] || 0; }
    html += '<div class="stnums"><div><b>' + S.streak + '</b><span>vitórias seguidas</span></div><div><b>' + S.best + '</b><span>melhor sequência</span></div><div><b>' + solved + '/' + total + '</b><span>desafios</span></div><div><b>' + stars + '</b><span>estrelas</span></div><div><b>' + S.games + '</b><span>partidas</span></div><div><b>' + S.twoP + '</b><span>com amigos</span></div></div></div>';
    var got = ACH.filter(function (a) { return S.ach[a[0]]; }).length;
    html += '<h4 class="sth">Conquistas <span>' + got + ' de ' + ACH.length + '</span></h4><div class="achgrid">';
    ACH.forEach(function (a) {
      var on = !!S.ach[a[0]];
      html += '<div class="ach' + (on ? ' on' : '') + '"><div class="ai">' + svg(a[3]) + '</div><b>' + a[1] + '</b><small>' + a[2] + '</small></div>';
    });
    el.innerHTML = html + '</div>';
  }
  function count() { return { got: ACH.filter(function (a) { return S.ach[a[0]]; }).length, total: ACH.length }; }
  var api = { onGameEnd: onGameEnd, onMove: onMove, onPuzzle: onPuzzle, render: render, count: count, data: function () { return S; }, ACH: ACH };
  window.XStats = api;
})();
