import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Plane, Home, Car, Ticket, Plus, Trash2 } from 'lucide-react';
import { BookingItem } from '../types';

export const Booking = () => {
  const { trips, currentTripId, deleteBookingItem, addBookingItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  const [activeSubTab, setActiveSubTab] = useState<'flight' | 'hotel' | 'car' | 'voucher'>('flight');

  if (!trip) return null;

  const bookings = (trip.bookings || []).filter(b => b.type === activeSubTab);

  return (
    <div className="px-6 space-y-8 animate-fade-in pb-10 text-left">
      {/* 子分頁切換 */}
      <div className="flex bg-white p-2 rounded-[32px] border-4 border-ac-border shadow-zakka">
        <SubTab id="flight" icon={<Plane size={18}/>} active={activeSubTab} onClick={setActiveSubTab} />
        <SubTab id="hotel" icon={<Home size={18}/>} active={activeSubTab} onClick={setActiveSubTab} />
        <SubTab id="car" icon={<Car size={18}/>} active={activeSubTab} onClick={setActiveSubTab} />
        <SubTab id="voucher" icon={<Ticket size={18}/>} active={activeSubTab} onClick={setActiveSubTab} />
      </div>

      <div className="space-y-6">
        {bookings.length === 0 ? (
          <div className="text-center py-20 text-ac-border font-black italic">
            目前還沒有{activeSubTab === 'flight' ? '機票' : '預訂'}資訊唷！
          </div>
        ) : (
          bookings.map(item => (
            <div key={item.id} className="relative group">
              {activeSubTab === 'flight' ? (
                <FlightCard item={item} onDelete={() => deleteBookingItem(trip.id, item.id)} />
              ) : (
                <div className="card-zakka bg-white flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-ac-brown text-lg">{item.title}</h3>
                    <p className="text-xs text-ac-brown/40 font-bold">{item.date} {item.confirmationNo && `• ${item.confirmationNo}`}</p>
                  </div>
                  <button onClick={() => deleteBookingItem(trip.id, item.id)} className="text-ac-orange/30 hover:text-ac-orange"><Trash2 size={18}/></button>
                </div>
              )}
            </div>
          ))
        )}

        <button 
          onClick={() => {
            const newItem: BookingItem = {
              id: Date.now().toString(),
              type: activeSubTab,
              title: activeSubTab === 'flight' ? '新增航班' : '新增預訂',
              date: new Date().toISOString().split('T')[0],
              flightNo: 'BRxxx',
              depIata: 'TPE',
              arrIata: 'KIX',
              depTime: '10:00',
              arrTime: '14:00',
              confirmationNo: ''
            };
            addBookingItem(trip.id, newItem);
          }}
          className="w-full p-5 border-4 border-dashed border-ac-border rounded-[32px] text-ac-border font-black flex items-center justify-center gap-3 hover:text-ac-green hover:border-ac-green transition-all"
        >
          <Plus /> 新增{activeSubTab === 'flight' ? '航班' : '預訂'} (測試)
        </button>
      </div>
    </div>
  );
};

const SubTab = ({ id, icon, active, onClick }: any) => (
  <button 
    onClick={() => onClick(id)}
    className={`flex-1 flex flex-col items-center py-3 rounded-[24px] transition-all ${active === id ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}
  >
    {icon}
  </button>
);

const FlightCard = ({ item, onDelete }: { item: BookingItem, onDelete: () => void }) => (
  <div className="bg-white rounded-[32px] border-4 border-ac-border shadow-zakka overflow-hidden">
    <div className="bg-ac-green p-4 flex justify-between items-center text-white">
      <div className="flex items-center gap-2">
        <Plane size={16} />
        <span className="text-[10px] font-black uppercase tracking-widest">Boarding Pass</span>
      </div>
      <span className="font-black text-sm">{item.flightNo}</span>
    </div>
    <div className="p-6 flex justify-between items-center relative">
      <div className="text-center">
        <h2 className="text-3xl font-black text-ac-brown">{item.depIata}</h2>
        <p className="text-[10px] font-bold text-ac-brown/40 uppercase">{item.depTime}</p>
      </div>
      <div className="flex-1 flex flex-col items-center px-4">
        <div className="w-full border-t-4 border-dashed border-ac-border relative">
          <Plane size={14} className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-ac-border bg-white px-1" />
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-3xl font-black text-ac-brown">{item.arrIata}</h2>
        <p className="text-[10px] font-bold text-ac-brown/40 uppercase">{item.arrTime}</p>
      </div>
    </div>
    <div className="px-6 pb-6 pt-2 border-t-4 border-dashed border-ac-bg flex justify-between items-end">
      <div>
        <p className="text-[10px] font-black text-ac-brown/30 uppercase">Confirmation</p>
        <p className="font-black text-ac-orange">{item.confirmationNo || 'Pending'}</p>
      </div>
      <button onClick={onDelete} className="text-ac-brown/20 hover:text-ac-orange transition-colors">
        <Trash2 size={16} />
      </button>
    </div>
  </div>
);