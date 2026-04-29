# Interactive-Game

iPad-played marketing game that streams live results to an LED truck display.

## How it works

```
iPad (game)  ──write──▶  Firebase Realtime DB  ──listen──▶  Truck laptop (LED)
```

1. A player taps targets on the iPad in a 30-second round.
2. Every hit writes a new score to a single Firebase node.
3. The truck's webpage subscribes to that node and re-renders instantly.

## Project layout

```
ipad/index.html    → fullscreen Phaser game (open on iPad in Safari)
truck/index.html   → fullscreen LED display (open on truck laptop in Chrome)
shared/firebase-config.js → Firebase credentials + session ID, used by both
```

## Setup

1. **Firebase project** — Create one at https://console.firebase.google.com.
   - Enable **Realtime Database** (test mode is fine for a demo event).
   - Add a Web app, copy the config snippet into `shared/firebase-config.js`.
2. **Host the files** — Anywhere static: GitHub Pages, Vercel, Netlify, Firebase Hosting. Both pages must be on `https://` for Safari to allow Firebase.
3. **iPad** — Open `https://your-host/ipad/` in Safari → "Add to Home Screen" → launch from the home-screen icon for fullscreen.
4. **Truck laptop** — Plug into the LED via HDMI, open `https://your-host/truck/` in Chrome, press F11 for fullscreen.

## Local testing

Any static server works, e.g.:

```
npx serve .
```

Open `http://localhost:3000/ipad/` and `http://localhost:3000/truck/` in two browser windows side-by-side.

## Tuning for the LED

LED trucks often have non-standard pixel dimensions (e.g. 1920×480). Adjust `truck/index.html`:

- The font sizes already scale with viewport width (`vw` units).
- For a wide-short panel, swap the headline + score from a vertical stack to a horizontal one in the `#stage` flex layout.

## Production hardening (when you're ready)

- Lock down Realtime Database rules — currently anyone with the URL can write.
- Add a 5G hotspot fallback router on the truck.
- Pre-cache the truck page so it survives a brief disconnect (the demo loop already covers this).
- Generate a unique `SESSION_ID` per event so multiple trucks/games don't collide.
