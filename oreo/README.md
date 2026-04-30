# Interactive-Game

OREO × Marvel "Stuf of Legends" — iPad slingshot game with synced LED truck spectator screens.

## Play

Push to GitHub → enable Pages on `main` branch (root folder).

- **iPad URL:** `https://<you>.github.io/Interactive-Game/ipad/`
- **Truck URL:** `https://<you>.github.io/Interactive-Game/truck/`

Open both URLs side-by-side on the same browser to see the sync demo. The page contains the full prototype canvas with autoplay demo + tweakable controls.

## Files in this repo

| Path | What it is |
|---|---|
| `ipad/index.html` | Standalone bundled game (single 1.6 MB file, all assets inlined) |
| `truck/index.html` | Same bundled file — same prototype canvas, mirrored URL |
| `assets/` | Original OREO × Marvel campaign assets (raw) |
| `shared/firebase-config.js` | Stub for production sync (see `docs/firebase-setup.md`) |

## Local dev

Just open `ipad/index.html` in a browser. No build step.

## Real two-device deployment

The current build syncs iPad ↔ truck via `BroadcastChannel`, which only works on the **same browser**. For a real deployment (iPad in someone's hand, truck laptop on a different network), swap to Firebase — see `docs/firebase-setup.md`. ~30 lines of code.
