import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Plane, Home, Car, Ticket, Plus, Trash2 } from 'lucide-react';
import { BookingItem } from '../types';
import { BookingEditor } from './BookingEditor';

export const Booking = () => {
  const { trips, currentTripId, deleteBookingItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  const [activeSubTab, setActiveSubTab] = useState<'flight' | 'hotel' | 'car' | 'voucher'>('flight');
  const [editingItem, setEditingItem] = useState<BookingItem | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  if (!trip) return null;
  const bookings = (trip.bookings || []).filter(b => b.type === activeSubTab);

  return (
    <div className="px-6 space-y-8 animate-fade-in pb-10 text-left">
      <div className="flex bg-white p-2 rounded-[32px] border-4 border-ac-border shadow-zakka">
        <SubTab id="flight" icon={<Plane size={18}/>} active={activeSubTab} onClick={setActiveSubTab} />
        <SubTab id="hotel" icon={<Home size={18}/>} active={activeSubTab} onClick={setActiveSubTab} />
        <SubTab id="car" icon={<Car size={18}/>} active={activeSubTab} onClick={setActiveSubTab} />
        <SubTab id="voucher" icon={<Ticket size={18}/>} active={activeSubTab} onClick={setActiveSubTab} />
      </div>

      <div className="space-y-6">
        {bookings.length === 0 ? (
          <div className="text-center py-20 text-ac-border font-black italic opacity-40">
            目前還沒有資訊唷！📓
          </div>
        ) : (
          bookings.map(item => (
            <div key={item.id} className="relative group cursor-pointer" onClick={() => { setEditingItem(item); setIsEditorOpen(true); }}>
              {activeSubTab === 'flight' ? (
                <FlightCard item={item} onDelete={(e) => { e.stopPropagation(); if(confirm('要刪除嗎？')) deleteBookingItem(trip.id, item.id); }} />
              ) : (
                <div className="card-zakka bg-white flex justify-between items-center active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-4">
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} className="w-14 h-14 rounded-xl object-cover border-2 border-ac-bg" />
                    ) : (
                      <div className="w-14 h-14 bg-ac-bg rounded-xl flex items-center justify-center text-ac-border"><Home size={24}/></div>
                    )}
                    <div>
                      <h3 className="font-black text-ac-brown text-lg">{item.title}</h3>
                      <p className="text-xs text-ac-brown/40 font-bold">{item.date} {item.confirmationNo && `• ${item.confirmationNo}`}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); if(confirm('要刪除嗎？')) deleteBookingItem(trip.id, item.id); }} className="text-ac-orange/30 hover:text-ac-orange p-2"><Trash2 size={18}/></button>
                </div>
              )}
            </div>
          ))
        )}
        <button onClick={() => { setEditingItem(undefined); setIsEditorOpen(true); }} className="w-full p-5 border-4 border-dashed border-ac-border rounded-[32px] text-ac-border font-black flex items-center justify-center gap-3 active:scale-95 transition-all"><Plus /> 新增預訂項目</button>
      </div>

      {isEditorOpen && <BookingEditor tripId={trip.id} type={activeSubTab} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};

const SubTab = ({ id, icon, active, onClick }: any) => (
  <button onClick={() => onClick(id)} className={`flex-1 flex flex-col items-center py-3 rounded-[24px] transition-all ${active === id ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>{icon}</button>
);

const FlightCard = ({ item, onDelete }: { item: BookingItem, onDelete: (e: any) => void }) => (
  <div className="bg-white rounded-[32px] border-4 border-ac-border shadow-zakka overflow-hidden active:scale-[0.98] transition-transform">
    <div className="bg-ac-green p-4 flex justify-between items-center text-white"><div className="flex items-center gap-2"><Plane size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Boarding Pass</span></div><span className="font-black text-sm">{item.flightNo || 'TBD'}</span></div>
    <div className="p-6 flex justify-between items-center relative"><div className="text-center"><h2 className="text-3xl font-black text-ac-brown">{item.depIata}</h2><p className="text-[10px] font-bold text-ac-brown/40 uppercase">{item.depTime}</p></div>
      <div className="flex-1 flex flex-col items-center px-4"><div className="w-full border-t-4 border-dashed border-ac-border relative"><Plane size={14} className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-ac-border bg-white px-1" /></div></div>
      <div className="text-center"><h2 className="text-3xl font-black text-ac-brown">{item.arrIata}</h2><p className="text-[10px] font-bold text-ac-brown/40 uppercase">{item.arrTime}</p></div></div>
    <div className="px-6 pb-6 pt-2 border-t-4 border-dashed border-ac-bg flex justify-between items-end"><div><p className="text-[10px] font-black text-ac-brown/30 uppercase">Confirmation</p><p className="font-black text-ac-orange">{item.confirmationNo || '-'}</p></div><button onClick={onDelete} className="text-ac-brown/20 hover:text-ac-orange transition-colors"><Trash2 size={16} /></button></div>
  </div>
);
