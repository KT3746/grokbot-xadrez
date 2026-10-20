const E = require('../js/engine.js');
let fail = 0;
function check(name, got, exp) { const ok = got === exp; if (!ok) fail++; console.log((ok ? 'OK  ' : 'FALHA ') + name + ': ' + got + (ok ? '' : ' (esperado ' + exp + ')')); }
const suites = [
  ['Inicial', E.START, [20, 400, 8902, 197281]],
  ['Kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['Posicao 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['Posicao 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467, 422333]],
  ['Posicao 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];
for (const [name, fen, exp] of suites) {
  const p = new E.Position(fen);
  exp.forEach((n, i) => { const t = Date.now(); check(`perft ${name} d${i + 1}`, p.perft(i + 1), n); });
  check(`fen ida e volta ${name}`, p.fen().split(' ').slice(0, 4).join(' '), fen.split(' ').slice(0, 4).join(' '));
}
// Mate do pastor
let g = new E.Game();
['e2e4','e7e5','f1c4','b8c6','d1h5','g8f6','h5f7'].forEach(m => g.playUci(m));
let s = g.status(); check('mate do pastor', s.reason + '/' + s.winner, 'mate/0');
// Mate do louco
g = new E.Game(); ['f2f3','e7e5','g2g4','d8h4'].forEach(m => g.playUci(m));
s = g.status(); check('mate do louco', s.reason + '/' + s.winner, 'mate/8');
// Afogamento
g = new E.Game('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'); s = g.status(); check('afogamento', s.reason, 'stalemate');
// Xeque simples
g = new E.Game('4k3/8/8/8/8/8/8/4R1K1 b - - 0 1'); s = g.status(); check('xeque', s.over + '/' + s.check, 'false/true');
// Material insuficiente
check('K x K', new E.Game('8/8/4k3/8/8/3K4/8/8 w - - 0 1').status().reason, 'material');
check('K+B x K', new E.Game('8/8/4k3/8/8/3KB3/8/8 w - - 0 1').status().reason, 'material');
check('K+N x K', new E.Game('8/8/4k3/8/8/3KN3/8/8 w - - 0 1').status().reason, 'material');
check('K+B x K+B mesma cor', new E.Game('8/8/4kb2/8/8/3KB3/8/8 w - - 0 1').status().reason, 'material');
check('K+R x K nao e empate', String(new E.Game('8/8/4k3/8/8/3KR3/8/8 w - - 0 1').status().over), 'false');
// 50 lances
check('50 lances', new E.Game('8/8/4k3/8/8/3KR3/8/8 w - - 100 80').status().reason, 'fifty');
// Repeticao tripla
g = new E.Game(); ['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1','f6g8'].forEach(m => g.playUci(m));
check('repeticao tripla', g.status().reason, 'repetition');
// Roque e en passant e promocao
g = new E.Game('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
check('roque pequeno', !!g.playUci('e1g1') && g.pos.fen().split(' ')[0], 'r3k2r/8/8/8/8/8/8/R4RK1');
g = new E.Game('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'); g.playUci('e1c1');
check('roque grande', g.pos.fen().split(' ')[0], 'r3k2r/8/8/8/8/8/8/2KR3R');
check('sem roque atravessando xeque', String(!!new E.Game('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1').playUci('e1g1')), 'false');
g = new E.Game(); ['e2e4','a7a6','e4e5','d7d5'].forEach(m => g.playUci(m));
check('en passant', !!g.playUci('e5d6') && g.pos.fen().split(' ')[0], 'rnbqkbnr/1pp1pppp/p2P4/8/8/8/PPPP1PPP/RNBQKBNR');
g = new E.Game('8/P6k/8/8/8/8/8/K7 w - - 0 1');
check('promocao a cavalo', !!g.playUci('a7a8n') && g.pos.fen().split(' ')[0], 'N7/7k/8/8/8/8/8/K7');
// Notacao em portugues
g = new E.Game(); ['e2e4','e7e5','g1f3','b8c6','f1c4','g8f6','e1g1','f8c5','d2d4','c5d4','f3d4','c6d4','d1h5'].forEach(m => g.playUci(m));
check('notacao PT', g.sans.join(' '), 'e4 e5 Cf3 Cc6 Bc4 Cf6 O-O Bc5 d4 Bxd4 Cxd4 Cxd4 Dh5');
g = new E.Game(); ['e2e4','e7e5','f1c4','b8c6','d1h5','g8f6','h5f7'].forEach(m => g.playUci(m));
check('notacao mate', g.sans[6], 'Dxf7#');
g = new E.Game('7k/R7/8/8/8/8/8/R3K3 w - - 0 1'); g.playUci('a1a4'); check('desambiguacao', g.sans[0], 'T1a4');
g = new E.Game('7k/8/8/8/8/8/4K3/R6R w - - 0 1'); g.playUci('h1f1'); check('desambiguacao 2', g.sans[0], 'Thf1');
g = new E.Game('7k/P7/8/8/8/8/8/K7 w - - 0 1'); g.playUci('a7a8q'); check('promocao notacao', g.sans[0], 'a8=D+');
// IA: encontra mate em 1
for (const lvl of ['medio', 'dificil']) {
  const p = new E.Position('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
  const t = Date.now(); const m = E.think(p, lvl);
  check('IA ' + lvl + ' acha mate em 1', E.uci(m), 'd1d8');
}
const p = new E.Position('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
let t = Date.now(); let m = E.think(p, 'dificil'); console.log('IA dificil lance', E.uci(m), 'em', Date.now() - t, 'ms');
t = Date.now(); m = E.think(new E.Position('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'), 'dificil'); console.log('IA dificil Kiwipete', E.uci(m), 'em', Date.now() - t, 'ms');
// partida IA x IA rapida para garantir que nada quebra
g = new E.Game(); let n = 0;
while (!g.status().over && n < 300) { const mv = E.think(g.pos, n % 2 ? 'facil' : 'medio'); g.play(mv); n++; }
console.log('partida medio x facil terminou:', g.status().reason || 'limite', 'apos', n, 'lances');

// hash Zobrist incremental confere com o calculado do zero (passeio pela arvore)
(function () {
  let bad = 0, cnt = 0;
  function walk(pos, d) {
    const ms = pos.pseudo(false), us = pos.turn;
    for (const m of ms) {
      pos.make(m);
      if (!pos.attacked(pos.kings[us >> 3], us ^ 8)) {
        const h = pos.hh, l = pos.hl; pos.computeHash(); cnt++;
        if (h !== pos.hh || l !== pos.hl) bad++;
        if (d > 1) walk(pos, d - 1);
      }
      pos.unmake();
    }
  }
  walk(new E.Position('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'), 3);
  walk(new E.Position('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'), 4);
  check('hash Zobrist incremental (' + cnt + ' posicoes)', bad, 0);
  const p = new E.Position(); const h0 = p.hl; p.makeNull(); p.unmakeNull(); check('lance nulo restaura hash', p.hl, h0);
})();
// mate em 2: o resolvedor acha a solucao e a IA forte tambem
[['r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 1 1', 'd5f6'],
 ['6k1/5ppp/8/8/8/8/1Q3PPP/1R4K1 w - - 0 1', null]].forEach(function (c, i) {
  const pos = new E.Position(c[0]);
  const sols = E.mateSolutions(pos, 2).map(E.uci);
  if (c[1]) check('mate em 2 #' + (i + 1) + ' solucao', sols.indexOf(c[1]) >= 0, true);
  check('mate em 2 #' + (i + 1) + ' tem solucao', sols.length > 0, true);
  ['dificil', 'mestre'].forEach(function (lv) {
    const t0 = Date.now(); const m = E.think(new E.Position(c[0]), lv, { timeMs: 1500 });
    check('IA ' + lv + ' resolve mate em 2 #' + (i + 1) + ' (' + E.uci(m) + ', ' + (Date.now() - t0) + 'ms)', sols.indexOf(E.uci(m)) >= 0, true);
  });
});
// livro de aberturas: todas as linhas legais e variadas
(function () {
  const first = E.bookMoves(new E.Position());
  check('livro: lances iniciais variados (' + first.join(',') + ')', first.length >= 4, true);
  const g = new E.Game(); g.playUci('e2e4');
  check('livro responde a e4', E.bookMoves(g.pos).length >= 4, true);
})();
// todos os niveis jogam lances legais
['iniciante', 'facil', 'medio', 'dificil', 'mestre'].forEach(function (lv) {
  const g = new E.Game(); let okAll = true;
  for (let i = 0; i < 6; i++) { const m = E.think(g.pos, lv, { timeMs: 200 }); if (!m) { okAll = false; break; } g.play(m); }
  check('nivel ' + lv + ' joga', okAll, true);
});

// Modo Aprender: comentarios
(function () {
  global.XEngine = E; const L = require('../js/learn.js');
  let c = L.comment({ fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2', move: 'f3g5', before: { score: 30, move: 'b1c3' }, after: -250 });
  check('aprender: cavalo sem defesa', /cavalo ficou sem defesa/.test(c.text), true);
  c = L.comment({ fenBefore: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4', move: 'd2d3', before: { score: 99990, move: 'h5f7' }, after: 50 });
  check('aprender: perdeu o mate', /xeque-mate com a dama em f7/.test(c.text), true);
  c = L.comment({ fenBefore: 'rnb1kbnr/pppp1ppp/8/4p3/3qP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 4', move: 'a2a3', before: { score: 800, move: 'd1d4' }, after: -100 });
  check('aprender: perdeu captura da dama', /chance de capturar a dama/.test(c.text), true);
  c = L.comment({ fenBefore: E.START, move: 'e2e4', before: { score: 30, move: 'e2e4' }, after: 25 });
  check('aprender: bom lance', c.kind, 'great');
  const w = L.why({ fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 1 2', move: 'd1h5', score: 40 });
  check('por que: ameaca de mate', /ameaça dar xeque-mate/.test(w), true);
  check('sem travessao nos textos', /\u2014/.test(require('fs').readFileSync(__dirname + '/../js/learn.js', 'utf8') + require('fs').readFileSync(__dirname + '/../index.html', 'utf8')), false);
})();

// Desafios: cada um tem solucao unica verificada pelo resolvedor exato
(function () {
  const w = {}; new Function('window', require('fs').readFileSync(__dirname + '/../js/puzzles.js', 'utf8'))(w);
  let bad = 0, n1 = 0, n2 = 0; const t0 = Date.now();
  w.XPuzzles.forEach(function (p) {
    const pos = new E.Position(p.fen), s1 = E.mateSolutions(pos, 1).map(E.uci);
    if (p.n === 1) { n1++; if (s1.length !== 1 || s1[0] !== p.sol) { bad++; console.log('  desafio ruim', p.id); } }
    else { n2++; const s2 = E.mateSolutions(pos, 2).map(E.uci); if (s1.length || s2.length !== 1 || s2[0] !== p.sol) { bad++; console.log('  desafio ruim', p.id); } }
  });
  check('desafios verificados (' + n1 + ' mate em 1, ' + n2 + ' mate em 2, ' + (Date.now() - t0) + 'ms)', bad, 0);
  check('pelo menos 30 desafios', w.XPuzzles.length >= 30, true);
})();
console.log(fail ? fail + ' FALHAS' : 'TODOS OS TESTES PASSARAM');
process.exit(fail ? 1 : 0);
