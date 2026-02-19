import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { ExternalLink, ShieldAlert, Plus, X, Camera, Trash2, Globe, Phone, Loader2 } from 'lucide-react';
import { uploadImage } from '../utils/imageUtils';
import { InfoItem } from '../types';

export const Info = () => {
  const { trips, currentTripId, addInfoItem, deleteInfoItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<Partial<InfoItem>>({
    type: 'note', title: '', content: '', images: [], url: ''
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
        alert("上傳失敗！");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (!form.title) return alert("給這條資訊一個標題吧！");
    const newItem: InfoItem = {
      id: Date.now().toString(), type: form.type as any, title: form.title!,
      content: form.content || '', images: form.images || [], url: form.url
    };
    addInfoItem(trip.id, newItem);
    setIsAdding(false);
    setForm({ type: 'note', title: '', content: '', images: [], url: '' });
  };

  return (
    <div className="px-6 pb-24 animate-fade-in text-left space-y-6">
      <div className="flex justify-between items-end">
        <h2 className="text-2xl font-black text-ac-brown italic">旅遊資訊</h2>
        <button onClick={() => setIsAdding(true)} className="w-12 h-12 bg-ac-brown text-white rounded-full shadow-zakka flex items-center justify-center active:scale-90 transition-transform">
          <Plus size={28} />
        </button>
      </div>

      <a href="https://www.vjw.digital.go.jp/" target="_blank" rel="noreferrer" className="card-zakka bg-[#1A1A1A] text-white border-none flex items-center justify-between p-6 group active:scale-95 transition-transform">
        <div className="space-y-1">
          <span className="bg-[#E85D75] text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Must Have</span>
          <h3 className="text-xl font-black italic">Visit Japan Web</h3>
          <p className="text-[10px] opacity-40">入境審查與海關申報</p>
        </div>
        <Globe className="text-[#E85D75] group-hover:rotate-12 transition-transform" size={32} />
      </a>

      <div className="card-zakka bg-red-50 border-red-200 p-6 space-y-4">
        <h3 className="flex items-center gap-2 font-black text-red-900"><ShieldAlert size={18}/> 緊急救援</h3>
        <div className="grid grid-cols-2 gap-3">
          <a href="tel:110" className="bg-white border-2 border-red-100 p-3 rounded-2xl flex items-center gap-3 font-black text-red-800 text-sm shadow-sm active:bg-red-100"><Phone size={14}/> 警察 110</a>
          <a href="tel:119" className="bg-white border-2 border-red-100 p-3 rounded-2xl flex items-center gap-3 font-black text-red-800 text-sm shadow-sm active:bg-red-100"><Phone size={14}/> 救護 119</a>
        </div>
      </div>

      <div className="space-y-4">
        {(trip.infoItems || []).map(item => (
          <div key={item.id} className="card-zakka bg-white group relative">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-black text-ac-brown text-lg">{item.title}</h4>
              <button onClick={() => deleteInfoItem(trip.id, item.id)} className="p-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm border-2 border-ac-border text-ac-orange opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
            </div>
            {item.content && <p className="text-sm text-ac-brown/60 mb-4 whitespace-pre-wrap">{item.content}</p>}
            {item.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {item.images.map((img, i) => <img key={i} src={img} className="w-24 h-24 rounded-xl object-cover border-2 border-ac-border" alt="info" />)}
              </div>
            )}
            {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-black text-ac-green mt-2 underline"><ExternalLink size={12}/> 查看外部連結</a>}
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b-4 border-ac-border">
              <h2 className="text-xl font-black text-ac-brown italic">💡 增加資訊</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-white rounded-full shadow-zakka text-ac-border"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-5">
              <input placeholder="資訊標題 (如：保險單號、備用地點)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" />
              <textarea placeholder="寫下具體內容..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none h-32 resize-none" />
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-ac-border" size={18} />
                <input placeholder="相關網址連結 (選填)" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-ac-brown/40 uppercase">相關照片 (可上傳多張截圖)</label>
                <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
                  <label className={`min-w-[80px] h-[80px] border-4 border-dashed border-ac-border rounded-2xl flex flex-col items-center justify-center text-ac-border cursor-pointer hover:bg-white relative overflow-hidden ${isUploading ? 'pointer-events-none' : ''}`}>
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                        <Loader2 className="animate-spin text-ac-orange mb-1" size={24} strokeWidth={3}/>
                        <span className="text-[8px] font-black text-ac-orange animate-pulse tracking-widest">上傳中...</span>
                      </div>
                    )}
                    <Camera size={20}/>
                    <span className="text-[10px] font-black mt-1">照片上傳</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                  {form.images?.map((img, i) => (
                    <div key={i} className="min-w-[80px] h-[80px] rounded-2xl overflow-hidden relative border-2 border-white shadow-sm">
                      <img src={img} className="w-full h-full object-cover" />
                      <button onClick={() => setForm({...form, images: form.images?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={10}/></button>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleSave} className="btn-zakka w-full py-4 text-lg">儲存資訊 ➔</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


