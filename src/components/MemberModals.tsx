import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, Edit3, Camera, User } from 'lucide-react';
import { Trip, Member } from '../types';
import { uploadImage } from '../utils/imageUtils';

interface MemberManagementProps {
    trip: Trip;
    myProfile?: Member;
    onClose: () => void;
    onEditProfile: (member: Member) => void;
    onShowSettings: () => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
    trip, myProfile, onClose, onEditProfile, onShowSettings
}) => {
    const [showEditIcon, setShowEditIcon] = useState<string | null>(null);

    return (
        <div className="fixed inset-0 z-[1000] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-[85%] max-w-xs bg-splat-bg h-full shadow-2xl border-l-[6px] border-splat-dark p-8 animate-in slide-in-from-right duration-300 overflow-y-auto">

                <button
                    onClick={onShowSettings}
                    className="absolute top-[88px] right-8 p-3 bg-white border-[3px] border-splat-dark rounded-xl shadow-splat-solid-sm active:translate-y-0.5 transition-all text-splat-dark z-50 hover:bg-gray-50"
                >
                    <Edit3 size={24} strokeWidth={3} className="animate-spin-slow" />
                </button>

                <div className="flex justify-between items-start mb-8">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-2xl font-black italic text-splat-dark tracking-tighter leading-tight uppercase break-words">
                                TRIP MATES
                            </h2>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-splat-green/10 border border-splat-green/30 rounded-full">
                                <RefreshCcw size={10} className="text-splat-green animate-spin-slow" />
                                <span className="text-[8px] font-black text-splat-green uppercase">Live</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="text-[9px] font-black bg-white border-2 border-splat-dark px-1.5 py-0.5 rounded shadow-sm text-splat-dark select-all">ID: {trip.id}</span>
                            <span className="text-[9px] font-black bg-white border-2 border-splat-dark px-1.5 py-0.5 rounded shadow-sm text-splat-dark select-all">PIN: {trip.tripPin}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 -mt-2 -mr-2"><X strokeWidth={3} /></button>
                </div>

                <div className="space-y-4">
                    {(trip.members || []).map(m => (
                        <div key={m.id}
                            onClick={() => { if (m.id === myProfile?.id) setShowEditIcon(prev => prev === m.id ? null : m.id); }}
                            className={`bg-white border-[3px] border-splat-dark rounded-2xl p-4 flex items-center gap-3 relative transition-all ${m.id === myProfile?.id ? 'cursor-pointer active:scale-[0.98] shadow-sm hover:border-splat-blue' : ''}`}
                        >
                            <div className="relative shrink-0">
                                <img src={m.avatar} className="w-12 h-12 rounded-full border-2 border-splat-dark object-cover bg-gray-50" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="font-black text-sm text-splat-dark truncate">{m.name}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate">{m.mood || m.email}</p>
                            </div>

                            {m.id === myProfile?.id && showEditIcon === m.id && (
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    onEditProfile(m);
                                    setShowEditIcon(null);
                                }} className="p-2 bg-splat-yellow border-2 border-splat-dark rounded-xl text-splat-dark shadow-sm animate-in zoom-in-95 shrink-0">
                                    <Edit3 size={16} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface ProfileEditorProps {
    myProfile: Member;
    onSave: (updated: Member) => void;
    onClose: () => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ myProfile, onSave, onClose }) => {
    const [form, setForm] = useState({ name: myProfile.name, mood: myProfile.mood || '', avatar: myProfile.avatar });

    const PRESET_AVATARS = [
        `https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi`,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka`,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=Max`,
    ];

    return (
        <div className="fixed inset-0 z-[2000] bg-splat-dark/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-6 text-center bg-[#F4F5F7] border-[4px] border-splat-dark rounded-[2.5rem] shadow-[8px_8px_0px_#1A1A1A] p-8 relative animate-in zoom-in-95">
                <button onClick={onClose} className="absolute top-5 right-5 bg-white p-2 rounded-full border-2 border-splat-dark active:scale-95 shadow-sm"><X size={16} strokeWidth={3} /></button>

                <h2 className="text-2xl font-black italic uppercase text-splat-dark">EDIT PROFILE</h2>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="relative inline-block">
                            <img src={form.avatar} className="w-20 h-20 rounded-full border-[3px] border-splat-dark object-cover bg-white mx-auto" />
                            <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full border-2 border-splat-dark shadow-sm cursor-pointer active:scale-95">
                                <Camera size={14} />
                                <input type="file" className="hidden" onChange={async e => {
                                    if (e.target.files?.[0]) {
                                        const url = await uploadImage(e.target.files[0]);
                                        setForm({ ...form, avatar: url });
                                    }
                                }} />
                            </label>
                        </div>
                        <div className="flex justify-center gap-2 mt-2">
                            {PRESET_AVATARS.map((url, idx) => (
                                <img key={idx} src={url} onClick={() => setForm({ ...form, avatar: url })} className={`w-10 h-10 rounded-full border-[3px] bg-white cursor-pointer transition-all ${form.avatar === url ? 'border-splat-blue scale-110' : 'border-splat-dark opacity-50 hover:opacity-100'}`} />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1 text-left">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Nickname 暱稱</label>
                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-4 bg-white rounded-xl border-[3px] border-splat-dark font-black text-splat-dark outline-none focus:border-splat-blue transition-colors" />
                    </div>

                    <div className="space-y-1 text-left">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Mood / Message 心情留言</label>
                        <input placeholder="寫點什麼心情呢？" value={form.mood} onChange={e => setForm({ ...form, mood: e.target.value })} className="w-full p-4 bg-white rounded-xl border-[3px] border-splat-dark font-black text-splat-dark outline-none focus:border-splat-blue transition-colors" />
                    </div>

                    <button onClick={() => {
                        if (!form.name) return alert("名字不能空白喔！");
                        onSave({ ...myProfile, ...form });
                    }} className="btn-splat w-full py-4 text-lg bg-splat-green text-white">SAVE ➔</button>
                </div>
            </div>
        </div>
    );
};

interface PersonalSetupProps {
    onComplete: (data: { name: string; email: string; pin: string }) => void;
}

export const PersonalSetup: React.FC<PersonalSetupProps> = ({ onComplete }) => {
    const [setupForm, setSetupForm] = useState({ name: '', email: '', pin: '' });

    return (
        <div className="fixed inset-0 z-[2000] bg-white flex items-center justify-center p-8">
            <div className="w-full max-w-sm space-y-8 text-center">
                <div className="w-20 h-20 bg-splat-yellow rounded-full flex items-center justify-center mx-auto border-[4px] border-splat-dark shadow-splat-solid animate-bounce"><User size={40} strokeWidth={3} className="text-splat-dark" /></div>
                <h2 className="text-3xl font-black italic">WHO ARE YOU?</h2>
                <div className="bg-white border-[4px] border-splat-dark rounded-[2.5rem] shadow-splat-solid p-8 space-y-6">
                    <div className="space-y-1 text-left"><label className="text-[10px] font-black opacity-30 uppercase tracking-widest pl-1">Nickname</label><input placeholder="您的暱稱" className="w-full p-4 bg-gray-50 rounded-xl border-[3px] border-splat-dark font-black outline-none focus:bg-white" value={setupForm.name} onChange={e => setSetupForm({ ...setupForm, name: e.target.value })} /></div>
                    <div className="space-y-1 text-left"><label className="text-[10px] font-black opacity-30 uppercase tracking-widest pl-1">Recovery Email</label><input type="email" placeholder="信箱" className="w-full p-4 bg-gray-50 rounded-xl border-[3px] border-splat-dark font-black outline-none focus:bg-white" value={setupForm.email} onChange={e => setSetupForm({ ...setupForm, email: e.target.value })} /></div>
                    <div className="space-y-1 text-left"><label className="text-[10px] font-black opacity-30 uppercase tracking-widest pl-1">Personal PIN</label><input type="password" maxLength={4} inputMode="numeric" placeholder="****" className="w-full p-4 bg-gray-50 rounded-xl border-[3px] border-splat-dark font-black outline-none text-2xl tracking-[0.5em] focus:bg-white" value={setupForm.pin} onChange={e => setSetupForm({ ...setupForm, pin: e.target.value })} /></div>
                    <button onClick={() => {
                        if (!setupForm.name || !setupForm.email || setupForm.pin.length < 4) return alert("資訊要填完整唷！🦑");
                        onComplete(setupForm);
                    }} className="btn-splat w-full py-5 text-xl bg-splat-blue text-white">READY GO! ➔</button>
                </div>
            </div>
        </div>
    );
};
