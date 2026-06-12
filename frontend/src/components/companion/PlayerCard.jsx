import React, { useRef, useState } from 'react';
import { updateProfile, updateCompanionMedal, getCategoryList } from '../../services/api';
import { Icon } from './erne/Icon';
import { MedalDot } from './Cards';

/**
 * Premium player card for the companion. Profile photo + medal tally +
 * tournament history (only the wins). Editable in place — tap the avatar to
 * swap the photo, tap the name to rename (both persist via updateProfile).
 * Shareable: renders the card to a PNG and uses the Web Share API, falling
 * back to a copyable summary.
 *
 * card: { name, profilePhoto, medals:{gold,silver,bronze}, totalMedals,
 *         tournaments, streak, history:[{tournament,category,medal,date,venue}] }
 * onUpdated(patch) — bubble saved {name|profilePhoto} so parent can refresh.
 * grew — triggers grow+shine animation (new medal landed).
 */

// Shared styling for the inline per-row medal editor fields.
const rowFieldLabel = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--on-dark-soft)',
};
const rowFieldInput = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid var(--dark-line)',
  background: 'rgba(0,0,0,0.18)',
  color: 'var(--on-dark)',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
};

// Square-crop + downscale to a data URL.
const resizeImage = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 300;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

const fmtDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, m, d] = iso.split('-');
  return `${M[+m - 1]} ${+d}, ${y}`;
};

const loadImg = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

// Rounded-rect path helper.
function roundRect(x, rx, ry, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  x.beginPath();
  x.moveTo(rx + rad, ry);
  x.arcTo(rx + w, ry, rx + w, ry + h, rad);
  x.arcTo(rx + w, ry + h, rx, ry + h, rad);
  x.arcTo(rx, ry + h, rx, ry, rad);
  x.arcTo(rx, ry, rx + w, ry, rad);
  x.closePath();
}

