import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
  Plane, Home, MapPin, Plus, Edit3, Globe, QrCode,
  ArrowRight, X, Luggage, Phone, Camera, Ticket, Download, CheckCircle2, Calendar, Clock, Trash2
} from 'lucide-react';
import { cacheAsset, isAssetCached } from '../utils/offlineCache';
import { downloadIcs } from '../utils/icsGenerator';
import { formatDistanceToNow, parseISO, isPast, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { BookingItem } from '../types';
import { BookingEditor } from './BookingEditor';
import { motion, AnimatePresence } from 'framer-motion';
import { LazyImage } from './LazyImage';
import { triggerHaptic } from '../utils/haptics';

// --- 航空公司主題配色優化 ---
const AIRLINE_THEMES: Record<string, any> = {
  tigerair: { bgClass: 'bg-[#F49818]', textClass: 'text-white', logoHtml: <span className="font-black text-white text-xl tracking-tight">tiger<span className="font-medium">air</span> <span className="text-sm font-normal">Taiwan</span></span>, },
  starlux: { bgClass: 'bg-[#181B26]', textClass: 'text-[#C4A97A]', logoHtml: <span className="font-serif text-[#C4A97A] text-2xl font-bold tracking-widest flex items-center gap-2"><span className="text-3xl rotate-45 text-[#E6C998]">✦</span> STARLUX</span>, },
  cathay: { bgClass: 'bg-[#006564]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-xl font-bold tracking-widest flex items-center gap-2"><span className="text-3xl font-light scale-y-75 -scale-x-100">✔</span> CATHAY PACIFIC</span>, },
  china: { bgClass: 'bg-[#002855]', textClass: 'text-[#FFB6C1]', logoHtml: <span className="font-serif text-[#FFB6C1] text-lg font-black tracking-widest flex items-center gap-2"><span className="text-2xl">🌸</span> CHINA AIRLINES</span>, },
  eva: { bgClass: 'bg-[#007A53]', textClass: 'text-[#F2A900]', logoHtml: <span className="font-sans text-white text-2xl font-bold tracking-widest flex items-center gap-2"><span className="text-[#F2A900] text-3xl">⊕</span> EVA AIR</span>, },
  peach: { bgClass: 'bg-[#D93B8B]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-4xl font-black tracking-tighter lowercase pr-2">peach</span>, },
  ana: { bgClass: 'bg-[#133261]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-3xl font-black italic tracking-widest flex gap-1 items-center">ANA</span>, },
  other: { bgClass: 'bg-splat-dark', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-xl font-black tracking-[0.2em]">BOARDING PASS</span>, }
};

const getTheme = (airline?: string) => {
  if (!airline) return AIRLINE_THEMES.other;
  const key = Object.keys(AIRLINE_THEMES).find(k => airline.toLowerCase().includes(k));
  return key ? AIRLINE_THEMES[key] : AIRLINE_THEMES.other;
};

// 子分頁顏色
const SUBTAB_COLORS: Record<string, string> = {
  flight: 'bg-splat-blue', hotel: 'bg-splat-pink', spot: 'bg-splat-green', voucher: 'bg-splat-yellow'
};

// --- 倒數計時輔助函數 ---
const getCountdown = (dateStr: string, timeStr?: string) => {
  try {
    const target = parseISO(timeStr ? `${dateStr}T${timeStr}` : dateStr);
    if (isPast(target) && !isToday(target)) return { text: '已結束', color: 'bg-gray-400' };
    if (isToday(target)) return { text: '今天', color: 'bg-splat-orange animate-pulse' };

    const dist = formatDistanceToNow(target, { locale: zhTW, addSuffix: true });
    return { text: dist.replace('約 ', '').replace('內', ''), color: 'bg-splat-blue' };
  } catch (e) {
    return null;
  }
};

export const Booking = () => {
  const { trips, currentTripId, deleteBookingItem, showToast } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [activeSubTab, setActiveSubTab] = useState<'flight' | 'hotel' | 'spot' | 'voucher'>('flight');
  const [editingItem, setEditingItem] = useState<BookingItem | undefined>();
  const [detailItem, setDetailItem] = useState<BookingItem | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // 新增：QR Code 全螢幕亮點狀態
  const [focusedQr, setFocusedQr] = useState<string | null>(null);
  const [cachedUrls, setCachedUrls] = useState<Set<string>>(new Set());

  // 初始化時檢查已快取的項目
  React.useEffect(() => {
    const checkCache = async () => {
      if (!trip) return;
      const allUrls = [
        ...(trip.bookings || []).flatMap(b => [b.qrCode, ...(b.images || [])])
      ].filter(Boolean) as string[];

      const cachedSet = new Set<string>();
      for (const url of allUrls) {
        if (await isAssetCached(url)) cachedSet.add(url);
      }
      setCachedUrls(cachedSet);
    };
    checkCache();
  }, [trip]);

  const handleDownload = async (url: string) => {
    const success = await cacheAsset(url);
    if (success) {
      setCachedUrls(prev => new Set([...prev, url]));
      triggerHaptic('success');
    }
  };

  if (!trip) return null;
  const bookings = (trip.bookings || []).filter(b => b.type === activeSubTab);

  return (
    <div className="px-4 space-y-6 animate-fade-in pb-28 text-left h-full">

      {/* 1. 子選單導航列 (iOS Pill 動效) */}
      <div className="sticky top-0 z-20 py-2 bg-[#F4F5F7]">
        <div className="flex bg-white p-1.5 rounded-[32px] border-[3px] border-splat-dark shadow-splat-solid relative">
          {['flight', 'hotel', 'spot', 'voucher'].map((t: any) => {
            const isActive = activeSubTab === t;
            return (
              <button
                key={t}
                onClick={() => setActiveSubTab(t)}
                className="flex-1 flex flex-col items-center justify-center py-2 relative z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className={`absolute inset-0 rounded-[24px] border-2 border-splat-dark shadow-splat-solid-sm ${SUBTAB_COLORS[t]}`}
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <div className={`relative z-20 flex flex-col items-center transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {t === 'flight' ? <Plane size={18} /> : t === 'hotel' ? <Home size={18} /> : t === 'spot' ? <MapPin size={18} /> : <QrCode size={18} />}
                  <span className="text-[8px] mt-1 uppercase font-black tracking-widest">
                    {t === 'flight' ? '機票' : t === 'hotel' ? '住宿' : t === 'spot' ? '景點' : '憑證'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 票券列表 (Framer Motion 轉場) */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {bookings.length === 0 ? (
              <div className="text-center py-16 bg-white border-[3px] border-dashed border-gray-400 rounded-[32px] text-gray-500 font-black italic shadow-sm uppercase">
                Empty Pocket 🏮
              </div>
            ) : (
              bookings.map(item => (
                <div key={item.id} className="relative overflow-hidden rounded-[2.5rem]">
                  {/* Swipe Delete Background */}
                  <div className="absolute inset-0 bg-red-500 flex justify-end items-center pr-6 rounded-[2.5rem]">
                    <Trash2 size={24} className="text-white animate-pulse" strokeWidth={3} />
                  </div>

                  <motion.div
                    drag="x"
                    dragConstraints={{ right: 0, left: -80 }}
                    onDragEnd={(_, info: any) => {
                      if (info.offset.x < -50) {
                        triggerHaptic('medium');
                        deleteBookingItem(trip.id, item.id);
                        showToast("已刪除預訂 🗑️", "success");
                      }
                    }}
                    className="relative z-10 bg-transparent"
                  >
                    {item.type === 'flight' && <FlightCard item={item} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} />}
                    {item.type === 'hotel' && <HotelCard item={item} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} />}
                    {item.type === 'spot' && <SpotCard item={item} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} />}
                    {item.type === 'voucher' && <VoucherCard item={item} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} />}
                  </motion.div>
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingItem(undefined); setIsEditorOpen(true); }}
          className="w-full py-5 bg-white border-[3px] border-dashed border-splat-dark shadow-splat-solid rounded-[32px] text-splat-dark font-black flex items-center justify-center gap-2 active:translate-y-1 transition-all"
        >
          <Plus strokeWidth={3} /> 新增{activeSubTab === 'flight' ? '航班' : '預訂'}
        </motion.button>
      </div>

      {/* 3. 詳情 Modal */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 bg-splat-dark/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => setDetailItem(undefined)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F4F5F7] w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-[8px_8px_0px_#1A1A1A] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto hide-scrollbar">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-black text-splat-dark uppercase pr-8 font-['Barlow'] tracking-tight">{detailItem.title}</h2>
                  <button onClick={() => setDetailItem(undefined)} className="p-2 bg-white rounded-full border-2 border-splat-dark shadow-sm active:scale-90 transition-transform"><X size={16} strokeWidth={3} /></button>
                </div>

                {detailItem.images?.[0] && <LazyImage src={detailItem.images[0]} containerClassName="w-full aspect-video rounded-2xl object-cover border-[3px] border-splat-dark shadow-splat-solid-sm" />}

                <div className="bg-white p-4 border-[3px] border-splat-dark rounded-xl shadow-sm">
                  <p className="text-sm text-gray-700 font-bold whitespace-pre-wrap leading-relaxed">{detailItem.note || "尚無備註資訊"}</p>
                </div>

                {detailItem.qrCode && (
                  <div onClick={() => setFocusedQr(detailItem.qrCode!)} className="bg-white p-4 rounded-2xl flex flex-col items-center gap-2 border-[3px] border-splat-dark shadow-splat-solid-sm cursor-zoom-in active:scale-95 transition-transform">
                    <img src={detailItem.qrCode} className="w-40 h-40 object-contain" alt="QR" />
                    <span className="text-[10px] font-black text-splat-pink uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-md">Tap to Scan</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { downloadIcs(detailItem!); triggerHaptic('medium'); }}
                    className="btn-splat py-4 bg-white text-splat-dark flex items-center justify-center gap-2 font-black"
                  >
                    <Calendar size={18} /> 加入行事曆
                  </button>
                  {detailItem.website && (
                    <a href={detailItem.website} target="_blank" rel="noreferrer" className="btn-splat py-4 bg-splat-blue text-white flex items-center justify-center gap-2 font-black">
                      <Globe size={18} /> 官方網站
                    </a>
                  )}
                </div>

                {detailItem.location && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-4 bg-splat-green text-white border-[3px] border-splat-dark rounded-2xl font-black text-center shadow-splat-solid-sm flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all"
                  >
                    <MapPin size={18} strokeWidth={3} />
                    開啟地圖導航
                  </a>
                )}

                {detailItem.qrCode && (
                  <button
                    onClick={() => handleDownload(detailItem!.qrCode!)}
                    className={`w-full py-3 rounded-2xl border-[3px] border-splat-dark font-black flex items-center justify-center gap-2 transition-all ${detailItem.qrCode && cachedUrls.has(detailItem.qrCode) ? 'bg-gray-100 text-gray-400' : 'bg-white text-splat-dark shadow-splat-solid-sm active:translate-y-1 active:shadow-none'}`}
                  >
                    {detailItem.qrCode && cachedUrls.has(detailItem.qrCode) ? <CheckCircle2 size={18} /> : <Download size={18} />}
                    {detailItem.qrCode && cachedUrls.has(detailItem.qrCode) ? '已快取離線資源' : '下載離線憑證'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. QR Code 全螢幕亮點模式 */}
      <AnimatePresence>
        {focusedQr && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[2000] flex flex-col items-center justify-center p-8"
            onClick={() => setFocusedQr(null)}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
              className="bg-white p-6 border-[6px] border-splat-dark rounded-[40px] shadow-2xl flex flex-col items-center"
            >
              <img src={focusedQr} className="w-64 h-64 object-contain mb-8" alt="Focus QR" />
              <p className="text-2xl font-black text-splat-dark uppercase tracking-widest italic animate-pulse font-['Barlow']">Scan Me! 🦑</p>
              <p className="text-xs text-gray-400 font-black mt-4 border-2 border-gray-200 px-4 py-1 rounded-full uppercase">Tap Screen to Close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isEditorOpen && <BookingEditor tripId={trip.id} type={activeSubTab} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};

// ============================================================================
// 各類型獨立卡片組件
// ============================================================================

const FlightCard = ({ item, onEdit, onViewDetails, onQrClick }: any) => {
  const theme = getTheme(item.airline);
  const [showActions, setShowActions] = useState(false);

  const handleCardClick = () => {
    if (!showActions) {
      setShowActions(true);
      setTimeout(() => setShowActions(false), 3000);
    } else {
      onViewDetails();
      setShowActions(false);
    }
  };

  const formatDurationDisplay = (dur: string) => {
    if (!dur) return '--h --m';
    return dur.replace(/(\d+h)\s*(\d+m)/, '$1 $2');
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="relative bg-white rounded-[2.5rem] overflow-hidden border-[3px] border-splat-dark shadow-splat-solid group cursor-pointer"
      onClick={handleCardClick}
    >
      {/* 編輯按鈕 */}
      <div className={`absolute top-4 right-4 z-40 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm hover:scale-110 transition-transform">
          <Edit3 size={18} strokeWidth={3} />
        </button>
      </div>

      {/* 倒數計時標籤 */}
      {(() => {
        const cd = getCountdown(item.date, item.depTime);
        return cd && (
          <div className={`absolute top-4 left-4 z-40 px-3 py-1 rounded-full border-2 border-splat-dark text-[9px] font-black text-white shadow-sm -rotate-3 ${cd.color}`}>
            {cd.text}
          </div>
        );
      })()}

      <div
        className={`relative h-[93px] w-full flex items-center justify-center border-b-[3px] border-splat-dark ${theme.bgClass}`}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '12px 12px'
        }}
      >
        <div className="drop-shadow-md scale-110">
          {theme.logoHtml}
        </div>
      </div>

      <div className="absolute top-[75px] left-1/2 -translate-x-1/2 bg-white px-8 py-1.5 rounded-full border-[3px] border-gray-50 shadow-md z-30 flex items-center justify-center">
        <span className="text-base font-bold font-['Barlow'] text-gray-700/90 tracking-[0.2em] outline-none">{item.flightNo || '---'}</span>
      </div>

      <div className="relative p-3.5 pt-8 pb-3.5 font-['Barlow']">
        <div className="absolute top-0 bottom-0 left-4 w-0 border-l-[3px] border-dashed border-gray-100 opacity-20" />

        <div className="grid grid-cols-3 gap-0 mb-4 items-center">
          <div className="flex flex-col items-center">
            <span className="text-[24px] font-black text-gray-400 tracking-tight uppercase mb-0">{item.depIata || 'TPE'}</span>
            <span className="text-[44px] leading-tight font-bold text-[#1A1A1A] tracking-tighter tabular-nums">{item.depTime || '--:--'}</span>
            <div className="mt-1.5 bg-[#447A5A] text-white px-3.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest whitespace-nowrap shadow-sm">
              {item.depCity || '出發地'}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center px-1">
            <span className="text-[12px] font-black text-gray-500 mb-1 tabular-nums">{formatDurationDisplay(item.duration)}</span>
            <div className="w-full flex items-center text-splat-blue">
              <div className="h-[2px] flex-1 bg-gray-100 border-dashed border-t-[2.5px]"></div>
              <Plane size={16} className="mx-1.5 fill-current rotate-45 shrink-0" />
              <div className="h-[2px] flex-1 bg-gray-100 border-dashed border-t-[2.5px]"></div>
            </div>
            <span className="text-[13px] font-black text-gray-400 mt-1.5 tracking-wide">{item.date?.replace(/-/g, '/')}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[24px] font-black text-gray-400 tracking-tight uppercase mb-0">{item.arrIata || 'KIX'}</span>
            <span className="text-[44px] leading-tight font-bold text-[#1A1A1A] tracking-tighter tabular-nums">{item.arrTime || '--:--'}</span>
            <div className="mt-1.5 bg-[#B3936E] text-white px-3.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest whitespace-nowrap shadow-sm">
              {item.arrCity || '目的地'}
            </div>
          </div>
        </div>

        <div className="bg-[#F1F3F5] rounded-[1.2rem] border-2 border-gray-100/50 p-3 grid grid-cols-3 divide-x-2 divide-white/60">
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-1.5">BAGGAGE</span>
            <div className="flex items-center gap-1 font-bold text-[#1A1A1A] text-sm">
              <Luggage size={12} className="text-[#447A5A] opacity-80" strokeWidth={3} />
              {item.baggage || '---'}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-1.5">SEAT</span>
            <div className="font-bold text-[#1A1A1A] text-sm">{item.seat || '---'}</div>
          </div>
          <div className="flex flex-col items-center overflow-hidden">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-1.5 text-center">AIRCRAFT</span>
            <div className="flex items-center gap-1 font-bold text-[#1A1A1A] truncate w-full justify-center text-sm">
              <Plane size={12} className="text-[#B3936E] rotate-45 shrink-0 opacity-80" strokeWidth={3} />
              <span className="truncate">{item.aircraft || '---'}</span>
            </div>
          </div>
        </div>
      </div>

      {item.qrCode && (
        <div className="absolute right-5 top-[115px] z-[25]">
          <motion.div
            whileHover={{ scale: 1.1 }}
            onClick={(e) => { e.stopPropagation(); onQrClick(item.qrCode!); }}
            className="cursor-zoom-in bg-white p-1.5 border-2 border-gray-100 rounded-xl shadow-md"
          >
            <LazyImage src={item.qrCode} containerClassName="w-11 h-11" alt="QR" />
          </motion.div>
        </div>
      )}

      <div className="absolute top-[80px] -left-3.5 w-7 h-7 bg-[#F4F5F7] rounded-full border-[3px] border-splat-dark z-30 shadow-inner" />
      <div className="absolute top-[80px] -right-3.5 w-7 h-7 bg-[#F4F5F7] rounded-full border-[3px] border-splat-dark z-30 shadow-inner" />
    </motion.div>
  );
};

const HotelCard = ({ item, onEdit, onViewDetails, onQrClick }: any) => {
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => { if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); } };

  return (
    <motion.div whileTap={{ scale: 0.98 }} className="bg-white rounded-[2rem] border-[3px] border-splat-dark shadow-splat-solid overflow-hidden relative cursor-pointer" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3} /></button>
      </div>

      {/* 倒數計時標籤 */}
      {(() => {
        const cd = getCountdown(item.date);
        return cd && (
          <div className={`absolute top-4 left-4 z-20 px-3 py-1 rounded-full border-2 border-splat-dark text-[9px] font-black text-white shadow-sm -rotate-2 ${cd.color}`}>
            {cd.text}
          </div>
        );
      })()}

      <div className="h-32 bg-gray-200 relative border-b-[3px] border-splat-dark">
        {item.images?.[0] ? (<LazyImage src={item.images[0]} containerClassName="w-full h-full" />) : (<div className="w-full h-full flex items-center justify-center bg-splat-pink/10"><Home size={40} className="text-splat-pink/40" /></div>)}
        <div className="absolute top-3 left-3 bg-white border-2 border-splat-dark px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-splat-dark shadow-[2px_2px_0px_#1A1A1A]">HOTEL</div>
      </div>

      <div className="p-5 flex items-center relative">
        <div className="absolute top-0 bottom-0 right-[88px] w-0 border-l-[2.5px] border-dashed border-gray-200" />
        <div className="flex-1 pr-6 space-y-4">
          <h3 className="font-black text-xl text-splat-dark leading-tight pr-4 font-['Barlow']">{item.title}</h3>
          <div className="flex gap-2 font-['Barlow']">
            <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-2 text-center">
              <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Check-in</div>
              <div className="font-black text-sm text-splat-dark tabular-nums">{item.date}</div>
            </div>
            <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-2 text-center">
              <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Check-out</div>
              <div className="font-black text-sm text-splat-dark tabular-nums">{item.endDate || '-'}</div>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 p-2 rounded-xl border-2 border-gray-100">
            <MapPin size={14} className="shrink-0 text-splat-pink mt-0.5" />
            <span className="leading-snug truncate">{item.location || '地址待確認'}</span>
          </div>
        </div>
        <div className="w-[80px] flex flex-col items-center justify-center shrink-0 pl-2 z-10 gap-3">
          {item.qrCode ? (
            <motion.div whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); onQrClick(item.qrCode!); }} className="cursor-zoom-in bg-white p-1 border-2 border-gray-100 rounded-xl shadow-inner relative group">
              <LazyImage src={item.qrCode} containerClassName="w-14 h-14" alt="QR" />
              <div className="absolute inset-0 bg-splat-blue/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"><Plus size={16} className="text-splat-blue" strokeWidth={4} /></div>
            </motion.div>
          ) : (
            <div className="text-center shrink-0 bg-gray-50 rounded-xl px-2 py-3 border-2 border-gray-200">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Nights</div>
              <div className="font-black text-splat-dark text-lg leading-none tabular-nums">{item.nights || 1}</div>
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-[128px] -left-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[3px] border-splat-dark z-10 shadow-inner" />
      <div className="absolute top-[128px] -right-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[3px] border-splat-dark z-10 shadow-inner" />
    </motion.div>
  );
};

const SpotCard = ({ item, onEdit, onViewDetails, onQrClick }: any) => {
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => { if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); } };

  return (
    <motion.div whileTap={{ scale: 0.98 }} className="relative bg-[#FFFAF0] rounded-3xl border-[3px] border-splat-dark shadow-splat-solid cursor-pointer flex flex-col overflow-hidden" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3} /></button>
      </div>

      {/* 倒數計時標籤 */}
      {(() => {
        const cd = getCountdown(item.date, item.entryTime);
        return cd && (
          <div className={`absolute top-4 left-4 z-20 px-3 py-1 rounded-full border-2 border-splat-dark text-[9px] font-black text-white shadow-sm -rotate-2 ${cd.color}`}>
            {cd.text}
          </div>
        );
      })()}

      <div className="p-5 border-b-[3px] border-dashed border-gray-300 relative bg-[#FFFAF0]">
        <div className="flex justify-between items-start mb-3">
          <div className="bg-splat-yellow border-2 border-splat-dark px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-splat-dark shadow-sm">🎫 SPOT TICKET</div>
        </div>
        <h3 className="font-black text-xl text-splat-dark leading-tight pr-4 truncate font-['Barlow']">{item.title}</h3>
      </div>

      <div className="p-5 bg-white flex items-center relative">
        <div className="absolute top-0 bottom-0 right-[88px] w-0 border-l-[2.5px] border-dashed border-gray-200" />
        <div className="flex-1 grid grid-cols-2 gap-y-3 gap-x-2 pr-6 font-['Barlow']">
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Date</div>
            <div className="font-black text-sm text-splat-dark tabular-nums">{item.date}</div>
          </div>
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Entry Time</div>
            <div className="font-black text-sm text-splat-pink tabular-nums">{item.entryTime || '不限時間'}</div>
          </div>
          <div className="col-span-2 mt-1">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Location</div>
            <div className="font-bold text-xs text-splat-dark truncate">{item.location || '---'}</div>
          </div>
        </div>
        <div className="w-[80px] flex items-center justify-center shrink-0 pl-2 z-10 bg-white">
          {item.qrCode ? (
            <motion.div whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); onQrClick(item.qrCode!); }} className="cursor-zoom-in bg-white p-1.5 border-2 border-gray-100 rounded-xl shadow-inner relative group">
              <LazyImage src={item.qrCode} containerClassName="w-14 h-14" />
              <div className="absolute inset-0 bg-splat-blue/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"><Plus size={16} className="text-splat-blue" strokeWidth={4} /></div>
            </motion.div>
          ) : (
            <div className="text-gray-200 opacity-50 flex flex-col items-center gap-1">
              <QrCode size={28} />
              <span className="text-[8px] font-black">NO QR</span>
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-[80px] -left-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[3px] border-splat-dark z-10 shadow-inner" />
      <div className="absolute top-[80px] -right-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[3px] border-splat-dark z-10 shadow-inner" />
    </motion.div>
  );
};

