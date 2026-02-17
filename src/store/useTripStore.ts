import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem, ShoppingItem, InfoItem } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

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
  
  // CRUD Methods
  addScheduleItem: (tripId: string, item: ScheduleItem) => void;
  updateScheduleItem: (tripId: string, itemId: string, newItem: ScheduleItem) => void;
  deleteScheduleItem: (tripId: string, itemId: string) => void;
  
  addBookingItem: (tripId: string, item: BookingItem) => void;
  updateBookingItem: (tripId: string, itemId: string, newItem: BookingItem) => void; // 新增更新方法
  deleteBookingItem: (tripId: string, itemId: string) => void;
  
  addExpenseItem: (tripId: string, item: ExpenseItem) => void;
  deleteExpenseItem: (tripId: string, itemId: string) => void;
  
  addJournalItem: (tripId: string, item: JournalItem) => void;
  deleteJournalItem: (tripId: string, itemId: string) => void;
  
  addShoppingItem: (tripId: string, item: ShoppingItem) => void;
  toggleShoppingItem: (tripId: string, itemId: string) => void;
  deleteShoppingItem: (tripId: string, itemId: string) => void;
  
  addInfoItem: (tripId: string, item: InfoItem) => void;
  deleteInfoItem: (tripId: string, itemId: string) => void;
}

// 關鍵修復：移除 undefined，解決 Firebase 寫入失敗導致資料回滾的問題
const sanitize = (data: any) => JSON.parse(JSON.stringify(data));

const syncToCloud = async (trip: Trip) => {
  try {
    await setDoc(doc(db, "trips", trip.id), sanitize(trip));
  } catch (e) {
    console.error("雲端同步失敗:", e);
  }
};

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      currentTripId: null,
      activeTab: 'schedule',
      exchangeRate: 1,
      setTrips: (trips) => set({ trips }),
      
      addTrip: (trip) => {
        set((state) => ({ trips: [trip, ...state.trips].slice(0, 3), currentTripId: trip.id }));
        syncToCloud(trip);
      },
      switchTrip: (id) => set({ currentTripId: id }),
      deleteTrip: (id) => set((state) => {
        const newTrips = state.trips.filter(t => t.id !== id);
        return { trips: newTrips, currentTripId: state.currentTripId === id ? (newTrips[0]?.id || null) : state.currentTripId };
      }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),

      // --- Schedule ---
      addScheduleItem: (tripId, item) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, items: [...(t.items || []), item] } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      updateScheduleItem: (tripId, itemId, newItem) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, items: (t.items || []).map(i => i.id === itemId ? newItem : i) } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteScheduleItem: (tripId, itemId) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, items: (t.items || []).filter(i => i.id !== itemId) } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },

      // --- Booking ---
      addBookingItem: (tripId, item) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: [...(t.bookings || []), item] } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      updateBookingItem: (tripId, itemId, newItem) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: (t.bookings || []).map(b => b.id === itemId ? newItem : b) } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteBookingItem: (tripId, itemId) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: (t.bookings || []).filter(i => i.id !== itemId) } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },

      // --- Expense ---
      addExpenseItem: (tripId, item) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: [...(t.expenses || []), item] } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteExpenseItem: (tripId, itemId) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: (t.expenses || []).filter(i => i.id !== itemId) } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },

      // --- Journal ---
      addJournalItem: (tripId, item) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, journals: [item, ...(t.journals || [])] } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteJournalItem: (tripId, itemId) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, journals: (t.journals || []).filter(i => i.id !== itemId) } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },

      // --- Shopping ---
      addShoppingItem: (tripId, item) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, shoppingList: [...(t.shoppingList || []), item] } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      toggleShoppingItem: (tripId, itemId) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, shoppingList: (t.shoppingList || []).map(i => i.id === itemId ? { ...i, isBought: !i.isBought } : i) } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteShoppingItem: (tripId, itemId) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, shoppingList: (t.shoppingList || []).filter(i => i.id !== itemId) } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },

      // --- Info ---
      addInfoItem: (tripId, item) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, infoItems: [item, ...(t.infoItems || [])] } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteInfoItem: (tripId, itemId) => {
        set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, infoItems: (t.infoItems || []).filter(i => i.id !== itemId) } : t) }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
    }),
    { name: 'zakka-trip-storage' }
  )
);