// cookie-toss-ui.jsx — HUD, slingshot, attract / name / end screens, decor

// chunky chip
const chip = {
  background: '#FFFAF0',
  border: '4px solid ' + PAL.ink,
  borderRadius: 18,
  boxShadow: '6px 6px 0 ' + PAL.ink,
  padding: '12px 22px',
  fontWeight: 900,
};

function HUD({ score, combo, time }) {
  return (
    <div style={{
      position:'absolute', top:20, left:20, right:20,
      display:'flex', justifyContent:'space-between', alignItems:'flex-start',
      pointerEvents:'none', zIndex: 60, fontFamily: PAL.display,
    }}>
      <div style={chip}>
        <div style={{ fontSize:13, opacity:0.65, fontFamily:PAL.ui, fontWeight:700, letterSpacing:'0.14em', color:PAL.ink }}>SCORE</div>
        <div style={{ fontSize:48, lineHeight:1, color:PAL.teal }}>{score.toLocaleString()}</div>
      </div>
      <div style={{ ...chip, textAlign:'center' }}>
        <div style={{ fontSize:13, opacity:0.65, fontFamily:PAL.ui, fontWeight:700, letterSpacing:'0.14em', color:PAL.ink }}>TIME</div>
        <div style={{ fontSize:48, lineHeight:1, color: time <= 5 ? PAL.coral : PAL.ink }}>{time}<span style={{ fontSize:24, opacity:0.5 }}>s</span></div>
      </div>
      <div style={{
        ...chip, textAlign:'right',
        opacity: combo > 1 ? 1 : 0, transition:'opacity 200ms',
      }}>
        <div style={{ fontSize:13, opacity:0.65, fontFamily:PAL.ui, fontWeight:700, letterSpacing:'0.14em', color:PAL.ink }}>COMBO</div>
        <div style={{ fontSize:48, lineHeight:1, color:PAL.coral }}>×{Math.max(combo, 1)}</div>
      </div>
    </div>
  );
}

