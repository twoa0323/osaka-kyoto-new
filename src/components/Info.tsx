import { useState, useMemo, createElement, ChangeEvent, ReactNode } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
  ExternalLink, ShieldAlert, Plus, X, Camera, Trash2, Globe, Phone, Loader2,
  FileText, Luggage, MapPin, HeartPulse, Languages, Wifi, Zap, FileKey, Sparkles, Navigation, Copy
} from 'lucide-react';
import { uploadImage } from '../utils/imageUtils';
import { InfoItem } from '../types';
import { PackingList } from './PackingList';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';
import { SwipeableItem } from './Common';
import { BottomSheet } from './ui/BottomSheet';

const CATEGORIES = {
  'SOS': { label: '🆘 緊急', color: 'bg-red-500', icon: ShieldAlert },
  'Network': { label: '🌐 網路電力', color: 'bg-splat-blue', icon: Wifi },
  'Language': { label: '🗣️ 語言', color: 'bg-splat-pink', icon: Languages },
  'Culture': { label: '⛩️ 文化禮儀', color: 'bg-splat-green', icon: Sparkles },
  'Other': { label: '📋 其他', color: 'bg-gray-500', icon: FileText },
};

export const Info = () => {
  const { trips, currentTripId, addInfoItem, deleteInfoItem, updateInfoItem, showToast } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);

  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingItem, setViewingItem] = useState<InfoItem | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // States specific to AI generation inside Detail Modal
  const [translatorInput, setTranslatorInput] = useState('');
  const [translatorResult, setTranslatorResult] = useState<{ japanese: string, romaji: string } | null>(null);
  const [fullScreenText, setFullScreenText] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<InfoItem>>({
    type: 'note', title: '', content: '', images: [], url: '',
    category: 'Other', priority: false
  });

  const list = trip?.infoItems || [];

  const filteredList = useMemo(() => {
    return list.filter(i => {
      if (filterCategory !== 'All' && i.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return 0; // fallback to creation order if priorities are same
    });
  }, [list, filterCategory, searchQuery]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files); e.target.value = ''; setIsUploading(true);
      try {
        const urls = await Promise.all(files.map(f => uploadImage(f)));
        setForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
      } catch (err) {
        showToast("上傳失敗！🎨", "error");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (!form.title) {
      showToast("給這條資訊一個標題吧！💡", "info");
      return;
    }
    if (editingItemId) {
      if (!trip) return;
      updateInfoItem(trip.id, editingItemId, form);
      if (viewingItem && viewingItem.id === editingItemId) {
        setViewingItem({ ...viewingItem, ...form } as InfoItem);
      }
    } else {
      const newItem: InfoItem = {
        id: Date.now().toString(),
        type: form.type || 'note',
        title: form.title,
        content: form.content || '',
        images: form.images || [],
        url: form.url || '',
        category: form.category as any || 'Other',
        priority: form.priority || false
      };
      if (trip) addInfoItem(trip.id, newItem);
    }
    setIsAdding(false);
    setEditingItemId(null);
  };

  const openEditor = (item?: InfoItem) => {
    if (item) {
      setForm({ ...item, category: item.category || 'Other' });
      setEditingItemId(item.id);
    } else {
      setForm({ type: 'note', title: '', content: '', images: [], url: '', category: (filterCategory !== 'All' ? filterCategory : 'Other') as InfoItem['category'], priority: false });
      setEditingItemId(null);
    }
    setIsAdding(true);
  };

  const handleQuickGps = async () => {
    triggerHaptic('success');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const crd = position.coords;
        const text = `Lat: ${crd.latitude.toFixed(4)}, Lng: ${crd.longitude.toFixed(4)}`;
        navigator.clipboard.writeText(text);
        showToast(`已複製坐標: ${text}`, "success");
      }, () => {
        showToast("無法獲取位置", "error");
      });
    } else {
      showToast("瀏覽器不支援定位", "error");
    }
  };

  const handleAiTranslate = async () => {
    if (!translatorInput) return;
    setIsAiLoading(true);
    triggerHaptic('light');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translate-phrase',
          payload: { phrase: translatorInput }
        })
      });
      const data = await res.json();
      if (data && data.japanese) {
        setTranslatorResult(data);
        showToast("✨ 翻譯完成！", "success");
      }
    } catch (e) {
      showToast("翻譯機失靈，請稍後再試！", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiCulture = async (item: InfoItem) => {
    setIsAiLoading(true);
    triggerHaptic('light');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cultural-taboos',
          payload: { dest: trip?.destination || '' }
        })
      });
      const data = await res.json();
      if (data && data.taboos) {
        // Auto save the generated content into this item
        const newContent = `${item.content}\n\n✨ AI 避坑指南：\n${data.taboos.map((t: string) => `• ${t}`).join('\n')}`;
        if (trip) updateInfoItem(trip.id, item.id, { content: newContent });
        setViewingItem({ ...item, content: newContent });
        showToast("✨ 當地生存法則已載入！", "success");
      }
    } catch (e) {
      showToast("情報抓取失敗！", "error");
    } finally {
      setIsAiLoading(false);
    }
  };


  if (!trip) return null;

  return (
    <div className="px-4 pb-32 animate-fade-in text-left font-sans">

      {/* 1. SOS Dashboard 重構層級 */}
      <div className="grid grid-cols-[60%_1fr] gap-3 mb-6 relative">
        <div className="bg-red-600 rounded-3xl p-5 border-[4px] border-splat-dark shadow-splat-solid text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 mix-blend-overlay rounded-full blur-2xl group-active:scale-150 transition-transform"></div>
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <ShieldAlert size={20} className="animate-pulse" />
            <h3 className="font-black italic uppercase tracking-widest text-sm">Emergency SOS</h3>
          </div>
          <div className="flex gap-2 relative z-10">
            <a href="tel:110" className="flex-1 bg-white text-red-600 font-black text-xl py-3 rounded-2xl border-2 border-splat-dark text-center shadow-sm active:translate-y-1 active:shadow-none transition-all">110</a>
            <a href="tel:119" className="flex-1 bg-white text-red-600 font-black text-xl py-3 rounded-2xl border-2 border-splat-dark text-center shadow-sm active:translate-y-1 active:shadow-none transition-all">119</a>
          </div>
          <button onClick={handleQuickGps} className="mt-3 w-full bg-red-800 text-red-200 text-[10px] font-black tracking-widest uppercase py-2.5 rounded-xl border border-red-900 flex items-center justify-center gap-1.5 active:bg-red-900 transition-colors">
            <MapPin size={12} /> 複製當前 GPS 報案座標
          </button>
        </div>

        <div onClick={() => setFilterCategory('Other')} className="bg-splat-yellow rounded-3xl p-4 border-[4px] border-splat-dark shadow-splat-solid flex flex-col items-center justify-center gap-2 cursor-pointer active:translate-y-1 active:shadow-splat-solid-sm transition-all">
          <div className="w-14 h-14 bg-white rounded-2xl border-2 border-splat-dark shadow-inner flex items-center justify-center text-splat-dark">
            <FileKey size={28} strokeWidth={2.5} />
          </div>
          <span className="font-black uppercase tracking-widest text-[10px] text-splat-dark text-center leading-tight mt-1">
            Insurance<br />& Docs
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 mt-2">
        <h3 className="text-xl font-black text-splat-dark italic uppercase flex items-center gap-2">
          <Globe size={20} strokeWidth={3} className="text-splat-pink" /> Toolbox
        </h3>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => openEditor()}
          className="bg-splat-dark text-white px-4 py-2 flex items-center gap-2 text-sm font-black border-2 border-splat-dark shadow-[2px_2px_0px_#FFFFFF] rounded-xl"
        >
          <Plus size={18} strokeWidth={4} /> 新增
        </motion.button>
      </div>

      {/* 搜尋與過濾 */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search tags, places, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-[3px] border-splat-dark rounded-2xl px-5 py-4 font-black text-splat-dark focus:ring-4 focus:ring-splat-pink/30 outline-none transition-all placeholder:text-gray-300"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-100 rounded-full p-1"><X size={16} /></button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 hide-scrollbar -mx-4 px-4">
          <FilterTab active={filterCategory === 'All'} onClick={() => setFilterCategory('All')} label="All" />
          {Object.entries(CATEGORIES).map(([id, cfg]) => (
            <FilterTab key={id} active={filterCategory === id} onClick={() => setFilterCategory(id)} label={cfg.label.split(' ')[1]} icon={<cfg.icon size={12} />} customBg={cfg.color} />
          ))}
        </div>
      </div>

      {/* 2. 資訊卡片清單 */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredList.map(item => (
            <SwipeableItem key={item.id} id={item.id} onDelete={() => deleteInfoItem(trip.id, item.id)} className="rounded-[24px]">
              <div
                onClick={() => { setViewingItem(item); setTranslatorInput(''); setTranslatorResult(null); }}
                className={`bg-white border-[3px] border-splat-dark rounded-[24px] overflow-hidden p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform shadow-splat-solid-sm relative ${item.priority ? 'ring-4 ring-splat-yellow/50' : ''}`}
              >
                <div className={`w-14 h-14 rounded-2xl border-2 border-splat-dark flex flex-col items-center justify-center shrink-0 shadow-inner text-white ${CATEGORIES[item.category as keyof typeof CATEGORIES]?.color || CATEGORIES.Other.color}`}>
                  {createElement(CATEGORIES[item.category as keyof typeof CATEGORIES]?.icon || FileText, { size: 24, strokeWidth: 2.5 })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {item.priority && <span className="bg-splat-yellow px-1.5 rounded-sm text-[9px] font-black uppercase text-splat-dark">Pinned</span>}
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{CATEGORIES[item.category as keyof typeof CATEGORIES]?.label}</span>
                  </div>
                  <h4 className="font-black text-splat-dark text-lg leading-tight truncate">
                    {searchQuery ? highlightText(item.title, searchQuery) : item.title}
                  </h4>
                  {item.content && <p className="text-xs text-gray-500 font-bold truncate mt-1">{searchQuery ? highlightText(item.content, searchQuery) : item.content}</p>}
                </div>
              </div>
            </SwipeableItem>
          ))}
        </AnimatePresence>

        {filteredList.length === 0 && (
          <div className="text-center py-20 bg-gray-50 border-[3px] border-dashed border-gray-300 rounded-[32px] text-gray-400 font-black italic shadow-sm">
            無符合條件的裝備資訊 🧰
          </div>
        )}
      </div>

      {/* 3. 智慧行李箱融合 (Packing List Embedded) */}
      <div className="mt-8">
        <h3 className="text-xl font-black text-splat-dark italic uppercase flex items-center gap-2 mb-4 px-2">
          <Luggage size={20} strokeWidth={3} className="text-splat-orange" /> Luggage
        </h3>
        <div className="bg-white p-2 rounded-[40px] border-[4px] border-splat-dark shadow-splat-solid">
          <PackingList className="p-2 border-none shadow-none" />
        </div>
      </div>

      {/* BottomSheet 詳情與特定卡片 UI */}
      <BottomSheet isOpen={!!viewingItem && !fullScreenText} onClose={() => { setViewingItem(null); setTranslatorInput(''); setTranslatorResult(null); }} className="bg-[#F4F5F7]">
        <AnimatePresence>
          {viewingItem && !fullScreenText && (
            <div className="space-y-6 pb-8 pt-2">

              {/* Header & Meta */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-widest shadow-sm ${CATEGORIES[viewingItem.category as keyof typeof CATEGORIES]?.color || CATEGORIES.Other.color}`}>
                    {CATEGORIES[viewingItem.category as keyof typeof CATEGORIES]?.label}
                  </span>
                  {viewingItem.priority && <span className="text-[10px] font-black text-splat-yellow uppercase tracking-widest bg-splat-yellow/10 px-2 py-1 rounded-lg border border-splat-yellow/30">🌟 PINNED</span>}
                </div>
                <button onClick={() => { setViewingItem(null); openEditor(viewingItem); }} className="text-xs font-black uppercase text-gray-400 tracking-wider bg-gray-100 px-3 py-1.5 rounded-lg active:bg-gray-200">
                  Edit ✏️
                </button>
              </div>

              <h2 className="text-2xl font-black text-splat-dark leading-tight">{viewingItem.title}</h2>

              {/* 專屬分類模塊渲染 (AI 語言傳聲筒) */}
              {viewingItem.category === 'Language' && (
                <div className="bg-white p-5 rounded-[24px] border-[3px] border-splat-pink shadow-splat-solid-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-splat-pink/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10 space-y-4">
                    <h3 className="font-black italic uppercase text-splat-pink flex items-center gap-1.5"><Sparkles size={16} /> AI 語言翻譯小幫手</h3>
                    <div className="flex gap-2">
                      <input
                        placeholder="例如：這附近有廁所嗎？"
                        value={translatorInput}
                        onChange={e => setTranslatorInput(e.target.value)}
                        className="flex-1 bg-gray-50 border-2 border-gray-300 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-splat-pink transition-colors"
                      />
                      <button onClick={handleAiTranslate} disabled={isAiLoading} className="bg-splat-dark text-white px-4 rounded-xl shadow-sm active:translate-y-1">
                        {isAiLoading ? <Loader2 size={20} className="animate-spin" /> : '翻譯'}
                      </button>
                    </div>

                    {translatorResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-splat-pink/5 border-2 border-splat-pink rounded-xl relative">
                        <button onClick={() => setFullScreenText(translatorResult.japanese)} className="absolute top-3 right-3 text-splat-pink p-1 bg-white rounded-md border border-splat-pink/30 shadow-sm">大字顯示 <Zap size={10} className="inline" /></button>
                        <p className="font-black text-splat-dark text-2xl pr-16">{translatorResult.japanese}</p>
                        <p className="font-bold text-splat-pink text-sm font-mono mt-1 uppercase tracking-widest">{translatorResult.romaji}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* 專屬分類模塊渲染 (文化與禮儀) */}
              {viewingItem.category === 'Culture' && (
                <div className="bg-white p-5 rounded-[24px] border-[3px] border-splat-green shadow-splat-solid-sm relative">
                  <h3 className="font-black italic uppercase text-splat-green flex items-center gap-1.5 mb-3"><Sparkles size={16} /> AI 生存避坑指南</h3>
                  <p className="text-xs font-bold text-gray-500 mb-4">不確定當地有什麼潛規則？讓 AI 告訴你 3 個絕對不要做的地雷！</p>
                  <button onClick={() => handleAiCulture(viewingItem)} disabled={isAiLoading} className="w-full py-4 bg-splat-green/10 text-splat-green font-black rounded-xl border-2 border-dashed border-splat-green flex items-center justify-center gap-2 active:bg-splat-green/20">
                    {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : '✨ 點擊獲取當地禁忌'}
                  </button>
                </div>
              )}

              {/* 一般內容 */}
              {viewingItem.content && (
                <div className="bg-white p-5 rounded-[24px] border-2 border-gray-200">
                  <p className="text-base text-gray-700 font-bold whitespace-pre-wrap leading-relaxed">{viewingItem.content}</p>
                </div>
              )}

              {/* 圖片展示 (地圖高畫質) */}
              {viewingItem.images && viewingItem.images.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 border-b-2 border-gray-200 pb-1 inline-block">Attachments</h4>
                  <div className="flex gap-3 overflow-x-auto pb-4 pt-1 hide-scrollbar">
                    {viewingItem.images.map((img, i) => (
                      <div key={i} className="min-w-[200px] h-32 rounded-2xl overflow-hidden border-[3px] border-splat-dark shadow-sm shrink-0 relative cursor-pointer active:scale-95 transition-transform" onClick={() => window.open(img, '_blank')}>
                        <img src={img} loading="lazy" className="w-full h-full object-cover" alt="attachment" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <span className="text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><ExternalLink size={10} /> 查看超清大圖</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 相關連結按鈕 */}
              {viewingItem.url && (
                <a href={viewingItem.url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-splat-dark text-white px-5 py-4 rounded-xl border-[3px] border-splat-dark shadow-splat-solid-sm active:translate-y-1 active:shadow-none transition-all">
                  <span className="font-black uppercase tracking-widest text-sm truncate pr-4">{viewingItem.url.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink size={20} className="shrink-0 text-splat-yellow" strokeWidth={3} />
                </a>
              )}

            </div>
          )}
        </AnimatePresence>
      </BottomSheet>

      {/* 滿版大文字視圖 (給店員看) */}
      <AnimatePresence>
        {fullScreenText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[3000] bg-white text-splat-dark p-8 flex flex-col items-center justify-center overscroll-contain"
          >
            <button onClick={() => setFullScreenText(null)} className="absolute top-6 right-6 p-4 bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform"><X size={32} /></button>
            <div className="absolute top-8 left-8">
              <span className="bg-splat-pink text-white font-black uppercase px-4 py-2 rounded-xl border-4 border-splat-dark shadow-splat-solid text-xl -rotate-3 inline-block">SHOW THIS</span>
            </div>
            <p className="text-[4rem] font-bold leading-tight text-center break-words w-full px-4">{fullScreenText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. 新增/編輯 Modal (iOS 抽屜體驗) */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-[#F4F5F7] z-[2100] px-4 py-6 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6 pt-2 sticky top-0 bg-[#F4F5F7]/90 backdrop-blur z-20 pb-4">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-splat-dark">{editingItemId ? 'Edit Tool' : 'Add Tool'}</h2>
              <div className="flex gap-2">
                {editingItemId && (
                  <button onClick={() => { deleteInfoItem(trip.id, editingItemId); setIsAdding(false); setEditingItemId(null); }} className="p-3 text-splat-pink bg-white rounded-[20px] border-[3px] border-splat-dark shadow-sm active:scale-95 transition-transform"><Trash2 size={24} strokeWidth={3} /></button>
                )}
                <button onClick={() => setIsAdding(false)} className="p-3 bg-white rounded-[20px] border-[3px] border-splat-dark shadow-splat-solid-sm active:scale-95 transition-transform">
                  <X size={24} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="space-y-5 pb-20">
              {/* 類別 */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(CATEGORIES).map(([id, cfg]) => (
                  <button
                    key={id}
                    onClick={() => setForm({ ...form, category: id as any })}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-[3px] font-black text-xs uppercase tracking-wider transition-colors ${form.category === id ? 'bg-splat-dark text-white border-splat-dark shadow-sm' : 'bg-white text-gray-400 border-gray-200'}`}
                  >
                    <cfg.icon size={14} /> {cfg.label.split(' ')[1]}
                  </button>
                ))}
              </div>

              {/* Title */}
              <div className="bg-white p-4 rounded-3xl border-[3px] border-splat-dark">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
                <input placeholder="輸入標題 (如：保險單號碼)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full mt-1 p-2 bg-transparent font-black text-2xl outline-none" />
              </div>

              {/* Content */}
              <div className="bg-white p-4 rounded-3xl border-[3px] border-splat-dark">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Content Details</label>
                <textarea placeholder="寫下具體內容..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full mt-1 p-2 bg-transparent font-bold text-base outline-none h-32 resize-none" />
              </div>

              {/* URL */}
              <div className="relative">
                <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-splat-dark" size={20} strokeWidth={2.5} />
                <input placeholder="相關網址連結 (選填)" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full pl-14 pr-5 py-4 bg-white border-[3px] border-splat-dark rounded-[24px] font-bold text-splat-dark outline-none text-sm transition-shadow focus:shadow-[4px_4px_0px_#1A1A1A]" />
              </div>

              {/* Pin Toggle */}
              <label className="flex items-center gap-4 p-5 bg-white border-[3px] border-splat-yellow rounded-3xl cursor-pointer select-none">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-colors ${form.priority ? 'bg-splat-yellow border-splat-yellow' : 'bg-gray-100 border-gray-300'}`}>
                  {form.priority && <Sparkles size={20} className="text-white" strokeWidth={4} />}
                </div>
                <div>
                  <div className="font-black text-base text-splat-dark">🌟 置頂此項目 (Pinned)</div>
                  <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-0.5">Keep at the top of the toolbox</div>
                </div>
              </label>

              {/* Photo */}
              <div className="space-y-1 mt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Attachments (Screenshot/Map/QR)</label>
                <div className="flex gap-3 overflow-x-auto py-2 hide-scrollbar">
                  <label className={`min-w-[100px] aspect-square border-[3px] border-dashed border-gray-400 bg-white rounded-3xl flex flex-col items-center justify-center text-gray-400 cursor-pointer active:scale-95 transition-all relative overflow-hidden ${isUploading ? 'pointer-events-none' : ''}`}>
                    {isUploading ? <Loader2 className="animate-spin text-splat-dark" size={28} strokeWidth={3} /> : <Camera size={28} strokeWidth={2.5} />}
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                  {form.images?.map((img, i) => (
                    <div key={i} className="min-w-[100px] aspect-square rounded-3xl overflow-hidden relative border-[3px] border-splat-dark shadow-sm">
                      <img src={img} className="w-full h-full object-cover" />
                      <button onClick={() => setForm({ ...form, images: form.images?.filter((_, idx) => idx !== i) })} className="absolute top-2 right-2 bg-white border-[2.5px] border-splat-dark text-splat-dark rounded-full p-1.5"><X size={12} strokeWidth={4} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} className="w-full py-5 mt-4 bg-splat-dark text-white text-xl font-black rounded-3xl border-[3px] border-splat-dark shadow-[6px_6px_0px_#1A1A1A] active:translate-y-2 active:shadow-none transition-all uppercase tracking-widest">
                {editingItemId ? 'Save Tool ✔' : 'Add to Toolbox ➔'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper: 關鍵字高亮
const highlightText = (text: string, query: string) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <span key={i} className="bg-splat-yellow/50 text-splat-dark rounded px-0.5">{part}</span>
      : part
  );
};

// --- 子組件: 快速篩選標籤 ---
const FilterTab = ({ active, onClick, label, icon, customBg }: { active: boolean, onClick: () => void, label: string, icon?: ReactNode, customBg?: string }) => (
  <button
    onClick={onClick}
    className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-[3px] font-black text-[12px] uppercase tracking-wider transition-colors ${active ? `bg-splat-dark text-white border-splat-dark shadow-sm` : 'bg-white text-gray-400 border-gray-200'}`}
  >
    {icon} {label}
  </button>
)
