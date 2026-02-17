export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP';

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location: string;
  category: 'sightseeing' | 'food' | 'transport' | 'hotel';
  note?: string;
  imageUrl?: string;
  weather?: 'sunny' | 'cloudy' | 'rainy';
  geo?: { lat: number; lng: number }; // 建議補上，你的 ScheduleItem 有用到經緯度
}

export interface Trip {
  id: string;
  destination: string;       // 建議統一用 destination (需配合 Onboarding 修改)
  // dest: string;           // 建議移除 dest，避免混淆
  startDate: string;
  endDate: string;
  baseCurrency: CurrencyCode;
  members: string[];
  pin: string;
  
  // 🔥 [關鍵修正] 必須加入 items，並設為可選 (Optional)
  items?: ScheduleItem[]; 
}