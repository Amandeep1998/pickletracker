/**
 * PickleTracker Logo — ball + wordmark, clean spacing, premium feel
 *
 * LogoFull  — Ball centred, stacked "PICKLE / TRACKER" below  (Login/Signup/Landing)
 * LogoNav   — Small ball + inline wordmark with breathing room  (desktop Navbar)
 * LogoIcon  — Ball only  (mobile Navbar)
 */

function Ball({ cx, cy, r }) {
  const holes = [
    [-0.28,-0.42],[ 0.12,-0.50],[ 0.46,-0.14],
    [-0.14, 0.16],[ 0.28,  0.40],[-0.40, 0.36],
  ];
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#91BE4D" />
      {holes.map(([dx, dy], i) => (
        <circle key={i}
          cx={cx + dx * r} cy={cy + dy * r}
          r={r * 0.13} fill="#1a2800" opacity="0.45" />
      ))}
    </>
  );
}

// ─── Full stacked logo — Login / Signup / Landing ─────────────────────────────
export function LogoFull({ height = 120, className = '' }) {
  const W = Math.round(200 * (height / 152));
  return (
    <svg viewBox="0 0 200 152" width={W} height={height}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker"
      className={className}>
      {/* Ball — centred, generous size */}
      <Ball cx={100} cy={38} r={32} />
      {/* 10 px gap between ball bottom (70) and cap top of PICKLE (~80) */}
      <text x="100" y="112"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="800" fontSize="44" textAnchor="middle"
        fill="#91BE4D">
        PICKLE
      </text>
      {/* 10 px gap between PICKLE baseline (112) and TRACKER cap top (~125) */}
      <text x="100" y="148"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="700" fontSize="32" textAnchor="middle" letterSpacing="5"
        fill="#ec9937">
        TRACKER
      </text>
    </svg>
  );
}

// ─── Horizontal compact — desktop Navbar ──────────────────────────────────────
// Ball small + comfortable gap + wordmark, nothing touches
export function LogoNav({ height = 36, className = '' }) {
  // Ball diameter = 22 px in a 36 px tall bar (61 %) — balanced
  const ballR  = 11;
  const ballCX = 14;
  const ballCY = 18;
  const textX  = ballCX + ballR + 14; // 14 px gap
  const textY  = 25;
  const fs     = 22;
  // viewBox width: ball(28) + gap(14) + "PickleTracker"(~140) + right pad(8) = 190
  return (
    <svg viewBox="0 0 190 36" width={Math.round(190 * height / 36)} height={height}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker"
      className={className}>
      <Ball cx={ballCX} cy={ballCY} r={ballR} />
      <text x={textX} y={textY}
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="800" fontSize={fs} letterSpacing="0.4">
        <tspan fill="#91BE4D">Pickle</tspan><tspan fill="#ec9937">Tracker</tspan>
      </text>
    </svg>
  );
}

// ─── Icon only — mobile Navbar ────────────────────────────────────────────────
export function LogoIcon({ size = 34, className = '' }) {
  return (
    <svg viewBox="0 0 34 34" width={size} height={size}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker"
      className={className}>
      <Ball cx={17} cy={17} r={15} />
    </svg>
  );
}

// Backward-compat aliases
export const LogoStyleA = LogoFull;
export const LogoStyleB = LogoFull;
export const LogoStyleC = LogoFull;
