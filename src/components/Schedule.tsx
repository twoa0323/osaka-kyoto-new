import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid, isSameDay } from 'date-fns';
import { MapPin, Plus, Edit3, Trash2, Utensils, Plane, Home, Camera, Sparkles, X, Loader2, Wind, Umbrella, Sunrise, ChevronUp, ChevronDown, Clock, Cloud, CloudRain, Sun, Droplets, AlertTriangle, Wand2, Check, WifiOff } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ScheduleItem } from '../types';
import { WeatherReportModal, AiImportModal } from './ScheduleModals';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { LazyImage } from './LazyImage';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { triggerHaptic } from '../utils/haptics';

// 移除受限制的前端 API Key 引進
// const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-3-flash-preview";
const ICON_MAP = { sightseeing: Camera, food: Utensils, transport: Plane, hotel: Home };

const CATEGORY_STYLE = {
  sightseeing: { bg: 'bg-splat-yellow', text: 'text-splat-dark', label: 'SIGHTSEEING', splat: '#FFC000' },
  food: { bg: 'bg-splat-pink', text: 'text-white', label: 'FOOD', splat: '#F03C69' },
  transport: { bg: 'bg-splat-blue', text: 'text-white', label: 'TRANSPORT', splat: '#2932CF' },
  hotel: { bg: 'bg-splat-green', text: 'text-white', label: 'HOTEL', splat: '#21CC65' },
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

export const Schedule: React.FC<{ externalDateIdx?: number }> = ({ externalDateIdx = 0 }) => {
  const {
    trips, currentTripId, deleteScheduleItem, addScheduleItem, reorderScheduleItems, updateScheduleItem,
    addBookingItem, addJournalItem, addShoppingItem, addInfoItem
  } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const isOnline = useNetworkStatus();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>();
  const [detailItem, setDetailItem] = useState<ScheduleItem | undefined>();

  const [weatherCache, setWeatherCache] = useState<Record<string, any>>({});
  const [showFullWeather, setShowFullWeather] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [gapAiLoading, setGapAiLoading] = useState<string | null>(null);
  const [transportAiLoading, setTransportAiLoading] = useState<string | null>(null);
  const [dailyBriefing, setDailyBriefing] = useState<string>("");
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

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

  const timeline = useMemo(() => {
    const defaultCity = { name: trip?.dest.toUpperCase() || 'CITY', lat: trip?.lat || 0, lng: trip?.lng || 0 };
    if (!trip || dateRange.length === 0) return [{ time: '00:00', city: defaultCity }];

    const getFallbackCity = () => {
      const items = trip.items || [];
      for (let i = externalDateIdx - 1; i >= 0; i--) {
        const dStr = format(dateRange[i], 'yyyy-MM-dd');
        const dayIt = items.filter(it => it.date === dStr).sort((a, b) => b.time.localeCompare(a.time));
        for (const it of dayIt) {
          const found = CITY_DB.find(c => c.keys.some(k => `${it.title} ${it.location} `.includes(k)));
          if (found) return found;
        }
      }
      for (let i = externalDateIdx + 1; i < dateRange.length; i++) {
        const dStr = format(dateRange[i], 'yyyy-MM-dd');
        const dayIt = items.filter(it => it.date === dStr).sort((a, b) => a.time.localeCompare(b.time));
        for (const it of dayIt) {
          const found = CITY_DB.find(c => c.keys.some(k => `${it.title} ${it.location} `.includes(k)));
          if (found) return found;
        }
      }
      return defaultCity;
    };

    const tl: { time: string, city: typeof defaultCity }[] = [];
    for (const item of dayItems) {
      const found = CITY_DB.find(c => c.keys.some(k => `${item.title} ${item.location} `.includes(k)));
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

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      const newCache = { ...weatherCache };
      let changed = false;
      for (const city of uniqueCities) {
        if (!newCache[city.name]) {
          try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,windspeed_10m_max&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m&current_weather=true&timezone=auto`);
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

  let todayWeather = { max: '--', min: '--', code: -1, rain: '0', sunrise: '--:--', wind: '0級', cityName: timeline[0]?.city.name || 'CITY' };
  let currentTempStr = '--';

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
    currentTempStr = mainCityData.current_weather?.temperature !== undefined ? Math.round(mainCityData.current_weather.temperature).toString() : todayWeather.max;
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

  // 📍 智慧戰報生成邏輯
  const fetchBriefing = async () => {
    if (dayItems.length === 0 || !isOnline) return;
    setIsBriefingLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch-parse', // 借用 batch-parse 的邏輯或者在後端新增一個專屬 action
          payload: {
            text: `你是一個旅遊導師。地點:${todayWeather.cityName}，天氣:${weatherInfo.t}。當天行程: ${dayItems.map(i => i.title).join(', ')}。請給予一段 40 字內幽默的斯普拉遁風格建議，必須包含一個🦑 Emoji。`,
            isBriefing: true // 後端可以根據這個來決定回傳文字還是 JSON
          }
        })
      });
      const data = await res.json();
      setDailyBriefing(data.text || "");
    } catch (e) { console.error(e); }
    finally { setIsBriefingLoading(false); }
  };

  useEffect(() => {
    fetchBriefing(); // 切換日期時更新
  }, [selectedDateStr, dayItems.length, isOnline]);

  const timeToMins = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const handleGapAiSuggest = async (prevItem: ScheduleItem, nextItem: ScheduleItem) => {
    if (!isOnline) return alert("請檢查網路連線才能使用魔法唷！✨");
    setGapAiLoading(prevItem.id);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-gap',
          payload: { prevItem, nextItem }
        })
      });
      const data = await res.json();
      if (data && !data.error) {
        addScheduleItem(trip!.id, {
          ...data,
          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          date: selectedDateStr,
          images: []
        });
        triggerHaptic('light');
      } else {
        throw new Error(data.error || "AI 解析失敗");
      }
    } catch (e) {
      alert("AI 目前想不出好點子，換個時間再試試吧！🤔");
    } finally {
      setGapAiLoading(null);
    }
  };

  const handleTransportAiSuggest = async (currentItem: ScheduleItem) => {
    if (!isOnline) return alert("請檢查網路連線才能使用魔法唷！✨");
    setTransportAiLoading(currentItem.id);

    const items = trip?.items || [];
    const sortedItems = [...items].filter(i => i.date === currentItem.date).sort((a, b) => a.time.localeCompare(b.time));
    const globalIdx = sortedItems.findIndex(i => i.id === currentItem.id);
    const prevItem = globalIdx > 0 ? sortedItems[globalIdx - 1] : null;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-transport',
          payload: {
            prevLocation: prevItem?.location,
            prevTitle: prevItem?.title,
            currentLocation: currentItem.location,
            currentTitle: currentItem.title,
            prevItem: prevItem ? true : false
          }
        })
      });
      const data = await res.json();
      const text = data.text || "";

      updateScheduleItem(trip!.id, currentItem.id, { ...currentItem, transportSuggestion: text });
      setDetailItem(prev => prev ? { ...prev, transportSuggestion: text } : undefined);
      triggerHaptic('light');
    } catch (e) {
      alert("AI 目前想不出好點子，請稍後再試！🤔");
    } finally {
      setTransportAiLoading(null);
    }
  };

  const handleAiAnalyze = async (text: string) => {
    if (!isOnline) return alert("請檢查網路連線");
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch-parse',
          payload: { date: selectedDateStr, text }
        })
      });
      const data = await res.json();
      if (data && !data.error) {
        // 分發到不同分頁
        if (Array.isArray(data.schedule)) {
          data.schedule.forEach((i: any) => addScheduleItem(trip!.id, {
            ...i,
            id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            date: selectedDateStr,
            images: i.images || []
          }));
        }
        if (Array.isArray(data.booking)) {
          data.booking.forEach((i: any) => addBookingItem(trip!.id, {
            ...i,
            id: `ai-bk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            images: i.images || []
          }));
        }
        if (Array.isArray(data.journal)) {
          data.journal.forEach((i: any) => addJournalItem(trip!.id, {
            ...i,
            id: `ai-jr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            images: i.images || []
          }));
        }
        if (Array.isArray(data.shopping)) {
          data.shopping.forEach((i: any) => addShoppingItem(trip!.id, {
            ...i,
            id: `ai-sh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            price: 0,
            currency: trip!.baseCurrency,
            isBought: false,
            images: [],
            category: i.category || '未分類'
          }));
        }
        if (Array.isArray(data.info)) {
          data.info.forEach((i: any) => addInfoItem(trip!.id, {
            ...i,
            id: `ai-if-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            images: []
          }));
        }

        setIsAiOpen(false);
        triggerHaptic('success');
        alert("✨ 智慧分析完成！已將資訊自動分類到行程、預定、美食日記、購物清單與筆記中。");
      } else {
        throw new Error("AI returned invalid format");
      }
    } catch (e) {
      console.error(e);
      alert("AI 解析失敗，請嘗試更具體的描述或檢查 API 設定。");
    }
    finally { setIsAiLoading(false); }
  };

  const onReorder = (newOrder: ScheduleItem[]) => {
    if (!trip) return;
    // 取得該日期以外的其他行程
    const otherItems = (trip.items || []).filter(it => it.date !== selectedDateStr);
    // 合併新的順序
    const nextItems = [...otherItems, ...newOrder];
    if (currentTripId) reorderScheduleItems(currentTripId, nextItems);
    triggerHaptic('medium');
  };

  if (!trip || dateRange.length === 0) return null;

  return (
    <div className="flex flex-col h-full relative text-splat-dark">
      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8 pb-32">

        {/* ==================================================== */}
        {/* 1. 天氣卡片 - 加入 Q彈進場動畫                          */}
        {/* ==================================================== */}
        <motion.div
          onClick={() => setShowFullWeather(true)}
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-[#5BA4E5] text-white rounded-[32px] border-[3px] border-splat-dark flex flex-col cursor-pointer shadow-splat-solid relative overflow-hidden p-5"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#4887C2] rounded-full blur-md opacity-80 pointer-events-none"></div>

          <div className="flex justify-between items-start z-10">
            <div>
              <div className="flex items-center gap-1 text-white/90 font-black text-[11px] uppercase tracking-widest mb-2">
                <MapPin size={12} /> {todayWeather.cityName} CITY
              </div>
              <div className="text-3xl font-black flex items-center gap-2 drop-shadow-sm">
                {weatherInfo.t} <span className="text-4xl">{weatherInfo.e}</span>
              </div>

              {/* 👇 AI 戰報小區塊 👇 */}
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-2.5 mt-2 border border-white/10 min-h-[70px] flex items-center w-full max-w-[180px]">
                {isBriefingLoading ? (
                  <Loader2 size={16} className="animate-spin opacity-50 mx-auto" />
                ) : (
                  <p className="text-[10px] font-bold leading-relaxed text-blue-50">
                    {dailyBriefing || "戰況不明，快去塗地吧！🦑"}
                  </p>
                )}
              </div>

            </div>

            <div className="text-right mt-1 relative z-10">
              <div className="text-5xl font-black drop-shadow-md">{currentTempStr}°</div>
              <div className="text-[11px] font-black text-white/90 mt-1 tracking-widest">{todayWeather.min}° / {todayWeather.max}°</div>
            </div>
          </div>

          <div className="flex gap-2 mt-6 z-10">
            <div className="flex-1 bg-white/20 rounded-xl p-3 flex flex-col items-center justify-center border-[2px] border-white/10 shadow-sm">
              <Umbrella size={18} className="mb-1.5 opacity-80" />
              <div className="text-lg font-black">{todayWeather.rain}%</div>
              <div className="text-[9px] font-bold opacity-80">降雨機率</div>
            </div>
            <div className="flex-1 bg-white/20 rounded-xl p-3 flex flex-col items-center justify-center border-[2px] border-white/10 shadow-sm">
              <Wind size={18} className="mb-1.5 opacity-80" />
              <div className="text-lg font-black uppercase">{todayWeather.wind}</div>
              <div className="text-[9px] font-bold opacity-80">風力</div>
            </div>
            <div className="flex-1 bg-white/20 rounded-xl p-3 flex flex-col items-center justify-center border-[2px] border-white/10 shadow-sm">
              <Sunrise size={18} className="mb-1.5 opacity-80" />
              <div className="text-lg font-black">{todayWeather.sunrise}</div>
              <div className="text-[9px] font-bold opacity-80">日出</div>
            </div>
          </div>
        </motion.div>

        {/* ==================================================== */}
        {/* 2. 行程時間軸 - 帶有 Framer Motion 列表動畫            */}
        {/* ==================================================== */}
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border-[3px] border-splat-dark shadow-splat-solid p-3 rounded-2xl">
            <h3 className="text-lg font-black text-splat-dark italic tracking-widest uppercase ml-2">
              SCHEDULE
            </h3>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingItem(undefined); setIsEditorOpen(true) }} className="w-9 h-9 rounded-xl bg-splat-green text-white flex items-center justify-center border-2 border-splat-dark shadow-splat-solid-sm"><Plus strokeWidth={3} /></motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsEditMode(!isEditMode)} className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 border-splat-dark transition-colors ${isEditMode ? 'bg-splat-pink text-white shadow-none' : 'bg-white text-splat-dark shadow-splat-solid-sm'}`}><Edit3 size={18} strokeWidth={3} /></motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsAiOpen(true)} className="w-9 h-9 rounded-xl bg-splat-blue text-white flex items-center justify-center border-2 border-splat-dark shadow-splat-solid-sm"><Sparkles size={18} strokeWidth={3} /></motion.button>
            </div>
          </div>

          <div className="relative mt-4">
            <Reorder.Group axis="y" values={dayItems} onReorder={onReorder} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {dayItems.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center py-20 bg-white border-[3px] border-dashed border-gray-300 rounded-[40px] text-gray-400 font-black italic shadow-inner"
                  >
                    今天還沒有計畫，來點冒險吧！🗺️
                  </motion.div>
                ) : (
                  dayItems.map((item, idx) => {
                    const catStyle = CATEGORY_STYLE[item.category as keyof typeof CATEGORY_STYLE] || CATEGORY_STYLE.sightseeing;
                    const Icon = ICON_MAP[item.category as keyof typeof ICON_MAP] || Camera;

                    const prevItem = idx > 0 ? dayItems[idx - 1] : null;
                    let warningMsg = null;
                    let showAiGap = false;
                    let gapMins = 0;

                    if (prevItem) {
                      const prevEndTimeMins = prevItem.endTime ? timeToMins(prevItem.endTime) : timeToMins(prevItem.time);
                      const currentStartTimeMins = timeToMins(item.time);
                      gapMins = currentStartTimeMins - prevEndTimeMins;

                      if (gapMins < 0) warningMsg = "行程時間重疊囉！請確認時間或結束時間 ⏳";
                      else if (gapMins > 0 && gapMins < 30 && prevItem.location !== item.location) warningMsg = "行程有點趕，請留意交通移動時間喔！🏃";
                      if (gapMins >= 120) showAiGap = true;
                    }

                    return (
                      <Reorder.Item
                        key={item.id}
                        value={item}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileDrag={{ scale: 1.05, boxShadow: "0px 10px 30px rgba(0,0,0,0.1)" }}
                        dragListener={isEditMode}
                        className="virtual-group"
                      >
                        <div className="relative pl-6">
                          <div className={`absolute left-[7px] top-6 bottom-[-24px] w-1 border-r-[3px] border-dashed border-splat-dark opacity-20 ${idx === dayItems.length - 1 ? 'hidden' : ''}`} />
                          <div className={`absolute left-0 top-[18px] w-4 h-4 rounded-full border-[3px] border-splat-dark z-10 ${catStyle.bg}`} />

                          {/* 📍 AI 魔法填空按鈕 */}
                          {showAiGap && prevItem && (
                            <div className="ml-16 pl-3 mb-4 -mt-2 relative z-20">
                              <button
                                disabled={isAiLoading || !isOnline}
                                onClick={() => handleGapAiSuggest(prevItem, item)}
                                className={`py-2 px-4 bg-white border-[3px] border-splat-dark rounded-xl text-[10px] font-black text-splat-dark shadow-[2px_2px_0px_#1A1A1A] hover:bg-splat-yellow active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {!isOnline ? <WifiOff size={16} /> : (gapAiLoading === prevItem.id ? <Loader2 size={16} className="animate-spin text-splat-blue" /> : <Wand2 size={16} className="text-splat-orange" />)}
                                {!isOnline ? "離線中，無法使用 AI" : (gapAiLoading === prevItem.id ? 'AI 魔法調閱地圖中...' : `空檔約 ${Math.floor(gapMins / 60)} 小時，讓 AI 推薦順遊點 ✨`)}
                              </button>
                            </div>
                          )}

                          <div className="flex gap-3 mb-6 relative group">
                            {/* 📍 獨立時間徽章 (Q彈打勾) */}
                            <div className="w-16 shrink-0 flex flex-col items-center mt-3 z-10 relative">
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  updateScheduleItem(trip!.id, item.id, { ...item, isCompleted: !item.isCompleted });
                                  triggerHaptic('light');
                                }}
                                className={`rounded-xl py-1.5 w-full text-center border-[3px] border-splat-dark -rotate-3 relative flex flex-col items-center justify-center transition-colors ${item.isCompleted
                                  ? 'bg-gray-300 text-gray-500 border-gray-400'
                                  : 'bg-white text-splat-dark shadow-splat-solid-sm'
                                  }`}
                              >
                                <span className="font-black text-[15px] leading-tight">{item.time}</span>
                                {item.endTime && <span className="text-[10px] font-bold opacity-70 leading-tight mt-0.5">~ {item.endTime}</span>}

                                <div className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 border-splat-dark ${item.isCompleted ? 'bg-gray-400' : catStyle.bg}`} />
                              </motion.button>
                            </div>

                            {/* 📍 右側內容區塊 */}
                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                              {warningMsg && (
                                <div className="bg-white border-2 border-splat-dark text-splat-dark px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#FFC000] w-fit">
                                  <AlertTriangle size={14} className="text-splat-orange" /> {warningMsg}
                                </div>
                              )}

                              <motion.div
                                whileHover={{ scale: isEditMode ? 1 : 1.02 }}
                                whileTap={{ scale: isEditMode ? 1 : 0.98 }}
                                onClick={() => isEditMode ? (setEditingItem(item), setIsEditorOpen(true)) : setDetailItem(item)}
                                className={`card-splat p-0 overflow-hidden cursor-pointer flex flex-col transition-all bg-white border-[3px] border-splat-dark rounded-[24px] shadow-splat-solid relative ${item.isCompleted ? 'opacity-60 grayscale' : ''} ${isEditMode ? 'pr-12' : ''}`}
                              >
                                {/* 📍 噴墨完成線特效 */}
                                {item.isCompleted && (
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '110%' }}
                                    className="absolute top-[45%] left-[-5%] h-4 z-20 pointer-events-none mix-blend-multiply"
                                    style={{ backgroundColor: catStyle.splat, rotate: '-3deg', opacity: 0.8, borderRadius: '10px' }}
                                  />
                                )}

                                <div className={`h-7 w-full ${catStyle.bg} border-b-[3px] border-splat-dark flex items-center px-3 justify-between`}>
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${catStyle.text}`}>{catStyle.label}</span>
                                  {item.endTime && <span className={`text-[9px] font-bold ${catStyle.text} opacity-80`}>until {item.endTime}</span>}
                                </div>

                                <div className="p-4 flex justify-between items-center bg-white relative">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <h4 className={`font-black text-xl uppercase leading-tight truncate ${item.isCompleted ? 'text-gray-400' : 'text-splat-dark'}`}>{item.title}</h4>
                                    <p className="text-xs font-bold text-gray-500 flex items-center gap-1 mt-1.5 truncate"><MapPin size={14} /> {item.location}</p>
                                  </div>

                                  {item.isCompleted ? (
                                    <div className="bg-splat-green p-1.5 rounded-full border-[3px] border-splat-dark text-white shrink-0 shadow-sm"><Check size={16} strokeWidth={4} /></div>
                                  ) : (
                                    <div className={`p-2 rounded-xl border-2 border-gray-100 shrink-0 ${catStyle.text.replace('text-white', 'text-gray-400')}`}><Icon size={20} strokeWidth={2.5} /></div>
                                  )}

                                  {isEditMode && (
                                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gray-50 border-l-[3px] border-splat-dark flex flex-col z-30">
                                      <div className="flex-1 flex items-center justify-center hover:bg-gray-200 border-b-[3px] border-splat-dark cursor-grab active:cursor-grabbing"><ChevronUp size={20} strokeWidth={3} className="opacity-30" /></div>
                                      <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} className="flex-1 flex items-center justify-center hover:bg-splat-yellow text-splat-dark border-b-[3px] border-splat-dark"><Edit3 size={16} strokeWidth={3} /></button>
                                      <div className="flex-1 flex items-center justify-center hover:bg-gray-200 border-b-[3px] border-splat-dark cursor-grab active:cursor-grabbing"><ChevronDown size={20} strokeWidth={3} className="opacity-30" /></div>
                                      <button onClick={(e) => { e.stopPropagation(); if (confirm('確定要刪除嗎？')) { deleteScheduleItem(trip!.id, item.id); triggerHaptic('medium'); } }} className="flex-1 flex items-center justify-center hover:bg-red-50 text-red-500"><Trash2 size={16} strokeWidth={3} /></button>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })
                )}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 24H 拼圖天氣 Modal                                   */}
      {/* ==================================================== */}
      {showFullWeather && (
        <WeatherReportModal
          onClose={() => setShowFullWeather(false)}
          todayHourly={todayHourly}
          getWeatherDesc={getWeatherDesc}
        />
      )}

      {/* ==================================================== */}
      {/* 詳情 Modal (Q彈動畫)                                 */}
      {/* ==================================================== */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-md z-[600] p-4 flex items-center justify-center" onClick={() => setDetailItem(undefined)}>
            <motion.div
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="bg-white w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-[8px_8px_0px_#1A1A1A] overflow-hidden flex flex-col max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-56 bg-gray-200 relative shrink-0 border-b-[4px] border-splat-dark">
                <LazyImage
                  src={detailItem.images?.[0] || `https://image.pollinations.ai/prompt/${encodeURIComponent(detailItem.location + ' ' + detailItem.title + ' bright colorful street style photography')}?width=800&height=600&nologo=true`}
                  containerClassName="w-full h-full"
                  alt="location"
                  onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1542224566-6e85f2e6772f")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setDetailItem(undefined)} className="absolute top-4 right-4 bg-white border-[3px] border-splat-dark p-2 rounded-full text-splat-dark shadow-splat-solid-sm z-10"><X size={20} strokeWidth={3} /></motion.button>

                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <h2 className="text-2xl font-black text-white uppercase truncate drop-shadow-md">{detailItem.title}</h2>
                </div>
              </div>

              <div className="p-6 pt-6 space-y-5 bg-[#F4F5F7] overflow-y-auto hide-scrollbar">
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 text-sm font-black bg-white border-[3px] border-splat-dark px-3 py-1.5 rounded-lg shadow-sm w-fit -rotate-1">
                    <Clock size={16} className="text-splat-pink" /> {detailItem.time}
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs font-black bg-white border-[3px] border-splat-dark px-3 py-2 rounded-lg shadow-sm">
                    <MapPin size={16} className="text-splat-orange" /> {detailItem.location}
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-4 bg-white border-[3px] border-splat-dark rounded-2xl font-black text-splat-blue flex items-center justify-center gap-2 active:translate-y-1 shadow-splat-solid-sm uppercase tracking-widest"
                >
                  <MapPin size={18} strokeWidth={3} /> Maps
                </a>
                <div className="card-splat p-4">
                  <p className="text-sm font-bold text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {detailItem.note || "尚無詳細筆記。準備好大鬧一場了嗎！🦑"}
                  </p>
                </div>

                <div className="card-splat p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-splat-blue mb-2 flex items-center gap-1.5"><Plane size={14} /> 交通路線建議</h4>
                  {detailItem.transportSuggestion ? (
                    <p className="text-sm font-bold text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {detailItem.transportSuggestion}
                    </p>
                  ) : (
                    <button
                      onClick={() => handleTransportAiSuggest(detailItem)}
                      disabled={transportAiLoading === detailItem.id || !isOnline}
                      className={`w-full py-3 border-2 border-dashed rounded-lg text-xs font-black transition-colors flex items-center justify-center gap-2 active:scale-95 ${!isOnline ? 'bg-gray-100 border-gray-200 text-gray-300' : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-splat-blue hover:text-splat-blue'}`}
                    >
                      {!isOnline ? <WifiOff size={16} /> : (transportAiLoading === detailItem.id ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />)}
                      {!isOnline ? "離線中，無法取得建議" : (transportAiLoading === detailItem.id ? "魔法規劃中..." : "取得 AI 交通建議")}
                    </button>
                  )}
                  {transportAiLoading === detailItem.id && <div className="sr-only" onAnimationStart={() => triggerHaptic('light')}></div>}
                </div>

                <button onClick={() => window.open(`https://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(detailItem.location)}`, '_blank')} className="btn-splat w-full py-4 bg-splat-blue text-white text-lg flex items-center justify-center gap-2 mt-2">
                  <MapPin size={20} /> 開啟地圖導航
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAiOpen && (
          <AiImportModal
            onClose={() => setIsAiOpen(false)}
            isAiLoading={isAiLoading}
            onAnalyze={handleAiAnalyze}
          />
        )}
      </AnimatePresence>

      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};
