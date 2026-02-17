import { create } from 'zustand';
import { Trip, CurrencyCode } from '../types';

interface TripState {
  currentTrip: Trip | null;
  exchangeRate: number;
  activeTab: string;
  setTrip: (trip: Trip) => void;
  setExchangeRate: (rate: number) => void;
  setActiveTab: (tab: string) => void;
}

export const useTripStore = create<TripState>((set) => ({
  currentTrip: null,
  exchangeRate: 1,
  activeTab: 'schedule',
  setTrip: (trip) => set({ currentTrip: trip }),
  setExchangeRate: (rate) => set({ exchangeRate: rate }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));