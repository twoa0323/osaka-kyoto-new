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
  const [form, setForm] = useState<Partial<JournalItem>>({ title: '', content: '', images: [], rating: 5, location: '', date: new Date().toISOString().split('T')[0] });

  if (!trip) return null;
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files); e.target.value = ''; setIsUploading(true);
      try { const urls = await Promise.all(files.map(f => uploadImage(f))); setForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] })); } catch(err) { alert("有圖片上傳失敗了！"); } finally { setIsUploading(false); }
    }
  };
  const handleSave = () => {
    if (!form.title || (form.images?.length === 0)) return alert("標題跟照片至少要有一個唷！📸");
    const newItem: JournalItem = { id: Date.now().toString(), date: form.date!, title: form.title!, content: form.content || '', images: form.images || [], rating: form.rating || 5, location: form.location };
    addJournalItem(trip.id, newItem); setIsAdding(false); setForm({ title: '', content: '', images: [], rating: 5, location: '' });
  };

  return (
    <div className="px-4 pb-28 animate-fade-in text-left">
      <div className="flex justify-between items-center mb-6 bg-white border-[3px] border-splat-dark p-3 rounded-2xl shadow-splat-solid">
        <h2 className="text-xl font-black text-splat-dark italic uppercase ml-2">FOOD LOG</h2>
        <button onClick={() => setIsAdding(true)} className="w-10 h-10 bg-splat-orange text-white rounded-xl border-[3px] border-splat-dark shadow-splat-solid-sm flex items-center justify-center active:translate-y-1 active:shadow-none transition-all"><Plus size={24} strokeWidth={3} /></button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(trip.journals || []).length === 0 && <div className="col-span-2 text-center py-20 bg-white border-[3px] border-dashed border-gray-400 rounded-[32px] text-gray-500 font-black italic shadow-sm">拍下第一張美食吧！🍔</div>}
        {(trip.journals || []).map(item => (
          <div key={item.id} className="bg-white p-2 pb-4 rounded-[24px] shadow-splat-solid border-[3px] border-splat-dark rotate-[-1deg] hover:rotate-0 transition-transform group relative [content-visibility:auto] [contain-intrinsic-size:200px]">
             <div className="aspect-square bg-gray-100 rounded-[16px] overflow-hidden mb-3 border-2 border-splat-dark relative">
                <img src={item.images[0]} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="food" />
                {item.images.length > 1 && <div className="absolute bottom-2 right-2 bg-splat-dark text-white text-[10px] px-2 py-1 rounded-md font-black shadow-sm">+{item.images.length - 1}</div>}
             </div>
             <h3 className="font-black text-splat-dark text-sm truncate px-1 uppercase">{item.title}</h3>
             <div className="flex items-center gap-1 px-1 mt-1.5">
                {Array.from({length: 5}).map((_, i) => <Star key={i} size={12} strokeWidth={3} className={i < item.rating ? "text-splat-yellow fill-splat-yellow" : "text-gray-300"} />)}
             </div>
             <button onClick={() => deleteJournalItem(trip.id, item.id)} className="absolute top-4 right-4 p-2 bg-white/90 border-2 border-splat-dark rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-red-500 transition-opacity shadow-sm"><Trash2 size={14}/></button>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#F4F5F7] w-full max-w-md rounded-[32px] border-[4px] border-splat-dark shadow-[8px_8px_0px_#FF6C00] overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b-[4px] border-splat-dark bg-white">
              <h2 className="text-xl font-black text-splat-dark italic uppercase bg-splat-orange text-white px-3 py-1 rounded-lg border-2 border-splat-dark -rotate-2">📸 紀錄美味</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-white border-2 border-splat-dark rounded-full shadow-sm"><X size={20} strokeWidth={3}/></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
                <label className={`min-w-[100px] h-[100px] border-[3px] border-dashed border-splat-dark bg-white rounded-2xl flex flex-col items-center justify-center text-splat-dark cursor-pointer active:scale-95 transition-all relative overflow-hidden ${isUploading ? 'pointer-events-none' : ''}`}>
                  {isUploading && <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50"><Loader2 className="animate-spin text-splat-orange mb-1.5" size={28} strokeWidth={3}/><span className="text-[10px] font-black tracking-widest">上傳中...</span></div>}
                  <Camera size={24} strokeWidth={2.5}/>
                  <span className="text-[10px] font-black mt-2 uppercase tracking-widest bg-gray-100 px-2 rounded">PHOTO</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                {form.images?.map((img, i) => (
                  <div key={i} className="min-w-[100px] h-[100px] rounded-2xl overflow-hidden relative border-[3px] border-splat-dark shadow-sm">
                    <img src={img} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    <button onClick={() => setForm({...form, images: form.images?.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 bg-white border-2 border-splat-dark text-splat-dark rounded-md p-1"><X size={12} strokeWidth={3}/></button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <input placeholder="這道菜叫什麼名字？" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-xl font-black text-splat-dark outline-none focus:ring-2 focus:ring-splat-orange" />
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border-[3px] border-splat-dark shadow-sm">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">RATING</span>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(v => <Star key={v} size={28} strokeWidth={2.5} onClick={() => setForm({...form, rating: v})} className={v <= (form.rating || 0) ? "text-splat-yellow fill-splat-yellow" : "text-gray-200 cursor-pointer"} />)}
                  </div>
                </div>
                <div className="relative">
                  <MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-splat-dark" size={20} strokeWidth={2.5} />
                  <input placeholder="在哪裡吃的？(可貼地圖)" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white border-[3px] border-splat-dark rounded-xl font-bold text-splat-dark outline-none text-sm focus:ring-2 focus:ring-splat-orange" />
                </div>
                <textarea placeholder="味道如何？寫下感想..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-xl font-bold text-splat-dark outline-none h-32 resize-none focus:ring-2 focus:ring-splat-orange" />
              </div>
              <button onClick={handleSave} className="btn-splat w-full py-4 text-xl bg-splat-orange text-white">收藏美味 ➔</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




