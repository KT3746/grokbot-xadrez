/* Sons e musica gerados no proprio navegador (WebAudio), nada gravado */
(function () {
  var ctx = null, comp, sfx, mus, verb, verbIn, noiseBuf;
  var sfxOn = true, musOn = true, timer = null, nextBar = 0, bar = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    var master = ctx.createGain(); master.gain.value = 0.9;
    comp.connect(master); master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = sfxOn ? 1 : 0; sfx.connect(comp);
    mus = ctx.createGain(); mus.gain.value = 0; mus.connect(comp);
    verb = ctx.createConvolver(); verb.buffer = impulse(2.8);
    verbIn = ctx.createGain(); verbIn.gain.value = 1;
    var verbOut = ctx.createGain(); verbOut.gain.value = 0.45;
    verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (musOn) startMusic();
    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }

  function impulse(sec) {
    var len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return buf;
  }

  function env(g, t, v, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
  }

  function knock(t, freq, vol, dur, out) {
    var src = ctx.createBufferSource(); src.buffer = noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.6;
    var g = ctx.createGain(); env(g, t, vol, 0.002, dur);
    src.connect(bp); bp.connect(g); g.connect(out || sfx);
    var send = ctx.createGain(); send.gain.value = 0.12; g.connect(send); send.connect(verbIn);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }
  function thump(t, f1, f2, vol, dur) {
    var o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    var g = ctx.createGain(); env(g, t, vol, 0.003, dur);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  function bell(t, f, vol, dur, wet) {
    [[1, 1], [2.76, 0.28], [5.4, 0.08]].forEach(function (p) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * p[0];
      var g = ctx.createGain(); env(g, t, vol * p[1], 0.004, (dur || 1.4) / p[0]);
      o.connect(g); g.connect(sfx);
      var s = ctx.createGain(); s.gain.value = wet == null ? 0.5 : wet; g.connect(s); s.connect(verbIn);
      o.start(t); o.stop(t + (dur || 1.4) + 0.1);
    });
  }
  function tick(t, f, vol, dur) {
    var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    var g = ctx.createGain(); env(g, t, vol, 0.002, dur);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.05);
  }

  var FX = {
    move: function (t) { knock(t, 1500, 0.55, 0.06); thump(t, 160, 70, 0.45, 0.11); },
    capture: function (t) { knock(t, 1100, 0.7, 0.09); knock(t + 0.045, 2300, 0.35, 0.05); thump(t, 120, 45, 0.75, 0.2); },
    castle: function (t) { FX.move(t); FX.move(t + 0.13); },
    check: function (t) { FX.move(t); bell(t + 0.02, 880, 0.22, 1.2); bell(t + 0.02, 1318.5, 0.1, 1.0); },
    mate: function (t) { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { bell(t + i * 0.14, f, 0.22, 2.2, 0.7); }); bell(t + 0.6, 523.25, 0.12, 3); bell(t + 0.6, 783.99, 0.1, 3); },
    lose: function (t) { [440, 392, 329.63, 261.63].forEach(function (f, i) { bell(t + i * 0.2, f, 0.2, 2, 0.7); }); },
    draw: function (t) { bell(t, 659.25, 0.18, 1.6); bell(t + 0.25, 523.25, 0.18, 2); },
    select: function (t) { tick(t, 1900, 0.08, 0.035); },
    illegal: function (t) { tick(t, 180, 0.12, 0.12); tick(t + 0.09, 140, 0.1, 0.12); },
    click: function (t) { tick(t, 1250, 0.09, 0.03); },
    promote: function (t) { [783.99, 987.77, 1174.66, 1567.98].forEach(function (f, i) { bell(t + i * 0.06, f, 0.12, 1.2, 0.8); }); },
    start: function (t) { [392, 523.25, 659.25].forEach(function (f, i) { bell(t + i * 0.11, f, 0.14, 1.6, 0.7); }); },
    whoosh: function (t) {
      var src = ctx.createBufferSource(); src.buffer = noiseBuf;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.25);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      src.connect(bp); bp.connect(g); g.connect(sfx); src.start(t, 0, 0.35);
    }
  };

  function play(name) {
    if (!ctx || !sfxOn || !FX[name]) return;
    if (ctx.state === 'suspended') ctx.resume();
    try { FX[name](ctx.currentTime + 0.01); } catch (e) { }
  }

  // ===== Musica ambiente generativa (la menor, calma) =====
  var CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [50, 53, 57], [52, 56, 59], [57, 60, 64]];
  var SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76];
  function mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function pad(t, note, len) {
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 1.4);
    g.gain.setValueAtTime(0.05, t + len - 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 1.2);
    lp.connect(g); g.connect(mus);
    var s = ctx.createGain(); s.gain.value = 0.6; g.connect(s); s.connect(verbIn);
    [-7, 7].forEach(function (det) {
      var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(note); o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + len + 1.3);
    });
  }
  function pluck(t, note, vol) {
    var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(note);
    var g = ctx.createGain(); env(g, t, vol, 0.005, 1.1);
    o.connect(g); g.connect(mus);
    var s = ctx.createGain(); s.gain.value = 0.9; g.connect(s); s.connect(verbIn);
    o.start(t); o.stop(t + 1.3);
  }
  function scheduleBar(t) {
    var ch = CHORDS[bar % CHORDS.length], len = 4.8;
    ch.forEach(function (n) { pad(t, n, len); });
    pad(t, ch[0] - 12, len);
    for (var i = 0; i < 8; i++) {
      if (Math.random() < 0.55) {
        var pool = Math.random() < 0.6 ? ch.map(function (n) { return n + 12; }) : SCALE.map(function (n) { return n + 12; });
        pluck(t + i * 0.6 + Math.random() * 0.03, pool[Math.floor(Math.random() * pool.length)], 0.035 + Math.random() * 0.03);
      }
    }
    bar++;
  }
  function startMusic() {
    if (!ctx || timer) return;
    mus.gain.cancelScheduledValues(ctx.currentTime);
    mus.gain.setValueAtTime(mus.gain.value, ctx.currentTime);
    mus.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2);
    nextBar = Math.max(nextBar, ctx.currentTime + 0.1);
    timer = setInterval(function () {
      if (!ctx || ctx.state !== 'running') return;
      while (nextBar < ctx.currentTime + 1.5) { scheduleBar(nextBar); nextBar += 4.8; }
    }, 300);
  }
  function stopMusic() {
    if (!ctx) return;
    clearInterval(timer); timer = null;
    mus.gain.cancelScheduledValues(ctx.currentTime);
    mus.gain.setValueAtTime(mus.gain.value, ctx.currentTime);
    mus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
  }

  window.XSound = {
    init: init, play: play,
    setSfx: function (on) { sfxOn = on; if (sfx) sfx.gain.value = on ? 1 : 0; },
    setMusic: function (on) { musOn = on; if (on) startMusic(); else stopMusic(); },
    get sfxOn() { return sfxOn; }, get musicOn() { return musOn; }
  };
})();
