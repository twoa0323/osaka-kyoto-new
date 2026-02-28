import { useState, useMemo, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
    Wallet as WalletIcon, Coins, Trash2, Camera, BarChart3,
    Store, X, Edit3, ArrowLeft, Info, TrendingUp, Sparkles,
    Repeat, Banknote, CreditCard, PieChart, Plus, Utensils,
    ShoppingBag, Car, Pill, ShoppingCart, Calendar, Home,
    ChevronRight, MapPin, Receipt, Wallet2, CheckCircle2
} from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeableItem } from './Common';
import { useTranslation } from '../hooks/useTranslation';

// --- Constants ---
const CURRENCY_SYMBOLS: Record<string, string> = {
    TWD: 'NT$', JPY: '¥', KRW: '₩', USD: '$', EUR: '€', THB: '฿', GBP: '£', CNY: '¥', HKD: 'HK$', SGD: 'S$', VND: '₫'
};

const CATEGORIES = ['餐飲', '購物', '交通', '住宿', '娛樂', '藥妝', '便利商店', '超市', '其他'];
const METHODS = ['現金', '信用卡', '行動支付', 'IC卡', '其他'];

const CATEGORY_ICONS: Record<string, any> = {
    '餐飲': Utensils, '購物': ShoppingBag, '交通': Car, '住宿': Home,
    '娛樂': Sparkles, '藥妝': Pill, '便利商店': Store, '超市': ShoppingCart, '其他': Coins
};

const METHOD_ICONS: Record<string, any> = {
    '現金': Banknote, '信用卡': CreditCard, '行動支付': Receipt, 'IC卡': Wallet2, '其他': Coins
};

