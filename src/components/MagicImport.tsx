import React, { useState, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
    Sparkles, Camera, X, Plus, Check, Loader2,
    Trash2, AlertCircle, Calendar, CreditCard, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../utils/imageUtils';
import { triggerHaptic } from '../utils/haptics';

interface ParsedResult {
    expenses: any[];
    bookings: any[];
    schedules: any[];
    journals: any[];
    shopping: any[];
    info: any[];
    triggers?: string[];
    suggestedPackingItems?: string[];
}

export const MagicImport = () => {
    const {
        trips, currentTripId,
        addExpenseItem, addBookingItem, addScheduleItem,
        addJournalItem, addShoppingItem, addInfoItem, addPackingItem
    } = useTripStore();
    const trip = trips.find(t => t.id === currentTripId);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEnriching, setIsEnriching] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedResult | null>(null);
    const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });

    if (!trip) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (files.length + selectedFiles.length > 10) {
                alert("一次最多可以捕捉 10 個墨跡唷！🎨");
                return;
            }
            setSelectedFiles(prev => [...prev, ...files]);
            triggerHaptic('light');
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        triggerHaptic('medium');
    };

    const handleStartParsing = async () => {
        if (selectedFiles.length === 0) return;
        setIsProcessing(true);
        triggerHaptic('success');

        try {
            // 1. 壓縮所有圖片為 Base64 (Gemini 需要)
            const imageBase64s = await Promise.all(selectedFiles.map(f => compressImage(f)));
            const strippedBase64s = imageBase64s.map(b => b.split(',')[1]); // 移除 data:image/webp;base64,

            // 2. 呼叫 AI 批次辨識
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'batch-screenshot-parse',
                    payload: {
                        images: strippedBase64s,
                        startDate: trip.startDate,
                        endDate: trip.endDate,
                        rate: trip.lastFetchedRate || 4.7,
                        budget: trip.budget || 0
                    }
                })
            });

            const data = await res.json();
            if (data && !data.error) {
                // 開始圖片配對階段
                setIsEnriching(true);
                const enriched = await enrichDataWithImages(data);
                setParsedData(enriched);
            } else {
                alert("AI 墨跡辨識失敗... 請再試一次！👾");
            }
        } catch (err) {
            console.error(err);
            alert("傳輸發生錯誤，或是圖片太大了！🔋");
        } finally {
            setIsProcessing(false);
            setIsEnriching(false);
        }
    };

    const enrichDataWithImages = async (data: ParsedResult) => {
        const fetchImage = async (item: any, category: string) => {
            try {
                // 加入 3000ms 延遲以符合 Gemini 免費版 RPM 限制 (15 RPM ≈ 每 4 秒 1 次)
                await new Promise(resolve => setTimeout(resolve, 3000));

                const res = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'get-image-for-item',
                        payload: {
                            title: item.title || item.storeName,
                            location: item.location,
                            category
                        }
                    })
                });
                const { imageUrl } = await res.json();
                return { ...item, images: imageUrl ? [imageUrl] : [] };
            } catch (e) {
                return item;
            }
        };

        const enriched = { ...data };

        // 改為循序循環執行，解決並行過多導致 429 的問題
        const categories = [
            { key: 'expenses', label: 'expense' },
            { key: 'bookings', label: 'booking' },
            { key: 'schedules', label: 'schedule' },
            { key: 'journals', label: 'journal' },
            { key: 'shopping', label: 'shopping' }
        ];

        const totalToEnrich = categories.reduce((acc, cat) => {
            const items = (data as any)[cat.key];
            return acc + (Array.isArray(items) ? items.length : 0);
        }, 0);

        setEnrichProgress({ current: 0, total: totalToEnrich });
        let processedCount = 0;

        for (const cat of categories) {
            const items = (enriched as any)[cat.key];
            if (items && Array.isArray(items)) {
                const enrichedItems = [];
                for (const item of items) {
                    const result = await fetchImage(item, cat.label);
                    enrichedItems.push(result);
                    processedCount++;
                    setEnrichProgress({ current: processedCount, total: totalToEnrich });
                }
                (enriched as any)[cat.key] = enrichedItems;
            }
        }

        return enriched;
    };

    const handleImport = () => {
        if (!parsedData) return;

        // 批量匯入
        parsedData.expenses.forEach(item => {
            addExpenseItem(trip.id, {
                ...item,
                id: 'bulk-' + Math.random().toString(36).substr(2, 9),
                images: [],
                payerId: trip.members[0]?.id || 'me',
                splitWith: trip.members.map(m => ({ memberId: m.id }))
            });
        });

        parsedData.bookings.forEach(item => {
            addBookingItem(trip.id, {
                ...item,
                id: 'bulk-' + Math.random().toString(36).substr(2, 9),
                images: [],
                note: item.note || 'AI 自動辨識匯入'
            });
        });

        parsedData.journals?.forEach(item => {
            addJournalItem(trip.id, {
                ...item,
                id: 'bulk-' + Math.random().toString(36).substr(2, 9),
                images: [],
                updatedAt: Date.now()
            });
        });

        parsedData.shopping?.forEach(item => {
            addShoppingItem(trip.id, {
                ...item,
                id: 'bulk-' + Math.random().toString(36).substr(2, 9),
                isBought: false,
                images: [],
                updatedAt: Date.now()
            });
        });

        parsedData.info?.forEach(item => {
            addInfoItem(trip.id, {
                ...item,
                id: 'bulk-' + Math.random().toString(36).substr(2, 9),
                images: [],
                updatedAt: Date.now()
            });
        });

        // 處理跨模組觸發：加入建議的行李清單
        if (parsedData.triggers?.includes('add_to_packing') && parsedData.suggestedPackingItems) {
            parsedData.suggestedPackingItems.forEach(itemName => {
                addPackingItem(trip.id, {
                    id: 'pack-' + Math.random().toString(36).substr(2, 9),
                    title: itemName,
                    quantity: 1,
                    category: '其他',
                    isPacked: false,
                    updatedAt: Date.now()
                });
            });
        }

        // 處理預算警告觸發
        const hasBudgetAlert = parsedData.triggers?.includes('budget_alert');

        triggerHaptic('success');
        setIsOpen(false);
        setParsedData(null);
        setSelectedFiles([]);

        const total = parsedData.expenses.length + parsedData.bookings.length +
            parsedData.schedules.length + (parsedData.journals?.length || 0) +
            (parsedData.shopping?.length || 0) + (parsedData.info?.length || 0);

        let alertMsg = `成功噴漆！已新增 ${total} 筆旅遊墨跡！🎨🦑`;
        if (parsedData.suggestedPackingItems?.length) {
            alertMsg += `\n✨ AI 智能連動：已為您自動加入 ${parsedData.suggestedPackingItems.length} 項推薦行李！💼`;
        }
        if (hasBudgetAlert) {
            alertMsg += `\n⚠️ 預算守門員提醒：本次匯入中包含超額支出，請注意預算！💸`;
        }
        alert(alertMsg);
    };

    return (
        <>
            {/* 浮動按鈕入口 */}
            <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="fixed right-6 bottom-32 z-40 w-16 h-16 bg-splat-yellow border-[4px] border-splat-dark rounded-full shadow-splat-solid flex items-center justify-center text-splat-dark"
            >
                <Sparkles size={32} strokeWidth={3} />
                <div className="absolute -top-2 -right-2 bg-splat-pink text-white text-[8px] font-black px-2 py-1 rounded-full border-2 border-splat-dark uppercase animate-bounce">
                    Magic
                </div>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => !isProcessing && setIsOpen(false)}
                            className="absolute inset-0 bg-splat-dark/60 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            className="bg-white w-full max-w-xl rounded-t-[40px] sm:rounded-[40px] border-[4px] border-splat-dark p-8 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-splat-dark">Magic Bulk Import</h2>
                                    <p className="text-xs font-bold text-gray-400">一次餵食 AI 多張截圖，自動分類匯入！🧠</p>
                                </div>
                                {!isProcessing && (
                                    <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-100 rounded-full border-2 border-splat-dark hover:bg-white transition-colors">
                                        <X size={24} strokeWidth={3} />
                                    </button>
                                )}
                            </div>

                            {!parsedData ? (
                                <div className="space-y-8">
                                    {/* 選擇區 */}
                                    <div className="grid grid-cols-3 gap-4">
                                        {selectedFiles.map((file, i) => (
                                            <motion.div
                                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                key={i} className="relative aspect-square rounded-2xl border-[3px] border-splat-dark overflow-hidden group shadow-splat-solid-sm"
                                            >
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => removeFile(i)}
                                                    className="absolute top-1 right-1 bg-white p-1 rounded-full border-2 border-splat-dark opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} strokeWidth={4} />
                                                </button>
                                            </motion.div>
                                        ))}
                                        {selectedFiles.length < 10 && (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-square rounded-2xl border-[3px] border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-splat-blue hover:text-splat-blue hover:bg-splat-blue/5 transition-all"
                                            >
                                                <Plus size={32} strokeWidth={3} />
                                                <span className="text-[10px] font-black uppercase mt-2">Add Photo</span>
                                            </button>
                                        )}
                                    </div>

                                    <input
                                        type="file" multiple accept="image/*"
                                        className="hidden" ref={fileInputRef}
                                        onChange={handleFileChange}
                                    />

                                    <button
                                        disabled={selectedFiles.length === 0 || isProcessing}
                                        onClick={handleStartParsing}
                                        className={`btn-splat w-full py-5 text-xl flex items-center justify-center gap-3 ${selectedFiles.length === 0 ? 'bg-gray-200 text-gray-400' : 'bg-splat-blue text-white'}`}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={24} strokeWidth={3} />
                                                {isEnriching
                                                    ? `抓取美照中 (${enrichProgress.current} / ${enrichProgress.total})...`
                                                    : 'AI 墨跡分析中...'}
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={24} strokeWidth={3} />
                                                啟動批次辨識 ( {selectedFiles.length} )
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-splat-pink/5 border-[3px] border-splat-pink rounded-3xl p-6 relative overflow-hidden">
                                        <div className="absolute top-[-20px] right-[-20px] text-splat-pink/10 -rotate-12">
                                            <Sparkles size={120} />
                                        </div>
                                        <h3 className="text-xl font-black text-splat-pink italic mb-2">辨識結果摘要</h3>
                                        <div className="flex flex-wrap gap-2">
                                            <ResultBadge icon={<Wallet size={12} />} label="支出" count={parsedData.expenses.length} color="bg-splat-yellow" />
                                            <ResultBadge icon={<CreditCard size={12} />} label="預訂" count={parsedData.bookings.length} color="bg-splat-pink" />
                                            <ResultBadge icon={<Calendar size={12} />} label="行程" count={parsedData.schedules.length} color="bg-splat-blue" />
                                            <ResultBadge icon={<Sparkles size={12} />} label="美食" count={parsedData.journals?.length || 0} color="bg-splat-orange" />
                                            <ResultBadge icon={<Plus size={12} />} label="購物" count={parsedData.shopping?.length || 0} color="bg-splat-green" />
                                            <ResultBadge icon={<AlertCircle size={12} />} label="資訊" count={parsedData.info?.length || 0} color="bg-splat-dark text-white" />
                                        </div>
                                    </div>

                                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {/* 詳細列表 */}
                                        {parsedData.expenses.length > 0 && (
                                            <>
                                                <SectionLabel title="Expenses" />
                                                {parsedData.expenses.map((ex, i) => (
                                                    <ReviewRow key={i} title={ex.storeName || ex.title} desc={`${ex.currency} ${ex.amount}`} date={ex.date} color="border-splat-yellow" images={ex.images} />
                                                ))}
                                            </>
                                        )}

                                        {parsedData.bookings.length > 0 && (
                                            <>
                                                <SectionLabel title="Bookings" />
                                                {parsedData.bookings.map((bk, i) => (
                                                    <ReviewRow key={i} title={bk.title} desc={bk.type.toUpperCase()} date={bk.date} color="border-splat-pink" images={bk.images} />
                                                ))}
                                            </>
                                        )}

                                        {parsedData.schedules.length > 0 && (
                                            <>
                                                <SectionLabel title="Schedules & Spots" />
                                                {parsedData.schedules.map((sc, i) => (
                                                    <ReviewRow key={i} title={sc.title} desc={`${sc.time || 'All Day'} @ ${sc.location}`} date={sc.date} color="border-splat-blue" images={sc.images} />
                                                ))}
                                            </>
                                        )}

                                        {parsedData.journals?.length > 0 && (
                                            <>
                                                <SectionLabel title="Food & Logs" />
                                                {parsedData.journals.map((jo, i) => (
                                                    <ReviewRow key={i} title={jo.title} desc={jo.content} date={jo.date} color="border-splat-orange" images={jo.images} />
                                                ))}
                                            </>
                                        )}

                                        {parsedData.shopping?.length > 0 && (
                                            <>
                                                <SectionLabel title="Shopping List" />
                                                {parsedData.shopping.map((sh, i) => (
                                                    <ReviewRow key={i} title={sh.title} desc={`${sh.currency} ${sh.price}`} date="Wishlist" color="border-splat-green" images={sh.images} />
                                                ))}
                                            </>
                                        )}

                                        {parsedData.info?.length > 0 && (
                                            <>
                                                <SectionLabel title="Travel Info" />
                                                {parsedData.info.map((inf, i) => (
                                                    <ReviewRow key={i} title={inf.title} desc={inf.content} date={inf.type.toUpperCase()} color="border-splat-dark" images={inf.images} />
                                                ))}
                                            </>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <button
                                            onClick={() => { setParsedData(null); setSelectedFiles([]); }}
                                            className="btn-splat py-4 bg-gray-100 text-gray-500 text-sm"
                                        >
                                            重新選擇
                                        </button>
                                        <button
                                            onClick={handleImport}
                                            className="btn-splat py-4 bg-splat-green text-white text-lg flex items-center justify-center gap-2"
                                        >
                                            確認匯入 <Check size={20} strokeWidth={4} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

const ResultBadge = ({ icon, label, count, color }: any) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-splat-dark text-splat-dark font-black text-xs ${color}`}>
        {icon} {count} {label}
    </div>
);

const SectionLabel = ({ title }: { title: string }) => (
    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] border-b-2 border-gray-100 pb-1 mt-4">{title}</p>
);

const ReviewRow = ({ title, desc, date, color, images }: any) => (
    <div className={`bg-gray-50 border-l-[6px] ${color} rounded-xl p-3 flex justify-between items-center mb-2`}>
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
            {images?.[0] && (
                <div className="w-12 h-12 rounded-lg border-2 border-splat-dark overflow-hidden shrink-0 shadow-sm">
                    <img src={images[0]} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="min-w-0">
                <h4 className="font-black text-sm truncate">{title}</h4>
                <p className="text-[10px] font-bold text-gray-400 truncate">{desc}</p>
            </div>
        </div>
        <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-md border-2 border-splat-dark shadow-sm shrink-0">{date}</span>
    </div>
);
