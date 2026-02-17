import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

// 請在此處填入你的 Firebase SDK 設定
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// 啟用匿名登入 (讓使用者不需要輸入密碼即可擁有獨立 ID)
signInAnonymously(auth).catch((error) => {
  console.error("Firebase 匿名登入失敗:", error);
});

// 啟用離線持久化 (重要：確保旅遊途中沒網路也能讀取)
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("離線同步失敗：多個分頁同時開啟中");
    } else if (err.code === 'unimplemented') {
      console.warn("此瀏覽器不支援離線同步");
    }
  });
}