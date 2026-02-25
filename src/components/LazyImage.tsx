import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ImageOff } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    placeholderSrc?: string;
    containerClassName?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    className,
    placeholderSrc,
    containerClassName = "",
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [displaySrc, setDisplaySrc] = useState<string>("");
    const imgRef = useRef<HTMLDivElement>(null);

    // 📍 離線優先快取邏輯
    const fetchWithCache = async (imageUrl: string) => {
        if (!imageUrl) return;
        const CACHE_NAME = 'zakka-vouchers-v1';

        try {
            if ('caches' in window) {
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(imageUrl);

                if (cachedResponse) {
                    const blob = await cachedResponse.blob();
                    setDisplaySrc(URL.createObjectURL(blob));
                    return;
                }
            }
        } catch (err) {
            console.warn("Cache access error:", err);
        }

        // 若無快取或失敗，退回使用原始 URL
        setDisplaySrc(imageUrl);
    };

    useEffect(() => {
        if (!src) {
            setHasError(true);
            setIsLoaded(true);
        }
    }, [src]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsInView(true);
                    if (src) fetchWithCache(src);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => {
            observer.disconnect();
            if (displaySrc.startsWith('blob:')) {
                URL.revokeObjectURL(displaySrc);
            }
        };
    }, [src]);

    return (
        <div
            ref={imgRef}
            className={`relative overflow-hidden bg-gray-100 ${containerClassName}`}
        >
            {(!isLoaded && !hasError) && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="animate-spin text-gray-300" size={24} />
                </div>
            )}
            {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-300 p-4 text-center">
                    <ImageOff size={24} className="mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-tight">Image Unavailable</span>
                </div>
            )}
            {(isInView && displaySrc) ? (
                <img
                    src={displaySrc}
                    alt={alt}
                    onLoad={() => {
                        setIsLoaded(true);
                        setHasError(false);
                    }}
                    onError={() => {
                        // 如果 blob 失敗，嘗試回歸原始 src
                        if (displaySrc.startsWith('blob:') && src) {
                            setDisplaySrc(src);
                        } else {
                            setHasError(true);
                            setIsLoaded(true);
                        }
                    }}
                    className={`w-full h-full object-cover transition-opacity duration-700 ease-out ${isLoaded && !hasError ? 'opacity-100' : 'opacity-0'} ${className}`}
                    {...props}
                />
            ) : (
                <div className="w-full h-full" />
            )}
        </div>
    );
};
