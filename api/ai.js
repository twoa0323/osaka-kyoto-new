import { GoogleGenerativeAI } from "@google/generative-ai";

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
                prompt = `你是一個專業收據分析助手。請分析這張圖片並回傳純 JSON 格式資料（不要有 Markdown 標記）：
        {
          "storeName": "店家名稱",
          "title": "消費簡短描述 (例如: 午餐、購買衣服)",
          "date": "YYYY-MM-DD",
          "amount": 總金額數字,
          "currency": "貨幣代碼(如 JPY, KRW, TWD)",
          "paymentMethod": "根據內容推斷：現金/信用卡/行動支付/IC卡/其他",
          "category": "根據內容分類：餐飲/購物/交通/住宿/娛樂/藥妝/便利商店/超市/其他",
          "items": [{"name": "品項名稱", "price": 數字}]
        }`;
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
                prompt = `你在規劃日本旅遊行程。使用者上一個行程是 ${payload.prevItem.time} 在「${payload.prevItem.location} ${payload.prevItem.title}」，下一個行程是 ${payload.nextItem.time} 在「${payload.nextItem.location} ${payload.nextItem.title}」。這兩個行程中間有較長的空檔。
        請推薦一個【順路且評價好】的景點或美食（例如下午茶或小神社），時間請設定在兩者之間。
        請回傳純 JSON 格式，必須包含以下欄位：{"time":"HH:mm", "title":"推薦地點", "location":"地址或站名", "category":"sightseeing或food", "note":"推薦理由(簡短15字內)"}`;
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
                prompt = `分析以下文字旅遊行程並回傳純 JSON 陣列。
        格式: [{"time":"HH:mm", "endTime":"HH:mm", "title":"景點", "location":"地址", "category":"sightseeing/food/transport/hotel", "note":"介紹"}]。
        如果沒有結束時間，endTime請填空字串。
        日期: ${payload.date}。
        內容: ${payload.text}`;
                break;

            case 'suggest-briefing':
                prompt = payload.text;
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
        const jsonMatch = responseText.match(/[\{\[]([\s\S]*)[\}\]]/);
        if (jsonMatch) {
            res.status(200).json(JSON.parse(jsonMatch[0]));
        } else {
            res.status(200).json({ text: responseText });
        }

    } catch (error) {
        console.error("AI Proxy Error:", error);
        res.status(500).json({ error: "AI 服務異常", details: error.message });
    }
}
