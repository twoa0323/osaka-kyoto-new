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

export interface BookingItem {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'voucher';
  title: string;
  confirmationNo?: string;
  date: string;
  endDate?: string;
  location?: string;
  price?: number;
  note?: string;
  flightNo?: string;
  depIata?: string;
  arrIata?: string;
  depTime?: string;
  arrTime?: string;
}

// 新增記帳型別
export interface ExpenseItem {
  id: string;
  date: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  method: '現金' | '信用卡' | '行動支付' | 'WOWPASS';
  location?: string;
  category: string;
  payerId: string;
  splitWith: string[]; // 分攤成員 ID 列表
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
  bookings: BookingItem[];
  expenses: ExpenseItem[]; // 新增
}