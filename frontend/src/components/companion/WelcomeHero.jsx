import React from 'react';
import { APP_NAME } from '../../utils/featureFlags';
import { getCurrencySymbol, getStoredCurrency } from '../../utils/format';
import { Icon, BallMark } from './erne/Icon';

/**
 * First-run welcome (ChatGPT/Claude-style empty state). Big, plain-language
 * intro + concrete example cards that PREFILL the composer so a first-timer
 * sees exactly what to type. Action chips below jump straight to read surfaces.
 *
 * onExample(text)  — drop an editable example into the composer
 * onAction(action) — 'card' | 'upcoming' | 'feed' | 'login'
 */

// Concrete sentences a real player would say — entry fee + travel costs included.
// Entry-fee amounts carry the user's stored currency symbol (e.g. "entry ₹40").
const CUR = getCurrencySymbol(getStoredCurrency());
const EXAMPLES = [
  {
    icon: 'trophy',
    title: 'Log a result',
    text: `Won gold in mixed doubles at Grand Slam on May 24, entry ${CUR}40`,
  },
  {
    icon: 'calendar',
    title: 'Log an upcoming one',
    text: `Playing men’s doubles at Global Sports next Saturday, entry ${CUR}50`,
  },
  {
    icon: 'medal',
    title: 'Add a past medal',
    text: `Got bronze in singles at Picklebay last month, entry ${CUR}35`,
  },
  {
    icon: 'wallet',
    title: 'See my spending',
    text: 'How much did I spend this month?',
  },
];

function ExampleCard({ ex, onClick, disabled }) {
  return (
    <button
      type="button"
      className="erne-ex"
      onClick={onClick}
      disabled={disabled}
      style={disabled ? { opacity: 0.6, cursor: 'default' } : undefined}
    >
      <span className="erne-ex-icon">
        <Icon name={ex.icon} size={18} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }} className="erne-h">
        {ex.title}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.35, fontWeight: 500 }}>
        “{ex.text}”
      </span>
    </button>
  );
}

export default function WelcomeHero({ onExample, onAction, hasToken, disabled }) {
  const actionChips = hasToken
    ? [
        { id: 'card', icon: 'idcard', label: 'My card' },
        { id: 'upcoming', icon: 'calendar', label: 'My upcoming' },
        { id: 'feed', icon: 'feed', label: 'Community feed' },
      ]
    : [{ id: 'login', icon: 'user', label: 'Log in to save' }];

  return (
    <div className="erne-stream">
      <div className="erne-welcome">
        <BallMark size={44} />

        <h1 className="erne-h" style={{ fontSize: 26, color: 'var(--ink)', margin: '16px 0 8px' }}>
          Hi, I’m {APP_NAME}
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
          Your pickleball buddy. Just tell me about a tournament in your own words —
          the result, the entry fee, even your travel costs — and I’ll log it for you.
        </p>

        <div className="erne-examples">
          {EXAMPLES.map((ex) => (
            <ExampleCard key={ex.title} ex={ex} disabled={disabled} onClick={() => onExample(ex.text)} />
          ))}
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', margin: '16px 0 0', fontWeight: 500 }}>
          Tap an example to fill it in — then edit and send. Or just type your own.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {actionChips.map((c) => (
            <button
              key={c.id}
              type="button"
              className="erne-chip"
              disabled={disabled}
              onClick={() => onAction(c.id)}
              style={disabled ? { opacity: 0.5, cursor: 'default' } : undefined}
            >
              <Icon name={c.icon} size={15} />
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
