// ✅ Vercel Edge Function — 無 10 秒逾時限制，串流原生支援
export const config = { runtime: 'edge' };

import { streamText, generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

const MODEL_NAME = 'gemini-3-flash-preview'; // 統一 Gemini 版本

// 🌐 Wikipedia 圖片獲取助手
async function fetchWikipediaImage(query) {
  if (!query) return null;
  const langs = ['ja', 'zh', 'en'];
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

// 🔧 輔助：建立 JSON 回應
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200 });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Critical: GEMINI_API_KEY is missing!");
    return jsonResponse({ error: "系統配置錯誤：缺少 API 金鑰" }, 500);
  }

  const google = createGoogleGenerativeAI({ apiKey });
  const model = google(MODEL_NAME);

  let action, payload, type, imageBase64;
  try {
    // Edge Function 使用 Web API req.json()
    const body = await req.json();
    action = body.action;
    payload = body.payload || {};
    type = payload.type;
    imageBase64 = payload.imageBase64;
  } catch (e) {
    return jsonResponse({ error: "請求格式錯誤，需要 JSON body" }, 400);
  }

  console.log(`[AI Edge Action]: ${action}`);

  try {
    // 0. Warm-up Ping
    if (action === 'ping') {
      return jsonResponse({ ok: true, model: MODEL_NAME, runtime: 'edge' });
    }

    // 1. 景點導覽串流
    if (action === 'get-spot-guide') {
      const prompt = `介紹「${payload.location} ${payload.title}」，回傳包含歷史、亮點、停留時間的簡短 Markdown，繁體中文。`;
      const result = streamText({ model, prompt });
      return result.toTextStreamResponse();
    }

    // 2. 結構化 generateObject actions
    let finalObject = {};

    switch (action) {
      case 'explore-nearby': {
        const r = await generateObject({
          model,
          schema: z.object({
            places: z.array(z.object({
              name: z.string(),
              category: z.enum(['sightseeing', 'food', 'shopping']),
              lat: z.number(),
              lng: z.number(),
              reason: z.string(),
              estimatedTime: z.string()
            }))
          }),
          prompt: `推薦座標(${payload.lat},${payload.lng})附近4個景點/美食，附帶精準經緯度和簡短活潑原因，繁體中文。`
        });
        finalObject = r.object;
        break;
      }

      case 'analyze-receipt': {
        const r = await generateObject({
          model,
          schema: z.object({
            storeName: z.string(),
            shopType: z.string(),
            title: z.string(),
            date: z.string(),
            amount: z.number(),
            currency: z.string().default('JPY'),
            category: z.string().default('其他'),
            paymentMethod: z.string().default('現金'),
            isTaxFree: z.boolean(),
            confidence: z.number(),
            items: z.array(z.object({ name: z.string(), price: z.number() })).optional()
          }),
          messages: [
            { role: 'system', content: `分析此日文收據提取：商店名稱、類型、消費主題、日期(YYYY-MM-DD)、單純總金額、幣別、分類判斷、免稅狀態與信心值。列出各細項名稱及單價。` },
            { role: 'user', content: [{ type: 'image', image: imageBase64, mimeType: 'image/jpeg' }] }
          ]
        });
        finalObject = r.object;
        break;
      }

      case 'universal-magic-import':
      case 'batch-screenshot-parse':
      case 'batch-parse': {
        const { images, text: inputText } = payload;
        const magicContent = [];
        if (images && images.length > 0) {
          images.forEach(img => magicContent.push({ type: 'image', image: img, mimeType: 'image/jpeg' }));
        }
        if (inputText) magicContent.push({ type: 'text', text: `待處理數據：\n${inputText}` });

        const r = await generateObject({
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
            { role: 'system', content: `分析圖片/文字並歸類為行程/花費等。旅程區間：${payload.startDate}至${payload.endDate}。參考日：${payload.date}。精確識別總金額不含逗號。嚴格遵守Schema。` },
            { role: 'user', content: magicContent }
          ]
        });
        finalObject = r.object;
        break;
      }

      case 'suggest-packing-list': {
        const r = await generateObject({
          model,
          schema: z.object({
            packingList: z.array(z.object({ title: z.string(), category: z.string(), quantity: z.number(), note: z.string() }))
          }),
          prompt: `前往 ${payload.destination} (${payload.startDate}) 的精簡行李清單推薦。`
        });
        finalObject = r.object;
        break;
      }

      case 'parse-screenshot': {
        const parsePrompt = type === 'flight'
          ? `這是一張機票或登機證截圖。請提取：airline, flightNo, date(YYYY-MM-DD), depIata, arrIata, depTime, arrTime, depCity, arrCity, duration, baggage, seat, aircraft, pnr, eTicketNo, terminal, gate, boardingTime, baggageAllowance。若無則留空。`
          : `這是一張${type === 'hotel' ? '飯店' : '景點/憑證'}預訂截圖。請提取：title, location, date(YYYY-MM-DD), endDate, nights, confirmationNo, roomType, contactPhone, checkInTime, lastEntryTime, meetingPoint, exchangeHours, entryTime, ticketType, exchangeLocation。若無則留空。`;

        const r = await generateObject({
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
            { role: 'system', content: `你是一個專業的日本旅遊文件分析師。請精準解析圖片內容，輸出必須嚴格符合給定的 JSON Schema。` },
            { role: 'user', content: [{ type: 'image', image: imageBase64, mimeType: 'image/jpeg' }, { type: 'text', text: parsePrompt }] }
          ]
        });
        finalObject = r.object;
        break;
      }

      case 'suggest-weather-fallback': {
        const r = await generateObject({
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
          prompt: `目前天氣狀況：「${payload.weather}」，地點位於「${payload.location}」。請針對受天氣影響的行程推薦室內替代方案。原始行程：${JSON.stringify(payload.dayItems || [])}`
        });
        finalObject = r.object;
        break;
      }

      case 'suggest-gap': {
        const r = await generateObject({
          model,
          schema: z.object({ time: z.string(), title: z.string(), location: z.string(), category: z.string(), note: z.string() }),
          prompt: `在「${payload.prevItem?.title}」與「${payload.nextItem?.title}」之間有空檔。請推薦一個位於附近的日本景點或咖啡廳作為填充。`
        });
        finalObject = r.object;
        break;
      }

      case 'get-image-for-item': {
        const r = await generateObject({
          model,
          schema: z.object({ isFamous: z.boolean(), wikiQuery: z.string(), genericQuery: z.string() }),
          prompt: `分析旅遊項目：「${payload.title} ${payload.location || ''}」。\n1. 是否有維基百科條目？\n2. 若有，提供日文原名的維基百科搜尋標題。\n3. 若無，提供英文通用關鍵字。`
        });
        const { isFamous, wikiQuery } = r.object;
        let imageUrl = null;
        if (isFamous && wikiQuery) imageUrl = await fetchWikipediaImage(wikiQuery);
        if (!imageUrl) imageUrl = `https://placehold.co/600x400/328383/white?text=${encodeURIComponent(payload.title)}`;
        finalObject = { ...r.object, imageUrl };
        break;
      }

      case 'refine-food-review': {
        const r = await generateObject({
          model,
          schema: z.object({ refinedContent: z.string(), tags: z.array(z.string()) }),
          prompt: `將使用者吃完「${payload.title}」的心得：「${payload.content || '很好吃'}」改寫為 IG 探店風格美食評論（50~100字，繁體中文）。並推薦 2~3 個 Hashtag。`
        });
        finalObject = r.object;
        break;
      }

      case 'recommend-dishes': {
        const r = await generateObject({
          model,
          schema: z.object({ dishes: z.array(z.string()) }),
          prompt: `針對「${payload.title}」位於「${payload.location || '日本'}」，列出 3~5 道必點菜色或人氣商品。`
        });
        finalObject = r.object;
        break;
      }

      case 'analyze-budget': {
        const r = await generateObject({
          model,
          schema: z.object({ insight: z.string() }),
          prompt: `預算上限：${payload.budget}。已支出：${JSON.stringify(payload.expenses)}。以專業理財專家口吻提供 100 字內繁體中文分析。`
        });
        finalObject = r.object;
        break;
      }

      case 'research-product-price': {
        const r = await generateObject({
          model,
          schema: z.object({
            currentMarketPrice: z.number(),
            currency: z.string(),
            isGoodDeal: z.boolean(),
            dealRating: z.enum(['good', 'bad', 'normal']),
            priceHistoryInsight: z.string(),
            advice: z.string(),
            recommendation: z.string()
          }),
          prompt: `研究「${payload.title}」在類別「${payload.category}」的市場行情。幣別：${payload.currency}。目標價：${payload.targetPrice || '未設定'}。給出 dealRating 與建議。`
        });
        finalObject = r.object;
        break;
      }

      case 'get-transport-suggestion':
      case 'suggest-transport': {
        const r = await generateObject({
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
          prompt: `建議從「${payload.prevLocation || payload.prevTitle || '起點'}」到「${payload.currentLocation || payload.currentTitle}」的交通方式。拆分為多個邏輯步驟。繁體中文。`
        });
        finalObject = r.object;
        break;
      }

      case 'optimize-route': {
        const r = await generateObject({
          model,
          schema: z.object({ optimizedIds: z.array(z.string()) }),
          prompt: `優化以下行程順序（考慮地理位置）。回傳優化後的 ID 陣列。行程：${JSON.stringify(payload.items)}`
        });
        return jsonResponse(r.object.optimizedIds);
      }

      case 'translate-phrase': {
        const r = await generateObject({
          model,
          schema: z.object({ japanese: z.string(), romaji: z.string() }),
          prompt: `將「${payload.phrase}」翻譯為道地日文，並附上羅馬拼音。`
        });
        finalObject = r.object;
        break;
      }

      case 'cultural-taboos': {
        const r = await generateObject({
          model,
          schema: z.object({ taboos: z.array(z.string()) }),
          prompt: `前往日本「${payload.dest || '日本'}」的 3 條具體文化禁忌或禮儀提醒（活潑幽默口吻，不超過3條）。`
        });
        finalObject = r.object;
        break;
      }

      default:
        return jsonResponse({ error: `Invalid action: ${action}` }, 400);
    }

    return jsonResponse(finalObject);

  } catch (error) {
    const msg = error?.message || String(error);
    const isPayloadTooLarge = msg.includes('413') || msg.toLowerCase().includes('payload') || msg.includes('too large');
    const isTimeout = error?.name === 'AbortError' || msg.includes('timeout');

    console.error(`[AI Edge Error] action=${action}:`, msg);

    return jsonResponse({
      error: isPayloadTooLarge
        ? "圖片過大或格式不支援，請壓縮圖片後重試 📦"
        : isTimeout
          ? "AI 回應逾時，請稍後再試 ⏱️"
          : "AI 服務暫時異常，請稍後再試",
      detail: msg,
      action
    }, 500);
  }
}
