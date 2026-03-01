import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Home, Clock, ChevronRight, ChevronDown, Copy, ExternalLink, MapPin, Phone } from 'lucide-react';
import { BookingItem } from '../../types';
import { getAirlineTheme } from './ScheduleConstants';
import { parseISO, differenceInDays, format } from 'date-fns';
import { triggerHaptic } from '../../utils/haptics';

// --- 🔹 專用航班卡片 (時間軸版 - 完美複製 FlightCard) ---
export const TimelineFlightCard: FC<{
    item: BookingItem;
    onClick: () => void;
}> = ({ item, onClick }) => {
    // 日期格式化: 2026/04/25
    const dateStr = item.date ? format(parseISO(item.date), 'yyyy/MM/dd') : '----/--/--';

    return (
        <motion.div
            layoutId={`card-${item.id}`}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative ml-10 mb-8 cursor-pointer group rounded-[32px] overflow-hidden bg-white shadow-xl shadow-black/5"
        >
            {/* 左側長切鋸齒線條模擬 (票根邊緣) */}
            <div className="absolute left-6 top-0 bottom-0 w-0 border-l-[3px] border-dotted border-gray-300 pointer-events-none z-30" />

            {/* 頂部：STARLUX 深藍底色與星空 Pattern */}
            <div className="bg-[#121623] h-[100px] w-full relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px', backgroundPosition: '50% 50%' }} />

                {/* 航空名稱與特殊 Logo */}
                <div className="flex items-center gap-2 z-10 -mt-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C12.5 7.5 16.5 11.5 22 12C16.5 12.5 12.5 16.5 12 22C11.5 16.5 7.5 12.5 2 12C7.5 11.5 11.5 7.5 12 2Z" fill="#D4B57E" />
                    </svg>
                    <span className="text-xl font-serif text-[#D4B57E] tracking-[0.2em] font-bold uppercase">{item.airline || 'STARLUX'}</span>
                </div>
            </div>

            {/* 跨越交界的半圓形航班號背景 */}
            <div className="absolute top-[86px] left-1/2 -translate-x-1/2 bg-white px-8 py-2 rounded-full shadow-sm z-20 border-[0.5px] border-black/5">
                <span className="text-sm font-black text-[#A4A9B3] tracking-widest leading-none pt-0.5 inline-block">{item.flightNo || 'JX820'}</span>
            </div>

            {/* 中段：起降與時間資訊 */}
            <div className="bg-white pt-16 pb-8 px-8 pl-14">
                <div className="flex justify-between items-center w-full">
                    {/* 左側起飛 */}
                    <div className="flex flex-col items-center w-[30%]">
                        <span className="text-2xl font-black text-[#A4A9B3] mb-1">{item.depIata || 'TPE'}</span>
                        <span className="text-[44px] font-black text-[#1A1F36] leading-none tracking-tight mb-3 font-sans -ml-1">{item.depTime || '08:30'}</span>
                        <div className="bg-[#1E7B44] text-white text-[11px] font-bold px-4 py-1.5 rounded-full tracking-widest">{item.depCity || '台北'}</div>
                    </div>

                    {/* 中間飛行時長與日期 */}
                    <div className="flex-1 flex flex-col items-center justify-center -mt-4">
                        <span className="text-[11px] font-bold text-[#8E94A4] mb-2">{item.duration || '02h 45m'}</span>
                        <div className="w-full flex items-center justify-center gap-1.5 mb-2 relative">
                            <div className="h-0 border-t-2 border-dashed border-[#DEE1E6] w-12" />
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#346DF8] rotate-90 transform shrink-0">
                                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor" />
                            </svg>
                            <div className="h-0 border-t-2 border-dashed border-[#DEE1E6] w-12" />
                        </div>
                        <span className="text-[11px] font-bold text-[#8E94A4]">{dateStr}</span>
                    </div>

                    {/* 右側抵達 */}
                    <div className="flex flex-col items-center w-[30%]">
                        <span className="text-2xl font-black text-[#A4A9B3] mb-1">{item.arrIata || 'KIX'}</span>
                        <span className="text-[44px] font-black text-[#1A1F36] leading-none tracking-tight mb-3 font-sans -ml-1">{item.arrTime || '12:15'}</span>
                        <div className="bg-[#B8936D] text-white text-[11px] font-bold px-4 py-1.5 rounded-full tracking-widest">{item.arrCity || '大阪'}</div>
                    </div>
                </div>

                {/* 底部附屬資訊區塊 */}
                <div className="mt-8 bg-[#F9F9FB] rounded-[20px] p-4 flex items-center justify-between border-[0.5px] border-black/5">
                    {/* BAGGAGE */}
                    <div className="flex flex-col flex-1 items-center justify-center">
                        <span className="text-[9px] font-black text-[#A4A9B3] tracking-widest mb-1.5">BAGGAGE</span>
                        <div className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#66A89B]">
                                <rect x="5" y="6" width="14" height="16" rx="2" />
                                <path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" />
                                <line x1="12" y1="11" x2="12" y2="17" />
                            </svg>
                            <span className="text-sm font-black text-[#1A1F36]">{item.baggageAllowance || '23kg'}</span>
                        </div>
                    </div>
                    <div className="w-[1px] h-8 bg-gray-200" />

                    {/* SEAT */}
                    <div className="flex flex-col flex-1 items-center justify-center">
                        <span className="text-[9px] font-black text-[#A4A9B3] tracking-widest mb-1.5">SEAT</span>
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-black text-[#1A1F36]">{item.seat || '14F'}</span>
                        </div>
                    </div>
                    <div className="w-[1px] h-8 bg-gray-200" />

                    {/* AIRCRAFT */}
                    <div className="flex flex-col flex-1 items-center justify-center">
                        <span className="text-[9px] font-black text-[#A4A9B3] tracking-widest mb-1.5">AIRCRAFT</span>
                        <div className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#C99464] -rotate-45 transform">
                                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor" />
                            </svg>
                            <span className="text-sm font-black text-[#1A1F36]">{item.aircraft || 'A350-900'}</span>
                        </div>
                    </div>
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

    // 格式化日期：例如 04 OCT 2024
    const flightDateStr = item.date ? format(parseISO(item.date), 'dd MMM yyyy').toUpperCase() : '-- --- ----';

    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#F4F5F7]">
            <div className="p-6 pt-20 space-y-6 pb-32">
                {/* 🎟️ 實體機票主體 (完全比照 IMG_6113 比例與剪裁) */}
                <motion.div layout onClick={() => { setExpanded(!expanded); triggerHaptic('light'); }} className="bg-white rounded-[32px] shadow-glass-deep overflow-hidden cursor-pointer active:scale-[0.98] transition-transform relative border-[0.5px] border-black/5">

                    {/* 物理大剪裁切口 (Cutouts) */}
                    <div className="absolute left-0 top-[80px] -translate-x-1/2 w-10 h-10 rounded-full bg-[#F4F5F7] z-20 shadow-inner" />
                    <div className="absolute right-0 top-[80px] translate-x-1/2 w-10 h-10 rounded-full bg-[#F4F5F7] z-20 shadow-inner" />

                    {/* 頂部：航空識別色、Logo 與專屬尾翼圖騰 */}
                    <div className={`${theme.bgClass} px-6 py-5 flex justify-between items-center relative overflow-hidden h-20`}>
                        <div className="relative z-10 flex items-center">
                            <span className={`text-base font-black ${theme.textClass} tracking-widest uppercase`}>{theme.logo}</span>
                        </div>
                        <span className={`text-xs font-bold ${theme.textClass} opacity-90 uppercase tracking-widest relative z-10 mr-12`}>
                            {flightDateStr}
                        </span>
                        <AirlineHeaderPattern airline={item.airline} />
                    </div>

                    {/* 中段 1：起降機場與時間 */}
                    <div className="px-8 pt-10 pb-6 relative bg-white">
                        <div className="flex justify-between items-end mb-6">
                            <div className="text-left flex flex-col items-start w-[30%]">
                                <span className="text-sm font-black text-gray-400 mb-1 uppercase tracking-widest">{item.depCity || 'TAIPEI'}</span>
                                <span className="text-6xl font-black text-p3-navy tracking-tighter leading-none -ml-1">{item.depIata || 'TPE'}</span>
                                <span className="text-sm font-bold text-p3-navy mt-1 tracking-widest">{item.depTime || '--:--'}</span>
                            </div>
                            <div className="flex-1 flex flex-col items-center px-4 mb-1">
                                <div className="w-full relative flex items-center justify-center gap-2 mb-2">
                                    <div className="h-[1.5px] w-8 border-t border-dashed border-gray-300" />
                                    <Plane size={18} strokeWidth={3} className="text-p3-navy rotate-45" />
                                    <div className="h-[1.5px] w-8 border-t border-dashed border-gray-300" />
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.flightNo || 'FLIGHT'}</span>
                            </div>
                            <div className="text-right flex flex-col items-end w-[30%]">
                                <span className="text-sm font-black text-gray-400 mb-1 uppercase tracking-widest">{item.arrCity || 'OSAKA'}</span>
                                <span className="text-6xl font-black text-p3-navy tracking-tighter leading-none -mr-1">{item.arrIata || 'KIX'}</span>
                                <span className="text-sm font-bold text-p3-navy mt-1 tracking-widest">{item.arrTime || '--:--'}</span>
                            </div>
                        </div>

                        {/* 中段 2：座位、艙等、登機 (IMG_6113 三欄排版) */}
                        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">Seat</span>
                                <span className="text-2xl font-black text-p3-navy">{item.seat || '15C'}</span>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">Class</span>
                                <span className="text-lg font-black text-p3-navy mt-1">Y</span>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">Boarding</span>
                                <span className="px-3 py-1 bg-[#F49818] rounded-full text-xl font-black text-white">{item.boardingTime || '10:40'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 底部：QR Code 與提示 */}
                    <div className="bg-gray-50/50 p-6 pt-5 border-t border-dashed border-gray-200 flex flex-col items-center gap-3">
                        {/* 擬真 QR Code 外框 */}
                        <div className="w-16 h-16 bg-white border-[2px] border-gray-200 rounded-lg p-1 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-p3-navy"></div>
                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-p3-navy"></div>
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-p3-navy"></div>
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-p3-navy"></div>
                            <div className="text-xs font-mono text-gray-300 font-black">QR</div>
                        </div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            {expanded ? 'Hide Details' : 'Tap to Expand Details'}
                            <ChevronDown size={14} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                        </span>
                    </div>
                </motion.div>

                {/* ⬇️ 隱藏的詳細資訊 (展開後才顯示) */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} className="space-y-4 overflow-hidden pt-2">
                            {item.pnr && (
                                <div className="bg-white border-[0.5px] border-p3-navy rounded-[24px] p-6 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform cursor-pointer" onClick={() => { navigator.clipboard.writeText(item.pnr); triggerHaptic('success'); showToast("PNR 已複製！🦑", "success"); }}>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('schedule.pnr') || 'Booking Ref (PNR)'}</p>
                                        <p className="text-3xl font-black text-p3-navy tracking-[0.2em]">{item.pnr}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-splat-yellow/20 border-[0.5px] border-splat-yellow flex items-center justify-center text-splat-yellow"><Copy size={20} /></div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <InfoBlock label={t('schedule.terminal') || 'Terminal'} value={item.terminal || '--'} />
                                <InfoBlock label={t('schedule.gate') || 'Gate'} value={item.gate || '--'} />
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
