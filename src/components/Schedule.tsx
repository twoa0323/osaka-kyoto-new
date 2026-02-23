import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid, isSameDay } from 'date-fns';
import { MapPin, Plus, Edit3, Trash2, Utensils, Plane, Home, Camera, Sparkles, X, Loader2, Wind, Umbrella, Sunrise, ChevronUp, ChevronDown, Clock, Cloud, CloudRain, Sun, Droplets, AlertTriangle, Wand2, Check, WifiOff, Star, Map as MapIcon } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ScheduleItem, Trip } from '../types';
import { WeatherReportModal } from './ScheduleModals';
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

// --- 輔助組件：地圖路徑視圖 ---
const ScheduleMapView: React.FC<{ items: ScheduleItem[], trip?: Trip }> = ({ items, trip }) => {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 動態載入 Leaflet (如果尚未載入)
    const loadLeaflet = async () => {
      if (!(window as any).L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.head.appendChild(script);

        await new Promise(resolve => script.onload = resolve);
      }

      const L = (window as any).L;
      if (!mapInstanceRef.current) {
        // 初始化地圖，中心點為第一站或是旅程預設地
        const center: [number, number] = items[0]?.lat && items[0]?.lng
          ? [items[0].lat, items[0].lng]
          : [trip?.lat || 34.6937, trip?.lng || 135.5023]; // Default to Osaka

        mapInstanceRef.current = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView(center, 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }

      const map = mapInstanceRef.current;
      // 清除舊的 Marker
      map.eachLayer((layer: any) => { if (!!layer.toGeoJSON) map.removeLayer(layer); });

      const points: [number, number][] = [];
      items.forEach((item, idx) => {
        if (item.lat && item.lng) {
          const pos: [number, number] = [item.lat, item.lng];
          points.push(pos);

          // 自訂標記 (斯普拉遁感)
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 bg-splat-blue border-2 border-white rounded-full flex items-center justify-center text-white font-black shadow-lg text-xs">
                  ${idx + 1}
                </div>
                <div class="bg-white border-2 border-splat-dark px-2 py-0.5 rounded-md text-[10px] font-black mt-1 shadow-sm whitespace-nowrap">
                  ${item.title}
                </div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });

          L.marker(pos, { icon }).addTo(map);
        }
      });

      if (points.length > 1) {
        // 繪製路徑
        L.polyline(points, {
          color: '#5BA4E5',
          weight: 5,
          opacity: 0.8,
          dashArray: '10, 10',
          lineJoin: 'round'
        }).addTo(map);

        // 自動縮放置適合範圍
        map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
      } else if (points.length === 1) {
        map.setView(points[0], 15);
      }
    };

    loadLeaflet();
  }, [items, trip]);

  return (
    <div className="relative w-full h-[60vh] rounded-[32px] overflow-hidden border-[4px] border-splat-dark shadow-splat-solid bg-gray-100 mt-4">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border-2 border-splat-dark font-black text-[10px] flex items-center gap-2 shadow-sm">
        <MapIcon size={12} className="text-splat-blue" />
        {items.length} SPOTS ON ROUTE
      </div>
    </div>
  );
};

