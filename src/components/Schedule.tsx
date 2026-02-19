import React, { useState, useMemo, useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid } from 'date-fns';
import { MapPin, Plus, Edit3, Trash2, Utensils, Plane, Home, Camera, Sparkles, X, Loader2, ThermometerSun, Wind, Umbrella, Sunrise, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ScheduleItem } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const ICON_MAP = { sightseeing: Camera, food: Utensils, transport: Plane, hotel: Home };

// 天氣代碼轉換 -> 4字形容 + Emoji
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

// 內建常見城市關鍵字與座標庫 (加入釜山等地)
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

  // 天氣資料快取：儲存多個城市的 API 結果
  const [weatherCache, setWeatherCache] = useState<Record<string, any>>({});
  const [showFullWeather, setShowFullWeather] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  // ★ 終極 B 方案：分析本日的「城市時間軸」
  const timeline = useMemo(() => {
    const defaultCity = { name: trip?.dest.toUpperCase() || 'CITY', lat: trip?.lat || 0, lng: trip?.lng || 0 };
    if (!trip || dateRange.length === 0) return [{ time: '00:00', city: defaultCity }];

    // 尋找鄰近日期的預設城市 (若當天一開始沒排行程，或完全沒行程)
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

  // 取出今天涉及到的所有不重複城市
  const uniqueCities = useMemo(() => {
    const map = new Map();
    timeline.forEach(t => map.set(t.city.name, t.city));
    return Array.from(map.values());
  }, [timeline]);

  // 向 Open-Meteo 獲取所有涉及城市的天氣
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

  // ★ 組合資料：頂部卡片 (取今日主要/初始城市)
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

  // ★ 組合資料：24小時預報拼圖 (依時間動態切換城市)
  let todayHourly: any[] = [];
  if (timeline.length > 0 && weatherCache[timeline[0].city.name]) {
    const mainCityData = weatherCache[timeline[0].city.name];
    let dailyIdx = mainCityData.daily.time.findIndex((t: string) => t === selectedDateStr);
    if (dailyIdx === -1) dailyIdx = 0;
    const targetDateForHourly = mainCityData.daily.time[dailyIdx];

    for (let h = 0; h < 24; h++) {
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      
      // 找出這個小時屬於哪一個城市
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

  const handleAiAnalyze = async () => {
    if (!GEMINI_API_KEY) return alert("請設定 Gemini Key");
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const prompt = `分析文字並回傳純 JSON 陣列。格式: [{"time":"HH:mm", "title":"景點", "location":"地址", "category":"sightseeing/food/transport/hotel", "note":"介紹"}]。日期: ${selectedDateStr}。內容: ${aiText}`;
      const res = await model.generateContent(prompt);
      const match = res.response.text().match(/\[[\s\S]*\]/);
      if (match) {
        // [修復]: AI ID 避免重複衝突
        JSON.parse(match[0]).forEach((i: any) => addScheduleItem(trip.id, { ...i, id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, date: selectedDateStr, images: [] }));
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
    <div className="flex flex-col h-full bg-ac-bg relative">
      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6 pb-28">
        
        {/* 100% 復刻圖片樣式的高級天氣卡片 */}
        <div onClick={() => setShowFullWeather(true)} className="bg-gradient-to-br from-[#68B1F8] to-[#519CE5] rounded-[32px] p-6 pb-5 text-white shadow-zakka relative active:scale-[0.98] transition-all cursor-pointer overflow-hidden border border-[#83C0FF]">
          
          {/* 背景幾何圖形 (完美對應圖片右上角的太陽星星圖騰) */}
          <svg className="absolute -top-12 -right-8 w-60 h-60 text-[#4C9AE4] opacity-80" viewBox="0 0 200 200" fill="currentColor">
            <path d="M100 0L118.8 38.2L161.8 19.1L150 61.8L200 82.5L158.2 100L200 117.5L150 138.2L161.8 180.9L118.8 161.8L100 200L81.2 161.8L38.2 180.9L50 138.2L0 117.5L41.8 100L0 82.5L50 61.8L38.2 19.1L81.2 38.2L100 0Z" />
          </svg>
          <div className="absolute top-2 right-5 w-24 h-24 border-[10px] border-[#3980CE] rounded-full z-0 opacity-60"></div>

          <div className="relative z-10 flex justify-between items-start pt-1">
             <div>
               <p className="text-[11px] font-bold opacity-90 flex items-center gap-1.5 uppercase tracking-[0.15em] mb-2 drop-shadow-sm">
                 <MapPin size={12} strokeWidth={2.5}/> {todayWeather.cityName} CITY
               </p>
               <h2 className="text-4xl font-black tracking-widest flex items-center gap-2 drop-shadow-md mt-1">
                 {weatherInfo.t} <span className="text-3xl drop-shadow-lg">{weatherInfo.e}</span>
               </h2>
             </div>
             <div className="text-center mt-1 pl-2">
               <span className="text-6xl font-black drop-shadow-md tracking-tighter leading-none">{todayWeather.max}°</span>
               <p className="text-[13px] font-black mt-2 opacity-90 tracking-widest drop-shadow-sm">{todayWeather.min}° / {todayWeather.max}°</p>
             </div>
          </div>
          
          {/* 下方三個玻璃資訊欄位 */}
          <div className="grid grid-cols-3 gap-3 mt-8 relative z-10">
             <div className="bg-white/20 backdrop-blur-md rounded-[20px] p-3 flex flex-col items-center justify-center border border-white/10 shadow-sm">
               <Umbrella size={22} className="mb-2 opacity-90" strokeWidth={2.5}/>
               <p className="font-black text-[22px] leading-none">{todayWeather.rain}%</p>
               <p className="text-[10px] opacity-80 font-bold mt-1.5 tracking-widest">降雨機率</p>
             </div>
             <div className="bg-white/20 backdrop-blur-md rounded-[20px] p-3 flex flex-col items-center justify-center border border-white/10 shadow-sm">
               <Wind size={22} className="mb-2 opacity-90" strokeWidth={2.5}/>
               <p className="font-black text-[22px] leading-none">{todayWeather.wind}</p>
               <p className="text-[10px] opacity-80 font-bold mt-1.5 tracking-widest">風力</p>
             </div>
             <div className="bg-white/20 backdrop-blur-md rounded-[20px] p-3 flex flex-col items-center justify-center border border-white/10 shadow-sm">
               <Sunrise size={22} className="mb-2 opacity-90" strokeWidth={2.5}/>
               <p className="font-black text-[22px] leading-none tracking-tight">{todayWeather.sunrise}</p>
               <p className="text-[10px] opacity-80 font-bold mt-1.5 tracking-widest">日出</p>
             </div>
          </div>
        </div>

        {/* 行程列表與功能列 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-ac-orange rounded-full"/>
              <h3 className="text-xl font-black text-ac-brown italic">當日行程</h3>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md rounded-full border-2 border-ac-border shadow-sm p-1 flex gap-1 items-center">
              <button onClick={()=>{setEditingItem(undefined); setIsEditorOpen(true)}} className="w-9 h-9 rounded-full bg-ac-green text-white flex items-center justify-center active:scale-90 transition-all shadow-sm" title="新增"><Plus size={18}/></button>
              <button onClick={()=>setIsEditMode(!isEditMode)} className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-sm ${isEditMode ? 'bg-ac-orange text-white' : 'bg-white text-ac-brown border border-ac-border'}`} title="編輯"><Edit3 size={16}/></button>
              <button onClick={()=>setIsAiOpen(true)} className="w-9 h-9 rounded-full bg-purple-500 text-white flex items-center justify-center active:scale-90 transition-all shadow-sm" title="AI"><Sparkles size={16}/></button>
            </div>
          </div>
          
          <div className="relative pl-10 space-y-5">
             <div className="absolute left-4 top-4 bottom-4 w-1.5 bg-ac-border/30 rounded-full" />
             {dayItems.length === 0 ? (
               <div className="text-center py-10 text-ac-border font-black opacity-30 italic">今日尚未安排計畫 📖</div>
             ) : (
               dayItems.map((item, idx) => {
                 const Icon = ICON_MAP[item.category as keyof typeof ICON_MAP] || Camera;
                 return (
                   <div key={item.id} className="relative group animate-in slide-in-from-left duration-300">
                      <span className="absolute -left-10 top-3 text-[9px] font-black opacity-40">{item.time}</span>
                      <div className={`absolute -left-[28.5px] top-3.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${item.category === 'food' ? 'bg-ac-orange' : 'bg-ac-green'}`} />
                      
                      <div 
                        onClick={() => isEditMode ? (setEditingItem(item), setIsEditorOpen(true)) : setDetailItem(item)}
                        className={`card-zakka bg-white p-4 cursor-pointer active:scale-[0.98] transition-all flex justify-between items-center ${isEditMode ? 'border-dashed border-ac-orange ring-2 ring-ac-orange/10' : ''}`}
                      >
                         <div className="flex-1 min-w-0">
                           <h4 className="font-black text-ac-brown text-lg truncate">{item.title}</h4>
                           <p className="text-[10px] font-bold text-ac-brown/40 flex items-center gap-1 mt-1 truncate"><MapPin size={10}/> {item.location}</p>
                         </div>
                         {isEditMode && (
                           <div className="flex flex-col gap-1 ml-2">
                              <button onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }} className="p-1 bg-ac-bg rounded text-ac-brown/40 hover:bg-ac-orange hover:text-white"><ChevronUp size={14}/></button>
                              <button onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }} className="p-1 bg-ac-bg rounded text-ac-brown/40 hover:bg-ac-orange hover:text-white"><ChevronDown size={14}/></button>
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

      {/* 詳情 Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[600] p-6 flex items-center justify-center" onClick={() => setDetailItem(undefined)}>
           <div className="bg-ac-bg w-full max-w-sm rounded-[45px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              <div className="h-60 bg-gray-200 relative overflow-hidden">
                 <img 
                   src={detailItem.images?.[0] || `https://image.pollinations.ai/prompt/${encodeURIComponent(detailItem.location + ' ' + detailItem.title + ' scenery photorealistic')}?width=800&height=600&nologo=true`} 
                   className="w-full h-full object-cover" 
                   alt="location"
                   onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800")}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                 <button onClick={() => setDetailItem(undefined)} className="absolute top-6 right-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white"><X size={20}/></button>
                 <h2 className="absolute bottom-6 left-6 text-2xl font-black text-white italic tracking-wide">{detailItem.title}</h2>
              </div>
              <div className="p-8 space-y-6">
                 <div className="flex items-center gap-4 text-xs font-black uppercase text-ac-green bg-white p-3 rounded-2xl shadow-sm border border-ac-border">
                    <span className="flex items-center gap-1"><Clock size={14}/> {detailItem.time}</span>
                    <div className="w-px h-3 bg-ac-border"/>
                    <span className="flex items-center gap-1 truncate"><MapPin size={14}/> {detailItem.location}</span>
                 </div>
                 <p className="text-sm text-ac-brown/70 font-bold whitespace-pre-wrap leading-relaxed min-h-[60px]">{detailItem.note || "這個行程還沒有備註，點擊編輯來增加筆記吧！"}</p>
                 {/* [修復]: Google Maps URL 語法錯誤 */}
                 <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location)}`, '_blank')} className="btn-zakka w-full py-4 flex items-center justify-center gap-2 text-lg shadow-lg"><MapPin size={20}/> Google Maps</button>
              </div>
           </div>
        </div>
      )}

      {/* 24H 拼圖天氣 Modal */}
      {showFullWeather && (
        <div className="fixed inset-0 bg-black/60 z-[500] p-6 flex items-center justify-center backdrop-blur-sm" onClick={()=>setShowFullWeather(false)}>
          <div className="bg-ac-bg w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
             <div className="bg-gradient-to-br from-[#68B1F8] to-[#519CE5] p-6 flex justify-between items-center text-white">
               <h3 className="text-xl font-black italic tracking-widest flex items-center gap-2"><Clock size={18}/> 跨城市 24H 預報</h3>
               <button onClick={()=>setShowFullWeather(false)} className="bg-white/20 p-1.5 rounded-full"><X size={18}/></button>
             </div>
             <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto hide-scrollbar">
                {todayHourly.length > 0 ? todayHourly.map((h, i) => {
                  const hrInfo = getWeatherDesc(h.code);
                  return (
                    <div key={i} className="flex justify-between items-center bg-white p-4 rounded-2xl border-2 border-ac-border shadow-sm">
                      <div className="w-14">
                        <span className="font-black text-ac-brown text-sm block">{format(parseISO(h.time), 'HH:00')}</span>
                        <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{h.cityName}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-1 px-2">
                        <span className="text-2xl drop-shadow-sm">{hrInfo.e}</span>
                        <span className="text-xs font-black text-ac-brown">{hrInfo.t}</span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-[10px] font-bold text-blue-400 w-10">{h.prob}% 雨</span>
                        <span className="font-black text-lg text-ac-brown w-8">{Math.round(h.temp)}°</span>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="text-center py-10 font-black text-ac-border opacity-50">尚無詳細預報資料</div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[700] flex items-center justify-center p-6">
          <div className="bg-ac-bg w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center"><h2 className="text-xl font-black text-purple-600 flex items-center gap-2"><Sparkles size={20}/> AI 智慧解析</h2><button onClick={()=>setIsAiOpen(false)}><X/></button></div>
            <textarea placeholder="貼上行程文字..." className="w-full h-48 bg-white border-4 border-ac-border rounded-3xl p-4 font-bold text-ac-brown outline-none focus:border-purple-400 resize-none shadow-inner" value={aiText} onChange={e=>setAiText(e.target.value)} />
            <button onClick={handleAiAnalyze} disabled={isAiLoading} className="w-full bg-purple-500 text-white py-4 rounded-full font-black flex items-center justify-center gap-2 shadow-zakka">{isAiLoading ? <Loader2 className="animate-spin"/> : "Gemini G3 解析 ➔"}</button>
          </div>
        </div>
      )}

      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};









