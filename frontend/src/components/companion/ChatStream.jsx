import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingDots from './TypingDots';

/**
 * Scrollable message list. Renders messages + optional per-message card,
 * and a typing indicator when `typing` is true. Auto-scrolls to bottom.
 *
 * message: { id, role, text, card } — card is already-rendered JSX (node).
 */
export default function ChatStream({ messages = [], typing = false }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  return (
    <div className="erne-stream">
      <div className="erne-msgs">
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} text={m.text}>
            {m.card ? <div className="erne-cardwrap">{m.card}</div> : null}
          </MessageBubble>
        ))}
        {typing && (
          <MessageBubble role="bot">
            <TypingDots />
          </MessageBubble>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
