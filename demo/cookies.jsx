// cookies.jsx — generic sandwich-cookie SVGs
// Each cookie is rendered as an inline SVG: a dark chocolate disc with a
// lighter cream centre stamped with a simple shape (star, squiggle, swirl,
// sunburst). No brand likeness, just round cookies.

const COOKIE_BODY    = '#2A1810';   // dark chocolate
const COOKIE_BODY_HL = '#5C3A24';   // softer rim shade
const COOKIE_BODY_LO = '#170A05';   // bottom shadow

// helper: a chocolate-cookie disc with subtle rim + bottom shadow
function cookieDisc(cx, cy, r, key = 'd') {
  return (
    <g key={key}>
      <ellipse cx={cx} cy={cy + r * 0.06} rx={r} ry={r * 0.98} fill={COOKIE_BODY_LO} />
      <circle cx={cx} cy={cy} r={r} fill={COOKIE_BODY} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={COOKIE_BODY_HL} strokeWidth={r * 0.06} strokeOpacity={0.55} />
      {/* tiny dot embossing — generic "biscuit" texture */}
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const rr = r * 0.84;
        const dx = cx + Math.cos(a) * rr;
        const dy = cy + Math.sin(a) * rr;
        return <circle key={i} cx={dx} cy={dy} r={r * 0.04} fill={COOKIE_BODY_LO} />;
      })}
    </g>
  );
}

// helper: cream centre with stamped icon. `icon` is an inner <g> sized to r=1
function creamCircle(cx, cy, r, color, stampColor, icon) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 0.62} fill={color} />
      {/* subtle highlight on cream */}
      <circle cx={cx - r * 0.18} cy={cy - r * 0.22} r={r * 0.12} fill="#fff" opacity={0.35} />
      <g transform={`translate(${cx},${cy}) scale(${r * 0.42})`} fill={stampColor}>
        {icon}
      </g>
    </g>
  );
}

// ── icon shapes (drawn at unit scale, centred on origin) ─────────────────────

const StarIcon = () => (
  <polygon
    points={(() => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = (-Math.PI / 2) + (i * Math.PI / 5);
        const rad = i % 2 === 0 ? 1 : 0.42;
        pts.push(`${Math.cos(a) * rad},${Math.sin(a) * rad}`);
      }
      return pts.join(' ');
    })()}
  />
);

const SquiggleIcon = () => (
  <path
    d="M -0.85 0 Q -0.55 -0.6 -0.25 0 T 0.35 0 T 0.95 0"
    fill="none"
    stroke="currentColor"
    strokeWidth="0.28"
    strokeLinecap="round"
    style={{ stroke: 'inherit' }}
  />
);

const SwirlIcon = () => (
  <g>
    <circle cx="0" cy="0" r="0.85" fill="none" stroke="currentColor" strokeWidth="0.22" />
    <path d="M 0 -0.55 A 0.55 0.55 0 0 1 0.55 0 A 0.3 0.3 0 0 1 0 0.3" fill="none" stroke="currentColor" strokeWidth="0.22" strokeLinecap="round" />
  </g>
);

const SunburstIcon = () => (
  <g>
    <circle cx="0" cy="0" r="0.4" />
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const x1 = Math.cos(a) * 0.55;
      const y1 = Math.sin(a) * 0.55;
      const x2 = Math.cos(a) * 0.95;
      const y2 = Math.sin(a) * 0.95;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.18" strokeLinecap="round" />;
    })}
  </g>
);

// ── Cookie variants ──────────────────────────────────────────────────────────
// Each takes a `size` prop and renders a self-contained <svg>.

