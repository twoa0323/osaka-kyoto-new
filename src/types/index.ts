export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP' | 'CNY' | 'HKD' | 'SGD' | 'VND';

// 成員個人定義
export interface Member {
  id: string;
  name: string;
  avatar: string; // Base64 或 URL
  email: string;  // 找回個人 PIN 用
  pin: string;    // 個人管理 PIN
}

export interface ScheduleItem { id: string; date: string; time: string; title: string; location: string; category: 'sightseeing' | 'food' | 'transport' | 'hotel'; note: string; }

export interface Trip {
  id: string;
  dest: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseCurrency: CurrencyCode;
  // 安全性設定
  tripPin: string;   // 進入行程的 4 位數密碼
  adminEmail: string; // 找回行程密碼用
  members: Member[];  // 旅伴列表
  // 內容
  items: ScheduleItem[];
  bookings: any[];
  expenses: any[];
  journals: any[];
  shoppingList: any[];
  infoItems: any[];
}