import { useState, useMemo, useEffect, useCallback, useRef, FC } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid, isSameDay } from 'date-fns';
import { MapPin, Plus, Edit3, Trash2, Utensils, Plane, Home, Camera, Sparkles, X, Loader2, Wind, Umbrella, Sunrise, ChevronUp, ChevronDown, ChevronRight, Clock, Cloud, CloudRain, Sun, Droplets, AlertTriangle, Wand2, Check, WifiOff, Star, Map as MapIcon, MapPinOff, Copy, Phone, Luggage } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ScheduleItem, Trip, BookingItem } from '../types';
import { WeatherReportModal, TransportAiModal } from './ScheduleModals';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { LazyImage } from './LazyImage';
import { SwipeableItem } from './Common';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTranslation } from '../hooks/useTranslation';
import { triggerHaptic } from '../utils/haptics';
import { ARCompass } from './ui/ARCompass';

// 移除受限制的前端 API Key 引進
// const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-3-flash-preview"; // Fix 14: 確保使用正確模型版本
const ICON_MAP = { sightseeing: Camera, food: Utensils, transport: Plane, hotel: Home };

const CATEGORY_STYLE: any = {
  sightseeing: { bg: 'bg-p3-ruby/10', text: 'text-p3-ruby', label: 'SIGHTSEEING', splat: 'var(--p3-ruby)' },
  food: { bg: 'bg-p3-gold/10', text: 'text-p3-gold', label: 'FOOD', splat: 'var(--p3-gold)' },
  transport: { bg: 'bg-p3-navy/10', text: 'text-p3-navy', label: 'TRANSPORT', splat: 'var(--p3-navy)' },
  hotel: { bg: 'bg-p3-ruby/20', text: 'text-p3-ruby', label: 'HOTEL', splat: 'var(--p3-ruby)' },
  broadway: { bg: 'bg-p3-gold/10', text: 'text-p3-gold', label: 'SHOW', splat: 'var(--p3-gold)' }
};

// --- 航班主題萃取 ---
const AIRLINE_THEMES: Record<string, any> = {
  tigerair: { bgClass: 'bg-[#F49818]', textClass: 'text-white', logo: 'tigerair' },
  starlux: { bgClass: 'bg-[#181B26]', textClass: 'text-[#C4A97A]', logo: 'STARLUX' },
  eva: { bgClass: 'bg-[#007A53]', textClass: 'text-white', logo: 'EVA AIR' },
  china: { bgClass: 'bg-[#002855]', textClass: 'text-[#FFB6C1]', logo: 'CHINA AIRLINES' },
  other: { bgClass: 'bg-p3-navy', textClass: 'text-white', logo: 'FLIGHT' }
};

const getAirlineTheme = (airline?: string) => {
  if (!airline) return AIRLINE_THEMES.other;
  const key = Object.keys(AIRLINE_THEMES).find(k => airline.toLowerCase().includes(k));
  return key ? AIRLINE_THEMES[key] : AIRLINE_THEMES.other;
};

