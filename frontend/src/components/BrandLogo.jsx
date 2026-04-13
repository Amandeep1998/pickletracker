/**
 * PickleTracker wordmark.
 * "Pickle" = green · "Tracker" = orange/saffron
 * size: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */
const SIZES = {
  sm:    'text-base',
  md:    'text-lg',
  lg:    'text-xl',
  xl:    'text-2xl',
  '2xl': 'text-3xl',
};

export default function BrandLogo({ size = 'md' }) {
  const sz = SIZES[size] ?? SIZES.md;
  return (
    <span className={`font-extrabold tracking-tight leading-none select-none ${sz}`}>
      <span className="text-[#91BE4D]">Pickle</span>
      <span className="text-[#ec9937]">Tracker</span>
    </span>
  );
}
