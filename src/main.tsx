import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'
import { registerSW } from 'virtual:pwa-register'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

registerSW({ immediate: true })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 分鐘快取效期
      refetchOnWindowFocus: false, // 視窗聚焦不強制重整，減少不必要的請求
    },
  },
})

// 移除 React.StrictMode：framer-motion v12 的 useMemo 在 StrictMode 雙重渲染
// 搭配 Zustand IndexedDB hydration 時會觸發 React #310 (Invalid hook call)
// StrictMode 在 production build 本就不啟用，移除後無副作用
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)