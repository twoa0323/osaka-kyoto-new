import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Home, Clock, ChevronRight, ChevronDown, Copy, ExternalLink, MapPin, Phone } from 'lucide-react';
import { BookingItem } from '../../types';
import { getAirlineTheme } from './ScheduleConstants';
import { parseISO, differenceInDays } from 'date-fns';
import { triggerHaptic } from '../../utils/haptics';

// --- 🔹 專用航班卡片 (時間軸版) ---
export const TimelineFlightCard: FC<{
    item: BookingItem;
    onClick: () => void;
}> = ({ item, onClick }) => {
    const theme = getAirlineTheme(item.airline);

    return (
        <motion.div
            layoutId={`card-${item.id}`}
            onClick={onClick}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative ml-14 mb-10 cursor-pointer group"
        >
            <div className="bg-white rounded-[32px] overflow-hidden shadow-xl border-[0.5px] border-black/5 relative">
                <div className="absolute left-0 top-[22%] -translate-x-1/2 w-8 h-8 rounded-full bg-[#F4F5F7] z-20" />
                <div className="absolute right-0 top-[22%] translate-x-1/2 w-8 h-8 rounded-full bg-[#F4F5F7] z-20" />

                <div className={`${theme.bgClass} h-16 flex items-center justify-center relative`}>
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                    <span className={`boutique-tag ${theme.textClass} opacity-90 tracking-[0.3em] z-10 font-black text-xs uppercase`}>{theme.logo}</span>
                </div>

                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white px-6 py-1.5 rounded-full border-[0.5px] border-black/10 shadow-sm z-30">
                    <span className="text-[10px] font-black text-p3-navy/40 tracking-widest">{item.flightNo || 'FLIGHT'}</span>
                </div>

                <div className="p-8 pt-12 flex justify-between items-center bg-white">
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-gray-400 mb-1 uppercase tracking-widest">{item.depCity || 'TAIPEI'}</span>
                        <span className="text-4xl font-black text-p3-navy tracking-tighter leading-none">{item.depIata || 'TPE'}</span>
                        <span className="text-base font-black text-p3-navy mt-2">{item.depTime || '--:--'}</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center px-4">
                        <div className="w-full flex items-center gap-2 mb-2">
                            <div className="h-[1px] flex-1 border-t border-dashed border-gray-300" />
                            <Plane size={16} strokeWidth={3} className="text-p3-ruby rotate-45" />
                            <div className="h-[1px] flex-1 border-t border-dashed border-gray-300" />
                        </div>
                        <span className="text-[10px] font-black text-gray-300 italic">{item.duration || '02h 45m'}</span>
                    </div>

                    <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-gray-400 mb-1 uppercase tracking-widest">{item.arrCity || 'OSAKA'}</span>
                        <span className="text-4xl font-black text-p3-navy tracking-tighter leading-none">{item.arrIata || 'KIX'}</span>
                        <span className="text-base font-black text-p3-navy mt-2">{item.arrTime || '--:--'}</span>
                    </div>
                </div>

                <div className="bg-gray-50/50 p-4 border-t border-dashed border-gray-200 flex flex-col items-center">
                    <div className="text-4xl font-mono tracking-widest text-black/20 overflow-hidden h-8 select-none">|||| |||| | || ||| || ||| |||| || |||</div>
                    <div className="text-[8px] font-mono text-black/10 mt-1"> boarding pass security id: {item.id} </div>
                </div>

                <div className="absolute right-4 top-20 w-10 h-10 rounded-full bg-p3-navy text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-75 group-hover:scale-100 z-30">
                    <ChevronRight size={20} strokeWidth={2.5} />
                </div>
            </div>
        </motion.div>
    );
};

