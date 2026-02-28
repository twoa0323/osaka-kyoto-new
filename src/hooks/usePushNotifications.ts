import { useState, useEffect } from 'react';
import { messaging, db, auth } from '../services/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

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
                const token = await getToken(messaging, {
                    // @ts-ignore - 略過 TypeScript 對 Vite import.meta.env 的型別檢查警告
                    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    setFcmToken(token);
                    const uid = auth.currentUser?.uid;
                    if (uid && tripId) {
                        // 儲存 Token 到旅程中的成員資料或全域用戶 Profile
                        // 改用 setDoc 搭配 merge: true，避免在 Trip 剛建立還未同步時發生 No document to update 錯誤
                        const tripRef = doc(db, 'trips', tripId);
                        await setDoc(tripRef, {
                            [`memberFcmTokens.${uid}`]: token
                        }, { merge: true });
                    }
                }
            }
        } catch (error) {
            console.error('Push notification permission error:', error);
        }
    };

    return { permission, fcmToken, requestPermission };
};
