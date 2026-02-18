import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // 使用 Gemini 1.5 Flash (速度快、成本低)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      你是一個專業的會計助手。請分析這張收據圖片。
      請識別以下資訊並以純 JSON 格式回傳 (不要有 Markdown 標記，不要有 \`\`\`json)：
      {
        "title": "商家名稱",
        "date": "YYYY-MM-DD (若無則回傳今天)",
        "amount": 數字 (總金額),
        "currency": "貨幣代碼 (如 TWD, JPY, KRW, USD)",
        "items": [{"name": "商品名", "price": 數字}],
        "category": "根據內容推斷 (sightseeing/food/transport/hotel/shopping/general)"
      }
      如果圖片模糊，請盡量辨識，若完全無法辨識 title 或 amount，請回傳 error 欄位。
    `;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // 清理 JSON 字串
    const jsonStr = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(jsonStr);
    
    res.status(200).json(data);

  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "辨識失敗，請重試", details: error.message });
  }
}
