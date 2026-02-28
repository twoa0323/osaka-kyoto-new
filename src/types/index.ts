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
  mood?: string;
}

// --- 基礎欄位 (用於衝突檢查與併發控制) ---
export interface SyncMetadata {
  updatedAt?: number;      // Unix 時間戳 (ms)
  lastUpdatedBy?: string;  // 最後更新者的 ID 或名稱
}

// --- 1. 行程 (Schedule) 項目 ---
export interface ScheduleItem extends SyncMetadata {
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
  spotGuide?: {                 // 👈 新增：AI 景點導覽 (背景與亮點)
    background: string;
    highlights: string[];
    suggestedDuration?: string;
  };
  lat?: number;                 // 👈 新增：緯度
  lng?: number;                 // 👈 新增：經度
  cost: number;                 // 👈 新增：預估花費
}

// --- 2. 預訂 (Booking) 項目 ---
export interface BookingItem extends SyncMetadata {
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
  pnr?: string;           // 👈 新增：訂位代碼
  eTicketNo?: string;     // 👈 新增：電子票號
  terminal?: string;      // 👈 新增：航廈資訊
  gate?: string;          // 👈 新增：登機門
  boardingTime?: string;  // 👈 新增：登機時間
  baggageAllowance?: string; // 👈 新增：行李額度詳情

  // 住宿專用欄位
  price?: number;
  nights?: number;
  roomType?: string;      // 👈 新增：房型
  contactPhone?: string;  // 👈 新增：飯店電話
  checkInTime?: string;   // 👈 新增：入住時間
  mapUrl?: string;        // 👈 新增：地圖連結

  // 景點/憑證專用欄位
  entryTime?: string;       // 👈 新增：指定入場時間 (景點)
  lastEntryTime?: string;   // 👈 新增：最後入場時間 (景點)
  ticketType?: string;      // 👈 新測：票券種類 (例如：成人票x2)
  meetingPoint?: string;    // 👈 新增：集合地點
  exchangeLocation?: string;// 👈 新增：實體票兌換地點 (憑證)
  exchangeHours?: string;   // 👈 新增：兌換處營業時間
}

// --- 3. 記帳 (Expense) 項目 ---
export interface ExpenseItem extends SyncMetadata {
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
  splitWith: { memberId: string; weight?: number; amount?: number }[]; // 👈 改為物件陣列支援權重
  images: string[];
  items?: { name: string; price: number; assignedTo?: string[] }[];
  isTaxFree?: boolean; // 👈 新增：是否免稅
}

// --- 4. 美食日誌 (Journal) 項目 ---
export interface JournalItem extends SyncMetadata {
  id: string;
  date: string;
  title: string;
  content: string;
  images: string[];
  rating: number;
  location: string;
  cost?: number;          // 👈 新增：花費金額
  currency?: CurrencyCode;// 👈 新增：幣別
  dishes?: string[];      // 👈 新增：推薦菜色清單
  tags?: string[];        // 👈 新增：美食標籤
  externalLink?: string;  // 👈 新增：店家 Google Maps 等外部連結
}

// --- 5. 購物清單 (Shopping) 項目 ---
export interface ShoppingItem extends SyncMetadata {
  id: string;
  title: string;
  price: number;
  quantity: number;       // 👈 新增：購買數量
  targetPrice?: number;   // 👈 新增：目標促銷價 / 願望價格
  currency: CurrencyCode;
  isBought: boolean;
  images: string[];
  note: string;
  category: string;
  aiPriceInfo?: {         // 👈 新增：AI 魔法格價資訊
    currentMarketPrice: number;
    shopName?: string;
    lastChecked: number;
    advice: string;
    lowPriceAlert?: boolean;
    dealRating?: 'good' | 'bad' | 'normal'; // 👈 新增：划算程度評分
  };
  location?: string;      // 👈 新增：購買地點 (例如：心齋橋)
  storeName?: string;     // 👈 新增：店家名稱 (例如：Bic Camera)
  forWhom?: string;       // 👈 新增：代購受託人 (例如：媽媽)
  isTaxFreeEligible?: boolean; // 👈 新增：是否符合免稅資格
  priority?: 'high' | 'medium' | 'low'; // 👈 新增：購買優先級
}

// --- 6. 旅遊資訊 (Info) 項目 ---
export interface InfoItem extends SyncMetadata {
  id: string;
  type: string;
  title: string;
  content: string;
  images: string[];
  url: string;
  category?: 'SOS' | 'Network' | 'Language' | 'Packing' | 'Culture' | 'Other'; // 👈 新增：分類
  priority?: boolean;    // 👈 新增：是否置頂
  quickActions?: {       // 👈 新增：快速行動選項
    type: 'dial' | 'copy_gps' | 'link' | 'ai_translate' | 'ai_taboos';
    value: string;
    label: string;
  }[];
}

// --- 7. 行李清單 (Packing) 項目 ---
export interface PackingItem extends SyncMetadata {
  id: string;
  title: string;
  category: string;
  quantity: number;
  isPacked: boolean;
  note?: string;
}

// --- 根節點：整趟旅程 (Trip) 定義 ---
export interface Trip extends SyncMetadata {
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
  adminEmail?: string;
  members: Member[];
  memberIds?: string[];
  budget?: number; // 總預算

  // 6 大模組資料集合
  items: ScheduleItem[];
  bookings: BookingItem[];
  expenses: ExpenseItem[];
  journals: JournalItem[];
  shoppingList: ShoppingItem[];
  infoItems: InfoItem[];
  packingList: PackingItem[];

  // 匯率暫存 (離線使用)
  lastFetchedRate?: number;
  lastRateUpdate?: number;
}







