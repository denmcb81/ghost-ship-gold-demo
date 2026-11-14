# Ghost Ship Gold – maths sheet (engine v1, HIGH volatility)

DEMO ONLY – virtual credits. This is a 5×4, 1024-ways slot. Features:
- Kraken Attack (random wilds)
- Cursed Coins Hold & Win, with Collector, ×2 and Upgrade coins
- Ghost Ship free spins: choose a ship; walking ghost wilds and a bottle meter
- Optional Pick-a-Chest gamble
- Horde Games network jackpot, **shared with Zombie Horde**

Bets are 0.10–5.00 (default 1.00). Max win is 10,000× bet per round, including the gamble; jackpots are on top.

## RTP by variant (total includes the 2.00% network jackpot)

Primary figures use a decomposed estimate: RTP = base + P(free spins) × E[free spins] + P(Hold & Win) × E[Hold & Win].
- Base game and trigger rates: 30M spins.
- Free spins: 4M simulated features per ship.
- Hold & Win: 3M features per variant, using real triggering coin boards.
- 95% CI ≈ ±0.23%.

| Variant | Game RTP excl. jackpot | Jackpot | **Total, always collect** | Base game (incl. Kraken) | Free spins | Hold & Win | Full-game cross-check, 40M spins (total) |
|---|---|---|---|---|---|---|---|
| 96 (default) | 94.00% | 2.00% | **96.00% ±0.23** | 35.83% | 28.48% | 29.69% | 96.46% ±0.36 |
| 94 | 91.95% | 2.00% | **93.95% ±0.23** | 35.83% | 28.48% | 27.65% | 94.67% ±0.35 |
| 92 | 89.99% | 2.00% | **91.99% ±0.23** | 35.83% | 28.48% | 25.68% | 92.63% ±0.34 |

- **Full-game cross-check**: simulate.js, 2 × 20M spins per variant (seeds 2026 and 777, always collect). It agrees with the decomposed estimate within about 2σ.
  - Full-game runs are heavy-tailed. The two seeds happened to draw free spins slightly above their mean (64.0× and 64.5× against 63.5× ±0.04 from 12M isolated features).
- **Always gamble (3 picks)**, variant 96, 5M spins: game 94.17% ±1.40, total 96.17%. The gamble is RTP-neutral (see below).
- **RTP split (variant 96)**: base game about 37% of total RTP, of which Kraken Attack is 7.8 points. Free spins about 30%, Hold & Win about 31%, jackpot 2%.
- **Variant lever**: the variants differ only in the Hold & Win coin-landing chance. Hit rate, feature frequency and base-game feel are identical.

## Feel (identical in every variant; 40M spins, 96 variant)

| Metric | Value |
|---|---|
| Hit rate (any win) | 18.8% (1 in 5.3) |
| Win above stake | 7.5% (1 in 13.3) |
| Dead spins | 81.2%; average losing streak 5.3 spins, longest seen 76 |
| Win distribution | 0: 81.2% · <1×: 10.6% · 1–2×: 2.5% · 2–5×: 3.4% · 5–20×: 1.6% · 20–100×: 0.66% · 100–1,000×: 0.15% · 1,000×+: 0.001% |
| Volatility | std dev per spin ≈ 11.6× bet, volatility index (1.96·σ) ≈ 23 – HIGH. About 16× with the gamble always taken. |
| Kraken Attack | 1 in 100 spins; average win on a Kraken spin 7.7× |
| Free spins | 1 in 223 spins; average 11.0 spins played; average 63.5×, median 26×, p10 1.5×, p90 160×, p99 555×; 100×+ in 18%, 1,000×+ in 0.22% |
| Ship EV (4M features each) | Sloop 63.62× · Frigate 63.54× · Galleon 63.45× (±0.07) – equal within 0.3% |
| Ship feel | Sloop: steady (12 spins, ×2). Galleon: wild ride (7 spins, ×5). The meter upgrades 0/1/2/3+ times in 45% / 39% / 12% / 3.5% of features. |
| Hold & Win | 1 in 230 spins |
| Hold & Win win, variant 96 | average 68.2×, median 48×, p10 20×, p90 128×, p99 357×; 100×+ in 16.5% |
| Hold & Win win, variant 94 | average 63.5×, median 45× |
| Hold & Win win, variant 92 | average 59.0×, median 42× |
| Full ship (all 20 coins, +500×) | about 1 in 159,000 spins (96) · 1 in 230,000 (94) · 1 in 435,000 (92) |
| Wins ≥ 1,000× | about 1 in 78,000 spins (96, collect); 1 in 27,000 always gambling |
| Max win seen | 3,926× (collect) and 6,803× (always gamble) in 125M simulated spins |
| 10,000× cap | Not reached in 125M spins. The cap is a safety limit, not a realistic outcome. |

