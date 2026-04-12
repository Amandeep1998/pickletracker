/**
 * PickleTracker Logo
 *
 * Icon: a clean, precise pickleball — flat lime, thin border, symmetric holes.
 * No chart, no highlight, no competing elements. One clear read.
 *
 * Wordmark: "Pickle" (lime) + "Tracker" (dark) — same weight, same size.
 * The name carries the tracking concept; the icon carries the sport.
 *
 * LogoFull  — 310×70  (Login / Signup / Landing)
 * LogoNav   — 155×36  (desktop Navbar — Tracker in off-white for dark bg)
 * LogoIcon  — 36×36   (mobile Navbar)
 */

// Holes: 3-row brick grid, symmetric, clipped to ball
// Row offsets (dx, dy) as fractions of r
const HOLE_GRID = [
  // Row 1 — top
  [-0.28, -0.42], [0, -0.44], [0.28, -0.42],
  // Row 2 — middle (offset half-step)
  [-0.42, -0.10], [-0.14, -0.10], [0.14, -0.10], [0.42, -0.10],
  // Row 3 — lower
  [-0.28,  0.26], [0,  0.26], [0.28,  0.26],
];

function PickleBall({ cx, cy, r }) {
  return (
    <>
      {/* Ball — flat, one colour, thin border for definition */}
      <circle cx={cx} cy={cy} r={r}
        fill="#91BE4D" stroke="#6a9020" strokeWidth="1" />

      {/* Holes — symmetric brick grid */}
      {HOLE_GRID.map(([dx, dy], i) => (
        <circle key={i}
          cx={cx + dx * r} cy={cy + dy * r}
          r={r * 0.09}
          fill="#1e3300" opacity="0.40" />
      ))}
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

      <PickleBall cx={33} cy={35} r={30} id="full" />

      {/* Wordmark — single line, identical weight, colour only differs */}
      <text x="76" y="46"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="700" fontSize="38" letterSpacing="0.5">
        <tspan fill="#91BE4D">Pickle</tspan><tspan fill="#272702">Tracker</tspan>
      </text>
    </svg>
  );
}

// ─── Compact mark — desktop Navbar (dark background) ─────────────────────────
export function LogoNav({ height = 36, className = '' }) {
  const W = Math.round(155 * (height / 36));
  return (
    <svg viewBox="0 0 155 36" width={W} height={height}
      xmlns="http://www.w3.org/2000/svg" aria-label="PickleTracker"
      className={className}>

      <PickleBall cx={16} cy={18} r={14} id="nav" />

      {/* "Tracker" in off-white so it reads on the dark olive navbar */}
      <text x="36" y="23"
        fontFamily="'Barlow Condensed', 'Arial Narrow', Impact, sans-serif"
        fontWeight="700" fontSize="19" letterSpacing="0.3">
        <tspan fill="#91BE4D">Pickle</tspan><tspan fill="#e0e8c8">Tracker</tspan>
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
      <PickleBall cx={18} cy={18} r={16} id="icon" />
    </svg>
  );
}

// Backward-compat aliases
export const LogoStyleA = LogoFull;
export const LogoStyleB = LogoFull;
export const LogoStyleC = LogoFull;
