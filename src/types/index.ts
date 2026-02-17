export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB';

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseCurrency: CurrencyCode;
  members: string[]; // 匿名 User ID
  pin: string;       // 預設 "007"
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location: string;
  category: 'sightseeing' | 'food' | 'transport' | 'hotel';
  note?: string;
  imageUrl?: string;
  geo?: { lat: number; lng: number };
}

export interface ExpenseItem {
  id: string;
  date: string;
  amount: number;
  currency: CurrencyCode;
  category: string;
  payerId: string;
  splitWith: string[]; // 哪些成員分攤
}