import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineStatus = () => {
    const isOnline = useNetworkStatus();

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-splat-pink text-white rounded-full border-2 border-splat-dark shadow-splat-solid-sm text-[9px] font-black uppercase tracking-wider relative z-[150]"
                >
                    <WifiOff size={10} strokeWidth={4} />
                    Offline Mode 📡
                </motion.div>
            )}
        </AnimatePresence>
    );
};
