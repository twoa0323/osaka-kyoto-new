import { FC, ReactNode, useState } from 'react';
import { motion, useAnimate } from 'framer-motion';
import { ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface SettingToggleProps {
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

export const SettingToggle: FC<SettingToggleProps> = ({ label, enabled, onChange }) => (
    <div className="flex justify-between items-center bg-white/50 backdrop-blur-sm p-4 rounded-2xl border-[2px] border-splat-dark/5 shadow-sm active:scale-[0.98] transition-all">
        <div className="text-left">
            <p className="font-black text-[13px] text-splat-dark uppercase tracking-tight">{label}</p>
        </div>
        <button onClick={() => onChange(!enabled)} className={`transition-all ${enabled ? 'text-splat-green scale-110' : 'text-gray-300'}`}>
            {enabled ? <ToggleRight size={38} strokeWidth={3} /> : <ToggleLeft size={38} strokeWidth={3} />}
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
        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[24px] border-[3px] transition-all ${enabled ? 'bg-splat-dark border-splat-dark text-white' : 'bg-white border-splat-dark/5 text-gray-400'}`}
    >
        <div className={enabled ? 'text-splat-yellow' : 'text-gray-300'}>
            {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
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
            className="w-full h-1.5 bg-splat-dark/10 rounded-full appearance-none cursor-pointer accent-splat-dark"
        />
    </div>
);

// ────────────────────────────────────────────
// InkSplat v2 — SVG Liquid Morphing Animation
// 使用純 SVG <motion.path> 模擬液體張力爆發效果
// 省電且流暢（無 WebGL，無 Canvas）
// ────────────────────────────────────────────
// 三個 SVG path 關鍵影格 (viewBox 0 0 100 100)：
//   d0 = 初始水滴（中心一個不規則小液滴）
//   d1 = 擴散中（邊緣開始波浪）
//   d2 = 全覆蓋（佔滿整個畫面，帶不規則波浪邊緣）
const D0 = 'M50 44 C52 41, 56 40, 58 44 C60 48, 57 55, 50 56 C43 55, 40 48, 42 44 C44 40, 48 41, 50 44 Z';
const D1 = 'M50 10 C68 8, 90 20, 92 40 C95 60, 82 85, 62 90 C42 95, 12 85, 8 62 C4 40, 18 8, 50 10 Z';
const D2 = 'M0 0 C30 -2, 70 -2, 100 0 C102 30, 102 70, 100 100 C70 102, 30 102, 0 100 C-2 70, -2 30, 0 0 Z';

export const InkSplat: FC<{ color: string }> = ({ color }) => (
    <motion.div
        key="ink-splat-svg"
        className="fixed inset-0 pointer-events-none z-[9999]"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }}
    >
        <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        >
            <motion.path
                fill={color}
                initial={{ d: D0, opacity: 0.9 }}
                animate={{
                    d: [D0, D1, D2],
                    opacity: [1, 1, 0.95],
                    transition: {
                        d: { duration: 0.4, ease: [0.22, 1, 0.36, 1], times: [0, 0.5, 1] },
                        opacity: { duration: 0.4 }
                    }
                }}
                exit={{
                    d: [D2, D1, D0],
                    opacity: [0.95, 0.4, 0],
                    transition: {
                        d: { duration: 0.3, ease: 'easeIn', times: [0, 0.5, 1] },
                        opacity: { duration: 0.3 }
                    }
                }}
            />
        </svg>
    </motion.div>
);


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
