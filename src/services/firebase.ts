import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

// 使用 Vite 的環境變數讀取方式，避免金鑰外洩且方便部署
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore 並啟用最新的離線持久化快取 (解決控制台警告)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const storage = getStorage(app);
export const auth = getAuth(app);

// 啟用匿名登入
// 注意：請確保你在 Firebase Console -> Authentication -> Sign-in method 啟用了「匿名」提供商
signInAnonymously(auth)
  .then(() => {
    console.log("Firebase 匿名登入成功 ✨");
  })
  .catch((error) => {
    console.error("Firebase 匿名登入失敗，請檢查 API Key 或 Firebase 控制台設定:", error);
  });