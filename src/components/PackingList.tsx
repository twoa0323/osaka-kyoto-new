
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package,
    Plus,
    Trash2,
    CheckCircle2,
    Circle,
    Sparkles,
    ShoppingBag,
    Smartphone,
    FileText,
    Shirt,
    Stethoscope,
    MoreVertical,
    X,
    ChevronRight,
    RefreshCcw,
    LayoutGrid,
    List as ListIcon
} from 'lucide-react';
import { useTripStore } from '../store/useTripStore';
import { PackingItem } from '../types';
import { triggerHaptic } from '../utils/haptics';

const CATEGORY_ICONS: Record<string, any> = {
    'Clothing': Shirt,
    'Electronics': Smartphone,
    'Documents': FileText,
    'Toiletries': ShoppingBag,
    'Medicine': Stethoscope,
    'Others': Package,
    '衣物': Shirt,
    '洗漱用品': ShoppingBag,
    '電子產品': Smartphone,
    '重要證件': FileText,
    '藥品': Stethoscope,
    '其他': Package,
};

const CATEGORY_COLORS: Record<string, string> = {
    'Clothing': 'bg-splat-orange',
    'Electronics': 'bg-splat-blue',
    'Documents': 'bg-splat-pink',
    'Toiletries': 'bg-splat-green',
    'Medicine': 'bg-splat-yellow',
    'Others': 'bg-gray-400',
    '衣物': 'bg-splat-orange',
    '洗漱用品': 'bg-splat-green',
    '電子產品': 'bg-splat-blue',
    '重要證件': 'bg-splat-pink',
    '藥品': 'bg-splat-yellow',
    '其他': 'bg-gray-400',
};

