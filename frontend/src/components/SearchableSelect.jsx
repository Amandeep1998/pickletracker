import React, { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({ options, value, onChange, placeholder = 'Select category' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on query
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  // Calculate fixed position for dropdown so it's never clipped by overflow:hidden/auto parents
  const openDropdown = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = Math.min(192, filteredOptions.length * 36 + 8); // ~max-h-48
      const openUpward = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight;
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
    setIsOpen(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Recompute position on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = Math.min(192, filteredOptions.length * 36 + 8);
        const openUpward = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight;
        setDropdownStyle((prev) => ({
          ...prev,
          left: rect.left,
          width: rect.width,
          ...(openUpward
            ? { bottom: window.innerHeight - rect.top + 4, top: undefined }
            : { top: rect.bottom + 4, bottom: undefined }),
        }));
      }
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen, filteredOptions.length]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') openDropdown();
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % Math.max(filteredOptions.length, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + Math.max(filteredOptions.length, 1)) % Math.max(filteredOptions.length, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions.length > 0) handleSelect(filteredOptions[highlightedIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? query : value || ''}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={openDropdown}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        autoComplete="off"
      />

      {/* Dropdown — rendered with fixed positioning, never clipped */}
      {isOpen && (
        <div
          style={dropdownStyle}
          className="bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                key={option}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(option); }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-3 py-2 text-xs sm:text-sm transition ${
                  index === highlightedIndex
                    ? 'bg-green-100 text-green-900'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs sm:text-sm text-gray-500">No categories found</div>
          )}
        </div>
      )}
    </div>
  );
}
