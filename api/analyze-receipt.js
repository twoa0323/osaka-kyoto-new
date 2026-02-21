import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { imageBase64 } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      你是一個專業收據分析助手。請分析這張圖片並回傳純 JSON 格式資料（不要有 Markdown 標記）：
      {
        "storeName": "店家名稱",
        "title": "消費簡短描述 (例如: 午餐、購買衣服)",
        "date": "YYYY-MM-DD",
        "amount": 總金額數字,
        "currency": "貨幣代碼(如 JPY, KRW, TWD)",
        "paymentMethod": "根據內容推斷：現金/信用卡/行動支付/IC卡/其他",
        "category": "根據內容分類：餐飲/購物/交通/住宿/娛樂/藥妝/便利商店/超市/其他",
        "items": [{"name": "品項名稱", "price": 數字}]
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text().replace(/```json|```/g, "").trim();
    res.status(200).json(JSON.parse(text));
  } catch (error) {
    res.status(500).json({ error: "辨識失敗", details: error.message });
  }
}



