// game-shared.jsx — generic Cookie Toss shared utilities
// Used by both player/ and panel/ pages. Provides:
//   - PAL          : palette + type tokens
//   - TARGETS      : enemy/bonus archetypes (size, points, speed, weight)
//   - SyncBus      : BroadcastChannel-backed pub/sub between player <-> panel
//                    on the same origin. Same-browser only — for production
//                    cross-device use, swap getBus() for a Firebase bus.
//   - leaderboard  : localStorage top-50, daily reset at RESET_HOUR.

// ── tokens ──────────────────────────────────────────────────────────────────
const PAL = {
  cream:    '#F5EDE0',
  creamHi:  '#FFFAF0',
  ink:      '#1B1410',
  teal:     '#1F5F5B',
  tealDeep: '#143F3C',
  mustard:  '#F0B22A',
  coral:    '#E85A4F',
  rust:     '#7C2E2A',
  display:  '"Lilita One", "Fugaz One", system-ui, sans-serif',
  ui:       'Inter, system-ui, sans-serif',
};

const ROUND_SECONDS = 30;

// ── target archetypes ──────────────────────────────────────────────────────
const TARGETS = [
  { kind: 'enemy-big',   size: 200, points: 50,  speedMul: 0.6, weight: 5 },
  { kind: 'enemy-mid',   size: 140, points: 100, speedMul: 1.0, weight: 4 },
  { kind: 'enemy-small', size: 90,  points: 250, speedMul: 1.6, weight: 2 },
  { kind: 'bonus',       size: 110, points: 500, speedMul: 1.3, weight: 1, bonus: true },
];
const pickTargetKind = () => {
  const total = TARGETS.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of TARGETS) { r -= t.weight; if (r <= 0) return t; }
  return TARGETS[0];
};

// short reaction labels for combo / hit / miss callouts on the panel
const REACTION_HIT   = ['NICE!', 'BOOM!', 'SMASH!', 'CRUNCH!', 'POP!', 'YES!'];
const REACTION_COMBO = ['DOUBLE!', 'TRIPLE!', 'COMBO ×4!', 'COMBO ×5!', 'ON FIRE!', 'UNREAL!'];
const REACTION_BIG   = ['LEGENDARY!', 'CRUMB OF GLORY!', 'COOKIE STORM!'];
const pickReaction = (n) => {
  const pool = n >= 5 ? REACTION_BIG : n >= 2 ? REACTION_COMBO : REACTION_HIT;
  return pool[Math.floor(Math.random() * pool.length)];
};

// ── BroadcastChannel sync bus ──────────────────────────────────────────────
const SYNC_CHANNEL = 'cookie-toss';
class SyncBus {
  constructor() {
    this.listeners = new Set();
    this.frameListeners = new Set();
    try {
      this.bc = new BroadcastChannel(SYNC_CHANNEL);
      this.bc.onmessage = (e) => {
        const m = e.data;
        if (m && m.__frame) this.frameListeners.forEach((fn) => fn(m));
        else                this.listeners.forEach((fn) => fn(m));
      };
    } catch (e) { this.bc = null; }
  }
  send(msg) {
    const m = { ...msg, at: msg.at || Date.now() };
    if (this.bc) this.bc.postMessage(m);
    this.listeners.forEach((fn) => fn(m));
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  sendFrame(frame) {
    const m = { __frame: true, ...frame, at: frame.at || Date.now() };
    if (this.bc) this.bc.postMessage(m);
    this.frameListeners.forEach((fn) => fn(m));
  }
  onFrame(fn) { this.frameListeners.add(fn); return () => this.frameListeners.delete(fn); }
}
let __bus = null;
const getBus = () => (__bus = __bus || new SyncBus());

function useSync(handler) {
  const ref = React.useRef(handler);
  ref.current = handler;
  React.useEffect(() => getBus().on((m) => ref.current && ref.current(m)), []);
}
function useFrame() {
  const [frame, setFrame] = React.useState(null);
  React.useEffect(() => getBus().onFrame((f) => setFrame(f)), []);
  return frame;
}

// ── leaderboard ────────────────────────────────────────────────────────────
const LB_KEY = 'cookie-toss:leaderboard';
const LB_MAX = 50;
const RESET_HOUR = 1; // local time, 1 AM
function currentEpochStart(now = Date.now()) {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), RESET_HOUR, 0, 0, 0);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  return start.getTime();
}
function readLB() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    const cutoff = currentEpochStart();
    return arr.filter(r => r && typeof r.score === 'number' && typeof r.name === 'string' && r.at >= cutoff);
  } catch { return []; }
}
function writeLB(rows) {
  try { localStorage.setItem(LB_KEY, JSON.stringify(rows.slice(0, LB_MAX))); } catch {}
}
function recordScore(name, score) {
  const cleaned = (name || '').trim().toUpperCase().slice(0, 14) || 'PLAYER';
  const entry = { name: cleaned, score: Math.max(0, score|0), at: Date.now() };
  const rows = readLB();
  rows.push(entry);
  rows.sort((a, b) => b.score - a.score);
  const trimmed = rows.slice(0, LB_MAX);
  writeLB(trimmed);
  getBus().send({ type: 'leaderboard', rows: trimmed });
  return trimmed;
}
function clearLB() {
  writeLB([]);
  getBus().send({ type: 'leaderboard', rows: [] });
}
function useLeaderboard(limit = 5) {
  const [rows, setRows] = React.useState(() => readLB());
  React.useEffect(() => {
    const off = getBus().on((m) => {
      if (m && m.type === 'leaderboard' && Array.isArray(m.rows)) setRows(m.rows);
      else if (m && m.type === 'end') setRows(readLB());
    });
    const onStorage = (e) => { if (e.key === LB_KEY) setRows(readLB()); };
    window.addEventListener('storage', onStorage);
    return () => { off(); window.removeEventListener('storage', onStorage); };
  }, []);
  return rows.slice(0, limit);
}

window.clearLeaderboard = clearLB;

Object.assign(window, {
  PAL, ROUND_SECONDS,
  TARGETS, pickTargetKind,
  REACTION_HIT, REACTION_COMBO, REACTION_BIG, pickReaction,
  SyncBus, getBus, useSync, useFrame,
  recordScore, clearLB, useLeaderboard, readLB,
});
