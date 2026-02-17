import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { X, Clock, MapPin, Tag, AlignLeft, Check } from 'lucide-react';
import { ScheduleItem } from '../types';

interface Props {
  tripId: string;
  item?: ScheduleItem; // 如果有傳入代表編輯模式
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'sightseeing', label: '景點', color: 'bg-ac-green' },
  { id: 'food', label: '美食', color: 'bg-ac-orange' },
  { id: 'transport', label: '交通', color: 'bg-blue-400' },
  { id: 'hotel', label: '住宿', color: 'bg-purple-400' }
] as const;

export const ScheduleEditor: React.FC<Props> = ({ tripId, item, onClose }) => {
  const { addScheduleItem, updateScheduleItem } = useTripStore();
  
  const [form, setForm] = useState<ScheduleItem>(item || {
    id: Date.now().toString(),
    time: '09:00',
    title: '',
    location: '',
    category: 'sightseeing',
    note: ''
  });

  const handleSave = () => {
    if (!form.title) return alert("寫個標題吧！不然會忘記要去哪裡唷～");
    
    if (item) {
      updateScheduleItem(tripId, item.id, form);
    } else {
      addScheduleItem(tripId, { ...form, id: Date.now().toString() });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
        
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b-4 border-ac-border">
          <h2 className="text-xl font-black text-ac-brown italic">
            {item ? '✍️ 編輯手帳' : '📔 新增計畫'}
          </h2>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-zakka text-ac-border active:scale-90 transition-transform">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto hide-scrollbar">
          
          {/* 時間與類別 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-ac-brown/50 flex items-center gap-1 uppercase tracking-widest"><Clock size={12}/> Time</label>
              <input 
                type="time" 
                className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none focus:border-ac-green transition-colors"
                value={form.time}
                onChange={e => setForm({...form, time: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-ac-brown/50 flex items-center gap-1 uppercase tracking-widest"><Tag size={12}/> Category</label>
              <select 
                className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none appearance-none"
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value as any})}
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* 標題 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-ac-brown/50 flex items-center gap-1 uppercase tracking-widest">Title</label>
            <input 
              placeholder="要去哪裡探險呢？"
              className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none focus:border-ac-green"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
            />
          </div>

          {/* 地點 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-ac-brown/50 flex items-center gap-1 uppercase tracking-widest"><MapPin size={12}/> Location</label>
            <input 
              placeholder="輸入地名或地址"
              className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none focus:border-ac-green"
              value={form.location}
              onChange={e => setForm({...form, location: e.target.value})}
            />
          </div>

          {/* 備註 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-ac-brown/50 flex items-center gap-1 uppercase tracking-widest"><AlignLeft size={12}/> Notes</label>
            <textarea 
              placeholder="寫點備註吧..."
              className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none h-24 resize-none focus:border-ac-green"
              value={form.note}
              onChange={e => setForm({...form, note: e.target.value})}
            />
          </div>
        </div>

        {/* 儲存按鈕 */}
        <div className="p-6 pt-0">
          <button 
            onClick={handleSave}
            className="btn-zakka w-full py-4 text-lg flex items-center justify-center gap-2"
          >
            <Check size={20} /> 儲存至行程 ➔
          </button>
        </div>
      </div>
    </div>
  );
};