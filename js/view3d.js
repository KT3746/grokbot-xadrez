/* Tabuleiro 3D do XADREZAO: modelos, materiais, luzes e efeitos feitos em codigo */
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const E = window.XEngine;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const now = () => performance.now() / 1000;

function sqPos(sq) { return new THREE.Vector3((sq & 7) - 3.5, 0, 3.5 - (sq >> 4)); }

// ---------- Texturas procedurais ----------
function rnd(a, b) { return a + Math.random() * (b - a); }
// vistas da camera (elevacao em radianos)
const VIEWS = { alta: 1.2, media: 0.95, baixa: 0.72 }; // 'auto' = enquadramento original (padrao)
// temas do tabuleiro (o primeiro e o de maior contraste com as pecas)
export const THEMES = {
  classico: { l: ['#d3a86c', '#bf9156'], d: ['#3f7b63', '#316650'], vl: [110, 80, 50], vd: [200, 230, 215], frame: '#6a4225' },
  madeira: { l: ['#d9a564', '#c58f4e'], d: ['#87562f', '#714522'], vl: [120, 80, 40], vd: [40, 20, 8], frame: '#4a2c17' },
  azul: { l: ['#a9b8c6', '#93a4b5'], d: ['#466283', '#38526f'], vl: [70, 85, 100], vd: [190, 210, 230], frame: '#3a2a20' },
};
function marbleCanvas(size, themeName) {
  const T = THEMES[themeName] || THEMES.classico;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true }), s = size / 8;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const light = (r + f) % 2 === 0;
    const x = f * s, y = r * s;
    g.save(); g.beginPath(); g.rect(x, y, s, s); g.clip();
    const grd = g.createLinearGradient(x, y, x + s, y + s);
    const C = light ? T.l : T.d;
    grd.addColorStop(0, C[0]); grd.addColorStop(1, C[1]);
    g.fillStyle = grd; g.fillRect(x, y, s, s);
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      const sx = x + rnd(-0.2, 1.2) * s, sy = y + rnd(-0.2, 1.2) * s;
      g.moveTo(sx, sy);
      g.bezierCurveTo(x + rnd(0, 1) * s, y + rnd(0, 1) * s, x + rnd(0, 1) * s, y + rnd(0, 1) * s, x + rnd(-0.2, 1.2) * s, y + rnd(-0.2, 1.2) * s);
      g.lineWidth = rnd(0.4, 2.2) * size / 512;
      const vc = light ? T.vl : T.vd;
      g.strokeStyle = `rgba(${vc[0]},${vc[1]},${vc[2]},${light ? rnd(0.12, 0.32) : rnd(0.08, 0.26)})`;
      g.stroke();
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = light ? `rgba(120,100,80,${rnd(0.03, 0.1)})` : `rgba(10,30,25,${rnd(0.05, 0.2)})`;
      g.fillRect(x + Math.random() * s, y + Math.random() * s, rnd(1, 3), rnd(1, 3));
    }
    g.restore();
  }
  return c;
}
function woodCanvas(w, h, labels) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  const grd0 = g.createLinearGradient(0, 0, w, h); grd0.addColorStop(0, '#6a4225'); grd0.addColorStop(0.5, '#5a361d'); grd0.addColorStop(1, '#4a2c17');
  g.fillStyle = grd0; g.fillRect(0, 0, w, h);
  // veios: linhas onduladas com nos (aneis) aqui e ali
  const knots = [0, 1, 2].map(() => [Math.random() * w, Math.random() * h, rnd(30, 90)]);
  for (let i = 0; i < 340; i++) {
    const y = Math.random() * h, amp = rnd(1.5, 7), per = rnd(60, 260), ph = Math.random() * 6;
    g.beginPath();
    for (let x = 0; x <= w; x += 8) {
      let yy = y + Math.sin(x / per + ph) * amp + Math.sin(x / 23 + i) * 0.6;
      for (const k of knots) { const dx = x - k[0], dy = yy - k[1], dd = dx * dx + dy * dy; yy += dy * k[2] * k[2] / (dd + k[2] * k[2]) * 0.6; }
      x ? g.lineTo(x, yy) : g.moveTo(x, yy);
    }
    g.lineWidth = rnd(0.4, 2.6) * w / 1024;
    g.strokeStyle = Math.random() < 0.55 ? `rgba(28,13,5,${rnd(0.08, 0.32)})` : `rgba(170,115,65,${rnd(0.04, 0.18)})`;
    g.stroke();
  }
  const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,220,170,0.06)'); sh.addColorStop(1, 'rgba(0,0,0,0.08)');
  g.fillStyle = sh; g.fillRect(0, 0, w, h);
  if (labels) {
    // coordenadas na moldura (9.6 unidades no total, tabuleiro de 8 no centro)
    const u = w / 9.6;
    g.fillStyle = 'rgba(245,225,190,0.85)';
    g.font = `600 ${Math.round(u * 0.36)}px Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      const file = 'abcdefgh'[i], rank = String(8 - i);
      const p = u * (0.8 + i + 0.5);
      g.fillText(file, p, h - u * 0.4); g.fillText(rank, u * 0.4, p);
      g.save(); g.translate(p, u * 0.4); g.rotate(Math.PI); g.fillText(file, 0, 0); g.restore();
      g.save(); g.translate(w - u * 0.4, p); g.rotate(Math.PI); g.fillText(rank, 0, 0); g.restore();
    }
    g.strokeStyle = 'rgba(230,190,120,0.55)'; g.lineWidth = u * 0.04;
    g.strokeRect(u * 0.74, u * 0.74, w - u * 1.48, h - u * 1.48);
  }
  return c;
}

// mapa de normais a partir do brilho de um canvas
function normalFrom(src0, strength, invert) {
  let src = src0;
  if (src0.width > 512) { src = document.createElement('canvas'); src.width = src.height = 512; src.getContext('2d', { willReadFrequently: true }).drawImage(src0, 0, 0, 512, 512); }
  const w = src.width, h = src.height, sg = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }), out = g.createImageData(w, h), d = out.data; // normal map
  const L = (x, y) => { x = (x + w) % w; y = (y + h) % h; const i = (y * w + x) * 4; return (sg[i] + sg[i + 1] + sg[i + 2]) / 765; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let dx = (L(x + 1, y) - L(x - 1, y)) * strength, dy = (L(x, y + 1) - L(x, y - 1)) * strength;
    if (invert) { dx = -dx; dy = -dy; }
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  g.putImageData(out, 0, 0); return c;
}
function noiseCanvas(size, base, spread, streak) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = base; g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * spread; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  if (streak) {
    for (let i = 0; i < streak.n; i++) {
      const x = Math.random() * size, wv = rnd(0.5, 3) * size / 256;
      g.strokeStyle = streak.col(); g.lineWidth = wv; g.beginPath();
      for (let y = -10; y <= size + 10; y += 8) { const xx = x + Math.sin(y / rnd(30, 90) + i) * rnd(1, 4); y < 0 ? g.moveTo(xx, y) : g.lineTo(xx, y); }
      g.stroke();
    }
  }
  return c;
}
function ctex(canvas, srgb, rep) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (rep) t.repeat.set(rep, rep);
  return t;
}
function glowCanvas(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d', { willReadFrequently: true }), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128); return c;
}
function bgCanvas() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 256;
  const g = c.getContext('2d', { willReadFrequently: true }), grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#1d2740'); grd.addColorStop(0.55, '#0f1424'); grd.addColorStop(1, '#07090f');
  g.fillStyle = grd; g.fillRect(0, 0, 16, 256); return c;
}

// ---------- Modelos das pecas ----------
function arc(cy, r, a0, a1, n, cx = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([Math.max(0, cx + r * Math.cos(a)), cy + r * Math.sin(a)]); }
  return pts;
}
// suaviza um perfil (Catmull-Rom) mantendo os pontos marcados com '!' como quinas
function smooth(pts, sub = 3) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([Math.max(0, f(p0[0], p1[0], p2[0], p3[0])), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function lathe(pts, seg) { return new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); }
function tint(geo, v) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const n = geo.attributes.position.count, col = new Float32Array(n * 3).fill(v);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return geo;
}
function rbox(w, h, d, r, segs = 2) {
  // caixa com cantos arredondados (extrusao com chanfro)
  const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
  s.moveTo(-w / 2, -y);
  s.absarc(-x, -y, r, Math.PI, Math.PI * 1.5); s.absarc(x, -y, r, Math.PI * 1.5, Math.PI * 2);
  s.absarc(x, y, r, 0, Math.PI / 2); s.absarc(-x, y, r, Math.PI / 2, Math.PI);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: segs, curveSegments: 4 });
  g.translate(0, 0, -(d - 2 * r) / 2);
  return g;
}
// tubo de secao eliptica variavel ao longo de uma curva (para a cabeca do cavalo)
function loft(curve, radii, segL, segR) {
  const pos = [], uv = [], idx = [];
  const P = new THREE.Vector3(), T = new THREE.Vector3(), Nn = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= segL; i++) {
    const t = i / segL;
    curve.getPointAt(t, P); curve.getTangentAt(t, T);
    Nn.set(-T.y, T.x, 0).normalize();
    const [rn, rz] = radii(t);
    for (let j = 0; j <= segR; j++) {
      const a = j / segR * Math.PI * 2;
      pos.push(P.x + Nn.x * rn * Math.cos(a), P.y + Nn.y * rn * Math.cos(a), P.z + rz * Math.sin(a));
      uv.push(j / segR, t);
    }
  }
  for (let i = 0; i < segL; i++) for (let j = 0; j < segR; j++) {
    const a = i * (segR + 1) + j, b = a + segR + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const BASE = [[0, 0], [0.33, 0], [0.365, 0.012], [0.375, 0.04], [0.37, 0.065], [0.345, 0.09], [0.35, 0.105], [0.33, 0.125], [0.29, 0.14], [0.27, 0.17]];
function collar(y, r, t, seg) { const g = new THREE.TorusGeometry(r, t, 10, seg); g.rotateX(Math.PI / 2); g.translate(0, y, 0); return g; }
function buildGeometries(seg) {
  const G = {};
  // Peao
  G[E.P] = mergeGeometries([
    tint(lathe([...BASE, ...smooth([[0.25, 0.19], [0.19, 0.24], [0.14, 0.32], [0.115, 0.4], [0.11, 0.44]]), [0.17, 0.445], [0.185, 0.47], [0.17, 0.495], [0.1, 0.505], ...arc(0.62, 0.13, -62, 90, 14)], seg), 1),
  ]);
  // Torre: corpo, ameias arredondadas e aneis
  {
    const prof = [...BASE, ...smooth([[0.25, 0.2], [0.215, 0.27], [0.2, 0.4], [0.198, 0.52], [0.21, 0.6]]), [0.25, 0.625], [0.275, 0.645], [0.285, 0.67], [0.285, 0.74], [0.205, 0.74], [0.195, 0.7], [0, 0.7]];
    const parts = [tint(lathe(prof, seg), 1)];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * Math.PI * 2, b = rbox(0.13, 0.12, 0.085, 0.018);
      b.rotateY(-a + Math.PI / 2); b.translate(Math.cos(a) * 0.243, 0.795, Math.sin(a) * 0.243);
      parts.push(tint(b, 1));
    }
    parts.push(tint(collar(0.615, 0.212, 0.016, seg), 0.86), tint(collar(0.255, 0.232, 0.014, seg), 0.86));
    G[E.R] = mergeGeometries(parts);
  }
  // Cavalo: pescoco e cabeca esculpidos, crina, orelhas, focinho, olhos
  {
    const base = lathe([...BASE, [0.26, 0.2], [0.245, 0.235], [0, 0.235]], seg);
    const spine = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.04, 0.16, 0), new THREE.Vector3(-0.055, 0.36, 0), new THREE.Vector3(-0.035, 0.56, 0),
      new THREE.Vector3(0.01, 0.74, 0), new THREE.Vector3(0.08, 0.86, 0), new THREE.Vector3(0.18, 0.84, 0),
      new THREE.Vector3(0.27, 0.75, 0), new THREE.Vector3(0.33, 0.68, 0), new THREE.Vector3(0.36, 0.65, 0)]);
    const head = loft(spine, (t) => {
      let rn, rz;
      if (t < 0.55) { const k = t / 0.55; rn = 0.2 - 0.075 * k + 0.02 * Math.sin(k * Math.PI); rz = 0.165 - 0.065 * k; }
      else { const k = (t - 0.55) / 0.45; rn = 0.145 - 0.06 * k; rz = 0.1 - 0.02 * k + 0.012 * Math.sin(k * Math.PI); }
      if (t > 0.9) { const c = Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.9) / 0.1, 2))); rn *= 0.25 + 0.75 * c; rz *= 0.25 + 0.75 * c; }
      return [rn, rz];
    }, 48, 28);
    // crina com mechas
    const m = new THREE.Shape();
    const back = [[-0.25, 0.2], [-0.27, 0.38], [-0.25, 0.56], [-0.19, 0.72], [-0.1, 0.86], [0.0, 0.96]];
    m.moveTo(-0.19, 0.2); m.lineTo(back[0][0] - 0.01, back[0][1]);
    for (let i = 0; i < back.length - 1; i++) {
      const [x, y] = back[i], [x2, y2] = back[i + 1];
      const nx = -(y2 - y), ny = x2 - x, l = Math.hypot(nx, ny);
      m.quadraticCurveTo((x + x2) / 2 + nx / l * 0.045, (y + y2) / 2 + ny / l * 0.045, x2, y2);
    }
    m.lineTo(0.03, 0.9); m.lineTo(-0.06, 0.8); m.lineTo(-0.12, 0.66); m.lineTo(-0.15, 0.5); m.lineTo(-0.16, 0.34); m.lineTo(-0.15, 0.2);
    const mane = new THREE.ExtrudeGeometry(m, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 3, curveSegments: 6 });
    mane.translate(0, 0, -0.025);
    const ears = [];
    for (const z of [-0.055, 0.055]) {
      const e = new THREE.ConeGeometry(0.038, 0.14, 12); e.rotateZ(-0.35); e.rotateX(z > 0 ? 0.18 : -0.18); e.translate(0.05, 0.97, z); ears.push(tint(e, 1));
    }
    const eyes = [], nost = [];
    for (const z of [-1, 1]) {
      const e = new THREE.SphereGeometry(0.026, 12, 8); e.translate(0.17, 0.83, z * 0.088); eyes.push(tint(e, 0.12));
      const lid = new THREE.TorusGeometry(0.03, 0.008, 6, 14); lid.translate(0.17, 0.83, z * 0.086); eyes.push(tint(lid, 0.9));
      const n = new THREE.SphereGeometry(0.018, 10, 6); n.scale(1, 0.7, 1); n.translate(0.365, 0.665, z * 0.035); nost.push(tint(n, 0.15));
    }
    const mouth = new THREE.BoxGeometry(0.06, 0.008, 0.1); mouth.rotateZ(-0.7); mouth.translate(0.305, 0.625, 0);
    const forelock = new THREE.SphereGeometry(0.05, 12, 8); forelock.scale(1.2, 0.6, 0.8); forelock.translate(0.09, 0.93, 0);
    const g = mergeGeometries([tint(base, 1), tint(head, 1), tint(mane, 0.82), tint(forelock, 0.82), tint(mouth, 0.3), ...ears, ...eyes, ...nost, tint(collar(0.205, 0.252, 0.013, seg), 0.86)]);
    g.rotateY(Math.PI / 2);
    G[E.N] = g;
  }
  // Bispo: mitra com fenda inclinada
  {
    const body = lathe([...BASE, ...smooth([[0.215, 0.21], [0.16, 0.3], [0.125, 0.42], [0.11, 0.53]]), [0.175, 0.545], [0.19, 0.57], [0.175, 0.595], [0.105, 0.61],
      ...smooth([[0.11, 0.625], [0.15, 0.68], [0.178, 0.76], [0.17, 0.84], [0.135, 0.91], [0.08, 0.965], [0.035, 0.995]]), ...arc(1.04, 0.045, -55, 90, 8)], seg);
    const slit = rbox(0.045, 0.026, 0.24, 0.008, 1); slit.rotateX(0.8); slit.translate(0.155, 0.8, 0);
    const g = mergeGeometries([tint(body, 1), tint(slit, 0.08), tint(collar(0.545, 0.17, 0.012, seg), 0.86)]);
    g.rotateY(Math.PI / 2);
    G[E.B] = g;
  }
  // Dama: coroa com pontas e perolas
  {
    const body = lathe([...BASE, ...smooth([[0.225, 0.22], [0.165, 0.34], [0.13, 0.5], [0.118, 0.66], [0.12, 0.74]]), [0.195, 0.755], [0.21, 0.78], [0.195, 0.805], [0.125, 0.82],
      ...smooth([[0.135, 0.85], [0.16, 0.93], [0.2, 1.01], [0.215, 1.045]]), [0.19, 1.05], [0.12, 1.04], [0.075, 1.07], [0.05, 1.1], ...arc(1.15, 0.055, -60, 90, 10)], seg);
    const parts = [tint(body, 1)];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
      const c = new THREE.ConeGeometry(0.03, 0.09, 10); c.translate(0, 0.045, 0); c.rotateZ(0); c.translate(x * 0.205, 1.035, z * 0.205);
      const b = new THREE.SphereGeometry(0.03, 12, 8); b.translate(x * 0.207, 1.135, z * 0.207);
      parts.push(tint(c, 1), tint(b, 1));
    }
    parts.push(tint(collar(1.04, 0.2, 0.018, seg), 0.88), tint(collar(0.77, 0.205, 0.014, seg), 0.86));
    G[E.Q] = mergeGeometries(parts);
  }
  // Rei: coroa e cruz chanfrada
  {
    const body = lathe([...BASE, ...smooth([[0.235, 0.22], [0.17, 0.35], [0.14, 0.52], [0.128, 0.7], [0.13, 0.79]]), [0.205, 0.805], [0.222, 0.83], [0.205, 0.855], [0.135, 0.87],
      ...smooth([[0.145, 0.9], [0.17, 0.98], [0.21, 1.06], [0.22, 1.1]]), [0.2, 1.115], [0.13, 1.12], [0.09, 1.15], [0.055, 1.19], [0, 1.2]], seg);
    const s = new THREE.Shape(), a = 0.032, L = 0.11, f = 0.012;
    s.moveTo(-a, -L); s.lineTo(a, -L); s.lineTo(a - f, -a); s.lineTo(L - 0.02, -a + f); s.lineTo(L, -a - 0.005); s.lineTo(L, a + 0.005); s.lineTo(L - 0.02, a - f);
    s.lineTo(a - f, a); s.lineTo(a + 0.005, L); s.lineTo(-a - 0.005, L); s.lineTo(-a + f, a); s.lineTo(-L + 0.02, a - f); s.lineTo(-L, a + 0.005); s.lineTo(-L, -a - 0.005);
    s.lineTo(-L + 0.02, -a + f); s.lineTo(-a + f, -a); s.lineTo(-a, -L);
    const cross = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3 });
    cross.translate(0, 0, -0.02); cross.translate(0, 1.33, 0);
    const parts = [tint(body, 1), tint(cross, 1), tint(collar(1.105, 0.205, 0.016, seg), 0.88), tint(collar(0.83, 0.212, 0.014, seg), 0.86)];
    const nub = new THREE.SphereGeometry(0.045, 14, 10); nub.translate(0, 1.21, 0); parts.push(tint(nub, 1));
    for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2, b = new THREE.SphereGeometry(0.022, 10, 6); b.translate(Math.cos(an) * 0.2, 1.065, Math.sin(an) * 0.2); parts.push(tint(b, 0.8)); }
    G[E.K] = mergeGeometries(parts);
  }
  for (const k in G) G[k].computeBoundingSphere();
  return G;
}


// ---------- Estilo Moderno (minimalista) ----------
const BASE_M = [[0, 0], [0.32, 0], [0.338, 0.016], [0.338, 0.062], [0.322, 0.078], [0.255, 0.088], [0.235, 0.105]];
function buildModernGeometries(seg) {
  const G = {};
  G[E.P] = mergeGeometries([tint(lathe([...BASE_M, [0.15, 0.13], [0.118, 0.3], [0.112, 0.42], [0.165, 0.435], [0.165, 0.468], [0.1, 0.48], ...arc(0.6, 0.125, -55, 90, 14)], seg), 1)]);
  {
    const body = lathe([...BASE_M, [0.215, 0.13], [0.198, 0.6], [0.255, 0.62], [0.255, 0.77], [0.175, 0.77], [0.175, 0.72], [0, 0.72]], seg);
    const parts = [tint(body, 1), tint(collar(0.63, 0.257, 0.008, seg), 0.55)];
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, b = new THREE.BoxGeometry(0.05, 0.08, 0.1); b.rotateY(-a); b.translate(Math.cos(a) * 0.235, 0.745, Math.sin(a) * 0.235); parts.push(tint(b, 0.35)); }
    G[E.R] = mergeGeometries(parts);
  }
  {
    const s = new THREE.Shape();
    const pts = [[-0.17, 0.1], [0.17, 0.1], [0.12, 0.36], [0.33, 0.6], [0.33, 0.72], [0.1, 0.84], [0.05, 0.98], [-0.02, 0.88], [-0.15, 0.78], [-0.19, 0.46]];
    s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.lineTo(pts[0][0], pts[0][1]);
    const head = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 3, curveSegments: 4 });
    head.translate(0, 0, -0.08);
    const base = lathe([...BASE_M, [0.22, 0.12], [0, 0.12]], seg);
    const eye = new THREE.BoxGeometry(0.05, 0.03, 0.25); eye.translate(0.16, 0.74, 0);
    const g = mergeGeometries([tint(base, 1), tint(head, 1), tint(eye, 0.3)]);
    g.rotateY(Math.PI / 2);
    G[E.N] = g;
  }
  {
    const body = lathe([...BASE_M, ...smooth([[0.2, 0.13], [0.13, 0.3], [0.1, 0.5]]), [0.16, 0.52], [0.16, 0.555], [0.1, 0.565],
      ...smooth([[0.12, 0.62], [0.152, 0.72], [0.128, 0.84], [0.07, 0.92], [0.025, 0.95]]), ...arc(0.99, 0.042, -50, 90, 8)], seg);
    const slit = new THREE.BoxGeometry(0.03, 0.025, 0.34); slit.rotateX(0.75); slit.translate(0, 0.78, 0); slit.rotateY(Math.PI / 2);
    const cut = new THREE.BoxGeometry(0.34, 0.022, 0.035); cut.rotateZ(0.7); cut.translate(0.02, 0.79, 0.13);
    G[E.B] = mergeGeometries([tint(body, 1), tint(cut, 0.3)]);
  }
  {
    const body = lathe([...BASE_M, ...smooth([[0.21, 0.13], [0.145, 0.45], [0.122, 0.76]]), [0.19, 0.78], [0.19, 0.81], [0.12, 0.82],
      [0.14, 0.86], [0.215, 1.0], [0.2, 1.025], [0.08, 0.99], ...arc(1.07, 0.06, -60, 90, 10)], seg);
    G[E.Q] = mergeGeometries([tint(body, 1), tint(collar(0.795, 0.192, 0.01, seg), 0.5)]);
  }
  {
    const body = lathe([...BASE_M, ...smooth([[0.225, 0.13], [0.155, 0.48], [0.13, 0.82]]), [0.205, 0.84], [0.205, 0.875], [0.13, 0.885],
      [0.15, 0.93], [0.2, 1.1], [0.2, 1.13], [0, 1.13]], seg);
    const v = new THREE.BoxGeometry(0.065, 0.25, 0.065); v.translate(0, 1.25, 0);
    const h = new THREE.BoxGeometry(0.19, 0.065, 0.065); h.translate(0, 1.27, 0);
    G[E.K] = mergeGeometries([tint(body, 1), tint(collar(0.86, 0.207, 0.01, seg), 0.5), tint(v, 1), tint(h, 1)]);
  }
  for (const k in G) G[k].computeBoundingSphere();
  return G;
}

// ---------- Cenarios ----------
export const ENVS = {
  sala: { bg: ['#1d2740', '#0f1424', '#07090f'], fog: 0x0b0e18, hemi: [0xdfe7ff, 0x2a1d14, 0.55], key: [0xfff0dc, 2.4, [4.5, 11, 5.5]], rim: [0xfff1de, 1.7], rim2: [0x9db8ff, 0.5], table: 0x0e0c0b, pool: 'rgba(255,210,150,0.22)', exp: 1.05 },
  jardim: { bg: ['#3a2c5c', '#b45f6c', '#f4a95e'], fog: 0x4a3446, hemi: [0xffd9bd, 0x24301c, 0.62], key: [0xffc08a, 2.5, [9, 7, 2.5]], rim: [0xffa38f, 1.7], rim2: [0x9aa6ff, 0.6], table: 0x24361d, pool: 'rgba(255,200,140,0.2)', exp: 1.0 },
  espaco: { bg: ['#060818', '#0b1030', '#020309'], fog: 0x03040b, hemi: [0xc4d4ff, 0x0d0f1a, 0.5], key: [0xeef2ff, 2.5, [5, 10, 4]], rim: [0x86dcff, 1.9], rim2: [0xff86df, 0.75], table: null, pool: 'rgba(110,190,255,0.28)', exp: 1.05 }
};
function bgCanvasFor(c3) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 256;
  const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, c3[0]); grd.addColorStop(0.55, c3[1]); grd.addColorStop(1, c3[2]);
  g.fillStyle = grd; g.fillRect(0, 0, 16, 256); return c;
}
// panorama do jardim: ceu do entardecer, sol, morros e arvores em silhueta
function gardenCanvas() {
  const w = 2048, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, '#2c2452'); sky.addColorStop(0.45, '#8d4d78'); sky.addColorStop(0.78, '#e7835f'); sky.addColorStop(1, '#ffc27a');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const sx = w * 0.3, sy = h * 0.66;
  const sun = g.createRadialGradient(sx, sy, 0, sx, sy, 260); sun.addColorStop(0, 'rgba(255,240,200,1)'); sun.addColorStop(0.12, 'rgba(255,220,150,0.9)'); sun.addColorStop(0.4, 'rgba(255,170,100,0.25)'); sun.addColorStop(1, 'rgba(255,150,90,0)');
  g.fillStyle = sun; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(255,${190 + i * 5},${170 + i * 6},${rnd(0.08, 0.2)})`; g.beginPath(); g.ellipse(rnd(0, w), rnd(h * 0.12, h * 0.5), rnd(120, 300), rnd(8, 22), 0, 0, Math.PI * 2); g.fill(); }
  const hill = (base, amp, col, n) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 16) g.lineTo(x, base - Math.sin(x / w * Math.PI * 2 * n + base) * amp - Math.sin(x / 97) * amp * 0.15); g.lineTo(w, h); g.fill(); };
  hill(h * 0.74, 18, '#6b3f5e', 3); hill(h * 0.79, 14, '#45294a', 5);
  g.fillStyle = '#1f1828';
  for (let i = 0; i < 70; i++) {
    const x = rnd(0, w), y = h * rnd(0.8, 0.86), r = rnd(14, 46);
    g.beginPath(); g.arc(x, y - r * 0.6, r, 0, Math.PI * 2); g.arc(x + r * 0.6, y - r * 0.3, r * 0.75, 0, Math.PI * 2); g.arc(x - r * 0.6, y - r * 0.25, r * 0.7, 0, Math.PI * 2); g.fill();
    g.fillRect(x - 3, y - r * 0.3, 6, r * 0.9);
  }
  for (let i = 0; i < 14; i++) { const x = rnd(0, w), y = h * 0.86, hh = rnd(70, 140); g.beginPath(); g.moveTo(x - 18, y); g.lineTo(x, y - hh); g.lineTo(x + 18, y); g.fill(); }
  g.fillStyle = '#16120f'; g.fillRect(0, h * 0.85, w, h);
  return c;
}
function planetCanvas() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (let y = 0; y < 128; y++) { const t = y / 128, b = Math.sin(t * 19) * 0.5 + Math.sin(t * 7 + 1) * 0.5; g.fillStyle = `rgb(${Math.round(120 + b * 50)},${Math.round(90 + b * 40)},${Math.round(170 + b * 40)})`; g.fillRect(0, y, 256, 1); }
  return c;
}

