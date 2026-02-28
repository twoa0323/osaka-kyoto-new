import { useState, useMemo, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
    Sparkles, Camera, Utensils, ShoppingBag,
    CreditCard, Calendar, Star, MapPin,
    Plus, ChevronRight, Share2, Heart, X,
    Edit2, Trash2, CheckCircle2, Info, Receipt,
    ChevronDown, ChevronUp, ExternalLink, Image as ImageIcon, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { JournalItem, ShoppingItem, ExpenseItem } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useTranslation } from '../hooks/useTranslation';
import { uploadImage } from '../utils/imageUtils';

// --- Types ---
type MemoryGroup = {
    id: string;
    title: string;
    date: string;
    latestTimestamp: number;
    images: string[];
    totalExpense: number;
    items: Array<
        | (JournalItem & { _type: 'journal' })
        | (ShoppingItem & { _type: 'shopping' })
        | (ExpenseItem & { _type: 'expense' })
    >;
};

export const Memories = () => {
    const { t } = useTranslation();
    const {
        trips, currentTripId, toggleShoppingItem,
        deleteJournalItem, deleteExpenseItem, deleteShoppingItem,
        updateJournalItem, updateExpenseItem, updateShoppingItem,
        showToast
    } = useTripStore();
    const trip = trips.find(t => t.id === currentTripId);

    const [filter, setFilter] = useState<'all' | 'food' | 'shopping'>('all');
    const [selectedGroup, setSelectedGroup] = useState<MemoryGroup | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeEditor, setActiveEditor] = useState<'food' | 'purchase' | null>(null);
    const [isUploadingImg, setIsUploadingImg] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Data Aggregation Logic (Auto-Grouping)
    const groupedMemories = useMemo(() => {
        if (!trip) return [];

        const groups: Record<string, MemoryGroup> = {};

        // Merge all source data
        const allItems = [
            ...(trip.journals || []).map(j => ({ ...j, _type: 'journal' as const })),
            ...(trip.expenses || []).map(e => ({ ...e, _type: 'expense' as const })),
            ...(trip.shoppingList || []).map(s => ({ ...s, _type: 'shopping' as const, location: s.location || s.storeName || 'Other' }))
        ];

        allItems.forEach(item => {
            const locKey = (item as any).location || (item as any).storeName || 'Other';
            const timestamp = (item as any).updatedAt || new Date((item as any).date || trip.startDate).getTime();

            if (!groups[locKey]) {
                groups[locKey] = {
                    id: `group-${locKey}`,
                    title: locKey,
                    date: (item as any).date || trip.startDate,
                    latestTimestamp: timestamp,
                    images: [],
                    totalExpense: 0,
                    items: []
                };
            }

            const group = groups[locKey];
            group.items.push(item as any);

            // Collect images
            if (item.images && item.images.length > 0) {
                group.images.push(...item.images);
            }

            // Accumulate expenses
            if (item._type === 'expense') {
                group.totalExpense += item.amount;
            } else if (item._type === 'journal' && item.cost) {
                group.totalExpense += item.cost;
            } else if (item._type === 'shopping' && item.isBought) {
                group.totalExpense += (item.price * item.quantity);
            }

            // Update latest date/timestamp
            if (timestamp > group.latestTimestamp) {
                group.latestTimestamp = timestamp;
                group.date = (item as any).date || group.date;
            }
        });

        const results = Object.values(groups).sort((a, b) => b.latestTimestamp - a.latestTimestamp);

        // Apply filters
        if (filter === 'food') {
            return results.filter(g => g.items.some(i => i._type === 'journal' || (i._type === 'expense' && i.category === '餐飲')));
        }
        if (filter === 'shopping') {
            return results.filter(g => g.items.some(i => i._type === 'shopping' || (i._type === 'expense' && i.category === '購物')));
        }
        return results;
    }, [trip, filter]);

    const handleCameraClick = () => {
        triggerHaptic('medium');
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setIsUploadingImg(true);
            showToast(`Processing ${files.length} images... 📸`, 'info');
            try {
                // For Memories main camera, we just log the URLs or we could potentially add them to a "ghost" journal
                for (const file of Array.from(files)) {
                    const url = await uploadImage(file);
                    console.log("Uploaded memory image:", url);
                }
                showToast(`Success! Images uploaded to Cloudinary.`, 'success');
            } catch (err) {
                console.error("Multi-upload failed", err);
                showToast("Upload failed", "error");
            } finally {
                setIsUploadingImg(false);
            }
        }
    };

    if (!trip) return null;

    return (
        <div className="px-4 pb-40 pt-4 bg-[#F4F5F7] min-h-full overflow-y-auto hide-scrollbar relative">
            {/* Header & Camera */}
            <div className="flex justify-between items-end mb-6 pl-2 relative z-20">
                <div>
                    <h2 className="text-3xl font-black text-p3-navy italic tracking-tighter uppercase leading-none">{t('memories.title')}</h2>
                    <p className="text-[10px] font-black text-gray-400 mt-2 tracking-[0.2em] uppercase">{t('memories.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept="image/*"
                        className="hidden"
                    />
                    <button
                        onClick={handleCameraClick}
                        disabled={isUploadingImg}
                        className="w-12 h-12 rounded-2xl bg-white border-[0.5px] border-p3-navy shadow-glass-deep-sm flex items-center justify-center text-p3-navy active:translate-y-1 transition-all disabled:opacity-50"
                    >
                        {isUploadingImg ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} strokeWidth={2.5} />}
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex gap-2 mb-8 sticky top-0 z-30 bg-[#F4F5F7]/80 backdrop-blur-xl py-2 -mx-4 px-4 overflow-x-auto hide-scrollbar">
                {[
                    { id: 'all', label: 'All', icon: <Sparkles size={14} /> },
                    { id: 'food', label: 'Food', icon: <Utensils size={14} /> },
                    { id: 'shopping', label: 'Shopping', icon: <ShoppingBag size={14} /> }
                ].map((btn) => (
                    <button
                        key={btn.id}
                        onClick={() => { setFilter(btn.id as any); triggerHaptic('light'); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${filter === btn.id
                            ? 'bg-p3-navy text-white shadow-xl scale-105'
                            : 'bg-white/50 text-gray-400 border border-black/5 hover:bg-white'
                            }`}
                    >
                        {btn.icon}
                        {btn.label}
                    </button>
                ))}
            </div>

            {/* Location Cards Feed */}
            <div className="space-y-6 relative z-10">
                {groupedMemories.length > 0 ? (
                    groupedMemories.map((group, idx) => (
                        <LocationCard
                            key={group.id}
                            group={group}
                            index={idx}
                            onClick={() => { setSelectedGroup(group); triggerHaptic('medium'); }}
                        />
                    ))
                ) : (
                    <div className="py-20 text-center bg-white border-[0.5px] border-dashed border-gray-300 rounded-[40px] text-gray-400 font-bold italic w-full">
                        {t('memories.emptyStream')}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedGroup && (
                    <GroupDetailModal
                        group={selectedGroup}
                        onClose={() => setSelectedGroup(null)}
                        tripId={trip.id}
                    />
                )}
            </AnimatePresence>

            {/* FAB */}
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
                    className={`w-14 h-14 rounded-full shadow-glass-deep flex items-center justify-center text-white transition-all ${isMenuOpen ? 'bg-gray-800 rotate-45' : 'bg-p3-navy'}`}
                >
                    <Plus size={28} />
                </motion.button>
            </div>

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

// --- Component: Location Card ---
const LocationCard = ({ group, index, onClick }: { group: MemoryGroup, index: number, onClick: () => void }) => {
    const mainImage = group.images[0] || null;
    const journalCount = group.items.filter(i => i._type === 'journal').length;
    const shoppingCount = group.items.filter(i => i._type === 'shopping').length;
    const expenseCount = group.items.filter(i => i._type === 'expense').length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={onClick}
            className="group active:scale-[0.98] transition-all cursor-pointer"
        >
            <div className="bg-white rounded-[40px] overflow-hidden shadow-glass-deep border border-black/5 hover:border-p3-navy/20 transition-all">
                {/* Visual Header */}
                <div className="h-56 relative bg-gray-100">
                    {mainImage ? (
                        <img src={mainImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={group.title} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px:20px]">
                            <MapPin size={64} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin size={12} className="text-white/60" />
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{group.date}</span>
                            </div>
                            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase truncate max-w-[200px]">{group.title}</h3>
                        </div>
                        {group.totalExpense > 0 && (
                            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                                <span className="text-[14px] font-black text-white">¥{group.totalExpense.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Bar */}
                <div className="px-8 py-6 flex items-center gap-4">
                    <div className="flex -space-x-3 overflow-hidden">
                        {group.images.slice(1, 4).map((img, i) => (
                            <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-white overflow-hidden">
                                <img src={img} className="h-full w-full object-cover" alt="preview" />
                            </div>
                        ))}
                        {group.images.length > 4 && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ring-2 ring-white">
                                <span className="text-[10px] font-extrabold text-gray-500">+{group.images.length - 4}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 ml-auto">
                        {journalCount > 0 && <Badge icon="📝" count={journalCount} />}
                        {shoppingCount > 0 && <Badge icon="🛍️" count={shoppingCount} color="ruby" />}
                        {expenseCount > 0 && <Badge icon="💰" count={expenseCount} color="navy" />}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const Badge = ({ icon, count, color = 'gold' }: { icon: string, count: number, color?: string }) => {
    const colors: Record<string, string> = {
        gold: 'bg-p3-gold/10 text-p3-gold border-p3-gold/20',
        ruby: 'bg-p3-ruby/10 text-p3-ruby border-p3-ruby/20',
        navy: 'bg-p3-navy/10 text-p3-navy border-p3-navy/20'
    };
    return (
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${colors[color]}`}>
            <span className="text-[10px]">{icon}</span>
            <span className="text-[10px] font-black">{count}</span>
        </div>
    );
};

// --- Component: Detail Modal ---
const GroupDetailModal = ({ group, onClose, tripId }: { group: MemoryGroup, onClose: () => void, tripId: string }) => {
    const {
        deleteJournalItem, deleteExpenseItem, deleteShoppingItem,
        updateJournalItem, updateExpenseItem, updateShoppingItem,
        toggleShoppingItem
    } = useTripStore();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white overflow-y-auto"
        >
            {/* Modal Header/Hero */}
            <div className="h-[40vh] relative">
                {group.images[0] ? (
                    <img src={group.images[0]} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-p3-navy/5 flex items-center justify-center text-p3-navy/10">
                        <MapPin size={100} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />

                <button
                    onClick={onClose}
                    className="absolute top-12 right-6 w-10 h-10 rounded-full bg-white/50 backdrop-blur-md border border-white/40 flex items-center justify-center text-p3-navy active:scale-90 transition-all"
                >
                    <X size={24} />
                </button>

                <div className="absolute bottom-6 left-8 right-8">
                    <div className="flex items-center gap-2 mb-2">
                        <MapPin size={14} className="text-p3-navy/60" />
                        <span className="text-xs font-black text-p3-navy/60 tracking-widest uppercase">{group.date}</span>
                    </div>
                    <h2 className="text-4xl font-black text-p3-navy italic tracking-tighter uppercase leading-tight mb-2">{group.title}</h2>
                    <div className="flex gap-4">
                        {group.totalExpense > 0 && (
                            <div className="bg-p3-navy text-white px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl">
                                <CreditCard size={18} />
                                <span className="text-lg font-black tracking-tight">¥{group.totalExpense.toLocaleString()}</span>
                            </div>
                        )}
                        <button className="bg-white/80 backdrop-blur-md border border-p3-navy/10 h-11 w-11 rounded-2xl flex items-center justify-center text-p3-navy active:scale-95 transition-all">
                            <MapPin size={22} />
                        </button>
                    </div>
                </div>
            </div>

            {/* List Contents */}
            <div className="px-8 pb-32 pt-4 space-y-10">
                {group.items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map((item, i) => (
                    <div key={item.id} className="relative group/item">
                        {item._type === 'journal' && (
                            <DetailJournalCard
                                item={item}
                                onEdit={() => { }}
                                onDelete={() => { deleteJournalItem(tripId, item.id); onClose(); }}
                            />
                        )}
                        {item._type === 'expense' && (
                            <DetailExpenseCard
                                item={item}
                                onEdit={() => { }}
                                onDelete={() => { deleteExpenseItem(tripId, item.id); onClose(); }}
                            />
                        )}
                        {item._type === 'shopping' && (
                            <DetailShoppingCard
                                item={item}
                                onEdit={() => { }}
                                onDelete={() => { deleteShoppingItem(tripId, item.id); onClose(); }}
                                onToggle={() => { toggleShoppingItem(tripId, item.id); }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white to-transparent">
                <button
                    onClick={onClose}
                    className="w-full py-5 bg-p3-navy text-white rounded-[32px] font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all"
                >
                    Back to Feed
                </button>
            </div>
        </motion.div>
    );
};

const DetailJournalCard = ({ item, onEdit, onDelete }: any) => (
    <div className="bg-white border-l-4 border-p3-gold pl-6 py-2">
        <div className="flex justify-between items-start mb-4">
            <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < item.rating ? "fill-p3-gold text-p3-gold" : "text-gray-200"} />
                ))}
            </div>
            <div className="flex gap-4">
                <button onClick={onEdit} className="text-gray-300 hover:text-p3-navy transition-colors"><Edit2 size={16} /></button>
                <button onClick={onDelete} className="text-gray-300 hover:text-p3-ruby transition-colors"><Trash2 size={16} /></button>
            </div>
        </div>
        <p className="text-gray-700 font-medium leading-relaxed italic text-lg mb-4">"{item.content || 'No content yet...'}"</p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {(item.images || []).map((img: string, i: number) => (
                <img key={i} src={img} className="h-40 w-40 object-cover rounded-2xl shadow-sm border border-black/5" />
            ))}
        </div>
        {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
                {item.tags.map((tag: string) => (
                    <span key={tag} className="text-[10px] font-black text-p3-gold/60 uppercase tracking-widest">#{tag}</span>
                ))}
            </div>
        )}
    </div>
);

const DetailExpenseCard = ({ item, onEdit, onDelete }: any) => (
    <div className="bg-gray-50 rounded-[32px] p-6 border border-black/5">
        <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-p3-navy flex items-center justify-center text-white">
                    <Receipt size={24} />
                </div>
                <div>
                    <h4 className="text-lg font-black text-p3-navy uppercase tracking-tight">{item.title}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.method} • {item.category}</p>
                </div>
            </div>
            <div className="flex gap-4">
                <button onClick={onEdit} className="text-gray-300 hover:text-p3-navy transition-colors"><Edit2 size={16} /></button>
                <button onClick={onDelete} className="text-gray-300 hover:text-p3-ruby transition-colors"><Trash2 size={16} /></button>
            </div>
        </div>

        {/* Itemized List */}
        <div className="space-y-4 mb-6">
            {item.items?.map((sub: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center px-2">
                    <span className="text-sm font-bold text-gray-600">{sub.name}</span>
                    <span className="text-sm font-black text-p3-navy">¥{sub.price.toLocaleString()}</span>
                </div>
            ))}
            <div className="h-[0.5px] bg-black/5" />
            <div className="flex justify-between items-center px-2">
                <span className="text-xs font-black text-gray-400 uppercase">Total Transaction</span>
                <span className="text-xl font-black text-p3-navy italic">¥{item.amount.toLocaleString()}</span>
            </div>
        </div>

        {item.images?.length > 0 && (
            <div className="flex gap-3 mt-4">
                {item.images.map((img: string, idx: number) => (
                    <div key={idx} className="relative group/img">
                        <img src={img} className="w-20 h-24 object-cover rounded-xl shadow-sm grayscale-[0.5]" />
                        <div className="absolute inset-0 bg-black/5 hidden group-hover/img:block rounded-xl" />
                    </div>
                ))}
            </div>
        )}
    </div>
);

const DetailShoppingCard = ({ item, onEdit, onDelete, onToggle }: any) => (
    <div className={`rounded-[32px] p-6 border transition-all ${item.isBought ? 'bg-p3-ruby/5 border-p3-ruby/10' : 'bg-white border-black/5 shadow-sm'}`}>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-5">
                <button
                    onClick={() => { onToggle(); triggerHaptic('success'); }}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${item.isBought ? 'bg-p3-ruby border-p3-ruby text-white' : 'border-gray-300'
                        }`}
                >
                    {item.isBought && <CheckCircle2 size={16} />}
                </button>
                <div>
                    <h4 className={`text-lg font-black uppercase tracking-tight ${item.isBought ? 'text-gray-400 line-through decoration-p3-ruby/30' : 'text-p3-navy'}`}>
                        {item.title} x{item.quantity}
                    </h4>
                    <p className="text-[11px] font-black text-p3-ruby uppercase tracking-widest mt-0.5">
                        ¥{(item.price * item.quantity).toLocaleString()} ({item.category})
                    </p>
                </div>
            </div>
            <div className="flex gap-4">
                <button onClick={onEdit} className="text-gray-300 hover:text-p3-navy transition-colors"><Edit2 size={16} /></button>
                <button onClick={onDelete} className="text-gray-300 hover:text-p3-ruby transition-colors"><Trash2 size={16} /></button>
            </div>
        </div>

        {item.note && (
            <div className="mt-4 flex items-start gap-2 bg-black/5 p-3 rounded-2xl">
                <Info size={12} className="text-gray-400 mt-0.5" />
                <p className="text-xs font-bold text-gray-500 italic">{item.note}</p>
            </div>
        )}
    </div>
);

// --- Reuseable Components (from previous Memories.tsx) ---

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

const QuickEditor = ({ type, onClose, tripId, t }: any) => {
    const [title, setTitle] = useState('');
    const [isUploadingImg, setIsUploadingImg] = useState(false);
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
                        disabled={isUploadingImg}
                        className="w-full py-5 bg-p3-navy text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isUploadingImg ? <div className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} /> 上傳中...</div> : t('common.saveConfirm')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
