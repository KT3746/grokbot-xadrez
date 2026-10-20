// Teste de forca: niveis mais fortes contra mais fracos (partidas IA x IA)
const E = require('../js/engine.js');
const T = { iniciante: 0, facil: 0, medio: 0, dificil: 400, mestre: 600 };
function playGame(white, black) {
  const g = new E.Game(); const lv = [white, black]; let n = 0;
  while (!g.status().over && n < 240) {
    const side = g.pos.turn ? 1 : 0;
    const reps = []; // historico para repeticao
    const p2 = new E.Position(g.startFen); reps.push([p2.hh, p2.hl]);
    for (const m of g.moves) { p2.make(m); reps.push([p2.hh, p2.hl]); }
    reps.pop();
    const m = E.think(g.pos, lv[side], { timeMs: T[lv[side]] || undefined, reps });
    g.play(m); n++;
  }
  const st = g.status();
  if (st.over) return st.winner === 0 ? 1 : st.winner === 8 ? -1 : 0;
  const ev = E.evaluate(g.pos) * (g.pos.turn ? -1 : 1); // adjudica por material/posicao
  return ev > 300 ? 1 : ev < -300 ? -1 : 0;
}
const ALL = [['mestre', 'medio'], ['dificil', 'facil'], ['medio', 'iniciante'], ['facil', 'iniciante'], ['mestre', 'dificil']];
const pairs = process.argv[2] ? [process.argv.slice(2, 4)] : ALL;
let total = 0, bad = 0;
for (const [strong, weak] of pairs) {
  let s = 0, d = 0, l = 0;
  const games = strong === 'mestre' && weak === 'dificil' ? 4 : 2;
  for (let i = 0; i < games; i++) {
    const r = i % 2 === 0 ? playGame(strong, weak) : -playGame(weak, strong);
    if (r > 0) s++; else if (r < 0) l++; else d++;
  }
  total++; if (s <= l) bad++;
  console.log(`${strong} x ${weak}: ${s} vitorias, ${d} empates, ${l} derrotas`);
}
console.log(bad ? `ATENCAO: ${bad} confronto(s) sem vantagem do nivel forte` : 'OK: niveis fortes venceram todos os confrontos');
