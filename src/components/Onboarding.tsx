import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { fetchExchangeRate } from '../utils/exchange';
import { Plane, MapPin, Calendar as CalendarIcon, Coins } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

const CURRENCY_MAP: Record<string, any> = {
  '日本': 'JPY', '韓國': 'KRW', '泰國': 'THB', '美國': 'USD', '歐洲': 'EUR', '台灣': 'TWD'
};

export const Onboarding: React.FC = () => {
  const setTrip = useTripStore((state) => state.setTrip);
  const setRate = useTripStore((state) => state.setExchangeRate);
  
  const [form, setForm] = useState({
    dest: '', start: '', end: '', currency: 'JPY' as any
  });

  const handleCreate = async () => {
    if (!form.dest || !form.start || !form.end) return alert("請填寫完整資訊內容唷！");
    
    const rate = await fetchExchangeRate(form.currency);
    setRate(rate);

    const tripData = {
      ...form,
      id: Date.now().toString(),
      members: ['Admin'],
      pin: '007'
    };

    // 儲存至 Firestore
    await addDoc(collection(db, "trips"), tripData);
    setTrip(tripData as any);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-ac-bg">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block p-4 bg-ac-green rounded-full shadow-zakka mb-4">
            <Plane className="text-white w-8 h-8 rotate-45" />
          </div>
          <h1 className="text-2xl font-bold text-ac-brown">準備好出發了嗎？</h1>
          <p className="text-ac-brown opacity-70 italic">讓我們開始規畫你的手帳行程</p>
        </div>

        <div className="card-zakka space-y-5">
          {/* 地點選擇 */}
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <MapPin size={16} /> 目的地
            </label>
            <input 
              className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl focus:outline-none focus:border-ac-green transition-all"
              placeholder="要去哪裡旅行呢？"
              onChange={(e) => {
                const val = e.target.value;
                const matched = Object.keys(CURRENCY_MAP).find(k => val.includes(k));
                setForm({...form, dest: val, currency: matched ? CURRENCY_MAP[matched] : 'TWD'});
              }}
            />
          </div>

          {/* 日期選擇 */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon size={16} /> 開始
              </label>
              <input 
                type="date"
                className="w-full p-3 bg-ac-bg border-2 border-ac-border rounded-2xl text-sm"
                onChange={(e) => setForm({...form, start: e.target.value})}
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon size={16} /> 結束
              </label>
              <input 
                type="date"
                className="w-full p-3 bg-ac-bg border-2 border-ac-border rounded-2xl text-sm"
                onChange={(e) => setForm({...form, end: e.target.value})}
              />
            </div>
          </div>

          {/* 幣別顯示 */}
          <div className="p-4 bg-ac-bg/50 border-2 border-dashed border-ac-border rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Coins className="text-ac-orange" />
              <span className="font-bold">幣別自動設定</span>
            </div>
            <span className="bg-ac-orange text-white px-3 py-1 rounded-full text-xs font-bold">
              {form.currency}
            </span>
          </div>

          <button onClick={handleCreate} className="btn-zakka w-full py-4 text-lg mt-4">
            建立旅行計畫 ➔
          </button>
        </div>
      </div>
    </div>
  );
};