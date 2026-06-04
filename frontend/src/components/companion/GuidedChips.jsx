import React from 'react';
import { Icon } from './erne/Icon';

// Quick-reply chips. chips = [{ id, label, icon? }]. Calls onPick(chip).
// Horizontal scroll row, Erne pill styling.
export default function GuidedChips({ chips = [], onPick, disabled }) {
  if (!chips.length) return null;
  return (
    <div className="erne-chips">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className="erne-chip"
          disabled={disabled}
          onClick={() => onPick?.(c)}
          style={disabled ? { opacity: 0.5, cursor: 'default' } : undefined}
        >
          {c.icon && <Icon name={c.icon} size={15} />}
          {c.label}
        </button>
      ))}
    </div>
  );
}
