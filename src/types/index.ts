export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP' | 'CNY' | 'HKD' | 'SGD' | 'VND';

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location: string;
  category: 'sightseeing' | 'food' | 'transport' | 'hotel';
  note?: string;
  imageUrl?: string;
  weather?: 'sunny' | 'cloudy' | 'rainy';
  geo?: { lat: number; lng: number };
}

export interface Trip {
  id: string;
  destination: string; 
  startDate: string;
  endDate: string;
  baseCurrency: CurrencyCode;
  members: string[];
  pin: string;
  
  // [關鍵修正] 必須加入 items，並設為可選 (Optional)
  items?: ScheduleItem[]; 
}