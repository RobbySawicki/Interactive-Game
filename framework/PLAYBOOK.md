# Playbook — spinning up a new campaign

Target: a working iPad × truck campaign deployed in **under a day** from a creative brief, assuming assets are ready.

---

## 1. Copy the template

From the repo root:

```bash
cp -r framework/template <client-code>
```

Pick a `<client-code>` that's lowercase-hyphenated and unique (e.g. `nike-airlock`, `tarot-2026`). It becomes the deploy URL path: `https://<your-user>.github.io/Interactive-Game/<client-code>/ipad/`.

## 2. Set up Firebase (5 min, one-time per campaign)

1. https://console.firebase.google.com → **Add project** (free).
2. Inside: **Build → Realtime Database → Create database** → start in **test mode**.
3. **Project Settings → Your apps → `</>`** → register a Web app → copy the `firebaseConfig` snippet.
4. Paste those values into `<client-code>/firebase-config.js` (replace the `YOUR_*` placeholders).
5. In `<client-code>/campaign.config.js`, set `sync.sessionId` to something unique per campaign (e.g. `'tarot-2026'`) so multiple campaigns can share one Firebase project without colliding.

> Tip: if the same client runs multiple activations, use one Firebase project and just bump `sessionId` per campaign.

## 3. Configure the campaign

Edit `<client-code>/campaign.config.js`:

- **`brand.palette`** — primary / accent / ink / paper / bg colors.
- **`brand.fonts`** — display (logo / hero text) and ui (body) font stacks. Add Google Fonts `<link>` tags in the `index.html` files if needed.
- **`copy`** — headline, subhead, CTA, end line, SFX vocabulary.
- **`assets`** — filenames for logo / background / etc. (must exist in `<client-code>/assets/`).
- **`truck.side` / `truck.rear`** — pixel dimensions of the actual LED panels.
- **`features.leaderboard`** — set `false` if your mechanic isn't score-based (e.g. tarot, photo booth).

## 4. Drop the assets in

Put images, sounds, etc. into `<client-code>/assets/`. Reference them from `campaign.config.js` by filename.

## 5. Build the mechanic

This is the only real coding per campaign. You touch two files:

- **`<client-code>/ipad/interaction.jsx`** — what the player does (slingshot, tarot pick, trivia, photo, vote, sign-up, etc.).
- **`<client-code>/truck/hud.jsx`** — what the spectator sees on the truck side panel.

They communicate over the sync bus using these helpers (already wired up):

```js
const { sendSync, useSync, useLeaderboard, recordScore, BRAND, COPY, ASSETS, asset } = window.CAMPAIGN;

sendSync({ type: 'start',  player });                            // player begins a round
sendSync({ type: 'hit',    totalScore, player, sfx, points });   // an action fired
sendSync({ type: 'end',    totalScore, player });                // round complete
recordScore(player, finalScore);                                  // persist to leaderboard
```

The truck `hud.jsx` listens to those events and updates its display.

### Fastest path: brief Claude Code

1. Fill in **`framework/CREATIVE-BRIEF.md`** with the client's direction.
2. In Claude Code, run something like:

   > Scaffold a new campaign at `<client-code>/` based on `framework/template/` and the attached creative brief. Replace `interaction.jsx` and `hud.jsx` with implementations of the described mechanic. Keep `shared.jsx` untouched.

3. Iterate on the result — Claude Code can read the OREO `oreo/ipad/ipad-game.jsx` and `oreo/truck/truck-display.jsx` as reference implementations of a richer mechanic.

## 6. Smoke test locally

1. Open `<client-code>/ipad/index.html` in one browser tab.
2. Open `<client-code>/truck/index.html` in a second tab.
3. Trigger the iPad mechanic. Confirm the truck reacts.

(Without Firebase configured, this works same-browser via BroadcastChannel. With Firebase configured, open them on different devices to test cross-device sync.)

## 7. Ship it

```bash
git add <client-code>/
git commit -m "Add <client-code> campaign"
git push
```

GitHub Pages redeploys automatically. URLs:

- `https://<your-user>.github.io/Interactive-Game/<client-code>/ipad/`
- `https://<your-user>.github.io/Interactive-Game/<client-code>/truck/`
- `https://<your-user>.github.io/Interactive-Game/<client-code>/truck/?panel=rear` *(if your `hud.jsx` supports it)*

## 8. After the event

- Tighten Firebase rules: change the open `now < <timestamp>` rule to require auth, or delete the database.
- Optionally archive the campaign folder by moving it to `archive/<client-code>/`.

---

## Adding optional features

### Email capture

The framework doesn't ship with this — wire it up per campaign:

1. Add a Firebase Cloud Function that takes `{ to, subject, html }` and calls Resend / Mailgun / SendGrid.
2. From `interaction.jsx`, on round complete, call the function with the player's email + a generated message/image.

### Image generation (e.g. tarot card pick → personal email)

Two options:

- **Static asset library** — pre-render every possible card / variant, ship them in `assets/`, email by reference.
- **Server-side render** — Cloud Function that composites + uploads to Firebase Storage, then emails the URL.

### SMS / QR follow-up

Truck rear panel already supports a static QR. Drop your URL into `campaign.config.js` → `features.qrUrl`.
