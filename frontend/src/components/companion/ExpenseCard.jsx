import React from 'react';
import { Icon } from './erne/Icon';

/**
 * Premium spending card for the companion. Three modes drive a 3-step flow:
 *   mode="spend"    — per-tournament entry fees + travel cost (no winnings)
 *   mode="winnings" — per-tournament prize money won
 *   mode="net"      — winnings − entry fees = net cost / profit
 *
 * data: { period, label, currency, entry, travel, gear, total, winnings, net,
 *         tournaments:[{name,entry,travel,prize,date}] }
 */

const SYMBOLS = { INR: '₹', USD: '$', AUD: 'A$', EUR: '€', GBP: '£', CAD: 'C$', SGD: 'S$', MYR: 'RM', PHP: '₱' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [, m, d] = iso.split('-');
  return `${MONTHS[+m - 1]} ${+d}`;
};

function Shell({ children }) {
  return (
    <div
      className="erne-card"
      style={{
        background: 'var(--surface)',
        color: 'var(--ink)',
        borderRadius: 18,
        padding: 16,
        border: '1px solid var(--line)',
        boxShadow: '0 1px 2px rgba(20,22,15,0.04)',
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

function HeadRow({ label, value, valueColor, icon }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          {label}
        </div>
        <div className="erne-h" style={{ fontSize: 34, marginTop: 4, color: valueColor || 'var(--ink)' }}>
          {value}
        </div>
      </div>
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
        <Icon name={icon} size={22} color="var(--ink)" />
      </span>
    </div>
  );
}

function Row({ name, sub, value, money, valueColor }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        background: 'var(--surface2)',
        border: '1px solid var(--line)',
        borderRadius: 11,
        padding: '9px 12px',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 1, fontWeight: 600 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 14, fontWeight: 800, flexShrink: 0, color: valueColor || 'var(--ink)' }}>
        {money(value)}
      </span>
    </div>
  );
}

export default function ExpenseCard({ data, mode = 'spend' }) {
  const d = data || {};
  const sym = SYMBOLS[d.currency] || '₹';
  const money = (n) => `${sym}${Number(n || 0).toLocaleString('en-IN')}`;
  const LABEL = String(d.label || '').toUpperCase();
  const list = d.tournaments || [];

  // ---- NET ----
  if (mode === 'net') {
    const net = (d.winnings || 0) - (d.entry || 0);
    const positive = net >= 0;
    return (
      <Shell>
        <HeadRow
          label={`Net · ${LABEL}`}
          value={`${positive ? '+' : '−'}${money(Math.abs(net))}`}
          valueColor={positive ? 'var(--ink)' : '#C0492F'}
          icon="net"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 13 }}>
          <Row name="Winnings" value={d.winnings} money={money} />
          <Row name="− Entry fees" value={d.entry} money={money} />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 10, fontWeight: 600 }}>
          {positive ? 'In profit this period.' : 'Net cost this period.'}
        </div>
      </Shell>
    );
  }

  // ---- WINNINGS ----
  if (mode === 'winnings') {
    const rows = list.filter((r) => (r.prize || 0) > 0);
    return (
      <Shell>
        <HeadRow label={`Won · ${LABEL}`} value={money(d.winnings)} icon="trophy" />
        {rows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 13 }}>
            {rows.map((r, i) => (
              <Row key={i} name={r.name} sub={fmtDate(r.date)} value={r.prize} money={money} />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 10, fontWeight: 600 }}>
            No prize money for this period.
          </div>
        )}
      </Shell>
    );
  }

  // ---- SPEND (default) ----
  const rows = list.filter((r) => (r.entry || 0) + (r.travel || 0) > 0);
  const spentTotal = (d.entry || 0) + (d.travel || 0);
  return (
    <Shell>
      <HeadRow label={`Spent · ${LABEL}`} value={money(spentTotal)} icon="wallet" />
      {rows.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 13 }}>
          {rows.map((r, i) => (
            <Row
              key={i}
              name={r.name}
              sub={[`entry ${money(r.entry)}`, (r.travel || 0) > 0 ? `travel ${money(r.travel)}` : '']
                .filter(Boolean)
                .join('  ·  ')}
              value={(r.entry || 0) + (r.travel || 0)}
              money={money}
            />
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 10, fontWeight: 600 }}>
          Nothing spent for this period yet.
        </div>
      )}
      {(d.gear || 0) > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 10, fontWeight: 600 }}>
          + {money(d.gear)} gear (not tied to a tournament)
        </div>
      )}
    </Shell>
  );
}
