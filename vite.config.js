import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Travel Planner 手帳',
        short_name: 'Travel Plan',
        description: '你的動森風旅遊計畫手帳',
        theme_color: '#328383', // 對應我們設定的背景色
        background_color: '#F7F4EB',
        display: 'standalone', // 隱藏瀏覽器網址列
        orientation: 'portrait',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3125/3125848.png', // 暫時使用網路圖示，正式版請換成本地圖檔
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3125/3125848.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})