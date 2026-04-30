// ipad-game.jsx — iPad slingshot/web-sling game
// The player drags back from the slingshot anchor, releasing flicks a
// Spider-Man cookie at drifting Venom cookies. A web strand stretches
// from anchor to fingertip during aim. Multiple targets at varying
// sizes/speeds/values. Combos build on consecutive hits.

const ROUND_SECONDS = 30;

function IpadGame(props) {
  return (
    <IpadScaler>
      <IpadInner {...props} />
    </IpadScaler>
  );
}// Scale the iPad design (1024×768 landscape OR 768×1024 portrait, whichever
// matches the container's orientation) and uniformly scale to FIT (contain),
// letterboxing if needed. Game art always renders cleanly without overflow.
function IpadScaler({ children }) {
  const ref = React.useRef(null);
  const [s, setS] = React.useState({ scale: 1, w: 1024, h: 768 });
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const portrait = r.height > r.width;
      const dw = portrait ? 768  : 1024;
      const dh = portrait ? 1024 : 768;
      // contain: pick the smaller of width/height ratios
      const scale = Math.min(r.width / dw, r.height / dh);
      setS({ scale, w: dw, h: dh });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0A1A3F' }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: s.w, height: s.h,
        transform: `translate(-50%, -50%) scale(${s.scale})`,
        transformOrigin: 'center center',
      }}>
        {children}
      </div>
    </div>
  );
}

