import React, { useRef, useState } from 'react';
import { updateProfile } from '../../services/api';
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

// Volt-palette share image.
async function buildShareImage(card) {
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

  // Avatar
  const photo = await loadImg(card.profilePhoto);
  const cy = 320;
  const r = 150;
  x.save();
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.closePath();
  x.clip();
  if (photo) {
    x.drawImage(photo, cx - r, cy - r, r * 2, r * 2);
  } else {
    x.fillStyle = '#262819';
    x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.fillStyle = '#C7F23A';
    x.font = 'bold 150px Archivo, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText((card.name?.[0] || '?').toUpperCase(), cx, cy + 6);
  }
  x.restore();
  x.lineWidth = 8;
  x.strokeStyle = '#C7F23A';
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.stroke();

  const m = card.medals || {};

  // Name
  x.fillStyle = '#FBFAF4';
  x.font = 'bold 64px Archivo, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  x.fillText(card.name || 'Player', cx, 560);

  x.fillStyle = '#9DA08C';
  x.font = '32px Hanken Grotesk, sans-serif';
  x.fillText(`${card.totalMedals || 0} medals · ${card.tournaments || 0} tournaments`, cx, 612);

  // Medal tiles
  const tiles = [
    ['Gold', m.gold || 0, '#E6B43C'],
    ['Silver', m.silver || 0, '#B8BEC4'],
    ['Bronze', m.bronze || 0, '#C77B45'],
  ];
  const tileW = 280;
  const gap = 24;
  const totalW = tileW * 3 + gap * 2;
  let tx = (W - totalW) / 2;
  const ty = 700;
  tiles.forEach(([label, n, col]) => {
    x.fillStyle = '#262819';
    x.fillRect(tx, ty, tileW, 220);
    x.fillStyle = col;
    x.font = 'bold 64px Archivo, sans-serif';
    x.textAlign = 'center';
    x.fillText(String(n), tx + tileW / 2, ty + 140);
    x.fillStyle = '#9DA08C';
    x.font = '30px Hanken Grotesk, sans-serif';
    x.fillText(label, tx + tileW / 2, ty + 195);
    tx += tileW + gap;
  });

  // History
  x.textAlign = 'left';
  x.fillStyle = '#9DA08C';
  x.font = 'bold 28px Hanken Grotesk, sans-serif';
  x.fillText('TOURNAMENT WINS', 120, 1010);
  let ly = 1060;
  (card.history || []).slice(0, 4).forEach((h) => {
    x.fillStyle = '#FBFAF4';
    x.font = 'bold 34px Archivo, sans-serif';
    x.fillText(String(h.tournament || '').slice(0, 38), 120, ly);
    x.fillStyle = '#9DA08C';
    x.font = '28px Hanken Grotesk, sans-serif';
    const sub = [h.category, fmtDate(h.date)].filter(Boolean).join(' · ').slice(0, 48);
    x.fillText(sub, 120, ly + 38);
    ly += 88;
  });

  x.fillStyle = '#C7F23A';
  x.font = 'bold 34px Archivo, sans-serif';
  x.textAlign = 'center';
  x.fillText('erne', cx, H - 90);

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

export default function PlayerCard({ card, onUpdated, grew, onEditWin }) {
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
    const summary = `${name} — ${c.totalMedals || 0} medals (Gold ${m.gold || 0}, Silver ${m.silver || 0}, Bronze ${m.bronze || 0}) across ${c.tournaments || 0} tournaments. Tracked on erne.`;
    try {
      const blob = await buildShareImage({ ...c, name, profilePhoto: photo });
      const file = blob && new File([blob], 'erne-card.png', { type: 'image/png' });
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${name} · erne`, text: summary });
        setShareMsg('');
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: `${name} · erne`, text: summary });
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
              const editable = h.source === 'tournament' && h.tournamentId && onEditWin;
              return (
                <div
                  key={i}
                  role={editable ? 'button' : undefined}
                  tabIndex={editable ? 0 : undefined}
                  onClick={editable ? () => onEditWin(h) : undefined}
                  onKeyDown={editable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEditWin(h); } } : undefined}
                  title={editable ? 'Tap to fix the result' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: '9px 11px',
                    border: '1px solid var(--dark-line)',
                    cursor: editable ? 'pointer' : 'default',
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
                  {editable && <Icon name="edit" size={14} color="var(--on-dark-soft)" />}
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
          {shareMsg || 'Share my card'}
        </button>
      </div>
    </div>
  );
}
