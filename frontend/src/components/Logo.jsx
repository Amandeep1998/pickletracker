/**
 * PickleTracker Logo — refined, premium feel
 *
 * Design principles:
 *  • Ball: lime fill, subtle top-left highlight for depth, 5 precise holes
 *  • Chart line: very thin orange stroke — sharp, not cartoonish
 *  • Orange used ONLY for the chart line (accent), not in typography
 *  • Wordmark: "Pickle" lime + "Tracker" dark-olive — same weight, same size
 *    → single cohesive unit, no weight imbalance
 *  • Horizontal layout everywhere — product mark, not sports badge
 *
 * LogoFull  — 310×70  (Login / Signup / Landing hero)
 * LogoNav   — 160×36  (desktop Navbar)
 * LogoIcon  — 36×36   (mobile Navbar — ball only)
 */

function TrackerBall({ cx, cy, r, id }) {
  const clip = `tbc-${id}`;
  const sw   = Math.max(r * 0.055, 1.0); // very thin, precise

  const trendPts = [
    [-0.68,  0.42],
    [-0.38,  0.10],
    [-0.10,  0.28],
    [ 0.18, -0.14],
    [ 0.46, -0.02],
    [ 0.70, -0.46],
  ].map(([dx, dy]) => `${(cx + dx * r).toFixed(2)},${(cy + dy * r).toFixed(2)}`).join(' ');

  return (
    <>
      <defs>
        <clipPath id={clip}>
          <circle cx={cx} cy={cy} r={r - 0.3} />
        </clipPath>
      </defs>

      {/* Ball */}
      <circle cx={cx} cy={cy} r={r} fill="#91BE4D" />

      {/* Subtle highlight — gives the ball depth, not flat */}
      <ellipse
        cx={cx - r * 0.24} cy={cy - r * 0.26}
        rx={r * 0.38} ry={r * 0.30}
        fill="white" opacity="0.18"
        clipPath={`url(#${clip})`}
      />

      {/* Holes — 5, evenly distributed, smaller radius */}
      {[[-0.28,-0.44],[0.10,-0.52],[0.50,-0.10],[-0.10,0.20],[0.34,0.40]].map(([dx,dy],i) => (
        <circle key={i}
          cx={cx + dx * r} cy={cy + dy * r}
          r={r * 0.10} fill="#1e3300" opacity="0.35" />
      ))}

      {/* Trend line — thin & sharp */}
      <polyline
        points={trendPts}
        stroke="#ec9937" strokeWidth={sw}
        fill="none" strokeLinecap="round" strokeLinejoin="round"
        clipPath={`url(#${clip})`}
      />
      {/* Peak dot */}
      <circle
        cx={cx + 0.70 * r} cy={cy - 0.46 * r}
        r={sw * 1.4} fill="#ec9937"
        clipPath={`url(#${clip})`}
      />
    </>
  );
}

// ─── Full mark — Login / Signup / Landing ─────────────────────────────────────
export function LogoFull({ height = 70, className = '' }) {
  const W = Math.round(310 * (height / 70));
  return (
    <svg viewBox="0 0 310 70" width={W} height={height}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker"
      className={className}>

      <TrackerBall cx={33} cy={35} r={30} id="full" />

      {/* Single-line wordmark — same weight, same size, colour only differs */}
      <text x="76" y="46"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="700" fontSize="38" letterSpacing="0.5">
        <tspan fill="#91BE4D">Pickle</tspan><tspan fill="#272702">Tracker</tspan>
      </text>
    </svg>
  );
}

// ─── Compact mark — desktop Navbar ───────────────────────────────────────────
export function LogoNav({ height = 36, className = '' }) {
  const W = Math.round(160 * (height / 36));
  return (
    <svg viewBox="0 0 160 36" width={W} height={height}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker"
      className={className}>

      <TrackerBall cx={17} cy={18} r={15} id="nav" />

      <text x="38" y="23"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="700" fontSize="19" letterSpacing="0.3">
        <tspan fill="#91BE4D">Pickle</tspan><tspan fill="#e8e8d8">Tracker</tspan>
      </text>
    </svg>
  );
}

// ─── Icon only — mobile Navbar ────────────────────────────────────────────────
export function LogoIcon({ size = 34, className = '' }) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker"
      className={className}>
      <TrackerBall cx={18} cy={18} r={16} id="icon" />
    </svg>
  );
}

// Backward-compat aliases
export const LogoStyleA = LogoFull;
export const LogoStyleB = LogoFull;
export const LogoStyleC = LogoFull;