function IpadInner({ tweaks = {}, scaleHints = {}, autoplay = false }) {
  const speedMul   = tweaks.targetSpeed   ?? 1.0;
  const powerMul   = tweaks.throwPower    ?? 1.0;
  const gravityMul = tweaks.gravity       ?? 1.0;
  const showHints  = tweaks.showHints     ?? true;

  const stageRef = React.useRef(null);
  const [stageSize, setStageSize] = React.useState({ w: 1024, h: 1366 });
  React.useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [phase, setPhase]       = React.useState('attract'); // attract | name | playing | end
  const [playerName, setPlayerName] = React.useState('');
  const [score, setScore]       = React.useState(0);
  const [combo, setCombo]       = React.useState(0);
  const [time, setTime]         = React.useState(ROUND_SECONDS);
  const [targets, setTargets]   = React.useState([]);
  const [projectile, setProjectile] = React.useState(null); // {x,y,vx,vy}
  const [aim, setAim]           = React.useState(null);     // {x,y} fingertip
  const [sfx, setSfx]           = React.useState([]);
  const [parts, burst]          = useParticles();

  const bus = getBus();

  // Anchor for slingshot at bottom-center
  const anchor = { x: stageSize.w / 2, y: stageSize.h - 140 };

  // ── target spawner ────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== 'playing') return;
    let id = 0;
    const seed = () => {
      const archetype = pickTargetKind();
      const fromLeft = Math.random() > 0.5;
      const y = 100 + Math.random() * (stageSize.h * 0.5);
      const speed = (1.5 + Math.random() * 1.5) * archetype.speedMul * speedMul;
      const t = {
        id: ++id + Math.random(),
        archetype,
        x: fromLeft ? -archetype.size : stageSize.w + archetype.size,
        y,
        vx: fromLeft ? speed : -speed,
        vy: 0,
        bobPhase: Math.random() * Math.PI * 2,
        bobAmp: 6 + Math.random() * 12,
        rot: 0,
        vrot: (Math.random() - 0.5) * 1.2,
        alive: true,
      };
      setTargets((ts) => [...ts, t]);
    };
    // initial pop-in
    seed(); seed();
    const iv = setInterval(seed, 1100);
    return () => clearInterval(iv);
  }, [phase, stageSize.h, stageSize.w, speedMul]);

  // ── animation loop ────────────────────────────────────────────────
  React.useEffect(() => {
    let raf, last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      setTargets((ts) =>
        ts
          .map((t) => {
            const nx = t.x + t.vx;
            const ny = t.y + Math.sin((now / 600) + t.bobPhase) * 0.8;
            return { ...t, x: nx, y: ny, rot: t.rot + t.vrot };
          })
          .filter((t) => t.alive && t.x > -t.archetype.size - 50 && t.x < stageSize.w + t.archetype.size + 50)
      );
      // projectile
      setProjectile((p) => {
        if (!p) return p;
        const np = {
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.7 * gravityMul,
          rot: (p.rot || 0) + 18,
        };
        if (np.y > stageSize.h + 100 || np.x < -100 || np.x > stageSize.w + 100) {
          // miss
          if (phase === 'playing') {
            bus.send({ type: 'miss', at: Date.now() });
            setCombo(0);
          }
          return null;
        }
        return np;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stageSize.w, stageSize.h, gravityMul, phase]);

  // ── collision ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!projectile) return;
    for (const t of targets) {
      const dx = t.x - projectile.x;
      const dy = t.y - projectile.y;
      const r = (t.archetype.size / 2) * 0.85 + 36;
      if (dx * dx + dy * dy < r * r) {
        // HIT
        const newCombo = combo + 1;
        const points = Math.round(t.archetype.points * (1 + (newCombo - 1) * 0.25));
        const newScore = score + points;
        setScore(newScore);
        setCombo(newCombo);
        setTargets((ts) => ts.filter((x) => x.id !== t.id));
        const label = pickSfx(newCombo);
        const sfxId = Math.random();
        setSfx((s) => [...s, {
          id: sfxId, text: label, x: t.x, y: t.y,
          color: t.archetype.bonus ? '#FFD60A' : (newCombo >= 3 ? '#FFD60A' : '#fff'),
          size: 56 + Math.min(newCombo, 6) * 6,
          rot: (Math.random() - 0.5) * 12,
        }]);
        setTimeout(() => setSfx((s) => s.filter((x) => x.id !== sfxId)), 900);
        burst(t.x, t.y, { count: 22, color: '#fff', spread: 14, upward: 12 });
        burst(t.x, t.y, { count: 10, color: BRAND.blue, spread: 18, upward: 14 });
        setProjectile(null);
        bus.send({
          type: 'hit',
          points,
          totalScore: newScore,
          combo: newCombo,
          targetKind: t.archetype.kind,
          x: t.x / stageSize.w,
          y: t.y / stageSize.h,
          sfx: label,
          at: Date.now(),
        });
        return;
      }
    }
  }, [projectile, targets, combo, score, burst, bus, stageSize.w, stageSize.h]);

  // ── round timer ───────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== 'playing') return;
    if (time <= 0) {
      setPhase('end');
      bus.send({ type: 'end', totalScore: score, player: playerName, at: Date.now() });
      // Record this run in the session leaderboard so it persists across rounds.
      try { recordScore(playerName || 'PLAYER', score); } catch (e) {}
      return;
    }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, time, score, bus]);

  const startGame = (nameOverride) => {
    setScore(0); setCombo(0); setTime(ROUND_SECONDS);
    setTargets([]); setProjectile(null); setSfx([]);
    setPhase('playing');
    const name = (nameOverride ?? playerName) || '';
    bus.send({ type: 'start', player: name, at: Date.now() });
  };

  // ── autoplay (ghost player demo) ──────────────────────────────────
  // Drives the slingshot automatically: aims at a live target, releases,
  // and loops the round. Used when this iPad is rendered in the preview
  // canvas so spectators see real gameplay reactivity on both screens.
  const targetsRef    = React.useRef(targets);
  const projectileRef = React.useRef(projectile);
  const phaseRef      = React.useRef(phase);
  React.useEffect(() => { targetsRef.current    = targets;    }, [targets]);
  React.useEffect(() => { projectileRef.current = projectile; }, [projectile]);
  React.useEffect(() => { phaseRef.current      = phase;      }, [phase]);

  React.useEffect(() => {
    if (!autoplay) return;
    let alive = true;
    const wait = (ms) => new Promise((r) => setTimeout(() => alive && r(), ms));

    const fireOnce = async () => {
      // Pick a live target; prefer those nearer center / mid-air
      const ts = targetsRef.current;
      if (!ts.length) return false;
      const target = ts.reduce((best, t) => {
        const score = -(Math.abs(t.x - stageSize.w / 2)) - Math.abs(t.y - stageSize.h * 0.4);
        return (!best || score > best.score) ? { t, score } : best;
      }, null).t;

      // Solve a slingshot release that lands a projectile near target.
      // Projectile uses: vx = dx * 0.12 * powerMul, vy = (dy * 0.12 * powerMul) - 4
      // and gravity ~ 0.7 * gravityMul per tick (tick≈16ms but applied in raf).
      // We approximate by trial: brute-force scan release angles/distances.
      const tx = target.x, ty = target.y;
      const ax = anchor.x, ay = anchor.y - 30;
      let best = null;
      for (let dist = 120; dist <= 240; dist += 20) {
        for (let ang = -2.6; ang <= -0.5; ang += 0.12) {
          // aim point is opposite to release direction
          const aimX = ax - Math.cos(ang) * dist;
          const aimY = ay - Math.sin(ang) * dist;
          const dx = ax - aimX, dy = ay - aimY;
          let vx = dx * 0.12 * powerMul;
          let vy = dy * 0.12 * powerMul - 4;
          let px = ax, py = ay;
          let minD = Infinity;
          for (let k = 0; k < 120; k++) {
            px += vx; py += vy; vy += 0.7 * gravityMul;
            const d = Math.hypot(px - tx, py - ty);
            if (d < minD) minD = d;
            if (py > stageSize.h + 50) break;
          }
          if (!best || minD < best.minD) best = { aimX, aimY, minD };
        }
      }
      if (!best) return false;
      // jitter so it looks human (and occasionally misses)
      const jitter = 18;
      const aimX = best.aimX + (Math.random() - 0.5) * jitter;
      const aimY = best.aimY + (Math.random() - 0.5) * jitter;

      // Animated drag-back over ~350ms
      setAim({ x: ax, y: ay });
      const steps = 14;
      for (let i = 1; i <= steps; i++) {
        if (!alive) return false;
        const k = i / steps;
        // ease-out
        const e = 1 - Math.pow(1 - k, 2);
        setAim({ x: ax + (aimX - ax) * e, y: ay + (aimY - ay) * e });
        await wait(22);
      }
      await wait(140);
      if (!alive || phaseRef.current !== 'playing') return false;
      // Release — mimics onPointerUp
      const dx = ax - aimX, dy = ay - aimY;
      const power = Math.min(1, Math.hypot(dx, dy) / 220);
      if (power >= 0.15) {
        setProjectile({
          x: ax, y: ay,
          vx: dx * 0.12 * powerMul,
          vy: dy * 0.12 * powerMul - 4,
          rot: 0,
        });
        bus.send({ type: 'throw', power, at: Date.now() });
      }
      setAim(null);
      return true;
    };

    const loop = async () => {
      while (alive) {
        // start a fresh round when on attract or end
        if (phaseRef.current !== 'playing') {
          await wait(1100);
          if (!alive) return;
          startGame();
          await wait(800);
          continue;
        }
        // wait for projectile to clear and a target to be in flight
        if (projectileRef.current) { await wait(120); continue; }
        if (!targetsRef.current.length) { await wait(180); continue; }
        const ok = await fireOnce();
        await wait(ok ? 700 + Math.random() * 400 : 250);
      }
    };
    const startT = setTimeout(loop, 600);
    return () => { alive = false; clearTimeout(startT); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, stageSize.w, stageSize.h]);

  // ── sling input ───────────────────────────────────────────────────
  const dragging = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0 }); // where the finger touched down
  const onPointerDown = (e) => {
    if (phase !== 'playing' || projectile) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    dragging.current = true;
    dragStart.current = { x, y };
    // Aim starts AT the anchor (power = 0). Power builds only as the finger
    // moves AWAY from where it first touched down.
    setAim({ x: anchor.x, y: anchor.y });
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    // Aim = anchor + (finger movement since touchdown). Tapping without moving
    // keeps power at 0; you have to drag to charge the slingshot.
    let dx = x - dragStart.current.x;
    let dy = y - dragStart.current.y;
    // clamp drag distance to a max pull
    const d = Math.hypot(dx, dy);
    const max = 260;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    setAim({ x: anchor.x + dx, y: anchor.y + dy });
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (!aim) return;
    const dx = anchor.x - aim.x;
    const dy = anchor.y - aim.y;
    const dist = Math.hypot(dx, dy);
    const power = Math.min(1, dist / 240);
    if (power < 0.10) { setAim(null); return; }
    // Velocity scales linearly with drag distance — small drag = soft throw,
    // full drag = full power. The upward kick is also proportional so weak
    // throws don't get an artificial boost that masks the input.
    const k = 0.13 * powerMul;
    setProjectile({
      x: anchor.x, y: anchor.y - 30,
      vx: dx * k,
      vy: dy * k - 3.2 * power * powerMul,
      rot: 0,
    });
    setAim(null);
    bus.send({ type: 'throw', power, at: Date.now() });
  };

  // ── render ────────────────────────────────────────────────────────
  return (
    <div
      ref={stageRef}
      onMouseDown={autoplay ? undefined : onPointerDown}
      onMouseMove={autoplay ? undefined : onPointerMove}
      onMouseUp={autoplay ? undefined : onPointerUp}
      onMouseLeave={autoplay ? undefined : onPointerUp}
      onTouchStart={autoplay ? undefined : onPointerDown}
      onTouchMove={autoplay ? undefined : onPointerMove}
      onTouchEnd={autoplay ? undefined : onPointerUp}
      style={{
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
        background: `#0A1A3F url('${window.ASSET_BASE||'assets/'}marvel-background.jpeg') center/cover no-repeat`,
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none',
        cursor: autoplay ? 'default' : (phase === 'playing' ? 'grab' : 'pointer'),
        fontFamily: BRAND.ui,
      }}
    >
      {/* DEMO badge during autoplay */}
      {autoplay && (
        <div style={{
          position: 'absolute', top: 14, left: 14, zIndex: 60,
          padding: '6px 14px', background: BRAND.marvelRed, color: '#fff',
          border: '3px solid #0a0a0a', borderRadius: 8,
          fontFamily: BRAND.display, fontSize: 22, fontWeight: 900,
          boxShadow: '4px 4px 0 #0a0a0a', letterSpacing: '0.06em',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
          DEMO
        </div>
      )}

      {/* Ghost finger that follows the auto-aim, so viewers see the drag */}
      {autoplay && aim && (
        <div style={{
          position: 'absolute', left: aim.x, top: aim.y, zIndex: 55,
          transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            border: '3px solid rgba(255,255,255,0.85)',
            boxShadow: '0 0 24px rgba(255,255,255,0.5), 0 0 0 8px rgba(255,255,255,0.08)',
          }} />
        </div>
      )}
      {/* dark vignette so HUD/cookies pop on the busy comic art */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }} />
      {/* Speed lines burst */}
      <img src={(window.ASSET_BASE||'assets/')+'burst.png'} alt="" style={{
        position: 'absolute', left: '50%', top: '40%', width: '180%', transform: 'translate(-50%,-50%)',
        opacity: 0.35, mixBlendMode: 'screen', pointerEvents: 'none',
      }} />

      {/* HUD */}
      {phase === 'playing' && <IpadHUD score={score} combo={combo} time={time} />}

      {/* targets */}
      {targets.map((t) => (
        <img key={t.id} src={t.archetype.img} alt="" style={{
          position: 'absolute',
          left: t.x - t.archetype.size / 2,
          top:  t.y - t.archetype.size / 2,
          width: t.archetype.size, height: t.archetype.size,
          transform: `rotate(${t.rot}deg)`,
          filter: t.archetype.bonus ? 'drop-shadow(0 0 24px #FFD60A)' : 'drop-shadow(0 6px 18px rgba(0,0,0,0.4))',
          pointerEvents: 'none',
        }} />
      ))}

      {/* particles */}
      {parts.map((p) => (
        <div key={p.id} style={{
          position: 'absolute', left: p.x - p.size / 2, top: p.y - p.size / 2,
          width: p.size, height: p.size, background: p.color,
          opacity: p.life, transform: `rotate(${p.rot}deg)`,
          borderRadius: 2, pointerEvents: 'none',
        }} />
      ))}

      {/* SFX labels */}
      {sfx.map((s) => <SfxLabel key={s.id} {...s} />)}

      {/* projectile */}
      {projectile && (
        <img src={(window.ASSET_BASE||'assets/')+'cookie-spider.png'} alt="" style={{
          position: 'absolute',
          left: projectile.x - 60, top: projectile.y - 60,
          width: 120, height: 120,
          transform: `rotate(${projectile.rot}deg)`,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
          pointerEvents: 'none', zIndex: 50,
        }} />
      )}

      {/* slingshot anchor + web strand */}
      {phase === 'playing' && !projectile && (
        <>
          <SlingshotAnchor x={anchor.x} y={anchor.y} aim={aim} showHints={showHints} />
        </>
      )}

      {/* attract / start */}
      {phase === 'attract' && <IpadAttract onStart={() => setPhase('name')} />}
      {phase === 'name' && (
        <IpadNameEntry
          initial={playerName}
          onSubmit={(n) => { setPlayerName(n); startGame(n); }}
          onBack={() => setPhase('attract')}
        />
      )}
      {phase === 'end' && <IpadEnd score={score} playerName={playerName} onAgain={() => setPhase('name')} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function IpadHUD({ score, combo, time }) {
  return (
    <div style={{
      position: 'absolute', top: 16, left: 16, right: 16,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      pointerEvents: 'none', zIndex: 60, fontFamily: BRAND.display,
    }}>
      <div style={{ ...comicChip, padding: '10px 18px' }}>
        <div style={{ fontSize: 12, opacity: 0.75, fontFamily: BRAND.ui, fontWeight: 700, letterSpacing: '0.1em' }}>SCORE</div>
        <div style={{ fontSize: 44, lineHeight: 1, color: BRAND.blue, WebkitTextStroke: '2px #0a0a0a' }}>{score.toLocaleString()}</div>
      </div>
      <div style={{ ...comicChip, padding: '10px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, opacity: 0.75, fontFamily: BRAND.ui, fontWeight: 700, letterSpacing: '0.1em' }}>TIME</div>
        <div style={{ fontSize: 44, lineHeight: 1, color: time <= 5 ? BRAND.marvelRed : '#0a0a0a' }}>{time}s</div>
      </div>
      <div style={{
        ...comicChip, padding: '10px 18px', textAlign: 'right',
        opacity: combo > 1 ? 1 : 0, transition: 'opacity 200ms',
      }}>
        <div style={{ fontSize: 12, opacity: 0.75, fontFamily: BRAND.ui, fontWeight: 700, letterSpacing: '0.1em' }}>COMBO</div>
        <div style={{ fontSize: 44, lineHeight: 1, color: BRAND.marvelRed, WebkitTextStroke: '2px #0a0a0a' }}>×{Math.max(combo, 1)}</div>
      </div>
    </div>
  );
}

const comicChip = {
  background: '#fff',
  border: '3px solid #0a0a0a',
  borderRadius: 14,
  boxShadow: '4px 4px 0 #0a0a0a',
  padding: '8px 14px',
  fontWeight: 900,
};

// ─────────────────────────────────────────────────────────────────────────────
function SlingshotAnchor({ x, y, aim, showHints = true }) {
  const cookieX = aim ? aim.x : x;
  const cookieY = aim ? aim.y : y - 30;
  return (
    <>
      {/* Web strand from anchor to fingertip */}
      {aim && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40 }}>
          <defs>
            <pattern id="web" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M0 7 L14 7" stroke="#fff" strokeWidth="1.5" />
            </pattern>
          </defs>
          {/* main strand */}
          <line x1={x - 30} y1={y} x2={cookieX} y2={cookieY} stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <line x1={x + 30} y1={y} x2={cookieX} y2={cookieY} stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          {/* spider-web zigzag detail */}
          <line x1={x - 30} y1={y} x2={cookieX} y2={cookieY} stroke={BRAND.blue} strokeWidth="1.5" strokeDasharray="3 5" />
          <line x1={x + 30} y1={y} x2={cookieX} y2={cookieY} stroke={BRAND.blue} strokeWidth="1.5" strokeDasharray="3 5" />
        </svg>
      )}
      {/* Slingshot Y posts */}
      <div style={{
        position: 'absolute', left: x - 4, top: y - 10, width: 8, height: 80,
        background: '#0a0a0a', borderRadius: 4, zIndex: 30,
      }} />
      <div style={{
        position: 'absolute', left: x - 38, top: y - 14, width: 8, height: 30,
        background: '#0a0a0a', borderRadius: 4, transform: 'rotate(-15deg)', zIndex: 30,
      }} />
      <div style={{
        position: 'absolute', left: x + 30, top: y - 14, width: 8, height: 30,
        background: '#0a0a0a', borderRadius: 4, transform: 'rotate(15deg)', zIndex: 30,
      }} />

      {/* loaded Spider cookie */}
      <img src={(window.ASSET_BASE||'assets/')+'cookie-spider.png'} alt="" style={{
        position: 'absolute',
        left: cookieX - 60, top: cookieY - 60,
        width: 120, height: 120,
        filter: aim ? 'drop-shadow(0 0 22px rgba(0,176,255,0.9))' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
        transform: aim ? `scale(${1 + Math.min(0.2, Math.hypot(aim.x - x, aim.y - y) / 800)})` : 'scale(1)',
        zIndex: 45, pointerEvents: 'none',
      }} />

      {/* hint */}
      {!aim && showHints && (
        <div style={{
          position: 'absolute', left: x, top: y + 80, transform: 'translateX(-50%)',
          color: '#fff', fontFamily: BRAND.display, fontSize: 22, opacity: 0.85,
          textShadow: '2px 2px 0 #0a0a0a', whiteSpace: 'nowrap',
        }}>
          DRAG ↙ TO SLING
        </div>
      )}

      {/* power meter — visible while aiming so the variable strength is obvious */}
      {aim && (() => {
        const dist = Math.hypot(aim.x - x, aim.y - y);
        const power = Math.min(1, dist / 240);
        const segs = 10;
        const filled = Math.round(power * segs);
        // place to the side of the slingshot, away from finger
        const onLeft = aim.x > x;
        return (
          <div style={{
            position: 'absolute',
            left: onLeft ? x - 230 : x + 60,
            top: y - 70,
            width: 170, pointerEvents: 'none', zIndex: 60,
            fontFamily: BRAND.display, color: '#fff',
            textShadow: '2px 2px 0 #0a0a0a',
          }}>
            <div style={{ fontSize: 13, letterSpacing: '0.12em', marginBottom: 4 }}>POWER</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: segs }).map((_, i) => {
                const on = i < filled;
                // gradient from blue → yellow → red as power climbs
                const color = i < 4 ? BRAND.blue : i < 7 ? BRAND.yellow : BRAND.marvelRed;
                return (
                  <div key={i} style={{
                    flex: 1, height: 16,
                    background: on ? color : 'rgba(255,255,255,0.15)',
                    border: '2px solid #0a0a0a', borderRadius: 2,
                    boxShadow: on ? `0 0 8px ${color}` : 'none',
                    transition: 'background 80ms, box-shadow 80ms',
                  }} />
                );
              })}
            </div>
            <div style={{ fontSize: 18, marginTop: 4, fontWeight: 900 }}>
              {Math.round(power * 100)}%
            </div>
          </div>
        );
      })()}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function IpadAttract({ onStart }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '4%', textAlign: 'center',
      background: 'rgba(10,26,63,0.62)', backdropFilter: 'blur(2px)', zIndex: 200,
      overflow: 'hidden',
    }}>
      <img src={(window.ASSET_BASE||'assets/')+'lockup-pos.png'} style={{ width: '46%', maxWidth: 420, marginBottom: 14 }} />
      <img src={(window.ASSET_BASE||'assets/')+'cookie-spider.png'} style={{ width: '22%', maxWidth: 180, marginBottom: 8, filter: 'drop-shadow(0 0 30px rgba(0,176,255,0.7))' }} />
      <h2 style={{
        color: BRAND.yellow, fontFamily: BRAND.display, fontSize: 56, margin: 0,
        WebkitTextStroke: '3px #0a0a0a', textShadow: '5px 5px 0 #0a0a0a', letterSpacing: '0.02em',
        textAlign: 'center', whiteSpace: 'nowrap',
      }}>SLING THE STUF!</h2>
      <p style={{ color: '#fff', fontSize: 16, fontWeight: 600, maxWidth: '78%', marginTop: 8, marginBottom: 0, textAlign: 'center', lineHeight: 1.35 }}>
        Sling the Spider-Man OREO at Venom cookies.<br/>
        30 second sprint. Unlimited cookies. Cap = bonus.
      </p>
      <button onClick={onStart} style={{
        marginTop: 18, padding: '14px 42px', fontSize: 26, fontFamily: BRAND.display,
        background: BRAND.marvelRed, color: '#fff', border: '4px solid #0a0a0a',
        borderRadius: 12, boxShadow: '6px 6px 0 #0a0a0a', cursor: 'pointer',
        letterSpacing: '0.04em',
      }}>POWER UP →</button>
    </div>
  );
}

