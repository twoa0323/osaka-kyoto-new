import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, Member } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

const sanitize = (data: any) => JSON.parse(JSON.stringify(data, (k, v) => (v === undefined ? null : v)));

const syncToCloud = async (trip: Trip) => {
  try {
    await setDoc(doc(db, "trips", trip.id), sanitize(trip));
  } catch (e) {
    console.error("Firebase Sync Fail:", e);
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
  updateTripData: (tripId: string, payload: Partial<Trip>) => void;
  // 快速項操作
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
      addScheduleItem: (tid, item) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { items: [...(t.items || []), item] });
      },
      deleteScheduleItem: (tid, iid) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { items: t.items.filter(i => i.id !== iid) });
      },
      addBookingItem: (tid, item) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { bookings: [...(t.bookings || []), item] });
      },
      updateBookingItem: (tid, iid, ni) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { bookings: t.bookings.map(b => b.id === iid ? ni : b) });
      },
      deleteBookingItem: (tid, iid) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { bookings: t.bookings.filter(b => b.id !== iid) });
      },
      addExpenseItem: (tid, item) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { expenses: [...(t.expenses || []), item] });
      },
      updateExpenseItem: (tid, iid, ni) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { expenses: t.expenses.map(e => e.id === iid ? ni : e) });
      },
      deleteExpenseItem: (tid, iid) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { expenses: t.expenses.filter(e => e.id !== iid) });
      },
    }),
    { name: 'zakka-trip-storage' }
  )
);
