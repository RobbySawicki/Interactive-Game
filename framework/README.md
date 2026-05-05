# Campaign framework

A starting point for any **iPad × LED truck / projection** activation that follows the same pattern as the OREO demo: one player-facing iPad surface, one (or two) spectator LED surface(s), live cross-device sync, optional session leaderboard.

## What's here

```
framework/
  README.md               ← you are here
  PLAYBOOK.md             ← step-by-step: how to spin up a new campaign
  INTAKE-SHEET.md         ← human-facing brief — give to client / AE to fill out
  CREATIVE-BRIEF.md       ← technical brief — paste into Claude Code to scaffold a campaign
  template/               ← the campaign skeleton you copy to start
    README.md
    campaign.config.js    ← brand, copy, assets, surface dimensions
    firebase-config.js    ← drop your Firebase project's web config here
    shared.jsx            ← framework primitives (sync bus, leaderboard, scaler) — DON'T edit
    ipad/
      index.html
      interaction.jsx     ← THE MECHANIC — swap this for your campaign
    truck/
      index.html
      hud.jsx             ← THE TRUCK VISUAL — swap this for your campaign
    assets/               ← drop logo / background / hero art here
```

## How a new campaign works

1. Copy `framework/template/` to `<client-code>/` at the repo root.
2. Replace `campaign.config.js` (brand, copy, assets) and drop assets in `assets/`.
3. Wire a Firebase project into `firebase-config.js` (same pattern as OREO).
4. Replace `ipad/interaction.jsx` and `truck/hud.jsx` with the actual mechanic. **This is the only real "code" you write per campaign** — everything else is config.
5. Push to `main`. GitHub Pages serves it at `/<client-code>/ipad/` and `/<client-code>/truck/`.

For step 4, the recommended flow is:

> 1. Send `framework/INTAKE-SHEET.md` to the client (or have your AE / creative lead fill it out together with them).
> 2. Translate the answers into `framework/CREATIVE-BRIEF.md` — usually a quick reformatting; Claude Code can do this for you too.
> 3. Paste the filled brief into Claude Code with: *"Scaffold a new campaign at `<client-code>/` based on `framework/template/` and this brief."*
> 4. Smoke test the result, iterate on the mechanic.

See [PLAYBOOK.md](./PLAYBOOK.md) for the detailed walkthrough.

## What the framework gives you for free

- **Cross-device sync** — Firebase Realtime DB if configured, BroadcastChannel fallback for local previews. Same event API on both.
- **Session leaderboard** — `localStorage`-backed, broadcast across devices, with a persistent right-rail UI on the truck (opt-out via config).
- **Phase orchestration** — truck listens for `start` / `hit` / `end` events and switches between `attract` / `live` / `end` views automatically; falls back to attract after 8s of no events.
- **Panel scaler** — render at the LED's native pixel dimensions (e.g. 1007×432), auto-fits the actual viewport while keeping aspect ratio.
- **Brand tokens** — palette + fonts read from `campaign.config.js`, available everywhere as `window.CAMPAIGN.BRAND`.

## What the framework does NOT do

- **Email capture / SMS / payments** — build per-campaign as needed (Firebase Cloud Functions + Resend / Mailgun is the easiest path).
- **Specific game mechanics** — the template ships with a tiny "tap to score" stub. Build your real mechanic in `interaction.jsx` + `hud.jsx`.
- **Asset pipeline** — drop pre-sized images directly into `assets/`. No build step.
- **Authentication** — assumes a curated event environment. Don't ship sensitive flows on the open web without adding auth.
