/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'ac-bg': '#121215',       // 斯普拉遁深色背景
        'ac-green': '#00E5FF',    // 電光藍
        'ac-orange': '#E3FF00',   // 螢光黃
        'ac-brown': '#1A1A1A',    // 極深灰
        'ac-border': '#333333',   // 邊框色
        'splat-pink': '#FF007A',  // 螢光粉紅
        'splat-blue': '#4500FF',  // 深藍墨水
        'ticket-bg': '#F8F9FA',   // 機票紙張白
      },
      boxShadow: {
        'zakka': '4px 4px 0px rgba(255, 255, 255, 0.1)', 
        'splat-yellow': '4px 4px 0px #E3FF00',
        'splat-pink': '4px 4px 0px #FF007A',
        'splat-blue': '4px 4px 0px #00E5FF',
        'zakka-active': '2px 2px 0px rgba(0, 0, 0, 0.2)', // 修正 Vercel 報錯：定義此類名
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

