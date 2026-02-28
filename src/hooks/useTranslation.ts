import { useTripStore } from '../store/useTripStore';
import { dictionaries } from '../i18n/dictionaries';

export const useTranslation = () => {
    const language = useTripStore((s) => s.uiSettings.language || 'zh-TW');

    /**
     * 輕量級翻譯函數 (t)
     * 根據目前 Zustand 的語言狀態，回傳對應的字典字串。
     * 若找不到，則 fallback 至預設顯示該 key，確保文字不會空白。
     */
    const t = (key: string): string => {
        const dict = dictionaries[language] || dictionaries['zh-TW'];
        // 也能 fallback 回中文確保不會報錯
        return dict[key] || dictionaries['zh-TW'][key] || key;
    };

    return { t, language };
};
