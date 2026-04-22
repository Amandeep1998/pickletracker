import React from 'react';

export default function PaddleLoader({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative w-24 h-16" aria-hidden="true">
        <div className="absolute left-1 top-6 w-8 h-8 rounded-full bg-[#C8D636] border-2 border-[#91BE4D] animate-loader-ball" />
        <div className="absolute right-0 top-1 w-14 h-14 animate-loader-paddle origin-bottom-right">
          <div className="absolute left-2 top-0 w-10 h-8 rounded-[55%_55%_45%_45%] bg-[#b97a3f] border-2 border-[#8f5b2d]" />
          <div className="absolute left-0 top-6 w-7 h-2 rounded-full bg-[#7a4a24] rotate-[-30deg]" />
        </div>
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </div>
  );
}
