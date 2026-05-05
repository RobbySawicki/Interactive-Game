// hud.jsx
// ─────────────────────────────────────────────────────────────────────────────
// THE TRUCK VISUAL. Two components: <TruckSide/> (wide LED) and <TruckRear/>
// (square LED). Replace the inner content for your campaign — the framework
// scaffolding (PanelScaler, attract/live/end phase machine, persistent
// leaderboard rail) is reusable as-is.
//
// Default: listens for { type: 'start' | 'hit' | 'end' } and shows a giant
// score with a reaction word. Persistent top-5 leaderboard on the right 25%
// (toggle via campaign.config.js → features.leaderboard).
// ─────────────────────────────────────────────────────────────────────────────

function TruckSide() {
  const { CFG, BRAND, PanelScaler } = window.CAMPAIGN;
  const W = (CFG.truck && CFG.truck.side && CFG.truck.side.width)  || 1007;
  const H = (CFG.truck && CFG.truck.side && CFG.truck.side.height) || 432;
  return (
    <PanelScaler designW={W} designH={H} bg={(BRAND.palette && BRAND.palette.bg) || '#0A1A3F'}>
      <SideInner W={W} H={H} />
    </PanelScaler>
  );
}

function SideInner({ W, H }) {
  const { CFG, BRAND, COPY, asset, useSync, FEATURES } = window.CAMPAIGN;
  const palette = BRAND.palette || {};
  const fonts   = BRAND.fonts   || {};

  const [phase,  setPhase]  = React.useState('attract'); // attract | live | end
  const [score,  setScore]  = React.useState(0);
  const [player, setPlayer] = React.useState('');
  const [sfx,    setSfx]    = React.useState(null);     // { word, t }
  const [pop,    setPop]    = React.useState(0);
  const lastEvent = React.useRef(0);

  useSync((m) => {
    lastEvent.current = Date.now();
    if (m.type === 'start') {
      setPhase('live'); setScore(0); setPlayer(m.player || ''); setSfx(null);
    } else if (m.type === 'hit') {
      setScore(m.totalScore); setPop((p) => p + 1);
      if (m.sfx) setSfx({ word: m.sfx, t: Date.now() });
    } else if (m.type === 'end') {
      setPhase('end'); setScore(m.totalScore); setPlayer(m.player || '');
    }
  });

  React.useEffect(() => {
    const iv = setInterval(() => {
      if (Date.now() - lastEvent.current > 8000 && phase !== 'attract') setPhase('attract');
    }, 2000);
    return () => clearInterval(iv);
  }, [phase]);

  const showLb = FEATURES.leaderboard !== false;
  const leftWidth = showLb ? '75%' : '100%';
  const bgUrl = asset('background');

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: palette.bg || '#0A1A3F',
      backgroundImage: bgUrl ? `url('${bgUrl}')` : undefined,
      backgroundSize: 'cover', backgroundPosition: 'center',
      fontFamily: fonts.ui, color: palette.paper || '#fff',
    }}>
      {/* Subtle vignette over background image so foreground reads. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.7) 100%)',
        pointerEvents: 'none',
      }} />

      <style>{`
        @keyframes hud-pop      { 0%{transform:scale(1)} 35%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes hud-reaction {
          0%   { opacity:0; transform: scale(0.6) rotate(-4deg); }
          30%  { opacity:1; transform: scale(1.18) rotate(2deg); }
          70%  { opacity:1; transform: scale(1) rotate(0deg); }
          100% { opacity:0; transform: scale(1) rotate(0deg); }
        }
      `}</style>

      <div style={{
        position: 'absolute', left: 0, top: 0, width: leftWidth, height: '100%', zIndex: 10,
      }}>
        {phase === 'attract' && <Attract />}
        {phase === 'live'    && <Live  score={score} player={player} sfx={sfx} pop={pop} />}
        {phase === 'end'     && <End   score={score} player={player} />}
      </div>

      {showLb && <LeaderboardRail liveScore={score} livePlayer={player} isLive={phase === 'live'} />}
    </div>
  );
}

function Attract() {
  const { COPY, BRAND, asset } = window.CAMPAIGN;
  const palette = BRAND.palette || {};
  const fonts   = BRAND.fonts   || {};
  const logo = asset('logo');
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, padding: 24, textAlign: 'center',
    }}>
      {logo && <img src={logo} alt="" style={{ maxHeight: 100, marginBottom: 8 }} />}
      <div style={{
        fontFamily: fonts.display, fontSize: 84, lineHeight: 0.95, color: palette.paper || '#fff',
        WebkitTextStroke: '3px ' + (palette.ink || '#0a0a0a'),
        textShadow: '6px 6px 0 ' + (palette.ink || '#0a0a0a'),
      }}>
        {COPY.headline || 'CAMPAIGN'}
        {COPY.subhead && <><br/><span style={{ color: palette.accent || '#FFD60A' }}>{COPY.subhead}</span></>}
      </div>
      <div style={{
        marginTop: 8, display: 'inline-block',
        background: palette.accent || '#FFD60A', color: palette.ink || '#0a0a0a',
        padding: '8px 22px', border: '4px solid ' + (palette.ink || '#0a0a0a'),
        borderRadius: 10, boxShadow: '5px 5px 0 ' + (palette.ink || '#0a0a0a'),
        fontFamily: fonts.display, fontSize: 30, letterSpacing: '0.04em',
      }}>
        {COPY.cta || 'PLAY ON THE iPAD →'}
      </div>
    </div>
  );
}

function Live({ score, player, sfx, pop }) {
  const { BRAND } = window.CAMPAIGN;
  const palette = BRAND.palette || {};
  const fonts   = BRAND.fonts   || {};
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px 24px',
    }}>
      {player && (
        <div style={{
          fontFamily: fonts.display, fontSize: 28, color: palette.accent || '#FFD60A',
          letterSpacing: '0.08em', textShadow: '2px 2px 0 ' + (palette.ink || '#0a0a0a'),
        }}>{player}</div>
      )}
      <div style={{
        fontFamily: fonts.ui, fontSize: 26, fontWeight: 900, letterSpacing: '0.22em',
        color: palette.accent || '#FFD60A',
        textShadow: '2px 2px 0 ' + (palette.ink || '#0a0a0a'),
        lineHeight: 1, marginTop: 4, marginBottom: 4,
      }}>SCORE</div>
      <div key={pop} style={{
        fontFamily: fonts.display, fontSize: 200, lineHeight: 0.85, color: palette.paper || '#fff',
        WebkitTextStroke: '6px ' + (palette.ink || '#0a0a0a'),
        textShadow: '9px 9px 0 ' + (palette.primary || '#0066CC'),
        animation: 'hud-pop 320ms cubic-bezier(.2,.8,.2,1)',
      }}>
        {Number(score || 0).toLocaleString()}
      </div>
      <div style={{ height: 56, marginTop: 8, display: 'flex', alignItems: 'center' }}>
        {sfx && (
          <div key={sfx.t} style={{
            fontFamily: fonts.display, fontSize: 48, color: palette.paper || '#fff',
            WebkitTextStroke: '3px ' + (palette.ink || '#0a0a0a'),
            textShadow: '4px 4px 0 ' + (palette.primary || '#0066CC'),
            animation: 'hud-reaction 600ms ease-out',
            letterSpacing: '0.04em',
          }}>
            {sfx.word}
          </div>
        )}
      </div>
    </div>
  );
}

function End({ score, player }) {
  const { COPY, BRAND } = window.CAMPAIGN;
  const palette = BRAND.palette || {};
  const fonts   = BRAND.fonts   || {};
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: 16, textAlign: 'center',
    }}>
      <div style={{
        fontFamily: fonts.display, fontSize: 48, color: palette.accent || '#FFD60A',
        WebkitTextStroke: '3px ' + (palette.ink || '#0a0a0a'),
        textShadow: '4px 4px 0 ' + (palette.ink || '#0a0a0a'),
      }}>FINAL SCORE</div>
      {player && (
        <div style={{
          fontFamily: fonts.display, fontSize: 32, color: palette.paper || '#fff',
          WebkitTextStroke: '1.5px ' + (palette.ink || '#0a0a0a'),
          textShadow: '3px 3px 0 ' + (palette.ink || '#0a0a0a'),
          letterSpacing: '0.06em',
        }}>{player}</div>
      )}
      <div style={{
        fontFamily: fonts.display, fontSize: 170, lineHeight: 0.9, color: palette.paper || '#fff',
        WebkitTextStroke: '6px ' + (palette.ink || '#0a0a0a'),
        textShadow: '9px 9px 0 ' + (palette.primary || '#0066CC'),
      }}>{Number(score || 0).toLocaleString()}</div>
      {COPY.endLine && (
        <div style={{
          marginTop: 6, fontFamily: fonts.display, fontSize: 30, color: palette.paper || '#fff',
          WebkitTextStroke: '2px ' + (palette.ink || '#0a0a0a'),
          textShadow: '3px 3px 0 ' + (palette.ink || '#0a0a0a'),
        }}>{COPY.endLine}</div>
      )}
    </div>
  );
}

function LeaderboardRail({ liveScore = 0, livePlayer = '', isLive = false }) {
  const { BRAND, useLeaderboard } = window.CAMPAIGN;
  const palette = BRAND.palette || {};
  const fonts   = BRAND.fonts   || {};
  const stored  = useLeaderboard(20);

  const rows = React.useMemo(() => {
    const list = isLive
      ? [...stored, { name: (livePlayer || 'YOU').toUpperCase(), score: liveScore, live: true }]
      : [...stored];
    list.sort((a, b) => b.score - a.score);
    const seen = new Set();
    const out = [];
    for (const r of list) {
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
      background: 'rgba(10,10,10,0.55)',
      borderLeft: '4px solid ' + (palette.ink || '#0a0a0a'),
      display: 'flex', flexDirection: 'column', padding: '18px 16px', gap: 8,
      backdropFilter: 'blur(2px)', zIndex: 20,
    }}>
      <div style={{
        fontFamily: fonts.display, fontSize: 32, color: palette.accent || '#FFD60A',
        WebkitTextStroke: '2px ' + (palette.ink || '#0a0a0a'),
        textShadow: '3px 3px 0 ' + (palette.ink || '#0a0a0a'),
        letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1,
      }}>
        LEADERBOARD
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        {rows.length === 0 && (
          <div style={{
            fontFamily: fonts.ui, fontSize: 18, fontWeight: 900, color: '#fff',
            opacity: 0.75, textAlign: 'center', marginTop: 24, letterSpacing: '0.08em',
          }}>BE THE FIRST!</div>
        )}
        {rows.map((row, i) => (
          <div key={row.name + i + (row.live ? ':L' : '')} style={{
            display: 'grid', gridTemplateColumns: '32px 1fr auto', alignItems: 'center', gap: 8,
            padding: '8px 10px',
            background: row.live ? (palette.accent || '#FFD60A') : 'rgba(255,255,255,0.08)',
            border: '2px solid ' + (palette.ink || '#0a0a0a'),
            borderRadius: 8,
            boxShadow: row.live ? ('3px 3px 0 ' + (palette.ink || '#0a0a0a')) : 'none',
            color: row.live ? (palette.ink || '#0a0a0a') : '#fff',
            fontFamily: fonts.ui, fontWeight: 900,
          }}>
            <div style={{
              fontFamily: fonts.display, fontSize: 30, lineHeight: 1,
              color: row.live ? (palette.primary || '#0066CC') : (i === 0 ? (palette.accent || '#FFD60A') : '#fff'),
              WebkitTextStroke: row.live ? '0' : '1.5px ' + (palette.ink || '#0a0a0a'),
              textAlign: 'center',
            }}>{i + 1}</div>
            <div style={{
              fontSize: 22, letterSpacing: '0.06em', lineHeight: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{row.name}</div>
            <div style={{
              fontFamily: fonts.display, fontSize: 24, lineHeight: 1,
              color: row.live ? (palette.primary || '#0066CC') : '#fff',
              WebkitTextStroke: row.live ? '0' : '1.5px ' + (palette.ink || '#0a0a0a'),
            }}>{Number(row.score || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Rear LED panel ─────────────────────────────────────────────────────────
function TruckRear() {
  const { CFG, BRAND, FEATURES, COPY, asset, PanelScaler } = window.CAMPAIGN;
  const W = (CFG.truck && CFG.truck.rear && CFG.truck.rear.width)  || 432;
  const H = (CFG.truck && CFG.truck.rear && CFG.truck.rear.height) || 432;
  return (
    <PanelScaler designW={W} designH={H} bg={(BRAND.palette && BRAND.palette.bg) || '#000'}>
      <RearInner />
    </PanelScaler>
  );
}

function RearInner() {
  const { BRAND, COPY, FEATURES, asset } = window.CAMPAIGN;
  const palette = BRAND.palette || {};
  const fonts   = BRAND.fonts   || {};
  const logo = asset('logo');
  const qrUrl = FEATURES.qrUrl;

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: `radial-gradient(circle at 50% 40%, ${palette.paper || '#fff'} 0%, ${palette.accent || '#FFD60A'} 70%, ${palette.primary || '#0066CC'} 100%)`,
      fontFamily: fonts.ui,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
      padding: 22, textAlign: 'center',
    }}>
      {logo && <img src={logo} alt="" style={{ maxHeight: 80 }} />}

      {FEATURES.qr !== false && qrUrl && (
        <div style={{
          width: 200, height: 200, padding: 14, background: '#fff',
          border: '4px solid ' + (palette.ink || '#0a0a0a'), borderRadius: 10,
          boxShadow: '5px 5px 0 ' + (palette.ink || '#0a0a0a'),
        }}>
          <img
            alt="QR code"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(qrUrl)}`}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      )}

      <div style={{
        fontFamily: fonts.display, fontSize: 38, color: palette.ink || '#0a0a0a',
        textShadow: '3px 3px 0 ' + (palette.paper || '#fff'),
        lineHeight: 1, letterSpacing: '0.04em',
      }}>
        {COPY.endLine || 'SCAN TO LEARN MORE'}
      </div>
    </div>
  );
}
