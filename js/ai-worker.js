/* Worker da IA: roda a busca fora da tela para nada travar */
var params = new URLSearchParams(self.location.search);
importScripts('engine.js?v=' + (params.get('v') || '1'));
var E = XEngine;
function build(d) {
  var pos = new E.Position(d.start || d.fen), reps = [];
  var mv = d.moves || [];
  for (var i = 0; i < mv.length; i++) {
    var ms = pos.legal(), f = null;
    for (var j = 0; j < ms.length; j++) if (E.uci(ms[j]) === mv[i]) { f = ms[j]; break; }
    if (!f) break;
    reps.push([pos.hh, pos.hl]);
    pos.make(f);
  }
  if (!d.moves && d.fen) pos = new E.Position(d.fen);
  pos.hist = [];
  return { pos: pos, reps: reps };
}
self.onmessage = function (e) {
  var d = e.data, out = { id: d.id, type: d.type || 'move', hint: !!d.hint };
  try {
    var b = build(d);
    if (d.type === 'analyse') {
      // avaliacao para o Modo Aprender: nota da posicao e melhor lance
      var r = E.analyse(b.pos, { timeMs: d.timeMs || 500, reps: b.reps, maxDepth: d.maxDepth });
      out.move = r.move ? E.uci(r.move) : null; out.score = r.score; out.depth = r.depth;
    } else {
      var m = E.think(b.pos, d.level, { timeMs: d.timeMs, reps: b.reps });
      out.move = m ? E.uci(m) : null;
    }
  } catch (err) { out.move = null; out.error = String(err); }
  self.postMessage(out);
};
