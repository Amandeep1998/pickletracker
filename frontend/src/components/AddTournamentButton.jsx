import React from 'react';

/**
 * Always-visible circular "+" button for adding a tournament from a calendar cell.
 * Positioned absolutely — the parent must have `position: relative`.
 */
export default function AddTournamentButton({ onClick }) {
  const handleClick = (e) => {
    e.stopPropagation();
    onClick(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      onClick(e);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title="Add Tournament"
      aria-label="Add tournament on this date"
      style={{
        position: 'absolute',
        bottom: '6px',
        right: '6px',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: '#bbf7d0',   /* green-200 */
        color: '#15803d',              /* green-700 */
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        lineHeight: 1,
        fontWeight: 500,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'background-color 0.15s, transform 0.15s',
        zIndex: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#86efac'; /* green-300 */
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#bbf7d0';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      +
    </div>
  );
}
