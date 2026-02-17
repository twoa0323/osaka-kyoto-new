import React from 'react';
import { useTripStore } from './store/useTripStore';
import { Onboarding } from './components/Onboarding';
import { 
  Calendar, CreditCard, Wallet, Utensils, ShoppingBag, Info 
} from 'lucide-react';

const App: React.FC = () => {
  const { currentTrip, activeTab, setActiveTab } = useTripStore();

  if (!currentTrip) return <Onboarding />;

  return (
    <div className="pb-24 min-h-screen">
      {/* 頂部 Header */}
      <header className="p-6 pb-2">
        <h2 className="text-xs font-bold text-ac-green uppercase tracking-widest mb-1">
          {currentTrip.startDate} — {currentTrip.endDate}
        </h2>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {currentTrip.dest} <span className="text-ac-border">/</span> 旅行手帳
        </h1>
      </header>

      {/* 分頁內容渲染區域 */}
      <main className="px-4">
        {activeTab === 'schedule' && <div>{/* 下一步實作 Schedule */}</div>}
        {activeTab === 'booking' && <div>{/* 下一步實作 Booking */}</div>}
        {/* ...其餘分頁 */}
      </main>

      {/* 底部導航列 */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white border-4 border-ac-border rounded-full shadow-zakka px-6 py-3 flex justify-between items-center z-50">
        <NavIcon icon={<Calendar />} label="行程" id="schedule" active={activeTab} onClick={setActiveTab} />
        <NavIcon icon={<CreditCard />} label="預訂" id="booking" active={activeTab} onClick={setActiveTab} />
        <NavIcon icon={<Wallet />} label="記帳" id="expense" active={activeTab} onClick={setActiveTab} />
        <NavIcon icon={<Utensils />} label="美食" id="food" active={activeTab} onClick={setActiveTab} />
        <NavIcon icon={<ShoppingBag />} label="購物" id="shop" active={activeTab} onClick={setActiveTab} />
        <NavIcon icon={<Info />} label="資訊" id="info" active={activeTab} onClick={setActiveTab} />
      </nav>
    </div>
  );
};

const NavIcon = ({ icon, label, id, active, onClick }: any) => (
  <button 
    onClick={() => onClick(id)}
    className={`flex flex-col items-center gap-1 transition-all ${active === id ? 'text-ac-green scale-110' : 'text-ac-border'}`}
  >
    {React.cloneElement(icon, { size: 20, strokeWidth: active === id ? 3 : 2 })}
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default App;