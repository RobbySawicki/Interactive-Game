# OREO × Spider-Man — Sling The Stuf

Two-screen activation: an **iPad** the player holds, and a **truck-side LED panel** that hypes the spectators. Plus a **side-by-side preview page** so you can see them running together in one tab.

## Folders / URLs

After deploying, your URLs are:

| Path | What it is |
|---|---|
| `/preview-side-by-side.html` | Combined preview — iPad + truck mocked together, sync live |
| `/ipad/` | The slingshot game (touch/drag-and-fling, 30s sprint, name entry, session leaderboard) |
| `/truck/` | Truck **side** LED panel (1007×432) — live score, combo, reaction word, leaderboard |
| `/truck/?panel=rear` | Truck **rear** LED panel (square) — QR + comic burst |

All three pages share state on the same origin via `BroadcastChannel` + `localStorage`. Open them in different tabs of the same browser and they sync in real time.

## Deploy to GitHub Pages (5 min)

1. Drop the entire contents of this folder into your repo (so `ipad/`, `truck/`, `preview-side-by-side.html`, and this README live at the repo root — or under whatever subfolder you want).
2. Push to `main`.
3. Repo → **Settings → Pages** → Source: **Deploy from a branch**, Branch: `main`, Folder: `/ (root)`. Save.
4. Wait ~1 min. URLs become:
   - `https://<user>.github.io/<repo>/preview-side-by-side.html`
   - `https://<user>.github.io/<repo>/ipad/`
   - `https://<user>.github.io/<repo>/truck/`
   - `https://<user>.github.io/<repo>/truck/?panel=rear`

That's it. No build step, no server.

## Cross-device sync (production)

The current sync is **same-browser only** (BroadcastChannel + localStorage). Fine for a same-screen demo, the side-by-side preview page, or running the truck laptop and iPad as two tabs on one machine plugged into the screens.

For real activation use — iPad in a player's hand on one device, truck laptop on another, possibly different networks — swap the bus implementation in `game-shared.jsx` for Firebase Realtime DB or Supabase. ~20 lines of code, free tier covers it. The rest of the codebase (event names, payloads, leaderboard schema) stays identical.

## Session leaderboard

- Persists in `localStorage` under key `oreo-stuf-of-legends:leaderboard`.
- Top 50 scores kept; UI shows top 3 (truck) / top 5 (iPad end screen) / top 5 (truck live rail).
- To wipe the board: open the site, devtools console, run `clearLeaderboard()`.
- To wipe by hand: clear site data for the page in browser settings.

## Game tweaks

The iPad page has a built-in **Tweaks** panel (bottom-right, hidden by default — toggle with the toolbar control or set `?tweaks=1`). Sliders cover throw power, target speed, gravity, and a drag-hint toggle. Useful for on-site dialing.

## File map

```
preview-side-by-side.html   ← combined preview (iPad + truck on one page)
README.md
ipad/
  index.html                ← player-facing page
  ipad-game.jsx             ← game logic, slingshot input, name entry, end screen
  game-shared.jsx           ← bus + leaderboard + brand tokens (also in truck/)
  tweaks-panel.jsx          ← optional in-game tweak panel
  assets/                   ← cookies, lockups, halftone, QR, etc
truck/
  index.html                ← truck LED page (?panel=rear for square)
  truck-display.jsx         ← side panel + rear panel components
  game-shared.jsx           ← identical copy of ipad/game-shared.jsx
  assets/                   ← same brand assets
```

`game-shared.jsx` is duplicated across `ipad/` and `truck/` so each folder is self-contained and Pages-deployable on its own. If you edit one, copy to the other.
