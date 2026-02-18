import React, { useState, useEffect, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { getCurrencyByCountry } from '../utils/currencyMapping';
import { fetchExchangeRate } from '../utils/exchange';
import { Plane, MapPin, Calendar, Banknote, RefreshCw, Rocket, Loader2, Mail, Lock } from 'lucide-react';
import axios from 'axios';

export const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const addTrip = useTripStore((state) => state.addTrip);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const [step, setStep] = useState<'info' | 'security'>('info');
  const isSelecting = useRef(false);

  const [form, setForm] = useState({
    selectedPlace: null as any,
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    currency: 'TWD' as any,
    tripPin: '',
    adminEmail: ''
  });

  useEffect(() => {
    if (isSelecting.current) { isSelecting.current = false; return; }
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=5&accept-language=zh-TW`);
          setSuggestions(res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
      } else { setSuggestions([]); }
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPlace = async (place: any) => {
    isSelecting.current = true;
    const address = place.address || {};
    const currency = getCurrencyByCountry(address.country_code || '', address.country || '');
    setForm(prev => ({ ...prev, selectedPlace: place, currency }));
    setQuery(place.display_name.split(',')[0]);
    setSuggestions([]);
    const currentRate = await fetchExchangeRate(currency);
    setRate(currentRate);
  };

  const handleFinish = () => {
    if (!form.adminEmail || form.tripPin.length < 4) return alert("請完整填寫 Email 與 4 位數密碼唷！🔒");
    
    addTrip({
      id: Date.now().toString(),
      dest: form.selectedPlace.display_name.split(',')[0],
      destination: form.selectedPlace.display_name,
      startDate: form.start,
      endDate: form.end,
      baseCurrency: form.currency,
      tripPin: form.tripPin,
      adminEmail: form.adminEmail,
      members: [], 
      items: [], bookings: [], expenses: [], journals: [], shoppingList: [], infoItems: []
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#328383] to-[#2E6A9E] flex flex-col items-center justify-center p-6 text-white z-[500] overflow-y-auto">
      <div className="w-full max-w-md flex flex-col items-center py-10">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-md mb-6 shrink-0"><Plane size={36} className="rotate-45" /></div>
        <h1 className="text-4xl font-black mb-10 tracking-wide">Travel Plan</h1>

        <div className="bg-white rounded-[40px] w-full p-8 shadow-2xl space-y-4 text-left">
          {step === 'info' ? (
            <>
              <div className="bg-[#EDF1F7] rounded-2xl p-4 relative">
                <label className="text-[10px] font-black text-[#8E99AF] uppercase mb-1 block tracking-widest">Destination</label>
                <div className="flex items-center gap-3">
                  <MapPin size={24} className="text-[#5C6B89]" /><input className="bg-transparent w-full text-[#2D3A52] font-bold outline-none" placeholder="輸入城市 (例如: 大阪, 巴黎...)" value={query} onChange={e => setQuery(e.target.value)} />
                  {loading && <Loader2 size={16} className="animate-spin text-[#5C6B89]"/>}
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-[105%] bg-white rounded-2xl shadow-xl z-50 overflow-hidden border border-[#EDF1F7]">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => handleSelectPlace(s)} className="w-full text-left px-5 py-4 hover:bg-[#EDF1F7] transition-colors border-b last:border-0 border-[#EDF1F7] text-[#2D3A52]">
                        <div className="font-bold text-sm">{s.display_name.split(',')[0]}</div>
                        <div className="text-[10px] text-[#8E99AF] truncate">{s.display_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#EDF1F7] rounded-2xl p-4"><label className="text-[10px] font-black text-[#8E99AF] uppercase block">Start</label><div className="flex items-center gap-2"><Calendar size={18} className="text-[#5C6B89]"/><input type="date" className="bg-transparent w-full text-[#2D3A52] font-bold text-xs outline-none" value={form.start} onChange={e => setForm({...form, start: e.target.value})} /></div></div>
                <div className="bg-[#EDF1F7] rounded-2xl p-4"><label className="text-[10px] font-black text-[#8E99AF] uppercase block">End</label><div className="flex items-center gap-2"><Calendar size={18} className="text-[#5C6B89]"/><input type="date" className="bg-transparent w-full text-[#2D3A52] font-bold text-xs outline-none" value={form.end} onChange={e => setForm({...form, end: e.target.value})} /></div></div>
              </div>

              <div className="bg-[#EDF1F7] rounded-2xl p-4">
                <label className="text-[10px] font-black text-[#8E99AF] uppercase block tracking-widest">Currency</label>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3"><Banknote size={24} className="text-[#5C6B89]" /><span className="text-[#2D3A52] font-bold">{form.currency}</span></div>
                  <div className="text-[#5C6B89] flex flex-col gap-0.5"><div className="w-0 h-0 border-l-[4px] border-transparent border-r-[4px] border-transparent border-b-[6px] border-b-current"></div><div className="w-0 h-0 border-l-[4px] border-transparent border-r-[4px] border-transparent border-t-[6px] border-t-current"></div></div>
                </div>
                <div className="flex justify-between items-center border-t border-[#DDE4EE] pt-2">
                  <div className="flex items-center gap-1 text-[9px] text-[#8E99AF] font-bold italic"><RefreshCw size={10} className="text-ac-green" /> 匯率：每日自動刷新</div>
                  <div className="text-[10px] text-[#5C6B89] font-black">1 {form.currency} ≈ NT$ {rate.toFixed(3)}</div>
                </div>
              </div>

              <button onClick={() => { if(!form.selectedPlace) return alert("請先搜尋並選擇目的地內容唷！"); setStep('security'); }} className="w-full bg-[#147A70] text-white py-5 rounded-full font-black text-lg flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all mt-4 shrink-0"><Rocket size={24} fill="white" /> 建立行程</button>
            </>
          ) : (
            <div className="space-y-6 py-4 animate-in zoom-in-95 duration-300">
               <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-[#E2F1E7] rounded-full flex items-center justify-center mx-auto text-ac-green shadow-sm"><Lock size={32}/></div>
                  <h3 className="text-xl font-black text-ac-brown italic">設定行程管理密碼</h3>
                  <p className="text-xs text-ac-brown/50 font-bold">未來切換至此行程時需驗證進入</p>
               </div>
               <div className="space-y-4">
                  <div className="bg-[#EDF1F7] rounded-2xl p-4 flex items-center gap-4"><Mail className="text-[#5C6B89]" size={20}/><input placeholder="Email (忘記密碼找回用)" className="bg-transparent w-full text-ac-brown font-black outline-none" value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})} /></div>
                  <div className="bg-[#EDF1F7] rounded-2xl p-4 flex items-center gap-4"><Lock className="text-[#5C6B89]" size={20}/><input type="password" maxLength={4} inputMode="numeric" placeholder="4 位數密碼" className="bg-transparent w-full text-ac-brown font-black outline-none text-2xl tracking-[0.5em]" value={form.tripPin} onChange={e => setForm({...form, tripPin: e.target.value})} /></div>
               </div>
               <div className="flex gap-3">
                  <button onClick={() => setStep('info')} className="flex-1 py-4 border-2 border-ac-border rounded-full font-black text-ac-border active:bg-ac-bg transition-colors">上一步</button>
                  <button onClick={handleFinish} className="flex-[2] bg-ac-green text-white py-4 rounded-full font-black shadow-zakka active:scale-95 transition-all">確認並啟航 ➔</button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
