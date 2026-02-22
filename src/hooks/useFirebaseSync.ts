import { useEffect, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem, ShoppingItem, InfoItem } from '../types';

export const useFirebaseSync = () => {
  const { trips } = useTripStore();

  const tripIds = useMemo(() =>
    trips.map(t => t.id).filter(Boolean),
    [trips]
  );

  useEffect(() => {
    if (tripIds.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    tripIds.forEach(tripId => {
      // 1. 監聽主文件 (Metadata)
      const unsubMeta = onSnapshot(doc(db, "trips", tripId), (snapshot) => {
        if (snapshot.metadata.hasPendingWrites || !snapshot.exists()) return;
        const remoteData = snapshot.data() as Partial<Trip>;

        useTripStore.setState(state => ({
          trips: state.trips.map(t => {
            if (t.id === tripId) {
              const isRemoteNewer = !t.updatedAt || (remoteData.updatedAt && remoteData.updatedAt > t.updatedAt);
              if (isRemoteNewer) return { ...t, ...remoteData };
            }
            return t;
          })
        }));
      });
      unsubscribes.push(unsubMeta);

      // 2. 監聽子集合 (Sub-collections)
      const subCollections = [
        { name: "items", field: "items" },
        { name: "bookings", field: "bookings" },
        { name: "expenses", field: "expenses" },
        { name: "journals", field: "journals" },
        { name: "shopping", field: "shoppingList" },
        { name: "info", field: "infoItems" },
      ];

      subCollections.forEach(sub => {
        const unsubSub = onSnapshot(collection(db, "trips", tripId, sub.name), (snapshot) => {
          if (snapshot.metadata.hasPendingWrites) return;

          const items: any[] = [];
          snapshot.docs.forEach(doc => items.push(doc.data()));

          useTripStore.setState(state => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, [sub.field]: items } : t)
          }));
        });
        unsubscribes.push(unsubSub);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [tripIds.join(',')]);
};

