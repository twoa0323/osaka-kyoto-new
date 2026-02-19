// filepath: src/components/Journal.tsx
import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Camera, MapPin, Star, Plus, X, Image as ImageIcon, Map as MapIcon, Edit3, Trash2, Loader2 } from 'lucide-react';
import { uploadImage } from '../utils/imageUtils';
import { JournalItem } from '../types';

export const Journal = () => {
  const { trips, currentTripId, addJournalItem, updateJournalItem, deleteJournalItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JournalItem | undefined>();
  const [detailItem, setDetailItem] = useState<JournalItem | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  
  const [form, setForm] = useState<Partial<JournalItem>>({
    title: '', content: '', images: [], rating: 5, location: '', date: new Date().toISOString().split('T')[0]
  });

  if (!trip) return null;

  const handleOpenAdd = () => {
    setEditingItem(undefined);
    setForm({ title: '', content: '', images: [], rating: 5, location: '', date: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: JournalItem) => {
    setEditingItem(item);
    setForm(item);
    setIsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      e.target.value = '';
      setIsUploading(true);
      try {
        const urls = await Promise.all(files.map(f => uploadImage(f)));
        setForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
      } catch(err) { alert("上傳失敗了！"); } 
      finally { setIsUploading(false); }
    }
  };

  const handleSave = () => {
    if (!form.title && form.images?.length === 0) return alert("標題跟照片至少要有一個唷！📸");
    if (editingItem) {
      updateJournalItem(trip.id, editingItem.id, { ...form, id: editingItem.id });
    } else {
      addJournalItem(trip.id, { ...form, id: Date.now().toString() } as JournalItem);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (editingItem && confirm('確定要刪除這筆手帳嗎？')) {
      deleteJournalItem(trip.id, editingItem.id);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="px-6 pb-20 animate-fade-in text-left">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-black text-ac-brown italic">美食手帳</h2>
        <button onClick={handleOpenAdd} className="w-12 h-12 bg-ac-orange text-white rounded-full shadow-zakka flex items-center justify-center active:scale-90 transition-transform"><Plus size={28} /></button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(trip.journals || []).map(item => (
          <div key={item.id} onClick={() => setDetailItem(item)} className="bg-white p-2 pb-4 rounded-xl shadow-zakka border-2 border-ac-border rotate-[-1deg] hover:rotate-0 transition-transform group relative cursor-pointer active:scale-95">
             <div className="aspect-square bg-ac-bg rounded-lg overflow-hidden mb-2 relative">
                {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" alt="food" /> : <div className="flex h-full items-center justify-center text-ac-border"><MapPin size={32}/></div>}
                {item.images?.length > 1 && <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded-full">+{item.images.length - 1}</div>}
             </div>
             <h3 className="font-black text-ac-brown text-sm truncate px-1">{item.title}</h3>
             <div className="flex items-center gap-0.5 px-1 mt-1">
                {Array.from({length: 5}).map((_, i) => <Star key={i} size={8} className={i < item.rating ? "text-ac-orange fill-ac-orange" : "text-ac-border"} />)}
             </div>
             <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }} className="absolute top-1 right-1 p-1.5 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 text-ac-brown hover:text-ac-orange transition-all"><Edit3 size={14}/></button>
          </div>
        ))}
      </div>

      {/* 詳情 Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[600] p-6 flex items-center justify-center" onClick={() => setDetailItem(undefined)}>
           <div className="bg-ac-bg w-full max-w-sm rounded-[45px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              {detailItem.images?.[0] && (
                <div className="h-64 bg-gray-200 relative overflow-hidden">
                   <img src={detailItem.images[0]} className="w-full h-full object-cover" alt="food" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                   <button onClick={() => setDetailItem(undefined)} className="absolute top-6 right-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white"><X size={20}/></button>
                   <h2 className="absolute bottom-6 left-6 text-2xl font-black text-white italic tracking-wide drop-shadow-md">{detailItem.title}</h2>
                </div>
              )}
              <div className="p-8 space-y-6">
                 {!detailItem.images?.[0] && (
                   <div className="flex justify-between items-start">
                      <h2 className="text-2xl font-black text-ac-brown italic tracking-wide">{detailItem.title}</h2>
                      <button onClick={() => setDetailItem(undefined)} className="p-2 bg-white shadow-sm rounded-full text-ac-border"><X size={20}/></button>
                   </div>
                 )}
                 <div className="flex items-center gap-1">
                   {Array.from({length: 5}).map((_, i) => <Star key={i} size={18} className={i < detailItem.rating ? "text-ac-orange fill-ac-orange" : "text-ac-border"} />)}
                 </div>
                 {detailItem.location && (
                   <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-ac-green bg-white p-3 rounded-2xl shadow-sm border border-ac-border w-full">
                      <MapPin size={14} className="shrink-0"/> <span className="truncate">{detailItem.location}</span>
                   </span>
                 )}
                 <p className="text-sm text-ac-brown/80 font-bold whitespace-pre-wrap leading-relaxed min-h-[60px]">{detailItem.content || "尚無留下筆記"}</p>
                 <button onClick={() => { setDetailItem(undefined); handleOpenEdit(detailItem); }} className="btn-zakka w-full py-4 text-lg">編輯此筆記</button>
              </div>
           </div>
        </div>
      )}

      {/* 新增/編輯 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[700] flex items-end sm:items-center justify-center p-4">
          <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b-4 border-ac-border sticky top-0 bg-ac-bg z-10">
              <h2 className="text-xl font-black text-ac-brown italic">{editingItem ? '✍️ 編輯手帳' : '📸 紀錄美味'}</h2>
              <div className="flex gap-2">
                {editingItem && <button onClick={handleDelete} className="p-2 bg-red-50 text-red-500 rounded-full active:scale-90"><Trash2 size={20}/></button>}
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full shadow-zakka text-ac-border"><X size={20}/></button>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
                <label className={`min-w-[100px] h-[100px] border-4 border-dashed border-ac-border rounded-2xl flex flex-col items-center justify-center text-ac-border cursor-pointer hover:bg-white transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isUploading ? <Loader2 className="animate-spin mb-1" size={24}/> : <Camera size={24}/>}
                  <span className="text-[10px] font-black mt-1">{isUploading ? '上傳中...' : '拍照上傳'}</span>
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
              <button onClick={handleSave} className="btn-zakka w-full py-4 text-lg">{editingItem ? '儲存修改 ➔' : '收藏美味 ➔'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

