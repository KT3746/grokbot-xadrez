// Lutas 3D nas capturas: uma arena de pedra (a mesma do Xadrez Vivo) mostrada por cima do 2D.
// Um so renderizador e um so canvas, reaproveitados em todas as capturas.
export function makeFight(M, mv) {
  const { THREE, H } = M, { sqPos } = H;
  const Vivo = mv.makeVivo(M);
  return class FightView extends Vivo {
    constructor(canvas, app) {
      super(canvas, app);
      this.isFight = true; this.noAmb = true; this.alwaysAmb = false;
      this.fc = { look: new THREE.Vector3(0, 0.5, 0), theta: 0, phi: 0.3, dist: 4 };
      this.active = false;
    }
    // a arena so assiste: o toque e tratado pela camada por cima (pular)
    bindInput() { }
    applyQuality() { super.applyQuality(); this.alwaysAmb = false; }
    resize() {
      const box = this.canvas.parentElement, w = Math.max(2, box ? box.clientWidth : 2), h = Math.max(2, box ? box.clientHeight : 2);
      this.renderer.setSize(w, h, false);
      this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
      this.W = w; this.H = h; this.stage = { left: 0, top: 0, width: w, height: h }; this.stageAspect = w / h;
      this.camera.aspect = w / h; this.dirty = true;
    }
    fitLayout() { return 0; }
    setActive(on) { this.active = on; if (on) { this.resize(); this.dirty = true; } }
    // camera baixa e perto, de lado para a luta
    placeCamera() {
      const c = this.camera, f = this.fc, rf = this.cam.rFactor || 1, r = f.dist * (0.72 + 0.28 * rf);
      const dv = new THREE.Vector3(Math.cos(f.phi) * Math.sin(f.theta), Math.sin(f.phi), Math.cos(f.phi) * Math.cos(f.theta));
      c.position.copy(f.look).addScaledVector(dv, r);
      if (this.shakeAmt > 0.001) { c.position.x += (Math.random() * 2 - 1) * this.shakeAmt * 0.16; c.position.y += (Math.random() * 2 - 1) * this.shakeAmt * 0.16; }
      c.lookAt(f.look);
      this.rim.position.set(-dv.x * 9 + dv.z * 3, 4.5, -dv.z * 9 - dv.x * 3);
      this.rim2.position.set(-dv.x * 9 - dv.z * 4, 6, -dv.z * 9 + dv.x * 4);
      c.clearViewOffset(); c.fov = this.FOV; c.aspect = this.W / this.H; c.updateProjectionMatrix();
    }
    cutInTwo(...a) { if (this._onKill) this._onKill(); return super.cutInTwo(...a); }
    explode(...a) { if (this._onKill) this._onKill(); return super.explode(...a); }
    shatter(...a) { if (this._onKill) this._onKill(); return super.shatter(...a); }
    // para tudo na hora (pular)
    stop() {
      this._onKill = null; this.tweens = []; this.warp = null; this.rushUntil = 0; this.shakeAmt = 0; this._animMeshes.clear();
      if (this.cam.lookOff) this.cam.lookOff.set(0, 0, 0); this.cam.rFactor = 1;
      this.active = false;
    }
    // monta a luta perto do centro: atacante ao lado da vitima, na mesma direcao do lance de verdade
    fight(m, E) {
      this.stop(); this.clearDebris();
      const t = m.piece & 7, cap = m.cap || (E.P | ((m.piece & 8) ^ 8));
      let df = (m.to & 7) - (m.from & 7), dr = (m.to >> 4) - (m.from >> 4);
      if (t !== E.N) { df = Math.sign(df); dr = Math.sign(dr); }
      const to = (dr >= 0 ? 4 : 3) * 16 + (df >= 0 ? 4 : 3), from = to - dr * 16 - df;
      const before = new Array(128).fill(0), after = new Array(128).fill(0);
      before[from] = m.piece; before[to] = cap;
      after[to] = m.promo ? (m.promo | (m.piece & 8)) : m.piece;
      for (const k in this.meshes) this.pieceGroup.remove(this.meshes[k]);
      this.meshes = {}; this.sync(before); this.highlight({ sel: -1, dests: {}, last: null, check: -1 });
      const a = sqPos(from), b = sqPos(to), dir = b.clone().sub(a).setY(0).normalize();
      let px = -dir.z, pz = dir.x; if (pz < -0.01 || (Math.abs(pz) <= 0.01 && px < 0)) { px = -px; pz = -pz; }
      const hx = px - dir.x * 0.18, hz = pz - dir.z * 0.18;
      const f = this.fc; f.theta = Math.atan2(hx, hz); f.phi = 0.3;
      f.look.copy(a).lerp(b, 0.55).setY(0.5);
      // distancia para caber os dois (largura ~2.3, altura ~1.7)
      const tv = Math.tan(this.FOV * Math.PI / 360), asp = this.W / Math.max(1, this.H);
      f.dist = Math.max(1.0 / tv, 1.3 / (tv * asp)) + 0.9;
      this.cam.rFactor = 1; this.setActive(true);
      const mv2 = { from, to, piece: m.piece, cap, promo: m.promo || 0, flags: m.promo ? E.F_PROMO : 0 };
      // termina logo depois do golpe final (as metades caindo ja contam a historia)
      return new Promise((res) => {
        let done = false; const end = () => { if (!done) { done = true; this._onKill = null; res(); } };
        this._onKill = () => { this._onKill = null; setTimeout(end, 850); };
        this.animate(mv2, after, {}).then(end);
      });
    }
  };
}
