import React, { useState, useMemo, useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { MapPin, Plus, Edit3, Trash2, Utensils, Plane, Home, Camera, Sparkles, X, Loader2, Wind, Umbrella, Sunrise, ChevronUp, ChevronDown, Clock, Cloud, CloudRain, Sun } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ScheduleItem } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// 📌 第一原則：嚴格鎖定模型
const GEMINI_MODEL = "gemini-3-flash-preview"; 

const ICON_MAP = { sightseeing: Camera, food: Utensils, transport: Plane, hotel: Home };

// 🎨 Splatoon 3 色彩配置與圖標對應
const CATEGORY_STYLE = {
  sightseeing: { bg: 'bg-[#E3FF00]', text: 'text-[#121215]', shadow: 'shadow-[4px_4px_0px_#FF007A]', label: 'SIGHTSEEING' }, // 螢光黃 + 螢光粉陰影
  food: { bg: 'bg-[#FF007A]', text: 'text-[#F8F9FA]', shadow: 'shadow-[4px_4px_0px_#00E5FF]', label: 'FOOD' },        // 螢光粉 + 電光藍陰影
  transport: { bg: 'bg-[#00E5FF]', text: 'text-[#121215]', shadow: 'shadow-[4px_4px_0px_#E3FF00]', label: 'TRANSPORT' }, // 電光藍 + 螢光黃陰影
  hotel: { bg: 'bg-[#F8F9FA]', text: 'text-[#121215]', shadow: 'shadow-[4px_4px_0px_#FF007A]', label: 'HOTEL' },        // 白 + 螢光粉陰影
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

  // 📝 保持原有邏輯：日期範圍計算
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

  // 📝 保持原有邏輯：城市時間軸分析
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

  // 📝 保持原有邏輯：天氣 API 抓取
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

  // 📝 保持原有邏輯：今日天氣整理
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

  // 📝 保持原有邏輯：AI 解析 (確保使用 gemini-3-flash-preview)
  const handleAiAnalyze = async () => {
    if (!GEMINI_API_KEY) return alert("請設定 Gemini Key");
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL }); // 遵守第一原則
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
    // 🎨 UI 改裝：採用 Splatoon 3 深色塗鴉風格
    <div className="flex flex-col h-full bg-[#121215] relative">
      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8 pb-32">
        
        {/* ==================================================== */}
        {/* 1. 機票風天氣卡片 (Ticket Style Weather Card)        */}
        {/*    完全復刻 IMG_6113 結構設計，採用 Splatoon 配色      */}
        {/* ==================================================== */}
        <div 
          onClick={() => setShowFullWeather(true)} 
          className="bg-[#F8F9FA] rounded-[2rem] flex flex-col cursor-pointer transition-transform active:scale-[0.98] border-2 border-[#1A1A1A] overflow-hidden shadow-[4px_4px_0px_#00E5FF]"
        >
          {/* 上半部：深色波點 Header + 膠囊標籤 */}
          <div className="relative h-16 bg-[#1A1A24] bg-[radial-gradient(#ffffff_1.5px,transparent_1px)] bg-[size:16px_16px] flex items-center justify-center border-b-2 border-dashed border-[#1A1A1A]">
             <div className="absolute -bottom-4 bg-[#E3FF00] text-[#121215] px-6 py-1.5 rounded-full font-black text-xs uppercase tracking-[0.2em] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#FF007A]">
               WEATHER REPORT
             </div>
          </div>

          {/* 中半部：主要天氣資訊 */}
          <div className="pt-8 pb-6 px-8 flex justify-between items-center bg-[#F8F9FA]">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-[#8E99AF] tracking-widest uppercase mb-1">{todayWeather.cityName.substring(0,3)}</span>
              <span className="text-5xl leading-none font-black text-[#1A1A1A] tracking-tighter">{todayWeather.max}°</span>
              <span className="mt-3 bg-[#1A1A1A] text-white text-[10px] px-3 py-0.5 rounded-full font-bold tracking-widest shadow-[2px_2px_0px_#00E5FF]">HIGH</span>
            </div>

            <div className="flex flex-col items-center flex-1 px-4">
              <span className="text-[11px] font-black text-[#8E99AF] mb-2 tracking-widest">CURRENT</span>
              <div className="w-full flex items-center text-[#1A1A1A]">
                <div className="h-[2px] flex-1 bg-[#D1D5DB] border-dashed border-t-[2px]"></div>
                <span className="text-3xl mx-2 drop-shadow-md">{weatherInfo.e}</span>
                <div className="h-[2px] flex-1 bg-[#D1D5DB] border-dashed border-t-[2px]"></div>
              </div>
              <span className="text-[10px] font-black text-[#8E99AF] mt-2 tracking-widest uppercase">{weatherInfo.t}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-[#8E99AF] tracking-widest uppercase mb-1">{todayWeather.cityName.substring(3,6) || 'LOW'}</span>
              <span className="text-5xl leading-none font-black text-[#1A1A1A] tracking-tighter opacity-40">{todayWeather.min}°</span>
              <span className="mt-3 bg-[#8E99AF] text-white text-[10px] px-3 py-0.5 rounded-full font-bold tracking-widest shadow-[2px_2px_0px_#FF007A]">LOW</span>
            </div>
          </div>

          {/* 下半部：詳細資訊列 (仿 IMG_6113 底部三欄格) */}
          <div className="bg-[#E9ECEF] flex items-center justify-between p-4 border-t-2 border-[#1A1A1A]">
            <div className="flex-1 flex flex-col items-center justify-center border-r-2 border-[#D1D5DB]">
              <span className="text-[9px] font-black text-[#8E99AF] uppercase tracking-widest mb-1 flex items-center gap-1"><Droplets size={10}/> RAIN</span>
              <div className="text-[#1A1A1A] font-black text-sm">{todayWeather.rain}%</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center border-r-2 border-[#D1D5DB]">
              <span className="text-[9px] font-black text-[#8E99AF] uppercase tracking-widest mb-1 flex items-center gap-1"><Wind size={10}/> WIND</span>
              <div className="text-[#1A1A1A] font-black text-sm uppercase">{todayWeather.wind}</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="text-[9px] font-black text-[#8E99AF] uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={10}/> NEXT HR</span>
              <div className="text-[#1A1A1A] font-black text-sm uppercase">SUNNY</div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 2. 行程時間軸 (Splatoon 塗鴉風 + 票券風卡片)         */}
        {/*    將功能列縮小，移至「當日行程」右側                */}
        {/* ==================================================== */}
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#1A1A24] p-3 rounded-2xl border-2 border-[#333333]">
            <h3 className="text-lg font-black text-white italic tracking-widest uppercase flex items-center gap-2">
              <div className="w-3 h-3 bg-[#E3FF00] rounded-full animate-pulse shadow-[0_0_8px_#E3FF00]"/> SCHEDULE
            </h3>
            
            {/* 📍 藍框位置：功能按鈕區 (變成街頭風小貼紙) */}
            <div className="flex gap-2">
              <button onClick={()=>{setEditingItem(undefined); setIsEditorOpen(true)}} className="w-8 h-8 rounded-lg bg-[#E3FF00] text-[#121215] flex items-center justify-center border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none transition-all"><Plus size={18} strokeWidth={3}/></button>
              <button onClick={()=>setIsEditMode(!isEditMode)} className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 border-[#1A1A1A] transition-all ${isEditMode ? 'bg-[#FF007A] text-white shadow-[2px_2px_0px_#1A1A1A] translate-y-0' : 'bg-white text-[#121215] shadow-[2px_2px_0px_#1A1A1A]'} active:translate-y-0.5 active:shadow-none`}><Edit3 size={16} strokeWidth={3}/></button>
              <button onClick={()=>setIsAiOpen(true)} className="w-8 h-8 rounded-lg bg-[#00E5FF] text-[#121215] flex items-center justify-center border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none transition-all"><Sparkles size={16} strokeWidth={3}/></button>
            </div>
          </div>
          
          <div className="relative pl-6 space-y-8">
             {/* 螢光主軸線 */}
             <div className="absolute left-2 top-4 bottom-4 w-1 bg-[#E3FF00]/80 rounded-full shadow-[0_0_5px_#E3FF00]" />
             
             {dayItems.length === 0 ? (
               <div className="text-center py-10 text-white/40 font-black italic tracking-widest border-2 border-dashed border-white/20 rounded-3xl">NO MISSION TODAY 🦑</div>
             ) : (
               dayItems.map((item, idx) => {
                 const catStyle = CATEGORY_STYLE[item.category as keyof typeof CATEGORY_STYLE] || CATEGORY_STYLE.sightseeing;
                 
                 return (
                   <div key={item.id} className="relative group animate-in slide-in-from-left duration-300">
                      {/* 時間軸節點 (螢光墨水點) */}
                      <div className={`absolute -left-[18.5px] top-8 w-5 h-5 rounded-full border-4 border-[#121215] shadow-[0_0_8px_currentColor] z-10 ${catStyle.text} ${catStyle.bg}`} />
                      
                      {/* 票券式行程卡片 */}
                      <div 
                        onClick={() => isEditMode ? (setEditingItem(item), setIsEditorOpen(true)) : setDetailItem(item)}
                        className={`ml-4 bg-[#F8F9FA] rounded-3xl flex flex-col border-2 border-[#1A1A1A] cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden ${isEditMode ? 'border-dashed border-[#FF007A] ring-2 ring-[#FF007A]/30' : catStyle.shadow}`}
                      >
                         {/* 頂部重疊的膠囊標籤 */}
                         <div className="absolute -top-1 right-6 z-20">
                            <div className={`${catStyle.bg} ${catStyle.text} px-3 py-1 rounded-b-xl font-black text-[9px] uppercase tracking-widest border-x-2 border-b-2 border-[#1A1A1A]`}>
                              {catStyle.label}
                            </div>
                         </div>

                         <div className="flex">
                           {/* 左側撕線與時間 (像機票左邊的存根聯) */}
                           <div className="w-20 border-r-[3px] border-dotted border-gray-300 p-4 flex flex-col items-center justify-center bg-[#E9ECEF]">
                             <span className="text-[10px] font-black text-[#8E99AF] mb-1 uppercase">TIME</span>
                             <span className="text-xl font-black text-[#1A1A1A] leading-none tracking-tighter">{item.time}</span>
                           </div>

                           {/* 右側主要內容 */}
                           <div className="p-4 flex-1 flex justify-between items-center min-w-0">
                             <div className="flex-1 min-w-0 pr-2">
                               <h4 className="font-black text-[#1A1A1A] text-lg truncate uppercase">{item.title}</h4>
                               <p className="text-[10px] font-bold text-[#8E99AF] flex items-center gap-1 mt-1 truncate"><MapPin size={10}/> {item.location}</p>
                             </div>
                             
                             {/* 編輯模式的上下排序按鈕 */}
                             {isEditMode && (
                               <div className="flex flex-col gap-1 ml-2">
                                  <button onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }} className="p-1.5 bg-[#1A1A1A] rounded-md text-white hover:bg-[#FF007A] border border-[#1A1A1A] shadow-sm"><ChevronUp size={14}/></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }} className="p-1.5 bg-[#1A1A1A] rounded-md text-white hover:bg-[#FF007A] border border-[#1A1A1A] shadow-sm"><ChevronDown size={14}/></button>
                               </div>
                             )}
                           </div>
                         </div>
                         
                         {/* 底部備註 (如果有) */}
                         {item.note && (
                           <div className="px-4 py-2 border-t-2 border-gray-200 bg-white">
                             <p className="text-[10px] text-[#1A1A1A]/60 font-bold truncate">INFO: {item.note}</p>
                           </div>
                         )}
                      </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>
      </div>

      {/* 24H 拼圖天氣 Modal (維持深色科技感) */}
      {showFullWeather && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] p-6 flex items-center justify-center" onClick={()=>setShowFullWeather(false)}>
          <div className="bg-[#121215] w-full max-w-sm rounded-[40px] border-2 border-[#333333] shadow-[4px_4px_0px_#00E5FF] overflow-hidden animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
             <div className="bg-[#00E5FF] p-6 flex justify-between items-center text-[#121215] border-b-2 border-[#1A1A1A]">
               <h3 className="text-xl font-black italic tracking-widest flex items-center gap-2"><Clock size={18} strokeWidth={3}/> 24H REPORT</h3>
               <button onClick={()=>setShowFullWeather(false)} className="bg-white/50 p-1.5 rounded-full border-2 border-[#1A1A1A]"><X size={18} strokeWidth={3}/></button>
             </div>
             <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto hide-scrollbar">
                {todayHourly.length > 0 ? todayHourly.map((h, i) => {
                  const hrInfo = getWeatherDesc(h.code);
                  return (
                    <div key={i} className="flex justify-between items-center bg-[#1A1A24] p-4 rounded-2xl border-2 border-[#333333]">
                      <div className="w-14">
                        <span className="font-black text-white text-sm block">{format(parseISO(h.time), 'HH:00')}</span>
                        <span className="text-[9px] font-black text-[#E3FF00] uppercase tracking-wider">{h.cityName}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-1 px-2">
                        <span className="text-2xl">{hrInfo.e}</span>
                        <span className="text-xs font-black text-[#8E99AF]">{hrInfo.t}</span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-[10px] font-bold text-[#00E5FF] w-10">{h.prob}% DROP</span>
                        <span className="font-black text-lg text-white w-8">{Math.round(h.temp)}°</span>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="text-center py-10 font-black text-[#333333]">NO DATA</div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* 詳情 Modal (保持原樣) */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] p-6 flex items-center justify-center" onClick={() => setDetailItem(undefined)}>
           <div className="bg-[#121215] w-full max-w-sm rounded-[2rem] border-2 border-[#333333] shadow-[4px_4px_0px_#FF007A] overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              <div className="h-60 bg-gray-900 relative overflow-hidden border-b-2 border-[#1A1A1A]">
                 <img 
                   src={detailItem.images?.[0] || `https://image.pollinations.ai/prompt/${encodeURIComponent(detailItem.location + ' ' + detailItem.title + ' neon street style photography')}?width=800&height=600&nologo=true`} 
                   className="w-full h-full object-cover" 
                   alt="location"
                   loading="lazy" 
                   decoding="async"
                   onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1542224566-6e85f2e6772f")}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"/>
                 <button onClick={() => setDetailItem(undefined)} className="absolute top-6 right-6 bg-white border-2 border-[#1A1A1A] p-2 rounded-full text-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]"><X size={20} strokeWidth={3}/></button>
                 <h2 className="absolute bottom-6 left-6 text-2xl font-black text-white italic tracking-widest uppercase">{detailItem.title}</h2>
              </div>
              <div className="p-8 space-y-6">
                 <div className="flex items-center gap-4 text-xs font-black uppercase text-[#E3FF00] bg-[#1A1A24] p-3 rounded-xl border-2 border-[#333333]">
                    <span className="flex items-center gap-1"><Clock size={14}/> {detailItem.time}</span>
                    <div className="w-0.5 h-3 bg-[#333333]"/>
                    <span className="flex items-center gap-1 truncate"><MapPin size={14}/> {detailItem.location.split(',')[0]}</span>
                 </div>
                 <p className="text-sm text-white/70 font-bold whitespace-pre-wrap leading-relaxed min-h-[60px]">{detailItem.note || "No extra info provided."}</p>
                 <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location)}`, '_blank')} className="w-full py-4 flex items-center justify-center gap-2 text-lg font-black bg-[#E3FF00] text-[#121215] border-2 border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] active:translate-y-1 active:shadow-none transition-all uppercase">
                   <MapPin size={20}/> OPEN IN MAPS
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* AI 解析 Modal (Splatoon 風格) */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[700] flex items-center justify-center p-6">
          <div className="bg-[#121215] w-full max-w-md rounded-[2rem] border-2 border-[#333333] shadow-[4px_4px_0px_#00E5FF] p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center"><h2 className="text-xl font-black text-[#00E5FF] flex items-center gap-2 italic uppercase"><Sparkles size={24}/> AI SYNC (G3)</h2><button onClick={()=>setIsAiOpen(false)} className="p-2 bg-white rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] text-[#121215]"><X strokeWidth={3}/></button></div>
            <textarea placeholder="Paste your itinerary text here..." className="w-full h-48 bg-[#1A1A24] border-2 border-[#333333] rounded-2xl p-4 font-bold text-white outline-none focus:border-[#00E5FF] resize-none" value={aiText} onChange={e=>setAiText(e.target.value)} />
            <button onClick={handleAiAnalyze} disabled={isAiLoading} className="w-full bg-[#FF007A] text-white py-5 rounded-xl font-black flex items-center justify-center gap-3 border-2 border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] active:translate-y-1 active:shadow-none transition-all uppercase">
              {isAiLoading ? <Loader2 className="animate-spin"/> : "INITIALIZE SYNC ➔"}
            </button>
          </div>
        </div>
      )}

      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};












