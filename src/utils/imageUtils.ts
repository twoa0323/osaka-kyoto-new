// filepath: src/utils/imageUtils.ts
import Resizer from 'react-image-file-resizer';

// 1. 本地端圖片壓縮 (上傳前先壓縮，省流量跟上傳時間)
export const compressImage = (file: File): Promise<string> =>
  new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      1280, // 最大寬度 (保留高畫質)
      1280, // 最大高度
      "WEBP", // 輸出格式 WEBP (容量小、畫質好)
      85, // 畫質 85%
      0, // 旋轉角度
      (uri) => resolve(uri as string),
      "base64" // 輸出為 Base64 字串交給 Cloudinary
    );
  });

// 2. 上傳至 Cloudinary 雲端圖床
export const uploadImage = async (file: File): Promise<string> => {
  // 先將圖片在本地端壓縮成 Base64
  const base64Image = await compressImage(file);

  // 🔴🔴🔴 請在這裡替換成您剛剛申請的 Cloudinary 資訊 🔴🔴🔴
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // 防呆機制：提醒尚未填寫金鑰
  if (CLOUD_NAME === "您的_cloud_name") {
    alert("請先到 src/utils/imageUtils.ts 填寫 Cloudinary 金鑰！");
    throw new Error("Missing Cloudinary Config");
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  
  formData.append("file", base64Image);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Cloudinary 上傳被拒絕，請檢查 Preset 是否設為 Unsigned");
    }

    const data = await response.json();
    
    // 💡 偷吃步最佳化：在網址中自動加入 q_auto,f_auto 參數
    // 讓 Cloudinary 伺服器幫我們極致壓縮與最佳化載入速度
    const optimizedUrl = data.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
    
    return optimizedUrl;
    
  } catch (error) {
    console.error("Cloudinary 上傳發生錯誤:", error);
    alert("照片上傳失敗，請檢查網路狀態或 Cloudinary 設定！");
    throw error;
  }
};
