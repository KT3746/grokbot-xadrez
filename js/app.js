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
  prefs = { style: prefs.style || 'classico', env: prefs.env || 'sala', theme: prefs.theme || 'classico', clock: prefs.clock || '0', view: prefs.view || '3d', sound: prefs.sound !== false, music: prefs.music !== false, vibe: prefs.vibe !== false, learn: !!prefs.learn, level: prefs.level || 'medio', color: prefs.color || 'w', flip: prefs.flip !== false, cam: prefs.cam2 || 'auto', aid: !!prefs.aid2, camFx: prefs.camFx !== false, p2: prefs.p2 || 'premium', evalbar: prefs.evalbar || 'learn',
    palette: prefs.palette || 'classico', psize: prefs.psize || 'n', outline: prefs.outline !== false, speed: prefs.speed || 'normal', capFx: prefs.capFx === 'normal' ? 'normal' : 'brutal', fight: prefs.fight !== false, fight3: !!prefs.fight3, army: prefs.army === 'cem' || prefs.army === 'esparta' ? prefs.army : 'estatuas', last3: prefs.last3 || (prefs.view === 'vivo' ? 'vivo' : '3d') };
  var PSIZE = { p: 0.9, n: 1, g: 1.12 };

  var app = {
    game: null, mode: 'ai', level: 'medio', human: 0, autoFlip: true, orient: 0,
    sel: -1, dests: {}, busy: false, thinking: false, aiReq: 0, over: null,
    view2d: null, view3d: null, views3: {}, v: null, has3d: true, screen: 'menu'
  };
  window.XApp = app;

  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function savePrefs() { store(PREFS, prefs); }
  function saveGame() {
    if (!app.game || app.mode === 'puzzle') return;
    store(SAVE, { jornada: app.jornada, learn: app.learn, mode: app.mode, level: app.level, human: app.human, autoFlip: app.autoFlip, orient: app.orient, moves: app.game.moves.map(E.uci), t: Date.now(), clock: app.clock ? { limit: app.clock.limit, left: app.clock.left } : null });
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
  // medidas sem a escala da animacao de entrada da tela (senao o tabuleiro fica 3% maior e encosta nos jogadores)
  function rectOf(el) {
    var r = el.getBoundingClientRect(), g = $('game').getBoundingClientRect(), gw = $('game').offsetWidth || 1;
    var k = g.width / gw || 1, ox = (window.innerWidth - window.innerWidth * k) / 2, oy = (window.innerHeight - window.innerHeight * k) / 2;
    return { left: (r.left - ox) / k, top: (r.top - oy) / k, width: r.width / k, height: r.height / k, right: (r.right - ox) / k, bottom: (r.bottom - oy) / k };
  }
  app.rectOf = rectOf;
  app.stageRect = function () {
    var r = rectOf($('stage'));
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  // Retrato: o palco fica so do tamanho que o tabuleiro precisa e a sobra vai para cima,
  // assim jogadores, status e botoes ficam colados no tabuleiro.
  function layoutGame() {
    var g = $('game'), st = $('stage'), sp = $('gSpace'), sp2 = $('gSpace2');
    if (!g.classList.contains('show')) return;
    st.style.flex = ''; st.style.height = ''; sp.style.flexGrow = '0'; sp2.style.flexGrow = '0';
    // Xadrez Vivo em tela larga: o palco e a tela inteira entre as barras, o resto fica por cima
    var W = window.innerWidth, H = window.innerHeight, vivo3 = app.v && app.v === app.view3d && app.view3d.isVivo;
    var vw = !!vivo3 && W >= 900 && W / Math.max(1, H) >= 1.2 && H >= 480;
    document.body.classList.toggle('vwide', vw);
    var r = { width: st.offsetWidth, height: st.offsetHeight };
    if (r.width < 10 || r.height < 10) return;
    if (vw) {
      app.view3d.fitLayout(r.width, r.height);
      document.documentElement.style.setProperty('--plw', '560px');
      app.view3d.resize(); return;
    }
    // PC em tela grande: o tabuleiro tem um tamanho maximo e o jogo fica centralizado
    var wide = window.innerWidth >= 1000, cap = wide && !vivo3 ? Math.max(560, Math.min(900, Math.round(window.innerHeight * 0.74))) : 1e9;
    var avail = Math.min(r.height, cap);
    var need = (app.v && app.v === app.view3d) ? app.view3d.fitLayout(r.width, avail) + 6 : Math.min(r.width, avail);
    need = Math.min(need, avail);
    if (need < r.height - 4) { st.style.flex = '0 0 auto'; st.style.height = need + 'px'; sp.style.flexGrow = '1'; if (wide) sp2.style.flexGrow = '1'; }
    var r2 = { width: st.offsetWidth, height: st.offsetHeight };
    var prem = document.body.classList.contains('p2-prem'), s = Math.floor(Math.min(r2.width, r2.height) - (prem ? 22 : 14));
    document.documentElement.style.setProperty('--plw', (app.v && app.v === app.view3d ? 560 : Math.max(560, Math.min(s + 18, 900))) + 'px');
    $('board2d').style.width = s + 'px'; $('board2d').style.height = s + 'px';
    var fr = $('b2frame'); fr.style.width = fr.style.height = (s + 18) + 'px';
    if (app.view3d) app.view3d.resize();
  }
  var layoutQ = 0;
  function fit2d() { layoutGame(); }
  function queueLayout() { if (layoutQ) return; layoutQ = requestAnimationFrame(function () { layoutQ = 0; layoutGame(); }); }
  app.layout = layoutGame;
  function is3k(k) { return k === '3d' || k === 'vivo'; }
  function pick3(kind) {
    app.view3d = app.views3[kind] || null;
    for (var k in app.views3) if (k !== kind) app.views3[k].setActive(false);
  }
  function useView(kind, first) {
    if (is3k(kind) && !app.views3[kind]) kind = '2d';
    var k3 = is3k(kind);
    if (k3) pick3(kind);
    app.v = k3 ? app.view3d : app.view2d;
    document.body.classList.toggle('three', k3);
    document.body.classList.toggle('vivo', kind === 'vivo');
    for (var k in app.views3) app.views3[k].setActive(k3 && app.views3[k] === app.v);
    if (window.XSound && XSound.setStyle) XSound.setStyle(kind === 'vivo' ? 'vivo' : 'normal');
    $('cViewL').textContent = k3 ? 'Ver 2D' : (prefs.last3 === 'vivo' ? 'Ver Vivo' : 'Ver 3D');
    $('cView').hidden = !app.has3d;
    if (app.game) {
      if (app.review) { app.v.setOrient(app.orient, false); reviewShow(app.review.i, false); }
      else { app.v.setOrient(app.orient, false); app.v.sync(app.game.pos.board); refreshHL(); }
    }
    fit2d();
  }
  function init3d(kind) {
    kind = kind || (prefs.view === 'vivo' ? 'vivo' : '3d');
    if (!app.has3d) return Promise.resolve(null);
    if (app.views3[kind]) { pick3(kind); return Promise.resolve(app.view3d); }
    if (app.loading3 && app.loading3[kind]) return app.loading3[kind];
    app.loading3 = app.loading3 || {};
    $('loading').textContent = kind === 'vivo' ? 'Erguendo o salão de pedra...' : 'Carregando 3D...';
    $('loading').hidden = false;
    var pr = import('./view3d.js?v=' + V).then(function (mod) {
      if (kind === 'vivo') return import('./vivo3d.js?v=' + V).then(function (mv) { var C = mv.makeVivo(mod); return new C($('c3v'), app); });
      return new mod.View3D($('c3d'), app);
    }).then(function (inst) {
      app.views3[kind] = inst;
      if (!app.resizeHooked) { app.resizeHooked = true; window.addEventListener('resize', function () { for (var k in app.views3) app.views3[k].resize(); queueLayout(); }); }
      pick3(kind); $('loading').hidden = true; app.loading3[kind] = null;
      return inst;
    }).catch(function (e) {
      console.warn(e); $('loading').hidden = true; app.loading3[kind] = null;
      if (kind === 'vivo') toast('Seu aparelho não conseguiu abrir o Xadrez Vivo.');
      else { app.has3d = false; toast('Seu aparelho não conseguiu abrir o 3D. Usando o visual 2D.'); }
      return null;
    });
    app.loading3[kind] = pr;
    return pr;
  }
  function webglOK() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }

  // ===== Partida =====
  function isHumanTurn() { return app.mode === '2p' || (app.game.pos.turn === app.human && !(app.mode === 'puzzle' && app.pz && app.pz.lock)); }
  function startGame(opts) {
    endReview();
    app.recorded = false; app.t0 = Date.now();
    app.jornada = opts.jornada != null ? opts.jornada : null; app.sayT = 0;
    if (app.jornada != null) { var JS = XJourney.STAGES[app.jornada]; opts.mode = 'ai'; opts.level = JS.level; opts.human = JS.human; opts.learn = false; }
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
    fightPreload();
    $('bubble').hidden = true;
    if (app.jornada != null && !moves.length) { var gid0 = app.gameId; setTimeout(function () { if (app.gameId === gid0) say(XJourney.pick(XJourney.STAGES[app.jornada].hello), null, true); }, 1300); }
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
    updateEval(st);
  }
  // barra de vantagem (pontos do motor, do lado das brancas)
  function evalOn() { return app.game && (app.mode === 'ai' || app.mode === '2p') && (prefs.evalbar === 'on' || (prefs.evalbar === 'learn' && app.learn)); }
  function setEval(cpWhite) {
    var bar = $('evalBar'); if (!bar || bar.hidden) return;
    var cp = Math.max(-2000, Math.min(2000, cpWhite)), f = 1 / (1 + Math.exp(-cp / 260));
    if (Math.abs(cpWhite) > 20000) f = cpWhite > 0 ? 1 : 0;
    var pct = app.orient === 0 ? f : 1 - f;
    bar.querySelector('i').style.width = (pct * 100).toFixed(1) + '%';
    bar.classList.toggle('flip', app.orient !== 0);
    var pawns = Math.abs(cpWhite) > 20000 ? 'Mate' : (Math.abs(cp) / 100).toFixed(1);
    bar.querySelector('span').textContent = Math.abs(cp) < 25 ? 'Igual' : (cpWhite > 0 ? 'Brancas +' : 'Pretas +') + pawns;
  }
  var evalKey = '';
  function updateEval(st) {
    var bar = $('evalBar'), on = evalOn();
    if (bar.hidden === on) { bar.hidden = !on; queueLayout(); if (on) { bar.querySelector('i').style.width = '50%'; evalKey = ''; } }
    if (!on || st.over) return;
    if (app.mode === 'ai' && app.game.pos.turn !== app.human) return;
    var key = app.gameId + ':' + app.game.moves.length;
    if (key === evalKey) return; evalKey = key;
    var turn = app.game.pos.turn, gid = app.gameId, n = app.game.moves.length;
    analyseAsync(app.game.startFen, app.game.moves.map(E.uci), 280, function (r) {
      if (gid !== app.gameId || n !== app.game.moves.length || r.score == null) return;
      setEval(turn === 0 ? r.score : -r.score);
    });
  }
  // exercito em campo: so quando ele aparece (Xadrez Vivo ou lutas 3D ligadas)
  function armyOn() {
    if (!app.has3d || !prefs.army || prefs.army === 'estatuas') return '';
    return prefs.view === 'vivo' || (prefs.view === '2d' && prefs.fight) || (prefs.view === '3d' && prefs.fight3) ? prefs.army : '';
  }
  var ARMYTXT = {
    cem: { side: ['Inglaterra', 'França'], win: ['A Inglaterra vence a Guerra dos Cem Anos!', 'A França vence a Guerra dos Cem Anos!'], draw: 'Trégua entre Inglaterra e França.' },
    esparta: { side: ['Esparta', 'Pérsia'], win: ['Esparta resiste! Vitória dos espartanos.', 'O Império Persa conquista o tabuleiro!'], draw: 'Trégua nas Termópilas.' }
  };
  // musica adaptativa: mais tensa em xeque, com o relogio no fim ou no final da partida
  var capStreak = 0, capStreakT = 0;
  function noteCapture(kind) {
    var now = Date.now();
    if (now - capStreakT < 14000) capStreak++; else capStreak = 1;
    capStreakT = now;
    if (window.XSound && XSound.swell && capStreak >= 2) XSound.swell(1.15 + Math.min(0.35, capStreak * 0.08), 0.55);
    // faixas de combo (so 2D/jogando, sem atrapalhar a luta)
    if (capStreak >= 2) {
      var title = kind === 'bomb' ? 'FOGO NO BURACO!' : capStreak >= 4 ? 'MASSACRE!' : capStreak === 3 ? 'EMBALADO!' : 'COMBO!';
      var sub = capStreak + ' capturas seguidas';
      setTimeout(function () { if (app.screen === 'game') { banner(title, sub); clearTimeout(banner.t); banner.t = setTimeout(function () { $('banner').hidden = true; }, 3200); } }, kind === 'bomb' ? 900 : (app.fighting ? 2200 : 180));
    }
  }
  function musicMood(st) {
    if (!window.XSound || !XSound.setTension) return;
    var inGame = app.screen === 'game' && !st.over;
    if (XSound.setBattle) XSound.setBattle(inGame && !!armyOn());
    if (XSound.setAmb) XSound.setAmb(inGame && (prefs.view === 'vivo' || !!armyOn()));
    var t = 0;
    if (inGame && app.game) {
      var b = app.game.pos.board, n = 0;
      for (var sq = 0; sq < 120; sq++) { if (sq & 0x88) { sq += 7; continue; } if (b[sq]) n++; }
      if (st.check) t = 1;
      else if (capStreak >= 3 && Date.now() - capStreakT < 10000) t = 0.7;
      else if (capStreak >= 2 && Date.now() - capStreakT < 10000) t = 0.45;
      else if (app.clock && app.clock.left[app.game.pos.turn] < 30000) t = 0.8;
      else if (n <= 10) t = 0.35;
      if (st.check && XSound.swell) XSound.swell(1.35, 0.7);
    } else { capStreak = 0; }
    XSound.setTension(t);
  }
  function refreshPlayers() {
    var g = app.game, bottomColor = app.orient, topColor = bottomColor ^ 8;
    var taken = { 0: [], 8: [] }, mat = { 0: 0, 8: 0 }, VALS = [0, 1, 3, 3, 5, 9, 0];
    g.moves.forEach(function (m) { if (m.cap) taken[m.piece & 8].push(m.cap); if (m.promo) mat[m.piece & 8] += VALS[m.promo] - 1; });
    [0, 8].forEach(function (c) { taken[c].forEach(function (p) { mat[c] += VALS[p & 7]; }); });
    function name(c) {
      if (app.mode === 'puzzle') return c === app.human ? 'Você (' + COLOR_NAME[c] + ')' : 'Desafio ' + app.pz.num + ': mate em ' + app.pz.p.n;
      if (app.mode === 'ai') return c === app.human ? 'Você (' + COLOR_NAME[c] + ')' : (window.XAvatars ? XAvatars.name(app.jornada != null ? XJourney.STAGES[app.jornada].av : app.level) : 'Computador (' + LEVEL_NAME[app.level] + ')');
      return c === 0 ? 'Brancas' : 'Pretas';
    }
    [['plTop', topColor], ['plBot', bottomColor]].forEach(function (a) {
      var el = $(a[0]), c = a[1];
      el.querySelector('.dot').className = 'dot ' + (c ? 'b' : 'w');
      el.querySelector('.name').textContent = name(c);
      var avk = app.mode === 'ai' ? (c === app.human ? 'you' : (app.jornada != null ? XJourney.STAGES[app.jornada].av : app.level)) : app.mode === 'puzzle' ? (c === app.human ? 'you' : 'puzzle') : (c ? 'b' : 'w');
      var av = el.querySelector('.av'); if (window.XAvatars && av.dataset.k !== avk) { av.innerHTML = XAvatars.svg(avk); av.dataset.k = avk; }
      el.querySelector('.sub').textContent = app.mode === 'ai' && c !== app.human ? (app.thinking && g.pos.turn === c ? 'pensando' : (app.jornada != null ? 'Jornada, rival ' + (app.jornada + 1) : 'Computador, ' + COLOR_NAME[c])) : '';
      el.classList.toggle('think', app.mode === 'ai' && c !== app.human && !!app.thinking && g.pos.turn === c);
      var list = taken[c].slice().sort(function (x, y) { return (y & 7) - (x & 7); });
      el.querySelector('.caps').innerHTML = list.map(function (p) { return XPieces.svg(p); }).join('');
      var adv = mat[c] - mat[c ^ 8];
      var ae = el.querySelector('.adv'); ae.textContent = adv > 0 ? '+' + adv : ''; ae.classList.toggle('on', adv > 0);
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
    if (!app.clock || !app.game || app.over || app.paused || app.screen !== 'game' || document.hidden || !app.game.moves.length) return;
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
  // mouse por cima de uma casa: 'grab' (peca que pode mexer), 'pointer' (casa de destino) ou ''
  app.hoverKind = function (sq) {
    if (sq < 0 || app.busy || app.over || !app.game || !isHumanTurn() || app.review) return '';
    if (app.sel >= 0 && app.dests[sq]) return 'pointer';
    var p = app.game.pos.board[sq];
    return p && (p & 8) === app.game.pos.turn ? 'grab' : '';
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
    if (app.v && app.v.ownSounds && !st.check && !m.promo && !(st.over && st.reason === 'mate')) { buzz(m.cap ? 'capture' : 'move'); return; }
    if (st.over && st.reason === 'mate') return;
    if (st.check) { sfx('check'); buzz('check'); if (armyOn()) sfx('horn'); }
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
    if (app.jornada != null && !st.over) {
      var JR = XJourney.STAGES[app.jornada], mine = (m.piece & 8) === app.human;
      if (mine && st.check) say(XJourney.pick(JR.check), 0.8);
      else if (m.cap && mine) say(XJourney.pick(JR.hurt), 0.55);
      else if (m.cap && !mine) say(XJourney.pick(JR.taunt), 0.55);
    }
    var willAI = !st.over && app.mode === 'ai' && app.game.pos.turn !== app.human;
    if (willAI) requestAI();
    var run = function () { return app.v.animate(m, app.game.pos.board, opts || {}); };
    if (m.cap) noteCapture(app._lastBomb ? 'bomb' : ''); app._lastBomb = false;
    var pre = fightWanted(m) ? playFight(m) : null;
    return (pre ? pre.then(run) : run()).then(function () {
      app.busy = false;
      moveSound(m, st);
      musicMood(st);
      refreshHL();
      if (app.mode === 'puzzle') { puzzleStep(m, st); return; }
      if (st.over) { gameOver(st); return; }
      if (app.mode === '2p' && app.autoFlip) { app.orient = app.game.pos.turn; app.v.setOrient(app.orient, true); refreshPlayers(); if (app.v === app.view3d) sfx('whoosh'); }
      if (app.pendingAI) { var pm = app.pendingAI; app.pendingAI = null; applyAI(pm); }
      if (app.learn && !app.thinking && app.game.pos.turn === app.human) coachBefore();
    });
  }
  // ===== Lutas 3D nas capturas (2D e 3D simples) =====
  // a arena (Three.js + Xadrez Vivo) so carrega quando precisa; um renderizador para todas as lutas
  var FT = { inst: null, load: null, el: null, done: null };
  var PNAME = { 1: ['Peão', 0], 2: ['Cavalo', 0], 3: ['Bispo', 0], 4: ['Torre', 1], 5: ['Dama', 1], 6: ['Rei', 0] };
  function pieceName(p) { var n = PNAME[p & 7]; return n[0] + ' ' + ((p & 8) ? (n[1] ? 'preta' : 'preto') : (n[1] ? 'branca' : 'branco')); }
  function fightWanted(m) {
    if (!m.cap || !app.has3d || (app.mode !== 'ai' && app.mode !== '2p')) return false;
    if (app.v === app.view2d) return prefs.fight;
    if (app.v && app.v === app.view3d && !app.view3d.isVivo) return prefs.fight3;
    return false;
  }
  function fightEl() {
    if (FT.el) return FT.el;
    var o = document.createElement('div'); o.id = 'fightOv'; o.hidden = true;
    o.innerHTML = '<div class="fpanel"><canvas id="fightCv"></canvas><div class="flabel"></div><div class="fload">Preparando a luta...</div><div class="fskip">Toque para pular</div></div>';
    document.body.appendChild(o);
    o.addEventListener('pointerdown', function (e) { e.preventDefault(); fightSkip(); });
    FT.el = o; return o;
  }
  function fightLoad() {
    if (FT.inst) return Promise.resolve(FT.inst);
    if (FT.load) return FT.load;
    var el = fightEl();
    FT.load = Promise.all([import('./view3d.js?v=' + V), import('./vivo3d.js?v=' + V), import('./fight3d.js?v=' + V)]).then(function (a) {
      var C = a[2].makeFight(a[0], a[1]);
      var wasHidden = el.hidden; el.hidden = false; el.style.visibility = 'hidden';
      FT.inst = new C($('fightCv'), { army: prefs.army, capFx: prefs.capFx, camFx: prefs.camFx, palette: prefs.palette, outlines: prefs.outline, pScale: 1, animSpeed: prefs.speed, camView: 'auto', visionAid: false,
        sel: -1, dests: {}, onSquare: function () { }, tryMove: function () { return false; }, clearSel: function () { }, hoverKind: function () { return ''; }, stageRect: function () { return { left: 0, top: 0, width: 10, height: 10 }; } });
      el.style.visibility = ''; el.hidden = wasHidden;
      return FT.inst;
    }).catch(function (e) { console.warn(e); FT.load = null; return null; });
    return FT.load;
  }
  // carrega com calma depois que a partida comeca, para a primeira luta nao esperar
  function fightPreload() {
    if (!app.has3d || FT.inst || FT.load) return;
    if (!((prefs.view === '2d' && prefs.fight) || (prefs.view === '3d' && prefs.fight3))) return;
    setTimeout(function () { if (app.screen === 'game' && !app.busy) fightLoad(); }, 1800);
  }
  function fightSkip() {
    if (!FT.done) return;
    var d = FT.done; FT.done = null; d();
  }
  function playFight(m) {
    var el = fightEl();
    return new Promise(function (resolve) {
      var ended = false, wasPaused = app.paused, t0 = Date.now(), maxT = 0, waitT = 0;
      app.paused = true; app.fighting = true;
      el.querySelector('.flabel').innerHTML = '<b class="' + ((m.piece & 8) ? 'dk' : 'lt') + '">' + pieceName(m.piece) + '</b> captura <b class="' + ((m.cap & 8) ? 'dk' : 'lt') + '">' + pieceName(m.cap) + '</b>';
      el.hidden = false; el.classList.remove('out'); el.classList.add('loading'); void el.offsetWidth; el.classList.add('in');
      var finish = function () {
        if (ended) return; ended = true; FT.done = null; clearTimeout(maxT); clearTimeout(waitT);
        if (FT.inst) FT.inst.stop();
        el.classList.remove('in'); el.classList.add('out');
        setTimeout(function () { if (!FT.done) { el.hidden = true; el.classList.remove('out'); } }, 260);
        app.paused = wasPaused; app.fighting = false; lastTick = 0;
        resolve();
      };
      FT.done = finish;
      // se a arena demorar para carregar, segue sem luta
      waitT = setTimeout(function () { if (!FT.inst) finish(); }, 6000);
      fightLoad().then(function (v) {
        if (ended) return;
        if (!v) { finish(); return; }
        clearTimeout(waitT); el.classList.remove('loading');
        v.capFx = prefs.capFx; v.camFx = prefs.camFx; v.speed = prefs.speed;
        if (v.palette !== prefs.palette) v.setPalette(prefs.palette);
        v.resize();
        maxT = setTimeout(finish, 9000);
        (v.setArmy ? v.setArmy(prefs.army).catch(function (e) { console.warn(e); }) : Promise.resolve()).then(function () { if (!ended) v.fight(m, E).then(finish); });
      });
    });
  }
  app.fight = { load: fightLoad, skip: fightSkip, ft: FT };
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
    if (app.jornada != null) {
      var JG = XJourney.STAGES[app.jornada];
      if (st.winner === app.human) XJourney.win(app.jornada);
      setTimeout(function () { say(st.winner === app.human ? JG.lose : st.winner === -1 ? 'Empate! Quase...' : JG.win, null, true); }, 900);
    }
    var sub = statusText(st).replace('Xeque-mate! ', '').replace('Tempo esgotado! ', '').replace(/^Empate (por |pela |: )?/, '');
    var big = st.reason === 'mate' ? 'XEQUE-MATE' : st.reason === 'time' ? 'TEMPO!' : 'EMPATE';
    var AT = armyOn() && ARMYTXT[armyOn()], armyLine = AT ? (st.winner === -1 ? AT.draw : AT.win[st.winner >> 3]) : '';
    if (AT) sub = armyLine;
    // Vivo brutal: a execucao do rei leva mais tempo; o aviso e o resultado esperam a explosao
    var cm = app.v.celebrate({ reason: st.reason, winner: st.winner, kingSq: loserKing }), cms = typeof cm === 'number' ? cm : 0;
    if (AT) setTimeout(function () { if (app.over === st) sfx(st.winner === -1 || (app.mode === 'ai' && st.winner !== app.human) ? 'lament' : 'fanfare'); }, st.reason === 'mate' ? (cms ? cms - 1300 : 900) : 300);
    setTimeout(function () { if (app.over === st) banner(big, sub.charAt(0).toUpperCase() + sub.slice(1)); }, st.reason === 'mate' ? (cms ? cms - 1500 : 700) : 200);
    clearTimeout(app.overT);
    app.overT = setTimeout(function () {
      if (app.over !== st) return;
      var title = st.reason === 'mate' ? 'Xeque-mate!' : st.reason === 'time' ? 'Tempo esgotado!' : 'Empate!';
      var text = statusText(st).replace('Xeque-mate! ', '').replace('Tempo esgotado! ', '');
      if (st.reason === 'mate' || (st.reason === 'time' && app.mode !== 'ai')) text = app.mode === 'ai' ? (st.winner === app.human ? 'Parabéns, você venceu o computador!' : 'O computador venceu desta vez. Tente de novo!') : text + '!';
      if (app.jornada != null) {
        var ji = app.jornada, won = st.winner === app.human, last = ji >= XJourney.STAGES.length - 1;
        var jt = won ? (last ? 'Você completou a Jornada! É o novo campeão.' : 'Rival vencido! O próximo rival foi liberado.') : (st.winner === -1 ? 'Empate. Para avançar, é preciso vencer.' : 'Não foi dessa vez. Tente de novo!');
        var jb = [{ t: 'Mapa', fn: function () { showScreen('jornada'); } }, { t: 'Rever', fn: startReview }];
        if (won && !last) jb.push({ t: 'Próximo rival', pri: true, fn: function () { startGame({ jornada: ji + 1 }); } });
        else jb.push({ t: won ? 'Jogar de novo' : 'Tentar de novo', pri: true, fn: function () { startGame({ jornada: ji }); } });
        modal(title, jt, jb, resultExtra(st));
        return;
      }
      if (AT) { text = armyLine + ' ' + text; }
      modal(title, text, [{ t: 'Rever partida', fn: startReview }, { t: app.mode === 'ai' ? 'Jogar de novo' : 'Novo jogo', pri: true, fn: function () { newSame(); } }], resultExtra(st));
    }, st.reason === 'mate' ? Math.max(3300, cms) : 2000);
  }

  // ===== Rever partida: lance a lance, com notas do motor =====
  var MARK = {
    bril: { s: '!!', t: 'Brilhante!', c: 'br' }, otimo: { s: '!', t: 'Ótimo lance', c: 'ot' }, bom: { s: '', t: 'Bom lance', c: 'bo' },
    abert: { s: '', t: 'Lance de abertura', c: 'ab' }, impr: { s: '?!', t: 'Impreciso', c: 'im' }, erro: { s: '?', t: 'Erro', c: 'er' },
    grave: { s: '??', t: 'Erro grave', c: 'gr' }, mate: { s: '#', t: 'Xeque-mate!', c: 'br' }
  };
  var PVAL = [0, 1, 3, 3, 5, 9, 0];
  function startReview() {
    var g = app.game; if (!g || !g.moves.length) return;
    clearTimeout(app.overT); $('modal').hidden = true; $('banner').hidden = true; $('bubble').hidden = true;
    var rg = new E.Game(g.startFen), ucis = g.moves.map(E.uci);
    var R = { ucis: ucis, n: ucis.length, boards: [rg.pos.board.slice()], check: [-1], mv: [], sans: [], s: [], best: [], marks: [], i: ucis.length, t0: rg.pos.turn };
    for (var k = 0; k < ucis.length; k++) {
      var pos = rg.pos, ms = pos.legal(), m = null;
      for (var j = 0; j < ms.length; j++) if (E.uci(ms[j]) === ucis[k]) m = ms[j];
      if (!m) break;
      var before = pos.board.slice();
      rg.playUci(ucis[k]);
      R.mv.push({ from: m.from, to: m.to, piece: m.piece, cap: m.cap, promo: m.promo, flags: m.flags, before: before });
      R.sans.push(rg.sans[rg.sans.length - 1]);
      R.boards.push(rg.pos.board.slice());
      R.check.push(rg.pos.inCheck() ? rg.pos.kings[rg.pos.turn >> 3] : -1);
      // lance que se entrega: peca grande parada numa casa atacada, levando menos do que vale
      var mover = m.piece & 8, val = PVAL[m.promo ? m.promo & 7 : m.piece & 7], got = m.cap ? PVAL[m.cap & 7] : 0;
      R.mv[k].sac = (m.piece & 7) !== E.P && (m.piece & 7) !== E.K && val - got >= 2 && rg.pos.attacked(m.to, mover ^ 8);
      R.mv[k].mate = !rg.pos.legal().length && rg.pos.inCheck();
      R.mv[k].endPos = !rg.pos.legal().length;
    }
    R.n = R.mv.length; R.i = R.n;
    app.review = R; app.sel = -1; app.dests = {}; clearHint();
    if (app.v.cancelCam) app.v.cancelCam(); if (app.v.resetView) app.v.resetView();
    document.body.classList.add('reviewing');
    $('revBar').hidden = false; $('revCard').hidden = false;
    queueLayout(); reviewShow(R.n, false);
    reviewAnalyse(R, 0);
    sfx('whoosh');
  }
  function reviewAnalyse(R, k) {
    if (app.review !== R) return;
    if (k > R.n) { reviewGrade(R); reviewHist(); reviewCard(); return; }
    var next = function () { reviewProgress(R, k); setTimeout(function () { reviewAnalyse(R, k + 1); }, 0); };
    if (k > 0 && R.mv[k - 1].endPos) { R.s[k] = R.mv[k - 1].mate ? -3000 : 0; R.best[k] = null; next(); return; }
    analyseAsync(app.game.startFen, R.ucis.slice(0, k), R.n > 70 ? 110 : 160, function (r) {
      if (app.review !== R) return;
      var sc = r.score == null ? 0 : r.score;
      R.s[k] = Math.max(-3000, Math.min(3000, sc)); R.best[k] = r.move;
      next();
    });
  }
  function reviewProgress(R, k) {
    var done = Math.min(R.n + 1, k + 1);
    if (done <= R.n) { $('revCard').querySelector('.rp').style.width = (done / (R.n + 1) * 100).toFixed(0) + '%'; $('revCard').classList.add('busy'); }
    if (R.s[R.i] != null && R.s[R.i - 1] != null) reviewCard();
  }
  function reviewGrade(R) {
    var cap = function (x) { return Math.max(-1500, Math.min(1500, x)); };
    R.count = { 0: { grave: 0, erro: 0, bril: 0, otimo: 0 }, 8: { grave: 0, erro: 0, bril: 0, otimo: 0 } };
    for (var j = 0; j < R.n; j++) {
      var m = R.mv[j], before = cap(R.s[j]), after = -cap(R.s[j + 1]), loss = before - after, isBest = R.ucis[j] === R.best[j];
      var mk;
      if (m.mate) mk = 'mate';
      else if (loss >= 280 && before > -700 && after < 600) mk = 'grave';
      else if (loss >= 130 && before > -900) mk = 'erro';
      else if (loss >= 60) mk = 'impr';
      else if (isBest && m.sac && after > -60) mk = 'bril';
      else if (isBest && j > 0 && (R.marks[j - 1] === 'grave' || R.marks[j - 1] === 'erro')) mk = 'otimo';
      else if (j < 8 && loss < 40) mk = 'abert';
      else mk = 'bom';
      R.marks[j] = mk; R.loss = R.loss || []; R.loss[j] = loss;
      if (R.count[m.piece & 8][mk] != null) R.count[m.piece & 8][mk]++;
    }
    R.graded = true; $('revCard').classList.remove('busy');
  }
  function reviewShow(k, anim) {
    var R = app.review; if (!R) return;
    k = Math.max(0, Math.min(R.n, k));
    var prev = R.i; R.i = k;
    if (anim && k === prev + 1 && app.v.animate) { app.v.sync(R.boards[k - 1]); app.v.animate(R.mv[k - 1], R.boards[k]); var cm = R.mv[k - 1]; sfx(R.check[k] >= 0 ? 'check' : cm.cap ? 'capture' : 'move'); }
    else { app.v.sync(R.boards[k]); if (anim) sfx('move'); }
    reviewHL(); reviewHist(); reviewCard();
    if (anim && R.graded && k) { var q = R.marks[k - 1]; if (q === 'bril' || q === 'otimo') setTimeout(function () { sfx('promote'); }, 260); else if (q === 'grave') setTimeout(function () { sfx('illegal'); }, 260); }
  }
  function reviewHL() {
    var R = app.review, k = R.i, m = k ? R.mv[k - 1] : null, mk = k && R.graded ? R.marks[k - 1] : null;
    var showBest = mk === 'grave' || mk === 'erro' || mk === 'impr', bu = showBest ? R.best[k - 1] : null, bf = null;
    if (bu) bf = { from: (+bu[1] - 1) * 16 + bu.charCodeAt(0) - 97, to: (+bu[3] - 1) * 16 + bu.charCodeAt(2) - 97 };
    app.v.highlight({ sel: -1, dests: {}, last: m ? { from: m.from, to: m.to } : null, check: R.check[k], hint: bf });
    if (app.v.arrow) app.v.arrow(bf ? bf.from : -1, bf ? bf.to : -1);
    if (app.v.mark) app.v.mark(m && mk && MARK[mk].s ? m.to : -1, mk ? MARK[mk] : null);
  }
  function reviewHist() {
    var R = app.review; if (!R) return;
    var h = $('hist'), out = '';
    for (var i = 0; i < R.n; i++) {
      if (i % 2 === 0) out += '<span class="n">' + (i / 2 + 1) + '.</span>';
      var mk = R.graded ? MARK[R.marks[i]] : null;
      out += '<span class="mv rv ' + (mk ? 'k-' + mk.c : '') + (i === R.i - 1 ? ' cur' : '') + '" data-k="' + (i + 1) + '">' + R.sans[i] + (mk && mk.s && mk.s !== '#' ? '<sup>' + mk.s + '</sup>' : '') + '</span>';
    }
    h.innerHTML = out;
    var cur = h.querySelector('.cur');
    if (cur) h.scrollLeft = cur.offsetLeft - h.clientWidth / 2 + cur.offsetWidth / 2; else h.scrollLeft = 0;
  }
  function whoName(c) { return app.mode === 'ai' ? (c === app.human ? 'Você' : (app.jornada != null ? XAvatars.name(XJourney.STAGES[app.jornada].av || app.level) : 'Computador')) : (c === 0 ? 'Brancas' : 'Pretas'); }
  function reviewCard() {
    var R = app.review; if (!R) return;
    var c = $('revCard'), k = R.i, head, body;
    if (k === 0) {
      head = '<b class="rk">Rever partida</b>';
      if (R.graded) {
        body = [0, 8].map(function (col) { var q = R.count[col]; return '<span class="sum"><em>' + whoName(col) + '</em> ' + (q.bril ? '<i class="k-br">' + q.bril + ' !!</i>' : '') + (q.otimo ? '<i class="k-ot">' + q.otimo + ' !</i>' : '') + '<i class="k-er">' + q.erro + ' ?</i><i class="k-gr">' + q.grave + ' ??</i></span>'; }).join('');
        body += '<span class="tip">Toque em Avançar ou em Destaque para ver os lances chave.</span>';
      } else body = '<span class="tip">O motor está analisando cada lance...</span>';
    } else {
      var m = R.mv[k - 1], num = Math.floor((k - 1) / 2) + 1 + ((k - 1) % 2 ? '... ' : '. ');
      head = '<b class="rk">' + num + R.sans[k - 1] + '</b>';
      if (R.graded) {
        var mk = MARK[R.marks[k - 1]], txt = mk.t;
        head += '<b class="tag k-' + mk.c + '">' + (mk.s && mk.s !== '#' ? mk.s + ' ' : '') + mk.t + '</b>';
        var bu = R.best[k - 1], why = '';
        if ((R.marks[k - 1] === 'grave' || R.marks[k - 1] === 'erro' || R.marks[k - 1] === 'impr') && bu) {
          why = 'Melhor era ' + uciSan(k - 1, bu) + ' (seta azul).';
          if (R.marks[k - 1] === 'grave') why = (R.s[k] >= 2500 ? 'Esse lance deixa um mate no caminho. ' : 'Perde material importante. ') + why;
        } else if (R.marks[k - 1] === 'bril') why = 'Entregou uma peça e era o melhor lance. Lindo!';
        else if (R.marks[k - 1] === 'otimo') why = 'Puniu o erro do rival na hora.';
        else if (R.marks[k - 1] === 'mate') why = 'Fim de jogo.';
        body = '<span class="by">' + whoName(m.piece & 8) + '</span>' + (why ? ' <span class="why">' + why + '</span>' : '');
        body += evalLine(R, k);
      } else body = '<span class="by">' + whoName(m.piece & 8) + '</span> <span class="tip">Analisando...</span>';
      void txt;
    }
    c.querySelector('.rh').innerHTML = head; c.querySelector('.rb').innerHTML = body;
    $('rvPrev').disabled = k === 0; $('rvStart').disabled = k === 0; $('rvNext').disabled = k === R.n;
  }
  function evalLine(R, k) {
    var s = R.s[k]; if (s == null) return '';
    var w = ((k % 2 === 0) ? R.t0 : R.t0 ^ 8) === 0 ? s : -s;
    var txt = Math.abs(w) >= 2500 ? (w > 0 ? 'Brancas' : 'Pretas') + ' têm mate' : Math.abs(w) < 25 ? 'Igual' : (w > 0 ? 'Brancas +' : 'Pretas +') + (Math.abs(w) / 100).toFixed(1);
    return '<span class="ev">' + txt + '</span>';
  }
  function uciSan(j, u) {
    try { var g = new E.Game(app.game.startFen); for (var i = 0; i < j; i++) g.playUci(app.review.ucis[i]); g.playUci(u); return g.sans[g.sans.length - 1]; } catch (e) { return u; }
  }
  function reviewStep(d) { var R = app.review; if (!R) return; var k = R.i + d; if (k < 0 || k > R.n) return; reviewShow(k, d === 1); buzz('tap'); }
  function reviewKey() {
    var R = app.review; if (!R || !R.graded) return;
    for (var j = R.i; j < R.n; j++) if (/grave|erro|bril|otimo|mate/.test(R.marks[j])) { reviewShow(j + 1, j === R.i); return; }
    reviewShow(0, false); toast('Sem mais lances chave. Voltando ao início.');
  }
  function endReview() {
    var R = app.review; if (!R) return;
    app.review = null; document.body.classList.remove('reviewing');
    $('revBar').hidden = true; $('revCard').hidden = true;
    if (app.v.arrow) app.v.arrow(-1, -1); if (app.v.mark) app.v.mark(-1);
    if (app.game) { app.v.sync(app.game.pos.board); refreshAll(); }
    queueLayout();
  }
  app.startReview = startReview; app.reviewShow = reviewShow;

  // balao de fala do rival (Jornada)
  function say(text, prob, force) {
    if (!text || (prob != null && Math.random() > prob)) return;
    var now = Date.now(); if (!force && now - (app.sayT || 0) < 5000) return; app.sayT = now;
    var b = $('bubble'); b.textContent = text; b.hidden = false; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    clearTimeout(say.t); say.t = setTimeout(function () { b.hidden = true; }, 3600);
  }
  app.say = say;
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
    app.thinking = true; refreshPlayers();
    var id = ++app.aiReq, fen = app.game.pos.fen(), t0 = Date.now();
    app.aiStart = t0;
    if (app.jornada != null) {
      var om = XJourney.openingMove(app.jornada, app.game, E);
      if (om) { setTimeout(function () { onAI({ id: id, move: E.uci(om) }); }, 650); return; }
    }
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
    if (d.score != null && app.level !== 'iniciante' && app.level !== 'facil') setEval(app.game.pos.turn === 0 ? d.score : -d.score);
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
      var pcm = app.v.celebrate({ reason: 'mate', winner: app.human, kingSq: g.pos.kings[(app.human ^ 8) >> 3] });
      sfx('mate'); buzz('mate');
      setTimeout(function () { banner('RESOLVIDO!', stars === 3 ? 'Perfeito, de primeira!' : stars === 2 ? 'Muito bem!' : 'Conseguiu!'); }, typeof pcm === 'number' ? pcm - 1500 : 500);
      if (window.XStats) XStats.onPuzzle(pz.p, stars, m, pzProg, (window.XPuzzles || []).length);
      clearTimeout(app.overT);
      app.overT = setTimeout(function () {
        if (app.pz !== pz) return;
        var next = (window.XPuzzles || [])[pz.idx + 1];
        modalHtml('Desafio resolvido!', '<span class="stars bigstars">' + starsHtml(stars) + '</span>' + (stars < 3 ? 'Resolva sem errar e sem dica para ganhar 3 estrelas.' : 'Três estrelas!'),
          [{ t: 'Lista', fn: function () { showScreen('puzzles'); } }].concat(next ? [{ t: 'Próximo', pri: true, fn: function () { startPuzzle(pz.idx + 1); } }] : []));
      }, typeof pcm === 'number' ? Math.max(2600, pcm) : 2600);
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
    card.className = 'card' + (extra && extra.kind ? ' res ' + extra.kind : '') + (extra && extra.kind && armyOn() ? ' army-' + armyOn() : '');
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
    if (s !== 'game' && PV.open && PV.mode === 'game') closeGameSettings();
    app.screen = s;
    if (s !== 'game' && window.XSound && XSound.setTension) XSound.setTension(0);
    [].forEach.call(document.querySelectorAll('.screen'), function (el) { el.classList.toggle('show', el.id === s); });
    if (s === 'puzzles') buildPuzzleList();
    if (s === 'jornada') XJourney.render($('jnList'), function (i) { sfx('click'); startGame({ jornada: i }); });
    if (s === 'menu' && window.XJourney) $('bJornadaP').textContent = XJourney.load().done + '/' + XJourney.STAGES.length;
    if (s === 'achv') XStats.render($('achList'), pzProg, (window.XPuzzles || []).length);
    if (s === 'menu') { var cn = XStats.count(); $('tAchvN').textContent = cn.got + '/' + cn.total; }
    if (s === 'guide') { if (app.stopGuide) app.stopGuide(); app.stopGuide = XLearn.buildGuide($('guideList')); }
    for (var kk in app.views3) app.views3[kk].setMenu(s === 'menu');
    if (s === 'menu') {
      showPanel('pMain'); updateContinue(); vivoTile(); refreshSettingsUI();
      var want3d = is3k(prefs.view) && app.views3[prefs.view];
      if (want3d) pick3(prefs.view);
      document.body.classList.toggle('three', !!want3d); document.body.classList.toggle('vivo', !!want3d && prefs.view === 'vivo');
      if (window.XSound && XSound.setStyle) XSound.setStyle(want3d && prefs.view === 'vivo' ? 'vivo' : 'normal');
      for (var k3 in app.views3) if (app.views3[k3] !== app.view3d) app.views3[k3].setActive(false);
      if (app.view3d) { app.view3d.setActive(!!want3d); if (app.game) app.view3d.sync(app.game.pos.board); else app.view3d.sync(new E.Position().board); app.view3d.highlight({}); }
    } else if (s !== 'game') {
      for (var k4 in app.views3) app.views3[k4].setActive(false);
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
      $('contInfo').textContent = (s.jornada != null && window.XJourney ? 'Jornada contra ' + XAvatars.name(XJourney.STAGES[s.jornada].av) : s.mode === 'ai' ? 'Contra o computador (' + (LEVEL_NAME[s.level] || '') + (s.learn ? ', aprendendo' : '') + ')' : '2 jogadores') + ', ' + Math.ceil(s.moves.length / 2) + ' lances';
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

  // ===== Ajustes ao vivo (menu e durante a partida) =====
  var menuMarks = {};
  var SET = {
    view: { t: 'Visual', o: [['2d', '2D'], ['3d', '3D'], ['vivo', 'Xadrez Vivo']], need3: true },
    style: { t: 'Peças', o: [['classico', 'Clássico'], ['moderno', 'Moderno'], ['metal', 'Metal'], ['vivo', 'Xadrez Vivo']], when: function (g) { return is3k(g('view')); } },
    palette: { t: 'Cores das peças', o: [['classico', 'Marfim'], ['rubi', 'Rubi'], ['safira', 'Safira'], ['jade', 'Jade']] },
    psize: { t: 'Tamanho das peças', o: [['p', 'Pequenas'], ['n', 'Normal'], ['g', 'Grandes']] },
    outline: { t: 'Contorno das peças', o: [['1', 'Ligado'], ['0', 'Desligado']], when: function (g) { return is3k(g('view')); } },
    aid: { t: 'Símbolos sobre as peças', o: [['1', 'Ligado'], ['0', 'Desligado']], when: function (g) { return is3k(g('view')); } },
    theme: { t: 'Cor do tabuleiro', o: [['classico', 'Clássico'], ['madeira', 'Madeira'], ['azul', 'Azul']], when: function (g) { return g('view') !== 'vivo'; } },
    p2: { t: 'Visual 2D', o: [['premium', 'Premium'], ['simples', 'Simples']], when: function (g) { return g('view') === '2d'; } },
    env: { t: 'Cenário 3D', o: [['sala', 'Sala'], ['jardim', 'Jardim'], ['espaco', 'Espaço']], when: function (g) { return g('view') === '3d'; } },
    cam: { t: 'Vista da câmera', o: [['auto', 'Normal'], ['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']], when: function (g) { return is3k(g('view')); } },
    speed: { t: 'Velocidade das animações', o: [['normal', 'Normal'], ['rapido', 'Rápido']] },
    capFx: { t: 'Intensidade das capturas', o: [['brutal', 'Brutal'], ['normal', 'Normal']], when: function (g) { return g('view') === 'vivo' || (g('view') === '2d' && g('fight') === '1') || (g('view') === '3d' && g('fight3') === '1'); } },
    army: { t: 'Exército', o: [['estatuas', 'Estátuas'], ['cem', 'Guerra dos Cem Anos'], ['esparta', 'Espartanos x Persas']], need3: true, when: function (g) { return g('view') === 'vivo' || (g('view') === '2d' && g('fight') === '1') || (g('view') === '3d' && g('fight3') === '1'); } },
    fight: { t: 'Lutas 3D nas capturas', o: [['1', 'Ligado'], ['0', 'Desligado']], when: function (g) { return g('view') === '2d'; }, need3: true },
    fight3: { t: 'Lutas 3D nas capturas', o: [['1', 'Ligado'], ['0', 'Desligado']], when: function (g) { return g('view') === '3d'; } },
    camFx: { t: 'Câmera aproxima nas capturas', o: [['1', 'Ligado'], ['0', 'Desligado']], when: function (g) { return is3k(g('view')); } },
    evalbar: { t: 'Barra de vantagem', o: [['learn', 'No Aprender'], ['on', 'Sempre'], ['off', 'Nunca']] },
    sound: { t: 'Sons', o: [['1', 'Ligado'], ['0', 'Desligado']] },
    music: { t: 'Música', o: [['1', 'Ligada'], ['0', 'Desligada']] },
    vibe: { t: 'Vibração', o: [['1', 'Ligada'], ['0', 'Desligada']], when: function () { return !!navigator.vibrate; } }
  };
  var SGROUPS = [['Visual', ['view', 'style', 'army', 'palette', 'psize', 'outline', 'aid']], ['Tabuleiro e cenário', ['theme', 'p2', 'env']], ['Câmera e animação', ['cam', 'speed', 'fight', 'fight3', 'capFx', 'camFx', 'evalbar']], ['Som', ['sound', 'music', 'vibe']]];
  function setVal(k) {
    var v = prefs[k];
    if (k === 'style' && prefs.view === 'vivo') return 'vivo';
    if (typeof v === 'boolean') return v ? '1' : '0';
    return String(v);
  }
  function each3(fn) { for (var k in app.views3) fn(app.views3[k], k); }
  function look2d() {
    var b = document.body;
    ['rubi', 'safira', 'jade'].forEach(function (p) { b.classList.toggle('pal-' + p, prefs.palette === p); });
    b.style.setProperty('--psz', PSIZE[prefs.psize] || 1);
    b.classList.toggle('fast', prefs.speed === 'rapido');
    if (app.view2d) app.view2d.fast = prefs.speed === 'rapido';
  }
  function applySetting(k, v) {
    var on = v === '1';
    switch (k) {
      case 'view':
        if (v !== '2d' && !app.has3d) { toast('Este aparelho não abre o 3D.'); break; }
        if (is3k(v)) {
          init3d(v).then(function (inst) {
            if (!inst) { refreshSettingsUI(); return; }
            prefs.view = v; prefs.last3 = v; savePrefs();
            if (app.screen === 'game') useView(v); else if (app.screen === 'menu') showScreen('menu');
            refreshSettingsUI();
          });
          return;
        }
        prefs.view = '2d'; savePrefs();
        if (app.screen === 'game') useView('2d'); else if (app.screen === 'menu') showScreen('menu');
        break;
      case 'style':
        if (v === 'vivo') { applySetting('view', 'vivo'); return; }
        prefs.style = v; app.pieceStyle = v; savePrefs();
        if (app.views3['3d']) app.views3['3d'].setStyle(v);
        if (prefs.view === 'vivo') { applySetting('view', '3d'); return; }
        break;
      case 'palette': prefs.palette = v; app.palette = v; savePrefs(); each3(function (x) { x.setPalette(v); }); look2d(); break;
      case 'psize': prefs.psize = v; app.pScale = PSIZE[v] || 1; savePrefs(); each3(function (x) { x.setPieceScale(app.pScale); }); look2d(); break;
      case 'outline': prefs.outline = on; app.outlines = on; savePrefs(); each3(function (x) { x.setOutlines(on); }); break;
      case 'aid': prefs.aid = on; prefs.aid2 = on; app.visionAid = on; savePrefs(); each3(function (x) { x.setAid(on); }); break;
      case 'theme': prefs.theme = v; app.theme = v; document.body.dataset.theme = v; savePrefs(); if (app.views3['3d']) app.views3['3d'].setTheme(v); break;
      case 'p2': prefs.p2 = v; savePrefs(); document.body.classList.toggle('p2-prem', v === 'premium'); queueLayout(); break;
      case 'env': prefs.env = v; app.env = v; savePrefs(); if (app.views3['3d']) app.views3['3d'].setEnv(v); break;
      case 'cam': prefs.cam = v; prefs.cam2 = v; app.camView = v; savePrefs(); camUI(); each3(function (x) { x.setCamView(v); }); layoutGame(); break;
      case 'speed': prefs.speed = v; app.animSpeed = v; savePrefs(); each3(function (x) { x.speed = v; }); look2d(); break;
      case 'capFx': prefs.capFx = v; app.capFx = v; savePrefs(); each3(function (x) { x.capFx = v; }); break;
      case 'army': prefs.army = v; app.army = v; savePrefs(); each3(function (x) { if (x.setArmy) x.setArmy(v); }); if (FT.inst) FT.inst.setArmy(v); break;
      case 'fight': prefs.fight = on; savePrefs(); if (on) fightPreload(); break;
      case 'fight3': prefs.fight3 = on; savePrefs(); if (on) fightPreload(); break;
      case 'camFx': prefs.camFx = on; app.camFx = on; savePrefs(); each3(function (x) { x.camFx = on; }); break;
      case 'evalbar': prefs.evalbar = v; savePrefs(); if (app.game) { evalKey = ''; refreshStatus(); } break;
      case 'sound': if (prefs.sound !== on) toggleSound(); break;
      case 'music': if (prefs.music !== on) toggleMusic(); break;
      case 'vibe': if (prefs.vibe !== on) toggleVibe(); break;
    }
    refreshSettingsUI();
  }
  function refreshSettingsUI() {
    for (var k in menuMarks) menuMarks[k](setVal(k));
    [].forEach.call(document.querySelectorAll('.setrows'), function (el) { renderSettings(el, el._keys, el._grouped); });
  }
  function renderSettings(el, keys, grouped) {
    if (!el) return;
    el._keys = keys; el._grouped = grouped; el.classList.add('setrows');
    var html = '';
    var row = function (k) {
      var S = SET[k]; if (!S || (S.when && !S.when(setVal)) || (S.need3 && !app.has3d)) return '';
      var cur = setVal(k);
      return '<div class="srow"><label>' + S.t + '</label><div class="seg' + (S.o.length > 3 ? ' seg4' : '') + '" data-k="' + k + '">' + S.o.map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === cur ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div></div>';
    };
    if (grouped) SGROUPS.forEach(function (g) { var r = g[1].map(row).join(''); if (r) html += '<h4>' + g[0] + '</h4>' + r; });
    else html = keys.map(row).join('');
    el.innerHTML = html;
    if (!el._bound) {
      el._bound = true;
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]'), sg = b && b.closest('.seg[data-k]'); if (!sg) return;
        [].forEach.call(sg.children, function (x) { x.classList.toggle('on', x === b); });
        sfx('click'); applySetting(sg.dataset.k, b.dataset.v);
      });
    }
  }
  // ===== Ajustes com prévia ao vivo =====
  // Nada muda no jogo até tocar em Aplicar. A prévia desenha um tabuleiro de exemplo com o visual escolhido.
  var DEF = { view: '3d', style: 'classico', palette: 'classico', psize: 'n', outline: '1', aid: '0', theme: 'classico', p2: 'premium', env: 'sala', cam: 'auto', speed: 'normal', capFx: 'brutal', army: 'estatuas', fight: '1', fight3: '0', camFx: '1', evalbar: 'learn', sound: '1', music: '1', vibe: '1' };
  var PV = { open: false, mode: 'game', base: null, d: null, hov: null, inst: {}, cls: {}, kind: null, v2: null, keep: false };
  var PVSAMPLE = (function () {
    var fen = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7';
    var pos = new E.Position(fen), q = E.sqFromName, from = q('f3'), dests = {}, cap = null;
    pos.legal().forEach(function (m) { if (m.from !== from) return; dests[m.to] = m.cap ? 2 : 1; if (m.to === q('e5')) cap = m; });
    var board = Array.prototype.slice.call(pos.board);
    pos.make(cap); var after = Array.prototype.slice.call(pos.board); pos.unmake();
    return { board: board, after: after, cap: cap, hl: { sel: from, dests: dests, last: { from: q('d7'), to: q('d6') }, check: -1, hint: null } };
  })();
  // miniaturas nos botoes
  var PALC = { classico: ['#f3e2c0', '#2b1c15'], rubi: ['#f3e2c0', '#7a1f1c'], safira: ['#f3e2c0', '#22377a'], jade: ['#f3e2c0', '#1d6a45'] };
  var THC = { classico: ['#e8d1a8', '#5d8a76'], madeira: ['#e2bb85', '#93643f'], azul: ['#c3cdd5', '#5a7590'] };
  var ENVC = { sala: 'linear-gradient(160deg,#6b4a2e,#2a1a10)', jardim: 'linear-gradient(180deg,#9fd0ff 0 45%,#4f8f45 46%,#2f5f2a)', espaco: 'radial-gradient(circle at 30% 30%,#fff 0 1px,transparent 2px),radial-gradient(circle at 70% 60%,#fff 0 1px,transparent 2px),linear-gradient(160deg,#2b1f5c,#07061a)' };
  var PAWN = 'M12 3a3 3 0 0 0-1.9 5.3C8.8 9 8 10.2 8 11.5h1.6l-1.3 5.5H6.5v3h11v-3h-1.8l-1.3-5.5H16c0-1.3-.8-2.5-2.1-3.2A3 3 0 0 0 12 3z';
  var SW = {
    view: function (v) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' + (v === '2d' ? '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h16M12 4v16" stroke-width="1.6"/><path d="M4 4h8v8H4zM12 12h8v8h-8z" fill="currentColor" stroke="none" opacity=".45"/>' : v === '3d' ? '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5L12 12l8-4.5M12 12v9"/>' : VIVO_ICON.replace(/^<svg[^>]*>|<\/svg>$/g, '')) + '</svg>'; },
    style: function (v) {
      if (v === 'vivo') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + VIVO_ICON.replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg>';
      var f = { classico: 'url(#swIv)', moderno: '#e9eef5', metal: 'url(#swMt)' }[v];
      var d = v === 'moderno' ? 'M9 4h6v4h-1.5v8H16v4H8v-4h2.5V8H9z' : PAWN;
      return '<svg viewBox="0 0 24 24"><defs><linearGradient id="swIv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6e2"/><stop offset="1" stop-color="#c9a873"/></linearGradient><linearGradient id="swMt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".5" stop-color="#8b939c"/><stop offset="1" stop-color="#d9dde2"/></linearGradient></defs><path d="' + d + '" fill="' + f + '" stroke="rgba(0,0,0,.55)" stroke-width="1"/></svg>';
    },
    palette: function (v) { var c = PALC[v]; return '<b class="dd" style="background:' + c[0] + '"></b><b class="dd" style="background:' + c[1] + '"></b>'; },
    theme: function (v) { var c = THC[v]; return '<b class="ck" style="background:conic-gradient(' + c[1] + ' 0 25%,' + c[0] + ' 0 50%,' + c[1] + ' 0 75%,' + c[0] + ' 0)"></b>'; },
    p2: function (v) { return '<b class="ck' + (v === 'premium' ? ' pr' : '') + '" style="background:conic-gradient(#5d8a76 0 25%,#e8d1a8 0 50%,#5d8a76 0 75%,#e8d1a8 0)"></b>'; },
    env: function (v) { return '<b class="ck env" style="background:' + ENVC[v] + '"></b>'; },
    psize: function (v) { var z = { p: 0.62, n: 0.8, g: 1 }[v]; return '<svg viewBox="0 0 24 24"><g transform="translate(12 21) scale(' + z + ') translate(-12 -21)"><path d="' + PAWN + '" fill="currentColor"/></g></svg>'; },
    cam: function (v) { var a = { auto: 50, alta: 70, media: 42, baixa: 22 }[v] * Math.PI / 180, x = 4 + Math.cos(a) * 14, y = 19 - Math.sin(a) * 14;
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 19h20" opacity=".6"/><path d="M4 19L' + x.toFixed(1) + ' ' + y.toFixed(1) + '" stroke-dasharray="2 2.2"/><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.4" fill="currentColor"/>' + (v === 'auto' ? '<path d="M17 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" stroke="none"/>' : '') + '</svg>'; }
  };
  function pvSnap() {
    var b = {}; for (var k in SET) b[k] = setVal(k);
    if (!app.has3d) b.view = '2d';
    b.st3 = prefs.style; return b;
  }
  // regras entre as opcoes: "Xadrez Vivo" e visual e estilo ao mesmo tempo
  function pvSet(s, k, v) {
    s[k] = v;
    if (k === 'style') { if (v === 'vivo') s.view = 'vivo'; else { s.st3 = v; if (s.view === 'vivo') s.view = '3d'; } }
    if (k === 'view') s.style = v === 'vivo' ? 'vivo' : s.st3;
    return s;
  }
  function pvState() { var s = Object.assign({}, PV.d); if (PV.hov) pvSet(s, PV.hov.k, PV.hov.v); return s; }
  function pvChanged() { return Object.keys(SET).filter(function (k) { return PV.d[k] !== PV.base[k] && !(k === 'vibe' && !navigator.vibrate); }); }
  function pvIsDef() { var d = PV.d; return Object.keys(DEF).every(function (k) { return d[k] === (k === 'view' && !app.has3d ? '2d' : DEF[k]); }); }
  function optName(k, v) { var o = (SET[k].o.filter(function (x) { return x[0] === v; })[0]) || []; return o[1] || v; }
  function pvRender() {
    var get = function (k) { return PV.d[k]; }, html = '';
    SGROUPS.forEach(function (g) {
      var r = g[1].map(function (k) {
        var S = SET[k]; if (!S || (S.when && !S.when(get)) || (S.need3 && !app.has3d)) return '';
        var cur = PV.d[k], was = PV.base[k], chg = cur !== was, sw = SW[k];
        return '<div class="srow' + (chg ? ' chg' : '') + '"><label>' + S.t + '<i class="cdot" title="Alterado"></i><em class="ctag">alterado</em></label><div class="seg' + (S.o.length > 3 ? ' seg4' : '') + (sw ? ' segsw' : '') + '" data-k="' + k + '">' + S.o.map(function (o) {
          var cl = (o[0] === cur ? 'on' : '') + (chg && o[0] === was ? ' was' : '');
          return '<button data-v="' + o[0] + '"' + (cl ? ' class="' + cl.trim() + '"' : '') + (chg && o[0] === was ? ' title="Como está agora no jogo"' : '') + '>' + (sw ? '<i class="sw">' + sw(o[0]) + '</i>' : '') + '<span>' + o[1] + '</span></button>';
        }).join('') + '</div></div>';
      }).join('');
      if (r) html += '<h4>' + g[0] + '</h4>' + r;
    });
    $('gsBody').innerHTML = html;
    var n = pvChanged().length;
    $('gsCount').textContent = n ? (n === 1 ? '1 alteração' : n + ' alterações') + ' para aplicar' : 'Nada mudou ainda';
    $('gsCount').classList.toggle('on', n > 0);
    $('gsReset').disabled = pvIsDef();
  }
  function pvLabel(s) {
    var k = pvKind(s), a;
    if (k === 'vivo' && s.army && s.army !== 'estatuas') a = [s.view === 'vivo' ? 'Xadrez Vivo' : 'Lutas 3D', optName('army', s.army)];
    else if (k === 'vivo') a = ['Xadrez Vivo', optName('palette', s.palette), optName('cam', s.cam) === 'Normal' ? '' : 'Vista ' + optName('cam', s.cam).toLowerCase()];
    else if (k === '3d') a = ['3D', optName('style', s.st3), optName('theme', s.theme), optName('env', s.env)];
    else a = ['2D ' + optName('p2', s.p2), optName('theme', s.theme), optName('palette', s.palette)];
    return a.filter(Boolean).join(' · ');
  }
  function pvKind(s) { if (app.has3d && PV.armyLook && s.view !== 'vivo') return 'vivo'; return app.has3d && is3k(s.view) ? s.view : '2d'; }
  function pvClass(kind) {
    if (PV.cls[kind]) return Promise.resolve(PV.cls[kind]);
    return import('./view3d.js?v=' + V).then(function (M) {
      if (kind !== 'vivo') return (PV.cls[kind] = M.makePreview(M.View3D));
      return import('./vivo3d.js?v=' + V).then(function (mv) { return (PV.cls[kind] = M.makePreview(mv.makeVivo(M))); });
    });
  }
  function pvFake(s) {
    return { army: s.army, theme: s.theme, env: s.env, pieceStyle: s.st3, palette: s.palette, outlines: s.outline === '1', pScale: PSIZE[s.psize] || 1, animSpeed: s.speed, capFx: s.capFx, camView: s.cam, visionAid: s.aid === '1', camFx: s.camFx === '1',
      sel: -1, dests: {}, onSquare: function () { }, tryMove: function () { return false; }, clearSel: function () { }, hoverKind: function () { return ''; }, stageRect: function () { return { left: 0, top: 0, width: 10, height: 10 }; } };
  }
  function pvLoading(on, txt) { var l = $('pvLoad'); l.hidden = !on; if (txt) l.textContent = txt; }
  function pvSwitch(kind) {
    PV.kind = kind; $('pvBox').dataset.kind = kind;
    for (var k in PV.inst) {
      if (k === kind) continue;
      var x = PV.inst[k];
      // no celular so uma previa 3D existe por vez; no PC a outra fica guardada (parada) para o mouse ir e voltar rapido
      if (PV.keep) { x.active = false; x.canvas.style.display = 'none'; } else { x.dispose(); delete PV.inst[k]; }
    }
    $('pv2').hidden = kind !== '2d';
    if (kind === '2d') { pvLoading(false); pv2Ensure(); return; }
    var have = PV.inst[kind];
    if (have) { have.active = true; have.canvas.style.display = 'block'; have.resize(); have.dirty = true; pvLoading(false); return; }
    pvLoading(true, kind === 'vivo' ? 'Erguendo o salão de pedra...' : 'Montando a prévia 3D...');
    pvClass(kind).then(function (C) {
      if (!PV.open || PV.inst[kind]) return;
      if (PV.kind !== kind && !PV.keep) return;
      var cv = document.createElement('canvas'); cv.className = 'pvc'; $('pvBox').insertBefore(cv, $('pvLoad'));
      var s = pvState(), inst = new C(cv, pvFake(s));
      inst.sync(PVSAMPLE.board); inst.highlight(PVSAMPLE.hl);
      inst._pv = { theme: s.theme, env: s.env, st3: s.st3, palette: s.palette, outline: s.outline, psize: s.psize, aid: s.aid, cam: s.cam };
      PV.inst[kind] = inst;
      if (PV.kind !== kind) { inst.active = false; cv.style.display = 'none'; return; }
      pvLoading(false); pvUpdate();
    }).catch(function (e) { console.warn(e); pvLoading(true, 'Este aparelho não conseguiu mostrar a prévia 3D.'); });
  }
  function pv3Look(inst, s) {
    var L = inst._pv || (inst._pv = {});
    var ch = function (k, v, fn) { if (L[k] !== v) { L[k] = v; fn(v); } };
    if (!inst.isVivo) {
      ch('theme', s.theme, function (v) { inst.setTheme(v); });
      ch('env', s.env, function (v) { inst.setEnv(v); });
      ch('st3', s.st3, function (v) { inst.setStyle(v); });
    }
    ch('palette', s.palette, function (v) { inst.setPalette(v); });
    ch('outline', s.outline, function (v) { inst.setOutlines(v === '1'); });
    ch('psize', s.psize, function (v) { inst.setPieceScale(PSIZE[v] || 1); });
    ch('aid', s.aid, function (v) { inst.setAid(v === '1'); });
    ch('cam', s.cam, function (v) { inst.setCamView(v); });
    if (inst.setArmy) ch('army', s.army, function (v) { inst.setArmy(v).then(function () { inst.dirty = true; }); });
    inst.speed = s.speed; inst.camFx = s.camFx === '1'; inst.capFx = s.capFx;
  }
  // 2D: um documento a parte (iframe), com as classes do visual so dele, sem mexer no jogo
  function pv2Ensure() {
    if (PV.v2 || PV.v2wait) { pv2Fit(); return; }
    var f = $('pv2'), defs = document.querySelector('body > svg[aria-hidden]');
    PV.v2wait = true;
    f.onload = function () {
      PV.v2wait = false;
      if (!PV.open) return;
      var doc = f.contentDocument; if (!doc || !doc.getElementById('board2d')) return;
      PV.v2 = new View2D(doc.getElementById('board2d'), pvFake(PV.d));
      PV.v2.sync(PVSAMPLE.board); PV.v2.highlight(PVSAMPLE.hl);
      PV.v2look = null; pvUpdate();
    };
    f.srcdoc = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="css/style.css?v=' + V + '"><style>html,body{background:transparent!important;overflow:hidden}#stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}</style></head><body>' + (defs ? defs.outerHTML : '') + '<div id="stage"><div id="b2frame"></div><div id="board2d"></div></div></body></html>';
  }
  function pv2Fit() {
    if (!PV.v2) return;
    var doc = PV.v2.el.ownerDocument, w = $('pvBox').clientWidth, h = $('pvBox').clientHeight;
    var prem = doc.body.classList.contains('p2-prem'), s = Math.floor(Math.min(w * 0.92, h - 84) - (prem ? 22 : 14));
    var st = doc.getElementById('stage'); st.style.top = '38px'; st.style.bottom = '46px';
    PV.v2.el.style.width = PV.v2.el.style.height = s + 'px';
    var fr = doc.getElementById('b2frame'); fr.style.width = fr.style.height = (s + 18) + 'px';
  }
  function pv2Look(s) {
    if (!PV.v2) return;
    var b = PV.v2.el.ownerDocument.body;
    b.dataset.theme = s.theme;
    b.classList.toggle('p2-prem', s.p2 === 'premium');
    ['rubi', 'safira', 'jade'].forEach(function (p) { b.classList.toggle('pal-' + p, s.palette === p); });
    b.style.setProperty('--psz', PSIZE[s.psize] || 1);
    b.classList.toggle('fast', s.speed === 'rapido'); PV.v2.fast = s.speed === 'rapido';
    pv2Fit();
  }
  function pvUpdate() {
    if (!PV.open) return;
    var s = pvState(), kind = pvKind(s);
    $('pvTag').textContent = pvLabel(s);
    $('pvBox').classList.toggle('hov', !!PV.hov);
    if (kind !== PV.kind) pvSwitch(kind);
    if (kind === '2d') pv2Look(s);
    else if (PV.inst[kind]) pv3Look(PV.inst[kind], s);
  }
  // mouse por cima de uma opcao: mostra na previa sem escolher
  var pvHovT = 0;
  function pvHover(k, v) {
    clearTimeout(pvHovT);
    var want = k == null || PV.d[k] === v ? null : { k: k, v: v };
    if (JSON.stringify(want) === JSON.stringify(PV.hov)) return;
    var slow = want && (k === 'view' || (k === 'style' && (v === 'vivo' || PV.d.view === 'vivo')));
    pvHovT = setTimeout(function () { PV.hov = want; PV.armyLook = want ? want.k === 'army' : !!PV.armyClick; pvUpdate(); }, !want ? 160 : slow ? 340 : 70);
  }
  function pvTest() {
    var kind = PV.kind, v = kind === '2d' ? PV.v2 : PV.inst[kind];
    if (!v || PV.testing) return;
    XSound.unmute(7000);
    PV.testing = true; $('pvTest').classList.add('busy');
    v.highlight({ sel: -1, dests: {}, last: null, check: -1 });
    v.animate(PVSAMPLE.cap, PVSAMPLE.after, {}).then(function () {
      if (!v.ownSounds) XSound.play('capture');
      setTimeout(function () {
        PV.testing = false; $('pvTest').classList.remove('busy');
        if (v.dead || !PV.open) return;
        v.sync(PVSAMPLE.board); v.highlight(PVSAMPLE.hl);
      }, v.isVivo ? 3200 : 1500);
    });
    if (kind === '2d' || !v.ownSounds) XSound.play('move');
  }
  function pvMusic() {
    var b = $('pvMusic');
    if (XSound.sampling) { XSound.stopSample(); b.classList.remove('busy'); return; }
    if (!XSound.sample(PV.kind === 'vivo' ? 'vivo' : 'normal', 9)) return;
    b.classList.add('busy'); clearTimeout(PV.musT);
    PV.musT = setTimeout(function () { b.classList.remove('busy'); }, 9000);
  }
  function openGameSettings(mode) {
    if (PV.open) return;
    mode = typeof mode === 'string' ? mode : (app.screen === 'game' ? 'game' : 'menu');
    PV.open = true; PV.mode = mode; PV.hov = null; PV.armyClick = PV.armyLook = false;
    PV.keep = matchMedia('(hover: hover) and (pointer: fine)').matches && !PHONE;
    if (mode === 'game') app.paused = true;
    // o jogo para de desenhar enquanto o painel esta aberto (so a previa usa a placa de video)
    each3(function (x) { x.hold = true; });
    PV.base = pvSnap(); PV.d = Object.assign({}, PV.base);
    $('gsTitle').textContent = mode === 'game' ? 'Ajustes da partida' : 'Ajustes';
    $('gSet').classList.toggle('ingame', mode === 'game');
    pvRender();
    $('gSet').hidden = false; $('gSet').classList.remove('go'); void $('gSet').offsetWidth; $('gSet').classList.add('go');
    $('gsOpts').scrollTop = 0;
    PV.kind = null; pvUpdate();
    if (mode === 'game') refreshClocks();
  }
  function closeGameSettings() {
    if (!PV.open) { $('gSet').hidden = true; return; }
    PV.open = false; PV.hov = null; clearTimeout(pvHovT);
    for (var k in PV.inst) PV.inst[k].dispose();
    PV.inst = {}; PV.kind = null;
    if (PV.v2 || PV.v2wait) { var f = $('pv2'); f.onload = null; f.removeAttribute('srcdoc'); f.src = 'about:blank'; PV.v2 = null; PV.v2wait = false; }
    if (window.XSound && XSound.stopSample) XSound.stopSample();
    $('pvMusic').classList.remove('busy'); $('pvTest').classList.remove('busy'); PV.testing = false;
    $('gSet').hidden = true;
    each3(function (x) { x.hold = false; x.dirty = true; });
    if (PV.mode === 'game') { app.paused = false; lastTick = 0; }
    queueLayout();
  }
  function pvApply() {
    var d = PV.d, b = PV.base, ch = pvChanged(), st3 = d.st3;
    closeGameSettings();
    ch.forEach(function (k) { if (k !== 'view' && k !== 'style') applySetting(k, d[k]); });
    if (st3 !== prefs.style) { prefs.style = st3; app.pieceStyle = st3; savePrefs(); if (app.views3['3d']) app.views3['3d'].setStyle(st3); }
    if (d.view !== b.view) applySetting('view', d.view);
    refreshSettingsUI();
    if (ch.length) toast(ch.length === 1 ? 'Ajuste aplicado' : 'Ajustes aplicados');
  }
  function pvBind() {
    var body = $('gsBody');
    body.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'), sg = b && b.closest('.seg[data-k]'); if (!sg) return;
      sfx('click'); clearTimeout(pvHovT); PV.hov = null;
      PV.armyClick = PV.armyLook = sg.dataset.k === 'army';
      pvSet(PV.d, sg.dataset.k, b.dataset.v);
      pvRender(); pvUpdate();
    });
    body.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var b = e.target.closest('button[data-v]'), sg = b && b.closest('.seg[data-k]');
      if (sg) pvHover(sg.dataset.k, b.dataset.v);
    });
    body.addEventListener('pointerout', function (e) {
      if (e.pointerType !== 'mouse') return;
      var to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('#gsBody button[data-v]') : null;
      if (!to) pvHover(null);
    });
    $('gsApply').onclick = function () { sfx('click'); pvApply(); };
    $('gsCancel').onclick = function () { sfx('click'); closeGameSettings(); };
    $('gsX').onclick = function () { sfx('click'); closeGameSettings(); };
    $('gsReset').onclick = function () {
      sfx('click'); var d = Object.assign({}, DEF, { st3: 'classico' }); if (!app.has3d) d.view = '2d';
      PV.d = d; PV.hov = null; pvRender(); pvUpdate();
    };
    $('pvTest').onclick = function () { pvTest(); };
    $('pvMusic').onclick = function () { pvMusic(); };
    $('gSet').addEventListener('click', function (e) { if (e.target === $('gSet')) closeGameSettings(); });
    var ro = window.ResizeObserver ? new ResizeObserver(function () {
      if (!PV.open) return;
      for (var k in PV.inst) if (PV.inst[k].active) PV.inst[k].resize();
      pv2Fit();
    }) : null;
    if (ro) ro.observe($('pvBox'));
  }
  app.openSettings = openGameSettings; app.closeSettings = closeGameSettings; app.applySetting = applySetting; app.pv = PV;
  // Xadrez Vivo no menu: liga o modo e leva para o jogo escolhido
  function vivoMenu() {
    var on = prefs.view === 'vivo';
    var html = '<div class="vgrid">' + [['ai', 'Contra o computador'], ['two', '2 jogadores'], ['jn', 'Jornada'], ['pz', 'Desafios']].map(function (o) { return '<button data-go="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
    modal('Xadrez Vivo', 'As peças viram estátuas de pedra gigantes num salão antigo. Elas andam, lutam e viram pedregulho! Escolha como jogar:', on ? [{ t: 'Desligar Xadrez Vivo', fn: function () { applySetting('view', prefs.last3b || '3d'); } }, { t: 'Fechar' }] : [{ t: 'Fechar' }], { kind: 'vivo', icon: VIVO_ICON, html: html });
    $('mExtra').onclick = function (e) {
      var b = e.target.closest('button[data-go]'); if (!b) return;
      $('modal').hidden = true; sfx('click');
      var go = b.dataset.go;
      if (prefs.view !== 'vivo') prefs.last3b = is3k(prefs.view) ? prefs.view : '2d';
      init3d('vivo').then(function (inst) {
        if (!inst) return;
        prefs.view = 'vivo'; prefs.last3 = 'vivo'; savePrefs(); refreshSettingsUI();
        if (go === 'ai') { showScreen('menu'); showPanel('pAI'); }
        else if (go === 'two') { showScreen('menu'); showPanel('pTwo'); }
        else if (go === 'jn') showScreen('jornada');
        else showScreen('puzzles');
        vivoTile();
      });
    };
  }
  var VIVO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21h16M6 21V10l2-2V4h2v2h4V4h2v4l2 2v11"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/></svg>';
  function vivoTile() { var e = $('tVivoS'); if (e) e.textContent = prefs.view === 'vivo' ? 'Ligado' : 'Estátuas de pedra gigantes'; $('tVivo').classList.toggle('on', prefs.view === 'vivo'); }

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
    document.addEventListener('contextmenu', function (e) {
      if (!e.target.closest('#board2d,#c3d,#c3v')) return;
      e.preventDefault();
      // botao direito cancela a peca escolhida
      if (app.screen === 'game' && app.sel >= 0) { app.clearSel(); sfx('click'); }
    });

    $('bVsAI').onclick = function () { sfx('click'); showPanel('pAI'); };
    $('bJornada').onclick = function () { sfx('click'); showScreen('jornada'); };
    $('bTwo').onclick = function () { sfx('click'); showPanel('pTwo'); };
    $('tSettings').onclick = function () { sfx('click'); openGameSettings('menu'); };
    $('tGuide').onclick = function () { sfx('click'); showScreen('guide'); };
    [].forEach.call(document.querySelectorAll('[data-home]'), function (b) { b.onclick = function () { sfx('click'); showScreen('menu'); }; });
    $('bLearnPlay').onclick = function () { sfx('click'); startGame({ mode: 'ai', learn: true, level: 'iniciante', human: 0 }); };
    $('coachWhy').onclick = coachWhy;
    segInit('segLearn', prefs.learn ? '1' : '0', function (v) { prefs.learn = v === '1'; savePrefs(); });
    [].forEach.call(document.querySelectorAll('[data-back]'), function (b) { b.onclick = function () { sfx('click'); showPanel('pMain'); }; });
    $('bContinue').onclick = function () {
      var s = load(SAVE); if (!s) return;
      startGame({ jornada: s.jornada, learn: s.learn, mode: s.mode, level: s.level, human: s.human, autoFlip: s.autoFlip, orient: s.orient, moves: s.moves, clock: s.clock });
    };
    segInit('segLevel', prefs.level, function (v) { prefs.level = v; savePrefs(); aiHint(v); }); aiHint(prefs.level);
    segInit('segColor', prefs.color, function (v) { prefs.color = v; savePrefs(); });
    var clockMarks = [].map.call(document.querySelectorAll('.segClock'), function (el, i) { el.id = 'segClock' + i; return null; });
    var marks = [];
    [].forEach.call(document.querySelectorAll('.segClock'), function (el) {
      marks.push(segInit(el.id, prefs.clock, function (v) { prefs.clock = v; savePrefs(); marks.forEach(function (m) { m(v); }); }));
    });
    segInit('segFlip', prefs.flip ? '1' : '0', function (v) { prefs.flip = v === '1'; savePrefs(); });
    ['segTheme:theme', 'segStyle:style', 'segEval:evalbar', 'segP2:p2', 'segCamFx:camFx', 'segAid:aid', 'segEnv:env', 'segView:view'].forEach(function (x) {
      var a = x.split(':'); menuMarks[a[1]] = segInit(a[0], setVal(a[1]), function (v) { applySetting(a[1], v); });
    });
    $('camBtn').onclick = function () {
      var order = ['auto', 'alta', 'media', 'baixa'];
      applySetting('cam', order[(order.indexOf(prefs.cam) + 1) % 4]); sfx('click');
    };
    if (!app.has3d) { $('segView').hidden = true; $('set3d').hidden = true; }
    renderSettings($('msExtra'), ['palette', 'psize', 'outline', 'speed']);
    $('tVivo').onclick = function () { sfx('click'); vivoMenu(); };
    $('gGear').onclick = function () { sfx('click'); openGameSettings(); };
    pvBind();
    document.addEventListener('keydown', function (e) {
      // Esc com os ajustes abertos: cancela (nada muda)
      if (PV.open && e.key === 'Escape') { e.preventDefault(); closeGameSettings(); return; }
      if (FT.done && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); fightSkip(); return; }
      if (app.screen !== 'game' || e.altKey || e.repeat) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (app.fighting) { fightSkip(); return; }
        if (!$('gSet').hidden) closeGameSettings(); else if ($('promo').hidden && $('modal').hidden) openGameSettings();
        return;
      }
      // atalhos: Z desfazer, F virar (so com o jogo livre na tela)
      if (!$('gSet').hidden || !$('modal').hidden || !$('promo').hidden) return;
      var k = (e.key || '').toLowerCase(), b = null;
      if (k === 'z' && !e.shiftKey) b = $('cUndo');
      else if (k === 'f' && !e.ctrlKey && !e.metaKey) b = $('cFlip');
      if (!b || b.disabled || b.offsetParent === null) return;
      e.preventDefault(); b.click();
    });
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
    $('gMenu').onclick = function () { sfx('click'); endReview(); saveGame(); app.aiReq++; app.thinking = false; app.pendingAI = null; clearTimeout(app.overT); $('modal').hidden = true; showScreen(app.mode === 'puzzle' ? 'puzzles' : 'menu'); };
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
    $('rvExit').onclick = function () { sfx('click'); endReview(); };
    $('rvStart').onclick = function () { reviewShow(0, false); };
    $('rvPrev').onclick = function () { reviewStep(-1); };
    $('rvNext').onclick = function () { reviewStep(1); };
    $('rvKey').onclick = function () { reviewKey(); buzz('tap'); };
    $('hist').addEventListener('click', function (e) { var t = e.target.closest('.rv'); if (t && app.review) reviewShow(+t.getAttribute('data-k'), false); });
    $('cFlip').onclick = flip;
    $('cView').onclick = function () {
      sfx('click');
      applySetting('view', is3k(prefs.view) ? '2d' : (prefs.last3 || '3d'));
    };
    window.addEventListener('resize', function () { queueLayout(); });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(queueLayout);
      ['game', 'plTop', 'hist', 'plBot', 'status', 'coach'].forEach(function (id) { ro.observe($(id)); });
      ro.observe($('mainBar')); ro.observe($('revBar')); ro.observe($('revCard')); ro.observe(document.querySelector('#game .top'));
      ro.observe($('stage')); ro.observe($('evalBar'));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueLayout);
  }

  function boot() {
    app.has3d = webglOK();
    app.theme = prefs.theme; document.body.dataset.theme = prefs.theme; document.body.classList.toggle('p2-prem', prefs.p2 === 'premium'); app.pieceStyle = prefs.style; app.env = prefs.env; app.camView = prefs.cam; app.visionAid = prefs.aid; app.camFx = prefs.camFx; camUI();
    app.palette = prefs.palette; app.pScale = PSIZE[prefs.psize] || 1; app.outlines = prefs.outline; app.animSpeed = prefs.speed; app.capFx = prefs.capFx; app.army = prefs.army; look2d();
    app.view2d = new View2D($('board2d'), app);
    app.v = app.view2d;
    bind(); soundUI(); vibeUI();
    if (!navigator.vibrate) { $('mVibe').hidden = true; $('gVibe').hidden = true; }
    showScreen('menu');
    var t0 = Date.now(), splashOff = function () {
      var sp = $('splash'); if (!sp || sp.dataset.off) return; sp.dataset.off = 1;
      setTimeout(function () { sp.classList.add('out'); setTimeout(function () { sp.remove(); }, 600); }, Math.max(0, 450 - (Date.now() - t0)));
    };
    setTimeout(splashOff, 6000);
    if (is3k(prefs.view) && app.has3d) init3d(prefs.view).then(function (v) { if (!v) { prefs.view = '2d'; } showScreen('menu'); splashOff(); });
    else { if (!app.has3d) prefs.view = '2d'; splashOff(); }
    // hooks para testes automatizados
    app._start = startGame;
  }
  boot();
})();
