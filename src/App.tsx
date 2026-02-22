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
  Plus, ChevronDown, Trash2, Calendar, CreditCard, Wallet, 
  Utensils, ShoppingBag, Info as InfoIcon, Lock, User, 
  Camera, X, Edit3, RefreshCcw 
} from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { compressImage, uploadImage } from './utils/imageUtils';
import { auth } from './services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, ToggleLeft, ToggleRight, Vibration } from 'lucide-react';

const App: React.FC = () => {
  // ... 引入 uiSettings
  const { uiSettings, setUISettings } = useTripStore();
  const [showSettings, setShowSettings] = useState(false);

  // 修改 handleTabChange 邏輯
  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    
    // 只有在設定開啟時才噴墨
    if (uiSettings.showSplash) {
      setSplatColor(SPLAT_COLORS[Math.floor(Math.random() * SPLAT_COLORS.length)]);
      setIsSplatting(true);
      setTimeout(() => setIsSplatting(false), 600);
    }
    
    setActiveTab(tabId);
    
    // 只有在設定開啟時才震動
    if (uiSettings.enableHaptics && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="...">
      {/* ... 噴墨組件 ... */}

      {/* 📍 修改後的側邊欄：新增齒輪圖示 (IMG_6138 紅色位置) */}
      {memberOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMemberOpen(false)} />
          <div className="relative w-[85%] max-w-xs bg-splat-bg h-full border-l-[6px] border-splat-dark p-8 animate-in slide-in-from-right">
             
             {/* 設定齒輪按鈕 */}
             <button 
               onClick={() => setShowSettings(true)}
               className="absolute top-20 right-8 p-3 bg-white border-[3px] border-splat-dark rounded-xl shadow-splat-solid-sm active:translate-y-0.5 transition-all text-splat-dark z-50"
             >
               <SettingsIcon size={24} strokeWidth={3} className="animate-spin-slow" />
             </button>

             {/* ... 原本的旅伴列表內容 ... */}
          </div>
        </div>
      )}

      {/* 📍 UI 設定視窗 */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowSettings(false)} className="absolute inset-0 bg-splat-dark/80 backdrop-blur-sm" />
            <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} exit={{scale:0.9, y:20}} className="bg-white w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-splat-solid p-8 relative z-10">
              <h2 className="text-2xl font-black italic uppercase mb-8 flex items-center gap-2">
                <SettingsIcon /> UI SETTINGS
              </h2>
              
              <div className="space-y-6">
                {/* 潑墨特效開關 */}
                <SettingToggle 
                  label="潑墨轉場特效" 
                  desc="切換分頁時的噴漆動畫" 
                  enabled={uiSettings.showSplash} 
                  onChange={(v) => setUISettings({ showSplash: v })} 
                />
                
                {/* 觸覺回饋開關 */}
                <SettingToggle 
                  label="觸覺回饋 (Haptic)" 
                  desc="按鈕點擊時的輕微震動" 
                  enabled={uiSettings.enableHaptics} 
                  onChange={(v) => setUISettings({ enableHaptics: v })} 
                />

                {/* 預算警報開關 (額外推薦) */}
                <SettingToggle 
                  label="智慧預算警報" 
                  desc="支出超過預算 80% 時顯示提示" 
                  enabled={uiSettings.showBudgetAlert} 
                  onChange={(v) => setUISettings({ showBudgetAlert: v })} 
                />
              </div>

              <button onClick={()=>setShowSettings(false)} className="btn-splat w-full py-4 mt-10 bg-splat-dark text-white uppercase">Confirm ➔</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 設定開關小組件
const SettingToggle = ({ label, desc, enabled, onChange }: any) => (
  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border-2 border-gray-100">
    <div className="text-left">
      <p className="font-black text-sm text-splat-dark">{label}</p>
      <p className="text-[10px] font-bold text-gray-400">{desc}</p>
    </div>
    <button onClick={() => onChange(!enabled)} className={`transition-colors ${enabled ? 'text-splat-green' : 'text-gray-300'}`}>
      {enabled ? <ToggleRight size={40} strokeWidth={2.5}/> : <ToggleLeft size={40} strokeWidth={2.5}/>}
    </button>
  </div>
);

// 預設提供選擇的 AI 大頭貼
const PRESET_AVATARS = [
  `https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi`,
  `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`,
  `https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka`,
  `https://api.dicebear.com/7.x/avataaars/svg?seed=Max`,
];

const SPLAT_COLORS = ['#FFC000', '#2932CF', '#F03C69', '#21CC65', '#FF6C00'];

