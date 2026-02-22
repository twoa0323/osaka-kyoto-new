import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { 
  Plane, Home, MapPin, Plus, Edit3, Globe, QrCode, 
  ArrowRight, X, Luggage, Phone, Camera, Ticket 
} from 'lucide-react';
import { BookingItem } from '../types';
import { BookingEditor } from './BookingEditor';
import { motion, AnimatePresence } from 'framer-motion';

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

export const Booking = () => {
  const { trips, currentTripId, deleteBookingItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [activeSubTab, setActiveSubTab] = useState<'flight' | 'hotel' | 'spot' | 'voucher'>('flight');
  const [editingItem, setEditingItem] = useState<BookingItem | undefined>();
  const [detailItem, setDetailItem] = useState<BookingItem | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  // 新增：QR Code 全螢幕亮點狀態
  const [focusedQr, setFocusedQr] = useState<string | null>(null);

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
                <div key={item.id}>
                  {item.type === 'flight' && <FlightCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} />}
                  {item.type === 'hotel' && <HotelCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} />}
                  {item.type === 'spot' && <SpotCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} />}
                  {item.type === 'voucher' && <VoucherCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} onQrClick={setFocusedQr} />}
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
          <Plus strokeWidth={3}/> 新增{activeSubTab === 'flight' ? '航班' : '預訂'}
        </motion.button>
      </div>

      {/* 3. 詳情 Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-splat-dark/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => setDetailItem(undefined)}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-[#F4F5F7] w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-[8px_8px_0px_#1A1A1A] overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto hide-scrollbar">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-black text-splat-dark uppercase pr-8">{detailItem.title}</h2>
                <button onClick={() => setDetailItem(undefined)} className="p-2 bg-white rounded-full border-2 border-splat-dark shadow-sm active:scale-90 transition-transform"><X size={16} strokeWidth={3}/></button>
              </div>
              {detailItem.images?.[0] && <img src={detailItem.images[0]} loading="lazy" decoding="async" className="w-full aspect-video rounded-2xl object-cover border-[3px] border-splat-dark shadow-splat-solid-sm" />}
              <div className="bg-white p-4 border-[3px] border-splat-dark rounded-xl shadow-sm">
                 <p className="text-sm text-gray-700 font-bold whitespace-pre-wrap leading-relaxed">{detailItem.note || "尚無備註資訊"}</p>
              </div>
              {detailItem.qrCode && (
                <div onClick={() => setFocusedQr(detailItem.qrCode!)} className="bg-white p-4 rounded-2xl flex flex-col items-center gap-2 border-[3px] border-splat-dark shadow-splat-solid-sm cursor-zoom-in active:scale-95 transition-transform">
                  <img src={detailItem.qrCode} className="w-40 h-40 object-contain" alt="QR" />
                  <span className="text-[10px] font-black text-splat-pink uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-md">Tap to Scan</span>
                </div>
              )}
              {detailItem.website && <a href={detailItem.website} target="_blank" rel="noreferrer" className="btn-splat w-full py-4 bg-splat-blue text-white flex items-center justify-center gap-2 font-black"><Globe size={18}/> 前往官方網站</a>}
            </div>
          </motion.div>
        </div>
      )}

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
                <p className="text-2xl font-black text-splat-dark uppercase tracking-widest italic animate-pulse">Scan Me! 🦑</p>
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
// 各類型獨立卡片組件 (保留原版面 + 融入 Apple Wallet 實體齒孔與 QrCode 點擊)
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
    <motion.div whileTap={{ scale: 0.98 }} className="relative bg-[#FDFBF7] rounded-[2rem] overflow-hidden border-[3px] border-splat-dark shadow-splat-solid group cursor-pointer" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-30 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm hover:scale-110 transition-transform">
          <Edit3 size={18} strokeWidth={3}/>
        </button>
      </div>

      <div className={`relative h-16 w-full flex items-center px-6 border-b-[3px] border-splat-dark ${theme.bgClass}`}>
         {theme.logoHtml}
      </div>

      <div className="relative w-full pt-6 pb-6 px-5 flex items-center">
         {/* 垂直齒線 */}
         <div className="absolute top-0 bottom-0 right-[88px] w-0 border-l-[2.5px] border-dashed border-gray-300" />
         
         <div className="flex-1 pr-6 border-r-2 border-transparent">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col items-center">
                <span className="text-[26px] font-black text-gray-400 tracking-widest uppercase mb-1">{item.depIata || 'TPE'}</span>
                <span className="text-[40px] leading-none font-black text-[#1A1917] tracking-tighter">{item.depTime || '--:--'}</span>
                <span className="mt-2 text-[#447A5A] text-[11px] font-bold tracking-widest uppercase">{item.depCity || '出發地'}</span>
              </div>
              <div className="flex flex-col items-center flex-1 px-3">
                <span className="text-[10px] font-bold text-[#6D6A65] mb-1">{formatDurationDisplay(item.duration)}</span>
                <div className="w-full flex items-center text-[#4A72C8]">
                  <div className="h-[2px] flex-1 bg-gray-300 border-dashed border-t-[2px]"></div>
                  <Plane size={20} className="mx-2 fill-current rotate-45" />
                  <div className="h-[2px] flex-1 bg-gray-300 border-dashed border-t-[2px]"></div>
                </div>
                <span className="text-[10px] font-bold text-gray-400 mt-1 tracking-widest">{item.date?.replace(/-/g, '/')}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[26px] font-black text-gray-400 tracking-widest uppercase mb-1">{item.arrIata || 'KIX'}</span>
                <span className="text-[40px] leading-none font-black text-[#1A1917] tracking-tighter">{item.arrTime || '--:--'}</span>
                <span className="mt-2 text-[#B3936E] text-[11px] font-bold tracking-widest uppercase">{item.arrCity || '目的地'}</span>
              </div>
            </div>
            
            <div className="flex gap-4">
               <div className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl p-2 text-center">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Flight No.</p>
                  <p className="font-black text-sm text-splat-dark">{item.flightNo || '---'}</p>
               </div>
               <div className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl p-2 text-center">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Seat</p>
                  <p className="font-black text-sm text-splat-dark">{item.seat || '---'}</p>
               </div>
            </div>
         </div>

         {/* QR Code 預覽區塊 */}
         <div className="w-[80px] h-[80px] flex items-center justify-center shrink-0 pl-4 z-10 bg-transparent">
            {item.qrCode ? (
               <motion.div 
                 whileHover={{ scale: 1.1 }} 
                 onClick={(e) => { e.stopPropagation(); onQrClick(item.qrCode!); }}
                 className="cursor-zoom-in bg-white p-1 border-2 border-gray-200 rounded-xl shadow-inner relative group"
               >
                 <img src={item.qrCode} className="w-14 h-14 object-contain" alt="QR" />
                 <div className="absolute inset-0 bg-splat-blue/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                   <Plus size={16} className="text-splat-blue" strokeWidth={4}/>
                 </div>
               </motion.div>
            ) : (
               <div className="text-gray-300 opacity-50 flex flex-col items-center gap-1">
                 <QrCode size={24} />
                 <span className="text-[8px] font-black">NO QR</span>
               </div>
            )}
         </div>
      </div>

      {/* 經典票券左右半圓齒孔 */}
      <div className="absolute top-[64px] -left-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[3px] border-splat-dark z-10 shadow-inner" />
      <div className="absolute top-[64px] -right-3 w-6 h-6 bg-[#F4F5F7] rounded-full border-[3px] border-splat-dark z-10 shadow-inner" />
    </motion.div>
  );
};

