import { useMemo, useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { FeedCard } from './FeedPostCard';

/** Insert the player-card promo after this many feed items when there is enough activity. */
const FEED_ITEMS_BEFORE_PROMO = 3;

const EST_FEED_ROW = 300;
const EST_PROMO_ROW = 480;
const ROW_GAP = 12;
const OVERSCAN = 5;

function buildFeedRows(visibleFeed) {
  const items = visibleFeed;
  if (!items.length) return [];
  const out = [];
  if (items.length >= FEED_ITEMS_BEFORE_PROMO) {
    for (let i = 0; i < FEED_ITEMS_BEFORE_PROMO; i++) {
      out.push({ type: 'feed', item: items[i], key: String(items[i].id) });
    }
    out.push({ type: 'promo', key: '__promo__' });
    for (let i = FEED_ITEMS_BEFORE_PROMO; i < items.length; i++) {
      out.push({ type: 'feed', item: items[i], key: String(items[i].id) });
    }
  } else {
    for (let i = 0; i < items.length; i++) {
      out.push({ type: 'feed', item: items[i], key: String(items[i].id) });
    }
    out.push({ type: 'promo', key: '__promo__' });
  }
  return out;
}

/**
 * Window-scrolling virtual list: only visible feed rows + promo mount, with dynamic height
 * when cards expand (e.g. comments). Keeps Home fast as the feed grows.
 */
export default function HomeFeedVirtualList({
  visibleFeed,
  currentUserId,
  onViewProfile,
  promoSlot,
}) {
  const rows = useMemo(() => buildFeedRows(visibleFeed), [visibleFeed]);
  /** List anchor ref (layout); keep scrollMargin at 0 — offsetTop was wrongly shifting every row down inside the list. */
  const anchorRef = useRef(null);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (index) => {
      const row = rows[index];
      if (!row) return EST_FEED_ROW;
      return row.type === 'promo' ? EST_PROMO_ROW : EST_FEED_ROW;
    },
    overscan: OVERSCAN,
    scrollMargin: 0,
    gap: ROW_GAP,
    getItemKey: (index) => rows[index]?.key ?? index,
    enabled: rows.length > 0,
  });

  return (
    <div ref={anchorRef} className="w-full">
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="w-full"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.type === 'feed' ? (
                <FeedCard
                  item={row.item}
                  currentUserId={currentUserId}
                  onViewProfile={onViewProfile}
                />
              ) : (
                promoSlot
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
