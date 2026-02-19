// filepath: src/utils/imageUtils.ts
import Resizer from 'react-image-file-resizer';
import { storage } from '../services/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export const compressImage = (file: File): Promise<string> =>
  new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      1024, // max width
      1024, // max height
      "WEBP", // compress format
      80, // quality
      0, // rotation
      (uri) => {
        resolve(uri as string);
      },
      "base64" // output type
    );
  });

export const uploadImage = async (file: File): Promise<string> => {
  const base64 = await compressImage(file);
  try {
    // 優先嘗試上傳至 Firebase Storage 取得輕量級 URL
    const fileName = `images/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.webp`;
    const storageRef = ref(storage, fileName);
    await uploadString(storageRef, base64, 'data_url');
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Firebase Storage 上傳失敗，啟用極限壓縮 Base64 備案:", error);
    // 若 Storage 權限未開，啟用極度壓縮備案，避免塞爆資料庫 1MB 限制
    return new Promise((resolve) => {
      Resizer.imageFileResizer(
        file,
        400, 
        400, 
        "WEBP", 
        40, 
        0, 
        (uri) => resolve(uri as string),
        "base64"
      );
    });
  }
};
