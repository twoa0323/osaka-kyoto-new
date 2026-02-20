import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { CheckCircle2, Circle, Plus, X, Camera, Trash2, Loader2 } from 'lucide-react';
import { uploadImage } from '../utils/imageUtils';
import { ShoppingItem } from '../types';

const CATEGORIES = {
  'must-buy': { label: '🔥 必買', color: 'bg-red-400' },
  'beauty': { label: '💄 藥妝', color: 'bg-pink-400' },
  'luxury': { label: '💎 精品', color: 'bg-purple-400' },
  'souvenir': { label: '🎁 伴手禮', color: 'bg-ac-orange' },
  'general': { label: '📦 其他', color: 'bg-ac-green' }
};

export const Shopping = () => {
  const { trips, currentTripId, addShoppingItem, toggleShoppingItem, deleteShoppingItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<Partial<ShoppingItem>>({
    title: '', price: 0, currency: trip?.baseCurrency || 'JPY', isBought: false, images: [], category: 'general', note: ''
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
      } catch (err) {
        alert("上傳失敗了！");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (!form.title) return alert("要買什麼呢？寫個標題吧！🛍️");
    const newItem: ShoppingItem = {
      id: Date.now().toString(), title: form.title!, price: Number(form.price) || 0,
      currency: form.currency as any, isBought: false, images: form.images || [],
      category: form.category as any, note: form.note
    };
    addShoppingItem(trip.id, newItem);
    setIsAdding(false);
    setForm({ title: '', price: 0, currency: trip.baseCurrency, isBought: false, images: [], category: 'general' });
  };

  const list = trip.shoppingList || [];

  return (
    <div className="px-6 pb-24 animate-fade-in text-left">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-black text-ac-brown italic">購物清單</h2>
        <button onClick={() => setIsAdding(true)} className="w-12 h-12 bg-ac-green text-white rounded-full shadow-zakka flex items-center justify-center active:scale-90 transition-transform">
          <Plus size={28} />
        </button>
      </div>

      <div className="space-y-4">
        {list.length === 0 ? (
          <div className="text-center py-20 text-ac-border font-black italic">列下想買的東西，別漏掉囉！🎒</div>
        ) : (
          list.map(item => (
            // ✅ 加入 [content-visibility:auto] [contain-intrinsic-size:80px]
            <div key={item.id} className={`card-zakka bg-white flex items-center gap-4 transition-all relative group [content-visibility:auto] [contain-intrinsic-size:80px] ${item.isBought ? 'opacity-50 grayscale' : ''}`}>
              <button onClick={() => toggleShoppingItem(trip.id, item.id)} className="shrink-0 transition-transform active:scale-90">
                {item.isBought ? <CheckCircle2 className="text-ac-green" size={28} /> : <Circle className="text-ac-border" size={28} />}
              </button>
              
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleShoppingItem(trip.id, item.id)}>
                <div className="flex items-center gap-2 mb-1">
                   <span className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white ${CATEGORIES[item.category].color}`}>{CATEGORIES[item.category].label}</span>
                   <h3 className={`font-black text-ac-brown truncate ${item.isBought ? 'line-through' : ''}`}>{item.title}</h3>
                </div>
                <p className="text-[10px] font-bold text-ac-brown/40 uppercase italic">{item.price ? `${item.currency} ${item.price.toLocaleString()}` : '尚未標價'}</p>
              </div>

              {/* ✅ 加入 loading="lazy" decoding="async" */}
              {item.images.length > 0 && <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-ac-border"><img src={item.images[0]} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="item" /></div>}
              <button onClick={() => deleteShoppingItem(trip.id, item.id)} className="p-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm border-2 border-ac-border text-ac-orange opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b-4 border-ac-border">
              <h2 className="text-xl font-black text-ac-brown italic">📝 加入清單</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-white rounded-full shadow-zakka text-ac-border"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">商品名稱</label>
                <input placeholder="想買什麼？" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none focus:border-ac-green" /></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">預計價格</label>
                  <input type="number" placeholder="0" value={form.price || ''} onChange={e => setForm({...form, price: Number(e.target.value)})} className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">分類</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value as any})} className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none appearance-none">
                    {Object.entries(CATEGORIES).map(([id, cfg]) => <option key={id} value={id}>{cfg.label}</option>)}
                  </select></div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">參考照片 (選填)</label>
                  <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
                    <label className={`min-w-[80px] h-[80px] border-4 border-dashed border-ac-border rounded-2xl flex flex-col items-center justify-center text-ac-border cursor-pointer hover:bg-white transition-colors relative overflow-hidden ${isUploading ? 'pointer-events-none' : ''}`}>
                      {isUploading && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                          <Loader2 className="animate-spin text-ac-orange mb-1" size={24} strokeWidth={3}/>
                          <span className="text-[8px] font-black text-ac-orange animate-pulse tracking-widest">上傳中...</span>
                        </div>
                      )}
                      <Camera size={20}/>
                      <span className="text-[10px] font-black mt-1">拍照上傳</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                    {form.images?.map((img, i) => (
                      <div key={i} className="min-w-[80px] h-[80px] rounded-2xl overflow-hidden relative border-2 border-white shadow-sm">
                        {/* ✅ 加入 loading="lazy" decoding="async" */}
                        <img src={img} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="preview" />
                        <button onClick={() => setForm({...form, images: form.images?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={10}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                <textarea placeholder="寫點筆記（例如：要在哪間店買？）" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none h-24 resize-none" />
              </div>
              <button onClick={handleSave} className="btn-zakka w-full py-4 text-lg">加入清單 ➔</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



