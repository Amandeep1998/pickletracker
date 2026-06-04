import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './erne/Icon';

/**
 * Command Deck — type-to-filter bottom sheet that replaces RadialDock.
 * Triggered by the accent (+) button in Composer. Parent controls open state.
 *
 * chips = [{ id, action, iconName, label, short, hint?, group? }]
 * onPick(chip) — called when user picks an action (deck closes after)
 * open / onClose — controlled by parent
 */

// Group ordering for display
const GROUP_ORDER = ['hero', 'Log & add', 'Your game', 'Explore', 'App'];

export default function CommandDeck({ chips = [], onPick, disabled, open, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Swipe-down-to-close: drag the grabber down; release past the threshold closes.
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef(null);

  const onDragStart = (e) => {
    dragStart.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onDragMove = (e) => {
    if (dragStart.current == null) return;
    const dy = e.clientY - dragStart.current;
    setDragY(dy > 0 ? dy : 0);
  };
  const onDragEnd = () => {
    if (dragStart.current == null) return;
    const closing = dragY > 80;
    dragStart.current = null;
    setDragY(0);
    if (closing) onClose?.();
  };

  // Clear query on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setDragY(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const q = query.toLowerCase().trim();
  const filtered = q
    ? chips.filter(
        (c) =>
          (c.label || '').toLowerCase().includes(q) ||
          (c.short || '').toLowerCase().includes(q) ||
          (c.hint || '').toLowerCase().includes(q)
      )
    : chips;

  const hero = filtered.find((c) => c.group === 'hero');
  const rest = filtered.filter((c) => c.group !== 'hero');

  // Group non-hero chips
  const grouped = {};
  rest.forEach((c) => {
    const g = c.group || 'Other';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(c);
  });

  const pick = (chip) => {
    if (disabled) return;
    onClose?.();
    onPick?.(chip);
  };

  return (
    <>
      {/* Scrim */}
      <div
        className="erne-deck-scrim"
        data-open={String(open)}
        onClick={onClose}
        style={{ position: 'fixed' }}
      />
      {/* Sheet */}
      <div
        className="erne-deck"
        data-open={String(open)}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          ...(dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : null),
        }}
      >
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          style={{ padding: '4px 0 8px', margin: '-4px 0 0', cursor: 'grab', touchAction: 'none' }}
        >
          <div className="erne-grabber" style={{ margin: '0 auto' }} />
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Icon
            name="search"
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)', pointerEvents: 'none' }}
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions…"
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              fontFamily: 'var(--font-body)',
              fontSize: 14.5,
              fontWeight: 500,
              color: 'var(--ink)',
              background: 'var(--surface)',
              border: '1.5px solid var(--line)',
              borderRadius: 14,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ maxHeight: 'min(60vh, 460px)', overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--ink-soft)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              No actions match "{query}"
            </div>
          )}

          {/* Hero tile */}
          {hero && (
            <button
              type="button"
              className="erne-hero-tile"
              onClick={() => pick(hero)}
              disabled={disabled}
              style={disabled ? { opacity: 0.5, cursor: 'default' } : undefined}
            >
              <span className="erne-hero-icon">
                <Icon name={hero.iconName || 'plus'} size={24} color="var(--accent-text)" />
              </span>
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div className="erne-h" style={{ fontSize: 17, color: 'var(--accent-text)' }}>
                  {hero.label}
                </div>
                {hero.hint && (
                  <div style={{ fontSize: 12, color: 'var(--accent-text)', opacity: 0.75, fontWeight: 600, marginTop: 1 }}>
                    {hero.hint}
                  </div>
                )}
              </div>
              <Icon name="arrowRight" size={20} color="var(--accent-text)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
            </button>
          )}

          {/* Grouped tiles */}
          {GROUP_ORDER.filter((g) => grouped[g]?.length).map((g) => (
            <div key={g} style={{ marginTop: 14 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                  padding: '0 2px',
                  marginBottom: 8,
                }}
              >
                {g}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {grouped[g].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className="erne-tile"
                    onClick={() => pick(chip)}
                    disabled={disabled}
                    style={disabled ? { opacity: 0.5, cursor: 'default' } : undefined}
                  >
                    <span className="erne-tile-icon">
                      <Icon name={chip.iconName || 'spark'} size={20} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{chip.short || chip.label}</div>
                      {chip.hint && (
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 1 }}>
                          {chip.hint}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Ungrouped (fallback) */}
          {grouped['Other']?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {grouped['Other'].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className="erne-tile"
                    onClick={() => pick(chip)}
                    disabled={disabled}
                    style={disabled ? { opacity: 0.5, cursor: 'default' } : undefined}
                  >
                    <span className="erne-tile-icon">
                      <Icon name={chip.iconName || 'spark'} size={20} />
                    </span>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{chip.short || chip.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 8 }} />
        </div>
      </div>
    </>
  );
}
