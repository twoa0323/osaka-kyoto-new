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
  const [form, setForm] = useState<Partial<InfoItem>>({ type: 'note', title: '', content: '', images: [], url: '' });

  if (!trip) return null;
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files); e.target.value = ''; setIsUploading(true);
      try { const urls = await Promise.all(files.map(f => uploadImage(f))); setForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] })); } catch(err) { alert("上傳失敗！"); } finally { setIsUploading(false); }
    }
  };
  const handleSave = () => {
    if (!form.title) return alert("給這條資訊一個標題吧！");
    const newItem: InfoItem = { id: Date.now().toString(), type: form.type as any, title: form.title!, content: form.content || '', images: form.images || [], url: form.url };
    addInfoItem(trip.id, newItem); setIsAdding(false); setForm({ type: 'note', title: '', content: '', images: [], url: '' });
  };

  return (
    <div className="px-4 pb-28 animate-fade-in text-left space-y-6">
      <div className="flex justify-between items-center bg-white border-[3px] border-splat-dark p-3 rounded-2xl shadow-splat-solid">
        <h2 className="text-xl font-black text-splat-dark italic uppercase ml-2">INFORMATION</h2>
        <button onClick={() => setIsAdding(true)} className="w-10 h-10 bg-splat-dark text-white rounded-xl border-[3px] border-splat-dark shadow-[2px_2px_0px_#FFFFFF] flex items-center justify-center active:translate-y-1 active:shadow-none transition-all"><Plus size={24} strokeWidth={3} /></button>
      </div>

      <a href="https://www.vjw.digital.go.jp/" target="_blank" rel="noreferrer" className="bg-[#1A1A1A] text-white border-[4px] border-splat-dark rounded-[24px] shadow-splat-solid flex items-center justify-between p-6 group active:scale-[0.98] transition-transform">
        <div className="space-y-1">
          <span className="bg-splat-pink text-[9px] font-black px-2 py-0.5 rounded border-2 border-splat-dark uppercase tracking-widest shadow-sm -rotate-2 inline-block mb-1">Must Have</span>
          <h3 className="text-2xl font-black italic tracking-wider">Visit Japan Web</h3>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">入境審查與海關申報</p>
        </div>
        <Globe className="text-splat-pink group-hover:rotate-12 transition-transform" size={40} strokeWidth={2}/>
      </a>

      <div className="bg-red-50 border-[4px] border-splat-dark rounded-[24px] shadow-splat-solid p-6 space-y-4">
        <h3 className="flex items-center gap-2 font-black text-red-600 text-xl uppercase italic bg-white inline-block px-3 py-1 border-2 border-splat-dark rounded-lg -rotate-1"><ShieldAlert size={20} strokeWidth={3}/> SOS 救援</h3>
        <div className="grid grid-cols-2 gap-4">
          <a href="tel:110" className="bg-white border-[3px] border-splat-dark p-4 rounded-xl flex flex-col items-center gap-2 font-black text-splat-dark text-lg shadow-sm active:translate-y-1 transition-all"><Phone size={24} className="text-splat-blue"/> 警察 110</a>
          <a href="tel:119" className="bg-white border-[3px] border-splat-dark p-4 rounded-xl flex flex-col items-center gap-2 font-black text-splat-dark text-lg shadow-sm active:translate-y-1 transition-all"><Phone size={24} className="text-red-500"/> 救護 119</a>
        </div>
      </div>

      <div className="space-y-4">
        {(trip.infoItems || []).map(item => (
          <div key={item.id} className="bg-white border-[3px] border-splat-dark rounded-[24px] shadow-splat-solid p-6 group relative">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-black text-splat-dark text-xl uppercase pr-8">{item.title}</h4>
              <button onClick={() => deleteInfoItem(trip.id, item.id)} className="absolute top-4 right-4 p-2 bg-gray-100 border-2 border-splat-dark rounded-lg text-red-500 hover:bg-splat-pink hover:text-white transition-colors shadow-sm"><Trash2 size={16} strokeWidth={2.5}/></button>
            </div>
            {item.content && <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-3 rounded-xl mt-3"><p className="text-sm text-gray-700 font-bold whitespace-pre-wrap">{item.content}</p></div>}
            {item.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-3 hide-scrollbar">
                {item.images.map((img, i) => <img key={i} src={img} className="w-24 h-24 rounded-xl object-cover border-[3px] border-splat-dark shadow-sm" alt="info" />)}
              </div>
            )}
            {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-white bg-splat-blue px-4 py-2 rounded-lg border-2 border-splat-dark mt-3 uppercase tracking-widest shadow-sm active:translate-y-1 transition-transform"><ExternalLink size={14} strokeWidth={3}/> 查看連結</a>}
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#F4F5F7] w-full max-w-md rounded-[32px] border-[4px] border-splat-dark shadow-[8px_8px_0px_#1A1A1A] overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b-[4px] border-splat-dark bg-white">
              <h2 className="text-xl font-black text-white italic uppercase bg-splat-dark px-3 py-1 rounded-lg border-2 border-splat-dark -rotate-2">💡 增加資訊</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-white border-2 border-splat-dark rounded-full shadow-sm"><X size={20} strokeWidth={3}/></button>
            </div>
            <div className="p-6 space-y-6">
              <input placeholder="資訊標題 (如：保險單號)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-xl font-black text-splat-dark outline-none focus:ring-2 focus:ring-splat-dark" />
              <textarea placeholder="寫下具體內容..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-xl font-bold text-splat-dark outline-none h-32 resize-none focus:ring-2 focus:ring-splat-dark" />
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-splat-dark" size={20} strokeWidth={2.5}/>
                <input placeholder="相關網址連結 (選填)" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white border-[3px] border-splat-dark rounded-xl font-bold text-splat-dark outline-none text-sm focus:ring-2 focus:ring-splat-dark" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">相關照片 (可上傳多張截圖)</label>
                <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
                  <label className={`min-w-[80px] h-[80px] border-[3px] border-dashed border-splat-dark bg-white rounded-xl flex flex-col items-center justify-center text-splat-dark cursor-pointer active:scale-95 transition-all relative overflow-hidden ${isUploading ? 'pointer-events-none' : ''}`}>
                    {isUploading && <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50"><Loader2 className="animate-spin text-splat-dark" size={24} strokeWidth={3}/></div>}
                    <Camera size={24} strokeWidth={2.5}/>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                  {form.images?.map((img, i) => (
                    <div key={i} className="min-w-[80px] h-[80px] rounded-xl overflow-hidden relative border-[3px] border-splat-dark shadow-sm">
                      <img src={img} className="w-full h-full object-cover" />
                      <button onClick={() => setForm({...form, images: form.images?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-white border-2 border-splat-dark text-splat-dark rounded-md p-1"><X size={10} strokeWidth={3}/></button>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleSave} className="btn-splat w-full py-4 text-xl bg-splat-dark text-white">儲存資訊 ➔</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



