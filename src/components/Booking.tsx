import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Plane, Home, MapPin, Plus, Edit3, Globe, QrCode, Trash2, ArrowRight, X } from 'lucide-react';
import { BookingItem } from '../types';
import { BookingEditor } from './BookingEditor';

export const Booking = () => {
  const { trips, currentTripId, deleteBookingItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [activeSubTab, setActiveSubTab] = useState<'flight' | 'hotel' | 'spot' | 'voucher'>('flight');
  const [editingItem, setEditingItem] = useState<BookingItem | undefined>();
  const [detailItem, setDetailItem] = useState<BookingItem | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  if (!trip) return null;
  const bookings = (trip.bookings || []).filter(b => b.type === activeSubTab);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('確定要永久刪除這個預訂項目嗎？')) {
      deleteBookingItem(trip.id, id);
      setDetailItem(undefined);
    }
  };

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
            <div key={item.id} className="relative group cursor-pointer" onClick={() => setDetailItem(item)}>
              {item.type === 'flight' ? (
                <FlightCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onDelete={(e:any) => handleDelete(e, item.id)} />
              ) : (
                <HotelCard item={item} onEdit={(e:any)=>{e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true);}} onDelete={(e:any) => handleDelete(e, item.id)} />
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

const FlightCard = ({ item, onEdit, onDelete }: any) => (
  <div className="bg-white rounded-[40px] border-4 border-ac-border shadow-zakka overflow-hidden relative active:scale-[0.98] transition-all group">
    {/* 右上角編輯與刪除 */}
    <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
      <button onClick={onEdit} className="p-2.5 bg-white/90 backdrop-blur-md rounded-full text-ac-green shadow-sm border-2 border-ac-border hover:bg-ac-green hover:text-white transition-colors"><Edit3 size={16}/></button>
      <button onClick={onDelete} className="p-2.5 bg-white/90 backdrop-blur-md rounded-full text-ac-orange shadow-sm border-2 border-ac-border hover:bg-ac-orange hover:text-white transition-colors"><Trash2 size={16}/></button>
    </div>

    <div className="p-6 pb-2 flex justify-between items-center"><span className="text-[11px] font-black text-ac-border uppercase tracking-widest">{item.title || '航空公司'}</span></div>
    <div className="px-6 text-center"><h2 className="text-6xl font-black text-ac-brown tracking-tighter mb-4">{item.flightNo || 'BX 796'}</h2></div>
    <div className="px-10 flex justify-between items-center mb-10">
      <div className="text-center"><p className="text-2xl font-black text-ac-brown">{item.depIata || 'TPE'}</p><p className="text-lg font-black text-ac-brown opacity-60">{item.depTime || '00:00'}</p><span className="bg-ac-green text-white text-[9px] px-3 py-0.5 rounded-full font-bold">{item.depCity || 'Taipei'}</span></div>
      <div className="flex-1 px-4 flex flex-col items-center gap-1"><span className="text-[9px] font-black text-ac-border">{item.duration || '02h25m'}</span><div className="w-full border-t-2 border-dashed border-ac-border relative"><Plane size={16} className="absolute -top-2 left-1/2 -translate-x-1/2 text-ac-green bg-white px-1" /></div><span className="text-[9px] font-black text-ac-border">{item.date}</span></div>
      <div className="text-center"><p className="text-2xl font-black text-ac-brown">{item.arrIata || 'KIX'}</p><p className="text-lg font-black text-ac-brown opacity-60">{item.arrTime || '00:00'}</p><span className="bg-ac-orange text-white text-[9px] px-3 py-0.5 rounded-full font-bold">{item.arrCity || 'Osaka'}</span></div>
    </div>
    <div className="px-6 grid grid-cols-2 gap-4 border-t-2 border-dashed border-ac-bg pt-6 mb-8 opacity-60">
      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-ac-bg flex items-center justify-center text-ac-border"><Plus size={14}/></div><div><p className="text-[8px] font-black text-ac-border uppercase">Baggage</p><p className="text-xs font-black text-ac-brown">{item.baggage || '15kg'}</p></div></div>
      <div className="flex items-center gap-3 justify-end text-right"><div><p className="text-[8px] font-black text-ac-border uppercase">Aircraft</p><p className="text-xs font-black text-ac-brown">{item.aircraft || 'A321'}</p></div><div className="w-8 h-8 rounded-lg bg-ac-bg flex items-center justify-center text-ac-orange"><Plane size={14} className="rotate-45" /></div></div>
    </div>
  </div>
);

const HotelCard = ({ item, onEdit, onDelete }: any) => (
  <div className="bg-white rounded-[40px] border-4 border-ac-border shadow-zakka overflow-hidden relative active:scale-[0.98] transition-all group">
    {/* 右上角編輯與刪除 */}
    <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20">
      <button onClick={onEdit} className="p-2.5 bg-white/90 backdrop-blur-md rounded-full text-ac-green shadow-sm border-2 border-ac-border hover:bg-ac-green hover:text-white transition-colors"><Edit3 size={16}/></button>
      <button onClick={onDelete} className="p-2.5 bg-white/90 backdrop-blur-md rounded-full text-ac-orange shadow-sm border-2 border-ac-border hover:bg-ac-orange hover:text-white transition-colors"><Trash2 size={16}/></button>
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



