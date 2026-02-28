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
        // 💎 Liquid Glass Luxury: P3 Wide Color Gamut
        'p3-navy': 'var(--p3-navy)',
        'p3-ruby': 'var(--p3-ruby)',
        'p3-gold': 'var(--p3-gold)',
      },
      boxShadow: {
        // 斯普拉遁風格 (Legacy)
        'splat-solid': '4px 4px 0px #1A1A1A',
        'splat-solid-sm': '2px 2px 0px #1A1A1A',
        // 💎 Apple Style: Layered Soft Shadows
        'glass-soft': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'glass-deep': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'glass-border': 'inset 0 0 0 0.5px rgba(255, 255, 255, 0.4)',
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
        black: ['"Kosugi Maru"', '"Noto Sans TC"', 'sans-serif'],
      }
    },
  },
  plugins: [],
};


