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
    const bg = new THREE.CanvasTexture(bgCanvas()); bg.colorSpace = THREE.SRGBColorSpace; this.scene.background = bg; this.scene.fog = new THREE.Fog(0x0b0e18, 16, 34);
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);

    this.buildLights(); this.buildBoard(mobile);
    this.geos = buildGeometries(mobile ? 28 : 40);
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
    const aoC = glowCanvas('rgba(0,0,0,0.78)', 'rgba(0,0,0,0)');
    this.aoMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(aoC), transparent: true, depthWrite: false, toneMapped: false });
    this.aoGeo = new THREE.PlaneGeometry(0.98, 0.98); this.aoGeo.rotateX(-Math.PI / 2);
    this.pieceGroup = new THREE.Group(); this.scene.add(this.pieceGroup);
    this.meshes = {};
    this.particles = new Particles(this.scene, new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,1)', 'rgba(255,255,255,0)')));
    this.tweens = [];
    this.cam = { theta: 0, phi: 0.95, rFactor: 1, target: null };
    this.orient = 0; this.menu = false; this.active = true;
    this.hl = {}; this.selSq = -1; this._animMeshes = new Set();
    this.fps = { frames: 0, time: 0, last: 0 };
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
    s.add(new THREE.HemisphereLight(0xdfe7ff, 0x2a1d14, 0.55));
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
    const table = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0e0c0b, roughness: 0.95 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.42; table.receiveShadow = true; s.add(table);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas('rgba(255,210,150,0.22)', 'rgba(255,210,150,0)')), transparent: true, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = -0.415; s.add(pool);
    // luzes desfocadas ao fundo (ambiente)
    const bok = new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
    const cols = [0xffc27a, 0xffe2b0, 0x8fb4ff, 0xffa060];
    for (let i = 0; i < 26; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bok, color: cols[i % 4], transparent: true, opacity: rnd(0.08, 0.28), depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      const a = Math.random() * Math.PI * 2, d = rnd(16, 26);
      sp.position.set(Math.cos(a) * d, rnd(1.5, 9), Math.sin(a) * d); const sz = rnd(1.2, 3.5); sp.scale.set(sz, sz, 1); s.add(sp);
    }

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
      this.mats[0].clearcoat = lo ? 0 : 0.6; this.mats[0].sheen = lo ? 0 : 0.3; this.mats[8].clearcoat = lo ? 0.5 : 0.95;
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
    this.pieceGroup.add(m);
    return m;
  }

  sync(board) {
    this.board = board;
    const keep = {};
    for (let sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = board[sq], m = this.meshes[sq];
      if (p && m && m.userData.piece === p) { keep[sq] = m; if (m.userData.ao) m.userData.ao.visible = true; m.position.copy(sqPos(sq)); m.scale.set(1, 1, 1); m.rotation.x = 0; m.rotation.z = 0; continue; }
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
  cancelCam() {
    this.tweens = this.tweens.filter((tw) => { if (tw.tag === 'cam') { tw.res(); return false; } return true; });
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

  captureFx(mesh, dir) {
    const p = mesh.position.clone(), dark = mesh.userData.piece & 8;
    this.particles.burst(p.clone().setY(0.45), { colors: dark ? ['#ff9d4a', '#ffd27a', '#ffefc0'] : ['#fff1c8', '#ffd27a', '#ffffff'], count: 55, up: 3, speed: 2.4, life: 0.9 });
    this.dust(p, 1.6);
    this.flash(p, 0xffb060, 3);
    const mat = mesh.material.clone(); mat.transparent = true; mesh.material = mat;
    if (mesh.userData.ol) mesh.userData.ol.visible = false; if (mesh.userData.ao) mesh.userData.ao.visible = false;
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
      if (king && king.userData.ao) king.userData.ao.visible = false;
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
  defaultPhi() { const a = this.stageAspect || 0.6; return a < 0.8 ? 0.92 : 0.85; }

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
    if (on) { this.cam.phi = 0.55; this.cam.rFactor = 1.15; this.cam.target = null; }
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

  placeCamera() {
    const c = this.camera, st = this.stage, w = this.W, h = this.H;
    // encaixa o tabuleiro dentro da area livre da tela
    c.fov = 36; c.aspect = st.width / st.height; c.clearViewOffset(); c.updateProjectionMatrix();
    const corners = [];
    for (const x of [-4.2, 4.2]) for (const z of [-4.2, 4.2]) { corners.push(new THREE.Vector3(x, 0, z)); corners.push(new THREE.Vector3(x, x * z > 0 ? 0.9 : 1.3, z)); }
    const dirv = new THREE.Vector3(Math.cos(this.cam.phi) * Math.sin(this.cam.theta), Math.sin(this.cam.phi), Math.cos(this.cam.phi) * Math.cos(this.cam.theta));
    const look = this.cam.target || new THREE.Vector3(0, 0.15, 0);
    const fits = (r) => {
      c.position.copy(look).addScaledVector(dirv, r); c.lookAt(look); c.updateMatrixWorld();
      for (const p of corners) { const v = p.clone().project(c); if (Math.abs(v.x) > 0.97 || Math.abs(v.y) > 0.95 || v.z > 1) return false; }
      return true;
    };
    const key = [this.cam.theta.toFixed(3), this.cam.phi.toFixed(3), st.width, st.height].join();
    let r;
    if (this.cam.target) { this._fitKey = null; r = this.cam.dist || 3; }
    else if (this._fitKey === key) r = this._fitR;
    else {
      let lo = 4, hi = 60;
      for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
      r = hi; this._fitKey = key; this._fitR = r;
    }
    if (!this.cam.target) r *= this.cam.rFactor;
    c.position.copy(look).addScaledVector(dirv, r); c.lookAt(look);
    // luz de contorno sempre atras das pecas, vista da camera
    this.rim.position.set(-dirv.x * 9 + dirv.z * 3, 4.5, -dirv.z * 9 - dirv.x * 3);
    this.rim2.position.set(-dirv.x * 9 - dirv.z * 4, 6, -dirv.z * 9 + dirv.x * 4);
    if (this.shakeAmt > 0.001) { c.position.x += rnd(-1, 1) * this.shakeAmt * r * 0.05; c.position.y += rnd(-1, 1) * this.shakeAmt * r * 0.05; }
    c.aspect = w / h;
    const offY = h / 2 - (st.top + st.height / 2), offX = w / 2 - (st.left + st.width / 2);
    // escala o campo de visao para que a area livre tenha o tamanho calculado
    const scale = h / st.height;
    c.fov = 2 * Math.atan(Math.tan(36 * Math.PI / 360) * scale) * 180 / Math.PI;
    c.setViewOffset(w, h, offX, offY, w, h);
    c.updateProjectionMatrix();
  }

  bindInput() {
    const cv = this.canvas; let st = null;
    cv.addEventListener('pointerdown', (e) => { if (this.menu) return; st = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, th: this.cam.theta, ph: this.cam.phi }; try { cv.setPointerCapture(e.pointerId); } catch (er) { } });
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
      this.tweens = this.tweens.filter((tw) => {
        if (t < tw.t0) return true;
        const k = Math.min(1, (t - tw.t0) / tw.dur);
        tw.fn(k);
        if (k >= 1) { tw.res(); return false; }
        return true;
      });
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
    for (const k in this.meshes) { const m = this.meshes[k], ao = m.userData.ao; if (ao) { ao.position.y = 0.007 - m.position.y; const sc = 1 + m.position.y * 0.8; ao.scale.set(sc, 1, sc); } }
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