export const Schedule: React.FC<{ externalDateIdx?: number }> = ({ externalDateIdx = 0 }) => {
  const {
    trips, currentTripId, deleteScheduleItem, addScheduleItem, reorderScheduleItems, updateScheduleItem,
    addBookingItem, addJournalItem, addShoppingItem, addInfoItem, openAiAssistant
  } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const isOnline = useNetworkStatus();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>();
  const [detailItem, setDetailItem] = useState<ScheduleItem | undefined>();

  const [weatherCache, setWeatherCache] = useState<Record<string, any>>({});
  const [showFullWeather, setShowFullWeather] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [gapAiLoading, setGapAiLoading] = useState<string | null>(null);
  const [transportAiLoading, setTransportAiLoading] = useState<string | null>(null);

  // 📍 Phase 5: 天氣巫師狀態
  const [isWizardLoading, setIsWizardLoading] = useState(false);
  const [weatherAdvice, setWeatherAdvice] = useState<{ reason: string, recommendations: any[] } | null>(null);
  const [showWizardModal, setShowWizardModal] = useState(false);

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

  const timeToMins = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const [spotAiLoading, setSpotAiLoading] = useState<string | null>(null);

  const handleGapAiSuggest = async (prevItem: ScheduleItem, nextItem: ScheduleItem) => {
    if (!isOnline) return alert("請檢查網路連線才能使用魔法唷！✨");
    setGapAiLoading(prevItem.id);

    const prefs = [
      ...(trip?.journals || []).filter(j => j.rating >= 4).map(j => j.title),
      ...(trip?.expenses || []).map(e => e.storeName)
    ].filter(Boolean).slice(-15).join(", ");

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-gap',
          payload: { prevItem, nextItem, preferences: prefs }
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
        alert("✨ 成功發掘順遊好去處！");
      }
    } catch (e) {
      alert("AI 目前想不出好點子，換個時間再試試吧！🤔");
    } finally {
      setGapAiLoading(null);
    }
  };

  const handleAutoFillGaps = async () => {
    let foundGap = null;
    for (let i = 1; i < dayItems.length; i++) {
      const prev = dayItems[i - 1];
      const curr = dayItems[i];
      const prevEnd = prev.endTime ? timeToMins(prev.endTime) : timeToMins(prev.time);
      const currStart = timeToMins(curr.time);
      if (currStart - prevEnd >= 120) {
        foundGap = { prev, curr };
        break;
      }
    }
    if (foundGap) {
      await handleGapAiSuggest(foundGap.prev, foundGap.curr);
    } else {
      alert("目前行程很滿，沒有大於2小時的長空檔唷！🦑");
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
          payload: {
            date: selectedDateStr,
            startDate: trip?.startDate,
            endDate: trip?.endDate,
            text
          }
        })
      });
      const data = await res.json();
      if (data && !data.error) {
        if (Array.isArray(data.schedule)) {
          data.schedule.forEach((i: any) => addScheduleItem(trip!.id, {
            ...i,
            id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            date: i.date || selectedDateStr,
            images: i.images || []
          }));
        }
        if (Array.isArray(data.booking)) {
          data.booking.forEach((i: any) => addBookingItem(trip!.id, {
            ...i,
            id: `ai-bk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            date: i.date || selectedDateStr,
            images: i.images || []
          }));
        }
        if (Array.isArray(data.journal)) {
          data.journal.forEach((i: any) => addJournalItem(trip!.id, {
            ...i,
            id: `ai-jr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            date: i.date || selectedDateStr,
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
        alert("✨ 智慧分析完成！已將資訊自動分類。");
      }
    } catch (e) {
      alert("AI 解析失敗，請嘗試更具體的描述。");
    } finally { setIsAiLoading(false); }
  };

  const handleWeatherMagic = async () => {
    if (!isOnline) return alert("連線後才能施展天氣魔法唷！🦑");
    setIsWizardLoading(true);
    triggerHaptic('success');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-weather-fallback',
          payload: {
            location: todayWeather.cityName,
            weather: weatherInfo.t,
            currentItems: dayItems.map(i => ({ id: i.id, title: i.title, location: i.location, category: i.category })),
            preferences: [
              ...(trip?.journals || []).filter(j => j.rating >= 4).map(j => j.title),
              ...(trip?.expenses || []).map(e => e.storeName)
            ].slice(-10).join(", ")
          }
        })
      });
      const data = await res.json();
      if (data && !data.error) {
        setWeatherAdvice(data);
        setShowWizardModal(true);
      }
    } catch (e) {
      alert("天氣巫師目前魔力不足，請稍後再試！🪄");
    } finally {
      setIsWizardLoading(false);
    }
  };

  const handleSwapItem = (originalId: string, recommendation: any) => {
    const original = dayItems.find(i => i.id === originalId);
    if (!original) return;

    const newItem: ScheduleItem = {
      ...original,
      title: recommendation.newTitle,
      location: recommendation.newLocation,
      category: recommendation.newCategory || 'sightseeing',
      note: `[AI 天氣對策] ${recommendation.newNote}`,
      lat: recommendation.newLat,
      lng: recommendation.newLng,
      updatedAt: Date.now()
    };

    updateScheduleItem(trip!.id, originalId, newItem);
    triggerHaptic('success');

    // 從建議清單中移除已使用的
    if (weatherAdvice) {
      setWeatherAdvice({
        ...weatherAdvice,
        recommendations: weatherAdvice.recommendations.filter(r => r.originalId !== originalId)
      });
      if (weatherAdvice.recommendations.length <= 1) setShowWizardModal(false);
    }
  };

  const handleFetchSpotGuide = async (item: ScheduleItem) => {
    if (!isOnline) return alert("請檢查網路連線");
    setSpotAiLoading(item.id);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-spot-guide',
          payload: { title: item.title, location: item.location }
        })
      });
      const data = await res.json();
      if (data && !data.error) {
        const guide = {
          background: data.background,
          highlights: data.highlights || [],
          suggestedDuration: data.suggestedDuration
        };
        const updatedItem = { ...item, spotGuide: guide };
        updateScheduleItem(trip!.id, item.id, updatedItem);
        setDetailItem(updatedItem);
        triggerHaptic('success');
      }
    } catch (e) {
      alert("取得景點導覽失敗。");
    } finally {
      setSpotAiLoading(null);
    }
  };

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimizeRoute = async () => {
    if (dayItems.length <= 2) return alert("行程太少，不需要優化唷！🦑");
    if (!isOnline) return alert("優化路徑需要連線。");
    setIsOptimizing(true);
    triggerHaptic('light');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize-route',
          payload: {
            items: dayItems.map(i => ({ id: i.id, title: i.title, location: i.location }))
          }
        })
      });
      const optimizedIds = await res.json();
      if (Array.isArray(optimizedIds)) {
        const newOrder = [...optimizedIds]
          .map(id => dayItems.find(i => i.id === id))
          .filter(Boolean) as ScheduleItem[];
        const missing = dayItems.filter(i => !optimizedIds.includes(i.id));
        reorderScheduleItems(trip!.id, [...newOrder, ...missing]);
        triggerHaptic('success');
        alert("✨ AI 路徑優化成功！");
      }
    } catch (e) {
      alert("優化失敗，請稍後再試。");
    } finally {
      setIsOptimizing(false);
    }
  };

  const onReorder = (newOrder: ScheduleItem[]) => {
    if (!trip) return;
    const otherItems = (trip.items || []).filter(it => it.date !== selectedDateStr);
    reorderScheduleItems(trip.id, [...otherItems, ...newOrder]);
    triggerHaptic('medium');
  };

  if (!trip || dateRange.length === 0) return null;

  return (
    <div className="flex flex-col h-full relative text-splat-dark">
      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8 pb-32">
        <motion.div
          onClick={() => setShowFullWeather(true)}
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.98 }}
          className="bg-[#5BA4E5] text-white rounded-[32px] border-[3px] border-splat-dark flex flex-col cursor-pointer shadow-splat-solid relative overflow-hidden p-5"
        >
          <div className="flex justify-between items-start z-10">
            <div>
              <div className="flex items-center gap-1 text-white/90 font-black text-[11px] uppercase tracking-widest mb-2">
                <MapPin size={12} /> {todayWeather.cityName} CITY
              </div>
              <div className="text-3xl font-black flex items-center gap-2 drop-shadow-sm">
                {weatherInfo.t} <span className="text-4xl">{weatherInfo.e}</span>
              </div>
              <div className="mt-2" />
            </div>
            <div className="text-right mt-1 z-10">
              <div className="text-5xl font-black drop-shadow-md">{currentTempStr}°</div>
              <div className="text-[11px] font-black text-white/90 mt-1 tracking-widest">{todayWeather.min}° / {todayWeather.max}°</div>
            </div>
          </div>
          <div className="flex gap-2 mt-6 z-10">
            {[{ icon: Umbrella, val: todayWeather.rain + '%', label: '降雨機率' }, { icon: Wind, val: todayWeather.wind, label: '風力' }, { icon: Sunrise, val: todayWeather.sunrise, label: '日出' }].map((item, i) => (
              <div key={i} className="flex-1 bg-white/20 rounded-xl p-3 flex flex-col items-center justify-center border-[2px] border-white/10">
                <item.icon size={18} className="mb-1.5 opacity-80" />
                <div className="text-lg font-black">{item.val}</div>
                <div className="text-[9px] font-bold opacity-80">{item.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 🪄 降雨超能力移至 AI Menu 中統一觸發 */}

        <div className="flex items-center justify-between bg-white border-[3px] border-splat-dark shadow-splat-solid p-3 rounded-2xl">
          <h3 className="text-lg font-black text-splat-dark italic tracking-widest uppercase ml-2 flex items-center gap-2">
            <span className="bg-splat-yellow px-2 py-0.5 -rotate-2 rounded">SCHEDULE</span>
          </h3>
          <div className="flex gap-2 items-center">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 border-splat-dark ${viewMode === 'map' ? 'bg-splat-blue text-white' : 'bg-white text-splat-dark shadow-splat-solid-sm'}`}>
              {viewMode === 'list' ? <MapIcon size={18} strokeWidth={3} /> : <Camera size={18} strokeWidth={3} />}
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingItem(undefined); setIsEditorOpen(true) }} className="w-9 h-9 rounded-xl bg-splat-green text-white flex items-center justify-center border-2 border-splat-dark shadow-splat-solid-sm"><Plus strokeWidth={3} /></motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsEditMode(!isEditMode)} className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 border-splat-dark ${isEditMode ? 'bg-splat-pink text-white' : 'bg-white text-splat-dark shadow-splat-solid-sm'}`}><Edit3 size={18} strokeWidth={3} /></motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => openAiAssistant('schedule')} className="w-9 h-9 rounded-xl bg-splat-blue text-white flex items-center justify-center border-2 border-splat-dark shadow-splat-solid-sm"><Sparkles size={18} strokeWidth={3} /></motion.button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="relative mt-4 space-y-6">
            <Reorder.Group axis="y" values={dayItems} onReorder={onReorder} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {dayItems.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white border-[3px] border-dashed border-gray-300 rounded-[40px] text-gray-400 font-black italic">今天還沒有計畫，來點冒險吧！🗺️</motion.div>
                ) : (
                  dayItems.map((item, idx) => {
                    const catStyle = CATEGORY_STYLE[item.category as keyof typeof CATEGORY_STYLE] || CATEGORY_STYLE.sightseeing;
                    const Icon = ICON_MAP[item.category as keyof typeof ICON_MAP] || Camera;
                    const prevItem = idx > 0 ? dayItems[idx - 1] : null;
                    let warningMsg = null;
                    let gapMins = 0;

                    if (prevItem) {
                      const prevEndTimeMins = prevItem.endTime ? timeToMins(prevItem.endTime) : timeToMins(prevItem.time);
                      const currentStartTimeMins = timeToMins(item.time);
                      gapMins = currentStartTimeMins - prevEndTimeMins;
                      if (gapMins < 0) warningMsg = "時間重疊囉！⏳";
                      else if (gapMins > 0 && gapMins < 30 && prevItem.location !== item.location) warningMsg = "行程有點趕！🏃";
                    }

                    return (
                      <Reorder.Item key={item.id} value={item} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} dragListener={isEditMode} className="relative pl-6">
                        <div className={`absolute left-[7px] top-6 bottom-[-24px] w-1 border-r-[3px] border-dashed border-splat-dark opacity-20 ${idx === dayItems.length - 1 ? 'hidden' : ''}`} />
                        <div className={`absolute left-0 top-[18px] w-4 h-4 rounded-full border-[3px] border-splat-dark z-10 ${catStyle.bg}`} />
                        <div className="flex gap-3 mb-6 relative group">
                          <div className="w-16 shrink-0 flex flex-col items-center mt-3 z-10">
                            <motion.button onClick={() => updateScheduleItem(trip.id, item.id, { ...item, isCompleted: !item.isCompleted })} className={`rounded-xl py-2 w-full text-center border-[3px] border-splat-dark -rotate-3 transition-colors ${item.isCompleted ? 'bg-gray-300 text-gray-500' : 'bg-white shadow-splat-solid-sm'}`}>
                              <span className="font-black text-[15px]">{item.time}</span>
                            </motion.button>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col gap-2">
                            {warningMsg && <div className="bg-white border-2 border-splat-dark px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 shadow-sm overflow-hidden"><AlertTriangle size={14} className="text-splat-orange" /> {warningMsg}</div>}
                            <motion.div onClick={() => isEditMode ? (setEditingItem(item), setIsEditorOpen(true)) : setDetailItem(item)} className={`card-splat p-0 overflow-hidden cursor-pointer bg-white border-[3px] border-splat-dark rounded-[24px] shadow-splat-solid relative ${item.isCompleted ? 'opacity-60 grayscale' : ''} ${isEditMode ? 'pr-12' : ''}`}>
                              <div className={`h-7 w-full ${catStyle.bg} border-b-[3px] border-splat-dark flex items-center px-3 justify-between`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${catStyle.text}`}>{catStyle.label}</span>
                              </div>
                              <div className="p-4 flex justify-between items-center bg-white relative">
                                <div className="flex-1 min-w-0 pr-2">
                                  <h4 className="font-black text-xl uppercase truncate">{item.title}</h4>
                                  <p className="text-xs font-bold text-gray-500 truncate"><MapPin size={14} /> {item.location}</p>
                                </div>
                                {isEditMode && (
                                  <div className="absolute right-0 top-0 bottom-0 w-12 bg-gray-50 border-l-[3px] border-splat-dark flex flex-col z-30">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} className="flex-1 flex items-center justify-center border-b-[3px] border-splat-dark"><Edit3 size={16} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm('確定刪除？')) deleteScheduleItem(trip.id, item.id); }} className="flex-1 flex items-center justify-center text-red-500"><Trash2 size={16} /></button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })
                )}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        ) : (
          <ScheduleMapView items={dayItems} trip={trip} />
        )}
      </div>

      {showFullWeather && <WeatherReportModal onClose={() => setShowFullWeather(false)} todayHourly={todayHourly} getWeatherDesc={getWeatherDesc} />}

      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-md z-[600] p-4 flex items-center justify-center" onClick={() => setDetailItem(undefined)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-splat-solid flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="h-56 bg-gray-200 relative shrink-0 border-b-[4px] border-splat-dark">
                <LazyImage src={detailItem.images?.[0] || `https://image.pollinations.ai/prompt/${encodeURIComponent(detailItem.location + ' ' + detailItem.title)}?width=800&height=600&nologo=true`} containerClassName="w-full h-full" alt="location" />
                <button onClick={() => setDetailItem(undefined)} className="absolute top-4 right-4 bg-white border-[3px] border-splat-dark p-2 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-5 bg-[#F4F5F7] overflow-y-auto">
                <div className="inline-flex items-center gap-2 text-sm font-black bg-white border-[3px] border-splat-dark px-3 py-1.5 rounded-lg">{detailItem.title}</div>
                <div className="card-splat p-4 bg-white/50">
                  <h4 className="text-[10px] font-black uppercase mb-2 flex items-center gap-1.5"><Sparkles size={14} /> AI 景點導覽</h4>
                  {detailItem.spotGuide ? (
                    <div className="text-sm font-bold text-gray-700">{detailItem.spotGuide.background}</div>
                  ) : (
                    <button onClick={() => handleFetchSpotGuide(detailItem)} disabled={!!spotAiLoading} className="w-full py-3 border-2 border-dashed rounded-lg text-xs font-black">
                      {spotAiLoading === detailItem.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 取得 AI 景點建議
                    </button>
                  )}
                </div>
                <div className="card-splat p-4">
                  <h4 className="text-[10px] font-black uppercase mb-2 flex items-center gap-1.5"><Plane size={14} /> 交通建議</h4>
                  {detailItem.transportSuggestion ? (
                    <p className="text-sm font-bold text-gray-700">{detailItem.transportSuggestion}</p>
                  ) : (
                    <button onClick={() => handleTransportAiSuggest(detailItem)} disabled={!!transportAiLoading} className="w-full py-3 border-2 border-dashed rounded-lg text-xs font-black">
                      {transportAiLoading === detailItem.id ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} 取得交通建議
                    </button>
                  )}
                </div>
                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location)}`, '_blank')} className="btn-splat w-full py-4 bg-splat-blue text-white flex items-center justify-center gap-2">
                  <MapPin size={20} /> 開啟導航
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAiOpen && (
          <AiAssistantModal
            onClose={() => setIsAiOpen(false)}
            isAiLoading={isAiLoading}
            onAnalyze={handleAiAnalyze}
            onOptimize={handleOptimizeRoute}
            isOptimizing={isOptimizing}
            canOptimize={dayItems.length > 2}
            onWeather={handleWeatherMagic}
            isWizardLoading={isWizardLoading}
            onFillGaps={handleAutoFillGaps}
          />
        )}
      </AnimatePresence>

      {/* 📍 天氣巫師建議彈窗 */}
      <AnimatePresence>
        {showWizardModal && weatherAdvice && (
          <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-md z-[1000] p-6 flex items-center justify-center" onClick={() => setShowWizardModal(false)}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-splat-solid-lg p-6 overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black italic text-splat-pink uppercase tracking-tighter">Weather Wizard</h3>
                <button onClick={() => setShowWizardModal(false)} className="p-1 bg-gray-100 rounded-full border-2 border-splat-dark"><X size={20} /></button>
              </div>

              <div className="bg-splat-pink/5 border-2 border-dotted border-splat-pink p-4 rounded-2xl mb-6">
                <p className="text-sm font-black text-splat-dark leading-relaxed">{weatherAdvice.reason}</p>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {weatherAdvice.recommendations.map((rec, i) => {
                  const original = dayItems.find(it => it.id === rec.originalId);
                  return (
                    <div key={i} className="bg-gray-50 border-[3px] border-splat-dark rounded-2xl p-4 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Replacement Suggestion</p>
                          <h4 className="font-black text-lg text-splat-dark leading-tight">{rec.newTitle}</h4>
                        </div>
                        <span className="bg-splat-green text-white text-[9px] font-black px-1.5 py-0.5 rounded border-2 border-splat-dark uppercase">Indoor</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 mb-3 truncate">替代: {original?.title || '原本行程'}</p>
                      <p className="text-[11px] font-bold text-gray-600 mb-4 line-clamp-2">{rec.newNote}</p>
                      <button
                        onClick={() => handleSwapItem(rec.originalId, rec)}
                        className="w-full py-3 bg-splat-blue text-white border-[3px] border-splat-dark rounded-xl font-black text-xs shadow-splat-solid-sm active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                      >
                        替換原有行程 <Check size={14} strokeWidth={4} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};
