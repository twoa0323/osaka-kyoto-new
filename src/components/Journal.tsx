// filepath: src/components/Journal.tsx
import React, { useState, useMemo, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
  Camera, MapPin, Star, Plus, X, ListOrdered, Calendar as CalendarIcon, Sparkles,
  Trash2, Loader2, Map as MapIcon, UtensilsCrossed, CheckCircle, WifiOff, ExternalLink, Receipt
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { uploadImage } from '../utils/imageUtils';
import { JournalItem, CurrencyCode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { LazyImage } from './LazyImage';
import { SwipeableItem } from './Common';
import { BottomSheet } from './ui/BottomSheet';

const BADGE_COLORS = {
  5: { color: 'text-[#FFC000]', border: 'border-[#FFC000]', bg: 'bg-[#FFC000]/10' },
  4: { color: 'text-splat-green', border: 'border-splat-green', bg: 'bg-splat-green/10' },
  3: { color: 'text-splat-blue', border: 'border-splat-blue', bg: 'bg-splat-blue/10' },
  2: { color: 'text-gray-400', border: 'border-gray-400', bg: 'bg-gray-100' },
  1: { color: 'text-gray-400', border: 'border-gray-400', bg: 'bg-gray-100' },
  0: { color: 'text-gray-400', border: 'border-gray-400', bg: 'bg-gray-100' },
};

export const Journal = () => {
  const { trips, currentTripId, addJournalItem, updateJournalItem, deleteJournalItem, showToast, addExpenseItem, setActiveTab } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const isOnline = useNetworkStatus();

  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date');
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingItem, setViewingItem] = useState<JournalItem | null>(null);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<JournalItem>>({
    title: '', content: '', images: [], rating: 5, location: '',
    date: new Date().toISOString().split('T')[0],
    cost: undefined, currency: trip?.baseCurrency || 'JPY', tags: [], dishes: []
  });

  const sortedJournals = useMemo(() => {
    const list = [...(trip?.journals || [])];
    if (sortBy === 'rating') {
      return list.sort((a, b) => b.rating - a.rating || new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trip?.journals, sortBy]);

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
        showToast("有圖片上傳失敗了！📸", "error");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (!form.title || (form.images?.length === 0)) {
      return showToast("標題跟美食美照至少要有一個唷！🦑", "info");
    }

    if (isEditing && viewingItem) {
      const updatedItem = { ...viewingItem, ...form } as JournalItem;
      const newJournals = (trip.journals || []).map(j => j.id === viewingItem.id ? updatedItem : j);
      useTripStore.getState().updateTripData(trip.id, { journals: newJournals });
      setViewingItem(updatedItem);
      setIsAdding(false);
      setIsEditing(false);
    } else {
      const newItem: JournalItem = {
        id: Date.now().toString(),
        date: form.date || new Date().toISOString().split('T')[0],
        title: form.title!,
        content: form.content || '',
        images: form.images || [],
        rating: form.rating || 5,
        location: form.location || '',
        cost: form.cost ? Number(form.cost) : undefined,
        currency: form.currency as CurrencyCode || trip.baseCurrency,
        tags: form.tags || [],
        dishes: form.dishes || [],
        externalLink: form.externalLink || ''
      };
      addJournalItem(trip.id, newItem);
      // Close adding modal completely, or go straight to detail view
      setIsAdding(false);
    }

    setForm({ title: '', content: '', images: [], rating: 5, location: '', cost: undefined, tags: [], dishes: [] });
    triggerHaptic('success');
  };

  const openEditor = (item?: JournalItem) => {
    if (item) {
      setForm({ ...item, tags: item.tags || [], dishes: item.dishes || [] });
      setIsEditing(true);
      setViewingItem(null); // Close detail view when editing
    } else {
      setForm({
        title: '', content: '', images: [], rating: 5, location: '',
        date: new Date().toISOString().split('T')[0],
        cost: undefined, currency: trip.baseCurrency, tags: [], dishes: []
      });
      setIsEditing(false);
    }
    setIsAdding(true);
  };

  const handleMagicRefine = async () => {
    if (!isOnline) return showToast("連線後才能呼叫 AI 吃貨助手唷！🦑", "info");
    if (!form.title && !form.content) return showToast("稍微寫點餐廳名稱或心得再讓我潤飾吧！", "info");

    setIsAiLoading(true);
    triggerHaptic('light');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refine-food-review',
          payload: { title: form.title, location: form.location, content: form.content }
        })
      });
      const data = await res.json();
      if (data && data.refinedContent) {
        setForm(prev => ({
          ...prev,
          content: data.refinedContent,
          tags: data.tags || prev.tags
        }));
        showToast("✨ 食記潤飾完成！", "success");
        triggerHaptic('success');
      }
    } catch (e) {
      showToast("美食魔法暫時失效，請晚點再試！", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRecommendDishes = async () => {
    if (!isOnline) return showToast("請先連網喔！", "info");
    if (!form.title) return showToast("請先填寫餐廳名稱！", "info");

    setIsAiLoading(true);
    triggerHaptic('light');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recommend-dishes',
          payload: { title: form.title, location: form.location }
        })
      });
      const data = await res.json();
      if (data && data.dishes) {
        setForm(prev => ({ ...prev, dishes: data.dishes }));
        showToast("✨ 已為您抓取推薦菜單！", "success");
        triggerHaptic('success');
      }
    } catch (e) {
      showToast("菜單魔法暫時失效", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleTransferToExpense = () => {
    if (!viewingItem) return;
    if (!viewingItem.cost) {
      return showToast("尚未設定花費金額，無法轉記帳唷！", "info");
    }

    addExpenseItem(trip.id, {
      id: Date.now().toString(),
      date: viewingItem.date,
      storeName: viewingItem.title,
      title: '美食開銷',
      amount: viewingItem.cost,
      currency: viewingItem.currency || trip.baseCurrency,
      method: '現金',
      location: viewingItem.location || '',
      category: '餐飲',
      payerId: trip.members?.[0]?.id || 'unknown',
      splitWith: trip.members?.map(m => ({ memberId: m.id, weight: 1 })) || [],
      images: viewingItem.images?.length > 0 ? [viewingItem.images[0]] : []
    });

    setViewingItem(null);
    showToast("💸 已成功轉存為記帳項目！", "success");
    triggerHaptic('success');
    setActiveTab('expense');
  };


  return (
    <div className="px-4 pb-28 animate-fade-in text-left font-sans">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 bg-white border-[3px] border-splat-dark p-4 rounded-3xl shadow-splat-solid relative overflow-hidden">
        {/* Background Splat Graphic */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-splat-orange/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2 bg-splat-orange text-white rounded-xl rotate-[-4deg] border-2 border-splat-dark shadow-sm">
            <UtensilsCrossed size={20} strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-xl font-black text-splat-dark italic uppercase tracking-tighter leading-none">Food Journal</h2>
            <p className="text-[10px] font-black text-gray-400 mt-1">{sortedJournals.length} MEMORIES</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9, rotate: 10 }}
          onClick={() => openEditor()}
          className="w-12 h-12 bg-splat-orange text-white rounded-2xl border-[3px] border-splat-dark shadow-[4px_4px_0px_#1A1A1A] flex items-center justify-center transition-all relative z-10 active:translate-y-1 active:shadow-none"
        >
          <Plus size={28} strokeWidth={4} />
        </motion.button>
      </div>

      {/* Control Bar: Sort Toggles */}
      <div className="flex gap-2 mb-6 px-1">
        <button
          onClick={() => setSortBy('date')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2 ${sortBy === 'date' ? 'bg-splat-dark text-white border-splat-dark' : 'bg-white text-gray-400 border-gray-200'}`}
        >
          <CalendarIcon size={14} /> 按日期
        </button>
        <button
          onClick={() => setSortBy('rating')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2 ${sortBy === 'rating' ? 'bg-splat-dark text-white border-splat-dark' : 'bg-white text-gray-400 border-gray-200'}`}
        >
          <Star size={14} /> 按評分
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 relative">
        <AnimatePresence mode="popLayout">
          {sortedJournals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="col-span-2 text-center py-20 bg-white border-[3px] border-dashed border-gray-300 rounded-[32px] text-gray-400 font-black italic shadow-inner"
            >
              拍照留念你的美食地圖吧！🍜
            </motion.div>
          ) : (
            sortedJournals.map((item, idx) => {
              const rotation = (idx % 2 === 0 ? -1.5 : 2) + ((idx * 7) % 3 - 1); // 輕微錯落感
              return (
                <motion.div
                  key={item.id}
                  layout
                  layoutId={`card-${item.id}`}
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0, rotate: rotation }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  whileHover={{ rotate: 0, scale: 1.05, zIndex: 10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <SwipeableItem
                    id={item.id}
                    onDelete={() => deleteJournalItem(trip.id, item.id)}
                    className="rounded-[20px] shadow-splat-solid-sm"
                  >
                    <PolaroidCard
                      item={item}
                      onClick={() => setViewingItem(item)}
                      tripId={trip.id}
                      updateJournalItem={updateJournalItem}
                    />
                  </SwipeableItem>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* === 詳情視圖 (Foodie Detail BottomSheet) === */}
      <BottomSheet
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="✨ 美食評論看板"
        className="bg-[#F4F5F7]"
      >
        <AnimatePresence>
          {viewingItem && (
            <div className="space-y-6 pb-6">
              {/* Image Carousel (Slideshow) */}
              <div className="w-full h-64 bg-gray-100 rounded-3xl border-[4px] border-splat-dark overflow-x-auto flex snap-x snap-mandatory hide-scrollbar relative">
                {viewingItem.images?.map((img, i) => (
                  <div key={i} className="min-w-full h-full snap-center relative">
                    <img src={img} className="w-full h-full object-cover" alt={`Food image ${i + 1}`} />
                  </div>
                ))}
                {(!viewingItem.images || viewingItem.images.length === 0) && (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 font-black italic">No Photo</div>
                )}

                {/* 絕對定位價格標籤 (噴漆感) */}
                {viewingItem.cost !== undefined && viewingItem.cost > 0 && (
                  <div className="absolute bottom-3 right-3 bg-splat-dark text-splat-yellow px-3 py-1.5 rounded-xl border-2 border-white rotate-[-3deg] shadow-lg font-black tracking-tight z-10">
                    {viewingItem.currency || '¥'} {viewingItem.cost.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Title & Splatoon Rating Wall */}
              <div className="relative p-4 bg-white rounded-3xl border-[3px] border-splat-dark shadow-splat-solid flex items-center justify-between overflow-hidden">
                <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl opacity-40 pointer-events-none ${BADGE_COLORS[viewingItem.rating as keyof typeof BADGE_COLORS]?.bg || 'bg-gray-100'}`} />
                <div className="flex-1 min-w-0 pr-4 z-10">
                  <div className="text-[10px] font-black text-gray-400 mb-1">{viewingItem.date}</div>
                  <h3 className="font-black text-2xl text-splat-dark tracking-tighter leading-tight">{viewingItem.title}</h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {viewingItem.tags?.slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`shrink-0 w-20 h-20 bg-white border-[4px] border-splat-dark rounded-full shadow-inner flex flex-col items-center justify-center rotate-6 z-10 ${BADGE_COLORS[viewingItem.rating as keyof typeof BADGE_COLORS]?.color || 'text-gray-400'}`}>
                  <span className="text-3xl font-black italic leading-none">{viewingItem.rating}</span>
                  <span className="text-[9px] font-black tracking-widest uppercase">Stars</span>
                </div>
              </div>

              {/* Food Review Content */}
              {viewingItem.content ? (
                <div className="bg-white p-5 rounded-3xl border-2 border-dashed border-gray-300 relative">
                  <Sparkles size={20} className="absolute -top-3 -left-3 text-splat-pink rotate-12" strokeWidth={3} />
                  <p className="font-bold text-gray-700 leading-relaxed text-[15px] whitespace-pre-wrap">{viewingItem.content}</p>
                </div>
              ) : (
                <div className="text-center py-4 italic text-sm text-gray-400 font-bold bg-white rounded-2xl border border-gray-200">
                  純粹享受的一餐，盡在不言中 😋
                </div>
              )}

              {/* Recommend Dishes Section */}
              {viewingItem.dishes && viewingItem.dishes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">✨ Must Try Dishes</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingItem.dishes.map((dish, dIdx) => (
                      <div key={dIdx} className="bg-splat-pink/10 text-splat-pink border border-splat-pink/30 px-3 py-1.5 rounded-lg font-black text-xs shadow-sm">
                        {dish}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* The Action Bar */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href={viewingItem.externalLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingItem.title + ' ' + (viewingItem.location || ''))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-4 bg-splat-blue text-white rounded-2xl border-[3px] border-splat-dark font-black text-center shadow-splat-solid-sm flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all"
                >
                  <MapIcon size={18} strokeWidth={3} /> 帶我去
                </a>
                <button
                  onClick={handleTransferToExpense}
                  className="flex-1 py-4 bg-splat-yellow text-splat-dark rounded-xl border-[3px] border-splat-dark font-black text-center shadow-splat-solid-sm flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all"
                >
                  <Receipt size={18} strokeWidth={3} /> 轉記帳
                </button>
              </div>

              <button
                onClick={() => {
                  setViewingItem(null);
                  openEditor(viewingItem);
                }}
                className="w-full py-4 mt-2 bg-white text-splat-dark rounded-xl border-[3px] border-splat-dark font-black text-center shadow-sm flex items-center justify-center gap-2"
              >
                修改這份回憶 ➔
              </button>

            </div>
          )}
        </AnimatePresence>
      </BottomSheet>


      {/* === 加上新增/編輯 Modal === */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-[#F4F5F7] z-[2100] px-4 py-6 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6 pt-2 sticky top-0 bg-[#F4F5F7]/90 backdrop-blur z-20 pb-4">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-splat-dark">{isEditing ? "Edit Memory" : "New Memory"}</h2>
              <button onClick={() => setIsAdding(false)} className="p-2.5 bg-white rounded-xl border-[3px] border-splat-dark shadow-splat-solid-sm active:scale-95 transition-transform">
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-6 pb-20">
              {/* Photo Area */}
              <div className="flex gap-3 overflow-x-auto py-2 hide-scrollbar">
                <label className="min-w-[100px] aspect-square bg-white border-[3px] border-dashed border-gray-300 rounded-[20px] flex flex-col items-center justify-center text-gray-400 cursor-pointer active:bg-gray-50 transition-colors relative overflow-hidden">
                  {isUploading && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center"><Loader2 className="animate-spin text-splat-orange" /></div>}
                  <Camera size={28} />
                  <span className="text-[9px] font-black mt-2 uppercase tracking-widest">Add Photo</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                {form.images?.map((img, i) => (
                  <div key={i} className="min-w-[100px] aspect-square rounded-[20px] border-[3px] border-splat-dark overflow-hidden relative shadow-md">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setForm({ ...form, images: form.images?.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-white p-1 rounded-md border-2 border-splat-dark shadow-sm"><X size={12} /></button>
                  </div>
                ))}
              </div>

              {/* Title & Location Input Group */}
              <div className="bg-white p-4 rounded-3xl border-[3px] border-splat-dark space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">What did you eat?</label>
                  <input placeholder="餐廳名稱或美食 (如: 一蘭拉麵)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full mt-1 p-3 bg-gray-50 border-2 border-transparent focus:border-splat-orange/50 rounded-xl font-black text-lg outline-none transition-colors" />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input placeholder="地點 (可貼地圖連結)" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full pl-9 pr-3 py-3 bg-gray-50 border-2 border-transparent focus:border-splat-orange/50 rounded-xl font-bold text-sm outline-none transition-colors" />
                </div>
              </div>

              {/* Cost & Rating Group */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-2xl border-[3px] border-splat-dark flex flex-col justify-center relative">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest relative z-10">Total Cost</label>
                  <div className="flex items-center gap-1 mt-1 relative z-10">
                    <span className="text-xs font-black text-gray-400 shrink-0">{form.currency}</span>
                    <input type="number" placeholder="金額..." value={form.cost || ''} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} className="w-full font-black text-xl text-splat-dark outline-none bg-transparent" />
                  </div>
                  <div className="absolute right-2 bottom-0 text-[50px] font-black text-gray-100 italic pointer-events-none select-none z-0">¥</div>
                </div>

                <div className="bg-white p-3 rounded-2xl border-[3px] border-splat-dark flex flex-col justify-center">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rating</label>
                  <div className="flex gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map(v => (
                      <Star key={v} onClick={() => setForm({ ...form, rating: v })} className={`cursor-pointer transition-all ${v <= (form.rating || 0) ? 'text-splat-yellow fill-splat-yellow scale-110' : 'text-gray-200'}`} size={20} strokeWidth={2.5} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional: Tags Input (Comma separated for fast UI) */}
              <div className="bg-white p-3 rounded-2xl border-[3px] border-splat-dark relative">
                <input
                  placeholder="加入標籤 (逗號分隔，如：必吃, 排隊名店)"
                  value={form.tags?.join(', ') || ''}
                  onChange={e => setForm({ ...form, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  className="w-full bg-transparent font-bold text-sm outline-none text-splat-blue"
                />
              </div>

              {/* AI Helper Text Area */}
              <div className="bg-white rounded-3xl border-[3px] border-splat-dark overflow-hidden relative">
                <textarea
                  placeholder="寫點隨手心得，或是點擊閃光按鈕讓 AI 幫你寫出大師級食記..."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full p-4 font-bold text-[15px] outline-none h-32 resize-none bg-transparent text-gray-700 placeholder:text-gray-300 relative z-10"
                />
                <div className="bg-gray-50 border-t-2 border-dashed border-gray-200 p-2 flex gap-2 overflow-x-auto hide-scrollbar">
                  <button onClick={handleMagicRefine} disabled={isAiLoading} className="shrink-0 bg-splat-dark text-white text-[10px] font-black py-1.5 px-3 rounded-lg flex items-center gap-1 active:scale-95 transition-transform">
                    {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-splat-yellow" />}
                    AI 精修食記
                  </button>
                  <button onClick={handleRecommendDishes} disabled={isAiLoading} className="shrink-0 bg-splat-pink/10 text-splat-pink border border-splat-pink/30 text-[10px] font-black py-1.5 px-3 rounded-lg flex items-center gap-1 active:scale-95 transition-transform">
                    {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <UtensilsCrossed size={12} />}
                    AI 推薦菜單
                  </button>
                </div>
              </div>

              <button onClick={handleSave} className="w-full py-4 mt-2 bg-splat-orange text-white text-lg font-black rounded-2xl border-[3px] border-splat-dark shadow-splat-solid flex justify-center items-center gap-2 active:translate-y-1 active:shadow-none transition-all">
                {isEditing ? "儲存修改 ✔" : "收藏這份美味 ➔"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- 拍立得卡片子組件 (Scrapbook Style) ---
const PolaroidCard = ({ item, onClick, tripId, updateJournalItem }: { item: JournalItem, onClick: () => void, tripId: string, updateJournalItem: any }) => {
  React.useEffect(() => {
    if (!item.images || item.images.length === 0) {
      const fetchImage = async () => {
        try {
          const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get-image-for-item', payload: { title: item.title, location: item.location, category: 'food' } })
          });
          const data = await res.json();
          if (data.imageUrl) updateJournalItem(tripId, item.id, { ...item, images: [data.imageUrl] });
        } catch (err) { console.error("Failed to fetch image", item.title); }
      };
      const timeoutId = setTimeout(fetchImage, 500 + Math.random() * 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [item.id, item.images, item.title, item.location, tripId, updateJournalItem]);

  const badgeConfig = BADGE_COLORS[item.rating as keyof typeof BADGE_COLORS] || BADGE_COLORS[0];
  const highlightTag = item.tags && item.tags.length > 0 ? item.tags[0] : null;

  return (
    <div
      onClick={onClick}
      className={`bg-white p-2.5 pb-4 border-[3px] ${badgeConfig.border} cursor-pointer relative select-none flex flex-col h-full`}
    >
      <div className="aspect-square bg-gray-50 border-[3px] border-splat-dark mb-2.5 overflow-hidden relative pointer-events-none rounded-sm">
        <LazyImage src={item.images?.[0] || ""} containerClassName="w-full h-full" alt="food" />
        {item.images && item.images.length > 1 && (
          <div className="absolute top-1.5 right-1.5 bg-splat-dark text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm font-black">
            +{item.images.length - 1}
          </div>
        )}

        {/* Rating Stamp in Image Corner */}
        <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full bg-white border-2 ${badgeConfig.border} flex items-center justify-center rotate-6 shadow-sm`}>
          <span className={`text-[11px] font-black ${badgeConfig.color}`}>{item.rating}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between pointer-events-none mt-1">
        <h4 className="font-black text-[13px] text-splat-dark line-clamp-2 leading-tight">{item.title}</h4>

        <div className="flex justify-between items-end mt-2">
          <div className="text-[10px] font-black text-gray-400">
            {item.cost && item.cost > 0 ? `${item.currency || '¥'} ${item.cost}` : '-'}
          </div>
          {highlightTag && (
            <div className="text-[8px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-sm truncate max-w-[60px]">
              {highlightTag}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};




