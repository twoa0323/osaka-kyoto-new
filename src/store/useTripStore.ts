// filepath: src/store/useTripStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem, ShoppingItem, InfoItem } from '../types';
import { db, auth } from '../services/firebase'; // 👈 引入 auth 來抓取設備指紋
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// 深度淨化：移除所有 undefined，防止 Firebase 寫入失敗導致資料消失
const deepSanitize = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
};

// 加入 Debounce (防抖) 寫入，避免頻繁觸發 Firebase 浪費效能
const syncTimeouts = new Map<string, any>();

// 雲端同步函式 - 元資料 (Metadata) 同步
const syncMetadataToCloud = (trip: Trip) => {
  if (!trip?.id) return;
  const { items, bookings, expenses, journals, shoppingList, infoItems, ...metadata } = trip;

  const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Guest";
  const updatedAt = Date.now();

  if (syncTimeouts.has(trip.id + "_meta")) {
    clearTimeout(syncTimeouts.get(trip.id + "_meta"));
  }

  const timeout = setTimeout(async () => {
    try {
      await updateDoc(doc(db, "trips", trip.id), deepSanitize({
        ...metadata,
        updatedAt,
        lastUpdatedBy: currentUser
      }));
      syncTimeouts.delete(trip.id + "_meta");
    } catch (e) {
      console.error("Firebase Meta Sync Error:", e);
    }
  }, 500);

  syncTimeouts.set(trip.id + "_meta", timeout);
};

// 雲端同步函式 - 子項目同步 (Granular Sync)
const syncItemToCloud = async (tripId: string, collectionName: string, item: any) => {
  if (!tripId || !item?.id) return;
  const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Guest";
  const updatedAt = Date.now();

  const itemWithMeta = { ...item, updatedAt, lastUpdatedBy: currentUser };

  try {
    await setDoc(doc(db, "trips", tripId, collectionName, item.id), deepSanitize(itemWithMeta));
    // Also update the trip's metadata to reflect the last update time
    const tripRef = doc(db, "trips", tripId);
    await updateDoc(tripRef, {
      updatedAt: updatedAt,
      lastUpdatedBy: currentUser
    });
  } catch (e) {
    console.error(`Firebase ${collectionName} Sync Error:`, e);
  }
};

