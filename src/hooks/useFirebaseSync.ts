import { useEffect, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Trip } from '../types';

export const useFirebaseSync = () => {
  const { trips } = useTripStore();
  
  const localTripIdsString = useMemo(() => 
    trips.map(t => t.id).filter(Boolean).sort().join(','), 
    [trips]
  );

  useEffect(() => {
    const tripIds = localTripIdsString.split(',').filter(Boolean);
    if (tripIds.length === 0) return;

    const chunks: string[][] = [];
    for (let i = 0; i < tripIds.length; i += 10) {
      chunks.push(tripIds.slice(i, i + 10));
    }

    const unsubscribes = chunks.map(chunk => {
      const q = query(collection(db, "trips"), where("id", "in", chunk));

      return onSnapshot(q, (snapshot) => {
        // ✅ 優化 1：如果是本地端發起的寫入（尚未抵達雲端），先跳過監聽觸發，防止輸入抖動
        if (snapshot.metadata.hasPendingWrites) return;

        const updatedRemoteTrips: Trip[] = [];
        snapshot.docs.forEach((doc) => {
          updatedRemoteTrips.push(doc.data() as Trip);
        });

        if (updatedRemoteTrips.length > 0) {
          useTripStore.setState(state => {
             let isAnyChanged = false;
             const newTrips = state.trips.map(localTrip => {
                const remoteTrip = updatedRemoteTrips.find(rt => rt.id === localTrip.id);
                if (!remoteTrip) return localTrip;

                // ✅ 優化 2：進行內容深度比對，只有當雲端與本地真的不同時才更新狀態
                const isDifferent = JSON.stringify(localTrip) !== JSON.stringify(remoteTrip);
                if (isDifferent) {
                  isAnyChanged = true;
                  return remoteTrip;
                }
                return localTrip;
             });

             if (isAnyChanged) {
               console.log("偵測到旅伴更新，已同步最新行程資料 🔄");
               return { trips: newTrips };
             }
             return state;
          });
        }
      }, (error) => {
        console.error("Firebase 同步錯誤:", error);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [localTripIdsString]); 
};

