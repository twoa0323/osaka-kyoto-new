export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP' | 'CNY' | 'HKD' | 'SGD' | 'VND';

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
  type: 'flight' | 'hotel' | 'car' | 'voucher';
  title: string;
  confirmationNo: string;
  date: string;
  location: string;
  note: string;
  images: string[]; 
  flightNo?: string;
  depIata?: string;
  arrIata?: string;
  depTime?: string;
  arrTime?: string;
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

// 其餘 JournalItem, ShoppingItem, InfoItem 確保 images: string[]
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
  members: string[];
  pin: string;
  items: ScheduleItem[];
  bookings: BookingItem[];
  expenses: ExpenseItem[];
  journals: JournalItem[];
  shoppingList: ShoppingItem[];
  infoItems: InfoItem[];
}
