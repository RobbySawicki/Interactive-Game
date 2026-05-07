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
  const [sfx, setSfx]           = React.useState([]);
  const [aim, setAim]           = React.useState(null);     // {x,y} fingertip
  const [flying, setFlying]     = React.useState(false);    // projectile in flight (hides loaded cookie)

  // ── Imperative play layer ────────────────────────────────────────
  // Targets, projectile, and particles are managed as plain DOM nodes
  // appended into `fieldRef`. The animation loop mutates positions via
  // `el.style.transform` directly so we avoid React reconciliation on
  // every frame — this is the difference between buttery and chuggy on
  // older iPads.
  const fieldRef       = React.useRef(null);
  const targetsRef     = React.useRef(new Map()); // id -> target object (incl. .el)
  const projectileRef  = React.useRef(null);      // {x,y,vx,vy,rot,el} | null
  const particlesRef   = React.useRef([]);
  const scoreRef       = React.useRef(0);
  const comboRef       = React.useRef(0);
  const phaseRef       = React.useRef(phase);
  React.useEffect(() => { phaseRef.current = phase; }, [phase]);
  const aimRef         = React.useRef(null);
  React.useEffect(() => { aimRef.current = aim; }, [aim]);
  const timeRef        = React.useRef(time);
  React.useEffect(() => { timeRef.current = time; }, [time]);
  const playerRef      = React.useRef(playerName);
  React.useEffect(() => { playerRef.current = playerName; }, [playerName]);

  const bus = getBus();

  // Anchor for slingshot at bottom-center
  const anchor = { x: stageSize.w / 2, y: stageSize.h - 140 };
  const anchorRef = React.useRef(anchor);
  anchorRef.current = anchor;
  const stageSizeRef = React.useRef(stageSize);
  stageSizeRef.current = stageSize;

  // ── target spawner ────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== 'playing') return;
    let nextId = 0;
    const seed = () => {
      const field = fieldRef.current; if (!field) return;
      const { w, h } = stageSizeRef.current;
      const archetype = pickTargetKind();
      const fromLeft = Math.random() > 0.5;
      const y = 100 + Math.random() * (h * 0.5);
      const speed = (1.5 + Math.random() * 1.5) * archetype.speedMul * speedMul;
      const id = ++nextId + Math.random();
      const el = document.createElement('img');
      el.src = archetype.img;
      el.alt = '';
      el.draggable = false;
      el.style.cssText = `position:absolute;left:0;top:0;width:${archetype.size}px;height:${archetype.size}px;pointer-events:none;will-change:transform;${archetype.bonus ? 'filter:drop-shadow(0 0 24px #FFD60A);' : ''}`;
      const t = {
        id, archetype, el,
        x: fromLeft ? -archetype.size : w + archetype.size,
        y,
        vx: fromLeft ? speed : -speed,
        bobPhase: Math.random() * Math.PI * 2,
        bobAmp: 6 + Math.random() * 12,
        rot: 0,
        vrot: (Math.random() - 0.5) * 1.2,
      };
      field.appendChild(el);
      targetsRef.current.set(id, t);
    };
    seed(); seed();
    const iv = setInterval(seed, 1100);
    return () => clearInterval(iv);
  }, [phase, speedMul]);

  // ── animation loop (single rAF for targets, projectile, particles, collisions)
  React.useEffect(() => {
    let raf;
    const tick = (now) => {
      const { w, h } = stageSizeRef.current;
      // targets
      for (const t of targetsRef.current.values()) {
        t.x += t.vx;
        t.rot += t.vrot;
        const dy = Math.sin((now / 600) + t.bobPhase) * t.bobAmp * 0.15;
        const drawX = t.x - t.archetype.size / 2;
        const drawY = (t.y + dy) - t.archetype.size / 2;
        t.el.style.transform = `translate3d(${drawX}px, ${drawY}px, 0) rotate(${t.rot}deg)`;
        if (t.x < -t.archetype.size - 50 || t.x > w + t.archetype.size + 50) {
          t.el.remove();
          targetsRef.current.delete(t.id);
        }
      }

      // projectile
      const p = projectileRef.current;
      if (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.7 * gravityMul;
        p.rot += 18;
        p.el.style.transform = `translate3d(${p.x - 60}px, ${p.y - 60}px, 0) rotate(${p.rot}deg)`;
        if (p.y > h + 100 || p.x < -100 || p.x > w + 100) {
          p.el.remove();
          projectileRef.current = null;
          setFlying(false);
          if (phaseRef.current === 'playing') {
            bus.send({ type: 'miss', at: Date.now() });
            comboRef.current = 0;
            setCombo(0);
          }
        } else {
          // collision check
          for (const t of targetsRef.current.values()) {
            const dx = t.x - p.x;
            const dy = t.y - p.y;
            const r = (t.archetype.size / 2) * 0.85 + 36;
            if (dx * dx + dy * dy < r * r) {
              const newCombo = comboRef.current + 1;
              const points = Math.round(t.archetype.points * (1 + (newCombo - 1) * 0.25));
              const newScore = scoreRef.current + points;
              comboRef.current = newCombo;
              scoreRef.current = newScore;
              setCombo(newCombo);
              setScore(newScore);
              t.el.remove();
              targetsRef.current.delete(t.id);
              const label = pickSfx(newCombo);
              const sfxId = Math.random();
              setSfx((s) => [...s, {
                id: sfxId, text: label, x: t.x, y: t.y,
                color: t.archetype.bonus ? '#FFD60A' : (newCombo >= 3 ? '#FFD60A' : '#fff'),
                size: 56 + Math.min(newCombo, 6) * 6,
                rot: (Math.random() - 0.5) * 12,
              }]);
              setTimeout(() => setSfx((s) => s.filter((x) => x.id !== sfxId)), 900);
              spawnBurst(t.x, t.y, 22, '#fff', 14, 12);
              spawnBurst(t.x, t.y, 10, BRAND.blue, 18, 14);
              p.el.remove();
              projectileRef.current = null;
              setFlying(false);
              bus.send({
                type: 'hit',
                points,
                totalScore: newScore,
                combo: newCombo,
                targetKind: t.archetype.kind,
                x: t.x / w,
                y: t.y / h,
                sfx: label,
                at: Date.now(),
              });
              break;
            }
          }
        }
      }

      // particles
      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.x += q.vx;
        q.y += q.vy;
        q.vy += 0.6;
        q.vx *= 0.99;
        q.rot += q.vrot;
        q.life -= 0.02;
        if (q.life <= 0) {
          q.el.remove();
          parts.splice(i, 1);
        } else {
          q.el.style.opacity = q.life;
          q.el.style.transform = `translate3d(${q.x - q.size / 2}px, ${q.y - q.size / 2}px, 0) rotate(${q.rot}deg)`;
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gravityMul, bus]);

  // ── frame broadcast ───────────────────────────────────────────────
  // Snapshots the live scene (targets, projectile, aim, score) at ~16Hz
  // and pushes it onto the frame channel so the truck side LED can mirror
  // the iPad. Velocities are included so the receiver can dead-reckon
  // between snapshots for smooth motion.
  React.useEffect(() => {
    const iv = setInterval(() => {
      const targets = [];
      for (const t of targetsRef.current.values()) {
        targets.push({
          id: String(t.id),
          kind: t.archetype.kind,
          size: t.archetype.size,
          bonus: !!t.archetype.bonus,
          x: t.x, y: t.y, rot: t.rot,
          vx: t.vx, vrot: t.vrot,
          bobPhase: t.bobPhase, bobAmp: t.bobAmp,
        });
      }
      const p = projectileRef.current;
      bus.sendFrame({
        phase: phaseRef.current,
        player: playerRef.current,
        score: scoreRef.current,
        combo: comboRef.current,
        time: timeRef.current,
        aim: aimRef.current ? { x: aimRef.current.x, y: aimRef.current.y } : null,
        anchor: anchorRef.current ? { x: anchorRef.current.x, y: anchorRef.current.y } : null,
        projectile: p ? { x: p.x, y: p.y, rot: p.rot, vx: p.vx, vy: p.vy } : null,
        targets,
        gravity: 0.7 * gravityMul,
        stageW: stageSizeRef.current.w,
        stageH: stageSizeRef.current.h,
      });
    }, 60);
    return () => clearInterval(iv);
  }, [bus, gravityMul]);

  // Reset play layer when leaving 'playing'
  React.useEffect(() => {
    if (phase === 'playing') return;
    for (const t of targetsRef.current.values()) t.el.remove();
    targetsRef.current.clear();
    if (projectileRef.current) { projectileRef.current.el.remove(); projectileRef.current = null; }
    for (const q of particlesRef.current) q.el.remove();
    particlesRef.current.length = 0;
    setFlying(false);
  }, [phase]);

  const spawnBurst = React.useCallback((x, y, count, color, spread, upward) => {
    const field = fieldRef.current; if (!field) return;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      const size = 4 + Math.random() * 8;
      el.style.cssText = `position:absolute;left:0;top:0;width:${size}px;height:${size}px;background:${color};border-radius:2px;pointer-events:none;will-change:transform,opacity;`;
      field.appendChild(el);
      particlesRef.current.push({
        el, size,
        x, y,
        vx: (Math.random() - 0.5) * spread,
        vy: (Math.random() - 1) * upward,
        life: 1,
        rot: Math.random() * 360,
        vrot: (Math.random() - 0.5) * 20,
      });
    }
  }, []);

  const fireProjectile = (x, y, vx, vy) => {
    const field = fieldRef.current; if (!field) return;
    const el = document.createElement('img');
    el.src = (window.ASSET_BASE||'assets/')+'cookie-spider.png';
    el.alt = '';
    el.draggable = false;
    el.style.cssText = 'position:absolute;left:0;top:0;width:120px;height:120px;pointer-events:none;will-change:transform;z-index:50;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));';
    field.appendChild(el);
    projectileRef.current = { x, y, vx, vy, rot: 0, el };
    setFlying(true);
  };

  // ── round timer ───────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== 'playing') return;
    if (time <= 0) {
      setPhase('end');
      bus.send({ type: 'end', totalScore: scoreRef.current, player: playerName, at: Date.now() });
      try { recordScore(playerName || 'PLAYER', scoreRef.current); } catch (e) {}
      return;
    }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, time, bus, playerName]);

  const startGame = (nameOverride) => {
    scoreRef.current = 0; comboRef.current = 0;
    setScore(0); setCombo(0); setTime(ROUND_SECONDS);
    setSfx([]);
    setPhase('playing');
    const name = (nameOverride ?? playerName) || '';
    bus.send({ type: 'start', player: name, at: Date.now() });
  };

  // ── autoplay (ghost player demo) ──────────────────────────────────
  // Drives the slingshot automatically: aims at a live target, releases,
  // and loops the round. Used when this iPad is rendered in the preview
  // canvas so spectators see real gameplay reactivity on both screens.
  React.useEffect(() => {
    if (!autoplay) return;
    let alive = true;
    const wait = (ms) => new Promise((r) => setTimeout(() => alive && r(), ms));

    const fireOnce = async () => {
      const ts = Array.from(targetsRef.current.values());
      if (!ts.length) return false;
      const { w, h } = stageSizeRef.current;
      const target = ts.reduce((best, t) => {
        const score = -(Math.abs(t.x - w / 2)) - Math.abs(t.y - h * 0.4);
        return (!best || score > best.score) ? { t, score } : best;
      }, null).t;

      const tx = target.x, ty = target.y;
      const a = anchorRef.current;
      const ax = a.x, ay = a.y - 30;
      let best = null;
      for (let dist = 120; dist <= 240; dist += 20) {
        for (let ang = -2.6; ang <= -0.5; ang += 0.12) {
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
            if (py > h + 50) break;
          }
          if (!best || minD < best.minD) best = { aimX, aimY, minD };
        }
      }
      if (!best) return false;
      const jitter = 18;
      const aimX = best.aimX + (Math.random() - 0.5) * jitter;
      const aimY = best.aimY + (Math.random() - 0.5) * jitter;

      setAim({ x: ax, y: ay });
      const steps = 14;
      for (let i = 1; i <= steps; i++) {
        if (!alive) return false;
        const k = i / steps;
        const e = 1 - Math.pow(1 - k, 2);
        setAim({ x: ax + (aimX - ax) * e, y: ay + (aimY - ay) * e });
        await wait(22);
      }
      await wait(140);
      if (!alive || phaseRef.current !== 'playing') return false;
      const dx = ax - aimX, dy = ay - aimY;
      const power = Math.min(1, Math.hypot(dx, dy) / 220);
      if (power >= 0.15) {
        fireProjectile(ax, ay, dx * 0.12 * powerMul, dy * 0.12 * powerMul - 4);
        bus.send({ type: 'throw', power, at: Date.now() });
      }
      setAim(null);
      return true;
    };

    const loop = async () => {
      while (alive) {
        if (phaseRef.current !== 'playing') {
          await wait(1100);
          if (!alive) return;
          startGame();
          await wait(800);
          continue;
        }
        if (projectileRef.current) { await wait(120); continue; }
        if (!targetsRef.current.size) { await wait(180); continue; }
        const ok = await fireOnce();
        await wait(ok ? 700 + Math.random() * 400 : 250);
      }
    };
    const startT = setTimeout(loop, 600);
    return () => { alive = false; clearTimeout(startT); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  // ── sling input ───────────────────────────────────────────────────
  const dragging = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0 }); // where the finger touched down
  const onPointerDown = (e) => {
    if (phase !== 'playing' || projectileRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    dragging.current = true;
    dragStart.current = { x, y };
    setAim({ x: anchor.x, y: anchor.y });
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    let dx = x - dragStart.current.x;
    let dy = y - dragStart.current.y;
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
    const k = 0.13 * powerMul;
    fireProjectile(anchor.x, anchor.y - 30, dx * k, dy * k - 3.2 * power * powerMul);
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

      {/* Imperative play layer — targets, projectile, particles live here */}
      <div ref={fieldRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* SFX labels */}
      {sfx.map((s) => <SfxLabel key={s.id} {...s} />)}

      {/* slingshot anchor + web strand */}
      {phase === 'playing' && !flying && (
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
      background: 'rgba(10,26,63,0.78)', zIndex: 200,
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
      background: 'rgba(10,26,63,0.92)', zIndex: 200,
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
