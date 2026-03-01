import { useState, useMemo, useEffect, useCallback, useRef, FC } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid, isSameDay } from 'date-fns';
import { MapPin, Plus, Edit3, Trash2, Utensils, Plane, Home, Camera, Sparkles, X, Loader2, Wind, Umbrella, Sunrise, ChevronUp, ChevronDown, ChevronRight, Clock, Cloud, CloudRain, Sun, Droplets, AlertTriangle, Wand2, Check, WifiOff, Star, Map as MapIcon, MapPinOff, Copy, Phone, Luggage, ExternalLink } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { BookingEditor } from './BookingEditor';
import { ScheduleItem, Trip, BookingItem } from '../types';
import { WeatherReportModal, TransportAiModal } from './ScheduleModals';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { LazyImage } from './LazyImage';
import { SwipeableItem } from './Common';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTranslation } from '../hooks/useTranslation';
import { triggerHaptic } from '../utils/haptics';
import { ARCompass } from './ui/ARCompass';
// 移除 SpatialMapHeader

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
  peach: { bgClass: 'bg-[#D80073]', textClass: 'text-white', logo: 'Peach' },
  jetstar: { bgClass: 'bg-[#FF6600]', textClass: 'text-white', logo: 'Jetstar' },
  ana: { bgClass: 'bg-[#1F419B]', textClass: 'text-white', logo: 'ANA' },
  jal: { bgClass: 'bg-[#CC0000]', textClass: 'text-white', logo: 'JAL' },
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
      whileTap={{ scale: 0.98 }}
      className="relative ml-14 mb-10 cursor-pointer group"
    >
      <div className="bg-white rounded-[32px] overflow-hidden shadow-xl border-[0.5px] border-black/5 relative">
        {/* Physical Cutouts */}
        <div className="absolute left-0 top-[22%] -translate-x-1/2 w-8 h-8 rounded-full bg-[#F4F5F7] z-20" />
        <div className="absolute right-0 top-[22%] translate-x-1/2 w-8 h-8 rounded-full bg-[#F4F5F7] z-20" />

        {/* Airline Header */}
        <div className={`${theme.bgClass} h-16 flex items-center justify-center relative`}>
          {/* Pattern Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
          <span className={`boutique-tag ${theme.textClass} opacity-90 tracking-[0.3em] z-10 font-black text-xs uppercase`}>{theme.logo}</span>
        </div>

        {/* Flight Status Dot */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white px-6 py-1.5 rounded-full border-[0.5px] border-black/10 shadow-sm z-30">
          <span className="text-[10px] font-black text-p3-navy/40 tracking-widest">{item.flightNo || 'FLIGHT'}</span>
        </div>

        <div className="p-8 pt-12 flex justify-between items-center bg-white">
          <div className="flex flex-col items-center">
            <span className="text-sm font-black text-gray-400 mb-1 uppercase tracking-widest">{item.depCity || 'TAIPEI'}</span>
            <span className="text-4xl font-black text-p3-navy tracking-tighter leading-none">{item.depIata || 'TPE'}</span>
            <span className="text-base font-black text-p3-navy mt-2">{item.depTime || '--:--'}</span>
          </div>

          <div className="flex-1 flex flex-col items-center px-4">
            <div className="w-full flex items-center gap-2 mb-2">
              <div className="h-[1px] flex-1 border-t border-dashed border-gray-300" />
              <Plane size={16} strokeWidth={3} className="text-p3-ruby rotate-45" />
              <div className="h-[1px] flex-1 border-t border-dashed border-gray-300" />
            </div>
            <span className="text-[10px] font-black text-gray-300 italic">{item.duration || '02h 45m'}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-sm font-black text-gray-400 mb-1 uppercase tracking-widest">{item.arrCity || 'OSAKA'}</span>
            <span className="text-4xl font-black text-p3-navy tracking-tighter leading-none">{item.arrIata || 'KIX'}</span>
            <span className="text-base font-black text-p3-navy mt-2">{item.arrTime || '--:--'}</span>
          </div>
        </div>

        {/* Barcode Decoration */}
        <div className="bg-gray-50/50 p-4 border-t border-dashed border-gray-200 flex flex-col items-center">
          <div className="text-4xl font-mono tracking-widest text-black/20 overflow-hidden h-8 select-none">|||| |||| | || ||| || ||| |||| || |||</div>
          <div className="text-[8px] font-mono text-black/10 mt-1"> boarding pass security id: {item.id} </div>
        </div>

        <div className="absolute right-4 top-20 w-10 h-10 rounded-full bg-p3-navy text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-75 group-hover:scale-100 z-30">
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
  const checkIn = item.date;
  const checkOut = item.endDate || item.date;
  const nights = Math.max(1, differenceInDays(parseISO(checkOut), parseISO(checkIn)));

  return (
    <motion.div
      layoutId={`card-${item.id}`}
      onClick={onClick}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative ml-14 mb-10 cursor-pointer group"
    >
      <div className="bg-white rounded-[32px] overflow-hidden shadow-xl border-[0.5px] border-black/5 flex flex-col h-[280px]">
        {/* Top 40%: Full Bleed Image */}
        <div className="h-[40%] relative">
          {item.images?.[0] ? (
            <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="hotel" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-p3-navy to-p3-ruby flex items-center justify-center">
              <Home size={32} className="text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-6 right-6 flex justify-between items-center text-white">
            <h4 className="text-lg font-black truncate drop-shadow-md">{item.title}</h4>
          </div>
        </div>

        {/* Bottom 60%: Grid Content */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Check-In</p>
              <p className="text-sm font-black text-p3-navy">{checkIn}</p>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                <Clock size={10} className="text-p3-ruby" /> {item.checkInTime || '15:00'}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Check-Out</p>
              <p className="text-sm font-black text-p3-navy">{checkOut}</p>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                <Clock size={10} className="text-p3-navy" /> {item.checkOutTime || '11:00'}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="bg-splat-yellow text-p3-navy px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              {nights} {t('booking.nights') || 'Nights'}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 truncate max-w-[120px]">
              <MapPin size={10} className="text-p3-gold" /> {item.location}
            </div>
          </div>
        </div>

        <div className="absolute right-4 bottom-4 w-10 h-10 rounded-full bg-p3-navy text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-75 group-hover:scale-100 z-30">
          <ChevronRight size={20} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
};

// SpatialMapHeader 已提取至獨立組件

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

        <div className="flex-1 bg-white border-[0.5px] border-gray-200 shadow-md rounded-[32px] p-8 hover:shadow-lg transition-all relative overflow-hidden group/card">
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


const InfoBlock = ({ label, value, highlight }: any) => (
  <div className={`bg-white border-[0.5px] ${highlight ? 'border-splat-pink' : 'border-p3-navy/10'} rounded-2xl p-4 flex flex-col justify-center items-center shadow-sm`}>
    <span className="text-[9px] font-black text-gray-400 block uppercase tracking-widest mb-1 text-center">{label}</span>
    <span className={`text-lg font-black ${highlight ? 'text-splat-pink' : 'text-p3-navy'} text-center truncate w-full`}>{value}</span>
  </div>
);

// =========================================================================
// 🚀 請將這整段複製，直接取代 Schedule.tsx 底部的 FlightDetailModalContent 與 HotelDetailModalContent
// =========================================================================

const AirlineHeaderPattern = ({ airline }: { airline: string }) => {
    const al = (airline || '').toLowerCase();
    
    // 1. 長榮 (EVA): 橘綠色尾翼線條
    if (al.includes('eva')) {
        return (
            <div className="absolute right-0 top-0 bottom-0 w-32 overflow-hidden pointer-events-none">
                <div className="absolute -right-4 -top-8 w-24 h-32 bg-[#178045] rounded-full transform -rotate-12"></div>
                <div className="absolute right-8 -top-4 w-12 h-24 bg-[#F58220] rounded-full transform -rotate-45"></div>
            </div>
        );
    }
    // 2. 星宇 (STARLUX): 北極星芒圖騰
    if (al.includes('starlux')) {
        return (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#C4A97A"><path d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z"/></svg>
            </div>
        );
    }
    // 3. 華航 (CHINA AIRLINES): 紅粉梅花圖騰
    if (al.includes('china')) {
        return (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-90">
                <div className="relative w-8 h-8">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[#E88CA4] rounded-full"></div>
                    <div className="absolute top-1.5 right-0.5 w-3.5 h-3.5 bg-[#E88CA4] rounded-full"></div>
                    <div className="absolute bottom-0.5 right-1 w-3.5 h-3.5 bg-[#E88CA4] rounded-full"></div>
                    <div className="absolute bottom-0.5 left-1 w-3.5 h-3.5 bg-[#E88CA4] rounded-full"></div>
                    <div className="absolute top-1.5 left-0.5 w-3.5 h-3.5 bg-[#E88CA4] rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#D13C66] rounded-full z-10"></div>
                </div>
            </div>
        );
    }
    // 4. 台灣虎航 (TIGERAIR): 虎紋斜線
    if (al.includes('tiger')) {
        return (
            <div className="absolute right-0 top-0 bottom-0 w-32 overflow-hidden pointer-events-none opacity-15">
                <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,#000_6px,#000_12px)]"></div>
            </div>
        );
    }
    // 5. 樂桃 (PEACH): 紫粉色系柔和圓形交疊
    if (al.includes('peach')) {
        return (
            <div className="absolute right-0 top-0 bottom-0 w-32 overflow-hidden pointer-events-none">
                <div className="absolute -right-6 top-0 bottom-0 w-24 bg-[#B5005A] rounded-l-full opacity-40 blur-[2px]"></div>
                <div className="absolute right-4 bottom-[-10px] w-16 h-16 bg-[#FFBEE0] rounded-full opacity-30 blur-[2px]"></div>
            </div>
        );
    }
    // 6. 捷星 (JETSTAR): 黑色五角星
    if (al.includes('jetstar')) {
        return (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#000000" className="opacity-80"><path d="M12 0L15.09 8.26L24 9.54L17.54 15.82L19.08 24L12 20.26L4.92 24L6.46 15.82L0 9.54L8.91 8.26L12 0Z"/></svg>
            </div>
        );
    }
    // 7. ANA: 經典雙色漸層斜線
    if (al.includes('ana')) {
        return (
            <div className="absolute right-0 top-0 bottom-0 w-48 overflow-hidden pointer-events-none">
                <div className="absolute right-8 top-0 bottom-0 w-8 bg-[#00A0E9] transform skew-x-[-30deg]"></div>
                <div className="absolute right-[-10px] top-0 bottom-0 w-12 bg-[#00A0E9] transform skew-x-[-30deg]"></div>
            </div>
        );
    }
    // 8. JAL: 紅鶴鶴丸幾何意象
    if (al.includes('jal')) {
        return (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-8 h-8 rounded-full border-4 border-white opacity-80 relative overflow-hidden">
                     <div className="w-full h-[40%] bg-white absolute top-0"></div>
                     <div className="w-2 h-full bg-white absolute left-1/2 -translate-x-1/2"></div>
                </div>
            </div>
        );
    }
    
    // 預設其他航空
    return <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>;
};

const FlightDetailModalContent = ({ item, t, showToast }: any) => {
    const [expanded, setExpanded] = useState(false);
    const theme = getAirlineTheme(item.airline);

    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#F4F5F7]">
            <div className="p-6 pt-20 space-y-6 pb-32">
                {/* 🎟️ 實體登機證主體 */}
                <motion.div layout onClick={() => { setExpanded(!expanded); triggerHaptic('light'); }} className="bg-white rounded-[24px] shadow-glass-deep overflow-hidden cursor-pointer active:scale-[0.98] transition-transform relative">
                    
                    {/* 頂部：航空識別色、Logo 與專屬尾翼圖騰 (移除飛機小圖示) */}
                    <div className={`${theme.bgClass} px-6 py-4 flex justify-between items-center relative overflow-hidden`}>
                        <div className="relative z-10 flex items-center">
                            <span className={`text-base font-black ${theme.textClass} tracking-widest uppercase`}>{theme.logo}</span>
                        </div>
                        {/* 這裡把日期靠左推一點，避免被右側尾翼圖形蓋住 */}
                        <span className={`text-[11px] font-bold ${theme.textClass} opacity-90 uppercase tracking-widest relative z-10 mr-12`}>
                            {item.date}
                        </span>
                        {/* ✨ 航空公司專屬視覺圖騰 ✨ */}
                        <AirlineHeaderPattern airline={item.airline} />
                    </div>

                    {/* 中段：起降機場與時間 */}
                    <div className="px-6 py-8 relative bg-white">
                        <div className="flex justify-between items-end mb-3">
                            <div className="text-left w-1/3">
                                <span className="text-5xl font-black text-p3-navy leading-none tracking-tighter">{item.depIata || 'TPE'}</span>
                            </div>
                            <div className="flex-1 flex flex-col items-center px-2 pb-2">
                                <span className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">{item.flightNo || 'FLIGHT'}</span>
                                <div className="w-full relative flex items-center">
                                    <div className="w-2 h-2 rounded-full border-2 border-gray-300 bg-white z-10 shrink-0"></div>
                                    <div className="flex-1 border-t-2 border-gray-200"></div>
                                    <Plane size={16} className="text-p3-navy mx-2 shrink-0" />
                                    <div className="flex-1 border-t-2 border-gray-200"></div>
                                    <div className="w-2 h-2 rounded-full border-2 border-p3-navy bg-p3-navy z-10 shrink-0"></div>
                                </div>
                            </div>
                            <div className="text-right w-1/3">
                                <span className="text-5xl font-black text-p3-navy leading-none tracking-tighter">{item.arrIata || 'KIX'}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-black text-p3-navy tracking-widest">{item.depTime || '--:--'}</span>
                            <span className="text-sm font-black text-p3-navy tracking-widest">{item.arrTime || '--:--'}</span>
                        </div>
                    </div>

                    {/* 撕罩線與半圓打洞 (擬真細節) */}
                    <div className="relative flex items-center justify-center bg-white h-4">
                        <div className="absolute left-[-12px] w-6 h-6 bg-[#F4F5F7] rounded-full z-10 shadow-inner"></div>
                        <div className="w-full border-t-2 border-dashed border-gray-200 mx-6"></div>
                        <div className="absolute right-[-12px] w-6 h-6 bg-[#F4F5F7] rounded-full z-10 shadow-inner"></div>
                    </div>

                    {/* 底部：展開提示與條碼裝飾 */}
                    <div className="bg-white px-6 py-4 flex flex-col justify-center items-center gap-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            {expanded ? 'Hide Details' : 'Tap to Expand Details'}
                            <ChevronDown size={14} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                        </span>
                        {!expanded && <div className="w-2/3 h-8 opacity-20 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_5px,black_5px,black_6px,transparent_6px,transparent_10px)]" />}
                    </div>
                </motion.div>

                {/* ⬇️ 隱藏的詳細資訊 (航廈/登機門/座位) 展開後才顯示 */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} className="space-y-4 overflow-hidden pt-2">
                            {item.pnr && (
                                <div className="bg-white border-[0.5px] border-p3-navy rounded-[24px] p-6 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform cursor-pointer" onClick={() => { navigator.clipboard.writeText(item.pnr); triggerHaptic('success'); showToast("PNR 已複製！🦑", "success"); }}>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('schedule.pnr') || 'Booking Ref (PNR)'}</p>
                                        <p className="text-3xl font-black text-p3-navy tracking-[0.2em]">{item.pnr}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-splat-yellow/20 border-[0.5px] border-splat-yellow flex items-center justify-center text-splat-yellow"><Copy size={20} /></div>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-3">
                                <InfoBlock label={t('schedule.terminal') || 'Terminal'} value={item.terminal || '--'} />
                                <InfoBlock label={t('schedule.gate') || 'Gate'} value={item.gate || '--'} />
                                <InfoBlock label={t('schedule.boarding') || 'Boarding'} value={item.boardingTime || '--:--'} highlight />
                                <InfoBlock label="Seat" value={item.seat || '--'} />
                                <InfoBlock label="Baggage" value={item.baggageAllowance || '--'} />
                                <InfoBlock label="Duration" value={item.duration || '--'} />
                            </div>
                            {item.url && (
                                <button onClick={() => { window.open(item.url, '_blank'); triggerHaptic('success'); }} className="w-full py-5 bg-p3-navy text-white rounded-2xl font-black uppercase tracking-widest shadow-glass-deep flex items-center justify-center gap-3 active:scale-95 transition-all mt-4 border-[0.5px] border-white/20">
                                    <ExternalLink size={18} /> {item.url.includes('evaair') ? '打開長榮航空' : item.url.includes('starlux') ? '打開星宇航空' : item.url.includes('tigerair') ? '打開台灣虎航' : item.url.includes('china-airlines') ? '打開中華航空' : '開啟外部連結 / App'}
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const HotelDetailModalContent = ({ item, t, showToast }: any) => {
    const [expanded, setExpanded] = useState(false);
    
    // 計算住宿天數
    const checkInDate = item.date;
    const checkOutDate = item.endDate || item.date;
    const nights = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));

    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#F4F5F7]">
            <div className="p-6 pt-20 space-y-6 pb-32">
                {/* 🏨 實體飯店卡片主體 */}
                <motion.div layout onClick={() => { setExpanded(!expanded); triggerHaptic('light'); }} className="bg-white rounded-[24px] shadow-glass-deep border-[0.5px] border-black/5 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform">
                    <div className="h-48 relative">
                        {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" alt="hotel" /> : <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400"><Home size={48} /></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-5 left-6 right-6 flex justify-between items-end gap-4">
                            <h4 className="text-2xl font-black text-white tracking-tighter leading-tight max-w-[70%] line-clamp-2">{item.title}</h4>
                            <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30 shrink-0">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{nights} Nights</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 bg-white space-y-4">
                        {/* 橫向單排時間軸 (解決原本 2 排太醜的問題) */}
                        <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 border-[0.5px] border-gray-200">
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-in</span>
                                <span className="text-xl font-black text-p3-navy leading-none">{item.checkInTime || '15:00'}</span>
                                <span className="text-[9px] font-bold text-gray-400 mt-1">{item.date}</span>
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center px-4">
                                <div className="w-full relative flex items-center justify-center h-2">
                                    <div className="w-full border-t-2 border-dashed border-gray-300"></div>
                                    <ChevronRight size={14} className="absolute text-gray-400 bg-gray-50 px-0.5" />
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-out</span>
                                <span className="text-xl font-black text-p3-navy leading-none">{item.checkOutTime || '11:00'}</span>
                                <span className="text-[9px] font-bold text-gray-400 mt-1">{item.endDate || item.date}</span>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <ChevronDown size={18} className={`text-gray-300 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                </motion.div>

                {/* ⬇️ 隱藏的詳細資訊 (展開後才顯示) */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} className="space-y-4 overflow-hidden pt-2">
                            {item.confirmationNo && (
                                <div className="bg-white border-[0.5px] border-p3-navy rounded-[24px] p-6 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform cursor-pointer" onClick={() => { navigator.clipboard.writeText(item.confirmationNo); triggerHaptic('success'); showToast("Booking Ref 已複製！", "success"); }}>
                                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Confirmation No.</p><p className="text-2xl font-black text-p3-navy tracking-[0.1em]">{item.confirmationNo}</p></div>
                                    <div className="w-12 h-12 rounded-xl bg-p3-navy/10 border-[0.5px] border-p3-navy/20 flex items-center justify-center text-p3-navy"><Copy size={20} /></div>
                                </div>
                            )}
                            <div className="bg-white border-[0.5px] border-p3-navy rounded-[24px] p-6 shadow-sm space-y-4">
                                <div className="flex items-start gap-4"><MapPin size={20} className="text-p3-gold shrink-0 mt-0.5" /><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Address</p><p className="text-sm font-bold text-p3-navy">{item.location || 'See map for details'}</p></div></div>
                                <div className="flex items-start gap-4 border-t border-gray-100 pt-4"><Home size={20} className="text-p3-navy shrink-0 mt-0.5" /><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Room Type</p><p className="text-sm font-bold text-p3-navy">{item.roomType || 'Standard Room'}</p></div></div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button className="flex-1 py-4 bg-white border-[0.5px] border-p3-navy rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-glass-deep-sm active:translate-y-1 transition-all text-p3-navy" onClick={() => window.open(`tel:${item.contactPhone || item.phone || ''}`)}><Phone size={16} /> Contact</button>
                                <button className="flex-[2] py-4 bg-p3-navy text-white border-[0.5px] border-p3-navy rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-glass-deep-sm active:translate-y-1 transition-all" onClick={() => window.open(`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(item.location || item.title)}`, '_blank')}><MapPin size={16} /> Open Maps</button>
                            </div>
                            {item.url && (
                                <button onClick={() => { window.open(item.url, '_blank'); triggerHaptic('success'); }} className="w-full py-5 bg-gradient-to-r from-p3-gold to-splat-orange text-white rounded-2xl font-black uppercase tracking-widest shadow-glass-deep flex items-center justify-center gap-3 active:scale-95 transition-all mt-2 border-[0.5px] border-white/20">
                                    <ExternalLink size={18} /> {item.url.includes('agoda') ? '打開 Agoda 查看' : item.url.includes('booking') ? '打開 Booking.com 查看' : item.url.includes('airbnb') ? '打開 Airbnb 查看' : '開啟外部連結 / App'}
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const HotelDetailModalContent = ({ item, t, showToast }: any) => {
  const [expanded, setExpanded] = useState(false);

  // 計算住宿天數
  const checkInDate = item.date;
  const checkOutDate = item.endDate || item.date;
  const nights = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#F4F5F7]">
      <div className="p-6 pt-20 space-y-6 pb-32">
        {/* 🏨 實體飯店卡片主體 */}
        <motion.div layout onClick={() => { setExpanded(!expanded); triggerHaptic('light'); }} className="bg-white rounded-[24px] shadow-glass-deep border-[0.5px] border-black/5 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform">
          <div className="h-48 relative">
            {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" alt="hotel" /> : <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400"><Home size={48} /></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-5 left-6 right-6 flex justify-between items-end gap-4">
              <h4 className="text-2xl font-black text-white tracking-tighter leading-tight max-w-[70%] line-clamp-2">{item.title}</h4>
              <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30 shrink-0">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">{nights} Nights</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white space-y-4">
            {/* 橫向單排時間軸 (解決原本 2 排太醜的問題) */}
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 border-[0.5px] border-gray-200">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-in</span>
                <span className="text-xl font-black text-p3-navy leading-none">{item.checkInTime || '15:00'}</span>
                <span className="text-[9px] font-bold text-gray-400 mt-1">{item.date}</span>
              </div>

              <div className="flex-1 flex flex-col items-center px-4">
                <div className="w-full relative flex items-center justify-center h-2">
                  <div className="w-full border-t-2 border-dashed border-gray-300"></div>
                  <ChevronRight size={14} className="absolute text-gray-400 bg-gray-50 px-0.5" />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-out</span>
                <span className="text-xl font-black text-p3-navy leading-none">{item.checkOutTime || '11:00'}</span>
                <span className="text-[9px] font-bold text-gray-400 mt-1">{item.endDate || item.date}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <ChevronDown size={18} className={`text-gray-300 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </motion.div>

        {/* ⬇️ 隱藏的詳細資訊 (展開後才顯示) */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} className="space-y-4 overflow-hidden pt-2">
              {item.confirmationNo && (
                <div className="bg-white border-[0.5px] border-p3-navy rounded-[24px] p-6 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform cursor-pointer" onClick={() => { navigator.clipboard.writeText(item.confirmationNo); triggerHaptic('success'); showToast("Booking Ref 已複製！", "success"); }}>
                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Confirmation No.</p><p className="text-2xl font-black text-p3-navy tracking-[0.1em]">{item.confirmationNo}</p></div>
                  <div className="w-12 h-12 rounded-xl bg-p3-navy/10 border-[0.5px] border-p3-navy/20 flex items-center justify-center text-p3-navy"><Copy size={20} /></div>
                </div>
              )}
              <div className="bg-white border-[0.5px] border-p3-navy rounded-[24px] p-6 shadow-sm space-y-4">
                <div className="flex items-start gap-4"><MapPin size={20} className="text-p3-gold shrink-0 mt-0.5" /><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Address</p><p className="text-sm font-bold text-p3-navy">{item.location || 'See map for details'}</p></div></div>
                <div className="flex items-start gap-4 border-t border-gray-100 pt-4"><Home size={20} className="text-p3-navy shrink-0 mt-0.5" /><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Room Type</p><p className="text-sm font-bold text-p3-navy">{item.roomType || 'Standard Room'}</p></div></div>
              </div>
              <div className="flex gap-3 mt-4">
                <button className="flex-1 py-4 bg-white border-[0.5px] border-p3-navy rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-glass-deep-sm active:translate-y-1 transition-all text-p3-navy" onClick={() => window.open(`tel:${item.contactPhone || item.phone || ''}`)}><Phone size={16} /> Contact</button>
                <button className="flex-[2] py-4 bg-p3-navy text-white border-[0.5px] border-p3-navy rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-glass-deep-sm active:translate-y-1 transition-all" onClick={() => window.open(`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(item.location || item.title)}`, '_blank')}><MapPin size={16} /> Open Maps</button>
              </div>
              {item.url && (
                <button onClick={() => { window.open(item.url, '_blank'); triggerHaptic('success'); }} className="w-full py-5 bg-gradient-to-r from-p3-gold to-splat-orange text-white rounded-2xl font-black uppercase tracking-widest shadow-glass-deep flex items-center justify-center gap-3 active:scale-95 transition-all mt-2 border-[0.5px] border-white/20">
                  <ExternalLink size={18} /> {item.url.includes('agoda') ? '打開 Agoda 查看' : item.url.includes('booking') ? '打開 Booking.com 查看' : item.url.includes('airbnb') ? '打開 Airbnb 查看' : '開啟外部連結 / App'}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
  const [isBookingEditorOpen, setIsBookingEditorOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>();
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any | undefined>();

  const [showFullWeather, setShowFullWeather] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

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

  const { actionBookings, activeHotel, activeFlight } = useMemo(() => {
    const bookings = dayItems.filter(i => i.__type === 'booking');

    // B: 靈動膠囊 (只在 Check-in, Check-out, Flight 當天顯示)
    const actions = bookings.filter(b => {
      if (b.type === 'flight' && (b as any).date === selectedDateStr) return true;
      if (b.type === 'hotel' && ((b as any).date === selectedDateStr || (b as any).endDate === selectedDateStr)) return true;
      return false;
    });

    // A: 常駐狀態 (當天有涵蓋在飯店住宿期間內)
    const hotel = bookings.find(b => {
      const bDate = (b as any).date;
      const bEndDate = (b as any).endDate;
      return b.type === 'hotel' && bDate <= selectedDateStr && (!bEndDate || bEndDate >= selectedDateStr);
    });

    // C: 當日航班
    const flight = bookings.find(b => b.type === 'flight' && (b as any).date === selectedDateStr);

    return { actionBookings: actions, activeHotel: hotel, activeFlight: flight };
  }, [dayItems, selectedDateStr]);

  // 🚀 IntersectionObserver 用於空間地圖隨動
  const setActiveDayItem = useTripStore(s => s.setActiveDayItem);
  const activeDayItem = useTripStore(s => s.activeDayItem);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 取最多交疊的項目
        const best = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (best) {
          const id = best.target.getAttribute('data-id');
          const item = dayItems.find(i => i.id === id);
          if (item) setActiveDayItem(item);
        }
      },
      {
        root: container,           // 以內部滾動容器為覸發區
        threshold: [0.3, 0.5, 0.8], // 多個閾値提高敏感度
        rootMargin: '0px'
      }
    );

    // 用 setTimeout 確保 DOM 已渲染
    const timer = setTimeout(() => {
      const elements = container.querySelectorAll('.timeline-item');
      elements.forEach(el => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [dayItems, setActiveDayItem]);

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

  // 🗳 智慧地點推算：若 activeDayItem 無經緯度，從 CITY_DB 關鍵字匹配
  const computedActiveItem = useMemo(() => {
    if (activeDayItem?.lat && activeDayItem?.lng) return activeDayItem;
    const searchText = activeDayItem ? `${activeDayItem.title || ''} ${(activeDayItem as any).location || ''}` : '';
    const foundCity = (searchText.trim()
      ? CITY_DB.find(c => c.keys.some(k => searchText.includes(k)))
      : null) || timeline[0]?.city;
    return {
      ...activeDayItem,
      lat: (foundCity as any)?.lat || trip?.lat || 34.6937,
      lng: (foundCity as any)?.lng || trip?.lng || 135.5023,
      title: activeDayItem?.title || (foundCity as any)?.name || trip?.dest || 'City'
    };
  }, [activeDayItem, timeline, trip]);

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

    // 🧹 Firebase 資料淨化：移除 undefined、修正日期格式
    const sanitizeForFirebase = (obj: any, targetDate: string): any => {
      const cleanStr = JSON.stringify(obj, (_, v) => (v === undefined ? null : v));
      const clean = JSON.parse(cleanStr);
      // 修正 2026/04/29 → 2026-04-29
      if (clean.date && typeof clean.date === 'string') {
        clean.date = clean.date.replace(/\//g, '-');
      }
      // 若日期無效或缺少，補上目標日期
      if (!clean.date || !/^\d{4}-\d{2}-\d{2}/.test(clean.date)) {
        clean.date = targetDate;
      }
      return clean;
    };

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
          data.schedule.forEach((i: any) => addScheduleItem(trip!.id, sanitizeForFirebase({
            ...i,
            id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            date: i.date || selectedDateStr,
            images: i.images || []
          }, selectedDateStr)));
        }
        if (Array.isArray(data.booking)) {
          data.booking.forEach((i: any) => addBookingItem(trip!.id, sanitizeForFirebase({
            ...i,
            id: `ai-bk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            date: i.date || selectedDateStr,
            images: i.images || []
          }, selectedDateStr)));
        }
        if (Array.isArray(data.journal)) {
          data.journal.forEach((i: any) => addJournalItem(trip!.id, sanitizeForFirebase({
            ...i,
            id: `ai-jr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            date: i.date || selectedDateStr,
            images: i.images || []
          }, selectedDateStr)));
        }
        if (Array.isArray(data.shopping)) {
          data.shopping.forEach((i: any) => addShoppingItem(trip!.id, sanitizeForFirebase({
            ...i,
            id: `ai-sh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            price: 0,
            currency: trip!.baseCurrency,
            isBought: false,
            images: [],
            category: i.category || '未分類'
          }, selectedDateStr)));
        }
        if (Array.isArray(data.info)) {
          data.info.forEach((i: any) => addInfoItem(trip!.id, sanitizeForFirebase({
            ...i,
            id: `ai-if-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            images: []
          }, selectedDateStr)));
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

      {/* ═ 固定頭部：天氣 + 地圖 + 操作按鈕 ═ */}

      {/* 🚀 置頂固定控制台 (大天氣卡片 + 操作按鈕) */}
      <div className="sticky top-0 z-50 bg-[#F4F5F7]/95 backdrop-blur-2xl pt-2 pb-4 -mx-6 px-6 shadow-sm border-b border-gray-200/50 space-y-4">

        {/* 🌤️ 強化擴大的天氣模板 */}
        <div onClick={() => setShowFullWeather(true)} className="w-full bg-gradient-to-br from-white to-blue-50/60 border-[0.5px] border-blue-200/50 shadow-glass-soft rounded-[32px] p-5 cursor-pointer active:scale-95 transition-all flex justify-between items-center relative overflow-hidden group">
          {/* 背景裝飾浮水印 */}
          <div className="absolute -right-4 -top-6 text-8xl opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none">
            {weatherInfo.e}
          </div>

          <div className="flex items-center gap-5 relative z-10">
            {/* 大尺寸天氣 Emoji 區塊 */}
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border-[0.5px] border-blue-100 flex items-center justify-center text-4xl shrink-0">
              {weatherInfo.e}
            </div>

            {/* 核心溫度與城市資訊 */}
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-black text-blue-400 tracking-widest uppercase mb-1">
                {todayWeather.cityName}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-p3-navy leading-none tracking-tighter">
                  {currentTempStr}°
                </span>
                <div className="flex flex-col text-[10px] font-bold pb-1 border-l border-blue-200/50 pl-2">
                  <span className="text-p3-ruby">H: {todayWeather.max}°</span>
                  <span className="text-p3-navy">L: {todayWeather.min}°</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右側附加氣象資訊 (降雨 & 風速) */}
          <div className="flex flex-col items-end gap-2 relative z-10 shrink-0">
            <div className="bg-white px-3 py-1.5 rounded-full border-[0.5px] border-blue-100 shadow-sm flex items-center gap-1.5">
              <CloudRain size={12} className="text-splat-blue" strokeWidth={3} />
              <span className="text-[11px] font-black text-splat-blue">{todayWeather.rain}%</span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-full border-[0.5px] border-gray-200 shadow-sm flex items-center gap-1.5">
              <Wind size={12} className="text-gray-400" strokeWidth={3} />
              <span className="text-[11px] font-black text-gray-500">{todayWeather.wind}</span>
            </div>
          </div>
        </div>

        {/* 🛠️ 操作按鈕列 (左側常駐圖示，右側功能按鈕) */}
        <div className="flex items-center justify-between px-2">

          {/* 左側：當日狀態 (移除景點數量文字，改為純圖示) */}
          <div className="flex items-center gap-2">
            {activeFlight && (
              <button
                onClick={() => setDetailItem(activeFlight)}
                className="w-9 h-9 rounded-full bg-white border-[0.5px] border-blue-200 flex items-center justify-center shadow-sm active:scale-95 transition-all text-p3-navy"
              >
                <Plane size={16} strokeWidth={2.5} />
              </button>
            )}
            {activeHotel && (
              <button
                onClick={() => setDetailItem(activeHotel)}
                className="w-9 h-9 rounded-full bg-white border-[0.5px] border-blue-200 flex items-center justify-center shadow-sm active:scale-95 transition-all text-p3-ruby"
              >
                <Home size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* 右側：地圖 / 編輯 / 新增 */}
          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 500, damping: 20 } }} onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className={`w-10 h-10 rounded-2xl flex items-center justify-center border-[1px] border-p3-navy/10 ${viewMode === 'map' ? 'bg-splat-blue text-white' : 'bg-white text-p3-navy shadow-xl shadow-black/5'}`}>
              {viewMode === 'list' ? <MapIcon size={18} /> : <Camera size={18} />}
            </motion.button>
            <motion.button whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 500, damping: 20 } }} onClick={() => setIsEditMode(!isEditMode)} className={`w-10 h-10 rounded-2xl flex items-center justify-center border-[1px] border-p3-navy/10 ${isEditMode ? 'bg-splat-yellow text-p3-navy' : 'bg-white text-gray-400 shadow-xl shadow-black/5'}`}>
              <Edit3 size={18} />
            </motion.button>

            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddMenu(!showAddMenu)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 ${showAddMenu ? 'bg-p3-ruby text-white rotate-[135deg]' : 'bg-p3-navy text-white shadow-p3-navy/20'}`}
              >
                <Plus size={18} strokeWidth={2.5} />
              </motion.button>

              <AnimatePresence>
                {showAddMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    className="absolute top-14 right-0 w-48 bg-white/90 backdrop-blur-md border-[0.5px] border-p3-navy rounded-[24px] shadow-glass-deep p-2 z-[60] flex flex-col gap-1"
                  >
                    <button onClick={() => { setEditingItem(undefined); setIsEditorOpen(true); setShowAddMenu(false); }} className="flex items-center gap-3 p-3 hover:bg-p3-navy/5 rounded-xl transition-colors text-left text-sm font-black text-p3-navy">
                      <div className="w-8 h-8 rounded-lg bg-p3-gold/10 flex items-center justify-center text-p3-gold shrink-0"><MapPin size={16} strokeWidth={3} /></div>📍 新增行程景點
                    </button>
                    <button onClick={() => { showToast("BookingEditor 下一階段對接... ✈️", "info"); setShowAddMenu(false); }} className="flex items-center gap-3 p-3 hover:bg-p3-navy/5 rounded-xl transition-colors text-left text-sm font-black text-p3-navy">
                      <div className="w-8 h-8 rounded-lg bg-p3-navy/10 flex items-center justify-center text-p3-navy shrink-0"><Plane size={16} strokeWidth={3} /></div>✈️ 新增航班/飯店
                    </button>
                    <button onClick={() => { showToast("PackingListModal 開發中... 🧳", "info"); setShowAddMenu(false); }} className="flex items-center gap-3 p-3 hover:bg-p3-navy/5 rounded-xl transition-colors text-left text-sm font-black text-p3-navy">
                      <div className="w-8 h-8 rounded-lg bg-p3-ruby/10 flex items-center justify-center text-p3-ruby shrink-0"><Luggage size={16} strokeWidth={3} /></div>🧳 行李清單
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ═ 可滾動內容區塊 ═ */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto hide-scrollbar px-4 pt-4 space-y-4 pb-32">


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
          <div className="relative mt-2">
            {/* 💡 方案 B：靈動膠囊 (Action Capsules) */}
            {actionBookings.length > 0 && (
              <div className="mb-6 space-y-3 px-1">
                {actionBookings.map((booking: any) => (
                  <motion.div
                    key={`capsule-${booking.id}`}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDetailItem(booking)}
                    className="w-full bg-white border-[0.5px] border-black/10 rounded-2xl p-4 shadow-glass-soft flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ${booking.type === 'flight' ? 'bg-p3-navy' : 'bg-p3-ruby'}`}>
                        {booking.type === 'flight' ? <Plane size={18} /> : <Home size={18} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-p3-navy leading-tight mb-0.5">{booking.title}</h4>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {booking.type === 'flight'
                            ? `${booking.depTime || '--:--'} 起飛 🛫`
                            : (booking.date === selectedDateStr ? `${booking.checkInTime || '15:00'} Check-in 📥` : `${booking.checkOutTime || '11:00'} Check-out 📤`)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </motion.div>
                ))}
              </div>
            )}

            {/* 📍 行程時間軸 */}
            <div className="relative">
              <AnimatePresence mode="popLayout">
                {(() => {
                  const daySchedules = dayItems.filter((i: any) => i.__type === 'schedule');
                  if (daySchedules.length === 0 && actionBookings.length === 0) {
                    return (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white border-[1px] border-dashed border-gray-300 rounded-[40px] text-gray-400 font-black italic">{t('schedule.noPlans')}</motion.div>
                    );
                  }
                  return daySchedules.map((item: any, idx: number) => (
                    <div key={item.id} data-id={item.id} className="timeline-item">
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
                          setDetailItem={(it: any) => {
                            const element = document.querySelector(`[data-id="${it.id}"]`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                            setDetailItem(it);
                          }}
                          timeToMins={timeToMins}
                        />
                      </SwipeableItem>
                    </div>
                  ));
                })()}
              </AnimatePresence>
            </div>
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

        {showFullWeather && <WeatherReportModal onClose={() => setShowFullWeather(false)} todayHourly={todayHourly} getWeatherDesc={(code) => getWeatherDesc(code, t)} />}
      </div>

      {/* --- 🚀 Command Center (Detail View with Shared Element Transition) --- */}
      <AnimatePresence>
        {detailItem && (
          <div
            className="fixed inset-0 bg-p3-navy/60 backdrop-blur-xl z-[600] flex items-center justify-center p-0 sm:p-4"
            onClick={() => setDetailItem(undefined)}
          >
            <motion.div
              layoutId={`card-${detailItem.id}`}
              className="bg-[#F4F5F7] w-[92%] max-h-[85vh] sm:max-w-md rounded-[40px] border-[4px] border-p3-navy shadow-2xl flex flex-col overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >

              <div className="absolute top-6 right-6 z-[700] flex gap-2">
                <button
                  onClick={() => {
                    if (detailItem.__type === 'schedule') {
                      setEditingItem(detailItem);
                      setIsEditorOpen(true);
                    } else {
                      setEditingBooking(detailItem);
                      setIsBookingEditorOpen(true);
                    }
                    setDetailItem(undefined);
                    triggerHaptic('light');
                  }}
                  className="bg-white/80 backdrop-blur-sm border-[0.5px] border-p3-navy p-2 rounded-full shadow-glass-deep-sm active:scale-90 transition-transform"
                >
                  <Edit3 size={20} strokeWidth={3} />
                </button>
                <button
                  onClick={() => {
                    if (detailItem.__type === 'schedule') {
                      deleteScheduleItem(trip!.id, detailItem.id);
                    } else {
                      deleteBookingItem(trip!.id, detailItem.id);
                    }
                    setDetailItem(undefined);
                    showToast(detailItem.__type === 'schedule' ? "行程已刪除" : "預訂已刪除", "success");
                    triggerHaptic('medium');
                  }}
                  className="bg-white/80 backdrop-blur-sm border-[0.5px] border-p3-navy p-2 rounded-full shadow-glass-deep-sm active:scale-90 transition-transform text-p3-ruby"
                >
                  <Trash2 size={20} strokeWidth={3} />
                </button>
                <button
                  onClick={() => setDetailItem(undefined)}
                  className="bg-white/80 backdrop-blur-sm border-[0.5px] border-p3-navy p-2 rounded-full shadow-glass-deep-sm active:scale-90 transition-transform"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              {detailItem.__type === 'booking' && detailItem.type === 'flight' ? (
                <FlightDetailModalContent item={detailItem} t={t} showToast={showToast} />
              ) : detailItem.__type === 'booking' && detailItem.type === 'hotel' ? (
                <HotelDetailModalContent item={detailItem} t={t} showToast={showToast} />
              ) : (
                <div className="flex-1 overflow-y-auto hide-scrollbar">
                  {/* --- 1. Header (Image) --- */}
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
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isEditorOpen && <ScheduleEditor tripId={trip!.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
      {isBookingEditorOpen && editingBooking && (
        <BookingEditor
          tripId={trip!.id}
          type={editingBooking.type}
          item={editingBooking}
          onClose={() => setIsBookingEditorOpen(false)}
        />
      )}

      {showTransportModal && selectedTransportSuggestion && (
        <TransportAiModal
          suggestion={selectedTransportSuggestion}
          onClose={() => setShowTransportModal(false)}
        />
      )}
    </div>
  );
};
