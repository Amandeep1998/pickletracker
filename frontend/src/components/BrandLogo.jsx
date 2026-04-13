/**
 * PickleTracker brand logo.
 * Gradient "PT" badge + two-tone wordmark.
 * size: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */

const SIZES = {
  sm:   { badge: 'text-xs px-2 py-0.5 rounded',    text: 'text-base tracking-tight', gap: 'gap-1.5' },
  md:   { badge: 'text-sm px-2.5 py-1 rounded-md', text: 'text-lg  tracking-tight', gap: 'gap-2'   },
  lg:   { badge: 'text-sm px-2.5 py-1 rounded-md', text: 'text-xl  tracking-tight', gap: 'gap-2'   },
  xl:   { badge: 'text-base px-3 py-1 rounded-lg', text: 'text-2xl tracking-tight', gap: 'gap-2.5' },
  '2xl':{ badge: 'text-lg px-3 py-1.5 rounded-lg', text: 'text-3xl tracking-tight', gap: 'gap-3'   },
};

export default function BrandLogo({ size = 'md' }) {
  const { badge, text, gap } = SIZES[size] ?? SIZES.md;

  return (
    <span className={`inline-flex items-center ${gap} select-none`}>
      {/* Gradient badge */}
      <span
        className={`inline-flex items-center justify-center font-black text-white leading-none ${badge}`}
        style={{ background: 'linear-gradient(135deg, #91BE4D 0%, #ec9937 100%)' }}
      >
        PT
      </span>

      {/* Wordmark */}
      <span className={`font-extrabold leading-none ${text}`}>
        <span className="text-[#91BE4D]">Pickle</span>
        <span className="text-[#ec9937]">Tracker</span>
      </span>
    </span>
  );
}
