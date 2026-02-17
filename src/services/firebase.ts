import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 1. 改用環境變數 (與你的 Vite 設定一致)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 初始化 App
const app = initializeApp(firebaseConfig);

// 2. 匯出 Auth
export const auth = getAuth(app);

// 3. [關鍵修正] 使用 initializeFirestore 啟用離線支援
// 這取代了舊版的 getFirestore() + enableIndexedDbPersistence()
// persistentMultipleTabManager() 會自動處理多視窗同步，不會再報錯
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() 
  })
});

// 4. 匯出 Storage
export const storage = getStorage(app);