// --- 🔹 專用飯店卡片 (時間軸版) ---
export const TimelineHotelCard: FC<{
    item: BookingItem;
    onClick: () => void;
    t: (key: string) => string;
}> = ({ item, onClick, t }) => {
    const checkIn = item.date;
    const checkOut = item.endDate || item.date;
    const nights = Math.max(1, differenceInDays(parseISO(checkOut), parseISO(checkIn)));

    return (
        <motion.div
            layoutId={`card-${item.id}`}
            onClick={onClick}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative ml-14 mb-10 cursor-pointer group"
        >
            <div className="bg-white rounded-[32px] overflow-hidden shadow-xl border-[0.5px] border-black/5 flex flex-col h-[280px]">
                <div className="h-[40%] relative">
                    {item.images?.[0] ? (
                        <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="hotel" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-p3-navy to-p3-ruby flex items-center justify-center">
                            <Home size={32} className="text-white/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-6 right-6 flex justify-between items-center text-white">
                        <h4 className="text-lg font-black truncate drop-shadow-md">{item.title}</h4>
                    </div>
                </div>

                <div className="flex-1 p-6 flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Check-In</p>
                            <p className="text-sm font-black text-p3-navy">{checkIn}</p>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                <Clock size={10} className="text-p3-ruby" /> {item.checkInTime || '15:00'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Check-Out</p>
                            <p className="text-sm font-black text-p3-navy">{checkOut}</p>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                <Clock size={10} className="text-p3-navy" /> {item.checkOutTime || '11:00'}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <div className="bg-splat-yellow text-p3-navy px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {nights} {t('booking.nights') || 'Nights'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 truncate max-w-[120px]">
                            <MapPin size={10} className="text-p3-gold" /> {item.location}
                        </div>
                    </div>
                </div>

                <div className="absolute right-4 bottom-4 w-10 h-10 rounded-full bg-p3-navy text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-75 group-hover:scale-100 z-30">
                    <ChevronRight size={20} strokeWidth={2.5} />
                </div>
            </div>
        </motion.div>
    );
};

export const InfoBlock = ({ label, value, highlight }: any) => (
    <div className={`bg-white border-[0.5px] ${highlight ? 'border-splat-pink' : 'border-p3-navy/10'} rounded-2xl p-4 flex flex-col justify-center items-center shadow-sm`}>
        <span className="text-[9px] font-black text-gray-400 block uppercase tracking-widest mb-1 text-center">{label}</span>
        <span className={`text-lg font-black ${highlight ? 'text-splat-pink' : 'text-p3-navy'} text-center truncate w-full`}>{value}</span>
    </div>
);

export const AirlineHeaderPattern = ({ airline }: { airline: string }) => {
    const al = (airline || '').toLowerCase();
    if (al.includes('eva')) {
        return (
            <div className="absolute right-0 top-0 bottom-0 w-32 overflow-hidden pointer-events-none">
                <div className="absolute -right-4 -top-8 w-24 h-32 bg-[#178045] rounded-full transform -rotate-12"></div>
                <div className="absolute right-8 -top-4 w-12 h-24 bg-[#F58220] rounded-full transform -rotate-45"></div>
            </div>
        );
    }
    if (al.includes('starlux')) {
        return (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#C4A97A"><path d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z" /></svg>
            </div>
        );
    }
    if (al.includes('china')) {
        return (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-90">
                <div className="relative w-8 h-8">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[#E88CA4] rounded-full"></div>
                    <div className="absolute top-1.5 right-0.5 w-3.5 h-3.5 bg-[#E88CA4] rounded-full"></div>
                    <div className="absolute bottom-0.5 right-1 w-3.5 h-3.5 bg-[#E88CA4] rounded-full"></div>
                    <div className="absolute bottom-0.5 left-1 w-3.5 h-3.5 bg-[#E88CA4] rounded-full"></div>
                    <div className="absolute top-1.5 left-0.5 w-3.5 h-3.5 bg-[#E88CA4] rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#D13C66] rounded-full z-10"></div>
                </div>
            </div>
        );
    }
    if (al.includes('tiger')) {
        return (
            <div className="absolute right-0 top-0 bottom-0 w-32 overflow-hidden pointer-events-none opacity-15">
                <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,#000_6px,#000_12px)]"></div>
            </div>
        );
    }
    if (al.includes('peach')) {
        return (
            <div className="absolute right-0 top-0 bottom-0 w-32 overflow-hidden pointer-events-none">
                <div className="absolute -right-6 top-0 bottom-0 w-24 bg-[#B5005A] rounded-l-full opacity-40 blur-[2px]"></div>
                <div className="absolute right-4 bottom-[-10px] w-16 h-16 bg-[#FFBEE0] rounded-full opacity-30 blur-[2px]"></div>
            </div>
        );
    }
    if (al.includes('jetstar')) {
        return (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#000000" className="opacity-80"><path d="M12 0L15.09 8.26L24 9.54L17.54 15.82L19.08 24L12 20.26L4.92 24L6.46 15.82L0 9.54L8.91 8.26L12 0Z" /></svg>
            </div>
        );
    }
    if (al.includes('ana')) {
        return (
            <div className="absolute right-0 top-0 bottom-0 w-48 overflow-hidden pointer-events-none">
                <div className="absolute right-8 top-0 bottom-0 w-8 bg-[#00A0E9] transform skew-x-[-30deg]"></div>
                <div className="absolute right-[-10px] top-0 bottom-0 w-12 bg-[#00A0E9] transform skew-x-[-30deg]"></div>
            </div>
        );
    }
    if (al.includes('jal')) {
        return (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-8 h-8 rounded-full border-4 border-white opacity-80 relative overflow-hidden">
                    <div className="w-full h-[40%] bg-white absolute top-0"></div>
                    <div className="w-2 h-full bg-white absolute left-1/2 -translate-x-1/2"></div>
                </div>
            </div>
        );
    }
    return <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>;
};

export const FlightDetailModalContent = ({ item, t, showToast }: any) => {
    const [expanded, setExpanded] = useState(false);
    const theme = getAirlineTheme(item.airline);

    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#F4F5F7]">
            <div className="p-6 pt-20 space-y-6 pb-32">
                <motion.div layout onClick={() => { setExpanded(!expanded); triggerHaptic('light'); }} className="bg-white rounded-[24px] shadow-glass-deep overflow-hidden cursor-pointer active:scale-[0.98] transition-transform relative">
                    <div className={`${theme.bgClass} px-6 py-4 flex justify-between items-center relative overflow-hidden`}>
                        <div className="relative z-10 flex items-center">
                            <span className={`text-base font-black ${theme.textClass} tracking-widest uppercase`}>{theme.logo}</span>
                        </div>
                        <span className={`text-[11px] font-bold ${theme.textClass} opacity-90 uppercase tracking-widest relative z-10 mr-12`}>
                            {item.date}
                        </span>
                        <AirlineHeaderPattern airline={item.airline} />
                    </div>
                    <div className="px-6 py-8 relative bg-white">
                        <div className="flex justify-between items-end mb-3">
                            <div className="text-left w-1/3">
                                <span className="text-5xl font-black text-p3-navy leading-none tracking-tighter">{item.depIata || 'TPE'}</span>
                            </div>
                            <div className="flex-1 flex flex-col items-center px-2 pb-2">
                                <span className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">{item.flightNo || 'FLIGHT'}</span>
                                <div className="w-full relative flex items-center">
                                    <div className="w-2 h-2 rounded-full border-2 border-gray-300 bg-white z-10 shrink-0"></div>
                                    <div className="flex-1 border-t-2 border-gray-200"></div>
                                    <Plane size={16} className="text-p3-navy mx-2 shrink-0" />
                                    <div className="flex-1 border-t-2 border-gray-200"></div>
                                    <div className="w-2 h-2 rounded-full border-2 border-p3-navy bg-p3-navy z-10 shrink-0"></div>
                                </div>
                            </div>
                            <div className="text-right w-1/3">
                                <span className="text-5xl font-black text-p3-navy leading-none tracking-tighter">{item.arrIata || 'KIX'}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-black text-p3-navy tracking-widest">{item.depTime || '--:--'}</span>
                            <span className="text-sm font-black text-p3-navy tracking-widest">{item.arrTime || '--:--'}</span>
                        </div>
                    </div>
                    <div className="relative flex items-center justify-center bg-white h-4">
                        <div className="absolute left-[-12px] w-6 h-6 bg-[#F4F5F7] rounded-full z-10 shadow-inner"></div>
                        <div className="w-full border-t-2 border-dashed border-gray-200 mx-6"></div>
                        <div className="absolute right-[-12px] w-6 h-6 bg-[#F4F5F7] rounded-full z-10 shadow-inner"></div>
                    </div>
                    <div className="bg-white px-6 py-4 flex flex-col justify-center items-center gap-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            {expanded ? 'Hide Details' : 'Tap to Expand Details'}
                            <ChevronDown size={14} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                        </span>
                        {!expanded && <div className="w-2/3 h-8 opacity-20 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_5px,black_5px,black_6px,transparent_6px,transparent_10px)]" />}
                    </div>
                </motion.div>
                <AnimatePresence>
                    {expanded && (
                        <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} className="space-y-4 overflow-hidden pt-2">
                            {item.pnr && (
                                <div className="bg-white border-[0.5px] border-p3-navy rounded-[24px] p-6 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform cursor-pointer" onClick={() => { navigator.clipboard.writeText(item.pnr); triggerHaptic('success'); showToast("PNR 已複製！🦑", "success"); }}>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Booking Ref (PNR)</p>
                                        <p className="text-3xl font-black text-p3-navy tracking-[0.2em]">{item.pnr}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-splat-yellow/20 border-[0.5px] border-splat-yellow flex items-center justify-center text-splat-yellow"><Copy size={20} /></div>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-3">
                                <InfoBlock label="Terminal" value={item.terminal || '--'} />
                                <InfoBlock label="Gate" value={item.gate || '--'} />
                                <InfoBlock label="Boarding" value={item.boardingTime || '--:--'} highlight />
                                <InfoBlock label="Seat" value={item.seat || '--'} />
                                <InfoBlock label="Baggage" value={item.baggageAllowance || '--'} />
                                <InfoBlock label="Duration" value={item.duration || '--'} />
                            </div>
                            {item.url && (
                                <button onClick={() => { window.open(item.url, '_blank'); triggerHaptic('success'); }} className="w-full py-5 bg-p3-navy text-white rounded-2xl font-black uppercase tracking-widest shadow-glass-deep flex items-center justify-center gap-3 active:scale-95 transition-all mt-4 border-[0.5px] border-white/20">
                                    <ExternalLink size={18} /> {item.url.includes('evaair') ? '打開長榮航空' : item.url.includes('starlux') ? '打開星宇航空' : item.url.includes('tigerair') ? '打開台灣虎航' : item.url.includes('china-airlines') ? '打開中華航空' : '開啟外部連結 / App'}
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export const HotelDetailModalContent = ({ item, t, showToast }: any) => {
    const [expanded, setExpanded] = useState(false);
    const checkInDate = item.date;
    const checkOutDate = item.endDate || item.date;
    const nights = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));

    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#F4F5F7]">
            <div className="p-6 pt-20 space-y-6 pb-32">
                <motion.div layout onClick={() => { setExpanded(!expanded); triggerHaptic('light'); }} className="bg-white rounded-[24px] shadow-glass-deep border-[0.5px] border-black/5 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform">
                    <div className="h-48 relative">
                        {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" alt="hotel" /> : <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400"><Home size={48} /></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-5 left-6 right-6 flex justify-between items-end gap-4">
                            <h4 className="text-2xl font-black text-white tracking-tighter leading-tight max-w-[70%] line-clamp-2">{item.title}</h4>
                            <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30 shrink-0">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{nights} Nights</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-white space-y-4">
                        <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 border-[0.5px] border-gray-200">
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-in</span>
                                <span className="text-xl font-black text-p3-navy leading-none">{item.checkInTime || '15:00'}</span>
                                <span className="text-[9px] font-bold text-gray-400 mt-1">{item.date}</span>
                            </div>
                            <div className="flex-1 flex flex-col items-center px-4">
                                <div className="w-full relative flex items-center justify-center h-2">
                                    <div className="w-full border-t-2 border-dashed border-gray-300"></div>
                                    <ChevronRight size={14} className="absolute text-gray-400 bg-gray-50 px-0.5" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-out</span>
                                <span className="text-xl font-black text-p3-navy leading-none">{item.checkOutTime || '11:00'}</span>
                                <span className="text-[9px] font-bold text-gray-400 mt-1">{item.endDate || item.date}</span>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <ChevronDown size={18} className={`text-gray-300 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                </motion.div>
                <AnimatePresence>
                    {expanded && (
                        <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} className="space-y-4 overflow-hidden pt-2">
                            {item.confirmationNo && (
                                <div className="bg-white border-[0.5px] border-p3-navy rounded-[24px] p-6 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform cursor-pointer" onClick={() => { navigator.clipboard.writeText(item.confirmationNo); triggerHaptic('success'); showToast("Booking Ref 已複製！", "success"); }}>
                                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Confirmation No.</p><p className="text-2xl font-black text-p3-navy tracking-[0.1em]">{item.confirmationNo}</p></div>
                                    <div className="w-12 h-12 rounded-xl bg-p3-navy/10 border-[0.5px] border-p3-navy/20 flex items-center justify-center text-p3-navy"><Copy size={20} /></div>
                                </div>
                            )}
                            <div className="bg-white border-[0.5px] border-p3-navy rounded-[24px] p-6 shadow-sm space-y-4">
                                <div className="flex items-start gap-4"><MapPin size={20} className="text-p3-gold shrink-0 mt-0.5" /><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Address</p><p className="text-sm font-bold text-p3-navy">{item.location || 'See map for details'}</p></div></div>
                                <div className="flex items-start gap-4 border-t border-gray-100 pt-4"><Home size={20} className="text-p3-navy shrink-0 mt-0.5" /><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Room Type</p><p className="text-sm font-bold text-p3-navy">{item.roomType || 'Standard Room'}</p></div></div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button className="flex-1 py-4 bg-white border-[0.5px] border-p3-navy rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-glass-deep-sm active:translate-y-1 transition-all text-p3-navy" onClick={() => window.open(`tel:${item.contactPhone || item.phone || ''}`)}><Phone size={16} /> Contact</button>
                                <button className="flex-[2] py-4 bg-p3-navy text-white border-[0.5px] border-p3-navy rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-glass-deep-sm active:translate-y-1 transition-all" onClick={() => window.open(`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(item.location || item.title)}`, '_blank')}><MapPin size={16} /> Open Maps</button>
                            </div>
                            {item.url && (
                                <button onClick={() => { window.open(item.url, '_blank'); triggerHaptic('success'); }} className="w-full py-5 bg-gradient-to-r from-p3-gold to-splat-orange text-white rounded-2xl font-black uppercase tracking-widest shadow-glass-deep flex items-center justify-center gap-3 active:scale-95 transition-all mt-2 border-[0.5px] border-white/20">
                                    <ExternalLink size={18} /> {item.url.includes('agoda') ? '打開 Agoda 查看' : item.url.includes('booking') ? '打開 Booking.com 查看' : item.url.includes('airbnb') ? '打開 Airbnb 查看' : '開啟外部連結 / App'}
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
