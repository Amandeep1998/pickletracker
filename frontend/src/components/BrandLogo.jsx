/**
 * PickleTracker text wordmark.
 * "Pickle" = Indian green, "Tracker" = Indian saffron.
 * Pass `size` to control scale: 'sm' | 'md' | 'lg' | 'xl'
 */
export default function BrandLogo({ size = 'md' }) {
  const sz = {
    sm:  'text-lg  tracking-tight',
    md:  'text-xl  tracking-tight',
    lg:  'text-2xl tracking-tight',
    xl:  'text-3xl tracking-tight',
    '2xl': 'text-4xl tracking-tight',
  }[size] ?? 'text-xl tracking-tight';

  return (
    <span className={`font-extrabold select-none ${sz}`}>
      <span className="text-[#91BE4D]">Pickle</span>
      <span className="text-[#ec9937]">Tracker</span>
    </span>
  );
}
