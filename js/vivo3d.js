/* XADREZAO: modo Xadrez Vivo. Estatuas de pedra gigantes num salao antigo, tudo feito em codigo.
   Reaproveita a vista 3D (camera, toque, marcas, qualidade automatica) e troca cenario, pecas e animacoes. */
export function makeVivo(M) {
  const { THREE, View3D, mergeGeometries, H } = M;
  const { sqPos, ease, easeOut, now, rnd, glowCanvas, noiseCanvas, ctex, normalFrom } = H;
  const E = window.XEngine;
  const VV = { alta: 1.12, media: 0.9, baixa: 0.62 };
  const snd = (n) => { if (window.XSound) window.XSound.play(n); };

  // ---------- geometria ----------
  function col(g, v) {
    g = g.index ? g.toNonIndexed() : g;
    const n = g.attributes.position.count, c = new Float32Array(n * 3).fill(v);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    return g;
  }
  const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
  const sph = (r, w = 12, hh = 9) => new THREE.SphereGeometry(r, w, hh);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  function P(g, x, y, z, tone = 1, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    if (sx !== 1 || sy !== 1 || sz !== 1) g.scale(sx, sy, sz);
    if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry);
    g.translate(x, y, z); return col(g, tone);
  }
  const merge = (a) => { const g = mergeGeometries(a); g.computeBoundingBox(); return g; };
  function plinth() {
    return [P(cyl(0.34, 0.38, 0.1, 8), 0, 0.05, 0, 0.8, 0, Math.PI / 8), P(cyl(0.29, 0.33, 0.05, 8), 0, 0.125, 0, 0.88, 0, Math.PI / 8)];
  }
  function sword(len) {
    return merge([P(box(0.028, len, 0.012), 0, 0.03 + len / 2, 0, 1.05), P(box(0.11, 0.022, 0.035), 0, 0.03, 0, 0.8), P(cyl(0.014, 0.014, 0.08, 6), 0, -0.02, 0, 0.75), P(sph(0.022, 6, 5), 0, -0.065, 0, 0.8)]);
  }
  function staff(len, orb) {
    return merge([P(cyl(0.016, 0.018, len, 6), 0, len / 2 - 0.42, 0, 0.8), P(sph(orb, 10, 8), 0, len - 0.42 + orb * 0.6, 0, 1.25), P(cyl(0.03, 0.02, 0.05, 6), 0, len - 0.44, 0, 0.9)]);
  }
  function buildParts() {
    const Pp = {};
    // Peao: soldado com escudo e espada
    Pp[E.P] = { h: 0.9, body: merge([...plinth(),
      P(cyl(0.045, 0.05, 0.18, 6), -0.06, 0.24, 0, 0.82), P(cyl(0.045, 0.05, 0.18, 6), 0.06, 0.24, 0, 0.82),
      P(cyl(0.12, 0.16, 0.22), 0, 0.4, 0, 0.95), P(cyl(0.128, 0.128, 0.035), 0, 0.5, 0, 0.7), P(cyl(0.14, 0.12, 0.16), 0, 0.58, 0, 1),
      P(sph(0.06, 8, 6), -0.14, 0.64, 0, 0.95), P(sph(0.06, 8, 6), 0.14, 0.64, 0, 0.95),
      P(sph(0.085), 0, 0.75, 0, 1.02), P(new THREE.SphereGeometry(0.098, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.765, 0, 0.88),
      P(box(0.025, 0.07, 0.17), 0, 0.875, 0.01, 0.78), P(box(0.2, 0.018, 0.03), 0, 0.77, -0.085, 0.7),
      P(cyl(0.15, 0.15, 0.035, 14), -0.16, 0.47, -0.08, 0.72, Math.PI / 2, 0.45), P(sph(0.035, 8, 6), -0.175, 0.47, -0.1, 0.95)]),
      weapon: { geo: sword(0.3), pivot: new THREE.Vector3(0.17, 0.47, -0.05), rest: -0.25 } };
    // Cavalo: cavalo de pedra empinando
    Pp[E.N] = { h: 1.05, body: merge([...plinth(),
      P(cyl(0.05, 0.045, 0.24, 6), -0.08, 0.26, -0.1, 0.8, -0.3), P(cyl(0.05, 0.045, 0.24, 6), 0.08, 0.26, -0.1, 0.8, -0.3),
      P(sph(0.2), 0, 0.4, 0.04, 0.95, 0, 0, 0, 1, 1.05, 1.2),
      P(cyl(0.11, 0.15, 0.42), 0, 0.64, -0.05, 1, -0.5),
      P(box(0.17, 0.17, 0.36), 0, 0.85, -0.2, 1.02, 0.6), P(cyl(0.075, 0.085, 0.09, 10), 0, 0.74, -0.34, 0.92, 0.6 + Math.PI / 2),
      P(cyl(0, 0.035, 0.11, 5), -0.055, 1.0, -0.07, 0.95), P(cyl(0, 0.035, 0.11, 5), 0.055, 1.0, -0.07, 0.95),
      P(box(0.05, 0.42, 0.09), 0, 0.72, 0.07, 0.72, -0.45),
      P(sph(0.022, 6, 5), -0.088, 0.91, -0.22, 0.25), P(sph(0.022, 6, 5), 0.088, 0.91, -0.22, 0.25)]) };
    // Torre: torre que anda
    const cren = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cren.push(P(box(0.1, 0.11, 0.1), Math.sin(a) * 0.23, 0.865, Math.cos(a) * 0.23, 0.95, 0, a)); }
    Pp[E.R] = { h: 0.95, body: merge([...plinth(),
      P(box(0.12, 0.08, 0.19), -0.11, 0.19, -0.03, 0.75), P(box(0.12, 0.08, 0.19), 0.11, 0.19, -0.03, 0.75),
      P(cyl(0.25, 0.27, 0.5, 14), 0, 0.48, 0, 1), P(cyl(0.272, 0.272, 0.04, 14), 0, 0.63, 0, 0.78), P(cyl(0.29, 0.27, 0.08, 14), 0, 0.77, 0, 0.95), ...cren,
      P(box(0.13, 0.19, 0.05), 0, 0.33, -0.25, 0.32), P(box(0.05, 0.09, 0.04), 0, 0.57, -0.255, 0.3),
      P(cyl(0.045, 0.04, 0.2, 6), -0.29, 0.5, -0.02, 0.88, 0, 0, 0.35), P(cyl(0.045, 0.04, 0.2, 6), 0.29, 0.5, -0.02, 0.88, 0, 0, -0.35)]) };
    // Bispo: figura de manto com cajado
    Pp[E.B] = { h: 1.08, body: merge([...plinth(),
      P(cyl(0.13, 0.24, 0.56, 14), 0, 0.43, 0, 0.95), P(cyl(0.165, 0.17, 0.04, 14), 0, 0.55, 0, 0.7),
      P(sph(0.15), 0, 0.72, 0, 1, 0, 0, 0, 1, 0.7, 0.9), P(sph(0.085), 0, 0.86, -0.01, 1.02),
      P(cyl(0, 0.115, 0.24, 12), 0, 0.97, 0, 0.9), P(box(0.02, 0.1, 0.13), 0, 1.0, -0.06, 0.7),
      P(cyl(0.05, 0.07, 0.24, 8), -0.14, 0.62, -0.06, 0.92, -0.9), P(sph(0.045, 8, 6), -0.1, 0.56, -0.16, 1)]),
      weapon: { geo: staff(0.98, 0.055), pivot: new THREE.Vector3(0.19, 0.56, -0.07), rest: -0.08 } };
    // Dama: coroa, capa e cetro
    Pp[E.Q] = { h: 1.16, crownY: 1.02, body: merge([...plinth(),
      P(cyl(0.15, 0.27, 0.52, 16), 0, 0.41, 0, 0.98), P(cyl(0.15, 0.12, 0.2, 12), 0, 0.76, 0, 1),
      P(sph(0.06, 8, 6), -0.13, 0.84, 0, 0.95), P(sph(0.06, 8, 6), 0.13, 0.84, 0, 0.95),
      P(cyl(0.13, 0.1, 0.06, 12), 0, 0.87, 0, 0.82), P(sph(0.085), 0, 0.95, 0, 1.03),
      P(cyl(0.14, 0.31, 0.74, 14), 0, 0.5, 0.13, 0.7, 0, 0, 0, 1, 1, 0.45)]),
      weapon: { geo: staff(0.62, 0.045), pivot: new THREE.Vector3(0.19, 0.62, -0.08), rest: -0.2 } };
    const qc = [P(cyl(0.088, 0.078, 0.055, 12), 0, 0.028, 0, 1)];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; qc.push(P(cyl(0, 0.024, 0.075, 4), Math.sin(a) * 0.08, 0.09, Math.cos(a) * 0.08, 1)); qc.push(P(sph(0.016, 6, 4), Math.sin(a) * 0.08, 0.135, Math.cos(a) * 0.08, 1.1)); }
    Pp[E.Q].crown = merge(qc);
    // Rei: coroa com cruz, barba, capa e espada
    Pp[E.K] = { h: 1.3, crownY: 1.07, body: merge([...plinth(),
      P(cyl(0.17, 0.28, 0.54, 16), 0, 0.42, 0, 0.98), P(cyl(0.17, 0.14, 0.22, 12), 0, 0.79, 0, 1),
      P(sph(0.07, 8, 6), -0.15, 0.88, 0, 0.95), P(sph(0.07, 8, 6), 0.15, 0.88, 0, 0.95),
      P(sph(0.09), 0, 1.0, 0, 1.03), P(cyl(0.07, 0.015, 0.13, 8), 0, 0.92, -0.06, 0.85),
      P(cyl(0.16, 0.34, 0.8, 14), 0, 0.53, 0.14, 0.68, 0, 0, 0, 1, 1, 0.45), P(cyl(0.18, 0.18, 0.04, 14), 0, 0.6, 0, 0.7)]),
      weapon: { geo: sword(0.4), pivot: new THREE.Vector3(0.21, 0.6, -0.06), rest: -0.25 } };
    const kc = [P(cyl(0.1, 0.092, 0.075, 12), 0, 0.038, 0, 1), P(box(0.03, 0.13, 0.03), 0, 0.15, 0, 1.05), P(box(0.095, 0.03, 0.03), 0, 0.17, 0, 1.05)];
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; kc.push(P(box(0.035, 0.06, 0.035), Math.sin(a) * 0.09, 0.09, Math.cos(a) * 0.09, 1, 0, a)); }
    Pp[E.K].crown = merge(kc);
    // estatuas grandes: mais largas e um pouco mais altas que as pecas normais
    const SX = 1.2, SY = 1.1;
    for (const k in Pp) {
      const q = Pp[k]; q.body.scale(SX, SY, SX); q.body.computeBoundingBox(); q.h *= SY;
      if (q.weapon) { q.weapon.geo.scale(SX, SY, SX); q.weapon.pivot.set(q.weapon.pivot.x * SX, q.weapon.pivot.y * SY, q.weapon.pivot.z * SX); }
      if (q.crown) { q.crown.scale(SX, SY, SX); q.crownY *= SY; }
    }
    return Pp;
  }

  // ---------- texturas ----------
  function boardCanvas() {
    const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', { willReadFrequently: true });
    const q = S / 8;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const light = ((r + f) & 1) === 1, x = f * q, y = r * q, v = rnd(-9, 9);
      const base = light ? [205, 188, 146] : [93, 99, 92];
      g.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0})`; g.fillRect(x, y, q, q);
      // manchas
      for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${light ? '90,70,40' : '20,25,20'},${rnd(0.03, 0.08)})`; g.beginPath(); g.ellipse(x + rnd(0, q), y + rnd(0, q), rnd(8, 40), rnd(6, 30), rnd(0, 3), 0, 7); g.fill(); }
      // rachaduras
      const nc = Math.random() < 0.55 ? (Math.random() < 0.4 ? 2 : 1) : 0;
      for (let i = 0; i < nc; i++) {
        let px = x + rnd(0.1, 0.9) * q, py = y + (Math.random() < 0.5 ? 2 : q - 2), ang = py > y + q / 2 ? -Math.PI / 2 : Math.PI / 2;
        g.strokeStyle = `rgba(15,10,6,${rnd(0.45, 0.7)})`; g.lineWidth = rnd(1.2, 2.4); g.beginPath(); g.moveTo(px, py);
        const steps = 5 + (Math.random() * 6 | 0);
        for (let k = 0; k < steps; k++) { ang += rnd(-0.7, 0.7); px += Math.cos(ang) * rnd(8, 18); py += Math.sin(ang) * rnd(8, 18); px = Math.max(x + 3, Math.min(x + q - 3, px)); py = Math.max(y + 3, Math.min(y + q - 3, py)); g.lineTo(px, py); }
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1; g.stroke();
      }
      // cantos lascados
      if (Math.random() < 0.35) { g.fillStyle = 'rgba(20,14,8,0.35)'; const cx = x + (Math.random() < 0.5 ? 0 : q), cy = y + (Math.random() < 0.5 ? 0 : q); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (cx > x ? -1 : 1) * rnd(8, 18), cy); g.lineTo(cx, cy + (cy > y ? -1 : 1) * rnd(8, 18)); g.fill(); }
      // juntas entre as lajes
      g.strokeStyle = 'rgba(18,14,10,0.9)'; g.lineWidth = 4; g.strokeRect(x + 1, y + 1, q - 2, q - 2);
      g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2; g.strokeRect(x + 4, y + 4, q - 8, q - 8);
    }
    const img = g.getImageData(0, 0, S, S), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
    return c;
  }
  function borderCanvas() {
    const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#5a5249'; g.fillRect(0, 0, S, S);
    const m = S * 0.8 / 9.6 * 0.8 / 0.8, inner = S / 9.6 * 0.8, cell = S / 9.6;
    // blocos de pedra ao redor
    g.strokeStyle = 'rgba(15,12,9,0.85)'; g.lineWidth = 5;
    for (let i = 0; i < 12; i++) { const p = i * S / 12 + rnd(-8, 8); g.beginPath(); g.moveTo(p, 0); g.lineTo(p, inner); g.moveTo(p, S - inner); g.lineTo(p, S); g.moveTo(0, p); g.lineTo(inner, p); g.moveTo(S - inner, p); g.lineTo(S, p); g.stroke(); }
    g.strokeRect(inner - 2, inner - 2, S - 2 * inner + 4, S - 2 * inner + 4); g.strokeRect(3, 3, S - 6, S - 6);
    g.font = `bold ${cell * 0.42 | 0}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const eng = (t, x, y, rot) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(255,240,210,0.28)'; g.fillText(t, 1.5, 1.5); g.fillStyle = 'rgba(20,14,8,0.8)'; g.fillText(t, 0, 0); g.restore(); };
    for (let i = 0; i < 8; i++) {
      const p = inner + (i + 0.5) * cell;
      eng('abcdefgh'[i], p, S - inner / 2, 0); eng('abcdefgh'[i], p, inner / 2, Math.PI);
      eng(String(8 - i), inner / 2, p, 0); eng(String(8 - i), S - inner / 2, p, Math.PI);
    }
    const img = g.getImageData(0, 0, S, S), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0); void m;
    return c;
  }
  function blocksCanvas(base, w = 512, rows = 8, cols = 4, grout = 'rgba(10,8,6,0.85)') {
    const c = document.createElement('canvas'); c.width = c.height = w; const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = base; g.fillRect(0, 0, w, w);
    const bh = w / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r & 1) ? w / cols / 2 : 0;
      for (let k = -1; k < cols + 1; k++) {
        const x = k * w / cols + off, v = rnd(-14, 14);
        g.fillStyle = `rgba(${v > 0 ? '255,240,220' : '0,0,0'},${Math.abs(v) / 120})`; g.fillRect(x, r * bh, w / cols, bh);
      }
      g.strokeStyle = grout; g.lineWidth = 3; g.beginPath(); g.moveTo(0, r * bh); g.lineTo(w, r * bh); g.stroke();
      for (let k = 0; k <= cols; k++) { const x = k * w / cols + off; g.beginPath(); g.moveTo(x, r * bh); g.lineTo(x, (r + 1) * bh); g.stroke(); }
    }
    const img = g.getImageData(0, 0, w, w), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 30; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
    return c;
  }
  function fogCanvas() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 60; i++) {
      const x = rnd(0, 256), y = rnd(0, 256), r = rnd(20, 70), grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(200,195,190,${rnd(0.12, 0.3)})`); grd.addColorStop(1, 'rgba(200,195,190,0)');
      g.fillStyle = grd; for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { g.save(); g.translate(dx, dy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
    }
    return c;
  }
  // vitral alto em arco: caixilhos de chumbo e vidro azulado de luar
  function windowCanvas() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 384; const g = c.getContext('2d');
    const arch = () => { g.beginPath(); g.moveTo(6, 384); g.lineTo(6, 64); g.arc(64, 64, 58, Math.PI, 0); g.lineTo(122, 384); g.closePath(); };
    arch(); g.fillStyle = '#1a1712'; g.fill();
    g.save(); g.beginPath(); g.moveTo(16, 376); g.lineTo(16, 64); g.arc(64, 64, 48, Math.PI, 0); g.lineTo(112, 376); g.closePath(); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, '#5a74a8'); gr.addColorStop(0.5, '#34497a'); gr.addColorStop(1, '#1d2a4a'); g.fillStyle = gr; g.fillRect(0, 0, 128, 384);
    for (let y = 0; y < 384; y += 24) for (let x = 0; x < 128; x += 24) { g.fillStyle = `rgba(${150 + Math.random() * 60 | 0},${170 + Math.random() * 50 | 0},255,${Math.random() * 0.16})`; g.fillRect(x, y, 24, 24); }
    g.strokeStyle = '#14110d'; g.lineWidth = 3;
    for (let y = 40; y < 384; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    for (const x of [40, 64, 88]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 384); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 384); g.stroke();
    g.restore();
    return c;
  }
  function shaftCanvas() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(170,190,255,0.5)'); gr.addColorStop(1, 'rgba(170,190,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
    return c;
  }

  class VivoView extends View3D {
    constructor(canvas, app) {
      super(canvas, app);
      this.isVivo = true; this.ownSounds = true; this.alwaysAmb = true;
      const a = []; for (const x of [-4.2, 4.2]) for (const z of [-4.2, 4.2]) { a.push(new THREE.Vector3(x, 0, z)); a.push(new THREE.Vector3(x, 1.45, z)); }
      this._fitPts = a; this._fitKey = null;
      if (this.camView !== 'auto' && !VV[this.camView]) this.camView = 'auto';
    }

    buildLights() {
      const s = this.scene;
      this.hemi = new THREE.HemisphereLight(0x9aa2bd, 0x2a1d12, 0.9); s.add(this.hemi);
      const key = new THREE.DirectionalLight(0xdfe6ff, 2.1);
      key.position.set(-2.5, 14, -5); key.castShadow = true;
      const sc = key.shadow.camera; sc.left = -6.5; sc.right = 6.5; sc.top = 6.5; sc.bottom = -6.5; sc.near = 2; sc.far = 28;
      key.shadow.bias = -0.0005; key.shadow.normalBias = 0.025; key.shadow.radius = 4;
      s.add(key); this.key = key;
      // luzes de contorno quentes (tochas), atras das pecas vistas da camera
      this.rim = new THREE.DirectionalLight(0xffb070, 1.1); s.add(this.rim);
      this.rim2 = new THREE.DirectionalLight(0x7f8fc0, 0.5); s.add(this.rim2);
      this.glowLight = new THREE.PointLight(0xffcc66, 0, 8, 2); this.glowLight.position.set(0, 1.5, 0); s.add(this.glowLight);
    }

    buildBoard(mobile) {
      const s = this.scene; this.mobile = mobile;
      const bc = boardCanvas();
      const btex = new THREE.CanvasTexture(bc); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = 8;
      // lajes foscas: sem brilho
      const top = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ map: btex, normalMap: new THREE.CanvasTexture(normalFrom(bc, 3)), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1, metalness: 0, envMapIntensity: 0.1 }));
      top.rotation.x = -Math.PI / 2; top.position.y = 0.004; top.receiveShadow = true; s.add(top); this.boardTop = top;
      const brc = borderCanvas(), brt = new THREE.CanvasTexture(brc); brt.colorSpace = THREE.SRGBColorSpace; brt.anisotropy = 8;
      const border = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 9.6), new THREE.MeshStandardMaterial({ map: brt, normalMap: new THREE.CanvasTexture(normalFrom(brc, 2.5)), normalScale: new THREE.Vector2(0.5, 0.5), roughness: 1, metalness: 0, envMapIntensity: 0.1 }));
      border.rotation.x = -Math.PI / 2; border.position.y = 0.001; border.receiveShadow = true; s.add(border);
      const sideT = ctex(blocksCanvas('#4d463f', 256, 2, 6), true); sideT.repeat.set(3, 1);
      const sideM = new THREE.MeshStandardMaterial({ map: sideT, roughness: 1, envMapIntensity: 0.1 });
      const plat = new THREE.Mesh(box(9.6, 0.7, 9.6), sideM); plat.position.y = -0.352; plat.receiveShadow = true; s.add(plat);
      const step = new THREE.Mesh(box(11.2, 0.28, 11.2), sideM); step.position.y = -0.58; step.receiveShadow = true; s.add(step);
      // marcas de casas (iguais as do 3D normal)
      this.marks = {};
      const planeG = new THREE.PlaneGeometry(0.98, 0.98); planeG.rotateX(-Math.PI / 2);
      const dotG = new THREE.CircleGeometry(0.15, 28); dotG.rotateX(-Math.PI / 2);
      const ringG = new THREE.RingGeometry(0.37, 0.47, 36); ringG.rotateX(-Math.PI / 2);
      this.dotMat = new THREE.MeshBasicMaterial({ color: 0x6ff6c0, transparent: true, opacity: 0.85, depthWrite: false });
      this.ringMat = new THREE.MeshBasicMaterial({ color: 0xff8a5c, transparent: true, opacity: 0.9, depthWrite: false });
      this.selMat = new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.55, depthWrite: false });
      this.hintMat = new THREE.MeshBasicMaterial({ color: 0x50c8ff, transparent: true, opacity: 0.55, depthWrite: false });
      this.lastMat = new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.32, depthWrite: false });
      const checkG = new THREE.PlaneGeometry(1.6, 1.6); checkG.rotateX(-Math.PI / 2);
      this.checkMesh = new THREE.Mesh(checkG, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas('rgba(255,60,30,1)', 'rgba(255,40,30,0)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.checkMesh.position.y = 0.012; this.checkMesh.visible = false; s.add(this.checkMesh);
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const sq = r * 16 + f, p = sqPos(sq);
        const plane = new THREE.Mesh(planeG, this.lastMat); plane.position.set(p.x, 0.008, p.z); plane.visible = false; plane.renderOrder = 1;
        const dot = new THREE.Mesh(dotG, this.dotMat); dot.position.set(p.x, 0.014, p.z); dot.visible = false; dot.renderOrder = 2;
        const ring = new THREE.Mesh(ringG, this.ringMat); ring.position.set(p.x, 0.014, p.z); ring.visible = false; ring.renderOrder = 2;
        s.add(plane, dot, ring);
        this.marks[sq] = { plane, dot, ring };
      }
    }
    setTheme() { }
    setStyle() { this.dirty = true; }
    getStyle() { return this.styles.vivo || this.styles.classico; }

    // o salao de pedra (montado uma vez)
    setEnv() {
      if (this.hall) return;
      this.hall = true; this.envName = 'vivo';
      const s = this.scene, low = this.mobile;
      s.background = new THREE.Color(0x07060a);
      s.fog.color.set(0x0c0a09); s.fog.near = 13; s.fog.far = 44;
      this.renderer.toneMappingExposure = 1.15;
      // materiais das estatuas
      const wm = noiseCanvas(256, '#ece6db', 20, { n: 22, col: () => `rgba(120,110,100,${rnd(0.06, 0.16)})` });
      const bm = noiseCanvas(256, '#4a4643', 26, { n: 34, col: () => Math.random() < 0.6 ? `rgba(10,10,10,${rnd(0.15, 0.35)})` : `rgba(160,150,140,${rnd(0.06, 0.14)})` });
      this.mats = {
        0: new THREE.MeshStandardMaterial({ map: ctex(wm, true), normalMap: ctex(normalFrom(wm, 2), false), normalScale: new THREE.Vector2(0.4, 0.4), color: 0xfbf6ee, roughness: 0.72, metalness: 0, vertexColors: true, envMapIntensity: 0.4 }),
        8: new THREE.MeshStandardMaterial({ map: ctex(bm, true), normalMap: ctex(normalFrom(bm, 2.5), false), normalScale: new THREE.Vector2(0.5, 0.5), color: 0xb8b2ac, roughness: 0.6, metalness: 0, vertexColors: true, envMapIntensity: 0.5 })
      };
      this.mats[0].userData = { cc: 0, sh: 0 }; this.mats[8].userData = { cc: 0, sh: 0 };
      this.styles = { vivo: { geos: null, mats: this.mats } }; this.style = 'vivo';
      const hull = (color, w) => { const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * ' + w.toFixed(4) + ';'); }; return m; };
      this.outlineMats = { 0: hull(0x1e150d, 0.012), 8: hull(0x9a8c7c, 0.008) };
      this.goldMat = new THREE.MeshStandardMaterial({ color: 0xe0b04a, metalness: 0.85, roughness: 0.35, envMapIntensity: 1 });
      this.parts = buildParts();
      this.chunkGeos = [col(new THREE.DodecahedronGeometry(0.11, 0), 0.9), col(new THREE.IcosahedronGeometry(0.09, 0), 1), col(box(0.16, 0.1, 0.13), 0.85), col(new THREE.TetrahedronGeometry(0.12, 0), 0.95)];
      this.debrisGroup = new THREE.Group(); s.add(this.debrisGroup);
      this.debris = []; this.loose = [];
      const grp = new THREE.Group(); s.add(grp); this.envGroup = grp;
      // chao de lajes
      const ft = ctex(blocksCanvas('#3b352f', 512, 4, 4), true); ft.repeat.set(12, 12);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: ft, roughness: 1, envMapIntensity: 0.05 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.72; floor.receiveShadow = true; grp.add(floor);
      // colunas e abobadas
      const ZS = [-15, -9, -3, 3, 9, 15], stoneT = ctex(blocksCanvas('#57504a', 256, 8, 2), true); stoneT.repeat.set(1, 5);
      const stoneM = new THREE.MeshStandardMaterial({ map: stoneT, roughness: 1, envMapIntensity: 0.08 });
      const colG = [], vault = [];
      for (const x of [-9.5, 9.5]) for (const z of ZS) {
        colG.push(P(cyl(0.7, 0.8, 12, low ? 10 : 14), x, 5.3, z, 1), P(box(2, 0.6, 2), x, -0.42, z, 0.85), P(box(1.9, 0.5, 1.9), x, 11.5, z, 0.85));
      }
      for (const x of [-9.5, 9.5]) for (let i = 0; i < ZS.length - 1; i++) vault.push(P(new THREE.TorusGeometry(3, 0.42, 6, 14, Math.PI), x, 11.6, (ZS[i] + ZS[i + 1]) / 2, 0.9, 0, Math.PI / 2));
      for (const z of ZS) vault.push(P(new THREE.TorusGeometry(9.5, 0.4, 6, 26, Math.PI), 0, 11.6, z, 0.8));
      grp.add(new THREE.Mesh(mergeGeometries(colG), stoneM), new THREE.Mesh(mergeGeometries(vault), stoneM));
      const wallT = ctex(blocksCanvas('#3e3832', 512, 8, 4), true); wallT.repeat.set(6, 3);
      const wallM = new THREE.MeshStandardMaterial({ map: wallT, roughness: 1, envMapIntensity: 0.05 });
      const walls = [];
      walls.push(P(new THREE.PlaneGeometry(40, 22), 0, 10, -19, 1));
      walls.push(P(new THREE.PlaneGeometry(40, 22), 0, 10, 19, 1, 0, Math.PI));
      walls.push(P(new THREE.PlaneGeometry(40, 22), -12.5, 10, 0, 1, 0, Math.PI / 2));
      walls.push(P(new THREE.PlaneGeometry(40, 22), 12.5, 10, 0, 1, 0, -Math.PI / 2));
      walls.push(P(new THREE.PlaneGeometry(26, 40), 0, 21, 0, 0.6, Math.PI / 2));
      grp.add(new THREE.Mesh(mergeGeometries(walls), wallM));
      // janelas altas com luar e feixes de luz
      const winT = new THREE.CanvasTexture(windowCanvas()); winT.colorSpace = THREE.SRGBColorSpace;
      const winM = new THREE.MeshBasicMaterial({ map: winT, transparent: true, alphaTest: 0.05, fog: false });
      const winG = [];
      for (const x of [-5, 0, 5]) winG.push(P(new THREE.PlaneGeometry(2.2, 6.6), x, 9.8, -18.9, 1));
      grp.add(new THREE.Mesh(mergeGeometries(winG), winM));
      const glowT = new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
      for (const x of [-5, 0, 5]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0x6c8cc8, transparent: true, opacity: 0.22, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); sp.position.set(x, 9.5, -18.5); sp.scale.set(6, 9, 1); grp.add(sp); }
      const shT = new THREE.CanvasTexture(shaftCanvas());
      this.shafts = [];
      for (const x of [-5, 0, 5]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 22), new THREE.MeshBasicMaterial({ map: shT, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
        m.position.set(x * 0.8, 6, -9); m.rotation.x = -0.62; grp.add(m); this.shafts.push(m);
      }
      // tochas
      const holder = [], fl = new THREE.CanvasTexture(glowCanvas('rgba(255,190,90,1)', 'rgba(255,90,20,0)'));
      this.flames = []; this.torchPos = [];
      for (const x of [-8.6, 8.6]) for (const z of ZS) {
        if (Math.abs(z) > 12) continue;
        holder.push(P(box(0.25, 0.5, 0.25), x, 3, z, 0.6), P(cyl(0.12, 0.05, 0.4, 8), x - Math.sign(x) * 0.15, 3.35, z, 0.5, 0, 0, Math.sign(x) * 0.35));
        const fx = x - Math.sign(x) * 0.25, fp = new THREE.Vector3(fx, 3.75, z);
        for (const [c, sz, op] of [[0xff7a2a, 1.6, 0.55], [0xffd080, 0.6, 0.95]]) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fl, color: c, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
          sp.position.copy(fp); sp.scale.set(sz, sz * 1.3, 1); grp.add(sp); this.flames.push({ sp, s: sz, op, ph: Math.random() * 9 });
        }
        this.torchPos.push(fp);
      }
      grp.add(new THREE.Mesh(mergeGeometries(holder), new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.8, metalness: 0.3, vertexColors: true })));
      this.torchL = [];
      for (const x of [-7.8, 7.8]) { const L = new THREE.PointLight(0xff9a4a, 46, 0, 1.7); L.position.set(x, 3.8, 0); L.userData.base = 46; s.add(L); this.torchL.push(L); }
      // brasas subindo das tochas
      const ne = this.torchPos.length * 12, ep = new Float32Array(ne * 3); this.emberV = new Float32Array(ne);
      for (let i = 0; i < ne; i++) { const tp = this.torchPos[i % this.torchPos.length]; ep[i * 3] = tp.x + rnd(-0.2, 0.2); ep[i * 3 + 1] = tp.y + rnd(0, 2.6); ep[i * 3 + 2] = tp.z + rnd(-0.2, 0.2); this.emberV[i] = rnd(0.5, 1.2); }
      const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
      this.embers = new THREE.Points(eg, new THREE.PointsMaterial({ size: 0.09, map: fl, color: 0xffa040, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      grp.add(this.embers);
      // neblina rasteira
      const fogT = new THREE.CanvasTexture(fogCanvas()); fogT.wrapS = fogT.wrapT = THREE.RepeatWrapping; fogT.repeat.set(5, 5);
      this.fogL = [];
      for (const [y, op, rp] of [[-0.55, 0.42, 5], [-0.3, 0.26, 3.5]]) {
        const t = fogT.clone(); t.needsUpdate = true; t.repeat.set(rp, rp);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: op, depthWrite: false, color: 0xb8b0a6 }));
        m.rotation.x = -Math.PI / 2; m.position.y = y; grp.add(m); this.fogL.push(m);
      }
      // poeira no ar (usa o mesmo laco de ambiente do 3D)
      const n = 90, dp = new Float32Array(n * 3), ph = new Float32Array(n);
      for (let i = 0; i < n; i++) { dp[i * 3] = rnd(-6, 6); dp[i * 3 + 1] = rnd(0.3, 4.8); dp[i * 3 + 2] = rnd(-6, 6); ph[i] = Math.random() * 6.28; }
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      this.motes = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.07, map: glowT, color: 0xd8dcff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      this.motes.userData.ph = ph; grp.add(this.motes);
      if (this.palette && this.palette !== 'classico') this.setPalette(this.palette);
      this.dirty = true; this.shadowDirty = true;
    }
    applyQuality() { super.applyQuality(); this.alwaysAmb = this.level < 5; if (this.fogL) this.fogL[1].visible = this.level < 3; if (this.shafts) for (const m of this.shafts) m.visible = this.level < 4; }

    newMesh(sq, piece) {
      const t = piece & 7, side = piece & 8, Pt = this.parts[t];
      const m = new THREE.Mesh(Pt.body, this.mats[side]); m.castShadow = true; m.receiveShadow = true;
      m.rotation.order = 'YXZ'; m.position.copy(sqPos(sq)); m.rotation.y = side ? Math.PI : 0;
      const ol = new THREE.Mesh(Pt.body, this.outlineMats[side]); ol.renderOrder = -1; ol.visible = this.outlines !== false; m.add(ol);
      const ao = new THREE.Mesh(this.aoGeo, this.aoMat); ao.renderOrder = 1; ao.position.y = 0.007; ao.scale.set(1.1, 1, 1.1); m.add(ao);
      m.userData = { piece, sq, ol, ao, ph: Math.random() * 6.28, h: Pt.h };
      if (Pt.weapon) { const w = new THREE.Mesh(Pt.weapon.geo, this.mats[side]); w.position.copy(Pt.weapon.pivot); w.rotation.x = Pt.weapon.rest; w.castShadow = true; m.add(w); m.userData.weapon = w; m.userData.rest = Pt.weapon.rest; }
      if (Pt.crown) { const c = new THREE.Mesh(Pt.crown, this.goldMat); c.position.y = Pt.crownY; c.castShadow = true; m.add(c); m.userData.crown = c; }
      if (this.aid) this.addBadge(m);
      this.pieceGroup.add(m);
      return m;
    }
    addBadge(m) { super.addBadge(m); if (m.userData.badge) m.userData.badge.position.y = (m.userData.h || 1) + 0.14; }

    sync(board) { this.clearDebris(); super.sync(board); }
    clearDebris() {
      if (!this.debrisGroup) return;
      for (const c of [...this.debrisGroup.children]) this.debrisGroup.remove(c);
      this.debris = []; this.loose = [];
    }

    // ---------- animacoes ----------
    turn(mesh, goal, dur) {
      const y0 = mesh.rotation.y, d = ((goal - y0) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      if (Math.abs(d) < 0.05) { mesh.rotation.y = y0 + d; return Promise.resolve(); }
      return this.tween(dur * (0.6 + Math.abs(d) / Math.PI * 0.6), (k) => { mesh.rotation.y = y0 + d * ease(k); });
    }
    step(mesh, heavy) {
      snd(heavy ? 'stompH' : 'stomp');
      this.shake(heavy ? 0.014 : 0.007);
      this.dust(mesh.position.clone().setY(0), heavy ? 0.45 : 0.25);
    }
    walk(mesh, from, to, dur, heavy, short) {
      const dist = from.distanceTo(to), steps = Math.max(short ? 1 : 2, Math.round(dist * 2.4));
      let last = 0;
      return this.tween(dur, (k) => {
        const e = k * k * (3 - 2 * k) * 0.35 + k * 0.65, w = Math.sin(Math.PI * steps * k);
        mesh.position.set(from.x + (to.x - from.x) * e, Math.abs(w) * (heavy ? 0.045 : 0.075), from.z + (to.z - from.z) * e);
        mesh.rotation.z = w * (heavy ? 0.085 : 0.065); mesh.rotation.x = -Math.sin(Math.PI * k) * 0.08;
        const st = Math.floor(k * steps + 0.5); if (st > last) { last = st; this.step(mesh, heavy); }
      }).then(() => { mesh.rotation.z = 0; mesh.rotation.x = 0; mesh.position.y = 0; });
    }
    leap(mesh, a, b, cap, dir) {
      const dist = a.distanceTo(b); let hit = false;
      snd('leap');
      return this.tween(0.14, (k) => { const s = 1 - Math.sin(Math.PI * k) * 0.08; mesh.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5); mesh.rotation.x = 0.25 * k; })
        .then(() => this.tween(0.5 + dist * 0.05, (k) => {
          const e = ease(k); mesh.scale.set(1, 1, 1);
          mesh.position.set(a.x + (b.x - a.x) * e, Math.sin(Math.PI * k) * 1.15, a.z + (b.z - a.z) * e);
          mesh.rotation.x = 0.25 - k * 0.65;
          if (cap && !hit && k > 0.82) { hit = true; this.shatter(cap, dir, 1.25); }
        }))
        .then(() => {
          mesh.position.y = 0; snd('stompH'); this.shake(0.035); this.dust(b, 1.2);
          return this.tween(0.2, (k) => { const s = 1 - Math.sin(Math.PI * k) * 0.1; mesh.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5); mesh.rotation.x = -0.4 * (1 - k); });
        }).then(() => { mesh.scale.set(1, 1, 1); mesh.rotation.x = 0; });
    }
    strike(mesh, victim, dir, t) {
      const w = mesh.userData.weapon, rest = mesh.userData.rest || 0, p0 = mesh.position.clone();
      const magic = t === E.B || t === E.Q;
      if (!w) {
        // torre: recua e investe
        return this.tween(0.18, (k) => { const e = ease(k); mesh.position.set(p0.x - dir.x * 0.12 * e, 0, p0.z - dir.z * 0.12 * e); mesh.rotation.x = 0.12 * e; })
          .then(() => this.tween(0.13, (k) => { const e = easeOut(k); mesh.position.set(p0.x + dir.x * (0.32 * e - 0.12 * (1 - e)), 0, p0.z + dir.z * (0.32 * e - 0.12 * (1 - e))); mesh.rotation.x = 0.12 - 0.4 * e; }))
          .then(() => { snd('strike'); this.shatter(victim, dir, 1.3); return this.tween(0.2, (k) => { const e = ease(k); mesh.position.set(p0.x + dir.x * 0.32 * (1 - e), 0, p0.z + dir.z * 0.32 * (1 - e)); mesh.rotation.x = -0.28 * (1 - e); }); });
      }
      return this.tween(0.2, (k) => { const e = ease(k); w.rotation.x = rest + 1.0 * e; mesh.rotation.x = 0.08 * e; })
        .then(() => { snd('swing'); return this.tween(0.13, (k) => { const e = easeOut(k); w.rotation.x = rest + 1.0 - 2.5 * e; mesh.rotation.x = 0.08 - 0.26 * e; mesh.position.set(p0.x + dir.x * 0.14 * e, 0, p0.z + dir.z * 0.14 * e); }); })
        .then(() => {
          snd('strike');
          if (magic) { const vp = victim.position.clone().setY(0.6); this.particles.burst(vp, { colors: t === E.B ? ['#9fd8ff', '#ffffff', '#6fb0ff'] : ['#ffe08a', '#fff4d0', '#ffb84a'], count: 40, up: 2, speed: 2.4, life: 0.8, grav: 2 }); this.flash(vp, t === E.B ? 0x8fc0ff : 0xffd27a, 4); }
          this.shatter(victim, dir, 1);
          return this.tween(0.24, (k) => { const e = ease(k); w.rotation.x = rest - 1.5 * (1 - e); mesh.rotation.x = -0.18 * (1 - e); mesh.position.set(p0.x + dir.x * 0.14 * (1 - e), 0, p0.z + dir.z * 0.14 * (1 - e)); });
        });
    }
    // a estatua capturada vira pedregulho e poeira
    shatter(v, dir, power = 1, big = false) {
      const p = v.position.clone(), side = v.userData.piece & 8, h = v.userData.h || 0.9;
      this.pieceGroup.remove(v); this._animMeshes.delete(v);
      for (const k in this.meshes) if (this.meshes[k] === v) delete this.meshes[k];
      const n = big ? (this.level >= 3 ? 16 : 26) : (this.level >= 3 ? 10 : 18), chunks = [], ps = this.pScale || 1;
      for (let i = 0; i < n; i++) {
        const c = new THREE.Mesh(this.chunkGeos[i % 4], this.mats[side]); c.castShadow = this.level < 2;
        c.position.set(p.x + rnd(-0.2, 0.2) * ps, rnd(0.1, h) * ps, p.z + rnd(-0.2, 0.2) * ps);
        const s = rnd(0.65, 1.35) * (big ? 1.25 : 1) * ps; c.scale.set(s, s * rnd(0.6, 1), s); c.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
        const vel = new THREE.Vector3((c.position.x - p.x) * 7 + dir.x * rnd(0.8, 2.6) * power, rnd(2, 4.2) * power, (c.position.z - p.z) * 7 + dir.z * rnd(0.8, 2.6) * power);
        this.debrisGroup.add(c); chunks.push({ c, v: vel, w: new THREE.Vector3(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)), r: 0.06 * s });
      }
      this.debris.push({ chunks, t0: now(), life: (this.speed === 'rapido' ? 1.8 : 2.8) * (this.slowmo || 1) });
      this.particles.burst(p.clone().setY(h * 0.5), { colors: ['#9a9186', '#c8beb0', '#6d665e'], count: big ? 70 : 42, up: 2.4, speed: 2.6, life: 1.0, grav: 7, size: 0.075, normal: true, opacity: 0.95 });
      this.dust(p, big ? 3.2 : 2.4);
      this.particles.burst(p.clone().setY(0.05), { colors: ['#b8ae9f', '#8f877c', '#d8cfbf'], count: big ? 60 : 36, up: 0.7, speed: 3.2, life: 1.4, grav: 0.4, size: 0.22, normal: true, opacity: 0.45 });
      this.flash(p, 0xffb070, 2.4);
      this.shockwave(p, 0xffd7a0);
      if (this.camFx && !big && !this.menu && !this.cam.target && !this.tweens.some((tw) => tw.tag === 'cam')) this.punch(p);
      this.shake(0.075 * power);
      snd(big ? 'crumble' : 'shatter');
    }
    physics(o, dt) {
      if (o.rest) return;
      o.v.y -= 9.8 * dt; o.c.position.addScaledVector(o.v, dt);
      o.c.rotation.x += o.w.x * dt; o.c.rotation.y += o.w.y * dt; o.c.rotation.z += o.w.z * dt;
      const off = Math.abs(o.c.position.x) > 4.8 || Math.abs(o.c.position.z) > 4.8, fl = (off ? -0.44 : 0.004) + (o.r || 0.03);
      if (o.c.position.y < fl) {
        o.c.position.y = fl; o.v.y = -o.v.y * 0.32; o.v.x *= 0.5; o.v.z *= 0.5; o.w.multiplyScalar(0.45);
        if (Math.abs(o.v.y) < 0.35) { o.rest = true; o.v.set(0, 0, 0); if (o.onRest) o.onRest(); }
      }
    }
    onFrame(t, dt) {
      if (!this.hall) return false;
      dt /= (this.slowmo || 1);
      let busy = false;
      // tochas tremulando
      for (const f of this.flames) { const n = 0.86 + Math.sin(t * 13 + f.ph) * 0.07 + Math.sin(t * 23.7 + f.ph * 2) * 0.05 + (Math.random() - 0.5) * 0.05; f.sp.scale.set(f.s * n, f.s * n * 1.3, 1); f.sp.material.opacity = f.op * (0.85 + n * 0.15); }
      for (let i = 0; i < this.torchL.length; i++) { const L = this.torchL[i]; L.intensity = L.userData.base * (0.86 + Math.sin(t * 11 + i * 3) * 0.06 + Math.sin(t * 27 + i) * 0.04 + (Math.random() - 0.5) * 0.05); }
      const ea = this.embers.geometry.attributes.position, nt = this.torchPos.length;
      for (let i = 0; i < this.emberV.length; i++) {
        const tp = this.torchPos[i % nt]; let y = ea.array[i * 3 + 1] + dt * this.emberV[i];
        if (y > tp.y + 2.8) { y = tp.y + 0.1; ea.array[i * 3] = tp.x + rnd(-0.15, 0.15); ea.array[i * 3 + 2] = tp.z + rnd(-0.15, 0.15); }
        ea.array[i * 3 + 1] = y; ea.array[i * 3] += Math.sin(t * 2 + i) * dt * 0.15;
      }
      ea.needsUpdate = true;
      this.fogL[0].material.map.offset.x += dt * 0.006; this.fogL[1].material.map.offset.y -= dt * 0.004; this.fogL[1].material.map.offset.x -= dt * 0.003;
      // estatuas respirando
      for (const k in this.meshes) {
        const m = this.meshes[k];
        if (this._animMeshes.has(m)) continue;
        const ph = m.userData.ph, b = Math.sin(t * 1.7 + ph);
        m.scale.set(1 - b * 0.006, 1 + b * 0.014, 1 - b * 0.006);
        m.rotation.z = Math.sin(t * 0.9 + ph) * 0.012;
        if (m.userData.weapon) m.userData.weapon.rotation.x = m.userData.rest + Math.sin(t * 1.3 + ph) * 0.06;
        if (m === this.checkKing) { m.position.x = sqPos(+k).x + Math.sin(t * 47) * 0.014; m.rotation.z = Math.sin(t * 31) * 0.03; }
        else if (m.position.x !== sqPos(+k).x && +k !== this.selSq) m.position.x = sqPos(+k).x;
      }
      // pedregulhos caindo, quicando e afundando
      if (this.debris.length || this.loose.length) busy = true;
      this.debris = this.debris.filter((d) => {
        const age = t - d.t0;
        for (const o of d.chunks) { this.physics(o, dt); if (age > d.life - 0.8) o.c.position.y -= dt * 0.3; }
        if (age > d.life) { for (const o of d.chunks) this.debrisGroup.remove(o.c); return false; }
        return true;
      });
      for (const o of this.loose) { this.physics(o, dt); if (o.rest && o.c.rotation.x !== o.goalX) { o.c.rotation.x += (o.goalX - o.c.rotation.x) * Math.min(1, dt * 6); o.c.rotation.z *= 0.9; } }
      this.loose = this.loose.filter((o) => !(o.rest && Math.abs(o.c.rotation.x - o.goalX) < 0.01));
      return busy;
    }

    animate(m, board, opts) {
      const mesh = this.meshes[m.from];
      const capSq = (m.flags & E.F_EP) ? m.to + ((m.piece & 8) ? 16 : -16) : m.to;
      const capMesh = m.cap ? this.meshes[capSq] : null;
      if (!mesh || (opts && opts.instant)) { super.sync(board); return Promise.resolve(); }
      delete this.meshes[m.from]; if (capMesh) delete this.meshes[capSq];
      this.meshes[m.to] = mesh;
      const anim = this._animMeshes; anim.add(mesh); if (capMesh) anim.add(capMesh);
      mesh.scale.set(1, 1, 1); mesh.rotation.z = 0;
      if (mesh.userData.weapon) mesh.userData.weapon.rotation.x = mesh.userData.rest;
      const a = sqPos(m.from), b = sqPos(m.to), t = m.piece & 7, rest = (m.piece & 8) ? Math.PI : 0;
      const dir = b.clone().sub(a).setY(0).normalize(), head = Math.atan2(-dir.x, -dir.z), dist = a.distanceTo(b);
      const heavy = t === E.R || t === E.Q || t === E.K;
      const walkDur = (d) => Math.min(1.35, 0.3 + d * 0.17);
      let p = this.turn(mesh, head, 0.16);
      if (t === E.N) p = p.then(() => this.leap(mesh, a, b, capMesh, dir));
      else if (capMesh) {
        const stop = b.clone().addScaledVector(dir, -0.62), d1 = a.distanceTo(stop);
        p = p.then(() => d1 > 0.05 ? this.walk(mesh, a, stop, walkDur(d1), heavy) : null)
          .then(() => this.strike(mesh, capMesh, dir, t))
          .then(() => this.walk(mesh, stop, b, 0.24, heavy, true));
      } else p = p.then(() => this.walk(mesh, a, b, walkDur(dist), heavy));
      const jobs = [p.then(() => this.turn(mesh, rest, 0.16))];
      if (m.flags & E.F_CASTLE) {
        const rf = m.to > m.from ? m.from + 3 : m.from - 4, rt = m.to > m.from ? m.from + 1 : m.from - 1, rook = this.meshes[rf];
        if (rook) {
          delete this.meshes[rf]; this.meshes[rt] = rook; anim.add(rook);
          const ra = sqPos(rf), rb = sqPos(rt), rd = rb.clone().sub(ra).normalize();
          jobs.push(this.turn(rook, Math.atan2(-rd.x, -rd.z), 0.16).then(() => this.walk(rook, ra, rb, walkDur(ra.distanceTo(rb)), true)).then(() => this.turn(rook, rest, 0.16)));
        }
      }
      return Promise.all(jobs).then(() => {
        anim.clear(); this.rushUntil = 0;
        mesh.rotation.y = rest;
        if (m.promo) {
          this.particles.burst(b.clone().setY(0.6), { colors: ['#ffe08a', '#fff4d0', '#ffb84a'], count: 60, up: 2.8, life: 1.3, grav: 3 });
          this.flash(b, 0xffd27a, 4); snd('awaken');
        }
        super.sync(board);
        if (m.promo) { const nm = this.meshes[m.to]; if (nm) { anim.add(nm); this.tween(0.5, (k) => { const s = 0.2 + (1 - Math.pow(1 - k, 3) * Math.cos(k * 5)) * 0.8; nm.scale.set(s, s, s); }).then(() => { nm.scale.set(1, 1, 1); anim.delete(nm); }); } }
      });
    }

    celebrate(result) {
      if (result.reason !== 'mate') {
        this.particles.burst(new THREE.Vector3(0, 0.5, 0), { colors: ['#d8ccb4', '#fff2d0', '#c8b8ff'], count: 80, up: 3, speed: 3, life: 1.6, grav: 3 });
        return;
      }
      const king = this.meshes[result.kingSq]; if (!king) return;
      for (const k in this.meshes) { const bd = this.meshes[k].userData.badge; if (bd) bd.visible = false; }
      const kp = sqPos(result.kingSq), anim = this._animMeshes; anim.add(king);
      snd('rumble');
      this.tween(0.9, (k) => { king.position.x = kp.x + Math.sin(k * 70) * 0.03 * (1 - k * 0.4); king.rotation.z = Math.sin(k * 45) * 0.05; }, 0.25).then(() => {
        const crown = king.userData.crown;
        if (crown) {
          const wp = new THREE.Vector3(), q = new THREE.Quaternion(); king.updateMatrixWorld(true); crown.getWorldPosition(wp); crown.getWorldQuaternion(q);
          king.remove(crown); this.debrisGroup.add(crown); crown.position.copy(wp); crown.quaternion.copy(q); crown.scale.setScalar(this.pScale || 1);
          if (wp.y < 0.5) crown.position.y = (king.userData.h || 1.3) * (this.pScale || 1);
          const side = Math.random() < 0.5 ? 1 : -1;
          this.loose.push({ c: crown, v: new THREE.Vector3(side * rnd(0.5, 0.9), 1.8, rnd(-0.4, 0.4)), w: new THREE.Vector3(rnd(3, 5), 0, rnd(-2, 2)), r: 0.05, goalX: Math.PI / 2 * 0.9, onRest: () => snd('clink') });
          snd('clink');
        }
        return this.tween(0.55, () => { });
      }).then(() => {
        this.shatter(king, new THREE.Vector3(0, 0, 0), 1.2, true);
        this.glowLight.color.set(0xffaa55); this.glowLight.position.set(kp.x, 1.5, kp.z);
        this.tween(2.4, (k) => { this.glowLight.intensity = Math.sin(Math.PI * k) * 5; });
      });
      // camera de cinema: desce perto do rei e gira devagar (um toque pula)
      const look = new THREE.Vector3(0, 0.15, 0), tgt = kp.clone().setY(0.5);
      const d0 = (this._fitR || 20) * this.cam.rFactor, th0 = this.cam.theta, p0 = this.cam.phi;
      this.cam.target = look.clone(); this.cam.dist = d0;
      this.tween(3.6, (k) => {
        const e = ease(k);
        this.cam.target.lerpVectors(look, tgt, e); this.cam.dist = d0 + (7.5 - d0) * e;
        this.cam.phi = p0 + (0.42 - p0) * e; this.cam.theta = th0 + 0.75 * e;
      }, 0.15, 'cam');
    }

    intro(short) {
      super.intro(short);
      if (short) return;
      // as estatuas se levantam do chao, fileira por fileira
      snd('awaken');
      const anim = this._animMeshes;
      for (const k in this.meshes) {
        const m = this.meshes[k], r = +k >> 4, d = (r < 4 ? r : 7 - r);
        m.position.y = -1.4; anim.add(m);
        this.tween(0.75, (q) => { const e = 1 - Math.pow(1 - q, 3); m.position.y = -1.4 * (1 - e) + Math.sin(Math.PI * q) * 0.06; }, 0.35 + d * 0.22 + (+k & 7) * 0.025).then(() => { m.position.y = 0; anim.delete(m); if ((+k & 7) === 3) { this.shake(0.012); this.dust(m.position, 0.4); } });
      }
    }

    // ---------- camera (vista mais baixa, de cinema) ----------
    defaultPhi() {
      if (this.menu) return 0.5;
      if (VV[this.camView]) return VV[this.camView];
      if (this._phiFit) return this._phiFit; const a = this.stageAspect || 0.6; return a < 0.8 ? 0.76 : 0.66;
    }
    setCamView(name) {
      this.camView = VV[name] ? name : 'auto'; this._fitKey = null; if (this.camView === 'auto' && this.W) this.fitLayout(this.stage ? this.stage.width : this.W, this._availH || 9999);
      if (this.menu || this.cam.target) return;
      const p0 = this.cam.phi, goal = this.defaultPhi(), t0 = this.cam.theta, gT = this.thetaFor(this.orient);
      const d = ((gT - t0) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      this.cancelCam();
      this.tween(0.6, (k) => { const e = ease(k); this.cam.phi = p0 + (goal - p0) * e; this.cam.theta = t0 + d * e; }, 0, 'cam');
    }
    fitLayout(W, H2) {
      const look = new THREE.Vector3(0, 0.15, 0), big = { width: W, height: W * 4 };
      const need = (phi) => { let n = 0; for (const th of [0, Math.PI]) { const f = this.fitBoard(big, phi, th, look); n = Math.max(n, f.h / 1.92 * big.height); } return n; };
      this._availH = H2;
      if (VV[this.camView]) return Math.ceil(need(VV[this.camView]));
      const base = W / Math.max(1, H2) < 0.8 ? 0.76 : 0.66, maxPhi = 0.82;
      let phi = base;
      if (need(base) < H2) {
        if (need(maxPhi) <= H2) phi = maxPhi;
        else { let lo = base, hi = maxPhi; for (let i = 0; i < 12; i++) { const mm = (lo + hi) / 2; if (need(mm) <= H2) lo = mm; else hi = mm; } phi = lo; }
      }
      const old = this._phiFit; this._phiFit = phi;
      if (old != null && Math.abs(old - phi) > 0.001 && !this.menu && !this.cam.target && !this.tweens.some((tw) => tw.tag === 'cam')) this.cam.phi = phi;
      return Math.ceil(need(phi));
    }
  }
  return VivoView;
}
