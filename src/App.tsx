import React, { useState } from 'react';
import { useTripStore } from './store/useTripStore';
import { Onboarding } from './components/Onboarding';
import { Plus, ChevronDown, Trash2, Calendar, CreditCard, Wallet, Utensils, ShoppingBag, Info } from 'lucide-react';

const App = () => {
  const { trips, currentTripId, switchTrip, deleteTrip, addTrip, activeTab, setActiveTab } = useTripStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const currentTrip = trips.find(t => t.id === currentTripId);

  // 如果完全沒行程，顯示 Onboarding
  if (trips.length === 0 || showOnboarding) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen bg-ac-bg pb-24">
      {/* 頂部導航與切換 */}
      <header className="p-6 flex justify-between items-start sticky top-0 bg-ac-bg/80 backdrop-blur-md z-40">
        <div>
          <h2 className="text-[10px] font-black text-ac-green uppercase tracking-[0.2em]">{currentTrip?.startDate}</h2>
          <div 
            className="flex items-center gap-1 cursor-pointer group"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <h1 className="text-2xl font-black text-ac-brown">{currentTrip?.dest}</h1>
            <ChevronDown size={20} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* 切換行程選單 */}
        {menuOpen && (
          <div className="absolute top-20 right-6 w-56 bg-white border-4 border-ac-border rounded-3xl shadow-zakka overflow-hidden animate-in fade-in slide-in-from-top-2">
            {trips.map(t => (
              <div key={t.id} className="flex items-center justify-between border-b border-ac-border last:border-0 p-3 hover:bg-ac-bg">
                <button 
                  className="flex-1 text-left font-bold text-sm"
                  onClick={() => { switchTrip(t.id); setMenuOpen(false); }}
                >
                  {t.dest}
                </button>
                <button onClick={() => deleteTrip(t.id)} className="text-ac-orange p-1"><Trash2 size={14}/></button>
              </div>
            ))}
            {trips.length < 3 && (
              <button 
                onClick={() => setShowOnboarding(true)}
                className="w-full p-3 bg-ac-green text-white text-xs font-black flex items-center justify-center gap-2"
              >
                <Plus size={14} /> 新增行程 ({trips.length}/3)
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content Render */}
      <main className="px-4">
        {activeTab === 'schedule' && <div className="animate-fade-in py-10 text-center">行程時間軸準備中...</div>}
        {/* 其他分頁... */}
      </main>

      {/* 底部導航 (略，維持原樣) */}
    </div>
  );
};