// 雲端同步函式 - 子項目刪除
const deleteItemFromCloud = async (tripId: string, collectionName: string, itemId: string) => {
  if (!tripId || !itemId) return;
  try {
    await deleteDoc(doc(db, "trips", tripId, collectionName, itemId));
  } catch (e) {
    console.error(`Firebase ${collectionName} Delete Error:`, e);
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

  uiSettings: {
    showSplash: boolean;    // 潑墨特效開關
    enableHaptics: boolean; // 觸覺回饋開關
    showBudgetAlert: boolean; // 預算警報開關
  };
  setUISettings: (settings: Partial<TripState['uiSettings']>) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      currentTripId: null,
      activeTab: 'schedule',
      exchangeRate: 1,

      uiSettings: {
        showSplash: true,
        enableHaptics: true,
        showBudgetAlert: true,
      },
      setUISettings: (newSettings) => set((s) => ({
        uiSettings: { ...s.uiSettings, ...newSettings }
      })),

      setTrips: (trips) => set({ trips }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),

      addTrip: (trip) => {
        const newTrip = { ...trip, creatorId: auth.currentUser?.uid || 'unknown' };
        set(s => ({
          trips: [newTrip, ...s.trips],
          currentTripId: newTrip.id
        }));
        // 初次建立仍需建立主文件
        const { items, bookings, expenses, journals, shoppingList, infoItems, ...meta } = newTrip;
        setDoc(doc(db, "trips", newTrip.id), deepSanitize(meta));
        // 子項目則個別建立 (如果有初始資料)
        items?.forEach(i => syncItemToCloud(newTrip.id, "items", i));
        bookings?.forEach(b => syncItemToCloud(newTrip.id, "bookings", b));
        expenses?.forEach(e => syncItemToCloud(newTrip.id, "expenses", e));
        journals?.forEach(j => syncItemToCloud(newTrip.id, "journals", j));
        shoppingList?.forEach(s => syncItemToCloud(newTrip.id, "shopping", s));
        infoItems?.forEach(i => syncItemToCloud(newTrip.id, "info", i));
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
        const tripToDelete = get().trips.find(t => t.id === id);
        set(s => {
          const nt = s.trips.filter(t => t.id !== id);
          return {
            trips: nt,
            currentTripId: s.currentTripId === id ? (nt[0]?.id || null) : s.currentTripId
          };
        });
        try {
          // 刪除子集合項目 (客端需個別刪除)
          const subCollections = ["items", "bookings", "expenses", "journals", "shopping", "info"];
          for (const sub of subCollections) {
            const items = (tripToDelete as any)?.[sub === "shopping" ? "shoppingList" : sub === "info" ? "infoItems" : sub] || [];
            for (const item of items) {
              await deleteDoc(doc(db, "trips", id, sub, item.id));
            }
          }
          // 最後刪除主文件
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

      updateTripData: (tid, payload) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, ...payload } : t)
        }));
        const updated = get().trips.find(t => t.id === tid);
        if (updated) syncMetadataToCloud(updated);
      },

      // --- 1. Schedule ---
      addScheduleItem: (tid, i) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, items: [...(t.items || []), i] } : t)
        }));
        syncItemToCloud(tid, "items", i);
      },
      updateScheduleItem: (tid, iid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, items: t.items.map(x => x.id === iid ? ni : x) } : t)
        }));
        syncItemToCloud(tid, "items", ni);
      },
      deleteScheduleItem: (tid, iid) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, items: t.items.filter(x => x.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "items", iid);
      },
      reorderScheduleItems: (tid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, items: ni } : t)
        }));
        // Reorder 較特殊，目前仍採全物件覆蓋或需批次更新，此處先單個處理或由 Metadata 紀錄順序
        // 為簡化，Reorder 時同步所有項目的順序 ID (假設 ScheduleItem 有 order)
        ni.forEach(item => syncItemToCloud(tid, "items", item));
      },

      // --- 2. Booking ---
      addBookingItem: (tid, i) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, bookings: [...(t.bookings || []), i] } : t)
        }));
        syncItemToCloud(tid, "bookings", i);
      },
      updateBookingItem: (tid, iid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, bookings: t.bookings.map(b => b.id === iid ? ni : b) } : t)
        }));
        syncItemToCloud(tid, "bookings", ni);
      },
      deleteBookingItem: (tid, iid) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, bookings: t.bookings.filter(b => b.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "bookings", iid);
      },

      // --- 3. Expense ---
      addExpenseItem: (tid, i) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, expenses: [...(t.expenses || []), i] } : t)
        }));
        syncItemToCloud(tid, "expenses", i);
      },
      updateExpenseItem: (tid, iid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, expenses: t.expenses.map(e => e.id === iid ? ni : e) } : t)
        }));
        syncItemToCloud(tid, "expenses", ni);
      },
      deleteExpenseItem: (tid, iid) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, expenses: t.expenses.filter(e => e.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "expenses", iid);
      },

      // --- 4. Journal ---
      addJournalItem: (tid, i) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, journals: [i, ...(t.journals || [])] } : t)
        }));
        syncItemToCloud(tid, "journals", i);
      },
      deleteJournalItem: (tid, iid) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, journals: t.journals.filter(j => j.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "journals", iid);
      },

      // --- 5. Shopping ---
      addShoppingItem: (tid, i) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, shoppingList: [...(t.shoppingList || []), i] } : t)
        }));
        syncItemToCloud(tid, "shopping", i);
      },
      toggleShoppingItem: (tid, iid) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? {
            ...t,
            shoppingList: t.shoppingList.map(x => x.id === iid ? { ...x, isBought: !x.isBought } : x)
          } : t)
        }));
        const updatedTrip = get().trips.find(x => x.id === tid);
        const item = updatedTrip?.shoppingList.find(x => x.id === iid);
        if (item) syncItemToCloud(tid, "shopping", item);
      },
      deleteShoppingItem: (tid, iid) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, shoppingList: t.shoppingList.filter(x => x.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "shopping", iid);
      },

      // --- 6. Info ---
      addInfoItem: (tid, i) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, infoItems: [i, ...(t.infoItems || [])] } : t)
        }));
        syncItemToCloud(tid, "info", i);
      },
      deleteInfoItem: (tid, iid) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, infoItems: t.infoItems.filter(x => x.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "info", iid);
      },
    }),
    { name: 'zakka-trip-storage' }
  )
);
















