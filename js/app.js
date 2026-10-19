/* XADREZAO - controle do jogo e telas */
(function () {
  'use strict';
  var E = XEngine, V = window.XV || '1';
  var $ = function (id) { return document.getElementById(id); };
  var SAVE = 'xadrezao.jogo.v1', PREFS = 'xadrezao.prefs.v1';
  var LEVEL_NAME = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
  var COLOR_NAME = { 0: 'brancas', 8: 'pretas' };

  var prefs = load(PREFS) || {};
  prefs = { view: prefs.view || '3d', sound: prefs.sound !== false, music: prefs.music !== false, level: prefs.level || 'medio', color: prefs.color || 'w', flip: prefs.flip !== false };

  var app = {
    game: null, mode: 'ai', level: 'medio', human: 0, autoFlip: true, orient: 0,
    sel: -1, dests: {}, busy: false, thinking: false, aiReq: 0, over: null,
    view2d: null, view3d: null, v: null, has3d: true, screen: 'menu'
  };
  window.XApp = app;

  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function savePrefs() { store(PREFS, prefs); }
  function saveGame() {
    if (!app.game) return;
    store(SAVE, { mode: app.mode, level: app.level, human: app.human, autoFlip: app.autoFlip, orient: app.orient, moves: app.game.moves.map(E.uci), t: Date.now() });
  }
  function sfx(n) { XSound.play(n); }

  // ===== Visuais =====
  app.stageRect = function () {
    var r = $('stage').getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  function fit2d() {
    var r = $('stage').getBoundingClientRect();
    var s = Math.floor(Math.min(r.width - 14, r.height - 14));
    $('board2d').style.width = s + 'px'; $('board2d').style.height = s + 'px';
  }
  function useView(kind, first) {
    if (kind === '3d' && !app.view3d) kind = '2d';
    app.v = kind === '3d' ? app.view3d : app.view2d;
    document.body.classList.toggle('three', kind === '3d');
    if (app.view3d) app.view3d.setActive(kind === '3d');
    $('cViewL').textContent = kind === '3d' ? 'Ver 2D' : 'Ver 3D';
    $('cView').hidden = !app.has3d;
    if (app.game) {
      app.v.setOrient(app.orient, false);
      app.v.sync(app.game.pos.board);
      refreshHL();
    }
    fit2d();
  }
  function init3d() {
    if (app.view3d || !app.has3d) return Promise.resolve(app.view3d);
    $('loading').hidden = false;
    return import('./view3d.js?v=' + V).then(function (mod) {
      try {
        app.view3d = new mod.View3D($('c3d'), app);
        window.addEventListener('resize', function () { app.view3d.resize(); });
      } catch (e) { console.warn(e); app.has3d = false; toast('Seu aparelho não conseguiu abrir o 3D. Usando o visual 2D.'); }
      $('loading').hidden = true;
      return app.view3d;
    }).catch(function (e) { console.warn(e); app.has3d = false; $('loading').hidden = true; return null; });
  }
  function webglOK() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }

  // ===== Partida =====
  function isHumanTurn() { return app.mode === '2p' || app.game.pos.turn === app.human; }
  function startGame(opts) {
    app.mode = opts.mode; app.level = opts.level || 'medio'; app.human = opts.human || 0; app.autoFlip = !!opts.autoFlip;
    app.game = new E.Game();
    var moves = opts.moves || [];
    for (var i = 0; i < moves.length; i++) if (!app.game.playUci(moves[i])) break;
    app.orient = opts.orient != null ? opts.orient : (app.mode === 'ai' ? app.human : 0);
    if (app.mode === '2p' && app.autoFlip) app.orient = app.game.pos.turn;
    app.sel = -1; app.dests = {}; app.over = null; app.busy = false; app.thinking = false; app.aiReq++;
    showScreen('game');
    useView(prefs.view);
    if (app.v === app.view3d && !moves.length) app.view3d.intro();
    refreshAll();
    saveGame();
    if (!moves.length) sfx('start');
    var st = app.game.status();
    if (st.over) app.over = st;
    else maybeAI();
  }

  function lastMove() { var m = app.game.moves; return m.length ? m[m.length - 1] : null; }
  function refreshHL() {
    var lm = lastMove(), st = app.game.status();
    var check = st.check ? app.game.pos.kings[app.game.pos.turn >> 3] : -1;
    app.v.highlight({ sel: app.sel, dests: app.dests, last: lm ? { from: lm.from, to: lm.to } : null, check: check });
  }
  function refreshAll() {
    refreshHL(); refreshStatus(); refreshPlayers(); refreshButtons();
  }
  function statusText(st) {
    var g = app.game, turn = g.pos.turn;
    if (st.over) {
      if (st.reason === 'mate') {
        if (app.mode === 'ai') return st.winner === app.human ? 'Xeque-mate! Você venceu!' : 'Xeque-mate! O computador venceu';
        return 'Xeque-mate! ' + (st.winner === 0 ? 'Brancas' : 'Pretas') + ' venceram';
      }
      return {
        stalemate: 'Empate por afogamento', fifty: 'Empate pela regra dos 50 lances',
        repetition: 'Empate por repetição (3 vezes)', material: 'Empate: peças insuficientes para mate'
      }[st.reason];
    }
    var who;
    if (app.mode === 'ai') who = turn === app.human ? 'Sua vez' : 'Computador pensando...';
    else who = 'Vez das ' + COLOR_NAME[turn];
    return st.check ? 'Xeque! ' + who : who;
  }
  function refreshStatus() {
    var st = app.game.status(), el = $('status');
    el.textContent = statusText(st);
    el.className = st.over ? 'over' : (st.check ? 'check' : '');
  }
  function refreshPlayers() {
    var g = app.game, bottomColor = app.orient, topColor = bottomColor ^ 8;
    var taken = { 0: [], 8: [] }, mat = { 0: 0, 8: 0 }, VALS = [0, 1, 3, 3, 5, 9, 0];
    g.moves.forEach(function (m) { if (m.cap) taken[m.piece & 8].push(m.cap); if (m.promo) mat[m.piece & 8] += VALS[m.promo] - 1; });
    [0, 8].forEach(function (c) { taken[c].forEach(function (p) { mat[c] += VALS[p & 7]; }); });
    function name(c) {
      if (app.mode === 'ai') return c === app.human ? 'Você (' + COLOR_NAME[c] + ')' : 'Computador (' + LEVEL_NAME[app.level] + ')';
      return c === 0 ? 'Brancas' : 'Pretas';
    }
    [['plTop', topColor], ['plBot', bottomColor]].forEach(function (a) {
      var el = $(a[0]), c = a[1];
      el.querySelector('.dot').className = 'dot ' + (c ? 'b' : 'w');
      el.querySelector('.name').textContent = name(c);
      var list = taken[c].slice().sort(function (x, y) { return (y & 7) - (x & 7); });
      el.querySelector('.caps').innerHTML = list.map(function (p) { return XPieces.svg(p); }).join('');
      var adv = mat[c] - mat[c ^ 8];
      el.querySelector('.adv').textContent = adv > 0 ? '+' + adv : '';
      el.classList.toggle('turn', !app.over && g.pos.turn === c);
    });
  }
  function hasHumanMove() {
    var g = app.game;
    if (app.mode === '2p') return g.moves.length > 0;
    return g.moves.some(function (m) { return (m.piece & 8) === app.human; });
  }
  function refreshButtons() { $('cUndo').disabled = !hasHumanMove(); }

  app.clearSel = function () { app.sel = -1; app.dests = {}; refreshHL(); };
  function select(sq) {
    app.sel = sq; app.dests = {};
    app.game.legal().forEach(function (m) { if (m.from === sq) app.dests[m.to] = (m.cap ? 2 : 1); });
    refreshHL();
    sfx('select');
  }
  app.onSquare = function (sq) {
    if (app.busy || app.over || !app.game || !isHumanTurn()) return;
    var p = app.game.pos.board[sq], turn = app.game.pos.turn;
    if (app.sel >= 0 && app.dests[sq]) { app.tryMove(app.sel, sq); return; }
    if (sq === app.sel) { app.clearSel(); return; }
    if (p && (p & 8) === turn) { select(sq); return; }
    if (app.sel >= 0) sfx('illegal');
    app.clearSel();
  };
  app.tryMove = function (from, to, opts) {
    if (app.busy || app.over || !isHumanTurn()) return false;
    var cands = app.game.legal().filter(function (m) { return m.from === from && m.to === to; });
    if (!cands.length) { sfx('illegal'); return false; }
    if (cands.length > 1) {
      askPromotion(app.game.pos.turn, function (t) {
        if (!t) { app.v.sync(app.game.pos.board); app.clearSel(); return; }
        var m = cands.filter(function (c) { return c.promo === t; })[0];
        doMove(m, { instant: opts && opts.instant });
      });
      return true;
    }
    doMove(cands[0], opts);
    return true;
  };
  function moveSound(m, st) {
    if (st.over && st.reason === 'mate') return;
    if (st.check) sfx('check');
    else if (m.promo) { sfx('promote'); sfx(m.cap ? 'capture' : 'move'); }
    else if (m.flags & E.F_CASTLE) sfx('castle');
    else if (m.cap) sfx('capture');
    else sfx('move');
  }
  function doMove(m, opts) {
    app.game.play(m);
    app.sel = -1; app.dests = {};
    app.busy = true;
    var st = app.game.status();
    refreshStatus(); refreshPlayers(); refreshButtons();
    refreshHL();
    saveGame();
    var willAI = !st.over && app.mode === 'ai' && app.game.pos.turn !== app.human;
    if (willAI) requestAI();
    return app.v.animate(m, app.game.pos.board, opts || {}).then(function () {
      app.busy = false;
      moveSound(m, st);
      refreshHL();
      if (st.over) { gameOver(st); return; }
      if (app.mode === '2p' && app.autoFlip) { app.orient = app.game.pos.turn; app.v.setOrient(app.orient, true); refreshPlayers(); if (app.v === app.view3d) sfx('whoosh'); }
      if (app.pendingAI) { var pm = app.pendingAI; app.pendingAI = null; applyAI(pm); }
    });
  }
  function gameOver(st) {
    app.over = st;
    refreshPlayers();
    var g = app.game;
    var loserKing = st.reason === 'mate' ? g.pos.kings[(st.winner ^ 8) >> 3] : -1;
    if (st.reason === 'mate') sfx(app.mode === 'ai' && st.winner !== app.human ? 'lose' : 'mate');
    else sfx('draw');
    app.v.celebrate({ reason: st.reason, winner: st.winner, kingSq: loserKing });
    setTimeout(function () {
      var title = st.reason === 'mate' ? 'Xeque-mate!' : 'Empate!';
      var text = statusText(st).replace('Xeque-mate! ', '');
      if (st.reason === 'mate') text = app.mode === 'ai' ? (st.winner === app.human ? 'Parabéns, você venceu o computador!' : 'O computador venceu desta vez. Tente de novo!') : text + '!';
      modal(title, text, [{ t: 'Ver tabuleiro' }, { t: 'Novo jogo', pri: true, fn: function () { newSame(); } }]);
    }, st.reason === 'mate' ? 1900 : 900);
  }

  // ===== Computador =====
  var worker = null;
  function getWorker() {
    if (worker) return worker;
    try {
      worker = new Worker('js/ai-worker.js?v=' + V);
      worker.onmessage = function (e) { onAI(e.data); };
      worker.onerror = function () { worker = null; };
    } catch (e) { worker = null; }
    return worker;
  }
  function requestAI() {
    app.thinking = true;
    var id = ++app.aiReq, fen = app.game.pos.fen(), t0 = Date.now();
    app.aiStart = t0;
    var w = getWorker();
    if (w) w.postMessage({ id: id, fen: fen, level: app.level, timeMs: 1500 });
    else setTimeout(function () {
      var m = E.think(new E.Position(fen), app.level, { timeMs: 900 });
      onAI({ id: id, move: m ? E.uci(m) : null });
    }, 60);
  }
  function maybeAI() {
    if (app.mode === 'ai' && !app.over && app.game.pos.turn !== app.human && !app.thinking) requestAI();
  }
  function onAI(d) {
    if (d.id !== app.aiReq || !app.thinking) return;
    var wait = Math.max(0, 550 - (Date.now() - app.aiStart));
    setTimeout(function () {
      if (d.id !== app.aiReq) return;
      if (app.busy) app.pendingAI = d; else applyAI(d);
    }, wait);
  }
  function applyAI(d) {
    if (d.id !== app.aiReq) return;
    app.thinking = false;
    var ms = app.game.legal(), m = null;
    for (var i = 0; i < ms.length; i++) if (E.uci(ms[i]) === d.move) m = ms[i];
    if (!m) m = E.think(app.game.pos, 'facil');
    if (m) doMove(m);
  }

  // ===== Botoes =====
  function undo() {
    if (app.busy || !hasHumanMove()) return;
    app.aiReq++; app.thinking = false; app.pendingAI = null;
    var g = app.game;
    if (app.mode === '2p') g.undo();
    else { var m; do { m = g.undo(); } while (m && (m.piece & 8) !== app.human); }
    app.over = null; app.sel = -1; app.dests = {};
    if (app.mode === '2p' && app.autoFlip) { app.orient = g.pos.turn; app.v.setOrient(app.orient, false); }
    app.v.sync(g.pos.board);
    refreshAll(); saveGame(); sfx('whoosh');
  }
  function newSame() {
    var human = app.human;
    if (app.mode === 'ai' && prefs.color === 'r') human = Math.random() < 0.5 ? 0 : 8;
    startGame({ mode: app.mode, level: app.level, human: human, autoFlip: app.autoFlip });
  }
  function flip() {
    if (!app.game) return;
    app.orient ^= 8; app.v.setOrient(app.orient, true); refreshPlayers(); sfx('whoosh'); saveGame();
  }

  // ===== Janelas =====
  function modal(title, text, btns) {
    $('mTitle').textContent = title; $('mText').textContent = text;
    var row = $('mBtns'); row.innerHTML = '';
    btns.forEach(function (b) {
      var e = document.createElement('button'); e.textContent = b.t; if (b.pri) e.className = 'pri';
      e.onclick = function () { $('modal').hidden = true; sfx('click'); if (b.fn) b.fn(); };
      row.appendChild(e);
    });
    $('modal').hidden = false;
  }
  function askPromotion(color, cb) {
    var grid = $('promoGrid'); grid.innerHTML = '';
    [[E.Q, 'Dama'], [E.R, 'Torre'], [E.B, 'Bispo'], [E.N, 'Cavalo']].forEach(function (o) {
      var b = document.createElement('button');
      b.innerHTML = XPieces.svg(o[0] | color) + '<span>' + o[1] + '</span>';
      b.onclick = function () { $('promo').hidden = true; cb(o[0]); };
      grid.appendChild(b);
    });
    $('promoCancel').onclick = function () { $('promo').hidden = true; cb(0); };
    $('promo').hidden = false;
  }
  var toastT;
  function toast(t) { var e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { e.hidden = true; }, 3200); }

  // ===== Telas =====
  function showScreen(s) {
    app.screen = s;
    $('menu').classList.toggle('show', s === 'menu');
    $('game').classList.toggle('show', s === 'game');
    if (app.view3d) app.view3d.setMenu(s === 'menu');
    if (s === 'menu') {
      showPanel('pMain'); updateContinue();
      var want3d = prefs.view === '3d' && app.view3d;
      document.body.classList.toggle('three', !!want3d);
      if (app.view3d) { app.view3d.setActive(!!want3d); if (app.game) app.view3d.sync(app.game.pos.board); else app.view3d.sync(new E.Position().board); app.view3d.highlight({}); }
    } else {
      requestAnimationFrame(function () { fit2d(); if (app.view3d) app.view3d.resize(); });
    }
  }
  function showPanel(id) { ['pMain', 'pAI', 'pTwo'].forEach(function (p) { $(p).hidden = p !== id; }); }
  function updateContinue() {
    var s = load(SAVE), b = $('bContinue');
    if (s && s.moves && s.moves.length) {
      b.hidden = false;
      $('contInfo').textContent = (s.mode === 'ai' ? 'Contra o computador (' + LEVEL_NAME[s.level] + ')' : '2 jogadores') + ', ' + Math.ceil(s.moves.length / 2) + ' lances';
    } else b.hidden = true;
  }
  function segInit(id, val, onChange) {
    var el = $(id);
    function mark(v) { [].forEach.call(el.children, function (b) { b.classList.toggle('on', b.dataset.v === v); }); }
    mark(val);
    el.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; mark(b.dataset.v); sfx('click'); onChange(b.dataset.v); });
    return mark;
  }
  var ICON_SOUND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/>';
  var ICON_MUSIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>';
  function soundUI() {
    var sOn = prefs.sound, mOn = prefs.music;
    var s = ICON_SOUND + (sOn ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>' : '<path d="M16 9l5 6M21 9l-5 6"/>') + '</svg>';
    var m = ICON_MUSIC + (mOn ? '' : '<path d="M3 3l18 18"/>') + '</svg>';
    $('gSound').innerHTML = s; $('gMusic').innerHTML = m;
    $('mSound').innerHTML = s + '<span>Som ' + (sOn ? 'ligado' : 'desligado') + '</span>';
    $('mMusic').innerHTML = m + '<span>Música ' + (mOn ? 'ligada' : 'desligada') + '</span>';
    ['gSound', 'mSound'].forEach(function (i) { $(i).classList.toggle('off', !sOn); });
    ['gMusic', 'mMusic'].forEach(function (i) { $(i).classList.toggle('off', !mOn); });
    XSound.setSfx(sOn); XSound.setMusic(mOn);
  }
  function toggleSound() { prefs.sound = !prefs.sound; savePrefs(); soundUI(); sfx('click'); }
  function toggleMusic() { prefs.music = !prefs.music; savePrefs(); soundUI(); }

  function aiHint(l) {
    $('aiHint').textContent = { facil: 'Para começar: o computador joga quase ao acaso.', medio: 'Um desafio equilibrado.', dificil: 'Pensa vários lances à frente. Boa sorte!' }[l];
  }

  function bind() {
    // audio so pode comecar depois de um toque
    var unlock = function () { XSound.init(); XSound.setMusic(prefs.music); };
    window.addEventListener('pointerdown', unlock, { once: false, passive: true });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target.closest('#board2d,#c3d')) e.preventDefault(); });

    $('bVsAI').onclick = function () { sfx('click'); showPanel('pAI'); };
    $('bTwo').onclick = function () { sfx('click'); showPanel('pTwo'); };
    [].forEach.call(document.querySelectorAll('[data-back]'), function (b) { b.onclick = function () { sfx('click'); showPanel('pMain'); }; });
    $('bContinue').onclick = function () {
      var s = load(SAVE); if (!s) return;
      startGame({ mode: s.mode, level: s.level, human: s.human, autoFlip: s.autoFlip, orient: s.orient, moves: s.moves });
    };
    segInit('segLevel', prefs.level, function (v) { prefs.level = v; savePrefs(); aiHint(v); }); aiHint(prefs.level);
    segInit('segColor', prefs.color, function (v) { prefs.color = v; savePrefs(); });
    segInit('segFlip', prefs.flip ? '1' : '0', function (v) { prefs.flip = v === '1'; savePrefs(); });
    var markView = segInit('segView', prefs.view, function (v) {
      prefs.view = v; savePrefs();
      if (v === '3d') init3d().then(function () { if (!app.view3d) { prefs.view = '2d'; markView('2d'); } showScreen('menu'); });
      else showScreen('menu');
    });
    if (!app.has3d) $('segView').hidden = true;
    $('bStartAI').onclick = function () {
      var c = prefs.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : prefs.color;
      startGame({ mode: 'ai', level: prefs.level, human: c === 'b' ? 8 : 0 });
    };
    $('bStart2').onclick = function () { startGame({ mode: '2p', autoFlip: prefs.flip }); };
    $('mSound').onclick = toggleSound; $('gSound').onclick = toggleSound;
    $('mMusic').onclick = toggleMusic; $('gMusic').onclick = toggleMusic;
    $('gMenu').onclick = function () { sfx('click'); saveGame(); app.aiReq++; app.thinking = false; app.pendingAI = null; showScreen('menu'); };
    $('cNew').onclick = function () {
      sfx('click');
      if (app.game && app.game.moves.length && !app.over) modal('Novo jogo?', 'A partida atual será perdida.', [{ t: 'Não' }, { t: 'Sim, começar', pri: true, fn: newSame }]);
      else newSame();
    };
    $('cUndo').onclick = undo;
    $('cFlip').onclick = flip;
    $('cView').onclick = function () {
      sfx('click');
      var next = prefs.view === '3d' ? '2d' : '3d';
      if (next === '3d') init3d().then(function (v) { if (!v) return; prefs.view = '3d'; savePrefs(); markView('3d'); useView('3d'); });
      else { prefs.view = '2d'; savePrefs(); markView('2d'); useView('2d'); }
    };
    window.addEventListener('resize', function () { fit2d(); });
  }

  function boot() {
    app.has3d = webglOK();
    app.view2d = new View2D($('board2d'), app);
    app.v = app.view2d;
    bind(); soundUI();
    showScreen('menu');
    if (prefs.view === '3d' && app.has3d) init3d().then(function () { showScreen('menu'); });
    else if (!app.has3d) prefs.view = '2d';
    // hooks para testes automatizados
    app._start = startGame;
  }
  boot();
})();
