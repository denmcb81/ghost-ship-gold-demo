/* Ghost Ship Gold – UI layer (Horde Games demo). DEMO credits only, no real money.
 * All outcomes come from engine.js (seeded RNG); this file only presents them and moves demo credits. */
(function () {
  'use strict';
  const E = window.GhostEngine, C = E.CONFIG, S = C.symbols, FS = C.freeSpins, H = C.hold;
  const $ = id => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const seed = qs.has('seed') ? (parseInt(qs.get('seed'), 10) >>> 0) : (Date.now() >>> 0);
  const rng = E.makeRng(seed);
  if (qs.has('rtp')) E.setVariant(qs.get('rtp'));              // operator RTP variant: ?rtp=96|94|92
  if (qs.get('bonusbuy') === '1') C.bonusBuy.enabled = true;   // demo switch for non-GB markets only (off by default)
  $('seedTxt').textContent = 'Seed ' + seed + '. RTP ' + C.variants[C.rtpVariant].label + '.';
  // Horde Games network jackpot (shared module, unchanged). Own RNG stream so the slot maths sequence is untouched.
  const JPM = window.HordeJackpot;
  const jp = JPM ? JPM.create({ gameId: 'ghost-ship-gold' }) : null;
  const jrng = E.makeRng((seed ^ 0x4a5c3b1d) >>> 0);

  const IMG = id => `assets/sym/${id}.webp`;
  const COIN_IMG = { coin: 'COIN', collector: 'COLLECT', multiplier: 'MULT', upgrade: 'UPGRADE' };
  ['CAPTAIN', 'SIREN', 'SKELETON', 'PARROT', 'RUM', 'COMPASS', 'ANCHOR', 'PISTOL', 'WILD', 'SCATTER', 'COIN', 'COLLECT', 'MULT', 'UPGRADE'].forEach(id => { const i = new Image(); i.src = IMG(id); });
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = { balance: C.startBalance, betIdx: C.defaultBetIndex, busy: false, auto: false, turbo: false, mode: 'base',
                  grid: E.drawGrid(E.makeRng(seed ^ 0x5eed), 'base'), vals: null, forced: [], forcedHold: [], forcedShip: null, forcedJp: null };
  state.vals = state.grid.map(col => col.map(() => [1, 2, 3, 5][(Math.random() * 4) | 0]));
  const bet = () => C.bets[state.betIdx];
  const r2 = x => Math.round(x * 100 + 1e-7) / 100;
  const fmt = n => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtC = n => (n >= 10000 ? (n / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 }) + 'K' : n >= 1000 ? Math.round(n).toLocaleString('en-GB') : fmt(n));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const T = ms => (state.turbo ? Math.round(ms * 0.45) : ms);
  const msg = h => { $('msg').innerHTML = h; };
  const icon = id => `<img src="${IMG(id)}" alt="${S[id] ? S[id].name : id}">`;

  // ---------- audio: ElevenLabs-generated files (assets/audio) + tiny synth ticks ----------
  const PREF = (() => { try { return JSON.parse(localStorage.getItem('gsgAudio') || '{}'); } catch (e) { return {}; } })();
  state.music = PREF.music !== false; state.sound = PREF.sfx !== false;
  const savePref = () => { try { localStorage.setItem('gsgAudio', JSON.stringify({ music: state.music, sfx: state.sound })); } catch (e) { /* private mode */ } };
  const AUDIO_FILES = ['music_base', 'music_free', 'music_hold', 'bigwin', 'kraken', 'coin', 'laugh', 'reel_stop', 'whoosh', 'cannon', 'win_small', 'chest', 'heartbeat', 'scream'];
  const A = { ctx: null, buf: {}, el: {}, loaded: 0, failed: 0, mode: 'none', music: null, musicKey: 'music_base', master: null, mGain: null, sGain: null, hb: null, last: {} };
  const audioSrc = k => `assets/audio/${k}.mp3`;
  function markAudio() { document.body.dataset.audio = `${A.mode}:${A.loaded}/${AUDIO_FILES.length}${A.failed ? ' failed:' + A.failed : ''}`; }
  function unlockAudio() {
    if (A.ctx || A.mode === 'html') return;
    const AC = window.AudioContext || window.webkitAudioContext;
    const viaHtml = () => {
      A.mode = 'html';
      AUDIO_FILES.forEach(k => { if (A.buf[k]) return; const e = new Audio(audioSrc(k)); e.preload = 'auto'; A.el[k] = e;
        e.addEventListener('canplaythrough', () => { if (!e._ok) { e._ok = 1; A.loaded++; markAudio(); if (k === A.musicKey) startMusic(k); } }, { once: true });
        e.addEventListener('error', () => { A.failed++; markAudio(); }, { once: true }); e.load(); });
    };
    if (!AC) return viaHtml();
    A.ctx = new AC(); A.mode = 'webaudio';
    A.master = A.ctx.createGain(); A.master.connect(A.ctx.destination);
    A.mGain = A.ctx.createGain(); A.mGain.gain.value = 0; A.mGain.connect(A.master);
    A.sGain = A.ctx.createGain(); A.sGain.gain.value = 0.9; A.sGain.connect(A.master);
    if (A.ctx.state === 'suspended') A.ctx.resume();
    if (location.protocol === 'file:') return viaHtml();
    let fellBack = false;
    AUDIO_FILES.forEach(k => fetch(audioSrc(k)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => A.ctx.decodeAudioData(ab, res, rej)))
      .then(bf => { A.buf[k] = bf; A.loaded++; markAudio(); if (k === A.musicKey) startMusic(k); })
      .catch(() => { if (!fellBack) { fellBack = true; A.loaded = 0; A.buf = {}; viaHtml(); } }));
    markAudio();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlockAudio, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (A.ctx) (document.hidden ? A.ctx.suspend() : A.ctx.resume()); if (A.mode === 'html' && A.music) (document.hidden ? A.music.pause() : state.music && A.music.play().catch(() => {})); });
  function snd(k, o = {}) {
    if (!state.sound) return;
    const vol = o.vol == null ? 1 : o.vol, rate = o.rate || 1;
    if (o.gap) { const n = performance.now(); if (n - (A.last[k] || -1e9) < o.gap) return; A.last[k] = n; }
    if (A.buf[k]) {
      const s = A.ctx.createBufferSource(), g = A.ctx.createGain();
      s.buffer = A.buf[k]; s.playbackRate.value = rate; g.gain.value = vol;
      s.connect(g).connect(A.sGain); s.start(A.ctx.currentTime + (o.delay || 0));
      return s;
    }
    if (A.el[k]) { const e = A.el[k].cloneNode(); e.volume = Math.min(1, vol * 0.9); e.playbackRate = rate; e.play().catch(() => {}); return e; }
  }
  const MUSIC_VOL = 0.4;
  function startMusic(k) {
    A.musicKey = k;
    if (!state.music) return;
    if (A.mode === 'webaudio') {
      if (!A.buf[k]) return;
      if (A.music && A.music._k === k) return;
      const t = A.ctx.currentTime;
      if (A.music) { const old = A.music; old._g.gain.cancelScheduledValues(t); old._g.gain.setValueAtTime(old._g.gain.value, t); old._g.gain.linearRampToValueAtTime(0, t + 0.8); old.stop(t + 0.85); }
      const s = A.ctx.createBufferSource(), g = A.ctx.createGain();
      s.buffer = A.buf[k]; s.loop = true; s.loopStart = 0.03; s.loopEnd = A.buf[k].duration - 0.6;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.8);
      s.connect(g).connect(A.mGain); s.start(t, 0.03); s._k = k; s._g = g; A.music = s;
      A.mGain.gain.cancelScheduledValues(t); A.mGain.gain.setValueAtTime(A.mGain.gain.value, t); A.mGain.gain.linearRampToValueAtTime(MUSIC_VOL, t + 0.8);
    } else if (A.mode === 'html') {
      const e = A.el[k]; if (!e) return;
      if (A.music && A.music !== e) A.music.pause();
      e.loop = true; e.volume = MUSIC_VOL; A.music = e; e.play().catch(() => {});
    }
  }
  function stopMusic() {
    if (!A.music) return;
    if (A.mode === 'webaudio') { const t = A.ctx.currentTime, m = A.music; m._g.gain.setValueAtTime(m._g.gain.value, t); m._g.gain.linearRampToValueAtTime(0, t + 0.4); m.stop(t + 0.45); }
    else A.music.pause();
    A.music = null;
  }
  function duck(on) {
    if (A.mode === 'webaudio' && A.mGain) { const t = A.ctx.currentTime; A.mGain.gain.cancelScheduledValues(t); A.mGain.gain.setValueAtTime(A.mGain.gain.value, t); A.mGain.gain.linearRampToValueAtTime(on ? 0.1 : MUSIC_VOL, t + 0.3); }
    else if (A.music) A.music.volume = on ? 0.1 : MUSIC_VOL;
  }
  function heartbeat(ms) {
    if (!state.sound || A.hb) return;
    if (A.buf.heartbeat) {
      const s = A.ctx.createBufferSource(), g = A.ctx.createGain(), t = A.ctx.currentTime;
      s.buffer = A.buf.heartbeat; s.loop = true; s.loopStart = 0.02; s.loopEnd = A.buf.heartbeat.duration - 0.02;
      s.playbackRate.setValueAtTime(1, t); s.playbackRate.linearRampToValueAtTime(1.8, t + ms / 1000);
      g.gain.setValueAtTime(0.35, t); g.gain.linearRampToValueAtTime(1, t + ms / 1000);
      s.connect(g).connect(A.sGain); s.start(t); s._g = g; A.hb = s; duck(true);
    } else if (A.el.heartbeat) { const e = A.el.heartbeat; e.loop = true; e.playbackRate = 1.3; e.currentTime = 0; e.play().catch(() => {}); A.hb = e; }
  }
  function heartbeatStop() {
    if (!A.hb) return;
    if (A.hb.stop) { const t = A.ctx.currentTime; A.hb._g.gain.setValueAtTime(A.hb._g.gain.value, t); A.hb._g.gain.linearRampToValueAtTime(0, t + 0.25); A.hb.stop(t + 0.3); duck(false); }
    else A.hb.pause();
    A.hb = null;
  }
  function tone(freq, dur, type = 'sine', vol = 0.05, slide = 0) {
    if (!state.sound || !A.ctx) return;
    const o = A.ctx.createOscillator(), g = A.ctx.createGain(), t = A.ctx.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(A.sGain); o.start(t); o.stop(t + dur + 0.02);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sfx = {
    stop: () => snd('reel_stop', { vol: 0.5, rate: rnd(0.95, 1.08), gap: 40 }),
    coin: (v = 0.8, rate = 1) => snd('coin', { vol: v, rate: rate * rnd(0.97, 1.05), gap: 50 }),
    bottle: () => { snd('chest', { vol: 0.8, rate: 1.4 }); tone(880, 0.25, 'triangle', 0.04, 440); },
    tick: () => tone(1500, 0.025, 'square', 0.012),
    win: x => { if (x >= 5) snd('bigwin', { vol: 0.75 }); else snd('win_small', { vol: x >= 1 ? 0.9 : 0.55, rate: x >= 1 ? 1 : 1.15 }); },
    whoosh: (v = 0.7) => snd('whoosh', { vol: v, rate: rnd(0.9, 1.1), gap: 60 }),
    cannon: (v = 0.9, rate = 1) => snd('cannon', { vol: v, rate }),
    kraken: () => { snd('kraken', { vol: 1, rate: 0.8 }); snd('cannon', { vol: 0.8, rate: 0.55, delay: 0.05 }); },
    laugh: () => snd('laugh', { vol: 1 }),
    scream: () => snd('scream', { vol: 1 }),
    fanfare: (v = 1) => snd('bigwin', { vol: v }),
    thunder: () => snd('cannon', { vol: 0.22, rate: 0.45 }),
    up: i => tone(520 + i * 70, 0.12, 'triangle', 0.05, 200),
  };

  // ---------- layout ----------
  let cell = 96, gapPx = 5;
  const pitch = () => cell + gapPx;
  function layout() {
    gapPx = window.innerWidth < 420 ? 4 : 5;
    const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    const w = Math.min(vw, 820) - 20 - 36 - gapPx * 4;
    const phone = vw <= 520;
    const reserved = (phone ? 330 : 300) + (state.mode !== 'base' ? 60 : 0);
    const h = window.innerHeight - reserved - gapPx * 3;
    cell = Math.max(48, Math.floor(Math.min(136, w / 5, h / 4)));
    document.documentElement.style.setProperty('--cell', cell + 'px');
    document.documentElement.style.setProperty('--gap', gapPx + 'px');
    for (let i = 0; i < 4; i++) {
      const over = $('app').scrollHeight - window.innerHeight;
      if (over <= 2 || cell <= 48) break;
      cell = Math.max(48, cell - Math.ceil(over / 4) - 1);
      document.documentElement.style.setProperty('--cell', cell + 'px');
    }
    placeGhosts(true);
  }

  // ---------- grid rendering ----------
  const gridEl = $('grid');
  const reels = [];
  const visualIds = ['CAPTAIN', 'SIREN', 'SKELETON', 'PARROT', 'RUM', 'COMPASS', 'ANCHOR', 'PISTOL', 'WILD', 'SCATTER', 'COIN', 'RUM', 'COMPASS', 'ANCHOR', 'PISTOL'];
  const randSym = () => visualIds[(Math.random() * visualIds.length) | 0];
  const randVal = () => [1, 1, 2, 2, 3, 5, 8, 10][(Math.random() * 8) | 0];
  function cvHtml(c) {
    if (c.type === 'collector') return c.value ? `<span class="cv">${fmtC(c.value * bet())}</span>` : '<span class="cv sp">COLLECT</span>';
    if (c.type === 'multiplier') return '<span class="cv sp">×2</span>';
    if (c.type === 'upgrade') return '<span class="cv sp">UP</span>';
    return `<span class="cv">${fmtC(c.value * bet())}</span>`;
  }
  // sym: symbol id; val: coin value (x bet) for COIN; hold: {type,value} board coin or 'empty'
  function makeCell(sym, val, hold) {
    const d = document.createElement('div');
    d.style.setProperty('--i', (Math.random() * 9) | 0);
    if (hold === 'empty') { d.className = 'cell empty'; return d; }
    if (hold) {
      const id = COIN_IMG[hold.type];
      d.className = 'cell locked s-' + id; d.dataset.sym = id;
      d.innerHTML = `<img src="${IMG(id)}" alt="">${cvHtml(hold)}`;
      return d;
    }
    d.className = 'cell s-' + sym + ' k-' + S[sym].kind; d.dataset.sym = sym;
    d.innerHTML = `<img src="${IMG(sym)}" alt="${S[sym].name}">` + (sym === 'COIN' ? `<span class="cv">${fmtC((val || 1) * bet())}</span>` : '');
    return d;
  }
  const setY = (el, y) => el.style.setProperty('--t', `translateY(${y}px)`);
  function buildReels() {
    gridEl.innerHTML = ''; reels.length = 0;
    for (let r = 0; r < C.reels; r++) {
      const reel = document.createElement('div'); reel.className = 'reel';
      const strip = document.createElement('div'); strip.className = 'strip';
      reel.appendChild(strip); gridEl.appendChild(reel);
      reels.push({ reel, strip, cells: [] });
      if (state.mode === 'hold' && hold.st) renderHoldReel(r); else renderReel(r, state.grid[r], state.vals[r]);
    }
  }
  function renderReel(r, col, vals) {
    const R = reels[r];
    R.strip.innerHTML = ''; R.strip.style.transition = 'none'; R.strip.style.transform = 'none';
    R.cells.forEach(c => c && c.remove());
    R.cells = col.map((s, k) => { const c = makeCell(s, vals ? vals[k] : 1); setY(c, k * pitch()); R.reel.appendChild(c); return c; });
  }
  function setCell(r, k, el) { const R = reels[r]; if (R.cells[k]) R.cells[k].remove(); setY(el, k * pitch()); R.reel.appendChild(el); R.cells[k] = el; return el; }
  const cellEl = (r, k) => reels[r].cells[k];

  function spinReels(grid, vals, o = {}) {
    clearHighlights();
    const p = pitch(), fast = state.turbo, prev = state.grid, prevV = state.vals;
    state.grid = grid.map(c => c.slice()); state.vals = vals.map(c => c.slice());
    let sc = 0, coins = 0, extra = 0;
    const promises = [];
    for (let r = 0; r < C.reels; r++) {
      const anticSc = sc >= 2, anticCoin = !anticSc && coins >= 4 && r >= 2;
      const anticip = o.antic !== false && (anticSc || anticCoin);
      if (anticip) extra += fast ? 380 : 950;
      const filler = (fast ? 6 : 12) + r * (fast ? 2 : 4) + (anticip ? (fast ? 6 : 14) : 0);
      const syms = grid[r].map((s, k) => [s, vals[r][k]]);
      for (let i = 0; i < filler; i++) syms.push([randSym(), randVal()]);
      prev[r].forEach((s, k) => syms.push([s, prevV[r][k]]));
      const R = reels[r];
      R.cells.forEach(c => c.remove()); R.cells = [];
      R.strip.style.transition = 'none'; R.strip.innerHTML = '';
      syms.forEach(([s, v]) => R.strip.appendChild(makeCell(s, v)));
      R.strip.style.transform = `translateY(${-(filler + 4) * p}px)`;
      void R.strip.offsetHeight;
      const dur = (fast ? 260 + r * 70 : 560 + r * 150) + extra;
      R.strip.style.transition = `transform ${dur}ms cubic-bezier(.35,.05,.3,1.06)`;
      R.strip.style.transform = 'translateY(0)';
      if (anticip) setTimeout(() => { R.reel.classList.add('anticip'); if (anticCoin) R.reel.classList.add('gold'); heartbeat(fast ? 380 : 950 * (C.reels - r)); }, Math.max(0, dur - (fast ? 380 : 950)));
      promises.push(new Promise(res => setTimeout(() => {
        R.reel.classList.remove('anticip', 'gold');
        renderReel(r, grid[r], vals[r]);
        landFx(R.cells);
        sfx.stop();
        grid[r].forEach((s, k) => {
          if (s === 'SCATTER') { cellEl(r, k).classList.add('glowsc'); sfx.bottle(); }
          if (s === 'COIN') { cellEl(r, k).classList.add('coinland'); sfx.coin(0.7); }
        });
        res();
      }, dur + 30)));
      sc += grid[r].filter(s => s === 'SCATTER').length;
      coins += grid[r].filter(s => s === 'COIN').length;
    }
    return Promise.all(promises).then(() => heartbeatStop());
  }
  function clearHighlights() { gridEl.classList.remove('dim'); gridEl.querySelectorAll('.hit').forEach(e => e.classList.remove('hit')); }
  function highlight(cells) { gridEl.classList.add('dim'); cells.forEach(([r, k]) => cellEl(r, k).classList.add('hit')); }
  function landFx(cells) {
    if (REDUCED) return;
    cells.forEach(c => { c.classList.remove('land'); void c.offsetWidth; c.classList.add('land'); });
    setTimeout(() => cells.forEach(c => c.classList.remove('land')), 360);
  }
  function centerOf(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function burstAt(x, y, color, n = 16) {
    if (REDUCED) return;
    const fx = $('fx'), fr = fx.getBoundingClientRect(), cx = x - fr.left, cy = y - fr.top;
    const sh = document.createElement('div'); sh.className = 'shock'; sh.style.left = cx + 'px'; sh.style.top = cy + 'px'; sh.style.borderColor = color; fx.appendChild(sh);
    sh.animate([{ width: '10px', height: '10px', opacity: 1 }, { width: cell * 1.6 + 'px', height: cell * 1.6 + 'px', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.4,1)' }).onfinish = () => sh.remove();
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div'); s.className = 'spark';
      s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.background = color; s.style.boxShadow = `0 0 8px ${color}`;
      fx.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = cell * rnd(0.4, 1.1);
      s.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d - 4}px,${Math.sin(a) * d + 20}px) scale(.2)`, opacity: 0 }], { duration: rnd(450, 800), easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => s.remove();
    }
  }
  const burst = (el, color, n) => { if (!el) return; const [x, y] = centerOf(el); burstAt(x, y, color, n); };
  function flash(cls) { const f = $('flash'); f.className = ''; void f.offsetWidth; f.className = 'on' + (cls ? ' ' + cls : ''); }
  function shake(el = $('frame')) { if (REDUCED) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 520); }
  function toast(text, cls) { const t = $('toast'); t.className = 'toast' + (cls ? ' ' + cls : ''); t.innerHTML = text; void t.offsetWidth; t.classList.remove('hidden'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hidden'), 1600); }
  async function splash(t1, t2, cls, ms = 1500) { const s = $('splash'); $('splashT1').textContent = t1; $('splashT2').textContent = t2; s.className = 'splash' + (cls ? ' ' + cls : ''); await sleep(T(ms)); s.classList.add('hidden'); }

  // ---------- HUD ----------
  function updateHUD() {
    $('balance').textContent = fmt(state.balance);
    $('bet').textContent = fmt(bet());
    $('betDown').disabled = state.busy || state.betIdx === 0; $('betUp').disabled = state.busy || state.betIdx === C.bets.length - 1;
    $('btnSpin').classList.toggle('busy', state.busy && !state.auto); $('btnSpin').classList.toggle('auto', state.auto);
    $('btnSpin').querySelector('span').textContent = state.auto ? 'STOP' : 'SPIN';
    $('btnAuto').classList.toggle('on', state.auto); $('btnTurbo').classList.toggle('on', state.turbo);
    $('btnMusic').classList.toggle('off', !state.music); $('btnSfx').classList.toggle('off', !state.sound);
    $('btnBuy').classList.toggle('hidden', !C.bonusBuy.enabled); $('btnBuy').disabled = state.busy;
  }
  function countUp(el, from, to, ms) {
    return new Promise(res => {
      const t0 = performance.now(); let lastTick = 0; const id = (el._cu = (el._cu || 0) + 1);
      const step = now => {
        if (el._cu !== id) return res();
        const k = Math.min(1, (now - t0) / ms), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
        el.textContent = fmt(v);
        if (now - lastTick > 70) { sfx.tick(); lastTick = now; }
        if (k < 1) requestAnimationFrame(step); else { el.textContent = fmt(to); res(); }
      };
      if (ms <= 0) { el.textContent = fmt(to); return res(); }
      requestAnimationFrame(step);
    });
  }
  function banner(html) { const b = $('winBanner'); b.innerHTML = html; b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
  function shower(n) {
    if (REDUCED) return;
    const box = $('shower');
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div'); c.className = 'gcoin';
      c.style.left = rnd(-5, 100) + 'vw'; c.style.setProperty('--dx', rnd(-20, 20) + 'vw'); c.style.setProperty('--rot', rnd(-360, 360) + 'deg');
      const s = rnd(28, 58); c.style.width = c.style.height = s + 'px';
      c.style.animationDuration = rnd(1.6, 3.2) + 's'; c.style.animationDelay = rnd(0, 1.4) + 's';
      box.appendChild(c); setTimeout(() => c.remove(), 5000);
    }
  }
  const TIERS = [[500, 'LEGENDARY WIN', 't4'], [150, 'EPIC WIN', 't3'], [50, 'MEGA WIN', 't2'], [20, 'BIG WIN', '']];
  async function bigWin(amount, x) {
    const t = TIERS.find(t => x >= t[0]); if (!t) return;
    const ov = $('ovBig'); $('bigTitle').textContent = t[1]; $('bigTitle').className = t[2];
    $('bigAmt').textContent = fmt(0); ov.classList.remove('hidden');
    sfx.fanfare(1); shower(t[2] === 't4' ? 90 : t[2] === 't3' ? 70 : 40); flash('gold');
    await countUp($('bigAmt'), 0, amount, T(Math.min(4200, 1500 + x * 8)));
    await sleep(T(1100));
    ov.classList.add('hidden');
  }

  // ---------- ambience ----------
  function wisp() {
    if (REDUCED || document.hidden) return;
    const w = document.createElement('div'); w.className = 'wisp';
    w.style.left = rnd(0, 100) + 'vw'; w.style.setProperty('--dx', rnd(-80, 80) + 'px');
    w.style.animationDuration = rnd(7, 13) + 's'; const s = rnd(3, 8); w.style.width = w.style.height = s + 'px';
    if (state.mode === 'hold') { w.style.background = 'var(--gold)'; w.style.boxShadow = '0 0 10px 3px var(--gold)'; }
    $('wisps').appendChild(w); setTimeout(() => w.remove(), 14000);
  }
  setInterval(wisp, 900);
  (function lightning() { setTimeout(() => { if (!REDUCED && state.mode !== 'hold' && !document.hidden) { const b = $('bolt'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); sfx.thunder(); } lightning(); }, rnd(9000, 22000)); })();

  // ---------- wins ----------
  async function presentWins(wins, amount, x, label) {
    if (!wins.length) return;
    const all = []; wins.forEach(w => w.cells.forEach(c => { if (!all.some(a => a[0] === c[0] && a[1] === c[1])) all.push(c); }));
    highlight(all);
    sfx.win(x);
    wins.slice(0, 6).forEach((w, i) => setTimeout(() => { const c = w.cells[w.cells.length - 1]; burst(cellEl(c[0], c[1]), '#62ffb4', 10); }, i * 90));
    banner(`${label} ${fmt(amount)}`);
    await sleep(T(x >= 5 ? 1100 : 750));
    if (wins.length > 1 && !state.turbo && !state.auto) {
      for (const w of wins.slice(0, 4)) {
        clearHighlights(); highlight(w.cells);
        banner(`${icon(w.sym)} ${w.reels} of a kind · ${w.ways} way${w.ways > 1 ? 's' : ''}${w.factor !== w.ways ? ' · ghost ×' + Math.round(w.factor / w.ways * 10) / 10 : ''} · ${fmt(w.pay * bet())}`);
        await sleep(650);
      }
      clearHighlights(); highlight(all);
      banner(`${label} ${fmt(amount)}`);
    }
  }

  // ---------- Kraken Attack ----------
  function krakenTease() {
    $('stage').classList.add('kraken'); sfx.kraken(); flash('purple'); shake();
    toast('KRAKEN ATTACK!', 'purple');
  }
  async function krakenSmash(spots) {
    const tl = $('tentacles'), p = pitch();
    for (let i = 0; i < spots.length; i++) {
      const [r, k] = spots[i];
      const t = document.createElement('div'); t.className = 'tent';
      t.style.left = (r * p + cell * 0.02) + 'px'; t.style.top = (k * p - cell * 0.15) + 'px';
      const flip = i % 2 ? ' scaleX(-1)' : '';
      t.style.transform = 'translateY(110%)' + flip;
      tl.appendChild(t);
      if (!REDUCED) await t.animate([{ transform: `translateY(110%)${flip}`, opacity: 0 }, { transform: `translateY(-6%)${flip}`, opacity: 1, offset: 0.7 }, { transform: `translateY(4%) scaleY(.92)${flip}`, opacity: 1 }], { duration: T(420), easing: 'cubic-bezier(.3,.1,.3,1.2)', fill: 'forwards' }).finished;
      sfx.cannon(0.8, rnd(0.9, 1.15)); shake();
      const el = setCell(r, k, makeCell('WILD'));
      el.classList.add('wildin'); burst(el, '#c06bff', 20); burst(el, '#9fe8ff', 8);
      state.grid[r][k] = 'WILD';
      if (!REDUCED) {
        const rect = el.getBoundingClientRect(), fr = $('fx').getBoundingClientRect();
        const ring = document.createElement('div'); ring.className = 'splash-ring'; ring.style.left = (rect.left - fr.left + rect.width / 2) + 'px'; ring.style.top = (rect.top - fr.top + rect.height / 2) + 'px'; $('fx').appendChild(ring);
        ring.animate([{ width: '10px', height: '10px', opacity: 1 }, { width: cell * 2 + 'px', height: cell * 2 + 'px', opacity: 0 }], { duration: 600 }).onfinish = () => ring.remove();
      }
      await sleep(T(160));
      if (REDUCED) t.remove();
      else t.animate([{ transform: `translateY(4%)${flip}`, opacity: 1 }, { transform: `translateY(115%)${flip}`, opacity: 0.2 }], { duration: T(380), easing: 'ease-in', fill: 'forwards' }).onfinish = () => t.remove();
    }
    await sleep(T(300));
    $('stage').classList.remove('kraken');
  }

  // ---------- cinematics / helpers ----------
  async function cinematic(kind, t1, t2, t3, art, ms = 2300) {
    const c = $('cine'); c.className = kind || '';
    $('cineT1').textContent = t1; $('cineT2').textContent = t2; $('cineT3').textContent = t3;
    const a = $('cineArt'); a.src = art; a.style.animation = 'none'; void a.offsetWidth; a.style.animation = '';
    c.classList.remove('hidden');
    await sleep(T(ms));
    c.classList.add('hidden');
  }
  function waitClick(btnId, autoMs) {
    return new Promise(res => {
      const b = $(btnId); let done = false;
      const f = () => { if (done) return; done = true; b.removeEventListener('click', f); res(); };
      b.addEventListener('click', f);
      if (autoMs) setTimeout(f, autoMs);
    });
  }
  function waitChoice(ids, autoMs, autoId) {
    return new Promise(res => {
      let done = false; const hs = [];
      const fin = id => { if (done) return; done = true; hs.forEach(([b, f]) => b.removeEventListener('click', f)); res(id); };
      ids.forEach(id => { const b = $(id), f = () => fin(id); b.addEventListener('click', f); hs.push([b, f]); });
      if (autoMs) setTimeout(() => fin(autoId || ids[0]), autoMs);
    });
  }
  function setMode(m) {
    state.mode = m;
    document.body.classList.remove('mode-base', 'mode-free', 'mode-hold'); document.body.classList.add('mode-' + m);
    $('fsBar').classList.toggle('hidden', m !== 'free'); $('hwBar').classList.toggle('hidden', m !== 'hold');
    startMusic(m === 'free' ? 'music_free' : m === 'hold' ? 'music_hold' : 'music_base');
    layout();
  }
  async function flyTo(fromEl, toEl, img, ms = 600) {
    if (REDUCED || !fromEl || !toEl) return;
    const [x0, y0] = centerOf(fromEl), [x1, y1] = centerOf(toEl);
    const f = document.createElement('div'); f.className = 'fly'; f.style.backgroundImage = `url(${img})`;
    f.style.left = (x0 - 21) + 'px'; f.style.top = (y0 - 21) + 'px'; document.body.appendChild(f);
    await f.animate([{ transform: 'translate(0,0) scale(1.2)' }, { transform: `translate(${(x1 - x0) / 2}px,${(y1 - y0) / 2 - 60}px) scale(1)`, offset: 0.5 }, { transform: `translate(${x1 - x0}px,${y1 - y0}px) scale(.6)` }], { duration: T(ms), easing: 'ease-in-out' }).finished;
    f.remove();
  }

  // ---------- Free Spins with walking ghost wilds ----------
  const ghosts = [];   // {r,k,el}
  const ghostXY = (r, k) => `translate(${r * pitch()}px,${k * pitch()}px)`;
  function placeGhosts(instant) { ghosts.forEach(g => { if (instant) g.el.style.transition = 'none'; g.el.style.transform = ghostXY(g.r, g.k); if (instant) { void g.el.offsetWidth; g.el.style.transition = ''; } }); }
  function addGhost(r, k, mult) {
    const el = document.createElement('div'); el.className = 'ghost new';
    el.innerHTML = `<img src="${IMG('WILD')}" alt="Ghost wild"><b>×${mult}</b>`;
    el.style.transform = ghostXY(r, k); $('ghosts').appendChild(el);
    setTimeout(() => el.classList.remove('new'), 900);
    ghosts.push({ r, k, el });
  }
  function clearGhosts() { ghosts.forEach(g => g.el.remove()); ghosts.length = 0; }
  async function moveGhosts() {
    if (!ghosts.length) return;
    const keep = [];
    ghosts.forEach(g => {
      if (g.r - 1 < 0) { g.el.classList.add('bye'); g.el.style.transform = `translate(${-pitch()}px,${g.k * pitch()}px)`; setTimeout(() => g.el.remove(), 600); }
      else { g.r -= 1; g.el.classList.remove('trail'); void g.el.offsetWidth; g.el.classList.add('trail'); g.el.style.transform = ghostXY(g.r, g.k); keep.push(g); }
    });
    ghosts.length = 0; keep.forEach(g => ghosts.push(g));
    sfx.whoosh(0.6);
    await sleep(T(560));
  }
  function setGhostMult(m) { ghosts.forEach(g => { g.el.querySelector('b').textContent = '×' + m; g.el.classList.remove('up'); void g.el.offsetWidth; g.el.classList.add('up'); }); }
  function drawFsBar(st) {
    $('fsLeft').textContent = st.left; $('fsMult').textContent = '×' + st.mult; $('fsShip').textContent = FS.ships[st.ship].name;
    [...$('fsMeter').children].forEach((b, i) => b.classList.toggle('on', i < st.meter));
  }
  async function pickShip() {
    const ov = $('ovShips'); ov.classList.remove('hidden');
    [0, 1, 2].forEach(i => $('ship' + i).classList.remove('chosen', 'away'));
    sfx.laugh();
    let id;
    if (state.forcedShip != null) { id = 'ship' + state.forcedShip; state.forcedShip = null; await sleep(T(500)); }
    else id = await waitChoice(['ship0', 'ship1', 'ship2'], state.auto ? T(1800) : 0, 'ship' + ((Math.random() * 3) | 0));
    const i0 = +id.slice(4);
    [0, 1, 2].forEach(i => $('ship' + i).classList.add(i === i0 ? 'chosen' : 'away'));
    sfx.cannon(1); flash();
    await sleep(T(800));
    ov.classList.add('hidden');
    return i0;
  }
  async function runFreeSpins() {
    const ship = await pickShip();
    const st = E.newFeature(ship);
    await cinematic('', FS.ships[ship].name, 'SETS SAIL', `${st.left} FREE SPINS · GHOST WILDS ×${st.mult}`, `assets/ship_${FS.ships[ship].id}.webp`, 2200);
    setMode('free'); clearGhosts(); drawFsBar(st);
    let total = 0; $('win').textContent = fmt(0);
    msg('Ghost wilds stay and drift left each spin · ways through them pay × their sum');
    while (st.left > 0) {
      clearHighlights(); $('winBanner').classList.add('hidden');
      const res = E.freeSpin(rng, st);
      $('fsLeft').textContent = st.left - res.added;
      await moveGhosts();
      await spinReels(res.grid, res.grid.map(c => c.map(() => 1)), { antic: false });
      for (const f of res.fresh) { burst(cellEl(f.r, f.k), '#62ffb4', 14); addGhost(f.r, f.k, res.mult[f.r][f.k]); sfx.whoosh(0.8); await sleep(T(120)); }
      const amt = r2(res.spinX * bet());
      if (res.wins.length) {
        if (res.wins.some(w => w.factor !== w.ways)) toast('GHOST WAYS!', 'ghost');
        await presentWins(res.wins, amt, res.spinX, 'WIN');
      }
      total += res.spinX;
      $('win').textContent = fmt(r2(Math.min(total, C.maxWinX) * bet()));
      for (const [r, k] of res.scatters) { const e = cellEl(r, k); e.classList.add('glowsc'); sfx.bottle(); await flyTo(e, $('fsMeter'), IMG('SCATTER'), 550); }
      if (res.scatters.length) { $('fsMeter').classList.add('full'); setTimeout(() => $('fsMeter').classList.remove('full'), 1000); }
      if (res.upgraded) {
        [...$('fsMeter').children].forEach(b => b.classList.add('on'));
        await sleep(T(250));
        sfx.cannon(1); sfx.laugh(); flash(); shake();
        const sp = splash('SHIP UPGRADED!', `+${FS.meterSpins * res.ups} SPINS · GHOST WILDS ×${res.multNow}`, '', 1600);
        await sleep(T(700)); setGhostMult(res.multNow); $('fsMult').textContent = '×' + res.multNow; $('fsMult').classList.add('pop'); setTimeout(() => $('fsMult').classList.remove('pop'), 600);
        await sp;
      }
      if (res.scatters.length >= FS.retrigger) { toast(`+${FS.retriggerAward} SPINS!`, 'ghost'); sfx.fanfare(0.6); await sleep(T(900)); }
      drawFsBar(st);
      if (total >= C.maxWinX) { st.left = 0; toast('MAX WIN!'); }
      await sleep(T(res.wins.length ? 350 : 220));
    }
    await sleep(T(500));
    clearGhosts();
    return { x: Math.min(total, C.maxWinX), spins: st.played, ship };
  }

  // ---------- Cursed Coins Hold & Win ----------
  const hold = { st: null };
  const idx = (r, k) => r * C.rows + k;
  function renderHoldReel(r) {
    const R = reels[r];
    R.strip.innerHTML = ''; R.strip.style.transition = 'none'; R.strip.style.transform = 'none';
    R.cells.forEach(c => c && c.remove());
    R.cells = [0, 1, 2, 3].map(k => { const b = hold.st.board[idx(r, k)]; const c = makeCell(null, 0, b || 'empty'); setY(c, k * pitch()); R.reel.appendChild(c); return c; });
  }
  const holdTotalX = () => hold.st.board.reduce((a, c) => a + (c ? c.value : 0), 0);
  function drawHwBar(left, reset) {
    const p = $('hwPips'); [...p.children].forEach((i, n) => i.classList.toggle('on', n < left));
    if (reset) { p.classList.remove('reset'); void p.offsetWidth; p.classList.add('reset'); }
    $('hwTotal').textContent = fmt(r2(holdTotalX() * bet()));
  }
  function refreshVals(values) {
    hold.st.board.forEach((c, i) => {
      if (!c) return; const e = cellEl(Math.floor(i / C.rows), i % C.rows); const cv = e && e.querySelector('.cv'); if (!cv) return;
      if (c.type === 'coin' || (c.type === 'collector' && values[i])) {
        const t = fmtC(values[i] * bet());
        if (cv.textContent !== t) { cv.textContent = t; cv.classList.remove('sp', 'bump'); void cv.offsetWidth; cv.classList.add('bump'); }
      }
    });
  }
  async function holdEffects(res) {
    for (const ef of res.effects) {
      const r = Math.floor(ef.i / C.rows), k = ef.i % C.rows, el = cellEl(r, k);
      el.classList.add('fire');
      if (ef.type === 'upgrade') {
        toast('UPGRADE!', ''); sfx.cannon(0.6, 1.4); flash();
        if (!REDUCED) { const w = document.createElement('div'); w.className = 'wave blue'; $('fx').appendChild(w); setTimeout(() => w.remove(), 900); }
        burst(el, '#4fb4ff', 22);
        await sleep(T(350)); refreshVals(ef.values); [0, 1, 2, 3].forEach(sfx.up);
      } else if (ef.type === 'multiplier') {
        toast('×2 ALL COINS!', 'ghost'); sfx.cannon(0.9, 1.1); shake();
        if (!REDUCED) { const w = document.createElement('div'); w.className = 'wave green'; $('fx').appendChild(w); setTimeout(() => w.remove(), 900); }
        burst(el, '#5dff7a', 26);
        await sleep(T(350)); refreshVals(ef.values); sfx.coin(1, 1.2);
      } else if (ef.type === 'collector') {
        toast('COLLECT!', 'purple'); sfx.laugh();
        const [x1, y1] = centerOf(el);
        const beams = [];
        if (!REDUCED) hold.st.board.forEach((c, i) => {
          if (!c || i === ef.i || !(ef.values[i] > 0)) return;
          const [x0, y0] = centerOf(cellEl(Math.floor(i / C.rows), i % C.rows));
          const bm = document.createElement('div'); bm.className = 'beam';
          const ang = Math.atan2(y1 - y0, x1 - x0);
          bm.style.left = x0 + 'px'; bm.style.top = y0 + 'px'; bm.style.width = Math.hypot(x1 - x0, y1 - y0) + 'px';
          bm.style.transform = `rotate(${ang}rad) scaleX(0)`; document.body.appendChild(bm); beams.push(bm);
          bm.animate([{ transform: `rotate(${ang}rad) scaleX(0)` }, { transform: `rotate(${ang}rad) scaleX(1)` }], { duration: T(350), fill: 'forwards' });
        });
        await sleep(T(420));
        const cv = el.querySelector('.cv'); cv.classList.remove('sp');
        await countUp(cv, 0, ef.value * bet(), T(700));
        cv.textContent = fmtC(ef.value * bet()); burst(el, '#b46bff', 26); sfx.coin(1, 0.8);
        beams.forEach(b => b.remove());
      }
      if (ef.type !== 'collector') el.classList.add('spent');
      $('hwTotal').textContent = fmt(r2(ef.values.reduce((a, b) => a + b, 0) * bet()));
      await sleep(T(350));
      el.classList.remove('fire');
    }
  }
  async function runHold(coins, coinVals) {
    coins.forEach(([r, k], n) => setTimeout(() => { const e = cellEl(r, k); if (e) { e.classList.remove('coinland'); void e.offsetWidth; e.classList.add('coinland'); burst(e, '#ffcf4a', 10); sfx.coin(0.8, 1 + n * 0.05); } }, n * T(110)));
    await sleep(T(900 + coins.length * 60));
    sfx.laugh(); flash('gold');
    await cinematic('gold', 'CURSED', 'COINS', `HOLD & WIN · ${H.respins} RESPINS`, IMG('COIN'), 2200);
    hold.st = E.newHold(coins, coinVals);
    setMode('hold'); buildReels(); drawHwBar(hold.st.left);
    msg('Every new coin locks and resets respins to 3 · fill all 20 for +' + H.fullBonus + '× bet');
    $('win').textContent = fmt(0);
    while (hold.st.left > 0) {
      await sleep(T(350));
      const forced = state.forcedHold.length ? state.forcedHold.shift() : undefined;
      const before = hold.st.board.map(c => !!c);
      const lastChance = hold.st.left === 1;
      const res = E.holdRespin(rng, hold.st, forced);
      for (let r = 0; r < C.reels; r++) for (let k = 0; k < C.rows; k++) if (!before[idx(r, k)]) cellEl(r, k).classList.add('rolling');
      sfx.whoosh(0.5);
      if (lastChance) heartbeat(T(900));
      await sleep(T(lastChance ? 900 : 600));
      heartbeatStop();
      for (let r = 0; r < C.reels; r++) {
        let any = false;
        for (let k = 0; k < C.rows; k++) {
          const i = idx(r, k); if (before[i]) continue;
          const b = hold.st.board[i];
          if (b) {
            const land = res.landed.find(l => l.i === i);
            const el = setCell(r, k, makeCell(null, 0, { type: b.type, value: land.value }));
            el.classList.add('coinland'); burst(el, b.type === 'coin' ? '#ffcf4a' : b.type === 'collector' ? '#b46bff' : b.type === 'multiplier' ? '#5dff7a' : '#4fb4ff', 16);
            if (b.type === 'coin') sfx.coin(0.9); else { sfx.cannon(0.7, 1.3); flash(); }
            any = true;
          } else cellEl(r, k).classList.remove('rolling');
        }
        await sleep(T(any ? 170 : 60));
      }
      if (res.landed.length) {
        await holdEffects(res);
        drawHwBar(hold.st.left, true);
        if (!res.full) toast(res.landed.length > 1 ? `${res.landed.length} COINS!` : 'RESPINS RESET');
      } else drawHwBar(hold.st.left);
      if (res.full) {
        sfx.fanfare(1); flash('gold'); shake(); shower(60);
        await splash('FULL SHIP!', `+${H.fullBonus}× BET BONUS`, 'gold', 1800);
      }
      if (holdTotalX() >= C.maxWinX) break;
    }
    await sleep(T(500));
    let run = 0; const order = [];
    for (let r = 0; r < C.reels; r++) for (let k = 0; k < C.rows; k++) { const b = hold.st.board[idx(r, k)]; if (b && b.value > 0) order.push([r, k, b.value]); }
    const step = state.turbo || order.length > 12 ? 70 : 140;
    for (const [r, k, v] of order) {
      run += v; cellEl(r, k).classList.add('fire'); sfx.coin(0.6, 1 + Math.min(0.6, run / 200));
      $('win').textContent = fmt(r2(Math.min(run, C.maxWinX) * bet()));
      await sleep(T(step));
    }
    const x = Math.min(E.holdTotal(hold.st), C.maxWinX);
    $('win').textContent = fmt(r2(x * bet()));
    await sleep(T(600));
    return { x, coins: hold.st.board.filter(Boolean).length, full: hold.st.full };
  }
  function backToBase() { hold.st = null; clearGhosts(); setMode('base'); buildReels(); $('winBanner').classList.add('hidden'); }

  // ---------- outro + Pick a Chest gamble ----------
  async function outro(title, sub, amount, allowGamble) {
    const ov = $('ovOutro');
    $('outroTitle').textContent = title; $('outroSub').textContent = sub; $('outroWin').textContent = fmt(0);
    const canG = allowGamble && amount > 0;
    $('outroGamble').classList.toggle('hidden', !canG); $('outroNote').classList.toggle('hidden', !canG);
    ov.classList.remove('hidden');
    sfx.fanfare(0.9); shower(amount >= 50 * bet() ? 60 : 24);
    const ids = canG ? ['outroGo', 'outroGamble'] : ['outroGo'];
    const choice = waitChoice(ids, 0);            // buttons work during the count-up too
    const cu = countUp($('outroWin'), 0, amount, T(Math.min(3500, 900 + amount / bet() * 10)));
    const first = await Promise.race([cu.then(() => null), choice]);
    let v = first;
    if (!v) { v = await (state.auto ? Promise.race([choice, sleep(T(2600)).then(() => 'outroGo')]) : choice); }
    $('outroWin')._cu++; $('outroWin').textContent = fmt(amount);
    if (v === 'outroGo' && state.auto) $('outroGo').click();   // release the pending listener
    ov.classList.add('hidden'); $('shower').innerHTML = '';
    return v === 'outroGamble';
  }
  const MULT_TXT = m => (m === 0.5 ? '×½' : '×' + m), MULT_CLS = m => (m === 2 ? 'm2' : m === 1 ? 'm1' : 'mh');
  const MULT_SYM = m => (m === 2 ? 'CAPTAIN' : m === 1 ? 'SKELETON' : 'PARROT');
  async function gambleScene(amount, room) {
    const ov = $('ovGamble'), chs = [...document.querySelectorAll('#chests .chest')];
    let picks = C.gamble.maxPicks;
    $('gAmt').textContent = fmt(amount);
    ov.classList.remove('hidden'); duck(true);
    while (true) {
      $('gPicks').textContent = picks;
      chs.forEach(c => { c.className = 'chest'; c.disabled = false; c.querySelector('.g-rev').className = 'g-rev'; c.querySelector('.g-rev').innerHTML = ''; });
      $('gMsg').textContent = picks === C.gamble.maxPicks ? 'Choose a chest…' : 'Pick again – choose a chest…';
      $('gCollect').classList.remove('hidden'); $('gContinue').classList.add('hidden');
      const choice = await new Promise(res => {
        const hs = [];
        const fin = v => { hs.forEach(([b, f]) => b.removeEventListener('click', f)); res(v); };
        chs.forEach((c, i) => { const f = () => fin(i); c.addEventListener('click', f); hs.push([c, f]); });
        const fc = () => fin(-1); $('gCollect').addEventListener('click', fc); hs.push([$('gCollect'), fc]);
      });
      if (choice < 0) break;
      chs.forEach(c => { c.disabled = true; });
      $('gCollect').classList.add('hidden');
      const mine = chs[choice]; mine.classList.add('mine', 'shake');
      $('gMsg').textContent = 'The lock creaks…';
      snd('chest', { vol: 0.9 }); heartbeat(T(900));
      const g = E.gamblePick(rng, choice);
      const next = E.gambleApply(amount, g.mult, room);
      await sleep(T(700));
      heartbeatStop();
      chs.forEach((c, i) => { const r = c.querySelector('.g-rev'), m = g.reveal[i]; r.className = 'g-rev ' + MULT_CLS(m); r.innerHTML = `<img src="${IMG(MULT_SYM(m))}" alt="">${MULT_TXT(m)}`; });
      mine.classList.remove('shake'); mine.classList.add('open');
      if (g.mult === 2) { sfx.fanfare(0.7); burst(mine, '#ffcf4a', 24); shower(16); }
      else if (g.mult === 1) sfx.coin(0.8);
      else sfx.scream();
      await sleep(T(450));
      chs.forEach((c, i) => { if (i !== choice) c.classList.add('open', 'other'); });
      const el = $('gAmt'); el.classList.remove('up', 'down'); void el.offsetWidth;
      if (next > amount) { el.classList.add('up'); await countUp(el, amount, next, T(700)); }
      else { if (next < amount) el.classList.add('down'); el.textContent = fmt(next); }
      $('gMsg').textContent = g.mult === 2 ? 'DOUBLED!' : g.mult === 1 ? 'Phew – win kept' : 'Cursed! Win halved';
      amount = next; picks--;
      $('gPicks').textContent = picks;
      if (picks > 0 && amount > 0 && amount < room - 0.005) {
        $('gContinue').classList.remove('hidden'); $('gCollect').classList.remove('hidden');
        const v = await waitChoice(['gCollect', 'gContinue'], 0);
        if (v === 'gCollect') break;
      } else {
        $('gMsg').textContent += amount >= room - 0.005 ? ' · max win reached' : ' · no picks left';
        await sleep(T(1500));
        break;
      }
    }
    ov.classList.add('hidden'); duck(false); $('shower').innerHTML = '';
    return amount;
  }

  // ---------- network jackpot: ticker ----------
  const tick = { shown: {}, target: {}, raf: 0 };
  function drawTicker() {
    if (!jp) return;
    jp.getPools().forEach(p => { tick.target[p.id] = p.amount; if (tick.shown[p.id] == null || p.amount < tick.shown[p.id]) tick.shown[p.id] = p.amount; });
    if (tick.raf) return;
    const step = () => {
      let moving = false;
      Object.keys(tick.target).forEach(id => {
        const d = tick.target[id] - tick.shown[id];
        if (Math.abs(d) > 0.004) { tick.shown[id] += d * 0.12 + Math.sign(d) * 0.003; if (Math.abs(tick.target[id] - tick.shown[id]) < 0.004 || Math.sign(tick.target[id] - tick.shown[id]) !== Math.sign(d)) tick.shown[id] = tick.target[id]; moving = true; }
        const e = $('jp_' + id); if (e) e.textContent = fmt(tick.shown[id]);
      });
      tick.raf = moving ? requestAnimationFrame(step) : 0;
    };
    tick.raf = requestAnimationFrame(step);
  }
  if (jp) {
    jp.getPools().forEach(p => { tick.shown[p.id] = p.amount; const e = $('jp_' + p.id); if (e) e.textContent = fmt(p.amount); });
    jp.on('update', drawTicker);
    jp.on('award', e => {
      drawTicker();
      const c2 = document.querySelector('.jp-cell.t-' + e.tier);
      if (c2) { c2.classList.remove('won'); void c2.offsetWidth; c2.classList.add('won'); }
      if (e.by !== 'you') { const n = $('jpNews'); n.textContent = `${e.name} ${fmt(e.amount)} just won on ${e.gameId}!`; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 4500); }
    });
  }
  function jpRng() {
    if (state.forcedJp == null || !jp) return jrng;
    const ti = jp.tiers.findIndex(t => t.id === state.forcedJp || t.name === state.forcedJp); state.forcedJp = null;
    if (ti < 0) return jrng;
    const tot = jp.tiers.reduce((a, t) => a + t.oddsPerUnit, 0);
    const cum = jp.tiers.slice(0, ti).reduce((a, t) => a + t.oddsPerUnit, 0);
    const q = [0, (cum + jp.tiers[ti].oddsPerUnit / 2) / tot];
    return () => (q.length ? q.shift() : jrng());
  }

  // ---------- network jackpot: ghost captain jump-scare + the Captain's Vault ----------
  const SCARE_KEY = 'gsgScareSeen';
  async function jumpScare() {
    const sc = $('jpScare');
    let seen = false; try { seen = localStorage.getItem(SCARE_KEY) === '1'; } catch (e) { /* private mode */ }
    let skipped = false, wake = null;
    const nap = ms => new Promise(r => { if (skipped) return r(); const t = setTimeout(r, ms); wake = () => { clearTimeout(t); r(); }; });
    const onSkip = () => { skipped = true; if (wake) wake(); };
    sc.classList.remove('hidden', 'go', 'calm', 'dark', 'show'); void sc.offsetWidth;
    heartbeatStop(); stopMusic();
    sc.classList.add(REDUCED ? 'calm' : 'go');
    if (seen) { sc.classList.add('show'); sc.addEventListener('click', onSkip); }
    tone(70, 0.5, 'sawtooth', 0.06, -30); sfx.thunder();
    await nap(T(500));
    if (!skipped) { heartbeat(900); sfx.laugh(); }
    await nap(REDUCED ? 600 : 900);
    if (!skipped) {
      sfx.scream(); snd('cannon', { vol: 1, rate: 0.55 }); snd('kraken', { vol: 0.8, rate: 0.7, delay: 0.05 });
      if (!REDUCED) sc.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-14px,9px)' }, { transform: 'translate(12px,-10px)' }, { transform: 'translate(-8px,6px)' }, { transform: 'translate(0,0)' }], { duration: 450, iterations: 2 });
    }
    await nap(REDUCED ? 500 : 650);
    heartbeatStop();
    if (!skipped && !seen) { sc.classList.add('show'); await waitChoice(['scareSkip'], state.auto ? 2500 : 0); }
    else if (!skipped) await waitChoice(['scareSkip'], state.auto ? 1200 : 1600);
    try { localStorage.setItem(SCARE_KEY, '1'); } catch (e) { /* private mode */ }
    sc.removeEventListener('click', onSkip);
    sc.classList.add('dark');
    await sleep(600);
  }
  const TIER_SYM = { mini: 'PARROT', minor: 'SKELETON', major: 'SIREN', grand: 'CAPTAIN' };
  async function jackpotScene(w) {
    state.inJackpot = true;
    await jumpScare();
    const scr = $('jpScreen'), tiers = jp.tiers, grid = $('jpGrid');
    const pools = jp.getPools();
    $('jpTiers').innerHTML = tiers.slice().reverse().map(t => {
      const amt = t.id === w.tier ? w.amount : (pools.find(p => p.id === t.id) || {}).amount || t.seed;
      return `<div class="jp-tier t-${t.id}" data-t="${t.id}" style="--tc:var(--c-${t.id})"><label><img class="ti" src="${IMG(TIER_SYM[t.id] || 'COIN')}" alt="">${t.name}</label><b>${fmt(amt)}</b><div class="pips"><i></i><i></i><i></i></div></div>`;
    }).join('');
    grid.innerHTML = '';
    for (let i = 0; i < w.pick.size; i++) {
      const g = document.createElement('button'); g.className = 'vchest'; g.setAttribute('aria-label', 'Chest ' + (i + 1));
      g.innerHTML = '<img src="assets/chest.webp" alt=""><div class="tok"></div>';
      grid.appendChild(g);
    }
    $('jpWin').classList.add('hidden');
    scr.classList.remove('hidden');
    $('jpScare').classList.add('hidden'); $('jpScare').classList.remove('go', 'calm', 'dark', 'show');
    startMusic('music_hold');
    const counts = {}; tiers.forEach(t => { counts[t.id] = 0; });
    const setTok = (g, t) => { g.querySelector('.tok').innerHTML = `<img src="${IMG(TIER_SYM[t.id] || 'COIN')}" alt=""><span>${t.name}</span>`; g.style.setProperty('--tc', `var(--c-${t.id})`); g.dataset.t = t.id; };
    const chests = [...grid.children];
    for (let k = 0; k < w.pick.order.length; k++) {
      const g = await new Promise(res => {
        const open = chests.filter(x => !x.disabled), hs = [];
        const fin = x => { hs.forEach(([b, f]) => b.removeEventListener('click', f)); clearTimeout(at); res(x); };
        open.forEach(x => { const f = () => fin(x); x.addEventListener('click', f); hs.push([x, f]); });
        const at = state.auto ? setTimeout(() => fin(open[Math.floor(Math.random() * open.length)]), T(700)) : 0;
      });
      g.disabled = true;
      const t = tiers[w.pick.order[k]];
      setTok(g, t); g.classList.add('dug');
      counts[t.id]++;
      snd('chest', { vol: 0.8, rate: rnd(0.95, 1.1) }); sfx.coin(0.6);
      burst(g, '#ffcf4a', 10);
      const tierEl = $('jpTiers').querySelector(`[data-t="${t.id}"]`);
      tierEl.querySelectorAll('.pips i').forEach((p, i) => p.classList.toggle('on', i < counts[t.id]));
      if (counts[t.id] === 2) { tierEl.classList.add('hot'); heartbeat(T(700)); }
      if (counts[t.id] === 3) { tierEl.classList.remove('hot'); tierEl.classList.add('win'); chests.filter(x => x.dataset.t === t.id).forEach(x => x.classList.add('match')); }
      await sleep(T(260));
    }
    heartbeatStop();
    await sleep(T(500));
    chests.filter(x => !x.disabled).forEach((g, i) => { g.disabled = true; setTok(g, tiers[w.pick.rest[i]]); g.classList.add('dug', 'rest'); });
    await sleep(T(900));
    const winT = tiers[w.tierIndex];
    $('jwTier').textContent = winT.name; $('jwTier').style.setProperty('--tc', `var(--c-${winT.id})`);
    $('jwAmt').textContent = fmt(0);
    $('jpWin').classList.remove('hidden');
    sfx.fanfare(1); sfx.laugh(); shower(w.tierIndex >= 2 ? 80 : 50);
    const done = waitClick('jpCollect', state.auto ? 5000 : 0);
    await Promise.race([countUp($('jwAmt'), 0, w.amount, Math.min(4000, 1200 + w.tierIndex * 900)), done]);
    $('jwAmt').textContent = fmt(w.amount);
    await done;
    state.balance = r2(state.balance + w.amount);
    scr.classList.add('hidden'); $('jpWin').classList.add('hidden'); $('shower').innerHTML = '';
    startMusic('music_base');
    state.inJackpot = false;
    $('win').textContent = fmt(w.amount);
    msg(`<b>${winT.name} JACKPOT</b> · ${fmt(w.amount)} added to your demo credits`);
    updateHUD(); drawTicker();
  }

  // ---------- features after a base spin (or a bonus buy) ----------
  // Returns the credited feature amount (after the optional gamble). baseAmt = credits already paid for the base win.
  async function playFeatures(triggers, res, baseX, baseAmt) {
    const b = bet(), capC = r2(C.maxWinX * b);
    let hX = 0, fX = 0, gambleOk = false;
    const doHold = triggers.includes('hold'), doFs = triggers.includes('fs');
    if (doHold) {
      const h = await runHold(res.coins, res.coinVals);
      hX = h.x;
      const amtH = r2(r2(Math.min(C.maxWinX, baseX + hX) * b) - baseAmt);
      gambleOk = await outro(h.full ? 'FULL SHIP!' : 'CURSED COINS', `${h.coins} coins collected`, amtH, !doFs);
      backToBase();
    }
    if (doFs) {
      if (doHold) { msg('…and the bottles call the ghost ship!'); await sleep(T(600)); }
      else {
        res.scatters.forEach(([r, k]) => { const e = cellEl(r, k); e.classList.add('glowsc'); burst(e, '#62ffb4', 18); });
        sfx.laugh(); await sleep(T(900));
      }
      await cinematic('', 'GHOST SHIP', 'FREE SPINS', 'CHOOSE YOUR SHIP', 'assets/ship_galleon.webp', 2300);
      const f = await runFreeSpins();
      fX = f.x;
      const amtF = r2(r2(Math.min(C.maxWinX, baseX + hX + fX) * b) - baseAmt);
      gambleOk = await outro(fX >= 100 ? 'LEGENDARY HAUL!' : fX >= 30 ? 'TREASURE HAULED!' : 'VOYAGE OVER', `${f.spins} free spins on the ${FS.ships[f.ship].name}`, amtF, true);
      backToBase();
    }
    let feat = r2(r2(Math.min(C.maxWinX, baseX + hX + fX) * b) - baseAmt);
    if (gambleOk && feat > 0) feat = await gambleScene(feat, r2(capC - baseAmt));
    return { feat, hX, fX };
  }

  // ---------- main spin ----------
  async function spin() {
    if (state.busy) return;
    if (state.balance < bet() - 1e-9) { state.auto = false; updateHUD(); msg('Not enough demo credits – lower the bet or reset credits in the info screen'); return; }
    state.busy = true;
    state.balance = r2(state.balance - bet());
    $('win').textContent = fmt(0); $('winBanner').classList.add('hidden'); msg('&nbsp;');
    updateHUD();
    const b = bet();
    const res = E.baseSpin(rng, state.forced.shift());
    let jpWin = null;
    if (jp) { jp.contribute(b); jpWin = jp.checkWin(b, jpRng()); drawTicker(); }
    const showGrid = res.pre || res.grid;
    const vals = showGrid.map(c => c.map(() => 1));
    res.coins.forEach(([r, k], i) => { vals[r][k] = res.coinVals[i]; });
    if (res.kraken) setTimeout(krakenTease, T(350));
    await spinReels(showGrid, vals, {});
    if (res.kraken) await krakenSmash(res.kraken);
    const baseAmt = r2(Math.min(res.winX, C.maxWinX) * b);
    if (baseAmt > 0) {
      await presentWins(res.wins, baseAmt, res.winX, res.kraken ? 'KRAKEN WIN' : 'WIN');
      if (res.scatX > 0) toast(`BOTTLES PAY ${fmt(r2(res.scatX * b))}`, 'ghost');
      state.balance = r2(state.balance + baseAmt);
      $('win').textContent = fmt(baseAmt);
      if (!res.triggers.length) { msg(`Win <b>${fmt(baseAmt)}</b>` + (res.kraken ? ' · the Kraken struck!' : '')); await bigWin(baseAmt, res.winX); }
    } else msg(res.kraken ? 'The Kraken struck… but missed!' : res.scatters.length === 2 ? `So close! 2 ${icon('SCATTER')}…` : res.coins.length >= 4 ? `${res.coins.length} cursed coins… 6 wake the curse` : 'No win – the ghost ship sails on');
    updateHUD();
    if (res.triggers.length) {
      const f = await playFeatures(res.triggers, res, res.winX, baseAmt);
      state.balance = r2(state.balance + f.feat);
      $('win').textContent = fmt(r2(baseAmt + f.feat));
      msg(`Bonus win <b>${fmt(f.feat)}</b>`);
    }
    if (jpWin) await jackpotScene(jpWin);
    state.busy = false;
    updateHUD();
    if (state.auto) setTimeout(() => { if (state.auto) spin(); }, state.turbo ? 120 : 400);
  }

  // ---------- bonus buy (OFF by default; demo switch ?bonusbuy=1 for non-GB markets) ----------
  async function buy(kind) {
    $('ovBuy').classList.add('hidden');
    if (state.busy || !C.bonusBuy.enabled) return;
    const b = bet(), price = r2((kind === 'fs' ? C.bonusBuy.freeSpinsPrice : C.bonusBuy.holdPrice) * b);
    if (state.balance < price - 1e-9) { msg('Not enough demo credits for this bonus buy'); return; }
    state.busy = true; state.auto = false;
    state.balance = r2(state.balance - price); updateHUD();
    $('win').textContent = fmt(0);
    let res = { coins: [], coinVals: [], scatters: [] };
    if (kind === 'hold') {
      const s = E.buyStart(rng);
      const g = E.drawGrid(rng, 'base').map(c => c.map(x => (x === 'COIN' || x === 'SCATTER' ? 'RUM' : x)));
      const vals = g.map(c => c.map(() => 1));
      s.coins.forEach(([r, k], i) => { g[r][k] = 'COIN'; vals[r][k] = s.coinVals[i]; });
      await spinReels(g, vals, { antic: false });
      res = { coins: s.coins, coinVals: s.coinVals, scatters: [] };
    }
    const f = await playFeatures([kind], res, 0, 0);
    state.balance = r2(state.balance + f.feat);
    $('win').textContent = fmt(f.feat);
    msg(`Bonus buy paid <b>${fmt(f.feat)}</b> for ${fmt(price)}`);
    state.busy = false; updateHUD();
  }

  // ---------- paytable ----------
  function buildPaytable() {
    const b = bet();
    let h = '<tr><th>SYMBOL</th><th>3</th><th>4</th><th>5</th></tr>';
    C.payOrder.forEach(id => { const s = S[id]; h += `<tr><td>${icon(id)}${s.name}</td>${s.pay.map(p => `<td>${fmt(p * b)}</td>`).join('')}</tr>`; });
    h += `<tr><td>${icon('SCATTER')}Bottle</td><td>${fmt(C.scatterPay[3] * b)}</td><td>${fmt(C.scatterPay[4] * b)}</td><td>${fmt(C.scatterPay[5] * b)}</td></tr>`;
    h += `<tr><td>${icon('WILD')}Wild</td><td colspan="3">Substitutes for all paying symbols (reels 2–5)</td></tr>`;
    h += `<tr><td>${icon('COIN')}Cursed Coin</td><td colspan="3">${H.values.map(v => fmtC(v * b)).join(' · ')}</td></tr>`;
    $('payTable').innerHTML = h;
    $('sc3').textContent = fmt(C.scatterPay[3] * b); $('sc4').textContent = fmt(C.scatterPay[4] * b); $('sc5').textContent = fmt(C.scatterPay[5] * b);
    $('krRule').textContent = `${C.kraken.wildsMin}–${C.kraken.wildsMax}`; $('fullRule').textContent = H.fullBonus;
    $('maxWin').textContent = C.maxWinX.toLocaleString('en-GB');
    $('rtpRule').textContent = C.variants[C.rtpVariant].label;
    $('statRule').textContent = C.statLine || '';
    $('buyRule').innerHTML = C.bonusBuy.enabled ? `<b>Bonus buy (demo, non-GB markets only):</b> Free Spins ${C.bonusBuy.freeSpinsPrice}× bet, Hold &amp; Win ${C.bonusBuy.holdPrice}× bet (6 coins). Bought features do not draw the network jackpot.` : '<b>Bonus buy:</b> switched off (not permitted in Great Britain).';
    if (jp) {
      const pools = jp.getPools();
      $('jpRule').innerHTML = jp.tiers.map(t => `<b>${t.name}</b> (starts at ${fmt(t.seed)}, now ${fmt((pools.find(p => p.id === t.id) || {}).amount || t.seed)}; chance per spin at this bet ≈ 1 in ${Math.round(1 / (t.oddsPerUnit * b)).toLocaleString('en-GB')})`).join(', ') + '.';
    }
  }

  // ---------- events ----------
  $('btnSpin').addEventListener('click', () => { if (state.auto) { state.auto = false; updateHUD(); } else spin(); });
  $('btnAuto').addEventListener('click', () => { state.auto = !state.auto; updateHUD(); if (state.auto && !state.busy) spin(); });
  $('btnTurbo').addEventListener('click', () => { state.turbo = !state.turbo; updateHUD(); });
  $('btnSfx').addEventListener('click', () => { state.sound = !state.sound; if (!state.sound) heartbeatStop(); savePref(); updateHUD(); });
  $('btnMusic').addEventListener('click', () => { state.music = !state.music; savePref(); updateHUD(); unlockAudio(); if (state.music) startMusic(A.musicKey); else stopMusic(); });
  $('betDown').addEventListener('click', () => { if (!state.busy && state.betIdx > 0) { state.betIdx--; updateHUD(); if (state.mode === 'base') buildReels(); } });
  $('betUp').addEventListener('click', () => { if (!state.busy && state.betIdx < C.bets.length - 1) { state.betIdx++; updateHUD(); if (state.mode === 'base') buildReels(); } });
  $('btnInfo').addEventListener('click', () => { buildPaytable(); $('ovInfo').classList.remove('hidden'); });
  $('infoClose').addEventListener('click', () => $('ovInfo').classList.add('hidden'));
  $('ovInfo').addEventListener('click', e => { if (e.target.id === 'ovInfo') $('ovInfo').classList.add('hidden'); });
  $('btnReset').addEventListener('click', () => { if (state.busy) return; state.balance = C.startBalance; updateHUD(); $('ovInfo').classList.add('hidden'); msg('Demo credits reset to ' + fmt(C.startBalance)); });
  $('btnBuy').addEventListener('click', () => { if (state.busy || !C.bonusBuy.enabled) return; $('buyFsPrice').textContent = fmt(C.bonusBuy.freeSpinsPrice * bet()); $('buyHoldPrice').textContent = fmt(C.bonusBuy.holdPrice * bet()); $('ovBuy').classList.remove('hidden'); });
  $('buyFs').addEventListener('click', () => buy('fs'));
  $('buyHold').addEventListener('click', () => buy('hold'));
  $('buyClose').addEventListener('click', () => $('ovBuy').classList.add('hidden'));
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    const vis = id => !$(id).classList.contains('hidden');
    if (vis('ovOutro')) $('outroGo').click();
    else if (vis('jpScreen') || vis('ovGamble') || vis('jpScare') || vis('ovShips') || vis('ovBuy')) { /* use taps in these screens */ }
    else if (!vis('ovInfo')) $('btnSpin').click();
  });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (!state.busy) buildReels(); }, 150); });

  layout(); buildReels(); updateHUD(); drawTicker();
  window.addEventListener('load', () => { layout(); if (!state.busy) buildReels(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!state.busy) { layout(); buildReels(); } });
})();
