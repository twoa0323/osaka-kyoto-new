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
import { Plus, ChevronDown, Trash2, Calendar, CreditCard, Wallet, Utensils, ShoppingBag, Info as InfoIcon, X, Camera, Lock, User, ShieldCheck } from 'lucide-react';
import { compressImage } from './utils/imageUtils';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const App: React.FC = () => {
  const { trips, currentTripId, switchTrip, deleteTrip, activeTab, setActiveTab, updateTripData } = useTripStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [lockedTripId, setLockedTripId] = useState<string | null>(null);
  const [verifyPin, setVerifyPin] = useState('');
  const [showPersonalSetup, setShowPersonalSetup] = useState(false);

  // 用於 Schedule 分頁的日期選擇
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);

  useFirebaseSync();
  
  // ✅ 修正：增加 fallback，避免 currentTrip 變成 undefined 導致白畫面
  const currentTrip = trips.find(t => t.id === currentTripId) || trips[0];

  useEffect(() => {
    if (currentTrip && (!currentTrip.members || currentTrip.members.length === 0)) setShowPersonalSetup(true);
  }, [currentTrip]);

  // ✅ 修正：如果連第一個行程都找不到，強制回到建立行程畫面
  if (trips.length === 0 || showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  if (!currentTrip) return <Onboarding onComplete={() => setShowOnboarding(false)} />;

  const myProfile = currentTrip.members?.[0];

  const dateRange = currentTrip ? (() => {
    const start = parseISO(currentTrip.startDate);
    const diff = Math.max(0, differenceInDays(parseISO(currentTrip.endDate), start)) + 1;
    return Array.from({ length: diff }, (_, i) => addDays(start, i));
  })() : [];

  const confirmTripSwitch = () => {
    const target = trips.find(t => t.id === lockedTripId);
    if (target?.tripPin === verifyPin) {
      switchTrip(lockedTripId!);
      setLockedTripId(null);
      setMenuOpen(false);
    } else { alert("密碼錯誤！🔒"); setVerifyPin(''); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-ac-bg font-sans text-ac-brown relative">
      
      <header className={`p-6 pb-2 sticky top-0 bg-ac-bg/90 backdrop-blur-md z-[100] w-full max-w-md mx-auto transition-all ${activeTab === 'schedule' ? 'border-b-4 border-ac-border' : ''}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="relative text-left">
            <h2 className="text-[10px] font-black text-ac-green uppercase tracking-[0.2em] mb-1">{currentTrip.startDate} — {currentTrip.endDate}</h2>
            <div className="flex items-center gap-1 cursor-pointer group" onClick={() => setMenuOpen(!menuOpen)}>
              <h1 className="text-2xl font-black tracking-tight">{currentTrip.dest}</h1>
              <ChevronDown size={20} className={menuOpen ? 'rotate-180' : ''} />
            </div>
            {menuOpen && (
              <div className="absolute top-14 left-0 w-64 bg-white border-4 border-ac-border rounded-[32px] shadow-zakka z-[110] p-2 animate-in fade-in slide-in-from-top-2">
                {trips.map(t => (
                  <div key={t.id} className={`flex items-center justify-between p-4 rounded-2xl ${t.id === currentTrip.id ? 'bg-ac-bg' : ''}`}>
                    <button className="flex-1 text-left font-bold text-sm" onClick={() => { if(t.id === currentTrip.id) return; setLockedTripId(t.id); setVerifyPin(''); }}>{t.dest}</button>
                    <button onClick={() => { if(confirm('移除行程？')) deleteTrip(t.id); }} className="text-ac-orange/40"><Trash2 size={16}/></button>
                  </div>
                ))}
                <button onClick={() => setShowOnboarding(true)} className="w-full mt-2 p-4 bg-ac-green text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 active:bg-ac-brown transition-colors"><Plus size={14}/> 新增行程</button>
              </div>
            )}
          </div>
          <div onClick={() => setMemberOpen(true)} className="w-12 h-12 rounded-full border-4 border-white shadow-zakka overflow-hidden bg-white shrink-0 cursor-pointer active:scale-90 transition-transform">
             <img src={myProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Adventurer`} alt="avatar" />
          </div>
        </div>

        {activeTab === 'schedule' && dateRange.length > 0 && (
          <div className="flex overflow-x-auto gap-4 hide-scrollbar pt-2 pb-2 animate-in slide-in-from-top-2">
            {dateRange.map((date, i) => (
              <button key={i} onClick={() => setSelectedDateIdx(i)} className={`flex flex-col items-center min-w-[70px] p-3 rounded-2xl border-2 transition-all ${selectedDateIdx === i ? 'bg-[#E2F1E7] border-ac-green text-ac-green shadow-zakka -translate-y-1' : 'bg-white border-ac-border text-ac-brown/30'}`}>
                <span className="text-[8px] font-black opacity-60">DAY {i+1}</span>
                <span className="text-sm font-black mt-0.5">{format(date, 'M/d')}</span>
                <span className="text-[9px] font-bold">{format(date, 'EEE', { locale: zhTW })}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ✅ 效能優化：使用 CSS display:none 取代條件渲染，實作狀態與捲動位置保留 (Keep-Alive) */}
      <main className="flex-1 w-full max-w-md mx-auto overflow-x-hidden">
        <div className={activeTab === 'schedule' ? 'block' : 'hidden'}>
          <Schedule externalDateIdx={selectedDateIdx} />
        </div>
        <div className={activeTab === 'booking' ? 'block' : 'hidden'}>
          <Booking />
        </div>
        <div className={activeTab === 'expense' ? 'block' : 'hidden'}>
          <Expense />
        </div>
        <div className={activeTab === 'food' ? 'block' : 'hidden'}>
          <Journal />
        </div>
        <div className={activeTab === 'shop' ? 'block' : 'hidden'}>
          <Shopping />
        </div>
        <div className={activeTab === 'info' ? 'block' : 'hidden'}>
          <Info />
        </div>
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white border-4 border-ac-border rounded-full shadow-zakka px-4 py-3 flex justify-between items-center z-50">
        <NavIcon icon={<Calendar />} label="行程" id="schedule" active={activeTab} onClick={setActiveTab} />
        <NavIcon icon={<CreditCard />} label="預訂" id="booking" active={activeTab} onClick={setActiveTab} />
        <NavIcon icon={<Wallet />} label="記帳" id="expense" active={activeTab} onClick={setActiveTab} />
        <NavIcon icon={<Utensils />} label="美食" id="food" active={activeTab} onClick={setActiveTab} />
        <NavIcon icon={<ShoppingBag />} label="購物" id="shop" active={activeTab} onClick={setActiveTab} />
        <NavIcon icon={<InfoIcon />} label="資訊" id="info" active={activeTab} onClick={setActiveTab} />
      </nav>

      {lockedTripId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-[#E2F1E7] rounded-full flex items-center justify-center mx-auto text-ac-green">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-black text-ac-brown">切換行程</h3>
            <p className="text-xs text-ac-border font-bold">請輸入該行程的 4 位數密碼</p>
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              placeholder="****"
              className="w-full bg-ac-bg text-ac-brown font-black p-4 rounded-2xl text-center text-2xl tracking-[0.5em] outline-none border-2 border-ac-border focus:border-ac-green"
              value={verifyPin}
              onChange={(e) => setVerifyPin(e.target.value)}
            />
            <div className="flex gap-3 mt-2">
              <button onClick={() => { setLockedTripId(null); setVerifyPin(''); }} className="flex-1 py-3 border-2 border-ac-border text-ac-border font-black rounded-full active:scale-95 transition-all">取消</button>
              <button onClick={confirmTripSwitch} className="flex-[2] py-3 bg-ac-green text-white font-black rounded-full shadow-zakka active:scale-95 transition-all">解鎖並切換 ➔</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

const NavIcon = ({ icon, label, id, active, onClick }: any) => {
  const isActive = active === id;
  return (
    <button onClick={() => onClick(id)} className={`flex flex-col items-center gap-1 flex-1 transition-all duration-300 ${isActive ? 'text-ac-green scale-110 -translate-y-1' : 'text-ac-border'}`}>
      {React.cloneElement(icon, { size: 18, strokeWidth: isActive ? 3 : 2 })}
      <span className="text-[8px] font-black tracking-tighter">{label}</span>
    </button>
  );
};

export default App;