## Sessions (1,000 credits, up to 500 spins, incl. jackpot draws; 20,000 sessions per stake, always collect)

| Variant | Bet 1: finish up | Bet 1: median end | Bet 2: finish up | Bet 2: median end | Bet 5: finish up | Bet 5: bust | Bet 5: median end | Bet 5: reach +10,000 |
|---|---|---|---|---|---|---|---|---|
| 96 | 35.3% | 921 | 35.0% | 838 | 33.8% | 32.2% | 522 | 0.10% |
| 94 | 33.2% | 911 | 33.3% | 815 | 32.4% | 33.0% | 483 | 0.10% |
| 92 | 31.2% | 902 | 31.5% | 802 | 30.5% | 34.5% | 437 | 0.07% |

At 1.00 stake nobody busts within 500 spins (1,000 credits covers 1,000 spins). At 5.00 stake, about a third of sessions bust, while a third finish ahead.

## Game rules used by the maths

- **Grid**: 5 reels × 4 rows, 1024 ways (left to right, adjacent reels from reel 1). Each cell is a weighted draw. At most one bottle (scatter) per reel. WILD never lands on reel 1. Reel weights are staggered per reel (reel bias).
- **Pays** (× total bet, per way; 3/4/5 of a kind):

| Symbol | 3 | 4 | 5 |
|---|---|---|---|
| Rum, Compass | 0.1 | 0.3 | 1 |
| Anchor, Pistol | 0.1 | 0.4 | 1.2 |
| Parrot | 0.3 | 0.8 | 2.5 |
| Skeleton | 0.4 | 1 | 4 |
| Siren | 0.5 | 1.5 | 6 |
| Captain | 1 | 3 | 12 |
| Bottle (scatter, anywhere) | 2 | 10 | 50 |

- **Base weights**: Rum 100, Compass 100, Anchor 90, Pistol 90, Parrot 46, Skeleton 38, Siren 30, Captain 18, Wild 3.4, Bottle 12, Cursed Coin 48.
- **Kraken Attack**: 1 in 100 base spins. 2–4 wilds smash onto reels 2–5 before evaluation.
- **Free spins** (3+ bottles): the player chooses a ship. Every ship's expected value is equal within the simulation error.

| Ship | Spins | Ghost-wild multiplier | Free-spins wild weight |
|---|---|---|---|
| Sloop | 12 | ×2 | 7.0 |
| Frigate | 9 | ×3 | 7.47 |
| Galleon | 7 | ×5 | 7.1 |

  - Ghost wilds stay on the reels and move one reel left before each spin. A wild that walks off reel 1 is gone.
  - Bottle meter: every 3 bottles collected gives +2 spins and +1 to the wild multiplier. 3+ bottles on one spin gives +5 spins.
  - Free-spins weights are the same lows, plus Parrot 50, Skeleton 42, Siren 34, Captain 22, Bottle 9, no coins.
- **Cursed Coins Hold & Win** (6+ coins in the base game): 3 respins, reset on every new coin. Full board (20) pays +500× bet.
  - Coin values (× bet): 1, 2, 3, 5, 8, 10, 15, 25, 50, 100, with weights 300, 250, 170, 110, 62, 45, 25, 13, 5, 1.2.
  - Special coins (share of landed coins): Collector 4.5%, ×2 3%, Upgrade 4.5%. They resolve in the order upgrades → ×2 → collectors.
  - Chance each empty spot lands a coin per respin is **the only lever between RTP variants**: 96 → 0.0533, 94 → 0.0498, 92 → 0.0462. Base game, free spins, hit rate and feel are identical in every variant.
- **Max win**: 10,000× bet per round, including the gamble. Jackpots are on top. Stakes run 0.10–5.00 (default 1.00).
- **RNG**: mulberry32, seeded (`?seed=`). All outcomes come from engine.js. The UI only presents them.

## Pick-a-Chest gamble

This is offered after a Hold & Win or free-spins win. The player can COLLECT or open one of 3 chests. The outcome is drawn by `engine.gamblePick` from the seeded RNG; the chest touched only decides where the result is shown.

| Outcome | Probability |
|---|---|
| ×2 | 20% |
| ×1 | 40% |
| ×½ | 40% |

- EV per pick = 0.2×2 + 0.4×1 + 0.4×0.5 = **1.00**, so the gamble is RTP-neutral.
- The player gets up to 3 picks and can collect at any time.
- Each result is floored to the cent and capped at the room left under 10,000× bet. That cap and the rounding make it very slightly house-favourable.
- The gamble is not offered in autoplay (autoplay always collects). The odds are shown on the gamble screen and in the help.

