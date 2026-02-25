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
                        initial={{ y: -100, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -100, opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", damping: 15, stiffness: 200 }}
                        className={`
              pointer-events-auto
              px-6 py-4 rounded-[2rem] border-[4px] border-splat-dark shadow-splat-solid
              flex items-center gap-3 min-w-[280px] max-w-[90vw]
              ${toast.type === 'success' ? 'bg-splat-green text-white' :
                                toast.type === 'error' ? 'bg-splat-pink text-white' :
                                    'bg-splat-yellow text-splat-dark'}
            `}
                        style={{
                            clipPath: 'path("M10,20 Q0,25 5,35 T15,45 Q25,55 40,50 T65,45 Q85,40 90,25 T80,10 Q65,0 45,5 T15,10 Q5,15 10,20 Z")',
                            // Above clipPath is a placeholder for irregular splat shape, 
                            // but since standard clipPath with path is complex for responsive, 
                            // we'll use a stylized border-radius + wave-like CSS instead for better reliability.
                            borderRadius: '60% 40% 70% 30% / 40% 60% 30% 70%'
                        }}
                    >
                        {toast.type === 'success' && <CheckCircle2 size={24} strokeWidth={3} />}
                        {toast.type === 'error' && <AlertCircle size={24} strokeWidth={3} />}
                        {toast.type === 'info' && <Info size={24} strokeWidth={3} />}

                        <span className="font-black italic text-sm tracking-tight">
                            {toast.message}
                        </span>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
