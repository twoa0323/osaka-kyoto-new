import React, { useState, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { X, Clock, MapPin, Tag, AlignLeft, Check, Camera, Search, Trash2 } from 'lucide-react';
import { ScheduleItem } from '../types';
import { compressImage } from '../utils/imageUtils';

interface Props { tripId: string; date: string; item?: ScheduleItem; onClose: () => void; }

const CATEGORIES = [
  { id: 'sightseeing', label: '景點', color: 'bg-ac-green' },
  { id: 'food', label: '美食', color: 'bg-ac-orange' },
  { id: 'transport', label: '交通', color: 'bg-blue-400' },
  { id: 'hotel', label: '住宿', color: 'bg-purple-400' }
] as const;

export const ScheduleEditor: React.FC<Props> = ({ tripId, date, item, onClose }) => {
  const { addScheduleItem, updateScheduleItem, deleteScheduleItem } = useTripStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState<ScheduleItem>(item || {
    id: Date.now().toString(), date, time: '09:00', title: '', location: '', category: 'sightseeing', note: '', images: []
  });

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const b64 = await compressImage(e.target.files[0]);
      setForm({ ...form, images: [b64] });
    }
  };

  const handleSave = () => {
    if (!form.title) return alert("請輸入標題！");
    if (item) updateScheduleItem(tripId, item.id, form);
    else addScheduleItem(tripId, { ...form, id: Date.now().toString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center p-4">
      <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto text-left">
        <div className="p-6 flex justify-between items-center border-b-4 border-ac-border sticky top-0 bg-ac-bg z-10">
          <h2 className="text-xl font-black italic">{item ? '✍️ 編輯行程' : '📔 新增計畫'}</h2>
          <div className="flex gap-2">
            {item && <button onClick={() => { if(confirm('確定刪除這筆計畫？')) { deleteScheduleItem(tripId, item.id); onClose(); } }} className="p-2 bg-red-50 text-red-500 rounded-full active:scale-90"><Trash2 size={20}/></button>}
            <button onClick={onClose} className="p-2 bg-white rounded-full shadow-zakka active:scale-90"><X size={20}/></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">Time</label>
            <input type="time" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown" value={form.time} onChange={e => setForm({...form, time: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">Category</label>
            <select className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black outline-none appearance-none" value={form.category} onChange={e => setForm({...form, category: e.target.value as any})}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select></div>
          </div>
          
          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase">Title</label>
          <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="去哪探險？" /></div>

          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase">Location (Google Map)</label>
          <div className="flex gap-2">
            <input className="flex-1 p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="點右側搜尋 ➔" />
            <button onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(form.location || '目的地')}`, '_blank')} className="w-14 h-14 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm active:scale-90 transition-all"><Search size={24}/></button>
          </div></div>

          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">Photo</label>
          <button onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-4 border-dashed border-ac-border rounded-3xl flex flex-col items-center justify-center text-ac-border bg-white overflow-hidden relative">
             {form.images?.[0] ? <img src={form.images[0]} className="w-full h-full object-cover" /> : <><Camera size={32}/><span className="text-[10px] font-black mt-2 uppercase tracking-tighter">上傳手帳美照</span></>}
             <input ref={fileInputRef} type="file" className="hidden" onChange={handlePhoto} />
          </button></div>

          <textarea placeholder="寫點什麼筆記吧..." className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown h-24 outline-none" value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
          <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl mt-4">儲存計畫 ➔</button>
        </div>
      </div>
    </div>
  );
};



