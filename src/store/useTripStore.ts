import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem, ShoppingItem, InfoItem } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

// 核心保護機制：遞迴清除 undefined，確保 Firestore 寫入成功，解決閃現後消失的 Bug
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
  // CRUD
  addScheduleItem: (tid: string, i: ScheduleItem) => void;
  deleteScheduleItem: (tid: string, iid: string) => void;
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
    // CRUD 實作與同步
    addScheduleItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { items: [...(t.items || []), i] }); },
    deleteScheduleItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { items: t.items.filter(x => x.id !== iid) }); },
    addBookingItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { bookings: [...(t.bookings || []), i] }); },
    updateBookingItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { bookings: t.bookings.map(b => b.id === iid ? ni : b) }); },
    deleteBookingItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { bookings: t.bookings.filter(b => b.id !== iid) }); },
    addExpenseItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { expenses: [...(t.expenses || []), i] }); },
    updateExpenseItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { expenses: t.expenses.map(e => e.id === iid ? ni : e) }); },
    deleteExpenseItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { expenses: t.expenses.filter(e => e.id !== iid) }); },
    addJournalItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { journals: [i, ...(t.journals || [])] }); },
    deleteJournalItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { journals: t.journals.filter(j => j.id !== iid) }); },
    addShoppingItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { shoppingList: [...(t.shoppingList || []), i] }); },
    toggleShoppingItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { shoppingList: t.shoppingList.map(x => x.id === iid ? {...x, isBought: !x.isBought} : x) }); },
    deleteShoppingItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { shoppingList: t.shoppingList.filter(x => x.id !== iid) }); },
    addInfoItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { infoItems: [i, ...(t.infoItems || [])] }); },
    deleteInfoItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { infoItems: t.infoItems.filter(x => x.id !== iid) }); },
  }), { name: 'zakka-trip-storage' })
);







