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
  Plus, ChevronDown, Trash2, Calendar, CreditCard, Wallet, Utensils, 
  ShoppingBag, Info as InfoIcon, X, Camera, Lock, User, Mail, ShieldCheck 
} from 'lucide-react';
import { compressImage } from './utils/imageUtils';

const App: React.FC = () => {
  const { trips, currentTripId, switchTrip, deleteTrip, activeTab, setActiveTab, updateTripData } = useTripStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [lockedTripId, setLockedTripId] = useState<string | null>(null);
  const [verifyPin, setVerifyPin] = useState('');
  const [showPersonalSetup, setShowPersonalSetup] = useState(false);

  useFirebaseSync();
  const currentTrip = trips.find(t => t.id === currentTripId);

  useEffect(() => {
    if (currentTrip && (!currentTrip.members || currentTrip.members.length === 0)) setShowPersonalSetup(true);
  }, [currentTrip]);

  if (trips.length === 0 || showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  if (!currentTrip) return null;

  const myProfile = currentTrip.members?.[0];

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
      <header className="p-6 pb-2 sticky top-0 bg-ac-bg/90 backdrop-blur-md z-[100] w-full max-w-md mx-auto">
        <div className="flex justify-between items-start">
          <div className="relative text-left">
            <h2 className="text-[10px] font-black text-ac-green uppercase tracking-[0.2em] mb-1">{currentTrip.startDate} — {currentTrip.endDate}</h2>
            <div className="flex items-center gap-1 cursor-pointer group" onClick={() => setMenuOpen(!menuOpen)}><h1 className="text-2xl font-black tracking-tight">{currentTrip.dest}</h1><ChevronDown size={20} className={menuOpen ? 'rotate-180' : ''} /></div>
            {menuOpen && (
              <div className="absolute top-14 left-0 w-64 bg-white border-4 border-ac-border rounded-[32px] shadow-zakka z-[110] p-2 animate-in fade-in slide-in-from-top-2">
                {trips.map(t => (
                  <div key={t.id} className={`flex items-center justify-between p-4 rounded-2xl ${t.id === currentTripId ? 'bg-ac-bg' : ''}`}>
                    <button className="flex-1 text-left font-bold text-sm" onClick={() => { if(t.id === currentTripId) return; setLockedTripId(t.id); setVerifyPin(''); }}>{t.dest}</button>
                    <button onClick={() => { if(confirm('移除行程？')) deleteTrip(t.id); }} className="text-ac-orange/40"><Trash2 size={16}/></button>
                  </div>
                ))}
                <button onClick={() => setShowOnboarding(true)} className="w-full mt-2 p-4 bg-ac-green text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 active:scale-95"><Plus size={14}/> 新增行程</button>
              </div>
            )}
          </div>
          <div onClick={() => setMemberOpen(true)} className="w-12 h-12 rounded-full border-4 border-white shadow-zakka overflow-hidden bg-white shrink-0 cursor-pointer active:scale-90 transition-transform"><img src={myProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Adventurer`} alt="avatar" /></div>
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

      {/* Security Logic */}
      {lockedTripId && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in"><div className="bg-white p-8 rounded-[40px] shadow-zakka border-4 border-ac-border w-full max-w-xs space-y-6 text-center">
          <Lock className="mx-auto text-ac-orange" size={32}/><h3 className="font-black text-xl italic text-ac-brown">行程驗證</h3>
          <input type="password" maxLength={4} inputMode="numeric" autoFocus className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl text-center text-3xl font-black tracking-[0.5em] outline-none" value={verifyPin} onChange={e => setVerifyPin(e.target.value)} />
          <div className="flex gap-2"><button onClick={confirmTripSwitch} className="flex-1 bg-ac-green text-white py-4 rounded-2xl font-black shadow-zakka">進入</button><button onClick={() => setLockedTripId(null)} className="px-6 py-4 border-2 border-ac-border rounded-2xl font-black">取消</button></div>
        </div></div>
      )}

      {/* Member Sidebar */}
      {memberOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMemberOpen(false)} />
          <div className="relative w-[85%] max-w-xs bg-ac-bg h-full shadow-2xl border-l-8 border-ac-border p-8 animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black italic text-ac-brown tracking-tighter">Trip Mates</h2><button onClick={() => setMemberOpen(false)}><X/></button></div>
             <div className="space-y-4">
                {(currentTrip.members || []).map(m => (
                  <div key={m.id} className="card-zakka bg-white flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={m.avatar} className="w-12 h-12 rounded-full border-2 border-ac-border object-cover" />
                        {m.id === myProfile?.id && (
                          <label className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-ac-border cursor-pointer active:scale-90 transition-transform"><Camera size={10}/><input type="file" className="hidden" onChange={async e => {
                            if(e.target.files?.[0]) {
                              const b64 = await compressImage(e.target.files[0]);
                              const nm = currentTrip.members.map(x => x.id === m.id ? {...x, avatar: b64} : x);
                              updateTripData(currentTrip.id, { members: nm });
                            }
                          }}/></label>
                        )}
                      </div>
                      <div className="text-left"><p className="font-black text-sm text-ac-brown">{m.name}</p><p className="text-[9px] font-bold text-ac-border uppercase">{m.email}</p></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Personal Setup */}
      {showPersonalSetup && (
        <div className="fixed inset-0 z-[2000] bg-white flex items-center justify-center p-8 animate-in fade-in"><div className="w-full max-w-sm space-y-8 text-center">
          <div className="w-20 h-20 bg-ac-bg rounded-full flex items-center justify-center mx-auto border-4 border-ac-border shadow-zakka animate-bounce"><User size={40} className="text-ac-green"/></div><h2 className="text-3xl font-black italic text-ac-brown tracking-tighter">初次設定！</h2>
          <div className="card-zakka space-y-4 p-8 text-left">
            <div className="space-y-1"><label className="text-[9px] font-black opacity-30 uppercase tracking-widest pl-1">稱呼</label><input placeholder="您的暱稱" className="w-full p-4 bg-ac-bg rounded-2xl border-2 border-ac-border font-black outline-none focus:border-ac-green" id="setup-name" /></div>
            <div className="space-y-1"><label className="text-[9px] font-black opacity-30 uppercase tracking-widest pl-1">Email</label><input type="email" placeholder="備援 Email" className="w-full p-4 bg-ac-bg rounded-2xl border-2 border-ac-border font-black outline-none focus:border-ac-green" id="setup-email" /></div>
            <div className="space-y-1"><label className="text-[9px] font-black opacity-30 uppercase tracking-widest pl-1">管理 PIN</label><input type="password" maxLength={4} inputMode="numeric" placeholder="****" className="w-full p-4 bg-ac-bg rounded-2xl border-2 border-ac-border font-black outline-none text-2xl tracking-[0.5em] focus:border-ac-green" id="setup-pin" /></div>
            <button onClick={() => {
              const n = (document.getElementById('setup-name') as HTMLInputElement).value;
              const e = (document.getElementById('setup-email') as HTMLInputElement).value;
              const p = (document.getElementById('setup-pin') as HTMLInputElement).value;
              if(!n || !e || p.length < 4) return alert("資訊要完整唷！📓");
              updateTripData(currentTrip.id, { members: [{ id: 'm-'+Date.now(), name: n, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${n}`, email: e, pin: p }] });
              setShowPersonalSetup(false);
            }} className="btn-zakka w-full py-5 text-xl mt-4">開啟手帳之旅 ➔</button>
          </div>
        </div></div>
      )}

      {/* Nav */}
      <div className="fixed bottom-6 left-0 right-0 z-50 px-4"><nav className="w-full max-w-md mx-auto bg-white border-4 border-ac-border rounded-full shadow-zakka px-4 py-3 flex justify-between items-center">
          <NavIcon icon={<Calendar />} label="行程" id="schedule" active={activeTab} onClick={setActiveTab} />
          <NavIcon icon={<CreditCard />} label="預訂" id="booking" active={activeTab} onClick={setActiveTab} />
          <NavIcon icon={<Wallet />} label="記帳" id="expense" active={activeTab} onClick={setActiveTab} />
          <NavIcon icon={<Utensils />} label="美食" id="food" active={activeTab} onClick={setActiveTab} />
          <NavIcon icon={<ShoppingBag />} label="購物" id="shop" active={activeTab} onClick={setActiveTab} />
          <NavIcon icon={<InfoIcon />} label="資訊" id="info" active={activeTab} onClick={setActiveTab} />
      </nav></div>
    </div>
  );
};

const NavIcon = ({ icon, label, id, active, onClick }: any) => {
  const isActive = active === id;
  return (
    <button onClick={() => onClick(id)} className={`flex flex-col items-center gap-1 flex-1 transition-all duration-300 ${isActive ? 'text-ac-green scale-110 -translate-y-1' : 'text-ac-border hover:text-ac-green/50'}`}>
      {React.cloneElement(icon, { size: 18, strokeWidth: isActive ? 3 : 2 })}
      <span className="text-[8px] font-black tracking-tighter">{label}</span>
      {isActive && <div className="w-1 h-1 bg-ac-green rounded-full mt-0.5" />}
    </button>
  );
};

export default App;

