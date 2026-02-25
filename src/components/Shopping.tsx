// filepath: src/components/Shopping.tsx
import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
  Check, Plus, X, Camera, Trash2, Loader2,
  ShoppingBag, Tag, Sparkles, CheckCircle2
} from 'lucide-react';
import { uploadImage } from '../utils/imageUtils';
import { ShoppingItem } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeableItem } from './Common';

const CATEGORIES = {
  'must-buy': { label: '🔥 必買', color: 'bg-splat-pink', splat: '#F03C69' },
  'beauty': { label: '💄 藥妝', color: 'bg-[#FF69B4]', splat: '#FF69B4' },
  'luxury': { label: '💎 精品', color: 'bg-[#9370DB]', splat: '#9370DB' },
  'souvenir': { label: '🎁 伴手禮', color: 'bg-splat-orange', splat: '#FF6C00' },
  'general': { label: '📦 其他', color: 'bg-splat-green', splat: '#21CC65' }
};

export const Shopping = () => {
  const { trips, currentTripId, addShoppingItem, updateShoppingItem, toggleShoppingItem, deleteShoppingItem, exchangeRate, showToast } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);

  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<Partial<ShoppingItem>>({
    title: '', price: 0, targetPrice: 0, currency: trip?.baseCurrency || 'JPY',
    isBought: false, images: [], category: 'general', note: '', location: '', storeName: ''
  });

  if (!trip) return null;

  const list = trip.shoppingList || [];
  // 將清單排序：未買的在前，已買的在後
  const sortedList = [...list].sort((a, b) => Number(a.isBought) - Number(b.isBought));
  const boughtCount = list.filter(i => i.isBought).length;
  const progress = list.length > 0 ? (boughtCount / list.length) * 100 : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setIsUploading(true);
      try {
        const urls = await Promise.all(files.map(f => uploadImage(f)));
        setForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
      } catch (err) {
        showToast("圖片噴漆失敗！🎨", "error");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (!form.title) {
      showToast("要買什麼呢？別空手而回唷！🎒", "info");
      return;
    }
    if (editingItemId) {
      updateShoppingItem(trip.id, editingItemId, form);
    } else {
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        title: form.title!,
        price: Number(form.price) || 0,
        targetPrice: Number(form.targetPrice) || 0,
        currency: form.currency as any,
        isBought: false,
        images: form.images || [],
        category: form.category as any,
        note: form.note || '',
        location: form.location || '',
        storeName: form.storeName || ''
      };
      addShoppingItem(trip.id, newItem);
    }

    setIsAdding(false);
    setEditingItemId(null);
    setForm({ title: '', price: 0, targetPrice: 0, currency: trip.baseCurrency, isBought: false, images: [], category: 'general', note: '', location: '', storeName: '' });
  };

  const openEditor = (item?: ShoppingItem) => {
    if (item) {
      setForm({ ...item });
      setEditingItemId(item.id);
    } else {
      setForm({ title: '', price: 0, targetPrice: 0, currency: trip.baseCurrency, isBought: false, images: [], category: 'general', note: '', location: '', storeName: '' });
      setEditingItemId(null);
    }
    setIsAdding(true);
  };

  const handleAiPriceCheck = async (item: ShoppingItem) => {
    // 這裡的功能已遷移至全域 AiAssistant.tsx
    useTripStore.getState().openAiAssistant('shopping');
  };

  return (
    <div className="px-4 pb-28 animate-fade-in text-left">
      {/* 1. 購物進度 Dashboard */}
      <div className="bg-splat-dark text-white p-6 rounded-[32px] mb-8 border-[3px] border-splat-dark shadow-splat-solid relative overflow-hidden">
        <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12">
          <ShoppingBag size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-splat-yellow mb-2">Shopping Progress</p>
          <div className="flex items-end gap-2 mb-4">
            <h2 className="text-4xl font-black italic tracking-tighter">{boughtCount} / {list.length}</h2>
            <span className="text-xs font-bold text-gray-400 mb-1.5 uppercase">Items Collected</span>
          </div>
          {/* 進度條 */}
          <div className="h-4 bg-white/10 rounded-full border-2 border-white/20 p-0.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-splat-green rounded-full shadow-[0_0_10px_#21CC65]"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-splat-dark italic uppercase flex items-center gap-2">
          <Tag size={20} strokeWidth={3} className="text-splat-blue" /> Wish List
        </h3>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => openEditor()}
          className="btn-splat bg-splat-green text-white px-4 py-2 flex items-center gap-2 text-sm"
        >
          <Plus size={18} strokeWidth={4} /> 新增
        </motion.button>
      </div>

      {/* 2. 願望清單列表 (動態排序) */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {sortedList.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white border-[3px] border-dashed border-gray-300 rounded-[40px] text-gray-400 font-black italic">
              空空如也，看來錢包很安全 🛡️
            </motion.div>
          ) : (
            sortedList.map(item => (
              <ShoppingRow
                key={item.id}
                item={item}
                onToggle={() => {
                  toggleShoppingItem(trip.id, item.id);
                  if (!item.isBought && navigator.vibrate) navigator.vibrate(20);
                }}
                onClick={() => openEditor(item)}
                onPriceCheck={() => handleAiPriceCheck(item)}
                onDelete={() => {
                  deleteShoppingItem(trip.id, item.id);
                }}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* 3. 新增 Modal (iOS 滑入感) */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-splat-dark/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] border-[4px] border-splat-dark p-8 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingItemId ? 'Edit Item' : 'Add to list'}</h2>
                <div className="flex items-center gap-2">
                  {editingItemId && (
                    <button onClick={() => { deleteShoppingItem(trip.id, editingItemId); setIsAdding(false); setEditingItemId(null); }} className="p-2 text-red-500 bg-red-50 rounded-full border-2 border-red-200"><Trash2 size={20} strokeWidth={3} /></button>
                  )}
                  <button onClick={() => setIsAdding(false)} className="p-2 bg-gray-100 rounded-full border-2 border-splat-dark"><X size={20} strokeWidth={3} /></button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">What to buy?</label>
                  <input placeholder="清單名稱 (例：Switch Pro 控制器)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full p-4 bg-gray-50 border-[3px] border-splat-dark rounded-2xl font-black outline-none focus:bg-white" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Market Price</label>
                    <input type="number" placeholder="0" value={form.price || ''} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="w-full p-4 bg-gray-50 border-[3px] border-splat-dark rounded-2xl font-black outline-none focus:bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-splat-pink uppercase tracking-widest ml-1">{form.targetPrice ? 'Target Price 🎯' : 'Target Price (Optional)'}</label>
                    <input type="number" placeholder="0" value={form.targetPrice || ''} onChange={e => setForm({ ...form, targetPrice: Number(e.target.value) })} className="w-full p-4 bg-splat-pink/5 border-[3px] border-splat-pink rounded-2xl font-black outline-none focus:bg-white text-splat-pink placeholder:text-splat-pink/30" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Store Name (店家)</label>
                    <input placeholder="例如：Bic Camera" value={form.storeName || ''} onChange={e => setForm({ ...form, storeName: e.target.value })} className="w-full p-4 bg-gray-50 border-[3px] border-splat-dark rounded-2xl font-black outline-none focus:bg-white text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location (地區)</label>
                    <input placeholder="例如：心齋橋" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full p-4 bg-gray-50 border-[3px] border-splat-dark rounded-2xl font-black outline-none focus:bg-white text-sm" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })} className="w-full p-4 bg-gray-50 border-[3px] border-splat-dark rounded-2xl font-black outline-none appearance-none">
                    {Object.entries(CATEGORIES).map(([id, cfg]) => <option key={id} value={id}>{cfg.label}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reference Photo</label>
                  <div className="flex gap-2 py-1">
                    <label className="w-16 h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 transition-colors">
                      {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={20} strokeWidth={3} />}
                      <input type="file" className="hidden" onChange={handleFileChange} />
                    </label>
                    {form.images?.map((img, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl border-2 border-splat-dark overflow-hidden shadow-sm relative">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => setForm({ ...form, images: [] })} className="absolute top-0 right-0 bg-white p-0.5 border-b-2 border-l-2 border-splat-dark"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleSave} className="btn-splat w-full py-5 bg-splat-blue text-white text-xl">
                  確認加入 ➔
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- 清單項目組件 (核心刷子特效) ---
const ShoppingRow = ({ item, onToggle, onClick, onPriceCheck, onDelete }: { item: ShoppingItem, onToggle: () => void, onClick: () => void, onPriceCheck: () => void, onDelete: () => void }) => {
  const { exchangeRate } = useTripStore();
  const cat = CATEGORIES[item.category as keyof typeof CATEGORIES] || CATEGORIES.general;
  const isGoodDeal = item.aiPriceInfo?.dealRating === 'good' || item.aiPriceInfo?.lowPriceAlert;

  return (
    <SwipeableItem
      id={item.id}
      onDelete={onDelete}
      className="rounded-3xl"
    >
      <div
        className={`relative z-10 bg-white border-[3px] border-splat-dark rounded-3xl p-4 flex items-center gap-4 transition-all ${item.isBought ? 'bg-gray-100' : 'shadow-splat-solid-sm'
          } ${isGoodDeal ? 'bg-splat-pink/5 border-splat-pink ring-4 ring-splat-pink/30 animate-pulse-subtle' : ''
          }`}
        onClick={onClick}
      >
        {/* 1. 勾選按鈕 (iOS 震盪感) */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-10 h-10 rounded-full border-[3px] border-splat-dark flex items-center justify-center transition-colors relative z-10 shrink-0 ${item.isBought ? 'bg-splat-green text-white' : 'bg-white shadow-inner'}`}
        >
          {item.isBought && <Check size={24} strokeWidth={4} />}
        </motion.button>

        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border-2 border-splat-dark text-white ${cat.color} shadow-sm`}>
              {cat.label}
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-splat-dark font-mono leading-none flex items-center gap-1">
                {item.currency} {item.price?.toLocaleString()}
                {isGoodDeal && <span className="text-splat-pink text-xs">🔥</span>}
              </span>
              {item.currency === 'JPY' && (
                <span className="text-[8px] font-bold text-gray-400 mt-0.5">
                  ≈ TWD {Math.round(item.price * exchangeRate).toLocaleString()}
                </span>
              )}
            </div>
            {item.targetPrice ? (
              <div className="flex flex-col border-l-2 border-dotted border-gray-200 pl-2">
                <span className="text-[9px] font-black text-splat-pink uppercase tracking-tighter leading-none">
                  🎯 Target
                </span>
                <span className="text-[8px] font-bold text-splat-pink/60">
                  {item.currency} {item.targetPrice.toLocaleString()}
                </span>
              </div>
            ) : null}
          </div>

          <div className="relative inline-block">
            <h4 className={`text-lg font-black tracking-tight uppercase transition-colors duration-300 ${item.isBought ? 'text-gray-400' : 'text-splat-dark'}`}>
              {item.title}
            </h4>

            {/* 📍 核心：墨跡刷過特效 (Ink Brush Stroke) */}
            <AnimatePresence>
              {item.isBought && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '105%' }}
                  exit={{ width: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute top-[55%] left-[-2.5%] h-3 pointer-events-none opacity-80 mix-blend-multiply"
                  style={{
                    backgroundColor: cat.splat,
                    rotate: '-1deg',
                    borderRadius: '4px',
                    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.1)'
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* AI Price Advice Badge */}
          <AnimatePresence>
            {item.aiPriceInfo && !item.isBought && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`mt-2 p-2 rounded-xl border-2 border-dotted flex flex-col gap-1 ${item.aiPriceInfo.lowPriceAlert ? 'bg-splat-pink/5 border-splat-pink' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-gray-400 uppercase">AI Market Report</span>
                    {item.aiPriceInfo.dealRating && (
                      <span className={`text-[8px] font-black px-1.5 rounded-full border border-current ${item.aiPriceInfo.dealRating === 'good' ? 'bg-splat-green/10 text-splat-green' :
                        item.aiPriceInfo.dealRating === 'bad' ? 'bg-splat-pink/10 text-splat-pink' : 'bg-splat-blue/10 text-splat-blue'
                        }`}>
                        {item.aiPriceInfo.dealRating.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {item.aiPriceInfo.lowPriceAlert && (
                    <span className="text-[8px] font-black bg-splat-pink text-white px-1 rounded animate-pulse">GREAT DEAL! 💸</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles size={10} className="text-splat-yellow shrink-0" />
                  <p className="text-[10px] font-bold text-splat-dark leading-tight">{item.aiPriceInfo.advice}</p>
                </div>
                {item.aiPriceInfo.currentMarketPrice > 0 && (
                  <p className="text-[9px] font-black text-splat-blue/60 tabular-nums">EST: JPY {item.aiPriceInfo.currentMarketPrice.toLocaleString()} @ {item.aiPriceInfo.shopName}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!item.isBought && (
          <motion.button
            whileTap={{ scale: 0.9, rotate: 10 }}
            onClick={(e) => { e.stopPropagation(); onPriceCheck(); }}
            className={`w-10 h-10 rounded-xl border-[2.5px] border-splat-dark shadow-splat-solid-sm flex items-center justify-center transition-all bg-splat-yellow relative z-20`}
          >
            <Sparkles size={18} strokeWidth={3} />
          </motion.button>
        )}

        {item.images.length > 0 && item.isBought && (
          <div className={`w-14 h-14 rounded-2xl border-[3px] border-splat-dark overflow-hidden relative transition-all grayscale opacity-30 scale-90`}>
            <img src={item.images[0]} className="w-full h-full object-cover" alt="item" />
          </div>
        )}
      </div>
    </SwipeableItem>
  );
};





