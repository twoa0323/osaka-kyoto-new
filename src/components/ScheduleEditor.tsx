import { useState, useRef, FC, ChangeEvent } from 'react';
import { useTripStore } from '../store/useTripStore';
import { X, Search, Camera, Trash2, Loader2 } from 'lucide-react';
import { ScheduleItem } from '../types';
import { uploadImage } from '../utils/imageUtils';
import { BottomSheet } from './ui/BottomSheet';

interface Props { tripId: string; date: string; item?: ScheduleItem; onClose: () => void; }

const CATEGORIES = [
  { id: 'sightseeing', label: '景點', color: 'bg-ac-green' },
  { id: 'food', label: '美食', color: 'bg-ac-orange' },
  { id: 'transport', label: '交通', color: 'bg-blue-400' },
  { id: 'hotel', label: '住宿', color: 'bg-purple-400' }
] as const;

export const ScheduleEditor: FC<Props> = ({ tripId, date, item, onClose }) => {
  const { addScheduleItem, updateScheduleItem, deleteScheduleItem, showToast } = useTripStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState<ScheduleItem>(item || {
    id: Date.now().toString(), date, time: '09:00', endTime: '', title: '', location: '', category: 'sightseeing', note: '', images: []
  });

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      e.target.value = '';
      setIsUploading(true);
      try {
        const url = await uploadImage(file);
        setForm(prev => ({ ...prev, images: [url] }));
      } catch (err) {
        showToast("圖片上傳失敗，請稍後再試！", "error");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (!form.title) return showToast("請輸入標題！", "info");
    if (item) updateScheduleItem(tripId, item.id, form);
    else addScheduleItem(tripId, { ...form, id: Date.now().toString() });
    onClose();
  };

  return (
    <BottomSheet isOpen={true} onClose={onClose} title={item ? '✍️ 編輯行程' : '📔 手寫計畫'}>
      <div className="space-y-5">
        {item && (
          <div className="flex justify-end -mb-4">
            <button onClick={() => { deleteScheduleItem(tripId, item.id); showToast("已刪除行程", "success"); onClose(); }} className="p-2 bg-red-50 text-red-500 rounded-full active:scale-90"><Trash2 size={20} /></button>
          </div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">Start Time</label>
              <input type="time" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">End Time (選填)</label>
              <input type="time" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" value={form.endTime || ''} onChange={e => setForm({ ...form, endTime: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">Category</label>
            <select className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black outline-none appearance-none cursor-pointer" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase">Title</label>
            <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="去哪探險？" /></div>

          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase">Location (Google Map)</label>
            <div className="flex gap-2">
              <input className="flex-1 p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="點右側搜尋 ➔" />
              <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location || '目的地')}`, '_blank')} className="w-14 h-14 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm active:scale-90 transition-all"><Search size={24} /></button>
            </div></div>

          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">Photo</label>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-4 border-dashed border-ac-border rounded-3xl flex flex-col items-center justify-center text-ac-border bg-white overflow-hidden relative active:scale-98 transition-all group">
              {isUploading && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                  <Loader2 className="animate-spin text-ac-orange mb-2" size={36} strokeWidth={3} />
                  <span className="text-xs font-black text-ac-orange animate-pulse tracking-widest">照片上傳中...</span>
                </div>
              )}
              {form.images?.[0] ? (
                <>
                  <img src={form.images[0]} className="w-full h-full object-cover pointer-events-none" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="bg-black/60 text-white text-xs font-black px-4 py-1.5 rounded-full">點擊更換照片</span></div>
                </>
              ) : (
                <><Camera size={32} /><span className="text-[10px] font-black mt-2 uppercase tracking-tighter">上傳手帳美照</span></>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          <textarea placeholder="寫點什麼筆記吧..." className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown h-24 outline-none" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl mt-4">儲存計畫 ➔</button>
        </div>
      </div>
    </BottomSheet>
  );
};






