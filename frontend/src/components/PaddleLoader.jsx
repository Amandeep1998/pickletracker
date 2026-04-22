import React from 'react';

export default function PaddleLoader({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative w-20 h-20" aria-hidden="true">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#1c350a] via-[#2d6e05] to-[#a86010] shadow-[0_10px_24px_rgba(28,53,10,0.28)]" />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/15" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-black text-xl tracking-tight select-none">PT</span>
        </div>
        <div className="absolute inset-[-8px] rounded-[20px] border border-[#91BE4D]/35 border-t-[#ec9937] animate-spin" />
        <div className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-[#c8e875] shadow-[0_0_0_3px_rgba(200,232,117,0.2)] animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 font-semibold">{label}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">PickleTracker</p>
      </div>
    </div>
  );
}
