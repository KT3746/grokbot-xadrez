// Gera desafios de mate a partir de partidas do proprio motor (posicoes naturais) e verifica com o resolvedor exato.
const E = require('../js/engine.js');
const fs = require('fs');
const want1 = +process.argv[2] || 60, want2 = +process.argv[3] || 40;
const seen = new Set(), m1 = [], m2 = [];
function countPieces(pos) { let n = 0; for (let s = 0; s < 120; s++) { if (s & 0x88) { s += 7; continue; } if (pos.board[s]) n++; } return n; }
function checks(pos) { let n = 0; for (const m of pos.legal()) { pos.make(m); if (pos.inCheck()) n++; pos.unmake(); } return n; }
const levels = ['iniciante', 'facil', 'medio', 'medio', 'facil'];
let games = 0; const t0 = Date.now();
while ((m1.length < want1 || m2.length < want2) && Date.now() - t0 < 25 * 60000) {
  games++;
  const g = new E.Game(); const lw = levels[(Math.random() * levels.length) | 0], lb = levels[(Math.random() * levels.length) | 0];
  let n = 0;
  while (!g.status().over && n < 160) {
    const pos = g.pos;
    if (n >= 10 && !pos.inCheck()) {
      const key = pos.fen().split(' ').slice(0, 4).join(' ');
      if (!seen.has(key)) {
        seen.add(key);
        const s1 = E.mateSolutions(pos, 1);
        if (s1.length === 1 && m1.length < want1) {
          m1.push({ fen: pos.fen(), n: 1, sol: E.uci(s1[0]), pieces: countPieces(pos), checks: checks(pos), piece: s1[0].piece & 7, cap: !!s1[0].cap });
        } else if (!s1.length && m2.length < want2) {
          E.clearTT();
          const r = E.analyse(pos, { maxDepth: 4, timeMs: 60 });
          if (r.score >= E.MATE - 3) {
            const s2 = E.mateSolutions(pos, 2);
            if (s2.length === 1) {
              const k = s2[0]; pos.make(k); const chk = pos.inCheck(); pos.unmake();
              m2.push({ fen: pos.fen(), n: 2, sol: E.uci(k), pieces: countPieces(pos), checks: checks(pos), piece: k.piece & 7, quiet: !chk && !k.cap, cap: !!k.cap });
            }
          }
        }
      }
    }
    const mv = E.think(pos, pos.turn ? lb : lw, { timeMs: 60 });
    g.play(mv); n++;
  }
  if (games % 20 === 0) console.error(`partidas ${games}: mate1 ${m1.length}, mate2 ${m2.length}`);
}
fs.writeFileSync('/tmp/puzzles-raw.json', JSON.stringify({ m1, m2 }, null, 1));
console.log(`partidas ${games}: mate1 ${m1.length}, mate2 ${m2.length}`);
