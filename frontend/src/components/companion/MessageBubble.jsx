import React from 'react';
import { BallMark } from './erne/Icon';

// One chat message. role: 'bot' | 'user'. Optional card rendered below text.
// Bot rows show the BallMark avatar; user rows are right-aligned.
export default function MessageBubble({ role = 'bot', text, children }) {
  const isUser = role === 'user';
  const hasText = text != null && text !== '';
  return (
    <div className={`erne-row${isUser ? ' user' : ''}`}>
      {!isUser && (
        <span className="erne-ava">
          <BallMark size={20} />
        </span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, maxWidth: '84%' }}>
        {hasText && (
          <div className={isUser ? 'erne-bubble-user' : 'erne-bubble-bot'}>{text}</div>
        )}
        {children}
      </div>
    </div>
  );
}
