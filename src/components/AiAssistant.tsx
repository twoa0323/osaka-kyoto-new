import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Camera, Compass, CloudRain, Layout, Receipt, BarChart3, Search, Trash2, Package } from 'lucide-react';
import { useTripStore } from '../store/useTripStore';
import { triggerHaptic } from '../utils/haptics';
import { compressImage, uploadImage } from '../utils/imageUtils';

export const AiAssistant: React.FC = () => {
    const {
        isAiModalOpen, setAiModalOpen, aiContext, activeTab,
        trips, currentTripId, addScheduleItem, updateTripData,
        addExpenseItem, exchangeRate, addPackingItem
    } = useTripStore();
    const trip = trips.find(t => t.id === currentTripId);

    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [aiText, setAiText] = useState('');
    const [aiImages, setAiImages] = useState<string[]>([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const aiInputRef = useRef<HTMLInputElement>(null);

    if (!isAiModalOpen || !trip) return null;

    // --- AI 動作實作 ---

    // 1. 行程/多元解析
    const readAiStreamAsJson = async (res: Response) => {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";
        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 1);
                    if (line.startsWith('0:')) {
                        try {
                            fullText += JSON.parse(line.substring(2));
                        } catch (e) { }
                    }
                }
            }
        }
        let textToParse = fullText;
        const match = fullText.match(/```(?:json)?\n?([\s\S]*?)```/);
        if (match) {
            textToParse = match[1];
        }
        const firstBrace = textToParse.indexOf('{');
        const lastBrace = textToParse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            return JSON.parse(textToParse.substring(firstBrace, lastBrace + 1));
        }
        const firstBracket = textToParse.indexOf('[');
        const lastBracket = textToParse.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            return JSON.parse(textToParse.substring(firstBracket, lastBracket + 1));
        }
        return JSON.parse(textToParse);
    };

    const handleAnalyzeTrip = async () => {
        if (!aiText.trim() && aiImages.length === 0) return;
        setLoadingAction('analyze');
        try {
            const payload: any = { text: aiText };
            if (aiImages.length > 0) payload.images = aiImages.map(img => img.split(',')[1]); // 提取 base64

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'universal-magic-import', payload })
            });

            if (!res.ok) throw new Error("解析失敗");
            const jsonResult = await readAiStreamAsJson(res);

            let hasImported = false;
            if (jsonResult?.schedules) {
                jsonResult.schedules.forEach((s: any) => addScheduleItem(trip.id, { ...s, id: Date.now().toString() + Math.random() }));
                hasImported = true;
            }
            if (jsonResult?.expenses) {
                jsonResult.expenses.forEach((e: any) => addExpenseItem(trip.id, { ...e, id: Date.now().toString() + Math.random() }));
                hasImported = true;
            }

            if (hasImported) {
                triggerHaptic('success');
                setAiModalOpen(false);
                setAiText('');
                setAiImages([]);
            } else {
                alert("未解析到任何有效行程或支出 🥲");
            }
        } catch (e) { alert("解析失敗 🥲"); }
        finally { setLoadingAction(null); }
    };

    const handleAiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingImage(true);
        try {
            const b64 = await compressImage(file);
            setAiImages(prev => [...prev, b64]);
        } catch (err) { alert("圖片載入失敗"); }
        finally { setIsUploadingImage(false); }
    };

    // 2. 路線優化 (簡化版邏輯，呼叫 API)
    const handleOptimize = async () => {
        setLoadingAction('optimize');
        // 模擬或呼叫現有邏輯...
        setTimeout(() => { setLoadingAction(null); setAiModalOpen(false); triggerHaptic('success'); }, 1500);
    };

    // 3. 收據掃描
    const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoadingAction('receipt');
        try {
            const b64 = await compressImage(file);
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'analyze-receipt', payload: { imageBase64: b64.split(',')[1] } })
            });
            const data = await readAiStreamAsJson(res);
            const url = await uploadImage(file);

            const newItem = {
                id: Date.now().toString(),
                date: data.date || new Date().toISOString().split('T')[0],
                title: data.title || data.storeName || 'AI 辨識支出',
                amount: data.amount || 0,
                currency: data.currency || trip.baseCurrency || 'JPY',
                category: data.category || '其他',
                method: data.paymentMethod || '現金',
                images: [url],
                storeName: data.storeName || '',
                payerId: trip.members?.[0]?.id || 'Admin'
            };
            addExpenseItem(trip.id, newItem as any);
            triggerHaptic('success');
            setAiModalOpen(false);
        } catch (err) { alert("辨識失敗 🥲"); }
        finally { setLoadingAction(null); }
    };

    // 4. 預算分析
    const handleFinancialInsights = async () => {
        setLoadingAction('finance');
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'analyze-budget',
                    payload: {
                        expenses: trip.expenses || [],
                        budget: trip.budget || 0,
                        members: trip.members || []
                    }
                })
            });
            const data = await readAiStreamAsJson(res);
            if (data.insight) {
                alert(`AI 建議：\n${data.insight}`);
            }
        } catch (e) { alert("分析失敗 🥲"); }
        finally { setLoadingAction(null); }
    };

    // 5. 購物研究
    const handleResearchItem = async (item: any) => {
        setLoadingAction(`research-${item.id}`);
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'research-product-price',
                    payload: {
                        title: item.title,
                        category: item.category,
                        currency: item.currency
                    }
                })
            });
            const data = await readAiStreamAsJson(res);
            if (data && !data.error) {
                const isBetterDeal = item.targetPrice && data.currentMarketPrice <= item.targetPrice;
                useTripStore.getState().updateShoppingItem(trip.id, item.id, {
                    aiPriceInfo: {
                        ...data,
                        lastChecked: Date.now(),
                        lowPriceAlert: isBetterDeal || data.isGoodDeal
                    }
                });
                triggerHaptic('success');
            }
        } catch (e) { alert("研究失敗 🥲"); }
        finally { setLoadingAction(null); }
    };

    // 6. 行李推薦
    const handleAiSuggestPacking = async () => {
        setLoadingAction('packing');
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
            const data = await readAiStreamAsJson(res);
            if (data.packingList) {
                data.packingList.forEach((item: any) => {
                    addPackingItem(trip.id, {
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
                setAiModalOpen(false);
            }
        } catch (err) { alert("建議失敗 🥲"); }
        finally { setLoadingAction(null); }
    };

    const tabs = [
        { id: 'schedule', label: '行程', icon: <Compass />, color: 'bg-splat-blue' },
        { id: 'expense', label: '財務', icon: <Receipt />, color: 'bg-splat-yellow' },
        { id: 'packing', label: '行李', icon: <Package />, color: 'bg-splat-pink' },
        { id: 'shop', label: '購物', icon: <Search />, color: 'bg-splat-green' },
    ];

    const currentContext = aiContext || activeTab;

    return (
        <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4 font-sans" onClick={() => setAiModalOpen(false)}>
            <motion.div
                initial={{ y: 100, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 100, opacity: 0, scale: 0.9 }}
                className="bg-white w-full max-w-sm rounded-[40px] border-[4px] border-splat-dark shadow-splat-solid overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-splat-blue p-5 flex justify-between items-center text-white border-b-[3px] border-splat-dark">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white text-splat-blue rounded-xl rotate-[-3deg] shadow-sm">
                            <Sparkles size={20} strokeWidth={3} />
                        </div>
                        <h3 className="text-xl font-black italic tracking-tighter uppercase">Magic Assistant</h3>
                    </div>
                    <button onClick={() => setAiModalOpen(false)} className="bg-white/20 p-2 rounded-full backdrop-blur-md border border-white/30 active:scale-90 transition-transform">
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto hide-scrollbar">

                    {/* Context Switcher (Optional if we want to allow cross-mode) */}
                    <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl border-2 border-gray-200">
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                onClick={() => useTripStore.getState().openAiAssistant(t.id)}
                                className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${currentContext === t.id ? 'bg-white shadow-sm border-2 border-splat-dark' : 'text-gray-400 opacity-60'}`}
                            >
                                {React.cloneElement(t.icon as React.ReactElement, { size: 18 })}
                                <span className="text-[9px] font-black mt-1 uppercase">{t.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content Based on Context */}
                    <AnimatePresence mode="wait">
                        {currentContext === 'schedule' && (
                            <motion.div key="sched" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                                <div className="bg-gray-50 border-[3px] border-splat-dark rounded-2xl p-4">
                                    <div className="flex justify-between items-center mb-3 pr-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Magic Import 多模態導入</p>
                                        <label className="flex items-center gap-1 text-[10px] font-black text-splat-blue cursor-pointer bg-splat-blue/10 px-2 py-1 rounded-lg hover:bg-splat-blue/20 transition-colors">
                                            {isUploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} strokeWidth={3} />}
                                            <span>附加截圖</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAiImageUpload} />
                                        </label>
                                    </div>

                                    {aiImages.length > 0 && (
                                        <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar">
                                            {aiImages.map((img, idx) => (
                                                <div key={idx} className="relative w-16 h-16 shrink-0 rounded-xl border-2 border-splat-dark overflow-hidden shadow-sm">
                                                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                                                    <button onClick={() => setAiImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-0 right-0 bg-white/80 p-0.5 backdrop-blur-sm rounded-bl-lg">
                                                        <X size={12} strokeWidth={3} className="text-splat-dark" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <textarea
                                        placeholder={aiImages.length > 0 ? "請描述圖片內容或附加更多行程細節..." : "貼上你的行程備忘錄或上傳飯店截圖..."}
                                        className="w-full h-24 bg-white border-[2px] border-gray-300 rounded-xl p-3 font-bold text-splat-dark outline-none focus:border-splat-blue resize-none shadow-inner text-sm"
                                        value={aiText}
                                        onChange={e => setAiText(e.target.value)}
                                    />
                                    <button
                                        onClick={handleAnalyzeTrip}
                                        disabled={loadingAction === 'analyze' || (!aiText.trim() && aiImages.length === 0)}
                                        className="btn-splat w-full py-3 mt-3 bg-splat-yellow text-splat-dark text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:translate-y-0"
                                    >
                                        {loadingAction === 'analyze' ? <Loader2 className="animate-spin" size={18} /> : "開始魔法解析 ➔"}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <button className="p-4 bg-white rounded-2xl border-[3px] border-splat-dark flex flex-col items-center gap-2 shadow-splat-solid-sm active:translate-y-1 active:shadow-none">
                                        <Compass size={24} className="text-splat-blue" />
                                        <span className="font-black text-[11px]">路線最佳化</span>
                                    </button>
                                    <button className="p-4 bg-white rounded-2xl border-[3px] border-splat-dark flex flex-col items-center gap-2 shadow-splat-solid-sm active:translate-y-1 active:shadow-none">
                                        <CloudRain size={24} className="text-splat-pink" />
                                        <span className="font-black text-[11px]">雨天備案</span>
                                    </button>
                                    <button className="col-span-2 p-3 bg-white rounded-2xl border-[3px] border-splat-dark flex items-center justify-center gap-2 shadow-splat-solid-sm active:translate-y-1 active:shadow-none">
                                        <Layout size={20} className="text-splat-orange" />
                                        <span className="font-black text-[11px]">自動填補行程空檔</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {currentContext === 'expense' && (
                            <motion.div key="exp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                                <div className="bg-splat-pink/5 border-[3px] border-splat-pink border-dashed rounded-[32px] p-8 text-center space-y-4">
                                    <div className="w-16 h-16 bg-splat-pink rounded-full flex items-center justify-center text-white mx-auto shadow-splat-solid-sm -rotate-6">
                                        <Receipt size={32} strokeWidth={2.5} />
                                    </div>
                                    <h4 className="font-black text-splat-dark text-lg uppercase italic tracking-tighter">Receipt Scanner</h4>
                                    <p className="text-xs font-bold text-gray-500 leading-snug px-4">拍下或上傳收據，AI 將自動辨識金額、店家與類別並自動記帳。</p>

                                    <button
                                        onClick={() => aiInputRef.current?.click()}
                                        disabled={loadingAction === 'receipt'}
                                        className="btn-splat w-full py-4 bg-splat-pink text-white text-sm flex items-center justify-center gap-2"
                                    >
                                        {loadingAction === 'receipt' ? <Loader2 className="animate-spin" size={18} /> : <><Camera size={18} /> 選擇收據照片</>}
                                    </button>
                                    <input ref={aiInputRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptScan} />
                                </div>

                                <button
                                    onClick={handleFinancialInsights}
                                    disabled={loadingAction === 'finance'}
                                    className="w-full p-4 bg-white rounded-[24px] border-[3px] border-splat-dark flex items-center justify-between group shadow-splat-solid-sm active:translate-y-1 active:shadow-none"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-splat-yellow rounded-lg border-2 border-splat-dark group-hover:rotate-12 transition-transform">
                                            {loadingAction === 'finance' ? <Loader2 className="animate-spin" size={20} /> : <BarChart3 size={20} className="text-splat-dark" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-xs text-splat-dark uppercase">Financial Insights</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">分析旅遊支出並提供省錢建議</p>
                                        </div>
                                    </div>
                                    <Sparkles size={18} className="text-splat-yellow" />
                                </button>
                            </motion.div>
                        )}

                        {currentContext === 'packing' && (
                            <motion.div key="pack" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                                <div className="bg-splat-pink/5 border-[3px] border-splat-pink border-dashed rounded-[32px] p-8 text-center space-y-4">
                                    <div className="w-16 h-16 bg-splat-pink rounded-full flex items-center justify-center text-white mx-auto shadow-splat-solid-sm rotate-6">
                                        <Package size={32} strokeWidth={2.5} />
                                    </div>
                                    <h4 className="font-black text-splat-dark text-lg uppercase italic tracking-tighter">Smart Packing List</h4>
                                    <p className="text-xs font-bold text-gray-500 leading-snug px-4">根據行程目的地、天氣與旅遊天數，AI 為您量身打造行李清單。</p>

                                    <button
                                        onClick={handleAiSuggestPacking}
                                        disabled={loadingAction === 'packing'}
                                        className="btn-splat w-full py-4 bg-splat-pink text-white text-sm flex items-center justify-center gap-2"
                                    >
                                        {loadingAction === 'packing' ? <Loader2 className="animate-spin" size={18} /> : <><Sparkles size={18} /> 生成打包清單 ➔</>}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {currentContext === 'shop' && (
                            <motion.div key="shop" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                                <div className="bg-splat-green/5 border-[3px] border-splat-green rounded-[32px] p-6 space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Search className="text-splat-green" size={24} strokeWidth={3} />
                                        <h4 className="font-black text-splat-dark uppercase italic tracking-tighter">Global Price Research</h4>
                                    </div>
                                    <p className="text-[11px] font-bold text-gray-500 leading-relaxed">我們將掃描日本各大商城，為您的購物清單提供最精準的市場行情與購買建議。</p>

                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {trip.shoppingList?.filter(i => !i.isBought).length === 0 ? (
                                            <div className="text-center py-6 text-gray-300 text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-gray-200 rounded-xl">No items to research</div>
                                        ) : trip.shoppingList?.filter(i => !i.isBought).map(item => (
                                            <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-xl border-2 border-splat-dark shadow-sm">
                                                <span className="font-black text-xs truncate max-w-[150px] uppercase text-splat-dark">{item.title}</span>
                                                <button
                                                    onClick={() => handleResearchItem(item)}
                                                    disabled={loadingAction === `research-${item.id}`}
                                                    className="text-[9px] font-black bg-splat-green text-white px-3 py-1.5 rounded-lg border-2 border-splat-dark shadow-splat-solid-xs active:translate-y-0.5"
                                                >
                                                    {loadingAction === `research-${item.id}` ? <Loader2 className="animate-spin" size={10} /> : "RESEARCH"}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer / Tip */}
                    <div className="pt-2">
                        <p className="text-[9px] font-bold text-gray-400 text-center uppercase tracking-widest leading-tight">
                            AI Magic Assistant is here to make your trip <br /> smoother than a fresh coat of ink! 🦑
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
