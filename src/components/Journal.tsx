// filepath: src/components/Journal.tsx
import React, { useState, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
  Camera, MapPin, Star, Plus, X, Image as ImageIcon,
  Trash2, Loader2, Map as MapIcon, UtensilsCrossed, CheckCircle, WifiOff
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { uploadImage } from '../utils/imageUtils';
import { JournalItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { LazyImage } from './LazyImage';

export const Journal = () => {
  const { trips, currentTripId, addJournalItem, deleteJournalItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const isOnline = useNetworkStatus();

  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingItem, setViewingItem] = useState<JournalItem | null>(null);
  const [form, setForm] = useState<Partial<JournalItem>>({
    title: '', content: '', images: [], rating: 5, location: '',
    date: new Date().toISOString().split('T')[0]
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
        alert("有圖片上傳失敗了！📸");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (!form.title || (form.images?.length === 0)) {
      return alert("標題跟美食美照至少要有一個唷！🦑");
    }
    const newItem: JournalItem = {
      id: Date.now().toString(),
      date: form.date!,
      title: form.title!,
      content: form.content || '',
      images: form.images || [],
      rating: form.rating || 5,
      location: form.location || ''
    };
    addJournalItem(trip.id, newItem);
    setIsAdding(false);
    setForm({ title: '', content: '', images: [], rating: 5, location: '' });
    triggerHaptic('success');
  };

  return (
    <div className="px-4 pb-28 animate-fade-in text-left">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8 bg-white border-[3px] border-splat-dark p-4 rounded-3xl shadow-splat-solid">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-splat-orange text-white rounded-xl rotate-[-4deg] border-2 border-splat-dark">
            <UtensilsCrossed size={20} strokeWidth={3} />
          </div>
          <h2 className="text-xl font-black text-splat-dark italic uppercase tracking-tighter">Food Journal</h2>
        </div>
        <motion.button
          whileTap={{ scale: 0.9, rotate: 10 }}
          onClick={() => setIsAdding(true)}
          className="w-10 h-10 bg-splat-orange text-white rounded-xl border-[3px] border-splat-dark shadow-splat-solid-sm flex items-center justify-center transition-all"
        >
          <Plus size={24} strokeWidth={4} />
        </motion.button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-2 gap-5 relative">
        <AnimatePresence mode="popLayout">
          {trip.journals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="col-span-2 text-center py-20 bg-white border-[3px] border-dashed border-gray-300 rounded-[40px] text-gray-400 font-black italic shadow-inner"
            >
              拍照留念你的美食地圖吧！🍜
            </motion.div>
          ) : (
            trip.journals.map((item, idx) => (
              <PolaroidCard
                key={item.id}
                item={item}
                index={idx}
                onDelete={(e) => { e.stopPropagation(); if (confirm('確定要刪除這段美味回憶嗎？')) deleteJournalItem(trip.id, item.id); }}
                onClick={() => setViewingItem(item)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Lightbox / Detail View */}
      <AnimatePresence>
        {viewingItem && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewingItem(null)}
              className="absolute inset-0 bg-splat-dark/90 backdrop-blur-sm"
            />
            <motion.div
              layoutId={`card-${viewingItem.id}`}
              className="bg-white p-4 pb-8 border-[4px] border-splat-dark rounded-sm shadow-2xl w-full max-w-sm relative z-10"
            >
              <div className="aspect-square bg-gray-100 mb-4 border-[3px] border-splat-dark overflow-hidden">
                <LazyImage src={viewingItem.images[0]} containerClassName="w-full h-full" alt="food" />
              </div>
              <div className="space-y-4 px-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-2xl tracking-tighter text-splat-dark leading-none">{viewingItem.title}</h3>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} fill={i < viewingItem.rating ? "#FFC000" : "none"} stroke={i < viewingItem.rating ? "#FFC000" : "#E5E7EB"} strokeWidth={3} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase">
                  <MapPin size={14} className="text-splat-pink" /> {viewingItem.location}
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingItem.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-4 bg-splat-blue text-white border-[3px] border-splat-dark rounded-2xl font-black text-center shadow-splat-solid-sm flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all"
                >
                  <MapIcon size={18} strokeWidth={3} />
                  OPEN ON GOOGLE MAPS
                </a>

                <p className="font-serif text-sm text-gray-600 leading-relaxed italic border-l-4 border-gray-100 pl-3">
                  "{viewingItem.content || '沒寫心得，但這道菜好吃到忘記說話了。'}"
                </p>
              </div>
              <button onClick={() => setViewingItem(null)} className="absolute -top-12 right-0 text-white font-black flex items-center gap-1 uppercase tracking-widest text-sm">
                Close <X size={20} strokeWidth={3} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Adding Modal - 原有邏輯強化 */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-[#F4F5F7] z-[1000] p-6 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">New Memory</h2>
              <button onClick={() => setIsAdding(false)} className="p-3 bg-white rounded-full border-3 border-splat-dark shadow-splat-solid-sm active:scale-90 transition-transform">
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Image Upload Area */}
              <div className="flex gap-3 overflow-x-auto py-2 hide-scrollbar">
                <label className="min-w-[120px] aspect-square bg-white border-4 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center text-gray-400 cursor-pointer active:bg-gray-50 transition-colors relative overflow-hidden">
                  {isUploading && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
                  <Camera size={32} />
                  <span className="text-[10px] font-black mt-2 uppercase tracking-widest">Add Photo</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                {form.images?.map((img, i) => (
                  <div key={i} className="min-w-[120px] aspect-square rounded-3xl border-[3px] border-splat-dark overflow-hidden relative shadow-md">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setForm({ ...form, images: form.images?.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-white p-1 rounded-full border-2 border-splat-dark"><X size={12} /></button>
                  </div>
                ))}
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">What did you eat?</label>
                  <input placeholder="餐點名稱 (例如：一蘭拉麵)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-2xl font-black text-lg outline-none focus:ring-4 focus:ring-splat-orange/10" />
                </div>

                <div className="flex items-center justify-between p-4 bg-white border-[3px] border-splat-dark rounded-2xl">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Rating</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(v => (
                      <Star key={v} onClick={() => setForm({ ...form, rating: v })} className={`cursor-pointer transition-all ${v <= (form.rating || 0) ? 'text-splat-yellow fill-splat-yellow scale-110' : 'text-gray-200'}`} size={28} strokeWidth={2.5} />
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input placeholder="店家或地點 (可貼地圖)" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-white border-[3px] border-splat-dark rounded-2xl font-bold text-sm outline-none" />
                </div>

                <textarea placeholder="寫下那口美味進入靈魂的瞬間..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full p-4 bg-white border-[3px] border-splat-dark rounded-2xl font-bold text-sm outline-none h-32 resize-none" />
              </div>

              <button onClick={handleSave} className="btn-splat w-full py-5 bg-splat-orange text-white text-xl shadow-[6px_6px_0px_#1A1A1A]">
                收藏這份美味 ➔
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- 拍立得卡片子組件 ---
const PolaroidCard = ({ item, index, onDelete, onClick }: { item: JournalItem, index: number, onDelete: (e: any) => void, onClick: () => void }) => {
  // 隨機傾斜角度，讓介面看起來更像亂放在桌上的照片
  const rotation = useMemo(() => (index % 2 === 0 ? -2 : 2) + (Math.random() * 2 - 1), [index]);

  return (
    <motion.div
      layout
      layoutId={`card-${item.id}`}
      initial={{ scale: 0.8, opacity: 0, rotate: 0 }}
      animate={{ scale: 1, opacity: 1, rotate: rotation }}
      exit={{ scale: 0.5, opacity: 0 }}
      whileHover={{ rotate: 0, scale: 1.05, zIndex: 10 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="bg-white p-3 pb-6 border-[3px] border-splat-dark shadow-splat-solid-sm cursor-pointer relative"
    >
      <div className="aspect-square bg-gray-50 border-2 border-splat-dark mb-3 overflow-hidden relative">
        <LazyImage src={item.images[0]} containerClassName="w-full h-full" alt="food" />
        {item.images.length > 1 && (
          <div className="absolute top-2 right-2 bg-splat-dark text-white text-[8px] px-1.5 py-0.5 rounded-md font-black">
            +{item.images.length - 1}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h4 className="font-black text-sm text-splat-dark truncate pr-4">{item.title}</h4>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={8} fill={i < item.rating ? "#FFC000" : "none"} stroke={i < item.rating ? "#FFC000" : "#E5E7EB"} strokeWidth={3} />
          ))}
        </div>
      </div>

      <button
        onClick={onDelete}
        className="absolute bottom-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity border border-red-100"
      >
        <Trash2 size={12} strokeWidth={3} />
      </button>
    </motion.div>
  );
};




