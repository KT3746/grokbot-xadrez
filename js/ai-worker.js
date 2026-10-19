/* Worker da IA: roda a busca fora da tela para nada travar */
var params = new URLSearchParams(self.location.search);
importScripts('engine.js?v=' + (params.get('v') || '1'));
self.onmessage = function (e) {
  var d = e.data;
  try {
    var pos = new XEngine.Position(d.fen);
    var m = XEngine.think(pos, d.level, { timeMs: d.timeMs || 1500 });
    self.postMessage({ id: d.id, move: m ? XEngine.uci(m) : null });
  } catch (err) {
    self.postMessage({ id: d.id, move: null, error: String(err) });
  }
};
