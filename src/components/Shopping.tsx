import { useState, useMemo, ChangeEvent, ReactNode } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
  Check, Plus, X, Camera, Trash2, Loader2,
  ShoppingBag, Tag, Sparkles, User, MapPin, Receipt, Navigation, Image as ImageIcon
} from 'lucide-react';
import { uploadImage } from '../utils/imageUtils';
import { ShoppingItem } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeableItem } from './Common';
import { BottomSheet } from './ui/BottomSheet';
import { LazyImage } from './LazyImage';

const CATEGORIES = {
  'must-buy': { label: '🔥 必買', color: 'bg-splat-pink', splat: '#F03C69' },
  'beauty': { label: '💄 藥妝', color: 'bg-[#FF69B4]', splat: '#FF69B4' },
  'luxury': { label: '💎 精品', color: 'bg-[#9370DB]', splat: '#9370DB' },
  'souvenir': { label: '🎁 伴手禮', color: 'bg-splat-orange', splat: '#FF6C00' },
  'general': { label: '📦 其他', color: 'bg-splat-green', splat: '#21CC65' }
};

const PRIORITIES = {
  'high': { label: '🔥 必買', borderColor: 'border-splat-pink', ringColor: 'ring-splat-pink', glow: 'shadow-[0_0_15px_rgba(240,60,105,0.3)]' },
  'medium': { label: '⚡ 順便', borderColor: 'border-splat-yellow', ringColor: 'ring-splat-yellow', glow: '' },
  'low': { label: '☁️ 有緣再說', borderColor: 'border-gray-300', ringColor: 'ring-gray-300', glow: '' },
};

