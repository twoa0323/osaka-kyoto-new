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
  mood?: string; // 👈 [新增] 心情/留言
}

// --- 1. 行程 (Schedule) 項目 ---
export interface ScheduleItem {
  id: string;
  date: string;
  time: string;
  endTime?: string;             // 👈 新增：結束時間
  title: string;
  location: string;
  category: 'sightseeing' | 'food' | 'transport' | 'hotel';
  note: string;
  images: string[];
  isCompleted?: boolean;        // 👈 新增：是否已完成 (灰底)
  transportSuggestion?: string; // 👈 新增：AI 交通建議
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
  roomType?: string;      // 👈 新增：房型
  contactPhone?: string;  // 👈 新增：飯店電話

  // 景點/憑證專用欄位
  entryTime?: string;       // 👈 新增：指定入場時間 (景點)
  ticketType?: string;      // 👈 新增：票券種類 (例如：成人票x2)
  exchangeLocation?: string;// 👈 新增：實體票兌換地點 (憑證)
}

// --- 3. 記帳 (Expense) 項目 ---
export interface ExpenseItem {
  id: string;
  date: string;
  storeName: string; 
  title: string;
  amount: number;
  currency: CurrencyCode;
  method: '現金' | '信用卡' | '行動支付' | 'IC卡' | '其他'; 
  location: string;
  category: '餐飲' | '購物' | '交通' | '住宿' | '娛樂' | '藥妝' | '便利商店' | '超市' | '其他'; 
  payerId: string;
  splitWith: string[];
  images: string[];
  items?: { name: string; price: number }[]; 
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
  creatorId?: string;
  tripName: string;
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







