import React, { useState } from 'react';
import { T } from './theme';
import { updateProfile, deleteAccount } from '../../services/api';

/**
 * Account settings popup for the chat companion.
 *   - Toggle: show this player's tournaments on the Home community feed.
 *   - Delete account (irreversible, two-step confirm).
 *
 * props:
 *   user          current auth user (reads shareTournamentsOnFeed)
 *   refreshUser() refresh the cached auth user after a toggle
 *   onClose()     dismiss
 *   onDeleted()   fired after the account is deleted (caller wipes session)
 */
export default function SettingsPopup({ user, refreshUser, onClose, onDeleted }) {
  const [share, setShare] = useState(user?.shareTournamentsOnFeed !== false);
  const [savingShare, setSavingShare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');

  const toggleShare = async () => {
    const next = !share;
    setShare(next);
    setSavingShare(true);
    setErr('');
    try {
      await updateProfile({ shareTournamentsOnFeed: next });
      await refreshUser?.();
    } catch {
      setShare(!next); // revert on failure
      setErr('Could not update that. Try again.');
    } finally {
      setSavingShare(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    setErr('');
    try {
      await deleteAccount();
      onDeleted?.();
    } catch {
      setErr('Could not delete your account. Try again.');
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: T.font,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: `linear-gradient(160deg, ${T.navy2} 0%, ${T.navy} 100%)`,
          color: T.white,
          borderRadius: T.radius,
          border: `1px solid ${T.navy3}`,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 5, background: T.lime }} />
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Settings</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'transparent', border: 'none', color: T.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0 }}
            >
              ✕
            </button>
          </div>

          {/* show on feed toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: T.navy3,
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Show tournaments on home feed</div>
              <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                Let other players see your tournaments in the community feed.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={share}
              disabled={savingShare}
              onClick={toggleShare}
              style={{
                position: 'relative',
                width: 46,
                height: 26,
                flexShrink: 0,
                borderRadius: 999,
                border: 'none',
                cursor: savingShare ? 'default' : 'pointer',
                background: share ? T.lime : '#3a4a40',
                transition: 'background 0.15s',
                opacity: savingShare ? 0.7 : 1,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: share ? 23 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: T.white,
                  transition: 'left 0.15s',
                }}
              />
            </button>
          </div>

          {err && <div style={{ fontSize: 12, color: '#ff8a8a', marginTop: 12 }}>{err}</div>}

          {/* danger zone */}
          <div style={{ height: 1, background: T.navy3, margin: '18px 0' }} />
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid #ff8a8a',
                color: '#ff8a8a',
                fontFamily: T.font,
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                padding: '11px 14px',
                cursor: 'pointer',
              }}
            >
              Delete account
            </button>
          ) : (
            <div style={{ background: 'rgba(255,138,138,0.08)', border: '1px solid #ff8a8a', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ff8a8a' }}>Delete your account?</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                This permanently removes your account, tournaments, and expenses. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    background: T.navy3,
                    border: 'none',
                    color: T.white,
                    fontFamily: T.font,
                    fontSize: 13.5,
                    fontWeight: 700,
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: deleting ? 'default' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doDelete}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    background: '#ff5b5b',
                    border: 'none',
                    color: T.white,
                    fontFamily: T.font,
                    fontSize: 13.5,
                    fontWeight: 800,
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: deleting ? 'default' : 'pointer',
                    opacity: deleting ? 0.7 : 1,
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
