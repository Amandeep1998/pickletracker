import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './erne/Icon';

/**
 * Command Deck — bottom sheet of actions, triggered by the accent (+)
 * button in Composer. Parent controls open state. Drag the sheet down
 * (from anywhere, when scrolled to top) to dismiss.
 *
 * chips = [{ id, action, iconName, label, short, hint?, group? }]
 * onPick(chip) — called when user picks an action (deck closes after)
 * open / onClose — controlled by parent
 */

// Group ordering for display
const GROUP_ORDER = ['hero', 'Log & add', 'Your game', 'Explore', 'App'];

export default function CommandDeck({ chips = [], onPick, disabled, open, onClose }) {
  // Swipe-down-to-close: drag the sheet down; release past threshold closes.
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef(null);
  const scrollRef = useRef(null);

  const onDragStart = (e) => {
    // Only begin a close-drag when content is scrolled to the top.
    if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
    dragStart.current = e.clientY;
  };
  const onDragMove = (e) => {
    if (dragStart.current == null) return;
    const dy = e.clientY - dragStart.current;
    setDragY(dy > 0 ? dy : 0);
  };
  const onDragEnd = () => {
    if (dragStart.current == null) return;
    const closing = dragY > 90;
    dragStart.current = null;
    setDragY(0);
    if (closing) onClose?.();
  };

  // Reset drag offset on open.
  useEffect(() => {
    if (open) setDragY(0);
  }, [open]);

  const hero = chips.find((c) => c.group === 'hero');
  const rest = chips.filter((c) => c.group !== 'hero');

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

  const dragging = dragY > 0;

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
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          touchAction: 'none',
          ...(dragging ? { transform: `translateY(${dragY}px)`, transition: 'none' } : null),
        }}
      >
        <div style={{ padding: '4px 0 12px', cursor: 'grab' }}>
          <div className="erne-grabber" style={{ margin: '0 auto' }} />
        </div>

        <div
          ref={scrollRef}
          style={{ maxHeight: 'min(60vh, 460px)', overflowY: 'auto', touchAction: 'pan-y' }}
        >
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
