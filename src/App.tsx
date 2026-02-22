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
  Camera, X, Edit3, RefreshCcw, Settings as SettingsIcon,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { compressImage, uploadImage } from './utils/imageUtils';
import { auth } from './services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingToggle, InkSplat } from './components/Common';
import { MemberManagement, ProfileEditor, PersonalSetup } from './components/MemberModals';
import { Member } from './types';
import { OfflineStatus } from './components/OfflineStatus';
import { triggerHaptic } from './utils/haptics';
import { useHapticShake } from './hooks/useHapticShake';

// --- 常數設定 ---
const PRESET_AVATARS = [
  `https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi`,
  `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`,
  `https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka`,
  `https://api.dicebear.com/7.x/avataaars/svg?seed=Max`,
];

const SPLAT_COLORS = ['#FFC000', '#2932CF', '#F03C69', '#21CC65', '#FF6C00'];

const NavIcon = ({ icon, label, id, active, onClick, color }: any) => {
  const isActive = active === id;
  return (
    <motion.button
      whileTap={{ scale: 0.8, y: 5 }}
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


// ==========================================
// 🚀 唯一的主要 App 元件 (完美合併版)
// ==========================================
const App: React.FC = () => {
  const { trips, currentTripId, switchTrip, activeTab, setActiveTab, updateTripData } = useTripStore();

  // 狀態管理
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [lockedTripId, setLockedTripId] = useState<string | null>(null);
  const [verifyPin, setVerifyPin] = useState('');
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);

  const [memberOpen, setMemberOpen] = useState(false);
  const [showPersonalSetup, setShowPersonalSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // 控制設定 Modal

  const [editingProfile, setEditingProfile] = useState(false);

  // 動畫與 UI 設定狀態
  const [isSplatting, setIsSplatting] = useState(false);
  const [splatColor, setSplatColor] = useState('#FFC000');

  // 使用本地 state 管理 UI 設定，避免 useTripStore 尚未定義報錯
  const [uiSettings, setUISettings] = useState({ showSplash: true, enableHaptics: true, showBudgetAlert: false });
  useHapticShake();

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

    if (uiSettings.showSplash) {
      setSplatColor(SPLAT_COLORS[Math.floor(Math.random() * SPLAT_COLORS.length)]);
      setIsSplatting(true);
      setTimeout(() => setIsSplatting(false), 600);
    }

    setActiveTab(tabId);

    if (uiSettings.enableHaptics) {
      triggerHaptic('light');
    }
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
                <div className="ml-2">
                  <OfflineStatus />
                </div>
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
                          <button className="flex-1 text-left font-black text-sm truncate pr-2" onClick={() => { if (t.id === currentTrip.id) return; setLockedTripId(t.id); setVerifyPin(''); }}>{t.tripName || t.dest}</button>
                          <button onClick={() => {
                            if (isCreator) {
                              if (confirm('⚠️ 確定要永久刪除此行程嗎？(所有旅伴都會遺失資料)')) useTripStore.getState().deleteTrip(t.id);
                            } else {
                              if (confirm('要退出此行程嗎？(僅從您的設備移除，其他人仍可查看)')) useTripStore.getState().removeTripLocal(t.id);
                            }
                          }} className="text-red-500 hover:scale-110 transition-transform shrink-0">
                            <Trash2 size={16} />
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
                      <Plus strokeWidth={3} size={16} /> 建立新行程
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
                <span className="text-[10px] uppercase">DAY {i + 1}</span>
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

      {/* 底部導覽列 */}
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

      {/* 📍 側邊欄：旅伴列表與設定圖示 */}
      {memberOpen && (
        <MemberManagement
          trip={currentTrip}
          myProfile={myProfile}
          onClose={() => setMemberOpen(false)}
          onEditProfile={() => setEditingProfile(true)}
          onShowSettings={() => setShowSettings(true)}
        />
      )}

      {/* 📍 UI 設定視窗 Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="absolute inset-0 bg-splat-dark/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-splat-solid p-8 relative z-10">
              <h2 className="text-2xl font-black italic uppercase mb-8 flex items-center gap-2">
                <SettingsIcon /> UI SETTINGS
              </h2>

              <div className="space-y-6">
                <SettingToggle
                  label="潑墨轉場特效"
                  desc="切換分頁時的噴漆動畫"
                  enabled={uiSettings.showSplash}
                  onChange={(v: boolean) => setUISettings(prev => ({ ...prev, showSplash: v }))}
                />

                <SettingToggle
                  label="觸覺回饋 (Haptic)"
                  desc="按鈕點擊時的輕微震動"
                  enabled={uiSettings.enableHaptics}
                  onChange={(v: boolean) => setUISettings(prev => ({ ...prev, enableHaptics: v }))}
                />

                <SettingToggle
                  label="智慧預算警報"
                  desc="支出超過預算 80% 時顯示提示"
                  enabled={uiSettings.showBudgetAlert}
                  onChange={(v: boolean) => setUISettings(prev => ({ ...prev, showBudgetAlert: v }))}
                />
              </div>

              <button onClick={() => setShowSettings(false)} className="btn-splat w-full py-4 mt-10 bg-splat-dark text-white uppercase">Confirm ➔</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 個人資料編輯視窗 */}
      {editingProfile && myProfile && (
        <ProfileEditor
          myProfile={myProfile}
          onClose={() => setEditingProfile(false)}
          onSave={(updated: Member) => {
            const nm = currentTrip.members.map(x => x.id === myProfile.id ? updated : x);
            updateTripData(currentTrip.id, { members: nm });
            setEditingProfile(false);
          }}
        />
      )}

      {/* 初次加入的設定畫面 */}
      {showPersonalSetup && (
        <PersonalSetup
          onComplete={(data) => {
            updateTripData(currentTrip.id, { members: [{ ...data, id: 'm-' + Date.now(), avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`, mood: '準備出發！✈️' }] });
            setShowPersonalSetup(false);
          }}
        />
      )}
    </div>
  );
};

export default App;



