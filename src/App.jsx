import { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Plane, Train, Home, Utensils, Camera, Star, Info, 
  Map as MapIcon, ShieldAlert, Copy, ExternalLink, 
  Target, Navigation, ChevronUp, ChevronDown, Trash2, X, 
  Image as ImageIcon, ReceiptText, Sparkles, Clock, 
  MapPin, Calendar, CreditCard, ShoppingBag, Wallet,
  Search, ArrowRight, CheckCircle2, MoreHorizontal, Users
} from 'lucide-react';

// --- API 設定 ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// --- 幣別自動映射 ---
const CITY_CURRENCY_MAP = {
  '大阪': 'JPY', '東京': 'JPY', '京都': 'JPY',
  '首爾': 'KRW', '釜山': 'KRW', '濟州': 'KRW',
  '曼谷': 'THB', '清邁': 'THB',
  '巴黎': 'EUR', '倫敦': 'GBP', '紐約': 'USD'
};

const TYPE_CONFIG = {
  'FLIGHT': { color: '#60A5FA', icon: Plane, label: '機票' },
  'HOTEL': { color: '#A78BFA', icon: Home, label: '住宿' },
  'FOOD': { color: '#FB923C', icon: Utensils, label: '美食' },
  'SHOPPING': { color: '#EC4899', icon: ShoppingBag, label: '購物' },
  'SIGHTSEEING': { color: '#34D399', icon: Camera, label: '景點' },
  'HIGHLIGHT': { color: '#D4AF37', icon: Star, label: '亮點' }
};

