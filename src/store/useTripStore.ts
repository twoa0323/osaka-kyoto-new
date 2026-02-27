// filepath: src/store/useTripStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem, JournalItem, ShoppingItem, InfoItem, PackingItem } from '../types';
import { idbStorage } from '../utils/idbStorage';
import { db, auth } from '../services/firebase'; // 👈 引入 auth 來抓取設備指紋
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// Prompt 1: 高效能遞迴版 removeUndefined，取代 JSON.parse/stringify 的深拷貝
// 避免序列化整個物件造成主執行緒阻塞，只做單次遞迴遍歷
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      // undefined → null (Firebase 不接受 undefined)
      cleaned[key] = val === undefined ? null : removeUndefined(val);
    }
    return cleaned;
  }
  return obj;
}
// 向後相容別名
const deepSanitize = removeUndefined;

// 加入 Debounce (防抖) 寫入，避免頻繁觸發 Firebase 浪費效能
const syncTimeouts = new Map<string, any>();

// 雲端同步函式 - 元資料 (Metadata) 同步
const syncMetadataToCloud = (trip: Trip) => {
  if (!trip?.id) return;
  const { items, bookings, expenses, journals, shoppingList, infoItems, packingList, ...metadata } = trip;

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

const tripUpdateTimeouts = new Map<string, any>();

// 雲端同步函式 - Trip 更新時間 Debounce (避免寫入風暴)
const updateTripTimestamp = (tripId: string, currentUser: string, updatedAt: number) => {
  if (tripUpdateTimeouts.has(tripId)) clearTimeout(tripUpdateTimeouts.get(tripId));
  const timeout = setTimeout(async () => {
    try {
      await updateDoc(doc(db, "trips", tripId), { updatedAt, lastUpdatedBy: currentUser });
      tripUpdateTimeouts.delete(tripId);
    } catch (e) {
      console.error("Trip Timestamp Update Error:", e);
    }
  }, 1000);
  tripUpdateTimeouts.set(tripId, timeout);
};

// 雲端同步函式 - 子項目同步 (Granular Sync)
const syncItemToCloud = async (tripId: string, collectionName: string, item: any) => {
  if (!tripId || !item?.id) return;
  const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Guest";
  const updatedAt = Date.now();

  const itemWithMeta = { ...item, updatedAt, lastUpdatedBy: currentUser };

  try {
    await setDoc(doc(db, "trips", tripId, collectionName, item.id), deepSanitize(itemWithMeta));
    // Update the trip's metadata to reflect the last update time (Debounced)
    updateTripTimestamp(tripId, currentUser, updatedAt);
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
  isAiModalOpen: boolean;
  aiContext: string;
  toast: { message: string, type: 'success' | 'error' | 'info', action?: { label: string, onClick: () => void } } | null;
  lastDeletedItem: { type: 'schedule' | 'shopping' | 'booking' | 'expense' | 'journal' | 'info' | 'packing', tripId: string, item: any } | null;

  // 全域狀態設定
  setTrips: (trips: Trip[]) => void;
  setActiveTab: (tab: string) => void;
  setExchangeRate: (rate: number) => void;
  setAiModalOpen: (open: boolean) => void;
  openAiAssistant: (context?: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info', action?: { label: string, onClick: () => void }) => void;
  undoDelete: () => void;

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
  updateJournalItem: (tid: string, iid: string, ni: JournalItem) => void;
  deleteJournalItem: (tid: string, iid: string) => void;

  // 5. 購物清單 (Shopping)
  addShoppingItem: (tid: string, item: ShoppingItem) => void;
  updateShoppingItem: (tid: string, iid: string, ni: Partial<ShoppingItem>) => void;
  toggleShoppingItem: (tid: string, iid: string) => void;
  deleteShoppingItem: (tid: string, iid: string) => void;

  // 6. 旅遊資訊 (Info)
  addInfoItem: (tid: string, item: InfoItem) => void;
  updateInfoItem: (tid: string, iid: string, ni: Partial<InfoItem>) => void;
  deleteInfoItem: (tid: string, iid: string) => void;

  // 7. 行李清單 (Packing)
  addPackingItem: (tid: string, item: PackingItem) => void;
  updatePackingItem: (tid: string, iid: string, ni: Partial<PackingItem>) => void;
  togglePackingItem: (tid: string, iid: string) => void;
  deletePackingItem: (tid: string, iid: string) => void;
  clearPackingList: (tid: string) => void;

  uiSettings: {
    showSplash: boolean;    // 潑墨特效開關
    enableHaptics: boolean; // 觸覺回饋開關
    showBudgetAlert: boolean; // 預算警報開關
    enableSplatter: boolean; // 全域噴漆特效
    enableMotionDepth: boolean; // 陀螺儀動態層次
    enableWeatherFX: boolean; // 氣候情境雨滴
    enableTaxTracker: boolean; // 退稅蓄力槽顯示
    enableAiStreaming: boolean; // AI 串流模式
    enable3DMap: boolean; // 3D 地圖模式
    enableGlassmorphism: boolean; // 玻璃擬態 2.0
  };
  setUISettings: (settings: Partial<TripState['uiSettings']>) => void;
  isSyncing: boolean;
  setIsSyncing: (s: boolean) => void;
  /** 每次 AI 呼叫後呼叫，若降級為 Flash 則顯示 Toast 提示 */
  checkAiFallback: (data: any) => void;
  /** AI 模型 Metadata 狀態，同步自 X-AI-Model-Used 標頭 */
  aiMetadata: { lastModelUsed: string | null };
  setAiMetadata: (modelUsed: string) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      currentTripId: null,
      activeTab: 'schedule',
      exchangeRate: 1,
      isAiModalOpen: false,
      aiContext: 'schedule',
      toast: null,
      lastDeletedItem: null,
      isSyncing: false,
      uiSettings: {
        showSplash: true,
        enableHaptics: true,
        showBudgetAlert: true,
        enableSplatter: true,
        enableMotionDepth: true,
        enableWeatherFX: true,
        enableTaxTracker: true,
        enableAiStreaming: true,
        enable3DMap: true,
        enableGlassmorphism: true,
      },
      setUISettings: (newSettings) => set((s) => ({
        uiSettings: { ...s.uiSettings, ...newSettings }
      })),
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      // 智慧模型路由器：偵測 AI 降級並提示使用者
      checkAiFallback: (data) => {
        if (data?.ai_tier === 'standard') {
          get().showToast('⚡️ Standard Mode (Flash)', 'info');
        }
      },
      aiMetadata: { lastModelUsed: null },
      setAiMetadata: (modelUsed) => {
        set({ aiMetadata: { lastModelUsed: modelUsed } });
        if (modelUsed === 'flash-fallback') {
          get().showToast('系統繁忙，已切換至標準閃電模式 ⚡️', 'info');
        }
      },

      setTrips: (trips) => set({ trips }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
      setAiModalOpen: (open) => set({ isAiModalOpen: open }),
      openAiAssistant: (context) => set({ isAiModalOpen: true, aiContext: context || get().activeTab }),
      showToast: (message, type = 'info', action) => {
        set({ toast: { message, type, action } });
        setTimeout(() => {
          if (get().toast?.message === message) {
            set({ toast: null });
          }
        }, action ? 5000 : 3000);
      },

      undoDelete: () => {
        const last = get().lastDeletedItem;
        if (!last) return;

        const { type, tripId, item } = last;
        if (type === 'schedule') get().addScheduleItem(tripId, item);
        else if (type === 'shopping') get().addShoppingItem(tripId, item);
        else if (type === 'booking') get().addBookingItem(tripId, item);
        else if (type === 'expense') get().addExpenseItem(tripId, item);
        else if (type === 'journal') get().addJournalItem(tripId, item);
        else if (type === 'info') get().addInfoItem(tripId, item);
        else if (type === 'packing') get().addPackingItem(tripId, item);

        set({ lastDeletedItem: null, toast: null });
        get().showToast("已復原項目 ✨", "success");
      },

      addTrip: (trip) => {
        const uid = auth.currentUser?.uid || 'unknown';
        const newTrip = {
          ...trip,
          creatorId: uid,
          memberIds: [uid] // 👈 初始化成員清單，供 Security Rules 驗證
        };
        set(s => ({
          trips: [newTrip, ...s.trips],
          currentTripId: newTrip.id
        }));
        // 初次建立仍需建立主文件
        const { items, bookings, expenses, journals, shoppingList, infoItems, packingList, ...meta } = newTrip;
        setDoc(doc(db, "trips", newTrip.id), deepSanitize(meta));
        // 子項目則個別建立 (如果有初始資料)
        items?.forEach(i => syncItemToCloud(newTrip.id, "items", i));
        bookings?.forEach(b => syncItemToCloud(newTrip.id, "bookings", b));
        expenses?.forEach(e => syncItemToCloud(newTrip.id, "expenses", e));
        journals?.forEach(j => syncItemToCloud(newTrip.id, "journals", j));
        shoppingList?.forEach(s => syncItemToCloud(newTrip.id, "shopping", s));
        infoItems?.forEach(i => syncItemToCloud(newTrip.id, "info", i));
        packingList?.forEach(p => syncItemToCloud(newTrip.id, "packing", p));
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
          const subCollections = ["items", "bookings", "expenses", "journals", "shopping", "info", "packing"];
          for (const sub of subCollections) {
            const listKey = sub === "shopping" ? "shoppingList" : sub === "info" ? "infoItems" : sub === "packing" ? "packingList" : sub;
            const items = (tripToDelete as any)?.[listKey] || [];
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
        if (!tid || !payload) return;
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, ...payload } : t)
        }));
        const updated = get().trips.find(t => t.id === tid);
        if (updated) syncMetadataToCloud(updated);
      },

      // --- 1. Schedule ---
      addScheduleItem: (tid, i) => {
        if (!tid || !i) return;
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, items: [...(t.items || []), i] } : t)
        }));
        syncItemToCloud(tid, "items", i);
      },
      updateScheduleItem: (tid, iid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, items: (t.items || []).map(x => x.id === iid ? ni : x) } : t)
        }));
        syncItemToCloud(tid, "items", ni);
      },
      deleteScheduleItem: (tid, iid) => {
        const item = (get().trips.find(t => t.id === tid)?.items || []).find(it => it.id === iid);
        if (item) set({ lastDeletedItem: { type: 'schedule', tripId: tid, item } });

        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, items: (t.items || []).filter(x => x.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "items", iid);

        get().showToast("已刪除行程項目", "info", { label: "復原", onClick: () => get().undoDelete() });
      },
      reorderScheduleItems: (tid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, items: ni } : t)
        }));
        // Fix 9: 僅更新排序 ID 陣列到 metadata，避免 N 次 setDoc
        // 每次 reorder 只需 1 次 updateDoc，而非每個 item 一次
        const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Guest";
        const itemOrder = ni.map(item => item.id);
        updateTripTimestamp(tid, currentUser, Date.now());
        import('firebase/firestore').then(({ updateDoc, doc }) => {
          import('../services/firebase').then(({ db }) => {
            updateDoc(doc(db, "trips", tid), { itemOrder, lastUpdatedBy: currentUser, updatedAt: Date.now() });
          });
        });
      },

      // --- 2. Booking ---
      addBookingItem: (tid, i) => {
        if (!tid || !i) return;
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, bookings: [...(t.bookings || []), i] } : t)
        }));
        syncItemToCloud(tid, "bookings", i);
      },
      updateBookingItem: (tid, iid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, bookings: (t.bookings || []).map(b => b.id === iid ? ni : b) } : t)
        }));
        syncItemToCloud(tid, "bookings", ni);
      },
      deleteBookingItem: (tid, iid) => {
        const item = (get().trips.find(t => t.id === tid)?.bookings || []).find(it => it.id === iid);
        if (item) set({ lastDeletedItem: { type: 'booking', tripId: tid, item } });

        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, bookings: (t.bookings || []).filter(b => b.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "bookings", iid);
        get().showToast("已刪除預訂項目", "info", { label: "復原", onClick: () => get().undoDelete() });
      },

      // --- 3. Expense ---
      addExpenseItem: (tid, i) => {
        if (!tid || !i) return;
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, expenses: [...(t.expenses || []), i] } : t)
        }));
        syncItemToCloud(tid, "expenses", i);
      },
      updateExpenseItem: (tid, iid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, expenses: (t.expenses || []).map(e => e.id === iid ? ni : e) } : t)
        }));
        syncItemToCloud(tid, "expenses", ni);
      },
      deleteExpenseItem: (tid, iid) => {
        const item = (get().trips.find(t => t.id === tid)?.expenses || []).find(it => it.id === iid);
        if (item) set({ lastDeletedItem: { type: 'expense', tripId: tid, item } });

        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, expenses: (t.expenses || []).filter(e => e.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "expenses", iid);
        get().showToast("已刪除支出項目", "info", { label: "復原", onClick: () => get().undoDelete() });
      },

      // --- 4. Journal ---
      addJournalItem: (tid, i) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, journals: [i, ...(t.journals || [])] } : t)
        }));
        syncItemToCloud(tid, "journals", i);
      },
      updateJournalItem: (tid, iid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, journals: (t.journals || []).map(j => j.id === iid ? ni : j) } : t)
        }));
        syncItemToCloud(tid, "journals", ni);
      },
      deleteJournalItem: (tid, iid) => {
        const item = (get().trips.find(t => t.id === tid)?.journals || []).find(it => it.id === iid);
        if (item) set({ lastDeletedItem: { type: 'journal', tripId: tid, item } });

        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, journals: t.journals.filter(j => j.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "journals", iid);
        get().showToast("已刪除日誌項目", "info", { label: "復原", onClick: () => get().undoDelete() });
      },

      // --- 5. Shopping ---
      addShoppingItem: (tid, i) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, shoppingList: [...(t.shoppingList || []), i] } : t)
        }));
        syncItemToCloud(tid, "shopping", i);
      },
      updateShoppingItem: (tid, iid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? {
            ...t,
            shoppingList: (t.shoppingList || []).map(x => x.id === iid ? { ...x, ...ni, updatedAt: Date.now() } : x)
          } : t)
        }));
        const updatedTrip = get().trips.find(x => x.id === tid);
        const item = updatedTrip?.shoppingList.find(x => x.id === iid);
        if (item) syncItemToCloud(tid, "shopping", item);
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
        const item = (get().trips.find(t => t.id === tid)?.shoppingList || []).find(it => it.id === iid);
        if (item) set({ lastDeletedItem: { type: 'shopping', tripId: tid, item } });

        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, shoppingList: (t.shoppingList || []).filter(x => x.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "shopping", iid);

        get().showToast("已刪除購物項目", "info", { label: "復原", onClick: () => get().undoDelete() });
      },

      // --- 6. Info ---
      addInfoItem: (tid, i) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, infoItems: [i, ...(t.infoItems || [])] } : t)
        }));
        syncItemToCloud(tid, "info", i);
      },
      updateInfoItem: (tid, iid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? {
            ...t,
            infoItems: (t.infoItems || []).map(x => x.id === iid ? { ...x, ...ni } : x)
          } : t)
        }));
        const updatedTrip = get().trips.find(x => x.id === tid);
        const item = updatedTrip?.infoItems?.find(x => x.id === iid);
        if (item) syncItemToCloud(tid, "info", item);
      },
      deleteInfoItem: (tid, iid) => {
        const item = (get().trips.find(t => t.id === tid)?.infoItems || []).find(it => it.id === iid);
        if (item) set({ lastDeletedItem: { type: 'info', tripId: tid, item } });

        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, infoItems: (t.infoItems || []).filter(x => x.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "info", iid);
        get().showToast("已刪除資訊項目", "info", { label: "復原", onClick: () => get().undoDelete() });
      },

      // --- 7. Packing ---
      addPackingItem: (tid, i) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, packingList: [...(t.packingList || []), i] } : t)
        }));
        syncItemToCloud(tid, "packing", i);
      },
      updatePackingItem: (tid, iid, ni) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? {
            ...t,
            packingList: (t.packingList || []).map(x => x.id === iid ? { ...x, ...ni, updatedAt: Date.now() } : x)
          } : t)
        }));
        const ut = get().trips.find(x => x.id === tid);
        const item = ut?.packingList.find(x => x.id === iid);
        if (item) syncItemToCloud(tid, "packing", item);
      },
      togglePackingItem: (tid, iid) => {
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? {
            ...t,
            packingList: (t.packingList || []).map(x => x.id === iid ? { ...x, isPacked: !x.isPacked, updatedAt: Date.now() } : x)
          } : t)
        }));
        const ut = get().trips.find(x => x.id === tid);
        const item = ut?.packingList.find(x => x.id === iid);
        if (item) syncItemToCloud(tid, "packing", item);
      },
      deletePackingItem: (tid, iid) => {
        const item = (get().trips.find(t => t.id === tid)?.packingList || []).find(it => it.id === iid);
        if (item) set({ lastDeletedItem: { type: 'packing', tripId: tid, item } });

        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, packingList: (t.packingList || []).filter(x => x.id !== iid) } : t)
        }));
        deleteItemFromCloud(tid, "packing", iid);
        get().showToast("已刪除行李項目", "info", { label: "復原", onClick: () => get().undoDelete() });
      },
      clearPackingList: (tid) => {
        const trip = get().trips.find(t => t.id === tid);
        const ids = (trip?.packingList || []).map(p => p.id);
        set(s => ({
          trips: s.trips.map(t => t.id === tid ? { ...t, packingList: [] } : t)
        }));
        ids.forEach(id => deleteItemFromCloud(tid, "packing", id));
      },
    }),
    {
      name: 'trip-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([key]) => !['toast', 'lastDeletedItem', 'isAiModalOpen', 'aiContext', 'isSyncing'].includes(key) && !key.toLowerCase().includes('loading'))
      ) as any
    }
  )
);












