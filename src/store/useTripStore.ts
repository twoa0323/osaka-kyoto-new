import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem } from '../types';

interface TripState {
  // 狀態
  trips: Trip[];
  currentTripId: string | null;
  activeTab: string;

  // 行程 (Trip) 操作
  setTrips: (trips: Trip[]) => void;
  addTrip: (trip: Trip) => void;
  switchTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
  setActiveTab: (tab: string) => void;

  // 行程細項 (ScheduleItem) 操作
  addScheduleItem: (tripId: string, item: ScheduleItem) => void;
  updateScheduleItem: (tripId: string, itemId: string, newItem: ScheduleItem) => void;
  deleteScheduleItem: (tripId: string, itemId: string) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      // --- 初始狀態 ---
      trips: [],
      currentTripId: null,
      activeTab: 'schedule',

      // --- 行程 (Trip) 邏輯 ---
      setTrips: (trips) => set({ trips }),

      addTrip: (trip) => set((state) => {
        // 限制最多保留 3 個行程，新的排在最前面
        const newTrips = [trip, ...state.trips].slice(0, 3);
        return { 
          trips: newTrips, 
          currentTripId: trip.id 
        };
      }),

      switchTrip: (id) => set({ currentTripId: id }),

      deleteTrip: (id) => set((state) => {
        const newTrips = state.trips.filter(t => t.id !== id);
        // 如果刪除的是當前選取的行程，則自動切換到清單中的第一個，或設為 null
        const nextId = newTrips.length > 0 ? newTrips[0].id : null;
        return { 
          trips: newTrips, 
          currentTripId: state.currentTripId === id ? nextId : state.currentTripId 
        };
      }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      // --- 行程細項 (ScheduleItem) 邏輯 ---
      
      // 新增細項
      addScheduleItem: (tripId, item) => set((state) => {
        const updatedTrips = state.trips.map((t) => {
          if (t.id === tripId) {
            // 確保 items 存在 (t.items 可能為 undefined)
            const currentItems = t.items || [];
            return { ...t, items: [...currentItems, item] };
          }
          return t;
        });
        return { trips: updatedTrips };
      }),

      // 更新細項 (編輯功能)
      updateScheduleItem: (tripId, itemId, newItem) => set((state) => {
        const updatedTrips = state.trips.map((t) => {
          if (t.id === tripId) {
            const updatedItems = (t.items || []).map((i) => 
              i.id === itemId ? newItem : i
            );
            return { ...t, items: updatedItems };
          }
          return t;
        });
        return { trips: updatedTrips };
      }),

      // 刪除細項
      deleteScheduleItem: (tripId, itemId) => set((state) => {
        const updatedTrips = state.trips.map((t) => {
          if (t.id === tripId) {
            const filteredItems = (t.items || []).filter((i) => i.id !== itemId);
            return { ...t, items: filteredItems };
          }
          return t;
        });
        return { trips: updatedTrips };
      }),
    }),
    {
      name: 'zakka-trip-storage', // 持久化儲存在 LocalStorage 的名稱
    }
  )
);