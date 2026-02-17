import React, { useState, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Sun, Cloud, CloudRain, Clock, MapPin, Plus } from 'lucide-react';

export const Schedule = () => {
  const { trips, currentTripId } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);

  // 計算行程日期陣列與出發倒數
  const { dateRange, countdown } = useMemo(() => {
    if (!trip) return { dateRange: [], countdown: 0 };
    const start = parseISO(trip.startDate);
    const end = parseISO(trip.endDate);
    const diff = differenceInDays(end, start) + 1;
    const days = Array.from({ length: diff }, (_, i) => addDays(start, i));
    
    const today = new Date();
    const daysToTrip = differenceInDays(start, today);
    
    return { dateRange: days, countdown: daysToTrip };
  }, [trip]);

  if (!trip) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. 倒數計時與天氣卡片 */}
      <div className="px-6 flex gap-3">
        <div className="card-zakka flex-1 bg-ac-orange text-white border-ac-orange/20 flex flex-col items-center justify-center py-4">
          <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">Countdown</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black">{countdown > 0 ? countdown : 0}</span>
            <span className="text-xs font-bold">DAYS</span>
          </div>
        </div>
        <div className="card-zakka flex-1 flex flex-col items-center justify-center py-4">
          <Sun className="text-ac-orange mb-1" size={24} />
          <span className="text-lg font-black text-ac-brown">24°C</span>
          <span className="text-[10px] font-bold text-ac-border uppercase">Sunny</span>
        </div>
      </div>

      {/* 2. 橫向日期選擇器 */}
      <div className="flex overflow-x-auto gap-4 px-6 py-2 hide-scrollbar">
        {dateRange.map((date, i) => (
          <button
            key={i}
            onClick={() => setSelectedDateIdx(i)}
            className={`flex flex-col items-center min-w-[60px] p-3 rounded-2xl border-2 transition-all ${
              selectedDateIdx === i 
                ? 'bg-ac-green border-ac-green text-white shadow-zakka -translate-y-1' 
                : 'bg-white border-ac-border text-ac-brown opacity-60'
            }`}
          >
            <span className="text-[10px] font-black mb-1">{format(date, 'EEE', { locale: zhTW })}</span>
            <span className="text-xl font-black leading-none">{format(date, 'dd')}</span>
          </button>
        ))}
      </div>

      {/* 3. 行程時間軸 (Timeline) */}
      <div className="px-6 space-y-4 relative">
        {/* 垂直線裝飾 */}
        <div className="absolute left-10 top-4 bottom-4 w-1 bg-ac-border/30 rounded-full" />
        
        {/* 假資料示意 (之後會連動資料庫) */}
        {[
          { time: '09:00', title: '關西國際機場抵達', loc: 'KIX Airport', cat: 'transport' },
          { time: '12:30', title: '黑門市場美食巡禮', loc: 'Kuromon Market', cat: 'food' },
          { time: '15:00', title: '大阪城公園散策', loc: 'Osaka Castle', cat: 'sightseeing' }
        ].map((item, i) => (
          <div key={i} className="flex gap-4 items-start relative group">
            <div className="w-8 pt-1 text-right">
              <span className="text-[10px] font-black text-ac-brown/40">{item.time}</span>
            </div>
            
            {/* 圓圈節點 */}
            <div className={`w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 mt-1.5 ${
              item.cat === 'food' ? 'bg-ac-orange' : item.cat === 'transport' ? 'bg-blue-400' : 'bg-ac-green'
            }`} />
            
            <div className="card-zakka flex-1 hover:border-ac-green transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-black text-ac-brown leading-tight">{item.title}</h3>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full text-white uppercase ${
                  item.cat === 'food' ? 'bg-ac-orange' : item.cat === 'transport' ? 'bg-blue-400' : 'bg-ac-green'
                }`}>
                  {item.cat}
                </span>
              </div>
              <div className="flex items-center gap-1 text-ac-brown/50 text-[10px] font-bold">
                <MapPin size={10} /> {item.loc}
              </div>
            </div>
          </div>
        ))}

        {/* 新增按鈕 */}
        <button className="flex items-center gap-3 w-full p-4 border-2 border-dashed border-ac-border rounded-3xl text-ac-border font-black text-sm hover:border-ac-green hover:text-ac-green transition-all active:scale-95 ml-12 w-[calc(100%-48px)]">
          <Plus size={18} /> 新增行程項目
        </button>
      </div>
    </div>
  );
};