import { FC, useState, useEffect, Suspense, useMemo, lazy, cloneElement, memo } from 'react';
import { useTripStore } from './store/useTripStore';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { usePushNotifications } from './hooks/usePushNotifications';
import { Onboarding } from './components/Onboarding';
import {
  Plus, ChevronDown, Trash2, Calendar, CreditCard, Wallet as WalletIcon,
  Utensils, ShoppingBag, Info as InfoIcon, Lock, User,
  Camera, X, Edit3, RefreshCcw, Settings as SettingsIcon,
  ToggleLeft, ToggleRight, Luggage, PenTool, Sparkles as SparklesIcon, Loader2, MapPinOff, Activity, LineChart, Cpu, Zap, Fingerprint, Bell, Cloud
} from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { compressImage, uploadImage } from './utils/imageUtils';
import { auth } from './services/firebase';
// framer-motion v12: 標準導入（LazyMotion/domAnimation 在 v12 不再支援）
import { motion, AnimatePresence } from 'framer-motion';
import { SettingToggle, InkSplat, GridToggle, SystemSlider } from './components/Common';
import { MemberManagement, ProfileEditor, PersonalSetup } from './components/MemberModals';
import { Member } from './types';
import { OfflineStatus } from './components/OfflineStatus';
import { triggerHaptic } from './utils/haptics';
import { useHapticShake } from './hooks/useHapticShake';
import { AiAssistant } from './components/AiAssistant';
import { SplatToast } from './components/ui/SplatToast';

// 🚀 Lazy Load 各分頁組件，大幅減少首次載入 bundle 體積
const Schedule = lazy(() => import('./components/Schedule').then(m => ({ default: m.Schedule })));
const Booking = lazy(() => import('./components/Booking').then(m => ({ default: m.Booking })));
const Wallet = lazy(() => import('./components/Wallet').then(m => ({ default: m.Wallet })));
const Memories = lazy(() => import('./components/Memories').then(m => ({ default: m.Memories })));
const PackingList = lazy(() => import('./components/PackingList').then(m => ({ default: m.PackingList })));
const Vault = lazy(() => import('./components/Vault').then(m => ({ default: m.Vault })));

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
      whileTap={{ scale: 0.85, y: 3 }}
      onClick={() => onClick(id)}
      className={`flex flex-col items-center gap-1.5 flex-1 transition-colors duration-300 relative ${isActive ? `${color}` : 'text-gray-400'}`}
    >
      {cloneElement(icon, { size: 22, strokeWidth: isActive ? 3 : 2 })}
      <span className={`text-[9px] font-black tracking-widest uppercase transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
      {/* 🪨 墨點指示器 — 極簡墨滴 */}
      {isActive && (
        <motion.div
          layoutId="ink-drop"
          className="absolute -bottom-2.5 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'currentColor' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </motion.button>
  );
};

// --- 🔹 裝飾性 Sparkline (SVG) ---
const Sparkline = memo(() => (
  <svg width="60" height="20" viewBox="0 0 60 20" className="opacity-30">
    <path d="M0 15 Q 15 5, 30 12 T 60 8" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
));

// --- 💊 靈動島適配：AI 同步膠囊 ---
const AIStatusCapsule: FC<{ syncing: boolean, enableMotion: boolean, springConfig: any }> = memo(({ syncing, enableMotion, springConfig }) => {
  const animate = enableMotion && syncing;
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', ...springConfig }}
      style={{ top: 'var(--sat, 12px)' }}
      className="fixed left-1/2 -translate-x-1/2 z-[3000] pointer-events-none"
    >
      <motion.div
        animate={animate ? { scaleX: [1, 1.15, 1], scaleY: [1, 0.92, 1] } : {}}
        transition={animate ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : {}}
        className="bg-splat-dark text-white px-4 py-1.5 rounded-full flex items-center gap-2 border-[2px] border-white/20 shadow-lg min-w-[120px] justify-center origin-center"
      >
        <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-splat-green animate-pulse' : 'bg-gray-500'}`} />
        <span className="text-[10px] font-black tracking-widest uppercase">
          {syncing ? 'AI Syncing' : 'Ready'}
        </span>
      </motion.div>
    </motion.div>
  );
});

