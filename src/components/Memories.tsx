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
    }, [trip]);

    if (!trip) return null;

    return (
        <div className="px-5 pb-32 pt-4 bg-[#F4F5F7] h-full overflow-y-auto hide-scrollbar relative">

            {/* 墨水莖 (Central Ink Stem) - P3 廣色域效果 */}
            <div
                className="absolute left-[34px] top-0 bottom-0 w-[4px] z-0 opacity-20"
                style={{
                    background: 'linear-gradient(to bottom, color(display-p3 0.16 0.2 0.81), color(display-p3 0.94 0.24 0.41), color(display-p3 1 0.75 0))'
                }}
            />

            {/* Header */}
            <div className="flex justify-between items-end mb-10 pl-2 relative z-10">
                <div>
                    <h2 className="text-3xl font-black text-splat-dark italic tracking-tighter uppercase leading-none">The Stream</h2>
                    <p className="text-[10px] font-black text-gray-400 mt-2 tracking-[0.2em] uppercase">Life Chronicles v1.0</p>
                </div>
                <button
                    onClick={() => triggerHaptic('medium')}
                    className="w-12 h-12 rounded-2xl bg-white border-[3px] border-splat-dark shadow-splat-solid-sm flex items-center justify-center text-splat-dark active:translate-y-1 transition-all"
                >
                    <Camera size={24} strokeWidth={2.5} />
                </button>
            </div>

            {/* Stream Flow */}
            <div className="space-y-12 relative z-10">
                {stream.length > 0 ? (
                    stream.map((item, idx) => (
                        <MemoryCard key={item.id} item={item} index={idx} />
                    ))
                ) : (
                    <div className="py-20 text-center bg-white border-[3px] border-dashed border-gray-300 rounded-[40px] text-gray-400 font-bold italic">
                        開始記錄旅行中的點滴吧... ✨
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 子組件: Polaroid Card ---
const MemoryCard = ({ item, index }: { item: StreamItem, index: number }) => {
    const isJournal = item._type === 'journal';
    const isShopping = item._type === 'shopping';
    const isExpense = item._type === 'expense';

    // 取得封面圖與標籤回饋
    let image = '';
    let emblem = '';
    let accentColor = 'bg-splat-blue';

    if (isJournal) {
        image = item.images?.[0] || '';
        emblem = '📝';
        accentColor = 'bg-splat-orange';
    } else if (isShopping) {
        image = item.images?.[0] || '';
        emblem = '🛍️';
        accentColor = 'bg-splat-pink';
    } else if (isExpense) {
        image = item.images?.[0] || '';
        emblem = CATEGORY_STAMPS[item.category] || '💰';
        accentColor = 'bg-splat-green';
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
                <div className={`w-5 h-5 rounded-full border-[3px] border-white shadow-md ring-4 ring-offset-0 ring-[rgba(0,0,0,0.05)] ${accentColor}`} />
            </div>

            {/* Polaroid Container */}
            <motion.div
                style={{ rotate: rotation }}
                className="bg-white p-3 pb-8 rounded-sm border-[1px] border-gray-200 shadow-xl w-full"
            >
                {/* Photo Slot */}
                <div className="aspect-[4/3] bg-gray-100 rounded-sm overflow-hidden border-[1px] border-gray-100 relative mb-4">
                    {image ? (
                        <img src={image} className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700" alt="memory" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px]">
                            <div className="text-[60px] opacity-20 filter blur-[1px] select-none">{emblem}</div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-2 italic">AI Memory Stamp</p>
                        </div>
                    )}

                    {/* Post-it Note Badge */}
                    <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-md rounded border border-gray-200 shadow-sm">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                            {isJournal ? 'Journal' : isShopping ? 'Purchase' : 'Expense'}
                        </span>
                    </div>
                </div>

                {/* Caption Area (Handwriting Feel) */}
                <div className="px-1 space-y-1">
                    <div className="flex justify-between items-baseline">
                        <h4 className="font-black text-sm text-splat-dark truncate flex-1 pr-4">{item.title}</h4>
                        <span className="text-[10px] font-bold text-gray-400 italic">
                            {format(parseISO(item.date), 'MMM dd')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1">
                            {isJournal && (
                                <div className="flex gap-1">
                                    {Array.from({ length: item.rating }).map((_, i) => (
                                        <Star key={i} size={10} className="fill-splat-yellow text-splat-yellow" />
                                    ))}
                                </div>
                            )}
                            {isExpense && (
                                <p className="text-[10px] font-black text-splat-green uppercase">
                                    Cash Flow: ¥{(item as any).displayAmount?.toLocaleString()}
                                </p>
                            )}
                            {isShopping && (
                                <p className="text-[10px] font-black text-splat-pink uppercase">
                                    Picked up at {(item as any).storeName || 'Store'} (¥{(item as any).displayAmount?.toLocaleString()})
                                </p>
                            )}
                            {isJournal && (item as any).displayAmount && (
                                <p className="text-[10px] font-black text-splat-orange uppercase">
                                    Cost: ¥{(item as any).displayAmount?.toLocaleString()}
                                </p>
                            )}
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-200 hover:text-splat-dark transition-colors"
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
                        className="mt-6 w-full py-2 bg-splat-blue/5 border-2 border-dashed border-splat-blue/20 rounded-lg flex items-center justify-center gap-2 group/btn"
                    >
                        <Sparkles size={12} className="text-splat-blue group-hover/btn:animate-spin" />
                        <span className="text-[10px] font-black text-splat-blue uppercase">Add foodie memory for this?</span>
                    </motion.button>
                )}
            </motion.div>
        </motion.div>
    );
};
