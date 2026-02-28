import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useTripStore } from '../store/useTripStore';
import { useEffect } from 'react';

export const useTranslation = () => {
    const { t, i18n } = useI18nTranslation();
    const language = useTripStore((s) => s.uiSettings.language || 'zh-TW');

    useEffect(() => {
        if (i18n.language !== language) {
            i18n.changeLanguage(language);
        }
    }, [language, i18n]);

    return { t, language };
};
