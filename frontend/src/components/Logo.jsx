/**
 * Three logo style options — swap the one used in Navbar/Landing by changing
 * the import alias:  import { LogoStyleA as LogoFull } from './Logo'
 *
 * LogoStyleA — Horizontal: clean oval paddle icon + "PickleTracker" text side-by-side
 * LogoStyleB — Dark pill badge: name embedded inside a dark olive capsule
 * LogoStyleC — Stacked: icon centred on top, name bold below
 *
 * LogoIcon   — Icon only (no text), for mobile navbar & favicon
 */

// ─── Shared clean paddle + ball icon ────────────────────────────────────────
// viewBox 0 0 50 58 — oval paddle head, grip handle, chartreuse ball top-right
function PaddleAndBall({ id = 'a' }) {
  const ballGrad = `pb-ball-${id}`;
  const clip     = `pb-clip-${id}`;
  return (
    <>
      <defs>
        <radialGradient id={ballGrad} cx="36%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#DEEE50" />
          <stop offset="100%" stopColor="#A8C428" />
        </radialGradient>
        <clipPath id={clip}>
          <ellipse cx="20" cy="21" rx="16" ry="19" />
        </clipPath>
      </defs>

      {/* Paddle head — clean lime oval */}
      <ellipse cx="20" cy="21" rx="16" ry="19" fill="#91BE4D" />
      {/* Surface detail lines */}
      <line x1="20" y1="4"  x2="20" y2="39" stroke="#6a9020" strokeWidth="1.2" opacity="0.6" />
      <line x1="6"  y1="15" x2="34" y2="15" stroke="#6a9020" strokeWidth="0.8" opacity="0.4" />
      <line x1="4"  y1="21" x2="36" y2="21" stroke="#6a9020" strokeWidth="0.8" opacity="0.4" />
      <line x1="6"  y1="27" x2="34" y2="27" stroke="#6a9020" strokeWidth="0.8" opacity="0.4" />

      {/* Orange upward trend line across paddle face */}
      <polyline
        points="8,33 13,25 17,28 21,19 25,22 30,14"
        stroke="#ec9937" strokeWidth="2.2" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
        clipPath={`url(#${clip})`}
      />
      <circle cx="30" cy="14" r="2.2" fill="#ec9937" clipPath={`url(#${clip})`} />

      {/* Handle */}
      <rect x="14" y="37" width="12" height="19" rx="4" fill="#5a7e1a" />
      {/* Grip tape — orange bands */}
      <rect x="14" y="41" width="12" height="3" rx="1" fill="#ec9937" opacity="0.85" />
      <rect x="14" y="47" width="12" height="3" rx="1" fill="#ec9937" opacity="0.85" />

      {/* Pickleball — chartreuse, top-right, overlapping paddle */}
      <circle cx="37" cy="12" r="12" fill={`url(#${ballGrad})`} />
      <circle cx="33" cy="9"  r="4"  fill="white" opacity="0.18" />
      {/* Holes */}
      <circle cx="32" cy="8"  r="1.7" fill="#272702" opacity="0.3" />
      <circle cx="39" cy="7"  r="1.7" fill="#272702" opacity="0.3" />
      <circle cx="44" cy="12" r="1.7" fill="#272702" opacity="0.3" />
      <circle cx="34" cy="15" r="1.7" fill="#272702" opacity="0.3" />
      <circle cx="41" cy="17" r="1.7" fill="#272702" opacity="0.3" />
      <circle cx="37" cy="12" r="1.7" fill="#272702" opacity="0.3" />
    </>
  );
}

// ─── Icon only (mobile / favicon) ────────────────────────────────────────────
export function LogoIcon({ size = 36, className = '' }) {
  return (
    <svg viewBox="0 0 50 58" width={size} height={size}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker" className={className}>
      <PaddleAndBall id="icon" />
    </svg>
  );
}

// ─── Style A: Horizontal — icon left, wordmark right ────────────────────────
export function LogoStyleA({ height = 36, className = '' }) {
  const fs   = Math.round(height * 0.62);
  const iconH = height;
  const textX = Math.round(iconH * 1.05);
  const textY = Math.round(height * 0.70);

  return (
    <svg height={height} xmlns="http://www.w3.org/2000/svg"
      aria-label="PickleTracker" className={className}
      style={{ overflow: 'visible', display: 'block' }}>
      {/* Icon in its own viewport */}
      <svg viewBox="0 0 50 58" x={0} y={0} width={iconH} height={iconH}>
        <PaddleAndBall id="a" />
      </svg>
      {/* Wordmark */}
      <text x={textX} y={textY}
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="800" fontSize={fs} letterSpacing="0.5">
        <tspan fill="#91BE4D">Pickle</tspan><tspan fill="#ec9937">Tracker</tspan>
      </text>
    </svg>
  );
}

// ─── Style B: Dark pill badge — name embedded in dark olive capsule ──────────
export function LogoStyleB({ height = 36, className = '' }) {
  // Pill dimensions
  const pillH = height;
  const pillW = Math.round(height * 4.2);
  const r     = pillH / 2;
  const fs    = Math.round(height * 0.52);
  const iconSz = Math.round(height * 0.82);
  const iconX  = Math.round(height * 0.3);
  const iconY  = Math.round((pillH - iconSz) / 2);
  const textX  = iconX + iconSz + Math.round(height * 0.18);
  const textY  = Math.round(pillH * 0.67);

  return (
    <svg viewBox={`0 0 ${pillW} ${pillH}`} width={pillW} height={pillH}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker" className={className}>
      {/* Dark olive pill background */}
      <rect x="0" y="0" width={pillW} height={pillH} rx={r} fill="#272702" />
      {/* Lime left accent strip */}
      <rect x="0" y="0" width={Math.round(height * 0.18)} height={pillH} rx={r} fill="#91BE4D" />
      {/* Icon */}
      <svg viewBox="0 0 50 58" x={iconX} y={iconY} width={iconSz} height={iconSz}>
        <PaddleAndBall id="b" />
      </svg>
      {/* Name */}
      <text x={textX} y={textY}
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="800" fontSize={fs} letterSpacing="1">
        <tspan fill="#91BE4D">Pickle</tspan><tspan fill="#ec9937">Tracker</tspan>
      </text>
    </svg>
  );
}

// ─── Style C: Stacked — icon centred on top, name bold below ─────────────────
export function LogoStyleC({ height = 56, className = '' }) {
  const iconSz = Math.round(height * 0.62);
  const fs     = Math.round(height * 0.3);
  const totalW = Math.round(height * 2.6);
  const iconX  = Math.round((totalW - iconSz) / 2);
  const textY  = height - 2;

  return (
    <svg viewBox={`0 0 ${totalW} ${height}`} width={totalW} height={height}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker" className={className}>
      {/* Icon centred */}
      <svg viewBox="0 0 50 58" x={iconX} y={0} width={iconSz} height={iconSz}>
        <PaddleAndBall id="c" />
      </svg>
      {/* Divider line */}
      <line x1={Math.round(totalW*0.15)} y1={iconSz + 4}
            x2={Math.round(totalW*0.85)} y2={iconSz + 4}
            stroke="#91BE4D" strokeWidth="1" opacity="0.4" />
      {/* Name stacked below */}
      <text x={totalW / 2} y={textY}
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="800" fontSize={fs} letterSpacing="2" textAnchor="middle">
        <tspan fill="#91BE4D">PICKLE</tspan><tspan fill="#ec9937">TRACKER</tspan>
      </text>
    </svg>
  );
}

// Default export for backward compat — currently Style C
export const LogoFull = LogoStyleC;