export default function App() {
  // --- 狀態管理 ---
  const [hasStarted, setHasStarted] = useState(() => JSON.parse(localStorage.getItem('trip_started') || 'false'));
  const [tripConfig, setTripConfig] = useState(() => JSON.parse(localStorage.getItem('trip_config') || '{"dest": "", "start": "2025-12-24", "end": "2025-12-24", "currency": "TWD"}'));
  
  const [view, setView] = useState('plan'); // plan, booking, wallet, food, shop, info
  const [bookingTab, setBookingTab] = useState('flight'); // flight, hotel, spot, voucher
  const [selectedIdx, setSelectedIdx] = useState(0);
  
  const [days, setDays] = useState(() => JSON.parse(localStorage.getItem('travel_days_v2') || '[]'));
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem('exp_v2') || '[]'));
  const [rate, setRate] = useState(1.0);

  // --- 初始化持久化 ---
  useEffect(() => {
    localStorage.setItem('trip_started', JSON.stringify(hasStarted));
    localStorage.setItem('trip_config', JSON.stringify(tripConfig));
    localStorage.setItem('travel_days_v2', JSON.stringify(days));
    localStorage.setItem('exp_v2', JSON.stringify(expenses));
  }, [hasStarted, tripConfig, days, expenses]);

  // --- 自動抓取匯率 ---
  useEffect(() => {
    if (tripConfig.currency !== 'TWD') {
      fetch(`https://open.er-api.com/v6/latest/${tripConfig.currency}`)
        .then(res => res.json())
        .then(data => { if(data?.rates?.TWD) setRate(data.rates.TWD); })
        .catch(console.error);
    }
  }, [tripConfig.currency]);

  // --- 建立行程邏輯 ---
  const handleCreateTrip = () => {
    if(!tripConfig.dest) return alert("請輸入目的地");
    const start = new Date(tripConfig.start);
    const end = new Date(tripConfig.end);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const newDays = Array.from({ length: diffDays }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return {
        id: Date.now() + i,
        date: d.getDate().toString().padStart(2, '0'),
        day: ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()],
        title: `${tripConfig.dest} 第 ${i+1} 天`,
        city: tripConfig.dest,
        items: []
      };
    });
    setDays(newDays);
    setHasStarted(true);
  };

  // --- 子組件：啟動設定頁 (參考 IMG_5974) ---
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#328383] to-[#2E6A9E] flex items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
              <Plane className="w-10 h-10 rotate-45" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-center mb-2">Travel Plan</h1>
          <p className="text-center opacity-80 mb-10 text-sm">Material Design 版 (功能不變)</p>

          <div className="bg-white rounded-[32px] p-8 space-y-6 shadow-2xl text-stone-800">
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  className="w-full bg-[#EDF1F7] rounded-2xl py-4 pl-12 pr-4 outline-none font-medium" 
                  placeholder="輸入城市 (例如: 大阪, 巴黎, 曼谷...)"
                  value={tripConfig.dest}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = Object.keys(CITY_CURRENCY_MAP).find(k => val.includes(k));
                    setTripConfig({...tripConfig, dest: val, currency: matched ? CITY_CURRENCY_MAP[matched] : 'TWD'});
                  }}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">Start</label>
                <input type="date" className="w-full bg-[#EDF1F7] rounded-2xl p-4 text-sm" value={tripConfig.start} onChange={e => setTripConfig({...tripConfig, start: e.target.value})} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">End</label>
                <input type="date" className="w-full bg-[#EDF1F7] rounded-2xl p-4 text-sm" value={tripConfig.end} onChange={e => setTripConfig({...tripConfig, end: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">Currency</label>
              <div className="bg-[#EDF1F7] rounded-2xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-stone-500" />
                  <span className="font-bold">{tripConfig.currency} 台幣</span>
                </div>
                <ChevronDown className="w-4 h-4 text-stone-400" />
              </div>
              <p className="text-[10px] text-stone-400 mt-2 px-1">匯率：每日自動刷新 (免金鑰) <span className="float-right">1 {tripConfig.currency} ≈ NT$ {rate.toFixed(3)}</span></p>
            </div>

            <button 
              onClick={handleCreateTrip}
              className="w-full bg-[#147A70] text-white py-5 rounded-full font-bold shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <Sparkles className="w-5 h-5" /> 建立行程
            </button>
          </div>
          
          <p className="text-center text-[10px] opacity-60 mt-8 tracking-tighter">
            Powered by OpenStreetMap / OSRM / open.er-api.com / Gemini AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#EBE7DE] relative">
      {/* HEADER (由原本 App.jsx 改良) */}
      <header className="fixed top-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#EBE7DE]/95 backdrop-blur-md pt-10 px-6 pb-4 border-b border-stone-200">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-[10px] font-bold text-stone-400 tracking-[0.3em] uppercase mb-1">{tripConfig.dest} 15日遊</p>
            <h1 className="serif text-2xl font-bold">2026 釜山・濟州</h1>
          </div>
          <div className="flex -space-x-2">
            {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-[#EBE7DE] bg-stone-300 overflow-hidden"><img src={`https://i.pravatar.cc/100?u=${i}`} /></div>)}
          </div>
        </div>
        
        {/* 日期滾動條 */}
        <div className="flex overflow-x-auto gap-6 hide-scrollbar">
          {days.map((d, i) => (
            <div key={d.id} onClick={() => setSelectedIdx(i)} className={`flex flex-col items-center min-w-[35px] cursor-pointer transition-all ${selectedIdx === i ? 'text-black font-bold active-dot' : 'text-stone-400'}`}>
              <span className="text-[10px] mb-1 uppercase">{d.day}</span>
              <span className="text-xl serif">{d.date}</span>
            </div>
          ))}
        </div>
      </header>

      {/* CONTENT AREA */}
      <main className="pt-48 pb-32 px-5">
        {/* --- 預定分頁 (參考 IMG_6018, 6019) --- */}
        {view === 'booking' && (
          <div className="animate-fade">
            <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar">
              {[
                {id: 'flight', label: '機票', icon: Plane},
                {id: 'hotel', label: '住宿', icon: Home},
                {id: 'spot', label: '景點', icon: Camera},
                {id: 'voucher', label: '憑證', icon: CheckCircle2}
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setBookingTab(t.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all border ${bookingTab === t.id ? 'bg-[#7EAB83] text-white border-transparent' : 'bg-white text-stone-400 border-stone-200'}`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>

            {bookingTab === 'flight' && (
              <div className="space-y-4">
                {/* 機票卡片 (參考 IMG_6018) */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-stone-100 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-stone-400 text-xs font-bold">釜山航空</span>
                    <span className="bg-[#F3F4F6] text-stone-500 text-[9px] px-3 py-1 rounded-full font-bold">同一張訂單</span>
                  </div>
                  <div className="text-center mb-8">
                    <h2 className="flight-no text-7xl text-stone-800">BX 796</h2>
                  </div>
                  <div className="flex justify-between items-center mb-10 px-4">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-stone-800">KHH</h3>
                      <p className="text-xl font-medium">15:00</p>
                      <span className="bg-[#7EAB83] text-white text-[10px] px-3 py-1 rounded-full">高雄</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center px-4">
                      <span className="text-[10px] text-stone-300 font-bold mb-1">02h25m</span>
                      <div className="w-full h-[1.5px] bg-stone-100 relative flex justify-center">
                        <Plane className="w-5 h-5 text-[#7EAB83] bg-white absolute -top-[9px] px-1" />
                      </div>
                      <span className="text-[10px] text-stone-300 font-bold mt-2">2026/03/10</span>
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-stone-800">PUS</h3>
                      <p className="text-xl font-medium">18:25</p>
                      <span className="bg-[#F9AC7D] text-white text-[10px] px-3 py-1 rounded-full">釜山</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-stone-50 pt-6 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center text-stone-400"><ShoppingBag className="w-4 h-4" /></div>
                      <div><p className="text-[10px] text-stone-400 font-bold uppercase">Baggage</p><p className="font-bold text-stone-700">15kg</p></div>
                    </div>
                    <div className="flex items-center gap-3 text-right justify-end">
                      <div className="text-right">
                        <p className="text-[10px] text-stone-400 font-bold uppercase">Aircraft</p>
                        <div className="flex items-center gap-1 justify-end"><Plane className="w-3 h-3 text-orange-400" /><p className="font-bold text-stone-700">A321</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-stone-50 rounded-2xl p-4">
                      <p className="text-[9px] text-stone-400 font-bold mb-1 uppercase tracking-wider">Price & Type</p>
                      <p className="font-bold text-stone-700">NT$ 4,633</p>
                      <p className="text-[9px] text-stone-300">同一張訂單</p>
                    </div>
                    <div className="flex-1 bg-stone-50 rounded-2xl p-4">
                      <p className="text-[9px] text-stone-400 font-bold mb-1 uppercase tracking-wider">Purchased</p>
                      <p className="font-bold text-stone-700">2025/11/14</p>
                      <p className="text-[9px] text-stone-300">via 官網</p>
                    </div>
                  </div>
                  <button className="w-full mt-6 py-4 border border-stone-100 rounded-2xl text-stone-400 font-bold text-sm flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> 編輯航班資訊
                  </button>
                </div>
              </div>
            )}

            {bookingTab === 'hotel' && (
              <div className="space-y-6">
                <button className="w-full py-6 border-2 border-dashed border-stone-300 rounded-[32px] text-stone-400 font-bold flex items-center justify-center gap-2">
                  + 新增住宿
                </button>
                {/* 住宿卡片 (參考 IMG_6019) */}
                <div className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-stone-100">
                  <div className="h-64 relative">
                    <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945" className="w-full h-full object-cover" />
                    <div className="absolute top-6 left-6 glass px-4 py-1.5 rounded-full flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-blue-500" /> <span className="text-[10px] font-bold">釜山</span>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="serif text-2xl font-bold text-stone-800 mb-2">Avani Central Busan</h3>
                    <p className="text-stone-400 text-xs flex items-center gap-2 mb-8">
                      <MapPin className="w-3 h-3 text-orange-400" /> 133 Jeonpo-daero, Nam-gu
                    </p>
                    <div className="bg-stone-50 rounded-[28px] p-6 border border-stone-100 flex justify-between items-center mb-8 relative">
                      <div className="flex-1">
                        <p className="text-[10px] text-stone-400 font-bold uppercase mb-1">Check-in</p>
                        <p className="text-lg font-bold">2026-03-10</p>
                        <p className="text-xs text-stone-400 font-medium">15:00</p>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <span className="text-[10px] text-stone-300 font-bold">6 Nights</span>
                        <ArrowRight className="w-5 h-5 text-stone-300" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-[10px] text-stone-400 font-bold uppercase mb-1">Check-out</p>
                        <p className="text-lg font-bold">2026-03-16</p>
                        <p className="text-xs text-stone-400 font-medium">11:00</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-stone-400 text-xs font-bold">Total</span>
                        <span className="text-3xl font-bold text-stone-800">NT$ 5,000</span>
                      </div>
                      <div className="flex gap-4 mt-2">
                        <p className="text-xs text-stone-400 font-bold">每人均分 <span className="text-stone-700">NT$ 1,667</span></p>
                        <p className="text-xs text-stone-400 font-bold bg-[#E2F1E7] text-[#4A785D] px-3 py-1 rounded-lg">每人每晚 NT$ 278</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 記帳分頁 (參考 IMG_6020) --- */}
        {view === 'wallet' && (
          <div className="animate-fade">
            <div className="flex bg-white rounded-full p-1.5 mb-8 shadow-sm">
              <button className="flex-1 py-3 bg-[#7EAB83] text-white rounded-full font-bold text-sm">記帳</button>
              <button className="flex-1 py-3 text-stone-400 font-bold text-sm">明細</button>
            </div>
            
            <div className="bg-white rounded-[40px] p-8 shadow-sm space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">💰</div>
                <h2 className="text-xl font-bold text-stone-800">記帳輸入</h2>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">日期</label>
                <div className="bg-stone-50 rounded-2xl p-4 text-center font-bold text-stone-700 border border-stone-100">
                  2025年12月8日
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">幣別 (預設 KRW)</label>
                <div className="flex gap-3">
                  {['KRW', 'TWD', 'USD'].map(c => (
                    <button key={c} className={`flex-1 py-4 rounded-2xl font-bold border transition-all ${c === 'KRW' ? 'bg-[#E2F1E7] border-[#A8D1B7] text-[#4A785D]' : 'bg-white border-stone-100 text-stone-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-[#D97706] uppercase mb-2 block">* 金額</label>
                  <input type="number" className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-5 text-2xl font-bold outline-none" placeholder="0" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">約合台幣</label>
                  <div className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-5 text-2xl font-bold text-stone-400">
                    0
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">支付方式</label>
                <div className="flex flex-wrap gap-3">
                  {['現金', '信用卡', 'WOWPASS', '行動支付'].map(m => (
                    <button key={m} className={`px-6 py-4 rounded-2xl font-bold border transition-all ${m === '現金' ? 'bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]' : 'bg-white border-stone-100 text-stone-400'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">地點 (選填)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                  <input className="w-full bg-stone-50 border border-stone-100 rounded-2xl py-4 pl-12 pr-4 outline-none font-medium text-sm" placeholder="例如：便利商店" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#D97706] uppercase mb-2 block">* 消費項目</label>
                <div className="flex gap-3">
                  <input className="flex-1 bg-stone-50 border border-stone-100 rounded-2xl p-5 outline-none font-bold" placeholder="例如：午餐" />
                  <button className="w-16 h-16 bg-[#E2F1E7] rounded-2xl flex items-center justify-center text-[#4A785D] border border-[#A8D1B7]">
                    <ImageIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto hide-scrollbar pt-2">
                {[
                  {n: '凱文', u: '1'}, {n: '尼歐', u: '2'}, {n: '小羊', u: '3'}, {n: '大俠', u: '4'}
                ].map(p => (
                  <button key={p.n} className="flex items-center gap-2 bg-stone-50 border border-stone-100 rounded-full px-4 py-2 shrink-0">
                    <img src={`https://i.pravatar.cc/100?u=${p.u}`} className="w-6 h-6 rounded-full" />
                    <span className="text-xs font-bold text-stone-700">{p.n}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FIXED TAB BAR (6大項) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#F9F8F6]/95 backdrop-blur-xl border-t border-stone-200 px-4 pt-4 pb-8 shadow-2xl">
        <div className="flex justify-between items-center px-2">
          {[
            {id: 'plan', label: '行程', icon: Calendar},
            {id: 'booking', label: '預訂', icon: CheckCircle2},
            {id: 'wallet', label: '記帳', icon: Wallet},
            {id: 'food', label: '美食', icon: Utensils},
            {id: 'shop', label: '購物', icon: ShoppingBag},
            {id: 'info', label: '資訊', icon: Info},
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${view === item.id ? 'text-[#147A70]' : 'text-stone-400'}`}
            >
              <item.icon className={`w-5 h-5 ${view === item.id ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-bold tracking-tighter ${view === item.id ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
              {view === item.id && <div className="absolute -top-1 w-1 h-1 bg-[#147A70] rounded-full" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}