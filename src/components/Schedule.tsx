import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
// 1. [修正] 補上 Plus 的引入
import { X, Clock, MapPin, Tag, AlignLeft, Image as ImageIcon, Plus } from 'lucide-react';
import { ScheduleItem } from '../types';

interface Props {
  tripId: string;
  item?: ScheduleItem; // 如果有傳入代表編輯，沒有則代表新增
  onClose: () => void;
}

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
    if (!form.title) return alert("請輸入行程標題唷！");
    
    // 簡單的資料清理 (防呆)
    const cleanForm = {
        ...form,
        // 確保 note 是字串 (即便原本是 undefined)
        note: form.note || '' 
    };

    if (item) {
      updateScheduleItem(tripId, item.id, cleanForm);
    } else {
      addScheduleItem(tripId, cleanForm);
    }
    onClose();
  };

  const categories = [
    { id: 'sightseeing', label: '景點', color: 'bg-ac-green' },
    { id: 'food', label: '美食', color: 'bg-ac-orange' },
    { id: 'transport', label: '交通', color: 'bg-blue-400' },
    { id: 'hotel', label: '住宿', color: 'bg-purple-400' }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-end sm:items-center justify-center p-4">
      <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b-2 border-ac-border">
          <h2 className="text-xl font-black text-ac-brown italic">
            {item ? '編輯手帳' : '新增計畫'}
          </h2>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-zakka text-ac-border">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto hide-scrollbar">
          {/* 時間與類別 */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-ac-border flex items-center gap-1 uppercase"><Clock size={12}/> Time</label>
              <input 
                type="time" 
                className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none"
                value={form.time}
                onChange={e => setForm({...form, time: e.target.value})}
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-ac-border flex items-center gap-1 uppercase"><Tag size={12}/> Category</label>
              <select 
                className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none appearance-none"
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value as any})}
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* 標題 (這裡使用了 Plus Icon) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-ac-border flex items-center gap-1 uppercase"><Plus size={12}/> Title</label>
            <input 
              placeholder="要去哪裡呢？"
              className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
            />
          </div>

          {/* 地點 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-ac-border flex items-center gap-1 uppercase"><MapPin size={12}/> Location</label>
            <input 
              placeholder="輸入具體地址或地名"
              className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none"
              value={form.location}
              onChange={e => setForm({...form, location: e.target.value})}
            />
          </div>

          {/* 備註 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-ac-border flex items-center gap-1 uppercase"><AlignLeft size={12}/> Notes</label>
            <textarea 
              placeholder="寫點什麼筆記吧..."
              className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none h-24 resize-none"
              value={form.note}
              onChange={e => setForm({...form, note: e.target.value})}
            />
          </div>

          {/* 圖片上傳區域 (示意) */}
          <div className="border-4 border-dashed border-ac-border rounded-3xl p-8 flex flex-col items-center justify-center text-ac-border gap-2 hover:bg-white transition-colors cursor-pointer">
             <ImageIcon size={32} />
             <span className="text-xs font-bold">上傳照片記錄當下吧！</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6">
          <button onClick={handleSave} className="btn-zakka w-full py-4 text-lg">
            儲存至手帳 ➔
          </button>
        </div>
      </div>
    </div>
  );
};