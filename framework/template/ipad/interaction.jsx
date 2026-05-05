// interaction.jsx
// ─────────────────────────────────────────────────────────────────────────────
// THE MECHANIC. Replace this file with your campaign's actual iPad UX.
//
// Available via window.CAMPAIGN:
//   • CFG, BRAND, COPY, ASSETS, asset(name)   — campaign config
//   • sendSync(msg)                            — broadcast to the truck
//   • useSync(handler)                         — listen to events
//   • recordScore(name, score)                 — append to leaderboard
//
// Default event vocabulary (the template truck/hud.jsx listens for these):
//   sendSync({ type: 'start',  player });
//   sendSync({ type: 'hit',    totalScore, player, sfx, points });
//   sendSync({ type: 'end',    totalScore, player });
//
// What ships here is a "tap to score" stub — tap the button, score climbs,
// truck reacts. Replace freely. See `oreo/ipad/ipad-game.jsx` for a richer
// reference (slingshot, physics, name entry, end screen).
// ─────────────────────────────────────────────────────────────────────────────

function Interaction() {
  const { COPY, BRAND, sendSync, recordScore } = window.CAMPAIGN;
  const [phase,  setPhase]  = React.useState('intro');  // intro | play | done
  const [name,   setName]   = React.useState('');
  const [score,  setScore]  = React.useState(0);

  const palette = BRAND.palette || {};
  const fonts   = BRAND.fonts   || {};
  const sfxList = (COPY.sfx && COPY.sfx.length) ? COPY.sfx : ['TAP!'];

  const start = () => {
    setScore(0);
    setPhase('play');
    sendSync({ type: 'start', player: name.toUpperCase() });
  };

  const tap = () => {
    setScore((s) => {
      const next = s + 1;
      sendSync({
        type: 'hit',
        totalScore: next,
        player: name.toUpperCase(),
        sfx: sfxList[next % sfxList.length],
        points: 1,
      });
      return next;
    });
  };

  const end = () => {
    setPhase('done');
    sendSync({ type: 'end', totalScore: score, player: name.toUpperCase() });
    if (score > 0) recordScore(name, score);
  };

  const wrap = {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 24,
    background: palette.bg || '#0A1A3F', color: palette.paper || '#fff',
    fontFamily: fonts.ui || 'system-ui, sans-serif', padding: 24, textAlign: 'center',
  };
  const headline = {
    fontFamily: fonts.display || 'Impact, sans-serif', fontSize: 80, lineHeight: 0.95,
    color: palette.paper || '#fff',
    WebkitTextStroke: '3px ' + (palette.ink || '#0a0a0a'),
    textShadow: '6px 6px 0 ' + (palette.ink || '#0a0a0a'),
    margin: 0,
  };
  const btn = {
    padding: '22px 44px', fontSize: 32, fontWeight: 900,
    fontFamily: fonts.display || 'Impact, sans-serif',
    background: palette.accent || '#FFD60A', color: palette.ink || '#0a0a0a',
    border: '4px solid ' + (palette.ink || '#0a0a0a'),
    borderRadius: 14, boxShadow: '6px 6px 0 ' + (palette.ink || '#0a0a0a'),
    cursor: 'pointer', letterSpacing: '0.04em',
  };
  const tapBtn = {
    ...btn, fontSize: 64, padding: '60px 80px', marginTop: 16,
    background: palette.primary || '#0066CC', color: palette.paper || '#fff',
  };
  const input = {
    padding: '14px 18px', fontSize: 22, borderRadius: 10,
    border: '3px solid ' + (palette.ink || '#0a0a0a'),
    background: palette.paper || '#fff', color: palette.ink || '#0a0a0a',
    fontFamily: fonts.ui || 'system-ui', minWidth: 280, textAlign: 'center',
  };

  if (phase === 'intro') {
    return (
      <div style={wrap}>
        <h1 style={headline}>{COPY.headline || 'CAMPAIGN'}</h1>
        {COPY.subhead && <h2 style={{ ...headline, fontSize: 44, color: palette.accent || '#FFD60A' }}>{COPY.subhead}</h2>}
        <input
          style={input}
          placeholder="YOUR NAME"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          autoFocus
        />
        <button style={btn} onClick={start} disabled={!name.trim()}>
          {COPY.cta || 'START'}
        </button>
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={wrap}>
        <div style={{ fontFamily: fonts.display, fontSize: 28, color: palette.accent }}>{name.toUpperCase()}</div>
        <div style={{ ...headline, fontSize: 200, lineHeight: 0.9 }}>{score}</div>
        <button style={tapBtn} onClick={tap}>TAP</button>
        <button style={{ ...btn, marginTop: 24, background: palette.paper || '#fff' }} onClick={end}>
          DONE
        </button>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <h2 style={{ ...headline, fontSize: 56 }}>FINAL SCORE</h2>
      <div style={{ ...headline, fontSize: 200, lineHeight: 0.9 }}>{score}</div>
      <button style={btn} onClick={() => { setName(''); setScore(0); setPhase('intro'); }}>
        PLAY AGAIN
      </button>
    </div>
  );
}
