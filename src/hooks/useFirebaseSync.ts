import { useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Trip } from '../types';

export const useFirebaseSync = () => {
  const { setTrips } = useTripStore();

  useEffect(() => {
    const q = query(
      collection(db, "trips"), 
      orderBy("id", "desc"), 
      limit(5)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // [關鍵修復] 如果快照包含本地尚未完成寫入的變更，忽略此次雲端回傳
      // 這能解決「新增後2秒消失」的問題
      if (snapshot.metadata.hasPendingWrites) return;

      const tripsData: Trip[] = [];
      snapshot.forEach((doc) => {
        tripsData.push(doc.data() as Trip);
      });
      
      if (tripsData.length > 0) {
        setTrips(tripsData);
      }
    }, (error) => {
      console.error("Firebase 同步錯誤:", error);
    });

    return () => unsubscribe();
  }, [setTrips]);
};
