import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem } from '../types';

interface TripState {
  trips: Trip[];
  currentTripId: string | null;
  activeTab: string;
  setTrips: (trips: Trip[]) => void;
  addTrip: (trip: Trip) => void;
  switchTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
  setActiveTab: (tab: string) => void;
  addScheduleItem: (tripId: string, item: ScheduleItem) => void;
  updateScheduleItem: (tripId: string, itemId: string, newItem: ScheduleItem) => void;
  deleteScheduleItem: (tripId: string, itemId: string) => void;
  // 新增預訂操作
  addBookingItem: (tripId: string, item: BookingItem) => void;
  deleteBookingItem: (tripId: string, itemId: string) => void;
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
        const nextId = newTrips.length > 0 ? newTrips[0].id : null;
        return { trips: newTrips, currentTripId: state.currentTripId === id ? nextId : state.currentTripId };
      }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      addScheduleItem: (tripId, item) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, items: [...(t.items || []), item] } : t)
      })),
      updateScheduleItem: (tripId, itemId, newItem) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, items: t.items.map(i => i.id === itemId ? newItem : i) } : t)
      })),
      deleteScheduleItem: (tripId, itemId) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, items: t.items.filter(i => i.id !== itemId) } : t)
      })),
      // 預訂實作
      addBookingItem: (tripId, item) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: [...(t.bookings || []), item] } : t)
      })),
      deleteBookingItem: (tripId, itemId) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: (t.bookings || []).filter(i => i.id !== itemId) } : t)
      })),
    }),
    { name: 'zakka-trip-storage' }
  )
);