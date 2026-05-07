// truck-display.jsx — LED truck spectator screens
// Real LED specs (per "LED Truck Specs - TOR-MTL - SMD 16"):
//   Side screens: 1007 × 432 px  (very wide & short — banner aspect ~2.33:1)
//   Rear screen:  432  × 432 px  (square; fixed image; QR badge)
//   Min text size: 25pt sans-serif. Avoid solid-white backgrounds.
// Both side panels listen to SyncBus for live events from the iPad and
// fall back to attract loop after 8s of silence. Rear panel is static.

const SIDE_W = 1007;
const SIDE_H = 432;
const REAR_W = 432;
const REAR_H = 432;

// ─────────────────────────────────────────────────────────────────────────────
// Scaler — renders children at fixed design size, scales to container.
function PanelScaler({ designW, designH, bg = '#0A1A3F', children }) {
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
    <div ref={ref} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: bg }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// SIDE SCREEN — wide banner. Reactive to game events.
function TruckDisplay() {
  return <PanelScaler designW={SIDE_W} designH={SIDE_H}><SideInner /></PanelScaler>;
}

function SideInner() {
  // Live frame from the iPad. Carries scene state (targets, projectile,
  // aim, slingshot anchor) plus HUD info (score, combo, time, phase). When
  // no frame has arrived in the last 8s we fall back to the attract layout.
  const frame = useFrame();
  const [splats, setSplats] = React.useState([]);
  const calloutId = React.useRef(0);

  // rAF tick so we re-render between frame snapshots and dead-reckon
  // target / projectile motion smoothly.
  const [, force] = React.useReducer((s) => s + 1, 0);
  React.useEffect(() => {
    let raf;
    const step = () => { force(); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Hit splats stay event-driven (using the existing 'hit' message) so the
  // SFX / +points callout still pops at the moment of impact, layered over
  // the mirrored playfield.
  useSync((m) => {
    if (m.type === 'hit') {
      const id = ++calloutId.current;
      setSplats((s) => [...s, { id, nx: m.x, ny: m.y, sfx: m.sfx, combo: m.combo, points: m.points }]);
      setTimeout(() => setSplats((s) => s.filter((x) => x.id !== id)), 1100);
    } else if (m.type === 'start' || m.type === 'end') {
      setSplats([]);
    }
  });

  const fresh  = !!(frame && (Date.now() - frame.at) < 8000);
  const phase  = fresh ? frame.phase : 'attract';
  const score  = fresh ? frame.score : 0;
  const combo  = fresh ? frame.combo : 0;
  const time   = fresh ? frame.time  : 0;
  const player = fresh ? (frame.player || '') : '';

  // Size the mirror area to exactly the iPad's stage aspect at full panel
  // height — no letterboxing — so the leaderboard rail can claim all the
  // remaining horizontal space and show longer player names. Hard cap at
  // 75% of panel width so a portrait iPad can't push the leaderboard off.
  const H = SIDE_H;
  const stageW = (fresh && frame.stageW) || 1024;
  const stageH = (fresh && frame.stageH) || 768;
  const maxW   = SIDE_W * 0.75;
  const mScale = Math.min(H / stageH, maxW / stageW);
  const W = stageW * mScale;
  const dispW = W;
  const dispH = stageH * mScale;
  const offX  = 0;
  const offY  = (H - dispH) / 2;

  const showAttract = !fresh || phase === 'attract' || phase === 'name';
  const showEnd     = fresh && phase === 'end';
  const showMirror  = fresh && phase === 'playing';

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: `#0A1A3F url('${window.ASSET_BASE||'assets/'}marvel-background.jpeg') center/cover no-repeat`,
      fontFamily: BRAND.ui, color: '#fff',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.7) 100%)',
        pointerEvents: 'none',
      }} />
      <img src={(window.ASSET_BASE||'assets/')+'burst.png'} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        opacity: 0.30, mixBlendMode: 'screen', pointerEvents: 'none',
        animation: 'side-burst-spin 40s linear infinite',
      }} />
      <style>{`
        @keyframes side-burst-spin { from{transform:scale(1.05) rotate(0)} to{transform:scale(1.05) rotate(360deg)} }
        @keyframes side-score-pop { 0%{transform:scale(1)} 35%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes side-shake { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-3px,2px)} 50%{transform:translate(3px,-2px)} 75%{transform:translate(-2px,-1px)} }
      `}</style>
      <img src={(window.ASSET_BASE||'assets/')+'halftone.png'} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        opacity: 0.08, mixBlendMode: 'screen', pointerEvents: 'none',
      }} />

      {/* Left 75% — iPad mirror playfield + HUD, attract/end overlays.
          Right 25% reserved for the persistent leaderboard. */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: W, height: H,
        zIndex: 10, overflow: 'hidden',
      }}>
        {showMirror && (
          <IpadMirror
            frame={frame}
            offX={offX} offY={offY}
            dispW={dispW} dispH={dispH}
            scale={mScale}
          />
        )}
        {showMirror && <MirrorHUD score={score} combo={combo} time={time} player={player} W={W} />}
        {showAttract && <SideAttract />}
        {showEnd     && <SideEnd score={score} player={player} />}
      </div>

      {/* Persistent leaderboard — fills whatever horizontal space the
          mirror leaves so longer player names fit without ellipsis. */}
      <SideLeaderboard
        liveScore={score}
        livePlayer={player}
        isLive={showMirror}
        leftEdge={W}
      />

      {/* Hit splats overlay the mirror, mapped through the same letterbox
          geometry so each callout lands on its target. */}
      {showMirror && splats.length > 0 && (
        <div style={{
          position: 'absolute', left: 0, top: 0, width: W, height: H,
          overflow: 'hidden', pointerEvents: 'none', zIndex: 25,
        }}>
          {splats.map((s) => (
            <SideSplat
              key={s.id}
              {...s}
              x={offX + s.nx * dispW}
              y={offY + s.ny * dispH}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IpadMirror — renders the iPad's playing field on the truck side panel.
// Targets, projectile and slingshot are positioned in iPad stage coordinates
// scaled down to the letterbox area. Velocities in the frame let us advance
// motion between snapshots so the cookies don't visibly step at the iPad's
// 16Hz broadcast cadence.
function IpadMirror({ frame, offX, offY, dispW, dispH, scale }) {
  const dt = Math.max(0, Math.min(20, (Date.now() - frame.at) / 16.67));
  const archByKind = React.useMemo(() => {
    const m = new Map();
    for (const t of TARGETS) m.set(t.kind, t);
    return m;
  }, []);
  const a = frame.anchor;
  const aim = frame.aim;
  const p = frame.projectile;
  const ax = a ? a.x * scale : 0;
  const ay = a ? a.y * scale : 0;

  return (
    <div style={{
      position: 'absolute', left: offX, top: offY, width: dispW, height: dispH,
      overflow: 'hidden',
    }}>
      {(frame.targets || []).map((t) => {
        const x   = t.x   + (t.vx   || 0) * dt;
        const rot = (t.rot || 0) + (t.vrot || 0) * dt;
        const dy  = Math.sin((Date.now() / 600) + (t.bobPhase || 0)) * (t.bobAmp || 0) * 0.15;
        const arch = archByKind.get(t.kind);
        const img = arch ? arch.img : 'assets/cookie-venom.png';
        const drawX = (x - t.size / 2) * scale;
        const drawY = (t.y + dy - t.size / 2) * scale;
        return (
          <img key={t.id}
            src={(window.ASSET_BASE||'assets/') + img.replace(/^assets\//, '')}
            alt="" draggable={false}
            style={{
              position: 'absolute', left: 0, top: 0,
              width: t.size * scale, height: t.size * scale,
              transform: `translate3d(${drawX}px, ${drawY}px, 0) rotate(${rot}deg)`,
              filter: t.bonus ? 'drop-shadow(0 0 24px #FFD60A)' : 'drop-shadow(0 0 10px rgba(0,0,0,0.4))',
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Slingshot Y posts + loaded cookie + web strand (only when a
          projectile isn't currently in the air, matching the iPad). */}
      {a && !p && (
        <SlingMirror anchor={a} aim={aim} scale={scale} />
      )}

      {/* Projectile, dead-reckoned with gravity */}
      {p && (() => {
        const px = p.x + (p.vx || 0) * dt;
        const py = p.y + (p.vy || 0) * dt + 0.5 * (frame.gravity || 0.7) * dt * dt;
        const pr = (p.rot || 0) + 18 * dt;
        return (
          <img src={(window.ASSET_BASE||'assets/')+'cookie-spider.png'} draggable={false} alt="" style={{
            position: 'absolute', left: 0, top: 0,
            width: 120 * scale, height: 120 * scale,
            transform: `translate3d(${(px - 60) * scale}px, ${(py - 60) * scale}px, 0) rotate(${pr}deg)`,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
            pointerEvents: 'none', zIndex: 50,
          }} />
        );
      })()}

      {/* Slingshot anchor reference — keeps the layout grounded even when
          the slingshot itself is hidden mid-flight. */}
      {a && p && (
        <div style={{
          position: 'absolute', left: ax - 4 * scale, top: ay - 10 * scale,
          width: 8 * scale, height: 80 * scale, background: '#0a0a0a',
          borderRadius: 4 * scale, zIndex: 30,
        }} />
      )}
    </div>
  );
}

// SlingMirror — visual replica of the iPad's slingshot anchor for spectators.
function SlingMirror({ anchor, aim, scale }) {
  const x = anchor.x * scale;
  const y = anchor.y * scale;
  const cookieX = (aim ? aim.x : anchor.x)       * scale;
  const cookieY = (aim ? aim.y : anchor.y - 30)  * scale;
  const off30 = 30 * scale;
  return (
    <>
      {aim && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40 }}>
          <line x1={x - off30} y1={y} x2={cookieX} y2={cookieY} stroke="#fff" strokeWidth={4 * scale} strokeLinecap="round" />
          <line x1={x + off30} y1={y} x2={cookieX} y2={cookieY} stroke="#fff" strokeWidth={4 * scale} strokeLinecap="round" />
          <line x1={x - off30} y1={y} x2={cookieX} y2={cookieY} stroke={BRAND.blue} strokeWidth={1.5 * scale} strokeDasharray={`${3*scale} ${5*scale}`} />
          <line x1={x + off30} y1={y} x2={cookieX} y2={cookieY} stroke={BRAND.blue} strokeWidth={1.5 * scale} strokeDasharray={`${3*scale} ${5*scale}`} />
        </svg>
      )}
      <div style={{
        position: 'absolute', left: x - 4 * scale, top: y - 10 * scale,
        width: 8 * scale, height: 80 * scale,
        background: '#0a0a0a', borderRadius: 4 * scale, zIndex: 30,
      }} />
      <div style={{
        position: 'absolute', left: x - 38 * scale, top: y - 14 * scale,
        width: 8 * scale, height: 30 * scale,
        background: '#0a0a0a', borderRadius: 4 * scale, transform: 'rotate(-15deg)', zIndex: 30,
      }} />
      <div style={{
        position: 'absolute', left: x + off30, top: y - 14 * scale,
        width: 8 * scale, height: 30 * scale,
        background: '#0a0a0a', borderRadius: 4 * scale, transform: 'rotate(15deg)', zIndex: 30,
      }} />
      <img src={(window.ASSET_BASE||'assets/')+'cookie-spider.png'} alt="" draggable={false} style={{
        position: 'absolute',
        left: cookieX - 60 * scale, top: cookieY - 60 * scale,
        width: 120 * scale, height: 120 * scale,
        filter: aim ? 'drop-shadow(0 0 22px rgba(0,176,255,0.9))' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
        zIndex: 45, pointerEvents: 'none',
      }} />
    </>
  );
}

// MirrorHUD — compact comic chips along the top of the mirror echoing the
// iPad's SCORE / TIME / COMBO HUD so passers-by can read the live numbers
// from across the lot. Sized for the LED min-text spec (≥ 25pt).
function MirrorHUD({ score, combo, time, player, W }) {
  return (
    <div style={{
      position: 'absolute', left: 12, right: 12, top: 10,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      pointerEvents: 'none', zIndex: 60, fontFamily: BRAND.display,
      gap: 8,
    }}>
      <div style={hudChip}>
        <div style={hudLabel}>SCORE</div>
        <div style={{ ...hudValue, color: BRAND.blue }}>{(score|0).toLocaleString()}</div>
      </div>
      <div style={{ ...hudChip, textAlign: 'center' }}>
        <div style={hudLabel}>TIME</div>
        <div style={{ ...hudValue, color: time <= 5 ? BRAND.marvelRed : '#0a0a0a' }}>{Math.max(0, time|0)}s</div>
      </div>
      <div style={{ ...hudChip, textAlign: 'right', opacity: combo > 1 ? 1 : 0, transition: 'opacity 200ms' }}>
        <div style={hudLabel}>COMBO</div>
        <div style={{ ...hudValue, color: BRAND.marvelRed }}>×{Math.max(combo, 1)}</div>
      </div>
    </div>
  );
}

const hudChip = {
  background: '#fff',
  border: '3px solid #0a0a0a',
  borderRadius: 10,
  boxShadow: '4px 4px 0 #0a0a0a',
  padding: '6px 12px',
  fontWeight: 900,
};
const hudLabel = { fontSize: 12, opacity: 0.75, fontFamily: BRAND.ui, fontWeight: 700, letterSpacing: '0.1em', color: '#0a0a0a' };
const hudValue = { fontSize: 30, lineHeight: 1, WebkitTextStroke: '2px #0a0a0a' };

// ─────────────────────────────────────────────────────────────────────────────
// SIDE — Attract: horizontal banner layout (cookie left, lockup+CTA right)
function SideAttract() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
      {/* Cookie hero on the left */}
      <img src={(window.ASSET_BASE||'assets/')+'cookie-spider.png'} style={{
        position: 'absolute', left: 20, top: '50%', height: '95%', transform: 'translateY(-50%)',
        filter: 'drop-shadow(0 0 30px rgba(0,176,255,0.8))',
        animation: 'side-burst-spin 14s linear infinite reverse',
      }} />
      {/* Cookie hero on the right */}
      <img src={(window.ASSET_BASE||'assets/')+'cookie-venom.png'} style={{
        position: 'absolute', right: 20, top: '50%', height: '85%', transform: 'translateY(-50%)',
        filter: 'drop-shadow(0 0 30px rgba(170,0,255,0.7))',
      }} />
      {/* Center copy */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        textAlign: 'center', width: '60%',
      }}>
        <img src={(window.ASSET_BASE||'assets/')+'lockup-pos.png'} style={{ width: 220, marginBottom: 6 }} />
        <div style={{
          fontFamily: BRAND.display, fontSize: 76, lineHeight: 0.92, color: '#fff',
          WebkitTextStroke: '3px #0a0a0a', textShadow: '5px 5px 0 #0a0a0a', letterSpacing: '0.02em',
        }}>
          SLING THE STUF.<br/>
          <span style={{color: BRAND.yellow}}>BEAT VENOM.</span>
        </div>
        <div style={{
          marginTop: 10, display: 'inline-block', background: BRAND.yellow, color: '#0a0a0a',
          padding: '8px 22px', border: '4px solid #0a0a0a', borderRadius: 10,
          boxShadow: '5px 5px 0 #0a0a0a', fontSize: 28, fontWeight: 900, fontFamily: BRAND.display,
          letterSpacing: '0.04em',
        }}>
          PLAY ON THE iPAD →
        </div>
      </div>
    </div>
  );
}

// SIDE — End: final score banner. Session leaderboard is rendered persistently
// by the parent (SideInner) on the right rail.
function SideEnd({ score, player }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10, padding: 16, overflow: 'hidden', textAlign: 'center', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          fontFamily: BRAND.display, fontSize: 48, color: BRAND.yellow,
          WebkitTextStroke: '3px #0a0a0a', textShadow: '4px 4px 0 #0a0a0a', lineHeight: 1,
        }}>FINAL SCORE</div>
        {player && (
          <div style={{
            marginTop: 6, fontFamily: BRAND.display, fontSize: 32, color: '#fff',
            WebkitTextStroke: '1.5px #0a0a0a', textShadow: '3px 3px 0 #0a0a0a', letterSpacing: '0.06em',
          }}>{(player || '').toUpperCase()}</div>
        )}
        <div style={{
          fontFamily: BRAND.display, fontSize: 170, lineHeight: 0.9, color: '#fff',
          WebkitTextStroke: '6px #0a0a0a', textShadow: '9px 9px 0 ' + BRAND.marvelRed,
          marginTop: 4,
        }}>{score.toLocaleString()}</div>
        <div style={{
          marginTop: 6, fontFamily: BRAND.display, fontSize: 30, color: '#fff',
          WebkitTextStroke: '2px #0a0a0a', textShadow: '3px 3px 0 #0a0a0a',
        }}>
          SCAN THE BACK TO SAVE THE UNIVERSE!
        </div>
      </div>
    </div>
  );
}

// SIDE — Persistent leaderboard rail. Always visible on the right 25% of the
// side panel across all phases (attract / live / end). When isLive is true,
// the active player is slotted in as a highlighted "live" row that updates
// in real time so spectators can see them climb.
function SideLeaderboard({ liveScore = 0, livePlayer = '', isLive = false, leftEdge = null }) {
  const stored = useLeaderboard(20);
  const leaderboard = React.useMemo(() => {
    const liveName = (livePlayer || 'YOU').toUpperCase();
    const rows = isLive
      ? [...stored, { name: liveName, score: liveScore, live: true }]
      : [...stored];
    rows.sort((a, b) => b.score - a.score);
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      const key = r.name + (r.live ? ':live' : '');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
      if (out.length >= 5) break;
    }
    return out;
  }, [stored, liveScore, livePlayer, isLive]);

  return (
    <div style={{
      position: 'absolute',
      right: 0, top: 0, height: '100%',
      ...(leftEdge != null ? { left: leftEdge } : { width: '25%' }),
      background: 'rgba(10,10,10,0.55)', borderLeft: '4px solid #0a0a0a',
      display: 'flex', flexDirection: 'column', padding: '18px 16px', gap: 8,
      backdropFilter: 'blur(2px)', zIndex: 20,
    }}>
      <div style={{
        fontFamily: BRAND.display, fontSize: 32, color: BRAND.yellow,
        WebkitTextStroke: '2px #0a0a0a', textShadow: '3px 3px 0 #0a0a0a',
        letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1,
      }}>
        LEADERBOARD
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        {leaderboard.length === 0 && (
          <div style={{
            fontFamily: BRAND.ui, fontSize: 18, fontWeight: 900, color: '#fff',
            opacity: 0.75, textAlign: 'center', marginTop: 24, letterSpacing: '0.08em',
          }}>BE THE FIRST!</div>
        )}
        {leaderboard.map((row, i) => (
          <div key={row.name + i + (row.live ? ':L' : '')} style={{
            display: 'grid', gridTemplateColumns: '32px 1fr auto', alignItems: 'center', gap: 8,
            padding: '8px 10px',
            background: row.live ? BRAND.yellow : 'rgba(255,255,255,0.08)',
            border: '2px solid #0a0a0a', borderRadius: 8,
            boxShadow: row.live ? '3px 3px 0 #0a0a0a' : 'none',
            color: row.live ? '#0a0a0a' : '#fff',
            fontFamily: BRAND.ui, fontWeight: 900,
          }}>
            <div style={{
              fontFamily: BRAND.display, fontSize: 30, lineHeight: 1,
              color: row.live ? BRAND.marvelRed : (i === 0 ? BRAND.yellow : '#fff'),
              WebkitTextStroke: row.live ? '0' : '1.5px #0a0a0a',
              textAlign: 'center',
            }}>{i + 1}</div>
            <div style={{
              fontSize: 26, letterSpacing: '0.08em', lineHeight: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{row.name}</div>
            <div style={{
              fontFamily: BRAND.display, fontSize: 26, lineHeight: 1,
              color: row.live ? BRAND.marvelRed : '#fff',
              WebkitTextStroke: row.live ? '0' : '1.5px #0a0a0a',
            }}>{row.score.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDE — Splat (scaled for ~432px tall canvas)
function SideSplat({ x, y, sfx, combo, points }) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const e = (now - start) / 1400;
      setT(Math.min(1, e));
      if (e < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const pop = t < 0.18 ? 1 - Math.pow(1 - t / 0.18, 3) : 1;
  const scale = 0.3 + pop * 1.0;
  const opacity = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
  const rot = (combo % 7) * 3 - 9;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${scale}) rotate(${rot}deg)`,
      opacity, pointerEvents: 'none', zIndex: 40,
    }}>
      <svg width="280" height="280" viewBox="-140 -140 280 280">
        <polygon
          points={Array.from({ length: 22 }, (_, i) => {
            const a = (i / 22) * Math.PI * 2;
            const r = (i % 2 === 0 ? 110 : 65) + Math.sin(i * 1.7) * 12;
            return `${Math.cos(a) * r},${Math.sin(a) * r}`;
          }).join(' ')}
          fill={BRAND.yellow} stroke="#0a0a0a" strokeWidth="6" strokeLinejoin="round"
        />
        <polygon
          points={Array.from({ length: 22 }, (_, i) => {
            const a = (i / 22) * Math.PI * 2 + 0.1;
            const r = (i % 2 === 0 ? 85 : 50) + Math.sin(i * 1.3) * 8;
            return `${Math.cos(a) * r},${Math.sin(a) * r}`;
          }).join(' ')}
          fill="#fff" stroke="#0a0a0a" strokeWidth="4" strokeLinejoin="round"
        />
      </svg>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        fontFamily: BRAND.display, fontSize: 60, color: BRAND.marvelRed,
        WebkitTextStroke: '3px #0a0a0a', textShadow: '4px 4px 0 #0a0a0a',
        whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1,
      }}>
        {sfx}
        <div style={{ fontSize: 28, color: '#0a0a0a', WebkitTextStroke: '0', textShadow: 'none', marginTop: 4 }}>+{points}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REAR SCREEN — square, fixed image. Sample QR + comic-burst frame.
function TruckRear() {
  return <PanelScaler designW={REAR_W} designH={REAR_H}><RearInner /></PanelScaler>;
}

function RearInner() {
  // Build a simple SVG-based "mock QR" so it visually reads as a QR without
  // needing a real encoded URL. Deterministic checker pattern + finder squares.
  const cells = 21;
  const grid = React.useMemo(() => {
    const g = [];
    // pseudo-random but deterministic
    const seed = (x, y) => ((x * 73 + y * 131 + (x ^ y) * 17) % 7) >= 4;
    for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) g.push({ x, y, on: seed(x, y) });
    return g;
  }, []);
  const isFinder = (x, y) => {
    const inBox = (ox, oy) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    return inBox(0, 0) || inBox(cells - 7, 0) || inBox(0, cells - 7);
  };
  const finderCell = (x, y) => {
    const local = (ox, oy) => ({ lx: x - ox, ly: y - oy });
    let l;
    if      (x < 7 && y < 7)               l = local(0, 0);
    else if (x >= cells - 7 && y < 7)      l = local(cells - 7, 0);
    else if (x < 7 && y >= cells - 7)      l = local(0, cells - 7);
    else return false;
    const { lx, ly } = l;
    if (lx === 0 || lx === 6 || ly === 0 || ly === 6) return true;     // outer
    if (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4) return true;          // inner
    return false;
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      // Off-white / pattern bg per spec — "avoid solid white"
      background: `radial-gradient(circle at 50% 40%, #FFE8C2 0%, ${BRAND.yellow} 60%, #E6A800 100%)`,
      fontFamily: BRAND.ui,
    }}>
      {/* Halftone overlay */}
      <img src={(window.ASSET_BASE||'assets/')+'halftone.png'} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        opacity: 0.18, mixBlendMode: 'multiply', pointerEvents: 'none',
      }} />
      {/* OREO logo top */}
      <img src={(window.ASSET_BASE||'assets/')+'lockup-pos.png'} style={{
        position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 120, zIndex: 5,
      }} />
      {/* Burst frame — shifted lower so it clears the OREO lockup */}
      <img src={(window.ASSET_BASE||'assets/')+'qr-kapow.png'} style={{
        position: 'absolute', left: '50%', top: '60%', transform: 'translate(-50%, -50%)',
        width: 320, height: 320, objectFit: 'contain', zIndex: 2,
      }} />
      {/* Sample QR positioned in the center hole of the burst */}
      <div style={{
        position: 'absolute', left: '50%', top: '60%', transform: 'translate(-50%, -50%)',
        width: 110, height: 110, padding: 6, background: '#fff',
        border: '3px solid #0a0a0a', borderRadius: 4, boxShadow: '3px 3px 0 #0a0a0a', zIndex: 6,
      }}>
        <svg viewBox={`0 0 ${cells} ${cells}`} width="100%" height="100%" shapeRendering="crispEdges">
          <rect x="0" y="0" width={cells} height={cells} fill="#fff" />
          {grid.map(({ x, y, on }) => {
            const finder = isFinder(x, y);
            const draw = finder ? finderCell(x, y) : on;
            return draw ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0a0a0a" /> : null;
          })}
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
window.TruckDisplay = TruckDisplay;
window.TruckRear    = TruckRear;
