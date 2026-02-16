import { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Plane, Train, Home, Utensils, Camera, Star, Info, 
  Map as MapIcon, ShieldAlert, Copy, ExternalLink, 
  Target, Navigation, ChevronUp, 
  ChevronDown, Trash2, X, Image as ImageIcon, ReceiptText, 
  Sparkles, Loader2, Clock, MapPinOff,
  // 補回天氣圖示
  Sun, Cloud, CloudRain, CloudLightning, Snowflake
} from 'lucide-react';

// --- API 設定 ---
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const OPENWEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || '';
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

// 統一變數名稱：定義圖示元件
const ICON_COMPONENTS = {
    'FLIGHT': Plane,
    'TRANSPORT': Train,
    'HOTEL': Home,
    'FOOD': Utensils,
    'SIGHTSEEING': Camera,
    'HIGHLIGHT': Star,
    'INFO': Info,
    'MAP': MapIcon,
    'VJW': ExternalLink,
    'EMERGENCY': ShieldAlert,
    'CARD': ReceiptText
};

// 為了相容性，讓 ICON_MAP 指向 ICON_COMPONENTS
const ICON_MAP = ICON_COMPONENTS;

// 天氣圖示對照表
const WEATHER_ICONS = {
    'sun': Sun,
    'cloud': Cloud,
    'cloud-rain': CloudRain,
    'cloud-lightning': CloudLightning,
    'snowflake': Snowflake,
    'default': Sun
};

