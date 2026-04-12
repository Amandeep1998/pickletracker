import React, { useState, useRef, useCallback } from 'react';
import { parseTournamentVoice } from '../services/api';

// status: 'idle' | 'recording' | 'processing' | 'clarifying'

export default function VoiceInput({ onFill, currentForm }) {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [ambiguities, setAmbiguities] = useState([]);
  const [ambiguityIdx, setAmbiguityIdx] = useState(0);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const finalTextRef = useRef('');
  // Mirrors status in a ref so event handlers (onend/onerror) always see the
  // latest value without stale-closure issues.
  const statusRef = useRef('idle');

  // ── Recording ──────────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    setError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    // Use continuous=false + manual restart via onend.
    // continuous=true on mobile causes silent restarts where event.resultIndex
    // resets to 0 while event.results still holds old data, duplicating text.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    finalTextRef.current = '';
    setTranscript('');
    setInterimText('');
    statusRef.current = 'recording';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTextRef.current += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTextRef.current);
      setInterimText(interim);
    };

    // When a speech segment ends, restart if the user hasn't pressed Stop.
    recognition.onend = () => {
      setInterimText('');
      if (statusRef.current === 'recording') {
        try { recognition.start(); } catch { /* already restarting */ }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow microphone access and try again.');
        statusRef.current = 'idle';
        setStatus('idle');
      } else if (event.error !== 'no-speech') {
        setError(`Recognition error: ${event.error}. Please try again.`);
        statusRef.current = 'idle';
        setStatus('idle');
      }
      // no-speech is fine — onend will restart automatically
    };

    recognition.start();
    recognitionRef.current = recognition;
    setStatus('recording');
  }, []);

  const stopAndProcess = useCallback(async () => {
    // Set statusRef first so onend doesn't restart after we call .stop()
    statusRef.current = 'processing';
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const fullTranscript = (finalTextRef.current + interimText).trim();
    setInterimText('');

    if (!fullTranscript) {
      setError('No speech detected. Please try again.');
      statusRef.current = 'idle';
      setStatus('idle');
      return;
    }

    setTranscript(fullTranscript);
    setStatus('processing');

    try {
      const response = await parseTournamentVoice(fullTranscript, currentForm);
      const data = response.data.data;

      if (!data.categories || data.categories.length === 0) {
        if (!data.name && !data.locationQuery) {
          setError("Couldn't extract any tournament details. Please try speaking more clearly.");
          statusRef.current = 'idle';
          setStatus('idle');
          return;
        }
      }

      if (data.ambiguities && data.ambiguities.length > 0) {
        setParsedData(data);
        setAmbiguities(data.ambiguities);
        setAmbiguityIdx(0);
        statusRef.current = 'clarifying';
        setStatus('clarifying');
      } else {
        onFill(data);
        resetToIdle();
      }
    } catch {
      setError('Failed to process voice input. Please check your connection and try again.');
      statusRef.current = 'idle';
      setStatus('idle');
    }
  }, [interimText, onFill]);

  const cancelRecording = useCallback(() => {
    // Set statusRef first so onend doesn't restart
    statusRef.current = 'idle';
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    resetToIdle();
  }, []);

  const resetToIdle = () => {
    statusRef.current = 'idle';
    setStatus('idle');
    setTranscript('');
    setInterimText('');
    setParsedData(null);
    setAmbiguities([]);
    setAmbiguityIdx(0);
    finalTextRef.current = '';
  };

  // ── Clarification ──────────────────────────────────────────────────────────

  const applyAmbiguityAnswer = (option) => {
    const ambiguity = ambiguities[ambiguityIdx];
    const updatedData = {
      ...parsedData,
      categories: parsedData.categories.map((cat, i) => {
        if (i !== ambiguity.categoryIndex) return cat;
        return { ...cat, [ambiguity.field]: option };
      }),
    };
    setParsedData(updatedData);
    advanceAmbiguity(updatedData);
  };

  const skipAmbiguity = () => {
    advanceAmbiguity(parsedData);
  };

  const advanceAmbiguity = (currentData) => {
    const next = ambiguityIdx + 1;
    if (next < ambiguities.length) {
      setAmbiguityIdx(next);
    } else {
      onFill(currentData);
      resetToIdle();
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const currentAmbiguity = ambiguities[ambiguityIdx];

  return (
    <div className="w-full">

      {/* ── Clarification overlay — covers the whole form (positioned on <form> via relative) */}
      {status === 'clarifying' && currentAmbiguity && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 rounded-xl backdrop-blur-sm">
          <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-5 mx-2 w-full max-w-sm">
            {/* Progress */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#91BE4D] uppercase tracking-wide">
                AI needs clarification
              </span>
              <span className="text-xs text-gray-400">
                {ambiguityIdx + 1} of {ambiguities.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-1 mb-4">
              <div
                className="bg-[#91BE4D] h-1 rounded-full transition-all duration-300"
                style={{ width: `${((ambiguityIdx + 1) / ambiguities.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <p className="text-sm font-medium text-gray-800 mb-4 leading-snug">
              {currentAmbiguity.question}
            </p>

            {/* Options */}
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

            {/* Skip */}
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

      {/* ── Main voice panel ──────────────────────────────────────────────── */}
      {status === 'idle' && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#91BE4D] text-[#4a6e10] bg-[#91BE4D]/8 hover:bg-[#91BE4D]/15 font-semibold text-sm transition-colors"
          >
            <MicIcon className="w-4 h-4" />
            Fill with Voice (AI)
          </button>
          {error && (
            <p className="text-xs text-red-500 text-center max-w-xs">{error}</p>
          )}
        </div>
      )}

      {status === 'recording' && (
        <div className="border-2 border-red-300 bg-red-50 rounded-xl p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm font-semibold text-red-700">Listening...</span>
            </div>
            <button
              type="button"
              onClick={cancelRecording}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Live transcript */}
          <div className="min-h-[52px] bg-white border border-red-200 rounded-lg px-3 py-2 text-sm text-gray-700 leading-relaxed">
            {transcript || interimText ? (
              <span>
                <span className="text-gray-800">{transcript}</span>
                <span className="text-gray-400 italic">{interimText}</span>
              </span>
            ) : (
              <span className="text-gray-400 italic text-xs">
                Start speaking naturally — just describe your tournament
              </span>
            )}
          </div>

          {/* Hint */}
          <div className="bg-white border border-red-100 rounded-lg px-3 py-2.5 space-y-3">

            {/* Examples */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Examples</p>

              <div className="space-y-1">
                <p className="text-xs text-gray-400 font-medium">Past tournament:</p>
                <p className="text-xs text-gray-700 italic leading-relaxed">"I played Pune Open. Men's doubles on April 17. Entry fee was 700. I won gold and got 2000."</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-400 font-medium">Upcoming tournament:</p>
                <p className="text-xs text-gray-700 italic leading-relaxed">"I'm playing in Mumbai Pickleball League. Mixed doubles on May 10. Entry fee is 800."</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-400 font-medium">Short and casual:</p>
                <p className="text-xs text-gray-700 italic leading-relaxed">"I played Hyderabad tournament yesterday. Doubles. Entry was 500. Didn't win anything."</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-400 font-medium">Multiple categories:</p>
                <p className="text-xs text-gray-700 italic leading-relaxed">"I played Delhi Open. Men's singles on April 20, entry 600, won gold, got 3000. Another category I played was mixed doubles on April 21, entry 500, didn't win."</p>
              </div>
            </div>

            {/* Multi-session tip */}
            <p className="text-xs text-gray-500 border-t border-gray-100 pt-2">
              You can speak in parts — stop and speak again to add more details. Say{' '}
              <span className="font-semibold text-gray-600">"another category I played was…"</span> to add a second category.
            </p>

            {/* You can mention */}
            <div className="border-t border-gray-100 pt-2 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">You can mention</p>
              <div className="space-y-1.5">
                {[
                  ['🏸', 'Tournament', 'Pune Open, Delhi Open, Bangalore League'],
                  ['👥', 'Category', "Men's singles, men's doubles, mixed doubles"],
                  ['📅', 'Date', 'April 20, tomorrow, yesterday'],
                  ['💰', 'Entry fee', '500, 700, 1000'],
                  ['🏆', 'Result', 'Won gold, got silver, didn\'t win anything'],
                ].map(([icon, label, eg]) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-xs mt-0.5">{icon}</span>
                    <div>
                      <span className="text-xs font-medium text-gray-600">{label}: </span>
                      <span className="text-xs text-gray-400">{eg}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">
              Speak in simple English — no need to be perfect 👍
            </p>
          </div>

          {/* Stop button */}
          <button
            type="button"
            onClick={stopAndProcess}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-sm transition-colors"
          >
            Stop & Process
          </button>
        </div>
      )}

      {status === 'processing' && (
        <div className="border-2 border-[#91BE4D]/40 bg-[#91BE4D]/5 rounded-xl p-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <SpinnerIcon className="w-5 h-5 text-[#91BE4D] animate-spin" />
            <span className="text-sm font-semibold text-[#4a6e10]">AI is processing your voice...</span>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Extracting tournament details from your description
          </p>
        </div>
      )}
    </div>
  );
}

// ── Inline SVG icons ───────────────────────────────────────────────────────────

function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
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
