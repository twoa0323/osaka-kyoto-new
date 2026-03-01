import { useState, useEffect, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
  Plane, Home, MapPin, Plus, Edit3, Globe, QrCode,
  ArrowRight, X, Luggage, Phone, Camera, Ticket, Download, CheckCircle2, Calendar, Clock, Trash2,
  ChevronDown
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
import { getAirlineTheme } from './schedule/ScheduleConstants';
import { triggerHaptic } from '../utils/haptics';
import { SwipeableItem, InkSplat } from './Common';
import { Copy } from 'lucide-react';

// Removed local AIRLINE_THEMES in favor of getAirlineTheme from ScheduleConstants

// 子分頁顏色
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

  const [focusedQr, setFocusedQr] = useState<string | null>(null);
  const [splatColor, setSplatColor] = useState<string | null>(null);
  const [cachedUrls, setCachedUrls] = useState<Set<string>>(new Set());

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
  const bookings = useMemo(() => {
    return (trip.bookings || [])
      .filter(b => b.type === activeSubTab)
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  }, [trip.bookings, activeSubTab]);

  return (
    <div className="px-4 space-y-6 animate-fade-in pb-28 text-left h-full">

      {/* 1. 子選單導航列 */}
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

      {/* 2. 票券列表 */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {bookings.length === 0 ? (
              <div className="text-center py-16 bg-white border-[0.5px] border-dashed border-gray-400 glass-card text-gray-500 font-black italic shadow-sm uppercase">
                {t('booking.emptyPocket')}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {bookings.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  >
                    <SwipeableItem
                      id={item.id}
                      onDelete={() => deleteBookingItem(trip.id, item.id)}
                      className="rounded-[2.5rem]"
                    >
                      {item.type === 'flight' && <FlightCard item={item} t={t} language={language} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} onCopy={(color: string) => { setSplatColor(color); setTimeout(() => setSplatColor(null), 1000); triggerHaptic('success'); }} />}
                      {item.type === 'hotel' && <HotelCard item={item} t={t} language={language} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} onCopy={(color: string) => { setSplatColor(color); setTimeout(() => setSplatColor(null), 1000); triggerHaptic('success'); }} />}
                      {item.type === 'spot' && <SpotCard item={item} t={t} language={language} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} onCopy={(color: string) => { setSplatColor(color); setTimeout(() => setSplatColor(null), 1000); triggerHaptic('success'); }} />}
                      {item.type === 'voucher' && <VoucherCard item={item} t={t} language={language} onEdit={(e: any) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} onCopy={(color: string) => { setSplatColor(color); setTimeout(() => setSplatColor(null), 1000); triggerHaptic('success'); }} />}
                    </SwipeableItem>
                  </motion.div>
                ))}
              </AnimatePresence>
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

      {/* 3. 詳情 Modal (重寫版：符合 List Card 的新設計) */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4" onClick={() => setDetailItem(undefined)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#F8F9FA] w-full max-w-sm rounded-[2.5rem] border-[4px] border-p3-navy shadow-glass-deep overflow-hidden relative flex flex-col max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Top Right Action Buttons (Hidden in favor of bottom actions or internal header icons) */}
              <div className="absolute top-4 right-4 z-50 flex gap-2 hidden">
                <button onClick={() => { setEditingItem(detailItem); setIsEditorOpen(true); }} className="w-10 h-10 bg-white rounded-full border-[1.5px] border-p3-navy flex items-center justify-center text-p3-navy shadow-sm active:scale-90"><Edit3 size={18} strokeWidth={2.5} /></button>
                <button onClick={() => { deleteBookingItem(trip.id, detailItem.id); setDetailItem(undefined); }} className="w-10 h-10 bg-white rounded-full border-[1.5px] border-p3-navy flex items-center justify-center text-p3-ruby shadow-sm active:scale-90"><Trash2 size={18} strokeWidth={2.5} /></button>
                <button onClick={() => setDetailItem(undefined)} className="w-10 h-10 bg-white rounded-full border-[1.5px] border-p3-navy flex items-center justify-center text-p3-navy shadow-sm active:scale-90"><X size={20} strokeWidth={2.5} /></button>
              </div>

              <div className="p-2 pt-6 overflow-y-auto hide-scrollbar flex-1 flex flex-col">

                {/* ✈️ FLIGHT MODAL (使用 FlightCard 相同設計語言) */}
                {detailItem.type === 'flight' && (
                  <div className="relative bg-[#F4F4F4] rounded-[32px] overflow-hidden border-[1px] border-black/5 p-2 mb-8">
                    <div className="bg-white rounded-[24px] overflow-hidden relative shadow-sm h-full flex flex-col group/modalcard">
                      {/* Header - Dynamic based on airline */}
                      <div className={`${getTheme(detailItem.airline).bgClass} h-[90px] w-full relative flex items-center justify-center`}>
                        {detailItem.airline?.toLowerCase().includes('starlux') && (
                          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px', opacity: 0.3 }} />
                        )}
                        <div className="flex items-center gap-2 z-10 pl-1 relative">
                          {getTheme(detailItem.airline).logoHtml}
                        </div>
                        {/* Subtle Edit Icon inside header */}
                        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover/modalcard:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setEditingItem(detailItem); setIsEditorOpen(true); }} className="p-2 bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/30 active:scale-90 transition-all">
                            <Edit3 size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>

                      {/* Overlapping Pill - White layer style */}
                      <div className="absolute top-[70px] left-1/2 -translate-x-1/2 bg-white px-8 py-2.5 rounded-[20px] shadow-md border border-gray-100 z-20 min-w-[120px] text-center">
                        <span className="text-[17px] font-black text-gray-500 tracking-widest leading-none font-sans uppercase">{detailItem.flightNo || 'JX820'}</span>
                      </div>

                      {/* Main Body */}
                      <div className="relative pt-16 pb-4 px-6 bg-white flex-1 shadow-[inset_0_4px_10px_rgba(0,0,0,0.01)]">

                        {/* Time & City Grid */}
                        <div className="flex justify-between items-center w-full px-2 mb-4">
                          {/* Departure */}
                          <div className="flex flex-col items-center w-[30%]">
                            <span className="text-2xl font-black text-[#A1A5AE] tracking-widest mb-1.5 font-sans uppercase">{detailItem.depIata || 'TPE'}</span>
                            <span className="text-[44px] font-[900] text-[#161C2C] leading-none tracking-tight mb-3 font-sans -ml-1">{detailItem.depTime || '08:30'}</span>
                            <div className="bg-[#247F46] text-white text-[13px] font-bold px-4 py-1.5 rounded-full tracking-wider leading-none whitespace-nowrap">{detailItem.depCity || '台北'}</div>
                          </div>

                          {/* Center - Raised plane icon to fix overlap */}
                          <div className="flex flex-col items-center justify-center flex-1 -mt-8 mx-2 relative z-10">
                            <span className="text-[12px] font-bold text-[#868B98] mb-2 tracking-wider">{detailItem.duration || '02h 45m'}</span>
                            <div className="w-full flex items-center justify-center gap-2 mb-2">
                              <Plane size={24} className="text-[#3269F5] rotate-90 transform shrink-0 fill-current" />
                            </div>
                            <span className="text-[12px] font-bold text-[#868B98] tracking-wider relative -bottom-2">{detailItem.date ? detailItem.date.replace(/-/g, '/') : '2026/04/25'}</span>
                          </div>

                          {/* Arrival */}
                          <div className="flex flex-col items-center w-[30%]">
                            <span className="text-2xl font-black text-[#A1A5AE] tracking-widest mb-1.5 font-sans uppercase">{detailItem.arrIata || 'KIX'}</span>
                            <span className="text-[44px] font-[900] text-[#161C2C] leading-none tracking-tight mb-3 font-sans -ml-1">{detailItem.arrTime || '12:15'}</span>
                            <div className="bg-[#BB966A] text-white text-[13px] font-bold px-4 py-1.5 rounded-full tracking-wider leading-none whitespace-nowrap">{detailItem.arrCity || '大阪'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Info Box */}
                      <div className="mx-4 mb-4 bg-[#F8F9FA] rounded-[20px] p-4 flex items-center justify-between border-t border-gray-100 z-10 relative">
                        <div className="flex flex-col flex-1 items-center justify-center w-[33%]">
                          <span className="text-[10px] font-black text-[#A1A5AE] tracking-[0.15em] mb-1.5 font-sans">BAGGAGE</span>
                          <div className="flex items-center gap-1.5 overflow-hidden w-full justify-center">
                            <span className="text-[14px] font-[900] text-[#161C2C] tracking-tight truncate flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#64A999] shrink-0"><rect x="5" y="6" width="14" height="16" rx="2" /><path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" /><line x1="12" y1="11" x2="12" y2="17" /></svg>{detailItem.baggage || detailItem.baggageAllowance || '23kg'}</span>
                          </div>
                        </div>
                        <div className="w-[1.5px] h-8 bg-[#EAECEF] shrink-0" />
                        <div className="flex flex-col flex-1 items-center justify-center w-[33%]">
                          <span className="text-[10px] font-black text-[#A1A5AE] tracking-[0.15em] mb-1.5 font-sans">SEAT</span>
                          <div className="flex items-center gap-1 overflow-hidden w-full justify-center">
                            <span className="text-[14px] font-[900] text-[#161C2C] tracking-tight truncate">{detailItem.seat || '14F'}</span>
                          </div>
                        </div>
                        <div className="w-[1.5px] h-8 bg-[#EAECEF] shrink-0" />
                        <div className="flex flex-col flex-1 items-center justify-center w-[33%]">
                          <span className="text-[10px] font-black text-[#A1A5AE] tracking-[0.15em] mb-1.5 font-sans">AIRCRAFT</span>
                          <div className="flex items-center gap-1.5 overflow-hidden w-full justify-center">
                            <span className="text-[14px] font-[900] text-[#161C2C] tracking-tight truncate flex items-center gap-1.5"><Plane size={14} className="text-[#C19163] -rotate-45 transform fill-current shrink-0" />{detailItem.aircraft || 'A350-900'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🏨 HOTEL MODAL (使用 HotelCard 相同設計語言) */}
                {detailItem.type === 'hotel' && (
                  <div className="space-y-4">
                    <div className="bg-[#0A142E] rounded-[2rem] shadow-sm border border-gray-900 overflow-hidden relative">

                      <div className="h-48 relative">
                        {detailItem.images?.[0] ? (
                          <img src={detailItem.images[0]} className="w-full h-full object-cover" alt="hotel" />
                        ) : (
                          <div className="w-full h-full bg-[#0d1b3a] flex items-center justify-center text-white/5"><Home size={64} /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A142E] via-[#0A142E]/60 to-transparent"></div>

                        <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
                          <h3 className="text-white font-black text-2xl leading-tight drop-shadow-md w-2/3">{detailItem.title}</h3>
                          <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full">{detailItem.nights || 1} NIGHTS</span>
                        </div>
                      </div>

                      <div className="p-5 relative">
                        {/* Check-in Console (Glassmorphism) */}
                        <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl rounded-[1.5rem] p-4 border border-white/10 mb-4">
                          <div>
                            <span className="text-[9px] font-black text-white/40 tracking-widest uppercase">{t('schedule.checkIn') || 'CHECK-IN'}</span>
                            <div className="font-black text-2xl text-white tabular-nums">{detailItem.checkInTime || '15:00'}</div>
                            <div className="text-[10px] font-bold text-white/60">{detailItem.date}</div>
                          </div>
                          <div className="text-white/20">➔</div>
                          <div className="text-right">
                            <span className="text-[9px] font-black text-white/40 tracking-widest uppercase">{t('schedule.checkOut') || 'CHECK-OUT'}</span>
                            <div className="font-black text-2xl text-white tabular-nums">{detailItem.checkOutTime || '11:00'}</div>
                            <div className="text-[10px] font-bold text-white/60">{detailItem.endDate || detailItem.date}</div>
                          </div>
                        </div>

                        <div className="border border-white/10 rounded-[1.5rem] p-4 space-y-4 bg-white/5">
                          <div className="flex items-start gap-3">
                            <MapPin size={16} className="text-p3-gold mt-0.5" />
                            <div>
                              <div className="text-[9px] font-black text-white/40 tracking-widest uppercase">{t('booking.editor.location') || 'ADDRESS'}</div>
                              <div className="text-sm font-bold text-white leading-snug">{detailItem.location || 'See map for details'}</div>
                            </div>
                          </div>
                          <div className="h-[1px] bg-white/10"></div>
                          <div className="flex items-start gap-3">
                            <Home size={16} className="text-white mt-0.5" />
                            <div>
                              <div className="text-[9px] font-black text-white/40 tracking-widest uppercase">{t('schedule.roomType') || 'ROOM TYPE'}</div>
                              <div className="text-sm font-bold text-white leading-snug">{detailItem.roomType || 'Standard Room'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button className="col-span-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-xs text-p3-navy shadow-sm flex items-center justify-center gap-2"><Phone size={14} /> {t('schedule.contact') || 'CONTACT'}</button>
                      <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location || detailItem.title)}`, '_blank')} className="col-span-2 py-4 bg-[#1E2A5E] text-white rounded-2xl font-black text-xs shadow-glass-deep flex items-center justify-center gap-2 tracking-widest"><MapPin size={14} /> {t('schedule.openGoogleMaps') || 'OPEN MAPS'}</button>
                    </div>
                  </div>
                )}

                {/* Spot & Voucher Fallback */}
                {(detailItem.type === 'spot' || detailItem.type === 'voucher') && (
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 text-center">
                    {detailItem.qrCode && <img src={detailItem.qrCode} className="w-48 h-48 mx-auto object-contain mb-4" alt="QR" />}
                    <h3 className="text-xl font-black text-p3-navy mb-2">{detailItem.title}</h3>
                    <p className="text-xs text-gray-500 font-bold">{detailItem.note}</p>
                  </div>
                )}

              </div>
              {/* Bottom Close Button */}
              <div className="mt-auto p-4 bg-white border-t border-gray-100 flex justify-center sticky bottom-0 z-40">
                <button onClick={() => setDetailItem(undefined)} className="w-full py-4 bg-p3-navy text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all shadow-md">
                  Close
                </button>
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
// 各類型獨立卡片組件 (Pixel-Perfect Overwrites)
// ============================================================================

const FlightCard = ({ item, t, language, onEdit, onViewDetails, onQrClick }: any) => {
  const [showActions, setShowActions] = useState(false);

  if (!item) return null;

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
      className="relative bg-[#F4F4F4] rounded-[32px] overflow-hidden group cursor-pointer border-[1px] border-black/5 p-2"
      onClick={handleCardClick}
    >
      <div className="bg-white rounded-[24px] overflow-hidden relative shadow-sm h-full flex flex-col">
        {/* Header - Dynamic based on airline theme */}
        <div className={`${getAirlineTheme(item.airline).bgClass} h-[90px] w-full relative flex items-center justify-center`}>
          {item.airline?.toLowerCase().includes('starlux') && (
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px', opacity: 0.3 }} />
          )}
          <div className="flex items-center gap-2 z-10 pl-1 relative">
            {getAirlineTheme(item.airline).logoHtml}
          </div>
        </div>

        {/* Overlapping Pill - White layer style */}
        <div className="absolute top-[70px] left-1/2 -translate-x-1/2 bg-white px-8 py-2.5 rounded-[20px] shadow-md border border-gray-100 z-20 min-w-[120px] text-center">
          <span className="text-[17px] font-black text-gray-500 tracking-widest leading-none font-sans uppercase">{item.flightNo || 'JX820'}</span>
        </div>

        {/* Main Body */}
        <div className="relative pt-16 pb-4 px-6 bg-white flex-1 shadow-[inset_0_4px_10px_rgba(0,0,0,0.01)]">

          {/* Time & City Grid */}
          <div className="flex justify-between items-center w-full px-2 mb-2">
            {/* Departure */}
            <div className="flex flex-col items-center w-[30%]">
              <span className="text-2xl font-black text-[#A1A5AE] tracking-widest mb-1.5 font-sans uppercase">{item.depIata || 'TPE'}</span>
              <span className="text-[44px] font-[900] text-[#161C2C] leading-none tracking-tight mb-3 font-sans -ml-1">{item.depTime || '08:30'}</span>
              <div className="bg-[#247F46] text-white text-[13px] font-bold px-4 py-1.5 rounded-full tracking-wider leading-none whitespace-nowrap">{item.depCity || '台北'}</div>
            </div>

            {/* Center - Raised plane icon to fix overlap */}
            <div className="flex flex-col items-center justify-center flex-1 -mt-8 mx-2 relative z-10">
              <span className="text-[12px] font-bold text-[#868B98] mb-2 tracking-wider">{item.duration || '02h 45m'}</span>
              <div className="w-full flex items-center justify-center gap-2 mb-2">
                <Plane size={24} className="text-[#3269F5] rotate-90 transform shrink-0 fill-current" />
              </div>
              <span className="text-[12px] font-bold text-[#868B98] tracking-wider relative -bottom-2">{item.date ? item.date.replace(/-/g, '/') : '2026/04/25'}</span>
            </div>

            {/* Arrival */}
            <div className="flex flex-col items-center w-[30%]">
              <span className="text-2xl font-black text-[#A1A5AE] tracking-widest mb-1.5 font-sans uppercase">{item.arrIata || 'KIX'}</span>
              <span className="text-[44px] font-[900] text-[#161C2C] leading-none tracking-tight mb-3 font-sans -ml-1">{item.arrTime || '12:15'}</span>
              <div className="bg-[#BB966A] text-white text-[13px] font-bold px-4 py-1.5 rounded-full tracking-wider leading-none whitespace-nowrap">{item.arrCity || '大阪'}</div>
            </div>
          </div>
        </div>

        {/* Footer Info Box */}
        <div className="mx-4 mb-4 bg-[#F8F9FA] rounded-[20px] p-4 flex items-center justify-between border-t border-gray-100 z-10 relative">
          <div className="flex flex-col flex-1 items-center justify-center w-[33%]">
            <span className="text-[10px] font-black text-[#A1A5AE] tracking-[0.15em] mb-1.5 font-sans">BAGGAGE</span>
            <div className="flex items-center gap-1.5 overflow-hidden w-full justify-center">
              <Luggage size={14} className="text-[#64A999] shrink-0" strokeWidth={2.5} />
              <span className="text-[14px] font-[900] text-[#161C2C] tracking-tight truncate">{item.baggage || item.baggageAllowance || '23kg'}</span>
            </div>
          </div>
          <div className="w-[1.5px] h-8 bg-[#EAECEF] shrink-0" />
          <div className="flex flex-col flex-1 items-center justify-center w-[33%]">
            <span className="text-[10px] font-black text-[#A1A5AE] tracking-[0.15em] mb-1.5 font-sans">SEAT</span>
            <div className="flex items-center gap-1 overflow-hidden w-full justify-center">
              <span className="text-[14px] font-[900] text-[#161C2C] tracking-tight truncate">{item.seat || '14F'}</span>
            </div>
          </div>
          <div className="w-[1.5px] h-8 bg-[#EAECEF] shrink-0" />
          <div className="flex flex-col flex-1 items-center justify-center w-[33%]">
            <span className="text-[10px] font-black text-[#A1A5AE] tracking-[0.15em] mb-1.5 font-sans">AIRCRAFT</span>
            <div className="flex items-center gap-1.5 overflow-hidden w-full justify-center">
              <Plane size={14} className="text-[#C19163] -rotate-45 transform fill-current shrink-0" />
              <span className="text-[14px] font-[900] text-[#161C2C] tracking-tight truncate">{item.aircraft || 'A350-900'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 編輯按鈕 */}
      <div className={`absolute top-6 right-6 z-40 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={(e) => { e.stopPropagation(); onEdit(e); }} className="p-2.5 bg-white/20 backdrop-blur-md border-[1px] border-white/20 rounded-full text-white shadow-lg active:scale-90 transition-transform">
          <Edit3 size={18} strokeWidth={3} />
        </button>
      </div>
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
      className="relative bg-[#0A142E] rounded-[2.5rem] shadow-glass-deep overflow-hidden cursor-pointer group flex flex-col no-border min-h-[420px]"
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

