import React, { useState, useEffect, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { getCurrencyByCountry } from '../utils/currencyMapping';
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
  // 防止提交時重複點擊
  const [submitting, setSubmitting] = useState(false);
  
  // 防止選取後再次觸發搜尋
  const isSelecting = useRef(false);

  const [form, setForm] = useState({
    selectedPlace: null as any,
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    currency: 'TWD' as any,
    currencyName: '台幣'
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
          // [關鍵修改] 加入 layer 參數進行過濾，只顯示行政區劃
          // layer=country: 國家
          // layer=state: 省/州/縣
          // layer=city: 城市
          // layer=town: 城鎮
          const res = await axios.get(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en&layer=country&layer=state&layer=city&layer=town`
          );
          setSuggestions(res.data.features || []);
        } catch (e) { console.error("搜尋錯誤:", e); }
        setLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPlace = async (place: any) => {
    isSelecting.current = true;
    
    const props = place.properties;
    const country = props.country || '';
    // 取得對應幣別 (需確保 utils/currencyMapping.ts 存在)
    const currency = getCurrencyByCountry(country);
    const placeName = props.name;

    setForm(prev => ({ ...prev, selectedPlace: place, currency }));
    // 組合顯示名稱，讓使用者知道選到了哪個國家
    setQuery(`${placeName}, ${country}`);
    setSuggestions([]);

    try {
      const currentRate = await fetchExchangeRate(currency);
      setRate(currentRate);
    } catch (e) {
      setRate(1.0);
    }
  };

  const handleCreate = async () => {
    if (!form.selectedPlace) return alert("請先從建議清單中選擇一個城市唷！");
    if (submitting) return; // 防止重複提交
    
    setSubmitting(true);
    const props = form.selectedPlace.properties;

    try {
      const tripData = {
        id: Date.now().toString(),
        // 統一使用 destination 欄位名稱
        destination: `${props.name}, ${props.country || ''}`,
        startDate: form.start,
        endDate: form.end,
        baseCurrency: form.currency,
        members: ['Admin'], // 預設成員
        pin: '007',
        items: [] // 初始化空陣列，避免後續操作錯誤
      };

      console.log("正在建立行程...", tripData);

      // 1. 寫入 Firestore 資料庫 (確保資料持久化)
      await addDoc(collection(db, "trips"), tripData);
      
      // 2. 更新本地 Store (讓 UI 即時反應)
      addTrip(tripData as any);
      
      console.log("建立成功！");
      onComplete(); // 通知父元件切換頁面
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
          
          {/* DESTINATION */}
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

            {/* 建議列表 */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[105%] bg-white rounded-2xl shadow-2xl z-[110] overflow-hidden border border-[#EDF1F7]">
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelectPlace(s)} 
                    className="w-full text-left px-5 py-4 hover:bg-[#EDF1F7] transition-colors border-b last:border-0 border-[#EDF1F7] text-[#2D3A52]"
                  >
                    <div className="font-bold text-sm">{s.properties.name}</div>
                    <div className="text-[10px] text-[#8E99AF]">
                      {[s.properties.city, s.properties.state, s.properties.country].filter(Boolean).join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* START & END */}
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

          {/* CURRENCY */}
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