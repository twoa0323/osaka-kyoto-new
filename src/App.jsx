import { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Plane, Train, Home, Utensils, Camera, Star, Info, 
  Map as MapIcon, ShieldAlert, Copy, ExternalLink, 
  Target, Navigation, ChevronUp, ChevronDown, Trash2, 
  X, Image as ImageIcon, ReceiptText, Sparkles, Loader2, 
  Clock, MapPinOff, Sun, Cloud, CloudRain, CloudLightning, 
  Snowflake, Crown // 新增 Crown 圖示用於 Highlight
} from 'lucide-react';

// --- API 設定 ---
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
// 移除 OPENWEATHER_API_KEY
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// --- 靜態資料 ---
const CITY_COORDS = {
    'Kyoto': { lat: 35.0116, lon: 135.7681 },
    'Arashiyama': { lat: 35.0116, lon: 135.67 },
    'Uji': { lat: 34.8893, lon: 135.8077 },
    'Osaka': { lat: 34.6937, lon: 135.5023 },
    'USJ': { lat: 34.6654, lon: 135.4323 },
    'Minoo': { lat: 34.8266, lon: 135.4707 },
    'Airport': { lat: 34.4320, lon: 135.2304 }
};

// --- [新功能] 類別顏色與設定 (對應 IMG_5968 的顏色邏輯) ---
const CATEGORY_CONFIG = {
    'FLIGHT': { color: '#60A5FA', icon: Plane, label: 'FLIGHT' }, // 淺藍
    'TRANSPORT': { color: '#94A3B8', icon: Train, label: 'TRANSPORT' }, // 灰藍
    'HOTEL': { color: '#A78BFA', icon: Home, label: 'HOTEL' }, // 紫色
    'FOOD': { color: '#F97316', icon: Utensils, label: 'FOOD' }, // 橘色
    'SIGHTSEEING': { color: '#34D399', icon: Camera, label: 'SIGHTSEEING' }, // 綠色 (如圖中的金麟湖)
    'HIGHLIGHT': { color: '#D4AF37', icon: Crown, label: 'SPECIAL EXPERIENCE' }, // 金色
    'INFO': { color: '#9CA3AF', icon: Info, label: 'INFO' },
    'MAP': { color: '#3B82F6', icon: MapIcon, label: 'MAP' },
    'VJW': { color: '#EC4899', icon: ExternalLink, label: 'VJW' },
    'EMERGENCY': { color: '#EF4444', icon: ShieldAlert, label: 'EMERGENCY' },
    'CARD': { color: '#64748B', icon: ReceiptText, label: 'MEMO' }
};

const WEATHER_ICONS = {
    'sun': Sun,
    'cloud': Cloud,
    'cloud-rain': CloudRain,
    'cloud-lightning': CloudLightning,
    'snowflake': Snowflake,
    'default': Sun
};

