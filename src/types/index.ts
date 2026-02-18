export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP' | 'CNY' | 'HKD' | 'SGD' | 'VND';

// 成員個人定義
export interface Member {
  id: string;
  name: string;
  avatar: string; 
  email: string;  
  pin: string;
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
  // 航班專屬
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
  // 費用
  price?: number;
  nights?: number;
}

export interface ExpenseItem {
  id: string;
  date: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  method: '現金' | '信用卡' | '行動支付';
  location: string;
  category: string; // 用於統計分類 (食、衣、住、行...)
  payerId: string;
  splitWith: string[];
  images: string[];
  items?: { name: string; price: number }[]; // AI 辨識出的細項
}

// 介面擴充 (Journal, Shopping, Info...)
export interface JournalItem { id: string; date: string; title: string; content: string; images: string[]; rating: number; location: string; }
export interface ShoppingItem { id: string; title: string; price: number; currency: CurrencyCode; isBought: boolean; images: string[]; note: string; category: string; }
export interface InfoItem { id: string; type: string; title: string; content: string; images: string[]; url: string; }

export interface Trip {
  id: string;
  dest: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseCurrency: CurrencyCode;
  // 安全設定
  tripPin: string;
  adminEmail: string;
  members: Member[];
  // 預算設定
  budget?: number; // 總預算 (TWD)
  // 內容
  items: ScheduleItem[];
  bookings: BookingItem[];
  expenses: ExpenseItem[];
  journals: JournalItem[];
  shoppingList: ShoppingItem[];
  infoItems: InfoItem[];
}
