// panel-display.jsx — generic LED panel: side banner + rear square
// Listens to the BroadcastChannel sync bus and mirrors the player's game
// for spectators. Side panel is wide (1007×432); rear is square (432×432).

const SIDE_W = 1007, SIDE_H = 432;
const REAR_W = 432,  REAR_H = 432;

function PanelScaler({ designW, designH, bg = PAL.tealDeep, children }) {
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
    <div ref={ref} style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', background:bg }}>
      <div style={{
        position:'absolute', left:'50%', top:'50%',
        width:designW, height:designH,
        transform:`translate(-50%,-50%) scale(${scale})`,
        transformOrigin:'center center',
      }}>{children}</div>
    </div>
  );
}

// ── SIDE PANEL ──────────────────────────────────────────────────────────────
function PanelSide() { return <PanelScaler designW={SIDE_W} designH={SIDE_H}><SideInner /></PanelScaler>; }

function SideInner() {
  const frame = useFrame();
  const [splats, setSplats] = React.useState([]);
  const calloutId = React.useRef(0);

  // re-render each rAF for dead-reckoning between snapshots
  const [, force] = React.useReducer((s) => s + 1, 0);
  React.useEffect(() => {
    let raf;
    const step = () => { force(); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useSync((m) => {
    if (m.type === 'hit') {
      const id = ++calloutId.current;
      setSplats((s) => [...s, { id, nx: m.x, ny: m.y, reaction: m.reaction, combo: m.combo, points: m.points, kind: m.targetKind }]);
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

  const H = SIDE_H;
  const stageW = (fresh && frame.stageW) || 1200;
  const stageH = (fresh && frame.stageH) || 800;
  const maxW   = SIDE_W * 0.75;
  const mScale = Math.min(H / stageH, maxW / stageW);
  const W = stageW * mScale;
  const dispW = W;
  const dispH = stageH * mScale;
  const offY  = (H - dispH) / 2;

  const showAttract = !fresh || phase === 'attract' || phase === 'name';
  const showEnd     = fresh && phase === 'end';
  const showMirror  = fresh && phase === 'playing';

  return (
    <div style={{
      position:'relative', width:'100%', height:'100%', overflow:'hidden',
      background: `radial-gradient(ellipse at 50% 30%, ${PAL.tealDeep} 0%, #0B221F 100%)`,
      fontFamily: PAL.ui, color: PAL.creamHi,
    }}>
      {/* dot pattern overlay */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.12, pointerEvents:'none' }}>
        <defs>
          <pattern id="pdots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1.4" fill={PAL.mustard} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pdots)" />
      </svg>
      <style>{`
        @keyframes side-spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ position:'absolute', left:0, top:0, width:W, height:H, zIndex:10, overflow:'hidden' }}>
        {showMirror && <PlayerMirror frame={frame} offY={offY} dispW={dispW} dispH={dispH} scale={mScale} />}
        {showMirror && <MirrorHUD score={score} combo={combo} time={time} />}
        {showAttract && <SideAttract />}
        {showEnd     && <SideEnd score={score} player={player} />}
      </div>

      <SideLeaderboard liveScore={score} livePlayer={player} isLive={showMirror} leftEdge={W} />

      {showMirror && splats.length > 0 && (
        <div style={{ position:'absolute', left:0, top:0, width:W, height:H, overflow:'hidden', pointerEvents:'none', zIndex:25 }}>
          {splats.map((s) => (
            <SideSplat key={s.id} {...s} x={s.nx * dispW} y={offY + s.ny * dispH} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerMirror({ frame, offY, dispW, dispH, scale }) {
  const dt = Math.max(0, Math.min(20, (Date.now() - frame.at) / 16.67));
  const a = frame.anchor;
  const aim = frame.aim;
  const p = frame.projectile;
  const ax = a ? a.x * scale : 0;
  const ay = a ? a.y * scale : 0;

  return (
    <div style={{ position:'absolute', left:0, top:offY, width:dispW, height:dispH, overflow:'hidden' }}>
      {(frame.targets || []).map((t) => {
        const x   = t.x   + (t.vx   || 0) * dt;
        const rot = (t.rot || 0) + (t.vrot || 0) * dt;
        const dy  = Math.sin((Date.now() / 600) + (t.bobPhase || 0)) * (t.bobAmp || 0) * 0.15;
        const drawX = (x - t.size / 2) * scale;
        const drawY = (t.y + dy - t.size / 2) * scale;
        return (
          <div key={t.id} style={{
            position:'absolute', left:0, top:0,
            width: t.size * scale, height: t.size * scale,
            transform: `translate3d(${drawX}px,${drawY}px,0) rotate(${rot}deg)`,
            filter: t.bonus ? `drop-shadow(0 0 22px ${PAL.mustard})` : 'drop-shadow(0 0 10px rgba(0,0,0,0.4))',
            pointerEvents:'none',
          }} dangerouslySetInnerHTML={{ __html: cookieSvgString(t.kind, t.size * scale) }} />
        );
      })}

      {a && !p && <SlingMirror anchor={a} aim={aim} scale={scale} />}

      {p && (() => {
        const px = p.x + (p.vx || 0) * dt;
        const py = p.y + (p.vy || 0) * dt + 0.5 * (frame.gravity || 0.7) * dt * dt;
        const pr = (p.rot || 0) + 18 * dt;
        return (
          <div style={{
            position:'absolute', left:0, top:0,
            width: 120 * scale, height: 120 * scale,
            transform:`translate3d(${(px - 60) * scale}px,${(py - 60) * scale}px,0) rotate(${pr}deg)`,
            filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
            pointerEvents:'none', zIndex:50,
          }} dangerouslySetInnerHTML={{ __html: cookieSvgString('player', 120 * scale) }} />
        );
      })()}

      {a && p && (
        <div style={{
          position:'absolute', left: ax - 4 * scale, top: ay - 10 * scale,
          width: 8 * scale, height: 80 * scale, background:'#5C3A24',
          borderRadius: 4 * scale, zIndex:30,
        }} />
      )}
    </div>
  );
}

function SlingMirror({ anchor, aim, scale }) {
  const x = anchor.x * scale;
  const y = anchor.y * scale;
  const cookieX = (aim ? aim.x : anchor.x)       * scale;
  const cookieY = (aim ? aim.y : anchor.y - 30)  * scale;
  const off30 = 30 * scale;
  return (
    <>
      {aim && (
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:40 }}>
          <line x1={x - off30} y1={y} x2={cookieX} y2={cookieY} stroke={PAL.rust} strokeWidth={6 * scale} strokeLinecap="round" />
          <line x1={x + off30} y1={y} x2={cookieX} y2={cookieY} stroke={PAL.rust} strokeWidth={6 * scale} strokeLinecap="round" />
        </svg>
      )}
      <svg style={{ position:'absolute', left:(x - 70 * scale), top:(y - 10 * scale), width:140 * scale, height:120 * scale, pointerEvents:'none', zIndex:30 }}>
        <path d={`M 70 110 L 70 50 M 70 50 L 32 18 M 70 50 L 108 18`} stroke="#5C3A24" strokeWidth="14" strokeLinecap="round" fill="none" transform={`scale(${scale})`} />
      </svg>
      <div style={{
        position:'absolute', left: cookieX - 60 * scale, top: cookieY - 60 * scale,
        width: 120 * scale, height: 120 * scale,
        filter: aim ? `drop-shadow(0 0 22px ${PAL.coral})` : 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
        zIndex:45, pointerEvents:'none',
      }} dangerouslySetInnerHTML={{ __html: cookieSvgString('player', 120 * scale) }} />
    </>
  );
}

function MirrorHUD({ score, combo, time }) {
  return (
    <div style={{
      position:'absolute', left:12, right:12, top:10,
      display:'flex', justifyContent:'space-between', alignItems:'flex-start',
      pointerEvents:'none', zIndex:60, fontFamily:PAL.display, gap:8,
    }}>
      <div style={mhudChip}>
        <div style={mhudLabel}>SCORE</div>
        <div style={{ ...mhudValue, color: PAL.teal }}>{(score|0).toLocaleString()}</div>
      </div>
      <div style={{ ...mhudChip, textAlign:'center' }}>
        <div style={mhudLabel}>TIME</div>
        <div style={{ ...mhudValue, color: time <= 5 ? PAL.coral : PAL.ink }}>{Math.max(0, time|0)}s</div>
      </div>
      <div style={{ ...mhudChip, textAlign:'right', opacity: combo > 1 ? 1 : 0, transition:'opacity 200ms' }}>
        <div style={mhudLabel}>COMBO</div>
        <div style={{ ...mhudValue, color: PAL.coral }}>×{Math.max(combo, 1)}</div>
      </div>
    </div>
  );
}
const mhudChip = { background: PAL.creamHi, border:`3px solid ${PAL.ink}`, borderRadius:10, boxShadow:`4px 4px 0 ${PAL.ink}`, padding:'6px 12px', fontWeight:900 };
const mhudLabel = { fontSize:12, opacity:0.7, fontFamily:PAL.ui, fontWeight:700, letterSpacing:'0.12em', color:PAL.ink };
const mhudValue = { fontSize:30, lineHeight:1 };

function SideAttract() {
  return (
    <div style={{ position:'absolute', inset:0, zIndex:10 }}>
      <div style={{
        position:'absolute', left:30, top:'50%', transform:'translateY(-50%)',
        width:280, height:280,
        animation:'side-spin 14s linear infinite reverse',
      }} dangerouslySetInnerHTML={{ __html: cookieSvgString('player', 280) }} />
      <div style={{
        position:'absolute', right:30, top:'50%', transform:'translateY(-50%)',
        width:240, height:240,
      }} dangerouslySetInnerHTML={{ __html: cookieSvgString('enemy-mid', 240) }} />
      <div style={{
        position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
        textAlign:'center', width:'56%',
      }}>
        <div style={{
          fontFamily:PAL.display, fontSize:80, lineHeight:0.92, color:PAL.creamHi,
          WebkitTextStroke:`3px ${PAL.ink}`, textShadow:`6px 6px 0 ${PAL.ink}`, letterSpacing:'0.02em',
        }}>
          COOKIE TOSS!<br/>
          <span style={{color:PAL.mustard}}>SLING TO WIN.</span>
        </div>
        <div style={{
          marginTop:14, display:'inline-block',
          background:PAL.mustard, color:PAL.ink,
          padding:'10px 24px', border:`4px solid ${PAL.ink}`, borderRadius:10,
          boxShadow:`5px 5px 0 ${PAL.ink}`, fontSize:30, fontWeight:900,
          fontFamily:PAL.display, letterSpacing:'0.04em',
        }}>PLAY ON THE TABLET →</div>
      </div>
    </div>
  );
}

function SideEnd({ score, player }) {
  return (
    <div style={{
      position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:10, padding:16, overflow:'hidden', textAlign:'center', flexDirection:'column', gap:6,
    }}>
      <div style={{
        fontFamily:PAL.display, fontSize:48, color:PAL.mustard,
        WebkitTextStroke:`3px ${PAL.ink}`, textShadow:`4px 4px 0 ${PAL.ink}`, lineHeight:1,
      }}>FINAL SCORE</div>
      {player && (
        <div style={{
          marginTop:6, fontFamily:PAL.display, fontSize:32, color:PAL.creamHi,
          WebkitTextStroke:`1.5px ${PAL.ink}`, textShadow:`3px 3px 0 ${PAL.ink}`, letterSpacing:'0.06em',
        }}>{(player || '').toUpperCase()}</div>
      )}
      <div style={{
        fontFamily:PAL.display, fontSize:170, lineHeight:0.9, color:PAL.creamHi,
        WebkitTextStroke:`6px ${PAL.ink}`, textShadow:`9px 9px 0 ${PAL.coral}`,
      }}>{score.toLocaleString()}</div>
      <div style={{
        marginTop:4, fontFamily:PAL.display, fontSize:30, color:PAL.creamHi,
        WebkitTextStroke:`2px ${PAL.ink}`, textShadow:`3px 3px 0 ${PAL.ink}`,
      }}>NICE TOSSING!</div>
    </div>
  );
}

function SideLeaderboard({ liveScore = 0, livePlayer = '', isLive = false, leftEdge = null }) {
  const stored = useLeaderboard(20);
  const rows = React.useMemo(() => {
    const liveName = (livePlayer || 'YOU').toUpperCase();
    const all = isLive ? [...stored, { name: liveName, score: liveScore, live: true }] : [...stored];
    all.sort((a, b) => b.score - a.score);
    const seen = new Set(); const out = [];
    for (const r of all) {
      const k = r.name + (r.live ? ':L' : '');
      if (seen.has(k)) continue;
      seen.add(k); out.push(r);
      if (out.length >= 5) break;
    }
    return out;
  }, [stored, liveScore, livePlayer, isLive]);

  return (
    <div style={{
      position:'absolute', right:0, top:0, height:'100%',
      ...(leftEdge != null ? { left: leftEdge } : { width: '25%' }),
      background:'rgba(11,34,31,0.6)', borderLeft:`4px solid ${PAL.ink}`,
      display:'flex', flexDirection:'column', padding:'18px 16px', gap:8,
      backdropFilter:'blur(2px)', zIndex:20,
    }}>
      <div style={{
        fontFamily:PAL.display, fontSize:32, color:PAL.mustard,
        WebkitTextStroke:`2px ${PAL.ink}`, textShadow:`3px 3px 0 ${PAL.ink}`,
        letterSpacing:'0.04em', textAlign:'center', lineHeight:1,
      }}>LEADERBOARD</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
        {rows.length === 0 && (
          <div style={{
            fontFamily:PAL.ui, fontSize:18, fontWeight:900, color:PAL.creamHi,
            opacity:0.75, textAlign:'center', marginTop:24, letterSpacing:'0.08em',
          }}>BE THE FIRST!</div>
        )}
        {rows.map((row, i) => (
          <div key={row.name + i + (row.live ? ':L' : '')} style={{
            display:'grid', gridTemplateColumns:'32px 1fr auto', alignItems:'center', gap:8,
            padding:'8px 10px',
            background: row.live ? PAL.mustard : 'rgba(255,250,240,0.10)',
            border:`2px solid ${PAL.ink}`, borderRadius:8,
            boxShadow: row.live ? `3px 3px 0 ${PAL.ink}` : 'none',
            color: row.live ? PAL.ink : PAL.creamHi,
            fontFamily:PAL.ui, fontWeight:900,
          }}>
            <div style={{
              fontFamily:PAL.display, fontSize:30, lineHeight:1,
              color: row.live ? PAL.coral : (i === 0 ? PAL.mustard : PAL.creamHi),
              WebkitTextStroke: row.live ? '0' : `1.5px ${PAL.ink}`,
              textAlign:'center',
            }}>{i + 1}</div>
            <div style={{ fontSize:26, letterSpacing:'0.08em', lineHeight:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {row.name}
            </div>
            <div style={{
              fontFamily:PAL.display, fontSize:26, lineHeight:1,
              color: row.live ? PAL.coral : PAL.creamHi,
              WebkitTextStroke: row.live ? '0' : `1.5px ${PAL.ink}`,
            }}>{row.score.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SideSplat({ x, y, reaction, combo, points, kind }) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const e = (now - start) / 1100;
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
  const isBonus = kind === 'bonus';
  return (
    <div style={{
      position:'absolute', left:x, top:y,
      transform:`translate(-50%,-50%) scale(${scale}) rotate(${rot}deg)`,
      opacity, pointerEvents:'none', zIndex:40,
    }}>
      <svg width="240" height="240" viewBox="-120 -120 240 240">
        <polygon
          points={Array.from({ length: 18 }, (_, i) => {
            const a = (i / 18) * Math.PI * 2;
            const r = (i % 2 === 0 ? 95 : 55) + Math.sin(i * 1.7) * 10;
            return `${Math.cos(a) * r},${Math.sin(a) * r}`;
          }).join(' ')}
          fill={isBonus ? PAL.mustard : PAL.creamHi} stroke={PAL.ink} strokeWidth="6" strokeLinejoin="round"
        />
      </svg>
      <div style={{
        position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
        fontFamily:PAL.display, fontSize:48, color:PAL.coral,
        WebkitTextStroke:`3px ${PAL.ink}`, textShadow:`4px 4px 0 ${PAL.ink}`,
        whiteSpace:'nowrap', textAlign:'center', lineHeight:1,
      }}>
        {reaction}
        <div style={{ fontSize:24, color:PAL.ink, WebkitTextStroke:'0', textShadow:'none', marginTop:4 }}>+{points}</div>
      </div>
    </div>
  );
}

// ── REAR PANEL — square QR + burst ─────────────────────────────────────────
function PanelRear() { return <PanelScaler designW={REAR_W} designH={REAR_H} bg="#0B221F"><RearInner /></PanelScaler>; }

function RearInner() {
  const cells = 21;
  const grid = React.useMemo(() => {
    const g = [];
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
    if (lx === 0 || lx === 6 || ly === 0 || ly === 6) return true;
    if (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4) return true;
    return false;
  };

  return (
    <div style={{
      position:'relative', width:'100%', height:'100%', overflow:'hidden',
      background:`radial-gradient(circle at 50% 40%, ${PAL.mustard} 0%, #C98F18 70%, #7C5408 100%)`,
      fontFamily: PAL.ui,
    }}>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.18, mixBlendMode:'multiply', pointerEvents:'none' }}>
        <defs>
          <pattern id="rdots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="7" cy="7" r="1.6" fill={PAL.ink} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#rdots)" />
      </svg>
      <div style={{
        position:'absolute', top:18, left:'50%', transform:'translateX(-50%)',
        fontFamily:PAL.display, fontSize:40, color:PAL.coral,
        WebkitTextStroke:`2px ${PAL.ink}`, textShadow:`4px 4px 0 ${PAL.ink}`,
        letterSpacing:'0.04em', whiteSpace:'nowrap',
      }}>COOKIE TOSS</div>
      {/* burst frame around the QR */}
      <svg style={{ position:'absolute', left:'50%', top:'58%', transform:'translate(-50%,-50%)', width:340, height:340, zIndex:2, pointerEvents:'none' }} viewBox="-170 -170 340 340">
        <polygon
          points={Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const r = (i % 2 === 0 ? 150 : 90) + Math.sin(i * 1.3) * 12;
            return `${Math.cos(a) * r},${Math.sin(a) * r}`;
          }).join(' ')}
          fill={PAL.creamHi} stroke={PAL.ink} strokeWidth="8" strokeLinejoin="round"
        />
      </svg>
      <div style={{
        position:'absolute', left:'50%', top:'58%', transform:'translate(-50%,-50%)',
        width:140, height:140, padding:8, background:'#fff',
        border:`4px solid ${PAL.ink}`, borderRadius:6, boxShadow:`4px 4px 0 ${PAL.ink}`, zIndex:6,
      }}>
        <svg viewBox={`0 0 ${cells} ${cells}`} width="100%" height="100%" shapeRendering="crispEdges">
          <rect x="0" y="0" width={cells} height={cells} fill="#fff" />
          {grid.map(({ x, y, on }) => {
            const finder = isFinder(x, y);
            const draw = finder ? finderCell(x, y) : on;
            return draw ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PAL.ink} /> : null;
          })}
        </svg>
      </div>
      <div style={{
        position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)',
        fontFamily:PAL.display, fontSize:24, color:PAL.ink, letterSpacing:'0.08em',
        whiteSpace:'nowrap',
      }}>SCAN TO PLAY AT HOME</div>
    </div>
  );
}

window.PanelSide = PanelSide;
window.PanelRear = PanelRear;
