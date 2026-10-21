/* XADREZAO - controle do jogo e telas */
(function () {
  'use strict';
  var E = XEngine, V = window.XV || '1';
  var $ = function (id) { return document.getElementById(id); };
  var SAVE = 'xadrezao.jogo.v1', PREFS = 'xadrezao.prefs.v1';
  var LEVEL_NAME = { iniciante: 'Iniciante', facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', mestre: 'Mestre' };
  var COLOR_NAME = { 0: 'brancas', 8: 'pretas' };

  var PHONE = Math.min(screen.width, screen.height) < 700;
  var prefs = load(PREFS) || {};
  prefs = { style: prefs.style || 'classico', env: prefs.env || 'sala', theme: prefs.theme || 'classico', clock: prefs.clock || '0', view: prefs.view || '3d', sound: prefs.sound !== false, music: prefs.music !== false, vibe: prefs.vibe !== false, learn: !!prefs.learn, level: prefs.level || 'medio', color: prefs.color || 'w', flip: prefs.flip !== false, cam: prefs.cam2 || 'auto', aid: !!prefs.aid2, camFx: prefs.camFx !== false };

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
    if (!app.game || app.mode === 'puzzle') return;
    store(SAVE, { learn: app.learn, mode: app.mode, level: app.level, human: app.human, autoFlip: app.autoFlip, orient: app.orient, moves: app.game.moves.map(E.uci), t: Date.now(), clock: app.clock ? { limit: app.clock.limit, left: app.clock.left } : null });
  }
  function sfx(n) { XSound.play(n); }
  var VIBE = { move: 12, capture: [22, 30, 14], check: [25, 60, 25], mate: [40, 70, 40, 70, 160], illegal: 8, select: 6, tap: 7, draw: [30, 80, 30] };
  function buzz(n) { if (!prefs.vibe || !navigator.vibrate) return; try { navigator.vibrate(VIBE[n] || 10); } catch (e) { } }
  function banner(title, sub) {
    var b = $('banner'); b.querySelector('b').textContent = title; b.querySelector('span').textContent = sub || '';
    b.hidden = false; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    clearTimeout(banner.t); banner.t = setTimeout(function () { b.hidden = true; }, 2600);
  }

  // ===== Visuais =====
  app.stageRect = function () {
    var r = $('stage').getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  // Retrato: o palco fica so do tamanho que o tabuleiro precisa e a sobra vai para cima,
  // assim jogadores, status e botoes ficam colados no tabuleiro.
  function layoutGame() {
    var g = $('game'), st = $('stage'), sp = $('gSpace');
    if (!g.classList.contains('show')) return;
    st.style.flex = ''; st.style.height = ''; sp.style.flexGrow = '0';
    var r = st.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    var need = (app.v && app.v === app.view3d) ? app.view3d.fitLayout(r.width, r.height) + 6 : Math.min(r.width, r.height);
    if (need < r.height - 4) { st.style.flex = '0 0 auto'; st.style.height = need + 'px'; sp.style.flexGrow = '1'; }
    var r2 = st.getBoundingClientRect();
    var s = Math.floor(Math.min(r2.width - 14, r2.height - 14));
    $('board2d').style.width = s + 'px'; $('board2d').style.height = s + 'px';
    if (app.view3d) app.view3d.resize();
  }
  var layoutQ = 0;
  function fit2d() { layoutGame(); }
  function queueLayout() { if (layoutQ) return; layoutQ = requestAnimationFrame(function () { layoutQ = 0; layoutGame(); }); }
  app.layout = layoutGame;
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
        window.addEventListener('resize', function () { app.view3d.resize(); queueLayout(); });
      } catch (e) { console.warn(e); app.has3d = false; toast('Seu aparelho não conseguiu abrir o 3D. Usando o visual 2D.'); }
      $('loading').hidden = true;
      return app.view3d;
    }).catch(function (e) { console.warn(e); app.has3d = false; $('loading').hidden = true; return null; });
  }
  function webglOK() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }

  // ===== Partida =====
  function isHumanTurn() { return app.mode === '2p' || (app.game.pos.turn === app.human && !(app.mode === 'puzzle' && app.pz && app.pz.lock)); }
  function startGame(opts) {
    app.recorded = false; app.t0 = Date.now();
    app.learn = !!opts.learn && opts.mode === 'ai'; app.gameId = (app.gameId || 0) + 1; app.coach = { before: null, lastAI: null };
    app.mode = opts.mode; app.level = opts.level || 'medio'; app.human = opts.human || 0; app.autoFlip = !!opts.autoFlip;
    app.game = new E.Game(opts.fen);
    var moves = opts.moves || [];
    for (var i = 0; i < moves.length; i++) if (!app.game.playUci(moves[i])) break;
    app.orient = opts.orient != null ? opts.orient : (app.mode === 'ai' ? app.human : 0);
    if (app.mode === '2p' && app.autoFlip) app.orient = app.game.pos.turn;
    app.sel = -1; app.dests = {}; app.over = null; app.busy = false; app.thinking = false; app.aiReq++; app.hintMove = null; app.hintReq = 0;
    app.clock = opts.clock && opts.clock.limit ? { limit: opts.clock.limit, left: { 0: opts.clock.left ? opts.clock.left[0] : opts.clock.limit, 8: opts.clock.left ? opts.clock.left[8] : opts.clock.limit } } : null;
    lastTick = 0;
    if (app.view3d) { app.view3d.cam.target = null; app.view3d._fitKey = null; }
    $('banner').hidden = true; clearTimeout(app.overT);
    showScreen('game');
    useView(prefs.view);
    if (app.v === app.view3d) app.view3d.intro(!!moves.length || opts.mode === 'puzzle');
    refreshAll();
    saveGame();
    if (!moves.length) sfx('start');
    puzzleUI();
    var st = app.game.status();
    if (st.over) app.over = st;
    else maybeAI();
    coachInit(!!moves.length);
  }

  // ===== Professor (Modo Aprender) =====
  function coachSay(kind, text) {
    var el = $('coach'); el.className = kind || ''; void el.offsetWidth; el.classList.add('pop');
    $('coachText').textContent = text;
  }
  function coachInit(resumed) {
    $('coach').hidden = !app.learn;
    $('coachWhy').hidden = true;
    if (!app.learn) return;
    coachSay('', resumed ? 'Bem-vindo de volta! Continuo comentando os seus lances.' : 'Olá! Sou o professor. Depois de cada lance seu eu comento. Toque em "Por quê?" para entender o lance do computador.');
    coachBefore();
  }
  // analisa a posicao quando e a vez do jogador (para comparar com o lance que ele fizer)
  function coachBefore() {
    if (!app.learn || app.over || app.game.pos.turn !== app.human) return;
    var ply = app.game.moves.length, gid = app.gameId;
    analyseAsync(app.game.startFen, app.game.moves.map(E.uci), 700, function (r) {
      if (gid !== app.gameId) return;
      app.coach.before = { ply: ply, score: r.score, move: r.move };
    });
  }
  function coachAfterHuman(fenBefore, m, ply) {
    var gid = app.gameId, u = E.uci(m);
    analyseAsync(app.game.startFen, app.game.moves.map(E.uci), 700, function (r) {
      if (gid !== app.gameId) return;
      var b = app.coach.before && app.coach.before.ply === ply ? app.coach.before : null;
      var c = XLearn.comment({ fenBefore: fenBefore, move: u, before: b, after: r.score == null ? null : -r.score });
      if (c) { coachSay(c.kind, c.text); if (c.kind === 'bad') buzz('illegal'); }
      app.coach.lastText = c && c.text;
    });
  }
  function coachWhy() {
    var a = app.coach && app.coach.lastAI; if (!a) return;
    sfx('click');
    var el = $('coach');
    if (el.classList.contains('why') && app.coach.lastText) { coachSay(app.coach.lastKind || 'ok', app.coach.lastText); $('coachWhy').textContent = 'Por quê?'; return; }
    app.coach.lastKind = [].filter.call(el.classList, function (k) { return k !== 'pop'; })[0];
    app.coach.lastText = $('coachText').textContent;
    coachSay('why', 'O computador jogou ' + a.san + '. ' + XLearn.why(a));
    $('coachWhy').textContent = 'Voltar';
  }

  function lastMove() { var m = app.game.moves; return m.length ? m[m.length - 1] : null; }
  function getStatus() { return (app.over && (app.over.reason === 'time' || app.over.reason === 'timedraw')) ? app.over : app.game.status(); }
  function refreshHL() {
    var lm = lastMove(), st = getStatus();
    var check = st.check ? app.game.pos.kings[app.game.pos.turn >> 3] : -1;
    app.v.highlight({ sel: app.sel, dests: app.dests, last: lm ? { from: lm.from, to: lm.to } : null, check: check, hint: app.hintMove });
  }
  function refreshAll() {
    refreshHL(); refreshStatus(); refreshPlayers(); refreshButtons(); refreshHist();
  }
  function statusText(st) {
    var g = app.game, turn = g.pos.turn;
    if (app.mode === 'puzzle') return app.pz ? app.pz.msg : '';
    if (st.over) {
      if (st.reason === 'time') {
        if (app.mode === 'ai') return st.winner === app.human ? 'O tempo do computador acabou. Você venceu!' : 'Seu tempo acabou. O computador venceu';
        return 'Tempo esgotado! ' + (st.winner === 0 ? 'Brancas' : 'Pretas') + ' venceram';
      }
      if (st.reason === 'mate') {
        if (app.mode === 'ai') return st.winner === app.human ? 'Xeque-mate! Você venceu!' : 'Xeque-mate! O computador venceu';
        return 'Xeque-mate! ' + (st.winner === 0 ? 'Brancas' : 'Pretas') + ' venceram';
      }
      return {
        stalemate: 'Empate por afogamento', fifty: 'Empate pela regra dos 50 lances',
        repetition: 'Empate por repetição (3 vezes)', material: 'Empate: peças insuficientes para mate', timedraw: 'Empate: o tempo acabou, mas não havia peças para mate'
      }[st.reason];
    }
    var who;
    if (app.mode === 'ai') who = turn === app.human ? 'Sua vez' : 'Computador pensando...';
    else who = 'Vez das ' + COLOR_NAME[turn];
    return st.check ? 'Xeque! ' + who : who;
  }
  function refreshStatus() {
    var st = getStatus(), el = $('status');
    if (app.hintText && !st.over) { el.textContent = app.hintText; el.className = 'hint'; return; }
    el.textContent = statusText(st);
    el.className = st.over ? 'over' : (st.check ? 'check' : '');    musicMood(st);
  }
  // musica adaptativa: mais tensa em xeque, com o relogio no fim ou no final da partida
  function musicMood(st) {
    if (!window.XSound || !XSound.setTension) return;
    var t = 0;
    if (app.screen === 'game' && app.game && !st.over) {
      var b = app.game.pos.board, n = 0;
      for (var sq = 0; sq < 120; sq++) { if (sq & 0x88) { sq += 7; continue; } if (b[sq]) n++; }
      if (st.check) t = 1;
      else if (app.clock && app.clock.left[app.game.pos.turn] < 30000) t = 0.8;
      else if (n <= 10) t = 0.35;
    }
    XSound.setTension(t);
  }
  function refreshPlayers() {
    var g = app.game, bottomColor = app.orient, topColor = bottomColor ^ 8;
    var taken = { 0: [], 8: [] }, mat = { 0: 0, 8: 0 }, VALS = [0, 1, 3, 3, 5, 9, 0];
    g.moves.forEach(function (m) { if (m.cap) taken[m.piece & 8].push(m.cap); if (m.promo) mat[m.piece & 8] += VALS[m.promo] - 1; });
    [0, 8].forEach(function (c) { taken[c].forEach(function (p) { mat[c] += VALS[p & 7]; }); });
    function name(c) {
      if (app.mode === 'puzzle') return c === app.human ? 'Você (' + COLOR_NAME[c] + ')' : 'Desafio ' + app.pz.num + ': mate em ' + app.pz.p.n;
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
  function refreshHist() {
    var h = $('hist'), sans = app.game.sans, out = '';
    for (var i = 0; i < sans.length; i++) {
      if (i % 2 === 0) out += '<span class="n">' + (i / 2 + 1) + '.</span>';
      out += '<span class="mv' + (i === sans.length - 1 ? ' cur' : '') + '">' + sans[i] + '</span>';
    }
    h.innerHTML = out;
    h.scrollLeft = h.scrollWidth;
  }
  function fmt(ms) { ms = Math.max(0, ms); var s = Math.ceil(ms / 1000); if (ms < 10000) return (ms / 1000).toFixed(1); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function refreshClocks() {
    [['plTop', app.orient ^ 8], ['plBot', app.orient]].forEach(function (a) {
      var el = $(a[0]).querySelector('.clk');
      if (!app.clock) { el.textContent = ''; return; }
      var left = app.clock.left[a[1]];
      el.textContent = fmt(left); el.classList.toggle('low', left < 20000 && !app.over);
    });
  }
  var lastTick = 0;
  function tick() {
    var t = Date.now(), dt = lastTick ? t - lastTick : 0; lastTick = t;
    if (!app.clock || !app.game || app.over || app.screen !== 'game' || document.hidden || !app.game.moves.length) return;
    var c = app.game.pos.turn;
    app.clock.left[c] -= Math.min(dt, 1000);
    if (app.clock.left[c] <= 0) {
      app.clock.left[c] = 0;
      app.aiReq++; app.thinking = false; app.pendingAI = null;
      var w = c ^ 8, pos = app.game.pos, onlyMinor = true, n = 0;
      for (var sq = 0; sq < 120; sq++) { if (sq & 0x88) { sq += 7; continue; } var p = pos.board[sq]; if (p && (p & 8) === w && (p & 7) !== E.K) { n++; if ((p & 7) !== E.N && (p & 7) !== E.B) onlyMinor = false; } }
      var st = (n === 0 || (n === 1 && onlyMinor)) ? { over: true, reason: 'timedraw', winner: -1 } : { over: true, reason: 'time', winner: w };
      refreshClocks(); refreshStatus();
      gameOver(st);
      saveGame();
      return;
    }
    refreshClocks();
    if (t % 5000 < 250) saveGame();
  }
  setInterval(tick, 100);
  // ===== Dica =====
  function hint() {
    if (!app.game || app.over || app.busy || !isHumanTurn()) return;
    if (app.mode === 'puzzle') { puzzleHint(); return; }
    sfx('click');
    var id = ++app.hintReq, fen = app.game.pos.fen(), mvCount = app.game.moves.length;
    app.hintText = 'Pensando numa dica...'; refreshStatus();
    var done = function (u) {
      if (id !== app.hintReq || app.game.moves.length !== mvCount) return;
      var ms = app.game.legal(), m = null;
      for (var i = 0; i < ms.length; i++) if (E.uci(ms[i]) === u) m = ms[i];
      if (!m) { app.hintText = null; refreshStatus(); return; }
      app.hintMove = { from: m.from, to: m.to };
      app.hintText = 'Dica: ' + XPieces.names[m.piece & 7] + ' para ' + E.sqName(m.to);
      select(m.from);
      refreshStatus(); sfx('promote'); buzz('select');
    };
    var w = getWorker();
    if (w) { hintCb[id] = done; w.postMessage({ id: id, hint: true, start: app.game.startFen, moves: app.game.moves.map(E.uci), level: 'dificil', timeMs: 1000 }); }
    else setTimeout(function () { var m = E.think(new E.Position(fen), 'dificil', { timeMs: 600 }); done(m ? E.uci(m) : null); }, 50);
  }
  var hintCb = {};
  function clearHint() { app.hintMove = null; app.hintText = null; app.hintReq++; }
  function hasHumanMove() {
    var g = app.game;
    if (app.mode === '2p') return g.moves.length > 0;
    return g.moves.some(function (m) { return (m.piece & 8) === app.human; });
  }
  function refreshButtons() { $('cUndo').disabled = app.mode === 'puzzle' ? false : !hasHumanMove(); $('cHint').disabled = !!app.over; refreshClocks(); }

  app.clearSel = function () { app.sel = -1; app.dests = {}; if (app.hintMove) { clearHint(); refreshStatus(); } refreshHL(); };
  function select(sq) {
    app.sel = sq; app.dests = {};
    app.game.legal().forEach(function (m) { if (m.from === sq) app.dests[m.to] = (m.cap ? 2 : 1); });
    refreshHL();
    sfx('select'); buzz('select');
  }
  app.onSquare = function (sq) {
    if (app.busy || app.over || !app.game || !isHumanTurn()) return;
    var p = app.game.pos.board[sq], turn = app.game.pos.turn;
    if (app.sel >= 0 && app.dests[sq]) { app.tryMove(app.sel, sq); return; }
    if (sq === app.sel) { app.clearSel(); return; }
    if (p && (p & 8) === turn) { select(sq); return; }
    if (app.sel >= 0) { sfx('illegal'); buzz('illegal'); }
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
    if (st.check) { sfx('check'); buzz('check'); }
    else if (m.promo) { sfx('promote'); sfx(m.cap ? 'capture' : 'move'); buzz('capture'); }
    else if (m.flags & E.F_CASTLE) { sfx('castle'); buzz('move'); }
    else if (m.cap) { sfx('capture'); buzz('capture'); }
    else { sfx('move'); buzz('move'); }
  }
  function doMove(m, opts) {
    clearHint();
    var learnHuman = app.learn && (m.piece & 8) === app.human, fenB = app.game.pos.fen(), plyB = app.game.moves.length;
    var sanB = app.game.sans.length;
    app.game.play(m);
    if (window.XStats && (app.mode === '2p' || (app.mode === 'ai' && (m.piece & 8) === app.human))) XStats.onMove(m, E);
    if (learnHuman) { $('coachWhy').hidden = true; $('coachWhy').textContent = 'Por quê?'; coachAfterHuman(fenB, m, plyB); }
    else if (app.learn && app.coach.pendingAI) { var pa = app.coach.pendingAI; app.coach.pendingAI = null; pa.san = app.game.sans[sanB]; app.coach.lastAI = pa; $('coachWhy').hidden = false; $('coachWhy').textContent = 'Por quê?'; }
    app.sel = -1; app.dests = {};
    app.busy = true;
    var st = app.game.status();
    refreshStatus(); refreshPlayers(); refreshButtons(); refreshHist();
    refreshHL();
    saveGame();
    var willAI = !st.over && app.mode === 'ai' && app.game.pos.turn !== app.human;
    if (willAI) requestAI();
    return app.v.animate(m, app.game.pos.board, opts || {}).then(function () {
      app.busy = false;
      moveSound(m, st);
      refreshHL();
      if (app.mode === 'puzzle') { puzzleStep(m, st); return; }
      if (st.over) { gameOver(st); return; }
      if (app.mode === '2p' && app.autoFlip) { app.orient = app.game.pos.turn; app.v.setOrient(app.orient, true); refreshPlayers(); if (app.v === app.view3d) sfx('whoosh'); }
      if (app.pendingAI) { var pm = app.pendingAI; app.pendingAI = null; applyAI(pm); }
      if (app.learn && !app.thinking && app.game.pos.turn === app.human) coachBefore();
    });
  }
  function gameOver(st) {
    app.over = st;
    if (!app.recorded && window.XStats && app.mode !== 'puzzle') {
      app.recorded = true;
      var lmv = lastMove(), res = st.winner === -1 ? 'draw' : (app.mode === 'ai' ? (st.winner === app.human ? 'win' : 'loss') : 'win');
      XStats.onGameEnd({ mode: app.mode, level: app.level, result: res, learn: app.learn, plies: app.game.moves.length,
        mateType: st.reason === 'mate' && lmv && (app.mode === '2p' || (lmv.piece & 8) === app.human) ? (lmv.piece & 7) : 0 });
    }
    clearHint(); refreshStatus(); refreshButtons();
    refreshPlayers();
    var g = app.game;
    var loserKing = st.reason === 'mate' ? g.pos.kings[(st.winner ^ 8) >> 3] : -1;
    if (st.reason === 'mate' || st.reason === 'time') { sfx(app.mode === 'ai' && st.winner !== app.human ? 'lose' : 'mate'); buzz('mate'); }
    else { sfx('draw'); buzz('draw'); }
    var sub = statusText(st).replace('Xeque-mate! ', '').replace('Tempo esgotado! ', '').replace(/^Empate (por |pela |: )?/, '');
    var big = st.reason === 'mate' ? 'XEQUE-MATE' : st.reason === 'time' ? 'TEMPO!' : 'EMPATE';
    setTimeout(function () { if (app.over === st) banner(big, sub.charAt(0).toUpperCase() + sub.slice(1)); }, st.reason === 'mate' ? 700 : 200);
    app.v.celebrate({ reason: st.reason, winner: st.winner, kingSq: loserKing });
    clearTimeout(app.overT);
    app.overT = setTimeout(function () {
      if (app.over !== st) return;
      var title = st.reason === 'mate' ? 'Xeque-mate!' : st.reason === 'time' ? 'Tempo esgotado!' : 'Empate!';
      var text = statusText(st).replace('Xeque-mate! ', '').replace('Tempo esgotado! ', '');
      if (st.reason === 'mate' || (st.reason === 'time' && app.mode !== 'ai')) text = app.mode === 'ai' ? (st.winner === app.human ? 'Parabéns, você venceu o computador!' : 'O computador venceu desta vez. Tente de novo!') : text + '!';
      modal(title, text, [{ t: 'Ver tabuleiro' }, { t: app.mode === 'ai' ? 'Jogar de novo' : 'Novo jogo', pri: true, fn: function () { newSame(); } }], resultExtra(st));
    }, st.reason === 'mate' ? 3300 : 2000);
  }

  // Tela de resultado: emblema, numeros da partida e placar no nivel
  var ICONS = {
    win: '<svg viewBox="0 0 64 64"><path d="M18 8h28v14a14 14 0 0 1-28 0z"/><path d="M18 12H9v4a10 10 0 0 0 10 10M46 12h9v4a10 10 0 0 1-10 10"/><path d="M32 36v10M22 56h20M25 56l2-10h10l2 10"/></svg>',
    loss: '<svg viewBox="0 0 64 64"><path d="M24 54h16M27 54l1-8h8l1 8"/><path d="M22 46h20l-3-9H25z"/><path d="M26 37c-4-4-5-9-4-14 2-6 6-9 10-9s8 3 10 9c1 5 0 10-4 14"/><path d="M32 4v8M28 8h8"/><path d="M14 44l36-24" stroke-dasharray="3 4"/></svg>',
    draw: '<svg viewBox="0 0 64 64"><path d="M8 30l10-10 10 6 8-6 8 6 12-6"/><path d="M14 26l12 14c2 2 5 2 7 0l3-3M28 26l12 12c2 2 5 2 6 0 2-2 1-4 0-5"/><path d="M8 30l6 6M56 26l-6 12"/></svg>'
  };
  function fmtTime(ms) { var s = Math.max(0, Math.round(ms / 1000)), m = Math.floor(s / 60); s %= 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function resultExtra(st) {
    var g = app.game, kind = st.winner === -1 ? 'draw' : (app.mode === 'ai' ? (st.winner === app.human ? 'win' : 'loss') : 'win');
    var caps = { 0: 0, 8: 0 }; g.moves.forEach(function (m) { if (m.cap) caps[m.piece & 8]++; });
    var me = app.mode === 'ai' ? app.human : 0, other = me ^ 8;
    var cells = [['Lances', Math.ceil(g.moves.length / 2)], [app.mode === 'ai' ? 'Você capturou' : 'Brancas capturaram', caps[me]],
      [app.mode === 'ai' ? 'Computador capturou' : 'Pretas capturaram', caps[other]], ['Tempo', fmtTime(Date.now() - (app.t0 || Date.now()))]];
    var html = '<div class="rgrid">' + cells.map(function (c) { return '<div><b>' + c[1] + '</b><span>' + c[0] + '</span></div>'; }).join('') + '</div>';
    if (app.mode === 'ai' && window.XStats) {
      var S = XStats.data(), L = S.levels[app.level] || { w: 0, l: 0, d: 0 };
      html += '<div class="rrec"><span>Seu placar no ' + LEVEL_NAME[app.level] + '</span><b class="w">' + L.w + ' V</b><b class="d">' + L.d + ' E</b><b class="l">' + L.l + ' D</b></div>';
      if (S.streak >= 2) html += '<div class="rstreak">' + S.streak + ' vitórias seguidas!</div>';
    }
    return { kind: kind, icon: ICONS[kind], html: html };
  }

  // ===== Computador =====
  var worker = null, anaCb = {}, anaId = 0;
  // Pede uma avaliacao ao worker (Modo Aprender)
  function analyseAsync(start, moves, timeMs, cb) {
    var w = getWorker(), id = ++anaId;
    if (w) { anaCb[id] = cb; w.postMessage({ id: id, type: 'analyse', start: start, moves: moves, timeMs: timeMs }); }
    else setTimeout(function () { var g = new E.Game(start); moves.forEach(function (u) { g.playUci(u); }); var r = E.analyse(g.pos, { timeMs: Math.min(timeMs, 300) }); cb({ move: r.move ? E.uci(r.move) : null, score: r.score }); }, 30);
  }
  function getWorker() {
    if (worker) return worker;
    try {
      worker = new Worker('js/ai-worker.js?v=' + V);
      worker.onmessage = function (e) { if (e.data.type === 'analyse') { var ac = anaCb[e.data.id]; delete anaCb[e.data.id]; if (ac) ac(e.data); return; } if (e.data.hint) { var cb = hintCb[e.data.id]; delete hintCb[e.data.id]; if (cb) cb(e.data.move); return; } onAI(e.data); };
      worker.onerror = function () { worker = null; };
    } catch (e) { worker = null; }
    return worker;
  }
  function requestAI() {
    app.thinking = true;
    var id = ++app.aiReq, fen = app.game.pos.fen(), t0 = Date.now();
    app.aiStart = t0;
    var w = getWorker();
    if (w) w.postMessage({ id: id, start: app.game.startFen, moves: app.game.moves.map(E.uci), level: app.level });
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
    if (m && app.learn) app.coach.pendingAI = { fenBefore: app.game.pos.fen(), move: E.uci(m), score: d.score, book: d.book };
    if (m) doMove(m);
  }

  // ===== Desafios =====
  var PZ = 'xadrezao.desafios.v1';
  var pzProg = load(PZ) || {};
  var GROUPS = [['facil', 'Fácil', 'Mate em 1 lance'], ['medio', 'Médio', 'Mate em 1 lance, mais peças'], ['dificil', 'Difícil', 'Mate em 2 lances'], ['mestre', 'Mestre', 'Mate em 2, o primeiro lance é silencioso']];
  function starsHtml(n, max) { var o = ''; for (var i = 0; i < (max || 3); i++) o += '<i class="' + (i < n ? 'on' : '') + '">★</i>'; return o; }
  function buildPuzzleList() {
    var list = window.XPuzzles || [], el = $('pzList'), total = 0, solved = 0, html = '';
    list.forEach(function (p) { var st = pzProg[p.id] || 0; total += st; if (st) solved++; });
    $('pzSum').innerHTML = '<b>' + solved + '</b> de ' + list.length + ' resolvidos <span class="stars">' + starsHtml(1, 1) + ' ' + total + ' de ' + list.length * 3 + '</span>';
    GROUPS.forEach(function (g) {
      var items = list.map(function (p, i) { return { p: p, i: i }; }).filter(function (o) { return o.p.g === g[0]; });
      if (!items.length) return;
      var done = items.filter(function (o) { return pzProg[o.p.id]; }).length;
      html += '<div class="pzg"><h4>' + g[1] + ' <small>' + g[2] + '</small><span>' + done + '/' + items.length + '</span></h4><div class="pzgrid">';
      items.forEach(function (o, k) {
        var st = pzProg[o.p.id] || 0;
        html += '<button data-i="' + o.i + '" class="' + (st ? 'done' : '') + '"><b>' + (k + 1) + '</b><span class="stars">' + starsHtml(st) + '</span></button>';
      });
      html += '</div></div>';
    });
    el.innerHTML = html;
  }
  function startPuzzle(idx) {
    var list = window.XPuzzles || [], p = list[idx]; if (!p) return;
    var grp = list.filter(function (q) { return q.g === p.g; });
    var turn = p.fen.split(' ')[1] === 'b' ? 8 : 0;
    app.pz = { idx: idx, p: p, num: grp.indexOf(p) + 1, mistakes: 0, hints: 0, lock: false, solved: false,
      msg: (turn ? 'Pretas' : 'Brancas') + ' jogam e dão mate em ' + p.n + (p.n > 1 ? ' lances' : ' lance') };
    startGame({ mode: 'puzzle', fen: p.fen, human: turn, orient: turn });
  }
  function puzzleUI() {
    var pzm = app.mode === 'puzzle';
    $('cNew').querySelector('span').textContent = pzm ? 'Lista' : 'Novo';
    $('cUndo').querySelector('span').textContent = pzm ? 'Recomeçar' : 'Desfazer';
    $('gMenu').querySelector('span').textContent = pzm ? 'Desafios' : 'Menu';
  }
  function pzSay(msg, cls) { app.pz.msg = msg; refreshStatus(); if (cls) $('status').className = cls; }
  function puzzleStep(m, st) {
    var pz = app.pz, g = app.game, ply = g.moves.length;
    if ((m.piece & 8) !== app.human) return; // resposta do computador
    var ok = ply === 1 ? (E.uci(m) === pz.p.sol || (st.over && st.reason === 'mate')) : (st.over && st.reason === 'mate');
    if (!ok) {
      pz.mistakes++; pz.lock = true;
      pzSay('Não é esse lance. Tente de novo!', 'check'); sfx('illegal'); buzz('illegal');
      setTimeout(function () {
        if (app.pz !== pz) return;
        g.undo(); app.over = null; app.v.sync(g.pos.board); pz.lock = false;
        pzSay(pz.msg0 || ((app.human ? 'Pretas' : 'Brancas') + ' jogam e dão mate em ' + pz.p.n + (pz.p.n > 1 ? ' lances' : ' lance')));
        refreshAll();
      }, 1100);
      return;
    }
    if (st.over && st.reason === 'mate') {
      pz.solved = true;
      var stars = pz.mistakes + pz.hints === 0 ? 3 : pz.mistakes + pz.hints <= 1 ? 2 : 1;
      var prev = pzProg[pz.p.id] || 0;
      if (stars > prev) { pzProg[pz.p.id] = stars; store(PZ, pzProg); }
      app.over = st;
      pzSay('Xeque-mate! Desafio resolvido!', 'over');
      app.v.celebrate({ reason: 'mate', winner: app.human, kingSq: g.pos.kings[(app.human ^ 8) >> 3] });
      sfx('mate'); buzz('mate');
      setTimeout(function () { banner('RESOLVIDO!', stars === 3 ? 'Perfeito, de primeira!' : stars === 2 ? 'Muito bem!' : 'Conseguiu!'); }, 500);
      if (window.XStats) XStats.onPuzzle(pz.p, stars, m, pzProg, (window.XPuzzles || []).length);
      clearTimeout(app.overT);
      app.overT = setTimeout(function () {
        if (app.pz !== pz) return;
        var next = (window.XPuzzles || [])[pz.idx + 1];
        modalHtml('Desafio resolvido!', '<span class="stars bigstars">' + starsHtml(stars) + '</span>' + (stars < 3 ? 'Resolva sem errar e sem dica para ganhar 3 estrelas.' : 'Três estrelas!'),
          [{ t: 'Lista', fn: function () { showScreen('puzzles'); } }].concat(next ? [{ t: 'Próximo', pri: true, fn: function () { startPuzzle(pz.idx + 1); } }] : []));
      }, 2600);
      return;
    }
    // primeiro lance certo do mate em 2: o computador defende
    pz.lock = true;
    pzSay('Isso! Agora o computador responde...', 'hint');
    setTimeout(function () {
      if (app.pz !== pz) return;
      var r = E.analyse(g.pos, { maxDepth: 3, timeMs: 300 });
      pz.lock = false;
      pz.msg0 = 'Agora dê o xeque-mate!';
      if (r.move) { doMove(r.move).then(function () { if (app.pz === pz) pzSay('Agora dê o xeque-mate!', 'hint'); }); }
    }, 700);
  }
  function puzzleHint() {
    var pz = app.pz, g = app.game; sfx('click');
    var target = null;
    if (g.moves.length === 0) target = pz.p.sol;
    else { var ms = E.mateSolutions(g.pos, 1); if (ms.length) target = E.uci(ms[0]); }
    if (!target) return;
    var f = E.sqFromName(target.slice(0, 2)), t = E.sqFromName(target.slice(2, 4));
    pz.hints++;
    if (pz.hintStage !== g.moves.length + ':1') {
      pz.hintStage = g.moves.length + ':1';
      app.hintMove = { from: f, to: -1 }; select(f);
      app.hintText = 'Dica: use ' + (XPieces.names[g.pos.board[f] & 7] || '').toLowerCase() + ' de ' + target.slice(0, 2);
    } else {
      app.hintMove = { from: f, to: t }; select(f);
      app.hintText = 'Dica: ' + (XPieces.names[g.pos.board[f] & 7] || '') + ' para ' + target.slice(2, 4);
    }
    refreshHL(); refreshStatus(); buzz('select');
  }
  function modalHtml(title, html, btns) { modal(title, '', btns); $('mText').innerHTML = html; }

  // ===== Botoes =====
  function undo() {
    if (app.mode === 'puzzle') { if (!app.busy) startPuzzle(app.pz.idx); return; }
    if (app.busy || !hasHumanMove()) return;
    app.aiReq++; app.thinking = false; app.pendingAI = null; clearHint();
    var g = app.game;
    if (app.mode === '2p') g.undo();
    else { var m; do { m = g.undo(); } while (m && (m.piece & 8) !== app.human); }
    app.over = null; app.sel = -1; app.dests = {};
    if (app.mode === '2p' && app.autoFlip) { app.orient = g.pos.turn; app.v.setOrient(app.orient, false); }
    if (app.v.resetView) app.v.resetView();
    app.v.sync(g.pos.board);
    refreshAll(); saveGame(); sfx('whoosh');
    if (app.learn) { app.gameId++; app.coach = { before: null, lastAI: null }; $('coachWhy').hidden = true; coachSay('', 'Lance desfeito. Tente outra ideia!'); coachBefore(); }
  }
  function newSame() {
    var human = app.human;
    if (app.mode === 'ai' && prefs.color === 'r') human = Math.random() < 0.5 ? 0 : 8;
    startGame({ learn: app.learn, mode: app.mode, level: app.level, human: human, autoFlip: app.autoFlip, clock: app.clock ? { limit: app.clock.limit } : null });
  }
  function flip() {
    if (!app.game) return;
    app.orient ^= 8; app.v.setOrient(app.orient, true); refreshPlayers(); sfx('whoosh'); saveGame();
  }

  // ===== Janelas =====
  function modal(title, text, btns, extra) {
    $('mTitle').textContent = title; $('mText').textContent = text;
    var card = $('modal').querySelector('.card');
    card.className = 'card' + (extra && extra.kind ? ' res ' + extra.kind : '');
    $('mIcon').hidden = !(extra && extra.icon); $('mIcon').innerHTML = extra && extra.icon || '';
    $('mExtra').hidden = !(extra && extra.html); $('mExtra').innerHTML = extra && extra.html || '';
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
    if (s !== 'game' && window.XSound && XSound.setTension) XSound.setTension(0);
    [].forEach.call(document.querySelectorAll('.screen'), function (el) { el.classList.toggle('show', el.id === s); });
    if (s === 'puzzles') buildPuzzleList();
    if (s === 'achv') XStats.render($('achList'), pzProg, (window.XPuzzles || []).length);
    if (s === 'menu') { var cn = XStats.count(); $('tAchvN').textContent = cn.got + '/' + cn.total; }
    if (s === 'guide') { if (app.stopGuide) app.stopGuide(); app.stopGuide = XLearn.buildGuide($('guideList')); }
    if (app.view3d) app.view3d.setMenu(s === 'menu');
    if (s === 'menu') {
      showPanel('pMain'); updateContinue();
      var want3d = prefs.view === '3d' && app.view3d;
      document.body.classList.toggle('three', !!want3d);
      if (app.view3d) { app.view3d.setActive(!!want3d); if (app.game) app.view3d.sync(app.game.pos.board); else app.view3d.sync(new E.Position().board); app.view3d.highlight({}); }
    } else if (s !== 'game') {
      if (app.view3d) app.view3d.setActive(false);
    } else if (s === 'game') {
      requestAnimationFrame(function () { fit2d(); if (app.view3d) app.view3d.resize(); });
    }
  }
  function showPanel(id) { ['pMain', 'pAI', 'pTwo', 'pSettings'].forEach(function (p) { var e = $(p); e.hidden = p !== id; if (p === id) { e.classList.remove('enter'); void e.offsetWidth; e.classList.add('enter'); } }); }
  // botoes com resposta: onda no toque e vibracao curta
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.controls button, .tile, .card .row button, .seg button, .tog, .big, .camBtn, .pzgrid button, #coachWhy');
    if (!b || b.disabled) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, s = document.createElement('span');
    s.className = 'rip'; s.style.width = s.style.height = d + 'px'; s.style.left = (e.clientX - r.left - d / 2) + 'px'; s.style.top = (e.clientY - r.top - d / 2) + 'px';
    b.classList.add('riph'); b.appendChild(s); setTimeout(function () { s.remove(); }, 600);
    if (b.closest('.controls')) buzz('tap');
  }, { passive: true });
  function updateContinue() {
    var s = load(SAVE), b = $('bContinue');
    if (s && s.moves && s.moves.length) {
      b.hidden = false;
      $('contInfo').textContent = (s.mode === 'ai' ? 'Contra o computador (' + (LEVEL_NAME[s.level] || '') + (s.learn ? ', aprendendo' : '') + ')' : '2 jogadores') + ', ' + Math.ceil(s.moves.length / 2) + ' lances';
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
    $('mSound').innerHTML = s + '<span>Som</span>';
    $('mMusic').innerHTML = m + '<span>Música</span>';
    ['gSound', 'mSound'].forEach(function (i) { $(i).classList.toggle('off', !sOn); });
    ['gMusic', 'mMusic'].forEach(function (i) { $(i).classList.toggle('off', !mOn); });
    XSound.setSfx(sOn); XSound.setMusic(mOn);
  }
  var CAM_NAME = { auto: 'Normal', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  function camUI() { $('camBtnL').textContent = 'Vista: ' + CAM_NAME[prefs.cam]; }
  function toggleSound() { prefs.sound = !prefs.sound; savePrefs(); soundUI(); sfx('click'); }
  var ICON_VIBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="3" width="8" height="18" rx="2"/>';
  function vibeUI() {
    var on = prefs.vibe, ic = ICON_VIBE + (on ? '<path d="M4 8v8M20 8v8"/>' : '<path d="M3 3l18 18"/>') + '</svg>';
    $('gVibe').innerHTML = ic; $('mVibe').innerHTML = ic + '<span>Vibrar</span>';
    $('gVibe').classList.toggle('off', !on); $('mVibe').classList.toggle('off', !on);
  }
  function toggleVibe() { prefs.vibe = !prefs.vibe; savePrefs(); vibeUI(); sfx('click'); buzz('capture'); }
  function toggleMusic() { prefs.music = !prefs.music; savePrefs(); soundUI(); }

  function clockOpt() { var m = +prefs.clock; return m ? { limit: m * 60000 } : null; }
  function aiHint(l) {
    $('aiHint').textContent = { iniciante: 'Para quem está aprendendo: o computador joga quase ao acaso.', facil: 'Pensa só um lance e às vezes se distrai.', medio: 'Um desafio equilibrado.', dificil: 'Pensa vários lances à frente. Boa sorte!', mestre: 'Usa toda a força: aberturas de livro e cálculo profundo.' }[l] || '';
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
    $('tSettings').onclick = function () { sfx('click'); showPanel('pSettings'); };
    $('tGuide').onclick = function () { sfx('click'); showScreen('guide'); };
    [].forEach.call(document.querySelectorAll('[data-home]'), function (b) { b.onclick = function () { sfx('click'); showScreen('menu'); }; });
    $('bLearnPlay').onclick = function () { sfx('click'); startGame({ mode: 'ai', learn: true, level: 'iniciante', human: 0 }); };
    $('coachWhy').onclick = coachWhy;
    segInit('segLearn', prefs.learn ? '1' : '0', function (v) { prefs.learn = v === '1'; savePrefs(); });
    [].forEach.call(document.querySelectorAll('[data-back]'), function (b) { b.onclick = function () { sfx('click'); showPanel('pMain'); }; });
    $('bContinue').onclick = function () {
      var s = load(SAVE); if (!s) return;
      startGame({ learn: s.learn, mode: s.mode, level: s.level, human: s.human, autoFlip: s.autoFlip, orient: s.orient, moves: s.moves, clock: s.clock });
    };
    segInit('segLevel', prefs.level, function (v) { prefs.level = v; savePrefs(); aiHint(v); }); aiHint(prefs.level);
    segInit('segColor', prefs.color, function (v) { prefs.color = v; savePrefs(); });
    var clockMarks = [].map.call(document.querySelectorAll('.segClock'), function (el, i) { el.id = 'segClock' + i; return null; });
    var marks = [];
    [].forEach.call(document.querySelectorAll('.segClock'), function (el) {
      marks.push(segInit(el.id, prefs.clock, function (v) { prefs.clock = v; savePrefs(); marks.forEach(function (m) { m(v); }); }));
    });
    segInit('segFlip', prefs.flip ? '1' : '0', function (v) { prefs.flip = v === '1'; savePrefs(); });
    segInit('segTheme', prefs.theme, function (v) {
      prefs.theme = v; savePrefs(); app.theme = v; document.body.dataset.theme = v;
      if (app.view3d) app.view3d.setTheme(v);
    });
    segInit('segStyle', prefs.style, function (v) { prefs.style = v; savePrefs(); app.pieceStyle = v; if (app.view3d) app.view3d.setStyle(v); });
    segInit('segCamFx', prefs.camFx ? '1' : '0', function (v) { prefs.camFx = v === '1'; savePrefs(); app.camFx = prefs.camFx; if (app.view3d) app.view3d.camFx = prefs.camFx; });
    segInit('segAid', prefs.aid ? '1' : '0', function (v) { prefs.aid = v === '1'; prefs.aid2 = prefs.aid; savePrefs(); if (app.view3d) app.view3d.setAid(prefs.aid); });
    $('camBtn').onclick = function () {
      var order = ['auto', 'alta', 'media', 'baixa'];
      prefs.cam = order[(order.indexOf(prefs.cam) + 1) % 4]; prefs.cam2 = prefs.cam; savePrefs(); camUI(); sfx('click');
      if (app.view3d) { app.view3d.setCamView(prefs.cam); layoutGame(); }
    };
    segInit('segEnv', prefs.env, function (v) { prefs.env = v; savePrefs(); app.env = v; if (app.view3d) app.view3d.setEnv(v); });
    var markView = segInit('segView', prefs.view, function (v) {
      prefs.view = v; savePrefs();
      if (v === '3d') init3d().then(function () { if (!app.view3d) { prefs.view = '2d'; markView('2d'); } showScreen('menu'); });
      else showScreen('menu');
    });
    if (!app.has3d) { $('segView').hidden = true; $('set3d').hidden = true; }
    $('bStartAI').onclick = function () {
      var c = prefs.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : prefs.color;
      startGame({ mode: 'ai', learn: prefs.learn, level: prefs.level, human: c === 'b' ? 8 : 0, clock: clockOpt() });
    };
    $('bStart2').onclick = function () { startGame({ mode: '2p', autoFlip: prefs.flip, clock: clockOpt() }); };
    $('cHint').onclick = hint;
    $('pzList').addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (!b) return; sfx('click'); startPuzzle(+b.dataset.i); });
    $('mSound').onclick = toggleSound; $('gSound').onclick = toggleSound;
    $('mMusic').onclick = toggleMusic; $('gMusic').onclick = toggleMusic;
    $('mVibe').onclick = toggleVibe; $('gVibe').onclick = toggleVibe;
    $('gMenu').onclick = function () { sfx('click'); saveGame(); app.aiReq++; app.thinking = false; app.pendingAI = null; clearTimeout(app.overT); $('modal').hidden = true; showScreen(app.mode === 'puzzle' ? 'puzzles' : 'menu'); };
    $('tPuzzles').onclick = function () { sfx('click'); showScreen('puzzles'); };
    $('tAchv').onclick = function () { sfx('click'); showScreen('achv'); };
    XStats.onUnlock = function () { setTimeout(function () { sfx('promote'); buzz('capture'); }, 250); };
    $('cNew').onclick = function () {
      sfx('click');
      if (app.mode === 'puzzle') { showScreen('puzzles'); return; }
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
    window.addEventListener('resize', function () { queueLayout(); });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(queueLayout);
      ['game', 'plTop', 'hist', 'plBot', 'status', 'coach'].forEach(function (id) { ro.observe($(id)); });
      ro.observe(document.querySelector('#game .controls')); ro.observe(document.querySelector('#game .top'));
    }
  }

  function boot() {
    app.has3d = webglOK();
    app.theme = prefs.theme; document.body.dataset.theme = prefs.theme; app.pieceStyle = prefs.style; app.env = prefs.env; app.camView = prefs.cam; app.visionAid = prefs.aid; app.camFx = prefs.camFx; camUI();
    app.view2d = new View2D($('board2d'), app);
    app.v = app.view2d;
    bind(); soundUI(); vibeUI();
    if (!navigator.vibrate) { $('mVibe').hidden = true; $('gVibe').hidden = true; }
    showScreen('menu');
    if (prefs.view === '3d' && app.has3d) init3d().then(function () { showScreen('menu'); });
    else if (!app.has3d) prefs.view = '2d';
    // hooks para testes automatizados
    app._start = startGame;
  }
  boot();
})();
