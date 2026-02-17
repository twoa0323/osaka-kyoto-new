import { useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'; // 引入 limit
import { Trip } from '../types';

export const useFirebaseSync = () => {
  const { setTrips } = useTripStore();

  useEffect(() => {
    // [關鍵修復]
    // 1. orderBy("id", "desc"): 依照 ID 倒序排列 (假設 ID 是時間戳，越大的越新)
    // 2. limit(5): 只抓取最新的 5 筆資料，忽略之前產生的大量髒資料
    const q = query(
      collection(db, "trips"), 
      orderBy("id", "desc"), 
      limit(5)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData: Trip[] = [];
      snapshot.forEach((doc) => {
        tripsData.push(doc.data() as Trip);
      });
      
      // 更新 Store
      if (tripsData.length > 0) {
        setTrips(tripsData);
      }
    }, (error) => {
      // 這裡可能會因為還沒建立索引報錯，但通常 Firebase 會自動處理單欄位排序
      console.error("Firebase 同步錯誤:", error);
    });

    return () => unsubscribe();
  }, [setTrips]);
};