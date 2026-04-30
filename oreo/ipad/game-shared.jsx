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
// Sync bus — BroadcastChannel between same-origin tabs.
// In production this becomes Firebase Realtime DB writes/reads.
// ─────────────────────────────────────────────────────────────────────────────
const SYNC_CHANNEL = 'oreo-stuf-of-legends';

class SyncBus {
  constructor() {
    this.listeners = new Set();
    try {
      this.bc = new BroadcastChannel(SYNC_CHANNEL);
      this.bc.onmessage = (e) => this.listeners.forEach((fn) => fn(e.data));
    } catch (e) {
      this.bc = null;
    }
  }
  send(msg) {
    if (this.bc) this.bc.postMessage(msg);
    // also fan out locally so a listener in same window gets it
    this.listeners.forEach((fn) => fn(msg));
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

// Lazily-created single shared bus per page.
let __bus = null;
const getBus = () => (__bus = __bus || new SyncBus());

// ─────────────────────────────────────────────────────────────────────────────
// Session leaderboard — stored in localStorage so it persists across reloads
// within the same browser session, and shared between the iPad and truck
// pages on the same origin. Cleared by clearing browser storage / incognito.
// ─────────────────────────────────────────────────────────────────────────────
const LB_KEY = 'oreo-stuf-of-legends:leaderboard';
const LB_MAX = 50; // keep enough history; UI shows top N

function readLeaderboard() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(r => r && typeof r.score === 'number' && typeof r.name === 'string');
  } catch (e) { return []; }
}
function writeLeaderboard(rows) {
  try { localStorage.setItem(LB_KEY, JSON.stringify(rows.slice(0, LB_MAX))); } catch (e) {}
}
function recordScore(name, score) {
  const cleaned = (name || '').trim().toUpperCase().slice(0, 14) || 'PLAYER';
  const rows = readLeaderboard();
  rows.push({ name: cleaned, score: Math.max(0, score|0), at: Date.now() });
  rows.sort((a, b) => b.score - a.score);
  const trimmed = rows.slice(0, LB_MAX);
  writeLeaderboard(trimmed);
  // Notify any same-origin listeners (truck reading the live leaderboard).
  getBus().send({ type: 'leaderboard', rows: trimmed, at: Date.now() });
  return trimmed;
}
function clearLeaderboard() {
  writeLeaderboard([]);
  getBus().send({ type: 'leaderboard', rows: [], at: Date.now() });
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
