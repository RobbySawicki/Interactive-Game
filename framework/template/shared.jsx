// shared.jsx — framework primitives. Don't edit per-campaign.
// Exposes window.CAMPAIGN with: CFG, BRAND, COPY, ASSETS, asset, sendSync,
// useSync, useLeaderboard, recordScore, PanelScaler.

(() => {
  const CFG     = window.CAMPAIGN_CONFIG || {};
  const BRAND   = CFG.brand   || {};
  const COPY    = CFG.copy    || {};
  const ASSETS  = CFG.assets  || {};
  const FEATURES = CFG.features || {};

  // Asset URL resolver — concatenates the configured base path. The HTML
  // loaders set window.CAMPAIGN_ASSET_BASE to the right relative path.
  const ASSET_BASE = window.CAMPAIGN_ASSET_BASE || 'assets/';
  const asset = (key) => (ASSETS[key] ? ASSET_BASE + ASSETS[key] : null);

  // ─── Sync bus: Firebase if configured, BroadcastChannel otherwise ─────────
  const SYNC_CHANNEL = CFG.code || 'campaign';
  const SESSION_ID   = (CFG.sync && CFG.sync.sessionId) || SYNC_CHANNEL;

  const FB_ENABLED = (() => {
    const c = window.FIREBASE_CONFIG;
    return typeof firebase !== 'undefined'
      && c
      && typeof c.databaseURL === 'string'
      && !c.databaseURL.includes('YOUR_');
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
      this.eventsRef = getDb().ref(`sessions/${SESSION_ID}/events`);
      // Skip historical events on connect so a refresh doesn't replay old hits.
      const cutoff = Date.now() - 2000;
      this.eventsRef.orderByChild('at').startAt(cutoff).on('child_added', (snap) => {
        const m = snap.val();
        if (m) this.listeners.forEach((fn) => fn(m));
      });
      // Garbage-collect events older than a minute. Keeps the node small.
      setInterval(() => {
        this.eventsRef.orderByChild('at').endAt(Date.now() - 60000).limitToFirst(50)
          .once('value', (s) => s.forEach((c) => c.ref.remove()));
      }, 30000);
    }
    send(msg) {
      const m = { ...msg, at: msg.at || Date.now() };
      this.eventsRef.push(m);
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

  let __bus = null;
  const getBus = () => (__bus = __bus || (FB_ENABLED ? new FirebaseBus() : new LocalBus()));
  const sendSync = (msg) => getBus().send(msg);
  const useSync = (handler) => {
    const ref = React.useRef(handler);
    ref.current = handler;
    React.useEffect(() => getBus().on((m) => ref.current && ref.current(m)), []);
  };

  // ─── Leaderboard: localStorage + bus broadcast ────────────────────────────
  const LB_KEY = `${SYNC_CHANNEL}:leaderboard`;
  const LB_MAX = 50;
  const loadLb = () => {
    try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]'); }
    catch (e) { return []; }
  };
  const saveLb = (rows) => {
    try { localStorage.setItem(LB_KEY, JSON.stringify(rows.slice(0, LB_MAX))); }
    catch (e) {}
  };
  const recordScore = (name, score) => {
    const rows = loadLb();
    rows.push({ name: (name || 'YOU').toUpperCase(), score });
    rows.sort((a, b) => b.score - a.score);
    const trimmed = rows.slice(0, LB_MAX);
    saveLb(trimmed);
    sendSync({ type: 'leaderboard', rows: trimmed });
    return trimmed;
  };
  const clearLeaderboard = () => { saveLb([]); sendSync({ type: 'leaderboard', rows: [] }); };
  window.clearLeaderboard = clearLeaderboard;

  const useLeaderboard = (limit = 5) => {
    const [rows, setRows] = React.useState(() => loadLb().slice(0, limit));
    React.useEffect(() => {
      const off = getBus().on((m) => {
        if (m.type === 'leaderboard') setRows(m.rows.slice(0, limit));
      });
      // Re-sync on mount in case a sibling tab updated localStorage.
      const onStorage = (e) => { if (e.key === LB_KEY) setRows(loadLb().slice(0, limit)); };
      window.addEventListener('storage', onStorage);
      setRows(loadLb().slice(0, limit));
      return () => { off(); window.removeEventListener('storage', onStorage); };
    }, [limit]);
    return rows;
  };

  // ─── PanelScaler: render at fixed design size, scale to container ─────────
  function PanelScaler({ designW, designH, bg, children }) {
    const ref = React.useRef(null);
    const [scale, setScale] = React.useState(1);
    React.useEffect(() => {
      const el = ref.current; if (!el) return;
      const ro = new ResizeObserver(() => {
        const r = el.getBoundingClientRect();
        setScale(Math.min(r.width / designW, r.height / designH));
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, [designW, designH]);
    return (
      <div ref={ref} style={{
        position: 'relative', width: '100%', height: '100%',
        overflow: 'hidden', background: bg || (BRAND.palette && BRAND.palette.bg) || '#000',
      }}>
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: designW, height: designH,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}>
          {children}
        </div>
      </div>
    );
  }

  window.CAMPAIGN = {
    CFG, BRAND, COPY, ASSETS, FEATURES, asset,
    sendSync, useSync,
    useLeaderboard, recordScore, clearLeaderboard,
    PanelScaler,
  };
})();
