/**
 * LogoIcon  — just the paddle+ball graphic (used on mobile / favicon contexts)
 * LogoFull  — icon + "PickleTracker" wordmark (used on desktop navbar, auth pages)
 */

// Shared icon shapes (all coordinates live in a 200×200 coordinate space)
function PaddleIcon({ idSuffix = 'a' }) {
  const ball = `logo-ball-${idSuffix}`;
  const pad  = `logo-pad-${idSuffix}`;
  const clip = `logo-clip-${idSuffix}`;

  return (
    <>
      <defs>
        <radialGradient id={ball} cx="38%" cy="32%" r="62%">
          <stop offset="0%"   stopColor="#D8E84E" />
          <stop offset="100%" stopColor="#A8C428" />
        </radialGradient>
        <radialGradient id={pad} cx="38%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#3a3a00" />
          <stop offset="100%" stopColor="#1a1a00" />
        </radialGradient>
        <clipPath id={clip}>
          <ellipse cx="84" cy="104" rx="62" ry="70" />
        </clipPath>
      </defs>

      {/* Paddle face */}
      <ellipse cx="84" cy="104" rx="62" ry="70" fill={`url(#${pad})`} />
      {/* Handle */}
      <rect x="66" y="165" width="36" height="28" rx="9" fill="#1a1a00" />
      {/* Grip wraps */}
      <rect x="66" y="169" width="36" height="5"  rx="2" fill="#ec9937" opacity="0.8" />
      <rect x="66" y="179" width="36" height="5"  rx="2" fill="#ec9937" opacity="0.8" />
      {/* Inner ring */}
      <ellipse cx="84" cy="104" rx="56" ry="64" fill="none" stroke="#91BE4D" strokeWidth="1.5" opacity="0.28" />
      {/* Center groove */}
      <line x1="84" y1="37"  x2="84"  y2="168" stroke="#91BE4D" strokeWidth="1.5" opacity="0.3" />
      {/* Horizontal texture lines */}
      <line x1="26" y1="82"  x2="142" y2="82"  stroke="#91BE4D" strokeWidth="1" opacity="0.18" />
      <line x1="22" y1="104" x2="146" y2="104" stroke="#91BE4D" strokeWidth="1" opacity="0.18" />
      <line x1="26" y1="126" x2="142" y2="126" stroke="#91BE4D" strokeWidth="1" opacity="0.18" />
      {/* Upward trend line (the finance element) */}
      <polyline
        points="34,142 54,122 68,132 82,108 96,116 112,88 130,76"
        stroke="#ec9937" strokeWidth="6" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
        clipPath={`url(#${clip})`}
      />
      <circle cx="130" cy="76" r="7" fill="#ec9937" clipPath={`url(#${clip})`} />

      {/* Pickleball ball overlapping top-right */}
      <circle cx="150" cy="50" r="42" fill={`url(#${ball})`} />
      {/* 3-D highlight */}
      <circle cx="136" cy="37" r="14" fill="white" opacity="0.2" />
      {/* Holes */}
      <circle cx="136" cy="32" r="4.2" fill="#1a1a00" opacity="0.28" />
      <circle cx="153" cy="28" r="4.2" fill="#1a1a00" opacity="0.28" />
      <circle cx="168" cy="38" r="4.2" fill="#1a1a00" opacity="0.28" />
      <circle cx="130" cy="50" r="4.2" fill="#1a1a00" opacity="0.28" />
      <circle cx="147" cy="52" r="4.2" fill="#1a1a00" opacity="0.28" />
      <circle cx="164" cy="56" r="4.2" fill="#1a1a00" opacity="0.28" />
      <circle cx="138" cy="67" r="4.2" fill="#1a1a00" opacity="0.28" />
      <circle cx="156" cy="68" r="4.2" fill="#1a1a00" opacity="0.28" />
    </>
  );
}

/** Icon only — square, for mobile navbar and app icon contexts */
export function LogoIcon({ size = 36, className = '' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PickleTracker"
    >
      <PaddleIcon idSuffix="icon" />
    </svg>
  );
}

/**
 * Full wordmark — icon on left, "PickleTracker" text on right.
 * Text uses Barlow Condensed loaded via Google Fonts.
 */
export function LogoFull({ height = 36, className = '' }) {
  const fontSize = Math.round(height * 0.68);

  return (
    // Outer SVG has no viewBox — width grows with text naturally.
    // overflow:visible ensures text isn't clipped.
    <svg
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PickleTracker"
      className={className}
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* Icon nested in its own 200×200 coordinate space */}
      <svg viewBox="0 0 200 200" x="0" y="0" width={height} height={height}>
        <PaddleIcon idSuffix="full" />
      </svg>

      {/* Wordmark: Pickle (lime) + Tracker (orange) */}
      <text
        x={height + Math.round(height * 0.22)}
        y={Math.round(height * 0.73)}
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        letterSpacing="0.8"
      >
        <tspan fill="#91BE4D">Pickle</tspan>
        <tspan fill="#ec9937">Tracker</tspan>
      </text>
    </svg>
  );
}
