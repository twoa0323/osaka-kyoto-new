import { useState, useMemo, useEffect, useCallback, useRef, FC } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTripStore } from '../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { format, addDays, parseISO, differenceInDays, isValid } from 'date-fns';
import {
  Plus, Map as MapIcon, Edit3, Trash2, X, Clock, MapPin, Camera,
  Utensils, Plane, Home, ChevronRight, ChevronDown, Copy,
  ExternalLink, Phone, Sparkles, Loader2, Luggage, Wind, CloudRain,
  Check, Star
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ScheduleItem, BookingItem, Trip } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { ScheduleEditor } from './ScheduleEditor';
import { BookingEditor } from './BookingEditor';
import { LazyImage } from './LazyImage';
import { WeatherReportModal, TransportAiModal } from './ScheduleModals';
import { Map, MapMarker, MarkerContent, MapPopup, MapControls, MapRoute, Map3DBuildings } from './ui/map';
import { ICON_MAP, CATEGORY_STYLE, CITY_DB, getAirlineTheme } from './schedule/ScheduleConstants';
import {
  TimelineFlightCard,
  TimelineHotelCard,
  InfoBlock,
  AirlineHeaderPattern,
  FlightDetailModalContent,
  HotelDetailModalContent
} from './schedule/ScheduleDetails';
import { ARCompass } from './ui/ARCompass';
// 移除 SpatialMapHeader

// 移除受限制的前端 API Key 引進
// const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-3-flash-preview"; // Fix 14: 確保使用正確模型版本
// constants moved to ScheduleConstants.tsx

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

// CITY_DB moved to ScheduleConstants.tsx

import * as MapLibreGL from 'maplibre-gl';


// --- 🔹 極簡空間 Timeline 組件 ---

// Timeline components moved to ScheduleDetails.tsx

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
  const mapRef = useRef<MapLibreGL.Map | null>(null);
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
      const bounds = new MapLibreGL.LngLatBounds();
      points.forEach(p => bounds.extend(p));
      mapRef.current.fitBounds(bounds as any, { padding: 80, duration: 0, maxZoom: 16 });
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


