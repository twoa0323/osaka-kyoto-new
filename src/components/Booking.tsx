import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Plane, Home, MapPin, Plus, Edit3, Globe, QrCode, ArrowRight, X, Luggage, Phone, Camera, Ticket } from 'lucide-react';
import { BookingItem } from '../types';
import { BookingEditor } from './BookingEditor';

// 8大航空公司模板 (維持原樣)
const AIRLINE_THEMES: Record<string, any> = {
  tigerair: { bgClass: 'bg-[#F49818]', bgStyle: { backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 15px, #E57A0F 15px, #E57A0F 30px)' }, logoHtml: <span className="font-black text-white text-xl tracking-tight">tiger<span className="font-medium">air</span> <span className="text-sm font-normal">Taiwan</span></span>, },
  starlux: { bgClass: 'bg-[#181B26]', bgStyle: { backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }, logoHtml: <span className="font-serif text-[#C4A97A] text-2xl font-bold tracking-widest flex items-center gap-2"><span className="text-3xl rotate-45 text-[#E6C998]">✦</span> STARLUX</span>, },
  cathay: { bgClass: 'bg-[#006564]', bgStyle: {}, logoHtml: <span className="font-sans text-white text-xl font-bold tracking-widest flex items-center gap-2"><span className="text-3xl font-light scale-y-75 -scale-x-100">✔</span> CATHAY PACIFIC</span>, },
  china: { bgClass: 'bg-gradient-to-r from-[#8CAAE6] to-[#B0C4DE]', bgStyle: {}, logoHtml: <span className="font-serif text-[#002855] text-lg font-black tracking-widest flex items-center gap-2"><span className="text-[#FFB6C1] text-2xl">🌸</span> CHINA AIRLINES</span>, },
  eva: { bgClass: 'bg-[#007A53]', bgStyle: { backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '100% 10px' }, logoHtml: <span className="font-sans text-white text-2xl font-bold tracking-widest flex items-center gap-2"><span className="text-[#F2A900] text-3xl">⊕</span> EVA AIR</span>, },
  peach: { bgClass: 'bg-[#D93B8B]', bgStyle: {}, logoHtml: <span className="font-sans text-white text-4xl font-black tracking-tighter lowercase pr-2">peach</span>, },
  ana: { bgClass: 'bg-[#133261]', bgStyle: { backgroundImage: 'radial-gradient(ellipse at bottom, rgba(255,255,255,0.1) 0%, transparent 60%)' }, logoHtml: <span className="font-sans text-white text-3xl font-black italic tracking-widest flex gap-1 items-center">ANA <span className="flex flex-col gap-0.5 ml-1"><div className="w-4 h-1 bg-[#0088CE]"></div><div className="w-4 h-1 bg-[#0088CE]"></div></span></span>, },
  other: { bgClass: 'bg-splat-dark', bgStyle: {}, logoHtml: <span className="font-sans text-white text-xl font-black tracking-[0.2em]">BOARDING PASS</span>, }
};

const getTheme = (airline?: string) => {
  if (!airline) return AIRLINE_THEMES.other;
  const key = Object.keys(AIRLINE_THEMES).find(k => airline.toLowerCase().includes(k));
  return key ? AIRLINE_THEMES[key] : AIRLINE_THEMES.other;
};

// 📍 UI 調整 2：修改子分頁顏色，不再是純白
const SUBTAB_COLORS: Record<string, string> = {
  flight: 'bg-splat-blue',
  hotel: 'bg-splat-pink',
  spot: 'bg-splat-green',
  voucher: 'bg-splat-yellow'
};

export const Booking = () => {
  const { trips, currentTripId, deleteBookingItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [activeSubTab, setActiveSubTab] = useState<'flight' | 'hotel' | 'spot' | 'voucher'>('flight');
  const [editingItem, setEditingItem] = useState<BookingItem | undefined>();
  const [detailItem, setDetailItem] = useState<BookingItem | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  if (!trip) return null;
  const bookings = (trip.bookings || []).filter(b => b.type === activeSubTab);

  return (
    <div className="px-4 space-y-6 animate-fade-in pb-28 text-left h-full">
      {/* 固定子選單 (與原本風格結合，選中狀態加入專屬色彩) */}
      <div className="sticky top-0 z-20 py-2 bg-[#F4F5F7]">
        <div className="flex bg-white p-1.5 rounded-[32px] border-[3px] border-splat-dark shadow-splat-solid">
          {['flight', 'hotel', 'spot', 'voucher'].map((t: any) => {
            const isActive = activeSubTab === t;
            return (
              <button 
                key={t} 
                onClick={() => setActiveSubTab(t)} 
                className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-[24px] transition-all duration-300 font-black ${
                  isActive ? `${SUBTAB_COLORS[t]} text-white shadow-[2px_2px_0px_#1A1A1A] border-2 border-splat-dark` : 'text-gray-500 border-2 border-transparent hover:text-gray-700'
                }`}
              >
                {t === 'flight' ? <Plane size={20} /> : t === 'hotel' ? <Home size={20} /> : t === 'spot' ? <MapPin size={20} /> : <QrCode size={20} />}
                <span className="text-[9px] mt-1 uppercase tracking-widest">{t === 'flight' ? '機票' : t === 'hotel' ? '住宿' : t === 'spot' ? '景點' : '憑證'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        {bookings.length === 0 ? (
           <div className="text-center py-16 bg-white border-[3px] border-dashed border-gray-400 rounded-[32px] text-gray-500 font-black italic shadow-sm">
             尚無預訂資訊 📓
           </div>
        ) : (
          bookings.map(item => (
            <div key={item.id}>
              {item.type === 'flight' && <FlightCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} />}
              {item.type === 'hotel' && <HotelCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} />}
              {item.type === 'spot' && <SpotCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} />}
              {item.type === 'voucher' && <VoucherCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} />}
            </div>
          ))
        )}
        <button onClick={() => { setEditingItem(undefined); setIsEditorOpen(true); }} className="w-full py-5 bg-white border-[3px] border-dashed border-splat-dark shadow-splat-solid rounded-[32px] text-splat-dark font-black flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all"><Plus strokeWidth={3}/> 新增項目</button>
      </div>

      {detailItem && (
        <div className="fixed inset-0 bg-splat-dark/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => setDetailItem(undefined)}>
          <div className="bg-[#F4F5F7] w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-[8px_8px_0px_#1A1A1A] overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto hide-scrollbar">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-black text-splat-dark uppercase pr-8">{detailItem.title}</h2>
                <button onClick={() => setDetailItem(undefined)} className="p-2 bg-white rounded-full border-2 border-splat-dark shadow-sm"><X size={16} strokeWidth={3}/></button>
              </div>
              {detailItem.images?.[0] && <img src={detailItem.images[0]} loading="lazy" decoding="async" className="w-full aspect-video rounded-2xl object-cover border-[3px] border-splat-dark shadow-splat-solid-sm" />}
              <div className="bg-white p-4 border-[3px] border-splat-dark rounded-xl shadow-sm">
                 <p className="text-sm text-gray-700 font-bold whitespace-pre-wrap leading-relaxed">{detailItem.note || "尚無備註資訊"}</p>
              </div>
              {detailItem.qrCode && (
                <div className="bg-white p-4 rounded-2xl flex flex-col items-center gap-2 border-[3px] border-splat-dark shadow-splat-solid-sm">
                  <img src={detailItem.qrCode} className="w-40 h-40 object-contain" alt="QR" />
                  <span className="text-[10px] font-black text-splat-pink uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-md">Scan QR</span>
                </div>
              )}
              {detailItem.website && <a href={detailItem.website} target="_blank" rel="noreferrer" className="btn-splat w-full py-4 bg-splat-blue text-white flex items-center justify-center gap-2 font-black"><Globe size={18}/> 前往官方網站</a>}
            </div>
          </div>
        </div>
      )}
      {isEditorOpen && <BookingEditor tripId={trip.id} type={activeSubTab} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};

// --- FlightCard 保持前版優化設計 (IMG_6113/6120) ---
const FlightCard = ({ item, onEdit, onViewDetails }: any) => {
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
    <div className="relative active:scale-[0.98] transition-transform cursor-pointer group" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-30 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm hover:scale-110 transition-transform">
          <Edit3 size={18} strokeWidth={3}/>
        </button>
      </div>

      <div className="rounded-[2rem] overflow-hidden border-[3px] border-splat-dark shadow-splat-solid bg-[#FDFBF7]">
        <div className={`relative h-[88px] w-full flex items-center justify-center ${theme.bgClass}`} style={theme.bgStyle}>
           {theme.logoHtml}
        </div>
        <div className="relative w-full pt-10 pb-6 px-5 border-t-0 rounded-b-[2rem]">
          <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 bg-white px-8 py-2 border border-gray-100 text-gray-400 font-black rounded-full text-base shadow-sm tracking-widest z-10">
            {item.flightNo || 'FLIGHT'}
          </div>
          <div className="absolute left-6 top-6 bottom-6 border-l-[3px] border-dotted border-gray-300"></div>
          <div className="pl-6 pr-2">
            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col items-center">
                <span className="text-[26px] font-black text-gray-400 tracking-widest uppercase mb-1">{item.depIata || 'TPE'}</span>
                <span className="text-[46px] leading-none font-black text-[#1A1917] tracking-tighter">{item.depTime || '--:--'}</span>
                <span className="mt-3 bg-[#447A5A] text-white text-[11px] px-4 py-1 rounded-full font-bold tracking-widest">{item.depCity || '出發地'}</span>
              </div>
              <div className="flex flex-col items-center flex-1 px-3">
                <span className="text-[12px] font-bold text-[#6D6A65] mb-1">{formatDurationDisplay(item.duration)}</span>
                <div className="w-full flex items-center text-[#4A72C8]">
                  <div className="h-[2px] flex-1 bg-gray-300 border-dashed border-t-[2px]"></div>
                  <Plane size={24} className="mx-2 fill-current rotate-45" />
                  <div className="h-[2px] flex-1 bg-gray-300 border-dashed border-t-[2px]"></div>
                </div>
                <span className="text-[11px] font-bold text-gray-400 mt-1 tracking-widest">{item.date?.replace(/-/g, '/')}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[26px] font-black text-gray-400 tracking-widest uppercase mb-1">{item.arrIata || 'KIX'}</span>
                <span className="text-[46px] leading-none font-black text-[#1A1917] tracking-tighter">{item.arrTime || '--:--'}</span>
                <span className="mt-3 bg-[#B3936E] text-white text-[11px] px-4 py-1 rounded-full font-bold tracking-widest">{item.arrCity || '目的地'}</span>
              </div>
            </div>
            <div className="bg-[#F8F9FA] rounded-2xl flex items-center justify-between p-4 border border-gray-100">
              <div className="flex-1 flex flex-col items-center justify-center border-r-[2px] border-gray-200/60">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">BAGGAGE</span>
                <div className="flex items-center gap-1.5 text-[#1A1917] font-black text-sm">
                  <Luggage size={16} className="text-[#519B96]"/> {item.baggage || '--'}
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center border-r-[2px] border-gray-200/60">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">SEAT</span>
                <div className="flex items-center gap-1.5 text-[#1A1917] font-black text-sm uppercase">
                  {item.seat || '--'}
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">AIRCRAFT</span>
                <div className="flex items-center gap-1.5 text-[#1A1917] font-black text-sm uppercase">
                  <Plane size={16} className="text-[#C29562] fill-current" /> {item.aircraft || '--'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 全新設計：飯店卡片 ---
const HotelCard = ({ item, onEdit, onViewDetails }: any) => {
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => { if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); } };

  return (
    <div className="bg-white rounded-[2rem] border-[3px] border-splat-dark shadow-splat-solid overflow-hidden relative animate-in slide-in-from-bottom-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3}/></button>
      </div>
      <div className="h-36 bg-gray-200 relative border-b-[3px] border-splat-dark">
        {item.images?.[0] ? ( <img src={item.images[0]} className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full flex items-center justify-center bg-splat-pink/10"><Home size={40} className="text-splat-pink/40"/></div> )}
        <div className="absolute top-3 left-3 bg-white border-2 border-splat-dark px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-splat-dark shadow-[2px_2px_0px_#1A1A1A]">HOTEL</div>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <h3 className="font-black text-xl text-splat-dark leading-tight">{item.title}</h3>
          <div className="text-center shrink-0 bg-gray-50 rounded-xl px-3 py-1.5 border-2 border-splat-dark shadow-sm -rotate-2">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Nights</div>
            <div className="font-black text-splat-dark text-sm">{item.nights || 1} 晚</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-2.5 text-center">
             <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Check-in</div>
             <div className="font-black text-sm text-splat-dark">{item.date}</div>
          </div>
          <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-2.5 text-center">
             <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Check-out</div>
             <div className="font-black text-sm text-splat-dark">{item.endDate || '-'}</div>
          </div>
        </div>

        <div className="bg-[#F4F5F7] p-3 rounded-xl border-[3px] border-splat-dark flex justify-between items-center shadow-sm">
          <div>
            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Confirmation No.</div>
            <div className="font-black text-splat-blue text-sm select-all">{item.confirmationNo || '無'}</div>
          </div>
          {item.roomType && (
            <div className="text-right">
               <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Room Type</div>
               <div className="font-black text-splat-dark text-xs">{item.roomType}</div>
            </div>
          )}
        </div>

        {(item.location || item.contactPhone) && (
          <div className="flex flex-col gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 p-3 rounded-xl border-2 border-gray-100">
            {item.location && <div className="flex items-start gap-1.5"><MapPin size={14} className="shrink-0 text-splat-pink mt-0.5"/><span className="leading-snug">{item.location}</span></div>}
            {item.contactPhone && <div className="flex items-center gap-1.5 text-[11px]"><Phone size={12} className="shrink-0"/>{item.contactPhone}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 全新設計：景點實體票卡片 ---
const SpotCard = ({ item, onEdit, onViewDetails }: any) => {
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => { if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); } };

  return (
    <div className="relative bg-[#FFFAF0] rounded-3xl border-[3px] border-splat-dark shadow-splat-solid animate-in slide-in-from-bottom-4 cursor-pointer active:scale-[0.98] transition-transform flex flex-col" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3}/></button>
      </div>
      {/* 實體票券打孔設計 */}
      <div className="absolute top-[80px] -left-[14px] w-6 h-6 bg-[#F4F5F7] rounded-full border-r-[3px] border-t-[3px] border-b-[3px] border-splat-dark z-10"></div>
      <div className="absolute top-[80px] -right-[14px] w-6 h-6 bg-[#F4F5F7] rounded-full border-l-[3px] border-t-[3px] border-b-[3px] border-splat-dark z-10"></div>
      
      {/* 票券上半部 */}
      <div className="p-5 border-b-[3px] border-dashed border-gray-300 relative">
        <div className="flex justify-between items-start mb-3">
          <div className="bg-splat-yellow border-2 border-splat-dark px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-splat-dark shadow-sm">🎫 SPOT TICKET</div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. {item.confirmationNo || '-'}</div>
        </div>
        <h3 className="font-black text-xl text-splat-dark leading-tight pr-4">{item.title}</h3>
      </div>

      {/* 票券下半部 */}
      <div className="p-5 bg-white rounded-b-[1.7rem] flex gap-4 items-center">
         {item.qrCode ? (
           <div className="w-16 h-16 shrink-0 border-[3px] border-splat-dark rounded-xl p-1 bg-white shadow-sm overflow-hidden">
             <img src={item.qrCode} className="w-full h-full object-cover" />
           </div>
         ) : (
           <div className="w-16 h-16 shrink-0 border-[3px] border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50"><QrCode size={24} className="text-gray-300"/></div>
         )}
         <div className="flex-1 grid grid-cols-2 gap-y-3 gap-x-2">
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Date</div>
              <div className="font-black text-sm text-splat-dark">{item.date}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Entry Time</div>
              <div className="font-black text-sm text-splat-pink">{item.entryTime || '不限時間'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Ticket Type</div>
              <div className="font-bold text-xs text-splat-dark truncate bg-gray-100 px-2 py-1 rounded border border-gray-200 inline-block">{item.ticketType || '一般入場券'}</div>
            </div>
         </div>
      </div>
    </div>
  );
};

// --- 全新設計：交通/憑證護照卡片 ---
const VoucherCard = ({ item, onEdit, onViewDetails }: any) => {
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => { if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); } };

  return (
    <div className="bg-white rounded-3xl border-[3px] border-splat-dark shadow-splat-solid animate-in slide-in-from-bottom-4 cursor-pointer active:scale-[0.98] transition-transform overflow-hidden flex relative" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3}/></button>
      </div>
      {/* 交通票左側色條 */}
      <div className="w-10 bg-[#FF8A00] border-r-[3px] border-splat-dark flex flex-col items-center justify-center py-4 relative overflow-hidden shrink-0">
         <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1)_75%,transparent_75%,transparent)] bg-[length:10px_10px]" />
         <span className="text-[11px] font-black text-white uppercase tracking-[0.4em] -rotate-90 whitespace-nowrap drop-shadow-md z-10">VOUCHER</span>
      </div>
      
      <div className="flex-1 p-5 space-y-4">
        <div className="flex justify-between items-start gap-2 pr-10">
          <h3 className="font-black text-[17px] text-splat-dark leading-tight">{item.title}</h3>
          {item.qrCode && <QrCode size={20} className="text-splat-dark shrink-0"/>}
        </div>
        
        <div className="flex gap-4 text-sm bg-gray-50 p-2.5 rounded-xl border-2 border-gray-100">
          <div className="flex-1">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Valid Date</div>
            <div className="font-black text-splat-dark text-xs">{item.date}</div>
          </div>
          {item.endDate && (
            <>
              <div className="w-[2px] bg-gray-200 my-1 rounded-full"></div>
              <div className="flex-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">End Date</div>
                <div className="font-black text-splat-dark text-xs">{item.endDate}</div>
              </div>
            </>
          )}
        </div>

        <div className="bg-orange-50 border-2 border-orange-200/60 rounded-xl p-3">
          <div className="text-[9px] font-black text-[#FF8A00] uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin size={12}/> Exchange Location</div>
          <div className="font-black text-xs text-splat-dark leading-snug">{item.exchangeLocation || '請查看憑證內文說明'}</div>
        </div>
        
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-t-2 border-dashed border-gray-200 pt-3">
          Conf. No. <span className="text-splat-dark ml-1 select-all">{item.confirmationNo || '無'}</span>
        </div>
      </div>
    </div>
  );
};












