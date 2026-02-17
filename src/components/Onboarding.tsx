import React, { useState, useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { getCurrencyByCountry } from '../utils/currencyMapping';
import { fetchExchangeRate } from '../utils/exchange';
import { Plane, MapPin, Calendar, Banknote, RefreshCw, Rocket, Loader2 } from 'lucide-react';
import axios from 'axios';

export const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const addTrip = useTripStore((state) => state.addTrip);
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState<number>(1.0);

  const [form, setForm] = useState({
    selectedPlace: null as any,
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    currency: 'TWD' as any
  });

  // 使用 Nominatim (OpenStreetMap) 搜尋 API
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          // 加上 accept-language=zh 確保中文回傳
          const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=5&accept-language=zh`);
          setSuggestions(res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
      } else { setSuggestions([]); }
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPlace = async (place: any) => {
    const country = place.address.country || '';
    const currency = getCurrencyByCountry(country);
    const placeName = place.display_name.split(',')[0];

    setForm(prev => ({ ...prev, selectedPlace: place, currency }));
    setQuery(placeName);
    setSuggestions([]);

    const currentRate = await fetchExchangeRate(currency);
    setRate(currentRate);
  };

  return (
    // 使用 h-[100dvh] 與 fixed inset-0 確保強制全螢幕覆蓋
    <div className="fixed inset-0 bg-gradient-to-b from-[#328383] to-[#2E6A9E] flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <div className="w-full max-w-md flex flex-col items-center">
        
        {/* 飛機圖示 */}
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-md mb-6">
          <Plane size={40} className="rotate-45 text-white" />
        </div>

        <h1 className="text-4xl font-bold mb-10 tracking-wide font-sans">Travel Plan</h1>

        {/* 主卡片 */}
        <div className="bg-white rounded-[40px] w-full p-8 shadow-2xl space-y-4">
          
          {/* DESTINATION */}
          <div className="bg-[#EDF1F7] rounded-2xl p-4 relative">
            <label className="text-[10px] font-black text-[#8E99AF] uppercase tracking-widest mb-1 block">Destination</label>
            <div className="flex items-center gap-3">
              <MapPin size={24} className="text-[#5C6B89]" />
              <input 
                className="bg-transparent w-full text-[#2D3A52] font-bold placeholder:text-[#B0B9C8] outline-none text-base"
                placeholder="輸入城市 (例如: 大阪, 巴黎, 曼谷...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {loading && <Loader2 size={16} className="animate-spin text-[#5C6B89]" />}
            </div>

            {/* 搜尋建議列表 */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[105%] bg-white rounded-2xl shadow-xl z-50 overflow-hidden border border-[#EDF1F7]">
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

          {/* START & END - 使用 Grid 修正對齊問題 */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-[#EDF1F7] rounded-2xl p-4">
              <label className="text-[10px] font-black text-[#8E99AF] uppercase tracking-widest mb-1 block">Start</label>
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#5C6B89]" />
                <input 
                  type="date" 
                  className="bg-transparent w-full text-[#2D3A52] font-bold text-xs outline-none"
                  value={form.start}
                  onChange={(e) => setForm({...form, start: e.target.value})}
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
                  onChange={(e) => setForm({...form, end: e.target.value})}
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
              <div className="text-[#5C6B89] flex flex-col items-center">
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-current mb-0.5"></div>
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-current"></div>
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-[#DDE4EE] pt-2">
              <div className="flex items-center gap-1 text-[9px] text-[#8E99AF] font-bold">
                <RefreshCw size={12} className="text-[#328383]" />
                匯率：每日自動刷新 (免金鑰)
              </div>
              <div className="text-[9px] text-[#5C6B89] font-black">
                1 {form.currency} ≈ NT$ {rate.toFixed(3)}
              </div>
            </div>
          </div>

          {/* 建立按鈕 */}
          <button 
            onClick={() => {
               if(!form.selectedPlace) return alert("請選擇目的地");
               addTrip({
                 id: Date.now().toString(),
                 dest: form.selectedPlace.display_name.split(',')[0],
                 startDate: form.start,
                 endDate: form.end,
                 baseCurrency: form.currency,
                 members: ['Admin'],
                 pin: '007'
               });
               onComplete();
            }}
            className="w-full bg-[#147A70] text-white py-5 rounded-full font-black text-lg flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all mt-4"
          >
            <Rocket size={24} fill="white" /> 建立行程
          </button>
        </div>

        <p className="mt-8 text-[9px] text-white/50 font-bold tracking-tighter text-center leading-relaxed">
          Powered by OpenStreetMap / Nominatim / open-er-api.com / Google<br/>
          Translate / ChatGPT
        </p>
      </div>
    </div>
  );
};