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
// viewBox 0 0 54 62 — oval paddle head, grip handle, chartreuse ball top-right
function PaddleAndBall({ id = 'a' }) {
  const ballGrad   = `pb-ball-${id}`;
  const paddleGrad = `pb-pad-${id}`;
  return (
    <>
      <defs>
        <radialGradient id={ballGrad} cx="36%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#E2F04A" />
          <stop offset="100%" stopColor="#A8C428" />
        </radialGradient>
        <radialGradient id={paddleGrad} cx="30%" cy="25%" r="75%">
          <stop offset="0%"   stopColor="#aacf55" />
          <stop offset="100%" stopColor="#7aa030" />
        </radialGradient>
      </defs>

      {/* Paddle head — lime oval with gradient */}
      <ellipse cx="20" cy="22" rx="17" ry="20" fill={`url(#${paddleGrad})`} />
      {/* Surface grid lines */}
      <line x1="20" y1="4"  x2="20" y2="41" stroke="#4a6e10" strokeWidth="1.1" opacity="0.45" />
      <line x1="5"  y1="15" x2="35" y2="15" stroke="#4a6e10" strokeWidth="0.8" opacity="0.3" />
      <line x1="3"  y1="22" x2="37" y2="22" stroke="#4a6e10" strokeWidth="0.8" opacity="0.3" />
      <line x1="5"  y1="29" x2="35" y2="29" stroke="#4a6e10" strokeWidth="0.8" opacity="0.3" />
      {/* Highlight shine */}
      <ellipse cx="13" cy="13" rx="6" ry="7" fill="white" opacity="0.13" />

      {/* Neck taper */}
      <rect x="15" y="39" width="10" height="4" rx="1" fill="#3d6010" />
      {/* Handle */}
      <rect x="14" y="42" width="12" height="20" rx="4" fill="#3d6010" />
      {/* Grip wrap — dark lines only, no orange */}
      <rect x="14" y="46" width="12" height="2" rx="1" fill="#2a4508" opacity="0.55" />
      <rect x="14" y="51" width="12" height="2" rx="1" fill="#2a4508" opacity="0.55" />
      <rect x="14" y="56" width="12" height="2" rx="1" fill="#2a4508" opacity="0.55" />

      {/* Pickleball — chartreuse, top-right, overlapping paddle */}
      <circle cx="38" cy="13" r="13" fill={`url(#${ballGrad})`} />
      {/* Shine */}
      <circle cx="34" cy="9"  r="4.5" fill="white" opacity="0.18" />
      {/* Holes */}
      <circle cx="33" cy="8"  r="1.8" fill="#1a1a00" opacity="0.28" />
      <circle cx="40" cy="7"  r="1.8" fill="#1a1a00" opacity="0.28" />
      <circle cx="46" cy="12" r="1.8" fill="#1a1a00" opacity="0.28" />
      <circle cx="35" cy="15" r="1.8" fill="#1a1a00" opacity="0.28" />
      <circle cx="42" cy="18" r="1.8" fill="#1a1a00" opacity="0.28" />
      <circle cx="38" cy="11" r="1.8" fill="#1a1a00" opacity="0.28" />
    </>
  );
}

// ─── Icon only (mobile / favicon) ────────────────────────────────────────────
export function LogoIcon({ size = 36, className = '' }) {
  return (
    <svg viewBox="0 0 54 62" width={size} height={size}
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
      <svg viewBox="0 0 54 62" x={0} y={0} width={iconH} height={iconH}>
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
      <svg viewBox="0 0 54 62" x={iconX} y={iconY} width={iconSz} height={iconSz}>
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
      <svg viewBox="0 0 54 62" x={iconX} y={0} width={iconSz} height={iconSz}>
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
