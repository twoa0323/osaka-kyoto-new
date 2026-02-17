import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
// 記得引入 Plus
import { X, Clock, MapPin, Tag, AlignLeft, Image as ImageIcon, Plus, Edit2, Trash2 } from 'lucide-react';
import { ScheduleItem } from '../types';

// ==========================================
// 1. 編輯器元件 (原本的內容，負責新增/修改)
// ==========================================
interface EditorProps {
  tripId: string;
  item?: ScheduleItem;
  onClose: () => void;
}

const ScheduleEditor: React.FC<EditorProps> = ({ tripId, item, onClose }) => {
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
    
    const cleanForm = { ...form, note: form.note || '' };

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

          {/* 標題 */}
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

          <div className="border-4 border-dashed border-ac-border rounded-3xl p-8 flex flex-col items-center justify-center text-ac-border gap-2 hover:bg-white transition-colors cursor-pointer">
             <ImageIcon size={32} />
             <span className="text-xs font-bold">上傳照片記錄當下吧！</span>
          </div>
        </div>

        <div className="p-6">
          <button onClick={handleSave} className="btn-zakka w-full py-4 text-lg">
            儲存至手帳 ➔
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. 主列表元件 (App.tsx 真正要 import 的)
// ==========================================
export const Schedule: React.FC = () => {
  const { trips, currentTripId, deleteScheduleItem } = useTripStore();
  const currentTrip = trips.find(t => t.id === currentTripId);

  // 控制編輯器狀態
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>(undefined);

  if (!currentTrip) return <div className="text-center p-10 opacity-50">尚未選擇行程</div>;

  // 依時間排序
  const items = (currentTrip.items || []).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="pb-24">
      {/* 列表內容 */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-20 text-ac-brown/40 font-bold italic">
            還沒有行程，按右下角新增吧！
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card-zakka flex gap-4 items-start group">
              <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-lg font-black text-ac-brown">{item.time}</span>
                <div className={`w-3 h-3 rounded-full mt-2 ${
                  item.category === 'food' ? 'bg-ac-orange' : 
                  item.category === 'transport' ? 'bg-blue-400' : 
                  item.category === 'hotel' ? 'bg-purple-400' : 'bg-ac-green'
                }`} />
              </div>
              
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-lg text-ac-brown">{item.title}</h3>
                {item.location && (
                  <p className="text-xs text-ac-brown/60 flex items-center gap-1">
                    <MapPin size={10} /> {item.location}
                  </p>
                )}
                {item.note && <p className="text-xs text-ac-brown/80 mt-2 bg-ac-bg p-2 rounded-lg">{item.note}</p>}
              </div>

              {/* 操作按鈕 */}
              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingItem(item); setIsEditing(true); }}
                  className="p-2 bg-ac-bg rounded-full text-ac-brown hover:bg-ac-green hover:text-white transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => deleteScheduleItem(currentTrip.id, item.id)}
                  className="p-2 bg-ac-bg rounded-full text-ac-brown hover:bg-red-400 hover:text-white transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 浮動新增按鈕 */}
      <button 
        onClick={() => { setEditingItem(undefined); setIsEditing(true); }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-ac-brown text-white rounded-full shadow-zakka flex items-center justify-center active:scale-95 transition-all z-40"
      >
        <Plus size={28} />
      </button>

      {/* 編輯器 Modal */}
      {isEditing && (
        <ScheduleEditor 
          tripId={currentTrip.id} 
          item={editingItem} 
          onClose={() => setIsEditing(false)} 
        />
      )}
    </div>
  );
};