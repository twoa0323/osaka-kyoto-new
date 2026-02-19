import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Camera, MapPin, Star, Plus, X, Image as ImageIcon, Map as MapIcon, Trash2, Loader2 } from 'lucide-react';
import { uploadImage } from '../utils/imageUtils';
import { JournalItem } from '../types';

export const Journal = () => {
  const { trips, currentTripId, addJournalItem, deleteJournalItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<Partial<JournalItem>>({
    title: '', content: '', images: [], rating: 5, location: '', date: new Date().toISOString().split('T')[0]
  });

  if (!trip) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      e.target.value = '';
      setIsUploading(true);
      try {
        const urls = await Promise.all(files.map(f => uploadImage(f)));
        setForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
      } catch(err) {
        alert("有圖片上傳失敗了！");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (!form.title || (form.images?.length === 0)) return alert("標題跟照片至少要有一個唷！📸");
    const newItem: JournalItem = {
      id: Date.now().toString(), date: form.date!, title: form.title!,
      content: form.content || '', images: form.images || [], rating: form.rating || 5, location: form.location
    };
    addJournalItem(trip.id, newItem);
    setIsAdding(false);
    setForm({ title: '', content: '', images: [], rating: 5, location: '' });
  };

  return (
    <div className="px-6 pb-20 animate-fade-in text-left">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-black text-ac-brown italic">美食手帳</h2>
        <button onClick={() => setIsAdding(true)} className="w-12 h-12 bg-ac-orange text-white rounded-full shadow-zakka flex items-center justify-center active:scale-90 transition-transform">
          <Plus size={28} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(trip.journals || []).map(item => (
          <div key={item.id} className="bg-white p-2 pb-4 rounded-xl shadow-zakka border-2 border-ac-border rotate-[-1deg] hover:rotate-0 transition-transform group relative">
             <div className="aspect-square bg-ac-bg rounded-lg overflow-hidden mb-2 relative">
                <img src={item.images[0]} className="w-full h-full object-cover" alt="food" />
                {item.images.length > 1 && <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded-full">+{item.images.length - 1}</div>}
             </div>
             <h3 className="font-black text-ac-brown text-sm truncate px-1">{item.title}</h3>
             <div className="flex items-center gap-0.5 px-1 mt-1">
                {Array.from({length: 5}).map((_, i) => <Star key={i} size={8} className={i < item.rating ? "text-ac-orange fill-ac-orange" : "text-ac-border"} />)}
             </div>
             <button onClick={() => deleteJournalItem(trip.id, item.id)} className="absolute top-1 right-1 p-1 bg-white/90 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-ac-orange transition-opacity shadow-sm"><Trash2 size={12}/></button>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b-4 border-ac-border">
              <h2 className="text-xl font-black text-ac-brown italic">📸 紀錄美味</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-white rounded-full shadow-zakka text-ac-border"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
                <label className={`min-w-[100px] h-[100px] border-4 border-dashed border-ac-border rounded-2xl flex flex-col items-center justify-center text-ac-border cursor-pointer hover:bg-white transition-colors relative overflow-hidden ${isUploading ? 'pointer-events-none' : ''}`}>
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                      <Loader2 className="animate-spin text-ac-orange mb-1.5" size={28} strokeWidth={3}/>
                      <span className="text-[10px] font-black text-ac-orange animate-pulse tracking-widest">上傳中...</span>
                    </div>
                  )}
                  <Camera size={24}/>
                  <span className="text-[10px] font-black mt-1">拍照/上傳</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                {form.images?.map((img, i) => (
                  <div key={i} className="min-w-[100px] h-[100px] rounded-2xl overflow-hidden relative border-2 border-white shadow-sm">
                    <img src={img} className="w-full h-full object-cover" alt="preview" />
                    <button onClick={() => setForm({...form, images: form.images?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <input placeholder="這道菜叫什麼名字？" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" />
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border-2 border-ac-border">
                  <span className="text-[10px] font-black text-ac-brown/40 uppercase">評分</span>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(v => <Star key={v} size={24} onClick={() => setForm({...form, rating: v})} className={v <= (form.rating || 0) ? "text-ac-orange fill-ac-orange" : "text-ac-border cursor-pointer"} />)}
                  </div>
                </div>
                <div className="relative">
                  <MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-ac-border" size={18} />
                  <input placeholder="在哪裡吃的？(可匯入地圖連結)" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none text-sm" />
                </div>
                <textarea placeholder="味道如何？寫下你的吃貨感想..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none h-32 resize-none" />
              </div>
              <button onClick={handleSave} className="btn-zakka w-full py-4 text-lg">收藏美味 ➔</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


