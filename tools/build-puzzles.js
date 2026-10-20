// Monta js/puzzles.js: classicos feitos a mao + posicoes geradas, todos verificados pelo resolvedor exato
const E = require('../js/engine.js'), fs = require('fs');
const raw = JSON.parse(fs.readFileSync(process.argv[2] || '/tmp/puzzles-raw.json', 'utf8'));
const classics = [
  ['rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', 'Mate do louco'],
  ['r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'Mate pastor'],
  ['6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'Mate do corredor'],
  ['6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', 'Mate sufocado'],
  ['6k1/8/6K1/8/8/8/8/1Q6 w - - 0 1', 'Rei e dama'],
  ['k7/7R/8/8/8/8/8/6RK w - - 0 1', 'Escada de torres']
];
function solve1(fen) { const p = new E.Position(fen); return E.mateSolutions(p, 1).map(E.uci); }
function solve2(fen) { const p = new E.Position(fen); return E.mateSolutions(p, 2).map(E.uci); }
const out = [];
for (const [fen, name] of classics) {
  const s = solve1(fen);
  if (s.length !== 1) { console.error('classico com', s.length, 'solucoes:', name, s); continue; }
  out.push({ g: 'facil', fen, n: 1, sol: s[0], name });
}
// variedade: alterna a peca que da o mate
function diverse(arr, k, key) {
  const by = {}; arr.forEach(x => (by[key(x)] = by[key(x)] || []).push(x));
  const keys = Object.keys(by).sort((a, b) => by[a].length - by[b].length), res = [];
  while (res.length < k && keys.some(q => by[q].length)) for (const q of keys) if (by[q].length && res.length < k) res.push(by[q].shift());
  return res;
}
const m1 = raw.m1.slice().sort((a, b) => (a.pieces + a.checks * 2) - (b.pieces + b.checks * 2));
const easy = diverse(m1.slice(0, 16), 4, x => x.piece);
const used = new Set(easy.map(x => x.fen));
const med = diverse(m1.filter(x => !used.has(x.fen)).reverse(), 10, x => x.piece);
easy.forEach(x => out.push({ g: 'facil', fen: x.fen, n: 1, sol: x.sol }));
med.forEach(x => out.push({ g: 'medio', fen: x.fen, n: 1, sol: x.sol }));
const m2check = raw.m2.filter(x => !x.quiet && !x.cap).concat(raw.m2.filter(x => !x.quiet && x.cap));
const m2q = raw.m2.filter(x => x.quiet);
diverse(m2check, 10, x => x.piece).forEach(x => out.push({ g: 'dificil', fen: x.fen, n: 2, sol: x.sol }));
diverse(m2q, 8, x => x.piece).forEach(x => out.push({ g: 'mestre', fen: x.fen, n: 2, sol: x.sol }));
// verificacao final
let bad = 0;
out.forEach((p, i) => {
  p.id = 'd' + (i + 1);
  const s1 = solve1(p.fen);
  if (p.n === 1 && (s1.length !== 1 || s1[0] !== p.sol)) { bad++; console.error('falha', p); }
  if (p.n === 2) { const s2 = solve2(p.fen); if (s1.length || s2.length !== 1 || s2[0] !== p.sol) { bad++; console.error('falha', p); } }
});
const groups = {}; out.forEach(p => groups[p.g] = (groups[p.g] || 0) + 1);
console.log('desafios:', out.length, JSON.stringify(groups), 'falhas:', bad);
fs.writeFileSync(__dirname + '/../js/puzzles.js', '/* XADREZAO - desafios de xeque-mate. Classicos de dominio publico e posicoes geradas por partidas do proprio motor, todos verificados pelo resolvedor (solucao unica). */\nwindow.XPuzzles = ' + JSON.stringify(out.map(p => ({ id: p.id, g: p.g, n: p.n, fen: p.fen, sol: p.sol }))).replace(/\},\{/g, '},\n{') + ';\n');
