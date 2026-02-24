import { streamText, generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const google = createGoogleGenerativeAI({ apiKey });
const model = google('gemini-3-flash-preview');

// 🌐 Wikipedia 圖片獲取助手
async function fetchWikipediaImage(query) {
  if (!query) return null;
  try {
    // 優先搜尋中文維基，若無則可考慮英文，但目前先鎖定 zh
    const searchUrl = `https://zh.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(query)}&pithumbsize=1000&origin=*`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    if (pageId !== "-1" && pages[pageId].thumbnail) {
      return pages[pageId].thumbnail.source;
    }
  } catch (e) {
    console.warn("Wikipedia Fetch Error for:", query, e);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { action, payload } = req.body;
    console.log(`[AI Action]: ${action}`, payload ? Object.keys(payload) : 'no payload');

    if (!apiKey) {
      console.error("Critical: GEMINI_API_KEY is missing!");
      return res.status(500).json({ error: "系統配置錯誤：缺少 API 金鑰" });
    }

    // 1. 串流功能：景點導覽 (具備打字機效果)
    if (action === 'get-spot-guide') {
      const prompt = `你是一個專業的日本旅遊導覽人員。請針對景點「${payload.location} ${payload.title}」提供專業的背景介紹與必看亮點。請直接回傳排版精美的 Markdown 文字，建議包含：1. 歷史背景介紹 2. 必看亮點 (條列式) 3. 建議停留時間。語氣專業活潑，使用繁體中文。`;
      const result = streamText({ model, prompt });
      return result.pipeDataStreamToResponse(res);
    }

    // 2. 結構化功能 (Zod 強制驗證)
    let finalObject = {};

    switch (action) {
      case 'analyze-receipt':
        const receiptResult = await generateObject({
          model,
          schema: z.object({
            storeName: z.string(),
            title: z.string(),
            date: z.string(),
            amount: z.number(),
            currency: z.string().default('JPY'),
            category: z.string().default('其他'),
            paymentMethod: z.string().default('現金'),
            items: z.array(z.object({ name: z.string(), price: z.number() })).optional()
          }),
          messages: [
            { role: 'system', content: '你是一個專業收據分析助手。請從收據圖片中提取精確的財務數據。' },
            { role: 'user', content: [{ type: 'image', image: payload.imageBase64, mimeType: 'image/jpeg' }] }
          ]
        });
        finalObject = receiptResult.object;
        break;

      case 'universal-magic-import':
      case 'batch-screenshot-parse':
      case 'batch-parse':
        const { images, text: inputText } = payload;
        const magicContent = [];
        if (images && images.length > 0) {
          images.forEach(img => magicContent.push({ type: 'image', image: img, mimeType: 'image/jpeg' }));
        }
        if (inputText) magicContent.push({ type: 'text', text: `待處理數據：\n${inputText}` });

        const importResult = await generateObject({
          model,
          schema: z.object({
            expenses: z.array(z.object({ date: z.string(), storeName: z.string(), title: z.string(), amount: z.number(), currency: z.string(), category: z.string(), method: z.string() })).optional(),
            schedules: z.array(z.object({ date: z.string(), time: z.string(), title: z.string(), location: z.string(), category: z.string(), note: z.string() })).optional(),
            bookings: z.array(z.object({ type: z.enum(['hotel', 'flight', 'transport', 'spot', 'voucher']), title: z.string(), date: z.string(), confirmationNo: z.string(), location: z.string(), note: z.string() })).optional(),
            journals: z.array(z.object({ date: z.string(), title: z.string(), content: z.string(), location: z.string(), rating: z.number() })).optional(),
            shopping: z.array(z.object({ title: z.string(), price: z.number(), currency: z.string(), category: z.string(), note: z.string() })).optional(),
            info: z.array(z.object({ type: z.string(), title: z.string(), content: z.string(), url: z.string() })).optional()
          }),
          messages: [
            {
              role: 'system', content: `你是一個頂尖的旅遊數據分析師。請分析提供的圖片或文字，並將其智能歸類為行程、支出、訂房或日誌等結構化數據。
              - 如果日期模糊，請結合旅程範圍：${payload.startDate || '未提供'} 至 ${payload.endDate || '未提供'}。
              - 目前輸入的參考日期為：${payload.date || '今日'}。
              - 確保支出金額與幣別準確（預設 JPY）。`
            },
            { role: 'user', content: magicContent }
          ]
        });
        finalObject = importResult.object;
        break;

      case 'suggest-packing-list':
        const packingResult = await generateObject({
          model,
          schema: z.object({
            packingList: z.array(z.object({ title: z.string(), category: z.string(), quantity: z.number(), note: z.string() }))
          }),
          prompt: `我即將前往 ${payload.destination}，旅行日期從 ${payload.startDate} 開始。請推薦適合的行李清單，包含衣物、電子產品、必備證件、藥品等，並考慮季節特性。`
        });
        finalObject = packingResult.object;
        break;

      case 'suggest-weather-fallback':
        const weatherResult = await generateObject({
          model,
          schema: z.object({
            reason: z.string(),
            recommendations: z.array(z.object({
              originalId: z.string(),
              newTitle: z.string(),
              newLocation: z.string(),
              newCategory: z.string(),
              newNote: z.string(),
              newLat: z.number(),
              newLng: z.number()
            }))
          }),
          prompt: `目前天氣狀況：「${payload.weather}」，地點位於「${payload.location}」。請針對受天氣影響的原始行程推薦室內或更安全的替代方案。原始行程數據：${JSON.stringify(payload.dayItems || [])}`
        });
        finalObject = weatherResult.object;
        break;

      case 'suggest-gap':
        const gapResult = await generateObject({
          model,
          schema: z.object({
            time: z.string(),
            title: z.string(),
            location: z.string(),
            category: z.string(),
            note: z.string()
          }),
          prompt: `在上一個地點「${payload.prevItem?.title}」與下一個地點「${payload.nextItem?.title}」之間有空檔。請推薦一個位於附近的日本景點或咖啡廳作為填充。`
        });
        finalObject = gapResult.object;
        break;

      case 'get-image-for-item':
        const metaResult = await generateObject({
          model,
          schema: z.object({
            isFamous: z.boolean(),
            wikiQuery: z.string(),
            genericQuery: z.string()
          }),
          prompt: `分析旅遊項目：「${payload.title} ${payload.location || ''}」。
            1. 它是否是一個具備維基百科條目的著名景點、地標或連鎖品牌？
            2. 如果是，請提供最精確的維基百科搜尋標題（wikiQuery）。
            3. 如果不是，請提供一個通用的英文關鍵字以便搜尋圖片（genericQuery）。`
        });

        const { isFamous, wikiQuery, genericQuery } = metaResult.object;
        let imageUrl = null;

        if (isFamous && wikiQuery) {
          imageUrl = await fetchWikipediaImage(wikiQuery);
        }

        // 如果維基百科沒圖，回傳佔位圖或根據 genericQuery 組成 URL
        if (!imageUrl) {
          imageUrl = `https://placehold.co/600x400/328383/white?text=${encodeURIComponent(payload.title)}`;
        }

        finalObject = { ...metaResult.object, imageUrl };
        break;

      case 'analyze-budget':
        const budgetResult = await generateObject({
          model,
          schema: z.object({ insight: z.string() }),
          prompt: `目前預算上限：${payload.budget}。已支出詳情：${JSON.stringify(payload.expenses)}。請以專業理財專家的口吻，提供一段 100 字內的繁體中文分析與建議。`
        });
        finalObject = budgetResult.object;
        break;

      case 'research-product-price':
        const priceResult = await generateObject({
          model,
          schema: z.object({
            currentMarketPrice: z.number(),
            currency: z.string(),
            isGoodDeal: z.boolean(),
            priceHistoryInsight: z.string(),
            recommendation: z.string()
          }),
          prompt: `研究商品「${payload.title}」在類別「${payload.category}」下的市場行情。幣別：${payload.currency}。提供詳細的價格分析與購買建議。`
        });
        finalObject = priceResult.object;
        break;

      case 'get-transport-suggestion':
      case 'suggest-transport':
        const transResult = await generateObject({
          model,
          schema: z.object({ text: z.string() }),
          prompt: `建議從「${payload.prevLocation || payload.prevTitle || '起點'}」到「${payload.currentLocation || payload.currentTitle}」的交通方式（如：地鐵、走路、計程車）。請考慮效率與日本常用的交通工具。`
        });
        finalObject = transResult.object;
        break;

      case 'optimize-route':
        const optimizeResult = await generateObject({
          model,
          schema: z.object({
            optimizedIds: z.array(z.string())
          }),
          prompt: `請優化以下日本旅遊行程的順序，使其路線最順暢（考慮地理位置）。回傳一個包含 ID 的陣列，順序為優化後的順序。行程數據：${JSON.stringify(payload.items)}`
        });
        // 前端期待直接回傳陣列
        return res.status(200).json(optimizeResult.object.optimizedIds);

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    return res.status(200).json(finalObject);

  } catch (error) {
    console.error("Vercel Function Modernization Error:", error);
    res.status(500).json({
      error: "AI 服務優化版本異常",
      message: error.message,
      details: "請檢查 Vercel Logs 以獲取完整錯誤追蹤。"
    });
  }
}
