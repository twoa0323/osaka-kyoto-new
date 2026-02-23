import { GoogleGenerativeAI } from "@google/generative-ai";
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { action, payload } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    let prompt = "";
    let inlineData = null;

    switch (action) {
      case 'analyze-receipt':
        prompt = `你是一個專業收據分析助手。請精確分析這張圖片，特別注意每一項商品的明細與對應價格，並回傳純 JSON 格式資料（不要有 Markdown 標記）：
        {
          "storeName": "店家名稱",
          "title": "消費簡短描述 (例如: 藥妝購買、晚餐)",
          "date": "YYYY-MM-DD",
          "amount": 總金額數字 (應等於所有 items 價格總和或收據總計),
          "currency": "貨幣代碼(如 JPY, KRW, TWD)",
          "paymentMethod": "根據內容推斷：現金/信用卡/行動支付/IC卡/其他",
          "category": "根據內容分類：餐飲/購物/交通/住宿/娛樂/藥妝/便利商店/超市/其他",
          "items": [
            {
              "name": "品項完整名稱",
              "price": 該品項的單價或小計數字
            }
          ]
        }
        注意：請確保 items 中的價格是正確的，且名稱儘量保持原始語言（如日文）與中文對照。`;
        inlineData = { data: payload.imageBase64, mimeType: "image/jpeg" };
        break;

      case 'parse-screenshot':
        const { type } = payload;
        if (type === 'flight') {
          prompt = `這是一張機票或航班預訂截圖。請解析並回傳純 JSON 格式。包含：airline, flightNo, date(YYYY-MM-DD), depIata, arrIata, depTime, arrTime, depCity, arrCity, duration, baggage, seat, aircraft (無資訊留空)。`;
        } else if (type === 'hotel') {
          prompt = `這是一張住宿預訂截圖。請解析並回傳純 JSON 格式。包含：title(飯店名), location(地址), date(入住日期YYYY-MM-DD), endDate(退房日期), nights(晚數數字), confirmationNo(訂單編號), roomType(房型), contactPhone(飯店電話)。無資訊請留空字串。`;
        } else {
          prompt = `這是一張景點門票或交通憑證截圖。請解析並回傳純 JSON 格式。包含：title(票券名稱), date(使用日期YYYY-MM-DD), endDate(失效日期，若無留空), entryTime(指定入場時間HH:mm), ticketType(票種/人數，如成人x2), confirmationNo(訂單或憑證號), exchangeLocation(兌換地點), location(景點地址)。無資訊請留空字串。`;
        }
        inlineData = { data: payload.imageBase64, mimeType: "image/jpeg" };
        break;

      case 'suggest-gap':
        const prefs = payload.preferences ? `。使用者的個人偏好參考：${payload.preferences}` : "";
        prompt = `你在規劃日本旅遊行程。使用者上一個行程是 ${payload.prevItem.time} 在「${payload.prevItem.location} ${payload.prevItem.title}」，下一個行程是 ${payload.nextItem.time} 在「${payload.nextItem.location} ${payload.nextItem.title}」。這兩個行程中間有較長的空檔。
        請根據兩點之間的距離位置，並結合使用者的愛好推薦一個【順路且評價好】的景點或美食${prefs}。
        請回傳純 JSON 格式，必須包含以下欄位：{"time":"HH:mm", "title":"推薦地點", "location":"地址或站名", "category":"sightseeing或food", "note":"推薦理由(簡短15字內，若有符合偏好請點出)"}`;
        break;

      case 'suggest-transport':
        if (payload.prevItem && payload.prevLocation !== payload.currentLocation) {
          prompt = `你在規劃日本旅遊行程。使用者上一站是「${payload.prevLocation} ${payload.prevTitle}」，接下來要去「${payload.currentLocation} ${payload.currentTitle}」。
           請提供大眾運輸交通建議（例如：搭乘哪一條地鐵線、在哪一站上下車、需不需要轉車、大約花費時間）。
           請用繁體中文，語氣活潑，長度控制在 100 字以內，並直接回傳純文字，不需 Markdown。`;
        } else {
          prompt = `你在規劃日本旅遊行程。使用者準備前往「${payload.currentLocation} ${payload.currentTitle}」。
           請提供如何抵達該地點的大眾運輸交通建議。
           請用繁體中文，語氣活潑，長度控制在 100 字以內，並直接回傳純文字，不需 Markdown。`;
        }
        break;

      case 'batch-parse':
        prompt = `你是一個專業的旅遊行程解析專家。請分析以下文字，將其拆解為結構化的旅遊資訊。
        
        【限制條件】
        - 旅程總日期範圍：${payload.startDate} 至 ${payload.endDate}
        - 目前焦點日期（預設）：${payload.date}
        
        【解析規則】
        1. **精確日期分配**：
           - 若提到「第一天、Day 1、D1」，請對應到 ${payload.startDate}。
           - 若提到「明天、隔天」，請對應到與其前一個項目相比的下一天。
           - 若提到具體日期（如 2/25），請補全為 YYYY-MM-DD 格式。
           - 若完全不明確，請預設使用目前焦點日期 ${payload.date}。
        2. **分類邏輯**：
           - 機票/住宿/專車/票券確認單 -> booking
           - 具體幾點去哪的景點或用餐 -> schedule
           - 帶有星等描述或純粹美食分享 -> journal
           - 明確的採購清單 -> shopping
           - 瑣碎筆記、地圖網址或一般資訊 -> info
        3. **格式要求**：回傳純 JSON，不含 Markdown。
        
        【回傳結構】
        {
          "schedule": [{"date":"YYYY-MM-DD", "time":"HH:mm", "endTime":"HH:mm", "title":"名稱", "location":"地址", "category":"sightseeing/food/transport/hotel", "note":"介紹"}],
          "booking": [{"type":"flight/hotel/spot/voucher", "title":"名稱", "date":"YYYY-MM-DD", "location":"地址", "note":"備註", "flightNo":"航班號", "airline":"航空公司", "confirmationNo":"確認號"}],
          "journal": [{"title":"名稱", "content":"內容", "rating":1-5, "location":"地址", "date":"YYYY-MM-DD"}],
          "shopping": [{"title":"品項", "note":"備議", "category":"分類"}],
          "info": [{"type":"note/ticket/custom", "title":"標題", "content":"內容", "url":"網址"}]
        }
        
        【待解析文字】
        ${payload.text}`;
        break;

      case 'suggest-briefing':
        prompt = payload.text;
        break;

      case 'get-spot-guide':
        prompt = `你是一個專業的日本旅遊導覽人員。請針對景點「${payload.location} ${payload.title}」提供專業的背景介紹與必看亮點。
        請直接回傳排版精美的 Markdown 文字，以便直接渲染在畫面上。
        包含：
        1. 約 100 字左右的歷史背景或文化介紹
        2. 必看亮點 (使用條列式)
        3. 建議停留時間
        語氣請專業且活潑，使用繁體中文。`;

        const spotResult = streamText({
          model: google('gemini-3-flash-preview'),
          prompt: prompt,
        });

        // 利用 sendToNodeResponse 或是直接回傳（為了相容 Vercel Serverless Function)
        // 使用者指定：將該 endpoint 的 Response 改為回傳 result.toDataStreamResponse()
        // 為了確保原生的 req/res 支持 Web Response，Vercel 現在會處理 handler 中回傳的 Response
        return spotResult.toDataStreamResponse();

      case 'optimize-route':
        prompt = `你是一個專業的行程優化助手。請分析以下行程點的內容與地理位置（位於日本），並重新安排順序以最小化交通移動距離（類似 TSP 優化）。
        
        待優化行程如下（JSON 陣列）：
        ${JSON.stringify(payload.items)}

        請直接回傳「優化後的項目 ID 排序陣列」，格式如下：
        ["id_1", "id_2", "id_3", ...]
        
        請注意：
        1. 僅回傳 JSON 陣列，不要有任何其他標記或文字。
        2. 考慮景點的地理鄰近性，讓行程更順路。`;
        break;

      case 'get-expense-insight':
        prompt = `你是一個專業的旅遊理財顧問。請分析以下支出明細與預算，並提供專業的洞察與建議。
        
        【支出明細】
        ${JSON.stringify(payload.expenses)}
        
        【預算資訊】
        - 總預算 (TWD): ${payload.budget}
        - 目前總支出 (TWD): ${payload.totalSpent}
        - 匯率參考: ${payload.rate} (JPY/TWD)
        
        請回傳純 JSON 格式（不要有 Markdown）：
        {
          "summary": "一句話總結目前的消費狀況",
          "tips": ["建議1", "建議2", "建議3"],
          "alertLevel": "safe" | "warning" | "critical"
        }
        
        【評級標準】
        - safe: 支出 < 70% 預算
        - warning: 支出 70-90% 預算
        - critical: 支出 > 90% 預算
        
        語氣請幽默、專業且活潑，使用繁體中文。若支出類別過度集中在某一項（如購物），請給予具體建議。`;
        break;

      case 'research-product-price':
        prompt = `你是一個專業的購物格價專家。請針對以下產品在日本市場的行情進行研究（參考網站如 Kakaku, Bic Camera, Yodobashi 等）。
        
        【產品細節】
        - 產品名稱: ${payload.title}
        - 分類: ${payload.category}
        - 目前預設幣別: ${payload.currency}
        
        請回傳純 JSON 格式（不要有 Markdown）：
        {
          "currentMarketPrice": 數字 (JPY),
          "shopName": "推薦購買或目前最低價的商店名稱",
          "advice": "針對此產品的購買建議 (繁體中文)",
          "isGoodDeal": true/false (若當前市場價格合理則為 true)
        }
        
        請注意：
        1. 價格以日圓 (JPY) 為主。
        2. 建議應包含是否有更划算的購買地點或稅率考量。`;
        break;

      case 'batch-screenshot-parse':
      case 'universal-magic-import':
        {
          const { images, text: inputText } = payload;
          prompt = `你是一個專業的旅遊數據提取與自動化專家。請分析提供的數據（圖片或文字），並將其轉換為結構化的 JSON 格式。
        
        【旅程細節】
        - 總日期：${payload.startDate || '未提供'} 至 ${payload.endDate || '未提供'}
        - 目前匯率 (JPY/TWD): ${payload.rate || 4.7}
        
        【解析規則】
        1. **expenses (支出)**：收據、發票。
        2. **bookings (預訂)**：飯店、機票、門票、交通憑證。
        3. **schedules (行程與景點)**：行程表、景點介紹、地圖導引。
        4. **journals (美食與紀錄)**：餐廳推薦、美食心得。
        5. **shopping (購物)**：想要購買的商品清單。
        6. **info (資訊)**：交通教學、入境指南、瑣碎備註。

        【跨模組自動化觸發 (triggers)】
        分析內容，若符合以下條件請在 triggers 陣列中加入對應代碼：
        - "add_to_packing": 內容提到需要準備特定物品（如：需帶泳衣、要帶身分證）。
        - "set_map_coords": 景點或飯店名稱明確且適合抓取座標。
        - "budget_alert": 單筆金額超過預算的 20%。

        【格式要求】直接回傳純 JSON，不要 Markdown 標記。
        
        【回傳結構】
        {
          "expenses": [{ "date": "YYYY-MM-DD", "storeName": "...", "title": "...", "amount": 0, "currency": "JPY", "category": "...", "method": "..." }],
          "bookings": [{ "type": "hotel/flight/transport/spot/voucher", "title": "...", "date": "YYYY-MM-DD", "confirmationNo": "...", "location": "...", "note": "..." }],
          "schedules": [{ "date": "YYYY-MM-DD", "time": "HH:mm", "title": "...", "location": "...", "category": "...", "note": "..." }],
          "journals": [{ "date": "YYYY-MM-DD", "title": "...", "content": "...", "location": "...", "rating": 5 }],
          "shopping": [{ "title": "...", "price": 0, "currency": "JPY", "category": "...", "note": "..." }],
          "info": [{ "type": "...", "title": "...", "content": "...", "url": "..." }],
          "triggers": ["add_to_packing", "set_map_coords"],
          "suggestedPackingItems": ["物品1", "物品2"]
        }`;

          try {
            const parts = [prompt];
            if (images && images.length > 0) {
              images.forEach(imgBase64 => {
                parts.push({ inlineData: { data: imgBase64, mimeType: "image/jpeg" } });
              });
            }
            if (inputText) {
              parts.push(`【待處理文字內容】\n${inputText}`);
            }

            const result = await model.generateContent(parts);
            const responseText = result.response.text();
            try {
              // 優先尋找 Markdown JSON 代碼塊
              const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
              let jsonToParse = codeBlockMatch ? codeBlockMatch[1] : responseText;

              // 尋找 JSON 邊界
              const jsonMatch = jsonToParse.match(/[\{\[]([\s\S]*)[\}\]]/);
              return res.status(200).json(jsonMatch ? JSON.parse(jsonMatch[0]) : {});
            } catch (err) {
              console.error("Universal Import JSON Parse Error:", err, responseText);
              return res.status(500).json({ error: "Import Failed: Bad JSON format", details: err.message });
            }
          } catch (err) {
            console.error("Universal Import Error:", err);
            return res.status(500).json({ error: "Import Failed", details: err.message });
          }
        }

      case 'get-spot-details':
        {
          const { title, location } = payload;
          prompt = `你是一個地理位置導航專家。請幫我搜尋並回傳該景點/店家的具體資訊。
          名稱：${title}
          地點(概略)：${location || '日本'}
          
          請回傳純 JSON（若找不到則欄位留空）：
          {
            "address": "完整詳細地址",
            "lat": 0.0,
            "lng": 0.0,
            "phone": "電話號碼",
            "url": "官方網站或地圖連結"
          }`;
          try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            try {
              const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
              let jsonToParse = codeBlockMatch ? codeBlockMatch[1] : responseText;

              const jsonMatch = jsonToParse.match(/[\{\[]([\s\S]*)[\}\]]/);
              return res.status(200).json(jsonMatch ? JSON.parse(jsonMatch[0]) : {});
            } catch (err) {
              console.error("Get Spot Details JSON Parse Error:", err, responseText);
              return res.status(500).json({ error: "Search Failed: Bad JSON format", details: err.message });
            }
          } catch (err) {
            console.error("Get Spot Details Error:", err);
            return res.status(500).json({ error: "Search Failed" });
          }
        }

      case 'get-image-for-item':
        const { title, location, category } = payload;
        try {
          // 1. AI 判斷搜尋關鍵字與抓取策略
          const searchPrompt = `你是一個旅遊圖片搜尋助手。使用者現在有一個旅遊項目：
                    - 標題：${title}
                    - 地點：${location || '未知'}
                    - 分類：${category}
                    
                    請幫我判斷：
                    1. 它是具體的著名品牌/地標/飯店嗎？(isFamous: true/false)
                    2. 搜尋維基百科的最佳關鍵字 (wikiQuery)
                    3. 搜尋一般美圖的最佳關鍵字 (genericQuery - 英文)
                    
                    請回傳 JSON: {"isFamous": true, "wikiQuery": "...", "genericQuery": "..."}`;

          const searchResult = await model.generateContent(searchPrompt);
          const responseText = searchResult.response.text();
          const cleanedText = responseText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

          const match = cleanedText.match(/\{[\s\S]*\}/);
          if (!match) return res.status(200).json({ imageUrl: "" }); // 找不到 JSON 就放棄圖片，不要崩潰
          const searchInfo = JSON.parse(match[0]);

          let imageUrl = "";

          if (searchInfo.isFamous) {
            // 2a. 嘗試從維基百科抓取 (先嘗試日文再嘗試英文)
            const wikiApis = [
              `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchInfo.wikiQuery)}&prop=pageimages&format=json&pithumbsize=1000&formatversion=2`,
              `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchInfo.wikiQuery)}&prop=pageimages&format=json&pithumbsize=1000&formatversion=2`
            ];

            for (const api of wikiApis) {
              const wikiRes = await fetch(api).then(r => r.json());
              const page = wikiRes.query?.pages?.[0];
              if (page?.thumbnail?.source) {
                imageUrl = page.thumbnail.source;
                break;
              }
            }
          }

          if (!imageUrl) {
            // 2b. 退而求其次使用 Unsplash (使用遺留的 Source API 或關鍵字規則)
            // 注意：Source Unsplash 是比較穩定的關鍵字跳轉方式
            imageUrl = `https://images.unsplash.com/photo-1?q=80&w=1000&auto=format&fit=crop&sig=${Math.random()}&keywords=${encodeURIComponent(searchInfo.genericQuery)}`;
            // 實際上 Unsplash Source API 已停用但可用此方式模擬一個漂亮占位圖或直接跳轉
            // 這裡改用 Pixabay 或其他公開的動態關鍵字圖片源
            imageUrl = `https://loremflickr.com/1080/720/${encodeURIComponent(searchInfo.genericQuery)}`;
          }

          return res.status(200).json({ imageUrl });

        } catch (err) {
          console.error("Image Fetch Error:", err);
          return res.status(200).json({ imageUrl: "" });
        }

      case 'suggest-packing-list':
        prompt = `你是一個專業的旅遊準備計畫員。請根據以下旅程資訊，為使用者生成一份詳細的「行李清單」。
        
        【旅程資訊】
        - 目的地：${payload.destination}
        - 季節/日期：${payload.startDate} 至 ${payload.endDate}
        - 預計天天氣狀況：${payload.weatherSummary || '未提供'}
        - 旅行風格：${payload.style || '一般旅遊'}
        
        【任務】
        1. 根據天數計算衣物數量。
        2. 考慮目的地的天氣（例如：日本冬季需發熱衣、夏季需遮陽傘）。
        3. 分類包含：衣物 (Clothing)、洗漱用品 (Toiletries)、電子產品 (Electronics)、重要證件 (Documents)、藥品 (Medicine)、其他 (Others)。
        4. 提供每項推薦的「數量 (quantity)」與簡短「備註 (note)」。
        
        請回傳純 JSON 格式（不要有 Markdown 標記）：
        {
          "packingList": [
            {
              "title": "物品名稱",
              "category": "類別",
              "quantity": 1,
              "note": "備註建議"
            }
          ]
        }`;
        break;

      case 'suggest-weather-fallback':
        prompt = `你是一個專業的旅遊行程分析師。目前使用者在 ${payload.location} 遇到了 ${payload.weather} 天氣。
        
        【原始行程】
        ${JSON.stringify(payload.currentItems)}
        
        【偏好參考】
        ${payload.preferences || '無特定偏好'}
        
        【任務】
        1. 找出原始行程中受天氣影響不建議前往的「戶外景點」。
        2. 針對該點推薦一個附近的「室內替代方案」（例如：室內樂園、百貨公司、博物館、地下街、咖啡廳、室內展望台等）。
        3. 推薦內容必須精確對應到該城市的實際景點。
        
        請回傳純 JSON 格式（不要有 Markdown 標記）：
        {
          "reason": "為什麼要更換？一段幽默且具斯普拉遁風格的提醒 (包含 🦑 Emoji)",
          "recommendations": [
            {
              "originalId": "原始行程項目的 ID",
              "newTitle": "推薦的新景點/活動名稱",
              "newLocation": "推薦點的實際位置描述",
              "newCategory": "sightseeing/food/shopping",
              "newNote": "推薦理由與特色說明",
              "newLat": 數字,
              "newLng": 數字
            }
          ]
        }`;
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    const result = inlineData
      ? await model.generateContent([prompt, { inlineData }])
      : await model.generateContent(prompt);

    const responseText = result.response.text();

    // 如果是建議類（純文字），直接回傳
    if (action === 'suggest-transport' || action === 'suggest-briefing') {
      return res.status(200).json({ text: responseText.trim() });
    }

    // 如果是解析類（JSON），嘗試提取 JSON
    try {
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      let jsonToParse = codeBlockMatch ? codeBlockMatch[1] : responseText;

      const jsonMatch = jsonToParse.match(/[\{\[]([\s\S]*)[\}\]]/);
      if (jsonMatch) {
        res.status(200).json(JSON.parse(jsonMatch[0]));
      } else {
        res.status(200).json({ text: responseText });
      }
    } catch (parseError) {
      console.error("JSON Parse Error in Generalized Handler:", parseError, responseText);
      res.status(200).json({ text: responseText }); // Fallback to raw text
    }

  } catch (error) {
    console.error("AI Proxy Error:", error);
    res.status(500).json({ error: "AI 服務異常", details: error.message });
  }
}
