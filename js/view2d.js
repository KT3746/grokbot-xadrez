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
    this.place();
    this.bindInput();
  }
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
    }
    moves.forEach(function (mv) {
      var e = self.pieces[mv[1]]; if (!e) return;
      e.style.transition = 'none'; e.style.transform = self.tf(mv[0]); e.style.zIndex = 5;
      void e.offsetWidth;
      e.style.transition = ''; e.style.transform = self.tf(mv[1]);
      setTimeout(function () { e.style.zIndex = ''; e.classList.add('land'); }, 230);
    });
    return new Promise(function (res) { setTimeout(res, 240); });
  };
  View2D.prototype.highlight = function (h) {
    for (var k in this.squares) {
      var sq = +k, cl = this.squares[k].classList;
      cl.toggle('sel', h.sel === sq);
      if (this.pieces[sq]) this.pieces[sq].classList.toggle('lifted', h.sel === sq);
      cl.toggle('last', !!h.last && (h.last.from === sq || h.last.to === sq));
      cl.toggle('check', h.check === sq);
      var d = h.dests && h.dests[sq];
      cl.toggle('dot', d === 1); cl.toggle('ring', d === 2);
    }
  };
  View2D.prototype.setOrient = function (o) { this.orient = o; this.place(); };
  View2D.prototype.sqAt = function (x, y) {
    var r = this.el.getBoundingClientRect();
    var c = Math.floor((x - r.left) / r.width * 8), rr = Math.floor((y - r.top) / r.height * 8);
    if (c < 0 || c > 7 || rr < 0 || rr > 7) return -1;
    return this.orient === 0 ? (7 - rr) * 16 + c : rr * 16 + (7 - c);
  };
  View2D.prototype.bindInput = function () {
    var self = this, drag = null;
    this.el.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      e.preventDefault();
      var sq = self.sqAt(e.clientX, e.clientY); if (sq < 0) return;
      var app = self.app, wasSel = app.sel === sq;
      if (!wasSel) app.onSquare(sq);
      if (app.sel === sq && self.pieces[sq]) {
        drag = { sq: sq, x: e.clientX, y: e.clientY, moved: false, wasSel: wasSel, el: self.pieces[sq], id: e.pointerId };
        try { self.el.setPointerCapture(e.pointerId); } catch (er) { }
      } else drag = null;
    });
    this.el.addEventListener('pointermove', function (e) {
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
      d.el.classList.remove('dragging');
      if (d.moved) {
        var to = self.sqAt(e.clientX, e.clientY);
        if (to >= 0 && to !== d.sq && self.app.tryMove(d.sq, to, { instant: true })) return;
        d.el.style.transform = self.tf(d.sq);
      } else if (d.wasSel) self.app.clearSel();
    }
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', function (e) { if (drag) { drag.el.classList.remove('dragging'); drag.el.style.transform = self.tf(drag.sq); drag = null; } });
  };
  View2D.prototype.celebrate = function () { };
  window.View2D = View2D;
})();