const HotelCard = ({ item, onEdit, onViewDetails, onQrClick }: any) => {
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => { if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); } };

  return (
    <motion.div whileTap={{ scale: 0.98 }} className="bg-white rounded-[2rem] border-[3px] border-splat-dark shadow-splat-solid overflow-hidden relative cursor-pointer" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3}/></button>
      </div>
      
      <div className="h-32 bg-gray-200 relative border-b-[3px] border-splat-dark">
        {item.images?.[0] ? ( <img src={item.images[0]} className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full flex items-center justify-center bg-splat-pink/10"><Home size={40} className="text-splat-pink/40"/></div> )}
        <div className="absolute top-3 left-3 bg-white border-2 border-splat-dark px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-splat-dark shadow-[2px_2px_0px_#1A1A1A]">HOTEL</div>
      </div>
      
      <div className="p-5 flex items-center relative">
         {/* 垂直齒線 */}
         <div className="absolute top-0 bottom-0 right-[88px] w-0 border-l-[2.5px] border-dashed border-gray-200" />
         
         <div className="flex-1 pr-6 space-y-4">
            <h3 className="font-black text-xl text-splat-dark leading-tight pr-4">{item.title}</h3>
            
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-2 text-center">
                 <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Check-in</div>
                 <div className="font-black text-sm text-splat-dark">{item.date}</div>
              </div>
              <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-2 text-center">
                 <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Check-out</div>
                 <div className="font-black text-sm text-splat-dark">{item.endDate || '-'}</div>
              </div>
            </div>

            <div className="flex items-start gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 p-2 rounded-xl border-2 border-gray-100">
               <MapPin size={14} className="shrink-0 text-splat-pink mt-0.5"/>
               <span className="leading-snug truncate">{item.location || '地址待確認'}</span>
            </div>
         </div>
         
         {/* QR Code 預覽區塊 */}
         <div className="w-[80px] flex flex-col items-center justify-center shrink-0 pl-2 z-10 gap-3">
            {item.qrCode ? (
               <motion.div whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); onQrClick(item.qrCode!); }} className="cursor-zoom-in bg-white p-1 border-2 border-gray-100 rounded-xl shadow-inner relative group">
                 <img src={item.qrCode} className="w-14 h-14 object-contain" alt="QR" />
                 <div className="absolute inset-0 bg-splat-blue/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"><Plus size={16} className="text-splat-blue" strokeWidth={4}/></div>
               </motion.div>
            ) : (
               <div className="text-center shrink-0 bg-gray-50 rounded-xl px-2 py-3 border-2 border-gray-200">
                 <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Nights</div>
                 <div className="font-black text-splat-dark text-lg leading-none">{item.nights || 1}</div>
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
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3}/></button>
      </div>
      
      <div className="p-5 border-b-[3px] border-dashed border-gray-300 relative bg-[#FFFAF0]">
        <div className="flex justify-between items-start mb-3">
          <div className="bg-splat-yellow border-2 border-splat-dark px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-splat-dark shadow-sm">🎫 SPOT TICKET</div>
        </div>
        <h3 className="font-black text-xl text-splat-dark leading-tight pr-4 truncate">{item.title}</h3>
      </div>

      <div className="p-5 bg-white flex items-center relative">
         <div className="absolute top-0 bottom-0 right-[88px] w-0 border-l-[2.5px] border-dashed border-gray-200" />
         
         <div className="flex-1 grid grid-cols-2 gap-y-3 gap-x-2 pr-6">
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Date</div>
              <div className="font-black text-sm text-splat-dark">{item.date}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Entry Time</div>
              <div className="font-black text-sm text-splat-pink">{item.entryTime || '不限時間'}</div>
            </div>
            <div className="col-span-2 mt-1">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Location</div>
              <div className="font-bold text-xs text-splat-dark truncate">{item.location || '---'}</div>
            </div>
         </div>

         <div className="w-[80px] flex items-center justify-center shrink-0 pl-2 z-10 bg-white">
            {item.qrCode ? (
               <motion.div whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); onQrClick(item.qrCode!); }} className="cursor-zoom-in bg-white p-1.5 border-2 border-gray-100 rounded-xl shadow-inner relative group">
                 <img src={item.qrCode} className="w-14 h-14 object-cover" />
                 <div className="absolute inset-0 bg-splat-blue/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"><Plus size={16} className="text-splat-blue" strokeWidth={4}/></div>
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
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3}/></button>
      </div>
      
      <div className="w-10 bg-[#FF8A00] border-r-[3px] border-splat-dark flex flex-col items-center justify-center py-4 relative shrink-0">
         <span className="text-[11px] font-black text-white uppercase tracking-[0.4em] -rotate-90 whitespace-nowrap drop-shadow-md z-10">VOUCHER</span>
      </div>
      
      <div className="flex-1 p-5 flex items-center relative">
         <div className="absolute top-0 bottom-0 right-[88px] w-0 border-l-[2.5px] border-dashed border-gray-200" />
         
         <div className="flex-1 pr-6 space-y-3">
            <h3 className="font-black text-[17px] text-splat-dark leading-tight pr-2">{item.title}</h3>
            <div className="flex gap-3 text-sm bg-gray-50 p-2 rounded-xl border-2 border-gray-100">
              <div className="flex-1">
                <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Valid Date</div>
                <div className="font-black text-splat-dark text-xs">{item.date}</div>
              </div>
              {item.endDate && (
                <>
                  <div className="w-[2px] bg-gray-200 my-1 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">End Date</div>
                    <div className="font-black text-splat-dark text-xs">{item.endDate}</div>
                  </div>
                </>
              )}
            </div>
            {item.exchangeLocation && (
              <div className="bg-orange-50 border-2 border-orange-200/60 rounded-xl p-2.5">
                <div className="text-[8px] font-black text-[#FF8A00] uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><MapPin size={10}/> Exchange</div>
                <div className="font-black text-[11px] text-splat-dark leading-snug truncate">{item.exchangeLocation}</div>
              </div>
            )}
         </div>

         <div className="w-[80px] flex items-center justify-center shrink-0 pl-2 z-10 bg-white">
            {item.qrCode ? (
               <motion.div whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); onQrClick(item.qrCode!); }} className="cursor-zoom-in bg-white p-1.5 border-2 border-gray-100 rounded-xl shadow-inner relative group">
                 <img src={item.qrCode} className="w-14 h-14 object-contain" />
                 <div className="absolute inset-0 bg-splat-blue/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"><Plus size={16} className="text-splat-blue" strokeWidth={4}/></div>
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













