/* XADREZAO: modo Xadrez Vivo. Estatuas de pedra gigantes num salao antigo, tudo feito em codigo.
   Reaproveita a vista 3D (camera, toque, marcas, qualidade automatica) e troca cenario, pecas e animacoes. */
export function makeVivo(M) {
  const { THREE, View3D, mergeGeometries, H } = M;
  const { sqPos, ease, easeOut, now, rnd, glowCanvas, noiseCanvas, ctex, normalFrom } = H;
  const E = window.XEngine;
  const VV = { alta: 1.12, media: 0.9, baixa: 0.62 };
  const easeIn = (t) => t * t * t;
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
  // armas de pedra (desenho proprio): espada, montante, lanca, martelo e cajado com lamina curva
  function sword(len, w = 0.028, grip = 0.08) {
    return merge([P(box(w, len, 0.012), 0, 0.03 + len / 2, 0, 1.05), P(cyl(0, w * 0.72, 0.07, 4), 0, 0.03 + len + 0.035, 0, 1.05, 0, Math.PI / 4, 0, 1, 1, 0.43),
      P(box(w * 0.3, len * 0.8, 0.016), 0, 0.03 + len * 0.42, 0, 0.82),
      P(box(0.11 + w * 1.6, 0.022, 0.035), 0, 0.03, 0, 0.8), P(cyl(0.014, 0.014, grip, 6), 0, 0.02 - grip / 2, 0, 0.75), P(sph(0.022, 6, 5), 0, 0.01 - grip, 0, 0.8)]);
  }
  function lance(len) {
    return merge([P(cyl(0.004, 0.032, len, 8), 0, len / 2, 0, 1.04), P(cyl(0.075, 0.012, 0.12, 10), 0, 0.02, 0, 0.82), P(cyl(0.02, 0.022, 0.22, 6), 0, -0.1, 0, 0.75), P(sph(0.026, 6, 5), 0, -0.22, 0, 0.8)]);
  }
  function hammer(len) {
    const top = len - 0.2;
    return merge([P(cyl(0.02, 0.024, len, 6), 0, len / 2 - 0.2, 0, 0.78), P(box(0.12, 0.13, 0.25), 0, top, 0, 1.0), P(box(0.14, 0.15, 0.04), 0, top, 0.115, 0.85), P(box(0.14, 0.15, 0.04), 0, top, -0.115, 0.85),
      P(cyl(0, 0.04, 0.08, 4), 0, top + 0.1, 0, 1.05), P(cyl(0, 0.035, 0.07, 4), 0, top, -0.16, 1.05, -Math.PI / 2), P(cyl(0.03, 0.03, 0.05, 6), 0, -0.2, 0, 0.7)]);
  }
  function glaive(len, orb) {
    const g = [P(cyl(0.016, 0.018, len, 6), 0, len / 2 - 0.42, 0, 0.8), P(sph(orb, 10, 8), 0, len - 0.42 + orb * 0.6, 0, 1.25), P(cyl(0.03, 0.02, 0.05, 6), 0, len - 0.44, 0, 0.9)];
    // lamina curva presa abaixo da esfera, virada para a frente
    for (let i = 0; i < 6; i++) { const a = -0.3 + i * 0.32, r = 0.16; g.push(P(box(0.012, 0.075, 0.03 - i * 0.003), 0, len - 0.52 + Math.sin(a) * r, -0.05 - (1 - Math.cos(a)) * r * 0.9 - i * 0.022, 1.06, a * 0.8)); }
    return merge(g);
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
      weapon: { geo: sword(0.34), pivot: new THREE.Vector3(0.17, 0.47, -0.05), rest: -0.25 } };
    // Cavalo: cavalo de pedra empinando
    Pp[E.N] = { h: 1.05, body: merge([...plinth(),
      P(cyl(0.05, 0.045, 0.24, 6), -0.08, 0.26, -0.1, 0.8, -0.3), P(cyl(0.05, 0.045, 0.24, 6), 0.08, 0.26, -0.1, 0.8, -0.3),
      P(sph(0.2), 0, 0.4, 0.04, 0.95, 0, 0, 0, 1, 1.05, 1.2),
      P(cyl(0.11, 0.15, 0.42), 0, 0.64, -0.05, 1, -0.5),
      P(box(0.17, 0.17, 0.36), 0, 0.85, -0.2, 1.02, 0.6), P(cyl(0.075, 0.085, 0.09, 10), 0, 0.74, -0.34, 0.92, 0.6 + Math.PI / 2),
      P(cyl(0, 0.035, 0.11, 5), -0.055, 1.0, -0.07, 0.95), P(cyl(0, 0.035, 0.11, 5), 0.055, 1.0, -0.07, 0.95),
      P(box(0.05, 0.42, 0.09), 0, 0.72, 0.07, 0.72, -0.45),
      P(sph(0.022, 6, 5), -0.088, 0.91, -0.22, 0.25), P(sph(0.022, 6, 5), 0.088, 0.91, -0.22, 0.25)]),
      weapon: { geo: lance(0.95), pivot: new THREE.Vector3(0.2, 0.6, 0.02), rest: -1.25, tip: 0.95 } };
    // Torre: torre que anda
    const cren = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cren.push(P(box(0.1, 0.11, 0.1), Math.sin(a) * 0.23, 0.865, Math.cos(a) * 0.23, 0.95, 0, a)); }
    Pp[E.R] = { h: 0.95, body: merge([...plinth(),
      P(box(0.12, 0.08, 0.19), -0.11, 0.19, -0.03, 0.75), P(box(0.12, 0.08, 0.19), 0.11, 0.19, -0.03, 0.75),
      P(cyl(0.25, 0.27, 0.5, 14), 0, 0.48, 0, 1), P(cyl(0.272, 0.272, 0.04, 14), 0, 0.63, 0, 0.78), P(cyl(0.29, 0.27, 0.08, 14), 0, 0.77, 0, 0.95), ...cren,
      P(box(0.13, 0.19, 0.05), 0, 0.33, -0.25, 0.32), P(box(0.05, 0.09, 0.04), 0, 0.57, -0.255, 0.3),
      P(cyl(0.045, 0.04, 0.2, 6), -0.29, 0.5, -0.02, 0.88, 0, 0, 0.35), P(cyl(0.045, 0.04, 0.2, 6), 0.29, 0.5, -0.02, 0.88, 0, 0, -0.35)]),
      weapon: { geo: hammer(0.78), pivot: new THREE.Vector3(0.36, 0.44, -0.04), rest: -0.12, tip: 0.58 } };
    // Bispo: figura de manto com cajado
    Pp[E.B] = { h: 1.08, body: merge([...plinth(),
      P(cyl(0.13, 0.24, 0.56, 14), 0, 0.43, 0, 0.95), P(cyl(0.165, 0.17, 0.04, 14), 0, 0.55, 0, 0.7),
      P(sph(0.15), 0, 0.72, 0, 1, 0, 0, 0, 1, 0.7, 0.9), P(sph(0.085), 0, 0.86, -0.01, 1.02),
      P(cyl(0, 0.115, 0.24, 12), 0, 0.97, 0, 0.9), P(box(0.02, 0.1, 0.13), 0, 1.0, -0.06, 0.7),
      P(cyl(0.05, 0.07, 0.24, 8), -0.14, 0.62, -0.06, 0.92, -0.9), P(sph(0.045, 8, 6), -0.1, 0.56, -0.16, 1)]),
      weapon: { geo: glaive(0.98, 0.055), pivot: new THREE.Vector3(0.19, 0.56, -0.07), rest: -0.08, tip: 0.6 } };
    // Dama: coroa, capa e cetro
    Pp[E.Q] = { h: 1.16, crownY: 1.02, body: merge([...plinth(),
      P(cyl(0.15, 0.27, 0.52, 16), 0, 0.41, 0, 0.98), P(cyl(0.15, 0.12, 0.2, 12), 0, 0.76, 0, 1),
      P(sph(0.06, 8, 6), -0.13, 0.84, 0, 0.95), P(sph(0.06, 8, 6), 0.13, 0.84, 0, 0.95),
      P(cyl(0.13, 0.1, 0.06, 12), 0, 0.87, 0, 0.82), P(sph(0.085), 0, 0.95, 0, 1.03),
      P(cyl(0.14, 0.31, 0.74, 14), 0, 0.5, 0.13, 0.7, 0, 0, 0, 1, 1, 0.45)]),
      weapon: { geo: sword(0.6, 0.03), pivot: new THREE.Vector3(0.2, 0.6, -0.08), rest: -0.22, tip: 0.66 } };
    const qc = [P(cyl(0.088, 0.078, 0.055, 12), 0, 0.028, 0, 1)];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; qc.push(P(cyl(0, 0.024, 0.075, 4), Math.sin(a) * 0.08, 0.09, Math.cos(a) * 0.08, 1)); qc.push(P(sph(0.016, 6, 4), Math.sin(a) * 0.08, 0.135, Math.cos(a) * 0.08, 1.1)); }
    Pp[E.Q].crown = merge(qc);
    // Rei: coroa com cruz, barba, capa e espada
    Pp[E.K] = { h: 1.3, crownY: 1.07, body: merge([...plinth(),
      P(cyl(0.17, 0.28, 0.54, 16), 0, 0.42, 0, 0.98), P(cyl(0.17, 0.14, 0.22, 12), 0, 0.79, 0, 1),
      P(sph(0.07, 8, 6), -0.15, 0.88, 0, 0.95), P(sph(0.07, 8, 6), 0.15, 0.88, 0, 0.95),
      P(sph(0.09), 0, 1.0, 0, 1.03), P(cyl(0.07, 0.015, 0.13, 8), 0, 0.92, -0.06, 0.85),
      P(cyl(0.16, 0.34, 0.8, 14), 0, 0.53, 0.14, 0.68, 0, 0, 0, 1, 1, 0.45), P(cyl(0.18, 0.18, 0.04, 14), 0, 0.6, 0, 0.7)]),
      weapon: { geo: sword(0.66, 0.046, 0.16), pivot: new THREE.Vector3(0.22, 0.6, -0.06), rest: -0.22, tip: 0.72 } };
    const kc = [P(cyl(0.1, 0.092, 0.075, 12), 0, 0.038, 0, 1), P(box(0.03, 0.13, 0.03), 0, 0.15, 0, 1.05), P(box(0.095, 0.03, 0.03), 0, 0.17, 0, 1.05)];
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; kc.push(P(box(0.035, 0.06, 0.035), Math.sin(a) * 0.09, 0.09, Math.cos(a) * 0.09, 1, 0, a)); }
    Pp[E.K].crown = merge(kc);
    // estatuas grandes: mais largas e um pouco mais altas que as pecas normais
    const SX = 1.2, SY = 1.1;
    for (const k in Pp) {
      const q = Pp[k]; q.body.scale(SX, SY, SX); q.body.computeBoundingBox(); q.h *= SY;
      if (q.weapon) { if (q.weapon.tip) q.weapon.tip *= SY; q.weapon.geo.scale(SX, SY, SX); q.weapon.pivot.set(q.weapon.pivot.x * SX, q.weapon.pivot.y * SY, q.weapon.pivot.z * SX); }
      if (q.crown) { q.crown.scale(SX, SY, SX); q.crownY *= SY; }
    }
    return Pp;
  }

  // ---------- texturas ----------
  // rachaduras no piso (linhas brancas; a cor vem do material)
  function crackCanvas() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.2); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    const branch = (x, y, a, len, w, depth) => {
      const steps = 5 + (Math.random() * 4 | 0), l = len / steps;
      for (let i = 0; i < steps; i++) {
        a += rnd(-0.5, 0.5); const nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l;
        g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); x = nx; y = ny; w *= 0.84;
        if (depth < 2 && Math.random() < 0.3) branch(x, y, a + rnd(-1.2, 1.2), len * 0.45, w * 0.7, depth + 1);
      }
    };
    const n = 7 + (Math.random() * 5 | 0);
    for (let i = 0; i < n; i++) branch(S / 2 + rnd(-6, 6), S / 2 + rnd(-6, 6), i / n * Math.PI * 2 + rnd(-0.3, 0.3), rnd(70, 118), rnd(3.2, 5.5), 0);
    g.lineWidth = 1.8;
    for (const r of [34, 60]) if (Math.random() < 0.75) { g.beginPath(); const a0 = rnd(0, 6); g.arc(S / 2, S / 2, r + rnd(-5, 5), a0, a0 + rnd(1.5, 3.5)); g.stroke(); }
    return c;
  }
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
      this.isVivo = true; this.ownSounds = true; this.alwaysAmb = true; this.capFx = app.capFx === 'normal' ? 'normal' : 'brutal';
      const a = []; for (const x of [-4.2, 4.2]) for (const z of [-4.2, 4.2]) { a.push(new THREE.Vector3(x, 0, z)); a.push(new THREE.Vector3(x, 1.45, z)); }
      this._fitPts = a; this.frameHalf = 4.8; this.frameYs = [0.02]; this._fitFrame = null; this._fitKey = null;
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
      this.renderer.toneMappingExposure = 1.15; this._exp0 = 1.15;
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
      this.chunkGeos = [col(new THREE.DodecahedronGeometry(0.11, 0), 0.9), col(new THREE.IcosahedronGeometry(0.09, 0), 1), col(box(0.16, 0.1, 0.13), 0.85), col(new THREE.TetrahedronGeometry(0.12, 0), 0.95), col(box(0.2, 0.06, 0.12), 0.88), col(new THREE.OctahedronGeometry(0.1, 0), 0.92)];
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
      if (this.app && this.app.army && this.app.army !== 'estatuas') this.setArmy(this.app.army).catch((e) => console.warn(e));
    }
    applyQuality() { super.applyQuality(); this.alwaysAmb = this.level < 5; if (this.fogL) this.fogL[1].visible = this.level < 3; if (this.shafts) for (const m of this.shafts) m.visible = this.level < 4; }

    partOf(piece) { return this.army ? this.army.parts[piece & 8][piece & 7] : this.parts[piece & 7]; }
    // exercito: estatuas (padrao) ou um tema de guerra (carregado so quando escolhido)
    setArmy(name) {
      name = name === 'cem' || name === 'esparta' ? name : 'estatuas';
      this.armyWant = name;
      if (name === (this.army ? this.army.name : 'estatuas')) return Promise.resolve();
      const apply = (A) => {
        if (this.armyWant !== name || !this.hall) return;
        if (!this._stone) this._stone = { mats: this.mats, ol: this.outlineMats };
        if (A) {
          if (!A.ol) { const hull = (color, w) => { const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * ' + w.toFixed(4) + ';'); }; return m; }; A.ol = { 0: hull(A.outline[0], 0.011), 8: hull(A.outline[8], 0.008) }; }
          this.mats = { 0: A.cloth, 8: A.cloth }; this.outlineMats = A.ol;
        } else { this.mats = this._stone.mats; this.outlineMats = this._stone.ol; }
        this.army = A; this.checkMats = null; this.checkKing = null;
        // refaz as pecas que estao no tabuleiro
        const keep = {}; for (const k in this.meshes) keep[k] = this.meshes[k].userData.piece;
        for (const c of [...this.pieceGroup.children]) this.pieceGroup.remove(c);
        this.meshes = {}; for (const k in keep) this.meshes[k] = this.newMesh(+k, keep[k]);
        if (this.hl) this.highlight(this.hl);
        this.dirty = true; this.shadowDirty = true;
      };
      if (name === 'estatuas') { apply(null); return Promise.resolve(); }
      this._armies = this._armies || {};
      if (this._armies[name]) { apply(this._armies[name]); return Promise.resolve(); }
      return import('./army3d.js' + new URL(import.meta.url).search).then((mod) => {
        const A = this._armies[name] || (this._armies[name] = mod.buildArmy(THREE, mergeGeometries, name, E));
        apply(A);
      });
    }
    newMesh(sq, piece) {
      const t = piece & 7, side = piece & 8, Pt = this.partOf(piece);
      const m = new THREE.Mesh(Pt.body, this.mats[side]); m.castShadow = true; m.receiveShadow = true;
      m.rotation.order = 'YXZ'; m.position.copy(sqPos(sq)); m.rotation.y = side ? Math.PI : 0;
      const ol = new THREE.Mesh(Pt.body, this.outlineMats[side]); ol.renderOrder = -1; ol.visible = this.outlines !== false; m.add(ol);
      const ao = new THREE.Mesh(this.aoGeo, this.aoMat); ao.renderOrder = 1; ao.position.y = 0.007; ao.scale.set(1.1, 1, 1.1); m.add(ao);
      m.userData = { piece, sq, ol, ao, ph: Math.random() * 6.28, h: Pt.h };
      if (Pt.trim) { const tm = new THREE.Mesh(Pt.trim, this.army.metal); tm.castShadow = true; tm.receiveShadow = true; m.add(tm); }
      if (Pt.archer) m.userData.archer = Pt.archer;
      if (Pt.weapon) { const w = new THREE.Mesh(Pt.weapon.geo, this.army ? this.army.metal : this.mats[side]); w.position.copy(Pt.weapon.pivot); w.rotation.x = Pt.weapon.rest; w.castShadow = true; m.add(w); m.userData.weapon = w; m.userData.rest = Pt.weapon.rest; }
      if (Pt.crown) { const c = new THREE.Mesh(Pt.crown, this.goldMat); c.position.y = Pt.crownY; c.castShadow = true; m.add(c); m.userData.crown = c; }
      if (this.aid) this.addBadge(m);
      this.pieceGroup.add(m);
      return m;
    }
    addBadge(m) { super.addBadge(m); if (m.userData.badge) m.userData.badge.position.y = (m.userData.h || 1) + 0.14; }

    // pedregulhos ficam no tabuleiro; somem quando a posicao volta atras (desfazer, nova partida)
    sync(board) {
      let n = 0; for (let i = 0; i < 128; i++) if (!(i & 0x88) && board[i]) n++;
      if (n > Object.keys(this.meshes).length || n >= 32) this.clearDebris();
      super.sync(board);
    }
    clearDebris() {
      if (!this.debrisGroup) return;
      for (const h of this.halves || []) for (const mm of h.mats) mm.dispose();
      this.halves = [];
      for (const c of [...this.debrisGroup.children]) this.debrisGroup.remove(c);
      this.debris = []; this.loose = [];
      for (const c of this.cracks || []) { this.scene.remove(c); c.material.dispose(); }
      this.cracks = [];
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
        const c = new THREE.Mesh(this.chunkGeos[i % 4], this.army ? this.army.chunk[side] : this.mats[side]); c.castShadow = this.level < 2;
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
      const p = o.c.position, off = Math.abs(p.x) > 4.8 || Math.abs(p.z) > 4.8, fl = (off ? -0.44 : 0.004) + (o.r || 0.03);
      if (o.hitP && !off && p.y < 1.7) this.hitStatues(o);
      if (p.y < fl) {
        p.y = fl;
        if (!o.slide) {
          o.v.y = -o.v.y * 0.32; o.v.x *= 0.5; o.v.z *= 0.5; o.w.multiplyScalar(0.45);
          if (Math.abs(o.v.y) < 0.35) { o.rest = true; o.v.set(0, 0, 0); if (o.onRest) o.onRest(); }
        } else if (o.v.y < -0.7) { o.v.y = -o.v.y * o.bnc; o.v.x *= 0.66; o.v.z *= 0.66; o.w.multiplyScalar(0.6); }
        else {
          // rola e arrasta ate parar
          o.v.y = 0; const f = Math.pow(0.012, dt); o.v.x *= f; o.v.z *= f; o.w.multiplyScalar(f);
          if (o.v.x * o.v.x + o.v.z * o.v.z < 0.015) { o.rest = true; o.v.set(0, 0, 0); }
        }
      }
    }
    // pedregulho bate nas estatuas que estao em pe e ricocheteia
    hitStatues(o) {
      const ps = this.pScale || 1, R2 = 0.3 * ps, p = o.c.position;
      for (const m of this.pieceGroup.children) {
        const dx = p.x - m.position.x, dz = p.z - m.position.z, d2 = dx * dx + dz * dz;
        if (d2 < R2 * R2 && p.y < (m.userData.h || 1) * ps) {
          const d = Math.sqrt(d2) || 1e-3, nx = dx / d, nz = dz / d;
          p.x = m.position.x + nx * R2; p.z = m.position.z + nz * R2;
          const vn = o.v.x * nx + o.v.z * nz; if (vn < 0) { o.v.x -= 1.6 * vn * nx; o.v.z -= 1.6 * vn * nz; }
        }
      }
    }
    onWarp(lag) { for (const d of this.debris) d.t0 += lag; }
    onFrame(t, dt) {
      if (!this.hall) return false;
      dt /= (this.slowmo || 1);
      let busy = false;
      // tochas tremulando
      const still = this.isPreview, fa = still ? 0.45 : 1;
      for (const f of this.flames) { const n = 0.86 + (Math.sin(t * 13 + f.ph) * 0.07 + Math.sin(t * 23.7 + f.ph * 2) * 0.05 + (Math.random() - 0.5) * 0.05) * fa; f.sp.scale.set(f.s * n, f.s * n * 1.3, 1); f.sp.material.opacity = f.op * (0.85 + n * 0.15); }
      for (let i = 0; i < this.torchL.length; i++) { const L = this.torchL[i]; L.intensity = L.userData.base * (0.86 + (Math.sin(t * 11 + i * 3) * 0.06 + Math.sin(t * 27 + i) * 0.04 + (Math.random() - 0.5) * 0.05) * fa); }
      this.embers.visible = !still;
      if (!still) {
      const ea = this.embers.geometry.attributes.position, nt = this.torchPos.length;
      for (let i = 0; i < this.emberV.length; i++) {
        const tp = this.torchPos[i % nt]; let y = ea.array[i * 3 + 1] + dt * this.emberV[i];
        if (y > tp.y + 2.8) { y = tp.y + 0.1; ea.array[i * 3] = tp.x + rnd(-0.15, 0.15); ea.array[i * 3 + 2] = tp.z + rnd(-0.15, 0.15); }
        ea.array[i * 3 + 1] = y; ea.array[i * 3] += Math.sin(t * 2 + i) * dt * 0.15;
      }
      ea.needsUpdate = true;
      this.fogL[0].material.map.offset.x += dt * 0.006; this.fogL[1].material.map.offset.y -= dt * 0.004; this.fogL[1].material.map.offset.x -= dt * 0.003;
      }
      // estatuas respirando (na previa dos ajustes ficam paradas)
      if (!still) for (const k in this.meshes) {
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
      if (this.loose.length) busy = true;
      this.debris = this.debris.filter((d) => {
        const age = t - d.t0, sink = age > d.life - 0.8;
        for (const o of d.chunks) { if (sink) o.rest = true; this.physics(o, dt); if (!o.rest) busy = true; if (sink) { o.c.position.y -= dt * 0.3; busy = true; } }
        if (age > d.life + (d.long ? 1.6 : 0)) { for (const o of d.chunks) this.debrisGroup.remove(o.c); return false; }
        return true;
      });
      // metades cortadas: o plano de corte acompanha cada metade
      if (this.halves && this.halves.length) { busy = true; for (const h of this.halves) { h.m.updateMatrixWorld(true); h.wp.copy(h.lp).applyMatrix4(h.m.matrixWorld); } }
      // estatuas andando empurram o entulho
      if (this.debris.length && this._animMeshes.size) {
        const ps = this.pScale || 1, R2 = 0.34 * ps;
        for (const m of this._animMeshes) {
          if (!m.parent || m.parent !== this.pieceGroup) continue;
          for (const d of this.debris) for (const o of d.chunks) {
            if (!o.rest || !o.slide) continue;
            const dx = o.c.position.x - m.position.x, dz = o.c.position.z - m.position.z, d2 = dx * dx + dz * dz;
            if (d2 < R2 * R2) { const dd = Math.sqrt(d2) || 1e-3; o.rest = false; o.v.set(dx / dd * rnd(1.2, 2.4), rnd(0.6, 1.6), dz / dd * rnd(1.2, 2.4)); o.w.set(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)); }
          }
        }
      }
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
      const brutal = this.brutal && capMesh;
      if (brutal && this.wantBomb()) {
        // "fogo no buraco!": bomba, tiro de canhao ou pote de fogo, de onde esta
        p = p.then(() => this.bombKill(mesh, capMesh, dir, t))
          .then(() => t === E.N ? this.leap(mesh, a, b, null, dir) : this.walk(mesh, a, b, walkDur(dist), heavy));
      } else if (t === E.N) p = p.then(() => brutal ? this.knightBrutal(mesh, a, b, capMesh, dir) : this.leap(mesh, a, b, capMesh, dir));
      else if (brutal) {
        const stop = b.clone().addScaledVector(dir, -0.66), d1 = a.distanceTo(stop);
        p = p.then(() => d1 > 0.05 ? this.walk(mesh, a, stop, walkDur(d1), heavy) : null)
          .then(() => this.brutalStrike(mesh, capMesh, dir, t, b, head))
          .then((atB) => atB ? null : this.walk(mesh, mesh.position.clone().setY(0), b, 0.24, heavy, true));
      } else if (capMesh) {
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
        super.sync(board); this._lastMover = this.meshes[m.to];
        if (m.promo) { const nm = this.meshes[m.to]; if (nm) { anim.add(nm); this.tween(0.5, (k) => { const s = 0.2 + (1 - Math.pow(1 - k, 3) * Math.cos(k * 5)) * 0.8; nm.scale.set(s, s, s); }).then(() => { nm.scale.set(1, 1, 1); anim.delete(nm); }); } }
      });
    }

    // ---------- capturas brutais (estatuas de pedra, sem sangue) ----------
    get brutal() { return this.capFx !== 'normal'; }
    qL() { return Math.max(0, Math.min(4, this.level | 0)); }
    chunkN(big) { let n = [56, 44, 32, 22, 15][this.qL()]; if (this.mobile) n = Math.round(n * 0.75); if (this.isPreview) n = Math.round(n * 0.8); return big ? Math.round(n * 1.4) : n; }
    rubbleCap() { return (this.mobile ? [150, 115, 85, 60, 45] : [260, 200, 140, 95, 60])[this.qL()]; }
    pickVar(t, n) {
      if (this.forceVar != null) return this.forceVar % n;
      const lv = this._lastVar || (this._lastVar = {}); let v = Math.random() * n | 0;
      if (n > 1 && v === lv[t]) v = (v + 1 + (Math.random() * (n - 1) | 0)) % n;
      lv[t] = v; return v;
    }
    detach(v) {
      this.pieceGroup.remove(v); this._animMeshes.delete(v);
      for (const k in this.meshes) if (this.meshes[k] === v) delete this.meshes[k];
      if (v === this.checkKing) this.checkKing = null;
    }
    // cria pedregulhos com fisica; fn(i, pos, vel, grande) define onde nascem e para onde voam
    spawn(side, n, fn, o = {}) {
      const ps = this.pScale || 1, chunks = [], mat = o.mat || (this.army ? this.army.chunk[side] : this.mats[side]), G = this.chunkGeos;
      for (let i = 0; i < n; i++) {
        const big = i < Math.max(2, Math.round(n * 0.12)), c = new THREE.Mesh(G[i % G.length], mat);
        c.castShadow = this.level < 2 && i < 10;
        const s = (big ? rnd(1.9, 2.9) : rnd(0.6, 1.55)) * (o.size || 1) * ps;
        c.scale.set(s, s * rnd(0.55, 1), s * rnd(0.8, 1.2)); c.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
        const v = new THREE.Vector3(); fn(i, c.position, v, big);
        this.debrisGroup.add(c);
        chunks.push({ c, v, w: new THREE.Vector3(rnd(-12, 12), rnd(-12, 12), rnd(-12, 12)).multiplyScalar(big ? 0.45 : 1), r: 0.065 * s, bnc: rnd(0.28, 0.46), hitP: true, slide: true });
      }
      const t = now();
      this.debris.push({ chunks, t0: t, life: o.life || (this.speed === 'rapido' ? 9 : 16), long: true });
      // limite de entulho: os mais antigos afundam no piso
      let tot = 0; for (const d of this.debris) tot += d.chunks.length;
      for (const d of this.debris) { if (tot <= this.rubbleCap()) break; if (d !== this.debris[this.debris.length - 1] && d.life > t - d.t0 + 0.8) { d.life = t - d.t0 + 0.8; tot -= d.chunks.length; } }
      this.dirty = true;
      return chunks;
    }
    // a estatua explode em pedacos: crush (esmagada, espalha rente ao chao), fling (arremessada), blast (magia, para todo lado), burst
    explode(v, mode, dir, power = 1, o = {}) {
      const ps = this.pScale || 1, p = v.position.clone(), side = v.userData.piece & 8, h = (v.userData.h || 0.9) * ps * (o.hScale || 1), y0 = Math.max(0, p.y);
      this.detach(v); if (v.parent) v.parent.remove(v);
      for (const mm of v.userData.tmpMats || []) mm.dispose();
      const n = Math.round(this.chunkN(o.big) * (o.frac || 1)), out = new THREE.Vector3();
      this.spawn(side, n, (i, pos, vel, big) => {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.24 * ps;
        pos.set(p.x + Math.cos(a) * r, y0 + rnd(0.06, 1) * h, p.z + Math.sin(a) * r);
        out.set(Math.cos(a), 0, Math.sin(a)); const sp = (big ? 0.55 : 1) * power;
        if (mode === 'crush') { pos.y = y0 + rnd(0.04, 0.32) * h; vel.set(out.x * rnd(2.4, 5.5) * sp + dir.x * 1.2, rnd(0.6, 2.4) * sp, out.z * rnd(2.4, 5.5) * sp + dir.z * 1.2); }
        else if (mode === 'fling') vel.set(dir.x * rnd(3, 7) * sp + out.x * rnd(0.5, 2.2), rnd(1.6, 4.2) * sp, dir.z * rnd(3, 7) * sp + out.z * rnd(0.5, 2.2));
        else if (mode === 'blast') { const up = (pos.y - y0) / h - 0.35; vel.set(out.x * rnd(3.5, 7.5) * sp + dir.x * 1.5, (rnd(2, 5) + up * 3) * sp, out.z * rnd(3.5, 7.5) * sp + dir.z * 1.5); }
        else vel.set(out.x * rnd(1.5, 3.5) * sp + dir.x * rnd(1, 3) * sp, rnd(2.4, 5.2) * sp, out.z * rnd(1.5, 3.5) * sp + dir.z * rnd(1, 3) * sp);
      }, o);
      if (!o.noFx) this.impact(p.clone().setY(0), Object.assign({ power, mid: y0 + h * 0.5 }, o));
    }
    // o golpe: faiscas, nuvem de poeira, clarao, tremor, camera lenta, rachadura e o estrondo
    impact(p, o = {}) {
      const big = !!o.big, k = this.qL() >= 3 ? 0.55 : 1, mid = p.clone().setY(o.mid || 0.5), ground = p.clone().setY(0.04);
      this.particles.burst(mid, { colors: o.sparks || ['#ffd27a', '#fff3c4', '#ff8a3a'], count: Math.round((big ? 90 : 60) * k), up: 3.4, speed: 6.5, life: 0.55, grav: 9, size: 0.07 });
      this.particles.burst(mid, { colors: ['#9a9186', '#c8beb0', '#6d665e'], count: Math.round((big ? 80 : 50) * k), up: 2.6, speed: 4.2, life: 1.1, grav: 8, size: 0.08, normal: true, opacity: 0.95 });
      this.particles.burst(ground, { colors: ['#b8ae9f', '#8f877c', '#d8cfbf'], count: Math.round((big ? 70 : 46) * k), up: 0.8, speed: 4.8, life: 2.4, grav: 0.25, size: 0.4, normal: true, opacity: 0.42 });
      this.dust(p, big ? 3.6 : 2.8);
      this.flash(p, o.color || 0xffb070, big ? 16 : 10);
      this.flashExp(big ? 1.6 : 1.0);
      this.shockwave(p, 0xffd7a0); this.tween(0.09, () => { }).then(() => this.shockwave(p, o.color || 0xffb070));
      if (!o.noCrack) this.addCrack(p, big ? 1.6 : 1.1);
      this.shake((big ? 0.34 : 0.22) * Math.min(1.4, o.power || 1));
      if (this.camFx && !this.menu && !this.isPreview && !this.cam.target && !this.tweens.some((tw) => tw.tag === 'cam')) this.punch(p);
      if (!o.noSlow) this.slowMo(big ? 1.3 : 0.8, big ? 0.12 : 0.16);
      if (o.sound !== false) snd(big ? 'crash' : 'smash');
      this.tween(0.34, () => { }).then(() => snd('rubble'));
    }
    flashExp(a) {
      const e0 = this._exp0 || 1.15;
      this.tween(0.45, (k) => { this.renderer.toneMappingExposure = e0 * (1 + a * Math.pow(1 - k, 2.4)); if (k >= 1) this.renderer.toneMappingExposure = e0; });
    }
    addCrack(p, size) {
      if (!this.crackTex) {
        this.crackTex = [0, 1, 2].map(() => new THREE.CanvasTexture(crackCanvas()));
        this.crackGeo = new THREE.PlaneGeometry(1, 1); this.crackGeo.rotateX(-Math.PI / 2);
      }
      this.cracks = this.cracks || [];
      const tex = this.crackTex[Math.random() * 3 | 0], rot = rnd(0, 6.28);
      const m = new THREE.Mesh(this.crackGeo, new THREE.MeshBasicMaterial({ map: tex, color: 0x120c07, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.position.set(p.x, 0.0062, p.z); m.rotation.y = rot; m.scale.setScalar(size * (this.pScale || 1)); this.scene.add(m); this.cracks.push(m);
      const gl = new THREE.Mesh(this.crackGeo, new THREE.MeshBasicMaterial({ map: tex, color: 0xff6a1c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }));
      gl.position.set(p.x, 0.0068, p.z); gl.rotation.y = rot; gl.scale.copy(m.scale); this.scene.add(gl);
      this.tween(0.1, (k) => { m.material.opacity = 0.92 * k; });
      this.tween(1.6, (k) => { gl.material.opacity = Math.pow(1 - k, 1.6); }).then(() => { this.scene.remove(gl); gl.material.dispose(); });
      while (this.cracks.length > 14) { const o = this.cracks.shift(); this.scene.remove(o); o.material.dispose(); }
    }
    tremble(v, dur, amp) {
      const p = v.position.clone(); this._animMeshes.add(v);
      return this.tween(dur, (k) => { const a = amp * (0.4 + k); v.position.x = p.x + Math.sin(k * 97) * a; v.position.z = p.z + Math.cos(k * 83) * a; }).then(() => { v.position.x = p.x; v.position.z = p.z; });
    }
    // a estatua brilha por dentro antes de estourar
    heat(v, color, dur = 0.3, amt = 1.4) {
      const mats = v.userData.tmpMats || (v.userData.tmpMats = []);
      v.traverse((ch) => { if (ch.isMesh && ch.material && ch.material.isMeshStandardMaterial && !mats.includes(ch.material)) { const m = ch.material.clone(); m.emissive = new THREE.Color(color); m.emissiveIntensity = 0; ch.material = m; mats.push(m); } });
      this.tween(dur, (k) => { for (const m of mats) m.emissiveIntensity = amt * k; });
      return mats;
    }
    // corta a estatua em duas metades (plano em coordenadas do mundo)
    cutInTwo(v, n, pt) {
      const ps = this.pScale || 1, side = v.userData.piece & 8;
      this.detach(v); this.renderer.localClippingEnabled = true;
      for (const k of ['ol', 'ao', 'badge', 'ring']) if (v.userData[k]) v.userData[k].visible = false;
      v.scale.setScalar(ps); v.rotation.x = 0; v.rotation.z = 0;
      const ud = v.userData; v.userData = {}; const b = v.clone(); v.userData = ud; b.userData = { piece: ud.piece, h: ud.h };
      this.debrisGroup.add(v, b);
      const out = [];
      for (const [m, sgn] of [[v, 1], [b, -1]]) {
        m.updateMatrixWorld(true);
        const nn = n.clone().multiplyScalar(sgn), wp = new THREE.Plane().setFromNormalAndCoplanarPoint(nn, pt);
        const lp = wp.clone().applyMatrix4(new THREE.Matrix4().copy(m.matrixWorld).invert()), mats = [];
        m.traverse((ch) => {
          if (!ch.isMesh) return;
          if (ch.material === this.outlineMats[side] || ch.material === this.aoMat) { ch.visible = false; return; }
          const mm = ch.material.clone(); mm.clippingPlanes = [wp]; mm.clipShadows = true; mm.side = THREE.DoubleSide; ch.material = mm; mats.push(mm);
        });
        const hf = { m, sgn, wp, lp, mats, n: nn, q0: m.quaternion.clone(), p: m.position.clone(), axis: new THREE.Vector3(0, 1, 0).cross(nn).normalize() };
        out.push(hf);
      }
      this.halves = (this.halves || []).concat(out);
      for (const mm of v.userData.tmpMats || []) mm.dispose(); v.userData.tmpMats = null;
      return out;
    }
    // a metade tomba e se quebra no chao
    breakHalf(hf, power, frac, push, quiet) {
      const m = hf.m, ps = this.pScale || 1, side = m.userData.piece & 8, h = (m.userData.h || 0.9) * ps;
      m.updateMatrixWorld(true);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion), base = m.position.clone();
      this.spawn(side, Math.round(this.chunkN() * frac), (i, pos, vel) => {
        let tries = 0;
        do { pos.copy(base).addScaledVector(up, rnd(0.08, 0.95) * h); pos.x += rnd(-0.2, 0.2) * ps; pos.z += rnd(-0.2, 0.2) * ps; } while (hf.wp.distanceToPoint(pos) < 0 && ++tries < 6);
        pos.y = Math.max(0.06, pos.y);
        const a = Math.random() * 6.283; vel.set(Math.cos(a) * rnd(0.8, 2.8) * power + (push ? push.x : 0), rnd(1, 3) * power, Math.sin(a) * rnd(0.8, 2.8) * power + (push ? push.z : 0));
      });
      const c = base.clone().addScaledVector(up, h * 0.45).setY(0.05);
      this.particles.burst(c.clone().setY(0.3), { colors: ['#9a9186', '#c8beb0', '#6d665e'], count: 32, up: 2, speed: 3, life: 0.9, grav: 8, size: 0.08, normal: true, opacity: 0.9 });
      this.dust(c, 2.2); this.shake(0.13); if (!quiet) snd('shatter');
      if (m.parent) m.parent.remove(m); for (const mm of hf.mats) mm.dispose();
      this.halves = this.halves.filter((x) => x !== hf);
    }
    // metade cai de lado, afastando-se do corte
    topple(hf, dur, dist, ang, lift) {
      const q = new THREE.Quaternion(), ps = this.pScale || 1;
      return this.tween(dur, (k) => {
        const e = k * k, a = e * ang; q.setFromAxisAngle(hf.axis, a);
        hf.m.quaternion.copy(hf.q0).premultiply(q);
        hf.m.position.copy(hf.p).addScaledVector(hf.n, dist * ps * (0.3 * k + 0.7 * e)); hf.m.position.y = hf.p.y + Math.sin(a) * (lift || 0.18) * ps;
      });
    }
    // --- duelo ate a morte: a vitima apara o primeiro golpe, o segundo mata ---
    brutalStrike(mesh, victim, dir, t, b, head) {
      const V = (n) => this.pickVar(t, n);
      let plan;
      if (t === E.P) plan = ['diag', 'decap', 'impale'][V(3)];
      else if (t === E.B) plan = mesh.userData.archer ? ['diag', 'arrow', 'impale', 'arrow'][V(4)] : ['diag', 'decap', 'impale', 'old0'][V(4)];
      else if (t === E.Q) plan = ['diag', 'decap', 'spin', 'old0'][V(4)];
      else if (t === E.K) plan = ['diag', 'decap', 'spin'][V(3)];
      else if (t === E.R) plan = ['smash', 'sweep', 'old1'][V(3)];
      if (!plan || !mesh.userData.weapon) return this.brutalOld(mesh, victim, dir, t, b, head);
      if (plan.startsWith('old')) { const fv = this.forceVar; this.forceVar = +plan[3]; const r = this.brutalOld(mesh, victim, dir, t, b, head); this.forceVar = fv; return r; }
      if (plan === 'arrow') return this.arrowKill(mesh, victim, dir);
      return this.duel(mesh, victim, dir, t, plan === 'impale' ? 1 : 0).then(() => this.finish(mesh, victim, dir, t, plan));
    }
    // camera de luta: chega perto do duelo, segura ate o golpe fatal e volta (um toque pula)
    duelCam(p, dur) {
      if (!this.camFx || this.menu || this.isPreview || this.cam.target || this.tweens.some((tw) => tw.tag === 'cam')) return;
      const off = this.cam.lookOff || (this.cam.lookOff = new THREE.Vector3()), goal = new THREE.Vector3(p.x * 0.85, 0.12, p.z * 0.85), z = this.mobile ? 0.5 : 0.45;
      this.tween(dur, (k) => {
        const a = k < 0.16 ? ease(k / 0.16) : k < 0.7 ? 1 : 1 - ease((k - 0.7) / 0.3);
        off.copy(goal).multiplyScalar(a); this.cam.rFactor = 1 - z * a;
        if (k >= 1) { off.set(0, 0, 0); this.cam.rFactor = 1; }
      }, 0, 'cam');
    }
    // a vitima vira, levanta a arma para se defender; o atacante golpeia e as armas se chocam
    duel(mesh, victim, dir, t, low) {
      this.duelCam(mesh.position.clone().lerp(victim.position, 0.6), 2.4);
      const w = mesh.userData.weapon, rest = mesh.userData.rest || 0, vw = victim.userData.weapon, vrest = victim.userData.rest || 0;
      const ps = this.pScale || 1, p0 = mesh.position.clone(), vp = victim.position.clone(), anim = this._animMeshes; anim.add(victim);
      const vy0 = victim.rotation.y, face = Math.atan2(dir.x, dir.z), dy = ((face - vy0) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      const hammer = t === E.R, up = hammer ? 1.7 : 1.5;
      snd('windup'); this.tremble(victim, 0.25, 0.008);
      if (this.army) { snd(Math.random() < 0.5 ? 'warcry' : 'drum'); this.dust(mesh.position, 1.2); }
      return this.tween(0.26, (k) => {
        const e = ease(k);
        victim.rotation.y = vy0 + dy * e; victim.rotation.x = -0.1 * e;
        if (vw) { vw.rotation.x = vrest - 0.35 * e; vw.rotation.z = 0.95 * e; }
        w.rotation.x = rest + up * e; mesh.rotation.x = 0.14 * e; mesh.rotation.z = (low ? 0 : 0.22) * e;
      }).then(() => { snd('swing'); return this.tween(0.08, (k) => { const e = easeIn(k); w.rotation.x = rest + up - (up + 0.75) * e; mesh.rotation.x = 0.14 - 0.24 * e; mesh.rotation.z = (low ? 0 : 0.22) * (1 - 2 * e); mesh.position.set(p0.x + dir.x * 0.12 * e, 0, p0.z + dir.z * 0.12 * e); }); })
        .then(() => {
          // choque das armas: faiscas de metal, clarao curto, tranco
          const vh = (victim.userData.h || 0.9) * ps, cp = p0.clone().lerp(vp, 0.55).setY(Math.min(vh, (mesh.userData.h || 0.9) * ps) * 0.72);
          snd('clash'); if (hammer) snd('crunch');
          this.particles.burst(cp, { colors: ['#ffffff', '#fff1b8', '#ffc24a', '#ff8a2a'], count: Math.round(70 * (this.qL() >= 3 ? 0.55 : 1)), up: 1.6, speed: 7.5, life: 0.42, grav: 9, size: 0.055 });
          this.flash(cp, 0xfff0c0, 7); this.flashExp(0.5); this.shake(0.12);
          if (this.camFx && !this.menu && !this.isPreview && !this.cam.target && !this.tweens.some((tw) => tw.tag === 'cam')) this.punch(cp);
          const m0 = mesh.position.clone();
          return this.tween(0.2, (k) => {
            const e = easeOut(k), b2 = Math.sin(Math.PI * k);
            w.rotation.x = rest - 0.75 + 1.25 * e; mesh.position.set(m0.x - dir.x * 0.1 * e, 0, m0.z - dir.z * 0.1 * e);
            victim.position.set(vp.x + dir.x * 0.08 * b2, 0, vp.z + dir.z * 0.08 * b2); victim.rotation.x = -0.1 - 0.12 * b2;
            if (vw) vw.rotation.z = 0.95 - 0.7 * e;
          });
        });
    }
    // golpe fatal
    finish(mesh, victim, dir, t, plan) {
      const w = mesh.userData.weapon, rest = mesh.userData.rest || 0, ps = this.pScale || 1, p0 = mesh.position.clone().setY(0);
      const vp = victim.position.clone().setY(0), vh = (victim.userData.h || 0.9) * ps, king = t === E.K, pw = king || t === E.Q ? 1.3 : 1;
      const side = new THREE.Vector3(-dir.z, 0, dir.x), UP = new THREE.Vector3(0, 1, 0), sparks = ['#ffffff', '#ffe6a8', '#ffb050'];
      const recover = (dur = 0.3) => { const from = mesh.position.clone(), rx = mesh.rotation.x, rz = mesh.rotation.z, wx = w.rotation.x, wz = w.rotation.z; return this.tween(dur, (k) => { const e = ease(k); mesh.position.set(from.x + (p0.x - from.x) * e, from.y * (1 - e), from.z + (p0.z - from.z) * e); mesh.rotation.x = rx * (1 - e); mesh.rotation.z = rz * (1 - e); w.rotation.x = wx + (rest - wx) * e; w.rotation.z = wz * (1 - e); }); };
      const kill = () => { this.slowMo(0.6, 0.14); this.flashExp(1.2); };
      if (plan === 'diag' || plan === 'decap' || plan === 'spin') {
        const sgn = Math.random() < 0.5 ? 1 : -1, hv = king ? 1.15 : 1;
        // levanta a arma bem alto (inclinada para o corte diagonal) e desce com tudo
        const tilt = plan === 'diag' ? 0.42 * sgn : 0, h0 = mesh.rotation.y;
        snd('windup');
        let go;
        if (plan === 'spin') {
          go = this.tween(0.26 * hv, (k) => { const e = ease(k); mesh.rotation.y = h0 + 0.8 * e; w.rotation.x = rest - 1.3 * e; mesh.rotation.x = 0.08 * e; })
            .then(() => { snd('swing'); return this.tween(0.13, (k) => { const e = easeIn(k); mesh.rotation.y = h0 + 0.8 - 1.6 * e; }); });
        } else {
          go = this.tween(0.28 * hv, (k) => { const e = ease(k); w.rotation.x = rest + 0.5 + 1.6 * e; mesh.rotation.x = 0.2 * e; mesh.rotation.z = tilt * e; mesh.position.y = 0.06 * e; })
            .then(() => { snd('swing'); return this.tween(0.09, (k) => { const e = easeIn(k); w.rotation.x = rest + 2.1 - (plan === 'decap' ? 3.0 : 3.9) * e; mesh.rotation.x = 0.2 - 0.5 * e; mesh.rotation.z = tilt * (1 - 2 * e); mesh.position.set(p0.x + dir.x * 0.2 * e, 0.06 * (1 - e), p0.z + dir.z * 0.2 * e); }); });
        }
        return go.then(() => {
          snd('cleave'); snd('smash'); snd('crunch'); kill();
          if (plan === 'decap') this.decapitate(victim, dir, side.clone().multiplyScalar(sgn), vh, pw);
          else if (plan === 'spin') this.sliceH(victim, dir, side.clone().multiplyScalar(sgn), vh, pw);
          else this.sliceDiag(victim, dir, side, sgn, vh, pw);
          this.impact(vp, { power: pw, mid: vh * (plan === 'decap' ? 0.8 : 0.55), sound: false, noSlow: true, sparks });
          if (plan === 'spin') mesh.rotation.y = h0;
          return this.tween(0.12, () => { }).then(() => recover(0.32));
        });
      }
      if (plan === 'impale') {
        // estocada: recua, investe e atravessa a estatua, que racha por dentro e estoura
        const thrust = t === E.B ? -1.45 : -1.6;
        snd('windup');
        return this.tween(0.22, (k) => { const e = ease(k); w.rotation.x = rest + (thrust - rest) * e; w.rotation.z = 0; mesh.rotation.x = 0.1 * e; mesh.position.set(p0.x - dir.x * 0.16 * e, 0, p0.z - dir.z * 0.16 * e); })
          .then(() => { snd('swing'); return this.tween(0.08, (k) => { const e = easeIn(k); mesh.position.set(p0.x + dir.x * (-0.16 + 0.5 * e), 0, p0.z + dir.z * (-0.16 + 0.5 * e)); mesh.rotation.x = 0.1 - 0.25 * e; }); })
          .then(() => {
            snd('impale'); kill(); this.shake(0.16);
            const ep = vp.clone().setY(vh * 0.55).addScaledVector(dir, -0.18 * ps);
            this.particles.burst(ep, { colors: sparks, count: 50, up: 1, speed: 5.5, life: 0.35, grav: 6, size: 0.06 });
            this.particles.burst(ep.clone().addScaledVector(dir, 0.4 * ps), { colors: ['#9a9186', '#c8beb0', '#6d665e'], count: 40, up: 0.8, speed: 4.5, life: 0.8, grav: 8, size: 0.07, normal: true });
            this.heat(victim, 0xff5a1a, 0.3, 1.6);
            const v0 = victim.position.clone();
            return this.tween(0.34, (k) => { victim.position.set(v0.x + dir.x * 0.1 * k + Math.sin(k * 90) * 0.02, 0.16 * Math.sin(Math.PI / 2 * k) * ps, v0.z + dir.z * 0.1 * k + Math.cos(k * 77) * 0.02); victim.rotation.x = -0.25 * k; });
          })
          .then(() => { snd('crack'); this.explode(victim, 'fling', dir, 2.0 * pw, { sparks, noSlow: true }); return recover(0.3); });
      }
      if (plan === 'smash') {
        // martelada de cima: a estatua e esmagada contra o chao
        snd('windup');
        return this.tween(0.3, (k) => { const e = ease(k); w.rotation.x = rest + 0.2 + 2.0 * e; mesh.rotation.x = 0.24 * e; mesh.position.y = 0.1 * e; })
          .then(() => { snd('swing'); let hit = false; return this.tween(0.1, (k) => {
            const e = easeIn(k); w.rotation.x = rest + 2.2 - 3.9 * e; mesh.rotation.x = 0.24 - 0.55 * e; mesh.position.set(p0.x + dir.x * 0.18 * e, 0.1 * (1 - e), p0.z + dir.z * 0.18 * e);
            if (!hit && k > 0.6) { hit = true; victim.scale.set(1.15, 0.85, 1.15); }
          }); })
          .then(() => this.tween(0.07, (k) => { victim.scale.set(1.15 + 0.25 * k, 0.85 - 0.55 * k, 1.15 + 0.25 * k); }))
          .then(() => {
            snd('crunch'); kill();
            this.explode(victim, 'crush', dir, 2.2, { big: true, noSlow: true }); this.addCrack(vp.clone().addScaledVector(dir, 0.3), 1.3);
            this.shake(0.4);
            return this.tween(0.12, () => { }).then(() => recover(0.35));
          });
      }
      // martelo de lado: gira o corpo e a estatua voa em pedacos
      const h0 = mesh.rotation.y, sg = Math.random() < 0.5 ? 1 : -1;
      snd('windup');
      return this.tween(0.28, (k) => { const e = ease(k); mesh.rotation.y = h0 + 1.0 * sg * e; w.rotation.x = rest - 1.35 * e; mesh.rotation.x = 0.1 * e; })
        .then(() => { snd('swing'); return this.tween(0.12, (k) => { const e = easeIn(k); mesh.rotation.y = h0 + sg * (1.0 - 1.7 * e); }); })
        .then(() => {
          snd('crunch'); snd('smash'); kill();
          const fd = dir.clone().addScaledVector(side, -sg * 0.9).normalize();
          this.explode(victim, 'fling', fd, 2.4, { noSlow: true });
          return this.tween(0.16, (k) => { mesh.rotation.y = h0 + sg * (-0.7 + 0.7 * ease(k)); }).then(() => recover(0.3));
        });
    }
    // ---------- fogo no buraco: explosivos ----------
    wantBomb() {
      if (this.forceBomb != null) return !!this.forceBomb;
      if (this.forceVar != null) return false;
      const r = Math.random() < (this._bombLast ? 0.18 : 0.34); this._bombLast = r; return r;
    }
    // objetos feitos uma vez: bomba com pavio, bala de canhao, canhao, pote de fogo, flecha
    projMeshes() {
      if (this._proj) return this._proj;
      const iron = new THREE.MeshStandardMaterial({ color: 0x1c1b1e, roughness: 0.42, metalness: 0.75 });
      const clay = new THREE.MeshStandardMaterial({ color: 0xa8582e, roughness: 0.85 });
      const wood = new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.8 });
      const rope = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 1 });
      const bronze = new THREE.MeshStandardMaterial({ color: 0xb08038, roughness: 0.35, metalness: 0.85 });
      const glowT = new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
      const spark = () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffc860, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sp.scale.set(0.22, 0.22, 1); return sp; };
      const bomb = () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), iron); b.castShadow = true; g.add(b); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 10), iron); cap.position.y = 0.13; g.add(cap); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 5), rope); f.position.set(0.02, 0.18, 0); f.rotation.z = -0.4; g.add(f); const sp = spark(); sp.position.set(0.04, 0.23, 0); g.add(sp); g.userData.spark = sp; return g; };
      const pot = () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), clay); b.scale.set(1, 1.15, 1); g.add(b); const n = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.07, 10), clay); n.position.y = 0.13; g.add(n); const r = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), rope); r.rotation.x = Math.PI / 2; r.position.y = 0.16; g.add(r); const sp = spark(); sp.material.color.set(0xff7a2a); sp.scale.set(0.42, 0.55, 1); sp.position.y = 0.24; g.add(sp); g.userData.spark = sp; return g; };
      const cannon = () => { const g = new THREE.Group(); const br = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.62, 14), bronze); br.rotation.x = Math.PI / 2 - 0.12; br.position.set(0, 0.3, -0.08); br.castShadow = true; g.add(br);
        const mz = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 14), bronze); mz.position.set(0, 0.34, -0.39); g.add(mz);
        const cr = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.5), wood); cr.position.set(0, 0.18, 0.02); cr.castShadow = true; g.add(cr);
        for (const x of [-0.14, 0.14]) for (const z of [-0.12, 0.16]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 12), wood); w.rotation.z = Math.PI / 2; w.position.set(x, 0.1, z); g.add(w); }
        g.userData.muzzle = new THREE.Vector3(0, 0.34, -0.42); return g; };
      const ball = () => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), iron); b.castShadow = true; return b; };
      const arrow = () => { const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 5), wood); sh.rotation.x = Math.PI / 2; g.add(sh); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 4), iron); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.34; g.add(tip); for (const a of [0, 2.1, 4.2]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.05, 0.1), rope); f.position.set(Math.sin(a) * 0.016, Math.cos(a) * 0.016, 0.27); f.rotation.z = -a; g.add(f); } return g; };
      this._proj = { bomb, pot, cannon, ball, arrow, glowT };
      return this._proj;
    }
    // a explosao grande: bola de fogo, fumaca, onda de choque, entulho, tremor e mancha queimada
    blastFx(p, power = 1) {
      const P = this.projMeshes(), k = this.qL() >= 3 ? 0.6 : 1, c = p.clone().setY(0.35);
      const balls = [];
      for (const [col, s, d, op] of [[0xfff4d0, 1.5, 0.35, 1], [0xffa040, 2.6, 0.6, 0.95], [0xff4a12, 3.4, 0.85, 0.75]]) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: P.glowT, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
        sp.position.copy(c); sp.scale.setScalar(0.1); sp.renderOrder = 6; this.scene.add(sp); balls.push(sp);
        this.tween(d, (q) => { const e = easeOut(Math.min(1, q * 2.4)), sz = s * power * (0.25 + 0.75 * e); sp.scale.set(sz, sz * 1.05, 1); sp.position.y = 0.35 + q * 0.7; sp.material.opacity = op * (q < 0.4 ? 1 : 1 - (q - 0.4) / 0.6); })
          .then(() => { this.scene.remove(sp); sp.material.dispose(); });
      }
      this.particles.burst(c, { colors: ['#fff2b0', '#ffb040', '#ff6a1a', '#ff3a10'], count: Math.round(140 * k), up: 4.2, speed: 8.5, life: 0.75, grav: 3, size: 0.13 });
      this.particles.burst(c.clone().setY(0.5), { colors: ['#2a2622', '#3d3732', '#57504a', '#1a1816'], count: Math.round(46 * k), up: 1.4, speed: 3.2, life: 2.3, grav: -0.7, size: 0.6, normal: true, opacity: 0.72 });
      this.particles.burst(p.clone().setY(0.05), { colors: ['#b8ae9f', '#8f877c', '#d8cfbf'], count: Math.round(60 * k), up: 0.6, speed: 6.5, life: 2.2, grav: 0.2, size: 0.45, normal: true, opacity: 0.45 });
      this.flash(p, 0xff8a30, 34 * power); this.flashExp(2.2);
      this.shockwave(p, 0xfff0c0); this.tween(0.07, () => { }).then(() => this.shockwave(p, 0xff8a30)); this.tween(0.16, () => { }).then(() => this.shockwave(p, 0xff5a1a));
      this.shake(0.75 * power); this.addScorch(p, 1.5 * power);
    }
    addScorch(p, size) {
      if (!this.scorchTex) {
        const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
        for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = rnd(0, 0.25) * S, x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r, rr = rnd(0.12, 0.3) * S, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(255,255,255,${rnd(0.25, 0.5)})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
        g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineCap = 'round';
        for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + rnd(-0.2, 0.2); g.lineWidth = rnd(2, 6); g.beginPath(); g.moveTo(S / 2 + Math.cos(a) * S * 0.18, S / 2 + Math.sin(a) * S * 0.18); g.lineTo(S / 2 + Math.cos(a) * S * rnd(0.36, 0.48), S / 2 + Math.sin(a) * S * rnd(0.36, 0.48)); g.stroke(); }
        this.scorchTex = new THREE.CanvasTexture(cv);
        if (!this.crackGeo) { this.crackGeo = new THREE.PlaneGeometry(1, 1); this.crackGeo.rotateX(-Math.PI / 2); }
      }
      this.cracks = this.cracks || [];
      const m = new THREE.Mesh(this.crackGeo, new THREE.MeshBasicMaterial({ map: this.scorchTex, color: 0x050302, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.position.set(p.x, 0.0058, p.z); m.rotation.y = rnd(0, 6.28); m.scale.setScalar(size * (this.pScale || 1)); this.scene.add(m); this.cracks.push(m);
      const gl = new THREE.Mesh(this.crackGeo, new THREE.MeshBasicMaterial({ map: this.scorchTex, color: 0xff5a12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }));
      gl.position.set(p.x, 0.0066, p.z); gl.rotation.y = m.rotation.y; gl.scale.copy(m.scale).multiplyScalar(0.8); this.scene.add(gl);
      this.tween(0.12, (k) => { m.material.opacity = 0.9 * k; });
      this.tween(2.2, (k) => { gl.material.opacity = Math.pow(1 - k, 1.4); }).then(() => { this.scene.remove(gl); gl.material.dispose(); });
      while (this.cracks.length > 14) { const o = this.cracks.shift(); this.scene.remove(o); o.material.dispose(); }
    }
    // atacante grita, joga (ou dispara) e a vitima vai pelos ares
    bombKill(mesh, victim, dir, t) {
      const P = this.projMeshes(), kind = this.army ? this.army.proj : 'bomba', ps = this.pScale || 1;
      const w = mesh.userData.weapon, rest = mesh.userData.rest || 0, p0 = mesh.position.clone().setY(0), vp = victim.position.clone().setY(0);
      const anim = this._animMeshes; anim.add(victim);
      const side = new THREE.Vector3(-dir.z, 0, dir.x), mh = (mesh.userData.h || 1) * ps, vh = (victim.userData.h || 0.9) * ps;
      const vy0 = victim.rotation.y, face = Math.atan2(dir.x, dir.z), dy = ((face - vy0) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      this.duelCam(p0.clone().lerp(vp, 0.55), 2.2);
      snd('fith');
      const raise = this.tween(0.42, (k) => { const e = ease(k); if (w) w.rotation.x = rest + 1.9 * e; mesh.rotation.x = 0.12 * e; mesh.rotation.z = -0.12 * e; victim.rotation.y = vy0 + dy * e; });
      const fly = (obj, from, to, dur, arc, spin) => this.tween(dur, (k) => { obj.position.lerpVectors(from, to, k); obj.position.y += Math.sin(Math.PI * k) * arc; if (spin) { obj.rotation.x += 0.25; obj.rotation.z += 0.12; } if (obj.userData.spark) { const s = 0.18 + Math.random() * 0.12; obj.userData.spark.scale.set(s, s, 1); } });
      const boom = (at) => {
        snd('boom'); this.slowMo(1.0, 0.18);
        this.blastFx(at, 1);
        this.explode(victim, 'blast', dir, 2.8, { big: true, noSlow: true, noFx: true });
        // atacante leva o tranco para tras
        const m0 = mesh.position.clone();
        return this.tween(0.32, (k) => { const b = Math.sin(Math.PI * k); mesh.position.set(m0.x - dir.x * 0.12 * b, 0, m0.z - dir.z * 0.12 * b); mesh.rotation.x = 0.12 - 0.3 * b; });
      };
      const recover = () => { const rx = mesh.rotation.x, rz = mesh.rotation.z, wx = w ? w.rotation.x : 0; return this.tween(0.3, (k) => { const e = ease(k); mesh.rotation.x = rx * (1 - e); mesh.rotation.z = rz * (1 - e); if (w) w.rotation.x = wx + (rest - wx) * e; mesh.position.setY(0); }); };
      const dist = p0.distanceTo(vp), at = vp.clone().addScaledVector(dir, -0.12 * ps);
      if (kind === 'canhao') {
        // o canhao surge ao lado, mira e dispara
        const cn = P.cannon(), cp = p0.clone().addScaledVector(side, 0.48 * ps).addScaledVector(dir, 0.05);
        cn.position.copy(cp); cn.rotation.y = Math.atan2(-dir.x, -dir.z); cn.scale.setScalar(0.01); this.scene.add(cn);
        return raise.then(() => this.tween(0.22, (k) => { const s = easeOut(k) * ps; cn.scale.setScalar(Math.max(0.01, s)); cn.position.y = (1 - k) * -0.1; }))
          .then(() => { snd('fuse'); return this.tween(0.22, (k) => { cn.rotation.x = 0.04 * Math.sin(k * 40); }); })
          .then(() => {
            snd('cannon');
            cn.updateMatrixWorld(true); const mz = P.cannon && cn.localToWorld(cn.userData.muzzle.clone().multiplyScalar(1));
            this.particles.burst(mz, { colors: ['#fff2b0', '#ffb040', '#ff6a1a'], count: 50, up: 0.8, speed: 4, life: 0.35, grav: 1, size: 0.12 });
            this.particles.burst(mz, { colors: ['#6a645e', '#8a847c', '#4a4540'], count: 24, up: 0.8, speed: 1.6, life: 1.6, grav: -0.4, size: 0.5, normal: true, opacity: 0.6 });
            this.flash(mz, 0xffa040, 10); this.shake(0.25);
            const bl = P.ball(); bl.scale.setScalar(ps); this.scene.add(bl);
            const r0 = cn.position.clone(); this.tween(0.25, (k) => { cn.position.copy(r0).addScaledVector(dir, -0.18 * Math.sin(Math.PI * k)); });
            return fly(bl, mz, at.clone().setY(vh * 0.45), Math.min(0.28, 0.1 + dist * 0.05), 0.04).then(() => { this.scene.remove(bl); return boom(at); });
          })
          .then(() => this.tween(0.25, (k) => { cn.scale.setScalar(Math.max(0.01, (1 - k) * ps)); }).then(() => this.scene.remove(cn)))
          .then(recover);
      }
      // bomba ou pote de fogo: joga por cima
      const pr = kind === 'pote' ? P.pot() : P.bomb(); pr.scale.setScalar(ps);
      const hand = p0.clone().addScaledVector(side, 0.22 * ps).setY(mh * 0.95);
      pr.position.copy(hand); this.scene.add(pr);
      if (kind !== 'pote') snd('fuse');
      return raise.then(() => { snd('swing'); return this.tween(0.12, (k) => { const e = easeIn(k); if (w) w.rotation.x = rest + 1.9 - 2.4 * e; mesh.rotation.x = 0.12 - 0.3 * e; }); })
        .then(() => fly(pr, hand.clone(), at.clone().setY(kind === 'pote' ? vh * 0.4 : 0.13 * ps), Math.min(0.7, 0.42 + dist * 0.06), 0.55 + dist * 0.1, true))
        .then(() => {
          if (kind === 'pote') { snd('potbreak'); this.scene.remove(pr); return boom(at); }
          // a bomba quica, o pavio queima, a vitima treme
          const b0 = pr.position.clone(); snd('clink'); this.tremble(victim, 0.42, 0.02);
          return this.tween(0.42, (k) => { pr.position.set(b0.x + dir.x * 0.1 * k, 0.13 * ps + Math.abs(Math.sin(k * 7)) * 0.07 * (1 - k), b0.z + dir.z * 0.1 * k); pr.rotation.z = -k * 2; const s = 0.18 + Math.random() * 0.16; pr.userData.spark.scale.set(s, s, 1); })
            .then(() => { this.scene.remove(pr); return boom(at); });
        })
        .then(recover);
    }
    // arqueiros: flecha (ou virote) no peito, a vitima explode
    arrowKill(mesh, victim, dir) {
      const P = this.projMeshes(), ps = this.pScale || 1, w = mesh.userData.weapon, rest = mesh.userData.rest || 0;
      const p0 = mesh.position.clone().setY(0), vp = victim.position.clone().setY(0), vh = (victim.userData.h || 0.9) * ps, mh = (mesh.userData.h || 1) * ps;
      this._animMeshes.add(victim); this.duelCam(p0.clone().lerp(vp, 0.55), 1.9);
      const shot = (n) => {
        const ar = P.arrow(); ar.scale.setScalar(ps); const from = p0.clone().addScaledVector(dir, 0.2).setY(mh * 0.6), to = vp.clone().addScaledVector(dir, -0.16 * ps).setY(vh * (0.5 + n * 0.12));
        ar.position.copy(from); ar.lookAt(to); ar.rotateY(Math.PI); this.scene.add(ar); snd('bow');
        return this.tween(0.13, (k) => { ar.position.lerpVectors(from, to, k); }).then(() => { snd('thunk'); this.particles.burst(to, { colors: ['#ffffff', '#ffe6a8', '#ffb050'], count: 26, up: 0.8, speed: 4, life: 0.3, grav: 6, size: 0.05 }); this.shake(0.1); this.scene.remove(ar); victim.rotation.x = -0.12 * (n + 1); });
      };
      snd('windup'); if (w) this.tween(0.2, (k) => { w.rotation.x = rest - 0.6 * ease(k); });
      return this.tween(0.32, (k) => { mesh.rotation.x = -0.08 * ease(k); })
        .then(() => shot(0)).then(() => this.tween(0.16, () => { })).then(() => shot(1))
        .then(() => { this.heat(victim, 0xff5a1a, 0.25, 1.5); return this.tremble(victim, 0.26, 0.03); })
        .then(() => { snd('crack'); snd('smash'); this.slowMo(0.6, 0.14); this.flashExp(1.2); this.explode(victim, 'fling', dir, 2.2, { noSlow: true, sparks: ['#ffffff', '#ffe6a8', '#ffb050'] }); })
        .then(() => this.tween(0.3, (k) => { const e = ease(k); mesh.rotation.x = -0.08 * (1 - e); if (w) w.rotation.x = rest - 0.6 * (1 - e); }));
    }
    // gira um pedaco cortado em torno do proprio centro (c0) e o leva ate c
    spinAt(hf, c0, c, q) { hf.m.quaternion.copy(hf.q0).premultiply(q); hf.m.position.copy(hf.p).sub(c0).applyQuaternion(q).add(c); }
    // corte na diagonal: a metade de cima escorrega pela linha do corte e cai
    sliceDiag(victim, dir, side, sgn, vh, pw) {
      const UP = new THREE.Vector3(0, 1, 0), a = rnd(0.55, 0.85);
      const n = side.clone().multiplyScalar(sgn * Math.sin(a)).addScaledVector(UP, Math.cos(a)).addScaledVector(dir, rnd(-0.12, 0.12)).normalize();
      const hs = this.cutInTwo(victim, n, victim.position.clone().setY(vh * rnd(0.48, 0.6)));
      const top = hs[0], bot = hs[1], ps = this.pScale || 1;
      const s = UP.clone().multiplyScalar(-1).addScaledVector(n, n.y).normalize(), ax = UP.clone().cross(s).normalize(), q = new THREE.Quaternion();
      this.tween(0.36, (k) => { top.m.position.copy(top.p).addScaledVector(s, 0.3 * ps * k * k); })
        .then(() => { const sh = top.m.position.clone().sub(top.p), c0 = top.p.clone().setY(vh * 0.78), c1 = c0.clone().add(sh), c = new THREE.Vector3(); return this.tween(0.36, (k) => { const e = k * k; q.setFromAxisAngle(ax, e * 1.5); c.copy(c1).addScaledVector(s, 0.35 * ps * k).addScaledVector(dir, 0.12 * k); c.y = Math.max(0.12 * ps, c1.y - vh * 0.62 * e); this.spinAt(top, c0, c, q); }); })
        .then(() => { snd('shatter'); this.breakHalf(top, 1.2 * pw, 0.55, s.clone().setY(0).multiplyScalar(1.5)); });
      const ax2 = UP.clone().cross(dir).normalize(), q2 = new THREE.Quaternion();
      this.tween(0.45, () => { }).then(() => this.tween(0.42, (k) => { const e = k * k; q2.setFromAxisAngle(ax2, e * 1.2); bot.m.quaternion.copy(bot.q0).premultiply(q2); }))
        .then(() => this.breakHalf(bot, 0.9 * pw, 0.45, dir, true));
    }
    // decapitacao: a cabeca sai girando, o corpo fica de pe um instante e desaba
    decapitate(victim, dir, side, vh, pw) {
      const UP = new THREE.Vector3(0, 1, 0), ps = this.pScale || 1;
      const n = UP.clone().addScaledVector(side, rnd(0.08, 0.2)).addScaledVector(dir, 0.08).normalize();
      const hs = this.cutInTwo(victim, n, victim.position.clone().setY(vh * 0.74)), head = hs[0], body = hs[1];
      const vel = dir.clone().multiplyScalar(rnd(2.2, 3.2)).addScaledVector(side, rnd(0.6, 1.4)).setY(rnd(3.0, 3.8)).multiplyScalar(ps);
      const spin = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(), q = new THREE.Quaternion(), T = 0.8;
      this.particles.burst(head.p.clone().setY(vh * 0.74), { colors: ['#9a9186', '#c8beb0', '#6d665e'], count: 30, up: 1.6, speed: 3.5, life: 0.7, grav: 8, size: 0.07, normal: true });
      const c0 = head.p.clone().setY(vh * 0.86), c = new THREE.Vector3();
      this.tween(T, (k) => {
        const tt = k * T; q.setFromAxisAngle(spin, tt * 11);
        c.set(c0.x + vel.x * tt, Math.max(0.1 * ps, c0.y + vel.y * tt - 9.8 * ps * tt * tt / 2), c0.z + vel.z * tt); this.spinAt(head, c0, c, q);
      }).then(() => { snd('crunch'); this.breakHalf(head, 0.9, 0.3, vel.clone().setY(0).multiplyScalar(0.35)); this.addCrack(head.m.position.clone(), 0.6); });
      const ax = UP.clone().cross(dir).normalize(), q2 = new THREE.Quaternion();
      this.tween(0.5, (k) => { body.m.position.x = body.p.x + Math.sin(k * 50) * 0.012; }).then(() => this.tween(0.42, (k) => { const e = k * k; q2.setFromAxisAngle(ax, e * 1.45); body.m.quaternion.copy(body.q0).premultiply(q2); }))
        .then(() => { snd('shatter'); this.breakHalf(body, 1.0 * pw, 0.6, dir); this.shake(0.15); });
    }
    // corte na horizontal (giro): a parte de cima voa de lado
    sliceH(victim, dir, side, vh, pw) {
      const UP = new THREE.Vector3(0, 1, 0), ps = this.pScale || 1;
      const n = UP.clone().addScaledVector(dir, rnd(-0.25, 0.25)).addScaledVector(side, 0.12).normalize();
      const hs = this.cutInTwo(victim, n, victim.position.clone().setY(vh * rnd(0.45, 0.58)));
      const top = hs[0], bot = hs[1], q = new THREE.Quaternion(), ax = UP.clone().cross(side).normalize(), cutY = vh * 0.52;
      const c0 = top.p.clone().setY(vh * 0.75), c = new THREE.Vector3();
      this.tween(0.7, (k) => {
        q.setFromAxisAngle(ax, k * 2.4);
        c.copy(c0).addScaledVector(side, 1.2 * ps * k).addScaledVector(dir, 0.4 * k); c.y = Math.max(0.12 * ps, c0.y + Math.sin(Math.PI * k * 0.8) * 0.4 - (c0.y + 0.4) * k * k); this.spinAt(top, c0, c, q);
      }).then(() => { snd('shatter'); this.breakHalf(top, 1.2 * pw, 0.5, side); });
      this.tween(0.3, () => { }).then(() => this.breakHalf(bot, 0.9 * pw, 0.45, null, true));
    }
    brutalOld(mesh, victim, dir, t, b, head) {
      const w = mesh.userData.weapon, rest = mesh.userData.rest || 0, p0 = mesh.position.clone(), ps = this.pScale || 1;
      const vh = (victim.userData.h || 0.9) * ps, vp = victim.position.clone();
      const back = (e, x) => { mesh.position.set(p0.x + dir.x * x * e, mesh.position.y, p0.z + dir.z * x * e); };
      const recover = (from, wFrom, dur = 0.3) => { const rx = mesh.rotation.x, y0 = mesh.position.y, wx = w ? w.rotation.x : 0; return this.tween(dur, (k) => { const e = ease(k); mesh.position.set(from.x + (p0.x - from.x) * e, y0 * (1 - e), from.z + (p0.z - from.z) * e); mesh.rotation.x = rx * (1 - e); if (w) w.rotation.x = wx + (rest - wx) * e; }); };
      // torre: arremete, pula em cima ou faz o chao tremer
      if (t === E.R) {
        const v = this.pickVar(t, 3);
        if (v === 0) {
          snd('windup'); this.tremble(victim, 0.55, 0.012);
          return this.tween(0.45, (k) => { const e = ease(k); back(e, -0.34); mesh.rotation.x = 0.22 * e; })
            .then(() => { snd('charge'); return this.tween(0.13, (k) => { const e = easeIn(k); back(1, -0.34 + 0.84 * e); mesh.rotation.x = 0.22 - 0.5 * e; }); })
            .then(() => { this.explode(victim, 'fling', dir, 2.1); return recover(mesh.position.clone(), 0, 0.35); });
        }
        if (v === 1) {
          snd('windup');
          return this.tween(0.3, (k) => { const s = 1 - 0.16 * ease(k); mesh.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6); })
            .then(() => { snd('leap'); let hit = false; return this.tween(0.56, (k) => {
              const e = ease(k); mesh.scale.set(1, 1, 1);
              mesh.position.set(p0.x + (b.x - p0.x) * e, Math.sin(Math.PI * Math.min(1, k * 1.05)) * 1.5 + (k > 0.9 ? 0 : 0), p0.z + (b.z - p0.z) * e);
              mesh.rotation.x = -0.3 * Math.sin(Math.PI * k);
              if (!hit && k > 0.84) { hit = true; victim.scale.set(1.25, 0.4, 1.25); this.explode(victim, 'crush', dir, 1.9); }
            }); })
            .then(() => { mesh.position.y = 0; mesh.rotation.x = 0; snd('stompH'); this.dust(b, 1.6); return this.tween(0.22, (k) => { const s = 1 - Math.sin(Math.PI * k) * 0.14; mesh.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5); }); })
            .then(() => { mesh.scale.set(1, 1, 1); return true; });
        }
        const stomp = () => this.tween(0.2, (k) => { mesh.position.y = Math.sin(Math.PI / 2 * ease(k)) * 0.42; mesh.rotation.x = 0.12 * k; })
          .then(() => this.tween(0.07, (k) => { mesh.position.y = 0.42 * (1 - k * k); mesh.rotation.x = 0.12 * (1 - k); }))
          .then(() => { mesh.position.y = 0; snd('stompH'); snd('crack'); this.shake(0.12); this.shockwave(p0, 0xffd7a0); this.dust(p0, 1.6); this.addCrack(p0.clone().addScaledVector(dir, 0.5), 0.8); });
        return stomp().then(() => { this.tremble(victim, 0.4, 0.02); return stomp(); })
          .then(() => { this.heat(victim, 0xff5a1a, 0.22, 1.1); return this.tremble(victim, 0.25, 0.035); })
          .then(() => { this.explode(victim, 'burst', dir, 1.5); });
      }
      // bispo e dama: magia (raio, levitar e explodir, ou golpe no chao)
      if (t === E.B || t === E.Q) {
        const qn = t === E.Q, col = qn ? 0xffc65a : 0x7fb8ff, cols = qn ? ['#ffe08a', '#fff4d0', '#ffb84a'] : ['#9fd8ff', '#ffffff', '#6fb0ff'], pw = qn ? 1.25 : 1;
        const v = this.pickVar(t, 3), tipY = (this.partOf(mesh.userData.piece).weapon.tip || 0.4);
        if (v === 0) {
          const orb = this.orb(col, 0.05); orb.position.set(0, tipY, 0); w.add(orb);
          snd('windup'); this.tremble(victim, 0.6, 0.012);
          return this.tween(0.5, (k) => { const e = ease(k); w.rotation.x = rest + 1.25 * e; mesh.rotation.x = 0.14 * e; orb.scale.setScalar(0.1 + e * 0.75 * pw); this.glowLight.color.set(col); this.glowLight.intensity = 4 * e; orb.getWorldPosition(this.glowLight.position); })
            .then(() => this.tween(0.08, (k) => { w.rotation.x = rest + 1.25 - 2.1 * easeOut(k); mesh.rotation.x = 0.14 - 0.3 * k; }))
            .then(() => { const from = new THREE.Vector3(); orb.getWorldPosition(from); w.remove(orb); orb.material.dispose(); snd('blast'); return this.bolt(from, vp.clone().setY(vh * 0.55), col, cols, 0.17); })
            .then(() => { this.explode(victim, 'blast', dir, 1.8 * pw, { color: col, sparks: cols, sound: false }); return recover(mesh.position.clone(), 0, 0.35); });
        }
        if (v === 1) {
          snd('windup'); snd('rumble'); this.heat(victim, col, 0.8, 1.2);
          let ry = victim.rotation.y;
          return this.tween(0.8, (k) => {
            const e = ease(k); w.rotation.x = rest + 1.5 * e; mesh.rotation.x = 0.12 * e;
            victim.position.y = 1.15 * ps * e; victim.rotation.y = ry + e * 1.4; victim.position.x = vp.x + Math.sin(k * 80) * 0.02 * k; victim.rotation.z = Math.sin(k * 60) * 0.06 * k;
            this.glowLight.color.set(col); this.glowLight.intensity = 5 * e; this.glowLight.position.set(vp.x, 1.2, vp.z);
            if (Math.random() < 0.35) this.particles.burst(victim.position.clone().setY(victim.position.y + 0.2), { colors: cols, count: 6, up: 0.6, speed: 1.6, life: 0.5, grav: -1, size: 0.08 });
          })
            .then(() => this.tween(0.12, (k) => { const s = 1 - 0.22 * k; victim.scale.set(s, s, s); w.rotation.x = rest + 1.5 - 2.3 * k; }))
            .then(() => { snd('blast'); this.explode(victim, 'blast', dir, 1.5 * pw, { color: col, sparks: cols, sound: false }); return recover(mesh.position.clone(), 0, 0.4); });
        }
        snd('windup'); this.tremble(victim, 0.5, 0.012);
        return this.tween(0.42, (k) => { const e = ease(k); w.rotation.x = rest + 1.6 * e; mesh.rotation.x = 0.2 * e; mesh.position.y = 0.08 * e; })
          .then(() => this.tween(0.09, (k) => { const e = easeIn(k); w.rotation.x = rest + 1.6 - 3.0 * e; mesh.rotation.x = 0.2 - 0.42 * e; mesh.position.y = 0.08 * (1 - e); }))
          .then(() => {
            const gp = p0.clone().addScaledVector(dir, 0.35); snd('stompH'); snd('crack');
            this.shockwave(gp, col); this.shockwave(gp, 0xffffff); this.addCrack(gp, 0.9); this.shake(0.12); this.flash(gp, col, 8);
            this.particles.burst(gp.clone().setY(0.1), { colors: cols, count: 40, up: 1.2, speed: 5, life: 0.5, grav: 2, size: 0.08 });
            this.heat(victim, col, 0.16, 1.5);
            return this.tween(0.18, () => { });
          })
          .then(() => { snd('blast'); this.explode(victim, 'burst', dir, 1.7 * pw, { color: col, sparks: cols, sound: false }); return recover(mesh.position.clone(), 0, 0.35); });
      }
      // peao e rei: espada (corte ao meio, estocada, giro)
      const king = t === E.K, hv = king ? 1.15 : 1, pw = king ? 1.3 : 1;
      const v = this.pickVar(t, 3);
      if (v === 0) {
        snd('windup'); this.tremble(victim, 0.5 * hv, 0.012);
        return this.tween(0.46 * hv, (k) => { const e = ease(k); w.rotation.x = rest + 1.95 * e; mesh.rotation.x = 0.22 * e; mesh.position.y = 0.05 * e; })
          .then(() => { snd('swing'); return this.tween(0.1, (k) => { const e = easeIn(k); w.rotation.x = rest + 1.95 - 3.7 * e; mesh.rotation.x = 0.22 - 0.52 * e; back(e, 0.2); mesh.position.y = 0.05 * (1 - e); }); })
          .then(() => {
            snd('cleave'); snd('smash');
            const n = new THREE.Vector3(-dir.z, rnd(-0.12, 0.12), dir.x).normalize();
            const hs = this.cutInTwo(victim, n, vp.clone().setY(vh * 0.5));
            this.impact(vp, { power: pw, mid: vh * 0.75, sound: false, sparks: ['#ffffff', '#ffe6a8', '#ffb050'] });
            this.topple(hs[0], 0.62, 0.32, 1.42).then(() => this.breakHalf(hs[0], 1.1 * pw, 0.5, null));
            this.topple(hs[1], 0.66, 0.32, 1.42).then(() => this.breakHalf(hs[1], 1.1 * pw, 0.5, null, true));
            return recover(mesh.position.clone(), 0, 0.4);
          });
      }
      if (v === 1) {
        snd('windup'); this.tremble(victim, 0.42, 0.012);
        return this.tween(0.4 * hv, (k) => { const e = ease(k); back(e, -0.16); w.rotation.x = rest + 0.55 * e; mesh.rotation.x = 0.16 * e; })
          .then(() => { snd('swing'); return this.tween(0.085, (k) => { const e = easeIn(k); back(1, -0.16 + 0.5 * e); w.rotation.x = rest + 0.55 - 2.1 * e; mesh.rotation.x = 0.16 - 0.42 * e; }); })
          .then(() => { snd('crack'); this.heat(victim, 0xff6a2a, 0.14, 1.3); this.shake(0.1); this.particles.burst(vp.clone().setY(vh * 0.5), { colors: ['#ffffff', '#ffd27a'], count: 30, up: 1, speed: 4, life: 0.3, grav: 4, size: 0.06 }); return this.tremble(victim, 0.2, 0.03); })
          .then(() => { this.explode(victim, 'fling', dir, 1.6 * pw); return recover(mesh.position.clone(), 0, 0.35); });
      }
      // giro com a espada: corte na horizontal, a parte de cima voa
      const h0 = mesh.rotation.y;
      snd('windup'); this.tremble(victim, 0.36, 0.012);
      return this.tween(0.34 * hv, (k) => { const e = ease(k); mesh.rotation.y = h0 + 0.7 * e; w.rotation.x = rest - 1.25 * e; mesh.rotation.x = 0.08 * e; })
        .then(() => { snd('swing'); return this.tween(0.24, (k) => { const e = easeOut(k); mesh.rotation.y = h0 + 0.7 - (Math.PI * 2 + 0.7) * e; back(Math.sin(Math.PI * k), 0.14); }); })
        .then(() => {
          snd('cleave'); snd('smash');
          const n = new THREE.Vector3(0, 1, 0).addScaledVector(dir, rnd(-0.35, 0.35)).normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
          const hs = this.cutInTwo(victim, n, vp.clone().setY(vh * rnd(0.45, 0.6)));
          this.impact(vp, { power: pw, mid: vh * 0.55, sound: false, sparks: ['#ffffff', '#ffe6a8', '#ffb050'] });
          const top = hs[0], bot = hs[1], q = new THREE.Quaternion(), ax = new THREE.Vector3(0, 1, 0).cross(side).normalize(), cutY = vh * 0.52;
          this.tween(0.7, (k) => {
            q.setFromAxisAngle(ax, k * 1.7); top.m.quaternion.copy(top.q0).premultiply(q);
            top.m.position.copy(top.p).addScaledVector(side, 1.1 * ps * k).addScaledVector(dir, 0.45 * k); top.m.position.y = Math.sin(Math.PI * k * 0.8) * 0.4 - cutY * k * k;
          }).then(() => this.breakHalf(top, 1.2 * pw, 0.5, side));
          this.tween(0.2, () => { }).then(() => this.breakHalf(bot, 0.9 * pw, 0.45, null, true));
          mesh.rotation.y = h0;
          return recover(mesh.position.clone(), 0, 0.35);
        });
    }
    // cavalo: pisoteia, empina e esmaga, ou atravessa com um coice
    knightBrutal(mesh, a, b, victim, dir) {
      const v = this.pickVar(E.N, 3), dist = a.distanceTo(b);
      const land = (at) => { mesh.position.y = 0; snd('stompH'); this.dust(at, 1.4); this.shake(0.06); return this.tween(0.22, (k) => { const s = 1 - Math.sin(Math.PI * k) * 0.12; mesh.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5); mesh.rotation.x = mesh.rotation.x * (1 - k); }).then(() => { mesh.scale.set(1, 1, 1); mesh.rotation.x = 0; }); };
      const crouch = (d) => this.tween(d, (k) => { const s = 1 - Math.sin(Math.PI / 2 * k) * 0.12; mesh.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5); mesh.rotation.x = 0.3 * k; });
      snd('windup'); this.tremble(victim, 0.5, 0.012);
      if (v === 0) {
        let hit = false;
        return crouch(0.3).then(() => { snd('leap'); return this.tween(0.62 + dist * 0.05, (k) => {
          const e = ease(k); mesh.scale.set(1, 1, 1);
          mesh.position.set(a.x + (b.x - a.x) * e, Math.sin(Math.PI * k) * 1.75, a.z + (b.z - a.z) * e); mesh.rotation.x = 0.3 - k * 0.85;
          if (!hit && k > 0.84) { hit = true; victim.scale.set(1.3, 0.35, 1.3); this.explode(victim, 'crush', dir, 1.8); }
        }); }).then(() => land(b));
      }
      if (v === 1) {
        const stop = b.clone().addScaledVector(dir, -0.72), d1 = a.distanceTo(stop);
        return crouch(0.18).then(() => { snd('leap'); return this.tween(0.45 + d1 * 0.04, (k) => { const e = ease(k); mesh.scale.set(1, 1, 1); mesh.position.set(a.x + (stop.x - a.x) * e, Math.sin(Math.PI * k) * 1.0, a.z + (stop.z - a.z) * e); mesh.rotation.x = 0.3 - k * 0.3; }); })
          .then(() => land(stop))
          .then(() => { snd('windup'); return this.tween(0.42, (k) => { const e = ease(k); mesh.rotation.x = 0.9 * e; mesh.position.y = 0.14 * e; }); })
          .then(() => this.tween(0.1, (k) => { const e = easeIn(k); mesh.rotation.x = 0.9 - 1.2 * e; mesh.position.y = 0.14 * (1 - e); mesh.position.x = stop.x + dir.x * 0.28 * e; mesh.position.z = stop.z + dir.z * 0.28 * e; }))
          .then(() => { snd('stompH'); victim.scale.set(1.2, 0.55, 1.2); this.explode(victim, 'crush', dir, 1.9); return this.tween(0.3, (k) => { mesh.rotation.x = -0.3 * (1 - k); }); })
          .then(() => { const s0 = mesh.position.clone(); return this.tween(0.3, (k) => { const e = ease(k); mesh.position.set(s0.x + (b.x - s0.x) * e, Math.sin(Math.PI * k) * 0.35, s0.z + (b.z - s0.z) * e); }); })
          .then(() => land(b));
      }
      // carga de lanca: salta, abaixa a lanca e atravessa a estatua
      this.duelCam(b.clone().lerp(a, 0.35), 2.2);
      const w = mesh.userData.weapon, rest = mesh.userData.rest || 0, ps = this.pScale || 1, vh = (victim.userData.h || 0.9) * ps;
      const stop = b.clone().addScaledVector(dir, -0.78), d1 = a.distanceTo(stop);
      return crouch(0.2).then(() => { snd('leap'); snd('charge'); return this.tween(0.42 + d1 * 0.05, (k) => {
        const e = ease(k); mesh.scale.set(1, 1, 1);
        mesh.position.set(a.x + (stop.x - a.x) * e, Math.sin(Math.PI * k) * 0.8, a.z + (stop.z - a.z) * e); mesh.rotation.x = 0.3 - k * 0.3;
        if (w) w.rotation.x = rest + (-1.6 - rest) * e;
      }); }).then(() => { mesh.position.y = 0; snd('stompH'); this.dust(stop, 1.2); return this.tween(0.08, (k) => { const e = easeIn(k); mesh.position.set(stop.x + dir.x * 0.3 * e, 0, stop.z + dir.z * 0.3 * e); mesh.rotation.x = -0.15 * e; }); })
        .then(() => {
          snd('impale'); snd('clash'); this.slowMo(0.7, 0.14); this.flashExp(1.1); this.shake(0.2);
          const ep = victim.position.clone().setY(vh * 0.5).addScaledVector(dir, -0.2 * ps);
          this.particles.burst(ep, { colors: ['#ffffff', '#ffe6a8', '#ffb050'], count: 55, up: 1, speed: 6, life: 0.35, grav: 6, size: 0.06 });
          this.heat(victim, 0xff5a1a, 0.25, 1.6);
          const v0 = victim.position.clone(), m0 = mesh.position.clone();
          return this.tween(0.3, (k) => { const e = ease(k); victim.position.set(v0.x + dir.x * 0.22 * e, 0.28 * Math.sin(Math.PI / 2 * k) * ps, v0.z + dir.z * 0.22 * e); victim.rotation.x = -0.4 * e; mesh.position.set(m0.x + dir.x * 0.2 * e, 0, m0.z + dir.z * 0.2 * e); mesh.rotation.x = -0.15 - 0.3 * e; });
        })
        .then(() => {
          snd('crunch'); this.explode(victim, 'fling', dir, 2.3, { noSlow: true });
          const s0 = mesh.position.clone(), r0 = mesh.rotation.x;
          return this.tween(0.32, (k) => { const e = ease(k); mesh.position.set(s0.x + (b.x - s0.x) * e, Math.sin(Math.PI * k) * 0.3, s0.z + (b.z - s0.z) * e); mesh.rotation.x = r0 * (1 - e); if (w) w.rotation.x = -1.6 + (rest + 1.6) * e; });
        }).then(() => land(b));
    }
    orb(color, s) {
      if (!this.orbTex) this.orbTex = new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.orbTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      sp.scale.setScalar(s); return sp;
    }
    bolt(from, to, color, cols, dur) {
      const sp = this.orb(color, 0.9), core = this.orb(0xffffff, 0.35); this.scene.add(sp, core);
      this.glowLight.color.set(color);
      return this.tween(dur, (k) => {
        sp.position.lerpVectors(from, to, k * k); sp.position.y += Math.sin(Math.PI * k) * 0.2; core.position.copy(sp.position);
        this.glowLight.position.copy(sp.position); this.glowLight.intensity = 7;
        if (Math.random() < 0.7) this.particles.burst(sp.position, { colors: cols, count: 5, up: 0.3, speed: 0.6, life: 0.35, grav: 0, size: 0.09 });
      }).then(() => { this.scene.remove(sp, core); sp.material.dispose(); core.material.dispose(); });
    }
    // xeque-mate brutal: o atacante destroi a coroa e o rei explode, em camera lenta
    execute(result) {
      const king = this.meshes[result.kingSq]; if (!king) return;
      for (const k in this.meshes) { const bd = this.meshes[k].userData.badge; if (bd) bd.visible = false; }
      const ps = this.pScale || 1, kp = sqPos(result.kingSq), anim = this._animMeshes, kh = (king.userData.h || 1.3) * ps; anim.add(king);
      const att = this._lastMover && this._lastMover.parent === this.pieceGroup && this._lastMover !== king ? this._lastMover : null;
      const at = att ? att.userData.piece & 7 : 0, magic = at === E.B || at === E.Q;
      const col = at === E.B ? 0x7fb8ff : at === E.Q ? 0xffc65a : 0xff7a3a, cols = at === E.B ? ['#9fd8ff', '#ffffff', '#6fb0ff'] : ['#ffe08a', '#fff4d0', '#ff9a3a'];
      snd('rumble');
      // camera de cinema: baixa, perto do rei, girando devagar (um toque pula)
      const look = new THREE.Vector3(0, 0.15, 0), mid = att ? kp.clone().lerp(att.position, 0.3).setY(0.55) : kp.clone().setY(0.55);
      const d0 = (this._fitR || 20) * this.cam.rFactor, th0 = this.cam.theta, p0 = this.cam.phi;
      this.cam.target = look.clone(); this.cam.dist = d0;
      // camera de lado: atacante e rei lado a lado na tela, ninguem tampa a execucao
      let th1 = th0 + 0.95;
      if (att) {
        const d = kp.clone().sub(att.position).setY(0); if (d.lengthSq() < 1e-4) d.set(1, 0, 0); d.normalize();
        const cx = Math.sin(th0), cz = Math.cos(th0); let px = -d.z, pz = d.x; if (px * cx + pz * cz < 0) { px = -px; pz = -pz; }
        const g = Math.atan2(px, pz); th1 = th0 + (((g - th0) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        mid.copy(kp).lerp(att.position, 0.45).setY(0.6);
      }
      this.tween(5.2, (k) => { const e = ease(Math.min(1, k * 1.5)); this.cam.target.lerpVectors(look, mid, e); this.cam.dist = d0 + (6.4 - d0) * e; this.cam.phi = p0 + (0.34 - p0) * e; this.cam.theta = th0 + (th1 - th0) * e + 0.3 * ease(k); }, 0.1, 'cam');
      let p = this.tremble(king, 0.8, 0.02);
      let wx = 0;
      if (att) {
        anim.add(att);
        const ap = att.position.clone(), d = kp.clone().sub(ap).setY(0).normalize(), w = att.userData.weapon, rest = att.userData.rest || 0;
        p = Promise.all([p, this.turn(att, Math.atan2(-d.x, -d.z), 0.3)]).then(() => { snd('windup'); return this.tween(0.5, (k) => { const e = ease(k); att.position.y = 0.06 * e; att.rotation.x = 0.22 * e; if (w) w.rotation.x = rest + 1.5 * e; }); })
          .then(() => { wx = 1; return this.tween(0.08, (k) => { att.rotation.x = 0.22 - 0.4 * k; if (w) w.rotation.x = rest + 1.5 - 2.4 * k; }); });
      }
      const crownPos = () => { const c = king.userData.crown, wp = new THREE.Vector3(); if (c) { king.updateMatrixWorld(true); c.getWorldPosition(wp); } else wp.copy(kp).setY(kh); if (wp.y < 0.5) wp.y = kh; return wp; };
      p.then(() => {
        const from = att ? att.position.clone().setY((att.userData.h || 1) * ps * 0.8) : kp.clone().setY(6);
        snd(magic ? 'blast' : 'cleave');
        return this.bolt(from, crownPos(), col, cols, 0.22);
      }).then(() => {
        // a coroa vira estilhacos de ouro
        const c = king.userData.crown, cp = crownPos();
        if (c) { king.remove(c); king.userData.crown = null; }
        this.spawn(0, Math.max(8, Math.round(this.chunkN() * 0.4)), (i, pos, vel) => { pos.set(cp.x + rnd(-0.1, 0.1), cp.y + rnd(-0.05, 0.1), cp.z + rnd(-0.1, 0.1)); const a = Math.random() * 6.283; vel.set(Math.cos(a) * rnd(1.5, 4), rnd(2, 5), Math.sin(a) * rnd(1.5, 4)); }, { mat: this.goldMat, size: 0.42 });
        this.particles.burst(cp, { colors: ['#ffe08a', '#fff4d0', '#ffb84a'], count: 70, up: 3, speed: 5, life: 0.8, grav: 6, size: 0.07 });
        this.flash(cp, 0xffd27a, 12); this.flashExp(1.2); this.shake(0.16); snd('clink'); snd('crack');
        this.slowMo(1.7, 0.1);
        this.heat(king, 0xff4a12, 1.0, 1.6); this.addCrack(kp, 1.3);
        return this.tremble(king, 1.0, 0.04);
      }).then(() => this.tween(0.14, (k) => { king.scale.set(1 + 0.08 * k, 1 - 0.1 * k, 1 + 0.08 * k); }))
        .then(() => {
          this.explode(king, 'blast', new THREE.Vector3(), 2.0, { big: true, color: 0xff8a3a, sparks: ['#ffd27a', '#ff8a3a', '#fff3c4'] });
          this.tween(0.16, () => { }).then(() => { this.shockwave(kp, 0xff9a4a); this.addCrack(kp, 2.0); this.dust(kp, 4); });
          this.glowLight.color.set(0xffaa55); this.glowLight.position.set(kp.x, 1.5, kp.z);
          this.tween(2.4, (k) => { this.glowLight.intensity = Math.sin(Math.PI * k) * 6; });
          if (att && wx) { const r0 = att.rotation.x, w = att.userData.weapon, wr = w ? w.rotation.x : 0, rest = att.userData.rest || 0, y0 = att.position.y; this.tween(0.5, (k) => { const e = ease(k); att.rotation.x = r0 * (1 - e); att.position.y = y0 * (1 - e); if (w) w.rotation.x = wr + (rest - wr) * e; }); }
        });
    }

    celebrate(result) {
      if (result.reason !== 'mate') {
        this.particles.burst(new THREE.Vector3(0, 0.5, 0), { colors: ['#d8ccb4', '#fff2d0', '#c8b8ff'], count: 80, up: 3, speed: 3, life: 1.6, grav: 3 });
        return;
      }
      if (this.brutal) { this.execute(result); return this.speed === 'rapido' ? 4300 : 6900; }
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
      const tall = W / Math.max(1, H2) < 0.8, base = tall ? 0.76 : 0.66, maxPhi = tall ? 1.25 : 1.0;
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