function IpadEnd({ score, playerName, onAgain }) {
  const top = useLeaderboard(5);
  const myKey = (playerName || '').toUpperCase();
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '3% 4%', textAlign: 'center',
      background: 'rgba(10,26,63,0.82)', zIndex: 200, overflow: 'hidden', gap: 14,
    }}>
      <h2 style={{
        color: BRAND.yellow, fontFamily: BRAND.display, fontSize: 56, margin: 0,
        WebkitTextStroke: '3px #0a0a0a', textShadow: '5px 5px 0 #0a0a0a', textAlign: 'center',
      }}>STUF OF LEGENDS!</h2>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22,
        width: '92%', maxWidth: 880, alignItems: 'center',
      }}>
        {/* Left: final score */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {playerName && (
            <div style={{
              fontFamily: BRAND.display, fontSize: 28, color: '#fff',
              WebkitTextStroke: '1.5px #0a0a0a', textShadow: '3px 3px 0 #0a0a0a', letterSpacing: '0.06em',
            }}>{playerName.toUpperCase()}</div>
          )}
          <div style={{
            fontFamily: BRAND.display, fontSize: 110, color: BRAND.blue,
            WebkitTextStroke: '4px #0a0a0a', textShadow: '6px 6px 0 #0a0a0a', lineHeight: 1, textAlign: 'center',
          }}>{score.toLocaleString()}</div>
          <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '4px 0 0' }}>FINAL SCORE</p>
        </div>

        {/* Right: session leaderboard */}
        <div style={{
          background: 'rgba(0,0,0,0.35)', border: '4px solid #0a0a0a', borderRadius: 12,
          padding: 14, display: 'flex', flexDirection: 'column', gap: 4,
          boxShadow: '6px 6px 0 #0a0a0a',
        }}>
          <div style={{
            fontFamily: BRAND.display, fontSize: 26, color: BRAND.yellow,
            WebkitTextStroke: '2px #0a0a0a', textShadow: '3px 3px 0 #0a0a0a',
            letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1, marginBottom: 6,
          }}>SESSION TOP 5</div>
          {top.length === 0 && (
            <div style={{ color: '#fff', fontSize: 14, opacity: 0.8, padding: '12px 0' }}>BE THE FIRST!</div>
          )}
          {top.map((row, i) => {
            const isMe = row.name === myKey && row.score === score;
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '28px 1fr auto', alignItems: 'center', gap: 8,
                padding: '6px 8px',
                background: isMe ? BRAND.yellow : 'rgba(255,255,255,0.06)',
                color: isMe ? '#0a0a0a' : '#fff',
                border: '2px solid #0a0a0a', borderRadius: 6,
                fontFamily: BRAND.display, fontSize: 22, lineHeight: 1,
              }}>
                <div style={{ textAlign: 'center' }}>{i + 1}</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                  {row.name}{isMe ? ' ★' : ''}
                </div>
                <div>{row.score.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>

      <img src={(window.ASSET_BASE||'assets/')+'qr-kapow.png'} style={{ width: 110, filter: 'invert(1)' }} />
      <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>SCAN TO HELP SAVE THE UNIVERSE</p>
      <button onClick={onAgain} style={{
        padding: '14px 38px', fontSize: 22, fontFamily: BRAND.display,
        background: BRAND.marvelRed, color: '#fff', border: '4px solid #0a0a0a',
        borderRadius: 12, boxShadow: '6px 6px 0 #0a0a0a', cursor: 'pointer', letterSpacing: '0.04em',
      }}>PLAY AGAIN</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function IpadNameEntry({ initial, onSubmit, onBack }) {
  const [name, setName] = React.useState(initial || '');
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    // autofocus on mount so iPad on-screen keyboard pops up immediately
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);
  const trimmed = name.trim().slice(0, 14);
  const canStart = trimmed.length >= 1;
  const submit = () => { if (canStart) onSubmit(trimmed); };

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '4%', textAlign: 'center',
      background: 'rgba(10,26,63,0.85)', backdropFilter: 'blur(3px)', zIndex: 200,
      overflow: 'hidden',
    }}>
      <h2 style={{
        color: BRAND.yellow, fontFamily: BRAND.display, fontSize: 56, margin: 0,
        WebkitTextStroke: '3px #0a0a0a', textShadow: '5px 5px 0 #0a0a0a', letterSpacing: '0.02em',
      }}>WHO'S SLINGING?</h2>
      <p style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginTop: 10, marginBottom: 22, textAlign: 'center' }}>
        Tag your final score on the leaderboard.
      </p>

      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9 ._-]/g, '').slice(0, 14))}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder="ENTER NAME"
        maxLength={14}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        style={{
          fontFamily: BRAND.display, fontSize: 44, padding: '14px 22px',
          width: '70%', maxWidth: 460, textAlign: 'center', letterSpacing: '0.08em',
          background: '#fff', color: '#0a0a0a',
          border: '4px solid #0a0a0a', borderRadius: 10,
          boxShadow: '6px 6px 0 #0a0a0a', outline: 'none',
          textTransform: 'uppercase',
        }}
      />
      <div style={{ color: '#fff', fontSize: 13, opacity: 0.7, marginTop: 8 }}>
        {trimmed.length}/14 · LETTERS, NUMBERS, SPACES
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 26 }}>
        <button onClick={onBack} style={{
          padding: '12px 28px', fontSize: 20, fontFamily: BRAND.display,
          background: '#1a2a4f', color: '#fff', border: '4px solid #0a0a0a',
          borderRadius: 12, boxShadow: '6px 6px 0 #0a0a0a', cursor: 'pointer',
          letterSpacing: '0.04em',
        }}>← BACK</button>
        <button
          onClick={submit}
          disabled={!canStart}
          style={{
            padding: '14px 42px', fontSize: 26, fontFamily: BRAND.display,
            background: canStart ? BRAND.marvelRed : '#555',
            color: '#fff', border: '4px solid #0a0a0a',
            borderRadius: 12, boxShadow: '6px 6px 0 #0a0a0a',
            cursor: canStart ? 'pointer' : 'not-allowed',
            letterSpacing: '0.04em', opacity: canStart ? 1 : 0.6,
          }}
        >SLING IT →</button>
      </div>
    </div>
  );
}

window.IpadGame = IpadGame;
