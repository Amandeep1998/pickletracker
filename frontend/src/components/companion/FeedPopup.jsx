import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { T } from './theme';
import { FeedCard } from '../FeedPostCard';

/**
 * Community feed in a modal sheet. Renders the exact same FeedCard used on the
 * Home page so likes, comments (threaded replies), share, and the likers modal
 * behave identically. zIndex stays below the share modal portal (z-110) and the
 * profile popup (z-1000) so those layer above the sheet correctly.
 *
 * items: feed rows from GET /api/feed
 * currentUserId — enables share (own posts) and comment delete
 * hasMore / onViewAll — foot button to load the full feed
 * onViewProfile(userId) — open the premium profile popup
 * onClose() — dismiss the sheet
 */
export default function FeedPopup({ items = [], hasMore, loading, currentUserId, onViewProfile, onViewAll, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const body = (
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(1px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Community feed"
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: 'min(88dvh, 760px)',
          display: 'flex',
          flexDirection: 'column',
          background: '#f1f5ef',
          border: `1px solid ${T.navy3}`,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          fontFamily: T.font,
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            background: T.navy,
            borderBottom: `1px solid ${T.navy3}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, color: T.white }}>👀 Community feed</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: T.muted,
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 18px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#5b6b5e', fontSize: 13.5, padding: '40px 12px' }}>
              {loading ? 'Loading…' : 'No community activity yet.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item) => (
                <FeedCard
                  key={item.id}
                  item={item}
                  currentUserId={currentUserId}
                  onViewProfile={onViewProfile}
                />
              ))}
            </div>
          )}

          {hasMore && onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              disabled={loading}
              style={{
                marginTop: 14,
                width: '100%',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontFamily: T.font,
                fontSize: 13.5,
                fontWeight: 800,
                color: T.navy,
                background: T.lime,
                border: 'none',
                borderRadius: 12,
                padding: '11px 16px',
              }}
            >
              {loading ? 'Loading…' : '👀 View all'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(body, document.body);
}
