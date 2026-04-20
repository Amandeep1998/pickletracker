import React, { useState, useRef, useEffect } from 'react';

function ordinal(n) {
  const v = n % 100;
  const suffix = [, 'st', 'nd', 'rd'][v > 10 && v < 14 ? 0 : v % 10] || 'th';
  return `${n}${suffix}`;
}

function formatDisplay(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
  const month = date.toLocaleDateString(undefined, { month: 'long' });
  return `${weekday}, ${ordinal(d)} ${month} ${y}`;
}

function relativeLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const selected = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((selected - today) / 86400000);
  if (diff === 0)  return { text: 'Today',     style: 'text-blue-600 bg-blue-50' };
  if (diff === 1)  return { text: 'Tomorrow',  style: 'text-green-700 bg-green-50' };
  if (diff === -1) return { text: 'Yesterday', style: 'text-gray-500 bg-gray-100' };
  if (diff > 0)    return { text: `In ${diff} day${diff !== 1 ? 's' : ''}`,               style: 'text-green-700 bg-green-50' };
  return           { text: `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} ago`, style: 'text-gray-500 bg-gray-100' };
}

function calendarDays(year, month) {
  const firstDow = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDow).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  return cells;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function DatePicker({ value, onChange, error }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDate = new Date();

  const initYear  = value ? +value.split('-')[0] : todayDate.getFullYear();
  const initMonth = value ? +value.split('-')[1] - 1 : todayDate.getMonth();

  const [open, setOpen]         = useState(false);
  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [openAbove, setOpenAbove] = useState(false);
  const containerRef = useRef(null);
  // Tracks whether the current click gesture actually started (pointerdown) on
  // this trigger. When a SearchableSelect option directly above this date
  // field closes on pointerdown, the synthesized click fires at the same
  // coordinates and lands on this trigger — without that click, the trigger
  // used to auto-open. Gating `toggleOpen` on a real local pointerdown fixes
  // it without interfering with clicks that originate here.
  const pointerStartedHere = useRef(false);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      setViewYear(+value.split('-')[0]);
      setViewMonth(+value.split('-')[1] - 1);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, [open]);

  const toggleOpen = () => {
    if (open) { setOpen(false); return; }
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setOpenAbove(window.innerHeight - rect.bottom < 320 && rect.top > 320);
    setOpen(true);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewMonth((m) => { if (m === 0) { setViewYear((y) => y - 1); return 11; } return m - 1; });
  };
  const nextMonth = (e) => {
    e.stopPropagation();
    setViewMonth((m) => { if (m === 11) { setViewYear((y) => y + 1); return 0; } return m + 1; });
  };

  const selectDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const cells     = calendarDays(viewYear, viewMonth);
  const relative  = value ? relativeLabel(value) : null;
  const selDay    = value && +value.split('-')[0] === viewYear && +value.split('-')[1] - 1 === viewMonth
    ? +value.split('-')[2] : null;
  const todayDay  = todayDate.getFullYear() === viewYear && todayDate.getMonth() === viewMonth
    ? todayDate.getDate() : null;

  return (
    <div ref={containerRef} className="relative">

      {/* Trigger row */}
      <div
        onPointerDown={() => { pointerStartedHere.current = true; }}
        onClick={() => {
          // Ignore stray synthesized clicks whose gesture started somewhere else
          // (e.g. a closing SearchableSelect option directly above this field).
          if (!pointerStartedHere.current) return;
          pointerStartedHere.current = false;
          toggleOpen();
        }}
        className={`flex items-center justify-between border rounded px-3 py-2.5 bg-white cursor-pointer hover:border-[#91BE4D] transition-colors group ${
          error ? 'border-red-400' : open ? 'border-[#91BE4D] ring-2 ring-[#91BE4D]/20' : 'border-gray-300'
        }`}
      >
        <div className="flex-1 min-w-0 select-none">
          {value ? (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs sm:text-sm font-semibold text-gray-800">{formatDisplay(value)}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${relative.style}`}>
                {relative.text}
              </span>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-gray-400">Tap to select a date</p>
          )}
        </div>
        <span className="ml-3 flex-shrink-0 text-xs font-semibold text-[#4a6e10] group-hover:text-[#2d7005] border border-[#91BE4D]/40 group-hover:border-[#91BE4D] px-2 py-0.5 rounded transition-colors select-none">
          {value ? 'Change' : 'Select'}
        </span>
      </div>

      {/* Calendar popover */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 ${
            openAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {/* Month / year nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button" onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-bold text-gray-800">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button
              type="button" onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`_${i}`} />;
              const isSel   = day === selDay;
              const isToday = day === todayDay;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-9 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    isSel   ? 'bg-[#4a6e10] text-white font-bold shadow-sm' :
                    isToday ? 'bg-[#91BE4D]/20 text-[#4a6e10] font-bold' :
                              'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => { onChange(todayStr); setOpen(false); }}
              className="text-xs font-semibold text-[#4a6e10] hover:text-[#2d7005] transition-colors py-0.5"
            >
              Jump to Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
