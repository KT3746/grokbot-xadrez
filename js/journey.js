/* Jornada: escada de rivais com personalidade */
(function () {
  var KEY = 'xadrezao.jornada.v1';
  var STAGES = [
    { id: 'ivo', av: 'iniciante', level: 'iniciante', human: 0, place: 'A praça', desc: 'Ivo adora sair com a dama bem cedo. Cuidado com o mate pastor!',
      line: ['e7e5', 'd8f6', 'f8c5', 'f6f2'],
      hello: ['Oi! Aposto que te dou mate em 4 lances, hehe.'], taunt: ['Nhac! Essa peça agora é minha.', 'Peguei! Vou guardar no bolso.'],
      hurt: ['Ei! Essa era minha favorita.', 'Ai, não vi essa!'], check: ['Xeque? Calma, eu dou um jeito!'], win: 'Ganhei! Treina mais e volta, tá?', lose: 'Você é bom! Vai lá enfrentar a Flora.' },
    { id: 'flora', av: 'facil', level: 'facil', human: 0, place: 'O jardim', desc: 'Flora ama os cavalos. Eles pulam por cima de tudo, fique de olho!',
      line: ['g8f6', 'b8c6', 'f6g4'],
      hello: ['Meus cavalinhos estão prontos para pular!'], taunt: ['Pulei e peguei!', 'Meus cavalos agradecem.'],
      hurt: ['Ah não, coitadinha da minha peça.', 'Essa doeu!'], check: ['Ui, xeque! Deixa eu pensar...'], win: 'Os cavalos venceram hoje!', lose: 'Parabéns! O Mário te espera na biblioteca.' },
    { id: 'mario', av: 'medio', level: 'medio', human: 0, place: 'A biblioteca', desc: 'Mário joga o clássico: centro forte, peças para fora e roque cedo.',
      line: ['e7e5', 'b8c6', 'f8c5'],
      hello: ['Vamos ver se você conhece os clássicos.'], taunt: ['Material é material.', 'Estava escrito nos livros.'],
      hurt: ['Hmm, interessante.', 'Bem jogado, admito.'], check: ['Um xeque não ganha a partida sozinho.'], win: 'A teoria venceu. Estude e volte!', lose: 'Muito bom! A Diana é bem mais afiada.' },
    { id: 'diana', av: 'dificil', level: 'dificil', human: 0, place: 'O clube', desc: 'Diana adora a Siciliana e não perdoa erros. Pense antes de cada lance.',
      line: ['c7c5', 'd7d6', 'g8f6'],
      hello: ['Siciliana na mesa. Pronto para sofrer?'], taunt: ['Erro anotado.', 'Obrigada pelo presente.'],
      hurt: ['Nada mal.', 'Você está me surpreendendo.'], check: ['Tudo calculado.'], win: 'Previsível. Volte quando estiver pronto.', lose: 'Impressionante. Agora só falta o Mestre Magno.' },
    { id: 'magno', av: 'mestre', level: 'mestre', human: 0, place: 'O palácio', desc: 'Mestre Magno, o grande campeão. Sólido, paciente e muito forte.',
      line: ['e7e6', 'd7d5'],
      hello: ['Bem-vindo ao palácio, jovem. Mostre o que aprendeu.'], taunt: ['Paciência vence pressa.', 'Cada peça conta.'],
      hurt: ['Ora, ora...', 'Bom lance, jovem.'], check: ['Já vi muitos xeques na vida.'], win: 'Ainda não é sua hora. Volte mais forte.', lose: 'Você venceu o Mestre! Mas aceita uma revanche de pretas?' },
    { id: 'final', av: 'mestre', level: 'mestre', human: 8, place: 'A revanche', desc: 'Revanche final: agora Magno joga de brancas e você defende com as pretas.',
      line: ['d2d4', 'c2c4', 'b1c3'],
      hello: ['Agora eu começo. Vamos ver sua defesa.'], taunt: ['A iniciativa é minha.', 'Sua defesa tem buracos.'],
      hurt: ['Excelente!', 'Você cresceu muito.'], check: ['Xeque de quem aprendeu comigo.'], win: 'A coroa continua comigo!', lose: 'Você é o novo campeão do XADREZÃO!' },
  ];
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { done: 0 }; } catch (e) { return { done: 0 }; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  // lance da abertura preferida, se ainda couber e for legal
  function openingMove(i, game, E) {
    var st = STAGES[i]; if (!st || !st.line) return null;
    if (game.startFen && game.startFen.indexOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR') !== 0) return null;
    var k = Math.floor(game.moves.length / 2); if (k >= st.line.length) return null;
    var ms = game.legal();
    for (var j = 0; j < ms.length; j++) if (E.uci(ms[j]) === st.line[k]) return ms[j];
    return null;
  }
  function win(i) { var s = load(); if (i + 1 > s.done) { s.done = i + 1; save(s); } }
  function render(el, onPick) {
    var s = load(), html = '';
    STAGES.forEach(function (st, i) {
      var state = i < s.done ? 'done' : i === s.done ? 'cur' : 'lock';
      html += '<button class="jn ' + state + (i % 2 ? ' r' : '') + '" data-i="' + i + '"' + (state === 'lock' ? ' disabled' : '') + '>' +
        '<span class="jav">' + XAvatars.svg(st.av) + (state === 'lock' ? '<b class="jlock"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></b>' : state === 'done' ? '<b class="jok">✓</b>' : '') + '</span>' +
        '<span class="jtx"><small>Rival ' + (i + 1) + ' · ' + st.place + '</small><b>' + XAvatars.name(st.av) + (st.id === 'final' ? ' (revanche)' : '') + '</b><em>' + st.desc + '</em></span></button>';
    });
    el.innerHTML = html;
    [].forEach.call(el.querySelectorAll('.jn'), function (b) { b.onclick = function () { onPick(+b.dataset.i); }; });
    var cur = el.querySelector('.jn.cur'); if (cur) setTimeout(function () { cur.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 350);
  }
  window.XJourney = { STAGES: STAGES, load: load, win: win, render: render, openingMove: openingMove, pick: pick };
})();
