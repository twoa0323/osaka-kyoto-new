import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { CheckSquare, Square, Plus, X, Camera, Trash2, Loader2 } from 'lucide-react';
import { uploadImage } from '../utils/imageUtils';
import { ShoppingItem } from '../types';

const CATEGORIES = {
  'must-buy': { label: '🔥 必買', color: 'bg-splat-pink text-white' },
  'beauty': { label: '💄 藥妝', color: 'bg-[#FF69B4] text-white' },
  'luxury': { label: '💎 精品', color: 'bg-[#9370DB] text-white' },
  'souvenir': { label: '🎁 伴手禮', color: 'bg-splat-orange text-white' },
  'general': { label: '📦 其他', color: 'bg-splat-green text-white' }
};

export const Shopping = () => {
  const { trips, currentTripId, addShoppingItem, toggleShoppingItem, deleteShoppingItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<Partial<ShoppingItem>>({ title: '', price: 0, currency: trip?.baseCurrency || 'JPY', isBought: false, images: [], category: 'general', note: '' });

  if (!trip) return null;
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files); e.target.value = ''; setIsUploading(true);
      try { const urls = await Promise.all(files.map(f => uploadImage(f))); setForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] })); } catch (err) { alert("上傳失敗了！"); } finally { setIsUploading(false); }
    }
  };
  const handleSave = () => {
    if (!form.title) return alert("要買什麼呢？寫個標題吧！🛍️");
    const newItem: ShoppingItem = { id: Date.now().toString(), title: form.title!, price: Number(form.price) || 0, currency: form.currency as any, isBought: false, images: form.images || [], category: form.category as any, note: form.note };
    addShoppingItem(trip.id, newItem); setIsAdding(false); setForm({ title: '', price: 0, currency: trip.baseCurrency, isBought: false, images: [], category: 'general' });
  };

  const list = trip.shoppingList || [];

  return (
    <div className="px-4 pb-28 animate-fade-in text-left">
      <div className="flex justify-between items-center mb-6 bg-white border-[3px] border-splat-dark p-3 rounded-2xl shadow-splat-solid">
        <h2 className="text-xl font-black text-splat-dark italic uppercase ml-2">SHOPPING</h2>
        <button onClick={() => setIsAdding(true)} className="w-10 h-10 bg-splat-green text-white rounded-xl border-[3px] border-splat-dark shadow-splat-solid-sm flex items-center justify-center active:translate-y-1 active:shadow-none transition-all"><Plus size={24} strokeWidth={3}/></button>
      </div>

      <div className="space-y-4">
        {list.length === 0 ? (
          <div className="text-center py-20 bg-white border-[3px] border-dashed border-gray-400 rounded-[32px] text-gray-500 font-black italic shadow-sm">列下想買的東西，別漏掉囉！🎒</div>
        ) : (
          list.map(item => (
            <div key={item.id} className={`bg-white border-[3px] border-splat-dark rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 relative group overflow-hidden ${item.isBought ? 'bg-gray-100/80 opacity-75 scale-[0.98] shadow-none translate-y-1' : 'shadow-[4px_4px_0px_#1A1A1A] hover:-translate-y-1'}`}>
              
              {/* 超有手感的粗體 Checkbox */}
              <button onClick={() => toggleShoppingItem(trip.id, item.id)} className="shrink-0 transition-transform active:scale-75 relative z-10">
                {item.isBought ? (
                  <div className="w-8 h-8 bg-splat-green border-[3px] border-splat-dark rounded-lg flex items-center justify-center -rotate-6 shadow-sm">
                    {/* 使用原本引入的 CheckSquare 縮小當作打勾圖示 */}
                    <CheckSquare size={20} strokeWidth={4} className="text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-white border-[3px] border-gray-300 rounded-lg shadow-inner"></div>
                )}
              </button>

              <div className="flex-1 min-w-0 cursor-pointer relative z-10" onClick={() => toggleShoppingItem(trip.id, item.id)}>
                <div className="flex items-center gap-2 mb-1.5">
                   <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border-2 border-splat-dark shadow-sm ${CATEGORIES[item.category].color}`}>
                     {CATEGORIES[item.category].label}
                   </span>
                </div>
                {/* 加上超粗刪除線動畫 */}
                <h3 className={`font-black text-splat-dark text-lg truncate uppercase transition-all duration-300 ${item.isBought ? 'text-gray-400 line-through decoration-[3px] decoration-splat-green' : ''}`}>
                  {item.title}
                </h3>
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                  <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded border border-gray-300 shadow-sm">{item.currency}</span> 
                  <span className={item.isBought ? 'line-through decoration-gray-400 opacity-60' : ''}>{item.price ? item.price.toLocaleString() : '尚未標價'}</span>
                </p>
              </div>
              
              {item.images.length > 0 && (
                <div className={`w-16 h-16 rounded-xl overflow-hidden border-[3px] border-splat-dark shadow-sm relative z-10 transition-all duration-300 ${item.isBought ? 'grayscale opacity-50' : ''}`}>
                  <img src={item.images[0]} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="item" />
                </div>
              )}
              
              <button onClick={(e) => { e.stopPropagation(); deleteShoppingItem(trip.id, item.id); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white border-[3px] border-red-500 text-red-500 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm active:scale-90 z-20">
                <Trash2 size={16} strokeWidth={3}/>
              </button>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#F4F5F7] w-full max-w-md rounded-[32px] border-[4px] border-splat-dark shadow-[8px_8px_0px_#21CC65] overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b-[4px] border-splat-dark bg-white">
              <h2 className="text-xl font-black text-splat-dark italic uppercase bg-splat-green text-white px-3 py-1 rounded-lg border-2 border-splat-dark -rotate-2">📝 加入清單</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-white border-2 border-splat-dark rounded-full shadow-sm"><X size={20} strokeWidth={3}/></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <input placeholder="想買什麼？" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-xl font-black text-splat-dark outline-none focus:ring-2 focus:ring-splat-green" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">預計價格</label>
                  <input type="number" placeholder="0" value={form.price || ''} onChange={e => setForm({...form, price: Number(e.target.value)})} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-xl font-black text-splat-dark outline-none focus:ring-2 focus:ring-splat-green" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">分類</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value as any})} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-xl font-black text-splat-dark outline-none appearance-none focus:ring-2 focus:ring-splat-green">
                    {Object.entries(CATEGORIES).map(([id, cfg]) => <option key={id} value={id}>{cfg.label}</option>)}
                  </select></div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">參考照片 (選填)</label>
                  <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
                    <label className={`min-w-[80px] h-[80px] border-[3px] border-dashed border-splat-dark bg-white rounded-xl flex flex-col items-center justify-center text-splat-dark cursor-pointer active:scale-95 transition-all relative overflow-hidden ${isUploading ? 'pointer-events-none' : ''}`}>
                      {isUploading && <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50"><Loader2 className="animate-spin text-splat-green" size={24} strokeWidth={3}/></div>}
                      <Camera size={24} strokeWidth={2.5}/>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                    {form.images?.map((img, i) => (
                      <div key={i} className="min-w-[80px] h-[80px] rounded-xl overflow-hidden relative border-[3px] border-splat-dark shadow-sm">
                        <img src={img} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="preview" />
                        <button onClick={() => setForm({...form, images: form.images?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-white border-2 border-splat-dark text-splat-dark rounded-md p-1"><X size={10} strokeWidth={3}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                <textarea placeholder="寫點筆記（例如：要在哪間店買？）" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-xl font-bold text-splat-dark outline-none h-24 resize-none focus:ring-2 focus:ring-splat-green" />
              </div>
              <button onClick={handleSave} className="btn-splat w-full py-4 text-xl bg-splat-green text-white">加入清單 ➔</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




