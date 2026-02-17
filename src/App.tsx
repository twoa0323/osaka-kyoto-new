import React, { useState } from 'react';
import { useTripStore } from './store/useTripStore';
import { Onboarding } from './components/Onboarding';
import { Schedule } from './components/Schedule';
import { Booking } from './components/Booking';
import { Expense } from './components/Expense';
import { Journal } from './components/Journal';
import { Shopping } from './components/Shopping'; // 新增
import { Plus, ChevronDown, Trash2, Calendar, CreditCard, Wallet, Utensils, ShoppingBag, Info } from 'lucide-react';

const App: React.FC = () => {
  const { trips, currentTripId, switchTrip, deleteTrip, activeTab, setActiveTab } = useTripStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const currentTrip = trips.find(t => t.id === currentTripId);

  if (trips.length === 0 || showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="min-h-screen bg-ac-bg pb-32 font-sans">
      <header className="p-6 flex justify-between items-start sticky top-0 bg-ac-bg/90 backdrop-blur-md z-40">
        <div className="relative text-left">
          <h2 className="text-[10px] font-black text-ac-green uppercase tracking-[0.2em] mb-1">
            {currentTrip?.startDate} — {currentTrip?.endDate}
          </h2>
          <div className="flex items-center gap-1 cursor-pointer group active:scale-95 transition-transform" onClick={() => setMenuOpen(!menuOpen)}>
            <h1 className="text-2xl font-black text-ac-brown">{currentTrip?.dest}</h1>
            <ChevronDown size={20} className={`text-ac-border transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </div>

          {menuOpen && (
            <div className="absolute top-14 left-0 w-64 bg-white border-4 border-ac-border rounded-3xl shadow-zakka overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              {trips.map(t => (
                <div key={t.id} className="flex items-center justify-between border-b border-ac-border last:border-0 p-4 hover:bg-ac-bg transition-colors">
                  <button className={`flex-1 text-left font-bold text-sm ${t.id === currentTripId ? 'text-ac-green' : 'text-ac-brown'}`} onClick={() => { switchTrip(t.id); setMenuOpen(false); }}>{t.dest}</button>
                  <button onClick={() => deleteTrip(t.id)} className="text-ac-orange/40 hover:text-ac-orange p-1 transition-colors"><Trash2 size={16}/></button>
                </div>
              ))}
              {trips.length < 3 && (
                <button onClick={() => { setShowOnboarding(true); setMenuOpen(false); }} className="w-full p-4 bg-ac-green text-white text-xs font-black flex items-center justify-center gap-2 active:bg-ac-brown"><Plus size={14} /> 新增行程</button>
              )}
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-full border-4 border-white shadow-zakka overflow-hidden bg-white">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentTripId}`} alt="avatar" />
        </div>
      </header>

      <main>
        {activeTab === 'schedule' && <Schedule />}
        {activeTab === 'booking' && <Booking />}
        {activeTab === 'expense' && <Expense />}
        {activeTab === 'food' && <Journal />}
        {activeTab === 'shop' && <Shopping />} {/* 接入購物清單 */}
        {activeTab === 'info' && <div className="p-10 text-center italic text-ac-border font-bold italic">最後一個模組開發中...</div>}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white border-4 border-ac-border rounded-full shadow-zakka px-4 py-3 flex justify-between items-center z-50">
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
  <button onClick={() => onClick(id)} className={`flex flex-col items-center gap-1 flex-1 transition-all duration-300 ${active === id ? 'text-ac-green scale-110 -translate-y-1' : 'text-ac-border hover:text-ac-green/50'}`}>
    {React.cloneElement(icon, { size: 20, strokeWidth: active === id ? 3 : 2 })}
    <span className="text-[9px] font-black">{label}</span>
  </button>
);

export default App;