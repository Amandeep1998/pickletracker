import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// True on any device that has a coarse pointer (finger) as primary input
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

export default function SearchableSelect({ options, value, onChange, placeholder = 'Select category' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [useSheet, setUseSheet] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const sheetInputRef = useRef(null);
  const pointerDownPos = useRef(null);

  const normalize = (s) => s.toLowerCase().replace(/['\u2018\u2019]/g, '');
  const filteredOptions = options.filter((opt) =>
    normalize(opt).includes(normalize(query))
  );

  // ── Positioning (desktop only) ─────────────────────────────
  const computeStyle = useCallback(() => {
    if (!containerRef.current) return {};
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(240, filteredOptions.length * 44 + 8);
    const openUpward = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight;
    return {
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    };
  }, [filteredOptions.length]);

  const openDropdown = () => {
    const touch = isTouchDevice();
    setUseSheet(touch);
    setQuery('');
    setHighlightedIndex(0);
    if (!touch) setDropdownStyle(computeStyle());
    setIsOpen(true);
    if (touch) {
      setTimeout(() => sheetInputRef.current?.focus(), 100);
    } else {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery('');
  };

  // ── Outside-click to close (desktop popover only) ──────────
  useEffect(() => {
    if (!isOpen || useSheet) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeDropdown();
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [isOpen, useSheet]);

  // ── Reposition desktop popover on scroll/resize ────────────
  useEffect(() => {
    if (!isOpen || useSheet) return;
    const reposition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = Math.min(240, filteredOptions.length * 44 + 8);
      const openUpward = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight;
      setDropdownStyle((prev) => ({
        ...prev,
        left: rect.left,
        width: rect.width,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4, top: undefined }
          : { top: rect.bottom + 4, bottom: undefined }),
      }));
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen, useSheet, filteredOptions.length]);

  useEffect(() => { setHighlightedIndex(0); }, [query]);

  // ── Keyboard nav (desktop) ─────────────────────────────────
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((p) => (p + 1) % Math.max(filteredOptions.length, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((p) => (p - 1 + Math.max(filteredOptions.length, 1)) % Math.max(filteredOptions.length, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions.length > 0) handleSelect(filteredOptions[highlightedIndex]);
        break;
      case 'Escape':
        closeDropdown();
        inputRef.current?.blur();
        break;
      default: break;
    }
  };

  const handleSelect = (option) => {
    onChange(option);
    closeDropdown();
    inputRef.current?.blur();
  };

  // ── Trigger: open only on genuine tap (not scroll) ─────────
  const handleTriggerPointerDown = (e) => {
    if (isOpen) return;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleTriggerPointerUp = (e) => {
    if (isOpen || !pointerDownPos.current) return;
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    pointerDownPos.current = null;
    if (dx > 8 || dy > 8) return;
    e.preventDefault();
    openDropdown();
  };

  // ── Option list (shared by popover + sheet) ────────────────
  const OptionList = () => (
    filteredOptions.length > 0 ? (
      filteredOptions.map((option, index) => (
        <button
          key={option}
          type="button"
          // onClick fires only after a genuine tap — scroll gestures never trigger it
          onClick={() => handleSelect(option)}
          onMouseEnter={() => setHighlightedIndex(index)}
          className={`w-full text-left px-4 py-3.5 text-sm transition-colors border-b border-gray-50 last:border-0 ${
            index === highlightedIndex
              ? 'bg-green-50 text-green-900'
              : 'text-gray-700 active:bg-gray-100'
          } ${value === option ? 'font-semibold' : ''}`}
        >
          {option}
        </button>
      ))
    ) : (
      <div className="px-4 py-6 text-sm text-gray-400 text-center">No categories found</div>
    )
  );

  return (
    <div ref={containerRef} className="relative w-full">

      {/* ── Trigger ─────────────────────────────────────────── */}
      <div
        onPointerDown={handleTriggerPointerDown}
        onPointerUp={handleTriggerPointerUp}
        className={`w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm cursor-pointer select-none flex items-center justify-between ${
          isOpen ? 'border-green-500 ring-2 ring-green-500' : 'border-gray-300'
        } ${value ? 'text-gray-900' : 'text-gray-400'}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <svg
          className={`w-4 h-4 flex-shrink-0 ml-1 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── Desktop popover ──────────────────────────────────── */}
      {isOpen && !useSheet && (
        <div
          style={dropdownStyle}
          className="bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden"
        >
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
            <OptionList />
          </div>
        </div>
      )}

      {/* ── Mobile bottom sheet (via portal) ────────────────── */}
      {isOpen && useSheet && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onPointerDown={closeDropdown} />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-2xl flex flex-col max-h-[75vh]">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
              <p className="text-sm font-semibold text-gray-800">Select Category</p>
              <button
                type="button"
                onPointerDown={(e) => { e.stopPropagation(); closeDropdown(); }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3 flex-shrink-0">
              <input
                ref={sheetInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories…"
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Options — scrollable, touch-friendly */}
            <div className="overflow-y-auto overscroll-contain flex-1 pb-6">
              <OptionList />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
