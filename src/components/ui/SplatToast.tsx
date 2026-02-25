import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const SplatToast: React.FC = () => {
    const toast = useTripStore((state) => state.toast);
    const showToast = useTripStore((state) => state.showToast);

    return (
        <AnimatePresence>
            {toast && (
                <div className="fixed top-0 left-0 right-0 z-[3000] flex justify-center pointer-events-none p-4 pt-[env(safe-area-inset-top,1rem)]">
                    <motion.div
                        initial={{ y: -100, opacity: 0, scale: 0.5, rotate: -5 }}
                        animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                        transition={{ type: "spring", damping: 12, stiffness: 200 }}
                        className={`
              pointer-events-auto
              px-6 py-4 rounded-[2.5rem] border-[4px] border-splat-dark shadow-splat-solid
              flex items-center gap-4 min-w-[300px] max-w-[95vw]
              ${toast.type === 'success' ? 'bg-splat-green text-white' :
                                toast.type === 'error' ? 'bg-splat-pink text-white' :
                                    'bg-splat-yellow text-splat-dark'}
            `}
                        style={{
                            borderRadius: '60% 40% 70% 30% / 40% 60% 30% 70%'
                        }}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            {toast.type === 'success' && <CheckCircle2 size={24} strokeWidth={3} />}
                            {toast.type === 'error' && <AlertCircle size={24} strokeWidth={3} />}
                            {toast.type === 'info' && <Info size={24} strokeWidth={3} />}

                            <span className="font-black italic text-sm tracking-tight leading-tight">
                                {toast.message}
                            </span>
                        </div>

                        {toast.action && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toast.action?.onClick();
                                }}
                                className="bg-white text-splat-dark border-[3px] border-splat-dark px-3 py-1 rounded-xl font-black text-xs shadow-splat-solid-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
                            >
                                {toast.action.label}
                            </button>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
