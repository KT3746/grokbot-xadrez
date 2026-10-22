/* XADREZAO: exercitos do Xadrez Vivo (desenho proprio, tudo feito em codigo).
   Guerra dos Cem Anos (ingleses x franceses) e Espartanos x Persas.
   Cada peca tem: corpo de pano/madeira (body), partes de metal (trim), arma, coroa. */
export function buildArmy(THREE, mergeGeometries, name, E) {
  const tmpC = new THREE.Color();
  function col(g, hex) {
    g = g.index ? g.toNonIndexed() : g;
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    tmpC.setHex(hex); for (let i = 0; i < n; i++) { c[i * 3] = tmpC.r; c[i * 3 + 1] = tmpC.g; c[i * 3 + 2] = tmpC.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    return g;
  }
  const cyl = (rt, rb, h, s = 12, open = false, t0 = 0, tl = Math.PI * 2) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open, t0, tl);
  const sph = (r, w = 12, hh = 9, p0 = 0, pl = Math.PI * 2, t0 = 0, tl = Math.PI) => new THREE.SphereGeometry(r, w, hh, p0, pl, t0, tl);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  function K(g, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    if (sx !== 1 || sy !== 1 || sz !== 1) g.scale(sx, sy, sz);
    if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry);
    g.translate(x, y, z); return col(g, hex);
  }
  const UP = new THREE.Vector3(0, 1, 0);
  // cilindro ligando dois pontos (bracos, pernas, cabos)
  function seg(a, b, r1, r2, hex, s = 8) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
    const g = cyl(r2, r1, L, s); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
    const m = A.add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return col(g, hex);
  }
  // aplica rotacao e posicao a uma lista ja colorida
  function xf(list, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
    for (const g of list) { if (s !== 1) g.scale(s, s, s); if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); }
    return list;
  }
  const merge = (a) => { const g = mergeGeometries(a); g.computeBoundingBox(); return g; };

  // ---------- paletas ----------
  const PAL = {
    cem: {
      0: { nome: 'ingles', main: 0xe9e4d8, acc: 0xb3202a, leg: 0x7a2c27, boot: 0x3b2a1e, metal: 0xb7bfc9, gold: 0xd7a842, skin: 0xdcae88, wood: 0x6b4a2b, leather: 0x6a4528, ground: 0x5b6438, rim: 0xe9e4d8, horse: 0x8a5a36, hair: 0x5a3a20 },
      8: { nome: 'frances', main: 0x1d3a8f, acc: 0xd9b44a, leg: 0x262c48, boot: 0x2b2118, metal: 0x8f99a7, gold: 0xd9b44a, skin: 0xd5a47e, wood: 0x5a3d24, leather: 0x4a3020, ground: 0x4c5634, rim: 0x23232c, horse: 0x3a2a20, hair: 0x2a1a10 }
    },
    esparta: {
      0: { nome: 'esparta', main: 0xe3d6b8, acc: 0xa51c1c, leg: 0xc68c62, boot: 0x5a3a1e, metal: 0xc8913f, gold: 0xd9ac4a, skin: 0xc68c62, wood: 0x6b4a2b, leather: 0x6a4528, ground: 0xb89c68, rim: 0xeee6d4, horse: 0x8a5a33, hair: 0x3a2414 },
      8: { nome: 'persa', main: 0x4a1d6e, acc: 0xd2aa44, leg: 0x2c1f3e, boot: 0x2a1b12, metal: 0xa9b0ba, gold: 0xd2aa44, skin: 0xb57e57, wood: 0x5a3d24, leather: 0x4a3020, ground: 0x9f8559, rim: 0x26202e, horse: 0x2b211c, hair: 0x1a120c, wicker: 0xb8995a, eleph: 0x75706b }
    }
  }[name];
  const DARK = 0x16120e, IVORY = 0xeee3c8;

  // ---------- pecas de cada parte ----------
  function base(c, Bc, Bm) {
    Bc.push(K(cyl(0.33, 0.36, 0.09, 12), c.ground, 0, 0.045, 0), K(cyl(0.31, 0.33, 0.04, 12), c.rim, 0, 0.11, 0));
    void Bm;
  }
  // capacetes (cabeca em y=0.77, raio 0.08)
  function helm(kind, c, Bc, Bm, hy = 0.77) {
    const dome = (r, y, hex, to = Math.PI / 2) => K(sph(r, 14, 8, 0, Math.PI * 2, 0, to), hex, 0, y, 0);
    if (kind === 'kettle') { Bm.push(dome(0.096, hy + 0.01, c.metal), K(cyl(0.155, 0.155, 0.012, 16), c.metal, 0, hy + 0.012, 0)); }
    else if (kind === 'bascinet') { Bm.push(K(cyl(0.004, 0.094, 0.17, 12), c.metal, 0, hy + 0.11, 0.01, 0.12), dome(0.095, hy + 0.01, c.metal, Math.PI * 0.62)); Bc.push(K(box(0.12, 0.014, 0.02), DARK, 0, hy, -0.088)); }
    else if (kind === 'great') { Bm.push(K(cyl(0.098, 0.1, 0.17, 14), c.metal, 0, hy + 0.01, 0), K(cyl(0.06, 0.098, 0.03, 14), c.metal, 0, hy + 0.11, 0)); Bc.push(K(box(0.14, 0.014, 0.02), DARK, 0, hy + 0.025, -0.096), K(box(0.012, 0.09, 0.02), c.gold, 0, hy - 0.02, -0.1)); }
    else if (kind === 'corinth' || kind === 'corinthT') {
      Bm.push(dome(0.1, hy, c.metal, Math.PI * 0.6), K(box(0.045, 0.09, 0.04), c.metal, -0.055, hy - 0.05, -0.07), K(box(0.045, 0.09, 0.04), c.metal, 0.055, hy - 0.05, -0.07), K(box(0.022, 0.06, 0.03), c.metal, 0, hy - 0.02, -0.095), K(cyl(0.012, 0.016, 0.06, 6), c.metal, 0, hy + 0.12, 0));
      const tr = kind === 'corinthT';
      for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.275, x = tr ? Math.sin(a) * 0.12 : 0, z = tr ? 0 : Math.sin(a) * 0.12; Bc.push(K(box(tr ? 0.04 : 0.028, 0.07, tr ? 0.028 : 0.04), c.acc, x, hy + 0.12 + Math.cos(a) * 0.05, z, tr ? 0 : a, 0, tr ? -a : 0)); }
    }
    else if (kind === 'tiara') { Bc.push(K(cyl(0.08, 0.094, 0.13, 12), c.main, 0, hy + 0.07, 0.01, -0.18), K(sph(0.08, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c.main, 0, hy + 0.13, 0.03), K(box(0.15, 0.1, 0.03), c.main, 0, hy - 0.05, 0.075)); Bm.push(K(cyl(0.095, 0.095, 0.02, 12), c.gold, 0, hy + 0.02, 0)); }
    else if (kind === 'mask') { Bc.push(K(cyl(0.082, 0.094, 0.12, 12), c.main, 0, hy + 0.07, 0.01, -0.12), K(box(0.15, 0.12, 0.03), c.main, 0, hy - 0.05, 0.075)); Bm.push(K(box(0.13, 0.11, 0.03), c.gold, 0, hy - 0.005, -0.08), K(cyl(0.095, 0.095, 0.02, 12), c.gold, 0, hy + 0.02, 0)); Bc.push(K(box(0.11, 0.014, 0.02), DARK, 0, hy + 0.01, -0.098)); }
    else if (kind === 'cap') { Bc.push(dome(0.094, hy + 0.01, c.leather), K(cyl(0.12, 0.12, 0.01, 14), c.leather, 0, hy + 0.012, -0.02, 0.12), K(box(0.012, 0.09, 0.006), c.acc, 0.06, hy + 0.08, 0.05, 0.3, 0, -0.3)); }
    else if (kind === 'beard') { Bc.push(K(cyl(0.065, 0.02, 0.13, 8), c.hair, 0, hy - 0.07, -0.05, 0.25), K(sph(0.088, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), c.hair, 0, hy + 0.01, 0.005)); }
  }
  // escudos (centro na origem, virados para -z)
  function shield(kind, c) {
    const Bc = [], Bm = [];
    if (kind === 'heater' || kind === 'heaterF') {
      const f = kind === 'heaterF', bg = f ? c.main : 0xf1ece0;
      Bc.push(K(box(0.21, 0.1, 0.025), bg, 0, 0.11, 0), K(cyl(0.121, 0.121, 0.025, 3), bg, 0, 0, 0, Math.PI / 2));
      Bm.push(K(box(0.22, 0.016, 0.03), c.metal, 0, 0.162, 0));
      if (!f) Bc.push(K(box(0.032, 0.25, 0.012), c.acc, 0, 0.04, -0.016), K(box(0.2, 0.032, 0.012), c.acc, 0, 0.08, -0.016));
      else for (const [x, y] of [[-0.052, 0.1], [0.052, 0.1], [0, 0.0]]) {
        Bc.push(K(sph(0.016, 6, 5), c.acc, x, y + 0.012, -0.016, 0, 0, 0, 0.8, 1.4, 0.6), K(sph(0.011, 6, 5), c.acc, x - 0.017, y, -0.016, 0, 0, 0.5, 1, 1.4, 0.6), K(sph(0.011, 6, 5), c.acc, x + 0.017, y, -0.016, 0, 0, -0.5, 1, 1.4, 0.6), K(box(0.04, 0.008, 0.01), c.acc, x, y - 0.012, -0.016));
      }
    } else if (kind === 'hoplon') {
      Bm.push(K(sph(0.17, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2.7), c.metal, 0, 0, 0.02, -Math.PI / 2, 0, 0, 1, 0.5, 1), K(new THREE.TorusGeometry(0.162, 0.016, 6, 22), c.metal, 0, 0, 0.012), K(sph(0.03, 8, 6), c.gold, 0, 0, -0.06));
      Bc.push(K(new THREE.TorusGeometry(0.1, 0.012, 5, 20), c.acc, 0, 0, -0.045));
    } else if (kind === 'wicker') {
      Bc.push(K(box(0.2, 0.34, 0.022), c.wicker, 0, 0, 0));
      for (let i = 0; i < 7; i++) Bc.push(K(box(0.205, 0.016, 0.026), i & 1 ? 0x8a6d3a : 0xd2b47a, 0, -0.15 + i * 0.05, -0.002));
      Bc.push(K(box(0.03, 0.35, 0.03), c.main, 0, 0, -0.008));
    } else if (kind === 'pavise') {
      Bc.push(K(box(0.24, 0.38, 0.03), c.main, 0, 0, 0), K(box(0.06, 0.38, 0.034), c.acc, 0, 0, -0.002));
    }
    return [Bc, Bm];
  }
  function addShield(kind, c, Bc, Bm, x, y, z, ry, s = 1) { const [sc, sm] = shield(kind, c); Bc.push(...xf(sc, x, y, z, 0, ry, 0, s)); Bm.push(...xf(sm, x, y, z, 0, ry, 0, s)); }
  // um soldado em pe (pes em y=0.13)
  function man(c, o) {
    const Bc = o.Bc, Bm = o.Bm, hand = o.hand || [0.17, 0.47, -0.05], w = o.w || 1, armor = o.armor, body = o.body || c.main;
    for (const s of [-1, 1]) {
      Bc.push(seg([s * 0.06 * w, 0.16, 0], [s * 0.06 * w, 0.35, 0], 0.045 * w, 0.05 * w, o.leg || c.leg), K(box(0.07 * w, 0.05, 0.11), c.boot, s * 0.06 * w, 0.155, -0.015));
      if (o.greave) Bm.push(seg([s * 0.06 * w, 0.18, -0.01], [s * 0.06 * w, 0.32, -0.01], 0.05 * w, 0.054 * w, c.metal));
    }
    Bc.push(K(cyl(0.12 * w, (o.skirt || 0.16) * w, 0.24, 14), body, 0, 0.43, 0));
    (armor ? Bm : Bc).push(K(cyl(0.145 * w, 0.122 * w, 0.18, 14), armor || o.chest || body, 0, 0.6, 0));
    if (o.tabard) Bc.push(K(box(0.2 * w, 0.4, 0.02), o.tabard, 0, 0.5, -0.135 * w), K(box(0.2 * w, 0.4, 0.02), o.tabard, 0, 0.5, 0.135 * w));
    if (o.stripe) Bc.push(K(box(0.05 * w, 0.4, 0.024), o.stripe, 0, 0.5, -0.137 * w));
    Bm.push(K(cyl(0.13 * w, 0.13 * w, 0.03, 14), o.belt || c.gold, 0, 0.53, 0));
    const sh = armor ? Bm : Bc, sc = armor || o.shoulder || body;
    sh.push(K(sph(0.062 * w, 8, 6), sc, -0.15 * w, 0.665, 0), K(sph(0.062 * w, 8, 6), sc, 0.15 * w, 0.665, 0));
    Bc.push(seg([0.15 * w, 0.65, 0], hand, 0.036, 0.04, o.arm || body), K(sph(0.034, 8, 6), c.skin, hand[0], hand[1], hand[2]));
    const lh = o.lhand || [-0.16 * w, 0.5, -0.1];
    Bc.push(seg([-0.15 * w, 0.65, 0], lh, 0.036, 0.04, o.arm || body), K(sph(0.034, 8, 6), c.skin, lh[0], lh[1], lh[2]));
    Bc.push(K(cyl(0.035, 0.04, 0.06, 8), c.skin, 0, 0.7, 0), K(sph(0.082, 14, 10), c.skin, 0, 0.77, 0));
    if (o.beard) Bc.push(K(cyl(0.06, 0.018, 0.11, 8), c.hair, 0, 0.71, -0.055, 0.3));
    if (o.helm) helm(o.helm, c, Bc, Bm);
    if (o.shield) addShield(o.shield, c, Bc, Bm, o.shX || -0.19 * w, o.shY || 0.47, o.shZ || -0.11, o.shR == null ? -0.35 : o.shR, o.shS || 1);
    if (o.cape) Bc.push(K(cyl(0.13 * w, (o.capeW || 0.26) * w, o.capeL || 0.5, 14, true, Math.PI / 2 + 0.25, Math.PI - 0.5), o.cape, 0, 0.67 - (o.capeL || 0.5) / 2, 0.02, 0, 0, 0, 1, 1, 1.0));
  }
  // cavalo (cabeca para -z), sela em y~0.55
  function horse(c, Bc, Bm, coat, cloth, trimc) {
    for (const [x, z] of [[-0.08, -0.17], [0.08, -0.17], [-0.08, 0.17], [0.08, 0.17]]) Bc.push(seg([x, 0.13, z], [x, 0.42, z * 0.9], 0.03, 0.045, coat), K(cyl(0.035, 0.035, 0.035, 8), DARK, x, 0.145, z));
    Bc.push(K(sph(0.15, 14, 10), coat, 0, 0.5, 0, 0, 0, 0, 0.9, 0.85, 1.65));
    Bc.push(seg([0, 0.55, -0.18], [0, 0.78, -0.3], 0.085, 0.07, coat), K(box(0.1, 0.1, 0.22), coat, 0, 0.8, -0.38, 0.55), K(box(0.03, 0.2, 0.06), c.hair, 0, 0.72, -0.24, -0.5));
    Bc.push(K(cyl(0, 0.025, 0.07, 5), coat, -0.035, 0.89, -0.31), K(cyl(0, 0.025, 0.07, 5), coat, 0.035, 0.89, -0.31), seg([0, 0.5, 0.24], [0, 0.32, 0.34], 0.03, 0.012, c.hair));
    if (cloth) { Bc.push(K(cyl(0.165, 0.18, 0.18, 16, true), cloth, 0, 0.45, 0, 0, 0, 0, 1, 1, 1.7)); if (trimc) Bc.push(K(cyl(0.182, 0.182, 0.02, 16, true), trimc, 0, 0.365, 0, 0, 0, 0, 1, 1, 1.7)); }
    Bm.push(K(box(0.1, 0.11, 0.08), c.metal, 0, 0.83, -0.42, 0.55));
  }
  // cavaleiro montado: o tronco sai da sela
  function rider(c, Bc, Bm, o) {
    Bc.push(seg([-0.1, 0.5, 0], [-0.11, 0.36, -0.03], 0.03, 0.035, o.leg || c.leg), seg([0.1, 0.5, 0], [0.11, 0.36, -0.03], 0.03, 0.035, o.leg || c.leg));
    (o.armor ? Bm : Bc).push(K(cyl(0.12, 0.11, 0.24, 12), o.armor || o.body || c.main, 0, 0.72, 0.02));
    if (o.tabard) Bc.push(K(cyl(0.125, 0.135, 0.16, 12), o.tabard, 0, 0.66, 0.02));
    Bc.push(seg([0.12, 0.8, 0.02], [0.2, 0.6, 0.02], 0.032, 0.036, o.arm || o.body || c.main), K(sph(0.03, 8, 6), c.skin, 0.2, 0.6, 0.02));
    Bc.push(seg([-0.12, 0.8, 0.02], [-0.1, 0.66, -0.12], 0.032, 0.036, o.arm || o.body || c.main));
    Bc.push(K(sph(0.075, 12, 9), c.skin, 0, 0.92, 0.02));
    const hb = []; const hm = [];
    if (o.helm) helm(o.helm, c, hb, hm);
    Bc.push(...xf(hb, 0, 0.15, 0.02, 0, 0, 0, 0.92)); Bm.push(...xf(hm, 0, 0.15, 0.02, 0, 0, 0, 0.92));
    if (o.shield) addShield(o.shield, c, Bc, Bm, -0.17, 0.66, -0.02, -0.9, 0.8);
    if (o.cape) Bc.push(K(cyl(0.12, 0.2, 0.36, 12, true, Math.PI / 2 + 0.25, Math.PI - 0.5), o.cape, 0, 0.66, 0.05));
  }
  // ---------- armas (com cores) ----------
  function sword(c, len, w = 0.028, grip = 0.08, blade) {
    const b = blade || c.metal;
    return merge([K(box(w, len, 0.012), b, 0, 0.03 + len / 2, 0), K(cyl(0, w * 0.72, 0.07, 4), b, 0, 0.03 + len + 0.035, 0, 0, Math.PI / 4, 0, 1, 1, 0.43),
      K(box(0.11 + w * 1.6, 0.022, 0.035), c.gold, 0, 0.03, 0), K(cyl(0.014, 0.014, grip, 6), c.leather, 0, 0.02 - grip / 2, 0), K(sph(0.022, 6, 5), c.gold, 0, 0.01 - grip, 0)]);
  }
  // lamina curva: ate 'bend' radianos (positivo curva para tras, negativo para a frente)
  function curved(c, len, bend, w = 0.04) {
    const g = [], n = 7, l = len / n; let y = 0.03, z = 0, a = 0;
    for (let i = 0; i < n; i++) { const ww = w * (1 + 0.5 * Math.sin(i / (n - 1) * Math.PI) * (bend < 0 ? 1.2 : 0.6)) * (i === n - 1 ? 0.7 : 1); g.push(K(box(0.012, l * 1.08, ww), c.metal, 0, y + Math.cos(a) * l / 2, z + Math.sin(a) * l / 2, a)); y += Math.cos(a) * l; z += Math.sin(a) * l; a += bend / n; }
    g.push(K(cyl(0, w * 0.5, 0.06, 4), c.metal, 0, y + Math.cos(a) * 0.03, z + Math.sin(a) * 0.03, a, Math.PI / 4, 0, 1, 1, 0.3));
    g.push(K(box(0.025, 0.022, 0.1), c.gold, 0, 0.03, 0), K(cyl(0.014, 0.014, 0.08, 6), c.leather, 0, -0.02, 0), K(sph(0.022, 6, 5), c.gold, 0, -0.07, 0));
    return merge(g);
  }
  function spear(c, len, blade) {
    return merge([K(cyl(0.012, 0.014, len, 6), c.wood, 0, len / 2 - 0.25, 0), K(cyl(0, 0.032, 0.16, 4), blade || c.metal, 0, len - 0.25 + 0.08, 0, 0, Math.PI / 4, 0, 1, 1, 0.35),
      K(cyl(0.016, 0.016, 0.03, 6), blade || c.metal, 0, len - 0.26, 0), K(cyl(0.004, 0.016, 0.07, 6), blade || c.metal, 0, -0.28, 0)]);
  }
  function lance(c, len, pen) {
    return merge([K(cyl(0.004, 0.03, len, 8), c.wood, 0, len / 2, 0), K(cyl(0.004, 0.03, len * 0.35, 8), pen || c.acc, 0, len * 0.2, 0, 0, 0, 0, 1.06, 1, 1.06), K(cyl(0.075, 0.012, 0.12, 10), c.metal, 0, 0.02, 0),
      K(cyl(0.02, 0.022, 0.22, 6), c.leather, 0, -0.1, 0), K(sph(0.026, 6, 5), c.metal, 0, -0.22, 0)]);
  }
  function hammer(c, len, head) {
    const top = len - 0.2, h = head || c.metal;
    return merge([K(cyl(0.02, 0.024, len, 6), c.wood, 0, len / 2 - 0.2, 0), K(box(0.12, 0.13, 0.25), h, 0, top, 0), K(box(0.14, 0.15, 0.04), h, 0, top, 0.115), K(box(0.14, 0.15, 0.04), h, 0, top, -0.115),
      K(cyl(0, 0.04, 0.08, 4), h, 0, top + 0.1, 0), K(cyl(0, 0.035, 0.07, 4), h, 0, top, -0.16, -Math.PI / 2), K(cyl(0.03, 0.03, 0.05, 6), c.gold, 0, -0.2, 0)]);
  }
  function mace(c, len) {
    const top = len - 0.2, g = [K(cyl(0.02, 0.024, len, 6), c.wood, 0, len / 2 - 0.2, 0), K(sph(0.085, 10, 8), c.gold, 0, top, 0)];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.push(K(cyl(0, 0.03, 0.08, 4), c.metal, Math.sin(a) * 0.09, top + (i & 1 ? 0.03 : -0.03), Math.cos(a) * 0.09, Math.PI / 2, a)); }
    g.push(K(cyl(0, 0.03, 0.09, 4), c.metal, 0, top + 0.12, 0));
    return merge(g);
  }
  // arcos e bestas (presos ao corpo)
  function longbow(c, Bc, x, y, z, h, tall) {
    const r = tall / 2, n = 9;
    for (let i = 0; i < n; i++) { const a = -0.6 + i * 1.2 / (n - 1), a2 = a + 1.2 / (n - 1); Bc.push(seg([x, y + Math.sin(a) * r, z - Math.cos(a) * r * 0.35 + r * 0.3], [x, y + Math.sin(a2) * r, z - Math.cos(a2) * r * 0.35 + r * 0.3], 0.011, 0.011, c.wood, 5)); }
    Bc.push(seg([x, y - Math.sin(0.6) * r, z - Math.cos(0.6) * r * 0.35 + r * 0.3], [x, y + Math.sin(0.6) * r, z - Math.cos(0.6) * r * 0.35 + r * 0.3], 0.003, 0.003, 0xeee8d8, 4));
    void h;
  }
  function crossbow(c, Bc, Bm, x, y, z) {
    Bc.push(K(box(0.04, 0.04, 0.3), c.wood, x, y, z));
    Bm.push(seg([x - 0.15, y + 0.01, z - 0.12], [x, y + 0.02, z - 0.16], 0.008, 0.008, c.metal, 5), seg([x, y + 0.02, z - 0.16], [x + 0.15, y + 0.01, z - 0.12], 0.008, 0.008, c.metal, 5));
    Bc.push(seg([x - 0.15, y + 0.01, z - 0.12], [x, y + 0.02, z + 0.02], 0.003, 0.003, 0xeee8d8, 4), seg([x + 0.15, y + 0.01, z - 0.12], [x, y + 0.02, z + 0.02], 0.003, 0.003, 0xeee8d8, 4));
  }
  function quiver(c, Bc, x, y, z) {
    Bc.push(K(cyl(0.04, 0.035, 0.26, 8), c.leather, x, y, z, 0, 0, 0.35));
    for (let i = 0; i < 4; i++) Bc.push(K(box(0.012, 0.05, 0.004), i & 1 ? 0xf2efe6 : c.acc, x - 0.05 - i * 0.01, y + 0.15, z + (i - 1.5) * 0.012, 0, 0, 0.35));
  }
  // coroas
  function crown(c, kind) {
    const g = [K(cyl(0.088, 0.078, 0.055, 12), c.gold, 0, 0.028, 0)];
    if (kind === 'lis') { for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; g.push(K(sph(0.02, 6, 5), c.gold, Math.sin(a) * 0.085, 0.085, Math.cos(a) * 0.085, 0, 0, 0, 0.8, 1.6, 0.8), K(sph(0.013, 6, 5), c.gold, Math.sin(a + 0.25) * 0.085, 0.07, Math.cos(a + 0.25) * 0.085), K(sph(0.013, 6, 5), c.gold, Math.sin(a - 0.25) * 0.085, 0.07, Math.cos(a - 0.25) * 0.085)); } }
    else if (kind === 'cross') { g.push(K(box(0.025, 0.11, 0.025), c.gold, 0, 0.12, 0), K(box(0.08, 0.025, 0.025), c.gold, 0, 0.14, 0)); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; g.push(K(box(0.035, 0.06, 0.035), c.gold, Math.sin(a) * 0.085, 0.08, Math.cos(a) * 0.085, 0, a)); } }
    else if (kind === 'laurel') { g.length = 0; for (let i = 0; i < 14; i++) { const a = -2.6 + i * 0.4; g.push(K(sph(0.022, 6, 4), c.gold, Math.sin(a) * 0.088, 0.03 + Math.abs(a) * 0.006, Math.cos(a) * 0.088, 0, a, 0.6, 0.6, 0.5, 1.4)); } g.push(K(cyl(0.09, 0.09, 0.012, 14), c.gold, 0, 0.02, 0)); }
    else if (kind === 'persa') { g.length = 0; g.push(K(cyl(0.09, 0.08, 0.16, 12), c.gold, 0, 0.08, 0)); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.push(K(box(0.04, 0.05, 0.03), c.gold, Math.sin(a) * 0.088, 0.18, Math.cos(a) * 0.088, 0, a)); } g.push(K(sph(0.02, 6, 5), 0xc23040, 0, 0.09, -0.09)); }
    else { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.push(K(cyl(0, 0.024, 0.075, 4), c.gold, Math.sin(a) * 0.08, 0.09, Math.cos(a) * 0.08), K(sph(0.016, 6, 4), c.gold, Math.sin(a) * 0.08, 0.135, Math.cos(a) * 0.08)); } }
    return merge(g);
  }
  // torre de cerco (madeira, rodas, escudos)
  function siegeTower(c, Bc, Bm, shieldKind, banner) {
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) Bc.push(K(cyl(0.07, 0.07, 0.04, 10), DARK, x * 1.15, 0.2, z, 0, 0, Math.PI / 2));
    Bc.push(K(box(0.44, 0.62, 0.44), c.wood, 0, 0.5, 0));
    for (let i = 0; i < 4; i++) Bc.push(K(box(0.46, 0.025, 0.46), 0x4a3220, 0, 0.26 + i * 0.16, 0));
    for (const [x, z] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]]) Bc.push(K(box(0.05, 0.66, 0.05), 0x4a3220, x, 0.5, z));
    Bc.push(K(box(0.5, 0.05, 0.5), c.wood, 0, 0.83, 0));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; Bc.push(K(box(0.08, 0.1, 0.05), c.wood, Math.sin(a) * 0.22, 0.9, Math.cos(a) * 0.22, 0, a)); }
    if (shieldKind) for (const a of [0, Math.PI / 2, -Math.PI / 2]) { const [sc, sm] = shield(shieldKind, c); Bc.push(...xf(sc, -Math.sin(a) * 0.235, 0.5, -Math.cos(a) * 0.235, 0, a, 0, 0.85)); Bm.push(...xf(sm, -Math.sin(a) * 0.235, 0.5, -Math.cos(a) * 0.235, 0, a, 0, 0.85)); }
    Bc.push(seg([0.16, 0.85, 0.16], [0.16, 1.2, 0.16], 0.01, 0.01, c.wood, 5), K(box(0.005, 0.12, 0.18), banner, 0.16, 1.12, 0.07));
  }
  function elephant(c, Bc, Bm) {
    const g = c.eleph;
    for (const [x, z] of [[-0.12, -0.16], [0.12, -0.16], [-0.12, 0.16], [0.12, 0.16]]) Bc.push(K(cyl(0.07, 0.075, 0.3, 10), g, x, 0.27, z));
    Bc.push(K(sph(0.22, 16, 12), g, 0, 0.53, 0.02, 0, 0, 0, 0.92, 0.85, 1.3));
    Bc.push(K(sph(0.13, 14, 10), g, 0, 0.62, -0.28));
    Bc.push(K(sph(0.1, 10, 8), g, -0.13, 0.64, -0.24, 0, 0, 0, 0.4, 1.2, 1), K(sph(0.1, 10, 8), g, 0.13, 0.64, -0.24, 0, 0, 0, 0.4, 1.2, 1));
    Bc.push(seg([0, 0.58, -0.38], [0, 0.4, -0.44], 0.045, 0.04, g), seg([0, 0.4, -0.44], [0, 0.22, -0.42], 0.04, 0.03, g), seg([0, 0.22, -0.42], [0, 0.16, -0.36], 0.03, 0.025, g));
    Bc.push(seg([-0.06, 0.53, -0.36], [-0.07, 0.42, -0.5], 0.018, 0.006, IVORY, 6), seg([0.06, 0.53, -0.36], [0.07, 0.42, -0.5], 0.018, 0.006, IVORY, 6));
    Bc.push(K(cyl(0.21, 0.23, 0.1, 16, true), c.main, 0, 0.62, 0.04, 0, 0, 0, 1, 1, 1.25), K(cyl(0.232, 0.232, 0.025, 16, true), c.gold, 0, 0.57, 0.04, 0, 0, 0, 1, 1, 1.25));
    // liteira (howdah) com dossel
    Bc.push(K(box(0.3, 0.12, 0.3), c.gold, 0, 0.79, 0.05), K(box(0.32, 0.03, 0.32), c.main, 0, 0.86, 0.05));
    for (const [x, z] of [[-0.14, -0.09], [0.14, -0.09], [-0.14, 0.19], [0.14, 0.19]]) Bm.push(K(cyl(0.01, 0.01, 0.26, 6), c.gold, x, 0.98, z));
    Bc.push(K(cyl(0.02, 0.24, 0.1, 4), c.main, 0, 1.15, 0.05, 0, Math.PI / 4));
  }
  function throne(c, Bc, Bm) {
    Bc.push(K(box(0.42, 0.2, 0.36), c.gold, 0, 0.24, 0.02), K(box(0.44, 0.04, 0.38), c.main, 0, 0.36, 0.02));
    Bc.push(K(box(0.42, 0.62, 0.06), c.gold, 0, 0.62, 0.2), K(box(0.34, 0.5, 0.02), c.main, 0, 0.6, 0.165));
    for (const x of [-0.2, 0.2]) Bc.push(K(box(0.05, 0.16, 0.3), c.gold, x, 0.46, 0.02), K(sph(0.035, 8, 6), c.gold, x, 0.56, -0.13));
    for (const x of [-0.17, -0.06, 0.06, 0.17]) Bm.push(K(cyl(0, 0.025, 0.07, 4), c.gold, x, 0.96, 0.2));
  }

  // ---------- os modelos ----------
  function pieces(side) {
    const c = PAL[side], cem = name === 'cem', en = side === 0, Pp = {};
    const mk = (fn) => { const Bc = [], Bm = []; base(c, Bc, Bm); const r = fn(Bc, Bm); r.body = merge(Bc); r.trim = Bm.length ? merge(Bm) : null; return r; };
    // Peao
    Pp[E.P] = mk((Bc, Bm) => {
      if (cem) man(c, { Bc, Bm, helm: en ? 'kettle' : 'bascinet', shield: en ? 'heater' : 'heaterF', tabard: c.main, stripe: c.acc, body: en ? 0x9a8f7c : 0x3a3f5a, belt: c.leather });
      else if (en) man(c, { Bc, Bm, helm: 'corinth', shield: 'hoplon', armor: c.metal, body: c.main, cape: c.acc, greave: true, leg: c.skin, arm: c.skin, belt: c.leather, shX: -0.2, shZ: -0.12 });
      else man(c, { Bc, Bm, helm: 'mask', shield: 'wicker', body: c.main, chest: c.main, leg: c.leg, belt: c.gold, stripe: c.gold, shR: -0.2 });
      return { h: 0.92, weapon: cem ? { geo: sword(c, 0.34), pivot: new THREE.Vector3(0.17, 0.47, -0.05), rest: -0.25 } : en ? { geo: spear(c, 0.82), pivot: new THREE.Vector3(0.17, 0.47, -0.05), rest: -0.25, tip: 0.55 } : { geo: curved(c, 0.36, 0.7), pivot: new THREE.Vector3(0.17, 0.47, -0.05), rest: -0.25 } };
    });
    // Cavalo
    Pp[E.N] = mk((Bc, Bm) => {
      if (cem) { horse(c, Bc, Bm, c.horse, c.main, c.acc); rider(c, Bc, Bm, { helm: 'great', armor: c.metal, tabard: en ? c.main : c.main, shield: en ? 'heater' : 'heaterF', leg: c.metal }); }
      else if (en) { horse(c, Bc, Bm, c.horse, c.acc, c.metal); rider(c, Bc, Bm, { helm: 'corinth', armor: c.metal, leg: c.skin, arm: c.skin, cape: c.acc }); }
      else { horse(c, Bc, Bm, c.horse, c.main, c.gold); rider(c, Bc, Bm, { helm: 'tiara', body: c.main, leg: c.leg, shield: 'wicker' }); }
      return { h: 1.12, weapon: { geo: cem ? lance(c, 0.95) : spear(c, 0.95), pivot: new THREE.Vector3(0.2, 0.6, 0.02), rest: -1.25, tip: 0.95 } };
    });
    // Torre
    Pp[E.R] = mk((Bc, Bm) => {
      if (cem) { man(c, { Bc, Bm, w: 1.3, helm: 'great', armor: c.metal, body: c.main, tabard: c.main, stripe: c.acc, leg: c.metal, greave: true, hand: [0.3, 0.44, -0.04], cape: c.acc, capeL: 0.48 }); return { h: 0.98, weapon: { geo: hammer(c, 0.78), pivot: new THREE.Vector3(0.3, 0.44, -0.04), rest: -0.12, tip: 0.58 } }; }
      if (en) { siegeTower(c, Bc, Bm, 'hoplon', c.acc); return { h: 1.05, weapon: { geo: hammer(c, 0.78, c.metal), pivot: new THREE.Vector3(0.3, 0.6, -0.04), rest: -0.12, tip: 0.58 } }; }
      elephant(c, Bc, Bm); return { h: 1.2, weapon: { geo: mace(c, 0.7), pivot: new THREE.Vector3(0.22, 0.86, -0.02), rest: -0.12, tip: 0.5 } };
    });
    // Bispo: arqueiro / besteiro / oficial
    Pp[E.B] = mk((Bc, Bm) => {
      const hand = [0.19, 0.56, -0.07];
      if (cem && en) { man(c, { Bc, Bm, helm: 'cap', body: 0xb9a98a, chest: c.main, stripe: c.acc, leg: c.leg, hand, lhand: [-0.17, 0.55, -0.12] }); longbow(c, Bc, -0.19, 0.6, -0.12, 0, 0.92); quiver(c, Bc, 0.1, 0.62, 0.13); }
      else if (cem) { man(c, { Bc, Bm, helm: 'bascinet', body: c.main, chest: c.main, stripe: c.acc, leg: c.leg, hand }); crossbow(c, Bc, Bm, -0.17, 0.5, -0.1); addShield('pavise', c, Bc, Bm, 0, 0.55, 0.15, Math.PI); }
      else if (en) man(c, { Bc, Bm, helm: 'corinthT', armor: c.metal, body: c.acc, leg: c.skin, arm: c.skin, greave: true, cape: c.acc, capeL: 0.56, hand });
      else { man(c, { Bc, Bm, helm: 'tiara', body: c.main, leg: c.leg, stripe: c.gold, beard: true, hand, lhand: [-0.17, 0.55, -0.12] }); longbow(c, Bc, -0.19, 0.6, -0.12, 0, 0.7); quiver(c, Bc, 0.1, 0.62, 0.13); }
      const wg = cem ? sword(c, 0.36, 0.03) : en ? curved(c, 0.38, -0.7, 0.045) : curved(c, 0.4, 0.75);
      return { h: 1.05, archer: (cem || !en) ? (cem && !en ? 'besta' : 'arco') : null, weapon: { geo: wg, pivot: new THREE.Vector3(...hand), rest: -0.08, tip: 0.45 } };
    });
    // Dama
    Pp[E.Q] = mk((Bc, Bm) => {
      const hand = [0.2, 0.6, -0.08];
      if (cem) man(c, { Bc, Bm, armor: c.metal, body: c.main, skirt: 0.27, cape: c.acc, capeL: 0.62, capeW: 0.3, hand });
      else if (en) man(c, { Bc, Bm, body: c.main, chest: c.main, skirt: 0.26, cape: c.acc, capeL: 0.62, capeW: 0.3, hand, arm: c.skin, belt: c.metal });
      else man(c, { Bc, Bm, body: c.main, chest: c.main, skirt: 0.27, cape: c.gold, capeL: 0.6, capeW: 0.3, hand, stripe: c.gold });
      Bc.push(K(sph(0.088, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), c.hair, 0, 0.775, 0.008), K(cyl(0.05, 0.07, 0.16, 8), c.hair, 0, 0.71, 0.05));
      return { h: 1.1, crownY: 0.84, crown: crown(c, cem ? (en ? 'cross' : 'lis') : en ? 'laurel' : 'persa'), weapon: { geo: en || cem ? (cem ? sword(c, 0.58, 0.03) : spear(c, 0.95)) : curved(c, 0.56, 0.7), pivot: new THREE.Vector3(...hand), rest: -0.22, tip: 0.66 } };
    });
    // Rei
    Pp[E.K] = mk((Bc, Bm) => {
      const hand = [0.22, 0.6, -0.06];
      if (cem) { man(c, { Bc, Bm, w: 1.12, armor: c.metal, body: c.main, tabard: c.main, stripe: c.acc, cape: en ? c.acc : c.main, capeL: 0.64, capeW: 0.34, beard: true, hand, greave: true, leg: c.metal }); return { h: 1.15, crownY: 0.84, crown: crown(c, en ? 'cross' : 'lis'), weapon: { geo: sword(c, 0.66, 0.046, 0.16), pivot: new THREE.Vector3(...hand), rest: -0.22, tip: 0.72 } }; }
      if (en) { man(c, { Bc, Bm, w: 1.12, helm: 'corinthT', armor: c.metal, body: c.acc, leg: c.skin, arm: c.skin, greave: true, cape: c.acc, capeL: 0.64, capeW: 0.36, shield: 'hoplon', hand }); return { h: 1.15, crownY: 0.86, crown: crown(c, 'laurel'), weapon: { geo: sword(c, 0.5, 0.05, 0.12), pivot: new THREE.Vector3(...hand), rest: -0.22, tip: 0.6 } }; }
      // rei persa no trono
      throne(c, Bc, Bm);
      const S = [], M = []; man(c, { Bc: S, Bm: M, body: c.main, chest: c.main, stripe: c.gold, beard: true, hand: [0.2, 0.42, -0.1], lhand: [-0.18, 0.42, -0.1], leg: c.leg });
      // sentado: a parte de baixo vira coxas para a frente
      Bc.push(...xf(S.slice(4), 0, 0.18, 0)); Bm.push(...xf(M, 0, 0.18, 0));
      for (const s of [-1, 1]) Bc.push(seg([s * 0.07, 0.4, -0.02], [s * 0.07, 0.4, -0.2], 0.05, 0.05, c.leg), seg([s * 0.07, 0.4, -0.2], [s * 0.07, 0.15, -0.22], 0.045, 0.045, c.leg), K(box(0.07, 0.05, 0.11), c.boot, s * 0.07, 0.15, -0.25));
      return { h: 1.2, crownY: 1.01, crown: crown(c, 'persa'), weapon: { geo: curved(c, 0.56, 0.75, 0.05), pivot: new THREE.Vector3(0.2, 0.6, -0.1), rest: -0.22, tip: 0.66 } };
    });
    // mesmo tamanho das estatuas
    const SX = 1.2, SY = 1.1;
    for (const k in Pp) {
      const q = Pp[k]; q.body.scale(SX, SY, SX); q.body.computeBoundingBox(); if (q.trim) q.trim.scale(SX, SY, SX); q.h *= SY;
      if (q.weapon) { if (q.weapon.tip) q.weapon.tip *= SY; q.weapon.geo.scale(SX, SY, SX); q.weapon.pivot.set(q.weapon.pivot.x * SX, q.weapon.pivot.y * SY, q.weapon.pivot.z * SX); }
      if (q.crown) { q.crown.scale(SX, SY, SX); q.crownY *= SY; }
    }
    return Pp;
  }
  const parts = { 0: pieces(0), 8: pieces(8) };
  const cloth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, envMapIntensity: 0.45 });
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.75, envMapIntensity: 1.1 });
  cloth.userData = { cc: 0, sh: 0 }; metal.userData = { cc: 0, sh: 0 };
  const chunk = { 0: new THREE.MeshStandardMaterial({ color: PAL[0].main, roughness: 0.8 }), 8: new THREE.MeshStandardMaterial({ color: PAL[8].main, roughness: 0.8 }) };
  const outline = { 0: 0x1e150d, 8: name === 'cem' ? 0x9db0e8 : 0xc9a8e8 };
  return { name, parts, cloth, metal, chunk, outline, pal: PAL, proj: name === 'cem' ? 'canhao' : 'pote' };
}
