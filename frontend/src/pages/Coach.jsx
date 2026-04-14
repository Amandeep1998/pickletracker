import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

// ── Suggested starter questions ──────────────────────────────────────────────
const SUGGESTIONS = [
  "What's my biggest weakness right now?",
  "Give me a 30-min practice plan",
  "How can I improve my dinking?",
  "Am I improving over time?",
  "What should I focus on before my next tournament?",
  "How's my mental game?",
];

// ── Simple markdown renderer ──────────────────────────────────────────────────
function parseBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : part
  );
}

function MarkdownBlock({ text }) {
  const lines = text.split('\n');
  const elements = [];
  let bullets = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-1.5 space-y-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
            <span className="text-[#91BE4D] font-bold mt-0.5 flex-shrink-0">•</span>
            <span>{parseBold(b)}</span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      elements.push(<div key={idx} className="h-1.5" />);
      return;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      bullets.push(trimmed.slice(2));
      return;
    }
    flushBullets();
    // Heading-style bold line: **...** as its own line
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(
        <p key={idx} className="font-bold text-gray-800 text-sm mt-3 mb-0.5">
          {trimmed.slice(2, -2)}
        </p>
      );
      return;
    }
    elements.push(
      <p key={idx} className="text-sm text-gray-700 leading-relaxed">
        {parseBold(trimmed)}
      </p>
    );
  });
  flushBullets();
  return <>{elements}</>;
}

// ── Coach avatar ──────────────────────────────────────────────────────────────
function CoachAvatar({ size = 'sm' }) {
  const sz = size === 'lg' ? 'w-12 h-12 text-2xl' : 'w-8 h-8 text-base';
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg, #2d7005 0%, #91BE4D 55%, #ec9937 100%)' }}
    >
      🤖
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Coach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]); // { role, content }
  const [input, setInput] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Generate the initial coaching report on mount
  useEffect(() => {
    let cancelled = false;
    setInitialLoading(true);
    api.getCoachInsight([])
      .then((res) => {
        if (cancelled) return;
        setMessages([{ role: 'assistant', content: res.data.data.reply }]);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load your coaching report. Please refresh the page.');
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || sending) return;

    const userMsg  = { role: 'user', content };
    const history  = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setSending(true);
    setError('');

    try {
      const res = await api.getCoachInsight(history.map((m) => ({ role: m.role, content: m.content })));
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.data.reply }]);
    } catch {
      setError('Could not get a response. Please try again.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 64px)' }}>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden px-5 py-5 sm:px-8 sm:py-6"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        <div className="relative flex items-center gap-4">
          <CoachAvatar size="lg" />
          <div>
            <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-0.5">Personal</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">AI Coach</h1>
            <p className="text-slate-300 text-xs mt-0.5">
              Insights & tips based on your sessions and tournaments
            </p>
          </div>
        </div>
      </div>

      {/* ── Messages area ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

          {/* Initial loading skeleton */}
          {initialLoading && (
            <div className="flex gap-3">
              <CoachAvatar />
              <div className="flex-1 bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm space-y-2">
                <div className="h-3 bg-gray-100 rounded-full w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-full w-full animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-full w-5/6 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-full w-2/3 animate-pulse" />
                <p className="text-xs text-gray-400 mt-2 animate-pulse">
                  Analysing your sessions and tournaments…
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !sending && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {msg.role === 'assistant' ? (
                <CoachAvatar />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}>
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}

              <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl shadow-sm ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-gray-100 rounded-tl-sm'
                    : 'text-white rounded-tr-sm'
                }`}
                style={msg.role === 'user' ? { background: 'linear-gradient(to right, #2d7005, #91BE4D)' } : {}}
              >
                {msg.role === 'assistant' ? (
                  <MarkdownBlock text={msg.content} />
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Sending indicator */}
          {sending && (
            <div className="flex gap-3">
              <CoachAvatar />
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#91BE4D] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#91BE4D] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#91BE4D] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ── Suggested questions ─────────────────────────────────────────────── */}
      {!initialLoading && messages.length < 3 && (
        <div className="border-t border-gray-100 bg-white">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-1 overflow-x-auto">
            <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={sending}
                  className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-[#91BE4D]/40 bg-[#f4f8e8] text-[#4a6e10] hover:bg-[#e9f3d5] transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 bg-white px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask your coach anything…"
            disabled={initialLoading || sending}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] disabled:bg-gray-50 disabled:text-gray-400 leading-relaxed"
            style={{ maxHeight: 120, overflowY: 'auto' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || initialLoading || sending}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
        <p className="max-w-2xl mx-auto text-[10px] text-gray-400 mt-1.5 px-1">
          AI insights are based on your logged sessions & tournaments. Always use your own judgment on the court.
        </p>
      </div>

    </div>
  );
}
