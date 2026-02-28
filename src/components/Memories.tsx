import { useState, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
    Sparkles, Camera, Utensils, ShoppingBag,
    CreditCard, Calendar, Star, MapPin,
    Plus, ChevronRight, Share2, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { JournalItem, ShoppingItem, ExpenseItem } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useTranslation } from '../hooks/useTranslation';

// --- 動態郵戳圖示映射 ---
const CATEGORY_STAMPS: Record<string, string> = {
    '餐飲': '🍽️',
    '購物': '🛍️',
    '交通': '🚗',
    '住宿': '🏨',
    '娛樂': '🎡',
    '藥妝': '💊',
    '便利商店': '🏪',
    '超市': '🛒',
    '其他': '✨'
};

type StreamItem =
    | (JournalItem & { _type: 'journal' })
    | (ShoppingItem & { _type: 'shopping', date: string })
    | (ExpenseItem & { _type: 'expense' });

export const Memories = () => {
    const { t } = useTranslation();
    const { trips, currentTripId, addJournalItem } = useTripStore();
    const trip = trips.find(t => t.id === currentTripId);

    // 1. 數據彙整與排序
    const stream = useMemo(() => {
        if (!trip) return [];

        // 日誌項目
        const journals = (trip.journals || []).map(j => ({
            ...j,
            _type: 'journal' as const,
            displayAmount: j.cost
        }));

        // 已購商品
        const shoppings = (trip.shoppingList || [])
            .filter(s => s.isBought)
            .map(s => ({
                ...s,
                _type: 'shopping' as const,
                date: s.updatedAt ? format(new Date(s.updatedAt), 'yyyy-MM-dd') : trip.startDate,
                displayAmount: s.price * (s.quantity || 1)
            }));

        // 花費項目
        const expenses = (trip.expenses || []).map(e => ({
            ...e,
            _type: 'expense' as const,
            displayAmount: e.amount
        }));

        return [...journals, ...shoppings, ...expenses].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
    }, [trip?.journals, trip?.items, trip?.expenses, trip?.startDate]);

    if (!trip) return null;

    return (
        <div className="px-5 pb-32 pt-4 bg-[#F4F5F7] h-full overflow-y-auto hide-scrollbar relative">

            {/* 墨水莖 (Central Ink Stem) - P3 廣色域效果 */}
            <div
                className="absolute left-[34px] top-0 bottom-0 w-[2px] z-0 opacity-10"
                style={{
                    background: 'linear-gradient(to bottom, var(--p3-navy), var(--p3-ruby), var(--p3-gold))'
                }}
            />

            {/* Header */}
            <div className="flex justify-between items-end mb-10 pl-2 relative z-10">
                <div>
                    <h2 className="text-3xl font-black text-p3-navy italic tracking-tighter uppercase leading-none">{t('memories.title')}</h2>
                    <p className="text-[10px] font-black text-gray-400 mt-2 tracking-[0.2em] uppercase">{t('memories.subtitle')}</p>
                </div>
                <button
                    onClick={() => triggerHaptic('medium')}
                    className="w-12 h-12 rounded-2xl bg-white border-[0.5px] border-p3-navy shadow-glass-deep-sm flex items-center justify-center text-p3-navy active:translate-y-1 transition-all"
                >
                    <Camera size={24} strokeWidth={2.5} />
                </button>
            </div>

            {/* Stream Flow */}
            <div className="space-y-12 relative z-10">
                {stream.length > 0 ? (
                    stream.map((item, idx) => (
                        <MemoryCard key={item.id} item={item} index={idx} t={t} />
                    ))
                ) : (
                    <div className="py-20 text-center bg-white border-[0.5px] border-dashed border-gray-300 rounded-[40px] text-gray-400 font-bold italic">
                        {t('memories.emptyStream')}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 子組件: Polaroid Card ---
const MemoryCard = ({ item, index, t }: { item: StreamItem, index: number, t: (key: string) => string }) => {
    const isJournal = item._type === 'journal';
    const isShopping = item._type === 'shopping';
    const isExpense = item._type === 'expense';

    // 取得封面圖與標籤回饋
    let image = '';
    let emblem = '';
    let accentColor = 'bg-p3-navy';

    if (isJournal) {
        image = item.images?.[0] || '';
        emblem = '📝';
        accentColor = 'bg-p3-gold';
    } else if (isShopping) {
        image = item.images?.[0] || '';
        emblem = '🛍️';
        accentColor = 'bg-p3-ruby';
    } else if (isExpense) {
        image = item.images?.[0] || '';
        emblem = CATEGORY_STAMPS[item.category] || '💰';
        accentColor = 'bg-p3-navy/60';
    }

    const rotation = useMemo(() => (index % 2 === 0 ? -1 : 1.5) + (Math.random() * 2 - 1), [index]);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex items-start gap-6 group"
        >
            {/* Date Marker & Connection Dot */}
            <div className="mt-8 shrink-0 relative z-10">
                <div className={`w-5 h-5 rounded-full border-[0.5px] border-white shadow-md ring-4 ring-offset-0 ring-[rgba(0,0,0,0.05)] ${accentColor}`} />
            </div>

            {/* Polaroid Container */}
            <motion.div
                style={{ rotate: rotation }}
                className="bg-white p-3 pb-10 rounded-sm shadow-glass-deep w-full border-[0.5px] border-black/5"
            >
                {/* Photo Slot */}
                <div className="aspect-[4/3] bg-gray-50 rounded-sm overflow-hidden border-[0.5px] border-black/5 relative mb-4">
                    {image ? (
                        <img src={image} className="w-full h-full object-cover grayscale-[0.1] hover:grayscale-0 transition-all duration-1000" alt="memory" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                            <div className="text-[60px] opacity-10 filter grayscale select-none">{emblem}</div>
                            <p className="text-[10px] font-black text-gray-200 uppercase tracking-widest mt-2 italic">{t('memories.capturedMoment')}</p>
                        </div>
                    )}

                    {/* Post-it Note Badge */}
                    <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-md rounded border border-gray-200 shadow-sm">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                            {isJournal ? t('memories.journal') : isShopping ? t('memories.purchase') : t('memories.expense')}
                        </span>
                    </div>
                </div>

                {/* Caption Area (Handwriting Feel) */}
                <div className="px-1 space-y-1">
                    <div className="flex justify-between items-baseline">
                        <h4 className="font-black text-sm text-p3-navy truncate flex-1 pr-4">{item.title}</h4>
                        <span className="text-[10px] font-bold text-gray-400 italic">
                            {format(parseISO(item.date), 'MMM dd')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1">
                            {isJournal && (
                                <div className="flex gap-1">
                                    {Array.from({ length: item.rating }).map((_, i) => (
                                        <Star key={i} size={10} className="fill-p3-gold text-p3-gold" />
                                    ))}
                                </div>
                            )}
                            {isExpense && (
                                <p className="text-[10px] font-black text-p3-navy/80 uppercase">
                                    {t('memories.cashFlow')}: ¥{(item as any).displayAmount?.toLocaleString()}
                                </p>
                            )}
                            {isShopping && (
                                <p className="text-[10px] font-black text-p3-ruby uppercase">
                                    {t('memories.pickedUpAt')} {(item as any).storeName || t('memories.store')} (¥{(item as any).displayAmount?.toLocaleString()})
                                </p>
                            )}
                            {isJournal && (item as any).displayAmount && (
                                <p className="text-[10px] font-black text-p3-gold uppercase">
                                    {t('memories.cost')}: ¥{(item as any).displayAmount?.toLocaleString()}
                                </p>
                            )}
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-200 hover:text-p3-navy transition-colors"
                        >
                            <Heart size={14} />
                        </motion.button>
                    </div>
                </div>

                {/* Logical Binding Trigger (Optional Mini Button) */}
                {isExpense && item.category === '餐飲' && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 w-full py-2 bg-p3-navy/5 border-[0.5px] border-dashed border-p3-navy/20 rounded-xl flex items-center justify-center gap-2 group/btn"
                    >
                        <Sparkles size={12} className="text-p3-navy group-hover/btn:animate-spin" />
                        <span className="text-[10px] font-black text-p3-navy uppercase tracking-wider">{t('memories.addFoodie')}</span>
                    </motion.button>
                )}
            </motion.div>
        </motion.div>
    );
};
