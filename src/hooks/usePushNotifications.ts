import { useState, useEffect } from 'react';
import { messaging, db, auth } from '../services/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export const usePushNotifications = (tripId: string) => {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) return;

        try {
            const status = await Notification.requestPermission();
            setPermission(status);

            if (status === 'granted' && messaging) {
                // 等待 Vite PWA 的 Service Worker 註冊完成
                let registration = await navigator.serviceWorker.getRegistration();
                if (!registration) {
                    registration = await navigator.serviceWorker.register('/sw.js');
                }

                // VAPID Key 通常來自 Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificate
                // @ts-ignore - 略過 TypeScript 對 Vite import.meta.env 的型別檢查警告
                const token = await getToken(messaging, {
                    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    setFcmToken(token);
                    const uid = auth.currentUser?.uid;
                    if (uid && tripId) {
                        // 儲存 Token 到旅程中的成員資料或全域用戶 Profile
                        // 這裡我們先存入 trip 的成員白名單資訊中 (假設有一個 fcmTokens 欄位)
                        const tripRef = doc(db, 'trips', tripId);
                        await updateDoc(tripRef, {
                            [`memberFcmTokens.${uid}`]: token
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Push notification permission error:', error);
        }
    };

    return { permission, fcmToken, requestPermission };
};
