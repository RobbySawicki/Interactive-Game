# Campaign skin — quick start

Every campaign hub page should reuse the shared skin so the system feels like one product.

## Boilerplate

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>YOUR CAMPAIGN — Interactive Media</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/skin.css" />
</head>
<body data-campaign="YOUR_CODE" data-campaign-tag="CAMPAIGN">
  <main class="shell">
    <div class="stack">
      <div>
        <div class="eyebrow">Campaign · Live</div>
        <h1 class="display">Your title <em>here</em>.</h1>
      </div>
      <p class="lede">One-line description.</p>

      <div class="hub-grid">
        <a class="hub-card" href="...">
          <div class="idx"><span>01 · LABEL</span>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M5 11L11 5M6 5h5v5" stroke-linecap="square"/>
            </svg>
          </div>
          <div class="name">Surface name</div>
          <div class="desc">What this view is for.</div>
          <span class="tag">Aspect · Modifier</span>
        </a>
      </div>

      <div class="rail">
        <div class="left">CAMPAIGN · YOUR_CODE</div>
        <div class="center"><span class="dot"></span> N surfaces · synced</div>
        <div class="right"><a class="back-link" href="/">Back to access</a></div>
      </div>
    </div>
  </main>
  <script src="../assets/campaign-shell.js"></script>
</body>
</html>
```

## What you get for free

- `<div class="frame">` + four corner ticks — drawn by `campaign-shell.js`
- Top bar: brand mark + campaign code + live UTC clock
- Bottom bar: copyright + locale
- Grain overlay, tokens, type system

## Available classes

- `main.shell` + `.stack` — page container
- `.eyebrow` — small accent label above headlines
- `h1.display` — large display headline (use `<em>` for italic serif emphasis)
- `.lede` — intro paragraph
- `.hub-grid` + `a.hub-card` (`.idx`, `.name`, `.desc`, `.tag`) — surface cards
- `.rail` (3-col) — bottom status row, with `.left`/`.center`/`.right`
- `.ticker` + `.ticker-track > span` — auto-scrolling marquee
- `.back-link` — small back arrow link

## Tokens (override per-campaign if needed)

```css
:root {
  --accent: oklch(0.86 0.19 110); /* swap hue per campaign */
}
```
