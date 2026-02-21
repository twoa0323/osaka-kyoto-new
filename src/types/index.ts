// filepath: src/types/index.ts

// --- 貨幣代碼列舉 ---
export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB' | 'GBP' | 'CNY' | 'HKD' | 'SGD' | 'VND';

// --- 成員個人定義 ---
export interface Member {
  id: string;
  name: string;
  avatar: string; 
  email: string;  
  pin: string;
}

// --- 1. 行程 (Schedule) 項目 ---
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

// --- 2. 預訂 (Booking) 項目 ---
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
  
  // 機票專用欄位
  airline?: string; 
  flightNo?: string;
  depIata?: string;
  arrIata?: string;
  depTime?: string;
  arrTime?: string;
  depCity?: string;
  arrCity?: string;
  duration?: string;
  baggage?: string;
  aircraft?: string;
  seat?: string; 
  
  // 住宿專用欄位
  price?: number;
  nights?: number;
}

// --- 3. 記帳 (Expense) 項目 ---
export interface ExpenseItem {
  id: string;
  date: string;
  storeName: string; // [關鍵新增] 店家名稱
  title: string;
  amount: number;
  currency: CurrencyCode;
  method: '現金' | '信用卡' | '行動支付' | 'IC卡' | '其他'; // [更新] 支付方式
  location: string;
  category: '餐飲' | '購物' | '交通' | '住宿' | '娛樂' | '藥妝' | '便利商店' | '超市' | '其他'; // [更新] 類別
  payerId: string;
  splitWith: string[];
  images: string[];
  items?: { name: string; price: number }[]; // [關鍵新增] AI 辨識細項
}

// --- 4. 美食日誌 (Journal) 項目 ---
export interface JournalItem { 
  id: string; 
  date: string; 
  title: string; 
  content: string; 
  images: string[]; 
  rating: number; 
  location: string; 
}

// --- 5. 購物清單 (Shopping) 項目 ---
export interface ShoppingItem { 
  id: string; 
  title: string; 
  price: number; 
  currency: CurrencyCode; 
  isBought: boolean; 
  images: string[]; 
  note: string; 
  category: string; 
}

// --- 6. 旅遊資訊 (Info) 項目 ---
export interface InfoItem { 
  id: string; 
  type: string; 
  title: string; 
  content: string; 
  images: string[]; 
  url: string; 
}

// --- 根節點：整趟旅程 (Trip) 定義 ---
export interface Trip {
  id: string;
  dest: string;
  destination: string;
  lat?: number;
  lng?: number;
  startDate: string;
  endDate: string;
  baseCurrency: CurrencyCode;
  
  // 安全與預算設定
  tripPin: string;
  adminEmail: string;
  members: Member[];
  budget?: number; // 總預算
  
  // 6 大模組資料集合
  items: ScheduleItem[];
  bookings: BookingItem[];
  expenses: ExpenseItem[];
  journals: JournalItem[];
  shoppingList: ShoppingItem[];
  infoItems: InfoItem[];
}






