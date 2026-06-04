import React, { useEffect, useRef, useState } from 'react';
import { APP_NAME } from '../../utils/featureFlags';
import { Icon } from './erne/Icon';

// Text input + send. Controlled when `value`/`onChange` are passed (lets the
// welcome screen prefill an example); otherwise self-manages its own draft.
// `onOpenDeck` adds the accent (+) Command Deck trigger to the left.
export default function Composer({ onSend, disabled, value, onChange, autoFocus, onOpenDeck }) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState('');
  const val = controlled ? value : internal;
  const setVal = controlled ? onChange : setInternal;
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus, value]);

  // Auto-grow height to fit wrapped text, capped so it doesn't take over.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [val]);

  const submit = (e) => {
    e.preventDefault();
    const t = (val || '').trim();
    if (!t || disabled) return;
    onSend?.(t);
    setVal('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) submit(e);
  };

  const empty = !(val || '').trim();

  return (
    <form onSubmit={submit} className="erne-composer">
      {onOpenDeck && (
        <button
          type="button"
          className="erne-deck-trigger"
          onClick={onOpenDeck}
          disabled={disabled}
          aria-label="Open menu"
        >
          <Icon name="plus" size={22} color="var(--accent-text)" />
        </button>
      )}
      <textarea
        ref={inputRef}
        className="erne-input"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={`Message ${APP_NAME}…`}
        rows={1}
      />
      <button
        type="submit"
        className="erne-send"
        disabled={disabled || empty}
        aria-label="send"
      >
        <Icon name="send" size={20} />
      </button>
    </form>
  );
}
