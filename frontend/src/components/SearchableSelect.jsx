import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function SearchableSelect({ options, value, onChange, placeholder = 'Select category' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const sheetInputRef = useRef(null);
  const openedAt = useRef(0); // tracks when the dropdown opened — blocks ghost clicks

  const mobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const normalize = (s) => s.toLowerCase().replace(/['\u2018\u2019]/g, '');
  const filtered = options.filter((opt) => normalize(opt).includes(normalize(query)));

  // ── open / close ────────────────────────────────────────────
  const open = () => {
    if (isOpen) return;
    setQuery('');
    setHighlightedIndex(0);
    openedAt.current = Date.now();

    if (!mobile && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const h = Math.min(240, options.length * 44 + 8);
      const up = spaceBelow < h + 8 && rect.top > h;
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      // slight delay so the sheet renders before we focus (avoids layout thrash)
      setTimeout(() => sheetInputRef.current?.focus(), 200);
    }
    setIsOpen(true);
  };

  const close = () => { setIsOpen(false); setQuery(''); };

  const select = (opt) => {
    // Ignore if fired within 350 ms of opening — it's a ghost click from the tap that opened the sheet
    if (Date.now() - openedAt.current < 350) return;
    onChange(opt);
    close();
  };

  // ── desktop: close on outside click ─────────────────────────
  useEffect(() => {
    if (!isOpen || mobile) return;
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) close();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isOpen]);

  // ── desktop: reposition on scroll / resize ──────────────────
  useEffect(() => {
    if (!isOpen || mobile) return;
    const reposition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const h = Math.min(240, filtered.length * 44 + 8);
      const up = spaceBelow < h + 8 && rect.top > h;
      setDropdownStyle((prev) => ({
        ...prev,
        left: rect.left,
        width: rect.width,
        ...(up ? { bottom: window.innerHeight - rect.top + 4, top: undefined }
                : { top: rect.bottom + 4, bottom: undefined }),
      }));
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen, filtered.length]);

  useEffect(() => { setHighlightedIndex(0); }, [query]);

  // ── keyboard nav ─────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex((p) => (p + 1) % Math.max(filtered.length, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex((p) => (p - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered.length > 0) select(filtered[highlightedIndex]); }
    else if (e.key === 'Escape') { close(); inputRef.current?.blur(); }
  };

  // ── shared option rows ────────────────────────────────────────
  const renderOptions = (itemClass = '') =>
    filtered.length > 0
      ? filtered.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => select(opt)}
            onMouseEnter={() => setHighlightedIndex(i)}
            className={`w-full text-left px-4 py-3.5 text-sm border-b border-gray-50 last:border-0 transition-colors
              ${i === highlightedIndex ? 'bg-green-50 text-green-900' : 'text-gray-800 active:bg-gray-100'}
              ${value === opt ? 'font-semibold' : ''}
              ${itemClass}`}
          >
            {opt}
          </button>
        ))
      : <div className="px-4 py-6 text-sm text-gray-400 text-center">No categories found</div>;

  return (
    <div ref={containerRef} className="relative w-full">

      {/* ── Trigger ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={handleKeyDown}
        style={{ touchAction: 'manipulation' }}
        className={`w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm cursor-pointer select-none flex items-center justify-between ${
          isOpen ? 'border-green-500 ring-2 ring-green-500' : 'border-gray-300'
        } ${value ? 'text-gray-900' : 'text-gray-400'}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <svg className={`w-4 h-4 flex-shrink-0 ml-1 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── Desktop popover ── */}
      {isOpen && !mobile && (
        <div style={dropdownStyle} className="bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search…"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="max-h-52 overflow-y-auto overscroll-contain">
            {renderOptions()}
          </div>
        </div>
      )}

      {/* ── Mobile bottom sheet ── */}
      {isOpen && mobile && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={close} />

          {/* Sheet */}
          <div
            className="relative bg-white rounded-t-2xl flex flex-col"
            style={{ maxHeight: '78vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-2 pb-3 flex-shrink-0">
              <p className="text-base font-semibold text-gray-900">Select Category</p>
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search box */}
            <div className="px-4 pb-3 flex-shrink-0">
              <input
                ref={sheetInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search…"
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Scrollable options */}
            <div className="overflow-y-auto overscroll-contain flex-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
              {renderOptions()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
