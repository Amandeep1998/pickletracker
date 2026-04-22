import React from 'react';

export default function PaddleLoader({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div className="relative w-12 h-12" aria-hidden="true">
        <div className="absolute inset-[-5px] rounded-xl border border-[#91BE4D]/30 border-t-[#ec9937] animate-spin" />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#1c350a] via-[#2d6e05] to-[#a86010] shadow-[0_6px_14px_rgba(28,53,10,0.2)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-black text-xs tracking-wide select-none">PT</span>
        </div>
        <div className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-[#c8e875] animate-pulse" />
      </div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  );
}
