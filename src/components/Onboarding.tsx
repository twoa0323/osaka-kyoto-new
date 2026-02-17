import React, { useState, useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { getCurrencyByCountry } from '../utils/currencyMapping';
import { Plane, Search, Calendar, MapPin, Loader2 } from 'lucide-react';
import axios from 'axios';

export const Onboarding = () => {
  const addTrip = useTripStore((state) => state.addTrip);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    selectedPlace: null as any,
    start: '',
    end: '',
    currency: 'TWD' as any
  });

  // Photon API 搜尋建議 (Debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          const res = await axios.get(`https://photon.komoot.io/api/?q=${query}&limit=5`);
          setSuggestions(res.data.features);
        } catch (e) { console.error(e); }
        setLoading(false);
      } else { setSuggestions([]); }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const handleCreate = () => {
    if (!form.selectedPlace || !form.start || !form.end) return alert("請填完所有資訊內容唷！");
    
    const country = form.selectedPlace.properties.country;
    addTrip({
      id: Date.now().toString(),
      dest: form.selectedPlace.properties.name,
      destination: form.selectedPlace.properties.name,
      startDate: form.start,
      endDate: form.end,
      baseCurrency: getCurrencyByCountry(country),
      members: ['小冒險家'],
      pin: '007'
    });
  };

  return (
    <div className="min-h-screen bg-ac-bg p-6 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="bg-ac-green p-4 rounded-full inline-block shadow-zakka mb-4">
            <Plane className="text-white rotate-45" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-ac-brown italic">新旅程的起點</h1>
        </div>

        <div className="card-zakka space-y-4">
          {/* Photon 搜尋框 */}
          <div className="relative">
            <label className="text-xs font-bold mb-1 block">目的地 (全球城市搜尋)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ac-border" size={16} />
              <input 
                className="w-full pl-10 pr-4 py-3 bg-ac-bg border-2 border-ac-border rounded-xl font-bold"
                placeholder="輸入城市..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {loading && <Loader2 className="absolute right-3 top-3 animate-spin text-ac-green" size={16} />}
            </div>

            {/* 建議列表 */}
            {suggestions.length > 0 && (
              <div className="absolute w-full mt-2 bg-white border-2 border-ac-border rounded-2xl shadow-zakka z-50 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setForm({...form, selectedPlace: s});
                      setQuery(`${s.properties.name}, ${s.properties.country}`);
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-ac-bg transition-colors border-b last:border-0 border-ac-border text-sm"
                  >
                    <span className="font-bold">{s.properties.name}</span>
                    <span className="text-xs text-ac-brown/50 ml-2">{s.properties.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input type="date" className="flex-1 p-3 bg-ac-bg border-2 border-ac-border rounded-xl text-xs" onChange={e => setForm({...form, start: e.target.value})} />
            <input type="date" className="flex-1 p-3 bg-ac-bg border-2 border-ac-border rounded-xl text-xs" onChange={e => setForm({...form, end: e.target.value})} />
          </div>

          <button onClick={handleCreate} className="btn-zakka w-full py-4 mt-2">建立計畫 ➔</button>
        </div>
      </div>
    </div>
  );
};