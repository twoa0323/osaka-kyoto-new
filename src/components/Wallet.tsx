import { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
    Wallet as WalletIcon, Coins, Trash2, Camera, BarChart3, Upload, PenTool,
    LayoutList, Settings, CheckCircle, Image as ImageIcon,
    Loader2, Store, Search, X, ChevronRight, Edit3, ArrowLeft,
    Info, ArrowRight, TrendingDown, Sparkles, AlertTriangle, AlertOctagon,
    RefreshCw, Repeat, ArrowUpDown, Banknote, CreditCard, PieChart, Plus, Utensils,
    ShoppingBag, Car, Pill, ShoppingCart, Calendar, Home
} from 'lucide-react';
import { ExpenseItem, CurrencyCode, Member } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeableItem } from './Common';
import { useTranslation } from '../hooks/useTranslation';

// --- 常數配置 ---
const CURRENCY_SYMBOLS: Record<string, string> = {
    TWD: 'NT$', JPY: '¥', KRW: '₩', USD: '$', EUR: '€', THB: '฿', GBP: '£', CNY: '¥', HKD: 'HK$', SGD: 'S$', VND: '₫'
};

const CATEGORIES = ['餐飲', '購物', '交通', '住宿', '娛樂', '藥妝', '便利商店', '超市', '其他'];
const METHODS = ['現金', '信用卡', '行動支付', 'IC卡', '其他'];

const CATEGORY_ICONS: Record<string, any> = {
    '餐飲': Utensils, '購物': ShoppingBag, '交通': Car, '住宿': Home,
    '娛樂': Sparkles, '藥妝': Pill, '便利商店': Store, '超市': ShoppingCart, '其他': Coins
};

