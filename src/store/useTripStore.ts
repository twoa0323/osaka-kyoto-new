// filepath: src/store/useTripStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem, ShoppingItem, InfoItem } from '../types';
import { db, auth } from '../services/firebase'; // 👈 引入 auth 來抓取設備指紋
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

// 深度淨化：移除所有 undefined，防止 Firebase 寫入失敗導致資料消失
const deepSanitize = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
};

// 加入 Debounce (防抖) 寫入，避免頻繁觸發 Firebase 浪費效能
const syncTimeouts = new Map<string, any>();

// 雲端同步函式
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
  
  // 全域狀態設定
  setTrips: (trips: Trip[]) => void;
  setActiveTab: (tab: string) => void;
  setExchangeRate: (rate: number) => void;

  // 行程 (Trip) 操作
  addTrip: (trip: Trip) => void;
  addTripLocal: (trip: Trip) => void;       // 👈 加入他人行程 (僅存本機，開始監聽)
  switchTrip: (id: string) => void;
  deleteTrip: (id: string) => void;         // 👈 建立者：永久刪除雲端
  removeTripLocal: (id: string) => void;    // 👈 參與者：僅退出本機
  updateTripData: (tripId: string, payload: Partial<Trip>) => void;
  
  // 1. 行程 (Schedule)
  addScheduleItem: (tid: string, item: ScheduleItem) => void;
  updateScheduleItem: (tid: string, iid: string, ni: ScheduleItem) => void;
  deleteScheduleItem: (tid: string, iid: string) => void;
  reorderScheduleItems: (tid: string, ni: ScheduleItem[]) => void;

  // 2. 預訂 (Booking)
  addBookingItem: (tid: string, item: BookingItem) => void;
  updateBookingItem: (tid: string, iid: string, ni: BookingItem) => void;
  deleteBookingItem: (tid: string, iid: string) => void;

  // 3. 記帳 (Expense)
  addExpenseItem: (tid: string, item: ExpenseItem) => void;
  updateExpenseItem: (tid: string, iid: string, ni: ExpenseItem) => void;
  deleteExpenseItem: (tid: string, iid: string) => void;

  // 4. 美食日誌 (Journal)
  addJournalItem: (tid: string, item: JournalItem) => void;
  deleteJournalItem: (tid: string, iid: string) => void;

  // 5. 購物清單 (Shopping)
  addShoppingItem: (tid: string, item: ShoppingItem) => void;
  toggleShoppingItem: (tid: string, iid: string) => void;
  deleteShoppingItem: (tid: string, iid: string) => void;

  // 6. 旅遊資訊 (Info)
  addInfoItem: (tid: string, item: InfoItem) => void;
  deleteInfoItem: (tid: string, iid: string) => void;
}

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
      
      // 📍 建立行程：自動綁定當前設備的 UID 為 creatorId
      addTrip: (trip) => { 
        const newTrip = { ...trip, creatorId: auth.currentUser?.uid || 'unknown' };
        set(s => ({ 
          trips: [newTrip, ...s.trips], 
          currentTripId: newTrip.id 
        })); 
        syncToCloud(newTrip); 
      },

      // 📍 加入行程：存入本機即可，無需上傳，Zustand Persist 會記住它
      addTripLocal: (trip) => {
        set(s => ({ 
          trips: [trip, ...s.trips], 
          currentTripId: trip.id 
        }));
      },
      
      switchTrip: (id) => set({ currentTripId: id }),
      
      // 📍 永久刪除 (僅建立者可呼叫)
      deleteTrip: async (id) => {
        set(s => {
          const nt = s.trips.filter(t => t.id !== id);
          return { 
            trips: nt, 
            currentTripId: s.currentTripId === id ? (nt[0]?.id || null) : s.currentTripId 
          };
        });
        try { 
          await deleteDoc(doc(db, "trips", id)); 
        } catch (e) { 
          console.error(e); 
        }
      },

      // 📍 僅退出 (移除本機紀錄)
      removeTripLocal: (id) => {
        set(s => {
          const nt = s.trips.filter(t => t.id !== id);
          return { 
            trips: nt, 
            currentTripId: s.currentTripId === id ? (nt[0]?.id || null) : s.currentTripId 
          };
        });
      },
      
      // 通用更新 (例如更新預算、成員)
      updateTripData: (tid, payload) => {
        set(s => ({ 
          trips: s.trips.map(t => t.id === tid ? { ...t, ...payload } : t) 
        }));
        const updated = get().trips.find(t => t.id === tid);
        if (updated) syncToCloud(updated);
      },

      // --- 1. Schedule ---
      addScheduleItem: (tid, i) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { items: [...(t.items || []), i] }); 
      },
      updateScheduleItem: (tid, iid, ni) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { items: t.items.map(x => x.id === iid ? ni : x) }); 
      },
      deleteScheduleItem: (tid, iid) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { items: t.items.filter(x => x.id !== iid) }); 
      },
      reorderScheduleItems: (tid, ni) => {
        get().updateTripData(tid, { items: ni });
      },

      // --- 2. Booking ---
      addBookingItem: (tid, i) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { bookings: [...(t.bookings || []), i] }); 
      },
      updateBookingItem: (tid, iid, ni) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { bookings: t.bookings.map(b => b.id === iid ? ni : b) }); 
      },
      deleteBookingItem: (tid, iid) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { bookings: t.bookings.filter(b => b.id !== iid) }); 
      },

      // --- 3. Expense ---
      addExpenseItem: (tid, i) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { expenses: [...(t.expenses || []), i] }); 
      },
      updateExpenseItem: (tid, iid, ni) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { expenses: t.expenses.map(e => e.id === iid ? ni : e) }); 
      },
      deleteExpenseItem: (tid, iid) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { expenses: t.expenses.filter(e => e.id !== iid) }); 
      },

      // --- 4. Journal ---
      addJournalItem: (tid, i) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { journals: [i, ...(t.journals || [])] }); 
      },
      deleteJournalItem: (tid, iid) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { journals: t.journals.filter(j => j.id !== iid) }); 
      },

      // --- 5. Shopping ---
      addShoppingItem: (tid, i) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { shoppingList: [...(t.shoppingList || []), i] }); 
      },
      toggleShoppingItem: (tid, iid) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { shoppingList: t.shoppingList.map(x => x.id === iid ? {...x, isBought: !x.isBought} : x) }); 
      },
      deleteShoppingItem: (tid, iid) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { shoppingList: t.shoppingList.filter(x => x.id !== iid) }); 
      },

      // --- 6. Info ---
      addInfoItem: (tid, i) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { infoItems: [i, ...(t.infoItems || [])] }); 
      },
      deleteInfoItem: (tid, iid) => { 
        const t = get().trips.find(x => x.id === tid); 
        if(t) get().updateTripData(tid, { infoItems: t.infoItems.filter(x => x.id !== iid) }); 
      },
    }),
    { name: 'zakka-trip-storage' }
  )
);
















