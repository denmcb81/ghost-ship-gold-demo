/* Ghost Ship Gold – maths engine (Horde Games demo). DEMO credits only, no real money.
 * Shared by the browser (window.GhostEngine) and node (simulate.js / harness).
 * 5 reels x 4 rows, 1024 ways (left to right, adjacent reels from reel 1, 3+ of a kind).
 * Features: Kraken Attack (random wilds in base), Free Spins with a ship choice and walking ghost
 * wilds that carry multipliers, Cursed Coins Hold & Win, Pick a Chest gamble, network jackpot (module).
 * Every random outcome is drawn here from the seeded RNG; the UI only presents results.
 */
(function (root) {
  'use strict';
  const REELS = 5, ROWS = 4, CELLS = REELS * ROWS;
  const CONFIG = {
    version: 'gsg-1.0',
    reels: REELS, rows: ROWS,
    bets: [0.1, 0.2, 0.5, 1, 2, 5], defaultBetIndex: 3, startBalance: 1000,
    maxWinX: 10000,
    statLine: '. Simulated: hit rate 18.8% (1 in 5.3), win above stake 1 in 13, free spins 1 in 223, Hold & Win 1 in 230, Kraken Attack 1 in 100, max win 10,000× bet.',
    symbols: {
      RUM:      { name: 'Rum',      kind: 'low',  pay: [0.1, 0.3, 1] },
      COMPASS:  { name: 'Compass',  kind: 'low',  pay: [0.1, 0.3, 1] },
      ANCHOR:   { name: 'Anchor',   kind: 'low',  pay: [0.1, 0.4, 1.2] },
      PISTOL:   { name: 'Pistol',   kind: 'low',  pay: [0.1, 0.4, 1.2] },
      PARROT:   { name: 'Parrot',   kind: 'high', pay: [0.3, 0.8, 2.5] },
      SKELETON: { name: 'Skeleton', kind: 'high', pay: [0.4, 1, 4] },
      SIREN:    { name: 'Siren',    kind: 'high', pay: [0.5, 1.5, 6] },
      CAPTAIN:  { name: 'Captain',  kind: 'high', pay: [1, 3, 12] },
      WILD:     { name: 'Wild',     kind: 'wild' },
      SCATTER:  { name: 'Ship in a Bottle', kind: 'scatter' },
      COIN:     { name: 'Cursed Coin', kind: 'coin' },
    },
    payOrder: ['CAPTAIN', 'SIREN', 'SKELETON', 'PARROT', 'PISTOL', 'ANCHOR', 'COMPASS', 'RUM'],
    // per-cell weights; WILD never lands on reel 1; at most one SCATTER per reel
    weightsBase: { RUM: 100, COMPASS: 100, ANCHOR: 90, PISTOL: 90, PARROT: 46, SKELETON: 38, SIREN: 30, CAPTAIN: 18, WILD: 3.4, SCATTER: 12, COIN: 48 },
    weightsFree: { RUM: 100, COMPASS: 100, ANCHOR: 90, PISTOL: 90, PARROT: 50, SKELETON: 42, SIREN: 34, CAPTAIN: 22, WILD: 13, SCATTER: 9, COIN: 0 },
    // per-reel weight multipliers for the low symbols (staggered so low ways are less frequent)
    reelBias: { RUM: [1, 2, 0.12, 1, 1], COMPASS: [1, 0.12, 2, 1, 1], ANCHOR: [1, 2, 0.12, 1, 1], PISTOL: [1, 0.12, 2, 1, 1], PARROT: [1, 1.6, 0.4, 1, 1], SKELETON: [1, 0.4, 1.6, 1, 1] },
    scatterPay: { 3: 2, 4: 10, 5: 50 },          // x bet, anywhere
    kraken: { chance: 1 / 100, wildsMin: 2, wildsMax: 4 },  // random base feature
    freeSpins: {
      trigger: 3,
      ships: [ // player's choice – tuned so each ship has (almost) the same expected value
        { id: 'sloop',   name: 'SLOOP',   spins: 12, mult: 2, wildW: 7.0 },
        { id: 'frigate', name: 'FRIGATE', spins: 9,  mult: 3, wildW: 7.47 },
        { id: 'galleon', name: 'GALLEON', spins: 7,  mult: 5, wildW: 7.1 },
      ],
      retrigger: 3, retriggerAward: 5,              // 3+ bottles in free spins = +5 spins
      meterNeed: 3, meterSpins: 2, meterMultUp: 1,  // every 3 bottles collected: +2 spins, ghost wilds +1x
    },
    hold: {
      trigger: 6, respins: 3,
      pLand: 0.0533,                                 // chance an empty spot lands a coin on each respin
      values: [1, 2, 3, 5, 8, 10, 15, 25, 50, 100], // ladder (x bet)
      valueW: [300, 250, 170, 110, 62, 45, 25, 13, 5, 1.2],
      special: { collector: 0.045, multiplier: 0.03, upgrade: 0.045 }, // share of landed respin coins
      fullBonus: 500,                                // all 20 spots filled
    },
    gamble: { maxPicks: 3, outcomes: [{ mult: 2, w: 20 }, { mult: 1, w: 40 }, { mult: 0.5, w: 40 }] },
    // Bonus buy: OFF by default (UK – bonus buy is prohibited by UKGC). Prices are x bet.
    bonusBuy: { enabled: false, freeSpinsPrice: 67, holdPrice: 72 },   // hold price set per variant below
    jackpotRtp: 0.02,
    rtpVariant: '96',
    variants: {
      '96': { label: '96.0% (game 94.0% + jackpot 2.0%)', hold: { pLand: 0.0533 }, holdPrice: 72 },
      '94': { label: '94.0% (game 92.0% + jackpot 2.0%)', hold: { pLand: 0.0498 }, holdPrice: 67 },
      '92': { label: '92.0% (game 90.0% + jackpot 2.0%)', hold: { pLand: 0.0462 }, holdPrice: 62 },
    },
  };
  const HOLD_BASE = Object.assign({}, CONFIG.hold);

  function makeRng(seed) {
    let a = seed >>> 0 || 1;
    return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function pickW(rng, keys, ws, tot) { let r = rng() * tot; for (let i = 0; i < keys.length; i++) { if ((r -= ws[i]) < 0) return keys[i]; } return keys[keys.length - 1]; }
  const tables = {};
  function table(mode, reel, noScatter, wildW) {
    const key = mode + reel + (noScatter ? 's' : '') + (wildW == null ? '' : ':' + wildW);
    if (tables[key] && tables[key].v === CONFIG.version + JSON.stringify(mode === 'base' ? CONFIG.weightsBase : CONFIG.weightsFree)) return tables[key];
    const W = Object.assign({}, mode === 'base' ? CONFIG.weightsBase : CONFIG.weightsFree);
    if (wildW != null) W.WILD = wildW;
    for (const b in CONFIG.reelBias) if (W[b]) W[b] *= CONFIG.reelBias[b][reel];
    if (reel === 0) W.WILD = 0;
    if (noScatter) W.SCATTER = 0;
    const keys = Object.keys(W).filter(k => W[k] > 0), ws = keys.map(k => W[k]);
    return (tables[key] = { keys, ws, tot: ws.reduce((a, b) => a + b, 0), v: CONFIG.version + JSON.stringify(mode === 'base' ? CONFIG.weightsBase : CONFIG.weightsFree) });
  }
  // grid[reel][row]
  function drawGrid(rng, mode, wildW) {
    const g = [];
    for (let r = 0; r < REELS; r++) {
      const col = []; let sc = false;
      for (let k = 0; k < ROWS; k++) {
        const t = table(mode, r, sc, wildW);
        const s = pickW(rng, t.keys, t.ws, t.tot);
        if (s === 'SCATTER') sc = true;
        col.push(s);
      }
      g.push(col);
    }
    return g;
  }
  function coinValue(rng) { const H = CONFIG.hold; return pickW(rng, H.values, H.valueW, H.valueW.reduce((a, b) => a + b, 0)); }

  // Ways evaluation. mult = null (base: every way pays x1) or a ROWS x REELS array of wild multipliers
  // (free spins: a way pays x the SUM of the ghost-wild multipliers on it, or x1 if it has none).
  // A way needs at least one real symbol (all-wild ways do not pay).
  function evalWays(grid, mult) {
    const wins = []; let total = 0;
    for (const s of CONFIG.payOrder) {
      const n = [], k = [], w = [];
      for (let r = 0; r < REELS; r++) {
        let nn = 0, kk = 0, ww = 0;
        for (let row = 0; row < ROWS; row++) {
          const c = grid[r][row];
          if (c === s) nn++;
          else if (c === 'WILD') { nn++; kk++; ww += mult ? mult[r][row] : 1; }
        }
        if (!nn) break;
        n.push(nn); k.push(kk); w.push(ww);
      }
      const L = n.length;
      if (L < 3) continue;
      const prod = a => a.reduce((x, y) => x * y, 1);
      let weight, pureW;
      if (!mult) { weight = prod(n); pureW = prod(k); }
      else {
        weight = prod(n.map((x, i) => x - k[i]));
        for (let r = 0; r < L; r++) weight += w[r] * prod(n.filter((_, i) => i !== r));
        pureW = 0; for (let r = 0; r < L; r++) pureW += w[r] * prod(k.filter((_, i) => i !== r));
      }
      weight -= pureW;
      if (weight <= 0) continue;
      const ways = !mult ? weight : prod(n) - prod(k);
      const pay = CONFIG.symbols[s].pay[L - 3] * weight;
      const cells = [];
      for (let r = 0; r < L; r++) for (let row = 0; row < ROWS; row++) { const c = grid[r][row]; if (c === s || c === 'WILD') cells.push([r, row]); }
      wins.push({ sym: s, reels: L, ways, factor: weight, pay, cells });
      total += pay;
    }
    return { winX: Math.round(total * 1e6) / 1e6, wins };
  }
  function scatterCells(grid) { const c = []; for (let r = 0; r < REELS; r++) for (let k = 0; k < ROWS; k++) if (grid[r][k] === 'SCATTER') c.push([r, k]); return c; }
  function coinCells(grid) { const c = []; for (let r = 0; r < REELS; r++) for (let k = 0; k < ROWS; k++) if (grid[r][k] === 'COIN') c.push([r, k]); return c; }

  // ---------- base spin ----------
  // forced = { grid, coinVals, kraken:false|true } for tests (debug hook only)
  function baseSpin(rng, forced) {
    forced = forced || {};
    let grid = forced.grid ? forced.grid.map(c => c.slice()) : drawGrid(rng, 'base');
    const coins = coinCells(grid);
    const coinVals = coins.map((_, i) => (forced.coinVals && forced.coinVals[i] != null ? forced.coinVals[i] : coinValue(rng)));
    // Kraken Attack: random, on any base spin (drawn after the grid). Tentacles slam wilds onto reels 2-5.
    let kraken = null, pre = null;
    const kOn = forced.kraken != null ? forced.kraken : rng() < CONFIG.kraken.chance;
    if (kOn) {
      const K = CONFIG.kraken, nW = K.wildsMin + Math.floor(rng() * (K.wildsMax - K.wildsMin + 1));
      const spots = [];
      for (let r = 1; r < REELS; r++) for (let k = 0; k < ROWS; k++) { const c = grid[r][k]; if (c !== 'SCATTER' && c !== 'COIN' && c !== 'WILD') spots.push([r, k]); }
      kraken = []; pre = grid.map(c => c.slice());
      for (let i = 0; i < nW && spots.length; i++) { const j = Math.floor(rng() * spots.length); const p = spots.splice(j, 1)[0]; kraken.push(p); grid[p[0]][p[1]] = 'WILD'; }
    }
    const ev = evalWays(grid, null);
    const sc = scatterCells(grid);
    const scatX = sc.length >= 3 ? CONFIG.scatterPay[Math.min(5, sc.length)] : 0;
    const triggers = [];
    if (coins.length >= CONFIG.hold.trigger) triggers.push('hold');
    if (sc.length >= CONFIG.freeSpins.trigger) triggers.push('fs');
    return { grid, pre, kraken, wins: ev.wins, lineX: ev.winX, scatX, scatters: sc, coins, coinVals, winX: ev.winX + scatX, triggers };
  }

  // ---------- free spins ----------
  function newFeature(shipIdx) {
    const ship = CONFIG.freeSpins.ships[shipIdx];
    return { ship: shipIdx, left: ship.spins, played: 0, mult: ship.mult, meter: 0, totalX: 0, walkers: [], ups: 0 };
  }
  // walkers: [{r,k}] – ghost wilds that stay and move one reel left before every free spin.
  function freeSpin(rng, st, forced) {
    const FS = CONFIG.freeSpins, ship = FS.ships[st.ship];
    st.left--; st.played++;
    const moved = st.walkers.map(w => ({ r: w.r - 1, k: w.k, from: w.r })).filter(w => w.r >= 0);
    const gone = st.walkers.filter(w => w.r - 1 < 0).map(w => ({ r: w.r, k: w.k }));
    let grid = forced && forced.grid ? forced.grid.map(c => c.slice()) : drawGrid(rng, 'free', ship.wildW);
    moved.forEach(w => { grid[w.r][w.k] = 'WILD'; });
    const fresh = [];
    for (let r = 0; r < REELS; r++) for (let k = 0; k < ROWS; k++) if (grid[r][k] === 'WILD' && !moved.some(w => w.r === r && w.k === k)) fresh.push({ r, k });
    st.walkers = moved.map(w => ({ r: w.r, k: w.k })).concat(fresh);
    const mult = []; for (let r = 0; r < REELS; r++) { mult.push([]); for (let k = 0; k < ROWS; k++) mult[r].push(grid[r][k] === 'WILD' ? st.mult : 0); }
    const ev = evalWays(grid, mult);
    const sc = scatterCells(grid);
    let add = 0, up = false;
    if (sc.length >= FS.retrigger) add += FS.retriggerAward;
    st.meter += sc.length;
    let ups = 0;
    while (st.meter >= FS.meterNeed) { st.meter -= FS.meterNeed; add += FS.meterSpins; st.mult += FS.meterMultUp; ups++; up = true; }
    st.left += add; st.ups += ups;
    const scatX = sc.length >= 3 ? CONFIG.scatterPay[Math.min(5, sc.length)] : 0;
    const spinX = ev.winX + scatX;
    st.totalX += spinX;
    return { grid, moved, gone, fresh, mult, wins: ev.wins, spinX, scatters: sc, added: add, upgraded: up, ups, multNow: st.mult, meter: st.meter };
  }

  // ---------- Cursed Coins Hold & Win ----------
  // board: CELLS entries, null or { type:'coin'|'collector'|'multiplier'|'upgrade', value }
  function newHold(coins, coinVals) {
    const board = new Array(CELLS).fill(null);
    coins.forEach(([r, k], i) => { board[r * ROWS + k] = { type: 'coin', value: coinVals[i] }; });
    return { board, left: CONFIG.hold.respins, respins: 0, full: false, totalX: 0 };
  }
  function nextLadder(v) { const L = CONFIG.hold.values; for (const x of L) if (x > v) return x; return v * 2; }
  function holdTotal(st) { return st.board.reduce((a, c) => a + (c ? c.value : 0), 0) + (st.full ? CONFIG.hold.fullBonus : 0); }
  // forced = [{i, type, value}] lands exactly these (debug)
  function holdRespin(rng, st, forced) {
    const H = CONFIG.hold; st.respins++; st.left--;
    const landed = [];
    if (forced) forced.forEach(f => { if (!st.board[f.i]) { st.board[f.i] = { type: f.type, value: f.value || 0 }; landed.push({ i: f.i, type: f.type, value: f.value || 0 }); } });
    else for (let i = 0; i < CELLS; i++) {
      if (st.board[i] || rng() >= H.pLand) continue;
      const u = rng(), S = H.special;
      let type = 'coin';
      if (u < S.collector) type = 'collector'; else if (u < S.collector + S.multiplier) type = 'multiplier'; else if (u < S.collector + S.multiplier + S.upgrade) type = 'upgrade';
      const value = type === 'coin' ? coinValue(rng) : 0;
      st.board[i] = { type, value }; landed.push({ i, type, value });
    }
    // special effects resolve in a fixed order: upgrades, then multipliers, then collectors
    const effects = [];
    landed.filter(l => l.type === 'upgrade').forEach(l => {
      st.board.forEach((c, j) => { if (c && j !== l.i && c.type !== 'upgrade' && c.type !== 'multiplier') c.value = c.type === 'collector' && c.value === 0 ? 0 : nextLadder(c.value); });
      effects.push({ i: l.i, type: 'upgrade', values: st.board.map(c => (c ? c.value : 0)) });
    });
    landed.filter(l => l.type === 'multiplier').forEach(l => {
      st.board.forEach((c, j) => { if (c && j !== l.i) c.value *= 2; });
      effects.push({ i: l.i, type: 'multiplier', values: st.board.map(c => (c ? c.value : 0)) });
    });
    landed.filter(l => l.type === 'collector').forEach(l => {
      const sum = st.board.reduce((a, c, j) => a + (c && j !== l.i ? c.value : 0), 0);
      st.board[l.i].value += sum;
      effects.push({ i: l.i, type: 'collector', value: st.board[l.i].value, values: st.board.map(c => (c ? c.value : 0)) });
    });
    if (landed.length) st.left = H.respins;
    if (st.board.every(c => c)) { st.full = true; st.left = 0; }
    st.totalX = holdTotal(st);
    return { landed, effects, left: st.left, full: st.full, totalX: st.totalX };
  }

  // ---------- bonus buy (OFF by default; UK prohibits it) ----------
  // 'fs' starts Free Spins directly (player still picks the ship); 'hold' starts Hold & Win with exactly 6 coins.
  function buyStart(rng) {
    const all = []; for (let i = 0; i < CELLS; i++) all.push(i);
    const coins = [];
    for (let n = 0; n < CONFIG.hold.trigger; n++) { const j = Math.floor(rng() * all.length); const i = all.splice(j, 1)[0]; coins.push([Math.floor(i / ROWS), i % ROWS]); }
    coins.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return { coins, coinVals: coins.map(() => coinValue(rng)) };
  }

  // ---------- gamble ----------
  function gamblePick(rng, pick) {
    const o = CONFIG.gamble.outcomes, tot = o.reduce((a, x) => a + x.w, 0);
    let r = rng() * tot, idx = o.length - 1;
    for (let i = 0; i < o.length; i++) { if ((r -= o[i].w) < 0) { idx = i; break; } }
    const rest = o.filter((_, i) => i !== idx).map(x => x.mult);
    if (rng() < 0.5) rest.reverse();
    const reveal = []; let j = 0;
    for (let d = 0; d < 3; d++) reveal.push(d === pick ? o[idx].mult : rest[j++]);
    return { mult: o[idx].mult, reveal };
  }
  function gambleApply(amount, mult, room) { return Math.max(0, Math.min(room, Math.floor(amount * mult * 100 + 1e-6) / 100)); }

  function setVariant(v) {
    const vv = CONFIG.variants[v]; if (!vv) return false;
    CONFIG.hold = Object.assign({}, HOLD_BASE, vv.hold || {});
    if (vv.holdPrice) CONFIG.bonusBuy.holdPrice = vv.holdPrice;
    CONFIG.rtpVariant = v; return true;
  }
  setVariant(CONFIG.rtpVariant);

  const api = { CONFIG, REELS, ROWS, CELLS, makeRng, drawGrid, evalWays, baseSpin, newFeature, freeSpin, newHold, holdRespin, holdTotal, coinValue, buyStart, nextLadder, gamblePick, gambleApply, setVariant };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GhostEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
