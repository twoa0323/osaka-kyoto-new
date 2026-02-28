import { useState, useEffect } from 'react';

// 定義回傳的感測器數據介面
interface GyroscopeData {
    x: number; // 左右傾斜 (gamma)，正規化範圍約 -10 到 +10
    y: number; // 前後傾斜 (beta)，正規化範圍約 -10 到 +10
    isSupported: boolean;
}

export const useGyroscope = (sensitivity: number = 0.5) => {
    const [data, setData] = useState<GyroscopeData>({ x: 0, y: 0, isSupported: true });

    useEffect(() => {
        // 檢查是否支援設備方向事件
        if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
            setData(prev => ({ ...prev, isSupported: false }));
            return;
        }

        let animationFrameId: number;
        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            if (!event.gamma || !event.beta) return;

            // Beta: 前後傾斜 [-180, 180]。平常手持約 30~60 度。我們取 45 度為基準 0
            // Gamma: 左右傾斜 [-90, 90]。基準為 0

            // 基礎數值擷取並作微調限制
            let rawY = event.beta - 45; // 將 45 度視為平置 (y=0)
            let rawX = event.gamma;

            // 限制最大傾斜角度以避免破圖 (-30 到 30 度)
            rawY = Math.max(-30, Math.min(30, rawY));
            rawX = Math.max(-30, Math.min(30, rawX));

            // 套用靈敏度與轉換，目標位移量大約在 -15px 到 15px 之間
            targetY = rawY * sensitivity;
            targetX = rawX * sensitivity;
        };

        // Lerp (線性插值) 平滑函數，用於消除手抖
        const smoothUpdate = () => {
            // Lerp factor: 0.1 代表每幀趨近目標值的 10%，數字越小越平滑但延遲越重
            const lerpFactor = 0.1;

            currentX += (targetX - currentX) * lerpFactor;
            currentY += (targetY - currentY) * lerpFactor;

            setData({
                x: Number(currentX.toFixed(2)),
                y: Number(currentY.toFixed(2)),
                isSupported: true
            });

            animationFrameId = requestAnimationFrame(smoothUpdate);
        };

        // 需要請求 iOS 13+ 權限
        const requestAccess = async () => {
            if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                try {
                    const permissionState = await (DeviceOrientationEvent as any).requestPermission();
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                        animationFrameId = requestAnimationFrame(smoothUpdate);
                    } else {
                        setData(prev => ({ ...prev, isSupported: false }));
                    }
                } catch (error) {
                    console.error('Error requesting device orientation permission:', error);
                    setData(prev => ({ ...prev, isSupported: false }));
                }
            } else {
                // 非 iOS 13+ 設備直接監聽
                window.addEventListener('deviceorientation', handleOrientation);
                animationFrameId = requestAnimationFrame(smoothUpdate);
            }
        };

        requestAccess();

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [sensitivity]);

    return data;
};
