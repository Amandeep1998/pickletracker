/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        'cell-breathe': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(145, 190, 77, 0.35)',
          },
          '50%': {
            transform: 'scale(1.06)',
            boxShadow: '0 8px 22px -6px rgba(145, 190, 77, 0.55)',
          },
        },
      },
      animation: {
        'cell-breathe': 'cell-breathe 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
