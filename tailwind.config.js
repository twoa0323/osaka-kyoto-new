/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-red': '#8D2B2B',
        'bg-creme': '#EBE7DE',
        'text-dark': '#1F1F1F',
        'text-mid': '#595755',
        'text-muted': '#787570',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Noto Serif TC"', 'serif'],
      }
    },
  },
  plugins: [],
}