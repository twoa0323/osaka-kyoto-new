import React, { useState, useEffect, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
// 匯入幣別映射邏輯 (確保 src/utils/currencyMapping.ts 存在)
import { getCurrencyByCountry } from '../utils/currencyMapping';
// 匯入匯率 API 邏輯 (確保 src/utils/exchange.ts 存在)
import { fetchExchangeRate } from '../utils/exchange';
import { Plane, MapPin, Calendar, Banknote, RefreshCw, Rocket, Loader2 } from 'lucide-react';
import axios from 'axios';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const addTrip = useTripStore((state) => state.addTrip);
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const [submitting, setSubmitting] = useState(false);
  
  const isSelecting = useRef(false);

  const [form, setForm] = useState({
    selectedPlace: null as any,
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    currency: 'TWD' as any,
  });

  // 使用 Photon API 進行地點搜尋
  useEffect(() => {
    if (isSelecting.current) {
      isSelecting.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          // 限制只搜尋國家、州/省、城市、城鎮，排除街道與景點
          const res = await axios.get(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lang=en&layer=country&layer=state&layer=city&layer=town`
          );
          
          const rawFeatures = res.data.features || [];
          
          // 前端去重：依據 "名稱 + 國家" 進行過濾
          const uniqueFeatures = new Map();
          rawFeatures.forEach((f: any) => {
            const key = `${f.properties.name}-${f.properties.country}`;
            if (!uniqueFeatures.has(key)) {
              uniqueFeatures.set(key, f);
            }
          });

          setSuggestions(Array.from(uniqueFeatures.values()));
        } catch (e) { console.error("搜尋錯誤:", e); }
        setLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // 當使用者選取地點時觸發
  const handleSelectPlace = async (place: any) => {
    isSelecting.current = true;
    
    const props = place.properties;
    const country = props.country || '';
    const placeName = props.name;

    // 1. 自動依地點更換幣別
    const currency = getCurrencyByCountry(country);
    
    // 更新表單狀態
    setForm(prev => ({ ...prev, selectedPlace: place, currency }));
    setQuery(`${placeName}, ${country}`);
    setSuggestions([]);

    // 2. 依照 Exchange API 抓取最新匯率
    try {
      setLoading(true); // 顯示讀取中
      const currentRate = await fetchExchangeRate(currency);
      setRate(currentRate);
    } catch (e) {
      console.error("匯率抓取失敗", e);
      setRate(1.0); // 失敗時回退預設值
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.selectedPlace) return alert("請先從建議清單中選擇一個城市唷！");
    if (submitting) return;
    
    setSubmitting(true);
    const props = form.selectedPlace.properties;

    try {
      const tripData = {
        id: Date.now().toString(),
        destination: `${props.name}, ${props.country || ''}`,
        startDate: form.start,
        endDate: form.end,
        baseCurrency: form.currency,
        members: ['Admin'],
        pin: '007',
        items: []
      };

      console.log("正在建立行程...", tripData);

      // 3. 寫入 Firebase 資料庫
      await addDoc(collection(db, "trips"), tripData);
      
      // 更新本地 Store
      addTrip(tripData as any);
      
      console.log("建立成功！");
      onComplete();
    } catch (error: any) {
      console.error("建立失敗:", error);
      alert(`建立失敗：${error.message || "請檢查網路連線或 Firebase 設定"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#328383] to-[#2E6A9E] flex flex-col items-center justify-center p-6 font-sans text-white z-[100] overflow-y-auto">
      <div className="w-full max-w-md flex flex-col items-center pt-safe">
        
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-md mb-6 shrink-0">
          <Plane size={36} className="rotate-45 text-white" />
        </div>

        <h1 className="text-4xl font-bold mb-10 tracking-wide">Travel Plan</h1>

        <div className="bg-white rounded-[40px] w-full p-8 shadow-2xl space-y-4">
          
          {/* 地點搜尋欄位 */}
          <div className="bg-[#EDF1F7] rounded-2xl p-4 relative">
            <label className="text-[10px] font-black text-[#8E99AF] uppercase tracking-widest mb-1 block">Destination</label>
            <div className="flex items-center gap-3">
              <MapPin size={24} className="text-[#5C6B89]" />
              <input 
                className="bg-transparent w-full text-[#2D3A52] font-bold placeholder:text-[#B0B9C8] outline-none"
                placeholder="輸入城市 (例如: 大阪, Kyoto...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {loading && <Loader2 size={16} className="animate-spin text-[#5C6B89]" />}
            </div>

            {/* 搜尋建議列表 */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[105%] bg-white rounded-2xl shadow-2xl z-[110] overflow-hidden border border-[#EDF1F7] max-h-60 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelectPlace(s)} 
                    className="w-full text-left px-5 py-4 hover:bg-[#EDF1F7] transition-colors border-b last:border-0 border-[#EDF1F7] text-[#2D3A52]"
                  >
                    <div className="font-bold text-sm">{s.properties.name}</div>
                    <div className="text-[10px] text-[#8E99AF]">
                      {[s.properties.city, s.properties.state, s.properties.country]
                        .filter(p => p && p !== s.properties.name)
                        .filter((item, index, self) => self.indexOf(item) === index)
                        .join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 日期選擇 */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-[#EDF1F7] rounded-2xl p-4">
              <label className="text-[10px] font-black text-[#8E99AF] uppercase tracking-widest mb-1 block">Start</label>
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#5C6B89]" />
                <input 
                  type="date" 
                  className="bg-transparent w-full text-[#2D3A52] font-bold text-xs outline-none" 
                  value={form.start} 
                  onChange={e => setForm({...form, start: e.target.value})} 
                />
              </div>
            </div>
            <div className="bg-[#EDF1F7] rounded-2xl p-4">
              <label className="text-[10px] font-black text-[#8E99AF] uppercase tracking-widest mb-1 block">End</label>
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#5C6B89]" />
                <input 
                  type="date" 
                  className="bg-transparent w-full text-[#2D3A52] font-bold text-xs outline-none" 
                  value={form.end} 
                  onChange={e => setForm({...form, end: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* 幣別與匯率顯示 */}
          <div className="bg-[#EDF1F7] rounded-2xl p-4">
            <label className="text-[10px] font-black text-[#8E99AF] uppercase tracking-widest mb-1 block">Currency</label>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Banknote size={24} className="text-[#5C6B89]" />
                <span className="text-[#2D3A52] font-bold">{form.currency}</span>
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-[#DDE4EE] pt-2">
              <div className="flex items-center gap-1 text-[9px] text-[#8E99AF] font-bold italic">
                <RefreshCw size={10} className="text-ac-green" />
                匯率：每日自動刷新
              </div>
              <div className="text-[10px] text-[#5C6B89] font-black">
                1 {form.currency} ≈ NT$ {rate.toFixed(3)}
              </div>
            </div>
          </div>

          <button 
            onClick={handleCreate}
            disabled={submitting}
            className={`w-full bg-[#147A70] hover:bg-[#0E5A52] text-white py-5 rounded-full font-black text-lg flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all mt-4 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Rocket size={24} fill="white" />}
            {submitting ? "建立中..." : "建立行程"}
          </button>
        </div>
        
        <p className="mt-8 text-[9px] text-white/40 font-bold tracking-tighter text-center leading-relaxed">
          Powered by OpenStreetMap / Photon / open-er-api.com
        </p>
      </div>
    </div>
  );
};