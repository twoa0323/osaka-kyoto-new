import { useState, useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
  Plane, Home, MapPin, Plus, Edit3, Globe, QrCode, ChevronDown,
  ArrowRight, X, Luggage, Phone, Camera, Ticket, Download, CheckCircle2, Calendar, Clock, Trash2
} from 'lucide-react';
import { cacheAsset, isAssetCached } from '../utils/offlineCache';
import { downloadIcs } from '../utils/icsGenerator';
import { formatDistanceToNow, parseISO, isPast, isToday, differenceInMinutes } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { BookingItem } from '../types';
import { BookingEditor } from './BookingEditor';
import { motion, AnimatePresence } from 'framer-motion';
import { LazyImage } from './LazyImage';
import { useTranslation } from '../hooks/useTranslation';
import { triggerHaptic } from '../utils/haptics';
import { SwipeableItem, InkSplat } from './Common';
import { Copy, Check } from 'lucide-react';

// --- 航空公司主題配色優化 ---
const AIRLINE_THEMES: Record<string, any> = {
  tigerair: { bgClass: 'bg-[#F49818]', textClass: 'text-white', logoHtml: <span className="font-black text-white text-xl tracking-tight">tiger<span className="font-medium">air</span> <span className="text-sm font-normal">Taiwan</span></span>, },
  starlux: { bgClass: 'bg-[#181B26]', textClass: 'text-[#C4A97A]', logoHtml: <span className="font-serif text-[#C4A97A] text-2xl font-bold tracking-widest flex items-center gap-2"><span className="text-3xl rotate-45 text-[#E6C998]">✦</span> STARLUX</span>, },
  cathay: { bgClass: 'bg-[#006564]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-xl font-bold tracking-widest flex items-center gap-2"><span className="text-3xl font-light scale-y-75 -scale-x-100">✔</span> CATHAY PACIFIC</span>, },
  china: { bgClass: 'bg-[#002855]', textClass: 'text-[#FFB6C1]', logoHtml: <span className="font-serif text-[#FFB6C1] text-lg font-black tracking-widest flex items-center gap-2"><span className="text-2xl">🌸</span> CHINA AIRLINES</span>, },
  eva: { bgClass: 'bg-[#007A53]', textClass: 'text-[#F2A900]', logoHtml: <span className="font-sans text-white text-2xl font-bold tracking-widest flex items-center gap-2"><span className="text-[#F2A900] text-3xl">⊕</span> EVA AIR</span>, },
  peach: { bgClass: 'bg-[#D93B8B]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-4xl font-black tracking-tighter lowercase pr-2">peach</span>, },
  ana: { bgClass: 'bg-[#133261]', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-3xl font-black italic tracking-widest flex gap-1 items-center">ANA</span>, },
  other: { bgClass: 'bg-p3-navy', textClass: 'text-white', logoHtml: <span className="font-sans text-white text-xl font-black tracking-[0.2em]">BOARDING PASS</span>, }
};

const getTheme = (airline?: string) => {
  if (!airline) return AIRLINE_THEMES.other;
  const key = Object.keys(AIRLINE_THEMES).find(k => airline.toLowerCase().includes(k));
  return key ? AIRLINE_THEMES[key] : AIRLINE_THEMES.other;
};

// 子分頁顏色 (P3 Wide Color)
const SUBTAB_COLORS: Record<string, string> = {
  flight: 'bg-p3-navy', hotel: 'bg-p3-ruby', spot: 'bg-p3-gold', voucher: 'bg-p3-ruby/80'
};

// --- 倒數計時輔助函數 ---
const getCountdown = (dateStr: string, timeStr?: string, t?: any, lang?: string) => {
  try {
    const target = parseISO(timeStr ? `${dateStr}T${timeStr}` : dateStr);
    if (isPast(target) && !isToday(target)) return { text: t ? t('booking.ended') : '已結束', color: 'bg-gray-400' };

    const diffMins = differenceInMinutes(target, new Date());
    if (isToday(target)) {
      if (diffMins > 0 && diffMins <= 60) {
        return { text: t ? `${diffMins} ${t('booking.minsLater')}` : `${diffMins} 分鐘後`, color: 'bg-[#F03C69] animate-[pulse_0.8s_infinite] shadow-[0_0_15px_#F03C69]' };
      }
      return { text: t ? t('booking.today') : '今天', color: 'bg-splat-orange animate-pulse' };
    }

    let dist = '';
    if (lang === 'zh-TW') {
      dist = formatDistanceToNow(target, { locale: zhTW, addSuffix: true }).replace('約 ', '').replace('內', '');
    } else {
      dist = formatDistanceToNow(target, { addSuffix: true }).replace('about ', '').replace('less than a minute ', '');
    }
    return { text: dist, color: 'bg-splat-blue' };
  } catch (e) {
    return null;
  }
};

export const Booking = () => {
  const { t, language } = useTranslation();
  const { trips, currentTripId, deleteBookingItem, showToast } = useTripStore();
  const trip = trips.find(trip => trip.id === currentTripId);
  const [activeSubTab, setActiveSubTab] = useState<'flight' | 'hotel' | 'spot' | 'voucher'>('flight');
  const [editingItem, setEditingItem] = useState<BookingItem | undefined>();
  const [detailItem, setDetailItem] = useState<BookingItem | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // 新增：QR Code 全螢幕亮點狀態
  const [focusedQr, setFocusedQr] = useState<string | null>(null);
  const [splatColor, setSplatColor] = useState<string | null>(null);
  const [cachedUrls, setCachedUrls] = useState<Set<string>>(new Set());

  // 初始化時檢查已快取的項目
  useEffect(() => {
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
      <div className="sticky top-0 z-20 py-2 bg-[#F4F5F7]/80 backdrop-blur-md">
        <div className="flex glass-card p-1.5 border-[0.5px] border-white/40 shadow-glass-soft relative overflow-hidden">
          {['flight', 'hotel', 'spot', 'voucher'].map((tabType: any) => {
            const isActive = activeSubTab === tabType;
            return (
              <button
                key={tabType}
                onClick={() => setActiveSubTab(tabType)}
                className="flex-1 flex flex-col items-center justify-center py-2 relative z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className={`absolute inset-0 rounded-[22px] border-[0.5px] border-white/20 shadow-glass-deep ${SUBTAB_COLORS[tabType]}`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <div className={`relative z-20 flex flex-col items-center transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {tabType === 'flight' ? <Plane size={18} /> : tabType === 'hotel' ? <Home size={18} /> : tabType === 'spot' ? <MapPin size={18} /> : <QrCode size={18} />}
                  <span className="text-[10px] mt-1 uppercase font-black tracking-widest opacity-80 scale-90">
                    {t(`booking.${tabType}` as any) || tabType}
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
              <div className="text-center py-16 bg-white border-[0.5px] border-dashed border-gray-400 glass-card text-gray-500 font-black italic shadow-sm uppercase">
                {t('booking.emptyPocket')}
              </div>
            ) : (
              bookings.map(item => (
                <SwipeableItem
                  key={item.id}
                  id={item.id}
                  onDelete={() => deleteBookingItem(trip.id, item.id)}
                  className="rounded-[2.5rem]"
                >
                  {item.type === 'flight' && <FlightCard item={item} t={t} language={language} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} onCopy={(color: string) => { setSplatColor(color); setTimeout(() => setSplatColor(null), 1000); triggerHaptic('success'); }} />}
                  {item.type === 'hotel' && <HotelCard item={item} t={t} language={language} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} onCopy={(color: string) => { setSplatColor(color); setTimeout(() => setSplatColor(null), 1000); triggerHaptic('success'); }} />}
                  {item.type === 'spot' && <SpotCard item={item} t={t} language={language} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} onCopy={(color: string) => { setSplatColor(color); setTimeout(() => setSplatColor(null), 1000); triggerHaptic('success'); }} />}
                  {item.type === 'voucher' && <VoucherCard item={item} t={t} language={language} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} onCopy={(color: string) => { setSplatColor(color); setTimeout(() => setSplatColor(null), 1000); triggerHaptic('success'); }} />}
                </SwipeableItem>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => { setEditingItem(undefined); setIsEditorOpen(true); }}
          className="w-full py-5 bg-white/40 backdrop-blur-md border-[0.5px] border-dashed border-black/20 shadow-glass-soft glass-card text-p3-navy font-black flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <Plus strokeWidth={3} /> <span className="uppercase">{activeSubTab === 'flight' ? t('booking.addFlight') : t('booking.addBooking')}</span>
        </motion.button>
      </div>

      {/* 3. 詳情 Modal */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4" onClick={() => setDetailItem(undefined)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-sm overflow-hidden shadow-glass-deep border-[0.5px] border-white/40"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto hide-scrollbar">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-black text-p3-navy uppercase pr-8 font-['Barlow'] tracking-tight">{detailItem.title}</h2>
                  <button onClick={() => setDetailItem(undefined)} className="p-2 bg-white rounded-full border-2 border-p3-navy shadow-sm active:scale-90 transition-transform"><X size={16} strokeWidth={3} /></button>
                </div>

                {detailItem.images?.[0] && <LazyImage src={detailItem.images[0]} containerClassName="w-full aspect-video rounded-2xl object-cover border-[0.5px] border-p3-navy shadow-glass-deep-sm" />}

                <div className="bg-white p-4 border-[0.5px] border-p3-navy rounded-xl shadow-sm">
                  <p className="text-sm text-gray-700 font-bold whitespace-pre-wrap leading-relaxed">{detailItem.note || t('booking.noNotes')}</p>
                </div>

                {/* --- ✈️ 特製 Flight 專屬區塊 --- */}
                {detailItem.type === 'flight' && (
                  <div className="space-y-4">
                    {/* PNR 快捷區 */}
                    <div
                      className="bg-p3-gold/10 border-[0.5px] border-p3-gold/30 rounded-2xl p-4 flex justify-between items-center cursor-copy active:scale-95 transition-transform shadow-glass-soft"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(detailItem.pnr!);
                        setSplatColor('var(--p3-gold)');
                        setTimeout(() => setSplatColor(null), 1000);
                        triggerHaptic('success');
                      }}
                    >
                      <div>
                        <div className="text-[10px] font-black text-p3-navy/60 uppercase tracking-[0.2em] mb-1">{t('booking.pnrLabel')}</div>
                        <div className="text-3xl font-black text-p3-navy font-['Barlow'] tracking-widest">{detailItem.pnr}</div>
                      </div>
                      <div className="w-12 h-12 bg-white/60 backdrop-blur-md rounded-xl border-[0.5px] border-p3-gold/30 flex items-center justify-center shadow-sm">
                        <Copy size={20} className="text-p3-gold" strokeWidth={3} />
                      </div>
                    </div>

                    {/* 航廈與登機門卡片 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border-[0.5px] border-p3-navy rounded-xl p-3 shadow-glass-deep-sm flex flex-col items-center justify-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('booking.terminal')}</span>
                        <span className="text-2xl font-black text-p3-navy tabular-nums">{detailItem.terminal || '--'}</span>
                      </div>
                      <div className="bg-white border-[0.5px] border-p3-navy rounded-xl p-3 shadow-glass-deep-sm flex flex-col items-center justify-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('booking.gate')}</span>
                        <span className="text-2xl font-black text-p3-navy tabular-nums">{detailItem.gate || '--'}</span>
                      </div>
                    </div>

                    {/* 登機時間高亮 */}
                    {detailItem.boardingTime && (
                      <div className="bg-splat-pink/10 border-2 border-splat-pink rounded-xl p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-splat-pink">
                          <Clock size={18} strokeWidth={3} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('booking.boardingTime')}</span>
                        </div>
                        <span className="text-xl font-black text-splat-pink tabular-nums">{detailItem.boardingTime}</span>
                      </div>
                    )}

                    {/* 行李清單 */}
                    <div className="bg-[#F4F5F7] border-2 border-dashed border-gray-300 rounded-xl p-4">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Luggage size={14} /> {t('booking.baggageDetails')}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-200">
                          <span className="text-xs font-bold text-gray-600">{t('booking.checkedBaggage')}</span>
                          <span className="text-sm font-black text-p3-navy">{detailItem.baggage || t('booking.unknown')}</span>
                        </div>
                        {detailItem.baggageAllowance && (
                          <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-200">
                            <span className="text-xs font-bold text-gray-600">{t('booking.carryOnBaggage')}</span>
                            <span className="text-sm font-black text-p3-navy">{detailItem.baggageAllowance}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 共通 QR Code --- */}
                {detailItem.qrCode && (
                  <div onClick={() => setFocusedQr(detailItem.qrCode!)} className="bg-white p-4 rounded-2xl flex flex-col items-center gap-2 border-[0.5px] border-p3-navy shadow-glass-deep-sm cursor-zoom-in active:scale-95 transition-transform">
                    <img src={detailItem.qrCode} className="w-40 h-40 object-contain" alt="QR" />
                    <span className="text-[10px] font-black text-splat-pink uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-md">{t('booking.tapToScan')}</span>
                  </div>
                )}

                {/* --- 共通動作按鈕 --- */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { downloadIcs(detailItem!); triggerHaptic('medium'); }}
                    className="btn-splat py-4 bg-white text-p3-navy flex items-center justify-center gap-2 font-black"
                  >
                    <Calendar size={18} /> {t('booking.addToCalendar')}
                  </button>
                  {detailItem.website && (
                    <a href={detailItem.website} target="_blank" rel="noreferrer" className="btn-splat py-4 bg-splat-blue text-white flex items-center justify-center gap-2 font-black">
                      <Globe size={18} /> {t('booking.officialWebsite')}
                    </a>
                  )}
                </div>

                {/* --- ✈️ 特製 Flight 專屬按鈕 --- */}
                {detailItem.type === 'flight' && (
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={detailItem.flightNo ? `https://www.google.com/search?q=Flight+Status+${detailItem.flightNo}` : '#'}
                      target="_blank" rel="noreferrer"
                      className="w-full py-3 bg-p3-navy text-white border-[0.5px] border-p3-navy rounded-xl font-black text-xs text-center shadow-glass-deep-sm flex items-center justify-center gap-2 active:translate-y-1 transition-all"
                    >
                      <Plane size={14} /> {t('booking.liveFlightStatus')}
                    </a>
                    <a
                      href={detailItem.depIata ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${detailItem.depIata} 機場 航廈${detailItem.terminal || ''}`)}` : '#'}
                      target="_blank" rel="noreferrer"
                      className="w-full py-3 bg-splat-green text-white border-[0.5px] border-p3-navy rounded-xl font-black text-xs text-center shadow-glass-deep-sm flex items-center justify-center gap-2 active:translate-y-1 transition-all"
                    >
                      <MapPin size={14} /> {t('booking.navToTerminal')}
                    </a>
                  </div>
                )}

                {/* --- 一般地圖導航 (Flight 以外) --- */}
                {detailItem.type !== 'flight' && detailItem.location && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-4 bg-splat-green text-white border-[0.5px] border-p3-navy rounded-2xl font-black text-center shadow-glass-deep-sm flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all"
                  >
                    <MapPin size={18} strokeWidth={3} />
                    {t('booking.openMapNav')}
                  </a>
                )}

                {detailItem.qrCode && (
                  <button
                    onClick={() => handleDownload(detailItem!.qrCode!)}
                    className={`w-full py-3 rounded-2xl border-[0.5px] border-p3-navy font-black flex items-center justify-center gap-2 transition-all ${detailItem.qrCode && cachedUrls.has(detailItem.qrCode) ? 'bg-gray-100 text-gray-400' : 'bg-white text-p3-navy shadow-glass-deep-sm active:translate-y-1 active:shadow-none'}`}
                  >
                    {detailItem.qrCode && cachedUrls.has(detailItem.qrCode) ? <CheckCircle2 size={18} /> : <Download size={18} />}
                    {detailItem.qrCode && cachedUrls.has(detailItem.qrCode) ? t('booking.cached') : t('booking.downloadOffline')}
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
            className="fixed inset-0 bg-white/80 backdrop-blur-2xl z-[2000] flex flex-col items-center justify-center p-8"
            onClick={() => setFocusedQr(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-[48px] shadow-glass-deep flex flex-col items-center border-[0.5px] border-black/10"
            >
              <img src={focusedQr} className="w-64 h-64 object-contain mb-8 group-hover:scale-105 transition-transform" alt="Focus QR" />
              <p className="text-2xl font-black text-p3-navy uppercase tracking-tight italic animate-pulse">Scan & GO</p>
              <p className="text-[10px] text-gray-400 font-bold mt-6 px-4 py-1.5 rounded-full uppercase tracking-widest bg-gray-50 border-[0.5px] border-gray-100">Tap to Close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. InkSplat Feedback */}
      <AnimatePresence>
        {splatColor && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center pointer-events-none">
            <InkSplat color={splatColor} />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="bg-white border-[4px] border-p3-navy px-6 py-2 rounded-2xl shadow-glass-deep transform -rotate-3"
            >
              <span className="text-2xl font-black text-p3-navy italic">{t('booking.copied')}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isEditorOpen && <BookingEditor tripId={trip.id} type={activeSubTab} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};

// --- 通用一鍵複製組件 ---
const CopyableField = ({ label, value, onCopy }: any) => {
  return (
    <div
      className="group cursor-copy active:scale-95 transition-all flex flex-col items-start gap-1"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        onCopy();
      }}
    >
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest opacity-60">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-black text-p3-navy text-sm tracking-tight">{value || '---'}</span>
        <Copy size={12} className="text-gray-300 group-hover:text-p3-gold transition-colors" />
      </div>
    </div>
  );
};

// ============================================================================
// 各類型獨立卡片組件
// ============================================================================

const FlightCard = ({ item, t, language, onEdit, onViewDetails, onQrClick }: any) => {
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
      className="relative bg-white rounded-[2.5rem] shadow-glass-deep overflow-hidden group cursor-pointer"
      onClick={handleCardClick}
    >
      {/* 編輯按鈕 */}
      <div className={`absolute top-4 right-4 z-40 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={(e) => { e.stopPropagation(); onEdit(e); }} className="p-2.5 bg-p3-gold border-[0.5px] border-white/20 rounded-full text-white shadow-glass-soft hover:scale-110 transition-transform">
          <Edit3 size={18} strokeWidth={3} />
        </button>
      </div>

      {/* 1. Header (Dark Section) */}
      <div
        className="h-[80px] w-full flex items-center justify-center relative overflow-hidden bg-[#181B26]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1.2px, transparent 1.2px)',
          backgroundSize: '16px 16px'
        }}
      >
        <div className="drop-shadow-sm scale-110">
          {theme.logoHtml}
        </div>
      </div>

      {/* 2. Overlapping Flight Number Pill */}
      <div className="absolute top-[65px] left-1/2 -translate-x-1/2 bg-white px-6 py-1.5 rounded-full border-[0.5px] border-black/5 shadow-sm z-30 flex items-center justify-center min-w-[100px]">
        <span className="text-sm font-black text-gray-400 tracking-[0.1em] uppercase">{item.flightNo || '---'}</span>
      </div>

      {/* 3. Body Content */}
      <div className="relative p-5 pt-10 pb-4">
        {/* Left Perforation Line */}
        <div className="absolute top-0 bottom-0 left-0 w-0 border-l-[2.5px] border-dashed border-gray-200" />

        <div className="grid grid-cols-3 gap-0 mb-6 items-center">
          {/* Departure */}
          <div className="flex flex-col items-center">
            <span className="text-[26px] font-black text-gray-400 tracking-widest uppercase leading-none mb-1">{item.depIata || 'TPE'}</span>
            <span className="text-[44px] font-black text-[#1A1A1A] tabular-nums leading-none mb-3">{item.depTime || '08:30'}</span>
            <div className="bg-[#2D7A4D] text-white px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
              {item.depCity || 'Taipei'}
            </div>
          </div>

          {/* Center Flight Art */}
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-[11px] font-black text-gray-400 mb-2 tabular-nums tracking-widest">
              {formatDurationDisplay(item.duration)}
            </span>
            <div className="w-full flex items-center text-[#2D32CF]">
              <div className="h-[1.5px] flex-1 border-t-[2px] border-dashed border-gray-200"></div>
              <Plane size={18} className="mx-2 rotate-45 shrink-0 fill-current" />
              <div className="h-[1.5px] flex-1 border-t-[2px] border-dashed border-gray-200"></div>
            </div>
            <span className="text-[11px] font-black text-gray-300 mt-2 tracking-widest uppercase">
              {item.date?.replace(/-/g, '/')}
            </span>
          </div>

          {/* Arrival */}
          <div className="flex flex-col items-center">
            <span className="text-[26px] font-black text-gray-400 tracking-widest uppercase leading-none mb-1">{item.arrIata || 'KIX'}</span>
            <span className="text-[44px] font-black text-[#1A1A1A] tabular-nums leading-none mb-3">{item.arrTime || '12:15'}</span>
            <div className="bg-[#B3936E] text-white px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
              {item.arrCity || 'Osaka'}
            </div>
          </div>
        </div>

        {/* 4. Footer (Three Equal Columns) */}
        <div className="bg-[#F8F9FA] rounded-[1.5rem] p-4 grid grid-cols-3 divide-x divide-gray-200/60 mt-2 border-[0.5px] border-gray-100">
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Baggage</span>
            <div className="flex items-center gap-1.5 font-black text-[#1A1A1A] text-xs">
              <Luggage size={12} className="text-gray-400 opacity-60" strokeWidth={3} />
              {item.baggage || '23kg'}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Seat</span>
            <div className="flex items-center gap-1.5 font-black text-[#1A1A1A] text-xs">
              <span className="text-gray-400 opacity-60 font-serif">💺</span>
              {item.seat || '22K'}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Aircraft</span>
            <div className="flex items-center gap-1.5 font-black text-[#1A1A1A] text-xs truncate w-full justify-center">
              <Plane size={12} className="text-gray-400 opacity-60 rotate-45 shrink-0" strokeWidth={3} />
              <span className="truncate">{item.aircraft || 'A359'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Shortcut */}
      {item.qrCode && (
        <div className="absolute right-6 top-[110px] z-[25]">
          <motion.div
            whileHover={{ scale: 1.1 }}
            onClick={(e) => { e.stopPropagation(); onQrClick(item.qrCode!); }}
            className="cursor-zoom-in bg-white p-1 rounded-xl shadow-md border-[0.5px] border-gray-100 rotate-3"
          >
            <LazyImage src={item.qrCode} containerClassName="w-12 h-12" alt="QR" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

const HotelCard = ({ item, t, language, onEdit, onViewDetails, onQrClick, onCopy }: any) => {
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

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="relative bg-[#0A142E] rounded-[2.5rem] shadow-glass-deep overflow-hidden cursor-pointer aspect-[3/4.2] group flex flex-col no-border"
      onClick={handleCardClick}
    >
      {/* 編輯按鈕 */}
      <div className={`absolute top-6 right-6 z-50 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={(e) => { e.stopPropagation(); onEdit(e); }} className="p-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white shadow-lg active:scale-90 transition-transform">
          <Edit3 size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* 1. Hero Background (70% Height) */}
      <div className="relative h-[70%] w-full overflow-hidden">
        {item.images?.[0] ? (
          <LazyImage src={item.images[0]} containerClassName="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0d1b3a]">
            <Home size={64} className="text-white/5" />
          </div>
        )}
        {/* Deep Shadow Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A142E] via-[#0A142E]/40 to-transparent z-10" />

        {/* 2. Overlapping Typography Layer */}
        <div className="absolute bottom-6 left-8 right-8 z-20">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black tracking-[0.4em] text-white/50 uppercase">Reserved</span>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-3 py-0.5 rounded-full shrink-0">
                <span className="text-[9px] font-black text-white uppercase tracking-widest tabular-nums">
                  {item.nights || 1} {t('booking.nights')}
                </span>
              </div>
            </div>
            <h3 className="font-black text-[28px] text-white leading-tight font-['Barlow'] tracking-tight drop-shadow-2xl">
              {item.title}
            </h3>
          </div>
        </div>
      </div>

      {/* 3. The "Glass Console" Section */}
      <div className="relative flex-1 p-6 flex flex-col justify-between z-30">
        {/* Subtle Watermark Watermark Logo Area */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none z-0 scale-[3]">
          <Home size={60} strokeWidth={1} />
        </div>

        <div className="flex justify-between items-center relative z-10">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Stay Duration</span>
            <div className="flex items-center gap-2 text-white">
              <span className="text-lg font-black tabular-nums">{item.checkInTime || '15:00'}</span>
              <span className="text-white/30 truncate mx-1">—</span>
              <span className="text-lg font-black tabular-nums">{item.checkOutTime || '11:00'}</span>
            </div>
            <div className="text-[10px] font-bold text-white/60 mt-0.5 tracking-tight">
              {item.date?.replace(/-/g, '/')} — {item.checkOutDate?.replace(/-/g, '/') || '---'}
            </div>
          </div>
        </div>

        {/* 4. Interactive Buttons Group */}
        <div className="flex items-center gap-3 relative z-10 mt-2">
          {/* Contact: Minimalist Glass Button */}
          <a
            href={`tel:${item.phone || ''}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 py-3.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center gap-2 group/btn active:scale-95 transition-all"
          >
            <Phone size={16} className="text-white/70 group-hover/btn:text-white" />
            <span className="text-xs font-black text-white/80 uppercase tracking-widest group-hover/btn:text-white">Contact</span>
          </a>

          {/* Maps: Solid High-Gloss Navy Button */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location || item.title)}`}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3.5 bg-[#1E2A5E] hover:bg-[#25357a] border-t border-white/20 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-black/20 group/map active:scale-95 transition-all"
          >
            <MapPin size={16} className="text-white" />
            <span className="text-xs font-black text-white uppercase tracking-widest">Open Maps</span>
          </a>
        </div>
      </div>

      {/* Floating Action Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
        <ChevronDown size={20} className="text-white animate-pulse" />
      </div>
    </motion.div>
  );
};

const SpotCard = ({ item, t, language, onEdit, onViewDetails, onQrClick, onCopy }: any) => {
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => { if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); } };

  return (
    <motion.div whileTap={{ scale: 0.98 }} className="relative bg-white/60 backdrop-blur-md rounded-3xl border-[0.5px] border-white/30 shadow-glass-soft cursor-pointer flex flex-col overflow-hidden" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-p3-gold border-[0.5px] border-white/20 rounded-full text-white shadow-glass-soft"><Edit3 size={18} strokeWidth={3} /></button>
      </div>

      {/* 倒數計時標籤 */}
      {(() => {
        const cd = getCountdown(item.date, item.entryTime, t, language);
        return cd && (
          <div className={`absolute top-2 left-2 z-30 px-2.5 py-0.5 rounded-lg border-2 border-p3-navy text-[8px] font-black text-white shadow-glass-deep-sm -rotate-3 ${cd.color}`}>
            {cd.text}
          </div>
        );
      })()}

      <div className="p-5 relative bg-[#FFFAF0] border-b-[3px] border-dashed border-gray-300">
        <div className="flex justify-between items-start mb-2">
          <div className="bg-splat-yellow border-2 border-p3-navy px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-p3-navy shadow-sm">🎫 SPOT TICKET</div>
        </div>
        <h3 className="font-black text-xl text-p3-navy leading-tight pr-4 truncate font-['Barlow']">{item.title}</h3>
      </div>

      <div className="p-5 bg-white flex items-center relative">
        {/* Perforation line */}
        <div className="absolute top-0 bottom-0 right-[88px] w-0 border-l-[2.5px] border-dashed border-gray-200" />

        <div className="flex-1 space-y-4 pr-6">
          <div className="grid grid-cols-2 gap-3 font-['Barlow']">
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Date</div>
              <div className="font-black text-sm text-p3-navy tabular-nums">{item.date}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Entry</div>
              <div className="font-black text-sm text-splat-pink tabular-nums">{item.entryTime || 'ALL DAY'}</div>
            </div>
          </div>

          {item.meetingPoint && (
            <div className="bg-splat-blue/5 border-2 border-splat-blue/20 rounded-xl p-2.5">
              <div className="text-[8px] font-black text-splat-blue uppercase tracking-widest mb-0.5">Meeting Point</div>
              <div className="font-bold text-[11px] text-p3-navy leading-snug truncate">{item.meetingPoint}</div>
            </div>
          )}

          <CopyableField label="CONFIRMATION NO." value={item.confirmationNo} onCopy={() => onCopy('#2932CF')} />
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

      <div className="absolute top-[88px] -left-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[0.5px] border-p3-navy z-10 shadow-inner" />
      <div className="absolute top-[88px] -right-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[0.5px] border-p3-navy z-10 shadow-inner" />
    </motion.div>
  );
};

const VoucherCard = ({ item, t, language, onEdit, onViewDetails, onQrClick, onCopy }: any) => {
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => { if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); } };

  return (
    <motion.div whileTap={{ scale: 0.98 }} className="glass-card shadow-glass-soft cursor-pointer overflow-hidden flex relative border-[0.5px] border-white/40" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-30 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-p3-gold border-[0.5px] border-white/20 rounded-full text-white shadow-glass-soft"><Edit3 size={18} strokeWidth={3} /></button>
      </div>

      {/* 倒數計時標籤 */}
      {(() => {
        const cd = getCountdown(item.date, undefined, t, language);
        return cd && (
          <div className={`absolute top-2 left-2 z-40 px-2.5 py-0.5 rounded-lg border-2 border-p3-navy text-[8px] font-black text-white shadow-glass-deep-sm -rotate-3 ${cd.color}`}>
            {cd.text}
          </div>
        );
      })()}

      <div className="w-10 bg-[#FF8A00] border-r-[3px] border-p3-navy flex flex-col items-center justify-center py-4 relative shrink-0">
        <span className="text-[11px] font-black text-white uppercase tracking-[0.4em] -rotate-90 whitespace-nowrap drop-shadow-md z-10 font-['Barlow']">VOUCHER</span>
      </div>

      <div className="flex-1 p-5 flex items-center relative">
        <div className="absolute top-0 bottom-0 right-[88px] w-0 border-l-[2.5px] border-dashed border-gray-200" />
        <div className="flex-1 pr-6 space-y-3 font-['Barlow']">
          <h3 className="font-black text-[17px] text-p3-navy leading-tight pr-2">{item.title}</h3>

          <div className="space-y-2">
            <div className="flex gap-2 text-[10px] bg-gray-50 p-2 rounded-xl border-2 border-gray-100">
              <div className="flex-1">
                <div className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Valid Date</div>
                <div className="font-black text-p3-navy tabular-nums">{item.date}</div>
              </div>
              {item.endDate && (
                <>
                  <div className="w-[1.5px] bg-gray-200 my-0.5 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">End Date</div>
                    <div className="font-black text-p3-navy tabular-nums">{item.endDate}</div>
                  </div>
                </>
              )}
            </div>

            {item.exchangeLocation && (
              <div className="bg-orange-50 border-2 border-orange-200/60 rounded-xl p-2.5">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[8px] font-black text-[#FF8A00] uppercase tracking-widest flex items-center gap-1.5"><MapPin size={10} /> Exchange</div>
                  {item.exchangeHours && <span className="text-[7px] font-black bg-white px-1.5 py-0.5 rounded border border-orange-200 text-[#FF8A00]">{item.exchangeHours}</span>}
                </div>
                <div className="font-black text-[11px] text-p3-navy leading-snug truncate">{item.exchangeLocation}</div>
              </div>
            )}

            <CopyableField label="VOUCHER CODE" value={item.confirmationNo} onCopy={() => onCopy('#FF8A00')} />
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
              <Ticket size={28} />
              <span className="text-[8px] font-black">VOUCHER</span>
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-1/2 -mt-3 -left-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[0.5px] border-p3-navy z-20 shadow-inner" />
      <div className="absolute top-1/2 -mt-3 -right-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[0.5px] border-p3-navy z-20 shadow-inner" />
    </motion.div>
  );
};