// Detail view components moved to ScheduleDetails.tsx

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

  const { actionBookings, activeHotel, activeFlights } = useMemo(() => {
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

    // C: 當日航班 Array
    const flights = bookings.filter(b => b.type === 'flight' && (b as any).date === selectedDateStr);

    return { actionBookings: actions, activeHotel: hotel, activeFlights: flights };
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

          {/* 🚀 Weather FX (Restrained to Widget Bounds) */}
          {uiSettings.enableWeatherFX && (todayWeather.rain > 30 || weatherInfo.e.includes('🌧️') || weatherInfo.e.includes('☔️')) && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.div key={i} initial={{ y: -50, x: Math.random() * 200, opacity: 0 }} animate={{ y: 150, opacity: [0, 0.5, 0] }} transition={{ duration: 1.5 + Math.random() * 1.5, repeat: Infinity, delay: Math.random() * 2 }} className="absolute">
                  <svg width="20" height="30" viewBox="0 0 40 60" fill="none"><path d="M20 0C20 0 0 25 0 40C0 51.0457 8.9543 60 20 60C31.0457 60 40 51.0457 40 40C40 25 20 0 20 0Z" fill="currentColor" className="text-splat-blue/20" /></svg>
                </motion.div>
              ))}
            </div>
          )}
          {/* Snow FX */}
          {uiSettings.enableWeatherFX && (weatherInfo.e.includes('❄️') || weatherInfo.e.includes('⛄️')) && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {[...Array(10)].map((_, i) => (
                <motion.div key={`snow-${i}`} initial={{ y: -20, x: Math.random() * 300, opacity: 0 }} animate={{ y: 200, x: `+=${Math.random() * 20 - 10}`, opacity: [0, 0.8, 0], rotate: 360 }} transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }} className="absolute blur-[0.5px]">
                  <span className="text-white text-opacity-80 text-xl font-sans">❄</span>
                </motion.div>
              ))}
            </div>
          )}
          {/* Sunny Shimmer FX */}
          {uiSettings.enableWeatherFX && (weatherInfo.e.includes('☀️') || weatherInfo.e.includes('🌤️')) && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <motion.div key={`sunny-${i}`} animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }} className="absolute" style={{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%' }}>
                  <div className="w-8 h-8 bg-yellow-400/20 blur-xl rounded-full" />
                </motion.div>
              ))}
            </div>
          )}
          {/* Thunder FX */}
          {uiSettings.enableWeatherFX && (weatherInfo.e.includes('⛈️') || weatherInfo.e.includes('⚡')) && (
            <motion.div animate={{ opacity: [0, 0, 0.4, 0, 0.2, 0, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.8, 0.82, 0.84, 0.86, 0.88, 1] }} className="absolute inset-0 bg-white pointer-events-none z-10" />
          )}
          {/* Cloudy/Foggy Mist FX */}
          {uiSettings.enableWeatherFX && (weatherInfo.e.includes('☁️') || weatherInfo.e.includes('🌫️') || weatherInfo.e.includes('⛅')) && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <motion.div key={`cloud-${i}`} animate={{ x: [-100, 300] }} transition={{ duration: 15 + i * 5, repeat: Infinity, ease: "linear" }} className="absolute top-1/2 -translate-y-1/2 opacity-20">
                  <div className="w-64 h-32 bg-white blur-3xl rounded-full" />
                </motion.div>
              ))}
            </div>
          )}

          {/* 背景裝飾浮水印 */}
          <div className="absolute -right-4 -top-6 text-8xl opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none z-0">
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
            {activeFlights.length > 0 && (
              <button
                onClick={() => setDetailItem({ __type: 'multi-flight', flights: activeFlights })}
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
                    <button onClick={() => {
                      setEditingBooking({
                        id: `add-${Date.now()}`,
                        type: 'flight',
                        title: '新航班',
                        date: selectedDateStr
                      } as any);
                      setIsBookingEditorOpen(true);
                      setShowAddMenu(false);
                    }} className="flex items-center gap-3 p-3 hover:bg-p3-navy/5 rounded-xl transition-colors text-left text-sm font-black text-p3-navy">
                      <div className="w-8 h-8 rounded-lg bg-p3-navy/10 flex items-center justify-center text-p3-navy shrink-0"><Plane size={16} strokeWidth={3} /></div>✈️ 新增航班/飯店
                    </button>
                    <button onClick={() => {
                      showToast("BookingEditor 開發中... 🧳", "info");
                      setShowAddMenu(false);
                    }} className="flex items-center gap-3 p-3 hover:bg-p3-navy/5 rounded-xl transition-colors text-left text-sm font-black text-p3-navy">
                      <div className="w-8 h-8 rounded-lg bg-p3-ruby/10 flex items-center justify-center text-p3-ruby shrink-0"><Luggage size={16} strokeWidth={3} /></div>🧳 新增行李清單
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
              {/* --- Modal Actions --- */}
              {!(detailItem.__type === 'booking' && detailItem.type === 'flight') && (
                <div className="absolute top-4 left-4 z-50 flex gap-2">
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
              )}

              {detailItem.__type === 'multi-flight' ? (
                <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#F4F5F7]">
                  {detailItem.flights.map((flight: any, idx: number) => (
                    <div key={flight.id} className={`${idx > 0 ? 'mt-4 border-t-[0.5px] border-p3-navy/10 pt-4' : ''}`}>
                      <FlightDetailModalContent
                        item={flight}
                        t={t}
                        showToast={showToast}
                        setDetailItem={setDetailItem}
                        onEdit={(item: any) => {
                          setEditingBooking(item);
                          setIsBookingEditorOpen(true);
                          setDetailItem(undefined);
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : detailItem.__type === 'booking' && detailItem.type === 'flight' ? (
                <FlightDetailModalContent
                  item={detailItem}
                  t={t}
                  showToast={showToast}
                  setDetailItem={setDetailItem}
                  onEdit={(item: any) => {
                    setEditingBooking(item);
                    setIsBookingEditorOpen(true);
                    setDetailItem(undefined);
                  }}
                />
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
        )
        }
      </AnimatePresence >

      {isEditorOpen && <ScheduleEditor tripId={trip!.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
      {
        isBookingEditorOpen && editingBooking && (
          <BookingEditor
            tripId={trip!.id}
            type={editingBooking.type}
            item={editingBooking}
            onClose={() => setIsBookingEditorOpen(false)}
          />
        )
      }

      {
        showTransportModal && selectedTransportSuggestion && (
          <TransportAiModal
            suggestion={selectedTransportSuggestion}
            onClose={() => setShowTransportModal(false)}
          />
        )
      }
    </div >
  );
};
