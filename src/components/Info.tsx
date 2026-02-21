import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { ExternalLink, ShieldAlert, Plus, X, Camera, Trash2, Globe, Phone, Loader2, ChevronDown, FileText } from 'lucide-react';
import { uploadImage } from '../utils/imageUtils';
import { InfoItem } from '../types';

export const Info = () => {
  const { trips, currentTripId, addInfoItem, deleteInfoItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<Partial<InfoItem>>({ type: 'note', title: '', content: '', images: [], url: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null); // 👈 新增控制展開/收合的狀態

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
          <div key={item.id} className={`bg-white border-[3px] border-splat-dark rounded-[24px] overflow-hidden transition-all duration-300 ${expandedId === item.id ? 'shadow-[8px_8px_0px_#1A1A1A] -translate-y-1' : 'shadow-splat-solid-sm'}`}>
            
            {/* 標題列 (點擊展開/收合) */}
            <div className="p-5 flex justify-between items-center cursor-pointer select-none bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors" onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)}>
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <div className="w-10 h-10 bg-splat-blue border-2 border-splat-dark rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
                   <FileText size={20} strokeWidth={2.5}/>
                </div>
                <h4 className="font-black text-splat-dark text-lg uppercase truncate">{item.title}</h4>
              </div>
              <ChevronDown size={24} strokeWidth={3} className={`text-splat-dark shrink-0 transition-transform duration-300 ${expandedId === item.id ? 'rotate-180' : ''}`} />
            </div>

            {/* 展開的詳細內容區塊 */}
            {expandedId === item.id && (
              <div className="p-5 pt-0 border-t-2 border-dashed border-gray-200 bg-gray-50/50 animate-in slide-in-from-top-2 fade-in relative">
                <button onClick={() => deleteInfoItem(trip.id, item.id)} className="absolute top-4 right-4 p-2 bg-white border-2 border-splat-dark rounded-lg text-red-500 hover:bg-red-50 transition-colors shadow-sm active:scale-95"><Trash2 size={16} strokeWidth={2.5}/></button>
                
                {item.content && (
                  <div className="mt-4 pr-12">
                    <p className="text-sm text-gray-700 font-bold whitespace-pre-wrap leading-relaxed">{item.content}</p>
                  </div>
                )}
                
                {item.images && item.images.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto py-4 hide-scrollbar">
                    {item.images.map((img, i) => (
                      <div key={i} className="min-w-[120px] h-32 rounded-xl overflow-hidden border-[3px] border-splat-dark shadow-sm shrink-0 relative group cursor-pointer" onClick={() => window.open(img, '_blank')}>
                        <img src={img} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="info" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-[10px] font-black border-2 border-white px-2 py-1 rounded-md">放大</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs font-black text-splat-dark bg-white px-4 py-3 rounded-xl border-[3px] border-splat-dark uppercase tracking-widest shadow-sm active:translate-y-1 active:shadow-none transition-all w-full justify-center">
                    <ExternalLink size={16} strokeWidth={3}/> 前往相關網站
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
        
        {(trip.infoItems || []).length === 0 && (
           <div className="text-center py-16 bg-white border-[3px] border-dashed border-gray-400 rounded-[32px] text-gray-500 font-black italic shadow-sm">
             把重要的截圖跟筆記存在這吧！📂
           </div>
        )}
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



