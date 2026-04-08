export const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount ?? 0);

export const CATEGORIES = [
  "Men's Singles Open",
  "Women's Singles",
  "Men's Doubles Open",
  "Women's Doubles",
  "Mixed Doubles",

  "Beginner Singles",
  "Beginner Doubles",
  "Intermediate Singles",
  "Intermediate Doubles",

  "Advanced Men's Singles",
  "Advanced Men's Doubles",

  "35+ Men's Singles",
  "35+ Men's Doubles",
  "35+ Women's Singles",
  "35+ Women's Doubles",
  "35+ Mixed Doubles",

  "50+ Men's Singles",
  "50+ Men's Doubles",
  "50+ Women's Singles",
  "50+ Women's Doubles",
  "50+ Mixed Doubles",

  "Split Age 35+",
  "Split Age 40+",
  "Split Age 50+",

  "Men's Singles 60+",
  "Men's Doubles 60+",

  "Team Event",
];

export const MEDALS = ['None', 'Gold', 'Silver', 'Bronze'];

export const MEDAL_COLORS = {
  Gold: 'text-yellow-600 bg-yellow-50',
  Silver: 'text-gray-500 bg-gray-100',
  Bronze: 'text-orange-600 bg-orange-50',
  None: 'text-gray-400 bg-gray-50',
};
