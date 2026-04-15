import React, { useState, useRef } from 'react';
import posthog from 'posthog-js';
import { parseFromFile } from '../services/api';

// status: 'idle' | 'loading' | 'clarifying'

export default function DocumentInput({ onFill, currentForm }) {
  const [status, setStatus] = useState('idle');
  const [loadingLabel, setLoadingLabel] = useState('');
  const [error, setError] = useState('');
  const [ambiguities, setAmbiguities] = useState([]);
  const [ambiguityIdx, setAmbiguityIdx] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const fileInputRef = useRef(null);
  const screenshotInputRef = useRef(null);

  // ── Shared post-parse handler ─────────────────────────────────────────────

  const handleParsed = (data) => {
    if (data.ambiguities && data.ambiguities.length > 0) {
      setParsedData(data);
      setAmbiguities(data.ambiguities);
      setAmbiguityIdx(0);
      setStatus('clarifying');
    } else {
      onFill(data);
      setStatus('idle');
    }
  };

  // ── File / screenshot upload ──────────────────────────────────────────────

  const handleFileChange = async (e, isPdf) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setError('');
    setLoadingLabel(isPdf ? 'Reading PDF…' : 'Analysing screenshot…');
    setStatus('loading');

    try {
      const res = await parseFromFile(file, currentForm);
      posthog.capture('pdf_upload_used', { type: isPdf ? 'pdf' : 'screenshot' });
      handleParsed(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not read this file. Please try again.');
      setStatus('idle');
    }
  };

  // ── Clarification ─────────────────────────────────────────────────────────

  const applyAmbiguityAnswer = (option) => {
    const ambiguity = ambiguities[ambiguityIdx];
    const updatedData = {
      ...parsedData,
      categories: parsedData.categories.map((cat, i) =>
        i !== ambiguity.categoryIndex ? cat : { ...cat, [ambiguity.field]: option }
      ),
    };
    setParsedData(updatedData);
    advanceAmbiguity(updatedData);
  };

  const skipAmbiguity = () => advanceAmbiguity(parsedData);

  const advanceAmbiguity = (currentData) => {
    const next = ambiguityIdx + 1;
    if (next < ambiguities.length) {
      setAmbiguityIdx(next);
    } else {
      onFill(currentData);
      setStatus('idle');
      setParsedData(null);
      setAmbiguities([]);
      setAmbiguityIdx(0);
    }
  };

  const currentAmbiguity = ambiguities[ambiguityIdx];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">

      {/* ── Clarification overlay ─────────────────────────────────────────── */}
      {status === 'clarifying' && currentAmbiguity && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 rounded-xl backdrop-blur-sm">
          <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-5 mx-2 w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#91BE4D] uppercase tracking-wide">
                AI needs clarification
              </span>
              <span className="text-xs text-gray-400">
                {ambiguityIdx + 1} of {ambiguities.length}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1 mb-4">
              <div
                className="bg-[#91BE4D] h-1 rounded-full transition-all duration-300"
                style={{ width: `${((ambiguityIdx + 1) / ambiguities.length) * 100}%` }}
              />
            </div>
            <p className="text-sm font-medium text-gray-800 mb-4 leading-snug">
              {currentAmbiguity.question}
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {currentAmbiguity.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => applyAmbiguityAnswer(opt)}
                  className="w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-[#91BE4D] hover:bg-[#91BE4D]/5 hover:text-[#4a6e10] font-medium transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={skipAmbiguity}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              Skip — leave this field blank
            </button>
          </div>
        </div>
      )}

      {/* ── Idle: upload buttons ──────────────────────────────────────────── */}
      {status === 'idle' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 border-2 border-dashed border-gray-300 hover:border-[#91BE4D] hover:bg-[#91BE4D]/5 rounded-lg px-3 py-3 text-center transition-colors"
          >
            <PdfIcon className="w-5 h-5 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">Upload PDF</span>
            <span className="text-xs text-gray-400">Used to prefill form</span>
          </button>

          <button
            type="button"
            onClick={() => screenshotInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 border-2 border-dashed border-gray-300 hover:border-[#91BE4D] hover:bg-[#91BE4D]/5 rounded-lg px-3 py-3 text-center transition-colors"
          >
            <ImageIcon className="w-5 h-5 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">Upload Screenshot</span>
            <span className="text-xs text-gray-400">Used to prefill form</span>
          </button>

          {error && (
            <p className="col-span-2 text-xs text-red-600 text-center">{error}</p>
          )}

          <p className="col-span-2 text-xs text-gray-400 text-center">
            Not stored — only used to fill this form.
          </p>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {status === 'loading' && (
        <div className="border-2 border-[#91BE4D]/40 bg-[#91BE4D]/5 rounded-xl p-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <SpinnerIcon className="w-5 h-5 text-[#91BE4D] animate-spin" />
            <span className="text-sm font-semibold text-[#4a6e10]">{loadingLabel}</span>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Extracting tournament details — this takes a few seconds
          </p>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFileChange(e, true)}
      />
      <input
        ref={screenshotInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileChange(e, false)}
      />
    </div>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function PdfIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ImageIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function SpinnerIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
