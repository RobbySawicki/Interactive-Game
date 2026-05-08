// cookie-toss-game.jsx — slingshot game stage

function CookieToss({ tweaks = {} }) {
  return (
    <Scaler>
      <GameInner tweaks={tweaks} />
    </Scaler>
  );
}

// Fit-to-viewport scaler at a 1200x800 design canvas
function Scaler({ children }) {
  const ref = React.useRef(null);
  const [s, setS] = React.useState({ scale: 1, w: 1200, h: 800 });
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const portrait = r.height > r.width;
      const dw = portrait ? 800  : 1200;
      const dh = portrait ? 1200 : 800;
      const scale = Math.min(r.width / dw, r.height / dh);
      setS({ scale, w: dw, h: dh });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', background: PAL.cream }}>
      <div style={{
        position:'absolute', left:'50%', top:'50%',
        width: s.w, height: s.h,
        transform: `translate(-50%,-50%) scale(${s.scale})`,
        transformOrigin: 'center center',
      }}>{children}</div>
    </div>
  );
}

function GameInner({ tweaks }) {
  const speedMul   = tweaks.targetSpeed ?? 1.0;
  const powerMul   = tweaks.throwPower  ?? 1.0;
  const gravityMul = tweaks.gravity     ?? 1.0;
  const showHints  = tweaks.showHints   ?? true;

  const stageRef = React.useRef(null);
  const [stageSize, setStageSize] = React.useState({ w: 1200, h: 800 });
  React.useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [phase, setPhase] = React.useState('attract'); // attract | name | playing | end
  const [playerName, setPlayerName] = React.useState('');
  const [score, setScore] = React.useState(0);
  const [combo, setCombo] = React.useState(0);
  const [time, setTime]   = React.useState(ROUND_SECONDS);
  const [aim, setAim]     = React.useState(null);
  const [flying, setFlying] = React.useState(false);
  const [pops, setPops]   = React.useState([]); // floating point labels

  const bus = getBus();
  const playerRef = React.useRef('');
  React.useEffect(() => { playerRef.current = playerName; }, [playerName]);
  const timeRef = React.useRef(time);
  React.useEffect(() => { timeRef.current = time; }, [time]);
  const aimRef = React.useRef(null);
  React.useEffect(() => { aimRef.current = aim; }, [aim]);

  // imperative play layer
  const fieldRef      = React.useRef(null);
  const targetsRef    = React.useRef(new Map());
  const projectileRef = React.useRef(null);
  const particlesRef  = React.useRef([]);
  const scoreRef      = React.useRef(0);
  const comboRef      = React.useRef(0);
  const phaseRef      = React.useRef(phase);
  React.useEffect(() => { phaseRef.current = phase; }, [phase]);

  const anchor = { x: stageSize.w / 2, y: stageSize.h - 130 };
  const stageSizeRef = React.useRef(stageSize);
  stageSizeRef.current = stageSize;

  // target spawner
  React.useEffect(() => {
    if (phase !== 'playing') return;
    let nextId = 0;
    const seed = () => {
      const field = fieldRef.current; if (!field) return;
      const { w, h } = stageSizeRef.current;
      const archetype = pickTargetKind();
      const fromLeft = Math.random() > 0.5;
      const y = 90 + Math.random() * (h * 0.5);
      const speed = (1.4 + Math.random() * 1.6) * archetype.speedMul * speedMul;
      const id = ++nextId + Math.random();
      const wrap = document.createElement('div');
      wrap.innerHTML = cookieSvgString(archetype.kind, archetype.size);
      const el = wrap.firstElementChild;
      el.style.cssText = `position:absolute;left:0;top:0;width:${archetype.size}px;height:${archetype.size}px;pointer-events:none;will-change:transform;${archetype.bonus ? 'filter:drop-shadow(0 0 22px '+PAL.mustard+');' : 'filter:drop-shadow(0 6px 0 rgba(0,0,0,0.18));'}`;
      const t = {
        id, archetype, el,
        x: fromLeft ? -archetype.size : w + archetype.size,
        y,
        vx: fromLeft ? speed : -speed,
        bobPhase: Math.random() * Math.PI * 2,
        bobAmp: 6 + Math.random() * 12,
        rot: 0,
        vrot: (Math.random() - 0.5) * 1.0,
      };
      field.appendChild(el);
      targetsRef.current.set(id, t);
    };
    seed(); seed();
    const iv = setInterval(seed, 1100);
    return () => clearInterval(iv);
  }, [phase, speedMul]);

  // animation loop
  React.useEffect(() => {
    let raf;
    const tick = (now) => {
      const { w, h } = stageSizeRef.current;
      for (const t of targetsRef.current.values()) {
        t.x += t.vx;
        t.rot += t.vrot;
        const dy = Math.sin((now / 600) + t.bobPhase) * t.bobAmp * 0.15;
        const drawX = t.x - t.archetype.size / 2;
        const drawY = (t.y + dy) - t.archetype.size / 2;
        t.el.style.transform = `translate3d(${drawX}px,${drawY}px,0) rotate(${t.rot}deg)`;
        if (t.x < -t.archetype.size - 50 || t.x > w + t.archetype.size + 50) {
          t.el.remove();
          targetsRef.current.delete(t.id);
        }
      }

      const p = projectileRef.current;
      if (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.7 * gravityMul;
        p.rot += 18;
        p.el.style.transform = `translate3d(${p.x - 60}px,${p.y - 60}px,0) rotate(${p.rot}deg)`;
        if (p.y > h + 100 || p.x < -100 || p.x > w + 100) {
          p.el.remove();
          projectileRef.current = null;
          setFlying(false);
          if (phaseRef.current === 'playing') {
            comboRef.current = 0;
            setCombo(0);
            bus.send({ type: 'miss' });
          }
        } else {
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
              const popId = Math.random();
              const popColor = t.archetype.bonus ? PAL.mustard : (newCombo >= 3 ? PAL.coral : PAL.creamHi);
              setPops(s => [...s, {
                id: popId,
                text: `+${points}${newCombo >= 2 ? ` ×${newCombo}` : ''}`,
                x: t.x, y: t.y, color: popColor,
                size: 44 + Math.min(newCombo, 6) * 4,
                rot: (Math.random() - 0.5) * 8,
              }]);
              setTimeout(() => setPops(s => s.filter(x => x.id !== popId)), 900);
              spawnBurst(t.x, t.y, 18, '#fff', 14, 12);
              spawnBurst(t.x, t.y, 10, t.archetype.bonus ? PAL.mustard : PAL.teal, 18, 14);
              const reaction = pickReaction(newCombo);
              bus.send({
                type: 'hit', points, totalScore: newScore, combo: newCombo,
                targetKind: t.archetype.kind,
                x: t.x / w, y: t.y / h, reaction,
              });
              p.el.remove();
              projectileRef.current = null;
              setFlying(false);
              break;
            }
          }
        }
      }

      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.x += q.vx; q.y += q.vy;
        q.vy += 0.6; q.vx *= 0.99;
        q.rot += q.vrot;
        q.life -= 0.02;
        if (q.life <= 0) { q.el.remove(); parts.splice(i, 1); }
        else {
          q.el.style.opacity = q.life;
          q.el.style.transform = `translate3d(${q.x - q.size / 2}px,${q.y - q.size / 2}px,0) rotate(${q.rot}deg)`;
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gravityMul]);

  // reset play layer when not playing
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
        el, size, x, y,
        vx: (Math.random() - 0.5) * spread,
        vy: (Math.random() - 1) * upward,
        life: 1, rot: Math.random() * 360, vrot: (Math.random() - 0.5) * 20,
      });
    }
  }, []);

  const fireProjectile = (x, y, vx, vy) => {
    const field = fieldRef.current; if (!field) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = cookieSvgString('player', 120);
    const el = wrap.firstElementChild;
    el.style.cssText = 'position:absolute;left:0;top:0;width:120px;height:120px;pointer-events:none;will-change:transform;z-index:50;filter:drop-shadow(0 6px 12px rgba(0,0,0,0.35));';
    field.appendChild(el);
    projectileRef.current = { x, y, vx, vy, rot: 0, el };
    setFlying(true);
  };

  // round timer
  React.useEffect(() => {
    if (phase !== 'playing') return;
    if (time <= 0) {
      setPhase('end');
      bus.send({ type: 'end', totalScore: scoreRef.current, player: playerName });
      try { recordScore(playerName || 'PLAYER', scoreRef.current); } catch {}
      return;
    }
    const t = setTimeout(() => setTime(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, time, playerName]);

  const startGame = (nameOverride) => {
    scoreRef.current = 0; comboRef.current = 0;
    setScore(0); setCombo(0); setTime(ROUND_SECONDS);
    setPops([]);
    setPhase('playing');
    bus.send({ type: 'start', player: (nameOverride ?? playerName) || '' });
  };

  // frame broadcast — 16Hz snapshot of the live scene for the panel mirror
  React.useEffect(() => {
    const iv = setInterval(() => {
      const targets = [];
      for (const t of targetsRef.current.values()) {
        targets.push({
          id: String(t.id), kind: t.archetype.kind, size: t.archetype.size,
          bonus: !!t.archetype.bonus,
          x: t.x, y: t.y, rot: t.rot, vx: t.vx, vrot: t.vrot,
          bobPhase: t.bobPhase, bobAmp: t.bobAmp,
        });
      }
      const pp = projectileRef.current;
      bus.sendFrame({
        phase: phaseRef.current,
        player: playerRef.current,
        score: scoreRef.current, combo: comboRef.current,
        time: timeRef.current,
        aim: aimRef.current ? { x: aimRef.current.x, y: aimRef.current.y } : null,
        anchor: { x: anchor.x, y: anchor.y },
        projectile: pp ? { x: pp.x, y: pp.y, rot: pp.rot, vx: pp.vx, vy: pp.vy } : null,
        targets, gravity: 0.7 * gravityMul,
        stageW: stageSize.w, stageH: stageSize.h,
      });
    }, 60);
    return () => clearInterval(iv);
  }, [bus, gravityMul, stageSize.w, stageSize.h, anchor.x, anchor.y]);

  // pointer input
  const dragging = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0 });
  const onPointerDown = (e) => {
    if (phase !== 'playing' || projectileRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const scaleX = stageSize.w / rect.width;
    const scaleY = stageSize.h / rect.height;
    const x = ((e.touches?.[0]?.clientX ?? e.clientX) - rect.left) * scaleX;
    const y = ((e.touches?.[0]?.clientY ?? e.clientY) - rect.top)  * scaleY;
    dragging.current = true;
    dragStart.current = { x, y };
    setAim({ x: anchor.x, y: anchor.y });
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const scaleX = stageSize.w / rect.width;
    const scaleY = stageSize.h / rect.height;
    const x = ((e.touches?.[0]?.clientX ?? e.clientX) - rect.left) * scaleX;
    const y = ((e.touches?.[0]?.clientY ?? e.clientY) - rect.top)  * scaleY;
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
  };

  return (
    <div
      ref={stageRef}
      onMouseDown={onPointerDown} onMouseMove={onPointerMove}
      onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
      onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
      style={{
        position:'relative', width:'100%', height:'100%', overflow:'hidden',
        background: `radial-gradient(ellipse at 50% 30%, ${PAL.creamHi} 0%, ${PAL.cream} 55%, #E7DBC4 100%)`,
        userSelect:'none', WebkitUserSelect:'none', touchAction:'none',
        cursor: phase === 'playing' ? 'grab' : 'pointer',
        fontFamily: PAL.ui,
      }}
    >
      <DotPattern w={stageSize.w} h={stageSize.h} />

      {phase === 'playing' && <HUD score={score} combo={combo} time={time} />}

      <div ref={fieldRef} style={{ position:'absolute', inset:0, pointerEvents:'none' }} />

      {pops.map(p => <PointPop key={p.id} {...p} />)}

      {phase === 'playing' && !flying && (
        <Slingshot x={anchor.x} y={anchor.y} aim={aim} showHints={showHints} />
      )}

      {phase === 'attract' && <AttractScreen onStart={() => setPhase('name')} />}
      {phase === 'name'    && <NameScreen initial={playerName} onSubmit={(n) => { setPlayerName(n); startGame(n); }} onBack={() => setPhase('attract')} />}
      {phase === 'end'     && <EndScreen score={score} playerName={playerName} onAgain={() => setPhase('name')} onHome={() => setPhase('attract')} />}
    </div>
  );
}

window.CookieToss = CookieToss;
