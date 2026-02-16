import { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Plane, Train, Home, Utensils, Camera, Star, Info, 
  Map as MapIcon, ShieldAlert, Copy, ExternalLink, 
  Target, Navigation, ChevronUp, 
  ChevronDown, Trash2, X, Image as ImageIcon, ReceiptText, 
  Sparkles, Loader2, Clock, MapPinOff,
  Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog
} from 'lucide-react';

// --- API 設定 ---
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// --- 類型與顏色配置 (參考 IMG_5968) ---
const TYPE_CONFIG = {
    'FLIGHT': { color: '#60A5FA', icon: Plane, label: 'FLIGHT' },
    'TRANSPORT': { color: '#94A3B8', icon: Train, label: 'TRANSPORT' },
    'HOTEL': { color: '#A78BFA', icon: Home, label: 'HOTEL' },
    'FOOD': { color: '#FB923C', icon: Utensils, label: 'FOOD' },
    'SIGHTSEEING': { color: '#34D399', icon: Camera, label: 'SIGHTSEEING' },
    'HIGHLIGHT': { color: '#D4AF37', icon: Star, label: 'HIGHLIGHT' },
    'INFO': { color: '#94A3B8', icon: Info, label: 'INFO' }
};

const CITY_COORDS = {
    'Kyoto': { lat: 35.0116, lon: 135.7681 },
    'Arashiyama': { lat: 35.0116, lon: 135.67 },
    'Uji': { lat: 34.8893, lon: 135.8077 },
    'Osaka': { lat: 34.6937, lon: 135.5023 },
    'USJ': { lat: 34.6654, lon: 135.4323 },
    'Minoo': { lat: 34.8266, lon: 135.4707 },
    'Airport': { lat: 34.4320, lon: 135.2304 }
};

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
    
    const [days, setDays] = useState(() => load('travel_days_v17', INITIAL_PLAN));
    const [expenses, setExpenses] = useState(() => load('exp_v17', []));
    const [infoItems, setInfoItems] = useState(() => load('info_v17', INITIAL_INFO));
    const [vjwLink, setVjwLink] = useState(() => load('vjw_v17', 'https://www.vjw.digital.go.jp/'));
    
    const [view, setView] = useState('plan');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [gpsOn, setGpsOn] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiInputText, setAiInputText] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editingExpense, setEditingExpense] = useState(null);
    const [editingInfo, setEditingInfo] = useState(null);
    const [detailItem, setDetailItem] = useState(null);
    const [currentRate, setCurrentRate] = useState(0.22); 
    const [weatherData, setWeatherData] = useState([]); 

    const fileRef = useRef(null);
    const coverRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('travel_days_v17', JSON.stringify(days));
        localStorage.setItem('exp_v17', JSON.stringify(expenses));
        localStorage.setItem('info_v17', JSON.stringify(infoItems));
        localStorage.setItem('vjw_v17', JSON.stringify(vjwLink));
    }, [days, expenses, infoItems, vjwLink]);

    useEffect(() => {
        fetch('https://open.er-api.com/v6/latest/JPY')
            .then(res => res.json())
            .then(data => { if(data?.rates?.TWD) setCurrentRate(data.rates.TWD); })
            .catch(console.error);
    }, []);

    // --- Open-Meteo 每小時天氣預報 ---
    useEffect(() => {
        const cityKey = days[selectedIdx]?.city || 'Kyoto';
        const coords = CITY_COORDS[cityKey];
        if (coords) {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=1`;
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if(data.hourly) {
                        const now = new Date();
                        const currentHour = now.getHours();
                        const hours = [];
                        for(let i = currentHour; i < currentHour + 24; i++) {
                            if(data.hourly.time[i]) {
                                hours.push({
                                    time: i === currentHour ? "現在" : `${new Date(data.hourly.time[i]).getHours()}:00`,
                                    temp: Math.round(data.hourly.temperature_2m[i]),
                                    icon: mapWmoToIcon(data.hourly.weathercode[i])
                                });
                            }
                        }
                        setWeatherData(hours.filter((_, idx) => idx % 3 === 0)); // 每3小時顯示一次較清爽
                    }
                })
                .catch(() => setWeatherData(getFallbackWeather()));
        }
    }, [selectedIdx, days]);

    const mapWmoToIcon = (code) => {
        if (code === 0 || code === 1) return Sun;
        if (code === 2 || code === 3) return Cloud;
        if (code >= 45 && code <= 48) return CloudFog;
        if (code >= 51 && code <= 67) return CloudRain;
        if (code >= 71 && code <= 77) return Snowflake;
        if (code >= 80 && code <= 82) return CloudRain;
        if (code >= 95) return CloudLightning;
        return Sun;
    };

    const getFallbackWeather = () => ["現在", "12:00", "15:00", "18:00", "21:00", "00:00"].map((t, i) => ({ time: t, temp: 18 - i, icon: Sun }));
    const currentDay = days[selectedIdx] || days[0];
    const firstItem = currentDay?.items?.[0] || { title: '目的地', location: 'Japan' };
    const totalTWD = expenses.reduce((a, c) => a + (c.currency === 'JPY' ? c.amount * (c.rate || currentRate) : c.amount), 0);
    const openMaps = (q) => { if(q) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank'); };
    const openJMA = () => window.open('https://www.jma.go.jp/jma/index.html', '_blank');
    const toggleGps = () => { setGpsOn(!gpsOn); if (!gpsOn && firstItem?.location) setTimeout(() => openMaps(firstItem.location), 500); };
    const handleUpload = (e, type) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => { const b64 = reader.result; if (type === 'cover') setDays(days.map((d, i) => i === selectedIdx ? { ...d, customImg: b64 } : d)); else if (type === 'item') setEditingItem({ ...editingItem, customImg: b64 }); }; reader.readAsDataURL(file); };

    // AI Analyze
    const handleAiAnalyze = async () => {
        if (!aiInputText.trim()) return alert("請輸入行程文字！");
        if (!GEMINI_API_KEY) return alert("請先設定 Gemini Key");
        setIsAiProcessing(true);
        try {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `你是一個旅遊行程轉換器。請將使用者提供的旅遊文字，轉換為符合以下 JSON 格式的陣列。使用者輸入：${aiInputText}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
            const aiData = JSON.parse(text);
            const newDays = days.map((day, index) => {
                const aiDay = aiData[index];
                if (!aiDay) return day;
                return { ...day, title: aiDay.title || day.title, city: aiDay.city || day.city, items: aiDay.items.map((item, i) => ({ id: Date.now() + index * 1000 + i, time: item.time || "09:00", title: item.title || "未命名行程", desc: item.desc || "", type: item.type || "SIGHTSEEING", location: item.location || item.title, highlight: item.highlight || false, btnLabel: '資訊', link: '' })) };
            });
            setDays(newDays); setIsAiModalOpen(false); setAiInputText(''); alert("成功！");
        } catch (error) { console.error(error); alert("失敗"); } finally { setIsAiProcessing(false); }
    };

    return (
        <div className="max-w-md mx-auto min-h-screen relative lg:shadow-2xl">
            {/* FIXED HEADER */}
            <header className="fixed top-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#EBE7DE] pt-8 px-5 pb-2 border-b border-stone-300/50">
                <p className="text-[10px] tracking-[0.4em] text-stone-500 uppercase font-bold text-center mb-1">Japan Trip</p>
                <div className="flex justify-center items-center relative mb-6">
                    <div className="flex items-center gap-2 text-stone-900">
                        <h1 className="serif text-xl font-bold tracking-tight">Kyoto <span className="text-[12px] align-middle text-brand-red mx-0.5 opacity-80">●</span> Osaka</h1>
                        <span className="text-[9px] border border-stone-500 rounded-full px-2.5 py-0.5 italic font-medium text-stone-600">2026</span>
                    </div>
                    <div className="absolute right-0 bottom-0 flex gap-4">
                        <button onClick={() => setIsAiModalOpen(true)} className="flex flex-col items-center gap-0.5 transition-all text-stone-400 hover:text-purple-600"><Sparkles className="w-4 h-4" /><span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>智能</span></button>
                        <button onClick={() => { setView('wallet'); setIsEditMode(false); }} className={`flex flex-col items-center gap-0.5 transition-all ${view === 'wallet' ? 'text-black font-bold' : 'text-stone-500'}`}><ReceiptText className="w-4 h-4" /><span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>帳本</span></button>
                        <button onClick={() => { setView('info'); setIsEditMode(false); }} className={`flex flex-col items-center gap-0.5 transition-all ${view === 'info' ? 'text-black font-bold' : 'text-stone-500'}`}><Info className="w-4 h-4" /><span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>資訊</span></button>
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
                        
                        <div className="relative h-48 rounded-[28px] overflow-hidden shadow-lg mb-8" onClick={() => isEditMode && coverRef.current.click()}>
                            {GOOGLE_API_KEY && !currentDay.customImg ? (
                                <iframe className="map-frame" src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_API_KEY}&q=${encodeURIComponent(currentDay.city)}+Japan&zoom=13`}></iframe>
                            ) : (
                                <img src={currentDay.customImg || currentDay.defaultImg} className="w-full h-full object-cover" />
                            )}
                            <input type="file" ref={coverRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'cover')} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                            <div className="absolute bottom-5 left-6 right-6 pointer-events-none text-white">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="glass-dark px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">Day {selectedIdx + 1}</span>
                                    <span className="glass-dark px-2 py-0.5 rounded text-[8px] font-bold flex items-center gap-1 uppercase tracking-widest"><MapPinOff className="w-2 h-2" /> {currentDay.city}</span>
                                </div>
                                <h2 className="serif text-xl font-bold leading-tight">{currentDay.title}</h2>
                            </div>
                        </div>

                        <div className="mb-8 px-1">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] text-stone-600 font-bold tracking-wider uppercase">每小時預報</span>
                                <span className="text-[9px] text-stone-500 tracking-widest uppercase font-mono">Open-Meteo</span>
                            </div>
                            <div className="flex overflow-x-auto gap-7 hide-scrollbar">
                                {weatherData.map((w, idx) => (
                                    <div key={idx} onClick={openJMA} className="flex flex-col items-center min-w-[42px] gap-3 cursor-pointer">
                                        <span className="text-[10px] text-stone-600 font-medium">{w.time}</span>
                                        <w.icon className={`w-4.5 h-4.5 ${w.time === '現在' ? 'text-orange-500' : 'text-stone-400'}`} />
                                        <span className="serif text-xl text-stone-700 font-bold">{w.temp}°</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-[1px] bg-stone-300/50 mb-10"></div>

                        {/* --- 重構行程列表 (完全符合 IMG_5968 & IMG_5974) --- */}
                        <div className="space-y-4 relative">
                            {/* 背景貫穿線 */}
                            <div className="absolute left-[54px] top-4 bottom-4 w-[1px] bg-stone-300/50"></div>

                            {currentDay.items.map((item, i) => {
                                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG['INFO'];
                                const ItemIcon = cfg.icon;

                                return (
                                <div key={item.id} className="flex gap-4 items-stretch relative">
                                    {isEditMode && (
                                        <div className="flex flex-col gap-2 pt-1 absolute -left-8 z-50">
                                            <button onClick={() => { const d = [...days]; const its = d[selectedIdx].items; if(i>0) [its[i], its[i-1]] = [its[i-1], its[i]]; setDays(d); }} className="text-stone-400"><ChevronUp className="w-4 h-4" /></button>
                                            <button onClick={() => { const d = [...days]; const its = d[selectedIdx].items; if(i<its.length-1) [its[i], its[i+1]] = [its[i+1], its[i]]; setDays(d); }} className="text-stone-400"><ChevronDown className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                    
                                    {/* 左側：時間與節點圖示 */}
                                    <div className="w-14 text-right pt-1 shrink-0 z-10">
                                        <span className="block text-lg font-bold text-stone-800 leading-none">{item.time}</span>
                                        <div className="flex justify-end mt-3 mr-[-4.5px]">
                                            {item.highlight ? (
                                                <div className="w-2.5 h-2.5 bg-amber-400 rotate-45 border border-amber-500 shadow-sm"></div>
                                            ) : (
                                                <div className="w-2 h-2 rounded-full border border-white shadow-sm" style={{ backgroundColor: cfg.color }}></div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 右側：內容卡片 */}
                                    {item.highlight ? (
                                        /* HIGHLIGHT 樣貌 (參考 IMG_5974) */
                                        <div onClick={() => isEditMode ? setEditingItem(item) : setDetailItem(item)} 
                                             className="flex-1 bg-amber-50/50 border border-amber-200 rounded-xl p-5 shadow-sm highlight-card relative ml-2 mb-2">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                <span className="text-[10px] font-bold text-amber-600 tracking-widest uppercase">Special Experience</span>
                                            </div>
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="serif text-xl font-bold text-stone-900 tracking-tight">{item.title}</h3>
                                                {isEditMode && <button onClick={(e) => { e.stopPropagation(); const d = [...days]; d[selectedIdx].items = d[selectedIdx].items.filter(it => it.id !== item.id); setDays(d); }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>}
                                            </div>
                                            <p className="text-sm mt-3 text-stone-600 leading-relaxed border-t border-amber-200/50 pt-3">{item.desc}</p>
                                        </div>
                                    ) : (
                                        /* 一般樣貌 (參考 IMG_5968) */
                                        <div onClick={() => isEditMode ? setEditingItem(item) : setDetailItem(item)} 
                                             className="flex-1 bg-white rounded-r-xl rounded-l-sm p-4 shadow-sm relative ml-2 mb-2 border-l-[4.5px]"
                                             style={{ borderLeftColor: cfg.color }}>
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex flex-col">
                                                    <h3 className="serif text-lg font-bold text-stone-800 tracking-tight leading-snug">{item.title}</h3>
                                                    <div className="flex items-center gap-1.5 mt-1 text-[#A8A8A8]">
                                                        <ItemIcon className="w-3 h-3" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">{cfg.label}</span>
                                                    </div>
                                                </div>
                                                {isEditMode && <button onClick={(e) => { e.stopPropagation(); const d = [...days]; d[selectedIdx].items = d[selectedIdx].items.filter(it => it.id !== item.id); setDays(d); }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>}
                                            </div>
                                            <p className="text-xs text-stone-500 mt-2 leading-relaxed italic">{item.desc}</p>
                                        </div>
                                    )}
                                </div>
                            )})}
                            {isEditMode && (
                                <button onClick={() => setEditingItem({ title: '', desc: '', time: '09:00', type: 'SIGHTSEEING', highlight: false, btnLabel: '資訊', link: '', customImg: null })} className="w-full py-5 border-2 border-dashed border-stone-300 rounded-[30px] text-stone-500 text-[10px] font-bold uppercase tracking-[0.2em] bg-white/30 ml-16 w-[calc(100%-64px)]">+ 新增排程項目</button>
                            )}
                        </div>
                    </div>
                )}

                {/* 帳本頁面 */}
                {view === 'wallet' && (
                    <div className="animate-fade">
                        <h2 className="serif text-2xl font-bold mb-6 text-stone-800 px-1">旅行帳本</h2>
                        <div className="bg-stone-900 p-8 rounded-[40px] text-white mb-8 shadow-2xl relative overflow-hidden">
                            <p className="text-[10px] opacity-50 uppercase tracking-[0.3em] mb-2 font-bold">Total Budget TWD</p>
                            <h3 className="text-4xl font-light tracking-tighter mb-4">${Math.round(totalTWD).toLocaleString()}</h3>
                            <p className="text-[9px] opacity-30 italic">匯率: {currentRate}</p>
                        </div>
                        <div className="space-y-4">
                            {expenses.map(e => (
                                <div key={e.id} onClick={() => setEditingExpense(e)} className="p-5 bg-white rounded-[28px] border border-stone-200 flex justify-between items-center shadow-sm cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600"><ReceiptText className="w-4 h-4" /></div>
                                        <div>
                                            <p className="font-bold text-sm text-stone-800">{e.name}</p>
                                            <p className="text-[10px] text-stone-400 font-bold">{e.currency === 'JPY' ? `¥${e.amount.toLocaleString()}` : `$${e.amount.toLocaleString()}`} (匯率: {e.rate || currentRate})</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-stone-900 text-sm">${Math.round(e.currency === 'JPY' ? e.amount * (e.rate || currentRate) : e.amount).toLocaleString()}</p>
                                </div>
                            ))}
                            <button onClick={() => setEditingExpense({ name: '', amount: 0, currency: 'JPY', type: 'FOOD', rate: currentRate })} className="w-full py-5 bg-stone-900 text-white rounded-[32px] font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl">+ 記一筆支出</button>
                        </div>
                    </div>
                )}

                {/* 資訊頁面 */}
                {view === 'info' && (
                    <div className="animate-fade py-2 space-y-8 px-1">
                        <div className="flex justify-between items-center">
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
                                    <div onClick={() => isEditMode ? setEditingInfo(item) : openMaps(item.link)} className="flex-1 p-7 bg-stone-900 rounded-[40px] text-white flex items-center justify-between shadow-xl relative">
                                        <div className="flex items-center gap-4"><MapIcon className="w-5 h-5 text-blue-400" /><span className="text-sm font-bold tracking-widest uppercase">{item.title}</span></div>
                                        <ExternalLink className="w-4 h-4 opacity-30" />
                                        {isEditMode && <button onClick={(e) => { e.stopPropagation(); setInfoItems(infoItems.filter(i => i.id !== item.id)); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"><X className="w-3 h-3" /></button>}
                                    </div>
                                  )}
                                  {item.type === 'VJW' && (
                                    <div onClick={() => isEditMode ? setEditingInfo(item) : item.link && window.open(item.link)} className="flex-1 p-7 bg-[#1A1A1A] rounded-[40px] shadow-lg relative overflow-hidden">
                                        <span className="absolute top-6 left-6 text-[9px] bg-[#E85D75] text-white px-2 py-0.5 rounded font-bold tracking-widest">MUST HAVE</span>
                                        <div className="mt-8 mb-2"><h4 className="serif text-2xl font-bold text-white mb-1">{item.title}</h4><p className="text-[10px] text-stone-400">{item.content}</p></div>
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
                                    <div onClick={() => isEditMode ? setEditingInfo(item) : item.link && window.open(item.link)} className="flex-1 p-6 bg-white border border-stone-200 rounded-[28px] shadow-sm relative active:scale-[0.98] transition-all">
                                        <h4 className="serif text-lg font-bold text-stone-800 mb-2">{item.title}</h4>
                                        <p className="text-xs text-stone-500 font-medium italic border-b border-stone-50 pb-4">{item.content}</p>
                                        <div className="mt-4 flex justify-between items-center"><span className="text-[9px] font-bold text-stone-300 uppercase tracking-tighter">Open Link →</span><button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.content); }} className="text-stone-300"><Copy className="w-4 h-4" /></button></div>
                                        {isEditMode && <button onClick={(e) => { e.stopPropagation(); setInfoItems(infoItems.filter(i => i.id !== item.id)); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"><X className="w-3 h-3" /></button>}
                                    </div>
                                  )}
                              </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* STATUS BAR */}
            {view === 'plan' && (
                <div key={gpsOn ? 'gps-active' : 'gps-idle'} className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-sm glass rounded-[32px] p-3.5 border border-white/60 shadow-2xl flex items-center justify-between z-40 bg-white/80">
                    <div className="flex items-center gap-4 flex-1">
                        <div onClick={toggleGps} className="flex flex-col items-center gap-0.5 border-r border-stone-200 pr-4 cursor-pointer group">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${gpsOn ? 'bg-red-50 text-red-600 animate-pulse shadow-md' : 'bg-stone-100 text-stone-400'}`}><Target className="w-4 h-4" /></div>
                            <span className={`text-[7px] font-bold uppercase mt-1 ${gpsOn ? 'text-red-700' : 'text-stone-400'}`}>GPS {gpsOn ? 'ON' : 'OFF'}</span>
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={() => { if(gpsOn && firstItem?.location) openMaps(firstItem.location); }}>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="serif text-base font-bold text-stone-800 tracking-tighter">{gpsOn ? (isMoving ? '移動中...' : '準備中...') : (currentDay?.items?.[0]?.time || '13:25')}</span>
                                <span className="text-[7px] bg-stone-200 px-2 py-0.5 rounded-sm text-stone-600 font-bold uppercase tracking-widest">{gpsOn ? 'Live' : 'Next'}</span>
                            </div>
                            <p className="text-[9px] text-stone-500 font-bold truncate w-32 tracking-tight">→ {firstItem?.title || '目的地'}</p>
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

            {/* AI Modal */}
            {isAiModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-fade">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative">
                        <button onClick={() => setIsAiModalOpen(false)} className="absolute top-6 right-6 p-2 bg-stone-100 rounded-full text-stone-400"><X className="w-4 h-4" /></button>
                        <div className="flex items-center gap-2 mb-2 text-purple-600"><Sparkles className="w-5 h-5" /><h3 className="serif text-xl font-bold">AI 智能匯入</h3></div>
                        <textarea className="w-full h-40 p-4 bg-stone-50 rounded-2xl text-xs outline-none border border-stone-200 resize-none mb-4" placeholder="貼上行程文字..." value={aiInputText} onChange={(e) => setAiInputText(e.target.value)} />
                        <button onClick={handleAiAnalyze} disabled={isAiProcessing} className="w-full py-4 bg-purple-600 text-white rounded-full font-bold text-xs uppercase tracking-widest">{isAiProcessing ? "分析中..." : "開始轉換"}</button>
                    </div>
                </div>
            )}

            {/* 編輯 & 詳情 Modal ... 這裡保持您原本的視窗邏輯，確保修改、新增功能不變 ... */}
            {/* [其餘 Detail / Edit Modal 程式碼請保留您目前的內容] */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-fade overflow-y-auto max-h-[90vh]">
                        <h3 className="serif text-xl font-bold mb-6 text-stone-800">行程編輯</h3>
                        <div className="space-y-4">
                            <div className="h-28 bg-stone-100 rounded-2xl flex flex-col items-center justify-center border border-dashed border-stone-300 relative overflow-hidden" onClick={() => fileRef.current.click()}>{editingItem.customImg ? <img src={editingItem.customImg} className="w-full h-full object-cover" /> : <div className="text-center"><ImageIcon className="w-5 h-5 text-stone-400 mx-auto" /><p className="text-[8px] text-stone-500 mt-1 uppercase font-bold tracking-widest">更換照片</p></div>}<input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'item')} /></div>
                            <div className="flex gap-4"><div className="flex-1"><label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">時間</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-sm" value={editingItem.time} onChange={e => setEditingItem({...editingItem, time: e.target.value})} /></div><div className="w-24"><label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">類型</label><select className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs" value={editingItem.type} onChange={e => setEditingItem({...editingItem, type: e.target.value})}>{Object.keys(ICON_MAP).map(k => <option key={k} value={k}>{k}</option>)}</select></div></div>
                            <div><label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">標題</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-sm font-bold" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} /></div>
                            <div><label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">內容描述</label><textarea className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs h-20" value={editingItem.desc} onChange={e => setEditingItem({...editingItem, desc: e.target.value})} /></div>
                            <div><label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">導航地點</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs font-bold" value={editingItem.location} onChange={e => setEditingItem({...editingItem, location: e.target.value})} /></div>
                            <div className="flex items-center justify-between p-3.5 bg-amber-50 rounded-xl"><span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Highlight (金邊)</span><input type="checkbox" checked={editingItem.highlight} onChange={e => setEditingItem({...editingItem, highlight: e.target.checked})} /></div>
                            <div className="pt-4 flex gap-3"><button onClick={() => { const d = [...days]; const dy = d[selectedIdx]; if(editingItem.id) dy.items = dy.items.map(i => i.id === editingItem.id ? editingItem : i); else dy.items.push({...editingItem, id: Date.now()}); setDays(d); setEditingItem(null); }} className="flex-1 bg-stone-900 text-white py-4.5 rounded-[28px] font-bold text-[10px] uppercase tracking-widest">確認儲存</button><button onClick={() => setEditingItem(null)} className="px-7 py-4.5 border border-stone-200 rounded-[28px] text-stone-400"><X className="w-4 h-4" /></button></div>
                        </div>
                    </div>
                </div>
            )}
            
            {detailItem && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade">
                    <div className="bg-white w-full max-w-sm rounded-[45px] overflow-hidden shadow-2xl relative">
                        <button onClick={() => setDetailItem(null)} className="absolute top-6 right-6 p-2 bg-stone-100 rounded-full z-10"><X className="w-4 h-4 text-stone-500" /></button>
                        <div className="h-48 bg-stone-100 flex items-center justify-center overflow-hidden">{detailItem.customImg ? <img src={detailItem.customImg} className="w-full h-full object-cover" /> : <MapPinOff className="w-12 h-12 text-stone-200" />}</div>
                        <div className="p-9 pb-12">
                            <div className="flex items-center gap-2 mb-4"><span className="text-[10px] font-bold text-white bg-brand-red px-2.5 py-1 rounded tracking-tighter uppercase">{detailItem.time}</span><span className="text-[9px] text-stone-400 font-bold tracking-[0.2em] uppercase">{detailItem.type}</span></div>
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

            {editingExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-xs rounded-[40px] p-8 shadow-2xl animate-fade">
                        <h3 className="serif text-xl font-bold mb-6 text-stone-800">支出編輯</h3>
                        <div className="space-y-4">
                            <div><label className="text-[10px] text-stone-400 font-bold uppercase">名稱</label><input className="w-full p-3 bg-stone-100 rounded-xl outline-none text-sm font-bold" value={editingExpense.name} onChange={e => setEditingExpense({...editingExpense, name: e.target.value})} /></div>
                            <div className="flex gap-3"><div className="flex-1"><label className="text-[10px] text-stone-400 font-bold uppercase">金額</label><input type="number" className="w-full p-3 bg-stone-100 rounded-xl outline-none text-base font-bold" value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: Number(e.target.value)})} /></div><div className="w-20"><label className="text-[10px] text-stone-400 font-bold uppercase">幣別</label><select className="w-full p-3 bg-stone-100 rounded-xl outline-none text-xs font-bold" value={editingExpense.currency} onChange={e => setEditingExpense({...editingExpense, currency: e.target.value})}><option value="JPY">JPY</option><option value="TWD">TWD</option></select></div></div>
                            <div className="pt-4 flex flex-col gap-2"><button onClick={() => { const ne = editingExpense.id ? expenses.map(e => e.id === editingExpense.id ? editingExpense : e) : [...expenses, {...editingExpense, id: Date.now()}]; setExpenses(ne); setEditingExpense(null); }} className="w-full bg-stone-900 text-white py-4.5 rounded-[28px] font-bold text-[10px] uppercase tracking-widest">儲存支出</button>{editingExpense.id && <button onClick={() => { setExpenses(expenses.filter(e => e.id !== editingExpense.id)); setEditingExpense(null); }} className="w-full py-2 text-red-400 text-[9px] font-bold uppercase">刪除</button>}<button onClick={() => setEditingExpense(null)} className="w-full py-2 text-gray-400 text-[9px] font-bold uppercase">取消</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}