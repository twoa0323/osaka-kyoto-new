import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Sparkles, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface WeatherReportModalProps {
    onClose: () => void;
    todayHourly: any[];
    getWeatherDesc: (code: number) => { t: string; e: string };
}

export const WeatherReportModal: React.FC<WeatherReportModalProps> = ({
    onClose, todayHourly, getWeatherDesc
}) => (
    <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-md z-[500] p-4 flex items-center justify-center" onClick={onClose}>
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#F4F5F7] w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-splat-solid overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            <div className="bg-splat-yellow p-5 flex justify-between items-center text-splat-dark border-b-[3px] border-splat-dark">
                <h3 className="text-xl font-black italic tracking-widest flex items-center gap-2"><Clock size={20} strokeWidth={3} /> 24H REPORT</h3>
                <button onClick={onClose} className="bg-white p-1.5 rounded-full border-2 border-splat-dark shadow-sm active:scale-90 transition-transform"><X size={20} strokeWidth={3} /></button>
            </div>

            <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto hide-scrollbar bg-[radial-gradient(#D1D5DB_1.5px,transparent_1px)] bg-[size:16px_16px]">
                {todayHourly.length > 0 ? todayHourly.map((h, i) => {
                    const hrInfo = getWeatherDesc(h.code);
                    return (
                        <div key={i} className="flex justify-between items-center bg-white p-4 rounded-2xl border-[3px] border-splat-dark shadow-sm">
                            <div className="w-14">
                                <span className="font-black text-splat-dark text-sm block">{format(parseISO(h.time), 'HH:00')}</span>
                                <span className="text-[9px] font-black text-splat-blue uppercase tracking-wider">{h.cityName}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-1 px-2 border-l-2 border-r-2 border-dashed border-gray-200 mx-2">
                                <span className="text-2xl drop-shadow-sm">{hrInfo.e}</span>
                                <span className="text-xs font-black text-gray-600">{hrInfo.t}</span>
                            </div>
                            <div className="flex items-center gap-3 text-right">
                                <span className="text-[10px] font-black text-splat-pink w-10">{h.prob}%</span>
                                <span className="font-black text-xl text-splat-dark w-8">{Math.round(h.temp)}°</span>
                            </div>
                        </div>
                    )
                }) : (
                    <div className="text-center py-10 font-black text-gray-400 bg-white rounded-2xl border-[3px] border-dashed border-gray-300">NO DATA AVAILABLE</div>
                )}
            </div>
        </motion.div>
    </div>
);

interface AiAssistantModalProps {
    onClose: () => void;
    onAnalyze: (text: string) => Promise<void>;
    isAiLoading: boolean;
    onOptimize: () => void;
    isOptimizing: boolean;
    canOptimize: boolean;
    onWeather: () => void;
    isWizardLoading: boolean;
    onFillGaps: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
    onClose, onAnalyze, isAiLoading, onOptimize, isOptimizing, canOptimize, onWeather, isWizardLoading, onFillGaps
}) => {
    const [aiText, setAiText] = useState('');

    return (
        <div className="fixed inset-0 bg-splat-dark/60 backdrop-blur-md z-[700] flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-splat-solid p-6 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black text-splat-dark flex items-center gap-2 italic uppercase">
                        <div className="p-2 bg-splat-blue text-white rounded-xl border-2 border-splat-dark -rotate-3"><Sparkles size={20} /></div> AI 魔法助手
                    </h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full border-2 border-splat-dark active:scale-90 transition-transform"><X strokeWidth={3} /></button>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="bg-gray-50 border-[3px] border-splat-dark rounded-2xl p-4">
                        <textarea
                            placeholder="貼上你的行程文字（例如：10:00...）"
                            className="w-full h-24 bg-white border-[2px] border-gray-300 rounded-xl p-3 font-bold text-splat-dark outline-none focus:border-splat-blue resize-none shadow-inner text-sm"
                            value={aiText}
                            onChange={e => setAiText(e.target.value)}
                        />
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onAnalyze(aiText)}
                            disabled={isAiLoading || !aiText.trim()}
                            className="btn-splat w-full py-3 mt-3 bg-splat-yellow text-splat-dark text-sm flex items-center justify-center gap-2 rounded-xl"
                        >
                            {isAiLoading ? <Loader2 className="animate-spin" size={18} /> : "開始解析行程文字 ➔"}
                        </motion.button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { onClose(); onOptimize(); }}
                            disabled={isOptimizing || !canOptimize}
                            className={`p-3 rounded-2xl border-[3px] border-splat-dark flex flex-col items-center justify-center gap-2 shadow-splat-solid-sm ${(isOptimizing || !canOptimize) ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'bg-white active:translate-y-1 active:shadow-none'}`}
                        >
                            {isOptimizing ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} className="text-splat-blue" />}
                            <span className="font-black text-[11px]">路線最佳化</span>
                        </motion.button>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { onClose(); onWeather(); }}
                            disabled={isWizardLoading}
                            className={`p-3 rounded-2xl border-[3px] border-splat-dark flex flex-col items-center justify-center gap-2 shadow-splat-solid-sm ${isWizardLoading ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'bg-white active:translate-y-1 active:shadow-none'}`}
                        >
                            {isWizardLoading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} className="text-splat-pink" />}
                            <span className="font-black text-[11px]">雨天備案</span>
                        </motion.button>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { onClose(); onFillGaps(); }}
                            className="col-span-2 p-3 bg-white rounded-2xl border-[3px] border-splat-dark flex items-center justify-center gap-2 shadow-splat-solid-sm active:translate-y-1 active:shadow-none"
                        >
                            <Sparkles size={20} className="text-splat-yellow" />
                            <span className="font-black text-[11px]">自動填補行程空檔</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
