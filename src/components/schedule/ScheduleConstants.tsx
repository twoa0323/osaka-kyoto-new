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

export const AIRLINE_THEMES: Record<string, any> = {
    tigerair: { bgClass: 'bg-[#F49818]', textClass: 'text-white', logoHtml: <span className="font-black text-white text-xl tracking-tight">tiger<span className="font-medium">air</span> <span className="text-sm font-normal">Taiwan</span></span>, },
    starlux: { bgClass: 'bg-[#181B26]', textClass: 'text-[#C4A97A]', logoHtml: <span className="font-serif text-[#C4A97A] text-2xl font-bold tracking-widest flex items-center gap-2"><span className="text-3xl rotate-45 text-[#E6C998]">✦</span> STARLUX</span>, },
    cathay: { bgClass: 'bg-[#006564]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-xl font-bold tracking-widest flex items-center gap-2"><span className="text-3xl font-light scale-y-75 -scale-x-100">✔</span> CATHAY PACIFIC</span>, },
    china: { bgClass: 'bg-[#002855]', textClass: 'text-[#FFB6C1]', logoHtml: <span className="font-serif text-[#FFB6C1] text-lg font-black tracking-widest flex items-center gap-2"><span className="text-2xl">🌸</span> CHINA AIRLINES</span>, },
    eva: { bgClass: 'bg-[#007A53]', textClass: 'text-[#F2A900]', logoHtml: <span className="font-sans text-white text-2xl font-bold tracking-widest flex items-center gap-2"><span className="text-[#F2A900] text-3xl">⊕</span> EVA AIR</span>, },
    peach: { bgClass: 'bg-[#D93B8B]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-4xl font-black tracking-tighter lowercase pr-2">peach</span>, },
    ana: { bgClass: 'bg-[#133261]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-3xl font-black italic tracking-widest flex gap-1 items-center">ANA</span>, },
    jal: { bgClass: 'bg-[#CC0000]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-3xl font-black italic tracking-widest flex gap-1 items-center">JAL</span>, },
    other: { bgClass: 'bg-[#101424]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-xl font-black tracking-[0.2em]">BOARDING PASS</span>, }
};

export const getAirlineTheme = (airline?: string) => {
    if (!airline) return AIRLINE_THEMES.other;
    const key = Object.keys(AIRLINE_THEMES).find(k => airline.toLowerCase().includes(k));
    return key ? AIRLINE_THEMES[key] : AIRLINE_THEMES.other;
};
