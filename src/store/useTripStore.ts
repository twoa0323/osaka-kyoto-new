import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// 1. 補上 ScheduleItem 的引入
import { Trip, ScheduleItem } from '../types';

interface TripState {
  trips: Trip[];
  currentTripId: string | null;
  activeTab: string;
  setTrips: (trips: Trip[]) => void;
  addTrip: (trip: Trip) => void;
  switchTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
  setActiveTab: (tab: string) => void;
  // 2. 在 Interface 中新增這兩個方法的定義
  addScheduleItem: (tripId: string, item: ScheduleItem) => void;
  deleteScheduleItem: (tripId: string, itemId: string) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      trips: [],
      currentTripId: null,
      activeTab: 'schedule',
      setTrips: (trips) => set({ trips }),
      addTrip: (trip) => set((state) => {
        const newTrips = [trip, ...state.trips].slice(0, 3);
        return { trips: newTrips, currentTripId: trip.id };
      }),
      switchTrip: (id) => set({ currentTripId: id }),
      deleteTrip: (id) => set((state) => {
        const newTrips = state.trips.filter(t => t.id !== id);
        return { 
          trips: newTrips, 
          currentTripId: newTrips.length > 0 ? newTrips[0].id : null 
        };
      }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      // 3. 將邏輯移入物件內部，並修正語法
      addScheduleItem: (tripId, item) => set((state) => {
        const trips = state.trips.map(t => {
          if (t.id === tripId) {
            // 確保 items 存在，若無則初始化為空陣列
            return { ...t, items: [...(t.items || []), item] };
          }
          return t;
        });
        return { trips };
      }),

      deleteScheduleItem: (tripId, itemId) => set((state) => {
        const trips = state.trips.map(t => {
          if (t.id === tripId) {
            return { ...t, items: (t.items || []).filter(i => i.id !== itemId) };
          }
          return t;
        });
        return { trips };
      }),
    }),
    { name: 'zakka-trip-storage' }
  )
);