// --- ⚙️ UI 設定容器 (Apple Style Redesign) ---
const UISettingsContainer = memo(({
  uiSettings,
  setUISettings,
  currentTrip,
  updateTripData,
  onClose
}: any) => {
  return (
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      className="bg-white w-full max-w-sm rounded-[40px] border-[4px] border-splat-dark shadow-2xl p-8 relative z-10 overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-splat-dark/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black italic uppercase flex items-center gap-2 tracking-tighter">
          <SettingsIcon className="text-splat-dark" /> Control HQ
        </h2>
        <button onClick={onClose} className="w-10 h-10 rounded-full border-2 border-splat-dark/10 flex items-center justify-center active:scale-90 transition-transform">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-6 max-h-[70vh] overflow-y-auto hide-scrollbar pr-1">
        {/* --- 💳 Traveler ID Card (Currency) --- */}
        <div className="bg-splat-dark rounded-[32px] p-6 text-white shadow-splat-solid relative overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Traveler ID / Base</p>
              <h3 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                {currentTrip.baseCurrency} <Sparkline />
              </h3>
            </div>
            <div className="text-right">
              <select
                value={currentTrip.baseCurrency || 'JPY'}
                onChange={e => updateTripData(currentTrip.id, { baseCurrency: e.target.value as any })}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-1 px-2 text-[10px] font-black outline-none"
              >
                <option value="JPY" className="text-splat-dark">JPY ¥</option>
                <option value="TWD" className="text-splat-dark">TWD $</option>
                <option value="USD" className="text-splat-dark">USD $</option>
                <option value="KRW" className="text-splat-dark">KRW ₩</option>
              </select>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-end">
            <div className="text-[9px] font-black text-white/60 tracking-widest uppercase">Current Exchange Rate Active</div>
            <Fingerprint size={16} className="text-splat-yellow opacity-50" />
          </div>
        </div>

        {/* --- 🎨 Visual Vibe (2x2 Grid) --- */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Visual Vibe</h4>
          <div className="grid grid-cols-2 gap-3">
            <GridToggle
              label="Liquid Ink"
              icon={<Zap size={20} strokeWidth={2.5} />}
              enabled={uiSettings.enableSplatter}
              onChange={(v) => setUISettings({ enableSplatter: v })}
            />
            <GridToggle
              label="Motion"
              icon={<Activity size={20} strokeWidth={2.5} />}
              enabled={uiSettings.enableMotionDepth}
              onChange={(v) => setUISettings({ enableMotionDepth: v })}
            />
            <GridToggle
              label="Weather FX"
              icon={<Cloud size={20} strokeWidth={2.5} />}
              enabled={uiSettings.enableWeatherFX}
              onChange={(v) => setUISettings({ enableWeatherFX: v })}
            />
            <GridToggle
              label="Glass 2.0"
              icon={<SparklesIcon size={20} strokeWidth={2.5} />}
              enabled={uiSettings.enableGlassmorphism}
              onChange={(v) => setUISettings({ enableGlassmorphism: v })}
            />
          </div>
        </div>

        {/* --- 🧠 Intelligence --- */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Intelligence</h4>
          <div className="space-y-3">
            <SettingToggle
              label="AI Stream"
              enabled={uiSettings.enableAiStreaming}
              onChange={(v) => setUISettings({ enableAiStreaming: v })}
            />
            <SettingToggle
              label="3D Maps"
              enabled={uiSettings.enable3DMap}
              onChange={(v) => setUISettings({ enable3DMap: v })}
            />
          </div>
        </div>

        {/* --- ⚙️ System --- */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">System Performance</h4>
          <SystemSlider
            label="Haptic"
            icon={<Cpu size={14} />}
            value={uiSettings.enableHaptics ? 80 : 0}
            onChange={(v) => setUISettings({ enableHaptics: v > 30 })}
          />
          <SystemSlider
            label="Budget"
            icon={<Bell size={14} />}
            value={uiSettings.showBudgetAlert ? 90 : 0}
            onChange={(v) => setUISettings({ showBudgetAlert: v > 30 })}
          />
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.95, y: 2 }}
        onClick={onClose}
        className="w-full py-4 mt-8 bg-splat-dark text-white font-black uppercase tracking-widest rounded-2xl shadow-splat-solid active:shadow-none transition-all"
      >
        Confirm Setup ➔
      </motion.button>
    </motion.div>
  );
});

// ==========================================
// 🚀 唯一的主要 App 元件
// ==========================================
const App: FC = () => {
  // Prompt 1: Zustand per-selector 寫法，避免全域解構造成無關組件 re-render
  const trips = useTripStore(s => s.trips);
  const currentTripId = useTripStore(s => s.currentTripId);
  const { requestPermission } = usePushNotifications(currentTripId || '');
  const switchTrip = useTripStore(s => s.switchTrip);
  const deleteTrip = useTripStore(s => s.deleteTrip);
  const removeTripLocal = useTripStore(s => s.removeTripLocal);
  const activeTab = useTripStore(s => s.activeTab);
  const setActiveTab = useTripStore(s => s.setActiveTab);
  const updateTripData = useTripStore(s => s.updateTripData);
  const isAiModalOpen = useTripStore(s => s.isAiModalOpen);
  const openAiAssistant = useTripStore(s => s.openAiAssistant);
  const uiSettings = useTripStore(s => s.uiSettings);
  const setUISettings = useTripStore(s => s.setUISettings);
  const showToast = useTripStore(s => s.showToast);
  const isSyncing = useTripStore(s => s.isSyncing);

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
  const [splatPos, setSplatPos] = useState({ x: 0, y: 0 });

  // 🚀 全域噴漆特效 (useEffect 取代內嵌組件，避免每次渲染重新建立)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!uiSettings.enableSplatter) return;
      setSplatPos({ x: e.clientX, y: e.clientY });
      setSplatColor(SPLAT_COLORS[Math.floor(Math.random() * SPLAT_COLORS.length)]);
      setIsSplatting(true);
      triggerHaptic('light');
      setTimeout(() => setIsSplatting(false), 800);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [uiSettings.enableSplatter]);


  // Step 1: Lazy-Keep — 追蹤已造訪的分頁，只 Mount 一次，之後用 display 保留
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]));

  // 移除本地 state，改用 Zustand uiSettings
  useHapticShake();

  useFirebaseSync();

  const currentTrip = trips.find(t => t.id === currentTripId) || trips[0];

  useEffect(() => {
    if (currentTrip && (!currentTrip.members || currentTrip.members.length === 0)) {
      setShowPersonalSetup(true);
    }
  }, [currentTrip]);

  // Step 1: 每次切換分頁時，將新分頁加入 visitedTabs（只加不刪）
  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev; // 已造訪，不需更新
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  // 📍 Vercel 冷啟動 Warm-up Ping (Fix 3: 正確帶 Content-Type)
  useEffect(() => {
    fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping' })
    }).catch(() => { });

    // 🚀 手動啟動推播權限請求 (延遲 5 秒避免干擾載入)
    const pushTimer = setTimeout(() => {
      requestPermission();
    }, 5000);
    return () => clearTimeout(pushTimer);
  }, [currentTripId]);

  // 🔋 iPhone 15 Pro Max 視覺封頂：彈簧參數優化 (120Hz)
  const SPRING_CONFIG = uiSettings.enableMotionDepth
    ? { stiffness: 300, damping: 30 }
    : { stiffness: 500, damping: 50 }; // 省電模式較快


  // Fix 11/Root Cause of #310: 確保所有 Hooks 都在提早 return 之前執行
  const dateRange = useMemo(() => {
    if (!currentTrip) return [];
    const start = parseISO(currentTrip.startDate);
    const diff = Math.max(0, differenceInDays(parseISO(currentTrip.endDate), start)) + 1;
    return Array.from({ length: diff }, (_, i) => addDays(start, i));
  }, [currentTrip?.startDate, currentTrip?.endDate]);

  if (trips.length === 0 || showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  if (!currentTrip) return <Onboarding onComplete={() => setShowOnboarding(false)} />;

  const myProfile = currentTrip.members?.[0];

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;

    // 觸發墨水 SVG 動畫
    if (uiSettings.showSplash) {
      setSplatColor(SPLAT_COLORS[Math.floor(Math.random() * SPLAT_COLORS.length)]);
      setIsSplatting(true);
      setTimeout(() => setIsSplatting(false), 800); // 配合 SVG 動畫時間
    }

    if (uiSettings.enableHaptics) triggerHaptic('light');

    // 2026 View Transitions API：瀏覽器支援時啟用原生無縫轉場
    if (typeof document.startViewTransition !== 'function') {
      // 降級：直接切換（iOS Safari／舊版支援）
      setActiveTab(tabId);
    } else {
      document.startViewTransition(() => {
        // flushSync 確保 React re-render 與 DOM 變化同步，防止 Tearing
        import('react-dom').then((ReactDOM) => {
          ReactDOM.flushSync(() => {
            setActiveTab(tabId);
          });
        });
      });
    }
  };


  const confirmTripSwitch = () => {
    const target = trips.find(t => t.id === lockedTripId);
    if (target?.tripPin === verifyPin) {
      switchTrip(lockedTripId!);
      setLockedTripId(null);
      setMenuOpen(false);
    } else {
      showToast("密碼錯誤！🔒", "error");
      setVerifyPin('');
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans text-splat-dark relative bg-[#F4F5F7] bg-[radial-gradient(#D1D5DB_2px,transparent_2px)] bg-[size:24px_24px]">

      <AnimatePresence>
        {isSplatting && <InkSplat color={splatColor} />}
      </AnimatePresence>

      {activeTab === 'timeline' && (
        <header className="p-4 sticky top-0 z-[100] w-full max-w-md mx-auto animate-fade-in bg-[#F4F5F7]/95 backdrop-blur-sm border-b-[3px] border-splat-dark shadow-sm">
          <div className="bg-splat-yellow border-[3px] border-splat-dark rounded-[24px] shadow-splat-solid p-4 flex justify-between items-center relative z-20">
            <div className="relative text-left min-w-0">
              <h2 className="text-[10px] font-black text-splat-dark uppercase tracking-widest mb-0.5 bg-white inline-block px-2 border-2 border-splat-dark rounded-full shadow-splat-solid-sm -rotate-2">
                {currentTrip.startDate} — {currentTrip.endDate}
              </h2>

              <AnimatePresence>
                {isSyncing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
                    className="absolute -top-1 -right-4 w-2 h-2 bg-splat-pink rounded-full shadow-[0_0_8px_#F03C69] animate-pulse z-30"
                  />
                )}
              </AnimatePresence>

              <div className="flex items-center gap-1 cursor-pointer group mt-1" onClick={() => setMenuOpen(!menuOpen)}>
                <h1 className="text-2xl font-black tracking-tight drop-shadow-md truncate max-w-[200px]">
                  {currentTrip.tripName || currentTrip.dest}
                </h1>
                <div className="ml-2">
                  <OfflineStatus />
                </div>
              </div>

              {/* ▲ 隱藏版 AI 魔法按鈕 (已移動至底部導覽列) ▲ */}

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
                              deleteTrip(t.id);
                              showToast("行程已永久刪除 🗑️", "success");
                            } else {
                              removeTripLocal(t.id);
                              showToast("已退出行程 👋", "info");
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
                        if (trips.find(t => t.id === shareId)) {
                          showToast("您已經在這個行程裡囉！", "info");
                          return;
                        }

                        const { doc, getDoc } = await import('firebase/firestore');
                        const { db } = await import('./services/firebase');
                        const docSnap = await getDoc(doc(db, "trips", shareId));

                        if (docSnap.exists()) {
                          const tripData = docSnap.data() as import('./types').Trip;
                          const pin = prompt(`找到「${tripData.dest}」！請輸入密碼加入：`);
                          if (pin === tripData.tripPin) {
                            useTripStore.getState().addTripLocal(tripData);
                            showToast("成功加入行程！🎉", "success");
                            setMenuOpen(false);
                          } else { showToast("密碼錯誤！🔒", "error"); }
                        } else { showToast("找不到這個行程代碼喔 🥲", "error"); }
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
      )
      }

      <main className={`flex-1 w-full max-w-md mx-auto overflow-hidden flex flex-col ${activeTab !== 'timeline' ? 'pt-6' : 'pt-2'}`}>
        {/*
            React 19 Activity 模式：
            - 取代舊的 display:none 手動控制
            - 優化 React 記憶體回收機制
            - 隱藏分頁的 CPU 佔用率降至最低，且能瞬間恢復捲動深度
          */}
        {/* 🗺 Timeline = Schedule + Booking */}
        {visitedTabs.has('timeline') && (
          <div hidden={activeTab !== 'timeline'} className="flex-1 overflow-y-auto hide-scrollbar">
            <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-splat-blue" /></div>}>
              <Schedule externalDateIdx={selectedDateIdx} />
              <div className="mt-6 px-1">
                <Booking />
              </div>
            </Suspense>
          </div>
        )}
        {/* 🛡 Vault = InfoItems (QR Grid + Docs) */}
        {visitedTabs.has('vault') && (
          <div hidden={activeTab !== 'vault'} className="flex-1 overflow-y-auto hide-scrollbar">
            <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-splat-pink" /></div>}>
              <Vault />
            </Suspense>
          </div>
        )}
        {/* 💳 Wallet = Expenses (Tax-Free + Exchange) */}
        {visitedTabs.has('wallet') && (
          <div hidden={activeTab !== 'wallet'} className="flex-1 overflow-y-auto hide-scrollbar">
            <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-splat-yellow" /></div>}>
              <Wallet />
            </Suspense>
          </div>
        )}
        {/* ✨ Memories = Chronological Experience Stream (Journal + Bought Items + Expenses) */}
        {visitedTabs.has('memories') && (
          <div hidden={activeTab !== 'memories'} className="flex-1 overflow-y-auto hide-scrollbar">
            <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-splat-green" /></div>}>
              <Memories />
            </Suspense>
          </div>
        )}
      </main>

      {/* 🧭 Bottom Navigation — 4 Unified Modules */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[85%] max-w-sm bg-white/90 backdrop-blur-xl border-[3px] border-splat-dark rounded-[28px] shadow-splat-solid px-4 py-3 flex justify-between items-center z-50">
        <NavIcon icon={<Calendar />} label="Timeline" id="timeline" active={activeTab} onClick={handleTabChange} color="text-splat-blue" />
        <NavIcon icon={<Lock />} label="Vault" id="vault" active={activeTab} onClick={handleTabChange} color="text-splat-pink" />
        <NavIcon icon={<WalletIcon />} label="Wallet" id="wallet" active={activeTab} onClick={handleTabChange} color="text-splat-yellow" />
        <NavIcon icon={<SparklesIcon />} label="Memories" id="memories" active={activeTab} onClick={handleTabChange} color="text-splat-green" />
      </nav>

      {/* 🤖 AI FAB — Glassmorphism 浮動按鈕 */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => openAiAssistant()}
        className="fixed bottom-[100px] right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 20px rgba(255,192,0,0.3)'
        }}
      >
        <SparklesIcon size={24} strokeWidth={2.5} className="text-splat-yellow drop-shadow-sm" />
      </motion.button>

      {
        lockedTripId && (
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
        )
      }

      {
        memberOpen && (
          <MemberManagement
            trip={currentTrip}
            myProfile={myProfile}
            onClose={() => setMemberOpen(false)}
            onEditProfile={() => setEditingProfile(true)}
            onShowSettings={() => setShowSettings(true)}
          />
        )
      }

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-splat-dark/80 backdrop-blur-sm"
            />
            <UISettingsContainer
              uiSettings={uiSettings}
              setUISettings={setUISettings}
              currentTrip={currentTrip}
              updateTripData={updateTripData}
              onClose={() => setShowSettings(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {
        editingProfile && myProfile && (
          <ProfileEditor
            myProfile={myProfile}
            onClose={() => setEditingProfile(false)}
            onSave={(updated: Member) => {
              const nm = currentTrip.members.map(x => x.id === myProfile.id ? updated : x);
              updateTripData(currentTrip.id, { members: nm });
              setEditingProfile(false);
            }}
          />
        )
      }

      {
        showPersonalSetup && (
          <PersonalSetup
            onComplete={(data: { name: string; email: string; pin: string }) => {
              const uid = auth.currentUser?.uid || 'anon-' + Date.now();
              const newMember = {
                ...data,
                id: uid,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
                mood: '準備出發！✈️'
              };
              updateTripData(currentTrip.id, {
                members: [...(currentTrip.members || []), newMember],
                memberIds: [...new Set([...(currentTrip.memberIds || []), uid])]
              });
              setShowPersonalSetup(false);
            }}
          />
        )
      }
      {isSyncing && <AIStatusCapsule syncing={isSyncing} enableMotion={uiSettings.enableMotionDepth} springConfig={SPRING_CONFIG} />}
      <AiAssistant />
      <SplatToast />
    </div>
  );
};

export default App;



