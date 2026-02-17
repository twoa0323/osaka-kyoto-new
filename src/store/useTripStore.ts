import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip } from '../types';

interface TripState {
  trips: Trip[];             // 儲存最多 3 個行程
  currentTripId: string | null;
  activeTab: string;
  setTrips: (trips: Trip[]) => void;
  addTrip: (trip: Trip) => void;
  switchTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      trips: [],
      currentTripId: null,
      activeTab: 'schedule',
      setTrips: (trips) => set({ trips }),
      addTrip: (trip) => set((state) => {
        const newTrips = [trip, ...state.trips].slice(0, 3); // 限制最多 3 個
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
    }),
    { name: 'zakka-trip-storage' }
  )
);