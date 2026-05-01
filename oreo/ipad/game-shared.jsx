// game-shared.jsx
// Shared utilities for the OREO "Stuf of Legends" two-screen game.
// - SyncBus: BroadcastChannel-based pub/sub between iPad <-> Truck (drop-in
//   stand-in for Firebase Realtime DB; in production swap for Firebase).
// - useGameState: in-memory game state + sync.
// - Easing helpers, target generators, point values.
// - Comic-book SFX label component.

// ─────────────────────────────────────────────────────────────────────────────
// Brand tokens (from OREO Stuf of Legends campaign)
// ─────────────────────────────────────────────────────────────────────────────
const BRAND = {
  // Hero blue from the burst / lockup gradient
  blue:        '#00B0FF',
  blueDeep:    '#003E8C',
  blueDark:    '#0A1A3F',
  oreoBlue:    '#0066CC',
  marvelRed:   '#EC1D24',
  cookieBrown: '#3A2418',
  cream:       '#F4E9D0',
  yellow:      '#FFD60A',
  outline:     '#0a0a0a',
  // Type
  display:     '"Bangers", "Boogaloo", Impact, sans-serif',
  ui:          'system-ui, -apple-system, "Segoe UI", sans-serif',
};

// ─────────────────────────────────────────────────────────────────────────────
// Comic SFX vocabulary
// ─────────────────────────────────────────────────────────────────────────────
const SFX_HIT      = ['POW!', 'BAM!', 'WHAM!', 'KAPOW!', 'SOCK!', 'THWACK!', 'SMASH!', 'CRUNCH!'];
const SFX_COMBO    = ['DOUBLE!', 'TRIPLE!', 'COMBO x4!', 'COMBO x5!', 'LEGENDARY!', 'UNSTOPPABLE!'];
const SFX_BIG      = ['STUF OF LEGENDS!', 'SAVED THE UNIVERSE!', 'OREO!'];
const SFX_MISS     = ['WHIFF', 'MISS', '...'];

const pickSfx = (n) => (n >= 5 ? SFX_BIG : n >= 2 ? SFX_COMBO : SFX_HIT)[
  Math.floor(Math.random() * (n >= 5 ? SFX_BIG.length : n >= 2 ? SFX_COMBO.length : SFX_HIT.length))
];

// ─────────────────────────────────────────────────────────────────────────────
// Sync bus — Firebase Realtime DB if configured, BroadcastChannel otherwise.
// Firebase enables cross-device play (iPad + truck on different machines).
// BroadcastChannel keeps the local preview / single-machine demo working.
// ─────────────────────────────────────────────────────────────────────────────
const SYNC_CHANNEL = 'oreo-stuf-of-legends';
const SESSION_ID = window.SYNC_SESSION_ID || 'oreo';

const FB_ENABLED = (() => {
  const cfg = window.FIREBASE_CONFIG;
  return typeof firebase !== 'undefined'
    && cfg
    && typeof cfg.databaseURL === 'string'
    && !cfg.databaseURL.includes('YOUR_');
})();

let __fbDb = null;
function getDb() {
  if (__fbDb) return __fbDb;
  if (!FB_ENABLED) return null;
  if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
  __fbDb = firebase.database();
  return __fbDb;
}

