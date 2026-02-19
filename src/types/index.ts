export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP' | 'CNY' | 'HKD' | 'SGD' | 'VND';

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
  images: string[];
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
  category: string;
  payerId: string;
  splitWith: string[];
  images: string[];
  items?: { name: string; price: number }[];
}

export interface JournalItem { id: string; date: string; title: string; content: string; images: string[]; rating: number; location: string; }
export interface ShoppingItem { id: string; title: string; price: number; currency: CurrencyCode; isBought: boolean; images: string[]; note: string; category: string; }
export interface InfoItem { id: string; type: string; title: string; content: string; images: string[]; url: string; }

export interface Trip {
  id: string;
  dest: string;
  destination: string;
  lat?: number;
  lng?: number;
  startDate: string;
  endDate: string;
  baseCurrency: CurrencyCode;
  tripPin: string;
  adminEmail: string;
  members: Member[];
  budget?: number;
  items: ScheduleItem[];
  bookings: BookingItem[];
  expenses: ExpenseItem[];
  journals: JournalItem[];
  shoppingList: ShoppingItem[];
  infoItems: InfoItem[];
}



