import React, { useState } from 'react';
import { useTripStore } from './store/useTripStore';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { Onboarding } from './components/Onboarding';
import { Schedule } from './components/Schedule';
import { Booking } from './components/Booking';
import { Expense } from './components/Expense';
import { Journal } from './components/Journal';
import { Shopping } from './components/Shopping';
import { Info } from './components/Info';
import { 
  Plus, 
  ChevronDown, 
  Trash2, 
  Calendar, 
  CreditCard, 
  Wallet, 
  Utensils, 
  ShoppingBag, 
  Info as InfoIcon 
} from 'lucide-react';

const App: React.FC = () => {
  // --- Zustand Store 狀態 ---
  const { 
    trips, 
    currentTripId, 
    switchTrip, 
    deleteTrip, 
    activeTab, 
    setActiveTab 
  } = useTripStore();

  // --- 本地 UI 狀態 ---
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // --- Firebase 即時雲端同步 ---
  useFirebaseSync();

  // --- 獲取當前活躍行程 ---
  const currentTrip = trips.find(t => t.id === currentTripId);

  // --- 如果沒有任何行程，或使用者點擊了「新增行程」，則顯示 Onboarding 畫面 ---
  if (trips.length === 0 || showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="min-h-screen bg-ac-bg pb-32 font-sans overflow-x-hidden">
      
      {/* 1. 頂部 Header 與 行程切換器 */}
      <header className="p-6 flex justify-between items-start sticky top-0 bg-ac-bg/90 backdrop-blur-md z-40">
        <div className="relative text-left">
          {/* 日期區間顯示 */}
          <h2 className="text-[10px] font-black text-ac-green uppercase tracking-[0.2em] mb-1">
            {currentTrip?.startDate} — {currentTrip?.endDate}
          </h2>
          
          {/* 城市標題與選單觸發 */}
          <div 
            className="flex items-center gap-1 cursor-pointer group active:scale-95 transition-transform" 
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <h1 className="text-2xl font-black text-ac-brown tracking-tight">
              {currentTrip?.dest || "未命名行程"}
            </h1>
            <ChevronDown 
              size={20} 
              className={`text-ac-border transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} 
            />
          </div>

          {/* 下拉行程清單 (最多 3 個) */}
          {menuOpen && (
            <div className="absolute top-14 left-0 w-64 bg-white border-4 border-ac-border rounded-[32px] shadow-zakka overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-2">
                {trips.map(t => (
                  <div 
                    key={t.id} 
                    className={`flex items-center justify-between rounded-2xl p-4 transition-colors ${
                      t.id === currentTripId ? 'bg-ac-bg' : 'hover:bg-ac-bg/50'
                    }`}
                  >
                    <button 
                      className={`flex-1 text-left font-bold text-sm ${
                        t.id === currentTripId ? 'text-ac-green' : 'text-ac-brown'
                      }`} 
                      onClick={() => { switchTrip(t.id); setMenuOpen(false); }}
                    >
                      {t.dest}
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm(`確定要刪除「${t.dest}」的所有資料嗎？`)) deleteTrip(t.id);
                      }} 
                      className="text-ac-orange/40 hover:text-ac-orange p-1 transition-colors"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))}
                
                {/* 新增按鈕 (限制最多 3 個) */}
                {trips.length < 3 && (
                  <button 
                    onClick={() => { setShowOnboarding(true); setMenuOpen(false); }} 
                    className="w-full mt-2 p-4 bg-ac-green text-white text-xs font-black flex items-center justify-center gap-2 rounded-2xl active:bg-ac-brown transition-colors"
                  >
                    <Plus size={14} /> 新增行程 ({trips.length}/3)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右上角頭像裝飾 */}
        <div className="w-10 h-10 rounded-full border-4 border-white shadow-zakka overflow-hidden bg-white shrink-0">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentTripId || 'default'}`} 
            alt="avatar" 
          />
        </div>
      </header>

      {/* 2. 主內容區域 (根據選取的 Tab 切換組件) */}
      <main className="relative z-0">
        {activeTab === 'schedule' && <Schedule />}
        {activeTab === 'booking'  && <Booking />}
        {activeTab === 'expense'  && <Expense />}
        {activeTab === 'food'     && <Journal />}
        {activeTab === 'shop'     && <Shopping />}
        {activeTab === 'info'     && <Info />}
      </main>

      {/* 3. 底部固定導航列 (Tab Navigation) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white border-4 border-ac-border rounded-full shadow-zakka px-4 py-3 flex justify-between items-center z-50">
        <NavIcon 
          icon={<Calendar />} 
          label="行程" 
          id="schedule" 
          active={activeTab} 
          onClick={setActiveTab} 
        />
        <NavIcon 
          icon={<CreditCard />} 
          label="預訂" 
          id="booking" 
          active={activeTab} 
          onClick={setActiveTab} 
        />
        <NavIcon 
          icon={<Wallet />} 
          label="記帳" 
          id="expense" 
          active={activeTab} 
          onClick={setActiveTab} 
        />
        <NavIcon 
          icon={<Utensils />} 
          label="美食" 
          id="food" 
          active={activeTab} 
          onClick={setActiveTab} 
        />
        <NavIcon 
          icon={<ShoppingBag />} 
          label="購物" 
          id="shop" 
          active={activeTab} 
          onClick={setActiveTab} 
        />
        <NavIcon 
          icon={<InfoIcon />} 
          label="資訊" 
          id="info" 
          active={activeTab} 
          onClick={setActiveTab} 
        />
      </nav>
    </div>
  );
};

// --- 子組件：導航圖示按鈕 ---
interface NavIconProps {
  icon: React.ReactElement;
  label: string;
  id: string;
  active: string;
  onClick: (id: string) => void;
}

const NavIcon: React.FC<NavIconProps> = ({ icon, label, id, active, onClick }) => {
  const isActive = active === id;
  
  return (
    <button 
      onClick={() => onClick(id)} 
      className={`flex flex-col items-center gap-1 flex-1 transition-all duration-300 ${
        isActive 
          ? 'text-ac-green scale-110 -translate-y-1' 
          : 'text-ac-border hover:text-ac-green/50'
      }`}
    >
      {/* 動態調整 Lucide Icon 的屬性 */}
      {React.cloneElement(icon, { 
        size: 20, 
        strokeWidth: isActive ? 3 : 2 
      })}
      <span className="text-[9px] font-black tracking-tighter">
        {label}
      </span>
      
      {/* 動森風格的小選取圓點 */}
      {isActive && (
        <div className="w-1 h-1 bg-ac-green rounded-full mt-0.5 animate-pulse" />
      )}
    </button>
  );
};

export default App;