require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    console.error('Error: GEMINI_API_KEY is not defined in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const localesDir = path.join(__dirname, '../public/locales');
const sourceLang = 'zh-TW';
const targetLangs = ['en', 'ja'];

async function translateText(text, targetLang) {
    const prompt = `Translate the following Traditional Chinese (Taiwan) text to ${targetLang}. 
Return ONLY the translation, no explanation, no quotes.
Text: "${text}"`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error(`Translation failed for "${text}":`, error);
        return null;
    }
}

async function main() {
    const sourcePath = path.join(localesDir, sourceLang, 'translation.json');
    if (!fs.existsSync(sourcePath)) {
        console.error(`Source locale file not found: ${sourcePath}`);
        return;
    }

    const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

    for (const lang of targetLangs) {
        const targetPath = path.join(localesDir, lang, 'translation.json');
        let targetData = {};
        if (fs.existsSync(targetPath)) {
            targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        }

        const missingKeys = Object.keys(sourceData).filter(key => !targetData[key] || targetData[key] === '');

        if (missingKeys.length === 0) {
            console.log(`[${lang}] All keys are translated.`);
            continue;
        }

        console.log(`[${lang}] Found ${missingKeys.length} missing keys. Translating...`);

        for (const key of missingKeys) {
            const translation = await translateText(sourceData[key], lang === 'en' ? 'English' : 'Japanese');
            if (translation) {
                targetData[key] = translation;
                console.log(`[${lang}] Translated: "${sourceData[key]}" -> "${translation}"`);
            }
            // Add a small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2), 'utf8');
        console.log(`[${lang}] Updated translation file.`);
    }
}

main().catch(console.error);