// 初始資料
const INITIAL_PLAN = [
    { id: 1, date: '25', day: 'SAT', title: '抵達京都與鴨川', city: 'Kyoto', defaultImg: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000', customImg: null, items: [{ id: 101, time: '13:25', title: '出發 (JX846)', desc: '星宇航空 TPE 直飛 KIX', type: 'FLIGHT', location: '關西國際機場', highlight: false, btnLabel: '官方網站', link: 'https://www.starlux-airlines.com' }, { id: 102, time: '16:00', title: '錦市場巡禮', desc: '品嚐豆乳甜甜圈與三木雞卵', type: 'FOOD', location: '錦市場', highlight: false, btnLabel: '資訊', link: '' }] },
    { id: 2, date: '26', day: 'SUN', title: '嵐山新綠', city: 'Arashiyama', defaultImg: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=1000', customImg: null, items: [{ id: 201, time: '09:30', title: '嵐山竹林之道', desc: '漫步綠意之道', type: 'SIGHTSEEING', location: '嵐山', highlight: false, btnLabel: '資訊', link: '' }] },
    { id: 3, date: '27', day: 'MON', title: '任天堂博物館', city: 'Uji', defaultImg: 'https://images.unsplash.com/photo-1601362840469-51e4d8d59085?q=80&w=1000', customImg: null, items: [{ id: 301, time: '11:00', title: '任天堂博物館', desc: 'Nintendo Museum (預約制)', type: 'HIGHLIGHT', location: 'Nintendo Museum', highlight: true, btnLabel: '官方網站', link: 'https://museum.nintendo.com' }] },
    { id: 4, date: '28', day: 'TUE', title: '清水舞台參拜', city: 'Kyoto', defaultImg: 'https://images.unsplash.com/photo-1528164344705-47542687990d?q=80&w=1000', customImg: null, items: [{ id: 401, time: '08:30', title: '清水寺', desc: '音羽瀑布與產寧坂', type: 'SIGHTSEEING', location: '清水寺', highlight: false, btnLabel: '資訊', link: '' }] },
    { id: 5, date: '29', day: 'WED', title: '大阪古今巡禮', city: 'Osaka', defaultImg: 'https://images.unsplash.com/photo-1590253504396-72449038bc4a?q=80&w=1000', customImg: null, items: [{ id: 501, time: '10:00', title: '大阪城公園', desc: '登上天守閣俯瞰市景', type: 'SIGHTSEEING', location: '大阪城', highlight: false, btnLabel: '官方網站', link: '' }] },
    { id: 6, date: '30', day: 'THU', title: '環球影城 USJ', city: 'USJ', defaultImg: 'https://images.unsplash.com/photo-1616422285623-13ff0167c95c?q=80&w=1000', customImg: null, items: [{ id: 601, time: '08:30', title: 'USJ 入園冒險', desc: '瑪利歐與哈利波特全日遊', type: 'HIGHLIGHT', location: '日本環球影城', highlight: true, btnLabel: '官方網站', link: '' }] },
    { id: 7, date: '01', day: 'FRI', title: '勝尾寺祈福', city: 'Minoo', defaultImg: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=1000', customImg: null, items: [{ id: 701, time: '11:00', title: '勝尾寺', desc: '祈求勝運的達摩之寺', type: 'SIGHTSEEING', location: '勝尾寺', highlight: false, btnLabel: '資訊', link: '' }] },
    { id: 8, date: '02', day: 'SAT', title: '返程台北', city: 'Airport', defaultImg: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?q=80&w=1000', customImg: null, items: [{ id: 801, time: '13:25', title: '回程起飛', desc: '結束愉快 8 天行程', type: 'FLIGHT', location: '關西機場', highlight: false, btnLabel: '資訊', link: '' }] }
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
    
    const [days, setDays] = useState(() => load('travel_days_v12', INITIAL_PLAN));
    const [expenses, setExpenses] = useState(() => load('exp_v12', []));
    const [infoItems, setInfoItems] = useState(() => load('info_v12', INITIAL_INFO));
    const [vjwLink, setVjwLink] = useState(() => load('vjw_v12', 'https://www.vjw.digital.go.jp/'));
    
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
        localStorage.setItem('travel_days_v12', JSON.stringify(days));
        localStorage.setItem('exp_v12', JSON.stringify(expenses));
        localStorage.setItem('info_v12', JSON.stringify(infoItems));
        localStorage.setItem('vjw_v12', JSON.stringify(vjwLink));
    }, [days, expenses, infoItems, vjwLink]);

    // Exchange Rate API
    useEffect(() => {
        fetch('https://open.er-api.com/v6/latest/JPY')
            .then(res => res.json())
            .then(data => { if(data?.rates?.TWD) setCurrentRate(data.rates.TWD); })
            .catch(console.error);
    }, []);

    // Weather API
    useEffect(() => {
        const cityKey = days[selectedIdx]?.city || 'Kyoto';
        const coords = CITY_COORDS[cityKey];
        if (OPENWEATHER_API_KEY && coords) {
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${OPENWEATHER_API_KEY}&cnt=8`)
                .then(res => res.json())
                .then(data => {
                    if(data.list) {
                        setWeatherData(data.list.map(item => ({
                            time: `${new Date(item.dt * 1000).getHours()}:00`,
                            temp: Math.round(item.main.temp),
                            icon: mapWeatherIcon(item.weather[0].icon)
                        })));
                    }
                })
                .catch(() => setWeatherData(getFallbackWeather()));
        } else {
            setWeatherData(getFallbackWeather());
        }
    }, [selectedIdx, days]);

    // --- AI Logic ---
    const handleAiAnalyze = async () => {
        if (!aiInputText.trim()) return alert("請輸入行程文字！");
        if (!GEMINI_API_KEY) return alert("請先在 .env 設定 VITE_GEMINI_API_KEY");

        setIsAiProcessing(true);

        try {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `
                你是一個旅遊行程轉換器。請將使用者提供的旅遊文字，轉換為符合以下 JSON 格式的陣列。
                請忽略日期，只專注於產生天數順序的 items。
                
                目標 JSON 結構範例 (陣列，代表每一天的行程):
                [
                  {
                    "title": "該日主題(例如: 京都抵達)", 
                    "city": "城市英文名(Kyoto/Osaka/Uji/Nara/USJ)",
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

                規則：
                1. 回傳純 JSON 字串，不要 Markdown。
                2. 如果內容不足以構成所有天數，就只回傳有的天數。
                
                使用者輸入：
                ${aiInputText}
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
            alert("AI 分析失敗，請確認格式或 API Key。");
        } finally {
            setIsAiProcessing(false);
        }
    };

    // Helpers
    const mapWeatherIcon = (code) => {
        if (code.startsWith('01')) return 'sun';
        if (code.startsWith('02') || code.startsWith('03') || code.startsWith('04')) return 'cloud';
        if (code.startsWith('09') || code.startsWith('10')) return 'cloud-rain';
        if (code.startsWith('11')) return 'cloud-lightning';
        if (code.startsWith('13')) return 'snowflake';
        return 'sun'; 
    };
    const getFallbackWeather = () => ["現在", "12:00", "15:00", "18:00", "21:00", "00:00"].map((t, i) => ({ time: t, temp: 18 - i, icon: 'sun' }));
    
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

    return (
        <div className="max-w-md mx-auto min-h-screen relative lg:shadow-2xl">
            
            {/* FIXED HEADER */}
            <header className="fixed top-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#EBE7DE] pt-8 px-6 pb-2 border-b border-stone-300">
                <p className="text-[10px] tracking-[0.4em] text-stone-500 uppercase font-bold text-center mb-1">Japan Trip</p>
                <div className="flex justify-center items-center relative mb-8">
                    <div className="flex items-center gap-2 text-stone-900">
                        <h1 className="serif text-xl font-bold tracking-tight">Kyoto <span className="text-[12px] align-middle text-[#8D2B2B] mx-0.5 opacity-80">●</span> Osaka</h1>
                        <span className="text-[9px] border border-stone-500 rounded-full px-2.5 py-0.5 italic font-medium text-stone-600">2026</span>
                    </div>
                    <div className="absolute right-0 bottom-0 flex gap-5">
                        {/* AI Button */}
                        <button onClick={() => setIsAiModalOpen(true)} className="flex flex-col items-center gap-1 transition-all text-stone-400 hover:text-purple-600">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>智能</span>
                        </button>

                        <button onClick={() => { setView('wallet'); setIsEditMode(false); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'wallet' ? 'text-black font-bold' : 'text-stone-500'}`}><ReceiptText className="w-4 h-4" /><span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>帳本</span></button>
                        <button onClick={() => { setView('info'); setIsEditMode(false); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'info' ? 'text-black font-bold' : 'text-stone-500'}`}><Info className="w-4 h-4" /><span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>資訊</span></button>
                    </div>
                </div>

                <div className="flex flex-col -mt-2">
                    <span className="text-[9px] tracking-widest text-stone-600 font-bold uppercase mb-1 ml-1">Apr 25 - May 2</span>
                    <div className="flex overflow-x-auto hide-scrollbar flex gap-8 pt-3 pb-1">
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
            <div className="pt-44 px-6 pb-44">
                {view === 'plan' && (
                    <div className="animate-fade">
                        <div className="flex justify-between items-center mb-6 px-1">
                            <h2 className="serif text-xl font-bold text-stone-900 tracking-tight">{currentDay.title}</h2>
                            <button onClick={() => setIsEditMode(!isEditMode)} className="text-[9px] font-bold text-stone-600 px-3 py-1 rounded-full border border-stone-300 bg-white/50">{isEditMode ? '完成' : '管理'}</button>
                        </div>
                        
                        <div className="relative h-56 rounded-[32px] overflow-hidden shadow-xl mb-12" onClick={() => isEditMode && coverRef.current.click()}>
                            {GOOGLE_API_KEY && !currentDay.customImg ? (
                                <iframe className="map-frame" loading="lazy" allowFullScreen src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_API_KEY}&q=${encodeURIComponent(currentDay.city)}+Japan&zoom=13`}></iframe>
                            ) : (
                                <img src={currentDay.customImg || currentDay.defaultImg} className="w-full h-full object-cover" />
                            )}
                            <input type="file" ref={coverRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'cover')} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                            <div className="absolute bottom-6 left-7 right-7 pointer-events-none">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="glass-dark px-2.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-widest">Day {selectedIdx + 1}</span>
                                    <span className="glass-dark px-2.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-widest flex items-center gap-1"><MapPinOff className="w-2 h-2" /> {currentDay.city}</span>
                                </div>
                                <h2 className="serif text-2xl text-white font-bold leading-tight">{currentDay.title}</h2>
                            </div>
                        </div>

                        <div className="mb-12 px-1">
                            <div className="flex justify-between items-center mb-8">
                                <span className="text-[10px] text-stone-600 font-bold tracking-wider uppercase">即時天氣預報</span>
                                <span className="text-[9px] text-stone-500 tracking-widest uppercase font-mono">OpenWeather</span>
                            </div>
                            <div className="flex overflow-x-auto gap-8 hide-scrollbar">
                                {weatherData.map((w, idx) => {
                                    // 動態決定要顯示哪個 Icon
                                    const WeatherIcon = WEATHER_ICONS[w.icon] || WEATHER_ICONS['default'];
                                    return (
                                        <div key={idx} onClick={openJMA} className="flex flex-col items-center min-w-[42px] gap-4 cursor-pointer">
                                            <span className="text-[10px] text-stone-600 font-medium">{w.time}</span>
                                            <div className={`opacity-80 ${w.icon === 'sun' ? 'text-orange-500' : 'text-stone-400'}`}>
                                                <WeatherIcon className="w-4.5 h-4.5" />
                                            </div> 
                                            <span className="serif text-xl text-stone-700 font-bold">{w.temp}°</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="h-[1px] bg-stone-300 mb-12"></div>

                        <div className="space-y-10 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[0.5px] before:bg-stone-300">
                            {currentDay.items.map((item, i) => {
                                // 使用統一的 ICON_COMPONENTS
                                const ItemIcon = ICON_COMPONENTS[item.type] || MapPinOff;
                                return (
                                <div key={item.id} className="flex gap-6 items-start">
                                    {isEditMode && (
                                        <div className="flex flex-col gap-2 pt-1">
                                            <button onClick={() => { const d = [...days]; const its = d[selectedIdx].items; if(i>0) [its[i], its[i-1]] = [its[i-1], its[i]]; setDays(d); }} className="text-stone-400"><ChevronUp className="w-4 h-4" /></button>
                                            <button onClick={() => { const d = [...days]; const its = d[selectedIdx].items; if(i<its.length-1) [its[i], its[i+1]] = [its[i+1], its[i]]; setDays(d); }} className="text-stone-400"><ChevronDown className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                    <div onClick={() => isEditMode ? setEditingItem(item) : setDetailItem(item)} className={`flex-1 flex gap-7 cursor-pointer transition-all ${item.highlight ? 'highlight-card p-6 rounded-2xl ml-[-15px] bg-white' : ''}`}>
                                        <div className={`relative z-10 w-6 h-6 rounded-full border border-stone-200 bg-white flex items-center justify-center text-stone-500 ${item.highlight ? 'bg-brand-red text-white shadow-lg border-none' : ''}`}>
                                            <ItemIcon className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <span className="text-[11px] font-bold text-stone-500 tracking-tighter">{item.time}</span>
                                                {isEditMode && <button onClick={(e) => { e.stopPropagation(); const d = [...days]; d[selectedIdx].items = d[selectedIdx].items.filter(it => it.id !== item.id); setDays(d); }} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
                                            </div>
                                            <h3 className={`serif text-base font-bold tracking-tight text-stone-900`}>{item.title}</h3>
                                            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed truncate w-44">{item.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            )})}
                            {isEditMode && (
                                <button onClick={() => setEditingItem({ title: '', desc: '', time: '09:00', type: 'SIGHTSEEING', highlight: false, btnLabel: '資訊', link: '', customImg: null })} className="w-full py-5 border-2 border-dashed border-stone-300 rounded-[30px] text-stone-500 text-[10px] font-bold uppercase tracking-[0.2em] bg-white/30">+ 新增排程項目</button>
                            )}
                        </div>
                    </div>
                )}

                {view === 'wallet' && (
                    <div className="animate-fade">
                        <h2 className="serif text-2xl font-bold mb-6 text-stone-800">旅行帳本</h2>
                        <div className="bg-stone-900 p-10 rounded-[45px] text-white mb-10 shadow-2xl relative overflow-hidden">
                            <p className="text-[10px] opacity-50 uppercase tracking-[0.3em] mb-2 font-bold">Total Budget TWD</p>
                            <h3 className="text-4xl font-light tracking-tighter mb-4">${Math.round(totalTWD).toLocaleString()}</h3>
                            <div className="flex items-center justify-between opacity-30">
                                <p className="text-[9px] italic">即時匯率: {currentRate}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {expenses.map(e => {
                                // 使用統一的 ICON_COMPONENTS
                                const ItemIcon = ICON_COMPONENTS[e.type] || ReceiptText;
                                return (
                                <div key={e.id} onClick={() => setEditingExpense(e)} className="p-6 bg-white rounded-[32px] border border-stone-200 flex justify-between items-center shadow-sm cursor-pointer active:scale-[0.98] transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center text-stone-600"><ItemIcon className="w-5 h-5" /></div>
                                        <div>
                                            <p className="font-bold text-sm tracking-tight text-stone-800">{e.name}</p>
                                            <p className="text-[10px] text-stone-500 font-bold">
                                                {e.currency === 'JPY' ? `¥${e.amount.toLocaleString()}` : `$${e.amount.toLocaleString()}`}
                                                {e.currency === 'JPY' && <span className="text-stone-400 font-normal ml-1">(匯率: {e.rate || 'auto'})</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-stone-900 text-sm">${Math.round(e.currency === 'JPY' ? e.amount * (e.rate || currentRate) : e.amount).toLocaleString()}</p>
                                </div>
                            )})}
                            <button onClick={() => setEditingExpense({ name: '', amount: 0, currency: 'JPY', type: 'FOOD', rate: currentRate })} className="w-full py-5 bg-stone-900 text-white rounded-[32px] font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl">+ 記一筆支出</button>
                        </div>
                    </div>
                )}

                {/* INFO PAGE */}
                {view === 'info' && (
                    <div className="animate-fade py-2 space-y-8">
                        <div className="flex justify-between items-center px-1">
                            <h2 className="serif text-2xl font-bold text-stone-800">資訊與支援</h2>
                            <button onClick={() => setIsEditMode(!isEditMode)} className="text-[9px] font-bold text-stone-500 px-3 py-1 rounded-full border border-stone-300 bg-white/50">{isEditMode ? '完成' : '管理內容'}</button>
                        </div>
                        
                        <div className="space-y-6">
                            {infoItems.map((item, idx) => (
                              <div key={item.id} className="flex gap-4 items-center">
                                  {isEditMode && (
                                      <div className="flex flex-col gap-2 pt-1">
                                          <button onClick={() => { const i = [...infoItems]; if(idx>0) [i[idx], i[idx-1]] = [i[idx-1], i[idx]]; setInfoItems(i); }} className="text-stone-300"><ChevronUp className="w-4 h-4" /></button>
                                          <button onClick={() => { const i = [...infoItems]; if(idx<i.length-1) [i[idx], i[idx+1]] = [i[idx+1], i[idx]]; setInfoItems(i); }} className="text-stone-300"><ChevronDown className="w-4 h-4" /></button>
                                      </div>
                                  )}
                                  
                                  {item.type === 'MAP' && (
                                    <div onClick={() => isEditMode ? setEditingInfo(item) : openMaps(item.link)} className="flex-1 p-7 bg-stone-900 rounded-[40px] text-white flex items-center justify-between cursor-pointer shadow-xl active:scale-[0.98] transition-all relative">
                                            <div className="flex items-center gap-4"><MapIcon className="w-5 h-5 text-blue-400" /><span className="text-sm font-bold tracking-widest uppercase">{item.title}</span></div>
                                            <ExternalLink className="w-4 h-4 opacity-30" />
                                            {isEditMode && <button onClick={(e) => { e.stopPropagation(); setInfoItems(infoItems.filter(i => i.id !== item.id)); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"><X className="w-3 h-3" /></button>}
                                    </div>
                                  )}

                                  {item.type === 'VJW' && (
                                    <div onClick={() => isEditMode ? setEditingInfo(item) : item.link && window.open(item.link)} className="flex-1 p-7 bg-[#1A1A1A] rounded-[40px] shadow-lg relative active:scale-[0.98] transition-all overflow-hidden">
                                            <span className="absolute top-6 left-6 text-[9px] bg-[#E85D75] text-white px-2 py-0.5 rounded font-bold tracking-widest">MUST HAVE</span>
                                            <div className="mt-8 mb-2">
                                                <h4 className="serif text-2xl font-bold text-white mb-1">{item.title}</h4>
                                                <p className="text-[10px] text-stone-400">{item.content}</p>
                                            </div>
                                            <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-[#E85D75] flex items-center justify-center text-white"><ExternalLink className="w-4 h-4" /></div>
                                            {isEditMode && <button onClick={(e) => { e.stopPropagation(); setInfoItems(infoItems.filter(i => i.id !== item.id)); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg z-10"><X className="w-3 h-3" /></button>}
                                    </div>
                                  )}

                                  {item.type === 'EMERGENCY' && (
                                    <div onClick={() => isEditMode && setEditingInfo(item)} className="flex-1 p-7 bg-red-50 rounded-[40px] border border-red-200 shadow-sm relative">
                                            <h3 className="serif font-bold text-red-900 mb-5 flex items-center gap-3"><ShieldAlert className="w-4.5 h-4.5 text-red-600" /> {item.title}</h3>
                                            <p className="text-sm text-red-800 font-bold">{item.content}</p>
                                            {isEditMode && <button onClick={(e) => { e.stopPropagation(); setInfoItems(infoItems.filter(i => i.id !== item.id)); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"><X className="w-3 h-3" /></button>}
                                    </div>
                                  )}

                                  {item.type === 'CARD' && (
                                    <div onClick={() => isEditMode ? setEditingInfo(item) : item.link && window.open(item.link)} className="flex-1 p-6 bg-white border border-stone-200 rounded-[24px] shadow-sm relative active:scale-[0.98] transition-all">
                                            <h4 className="serif text-lg font-bold text-stone-800 mb-2">{item.title}</h4>
                                            <p className="text-xs text-stone-500 font-medium italic border-b border-stone-50 pb-4">{item.content}</p>
                                            <div className="mt-4 flex justify-between items-center">
                                              <span className="text-[9px] font-bold text-stone-300 uppercase tracking-tighter">Open Link →</span>
                                              <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.content); }} className="text-stone-300"><Copy className="w-4 h-4" /></button>
                                            </div>
                                            {isEditMode && <button onClick={(e) => { e.stopPropagation(); setInfoItems(infoItems.filter(i => i.id !== item.id)); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"><X className="w-3 h-3" /></button>}
                                    </div>
                                  )}
                              </div>
                            ))}
                            {isEditMode && <button onClick={() => setEditingInfo({ title: '', content: '', link: '', type: 'CARD' })} className="w-full py-5 border-2 border-dashed border-stone-300 rounded-[24px] text-stone-400 font-bold text-[10px] uppercase tracking-widest">+ 新增資訊項目</button>}
                        </div>
                    </div>
                )}
            </div>

            {/* STATUS BAR - Only show in Plan view */}
            {view === 'plan' && (
                <div key={gpsOn ? 'gps-active' : 'gps-idle'} className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-sm glass rounded-[32px] p-3.5 border border-white/60 shadow-2xl flex items-center justify-between z-40 bg-white/80">
                    <div className="flex items-center gap-4 flex-1">
                        <div onClick={toggleGps} className="flex flex-col items-center gap-0.5 border-r border-stone-200 pr-4 cursor-pointer group">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${gpsOn ? 'bg-red-50 text-red-600 animate-pulse shadow-md' : 'bg-stone-100 text-stone-400'}`}><Target className="w-4 h-4" /></div>
                            <span className={`text-[7px] font-bold uppercase mt-1 ${gpsOn ? 'text-red-700' : 'text-stone-400'}`}>GPS {gpsOn ? 'ON' : 'OFF'}</span>
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={() => { if(gpsOn && firstItem?.location) openMaps(firstItem.location); }}>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="serif text-base font-bold text-stone-800 tracking-tighter">
                                    {gpsOn ? (isMoving ? '移動中...' : '準備中...') : (currentDay?.items?.[0]?.time || '13:25')}
                                </span>
                                <span className="text-[7px] bg-stone-200 px-2 py-0.5 rounded-sm text-stone-600 font-bold uppercase tracking-widest">
                                    {gpsOn ? 'Live' : 'Next'}
                                </span>
                            </div>
                            <p className="text-[9px] text-stone-500 font-bold truncate w-32 tracking-tight">
                                → {firstItem?.title || '下一站目的地'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-[#F2EDE4] rounded-2xl px-5 py-3 text-right border border-stone-300 min-w-[85px] flex flex-col justify-center shadow-inner">
                        {gpsOn ? (
                            <div onClick={() => openMaps(firstItem?.location)} className="cursor-pointer">
                                <Navigation className="w-3.5 h-3.5 text-red-500 mb-0.5 ml-auto" />
                                <span className="text-[13px] font-bold text-stone-800 leading-none tracking-tighter">10,970</span>
                                <p className="text-[6px] text-stone-500 font-bold uppercase mt-0.5">Meters</p>
                            </div>
                        ) : (
                            <div><div className="flex items-center justify-end gap-1.5 opacity-40 mb-0.5 text-black"><Clock className="w-3 h-3" /><span className="text-[10px] font-bold uppercase">14:00</span></div><span className="text-[7px] text-stone-500 font-bold uppercase tracking-widest leading-none">Estimate</span></div>
                        )}
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}
            
            {/* AI SMART IMPORT MODAL */}
            {isAiModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-fade">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative">
                        <button onClick={() => setIsAiModalOpen(false)} className="absolute top-6 right-6 p-2 bg-stone-100 rounded-full text-stone-400"><X className="w-4 h-4" /></button>
                        
                        <div className="flex items-center gap-2 mb-2 text-purple-600">
                            <Sparkles className="w-5 h-5" />
                            <h3 className="serif text-xl font-bold">AI 智能匯入</h3>
                        </div>
                        <p className="text-[10px] text-stone-400 mb-6 leading-relaxed">
                            請貼上您的行程文字（例如：ChatGPT 建議、部落格遊記），AI 將自動為您排入行程表。
                        </p>

                        <textarea 
                            className="w-full h-40 p-4 bg-stone-50 rounded-2xl text-xs text-stone-700 outline-none border border-stone-200 resize-none mb-4 focus:border-purple-300 transition-colors"
                            placeholder="貼上文字內容..."
                            value={aiInputText}
                            onChange={(e) => setAiInputText(e.target.value)}
                        />

                        <button 
                            onClick={handleAiAnalyze} 
                            disabled={isAiProcessing}
                            className={`w-full py-4 rounded-[28px] font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isAiProcessing ? 'bg-stone-200 text-stone-400' : 'bg-purple-600 text-white shadow-lg shadow-purple-200 active:scale-95'}`}
                        >
                            {isAiProcessing ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> 分析中...</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> 開始轉換</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: INFO EDIT */}
            {editingInfo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-fade">
                        <h3 className="serif text-xl font-bold mb-6 text-stone-800">編輯資訊卡片</h3>
                        <div className="space-y-4">
                            <div className="w-32"><label className="text-[10px] text-gray-400 font-bold uppercase">類別</label>
                                <select className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs font-bold" value={editingInfo.type} onChange={e => setEditingInfo({...editingInfo, type: e.target.value})}>
                                    <option value="CARD">一般卡片</option>
                                    <option value="MAP">Google Maps</option>
                                    <option value="VJW">Visit Japan Web</option>
                                    <option value="EMERGENCY">緊急聯絡</option>
                                </select>
                            </div>
                            <div><label className="text-[10px] text-gray-400 font-bold uppercase">標題</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-sm font-bold" value={editingInfo.title} onChange={e => setEditingInfo({...editingInfo, title: e.target.value})} /></div>
                            <div><label className="text-[10px] text-gray-400 font-bold uppercase">內容描述/確認碼</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-sm" value={editingInfo.content} onChange={e => setEditingInfo({...editingInfo, content: e.target.value})} /></div>
                            <div><label className="text-[10px] text-gray-400 font-bold uppercase">外部連結 (Optional)</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs" value={editingInfo.link} onChange={e => setEditingInfo({...editingInfo, link: e.target.value})} placeholder="https://" /></div>
                            <div className="pt-4 flex gap-3">
                                <button onClick={() => {
                                    const ni = editingInfo.id ? infoItems.map(i => i.id === editingInfo.id ? editingInfo : i) : [...infoItems, {...editingInfo, id: Date.now()}];
                                    setInfoItems(ni); setEditingInfo(null);
                                }} className="flex-1 bg-stone-900 text-white py-4.5 rounded-[28px] font-bold text-[10px] uppercase">儲存卡片</button>
                                <button onClick={() => setEditingInfo(null)} className="px-6 border border-stone-200 rounded-[28px] text-stone-400"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detailItem && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade">
                    <div className="bg-white w-full max-w-sm rounded-[45px] overflow-hidden shadow-2xl relative">
                        <button onClick={() => setDetailItem(null)} className="absolute top-6 right-6 p-2 bg-stone-100 rounded-full z-10"><X className="w-4 h-4 text-stone-500" /></button>
                        <div className="h-48 bg-stone-100 flex items-center justify-center overflow-hidden">
                            {detailItem.customImg ? <img src={detailItem.customImg} className="w-full h-full object-cover" /> : <MapPinOff className="w-12 h-12 text-stone-200" />}
                        </div>
                        <div className="p-9 pb-12">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold text-white bg-[#8D2B2B] px-2.5 py-1 rounded tracking-tighter uppercase">{detailItem.time}</span>
                                <span className="text-[9px] text-stone-400 font-bold tracking-[0.2em] uppercase">{detailItem.type}</span>
                            </div>
                            <h2 className="serif text-2xl font-bold mb-5 text-stone-900 leading-tight">{detailItem.title}</h2>
                            <p className="text-sm text-stone-600 font-medium leading-relaxed mb-10 opacity-90">{detailItem.desc}</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => openMaps(detailItem.location)} className="w-full bg-stone-900 text-white py-4.5 rounded-[24px] font-bold text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all tracking-widest uppercase"><Navigation className="w-4 h-4" /> Google Maps 導航</button>
                                <button onClick={() => detailItem.link && window.open(detailItem.link)} className="w-full border border-stone-200 text-stone-800 py-4.5 rounded-[24px] font-bold text-[11px] uppercase active:scale-95 transition-all">{detailItem.btnLabel || '資訊'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Itinerary Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-fade overflow-y-auto max-h-[90vh]">
                        <h3 className="serif text-xl font-bold mb-6 text-stone-800">行程編輯</h3>
                        <div className="space-y-4">
                            <div className="h-28 bg-stone-100 rounded-2xl flex flex-col items-center justify-center border border-dashed border-stone-300 relative overflow-hidden" onClick={() => fileRef.current.click()}>
                                {editingItem.customImg ? <img src={editingItem.customImg} className="w-full h-full object-cover" /> : <div className="text-center"><ImageIcon className="w-5 h-5 text-stone-400 mx-auto" /><p className="text-[8px] text-stone-500 mt-1 uppercase font-bold tracking-widest">更換照片</p></div>}
                                <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'item')} />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1"><label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">時間</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-sm" value={editingItem.time} onChange={e => setEditingItem({...editingItem, time: e.target.value})} /></div>
                                <div className="w-24">
                                    <label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">圖示</label>
                                    <select className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs" value={editingItem.type} onChange={e => setEditingItem({...editingItem, type: e.target.value})}>
                                        {Object.keys(ICON_MAP).map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">標題</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-sm font-bold" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} /></div>
                            <div><label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">內容描述</label><textarea className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs h-20" value={editingItem.desc} onChange={e => setEditingItem({...editingItem, desc: e.target.value})} /></div>
                            <div><label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">導航地點</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs font-bold" value={editingItem.location} onChange={e => setEditingItem({...editingItem, location: e.target.value})} /></div>
                            <div className="flex gap-3">
                                <div className="flex-1"><label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">按鈕名稱</label><select className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs" value={editingItem.btnLabel} onChange={e => setEditingItem({...editingItem, btnLabel: e.target.value})}><option value="官方網站">官方網站</option><option value="資訊">資訊</option></select></div>
                                <div className="flex-1"><label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">連結</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs" value={editingItem.link} onChange={e => setEditingItem({...editingItem, link: e.target.value})} placeholder="https://" /></div>
                            </div>
                            <div className="flex items-center justify-between p-3.5 bg-amber-50 rounded-xl">
                                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Highlight (金邊)</span>
                                <input type="checkbox" checked={editingItem.highlight} onChange={e => setEditingItem({...editingItem, highlight: e.target.checked})} />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button onClick={() => {
                                    const d = [...days]; const dy = d[selectedIdx];
                                    if(editingItem.id) dy.items = dy.items.map(i => i.id === editingItem.id ? editingItem : i);
                                    else dy.items.push({...editingItem, id: Date.now()});
                                    setDays(d); setEditingItem(null);
                                }} className="flex-1 bg-stone-900 text-white py-4.5 rounded-[28px] font-bold text-[10px] uppercase tracking-widest">確認儲存</button>
                                <button onClick={() => setEditingItem(null)} className="px-7 py-4.5 border border-stone-200 rounded-[28px] text-stone-400"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Edit Modal */}
            {editingExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-xs rounded-[40px] p-8 shadow-2xl animate-fade">
                        <h3 className="serif text-xl font-bold mb-6 text-stone-800">支出編輯</h3>
                        <div className="space-y-4">
                            <div className="w-20"><label className="text-[10px] text-stone-400 font-bold uppercase">圖標</label>
                                <select className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs font-bold" value={editingExpense.type} onChange={e => setEditingExpense({...editingExpense, type: e.target.value})}>
                                    {Object.keys(ICON_MAP).map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                            <div><label className="text-[10px] text-stone-400 font-bold uppercase">名稱</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-sm font-bold" value={editingExpense.name} onChange={e => setEditingExpense({...editingExpense, name: e.target.value})} /></div>
                            
                            <div className="flex gap-3">
                                <div className="flex-1"><label className="text-[10px] text-stone-400 font-bold uppercase">金額</label><input type="number" className="w-full p-3 bg-stone-100 rounded-xl outline-none text-base font-bold" value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: Number(e.target.value)})} /></div>
                                <div className="w-20"><label className="text-[10px] text-stone-400 font-bold uppercase">幣別</label><select className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs font-bold" value={editingExpense.currency} onChange={e => setEditingExpense({...editingExpense, currency: e.target.value})}><option value="JPY">JPY</option><option value="TWD">TWD</option></select></div>
                            </div>

                            {editingExpense.currency === 'JPY' && (
                                <div>
                                    <label className="text-[10px] text-stone-400 font-bold uppercase flex justify-between">
                                        <span>自訂匯率</span>
                                        <span className="text-stone-300">即時: {currentRate}</span>
                                    </label>
                                    <input type="number" step="0.001" className="w-full p-3 bg-stone-100 rounded-xl outline-none text-sm font-bold" value={editingExpense.rate || currentRate} onChange={e => setEditingExpense({...editingExpense, rate: Number(e.target.value)})} />
                                </div>
                            )}

                            <div className="pt-4 flex flex-col gap-2">
                                <button onClick={() => {
                                    const ne = editingExpense.id ? expenses.map(e => e.id === editingExpense.id ? editingExpense : e) : [...expenses, {...editingExpense, id: Date.now()}];
                                    setExpenses(ne); setEditingExpense(null);
                                }} className="w-full bg-stone-900 text-white py-4.5 rounded-[28px] font-bold text-[10px] uppercase tracking-widest">儲存支出</button>
                                {editingExpense.id && <button onClick={() => { setExpenses(expenses.filter(e => e.id !== editingExpense.id)); setEditingExpense(null); }} className="w-full py-2 text-red-400 text-[9px] font-bold uppercase">刪除</button>}
                                <button onClick={() => setEditingExpense(null)} className="w-full py-2 text-gray-400 text-[9px] font-bold uppercase">取消</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}