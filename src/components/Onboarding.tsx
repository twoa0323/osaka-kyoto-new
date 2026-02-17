import React, { useState, useEffect, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { getCurrencyByCountry } from '../utils/currencyMapping';
import { fetchExchangeRate } from '../utils/exchange';
import { Plane, MapPin, Calendar, Banknote, RefreshCw, Rocket, Loader2 } from 'lucide-react';
import axios from 'axios';

export const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const addTrip = useTripStore((state) => state.addTrip);
  
  // 搜尋與表單狀態
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  
  // [關鍵修復] 用來防止選取後再次觸發搜尋的標記
  const isSelecting = useRef(false);

  const [form, setForm] = useState({
    selectedPlace: null as any,
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    currency: 'TWD' as any
  });

  // 使用 OpenStreetMap (Nominatim) API
  useEffect(() => {
    // 如果正在選取模式，直接跳過搜尋，防止無限迴圈
    if (isSelecting.current) {
      isSelecting.current = false; 
      return;
    }

    const timer = setTimeout(async () => {
      // 至少輸入 2 個字才搜尋，減少無效請求
      if (query.length >= 2) {
        setLoading(true);
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
              q: query,
              format: 'json',
              addressdetails: 1, // 必須開啟，才能取得 country_code
              limit: 5,
              'accept-language': 'zh-TW,en' // 優先顯示中文
            }
          });
          setSuggestions(res.data);
        } catch (e) { 
          console.error("搜尋錯誤:", e); 
        }
        setLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 600); // Debounce 延遲

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPlace = async (place: any) => {
    // [關鍵] 設為 true，告訴 useEffect 這次變更不要搜尋
    isSelecting.current = true;
    
    // 1. 解析地點資訊 (解決幣別對應失敗的關鍵)
    const address = place.address || {};
    const countryCode = address.country_code || ''; // ex: 'kr', 'cn', 'jp'
    const countryName = address.country || '';      // ex: '南韓', 'China'
    
    // 2. 透過國家代碼取得精準幣別
    const currency = getCurrencyByCountry(countryCode, countryName);
    
    // 3. 取得主要地名 (逗號前的部分，優化顯示)
    const placeName = place.display_name.split(',')[0];

    setForm(prev => ({ ...prev, selectedPlace: place, currency }));
    setQuery(placeName); // 更新輸入框文字
    setSuggestions([]);  // 關閉選單

    // 4. 抓取即時匯率
    try {
      const currentRate = await fetchExchangeRate(currency);
      setRate(currentRate);
    } catch (e) {
      setRate(1.0);
    }
  };

  const handleCreate = () => {
    if (!form.selectedPlace) return alert("請先搜尋並選擇一個城市！");
    
    addTrip({
      id: Date.now().toString(),
      dest: form.selectedPlace.display_name.split(',')[0],
      destination: form.selectedPlace.display_name,
      startDate: form.start,
      endDate: form.end,
      baseCurrency: form.currency,
      members: ['Admin'],
      pin: '007',
      // 初始化 items 防止 undefined 錯誤
      // (注意：這裡不需要傳入 items 屬性，因為 store 會處理，但若有需要可加)
    });
    onComplete();
  };

  return (
    // fixed inset-0 確保手機版完全滿版 (包含狀態欄背景)
    // z-[100] 確保蓋在所有內容之上
    // overflow-y-auto 允許小螢幕捲動
    <div className="fixed inset-0 bg-gradient-to-b from-[#328383] to-[#2E6A9E] flex flex-col items-center justify-center p-6 font-sans text-white z-[100] overflow-y-auto">
      
      {/* 使用 pt-[env(safe-area-inset-top)] 避開手機瀏海 */}
      <div className="w-full max-w-md flex flex-col items-center pt-[env(safe-area-inset-top)]">
        
        {/* 飛機 Icon */}
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-md mb-6 shrink-0">
          <Plane size={36} className="rotate-45 text-white" />
        </div>

        <h1 className="text-4xl font-bold mb-10 tracking-wide">Travel Plan</h1>

        {/* 主卡片區塊 */}
        <div className="bg-white rounded-[40px] w-full p-8 shadow-2xl space-y-4">
          
          {/* DESTINATION 輸入區 */}
          <div className="bg-[#EDF1F7] rounded-2xl p-4 relative">
            <label className="text-[10px] font-black text-[#8E99AF] uppercase tracking-widest mb-1 block">Destination</label>
            <div className="flex items-center gap-3">
              <MapPin size={24} className="text-[#5C6B89]" />
              <input 
                className="bg-transparent w-full text-[#2D3A52] font-bold placeholder:text-[#B0B9C8] outline-none text-base"
                placeholder="輸入城市 (例如: 大阪, 巴黎...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {loading && <Loader2 size={16} className="animate-spin text-[#5C6B89]" />}
            </div>

            {/* 搜尋建議選單 */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[105%] bg-white rounded-2xl shadow-xl z-[150] overflow-hidden border border-[#EDF1F7]">
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelectPlace(s)} 
                    className="w-full text-left px-5 py-4 hover:bg-[#EDF1F7] transition-colors border-b last:border-0 border-[#EDF1F7] text-[#2D3A52]"
                  >
                    <div className="font-bold text-sm">{s.display_name.split(',')[0]}</div>
                    <div className="text-[10px] text-[#8E99AF] truncate">{s.display_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* START & END (使用 Grid 修正對齊) */}
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
              {/* 裝飾用的上下箭頭 */}
              <div className="text-[#5C6B89] flex flex-col gap-0.5">
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-current"></div>
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-current"></div>
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

          {/* 建立按鈕 */}
          <button 
            onClick={handleCreate}
            className="w-full bg-[#147A70] hover:bg-[#0E5A52] text-white py-5 rounded-full font-black text-lg flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all mt-4"
          >
            <Rocket size={24} fill="white" /> 建立行程
          </button>
        </div>
        
        {/* Footer */}
        <p className="mt-8 text-[9px] text-white/40 font-bold tracking-tighter text-center leading-relaxed">
          Powered by OpenStreetMap / Nominatim / open-er-api.com / Google<br/>
          Translate / ChatGPT
        </p>
      </div>
    </div>
  );
};