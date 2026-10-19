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
console.log(fail ? fail + ' FALHAS' : 'TODOS OS TESTES PASSARAM');
process.exit(fail ? 1 : 0);
