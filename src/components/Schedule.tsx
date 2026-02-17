import React, { useState, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Sun, MapPin, Plus, Trash2, Edit3 } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ScheduleItem } from '../types';

export const Schedule = () => {
  const { trips, currentTripId, deleteScheduleItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>();

  // 計算日期區間
  const dateRange = useMemo(() => {
    if (!trip) return [];
    const start = parseISO(trip.startDate);
    const end = parseISO(trip.endDate);
    const diff = differenceInDays(end, start) + 1;
    return Array.from({ length: diff }, (_, i) => addDays(start, i));
  }, [trip]);

  if (!trip) return null;

  const selectedDateStr = format(dateRange[selectedDateIdx], 'yyyy-MM-dd');
  // 過濾當天行程 (這裡之後可以加入日期欄位到 ScheduleItem，目前我們先顯示全部以利測試)
  const items = trip.items || [];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* 1. 倒數卡片與天氣 */}
      <div className="px-6 flex gap-4">
        <div className="card-zakka flex-1 bg-ac-orange border-none text-white flex flex-col items-center justify-center py-4">
          <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">Countdown</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black">
              {Math.max(0, differenceInDays(parseISO(trip.startDate), new Date()))}
            </span>
            <span className="text-xs font-bold">DAYS</span>
          </div>
        </div>
        <div className="card-zakka flex-1 flex flex-col items-center justify-center py-4">
          <Sun className="text-ac-orange mb-1" size={24} />
          <span className="text-lg font-black text-ac-brown">24°C</span>
          <span className="text-[10px] font-bold text-ac-border uppercase">Sunny</span>
        </div>
      </div>

      {/* 2. 橫向日期選擇 */}
      <div className="flex overflow-x-auto gap-4 px-6 py-2 hide-scrollbar">
        {dateRange.map((date, i) => (
          <button
            key={i}
            onClick={() => setSelectedDateIdx(i)}
            className={`flex flex-col items-center min-w-[65px] p-4 rounded-3xl border-4 transition-all ${
              selectedDateIdx === i 
                ? 'bg-ac-green border-ac-green text-white shadow-zakka -translate-y-1' 
                : 'bg-white border-ac-border text-ac-brown/40'
            }`}
          >
            <span className="text-[10px] font-black mb-1 uppercase">
              {format(date, 'EEE', { locale: zhTW })}
            </span>
            <span className="text-2xl font-black">{format(date, 'dd')}</span>
          </button>
        ))}
      </div>

      {/* 3. 行程時間軸 */}
      <div className="px-6 space-y-6 relative">
        <div className="absolute left-10 top-4 bottom-4 w-1.5 bg-ac-border/30 rounded-full" />
        
        {items.length === 0 ? (
          <div className="ml-12 py-10 text-ac-border italic font-bold">
            這天還空空的，點下方按鈕新增計畫吧！
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex gap-4 items-start relative">
              <div className="w-10 pt-2 text-right">
                <span className="text-[10px] font-black text-ac-brown/30">{item.time}</span>
              </div>
              
              {/* 節點圓圈 */}
              <div className={`w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 mt-1.5 shrink-0 ${
                item.category === 'food' ? 'bg-ac-orange' : 
                item.category === 'transport' ? 'bg-blue-400' : 
                item.category === 'hotel' ? 'bg-purple-400' : 'bg-ac-green'
              }`} />
              
              <div 
                className="card-zakka flex-1 active:scale-[0.98] transition-transform cursor-pointer group"
                onClick={() => { setEditingItem(item); setIsEditorOpen(true); }}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-ac-brown text-lg leading-tight">{item.title}</h3>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if(confirm('確定要刪除這個行程嗎？')) deleteScheduleItem(trip.id, item.id);
                      }}
                      className="text-ac-orange/40 hover:text-ac-orange"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-ac-brown/50 text-xs font-bold mt-2">
                  <MapPin size={12} /> {item.location || '尚未設定地點'}
                </div>
                {item.note && (
                  <p className="mt-3 text-xs text-ac-brown/60 leading-relaxed border-t border-ac-border/50 pt-2 italic">
                    {item.note}
                  </p>
                )}
              </div>
            </div>
          ))
        )}

        {/* 新增按鈕 */}
        <button 
          onClick={() => { setEditingItem(undefined); setIsEditorOpen(true); }}
          className="flex items-center gap-3 w-[calc(100%-48px)] p-5 border-4 border-dashed border-ac-border rounded-[32px] text-ac-border font-black text-sm hover:border-ac-green hover:text-ac-green transition-all active:scale-95 ml-12"
        >
          <Plus size={20} /> 新增行程項目
        </button>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <ScheduleEditor 
          tripId={trip.id} 
          item={editingItem}
          onClose={() => setIsEditorOpen(false)} 
        />
      )}
    </div>
  );
};