// --- 墨水噴濺特效組件 ---
const InkSplat = ({ color }: { color: string }) => (
  <motion.div
    initial={{ scale: 0, opacity: 1 }}
    animate={{ scale: 4.5, opacity: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="fixed pointer-events-none z-[9999]"
    style={{
      top: '50%',
      left: '50%',
      width: '150px',
      height: '150px',
      backgroundColor: color,
      marginLeft: '-75px',
      marginTop: '-75px',
      borderRadius: '43% 57% 38% 62% / 57% 43% 57% 43%', // 不規則墨水形狀
      filter: 'blur(2px)'
    }}
  />
);

const App: React.FC = () => {
  const { trips, currentTripId, switchTrip, activeTab, setActiveTab, updateTripData } = useTripStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [lockedTripId, setLockedTripId] = useState<string | null>(null);
  const [verifyPin, setVerifyPin] = useState('');
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  
  // 會員區塊狀態
  const [memberOpen, setMemberOpen] = useState(false);
  const [showPersonalSetup, setShowPersonalSetup] = useState(false);
  
  // 個人資料編輯狀態
  const [showEditIcon, setShowEditIcon] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', mood: '', avatar: '' });

  // 轉場特效狀態
  const [isSplatting, setIsSplatting] = useState(false);
  const [splatColor, setSplatColor] = useState('#FFC000');

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

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    // 觸發噴墨
    setSplatColor(SPLAT_COLORS[Math.floor(Math.random() * SPLAT_COLORS.length)]);
    setIsSplatting(true);
    setTimeout(() => setIsSplatting(false), 600);
    setActiveTab(tabId);
    // 觸發震動 (僅 Android 支援，iOS 模擬手感靠 Motion)
    if (navigator.vibrate) navigator.vibrate(10);
  };

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
    <div className="flex flex-col min-h-screen font-sans text-splat-dark relative bg-[#F4F5F7] bg-[radial-gradient(#D1D5DB_2px,transparent_2px)] bg-[size:24px_24px]">
      
      {/* 轉場噴墨動畫 */}
      <AnimatePresence>
        {isSplatting && <InkSplat color={splatColor} />}
      </AnimatePresence>

      {activeTab === 'schedule' && (
        <header className="p-4 sticky top-0 z-[100] w-full max-w-md mx-auto animate-fade-in bg-[#F4F5F7]/95 backdrop-blur-sm border-b-[3px] border-splat-dark shadow-sm">
          <div className="bg-splat-yellow border-[3px] border-splat-dark rounded-[24px] shadow-splat-solid p-4 flex justify-between items-center relative z-20">
            <div className="relative text-left min-w-0">
              <h2 className="text-[10px] font-black text-splat-dark uppercase tracking-widest mb-0.5 bg-white inline-block px-2 border-2 border-splat-dark rounded-full shadow-splat-solid-sm -rotate-2">
                {currentTrip.startDate} — {currentTrip.endDate}
              </h2>
              <div className="flex items-center gap-1 cursor-pointer group mt-1" onClick={() => setMenuOpen(!menuOpen)}>
                <h1 className="text-2xl font-black tracking-tight drop-shadow-md truncate max-w-[200px]">
                  {currentTrip.tripName || currentTrip.dest}
                </h1>
                <ChevronDown size={24} className={`stroke-[3px] transition-transform shrink-0 ${menuOpen ? 'rotate-180' : ''}`} />
              </div>
              
              {/* 下拉選單加入動畫 */}
              {menuOpen && (
                <motion.div 
                  initial={{ y: -20, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute top-[120%] left-0 w-64 bg-white border-[3px] border-splat-dark rounded-[24px] shadow-splat-solid z-[110] overflow-hidden"
                >
                  <div className="p-3 max-h-48 overflow-y-auto hide-scrollbar">
                    {trips.map(t => {
                      const isCreator = t.creatorId === (auth.currentUser?.uid || 'unknown');
                      return (
                        <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl border-2 mb-2 ${t.id === currentTrip.id ? 'bg-splat-yellow border-splat-dark' : 'border-transparent hover:border-gray-200'}`}>
                          <button className="flex-1 text-left font-black text-sm truncate pr-2" onClick={() => { if(t.id === currentTrip.id) return; setLockedTripId(t.id); setVerifyPin(''); }}>{t.tripName || t.dest}</button>
                          <button onClick={() => { 
                            if (isCreator) {
                              if(confirm('⚠️ 確定要永久刪除此行程嗎？(所有旅伴都會遺失資料)')) useTripStore.getState().deleteTrip(t.id);
                            } else {
                              if(confirm('要退出此行程嗎？(僅從您的設備移除，其他人仍可查看)')) useTripStore.getState().removeTripLocal(t.id);
                            }
                          }} className="text-red-500 hover:scale-110 transition-transform shrink-0">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="p-3 border-t-[3px] border-splat-dark bg-gray-50 space-y-2">
                    <button 
                      onClick={async () => {
                        const shareId = prompt("請輸入旅伴提供的行程代碼 (ID):");
                        if (!shareId) return;
                        if (trips.find(t => t.id === shareId)) return alert("您已經在這個行程裡囉！");
                        
                        const { doc, getDoc } = await import('firebase/firestore');
                        const { db } = await import('./services/firebase');
                        const docSnap = await getDoc(doc(db, "trips", shareId));
                        
                        if (docSnap.exists()) {
                          const tripData = docSnap.data() as import('./types').Trip;
                          const pin = prompt(`找到「${tripData.dest}」！請輸入密碼加入：`);
                          if (pin === tripData.tripPin) {
                            useTripStore.getState().addTripLocal(tripData);
                            alert("成功加入行程！🎉 (已自動儲存於本機)");
                            setMenuOpen(false);
                          } else { alert("密碼錯誤！🔒"); }
                        } else { alert("找不到這個行程代碼喔 🥲"); }
                      }} 
                      className="w-full p-3 bg-white text-splat-blue text-sm font-black rounded-xl border-2 border-splat-dark shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      🤝 加入好友行程
                    </button>
                    <button onClick={() => { setMenuOpen(false); setShowOnboarding(true); }} className="w-full p-3 bg-splat-green text-white text-sm font-black rounded-xl border-2 border-splat-dark shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center gap-2 active:translate-y-0.5 active:shadow-none transition-all">
                      <Plus strokeWidth={3} size={16}/> 建立新行程
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
            
            <motion.div 
              whileTap={{ scale: 0.9, rotate: 10 }}
              className="w-14 h-14 rounded-full border-[3px] border-splat-dark shadow-splat-solid overflow-hidden bg-white shrink-0 cursor-pointer rotate-3" 
              onClick={() => setMemberOpen(true)}
            >
               <img src={myProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Adventurer`} alt="avatar" className="w-full h-full object-cover" />
            </motion.div>
          </div>

          <div className="flex overflow-x-auto gap-3 hide-scrollbar pt-4 px-1 date-btn-container">
            {dateRange.map((date, i) => (
              <button key={i} onClick={() => setSelectedDateIdx(i)} className={`flex flex-col items-center min-w-[70px] p-2.5 rounded-2xl border-[3px] transition-all font-black ${selectedDateIdx === i ? 'bg-splat-blue border-splat-dark text-white shadow-splat-solid -translate-y-1' : 'bg-white border-splat-dark text-gray-400 shadow-[2px_2px_0px_#1A1A1A]'}`}>
                <span className="text-[10px] uppercase">DAY {i+1}</span>
                <span className="text-lg mt-0.5">{format(date, 'M/d')}</span>
              </button>
            ))}
          </div>
        </header>
      )}

      {/* 主內容區塊加入左右滑動轉場 */}
      <main className={`flex-1 w-full max-w-md mx-auto overflow-x-hidden ${activeTab !== 'schedule' ? 'pt-6' : 'pt-2'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className={activeTab === 'schedule' ? 'block' : 'hidden'}><Schedule externalDateIdx={selectedDateIdx} /></div>
            <div className={activeTab === 'booking' ? 'block' : 'hidden'}><Booking /></div>
            <div className={activeTab === 'expense' ? 'block' : 'hidden'}><Expense /></div>
            <div className={activeTab === 'food' ? 'block' : 'hidden'}><Journal /></div>
            <div className={activeTab === 'shop' ? 'block' : 'hidden'}><Shopping /></div>
            <div className={activeTab === 'info' ? 'block' : 'hidden'}><Info /></div>
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white border-[3px] border-splat-dark rounded-[32px] shadow-splat-solid px-2 py-3 flex justify-between items-center z-50">
        <NavIcon icon={<Calendar />} label="行程" id="schedule" active={activeTab} onClick={handleTabChange} color="text-splat-blue" />
        <NavIcon icon={<CreditCard />} label="預訂" id="booking" active={activeTab} onClick={handleTabChange} color="text-splat-pink" />
        <NavIcon icon={<Wallet />} label="記帳" id="expense" active={activeTab} onClick={handleTabChange} color="text-splat-yellow" />
        <NavIcon icon={<Utensils />} label="美食" id="food" active={activeTab} onClick={handleTabChange} color="text-splat-orange" />
        <NavIcon icon={<ShoppingBag />} label="購物" id="shop" active={activeTab} onClick={handleTabChange} color="text-splat-green" />
        <NavIcon icon={<InfoIcon />} label="資訊" id="info" active={activeTab} onClick={handleTabChange} color="text-splat-dark" />
      </nav>

      {/* 切換行程密碼鎖定畫面 */}
      {lockedTripId && (
        <div className="fixed inset-0 bg-splat-dark/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white border-4 border-splat-dark w-full max-w-sm rounded-[32px] shadow-[8px_8px_0px_#FFC000] p-8 text-center space-y-4 animate-in zoom-in-95">
            <Lock size={48} className="mx-auto text-splat-dark mb-2" strokeWidth={2.5} />
            <h3 className="text-2xl font-black text-splat-dark uppercase">切換行程</h3>
            <input type="password" maxLength={4} inputMode="numeric" placeholder="****" className="w-full bg-gray-100 text-splat-dark font-black p-4 rounded-xl text-center text-3xl tracking-[0.5em] outline-none border-4 border-splat-dark focus:bg-white transition-colors" value={verifyPin} onChange={(e) => setVerifyPin(e.target.value)} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setLockedTripId(null); setVerifyPin(''); }} className="flex-1 py-3 border-4 border-splat-dark bg-gray-200 font-black rounded-xl active:translate-y-1 transition-all shadow-splat-solid-sm">取消</button>
              <button onClick={confirmTripSwitch} className="flex-[2] py-3 bg-splat-blue text-white border-4 border-splat-dark font-black rounded-xl shadow-splat-solid-sm active:translate-y-1 active:shadow-none transition-all">解鎖 ➔</button>
            </div>
          </div>
        </div>
      )}

      {/* 📍 側邊欄：旅伴列表與 ID/PIN */}
      {memberOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMemberOpen(false)} />
          <div className="relative w-[85%] max-w-xs bg-splat-bg h-full shadow-2xl border-l-[6px] border-splat-dark p-8 animate-in slide-in-from-right duration-300 overflow-y-auto">
             
             <div className="flex justify-between items-start mb-8">
               <div className="flex-1 pr-4">
                 <div className="flex items-center gap-2 mb-2">
                   <h2 className="text-2xl font-black italic text-splat-dark tracking-tighter leading-tight uppercase break-words">
                     TRIP MATES
                   </h2>
                   <div className="flex items-center gap-1 px-2 py-0.5 bg-splat-green/10 border border-splat-green/30 rounded-full">
                     <RefreshCcw size={10} className="text-splat-green animate-spin-slow" />
                     <span className="text-[8px] font-black text-splat-green uppercase">Live</span>
                   </div>
                 </div>
                 
                 <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] font-black bg-white border-2 border-splat-dark px-1.5 py-0.5 rounded shadow-sm text-splat-dark select-all">ID: {currentTrip.id}</span>
                    <span className="text-[9px] font-black bg-white border-2 border-splat-dark px-1.5 py-0.5 rounded shadow-sm text-splat-dark select-all">PIN: {currentTrip.tripPin}</span>
                 </div>
               </div>
               <button onClick={() => setMemberOpen(false)} className="p-1 -mt-2 -mr-2"><X strokeWidth={3}/></button>
             </div>
             
             <div className="space-y-4">
                {(currentTrip.members || []).map(m => (
                  <div key={m.id} 
                       onClick={() => { if(m.id === myProfile?.id) setShowEditIcon(prev => prev === m.id ? null : m.id); }}
                       className={`bg-white border-[3px] border-splat-dark rounded-2xl p-4 flex items-center gap-3 relative transition-all ${m.id === myProfile?.id ? 'cursor-pointer active:scale-[0.98] shadow-sm hover:border-splat-blue' : ''}`}
                  >
                    <div className="relative shrink-0">
                      <img src={m.avatar} className="w-12 h-12 rounded-full border-2 border-splat-dark object-cover bg-gray-50" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-black text-sm text-splat-dark truncate">{m.name}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate">{m.mood || m.email}</p>
                    </div>
                    
                    {m.id === myProfile?.id && showEditIcon === m.id && (
                       <button onClick={(e) => { 
                         e.stopPropagation(); 
                         setEditForm({name: m.name, mood: m.mood || '', avatar: m.avatar}); 
                         setEditingProfile(true); 
                         setShowEditIcon(null); 
                       }} className="p-2 bg-splat-yellow border-2 border-splat-dark rounded-xl text-splat-dark shadow-sm animate-in zoom-in-95 shrink-0">
                         <Edit3 size={16} strokeWidth={3}/>
                       </button>
                    )}
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
      
      {/* 個人資料編輯視窗 */}
      {editingProfile && myProfile && (
        <div className="fixed inset-0 z-[2000] bg-splat-dark/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="w-full max-w-sm space-y-6 text-center bg-[#F4F5F7] border-[4px] border-splat-dark rounded-[2.5rem] shadow-[8px_8px_0px_#1A1A1A] p-8 relative animate-in zoom-in-95">
              <button onClick={() => setEditingProfile(false)} className="absolute top-5 right-5 bg-white p-2 rounded-full border-2 border-splat-dark active:scale-95 shadow-sm"><X size={16} strokeWidth={3}/></button>
              
              <h2 className="text-2xl font-black italic uppercase text-splat-dark">EDIT PROFILE</h2>
              
              <div className="space-y-6">
                 <div className="space-y-3">
                   <div className="relative inline-block">
                     <img src={editForm.avatar} className="w-20 h-20 rounded-full border-[3px] border-splat-dark object-cover bg-white mx-auto" />
                     <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full border-2 border-splat-dark shadow-sm cursor-pointer active:scale-95">
                       <Camera size={14}/>
                       <input type="file" className="hidden" onChange={async e => {
                          if(e.target.files?.[0]) {
                            const url = await uploadImage(e.target.files[0]);
                            setEditForm({...editForm, avatar: url});
                          }
                       }}/>
                     </label>
                   </div>
                   <div className="flex justify-center gap-2 mt-2">
                      {PRESET_AVATARS.map((url, idx) => (
                          <img key={idx} src={url} onClick={() => setEditForm({...editForm, avatar: url})} className={`w-10 h-10 rounded-full border-[3px] bg-white cursor-pointer transition-all ${editForm.avatar === url ? 'border-splat-blue scale-110' : 'border-splat-dark opacity-50 hover:opacity-100'}`} />
                      ))}
                   </div>
                 </div>

                 <div className="space-y-1 text-left">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Nickname 暱稱</label>
                   <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-4 bg-white rounded-xl border-[3px] border-splat-dark font-black text-splat-dark outline-none focus:border-splat-blue transition-colors" />
                 </div>

                 <div className="space-y-1 text-left">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Mood / Message 心情留言</label>
                   <input placeholder="寫點什麼心情呢？" value={editForm.mood} onChange={e => setEditForm({...editForm, mood: e.target.value})} className="w-full p-4 bg-white rounded-xl border-[3px] border-splat-dark font-black text-splat-dark outline-none focus:border-splat-blue transition-colors" />
                 </div>

                 <button onClick={() => {
                   if (!editForm.name) return alert("名字不能空白喔！");
                   const nm = currentTrip.members.map(x => x.id === myProfile.id ? {...x, name: editForm.name, avatar: editForm.avatar, mood: editForm.mood} : x);
                   updateTripData(currentTrip.id, { members: nm });
                   setEditingProfile(false);
                 }} className="btn-splat w-full py-4 text-lg bg-splat-green text-white">SAVE ➔</button>
              </div>
           </div>
        </div>
      )}

      {/* 初次加入的設定畫面 */}
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
                   updateTripData(currentTrip.id, { members: [{ id: 'm-'+Date.now(), name: n, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${n}`, email: e, pin: p, mood: '準備出發！✈️' }] });
                   setShowPersonalSetup(false);
                 }} className="btn-splat w-full py-5 text-xl bg-splat-blue text-white">READY GO! ➔</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// --- 優化後的 NavIcon (iOS 級物理回饋) ---
const NavIcon = ({ icon, label, id, active, onClick, color }: any) => {
  const isActive = active === id;
  return (
    <motion.button 
      whileTap={{ scale: 0.8, y: 5 }} // iOS 按壓感：縮小並稍微下沉
      onClick={() => onClick(id)} 
      className={`flex flex-col items-center gap-1 flex-1 transition-colors duration-300 ${isActive ? `${color} scale-110` : 'text-gray-400'}`}
    >
      <div className="relative">
        {isActive && (
          <motion.div 
            layoutId="nav-pill" 
            className="absolute -inset-2 bg-gray-100 rounded-full -z-10"
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
          />
        )}
        {React.cloneElement(icon, { size: 24, strokeWidth: isActive ? 3 : 2.5 })}
      </div>
      <span className="text-[10px] font-black tracking-widest">{label}</span>
    </motion.button>
  );
};

export default App;


