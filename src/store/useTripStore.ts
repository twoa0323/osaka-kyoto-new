// filepath: src/store/useTripStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, ScheduleItem, BookingItem, ExpenseItem } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const deepSanitize = (obj: any): any => JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));

// ✅ 效能優化：加入防抖 (Debounce) 機制
let syncTimeout: any = null;
const syncToCloud = (trip: Trip) => {
  if (!trip?.id) return;
  
  // 如果 2 秒內有新的變更，就取消上一次的排程
  if (syncTimeout) clearTimeout(syncTimeout);
  
  // 重新設定 2 秒的倒數計時
  syncTimeout = setTimeout(async () => {
    try { 
      await setDoc(doc(db, "trips", trip.id), deepSanitize(trip)); 
      console.log("☁️ 行程已合併同步至雲端");
    } 
    catch (e) { console.error("Cloud Sync Fail:", e); }
  }, 2000); // 2000 毫秒 = 2 秒
};

interface TripState {
  trips: Trip[]; currentTripId: string | null; activeTab: string; exchangeRate: number;
  setTrips: (t: Trip[]) => void; setActiveTab: (t: string) => void; setExchangeRate: (r: number) => void;
  addTrip: (t: Trip) => void; switchTrip: (id: string) => void; deleteTrip: (id: string) => void;
  updateTripData: (tid: string, p: Partial<Trip>) => void;
  addScheduleItem: (tid: string, item: ScheduleItem) => void;
  updateScheduleItem: (tid: string, iid: string, ni: ScheduleItem) => void;
  deleteScheduleItem: (tid: string, iid: string) => void;
  reorderScheduleItems: (tid: string, ni: ScheduleItem[]) => void;
  addBookingItem: (tid: string, i: any) => void; updateBookingItem: (tid: string, iid: string, ni: any) => void; deleteBookingItem: (tid: string, iid: string) => void;
  addExpenseItem: (tid: string, i: any) => void; updateExpenseItem: (tid: string, iid: string, ni: any) => void; deleteExpenseItem: (tid: string, iid: string) => void;
  
  addJournalItem: (tid: string, i: any) => void; updateJournalItem: (tid: string, iid: string, ni: any) => void; deleteJournalItem: (tid: string, iid: string) => void;
  addShoppingItem: (tid: string, i: any) => void; updateShoppingItem: (tid: string, iid: string, ni: any) => void; toggleShoppingItem: (tid: string, iid: string) => void; deleteShoppingItem: (tid: string, iid: string) => void;
  addInfoItem: (tid: string, i: any) => void; updateInfoItem: (tid: string, iid: string, ni: any) => void; deleteInfoItem: (tid: string, iid: string) => void;
}

export const useTripStore = create<TripState>()(
  persist((set, get) => ({
    trips: [], currentTripId: null, activeTab: 'schedule', exchangeRate: 1,
    setTrips: (trips) => set({ trips }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setExchangeRate: (exchangeRate) => set({ exchangeRate }),
    addTrip: (trip) => { set(s => ({ trips: [trip, ...s.trips].slice(0, 3), currentTripId: trip.id })); syncToCloud(trip); },
    switchTrip: (id) => set({ currentTripId: id }),
    deleteTrip: async (id) => {
      set(s => {
        const nt = s.trips.filter(t => t.id !== id);
        return { trips: nt, currentTripId: s.currentTripId === id ? (nt[0]?.id || null) : s.currentTripId };
      });
      // 同步刪除 Firebase 上的資料
      try {
        await deleteDoc(doc(db, "trips", id));
      } catch (e) {
        console.error("Cloud Delete Fail:", e);
      }
    },
    updateTripData: (tid, payload) => {
      set(s => ({ trips: s.trips.map(t => t.id === tid ? { ...t, ...payload } : t) }));
      const updated = get().trips.find(t => t.id === tid);
      if (updated) syncToCloud(updated);
    },
    addScheduleItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { items: [...(t.items || []), i] }); },
    updateScheduleItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { items: t.items.map(x => x.id === iid ? ni : x) }); },
    deleteScheduleItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { items: t.items.filter(x => x.id !== iid) }); },
    reorderScheduleItems: (tid, ni) => get().updateTripData(tid, { items: ni }),
    
    addBookingItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { bookings: [...(t.bookings || []), i] }); },
    updateBookingItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { bookings: t.bookings.map(b => b.id === iid ? ni : b) }); },
    deleteBookingItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { bookings: t.bookings.filter(b => b.id !== iid) }); },
    
    addExpenseItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { expenses: [...(t.expenses || []), i] }); },
    updateExpenseItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { expenses: t.expenses.map(e => e.id === iid ? ni : e) }); },
    deleteExpenseItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { expenses: t.expenses.filter(e => e.id !== iid) }); },
    
    addJournalItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { journals: [i, ...(t.journals || [])] }); },
    updateJournalItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { journals: t.journals.map(j => j.id === iid ? ni : j) }); },
    deleteJournalItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { journals: t.journals.filter(j => j.id !== iid) }); },
    
    addShoppingItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { shoppingList: [...(t.shoppingList || []), i] }); },
    updateShoppingItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { shoppingList: t.shoppingList.map(s => s.id === iid ? ni : s) }); },
    toggleShoppingItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { shoppingList: t.shoppingList.map(x => x.id === iid ? {...x, isBought: !x.isBought} : x) }); },
    deleteShoppingItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { shoppingList: t.shoppingList.filter(x => x.id !== iid) }); },
    
    addInfoItem: (tid, i) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { infoItems: [i, ...(t.infoItems || [])] }); },
    updateInfoItem: (tid, iid, ni) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { infoItems: t.infoItems.map(i => i.id === iid ? ni : i) }); },
    deleteInfoItem: (tid, iid) => { const t = get().trips.find(x => x.id === tid); if(t) get().updateTripData(tid, { infoItems: t.infoItems.filter(x => x.id !== iid) }); },
  }), { name: 'zakka-trip-storage' })
);














