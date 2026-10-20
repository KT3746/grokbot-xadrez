/* XADREZAO - Modo Aprender: comentarios do professor, "Por que?" e guia das pecas */
(function (root) {
  'use strict';
  var E = root.XEngine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  var NOME = ['', 'peão', 'cavalo', 'bispo', 'torre', 'dama', 'rei'];
  var FEM = [false, false, false, false, true, true, false];
  var MATE = E.MATE;
  function oa(t) { return (FEM[t] ? 'a ' : 'o ') + NOME[t]; }           // "a dama"
  function seu(t) { return (FEM[t] ? 'sua ' : 'seu ') + NOME[t]; }      // "sua dama"
  function dele(t) { return (FEM[t] ? 'a ' : 'o ') + NOME[t] + ' dele'; }
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function sq(s) { return E.sqName(s); }
  function findUci(pos, u) { var ms = pos.legal(); for (var i = 0; i < ms.length; i++) if (E.uci(ms[i]) === u) return ms[i]; return null; }
  function givesMate(pos, m) { pos.make(m); var r = pos.inCheck() && pos.legal().length === 0; pos.unmake(); return r; }
  function mateIn1(pos) { var ms = pos.legal(); for (var i = 0; i < ms.length; i++) if (givesMate(pos, ms[i])) return ms[i]; return null; }

  // Pecas de "color" que o lado contrario pode ganhar (atacadas e sem defesa suficiente). pos: qualquer lado a jogar
  function hangingPieces(pos, color) {
    var p2 = new E.Position(pos.fen().replace(/ [wb] /, color === E.WHITE ? ' b ' : ' w ').replace(/ ([KQkq-]+) [a-h1-8-]+ /, ' $1 - '));
    var caps = p2.pseudo(true), us = p2.turn, out = [];
    var minAtt = {};
    for (var i = 0; i < caps.length; i++) {
      var m = caps[i];
      if (m.flags & E.F_EP) continue;
      p2.make(m); var bad = p2.attacked(p2.kings[us >> 3], us ^ 8); p2.unmake();
      if (bad) continue;
      var v = E.VAL[m.piece & 7] || 1000;
      if (!(m.to in minAtt) || v < minAtt[m.to]) minAtt[m.to] = v;
    }
    for (var k in minAtt) {
      var s = +k, pc = p2.board[s], t = pc & 7;
      if (t === E.K) continue;
      var defended = p2.attacked(s, color);
      if (!defended || minAtt[k] < E.VAL[t]) out.push({ sq: s, type: t, val: E.VAL[t] });
    }
    out.sort(function (a, b) { return b.val - a.val; });
    return out;
  }

  function evalWords(score) {
    if (score >= MATE - 300) return 'Você tem um xeque-mate forçado!';
    if (score <= -MATE + 300) return 'Cuidado: o computador tem um mate forçado.';
    if (score > 300) return 'Você está ganhando.';
    if (score > 120) return 'Você está melhor.';
    if (score > -120) return 'A partida está equilibrada.';
    if (score > -300) return 'O computador está melhor.';
    return 'O computador está ganhando.';
  }

  // Comentario depois do lance do jogador.
  // ctx: { fenBefore, move (uci), before: {score, move} | null (nota antes, do ponto de vista do jogador),
  //        after: nota depois (do ponto de vista do jogador) }
  function comment(ctx) {
    var pos = new E.Position(ctx.fenBefore), me = pos.turn;
    var m = findUci(pos, ctx.move); if (!m) return null;
    var t = m.piece & 7;
    var mate1 = mateIn1(pos);
    var isMate = givesMate(pos, m);
    if (isMate) return { kind: 'great', text: 'Xeque-mate! Lance perfeito!' };
    var bestU = ctx.before && ctx.before.move, best = bestU ? findUci(pos, bestU) : null;
    var bs = ctx.before ? ctx.before.score : null, as = ctx.after;
    var delta = bs != null && as != null ? bs - as : null;
    if (bs != null && bs > MATE - 300 && as != null && as < MATE - 300) delta = 1000;
    pos.make(m);
    var oppMate = mateIn1(pos);
    var hang = hangingPieces(pos, me);
    var check = pos.inCheck();
    pos.unmake();
    var words = as != null ? ' ' + evalWords(as) : '';
    // 1) perdeu um mate
    if (mate1) {
      return { kind: 'bad', text: 'Você tinha xeque-mate com ' + oa(mate1.piece & 7) + ' em ' + sq(mate1.to) + '!' + words, show: mate1 };
    }
    if (bs != null && bs > MATE - 300 && delta >= 500) {
      return { kind: 'bad', text: 'Havia um xeque-mate forçado nesta posição. Use a Dica para treinar.' + words, show: best };
    }
    // 2) deixou mate para o computador
    if (oppMate) return { kind: 'bad', text: 'Cuidado: agora o computador pode dar xeque-mate com ' + oa(oppMate.piece & 7) + ' em ' + sq(oppMate.to) + '!' };
    var bigLoss = delta == null ? true : delta >= 120;
    // 3) peca pendurada
    if (hang.length && hang[0].val >= 300 && bigLoss) {
      var h = hang[0];
      var moved = h.sq === m.to ? 'Cuidado: ' + seu(h.type) + ' ficou sem defesa em ' + sq(h.sq) + '.' : 'Cuidado: ' + seu(h.type) + ' em ' + sq(h.sq) + ' pode ser capturad' + (FEM[h.type] ? 'a' : 'o') + '.';
      return { kind: 'bad', text: moved + words };
    }
    // 4) perdeu a chance de capturar
    if (best && best.cap && E.VAL[best.cap & 7] >= 300 && delta != null && delta >= 150 && !(m.from === best.from && m.to === best.to)) {
      return { kind: 'bad', text: 'Você perdeu a chance de capturar ' + oa(best.cap & 7) + ' em ' + sq(best.to) + '.' + words, show: best };
    }
    if (best && delta != null && delta >= 250) return { kind: 'bad', text: 'Erro! Era melhor ' + oa(best.piece & 7) + ' para ' + sq(best.to) + '.' + words, show: best };
    if (best && delta != null && delta >= 90) return { kind: 'meh', text: 'Imprecisão. Melhor era ' + oa(best.piece & 7) + ' para ' + sq(best.to) + '.' + words, show: best };
    // 5) bons lances
    var same = best && best.from === m.from && best.to === m.to;
    var extra = '';
    if (m.flags & E.F_CASTLE) extra = ' Roque feito: o rei fica mais protegido.';
    else if (m.promo) extra = ' Promoveu o peão!';
    else if (m.cap) extra = ' Boa captura de ' + oa(m.cap & 7) + '.';
    else if (check) extra = ' Xeque! Continue pressionando.';
    else if (pos.full <= 8 && (t === E.N || t === E.B) && ((m.from >> 4) === (me ? 7 : 0))) extra = ' Desenvolver as peças no começo é ótimo.';
    if (same) return { kind: 'great', text: 'Ótimo lance! Era o melhor.' + extra + words };
    if (delta == null || delta <= 40) return { kind: 'good', text: 'Bom lance!' + extra + words };
    return { kind: 'ok', text: 'Lance razoável.' + extra + words };
  }

  // Explica o lance do computador. ctx: { fenBefore, move (uci), score (do ponto de vista do computador), book }
  function why(ctx) {
    var pos = new E.Position(ctx.fenBefore), ai = pos.turn, me = ai ^ 8;
    var m = findUci(pos, ctx.move); if (!m) return '';
    var t = m.piece & 7, out = [];
    var hangBefore = hangingPieces(pos, ai);
    var wasAttacked = hangBefore.some(function (h) { return h.sq === m.from; });
    var capHanging = m.cap && hangingPieces(pos, me).some(function (h) { return h.sq === m.to; });
    pos.make(m);
    var mate = pos.inCheck() && !pos.legal().length, check = pos.inCheck();
    var threats = hangingPieces(pos, me);
    var myHang = hangingPieces(pos, ai);
    var mateThreat = null;
    if (!mate && !check) { pos.makeNull(); mateThreat = mateIn1(pos); pos.unmakeNull(); }
    pos.unmake();
    if (mate) return 'Xeque-mate: o seu rei está atacado e não tem para onde fugir.';
    if (ctx.book) out.push('É um lance conhecido de abertura, usado por mestres há muito tempo.');
    if (m.flags & E.F_CASTLE) out.push('Fez o roque: protegeu o rei e colocou a torre em jogo.');
    if (m.promo) out.push('Levou o peão até o fim e ganhou uma ' + NOME[m.promo] + ' nova.');
    if (m.cap) out.push('Capturou ' + seu(m.cap & 7) + ' em ' + sq(m.to) + (capHanging ? ', que estava sem defesa.' : '.'));
    if (check) out.push('Deu xeque no seu rei, você é obrigado a responder.');
    if (wasAttacked && !m.cap) out.push('Tirou ' + oa(t) + ' de um ataque.');
    if (mateThreat) out.push('Atenção: ameaça dar xeque-mate com ' + oa(mateThreat.piece & 7) + ' em ' + sq(mateThreat.to) + '!');
    else if (threats.length && threats[0].val >= 300) out.push('Agora ameaça capturar ' + seu(threats[0].type) + ' em ' + sq(threats[0].sq) + '.');
    if (!out.length) {
      var center = [0x33, 0x34, 0x43, 0x44].indexOf(m.to) >= 0;
      if (t === E.P && center) out.push('Ocupou o centro com um peão, isso dá espaço para as peças.');
      else if ((t === E.N || t === E.B) && (m.from >> 4) === (ai ? 7 : 0)) out.push('Desenvolveu ' + oa(t) + ', trazendo mais uma peça para a luta.');
      else if (t === E.R) out.push('Colocou a torre numa coluna mais ativa.');
      else if (t === E.P) out.push('Avançou um peão para ganhar espaço e preparar as peças.');
      else if (t === E.K) out.push('Moveu o rei para um lugar mais seguro (ou mais ativo no final).');
      else out.push('Melhorou a posição ' + (FEM[t] ? 'da ' : 'do ') + NOME[t] + ' e se preparou para o próximo plano.');
    }
    if (myHang.length && myHang[0].val >= 300 && !check) out.push('Dica: veja se ' + dele(myHang[0].type) + ' em ' + sq(myHang[0].sq) + ' está bem defendid' + (FEM[myHang[0].type] ? 'a' : 'o') + '.');
    if (ctx.score != null) {
      var s = -ctx.score; // do ponto de vista do jogador
      out.push(evalWords(s));
    }
    return out.join(' ');
  }

  // ===== Guia: como as pecas andam =====
  var DEMOS = [
    { t: 1, at: 0x14, title: 'Peão', text: 'Anda uma casa para a frente (na primeira vez pode andar duas). Captura na diagonal, uma casa à frente. Se chegar do outro lado, vira dama, torre, bispo ou cavalo.', enemy: 0x23, val: 1 },
    { t: 2, at: 0x33, title: 'Cavalo', text: 'Anda em "L": duas casas numa direção e uma para o lado. É a única peça que pode pular por cima das outras.', val: 3 },
    { t: 3, at: 0x33, title: 'Bispo', text: 'Anda na diagonal, quantas casas quiser, sem pular peças. Fica sempre na mesma cor de casa.', val: 3 },
    { t: 4, at: 0x33, title: 'Torre', text: 'Anda em linha reta, na horizontal ou na vertical, quantas casas quiser.', val: 5 },
    { t: 5, at: 0x33, title: 'Dama', text: 'A peça mais forte: anda como a torre e o bispo juntos, em qualquer direção.', val: 9 },
    { t: 6, at: 0x34, title: 'Rei', text: 'Anda uma casa em qualquer direção. Nunca pode ficar em xeque. Se for atacado e não tiver saída, é xeque-mate e a partida acaba.', val: 0 }
  ];
  var RULES = [
    ['Xeque e xeque-mate', 'Xeque é quando o rei está sendo atacado: você precisa salvá-lo. Xeque-mate é quando não há como salvar. Quem dá o mate vence!'],
    ['Roque', 'Uma vez por partida, o rei anda duas casas para o lado da torre e a torre pula para o outro lado dele. Só vale se nenhum dos dois se mexeu, se não houver peças no meio e se o rei não estiver em xeque nem passar por casa atacada.'],
    ['Captura de passagem', 'Se um peão anda duas casas e para ao lado de um peão adversário, este pode capturá-lo como se ele tivesse andado só uma. Só vale no lance seguinte.'],
    ['Empate', 'A partida empata se quem joga não tem lance e não está em xeque (afogamento), se a mesma posição se repete 3 vezes, após 50 lances sem captura nem movimento de peão, ou se não há peças suficientes para dar mate.'],
    ['Valor das peças', 'Peão vale 1, cavalo 3, bispo 3, torre 5 e dama 9. O rei não tem preço: perder o rei é perder a partida. Antes de trocar, faça as contas!']
  ];
  function destinations(d) {
    var offs = { 2: [33, 31, 18, 14, -33, -31, -18, -14], 3: [17, 15, -17, -15], 4: [16, -16, 1, -1], 5: [17, 15, -17, -15, 16, -16, 1, -1], 6: [17, 15, -17, -15, 16, -16, 1, -1] };
    var out = [];
    if (d.t === 1) return [d.at + 16, d.at + 32];
    var o = offs[d.t], slide = d.t === 3 || d.t === 4 || d.t === 5;
    for (var i = 0; i < o.length; i++) {
      var s = d.at + o[i];
      while (!(s & 0x88)) { out.push(s); if (!slide) break; s += o[i]; }
    }
    return out;
  }
  function buildGuide(el) {
    el.innerHTML = '';
    var timers = [];
    DEMOS.forEach(function (d) {
      var card = document.createElement('div'); card.className = 'gcard';
      var board = document.createElement('div'); board.className = 'gboard';
      var dests = destinations(d), html = '';
      for (var r = 7; r >= 0; r--) for (var f = 0; f < 8; f++) {
        var s = r * 16 + f;
        html += '<i class="' + ((r + f) % 2 ? 'l' : 'd') + (dests.indexOf(s) >= 0 ? ' dot' : '') + (d.enemy === s ? ' ring' : '') + '"></i>';
      }
      board.innerHTML = html;
      var pc = document.createElement('div'); pc.className = 'gpc'; pc.innerHTML = XPieces.svg(d.t);
      board.appendChild(pc);
      var en = null;
      if (d.enemy != null) { en = document.createElement('div'); en.className = 'gpc'; en.innerHTML = XPieces.svg(1 | 8); board.appendChild(en); place(en, d.enemy); }
      place(pc, d.at);
      var txt = document.createElement('div'); txt.className = 'gtxt';
      txt.innerHTML = '<h4>' + d.title + (d.val ? ' <small>vale ' + d.val + '</small>' : '') + '</h4><p>' + d.text + '</p>';
      card.appendChild(board); card.appendChild(txt); el.appendChild(card);
      // animacao: vai a destinos variados e volta
      var seq = d.t === 1 ? [0x34, -1, 0x23, -2] : pickSeq(dests), k = 0, home = true;
      function step() {
        if (!el.isConnected || !el.closest('.screen.show')) return;
        if (home) {
          var target = seq[k % seq.length]; k++;
          if (target === -1 || target === -2) { place(pc, d.at); if (en) { en.style.opacity = 1; } home = true; return; }
          place(pc, target); home = false;
          if (en && target === d.enemy) setTimeout(function () { en.style.opacity = 0; }, 250);
        } else { place(pc, d.at); home = true; if (en) setTimeout(function () { en.style.opacity = 1; }, 300); }
      }
      timers.push(setInterval(step, 900));
    });
    RULES.forEach(function (r) {
      var c = document.createElement('div'); c.className = 'gcard rule';
      c.innerHTML = '<div class="gtxt"><h4>' + r[0] + '</h4><p>' + r[1] + '</p></div>';
      el.appendChild(c);
    });
    return function stop() { timers.forEach(clearInterval); };
  }
  function pickSeq(dests) {
    var a = dests.slice(), out = [];
    for (var i = 0; i < 4 && a.length; i++) { var j = (i * 7 + 3) % a.length; out.push(a.splice(j, 1)[0]); }
    return out;
  }
  function place(node, s) { node.style.transform = 'translate(' + ((s & 7) * 100) + '%,' + ((7 - (s >> 4)) * 100) + '%)'; }

  var api = { comment: comment, why: why, evalWords: evalWords, hangingPieces: hangingPieces, mateIn1: mateIn1, buildGuide: buildGuide };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.XLearn = api;
})(typeof self !== 'undefined' ? self : this);
