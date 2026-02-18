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
  const isSelecting = useRef(false);

  const [form, setForm] = useState({
    selectedPlace: null as any,
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    currency: 'TWD' as any,
    userName: '小冒險家',
    email: '',
    pin: ''
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

  const handleCreate = () => {
    if (!form.selectedPlace || !form.email || form.pin.length < 4) return alert("請填寫完整資訊，且 PIN 碼需 4 位數唷！🔑");
    
    addTrip({
      id: Date.now().toString(),
      dest: form.selectedPlace.display_name.split(',')[0],
      destination: form.selectedPlace.display_name,
      startDate: form.start,
      endDate: form.end,
      baseCurrency: form.currency,
      pin: form.pin, // 主 PIN
      members: [{
        id: 'm-' + Date.now(),
        name: form.userName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${form.userName}`,
        email: form.email,
        pin: form.pin
      }],
      items: [], bookings: [], expenses: [], journals: [], shoppingList: [], infoItems: []
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#328383] to-[#2E6A9E] flex flex-col items-center justify-center p-6 text-white z-[500] overflow-y-auto">
      <div className="w-full max-w-md flex flex-col items-center py-10">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-md mb-6"><Plane size={36} className="rotate-45" /></div>
        <h1 className="text-4xl font-black mb-8 italic">New Trip</h1>

        <div className="bg-white rounded-[40px] w-full p-8 shadow-2xl space-y-4 text-left">
          <div className="bg-[#EDF1F7] rounded-2xl p-4 relative">
            <label className="text-[10px] font-black text-[#8E99AF] uppercase mb-1 block">目的地</label>
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-[#5C6B89]" /><input className="bg-transparent w-full text-[#2D3A52] font-bold outline-none" placeholder="想去哪裡？" value={query} onChange={e => setQuery(e.target.value)} />
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
            <div className="bg-[#EDF1F7] rounded-2xl p-4"><label className="text-[10px] font-black text-[#8E99AF] block">Start</label><input type="date" className="bg-transparent w-full text-[#2D3A52] font-bold text-xs" value={form.start} onChange={e => setForm({...form, start: e.target.value})} /></div>
            <div className="bg-[#EDF1F7] rounded-2xl p-4"><label className="text-[10px] font-black text-[#8E99AF] block">End</label><input type="date" className="bg-transparent w-full text-[#2D3A52] font-bold text-xs" value={form.end} onChange={e => setForm({...form, end: e.target.value})} /></div>
          </div>

          {/* 安全設定區 */}
          <div className="bg-[#E2F1E7] rounded-3xl p-6 space-y-4 border-2 border-[#A8D1B7]">
             <h3 className="text-[#4A785D] font-black text-[10px] uppercase flex items-center gap-2"><Lock size={12}/> 管理者帳號設定</h3>
             <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#A8D1B7]"><Mail size={16} className="text-ac-green"/><input placeholder="Email (找回 PIN 用)" className="bg-transparent text-ac-brown font-bold text-sm outline-none flex-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#A8D1B7]"><Lock size={16} className="text-ac-green"/><input type="password" maxLength={4} inputMode="numeric" placeholder="4位數 PIN 碼" className="bg-transparent text-ac-brown font-bold text-sm outline-none flex-1" value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} /></div>
             </div>
          </div>

          <button onClick={handleCreate} className="w-full bg-[#147A70] text-white py-5 rounded-full font-black text-lg flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"><Rocket size={24}/> 建立旅行手帳 ➔</button>
        </div>
      </div>
    </div>
  );
};