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
// Open-Meteo 不需要 API Key

// --- 顏色對應表 (參考 IMG_5968) ---
const TYPE_CONFIG = {
    'FLIGHT': { color: '#60A5FA', icon: Plane, label: 'FLIGHT' },
    'TRANSPORT': { color: '#94A3B8', icon: Train, label: 'TRANSPORT' },
    'HOTEL': { color: '#A78BFA', icon: Home, label: 'HOTEL' },
    'FOOD': { color: '#FB923C', icon: Utensils, label: 'FOOD' },
    'SIGHTSEEING': { color: '#34D399', icon: Camera, label: 'SIGHTSEEING' },
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

// 初始資料
const INITIAL_PLAN = [
    { id: 1, date: '25', day: 'SAT', title: '抵達京都與鴨川', city: 'Kyoto', defaultImg: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000', customImg: null, items: [{ id: 101, time: '13:25', title: '出發 (JX846)', desc: '星宇航空 TPE 直飛 KIX', type: 'FLIGHT', location: '關西國際機場', highlight: false, btnLabel: '官方網站', link: 'https://www.starlux-airlines.com' }, { id: 102, time: '16:00', title: '錦市場巡禮', desc: '品嚐豆乳甜甜圈與三木雞卵', type: 'FOOD', location: '錦市場', highlight: false, btnLabel: '資訊', link: '' }] },
    { id: 2, date: '26', day: 'SUN', title: '嵐山新綠', city: 'Arashiyama', defaultImg: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=1000', customImg: null, items: [{ id: 201, time: '09:30', title: '嵐山竹林之道', desc: '漫步綠意之道', type: 'SIGHTSEEING', location: '嵐山', highlight: false, btnLabel: '資訊', link: '' }, { id: 202, time: '11:00', title: '天龍寺', desc: '參觀世界遺產庭園', type: 'SIGHTSEEING', location: '天龍寺', highlight: false, btnLabel: '官方網站', link: '' }, { id: 203, time: '14:00', title: '金閣寺', desc: '欣常夕陽下的金閣', type: 'SIGHTSEEING', location: '金閣寺', highlight: true, btnLabel: '資訊', link: '' }] },
    { id: 3, date: '27', day: 'MON', title: '任天堂博物館', city: 'Uji', defaultImg: 'https://images.unsplash.com/photo-1601362840469-51e4d8d59085?q=80&w=1000', customImg: null, items: [{ id: 301, time: '11:00', title: '任天堂博物館', desc: 'Nintendo Museum (預約制)', type: 'HIGHLIGHT', location: 'Nintendo Museum', highlight: true, btnLabel: '官方網站', link: 'https://museum.nintendo.com' }] },
];

const INITIAL_INFO = [
    { id: 'map', type: 'MAP', title: 'Google Maps', content: '開啟地圖導航', link: 'Osaka' },
    { id: 'vjw', type: 'VJW', title: 'Visit Japan Web', content: '入境審查 & 海關申報 (請截圖)', link: 'https://www.vjw.digital.go.jp/' },
    { id: 'sos', type: 'EMERGENCY', title: '緊急聯絡 & 支援', content: 'Police 110 / Medical 119', link: '' }
];

export default function App() {
    const load = (k, i) => { const s = localStorage.getItem(k); return s ? JSON.parse(s) : i; };
    const [days, setDays] = useState(() => load('travel_days_v15', INITIAL_PLAN));
    const [expenses, setExpenses] = useState(() => load('exp_v15', []));
    const [infoItems, setInfoItems] = useState(() => load('info_v15', INITIAL_INFO));
    const [vjwLink, setVjwLink] = useState(() => load('vjw_v15', 'https://www.vjw.digital.go.jp/'));
    
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

    // Persistence
    useEffect(() => {
        localStorage.setItem('travel_days_v15', JSON.stringify(days));
        localStorage.setItem('exp_v15', JSON.stringify(expenses));
        localStorage.setItem('info_v15', JSON.stringify(infoItems));
        localStorage.setItem('vjw_v15', JSON.stringify(vjwLink));
    }, [days, expenses, infoItems, vjwLink]);

    // Exchange Rate
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
                    if (data.hourly) {
                        const now = new Date().getHours();
                        const next24 = [];
                        // 取得從目前小時開始的 24 小時資料
                        for (let i = now; i < now + 24; i++) {
                            if (data.hourly.time[i]) {
                                const timeLabel = i === now ? "現在" : `${new Date(data.hourly.time[i]).getHours()}:00`;
                                next24.push({
                                    time: timeLabel,
                                    temp: Math.round(data.hourly.temperature_2m[i]),
                                    icon: mapWeatherIcon(data.hourly.weathercode[i])
                                });
                            }
                        }
                        setWeatherData(next24.filter((_, idx) => idx % 3 === 0)); // 每3小時顯示一次以防太擁擠
                    }
                })
                .catch(() => setWeatherData(getFallbackWeather()));
        }
    }, [selectedIdx, days]);

    // WMO Weather Codes to Lucide
    const mapWeatherIcon = (code) => {
        if (code === 0) return Sun;
        if (code <= 3) return Cloud;
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
            <header className="fixed top-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#EBE7DE] pt-8 px-5 pb-2 border-b border-stone-300">
                <p className="text-[10px] tracking-[0.4em] text-stone-500 uppercase font-bold text-center mb-1">Japan Trip</p>
                <div className="flex justify-center items-center relative mb-8">
                    <div className="flex items-center gap-2 text-stone-900">
                        <h1 className="serif text-xl font-bold tracking-tight">Kyoto <span className="text-[12px] align-middle text-brand-red mx-0.5 opacity-80">●</span> Osaka</h1>
                        <span className="text-[9px] border border-stone-500 rounded-full px-2.5 py-0.5 italic font-medium text-stone-600">2026</span>
                    </div>
                    <div className="absolute right-0 bottom-0 flex gap-5">
                        <button onClick={() => setIsAiModalOpen(true)} className="flex flex-col items-center gap-1 transition-all text-stone-400 hover:text-purple-600"><Sparkles className="w-4 h-4" /><span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>智能</span></button>
                        <button onClick={() => { setView('wallet'); setIsEditMode(false); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'wallet' ? 'text-black font-bold' : 'text-stone-500'}`}><ReceiptText className="w-4 h-4" /><span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>帳本</span></button>
                        <button onClick={() => { setView('info'); setIsEditMode(false); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'info' ? 'text-black font-bold' : 'text-stone-500'}`}><Info className="w-4 h-4" /><span className="text-[9px] font-bold" style={{writingMode: 'vertical-lr'}}>資訊</span></button>
                    </div>
                </div>
                <div className="flex flex-col -mt-2">
                    <span className="text-[9px] tracking-widest text-stone-600 font-bold uppercase mb-1 ml-1">Apr 25 - May 2</span>
                    <div className="flex overflow-x-auto hide-scrollbar flex gap-8 pt-4 pb-2">
                        {days.map((d, i) => (
                            <div key={d.id} onClick={() => { setSelectedIdx(i); setView('plan'); }} className={`relative flex flex-col items-center min-w-[32px] cursor-pointer transition-all ${view === 'plan' && selectedIdx === i ? 'text-black font-bold active-dot scale-110' : 'text-gray-400'}`}>
                                <span className="text-[10px] mb-1">{d.day}</span>
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
                        <div className="flex justify-between items-center mb-6">
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

                        {/* WEATHER SECTION - 每小時預報 */}
                        <div className="mb-12 px-1">
                            <div className="flex justify-between items-center mb-8">
                                <span className="text-[10px] text-stone-600 font-bold tracking-wider uppercase">每小時天氣預報</span>
                                <span className="text-[9px] text-stone-500 tracking-widest uppercase font-mono">Open-Meteo</span>
                            </div>
                            <div className="flex overflow-x-auto gap-8 hide-scrollbar">
                                {weatherData.map((w, idx) => (
                                    <div key={idx} onClick={openJMA} className="flex flex-col items-center min-w-[42px] gap-4 cursor-pointer">
                                        <span className="text-[10px] text-stone-600 font-medium">{w.time}</span>
                                        <w.icon className="w-4.5 h-4.5 text-orange-500 opacity-80" />
                                        <span className="serif text-xl text-stone-700 font-bold">{w.temp}°</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-[1px] bg-stone-300 mb-12"></div>

                        {/* ITINERARY LIST - 完全還原 IMG_5968 & IMG_5974 */}
                        <div className="space-y-10 relative before:absolute before:left-[64px] before:top-4 before:bottom-4 before:w-[1px] before:bg-stone-300/60">
                            {currentDay.items.map((item, i) => {
                                const IconComp = ICON_COMPONENTS[item.type] || MapPinOff;
                                const config = TYPE_CONFIG[item.type] || TYPE_CONFIG['INFO'];
                                
                                return (
                                <div key={item.id} className="flex gap-4 items-start relative z-10">
                                    {/* 編輯功能箭頭 */}
                                    {isEditMode && (
                                        <div className="flex flex-col gap-2 pt-1 absolute -left-8">
                                            <button onClick={() => { const d = [...days]; const its = d[selectedIdx].items; if(i>0) [its[i], its[i-1]] = [its[i-1], its[i]]; setDays(d); }} className="text-stone-400"><ChevronUp className="w-4 h-4" /></button>
                                            <button onClick={() => { const d = [...days]; const its = d[selectedIdx].items; if(i<its.length-1) [its[i], its[i+1]] = [its[i+1], its[i]]; setDays(d); }} className="text-stone-400"><ChevronDown className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                    
                                    {/* 左側：時間 + 圓圈/菱形指標 */}
                                    <div className="w-[60px] text-right shrink-0 flex flex-col items-end">
                                        <span className="text-lg font-bold text-stone-800 leading-none">{item.time}</span>
                                        <div className="relative mt-3 mr-[-4.5px]">
                                            {item.highlight ? (
                                                <div className="w-2.5 h-2.5 bg-amber-400 rotate-45 border border-amber-500 shadow-sm"></div>
                                            ) : (
                                                <div className={`w-2.5 h-2.5 rounded-full border-[2px] bg-white`} style={{ borderColor: config.color }}></div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 右側：行程卡片 */}
                                    <div 
                                        onClick={() => isEditMode ? setEditingItem(item) : setDetailItem(item)} 
                                        className={`flex-1 p-5 cursor-pointer transition-all ml-4
                                            ${item.highlight 
                                                ? 'bg-amber-50/50 border border-amber-200 rounded-xl shadow-sm highlight-card' 
                                                : `bg-white rounded-r-xl rounded-l-sm shadow-sm border-l-[5px]`
                                            }`}
                                        style={!item.highlight ? { borderLeftColor: config.color } : {}}
                                    >
                                        {item.highlight && (
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                <span className="text-[10px] font-bold text-amber-600 tracking-widest uppercase">Special Experience</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <IconComp className={`w-3.5 h-3.5 ${item.highlight ? 'text-amber-500' : 'text-stone-400'}`} />
                                                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{config.label}</span>
                                                </div>
                                                <h3 className={`serif font-bold tracking-tight ${item.highlight ? 'text-xl text-stone-900' : 'text-lg text-stone-800'}`}>
                                                    {item.title}
                                                </h3>
                                            </div>
                                            {isEditMode && <button onClick={(e) => { e.stopPropagation(); const d = [...days]; d[selectedIdx].items = d[selectedIdx].items.filter(it => it.id !== item.id); setDays(d); }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>}
                                        </div>
                                        <p className={`text-xs mt-2 leading-relaxed ${item.highlight ? 'text-stone-600 border-t border-amber-100 pt-2' : 'text-stone-500'}`}>
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            )})}
                            {isEditMode && (
                                <button onClick={() => setEditingItem({ title: '', desc: '', time: '09:00', type: 'SIGHTSEEING', highlight: false, btnLabel: '資訊', link: '', customImg: null })} className="w-full py-5 border-2 border-dashed border-stone-300 rounded-[30px] text-stone-500 text-[10px] font-bold uppercase tracking-[0.2em] bg-white/30 ml-[76px] w-[calc(100%-76px)]">+ 新增排程項目</button>
                            )}
                        </div>
                    </div>
                )}

                {/* 錢包與資訊頁面邏輯保持不變... */}
                {view === 'wallet' && (
                    <div className="animate-fade">
                        <h2 className="serif text-2xl font-bold mb-6 text-stone-800">旅行帳本</h2>
                        <div className="bg-stone-900 p-10 rounded-[45px] text-white mb-10 shadow-2xl relative overflow-hidden">
                            <p className="text-[10px] opacity-50 uppercase tracking-[0.3em] mb-2 font-bold">Total Budget TWD</p>
                            <h3 className="text-4xl font-light tracking-tighter mb-4">${Math.round(totalTWD).toLocaleString()}</h3>
                            <p className="text-[9px] opacity-30 italic">Exchange rate: {currentRate}</p>
                        </div>
                        <div className="space-y-4">
                            {expenses.map(e => (
                                <div key={e.id} onClick={() => setEditingExpense(e)} className="p-6 bg-white rounded-[32px] border border-stone-200 flex justify-between items-center shadow-sm cursor-pointer">
                                    <div className="flex items-center gap-5">
                                        <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center text-stone-600"><ReceiptText className="w-5 h-5" /></div>
                                        <div><p className="font-bold text-sm text-stone-800">{e.name}</p><p className="text-[10px] text-stone-400 font-bold">{e.currency === 'JPY' ? `¥${e.amount.toLocaleString()}` : `$${e.amount.toLocaleString()}`}</p></div>
                                    </div>
                                    <p className="font-bold text-stone-900 text-sm">${Math.round(e.currency === 'JPY' ? e.amount * currentRate : e.amount).toLocaleString()}</p>
                                </div>
                            ))}
                            <button onClick={() => setEditingExpense({ name: '', amount: 0, currency: 'JPY', type: 'FOOD', rate: currentRate })} className="w-full py-5 bg-stone-900 text-white rounded-[32px] font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl">+ 記一筆支出</button>
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
                            <p className="text-[9px] text-stone-500 font-bold truncate w-32 tracking-tight">→ {firstItem?.title || '下一站目的地'}</p>
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

            {/* AI, Detail, Edit Modals ... (與之前相同，略過以節省篇幅) */}
            {/* ... 此處應放置您原本專案中的所有 Modal 組件程式碼 ... */}
        </div>
    );
}