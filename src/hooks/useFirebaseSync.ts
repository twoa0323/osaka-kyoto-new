import { useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { db } from '../services/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Trip } from '../types';

export const useFirebaseSync = () => {
  const { setTrips } = useTripStore();

  useEffect(() => {
    // 監聽 Firestore 的 trips 集合
    const q = query(collection(db, "trips"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData: Trip[] = [];
      snapshot.forEach((doc) => {
        tripsData.push(doc.data() as Trip);
      });
      
      if (tripsData.length > 0) {
        // 如果雲端有資料，更新 Zustand Store
        // 這裡可以視需求決定是要覆蓋本地還是合併
        setTrips(tripsData);
      }
    });

    return () => unsubscribe();
  }, [setTrips]);
};