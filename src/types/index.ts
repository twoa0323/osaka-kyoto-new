export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP' | 'CNY' | 'HKD' | 'SGD' | 'VND';

export interface ScheduleItem {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  category: 'sightseeing' | 'food' | 'transport' | 'hotel';
  note?: string;
}

// 新增預訂相關型別
export interface BookingItem {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'voucher';
  title: string;
  confirmationNo?: string;
  date: string; // 開始日
  endDate?: string; // 結束日
  location?: string;
  price?: number;
  note?: string;
  // 針對機票
  flightNo?: string;
  depIata?: string;
  arrIata?: string;
  depTime?: string;
  arrTime?: string;
}

export interface Trip {
  id: string;
  dest: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseCurrency: CurrencyCode;
  members: string[];
  pin: string;
  items: ScheduleItem[];
  bookings: BookingItem[]; // 新增此欄位
}