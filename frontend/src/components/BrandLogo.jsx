/**
 * PickleTracker wordmark.
 * Gradient sweep: deep green → brand green → saffron orange
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
    <span
      className={`font-black tracking-tight leading-none select-none ${sz}`}
      style={{
        background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      PickleTracker
    </span>
  );
}
