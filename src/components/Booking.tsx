// src/components/Booking.tsx
import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Plane, Home, MapPin, Plus, Edit3, Globe, QrCode, ArrowRight, X, Luggage } from 'lucide-react';
import { BookingItem } from '../types';
import { BookingEditor } from './BookingEditor';

// 8大航空公司模板設定
const AIRLINE_THEMES: Record<string, any> = {
  tigerair: {
    bgClass: 'bg-[#F49818]',
    bgStyle: { backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 15px, #E57A0F 15px, #E57A0F 30px)' },
    logoHtml: <span className="font-black text-white text-xl tracking-tight">tiger<span className="font-medium">air</span> <span className="text-sm font-normal">Taiwan</span></span>,
  },
  starlux: {
    bgClass: 'bg-[#181B26]',
    bgStyle: { backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' },
    logoHtml: <span className="font-serif text-[#C4A97A] text-2xl font-bold tracking-widest flex items-center gap-2"><span className="text-3xl rotate-45 text-[#E6C998]">✦</span> STARLUX</span>,
  },
  cathay: {
    bgClass: 'bg-[#006564]',
    bgStyle: {},
    logoHtml: <span className="font-sans text-white text-xl font-bold tracking-widest flex items-center gap-2"><span className="text-3xl font-light scale-y-75 -scale-x-100">✔</span> CATHAY PACIFIC</span>,
  },
  china: {
    bgClass: 'bg-gradient-to-r from-[#8CAAE6] to-[#B0C4DE]',
    bgStyle: {},
    logoHtml: <span className="font-serif text-[#002855] text-lg font-black tracking-widest flex items-center gap-2"><span className="text-[#FFB6C1] text-2xl">🌸</span> CHINA AIRLINES</span>,
  },
  eva: {
    bgClass: 'bg-[#007A53]',
    bgStyle: { backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '100% 10px' },
    logoHtml: <span className="font-sans text-white text-2xl font-bold tracking-widest flex items-center gap-2"><span className="text-[#F2A900] text-3xl">⊕</span> EVA AIR</span>,
  },
  peach: {
    bgClass: 'bg-[#D93B8B]',
    bgStyle: {},
    logoHtml: <span className="font-sans text-white text-4xl font-black tracking-tighter lowercase pr-2">peach</span>,
  },
  ana: {
    bgClass: 'bg-[#133261]',
    bgStyle: { backgroundImage: 'radial-gradient(ellipse at bottom, rgba(255,255,255,0.1) 0%, transparent 60%)' },
    logoHtml: <span className="font-sans text-white text-3xl font-black italic tracking-widest flex gap-1 items-center">ANA <span className="flex flex-col gap-0.5 ml-1"><div className="w-4 h-1 bg-[#0088CE]"></div><div className="w-4 h-1 bg-[#0088CE]"></div></span></span>,
  },
  other: {
    bgClass: 'bg-ac-brown',
    bgStyle: {},
    logoHtml: <span className="font-sans text-white text-xl font-black tracking-[0.2em]">BOARDING PASS</span>,
  }
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
    <div className="px-6 space-y-8 animate-fade-in pb-28 text-left">
      <div className="flex bg-white p-2 rounded-[32px] border-4 border-ac-border shadow-zakka">
        {['flight', 'hotel', 'spot', 'voucher'].map((t) => (
          <button key={t} onClick={() => setActiveSubTab(t as any)} className={`flex-1 flex flex-col items-center py-3 rounded-[24px] transition-all ${activeSubTab === t ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>
            {t === 'flight' ? <Plane size={18}/> : t === 'hotel' ? <Home size={18}/> : t === 'spot' ? <MapPin size={18}/> : <QrCode size={18}/>}
            <span className="text-[9px] font-black mt-1 uppercase tracking-widest">{t === 'flight' ? '機票' : t === 'hotel' ? '住宿' : t === 'spot' ? '景點' : '憑證'}</span>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {bookings.length === 0 ? <div className="text-center py-20 text-ac-border font-black italic opacity-30">尚無預訂資訊 📓</div> :
          bookings.map(item => (
            <div key={item.id}>
              {item.type === 'flight' ? (
                <FlightCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} />
              ) : (
                <HotelCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onViewDetails={() => setDetailItem(item)} />
              )}
            </div>
          ))
        }
        <button onClick={() => { setEditingItem(undefined); setIsEditorOpen(true); }} className="w-full p-5 border-4 border-dashed border-ac-border rounded-[32px] text-ac-border font-black flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-white"><Plus /> 新增預訂項目</button>
      </div>

      {/* 詳細資訊 Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-6" onClick={() => setDetailItem(undefined)}>
          <div className="bg-ac-bg w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto hide-scrollbar">
              <div className="flex justify-between items-start"><h2 className="text-2xl font-black text-ac-brown italic pr-8">{detailItem.title}</h2><button onClick={() => setDetailItem(undefined)} className="p-2 bg-white rounded-full"><X size={16} className="text-ac-border"/></button></div>
              {detailItem.images?.[0] && <img src={detailItem.images[0]} className="w-full aspect-video rounded-3xl object-cover border-4 border-white shadow-zakka" />}
              <p className="text-sm text-ac-brown/70 font-bold whitespace-pre-wrap leading-relaxed">{detailItem.note || "尚無備註資訊"}</p>
              {detailItem.qrCode && <div className="bg-white p-6 rounded-3xl flex flex-col items-center gap-3 border-4 border-ac-border shadow-zakka"><img src={detailItem.qrCode} className="w-40 h-40 object-contain" alt="QR" /><span className="text-[10px] font-black text-ac-orange uppercase tracking-widest">Scan for Check-in</span></div>}
              {detailItem.website && <a href={detailItem.website} target="_blank" rel="noreferrer" className="btn-zakka w-full py-4 flex items-center justify-center gap-2 font-black shadow-md"><Globe size={18}/> 前往官方網站</a>}
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
    <div className="relative active:scale-[0.98] transition-transform drop-shadow-xl cursor-pointer" onClick={handleCardClick}>
      
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-white/95 backdrop-blur-md rounded-full text-ac-green shadow-sm border border-gray-100 hover:bg-ac-green hover:text-white transition-colors">
          <Edit3 size={18}/>
        </button>
      </div>

      <div className="bg-white rounded-[2rem] overflow-hidden flex flex-col shadow-sm">
        <div className={`relative h-[88px] w-full flex items-center justify-center ${theme.bgClass}`} style={theme.bgStyle}>
           {theme.logoHtml}
        </div>

        <div className="relative w-full bg-white pt-8 pb-6 border-t-0 rounded-b-[2rem]">
          
          {/* 航班號碼放大、加寬 */}
          <div className="absolute -top-[20px] left-1/2 -translate-x-1/2 bg-white px-8 py-2 border border-gray-100 text-gray-400 font-black rounded-full text-base shadow-sm tracking-widest z-10">
            {item.flightNo || 'FLIGHT'}
          </div>

          <div className="absolute left-4 top-0 bottom-6 border-l-[3px] border-dotted border-gray-300"></div>
          
          <div className="pl-8 pr-6">
            {/* 核心航班資訊列：時間變大，地點變小 */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-gray-400 tracking-widest uppercase mb-1">{item.depIata || 'TPE'}</span>
                <span className="text-[40px] leading-none font-black text-gray-900">{item.depTime || '--:--'}</span>
                <span className="mt-3 bg-[#1C734C] text-white text-[10px] px-3 py-0.5 rounded-full font-bold tracking-widest">{item.depCity || '出發地'}</span>
              </div>

              <div className="flex flex-col items-center flex-1 px-4">
                <span className="text-[11px] font-black text-gray-500 mb-1">{formatDurationDisplay(item.duration)}</span>
                <div className="w-full flex items-center text-blue-600">
                  <div className="h-[2px] flex-1 bg-gray-300 border-dashed border-t-[2px]"></div>
                  <Plane size={24} className="mx-2 fill-current rotate-45" />
                  <div className="h-[2px] flex-1 bg-gray-300 border-dashed border-t-[2px]"></div>
                </div>
                <span className="text-[10px] font-black text-gray-400 mt-1 tracking-widest">{item.date?.replace(/-/g, '/')}</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-gray-400 tracking-widest uppercase mb-1">{item.arrIata || 'KIX'}</span>
                <span className="text-[40px] leading-none font-black text-gray-900">{item.arrTime || '--:--'}</span>
                <span className="mt-3 bg-[#C29562] text-white text-[10px] px-3 py-0.5 rounded-full font-bold tracking-widest">{item.arrCity || '目的地'}</span>
              </div>
            </div>

            <div className="bg-[#F8F9FA] rounded-xl flex items-center justify-between p-3 border border-gray-100">
              <div className="flex-1 flex flex-col items-center justify-center border-r-2 border-gray-200">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">BAGGAGE</span>
                <div className="flex items-center gap-1.5 text-gray-800 font-black text-sm">
                  <Luggage size={14} className="text-[#519B96]"/> {item.baggage || '--'}
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center border-r-2 border-gray-200">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">SEAT</span>
                <div className="flex items-center gap-1.5 text-gray-800 font-black text-sm uppercase">
                  {item.seat || '--'}
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">AIRCRAFT</span>
                <div className="flex items-center gap-1 text-gray-800 font-black text-sm uppercase">
                  <Plane size={14} className="text-[#C29562] fill-current" /> {item.aircraft || '--'}
                </div>
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
    if (!showActions) {
      setShowActions(true);
      setTimeout(() => setShowActions(false), 3000);
    } else {
      onViewDetails();
      setShowActions(false);
    }
  };

  return (
    <div className="bg-white rounded-[40px] border-4 border-ac-border shadow-zakka overflow-hidden relative active:scale-[0.98] transition-all cursor-pointer" onClick={handleCardClick}>
      <div className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onEdit} className="p-2.5 bg-white/95 backdrop-blur-md rounded-full text-ac-green shadow-sm border border-gray-100 hover:bg-ac-green hover:text-white transition-colors"><Edit3 size={18}/></button>
      </div>

      <div className="h-52 relative"><img src={item.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945"} className="w-full h-full object-cover" />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border-2 border-ac-border flex items-center gap-2"><MapPin size={12} className="text-blue-500" /><span className="text-[10px] font-black text-ac-brown uppercase tracking-widest">{item.location?.split(',')[0] || '地點'}</span></div>
      </div>
      <div className="p-8 space-y-6">
        <div><h3 className="text-2xl font-black text-ac-brown leading-tight italic pr-12">{item.title}</h3><p className="text-xs font-bold text-ac-border mt-1 truncate">{item.location}</p></div>
        <div className="bg-ac-bg rounded-[28px] p-6 border-2 border-ac-border flex justify-between items-center relative">
          <div className="flex-1"><p className="text-[9px] font-black text-ac-border uppercase mb-1">Check-in</p><p className="text-sm font-black text-ac-brown">{item.date}</p></div>
          <div className="flex flex-col items-center px-4"><span className="text-[9px] font-black text-ac-border">{item.nights || 1} Nights</span><ArrowRight size={20} className="text-ac-border" /></div>
          <div className="flex-1 text-right"><p className="text-[9px] font-black text-ac-border uppercase mb-1">Check-out</p><p className="text-sm font-black text-ac-brown">{item.endDate || item.date}</p></div>
        </div>
        {item.price && <div className="flex flex-col items-end pt-2"><div className="flex items-baseline gap-2"><span className="text-[9px] font-black text-ac-border uppercase">Total</span><span className="text-2xl font-black text-ac-brown">NT$ {item.price.toLocaleString()}</span></div><span className="text-[9px] font-black bg-[#E2F1E7] text-[#4A785D] px-3 py-1 rounded-lg mt-1 shadow-sm">每人約 NT$ {Math.round(item.price / (item.nights || 1) / 2)}</span></div>}
      </div>
    </div>
  );
};






