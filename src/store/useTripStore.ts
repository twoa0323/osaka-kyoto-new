import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, Member } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

// 確保不含 undefined 導致寫入失敗
const sanitize = (data: any) => JSON.parse(JSON.stringify(data, (k, v) => v === undefined ? null : v));

const syncToCloud = async (trip: Trip) => {
  try {
    await setDoc(doc(db, "trips", trip.id), sanitize(trip));
  } catch (e) {
    console.error("Cloud Sync Fail:", e);
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
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [], currentTripId: null, activeTab: 'schedule', exchangeRate: 1,
      setTrips: (trips) => set({ trips }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
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
    }),
    { name: 'zakka-trip-storage' }
  )
);

