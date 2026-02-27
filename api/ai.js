// ✅ Vercel Edge Function — 無 10 秒逾時限制，串流原生支援
export const config = { runtime: 'edge' };

import { streamText, generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

// ──── Smart Model Router ────
// PRIMARY_MODEL: 高邏輯任務（路線最佳化、交通推理、天氣應對）
const PRIMARY_MODEL = 'gemini-3-pro-deep-think';
// SECONDARY_MODEL: 一般任務（翻譯、收據掃描、Magic Import）& Primary fallback
const SECONDARY_MODEL = 'gemini-3-flash-preview';

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

// 🔧 輔助：建立 JSON 回應，附加 X-AI-Model-Used 標頭方便前端統計
function jsonResponse(data, status = 200, modelUsed = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (modelUsed) headers['X-AI-Model-Used'] = modelUsed;
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * 🤖 Smart Model Router — callAiWithFallback
 * @param {object} generateObjectArgs - Arguments to pass to generateObject (without 'model' key)
 * @param {object} google - The createGoogleGenerativeAI instance
 * @param {boolean} useDeepThink - If true, first tries PRIMARY_MODEL, falls back to SECONDARY_MODEL on 429/503
 * @returns {{ result: object, modelUsed: 'deep-think'|'flash-fallback'|'flash' }}
 */
async function callAiWithFallback(generateObjectArgs, google, useDeepThink = true) {
  if (useDeepThink) {
    try {
      // Deep Think model with thinkingBudget (only safe for PRIMARY_MODEL)
      const primaryModel = google(PRIMARY_MODEL, { thinkingConfig: { thinkingBudget: 8192 } });
      const r = await generateObject({ ...generateObjectArgs, model: primaryModel });
      return { result: r.object, modelUsed: 'deep-think' };
    } catch (err) {
      const errMsg = err?.message || String(err);
      const isRateLimit = errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('RESOURCE_EXHAUSTED');
      console.warn(`[AI Router] Falling back to Flash... (原因: ${isRateLimit ? 'Rate Limit 429/503' : 'Error'}: ${errMsg})`);
      // Fallthrough to SECONDARY_MODEL below
    }
  }
  // Flash path — no thinkingConfig (對 Flash 模型發送 thinkingConfig 會導致 API error)
  const secondaryModel = google(SECONDARY_MODEL);
  const r = await generateObject({ ...generateObjectArgs, model: secondaryModel });
  return { result: r.object, modelUsed: useDeepThink ? 'flash-fallback' : 'flash' };
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
  // Smart Model Router: models are instantiated inside callAiWithFallback per-call
  // General-purpose secondary model for streaming and one-off calls
  const model = google(SECONDARY_MODEL);

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
      return jsonResponse({ ok: true, primaryModel: PRIMARY_MODEL, secondaryModel: SECONDARY_MODEL, runtime: 'edge' });
    }

    // 1. 景點導覽串流 — [General] 使用 SECONDARY_MODEL
    if (action === 'get-spot-guide') {
      const prompt = `介紹「${payload.location} ${payload.title}」，回傳包含歷史、亮點、停留時間的簡短 Markdown，繁體中文。`;
      const result = streamText({ model, prompt });
      return result.toTextStreamResponse();
    }

    // 2. 結構化 generateObject actions
    let finalObject = {};
    let _modelUsed = 'flash'; // 預設為 flash，將在高邏輯任務中更新

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
        // [High-Logic] Smart Router — Deep Think 優先，429/503 自動降級
        const { result, modelUsed: weatherModel } = await callAiWithFallback({
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
        }, google, true);
        _modelUsed = weatherModel;
        finalObject = result;
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
        // Step 2: Search Grounding — 嘗試取得即時日本市場售價
        // 自動降級：Free Tier 無 Grounding 權限時，改回一般生成模式（不崩潰）
        const priceSchema = z.object({
          currentMarketPrice: z.number(),
          currency: z.string(),
          isGoodDeal: z.boolean(),
          dealRating: z.enum(['good', 'bad', 'normal']),
          priceHistoryInsight: z.string(),
          advice: z.string(),
          recommendation: z.string(),
          citations: z.array(z.string()).optional()
        });
        const pricePromptGrounded = `你必須先調用 Google Search 工具獲取該商品在日本主要量販店（Bic Camera, Yodobashi, Don Quijote）的今日即時價格，嚴禁憑空捏造數字。\n請取得商品「${payload.title}」最新日幣售價，並以此作為 currentMarketPrice 的評估基礎。\n類別：「${payload.category}」，幣別：${payload.currency}，目標預算：${payload.targetPrice || '未設定'}。\n根據即時市場價格與目標價的差異給出 dealRating (good/bad/normal) 與購買建議。請在 priceHistoryInsight 說明價格來源與趨勢，並將參考網址放入 citations 陣列中以正確處理來源標籤。`;
        const pricePromptFallback = `研究商品「${payload.title}」在日本的市場行情（類別：${payload.category}，幣別：${payload.currency}，目標預算：${payload.targetPrice || '未設定'}）。根據訓練資料估算 currentMarketPrice，給出 dealRating 與建議，若有參考依據請列入 citations。`;

        let priceResult;
        try {
          // 第一次嘗試：Search Grounding（即時售價）
          const searchGroundedModel = google(MODEL_NAME, { useSearchGrounding: true });
          priceResult = await generateObject({ model: searchGroundedModel, schema: priceSchema, prompt: pricePromptGrounded });
        } catch (groundingErr) {
          // Grounding 失敗（403 / Free Tier 限制）→ 降級為一般生成
          const errMsg = groundingErr?.message || String(groundingErr);
          console.warn(`[AI] Grounding 失敗，降級為一般生成模式。原因：${errMsg}`);
          priceResult = await generateObject({ model, schema: priceSchema, prompt: pricePromptFallback });
        }
        finalObject = priceResult.object;
        break;
      }

      case 'get-transport-suggestion':
      case 'suggest-transport': {
        // [High-Logic] Smart Router — Deep Think 優先，429/503 自動降級
        const { result: transportResult, modelUsed: transportModel } = await callAiWithFallback({
          schema: z.object({
            summary: z.string(),
            steps: z.array(z.object({
              type: z.enum(['walk', 'train', 'bus', 'taxi', 'ferry', 'other']),
              title: z.string(),
              description: z.string(),
              duration: z.string()
            }))
          }),
          prompt: `你是一位精通日本大眾運輸的交通專家。請深度推理從「${payload.prevLocation || payload.prevTitle || '起點'}」到「${payload.currentLocation || payload.currentTitle}」的最佳交通路線。\n考量因素：地鐵換乘效率、步行距離、等車時間、IC 卡適用性。\n請拆分為多個精確步驟（步行→月台→車種→出口）。繁體中文回答。`
        }, google, true);
        _modelUsed = transportModel;
        finalObject = transportResult;
        break;
      }

      case 'optimize-route': {
        // [High-Logic] Smart Router — Deep Think 優先，429/503 自動降級
        const { result: routeResult, modelUsed: routeModel } = await callAiWithFallback({
          schema: z.object({ optimizedIds: z.array(z.string()) }),
          prompt: `你是一位精通日本地理與大眾運輸的旅遊規劃師。請深度推理以下行程的最佳遊覽順序，目標是\n1. 最小化總移動距離與換乘次數\n2. 考慮各地點的步行連結性\n3. 避免來回折返\n請回傳優化後的 ID 陣列。行程資料：${JSON.stringify(payload.items)}`
        }, google, true);
        // optimize-route returns array directly; use jsonResponse with modelUsed header
        return jsonResponse(routeResult.optimizedIds, 200, routeModel);
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

    return jsonResponse(finalObject, 200, _modelUsed);

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