// Truncate text to a max pixel width, adding an ellipsis if clipped.
function fitText(x, text, maxW) {
  let t = String(text || '');
  if (x.measureText(t).width <= maxW) return t;
  while (t.length > 1 && x.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

// Draw a medal icon (disc + two ribbon tails) centered at (cx, cy).
// `tone` is the metal color; `size` is the disc radius.
function drawMedal(x, mx, my, size, tone, darker) {
  // ribbon tails
  x.fillStyle = '#c7f23a';
  x.beginPath();
  x.moveTo(mx - size * 0.55, my - size * 0.2);
  x.lineTo(mx - size * 0.15, my + size * 0.9);
  x.lineTo(mx - size * 0.5, my + size * 0.9);
  x.lineTo(mx - size * 0.85, my - size * 0.2);
  x.closePath();
  x.fill();
  x.fillStyle = '#a9d62b';
  x.beginPath();
  x.moveTo(mx + size * 0.55, my - size * 0.2);
  x.lineTo(mx + size * 0.15, my + size * 0.9);
  x.lineTo(mx + size * 0.5, my + size * 0.9);
  x.lineTo(mx + size * 0.85, my - size * 0.2);
  x.closePath();
  x.fill();
  // disc with radial sheen
  const g = x.createRadialGradient(mx - size * 0.3, my - size * 0.3, size * 0.1, mx, my, size);
  g.addColorStop(0, tone);
  g.addColorStop(1, darker);
  x.fillStyle = g;
  x.beginPath();
  x.arc(mx, my, size, 0, Math.PI * 2);
  x.fill();
  // inner ring
  x.lineWidth = Math.max(2, size * 0.12);
  x.strokeStyle = 'rgba(255,255,255,0.35)';
  x.beginPath();
  x.arc(mx, my, size * 0.66, 0, Math.PI * 2);
  x.stroke();
}

// Premium Volt-palette share image (icon-free, single corner watermark).
// Height grows to fit the full tournament-win list; rows past a cap collapse
// into a "+N more" line so the image never gets absurdly tall.
async function buildShareImage(card) {
  const W = 1080;
  const PAD = 56;
  const PX = PAD + 50; // content left edge
  const innerW = W - PX * 2;

  // ---- Pre-compute the layout band offsets (all relative to PAD) so we can
  // size the canvas height to the actual win count before drawing. ----
  const headY = PAD + 92;
  const rowTop = headY + 70;
  const r = 110;
  const pillY = rowTop + 122;
  const pillH = 88;
  const ay = rowTop + r;
  const histTop = Math.max(ay + r, pillY + pillH) + 78;
  const rowStart = histTop + 56;
  const rowH = 82;
  const ROW_CAP = 12; // show up to this many; rest collapse to "+N more"

  const allWins = (card.history || []).filter(Boolean);
  const shown = allWins.slice(0, ROW_CAP);
  const extra = allWins.length - shown.length;
  const lastRowBottom = rowStart + Math.max(shown.length, allWins.length === 0 ? 1 : 0) * rowH;
  const moreLineH = extra > 0 ? 56 : 0;
  const H = Math.round(lastRowBottom + moreLineH + 36 + PAD);

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');

  // Background — dark ink with a subtle Volt glow top-right.
  x.fillStyle = '#16180F';
  x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W, 0, 0, W, 0, 760);
  glow.addColorStop(0, 'rgba(199,242,58,0.14)');
  glow.addColorStop(1, 'rgba(199,242,58,0)');
  x.fillStyle = glow;
  x.fillRect(0, 0, W, H);

  // Inner panel.
  roundRect(x, PAD, PAD, W - PAD * 2, H - PAD * 2, 40);
  x.fillStyle = '#1f2116';
  x.fill();
  x.lineWidth = 2;
  x.strokeStyle = 'rgba(199,242,58,0.18)';
  x.stroke();

  const m = card.medals || {};
  const photo = await loadImg(card.profilePhoto);

  // ---- Header wordmark ----
  x.textAlign = 'left';
  x.textBaseline = 'alphabetic';
  x.font = '900 40px Archivo, sans-serif';
  x.fillStyle = '#FBFAF4';
  x.fillText('Pickle', PX, headY);
  const pw = x.measureText('Pickle').width;
  x.fillStyle = '#C7F23A';
  x.fillText('Tracker', PX + pw, headY);

  // Accent divider.
  x.fillStyle = 'rgba(199,242,58,0.22)';
  x.fillRect(PX, headY + 26, innerW, 2);

  // ---- Identity row: avatar (left) + name / subline / medals (right) ----
  const ax = PX + r; // avatar center x
  x.save();
  x.beginPath();
  x.arc(ax, ay, r, 0, Math.PI * 2);
  x.closePath();
  x.clip();
  if (photo) {
    x.drawImage(photo, ax - r, ay - r, r * 2, r * 2);
  } else {
    x.fillStyle = '#262819';
    x.fillRect(ax - r, ay - r, r * 2, r * 2);
    x.fillStyle = '#C7F23A';
    x.font = '900 110px Archivo, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText((card.name?.[0] || '?').toUpperCase(), ax, ay + 4);
  }
  x.restore();
  x.lineWidth = 7;
  x.strokeStyle = '#C7F23A';
  x.beginPath();
  x.arc(ax, ay, r, 0, Math.PI * 2);
  x.stroke();

  // Right column.
  const colX = ax + r + 46;
  const colW = W - PX - colX;
  x.textAlign = 'left';
  x.textBaseline = 'alphabetic';
  x.fillStyle = '#FBFAF4';
  x.font = '900 52px Archivo, sans-serif';
  x.fillText(fitText(x, card.name || 'Player', colW), colX, rowTop + 50);

  x.fillStyle = '#9DA08C';
  x.font = '26px Hanken Grotesk, sans-serif';
  x.fillText(
    `${card.totalMedals || 0} medals · ${card.tournaments || 0} tournaments`,
    colX,
    rowTop + 92,
  );

  // Medal pills — icon + count, inline.
  const tiles = [
    [m.gold || 0, '#F4CE5E', '#C99A22'],
    [m.silver || 0, '#D7DCE0', '#9AA1A8'],
    [m.bronze || 0, '#D88B53', '#A85F2C'],
  ];
  const pillW = (colW - 24) / 3;
  tiles.forEach(([n, tone, darker], i) => {
    const px = colX + i * (pillW + 12);
    const pcy = pillY + pillH / 2; // pill vertical center
    roundRect(x, px, pillY, pillW, pillH, 18);
    x.fillStyle = '#262819';
    x.fill();
    x.lineWidth = 1.5;
    x.strokeStyle = 'rgba(255,255,255,0.07)';
    x.stroke();
    // Medal icon (its disc centered on pcy) + count, centered as a unit.
    drawMedal(x, px + 36, pcy - 6, 20, tone, darker);
    x.fillStyle = '#FBFAF4';
    x.font = '900 44px Archivo, sans-serif';
    x.textAlign = 'left';
    x.textBaseline = 'middle';
    x.fillText(String(n), px + 70, pcy + 1);
  });

  // ---- History (height already sized to fit all shown rows) ----
  x.textAlign = 'left';
  x.textBaseline = 'alphabetic';
  x.fillStyle = '#C7F23A';
  x.font = '800 24px Hanken Grotesk, sans-serif';
  x.fillText('TOURNAMENT WINS', PX, histTop);

  if (allWins.length === 0) {
    x.fillStyle = '#9DA08C';
    x.font = '28px Hanken Grotesk, sans-serif';
    x.fillText('No podium results logged yet.', PX, rowStart);
  }
  let ly = rowStart;
  shown.forEach((h, i) => {
    if (i > 0) {
      x.fillStyle = 'rgba(255,255,255,0.06)';
      x.fillRect(PX, ly - 42, innerW, 1);
    }
    const tone =
      h.medal === 'Gold'
        ? ['#F4CE5E', '#C99A22']
        : h.medal === 'Silver'
        ? ['#D7DCE0', '#9AA1A8']
        : ['#D88B53', '#A85F2C'];
    drawMedal(x, PX + 18, ly - 14, 14, tone[0], tone[1]);
    x.fillStyle = '#FBFAF4';
    x.font = 'bold 32px Archivo, sans-serif';
    x.textBaseline = 'alphabetic';
    x.fillText(fitText(x, h.tournament || '—', innerW - 60), PX + 56, ly);
    x.fillStyle = '#9DA08C';
    x.font = '24px Hanken Grotesk, sans-serif';
    const sub = [h.category, h.venue, fmtDate(h.date)].filter(Boolean).join(' · ');
    x.fillText(fitText(x, sub, innerW - 60), PX + 56, ly + 34);
    ly += rowH;
  });

  if (extra > 0) {
    x.fillStyle = 'rgba(255,255,255,0.06)';
    x.fillRect(PX, ly - 42, innerW, 1);
    x.fillStyle = '#C7F23A';
    x.font = '800 26px Hanken Grotesk, sans-serif';
    x.textBaseline = 'alphabetic';
    x.fillText(`+${extra} more win${extra !== 1 ? 's' : ''}`, PX + 56, ly - 2);
  }

  // ---- Corner watermark — single diagonal Volt ribbon, top-right ----
  x.save();
  roundRect(x, PAD, PAD, W - PAD * 2, H - PAD * 2, 40);
  x.clip();
  x.translate(W - PAD - 96, PAD + 96);
  x.rotate(Math.PI / 4);
  x.fillStyle = '#C7F23A';
  x.fillRect(-200, -21, 400, 42);
  x.fillStyle = '#16180F';
  x.font = '900 18px Archivo, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('PICKLETRACKER', 0, 1);
  x.restore();

  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}

function MedalTile({ medal, n, label }) {
  return (
    <div
      style={{
        flex: 1,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: '13px 8px',
        textAlign: 'center',
        border: '1px solid var(--dark-line)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <MedalDot medal={medal} size={24} />
      </div>
      <div className="erne-h" style={{ fontSize: 22, color: 'var(--on-dark)' }}>{n}</div>
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--on-dark-soft)',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function PlayerCard({ card, onUpdated, grew, onEditWin, onSavedMedal }) {
  const c = card || {};
  const m = c.medals || {};
  const history = c.history || [];

  const cardRef = useRef(null);
  const fileRef = useRef(null);
  const [photo, setPhoto] = useState(c.profilePhoto || null);
  const [name, setName] = useState(c.name || 'You');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  // Per-row inline medal editor. `editRow` is the history index being edited;
  // `draft` holds its in-progress values; `savingRow` guards double-submit.
  const [editRow, setEditRow] = useState(null);
  const [draft, setDraft] = useState(null);
  const [savingRow, setSavingRow] = useState(false);
  const [rowError, setRowError] = useState('');
  const [categoryOpts, setCategoryOpts] = useState([]);

  // Lazy-load the canonical category list the first time a row opens its editor.
  const openRowEditor = async (i, h) => {
    setRowError('');
    setEditRow(i);
    setDraft({
      medal: h.medal || 'Gold',
      category: h.category || '',
      date: h.date || '',
    });
    if (categoryOpts.length === 0) {
      try {
        const res = await getCategoryList();
        setCategoryOpts(res.data?.data || []);
      } catch {
        /* dropdown falls back to a free-text input */
      }
    }
  };

  const cancelRowEditor = () => {
    setEditRow(null);
    setDraft(null);
    setRowError('');
  };

  const saveRow = async (h) => {
    if (!draft) return;
    setSavingRow(true);
    setRowError('');
    try {
      const patch =
        h.source === 'tournament'
          ? {
              source: 'tournament',
              tournamentId: h.tournamentId,
              categoryIndex: h.categoryIndex,
              medal: draft.medal,
              categoryName: draft.category || undefined,
              date: draft.date || undefined,
            }
          : {
              source: 'manual',
              manualIndex: h.manualIndex,
              medal: draft.medal,
              categoryName: draft.category || undefined,
              date: draft.date || undefined,
            };
      await updateCompanionMedal(patch);
      cancelRowEditor();
      await onSavedMedal?.();
    } catch (err) {
      setRowError(err?.response?.data?.message || 'Could not save. Try again.');
    } finally {
      setSavingRow(false);
    }
  };

  // Trigger grow+shine when grew prop arrives.
  React.useEffect(() => {
    if (grew && cardRef.current) {
      cardRef.current.classList.remove('erne-grow');
      void cardRef.current.offsetWidth;
      cardRef.current.classList.add('erne-grow');
    }
  }, [grew]);

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingPhoto(true);
    try {
      const dataUrl = await resizeImage(file);
      setPhoto(dataUrl);
      const res = await updateProfile({ profilePhoto: dataUrl });
      onUpdated?.(res.data?.data || { profilePhoto: dataUrl });
    } catch {
      /* keep optimistic preview */
    } finally {
      setSavingPhoto(false);
    }
  };

  const saveName = async () => {
    const next = nameDraft.trim();
    setEditingName(false);
    if (!next || next === name) return;
    setName(next);
    try {
      const res = await updateProfile({ name: next });
      onUpdated?.(res.data?.data || { name: next });
    } catch {
      /* keep optimistic */
    }
  };

  const onShare = async () => {
    setShareMsg('Preparing…');
    const summary = `${name} — ${c.totalMedals || 0} medals (Gold ${m.gold || 0}, Silver ${m.silver || 0}, Bronze ${m.bronze || 0}) across ${c.tournaments || 0} tournaments. Tracked on PickleTracker.`;
    try {
      const blob = await buildShareImage({ ...c, name, profilePhoto: photo });
      const file = blob && new File([blob], 'pickletracker-card.png', { type: 'image/png' });
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${name} · PickleTracker`, text: summary });
        setShareMsg('');
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: `${name} · PickleTracker`, text: summary });
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
      ref={cardRef}
      className="erne-playercard"
      style={{
        background: 'var(--dark)',
        color: 'var(--on-dark)',
        borderRadius: 20,
        border: '1px solid var(--dark-line)',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* accent strip */}
      <div style={{ height: 5, background: 'var(--accent)' }} />
      <div className="erne-shine" />

      <div style={{ padding: 17 }}>
        {/* header: avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Change photo"
            style={{
              position: 'relative',
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '2px solid var(--accent)',
              padding: 0,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.08)',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {photo ? (
              <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span
                className="erne-h"
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  color: 'var(--accent)',
                }}
              >
                {(name?.[0] || '?').toUpperCase()}
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} style={{ display: 'none' }} />

          <div style={{ minWidth: 0, flex: 1 }}>
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 18,
                  color: 'var(--ink)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '4px 8px',
                  width: '100%',
                  maxWidth: 200,
                  outline: 'none',
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => { setNameDraft(name); setEditingName(true); }}
                title="Edit name"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--on-dark)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 20,
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                {name}
                <Icon name="edit" size={14} color="var(--on-dark-soft)" />
              </button>
            )}
            <div style={{ fontSize: 12, color: 'var(--on-dark-soft)', marginTop: 2, fontWeight: 600 }}>
              {c.totalMedals || 0} medals · {c.tournaments || 0} tournaments
            </div>
            {c.streak > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 5,
                  padding: '4px 9px',
                  borderRadius: 999,
                  background: 'var(--accent-soft)',
                  color: 'var(--ink)',
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                <Icon name="flame" size={13} color="var(--accent)" /> {c.streak}
              </span>
            )}
          </div>
        </div>

        {/* photo button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={savingPhoto}
          style={{
            marginTop: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'transparent',
            border: '1px solid var(--dark-line)',
            color: 'var(--on-dark-soft)',
            fontFamily: 'var(--font-body)',
            fontSize: 11.5,
            fontWeight: 700,
            borderRadius: 999,
            padding: '4px 10px',
            cursor: savingPhoto ? 'default' : 'pointer',
            opacity: savingPhoto ? 0.6 : 1,
          }}
        >
          <Icon name="user" size={13} color="var(--on-dark-soft)" />
          {savingPhoto ? 'Uploading…' : photo ? 'Change photo' : 'Add photo'}
        </button>

        {/* medals */}
        <div style={{ display: 'flex', gap: 9, marginTop: 15 }}>
          <MedalTile medal="gold" n={m.gold || 0} label="Gold" />
          <MedalTile medal="silver" n={m.silver || 0} label="Silver" />
          <MedalTile medal="bronze" n={m.bronze || 0} label="Bronze" />
        </div>

        {/* history */}
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: 'var(--on-dark-soft)',
            marginTop: 16,
          }}
        >
          TOURNAMENT WINS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 9, maxHeight: 320, overflowY: history.length > 5 ? 'auto' : 'visible' }}>
          {history.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--on-dark-soft)', fontWeight: 500 }}>
              No medals yet — log a win and it lands here.
            </div>
          ) : (
            history.map((h, i) => {
              // Every win is editable in place. Tournament rows write back to the
              // tournament's category; manual rows write to the user achievement.
              const editing = editRow === i;
              const allowNone = h.source === 'tournament'; // manual medals are podium-only
              const medalChoices = allowNone
                ? ['Gold', 'Silver', 'Bronze', 'None']
                : ['Gold', 'Silver', 'Bronze'];

              if (editing) {
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 9,
                      background: 'rgba(255,255,255,0.07)',
                      borderRadius: 12,
                      padding: '11px 12px',
                      border: '1px solid var(--accent)',
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--on-dark)' }}>
                      {h.tournament}
                    </div>

                    <label style={rowFieldLabel}>Medal</label>
                    <select
                      value={draft?.medal || 'Gold'}
                      onChange={(e) => setDraft((d) => ({ ...d, medal: e.target.value }))}
                      style={rowFieldInput}
                    >
                      {medalChoices.map((mv) => (
                        <option key={mv} value={mv}>{mv}</option>
                      ))}
                    </select>

                    <label style={rowFieldLabel}>Category</label>
                    {categoryOpts.length > 0 ? (
                      <select
                        value={draft?.category || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                        style={rowFieldInput}
                      >
                        <option value="">—</option>
                        {categoryOpts.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={draft?.category || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                        placeholder="Category"
                        style={rowFieldInput}
                      />
                    )}

                    <label style={rowFieldLabel}>Date</label>
                    <input
                      type="date"
                      value={draft?.date || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                      style={rowFieldInput}
                    />

                    {rowError && (
                      <div style={{ fontSize: 11.5, color: '#ff9b9b', fontWeight: 600 }}>{rowError}</div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <button
                        type="button"
                        onClick={() => saveRow(h)}
                        disabled={savingRow}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: 10,
                          border: 'none',
                          background: 'var(--accent)',
                          color: 'var(--accent-text)',
                          fontWeight: 800,
                          fontSize: 12.5,
                          cursor: savingRow ? 'default' : 'pointer',
                          opacity: savingRow ? 0.6 : 1,
                        }}
                      >
                        {savingRow ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelRowEditor}
                        disabled={savingRow}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: 10,
                          border: '1px solid var(--dark-line)',
                          background: 'transparent',
                          color: 'var(--on-dark)',
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: '9px 11px',
                    border: '1px solid var(--dark-line)',
                  }}
                >
                  <MedalDot medal={String(h.medal || '').toLowerCase()} size={24} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--on-dark)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {h.tournament}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--on-dark-soft)', fontWeight: 600 }}>
                      {[h.category, fmtDate(h.date)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRowEditor(i, h)}
                    title="Edit this medal"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <Icon name="edit" size={15} color="var(--on-dark-soft)" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* share */}
        <button
          type="button"
          onClick={onShare}
          className="erne-btn"
          style={{
            marginTop: 15,
            width: '100%',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 800,
            padding: '12px',
            borderRadius: 13,
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Icon name="share" size={17} color="var(--accent-text)" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {shareMsg || 'Share my card'}
          </span>
        </button>
      </div>
    </div>
  );
}
