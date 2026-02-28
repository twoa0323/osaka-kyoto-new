import { useState, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
    Shield, QrCode, FileText, Image as ImageIcon,
    ExternalLink, Search, Plus, X, Eye,
    CreditCard, Plane, HardDrive, ShieldCheck, ChevronRight, Trash2, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InfoItem } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useTranslation } from '../hooks/useTranslation';

export const Vault = () => {
    const { t } = useTranslation();
    const { trips, currentTripId, updateInfoItem, deleteInfoItem, addInfoItem } = useTripStore();
    const trip = trips.find(t => t.id === currentTripId);
    const infoItems = trip?.infoItems || [];

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<InfoItem | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<Partial<InfoItem>>({ title: '', content: '', images: [], type: 'document' });

    // 1. 分類過濾：找出包含 QR Code (或標註為憑證/門票) 的項目
    const qrItems = useMemo(() => {
        return infoItems.filter(item =>
            item.title.toLowerCase().includes('qr') ||
            item.content.toLowerCase().includes('http') ||
            (item.category as string) === 'booking' ||
            item.title.includes('票') ||
            item.title.includes('Code')
        );
    }, [infoItems]);

    // 2. 主文件：標註為重要或包含「護照」、「保險」關鍵字的項目
    const masterDocs = useMemo(() => {
        return infoItems.filter(item =>
            item.title.includes('護照') ||
            item.title.includes('Passport') ||
            item.title.includes('保險') ||
            item.title.includes('Insurance')
        );
    }, [infoItems]);

    const filteredItems = useMemo(() => {
        if (!searchQuery) return infoItems;
        return infoItems.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [infoItems, searchQuery]);

    if (!trip) return null;

    return (
        <div className="px-5 space-y-8 pb-32 pt-4 bg-[#F4F5F7] h-full overflow-y-auto hide-scrollbar">

            {/* --- Header: Security Banner --- */}
            <div className="bg-p3-navy border-[0.5px] border-white/20 glass-card p-6 shadow-glass-deep relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-p3-gold opacity-10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-p3-gold">
                        <ShieldCheck size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">{t('vault.title')}</h2>
                        <p className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">{t('vault.subtitle')}</p>
                    </div>
                </div>
            </div>

            {/* --- Master Documents: Quick Access Bar --- */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-p3-navy flex items-center gap-2 uppercase tracking-widest pl-2">
                    <div className="w-2 h-5 bg-p3-navy rounded-full" />
                    {t('vault.masterDocs')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {masterDocs.length > 0 ? (
                        masterDocs.map(doc => (
                            <motion.button
                                key={doc.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setSelectedDoc(doc); triggerHaptic('light'); }}
                                className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-md border-[0.5px] border-black/5 rounded-2xl shadow-glass-soft text-left group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-p3-navy/5 flex items-center justify-center text-p3-navy/60 border border-p3-navy/10">
                                    {doc.title.includes('護照') ? <CreditCard size={20} /> : <Shield size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[9px] font-black text-p3-gold uppercase tracking-widest opacity-60">{t('vault.essential')}</div>
                                    <div className="text-xs font-black text-p3-navy truncate">{doc.title}</div>
                                </div>
                            </motion.button>
                        ))
                    ) : (
                        <div className="col-span-2 p-6 bg-white/50 border-2 border-dashed border-gray-300 rounded-3xl text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase">{t('vault.emptyMasterDocs')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Quick Scan Grid: QR Codes & Tickets --- */}
            <div className="space-y-4">
                <div className="flex justify-between items-end px-2">
                    <h3 className="text-sm font-black text-p3-navy flex items-center gap-2 uppercase tracking-widest">
                        <div className="w-2 h-5 bg-splat-pink rounded-full" />
                        {t('vault.quickScan')}
                    </h3>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{qrItems.length} {t('vault.items')}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {qrItems.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => { setSelectedDoc(item); triggerHaptic('medium'); }}
                            className="bg-white border-[0.5px] border-p3-navy rounded-[28px] overflow-hidden shadow-glass-deep-sm group cursor-pointer active:scale-95 transition-all"
                        >
                            <div className="h-32 bg-gray-100 relative flex items-center justify-center border-b-[3px] border-p3-navy overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                                {item.images?.[0] ? (
                                    <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="document" />
                                ) : (
                                    <QrCode size={48} className="text-p3-navy/10 group-hover:rotate-12 transition-transform" />
                                )}
                                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white border-2 border-p3-navy flex items-center justify-center text-p3-navy opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye size={16} />
                                </div>
                            </div>
                            <div className="p-4 bg-white/80">
                                <div className="text-[9px] font-black text-splat-pink uppercase tracking-widest mb-1">{t('vault.passTicket')}</div>
                                <div className="text-xs font-black text-p3-navy truncate">{item.title}</div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Add New Item Card */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            setForm({ title: '', content: '', images: [], type: 'document' });
                            setIsAdding(true);
                        }}
                        className="border-[0.5px] border-dashed border-gray-300 rounded-[28px] h-[180px] flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-p3-navy hover:text-p3-navy transition-colors cursor-pointer"
                    >
                        <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center">
                            <Plus size={24} strokeWidth={3} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">手動新增 / 上傳 (Add)</span>
                    </motion.div>
                </div>
            </div>

            {/* --- General Documents List --- */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-p3-navy flex items-center gap-2 uppercase tracking-widest pl-2">
                    <div className="w-2 h-5 bg-splat-yellow rounded-full" />
                    {t('vault.generalDocs')}
                </h3>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={t('vault.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border-[0.5px] border-p3-navy rounded-2xl py-4 pl-12 pr-4 font-black placeholder:text-gray-300 outline-none focus:bg-white text-xs"
                    />
                </div>

                <div className="space-y-3">
                    {filteredItems.map(item => (
                        <motion.div
                            key={item.id}
                            onClick={() => setSelectedDoc(item)}
                            className="flex items-center gap-4 bg-white p-4 rounded-2xl border-[0.5px] border-p3-navy shadow-glass-deep-sm active:translate-x-1 transition-transform cursor-pointer"
                        >
                            <div className="w-12 h-12 rounded-xl bg-p3-navy/5 flex items-center justify-center text-p3-navy/40 border border-p3-navy/5">
                                <FileText size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-black text-p3-navy truncate">{item.title}</div>
                                <p className="text-[10px] font-medium text-gray-400 truncate mt-0.5">{item.content}</p>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* --- Detail Overlay Modal --- */}
            <AnimatePresence>
                {selectedDoc && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-p3-navy/90 backdrop-blur-xl flex flex-col p-6"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-splat-yellow rounded-xl text-p3-navy border-2 border-white shadow-lg">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    {isEditing ? (
                                        <input
                                            value={form.title}
                                            onChange={e => setForm({ ...form, title: e.target.value })}
                                            className="bg-white/20 border-[0.5px] border-white/40 rounded-lg px-2 py-1 text-white font-black text-lg uppercase italic outline-none w-full"
                                            autoFocus
                                        />
                                    ) : (
                                        <h4 className="text-white font-black text-lg uppercase italic">{selectedDoc.title}</h4>
                                    )}
                                    <p className="text-white/40 text-[10px] uppercase font-black">{t('vault.encryptedDoc')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSelectedDoc(null); setIsEditing(false); }}
                                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white border-2 border-white/20 active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 glass-card border-[0.5px] border-white/40 shadow-glass-deep overflow-hidden relative flex flex-col mt-4">
                            <div
                                className={`flex-1 overflow-y-auto scrollbar-hide p-8 flex items-center justify-center relative ${isEditing ? 'cursor-pointer group' : 'bg-gray-100'}`}
                                onClick={() => {
                                    if (isEditing) {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setForm({ ...form, images: [reader.result as string] });
                                                reader.readAsDataURL(file);
                                            }
                                        };
                                        input.click();
                                    }
                                }}
                            >
                                {(form.images?.[0] || selectedDoc.images?.[0]) ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img src={form.images?.[0] || selectedDoc.images?.[0]} className="max-w-full max-h-full object-contain rounded-lg shadow-xl" alt="full document" />
                                        {isEditing && (
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                                <ImageIcon size={48} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center space-y-4">
                                        <HardDrive size={64} className="text-gray-200 mx-auto" strokeWidth={1} />
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('vault.noPreview')}</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-8 bg-white border-t-[3px] border-p3-navy space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('vault.description')}</div>
                                        {isEditing ? (
                                            <textarea
                                                value={form.content}
                                                onChange={e => setForm({ ...form, content: e.target.value })}
                                                className="w-full bg-gray-50 border-[0.5px] border-p3-navy rounded-xl p-3 text-sm font-bold h-24 outline-none focus:bg-white transition-colors"
                                            />
                                        ) : (
                                            <p className="text-sm font-bold text-p3-navy leading-relaxed h-24 overflow-y-auto">
                                                {selectedDoc.content || t('vault.noNotes')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        {isEditing ? (
                                            <button
                                                onClick={() => {
                                                    updateInfoItem(trip.id, selectedDoc.id, {
                                                        ...selectedDoc,
                                                        title: form.title || selectedDoc.title,
                                                        content: form.content || '',
                                                        images: form.images || selectedDoc.images
                                                    });
                                                    setSelectedDoc(null);
                                                    setIsEditing(false);
                                                    triggerHaptic('success');
                                                }}
                                                className="flex-1 py-4 bg-splat-green text-white rounded-xl shadow-glass-soft flex items-center justify-center gap-2 font-black active:scale-95 transition-all border-[0.5px] border-white/20"
                                            >
                                                {t('common.saveConfirm')}
                                            </button>
                                        ) : (
                                            <>
                                                <button className="flex-1 py-4 bg-p3-navy text-white rounded-xl shadow-glass-soft flex items-center justify-center gap-2 font-black active:scale-95 transition-all border-[0.5px] border-white/20">
                                                    <ExternalLink size={18} /> {t('vault.openFull')}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setForm({ ...selectedDoc });
                                                        setIsEditing(true);
                                                        triggerHaptic('light');
                                                    }}
                                                    className="flex-1 py-4 bg-white/60 backdrop-blur-md text-p3-navy rounded-xl border-[0.5px] border-black/5 flex items-center justify-center gap-2 font-black active:scale-95 transition-all shadow-glass-soft"
                                                >
                                                    <Edit3 size={18} /> {t('common.edit')}
                                                </button>
                                            </>
                                        )}
                                        {!isEditing && (
                                            <button onClick={() => { deleteInfoItem(trip.id, selectedDoc.id); setSelectedDoc(null); triggerHaptic('light'); }} className="shrink-0 w-14 h-14 bg-red-50 text-red-500 rounded-xl border-[0.5px] border-red-200 flex items-center justify-center font-black active:scale-95 transition-all shadow-glass-soft">
                                                <Trash2 size={24} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Add New Document Modal --- */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1200] bg-p3-navy/95 backdrop-blur-2xl flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white border-[4px] border-p3-navy rounded-[40px] w-full max-w-sm overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b-[2px] border-p3-navy flex justify-between items-center bg-splat-yellow/10">
                                <h3 className="text-xl font-black italic uppercase text-p3-navy tracking-tighter">建立新項目 (New Item)</h3>
                                <button onClick={() => setIsAdding(false)} className="w-10 h-10 rounded-full bg-p3-navy text-white flex items-center justify-center active:scale-75 transition-transform"><X size={20} /></button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-p3-navy/30 uppercase tracking-widest pl-1">{t('vault.title')}</label>
                                        <input
                                            value={form.title}
                                            onChange={e => setForm({ ...form, title: e.target.value })}
                                            placeholder="輸入文件名稱 (e.g. 護照、e-Ticket...)"
                                            className="w-full bg-gray-50 border-[0.5px] border-p3-navy rounded-xl p-4 font-black outline-none focus:bg-white transition-colors"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-p3-navy/30 uppercase tracking-widest pl-1">{t('vault.description')}</label>
                                        <textarea
                                            value={form.content}
                                            onChange={e => setForm({ ...form, content: e.target.value })}
                                            placeholder="Add notes..."
                                            className="w-full bg-gray-50 border-[0.5px] border-p3-navy rounded-xl p-4 font-black h-24 outline-none focus:bg-white transition-colors text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-p3-navy/30 uppercase tracking-widest pl-1">Image / Photo</label>
                                        <div
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e) => {
                                                    const file = (e.target as HTMLInputElement).files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setForm({ ...form, images: [reader.result as string] });
                                                        reader.readAsDataURL(file);
                                                    }
                                                };
                                                input.click();
                                            }}
                                            className="w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-p3-navy hover:text-p3-navy transition-all cursor-pointer overflow-hidden"
                                        >
                                            {form.images?.[0] ? (
                                                <img src={form.images[0]} className="w-full h-full object-cover" alt="preview" />
                                            ) : (
                                                <>
                                                    <ImageIcon size={32} strokeWidth={1.5} />
                                                    <span className="text-[10px] font-black uppercase">Upload File</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (!form.title) return;
                                        addInfoItem(trip.id, {
                                            id: Date.now().toString(),
                                            title: form.title,
                                            content: form.content || '',
                                            images: form.images || [],
                                            type: form.type || 'document',
                                            url: ''
                                        });
                                        setIsAdding(false);
                                        triggerHaptic('success');
                                    }}
                                    className="w-full py-5 bg-p3-navy text-white rounded-2xl font-black uppercase tracking-widest shadow-glass-deep active:translate-y-1 transition-all"
                                >
                                    {t('common.saveConfirm')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
