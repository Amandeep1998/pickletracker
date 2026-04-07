export const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount ?? 0);

export const CATEGORIES = [
  "Men's Singles",
  "Women's Singles",
  "Men's Doubles",
  "Women's Doubles",
  'Mixed Doubles',
  'Beginner Singles',
  'Beginner Doubles',
  'Intermediate Singles',
  'Intermediate Doubles',
  'Open Category',
  'Senior (35+, 50+)',
  'Team Event',
];

export const MEDALS = ['None', 'Gold', 'Silver', 'Bronze'];

export const MEDAL_COLORS = {
  Gold: 'text-yellow-600 bg-yellow-50',
  Silver: 'text-gray-500 bg-gray-100',
  Bronze: 'text-orange-600 bg-orange-50',
  None: 'text-gray-400 bg-gray-50',
};
