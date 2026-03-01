import { Camera, Utensils, Plane, Home } from 'lucide-react';

export const ICON_MAP = { sightseeing: Camera, food: Utensils, transport: Plane, hotel: Home };

export const CATEGORY_STYLE: any = {
    sightseeing: { bg: 'bg-p3-ruby/10', text: 'text-p3-ruby', label: 'SIGHTSEEING', splat: 'var(--p3-ruby)' },
    food: { bg: 'bg-splat-yellow/10', text: 'text-p3-navy', label: 'FOOD', splat: 'var(--p3-yellow)' },
    transport: { bg: 'bg-splat-blue/10', text: 'text-splat-blue', label: 'TRANSPORT', splat: 'var(--p3-blue)' },
    hotel: { bg: 'bg-p3-navy/10', text: 'text-p3-navy', label: 'HOTEL', splat: 'var(--p3-navy)' },
    ana: { bgClass: 'bg-[#1F419B]', textClass: 'text-white', logo: 'ANA' },
    jal: { bgClass: 'bg-[#CC0000]', textClass: 'text-white', logo: 'JAL' },
    other: { bgClass: 'bg-p3-navy', textClass: 'text-white', logo: 'FLIGHT' }
};

export const CITY_DB = [
    { keys: ['東京', 'Tokyo', '新宿', '淺草', '澀谷', '迪士尼'], name: 'TOKYO', lat: 35.6895, lng: 139.6917 },
    { keys: ['京都', 'Kyoto', '清水寺', '嵐山', '金閣寺'], name: 'KYOTO', lat: 35.0116, lng: 135.7681 },
    { keys: ['大阪', 'Osaka', '難波', '心齋橋', '環球影城'], name: 'OSAKA', lat: 34.6937, lng: 135.5023 },
    { keys: ['奈良', 'Nara', '東大寺', '春日大社'], name: 'NARA', lat: 34.6851, lng: 135.8050 },
    { keys: ['神戶', 'Kobe', '有馬溫泉'], name: 'KOBE', lat: 34.6901, lng: 135.1955 },
    { keys: ['福岡', 'Fukuoka', '博多', '太宰府'], name: 'FUKUOKA', lat: 33.5902, lng: 130.4017 },
    { keys: ['名古屋', 'Nagoya'], name: 'NAGOYA', lat: 35.1815, lng: 136.9066 },
    { keys: ['金澤', 'Kanazawa'], name: 'KANAZAWA', lat: 36.5613, lng: 136.6562 },
    { keys: ['札幌', 'Sapporo', '即幌'], name: 'SAPPORO', lat: 43.0618, lng: 141.3545 },
];

export const getAirlineTheme = (airline?: string) => {
    const al = (airline || '').toLowerCase();
    if (al.includes('ana')) return CATEGORY_STYLE.ana;
    if (al.includes('jal')) return CATEGORY_STYLE.jal;
    return CATEGORY_STYLE.other;
};
