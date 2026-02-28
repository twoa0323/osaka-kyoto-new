import { FC, ReactNode, useState, useEffect } from 'react';
import { motion, useAnimate } from 'framer-motion';
import { ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useGyroscope } from '../hooks/useGyroscope';

interface SettingToggleProps {
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

export const SettingToggle: FC<SettingToggleProps> = ({ label, enabled, onChange }) => (
    <div className="flex justify-between items-center bg-white/40 backdrop-blur-xl p-4 rounded-[24px] border-[0.5px] border-white/30 shadow-glass-soft transition-all active:scale-[0.98]">
        <div className="text-left">
            <p className="font-black text-[13px] text-splat-dark uppercase tracking-tight opacity-80">{label}</p>
        </div>
        <button onClick={() => onChange(!enabled)} className={`transition-all duration-500 ${enabled ? 'text-p3-ruby scale-110 drop-shadow-[0_0_8px_var(--p3-ruby-fallback)]' : 'text-gray-200'}`}>
            {enabled ? <ToggleRight size={36} strokeWidth={3} /> : <ToggleLeft size={36} strokeWidth={3} />}
        </button>
    </div>
);

// --- 🔹 GridToggle: 用於 2x2 視覺網格 ---
interface GridToggleProps {
    label: string;
    icon: ReactNode;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

export const GridToggle: FC<GridToggleProps> = ({ label, icon, enabled, onChange }) => (
    <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => { triggerHaptic('light'); onChange(!enabled); }}
        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[28px] border-[0.5px] transition-all duration-500 ${enabled ? 'bg-p3-navy text-white shadow-glass-deep border-white/10' : 'bg-white/40 backdrop-blur-md border-white/30 text-gray-400 shadow-glass-soft'}`}
    >
        <div className={enabled ? 'text-p3-gold animate-pulse' : 'text-gray-300'}>
            {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest leading-none opacity-80">{label}</span>
    </motion.button>
);

// --- 🔹 SystemSlider: 簡約數值拉桿 ---
interface SystemSliderProps {
    label: string;
    icon: ReactNode;
    value: number;
    min?: number;
    max?: number;
    onChange: (value: number) => void;
}

export const SystemSlider: FC<SystemSliderProps> = ({ label, icon, value, min = 0, max = 100, onChange }) => (
    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-[24px] border-[2px] border-splat-dark/5 space-y-3">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-splat-dark">
                {icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-[10px] font-black text-gray-400">{value}%</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-p3-navy/10 rounded-full appearance-none cursor-pointer accent-p3-navy"
        />
    </div>
);

// ────────────────────────────────────────────
// InkSplat v3 — Viscous Liquid Morphing (ADL)
// 模擬高粘度液體爆裂效果，具備表面張力感
// ────────────────────────────────────────────
const D0 = 'M50 50 C50 50 50 50 50 50 C50 50 50 50 50 50 C50 50 50 50 50 50 C50 50 50 50 50 50 Z';
const D1 = 'M50 10 C75 10 90 40 90 55 C90 75 70 90 50 90 C30 90 10 75 10 55 C10 40 25 10 50 10 Z'; // 更有張力的液滴感
const D2 = 'M-10 -10 L110 -10 L110 110 L-10 110 Z'; // 溢出擴散

export const InkSplat: FC<{ color: string }> = ({ color }) => {
    // 取得手機傾斜率 (Sensitivity 調得比較高，讓墨水對重力更有感)
    const gyroData = useGyroscope(2.0);

    return (
        <motion.div
            key="ink-splat-liquid"
            className="fixed inset-0 pointer-events-none z-[9999]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } }}
        >
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid slice"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
            >
                {/* 透過 Framer Motion 動態調整墨水群的重心，模擬地心引力 */}
                <motion.g
                    animate={{
                        x: gyroData.x,
                        y: gyroData.y
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 100,
                        damping: 20
                    }}
                >
                    <motion.path
                        fill={color}
                        initial={{ d: D0, opacity: 0 }}
                        animate={{
                            d: [D0, D1, D2],
                            opacity: [0, 1, 1],
                            transition: {
                                d: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.4, 1] },
                                opacity: { duration: 0.2 }
                            }
                        }}
                        exit={{
                            opacity: 0,
                            transition: { duration: 0.4 }
                        }}
                    />
                </motion.g>
            </svg>
        </motion.div>
    );
};


interface SwipeableItemProps {
    id: string;
    children: ReactNode;
    onDelete: (id: string) => void;
    className?: string;
    disabled?: boolean;
}

export const SwipeableItem: FC<SwipeableItemProps> = ({ id, children, onDelete, className = "", disabled = false }) => {
    const [scope, animate] = useAnimate();
    const [isRevealed, setIsRevealed] = useState(false);
    const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

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
                        onDelete(id);
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
