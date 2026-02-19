import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

const deepSanitize = (obj: any): any => JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));

const syncToCloud = async (trip: Trip) => {
  if (!trip?.id) return;
  try { await setDoc(doc(db, "trips", trip.id), deepSanitize(trip)); } 
  catch (e) { console.error("Cloud Sync Fail:", e); }
};

interface TripState {
  trips: Trip[]; currentTripId: string | null; activeTab: string; exchangeRate: number;
  setTrips: (t: Trip[]) => void; setActiveTab: (t: string) => void; setExchangeRate: (r: number) => void;
  addTrip: (t: Trip) => void; switchTrip: (id: string) => void; deleteTrip: (id: string) => void;
  updateTripData: (tid: string, p: Partial<Trip>) => void;
  addScheduleItem: (tid: string, i: ScheduleItem) => void;
  updateScheduleItem: (tid: string, iid: string, ni: ScheduleItem) => void;
  deleteScheduleItem: (tid: string, iid: string) => void;
  reorderScheduleItems: (tid: string, ni: ScheduleItem[]) => void;
  addBookingItem: (tid: string, i: any) => void; updateBookingItem: (tid: string, iid: string, ni: any) => void; deleteBookingItem: (tid: string, iid: string) => void;
  addExpenseItem: (tid: string, i: any) => void; updateExpenseItem: (tid: string, iid: string, ni: any) => void; deleteExpenseItem: (tid: string, iid: string) => void;
}

export const useTripStore = create<TripState>()(
  persist((set, get) => ({
    trips: [], currentTripId: null, activeTab: 'schedule', exchangeRate: 1,
    setTrips: (trips) => set({ trips }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setExchangeRate: (exchangeRate) => set({ exchangeRate }),
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
    addScheduleItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { items: [...(t.items || []), i] }); },
    updateScheduleItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { items: (t.items || []).map(x => x.id === iid ? ni : x) }); },
    deleteScheduleItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { items: (t.items || []).filter(x => x.id !== iid) }); },
    reorderScheduleItems: (tid, ni) => get().updateTripData(tid, { items: ni }),
    addBookingItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { bookings: [...(t.bookings || []), i] }); },
    updateBookingItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { bookings: (t.bookings || []).map(b => b.id === iid ? ni : b) }); },
    deleteBookingItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { bookings: t.bookings.filter(b => b.id !== iid) }); },
    addExpenseItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { expenses: [...(t.expenses || []), i] }); },
    updateExpenseItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { expenses: (t.expenses || []).map(e => e.id === iid ? ni : e) }); },
    deleteExpenseItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { expenses: t.expenses.filter(e => e.id !== iid) }); },
  }), { name: 'zakka-trip-storage' })
);











