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
import { Plus, ChevronDown, Trash2, Calendar, CreditCard, Wallet, Utensils, ShoppingBag, Info as InfoIcon, Lock, User, Camera } from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { compressImage } from './utils/imageUtils';

const App: React.FC = () => {
  const { trips, currentTripId, switchTrip, deleteTrip, activeTab, setActiveTab, updateTripData } = useTripStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [lockedTripId, setLockedTripId] = useState<string | null>(null);
  const [verifyPin, setVerifyPin] = useState('');
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [memberOpen, setMemberOpen] = useState(false);
  const [showPersonalSetup, setShowPersonalSetup] = useState(false);

  useFirebaseSync();
  
  const currentTrip = trips.find(t => t.id === currentTripId) || trips[0];

  useEffect(() => {
    if (currentTrip && (!currentTrip.members || currentTrip.members.length === 0)) {
      setShowPersonalSetup(true);
    }
  }, [currentTrip]);

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
    } else { 
      alert("密碼錯誤！🔒"); 
      setVerifyPin(''); 
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans text-splat-dark relative bg-[#F4F5F7]">
      
      {/* 📍 UI 調整 1：只在「行程 (schedule)」頁面顯示包含地點、日期與頭像的 Header */}
      {activeTab === 'schedule' && (
        <header className="p-4 sticky top-0 z-[100] w-full max-w-md mx-auto animate-fade-in">
          <div className="bg-splat-yellow border-[3px] border-splat-dark rounded-[24px] shadow-splat-solid p-4 flex justify-between items-center relative z-20">
            <div className="relative text-left">
              <h2 className="text-[10px] font-black text-splat-dark uppercase tracking-widest mb-0.5 bg-white inline-block px-2 border-2 border-splat-dark rounded-full shadow-splat-solid-sm -rotate-2">
                {currentTrip.startDate} — {currentTrip.endDate}
              </h2>
              <div className="flex items-center gap-1 cursor-pointer group mt-1" onClick={() => setMenuOpen(!menuOpen)}>
                <h1 className="text-2xl font-black tracking-tight drop-shadow-md">{currentTrip.dest}</h1>
                <ChevronDown size={24} className={`stroke-[3px] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </div>
              {menuOpen && (
                <div className="absolute top-[120%] left-0 w-64 bg-white border-[3px] border-splat-dark rounded-[24px] shadow-splat-solid z-[110] p-3 animate-in fade-in slide-in-from-top-2">
                  {trips.map(t => (
                    <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl border-2 mb-2 ${t.id === currentTrip.id ? 'bg-splat-yellow border-splat-dark' : 'border-transparent hover:border-gray-200'}`}>
                      <button className="flex-1 text-left font-black text-sm" onClick={() => { if(t.id === currentTrip.id) return; setLockedTripId(t.id); setVerifyPin(''); }}>{t.dest}</button>
                      <button onClick={() => { if(confirm('移除行程？')) deleteTrip(t.id); }} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={18}/></button>
                    </div>
                  ))}
                  <button onClick={() => setShowOnboarding(true)} className="w-full mt-2 p-3 bg-splat-green text-white text-sm font-black rounded-xl border-2 border-splat-dark shadow-splat-solid-sm flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all"><Plus strokeWidth={3} size={16}/> 新增行程</button>
                </div>
              )}
            </div>
            <div className="w-14 h-14 rounded-full border-[3px] border-splat-dark shadow-splat-solid overflow-hidden bg-white shrink-0 cursor-pointer active:scale-90 transition-transform rotate-3" onClick={() => setMemberOpen(true)}>
               <img src={myProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Adventurer`} alt="avatar" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="flex overflow-x-auto gap-3 hide-scrollbar pt-4 pb-2 px-1">
            {dateRange.map((date, i) => (
              <button key={i} onClick={() => setSelectedDateIdx(i)} className={`flex flex-col items-center min-w-[70px] p-2.5 rounded-2xl border-[3px] transition-all font-black ${selectedDateIdx === i ? 'bg-splat-blue border-splat-dark text-white shadow-splat-solid -translate-y-1' : 'bg-white border-splat-dark text-gray-400 shadow-[2px_2px_0px_#1A1A1A]'}`}>
                <span className="text-[10px] uppercase">DAY {i+1}</span>
                <span className="text-lg mt-0.5">{format(date, 'M/d')}</span>
              </button>
            ))}
          </div>
        </header>
      )}

      {/* 如果不是行程頁面，增加頂部 padding 避免內容太貼邊 */}
      <main className={`flex-1 w-full max-w-md mx-auto overflow-x-hidden ${activeTab !== 'schedule' ? 'pt-6' : 'pt-2'}`}>
        <div className={activeTab === 'schedule' ? 'block' : 'hidden'}><Schedule externalDateIdx={selectedDateIdx} /></div>
        <div className={activeTab === 'booking' ? 'block' : 'hidden'}><Booking /></div>
        <div className={activeTab === 'expense' ? 'block' : 'hidden'}><Expense /></div>
        <div className={activeTab === 'food' ? 'block' : 'hidden'}><Journal /></div>
        <div className={activeTab === 'shop' ? 'block' : 'hidden'}><Shopping /></div>
        <div className={activeTab === 'info' ? 'block' : 'hidden'}><Info /></div>
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white border-[3px] border-splat-dark rounded-[32px] shadow-splat-solid px-2 py-3 flex justify-between items-center z-50">
        <NavIcon icon={<Calendar />} label="行程" id="schedule" active={activeTab} onClick={setActiveTab} color="text-splat-blue" />
        <NavIcon icon={<CreditCard />} label="預訂" id="booking" active={activeTab} onClick={setActiveTab} color="text-splat-pink" />
        <NavIcon icon={<Wallet />} label="記帳" id="expense" active={activeTab} onClick={setActiveTab} color="text-splat-yellow" />
        <NavIcon icon={<Utensils />} label="美食" id="food" active={activeTab} onClick={setActiveTab} color="text-splat-orange" />
        <NavIcon icon={<ShoppingBag />} label="購物" id="shop" active={activeTab} onClick={setActiveTab} color="text-splat-green" />
        <NavIcon icon={<InfoIcon />} label="資訊" id="info" active={activeTab} onClick={setActiveTab} color="text-splat-dark" />
      </nav>

      {/* 密碼驗證 Modal */}
      {lockedTripId && (
        <div className="fixed inset-0 bg-splat-dark/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white border-4 border-splat-dark w-full max-w-sm rounded-[32px] shadow-[8px_8px_0px_#FFC000] p-8 text-center space-y-4 animate-in zoom-in-95">
            <Lock size={48} className="mx-auto text-splat-dark mb-2" strokeWidth={2.5} />
            <h3 className="text-2xl font-black text-splat-dark uppercase">切換行程</h3>
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              placeholder="****"
              className="w-full bg-gray-100 text-splat-dark font-black p-4 rounded-xl text-center text-3xl tracking-[0.5em] outline-none border-4 border-splat-dark focus:bg-white transition-colors"
              value={verifyPin}
              onChange={(e) => setVerifyPin(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setLockedTripId(null); setVerifyPin(''); }} className="flex-1 py-3 border-4 border-splat-dark bg-gray-200 font-black rounded-xl active:translate-y-1 transition-all shadow-splat-solid-sm">取消</button>
              <button onClick={confirmTripSwitch} className="flex-[2] py-3 bg-splat-blue text-white border-4 border-splat-dark font-black rounded-xl shadow-splat-solid-sm active:translate-y-1 active:shadow-none transition-all">解鎖 ➔</button>
            </div>
          </div>
        </div>
      )}

      {/* 旅伴管理 Modal */}
      {memberOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMemberOpen(false)} />
          <div className="relative w-[85%] max-w-xs bg-splat-bg h-full shadow-2xl border-l-[6px] border-splat-dark p-8 animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-black italic text-splat-dark tracking-tighter">TRIP MATES</h2>
               <button onClick={() => setMemberOpen(false)}><X strokeWidth={3}/></button>
             </div>
             <div className="space-y-4">
                {(currentTrip.members || []).map(m => (
                  <div key={m.id} className="bg-white border-[3px] border-splat-dark rounded-2xl p-4 flex items-center gap-3 relative group">
                    <div className="relative">
                      <img src={m.avatar} className="w-12 h-12 rounded-full border-2 border-splat-dark object-cover" />
                      {m.id === myProfile?.id && (
                        <label className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border-2 border-splat-dark cursor-pointer">
                          <Camera size={10}/>
                          <input type="file" className="hidden" onChange={async e => {
                            if(e.target.files?.[0]) {
                              const b64 = await compressImage(e.target.files[0]);
                              const nm = currentTrip.members.map(x => x.id === m.id ? {...x, avatar: b64} : x);
                              updateTripData(currentTrip.id, { members: nm });
                            }
                          }}/>
                        </label>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm text-splat-dark">{m.name}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{m.email}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* 個人設定 Modal */}
      {showPersonalSetup && (
        <div className="fixed inset-0 z-[2000] bg-white flex items-center justify-center p-8">
           <div className="w-full max-w-sm space-y-8 text-center">
              <div className="w-20 h-20 bg-splat-yellow rounded-full flex items-center justify-center mx-auto border-[4px] border-splat-dark shadow-splat-solid animate-bounce"><User size={40} strokeWidth={3} className="text-splat-dark"/></div>
              <h2 className="text-3xl font-black italic">WHO ARE YOU?</h2>
              <div className="bg-white border-[4px] border-splat-dark rounded-[2.5rem] shadow-splat-solid p-8 space-y-6">
                 <div className="space-y-1 text-left"><label className="text-[10px] font-black opacity-30 uppercase tracking-widest pl-1">Nickname</label><input placeholder="您的暱稱" className="w-full p-4 bg-gray-50 rounded-xl border-[3px] border-splat-dark font-black outline-none focus:bg-white" id="setup-name" /></div>
                 <div className="space-y-1 text-left"><label className="text-[10px] font-black opacity-30 uppercase tracking-widest pl-1">Recovery Email</label><input type="email" placeholder="信箱" className="w-full p-4 bg-gray-50 rounded-xl border-[3px] border-splat-dark font-black outline-none focus:bg-white" id="setup-email" /></div>
                 <div className="space-y-1 text-left"><label className="text-[10px] font-black opacity-30 uppercase tracking-widest pl-1">Personal PIN</label><input type="password" maxLength={4} inputMode="numeric" placeholder="****" className="w-full p-4 bg-gray-50 rounded-xl border-[3px] border-splat-dark font-black outline-none text-2xl tracking-[0.5em] focus:bg-white" id="setup-pin" /></div>
                 <button onClick={() => {
                   const n = (document.getElementById('setup-name') as HTMLInputElement).value;
                   const e = (document.getElementById('setup-email') as HTMLInputElement).value;
                   const p = (document.getElementById('setup-pin') as HTMLInputElement).value;
                   if(!n || !e || p.length < 4) return alert("資訊要填完整唷！🦑");
                   updateTripData(currentTrip.id, { members: [{ id: 'm-'+Date.now(), name: n, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${n}`, email: e, pin: p }] });
                   setShowPersonalSetup(false);
                 }} className="btn-splat w-full py-5 text-xl bg-splat-blue text-white">READY GO! ➔</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const NavIcon = ({ icon, label, id, active, onClick, color }: any) => {
  const isActive = active === id;
  return (
    <button onClick={() => onClick(id)} className={`flex flex-col items-center gap-1 flex-1 transition-all duration-300 ${isActive ? `${color} scale-110 -translate-y-2` : 'text-gray-400 hover:text-gray-600'}`}>
      {React.cloneElement(icon, { size: 24, strokeWidth: isActive ? 3 : 2.5 })}
      <span className="text-[10px] font-black tracking-widest transition-opacity">{label}</span>
    </button>
  );
};

export default App;
