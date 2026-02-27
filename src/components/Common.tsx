import React from 'react';
import { motion } from 'framer-motion';
import { ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useAnimate } from 'framer-motion';

interface SettingToggleProps {
    label: string;
    desc: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

export const SettingToggle: React.FC<SettingToggleProps> = ({ label, desc, enabled, onChange }) => (
    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border-2 border-gray-100">
        <div className="text-left">
            <p className="font-black text-sm text-splat-dark">{label}</p>
            <p className="text-[10px] font-bold text-gray-400">{desc}</p>
        </div>
        <button onClick={() => onChange(!enabled)} className={`transition-colors ${enabled ? 'text-splat-green' : 'text-gray-300'}`}>
            {enabled ? <ToggleRight size={40} strokeWidth={2.5} /> : <ToggleLeft size={40} strokeWidth={2.5} />}
        </button>
    </div>
);

export const InkSplat: React.FC<{ color: string }> = ({ color }) => (
    <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 4.5, opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed pointer-events-none z-[9999]"
        style={{
            top: '50%',
            left: '50%',
            width: '150px',
            height: '150px',
            backgroundColor: color,
            marginLeft: '-75px',
            marginTop: '-75px',
            borderRadius: '43% 57% 38% 62% / 57% 43% 57% 43%',
            filter: 'blur(2px)'
        }}
    />
);

interface SwipeableItemProps {
    id: string;
    children: React.ReactNode;
    onDelete: () => void;
    className?: string;
    disabled?: boolean;
}

export const SwipeableItem: React.FC<SwipeableItemProps> = ({ id, children, onDelete, className = "", disabled = false }) => {
    const [scope, animate] = useAnimate();
    const [isRevealed, setIsRevealed] = React.useState(false);
    const [hasTriggeredHaptic, setHasTriggeredHaptic] = React.useState(false);

    const handleDragEnd = (_: any, info: any) => {
        if (disabled) return;
        // 使用 info.offset.x 或 info.point.x 的相對位移
        // 為了更精確，我們檢查最終的 x 位置
        if (info.offset.x < -40 || info.velocity.x < -500) {
            // 鎖定在 -80px
            animate(scope.current, { x: -80 }, { type: "spring", bounce: 0.2, duration: 0.4 });
            setIsRevealed(true);
        } else {
            // 彈回 0
            animate(scope.current, { x: 0 }, { type: "spring", bounce: 0.2, duration: 0.4 });
            setIsRevealed(false);
            setHasTriggeredHaptic(false);
        }
    };

    return (
        <div className={`relative overflow-hidden rounded-[24px] ${className} select-none touch-pan-y`}>
            {/* 底層: 紅色刪除區域 */}
            <div className="absolute inset-y-0 right-0 w-[100px] bg-red-500 flex justify-end items-center pr-8 z-0">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        triggerHaptic('medium');
                        onDelete();
                    }}
                    className="p-3 text-white active:scale-90 transition-transform relative z-50"
                >
                    <Trash2 size={24} strokeWidth={3} />
                </button>
            </div>

            {/* 頂層: 內容區域 */}
            <motion.div
                ref={scope}
                drag={disabled ? false : "x"}
                dragConstraints={{ right: 0, left: -100 }}
                dragElastic={0.05}
                onDrag={(_, info) => {
                    if (disabled) return;
                    if (info.offset.x <= -80 && !hasTriggeredHaptic) {
                        triggerHaptic('light');
                        setHasTriggeredHaptic(true);
                    } else if (info.offset.x > -80 && hasTriggeredHaptic) {
                        setHasTriggeredHaptic(false);
                    }
                }}
                onDragEnd={handleDragEnd}
                whileTap={{ cursor: disabled ? 'default' : 'grabbing' }}
                className="relative z-10"
            >
                {isRevealed && (
                    <button
                        className="absolute inset-0 z-[100] bg-transparent cursor-default"
                        onClick={(e) => {
                            e.stopPropagation();
                            animate(scope.current, { x: 0 }, { type: "spring", bounce: 0.2, duration: 0.4 });
                            setIsRevealed(false);
                        }}
                    />
                )}
                {children}
            </motion.div>
        </div>
    );
};
