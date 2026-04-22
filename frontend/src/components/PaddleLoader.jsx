import React from 'react';

export default function PaddleLoader({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative w-20 h-20" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border-2 border-[#91BE4D]/25 border-t-[#91BE4D] border-r-[#ec9937] animate-spin" />
        <div className="absolute inset-[7px] rounded-full bg-gradient-to-br from-[#1c350a] via-[#2d6e05] to-[#a86010] shadow-[0_8px_20px_rgba(28,53,10,0.25)]" />
        <div className="absolute inset-[7px] flex items-center justify-center">
          <svg className="w-8 h-8 text-white/95" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <ellipse cx="13.5" cy="8.5" rx="4.8" ry="3.2" />
            <path d="M10 11.2l-3 4.8a1.5 1.5 0 102.54 1.58L12.4 13" />
            <circle cx="7.1" cy="7.2" r="1.4" fill="#c8e875" stroke="#c8e875" />
          </svg>
        </div>
        <div className="absolute -right-0.5 top-2.5 w-2.5 h-2.5 rounded-full bg-[#c8e875] animate-pulse" />
        <div className="absolute inset-0 rounded-full ring-1 ring-white/15" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 font-semibold">{label}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">PickleTracker</p>
      </div>
    </div>
  );
}