## Bonus buy – OFF by default (UK)

**The UK Gambling Commission bans bonus buy (feature purchase) in Great Britain.** The option exists only in config (`CONFIG.bonusBuy.enabled = false`). `?bonusbuy=1` shows it for non-UK demo pitching only.

| Buy | Price (× bet) | Feature EV | Buy RTP (excl. jackpot) |
|---|---|---|---|
| Ghost Ship Free Spins (any ship) | 67 | 63.5× | 94.8% |
| Hold & Win, 6 random coins – variant 96 | 72 | 68.0× | 94.4% |
| Hold & Win – variant 94 | 67 | 63.4× | 94.6% |
| Hold & Win – variant 92 | 62 | 58.6× | 94.6% |

Buy EVs come from 400k simulated bought features per variant (buyev.js). Bought spins do not contribute to or trigger the network jackpot in this demo.
## Horde Games network jackpot (shared by all Horde Games slots – the same pools as Zombie Horde)

Stake-weighted random trigger on every paid spin: P(tier) = stake × odds per 1.00 staked; one draw
for "any jackpot", then the tier by weight. 2.00% of every stake is contributed (0.85% grows the pools,
1.15% seed reserve funds the reset values) – all of it returns to players as jackpot RTP.

| Tier | Seed | Contribution to pool | Seed reserve | Odds per 1.00 staked | Avg prize at drop | RTP share |
|---|---|---|---|---|---|---|
| MINI | 10 | 0.20% | 0.50% | 1 in 2,000 | 14 | 0.70% |
| MINOR | 50 | 0.25% | 0.25% | 1 in 20,000 | 100 | 0.50% |
| MAJOR | 500 | 0.20% | 0.20% | 1 in 250,000 | 1,000 | 0.40% |
| GRAND | 10,000 | 0.20% | 0.20% | 1 in 5,000,000 | 20,000 | 0.40% |
| **Total** | | 0.85% | 1.15% | 1 in 1,804 (any tier) | | **2.00%** |

Odds per spin by stake (1 in N spins):

| Stake | MINI | MINOR | MAJOR | GRAND | Any |
|---|---|---|---|---|---|
| 0.10 | 20,000 | 200,000 | 2,500,000 | 50,000,000 | 18,044 |
| 0.20 | 10,000 | 100,000 | 1,250,000 | 25,000,000 | 9,022 |
| 0.50 | 4,000 | 40,000 | 500,000 | 10,000,000 | 3,609 |
| 1.00 | 2,000 | 20,000 | 250,000 | 5,000,000 | 1,804 |
| 2.00 | 1,000 | 10,000 | 125,000 | 2,500,000 | 902 |
| 5.00 | 400 | 4,000 | 50,000 | 1,000,000 | 361 |

Expected time to drop (network-wide, any player): depends only on total network turnover.

| Network turnover | MINI | MINOR | MAJOR | GRAND |
|---|---|---|---|---|
| 25 credits/s (demo simulation) | 80 s | 13.3 min | 2.8 h | 2.3 days |
| 100 credits/s | 20 s | 3.3 min | 41.7 min | 13.9 h |
| 1,000 credits/s | 2 s | 20 s | 4.2 min | 83.3 min |

One player spinning non-stop (~4 s per spin incl. animations):

| Stake | MINI | MINOR | MAJOR | GRAND |
|---|---|---|---|---|
| 1.00 | 2.2 h | 22.2 h | 11.6 days | 231.5 days |
| 5.00 | 26.7 min | 4.4 h | 2.3 days | 46.3 days |

The Captain's Vault pick game (12 chests, 3 tokens per tier, first to 3 matches wins) is presentation only – the tier is already
decided by the draw; see horde-jackpot/README.md and JACKPOT_SPEC.md.

## Reproduce (private workspace scripts)

```
node simulate.js 20000000 2026 96 20000 collect   # full game + session study
node simulate.js 20000000 777 96 0 collect        # second seed
node simulate.js 5000000 7796 96 0 pick3          # always take 3 gamble picks
node precise.js base 30000000                     # base RTP + trigger rates
node precise.js fs 96 3000000 <ship 0|1|2> [seedOffset]
node precise.js hold <96|94|92> 3000000
node buyev.js                                     # bonus-buy EVs
```

Payout parity between the UI and the engine is checked with gs-harness/drive.js. It drives the real game.js in jsdom with:
- 4 × 3,000 spins
- variants 96/94/92
- stakes 0.10 / 0.50 / 1.00 / 5.00
- real gamble clicks (149 picks)
- forced jackpots every 120–150 spins

Result: **0 payout mismatches** and no script errors.
