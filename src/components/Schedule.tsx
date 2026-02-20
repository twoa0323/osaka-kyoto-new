import React, { useState, useMemo, useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { MapPin, Plus, Edit3, Trash2, Utensils, Plane, Home, Camera, Sparkles, X, Loader2, Wind, Umbrella, Sunrise, ChevronUp, ChevronDown, Clock, Cloud, CloudRain, Sun, Droplets } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ScheduleItem } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-3-flash-preview"; 
const ICON_MAP = { sightseeing: Camera, food: Utensils, transport: Plane, hotel: Home };

// 🎨 淺色塗鴉風配色 (高飽和、非螢光)
const CATEGORY_STYLE = {
  sightseeing: { bg: 'bg-splat-yellow', text: 'text-splat-dark', label: 'SIGHTSEEING' },
  food: { bg: 'bg-splat-pink', text: 'text-white', label: 'FOOD' },        
  transport: { bg: 'bg-splat-blue', text: 'text-white', label: 'TRANSPORT' }, 
  hotel: { bg: 'bg-splat-green', text: 'text-white', label: 'HOTEL' },        
};

const getWeatherDesc = (code: number) => {
  if (code === undefined || code === -1) return { t: '等待載入', e: '☁️' };
  if (code === 0) return { t: '晴朗無雲', e: '☀️' };
  if (code === 1) return { t: '大致晴朗', e: '🌤️' };
  if (code === 2) return { t: '多雲時晴', e: '⛅' };
  if (code === 3) return { t: '陰天多雲', e: '☁️' };
  if ([45, 48].includes(code)) return { t: '霧氣瀰漫', e: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(code)) return { t: '毛毛細雨', e: '🌦️' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { t: '陣雨綿綿', e: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { t: '降雪紛飛', e: '🌨️' };
  if ([95, 96, 99].includes(code)) return { t: '雷雨交加', e: '⛈️' };
  return { t: '晴朗無雲', e: '☀️' };
};

const getWindLevel = (speed: number) => {
  if (speed < 2) return '0級';
  if (speed < 6) return '1級';
  if (speed < 12) return '2級';
  if (speed < 20) return '3級';
  if (speed < 29) return '4級';
  if (speed < 39) return '5級';
  return '6級+';
};

const CITY_DB = [
  { keys: ['東京', 'Tokyo', '新宿', '淺草', '澀谷', '迪士尼'], name: 'TOKYO', lat: 35.6895, lng: 139.6917 },
  { keys: ['京都', 'Kyoto', '清水寺', '嵐山', '金閣寺'], name: 'KYOTO', lat: 35.0116, lng: 135.7681 },
  { keys: ['大阪', 'Osaka', '梅田', '難波', '心齋橋', '環球'], name: 'OSAKA', lat: 34.6937, lng: 135.5023 },
  { keys: ['奈良', 'Nara', '東大寺', '春日大社', '奈良公園'], name: 'NARA', lat: 34.6851, lng: 135.8048 },
  { keys: ['宇治', 'Uji', '平等院', '抹茶'], name: 'UJI', lat: 34.8906, lng: 135.8039 },
  { keys: ['神戶', 'Kobe', '三宮', '姬路'], name: 'KOBE', lat: 34.6901, lng: 135.1955 },
  { keys: ['釜山', 'Busan', '海雲台', '西面'], name: 'BUSAN', lat: 35.1028, lng: 129.0403 },
  { keys: ['富士', 'Fuji', '河口湖'], name: 'FUJI', lat: 35.4986, lng: 138.7690 },
  { keys: ['福岡', 'Fukuoka', '博多', '天神'], name: 'FUKUOKA', lat: 33.5902, lng: 130.4017 },
];

export const Schedule = ({ externalDateIdx = 0 }: { externalDateIdx?: number }) => {
  const { trips, currentTripId, deleteScheduleItem, addScheduleItem, reorderScheduleItems } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>();
  const [detailItem, setDetailItem] = useState<ScheduleItem | undefined>();

  const [weatherCache, setWeatherCache] = useState<Record<string, any>>({});
  const [showFullWeather, setShowFullWeather] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 📝 完整保留：日期範圍計算
  const dateRange = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return [];
    const start = parseISO(trip.startDate);
    const end = parseISO(trip.endDate);
    if (!isValid(start) || !isValid(end)) return [];
    const diff = Math.max(0, differenceInDays(end, start)) + 1;
    return Array.from({ length: diff }, (_, i) => addDays(start, i));
  }, [trip]);

  const selectedDateStr = dateRange.length > 0 ? format(dateRange[externalDateIdx], 'yyyy-MM-dd') : '';
  const dayItems = useMemo(() => (trip?.items || []).filter(i => i.date === selectedDateStr).sort((a, b) => a.time.localeCompare(b.time)), [trip, selectedDateStr]);

  // 📝 完整保留：城市時間軸分析與 Fallback 邏輯
  const timeline = useMemo(() => {
    const defaultCity = { name: trip?.dest.toUpperCase() || 'CITY', lat: trip?.lat || 0, lng: trip?.lng || 0 };
    if (!trip || dateRange.length === 0) return [{ time: '00:00', city: defaultCity }];

    const getFallbackCity = () => {
      for (let i = externalDateIdx - 1; i >= 0; i--) {
        const dStr = format(dateRange[i], 'yyyy-MM-dd');
        const items = trip.items.filter(it => it.date === dStr).sort((a,b) => b.time.localeCompare(a.time));
        for (const it of items) {
          const found = CITY_DB.find(c => c.keys.some(k => `${it.title} ${it.location}`.includes(k)));
          if (found) return found;
        }
      }
      for (let i = externalDateIdx + 1; i < dateRange.length; i++) {
        const dStr = format(dateRange[i], 'yyyy-MM-dd');
        const items = trip.items.filter(it => it.date === dStr).sort((a,b) => a.time.localeCompare(b.time));
        for (const it of items) {
          const found = CITY_DB.find(c => c.keys.some(k => `${it.title} ${it.location}`.includes(k)));
          if (found) return found;
        }
      }
      return defaultCity;
    };

    const tl: { time: string, city: typeof defaultCity }[] = [];
    for (const item of dayItems) {
      const found = CITY_DB.find(c => c.keys.some(k => `${item.title} ${item.location}`.includes(k)));
      if (found) {
        if (tl.length === 0 || tl[tl.length - 1].city.name !== found.name) {
          tl.push({ time: item.time, city: found });
        }
      }
    }

    if (tl.length === 0) {
      tl.push({ time: '00:00', city: getFallbackCity() });
    } else if (tl[0].time !== '00:00') {
      tl.unshift({ time: '00:00', city: getFallbackCity() });
    }
    return tl;
  }, [dayItems, trip, externalDateIdx, dateRange]);

  const uniqueCities = useMemo(() => {
    const map = new Map();
    timeline.forEach(t => map.set(t.city.name, t.city));
    return Array.from(map.values());
  }, [timeline]);

  // 📝 完整保留：天氣 API 抓取
  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      const newCache = { ...weatherCache };
      let changed = false;
      for (const city of uniqueCities) {
        if (!newCache[city.name]) {
          try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,windspeed_10m_max&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m&timezone=auto`);
            const data = await res.json();
            newCache[city.name] = data;
            changed = true;
          } catch (e) { console.error(e); }
        }
      }
      if (isMounted && changed) setWeatherCache(newCache);
    };
    fetchWeather();
    return () => { isMounted = false; };
  }, [uniqueCities.map(c => c.name).join(',')]);

  // 📝 完整保留：今日天氣整理
  let todayWeather = { max: '--', min: '--', code: -1, rain: '0', sunrise: '--:--', wind: '0級', cityName: timeline[0]?.city.name || 'CITY' };
  
  if (timeline.length > 0 && weatherCache[timeline[0].city.name]) {
    const mainCityData = weatherCache[timeline[0].city.name];
    let dailyIdx = mainCityData.daily.time.findIndex((t: string) => t === selectedDateStr);
    if (dailyIdx === -1) dailyIdx = 0;
    
    todayWeather = {
      cityName: timeline[0].city.name,
      max: Math.round(mainCityData.daily.temperature_2m_max[dailyIdx]).toString(),
      min: Math.round(mainCityData.daily.temperature_2m_min[dailyIdx]).toString(),
      code: mainCityData.daily.weathercode[dailyIdx],
      rain: mainCityData.daily.precipitation_probability_max[dailyIdx].toString(),
      sunrise: format(parseISO(mainCityData.daily.sunrise[dailyIdx]), 'HH:mm'),
      wind: getWindLevel(mainCityData.daily.windspeed_10m_max[dailyIdx] || 0)
    };
  }
  const weatherInfo = getWeatherDesc(todayWeather.code);

  // 📝 完整保留：補回！24小時天氣資料處理陣列
  let todayHourly: any[] = [];
  if (timeline.length > 0 && weatherCache[timeline[0].city.name]) {
    const mainCityData = weatherCache[timeline[0].city.name];
    let dailyIdx = mainCityData.daily.time.findIndex((t: string) => t === selectedDateStr);
    if (dailyIdx === -1) dailyIdx = 0;
    const targetDateForHourly = mainCityData.daily.time[dailyIdx];

    for (let h = 0; h < 24; h++) {
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      let activeCity = timeline[0].city;
      for (const t of timeline) {
        if (t.time <= hourStr) activeCity = t.city;
        else break;
      }
      const cityData = weatherCache[activeCity.name];
      if (cityData && cityData.hourly) {
        const startIdx = cityData.hourly.time.findIndex((t: string) => t.startsWith(targetDateForHourly));
        if (startIdx !== -1 && cityData.hourly.time[startIdx + h]) {
          todayHourly.push({
            cityName: activeCity.name,
            time: cityData.hourly.time[startIdx + h],
            temp: cityData.hourly.temperature_2m[startIdx + h],
            code: cityData.hourly.weathercode[startIdx + h],
            prob: cityData.hourly.precipitation_probability[startIdx + h],
            wind: cityData.hourly.windspeed_10m[startIdx + h]
          });
        }
      }
    }
  }

  // 📝 完整保留：AI 解析
  const handleAiAnalyze = async () => {
    if (!GEMINI_API_KEY) return alert("請設定 Gemini Key");
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `分析文字並回傳純 JSON 陣列。格式: [{"time":"HH:mm", "title":"景點", "location":"地址", "category":"sightseeing/food/transport/hotel", "note":"介紹"}]。日期: ${selectedDateStr}。內容: ${aiText}`;
      const res = await model.generateContent(prompt);
      const match = res.response.text().match(/\[[\s\S]*\]/);
      if (match) {
        JSON.parse(match[0]).forEach((i: any) => addScheduleItem(trip.id, { 
          ...i, 
          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, 
          date: selectedDateStr, 
          images: [] 
        }));
        setIsAiOpen(false); setAiText('');
      }
    } catch (e) { alert("AI 解析失敗"); }
    finally { setIsAiLoading(false); }
  };

  const handleMove = (idx: number, dir: 'up'|'down') => {
    const ni = [...trip.items];
    const itemsOfThisDay = ni.filter(i => i.date === selectedDateStr);
    const globalIdx = ni.findIndex(x => x.id === itemsOfThisDay[idx].id);
    const targetGlobalIdx = ni.findIndex(x => x.id === itemsOfThisDay[dir === 'up' ? idx - 1 : idx + 1].id);
    
    if (targetGlobalIdx !== -1) {
       [ni[globalIdx], ni[targetGlobalIdx]] = [ni[targetGlobalIdx], ni[globalIdx]];
       reorderScheduleItems(trip.id, ni);
    }
  };

  if (!trip || dateRange.length === 0) return null;

  return (
    <div className="flex flex-col h-full relative text-splat-dark">
      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8 pb-32">
        
        {/* ==================================================== */}
        {/* 1. 天氣卡片 - 淺色底、粗邊框、非螢光亮色點綴         */}
        {/* ==================================================== */}
        <div 
          onClick={() => setShowFullWeather(true)} 
          className="bg-white rounded-[32px] border-[3px] border-splat-dark flex flex-col cursor-pointer transition-transform active:scale-[0.98] shadow-splat-solid relative overflow-hidden"
        >
          {/* Header 區域 */}
          <div className="bg-splat-blue border-b-[3px] border-splat-dark p-4 flex justify-between items-center text-white">
             <div className="font-black text-xs uppercase tracking-widest bg-white text-splat-dark px-3 py-1 rounded-full border-2 border-splat-dark -rotate-2 shadow-splat-solid-sm">
               WEATHER
             </div>
             <span className="font-black text-xl tracking-tighter uppercase drop-shadow-md">{todayWeather.cityName}</span>
          </div>

          {/* 主要資訊：淺灰色波點底 */}
          <div className="py-8 px-6 flex justify-between items-center bg-[radial-gradient(#D1D5DB_1.5px,transparent_1px)] bg-[size:16px_16px]">
            {/* 高溫 */}
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-splat-dark">{todayWeather.max}°</span>
              <span className="mt-1 bg-splat-pink text-white text-[10px] px-3 py-0.5 rounded-full font-black border-[2px] border-splat-dark shadow-sm">HIGH</span>
            </div>

            {/* 圖示 */}
            <div className="flex flex-col items-center flex-1 px-4 text-center">
              <span className="text-6xl drop-shadow-md">{weatherInfo.e}</span>
              <span className="text-xs font-black bg-white text-splat-dark px-3 py-1 rounded-lg border-2 border-splat-dark mt-2 shadow-sm uppercase">{weatherInfo.t}</span>
            </div>

            {/* 低溫 */}
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-splat-dark opacity-50">{todayWeather.min}°</span>
              <span className="mt-1 bg-splat-blue text-white text-[10px] px-3 py-0.5 rounded-full font-black border-[2px] border-splat-dark shadow-sm">LOW</span>
            </div>
          </div>

          {/* 底部數據 */}
          <div className="bg-splat-yellow flex items-center justify-between p-3 border-t-[3px] border-splat-dark">
            <div className="flex-1 text-center border-r-[3px] border-splat-dark">
              <span className="text-[10px] font-black text-splat-dark/70 uppercase flex items-center justify-center gap-1"><Droplets size={10}/> RAIN</span>
              <div className="text-splat-dark font-black text-sm">{todayWeather.rain}%</div>
            </div>
            <div className="flex-1 text-center border-r-[3px] border-splat-dark">
              <span className="text-[10px] font-black text-splat-dark/70 uppercase flex items-center justify-center gap-1"><Wind size={10}/> WIND</span>
              <div className="text-splat-dark font-black text-sm uppercase">{todayWeather.wind}</div>
            </div>
            <div className="flex-1 text-center">
              <span className="text-[10px] font-black text-splat-dark/70 uppercase flex items-center justify-center gap-1"><Sunrise size={10}/> SUNRISE</span>
              <div className="text-splat-dark font-black text-sm">{todayWeather.sunrise}</div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 2. 行程時間軸 - 顯示時間徽章，明確層次感             */}
        {/* ==================================================== */}
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border-[3px] border-splat-dark shadow-splat-solid p-3 rounded-2xl">
            <h3 className="text-lg font-black text-splat-dark italic tracking-widest uppercase ml-2">
               SCHEDULE
            </h3>
            <div className="flex gap-2">
              <button onClick={()=>{setEditingItem(undefined); setIsEditorOpen(true)}} className="w-9 h-9 rounded-xl bg-splat-green text-white flex items-center justify-center border-2 border-splat-dark shadow-splat-solid-sm active:translate-y-0.5 active:shadow-none transition-all"><Plus strokeWidth={3}/></button>
              <button onClick={()=>setIsEditMode(!isEditMode)} className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 border-splat-dark transition-all ${isEditMode ? 'bg-splat-pink text-white shadow-none translate-y-0.5' : 'bg-white text-splat-dark shadow-splat-solid-sm'}`}><Edit3 size={18} strokeWidth={3}/></button>
              <button onClick={()=>setIsAiOpen(true)} className="w-9 h-9 rounded-xl bg-splat-blue text-white flex items-center justify-center border-2 border-splat-dark shadow-splat-solid-sm active:translate-y-0.5 active:shadow-none transition-all"><Sparkles size={18} strokeWidth={3}/></button>
            </div>
          </div>
          
          <div className="relative mt-4">
             {dayItems.length === 0 ? (
               <div className="text-center py-12 bg-white border-[3px] border-dashed border-gray-400 rounded-[32px] text-gray-500 font-black italic shadow-sm">
                 NO MISSION TODAY 🦑 <br/>
                 <span className="text-sm mt-2 inline-block font-bold">點擊上方 + 號建立行程</span>
               </div>
             ) : (
               dayItems.map((item, idx) => {
                 const catStyle = CATEGORY_STYLE[item.category as keyof typeof CATEGORY_STYLE] || CATEGORY_STYLE.sightseeing;
                 
                 return (
                   <div key={item.id} className="flex gap-3 mb-6 relative group animate-in slide-in-from-bottom-4">
                      
                      {/* 粗黑連接線 */}
                      {idx !== dayItems.length - 1 && (
                        <div className="absolute left-7 top-12 bottom-[-32px] w-[3px] bg-splat-dark z-0" />
                      )}

                      {/* 📍 獨立時間徽章 (Time Badge) */}
                      <div className="w-16 shrink-0 flex flex-col items-center mt-3 z-10 relative">
                        <div className={`bg-white text-splat-dark rounded-xl py-2 w-full text-center font-black text-base border-[3px] border-splat-dark shadow-splat-solid-sm -rotate-3 relative`}>
                          {item.time}
                          {/* 頂部裝飾釘 */}
                          <div className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 border-splat-dark ${catStyle.bg}`} />
                        </div>
                      </div>

                      {/* 行程內容卡片 */}
                      <div 
                        onClick={() => isEditMode ? (setEditingItem(item), setIsEditorOpen(true)) : setDetailItem(item)}
                        className={`flex-1 card-splat p-0 overflow-hidden cursor-pointer flex flex-col transition-transform active:scale-[0.98] ${isEditMode ? 'border-dashed border-splat-pink ring-2 ring-splat-pink/30' : ''}`}
                      >
                         {/* 頂部標籤條 */}
                         <div className={`h-7 w-full ${catStyle.bg} border-b-[3px] border-splat-dark flex items-center px-3`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${catStyle.text}`}>{catStyle.label}</span>
                         </div>

                         <div className="p-4 flex justify-between items-center bg-white">
                           <div className="flex-1 min-w-0 pr-2">
                             <h4 className="font-black text-xl text-splat-dark uppercase leading-tight truncate">{item.title}</h4>
                             <p className="text-xs font-bold text-gray-500 flex items-center gap-1 mt-1.5 truncate"><MapPin size={14}/> {item.location}</p>
                           </div>
                           
                           {/* 編輯模式排序按鈕 */}
                           {isEditMode && (
                             <div className="flex flex-col gap-1 ml-2 shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }} className="p-1.5 bg-gray-100 rounded border-2 border-splat-dark text-splat-dark active:bg-splat-yellow"><ChevronUp size={16}/></button>
                                <button onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }} className="p-1.5 bg-gray-100 rounded border-2 border-splat-dark text-splat-dark active:bg-splat-yellow"><ChevronDown size={16}/></button>
                             </div>
                           )}
                         </div>
                      </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 24H 拼圖天氣 Modal - 補回並改為淺色 Brutalism 風格     */}
      {/* ==================================================== */}
      {showFullWeather && (
        <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-md z-[500] p-4 flex items-center justify-center" onClick={()=>setShowFullWeather(false)}>
          <div className="bg-[#F4F5F7] w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-splat-solid overflow-hidden animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
             <div className="bg-splat-yellow p-5 flex justify-between items-center text-splat-dark border-b-[3px] border-splat-dark">
               <h3 className="text-xl font-black italic tracking-widest flex items-center gap-2"><Clock size={20} strokeWidth={3}/> 24H REPORT</h3>
               <button onClick={()=>setShowFullWeather(false)} className="bg-white p-1.5 rounded-full border-2 border-splat-dark shadow-sm hover:scale-110 transition-transform"><X size={20} strokeWidth={3}/></button>
             </div>
             
             {/* 內層捲動區 */}
             <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto hide-scrollbar bg-[radial-gradient(#D1D5DB_1.5px,transparent_1px)] bg-[size:16px_16px]">
                {todayHourly.length > 0 ? todayHourly.map((h, i) => {
                  const hrInfo = getWeatherDesc(h.code);
                  return (
                    <div key={i} className="flex justify-between items-center bg-white p-4 rounded-2xl border-[3px] border-splat-dark shadow-sm">
                      <div className="w-14">
                        <span className="font-black text-splat-dark text-sm block">{format(parseISO(h.time), 'HH:00')}</span>
                        <span className="text-[9px] font-black text-splat-blue uppercase tracking-wider">{h.cityName}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-1 px-2 border-l-2 border-r-2 border-dashed border-gray-200 mx-2">
                        <span className="text-2xl drop-shadow-sm">{hrInfo.e}</span>
                        <span className="text-xs font-black text-gray-600">{hrInfo.t}</span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-[10px] font-black text-splat-pink w-10">{h.prob}%</span>
                        <span className="font-black text-xl text-splat-dark w-8">{Math.round(h.temp)}°</span>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="text-center py-10 font-black text-gray-400 bg-white rounded-2xl border-[3px] border-dashed border-gray-300">NO DATA AVAILABLE</div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* 詳情 Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-md z-[600] p-4 flex items-center justify-center" onClick={() => setDetailItem(undefined)}>
           <div className="bg-white w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-[8px_8px_0px_#1A1A1A] overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="h-56 bg-gray-200 relative overflow-hidden border-b-[4px] border-splat-dark">
                 <img 
                   src={detailItem.images?.[0] || `https://image.pollinations.ai/prompt/${encodeURIComponent(detailItem.location + ' ' + detailItem.title + ' bright colorful street style photography')}?width=800&height=600&nologo=true`} 
                   className="w-full h-full object-cover" 
                   alt="location"
                   loading="lazy" 
                   decoding="async"
                   onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1542224566-6e85f2e6772f")}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                 <button onClick={() => setDetailItem(undefined)} className="absolute top-4 right-4 bg-white border-[3px] border-splat-dark p-2 rounded-full text-splat-dark shadow-splat-solid-sm hover:scale-110 transition-transform"><X size={20} strokeWidth={3}/></button>
                 
                 <div className="absolute -bottom-4 left-4 right-4 bg-splat-yellow border-[3px] border-splat-dark p-3 rounded-xl shadow-splat-solid -rotate-1">
                   <h2 className="text-xl font-black text-splat-dark uppercase truncate">{detailItem.title}</h2>
                 </div>
              </div>

              <div className="p-6 pt-8 space-y-5 bg-[#F4F5F7]">
                 <div className="flex flex-col gap-2">
                    <div className="inline-flex items-center gap-2 text-sm font-black bg-white border-[3px] border-splat-dark px-3 py-1.5 rounded-lg shadow-sm w-fit -rotate-1">
                      <Clock size={16} className="text-splat-pink"/> {detailItem.time}
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs font-black bg-white border-[3px] border-splat-dark px-3 py-2 rounded-lg shadow-sm">
                      <MapPin size={16} className="text-splat-blue shrink-0"/> <span className="truncate">{detailItem.location}</span>
                    </div>
                 </div>

                 <div className="bg-white p-4 rounded-xl border-[3px] border-splat-dark shadow-sm">
                   <p className="text-sm font-bold text-gray-700 whitespace-pre-wrap leading-relaxed">
                     {detailItem.note || "尚無詳細筆記。準備好大鬧一場了嗎！🦑"}
                   </p>
                 </div>

                 <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location)}`, '_blank')} className="btn-splat w-full py-4 bg-splat-blue text-white text-lg flex items-center justify-center gap-2 mt-2">
                   <MapPin size={20}/> 開啟地圖導航
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* AI 解析 Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-md z-[700] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-splat-solid p-6 space-y-4 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-splat-dark flex items-center gap-2 italic uppercase">
                <div className="p-2 bg-splat-blue text-white rounded-xl border-2 border-splat-dark -rotate-3"><Sparkles size={20}/></div> AI 匯入
              </h2>
              <button onClick={()=>setIsAiOpen(false)} className="p-2 bg-gray-100 rounded-full border-2 border-splat-dark hover:bg-gray-200 transition-colors"><X strokeWidth={3}/></button>
            </div>
            
            <textarea placeholder="貼上你的行程文字（例如：10:00 抵達清水寺...）" className="w-full h-40 bg-[#F4F5F7] border-[3px] border-splat-dark rounded-2xl p-4 font-bold text-splat-dark outline-none focus:border-splat-blue focus:bg-white resize-none shadow-inner" value={aiText} onChange={e=>setAiText(e.target.value)} />
            
            <button onClick={handleAiAnalyze} disabled={isAiLoading} className="btn-splat w-full py-4 bg-splat-yellow text-splat-dark text-lg flex items-center justify-center gap-2">
              {isAiLoading ? <Loader2 className="animate-spin" size={24}/> : "開始解析 ➔"}
            </button>
          </div>
        </div>
      )}

      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};













