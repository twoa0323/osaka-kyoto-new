import React from 'react';
import { motion } from 'framer-motion';
import { ToggleLeft, ToggleRight } from 'lucide-react';

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