// floating "+50" pop label
function PointPop({ text, x, y, color, size, rot }) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const e = (now - start) / 900;
      setT(Math.min(1, e));
      if (e < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const pop = t < 0.18 ? 1 - Math.pow(1 - t / 0.18, 3) : 1;
  const scale = 0.5 + pop * 0.7;
  const opacity = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
  const dy = -t * 50;
  return (
    <div style={{
      position:'absolute', left:x, top:y + dy,
      transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${scale})`,
      color, fontFamily: PAL.display, fontSize: size, fontWeight: 900,
      WebkitTextStroke: `${Math.max(2, size/16)}px ${PAL.ink}`,
      textShadow: `4px 4px 0 ${PAL.ink}`,
      opacity, pointerEvents:'none', whiteSpace:'nowrap', zIndex: 100,
    }}>{text}</div>
  );
}

function Slingshot({ x, y, aim, showHints }) {
  const cookieX = aim ? aim.x : x;
  const cookieY = aim ? aim.y : y - 30;
  return (
    <>
      {/* elastic bands from forks to cookie */}
      {aim && (
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:40 }}>
          <line x1={x - 38} y1={y - 10} x2={cookieX} y2={cookieY} stroke={PAL.rust} strokeWidth="6" strokeLinecap="round" />
          <line x1={x + 38} y1={y - 10} x2={cookieX} y2={cookieY} stroke={PAL.rust} strokeWidth="6" strokeLinecap="round" />
          <line x1={x - 38} y1={y - 10} x2={cookieX} y2={cookieY} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1={x + 38} y1={y - 10} x2={cookieX} y2={cookieY} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      )}

      {/* Y-frame slingshot — chunky brown wood */}
      <svg style={{ position:'absolute', left: x - 70, top: y - 10, width: 140, height: 120, pointerEvents:'none', zIndex: 30 }}>
        <path d="M 70 110 L 70 50 M 70 50 L 32 18 M 70 50 L 108 18" stroke="#5C3A24" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M 70 110 L 70 50 M 70 50 L 32 18 M 70 50 L 108 18" stroke="#3F2515" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.6" />
        <circle cx="32" cy="18" r="9" fill="#5C3A24" stroke="#3F2515" strokeWidth="3" />
        <circle cx="108" cy="18" r="9" fill="#5C3A24" stroke="#3F2515" strokeWidth="3" />
      </svg>

      {/* loaded player cookie */}
      <div style={{
        position:'absolute',
        left: cookieX - 60, top: cookieY - 60,
        width: 120, height: 120,
        zIndex: 45, pointerEvents:'none',
        filter: aim ? `drop-shadow(0 0 22px ${PAL.coral})` : 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))',
        transform: aim ? `scale(${1 + Math.min(0.2, Math.hypot(aim.x - x, aim.y - y) / 800)})` : 'scale(1)',
      }} dangerouslySetInnerHTML={{ __html: cookieSvgString('player', 120) }} />

      {!aim && showHints && (
        <div style={{
          position:'absolute', left:x, top:y + 80, transform:'translateX(-50%)',
          color:PAL.tealDeep, fontFamily:PAL.display, fontSize:24, opacity:0.85,
          textShadow:`2px 2px 0 ${PAL.creamHi}`, whiteSpace:'nowrap', letterSpacing:'0.04em',
        }}>DRAG ↙ TO TOSS</div>
      )}

      {/* power meter while aiming */}
      {aim && (() => {
        const dist = Math.hypot(aim.x - x, aim.y - y);
        const power = Math.min(1, dist / 240);
        const segs = 10;
        const filled = Math.round(power * segs);
        const onLeft = aim.x > x;
        return (
          <div style={{
            position:'absolute', left: onLeft ? x - 230 : x + 60, top: y - 70,
            width:170, pointerEvents:'none', zIndex:60,
            fontFamily:PAL.display, color:PAL.ink,
          }}>
            <div style={{ fontSize:13, letterSpacing:'0.14em', marginBottom:4 }}>POWER</div>
            <div style={{ display:'flex', gap:3 }}>
              {Array.from({ length: segs }).map((_, i) => {
                const on = i < filled;
                const color = i < 4 ? PAL.teal : i < 7 ? PAL.mustard : PAL.coral;
                return (
                  <div key={i} style={{
                    flex:1, height:18,
                    background: on ? color : 'rgba(0,0,0,0.08)',
                    border:`2px solid ${PAL.ink}`, borderRadius:3,
                    boxShadow: on ? `0 0 6px ${color}` : 'none',
                    transition:'background 80ms',
                  }} />
                );
              })}
            </div>
            <div style={{ fontSize:18, marginTop:4, fontWeight:900 }}>
              {Math.round(power * 100)}%
            </div>
          </div>
        );
      })()}
    </>
  );
}

// decorative dot grid baked into bg
function DotPattern({ w, h }) {
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:0.18 }}>
      <defs>
        <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="16" cy="16" r="1.6" fill={PAL.tealDeep} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
}

function bigBtn(color = PAL.coral) {
  return {
    padding:'16px 44px', fontSize:28, fontFamily:PAL.display,
    background: color, color:'#FFFAF0',
    border:`4px solid ${PAL.ink}`,
    borderRadius:14, boxShadow:`6px 6px 0 ${PAL.ink}`,
    cursor:'pointer', letterSpacing:'0.04em',
  };
}

function AttractScreen({ onStart }) {
  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'4%', textAlign:'center', zIndex:200, gap:16,
      background: `linear-gradient(180deg, rgba(245,237,224,0.92), rgba(245,237,224,0.96))`,
    }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center', gap:18,
        marginBottom:6,
      }}>
        <div style={{ width:120, height:120 }} dangerouslySetInnerHTML={{ __html: cookieSvgString('enemy-mid', 120) }} />
        <div style={{ width:140, height:140 }} dangerouslySetInnerHTML={{ __html: cookieSvgString('player', 140) }} />
        <div style={{ width:120, height:120 }} dangerouslySetInnerHTML={{ __html: cookieSvgString('bonus', 120) }} />
      </div>

      <h1 style={{
        margin:0, fontFamily:PAL.display, color:PAL.coral,
        fontSize:96, lineHeight:0.95,
        WebkitTextStroke:`4px ${PAL.ink}`, textShadow:`8px 8px 0 ${PAL.ink}`,
        letterSpacing:'0.01em', whiteSpace:'nowrap',
      }}>COOKIE TOSS</h1>
      <div style={{
        marginTop:-4, fontFamily:PAL.display, color:PAL.tealDeep,
        fontSize:30, letterSpacing:'0.14em',
      }}>A 30-SECOND SLINGSHOT SPRINT</div>

      <p style={{
        color:PAL.ink, fontSize:17, fontWeight:600, maxWidth:540,
        marginTop:14, marginBottom:0, lineHeight:1.45, fontFamily:PAL.ui,
      }}>
        Drag back the slingshot, release to fling. Smash teal cookies for points.
        Chain hits for combo bonuses. Gold cookies are worth <b>5×</b> a regular hit.
      </p>

      <button onClick={onStart} style={bigBtn(PAL.coral)}>START →</button>

      <div style={{ display:'flex', gap:24, marginTop:8, fontFamily:PAL.ui, fontWeight:700, fontSize:14, color:PAL.tealDeep }}>
        <Legend kind="enemy-big"   label="50 PTS" />
        <Legend kind="enemy-mid"   label="100 PTS" />
        <Legend kind="enemy-small" label="250 PTS" />
        <Legend kind="bonus"       label="500 PTS" gold />
      </div>
    </div>
  );
}

function Legend({ kind, label, gold }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:46, height:46, filter: gold ? `drop-shadow(0 0 10px ${PAL.mustard})` : 'none' }}
           dangerouslySetInnerHTML={{ __html: cookieSvgString(kind, 46) }} />
      <span>{label}</span>
    </div>
  );
}

function NameScreen({ initial, onSubmit, onBack }) {
  const [name, setName] = React.useState(initial || '');
  const inputRef = React.useRef(null);
  React.useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 80); return () => clearTimeout(t); }, []);
  const trimmed = name.trim().slice(0, 14);
  const canStart = trimmed.length >= 1;
  const submit = () => { if (canStart) onSubmit(trimmed); };

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'4%', textAlign:'center', zIndex:200, gap:18,
      background:'rgba(245,237,224,0.97)',
    }}>
      <h2 style={{
        color:PAL.teal, fontFamily:PAL.display, fontSize:64, margin:0,
        WebkitTextStroke:`3px ${PAL.ink}`, textShadow:`6px 6px 0 ${PAL.ink}`,
      }}>WHO'S TOSSING?</h2>
      <p style={{ color:PAL.ink, fontSize:16, fontWeight:600, margin:0, fontFamily:PAL.ui }}>
        Your name goes on the leaderboard.
      </p>

      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9 ._-]/g, '').slice(0, 14))}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder="ENTER NAME"
        maxLength={14}
        autoCapitalize="characters" autoCorrect="off" spellCheck={false}
        style={{
          fontFamily:PAL.display, fontSize:44, padding:'14px 22px',
          width:'70%', maxWidth:460, textAlign:'center', letterSpacing:'0.08em',
          background:'#FFFAF0', color:PAL.ink,
          border:`4px solid ${PAL.ink}`, borderRadius:12,
          boxShadow:`6px 6px 0 ${PAL.ink}`, outline:'none',
          textTransform:'uppercase',
        }}
      />
      <div style={{ color:PAL.ink, fontSize:13, opacity:0.6, fontFamily:PAL.ui }}>
        {trimmed.length}/14 · letters, numbers, spaces
      </div>

      <div style={{ display:'flex', gap:14, marginTop:10 }}>
        <button onClick={onBack} style={{ ...bigBtn(PAL.tealDeep), fontSize:22, padding:'12px 28px' }}>← BACK</button>
        <button onClick={submit} disabled={!canStart} style={{
          ...bigBtn(canStart ? PAL.coral : '#777'), opacity: canStart ? 1 : 0.6,
          cursor: canStart ? 'pointer' : 'not-allowed',
        }}>TOSS IT →</button>
      </div>
    </div>
  );
}

function EndScreen({ score, playerName, onAgain, onHome }) {
  const top = useLeaderboard(5);
  const myKey = (playerName || '').toUpperCase();
  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'3% 4%', textAlign:'center', zIndex:200, gap:14,
      background:'rgba(245,237,224,0.96)',
    }}>
      <h2 style={{
        color:PAL.coral, fontFamily:PAL.display, fontSize:62, margin:0,
        WebkitTextStroke:`3px ${PAL.ink}`, textShadow:`6px 6px 0 ${PAL.ink}`,
      }}>CRUMB OF GLORY!</h2>

      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:28,
        width:'92%', maxWidth:880, alignItems:'center',
      }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
          {playerName && (
            <div style={{
              fontFamily:PAL.display, fontSize:28, color:PAL.tealDeep,
              WebkitTextStroke:`1.5px ${PAL.ink}`, letterSpacing:'0.06em',
            }}>{playerName.toUpperCase()}</div>
          )}
          <div style={{
            fontFamily:PAL.display, fontSize:130, color:PAL.teal,
            WebkitTextStroke:`5px ${PAL.ink}`, textShadow:`8px 8px 0 ${PAL.ink}`,
            lineHeight:1,
          }}>{score.toLocaleString()}</div>
          <p style={{ color:PAL.ink, fontSize:16, fontWeight:700, margin:'6px 0 0', fontFamily:PAL.ui }}>FINAL SCORE</p>
        </div>

        <div style={{
          background:'#FFFAF0', border:`4px solid ${PAL.ink}`, borderRadius:14,
          padding:14, display:'flex', flexDirection:'column', gap:6,
          boxShadow:`6px 6px 0 ${PAL.ink}`,
        }}>
          <div style={{
            fontFamily:PAL.display, fontSize:26, color:PAL.mustard,
            WebkitTextStroke:`2px ${PAL.ink}`,
            letterSpacing:'0.08em', textAlign:'center', lineHeight:1, marginBottom:4,
          }}>TOP 5</div>
          {top.length === 0 && (
            <div style={{ color:PAL.ink, fontSize:14, opacity:0.7, padding:'12px 0', fontFamily:PAL.ui }}>BE THE FIRST!</div>
          )}
          {top.map((row, i) => {
            const isMe = row.name === myKey && row.score === score;
            return (
              <div key={i} style={{
                display:'grid', gridTemplateColumns:'30px 1fr auto', alignItems:'center', gap:10,
                padding:'8px 10px',
                background: isMe ? PAL.mustard : 'rgba(0,0,0,0.04)',
                color: PAL.ink,
                border:`2px solid ${PAL.ink}`, borderRadius:8,
                fontFamily:PAL.display, fontSize:22, lineHeight:1,
              }}>
                <div style={{ textAlign:'center' }}>{i + 1}</div>
                <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'left' }}>
                  {row.name}{isMe ? ' ★' : ''}
                </div>
                <div>{row.score.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:'flex', gap:14, marginTop:8 }}>
        <button onClick={onHome}  style={{ ...bigBtn(PAL.tealDeep), fontSize:22, padding:'12px 28px' }}>HOME</button>
        <button onClick={onAgain} style={bigBtn(PAL.coral)}>PLAY AGAIN →</button>
      </div>
    </div>
  );
}

Object.assign(window, { HUD, Slingshot, PointPop, AttractScreen, NameScreen, EndScreen, DotPattern });
