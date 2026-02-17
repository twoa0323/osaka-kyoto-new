import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // 加入持久化插件
import { Trip } from '../types';

interface TripState {
  currentTrip: Trip | null;
  exchangeRate: number;
  activeTab: string;
  setTrip: (trip: Trip) => void;
  setExchangeRate: (rate: number) => void;
  setActiveTab: (tab: string) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      currentTrip: null,
      exchangeRate: 1,
      activeTab: 'schedule',
      setTrip: (trip) => set({ currentTrip: trip }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'trip-storage', // 儲存於 LocalStorage 的 Key
    }
  )
);