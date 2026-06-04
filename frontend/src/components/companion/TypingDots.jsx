import React from 'react';

// Three blinking dots = bot is "thinking". Erne styling via .erne-dots.
export default function TypingDots() {
  return (
    <span className="erne-dots" aria-label="typing">
      <i />
      <i />
      <i />
    </span>
  );
}
