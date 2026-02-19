// filepath: src/components/Shopping.tsx
import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { CheckCircle2, Circle, Plus, X, Camera, Trash2, Edit3, Loader2 } from 'lucide-react';
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
  const { trips, currentTripId, addShoppingItem, updateShoppingItem, toggleShoppingItem, deleteShoppingItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | undefined>();
  const [detailItem, setDetailItem] = useState<ShoppingItem | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  
  const [form, setForm] = useState<Partial<ShoppingItem>>({
    title: '', price: 0, currency: trip?.baseCurrency || 'JPY', isBought: false, images: [], category: 'general', note: ''
  });

  if (!trip) return null;

  const handleOpenAdd = () => {
    setEditingItem(undefined);
    setForm({ title: '', price: 0, currency: trip.baseCurrency, isBought: false, images: [], category: 'general', note: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ShoppingItem) => {
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
      } catch (err) { alert("上傳失敗了！"); } 
      finally { setIsUploading(false); }
    }
  };

  const handleSave = () => {
    if (!form.title) return alert("要買什麼呢？寫個標題吧！🛍️");
    if (editingItem) {
      updateShoppingItem(trip.id, editingItem.id, { ...form, id: editingItem.id });
    } else {
      addShoppingItem(trip.id, { ...form, id: Date.now().toString() } as ShoppingItem);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (editingItem && confirm('確定放棄買這個嗎？')) {
      deleteShoppingItem(trip.id, editingItem.id);
      setIsModalOpen(false);
    }
  };

  const list = trip.shoppingList || [];

  return (
    <div className="px-6 pb-24 animate-fade-in text-left">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-black text-ac-brown italic">購物清單</h2>
        <button onClick={handleOpenAdd} className="w-12 h-12 bg-ac-green text-white rounded-full shadow-zakka flex items-center justify-center active:scale-90 transition-transform"><Plus size={28} /></button>
      </div>

      <div className="space-y-4">
        {list.length === 0 ? (
          <div className="text-center py-20 text-ac-border font-black italic">列下想買的東西，別漏掉囉！🎒</div>
        ) : (
          list.map(item => (
            <div key={item.id} className={`card-zakka bg-white flex items-center gap-4 transition-all ${item.isBought ? 'opacity-50 grayscale' : ''}`}>
              <button onClick={() => toggleShoppingItem(trip.id, item.id)} className="shrink-0 transition-transform active:scale-90">
                {item.isBought ? <CheckCircle2 className="text-ac-green" size={28} /> : <Circle className="text-ac-border" size={28} />}
              </button>
              
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailItem(item)}>
                <div className="flex items-center gap-2 mb-1">
                   <span className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white ${CATEGORIES[item.category as keyof typeof CATEGORIES].color}`}>{CATEGORIES[item.category as keyof typeof CATEGORIES].label}</span>
                   <h3 className={`font-black text-ac-brown truncate ${item.isBought ? 'line-through' : ''}`}>{item.title}</h3>
                </div>
                <p className="text-[10px] font-bold text-ac-brown/40 uppercase italic">{item.price ? `${item.currency} ${item.price.toLocaleString()}` : '尚未標價'}</p>
              </div>

              {item.images?.length > 0 && <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-ac-border shrink-0"><img src={item.images[0]} className="w-full h-full object-cover" alt="item" /></div>}
              
              <button onClick={() => handleOpenEdit(item)} className="text-ac-border hover:text-ac-orange transition-colors p-2 bg-ac-bg rounded-xl shrink-0"><Edit3 size={16} /></button>
            </div>
          ))
        )}
      </div>

      {/* 詳情 Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[600] p-6 flex items-center justify-center" onClick={() => setDetailItem(undefined)}>
           <div className="bg-ac-bg w-full max-w-sm rounded-[45px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              {detailItem.images?.[0] && (
                <div className="h-64 bg-gray-200 relative overflow-hidden">
                   <img src={detailItem.images[0]} className="w-full h-full object-cover" alt="item" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                   <button onClick={() => setDetailItem(undefined)} className="absolute top-6 right-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white"><X size={20}/></button>
                </div>
              )}
              <div className="p-8 space-y-6">
                 {!detailItem.images?.[0] && (
                   <div className="flex justify-between items-start mb-2">
                      <h2 className="text-2xl font-black text-ac-brown italic tracking-wide">{detailItem.title}</h2>
                      <button onClick={() => setDetailItem(undefined)} className="p-2 bg-white shadow-sm rounded-full text-ac-border"><X size={20}/></button>
                   </div>
                 )}
                 {detailItem.images?.[0] && <h2 className="text-2xl font-black text-ac-brown italic tracking-wide">{detailItem.title}</h2>}
                 
                 <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-ac-border">
                   <span className={`text-[10px] font-black px-3 py-1 rounded text-white ${CATEGORIES[detailItem.category as keyof typeof CATEGORIES].color}`}>{CATEGORIES[detailItem.category as keyof typeof CATEGORIES].label}</span>
                   <span className="text-lg font-black text-ac-brown">{detailItem.price ? `${detailItem.currency} ${detailItem.price.toLocaleString()}` : '尚未標價'}</span>
                 </div>
                 
                 <div className="bg-white p-5 rounded-3xl shadow-sm border border-ac-border min-h-[80px]">
                   <p className="text-xs font-black text-ac-border mb-2 uppercase tracking-widest">購買筆記</p>
                   <p className="text-sm font-bold text-ac-brown/80 whitespace-pre-wrap leading-relaxed">{detailItem.note || "沒寫什麼筆記..."}</p>
                 </div>
                 
                 <button onClick={() => { setDetailItem(undefined); handleOpenEdit(detailItem); }} className="btn-zakka w-full py-4 text-lg">編輯項目</button>
              </div>
           </div>
        </div>
      )}

      {/* 新增/編輯 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[700] flex items-end sm:items-center justify-center p-4">
          <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b-4 border-ac-border sticky top-0 bg-ac-bg z-10">
              <h2 className="text-xl font-black text-ac-brown italic">{editingItem ? '✍️ 編輯清單' : '📝 加入清單'}</h2>
              <div className="flex gap-2">
                {editingItem && <button onClick={handleDelete} className="p-2 bg-red-50 text-red-500 rounded-full active:scale-90"><Trash2 size={20}/></button>}
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full shadow-zakka text-ac-border"><X size={20}/></button>
              </div>
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
                    <label className={`min-w-[80px] h-[80px] border-4 border-dashed border-ac-border rounded-2xl flex flex-col items-center justify-center text-ac-border cursor-pointer hover:bg-white transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {isUploading ? <Loader2 className="animate-spin" size={20}/> : <Camera size={20}/>}
                      <span className="text-[10px] font-black mt-1">{isUploading ? '上傳中' : '拍照上傳'}</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                    {form.images?.map((img, i) => (
                      <div key={i} className="min-w-[80px] h-[80px] rounded-2xl overflow-hidden relative border-2 border-white shadow-sm">
                        <img src={img} className="w-full h-full object-cover" alt="preview" />
                        <button onClick={() => setForm({...form, images: form.images?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={10}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                <textarea placeholder="寫點筆記（例如：要在哪間店買？）" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none h-24 resize-none" />
              </div>
              <button onClick={handleSave} className="btn-zakka w-full py-4 text-lg">{editingItem ? '儲存修改 ➔' : '加入清單 ➔'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