const INITIAL_PLAN = [
    { id: 1, date: '25', day: 'SAT', title: '抵達京都與鴨川', city: 'Kyoto', defaultImg: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000', customImg: null, items: [{ id: 101, time: '13:25', title: '出發 (JX846)', desc: '星宇航空 TPE 直飛 KIX', type: 'FLIGHT', location: '關西國際機場', highlight: false }, { id: 102, time: '16:00', title: '錦市場巡禮', desc: '品嚐豆乳甜甜圈與三木雞卵', type: 'FOOD', location: '錦市場', highlight: false }] },
    { id: 2, date: '26', day: 'SUN', title: '嵐山新綠', city: 'Arashiyama', defaultImg: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=1000', customImg: null, items: [{ id: 201, time: '09:30', title: '嵐山竹林之道', desc: '漫步綠意之道', type: 'SIGHTSEEING', location: '嵐山', highlight: false }] },
    { id: 3, date: '27', day: 'MON', title: '任天堂博物館', city: 'Uji', defaultImg: 'https://images.unsplash.com/photo-1601362840469-51e4d8d59085?q=80&w=1000', customImg: null, items: [{ id: 301, time: '11:00', title: '任天堂博物館', desc: 'Nintendo Museum (預約制)', type: 'HIGHLIGHT', location: 'Nintendo Museum', highlight: true }] },
    { id: 4, date: '28', day: 'TUE', title: '清水舞台參拜', city: 'Kyoto', defaultImg: 'https://images.unsplash.com/photo-1528164344705-47542687990d?q=80&w=1000', customImg: null, items: [{ id: 401, time: '08:30', title: '清水寺', desc: '音羽瀑布與產寧坂', type: 'SIGHTSEEING', location: '清水寺', highlight: false }] },
    { id: 5, date: '29', day: 'WED', title: '大阪古今巡禮', city: 'Osaka', defaultImg: 'https://images.unsplash.com/photo-1590253504396-72449038bc4a?q=80&w=1000', customImg: null, items: [{ id: 501, time: '10:00', title: '大阪城公園', desc: '登上天守閣俯瞰市景', type: 'SIGHTSEEING', location: '大阪城', highlight: false }] },
    { id: 6, date: '30', day: 'THU', title: '環球影城 USJ', city: 'USJ', defaultImg: 'https://images.unsplash.com/photo-1616422285623-13ff0167c95c?q=80&w=1000', customImg: null, items: [{ id: 601, time: '08:30', title: 'USJ 入園冒險', desc: '瑪利歐與哈利波特全日遊', type: 'HIGHLIGHT', location: '日本環球影城', highlight: true }] },
    { id: 7, date: '01', day: 'FRI', title: '勝尾寺祈福', city: 'Minoo', defaultImg: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=1000', customImg: null, items: [{ id: 701, time: '11:00', title: '勝尾寺', desc: '祈求勝運的達摩之寺', type: 'SIGHTSEEING', location: '勝尾寺', highlight: false }] },
    { id: 8, date: '02', day: 'SAT', title: '返程台北', city: 'Airport', defaultImg: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?q=80&w=1000', customImg: null, items: [{ id: 801, time: '13:25', title: '回程起飛', desc: '結束愉快 8 天行程', type: 'FLIGHT', location: '關西機場', highlight: false }] }
];

const INITIAL_INFO = [
  { id: 'map', type: 'MAP', title: 'Google Maps', content: '開啟地圖導航', link: 'Osaka' },
  { id: 'vjw', type: 'VJW', title: 'Visit Japan Web', content: '入境審查 & 海關申報 (請截圖)', link: 'https://www.vjw.digital.go.jp/' },
  { id: 'sos', type: 'EMERGENCY', title: '緊急聯絡 & 支援', content: 'Police 110 / Medical 119', link: '' },
  { id: 1, type: 'CARD', title: 'Toyota Rent a Car', content: '4/25 取車', link: '' },
  { id: 2, type: 'CARD', title: '東橫INN 京都四條烏丸', content: '四條通 2-14 (確認碼: TN-7729)', link: '' }
];

export default function App() {
    const load = (k, i) => { 
        if (typeof window !== 'undefined') {
            const s = localStorage.getItem(k); 
            return s ? JSON.parse(s) : i; 
        }
        return i;
    };
    
    const [days, setDays] = useState(() => load('travel_days_v14', INITIAL_PLAN));
    const [expenses, setExpenses] = useState(() => load('exp_v13', []));
    const [infoItems, setInfoItems] = useState(() => load('info_v13', INITIAL_INFO));
    const [view, setView] = useState('plan');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [gpsOn, setGpsOn] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    
    // AI Modal State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiInputText, setAiInputText] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    // Other Modals
    const [editingItem, setEditingItem] = useState(null);
    const [editingExpense, setEditingExpense] = useState(null);
    const [editingInfo, setEditingInfo] = useState(null);
    const [detailItem, setDetailItem] = useState(null);

    const [currentRate, setCurrentRate] = useState(0.22); 
    const [weatherData, setWeatherData] = useState([]); 

    const fileRef = useRef(null);
    const coverRef = useRef(null);

    // Persistence
    useEffect(() => {
        localStorage.setItem('travel_days_v14', JSON.stringify(days));
        localStorage.setItem('exp_v13', JSON.stringify(expenses));
        localStorage.setItem('info_v13', JSON.stringify(infoItems));
    }, [days, expenses, infoItems]);

    // Exchange Rate API
    useEffect(() => {
        fetch('https://open.er-api.com/v6/latest/JPY')
            .then(res => res.json())
            .then(data => { if(data?.rates?.TWD) setCurrentRate(data.rates.TWD); })
            .catch(console.error);
    }, []);

    // --- [修改] Open-Meteo Weather API ---
    // 將 WMO Code 轉換為內部 Icon 名稱
    const getWeatherIconName = (code) => {
        if (code === 0 || code === 1) return 'sun';
        if (code === 2 || code === 3) return 'cloud';
        if ([45, 48].includes(code)) return 'cloud'; // Fog
        if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'cloud-rain';
        if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowflake';
        if ([95, 96, 99].includes(code)) return 'cloud-lightning';
        return 'sun';
    };

    useEffect(() => {
        const cityKey = days[selectedIdx]?.city || 'Kyoto';
        const coords = CITY_COORDS[cityKey];
        
        if (coords) {
            // Open-Meteo endpoint (免費、無需 Key)
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=1`;
            
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if(data.hourly) {
                        // 取得當前時間後 8 小時的預報
                        const currentHour = new Date().getHours();
                        const startIndex = currentHour; 
                        const slicedTimes = data.hourly.time.slice(startIndex, startIndex + 8);
                        const slicedTemps = data.hourly.temperature_2m.slice(startIndex, startIndex + 8);
                        const slicedCodes = data.hourly.weathercode.slice(startIndex, startIndex + 8);

                        const formattedData = slicedTimes.map((t, i) => {
                            const date = new Date(t);
                            return {
                                time: `${date.getHours()}:00`,
                                temp: Math.round(slicedTemps[i]),
                                icon: getWeatherIconName(slicedCodes[i])
                            };
                        });
                        setWeatherData(formattedData);
                    }
                })
                .catch(err => {
                    console.error("Weather fetch error", err);
                    setWeatherData(getFallbackWeather());
                });
        } else {
            setWeatherData(getFallbackWeather());
        }
    }, [selectedIdx, days]);

    // AI Logic (保持原本的優化版本)
    const handleAiAnalyze = async () => {
        if (!aiInputText.trim()) return alert("請輸入行程文字！");
        if (!GEMINI_API_KEY) return alert("請先在 .env 設定 VITE_GEMINI_API_KEY");
        setIsAiProcessing(true);
        try {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-3-pro-flash" });
            const prompt = `
                你是一個專業的旅遊行程轉換器。請將用戶提供的文字行程轉換為 JSON 陣列。
                目標 JSON 結構:
                [
                  {
                    "title": "該日主題", 
                    "city": "Kyoto/Arashiyama/Uji/Osaka/USJ/Minoo/Airport",
                    "items": [
                      {
                        "time": "HH:MM",
                        "title": "活動名稱",
                        "desc": "簡短描述(15字內)",
                        "type": "FLIGHT/TRANSPORT/HOTEL/FOOD/SIGHTSEEING/HIGHLIGHT",
                        "location": "GoogleMap搜尋關鍵字",
                        "highlight": false
                      }
                    ]
                  }
                ]
                用戶輸入：${aiInputText}
                請只回傳 JSON 字串，不要 Markdown。
            `;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
            const aiData = JSON.parse(text);

            const newDays = days.map((day, index) => {
                const aiDay = aiData[index];
                if (!aiDay) return day;
                return {
                    ...day,
                    title: aiDay.title || day.title,
                    city: aiDay.city || day.city,
                    items: aiDay.items.map((item, i) => ({
                        id: Date.now() + index * 1000 + i,
                        time: item.time || "09:00",
                        title: item.title || "未命名行程",
                        desc: item.desc || "",
                        type: item.type || "SIGHTSEEING",
                        location: item.location || item.title,
                        highlight: item.highlight || false,
                        btnLabel: '資訊',
                        link: ''
                    }))
                };
            });
            setDays(newDays);
            setIsAiModalOpen(false);
            setAiInputText('');
            alert("行程匯入成功！");
        } catch (error) {
            console.error("AI Error:", error);
            alert(`AI 分析失敗: ${error.message}`);
        } finally {
            setIsAiProcessing(false);
        }
    };

    // Helpers
    const getFallbackWeather = () => ["12:00", "15:00", "18:00", "21:00", "00:00"].map((t, i) => ({ time: t, temp: 18 - i, icon: 'sun' }));
    const currentDay = days[selectedIdx] || days[0];
    const firstItem = currentDay?.items?.[0] || { title: '目的地', location: 'Japan' };
    const totalTWD = expenses.reduce((a, c) => a + (c.currency === 'JPY' ? c.amount * (c.rate || currentRate) : c.amount), 0);
    const openMaps = (q) => { if(q) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank'); };
    const openJMA = () => window.open('https://www.jma.go.jp/jma/index.html', '_blank');
    const toggleGps = () => {
      const nextState = !gpsOn;
      setGpsOn(nextState);
      if (nextState && firstItem?.location) setTimeout(() => openMaps(firstItem.location), 500);
    };
    const handleUpload = (e, type) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const b64 = reader.result;
            if (type === 'cover') setDays(days.map((d, i) => i === selectedIdx ? { ...d, customImg: b64 } : d));
            else if (type === 'item') setEditingItem({ ...editingItem, customImg: b64 });
        };
        reader.readAsDataURL(file);
    };
    const renderWeatherIcon = (iconName) => {
        const WeatherIcon = WEATHER_ICONS[iconName] || WEATHER_ICONS['default'];
        return <WeatherIcon className={`w-4.5 h-4.5 opacity-80 ${iconName === 'sun' ? 'text-orange-500' : 'text-stone-400'}`} />;
    };

    return (
        <div className="max-w-md mx-auto min-h-screen relative lg:shadow-2xl bg-[#F9F8F4]">
            {/* HEADER */}
            <header className="fixed top-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#F9F8F4]/90 backdrop-blur-md pt-8 px-5 pb-2 border-b border-stone-200/50">
                <p className="text-[10px] tracking-[0.4em] text-stone-400 uppercase font-bold text-center mb-1">Japan Trip</p>
                <div className="flex justify-center items-center relative mb-6">
                    <div className="flex items-center gap-2 text-stone-900">
                        <h1 className="serif text-xl font-bold tracking-tight">Kyoto <span className="text-[12px] align-middle text-brand-red mx-0.5 opacity-80">●</span> Osaka</h1>
                        <span className="text-[9px] border border-stone-400 rounded-full px-2.5 py-0.5 italic font-medium text-stone-600">2026</span>
                    </div>
                    <div className="absolute right-0 bottom-0 flex gap-4">
                        <button onClick={() => setIsAiModalOpen(true)} className="flex flex-col items-center gap-0.5 transition-all text-stone-400 hover:text-purple-600">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>智能</span>
                        </button>
                        <button onClick={() => { setView('wallet'); setIsEditMode(false); }} className={`flex flex-col items-center gap-0.5 transition-all ${view === 'wallet' ? 'text-black font-bold' : 'text-stone-400'}`}><ReceiptText className="w-4 h-4" /><span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>帳本</span></button>
                        <button onClick={() => { setView('info'); setIsEditMode(false); }} className={`flex flex-col items-center gap-0.5 transition-all ${view === 'info' ? 'text-black font-bold' : 'text-stone-400'}`}><Info className="w-4 h-4" /><span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>資訊</span></button>
                    </div>
                </div>
                <div className="flex flex-col -mt-3">
                    <span className="text-[9px] tracking-widest text-stone-500 font-bold uppercase mb-1 ml-1">Apr 25 - May 2</span>
                    <div className="flex overflow-x-auto hide-scrollbar flex gap-6 pt-2 pb-1">
                        {days.map((d, i) => (
                            <div key={d.id} onClick={() => { setSelectedIdx(i); setView('plan'); }} className={`relative flex flex-col items-center min-w-[32px] cursor-pointer transition-all ${view === 'plan' && selectedIdx === i ? 'text-black font-bold active-dot' : 'text-stone-400'}`}>
                                <span className="text-[10px] mb-0.5">{d.day}</span>
                                <span className="serif text-xl leading-none">{d.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* CONTENT */}
            <div className="pt-40 px-5 pb-36">
                {view === 'plan' && (
                    <div className="animate-fade">
                        <div className="flex justify-between items-center mb-5 px-1">
                            <h2 className="serif text-xl font-bold text-stone-900 tracking-tight">{currentDay.title}</h2>
                            <button onClick={() => setIsEditMode(!isEditMode)} className="text-[10px] font-bold text-stone-500 px-3 py-1 rounded-full border border-stone-300 bg-white/50">{isEditMode ? '完成' : '管理'}</button>
                        </div>
                        
                        {/* 封面圖 */}
                        <div className="relative h-48 rounded-[28px] overflow-hidden shadow-lg mb-8" onClick={() => isEditMode && coverRef.current.click()}>
                            {GOOGLE_API_KEY && !currentDay.customImg ? (
                                <iframe className="map-frame" loading="lazy" allowFullScreen src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_API_KEY}&q=${encodeURIComponent(currentDay.city)}+Japan&zoom=13`}></iframe>
                            ) : (
                                <img src={currentDay.customImg || currentDay.defaultImg} className="w-full h-full object-cover" />
                            )}
                            <input type="file" ref={coverRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'cover')} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                            <div className="absolute bottom-5 left-6 right-6 pointer-events-none">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="glass-dark px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-widest">Day {selectedIdx + 1}</span>
                                    <span className="glass-dark px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-widest flex items-center gap-1"><MapPinOff className="w-2 h-2" /> {currentDay.city}</span>
                                </div>
                                <h2 className="serif text-xl text-white font-bold leading-tight">{currentDay.title}</h2>
                            </div>
                        </div>

                        {/* 天氣條 */}
                        <div className="mb-8 px-1">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] text-stone-600 font-bold tracking-wider uppercase">Hourly Forecast</span>
                                <span className="text-[9px] text-stone-400 tracking-widest uppercase font-mono">Open-Meteo</span>
                            </div>
                            <div className="flex overflow-x-auto gap-7 hide-scrollbar">
                                {weatherData.map((w, idx) => (
                                    <div key={idx} onClick={openJMA} className="flex flex-col items-center min-w-[42px] gap-3 cursor-pointer">
                                        <span className="text-[10px] text-stone-500 font-medium">{w.time}</span>
                                        {renderWeatherIcon(w.icon)} 
                                        <span className="serif text-xl text-stone-700 font-bold">{w.temp}°</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-[1px] bg-stone-200 mb-6"></div>

                        {/* --- [核心修改] 行程列表 (對應 IMG_5968 & IMG_5974) --- */}
                        <div className="space-y-0 relative px-1">
                            {currentDay.items.map((item, i) => {
                                const config = CATEGORY_CONFIG[item.type] || CATEGORY_CONFIG['SIGHTSEEING'];
                                const ItemIcon = config.icon;
                                const isHighlight = item.highlight;

                                return (
                                <div key={item.id} className="flex relative">
                                    {/* Edit Controls */}
                                    {isEditMode && (
                                        <div className="absolute -left-8 top-2 flex flex-col gap-2 z-20">
                                            <button onClick={() => { const d = [...days]; const its = d[selectedIdx].items; if(i>0) [its[i], its[i-1]] = [its[i-1], its[i]]; setDays(d); }} className="text-stone-400 hover:text-stone-600"><ChevronUp className="w-4 h-4" /></button>
                                            <button onClick={() => { const d = [...days]; const its = d[selectedIdx].items; if(i<its.length-1) [its[i], its[i+1]] = [its[i+1], its[i]]; setDays(d); }} className="text-stone-400 hover:text-stone-600"><ChevronDown className="w-4 h-4" /></button>
                                        </div>
                                    )}

                                    {/* 1. 左側時間欄 (Width fixed) */}
                                    <div className="w-[52px] shrink-0 pt-0 text-right pr-3">
                                        <span className={`serif text-base font-bold leading-none ${isHighlight ? 'text-gold-dark' : 'text-stone-800'}`}>
                                            {item.time}
                                        </span>
                                        {/* 針對 Highlight 顯示菱形符號 (圖中為菱形) */}
                                        {isHighlight && <div className="mt-1 flex justify-end"><div className="w-1.5 h-1.5 bg-[#D4AF37] rotate-45"></div></div>}
                                    </div>

                                    {/* 2. 中間時間軸線 */}
                                    <div className="w-4 relative shrink-0 flex justify-center">
                                        {/* 垂直線：連到下一個 Item (最後一個 Item 線條淡出或縮短) */}
                                        {i !== currentDay.items.length - 1 && (
                                            <div className="w-[1px] bg-stone-200 absolute top-2 bottom-0 left-1/2 -translate-x-1/2 h-full"></div>
                                        )}
                                        {/* 圓點 (Highlight 時不顯示圓點，改用左側菱形) */}
                                        {!isHighlight && (
                                            <div 
                                                className="timeline-dot top-1.5"
                                                style={{ color: config.color }} 
                                            ></div>
                                        )}
                                    </div>

                                    {/* 3. 右側內容卡片 */}
                                    <div className={`flex-1 pl-4 pb-8 ${isHighlight ? 'pb-8' : 'pb-6'}`}>
                                        <div 
                                            onClick={() => isEditMode ? setEditingItem(item) : setDetailItem(item)}
                                            className={`cursor-pointer transition-all active:scale-[0.98] ${isHighlight ? 'highlight-card' : 'normal-card'}`}
                                        >
                                            {/* Highlight 專屬 Header */}
                                            {isHighlight && (
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Crown className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
                                                    <span className="text-[9px] font-bold text-[#B4925A] tracking-[0.2em] uppercase">Special Experience</span>
                                                </div>
                                            )}

                                            {/* 標題區 */}
                                            <div className="flex items-start justify-between">
                                                <h3 className={`serif text-lg font-bold tracking-wide leading-tight ${isHighlight ? 'text-[#8D6E33] mb-1' : 'text-stone-800 mb-1'}`}>
                                                    {item.title}
                                                </h3>
                                                {isEditMode && <button onClick={(e) => { e.stopPropagation(); const d = [...days]; d[selectedIdx].items = d[selectedIdx].items.filter(it => it.id !== item.id); setDays(d); }} className="text-stone-300 hover:text-red-400 ml-2"><Trash2 className="w-4 h-4" /></button>}
                                            </div>

                                            {/* 一般模式下的類型標籤 (參照 IMG_5968) */}
                                            {!isHighlight && (
                                                <div className="flex items-center gap-1.5 mb-2 mt-0.5">
                                                    <ItemIcon className="w-3 h-3" style={{ color: config.color }} />
                                                    <span className="category-label" style={{ color: config.color }}>{config.label}</span>
                                                </div>
                                            )}

                                            {/* 描述文字 */}
                                            <p className={`text-[11px] leading-relaxed font-light ${isHighlight ? 'text-[#8C7B58]' : 'text-stone-500'}`}>
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )})}
                            
                            {/* 新增按鈕 */}
                            {isEditMode && (
                                <button onClick={() => setEditingItem({ title: '', desc: '', time: '09:00', type: 'SIGHTSEEING', highlight: false, btnLabel: '資訊', link: '', customImg: null })} className="w-full py-4 border border-dashed border-stone-300 rounded-[16px] text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:border-stone-400 transition-all mt-4">+ 新增行程</button>
                            )}
                        </div>
                    </div>
                )}
                
                {/* 錢包與資訊頁面邏輯保持不變，省略以節省篇幅 ... (請保留原本的 Wallet 和 Info 程式碼) */}
                {view === 'wallet' && (
                    <div className="animate-fade">
                        <h2 className="serif text-2xl font-bold mb-6 text-stone-800">旅行帳本</h2>
                        <div className="bg-[#2D2A26] p-8 rounded-[24px] text-white mb-8 shadow-xl relative overflow-hidden">
                            <p className="text-[10px] opacity-50 uppercase tracking-[0.3em] mb-2 font-bold">Total Budget TWD</p>
                            <h3 className="text-4xl font-light tracking-tighter mb-4">${Math.round(totalTWD).toLocaleString()}</h3>
                            <div className="flex items-center justify-between opacity-30">
                                <p className="text-[9px] italic">即時匯率: {currentRate}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {expenses.map(e => {
                                const config = CATEGORY_CONFIG[e.type] || CATEGORY_CONFIG['FOOD'];
                                const ItemIcon = config.icon;
                                return (
                                <div key={e.id} onClick={() => setEditingExpense(e)} className="p-5 bg-white rounded-[20px] border border-stone-100 flex justify-between items-center shadow-sm cursor-pointer active:scale-[0.98] transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center" style={{color: config.color}}><ItemIcon className="w-4 h-4" /></div>
                                        <div>
                                            <p className="font-bold text-sm tracking-tight text-stone-800">{e.name}</p>
                                            <p className="text-[10px] text-stone-400 font-bold">
                                                {e.currency === 'JPY' ? `¥${e.amount.toLocaleString()}` : `$${e.amount.toLocaleString()}`}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-stone-900 text-sm">${Math.round(e.currency === 'JPY' ? e.amount * (e.rate || currentRate) : e.amount).toLocaleString()}</p>
                                </div>
                            )})}
                            <button onClick={() => setEditingExpense({ name: '', amount: 0, currency: 'JPY', type: 'FOOD', rate: currentRate })} className="w-full py-5 bg-[#2D2A26] text-white rounded-[20px] font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl">+ 記一筆支出</button>
                        </div>
                    </div>
                )}
                
                {/* Info View Code... (保留原本代碼) */}
                {view === 'info' && (
                     <div className="animate-fade py-2 space-y-6">
                        {/* 保持原有的 info 渲染邏輯，建議將卡片圓角統一改為 rounded-[20px] 以符合新風格 */}
                         <div className="flex justify-between items-center px-1">
                            <h2 className="serif text-2xl font-bold text-stone-800">資訊與支援</h2>
                            <button onClick={() => setIsEditMode(!isEditMode)} className="text-[9px] font-bold text-stone-500 px-3 py-1 rounded-full border border-stone-300 bg-white/50">{isEditMode ? '完成' : '管理內容'}</button>
                        </div>
                        {infoItems.map((item, idx) => (
                             <div key={item.id} onClick={() => item.link && window.open(item.link)} className="p-6 bg-white border border-stone-200 rounded-[20px] shadow-sm">
                                <h4 className="serif text-lg font-bold text-stone-800 mb-2">{item.title}</h4>
                                <p className="text-xs text-stone-500">{item.content}</p>
                             </div>
                        ))}
                     </div>
                )}
            </div>
            
            {/* Modal 組件部分保持不變 (EditingItem, DetailItem 等) */}
            {/* 建議將 Modal 的 rounded-[40px] 改為 rounded-[24px] 以保持風格一致 */}
            {/* 省略... */}
        </div>
    );
}