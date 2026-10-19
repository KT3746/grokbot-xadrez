/* XADREZAO - motor de xadrez (regras completas + IA). Codigo original. */
(function (root) {
  'use strict';
  var WHITE = 0, BLACK = 8;
  var P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  var F_CAP = 1, F_DOUBLE = 2, F_EP = 4, F_CASTLE = 8, F_PROMO = 16;
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var N_OFF = [33, 31, 18, 14, -33, -31, -18, -14];
  var B_OFF = [17, 15, -17, -15];
  var R_OFF = [16, -16, 1, -1];
  var K_OFF = [17, 15, -17, -15, 16, -16, 1, -1];
  var CMASK = new Int8Array(128);
  for (var i = 0; i < 128; i++) CMASK[i] = 15;
  CMASK[4] = 15 & ~3; CMASK[7] = 15 & ~1; CMASK[0] = 15 & ~2;
  CMASK[116] = 15 & ~12; CMASK[119] = 15 & ~4; CMASK[112] = 15 & ~8;
  var PCHARS = ' pnbrqk';

  function sqName(sq) { return 'abcdefgh'[sq & 7] + ((sq >> 4) + 1); }
  function sqFromName(s) { return (s.charCodeAt(1) - 49) * 16 + (s.charCodeAt(0) - 97); }

  function Position(fen) { this.load(fen || START); }

  Position.prototype.load = function (fen) {
    var parts = fen.trim().split(/\s+/);
    this.board = new Int8Array(128);
    this.kings = [-1, -1];
    var rank = 7, file = 0, s = parts[0];
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '/') { rank--; file = 0; continue; }
      if (c >= '1' && c <= '8') { file += +c; continue; }
      var lower = c.toLowerCase();
      var t = PCHARS.indexOf(lower);
      if (t < 1) throw new Error('FEN invalida');
      var color = (c === lower) ? BLACK : WHITE;
      var sq = rank * 16 + file;
      this.board[sq] = t | color;
      if (t === K) this.kings[color >> 3] = sq;
      file++;
    }
    this.turn = parts[1] === 'b' ? BLACK : WHITE;
    var cs = parts[2] || '-';
    this.castle = (cs.indexOf('K') >= 0 ? 1 : 0) | (cs.indexOf('Q') >= 0 ? 2 : 0) |
      (cs.indexOf('k') >= 0 ? 4 : 0) | (cs.indexOf('q') >= 0 ? 8 : 0);
    this.ep = (parts[3] && parts[3] !== '-') ? sqFromName(parts[3]) : -1;
    this.half = parseInt(parts[4] || '0', 10) || 0;
    this.full = parseInt(parts[5] || '1', 10) || 1;
    this.hist = [];
  };

  Position.prototype.fen = function () {
    var out = '';
    for (var r = 7; r >= 0; r--) {
      var empty = 0;
      for (var f = 0; f < 8; f++) {
        var p = this.board[r * 16 + f];
        if (!p) { empty++; continue; }
        if (empty) { out += empty; empty = 0; }
        var ch = PCHARS[p & 7];
        out += (p & 8) ? ch : ch.toUpperCase();
      }
      if (empty) out += empty;
      if (r) out += '/';
    }
    var c = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
    return out + ' ' + (this.turn ? 'b' : 'w') + ' ' + (c || '-') + ' ' + (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.half + ' ' + this.full;
  };

  Position.prototype.clone = function () { var p = new Position(this.fen()); return p; };

  Position.prototype.attacked = function (sq, by) {
    var b = this.board, t, i, d, s;
    if (by === WHITE) {
      t = sq - 15; if (!(t & 0x88) && b[t] === (P | WHITE)) return true;
      t = sq - 17; if (!(t & 0x88) && b[t] === (P | WHITE)) return true;
    } else {
      t = sq + 15; if (!(t & 0x88) && b[t] === (P | BLACK)) return true;
      t = sq + 17; if (!(t & 0x88) && b[t] === (P | BLACK)) return true;
    }
    for (i = 0; i < 8; i++) { t = sq + N_OFF[i]; if (!(t & 0x88) && b[t] === (N | by)) return true; }
    for (i = 0; i < 8; i++) { t = sq + K_OFF[i]; if (!(t & 0x88) && b[t] === (K | by)) return true; }
    for (i = 0; i < 4; i++) {
      d = B_OFF[i]; s = sq + d;
      while (!(s & 0x88)) {
        t = b[s];
        if (t) { if (t === (B | by) || t === (Q | by)) return true; break; }
        s += d;
      }
    }
    for (i = 0; i < 4; i++) {
      d = R_OFF[i]; s = sq + d;
      while (!(s & 0x88)) {
        t = b[s];
        if (t) { if (t === (R | by) || t === (Q | by)) return true; break; }
        s += d;
      }
    }
    return false;
  };

  Position.prototype.inCheck = function () {
    return this.attacked(this.kings[this.turn >> 3], this.turn ^ 8);
  };

  function addPawn(list, from, to, piece, cap, flags, promoRank) {
    if ((to >> 4) === promoRank) {
      var c = piece & 8;
      list.push({ from: from, to: to, piece: piece, cap: cap, promo: Q, flags: flags | F_PROMO });
      list.push({ from: from, to: to, piece: piece, cap: cap, promo: R, flags: flags | F_PROMO });
      list.push({ from: from, to: to, piece: piece, cap: cap, promo: B, flags: flags | F_PROMO });
      list.push({ from: from, to: to, piece: piece, cap: cap, promo: N, flags: flags | F_PROMO });
    } else {
      list.push({ from: from, to: to, piece: piece, cap: cap, promo: 0, flags: flags });
    }
  }

  // Gera movimentos pseudo-legais. capsOnly: apenas capturas e promocoes (para a busca quiescente)
  Position.prototype.pseudo = function (capsOnly) {
    var list = [], b = this.board, us = this.turn, them = us ^ 8;
    for (var sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      var p = b[sq];
      if (!p || (p & 8) !== us) continue;
      var type = p & 7, t, i, d, s, q;
      if (type === P) {
        var dir = us === WHITE ? 16 : -16;
        var startRank = us === WHITE ? 1 : 6;
        var promoRank = us === WHITE ? 7 : 0;
        t = sq + dir;
        if (!(t & 0x88) && !b[t]) {
          if (!capsOnly || (t >> 4) === promoRank) addPawn(list, sq, t, p, 0, 0, promoRank);
          if (!capsOnly && (sq >> 4) === startRank && !b[t + dir]) {
            list.push({ from: sq, to: t + dir, piece: p, cap: 0, promo: 0, flags: F_DOUBLE });
          }
        }
        for (i = -1; i <= 1; i += 2) {
          t = sq + dir + i;
          if (t & 0x88) continue;
          q = b[t];
          if (q && (q & 8) === them) addPawn(list, sq, t, p, q, F_CAP, promoRank);
          else if (t === this.ep) list.push({ from: sq, to: t, piece: p, cap: P | them, promo: 0, flags: F_CAP | F_EP });
        }
      } else if (type === N || type === K) {
        var offs = type === N ? N_OFF : K_OFF;
        for (i = 0; i < 8; i++) {
          t = sq + offs[i];
          if (t & 0x88) continue;
          q = b[t];
          if (!q) { if (!capsOnly) list.push({ from: sq, to: t, piece: p, cap: 0, promo: 0, flags: 0 }); }
          else if ((q & 8) === them) list.push({ from: sq, to: t, piece: p, cap: q, promo: 0, flags: F_CAP });
        }
        if (type === K && !capsOnly) this.castles(list, sq, p);
      } else {
        var dirs = type === B ? B_OFF : type === R ? R_OFF : K_OFF;
        for (i = 0; i < dirs.length; i++) {
          d = dirs[i]; s = sq + d;
          while (!(s & 0x88)) {
            q = b[s];
            if (!q) { if (!capsOnly) list.push({ from: sq, to: s, piece: p, cap: 0, promo: 0, flags: 0 }); }
            else { if ((q & 8) === them) list.push({ from: sq, to: s, piece: p, cap: q, promo: 0, flags: F_CAP }); break; }
            s += d;
          }
        }
      }
    }
    return list;
  };

  Position.prototype.castles = function (list, sq, p) {
    var b = this.board, us = this.turn, them = us ^ 8;
    var home = us === WHITE ? 4 : 116;
    if (sq !== home) return;
    var kbit = us === WHITE ? 1 : 4, qbit = us === WHITE ? 2 : 8;
    if ((this.castle & kbit) && b[home + 3] === (R | us) && !b[home + 1] && !b[home + 2] &&
      !this.attacked(home, them) && !this.attacked(home + 1, them) && !this.attacked(home + 2, them)) {
      list.push({ from: home, to: home + 2, piece: p, cap: 0, promo: 0, flags: F_CASTLE });
    }
    if ((this.castle & qbit) && b[home - 4] === (R | us) && !b[home - 1] && !b[home - 2] && !b[home - 3] &&
      !this.attacked(home, them) && !this.attacked(home - 1, them) && !this.attacked(home - 2, them)) {
      list.push({ from: home, to: home - 2, piece: p, cap: 0, promo: 0, flags: F_CASTLE });
    }
  };

  Position.prototype.make = function (m) {
    var b = this.board, us = this.turn;
    var u = { m: m, castle: this.castle, ep: this.ep, half: this.half, cap: 0 };
    var cap = b[m.to];
    if (m.flags & F_EP) {
      var cs = m.to + (us === WHITE ? -16 : 16);
      cap = b[cs]; b[cs] = 0;
    }
    u.cap = cap;
    b[m.to] = m.promo ? (m.promo | us) : m.piece;
    b[m.from] = 0;
    if (m.flags & F_CASTLE) {
      if (m.to === m.from + 2) { b[m.from + 1] = b[m.from + 3]; b[m.from + 3] = 0; }
      else { b[m.from - 1] = b[m.from - 4]; b[m.from - 4] = 0; }
    }
    if ((m.piece & 7) === K) this.kings[us >> 3] = m.to;
    this.castle &= CMASK[m.from] & CMASK[m.to];
    this.ep = (m.flags & F_DOUBLE) ? (m.from + m.to) >> 1 : -1;
    this.half = ((m.piece & 7) === P || cap) ? 0 : this.half + 1;
    if (us === BLACK) this.full++;
    this.turn = us ^ 8;
    this.hist.push(u);
  };

  Position.prototype.unmake = function () {
    var u = this.hist.pop(); if (!u) return null;
    var m = u.m, b = this.board;
    this.turn ^= 8;
    var us = this.turn;
    if (us === BLACK) this.full--;
    b[m.from] = m.piece;
    if (m.flags & F_EP) { b[m.to] = 0; b[m.to + (us === WHITE ? -16 : 16)] = u.cap; }
    else b[m.to] = u.cap;
    if (m.flags & F_CASTLE) {
      if (m.to === m.from + 2) { b[m.from + 3] = b[m.from + 1]; b[m.from + 1] = 0; }
      else { b[m.from - 4] = b[m.from - 1]; b[m.from - 1] = 0; }
    }
    if ((m.piece & 7) === K) this.kings[us >> 3] = m.from;
    this.castle = u.castle; this.ep = u.ep; this.half = u.half;
    return m;
  };

  Position.prototype.legal = function () {
    var ps = this.pseudo(false), out = [], us = this.turn;
    for (var i = 0; i < ps.length; i++) {
      this.make(ps[i]);
      if (!this.attacked(this.kings[us >> 3], us ^ 8)) out.push(ps[i]);
      this.unmake();
    }
    return out;
  };

  Position.prototype.perft = function (depth) {
    if (depth === 0) return 1;
    var ps = this.pseudo(false), n = 0, us = this.turn;
    for (var i = 0; i < ps.length; i++) {
      this.make(ps[i]);
      if (!this.attacked(this.kings[us >> 3], us ^ 8)) n += depth === 1 ? 1 : this.perft(depth - 1);
      this.unmake();
    }
    return n;
  };

  // Chave da posicao para repeticao (en passant so conta se a captura for possivel)
  Position.prototype.key = function () {
    var s = '', b = this.board;
    for (var sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      s += String.fromCharCode(65 + b[sq]);
    }
    var ep = -1;
    if (this.ep >= 0) {
      var ms = this.legal();
      for (var i = 0; i < ms.length; i++) if (ms[i].flags & F_EP) { ep = this.ep; break; }
    }
    return s + this.turn + '.' + this.castle + '.' + ep;
  };

  Position.prototype.insufficient = function () {
    var minors = 0, bishopsColor = -1, sameColorBishops = true, knights = 0, b = this.board;
    for (var sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      var p = b[sq]; if (!p) continue;
      var t = p & 7;
      if (t === P || t === R || t === Q) return false;
      if (t === N) { knights++; minors++; }
      if (t === B) {
        minors++;
        var c = ((sq >> 4) + (sq & 7)) & 1;
        if (bishopsColor < 0) bishopsColor = c; else if (c !== bishopsColor) sameColorBishops = false;
      }
    }
    if (minors <= 1) return true;
    if (knights === 0 && sameColorBishops) return true;
    return false;
  };

  function uci(m) { return sqName(m.from) + sqName(m.to) + (m.promo ? PCHARS[m.promo] : ''); }

  // ===== Partida (historico, repeticao, estado) =====
  function Game(fen) {
    this.startFen = fen || START;
    this.pos = new Position(this.startFen);
    this.moves = [];
    this.keys = [this.pos.key()];
  }
  Game.prototype.legal = function () { return this.pos.legal(); };
  Game.prototype.play = function (m) {
    this.pos.make(m);
    this.moves.push(m);
    this.keys.push(this.pos.key());
  };
  Game.prototype.playUci = function (s) {
    var ms = this.legal();
    for (var i = 0; i < ms.length; i++) if (uci(ms[i]) === s) { this.play(ms[i]); return ms[i]; }
    return null;
  };
  Game.prototype.undo = function () {
    if (!this.moves.length) return null;
    this.pos.unmake(); this.keys.pop();
    return this.moves.pop();
  };
  Game.prototype.status = function () {
    var ms = this.legal(), chk = this.pos.inCheck(), turn = this.pos.turn;
    if (!ms.length) {
      if (chk) return { over: true, reason: 'mate', winner: turn ^ 8, check: true };
      return { over: true, reason: 'stalemate', winner: -1, check: false };
    }
    if (this.pos.insufficient()) return { over: true, reason: 'material', winner: -1, check: chk };
    if (this.pos.half >= 100) return { over: true, reason: 'fifty', winner: -1, check: chk };
    var k = this.keys[this.keys.length - 1], n = 0;
    for (var i = 0; i < this.keys.length; i++) if (this.keys[i] === k) n++;
    if (n >= 3) return { over: true, reason: 'repetition', winner: -1, check: chk };
    return { over: false, check: chk, turn: turn };
  };

  // ===== IA =====
  var VAL = [0, 100, 320, 330, 500, 900, 0];
  // Tabelas posicionais (perspectiva das brancas, indice 0 = a8)
  var PST = [];
  PST[P] = [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
    0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0];
  PST[N] = [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
    -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50];
  PST[B] = [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
    -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20];
  PST[R] = [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
    -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0];
  PST[Q] = [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
    0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20];
  PST[K] = [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20];
  var KEND = [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30,
    -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];

  function evalMaterial(pos) {
    var s = 0, b = pos.board;
    for (var sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      var p = b[sq]; if (!p) continue;
      s += (p & 8) ? -VAL[p & 7] : VAL[p & 7];
    }
    return pos.turn === WHITE ? s : -s;
  }

  function evalFull(pos) {
    var s = 0, b = pos.board, nonPawn = 0, queens = 0, sq, p;
    for (sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq]; if (!p) continue;
      var t = p & 7;
      if (t !== P && t !== K) nonPawn += VAL[t];
      if (t === Q) queens++;
    }
    var endgame = queens === 0 || nonPawn <= 2600;
    var bishops = [0, 0];
    for (sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq]; if (!p) continue;
      var tp = p & 7, white = !(p & 8);
      var r = sq >> 4, f = sq & 7;
      var idx = white ? (7 - r) * 8 + f : r * 8 + f;
      var v = VAL[tp] + (tp === K && endgame ? KEND[idx] : PST[tp][idx]);
      if (tp === B) bishops[white ? 0 : 1]++;
      s += white ? v : -v;
    }
    if (bishops[0] >= 2) s += 30;
    if (bishops[1] >= 2) s -= 30;
    return pos.turn === WHITE ? s : -s;
  }

  var MATE = 100000;

  function orderScore(m, best) {
    if (best && m.from === best.from && m.to === best.to && m.promo === best.promo) return 1e6;
    var s = 0;
    if (m.cap) s += 10000 + VAL[m.cap & 7] * 10 - VAL[m.piece & 7];
    if (m.promo) s += 9000 + VAL[m.promo];
    return s;
  }
  function sortMoves(ms, best, killers) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      m.s = orderScore(m, best);
      if (!m.s && killers) {
        for (var k = 0; k < killers.length; k++) {
          var km = killers[k];
          if (km && km.from === m.from && km.to === m.to) { m.s = 5000; break; }
        }
      }
    }
    ms.sort(function (a, b) { return b.s - a.s; });
    return ms;
  }

  function Searcher(opts) {
    this.evalFn = opts.material ? evalMaterial : evalFull;
    this.useQ = !!opts.quiesce;
    this.deadline = opts.deadline || Infinity;
    this.nodes = 0; this.stop = false; this.killers = [];
  }
  Searcher.prototype.timeUp = function () {
    if ((++this.nodes & 1023) === 0 && Date.now() > this.deadline) this.stop = true;
    return this.stop;
  };
  Searcher.prototype.quiesce = function (pos, alpha, beta, qdepth) {
    if (this.timeUp()) return 0;
    var stand = this.evalFn(pos);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qdepth <= 0) return alpha;
    var ms = sortMoves(pos.pseudo(true), null), us = pos.turn;
    for (var i = 0; i < ms.length; i++) {
      pos.make(ms[i]);
      if (pos.attacked(pos.kings[us >> 3], us ^ 8)) { pos.unmake(); continue; }
      var sc = -this.quiesce(pos, -beta, -alpha, qdepth - 1);
      pos.unmake();
      if (this.stop) return 0;
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  };
  Searcher.prototype.search = function (pos, depth, alpha, beta, ply) {
    if (this.timeUp()) return 0;
    if (ply > 0 && pos.half >= 100) return 0;
    if (depth <= 0) return this.useQ ? this.quiesce(pos, alpha, beta, 6) : this.evalFn(pos);
    var ms = sortMoves(pos.pseudo(false), null, this.killers[ply]), us = pos.turn, legal = 0;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      pos.make(m);
      if (pos.attacked(pos.kings[us >> 3], us ^ 8)) { pos.unmake(); continue; }
      legal++;
      var sc = -this.search(pos, depth - 1, -beta, -alpha, ply + 1);
      pos.unmake();
      if (this.stop) return 0;
      if (sc >= beta) {
        if (!m.cap) { var k = this.killers[ply] || (this.killers[ply] = []); k[1] = k[0]; k[0] = m; }
        return beta;
      }
      if (sc > alpha) alpha = sc;
    }
    if (!legal) return pos.attacked(pos.kings[us >> 3], us ^ 8) ? -MATE + ply : 0;
    return alpha;
  };
  Searcher.prototype.root = function (pos, depth, prevBest, noise) {
    var ms = sortMoves(pos.legal(), prevBest), best = null, alpha = -Infinity, scores = [];
    for (var i = 0; i < ms.length; i++) {
      pos.make(ms[i]);
      var sc = -this.search(pos, depth - 1, -MATE - 1, alpha === -Infinity ? MATE + 1 : -alpha + (noise || 0), 1);
      pos.unmake();
      if (this.stop) return null;
      if (noise) sc += Math.random() * noise;
      scores.push(sc);
      if (sc > alpha) { alpha = sc; best = ms[i]; }
    }
    return { move: best, score: alpha };
  };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // level: 'facil' | 'medio' | 'dificil'
  function think(pos, level, opts) {
    opts = opts || {};
    var ms = pos.legal();
    if (!ms.length) return null;
    if (ms.length === 1) return ms[0];
    if (level === 'facil') {
      var caps = ms.filter(function (m) { return m.cap; });
      // Evita entregar mate em 1 de graca de vez em quando, mas continua facil
      if (caps.length && Math.random() < 0.5) {
        caps.sort(function (a, b) { return VAL[b.cap & 7] - VAL[a.cap & 7]; });
        return Math.random() < 0.6 ? caps[0] : pick(caps);
      }
      var m = pick(ms);
      if (m.promo) m = ms.filter(function (x) { return !x.promo || x.promo === Q; })[0] || m;
      return m;
    }
    if (level === 'medio') {
      var s1 = new Searcher({ material: true, quiesce: false });
      // profundidade 2 com um pouco de variedade entre lances de mesmo valor
      var list = pos.legal(), bestSc = -Infinity, bests = [];
      for (var i = 0; i < list.length; i++) {
        pos.make(list[i]);
        var sc = -s1.search(pos, 1, -MATE - 1, MATE + 1, 1);
        pos.unmake();
        sc += (Math.random() * 12) + (list[i].promo === Q ? 50 : 0);
        if (sc > bestSc + 0.001) { bestSc = sc; bests = [list[i]]; }
      }
      return bests[0];
    }
    // dificil: aprofundamento iterativo com alfa-beta, tabelas posicionais e busca quiescente
    var limit = opts.timeMs || 1500, maxDepth = opts.maxDepth || 6;
    var start = Date.now();
    var s = new Searcher({ material: false, quiesce: true, deadline: start + limit });
    var best = null;
    for (var d = 1; d <= maxDepth; d++) {
      var r = s.root(pos, d, best, 0);
      if (!r || !r.move) break;
      best = r.move;
      if (r.score > MATE - 100) break;
      if (Date.now() - start > limit * 0.45) break; // proxima iteracao nao caberia no tempo
    }
    return best || ms[0];
  }

  var api = {
    WHITE: WHITE, BLACK: BLACK, P: P, N: N, B: B, R: R, Q: Q, K: K,
    F_CAP: F_CAP, F_DOUBLE: F_DOUBLE, F_EP: F_EP, F_CASTLE: F_CASTLE, F_PROMO: F_PROMO,
    START: START, Position: Position, Game: Game, think: think, uci: uci,
    sqName: sqName, sqFromName: sqFromName, evalFull: evalFull
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.XEngine = api;
})(typeof self !== 'undefined' ? self : this);