const getWeatherDesc = (code: number, t: (key: string) => string) => {
  if (code === undefined || code === -1) return { t: t('schedule.weather.loading'), e: '☁️', color: 'bg-[#F4F5F7]', splat: '#F4F5F7' };
  if (code === 0) return { t: t('schedule.weather.sunny'), e: '☀️', color: 'bg-[#FFF9C4]', splat: '#FFEB3B' }; // 淺黃色
  if (code === 1) return { t: t('schedule.weather.mostlyClear'), e: '🌤️', color: 'bg-[#FFFDE7]', splat: '#FFEB3B' };
  if (code === 2) return { t: t('schedule.weather.partlyCloudy'), e: '⛅', color: 'bg-[#E3F2FD]', splat: '#64B5F6' };
  if (code === 3) return { t: t('schedule.weather.cloudy'), e: '☁️', color: 'bg-[#F1F5F9]', splat: '#94A3B8' };
  if ([45, 48].includes(code)) return { t: t('schedule.weather.foggy'), e: '🌫️', color: 'bg-[#F1F5F9]', splat: '#94A3B8' };
  if ([51, 53, 55, 56, 57].includes(code)) return { t: t('schedule.weather.drizzle'), e: '🌦️', color: 'bg-[#E0F2FE]', splat: '#38BDF8' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { t: t('schedule.weather.showers'), e: '🌧️', color: 'bg-[#DBEAFE]', splat: '#3B82F6' }; // 淺藍色
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { t: t('schedule.weather.snow'), e: '🌨️', color: 'bg-[#F8FAFC]', splat: '#E2E8F0' };
  if ([95, 96, 99].includes(code)) return { t: t('schedule.weather.thunderstorm'), e: '⛈️', color: 'bg-[#F3E8FF]', splat: '#A855F7' };
  return { t: t('schedule.weather.sunny'), e: '☀️', color: 'bg-[#FFF9C4]', splat: '#FFEB3B' };
};

const getWindLevel = (speed: number, t: (key: string) => string) => {
  if (speed < 2) return `0${t('schedule.wind.level')}`;
  if (speed < 6) return `1${t('schedule.wind.level')}`;
  if (speed < 12) return `2${t('schedule.wind.level')}`;
  if (speed < 20) return `3${t('schedule.wind.level')}`;
  if (speed < 29) return `4${t('schedule.wind.level')}`;
  if (speed < 39) return `5${t('schedule.wind.level')}`;
  return `6${t('schedule.wind.level')}+`;
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

import { Map, MapMarker, MarkerContent, MapRoute, MapControls, MapPopup, Map3DBuildings } from './ui/map';
import MapLibreGL, { LngLatBounds } from 'maplibre-gl';
import type * as MapLibreGLType from 'maplibre-gl';


// --- 🔹 極簡空間 Timeline 組件 ---

// --- 🔹 專用航班卡片 (時間軸版) ---
const TimelineFlightCard: FC<{
  item: BookingItem;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const theme = getAirlineTheme(item.airline);

  return (
    <motion.div
      layoutId={`card-${item.id}`}
      onClick={onClick}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
      className="relative ml-14 mb-10 cursor-pointer group"
    >
      <div className="glass-card overflow-hidden shadow-glass-deep relative border-[0.5px] border-white/40">
        <div className={`${theme.bgClass} h-12 flex items-center justify-center border-b-[0.5px] border-white/20`}>
          <span className={`boutique-tag ${theme.textClass} opacity-90 tracking-[0.3em]`}>{theme.logo}</span>
        </div>
        <div className="p-6 flex justify-between items-center bg-white/30 backdrop-blur-md">
          <div className="flex flex-col items-center">
            <span className="text-3xl boutique-h1 text-p3-navy leading-none">{item.depIata || 'TPE'}</span>
            <span className="boutique-tag text-gray-400 mt-2">{item.depTime || '--:--'}</span>
          </div>
          <div className="flex-1 flex flex-col items-center px-6">
            <div className="boutique-tag text-p3-ruby mb-2">{item.flightNo}</div>
            <div className="w-full flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-gray-300" />
              <Plane size={16} strokeWidth={2.5} className="text-p3-ruby rotate-45" />
              <div className="h-[1px] flex-1 bg-gray-300" />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl boutique-h1 text-p3-navy leading-none">{item.arrIata || 'KIX'}</span>
            <span className="boutique-tag text-gray-400 mt-2">{item.arrTime || '--:--'}</span>
          </div>
        </div>
        <div className="absolute right-4 bottom-4 w-10 h-10 rounded-full bg-p3-navy text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-75 group-hover:scale-100">
          <ChevronRight size={20} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
};

// --- 🔹 專用飯店卡片 (時間軸版) ---
const TimelineHotelCard: FC<{
  item: BookingItem;
  onClick: () => void;
  t: (key: string) => string;
}> = ({ item, onClick, t }) => {
  return (
    <motion.div
      layoutId={`card-${item.id}`}
      onClick={onClick}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
      className="relative ml-14 mb-10 cursor-pointer group"
    >
      <div className="glass-card overflow-hidden shadow-glass-deep flex h-36 relative border-[0.5px] border-white/40">
        <div className="w-36 bg-gray-100 border-r-[0.5px] border-white/20 overflow-hidden">
          {item.images?.[0] ? (
            <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="hotel" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-p3-navy/5"><Home size={32} strokeWidth={2.5} className="text-p3-navy/20" /></div>
          )}
        </div>
        <div className="flex-1 p-6 flex flex-col justify-center bg-white/20 backdrop-blur-md">
          <div className="boutique-tag text-p3-navy opacity-60 mb-2">{t('schedule.verifiedStay')}</div>
          <h4 className="boutique-h2 text-xl text-p3-navy truncate">{item.title}</h4>
          <div className="flex items-center gap-4 mt-4 boutique-tag text-gray-400">
            <div className="flex items-center gap-1.5"><Clock size={14} strokeWidth={2.5} className="text-p3-ruby" /> {item.checkInTime || '15:00'}</div>
            <div className="flex items-center gap-1.5"><MapPin size={14} strokeWidth={2.5} className="text-p3-gold" /> {item.location}</div>
          </div>
        </div>
        <div className="absolute right-4 bottom-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md text-p3-navy flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md scale-75 group-hover:scale-100 border-[0.5px] border-black/5">
          <ChevronRight size={20} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
};

// --- 🔹 空間地圖 Header ---
const SpatialMapHeader: FC<{
  trip: Trip;
  activeItem?: any;
  t: (key: string) => string;
}> = ({ trip, activeItem, t }) => {
  const mapRef = useRef<MapLibreGLType.Map | null>(null);
  const MAPTILER_KEY = (import.meta as any).env.VITE_MAPTILER_API_KEY;

  useEffect(() => {
    if (activeItem?.lat && activeItem?.lng && mapRef.current) {
      mapRef.current.flyTo({
        center: [activeItem.lng, activeItem.lat],
        zoom: 15,
        padding: { top: 100, bottom: 20, left: 20, right: 20 },
        duration: 1500,
        essential: true
      });
    }
  }, [activeItem?.id]);

  return (
    <div className="relative h-64 w-full glass-card overflow-hidden shadow-glass-deep group border-[0.5px] border-white/40">
      <Map
        ref={mapRef}
        styles={{
          light: `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_KEY}`,
          dark: `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_KEY}`
        }}
        initialViewState={{
          center: [trip.lng || 135.5023, trip.lat || 34.6937],
          zoom: 12,
          pitch: 60,
        }}
        className="w-full h-full"
      >
        <Map3DBuildings />
        {activeItem?.lat && (
          <MapMarker longitude={activeItem.lng} latitude={activeItem.lat}>
            <div className="w-8 h-8 rounded-full bg-splat-blue border-4 border-white shadow-xl animate-pulse" />
          </MapMarker>
        )}
      </Map>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90 pointer-events-none" />

      {/* 墨線裝飾 */}
      <div className="absolute inset-x-8 bottom-10 flex justify-between items-end pointer-events-none">
        <div>
          <h2 className="text-4xl boutique-h1 text-p3-navy drop-shadow-sm">
            {trip.dest} <span className="text-p3-ruby">EXPRESS</span>
          </h2>
          <p className="boutique-tag text-p3-navy/30 mt-2">{t('schedule.spatialTimeline')}</p>
        </div>
        <div className="px-6 py-2 bg-p3-navy text-white rounded-full boutique-tag">
          {t('schedule.liveTracking')}
        </div>
      </div>
    </div>
  );
};

const ScheduleItemRow: FC<{
  item: ScheduleItem,
  idx: number,
  isEditMode: boolean,
  dayItems: any[],
  tripId: string,
  updateScheduleItem: any,
  deleteScheduleItem: any,
  setEditingItem: any,
  setIsEditorOpen: any,
  setDetailItem: any,
  timeToMins: (t: string) => number
}> = ({ item, idx, isEditMode, dayItems, tripId, updateScheduleItem, deleteScheduleItem, setEditingItem, setIsEditorOpen, setDetailItem, timeToMins }) => {
  const { showToast } = useTripStore();
  const catStyle = CATEGORY_STYLE[item.category as keyof typeof CATEGORY_STYLE] || CATEGORY_STYLE.sightseeing;

  const nextItem = dayItems[idx + 1];
  const connectorColor = nextItem
    ? (CATEGORY_STYLE[nextItem.category as keyof typeof CATEGORY_STYLE]?.splat ||
      (nextItem.__type === 'booking' ? (nextItem.type === 'flight' ? '#2932CF' : '#21CC65') : '#1A1A1A'))
    : '#1A1A1A';

  return (
    <motion.div
      layoutId={`card-${item.id}`}
      onClick={() => isEditMode ? (setEditingItem(item), setIsEditorOpen(true)) : setDetailItem(item)}
      whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
      className="relative pl-6 mb-8 group cursor-pointer"
    >
      {/* 動態連接線 */}
      <div
        className="absolute left-[7px] top-6 bottom-[-32px] w-[2px] opacity-20 border-l-2 border-dashed group-last:hidden"
        style={{ borderColor: connectorColor }}
      />
      <div
        className="absolute left-0 top-[18px] w-4 h-4 rounded-full border-2 bg-white z-10 transition-transform group-hover:scale-125"
        style={{ borderColor: connectorColor }}
      />

      <div className="flex gap-4">
        <div className="pt-4 min-w-[40px] text-right">
          <span className="boutique-tag text-p3-navy/30 italic">{item.time}</span>
        </div>

        <div className="flex-1 bg-white/40 backdrop-blur-3xl border-[0.5px] border-black/5 rounded-[32px] p-8 hover:border-black/10 transition-all hover:shadow-glass-deep relative overflow-hidden group/card shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`boutique-tag px-3 py-1 rounded-full border-[0.5px] border-p3-navy/10 ${catStyle.text}`}>
                  {item.category}
                </span>
                {item.isCompleted && <Check size={14} className="text-p3-navy" strokeWidth={3} />}
              </div>
              <h4 className="boutique-h2 text-xl text-p3-navy leading-tight">{item.title}</h4>
            </div>
            {item.images?.[0] && (
              <div className="w-16 h-16 rounded-2xl border-[0.5px] border-black/5 shadow-sm overflow-hidden transition-transform group-hover/card:scale-105">
                <LazyImage src={item.images[0]} containerClassName="w-full h-full" alt="spot" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-p3-navy/5">
            <div className="flex items-center gap-2 boutique-tag text-p3-navy/30">
              <MapPin size={12} strokeWidth={2.5} className="text-p3-gold" /> {item.location}
            </div>
            {item.cost > 0 && (
              <div className="flex items-center gap-2 boutique-tag text-p3-ruby">
                <Star size={12} strokeWidth={2.5} /> JPY {item.cost.toLocaleString()}
              </div>
            )}
          </div>

          <div className="absolute right-6 bottom-8 opacity-0 group-hover/card:opacity-100 transition-all active:scale-90">
            <div className="p-3 bg-p3-navy text-white rounded-full shadow-lg">
              <ChevronRight size={18} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- 輔助組件：地圖路徑視圖 ---
const ScheduleMapView: FC<{
  items: ScheduleItem[],
  trip?: Trip,
  setDetailItem: any,
  addScheduleItem: any,
  selectedDateStr: string,
  t: (key: string) => string
}> = ({ items, trip, setDetailItem, addScheduleItem, selectedDateStr, t }) => {
  const { showToast } = useTripStore();
  const MAPTILER_KEY = (import.meta as any).env.VITE_MAPTILER_API_KEY;
  const mapRef = useRef<MapLibreGLType.Map | null>(null);
  const activeCardIdRef = useRef<string | null>(null);
  const activeTab = useTripStore(s => s.activeTab);
  const isMountedRef = useRef(true);

  // 🛡️ 追蹤組件生命週期，防止卸載後的 WebGL 操作導致白畫面
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 📍 魔法雷達狀態
  const [aiPlaces, setAiPlaces] = useState<any[]>([]);
  const [isExploring, setIsExploring] = useState(false);
  const [selectedAiPlace, setSelectedAiPlace] = useState<any>(null);
  const [showAR, setShowAR] = useState(false);
  const [arTarget, setArTarget] = useState<{ lat: number, lng: number, name: string } | null>(null);

  // 🚀 修復 Lazy-Keep 導致的地圖破圖 (hidden 屬性變回 visible 時需要 resize)
  useEffect(() => {
    if (activeTab === 'timeline' && mapRef.current) {
      requestAnimationFrame(() => {
        mapRef.current?.resize();
      });
    }
  }, [activeTab]);

  const points = useMemo(() => {
    return items.filter(item => item.lat && item.lng).map(item => [item.lng, item.lat] as [number, number]);
  }, [items]);

  const viewport = useMemo(() => {
    if (points.length > 0) return { center: points[0], zoom: points.length === 1 ? 15 : 12, bearing: -20, pitch: 60 };
    return { center: [trip?.lng || 135.5023, trip?.lat || 34.6937] as [number, number], zoom: 12, bearing: -20, pitch: 60 };
  }, [points, trip]);

  useEffect(() => {
    if (!mapRef.current || points.length === 0 || !isMountedRef.current) return;
    try {
      const bounds = new LngLatBounds();
      points.forEach(p => bounds.extend(p));
      mapRef.current.fitBounds(bounds, { padding: 80, duration: 0, maxZoom: 16 });
    } catch (e) {
      console.warn('[Map] fitBounds skipped (context lost):', e);
    }
  }, [points]);

  const handleCardClick = (item: ScheduleItem) => {
    if (item.lat && item.lng && mapRef.current && isMountedRef.current) {
      try {
        mapRef.current.flyTo({ center: [item.lng, item.lat], zoom: 16, duration: 1200, essential: true });
        triggerHaptic('medium');
      } catch (e) {
        console.warn('[Map] flyTo skipped (context lost):', e);
      }
    }
  };

  // 📍 觸發魔法雷達 API
  const handleExploreNearby = async () => {
    if (!mapRef.current || !isMountedRef.current) return;
    if (!navigator.onLine) return showToast(t('schedule.radarOffline'), "info");

    let center;
    try {
      center = mapRef.current.getCenter();
    } catch (e) {
      console.warn('[Map] getCenter failed:', e);
      return;
    }
    setIsExploring(true);
    triggerHaptic('heavy');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'explore-nearby',
          payload: { lat: center.lat, lng: center.lng, city: trip?.dest }
        })
      });

      if (!res.ok) throw new Error("API Error");
      const data = await res.json();

      if (data.places && data.places.length > 0) {
        setAiPlaces(data.places);
        triggerHaptic('success');
      } else {
        showToast(t('schedule.ai.noRecommendation'), "info");
      }
    } catch (e) {
      showToast(t('schedule.ai.radarFailed'), "error");
    } finally {
      setIsExploring(false);
    }
  };

  const uiSettings = useTripStore(s => s.uiSettings);

  return (
    <div className="flex flex-col h-full gap-4 relative">
      <div className="flex-1 relative glass-card overflow-hidden border-[4px] border-p3-navy shadow-glass-deep bg-gray-100">
        <Map
          ref={mapRef as any}
          initialViewState={{
            center: [trip?.lng || 135.5023, trip?.lat || 34.6937],
            zoom: 13,
            pitch: 60,   // 🚀 開啟 3D 傾斜視角
            bearing: -20 // 🚀 微旋轉增加透視感
          }}
          maxPitch={85}  // 🚀 允許使用者手動滑動至更低視角
          className="w-full h-full z-10"
        >
          <MapRoute coordinates={points} color="#5BA4E5" width={5} dashArray={[2, 2]} />

          {/* 🚀 Step 2: 開啟 3D 建築物圖層 */}
          <Map3DBuildings enabled={uiSettings.enable3DMap} />

          {/* 1. 渲染原本的行程標記 */}
          <MapControls showZoom showCompass showLocate position="bottom-right" />
          {items.map((item, idx) => (
            item.lat && item.lng && (
              <MapMarker key={item.id} longitude={item.lng} latitude={item.lat} onClick={() => { handleCardClick(item); setTimeout(() => setDetailItem?.(item), 1300); }}>
                <MarkerContent>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-splat-blue border-2 border-white rounded-full flex items-center justify-center text-white font-black shadow-lg text-xs hover:bg-splat-pink transition-colors">
                      {idx + 1}
                    </div>
                  </div>
                </MarkerContent>
              </MapMarker>
            )
          ))}

          {/* 2. 渲染 AI 推薦的發光標記 */}
          {aiPlaces.map((place, idx) => (
            <MapMarker key={`ai-${idx}`} longitude={place.lng} latitude={place.lat} onClick={(e: any) => {
              e.originalEvent?.stopPropagation();
              setSelectedAiPlace(place);
              setArTarget({ lat: place.lat, lng: place.lng, name: place.name });
              setShowAR(true); // 🚀 直接開啟 AR 羅盤導向此點
              triggerHaptic('heavy');
            }}>
              <MarkerContent>
                <motion.div
                  onClick={(e) => { e.stopPropagation(); setSelectedAiPlace(place); }}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: idx * 0.2 }}
                  className="w-10 h-10 bg-splat-yellow rounded-full border-[0.5px] border-p3-navy flex items-center justify-center shadow-[0_0_15px_#FFC000]"
                >
                  <Sparkles size={18} className="text-p3-navy" strokeWidth={3} />
                </motion.div>
              </MarkerContent>
            </MapMarker>
          ))}

          {/* 3. AI 地點彈出視窗 (Popup) */}
          {selectedAiPlace && (
            <MapPopup
              longitude={selectedAiPlace.lng}
              latitude={selectedAiPlace.lat}
              onClose={() => setSelectedAiPlace(null)}
              closeButton={true}
              className="border-[0.5px] border-p3-navy rounded-2xl shadow-glass-deep-sm p-4 w-56 bg-white relative"
            >
              <div className="pt-2">
                <div className="text-[9px] font-black bg-splat-pink text-white px-2 py-0.5 rounded-full inline-block mb-1 tracking-widest">
                  {t('schedule.ai.discovery')}
                </div>
                <h4 className="font-black text-p3-navy text-base leading-tight mb-1">{selectedAiPlace.name}</h4>
                <p className="text-xs font-bold text-gray-600 leading-snug mb-3">
                  {selectedAiPlace.reason}
                </p>
                <p className="boutique-tag text-gray-400 mb-3 flex items-center gap-1">
                  <Clock size={12} /> {t('schedule.ai.estimatedTime')} {selectedAiPlace.estimatedTime}
                </p>
                <button
                  className="w-full bg-splat-green text-white boutique-tag py-2.5 rounded-xl border-2 border-p3-navy shadow-sm active:translate-y-0.5 transition-transform flex items-center justify-center gap-2"
                  onClick={() => {
                    addScheduleItem(trip!.id, {
                      id: Date.now().toString(),
                      title: selectedAiPlace.name,
                      location: selectedAiPlace.name,
                      lat: selectedAiPlace.lat,
                      lng: selectedAiPlace.lng,
                      category: selectedAiPlace.category === 'food' ? 'food' : 'sightseeing',
                      time: '12:00', // 預設時間，使用者稍後可改
                      note: `${t('schedule.ai.spotNotePrefix')} ${selectedAiPlace.reason}`,
                      date: selectedDateStr,
                      images: []
                    });
                    setSelectedAiPlace(null);
                    setAiPlaces(places => places.filter(p => p.name !== selectedAiPlace.name)); // 移除已加入的點
                    triggerHaptic('success');
                  }}
                >
                  <Plus size={14} strokeWidth={3} /> {t('schedule.ai.addToToday')}
                </button>
              </div>
            </MapPopup>
          )}

          <MapControls showZoom showLocate position="bottom-right" />
        </Map>

        {/* 📍 頂部控制列：包含計數器與魔法雷達按鈕 */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
          <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border-2 border-p3-navy boutique-tag flex items-center gap-2 shadow-sm">
            <MapIcon size={12} className="text-splat-blue" />
            {items.length} {t('schedule.ai.spots')}
          </div>

          <button
            onClick={handleExploreNearby}
            disabled={isExploring}
            className="pointer-events-auto bg-p3-navy text-splat-yellow border-[0.5px] border-p3-navy px-4 py-2 rounded-2xl boutique-tag flex items-center gap-2 shadow-glass-deep-sm active:translate-y-1 transition-all disabled:opacity-70"
          >
            {isExploring ? <Loader2 size={16} className="animate-spin text-white" /> : <Sparkles size={16} />}
            {isExploring ? t('schedule.ai.scanning') : t('schedule.ai.exploreArea')}
          </button>
        </div>
      </div>

      {/* 🎠 Snap Carousel */}
      <div
        className="flex overflow-x-auto gap-4 px-1 py-1 hide-scrollbar snap-x snap-mandatory h-28 shrink-0"
        onScroll={(e) => {
          const container = e.currentTarget;
          let closestItem: ScheduleItem | null = null;
          let minDiff = Infinity;

          Array.from(container.children).forEach((child: any, idx) => {
            const childRect = child.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const childCenter = childRect.left + childRect.width / 2;
            const containerCenter = containerRect.left + containerRect.width / 2;
            const diff = Math.abs(childCenter - containerCenter);
            if (diff < minDiff) {
              minDiff = diff;
              closestItem = items[idx];
            }
          });

          if (closestItem && (closestItem as ScheduleItem).id !== activeCardIdRef.current) {
            activeCardIdRef.current = (closestItem as ScheduleItem).id;
            if ((closestItem as ScheduleItem).lat && (closestItem as ScheduleItem).lng && mapRef.current) {
              mapRef.current.flyTo({ center: [(closestItem as ScheduleItem).lng!, (closestItem as ScheduleItem).lat!], zoom: 16, duration: 800 });
            }
          }
        }}
      >
        {items.map((item, idx) => {
          const catStyle = CATEGORY_STYLE[item.category as keyof typeof CATEGORY_STYLE] || CATEGORY_STYLE.sightseeing;
          return (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardClick(item)}
              className="snap-center shrink-0 w-44 bg-white border-[0.5px] border-p3-navy rounded-[20px] shadow-glass-deep-sm overflow-hidden flex cursor-pointer"
            >
              <div className={`w-1.5 ${catStyle.bg} h-full border-r-2 border-p3-navy`} />
              <div className="flex-1 p-2.5 flex flex-col justify-between overflow-hidden">
                <div className="text-[14px] font-black uppercase italic text-splat-blue leading-none mb-1">{item.time}</div>
                <div className="text-[13px] font-black truncate">{item.title}</div>
                <div className="text-[9px] font-bold text-gray-400 truncate uppercase mt-0.5">{item.location}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};


export const Schedule: FC<{ externalDateIdx?: number }> = ({ externalDateIdx = 0 }) => {
  const { t } = useTranslation();
  const { trips, currentTripId, updateTripData, addScheduleItem, updateScheduleItem, deleteScheduleItem, deleteBookingItem, showToast, checkAiFallback, uiSettings, addBookingItem, addJournalItem, addShoppingItem, addInfoItem, reorderScheduleItems } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const isOnline = useNetworkStatus();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>();
  const [detailItem, setDetailItem] = useState<any | undefined>();

  const [showFullWeather, setShowFullWeather] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [gapAiLoading, setGapAiLoading] = useState<string | null>(null);
  const [transportAiLoading, setTransportAiLoading] = useState<string | null>(null);

  // 📍 Phase 5: 天氣巫師狀態
  const [isWizardLoading, setIsWizardLoading] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [selectedTransportSuggestion, setSelectedTransportSuggestion] = useState<any>(null);
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

  // 🚀 合併 Schedule 與 Booking
  const dayItems = useMemo(() => {
    const schedules = (trip?.items || []).filter(i => i.date === selectedDateStr);
    const bookings = (trip?.bookings || []).filter(i => i.date === selectedDateStr || (i.endDate && selectedDateStr >= i.date && selectedDateStr <= i.endDate));

    const merged = [
      ...schedules.map(i => ({ ...i, __type: 'schedule' as const })),
      ...bookings.map(i => ({ ...i, __type: 'booking' as const }))
    ];

    return merged.sort((a, b) => {
      const timeA = (a as any).time || (a as any).depTime || '00:00';
      const timeB = (b as any).time || (b as any).depTime || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [trip, selectedDateStr]);

  const [activeDayItem, setActiveDayItem] = useState<any>(null);

  // 🚀 IntersectionObserver 用於空間地圖隨動
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) {
          const id = visible.target.getAttribute('data-id');
          const item = dayItems.find(i => i.id === id);
          if (item) setActiveDayItem(item);
        }
      },
      { threshold: 0.5, rootMargin: '-10% 0% -40% 0%' }
    );

    const elements = document.querySelectorAll('.timeline-item');
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [dayItems]);

  const timeline = useMemo(() => {
    const sortedForTimeline = [...dayItems].sort((a, b) => {
      const tA = (a as any).time || (a as any).depTime || '00:00';
      const tB = (b as any).time || (b as any).depTime || '00:00';
      return tA.localeCompare(tB);
    });

    const defaultCity = { name: trip?.dest.toUpperCase() || 'CITY', lat: trip?.lat || 0, lng: trip?.lng || 0 };
    if (!trip || dateRange.length === 0) return [{ time: '00:00', city: defaultCity }];

    const getFallbackCity = () => {
      const items = trip.items || [];
      for (let i = externalDateIdx - 1; i >= 0; i--) {
        const dStr = format(dateRange[i], 'yyyy-MM-dd');
        const dayIt = items.filter(it => it.date === dStr).sort((a, b) => (b.time || '').localeCompare(a.time || ''));
        for (const it of dayIt) {
          const found = CITY_DB.find(c => c.keys.some(k => `${it.title} ${it.location} `.includes(k)));
          if (found) return found;
        }
      }
      for (let i = externalDateIdx + 1; i < dateRange.length; i++) {
        const dStr = format(dateRange[i], 'yyyy-MM-dd');
        const dayIt = items.filter(it => it.date === dStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        for (const it of dayIt) {
          const found = CITY_DB.find(c => c.keys.some(k => `${it.title} ${it.location} `.includes(k)));
          if (found) return found;
        }
      }
      return defaultCity;
    };

    const tl: { time: string, city: typeof defaultCity }[] = [];
    for (const item of sortedForTimeline as any[]) {
      const found = CITY_DB.find(c => c.keys.some(k => `${item.title} ${item.location} `.includes(k)));
      if (found) {
        if (tl.length === 0 || tl[tl.length - 1].city.name !== found.name) {
          tl.push({ time: item.time || item.depTime || '00:00', city: found });
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
    const cityMap = new globalThis.Map<string, any>();
    timeline.forEach(t => cityMap.set(t.city.name, t.city));
    return Array.from(cityMap.values());
  }, [timeline]);

  const weatherQueries = useQueries({
    queries: uniqueCities.map((city) => ({
      queryKey: ['weather', city.name, city.lat, city.lng],
      queryFn: async () => {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,windspeed_10m_max&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m&current_weather=true&timezone=auto`);
        if (!res.ok) throw new Error('Weather API error');
        return res.json();
      },
      // Fix 4: 30分鐘 staleTime 避免頻繁 re-fetch
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
      retry: 1,
    })),
  });

  const weatherCache = useMemo(() => {
    const cache: Record<string, any> = {};
    uniqueCities.forEach((city, index) => {
      const query = weatherQueries[index];
      if (query.isSuccess && query.data) {
        cache[city.name] = query.data;
      }
    });
    return cache;
  }, [uniqueCities, weatherQueries]);

  let todayWeather = { max: '--', min: '--', code: -1, rain: 0, sunrise: '--:--', wind: '0級', cityName: timeline[0]?.city.name || 'CITY' };
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
      rain: mainCityData.daily.precipitation_probability_max[dailyIdx] || 0,
      sunrise: format(parseISO(mainCityData.daily.sunrise[dailyIdx]), 'HH:mm'),
      wind: getWindLevel(mainCityData.daily.windspeed_10m_max[dailyIdx] || 0, t)
    };
    currentTempStr = mainCityData.current_weather?.temperature !== undefined ? Math.round(mainCityData.current_weather.temperature).toString() : todayWeather.max;
  }
  const weatherInfo = getWeatherDesc(todayWeather.code, t);

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
    if (!isOnline) return showToast(t('schedule.ai.networkError'), "info");
    setGapAiLoading(prevItem.id);

    const prefs = [
      ...(trip?.journals || []).filter(j => j.rating >= 4).map(j => j.title),
      ...(trip?.expenses || []).map(e => e.storeName)
    ].filter(Boolean).slice(-15).join(", ");

    // Fix 5: 30 秒 AbortController 超時保護
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-gap',
          payload: { prevItem, nextItem, preferences: prefs }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data && !data.error) {
        addScheduleItem(trip!.id, {
          ...data,
          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          date: selectedDateStr,
          images: [],
          note: `${t('schedule.ai.spotNotePrefix')} ${data.reason || ''}`
        });
        triggerHaptic('light');
        showToast(t('schedule.ai.successExplore'), "success");
      }
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.name === 'AbortError') showToast(t('schedule.ai.timeout'), "error");
      else showToast(t('schedule.ai.noIdea'), "error");
    } finally {
      setGapAiLoading(null);
    }
  };

  const handleAutoFillGaps = async () => {
    let foundGap = null;
    for (let i = 1; i < dayItems.length; i++) {
      const prev = dayItems[i - 1] as any;
      const curr = dayItems[i] as any;
      const prevEnd = prev.endTime ? timeToMins(prev.endTime) : timeToMins(prev.time || prev.depTime);
      const currStart = timeToMins(curr.time || curr.depTime);
      if (currStart - prevEnd >= 120) {
        foundGap = { prev, curr };
        break;
      }
    }
    if (foundGap) {
      await handleGapAiSuggest(foundGap.prev, foundGap.curr);
    } else {
      showToast(t('schedule.ai.noGap'), "info");
    }
  };

  const handleTransportAiSuggest = async (currentItem: ScheduleItem) => {
    if (!isOnline) return showToast(t('schedule.ai.networkError'), "info");
    setTransportAiLoading(currentItem.id);

    const items = trip?.items || [];
    const sortedItems = [...items].filter(i => i.date === currentItem.date).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const globalIdx = sortedItems.findIndex(i => i.id === currentItem.id);
    const prevItem = globalIdx > 0 ? sortedItems[globalIdx - 1] as ScheduleItem : null;

    // Fix 5: 30 秒超時保護
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error("API 請求失敗");

      // [Task 2] 實作串流讀取 (Manual Stream Reader)
      const reader = res.body?.getReader();
      if (!reader) throw new Error("無法讀取回應串流");

      const decoder = new TextDecoder();
      let fullText = "";
      let lastResult: any = null;

      setShowTransportModal(true); // 先開啟 Modal 顯示串流中狀態

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullText += decoder.decode(value, { stream: true });

        // Vercel AI SDK text stream 格式為多行 JSON 塊
        const lines = fullText.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            // 解析部分 JSON 並即時更新 UI
            const parsed = JSON.parse(line);
            if (parsed && typeof parsed === 'object') {
              lastResult = parsed;
              setSelectedTransportSuggestion(parsed);
            }
          } catch (e) { /* 部分 JSON 尚未完整，忽略 */ }
        }
      }

      if (!lastResult || !lastResult.steps) throw new Error("AI 未能產出有效建議格式");

      // Smart Router Meta: 讀取 Header 並處理 (從 fetch 回傳的 res 中讀取)
      const modelUsed = res.headers.get('X-AI-Model-Used');
      if (modelUsed === 'flash-fallback') showToast(t('schedule.ai.fallbackModel'), "info");

      const updatedItem = { ...currentItem, transportSuggestion: JSON.stringify(lastResult) };
      updateScheduleItem(trip!.id, currentItem.id, updatedItem);
      triggerHaptic('success');
    } catch (e: any) {
      clearTimeout(timeout);
      console.error(e);
      if (e?.name === 'AbortError') showToast(t('schedule.ai.timeout'), "error");
      else showToast(t('schedule.ai.noIdea'), "error");
    } finally {
      setTransportAiLoading(null);
    }
  };

  const handleAiAnalyze = async (text: string) => {
    if (!isOnline) return showToast(t('schedule.ai.spotNetErr'), "info");
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
        triggerHaptic('success');
        showToast(t('schedule.ai.batchSuccess'), "success");
      }
    } catch (e) {
      showToast(t('schedule.ai.batchFailed'), "error");
    } finally { setIsAiLoading(false); }
  };

  const handleWeatherMagic = async () => {
    if (!isOnline) return showToast(t('schedule.ai.weatherNetErr'), "info");
    setIsWizardLoading(true);
    triggerHaptic('success');

    // Fix 5: 超時保護
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-weather-fallback',
          payload: {
            location: todayWeather.cityName,
            weather: weatherInfo.t,
            currentItems: dayItems.map((i: any) => ({ id: i.id, title: i.title, location: i.location, category: i.category })),
            preferences: [
              ...(trip?.journals || []).filter(j => j.rating >= 4).map(j => j.title),
              ...(trip?.expenses || []).map(e => e.storeName)
            ].slice(-10).join(", ")
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data && !data.error) {
        // Smart Router: show toast if Flash fallback was used
        checkAiFallback(data);
        setWeatherAdvice(data);
        setShowWizardModal(true);
      }
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.name === 'AbortError') showToast(t('schedule.ai.weatherTimeout'), "error");
      else showToast(t('schedule.ai.weatherFailed'), "error");
    } finally {
      setIsWizardLoading(false);
    }
  };

  const handleSwapItem = (originalId: string, recommendation: any) => {
    const original = dayItems.find(i => i.id === originalId);
    if (!original) return;

    const newItem: any = {
      ...original,
      title: recommendation.newTitle,
      location: recommendation.newLocation,
      category: recommendation.newCategory || 'sightseeing',
      note: `${t('schedule.ai.weatherNotePrefix')} ${recommendation.newNote}`,
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

  const activeSpotIdRef = useRef<string | null>(null);
  const [completion, setCompletion] = useState<string>("");

  // AI 景點導覽 (純文字串流接收）
  const handleFetchSpotGuide = async (item: ScheduleItem) => {
    if (!isOnline) return showToast(t('schedule.ai.spotNetErr'), "info");
    activeSpotIdRef.current = item.id;
    setSpotAiLoading(item.id);
    setCompletion("");

    // Fix 5: 串流也需要超時保護
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 串流給 45 秒

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-spot-guide',
          payload: { title: item.title, location: item.location }
        }),
        signal: controller.signal
      });

      if (!res.ok) throw new Error("請求失敗");
      if (!res.body) throw new Error("回應為空");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value, { stream: true });
        fullText += chunkText;
        setCompletion(fullText);
      }
      clearTimeout(timeout);

      const guide = { background: fullText, highlights: [], suggestedDuration: "" };
      const updatedItem = { ...item, spotGuide: guide };
      if (trip) updateScheduleItem(trip.id, item.id, updatedItem);
      setDetailItem((prev: any) => prev?.id === item.id ? updatedItem : prev);

      triggerHaptic('success');
    } catch (err: any) {
      clearTimeout(timeout);
      console.error("Spot Guide Error:", err);
      if (err?.name === 'AbortError') showToast(t('schedule.ai.spotTimeout'), "error");
      else showToast(t('schedule.ai.spotFailed'), "error");
    } finally {
      activeSpotIdRef.current = null;
      setSpotAiLoading(null);
    }
  };


  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimizeRoute = async () => {
    if (dayItems.length <= 2) return showToast(t('schedule.ai.routeTooFew'), "info");
    if (!isOnline) return showToast(t('schedule.ai.routeNetErr'), "info");
    setIsOptimizing(true);
    triggerHaptic('light');

    // Fix 5: 超時保護
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize-route',
          payload: {
            items: dayItems.map(i => ({ id: i.id, title: i.title, location: i.location }))
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const optimizedIds = await res.json();
      // Smart Router: if fallback occurred, api returns X-AI-Tier: standard header
      if (res.headers.get('X-AI-Tier') === 'standard') checkAiFallback({ ai_tier: 'standard' });
      if (Array.isArray(optimizedIds)) {
        const newOrder = [...optimizedIds]
          .map(id => dayItems.find(i => i.id === id))
          .filter(Boolean) as any[];
        const missing = dayItems.filter(i => !optimizedIds.includes(i.id));
        reorderScheduleItems(trip!.id, [...newOrder, ...missing] as any);
        triggerHaptic('success');
        showToast(t('schedule.ai.routeSuccess'), "success");
      }
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.name === 'AbortError') showToast(t('schedule.ai.routeTimeout'), "error");
      else showToast(t('schedule.ai.routeFailed'), "error");
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
    <div className="flex flex-col h-full relative text-p3-navy">
      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8 pb-32">
        <div className="sticky top-0 z-50 bg-[#F4F5F7]/80 backdrop-blur-md pt-2 pb-6">
          <SpatialMapHeader trip={trip!} activeItem={activeDayItem} t={t} />

          <div className="flex items-center justify-between mt-6 px-4">
            <div className="flex gap-4">
              <div onClick={() => setShowFullWeather(true)} className="flex items-center gap-3 cursor-pointer group">
                <div className="text-3xl font-black text-p3-navy">{currentTempStr}°</div>
                <div>
                  <div className="boutique-tag text-p3-navy/40 uppercase tracking-widest">{weatherInfo.t}</div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-splat-blue">
                    <CloudRain size={10} /> {todayWeather.rain}%
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 500, damping: 20 } }} onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className={`w-10 h-10 rounded-2xl flex items-center justify-center border-[1px] border-p3-navy/10 ${viewMode === 'map' ? 'bg-splat-blue text-white' : 'bg-white text-p3-navy shadow-xl shadow-black/5'}`}>
                {viewMode === 'list' ? <MapIcon size={18} /> : <Camera size={18} />}
              </motion.button>
              <motion.button whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 500, damping: 20 } }} onClick={() => setIsEditMode(!isEditMode)} className={`w-10 h-10 rounded-2xl flex items-center justify-center border-[1px] border-p3-navy/10 ${isEditMode ? 'bg-splat-yellow text-p3-navy' : 'bg-white text-gray-400 shadow-xl shadow-black/5'}`}>
                <Edit3 size={18} />
              </motion.button>
              <motion.button whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 500, damping: 20 } }} onClick={() => { setEditingItem(undefined); setIsEditorOpen(true) }} className="w-12 h-12 rounded-2xl bg-p3-navy text-white flex items-center justify-center shadow-xl shadow-p3-navy/20 transition-shadow hover:shadow-p3-navy/40"><Plus size={18} strokeWidth={2.5} /></motion.button>
            </div>
          </div>
        </div>

        {/* 🚀 Task 2: 雨滴墨水動畫 (受 enableWeatherFX 控制) */}
        {uiSettings.enableWeatherFX && todayWeather.rain > 30 && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {[...Array(10)].map((_, i) => (
              <motion.div key={i} initial={{ y: -100, x: Math.random() * 400, opacity: 0 }} animate={{ y: window.innerHeight + 100, opacity: [0, 0.3, 0] }} transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 5 }} className="absolute">
                <svg width="40" height="60" viewBox="0 0 40 60" fill="none"><path d="M20 0C20 0 0 25 0 40C0 51.0457 8.9543 60 20 60C31.0457 60 40 51.0457 40 40C40 25 20 0 20 0Z" fill="currentColor" className="text-splat-blue/10" /></svg>
              </motion.div>
            ))}
          </div>
        )}

        {viewMode === 'list' ? (
          <div className="relative mt-4">
            <AnimatePresence mode="popLayout">
              {dayItems.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white border-[1px] border-dashed border-gray-300 rounded-[40px] text-gray-400 font-black italic">{t('schedule.noPlans')}</motion.div>
              ) : (
                dayItems.map((item, idx) => (
                  <div key={item.id} data-id={item.id} className="timeline-item">
                    {item.__type === 'schedule' ? (
                      <SwipeableItem id={item.id} onDelete={() => deleteScheduleItem(trip!.id, item.id)}>
                        <ScheduleItemRow
                          item={item as any}
                          idx={idx}
                          isEditMode={isEditMode}
                          dayItems={dayItems}
                          tripId={trip!.id}
                          updateScheduleItem={updateScheduleItem}
                          deleteScheduleItem={deleteScheduleItem}
                          setEditingItem={setEditingItem}
                          setIsEditorOpen={setIsEditorOpen}
                          setDetailItem={setDetailItem}
                          timeToMins={timeToMins}
                        />
                      </SwipeableItem>
                    ) : (
                      item.type === 'flight' ? (
                        <SwipeableItem id={item.id} onDelete={() => deleteBookingItem(trip!.id, item.id)}>
                          <TimelineFlightCard
                            item={item as any}
                            onClick={() => setDetailItem(item as any)}
                          />
                        </SwipeableItem>
                      ) : (
                        <SwipeableItem id={item.id} onDelete={() => deleteBookingItem(trip!.id, item.id)}>
                          <TimelineHotelCard
                            item={item as any}
                            onClick={() => setDetailItem(item as any)}
                            t={t}
                          />
                        </SwipeableItem>
                      )
                    )}
                  </div>
                ))
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="relative h-[65vh] mt-4 flex flex-col gap-4">
            <ScheduleMapView
              items={dayItems as any}
              trip={trip!}
              setDetailItem={setDetailItem as any}
              addScheduleItem={addScheduleItem}
              selectedDateStr={selectedDateStr}
              t={t}
            />
          </div>
        )}
      </div>

      {showFullWeather && <WeatherReportModal onClose={() => setShowFullWeather(false)} todayHourly={todayHourly} getWeatherDesc={(code) => getWeatherDesc(code, t)} />}

      {/* --- 🚀 Command Center (Detail View with Shared Element Transition) --- */}
      <AnimatePresence>
        {detailItem && (
          <div
            className="fixed inset-0 bg-p3-navy/60 backdrop-blur-xl z-[600] flex items-center justify-center p-0 sm:p-4"
            onClick={() => setDetailItem(undefined)}
          >
            <motion.div
              layoutId={`card-${detailItem.id}`}
              className="bg-[#F4F5F7] w-full h-full sm:h-auto sm:max-w-md sm:rounded-[40px] border-b-0 sm:border-[4px] border-p3-navy shadow-2xl flex flex-col overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setDetailItem(undefined)}
                className="absolute top-6 right-6 z-[700] bg-white/80 backdrop-blur-sm border-[0.5px] border-p3-navy p-2 rounded-full shadow-glass-deep-sm active:scale-90 transition-transform"
              >
                <X size={20} strokeWidth={3} />
              </button>

              <div className="flex-1 overflow-y-auto hide-scrollbar">
                {/* --- 1. Header (Image or Theme) --- */}
                {detailItem.__type === 'booking' && detailItem.type === 'flight' ? (
                  <div className={`${getAirlineTheme(detailItem.airline).bgClass} h-40 flex items-center justify-center border-b-[4px] border-p3-navy relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-10 flex flex-wrap gap-4 p-4 pointer-events-none">
                      {Array.from({ length: 20 }).map((_, i) => <Plane key={i} size={40} className="rotate-45" />)}
                    </div>
                    <span className={`text-4xl font-black uppercase tracking-[0.4em] drop-shadow-lg ${getAirlineTheme(detailItem.airline).textClass}`}>
                      {getAirlineTheme(detailItem.airline).logo}
                    </span>
                  </div>
                ) : (
                  <div className="h-64 bg-gray-200 relative border-b-[4px] border-p3-navy shrink-0">
                    <LazyImage
                      src={detailItem.images?.[0] || ''}
                      containerClassName="w-full h-full"
                      alt="hero"
                    />
                    {!detailItem.images?.[0] && (
                      <div className="w-full h-full flex items-center justify-center bg-p3-navy/5">
                        {detailItem.type === 'hotel' ? <Home size={64} className="text-p3-navy/10" /> : <MapPin size={64} className="text-p3-navy/10" />}
                      </div>
                    )}
                  </div>
                )}

                {/* --- 2. Content Area --- */}
                <div className="p-8 space-y-6">
                  {/* Title & Badge */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full border-[2px] border-p3-navy uppercase tracking-widest ${detailItem.__type === 'booking' ? 'bg-splat-yellow text-p3-navy' : 'bg-white text-p3-navy'}`}>
                        {detailItem.category || detailItem.type}
                      </span>
                    </div>
                    <h2 className="text-3xl font-black text-p3-navy italic tracking-tighter leading-none">{detailItem.title}</h2>
                  </div>

                  {/* Flight Special Details */}
                  {detailItem.__type === 'booking' && detailItem.type === 'flight' && (
                    <div className="space-y-4">
                      {detailItem.pnr && (
                        <div className="bg-white border-[0.5px] border-p3-navy rounded-2xl p-5 shadow-glass-deep-sm flex justify-between items-center group active:scale-[0.98] transition-all" onClick={() => { navigator.clipboard.writeText(detailItem.pnr); triggerHaptic('success'); showToast("PNR 已複製！🦑", "success"); }}>
                          <div>
                            <p className="boutique-tag text-gray-400 uppercase tracking-widest mb-1">{t('schedule.pnr')}</p>
                            <p className="text-3xl font-black text-p3-navy tracking-[0.2em]">{detailItem.pnr}</p>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-splat-yellow border-[0.5px] border-p3-navy flex items-center justify-center text-p3-navy group-hover:bg-p3-navy group-hover:text-white transition-colors">
                            <Copy size={20} />
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white border-[2px] border-p3-navy/10 rounded-xl p-3 text-center">
                          <span className="text-[9px] font-black text-gray-400 block uppercase mb-1">{t('schedule.terminal')}</span>
                          <span className="text-xl font-black text-p3-navy">{detailItem.terminal || '--'}</span>
                        </div>
                        <div className="bg-white border-[2px] border-p3-navy/10 rounded-xl p-3 text-center">
                          <span className="text-[9px] font-black text-gray-400 block uppercase mb-1">{t('schedule.gate')}</span>
                          <span className="text-xl font-black text-p3-navy">{detailItem.gate || '--'}</span>
                        </div>
                        <div className="bg-white border-[2px] border-p3-navy/10 rounded-xl p-3 text-center">
                          <span className="text-[9px] font-black text-gray-400 block uppercase mb-1">{t('schedule.boarding')}</span>
                          <span className="text-xl font-black text-splat-pink">{detailItem.boardingTime || '--:--'}</span>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/search?q=Flight+Status+${detailItem.flightNo}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-4 bg-p3-navy text-white rounded-2xl font-black uppercase tracking-widest text-center flex items-center justify-center gap-3 shadow-glass-deep active:translate-y-1 transition-all"
                      >
                        <Plane size={18} /> {t('schedule.liveStatus')}
                      </a>
                    </div>
                  )}

                  {/* Hotel Special Details */}
                  {detailItem.__type === 'booking' && detailItem.type === 'hotel' && (
                    <div className="space-y-8">
                      <div className="glass-card bg-white/20 backdrop-blur-3xl border-[0.5px] border-white/40 p-10 space-y-8 shadow-glass-deep">
                        <div className="flex justify-between border-b-[0.5px] border-p3-navy/5 pb-8">
                          <div>
                            <span className="boutique-tag text-p3-navy/30 block mb-2">{t('schedule.checkIn')}</span>
                            <span className="text-3xl boutique-h1 text-p3-navy">{detailItem.checkInTime || '15:00'}</span>
                          </div>
                          <div className="text-right">
                            <span className="boutique-tag text-p3-navy/30 block mb-2">{t('schedule.checkOut')}</span>
                            <span className="text-3xl boutique-h1 text-p3-navy">{detailItem.checkOutTime || '11:00'}</span>
                          </div>
                        </div>
                        {detailItem.confirmationNo && (
                          <div className="flex justify-between items-center pt-2">
                            <span className="boutique-tag text-p3-navy/30">{t('schedule.roomType')}</span>
                            <span className="boutique-h2 text-p3-navy">{detailItem.roomType || 'Standard Room'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button
                          className="flex-1 py-4 bg-white border-[0.5px] border-p3-navy rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-glass-deep-sm active:translate-y-1 transition-all"
                          onClick={() => window.open(`tel:${detailItem.phone || ''}`)}
                        >
                          <Phone size={16} /> {t('schedule.contact')}
                        </button>
                        <button
                          className="flex-1 py-4 bg-splat-green text-white border-[0.5px] border-p3-navy rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-glass-deep-sm active:translate-y-1 transition-all"
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location || "")}`, '_blank')}
                        >
                          <MapPin size={16} /> {t('schedule.map')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Regular Schedule Details */}
                  {detailItem.__type === 'schedule' && (
                    <div className="space-y-10">
                      <div className="p-10 glass-card bg-white/20 backdrop-blur-3xl border-[0.5px] border-white/40 shadow-glass-deep">
                        <h4 className="boutique-tag text-p3-navy/30 mb-6 flex items-center gap-3">
                          <Sparkles size={16} strokeWidth={2.5} className="text-p3-gold" /> {t('schedule.spotInsight')}
                        </h4>
                        {detailItem.spotGuide ? (
                          <div className="boutique-body text-p3-navy/80 whitespace-pre-wrap">{detailItem.spotGuide.background}</div>
                        ) : spotAiLoading === detailItem.id && completion ? (
                          <div className="boutique-body text-p3-navy/40 whitespace-pre-wrap animate-pulse">{completion}</div>
                        ) : (
                          <button onClick={() => handleFetchSpotGuide(detailItem)} disabled={!!spotAiLoading} className="w-full py-6 border-[0.5px] border-dashed border-p3-navy/20 rounded-[22px] boutique-tag text-p3-navy/40 hover:text-p3-navy hover:bg-white/40 transition-all">
                            {spotAiLoading === detailItem.id ? <Loader2 size={20} className="animate-spin" /> : t('schedule.getSpotGuide')}
                          </button>
                        )}
                      </div>

                      <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location || "")}`, '_blank')} className="w-full py-5 bg-p3-navy text-white rounded-[22px] shadow-glass-deep flex items-center justify-center gap-3 text-lg font-black active:scale-95 transition-all border-[0.5px] border-white/20">
                        <MapPin size={24} strokeWidth={3} /> {t('schedule.openGoogleMaps')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isEditorOpen && <ScheduleEditor tripId={trip!.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}

      {showTransportModal && selectedTransportSuggestion && (
        <TransportAiModal
          suggestion={selectedTransportSuggestion}
          onClose={() => setShowTransportModal(false)}
        />
      )}
    </div>
  );
};
