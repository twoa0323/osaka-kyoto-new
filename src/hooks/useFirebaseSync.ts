import { useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'; // 加入 orderBy
import { Trip } from '../types';

export const useFirebaseSync = () => {
  const { setTrips } = useTripStore();

  useEffect(() => {
    // 加入 orderBy 確保資料順序一致 (這能減少跳動)
    // 假設 id 是時間戳，或你可以加一個 createdAt 欄位
    // 這裡暫時先直接抓取
    const q = query(collection(db, "trips"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData: Trip[] = [];
      snapshot.forEach((doc) => {
        tripsData.push(doc.data() as Trip);
      });
      
      // 只有當雲端有資料時才更新，避免把本地新建立的資料瞬間清空
      // 這裡採用「雲端覆蓋本地」策略，適合單人使用
      if (tripsData.length > 0) {
        // 我們將新的行程排在最前面 (假設 ID 越大越新)
        tripsData.sort((a, b) => Number(b.id) - Number(a.id));
        setTrips(tripsData);
      }
    }, (error) => {
      console.error("Firebase 同步錯誤:", error);
    });

    return () => unsubscribe();
  }, [setTrips]);
};