// ---------- Particulas ----------
class Particles {
  constructor(scene, tex) { this.scene = scene; this.tex = tex; this.list = []; }
  burst(pos, opts) {
    const n = opts.count || 40, geo = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3), c = new Float32Array(n * 3), v = [];
    const cols = opts.colors.map((x) => new THREE.Color(x));
    for (let i = 0; i < n; i++) {
      p[i * 3] = pos.x + rnd(-0.1, 0.1); p[i * 3 + 1] = pos.y + rnd(0, 0.3); p[i * 3 + 2] = pos.z + rnd(-0.1, 0.1);
      const a = Math.random() * Math.PI * 2, sp = rnd(0.4, 1) * (opts.speed || 2.2);
      v.push(new THREE.Vector3(Math.cos(a) * sp * 0.6, rnd(0.6, 1.2) * (opts.up || 3), Math.sin(a) * sp * 0.6));
      const col = cols[i % cols.length]; c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const mat = new THREE.PointsMaterial({ size: opts.size || 0.11, map: this.tex, vertexColors: true, transparent: true, depthWrite: false, blending: opts.normal ? THREE.NormalBlending : THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.list.push({ pts, v, t0: now(), life: opts.life || 1.1, grav: opts.grav == null ? 6 : opts.grav, op: opts.opacity || 1 });
  }
  update(dt) {
    const t = now();
    this.list = this.list.filter((s) => {
      const k = (t - s.t0) / s.life;
      if (k >= 1) { this.scene.remove(s.pts); s.pts.geometry.dispose(); s.pts.material.dispose(); return false; }
      const a = s.pts.geometry.attributes.position;
      for (let i = 0; i < s.v.length; i++) {
        s.v[i].y -= s.grav * dt;
        a.array[i * 3] += s.v[i].x * dt; a.array[i * 3 + 1] = Math.max(0.02, a.array[i * 3 + 1] + s.v[i].y * dt); a.array[i * 3 + 2] += s.v[i].z * dt;
      }
      a.needsUpdate = true;
      s.pts.material.opacity = (s.op || 1) * (1 - k * k);
      return true;
    });
    return this.list.length > 0;
  }
}

// ---------- Vista 3D ----------
export class View3D {
  constructor(canvas, app) {
    this.canvas = canvas; this.app = app;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    const dpr = window.devicePixelRatio || 1;
    const mobile = Math.min(screen.width, screen.height) < 700;
    this.levels = [
      { pr: Math.min(dpr, 2), shadow: 2048, shadows: true },
      { pr: Math.min(dpr, 1.5), shadow: 1024, shadows: true },
      { pr: Math.min(dpr, 1.25), shadow: 1024, shadows: true },
      { pr: 1, shadow: 512, shadows: true },
      { pr: 1, shadow: 512, shadows: false },
      { pr: 0.75, shadow: 512, shadows: false },
    ];
    this.level = mobile ? 1 : 0;
    const qp = new URLSearchParams(location.search).get('q');
    this.lockQ = qp != null; if (this.lockQ) this.level = Math.max(0, Math.min(5, +qp || 0));
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0b0e18, 16, 34);
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    this.FOV = 36; this.camFx = app.camFx !== false; this.camView = app.camView || 'auto'; this.aid = !!app.visionAid;

    this.buildLights(); this.buildBoard(mobile);
    this.seg = mobile ? 28 : 40;
    this.geos = buildGeometries(this.seg);
    const ivory = noiseCanvas(256, '#f8e6c2', 12, { n: 26, col: () => `rgba(190,160,115,${rnd(0.05, 0.16)})` });
    const ebony = noiseCanvas(256, '#2b1c15', 10, { n: 60, col: () => Math.random() < 0.5 ? `rgba(10,5,3,${rnd(0.2, 0.5)})` : `rgba(110,70,45,${rnd(0.08, 0.25)})` });
    const rough = noiseCanvas(128, '#5a5a5a', 60);
    this.mats = {
      0: new THREE.MeshPhysicalMaterial({ map: ctex(ivory, true), roughnessMap: ctex(rough, false), normalMap: ctex(normalFrom(ivory, 1.2), false), normalScale: new THREE.Vector2(0.25, 0.25),
        color: 0xffeccb, roughness: 0.5, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.22, sheen: 0.3, sheenColor: new THREE.Color(0xfff2dd), vertexColors: true, envMapIntensity: 0.85 }),
      8: new THREE.MeshPhysicalMaterial({ map: ctex(ebony, true), roughnessMap: ctex(rough, false), normalMap: ctex(normalFrom(ebony, 2), false), normalScale: new THREE.Vector2(0.35, 0.35),
        color: 0xffffff, roughness: 0.5, metalness: 0, clearcoat: 0.95, clearcoatRoughness: 0.12, vertexColors: true, envMapIntensity: 1.0 }),
    };
    // contorno (casca invertida) e sombra de contato sob cada peca
    const hull = (color, w) => {
      const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
      m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * ' + w.toFixed(4) + ';'); };
      return m;
    };
    this.outlineMats = { 0: hull(0x2a180a, 0.013), 8: hull(0x5e4a3a, 0.007) };
    this.mats[0].userData = { cc: 0.6, sh: 0.3 }; this.mats[8].userData = { cc: 0.95, sh: 0 };
    this.styles = { classico: { geos: this.geos, mats: this.mats } };
    this.style = 'classico';
    const aoC = glowCanvas('rgba(0,0,0,0.78)', 'rgba(0,0,0,0)');
    this.aoMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(aoC), transparent: true, depthWrite: false, toneMapped: false });
    this.aoGeo = new THREE.PlaneGeometry(0.98, 0.98); this.aoGeo.rotateX(-Math.PI / 2);
    this.badgeMats = {};
    this.pieceGroup = new THREE.Group(); this.scene.add(this.pieceGroup);
    this.meshes = {};
    this.particles = new Particles(this.scene, new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,1)', 'rgba(255,255,255,0)')));
    this.tweens = [];
    this.cam = { theta: 0, phi: 0.95, rFactor: 1, target: null };
    this.orient = 0; this.menu = false; this.active = true;
    this.hl = {}; this.selSq = -1; this._animMeshes = new Set();
    this.fps = { frames: 0, time: 0, last: 0 };
    this.setEnv(app.env || 'sala', true);
    if (app.pieceStyle && app.pieceStyle !== 'classico') this.setStyle(app.pieceStyle, true);
    this.applyQuality();
    this.bindInput();
    this.resize();
    this.loop = this.loop.bind(this);
    this.dirty = true;
    requestAnimationFrame(this.loop);
    try { this.placeCamera(); renderer.compile(this.scene, this.camera); } catch (e) { }
  }

  buildLights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0xdfe7ff, 0x2a1d14, 0.55); s.add(this.hemi);
    const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
    key.position.set(4.5, 11, 5.5); key.castShadow = true;
    const sc = key.shadow.camera; sc.left = -6.5; sc.right = 6.5; sc.top = 6.5; sc.bottom = -6.5; sc.near = 2; sc.far = 25;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    s.add(key); this.key = key;
    const rim = new THREE.DirectionalLight(0xfff1de, 1.7); rim.position.set(-6, 5, -7); s.add(rim); this.rim = rim;
    const rim2 = new THREE.DirectionalLight(0x9db8ff, 0.5); rim2.position.set(-6, 5, -7); s.add(rim2); this.rim2 = rim2;
    this.glowLight = new THREE.PointLight(0xffcc66, 0, 8, 2); this.glowLight.position.set(0, 1.5, 0); s.add(this.glowLight);
  }

  buildBoard(mobile) {
    const s = this.scene;
    this.mobile = mobile;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshPhysicalMaterial({ color: 0xc9c0b2, normalScale: new THREE.Vector2(0.12, 0.12),
      roughnessMap: ctex(noiseCanvas(256, '#4a4a4a', 50), false, 4), roughness: 0.62, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: 0.42 }));
    this.boardTop = top; this.setTheme(this.app.theme || 'classico');
    top.rotation.x = -Math.PI / 2; top.position.y = 0.004; top.receiveShadow = true; s.add(top);
    const wc = woodCanvas(1024, 1024, true);
    const ftex = new THREE.CanvasTexture(wc); ftex.colorSpace = THREE.SRGBColorSpace; ftex.anisotropy = 8;
    const ftop = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 9.6), new THREE.MeshPhysicalMaterial({ map: ftex, normalMap: new THREE.CanvasTexture(normalFrom(wc, 2.5, true)), normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.45, clearcoat: 0.75, clearcoatRoughness: 0.2 }));
    ftop.rotation.x = -Math.PI / 2; ftop.position.y = 0.001; ftop.receiveShadow = true; s.add(ftop);
    const stex = new THREE.CanvasTexture(woodCanvas(512, 64, false)); stex.colorSpace = THREE.SRGBColorSpace;
    const frameG = rbox(9.6, 9.6, 0.42, 0.06, 3); frameG.rotateX(Math.PI / 2);
    const frame = new THREE.Mesh(frameG, new THREE.MeshPhysicalMaterial({ map: stex, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.25 }));
    stex.wrapS = stex.wrapT = THREE.RepeatWrapping; stex.repeat.set(0.1, 0.1);
    frame.position.y = -0.21 - 0.0; frame.castShadow = true; frame.receiveShadow = true; s.add(frame);
    // marcas de casas
    this.marks = {};
    const planeG = new THREE.PlaneGeometry(0.98, 0.98); planeG.rotateX(-Math.PI / 2);
    const dotG = new THREE.CircleGeometry(0.15, 28); dotG.rotateX(-Math.PI / 2);
    const ringG = new THREE.RingGeometry(0.37, 0.47, 36); ringG.rotateX(-Math.PI / 2);
    this.dotMat = new THREE.MeshBasicMaterial({ color: 0x5ff0b0, transparent: true, opacity: 0.8, depthWrite: false });
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xff8a5c, transparent: true, opacity: 0.85, depthWrite: false });
    this.selMat = new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.55, depthWrite: false });
    this.hintMat = new THREE.MeshBasicMaterial({ color: 0x50c8ff, transparent: true, opacity: 0.55, depthWrite: false });
    this.lastMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e, transparent: true, opacity: 0.3, depthWrite: false });
    const checkG = new THREE.PlaneGeometry(1.5, 1.5); checkG.rotateX(-Math.PI / 2);
    this.checkMesh = new THREE.Mesh(checkG, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas('rgba(255,40,30,1)', 'rgba(255,40,30,0)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
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

  // estilo das pecas: classico | moderno | metal
  getStyle(name) {
    if (this.styles[name]) return this.styles[name];
    let st;
    if (name === 'moderno') {
      st = { geos: buildModernGeometries(this.seg), mats: {
        0: new THREE.MeshPhysicalMaterial({ color: 0xf6ead2, roughness: 0.34, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.25, vertexColors: true, envMapIntensity: 0.8 }),
        8: new THREE.MeshPhysicalMaterial({ color: 0x2a2c33, roughness: 0.3, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.15, vertexColors: true, envMapIntensity: 0.9 }) } };
      st.mats[0].userData = { cc: 0.45, sh: 0 }; st.mats[8].userData = { cc: 0.7, sh: 0 };
    } else if (name === 'metal') {
      const brushed = ctex(noiseCanvas(256, '#808080', 50, { n: 120, col: () => `rgba(${Math.random() < 0.5 ? 40 : 220},${Math.random() < 0.5 ? 40 : 220},${Math.random() < 0.5 ? 40 : 220},0.08)` }), false);
      st = { geos: this.styles.classico.geos, mats: {
        0: new THREE.MeshPhysicalMaterial({ color: 0xeef0f4, roughness: 0.2, roughnessMap: brushed, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.1, vertexColors: true, envMapIntensity: 1.35 }),
        8: new THREE.MeshPhysicalMaterial({ color: 0x3c3f46, roughness: 0.3, roughnessMap: brushed, metalness: 1, clearcoat: 0.5, clearcoatRoughness: 0.12, vertexColors: true, envMapIntensity: 0.8 }) } };
      st.mats[0].userData = { cc: 0.3, sh: 0 }; st.mats[8].userData = { cc: 0.5, sh: 0 };
    } else return this.styles.classico;
    this.styles[name] = st;
    return st;
  }
  setStyle(name, quiet) {
    const st = this.getStyle(name);
    this.style = name; this.geos = st.geos; this.mats = st.mats; this.checkMats = null; this.checkKing = null;
    for (const k in this.meshes) this.pieceGroup.remove(this.meshes[k]);
    this.meshes = {};
    if (this.board) this.sync(this.board);
    if (!quiet) { this.applyQuality(); if (this.hl) this.highlight(this.hl); }
    this.dirty = true; this.shadowDirty = true;
  }
  // cenario: sala | jardim | espaco
  setEnv(name, quiet) {
    const P = ENVS[name] || ENVS.sala, s = this.scene;
    this.envName = ENVS[name] ? name : 'sala';
    if (this.envGroup) { s.remove(this.envGroup); this.envGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
    const grp = new THREE.Group(); this.envGroup = grp; s.add(grp);
    if (s.background && s.background.dispose) s.background.dispose();
    const bg = new THREE.CanvasTexture(bgCanvasFor(P.bg)); bg.colorSpace = THREE.SRGBColorSpace; s.background = bg;
    s.fog.color.set(P.fog);
    this.hemi.color.set(P.hemi[0]); this.hemi.groundColor.set(P.hemi[1]); this.hemi.intensity = P.hemi[2];
    this.key.color.set(P.key[0]); this.key.intensity = P.key[1]; this.key.position.set(P.key[2][0], P.key[2][1], P.key[2][2]);
    this.rim.color.set(P.rim[0]); this.rim.intensity = P.rim[1]; this.rim2.color.set(P.rim2[0]); this.rim2.intensity = P.rim2[1];
    this.renderer.toneMappingExposure = P.exp;
    if (P.table != null) {
      const tmat = this.envName === 'jardim'
        ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: ctex(noiseCanvas(256, '#2f4524', 16, { n: 70, col: () => `rgba(${rnd(30, 70) | 0},${rnd(70, 110) | 0},${rnd(25, 45) | 0},0.18)` }), true, 9), roughness: 1 })
        : new THREE.MeshStandardMaterial({ color: P.table, roughness: 0.95 });
      const table = new THREE.Mesh(new THREE.CircleGeometry(this.envName === 'jardim' ? 26 : 40, 48), tmat);
      table.rotation.x = -Math.PI / 2; table.position.y = -0.42; table.receiveShadow = true; grp.add(table);
    }
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas(P.pool, P.pool.replace(/[\d.]+\)$/, '0)'))), transparent: true, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = this.envName === 'espaco' ? -0.6 : -0.415; grp.add(pool);
    const bok = new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
    if (this.envName === 'sala') {
      const cols = [0xffc27a, 0xffe2b0, 0x8fb4ff, 0xffa060];
      for (let i = 0; i < 26; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bok, color: cols[i % 4], transparent: true, opacity: rnd(0.08, 0.28), depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
        const a = Math.random() * Math.PI * 2, d = rnd(16, 26);
        sp.position.set(Math.cos(a) * d, rnd(1.5, 9), Math.sin(a) * d); const sz = rnd(1.2, 3.5); sp.scale.set(sz, sz, 1); grp.add(sp);
      }
    } else if (this.envName === 'jardim') {
      const pt = new THREE.CanvasTexture(gardenCanvas()); pt.colorSpace = THREE.SRGBColorSpace; pt.wrapS = THREE.RepeatWrapping; pt.repeat.x = 2;
      const pano = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 26, 48, 1, true), new THREE.MeshBasicMaterial({ map: pt, side: THREE.BackSide, fog: false, depthWrite: false }));
      pano.position.y = 8.7; pano.renderOrder = -2; grp.add(pano);
      for (let i = 0; i < 34; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bok, color: i % 3 ? 0xfff3a0 : 0xd8ff9a, transparent: true, opacity: rnd(0.35, 0.8), depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
        const a = Math.random() * Math.PI * 2, d = rnd(7, 16);
        sp.position.set(Math.cos(a) * d, rnd(0.2, 3.5), Math.sin(a) * d); const sz = rnd(0.12, 0.3); sp.scale.set(sz, sz, 1); grp.add(sp);
      }
    } else {
      const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = rnd(38, 48), q = Math.sqrt(1 - u * u);
        pos[i * 3] = Math.cos(th) * q * r; pos[i * 3 + 1] = u * r; pos[i * 3 + 2] = Math.sin(th) * q * r;
        const w = rnd(0.6, 1), tnt = Math.random(); col[i * 3] = w * (tnt < 0.2 ? 0.75 : 1); col[i * 3 + 1] = w * (tnt < 0.2 ? 0.85 : tnt > 0.9 ? 0.85 : 1); col[i * 3 + 2] = w;
      }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      grp.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, map: bok, vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })));
      const neb = [[0x6a3cff, -20, 10, -30, 26], [0xff3ca8, 25, 6, -24, 20], [0x2aa8ff, 6, 16, 32, 24]];
      for (const [c, x, y, z, sz] of neb) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bok, color: c, transparent: true, opacity: 0.16, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); sp.position.set(x, y, z); sp.scale.set(sz, sz, 1); grp.add(sp); }
      const pl = new THREE.Mesh(new THREE.SphereGeometry(5, 40, 20), new THREE.MeshStandardMaterial({ map: (() => { const t = new THREE.CanvasTexture(planetCanvas()); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.9, fog: false }));
      pl.position.set(-24, 9, -26); pl.rotation.z = 0.4; grp.add(pl);
      const ringG = new THREE.RingGeometry(6.5, 9, 64); const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xc8b4ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, fog: false, depthWrite: false }));
      ring.position.copy(pl.position); ring.rotation.x = 1.25; ring.rotation.y = 0.3; grp.add(ring);
    }
    if (!quiet) { this.applyQuality(); }
    this.dirty = true; this.shadowDirty = true;
  }

  setTheme(name) {
    const mc = marbleCanvas(this.mobile ? 1024 : 2048, name);
    const mat = this.boardTop.material;
    if (mat.map) mat.map.dispose(); if (mat.normalMap) mat.normalMap.dispose();
    const mtex = new THREE.CanvasTexture(mc); mtex.colorSpace = THREE.SRGBColorSpace; mtex.anisotropy = 8;
    mat.map = mtex; mat.normalMap = new THREE.CanvasTexture(normalFrom(mc, 3)); mat.needsUpdate = true;
    this.dirty = true;
  }

  applyQuality() {
    const L = this.levels[this.level];
    this.renderer.setPixelRatio(L.pr);
    this.renderer.shadowMap.enabled = L.shadows;
    this.key.castShadow = L.shadows;
    if (this.key.shadow.mapSize.x !== L.shadow) {
      this.key.shadow.mapSize.set(L.shadow, L.shadow);
      if (this.key.shadow.map) { this.key.shadow.map.dispose(); this.key.shadow.map = null; }
    }
    if (this.mats) {
      const lo = this.level >= 3;
      for (const c of [0, 8]) { const m = this.mats[c], u = m.userData || {}; m.clearcoat = lo ? (c ? (u.cc || 0) * 0.5 : 0) : (u.cc || 0); m.sheen = lo ? 0 : (u.sh || 0); }
    }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.shadowDirty = true;
    this.resize();
  }

  newMesh(sq, piece) {
    const m = new THREE.Mesh(this.geos[piece & 7], this.mats[piece & 8]);
    m.castShadow = true; m.receiveShadow = true;
    m.position.copy(sqPos(sq));
    if ((piece & 7) === E.N) m.rotation.y = (piece & 8) ? Math.PI : 0;
    const ol = new THREE.Mesh(this.geos[piece & 7], this.outlineMats[piece & 8]); ol.renderOrder = -1; m.add(ol);
    const ao = new THREE.Mesh(this.aoGeo, this.aoMat); ao.renderOrder = 1; ao.position.y = 0.007; m.add(ao);
    m.userData = { piece, sq, ol, ao };
    if (this.aid) this.addBadge(m);
    this.pieceGroup.add(m);
    return m;
  }

  // Ajuda de visao: simbolo 2D pequeno sobre cada peca
  badgeMat(piece) {
    const key = piece & 15;
    if (this.badgeMats[key]) return this.badgeMats[key];
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const white = !(piece & 8);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true, toneMapped: false, fog: false });
    if (window.XPieces && XPieces.image) {
      // primeiro um halo grosso de cor oposta, depois o simbolo: le bem em casa clara ou escura
      const halo = new Image(), img = new Image();
      const draw = () => { if (!halo.complete || !img.complete) return; g.clearRect(0, 0, 128, 128); g.drawImage(halo, 0, 0, 128, 128); g.drawImage(img, 0, 0, 128, 128); t.needsUpdate = true; this.dirty = true; };
      halo.onload = draw; img.onload = draw;
      const enc = (x) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(x);
      halo.src = enc(white ? XPieces.image(piece, '#1a120b', '#1a120b', '#1a120b', 15) : XPieces.image(piece, '#fff3d6', '#fff3d6', '#fff3d6', 15));
      img.src = enc(white ? XPieces.image(piece, '#fffaf0', '#1a120b', '#8d7a62', 4) : XPieces.image(piece, '#231b17', '#0b0806', '#b79a7c', 4));
    }
    this.badgeMats[key] = mat;
    return mat;
  }
  addBadge(m) {
    if (m.userData.badge) { m.userData.badge.visible = true; return; }
    const p = m.userData.piece, sp = new THREE.Sprite(this.badgeMat(p));
    const h = { 1: 0.62, 2: 0.8, 3: 0.85, 4: 0.78, 5: 0.92, 6: 1.0 }[p & 7];
    sp.position.y = h; sp.scale.set(0.58, 0.58, 1); sp.renderOrder = 20; sp.raycast = () => {};
    m.add(sp); m.userData.badge = sp;
  }
  setAid(on) {
    this.aid = !!on;
    for (const k in this.meshes) { const m = this.meshes[k]; if (on) this.addBadge(m); else if (m.userData.badge) m.userData.badge.visible = false; }
    this.dirty = true;
  }

  sync(board) {
    this.board = board;
    const keep = {};
    for (let sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = board[sq], m = this.meshes[sq];
      if (p && m && m.userData.piece === p) { keep[sq] = m; if (m.userData.ao) m.userData.ao.visible = true; if (m.userData.ring) m.userData.ring.visible = true; if (m.userData.badge) m.userData.badge.visible = this.aid; m.position.copy(sqPos(sq)); m.scale.set(1, 1, 1); m.rotation.x = 0; m.rotation.z = 0; continue; }
      if (m) this.pieceGroup.remove(m);
      if (p) keep[sq] = this.newMesh(sq, p);
    }
    for (const k in this.meshes) if (!keep[k] && this.meshes[k] !== keep[k]) this.pieceGroup.remove(this.meshes[k]);
    this.meshes = keep;
    this.dirty = true; this.shadowDirty = true;
  }

  tween(dur, fn, delay = 0, tag) {
    return new Promise((res) => { this.tweens.push({ t0: now() + delay, dur, fn, res, tag }); this.dirty = true; });
  }
  // cancela animacoes de camera em andamento (ex.: cinema do xeque-mate) antes de uma nova
  // pula a animacao de camera (intro ou cinema) no primeiro toque
  skipCam() {
    let any = false;
    this.tweens = this.tweens.filter((tw) => { if (tw.tag === 'cam') { try { tw.fn(1); } catch (e) { } tw.res(); any = true; return false; } return true; });
    if (any) this.dirty = true;
    return any;
  }
  cancelCam() {
    this.tweens = this.tweens.filter((tw) => { if (tw.tag === 'cam') { tw.res(); return false; } return true; });
    if (this.cam.lookOff) this.cam.lookOff.set(0, 0, 0);
    if (!this.menu) this.cam.rFactor = 1;
  }

  animate(m, board, opts) {
    const mesh = this.meshes[m.from];
    const capSq = (m.flags & E.F_EP) ? m.to + ((m.piece & 8) ? 16 : -16) : m.to;
    const capMesh = m.cap ? this.meshes[capSq] : null;
    if (!mesh) { this.sync(board); return Promise.resolve(); }
    delete this.meshes[m.from]; if (capMesh) delete this.meshes[capSq];
    this.meshes[m.to] = mesh;
    const a = sqPos(m.from), b = sqPos(m.to);
    const startY = mesh.position.y;
    const dist = a.distanceTo(b);
    const knight = (m.piece & 7) === E.N;
    const h = knight ? 0.95 : 0.22 + dist * 0.06;
    const dur = Math.min(0.66, 0.34 + dist * 0.045);
    const jobs = [];
    let hit = false;
    const anim = this._animMeshes; anim.add(mesh); if (capMesh) anim.add(capMesh);
    const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
    // inclina na direcao do movimento (eixo perpendicular)
    const tilt = new THREE.Vector3(dir.z, 0, -dir.x);
    jobs.push(this.tween(dur, (k) => {
      const e = ease(k);
      const lift = Math.sin(Math.PI * Math.min(1, e * 1.05)) * h;
      mesh.position.set(a.x + (b.x - a.x) * e, Math.max(0, startY * (1 - e) + lift), a.z + (b.z - a.z) * e);
      const lean = Math.sin(Math.PI * k) * (knight ? 0.18 : 0.1) * (k < 0.5 ? 1 : 0.6);
      mesh.rotation.x = -tilt.x * lean; mesh.rotation.z = -tilt.z * lean;
      if (capMesh && !hit && k > 0.7) { hit = true; this.captureFx(capMesh, dir); }
    }).then(() => {
      mesh.rotation.x = 0; mesh.rotation.z = 0;
      this.dust(b, m.cap ? 1.4 : 1);
      this.shake(m.cap ? 0.05 : 0.018);
      this.tween(0.22, (k) => { const s = 1 - Math.sin(Math.PI * k) * 0.09 * (1 - k * 0.5); mesh.scale.set(1 + (1 - s) * 0.55, s, 1 + (1 - s) * 0.55); }).then(() => mesh.scale.set(1, 1, 1));
    }));
    if (m.flags & E.F_CASTLE) {
      const rf = m.to > m.from ? m.from + 3 : m.from - 4, rt = m.to > m.from ? m.from + 1 : m.from - 1;
      const rook = this.meshes[rf];
      if (rook) {
        delete this.meshes[rf]; this.meshes[rt] = rook; anim.add(rook);
        const ra = sqPos(rf), rb = sqPos(rt);
        jobs.push(this.tween(0.45, (k) => { const e = ease(k); rook.position.set(ra.x + (rb.x - ra.x) * e, Math.sin(Math.PI * e) * 0.55, ra.z); }, dur * 0.55).then(() => this.dust(rb, 0.8)));
      }
    }
    return Promise.all(jobs).then(() => {
      anim.clear();
      if (m.promo) {
        this.particles.burst(b.clone().setY(0.6), { colors: ['#ffe08a', '#fff4d0', '#ffb84a'], count: 60, up: 2.8, life: 1.3, grav: 3 });
        this.flash(b, 0xffd27a, 4);
      }
      this.sync(board);
      if (m.promo) {
        const nm = this.meshes[m.to];
        if (nm) this.tween(0.45, (k) => { const s = 0.2 + (1 - Math.pow(1 - k, 3) * Math.cos(k * 5)) * 0.8; nm.scale.set(s, s, s); }).then(() => nm.scale.set(1, 1, 1));
      }
    });
  }

  dust(pos, amt) {
    this.particles.burst(pos.clone().setY(0.03), { colors: ['#d8ccb4', '#bfb197', '#efe6d4'], count: Math.round(22 * amt), up: 0.5, speed: 1.5 * amt, life: 0.6, grav: 1, size: 0.09, normal: true, opacity: 0.55 });
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt || 0, a); this.dirty = true; }
  flash(pos, color, power) {
    this.glowLight.color.set(color); this.glowLight.position.set(pos.x, 1.2, pos.z);
    this.tween(0.6, (k) => { this.glowLight.intensity = Math.sin(Math.PI * k) * power; });
  }

  // anel de luz que se espalha pelo tabuleiro
  shockwave(p, color) {
    if (!this.swGeo) { this.swGeo = new THREE.RingGeometry(0.42, 0.5, 48); this.swGeo.rotateX(-Math.PI / 2); }
    const m = new THREE.Mesh(this.swGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.position.set(p.x, 0.02, p.z); m.renderOrder = 5; this.scene.add(m);
    this.tween(0.6, (k) => { const e = easeOut(k), s = 0.6 + e * 2.6; m.scale.set(s, 1, s); m.material.opacity = 0.9 * (1 - k); }).then(() => { this.scene.remove(m); m.material.dispose(); });
  }
  // aproxima a camera rapidinho da captura e volta (um toque pula)
  punch(p) {
    const off = this.cam.lookOff || (this.cam.lookOff = new THREE.Vector3());
    const goal = new THREE.Vector3(p.x * 0.45, 0, p.z * 0.45);
    this.tween(0.95, (k) => {
      const a = k < 0.35 ? easeOut(k / 0.35) : 1 - ease((k - 0.35) / 0.65);
      off.copy(goal).multiplyScalar(a); this.cam.rFactor = 1 - 0.2 * a;
      if (k >= 1) { off.set(0, 0, 0); this.cam.rFactor = 1; }
    }, 0.05, 'cam');
  }
  captureFx(mesh, dir) {
    const p = mesh.position.clone(), dark = mesh.userData.piece & 8;
    this.particles.burst(p.clone().setY(0.45), { colors: dark ? ['#ff9d4a', '#ffd27a', '#ffefc0'] : ['#fff1c8', '#ffd27a', '#ffffff'], count: 55, up: 3, speed: 2.4, life: 0.9 });
    this.dust(p, 1.6);
    this.flash(p, 0xffb060, 3);
    this.shockwave(p, dark ? 0xffa040 : 0xfff0c0);
    if (this.camFx && !this.menu && !this.cam.target && !this.tweens.some((t) => t.tag === 'cam')) this.punch(p);
    const mat = mesh.material.clone(); mat.transparent = true; mesh.material = mat;
    for (const k of ['ol', 'ao', 'ring', 'badge']) if (mesh.userData[k]) mesh.userData[k].visible = false;
    const axis = new THREE.Vector3(dir.z, 0, -dir.x);
    const q0 = mesh.quaternion.clone(), q = new THREE.Quaternion();
    const spin = rnd(1.2, 2.2) * Math.PI;
    this.tween(0.8, (k) => {
      const e = easeOut(k);
      mesh.position.set(p.x + dir.x * e * 1.3, Math.sin(Math.PI * Math.min(1, k * 1.2)) * 0.9 + Math.max(0, k - 0.8) * -1, p.z + dir.z * e * 1.3);
      q.setFromAxisAngle(axis, -spin * e); mesh.quaternion.copy(q0).premultiply(q);
      mat.opacity = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;
      const s = 1 - e * 0.35; mesh.scale.set(s, s, s);
    }).then(() => { this.pieceGroup.remove(mesh); this._animMeshes.delete(mesh); mat.dispose(); });
  }

  resetView() {
    if (!this.cam.target) return;
    const t0 = this.cam.target.clone(), d0 = this.cam.dist, look = new THREE.Vector3(0, 0.15, 0);
    const p0 = this.cam.phi, goalP = this.defaultPhi(), th0 = this.cam.theta, goalT = this.thetaFor(this.orient);
    const dT = ((goalT - th0) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const r1 = (this._fitR || 20);
    this.cam.rFactor = 1;
    this.tween(1.1, (k) => {
      const e = ease(k);
      this.cam.target.lerpVectors(t0, look, e); this.cam.dist = d0 + (r1 - d0) * e;
      this.cam.phi = p0 + (goalP - p0) * e; this.cam.theta = th0 + dT * e;
    }).then(() => { this.cam.target = null; this._fitKey = null; });
  }

  celebrate(result) {
    // result: {reason, winner, kingSq}
    if (result.reason === 'mate') {
      const king = this.meshes[result.kingSq];
      if (king) for (const k of ['ao', 'ring']) if (king.userData[k]) king.userData[k].visible = false;
      for (const k in this.meshes) { const b = this.meshes[k].userData.badge; if (b) b.visible = false; }
      if (king) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.tween(1.1, (k) => {
          const e = k < 0.75 ? ease(k / 0.75) : 1 - Math.sin((k - 0.75) / 0.25 * Math.PI) * 0.04;
          king.rotation.z = dir * e * Math.PI / 2 * 0.98;
        }, 0.35);
        const p = king.position.clone();
        setTimeout(() => this.particles.burst(p.clone().setY(0.3), { colors: ['#ff4a3a', '#ff9d4a', '#ffd27a'], count: 70, up: 2, speed: 3, life: 1.3 }), 900);
      }
      for (let i = 0; i < 5; i++) setTimeout(() => this.particles.burst(new THREE.Vector3(rnd(-3, 3), 0.5, rnd(-3, 3)), { colors: ['#ffe08a', '#ffffff', '#7fe3ff', '#ff9de0', '#ffd24a'], count: 70, up: 5.5, speed: 2.5, life: 1.8, grav: 5, size: 0.13 }), 400 + i * 380);
      this.glowLight.color.set(0xffcc66); this.glowLight.position.set(0, 1.5, 0);
      this.tween(2.6, (k) => { this.glowLight.intensity = Math.sin(Math.PI * k) * 6; });
      if (king) {
        // camera de cinema: aproxima do rei derrotado e gira devagar
        const kp = king.position.clone().setY(0.4), look = new THREE.Vector3(0, 0.15, 0);
        const d0 = (this._fitR || 20) * this.cam.rFactor, th0 = this.cam.theta, p0 = this.cam.phi;
        this.cam.target = look.clone(); this.cam.dist = d0;
        this.tween(3.6, (k) => {
          const e = ease(k);
          this.cam.target.lerpVectors(look, kp, e); this.cam.dist = d0 + (8.5 - d0) * e;
          this.cam.phi = p0 + (0.5 - p0) * e; this.cam.theta = th0 + 0.8 * e;
        }, 0.2, 'cam');
      }
    } else {
      this.particles.burst(new THREE.Vector3(0, 0.5, 0), { colors: ['#9fd8ff', '#ffffff', '#c8b8ff'], count: 90, up: 3.5, speed: 3, life: 1.6, grav: 3 });
    }
  }

  orbitBy(dTheta, dur) {
    const t0 = this.cam.theta;
    this.tween(dur, (k) => { this.cam.theta = t0 + Math.sin(Math.PI * k) * dTheta; });
  }

  highlight(h) {
    this.hl = h;
    for (const k in this.marks) {
      const sq = +k, mk = this.marks[k];
      const isSel = h.sel === sq, isLast = !!h.last && (h.last.from === sq || h.last.to === sq);
      const isHint = !!h.hint && (h.hint.from === sq || h.hint.to === sq);
      mk.plane.visible = isSel || isLast || isHint; mk.plane.material = isHint && !isSel ? this.hintMat : isSel ? this.selMat : this.lastMat;
      const d = h.dests && h.dests[sq];
      mk.dot.visible = d === 1; mk.ring.visible = d === 2;
    }
    if (this.checkKing) { this.checkKing.material = this.mats[this.checkKing.userData.piece & 8]; this.checkKing = null; }
    if (h.check >= 0 && h.check != null && this.meshes[h.check]) {
      const km = this.meshes[h.check];
      if (!this.checkMats) this.checkMats = { 0: this.mats[0].clone(), 8: this.mats[8].clone() };
      const cm = this.checkMats[km.userData.piece & 8]; cm.emissive = new THREE.Color(0xff2a1a); km.material = cm; this.checkKing = km;
    }
    if (h.check >= 0 && h.check != null) { const p = sqPos(h.check); this.checkMesh.position.x = p.x; this.checkMesh.position.z = p.z; this.checkMesh.visible = true; }
    else this.checkMesh.visible = false;
    this.selSq = h.sel == null ? -1 : h.sel;
    this.dirty = true;
  }

  thetaFor(o) { return o === 0 ? 0 : Math.PI; }
  setOrient(o, animate) {
    this.orient = o;
    const target = this.thetaFor(o);
    let from = this.cam.theta;
    let diff = ((target - from) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    if (!animate) { this.cam.theta = target; this.dirty = true; return; }
    const phi0 = this.cam.phi, goal = this.defaultPhi();
    this.tween(1.1, (k) => { const e = ease(k); this.cam.theta = from + diff * e; this.cam.phi = phi0 + (goal - phi0) * e; });
  }
  defaultPhi() {
    if (this.menu) return 0.55;
    if (VIEWS[this.camView]) return VIEWS[this.camView];
    if (this._phiFit) return this._phiFit; const a = this.stageAspect || 0.6; return a < 0.8 ? 0.92 : 0.85;
  }
  setCamView(name) {
    this.camView = VIEWS[name] ? name : 'auto'; this._fitKey = null; if (this.camView === 'auto' && this.W) this.fitLayout(this.stage ? this.stage.width : this.W, this._availH || 9999);
    if (this.menu || this.cam.target) return;
    const p0 = this.cam.phi, goal = this.defaultPhi(), t0 = this.cam.theta, gT = this.thetaFor(this.orient);
    const d = ((gT - t0) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    this.cancelCam();
    this.tween(0.6, (k) => { const e = ease(k); this.cam.phi = p0 + (goal - p0) * e; this.cam.theta = t0 + d * e; }, 0, 'cam');
  }

  intro(short) {
    this.cancelCam(); this.cam.target = null; this._fitKey = null;
    const goalT = this.thetaFor(this.orient), goalP = this.defaultPhi();
    const dT = short ? 0.9 : 2.4, p0 = short ? 0.6 : 0.32, r0 = short ? 1.25 : 1.7;
    this.cam.theta = goalT + dT; this.cam.phi = p0; this.cam.rFactor = r0;
    this.tween(short ? 1.3 : 2.2, (k) => {
      const e = ease(k);
      this.cam.theta = goalT + dT * (1 - e); this.cam.phi = p0 + (goalP - p0) * e; this.cam.rFactor = r0 - (r0 - 1) * e;
    }, 0, 'cam');
  }
  setMenu(on) {
    const was = this.menu;
    this.menu = on;
    if (on) { this.cam.phi = this.envName && this.envName !== 'sala' ? 0.42 : 0.55; this.cam.rFactor = 1.15; this.cam.target = null; }
    else if (was) {
      const p0 = this.cam.phi, r0 = this.cam.rFactor, t0 = this.cam.theta, goal = this.thetaFor(this.orient);
      const d = ((goal - t0) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      this.tween(1.2, (k) => { const e = ease(k); this.cam.phi = p0 + (this.defaultPhi() - p0) * e; this.cam.rFactor = r0 + (1 - r0) * e; this.cam.theta = t0 + d * e; });
    }
    this.resize();
  }
  setActive(on) {
    this.active = on;
    this.canvas.style.display = on ? 'block' : 'none';
    if (on) { this.resize(); this.dirty = true; }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.W = w; this.H = h;
    const st = this.menu ? { left: 0, top: h * 0.02, width: w, height: h * 0.5 } : this.app.stageRect();
    this.stage = st; this.stageAspect = st.width / Math.max(1, st.height);
    this.camera.aspect = w / h;
    this.dirty = true;
  }

  // acha a distancia em que o tabuleiro cabe na area st (largura e altura), e o centro dele em NDC
  fitBoard(st, phi, theta, look) {
    const c = this._fitCam || (this._fitCam = new THREE.PerspectiveCamera(36, 1, 0.1, 400));
    c.fov = this.FOV; c.aspect = st.width / st.height; c.updateProjectionMatrix();
    const pts = this._fitPts || (this._fitPts = (() => {
      const a = [];
      for (const x of [-4.2, 4.2]) for (const z of [-4.2, 4.2]) { a.push(new THREE.Vector3(x, 0, z)); a.push(new THREE.Vector3(x, 1.1, z)); }
      return a;
    })());
    const dirv = new THREE.Vector3(Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta));
    const v = new THREE.Vector3();
    const box = (r) => {
      c.position.copy(look).addScaledVector(dirv, r); c.lookAt(look); c.updateMatrixWorld();
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) { v.copy(p).project(c); if (v.z > 1) return null; x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      return { x0, x1, y0, y1 };
    };
    // margem: 3% dos lados, 4% em cima e embaixo
    const fits = (b) => b && b.x1 - b.x0 <= 1.94 && b.y1 - b.y0 <= 1.92;
    let lo = 3, hi = 80;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (fits(box(mid))) hi = mid; else lo = mid; }
    const b = box(hi);
    return { r: hi, xc: (b.x0 + b.x1) / 2, yc: (b.y0 + b.y1) / 2, w: b.x1 - b.x0, h: b.y1 - b.y0, dirv };
  }

  // camera de retrato: escolhe o angulo (mais de cima quando a tela e alta) e diz a altura que o tabuleiro precisa
  fitLayout(W, H) {
    const look = new THREE.Vector3(0, 0.15, 0), big = { width: W, height: W * 4 };
    const need = (phi) => { let n = 0; for (const th of [0, Math.PI]) { const f = this.fitBoard(big, phi, th, look); n = Math.max(n, f.h / 1.92 * big.height); } return n; };
    this._availH = H;
    if (VIEWS[this.camView]) return Math.ceil(need(VIEWS[this.camView]));
    // Auto (padrao): o angulo original, um pouco mais de cima quando a tela e alta
    const base = W / Math.max(1, H) < 0.8 ? 0.92 : 0.85, maxPhi = 1.22;
    let phi = base;
    if (need(base) < H) {
      if (need(maxPhi) <= H) phi = maxPhi;
      else { let lo = base, hi = maxPhi; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (need(m) <= H) lo = m; else hi = m; } phi = lo; }
    }
    const old = this._phiFit;
    this._phiFit = phi;
    if (old != null && Math.abs(old - phi) > 0.001 && !this.menu && !this.cam.target && !this.tweens.some((t) => t.tag === 'cam')) this.cam.phi = phi;
    return Math.ceil(need(phi));
  }

  placeCamera() {
    const c = this.camera, st = this.stage, w = this.W, h = this.H;
    const look = this.cam.target || new THREE.Vector3(0, 0.15, 0);
    const key = [this.cam.theta.toFixed(3), this.cam.phi.toFixed(3), st.width, st.height].join();
    let r;
    if (this.cam.target) { this._fitKey = null; r = this.cam.dist || 3; }
    else if (this._fitKey === key) r = this._fitR;
    else {
      const f = this.fitBoard(st, this.cam.phi, this.cam.theta, look);
      r = f.r; this._fitKey = key; this._fitR = r; this._fitC = { x: f.xc, y: f.yc };
    }
    const fc = this._fitC || { x: 0, y: 0 };
    const dirv = new THREE.Vector3(Math.cos(this.cam.phi) * Math.sin(this.cam.theta), Math.sin(this.cam.phi), Math.cos(this.cam.phi) * Math.cos(this.cam.theta));
    if (!this.cam.target) r *= this.cam.rFactor;
    if (!this.cam.target && this.cam.lookOff && this.cam.lookOff.lengthSq() > 1e-6) { const lk = look.clone().add(this.cam.lookOff); c.position.copy(lk).addScaledVector(dirv, r); c.lookAt(lk); }
    else { c.position.copy(look).addScaledVector(dirv, r); c.lookAt(look); }
    // luz de contorno sempre atras das pecas, vista da camera
    this.rim.position.set(-dirv.x * 9 + dirv.z * 3, 4.5, -dirv.z * 9 - dirv.x * 3);
    this.rim2.position.set(-dirv.x * 9 - dirv.z * 4, 6, -dirv.z * 9 + dirv.x * 4);
    if (this.shakeAmt > 0.001) { c.position.x += rnd(-1, 1) * this.shakeAmt * r * 0.05; c.position.y += rnd(-1, 1) * this.shakeAmt * r * 0.05; }
    c.aspect = w / h;
    // centraliza o tabuleiro (nao o ponto de mira) dentro da area livre
    const k = 1 / this.cam.rFactor;
    const offY = h / 2 - (st.top + st.height / 2) - fc.y * k * st.height / 2, offX = w / 2 - (st.left + st.width / 2) + fc.x * k * st.width / 2;
    // escala o campo de visao para que a area livre tenha o tamanho calculado
    const scale = h / st.height;
    c.fov = 2 * Math.atan(Math.tan(this.FOV * Math.PI / 360) * scale) * 180 / Math.PI;
    c.setViewOffset(w, h, offX, offY, w, h);
    c.updateProjectionMatrix();
  }

  // retangulo do tabuleiro na tela (px), para medir o layout
  boardRect() {
    const c = this.camera; c.updateMatrixWorld();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const x of [-4.2, 4.2]) for (const z of [-4.2, 4.2]) for (const y of [0, 1.1]) {
      const p = new THREE.Vector3(x, y, z).project(c);
      const sx = (p.x + 1) / 2 * this.W, sy = (1 - p.y) / 2 * this.H;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return { left: x0, right: x1, top: y0, bottom: y1, width: x1 - x0, height: y1 - y0 };
  }

  bindInput() {
    const cv = this.canvas; let st = null;
    cv.addEventListener('pointerdown', (e) => { if (this.menu) return; this.skipCam(); st = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, th: this.cam.theta, ph: this.cam.phi }; try { cv.setPointerCapture(e.pointerId); } catch (er) { } });
    cv.addEventListener('pointermove', (e) => {
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved && dx * dx + dy * dy < 100) return;
      st.moved = true;
      this.cam.theta = st.th - dx * 0.008;
      this.cam.phi = Math.min(1.45, Math.max(0.38, st.ph + dy * 0.005));
      this.dirty = true;
    });
    const up = (e) => {
      if (!st || e.pointerId !== st.id) return;
      const was = st; st = null;
      if (was.moved) return;
      const sq = this.pick(e.clientX, e.clientY);
      if (sq >= 0) this.app.onSquare(sq);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => { st = null; });
  }

  pick(x, y) {
    const ndc = new THREE.Vector2(x / this.W * 2 - 1, -(y / this.H) * 2 + 1);
    const rc = this._rc || (this._rc = new THREE.Raycaster()); rc.setFromCamera(ndc, this.camera);
    const hits = rc.intersectObjects(this.pieceGroup.children, false);
    for (const h of hits) { for (const k in this.meshes) if (this.meshes[k] === h.object) return +k; }
    const p = new THREE.Vector3();
    if (!rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return -1;
    const f = Math.floor(p.x + 4), r = Math.floor(4 - p.z);
    if (f < 0 || f > 7 || r < 0 || r > 7) return -1;
    return r * 16 + f;
  }

  loop(tms) {
    requestAnimationFrame(this.loop);
    if (!this.active) return;
    const t = now(), dt = Math.min(0.05, this.fps.last ? t - this.fps.last : 0.016);
    this.fps.last = t;
    let busy = false;
    if (this.tweens.length) {
      busy = true;
      // tweens criados durante outro tween (ex.: captura) entram na lista nova e nao se perdem
      const list = this.tweens; this.tweens = [];
      const kept = list.filter((tw) => {
        if (t < tw.t0) return true;
        const k = Math.min(1, (t - tw.t0) / tw.dur);
        tw.fn(k);
        if (k >= 1) { tw.res(); return false; }
        return true;
      });
      this.tweens = kept.concat(this.tweens);
    }
    if (this.particles.update(dt)) busy = true;
    if (this.shakeAmt > 0.001) { this.shakeAmt *= Math.pow(0.0005, dt); busy = true; } else this.shakeAmt = 0;
    if (this.menu) { this.cam.theta += dt * 0.12; busy = true; }
    // peca selecionada sobe um pouco
    this._liftMoving = false;
    for (const k in this.meshes) {
      const m = this.meshes[k], goal = (+k === this.selSq) ? 0.24 + Math.sin(t * 4) * 0.025 : 0;
      const d = goal - m.position.y;
      if (Math.abs(d) > 0.002 && !this.isTweening(m)) { m.position.y += d * Math.min(1, dt * 14); busy = true; this._liftMoving = true; }
    }
    if (this.checkMesh.visible) { const s = 0.85 + Math.sin(t * 5) * 0.15; this.checkMesh.scale.set(s, 1, s); this.checkMesh.material.opacity = 0.65 + Math.sin(t * 5) * 0.3; busy = true;
      if (this.checkKing) this.checkKing.material.emissiveIntensity = 0.12 + (Math.sin(t * 5) * 0.5 + 0.5) * 0.35; }
    if (this.selSq >= 0) { const s = 1 + Math.sin(t * 6) * 0.08; this.dotMat.opacity = 0.7 + Math.sin(t * 6) * 0.15; for (const k in this.marks) this.marks[k].dot.scale.set(s, 1, s); busy = true; }
    for (const k in this.meshes) { const m = this.meshes[k], ao = m.userData.ao; if (ao) { ao.position.y = 0.007 - m.position.y; const sc = 1 + m.position.y * 0.8; ao.scale.set(sc, 1, sc); } const rg = m.userData.ring; if (rg) rg.position.y = 0.011 - m.position.y; }
    if (!busy && !this.dirty) { this.fps.frames = 0; this.fps.time = 0; return; }
    // no menu basta 30 quadros por segundo (economiza bateria)
    if (this.menu && !this.dirty && (this._skip = !this._skip)) return;
    if (this.tweens.length || this.shadowDirty || this._liftMoving) { this.renderer.shadowMap.needsUpdate = true; this.shadowDirty = false; }
    this.dirty = false;
    this.placeCamera();
    this.renderer.render(this.scene, this.camera);
    // ajuste automatico de qualidade
    if (dt > 0 && dt < 0.5) {
      this.fps.frames++; this.fps.time += dt;
      if (this.fps.time > 1.5) {
        const fps = this.fps.frames / this.fps.time;
        this.fps.frames = 0; this.fps.time = 0;
        this.lastFps = fps;
        if (!this.lockQ && fps < 45 && this.level < this.levels.length - 1) { this.level++; this.applyQuality(); }
      }
    }
  }
  isTweening(m) { return this._animMeshes.has(m); }
}
