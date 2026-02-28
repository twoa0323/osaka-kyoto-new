import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Compass, X, MapPin } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface ARCompassProps {
    targetLat: number;
    targetLng: number;
    targetName: string;
    onClose: () => void;
}

export const ARCompass = ({ targetLat, targetLng, targetName, onClose }: ARCompassProps) => {
    const { t } = useTranslation();
    const [heading, setHeading] = useState<number | null>(null);
    const [bearing, setBearing] = useState<number | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
        const x = Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
            Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
        let brng = Math.atan2(y, x) * (180 / Math.PI);
        return (brng + 360) % 360;
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        let watchId: number;

        const startTracking = () => {
            // 1. Geolocation
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        const { latitude, longitude } = pos.coords;
                        const b = calculateBearing(latitude, longitude, targetLat, targetLng);
                        const d = calculateDistance(latitude, longitude, targetLat, targetLng);
                        setBearing(b);
                        setDistance(d);
                    },
                    (err) => setError(t('ar.noLocation')),
                    { enableHighAccuracy: true }
                );
            }

            // 2. Orientation
            const handleOrientation = (event: DeviceOrientationEvent) => {
                // iOS: webkitCompassHeading, Others: alpha (need absolute)
                let absoluteHeading = (event as any).webkitCompassHeading || (360 - (event.alpha || 0));
                setHeading(absoluteHeading);
            };

            window.addEventListener('deviceorientation', handleOrientation, true);
            return () => {
                window.removeEventListener('deviceorientation', handleOrientation);
                if (watchId) navigator.geolocation.clearWatch(watchId);
            };
        };

        if (permissionGranted) {
            startTracking();
        }
    }, [permissionGranted, targetLat, targetLng]);

    const requestPermission = async () => {
        try {
            // iOS 13+ 需要授權
            if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                const res = await (DeviceOrientationEvent as any).requestPermission();
                if (res === 'granted') {
                    setPermissionGranted(true);
                    triggerHaptic('success');
                } else {
                    setError(t('ar.gyroPermissionRequired'));
                }
            } else {
                // Android / Desktop
                setPermissionGranted(true);
                triggerHaptic('success');
            }
        } catch (e) {
            setError(t('ar.unsupported'));
        }
    };

    // 計算箭頭旋轉度數
    // 箭頭朝向 = 目標方位角 - 手機目前的朝向
    const arrowRotation = bearing !== null && heading !== null ? (bearing - heading) : 0;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-splat-dark/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-white"
        >
            <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/10 rounded-full active:scale-90 transition-transform">
                <X size={32} />
            </button>

            <div className="text-center space-y-2 mb-12">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center justify-center gap-2">
                    <Navigation className="text-splat-yellow" /> AR FINDER
                </h2>
                <p className="text-white/60 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-1">
                    <MapPin size={12} /> {t('ar.target')}: {targetName}
                </p>
            </div>

            {!permissionGranted ? (
                <div className="bg-white/10 p-8 rounded-[40px] border-2 border-dashed border-white/20 text-center space-y-6">
                    <Compass size={64} className="mx-auto text-splat-yellow animate-pulse" />
                    <p className="font-bold text-sm leading-relaxed whitespace-pre-line">{t('ar.gyroscopeNeeded')}</p>
                    <button
                        onClick={requestPermission}
                        className="w-full bg-splat-yellow text-splat-dark font-black py-4 rounded-2xl shadow-lg active:translate-y-1 transition-all"
                    >
                        {t('ar.openCompass')}
                    </button>
                </div>
            ) : (
                <div className="relative flex flex-col items-center">
                    {/* 外圈刻度 */}
                    <div className="w-80 h-80 rounded-full border-[6px] border-white/10 relative flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                        {/* 3D 箭頭 */}
                        <motion.div
                            animate={{ rotate: arrowRotation }}
                            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                            className="relative w-40 h-40 flex items-center justify-center"
                            style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
                        >
                            <div className="w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[80px] border-b-splat-yellow drop-shadow-[0_0_20px_rgba(255,192,0,0.6)]"
                                style={{ transform: 'translateY(-20px) rotateX(20deg)' }} />
                            <div className="absolute w-4 h-32 bg-gradient-to-t from-transparent via-splat-yellow/20 to-transparent blur-xl" />
                        </motion.div>

                        {/* 方位標示 */}
                        <div className="absolute top-4 font-black text-white/40 tracking-[1em] translate-x-1.5">N</div>
                        <div className="absolute bottom-4 font-black text-white/40 tracking-[1em] translate-x-1.5">S</div>
                        <div className="absolute left-4 font-black text-white/40">W</div>
                        <div className="absolute right-4 font-black text-white/40">E</div>
                    </div>

                    <div className="mt-16 text-center">
                        <div className="text-6xl font-black mb-1">{Math.round(distance || 0)}<span className="text-xl ml-1 text-white/50">m</span></div>
                        <div className="bg-splat-yellow/20 text-splat-yellow border border-splat-yellow/30 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {t('ar.straightAhead')}
                        </div>
                    </div>
                </div>
            )}

            {error && <div className="mt-8 text-red-400 font-bold text-sm bg-red-400/10 px-4 py-2 rounded-lg">{error}</div>}
        </motion.div>
    );
};
