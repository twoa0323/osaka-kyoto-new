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
import { Plus, ChevronDown, Trash2, Calendar, CreditCard, Wallet, Utensils, ShoppingBag, Info as InfoIcon, X, Edit3, Mail, User, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const { trips, currentTripId, switchTrip, deleteTrip, activeTab, setActiveTab, updateTripData } = useTripStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // 安全性狀態
  const [pinVerify, setPinVerify] = useState({ id: '', pin: '', mode: '' as 'delete' | '' });

  useFirebaseSync();
  const currentTrip = trips.find(t => t.id === currentTripId);

  useEffect(() => {
    if (trips.length > 0 && !currentTrip) switchTrip(trips[0].id);
  }, [trips, currentTrip, switchTrip]);

  if (trips.length === 0 || showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  if (!currentTrip) return null;

  // 處理成員驗證
  const confirmDeleteMember = () => {
    const member = currentTrip.members.find(m => m.id === pinVerify.id);
    if (member?.pin !== pinVerify.pin) return alert("PIN 碼不正確唷！🔒");
    
    const newMembers = currentTrip.members.filter(m => m.id !== pinVerify.id);
    updateTripData(currentTrip.id, { members: newMembers });
    setPinVerify({ id: '', pin: '', mode: '' });
    alert("成員已移除。");
  };

  return (
    <div className="flex flex-col min-h-screen bg-ac-bg font-sans text-ac-brown">
      {/* Header */}
      <header className="p-6 pb-2 sticky top-0 bg-ac-bg/90 backdrop-blur-md z-[100] w-full max-w-md mx-auto">
        <div className="flex justify-between items-start">
          <div className="relative text-left">
            <h2 className="text-[10px] font-black text-ac-green uppercase tracking-[0.2em] mb-1">{currentTrip.startDate} — {currentTrip.endDate}</h2>
            <div className="flex items-center gap-1 cursor-pointer group" onClick={() => setMenuOpen(!menuOpen)}>
              <h1 className="text-2xl font-black tracking-tight">{currentTrip.dest}</h1>
              <ChevronDown size={20} className={`text-ac-border transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </div>
            {menuOpen && (
              <div className="absolute top-14 left-0 w-64 bg-white border-4 border-ac-border rounded-[32px] shadow-zakka z-[110] p-2 animate-in fade-in slide-in-from-top-2">
                {trips.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-ac-bg">
                    <button className={`flex-1 text-left font-bold text-sm ${t.id === currentTripId ? 'text-ac-green' : ''}`} onClick={() => { switchTrip(t.id); setMenuOpen(false); }}>{t.dest}</button>
                    <button onClick={() => { if(confirm('確定刪除？')) deleteTrip(t.id); }} className="text-ac-orange/40"><Trash2 size={16}/></button>
                  </div>
                ))}
                <button onClick={() => setShowOnboarding(true)} className="w-full mt-2 p-4 bg-ac-green text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 active:bg-ac-brown transition-colors"><Plus size={14}/> 新增行程</button>
              </div>
            )}
          </div>

          {/* 右上角頭像：開啟成員選單 */}
          <div onClick={() => setMemberOpen(true)} className="w-12 h-12 rounded-full border-4 border-white shadow-zakka overflow-hidden bg-white shrink-0 cursor-pointer active:scale-90 transition-transform">
             <img src={currentTrip.members[0]?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Admin`} alt="avatar" />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto overflow-x-hidden">
        {activeTab === 'schedule' && <Schedule />}
        {activeTab === 'booking' && <Booking />}
        {activeTab === 'expense' && <Expense />}
        {activeTab === 'food' && <Journal />}
        {activeTab === 'shop' && <Shopping />}
        {activeTab === 'info' && <Info />}
      </main>

      {/* 成員管理側欄 */}
      {memberOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMemberOpen(false)} />
          <div className="relative w-[85%] max-w-xs bg-ac-bg h-full shadow-2xl border-l-8 border-ac-border p-8 space-y-8 animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-center"><h2 className="text-2xl font-black italic text-ac-brown">Trip Mates</h2><button onClick={() => setMemberOpen(false)} className="p-2 bg-white rounded-full shadow-zakka text-ac-border"><X size={20}/></button></div>
             
             <div className="space-y-4">
                {currentTrip.members.map(m => (
                  <div key={m.id} className="card-zakka bg-white flex items-center justify-between p-4 group">
                    <div className="flex items-center gap-3">
                      <img src={m.avatar} className="w-10 h-10 rounded-full border-2 border-ac-border shadow-sm" alt="m" />
                      <div className="text-left"><p className="font-black text-sm text-ac-brown">{m.name}</p><p className="text-[9px] font-bold text-ac-border uppercase">{m.email}</p></div>
                    </div>
                    <button onClick={() => setPinVerify({ id: m.id, pin: '', mode: 'delete' })} className="p-1.5 bg-ac-bg rounded-lg text-ac-orange opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                  </div>
                ))}
                <button onClick={() => alert("邀請功能開發中：發送手帳邀請連結！")} className="w-full p-4 border-4 border-dashed border-ac-border rounded-3xl text-ac-border font-black text-xs flex items-center justify-center gap-2 hover:text-ac-green hover:border-ac-green transition-all">+ 邀請旅伴</button>
             </div>

             {/* PIN 碼驗證彈窗 */}
             {pinVerify.id && (
               <div className="card-zakka bg-ac-orange text-white p-6 space-y-4 border-none shadow-2xl animate-in zoom-in-95">
                  <div className="flex items-center gap-2 text-xs font-black"><ShieldCheck size={16}/> 安全身份驗證</div>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">請輸入 4 位數 PIN 碼進行移除</p>
                  <input type="password" maxLength={4} inputMode="numeric" className="w-full p-4 bg-white/20 rounded-2xl text-center text-2xl outline-none font-black tracking-[0.5em]" value={pinVerify.pin} onChange={e => setPinVerify({...pinVerify, pin: e.target.value})} />
                  <div className="flex gap-2">
                    <button onClick={confirmDeleteMember} className="flex-1 bg-white text-ac-orange py-3 rounded-xl font-black text-sm active:scale-95 transition-transform">確認移除</button>
                    <button onClick={() => setPinVerify({id:'', pin:'', mode:''})} className="px-4 py-3 bg-white/10 rounded-xl font-black text-sm">取消</button>
                  </div>
                  <a href={`mailto:${currentTrip.members.find(m => m.id === pinVerify.id)?.email}?subject=【密碼找回】${currentTrip.dest} 旅遊手帳&body=你好！你目前在手帳「${currentTrip.dest}」中設定的 PIN 碼為：${currentTrip.members.find(m => m.id === pinVerify.id)?.pin}。請妥善保存唷！`} className="block text-[10px] text-center underline opacity-60 font-bold">忘記密碼？發送 Email 給自己</a>
               </div>
             )}
          </div>
        </div>
      )}

      {/* 底部導航 */}
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