function CookieBase({ size = 120, cream, stamp, icon }) {
  const v = 100;
  const r = 46;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${v} ${v}`} style={{ display: 'block', overflow: 'visible' }}>
      {cookieDisc(v / 2, v / 2, r)}
      {creamCircle(v / 2, v / 2, r, cream, stamp, icon)}
    </svg>
  );
}

// Player projectile: golden chocolate-chip cookie. Rendered via the shared
// SVG string so the React component and the imperative play layer stay
// pixel-identical.
function PlayerCookie({ size = 120 }) {
  return (
    <span
      style={{ display: 'inline-block', width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: cookieSvgString('player', size) }}
    />
  );
}
// Standard enemy: muted teal cream with deep squiggle
function EnemyCookie({ size = 140 }) {
  return (
    <CookieBase
      size={size}
      cream="#7BA8A2"
      stamp="#1F3F3C"
      icon={<g style={{ stroke: '#1F3F3C', color: '#1F3F3C' }}><SquiggleIcon /></g>}
    />
  );
}
// Small fast enemy: dusty rose with swirl
function EnemyCookieSmall({ size = 90 }) {
  return (
    <CookieBase
      size={size}
      cream="#D9A6A0"
      stamp="#7C2E2A"
      icon={<g style={{ color: '#7C2E2A' }}><SwirlIcon /></g>}
    />
  );
}
// Bonus: bright mustard with deep-red sunburst
function BonusCookie({ size = 110 }) {
  return (
    <CookieBase
      size={size}
      cream="#F0B22A"
      stamp="#7C2E2A"
      icon={<g style={{ color: '#7C2E2A' }}><SunburstIcon /></g>}
    />
  );
}

// Chocolate-chip player projectile — golden dough with chunky chips.
// Same visual language as the rest of the cookies (chunky disc, soft rim,
// crumb specks) just swapped to a baked-dough palette.
const DOUGH_BASE = '#D89A4A';
const DOUGH_DARK = '#9C5E14';
const DOUGH_HL   = '#F4C97E';
const CHIP       = '#2A1810';
const CHIP_HL    = '#5C3A24';
const CHIP_LAYOUT = [
  // [dx, dy, scale, rotation] — offsets relative to centre, in viewBox units
  [-22, -10, 10,  12],
  [  8, -22, 11, -22],
  [ 24,  -2,  9,  30],
  [-10,  14, 10,   6],
  [ 18,  18,  9, -10],
  [-22,  20,  8,  35],
  [  4,   0,  7,  18],
];

function chocolateChipCookieSvg(size) {
  const v = 100;
  const r = 46;
  const cx = v / 2, cy = v / 2;
  let parts = '';
  // bottom shadow
  parts += `<ellipse cx="${cx}" cy="${cy + r*0.08}" rx="${r}" ry="${r*0.96}" fill="${DOUGH_DARK}"/>`;
  // dough disc
  parts += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${DOUGH_BASE}"/>`;
  // top-left highlight crescent
  parts += `<path d="M ${cx - r*0.62} ${cy - r*0.18} A ${r*0.65} ${r*0.65} 0 0 1 ${cx - r*0.18} ${cy - r*0.62}" fill="none" stroke="${DOUGH_HL}" stroke-width="${r*0.08}" stroke-linecap="round" opacity="0.85"/>`;
  // soft rim
  parts += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${DOUGH_DARK}" stroke-width="${r*0.05}" stroke-opacity="0.55"/>`;
  // crumb-speck ring
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = r * 0.86;
    const dx = cx + Math.cos(a) * rr;
    const dy = cy + Math.sin(a) * rr;
    parts += `<circle cx="${dx}" cy="${dy}" r="${r*0.035}" fill="${DOUGH_DARK}" fill-opacity="0.55"/>`;
  }
  // chips
  for (const [dx, dy, s, rot] of CHIP_LAYOUT) {
    parts += `<g transform="translate(${cx + dx},${cy + dy}) rotate(${rot}) scale(${s})">
      <polygon points="-1,0.25 -0.6,-0.75 0.3,-0.9 0.95,-0.1 0.5,0.7" fill="${CHIP}"/>
      <ellipse cx="-0.28" cy="-0.45" rx="0.32" ry="0.14" fill="${CHIP_HL}"/>
    </g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${v} ${v}" style="overflow:visible">${parts}</svg>`;
}

// Render a cookie by archetype kind into a plain DOM element. Used by the
// imperative play layer (targets and projectile are not React-rendered to
// avoid reconciliation per frame). Returns an SVG string.
function cookieSvgString(kind, size) {
  if (kind === 'player') return chocolateChipCookieSvg(size);
  const v = 100;
  const r = 46;
  const choco = `
    <ellipse cx="${v/2}" cy="${v/2 + r*0.06}" rx="${r}" ry="${r*0.98}" fill="${COOKIE_BODY_LO}"/>
    <circle cx="${v/2}" cy="${v/2}" r="${r}" fill="${COOKIE_BODY}"/>
    <circle cx="${v/2}" cy="${v/2}" r="${r}" fill="none" stroke="${COOKIE_BODY_HL}" stroke-width="${r*0.06}" stroke-opacity="0.55"/>
  `;
  // dot ring
  let dots = '';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = r * 0.84;
    const dx = v/2 + Math.cos(a) * rr;
    const dy = v/2 + Math.sin(a) * rr;
    dots += `<circle cx="${dx}" cy="${dy}" r="${r*0.04}" fill="${COOKIE_BODY_LO}"/>`;
  }

  let cream = '#F5E6C8', stamp = '#E85A4F', shape = '';
  if (kind === 'enemy-small') {
    cream = '#D9A6A0'; stamp = '#7C2E2A';
    shape = `<g transform="translate(${v/2},${v/2}) scale(${r*0.42})">
      <circle cx="0" cy="0" r="0.85" fill="none" stroke="${stamp}" stroke-width="0.22"/>
      <path d="M 0 -0.55 A 0.55 0.55 0 0 1 0.55 0 A 0.3 0.3 0 0 1 0 0.3" fill="none" stroke="${stamp}" stroke-width="0.22" stroke-linecap="round"/>
    </g>`;
  } else if (kind === 'bonus') {
    cream = '#F0B22A'; stamp = '#7C2E2A';
    let lines = `<circle cx="0" cy="0" r="0.4" fill="${stamp}"/>`;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      lines += `<line x1="${Math.cos(a)*0.55}" y1="${Math.sin(a)*0.55}" x2="${Math.cos(a)*0.95}" y2="${Math.sin(a)*0.95}" stroke="${stamp}" stroke-width="0.18" stroke-linecap="round"/>`;
    }
    shape = `<g transform="translate(${v/2},${v/2}) scale(${r*0.42})">${lines}</g>`;
  } else {
    // enemy-mid / enemy-big — teal squiggle
    cream = '#7BA8A2'; stamp = '#1F3F3C';
    shape = `<g transform="translate(${v/2},${v/2}) scale(${r*0.42})">
      <path d="M -0.85 0 Q -0.55 -0.6 -0.25 0 T 0.35 0 T 0.95 0" fill="none" stroke="${stamp}" stroke-width="0.28" stroke-linecap="round"/>
    </g>`;
  }

  const creamCircle = `
    <circle cx="${v/2}" cy="${v/2}" r="${r*0.62}" fill="${cream}"/>
    <circle cx="${v/2 - r*0.18}" cy="${v/2 - r*0.22}" r="${r*0.12}" fill="#fff" opacity="0.35"/>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${v} ${v}" style="overflow:visible">
    ${choco}${dots}${creamCircle}${shape}
  </svg>`;
}

Object.assign(window, {
  PlayerCookie, EnemyCookie, EnemyCookieSmall, BonusCookie, cookieSvgString,
});
