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
    duckG = ctx.createGain(); duckG.gain.value = 1; duckG.connect(comp);
    mus = ctx.createGain(); mus.gain.value = 0; mus.connect(duckG);
    tensG = ctx.createGain(); tensG.gain.value = 1; tensG.connect(mus);
    verb = ctx.createConvolver(); verb.buffer = impulse(3.6);
    verbIn = ctx.createGain(); verbIn.gain.value = 1;
    var verbOut = ctx.createGain(); verbOut.gain.value = 0.45;
    verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (musOn) startMusic();
    startBeat();
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

  // batida de madeira: um impulso curto excita varios ressonadores (modos da madeira)
  function clack(t, amt, pitch) {
    amt = amt * (0.9 + Math.random() * 0.2);
    var f0 = (640 + Math.random() * 120) * (pitch || 1);
    var src = ctx.createBufferSource(); src.buffer = noiseBuf;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 250;
    var ex = ctx.createGain(); ex.gain.setValueAtTime(amt, t); ex.gain.exponentialRampToValueAtTime(0.0001, t + 0.008);
    src.connect(hp); hp.connect(ex);
    var out = ctx.createGain(); out.gain.value = 0.9; out.connect(sfx);
    var send = ctx.createGain(); send.gain.value = 0.1; out.connect(send); send.connect(verbIn);
    [[1, 18, 0.11, 1], [2.32, 22, 0.07, 0.6], [3.87, 26, 0.05, 0.4], [5.4, 30, 0.035, 0.25]].forEach(function (md) {
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f0 * md[0] * (0.97 + Math.random() * 0.06); bp.Q.value = md[1];
      var g = ctx.createGain(); g.gain.setValueAtTime(md[3] * 6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + md[2] * (0.8 + amt * 0.4));
      ex.connect(bp); bp.connect(g); g.connect(out);
    });
    var click = ctx.createBiquadFilter(); click.type = 'bandpass'; click.frequency.value = 3200 + Math.random() * 800; click.Q.value = 1.2;
    var cg = ctx.createGain(); cg.gain.value = 0.35; ex.connect(click); click.connect(cg); cg.connect(out);
    src.start(t, Math.random() * 0.8, 0.05);
    thump(t, 150 * (pitch || 1), 62, 0.32 * amt, 0.1);
  }
  var FX = {
    move: function (t) { clack(t, 0.9, 1); },
    capture: function (t) { clack(t, 1.25, 0.82); clack(t + 0.032, 0.6, 1.18); thump(t, 110, 42, 0.55, 0.22); knock(t + 0.01, 900, 0.25, 0.08); },
    castle: function (t) { clack(t, 0.85, 1); clack(t + 0.15, 0.75, 0.9); },
    check: function (t) { FX.move(t); bell(t + 0.02, 880, 0.22, 1.2); bell(t + 0.02, 1318.5, 0.1, 1.0); },
    mate: function (t) { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { bell(t + i * 0.14, f, 0.22, 2.2, 0.7); }); bell(t + 0.6, 523.25, 0.12, 3); bell(t + 0.6, 783.99, 0.1, 3); },
    lose: function (t) { [440, 392, 329.63, 261.63].forEach(function (f, i) { bell(t + i * 0.2, f, 0.2, 2, 0.7); }); },
    draw: function (t) { bell(t, 659.25, 0.18, 1.6); bell(t + 0.25, 523.25, 0.18, 2); },
    select: function (t) { tick(t, 1900, 0.08, 0.035); },
    illegal: function (t) { tick(t, 180, 0.12, 0.12); tick(t + 0.09, 140, 0.1, 0.12); },
    click: function (t) { tick(t, 1250, 0.09, 0.03); },
    promote: function (t) { [783.99, 987.77, 1174.66, 1567.98].forEach(function (f, i) { bell(t + i * 0.06, f, 0.12, 1.2, 0.8); }); },
    start: function (t) { [392, 523.25, 659.25].forEach(function (f, i) { bell(t + i * 0.11, f, 0.14, 1.6, 0.7); }); },
    // ===== Xadrez Vivo: sons de pedra =====
    stomp: function (t) { thump(t, 95, 40, 0.32, 0.16); knock(t, 260, 0.12, 0.07); },
    stompH: function (t) { thump(t, 70, 30, 0.5, 0.24); knock(t, 180, 0.2, 0.1); knock(t + 0.01, 900, 0.05, 0.04); },
    leap: function (t) { FX.whoosh(t); thump(t, 120, 60, 0.15, 0.12); },
    swing: function (t) { FX.whoosh(t); },
    strike: function (t) { bell(t, 523, 0.06, 0.4, 0.6); bell(t, 811, 0.04, 0.3, 0.6); knock(t, 1400, 0.25, 0.06); thump(t, 140, 50, 0.4, 0.18); },
    shatter: function (t) { thump(t, 90, 32, 0.6, 0.3); for (var i = 0; i < 9; i++) knock(t + Math.random() * 0.35, 500 + Math.random() * 2600, 0.08 + Math.random() * 0.14, 0.04 + Math.random() * 0.06); rumble(t, 0.6, 0.25); },
    crumble: function (t) { thump(t, 70, 25, 0.7, 0.5); for (var i = 0; i < 16; i++) knock(t + Math.random() * 0.9, 300 + Math.random() * 2200, 0.08 + Math.random() * 0.14, 0.05 + Math.random() * 0.08); rumble(t, 1.6, 0.45); },
    rumble: function (t) { rumble(t, 1.3, 0.35); },
    clink: function (t) { bell(t, 1567.98, 0.08, 0.6, 0.6); bell(t + 0.05, 2093, 0.05, 0.5, 0.6); },
    awaken: function (t) { rumble(t, 2.2, 0.4); thump(t + 0.2, 55, 28, 0.4, 0.8); [146.83, 220, 293.66].forEach(function (f, i) { bell(t + 0.3 + i * 0.2, f, 0.08, 2.4, 0.9); }); },
    whoosh: function (t) {
      var src = ctx.createBufferSource(); src.buffer = noiseBuf;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.25);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      src.connect(bp); bp.connect(g); g.connect(sfx); src.start(t, 0, 0.35);
    }
  };

  // ronco grave de pedra arrastando
  function rumble(t, dur, vol) {
    var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 0.7;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp); lp.connect(g); g.connect(sfx); var s2 = ctx.createGain(); s2.gain.value = 0.3; g.connect(s2); s2.connect(verbIn);
    src.start(t); src.stop(t + dur + 0.1);
  }
  // a musica abaixa um pouco quando um som importante toca (mixagem)
  var DUCK = { shatter: 0.5, crumble: 0.25, awaken: 0.5, capture: 0.5, check: 0.4, mate: 0.15, lose: 0.2, draw: 0.35, promote: 0.4, castle: 0.7, start: 0.6 };
  var duckG = null;
  function duck(amt, hold) {
    if (!duckG || !musOn) return;
    var t = ctx.currentTime, g = duckG.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(amt, t + 0.04); g.setValueAtTime(amt, t + hold); g.linearRampToValueAtTime(1, t + hold + 0.9);
  }
  function play(name) {
    if (!ctx || !sfxOn || !FX[name]) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (DUCK[name] != null) duck(DUCK[name], name === 'mate' || name === 'lose' ? 2.6 : 0.25);
    try { FX[name](ctx.currentTime + 0.01); } catch (e) { }
  }

  // ===== Camada de tensao: batida de coracao grave que cresce com o perigo =====
  var tension = 0, tTarget = 0, beatT = 0, beatTimer = null, tensG = null;
  function heart(t, vol) {
    [[0, 62, 1], [0.2, 54, 0.6]].forEach(function (b) {
      var o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(b[1] * 1.6, t + b[0]); o.frequency.exponentialRampToValueAtTime(b[1], t + b[0] + 0.12);
      var g = ctx.createGain(); env(g, t + b[0], vol * b[2], 0.006, 0.28);
      o.connect(g); g.connect(tensG); o.start(t + b[0]); o.stop(t + b[0] + 0.4);
    });
  }
  function shimmer(t, vol) {
    var src = ctx.createBufferSource(); src.buffer = noiseBuf;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    var g = ctx.createGain(); env(g, t, vol, 0.002, 0.05);
    src.connect(hp); hp.connect(g); g.connect(tensG); src.start(t, Math.random() * 0.5, 0.08);
  }
  function startBeat() {
    if (beatTimer || !ctx) return;
    beatT = ctx.currentTime + 0.1;
    beatTimer = setInterval(function () {
      if (!ctx || ctx.state !== 'running') return;
      tension += (tTarget - tension) * 0.25;
      if (!musOn || tension < 0.05) { beatT = Math.max(beatT, ctx.currentTime + 0.1); return; }
      var gap = 1.05 - tension * 0.35;
      while (beatT < ctx.currentTime + 0.5) {
        heart(beatT, 0.07 + tension * 0.11);
        if (tension > 0.6) { shimmer(beatT + gap / 2, 0.012 * tension); }
        beatT += gap;
      }
    }, 200);
  }

  // ===== Musica ambiente generativa (calma, piano eletrico e camas suaves) =====
  var CHORDS = [[50, 54, 57, 61], [47, 50, 54, 57], [43, 47, 50, 54], [45, 49, 52, 55], [50, 54, 57, 61], [52, 55, 59, 62], [43, 47, 50, 54], [45, 49, 52, 57]];
  var MEL = [62, 64, 66, 69, 71, 74, 76, 78];
  var BAR = 8;
  function mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function pad(t, notes, len) {
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650 + tension * 900; lp.Q.value = 0.4 + tension * 2;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; var lg = ctx.createGain(); lg.gain.value = 260;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t); lfo.stop(t + len + 3.2);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 2.5);
    g.gain.setValueAtTime(0.022, t + len - 0.5); g.gain.linearRampToValueAtTime(0.0001, t + len + 3);
    lp.connect(g); g.connect(mus);
    var s2 = ctx.createGain(); s2.gain.value = 0.7; g.connect(s2); s2.connect(verbIn);
    notes.forEach(function (n) {
      [[-5, 'sine'], [5, 'triangle']].forEach(function (o) {
        var osc = ctx.createOscillator(); osc.type = o[1]; osc.frequency.value = mtof(n); osc.detune.value = o[0];
        osc.connect(lp); osc.start(t); osc.stop(t + len + 3.1);
      });
    });
  }
  function epiano(t, note, vel) {
    var f = mtof(note);
    var car = ctx.createOscillator(); car.frequency.value = f;
    var mod = ctx.createOscillator(); mod.frequency.value = f;
    var mi = ctx.createGain(); mi.gain.setValueAtTime(f * 1.2 * vel, t); mi.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.2);
    mod.connect(mi); mi.connect(car.frequency);
    var a = ctx.createGain(); a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(0.05 * vel, t + 0.006); a.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    var tine = ctx.createOscillator(); tine.frequency.value = f * 4.01;
    var tg = ctx.createGain(); tg.gain.setValueAtTime(0.0001, t); tg.gain.exponentialRampToValueAtTime(0.008 * vel, t + 0.003); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    car.connect(a); tine.connect(tg); a.connect(mus); tg.connect(mus);
    var s2 = ctx.createGain(); s2.gain.value = 0.8; a.connect(s2); s2.connect(verbIn);
    [car, mod, tine].forEach(function (o) { o.start(t); o.stop(t + 3.3); });
  }
  // ===== Xadrez Vivo: drones graves, coro distante e tambor no salao de pedra =====
  var style = 'normal', hallVerb = null, hallIn = null;
  var HALL = [[38, 45, 50, 53], [36, 43, 48, 52], [34, 41, 46, 50], [33, 40, 45, 49]];
  function hallBus() {
    if (hallIn) return hallIn;
    hallVerb = ctx.createConvolver(); hallVerb.buffer = impulse(6);
    hallIn = ctx.createGain(); hallIn.gain.value = 1; var out = ctx.createGain(); out.gain.value = 0.7;
    hallIn.connect(hallVerb); hallVerb.connect(out); out.connect(mus);
    return hallIn;
  }
  function hallBar(t) {
    var ch = HALL[bar % HALL.length], hb = hallBus(), L = BAR * 1.5;
    // drone grave (serra filtrada)
    [ch[0] - 12, ch[0]].forEach(function (n, i) {
      var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = i ? 6 : -4;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160 + tension * 260;
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 3); g.gain.setValueAtTime(0.03, t + L - 1); g.gain.linearRampToValueAtTime(0.0001, t + L + 2);
      o.connect(lp); lp.connect(g); g.connect(mus); var s2 = ctx.createGain(); s2.gain.value = 0.4; g.connect(s2); s2.connect(hb);
      o.start(t); o.stop(t + L + 2.1);
    });
    // coro: senos suaves com vibrato lento, so no eco
    ch.slice(1).forEach(function (n, i) {
      var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(n + 12);
      var v = ctx.createOscillator(); v.frequency.value = 4.5 + i * 0.3; var vg = ctx.createGain(); vg.gain.value = 3; v.connect(vg); vg.connect(o.detune);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + 1 + i * 0.6); g.gain.linearRampToValueAtTime(0.012, t + 4 + i * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + L + 1);
      o.connect(g); g.connect(hb); o.start(t); v.start(t); o.stop(t + L + 1.2); v.stop(t + L + 1.2);
    });
    // tambor distante
    for (var k = 0; k < 3; k++) if (Math.random() < 0.7) { var tt = t + 1.5 + k * 3.6 + Math.random() * 0.3;
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(80, tt); o.frequency.exponentialRampToValueAtTime(38, tt + 0.5);
      var g = ctx.createGain(); env(g, tt, 0.12 + tension * 0.1, 0.01, 0.8); o.connect(g); g.connect(hb); g.connect(mus); o.start(tt); o.stop(tt + 1); }
    // sino grave de vez em quando
    if (Math.random() < 0.5) bell(t + 5 + Math.random() * 3, mtof(ch[2] + 12), 0.05, 3.5, 1);
    bar++;
    return L;
  }
  function scheduleBar(t) {
    if (style === 'vivo') return hallBar(t);
    var ch = CHORDS[bar % CHORDS.length];
    pad(t, ch, BAR);
    var bass = ctx.createOscillator(); bass.type = 'sine'; bass.frequency.value = mtof(ch[0] - 12);
    var bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.05, t + 1.5); bg.gain.linearRampToValueAtTime(0.0001, t + BAR + 1);
    bass.connect(bg); bg.connect(mus); bass.start(t); bass.stop(t + BAR + 1.1);
    // acorde dedilhado devagar
    ch.forEach(function (n, i) { epiano(t + 0.05 + i * 0.12, n + 12, 0.55 + Math.random() * 0.2); });
    // melodia esparsa
    for (var k = 2; k < BAR; k += 1) {
      if (Math.random() < 0.28) epiano(t + k + Math.random() * 0.08, MEL[Math.floor(Math.random() * MEL.length)], 0.45 + Math.random() * 0.3);
    }
    bar++;
  }
  function startMusic() {
    if (!ctx || timer) return;
    mus.gain.cancelScheduledValues(ctx.currentTime);
    mus.gain.setValueAtTime(mus.gain.value, ctx.currentTime);
    mus.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 3);
    nextBar = Math.max(nextBar, ctx.currentTime + 0.1);
    timer = setInterval(function () {
      if (!ctx || ctx.state !== 'running') return;
      while (nextBar < ctx.currentTime + 1.5) { var len = scheduleBar(nextBar); nextBar += len || BAR; }
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
    // 0 = calmo, 1 = perigo maximo (xeque, relogio no fim)
    // 'normal' ou 'vivo' (salao de pedra); troca na proxima frase musical
    setStyle: function (s) { style = s === 'vivo' ? 'vivo' : 'normal'; },
    setTension: function (x) { tTarget = Math.max(0, Math.min(1, x || 0)); },
    get sfxOn() { return sfxOn; }, get musicOn() { return musOn; }
  };
})();
