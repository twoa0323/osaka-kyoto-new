import React, { useState, useEffect } from 'react';
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
  Info as InfoIcon,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore'; // 引入刪除功能
import { db } from './services/firebase';

const App: React.FC = () => {
  const { 
    trips, 
    currentTripId, 
    switchTrip, 
    deleteTrip, 
    activeTab, 
    setActiveTab 
  } = useTripStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 啟用雲端同步 (現在只會抓最新的 5 筆)
  useFirebaseSync();

  const currentTrip = trips.find(t => t.id === currentTripId);

  // 自動校正：如果 ID 失效，切換到第一個
  useEffect(() => {
    if (trips.length > 0 && !currentTrip) {
      switchTrip(trips[0].id);
    }
  }, [trips, currentTrip, switchTrip]);

  // 緊急清理功能：刪除當前髒資料
  const handlePurgeCurrent = async () => {
    if(!currentTrip) return;
    if(confirm(`⚠️ 這是開發者功能\n確定要從資料庫永久刪除「${currentTrip.dest}」嗎？`)) {
      // 1. 從 Local 刪除
      deleteTrip(currentTrip.id);
      // 2. 從 Cloud 刪除
      try {
        await deleteDoc(doc(db, "trips", currentTrip.id));
        alert("已刪除！");
      } catch (e) {
        console.error(e);
      }
    }
  }

  if (trips.length === 0 || showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  if (!currentTrip) {
    return (
      <div className="min-h-screen bg-ac-bg flex flex-col items-center justify-center text-ac-brown">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="font-black text-sm">正在同步手帳...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-ac-bg font-sans text-ac-brown">
      
      {/* 1. Header */}
      <header className="p-6 pb-2 sticky top-0 bg-ac-bg/90 backdrop-blur-md z-50 w-full max-w-md mx-auto">
        <div className="flex justify-between items-start">
          <div className="relative text-left">
            <h2 className="text-[10px] font-black text-ac-green uppercase tracking-[0.2em] mb-1">
              {currentTrip.startDate} — {currentTrip.endDate}
            </h2>
            
            <div 
              className="flex items-center gap-1 cursor-pointer group active:scale-95 transition-transform" 
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <h1 className="text-2xl font-black text-ac-brown tracking-tight line-clamp-1">
                {currentTrip.dest}
              </h1>
              <ChevronDown 
                size={20} 
                className={`text-ac-border transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} 
              />
            </div>

            {/* Menu */}
            {menuOpen && (
              <div className="absolute top-14 left-0 w-64 bg-white border-4 border-ac-border rounded-[32px] shadow-zakka overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2">
                <div className="p-2 max-h-[60vh] overflow-y-auto hide-scrollbar">
                  {trips.map(t => (
                    <div key={t.id} className={`flex items-center justify-between rounded-2xl p-4 transition-colors ${t.id === currentTripId ? 'bg-ac-bg' : 'hover:bg-ac-bg/50'}`}>
                      <button className={`flex-1 text-left font-bold text-sm ${t.id === currentTripId ? 'text-ac-green' : 'text-ac-brown'}`} onClick={() => { switchTrip(t.id); setMenuOpen(false); }}>
                        {t.dest}
                      </button>
                      {/* 在選單中也可以刪除 */}
                      <button onClick={async (e) => { 
                        e.stopPropagation();
                        if(confirm('刪除此行程？')) {
                          deleteTrip(t.id);
                          await deleteDoc(doc(db, "trips", t.id));
                        }
                      }} className="text-ac-orange/40 hover:text-ac-orange p-1">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => { setShowOnboarding(true); setMenuOpen(false); }} className="w-full mt-2 p-4 bg-ac-green text-white text-xs font-black flex items-center justify-center gap-2 rounded-2xl active:bg-ac-brown transition-colors">
                    <Plus size={14} /> 新增行程
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-10 h-10 rounded-full border-4 border-white shadow-zakka overflow-hidden bg-white shrink-0">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentTripId}`} alt="avatar" />
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto overflow-x-hidden relative">
        {activeTab === 'schedule' && <Schedule />}
        {activeTab === 'booking'  && <Booking />}
        {activeTab === 'expense'  && <Expense />}
        {activeTab === 'food'     && <Journal />}
        {activeTab === 'shop'     && <Shopping />}
        {activeTab === 'info'     && <Info />}

        {/* [開發者工具] 緊急刪除按鈕 - 只在開發時顯示，用來清理髒資料 */}
        <button 
          onClick={handlePurgeCurrent}
          className="fixed bottom-24 right-4 bg-red-500 text-white p-3 rounded-full shadow-2xl z-[100] active:scale-90 opacity-50 hover:opacity-100 transition-opacity"
          title="開發者功能：刪除當前行程 (含雲端)"
        >
          <AlertTriangle size={20} />
        </button>
      </main>

      {/* 3. Bottom Nav */}
      <div className="fixed bottom-6 left-0 right-0 z-50 px-4">
        <nav className="w-full max-w-md mx-auto bg-white border-4 border-ac-border rounded-full shadow-zakka px-4 py-3 flex justify-between items-center">
          <NavIcon icon={<Calendar />} label="行程" id="schedule" active={activeTab} onClick={setActiveTab} />
          <NavIcon icon={<CreditCard />} label="預訂" id="booking" active={activeTab} onClick={setActiveTab} />
          <NavIcon icon={<Wallet />} label="記帳" id="expense" active={activeTab} onClick={setActiveTab} />
          <NavIcon icon={<Utensils />} label="美食" id="food" active={activeTab} onClick={setActiveTab} />
          <NavIcon icon={<ShoppingBag />} label="購物" id="shop" active={activeTab} onClick={setActiveTab} />
          <NavIcon icon={<InfoIcon />} label="資訊" id="info" active={activeTab} onClick={setActiveTab} />
        </nav>
      </div>
    </div>
  );
};

const NavIcon = ({ icon, label, id, active, onClick }: any) => {
  const isActive = active === id;
  return (
    <button onClick={() => onClick(id)} className={`flex flex-col items-center gap-1 flex-1 transition-all duration-300 ${isActive ? 'text-ac-green scale-110 -translate-y-1' : 'text-ac-border'}`}>
      {React.cloneElement(icon, { size: 18, strokeWidth: isActive ? 3 : 2 })}
      <span className="text-[8px] font-black tracking-tighter">{label}</span>
      {isActive && <div className="w-1 h-1 bg-ac-green rounded-full mt-0.5" />}
    </button>
  );
};

export default App;