export const Shopping = () => {
  const { trips, currentTripId, addShoppingItem, updateShoppingItem, toggleShoppingItem, deleteShoppingItem, exchangeRate, showToast } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);

  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingItem, setViewingItem] = useState<ShoppingItem | null>(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [filterStore, setFilterStore] = useState<string>('All');
  const [filterForWhom, setFilterForWhom] = useState<string>('All');

  const [form, setForm] = useState<Partial<ShoppingItem>>({
    title: '', price: 0, quantity: 1, targetPrice: 0, currency: trip?.baseCurrency || 'JPY',
    isBought: false, images: [], category: 'general', note: '', location: '', storeName: '',
    forWhom: '', isTaxFreeEligible: true, priority: 'medium'
  });

  const list = trip?.shoppingList || [];

  // Dashboard Calculations
  const stores = useMemo(() => Array.from(new Set(list.map(i => i.storeName).filter(Boolean))), [list]);
  const buyers = useMemo(() => Array.from(new Set(list.map(i => i.forWhom).filter(Boolean))), [list]);

  const taxFreeProgress = useMemo(() => {
    // 找出尚未購買且符合免稅的最高店家累積金額
    const storeTotals: Record<string, number> = {};
    list.forEach(i => {
      if (!i.isBought && i.isTaxFreeEligible && i.storeName && i.currency === 'JPY') {
        storeTotals[i.storeName] = (storeTotals[i.storeName] || 0) + (i.price * (i.quantity || 1));
      }
    });
    // 找出最高的一家店
    let maxStore = '';
    let maxTotal = 0;
    for (const [store, total] of Object.entries(storeTotals)) {
      if (total > maxTotal) { maxTotal = total; maxStore = store; }
    }
    const TAX_FREE_LIMIT = 5500; // 含稅 5500 JPY
    const percent = Math.min((maxTotal / TAX_FREE_LIMIT) * 100, 100);
    return { store: maxStore, amount: maxTotal, percent, limit: TAX_FREE_LIMIT };
  }, [list]);

  const budgetStats = useMemo(() => {
    let expected = 0;
    let bought = 0;
    list.forEach(i => {
      const total = i.price * (i.quantity || 1);
      expected += total;
      if (i.isBought) bought += total;
    });
    return { expected, bought, percent: expected ? Math.min((bought / expected) * 100, 100) : 0 };
  }, [list]);

  const sortedList = useMemo(() => {
    return list.filter(i => {
      if (filterStore !== 'All' && i.storeName !== filterStore) return false;
      if (filterForWhom !== 'All' && i.forWhom !== filterForWhom) return false;
      return true;
    }).sort((a, b) => {
      // 優先顯示未購買，並以 high > medium > low 排序
      if (a.isBought !== b.isBought) return Number(a.isBought) - Number(b.isBought);
      const pMap = { high: 3, medium: 2, low: 1 };
      const pA = pMap[a.priority || 'medium'];
      const pB = pMap[b.priority || 'medium'];
      return pB - pA;
    });
  }, [list, filterStore, filterForWhom]);

  if (!trip) return null;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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
      if (viewingItem && viewingItem.id === editingItemId) {
        setViewingItem({ ...viewingItem, ...form } as ShoppingItem);
      }
    } else {
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        title: form.title!,
        price: Number(form.price) || 0,
        quantity: Number(form.quantity) || 1,
        targetPrice: Number(form.targetPrice) || 0,
        currency: form.currency as any,
        isBought: false,
        images: form.images || [],
        category: form.category as any,
        note: form.note || '',
        location: form.location || '',
        storeName: form.storeName || '',
        forWhom: form.forWhom || '',
        isTaxFreeEligible: form.isTaxFreeEligible !== undefined ? form.isTaxFreeEligible : true,
        priority: form.priority as any || 'medium'
      };
      addShoppingItem(trip.id, newItem);
    }

    setIsAdding(false);
    setEditingItemId(null);
  };

  const openEditor = (item?: ShoppingItem) => {
    if (item) {
      setForm({ ...item, quantity: item.quantity || 1, isTaxFreeEligible: item.isTaxFreeEligible !== false, priority: item.priority || 'medium' });
      setEditingItemId(item.id);
    } else {
      setForm({ title: '', price: 0, quantity: 1, targetPrice: 0, currency: trip.baseCurrency, isBought: false, images: [], category: 'general', note: '', location: '', storeName: filterStore !== 'All' ? filterStore : '', forWhom: filterForWhom !== 'All' ? filterForWhom : '', isTaxFreeEligible: true, priority: 'medium' });
      setEditingItemId(null);
    }
    setIsAdding(true);
  };

  const handleCheck = (item: ShoppingItem) => {
    toggleShoppingItem(trip.id, item.id);
    if (!item.isBought) {
      triggerHaptic('success');
      showToast(`🛒 已將 ${item.title} 掃入購物車！`, "success");
    }
  };

  const handleAiPriceCheck = async (item: ShoppingItem) => {
    // Ensure item has title
    if (!item.title) return;
    setIsAiLoading(true);
    triggerHaptic('light');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'research-product-price',
          payload: { title: item.title, category: item.category, currency: item.currency, targetPrice: item.targetPrice }
        })
      });
      const data = await res.json();
      if (data && data.advice) {
        updateShoppingItem(trip.id, item.id, {
          aiPriceInfo: {
            advice: data.advice,
            dealRating: data.dealRating,
            currentMarketPrice: data.currentMarketPrice,
            lastChecked: Date.now()
          }
        });
        setViewingItem((prev: ShoppingItem | null) => prev ? { ...prev, aiPriceInfo: { advice: data.advice, dealRating: data.dealRating, currentMarketPrice: data.currentMarketPrice, lastChecked: Date.now() } } : null);
        showToast("✨ AI 已評估此商品划算度！", "success");
      }
    } catch (e) {
      showToast("情報局打盹中，請稍後再試！", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="px-4 pb-28 animate-fade-in text-left font-sans">
      {/* 1. 購物戰報 Dashboard */}
      <div className="bg-splat-dark text-white p-5 rounded-3xl mb-6 border-[3px] border-splat-dark shadow-splat-solid relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-5 rotate-12 pointer-events-none">
          <ShoppingBag size={180} />
        </div>

        <div className="flex items-center gap-2 mb-4 relative z-10">
          <Receipt size={16} className="text-splat-pink" />
          <span className="text-xs font-black uppercase tracking-widest text-splat-yellow">Shopping Intel Dashboard</span>
        </div>

        {/* 預算消耗比例 */}
        <div className="mb-5 relative z-10">
          <div className="flex justify-between items-end mb-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Consumed</div>
            <div className="font-mono font-black text-sm">
              {budgetStats.bought.toLocaleString()} / <span className="text-gray-400">{budgetStats.expected.toLocaleString()} {trip.baseCurrency}</span>
            </div>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/20">
            <motion.div initial={{ width: 0 }} animate={{ width: `${budgetStats.percent}%` }} className="h-full bg-splat-pink rounded-full w-full shadow-[0_0_10px_#F03C69]" />
          </div>
        </div>

        {/* 免稅進度 */}
        <div className="bg-white/10 p-3 rounded-2xl border border-white/20 relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[10px] font-bold text-splat-green uppercase tracking-widest flex items-center gap-1">
                Tax-Free Progress <Sparkles size={10} />
              </div>
              <div className="text-xs font-black italic truncate max-w-[150px]">
                @ {taxFreeProgress.store || '尚未指定店家'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-black font-mono">
                {Math.floor(taxFreeProgress.amount).toLocaleString()}
              </span>
              <span className="text-[9px] text-gray-400 ml-1 block">/ 5,500 JPY</span>
            </div>
          </div>
          <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-black">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${taxFreeProgress.percent}%` }}
              className={`h-full ${taxFreeProgress.percent >= 100 ? 'bg-splat-yellow shadow-[0_0_10px_#FFC000]' : 'bg-splat-green shadow-[0_0_10px_#21CC65]'}`}
            />
          </div>
          {taxFreeProgress.percent >= 100 && (
            <div className="text-[9px] mt-1.5 font-black text-splat-yellow text-right animate-pulse">
              已達標！此店可享免稅優惠 🎉
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-black text-splat-dark italic uppercase flex items-center gap-2">
          <Tag size={20} strokeWidth={3} className="text-splat-blue" /> Buy List
        </h3>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => openEditor()}
          className="btn-splat bg-splat-green text-white px-4 py-2 flex items-center gap-2 text-sm border-2 border-splat-dark shadow-sm"
        >
          <Plus size={18} strokeWidth={4} /> 新增
        </motion.button>
      </div>

      {/* 快速篩選 Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2 pt-1 px-1">
        <FilterTab active={filterStore === 'All'} onClick={() => setFilterStore('All')} label="All Stores" icon={<MapPin size={12} />} />
        {stores.map(v => (
          <FilterTab key={`s_${v}`} active={filterStore === v as string} onClick={() => setFilterStore(v as string)} label={v as string} icon={<MapPin size={12} />} />
        ))}
        {buyers.map(v => (
          <FilterTab key={`b_${v}`} active={filterForWhom === v as string} onClick={() => setFilterForWhom(v as string)} label={`幫 ${v} 買`} icon={<User size={12} />} />
        ))}
      </div>

      {/* 2. 願望清單列表 */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {sortedList.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white border-[3px] border-dashed border-gray-300 rounded-[32px] text-gray-400 font-black italic">
              目前清單空空如也 🛍️
            </motion.div>
          ) : (
            sortedList.map(item => (
              <ShoppingRow
                key={item.id}
                item={item}
                exchangeRate={exchangeRate}
                onToggle={() => handleCheck(item)}
                onClick={() => setViewingItem(item)}
                onDelete={() => deleteShoppingItem(trip.id, item.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* 3. 詳情視圖 BottomSheet */}
      <BottomSheet
        isOpen={!!viewingItem}
        onClose={() => { setViewingItem(null); setIsScreenshotMode(false); }}
        className="bg-[#F4F5F7]"
      >
        <AnimatePresence>
          {viewingItem && (
            <div className="space-y-6 pb-6 pt-2">
              {/* Screenshot Mode overlay (Only active when clicked) */}
              {isScreenshotMode ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 rounded-3xl border-[4px] border-splat-dark shadow-2xl relative"
                >
                  <p className="text-center text-[10px] font-black tracking-widest text-gray-400 mb-2">🔥 SCREENSHOT FOR FRIEND 🔥</p>
                  <div className="aspect-video bg-gray-100 rounded-xl mb-4 border-[3px] border-splat-dark overflow-hidden flex items-center justify-center">
                    {viewingItem.images?.length > 0 ? (
                      <img src={viewingItem.images[0]} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={48} className="text-gray-300" />
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-center text-splat-dark mb-4 leading-tight">{viewingItem.title}</h3>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-gray-100 p-3 rounded-xl border border-gray-300">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Quantity</p>
                      <p className="text-xl font-black font-mono mt-1">x {viewingItem.quantity || 1}</p>
                    </div>
                    <div className="bg-splat-dark text-white p-3 rounded-xl border-[3px] border-splat-dark transform rotate-[2deg] shadow-splat-solid-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-splat-yellow">Max Price</p>
                      <p className="text-2xl font-black italic mt-1">{viewingItem.currency} {viewingItem.targetPrice || viewingItem.price}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsScreenshotMode(false)} className="w-full mt-6 py-4 bg-gray-200 text-gray-500 rounded-xl font-bold uppercase tracking-widest text-xs">Exit Screenshot Mode</button>
                </motion.div>
              ) : (
                <>
                  {/* Info Header */}
                  <div className="flex gap-4">
                    <div className="w-28 h-28 shrink-0 bg-gray-100 rounded-2xl border-[3px] border-splat-dark shadow-sm overflow-hidden flex items-center justify-center">
                      {viewingItem.images?.length > 0 ? (
                        <img src={viewingItem.images[0]} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={32} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-1 flex-wrap mb-1">
                        {viewingItem.forWhom && (
                          <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md flex items-center gap-1 border border-purple-200"><User size={10} /> {viewingItem.forWhom}</span>
                        )}
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md text-white border-2 border-transparent ${CATEGORIES[viewingItem.category as keyof typeof CATEGORIES]?.color || CATEGORIES.general.color}`}>
                          {CATEGORIES[viewingItem.category as keyof typeof CATEGORIES]?.label}
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-splat-dark leading-tight line-clamp-2 mt-2">{viewingItem.title}</h2>

                      <div className="mt-3 bg-white p-2.5 rounded-xl border-2 border-splat-dark shadow-sm shrink-0 flex items-center justify-between">
                        <span className="text-[11px] font-black text-gray-400 font-mono tracking-widest uppercase">{viewingItem.currency} x {viewingItem.quantity || 1}</span>
                        <span className="text-2xl font-black italic">{viewingItem.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* 價格情報局 (AI Intelligence) */}
                  <div className="bg-white p-4 rounded-3xl border-[3px] border-splat-dark shadow-[4px_4px_0px_#1A1A1A] relative overflow-hidden">
                    <h3 className="text-xs font-black uppercase text-splat-dark tracking-widest mb-3 flex items-center gap-2">
                      <Sparkles size={16} className="text-splat-blue" strokeWidth={3} /> 市場價格情報局
                    </h3>

                    {viewingItem.targetPrice && viewingItem.targetPrice > 0 && (
                      <div className="flex items-center gap-3 mb-4 bg-gray-50 p-3 rounded-2xl border-2 border-gray-200">
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Target 🎯</p>
                          <p className="text-xl font-black">{viewingItem.targetPrice.toLocaleString()}</p>
                        </div>
                        <div className="h-10 w-0.5 bg-gray-300/50"></div>
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Diff</p>
                          <p className={`text-xl font-black ${viewingItem.price <= viewingItem.targetPrice ? 'text-splat-green' : 'text-splat-pink'}`}>
                            {viewingItem.price <= viewingItem.targetPrice ? '✅ 完美' : `+${(viewingItem.price - viewingItem.targetPrice).toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {viewingItem.aiPriceInfo ? (
                      <div className="p-4 bg-splat-blue/5 border-[3px] border-splat-blue/20 rounded-2xl relative">
                        <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-xl opacity-20 ${viewingItem.aiPriceInfo.dealRating === 'good' ? 'bg-splat-green' : 'bg-splat-pink'
                          }`} />
                        <p className="font-bold text-gray-700 text-[15px] leading-relaxed relative z-10">{viewingItem.aiPriceInfo.advice}</p>
                        <div className="text-[9px] font-black text-gray-400 text-right mt-3 relative z-10 tracking-widest uppercase">Validated {new Date(viewingItem.aiPriceInfo.lastChecked).toLocaleTimeString()}</div>
                      </div>
                    ) : (
                      <button onClick={() => handleAiPriceCheck(viewingItem)} disabled={isAiLoading} className="w-full py-4 bg-gray-50 text-splat-blue font-black rounded-2xl border-[3px] border-dashed border-splat-blue/50 flex items-center justify-center gap-2 active:bg-blue-50 transition-colors">
                        {isAiLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} strokeWidth={3} />}
                        AI 市場划算度評估 ✨
                      </button>
                    )}
                  </div>

                  {/* 採購行動按鈕列 */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((viewingItem.storeName || '') + ' ' + (viewingItem.location || '') + ' ' + viewingItem.title)}`}
                      target="_blank" rel="noreferrer"
                      className="py-5 bg-splat-yellow text-splat-dark flex flex-col items-center justify-center gap-1.5 rounded-[24px] border-[3px] border-splat-dark font-black shadow-splat-solid-sm active:translate-y-1 active:shadow-none transition-all"
                    >
                      <Navigation size={22} strokeWidth={3} /> 去採購
                    </a>
                    <button
                      onClick={() => setIsScreenshotMode(true)}
                      className="py-5 bg-white text-splat-dark flex flex-col items-center justify-center gap-1.5 rounded-[24px] border-[3px] border-splat-dark font-black shadow-splat-solid-sm active:translate-y-1 active:shadow-none transition-all"
                    >
                      <Camera size={22} strokeWidth={3} /> 生成代購截圖
                    </button>
                  </div>

                  {/* 編輯 & 完成 */}
                  <div className="grid grid-cols-[1fr_auto] gap-3 mt-1">
                    <button
                      onClick={() => { setViewingItem(null); openEditor(viewingItem); }}
                      className="py-4 bg-gray-200 text-gray-600 rounded-2xl border-[3px] border-transparent font-black active:bg-gray-300 transition-colors"
                    >編輯商品</button>
                    <button
                      onClick={() => {
                        const shouldCheck = !viewingItem.isBought;
                        if (shouldCheck) triggerHaptic('success');
                        setViewingItem(null);
                        toggleShoppingItem(trip.id, viewingItem.id);
                      }}
                      className={`w-16 h-16 flex items-center justify-center rounded-2xl border-[3px] border-splat-dark shadow-sm transition-colors ${viewingItem.isBought ? 'bg-gray-100 text-gray-400 opacity-50' : 'bg-splat-green text-white shadow-[4px_4px_0px_#1A1A1A] active:translate-y-1 active:shadow-none'}`}
                    >
                      <Check size={32} strokeWidth={4} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </AnimatePresence>
      </BottomSheet>

      {/* 4. 新增/編輯 Modal (iOS 抽屜體驗) */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-[#F4F5F7] z-[2100] px-4 py-6 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6 pt-2 sticky top-0 bg-[#F4F5F7]/90 backdrop-blur z-20 pb-4">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-splat-dark">{editingItemId ? 'Edit Item' : 'Add Item'}</h2>
              <div className="flex gap-2">
                {editingItemId && (
                  <button onClick={() => { deleteShoppingItem(trip.id, editingItemId); setIsAdding(false); setEditingItemId(null); }} className="p-3 text-splat-pink bg-white rounded-[20px] border-[3px] border-splat-dark shadow-sm active:scale-95 transition-transform"><Trash2 size={24} strokeWidth={3} /></button>
                )}
                <button onClick={() => setIsAdding(false)} className="p-3 bg-white rounded-[20px] border-[3px] border-splat-dark shadow-splat-solid-sm active:scale-95 transition-transform">
                  <X size={24} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="space-y-6 pb-20">
              {/* Photo */}
              <div className="flex gap-3 overflow-x-auto py-2 hide-scrollbar">
                <label className="min-w-[120px] aspect-square bg-white border-[3px] border-dashed border-gray-300 rounded-[32px] flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 relative overflow-hidden">
                  {isUploading ? <Loader2 size={32} className="animate-spin text-splat-dark" /> : <Camera size={32} strokeWidth={2.5} />}
                  <span className="text-[10px] font-black mt-2 uppercase tracking-widest">Photo</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                {form.images?.map((img, i) => (
                  <div key={i} className="min-w-[120px] aspect-square rounded-[32px] border-[3px] border-splat-dark shadow-sm relative overflow-hidden">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setForm({ ...form, images: form.images?.filter((_, idx) => idx !== i) })} className="absolute top-2 right-2 bg-white p-1.5 rounded-full border-2 border-splat-dark"><X size={14} strokeWidth={3} /></button>
                  </div>
                ))}
              </div>

              {/* Title Input */}
              <div className="bg-white p-4 rounded-3xl border-[3px] border-splat-dark">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">What to buy?</label>
                <input placeholder="名稱 (例：蒸氣眼罩)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full mt-1 p-2 bg-transparent font-black text-2xl outline-none" />
              </div>

              {/* Price Row */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white p-4 rounded-3xl border-[3px] border-splat-dark">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price {form.currency}</label>
                  <input type="number" placeholder="金額..." value={form.price || ''} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="w-full mt-1 p-2 bg-transparent font-black text-2xl outline-none" />
                </div>
                <div className="w-28 bg-white p-4 rounded-3xl border-[3px] border-splat-dark">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center block">Qty</label>
                  <input type="number" min="1" placeholder="1" value={form.quantity || 1} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="w-full mt-1 p-2 bg-transparent font-black text-2xl text-center outline-none" />
                </div>
              </div>

              {/* Target Price */}
              <div className="bg-splat-pink/5 p-4 rounded-3xl border-[3px] border-splat-pink relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-splat-pink/10 rounded-full blur-xl"></div>
                <label className="text-[10px] font-black text-splat-pink uppercase tracking-widest ml-1 flex items-center gap-1 relative z-10">Target Price <Sparkles size={10} /></label>
                <input type="number" placeholder="你想入手的目標底價..." value={form.targetPrice || ''} onChange={e => setForm({ ...form, targetPrice: Number(e.target.value) })} className="w-full mt-1 p-2 bg-transparent font-black text-xl outline-none text-splat-pink placeholder:text-splat-pink/30 relative z-10" />
              </div>

              {/* Store & Proxy details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-[24px] border-[3px] border-splat-dark">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Store / Shop</label>
                  <input placeholder="例如：大國藥妝" value={form.storeName || ''} onChange={e => setForm({ ...form, storeName: e.target.value })} className="w-full mt-1 p-2 bg-transparent font-black text-sm outline-none" />
                </div>
                <div className="bg-white p-3.5 rounded-[24px] border-[3px] border-splat-dark">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><User size={10} /> For Whom</label>
                  <input placeholder="代買給誰？" value={form.forWhom || ''} onChange={e => setForm({ ...form, forWhom: e.target.value })} className="w-full mt-1 p-2 bg-transparent font-black text-sm outline-none text-splat-blue" />
                </div>
              </div>

              {/* Metadata dropdowns */}
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-[24px] font-black outline-none appearance-none tracking-widest text-sm">
                    {Object.entries(PRIORITIES).map(([id, cfg]) => <option key={id} value={id}>{cfg.label}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-[24px] font-black outline-none appearance-none tracking-widest text-sm">
                    {Object.entries(CATEGORIES).map(([id, cfg]) => <option key={id} value={id}>{cfg.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Tax Free Toggle */}
              <label className="flex items-center gap-4 p-5 bg-white border-[3px] border-splat-dark rounded-3xl cursor-pointer select-none">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-colors ${form.isTaxFreeEligible ? 'bg-splat-green border-splat-green' : 'bg-gray-100 border-gray-300'}`}>
                  {form.isTaxFreeEligible && <Check size={20} className="text-white" strokeWidth={4} />}
                </div>
                <div>
                  <div className="font-black text-base">符合免稅計算 (Tax-Free)</div>
                  <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-0.5">Will be added to dashboard target</div>
                </div>
              </label>

              <button onClick={handleSave} className="w-full py-5 mt-4 bg-splat-dark text-splat-yellow text-xl font-black rounded-3xl border-[3px] border-splat-dark shadow-[6px_6px_0px_#FFC000] active:translate-y-2 active:shadow-none transition-all uppercase tracking-widest">
                {editingItemId ? 'Save Changes ✔' : 'Add to Buy List ➔'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// --- 子組件: 快速篩選標籤 ---
const FilterTab = ({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: ReactNode }) => (
  <button
    onClick={onClick}
    className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-[3px] font-black text-[12px] uppercase tracking-wider transition-colors ${active ? 'bg-splat-dark text-white border-splat-dark shadow-sm' : 'bg-white text-gray-400 border-gray-200'}`}
  >
    {icon} {label}
  </button>
)

// --- 清單項目卡片 (核心設計) ---
const ShoppingRow = ({ item, exchangeRate, onToggle, onClick, onDelete }: { item: ShoppingItem, exchangeRate: number, onToggle: () => void, onClick: () => void, onDelete: () => void }) => {
  const cat = CATEGORIES[item.category as keyof typeof CATEGORIES] || CATEGORIES.general;
  const prio = PRIORITIES[item.priority as keyof typeof PRIORITIES] || PRIORITIES.medium;
  const isGoodDeal = item.aiPriceInfo?.dealRating === 'good' || item.aiPriceInfo?.lowPriceAlert;

  const convertedPrice = item.currency === 'JPY' && exchangeRate
    ? Math.round(item.price * (item.quantity || 1) * exchangeRate) : null;

  return (
    <SwipeableItem id={item.id} onDelete={onDelete} className="rounded-3xl">
      <div
        onClick={onClick}
        className={`relative z-10 bg-white border-[3px] ${prio.borderColor} ${prio.glow} rounded-3xl p-4 flex items-center gap-4 transition-all overflow-hidden ${item.isBought ? 'bg-gray-100 opacity-80' : 'shadow-splat-solid-sm active:translate-y-1 active:shadow-none'}`}
      >
        {/* 左側 Check 按鈕 */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-12 h-12 rounded-[18px] border-[3px] border-splat-dark flex items-center justify-center transition-colors relative z-20 shrink-0 ${item.isBought ? 'bg-splat-dark text-splat-yellow shadow-inner' : 'bg-white shadow-sm'}`}
        >
          {item.isBought && <Check size={28} strokeWidth={5} />}
        </motion.button>

        <div className="flex-1 min-w-0 relative z-10">

          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border-2 ${item.isBought ? 'bg-gray-300 border-transparent text-white' : 'bg-white border-current text-gray-500'} leading-none`}>
              {prio.label}
            </span>
            {item.forWhom && (
              <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md flex items-center gap-1 border border-purple-200"><User size={10} /> {item.forWhom}</span>
            )}
            {item.storeName && (
              <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md truncate max-w-[80px]">@ {item.storeName}</span>
            )}
          </div>

          <h4 className={`text-lg font-black tracking-tight leading-none mb-1.5 ${item.isBought ? 'text-gray-400 line-through decoration-splat-dark decoration-2' : 'text-splat-dark'}`}>
            {item.title} <span className="text-xs font-bold opacity-60 ml-1 font-mono">x{item.quantity || 1}</span>
          </h4>

          {/* 價格資訊區 (含即時匯率換算) */}
          <div className="flex items-center gap-2">
            <span className={`font-mono font-black text-xl leading-none tracking-tighter ${item.isBought ? 'text-gray-400' : 'text-splat-dark'}`}>
              <span className="text-xs mr-1 opacity-70">{item.currency}</span>
              {(item.price * (item.quantity || 1)).toLocaleString()}
            </span>
            {convertedPrice && (
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                ≈ NT$ {convertedPrice.toLocaleString()}
              </span>
            )}

            {isGoodDeal && !item.isBought && (
              <span className="text-[9px] font-black bg-splat-pink/10 text-splat-pink px-1.5 py-0.5 rounded-md border border-splat-pink/30 flex items-center gap-1 animate-pulse ml-auto">
                <Sparkles size={10} strokeWidth={3} />推薦入手
              </span>
            )}
          </div>

          {/* 📍 核心：墨跡刷過特效 (Ink Brush Stroke) 打勾後播放 */}
          <AnimatePresence>
            {item.isBought && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '120%', opacity: 0.85 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute top-[45%] left-[-10%] h-[18px] pointer-events-none mix-blend-multiply rounded-full"
                style={{ backgroundColor: cat.splat, rotate: `${Math.random() * 6 - 3}deg` }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </SwipeableItem>
  );
};
