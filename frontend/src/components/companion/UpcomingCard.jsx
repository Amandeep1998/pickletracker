import React, { useState } from 'react';
import { Icon } from './erne/Icon';

/**
 * Premium upcoming-tournament cards for the companion. One card per upcoming
 * tournament with full category detail (category · date · entry · partner).
 * Each card is shareable — renders to a PNG via the Web Share API, falling back
 * to a copyable text summary.
 *
 * items: [{ name, dates, venue, categories:[{category,date,entryFee,partner}] }]
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [, m, d] = iso.split('-');
  return `${MONTHS[+m - 1]} ${+d}`;
};

const money = (n) => (n == null ? '' : `₹${Number(n).toLocaleString('en-IN')}`);

// Draw one upcoming card to an offscreen canvas → PNG blob for sharing (Volt palette).
async function buildShareImage(item) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');

  x.fillStyle = '#16180F';
  x.fillRect(0, 0, W, H);
  x.fillStyle = '#1f2116';
  x.fillRect(60, 60, W - 120, H - 120);
  x.fillStyle = '#C7F23A';
  x.fillRect(60, 60, W - 120, 14);

  const cx = W / 2;

  // Badge
  x.fillStyle = '#C7F23A';
  x.font = 'bold 34px Archivo, sans-serif';
  x.textAlign = 'center';
  x.fillText('UPCOMING', cx, 200);

  // Name (wrap to 2 lines if long)
  x.fillStyle = '#FBFAF4';
  x.font = 'bold 72px Archivo, sans-serif';
  const name = item.name || 'Tournament';
  const words = name.split(' ');
  let line = '';
  const lines = [];
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (x.measureText(test).width > W - 200 && line) {
      lines.push(line);
      line = w;
    } else line = test;
  });
  if (line) lines.push(line);
  let ny = 320;
  lines.slice(0, 2).forEach((l) => {
    x.fillText(l, cx, ny);
    ny += 84;
  });

  // Date + venue
  x.fillStyle = '#9DA08C';
  x.font = '36px Hanken Grotesk, sans-serif';
  x.fillText([item.dates, item.venue].filter(Boolean).join('  ·  '), cx, ny + 20);

  // Category rows
  x.textAlign = 'left';
  let ly = ny + 130;
  (item.categories || []).slice(0, 5).forEach((cat) => {
    x.fillStyle = '#262819';
    x.fillRect(120, ly, W - 240, 110);
    x.fillStyle = '#FBFAF4';
    x.font = 'bold 38px Archivo, sans-serif';
    x.fillText(cat.category || 'Category', 150, ly + 50);
    x.fillStyle = '#9DA08C';
    x.font = '30px Hanken Grotesk, sans-serif';
    const sub = [fmtDate(cat.date), cat.partner ? `w/ ${cat.partner}` : '']
      .filter(Boolean)
      .join('  ·  ');
    x.fillText(sub, 150, ly + 92);
    ly += 130;
  });

  x.fillStyle = '#C7F23A';
  x.font = 'bold 40px Archivo, sans-serif';
  x.textAlign = 'center';
  x.fillText('🏓 PickleTracker', cx, H - 90);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}

function UpcomingItem({ item, onEdit, onDelete }) {
  const [shareMsg, setShareMsg] = useState('');
  const cats = item.categories || [];

  const onShare = async () => {
    setShareMsg('Preparing…');
    const catLine = cats
      .map((c) => `${c.category}${c.date ? ` (${fmtDate(c.date)})` : ''}`)
      .join(', ');
    const summary = `Playing ${item.name}${item.dates ? ` on ${item.dates}` : ''}${
      item.venue ? ` at ${item.venue}` : ''
    }${catLine ? ` — ${catLine}` : ''}. Tracked on PickleTracker.`;
    try {
      const blob = await buildShareImage(item);
      const file = blob && new File([blob], 'pickletracker-upcoming.png', { type: 'image/png' });
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${item.name} · PickleTracker`, text: summary });
        setShareMsg('');
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: `${item.name} · PickleTracker`, text: summary });
        setShareMsg('');
        return;
      }
      await navigator.clipboard.writeText(summary);
      setShareMsg('Copied');
    } catch {
      try {
        await navigator.clipboard.writeText(summary);
        setShareMsg('Copied');
      } catch {
        setShareMsg('Could not share');
      }
    }
    setTimeout(() => setShareMsg(''), 2500);
  };

  return (
    <div
      className="erne-card"
      style={{
        background: 'var(--surface)',
        color: 'var(--ink)',
        borderRadius: 18,
        border: '1px solid var(--line)',
        boxShadow: '0 1px 2px rgba(20,22,15,0.04)',
        width: '100%',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div className="erne-h" style={{ fontSize: 18 }}>{item.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3, fontWeight: 600 }}>
            {[item.dates, item.venue].filter(Boolean).join(' · ')}
          </div>
        </div>
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
            background: 'var(--accent-soft)',
            color: 'var(--ink)',
            border: '1px solid var(--accent)',
            flexShrink: 0,
          }}
        >
          <Icon name="calendar" size={12} /> Upcoming
        </span>
      </div>

      {cats.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {cats.map((cat, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: '9px 12px',
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{cat.category || 'Category'}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2, fontWeight: 600 }}>
                {[
                  fmtDate(cat.date),
                  cat.entryFee != null ? `Entry ${money(cat.entryFee)}` : '',
                  cat.partner ? `w/ ${cat.partner}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {onEdit && (
          <button type="button" onClick={() => onEdit(item)} className="erne-btn" style={ghostBtn}>
            <Icon name="edit" size={16} /> Edit
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="erne-btn"
            style={{ ...ghostBtn, color: '#C0492F' }}
          >
            <Icon name="trash" size={16} color="#C0492F" /> Delete
          </button>
        )}
        <button type="button" onClick={onShare} className="erne-btn" style={shareBtn}>
          <Icon name="share" size={16} color="var(--accent-text)" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {shareMsg || 'Share'}
          </span>
        </button>
      </div>
    </div>
  );
}

const ghostBtn = {
  flex: 1,
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: 13.5,
  fontWeight: 700,
  padding: '10px 12px',
  borderRadius: 12,
  background: 'transparent',
  color: 'var(--ink)',
  border: '1.5px solid var(--line)',
};

const shareBtn = {
  flex: 1,
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: 13.5,
  fontWeight: 700,
  padding: '10px 12px',
  borderRadius: 12,
  background: 'var(--accent)',
  color: 'var(--accent-text)',
  border: '1.5px solid transparent',
};

export default function UpcomingCard({ items = [], onEdit, onDelete }) {
  if (!items.length) {
    return (
      <div
        className="erne-card"
        style={{
          background: 'var(--surface)',
          color: 'var(--ink)',
          borderRadius: 18,
          padding: 16,
          border: '1px solid var(--line)',
          width: '100%',
          fontSize: 13.5,
          fontWeight: 600,
          color: 'var(--ink-soft)',
        }}
      >
        No upcoming tournaments yet.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {items.map((it, i) => (
        <UpcomingItem key={it.id || i} item={it} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
