import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem, ShoppingItem, InfoItem } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

// 深度淨化：Firestore 不接受 undefined，此函式確保資料完整寫入雲端
const deepSanitize = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
};

const syncToCloud = async (trip: Trip) => {
  try {
    await setDoc(doc(db, "trips", trip.id), deepSanitize(trip));
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
  // CRUD
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
      setActiveTab: (tab) => set({ activeTab: tab }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
      addTrip: (trip) => { set(s => ({ trips: [trip, ...s.trips].slice(0, 3), currentTripId: trip.id })); syncToCloud(trip); },
      switchTrip: (id) => set({ currentTripId: id }),
      deleteTrip: (id) => set(s => {
        const nt = s.trips.filter(t => t.id !== id);
        return { trips: nt, currentTripId: s.currentTripId === id ? (nt[0]?.id || null) : s.currentTripId };
      }),

      addScheduleItem: (tid, item) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, items: [...(t.items || []), item]} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      deleteScheduleItem: (tid, iid) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, items: t.items.filter(i => i.id !== iid)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      
      addBookingItem: (tid, item) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, bookings: [...(t.bookings || []), item]} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      updateBookingItem: (tid, iid, ni) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, bookings: t.bookings.map(b => b.id === iid ? ni : b)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      deleteBookingItem: (tid, iid) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, bookings: t.bookings.filter(b => b.id !== iid)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },

      addExpenseItem: (tid, item) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, expenses: [...(t.expenses || []), item]} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      updateExpenseItem: (tid, iid, ni) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, expenses: t.expenses.map(e => e.id === iid ? ni : e)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      deleteExpenseItem: (tid, iid) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, expenses: t.expenses.filter(e => e.id !== iid)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },

      addJournalItem: (tid, item) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, journals: [item, ...(t.journals || [])]} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      deleteJournalItem: (tid, iid) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, journals: t.journals.filter(j => j.id !== iid)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },

      addShoppingItem: (tid, item) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, shoppingList: [...(t.shoppingList || []), item]} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      toggleShoppingItem: (tid, iid) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, shoppingList: t.shoppingList.map(i => i.id === iid ? {...i, isBought: !i.isBought} : i)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      deleteShoppingItem: (tid, iid) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, shoppingList: t.shoppingList.filter(i => i.id !== iid)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },

      addInfoItem: (tid, item) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, infoItems: [item, ...(t.infoItems || [])]} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
      deleteInfoItem: (tid, iid) => { set(s => ({ trips: s.trips.map(t => t.id === tid ? {...t, infoItems: t.infoItems.filter(i => i.id !== iid)} : t)})); syncToCloud(get().trips.find(t => t.id === tid)!); },
    }),
    { name: 'zakka-trip-storage' }
  )
);
