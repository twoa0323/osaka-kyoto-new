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
    const { trips, currentTripId, toggleShoppingItem, openAiAssistant, addJournalItem, addExpenseItem, addShoppingItem } = useTripStore();
    const trip = trips.find(t => t.id === currentTripId);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeEditor, setActiveEditor] = useState<'food' | 'purchase' | null>(null);

    // 1. 數據彙整與排序 (現在包含未購買項目)
    const stream = useMemo(() => {
        if (!trip) return [];

        const journals = (trip.journals || []).map(j => ({
            ...j,
            _type: 'journal' as const,
            displayAmount: j.cost
        }));

        const shoppings = (trip.shoppingList || [])
            .map(s => ({
                ...s,
                _type: 'shopping' as const,
                date: s.updatedAt ? format(new Date(s.updatedAt), 'yyyy-MM-dd') : trip.startDate,
                displayAmount: s.price * (s.quantity || 1)
            }));

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
    }, [trip?.journals, trip?.shoppingList, trip?.expenses, trip?.startDate]);

    if (!trip) return null;

    return (
        <div className="px-4 pb-40 pt-4 bg-[#F4F5F7] min-h-full overflow-y-auto hide-scrollbar relative">
            {/* 墨水莖 */}
            <div
                className="absolute left-[24px] top-0 bottom-0 w-[1px] z-0 opacity-10"
                style={{
                    background: 'linear-gradient(to bottom, var(--p3-navy), var(--p3-ruby), var(--p3-gold))'
                }}
            />

            {/* Header */}
            <div className="flex justify-between items-end mb-10 pl-2 relative z-10 mr-1">
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

            {/* Magazine Masonry Layout */}
            <div className="columns-1 md:columns-2 gap-4 space-y-4 relative z-10 px-1">
                {stream.length > 0 ? (
                    stream.map((item, idx) => (
                        <div key={item.id} className="break-inside-avoid">
                            <MemoryCard
                                item={item}
                                index={idx}
                                t={t}
                                onToggle={() => toggleShoppingItem(trip.id, item.id)}
                            />
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center bg-white border-[0.5px] border-dashed border-gray-300 rounded-[40px] text-gray-400 font-bold italic w-full col-span-full">
                        {t('memories.emptyStream')}
                    </div>
                )}
            </div>

            {/* Unified Entry FAB (Unified + Button) */}
            <div className="fixed bottom-24 right-6 z-50">
                <AnimatePresence>
                    {isMenuOpen && (
                        <div className="absolute bottom-16 right-0 space-y-3 flex flex-col items-end">
                            <MenuOption
                                icon={<Utensils size={18} />}
                                label="Log Food"
                                color="bg-p3-gold"
                                onClick={() => { setActiveEditor('food'); setIsMenuOpen(false); }}
                                delay={0.1}
                            />
                            <MenuOption
                                icon={<ShoppingBag size={18} />}
                                label="Add Purchase"
                                color="bg-p3-ruby"
                                onClick={() => { setActiveEditor('purchase'); setIsMenuOpen(false); }}
                                delay={0.05}
                            />
                        </div>
                    )}
                </AnimatePresence>

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        setIsMenuOpen(!isMenuOpen);
                        triggerHaptic('medium');
                    }}
                    className={`w-14 h-14 rounded-full shadow-glass-deep flex items-center justify-center text-white transition-colors ${isMenuOpen ? 'bg-gray-800 rotate-45' : 'bg-p3-navy'}`}
                >
                    <Plus size={28} />
                </motion.button>
            </div>

            {/* Quick Editor Modals (Placeholders for real implementation) */}
            <AnimatePresence>
                {activeEditor && (
                    <QuickEditor
                        type={activeEditor}
                        onClose={() => setActiveEditor(null)}
                        tripId={trip.id}
                        t={t}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- 配件: Menu Option ---
const MenuOption = ({ icon, label, color, onClick, delay }: any) => (
    <motion.button
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.9 }}
        transition={{ delay }}
        onClick={onClick}
        className="flex items-center gap-3 pr-1 group"
    >
        <span className="text-[11px] font-black text-p3-navy uppercase tracking-widest bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
            {label}
        </span>
        <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg`}>
            {icon}
        </div>
    </motion.button>
);

// --- 配件: Quick Editor ---
const QuickEditor = ({ type, onClose, tripId, t }: any) => {
    const [title, setTitle] = useState('');
    const { addJournalItem, addShoppingItem, showToast } = useTripStore();

    const handleSave = () => {
        if (!title.trim()) return;

        if (type === 'food') {
            addJournalItem(tripId, {
                id: `j-${Date.now()}`,
                date: format(new Date(), 'yyyy-MM-dd'),
                title,
                content: '',
                images: [],
                rating: 5,
                location: '',
                updatedAt: Date.now()
            });
        } else {
            addShoppingItem(tripId, {
                id: `s-${Date.now()}`,
                title,
                price: 0,
                quantity: 1,
                currency: 'JPY',
                isBought: false,
                images: [],
                note: '',
                category: '其他',
                updatedAt: Date.now()
            });
        }

        showToast(type === 'food' ? "Food logged! 🦑" : "Purchase added! 🛍️", "success");
        onClose();
        triggerHaptic('success');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-p3-navy/40 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white/90 w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-white/40"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-p3-navy tracking-tighter uppercase italic">
                        {type === 'food' ? t('wallet.entryTitle') : t('vault.addScan')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black">
                        <Plus className="rotate-45" size={24} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                            {t('booking.titleLabel') || 'Title'}
                        </label>
                        <input
                            autoFocus
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={type === 'food' ? "What did you eat?" : "What did you buy?"}
                            className="w-full bg-gray-100/50 border-none rounded-2xl px-5 py-4 font-bold text-p3-navy focus:ring-2 ring-p3-navy/10 placeholder:text-gray-300"
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-5 bg-p3-navy text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all"
                    >
                        {t('common.saveConfirm')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- 子組件: Polaroid Card ---
const MemoryCard = ({ item, index, t, onToggle }: { item: StreamItem, index: number, t: (key: string) => string, onToggle: () => void }) => {
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
        accentColor = item.isBought ? 'bg-p3-ruby' : 'bg-gray-300';
    } else if (isExpense) {
        image = item.images?.[0] || '';
        emblem = CATEGORY_STAMPS[item.category] || '💰';
        accentColor = 'bg-p3-navy/60';
    }

    const rotation = useMemo(() => (index % 2 === 0 ? -1 : 1.5) + (Math.random() * 2 - 1), [index]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="mb-8 relative group"
        >
            {/* Polaroid Container */}
            <motion.div
                style={{ rotate: rotation }}
                className="bg-white p-3 pb-8 rounded-sm shadow-glass-deep w-full border-[0.5px] border-black/5 relative overflow-hidden"
            >
                {/* Ink Splat Checkbox for Shopping */}
                {isShopping && !item.isBought && (
                    <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => {
                            onToggle();
                            triggerHaptic('success');
                        }}
                        className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-p3-ruby/10 border-2 border-p3-ruby/30 flex items-center justify-center text-p3-ruby overflow-hidden"
                    >
                        <ShoppingBag size={18} />
                        <span className="absolute inset-0 bg-p3-ruby opacity-0 active:opacity-20 transition-opacity" />
                    </motion.button>
                )}

                {/* Embossed Ink Stamp Overlay for Bought Items */}
                {isShopping && item.isBought && (
                    <motion.div
                        initial={{ opacity: 0, scale: 2 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        className="absolute -top-2 -right-2 z-30 pointer-events-none"
                    >
                        <div className="w-20 h-20 rounded-full border-4 border-p3-ruby/40 flex items-center justify-center rotate-12 bg-white/20 backdrop-blur-sm shadow-inner">
                            <span className="text-[10px] font-black text-p3-ruby uppercase tracking-tighter leading-tight text-center">
                                PAID<br />STAMPED
                            </span>
                        </div>
                    </motion.div>
                )}

                {/* Photo Slot */}
                <div className={`rounded-sm overflow-hidden border-[0.5px] border-black/5 relative mb-4 ${isJournal && !image ? 'aspect-square' : 'aspect-[4/3]'} bg-gray-50`}>
                    {image ? (
                        <img src={image} className="w-full h-full object-cover grayscale-[0.1] hover:grayscale-0 transition-all duration-1000" alt="memory" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                            <div className="text-[48px] opacity-10 filter grayscale select-none">{emblem}</div>
                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-2 italic">{t('memories.capturedMoment')}</p>
                        </div>
                    )}

                    {/* Category Label */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur-md rounded border border-gray-200 shadow-sm">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em]">
                            {isJournal ? t('memories.journal') : isShopping ? t('memories.purchase') : t('memories.expense')}
                        </span>
                    </div>
                </div>

                {/* Caption Area */}
                <div className="px-1 space-y-1">
                    <div className="flex justify-between items-start">
                        <h4 className="font-black text-[13px] text-p3-navy line-clamp-2 leading-tight flex-1 pr-2">{item.title}</h4>
                        <span className="text-[9px] font-bold text-gray-400 italic shrink-0">
                            {format(parseISO(item.date), 'MMM dd')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1">
                            {isJournal && (
                                <div className="flex gap-0.5">
                                    {Array.from({ length: item.rating }).map((_, i) => (
                                        <Star key={i} size={8} className="fill-p3-gold text-p3-gold" />
                                    ))}
                                </div>
                            )}
                            {isExpense && (
                                <p className="text-[9px] font-black text-p3-navy/80 uppercase">
                                    ¥{(item as any).displayAmount?.toLocaleString()}
                                </p>
                            )}
                            {isShopping && (
                                <p className={`text-[9px] font-black uppercase ${item.isBought ? 'text-p3-ruby' : 'text-gray-400'}`}>
                                    {item.isBought ? '✓ ' : ''}¥{(item as any).displayAmount?.toLocaleString()}
                                </p>
                            )}
                        </div>

                        {/* AI Magic Refine Button for Journal */}
                        {isJournal && (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerHaptic('medium');
                                    // Placeholder for AI Refine
                                }}
                                className="w-7 h-7 rounded-full bg-p3-gold/10 flex items-center justify-center text-p3-gold border border-p3-gold/20 hover:bg-p3-gold hover:text-white transition-all shadow-sm"
                            >
                                <Sparkles size={12} />
                            </motion.button>
                        )}

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-200 hover:text-p3-navy transition-colors shadow-sm"
                        >
                            <Heart size={12} />
                        </motion.button>
                    </div>
                </div>

                {/* Logical Binding Trigger */}
                {isExpense && item.category === '餐飲' && (
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="mt-4 w-full py-2 bg-p3-navy/5 border-[0.5px] border-dashed border-p3-navy/20 rounded-xl flex items-center justify-center gap-2 group/btn"
                    >
                        <Sparkles size={10} className="text-p3-navy group-hover/btn:animate-spin" />
                        <span className="text-[9px] font-black text-p3-navy uppercase tracking-wider">{t('memories.addFoodie')}</span>
                    </motion.button>
                )}
            </motion.div>
        </motion.div>
    );
};
