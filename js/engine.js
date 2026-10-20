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

  // Zobrist (hash de 64 bits em duas metades de 32)
  var zseed = 0x2545F491;
  function rnd32() { zseed ^= zseed << 13; zseed ^= zseed >>> 17; zseed ^= zseed << 5; return zseed | 0; }
  var ZH = new Int32Array(16 * 128), ZL = new Int32Array(16 * 128);
  for (var zi = 0; zi < 16 * 128; zi++) { ZH[zi] = rnd32(); ZL[zi] = rnd32(); }
  var ZCH = new Int32Array(16), ZCL = new Int32Array(16), ZEH = new Int32Array(8), ZEL = new Int32Array(8);
  for (zi = 0; zi < 16; zi++) { ZCH[zi] = rnd32(); ZCL[zi] = rnd32(); }
  for (zi = 0; zi < 8; zi++) { ZEH[zi] = rnd32(); ZEL[zi] = rnd32(); }
  var ZSH = rnd32(), ZSL = rnd32();

  function Position(fen) { this.load(fen || START); }

  Position.prototype.computeHash = function () {
    var h = 0, l = 0, b = this.board;
    for (var sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      if (b[sq]) { h ^= ZH[b[sq] * 128 + sq]; l ^= ZL[b[sq] * 128 + sq]; }
    }
    h ^= ZCH[this.castle]; l ^= ZCL[this.castle];
    if (this.ep >= 0) { h ^= ZEH[this.ep & 7]; l ^= ZEL[this.ep & 7]; }
    if (this.turn) { h ^= ZSH; l ^= ZSL; }
    this.hh = h; this.hl = l;
  };

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
    this.computeHash();
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
    var u = { m: m, castle: this.castle, ep: this.ep, half: this.half, cap: 0, hh: this.hh, hl: this.hl };
    var h = this.hh, l = this.hl, zi;
    var cap = b[m.to], cs = m.to;
    if (m.flags & F_EP) {
      cs = m.to + (us === WHITE ? -16 : 16);
      cap = b[cs]; b[cs] = 0;
    }
    u.cap = cap;
    var np = m.promo ? (m.promo | us) : m.piece;
    zi = m.piece * 128 + m.from; h ^= ZH[zi]; l ^= ZL[zi];
    zi = np * 128 + m.to; h ^= ZH[zi]; l ^= ZL[zi];
    if (cap) { zi = cap * 128 + cs; h ^= ZH[zi]; l ^= ZL[zi]; }
    b[m.to] = np;
    b[m.from] = 0;
    if (m.flags & F_CASTLE) {
      var rf, rt, rp = R | us;
      if (m.to === m.from + 2) { rf = m.from + 3; rt = m.from + 1; } else { rf = m.from - 4; rt = m.from - 1; }
      b[rt] = b[rf]; b[rf] = 0;
      zi = rp * 128 + rf; h ^= ZH[zi]; l ^= ZL[zi];
      zi = rp * 128 + rt; h ^= ZH[zi]; l ^= ZL[zi];
    }
    if ((m.piece & 7) === K) this.kings[us >> 3] = m.to;
    h ^= ZCH[this.castle]; l ^= ZCL[this.castle];
    this.castle &= CMASK[m.from] & CMASK[m.to];
    h ^= ZCH[this.castle]; l ^= ZCL[this.castle];
    if (this.ep >= 0) { h ^= ZEH[this.ep & 7]; l ^= ZEL[this.ep & 7]; }
    this.ep = (m.flags & F_DOUBLE) ? (m.from + m.to) >> 1 : -1;
    if (this.ep >= 0) { h ^= ZEH[this.ep & 7]; l ^= ZEL[this.ep & 7]; }
    this.hh = h ^ ZSH; this.hl = l ^ ZSL;
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
    this.castle = u.castle; this.ep = u.ep; this.half = u.half; this.hh = u.hh; this.hl = u.hl;
    return m;
  };

  // Lance nulo (passar a vez) para a poda de lance nulo da busca
  Position.prototype.makeNull = function () {
    this.hist.push({ m: null, ep: this.ep, hh: this.hh, hl: this.hl, half: this.half });
    var h = this.hh ^ ZSH, l = this.hl ^ ZSL;
    if (this.ep >= 0) { h ^= ZEH[this.ep & 7]; l ^= ZEL[this.ep & 7]; }
    this.ep = -1; this.hh = h; this.hl = l; this.turn ^= 8;
  };
  Position.prototype.unmakeNull = function () {
    var u = this.hist.pop();
    this.ep = u.ep; this.hh = u.hh; this.hl = u.hl; this.half = u.half; this.turn ^= 8;
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

  // Notacao algebrica em portugues: R rei, D dama, T torre, B bispo, C cavalo
  var PT = ['', '', 'C', 'B', 'T', 'D', 'R'];
  function san(pos, m, legal) {
    legal = legal || pos.legal();
    var out;
    if (m.flags & F_CASTLE) out = (m.to > m.from) ? 'O-O' : 'O-O-O';
    else {
      var t = m.piece & 7, to = sqName(m.to);
      if (t === P) {
        out = (m.cap ? 'abcdefgh'[m.from & 7] + 'x' : '') + to + (m.promo ? '=' + PT[m.promo] : '');
      } else {
        var sameFile = false, sameRank = false, amb = false;
        for (var i = 0; i < legal.length; i++) {
          var o = legal[i];
          if (o.to === m.to && o.from !== m.from && (o.piece & 7) === t) {
            amb = true;
            if ((o.from & 7) === (m.from & 7)) sameFile = true;
            if ((o.from >> 4) === (m.from >> 4)) sameRank = true;
          }
        }
        var dis = '';
        if (amb) { var n = sqName(m.from); dis = !sameFile ? n[0] : !sameRank ? n[1] : n; }
        out = PT[t] + dis + (m.cap ? 'x' : '') + to;
      }
    }
    pos.make(m);
    if (pos.inCheck()) out += pos.legal().length ? '+' : '#';
    pos.unmake();
    return out;
  }

  // ===== Partida (historico, repeticao, estado) =====
  function Game(fen) {
    this.startFen = fen || START;
    this.pos = new Position(this.startFen);
    this.moves = [];
    this.keys = [this.pos.key()];
    this.sans = [];
  }
  Game.prototype.legal = function () { return this.pos.legal(); };
  Game.prototype.play = function (m) {
    this.sans.push(san(this.pos, m));
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
    this.pos.unmake(); this.keys.pop(); this.sans.pop();
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
  var MG_VAL = [0, 82, 337, 365, 477, 1025, 0], EG_VAL = [0, 94, 281, 297, 512, 936, 0];
  var PHASE_W = [0, 0, 1, 1, 2, 4, 0];
  // Tabelas posicionais (perspectiva das brancas, indice 0 = a8). Meio-jogo:
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
  // Final: peoes valem mais quanto mais avancados, rei vai para o centro
  var PST_EG = [];
  (function () {
    var rowP = [0, 90, 60, 35, 18, 8, 0, 0];
    PST_EG[P] = []; for (var i = 0; i < 64; i++) PST_EG[P][i] = rowP[i >> 3];
    PST_EG[N] = PST[N]; PST_EG[B] = PST[B]; PST_EG[Q] = PST[Q]; PST_EG[K] = KEND;
    PST_EG[R] = []; for (i = 0; i < 64; i++) PST_EG[R][i] = (i >> 3) === 1 ? 10 : 0;
  })();
  var PASS_MG = [0, 5, 10, 15, 30, 50, 80, 0], PASS_EG = [0, 10, 20, 35, 60, 100, 150, 0];
  var MATE = 100000;

  // Avaliacao completa (afinada entre meio-jogo e final), do ponto de vista de quem joga
  var pf = [new Int8Array(8), new Int8Array(8)];      // peoes por coluna
  var pmin = [new Int8Array(8), new Int8Array(8)];    // fileira mais baixa (brancas) / mais alta (pretas)
  function evaluate(pos) {
    var b = pos.board, mg0 = 0, mg1 = 0, eg0 = 0, eg1 = 0, phase = 0, sq, p, t, c, i, s, d, n;
    var bish0 = 0, bish1 = 0, rooks = [];
    for (i = 0; i < 8; i++) { pf[0][i] = 0; pf[1][i] = 0; pmin[0][i] = 8; pmin[1][i] = -1; }
    for (sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq]; if (!p) continue;
      t = p & 7; c = p >> 3;
      var r = sq >> 4, f = sq & 7;
      var idx = c ? r * 8 + f : (7 - r) * 8 + f;
      var mg = MG_VAL[t] + PST[t][idx], eg = EG_VAL[t] + PST_EG[t][idx];
      phase += PHASE_W[t];
      if (t === P) {
        pf[c][f]++;
        if (c === 0) { if (r < pmin[0][f]) pmin[0][f] = r; } else { if (r > pmin[1][f]) pmin[1][f] = r; }
      } else if (t === N) {
        n = 0;
        for (i = 0; i < 8; i++) { s = sq + N_OFF[i]; if (!(s & 0x88) && (!b[s] || (b[s] >> 3) !== c)) n++; }
        mg += (n - 4) * 4; eg += (n - 4) * 4;
      } else if (t !== K) {
        var dirs = t === B ? B_OFF : t === R ? R_OFF : K_OFF; n = 0;
        for (i = 0; i < dirs.length; i++) {
          d = dirs[i]; s = sq + d;
          while (!(s & 0x88)) { if (b[s]) { if ((b[s] >> 3) !== c) n++; break; } n++; s += d; }
        }
        if (t === B) { mg += (n - 6) * 5; eg += (n - 6) * 5; if (c) bish1++; else bish0++; }
        else if (t === R) { mg += (n - 6) * 2; eg += (n - 6) * 4; rooks.push(sq); }
        else { mg += (n - 12); eg += (n - 12) * 2; }
      }
      if (c) { mg1 += mg; eg1 += eg; } else { mg0 += mg; eg0 += eg; }
    }
    // estrutura de peoes
    for (sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq]; if ((p & 7) !== P) continue;
      c = p >> 3; var fl = sq & 7, rk = sq >> 4, o = c ^ 1, pm = 0, pe = 0;
      var left = fl > 0 ? pf[c][fl - 1] : 0, right = fl < 7 ? pf[c][fl + 1] : 0;
      if (!left && !right) { pm -= 12; pe -= 15; }
      var passed = true;
      for (var ff = fl - 1; ff <= fl + 1; ff++) {
        if (ff < 0 || ff > 7 || !pf[o][ff]) continue;
        if (c === 0) { if (pmin[1][ff] > rk) { passed = false; break; } }
        else { if (pmin[0][ff] < rk) { passed = false; break; } }
      }
      if (passed) { var rel = c === 0 ? rk : 7 - rk; pm += PASS_MG[rel]; pe += PASS_EG[rel]; }
      if (c) { mg1 += pm; eg1 += pe; } else { mg0 += pm; eg0 += pe; }
    }
    for (i = 0; i < 8; i++) {
      if (pf[0][i] > 1) { mg0 -= 10 * (pf[0][i] - 1); eg0 -= 20 * (pf[0][i] - 1); }
      if (pf[1][i] > 1) { mg1 -= 10 * (pf[1][i] - 1); eg1 -= 20 * (pf[1][i] - 1); }
    }
    // torres em colunas abertas
    for (i = 0; i < rooks.length; i++) {
      sq = rooks[i]; c = b[sq] >> 3; var rf2 = sq & 7, bonus = 0;
      if (!pf[c][rf2]) bonus = pf[c ^ 1][rf2] ? 10 : 20;
      if (c) { mg1 += bonus; eg1 += bonus >> 1; } else { mg0 += bonus; eg0 += bonus >> 1; }
    }
    if (bish0 >= 2) { mg0 += 30; eg0 += 50; }
    if (bish1 >= 2) { mg1 += 30; eg1 += 50; }
    // seguranca do rei (so no meio-jogo): escudo de peoes e colunas abertas
    for (c = 0; c < 2; c++) {
      var ks = pos.kings[c], kf = ks & 7, kr = ks >> 4, safe = 0, fw = c ? -16 : 16;
      if ((c === 0 && kr <= 1) || (c === 1 && kr >= 6)) {
        for (var df = -1; df <= 1; df++) {
          var fx = kf + df; if (fx < 0 || fx > 7) continue;
          var s1 = ks + fw + df, s2 = ks + 2 * fw + df, own = P | (c << 3);
          if (!(s1 & 0x88) && b[s1] === own) safe += 12;
          else if (!(s2 & 0x88) && b[s2] === own) safe += 6;
          else safe -= 12;
          if (!pf[c][fx]) safe -= pf[c ^ 1][fx] ? 6 : 12;
        }
      } else safe -= 20;
      if (c) mg1 += safe; else mg0 += safe;
    }
    if (phase > 24) phase = 24;
    var mgS = mg0 - mg1 + (pos.turn ? -10 : 10), egS = eg0 - eg1;
    var sc = ((mgS * phase + egS * (24 - phase)) / 24) | 0;
    return pos.turn === WHITE ? sc : -sc;
  }

  // ----- Tabela de transposicao -----
  var TT_BITS = 18, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  var ttKey = null, ttMove, ttScore, ttDepth, ttFlag;
  var T_EXACT = 1, T_LOWER = 2, T_UPPER = 3;
  function initTT() {
    if (ttKey) return;
    ttKey = new Int32Array(TT_SIZE); ttMove = new Int32Array(TT_SIZE); ttScore = new Int32Array(TT_SIZE);
    ttDepth = new Int8Array(TT_SIZE); ttFlag = new Int8Array(TT_SIZE);
  }
  function clearTT() { if (ttKey) { ttKey.fill(0); ttFlag.fill(0); } }
  function enc(m) { return m.from | (m.to << 7) | (m.promo << 14); }
  function sameEnc(m, e) { return e && m.from === (e & 127) && m.to === ((e >> 7) & 127) && m.promo === (e >> 14); }

  function Searcher(opts) {
    initTT();
    this.deadline = opts.deadline || Infinity;
    this.nodes = 0; this.stop = false;
    this.killers = []; for (var i = 0; i < 128; i++) this.killers.push([0, 0]);
    this.history = new Int32Array(16 * 128);
    this.repH = []; this.repL = [];
    var reps = opts.reps || [];
    for (i = 0; i < reps.length; i++) { this.repH.push(reps[i][0]); this.repL.push(reps[i][1]); }
    this.useNull = opts.noNull ? false : true;
    this.material = !!opts.material;
  }
  Searcher.prototype.timeUp = function () {
    if ((++this.nodes & 2047) === 0 && Date.now() > this.deadline) this.stop = true;
    return this.stop;
  };
  Searcher.prototype.ev = function (pos) {
    if (!this.material) return evaluate(pos);
    var s = 0, b = pos.board;
    for (var sq = 0; sq < 120; sq++) { if (sq & 0x88) { sq += 7; continue; } var p = b[sq]; if (p) s += (p & 8) ? -VAL[p & 7] : VAL[p & 7]; }
    return pos.turn === WHITE ? s : -s;
  };
  Searcher.prototype.isRep = function (pos) {
    var n = this.repL.length, lim = Math.max(0, n - pos.half);
    for (var i = n - 2; i >= lim; i -= 2) if (this.repL[i] === pos.hl && this.repH[i] === pos.hh) return true;
    return false;
  };
  Searcher.prototype.push = function (pos) { this.repH.push(pos.hh); this.repL.push(pos.hl); };
  Searcher.prototype.pop = function () { this.repH.pop(); this.repL.pop(); };
  Searcher.prototype.order = function (ms, tte, ply) {
    var k = this.killers[ply] || [0, 0], h = this.history;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], s;
      if (sameEnc(m, tte)) s = 2e7;
      else if (m.cap) s = 1e7 + VAL[m.cap & 7] * 10 - VAL[m.piece & 7];
      else if (m.promo) s = 9e6 + VAL[m.promo];
      else { var e = enc(m); s = e === k[0] ? 8e6 : e === k[1] ? 7e6 : h[m.piece * 128 + m.to]; }
      m.s = s;
    }
    ms.sort(function (a, b) { return b.s - a.s; });
  };
  Searcher.prototype.qs = function (pos, alpha, beta, ply) {
    if (this.timeUp()) return 0;
    var stand = this.ev(pos);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (ply > 60) return stand;
    var ms = pos.pseudo(true), us = pos.turn;
    this.order(ms, 0, 127);
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (!m.promo && stand + VAL[m.cap & 7] + 200 < alpha) continue;
      pos.make(m);
      if (pos.attacked(pos.kings[us >> 3], us ^ 8)) { pos.unmake(); continue; }
      var sc = -this.qs(pos, -beta, -alpha, ply + 1);
      pos.unmake();
      if (this.stop) return 0;
      if (sc > alpha) { alpha = sc; if (alpha >= beta) return alpha; }
    }
    return alpha;
  };
  function hasPieces(pos) {
    var b = pos.board, us = pos.turn;
    for (var sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      var p = b[sq]; if (p && (p & 8) === us) { var t = p & 7; if (t !== P && t !== K) return true; }
    }
    return false;
  }
  Searcher.prototype.search = function (pos, depth, alpha, beta, ply, allowNull) {
    if (this.timeUp()) return 0;
    var us = pos.turn, inCheck = pos.attacked(pos.kings[us >> 3], us ^ 8);
    if (inCheck && ply < 60) depth++;
    if (depth <= 0) return this.qs(pos, alpha, beta, ply);
    if (pos.half >= 100 || this.isRep(pos)) return 0;
    // poda por distancia de mate
    var ma = -MATE + ply, mb = MATE - ply - 1;
    if (alpha < ma) alpha = ma; if (beta > mb) beta = mb; if (alpha >= beta) return alpha;
    var pv = beta - alpha > 1, idx = pos.hl & TT_MASK, tte = 0, sc;
    if (ttKey[idx] === pos.hh && ttFlag[idx]) {
      tte = ttMove[idx];
      if (!pv && ttDepth[idx] >= depth) {
        sc = ttScore[idx];
        if (sc > MATE - 1000) sc -= ply; else if (sc < -MATE + 1000) sc += ply;
        var fl = ttFlag[idx];
        if (fl === T_EXACT || (fl === T_LOWER && sc >= beta) || (fl === T_UPPER && sc <= alpha)) return sc;
      }
    }
    if (!pv && !inCheck) {
      var stat = this.ev(pos);
      if (depth <= 3 && stat - 110 * depth >= beta && Math.abs(beta) < MATE - 1000) return stat;
      if (this.useNull && allowNull && depth >= 3 && stat >= beta && hasPieces(pos)) {
        var Rr = depth > 6 ? 3 : 2;
        pos.makeNull(); this.push(pos);
        sc = -this.search(pos, depth - 1 - Rr, -beta, -beta + 1, ply + 1, false);
        this.pop(); pos.unmakeNull();
        if (this.stop) return 0;
        if (sc >= beta) return sc > MATE - 1000 ? beta : sc;
      }
    }
    var ms = pos.pseudo(false);
    this.order(ms, tte, ply);
    var legal = 0, best = -MATE - 1, bestM = 0, a0 = alpha, k = this.killers[ply];
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      pos.make(m);
      if (pos.attacked(pos.kings[us >> 3], us ^ 8)) { pos.unmake(); continue; }
      legal++;
      this.push(pos);
      if (legal === 1) sc = -this.search(pos, depth - 1, -beta, -alpha, ply + 1, true);
      else {
        var red = 0;
        if (depth >= 3 && !inCheck && !m.cap && !m.promo && legal > 3 && m.s < 7e6 && !pos.inCheck())
          red = legal > 10 ? 2 : 1;
        sc = -this.search(pos, depth - 1 - red, -alpha - 1, -alpha, ply + 1, true);
        if (sc > alpha && red) sc = -this.search(pos, depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (sc > alpha && sc < beta) sc = -this.search(pos, depth - 1, -beta, -alpha, ply + 1, true);
      }
      this.pop(); pos.unmake();
      if (this.stop) return 0;
      if (sc > best) {
        best = sc; bestM = enc(m);
        if (sc > alpha) {
          alpha = sc;
          if (alpha >= beta) {
            if (!m.cap && !m.promo) {
              if (k[0] !== bestM) { k[1] = k[0]; k[0] = bestM; }
              var hi = m.piece * 128 + m.to; this.history[hi] += depth * depth;
              if (this.history[hi] > 5e6) for (var j = 0; j < this.history.length; j++) this.history[j] >>= 1;
            }
            break;
          }
        }
      }
    }
    if (!legal) return inCheck ? -MATE + ply : 0;
    var st = best;
    if (st > MATE - 1000) st += ply; else if (st < -MATE + 1000) st -= ply;
    ttKey[idx] = pos.hh; ttMove[idx] = bestM; ttScore[idx] = st; ttDepth[idx] = depth;
    ttFlag[idx] = best <= a0 ? T_UPPER : best >= beta ? T_LOWER : T_EXACT;
    return best;
  };
  // Raiz: devolve lance e nota. Com exact=true calcula a nota exata de todos os lances (para niveis fracos e dicas)
  Searcher.prototype.root = function (pos, depth, ms, exact) {
    var alpha = -MATE - 1, beta = MATE + 1, best = null, bestSc = -MATE - 1, scores = [];
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], sc;
      pos.make(m); this.push(pos);
      if (exact || i === 0) sc = -this.search(pos, depth - 1, -beta, exact ? MATE + 1 : -alpha, 1, true);
      else {
        sc = -this.search(pos, depth - 1, -alpha - 1, -alpha, 1, true);
        if (sc > alpha && !this.stop) sc = -this.search(pos, depth - 1, -beta, -alpha, 1, true);
      }
      this.pop(); pos.unmake();
      if (this.stop) return null;
      m.score = sc; scores.push(sc);
      if (sc > bestSc) { bestSc = sc; best = m; }
      if (sc > alpha) alpha = sc;
    }
    // melhor lance primeiro na proxima iteracao
    ms.sort(function (a, b) { return b.score - a.score; });
    return { move: best, score: bestSc };
  };

  // ----- Livro de aberturas (linhas principais classicas, escritas a mao) -----
  var BOOK_LINES = [
    'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3 d7d6 e1g1 e8g8',
    'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8e7 e1g1 e8g8 f1e1 d7d6',
    'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 d7d6 c2c3 e8g8',
    'e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 e1g1 f6e4 d2d4 e4d6',
    'e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 d4c6 b7c6 e4e5 d8e7',
    'e2e4 e7e5 g1f3 g8f6 f3e5 d7d6 e5f3 f6e4 d2d4 d6d5 f1d3 b8c6',
    'e2e4 e7e5 b1c3 g8f6 g1f3 b8c6 f1b5 f8b4',
    'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3 c8e6',
    'e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e5 d4b5 d7d6',
    'e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 b8c6 b1c3 d8c7',
    'e2e4 c7c5 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7 d2d3 d7d6',
    'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7 e4e5 f6d7 g5e7 d8e7',
    'e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6 g1f3 d8b6',
    'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6 h2h4 h7h6 g1f3 b8d7',
    'e2e4 c7c6 d2d4 d7d5 e4e5 c8f5 g1f3 e7e6 f1e2 c6c5',
    'e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6 g1f3 c8f5',
    'e2e4 d7d6 d2d4 g8f6 b1c3 g7g6 g1f3 f8g7 f1e2 e8g8',
    'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 h7h6 g5h4 b7b6',
    'd2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4 c8f5 e2e3 e7e6',
    'd2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4 c7c5 e1g1 a7a6',
    'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5 e1g1 b8c6',
    'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8 f1d3 d7d5 g1f3 c7c5',
    'd2d4 g8f6 c2c4 e7e6 g1f3 b7b6 g2g3 c8b7 f1g2 f8e7 e1g1 e8g8',
    'd2d4 g8f6 c2c4 c7c5 d4d5 e7e6 b1c3 e6d5 c4d5 d7d6',
    'd2d4 d7d5 c1f4 g8f6 e2e3 e7e6 g1f3 c7c5 c2c3 b8c6 b1d2 f8d6',
    'd2d4 d7d5 g1f3 g8f6 e2e3 e7e6 f1d3 c7c5 c2c3 b8c6',
    'c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 d7d5 c4d5 f6d5 f1g2 d5b6',
    'c2c4 g8f6 b1c3 e7e6 g1f3 d7d5 d2d4 f8e7',
    'c2c4 c7c5 g1f3 b8c6 b1c3 g7g6 g2g3 f8g7 f1g2 g8f6',
    'g1f3 d7d5 g2g3 g8f6 f1g2 e7e6 e1g1 f8e7 d2d3 e8g8',
    'g1f3 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 d2d4 e8g8'
  ];
  var BOOK = null;
  function bookKey(fen) { return fen.split(' ').slice(0, 4).join(' '); }
  function buildBook() {
    BOOK = {};
    for (var i = 0; i < BOOK_LINES.length; i++) {
      var g = new Position(START), mv = BOOK_LINES[i].split(' ');
      for (var j = 0; j < mv.length; j++) {
        var key = bookKey(g.fen()), ms = g.legal(), found = null;
        for (var k = 0; k < ms.length; k++) if (uci(ms[k]) === mv[j]) found = ms[k];
        if (!found) break;
        var arr = BOOK[key] || (BOOK[key] = []);
        if (arr.indexOf(mv[j]) < 0) arr.push(mv[j]);
        g.make(found);
      }
    }
  }
  function bookMoves(pos) {
    if (!BOOK) buildBook();
    return BOOK[bookKey(pos.fen())] || [];
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var LEVELS = {
    iniciante: { name: 'Iniciante' },
    facil: { name: 'Fácil', depth: 1, margin: 90, blunder: 0.15 },
    medio: { name: 'Médio', depth: 3, time: 700, margin: 30, blunder: 0.04, book: 0.6 },
    dificil: { name: 'Difícil', time: 1500, maxDepth: 5, book: 1 },
    mestre: { name: 'Mestre', time: 3000, book: 1 }
  };
  // Compatibilidade com nomes antigos nao e necessaria: os niveis antigos continuam existindo.

  // Busca principal com aprofundamento iterativo. Devolve {move, score, depth}
  function analyse(pos, opts) {
    opts = opts || {};
    var ms = pos.legal();
    if (!ms.length) return { move: null, score: pos.inCheck() ? -MATE : 0, depth: 0 };
    var limit = opts.timeMs || 1500, maxDepth = opts.maxDepth || 64, start = Date.now();
    var s = new Searcher({ deadline: start + limit, reps: opts.reps, material: opts.material });
    var res = { move: ms[0], score: 0, depth: 0 };
    var sc0 = new Searcher({});
    sc0.order(ms, 0, 0);
    for (var d = 1; d <= maxDepth; d++) {
      var r = s.root(pos, d, ms, !!opts.exact);
      if (!r || !r.move) break;
      res = { move: r.move, score: r.score, depth: d, moves: ms.slice() };
      if (Math.abs(r.score) > MATE - 200 && d >= 2 && !opts.exact) break;
      if (Date.now() - start > limit * 0.5) break;
    }
    if (!res.moves) res.moves = ms;
    return res;
  }

  // Escolha entre lances perto do melhor (para niveis com personalidade mais humana)
  function softPick(moves, margin) {
    var best = moves[0].score, cands = [];
    for (var i = 0; i < moves.length; i++) {
      if (moves[i].score >= best - margin) cands.push(moves[i]);
    }
    if (best > MATE - 200) return moves[0];
    return pick(cands);
  }

  // level: iniciante | facil | medio | dificil | mestre
  function think(pos, level, opts) {
    opts = opts || {};
    var L = LEVELS[level] || LEVELS.medio;
    var ms = pos.legal();
    if (!ms.length) return null;
    if (ms.length === 1) return ms[0];
    if (level === 'iniciante') {
      // quase ao acaso, mas captura uma peca solta de vez em quando e da mate se estiver na cara
      for (var i = 0; i < ms.length; i++) { pos.make(ms[i]); var mt = pos.inCheck() && !pos.legal().length; pos.unmake(); if (mt && Math.random() < 0.7) return ms[i]; }
      var caps = ms.filter(function (m) { return m.cap; });
      if (caps.length && Math.random() < 0.4) { caps.sort(function (a, b) { return VAL[b.cap & 7] - VAL[a.cap & 7]; }); return caps[0]; }
      var m = pick(ms);
      if (m.promo && m.promo !== Q) m = ms.filter(function (x) { return x.from === m.from && x.to === m.to && x.promo === Q; })[0] || m;
      return m;
    }
    if (L.book && Math.random() < L.book) {
      var bm = bookMoves(pos);
      if (bm.length) {
        var u = pick(bm);
        for (i = 0; i < ms.length; i++) if (uci(ms[i]) === u) { ms[i].book = true; return ms[i]; }
      }
    }
    if (L.depth) {
      var res = analyse(pos, { maxDepth: L.depth, timeMs: opts.timeMs || L.time || 800, exact: true, reps: opts.reps, material: level === 'facil' });
      var sorted = res.moves.slice().sort(function (a, b) { return b.score - a.score; });
      if (Math.random() < L.blunder && sorted.length > 2 && sorted[0].score < MATE - 200) {
        // um deslize de vez em quando: lance razoavel mas nao o melhor
        var half = sorted.slice(1, Math.max(2, Math.ceil(sorted.length / 2)));
        var mm = pick(half); if (mm.score > -MATE + 200) return mm;
      }
      return softPick(sorted, L.margin);
    }
    var r = analyse(pos, { timeMs: opts.timeMs || L.time, maxDepth: opts.maxDepth || L.maxDepth, reps: opts.reps });
    return r.move || ms[0];
  }

  // Resolve problemas de mate: devolve os primeiros lances que forcam mate em ate n lances
  function mateSolutions(pos, n) {
    var out = [], ms = pos.legal();
    for (var i = 0; i < ms.length; i++) {
      pos.make(ms[i]);
      if (forcedMate(pos, n - 1)) out.push(ms[i]);
      pos.unmake();
    }
    return out;
  }
  // depois do lance do atacante: verdadeiro se o defensor esta mateado ou toda defesa leva a mate em n
  function hasLegal(pos) {
    var ps = pos.pseudo(false), us = pos.turn;
    for (var i = 0; i < ps.length; i++) {
      pos.make(ps[i]); var ok = !pos.attacked(pos.kings[us >> 3], us ^ 8); pos.unmake();
      if (ok) return true;
    }
    return false;
  }
  function forcedMate(pos, n) {
    var chk = pos.inCheck();
    if (n <= 0) return chk && !hasLegal(pos);
    var def = pos.legal();
    if (!def.length) return chk;
    for (var i = 0; i < def.length; i++) {
      pos.make(def[i]);
      var ok = false, att = pos.legal();
      for (var j = 0; j < att.length && !ok; j++) {
        pos.make(att[j]);
        ok = forcedMate(pos, n - 1);
        pos.unmake();
      }
      pos.unmake();
      if (!ok) return false;
    }
    return true;
  }

  var api = {
    WHITE: WHITE, BLACK: BLACK, P: P, N: N, B: B, R: R, Q: Q, K: K,
    F_CAP: F_CAP, F_DOUBLE: F_DOUBLE, F_EP: F_EP, F_CASTLE: F_CASTLE, F_PROMO: F_PROMO,
    START: START, Position: Position, Game: Game, think: think, analyse: analyse, uci: uci, san: san,
    sqName: sqName, sqFromName: sqFromName, evalFull: evaluate, evaluate: evaluate, VAL: VAL, MATE: MATE,
    mateSolutions: mateSolutions, bookMoves: bookMoves, LEVELS: LEVELS, clearTT: clearTT
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.XEngine = api;
})(typeof self !== 'undefined' ? self : this);
