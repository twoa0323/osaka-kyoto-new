import React, { useState, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Sun, MapPin, Plus, Trash2, Utensils, Plane, Home, Camera } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ScheduleItem } from '../types';

const ICON_MAP = { sightseeing: Camera, food: Utensils, transport: Plane, hotel: Home };

export const Schedule = () => {
  const { trips, currentTripId, deleteScheduleItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>();

  const dateRange = useMemo(() => {
    if (!trip || !trip.startDate || !trip.endDate) return [];
    const start = parseISO(trip.startDate);
    const end = parseISO(trip.endDate);
    if (!isValid(start) || !isValid(end)) return [];
    const diff = Math.max(0, differenceInDays(end, start)) + 1;
    return Array.from({ length: diff }, (_, i) => addDays(start, i));
  }, [trip]);

  if (!trip) return null;

  const selectedDateStr = format(dateRange[selectedDateIdx], 'yyyy-MM-dd');
  const items = (trip.items || [])
    .filter(i => i.date === selectedDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="px-6 flex gap-4">
        <div className="card-zakka flex-1 bg-ac-orange border-none text-white flex flex-col items-center justify-center py-4">
          <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">Countdown</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black">{Math.max(0, differenceInDays(parseISO(trip.startDate), new Date()) + 1)}</span>
            <span className="text-xs font-bold">DAYS</span>
          </div>
        </div>
        <div className="card-zakka flex-1 flex flex-col items-center justify-center py-4 text-ac-brown">
          <Sun className="text-ac-orange mb-1" size={24} />
          <span className="text-lg font-black italic">24°C</span>
          <span className="text-[10px] font-bold text-ac-border uppercase tracking-widest">Sunny</span>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-4 px-6 py-2 hide-scrollbar">
        {dateRange.map((date, i) => (
          <button key={i} onClick={() => setSelectedDateIdx(i)} className={`flex flex-col items-center min-w-[65px] p-4 rounded-3xl border-4 transition-all ${selectedDateIdx === i ? 'bg-ac-green border-ac-green text-white shadow-zakka -translate-y-1' : 'bg-white border-ac-border text-ac-brown/40'}`}>
            <span className="text-[10px] font-black mb-1 uppercase">{format(date, 'EEE', { locale: zhTW })}</span>
            <span className="text-2xl font-black">{format(date, 'dd')}</span>
          </button>
        ))}
      </div>

      <div className="px-6 space-y-6 relative text-left">
        <div className="absolute left-10 top-4 bottom-4 w-1.5 bg-ac-border/30 rounded-full" />
        {items.length === 0 ? (
          <div className="ml-12 py-10 text-ac-border italic font-black opacity-30">這天還沒有計畫唷...📓</div>
        ) : (
          items.map((item) => {
            const Icon = ICON_MAP[item.category] || Camera;
            return (
              <div key={item.id} className="flex gap-4 items-start relative group">
                <div className="w-10 pt-2 text-right"><span className="text-[10px] font-black text-ac-brown/30">{item.time}</span></div>
                <div className={`w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 mt-1.5 shrink-0 ${item.category === 'food' ? 'bg-ac-orange' : item.category === 'transport' ? 'bg-blue-400' : item.category === 'hotel' ? 'bg-purple-400' : 'bg-ac-green'}`} />
                <div className="card-zakka flex-1 active:scale-[0.98] transition-transform cursor-pointer" onClick={() => { setEditingItem(item); setIsEditorOpen(true); }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-ac-brown/40" />
                      <h3 className="font-black text-ac-brown text-lg leading-tight">{item.title}</h3>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); if(confirm('要刪除嗎？')) deleteScheduleItem(trip.id, item.id); }} className="text-ac-orange/40 hover:text-ac-orange"><Trash2 size={16} /></button>
                  </div>
                  <div className="flex items-center gap-1 text-ac-brown/50 text-xs font-bold mt-2"><MapPin size={12} /> {item.location || '尚未設定地點'}</div>
                </div>
              </div>
            );
          })
        )}
        <button onClick={() => { setEditingItem(undefined); setIsEditorOpen(true); }} className="flex items-center gap-3 w-[calc(100%-48px)] p-5 border-4 border-dashed border-ac-border rounded-[32px] text-ac-border font-black flex items-center justify-center gap-3 active:scale-95 transition-all ml-12"><Plus size={20} /> 新增行程項目</button>
      </div>

      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};
