import { FC, useState, useEffect, Suspense, useMemo, lazy, cloneElement, memo, useRef } from 'react';
import { useTripStore } from './store/useTripStore';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { usePushNotifications } from './hooks/usePushNotifications';
import { Onboarding } from './components/Onboarding';
import {
  Plus, ChevronDown, Trash2, Calendar, CreditCard, Wallet as WalletIcon,
  Utensils, ShoppingBag, Info as InfoIcon, Lock, User,
  Camera, X, Edit3, RefreshCcw, Settings as SettingsIcon,
  ToggleLeft, ToggleRight, Luggage, PenTool, Sparkles as SparklesIcon, Loader2, MapPinOff, Activity, LineChart, Cpu, Zap, Fingerprint, Bell, Cloud, History, Languages
} from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { compressImage, uploadImage } from './utils/imageUtils';
import { auth } from './services/firebase';
// framer-motion v12: 標準導入（LazyMotion/domAnimation 在 v12 不再支援）
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { SettingToggle, InkSplat, GridToggle, SystemSlider } from './components/Common';
import { MemberManagement, ProfileEditor, PersonalSetup } from './components/MemberModals';
import { Member } from './types';
import { OfflineStatus } from './components/OfflineStatus';
import { triggerHaptic } from './utils/haptics';
import { useHapticShake } from './hooks/useHapticShake';
import { useGyroscope } from './hooks/useGyroscope';
import { AiAssistant } from './components/AiAssistant';
import { SplatToast } from './components/ui/SplatToast';
import { useTranslation } from './hooks/useTranslation';

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

// 💎 Liquid Glass Luxury: P3 Wide Color Gamut (ADL)
const SPLAT_COLORS = ['var(--p3-navy)', 'var(--p3-ruby)', 'var(--p3-gold)', '#F4F5F7'];

