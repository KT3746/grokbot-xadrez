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
function marbleCanvas(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), s = size / 8;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const light = (r + f) % 2 === 0;
    const x = f * s, y = r * s;
    g.save(); g.beginPath(); g.rect(x, y, s, s); g.clip();
    const grd = g.createLinearGradient(x, y, x + s, y + s);
    if (light) { grd.addColorStop(0, '#f1e8d6'); grd.addColorStop(1, '#e2d5bd'); }
    else { grd.addColorStop(0, '#2f5d50'); grd.addColorStop(1, '#244a40'); }
    g.fillStyle = grd; g.fillRect(x, y, s, s);
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      const sx = x + rnd(-0.2, 1.2) * s, sy = y + rnd(-0.2, 1.2) * s;
      g.moveTo(sx, sy);
      g.bezierCurveTo(x + rnd(0, 1) * s, y + rnd(0, 1) * s, x + rnd(0, 1) * s, y + rnd(0, 1) * s, x + rnd(-0.2, 1.2) * s, y + rnd(-0.2, 1.2) * s);
      g.lineWidth = rnd(0.4, 2.2) * size / 512;
      g.strokeStyle = light ? `rgba(150,128,100,${rnd(0.15, 0.4)})` : `rgba(190,225,210,${rnd(0.08, 0.28)})`;
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
  const g = c.getContext('2d');
  g.fillStyle = '#5b3920'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * h, amp = rnd(2, 10), per = rnd(80, 300), ph = Math.random() * 6;
    g.beginPath();
    for (let x = 0; x <= w; x += 12) { const yy = y + Math.sin(x / per + ph) * amp; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
    g.lineWidth = rnd(0.5, 3);
    g.strokeStyle = Math.random() < 0.5 ? `rgba(30,15,6,${rnd(0.08, 0.3)})` : `rgba(150,100,60,${rnd(0.05, 0.2)})`;
    g.stroke();
  }
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
function glowCanvas(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128); return c;
}
function bgCanvas() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 256;
  const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#1d2740'); grd.addColorStop(0.55, '#0f1424'); grd.addColorStop(1, '#07090f');
  g.fillStyle = grd; g.fillRect(0, 0, 16, 256); return c;
}

