import React from 'react';
import { Icon } from './erne/Icon';

/* ---------- shared bits (Erne) ---------- */

const MEDAL = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// result:{type,value} → medal key (gold/silver/bronze) or null
const resultMedal = (result) => {
  if (!result || result.type !== 'medal') return null;
  const v = String(result.value || '').toLowerCase();
  return MEDAL[v] ? v : null;
};

const resultLabel = (result, upcoming) => {
  if (!result) return upcoming ? '—' : 'No medal';
  const { type, value } = result;
  if (type === 'medal') return value ? MEDAL[String(value).toLowerCase()] || value : 'No medal';
  if (type === 'placement') return value ? `#${value}` : 'Participated';
  if (type === 'time') return value || '—';
  if (type === 'score') return value || '—';
  return 'Participated';
};

export function MedalDot({ medal, size = 26 }) {
  const c = { gold: '#E6B43C', silver: '#B8BEC4', bronze: '#C77B45' }[medal] || 'var(--line)';
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle at 35% 30%, ${c}, ${c}99)`,
        boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.18)',
      }}
    >
      <Icon name="medal" size={size * 0.58} color="rgba(255,255,255,0.92)" stroke={1.9} />
    </span>
  );
}

function Shell({ children, accent, style }) {
  return (
    <div
      className="erne-card"
      style={{
        background: 'var(--surface)',
        color: 'var(--ink)',
        borderRadius: 18,
        padding: 16,
        border: accent ? '1.5px solid var(--accent)' : '1px solid var(--line)',
        boxShadow: '0 1px 2px rgba(20,22,15,0.04)',
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    upcoming: { bg: 'var(--accent-soft)', fg: 'var(--ink)', bd: 'var(--accent)' },
    done: { bg: 'transparent', fg: 'var(--ink-soft)', bd: 'var(--line)' },
    neutral: { bg: 'transparent', fg: 'var(--ink-soft)', bd: 'var(--line)' },
  }[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '4px 9px',
        borderRadius: 999,
        background: tones.bg,
        color: tones.fg,
        border: `1px solid ${tones.bd}`,
      }}
    >
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant = 'ghost', icon, full, small }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: small ? 12.5 : 14,
    padding: small ? '8px 13px' : '11px 16px',
    borderRadius: 12,
    border: '1.5px solid transparent',
    flex: full ? 1 : 'none',
    transition: 'transform .12s ease, background .15s ease',
    whiteSpace: 'nowrap',
  };
  const styles = {
    solid: { background: 'var(--ink)', color: 'var(--surface)' },
    accent: { background: 'var(--accent)', color: 'var(--accent-text)' },
    ghost: { background: 'transparent', color: 'var(--ink)', borderColor: 'var(--line)' },
  };
  return (
    <button type="button" onClick={onClick} className="erne-btn" style={{ ...base, ...styles[variant] }}>
      {icon && <Icon name={icon} size={small ? 15 : 17} />}
      {children}
    </button>
  );
}

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  background: 'var(--surface2)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: '10px 13px',
};

/* ---------- TournamentPreviewCard ---------- */
// data: { name, dates, venue, status, categories:[{format,level,partner,result:{type,value},entryFee}], travelTotal }
export function TournamentPreviewCard({ data, onConfirm, onEdit, confirmLabel = 'Looks right' }) {
  const { name, dates, venue, status = 'completed', categories = [], travelTotal = 0 } = data || {};
  const upcoming = status === 'upcoming';
  return (
    <Shell accent>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="erne-h"
            style={{
              fontSize: 19,
              lineHeight: 1.1,
              color: name ? 'var(--ink)' : 'var(--ink-soft)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name || 'Name needed'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 5, fontWeight: 600 }}>
            {[dates, venue].filter(Boolean).join('  ·  ')}
          </div>
        </div>
        <Pill tone={upcoming ? 'upcoming' : 'done'}>
          <Icon name={upcoming ? 'calendar' : 'check'} size={12} /> {upcoming ? 'Upcoming' : 'Completed'}
        </Pill>
      </div>

      {categories.length > 0 && (
        <div style={{ marginTop: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map((c, i) => {
            const medal = resultMedal(c.result);
            return (
              <div key={i} style={rowStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {medal && <MedalDot medal={medal} />}
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, display: 'block' }}>{c.format}</span>
                    {(c.level || c.partner) && (
                      <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>
                        {[c.level, c.partner && `w/ ${c.partner}`].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                </span>
                <span style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, display: 'block' }}>
                    {resultLabel(c.result, upcoming)}
                  </span>
                  {c.entryFee != null && (
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
                      entry {inr(c.entryFee)}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {travelTotal > 0 && (
        <div style={{ ...rowStyle, marginTop: 8, background: 'transparent', borderStyle: 'dashed' }}>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--ink-soft)',
              display: 'flex',
              gap: 7,
              alignItems: 'center',
            }}
          >
            <Icon name="bag" size={15} /> Travel costs
          </span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{inr(travelTotal)}</span>
        </div>
      )}

      {(onConfirm || onEdit) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {onEdit && <Btn onClick={onEdit} icon="edit" full>Edit</Btn>}
          {onConfirm && (
            <Btn variant="accent" onClick={onConfirm} icon="check" full>
              {confirmLabel}
            </Btn>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ---------- GearPreviewCard ---------- */
// data: { title, amount, dateLabel, category }
export function GearPreviewCard({ data, onConfirm, onEdit, confirmLabel = 'Add to spending' }) {
  const { title, amount, dateLabel, category } = data || {};
  return (
    <Shell accent>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="bag" size={22} color="var(--ink)" />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="erne-h" style={{ fontSize: 17, color: title ? 'var(--ink)' : 'var(--ink-soft)' }}>
            {title || 'Item needed'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
            {[category, dateLabel].filter(Boolean).join(' · ') || 'Gear'}
          </div>
        </div>
        <div className="erne-h" style={{ fontSize: 18, color: amount ? 'var(--ink)' : 'var(--ink-soft)' }}>
          {amount ? inr(amount) : '—'}
        </div>
      </div>
      {(onConfirm || onEdit) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {onEdit && <Btn onClick={onEdit} icon="edit" full>Edit</Btn>}
          {onConfirm && (
            <Btn variant="accent" onClick={onConfirm} icon="check" full>
              {confirmLabel}
            </Btn>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ---------- ReminderPrompt ---------- */
export function ReminderPrompt({ tournamentName, onEnable, onSkip }) {
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="bell" size={21} color="var(--ink)" />
        </span>
        <div>
          <div className="erne-h" style={{ fontSize: 15 }}>Want a reminder?</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 1 }}>
            I'll ping you 1 day before {tournamentName ? `“${tournamentName}”` : 'your tournament'} so you
            never miss check-in.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
        <Btn onClick={onSkip} full>Not now</Btn>
        <Btn variant="accent" onClick={onEnable} icon="bell" full>Turn on</Btn>
      </div>
    </Shell>
  );
}

/* ---------- SavedCard (animated check + optional confetti) ---------- */
export function SavedCard({ title = 'Saved!', subtitle, celebrate }) {
  const dots = Array.from({ length: 10 });
  return (
    <Shell style={{ overflow: 'hidden', position: 'relative' }}>
      {celebrate && (
        <div style={{ position: 'absolute', left: 30, top: 28, pointerEvents: 'none' }}>
          {dots.map((_, i) => {
            const a = (i / dots.length) * Math.PI * 2;
            return (
              <span
                key={i}
                className="erne-confetti"
                style={{
                  '--dx': `${Math.cos(a) * 46}px`,
                  '--dy': `${Math.sin(a) * 46}px`,
                  background: i % 2 ? 'var(--accent)' : 'var(--ink)',
                  animationDelay: `${i * 18}ms`,
                }}
              />
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          className="erne-checkwrap"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="check" size={22} color="var(--accent-text)" stroke={2.4} />
        </span>
        <div>
          <div className="erne-h" style={{ fontSize: 16 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 1 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