const NavIcon = ({ icon, label, id, active, onClick, color }: any) => {
  const isActive = active === id;
  return (
    <motion.button
      whileTap={{ scale: 0.9, y: 2 }}
      onClick={() => onClick(id)}
      className={`flex flex-col items-center gap-1.5 flex-1 transition-colors duration-300 relative ${isActive ? `${color}` : 'text-gray-400'}`}
    >
      {cloneElement(icon, { size: 18, strokeWidth: 2.5 })}
      <span className={`text-[10px] boutique-h2 transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
      {isActive && (
        <motion.div
          layoutId="active-nav-dot"
          className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]"
          transition={{
            type: 'spring',
            stiffness: 500, // 高剛性創造快速起步
            damping: 25,    // 低阻尼創造慣性 Overshoot
            mass: 0.8       // 減輕質量讓動畫更輕盈具黏性
          }}
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
        className="bg-splat-dark/80 backdrop-blur-xl text-white px-4 py-1.5 rounded-full flex items-center gap-2 border-[0.5px] border-white/20 shadow-glass-deep min-w-[120px] justify-center origin-center"
      >
        <div className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-p3-ruby animate-pulse shadow-[0_0_10px_var(--p3-ruby-fallback)]' : 'bg-gray-500'}`} />
        <span className="boutique-tag tracking-widest uppercase opacity-90">
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
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      className="glass-card w-full max-w-sm p-10 relative z-10 overflow-hidden shadow-glass-deep"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl boutique-h1 flex items-center gap-3 text-p3-navy">
          <SettingsIcon size={24} strokeWidth={2.5} className="text-p3-navy" /> {t('settings.controlHq')}
        </h2>
        <button onClick={onClose} className="w-12 h-12 rounded-full border-[0.5px] border-black/10 flex items-center justify-center active:scale-95 transition-transform bg-white/40 backdrop-blur-md">
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="space-y-10 max-h-[70vh] overflow-y-auto hide-scrollbar pr-1">
        {/* --- 💳 Traveler ID Card (Currency) --- */}
        <div className="bg-p3-navy rounded-[32px] p-8 text-white shadow-glass-deep relative overflow-hidden group border-[0.5px] border-white/10">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="boutique-tag text-white/30 mb-2">{t('settings.baseCurrency')}</p>
              <h3 className="text-3xl boutique-h1 flex items-center gap-3 text-p3-gold">
                {currentTrip.baseCurrency} <Sparkline />
              </h3>
            </div>
            <div className="text-right">
              <select
                value={currentTrip.baseCurrency || 'JPY'}
                onChange={e => updateTripData(currentTrip.id, { baseCurrency: e.target.value as any })}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2 px-3 text-[10px] boutique-h2 outline-none"
              >
                <option value="JPY">JPY ¥</option>
                <option value="TWD">TWD $</option>
                <option value="USD">USD $</option>
                <option value="KRW">KRW ₩</option>
              </select>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-end">
            <div className="boutique-tag text-white/40">{t('settings.travelerIdActive')}</div>
            <Fingerprint size={16} className="text-splat-yellow opacity-50" />
          </div>
        </div>

        {/* --- 🌍 Language Selection (Premium Buttons) --- */}
        <div className="space-y-4">
          <p className="boutique-tag text-p3-navy/30 flex items-center gap-2">
            <Languages size={14} /> {t('settings.language')}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'zh-TW', label: '繁體中文' },
              { id: 'en', label: 'English' },
              { id: 'ja', label: '日本語' }
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => setUISettings({ ...uiSettings, language: lang.id })}
                className={`py-3 rounded-2xl text-[10px] font-black transition-all border-[0.5px] ${uiSettings.language === lang.id
                  ? 'bg-p3-navy text-white border-p3-navy shadow-glass-deep'
                  : 'bg-white/40 text-p3-navy border-black/10'
                  }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- 🎨 Visual Vibe (2x2 Grid) --- */}
        <div className="space-y-3">
          <h4 className="boutique-tag text-gray-400 uppercase tracking-widest pl-2">{t('settings.visualVibe')}</h4>
          <div className="grid grid-cols-2 gap-3">
            <GridToggle
              label={t('settings.liquidInk')}
              icon={<Zap size={20} strokeWidth={2.5} />}
              enabled={uiSettings.enableSplatter}
              onChange={(v) => setUISettings({ enableSplatter: v })}
            />
            <GridToggle
              label={t('settings.motion')}
              icon={<Activity size={20} strokeWidth={2.5} />}
              enabled={uiSettings.enableMotionDepth}
              onChange={(v) => setUISettings({ enableMotionDepth: v })}
            />
            <GridToggle
              label={t('settings.weatherFx')}
              icon={<Cloud size={20} strokeWidth={2.5} />}
              enabled={uiSettings.enableWeatherFX}
              onChange={(v) => setUISettings({ enableWeatherFX: v })}
            />
            <GridToggle
              label={t('settings.glass2')}
              icon={<SparklesIcon size={20} strokeWidth={2.5} />}
              enabled={uiSettings.enableGlassmorphism}
              onChange={(v) => setUISettings({ enableGlassmorphism: v })}
            />
          </div>
        </div>

        {/* --- 🧠 Intelligence --- */}
        <div className="space-y-3">
          <h4 className="boutique-tag text-gray-400 uppercase tracking-widest pl-2">{t('settings.intelligence')}</h4>
          <div className="space-y-3">
            <SettingToggle
              label={t('settings.aiStream')}
              enabled={uiSettings.enableAiStreaming}
              onChange={(v) => setUISettings({ enableAiStreaming: v })}
            />
            <SettingToggle
              label={t('settings.3dMaps')}
              enabled={uiSettings.enable3DMap}
              onChange={(v) => setUISettings({ enable3DMap: v })}
            />
          </div>
        </div>

        {/* --- ⚙️ System --- */}
        <div className="space-y-3">
          <h4 className="boutique-tag text-gray-400 uppercase tracking-widest pl-2">{t('settings.system')}</h4>
          <div className="glass-card p-6 shadow-glass-soft rounded-[24px]">
            <SystemSlider
              label={t('settings.haptic')}
              icon={<Activity size={18} />}
              value={uiSettings.enableHaptics ? 80 : 0}
              onChange={(v) => setUISettings({ enableHaptics: v > 30 })}
            />
            <SystemSlider
              label={t('settings.budgetAlert')}
              icon={<Bell size={14} />}
              value={uiSettings.showBudgetAlert ? 90 : 0}
              onChange={(v) => setUISettings({ showBudgetAlert: v > 30 })}
            />
          </div>
        </div>

      </div>
      <motion.button
        whileTap={{ scale: 0.98, y: 1 }}
        onClick={onClose}
        className="w-full py-4 mt-8 bg-p3-navy text-white font-black uppercase tracking-widest rounded-[22px] shadow-glass-deep border-[0.5px] border-white/20 active:shadow-none transition-all"
      >
        {t('settings.confirm')} ➔
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

  const { t } = useTranslation();

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

  // 供內部滾動區域使用的 Ref
  const contentRef = useRef<HTMLDivElement>(null);
  const dateScrollRef = useRef<HTMLDivElement>(null);

  // 🚀 自動將選中的日期按鈕置中
  useEffect(() => {
    if (dateScrollRef.current && activeTab === 'timeline') {
      const container = dateScrollRef.current;
      const activeButton = container.children[selectedDateIdx] as HTMLElement;
      if (activeButton) {
        const scrollLeft = activeButton.offsetLeft - (container.offsetWidth / 2) + (activeButton.offsetWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [selectedDateIdx, activeTab]);

  // 物理互動感知層：監聽裝置陀螺儀
  const gyroData = useGyroscope(uiSettings.enableHaptics ? 0.8 : 0); // Use haptic setting to control gyroscope sensitivity

  // 動態深度運算 (Gyroscope-linked Shadows)
  // 將陀螺儀的 xy 偏移轉換為陰影長度與模糊度
  const shadowX = uiSettings.enableMotionDepth ? gyroData.x * 2.5 : 0;
  const shadowY = uiSettings.enableMotionDepth ? gyroData.y * 2.5 : 4;

  // 反射光暈偏移
  const glareX = uiSettings.enableMotionDepth ? gyroData.x * -5 : 0;
  const glareY = uiSettings.enableMotionDepth ? gyroData.y * -5 : 0;

  useFirebaseSync();

  const currentTrip = trips.find(trip => trip.id === currentTripId) || trips[0];

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
    if (uiSettings.enableSplatter) {
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
    const target = trips.find(trip => trip.id === lockedTripId);
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
    <div className="relative h-[100dvh] w-full max-w-md mx-auto bg-[#F4F5F7] overflow-hidden drop-shadow-2xl sm:rounded-[40px] sm:my-8 sm:h-[844px] flex flex-col font-sans">
      {/* 動態材質疊層 (Dynamic Material Overlay) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-color-burn"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundPosition: `${gyroData.x * 0.5}px ${gyroData.y * 0.5}px`,
          transition: 'background-position 0.1s ease-out'
        }}
      ></div>

      <AnimatePresence>
        {isSplatting && <InkSplat color={splatColor} />}
        {uiSettings.enableSplatter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              transform: `translate(${gyroData.x * 1.5}px, ${gyroData.y * 1.5}px)`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`bg-splat-${i}`}
                className="absolute w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
                style={{
                  background: SPLAT_COLORS[i % SPLAT_COLORS.length],
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  transform: `translate(-50%, -50%) scale(${1 + Math.random()})`,
                }}
                animate={{
                  x: [0, Math.random() * 50 - 25, 0],
                  y: [0, Math.random() * 50 - 25, 0],
                  scale: [1, 1.1, 1],
                  opacity: [0.15, 0.25, 0.15]
                }}
                transition={{
                  duration: 10 + Math.random() * 10,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'timeline' && (
        <header className="p-4 sticky top-0 z-[100] w-full max-w-md mx-auto animate-fade-in bg-[#F4F5F7]/95 backdrop-blur-sm border-b-[1px] border-black/5 shadow-sm">
          <div className="bg-splat-yellow border-[3px] border-splat-dark rounded-[24px] shadow-splat-solid p-4 flex justify-between items-center relative z-20">
            <div className="relative text-left min-w-0">
              <h2 className="boutique-tag text-splat-dark uppercase tracking-widest mb-0.5 bg-white inline-block px-2 border-2 border-splat-dark rounded-full shadow-splat-solid-sm -rotate-2">
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
                    {trips.map(tripItem => {
                      const isCreator = tripItem.creatorId === (auth.currentUser?.uid || 'unknown');
                      return (
                        <div key={tripItem.id} className={`flex items-center justify-between p-3 rounded-xl border-2 mb-2 ${tripItem.id === currentTrip.id ? 'bg-splat-yellow border-splat-dark' : 'border-transparent hover:border-gray-200'}`}>
                          <button className="flex-1 text-left font-black text-sm truncate pr-2" onClick={() => { if (tripItem.id === currentTrip.id) return; setLockedTripId(tripItem.id); setVerifyPin(''); }}>{tripItem.tripName || tripItem.dest}</button>
                          <button onClick={() => {
                            if (isCreator) {
                              deleteTrip(tripItem.id);
                              showToast("行程已永久刪除 🗑️", "success");
                            } else {
                              removeTripLocal(tripItem.id);
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
                        if (trips.find(trip => trip.id === shareId)) {
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
                      🤝 {t('common.joinTrip')}
                    </button>
                    <button onClick={() => { setMenuOpen(false); setShowOnboarding(true); }} className="w-full p-3 bg-splat-green text-white text-sm font-black rounded-xl border-2 border-splat-dark shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center gap-2 active:translate-y-0.5 active:shadow-none transition-all">
                      <Plus strokeWidth={3} size={16} /> {t('common.createTrip')}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            <motion.div
              whileTap={{ scale: 0.9, rotate: 10 }}
              className="w-14 h-14 rounded-full border-[0.5px] border-white/40 shadow-glass-soft overflow-hidden bg-white/40 backdrop-blur-md shrink-0 cursor-pointer"
              onClick={() => setMemberOpen(true)}
            >
              <img src={myProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Adventurer`} alt="avatar" className="w-full h-full object-cover" />
            </motion.div>
          </div>

          <div
            ref={dateScrollRef}
            className="flex overflow-x-auto gap-3 hide-scrollbar pt-4 px-1 date-btn-container scroll-smooth"
          >
            {dateRange.map((date, i) => (
              <button key={i} onClick={() => setSelectedDateIdx(i)} className={`flex flex-col items-center min-w-[72px] p-2.5 rounded-[22px] border-[0.5px] transition-all duration-300 font-black ${selectedDateIdx === i ? 'bg-p3-navy text-white shadow-glass-deep border-white/20 -translate-y-1' : 'bg-white shadow-sm border-gray-200 text-gray-500'}`}>
                <span className="text-[10px] uppercase opacity-60">DAY {i + 1}</span>
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

      {/* 🧭 Bottom Navigation — 5 Unified Modules */}
      <LayoutGroup>
        <nav className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-white/95 backdrop-blur-xl border border-gray-200 shadow-[0_20px_40px_rgba(0,0,0,0.15)] px-2 py-4 flex justify-around items-center z-50 rounded-[32px]">
          <NavIcon icon={<Calendar />} label={t('nav.timeline')} id="timeline" active={activeTab} onClick={handleTabChange} color="text-p3-navy" />
          <NavIcon icon={<Lock />} label={t('nav.vault')} id="vault" active={activeTab} onClick={handleTabChange} color="text-p3-ruby" />
          <NavIcon icon={<WalletIcon />} label={t('nav.wallet')} id="wallet" active={activeTab} onClick={handleTabChange} color="text-p3-gold" />
          <NavIcon icon={<History />} label={t('nav.memories')} id="memories" active={activeTab} onClick={handleTabChange} color="text-p3-green" />
          <NavIcon
            icon={<SparklesIcon />}
            label={t('nav.ai')}
            id="ai"
            active={isAiModalOpen ? 'ai' : activeTab}
            onClick={() => openAiAssistant()}
            color="text-p3-ruby"
          />
        </nav>
      </LayoutGroup>

      {
        lockedTripId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-sm p-10 text-center space-y-6 shadow-glass-deep">
              <div className="w-20 h-20 bg-p3-ruby/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock size={40} className="text-p3-ruby" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-p3-navy uppercase tracking-tight">{t('common.verifyBeforeTrip')}</h3>
              <input type="password" maxLength={4} inputMode="numeric" placeholder="••••" className="w-full bg-white/40 backdrop-blur-md text-p3-navy font-black p-5 rounded-[22px] text-center text-4xl tracking-[0.5em] outline-none border-[0.5px] border-white/50 focus:bg-white/60 transition-all shadow-inner" value={verifyPin} onChange={(e) => setVerifyPin(e.target.value)} />
              <div className="flex gap-4 mt-6">
                <button onClick={() => { setLockedTripId(null); setVerifyPin(''); }} className="flex-1 py-4 bg-white/20 backdrop-blur-md text-slate-500 font-black rounded-2xl border-[0.5px] border-white/30 active:scale-95 transition-all">{t('common.cancel')}</button>
                <button onClick={confirmTripSwitch} className="flex-[2] py-4 bg-p3-navy text-white font-black rounded-2xl shadow-glass-deep border-[0.5px] border-white/20 active:scale-95 transition-all">{t('common.unlock')} ➔</button>
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



