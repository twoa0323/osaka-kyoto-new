import { streamText, generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const google = createGoogleGenerativeAI({ apiKey });
const model = google('gemini-3-flash-preview'); // 鎖定最新高速預覽模型

// 🌐 Wikipedia 圖片獲取助手 (支援多語言 fallback)
async function fetchWikipediaImage(query) {
  if (!query) return null;
  const langs = ['ja', 'zh', 'en']; // 日本景點 ja 優先

  for (const lang of langs) {
    try {
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(query)}&pithumbsize=1000&origin=*`;
      const res = await fetch(searchUrl);
      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) continue;
      const pageId = Object.keys(pages)[0];
      if (pageId !== "-1" && pages[pageId].thumbnail) {
        return pages[pageId].thumbnail.source;
      }
    } catch (e) {
      console.warn(`Wikipedia Fetch Error (${lang}) for:`, query, e);
    }
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

    // 1. 串流功能：景點導覽 (改為純文本串流輸出，簡化前端解析)
    if (action === 'get-spot-guide') {
      const prompt = `你是一個專業的日本旅遊導覽人員。請針對景點「${payload.location} ${payload.title}」提供專業的背景介紹與必看亮點。請直接回傳排版精美的 Markdown 文字，建議包含：1. 歷史背景介紹 2. 必看亮點 (條列式) 3. 建議停留時間。語氣專業活潑，使用繁體中文。`;
      console.log("[AI Text Stream Prompt]:", prompt);
      const result = streamText({ model, prompt });
      return result.toTextStreamResponse();
    }

    // 2. 結構化功能 (Zod 強制驗證)
    let finalObject = {};

    switch (action) {
      // 📍 新增：魔法雷達地圖探索
      case 'explore-nearby':
        const exploreResult = await generateObject({
          model, // 確保使用的是 gemini-3-flash-preview
          schema: z.object({
            places: z.array(z.object({
              name: z.string(),
              category: z.enum(['sightseeing', 'food', 'shopping']).describe('分類'),
              lat: z.number().describe('精確緯度'),
              lng: z.number().describe('精確經度'),
              reason: z.string().describe('幽默活潑的推薦理由，包含一個Emoji，30字內'),
              estimatedTime: z.string().describe('建議停留時間，如：1小時')
            }))
          }),
          prompt: `使用者目前在地圖上的座標為 緯度 ${payload.lat}, 經度 ${payload.lng} (位於 ${payload.city || '日本'})。
            請推薦 4 個距離此座標步行 15 分鐘以內的優質景點、隱藏版美食或特色小店。
            請務必提供真實且準確的經緯度 (lat, lng)。理由請用斯普拉遁的活潑風格，並使用繁體中文。`
        });
        finalObject = exploreResult.object;
        break;

      case 'analyze-receipt':
        const receiptResult = await generateObject({
          model,
          schema: z.object({
            storeName: z.string(),
            shopType: z.string().describe('店家類型，如：便利商店, 藥妝店, 餐廳, 百貨, 交通'),
            title: z.string(),
            date: z.string(),
            amount: z.number(),
            currency: z.string().default('JPY'),
            category: z.string().default('其他'),
            paymentMethod: z.string().default('現金'),
            isTaxFree: z.boolean().describe('是否為免稅交易 (Tax-Free)'),
            confidence: z.number().describe('辨識結果的信心評分 (0.0 - 1.0)'),
            items: z.array(z.object({ name: z.string(), price: z.number() })).optional()
          }),
          messages: [
            {
              role: 'system',
              content: `你是一個世界級的日本旅遊收據分析助手。請精準提取以下資訊：
              1. storeName: 商店名稱。
              2. shopType: 根據店家特徵判斷類型。
              3. title: 簡短消費主題。
              4. date: 消費日期 (YYYY-MM-DD)。
              5. amount: 總金額 (Total)。
              6. currency: 幣別（預設 JPY）。
              7. category: 分類（飲食, 交通, 購物, 娛樂, 住宿, 其他）。請根據 shopType 進行精準分類。
              8. isTaxFree: 偵測是否有 "Tax-Free"、"免稅" 標記或 0% 稅率。
              9. confidence: 評估你對此張收據辨識結果的整體信心。
              
              - 特別注意：日本旅遊場景中，藥妝店與百貨常有免稅與含稅兩種價格，請以「最終實付處 (Total)」為準。
              - 品項識別：請盡可能列出收據上的單一品項名稱與單價，這將用於後續的精確分帳。
              - 確保金額不包含千分位逗號。`
            },
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
              role: 'system', content: `你是一個頂尖的旅遊數據分析師，具備 OCR 與圖像理解能力。請分析提供的圖片或文字，並將其智能歸類。
              - 費用提取：務必精確識別總金額 (Amount) 與幣別 (Currency)，優先從收據底部找 Total。
              - 日期合併：如果日期模糊，請結合旅程範圍：${payload.startDate || '未提供'} 至 ${payload.endDate || '未提供'}。
              - 智能補完：如果缺乏類別，請根據店家名稱推斷最合適的分類。
              - 目前參考日期為：${payload.date || '今日'}。
              - 輸出格式必須完全符合 Schema。`
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

      case 'parse-screenshot':
        const parsePrompt = type === 'flight'
          ? `這是一張機票或登機證截圖。請提取關鍵資訊。包含：航空公司(airline)、航班號(flightNo)、日期(date:YYYY-MM-DD)、出發機場(depIata)、抵達機場(arrIata)、出發時間(depTime)、抵達時間(arrTime)、出發城市(depCity)、抵達城市(arrCity)、航程時間(duration)、行李限額(baggage)、座位(seat)、機型(aircraft)、訂位代碼(pnr)、電子票號(eTicketNo)、航廈(terminal)、登機門(gate)、登機時間(boardingTime)、行李額度詳情(baggageAllowance)。若無則留空。`
          : `這是一張${type === 'hotel' ? '飯店' : '景點/憑證'}的預訂截圖。請提取：標題/名稱(title)、地點/地址(location)、開始日期(date: YYYY-MM-DD)、結束日期(endDate: YYYY-MM-DD)、入住晚數(nights)、憑證編號(confirmationNo)、房型(roomType)、聯絡電話(contactPhone)、入住時間(checkInTime)、最後入場時間(lastEntryTime)、集合地點(meetingPoint)、營業/兌換時間(exchangeHours)、入場時間(entryTime)、票種(ticketType)、兌換地點(exchangeLocation)。若無則留空。`;

        const parseResult = await generateObject({
          model,
          schema: type === 'flight' ? z.object({
            airline: z.string().optional(), flightNo: z.string().optional(), date: z.string().optional(),
            depIata: z.string().optional(), arrIata: z.string().optional(), depTime: z.string().optional(),
            arrTime: z.string().optional(), depCity: z.string().optional(), arrCity: z.string().optional(),
            duration: z.string().optional(), baggage: z.string().optional(), seat: z.string().optional(), aircraft: z.string().optional(),
            pnr: z.string().optional(), eTicketNo: z.string().optional(), terminal: z.string().optional(),
            gate: z.string().optional(), boardingTime: z.string().optional(), baggageAllowance: z.string().optional()
          }) : z.object({
            title: z.string().optional(), location: z.string().optional(), date: z.string().optional(),
            endDate: z.string().optional(), nights: z.number().optional(), confirmationNo: z.string().optional(),
            roomType: z.string().optional(), contactPhone: z.string().optional(),
            checkInTime: z.string().optional(), lastEntryTime: z.string().optional(),
            meetingPoint: z.string().optional(), exchangeHours: z.string().optional(),
            entryTime: z.string().optional(), ticketType: z.string().optional(), exchangeLocation: z.string().optional()
          }),
          messages: [
            { role: 'system', content: `你是一個專業的日本旅遊文件分析師。請精準解析圖片內容，輸出必須嚴格符合給定的 JSON Schema，不要包含引號或格式說明。` },
            { role: 'user', content: [{ type: 'image', image: imageBase64, mimeType: 'image/jpeg' }, { type: 'text', text: parsePrompt }] }
          ]
        });
        finalObject = parseResult.object;
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
            2. 如果是，請提供該地點最精確的維基百科搜尋標題（優先提供日文原名，因為我們正在日本旅行，ja.wikipedia.org 覆蓋率最高）。
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
            dealRating: z.enum(['good', 'bad', 'normal']).describe('划算程度評估'),
            priceHistoryInsight: z.string(),
            advice: z.string().describe('簡短的 AI 建議'),
            recommendation: z.string()
          }),
          prompt: `研究商品「${payload.title}」在類別「${payload.category}」下的市場行情。幣別：${payload.currency}。目標預期價為 ${payload.targetPrice || '未設定'}。
            請根據當前市場價格與目標價的差異，給出 dealRating (good/bad/normal) 並提供簡短活潑的建議 (advice)。`
        });
        finalObject = priceResult.object;
        break;

      case 'get-transport-suggestion':
      case 'suggest-transport':
        const transResult = await generateObject({
          model,
          schema: z.object({
            summary: z.string(),
            steps: z.array(z.object({
              type: z.enum(['walk', 'train', 'bus', 'taxi', 'ferry', 'other']),
              title: z.string(),
              description: z.string(),
              duration: z.string()
            }))
          }),
          prompt: `建議從「${payload.prevLocation || payload.prevTitle || '起點'}」到「${payload.currentLocation || payload.currentTitle}」的交通方式（如：地鐵、走路、計程車）。
            請考慮效率與日本常用的交通工具。將過程拆分為多個邏輯步驟，例如：步行到車站 -> 搭乘XX線 -> 步行到目的地。
            請以繁體中文回答。`
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
