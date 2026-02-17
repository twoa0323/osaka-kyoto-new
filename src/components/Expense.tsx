import React, { useState, useMemo, useRef, useEffect } from 'react'; // [修正: 新增 useEffect]
import { useTripStore } from '../store/useTripStore';
import { Wallet, Coins, MapPin, Image as ImageIcon, Trash2, Camera, X } from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';
import { compressImage } from '../utils/imageUtils';
import { fetchExchangeRate } from '../utils/exchange'; // [修正: 引入匯率 API]

export const Expense = () => {
  const { trips, currentTripId, addExpenseItem, deleteExpenseItem, updateExpenseItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [viewMode, setViewMode] = useState<'input' | 'list'>('input');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentRate, setCurrentRate] = useState<number>(1); // [修正: 即時匯率狀態]

  const [form, setForm] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0],
    currency: trip?.baseCurrency || 'JPY',
    method: '現金', amount: 0, title: '', location: '', images: []
  });

  // [修正問題 3: 即時換算匯率]
  useEffect(() => {
    const updateRate = async () => {
      if (!form.currency) return;
      if (form.currency === 'TWD') {
        setCurrentRate(1);
      } else {
        const rate = await fetchExchangeRate(form.currency);
        setCurrentRate(rate);
      }
    };
    updateRate();
  }, [form.currency]);

  if (!trip) return null;

  const handleSave = () => {
    if (!form.title || !form.amount) return alert("請填入內容與金額！💰");
    const itemData: ExpenseItem = {
      id: editingId || Date.now().toString(),
      date: form.date!, title: form.title!, amount: Number(form.amount),
      currency: form.currency as CurrencyCode, method: form.method as any,
      location: form.location || '', payerId: 'Admin', splitWith: [], images: form.images || []
    };
    if (editingId) updateExpenseItem(trip.id, editingId, itemData);
    else addExpenseItem(trip.id, itemData);
    
    setForm({ date: form.date, currency: form.currency, method: '現金', title: '', amount: 0, location: '', images: [] });
    setEditingId(null);
    alert("儲存成功！📒");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const compressed = await compressImage(e.target.files[0]);
      setForm(prev => ({ ...prev, images: [compressed] })); // [修正問題 2: 確保照片存入狀態]
    }
  };

  const totalTwd = useMemo(() => {
    return (trip.expenses || []).reduce((s, e) => {
      // 這裡維持總預算以 trip store 記錄或預設匯率計算，或改用 currentRate
      return s + (e.currency === 'TWD' ? e.amount : e.amount * (trip.baseCurrency === e.currency ? currentRate : 1));
    }, 0);
  }, [trip.expenses, currentRate]);

  return (
    <div className="px-6 space-y-6 animate-fade-in pb-10 text-left">
      <div className="card-zakka bg-ac-brown text-white border-none p-6">
        <p className="text-[10px] font-black uppercase opacity-40">Total Spending</p>
        <p className="text-3xl font-black italic">NT$ {Math.round(totalTwd).toLocaleString()}</p>
      </div>

      <div className="flex bg-white p-1.5 rounded-full border-4 border-ac-border shadow-zakka">
        <button onClick={() => {setEditingId(null); setViewMode('input');}} className={`flex-1 py-3 rounded-full text-sm font-black transition-all ${viewMode === 'input' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>記帳輸入</button>
        <button onClick={() => setViewMode('list')} className={`flex-1 py-3 rounded-full text-sm font-black transition-all ${viewMode === 'list' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>消費明細</button>
      </div>

      {viewMode === 'input' ? (
        <div className="card-zakka bg-white space-y-6 p-8 relative">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase">日期</label>
            {/* [修正問題 1: 移除 pl-6 確保置中對齊] */}
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown text-center" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase">幣別</label>
            <div className="flex gap-3">
              {[trip.baseCurrency, 'TWD', 'USD'].map(c => (
                <button key={c} onClick={() => setForm({...form, currency: c as any})} className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${form.currency === c ? 'bg-[#E2F1E7] border-ac-green text-ac-green shadow-sm' : 'bg-white border-ac-border text-ac-border'}`}>{c}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ac-orange uppercase">* 金額</label>
              <input type="number" inputMode="decimal" placeholder="0" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-5 bg-ac-bg border-2 border-ac-border rounded-2xl text-2xl font-black text-ac-brown outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ac-brown/40 uppercase">約合台幣</label>
              <div className="w-full p-5 bg-ac-bg border-2 border-dashed border-ac-border rounded-2xl text-2xl font-black text-ac-brown/30 italic">
                {/* [修正問題 3: 即時呈現換算結果] */}
                {form.currency === 'TWD' ? form.amount : Math.round((form.amount || 0) * currentRate)}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-orange uppercase">* 消費項目</label>
            <div className="flex gap-3">
              <input placeholder="例如：午餐" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="flex-1 p-5 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" />
              <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 bg-[#E2F1E7] border-2 border-ac-green rounded-2xl flex items-center justify-center text-ac-green overflow-hidden relative">
                {form.images?.[0] ? <img src={form.images[0]} className="w-full h-full object-cover" /> : <ImageIcon size={28} />}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </button>
            </div>
          </div>
          <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl">{editingId ? '確認更新 ➔' : '儲存這筆帳 ➔'}</button>
          {editingId && <button onClick={() => {setEditingId(null); setForm({...form, title:'', amount:0});}} className="w-full text-ac-brown/40 text-xs font-bold text-center">取消編輯</button>}
        </div>
      ) : (
        <div className="space-y-4">
          {[...trip.expenses].reverse().map(e => (
            /* [修正問題 4: 點擊項目可編輯] */
            <div key={e.id} onClick={() => { setForm(e); setEditingId(e.id); setViewMode('input'); }} className="card-zakka bg-white flex justify-between items-center group cursor-pointer active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-ac-bg rounded-full overflow-hidden flex items-center justify-center text-ac-orange">
                  {e.images?.[0] ? <img src={e.images[0]} className="w-full h-full object-cover" /> : <Coins size={20}/>}
                </div>
                <div><h3 className="font-black text-ac-brown">{e.title}</h3><p className="text-[10px] font-bold text-ac-brown/40 uppercase">{e.date} • {e.method}</p></div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div><p className="font-black text-ac-brown text-lg">{e.currency} {e.amount.toLocaleString()}</p></div>
                <button onClick={(ev) => { ev.stopPropagation(); if(confirm('刪除紀錄？')) deleteExpenseItem(trip.id, e.id); }} className="text-ac-orange/20 hover:text-ac-orange"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
