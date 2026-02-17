import { useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { db } from '../services/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Trip } from '../types';

export const useFirebaseSync = () => {
  const { setTrips } = useTripStore();

  useEffect(() => {
    const q = query(collection(db, "trips"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData: Trip[] = [];
      snapshot.forEach((doc) => {
        tripsData.push(doc.data() as Trip);
      });
      
      // 關鍵修正：只有當雲端真的有資料時才更新本地
      if (tripsData.length > 0) {
        setTrips(tripsData);
      }
    });

    return () => unsubscribe();
  }, [setTrips]);
};