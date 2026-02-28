import { FC, useEffect, useRef } from 'react';
import { Trip } from '../types';
import { Map, MapMarker, Map3DBuildings } from './ui/map';
import type { MapRef } from './ui/map';

interface SpatialMapHeaderProps {
    trip: Trip;
    activeItem?: any;
    t: (key: string) => string;
    enable3DMap?: boolean;
}

export const SpatialMapHeader: FC<SpatialMapHeaderProps> = ({ trip, activeItem, t, enable3DMap = true }) => {
    const mapRef = useRef<MapRef | null>(null);
    const MAPTILER_KEY = (import.meta as any).env.VITE_MAPTILER_API_KEY;

    useEffect(() => {
        if (activeItem?.lat && activeItem?.lng && mapRef.current) {
            mapRef.current.flyTo({
                center: [activeItem.lng, activeItem.lat],
                zoom: 15,
                padding: { top: 40, bottom: 20, left: 20, right: 20 },
                duration: 1500,
                essential: true
            });
        }
    }, [activeItem?.id]);

    return (
        <div className="relative h-48 w-full glass-card overflow-hidden shadow-glass-deep group border-[0.5px] border-white/40 mb-4">
            <Map
                ref={mapRef as any}
                styles={{
                    light: `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_KEY}`,
                    dark: `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_KEY}`
                }}
                initialViewState={{
                    center: [trip.lng || 135.5023, trip.lat || 34.6937],
                    zoom: 12,
                    pitch: 60,
                }}
                className="w-full h-full"
            >
                <Map3DBuildings enabled={enable3DMap} />
                {activeItem?.lat && (
                    <MapMarker longitude={activeItem.lng} latitude={activeItem.lat}>
                        <div className="w-8 h-8 rounded-full bg-p3-ruby border-4 border-white shadow-xl animate-pulse" />
                    </MapMarker>
                )}
            </Map>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90 pointer-events-none" />

            {/* 墨線裝飾 */}
            <div className="absolute inset-x-6 bottom-6 flex justify-between items-end pointer-events-none">
                <div>
                    <h2 className="text-2xl boutique-h1 text-p3-navy drop-shadow-sm">
                        {trip.dest} <span className="text-p3-ruby">EXPRESS</span>
                    </h2>
                    <p className="boutique-tag text-p3-navy/30 mt-1">{t('schedule.spatialTimeline')}</p>
                </div>
                <div className="px-4 py-1.5 bg-p3-navy text-white rounded-full boutique-tag text-[10px]">
                    {t('schedule.liveTracking')}
                </div>
            </div>
        </div>
    );
};
