import React, { useEffect, useState } from 'react';
import { T } from './theme';
import { submitSupport, getMySupportTickets, deleteSupportTicket } from '../../services/api';

/**
 * Premium support popup (modal overlay) for the companion. Send a feature
 * request / issue and see past tickets — all without leaving the chat.
 * Mirrors the old /support page, restyled in the companion dark theme.
 *
 * onClose() — dismiss.
 */

const TYPES = [
  { value: 'feature_request', label: 'Feature request', hint: 'Something you wish it could do.', icon: '💡' },
  { value: 'issue', label: 'Report an issue', hint: 'Something broken or wrong?', icon: '🐞' },
];
const TYPE_LABEL = { feature_request: 'Feature request', issue: 'Issue' };
const STATUS = {
  open: { label: 'Open', color: '#7cc4ff' },
  in_progress: { label: 'In progress', color: '#ffcf5c' },
  closed: { label: 'Closed', color: T.muted },
};
const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function SupportPopup({ onClose }) {
  const [type, setType] = useState('feature_request');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTickets = async () => {
    try {
      const res = await getMySupportTickets();
      setTickets(res.data.data || []);
    } catch {
      /* list is non-essential */
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const s = subject.trim();
    const m = message.trim();
    if (!s) return setError('Add a short subject so we know what this is about.');
    if (m.length < 10) return setError('Describe it in at least a sentence (10+ characters).');
    setSubmitting(true);
    try {
      await submitSupport({ type, subject: s, message: m });
      setSuccess(true);
      setSubject('');
      setMessage('');
      fetchTickets();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send. Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteSupportTicket(id);
      setTickets((prev) => prev.filter((t) => t._id !== id));
      setConfirmDeleteId(null);
    } catch {
      /* user can retry */
    } finally {
      setDeletingId(null);
    }
  };

  const charsLeft = 4000 - message.length;

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: T.navy3,
    border: `1px solid ${T.navy3}`,
    borderRadius: 10,
    padding: '10px 12px',
    color: T.white,
    fontFamily: T.font,
    fontSize: 13.5,
    outline: 'none',
  };
  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: T.muted,
    marginBottom: 6,
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
          maxWidth: 460,
          maxHeight: '88vh',
          overflowY: 'auto',
          background: `linear-gradient(160deg, ${T.navy2} 0%, ${T.navy} 100%)`,
          color: T.white,
          borderRadius: T.radius,
          border: `1px solid ${T.navy3}`,
          padding: 18,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>💬 Support</div>
            <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>
              Suggest a feature or report an issue. We read every one.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: 18 }}>
          <span style={labelStyle}>What is this?</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
            {TYPES.map((opt) => {
              const active = type === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  style={{
                    textAlign: 'left',
                    display: 'flex',
                    gap: 9,
                    alignItems: 'flex-start',
                    padding: '10px 11px',
                    borderRadius: 11,
                    cursor: 'pointer',
                    background: active ? T.navy3 : 'transparent',
                    border: `1px solid ${active ? T.lime : T.navy3}`,
                    color: T.white,
                    fontFamily: T.font,
                  }}
                >
                  <span style={{ fontSize: 17, lineHeight: 1 }}>{opt.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: active ? T.lime : T.white }}>
                      {opt.label}
                    </span>
                    <span style={{ display: 'block', fontSize: 10.5, color: T.muted, marginTop: 1 }}>{opt.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="sp-subject" style={labelStyle}>Subject</label>
            <input
              id="sp-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              placeholder={type === 'feature_request' ? 'e.g. Filter tournaments by partner' : 'e.g. Wrong date on iPhone'}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label htmlFor="sp-message" style={labelStyle}>Details</label>
            <textarea
              id="sp-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 4000))}
              rows={5}
              placeholder={
                type === 'feature_request'
                  ? "What's the use case? When would you use it?"
                  : 'What did you do, what did you expect, what happened? Device + browser helps.'
              }
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <div style={{ fontSize: 10.5, textAlign: 'right', marginTop: 4, color: charsLeft < 200 ? '#ffcf5c' : T.muted }}>
              {charsLeft.toLocaleString()} characters left
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#ff8a8a', background: 'rgba(255,138,138,0.1)', border: '1px solid rgba(255,138,138,0.3)', borderRadius: 9, padding: '8px 10px', marginBottom: 10 }}>
              {error}
            </div>
          )}
          {success && !error && (
            <div style={{ fontSize: 12, color: T.lime, background: 'rgba(196,245,59,0.1)', border: `1px solid ${T.navy3}`, borderRadius: 9, padding: '8px 10px', marginBottom: 10 }}>
              Thanks — we got it. It&apos;s in your history below.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: 10,
              border: 'none',
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              background: T.lime,
              color: T.navy,
              fontFamily: T.font,
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </form>

        {/* History */}
        <div style={{ ...labelStyle, marginBottom: 10 }}>Your previous requests</div>
        {loadingList ? (
          <div style={{ fontSize: 12.5, color: T.muted, padding: '8px 0' }}>Loading your history…</div>
        ) : tickets.length === 0 ? (
          <div style={{ fontSize: 12.5, color: T.muted, textAlign: 'center', padding: '18px 0', border: `1px dashed ${T.navy3}`, borderRadius: 12 }}>
            📭 No requests yet — send one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.map((t) => {
              const st = STATUS[t.status] || STATUS.open;
              return (
                <div key={t._id} style={{ background: T.navy3, borderRadius: 12, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: T.muted }}>
                        {TYPE_LABEL[t.type] || t.type}
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 1, wordBreak: 'break-word' }}>{t.subject}</div>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 6 }}>
                    {t.message}
                  </div>
                  {t.adminReply && (
                    <div style={{ marginTop: 8, background: T.navy2, border: `1px solid ${T.navy3}`, borderRadius: 9, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.lime, marginBottom: 2 }}>
                        Reply
                      </div>
                      <div style={{ fontSize: 12, color: T.white, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {t.adminReply}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 10.5, color: T.muted }}>Sent {fmtDate(t.createdAt)}</span>
                    {confirmDeleteId === t._id ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(t._id)}
                          disabled={deletingId === t._id}
                          style={{ background: 'transparent', border: 'none', color: '#ff8a8a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          {deletingId === t._id ? 'Deleting…' : 'Yes, delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ background: 'transparent', border: 'none', color: T.muted, fontSize: 11, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(t._id)}
                        style={{ background: 'transparent', border: 'none', color: T.muted, fontSize: 11, cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
