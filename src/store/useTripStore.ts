import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem, ShoppingItem, InfoItem } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

// --- 核心輔助函式 ---

/**
 * 解決 Firestore 寫入失敗導致資料消失的主因：
 * Firestore 不允許物件中包含 undefined。此函式將物件轉換為純 JSON，
 * 自動將 undefined 移除或轉為 null。
 */
const sanitize = (data: any) => JSON.parse(JSON.stringify(data));

/**
 * 雲端同步函式：
 * 每次本地資料變動後，將該筆行程完整推送到 Firebase。
 */
const syncToCloud = async (trip: Trip) => {
  try {
    await setDoc(doc(db, "trips", trip.id), sanitize(trip));
  } catch (e) {
    console.error("Firebase 雲端同步失敗，請檢查網路或 Firestore 規則:", e);
  }
};

// --- Store 介面定義 ---

interface TripState {
  // 狀態
  trips: Trip[];
  currentTripId: string | null;
  activeTab: string;
  exchangeRate: number;

  // 全域操作
  setTrips: (trips: Trip[]) => void;
  setActiveTab: (tab: string) => void;
  setExchangeRate: (rate: number) => void;

  // 行程 (Trip) 操作
  addTrip: (trip: Trip) => void;
  switchTrip: (id: string) => void;
  deleteTrip: (id: string) => void;

  // 行程細項 (Schedule) 操作
  addScheduleItem: (tripId: string, item: ScheduleItem) => void;
  updateScheduleItem: (tripId: string, itemId: string, newItem: ScheduleItem) => void;
  deleteScheduleItem: (tripId: string, itemId: string) => void;

  // 預訂 (Booking) 操作
  addBookingItem: (tripId: string, item: BookingItem) => void;
  updateBookingItem: (tripId: string, itemId: string, newItem: BookingItem) => void;
  deleteBookingItem: (tripId: string, itemId: string) => void;

  // 記帳 (Expense) 操作
  addExpenseItem: (tripId: string, item: ExpenseItem) => void;
  updateExpenseItem: (tripId: string, itemId: string, newItem: ExpenseItem) => void;
  deleteExpenseItem: (tripId: string, itemId: string) => void;

  // 美食日誌 (Journal) 操作
  addJournalItem: (tripId: string, item: JournalItem) => void;
  deleteJournalItem: (tripId: string, itemId: string) => void;

  // 購物清單 (Shopping) 操作
  addShoppingItem: (tripId: string, item: ShoppingItem) => void;
  toggleShoppingItem: (tripId: string, itemId: string) => void;
  deleteShoppingItem: (tripId: string, itemId: string) => void;

  // 旅遊資訊 (Info) 操作
  addInfoItem: (tripId: string, item: InfoItem) => void;
  deleteInfoItem: (tripId: string, itemId: string) => void;
}

// --- Store 實作 ---

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      currentTripId: null,
      activeTab: 'schedule',
      exchangeRate: 1,

      setTrips: (trips) => set({ trips }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),

      // --- 行程列表 CRUD ---
      addTrip: (trip) => {
        set((state) => ({
          trips: [trip, ...state.trips].slice(0, 3), // 最多保留 3 個
          currentTripId: trip.id
        }));
        syncToCloud(trip);
      },

      switchTrip: (id) => set({ currentTripId: id }),

      deleteTrip: (id) => set((state) => {
        const newTrips = state.trips.filter(t => t.id !== id);
        const nextId = state.currentTripId === id ? (newTrips[0]?.id || null) : state.currentTripId;
        return { trips: newTrips, currentTripId: nextId };
      }),

      // --- 行程細項 (Schedule) ---
      addScheduleItem: (tripId, item) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, items: [...(t.items || []), item] } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      updateScheduleItem: (tripId, itemId, newItem) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, items: (t.items || []).map(i => i.id === itemId ? newItem : i) } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteScheduleItem: (tripId, itemId) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, items: (t.items || []).filter(i => i.id !== itemId) } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },

      // --- 預訂資訊 (Booking) ---
      addBookingItem: (tripId, item) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: [...(t.bookings || []), item] } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      updateBookingItem: (tripId, itemId, newItem) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: (t.bookings || []).map(b => b.id === itemId ? newItem : b) } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteBookingItem: (tripId, itemId) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: (t.bookings || []).filter(i => i.id !== itemId) } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },

      // --- 記帳資料 (Expense) ---
      addExpenseItem: (tripId, item) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: [...(t.expenses || []), item] } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      updateExpenseItem: (tripId, itemId, newItem) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: (t.expenses || []).map(e => e.id === itemId ? newItem : e) } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteExpenseItem: (tripId, itemId) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: (t.expenses || []).filter(i => i.id !== itemId) } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },

      // --- 美食日誌 (Journal) ---
      addJournalItem: (tripId, item) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, journals: [item, ...(t.journals || [])] } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteJournalItem: (tripId, itemId) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, journals: (t.journals || []).filter(i => i.id !== itemId) } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },

      // --- 購物清單 (Shopping) ---
      addShoppingItem: (tripId, item) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, shoppingList: [...(t.shoppingList || []), item] } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      toggleShoppingItem: (tripId, itemId) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { 
            ...t, 
            shoppingList: (t.shoppingList || []).map(i => i.id === itemId ? { ...i, isBought: !i.isBought } : i) 
          } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteShoppingItem: (tripId, itemId) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, shoppingList: (t.shoppingList || []).filter(i => i.id !== itemId) } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },

      // --- 旅遊資訊 (Info) ---
      addInfoItem: (tripId, item) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, infoItems: [item, ...(t.infoItems || [])] } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
      deleteInfoItem: (tripId, itemId) => {
        set((state) => ({
          trips: state.trips.map(t => t.id === tripId ? { ...t, infoItems: (t.infoItems || []).filter(i => i.id !== itemId) } : t)
        }));
        const t = get().trips.find(t => t.id === tripId);
        if (t) syncToCloud(t);
      },
    }),
    {
      name: 'zakka-trip-storage', // 持久化名稱
    }
  )
);