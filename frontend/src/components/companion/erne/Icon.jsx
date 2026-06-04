import React from 'react';
import { APP_NAME } from '../../../utils/featureFlags';

/*
 * Erne line-icon set. Single <Icon name size /> component — stroke-based,
 * geometric, no emoji. Ported from design_handoff_erne_companion/app/icons.jsx.
 * Plus the BallMark glyph (a pickleball) and the lowercase `erne` Wordmark.
 */

const ICON_PATHS = {
  // navigation / system
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  close: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  send: (
    <>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="6 11 12 5 18 11" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </>
  ),
  chevron: <polyline points="9 6 15 12 9 18" />,
  chevronDown: <polyline points="6 9 12 15 18 9" />,
  back: <polyline points="15 6 9 12 15 18" />,
  check: <polyline points="5 12.5 10 17.5 19 7" />,
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <line x1="13" y1="7" x2="17" y2="11" />
    </>
  ),
  trash: (
    <>
      <polyline points="4 7 20 7" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M9.5 7V4.5h5V7" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <line x1="8" y1="11" x2="16" y2="7" />
      <line x1="8" y1="13" x2="16" y2="17" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2.5h-15L6 16z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  menu: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  logout: (
    <>
      <path d="M15 5H6v14h9" />
      <polyline points="13 8 17 12 13 16" />
      <line x1="17" y1="12" x2="9" y2="12" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18" />
    </>
  ),
  // sport / product
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9.5" cy="9" r="0.4" />
      <circle cx="14.5" cy="9" r="0.4" />
      <circle cx="12" cy="12.5" r="0.4" />
      <circle cx="9.5" cy="15" r="0.4" />
      <circle cx="14.5" cy="15" r="0.4" />
    </>
  ),
  paddle: (
    <>
      <ellipse cx="11" cy="9.5" rx="6" ry="6.7" />
      <path d="M9.4 15.6l-2.2 4.6a1.3 1.3 0 0 0 2.4 1l2.2-4.7" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H5.5v1.5A3 3 0 0 0 8 9.4M16 5h2.5v1.5A3 3 0 0 1 16 9.4" />
      <line x1="12" y1="13" x2="12" y2="16" />
      <path d="M9 20h6M9.5 20l.5-4h4l.5 4" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14.5" r="4.5" />
      <path d="M9 4l1.8 5M15 4l-1.8 5" />
      <path d="M8 4h8" />
      <circle cx="12" cy="14.5" r="1.4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2.2" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="8" y1="3.5" x2="8" y2="7" />
      <line x1="16" y1="3.5" x2="16" y2="7" />
    </>
  ),
  chart: (
    <>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="12" width="3" height="6" rx="0.6" />
      <rect x="11" y="8" width="3" height="10" rx="0.6" />
      <rect x="16" y="5" width="3" height="13" rx="0.6" />
    </>
  ),
  whistle: (
    <>
      <path d="M14 9H5a2.5 2.5 0 0 0 0 7h4.5L14 19v-4a3 3 0 0 0 0-6z" />
      <circle cx="7.5" cy="12.5" r="1.6" />
      <line x1="14" y1="7" x2="18" y2="5" />
    </>
  ),
  idcard: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2.2" />
      <circle cx="8.5" cy="11.5" r="2" />
      <path d="M5.5 16a3 3 0 0 1 6 0" />
      <line x1="14" y1="10" x2="18" y2="10" />
      <line x1="14" y1="13.5" x2="17" y2="13.5" />
    </>
  ),
  bag: (
    <>
      <path d="M5.5 8h13l-1 12h-11l-1-12z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.5" y="6.5" width="17" height="12" rx="2.2" />
      <path d="M16 11h4v4h-4a2 2 0 0 1 0-4z" />
      <circle cx="16.5" cy="13" r="0.5" />
    </>
  ),
  feed: (
    <>
      <circle cx="8" cy="8.5" r="2.6" />
      <path d="M3.5 18a4.5 4.5 0 0 1 9 0" />
      <circle cx="17" cy="10" r="2.1" />
      <path d="M14.5 18a3.6 3.6 0 0 1 6.8-1.6" />
    </>
  ),
  install: (
    <>
      <path d="M12 4v9" />
      <polyline points="8 10 12 14 16 10" />
      <path d="M5 16v2.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V16" />
    </>
  ),
  flame: (
    <path d="M12 3.5c2.5 3 4.5 5 4.5 8.5a4.5 4.5 0 0 1-9 0c0-1.4.6-2.4 1.4-3.3.3 1 .9 1.6 1.6 1.8C10 8.5 11 6.5 12 3.5z" />
  ),
  spark: (
    <path d="M12 4l1.6 5.4L19 11l-5.4 1.6L12 18l-1.6-5.4L5 11l5.4-1.6L12 4z" />
  ),
  history: (
    <>
      <path d="M4 12a8 8 0 1 1 2.5 5.8" />
      <polyline points="4 19 4 14 9 14" />
      <polyline points="12 8 12 12 15 14" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6-5.2 6-10a6 6 0 0 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  net: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="20" x2="20" y2="20" />
      <path d="M5 7v13M9 7v13M12 7v13M15 7v13M19 7v13" opacity="0.55" />
    </>
  ),
  arrowRight: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </>
  ),
  google: null, // rendered as multicolor below
};

export function Icon({ name, size = 22, stroke = 1.75, color = 'currentColor', style, ...rest }) {
  if (name === 'google') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} style={style} {...rest}>
        <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22z" />
        <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9z" />
        <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3 7.5l3.4 2.6C7.2 7.9 9.4 6.1 12 6.1z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      {...rest}
    >
      {ICON_PATHS[name] || null}
    </svg>
  );
}

// Brand glyph: a pickleball — filled disc with punched holes.
export function BallMark({ size = 28, bg = 'var(--accent)', holes = 'var(--ink)' }) {
  const hs = [
    [10, 9],
    [15.5, 9.5],
    [9, 14],
    [14.5, 14.5],
    [12, 18],
    [18, 13],
    [6.5, 11.5],
  ];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-label="Erne">
      <circle cx="12" cy="12" r="11" fill={bg} />
      {hs.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.15" fill={holes} opacity="0.92" />
      ))}
    </svg>
  );
}

export function Wordmark({ size = 22, color = 'var(--ink)' }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--display-wght)',
        fontStretch: 'var(--display-stretch)',
        fontSize: size,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {APP_NAME}
    </span>
  );
}

export default Icon;
