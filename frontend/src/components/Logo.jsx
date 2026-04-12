/**
 * PickleTracker Logo
 *
 * Concept: A pickleball with an upward trend-line inside it — the ball IS the
 * tracker. The orange chart line ties directly to the orange "Tracker" wordmark.
 * Horizontal layout keeps icon and text as one cohesive unit.
 *
 * LogoFull  — Larger horizontal mark  (Login / Signup / Landing)
 * LogoNav   — Compact horizontal mark (desktop Navbar)
 * LogoIcon  — Ball-only mark          (mobile Navbar)
 */

// ─── Ball with tracker chart inside ──────────────────────────────────────────
function TrackerBall({ cx, cy, r, id }) {
  const clipId = `tb-clip-${id}`;
  // trend line points as fractions of r
  const pts = [
    [-0.70,  0.40],
    [-0.38,  0.08],
    [-0.10,  0.26],
    [ 0.18, -0.15],
    [ 0.46, -0.02],
    [ 0.70, -0.48],
  ].map(([dx, dy]) => `${cx + dx * r},${cy + dy * r}`).join(' ');

  const sw = Math.max(r * 0.14, 1.4); // stroke width scales with ball size

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r - 0.5} />
        </clipPath>
      </defs>

      {/* Ball body */}
      <circle cx={cx} cy={cy} r={r} fill="#91BE4D" />

      {/* Holes — pickleball identity */}
      {[[-0.30,-0.44],[0.10,-0.54],[0.50,-0.10],[-0.10,0.20],[0.32,0.44]].map(([dx,dy],i) => (
        <circle key={i}
          cx={cx + dx*r} cy={cy + dy*r}
          r={r * 0.11} fill="#1e3300" opacity="0.38" />
      ))}

      {/* Upward trend line — the "Tracker" concept, orange */}
      <polyline
        points={pts}
        stroke="#ec9937" strokeWidth={sw}
        fill="none" strokeLinecap="round" strokeLinejoin="round"
        clipPath={`url(#${clipId})`}
      />
      {/* Peak dot — anchors the chart line */}
      <circle
        cx={cx + 0.70 * r} cy={cy - 0.48 * r}
        r={sw * 1.1}
        fill="#ec9937"
        clipPath={`url(#${clipId})`}
      />
    </>
  );
}

// ─── Full logo — Login / Signup / Landing ─────────────────────────────────────
// Horizontal: [ball] [Pickle / Tracker]
// viewBox 0 0 220 76
export function LogoFull({ height = 80, className = '' }) {
  const W = Math.round(220 * (height / 76));
  return (
    <svg viewBox="0 0 220 76" width={W} height={height}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker"
      className={className}>

      {/* Ball with chart — vertically centred */}
      <TrackerBall cx={36} cy={38} r={32} id="full" />

      {/* "Pickle" — lime, lighter weight, smaller — sits top-half */}
      <text x="80" y="32"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="600" fontSize="26" fill="#91BE4D" letterSpacing="1">
        Pickle
      </text>

      {/* "Tracker" — orange, heavy, larger — anchors the mark bottom-half */}
      <text x="78" y="62"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="800" fontSize="34" fill="#ec9937" letterSpacing="0.5">
        Tracker
      </text>
    </svg>
  );
}

// ─── Compact logo — desktop Navbar ────────────────────────────────────────────
// viewBox 0 0 168 40
export function LogoNav({ height = 36, className = '' }) {
  const W = Math.round(168 * (height / 40));
  return (
    <svg viewBox="0 0 168 40" width={W} height={height}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker"
      className={className}>

      <TrackerBall cx={19} cy={20} r={17} id="nav" />

      <text x="42" y="17"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="600" fontSize="14" fill="#91BE4D" letterSpacing="0.8">
        Pickle
      </text>

      <text x="41" y="33"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="800" fontSize="18" fill="#ec9937" letterSpacing="0.3">
        Tracker
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
