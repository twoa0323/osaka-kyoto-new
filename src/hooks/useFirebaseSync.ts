import { useEffect, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Trip } from '../types';

export const useFirebaseSync = () => {
  const { trips } = useTripStore();
  
  // 提取本機端擁有的行程 ID，用來告訴 Firebase 要監聽哪些
  const localTripIdsString = useMemo(() => trips.map(t => t.id).filter(Boolean).sort().join(','), [trips]);

  useEffect(() => {
    const tripIds = localTripIdsString.split(',').filter(Boolean);
    if (tripIds.length === 0) return;

    // Firebase 的 'in' 查詢最多支援 10 個項目。分批處理。
    const chunks: string[][] = [];
    for (let i = 0; i < tripIds.length; i += 10) {
      chunks.push(tripIds.slice(i, i + 10));
    }

    const unsubscribes = chunks.map(chunk => {
      const q = query(collection(db, "trips"), where("id", "in", chunk));

      return onSnapshot(q, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        const updatedRemoteTrips: Trip[] = [];
        snapshot.forEach((doc) => {
          updatedRemoteTrips.push(doc.data() as Trip);
        });

        if (updatedRemoteTrips.length > 0) {
          // 精準將雲端的更新塞回 Zustand，確保共同編輯能即時顯示
          useTripStore.setState(state => {
             const newTrips = state.trips.map(localTrip => {
                const remoteTrip = updatedRemoteTrips.find(rt => rt.id === localTrip.id);
                return remoteTrip ? remoteTrip : localTrip;
             });
             return { trips: newTrips };
          });
        }
      }, (error) => {
        console.error("Firebase 同步錯誤:", error);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [localTripIdsString]); 
};

