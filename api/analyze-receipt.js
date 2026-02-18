import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { imageBase64 } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      你是一個專業收據分析助手。請分析這張圖片並回傳純 JSON 格式資料（不要有 Markdown 標記）：
      {
        "title": "商家名稱",
        "date": "YYYY-MM-DD",
        "amount": 總金額數字,
        "currency": "貨幣代碼(如 JPY, KRW, TWD)",
        "category": "根據內容分類：飲食/交通/購物/住宿/娛樂/其他",
        "items": [{"name": "品項", "price": 數字}]
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

