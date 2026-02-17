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
  Plus, ChevronDown, Trash2, Calendar, CreditCard, 
  Wallet, Utensils, ShoppingBag, Info as InfoIcon,
  Loader2, Skull 
} from 'lucide-react';
import { deleteDoc, doc, getDocs, collection } from 'firebase/firestore'; // 新增 getDocs, collection
import { db } from './services/firebase';

const App: React.FC = () => {
  const { 
    trips, 
    currentTripId, 
    switchTrip, 
    deleteTrip, 
    activeTab, 
    setActiveTab,
    setTrips // 需要手動清空 Store
  } = useTripStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isResetting, setIsResetting] = useState(false); // 重置狀態

  // 啟用雲端同步
  useFirebaseSync();

  const currentTrip = trips.find(t => t.id === currentTripId);

  // 自動校正
  useEffect(() => {
    if (trips.length > 0 && !currentTrip) {
      switchTrip(trips[0].id);
    }
  }, [trips, currentTrip, switchTrip]);

  // --- [核彈級重置功能] ---
  // 這會刪除 Firebase 中 "trips" 集合裡的所有文件，並清空本地快取
  const handleNuclearReset = async () => {
    if (!confirm('⚠️ 危險操作 ⚠️\n這將會「永久刪除」資料庫裡的所有行程資料！\n\n確定要清空一切重新開始嗎？')) return;
    
    setIsResetting(true);
    try {
      // 1. 抓取雲端所有資料
      const querySnapshot = await getDocs(collection(db, "trips"));
      console.log(`正在刪除 ${querySnapshot.size} 筆資料...`);
      
      // 2. 刪除每一筆資料
      const deletePromises = querySnapshot.docs.map(document => 
        deleteDoc(doc(db, "trips", document.id))
      );
      await Promise.all(deletePromises);

      // 3. 清空本地 Store
      setTrips([]);
      localStorage.clear();
      
      alert('🧹 清理完畢！頁面將重新整理...');
      window.location.reload();
      
    } catch (error) {
      console.error("重置失敗:", error);
      alert("重置失敗，請檢查 Console");
      setIsResetting(false);
    }
  };

  // 顯示 Onboarding 條件：沒有行程 或 正在重置
  if ((trips.length === 0 && !isResetting) || showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  // 載入中畫面
  if (!currentTrip || isResetting) {
    return (
      <div className="min-h-screen bg-ac-bg flex flex-col items-center justify-center text-ac-brown">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-black text-lg">{isResetting ? "正在銷毀所有資料..." : "正在同步手帳..."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-ac-bg font-sans text-ac-brown relative">
      
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

        {/* [核彈級重置按鈕] - 只在開發時使用 */}
        <button 
          onClick={handleNuclearReset}
          className="fixed bottom-24 right-4 bg-purple-600 text-white p-4 rounded-full shadow-2xl z-[100] active:scale-90 hover:bg-purple-700 transition-all flex items-center justify-center"
          title="開發者功能：清空所有資料庫資料"
        >
          <Skull size={24} />
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