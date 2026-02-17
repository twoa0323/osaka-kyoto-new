import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem } from '../types';

interface TripState {
  trips: Trip[];
  currentTripId: string | null;
  activeTab: string;
  exchangeRate: number;
  setTrips: (trips: Trip[]) => void;
  addTrip: (trip: Trip) => void;
  switchTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
  setActiveTab: (tab: string) => void;
  setExchangeRate: (rate: number) => void;
  addScheduleItem: (tripId: string, item: ScheduleItem) => void;
  updateScheduleItem: (tripId: string, itemId: string, newItem: ScheduleItem) => void;
  deleteScheduleItem: (tripId: string, itemId: string) => void;
  addBookingItem: (tripId: string, item: BookingItem) => void;
  deleteBookingItem: (tripId: string, itemId: string) => void;
  addExpenseItem: (tripId: string, item: ExpenseItem) => void;
  deleteExpenseItem: (tripId: string, itemId: string) => void;
  // 美食日誌操作
  addJournalItem: (tripId: string, item: JournalItem) => void;
  deleteJournalItem: (tripId: string, itemId: string) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      trips: [],
      currentTripId: null,
      activeTab: 'schedule',
      exchangeRate: 1,
      setTrips: (trips) => set({ trips }),
      addTrip: (trip) => set((state) => ({ trips: [trip, ...state.trips].slice(0, 3), currentTripId: trip.id })),
      switchTrip: (id) => set({ currentTripId: id }),
      deleteTrip: (id) => set((state) => {
        const newTrips = state.trips.filter(t => t.id !== id);
        return { trips: newTrips, currentTripId: state.currentTripId === id ? (newTrips[0]?.id || null) : state.currentTripId };
      }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
      addScheduleItem: (tripId, item) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, items: [...(t.items || []), item] } : t) })),
      updateScheduleItem: (tripId, itemId, newItem) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, items: (t.items || []).map(i => i.id === itemId ? newItem : i) } : t) })),
      deleteScheduleItem: (tripId, itemId) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, items: (t.items || []).filter(i => i.id !== itemId) } : t) })),
      addBookingItem: (tripId, item) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: [...(t.bookings || []), item] } : t) })),
      deleteBookingItem: (tripId, itemId) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: (t.bookings || []).filter(i => i.id !== itemId) } : t) })),
      addExpenseItem: (tripId, item) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: [...(t.expenses || []), item] } : t) })),
      deleteExpenseItem: (tripId, itemId) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: (t.expenses || []).filter(i => i.id !== itemId) } : t) })),
      // 日誌實作
      addJournalItem: (tripId, item) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, journals: [item, ...(t.journals || [])] } : t)
      })),
      deleteJournalItem: (tripId, itemId) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, journals: (t.journals || []).filter(i => i.id !== itemId) } : t)
      })),
    }),
    { name: 'zakka-trip-storage' }
  )
);