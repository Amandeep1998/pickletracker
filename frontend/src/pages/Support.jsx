import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import PaddleLoader from '../components/PaddleLoader';

const TYPE_OPTIONS = [
  {
    value: 'feature_request',
    label: 'Feature request',
    hint: 'Tell us about something you wish the app could do.',
    icon: '💡',
  },
  {
    value: 'issue',
    label: 'Report an issue',
    hint: 'Something broken, confusing, or wrong?',
    icon: '🐞',
  },
];

const STATUS_LABEL = {
  open: { label: 'Open', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In progress', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  closed: { label: 'Closed', tone: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const TYPE_LABEL = {
  feature_request: 'Feature request',
  issue: 'Issue',
};

function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Support() {
  const [type, setType] = useState('feature_request');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successId, setSuccessId] = useState(null);

  const [tickets, setTickets] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTickets = async () => {
    try {
      const res = await api.getMySupportTickets();
      setTickets(res.data.data || []);
    } catch {
      // silent — list is non-essential
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const resetForm = () => {
    setSubject('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccessId(null);
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject) {
      setSubmitError('Please add a short subject so we know what this is about.');
      return;
    }
    if (trimmedMessage.length < 10) {
      setSubmitError('Please describe it in at least a sentence (10+ characters).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.submitSupport({
        type,
        subject: trimmedSubject,
        message: trimmedMessage,
      });
      setSuccessId(res.data.data?._id || 'ok');
      resetForm();
      fetchTickets();
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
          'Could not send your request. Please try again in a moment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.deleteSupportTicket(id);
      setTickets((prev) => prev.filter((t) => t._id !== id));
      setConfirmDeleteId(null);
    } catch {
      // silent — user can retry
    } finally {
      setDeletingId(null);
    }
  };

  const charsLeft = 4000 - message.length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#272702]">Support</h1>
        <p className="text-sm text-gray-500 mt-1">
          Suggest a feature or tell us about something that&apos;s not working. We read every one.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-8"
      >
        {/* Type toggle */}
        <fieldset className="mb-5">
          <legend className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            What is this?
          </legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  aria-pressed={active}
                  className={`text-left flex items-start gap-3 px-3 py-3 rounded-xl border transition-colors ${
                    active
                      ? 'border-[#91BE4D] bg-[#f4f8e8]'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl leading-none flex-shrink-0 mt-0.5">{opt.icon}</span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${active ? 'text-[#4a6e10]' : 'text-[#272702]'}`}>
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-gray-500 mt-0.5">{opt.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Subject */}
        <div className="mb-4">
          <label htmlFor="support-subject" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            Subject
          </label>
          <input
            id="support-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            placeholder={
              type === 'feature_request'
                ? 'e.g. Filter tournaments by partner'
                : 'e.g. Calendar shows wrong date on iPhone'
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
          />
        </div>

        {/* Message */}
        <div className="mb-4">
          <label htmlFor="support-message" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            Details
          </label>
          <textarea
            id="support-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 4000))}
            rows={6}
            placeholder={
              type === 'feature_request'
                ? "What's the use case? When would you use it?"
                : 'What did you do, what did you expect, and what happened instead? Device + browser helps.'
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] resize-y"
          />
          <p className={`mt-1 text-[11px] text-right ${charsLeft < 200 ? 'text-amber-600' : 'text-gray-400'}`}>
            {charsLeft.toLocaleString()} characters left
          </p>
        </div>

        {submitError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {submitError}
          </div>
        )}
        {successId && !submitError && (
          <div className="mb-3 rounded-lg border border-[#91BE4D]/30 bg-[#f4f8e8] px-3 py-2 text-xs text-[#4a6e10]">
            Thanks — we got it. You&apos;ll see it below in your history.
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-60 transition-opacity"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          {submitting ? 'Sending…' : 'Send to PickleTracker'}
        </button>
      </form>

      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
          Your previous requests
        </h2>

        {loadingList ? (
          <div className="py-10 flex justify-center">
            <PaddleLoader label="Loading your history…" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm text-gray-500">No requests yet — send one above.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => {
              const status = STATUS_LABEL[t.status] || STATUS_LABEL.open;
              return (
                <li
                  key={t._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        {TYPE_LABEL[t.type] || t.type}
                      </p>
                      <p className="text-sm font-semibold text-[#272702] break-words">
                        {t.subject}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${status.tone}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                    {t.message}
                  </p>
                  {t.adminReply && (
                    <div className="mt-3 rounded-lg bg-[#f4f8e8] border border-[#91BE4D]/30 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#4a6e10] mb-0.5">
                        Reply from PickleTracker
                      </p>
                      <p className="text-xs text-[#272702] whitespace-pre-wrap break-words">
                        {t.adminReply}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[11px] text-gray-400">
                      Sent {formatTimestamp(t.createdAt)}
                    </p>
                    {confirmDeleteId === t._id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500">Delete this?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(t._id)}
                          disabled={deletingId === t._id}
                          className="text-[11px] font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {deletingId === t._id ? 'Deleting…' : 'Yes, delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(t._id)}
                        className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