const VoucherCard = ({ item, onEdit, onViewDetails, onQrClick }: any) => {
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => { if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); } };

  return (
    <motion.div whileTap={{ scale: 0.98 }} className="bg-white rounded-3xl border-[3px] border-splat-dark shadow-splat-solid cursor-pointer overflow-hidden flex relative" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-30 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3} /></button>
      </div>

      {/* 倒數計時標籤 */}
      {(() => {
        const cd = getCountdown(item.date);
        return cd && (
          <div className={`absolute top-4 left-4 z-30 px-3 py-1 rounded-full border-2 border-splat-dark text-[9px] font-black text-white shadow-sm -rotate-2 ${cd.color}`}>
            {cd.text}
          </div>
        );
      })()}

      <div className="w-10 bg-[#FF8A00] border-r-[3px] border-splat-dark flex flex-col items-center justify-center py-4 relative shrink-0">
        <span className="text-[11px] font-black text-white uppercase tracking-[0.4em] -rotate-90 whitespace-nowrap drop-shadow-md z-10 font-['Barlow']">VOUCHER</span>
      </div>

      <div className="flex-1 p-5 flex items-center relative">
        <div className="absolute top-0 bottom-0 right-[88px] w-0 border-l-[2.5px] border-dashed border-gray-200" />
        <div className="flex-1 pr-6 space-y-3 font-['Barlow']">
          <h3 className="font-black text-[17px] text-splat-dark leading-tight pr-2">{item.title}</h3>
          <div className="flex gap-3 text-sm bg-gray-50 p-2 rounded-xl border-2 border-gray-100">
            <div className="flex-1">
              <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Valid Date</div>
              <div className="font-black text-splat-dark text-xs tabular-nums">{item.date}</div>
            </div>
            {item.endDate && (
              <>
                <div className="w-[2px] bg-gray-200 my-1 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">End Date</div>
                  <div className="font-black text-splat-dark text-xs tabular-nums">{item.endDate}</div>
                </div>
              </>
            )}
          </div>
          {item.exchangeLocation && (
            <div className="bg-orange-50 border-2 border-orange-200/60 rounded-xl p-2.5">
              <div className="text-[8px] font-black text-[#FF8A00] uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><MapPin size={10} /> Exchange</div>
              <div className="font-black text-[11px] text-splat-dark leading-snug truncate">{item.exchangeLocation}</div>
            </div>
          )}
        </div>
        <div className="w-[80px] flex items-center justify-center shrink-0 pl-2 z-10 bg-white">
          {item.qrCode ? (
            <motion.div whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); onQrClick(item.qrCode!); }} className="cursor-zoom-in bg-white p-1.5 border-2 border-gray-100 rounded-xl shadow-inner relative group">
              <LazyImage src={item.qrCode} containerClassName="w-14 h-14" />
              <div className="absolute inset-0 bg-splat-blue/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"><Plus size={16} className="text-splat-blue" strokeWidth={4} /></div>
            </motion.div>
          ) : (
            <div className="text-gray-200 opacity-50 flex flex-col items-center gap-1">
              <Ticket size={28} />
              <span className="text-[8px] font-black">VOUCHER</span>
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-1/2 -mt-3 -left-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[3px] border-splat-dark z-20 shadow-inner" />
      <div className="absolute top-1/2 -mt-3 -right-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[3px] border-splat-dark z-20 shadow-inner" />
    </motion.div>
  );
};
