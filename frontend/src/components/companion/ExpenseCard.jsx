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

// Year + month selector for the spend card. Default view is the current month;
// the user picks any year (from availableYears) and any month, or "Full year".
function PeriodSelector({ selection, availableYears, onSelect, busy }) {
  const now = new Date();
  const years = (availableYears && availableYears.length ? availableYears : [now.getFullYear()]);
  const year = selection?.year || now.getFullYear();
  const month = selection?.month || null; // null = full year

  const selStyle = {
    appearance: 'none',
    padding: '6px 26px 6px 10px',
    borderRadius: 9,
    border: '1px solid var(--line)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: busy ? 'default' : 'pointer',
  };

  const chip = (active) => ({
    padding: '5px 10px',
    borderRadius: 999,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: 'var(--ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: busy ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          Period
        </span>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <select
            value={year}
            disabled={busy}
            onChange={(e) => onSelect({ year: +e.target.value, month })}
            style={selStyle}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 9, pointerEvents: 'none', display: 'inline-flex' }}>
            <Icon name="chevron" size={13} color="var(--ink-soft)" />
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button type="button" disabled={busy} style={chip(month == null)} onClick={() => onSelect({ year, month: null })}>
          Full year
        </button>
        {MONTHS.map((m, i) => (
          <button key={m} type="button" disabled={busy} style={chip(month === i + 1)} onClick={() => onSelect({ year, month: i + 1 })}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ExpenseCard({ data, mode = 'spend', onSelect, onAction, busy }) {
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
  const gearItems = d.gearItems || [];
  // Total spent = tournament entry + travel + standalone gear (the full picture).
  const spentTotal = (d.entry || 0) + (d.travel || 0) + (d.gear || 0);
  const isEmpty = d.isEmpty != null ? d.isEmpty : spentTotal === 0;

  return (
    <Shell>
      {onSelect && (
        <PeriodSelector
          selection={d.selection}
          availableYears={d.availableYears}
          onSelect={onSelect}
          busy={busy}
        />
      )}
      <HeadRow label={`Spent · ${LABEL}`} value={money(spentTotal)} icon="wallet" />

      {isEmpty ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 12 }}>
            No expenses recorded for {d.label || 'this period'} yet. Start tracking:
          </div>
          {onAction && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ActionItem icon="bag" label="Add gear expense" sub="Paddle, shoes, bag…" onClick={() => onAction('gear')} busy={busy} />
              <ActionItem icon="trophy" label="Log a tournament" sub="Entry fee + result" onClick={() => onAction('log')} busy={busy} />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Breakdown strip: entry / travel / gear at a glance. */}
          <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
            <Stat label="Entry" value={money(d.entry)} />
            <Stat label="Travel" value={money(d.travel)} />
            <Stat label="Gear" value={money(d.gear)} />
          </div>

          {rows.length > 0 && (
            <>
              <SectionLabel>Tournaments</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
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
            </>
          )}

          {gearItems.length > 0 && (
            <>
              <SectionLabel>Gear &amp; equipment</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {gearItems.map((g, i) => (
                  <Row key={g.id || i} name={g.title} sub={fmtDate(g.date)} value={g.amount} money={money} />
                ))}
              </div>
            </>
          )}

          {onAction && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction('gear')}
              style={{
                marginTop: 12,
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                background: 'transparent',
                border: '1px dashed var(--line)',
                borderRadius: 11,
                padding: '10px 12px',
                color: 'var(--ink)',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 12.5,
                cursor: busy ? 'default' : 'pointer',
              }}
            >
              <Icon name="plus" size={14} /> Add gear expense
            </button>
          )}
        </>
      )}
    </Shell>
  );
}

function Stat({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        background: 'var(--surface2)',
        border: '1px solid var(--line)',
        borderRadius: 11,
        padding: '9px 10px',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        {label}
      </div>
      <div className="erne-h" style={{ fontSize: 15, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '14px 0 8px' }}>
      {children}
    </div>
  );
}

function ActionItem({ icon, label, sub, onClick, busy }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        width: '100%',
        textAlign: 'left',
        background: 'var(--surface2)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '11px 13px',
        cursor: busy ? 'default' : 'pointer',
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--accent-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={18} color="var(--ink)" />
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)' }}>{sub}</span>}
      </span>
      <Icon name="chevron" size={16} color="var(--ink-soft)" />
    </button>
  );
}
