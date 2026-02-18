import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

const sanitize = (data: any) => JSON.parse(JSON.stringify(data, (k, v) => v === undefined ? null : v));

const syncToCloud = async (trip: Trip) => {
  if (!trip?.id) return;
  try {
    await setDoc(doc(db, "trips", trip.id), sanitize(trip));
  } catch (e) {
    console.error("Cloud Sync Fail:", e);
  }
};

interface TripState {
  trips: Trip[];
  currentTripId: string | null;
  activeTab: string;
  exchangeRate: number;
  setTrips: (trips: Trip[]) => void;
  setActiveTab: (tab: string) => void;
  setExchangeRate: (rate: number) => void;
  addTrip: (trip: Trip) => void;
  switchTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
  updateTripData: (tid: string, payload: Partial<Trip>) => void;
  addScheduleItem: (tid: string, item: ScheduleItem) => void;
  deleteScheduleItem: (tid: string, iid: string) => void;
  addBookingItem: (tid: string, item: BookingItem) => void;
  updateBookingItem: (tid: string, iid: string, ni: BookingItem) => void;
  deleteBookingItem: (tid: string, iid: string) => void;
  addExpenseItem: (tid: string, item: ExpenseItem) => void;
  updateExpenseItem: (tid: string, iid: string, ni: ExpenseItem) => void;
  deleteExpenseItem: (tid: string, iid: string) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [], currentTripId: null, activeTab: 'schedule', exchangeRate: 1,
      setTrips: (trips) => set({ trips }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
      addTrip: (trip) => { set(s => ({ trips: [trip, ...s.trips].slice(0, 3), currentTripId: trip.id })); syncToCloud(trip); },
      switchTrip: (id) => set({ currentTripId: id }),
      deleteTrip: (id) => set(s => {
        const nt = s.trips.filter(t => t.id !== id);
        return { trips: nt, currentTripId: s.currentTripId === id ? (nt[0]?.id || null) : s.currentTripId };
      }),
      updateTripData: (tid, payload) => {
        set(s => ({ trips: s.trips.map(t => t.id === tid ? { ...t, ...payload } : t) }));
        const updated = get().trips.find(t => t.id === tid);
        if (updated) syncToCloud(updated);
      },
      addScheduleItem: (tid, item) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, items: [...(t.items || []), item]} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      deleteScheduleItem: (tid, iid) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, items: t.items.filter(i => i.id !== iid)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      addBookingItem: (tid, item) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, bookings: [...(t.bookings || []), item]} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      updateBookingItem: (tid, iid, ni) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, bookings: t.bookings.map(b => b.id === iid ? ni : b)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      deleteBookingItem: (tid, iid) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, bookings: t.bookings.filter(b => b.id !== iid)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      addExpenseItem: (tid, item) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, expenses: [...(t.expenses || []), item]} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      updateExpenseItem: (tid, iid, ni) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, expenses: t.expenses.map(e => e.id === iid ? ni : e)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      deleteExpenseItem: (tid, iid) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, expenses: t.expenses.filter(e => e.id !== iid)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
    }),
    { name: 'zakka-trip-storage' }
  )
);



