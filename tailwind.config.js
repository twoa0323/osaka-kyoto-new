/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'splat-bg': '#F4F5F7',      // 淺灰白紙張底色
        'splat-yellow': '#FFC000',  // 招牌亮黃色 (高飽和、非螢光)
        'splat-blue': '#2932CF',    // 深邃電光藍
        'splat-pink': '#F03C69',    // 墨水粉紅
        'splat-green': '#21CC65',   // 活力綠
        'splat-orange': '#FF6C00',  // 鮮豔橘
        'splat-dark': '#1A1A1A',    // 極深灰 (用於粗邊框與文字)
        'splat-light': '#FFFFFF',   // 純白 (用於卡片底)
      },
      boxShadow: {
        // 斯普拉遁風格的實色硬陰影
        'splat-solid': '4px 4px 0px #1A1A1A', 
        'splat-solid-sm': '2px 2px 0px #1A1A1A',
        'splat-active': '0px 0px 0px #1A1A1A', // 按下時的狀態
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
        black: ['"Kosugi Maru"', '"Noto Sans TC"', 'sans-serif'],
      }
    },
  },
  plugins: [],
};


