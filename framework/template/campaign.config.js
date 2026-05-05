// campaign.config.js
// Brand, copy, assets, and feature flags for this campaign. Edit freely.
// Loaded BEFORE shared.jsx — the framework reads from window.CAMPAIGN_CONFIG.

window.CAMPAIGN_CONFIG = {
  // Used as the BroadcastChannel name and (with sync.sessionId) the Firebase
  // path. Must be unique per campaign.
  code: 'YOUR_CAMPAIGN',
  name: 'Your Campaign Name',

  brand: {
    palette: {
      primary: '#0066CC',   // hero / brand-defining color
      accent:  '#FFD60A',   // call-out / scores / highlights
      ink:     '#0a0a0a',   // dark text & outlines
      paper:   '#ffffff',   // light text on dark
      bg:      '#0A1A3F',   // page background
    },
    fonts: {
      // Add the matching <link href="https://fonts.googleapis.com/css2?...">
      // tag in ipad/index.html and truck/index.html if loading from Google Fonts.
      display: '"Bangers", Impact, sans-serif',
      ui:      'system-ui, -apple-system, "Segoe UI", sans-serif',
    },
  },

  copy: {
    headline:  'YOUR HEADLINE',
    subhead:   'PUNCHY SUBHEAD',
    cta:       'PLAY ON THE iPAD →',
    endLine:   'SCAN THE BACK FOR MORE!',
    // 3–10 short impact words shown on each hit. The default tap-to-score
    // interaction cycles through these.
    sfx:       ['NICE!', 'BOOM!', 'YES!', 'POW!', 'WOW!'],
  },

  // File names inside this campaign's assets/ folder. asset('logo') resolves
  // to the right URL whether running locally or on Pages.
  assets: {
    logo:       'logo.png',
    background: 'background.jpg',
  },

  // Native pixel dimensions of the LED panels. Most truck rigs use 1007×432
  // for the side and 432×432 for the rear; override here if yours differ.
  truck: {
    side: { width: 1007, height: 432 },
    rear: { width: 432,  height: 432 },
  },

  features: {
    // Persistent top-5 leaderboard rail on the truck side panel.
    // Set to false for non-score mechanics (tarot pick, photo booth, vote, etc.).
    leaderboard: true,
    // Static QR poster on the rear panel. Set qrUrl to a real link.
    qr:    true,
    qrUrl: 'https://example.com',
  },

  sync: {
    // Isolates this campaign's events on Firebase. Change per campaign even
    // when reusing the same Firebase project.
    sessionId: 'your-campaign',
  },
};
