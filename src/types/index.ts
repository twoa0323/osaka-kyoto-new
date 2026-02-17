export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP' | 'CNY' | 'HKD' | 'SGD' | 'VND';

// ... 其他型別保持不變

export interface JournalItem {
  id: string;
  date: string;
  title: string;
  content: string;
  images: string[]; // Base64 或 URL 陣列
  location?: string;
  rating: number; // 1-5 星
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
  journals: JournalItem[]; // 新增
}