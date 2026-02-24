import { GoogleGenerativeAI } from "@google/generative-ai";
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

// ❌ 絕對不能加 runtime: 'edge'，否則 req.body 和 res.status 會失效
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);

export default async function handler(req, res) {
  // 支援 CORS (如果需要的話)
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { action, payload } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // ==========================================
    // 類型 1：需要「打字機串流」輸出的功能 (景點導覽)
    // ==========================================
    if (action === 'get-spot-guide') {
      const prompt = `你是一個專業的日本旅遊導覽人員。請針對景點「${payload.location} ${payload.title}」提供專業的背景介紹與必看亮點。請直接回傳排版精美的 Markdown 文字，建議包含：1. 歷史背景介紹 2. 必看亮點 (條列式) 3. 建議停留時間。語氣專業活潑，使用繁體中文。`;

      const spotResult = streamText({
        model: google('gemini-1.5-flash'),
        prompt: prompt,
      });
      // ✅ 使用 Node.js 專用的 pipe 方法回傳串流，完美相容
      spotResult.pipeDataStreamToResponse(res);
      return;
    }

    // ==========================================
    // 類型 2：直接回傳標準 JSON 的功能 (行程解析、收據等)
    // ==========================================
    let prompt = "";
    let parts = [];

    switch (action) {
      case 'analyze-receipt':
        prompt = `你是一個專業收據分析助手。請精確分析圖片，回傳純 JSON 格式資料。包含 storeName, title, date, amount, currency, category, paymentMethod, items(陣列含name,price)。不要 Markdown。`;
        parts = [prompt, { inlineData: { data: payload.imageBase64, mimeType: "image/jpeg" } }];
        break;

      case 'universal-magic-import':
      case 'batch-screenshot-parse':
        const { images, text: inputText } = payload;
        prompt = `你是一個專業的旅遊數據提取專家。請分析提供的數據，並將其轉換為結構化的 JSON。
        
        【限制條件】
        - 旅程總日期範圍：${payload.startDate || '未提供'} 至 ${payload.endDate || '未提供'}
        - 目前焦點日期：${payload.date || '未提供'}
        
        【回傳結構】
        {
          "expenses": [{ "date": "YYYY-MM-DD", "storeName": "...", "title": "...", "amount": 0, "currency": "JPY", "category": "...", "method": "..." }],
          "schedules": [{ "date": "YYYY-MM-DD", "time": "HH:mm", "title": "...", "location": "...", "category": "...", "note": "..." }],
          "bookings": [{ "type": "hotel/flight/transport/spot/voucher", "title": "...", "date": "YYYY-MM-DD", "confirmationNo": "...", "location": "...", "note": "..." }],
          "journals": [{ "date": "YYYY-MM-DD", "title": "...", "content": "...", "location": "...", "rating": 5 }],
          "shopping": [{ "title": "...", "price": 0, "currency": "JPY", "category": "...", "note": "..." }],
          "info": [{ "type": "...", "title": "...", "content": "...", "url": "..." }]
        }
        請直接回傳純 JSON，不要 Markdown 標記。`;

        parts = [prompt];
        if (images && images.length > 0) {
          images.forEach(img => parts.push({ inlineData: { data: img, mimeType: "image/jpeg" } }));
        }
        if (inputText) parts.push(`【待處理文字】\n${inputText}`);
        break;

      case 'suggest-packing-list':
        prompt = `請根據目的地 ${payload.destination} 與季節 ${payload.startDate}，回傳一份專業的旅遊行李清單純 JSON：{"packingList":[{"title":"", "category":"", "quantity":1, "note":""}]}，分類包含衣物、洗漱、電子、證件、藥品、其他。使用繁體中文。`;
        parts = [prompt];
        break;

      case 'suggest-weather-fallback':
        prompt = `請根據目前天氣「${payload.weather}」以及位於「${payload.location}」的原始行程，找出受雨天影響的戶外點，推薦室內替代方案。
        回傳 JSON：{"reason":"原因一段話", "recommendations":[{"originalId":"ID", "newTitle":"新名稱", "newLocation":"新地址", "newCategory":"sightseeing", "newNote":"特色說明", "newLat":0, "newLng":0}]}`;
        parts = [prompt];
        break;

      case 'suggest-gap':
        prompt = `請根據上一個行程「${payload.prevItem.title}」與下一個行程「${payload.nextItem.title}」之間的位置，推薦一個位於日本的順路景點。
        回傳 JSON：{"time":"HH:mm", "title":"名稱", "location":"地址", "category":"sightseeing", "note":"推薦理由"}`;
        parts = [prompt];
        break;

      case 'get-image-for-item':
        prompt = `請判斷旅遊項目：「${payload.title}」是否為著名地標或特定品牌，回傳 JSON: {"isFamous": true, "wikiQuery": "搜尋名稱", "genericQuery": "英文關鍵字"}`;
        parts = [prompt];
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    // 執行 AI 生成
    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    // 針對 get-image-for-item 進行特殊後處理
    if (action === 'get-image-for-item') {
      const match = responseText.match(/\{[\s\S]*\}/);
      let imageUrl = "";
      if (match) {
        try {
          const info = JSON.parse(match[0]);
          if (info.isFamous && info.wikiQuery) {
            const wikiRes = await fetch(`https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(info.wikiQuery)}&prop=pageimages&format=json&pithumbsize=1000&formatversion=2`).then(r => r.json());
            if (wikiRes.query?.pages?.[0]?.thumbnail?.source) imageUrl = wikiRes.query.pages[0].thumbnail.source;
          }
          if (!imageUrl && info.genericQuery) {
            imageUrl = `https://placehold.co/800x600/328383/F7F4EB?text=${encodeURIComponent(info.genericQuery)}`;
          }
        } catch (e) { }
      }
      return res.status(200).json({ imageUrl });
    }

    // 嘗試解析 JSON 並回傳
    try {
      const jsonMatch = responseText.match(/[\{\[]([\s\S]*)[\}\]]/);
      return res.status(200).json(jsonMatch ? JSON.parse(jsonMatch[0]) : { text: responseText });
    } catch (e) {
      return res.status(200).json({ text: responseText });
    }

  } catch (error) {
    console.error("Vercel Function Error:", error); // 這行會出現在 Vercel 的 Logs 頁面
    res.status(500).json({
      error: "AI 服務異常",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
