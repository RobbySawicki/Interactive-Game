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
  const [phase, setPhase]    = React.useState('attract'); // attract | live | end
  const [score, setScore]    = React.useState(0);
  const [combo, setCombo]    = React.useState(0);
  const [player, setPlayer]  = React.useState('');
  const [pop, setPop]        = React.useState(0);
  const [reaction, setReaction] = React.useState(null); // {word, t}
  const [callouts, setCallouts] = React.useState([]);
  const [splats, setSplats]  = React.useState([]);
  const [parts, burst]       = useParticles();
  const lastEventRef = React.useRef(0);
  const calloutId = React.useRef(0);

  // Reaction words that flash under the score on each hit. Combo level
  // picks from progressively bigger words.
  const reactionFor = (combo) => {
    if (combo >= 6) return ['LEGENDARY!', 'COSMIC!', 'UNREAL!'][combo % 3];
    if (combo >= 4) return ['INCREDIBLE!', 'AMAZING!', 'SPECTACULAR!'][combo % 3];
    if (combo >= 2) return ['NICE!', 'BOOM!', 'SWEET!'][combo % 3];
    return ['HIT!', 'POW!', 'WHACK!'][combo % 3];
  };

  useSync((m) => {
    lastEventRef.current = Date.now();
    if (m.type === 'start') {
      setPhase('live'); setScore(0); setCombo(0); setSplats([]); setCallouts([]); setReaction(null);
      if (m.player !== undefined) setPlayer(m.player || '');
    } else if (m.type === 'hit') {
      setScore(m.totalScore);
      setCombo(m.combo);
      setPop((p) => p + 1);
      setReaction({ word: reactionFor(m.combo), t: Date.now() });
      const sx = m.x * SIDE_W;
      const sy = m.y * SIDE_H;
      const id = ++calloutId.current;
      // Light splat at hit position (kept subtle so left score area stays clean)
      setSplats((s) => [...s, { id, x: sx, y: sy, sfx: m.sfx, combo: m.combo, points: m.points }]);
      setTimeout(() => setSplats((s) => s.filter((x) => x.id !== id)), 1100);
    } else if (m.type === 'miss') {
      setCombo(0);
    } else if (m.type === 'end') {
      setPhase('end'); setScore(m.totalScore); setReaction(null);
      if (m.player !== undefined) setPlayer(m.player || '');
    }
  });

  React.useEffect(() => {
    const iv = setInterval(() => {
      if (Date.now() - lastEventRef.current > 8000 && phase !== 'attract') setPhase('attract');
    }, 2000);
    return () => clearInterval(iv);
  }, [phase]);

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      // Off-white / colorful bg per spec ("Avoid solid white"). Use the comic
      // city background so creatives can read against the dark vignette.
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

      {/* Phase content — constrained to left 75% so the persistent leaderboard
          on the right 25% is always visible (attract / live / end). */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: '75%', height: '100%',
        zIndex: 10,
      }}>
        {phase === 'attract' && <SideAttract />}
        {phase === 'live'    && <SideLive score={score} combo={combo} pop={pop} reaction={reaction} player={player} />}
        {phase === 'end'     && <SideEnd  score={score} player={player} />}
      </div>

      {/* Persistent leaderboard — always visible on the right 25%. Highlights
          the active player's live score during the 'live' phase. */}
      <SideLeaderboard
        liveScore={score}
        livePlayer={player}
        isLive={phase === 'live'}
      />

      {/* Splats — only render on the left 75% so they don't overlap the leaderboard */}
      {phase === 'live' && (
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '75%', height: '100%',
          overflow: 'hidden', pointerEvents: 'none', zIndex: 25,
        }}>
          {splats.map((s) => (
            // splats were placed in panel-coords (0..SIDE_W). Now we
            // re-map x into the left 75% of the panel (0..SIDE_W*0.75).
            <SideSplat key={s.id} {...s} x={s.x * 0.75} />
          ))}
        </div>
      )}
    </div>
  );
}

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

// SIDE — Live: score + reaction word. Leaderboard is rendered persistently
// by the parent (SideInner) so it's visible across attract / live / end.
function SideLive({ score, combo, pop, reaction, player }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px 24px',
      }}>
        {/* OREO lockup, top-left */}
        <img src={(window.ASSET_BASE||'assets/')+'lockup-pos.png'} style={{
          position: 'absolute', top: 14, left: 18, width: 110, zIndex: 5,
        }} />
        {/* LIVE pill, top-right of left panel */}
        <div style={{
          position: 'absolute', top: 14, right: 18, zIndex: 5,
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px',
          background: BRAND.marvelRed, color: '#fff', border: '3px solid #0a0a0a',
          borderRadius: 8, fontFamily: BRAND.display, fontSize: 22, fontWeight: 900,
          boxShadow: '3px 3px 0 #0a0a0a',
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', background: '#fff',
            animation: 'side-score-pop 0.8s ease-in-out infinite',
          }}/>
          LIVE
        </div>

        {/* SCORE label */}
        <div style={{
          fontFamily: BRAND.ui, fontSize: 28, fontWeight: 900, letterSpacing: '0.22em',
          color: BRAND.yellow, textShadow: '2px 2px 0 #0a0a0a', lineHeight: 1, marginBottom: 4,
        }}>SCORE</div>

        {/* Score number — hero element */}
        <div key={pop} style={{
          fontFamily: BRAND.display, fontSize: 200, lineHeight: 0.85, color: '#fff',
          WebkitTextStroke: '6px #0a0a0a', textShadow: '9px 9px 0 ' + BRAND.marvelRed,
          animation: 'side-score-pop 320ms cubic-bezier(.2,.8,.2,1)',
          letterSpacing: '-0.01em', textAlign: 'center',
        }}>
          {score.toLocaleString()}
        </div>

        {/* Reaction line: COMBO multiplier OR last hit word */}
        <div style={{
          height: 56, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 18,
        }}>
          {combo > 1 && (
            <div style={{
              fontFamily: BRAND.display, fontSize: 42, color: BRAND.yellow,
              WebkitTextStroke: '3px #0a0a0a', textShadow: '3px 3px 0 #0a0a0a', lineHeight: 1,
              animation: 'side-shake 240ms',
            }}>
              ×{combo}
            </div>
          )}
          {reaction && (
            <div key={reaction.t} style={{
              fontFamily: BRAND.display, fontSize: 44, color: '#fff',
              WebkitTextStroke: '3px #0a0a0a', textShadow: '4px 4px 0 ' + BRAND.marvelRed,
              lineHeight: 1, animation: 'side-reaction 600ms ease-out',
              letterSpacing: '0.04em',
            }}>
              {reaction.word}
            </div>
          )}
        </div>

        <style>{`
          @keyframes side-reaction {
            0%   { opacity: 0; transform: scale(0.6) rotate(-4deg); }
            30%  { opacity: 1; transform: scale(1.18) rotate(2deg); }
            70%  { opacity: 1; transform: scale(1) rotate(0deg); }
            100% { opacity: 0; transform: scale(1) rotate(0deg); }
          }
        `}</style>
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
function SideLeaderboard({ liveScore = 0, livePlayer = '', isLive = false }) {
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
      position: 'absolute', right: 0, top: 0, width: '25%', height: '100%',
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
