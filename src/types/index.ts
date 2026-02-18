export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP' | 'CNY' | 'HKD' | 'SGD' | 'VND';

// 成員個人定義
export interface Member {
  id: string;
  name: string;
  avatar: string; // Base64 或 URL
  email: string;  // 找回個人 PIN 用
  pin: string;    // 個人管理 PIN (4位數)
}

export interface ScheduleItem {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  category: 'sightseeing' | 'food' | 'transport' | 'hotel';
  note: string;
}

export interface BookingItem {
  id: string;
  type: 'flight' | 'hotel' | 'spot' | 'voucher';
  title: string;
  confirmationNo: string;
  date: string;
  endDate?: string;
  location: string;
  note: string;
  images: string[];
  qrCode?: string;
  website?: string;
  flightNo?: string;
  depIata?: string;
  arrIata?: string;
  depCity?: string;
  arrCity?: string;
  depTime?: string;
  arrTime?: string;
  duration?: string;
  baggage?: string;
  aircraft?: string;
}

export interface ExpenseItem {
  id: string;
  date: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  method: '現金' | '信用卡' | '行動支付';
  location: string;
  payerId: string;
  splitWith: string[];
  images: string[];
}

export interface Trip {
  id: string;
  dest: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseCurrency: CurrencyCode;
  // 安全設定
  tripPin: string;    // 進入行程密碼
  adminEmail: string; // 找回行程密碼 Email
  members: Member[];  // 旅伴清單
  // 內容清單
  items: ScheduleItem[];
  bookings: BookingItem[];
  expenses: ExpenseItem[];
  journals: any[];
  shoppingList: any[];
  infoItems: any[];
}
