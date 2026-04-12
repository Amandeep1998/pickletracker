export const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount ?? 0);

export const CATEGORIES = [
  // ── Open ──────────────────────────────────────────────────────────────────
  "Men's Singles Open",
  "Women's Singles",
  "Men's Doubles Open",
  "Women's Doubles",
  "Mixed Doubles",

  // ── Beginner ──────────────────────────────────────────────────────────────
  "Beginner Singles",
  "Beginner Men's Singles",
  "Beginner Women's Singles",
  "Beginner Doubles",
  "Beginner Men's Doubles",
  "Beginner Women's Doubles",
  "Beginner Mixed Doubles",

  // ── Intermediate ──────────────────────────────────────────────────────────
  "Intermediate Singles",
  "Intermediate Men's Singles",
  "Intermediate Women's Singles",
  "Intermediate Doubles",
  "Intermediate Men's Doubles",
  "Intermediate Women's Doubles",
  "Intermediate Mixed Doubles",

  // ── Advanced ──────────────────────────────────────────────────────────────
  "Advanced Men's Singles",
  "Advanced Women's Singles",
  "Advanced Men's Doubles",
  "Advanced Women's Doubles",
  "Advanced Mixed Doubles",

  // ── 35+ ───────────────────────────────────────────────────────────────────
  "35+ Men's Singles",
  "35+ Men's Doubles",
  "35+ Women's Singles",
  "35+ Women's Doubles",
  "35+ Mixed Doubles",

  // ── 40+ ───────────────────────────────────────────────────────────────────
  "40+ Men's Singles",
  "40+ Men's Doubles",
  "40+ Women's Singles",
  "40+ Women's Doubles",
  "40+ Mixed Doubles",

  // ── 45+ ───────────────────────────────────────────────────────────────────
  "45+ Men's Singles",
  "45+ Men's Doubles",
  "45+ Women's Singles",
  "45+ Women's Doubles",
  "45+ Mixed Doubles",

  // ── 50+ ───────────────────────────────────────────────────────────────────
  "50+ Men's Singles",
  "50+ Men's Doubles",
  "50+ Women's Singles",
  "50+ Women's Doubles",
  "50+ Mixed Doubles",

  // ── 55+ ───────────────────────────────────────────────────────────────────
  "55+ Men's Singles",
  "55+ Men's Doubles",
  "55+ Women's Singles",
  "55+ Women's Doubles",
  "55+ Mixed Doubles",

  // ── 60+ ───────────────────────────────────────────────────────────────────
  "Men's Singles 60+",
  "Men's Doubles 60+",
  "Women's Singles 60+",
  "Women's Doubles 60+",
  "Mixed Doubles 60+",

  // ── 65+ ───────────────────────────────────────────────────────────────────
  "Men's Singles 65+",
  "Men's Doubles 65+",
  "Women's Singles 65+",
  "Women's Doubles 65+",
  "Mixed Doubles 65+",

  // ── 70+ ───────────────────────────────────────────────────────────────────
  "Men's Singles 70+",
  "Men's Doubles 70+",
  "Women's Singles 70+",
  "Women's Doubles 70+",
  "Mixed Doubles 70+",

  // ── Split Age ─────────────────────────────────────────────────────────────
  "Split Age 35+",
  "Split Age 40+",
  "Split Age 50+",

  // ── Team ──────────────────────────────────────────────────────────────────
  "Team Event",
];

export const MEDALS = ['None', 'Gold', 'Silver', 'Bronze'];

export const MEDAL_COLORS = {
  Gold: 'text-yellow-600 bg-yellow-50',
  Silver: 'text-gray-500 bg-gray-100',
  Bronze: 'text-orange-600 bg-orange-50',
  None: 'text-gray-400 bg-gray-50',
};