export const Wallet = () => {
    const { t } = useTranslation();
    const {
        trips, currentTripId, exchangeRate,
        addExpenseItem, deleteExpenseItem, updateExpenseItem,
        updateTripData, showToast, setActiveTab: setGlobalActiveTab
    } = useTripStore();
    const trip = trips.find(t => t.id === currentTripId);

    const [activeTab, setActiveTab] = useState<'list' | 'record' | 'stats'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [converterValue, setConverterValue] = useState<string>('');
    const [converterMode, setConverterMode] = useState<'JPY2TWD' | 'TWD2JPY'>('JPY2TWD');
    const [showFoodiePrompt, setShowFoodiePrompt] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const expenses = trip?.expenses || [];
    const rate = exchangeRate || 0.211;

    // --- State: Recording Form ---
    const [form, setForm] = useState<Partial<ExpenseItem>>({
        date: format(new Date(), 'yyyy-MM-dd'),
        currency: trip?.baseCurrency || 'JPY',
        method: '現金',
        amount: 0,
        storeName: '',
        title: '',
        location: '',
        images: [],
        category: '餐飲',
        items: []
    });

    // --- Logic: Data Grouping (Date-Based) ---
    const groupedExpenses = useMemo(() => {
        const groups: Record<string, ExpenseItem[]> = {};
        [...expenses]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .forEach(e => {
                if (!groups[e.date]) groups[e.date] = [];
                groups[e.date].push(e);
            });
        return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    }, [expenses]);

    // --- Logic: Stats Engine ---
    const stats = useMemo(() => {
        const totalTwd = expenses.reduce((s, e) => s + (e.currency === 'TWD' ? e.amount : e.amount * rate), 0);
        const totalForeign = expenses.filter(e => e.currency === (trip?.baseCurrency || 'JPY')).reduce((s, e) => s + e.amount, 0);
        const taxFreeTotal = expenses.filter(e => e.isTaxFree).reduce((s, e) => s + e.amount, 0);

        // 1. Category Dashboard
        const catStats = expenses.reduce((acc, curr) => {
            const val = curr.currency === 'TWD' ? curr.amount : curr.amount * rate;
            acc[curr.category] = (acc[curr.category] || 0) + val;
            return acc;
        }, {} as Record<string, number>);

        const categoryData = Object.entries(catStats).map(([label, value], i) => ({
            label, value, percent: Math.round((value / (totalTwd || 1)) * 100),
            color: ['#FF4B4B', '#2D4B73', '#FFC700', '#00C2FF', '#9E00FF'][i % 5]
        })).sort((a, b) => b.value - a.value);

        // 2. Method Analytics
        const methodStats = expenses.reduce((acc, curr) => {
            const val = curr.currency === 'TWD' ? curr.amount : curr.amount * rate;
            acc[curr.method] = (acc[curr.method] || 0) + val;
            return acc;
        }, {} as Record<string, number>);

        const methodData = Object.entries(methodStats).map(([label, value]) => ({
            label, value, percent: Math.round((value / (totalTwd || 1)) * 100)
        })).sort((a, b) => b.value - a.value);

        // 3. Daily Trend
        const trendStats = expenses.reduce((acc, curr) => {
            const val = curr.currency === 'TWD' ? curr.amount : curr.amount * rate;
            acc[curr.date] = (acc[curr.date] || 0) + val;
            return acc;
        }, {} as Record<string, number>);

        const trendData = Object.entries(trendStats).map(([date, value]) => ({
            date, value
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { totalTwd, totalForeign, taxFreeTotal, categoryData, methodData, trendData };
    }, [expenses, rate, trip?.baseCurrency]);

    const convertedValue = useMemo(() => {
        const val = parseFloat(converterValue) || 0;
        if (converterMode === 'JPY2TWD') return (val * rate).toFixed(0);
        return (val / rate).toFixed(0);
    }, [converterValue, converterMode, rate]);

    const handleSave = () => {
        if (!form.amount || !form.title) return showToast(t('wallet.incompleteInfo'), "error");

        const item: ExpenseItem = {
            id: editingId || Date.now().toString(),
            date: form.date!,
            storeName: form.storeName || '',
            title: form.title!,
            amount: Number(form.amount),
            currency: (form.currency || trip?.baseCurrency || 'JPY') as CurrencyCode,
            method: (form.method || '現金') as any,
            location: form.location || '',
            payerId: 'Admin',
            splitWith: [],
            images: form.images || [],
            category: form.category as any,
            items: form.items || [],
            isTaxFree: !!form.isTaxFree
        };

        if (editingId) {
            updateExpenseItem(trip!.id, editingId, item);
        } else {
            addExpenseItem(trip!.id, item);
        }

        triggerHaptic('medium');
        setEditingId(null);
        setForm({ date: format(new Date(), 'yyyy-MM-dd'), currency: trip?.baseCurrency || 'JPY', method: '現金', amount: 0, storeName: '', title: '', location: '', images: [], category: '餐飲', items: [] });
        showToast(t('wallet.saveSuccess'), "success");

        if (item.category === '餐飲' && !editingId) {
            setShowFoodiePrompt(true);
        } else {
            setActiveTab('list');
        }
    };

    if (!trip) return null;

    return (
        <div className="px-5 space-y-7 pb-40 pt-4 bg-[#F4F5F7] min-h-full overflow-y-auto hide-scrollbar relative">

            {/* --- Hero Dashboard --- */}
            <div className="bg-splat-yellow border-[0.5px] border-p3-navy glass-card p-7 shadow-glass-deep relative overflow-hidden group">
                <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Banknote size={16} className="text-p3-navy/60" />
                            <p className="text-[10px] font-black uppercase text-p3-navy/60 tracking-widest italic">{t('wallet.currentExp')}</p>
                        </div>
                        <h2 className="text-4xl font-black text-p3-navy tracking-tighter">
                            NT$ {Math.round(stats.totalTwd).toLocaleString()}
                        </h2>
                        <div className="flex items-center gap-3 pt-2">
                            <div className="px-3 py-1 bg-white/40 rounded-full border border-p3-navy/10 text-[10px] font-black text-p3-navy uppercase">
                                {trip.baseCurrency} {Math.round(stats.totalForeign).toLocaleString()}
                            </div>
                            <div className="text-[10px] font-black text-p3-navy/30 italic uppercase tracking-widest">
                                Rate: {rate.toFixed(4)}
                            </div>
                        </div>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setActiveTab('stats'); triggerHaptic('medium'); }}
                        className="w-14 h-14 bg-white border-[0.5px] border-p3-navy rounded-2xl shadow-glass-deep-sm flex items-center justify-center text-p3-navy active:translate-y-1 transition-all"
                    >
                        <BarChart3 size={28} strokeWidth={2.5} />
                    </motion.button>
                </div>
            </div>

            {/* --- Tax-Free Sentinel --- */}
            <div className="glass-card p-5 shadow-glass-soft relative overflow-hidden border-[0.5px] border-white/40 bg-white/40">
                <div className="flex justify-between items-end mb-4">
                    <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-p3-navy/30">{t('wallet.taxFreeSentinel')}</h4>
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-splat-yellow" />
                            <span className="text-xl font-black text-p3-navy italic uppercase">{t('wallet.powerUp')}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[11px] font-black text-p3-navy tabular-nums uppercase">
                            ¥{Math.round(stats.taxFreeTotal).toLocaleString()} <span className="text-gray-300 mx-1">/</span> ¥5,000
                        </span>
                    </div>
                </div>
                <div className="relative h-4 bg-p3-navy/5 rounded-full p-[2px] overflow-hidden border-[0.5px] border-p3-navy/20">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (stats.taxFreeTotal / 5000) * 100)}%` }}
                        className={`h-full rounded-full transition-colors relative overflow-hidden ${stats.taxFreeTotal >= 5000 ? 'bg-p3-gold shadow-[0_0_15px_rgba(255,199,0,0.4)]' : 'bg-p3-ruby'}`}
                    >
                        <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    </motion.div>
                </div>
            </div>

            {/* --- Instant Converter --- */}
            <div className="bg-p3-navy border-[0.5px] border-p3-navy rounded-[28px] p-5 shadow-glass-deep relative overflow-hidden group">
                <div className="flex items-center gap-5 relative z-10">
                    <div className="flex-1 relative">
                        <input
                            type="number"
                            inputMode="decimal"
                            placeholder={converterMode === 'JPY2TWD' ? 'JPY' : 'TWD'}
                            value={converterValue}
                            onChange={(e) => setConverterValue(e.target.value)}
                            className="w-full bg-white/10 border-[0.5px] border-white/20 rounded-2xl py-3.5 px-4 text-white font-black placeholder:text-white/20 outline-none focus:border-p3-gold/50 transition-colors text-lg"
                        />
                    </div>
                    <motion.button
                        whileTap={{ rotate: 180 }}
                        onClick={() => { setConverterMode(m => m === 'JPY2TWD' ? 'TWD2JPY' : 'JPY2TWD'); triggerHaptic('light'); }}
                        className="w-11 h-11 rounded-full bg-p3-gold flex items-center justify-center text-p3-navy border-[0.5px] border-white/20 shadow-xl"
                    >
                        <Repeat size={22} strokeWidth={3} />
                    </motion.button>
                    <div className="flex-1 text-right">
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{converterMode === 'JPY2TWD' ? 'TWD Estimate' : 'JPY Estimate'}</div>
                        <div className="text-xl font-black text-p3-gold tabular-nums">{converterMode === 'JPY2TWD' ? 'NT$ ' : '¥ '}{Math.round(parseFloat(convertedValue) || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* --- Transaction Log (Grouped by Date) --- */}
            <div className="space-y-8">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-sm font-black text-p3-navy flex items-center gap-3 uppercase tracking-widest">
                        <div className="w-2.5 h-6 bg-p3-ruby rounded-full" /> {t('wallet.recentTx')}
                    </h3>
                    <div className="text-[10px] font-black text-gray-400 italic bg-gray-100 px-3 py-1 rounded-full uppercase">{expenses.length} Records</div>
                </div>

                {groupedExpenses.length === 0 ? (
                    <div className="bg-white/40 border-[0.5px] border-dashed border-gray-300 rounded-[32px] py-16 text-center text-gray-400 font-black italic uppercase tracking-widest">
                        {t('wallet.noTransactions')}
                    </div>
                ) : (
                    <div className="space-y-10 relative">
                        {groupedExpenses.map(([date, items]) => (
                            <div key={date} className="space-y-4">
                                <div className="flex items-center gap-3 sticky top-0 z-20 pt-1 pb-2 bg-[#F4F5F7]/80 backdrop-blur-md -mx-1 px-1">
                                    <div className="w-8 h-8 rounded-xl bg-p3-navy/5 flex items-center justify-center text-p3-navy/30">
                                        <Calendar size={14} />
                                    </div>
                                    <span className="text-[11px] font-black text-p3-navy/40 uppercase tracking-[0.2em]">{date}</span>
                                    <div className="flex-1 h-[1px] bg-p3-navy/10" />
                                </div>

                                <div className="space-y-4">
                                    {items.map(item => {
                                        const Icon = CATEGORY_ICONS[item.category] || Coins;
                                        return (
                                            <SwipeableItem key={item.id} id={item.id} onDelete={() => { deleteExpenseItem(trip.id, item.id); triggerHaptic('medium'); }}>
                                                <motion.div
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => {
                                                        setEditingId(item.id);
                                                        setForm({ ...item });
                                                        setActiveTab('record');
                                                        triggerHaptic('light');
                                                    }}
                                                    className="bg-white border-[0.5px] border-p3-navy rounded-[32px] p-6 shadow-glass-deep-sm flex items-center justify-between group active:bg-gray-50 transition-all border-b-4 hover:border-p3-navy"
                                                >
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 rounded-2xl bg-[#F4F5F7] border border-p3-navy/10 flex items-center justify-center text-p3-navy shadow-inner">
                                                            <Icon size={26} strokeWidth={2.5} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h4 className="font-black text-p3-navy text-lg leading-tight truncate w-40 italic uppercase tracking-tighter">
                                                                {item.title || item.storeName}
                                                            </h4>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.method} • {item.category}</p>
                                                                {item.location && <MapPin size={10} className="text-p3-ruby" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xl font-black text-p3-navy tabular-nums italic">
                                                            {CURRENCY_SYMBOLS[item.currency] || ''}{item.amount.toLocaleString()}
                                                        </div>
                                                        {item.currency !== 'TWD' && (
                                                            <p className="text-[10px] font-black text-p3-ruby/60 uppercase">
                                                                ≈ NT$ {Math.round(item.amount * rate).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            </SwipeableItem>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- Record FAB --- */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setActiveTab('record'); triggerHaptic('medium'); }}
                className="fixed bottom-24 right-6 w-16 h-16 bg-p3-navy rounded-full shadow-2xl flex items-center justify-center text-white z-[100] border-4 border-white"
            >
                <Plus size={32} strokeWidth={4} />
            </motion.button>

            {/* --- Record Modal (Form Refactor) --- */}
            <AnimatePresence>
                {activeTab === 'record' && (
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[1100] bg-white flex flex-col"
                    >
                        <div className="p-6 flex justify-between items-center bg-white border-b-4 border-p3-navy">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-p3-navy">{editingId ? 'Edit Transaction' : 'Record Expense'}</h2>
                            <button onClick={() => setActiveTab('list')} className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-p3-navy active:scale-90 transition-all"><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-7 space-y-8 bg-[#F4F5F7]">
                            <div className="bg-white p-7 rounded-[40px] border-[0.5px] border-p3-navy shadow-glass-deep-sm space-y-7">
                                {/* Date Selection */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Date</label>
                                    <div className="flex items-center gap-3 bg-gray-50 border-[0.5px] border-p3-navy rounded-2xl px-5 py-4">
                                        <Calendar size={18} className="text-p3-navy/30" />
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={e => setForm({ ...form, date: e.target.value })}
                                            className="bg-transparent font-black text-p3-navy outline-none w-full appearance-none"
                                        />
                                    </div>
                                </div>

                                {/* Store & Title Separation */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Store / Merchant</label>
                                        <div className="relative">
                                            <Store size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-p3-navy/20" />
                                            <input placeholder="Uniqlo, Ichiran, etc." value={form.storeName} onChange={e => setForm({ ...form, storeName: e.target.value })} className="w-full bg-gray-50 border-[0.5px] border-p3-navy rounded-2xl p-4 pl-12 font-black italic outline-none focus:border-p3-navy transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">What did you buy?</label>
                                        <div className="relative">
                                            <ShoppingBag size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-p3-navy/20" />
                                            <input placeholder="Clothes, Ramen, Souvenirs..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-gray-50 border-[0.5px] border-p3-navy rounded-2xl p-4 pl-12 font-black outline-none focus:border-p3-navy transition-all" />
                                        </div>
                                    </div>
                                </div>

                                {/* Location Field */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Location</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <MapPin size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-p3-ruby/30" />
                                            <input placeholder="Umeda, Harajuku..." value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full bg-gray-50 border-[0.5px] border-p3-navy rounded-2xl p-4 pl-12 font-black text-xs outline-none" />
                                        </div>
                                        <button onClick={() => triggerHaptic('light')} className="w-14 bg-white border-[0.5px] border-p3-navy rounded-2xl flex items-center justify-center text-p3-ruby shadow-sm active:scale-95 transition-all">
                                            <MapPin size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Amount & Currency */}
                                <div className="grid grid-cols-5 gap-3">
                                    <div className="col-span-3 relative">
                                        <input type="number" inputMode="decimal" placeholder="0.00" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="w-full h-16 bg-gray-50 border-[0.5px] border-p3-navy rounded-2xl p-5 font-black text-3xl outline-none" />
                                        <button onClick={() => fileInputRef.current?.click()} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-p3-navy text-white rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-sm"><Camera size={18} /></button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setForm({ ...form, images: [...(form.images || []), reader.result as string] });
                                                reader.readAsDataURL(file);
                                            }
                                        }} />
                                    </div>
                                    <div className="col-span-2 flex bg-gray-100 p-1 rounded-2xl border-[0.5px] border-p3-navy">
                                        {['JPY', 'TWD'].map(cur => (
                                            <button key={cur} onClick={() => setForm({ ...form, currency: cur as any })} className={`flex-1 rounded-xl font-black text-sm transition-all ${form.currency === cur ? 'bg-p3-navy text-white shadow-lg' : 'text-gray-400'}`}>{cur}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Images Preview */}
                                {(form.images?.length ?? 0) > 0 && (
                                    <div className="flex gap-3 overflow-x-auto py-2">
                                        {form.images?.map((img, i) => (
                                            <div key={i} className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden border-[0.5px] border-p3-navy shadow-glass-deep-sm">
                                                <img src={img} className="w-full h-full object-cover" />
                                                <button onClick={() => setForm({ ...form, images: form.images?.filter((_, idx) => idx !== i) })} className="absolute top-1.5 right-1.5 bg-p3-ruby text-white rounded-full p-1.5 shadow-xl"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Category Grid */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 ml-1">Category</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {CATEGORIES.map(cat => {
                                            const Icon = CATEGORY_ICONS[cat] || Coins;
                                            const isSelected = form.category === cat;
                                            return (
                                                <button key={cat} onClick={() => { setForm({ ...form, category: cat as any }); triggerHaptic('light'); }} className={`h-22 p-2 rounded-2xl border-[0.5px] flex flex-col items-center justify-center gap-2 transition-all ${isSelected ? 'bg-p3-navy text-white border-p3-navy shadow-inner scale-95' : 'bg-white text-gray-400 border-gray-100 hover:border-p3-navy/30'}`}>
                                                    <Icon size={18} />
                                                    <span className="font-black text-[9px] uppercase tracking-tighter">{cat}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 ml-1">Payment Method</label>
                                    <div className="flex flex-wrap gap-2">
                                        {METHODS.map(m => (
                                            <button key={m} onClick={() => { setForm({ ...form, method: m as any }); triggerHaptic('light'); }} className={`py-3 px-5 rounded-2xl border-[0.5px] font-black text-[10px] uppercase transition-all ${form.method === m ? 'bg-p3-gold text-p3-navy border-p3-navy shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}>
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tax-Free Toggle */}
                                <div className="flex items-center gap-4 p-5 bg-p3-gold/5 border-2 border-dashed border-p3-gold/30 rounded-3xl cursor-pointer" onClick={() => { setForm({ ...form, isTaxFree: !form.isTaxFree }); triggerHaptic('medium'); }}>
                                    <Sparkles size={24} className="text-p3-gold" />
                                    <div className="flex-1">
                                        <span className="text-xs font-black text-p3-navy uppercase block mb-0.5">Apply Tax-Free (SENTINEL)</span>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Counts towards the ¥5,000 threshold</p>
                                    </div>
                                    <div className={`w-14 h-7 rounded-full p-1 transition-colors ${form.isTaxFree ? 'bg-p3-gold' : 'bg-gray-200'}`}>
                                        <motion.div animate={{ x: form.isTaxFree ? 28 : 0 }} className="w-5 h-5 bg-white rounded-full shadow-lg" />
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleSave} className="w-full py-6 bg-p3-navy text-white rounded-[40px] font-black uppercase tracking-[0.3em] text-sm shadow-glass-deep active:scale-95 transition-all mb-10">
                                {editingId ? 'Update Record' : 'Commit Expense'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Stats Dashboard (Standalone Modal) --- */}
            <AnimatePresence>
                {activeTab === 'stats' && (
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[1100] bg-[#F4F5F7] flex flex-col pt-12"
                    >
                        <div className="px-8 py-6 flex justify-between items-center bg-white border-b-4 border-p3-navy">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="text-p3-navy" />
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-p3-navy">Stats Dashboard</h2>
                            </div>
                            <button onClick={() => setActiveTab('list')} className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-p3-navy active:scale-90 transition-all"><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-12">
                            {/* Summary Hero */}
                            <div className="bg-p3-navy rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute -right-20 -top-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Total Accumulated Spend</p>
                                <h3 className="text-5xl font-black italic tracking-tighter mb-4">NT$ {Math.round(stats.totalTwd).toLocaleString()}</h3>
                                <div className="flex gap-4">
                                    <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/5">
                                        <span className="text-[9px] font-black uppercase text-white/40 block">Records</span>
                                        <span className="text-sm font-black italic">{expenses.length}</span>
                                    </div>
                                    <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/5">
                                        <span className="text-[9px] font-black uppercase text-white/40 block">Daily Avg</span>
                                        <span className="text-sm font-black italic">NT$ {Math.round(stats.totalTwd / Math.max(1, stats.trendData.length)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 1. Category Analytics */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-p3-navy uppercase tracking-widest flex items-center gap-3">
                                    <Utensils size={14} /> Category Breakdown
                                </h4>
                                <div className="bg-white rounded-[40px] p-8 border-[0.5px] border-p3-navy shadow-glass-deep-sm space-y-6">
                                    {stats.categoryData.map(d => {
                                        const Icon = CATEGORY_ICONS[d.label] || Coins;
                                        return (
                                            <div key={d.label} className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 border border-p3-navy/5 text-p3-navy">
                                                            <Icon size={18} strokeWidth={2.5} />
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-black text-p3-navy uppercase tracking-tighter italic">{d.label}</span>
                                                            <span className="ml-2 text-[10px] font-black text-gray-400 uppercase">{d.percent}%</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-black text-p3-navy tabular-nums">NT$ {Math.round(d.value).toLocaleString()}</span>
                                                </div>
                                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden p-[1px]">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${d.percent}%` }}
                                                        transition={{ duration: 0.8, ease: "circOut" }}
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: 'var(--p3-navy)' }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Payment Method Analytics */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-p3-navy uppercase tracking-widest flex items-center gap-3">
                                    <CreditCard size={14} /> Method Analytics
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {stats.methodData.map(m => {
                                        const Icon = METHOD_ICONS[m.label] || Coins;
                                        return (
                                            <div key={m.label} className="bg-white rounded-3xl p-6 border border-p3-navy/10 shadow-glass-soft text-center group">
                                                <div className="w-12 h-12 rounded-2xl bg-p3-navy/5 flex items-center justify-center text-p3-navy mx-auto mb-3 group-hover:bg-p3-navy group-hover:text-white transition-all">
                                                    <Icon size={24} />
                                                </div>
                                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{m.label}</h5>
                                                <p className="text-lg font-black text-p3-navy tabular-nums italic">NT$ {Math.round(m.value).toLocaleString()}</p>
                                                <div className="mt-2 text-[9px] font-black text-p3-ruby uppercase tracking-tighter">{m.percent}% of total</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 3. Daily Expenditure Trend */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-p3-navy uppercase tracking-widest flex items-center gap-3">
                                    <TrendingUp size={14} /> Daily Expenditure
                                </h4>
                                <div className="space-y-3">
                                    {stats.trendData.map(t => (
                                        <div key={t.date} className="bg-white rounded-2xl py-4 px-6 border-l-4 border-p3-navy flex justify-between items-center shadow-glass-soft">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-black text-p3-navy italic uppercase tracking-widest">{t.date}</span>
                                            </div>
                                            <span className="text-lg font-black text-p3-navy italic">NT$ {Math.round(t.value).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="h-20" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Foodie Alert Prompt --- */}
            <AnimatePresence>
                {showFoodiePrompt && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-p3-navy/70 backdrop-blur-md" onClick={() => setShowFoodiePrompt(false)} />
                        <motion.div initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 30 }} className="bg-white border-[6px] border-p3-navy rounded-[48px] p-10 shadow-2xl relative z-10 w-full max-w-sm text-center">
                            <div className="w-24 h-24 bg-splat-orange text-white rounded-[32px] border-[1px] border-p3-navy shadow-glass-deep flex items-center justify-center mx-auto mb-8 rotate-[-8deg]">
                                <Utensils size={48} strokeWidth={3} />
                            </div>
                            <h3 className="text-3xl font-black text-p3-navy tracking-tighter italic uppercase mb-3">Foodie Alert!</h3>
                            <p className="text-gray-500 font-bold leading-snug mb-10 text-sm">That sounds delicious! Would you like to save this meal to your <b>Memories Hub</b> curated list?</p>
                            <div className="space-y-4">
                                <button onClick={() => { setShowFoodiePrompt(false); setGlobalActiveTab('memories'); triggerHaptic('success'); }} className="w-full py-5 bg-splat-orange text-white rounded-2xl border-[1px] border-b-[6px] border-p3-navy shadow-glass-deep font-black uppercase tracking-widest active:translate-y-1 active:border-b-[1px] transition-all">Yes, Add to Hub ✨</button>
                                <button onClick={() => setShowFoodiePrompt(false)} className="w-full py-2 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-p3-navy transition-colors">Maybe later</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
