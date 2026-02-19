import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem, ShoppingItem, InfoItem } from '../types';
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
  // 各模組 CRUD
  addScheduleItem: (tid: string, i: ScheduleItem) => void;
  updateScheduleItem: (tid: string, iid: string, ni: ScheduleItem) => void;
  deleteScheduleItem: (tid: string, iid: string) => void;
  reorderScheduleItems: (tid: string, ni: ScheduleItem[]) => void;
  addBookingItem: (tid: string, i: BookingItem) => void;
  updateBookingItem: (tid: string, iid: string, ni: BookingItem) => void;
  deleteBookingItem: (tid: string, iid: string) => void;
  addExpenseItem: (tid: string, i: ExpenseItem) => void;
  updateExpenseItem: (tid: string, iid: string, ni: ExpenseItem) => void;
  deleteExpenseItem: (tid: string, iid: string) => void;
  addJournalItem: (tid: string, i: JournalItem) => void;
  deleteJournalItem: (tid: string, iid: string) => void;
  addShoppingItem: (tid: string, i: ShoppingItem) => void;
  toggleShoppingItem: (tid: string, iid: string) => void;
  deleteShoppingItem: (tid: string, iid: string) => void;
  addInfoItem: (tid: string, i: InfoItem) => void;
  deleteInfoItem: (tid: string, iid: string) => void;
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
    // Schedule
    addScheduleItem: (tid, i) => get().updateTripData(tid, { items: [...(get().trips.find(x => x.id === tid)?.items || []), i] }),
    updateScheduleItem: (tid, iid, ni) => get().updateTripData(tid, { items: (get().trips.find(x => x.id === tid)?.items || []).map(x => x.id === iid ? ni : x) }),
    deleteScheduleItem: (tid, iid) => get().updateTripData(tid, { items: (get().trips.find(x => x.id === tid)?.items || []).filter(x => x.id !== iid) }),
    reorderScheduleItems: (tid, ni) => get().updateTripData(tid, { items: ni }),
    // Booking
    addBookingItem: (tid, i) => get().updateTripData(tid, { bookings: [...(get().trips.find(x => x.id === tid)?.bookings || []), i] }),
    updateBookingItem: (tid, iid, ni) => get().updateTripData(tid, { bookings: (get().trips.find(x => x.id === tid)?.bookings || []).map(x => x.id === iid ? ni : x) }),
    deleteBookingItem: (tid, iid) => get().updateTripData(tid, { bookings: (get().trips.find(x => x.id === tid)?.bookings || []).filter(x => x.id !== iid) }),
    // Expense
    addExpenseItem: (tid, i) => get().updateTripData(tid, { expenses: [...(get().trips.find(x => x.id === tid)?.expenses || []), i] }),
    updateExpenseItem: (tid, iid, ni) => get().updateTripData(tid, { expenses: (get().trips.find(x => x.id === tid)?.expenses || []).map(x => x.id === iid ? ni : x) }),
    deleteExpenseItem: (tid, iid) => get().updateTripData(tid, { expenses: (get().trips.find(x => x.id === tid)?.expenses || []).filter(x => x.id !== iid) }),
    // Journal
    addJournalItem: (tid, i) => get().updateTripData(tid, { journals: [i, ...(get().trips.find(x => x.id === tid)?.journals || [])] }),
    deleteJournalItem: (tid, iid) => get().updateTripData(tid, { journals: (get().trips.find(x => x.id === tid)?.journals || []).filter(x => x.id !== iid) }),
    // Shopping
    addShoppingItem: (tid, i) => get().updateTripData(tid, { shoppingList: [...(get().trips.find(x => x.id === tid)?.shoppingList || []), i] }),
    toggleShoppingItem: (tid, iid) => get().updateTripData(tid, { shoppingList: (get().trips.find(x => x.id === tid)?.shoppingList || []).map(x => x.id === iid ? {...x, isBought: !x.isBought} : x) }),
    deleteShoppingItem: (tid, iid) => get().updateTripData(tid, { shoppingList: (get().trips.find(x => x.id === tid)?.shoppingList || []).filter(x => x.id !== iid) }),
    // Info
    addInfoItem: (tid, i) => get().updateTripData(tid, { infoItems: [i, ...(get().trips.find(x => x.id === tid)?.infoItems || [])] }),
    deleteInfoItem: (tid, iid) => get().updateTripData(tid, { infoItems: (get().trips.find(x => x.id === tid)?.infoItems || []).filter(x => x.id !== iid) }),
  }), { name: 'zakka-trip-storage' })
);










