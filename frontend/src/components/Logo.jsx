/**
 * PickleTracker Logo — inspired by USA Pickleball style
 *
 * LogoFull  — Swoosh arc over stacked "Pickle / TRACKER" wordmark, ball at swoosh end (desktop)
 * LogoIcon  — Compact paddle + ball icon for mobile navbar
 */

// ─── Pickleball — parameterised position, size, gradient ID ──────────────────
function Pickleball({ cx, cy, r, gradId }) {
  return (
    <>
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#E8F550" />
          <stop offset="100%" stopColor="#B0CC2A" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${gradId})`} />
      {/* Shine */}
      <circle cx={cx - r*0.28} cy={cy - r*0.3} r={r*0.33} fill="white" opacity="0.22" />
      {/* Holes */}
      {[
        [-0.22,-0.44],[ 0.2,-0.52],[ 0.55,-0.12],
        [-0.12, 0.13],[ 0.3,  0.38],[-0.38, 0.42],
      ].map(([dx, dy], i) => (
        <circle key={i} cx={cx + dx*r} cy={cy + dy*r} r={r * 0.13} fill="#1a1a00" opacity="0.3" />
      ))}
    </>
  );
}

// ─── Full logo — swoosh + stacked wordmark + ball (desktop) ──────────────────
export function LogoFull({ height = 44, className = '' }) {
  const W = Math.round(220 * (height / 85));
  return (
    <svg viewBox="0 0 220 85" width={W} height={height}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker" className={className}>

      {/* Swoosh — dark olive ribbon arcing from left over text to ball */}
      <path
        d="M 6,55 C 48,5 138,0 180,23 L 180,32 C 138,11 48,19 6,65 Z"
        fill="#272702"
      />
      {/* Lime leading-edge highlight on swoosh */}
      <path
        d="M 6,55 C 48,5 138,0 180,23 C 138,7 48,13 6,59 Z"
        fill="#91BE4D"
        opacity="0.75"
      />

      {/* Pickleball at right end of swoosh */}
      <Pickleball cx={197} cy={27} r={19} gradId="pb-logo-ball" />

      {/* "Pickle" — lime, bold italic */}
      <text x="5" y="65"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="800" fontSize="42" fontStyle="italic"
        fill="#91BE4D" letterSpacing="-0.5">
        Pickle
      </text>

      {/* "TRACKER" — orange, condensed uppercase below */}
      <text x="8" y="81"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="700" fontSize="21" letterSpacing="6"
        fill="#ec9937">
        TRACKER
      </text>
    </svg>
  );
}

// ─── Icon only — compact paddle + ball for mobile navbar ─────────────────────
export function LogoIcon({ size = 36, className = '' }) {
  return (
    <svg viewBox="0 0 54 62" width={size} height={size}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker" className={className}>
      <defs>
        <radialGradient id="pb-icon-pad" cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#aacf55" />
          <stop offset="100%" stopColor="#7aa030" />
        </radialGradient>
      </defs>

      {/* Paddle head */}
      <ellipse cx="20" cy="22" rx="17" ry="20" fill="url(#pb-icon-pad)" />
      <line x1="20" y1="4"  x2="20" y2="41" stroke="#4a6e10" strokeWidth="1.1" opacity="0.45" />
      <line x1="3"  y1="22" x2="37" y2="22" stroke="#4a6e10" strokeWidth="0.8" opacity="0.3" />
      {/* Shine */}
      <ellipse cx="13" cy="13" rx="6" ry="7" fill="white" opacity="0.13" />

      {/* Neck + handle */}
      <rect x="15" y="39" width="10" height="4" rx="1" fill="#3d6010" />
      <rect x="14" y="42" width="12" height="20" rx="4" fill="#3d6010" />
      <rect x="14" y="46" width="12" height="2" rx="1" fill="#2a4508" opacity="0.55" />
      <rect x="14" y="51" width="12" height="2" rx="1" fill="#2a4508" opacity="0.55" />
      <rect x="14" y="56" width="12" height="2" rx="1" fill="#2a4508" opacity="0.55" />

      {/* Ball overlapping paddle top-right */}
      <Pickleball cx={38} cy={13} r={13} gradId="pb-icon-ball" />
    </svg>
  );
}

// Backward-compat aliases used by Navbar / Login / Signup
export const LogoStyleA = LogoFull;
export const LogoStyleB = LogoFull;
export const LogoStyleC = LogoFull;
