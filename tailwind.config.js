/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'ac-bg': '#F7F4EB',       // 米色背景
        'ac-green': '#7EAB83',    // 動森綠
        'ac-orange': '#E9A178',   // 大地橘
        'ac-brown': '#8D775F',    // 文字深啡
        'ac-border': '#E0E5D5',   // 陰影/邊框色
      },
      boxShadow: {
        'zakka': '4px 4px 0px #E0E5D5', // 你要求的硬質軟陰影
        'zakka-active': '2px 2px 0px #E0E5D5',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};