export const PackingList = () => {
    const { trips, currentTripId, addPackingItem, togglePackingItem, deletePackingItem, clearPackingList, updatePackingItem } = useTripStore();
    const trip = trips.find(t => t.id === currentTripId);
    const packingList = trip?.packingList || [];

    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'packed' | 'unpacked'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const [newItem, setNewItem] = useState({
        title: '',
        category: '衣物',
        quantity: 1,
        note: ''
    });

    const filteredItems = useMemo(() => {
        if (filter === 'packed') return packingList.filter(i => i.isPacked);
        if (filter === 'unpacked') return packingList.filter(i => !i.isPacked);
        return packingList;
    }, [packingList, filter]);

    const packedCount = packingList.filter(i => i.isPacked).length;
    const progress = packingList.length > 0 ? (packedCount / packingList.length) * 100 : 0;

    const handleAddCustom = () => {
        if (!newItem.title || !currentTripId) return;
        const item: PackingItem = {
            id: `pack-${Date.now()}`,
            ...newItem,
            isPacked: false,
            updatedAt: Date.now()
        };
        addPackingItem(currentTripId, item);
        setNewItem({ title: '', category: '衣物', quantity: 1, note: '' });
        setShowAddModal(false);
        triggerHaptic('success');
    };

    const handleAiSuggest = async () => {
        if (!trip || !currentTripId) return;
        setIsAiLoading(true);
        triggerHaptic('medium');

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'suggest-packing-list',
                    payload: {
                        destination: trip.destination,
                        startDate: trip.startDate,
                        endDate: trip.endDate,
                        style: '旅遊'
                    }
                })
            });
            const data = await res.json();
            if (data.packingList) {
                data.packingList.forEach((item: any) => {
                    addPackingItem(currentTripId, {
                        id: `pack-ai-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        title: item.title,
                        category: item.category,
                        quantity: item.quantity,
                        isPacked: false,
                        note: item.note,
                        updatedAt: Date.now()
                    });
                });
                triggerHaptic('success');
            }
        } catch (err) {
            console.error(err);
            alert("AI 離線中，請手動添加行李項目 🥲");
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="px-4 space-y-6 animate-fade-in pb-32 text-left">
            {/* --- Packing Progress Header (Splatoon Style) --- */}
            <div className="bg-white border-[3px] border-splat-dark rounded-[32px] p-6 shadow-splat-solid relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-end mb-4">
                    <div>
                        <h2 className="text-3xl font-black text-splat-dark italic uppercase tracking-tighter leading-none">Gear Up!</h2>
                        <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest">打包進度 {packedCount} / {packingList.length}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black text-splat-blue tabular-nums leading-none">{Math.round(progress)}%</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-6 bg-gray-100 rounded-full border-[3px] border-splat-dark relative overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="absolute inset-y-0 left-0 bg-splat-blue"
                    />
                    {/* Splat effect on progress bar */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle, #fff 10%, transparent 10%)', backgroundSize: '20px 20px' }} />
                </div>

                <Package className="absolute -bottom-4 -right-4 text-gray-100 -rotate-12" size={100} />
            </div>

            {/* --- Action Bar --- */}
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="shrink-0 flex items-center gap-2 px-5 py-3 bg-splat-orange text-white border-[3px] border-splat-dark rounded-2xl font-black text-sm shadow-splat-solid-sm active:translate-y-0.5 active:shadow-none transition-all"
                >
                    <Plus size={18} strokeWidth={3} /> 手動新增
                </button>
                <button
                    onClick={handleAiSuggest}
                    disabled={isAiLoading}
                    className={`shrink-0 flex items-center gap-2 px-5 py-3 bg-white text-splat-blue border-[3px] border-splat-dark rounded-2xl font-black text-sm shadow-splat-solid-sm active:translate-y-0.5 active:shadow-none transition-all ${isAiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isAiLoading ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} />} AI 推薦
                </button>
                <button
                    onClick={() => { if (confirm('⚠️ 清空清單？')) clearPackingList(currentTripId!); }}
                    className="shrink-0 flex items-center justify-center w-12 h-12 bg-white text-splat-pink border-[3px] border-splat-dark rounded-2xl font-black shadow-splat-solid-sm active:translate-y-0.5 active:shadow-none transition-all"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* --- Filters & View Mode --- */}
            <div className="flex justify-between items-center bg-gray-100/50 p-1 rounded-2xl border-2 border-dashed border-gray-300">
                <div className="flex gap-1">
                    {(['all', 'unpacked', 'packed'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-splat-dark text-white' : 'text-gray-400'}`}
                        >
                            {f === 'all' ? '全部' : f === 'packed' ? '已打包' : '未打包'}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                    className="p-2 text-gray-400 hover:text-splat-dark transition-colors"
                >
                    {viewMode === 'list' ? <LayoutGrid size={18} /> : <ListIcon size={18} />}
                </button>
            </div>

            {/* --- List Content --- */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-3'}>
                <AnimatePresence mode="popLayout">
                    {filteredItems.map(item => {
                        const Icon = CATEGORY_ICONS[item.category] || Package;
                        const colorClass = CATEGORY_COLORS[item.category] || 'bg-gray-400';

                        return (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => {
                                    togglePackingItem(currentTripId!, item.id);
                                    triggerHaptic(item.isPacked ? 'light' : 'success');
                                }}
                                className={`group relative bg-white border-[3px] border-splat-dark rounded-[24px] overflow-hidden transition-all active:scale-[0.98] cursor-pointer ${item.isPacked ? 'opacity-50 grayscale shadow-none translate-y-1' : 'shadow-splat-solid'}`}
                            >
                                <div className="p-4 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl border-2 border-splat-dark flex items-center justify-center text-white ${colorClass} shadow-sm shrink-0 transition-transform group-active:rotate-6`}>
                                        <Icon size={24} strokeWidth={2.5} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-black text-splat-dark text-base truncate uppercase tracking-tight ${item.isPacked ? 'line-through' : ''}`}>{item.title}</h3>
                                            {item.quantity > 1 && <span className="bg-splat-dark text-white text-[9px] px-1.5 py-0.5 rounded-md font-black italic">x{item.quantity}</span>}
                                        </div>
                                        {item.note && <p className="text-[9px] font-black text-gray-400 uppercase truncate mt-0.5">{item.note}</p>}
                                    </div>

                                    <div className={`w-6 h-6 rounded-full border-[3px] border-splat-dark flex items-center justify-center transition-all ${item.isPacked ? 'bg-splat-blue text-white' : 'bg-gray-100'}`}>
                                        {item.isPacked && <CheckCircle2 size={14} strokeWidth={4} />}
                                    </div>
                                </div>

                                {/* Delete Button (Visible on long press/desktop hover - here simplified to a side button) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('REMOVE ITEM?')) deletePackingItem(currentTripId!, item.id);
                                    }}
                                    className="absolute top-2 right-2 p-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {packingList.length === 0 && !isAiLoading && (
                <div className="py-20 flex flex-col items-center justify-center border-[3px] border-dashed border-gray-300 rounded-[40px] bg-gray-50/50">
                    <Package size={64} className="text-gray-200 mb-4" />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">Empty Suitcase 🧳<br />Try AI Suggestions!</p>
                </div>
            )}

            {/* --- Add Manual Modal --- */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-md z-[2000] p-6 flex items-center justify-center" onClick={() => setShowAddModal(false)}>
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-splat-solid-lg p-6 overflow-hidden relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black italic text-splat-orange uppercase tracking-tighter">New Gear</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-1 bg-gray-100 rounded-full border-2 border-splat-dark"><X size={20} /></button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Item Name</label>
                                    <input
                                        type="text" value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                        placeholder="e.g. Nintendo Switch"
                                        className="w-full bg-gray-50 border-[3px] border-splat-dark rounded-2xl px-5 py-3 font-black text-splat-dark focus:ring-0 focus:outline-none placeholder:text-gray-300"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Category</label>
                                        <select
                                            value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                            className="w-full bg-gray-50 border-[3px] border-splat-dark rounded-2xl px-5 py-3 font-black text-splat-dark focus:ring-0 focus:outline-none appearance-none"
                                        >
                                            {['衣物', '洗漱用品', '電子產品', '重要證件', '藥品', '其他'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Quantity</label>
                                        <input
                                            type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })} min="1"
                                            className="w-full bg-gray-50 border-[3px] border-splat-dark rounded-2xl px-5 py-3 font-black text-splat-dark focus:ring-0 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Note (Optional)</label>
                                    <input
                                        type="text" value={newItem.note} onChange={e => setNewItem({ ...newItem, note: e.target.value })}
                                        placeholder="e.g. charger & pro controller"
                                        className="w-full bg-gray-50 border-[3px] border-splat-dark rounded-2xl px-5 py-3 font-black text-splat-dark focus:ring-0 focus:outline-none placeholder:text-gray-300"
                                    />
                                </div>

                                <button
                                    onClick={handleAddCustom}
                                    className="w-full py-4 bg-splat-orange text-white border-[3px] border-splat-dark rounded-2xl font-black text-sm shadow-splat-solid-sm active:translate-y-1 active:shadow-none transition-all mt-4"
                                >
                                    ADD TO LIST ➔
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
