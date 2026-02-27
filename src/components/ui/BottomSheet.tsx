import { FC, ReactNode } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    className?: string;
}

export const BottomSheet: FC<BottomSheetProps> = ({ isOpen, onClose, children, title, className }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-splat-dark/60 backdrop-blur-[2px] z-[2000] cursor-pointer"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) onClose();
                        }}
                        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t-[4px] border-splat-dark rounded-t-[40px] z-[2001] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] flex flex-col max-h-[92vh]"
                    >
                        {/* Indicator / Drag Handle */}
                        <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full border border-gray-300" />
                        </div>

                        {title && (
                            <div className="px-6 py-2 border-b-2 border-dashed border-gray-100">
                                <h3 className="text-lg font-black italic text-splat-dark uppercase tracking-tight">{title}</h3>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-12 pt-4">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
