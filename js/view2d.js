/* Tabuleiro 2D: toque, arrastar e animacoes */
(function () {
  function View2D(el, app) {
    this.el = el; this.app = app; this.orient = 0;
    this.squares = {}; this.pieces = {}; this.board = null;
    this.sqLayer = document.createElement('div'); this.sqLayer.className = 'b2-squares';
    this.pcLayer = document.createElement('div'); this.pcLayer.className = 'b2-pieces';
    el.appendChild(this.sqLayer); el.appendChild(this.pcLayer);
    for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
      var sq = r * 16 + f, d = document.createElement('div');
      d.className = 'b2-sq ' + (((r + f) & 1) ? 'light' : 'dark');
      d.innerHTML = '<i class="mk"></i><b class="cf"></b><b class="cr"></b>';
      this.sqLayer.appendChild(d); this.squares[sq] = d;
    }
    var tx = document.createElement('div'); tx.className = 'b2-tex'; tx.style.backgroundImage = 'url(' + boardTexture() + ')'; this.sqLayer.appendChild(tx);
    this.place();
    this.bindInput();
  }
  // textura fina (veios e granulado) desenhada uma vez, usada por cima das casas no visual Premium
  var texURL = null;
  function boardTexture() {
    if (texURL) return texURL;
    var c = document.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    var img = g.getImageData(0, 0, 512, 512), d = img.data;
    for (var i = 0; i < d.length; i += 4) { var v = 128 + (Math.random() - 0.5) * 34; d[i] = d[i + 1] = d[i + 2] = v; }
    g.putImageData(img, 0, 0);
    for (var k = 0; k < 110; k++) {
      g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + (0.1 + Math.random() * 0.22) + ')' : 'rgba(0,0,0,' + (0.08 + Math.random() * 0.16) + ')';
      g.lineWidth = 0.6 + Math.random() * 1.8; g.beginPath();
      var x = Math.random() * 512, y = Math.random() * 512; g.moveTo(x, y);
      for (var j = 0; j < 6; j++) { x += (Math.random() - 0.3) * 120; y += (Math.random() - 0.5) * 70; g.quadraticCurveTo(x - 30, y + (Math.random() - 0.5) * 40, x, y); }
      g.stroke();
    }
    texURL = c.toDataURL('image/jpeg', 0.8);
    return texURL;
  }
  View2D.prototype.trail = function (from, to) {
    var a = this.cell(from), b = this.cell(to), w = this.el.clientWidth / 8;
    var x1 = (a.c + 0.5) * w, y1 = (a.r + 0.5) * w, x2 = (b.c + 0.5) * w, y2 = (b.r + 0.5) * w;
    var len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
    var t = document.createElement('div'); t.className = 'b2-trail';
    t.style.width = len + 'px'; t.style.height = (w * 0.34) + 'px'; t.style.left = x1 + 'px'; t.style.top = (y1 - w * 0.17) + 'px';
    t.style.transform = 'rotate(' + ang + 'rad)';
    this.el.appendChild(t); setTimeout(function () { t.remove(); }, 800);
  };
  View2D.prototype.cell = function (sq) {
    var f = sq & 7, r = sq >> 4;
    return this.orient === 0 ? { c: f, r: 7 - r } : { c: 7 - f, r: r };
  };
  View2D.prototype.place = function () {
    for (var k in this.squares) {
      var sq = +k, p = this.cell(sq), d = this.squares[k];
      d.style.left = (p.c * 12.5) + '%'; d.style.top = (p.r * 12.5) + '%';
      d.querySelector('.cf').textContent = p.r === 7 ? 'abcdefgh'[sq & 7] : '';
      d.querySelector('.cr').textContent = p.c === 0 ? String((sq >> 4) + 1) : '';
    }
    for (var s in this.pieces) this.pieces[s].style.transform = this.tf(+s);
  };
  View2D.prototype.tf = function (sq) { var p = this.cell(sq); return 'translate(' + (p.c * 100) + '%,' + (p.r * 100) + '%)'; };
  View2D.prototype.makePiece = function (sq, piece) {
    var e = document.createElement('div'); e.className = 'b2-pc';
    e.innerHTML = XPieces.svg(piece); e.style.transform = this.tf(sq);
    this.pcLayer.appendChild(e); return e;
  };
  View2D.prototype.sync = function (board) {
    this.board = board;
    this.pcLayer.innerHTML = ''; this.pieces = {};
    for (var sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      if (board[sq]) this.pieces[sq] = this.makePiece(sq, board[sq]);
    }
  };
  View2D.prototype.animate = function (m, board, opts) {
    var self = this, E = XEngine;
    var capSq = (m.flags & E.F_EP) ? m.to + ((m.piece & 8) ? 16 : -16) : m.to;
    var capEl = m.cap ? this.pieces[capSq] : null;
    if (capEl) { capEl.parentNode.removeChild(capEl); }
    this.sync(board);
    if (opts && opts.instant) return Promise.resolve();
    var moves = [[m.from, m.to]];
    if (m.flags & E.F_CASTLE) moves.push(m.to > m.from ? [m.from + 3, m.from + 1] : [m.from - 4, m.from - 1]);
    if (capEl) {
      capEl.style.setProperty('--t', capEl.style.transform); capEl.classList.add('b2-gone'); this.pcLayer.appendChild(capEl);
      setTimeout(function () { if (capEl.parentNode) capEl.parentNode.removeChild(capEl); }, 420);
      setTimeout(function () { self.burst(capSq, ['#ff9a1f', '#ffc63a', '#ff5a2a', '#fff0b0'], 16, 1.15); self.hit(capSq); }, 200);
    }
    // lances longos andam um pouco mais devagar (movimento mais suave), curtos continuam rapidos
    var a0 = this.cell(m.from), a1 = this.cell(m.to), dist = Math.hypot(a1.c - a0.c, a1.r - a0.r), dur = Math.round((self.fast ? 125 : 230) * Math.min(1.35, 0.85 + dist * 0.07));
    moves.forEach(function (mv) {
      var e = self.pieces[mv[1]]; if (!e) return;
      e.style.transitionDuration = dur + 'ms';
      if ((self.el.ownerDocument || document).body.classList.contains('p2-prem')) self.trail(mv[0], mv[1]);
      e.style.transition = 'none'; e.style.transform = self.tf(mv[0]); e.style.zIndex = 5;
      void e.offsetWidth;
      e.style.transition = ''; e.style.transform = self.tf(mv[1]);
      e.classList.remove('hop'); void e.offsetWidth; e.classList.add('hop');
      setTimeout(function () { e.style.zIndex = ''; e.style.transitionDuration = ''; e.classList.add('land'); }, dur);
    });
    return new Promise(function (res) { setTimeout(res, dur + 10); });
  };
  // golpe da captura: anel que se abre na casa e o tabuleiro treme de leve
  View2D.prototype.hit = function (sq) {
    var c = this.squares[sq]; if (!c) return;
    c.classList.remove('b2-hit'); void c.offsetWidth; c.classList.add('b2-hit');
    setTimeout(function () { c.classList.remove('b2-hit'); }, 520);
    var el = this.el; el.classList.remove('b2-jolt'); void el.offsetWidth; el.classList.add('b2-jolt');
    setTimeout(function () { el.classList.remove('b2-jolt'); }, 260);
    this.scar(sq);
  };
  // marca sutil de dano apos a luta (nao tapa a peca)
  View2D.prototype.scar = function (sq) {
    var c = this.squares[sq]; if (!c) return;
    c.classList.add('b2-scar');
    if (!this._scars) this._scars = {};
    this._scars[sq] = (this._scars[sq] || 0) + 1;
    if (this._scars[sq] > 2) c.classList.add('b2-scar2');
  };
  View2D.prototype.clearScars = function () {
    this._scars = {};
    for (var k in this.squares) this.squares[k].classList.remove('b2-scar', 'b2-scar2');
  };
  View2D.prototype.highlight = function (h) {
    for (var k in this.squares) {
      var sq = +k, cl = this.squares[k].classList;
      cl.toggle('sel', h.sel === sq);
      if (this.pieces[sq]) this.pieces[sq].classList.toggle('lifted', h.sel === sq);
      cl.toggle('last', !!h.last && (h.last.from === sq || h.last.to === sq));
      cl.toggle('check', h.check === sq);
      cl.toggle('hint', !!h.hint && (h.hint.from === sq || h.hint.to === sq));
      var d = h.dests && h.dests[sq];
      cl.toggle('dot', d === 1); cl.toggle('ring', d === 2);
    }
  };
  View2D.prototype.setOrient = function (o) { this.orient = o; this.place(); if (this._arrow) this.arrow(this._arrow[0], this._arrow[1]); if (this._mark) this.mark(this._mark[0], this._mark[1]); };
  // seta do melhor lance (Rever partida)
  View2D.prototype.arrow = function (from, to) {
    if (this.arrowEl) { this.arrowEl.remove(); this.arrowEl = null; }
    this._arrow = from >= 0 ? [from, to] : null;
    if (from < 0) return;
    var a = this.cell(from), b = this.cell(to), x1 = a.c + 0.5, y1 = a.r + 0.5, x2 = b.c + 0.5, y2 = b.r + 0.5;
    var L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, px = -uy, py = ux;
    var hx = x2 - ux * 0.42, hy = y2 - uy * 0.42, sx = x1 + ux * 0.2, sy = y1 + uy * 0.2, w = 0.11, hw = 0.3;
    var pts = [[sx + px * w, sy + py * w], [hx + px * w, hy + py * w], [hx + px * hw, hy + py * hw], [x2 - ux * 0.08, y2 - uy * 0.08], [hx - px * hw, hy - py * hw], [hx - px * w, hy - py * w], [sx - px * w, sy - py * w]];
    var e = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); e.setAttribute('viewBox', '0 0 8 8'); e.setAttribute('class', 'b2-arrow');
    e.innerHTML = '<polygon points="' + pts.map(function (p) { return p[0].toFixed(3) + ',' + p[1].toFixed(3); }).join(' ') + '"/>';
    this.el.appendChild(e); this.arrowEl = e;
  };
  // selo do lance (!!, ?, ??) no canto da casa
  View2D.prototype.mark = function (sq, mk) {
    if (this.markEl) { this.markEl.remove(); this.markEl = null; }
    this._mark = sq >= 0 ? [sq, mk] : null;
    if (sq < 0 || !mk) return;
    var p = this.cell(sq), e = document.createElement('div'); e.className = 'b2-mark k-' + mk.c; e.textContent = mk.s;
    e.style.left = ((p.c + 1) * 12.5) + '%'; e.style.top = (p.r * 12.5) + '%';
    this.el.appendChild(e); this.markEl = e;
  };
  View2D.prototype.sqAt = function (x, y) {
    var r = this.el.getBoundingClientRect();
    var c = Math.floor((x - r.left) / r.width * 8), rr = Math.floor((y - r.top) / r.height * 8);
    if (c < 0 || c > 7 || rr < 0 || rr > 7) return -1;
    return this.orient === 0 ? (7 - rr) * 16 + c : rr * 16 + (7 - c);
  };
  View2D.prototype.bindInput = function () {
    var self = this, drag = null;
    this.el.addEventListener('pointerdown', function (e) {
      if (e.button === 2) { if (drag) { drag.el.classList.remove('dragging'); drag.el.style.transform = self.tf(drag.sq); drag = null; } return; }
      if (e.button > 0) return;
      e.preventDefault(); setHover(-1, '');
      var sq = self.sqAt(e.clientX, e.clientY); if (sq < 0) return;
      var app = self.app, wasSel = app.sel === sq;
      if (!wasSel) app.onSquare(sq);
      if (app.sel === sq && self.pieces[sq]) {
        drag = { sq: sq, x: e.clientX, y: e.clientY, moved: false, wasSel: wasSel, el: self.pieces[sq], id: e.pointerId };
        try { self.el.setPointerCapture(e.pointerId); } catch (er) { }
      } else drag = null;
    });
    // mouse: casa sob o cursor ganha destaque e o cursor mostra o que da para fazer
    var hov = -1;
    function setHover(sq, kind) {
      if (hov >= 0 && self.squares[hov]) self.squares[hov].classList.remove('hov', 'hov-t');
      hov = kind ? sq : -1;
      if (hov >= 0) self.squares[hov].classList.add(kind === 'pointer' ? 'hov-t' : 'hov');
      self.el.style.cursor = drag && drag.moved ? 'grabbing' : (kind || '');
    }
    this.clearHover = function () { setHover(-1, ''); };
    this.el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !drag) setHover(-1, ''); });
    this.el.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') {
        var hs = self.sqAt(e.clientX, e.clientY);
        if (drag && drag.moved) setHover(hs, hs >= 0 && hs !== drag.sq && self.app.dests && self.app.dests[hs] ? 'pointer' : '');
        else setHover(hs, self.app.hoverKind ? self.app.hoverKind(hs) : '');
        if (drag && drag.moved) self.el.style.cursor = 'grabbing';
      }
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && dx * dx + dy * dy < 64) return;
      drag.moved = true;
      var r = self.el.getBoundingClientRect(), size = r.width / 8;
      drag.el.classList.add('dragging');
      drag.el.style.transform = 'translate(' + (e.clientX - r.left - size / 2) + 'px,' + (e.clientY - r.top - size * 0.75) + 'px) scale(1.25)';
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      d.el.classList.remove('dragging'); setHover(-1, '');
      if (d.moved) {
        var to = self.sqAt(e.clientX, e.clientY);
        if (to >= 0 && to !== d.sq && self.app.tryMove(d.sq, to, { instant: true })) return;
        d.el.style.transform = self.tf(d.sq);
      } else if (d.wasSel) self.app.clearSel();
    }
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', function (e) { if (drag) { drag.el.classList.remove('dragging'); drag.el.style.transform = self.tf(drag.sq); drag = null; } });
  };
  // faiscas em CSS sobre uma casa
  View2D.prototype.burst = function (sq, colors, n, power) {
    var p = this.cell(sq), b = document.createElement('div');
    b.className = 'b2-burst'; b.style.left = (p.c * 12.5 + 6.25) + '%'; b.style.top = (p.r * 12.5 + 6.25) + '%';
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = (30 + Math.random() * 45) * power;
      s.style.setProperty('--x', Math.cos(a) * d + 'px'); s.style.setProperty('--y', Math.sin(a) * d + 'px');
      s.style.background = colors[i % colors.length]; s.style.animationDelay = (Math.random() * 0.06) + 's';
      var z = 4 + Math.random() * 5; s.style.width = s.style.height = z + 'px';
      b.appendChild(s);
    }
    this.el.appendChild(b);
    setTimeout(function () { b.remove(); }, 1100);
  };
  View2D.prototype.celebrate = function (r) {
    var self = this;
    if (r && r.reason === 'mate' && r.kingSq >= 0) {
      var k = this.pieces[r.kingSq]; if (k) k.classList.add('b2-fall');
      for (var i = 0; i < 4; i++) setTimeout(function () { self.burst(16 * Math.floor(Math.random() * 8) + Math.floor(Math.random() * 8), ['#ffe08a', '#ffffff', '#7fe3ff', '#ff9de0', '#ffd24a'], 18, 1.6); }, 300 + i * 260);
    } else if (r) this.burst(0x34, ['#9fd8ff', '#ffffff', '#c8b8ff'], 22, 1.8);
  };
  window.View2D = View2D;
})();
