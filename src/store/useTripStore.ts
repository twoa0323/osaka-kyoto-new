import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem, ShoppingItem, InfoItem } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

// 深度淨化：Firestore 不接受 undefined，此函式確保資料寫入雲端前 100% 合規
const deepSanitize = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
};

const syncToCloud = async (trip: Trip) => {
  if (!trip?.id) return;
  try {
    await setDoc(doc(db, "trips", trip.id), deepSanitize(trip));
  } catch (e) {
    console.error("Firebase Sync Error:", e);
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
  // 快速 CRUD 操作
  addScheduleItem: (tid: string, item: ScheduleItem) => void;
  deleteScheduleItem: (tid: string, iid: string) => void;
  addBookingItem: (tid: string, item: BookingItem) => void;
  updateBookingItem: (tid: string, iid: string, ni: BookingItem) => void;
  deleteBookingItem: (tid: string, iid: string) => void;
  addExpenseItem: (tid: string, item: ExpenseItem) => void;
  updateExpenseItem: (tid: string, iid: string, ni: ExpenseItem) => void;
  deleteExpenseItem: (tid: string, iid: string) => void;
  addJournalItem: (tid: string, item: JournalItem) => void;
  deleteJournalItem: (tid: string, iid: string) => void;
  addShoppingItem: (tid: string, item: ShoppingItem) => void;
  toggleShoppingItem: (tid: string, iid: string) => void;
  deleteShoppingItem: (tid: string, iid: string) => void;
  addInfoItem: (tid: string, item: InfoItem) => void;
  deleteInfoItem: (tid: string, iid: string) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [], currentTripId: null, activeTab: 'schedule', exchangeRate: 1,
      setTrips: (trips) => set({ trips }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setExchangeRate: (exchangeRate) => set({ exchangeRate }),
      addTrip: (trip) => {
        set(s => ({ trips: [trip, ...s.trips].slice(0, 3), currentTripId: trip.id }));
        syncToCloud(trip);
      },
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
      addJournalItem: (tid, item) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { journals: [item, ...(t.journals || [])] });
      },
      deleteJournalItem: (tid, iid) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { journals: t.journals.filter(j => j.id !== iid) });
      },
      addShoppingItem: (tid, item) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { shoppingList: [...(t.shoppingList || []), item] });
      },
      toggleShoppingItem: (tid, iid) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { shoppingList: t.shoppingList.map(i => i.id === iid ? { ...i, isBought: !i.isBought } : i) });
      },
      deleteShoppingItem: (tid, iid) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { shoppingList: t.shoppingList.filter(i => i.id !== iid) });
      },
      addInfoItem: (tid, item) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { infoItems: [item, ...(t.infoItems || [])] });
      },
      deleteInfoItem: (tid, iid) => {
        const t = get().trips.find(x => x.id === tid);
        if (t) get().updateTripData(tid, { infoItems: t.infoItems.filter(i => i.id !== iid) });
      },
    }),
    { name: 'zakka-trip-storage' }
  )
);





