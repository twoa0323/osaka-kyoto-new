import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Plane, Home, MapPin, Plus, Edit3, Globe, QrCode, ArrowRight, X, Luggage } from 'lucide-react';
import { BookingItem } from '../types';
import { BookingEditor } from './BookingEditor';

const AIRLINE_THEMES: Record<string, any> = {
  tigerair: { bgClass: 'bg-[#F49818]', bgStyle: { backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 15px, #E57A0F 15px, #E57A0F 30px)' }, logoHtml: <span className="font-black text-white text-xl tracking-tight">tiger<span className="font-medium">air</span></span>, },
  starlux: { bgClass: 'bg-[#181B26]', bgStyle: { backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }, logoHtml: <span className="font-serif text-[#C4A97A] text-2xl font-bold tracking-widest flex items-center gap-2">STARLUX</span>, },
  cathay: { bgClass: 'bg-[#006564]', bgStyle: {}, logoHtml: <span className="font-sans text-white text-xl font-bold tracking-widest flex items-center gap-2">CATHAY PACIFIC</span>, },
  china: { bgClass: 'bg-gradient-to-r from-[#8CAAE6] to-[#B0C4DE]', bgStyle: {}, logoHtml: <span className="font-serif text-[#002855] text-lg font-black tracking-widest flex items-center gap-2">CHINA AIRLINES</span>, },
  eva: { bgClass: 'bg-[#007A53]', bgStyle: { backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '100% 10px' }, logoHtml: <span className="font-sans text-white text-2xl font-bold tracking-widest flex items-center gap-2">EVA AIR</span>, },
  peach: { bgClass: 'bg-[#D93B8B]', bgStyle: {}, logoHtml: <span className="font-sans text-white text-4xl font-black tracking-tighter lowercase pr-2">peach</span>, },
  ana: { bgClass: 'bg-[#133261]', bgStyle: { backgroundImage: 'radial-gradient(ellipse at bottom, rgba(255,255,255,0.1) 0%, transparent 60%)' }, logoHtml: <span className="font-sans text-white text-3xl font-black italic tracking-widest flex gap-1 items-center">ANA</span>, },
  other: { bgClass: 'bg-splat-dark', bgStyle: {}, logoHtml: <span className="font-sans text-white text-xl font-black tracking-[0.2em]">BOARDING PASS</span>, }
};

export const Booking = () => {
  const { trips, currentTripId } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [activeSubTab, setActiveSubTab] = useState<'flight' | 'hotel' | 'spot' | 'voucher'>('flight');
  const [editingItem, setEditingItem] = useState<BookingItem | undefined>();
  const [detailItem, setDetailItem] = useState<BookingItem | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  if (!trip) return null;
  const bookings = (trip.bookings || []).filter(b => b.type === activeSubTab);

  return (
    <div className="px-4 space-y-6 animate-fade-in pb-28 text-left">
      {/* 修正：不會變成空白的膠囊選單 */}
      <div className="flex bg-gray-200 p-1.5 rounded-[32px] border-[3px] border-splat-dark shadow-splat-solid relative z-10">
        {['flight', 'hotel', 'spot', 'voucher'].map((t) => (
          <button 
            key={t} 
            onClick={() => setActiveSubTab(t as any)} 
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-[24px] transition-all duration-300 font-black ${
              activeSubTab === t 
                ? 'bg-white text-splat-dark shadow-[2px_2px_0px_#1A1A1A] border-2 border-splat-dark' 
                : 'text-gray-500 border-2 border-transparent hover:text-gray-700'
            }`}
          >
            {t === 'flight' ? <Plane size={20} strokeWidth={2.5}/> : t === 'hotel' ? <Home size={20} strokeWidth={2.5}/> : t === 'spot' ? <MapPin size={20} strokeWidth={2.5}/> : <QrCode size={20} strokeWidth={2.5}/>}
            <span className="text-[10px] mt-1 tracking-widest">
              {t === 'flight' ? '機票' : t === 'hotel' ? '住宿' : t === 'spot' ? '景點' : '憑證'}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {bookings.length === 0 ? (
           <div className="text-center py-16 bg-white border-[3px] border-dashed border-gray-400 rounded-[32px] text-gray-500 font-black italic shadow-sm">
             尚無預訂資訊 📓 <br/>
           </div>
        ) : (
          bookings.map(item => (
            <div key={item.id} className="[content-visibility:auto] [contain-intrinsic-size:250px]">
              {item.type === 'flight' ? (
                <FlightCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} />
              ) : (
                <HotelCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} />
              )}
            </div>
          ))
        )}
        <button onClick={() => { setEditingItem(undefined); setIsEditorOpen(true); }} className="w-full py-5 bg-white border-[3px] border-dashed border-splat-dark shadow-splat-solid rounded-[32px] text-splat-dark font-black flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all"><Plus strokeWidth={3}/> 新增項目</button>
      </div>

      {detailItem && (
        <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => setDetailItem(undefined)}>
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

const FlightCard = ({ item, onEdit, onViewDetails }: any) => {
  const theme = AIRLINE_THEMES[item.airline] || AIRLINE_THEMES.other;
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => {
    if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); }
  };
  return (
    <div className="relative active:scale-[0.98] transition-transform cursor-pointer" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3}/></button>
      </div>
      <div className="bg-white rounded-[32px] border-[3px] border-splat-dark shadow-splat-solid overflow-hidden flex flex-col">
        <div className={`relative h-[80px] w-full flex items-center justify-center border-b-[3px] border-splat-dark ${theme.bgClass}`} style={theme.bgStyle}>
           {theme.logoHtml}
        </div>
        <div className="relative w-full bg-[radial-gradient(#D1D5DB_1.5px,transparent_1px)] bg-[size:16px_16px] pt-8 pb-6 rounded-b-[2rem]">
          <div className="absolute -top-[16px] left-1/2 -translate-x-1/2 bg-white px-6 py-1.5 border-[3px] border-splat-dark text-splat-dark font-black rounded-full shadow-sm tracking-widest z-10">
            {item.flightNo || 'FLIGHT'}
          </div>
          <div className="absolute left-6 top-0 bottom-6 border-l-[3px] border-dashed border-gray-400"></div>
          <div className="pl-10 pr-6 bg-white mx-4 rounded-2xl border-[3px] border-splat-dark shadow-sm py-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-gray-500 tracking-widest uppercase mb-1">{item.depIata || 'TPE'}</span>
                <span className="text-3xl leading-none font-black text-splat-dark">{item.depTime || '--:--'}</span>
                <span className="mt-2 bg-splat-dark text-white text-[9px] px-2 py-0.5 rounded-md font-bold tracking-widest">{item.depCity || '出發地'}</span>
              </div>
              <div className="flex flex-col items-center flex-1 px-2">
                <span className="text-[10px] font-black text-gray-400 mb-1">{item.duration}</span>
                <div className="w-full flex items-center text-splat-blue">
                  <div className="h-[3px] flex-1 bg-splat-dark"></div>
                  <Plane size={24} className="mx-2 fill-current rotate-45 stroke-[2px] stroke-splat-dark" />
                  <div className="h-[3px] flex-1 bg-splat-dark"></div>
                </div>
                <span className="text-[9px] font-black text-gray-500 mt-1 tracking-widest">{item.date?.replace(/-/g, '/')}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-gray-500 tracking-widest uppercase mb-1">{item.arrIata || 'KIX'}</span>
                <span className="text-3xl leading-none font-black text-splat-dark">{item.arrTime || '--:--'}</span>
                <span className="mt-2 bg-splat-yellow text-splat-dark text-[9px] px-2 py-0.5 rounded-md font-bold tracking-widest border-2 border-splat-dark">{item.arrCity || '目的地'}</span>
              </div>
            </div>
            <div className="bg-gray-100 rounded-xl flex items-center justify-between p-2 border-2 border-splat-dark">
              <div className="flex-1 flex flex-col items-center border-r-2 border-splat-dark">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">BAGGAGE</span>
                <div className="flex items-center gap-1 text-splat-dark font-black text-xs"><Luggage size={12}/> {item.baggage || '--'}</div>
              </div>
              <div className="flex-1 flex flex-col items-center border-r-2 border-splat-dark">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">SEAT</span>
                <div className="flex items-center gap-1 text-splat-dark font-black text-xs uppercase">{item.seat || '--'}</div>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">AIRCRAFT</span>
                <div className="flex items-center gap-1 text-splat-dark font-black text-xs uppercase"><Plane size={12}/> {item.aircraft || '--'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HotelCard = ({ item, onEdit, onViewDetails }: any) => {
  const [showActions, setShowActions] = useState(false);
  const handleCardClick = () => {
    if (!showActions) { setShowActions(true); setTimeout(() => setShowActions(false), 3000); } else { onViewDetails(); setShowActions(false); }
  };
  return (
    <div className="bg-white rounded-[32px] border-[3px] border-splat-dark shadow-splat-solid overflow-hidden relative active:scale-[0.98] transition-all cursor-pointer" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-splat-yellow border-[3px] border-splat-dark rounded-full text-splat-dark shadow-splat-solid-sm"><Edit3 size={18} strokeWidth={3}/></button>
      </div>
      <div className="h-48 relative border-b-[3px] border-splat-dark">
        <img src={item.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945"} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-lg border-[3px] border-splat-dark shadow-sm flex items-center gap-1 -rotate-2"><MapPin size={12} className="text-splat-blue" /><span className="text-[10px] font-black text-splat-dark uppercase tracking-widest">{item.location?.split(',')[0] || '地點'}</span></div>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-xl font-black text-splat-dark uppercase leading-tight pr-12">{item.title}</h3>
          <p className="text-[10px] font-bold text-gray-500 mt-1 truncate"><MapPin size={10} className="inline mr-1"/>{item.location}</p>
        </div>
        <div className="bg-[#F4F5F7] rounded-xl p-4 border-[3px] border-splat-dark flex justify-between items-center relative">
          <div className="flex-1"><p className="text-[9px] font-black text-gray-500 uppercase mb-1">Check-in</p><p className="text-sm font-black text-splat-dark">{item.date}</p></div>
          <div className="flex flex-col items-center px-4"><span className="text-[9px] font-black bg-white border-2 border-splat-dark px-2 py-0.5 rounded-full">{item.nights || 1} N</span><ArrowRight size={16} className="text-splat-dark mt-1" strokeWidth={3} /></div>
          <div className="flex-1 text-right"><p className="text-[9px] font-black text-gray-500 uppercase mb-1">Check-out</p><p className="text-sm font-black text-splat-dark">{item.endDate || item.date}</p></div>
        </div>
      </div>
    </div>
  );
};








