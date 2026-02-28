import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 確保載入環境變數
try {
    const { config } = await import('dotenv');
    config();
} catch (e) { }

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 讀取 API Key
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ 錯誤: 找不到 GEMINI_API_KEY');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const localesDir = path.join(__dirname, '../public/locales');

// ==========================================
// 🌟 在這裡嚴格定義你的 3 種語言：
const sourceLang = 'zh-TW';           // 1. 基準語言：繁體中文
const targetLangs = ['en', 'ja'];     // 2. 目標語言：英文、日文
// ==========================================

async function translateText(text, targetLang) {
    // 提示詞明確要求：從繁體中文翻譯至目標語言，符合現代 APP 語氣
    const prompt = `Translate the following Traditional Chinese (Taiwan) text to ${targetLang}. 
Return ONLY the translation, no explanation, no quotes. Keep the tone natural and concise for a modern mobile app UI.
Text: "${text}"`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error(`❌ 翻譯失敗 "${text}":`, error);
        return null;
    }
}

// 遞迴比對中、英、日 JSON 檔案，自動填補空缺
async function processNode(sourceNode, targetNode, lang) {
    let updated = false;

    for (const key in sourceNode) {
        if (typeof sourceNode[key] === 'object' && sourceNode[key] !== null) {
            // 處理巢狀結構 (例如 "ai": { "amount": "金額" })
            if (!targetNode[key]) targetNode[key] = {};
            const childUpdated = await processNode(sourceNode[key], targetNode[key], lang);
            updated = updated || childUpdated;
        } else {
            // 處理純文字
            const textToTranslate = sourceNode[key];

            // 條件：英文或日文原本是空的 + 中文不是空的 + 中文不是系統代碼(不包含 '.')
            if ((!targetNode[key] || targetNode[key] === '') &&
                textToTranslate && textToTranslate.trim() !== '' && !textToTranslate.includes('.')) {

                console.log(`[${lang}] 發現缺漏，正在翻譯: "${textToTranslate}" ...`);
                const langName = lang === 'en' ? 'English' : 'Japanese';
                const translation = await translateText(textToTranslate, langName);

                if (translation) {
                    targetNode[key] = translation;
                    console.log(`[${lang}] ✅ 成功: "${textToTranslate}" -> "${translation}"`);
                    updated = true;
                    // 加入 500ms 延遲，避免 API 請求過快被阻擋
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
    }
    return updated;
}

async function main() {
    const sourcePath = path.join(localesDir, sourceLang, 'translation.json');
    if (!fs.existsSync(sourcePath)) {
        console.error(`❌ 找不到基準中文檔: ${sourcePath}`);
        return;
    }

    // 讀取繁體中文作為唯一基準
    const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

    // 分別檢查並翻譯 英文(en) 與 日文(ja)
    for (const lang of targetLangs) {
        console.log(`\n=== 🔍 開始處理 [${lang}] 語言檔 ===`);
        const targetPath = path.join(localesDir, lang, 'translation.json');

        let targetData = {};
        if (fs.existsSync(targetPath)) {
            targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        }

        const isUpdated = await processNode(sourceData, targetData, lang);

        if (isUpdated) {
            fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2), 'utf8');
            console.log(`🎉 [${lang}] 更新完成並已存檔！`);
        } else {
            console.log(`✨ [${lang}] 已經全部翻譯完畢，無需更新。`);
        }
    }
    console.log(`\n🚀 所有多語言 (zh-TW, en, ja) 處理完畢！`);
}

main().catch(console.error);
