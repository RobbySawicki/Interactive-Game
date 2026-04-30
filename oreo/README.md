# Interactive-Game

OREO × Marvel "Stuf of Legends" — iPad slingshot game with a synced LED truck spectator screen.

## What's deployed

| URL | What you see | Where it runs |
|---|---|---|
| `/ipad/` | **The slingshot game.** Full-bleed Marvel comic background, drag-back-and-release input, 30-second sprint, unlimited cookies, combo multiplier. Touch-only, locks scroll, no UI chrome. | Player's iPad in the activation booth |
| `/truck/` | **Side LED panel.** Big live score (left 75%), `×combo` + reaction word ("AMAZING!", "POW!", "LEGENDARY!"), live leaderboard (right 25%). Letterboxes to native 1007×432 banner aspect on any screen. | Truck-side laptop fullscreen, HDMI to LED side panels (×2) |
| `/truck/?panel=rear` | **Rear LED panel.** Static comic-burst frame with "SCAN TO HELP SAVE THE UNIVERSE" wrapping a sample QR. Letterboxes to 432×432 square. | Rear-square LED panel |

Each page is a single self-contained HTML file (~1.6 MB, all assets inlined). No build step. No backend. Open and play.

## Sync

For local demo (same browser, two tabs side-by-side), the iPad and truck pages already sync via `BroadcastChannel`.

For production (iPad in someone's hand, truck laptop on a different network), swap to Firebase — see `docs/firebase-setup.md`. ~30 lines of code, free tier covers it.

## GitHub Pages setup

1. Repo → **Settings → Pages**
2. **Source:** Deploy from branch · **Branch:** `main` · **Folder:** `/ (root)` → **Save**
3. Wait ~30 sec. URLs:
   - `https://robbysawicki.github.io/Interactive-Game/ipad/`
   - `https://robbysawicki.github.io/Interactive-Game/truck/`
   - `https://robbysawicki.github.io/Interactive-Game/truck/?panel=rear`

## Files in this repo

| Path | What it is |
|---|---|
| `ipad/index.html` | Standalone fullscreen iPad game |
| `truck/index.html` | Standalone fullscreen LED truck display (side + rear via `?panel=rear`) |
| `assets/` | Original OREO × Marvel campaign assets (raw) |
| `shared/firebase-config.js` | Stub for production sync |