// ---------- Modelos das pecas ----------
function arc(cy, r, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([Math.max(0, r * Math.cos(a)), cy + r * Math.sin(a)]); }
  return pts;
}
function lathe(pts, seg) { return new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); }
function tint(geo, v) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const n = geo.attributes.position.count, col = new Float32Array(n * 3).fill(v);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return geo;
}
const BASE = [[0, 0], [0.35, 0], [0.37, 0.025], [0.37, 0.055], [0.335, 0.095], [0.29, 0.12], [0.27, 0.16]];
function buildGeometries(seg) {
  const G = {};
  G[E.P] = tint(lathe([...BASE, [0.21, 0.2], [0.15, 0.28], [0.115, 0.4], [0.17, 0.44], [0.175, 0.47], [0.11, 0.5], ...arc(0.62, 0.13, -60, 90, 10)], seg), 1);
  {
    const body = lathe([...BASE, [0.24, 0.21], [0.205, 0.3], [0.2, 0.5], [0.215, 0.6], [0.265, 0.64], [0.275, 0.68], [0.275, 0.76], [0.2, 0.76], [0.19, 0.72], [0, 0.72]], seg);
    const parts = [tint(body, 1)];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.BoxGeometry(0.11, 0.1, 0.075);
      const a = i / 6 * Math.PI * 2;
      b.rotateY(-a + Math.PI / 2); b.translate(Math.cos(a) * 0.235, 0.8, Math.sin(a) * 0.235);
      parts.push(tint(b, 1));
    }
    const band = new THREE.TorusGeometry(0.205, 0.012, 6, seg); band.rotateX(Math.PI / 2); band.translate(0, 0.42, 0);
    parts.push(tint(band, 0.55));
    G[E.R] = mergeGeometries(parts);
  }
  {
    const base = lathe([...BASE, [0.25, 0.2], [0.24, 0.24], [0, 0.24]], seg);
    const s = new THREE.Shape();
    s.moveTo(-0.23, 0.2);
    s.lineTo(0.22, 0.2);
    s.splineThru([new THREE.Vector2(0.17, 0.4), new THREE.Vector2(0.09, 0.53), new THREE.Vector2(0.2, 0.6), new THREE.Vector2(0.33, 0.65),
      new THREE.Vector2(0.37, 0.73), new THREE.Vector2(0.3, 0.83), new THREE.Vector2(0.15, 0.95), new THREE.Vector2(0.07, 1.07)]);
    s.lineTo(0.0, 1.12); s.lineTo(-0.04, 1.0);
    s.splineThru([new THREE.Vector2(-0.15, 0.96), new THREE.Vector2(-0.24, 0.8), new THREE.Vector2(-0.28, 0.58), new THREE.Vector2(-0.26, 0.38), new THREE.Vector2(-0.23, 0.2)]);
    const head = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 3, curveSegments: 10 });
    head.translate(-0.03, 0, -0.08);
    const eyes = [];
    for (const z of [-0.125, 0.125]) { const e = new THREE.SphereGeometry(0.035, 8, 6); e.translate(0.15, 0.84, z); eyes.push(tint(e, 0.15)); }
    const mane = new THREE.BoxGeometry(0.05, 0.5, 0.08); mane.rotateZ(-0.35); mane.translate(-0.2, 0.72, 0);
    const g = mergeGeometries([tint(base, 1), tint(head, 1), tint(mane, 0.6), ...eyes]);
    g.rotateY(Math.PI / 2);
    G[E.N] = g;
  }
  {
    const body = lathe([...BASE, [0.2, 0.22], [0.135, 0.36], [0.11, 0.52], [0.185, 0.55], [0.185, 0.585], [0.11, 0.615], [0.135, 0.65], [0.17, 0.71],
      [0.185, 0.78], [0.17, 0.86], [0.13, 0.93], [0.07, 0.99], [0.03, 1.01], ...arc(1.05, 0.05, -40, 90, 6)], seg);
    const slit = new THREE.BoxGeometry(0.05, 0.03, 0.2); slit.rotateX(0.75); slit.translate(0.163, 0.82, 0);
    const g = mergeGeometries([tint(body, 1), tint(slit, 0.18)]);
    g.rotateY(Math.PI / 2);
    G[E.B] = g;
  }
  {
    const body = lathe([...BASE, [0.22, 0.23], [0.155, 0.42], [0.125, 0.62], [0.12, 0.74], [0.205, 0.77], [0.205, 0.805], [0.13, 0.83],
      [0.15, 0.92], [0.2, 1.02], [0.225, 1.08], [0.17, 1.07], [0.1, 1.09], [0.065, 1.12], ...arc(1.17, 0.06, -50, 90, 8)], seg);
    const parts = [tint(body, 1)];
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, b = new THREE.SphereGeometry(0.035, 8, 6); b.translate(Math.cos(a) * 0.215, 1.1, Math.sin(a) * 0.215); parts.push(tint(b, 1)); }
    const band = new THREE.TorusGeometry(0.205, 0.015, 6, seg); band.rotateX(Math.PI / 2); band.translate(0, 0.79, 0); parts.push(tint(band, 0.55));
    G[E.Q] = mergeGeometries(parts);
  }
  {
    const body = lathe([...BASE, [0.23, 0.24], [0.165, 0.44], [0.135, 0.68], [0.13, 0.79], [0.22, 0.82], [0.22, 0.855], [0.14, 0.88],
      [0.165, 0.98], [0.215, 1.08], [0.2, 1.13], [0.12, 1.15], [0.06, 1.19], [0, 1.2]], seg);
    const v = new THREE.BoxGeometry(0.075, 0.3, 0.075); v.translate(0, 1.33, 0);
    const h = new THREE.BoxGeometry(0.22, 0.075, 0.075); h.translate(0, 1.36, 0);
    const band = new THREE.TorusGeometry(0.215, 0.015, 6, seg); band.rotateX(Math.PI / 2); band.translate(0, 0.84, 0);
    G[E.K] = mergeGeometries([tint(body, 1), tint(v, 1), tint(h, 1), tint(band, 0.55)]);
  }
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
    const mat = new THREE.PointsMaterial({ size: opts.size || 0.11, map: this.tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.list.push({ pts, v, t0: now(), life: opts.life || 1.1, grav: opts.grav == null ? 6 : opts.grav });
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
      s.pts.material.opacity = 1 - k * k;
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
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    this.scene = new THREE.Scene();
    const bg = new THREE.CanvasTexture(bgCanvas()); bg.colorSpace = THREE.SRGBColorSpace; this.scene.background = bg; this.scene.fog = new THREE.Fog(0x0b0e18, 16, 34);
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);

    this.buildLights(); this.buildBoard(mobile);
    this.geos = buildGeometries(mobile ? 28 : 40);
    this.mats = {
      0: new THREE.MeshPhysicalMaterial({ color: 0xe6d8bd, roughness: 0.38, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.25, vertexColors: true, envMapIntensity: 0.8 }),
      8: new THREE.MeshPhysicalMaterial({ color: 0x2a1d17, roughness: 0.32, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.15, vertexColors: true, envMapIntensity: 0.9 }),
    };
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
  }

  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xdfe7ff, 0x2a1d14, 0.55));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
    key.position.set(4.5, 11, 5.5); key.castShadow = true;
    const sc = key.shadow.camera; sc.left = -6.5; sc.right = 6.5; sc.top = 6.5; sc.bottom = -6.5; sc.near = 2; sc.far = 25;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    s.add(key); this.key = key;
    const rim = new THREE.DirectionalLight(0x9db8ff, 0.7); rim.position.set(-6, 5, -7); s.add(rim);
    this.glowLight = new THREE.PointLight(0xffcc66, 0, 8, 2); this.glowLight.position.set(0, 1.5, 0); s.add(this.glowLight);
  }

  buildBoard(mobile) {
    const s = this.scene;
    const mtex = new THREE.CanvasTexture(marbleCanvas(mobile ? 1024 : 2048));
    mtex.colorSpace = THREE.SRGBColorSpace; mtex.anisotropy = 4;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshPhysicalMaterial({ map: mtex, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.6 }));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.004; top.receiveShadow = true; s.add(top);
    const ftex = new THREE.CanvasTexture(woodCanvas(1024, 1024, true)); ftex.colorSpace = THREE.SRGBColorSpace; ftex.anisotropy = 4;
    const ftop = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 9.6), new THREE.MeshPhysicalMaterial({ map: ftex, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.25 }));
    ftop.rotation.x = -Math.PI / 2; ftop.position.y = 0.001; ftop.receiveShadow = true; s.add(ftop);
    const stex = new THREE.CanvasTexture(woodCanvas(512, 64, false)); stex.colorSpace = THREE.SRGBColorSpace;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.42, 9.6), new THREE.MeshStandardMaterial({ map: stex, roughness: 0.45 }));
    frame.position.y = -0.21; frame.castShadow = true; frame.receiveShadow = true; s.add(frame);
    const table = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0e0c0b, roughness: 0.95 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.42; table.receiveShadow = true; s.add(table);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas('rgba(255,210,150,0.22)', 'rgba(255,210,150,0)')), transparent: true, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = -0.415; s.add(pool);

    // marcas de casas
    this.marks = {};
    const planeG = new THREE.PlaneGeometry(0.98, 0.98); planeG.rotateX(-Math.PI / 2);
    const dotG = new THREE.CircleGeometry(0.15, 28); dotG.rotateX(-Math.PI / 2);
    const ringG = new THREE.RingGeometry(0.37, 0.47, 36); ringG.rotateX(-Math.PI / 2);
    this.dotMat = new THREE.MeshBasicMaterial({ color: 0x5ff0b0, transparent: true, opacity: 0.8, depthWrite: false });
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xff8a5c, transparent: true, opacity: 0.85, depthWrite: false });
    this.selMat = new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.55, depthWrite: false });
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

  applyQuality() {
    const L = this.levels[this.level];
    this.renderer.setPixelRatio(L.pr);
    this.renderer.shadowMap.enabled = L.shadows;
    this.key.castShadow = L.shadows;
    if (this.key.shadow.mapSize.x !== L.shadow) {
      this.key.shadow.mapSize.set(L.shadow, L.shadow);
      if (this.key.shadow.map) { this.key.shadow.map.dispose(); this.key.shadow.map = null; }
    }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  newMesh(sq, piece) {
    const m = new THREE.Mesh(this.geos[piece & 7], this.mats[piece & 8]);
    m.castShadow = true; m.receiveShadow = true;
    m.position.copy(sqPos(sq));
    if ((piece & 7) === E.N) m.rotation.y = (piece & 8) ? Math.PI : 0;
    m.userData = { piece, sq };
    this.pieceGroup.add(m);
    return m;
  }

  sync(board) {
    this.board = board;
    const keep = {};
    for (let sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = board[sq], m = this.meshes[sq];
      if (p && m && m.userData.piece === p) { keep[sq] = m; m.position.copy(sqPos(sq)); m.scale.set(1, 1, 1); m.rotation.x = 0; m.rotation.z = 0; continue; }
      if (m) this.pieceGroup.remove(m);
      if (p) keep[sq] = this.newMesh(sq, p);
    }
    for (const k in this.meshes) if (!keep[k] && this.meshes[k] !== keep[k]) this.pieceGroup.remove(this.meshes[k]);
    this.meshes = keep;
    this.dirty = true;
  }

  tween(dur, fn, delay = 0) {
    return new Promise((res) => { this.tweens.push({ t0: now() + delay, dur, fn, res }); this.dirty = true; });
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
    const h = knight ? 0.9 : 0.18 + dist * 0.06;
    const dur = Math.min(0.62, 0.3 + dist * 0.045);
    const jobs = [];
    let hit = false;
    const anim = this._animMeshes; anim.add(mesh); if (capMesh) anim.add(capMesh);
    jobs.push(this.tween(dur, (k) => {
      const e = ease(k);
      mesh.position.set(a.x + (b.x - a.x) * e, startY * (1 - e) + Math.sin(Math.PI * e) * h, a.z + (b.z - a.z) * e);
      mesh.rotation.z = Math.sin(Math.PI * e) * 0.08 * Math.sign(b.x - a.x || 1);
      if (capMesh && !hit && k > 0.72) { hit = true; this.captureFx(capMesh); }
    }).then(() => this.tween(0.16, (k) => { const s = 1 - Math.sin(Math.PI * k) * 0.08; mesh.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6); })));
    if (m.flags & E.F_CASTLE) {
      const rf = m.to > m.from ? m.from + 3 : m.from - 4, rt = m.to > m.from ? m.from + 1 : m.from - 1;
      const rook = this.meshes[rf];
      if (rook) {
        delete this.meshes[rf]; this.meshes[rt] = rook; anim.add(rook);
        const ra = sqPos(rf), rb = sqPos(rt);
        jobs.push(this.tween(0.42, (k) => { const e = ease(k); rook.position.set(ra.x + (rb.x - ra.x) * e, Math.sin(Math.PI * e) * 0.5, ra.z); }, dur * 0.6));
      }
    }
    return Promise.all(jobs).then(() => {
      anim.clear();
      if (m.promo) {
        this.particles.burst(b.clone().setY(0.6), { colors: ['#ffe08a', '#fff4d0', '#ffb84a'], count: 50, up: 2.5, life: 1.2, grav: 3 });
      }
      this.sync(board);
      if (m.promo) {
        const nm = this.meshes[m.to];
        if (nm) this.tween(0.4, (k) => { const s = 0.3 + easeOut(k) * 0.7; nm.scale.set(s, s, s); });
      }
    });
  }

  captureFx(mesh) {
    const p = mesh.position.clone(), dark = mesh.userData.piece & 8;
    this.particles.burst(p.clone().setY(0.4), { colors: dark ? ['#ff9d4a', '#ffd27a', '#7a4a2a'] : ['#fff1c8', '#ffd27a', '#ffffff'], count: 60, up: 3.2, speed: 2.6, life: 1.0 });
    const spin = (Math.random() < 0.5 ? -1 : 1) * 4;
    this.tween(0.5, (k) => {
      const e = easeOut(k);
      mesh.position.y = e * 1.1; mesh.rotation.y += spin * 0.016; mesh.rotation.x = e * 0.9;
      const s = Math.max(0.001, 1 - e); mesh.scale.set(s, s, s);
    }).then(() => { this.pieceGroup.remove(mesh); this._animMeshes.delete(mesh); });
  }

  celebrate(result) {
    // result: {reason, winner, kingSq}
    if (result.reason === 'mate') {
      const king = this.meshes[result.kingSq];
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
      this.glowLight.color.set(0xffcc66);
      this.tween(2.6, (k) => { this.glowLight.intensity = Math.sin(Math.PI * k) * 6; });
      this.orbitBy(0.6, 3.5);
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
      mk.plane.visible = isSel || isLast; mk.plane.material = isSel ? this.selMat : this.lastMat;
      const d = h.dests && h.dests[sq];
      mk.dot.visible = d === 1; mk.ring.visible = d === 2;
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

  intro() {
    const goalT = this.thetaFor(this.orient), goalP = this.defaultPhi();
    this.cam.theta = goalT + 2.4; this.cam.phi = 0.32; this.cam.rFactor = 1.7;
    this.tween(2.2, (k) => {
      const e = ease(k);
      this.cam.theta = goalT + 2.4 * (1 - e); this.cam.phi = 0.32 + (goalP - 0.32) * e; this.cam.rFactor = 1.7 - 0.7 * e;
    });
  }
  setMenu(on) {
    this.menu = on;
    if (on) { this.cam.phi = 0.55; this.cam.rFactor = 1.15; }
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
    c.aspect = st.width / st.height; c.clearViewOffset(); c.updateProjectionMatrix();
    const corners = [];
    for (const x of [-4.7, 4.7]) for (const z of [-4.7, 4.7]) { corners.push(new THREE.Vector3(x, 0, z)); corners.push(new THREE.Vector3(x, x * z > 0 ? 0.9 : 1.3, z)); }
    const dirv = new THREE.Vector3(Math.cos(this.cam.phi) * Math.sin(this.cam.theta), Math.sin(this.cam.phi), Math.cos(this.cam.phi) * Math.cos(this.cam.theta));
    const look = new THREE.Vector3(0, 0.15, 0);
    const fits = (r) => {
      c.position.copy(look).addScaledVector(dirv, r); c.lookAt(look); c.updateMatrixWorld();
      for (const p of corners) { const v = p.clone().project(c); if (Math.abs(v.x) > 0.97 || Math.abs(v.y) > 0.95 || v.z > 1) return false; }
      return true;
    };
    const key = [this.cam.theta.toFixed(3), this.cam.phi.toFixed(3), st.width, st.height].join();
    let r;
    if (this._fitKey === key) r = this._fitR;
    else {
      let lo = 4, hi = 60;
      for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
      r = hi; this._fitKey = key; this._fitR = r;
    }
    r *= this.cam.rFactor;
    c.position.copy(look).addScaledVector(dirv, r); c.lookAt(look);
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
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, this.camera);
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
    if (this.menu) { this.cam.theta += dt * 0.12; busy = true; }
    // peca selecionada sobe um pouco
    for (const k in this.meshes) {
      const m = this.meshes[k], goal = (+k === this.selSq) ? 0.22 : 0;
      const d = goal - m.position.y;
      if (Math.abs(d) > 0.002 && !this.isTweening(m)) { m.position.y += d * Math.min(1, dt * 14); busy = true; }
    }
    if (this.checkMesh.visible) { const s = 0.85 + Math.sin(t * 5) * 0.15; this.checkMesh.scale.set(s, 1, s); this.checkMesh.material.opacity = 0.65 + Math.sin(t * 5) * 0.3; busy = true; }
    if (this.selSq >= 0) { const s = 1 + Math.sin(t * 6) * 0.08; this.dotMat.opacity = 0.7 + Math.sin(t * 6) * 0.15; for (const k in this.marks) this.marks[k].dot.scale.set(s, 1, s); busy = true; }
    if (!busy && !this.dirty) { this.fps.frames = 0; this.fps.time = 0; return; }
    this.dirty = false;
    this.placeCamera();
    this.renderer.render(this.scene, this.camera);
    // ajuste automatico de qualidade
    if (dt > 0 && dt < 0.2) {
      this.fps.frames++; this.fps.time += dt;
      if (this.fps.time > 1.5) {
        const fps = this.fps.frames / this.fps.time;
        this.fps.frames = 0; this.fps.time = 0;
        this.lastFps = fps;
        if (fps < 45 && this.level < this.levels.length - 1) { this.level++; this.applyQuality(); }
      }
    }
  }
  isTweening(m) { return this._animMeshes.has(m); }
}