class FirebaseBus {
  constructor() {
    this.listeners = new Set();
    const db = getDb();
    this.eventsRef = db.ref(`sessions/${SESSION_ID}/events`);
    // Only fire callbacks for events created after we attached, so reloads
    // don't replay history.
    const cutoff = Date.now() - 2000;
    this.eventsRef.orderByChild('at').startAt(cutoff).on('child_added', (snap) => {
      const msg = snap.val();
      if (msg) this.listeners.forEach((fn) => fn(msg));
    });
    // Garbage-collect events older than a minute every 30s. Keeps the
    // session/events node small without affecting active gameplay.
    setInterval(() => {
      this.eventsRef.orderByChild('at').endAt(Date.now() - 60000).limitToFirst(50)
        .once('value', (snap) => snap.forEach((c) => c.ref.remove()));
    }, 30000);
  }
  send(msg) {
    const m = { ...msg, at: msg.at || Date.now() };
    this.eventsRef.push(m);
    // Local fan-out for immediate same-tab feedback (matches LocalBus).
    this.listeners.forEach((fn) => fn(m));
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

class LocalBus {
  constructor() {
    this.listeners = new Set();
    try {
      this.bc = new BroadcastChannel(SYNC_CHANNEL);
      this.bc.onmessage = (e) => this.listeners.forEach((fn) => fn(e.data));
    } catch (e) { this.bc = null; }
  }
  send(msg) {
    if (this.bc) this.bc.postMessage(msg);
    this.listeners.forEach((fn) => fn(msg));
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

// Lazily-created single shared bus per page.
let __bus = null;
const getBus = () => (__bus = __bus || (FB_ENABLED ? new FirebaseBus() : new LocalBus()));
// Keep the original class name exported for any code that referenced it.
const SyncBus = LocalBus;

// ─────────────────────────────────────────────────────────────────────────────
// Session leaderboard — stored in localStorage so it persists across reloads
// within the same browser session, and shared between the iPad and truck
// pages on the same origin. Cleared by clearing browser storage / incognito.
// ─────────────────────────────────────────────────────────────────────────────
const LB_KEY = 'oreo-stuf-of-legends:leaderboard';
const LB_MAX = 50; // keep enough history; UI shows top N

function readLeaderboard() {
  // Synchronous read from local cache. When Firebase is enabled, the
  // cache is kept fresh by an onValue subscription set up below.
  try {
    const raw = localStorage.getItem(LB_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(r => r && typeof r.score === 'number' && typeof r.name === 'string');
  } catch (e) { return []; }
}
function writeLeaderboardLocal(rows) {
  try { localStorage.setItem(LB_KEY, JSON.stringify(rows.slice(0, LB_MAX))); } catch (e) {}
}
function recordScore(name, score) {
  const cleaned = (name || '').trim().toUpperCase().slice(0, 14) || 'PLAYER';
  const entry = { name: cleaned, score: Math.max(0, score|0), at: Date.now() };

  // Optimistic local update so the UI updates instantly on the recording device.
  const rows = readLeaderboard();
  rows.push(entry);
  rows.sort((a, b) => b.score - a.score);
  const trimmed = rows.slice(0, LB_MAX);
  writeLeaderboardLocal(trimmed);
  getBus().send({ type: 'leaderboard', rows: trimmed, at: Date.now() });

  // Push to Firebase so other devices see the score. The /scores listener
  // below rebuilds the canonical leaderboard from all scores and overwrites
  // the local cache to keep everyone in sync.
  if (FB_ENABLED) {
    const db = getDb();
    if (db) db.ref(`sessions/${SESSION_ID}/scores`).push(entry);
  }
  return trimmed;
}
function clearLeaderboard() {
  writeLeaderboardLocal([]);
  getBus().send({ type: 'leaderboard', rows: [], at: Date.now() });
  if (FB_ENABLED) {
    const db = getDb();
    if (db) db.ref(`sessions/${SESSION_ID}/scores`).remove();
  }
}
// Keep writeLeaderboard exported for any external callers; routes through
// the Firebase-aware path so it stays consistent.
const writeLeaderboard = writeLeaderboardLocal;

// Subscribe to the canonical Firebase leaderboard. Rebuilds the sorted
// top-N from all pushed scores and broadcasts to local listeners.
if (FB_ENABLED) {
  const db = getDb();
  if (db) {
    db.ref(`sessions/${SESSION_ID}/scores`).on('value', (snap) => {
      const all = [];
      snap.forEach((c) => {
        const v = c.val();
        if (v && typeof v.score === 'number' && typeof v.name === 'string') all.push(v);
      });
      all.sort((a, b) => b.score - a.score);
      const trimmed = all.slice(0, LB_MAX);
      writeLeaderboardLocal(trimmed);
      // Fan out to the React leaderboard hook on every connected page.
      if (__bus) __bus.listeners.forEach((fn) => fn({ type: 'leaderboard', rows: trimmed, at: Date.now() }));
    });
  }
}

// Hook: subscribe to the live leaderboard. Returns the current top-N rows
// and re-renders whenever a new score is recorded (locally or via bus).
// Also listens to the browser 'storage' event so a separate iframe writing
// the LB key wakes us up too.
function useLeaderboard(limit = 5) {
  const [rows, setRows] = React.useState(() => readLeaderboard());
  React.useEffect(() => {
    const off = getBus().on((m) => {
      if (m && m.type === 'leaderboard' && Array.isArray(m.rows)) {
        setRows(m.rows);
      } else if (m && m.type === 'end') {
        // truck side: listen for ends and refresh from storage
        setRows(readLeaderboard());
      }
    });
    const onStorage = (e) => { if (e.key === LB_KEY) setRows(readLeaderboard()); };
    window.addEventListener('storage', onStorage);
    return () => { off(); window.removeEventListener('storage', onStorage); };
  }, []);
  return rows.slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: subscribe to incoming sync messages
// ─────────────────────────────────────────────────────────────────────────────
function useSync(handler) {
  const ref = React.useRef(handler);
  ref.current = handler;
  React.useEffect(() => getBus().on((m) => ref.current && ref.current(m)), []);
}

// ─────────────────────────────────────────────────────────────────────────────
// Target archetypes
// Point values: small/fast = high points, big/slow = low points.
// ─────────────────────────────────────────────────────────────────────────────
const TARGETS = [
  { kind: 'venom-big',   img: 'assets/cookie-venom.png',  size: 200, points: 50,  speedMul: 0.6, weight: 5 },
  { kind: 'venom-mid',   img: 'assets/cookie-venom.png',  size: 140, points: 100, speedMul: 1.0, weight: 4 },
  { kind: 'venom-small', img: 'assets/cookie-venom.png',  size: 90,  points: 250, speedMul: 1.6, weight: 2 },
  { kind: 'cap-bonus',   img: 'assets/cookie-cap.png',    size: 110, points: 500, speedMul: 1.3, weight: 1, bonus: true },
];

const pickTargetKind = () => {
  const total = TARGETS.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of TARGETS) { r -= t.weight; if (r <= 0) return t; }
  return TARGETS[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// SfxLabel — bouncing comic onomatopoeia
// ─────────────────────────────────────────────────────────────────────────────
function SfxLabel({ text, x, y, color = '#FFD60A', stroke = '#0a0a0a', size = 64, life = 900, rot = 0 }) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const e = (now - start) / life;
      setT(Math.min(1, e));
      if (e < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [life]);
  // pop-in (0..0.2), hold, fade-out (0.7..1)
  const pop = t < 0.18 ? 1 - Math.pow(1 - t / 0.18, 3) : 1;
  const scale = 0.4 + pop * 0.7 + (t > 0.18 && t < 0.35 ? Math.sin((t - 0.18) * 30) * 0.04 : 0);
  const opacity = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
  const dy = -t * 30;
  return (
    <div style={{
      position: 'absolute', left: x, top: y + dy, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`,
      color, fontFamily: BRAND.display, fontSize: size, fontWeight: 900, letterSpacing: '0.02em',
      WebkitTextStroke: `${Math.max(2, size / 18)}px ${stroke}`,
      textShadow: `4px 4px 0 ${stroke}`,
      opacity, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 100,
      textTransform: 'uppercase',
    }}>{text}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Particle burst (web/cookie crumbs on hit)
// ─────────────────────────────────────────────────────────────────────────────
function useParticles() {
  const [parts, setParts] = React.useState([]);
  const idRef = React.useRef(0);
  const burst = React.useCallback((x, y, opts = {}) => {
    const n = opts.count || 18;
    const color = opts.color || '#fff';
    const newParts = Array.from({ length: n }, () => ({
      id: ++idRef.current,
      x, y,
      vx: (Math.random() - 0.5) * (opts.spread || 16),
      vy: (Math.random() - 1) * (opts.upward || 14),
      life: 1,
      color,
      size: 4 + Math.random() * (opts.size || 8),
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 20,
    }));
    setParts((p) => [...p, ...newParts]);
  }, []);
  React.useEffect(() => {
    let raf;
    const tick = () => {
      setParts((ps) =>
        ps
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.6,
            vx: p.vx * 0.99,
            rot: p.rot + p.vrot,
            life: p.life - 0.02,
          }))
          .filter((p) => p.life > 0)
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return [parts, burst];
}

// Export
Object.assign(window, {
  BRAND, SFX_HIT, SFX_COMBO, SFX_BIG, SFX_MISS, pickSfx,
  SyncBus, getBus, useSync,
  readLeaderboard, writeLeaderboard, recordScore, clearLeaderboard, useLeaderboard,
  TARGETS, pickTargetKind,
  SfxLabel, useParticles,
});