export const Wallet = () => {
    const { t } = useTranslation();
    const { trips, currentTripId, exchangeRate, addExpenseItem, deleteExpenseItem, updateExpenseItem, updateTripData, setExchangeRate, showToast, setActiveTab: setGlobalActiveTab } = useTripStore();
    const trip = trips.find(t => t.id === currentTripId);

    const [activeTab, setActiveTab] = useState<'record' | 'list' | 'stats'>('record');
    const [inputMode, setInputMode] = useState<'manual' | 'scan' | 'import'>('manual');
    const [statsView, setStatsView] = useState<'daily' | 'category' | 'method'>('daily');
    const [detailItem, setDetailItem] = useState<ExpenseItem | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploadingImg, setIsUploadingImg] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showFoodiePrompt, setShowFoodiePrompt] = useState(false);

    // 匯率引擎狀態
    const [converterValue, setConverterValue] = useState<string>('');
    const [converterMode, setConverterMode] = useState<'JPY2TWD' | 'TWD2JPY'>('JPY2TWD');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<Partial<ExpenseItem>>({
        date: new Date().toISOString().split('T')[0], currency: trip?.baseCurrency || 'JPY',
        method: '現金', amount: 0, storeName: '', title: '', location: '', images: [], category: '餐飲', items: []
    });

    const expenses = trip?.expenses || [];
    const rate = exchangeRate || 0.21;

    const stats = useMemo(() => {
        const totalTwd = expenses.reduce((s, e) => s + (e.currency === 'TWD' ? e.amount : e.amount * rate), 0);
        const totalForeign = expenses.filter(e => e.currency === (trip?.baseCurrency || 'JPY')).reduce((s, e) => s + e.amount, 0);
        const taxFreeTotal = expenses.filter(e => e.isTaxFree).reduce((s, e) => s + e.amount, 0);

        const catStats = expenses.reduce((acc, curr) => {
            const val = curr.currency === 'TWD' ? curr.amount : curr.amount * rate;
            acc[curr.category] = (acc[curr.category] || 0) + val;
            return acc;
        }, {} as Record<string, number>);

        const pieData = Object.entries(catStats).map(([label, value], i) => ({
            label, value, percent: Math.round((value / (totalTwd || 1)) * 100),
            color: ['var(--p3-ruby)', 'var(--p3-navy)', 'var(--p3-gold)', 'var(--p3-ruby)', 'var(--p3-navy)'][i % 5]
        })).sort((a, b) => b.value - a.value);

        return { totalTwd, totalForeign, taxFreeTotal, pieData };
    }, [expenses, rate, trip?.baseCurrency]);

    const convertedValue = useMemo(() => {
        const val = parseFloat(converterValue) || 0;
        if (converterMode === 'JPY2TWD') return (val * rate).toFixed(0);
        return (val / rate).toFixed(0);
    }, [converterValue, converterMode, rate]);

    const handleDelete = (id: string) => {
        if (!trip) return;
        deleteExpenseItem(trip.id, id);
        showToast(t('wallet.delSuccess'), "info");
    };

    const handleAddFoodieList = () => {
        if (!trip) return;
        const wishItem = {
            id: Date.now().toString(), title: form.storeName || '想吃', location: form.location || '',
            date: form.date || '', category: 'dining' as any, images: form.images || [], time: '12:00', note: '', cost: 0
        };
        updateTripData(trip.id, { items: [...(trip.items || []), wishItem] });
    };

    const handleSave = () => {
        if (!form.amount || !form.title) return showToast(t('wallet.incompleteInfo'), "error");
        const item: ExpenseItem = {
            id: editingId || Date.now().toString(), date: form.date!, storeName: form.storeName || '', title: form.title!, amount: Number(form.amount),
            currency: form.currency as CurrencyCode, method: form.method as any, location: form.location || '',
            payerId: form.payerId || trip?.members?.[0]?.id || 'Admin',
            splitWith: form.splitWith || [],
            images: form.images || [], category: form.category as any, items: form.items || [],
            isTaxFree: !!form.isTaxFree
        };
        if (editingId) {
            updateExpenseItem(trip!.id, editingId, item);
        } else {
            addExpenseItem(trip!.id, item);
        }

        triggerHaptic('medium');
        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            setEditingId(null);
            setForm({ date: new Date().toISOString().split('T')[0], currency: trip?.baseCurrency || 'JPY', method: '現金', amount: 0, storeName: '', title: '', location: '', images: [], category: '餐飲', items: [] });
            setInputMode('manual');
            showToast(t('wallet.saveSuccess'), "success");
            if (item.category === '餐飲' && !editingId) {
                setShowFoodiePrompt(true);
            } else {
                setActiveTab('list');
            }
        }, 800);
    };

    if (!trip) return null;

    return (
        <div className="px-5 space-y-6 pb-32 pt-4 bg-[#F4F5F7] h-full overflow-y-auto hide-scrollbar">

            {/* --- Section 1: Hero Dashboard --- */}
            <div className="bg-splat-yellow border-[0.5px] border-p3-navy glass-card p-6 shadow-glass-deep relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Banknote size={16} className="text-p3-navy" />
                            <p className="text-[10px] font-black uppercase text-p3-navy tracking-widest italic">{t('wallet.currentExp')}</p>
                        </div>
                        <h2 className="text-4xl font-black text-p3-navy tracking-tighter">
                            NT$ {Math.round(stats.totalTwd).toLocaleString()}
                        </h2>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="px-3 py-1 bg-white/40 rounded-full border border-p3-navy/10 text-[10px] font-black text-p3-navy uppercase">
                                {trip.baseCurrency} {Math.round(stats.totalForeign).toLocaleString()}
                            </div>
                            <div className="text-[10px] font-black text-p3-navy/40 italic uppercase tracking-widest">
                                {t('wallet.rate')}: {rate.toFixed(4)}
                            </div>
                        </div>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setActiveTab('stats')}
                        className="w-14 h-14 bg-white border-[0.5px] border-p3-navy rounded-2xl shadow-glass-deep-sm flex items-center justify-center text-p3-navy"
                    >
                        <PieChart size={28} strokeWidth={2.5} />
                    </motion.button>
                </div>
            </div>

            {/* --- Section 2: Tax-Free Battery Bar --- */}
            <div className="glass-card p-5 shadow-glass-soft relative overflow-hidden group border-[0.5px] border-white/40">
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
                        className={`h-full rounded-full transition-colors relative overflow-hidden ${stats.taxFreeTotal >= 5000 ? 'bg-p3-gold' : 'bg-p3-ruby'}`}
                    >
                        <motion.div
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        />
                    </motion.div>
                </div>
                {stats.taxFreeTotal >= 5000 && (
                    <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="text-center text-[9px] font-black uppercase text-splat-orange mt-3 tracking-widest">{t('wallet.taxFreeAchieved')}</motion.p>
                )}
            </div>

            {/* --- Section 3: Instant Exchange Engine --- */}
            <div className="bg-p3-navy border-[0.5px] border-p3-navy rounded-[24px] p-4 shadow-glass-deep relative">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <input type="text" inputMode="decimal" placeholder={converterMode === 'JPY2TWD' ? t('wallet.jpyAmount') : t('wallet.twdAmount')} value={converterValue} onChange={(e) => setConverterValue(e.target.value)} className="w-full bg-white/10 border-[0.5px] border-white/20 rounded-xl py-3 px-4 text-white font-black placeholder:text-white/20 outline-none focus:border-p3-gold/50 transition-colors text-sm" />
                    </div>
                    <motion.button whileTap={{ rotate: 180 }} onClick={() => { setConverterMode(m => m === 'JPY2TWD' ? 'TWD2JPY' : 'JPY2TWD'); triggerHaptic('light'); }} className="w-10 h-10 rounded-full bg-p3-gold flex items-center justify-center text-p3-navy border-[0.5px] border-white/20 shadow-sm"><Repeat size={20} strokeWidth={3} /></motion.button>
                    <div className="flex-1 text-right">
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{t('wallet.result')} ({converterMode === 'JPY2TWD' ? 'TWD' : 'JPY'})</div>
                        <div className="text-xl font-black text-p3-gold tabular-nums">{converterMode === 'JPY2TWD' ? 'NT$ ' : '¥ '}{Math.round(parseFloat(convertedValue) || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* --- Section 4: Grid Analytics --- */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-p3-navy flex items-center gap-2 uppercase tracking-widest pl-2">
                    <div className="w-2 h-5 bg-p3-navy rounded-full" /> {t('wallet.spendAnalytics')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {stats.pieData.slice(0, 4).map((d) => (
                        <div key={d.label} className="bg-white border-[0.5px] border-p3-navy rounded-3xl p-5 shadow-glass-deep-sm relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 w-12 h-12 -mr-6 -mt-6 rounded-full opacity-20`} style={{ backgroundColor: d.color }} />
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{d.label}</div>
                            <div className="text-lg font-black text-p3-navy tabular-nums">${Math.round(d.value).toLocaleString()}</div>
                            <div className="flex items-center gap-1.5 mt-4">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${d.percent}%` }} className="h-full rounded-full" style={{ backgroundColor: d.color }} />
                                </div>
                                <span className="text-[10px] font-black text-p3-navy">{d.percent}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- Section 5: Recent Transactions --- */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-p3-navy flex justify-between items-center uppercase tracking-widest pl-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-5 bg-p3-ruby rounded-full" /> {t('wallet.recentTx')}
                    </div>
                </h3>
                <div className="space-y-3">
                    {expenses.length === 0 ? (
                        <div className="bg-white/40 border-[0.5px] border-dashed border-gray-300 rounded-3xl py-12 text-center text-gray-400 font-black italic uppercase tracking-widest">
                            {t('wallet.noTransactions')}
                        </div>
                    ) : (
                        expenses
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(item => {
                                const Icon = CATEGORY_ICONS[item.category] || Coins;
                                return (
                                    <SwipeableItem key={item.id} id={item.id} onDelete={() => handleDelete(item.id)}>
                                        <motion.div
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setEditingId(item.id);
                                                setForm({ ...item });
                                                setActiveTab('record');
                                            }}
                                            className="bg-white border-[0.5px] border-p3-navy rounded-[28px] p-5 shadow-glass-soft flex items-center justify-between group active:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 border-[0.5px] border-p3-navy/10 flex items-center justify-center text-p3-navy">
                                                    <Icon size={24} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-p3-navy leading-tight truncate w-32">{item.title || item.storeName}</h4>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.date} • {item.method}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-p3-navy tabular-nums">
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
                            })
                    )}
                </div>
            </div>

            <button onClick={() => setActiveTab('record')} className="w-full py-5 bg-p3-navy border-[0.5px] border-white/20 rounded-[24px] shadow-glass-deep text-white font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all">
                <Plus size={20} strokeWidth={4} /> {t('wallet.addNew')}
            </button>

            {/* --- Detail/Record Overlay --- */}
            <AnimatePresence>
                {activeTab === 'record' && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[1100] bg-white flex flex-col"
                    >
                        <div className="p-6 flex justify-between items-center border-b-[3px] border-p3-navy">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-p3-navy">{t('wallet.entryTitle')}</h2>
                            <button onClick={() => setActiveTab('list')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-p3-navy"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F4F5F7]">
                            <div className="bg-white p-6 rounded-3xl border-[0.5px] border-p3-navy shadow-glass-deep-sm space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{t('wallet.txDate')}</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-p3-navy/30" size={18} />
                                        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-gray-50 border-[0.5px] border-p3-navy rounded-xl p-4 pl-12 font-black outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{t('wallet.txDetails')}</label>
                                    <input placeholder={t('wallet.storeName')} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-gray-50 border-[0.5px] border-p3-navy rounded-xl p-4 font-black outline-none focus:border-splat-blue/50 transition-colors" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <input type="number" placeholder={t('wallet.amount')} value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="w-full bg-gray-50 border-[0.5px] border-p3-navy rounded-xl p-4 font-black text-2xl outline-none" />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-p3-navy text-white rounded-lg flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                                        >
                                            <Camera size={20} />
                                        </button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setForm({ ...form, images: [...(form.images || []), reader.result as string] });
                                                reader.readAsDataURL(file);
                                            }
                                        }} />
                                    </div>
                                    <div className="flex bg-gray-100 p-1 rounded-xl border-[0.5px] border-p3-navy">
                                        <button onClick={() => setForm({ ...form, currency: 'JPY' })} className={`flex-1 rounded-lg font-black text-xs transition-colors ${form.currency === 'JPY' ? 'bg-splat-green text-white shadow-sm' : 'text-gray-400'}`}>JPY</button>
                                        <button onClick={() => setForm({ ...form, currency: 'TWD' })} className={`flex-1 rounded-lg font-black text-xs transition-colors ${form.currency === 'TWD' ? 'bg-splat-green text-white shadow-sm' : 'text-gray-400'}`}>TWD</button>
                                    </div>
                                </div>

                                {(form.images?.length ?? 0) > 0 && (
                                    <div className="flex gap-2 overflow-x-auto py-2">
                                        {form.images?.map((img, i) => (
                                            <div key={i} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-[0.5px] border-p3-navy shadow-sm">
                                                <img src={img} className="w-full h-full object-cover" alt="receipt" />
                                                <button onClick={() => setForm({ ...form, images: form.images?.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-p3-ruby text-white rounded-full p-1 shadow-sm"><X size={10} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{t('wallet.category')}</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {CATEGORIES.map(cat => (
                                            <button key={cat} onClick={() => setForm({ ...form, category: cat as any })} className={`py-2 px-1 rounded-xl border-[0.5px] font-black text-[10px] transition-all ${form.category === cat ? 'bg-p3-navy text-white border-p3-navy shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-p3-navy/30'}`}>
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{t('wallet.payMethod')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {METHODS.map(m => (
                                            <button key={m} onClick={() => setForm({ ...form, method: m as any })} className={`py-2 px-4 rounded-xl border-[0.5px] font-black text-[10px] transition-all ${form.method === m ? 'bg-splat-blue text-white border-splat-blue shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-splat-blue/30'}`}>
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-splat-yellow/10 border-2 border-dashed border-splat-yellow rounded-xl cursor-pointer" onClick={() => setForm({ ...form, isTaxFree: !form.isTaxFree })}>
                                    <Sparkles size={18} className="text-splat-yellow" />
                                    <div className="flex-1 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-p3-navy uppercase">{t('wallet.applyTaxFree')}</span>
                                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${form.isTaxFree ? 'bg-p3-gold' : 'bg-gray-200'}`}>
                                            <motion.div animate={{ x: form.isTaxFree ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleSave} className="w-full py-5 bg-p3-navy text-white rounded-2xl font-black uppercase tracking-widest shadow-glass-deep active:translate-y-1 active:shadow-none transition-all">
                                {t('wallet.saveTx')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Stats Overlay --- */}
            <AnimatePresence>
                {activeTab === 'stats' && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[1100] bg-[#F4F5F7] flex flex-col"
                    >
                        <div className="p-6 flex justify-between items-center border-b-[3px] border-p3-navy bg-white">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-p3-navy flex items-center gap-3">
                                <PieChart size={20} />
                                {t('wallet.spendAnalytics')}
                            </h2>
                            <button onClick={() => setActiveTab('list')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-p3-navy"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Total */}
                            <div className="bg-splat-yellow border-[3px] border-p3-navy rounded-[32px] p-6 shadow-glass-deep">
                                <p className="text-[10px] font-black uppercase tracking-widest text-p3-navy/50 mb-1">{t('wallet.currentExp')}</p>
                                <h2 className="text-5xl font-black text-p3-navy tracking-tighter">
                                    NT$ {Math.round(stats.totalTwd).toLocaleString()}
                                </h2>
                                <p className="text-sm font-black text-p3-navy/40 mt-2 uppercase">
                                    {trip.baseCurrency} {Math.round(stats.totalForeign).toLocaleString()} • {expenses.length} {t('wallet.recentTx')}
                                </p>
                            </div>

                            {/* Category Breakdown */}
                            <div className="bg-white border-[0.5px] border-p3-navy rounded-[32px] p-6 shadow-glass-deep-sm space-y-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-p3-navy/30">{t('wallet.category')} Breakdown</h3>
                                {stats.pieData.length === 0 ? (
                                    <p className="text-center text-gray-400 font-black italic py-8">{t('wallet.noTransactions')}</p>
                                ) : (
                                    stats.pieData.map(d => {
                                        const Icon = CATEGORY_ICONS[d.label] || Coins;
                                        return (
                                            <div key={d.label} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: d.color + '22', color: d.color }}>
                                                            <Icon size={16} strokeWidth={2.5} />
                                                        </div>
                                                        <div>
                                                            <span className="font-black text-p3-navy text-sm">{d.label}</span>
                                                            <span className="ml-2 text-[10px] font-black text-gray-400 uppercase">{d.percent}%</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-black text-p3-navy tabular-nums text-sm">NT$ {Math.round(d.value).toLocaleString()}</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${d.percent}%` }}
                                                        transition={{ duration: 0.6, delay: 0.1 }}
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: d.color }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Foodie Memory Prompt --- */}
            <AnimatePresence>
                {showFoodiePrompt && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-p3-navy/60 backdrop-blur-sm" onClick={() => setShowFoodiePrompt(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white border-[4px] border-p3-navy rounded-[40px] p-8 shadow-2xl relative z-10 w-full max-w-sm text-center">
                            <div className="w-20 h-20 bg-splat-orange text-white rounded-3xl border-[0.5px] border-p3-navy shadow-glass-deep-sm flex items-center justify-center mx-auto mb-6 rotate-[-6deg]">
                                <Utensils size={40} strokeWidth={3} />
                            </div>
                            <h3 className="text-2xl font-black text-p3-navy tracking-tighter italic uppercase mb-2">{t('wallet.foodieAlert')}</h3>
                            <p className="text-gray-500 font-bold leading-tight mb-8">{t('wallet.foodieMsg1')}<br />{t('wallet.foodieMsg2')}</p>
                            <div className="space-y-3">
                                <button onClick={() => { setShowFoodiePrompt(false); setGlobalActiveTab('memories'); triggerHaptic('success'); }} className="w-full py-4 bg-splat-orange text-white rounded-2xl border-[0.5px] border-p3-navy shadow-glass-deep-sm font-black uppercase tracking-widest active:translate-y-1 active:shadow-none transition-all">{t('wallet.yesAddMemory')}</button>
                                <button onClick={() => setShowFoodiePrompt(false)} className="w-full py-3 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-p3-navy transition-colors">{t('wallet.maybeLater')}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};
