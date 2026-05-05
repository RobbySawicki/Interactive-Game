# `<your-campaign>/`

> This folder is a copy of `framework/template/`. Rename it to your campaign code (e.g. `tarot-2026/`) and follow [framework/PLAYBOOK.md](../framework/PLAYBOOK.md).

## Files you edit

| File | What goes here |
|---|---|
| `campaign.config.js` | Brand palette, fonts, copy, asset filenames, truck dimensions, feature flags |
| `firebase-config.js` | Your Firebase project's web config (paste from Firebase console) |
| `assets/` | Logo, background, hero art, etc. |
| `ipad/interaction.jsx` | The mechanic — what the player does on the iPad |
| `truck/hud.jsx` | The spectator visual on the truck side panel |

## Files you do NOT edit

- `shared.jsx` — sync bus, leaderboard, panel scaler, brand helper. Bug fixes to this should land in `framework/template/shared.jsx` and be re-copied across campaigns.
- `ipad/index.html`, `truck/index.html` — thin loaders. Edit only if you need to add a Google Fonts `<link>` for a new font.

## Quick API reference (available inside `interaction.jsx` and `hud.jsx`)

```js
const {
  CFG,             // entire campaign.config.js
  BRAND,           // CFG.brand
  COPY,            // CFG.copy
  ASSETS,          // CFG.assets
  asset,           // asset('logo') → resolved URL
  sendSync,        // sendSync({ type, ...payload })
  useSync,         // useSync(handler) — React hook
  useLeaderboard,  // useLeaderboard(limit) — React hook returning [{ name, score }]
  recordScore,     // recordScore(name, score) — persist + broadcast
  PanelScaler,     // <PanelScaler designW={1007} designH={432}>
} = window.CAMPAIGN;
```

### Recommended event vocabulary

```js
sendSync({ type: 'start',  player: 'ALEX' });
sendSync({ type: 'hit',    totalScore: 42, player: 'ALEX', sfx: 'BOOM!', points: 10 });
sendSync({ type: 'end',    totalScore: 87, player: 'ALEX' });
```

The default `truck/hud.jsx` listens for these. If your mechanic needs different events (e.g. `cardSelected` for tarot), define them yourself — both files own that contract together.
