# Ghost Ship Gold – Horde Games demo

Browser slot prototype. **DEMO ONLY – virtual credits, no real money, no payments, no prizes.**

Haunted-pirate 5×4, 1024-ways slot. High volatility. RTP 96% by default; variants 94% and 92% via `?rtp=94` / `?rtp=92`. Every figure **includes** the 2% Horde Games network jackpot contribution. Full maths in [MATHS_SHEET.md](MATHS_SHEET.md).

## Features
- **Kraken Attack** (random base feature, about 1 in 100 spins): tentacles smash 2–4 ghost wilds onto reels 2–5.
- **Cursed Coins Hold & Win** (6+ coins): 3 respins that reset on every new coin. Special coins: **Collector** (adds all coin values to itself), **×2** (doubles every coin), **Upgrade** (lifts every coin up the value ladder). Fill all 20 spots for +500× bet.
- **Ghost Ship Free Spins** (3+ BONUS ship-in-a-bottle scatters): pick a ship with equal expected value. Sloop gives 12 spins with ×2 wilds, Frigate 9 spins with ×3, Galleon 7 spins with ×5. Ghost wilds stay on the reels and drift one reel left each spin. A bottle meter gives +2 spins and +1 to the wild multiplier for every 3 bottles.
- **Horde Games network jackpot** (Mini / Minor / Major / Grand): this uses the shared `jackpot.js` module unchanged, with storage key `hordeJackpotNet`. The pools are therefore **shared with Zombie Horde** when both games are served from the same origin (denmcb81.github.io). A jump-scare leads into the Captain's Vault pick screen, where 3 matching tokens win that tier.
- **Pick-a-Chest gamble** (optional, after a feature win): ×2 with 20% chance, ×1 with 40%, ×½ with 40%. It is RTP-neutral and the odds are shown on screen.
- **Bonus buy**: present in the config but **OFF by default**, because the UK bans it. `?bonusbuy=1` shows it for demo pitching only.
- UK stake range is 0.10–5.00. Max win is 10,000× bet. Seeded RNG (`?seed=`). Responsive for desktop and phone. Supports reduced motion. Music and effects can be toggled.

## Files
- `engine.js`: pure maths engine, shared by the game and the simulators.
- `game.js`: UI and presentation.
- `jackpot.js`: shared network jackpot module (do not edit).
- `index.html`, `style.css`, `assets/`.

## Credits
- Art and audio were generated for this prototype (art via image generation, audio via ElevenLabs).
- Fonts: Pirata One and Cinzel, both from Google Fonts, under the SIL Open Font License 1.1 (https://openfontlicense.org).

Prototype for pitching purposes. Not a gambling product.
