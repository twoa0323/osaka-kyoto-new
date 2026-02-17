export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP' | 'CNY' | 'HKD' | 'SGD' | 'VND';

// ... 其他型別保持不變

export interface ShoppingItem {
  id: string;
  title: string;
  price?: number;
  currency: CurrencyCode;
  isBought: boolean;
  images: string[];
  note?: string;
  category: 'must-buy' | 'beauty' | 'luxury' | 'souvenir' | 'general';
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
  expenses: ExpenseItem[];
  journals: JournalItem[];
  shoppingList: ShoppingItem[]; // 新增
}